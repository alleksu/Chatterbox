import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const MAX_HISTORY = 200;
const MAX_TEXT = 2000;
const MAX_NAME = 24;
const MAX_GROUP_NAME = 40;
const MAX_GROUP_MEMBERS = 64;
const MAX_BODY = 16 * 1024;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const filesDir = path.join(os.tmpdir(), `chatterbox-files-${PORT}`);

// Start from a clean slate — conversation state does not survive a restart either.
fs.mkdirSync(filesDir, { recursive: true });
for (const name of fs.readdirSync(filesDir)) {
  try {
    fs.rmSync(path.join(filesDir, name), { recursive: true, force: true });
  } catch {
    // Ignore files that are still locked by another process.
  }
}

const clients = new Map();      // connectionId -> { res, userId, name }
const knownUsers = new Map();   // userId -> name
const generalHistory = [];      // messages for the public room
const dmHistory = new Map();    // "dm:a:b" -> messages
const groups = new Map();       // groupId -> { id, name, members:Set<userId>, createdBy, time }
const groupHistory = new Map(); // groupId -> messages
const files = new Map();        // fileId -> { id, name, type, size, path, channel, ownerId, time }
let nextConnectionId = 1;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  // Strip control characters, collapse runs of whitespace, cap the length.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function rememberUser(userId, name) {
  if (!userId) return;
  knownUsers.set(userId, name || knownUsers.get(userId) || 'Anonymous');
}

function userName(userId) {
  return knownUsers.get(userId) || 'Unknown device';
}

function onlineUsers() {
  const seen = new Map();
  for (const client of clients.values()) seen.set(client.userId, client.name);
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) client.res.write(payload);
}

/* ---------- Conversations (general, DMs, groups) ---------- */

function dmChannelId(userA, userB) {
  return `dm:${[userA, userB].sort().map(encodeURIComponent).join(':')}`;
}

function parseChannel(raw) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value || value === 'general') return { type: 'general' };

  if (value.startsWith('dm:')) {
    const parts = value.slice(3).split(':');
    if (parts.length !== 2) return null;
    let userA;
    let userB;
    try {
      userA = decodeURIComponent(parts[0]);
      userB = decodeURIComponent(parts[1]);
    } catch {
      return null;
    }
    if (!userA || !userB) return null;
    return { type: 'dm', users: [userA, userB].sort() };
  }

  if (value.startsWith('group:')) {
    const group = groups.get(value.slice(6));
    if (!group) return null;
    return { type: 'group', group };
  }

  return null;
}

function channelIdFor(info) {
  if (info.type === 'general') return 'general';
  if (info.type === 'dm') return dmChannelId(info.users[0], info.users[1]);
  return `group:${info.group.id}`;
}

function canAccess(info, userId) {
  if (info.type === 'general') return true;
  if (info.type === 'dm') return info.users.includes(userId);
  return info.group.members.has(userId);
}

function channelHistory(info) {
  if (info.type === 'general') return generalHistory;

  if (info.type === 'dm') {
    const key = dmChannelId(info.users[0], info.users[1]);
    if (!dmHistory.has(key)) dmHistory.set(key, []);
    return dmHistory.get(key);
  }

  if (!groupHistory.has(info.group.id)) groupHistory.set(info.group.id, []);
  return groupHistory.get(info.group.id);
}

function trimHistory(messages) {
  if (messages.length <= MAX_HISTORY) return;
  const removed = messages.splice(0, messages.length - MAX_HISTORY);
  for (const message of removed) {
    if (message.kind === 'file' && message.file?.id) deleteFileRecord(message.file.id);
  }
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanFilename(value) {
  const name = cleanText(typeof value === 'string' ? value : '', 140)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/^\.+/, '');
  return name || 'file';
}

function lastMessageTime(messages) {
  return messages.length ? messages[messages.length - 1].time : 0;
}

function conversationsFor(userId) {
  const list = [
    { id: 'general', type: 'general', name: 'General', history: generalHistory, lastTime: lastMessageTime(generalHistory) },
  ];

  for (const [key, messages] of dmHistory) {
    const info = parseChannel(key);
    if (!info || info.type !== 'dm' || !info.users.includes(userId)) continue;
    const peerId = info.users[0] === userId ? info.users[1] : info.users[0];
    list.push({
      id: key,
      type: 'dm',
      name: userName(peerId),
      peerId,
      history: messages,
      lastTime: lastMessageTime(messages),
    });
  }

  for (const group of groups.values()) {
    if (!group.members.has(userId)) continue;
    const messages = groupHistory.get(group.id) || [];
    list.push({
      id: `group:${group.id}`,
      type: 'group',
      name: group.name,
      groupId: group.id,
      members: [...group.members].map((id) => ({ id, name: userName(id) })),
      history: messages,
      lastTime: lastMessageTime(messages),
    });
  }

  return list.sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return b.lastTime - a.lastTime;
  });
}

