import {DatabaseSync} from 'node:sqlite';
import { migrate } from '../db-migrations.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createAuthClient } from '../public/auth-client.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temp = mkdtempSync(path.join(os.tmpdir(), 'chatterbox-auth-test-'));
const dbPath = path.join(temp, 'test.sqlite');
migrate(dbPath);
let server;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function getPort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
}
let base;
let serverError = '';
async function startServer() {
  const port = await getPort();
  base = `http://127.0.0.1:${port}`;
  serverError = '';
  server = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, HTTPS:'0', CHATTERBOX_HOST:'127.0.0.1', PORT: String(port), CHATTERBOX_DB_PATH: dbPath },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (buf) => { serverError += String(buf); });
  for (let i = 0; i < 70; i++) {
    try {
      const res = await fetch(`${base}/api/health`);
      if (res.ok) return;
    } catch { /* waiting for startup */ }
    if (server.exitCode !== null) throw new Error(`Server exited: ${serverError}`);
    await sleep(80);
  }
  throw new Error(`Server did not start: ${serverError}`);
}
async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const child = server;
  await new Promise((resolve) => {
    const t = setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 3000);
    child.once('exit', () => { clearTimeout(t); resolve(); });
    child.kill('SIGTERM');
  });
}
async function api(url, { method = 'GET', body, cookie, csrf, raw, contentType = 'application/json' } = {}) {
  const headers = { ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) };
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = contentType;
  const res = await fetch(`${base}${url}`, {
    method,
    headers,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, data };
}
function extractIdentity(r) {
  const cookie = r.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith('cb_session='));
  return { cookie, csrf: r.data.csrfToken, user: r.data.user };
}
async function main() {
  try {
    await startServer();
    let browserCookie = '';
    let authRequests = 0;
    const auth = createAuthClient(async (route, options) => {
      authRequests++;
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal, 'auth requests have a timeout');
      const headers = new Headers(options.headers);
      headers.set('Origin', base);
      if (browserCookie) headers.set('Cookie', browserCookie);
      const response = await fetch(base + route, { ...options, headers });
      const cookie = response.headers.get('set-cookie');
      if (cookie) browserCookie = cookie.split(';')[0];
      return response;
    });
    let session = await auth.session();
    assert.deepEqual(session, { user: null, csrfToken: null }, 'signed-out session check succeeds without a 401');
    const beforeInvalid = authRequests;
    for (const fields of [
      { name: 'A', username: 'alice', password: 'correct-horse-123' },
      { name: 'Alice Doe', username: 'bad!', password: 'correct-horse-123' },
      { name: 'Alice Doe', username: 'alice', password: 'short' },
    ]) await assert.rejects(auth.submit('register', fields));
    assert.equal(authRequests, beforeInvalid, 'invalid form fields do not consume the registration request budget');
    let r = await api('/api/messages', { method: 'POST', body: { channel: 'general', text: 'anonymous' } });
    assert.equal(r.status, 401, 'anonymous messaging rejected');
    const created = await auth.submit('register', { name: '  Alice   Doe  ', username: ' ALICE ', password: 'correct-horse-123' });
    assert.equal(created.user.name, 'Alice Doe', 'client and server agree on name normalization');
    assert.equal(created.user.username, 'alice', 'client and server agree on username normalization');
    const alice = { cookie: browserCookie, csrf: created.csrfToken, user: created.user };
    session = await auth.session();
    assert.deepEqual(session.user, alice.user, 'the registration cookie signs in subsequent requests');
    assert.equal(session.csrfToken, alice.csrf);
    await assert.rejects(auth.submit('register', { name: 'Other Alice', username: 'ALICE', password: 'somepass890' }),
      error => error.status === 409 && /already taken/.test(error.message), 'duplicate username is shown by the auth client');
    r = await api('/api/auth/register', { method: 'POST', body: { name: 'Bob Jones', username: 'bob', password: 'differentpass123' } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const bob = extractIdentity(r);
    r = await api('/api/auth/me', { cookie: alice.cookie });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.name, 'Alice Doe');
    r = await api('/api/messages', { method: 'POST', cookie: alice.cookie, body: { id: bob.user.id, name: 'Bob Jones', channel: 'general', text: 'spoofed without csrf' } });
    assert.equal(r.status, 403, 'CSRF required');
    r = await api('/api/messages', { method: 'POST', cookie: alice.cookie, csrf: alice.csrf, body: { id: bob.user.id, name: 'Bob Jones', channel: 'general', text: 'Hello from Alice' } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.message.userId, alice.user.id, 'session overrides spoofed id');
    assert.equal(r.data.message.name, 'Alice Doe', 'session overrides spoofed name');
    const messageId = r.data.message.id;
    r = await api('/api/messages/edit', { method: 'POST', cookie: bob.cookie, csrf: bob.csrf, body: { id: alice.user.id, channel: 'general', messageId, text: 'Bob edited' } });
    assert.equal(r.status, 403, 'cannot spoof author on edit');
    r = await api('/api/groups', { method: 'POST', cookie: alice.cookie, csrf: alice.csrf, body: { id: bob.user.id, name: 'Fake Bob', nameValue: 'Secret Group', members: [bob.user.id] } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const groupId = r.data.group.channel;
    r = await api('/api/auth/register', { method: 'POST', body: { name: 'Charlie User', username: 'charlie', password: 'differentpass123' } });
    const charlie = extractIdentity(r);
    r = await api(`/api/export?channel=${encodeURIComponent(groupId)}&id=${encodeURIComponent(alice.user.id)}`, { cookie: charlie.cookie });
    assert.equal(r.status, 403, 'nonmember cannot export private group by claiming ID');
    r = await api('/api/messages', { method: 'POST', cookie: alice.cookie, csrf: alice.csrf, raw: 'null' });
    assert.equal(r.status, 400, 'null JSON rejected');
    r = await api('/api/reactions', { method: 'POST', cookie: alice.cookie, csrf: alice.csrf, body: { channel: 'general', messageId, emoji: 'toString', action: 'add' } });
    assert.equal(r.status, 400, 'dangerous reaction key rejected');
    r = await api('/api/health');
    assert.equal(r.status, 200, 'server remains alive after malformed requests');

    const post = (route, identity, body) => api(route,{method:'POST',cookie:identity.cookie,csrf:identity.csrf,body});
    for (const raw of ['[]','true','42','"string"','{','x'.repeat(40000)]) {
      r=await api('/api/messages',{method:'POST',cookie:alice.cookie,csrf:alice.csrf,raw});
      assert.ok([400,413].includes(r.status), 'malformed or oversized JSON rejected');
    }
    r=await api('/api/auth/register',{method:'POST',body:{name:'',username:'bad!',password:'short'}});assert.equal(r.status,400);
    const cross=await fetch(base+'/api/messages',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json',Cookie:alice.cookie,'X-CSRF-Token':alice.csrf},body:'{}'});assert.equal(cross.status,403);
    assert.equal((await fetch(base+'/api/auth/session',{headers:{Origin:'https://evil.invalid',Cookie:alice.cookie}})).status,403,'session probe remains same-origin');
    assert.match((await post('/api/auth/login',alice,{username:'alice',password:'correct-horse-123'})).headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
    const dm='dm:'+ [alice.user.id,bob.user.id].sort().join(':');
    r=await post('/api/messages',alice,{channel:dm,text:'Private DM'});assert.equal(r.status,200);
    const dmMessage=r.data.message.id;
    assert.equal((await post('/api/messages',charlie,{channel:dm,text:'Intrusion'})).status,403);
    assert.equal((await api('/api/export?channel='+dm,{cookie:charlie.cookie})).status,403);
    assert.equal((await post('/api/messages/delete',bob,{channel:dm,messageId:dmMessage})).status,403);
    assert.equal((await post('/api/messages/edit',alice,{channel:dm,messageId:dmMessage,text:'Edited'})).status,200);
    assert.equal((await post('/api/reactions',bob,{channel:dm,messageId:dmMessage,emoji:'\u{1f44d}'})).status,200);
    assert.equal((await post('/api/read-receipt',bob,{channel:dm,messageId:dmMessage})).status,200);
    assert.equal((await post('/api/messages/pin',bob,{channel:dm,messageId:dmMessage})).status,200);
    assert.equal((await post('/api/messages',bob,{channel:groupId,text:'Group member'})).status,200);
    assert.equal((await post('/api/messages',charlie,{channel:groupId,text:'Outsider'})).status,403);
    assert.equal((await post('/api/rooms',alice,{name:'Test room'})).status,200);
    assert.equal((await post('/api/typing',alice,{channel:dm})).status,200);
    const search=await api('/api/search?q=Edited',{cookie:charlie.cookie});assert.equal(search.data.results.length,0);
    const upload=await api('/api/files?channel='+dm+'&filename=unsafe.html&type=text/html',{method:'POST',cookie:alice.cookie,csrf:alice.csrf,raw:'<script>alert(1)</script>',contentType:'text/html'});assert.equal(upload.status,200);
    const fileRoute='/api/files/'+upload.data.message.file.id+'?inline=1';
    let download=await fetch(base+fileRoute,{headers:{Cookie:bob.cookie}});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(download.headers.get('content-security-policy'),'sandbox');assert.equal(download.headers.get('content-type'),'application/octet-stream');await download.arrayBuffer();
    assert.equal((await fetch(base+fileRoute,{headers:{Cookie:charlie.cookie}})).status,403);
    assert.equal((await fetch(base+fileRoute)).status,401);
    assert.equal((await fetch(base+'/events')).status,401);
    const streamAbort=new AbortController();
    const events=await fetch(base+'/events',{headers:{Cookie:bob.cookie},signal:streamAbort.signal});assert.equal(events.status,200);const reader=events.body.getReader();await reader.read();
    const aliceAbort=new AbortController(); const aliceStream=await fetch(base+'/events',{headers:{Cookie:alice.cookie},signal:aliceAbort.signal}); const aliceReader=aliceStream.body.getReader(); await aliceReader.read();
    const signal={toId:bob.user.id,callId:'test-call',type:'offer',data:{type:'offer',sdp:'v=0\r\nm=audio'}};
    assert.equal((await post('/api/signal',alice,signal)).status,200);
    assert.equal((await post('/api/signal',charlie,{...signal,type:'hangup'})).status,403);
    assert.equal((await post('/api/signal',alice,{...signal,type:'answer',data:{type:'answer',sdp:'v=0'}})).status,403);
    assert.equal((await post('/api/signal',alice,{...signal,type:'ice',data:{candidate:'candidate:test'}})).status,200);
    assert.equal((await post('/api/signal',bob,{toId:alice.user.id,callId:'test-call',type:'answer',data:{type:'answer',sdp:'v=0'}})).status,200);
    assert.equal((await post('/api/signal',alice,signal)).status,200,'caller ICE renegotiation');
    assert.equal((await post('/api/signal',alice,{...signal,type:'hangup'})).status,200);
    aliceAbort.abort(); await aliceReader.cancel().catch(()=>{});
    assert.equal((await post('/api/signal',alice,signal)).status,409);
    streamAbort.abort();await reader.cancel().catch(()=>{});
    const database=new DatabaseSync(dbPath);database.prepare('UPDATE user_sessions SET expires_at=0 WHERE user_id=?').run(charlie.user.id);database.close();assert.equal((await api('/api/auth/me',{cookie:charlie.cookie})).status,401);
    console.log('PASS: malformed bodies, origin rejection, DM/group isolation, edits/deletes, reactions, receipts, pins, rooms, typing, private search, unsafe attachments, SSE authentication, call ownership, expired sessions');
    r = await api('/api/auth/login', { method: 'POST', body: { username: 'alice', password: 'wrongpassword' } });
    assert.equal(r.status, 401, 'bad password rejected');
    await stopServer();
    await startServer();
    assert.deepEqual((await auth.session()).user, alice.user, 'client session restore survives a server restart');
    r = await api('/api/auth/me', { cookie: alice.cookie });
    assert.equal(r.status, 200, 'session survives restart');
    r = await api('/api/auth/login', { method: 'POST', body: { username: 'alice', password: 'correct-horse-123' } });
    assert.equal(r.status, 200, 'credentials survive restart');
    r = await api('/api/auth/logout', { method: 'POST', cookie: alice.cookie, csrf: alice.csrf, body: {} });
    assert.equal(r.status, 200);
    r = await api('/api/auth/me', { cookie: alice.cookie });
    assert.equal(r.status, 401, 'logout destroys the session');
    assert.deepEqual(await auth.session(), { user: null, csrfToken: null }, 'client sees logout as a signed-out session');
    const loggedIn = await auth.submit('login', { username: 'ALICE', password: 'correct-horse-123' });
    assert.deepEqual(loggedIn.user, alice.user, 'client login succeeds after logout');
    for(let i=0;i<8;i++) r=await api('/api/auth/login',{method:'POST',body:{username:'alice',password:'wrong'}});
    assert.equal(r.status,429,'authentication rate limit');
    for(let i=0;i<245;i++) r=await post('/api/messages',bob,{channel:'general',text:'Rate test'});
    assert.equal(r.status,429,'message rate limit');
    console.log('PASS: authentication and message rate limits');
    console.log('PASS: registration, case-insensitive uniqueness, login, SQLite persistence, cookies, CSRF, impersonation, safe malformed-input handling, private export, logout');
    for (const [failure, message] of [
      [new TypeError('Failed to fetch'), /Cannot connect to Chatterbox/],
      [new DOMException('timeout', 'TimeoutError'), /too long to respond/],
    ]) {
      const broken = createAuthClient(async () => { throw failure; });
      await assert.rejects(broken.session(), message);
    }
    const malformed = createAuthClient(async () => new Response('not JSON'));
    await assert.rejects(malformed.session(), /Unexpected sign-in response/);
    const insecure = createAuthClient(async () => new Response(JSON.stringify({error:'Use HTTPS to register or log in from another device on the LAN.'}),{status:426}));
    await assert.rejects(insecure.session(), error => error.status===426 && /Use HTTPS/.test(error.message));
    console.log('PASS: browser auth client, normalized form fields, public session probe, registration cookie, restore, logout/login, duplicate username, connection/timeout/HTTPS errors');
  } finally {
    await stopServer();
    rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
