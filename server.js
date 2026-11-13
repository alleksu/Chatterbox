import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const MAX_HISTORY = 200;
const MAX_TEXT = 2000;
const MAX_NAME = 24;
const MAX_GROUP_NAME = 40;
const MAX_GROUP_MEMBERS = 64;
const MAX_BODY = 16 * 1024;

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const clients = new Map();      // connectionId -> { res, userId, name }
const knownUsers = new Map();   // userId -> name
const generalHistory = [];      // messages for the public room
const dmHistory = new Map();    // "dm:a:b" -> messages
const groups = new Map();       // groupId -> { id, name, members:Set<userId>, createdBy, time }
const groupHistory = new Map(); // groupId -> messages
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
  if (messages.length > MAX_HISTORY) messages.splice(0, messages.length - MAX_HISTORY);
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
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    name,
    text,
    time: Date.now(),
    channel: channelIdFor(info),
  };

  const history = channelHistory(info);
  const startsConversation = info.type === 'dm' && history.length === 0;
  history.push(message);
  trimHistory(history);

  deliverMessage(info, message);
  if (startsConversation) refreshConversationsFor(info.users);
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
    });
  }
  if (req.method === 'POST' && pathname === '/api/messages') return handleSend(req, res);
  if (req.method === 'POST' && pathname === '/api/groups') return handleCreateGroup(req, res);
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
