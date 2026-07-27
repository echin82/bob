'use strict';

const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db;

/**
 * Opens (or creates) data.db and ensures the contracts table exists.
 * Must be called with `await` before the server starts accepting requests.
 * Returns the database instance.
 */
async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // TASK-02: Create the contracts table if it doesn't already exist.
  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id          TEXT NOT NULL PRIMARY KEY,
      file_name   TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      status      TEXT NOT NULL
    )
  `);

  // Persist the initial schema to disk immediately.
  await _flush();

  return db;
}

/**
 * Returns the open database instance.
 * Must be called after initDb() resolves.
 */
function getDb() {
  if (!db) {
    throw new Error('Database has not been initialised. Call initDb() first.');
  }
  return db;
}

/**
 * Writes the in-memory SQLite database to disk.
 * Called after every write operation to satisfy NFR-5 (zero data loss across restarts).
 * Async to avoid blocking the event loop (I-3).
 */
async function _flush() {
  const data = db.export();
  await fs.promises.writeFile(DB_PATH, Buffer.from(data));
}

/**
 * Executes a parameterised INSERT/UPDATE/DELETE and flushes to disk.
 * @param {string} sql - Parameterised SQL statement.
 * @param {Array} params - Bind parameters.
 */
async function run(sql, params) {
  db.run(sql, params);
  await _flush();
}

module.exports = { initDb, getDb, run };
