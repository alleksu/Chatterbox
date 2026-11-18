import assert from 'node:assert/strict';
import { GroupCalls } from '../group-calls.mjs';
import { GroupCallMedia } from '../public/group-call-media.js';

const auth = ['a', 'b', 'c', 'outsider'].map((id) => ({ id, name: id.toUpperCase(), sessionId: `session-${id}` }));
const connections = new Map(auth.map((user, index) => [index + 1, user]));
const groups = new Map([
  ['group:one', { name: 'One', members: new Set(['a', 'b', 'c']) }],
  ['group:two', { name: 'Two', members: new Set(['a', 'b', 'c']) }],
]);
const events = [], signals = [];
let now = 1000;
const manager = new GroupCalls({
  getGroup: (channel) => groups.get(channel),
  ownsConnection: (user, id) => connections.get(id)?.id === user.id && connections.get(id)?.sessionId === user.sessionId,
  isConnected: (id) => connections.has(id),
  broadcast: (channel, data) => events.push({ channel, data }),
  send: (connectionId, type, data) => signals.push({ connectionId, type, data }),
  historyChanged: () => {},
}, { maxParticipants: 3, disconnectGraceMs: 15, now: () => now });
function invoke(action, index, body = {}) {
  return manager.execute(action, auth[index], { channel: 'group:one', connectionId: index + 1, ...body });
}
function rejectsStatus(operation, status) { assert.throws(operation, (error) => error.status === status); }

rejectsStatus(() => invoke('start', 3, { withVideo: true }), 403);
rejectsStatus(() => invoke('start', 0, { withVideo: true, connectionId: 2 }), 409);
const started = invoke('start', 0, { withVideo: true }).call;
assert.equal(started.participants.length, 1);
assert.equal(started.withVideo, true);
assert.equal(events.at(-1).data.reason, 'started');
rejectsStatus(() => invoke('start', 1, { withVideo: false }), 409);
rejectsStatus(() => invoke('start', 0, { channel: 'group:two', withVideo: false }), 409);
const callId = started.callId;
rejectsStatus(() => invoke('join', 1, { callId: 'stale' }), 409);
invoke('join', 1, { callId });
invoke('join', 2, { callId });
assert.equal(manager.forChannel('group:one').participants.length, 3);
invoke('join', 2, { callId });
assert.equal(manager.forChannel('group:one').participants.length, 3, 'joining is idempotent');
invoke('update', 1, { callId, muted: true, cameraOn: false });
assert.equal(manager.forChannel('group:one').participants[1].muted, true);
assert.equal(manager.forChannel('group:one').participants[1].cameraOn, false);
invoke('signal', 0, { callId, toId: 'b', type: 'offer', data: { type: 'offer', sdp: 'v=0\r\nm=video' } });
assert.equal(signals[0].connectionId, 2, 'offer goes only to the recipient device');
assert.equal(signals[0].data.fromId, 'a');
rejectsStatus(() => invoke('signal', 1, { callId, toId: 'a', type: 'offer', data: { type: 'offer', sdp: 'v=0' } }), 403);
rejectsStatus(() => invoke('signal', 0, { callId, toId: 'outsider', type: 'ice', data: { candidate: 'candidate:test' } }), 403);
rejectsStatus(() => invoke('signal', 0, { callId, toId: 'b', type: 'ice', data: { candidate: 'x'.repeat(4097) } }), 400);
connections.set(9, auth[0]);
rejectsStatus(() => invoke('join', 0, { callId, connectionId: 9 }), 409);
rejectsStatus(() => invoke('leave', 0, { callId, connectionId: 9 }), 403);
now += 5000;
invoke('leave', 0, { callId });
assert.equal(manager.forChannel('group:one').participants.length, 2, 'call continues after the creator leaves');
assert.equal(manager.historyFor('a')[0].duration, 5);
now += 3000;
invoke('join', 0, { callId });
now += 2000;
invoke('leave', 0, { callId });
assert.equal(manager.historyFor('a')[0].duration, 7, 'history excludes time spent outside the call');
connections.delete(2);
manager.disconnect(2);
connections.set(12, auth[1]);
manager.reconnect(auth[1], 12);
await new Promise((resolve) => setTimeout(resolve, 25));
assert.equal(manager.forChannel('group:one').participants.find((p) => p.id === 'b').connectionId, 12);
connections.delete(3);
manager.disconnect(3);
await new Promise((resolve) => setTimeout(resolve, 25));
assert.equal(manager.forChannel('group:one').participants.length, 1, 'disconnected participants are removed after grace period');
manager.leaveSession(auth[1]);
assert.equal(manager.forChannel('group:one'), null);
assert.equal(events.at(-1).data.ended, true);
rejectsStatus(() => invoke('signal', 0, { callId, toId: 'b', type: 'ice', data: { candidate: '' } }), 409);
assert.equal(invoke('leave', 0, { callId }).ok, true, 'late leave cannot affect a newer call');

