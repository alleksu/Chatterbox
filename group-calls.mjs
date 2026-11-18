import { randomUUID } from 'node:crypto';

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

export class GroupCalls {
  constructor(hooks, { maxParticipants = 8, disconnectGraceMs = 10000, now = Date.now } = {}) {
    Object.assign(this, { hooks, maxParticipants, disconnectGraceMs, now });
    this.active = new Map();
    this.history = new Map();
  }

  summary(call) {
    return {
      callId: call.callId, channel: call.channel, name: call.name,
      fromId: call.fromId, fromName: call.fromName, withVideo: call.withVideo,
      createdAt: call.createdAt, maxParticipants: this.maxParticipants,
      participants: [...call.participants.values()].map((p) => ({
        id: p.id, name: p.name, connectionId: p.connectionId, muted: p.muted, cameraOn: p.cameraOn,
      })),
    };
  }

  forChannel(channel) {
    const call = this.active.get(channel);
    return call ? this.summary(call) : null;
  }

  historyFor(userId) {
    return (this.history.get(userId) || []).map((entry) => {
      const call = this.active.get(entry.channel);
      const participant = call?.callId === entry.callId ? call.participants.get(userId) : null;
      const elapsed = participant && call.answeredAt
        ? Math.max(0, Math.round((this.now() - Math.max(participant.joinedAt, call.answeredAt)) / 1000)) : 0;
      return { ...entry, duration: entry.duration + elapsed };
    });
  }

  publish(call, reason) {
    this.hooks.broadcast(call.channel, { ...this.summary(call), reason, ended: call.participants.size === 0 });
  }

  recordJoin(call, participant) {
    let entries = this.history.get(participant.id);
    if (!entries) this.history.set(participant.id, entries = []);
    let entry = entries.find((item) => item.callId === call.callId);
    if (!entry) {
      entry = {
        kind: 'group', callId: call.callId, channel: call.channel, peerName: call.name,
        direction: call.fromId === participant.id ? 'outgoing' : 'incoming', withVideo: call.withVideo,
        createdAt: call.createdAt, answeredAt: 0, endedAt: 0, duration: 0, state: 'ringing',
      };
      entries.unshift(entry);
      entries.splice(50);
    }
    entry.endedAt = 0;
    if (call.participants.size >= 2 && !call.answeredAt) call.answeredAt = this.now();
    for (const p of call.participants.values()) {
      const item = this.history.get(p.id)?.find((record) => record.callId === call.callId);
      if (item && call.answeredAt) {
        item.answeredAt ||= Math.max(p.joinedAt, call.answeredAt);
        item.state = 'active';
      }
    }
    this.hooks.historyChanged([...call.participants.keys()]);
  }

  addParticipant(call, auth, connectionId) {
    const previous = call.participants.get(auth.id);
    if (previous) {
      if (previous.connectionId !== connectionId &&
          (previous.sessionId !== auth.sessionId || this.hooks.isConnected(previous.connectionId))) {
        fail(409, 'You already joined this call on another tab or device.');
      }
      clearTimeout(previous.disconnectTimer);
      previous.connectionId = connectionId;
      return;
    }
    for (const other of this.active.values()) {
      if (other !== call && other.participants.has(auth.id)) fail(409, 'Leave your other group call first.');
    }
    if (call.participants.size >= this.maxParticipants) fail(409, `This call is full (${this.maxParticipants} people).`);
    const participant = {
      id: auth.id, name: auth.name, sessionId: auth.sessionId, connectionId,
      joinedAt: this.now(), muted: false, cameraOn: call.withVideo, disconnectTimer: null,
    };
    call.participants.set(auth.id, participant);
    this.recordJoin(call, participant);
  }