function writeToUser(userId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.userId === userId) client.res.write(payload);
  }
}

function sendConversationsTo(userId) {
  writeToUser(userId, 'conversations', { conversations: conversationsFor(userId) });
}

function refreshConversationsFor(userIds) {
  const seen = new Set();
  for (const id of userIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    sendConversationsTo(id);
  }
}

function refreshAllConversations() {
  const ids = new Set([...clients.values()].map((client) => client.userId));
  refreshConversationsFor(ids);
}

function deliverMessage(info, message) {
  if (info.type === 'general') return broadcast('message', message);

  const payload = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
  for (const client of clients.values()) {
    const member = info.type === 'dm'
      ? info.users.includes(client.userId)
      : info.group.members.has(client.userId);
    if (member) client.res.write(payload);
  }
}

function publishMessage(info, message) {
  const history = channelHistory(info);
  const startsConversation = info.type === 'dm' && history.length === 0;
  history.push(message);
  trimHistory(history);
  deliverMessage(info, message);
  if (startsConversation) refreshConversationsFor(info.users);
  return message;
}

/* ---------- Stored files ---------- */

function deleteFileRecord(fileId) {
  const record = files.get(fileId);
  if (!record) return;
  files.delete(fileId);
  fs.unlink(record.path, () => {});
}

function receiveFile(req, filePath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filePath);
    let size = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      req.unpipe(out);
      out.destroy();
      reject(error);
    };

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_FILE_BYTES) {
        fail(Object.assign(new Error(`File is larger than ${MAX_FILE_MB} MB`), { status: 413 }));
      }
    });
    req.on('aborted', () => fail(Object.assign(new Error('Upload aborted'), { status: 400 })));
    req.on('error', fail);
    out.on('error', fail);
    out.on('finish', () => {
      if (settled) return;
      settled = true;
      resolve(size);
    });

    req.pipe(out);
  });
}

async function handleFileUpload(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const userId = cleanText(url.searchParams.get('id'), 64);
  const senderName = cleanText(url.searchParams.get('name'), MAX_NAME) || 'Anonymous';
  const filename = cleanFilename(url.searchParams.get('filename'));
  const type = cleanText(url.searchParams.get('type'), 120) || 'application/octet-stream';
  const info = parseChannel(url.searchParams.get('channel'));

  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const declared = Number(req.headers['content-length']);
  if (Number.isFinite(declared) && declared > MAX_FILE_BYTES) {
    req.resume();
    return send(res, 413, { error: `File is larger than ${MAX_FILE_MB} MB` });
  }

  rememberUser(userId, senderName);

  const fileId = randomUUID();
  const filePath = path.join(filesDir, fileId);
  let size;
  try {
    size = await receiveFile(req, filePath);
  } catch (error) {
    fs.unlink(filePath, () => {});
    return send(res, error.status || 400, { error: error.message });
  }

  if (!size) {
    fs.unlink(filePath, () => {});
    return send(res, 400, { error: 'File is empty' });
  }

  const channel = channelIdFor(info);
  const file = { id: fileId, name: filename, type, size };
  files.set(fileId, { ...file, path: filePath, channel, ownerId: userId, time: Date.now() });

  const message = {
    id: messageId(),
    userId,
    name: senderName,
    text: filename,
    time: Date.now(),
    channel,
    kind: 'file',
    file,
  };

  publishMessage(info, message);
  send(res, 200, { ok: true, message });
}

function contentDisposition(name) {
  const fallback = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'file';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function handleFileDownload(req, res, fileId) {
  const url = new URL(req.url, 'http://localhost');
  const userId = cleanText(url.searchParams.get('id'), 64);
  const record = files.get(fileId);
  if (!record) return send(res, 404, { error: 'File not found' });

  const info = parseChannel(record.channel);
  if (!info) return send(res, 404, { error: 'File not found' });
  if (info.type !== 'general' && (!userId || !canAccess(info, userId))) {
    return send(res, 403, { error: 'You are not part of this conversation' });
  }

  res.writeHead(200, {
    'Content-Type': record.type || 'application/octet-stream',
    'Content-Length': record.size,
    'Content-Disposition': contentDisposition(record.name),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });

  const stream = fs.createReadStream(record.path);
  stream.on('error', () => {
    if (res.headersSent) res.destroy();
    else send(res, 500, { error: 'Could not read file' });
  });
  stream.pipe(res);
}

/* ---------- Static files ---------- */

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, relative);
  if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
    return send(res, 403, { error: 'Forbidden' });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

