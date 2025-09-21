// backend/db.js
const sqlite3 = require("sqlite3").verbose();

// Use __dirname so DB stays in backend folder
const db = new sqlite3.Database(__dirname + "/database.sqlite");

db.serialize(() => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('staff','manager')) NOT NULL,
      staff_id INTEGER,
      venue_id INTEGER,
      business_id INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Example: staff table (if not already created)
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    )
  `);
});

module.exports = db;
