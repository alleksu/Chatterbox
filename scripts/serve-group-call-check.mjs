// Local browser fixture: real app UI/WebRTC, synthetic media, no user accounts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GroupCalls } from '../group-calls.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const members = ['a', 'b', 'c'].map((id, index) => ({ id, name: ['Alice', 'Bob', 'Charlie'][index], username: `fixture_${id}`, sessionId: `fixture_${id}` }));
const channel = 'group:browser-check';
const appStreams = new Set(), helperStreams = new Set();
const event = (streams, type, data) => { for (const res of streams) res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); };
const calls = new GroupCalls({
  getGroup: (id) => id === channel ? { name: 'Group call check', members: new Set(members.map((user) => user.id)) } : null,
  ownsConnection: (auth, id) => members[id - 1]?.id === auth.id,
  isConnected: (id) => id >= 1 && id <= 3,
  broadcast: (_, data) => { event(appStreams, 'group-call', data);event(helperStreams, 'group-call', data); },
  send: (id, type, data) => id === 1 ? event(appStreams, type, data) : event(helperStreams, 'peer-signal', { ...data, recipient: members[id - 1].id }),
  historyChanged: () => event(appStreams, 'calls', { calls: calls.historyFor('a') }),
});
const identity = { user: members[0], csrfToken: 'a'.repeat(64) };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
const json = (res, data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });res.end(JSON.stringify(data)); };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/events' || url.pathname === '/fixture/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      const streams = url.pathname === '/events' ? appStreams : helperStreams;
      streams.add(res);req.on('close', () => streams.delete(res));
      if (streams === appStreams) event(new Set([res]), 'init', {
        connectionId: 1, users: members, calls: [], config: {},
        conversations: [
          { id: channel, name: 'Group call check', type: 'group', members, call: calls.forChannel(channel), history: [] },
          { id: 'general', name: 'General', type: 'general', history: [] },
        ],
      });
      else res.write(': ready\n\n');
      return;
    }
    if (url.pathname.startsWith('/api/auth/')) return json(res, identity);
    if (url.pathname === '/api/calls') return json(res, { calls: calls.historyFor('a') });
    if (req.method === 'POST') {
      let raw = '';for await (const chunk of req) { raw += chunk;if (raw.length > 65536) throw new Error('Too much fixture data'); }
      const body = JSON.parse(raw || '{}');
      if (url.pathname === '/fixture/report') { console.log('BROWSER CHECK: ' + JSON.stringify(body));return json(res, { ok: true }); }
      const helper = url.pathname.startsWith('/fixture/');
      const auth = helper ? members.find((user) => user.id === body.actor) : members[0];
      if (!auth) return json(res, { error: 'Invalid fixture actor' }, 400);
      const action = url.pathname.split('/').pop();
      return json(res, calls.execute(action, auth, { ...body, channel, connectionId: members.indexOf(auth) + 1 }));
    }
    const assets = { '/fixture-client.js': 'scripts/group-call-check-client.js', '/app.js': 'public/app.js', '/auth-client.js': 'public/auth-client.js', '/group-call-media.js': 'public/group-call-media.js', '/styles.css': 'public/styles.css', '/logo.svg': 'public/logo.svg' };
    if (url.pathname === '/') {
      const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8').replace('<script src="/app.js" type="module"></script>', '<script src="/fixture-client.js" type="module"></script><script src="/app.js" type="module"></script>');
      res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });res.end(html);return;
    }
    const asset = assets[url.pathname];
    if (!asset) { res.writeHead(404);res.end();return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(asset)], 'Cache-Control': 'no-store' });res.end(fs.readFileSync(path.join(root, asset)));
  } catch (error) { json(res, { error: error.message }, error.status || 500); }
});
server.listen(0, '127.0.0.1', () => console.log(`BROWSER FIXTURE: http://127.0.0.1:${server.address().port}/`));
setTimeout(() => { server.close();server.closeAllConnections(); }, 15 * 60 * 1000).unref();
