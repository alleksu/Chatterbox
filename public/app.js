const ID_KEY = 'lanchat.id';
const NAME_KEY = 'lanchat.name';
const CHANNEL_KEY = 'lanchat.channel';
const MAX_NAME = 24;
const MAX_GROUP_NAME = 40;

const els = {
  messages: document.getElementById('messages'),
  users: document.getElementById('users'),
  channels: document.getElementById('channels'),
  onlineCount: document.getElementById('online-count'),
  status: document.getElementById('status'),
  subtitle: document.getElementById('subtitle'),
  meName: document.getElementById('me-name'),
  composer: document.getElementById('composer'),
  input: document.getElementById('input'),
  send: document.getElementById('send'),
  roomTitle: document.getElementById('room-title'),
  roomIcon: document.getElementById('room-icon'),
  nameDialog: document.getElementById('name-dialog'),
  nameForm: document.getElementById('name-form'),
  nameInput: document.getElementById('name-input'),
  changeName: document.getElementById('change-name'),
  copyLink: document.getElementById('copy-link'),
  toggleMenu: document.getElementById('toggle-menu'),
  toggleMembers: document.getElementById('toggle-members'),
  newGroup: document.getElementById('new-group'),
  groupDialog: document.getElementById('group-dialog'),
  groupForm: document.getElementById('group-form'),
  groupName: document.getElementById('group-name'),
  groupMembers: document.getElementById('group-members'),
  groupError: document.getElementById('group-error'),
  groupCancel: document.getElementById('group-cancel'),
  scrim: document.getElementById('scrim'),
  app: document.getElementById('app'),
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
let conversations = [];
let activeId = localStorage.getItem(CHANNEL_KEY) || 'general';
let renderedId = null;
let renderedCount = -1;
let renderedLastId = null;

function initials(name) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return `hsl(${hash} 68% 64%)`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setStatus(text, state) {
  els.status.textContent = text;
  els.status.className = `status ${state || ''}`.trim();
}

function dmChannelId(userA, userB) {
  return `dm:${[userA, userB].sort().map(encodeURIComponent).join(':')}`;
}

function getConversation(id) {
  return conversations.find((conversation) => conversation.id === id);
}

function isNearBottom() {
  const el = els.messages;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

function showEmptyState(conversation) {
  const empty = document.createElement('div');
  empty.className = 'empty';

  const logo = document.createElement('img');
  logo.src = '/logo.svg';
  logo.alt = '';

  const title = document.createElement('strong');

  if (!conversation || conversation.type === 'general') {
    title.textContent = 'Welcome to Chatterbox';
    empty.append(
      logo,
      title,
      'Send the first message — everyone who opens this address on the same network will see it instantly.',
    );
  } else if (conversation.type === 'dm') {
    title.textContent = `Chat with ${conversation.name}`;
    empty.append(
      logo,
      title,
      'This is a private conversation. Only the two of you can see these messages.',
    );
  } else {
    title.textContent = conversation.name;
    empty.append(
      logo,
      title,
      `This is the start of the group chat with ${conversation.members?.length || 0} members.`,
    );
  }

  els.messages.replaceChildren(empty);
}

function appendMessageRow(message, { scroll = true } = {}) {
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
  if (stick) scrollToBottom();
}

function updateHeader(conversation) {
  if (!conversation) {
    els.roomTitle.textContent = 'General';
    els.roomIcon.textContent = '#';
    els.roomIcon.className = 'room-icon';
    els.roomIcon.style.background = '';
    els.subtitle.textContent = 'No messages yet';
    els.input.placeholder = 'Message the room…';
    return;
  }

  els.roomTitle.textContent = conversation.name;
  els.roomIcon.className = `room-icon ${conversation.type === 'dm' ? 'dm' : conversation.type}`;

  if (conversation.type === 'dm') {
    els.roomIcon.textContent = initials(conversation.name);
    els.roomIcon.style.background = avatarColor(conversation.name);
  } else {
    els.roomIcon.textContent = '#';
    els.roomIcon.style.background = '';
  }

  if (conversation.type === 'general') {
    els.input.placeholder = 'Message the room…';
  } else if (conversation.type === 'dm') {
    els.input.placeholder = `Message ${conversation.name} privately…`;
  } else {
    els.input.placeholder = `Message ${conversation.name}…`;
  }

  const history = conversation.history || [];
  if (history.length === 0) {
    els.subtitle.textContent = conversation.type === 'dm'
      ? 'Private conversation'
      : conversation.type === 'group'
        ? `${conversation.members?.length || 0} members`
        : 'No messages yet';
  } else {
    const last = history[history.length - 1];
    els.subtitle.textContent = `${history.length} message${history.length === 1 ? '' : 's'} · last at ${formatTime(last.time)}`;
  }
}

function renderActiveConversation() {
  const conversation = getConversation(activeId) || conversations[0];

  if (!conversation) {
    renderedId = null;
    renderedCount = -1;
    renderedLastId = null;
    updateHeader(null);
    showEmptyState(null);
    return;
  }

  if (conversation.id !== activeId) {
    activeId = conversation.id;
    localStorage.setItem(CHANNEL_KEY, activeId);
  }

  updateHeader(conversation);
  if (conversation.unread) {
    conversation.unread = 0;
    renderChannels();
  }

  const history = conversation.history || [];
  const lastId = history.length ? history[history.length - 1].id : null;
  if (conversation.id === renderedId && history.length === renderedCount && lastId === renderedLastId) return;

  renderedId = conversation.id;
  renderedCount = history.length;
  renderedLastId = lastId;

  els.messages.replaceChildren();
  if (history.length === 0) {
    showEmptyState(conversation);
    return;
  }

  for (const message of history) appendMessageRow(message, { scroll: false });
  scrollToBottom();
}

function renderChannels() {
  els.channels.replaceChildren();

  for (const conversation of conversations) {
    const li = document.createElement('li');
    li.className = 'channel';
    if (conversation.id === activeId) li.classList.add('active');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.title = conversation.name;

    const icon = document.createElement('div');
    icon.className = 'avatar channel-avatar';
    if (conversation.type === 'dm') {
      icon.textContent = initials(conversation.name);
      icon.style.background = avatarColor(conversation.name);
      icon.classList.add('dm');
    } else if (conversation.type === 'group') {
      icon.textContent = '#';
      icon.classList.add('group');
      icon.style.background = avatarColor(conversation.name);
    } else {
      icon.textContent = '#';
      icon.classList.add('room');
    }

    const label = document.createElement('span');
    label.className = 'channel-name';
    label.textContent = conversation.name;

    li.append(icon, label);

    if (conversation.unread) {
      const badge = document.createElement('span');
      badge.className = 'unread';
      badge.textContent = conversation.unread > 99 ? '99+' : String(conversation.unread);
      li.append(badge);
    } else if (conversation.type === 'group') {
      const count = document.createElement('span');
      count.className = 'tag';
      count.textContent = String(conversation.members?.length || 0);
      li.append(count);
    }

    const activate = () => setActive(conversation.id);
    li.addEventListener('click', activate);
    li.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });

    els.channels.append(li);
  }
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
    } else {
      li.classList.add('clickable');
      li.title = `Send ${user.name} a private message`;
      li.addEventListener('click', () => openDm(user));
    }

    els.users.append(li);
  }
}

