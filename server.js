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
const MAX_BODY = 16 * 1024;

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const clients = new Map(); // connectionId -> { res, userId, name }
const history = [];        // { id, userId, name, text, time }
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

function onlineUsers() {
  const seen = new Map();
  for (const client of clients.values()) seen.set(client.userId, client.name);
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) client.res.write(payload);
}

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

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');

  const connectionId = nextConnectionId++;
  clients.set(connectionId, { res, userId, name });
  res.write(`event: init\ndata: ${JSON.stringify({ history, users: onlineUsers() })}\n\n`);
  broadcast('presence', { users: onlineUsers() });

  req.on('close', () => {
    clients.delete(connectionId);
    broadcast('presence', { users: onlineUsers() });
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

  const message = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, userId, name, text, time: Date.now() };
  history.push(message);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

  broadcast('message', message);
  send(res, 200, { ok: true, message });
}

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;

  if (req.method === 'GET' && pathname === '/events') return handleEvents(req, res);
  if (req.method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { ok: true, clients: clients.size, messages: history.length });
  }
  if (req.method === 'POST' && pathname === '/api/messages') return handleSend(req, res);
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
