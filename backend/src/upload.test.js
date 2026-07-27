'use strict';
/**
 * Unit tests for file upload validation (TASK-03).
 *
 * Covers scenarios UTS-01 through UTS-08 from:
 *   delivery/specs/contract-risk-assessment/unit-test-scenarios.md
 *
 * Run: node --test src/upload.test.js
 *
 * Design decisions
 * ----------------
 * The validation is split into two layers:
 *
 *   1. validateUploadFile(file) — pure function exported from upload.js.
 *      Tests UTS-01, UTS-02, UTS-03, UTS-04, UTS-08 exercise this directly with
 *      synthetic file objects.  No Express, no multer, no filesystem, no database.
 *
 *   2. The multer 10 MB size limit (NFR-3) is enforced by multer before the pure
 *      function is called.  Tests UTS-05, UTS-06, UTS-07 exercise this via a
 *      temporary in-process HTTP server that mounts only the upload router.
 *      The server binds to a random OS-assigned port on 127.0.0.1 and is torn
 *      down after the tests complete.  No files are written to disk and no
 *      database is touched because:
 *        - UTS-05: multer rejects before the handler runs (LIMIT_FILE_SIZE).
 *        - UTS-06/UTS-07: same as above.
 *        - UTS-05 (valid boundary): validation passes but the handler immediately
 *          fails the DB insert because the DB is not initialised — this still
 *          demonstrates that no 4xx/413 is returned for the validation step.
 *
 * No test framework dependency is added.  Node.js built-in `node:test` is used,
 * matching the project's zero-dependency philosophy for tests (see test-smoke.js).
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');

const { validateUploadFile, ALLOWED_TYPES, MAX_FILE_SIZE } = require('./upload');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PDF_MIME  = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TXT_MIME  = 'text/plain';
const PNG_MIME  = 'image/png';

/** Build a minimal synthetic req.file object (what multer would populate). */
function makeFile({ mimetype, size = 1024 }) {
  return {
    mimetype,
    size,
    originalname: 'test-file',
    buffer: Buffer.alloc(size),
  };
}

// ---------------------------------------------------------------------------
// Layer 1 — pure function tests (no I/O, no framework)
// ---------------------------------------------------------------------------

describe('validateUploadFile — pure validation (UTS-01 to UTS-04, UTS-08)', () => {

  // UTS-01: Valid PDF is accepted
  test('UTS-01 — valid PDF (application/pdf, 1 MB) passes validation', () => {
    const result = validateUploadFile(makeFile({ mimetype: PDF_MIME, size: 1024 * 1024 }));
    assert.equal(result.ok, true, 'ok should be true for a valid PDF');
    assert.equal(result.ext, 'pdf', 'ext should be "pdf"');
  });

  // UTS-02: Valid DOCX is accepted
  test('UTS-02 — valid DOCX (DOCX MIME type, 1 MB) passes validation', () => {
    const result = validateUploadFile(makeFile({ mimetype: DOCX_MIME, size: 1024 * 1024 }));
    assert.equal(result.ok, true, 'ok should be true for a valid DOCX');
    assert.equal(result.ext, 'docx', 'ext should be "docx"');
  });

  // UTS-03: Unsupported file type (plain text) is rejected
  test('UTS-03 — text/plain (.txt) returns 400 with accepted-formats detail', () => {
    const result = validateUploadFile(makeFile({ mimetype: TXT_MIME, size: 1024 }));
    assert.equal(result.ok, false, 'ok should be false for an unsupported type');
    assert.equal(result.status, 400, 'status should be 400');
    assert.ok(typeof result.body.error === 'string', 'body.error must be a string');
    // Body must identify accepted formats (AC-FR-1a: "displays a message explaining which formats are accepted")
    const bodyStr = JSON.stringify(result.body).toLowerCase();
    assert.ok(
      bodyStr.includes('pdf') && bodyStr.includes('docx'),
      'error body must reference both accepted formats (PDF and DOCX)'
    );
  });

  // UTS-04: Unsupported file type (PNG image) is rejected
  test('UTS-04 — image/png (.png) returns 400 with accepted-formats detail', () => {
    const result = validateUploadFile(makeFile({ mimetype: PNG_MIME, size: 50 * 1024 }));
    assert.equal(result.ok, false, 'ok should be false for an unsupported type');
    assert.equal(result.status, 400, 'status should be 400');
    assert.ok(typeof result.body.error === 'string', 'body.error must be a string');
    const bodyStr = JSON.stringify(result.body).toLowerCase();
    assert.ok(
      bodyStr.includes('pdf') && bodyStr.includes('docx'),
      'error body must reference both accepted formats (PDF and DOCX)'
    );
  });

  // UTS-08: No file attached — request with empty multipart body is rejected
  test('UTS-08 — undefined file (no file field in request) returns 400', () => {
    const result = validateUploadFile(undefined);
    assert.equal(result.ok, false, 'ok should be false when no file is present');
    assert.equal(result.status, 400, 'status should be 400');
    assert.ok(typeof result.body.error === 'string', 'body.error must be a string');
  });

  // Extra: null treated same as undefined (defensive — multer can return null)
  test('null file (no file field) returns 400', () => {
    const result = validateUploadFile(null);
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  });

});

