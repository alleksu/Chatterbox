import { GroupCallMedia } from '/group-call-media.js';
const bots = new Map(), resources = [];
let context, active, reported = false;
async function synthetic(name, video) {
  context ||= new AudioContext();
  await context.resume();
  const oscillator = context.createOscillator(), destination = context.createMediaStreamDestination();
  oscillator.frequency.value = name === 'Bob' ? 330 : 440;
  oscillator.connect(destination);oscillator.start();
  const stream = new MediaStream(destination.stream.getAudioTracks());
  let interval;
  if (video) {
    const canvas = document.createElement('canvas');canvas.width = 320;canvas.height = 240;
    const draw = () => { const ctx = canvas.getContext('2d');ctx.fillStyle = name === 'Bob' ? '#25574e' : name === 'Charlie' ? '#413e75' : '#345883';ctx.fillRect(0, 0, 320, 240);ctx.fillStyle = 'white';ctx.font = '24px sans-serif';ctx.fillText(name, 22, 110);ctx.font = '14px sans-serif';ctx.fillText(new Date().toLocaleTimeString(), 22, 145); };
    draw();interval = setInterval(draw, 100);
    stream.addTrack(canvas.captureStream(10).getVideoTracks()[0]);
  }
  resources.push(() => { clearInterval(interval);oscillator.stop();stream.getTracks().forEach((track) => track.stop()); });
  return stream;
}
Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: (constraints) => synthetic('Alice', constraints.video) });
Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: () => synthetic('Screen', true) });
const post = (route, body) => fetch('/fixture/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const report = document.createElement('div');report.id = 'fixture-status';report.setAttribute('role', 'status');
Object.assign(report.style, { position: 'fixed', top: '0', left: '0', zIndex: '100', background: '#143c29', color: '#fff', padding: '5px 12px', font: '12px system-ui' });
report.textContent = 'Synthetic media fixture — choose Group call check, then voice or video';document.body.append(report);
async function verify() {
  if (reported || bots.size !== 2 || [...bots.values()].some((bot) => bot.peers.size !== 2 || [...bot.peers.values()].some((peer) => peer.pc.connectionState !== 'connected'))) return;
  reported = true;
  const callId = active.callId;
  await new Promise((resolve) => setTimeout(resolve, 800));
  if (active?.callId !== callId) return;
  let audio = 0, video = 0;
  for (const bot of bots.values()) for (const peer of bot.peers.values()) {
    for (const entry of (await peer.pc.getStats()).values()) if (entry.type === 'inbound-rtp' && entry.bytesReceived > 0) {
      if (entry.kind === 'audio') audio++;
      if (entry.kind === 'video') video++;
    }
  }
  const passed = audio === 4 && (!active.withVideo || video === 4);
  const result = { passed, withVideo: active.withVideo, connectedPeerLinks: 6, inboundAudio: audio, inboundVideo: video };
  report.textContent = (passed ? 'PASS' : 'FAIL') + `: three-person ${active.withVideo ? 'video' : 'voice'} call; audio streams ${audio}/4` + (active.withVideo ? `; video streams ${video}/4` : '');
  await post('report', result);
}
const events = new EventSource('/fixture/events');
events.addEventListener('group-call', async (event) => {
  const snapshot = JSON.parse(event.data);
  active = snapshot;
  if (snapshot.reason === 'started') {
    reported = false;
    for (const [id, name] of [['b', 'Bob'], ['c', 'Charlie']]) {
      const stream = await synthetic(name, snapshot.withVideo);
      bots.set(id, new GroupCallMedia({ userId: id, stream, rtcConfig: { iceServers: [] },
        send: async (toId, type, data) => { const res = await post('signal', { actor: id, callId: snapshot.callId, toId, type, data });if (!res.ok) throw new Error('Fixture signal failed'); },
        onChange: () => { verify().catch((error) => { report.textContent = error.message; }); },
      }));
    }
    await Promise.all([...bots.keys()].map((actor) => post('join', { actor, callId: snapshot.callId })));
    return;
  }
  for (const [id, bot] of bots) if (snapshot.participants.some((p) => p.id === id)) bot.sync(snapshot.participants);
  if (snapshot.reason === 'left' && !snapshot.participants.some((p) => p.id === 'a') && snapshot.participants.length) {
    for (const actor of bots.keys()) await post('leave', { actor, callId: snapshot.callId });
  }
  if (snapshot.ended) {
    for (const bot of bots.values()) bot.close();bots.clear();
    for (const cleanup of resources.splice(0)) cleanup();
    active = null;
  }
});
events.addEventListener('peer-signal', (event) => {
  const signal = JSON.parse(event.data);bots.get(signal.recipient)?.handleSignal(signal);
});
window.addEventListener('pagehide', () => { for (const bot of bots.values()) bot.close();for (const cleanup of resources.splice(0)) cleanup();context?.close();events.close(); });