function setActive(id) {
  const conversation = getConversation(id);
  if (!conversation) return;
  activeId = id;
  conversation.unread = 0;
  localStorage.setItem(CHANNEL_KEY, activeId);
  renderChannels();
  renderActiveConversation();
  els.app.classList.remove('sidebar-open', 'members-open');
  els.input.focus();
}

function openDm(peer) {
  if (!peer || peer.id === me.id) return;
  const id = dmChannelId(me.id, peer.id);
  if (!getConversation(id)) {
    conversations.push({
      id,
      type: 'dm',
      name: peer.name,
      peerId: peer.id,
      history: [],
      unread: 0,
      lastTime: Date.now(),
    });
  }
  setActive(id);
}

function conversationFromMessage(message) {
  if (typeof message.channel === 'string' && message.channel.startsWith('dm:')) {
    const pair = message.channel
      .slice(3)
      .split(':')
      .map((part) => {
        try {
          return decodeURIComponent(part);
        } catch {
          return '';
        }
      });
    const peerId = pair.find((id) => id && id !== me.id) || message.userId;
    const peerName = peerId === message.userId
      ? message.name
      : users.find((user) => user.id === peerId)?.name || 'Unknown device';
    return {
      id: message.channel,
      type: 'dm',
      name: peerName,
      peerId,
      history: [],
      unread: 0,
      lastTime: message.time,
    };
  }

  return {
    id: message.channel || 'general',
    type: message.channel?.startsWith('group:') ? 'group' : 'general',
    name: message.channel?.startsWith('group:') ? 'Group' : 'General',
    groupId: message.channel?.startsWith('group:') ? message.channel.slice(6) : undefined,
    members: [],
    history: [],
    unread: 0,
    lastTime: message.time,
  };
}

function addMessage(message) {
  if (!message || !message.channel) return;

  let conversation = getConversation(message.channel);
  if (!conversation) {
    conversation = conversationFromMessage(message);
    conversations.push(conversation);
    renderChannels();
  }

  if (!conversation.history) conversation.history = [];
  if (conversation.history.some((entry) => entry.id === message.id)) return;

  conversation.history.push(message);
  let trimmed = false;
  if (conversation.history.length > 200) {
    conversation.history.splice(0, conversation.history.length - 200);
    trimmed = true;
  }
  conversation.lastTime = message.time;

  if (conversation.id === activeId) {
    if (els.messages.querySelector('.empty')) els.messages.replaceChildren();
    appendMessageRow(message);
    if (trimmed) els.messages.querySelector('.msg')?.remove();
    renderedId = conversation.id;
    renderedCount = conversation.history.length;
    renderedLastId = message.id;
    updateHeader(conversation);
  } else {
    conversation.unread = (conversation.unread || 0) + 1;
    renderChannels();
  }
}

