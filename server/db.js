const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    phone          TEXT UNIQUE,
    name           TEXT,
    points         INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    created_at     TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id         UUID PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    type       TEXT NOT NULL CHECK(type IN ('add', 'redeem')),
    points     INTEGER NOT NULL,
    note       TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_transactions_user    ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
`).catch(err => { console.error('DB init failed:', err); process.exit(1); });

module.exports = pool;