  execute(action, auth, body) {
    const channel = typeof body.channel === 'string' ? body.channel : '';
    const group = this.hooks.getGroup(channel);
    if (!group || !group.members.has(auth.id)) fail(403, 'Only group members can access this call.');
    const connectionId = body.connectionId;
    if (!Number.isSafeInteger(connectionId) || connectionId < 1) fail(400, 'Reconnect to Chatterbox before joining a call.');
    if (action !== 'leave' && !this.hooks.ownsConnection(auth, connectionId)) fail(409, 'Reconnect to Chatterbox before joining a call.');
    let call = this.active.get(channel);
    if (action === 'start') {
      if (call) fail(409, 'A call is already running in this group. Join that call instead.');
      if (typeof body.withVideo !== 'boolean') fail(400, 'Choose a voice or video call.');
      call = {
        callId: randomUUID(), channel, name: group.name, fromId: auth.id, fromName: auth.name,
        withVideo: body.withVideo, createdAt: this.now(), answeredAt: 0, participants: new Map(),
      };
      this.addParticipant(call, auth, connectionId);
      this.active.set(channel, call);
      this.publish(call, 'started');
      return { ok: true, call: this.summary(call) };
    }
    if (!call || call.callId !== body.callId) {
      if (action === 'leave') return { ok: true };
      fail(409, 'This group call has ended.');
    }
    if (action === 'join') {
      this.addParticipant(call, auth, connectionId);
      this.publish(call, 'joined');
      return { ok: true, call: this.summary(call) };
    }
    const participant = call.participants.get(auth.id);
    if (!participant || participant.connectionId !== connectionId || participant.sessionId !== auth.sessionId) {
      fail(403, 'Join this call on this device first.');
    }
    if (action === 'leave') {
      this.removeParticipant(call, auth.id);
      return { ok: true };
    }
    if (action === 'update') {
      if (typeof body.muted === 'boolean') participant.muted = body.muted;
      if (typeof body.cameraOn === 'boolean' && call.withVideo) participant.cameraOn = body.cameraOn;
      this.publish(call, 'updated');
      return { ok: true };
    }
    if (action === 'signal') {
      const recipient = call.participants.get(body.toId);
      if (!recipient || recipient.id === auth.id) fail(403, 'The recipient must be another participant in this group call.');
      if (!this.hooks.isConnected(recipient.connectionId)) fail(409, 'That participant is reconnecting.');
      const { type, data } = body;
      if (!['offer', 'answer', 'ice'].includes(type)) fail(400, 'Unknown group call signal.');
      if (type === 'ice') {
        if (!data || typeof data.candidate !== 'string' || data.candidate.length > 4096) fail(400, 'Invalid ICE candidate.');
      } else if (!data || data.type !== type || typeof data.sdp !== 'string' || !data.sdp.startsWith('v=0')) {
        fail(400, 'Invalid session description.');
      }
      if ((type === 'offer' && auth.id > recipient.id) || (type === 'answer' && auth.id < recipient.id)) {
        fail(403, 'Invalid negotiation role for this participant pair.');
      }
      this.hooks.send(recipient.connectionId, 'group-signal', {
        channel, callId: call.callId, fromId: auth.id, toId: recipient.id, type, data,
      });
      return { ok: true };
    }
    fail(400, 'Unknown group call action.');
  }

  removeParticipant(call, userId) {
    const participant = call.participants.get(userId);
    if (!participant) return;
    clearTimeout(participant.disconnectTimer);
    const entry = this.history.get(userId)?.find((item) => item.callId === call.callId);
    if (entry) {
      if (call.answeredAt) entry.duration += Math.max(0, Math.round((this.now() - Math.max(participant.joinedAt, call.answeredAt)) / 1000));
      entry.state = 'ended';
      entry.endedAt = this.now();
    }
    call.participants.delete(userId);
    if (!call.participants.size) this.active.delete(call.channel);
    this.publish(call, 'left');
    this.hooks.historyChanged([userId]);
  }

  disconnect(connectionId) {
    for (const call of this.active.values()) for (const participant of call.participants.values()) {
      if (participant.connectionId !== connectionId) continue;
      clearTimeout(participant.disconnectTimer);
      participant.disconnectTimer = setTimeout(() => {
        if (participant.connectionId === connectionId && !this.hooks.isConnected(connectionId)) this.removeParticipant(call, participant.id);
      }, this.disconnectGraceMs).unref();
    }
  }

  reconnect(auth, connectionId) {
    for (const call of this.active.values()) {
      const participant = call.participants.get(auth.id);
      if (participant?.sessionId === auth.sessionId && !this.hooks.isConnected(participant.connectionId)) {
        clearTimeout(participant.disconnectTimer);
        participant.connectionId = connectionId;
      }
    }
  }

  leaveSession(auth) {
    for (const call of this.active.values()) {
      if (call.participants.get(auth.id)?.sessionId === auth.sessionId) this.removeParticipant(call, auth.id);
    }
  }

  leaveGroup(userId, channel) {
    const call = this.active.get(channel);
    if (call) this.removeParticipant(call, userId);
  }
}
