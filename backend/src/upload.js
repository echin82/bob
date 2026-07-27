'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { run } = require('./db');

// Allowed MIME types and their canonical extensions (TASK-03).
const ALLOWED_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (NFR-3)

/**
 * Pure validation for the "file" field of an upload request (TASK-03, AD-5).
 *
 * Extracted so that it can be unit-tested independently of Express, multer,
 * the filesystem, and the database.  The handler delegates to this function
 * rather than duplicating the same logic inline.
 *
 * @param {object|undefined} file - The req.file object populated by multer, or
 *   undefined when no file was attached to the request.
 * @returns {{ ok: true, ext: string }
 *          |{ ok: false, status: 400|413, body: object }}
 */
function validateUploadFile(file) {
  if (!file) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'No file received.',
        detail: 'Include the file as a multipart field named "file".',
      },
    };
  }

  const ext = ALLOWED_TYPES[file.mimetype];
  if (!ext) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'Unsupported file format.',
        detail: 'Only PDF and DOCX files are accepted.',
        accepted: Object.keys(ALLOWED_TYPES),
      },
    };
  }

  return { ok: true, ext };
}

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Ensure the uploads directory exists on startup (I-1).
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Use memoryStorage so validation runs before any bytes touch disk (AD-5, TASK-03).
// busboy fires the 'limit' event when fileSize reaches the limit value exactly, so
// we set the multer limit to MAX_FILE_SIZE + 1 to accept files of exactly MAX_FILE_SIZE
// bytes (i.e. ≤ 10 MB), matching NFR-3 and AC-FR-1b ("within the supported size limit").
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE + 1 },
});

/**
 * POST /upload
 *
 * Accepts a single multipart field named "file".
 * Steps:
 *   1. multer enforces the 10 MB size limit (TASK-03).
 *   2. Handler validates the MIME type (TASK-03).
 *   3. File is written to uploads/<contractId>.<ext> (TASK-04).
 *   4. Contract row is inserted into SQLite (TASK-05).
 *   5. Returns 201 with contract metadata (TASK-05).
 */
async function uploadHandler(req, res) {
  // TASK-03: Validate presence and MIME type (second gate — AD-5).
  const validation = validateUploadFile(req.file);
  if (!validation.ok) {
    return res.status(validation.status).json(validation.body);
  }
  const ext = validation.ext;

  // TASK-04: Generate an internal contract ID and write the file to disk.
  const contractId = uuidv4();
  const filePath = path.join(UPLOADS_DIR, `${contractId}.${ext}`);

  try {
    fs.writeFileSync(filePath, req.file.buffer);
  } catch (err) {
    // Do not proceed to the DB insert if the file write fails (TASK-04).
    console.error('File write failed:', err.message);
    return res.status(500).json({ error: 'Failed to save the uploaded file.' });
  }

  // Sanitise the original filename before storing or returning it (I-2).
  // path.basename strips any directory components; the replace removes characters
  // outside the safe set (alphanumeric, dots, hyphens, underscores, spaces).
  const safeName = path.basename(req.file.originalname).replace(/[^\w.\-\s]/g, '_');

  // TASK-05: Insert the contract record using a parameterised query (security requirement).
  const uploadedAt = new Date().toISOString();

  try {
    await run(
      'INSERT INTO contracts (id, file_name, uploaded_at, status) VALUES (?, ?, ?, ?)',
      [contractId, safeName, uploadedAt, 'pending']
    );
  } catch (err) {
    // File was already written; log the orphan but do not attempt cleanup (plan.md §2 — no rollback for MVP).
    console.error('Database insert failed:', err.message);
    return res.status(500).json({ error: 'Failed to record the uploaded contract.' });
  }

  // TASK-05: Return 201 with contract metadata (design.md §2 step 4, plan.md §4.1).
  return res.status(201).json({
    id: contractId,
    fileName: safeName,
    uploadedAt,
    status: 'pending',
  });
}

/**
 * Returns an Express Router with the upload route pre-wired.
 */
function createUploadRouter() {
  const router = express.Router();

  // multer's size-limit error surfaces as a MulterError with code LIMIT_FILE_SIZE.
  router.post(
    '/upload',
    (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: 'File too large.',
            detail: `Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`,
          });
        }
        if (err) {
          return res.status(400).json({
            error: 'Upload failed.',
            detail: 'Unexpected file field or malformed multipart request.',
          });
        }
        next();
      });
    },
    uploadHandler
  );

  return router;
}

module.exports = { createUploadRouter, validateUploadFile, ALLOWED_TYPES, MAX_FILE_SIZE };
