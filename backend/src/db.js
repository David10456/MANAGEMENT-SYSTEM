const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Creates a database file in the backend/src folder
const dbPath = path.resolve(__dirname, 'school_sim.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('❌ DB Connection Error:', err.message);
  else console.log('✅ Connected to the SQLite simulation database.');
});

// Helper functions to use Promises (async/await) with SQLite
db.runAsync = (sql, params) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this); // 'this' contains lastID and changes
  });
});

db.allAsync = (sql, params) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

db.getAsync = (sql, params) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

module.exports = db;