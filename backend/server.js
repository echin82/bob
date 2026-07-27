'use strict';

const express = require('express');
const { initDb } = require('./src/db');
const { createUploadRouter } = require('./src/upload');

const HOST = '127.0.0.1'; // Security: never bind to 0.0.0.0 (project security rules)
const PORT = 3001;

async function start() {
  // TASK-02: Initialise (or open) the SQLite database and create the contracts table.
  await initDb();

  const app = express();

  // TASK-01: Health check — no body required.
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // TASK-03, TASK-04, TASK-05: Upload route.
  app.use('/', createUploadRouter());

  app.listen(PORT, HOST, () => {
    console.log(`Server listening on http://${HOST}:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