const bounded = new GroupCalls(manager.hooks, { maxParticipants: 2 });
bounded.execute('start', auth[0], { channel: 'group:one', connectionId: 1, withVideo: false });
const boundedId = bounded.forChannel('group:one').callId;
bounded.execute('join', auth[1], { channel: 'group:one', connectionId: 12, callId: boundedId });
connections.set(3, auth[2]);
rejectsStatus(() => bounded.execute('join', auth[2], { channel: 'group:one', connectionId: 3, callId: boundedId }), 409);
assert.equal(bounded.forChannel('group:one').participants[0].cameraOn, false);
bounded.leaveGroup(auth[0].id,'group:one');
assert.deepEqual(bounded.forChannel('group:one').participants.map(p=>p.id),['b'],'leaving a group removes its call participant while others continue');
bounded.leaveSession(auth[1]);
console.log('PASS: private group membership, device ownership, call capacity, negotiation roles, mute/camera state, late joins, creator leaving, history, reconnects and disconnect cleanup');

class FakeStream {
  constructor(tracks = []) { this.tracks = tracks; }
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter((track) => track.kind === 'video'); }
  addTrack(track) { this.tracks.push(track); }
}
class FakePeer {
  constructor() { this.signalingState = 'stable'; this.connectionState = 'new'; this.senders = []; this.candidates = []; }
  addTrack(track) { this.senders.push({ track, async replaceTrack(next) { this.track = next; } }); }
  getSenders() { return this.senders; }
  async createOffer() { return { type: 'offer', sdp: 'v=0\r\nm=audio\r\nm=video' }; }
  async createAnswer() { return { type: 'answer', sdp: 'v=0\r\nm=audio\r\nm=video' }; }
  async setLocalDescription(description) { this.localDescription = description; this.signalingState = description.type === 'offer' ? 'have-local-offer' : 'stable'; }
  async setRemoteDescription(description) { this.remoteDescription = description; this.signalingState = description.type === 'offer' ? 'have-remote-offer' : 'stable'; }
  async addIceCandidate(candidate) { assert.ok(this.remoteDescription, 'ICE requires a remote description'); this.candidates.push(candidate); }
  close() { this.closed = true; }
}
const network = [], sent = [], media = new Map();
const members = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
for (const { id } of members) media.set(id, new GroupCallMedia({
  userId: id, stream: new FakeStream([{ kind: 'audio', enabled: true }, { kind: 'video', id: `${id}-camera` }]),
  rtcConfig: {}, PeerConnection: FakePeer, createStream: () => new FakeStream(),
  send: async (toId, type, data) => { const signal = { fromId: id, toId, type, data }; sent.push(signal);network.push(signal); },
}));
await Promise.all([...media.values()].map((client) => client.sync(members)));
assert.equal(sent.filter((signal) => signal.type === 'offer').length, 3, 'one offer per participant pair prevents glare');
// Exercise candidates that arrive before their offer.
await media.get('b').handleSignal({ fromId: 'a', type: 'ice', data: { candidate: 'early-candidate' } });
while (network.length) { const signal = network.shift(); await media.get(signal.toId).handleSignal(signal); }
assert.equal(sent.filter((signal) => signal.type === 'answer').length, 3);
assert.equal(media.get('b').peers.get('a').pc.candidates.length, 1);
for (const client of media.values()) {
  assert.equal(client.peers.size, 2);
  for (const peer of client.peers.values()) assert.equal(peer.pc.signalingState, 'stable');
}
const remote = new FakeStream([{ kind: 'video' }]);
media.get('a').peers.get('b').pc.ontrack({ streams: [remote] });
assert.equal(media.get('a').peers.get('b').stream, remote);
const screen = { kind: 'video', id: 'screen' };
await media.get('a').replaceVideoTrack(screen);
for (const peer of media.get('a').peers.values()) assert.equal(peer.pc.getSenders()[1].track, screen);
await media.get('a').sync([...members, { id: 'd', name: 'D' }]);
assert.equal(media.get('a').peers.get('d').pc.getSenders()[1].track, screen, 'late arrivals see the current screen share');
const removed = media.get('a').peers.get('b');
await media.get('a').sync(members.filter((member) => member.id !== 'b'));
assert.equal(removed.pc.closed, true);
await media.get('a').handleSignal({ fromId: 'outsider', type: 'offer', data: { type: 'offer', sdp: 'v=0' } });
assert.equal(media.get('a').peers.has('outsider'), false);
const retryPeer=media.get('a').peers.get('c'), descriptions=[];
const setDescription=retryPeer.pc.setLocalDescription.bind(retryPeer.pc);
retryPeer.pc.setLocalDescription=async description=>{descriptions.push(description.type);await setDescription(description);};
retryPeer.pc.signalingState='have-local-offer';await media.get('a').offer(retryPeer,true);
assert.deepEqual(descriptions,['rollback','offer'],'retry can recover when the initial offer was not delivered');
for (const client of media.values()) { client.close(); assert.equal(client.peers.size, 0); }
console.log('PASS: three-person media mesh, deterministic offers/answers, queued ICE, remote streams, screen sharing for current/late participants, member removal and media cleanup');
