import { DatabaseSync, backup } from 'node:sqlite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const databasePath = path.resolve(process.env.CHATTERBOX_DB_PATH || fileURLToPath(new URL('./chatterbox.sqlite', import.meta.url)));
export function verify(db) {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database integrity verification failed');
}
export function snapshot(db) {
  return db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name}) => ({name, rows:db.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid').all()}));
}
export async function verifiedBackup(file = databasePath) {
  const source = new DatabaseSync(file, {readOnly:true});
  const destination = file + '.backup-' + Date.now() + '-' + Math.random().toString(16).slice(2) + '.sqlite';
  try {
    verify(source);
    await backup(source, destination);
    const copy = new DatabaseSync(destination, {readOnly:true});
    try { verify(copy); if (JSON.stringify(snapshot(source)) !== JSON.stringify(snapshot(copy))) throw new Error('Backup contents differ'); }
    finally { copy.close(); }
    return destination;
  } finally { source.close(); }
}
export function migrate(file = databasePath) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000');
  try {
    verify(db);
    db.exec('BEGIN IMMEDIATE');
    db.exec('CREATE TABLE IF NOT EXISTS schema_info(version INTEGER PRIMARY KEY, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
    const version=db.prepare('SELECT MAX(version) AS version FROM schema_info').get().version || 0;
    if (version > 3) throw new Error('Unsupported future database schema');
    if(version < 2) {
      db.exec(`CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  credentials TEXT NOT NULL DEFAULT ''
)`);
const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map((entry) => entry.name));
if (!columns.has('username')) db.exec('ALTER TABLE users ADD COLUMN username TEXT');
if (!columns.has('password_hash')) db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT');
if (!columns.has('created_at')) db.exec('ALTER TABLE users ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0');
db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS users_username_nocase
  ON users(username COLLATE NOCASE) WHERE username IS NOT NULL;
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_expiry ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS user_sessions_user ON user_sessions(user_id, expires_at);
`);


      db.exec('INSERT INTO schema_info(version) VALUES (2)');
    }
    if(version < 3) {
      db.exec(`CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS friendships_friend ON friendships(friend_id);
`);
      db.exec('INSERT INTO schema_info(version) VALUES (3)');
    }
    verify(db);
    db.exec('COMMIT');
  } catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
