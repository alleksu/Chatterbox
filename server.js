import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const MAX_HISTORY = 300;
const MAX_TEXT = 4000;
const MAX_NAME = 24;
const MAX_GROUP_NAME = 40;
const MAX_GROUP_MEMBERS = 64;
const MAX_BODY = 32 * 1024;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB) || 100;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const TYPING_TTL = 6000;
const MAX_SEARCH_RESULTS = 60;
const MAX_CALL_HISTORY = 50;

const appDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(appDir, 'public');
const filesDir = path.join(os.tmpdir(), `chatterbox-files-${PORT}`);
const USE_HTTPS = process.env.HTTPS === '1' || String(process.env.HTTPS).toLowerCase() === 'true';
const tlsCertPath = path.resolve(process.env.TLS_CERT || path.join(appDir, 'certs', 'cert.pem'));
const tlsKeyPath = path.resolve(process.env.TLS_KEY || path.join(appDir, 'certs', 'key.pem'));
const scheme = USE_HTTPS ? 'https' : 'http';

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
const rooms = new Map();        // roomId -> { id, name, createdBy, time }
const roomHistory = new Map();  // roomId -> messages
const files = new Map();        // fileId -> { id, name, type, size, path, channel, ownerId, time }
const typing = new Map();       // channelId -> Map<userId, expiresAt>
const callSessions = new Map(); // callId -> call metadata
const callHistory = new Map();  // userId -> [callId]
let nextConnectionId = 1;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
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
  return [...seen.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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
  if (!value || value === 'general') return { type: 'general', id: 'general' };

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
    return { type: 'dm', id: dmChannelId(userA, userB), users: [userA, userB].sort() };
  }

  if (value.startsWith('group:')) {
    const group = groups.get(value.slice(6));
    if (!group) return null;
    return { type: 'group', id: `group:${group.id}`, group };
  }

  if (value.startsWith('room:')) {
    const room = rooms.get(value.slice(5));
    if (!room) return null;
    return { type: 'room', id: `room:${room.id}`, room };
  }

  return null;
}

function channelIdFor(info) {
  if (info.type === 'general') return 'general';
  if (info.type === 'dm') return dmChannelId(info.users[0], info.users[1]);
  if (info.type === 'room') return `room:${info.room.id}`;
  return `group:${info.group.id}`;
}

function canAccess(info, userId) {
  if (!info) return false;
  if (info.type === 'general' || info.type === 'room') return true;
  if (!userId) return false;
  if (info.type === 'dm') return info.users.includes(userId);
  return info.group.members.has(userId);
}