function applyConversations(incoming) {
  const existing = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const seenIds = new Set();
  const merged = [];

  for (const conversation of incoming || []) {
    if (!conversation || !conversation.id || seenIds.has(conversation.id)) continue;
    seenIds.add(conversation.id);
    merged.push({
      ...conversation,
      history: Array.isArray(conversation.history) ? conversation.history : [],
      unread: existing.get(conversation.id)?.unread || 0,
    });
  }

  for (const conversation of conversations) {
    if (conversation.type === 'dm' && !seenIds.has(conversation.id)) merged.push(conversation);
  }

  conversations = merged;

  if (!getConversation(activeId) && conversations.length) {
    activeId = conversations[0].id;
    localStorage.setItem(CHANNEL_KEY, activeId);
  }

  renderChannels();
  renderActiveConversation();
}

function connect() {
  if (source) source.close();
  setStatus('Connecting…', '');
  renderedId = null;
  renderedCount = -1;
  renderedLastId = null;
  const params = new URLSearchParams({ id: me.id, name: me.name });
  source = new EventSource(`/events?${params}`);

  source.addEventListener('open', () => setStatus(`Connected · ${location.host}`, 'connected'));

  source.addEventListener('init', (event) => {
    const data = JSON.parse(event.data);
    users = data.users;
    renderUsers();
    applyConversations(data.conversations);
  });

  source.addEventListener('conversations', (event) => {
    applyConversations(JSON.parse(event.data).conversations);
  });

  source.addEventListener('message', (event) => addMessage(JSON.parse(event.data)));

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
  const conversation = getConversation(activeId);
  if (!text || !conversation) return;

  els.send.disabled = true;
  els.input.value = '';
  autoResize();

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: me.id, name: me.name, text, channel: conversation.id }),
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

function openGroupDialog() {
  els.groupName.value = '';
  els.groupError.hidden = true;
  els.groupMembers.replaceChildren();

  const others = users.filter((user) => user.id !== me.id);
  if (others.length === 0) {
    const li = document.createElement('li');
    li.className = 'member-empty';
    li.textContent = 'No other devices are online yet. Invite someone first!';
    els.groupMembers.append(li);
  }

  for (const user of others) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    label.className = 'member';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = user.id;

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = initials(user.name);
    avatar.style.background = avatarColor(user.name);

    const name = document.createElement('span');
    name.textContent = user.name;

    label.append(checkbox, avatar, name);
    li.append(label);
    els.groupMembers.append(li);
  }

  els.groupDialog.hidden = false;
  els.groupName.focus();
}

async function createGroup(event) {
  event.preventDefault();
  const nameValue = els.groupName.value.trim().slice(0, MAX_GROUP_NAME);
  const members = [...els.groupMembers.querySelectorAll('input:checked')].map((input) => input.value);
  if (!nameValue || members.length === 0) {
    els.groupError.textContent = members.length === 0 ? 'Pick at least one person to join the group.' : 'Give the group a name.';
    els.groupError.hidden = false;
    return;
  }
  els.groupError.hidden = true;

  const submit = els.groupForm.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const response = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: me.id, name: me.name, nameValue, members }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Server responded ${response.status}`);

    els.groupDialog.hidden = true;

    if (!getConversation(data.group.channel)) {
      conversations.push({
        id: data.group.channel,
        type: 'group',
        name: data.group.name,
        groupId: data.group.id,
        members: [
          { id: me.id, name: me.name },
          ...members.map((id) => ({ id, name: users.find((user) => user.id === id)?.name || 'Unknown device' })),
        ],
        history: [],
        unread: 0,
        lastTime: Date.now(),
      });
      renderChannels();
    }

    setActive(data.group.channel);
  } catch (error) {
    setStatus(`Could not create group: ${error.message}`, 'offline');
  } finally {
    submit.disabled = false;
  }
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

els.toggleMenu.addEventListener('click', () => {
  const open = !els.app.classList.contains('sidebar-open');
  els.app.classList.remove('members-open');
  els.app.classList.toggle('sidebar-open', open);
});

els.toggleMembers.addEventListener('click', () => {
  const open = !els.app.classList.contains('members-open');
  els.app.classList.remove('sidebar-open');
  els.app.classList.toggle('members-open', open);
});

els.scrim.addEventListener('click', () => els.app.classList.remove('sidebar-open', 'members-open'));

els.newGroup.addEventListener('click', openGroupDialog);
els.groupCancel.addEventListener('click', () => {
  els.groupDialog.hidden = true;
});
els.groupForm.addEventListener('submit', createGroup);
els.groupDialog.addEventListener('click', (event) => {
  if (event.target === els.groupDialog) els.groupDialog.hidden = true;
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.groupDialog.hidden) els.groupDialog.hidden = true;
});

renderChannels();

if (me.name) {
  els.meName.textContent = me.name;
  els.nameDialog.hidden = true;
  showEmptyState(getConversation(activeId));
  connect();
} else {
  askForName(true);
}