function handleEvents(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const userId = cleanText(url.searchParams.get('id'), 64) || `anon-${nextConnectionId}`;
  const name = cleanText(url.searchParams.get('name'), MAX_NAME) || 'Anonymous';
  rememberUser(userId, name);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');

  const connectionId = nextConnectionId++;
  clients.set(connectionId, { res, userId, name });
  const init = { conversations: conversationsFor(userId), users: onlineUsers() };
  res.write(`event: init\ndata: ${JSON.stringify(init)}\n\n`);
  broadcast('presence', { users: onlineUsers() });
  refreshAllConversations();

  req.on('close', () => {
    clients.delete(connectionId);
    broadcast('presence', { users: onlineUsers() });
    refreshAllConversations();
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

async function handleSend(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message });
  }

  const userId = cleanText(body.id, 64);
  const name = cleanText(body.name, MAX_NAME) || 'Anonymous';
  const text = cleanText(body.text, MAX_TEXT);
  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!text) return send(res, 400, { error: 'Message is empty' });

  const info = parseChannel(body.channel);
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  rememberUser(userId, name);

  const message = {
    id: messageId(),
    userId,
    name,
    text,
    time: Date.now(),
    channel: channelIdFor(info),
  };

  publishMessage(info, message);
  send(res, 200, { ok: true, message });
}

async function handleCreateGroup(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message });
  }

  const ownerId = cleanText(body.id, 64);
  const ownerName = cleanText(body.name, MAX_NAME) || 'Anonymous';
  const name = cleanText(body.nameValue ?? body.groupName, MAX_GROUP_NAME);
  if (!ownerId) return send(res, 400, { error: 'Missing sender id' });
  if (!name) return send(res, 400, { error: 'Group needs a name' });

  const members = new Set([ownerId]);
  const requested = Array.isArray(body.members) ? body.members : [];
  for (const memberId of requested.slice(0, MAX_GROUP_MEMBERS)) {
    const id = cleanText(memberId, 64);
    if (id) members.add(id);
  }
  if (members.size < 2) return send(res, 400, { error: 'Pick at least one other person' });

  rememberUser(ownerId, ownerName);

  const group = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    members,
    createdBy: ownerId,
    time: Date.now(),
  };
  groups.set(group.id, group);
  groupHistory.set(group.id, []);

  refreshConversationsFor(members);
  send(res, 200, { ok: true, group: { id: group.id, name: group.name, channel: `group:${group.id}` } });
}

/* ---------- Call signalling (WebRTC) ---------- */

const SIGNAL_TYPES = new Set(['offer', 'answer', 'ice', 'hangup', 'decline', 'busy']);

async function handleSignal(req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return send(res, err.status || 400, { error: err.message });
  }

  const fromId = cleanText(body.fromId, 64);
  const fromName = cleanText(body.fromName, MAX_NAME) || 'Anonymous';
  const toId = cleanText(body.toId, 64);
  const callId = cleanText(body.callId, 64);
  const type = cleanText(body.type, 16);

  if (!fromId || !toId) return send(res, 400, { error: 'Missing caller or recipient id' });
  if (!callId) return send(res, 400, { error: 'Missing call id' });
  if (!SIGNAL_TYPES.has(type)) return send(res, 400, { error: 'Unknown signal type' });

  const online = [...clients.values()].some((client) => client.userId === toId);
  if (!online) return send(res, 409, { error: 'That device is not online' });

  rememberUser(fromId, fromName);
  writeToUser(toId, 'signal', {
    fromId,
    fromName,
    toId,
    callId,
    type,
    data: body.data ?? null,
  });
  send(res, 200, { ok: true });
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/events') return handleEvents(req, res);
  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      clients: clients.size,
      messages: generalHistory.length,
      dms: dmHistory.size,
      groups: groups.size,
      files: files.size,
    });
  }
  if (req.method === 'POST' && pathname === '/api/messages') return handleSend(req, res);
  if (req.method === 'POST' && pathname === '/api/groups') return handleCreateGroup(req, res);
  if (req.method === 'POST' && pathname === '/api/signal') return handleSignal(req, res);
  if (req.method === 'POST' && pathname === '/api/files') return handleFileUpload(req, res);
  if (req.method === 'GET' && pathname.startsWith('/api/files/')) {
    let fileId;
    try {
      fileId = decodeURIComponent(pathname.slice('/api/files/'.length));
    } catch {
      return send(res, 400, { error: 'Invalid file id' });
    }
    return handleFileDownload(req, res, fileId);
  }
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);
  return send(res, 405, { error: 'Method not allowed' });
});

// Keep idle SSE connections alive through phone/proxy timeouts.
setInterval(() => {
  for (const client of clients.values()) client.res.write(': ping\n\n');
}, 25_000).unref();

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Start with a different port, e.g. PORT=3001 npm start`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const addresses = Object.values(os.networkInterfaces())
    .flat()
    .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    .map((iface) => iface.address);

  console.log('LAN chat is running. Open one of these on any device on the same network:\n');
  console.log(`  On this machine:  http://localhost:${PORT}`);
  for (const address of addresses) console.log(`  On the LAN:       http://${address}:${PORT}`);
  if (addresses.length === 0) console.log('  No LAN address found — check your network connection.');
  console.log('\nPress Ctrl+C to stop.');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const client of clients.values()) client.res.end();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000).unref();
  });
}
