// db.js
const { Pool } = require('pg');
require('dotenv').config();

// Check if running in production (Render)
const isProduction = process.env.NODE_ENV === 'production' && process.env.DATABASE_URL;

let db;

if (isProduction) {
  // PostgreSQL for production (Render)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL
  });

  db = {
    query: (text, params) => pool.query(text, params),
    runAsync: async (sql, params = []) => {
      try {
        const result = await pool.query(sql, params);
        return { 
          lastID: result.rows[0]?.id || result.rows[0]?.student_id || null, 
          changes: result.rowCount 
        };
      } catch (err) {
        console.error('Database run error:', err);
        throw err;
      }
    },
    allAsync: async (sql, params = []) => {
      try {
        const result = await pool.query(sql, params);
        return result.rows;
      } catch (err) {
        console.error('Database all error:', err);
        throw err;
      }
    },
    getAsync: async (sql, params = []) => {
      try {
        const result = await pool.query(sql, params);
        return result.rows[0] || null;
      } catch (err) {
        console.error('Database get error:', err);
        throw err;
      }
    },
    close: () => pool.end()
  };
  
  console.log('✅ Connected to PostgreSQL database (Production)');
} else {
  // SQLite for local development
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.resolve(__dirname, 'school_sim.db');
  
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error(' SQLite Error:', err.message);
    else console.log(' Connected to SQLite database (Development)');
  });

  sqliteDb.runAsync = (sql, params) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

  sqliteDb.allAsync = (sql, params) => new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  sqliteDb.getAsync = (sql, params) => new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  sqliteDb.close = () => sqliteDb.close();
  
  db = sqliteDb;
}

module.exports = db;