function channelHistory(info) {
  if (info.type === 'general') return generalHistory;

  if (info.type === 'dm') {
    const key = channelIdFor(info);
    if (!dmHistory.has(key)) dmHistory.set(key, []);
    return dmHistory.get(key);
  }

  if (info.type === 'room') {
    if (!roomHistory.has(info.room.id)) roomHistory.set(info.room.id, []);
    return roomHistory.get(info.room.id);
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
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function findMessage(info, id) {
  if (!id) return null;
  return channelHistory(info).find((message) => message.id === id) || null;
}

function conversationsFor(userId) {
  const list = [
    {
      id: 'general',
      type: 'general',
      name: 'General',
      history: generalHistory,
      lastTime: lastMessageTime(generalHistory),
    },
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
      online: [...clients.values()].some((client) => client.userId === peerId),
      history: messages,
      lastTime: lastMessageTime(messages),
    });
  }

  for (const room of rooms.values()) {
    const messages = roomHistory.get(room.id) || [];
    list.push({
      id: `room:${room.id}`,
      type: 'room',
      name: room.name,
      roomId: room.id,
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

function deliverToChannel(info, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (canAccess(info, client.userId)) client.res.write(payload);
  }
}

function publishMessage(info, message) {
  const history = channelHistory(info);
  const startsConversation = info.type === 'dm' && history.length === 0;
  history.push(message);
  trimHistory(history);
  deliverToChannel(info, 'message', message);
  if (startsConversation) refreshConversationsFor(info.users);
  return message;
}

/* ---------- Typing indicators ---------- */

function typingUsersFor(channel) {
  const entries = typing.get(channel);
  if (!entries) return [];
  const now = Date.now();
  const users = [];
  for (const [userId, expiresAt] of entries) {
    if (expiresAt <= now) {
      entries.delete(userId);
      continue;
    }
    users.push({ id: userId, name: userName(userId) });
  }
  if (entries.size === 0) typing.delete(channel);
  return users;
}

function broadcastTyping(channel) {
  const info = parseChannel(channel);
  if (!info) return;
  deliverToChannel(info, 'typing', { channel, users: typingUsersFor(channel) });
}

function setTyping(channel, userId, active) {
  let entries = typing.get(channel);
  if (active) {
    if (!entries) {
      entries = new Map();
      typing.set(channel, entries);
    }
    entries.set(userId, Date.now() + TYPING_TTL);
  } else if (entries) {
    entries.delete(userId);
    if (entries.size === 0) typing.delete(channel);
  }
}

function clearTypingForUser(userId) {
  for (const [channel, entries] of [...typing]) {
    if (!entries.has(userId)) continue;
    entries.delete(userId);
    if (entries.size === 0) typing.delete(channel);
    broadcastTyping(channel);
  }
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
    replyTo: buildReplyPreview(info, url.searchParams.get('reply'), userId),
    readBy: [],
  };

  publishMessage(info, message);
  send(res, 200, { ok: true, message });
}

function contentDisposition(name, inline) {
  const fallback = name.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'file';
  const mode = inline ? 'inline' : 'attachment';
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
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

  const inline = url.searchParams.get('inline') === '1';
  res.writeHead(200, {
    'Content-Type': record.type || 'application/octet-stream',
    'Content-Length': record.size,
    'Content-Disposition': contentDisposition(record.name, inline),
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
  const init = {
    conversations: conversationsFor(userId),
    users: onlineUsers(),
    mentions: mentionsFor(userId),
    calls: callsFor(userId),
    config: { maxFileMB: MAX_FILE_MB, maxText: MAX_TEXT, maxName: MAX_NAME, maxGroupName: MAX_GROUP_NAME },
  };
  res.write(`event: init\ndata: ${JSON.stringify(init)}\n\n`);
  broadcast('presence', { users: onlineUsers() });
  refreshAllConversations();

  req.on('close', () => {
    clients.delete(connectionId);
    clearTypingForUser(userId);
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

async function readBodyOrFail(req, res) {
  try {
    return { body: await readJson(req) };
  } catch (err) {
    send(res, err.status || 400, { error: err.message });
    return { error: true };
  }
}

function buildReplyPreview(info, rawId, authorId) {
  const original = findMessage(info, cleanText(rawId, 64));
  if (!original || original.userId === authorId) return null;
  return {
    id: original.id,
    userId: original.userId,
    name: original.name,
    text: (original.kind === 'file' ? original.file?.name : original.text || '').slice(0, 140),
  };
}

function mentionCandidates(info) {
  if (info.type === 'dm') return new Set(info.users);
  if (info.type === 'group') return new Set(info.group.members);
  return new Set(knownUsers.keys());
}

function normalizeMentions(info, raw, authorId) {
  if (!Array.isArray(raw)) return [];
  const allowed = mentionCandidates(info);
  const result = [];
  for (const value of raw.slice(0, 20)) {
    const id = cleanText(value, 64);
    if (!id || id === authorId || result.includes(id) || !allowed.has(id)) continue;
    result.push(id);
  }
  return result;
}

function mentionsFor(userId) {
  if (!userId) return [];
  const found = [];
  for (const conversation of conversationsFor(userId)) {
    for (const message of conversation.history) {
      if (!Array.isArray(message.mentions) || !message.mentions.includes(userId)) continue;
      found.push({
        channel: conversation.id,
        messageId: message.id,
        name: message.name,
        preview: (message.kind === 'file' ? message.file?.name : message.text || '').slice(0, 140),
        time: message.time,
      });
    }
  }
  return found.sort((a, b) => b.time - a.time).slice(0, 50);
}

async function handleSend(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

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
    replyTo: buildReplyPreview(info, body.replyTo, userId),
    mentions: normalizeMentions(info, body.mentions, userId),
    readBy: [],
  };

  publishMessage(info, message);
  send(res, 200, { ok: true, message });
}

async function handleEdit(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.id, 64);
  const text = cleanText(body.text, MAX_TEXT);
  const info = parseChannel(body.channel);
  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!text) return send(res, 400, { error: 'Message is empty' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const message = findMessage(info, cleanText(body.messageId, 64));
  if (!message) return send(res, 404, { error: 'Message not found' });
  if (message.userId !== userId) return send(res, 403, { error: 'You can only edit your own messages' });
  if (message.kind === 'file') return send(res, 400, { error: 'Attachments cannot be edited' });

  message.text = text;
  message.editedAt = Date.now();
  message.mentions = normalizeMentions(info, body.mentions, userId);
  rememberUser(userId, message.name);
  deliverToChannel(info, 'message', message);
  send(res, 200, { ok: true, message });
}

async function handleDelete(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.id, 64);
  const info = parseChannel(body.channel);
  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const id = cleanText(body.messageId, 64);
  const history = channelHistory(info);
  const index = history.findIndex((message) => message.id === id);
  if (index < 0) return send(res, 404, { error: 'Message not found' });

  const message = history[index];
  if (message.userId !== userId) return send(res, 403, { error: 'You can only delete your own messages' });

  if (message.kind === 'file' && message.file?.id) deleteFileRecord(message.file.id);
  history.splice(index, 1);

  deliverToChannel(info, 'message-delete', { channel: channelIdFor(info), id });
  send(res, 200, { ok: true });
}

async function handleCreateGroup(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

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

async function handleCreateRoom(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.id, 64);
  const name = cleanText(body.name ?? body.roomName ?? body.nameValue, MAX_GROUP_NAME);
  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!name) return send(res, 400, { error: 'Room needs a name' });

  const room = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdBy: userId,
    time: Date.now(),
  };
  rooms.set(room.id, room);
  roomHistory.set(room.id, []);
  rememberUser(userId, cleanText(body.displayName, MAX_NAME));
  refreshAllConversations();
  send(res, 200, { ok: true, room: { id: room.id, name: room.name, channel: `room:${room.id}` } });
}

async function handlePin(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.userId ?? body.id, 64);
  const info = parseChannel(body.channel);
  if (!userId) return send(res, 400, { error: 'Missing sender id' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const message = findMessage(info, cleanText(body.messageId, 64));
  if (!message) return send(res, 404, { error: 'Message not found' });

  if (body.action === 'remove') {
    message.pinnedAt = null;
    message.pinnedBy = null;
  } else {
    message.pinnedAt = Date.now();
    message.pinnedBy = userId;
  }

  deliverToChannel(info, 'message', message);
  send(res, 200, { ok: true, message });
}

function searchableConversations(userId, channel) {
  if (channel) {
    const info = parseChannel(channel);
    if (!info || !canAccess(info, userId)) return [];
    const conversation = conversationsFor(userId).find((entry) => entry.id === channelIdFor(info));
    if (!conversation) return [];
    return [conversation];
  }
  return conversationsFor(userId);
}

function handleSearch(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const userId = cleanText(url.searchParams.get('id'), 64);
  const query = cleanText(url.searchParams.get('q'), 160).toLowerCase();
  const channel = cleanText(url.searchParams.get('channel'), 160);
  if (!query) return send(res, 200, { results: [], query: '' });

  const results = [];
  for (const conversation of searchableConversations(userId, channel)) {
    for (const message of conversation.history) {
      const haystack = [
        message.text,
        message.name,
        message.file?.name,
        message.replyTo?.text,
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      if (!haystack.includes(query)) continue;
      results.push({
        channel: conversation.id,
        channelName: conversation.name,
        channelType: conversation.type,
        messageId: message.id,
        userId: message.userId,
        name: message.name,
        text: message.kind === 'file' ? message.file?.name || '' : message.text || '',
        kind: message.kind || 'text',
        file: message.file || null,
        time: message.time,
      });
    }
  }

  results.sort((a, b) => b.time - a.time);
  send(res, 200, { results: results.slice(0, MAX_SEARCH_RESULTS), query, truncated: results.length > MAX_SEARCH_RESULTS });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function sendExport(res, body, type, filename) {
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Disposition': contentDisposition(filename, false),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function handleExport(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const userId = cleanText(url.searchParams.get('id'), 64);
  const format = url.searchParams.get('format') === 'html' ? 'html' : 'json';
  const info = parseChannel(url.searchParams.get('channel'));
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const conversation = conversationsFor(userId).find((entry) => entry.id === channelIdFor(info));
  if (!conversation) return send(res, 404, { error: 'Conversation not found' });

  const baseName = cleanFilename(conversation.name).replace(/\.[a-z0-9]{1,8}$/i, '') || 'conversation';
  const exportedAt = new Date().toISOString();
  const messages = conversation.history.map((message) => ({
    id: message.id,
    time: message.time,
    name: message.name,
    userId: message.userId,
    text: message.text,
    kind: message.kind || 'text',
    file: message.file || null,
    replyTo: message.replyTo || null,
    mentions: message.mentions || [],
    reactions: message.reactions || null,
    editedAt: message.editedAt || null,
    pinnedAt: message.pinnedAt || null,
  }));

  if (format === 'json') {
    const payload = {
      conversation: { id: conversation.id, name: conversation.name, type: conversation.type },
      exportedAt,
      messages,
    };
    return sendExport(
      res,
      JSON.stringify(payload, null, 2),
      'application/json; charset=utf-8',
      `${baseName}.json`,
    );
  }

  const rows = messages
    .map((message) => {
      const when = new Date(message.time).toLocaleString();
      const text = message.kind === 'file'
        ? `Attachment: ${message.file?.name || 'file'}`
        : message.text || '';
      return `<article><header><strong>${escapeHtml(message.name)}</strong><time>${escapeHtml(when)}</time></header><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>${message.pinnedAt ? '<small>Pinned</small>' : ''}</article>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(conversation.name)} - Chatterbox export</title>
<style>
  body{font:16px/1.5 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1f2937;background:#fff}
  h1{font-size:1.6rem;margin-bottom:.25rem}
  .meta{color:#6b7280;margin-top:0}
  article{padding:14px 0;border-bottom:1px solid #e5e7eb}
  header{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
  time{color:#6b7280;font-size:.8rem;white-space:nowrap}
  p{margin:.4rem 0;white-space:normal;overflow-wrap:anywhere}
  small{color:#7c5c12;background:#fef3c7;padding:2px 6px;border-radius:999px}
</style>
</head>
<body>
<h1>${escapeHtml(conversation.name)}</h1>
<p class="meta">Chatterbox export · ${escapeHtml(exportedAt)} · ${messages.length} messages</p>
${rows}
</body>
</html>`;

  return sendExport(res, html, 'text/html; charset=utf-8', `${baseName}.html`);
}

/* ---------- Reactions, read receipts ---------- */

async function handleReactions(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.userId, 64);
  const emoji = cleanText(body.emoji, 24);
  const action = body.action === 'remove' ? 'remove' : 'add';
  const info = parseChannel(body.channel);

  if (!userId || !emoji) return send(res, 400, { error: 'Missing required fields' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const message = findMessage(info, cleanText(body.messageId, 64));
  if (!message) return send(res, 404, { error: 'Message not found' });

  message.reactions = message.reactions || {};
  const list = message.reactions[emoji] || [];
  if (action === 'add') {
    if (!list.includes(userId)) list.push(userId);
  }
  const next = action === 'add' ? list : list.filter((id) => id !== userId);
  if (next.length) message.reactions[emoji] = next;
  else delete message.reactions[emoji];
  if (Object.keys(message.reactions).length === 0) delete message.reactions;

  deliverToChannel(info, 'message', message);
  send(res, 200, { ok: true, message });
}

async function handleReadReceipt(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.userId, 64);
  const messageIdValue = cleanText(body.messageId, 64);
  const info = parseChannel(body.channel);
  if (!userId || !messageIdValue) return send(res, 400, { error: 'Missing required fields' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const message = findMessage(info, messageIdValue);
  if (!message) return send(res, 404, { error: 'Message not found' });

  message.readBy = message.readBy || [];
  if (!message.readBy.includes(userId)) {
    message.readBy.push(userId);
    deliverToChannel(info, 'read-receipt', { channel: channelIdFor(info), messageId: messageIdValue, userId });
  }
  send(res, 200, { ok: true });
}

async function handleTyping(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

  const userId = cleanText(body.userId, 64);
  const info = parseChannel(body.channel);
  if (!userId) return send(res, 400, { error: 'Missing user id' });
  if (!info) return send(res, 400, { error: 'Unknown conversation' });
  if (!canAccess(info, userId)) return send(res, 403, { error: 'You are not part of this conversation' });

  const channel = channelIdFor(info);
  setTyping(channel, userId, body.type !== 'stop');
  broadcastTyping(channel);
  send(res, 200, { ok: true });
}

/* ---------- Call signalling (WebRTC) ---------- */

const SIGNAL_TYPES = new Set(['offer', 'answer', 'ice', 'hangup', 'decline', 'busy']);

function callsFor(userId) {
  const entries = callHistory.get(userId) || [];
  return entries
    .map((callId) => callSessions.get(callId))
    .filter((record) => record && (record.fromId === userId || record.toId === userId))
    .map((record) => ({
      callId: record.callId,
      direction: record.fromId === userId ? 'outgoing' : 'incoming',
      peerId: record.fromId === userId ? record.toId : record.fromId,
      peerName: record.fromId === userId ? record.toName : record.fromName,
      withVideo: record.withVideo,
      state: record.state,
      createdAt: record.createdAt,
      answeredAt: record.answeredAt,
      endedAt: record.endedAt,
      duration: record.duration,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function rememberCallFor(userId, callId) {
  if (!userId || !callId) return;
  let ids = callHistory.get(userId);
  if (!ids) {
    ids = [];
    callHistory.set(userId, ids);
  }
  if (!ids.includes(callId)) ids.unshift(callId);
  while (ids.length > MAX_CALL_HISTORY) ids.pop();
}

function refreshCallsFor(record) {
  for (const userId of new Set([record.fromId, record.toId])) {
    writeToUser(userId, 'calls', { calls: callsFor(userId) });
  }
}

function finishCallRecord(callId, type) {
  const record = callSessions.get(callId);
  if (!record || record.endedAt) return null;
  record.endedAt = Date.now();
  record.duration = Math.max(0, Math.round((record.endedAt - (record.answeredAt || record.createdAt)) / 1000));
  record.state = type === 'decline' ? 'declined' : type === 'busy' ? 'busy' : 'ended';
  rememberCallFor(record.fromId, record.callId);
  rememberCallFor(record.toId, record.callId);
  refreshCallsFor(record);
  return record;
}

function trackCallSignal(type, { fromId, fromName, toId, callId, data }) {
  if (type === 'ice') return;
  const existing = callSessions.get(callId);

  if (type === 'offer') {
    if (existing) return;
    const record = {
      callId,
      fromId,
      fromName,
      toId,
      toName: userName(toId),
      withVideo: Boolean(data && /m=video/.test(data.sdp || '')),
      state: 'ringing',
      createdAt: Date.now(),
      answeredAt: 0,
      endedAt: 0,
      duration: 0,
    };
    callSessions.set(callId, record);
    return;
  }

  if (!existing) return;
  if (type === 'answer') {
    if (existing.state !== 'ringing') return;
    existing.state = 'active';
    existing.answeredAt = Date.now();
    return;
  }

  if (type === 'hangup' || type === 'decline' || type === 'busy') finishCallRecord(callId, type);
}

async function handleSignal(req, res) {
  const { body, error } = await readBodyOrFail(req, res);
  if (error) return;

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
  trackCallSignal(type, { fromId, fromName, toId, callId, data: body.data ?? null });
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

function requestHandler(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/events') return handleEvents(req, res);
  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, {
      ok: true,
      clients: clients.size,
      messages: generalHistory.length,
      dms: dmHistory.size,
      groups: groups.size,
      rooms: rooms.size,
      calls: callSessions.size,
      files: files.size,
    });
  }
  if (req.method === 'POST' && pathname === '/api/messages') return handleSend(req, res);
  if (req.method === 'POST' && pathname === '/api/messages/edit') return handleEdit(req, res);
  if (req.method === 'POST' && pathname === '/api/messages/delete') return handleDelete(req, res);
  if (req.method === 'POST' && pathname === '/api/messages/pin') return handlePin(req, res);
  if (req.method === 'POST' && pathname === '/api/groups') return handleCreateGroup(req, res);
  if (req.method === 'POST' && pathname === '/api/rooms') return handleCreateRoom(req, res);
  if (req.method === 'POST' && pathname === '/api/signal') return handleSignal(req, res);
  if (req.method === 'POST' && pathname === '/api/files') return handleFileUpload(req, res);
  if (req.method === 'POST' && pathname === '/api/reactions') return handleReactions(req, res);
  if (req.method === 'POST' && pathname === '/api/read-receipt') return handleReadReceipt(req, res);
  if (req.method === 'POST' && pathname === '/api/typing') return handleTyping(req, res);
  if (req.method === 'GET' && pathname === '/api/search') return handleSearch(req, res);
  if (req.method === 'GET' && pathname === '/api/export') return handleExport(req, res);
  if (req.method === 'GET' && pathname === '/api/calls') {
    const url = new URL(req.url, 'http://localhost');
    const userId = cleanText(url.searchParams.get('id'), 64);
    if (!userId) return send(res, 400, { error: 'Missing user id' });
    return send(res, 200, { calls: callsFor(userId) });
  }
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
}

let server;
if (USE_HTTPS) {
  try {
    server = https.createServer(
      { cert: fs.readFileSync(tlsCertPath), key: fs.readFileSync(tlsKeyPath) },
      requestHandler,
    );
  } catch (error) {
    console.error(`Could not start HTTPS. Missing or unreadable TLS certificate/key.\n  cert: ${tlsCertPath}\n  key:  ${tlsKeyPath}\n${error.message}`);
    process.exit(1);
  }
} else {
  server = http.createServer(requestHandler);
}

setInterval(() => {
  for (const client of clients.values()) client.res.write(': ping\n\n');
}, 25_000).unref();

setInterval(() => {
  for (const channel of [...typing.keys()]) {
    const before = typing.get(channel)?.size || 0;
    typingUsersFor(channel);
    const after = typing.get(channel)?.size || 0;
    if (after !== before) broadcastTyping(channel);
  }
}, 2500).unref();

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

  console.log(`Chatterbox is running${USE_HTTPS ? ' with HTTPS' : ''}. Open one of these on any device on the same network:\n`);
  console.log(`  On this machine:  ${scheme}://localhost:${PORT}`);
  for (const address of addresses) console.log(`  On the LAN:       ${scheme}://${address}:${PORT}`);
  if (USE_HTTPS) console.log('\n  The certificate is self-signed unless you supplied your own. Accept the browser warning once per device.');
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
