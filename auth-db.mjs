import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, createHash, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rawHash = promisify(rawScrypt);
let hashing = 0;
async function scrypt(password, salt, length, legacy = false) {
  if (hashing >= 4) throw Object.assign(new Error('Authentication busy. Try again shortly.'), {status:429});
  hashing++;
  try { return await rawHash(password, salt, length, {N: legacy ? 16384 : 131072, r:8, p:1, maxmem:160*1024*1024}); }
  finally { hashing--; }
}
const db = new DatabaseSync(path.resolve(process.env.CHATTERBOX_DB_PATH || fileURLToPath(new URL('./chatterbox.sqlite', import.meta.url))));
const version = db.prepare("SELECT MAX(version) AS version FROM schema_info").get().version;
if (version !== 2) throw new Error('Database migration required: run npm run db:migrate first.');
db.exec('PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON');

export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const byUsername = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
const byId = db.prepare('SELECT user_id, name, username FROM users WHERE user_id = ?');
const insertUser = db.prepare(`INSERT INTO users
  (user_id, name, username, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`);
const insertSession = db.prepare('INSERT INTO user_sessions (session_id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)');
const findSession = db.prepare(`SELECT users.user_id, users.name, users.username, user_sessions.session_id, user_sessions.expires_at
 FROM user_sessions JOIN users ON users.user_id = user_sessions.user_id
 WHERE user_sessions.session_id = ? AND user_sessions.expires_at > ? AND users.username IS NOT NULL`);
const deleteSession = db.prepare('DELETE FROM user_sessions WHERE session_id = ?');
const clearExpired = db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?');

export function publicUser(user) {
  return { id: user.user_id, name: user.name, username: user.username };
}
export function lookupUser(id) { return byId.get(id); }
export function normalizeUsername(value) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9_.]{3,24}$/.test(username) ? username : '';
}
export function normalizeName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return name.length >= 2 && name.length <= 24 && !/[<>\x00-\x1f\x7f]/.test(name) ? name : '';
}
export function validPassword(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const digest = await scrypt(password, salt, 64);
  return `scrypt-v1$${salt}$${digest.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !/^scrypt(?:-v1)?\$/.test(stored)) return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
  const digest = await scrypt(password, parts[1], 64, parts[0] === 'scrypt');
  return timingSafeEqual(digest, Buffer.from(parts[2], 'hex'));
}
export async function registerUser(name, username, password) {
  const user_id = randomUUID();
  const password_hash = await hashPassword(password);
  insertUser.run(user_id, name, username, password_hash, Date.now());
  return { user_id, name, username };
}
export async function loginUser(username, password) {
  const user = byUsername.get(username);
  // Burn comparable password-hashing time for unknown usernames.
  if (!user) {
    await scrypt(password, '00000000000000000000000000000000', 64);
    return null;
  }
  return await verifyPassword(password, user.password_hash) ? user : null;
}
function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }
export function csrfForToken(token) { return createHash('sha256').update(`chatterbox-csrf:${token}`).digest('hex'); }
export function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  insertSession.run(hashToken(token), user.user_id, now, now + SESSION_DURATION_MS);
  return { token, expiresAt: now + SESSION_DURATION_MS, csrfToken: csrfForToken(token) };
}
export function authenticateRequest(req) {
  const cookies = String(req.headers.cookie || '').split(';').map((pair) => pair.trim());
  const item = cookies.find((pair) => pair.startsWith('cb_session='));
  const token = item ? item.slice('cb_session='.length) : '';
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) return null;
  const session = findSession.get(hashToken(token), Date.now());
  return session ? { ...publicUser(session), sessionId: session.session_id, expiresAt: session.expires_at, csrfToken: csrfForToken(token) } : null;
}
export function invalidateSession(id) { deleteSession.run(id); }
export function cleanupSessions() { clearExpired.run(Date.now()); }

export function sessionActive(id) { return Boolean(db.prepare('SELECT 1 FROM user_sessions WHERE session_id=? AND expires_at>?').get(id,Date.now())); }