// ---------------------------------------------------------------------------
// Exported constants sanity checks
// ---------------------------------------------------------------------------

describe('Exported constants', () => {

  test('ALLOWED_TYPES includes application/pdf → pdf', () => {
    assert.equal(ALLOWED_TYPES[PDF_MIME], 'pdf');
  });

  test('ALLOWED_TYPES includes DOCX MIME → docx', () => {
    assert.equal(ALLOWED_TYPES[DOCX_MIME], 'docx');
  });

  test('ALLOWED_TYPES does not include text/plain', () => {
    assert.equal(ALLOWED_TYPES[TXT_MIME], undefined);
  });

  test('MAX_FILE_SIZE is exactly 10 MB (10 * 1024 * 1024)', () => {
    assert.equal(MAX_FILE_SIZE, 10 * 1024 * 1024);
  });

});

// ---------------------------------------------------------------------------
// Layer 2 — multer size-limit tests (UTS-05, UTS-06, UTS-07)
//
// These test the multer 10 MB hard limit which fires before uploadHandler.
// A temporary Express server is started on a random port; no files are written
// and no database connection is established for the rejection cases.
//
// UTS-05 (exactly 10 MB PDF) is the acceptance boundary: multer must NOT fire
// LIMIT_FILE_SIZE.  The request will reach uploadHandler, which will attempt
// a DB insert and fail with 500 (DB not initialised in this test context).
// The test asserts the status is NOT 413 and NOT 400 — confirming validation
// itself did not reject the file.
// ---------------------------------------------------------------------------

describe('Multer size-limit enforcement (UTS-05, UTS-06, UTS-07)', () => {
  let server;
  let port;

  before(async () => {
    // Lazy-require to avoid the fs.mkdirSync side-effect running before the
    // test process initialises; uploads/ dir creation is idempotent so safe.
    const { createUploadRouter } = require('./upload');
    const express = require('express');
    const app = express();
    app.use('/', createUploadRouter());

    await new Promise((resolve) => {
      server = http.createServer(app);
      // Port 0 → OS assigns a free ephemeral port.
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  /**
   * Sends a multipart/form-data POST to the in-process server.
   * fileBytes is a Buffer; mimeType and fileName control the part headers.
   * Returns { status, body } — body is parsed JSON or the raw string.
   */
  function postFile(fileName, mimeType, fileBytes) {
    return new Promise((resolve, reject) => {
      const boundary = '----TestBoundary' + Date.now().toString(16);
      const prefix = Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      );
      const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
      const body   = Buffer.concat([prefix, fileBytes, suffix]);

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/upload',
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': body.length,
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            let parsed;
            try { parsed = JSON.parse(raw); } catch { parsed = raw; }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  // UTS-05: File exactly at the 10 MB boundary is accepted by validation
  test('UTS-05 — PDF exactly 10 MB (boundary) is NOT rejected with 413 or 400', async () => {
    const tenMB = Buffer.alloc(MAX_FILE_SIZE, 0x41);
    const result = await postFile('boundary.pdf', PDF_MIME, tenMB);
    // Validation must not produce a 4xx.  500 is acceptable here because the DB
    // is not initialised in this unit-test context.
    assert.notEqual(result.status, 413, 'must not return 413 at exactly 10 MB');
    assert.notEqual(result.status, 400, 'must not return 400 for a valid PDF at 10 MB');
  });

  // UTS-06: File at 10 MB + 1 byte is rejected with 413
  test('UTS-06 — PDF at 10 MB + 1 byte (boundary + 1) returns 413', async () => {
    const overLimit = Buffer.alloc(MAX_FILE_SIZE + 1, 0x41);
    const result = await postFile('over.pdf', PDF_MIME, overLimit);
    assert.equal(result.status, 413, `expected 413 but got ${result.status}`);
    assert.ok(typeof result.body.error === 'string', 'body.error must be a string');
  });

  // UTS-07: Oversized DOCX (25 MB) is rejected with 413 regardless of format
  test('UTS-07 — DOCX at 25 MB returns 413 regardless of valid MIME type', async () => {
    const twentyFiveMB = Buffer.alloc(25 * 1024 * 1024, 0x41);
    const result = await postFile('large.docx', DOCX_MIME, twentyFiveMB);
    assert.equal(result.status, 413, `expected 413 but got ${result.status}`);
    assert.ok(typeof result.body.error === 'string', 'body.error must be a string');
  });

});
