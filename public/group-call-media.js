// One WebRTC connection per remote member; media stays peer-to-peer on the LAN.
export class GroupCallMedia {
  constructor({ userId, stream, rtcConfig, send, onChange = () => {},
    PeerConnection = globalThis.RTCPeerConnection, createStream = () => new MediaStream() }) {
    Object.assign(this, { userId, stream, rtcConfig, send, onChange, PeerConnection, createStream });
    this.videoTrack = stream.getVideoTracks()[0] || null;
    this.peers = new Map();
    this.members = new Map();
    this.closed = false;
  }

  enqueue(peer, operation) {
    peer.queue = peer.queue.then(async () => {
      if (!this.closed && this.peers.get(peer.id) === peer) await operation();
    }).catch(() => {
      if (!this.closed && this.peers.get(peer.id) === peer) {
        peer.state = 'reconnecting';
        this.onChange();
        this.scheduleRestart(peer);
      }
    });
    return peer.queue;
  }

  ensurePeer(member) {
    if (this.peers.has(member.id)) return this.peers.get(member.id);
    const pc = new this.PeerConnection(this.rtcConfig);
    const peer = { id: member.id, pc, stream: this.createStream(), state: 'connecting', ice: [], queue: Promise.resolve(), retries: 0, timer: null };
    this.peers.set(member.id, peer);
    for (const track of this.stream.getTracks()) {
      pc.addTrack(track.kind === 'video' ? this.videoTrack || track : track, this.stream);
    }
    pc.ontrack = (event) => {
      if (this.closed || this.peers.get(peer.id) !== peer) return;
      if (event.streams?.[0]) peer.stream = event.streams[0];
      else if (!peer.stream.getTracks().includes(event.track)) peer.stream.addTrack(event.track);
      this.onChange();
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && !this.closed) this.send(peer.id, 'ice', event.candidate).catch(() => {});
    };
    pc.onconnectionstatechange = () => {
      if (this.closed || this.peers.get(peer.id) !== peer) return;
      peer.state = pc.connectionState;
      if (pc.connectionState === 'connected') {
        peer.retries = 0;
        clearTimeout(peer.timer);
        peer.timer = null;
      } else if (['disconnected', 'failed'].includes(pc.connectionState)) this.scheduleRestart(peer);
      this.onChange();
    };
    return peer;
  }

  async offer(peer, restart = false) {
    if (restart && peer.pc.signalingState === 'have-local-offer') {
      await peer.pc.setLocalDescription({ type: 'rollback' });
    }
    if (peer.pc.signalingState !== 'stable') return;
    const description = await peer.pc.createOffer(restart ? { iceRestart: true } : undefined);
    await peer.pc.setLocalDescription(description);
    await this.send(peer.id, 'offer', peer.pc.localDescription);
  }

  scheduleRestart(peer) {
    if (this.closed || peer.timer || this.userId > peer.id || peer.pc.connectionState === 'connected') return;
    if (peer.retries >= 2) { peer.state = 'failed'; this.onChange(); return; }
    peer.timer = setTimeout(() => {
      peer.timer = null;
      peer.retries++;
      this.enqueue(peer, async () => {
        await this.offer(peer, true);
        this.scheduleRestart(peer);
      });
    }, 2600);
  }

  sync(participants) {
    if (this.closed) return Promise.resolve();
    this.members = new Map(participants.map((member) => [member.id, member]));
    for (const id of this.peers.keys()) if (!this.members.has(id)) this.removePeer(id);
    const operations = [];
    for (const member of participants) {
      if (member.id === this.userId || this.peers.has(member.id)) continue;
      const peer = this.ensurePeer(member);
      if (this.userId < member.id) operations.push(this.enqueue(peer, () => this.offer(peer)));
    }
    this.onChange();
    return Promise.all(operations);
  }

  handleSignal(signal) {
    if (this.closed || signal.fromId === this.userId || !this.members.has(signal.fromId)) return Promise.resolve();
    const peer = this.ensurePeer(this.members.get(signal.fromId));
    return this.enqueue(peer, async () => {
      if (signal.type === 'ice') {
        if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.data);
        else if (peer.ice.length < 128) peer.ice.push(signal.data);
        return;
      }
      if (!['offer', 'answer'].includes(signal.type)) return;
      if ((signal.type === 'offer' && this.userId < peer.id) || (signal.type === 'answer' && this.userId > peer.id)) return;
      await peer.pc.setRemoteDescription(signal.data);
      for (const candidate of peer.ice.splice(0)) await peer.pc.addIceCandidate(candidate);
      if (signal.type === 'offer') {
        await peer.pc.setLocalDescription(await peer.pc.createAnswer());
        await this.send(peer.id, 'answer', peer.pc.localDescription);
      }
    });
  }

  async replaceVideoTrack(track) {
    this.videoTrack = track;
    await Promise.all([...this.peers.values()].map((peer) =>
      peer.pc.getSenders().find((sender) => sender.track?.kind === 'video')?.replaceTrack(track)));
  }

  removePeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    clearTimeout(peer.timer);
    peer.pc.ontrack = peer.pc.onicecandidate = peer.pc.onconnectionstatechange = null;
    peer.pc.close();
  }

  close() {
    this.closed = true;
    for (const id of this.peers.keys()) this.removePeer(id);
    this.members.clear();
  }
}
