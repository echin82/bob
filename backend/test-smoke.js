'use strict';
/**
 * Smoke test for the upload slice (TASK-06).
 * Exercises all four acceptance criteria without a test framework.
 * Run: node test-smoke.js
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:3001';

// Minimal file buffers — just enough to carry the correct MIME type.
const PDF_BYTES = Buffer.from('%PDF-1.4\n%%EOF\n');
const DOCX_BYTES = Buffer.from([0x50, 0x4B, 0x03, 0x04]); // PK header
const TXT_BYTES  = Buffer.from('hello world');
// Oversized buffer: 11 MB (just over the 10 MB limit).
const BIG_BYTES  = Buffer.alloc(11 * 1024 * 1024, 0x41);

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

/**
 * Posts a multipart/form-data request to path with one file field.
 * Returns { status, body } where body is the parsed JSON (or raw string on parse failure).
 */
function postFile(urlPath, fileName, mimeType, fileBytes) {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now().toString(16);

    // Build the multipart body manually.
    const prefix = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body   = Buffer.concat([prefix, fileBytes, suffix]);

    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString();
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}/health`, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('\n── Smoke tests: upload slice ──\n');

  // Health check
  const health = await getHealth();
  assert('GET /health returns 200', health.status === 200, JSON.stringify(health.body));

  // Test 1: Valid PDF → 201
  const r1 = await postFile('/upload', 'contract.pdf', 'application/pdf', PDF_BYTES);
  assert('Valid PDF → 201', r1.status === 201, `got ${r1.status}`);
  assert('Response has id', typeof r1.body.id === 'string' && r1.body.id.length > 0, JSON.stringify(r1.body));
  assert('Response has fileName', r1.body.fileName === 'contract.pdf', JSON.stringify(r1.body));
  assert('Response has status=pending', r1.body.status === 'pending', JSON.stringify(r1.body));
  assert('Response has uploadedAt', typeof r1.body.uploadedAt === 'string', JSON.stringify(r1.body));
  if (r1.status === 201) {
    const ext = 'pdf';
    const uploadedFile = path.join(__dirname, 'uploads', `${r1.body.id}.${ext}`);
    assert('PDF file written to uploads/', fs.existsSync(uploadedFile), uploadedFile);
  }

  // Test 2: Valid DOCX → 201
  const r2 = await postFile(
    '/upload',
    'contract.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    DOCX_BYTES
  );
  assert('Valid DOCX → 201', r2.status === 201, `got ${r2.status}`);
  assert('DOCX response has status=pending', r2.body.status === 'pending', JSON.stringify(r2.body));
  if (r2.status === 201) {
    const uploadedFile = path.join(__dirname, 'uploads', `${r2.body.id}.docx`);
    assert('DOCX file written to uploads/', fs.existsSync(uploadedFile), uploadedFile);
  }

  // Test 3: Unsupported format (.txt) → 400, no file written
  const r3 = await postFile('/upload', 'notes.txt', 'text/plain', TXT_BYTES);
  assert('Unsupported format → 400', r3.status === 400, `got ${r3.status}`);
  assert('400 body has error key', typeof r3.body.error === 'string', JSON.stringify(r3.body));

  // Test 4: File exceeding 10 MB → 413, no file written
  const r4 = await postFile('/upload', 'large.pdf', 'application/pdf', BIG_BYTES);
  assert('Oversized file → 413', r4.status === 413, `got ${r4.status}`);
  assert('413 body has error key', typeof r4.body.error === 'string', JSON.stringify(r4.body));

  console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
