import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/bookings.db');

const db = new Database(DB_PATH);

// 启用 WAL 模式提高并发性能
db.pragma('journal_mode = WAL');

// 创建预约表
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    party_size INTEGER NOT NULL CHECK(party_size >= 1 AND party_size <= 20),
    special_requests TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
`);

export default db;
