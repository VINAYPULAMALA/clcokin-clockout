// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open DB:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite DB at', DB_PATH);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Export the db instance
module.exports = db;