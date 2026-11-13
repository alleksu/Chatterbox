const ID_KEY = 'lanchat.id';
const NAME_KEY = 'lanchat.name';
const MAX_NAME = 24;

const els = {
  messages: document.getElementById('messages'),
  users: document.getElementById('users'),
  onlineCount: document.getElementById('online-count'),
  status: document.getElementById('status'),
  subtitle: document.getElementById('subtitle'),
  meName: document.getElementById('me-name'),
  composer: document.getElementById('composer'),
  input: document.getElementById('input'),
  send: document.getElementById('send'),
  nameDialog: document.getElementById('name-dialog'),
  nameForm: document.getElementById('name-form'),
  nameInput: document.getElementById('name-input'),
  changeName: document.getElementById('change-name'),
  copyLink: document.getElementById('copy-link'),
  toggleUsers: document.getElementById('toggle-users'),
  app: document.querySelector('.app'),
};

function getDeviceId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

const me = { id: getDeviceId(), name: localStorage.getItem(NAME_KEY) || '' };
let source = null;
let users = [];
const seenMessages = new Set();
let messageCount = 0;

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return `hsl(${hash} 62% 58%)`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setStatus(text, state) {
  els.status.textContent = text;
  els.status.className = `status ${state || ''}`.trim();
}

function isNearBottom() {
  const el = els.messages;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function showEmptyState() {
  if (messageCount > 0) return;
  const empty = document.createElement('div');
  empty.className = 'empty';
  const title = document.createElement('strong');
  title.textContent = 'This room is quiet';
  empty.append(title, 'Send the first message — everyone who opens this address on the same network will see it.');
  els.messages.replaceChildren(empty);
}

function appendMessage(message, { scroll = true } = {}) {
  if (seenMessages.has(message.id)) return;
  seenMessages.add(message.id);

  if (messageCount === 0) els.messages.replaceChildren();
  messageCount += 1;

  const row = document.createElement('div');
  row.className = message.userId === me.id ? 'msg mine' : 'msg';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = initials(message.name);
  avatar.style.background = avatarColor(message.name);

  const body = document.createElement('div');
  body.className = 'msg-body';

  const head = document.createElement('div');
  head.className = 'msg-head';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = message.userId === me.id ? `${message.name} (you)` : message.name;
  const time = document.createElement('span');
  time.textContent = formatTime(message.time);
  head.append(name, time);

  const text = document.createElement('div');
  text.className = 'msg-text';
  text.textContent = message.text;

  body.append(head, text);
  row.append(avatar, body);

  const stick = scroll && isNearBottom();
  els.messages.append(row);
  if (stick || messageCount === 1) scrollToBottom();

  els.subtitle.textContent = `${messageCount} message${messageCount === 1 ? '' : 's'} · last at ${formatTime(message.time)}`;
}

function renderUsers() {
  els.onlineCount.textContent = String(users.length);
  els.users.replaceChildren();

  for (const user of users) {
    const li = document.createElement('li');
    if (user.id === me.id) li.classList.add('is-me');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = initials(user.name);
    avatar.style.background = avatarColor(user.name);

    const label = document.createElement('span');
    label.textContent = user.name;

    li.append(avatar, label);

    if (user.id === me.id) {
      const you = document.createElement('span');
      you.className = 'you';
      you.textContent = 'you';
      li.append(you);
    }
    els.users.append(li);
  }
}

function connect() {
  if (source) source.close();
  setStatus('Connecting…', '');
  const params = new URLSearchParams({ id: me.id, name: me.name });
  source = new EventSource(`/events?${params}`);

  source.addEventListener('open', () => setStatus(`Connected · ${location.host}`, 'connected'));

  source.addEventListener('init', (event) => {
    const data = JSON.parse(event.data);
    seenMessages.clear();
    messageCount = 0;
    els.messages.replaceChildren();
    for (const message of data.history) appendMessage(message, { scroll: false });
    messageCount = data.history.length;
    if (messageCount === 0) showEmptyState();
    else scrollToBottom();
    users = data.users;
    renderUsers();
  });

  source.addEventListener('message', (event) => appendMessage(JSON.parse(event.data)));

  source.addEventListener('presence', (event) => {
    users = JSON.parse(event.data).users;
    renderUsers();
  });

  source.addEventListener('error', () => {
    setStatus('Disconnected — retrying…', 'offline');
  });
}

async function sendMessage() {
  const text = els.input.value.trim();
  if (!text) return;

  els.send.disabled = true;
  els.input.value = '';
  autoResize();

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: me.id, name: me.name, text }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server responded ${response.status}`);
    }
  } catch (error) {
    // Put the text back so nothing is lost, unless the user already typed a new draft.
    if (!els.input.value) {
      els.input.value = text;
      autoResize();
    }
    setStatus(`Send failed: ${error.message}`, 'offline');
  } finally {
    els.send.disabled = false;
    els.input.focus();
  }
}

function autoResize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 160)}px`;
}

els.composer.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage();
});

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  }
});

els.input.addEventListener('input', autoResize);

function askForName(firstTime) {
  els.nameInput.value = firstTime ? '' : me.name;
  els.nameDialog.hidden = false;
  els.nameInput.focus();
  els.nameInput.select();
}

els.nameForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = els.nameInput.value.trim().slice(0, MAX_NAME);
  if (!name) return;
  me.name = name;
  localStorage.setItem(NAME_KEY, name);
  els.meName.textContent = name;
  els.nameDialog.hidden = true;
  connect();
});

els.changeName.addEventListener('click', () => askForName(false));

els.copyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.origin);
    els.copyLink.textContent = 'Copied!';
  } catch {
    els.copyLink.textContent = location.host;
  }
  setTimeout(() => {
    els.copyLink.textContent = 'Copy link';
  }, 1600);
});

els.toggleUsers.addEventListener('click', () => els.app.classList.toggle('users-open'));

els.users.addEventListener('click', () => {
  if (window.matchMedia('(max-width: 720px)').matches) els.app.classList.remove('users-open');
});

if (me.name) {
  els.meName.textContent = me.name;
  els.nameDialog.hidden = true;
  showEmptyState();
  connect();
} else {
  askForName(true);
}
