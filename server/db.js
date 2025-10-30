import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
const dbFilePath = path.join(dataDir, 'accounts.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbFilePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_plain TEXT NOT NULL DEFAULT '',
    email_verified INTEGER NOT NULL DEFAULT 0,
    email_verification_hash TEXT NOT NULL DEFAULT '',
    email_verification_expires TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    stats TEXT NOT NULL DEFAULT '[]',
    focus_areas TEXT NOT NULL DEFAULT '[]',
    upcoming TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  )
`);

const accountColumns = new Set(
  db.prepare("SELECT name FROM pragma_table_info('accounts')").all().map((column) => column.name),
);

if (!accountColumns.has('password_plain')) {
  db.exec("ALTER TABLE accounts ADD COLUMN password_plain TEXT NOT NULL DEFAULT ''");
}

if (!accountColumns.has('email_verified')) {
  db.exec("ALTER TABLE accounts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
}

if (!accountColumns.has('email_verification_hash')) {
  db.exec("ALTER TABLE accounts ADD COLUMN email_verification_hash TEXT NOT NULL DEFAULT ''");
}

if (!accountColumns.has('email_verification_expires')) {
  db.exec("ALTER TABLE accounts ADD COLUMN email_verification_expires TEXT NOT NULL DEFAULT ''");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    meta TEXT NOT NULL,
    description TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    image_data TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(author_id) REFERENCES accounts(id) ON DELETE SET NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL,
    title TEXT NOT NULL,
    sport TEXT NOT NULL DEFAULT '',
    highlight TEXT NOT NULL DEFAULT '',
    question TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    image_data TEXT DEFAULT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(author_id) REFERENCES accounts(id) ON DELETE SET NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS blog_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY(author_id) REFERENCES accounts(id) ON DELETE SET NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(sender_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(recipient_id) REFERENCES accounts(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_participants
  ON messages (sender_id, recipient_id, created_at)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages (created_at)
`);
