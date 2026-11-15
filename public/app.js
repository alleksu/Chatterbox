const ID_KEY = 'lanchat.id';
const NAME_KEY = 'lanchat.name';
const CHANNEL_KEY = 'lanchat.channel';
const SEEN_KEY = 'lanchat.seen';
const THEME_KEY = 'lanchat.theme';
const SOUND_KEY = 'lanchat.sound';
const NOTIFY_KEY = 'lanchat.notify';

let MAX_NAME = 24;
let MAX_GROUP_NAME = 40;
let MAX_TEXT = 4000;

const ICONS = {
  react: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.4a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
  reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 4 12l5-5"/><path d="M4 12h9a7 7 0 0 1 7 7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M7 10l5 5 5-5M5 19h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀', '✅', '🙏'];
const REACTION_MAX = 10;

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
  attach: document.getElementById('attach'),
  fileInput: document.getElementById('file-input'),
  roomTitle: document.getElementById('room-title'),
  roomIcon: document.getElementById('room-icon'),
  nameDialog: document.getElementById('name-dialog'),
  nameForm: document.getElementById('name-form'),
  nameInput: document.getElementById('name-input'),
  changeName: document.getElementById('change-name'),
  copyLink: document.getElementById('copy-link'),
  toggleMenu: document.getElementById('toggle-menu'),
  toggleMembers: document.getElementById('toggle-members'),
  toggleTheme: document.getElementById('toggle-theme'),
  toggleSearch: document.getElementById('toggle-search'),
  toggleSound: document.getElementById('toggle-sound'),
  toggleNotify: document.getElementById('toggle-notify'),
  newGroup: document.getElementById('new-group'),
  groupDialog: document.getElementById('group-dialog'),
  groupForm: document.getElementById('group-form'),
  groupName: document.getElementById('group-name'),
  groupMembers: document.getElementById('group-members'),
  groupError: document.getElementById('group-error'),
  groupCancel: document.getElementById('group-cancel'),
  scrim: document.getElementById('scrim'),
  app: document.getElementById('app'),
  searchbar: document.getElementById('searchbar'),
  searchInput: document.getElementById('search-input'),
  searchCount: document.getElementById('search-count'),
  searchClose: document.getElementById('search-close'),
  scrollBottom: document.getElementById('scroll-bottom'),
  jumpBadge: document.getElementById('jump-badge'),
  banner: document.getElementById('composer-banner'),
  bannerIcon: document.getElementById('banner-icon'),
  bannerTitle: document.getElementById('banner-title'),
  bannerText: document.getElementById('banner-text'),
  bannerCancel: document.getElementById('banner-cancel'),
  toast: document.getElementById('toast'),
  callButtons: document.getElementById('call-buttons'),
  callAudioBtn: document.getElementById('call-audio'),
  callVideoBtn: document.getElementById('call-video'),
  callOverlay: document.getElementById('call-overlay'),
  callRemoteVideo: document.getElementById('call-remote-video'),
  callRemoteAudio: document.getElementById('call-remote-audio'),
  callLocalVideo: document.getElementById('call-local-video'),
  callAvatar: document.getElementById('call-avatar'),
  callPeerName: document.getElementById('call-peer-name'),
  callStatus: document.getElementById('call-status'),
  callTimer: document.getElementById('call-timer'),
  callMute: document.getElementById('call-mute'),
  callAccept: document.getElementById('call-accept'),
  callDecline: document.getElementById('call-decline'),
  callHangup: document.getElementById('call-hangup'),
};

function getDeviceId() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

const me = { id: getDeviceId(), name: localStorage.getItem(NAME_KEY) || '' };
const settings = {
  theme: localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',
  sound: localStorage.getItem(SOUND_KEY) !== '0',
  notify: localStorage.getItem(NOTIFY_KEY) === '1',
};

let source = null;
let users = [];
let conversations = [];
let seen = loadSeen();
let activeId = localStorage.getItem(CHANNEL_KEY) || 'general';
let typingByChannel = new Map();
let replyTo = null;
let editingId = null;
let searchQuery = '';
let uploadInProgress = false;
let jumpCount = 0;
const sentReads = new Set();

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name) {
  let hash = 0;
  for (const char of String(name || '')) hash = (hash * 31 + char.codePointAt(0)) % 360;
  return `hsl(${hash} 68% 64%)`;
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDay(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1)} ${units[unit]}`;
}

function fileExtension(name) {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name || '');
  return match ? match[1].toUpperCase() : 'FILE';
}

function linkify(text) {
  const fragment = document.createDocumentFragment();
  const pattern = /(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index));
    const link = make('a', 'msg-link', match[0]);
    link.href = match[0];
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    fragment.append(link);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
  return fragment;
}

function toast(text, kind) {
  els.toast.textContent = text;
  els.toast.className = `toast ${kind || ''}`.trim();
  els.toast.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.hidden = true;
  }, 2600);
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

function activeConversation() {
  return getConversation(activeId) || null;
}

function isNearBottom() {
  const el = els.messages;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
  jumpCount = 0;
  updateJumpBadge();
}

function updateJumpBadge() {
  if (jumpCount > 0) {
    els.jumpBadge.textContent = jumpCount > 9 ? '9+' : String(jumpCount);
    els.jumpBadge.hidden = false;
  } else {
    els.jumpBadge.hidden = true;
  }
}

function updateScrollButton() {
  els.scrollBottom.hidden = isNearBottom();
  updateJumpBadge();
}

function saveSeen() {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Storage may be full or unavailable.
  }
}

function markSeen(conversation) {
  if (!conversation) return;
  const history = conversation.history || [];
  if (history.length === 0) return;
  const last = history[history.length - 1].time;
  if (last > (seen[conversation.id] || 0)) {
    seen[conversation.id] = last;
    saveSeen();
    updateTitle();
  }
}

function unreadCount(conversation) {
  if (!conversation || conversation.id === activeId) return 0;
  const since = seen[conversation.id] || 0;
  return (conversation.history || []).filter((message) => message.userId !== me.id && message.time > since).length;
}

function totalUnread() {
  return conversations.reduce((total, conversation) => total + unreadCount(conversation), 0);
}

function updateTitle() {
  const count = totalUnread();
  document.title = count > 0 ? `(${count}) Chatterbox` : 'Chatterbox';
}

/* ---------- Header ---------- */

function baseSubtitle(conversation) {
  if (!conversation) return 'No messages yet';
  if (conversation.type === 'dm') {
    const peer = users.find((user) => user.id === conversation.peerId);
    return peer ? 'Online now' : 'Offline';
  }
  if (conversation.type === 'group') {
    return `${conversation.members?.length || 0} member${conversation.members?.length === 1 ? '' : 's'}`;
  }
  const online = users.length;
  return `${online} online · ${conversation.history?.length || 0} message${conversation.history?.length === 1 ? '' : 's'}`;
}

function updateHeader(conversation) {
  if (!conversation) {
    els.roomTitle.textContent = 'General';
    els.roomIcon.textContent = '#';
    els.roomIcon.className = 'room-icon';
    els.roomIcon.style.background = '';
    els.subtitle.textContent = 'No messages yet';
    els.input.placeholder = 'Message the room…';
    updateCallButtons(null);
    return;
  }

  updateCallButtons(conversation);
  els.roomTitle.textContent = conversation.name;
  els.roomIcon.className = `room-icon ${conversation.type}`;

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

  els.subtitle.textContent = baseSubtitle(conversation);
}

/* ---------- Message rendering ---------- */

function messagePreview(message) {
  if (!message) return 'No messages yet';
  if (message.kind === 'file') return `📎 ${message.file?.name || 'Attachment'}`;
  return message.text || '';
}

function emptyState(conversation) {
  const empty = make('div', 'empty');
  const logo = make('img');
  logo.src = '/logo.svg';
  logo.alt = '';
  const title = make('strong');
  if (!conversation || conversation.type === 'general') {
    title.textContent = 'Welcome to Chatterbox';
    empty.append(
      logo,
      title,
      'Send the first message — everyone who opens this address on the same network will see it instantly.',
    );
  } else if (conversation.type === 'dm') {
    title.textContent = `Chat with ${conversation.name}`;
    empty.append(logo, title, 'This is a private conversation. Only the two of you can see these messages.');
  } else {
    title.textContent = conversation.name;
    empty.append(logo, title, `This is the start of the group chat with ${conversation.members?.length || 0} members.`);
  }
  return empty;
}

function daySeparator(label) {
  return make('div', 'day-separator', label);
}

function buildReplyQuote(message) {
  const quote = make('button', 'reply-quote');
  quote.type = 'button';
  const name = make('span', 'reply-name', message.replyTo.name);
  const text = make('span', 'reply-text', message.replyTo.text);
  quote.append(name, text);
  quote.addEventListener('click', () => jumpTo(message.replyTo.id));
  return quote;
}

function fileUrl(file, inline) {
  return `/api/files/${encodeURIComponent(file.id)}?id=${encodeURIComponent(me.id)}${inline ? '&inline=1' : ''}`;
}

function buildFileBubble(message) {
  const file = message.file;
  const wrap = make('div', 'file-msg');
  const isImage = typeof file.type === 'string' && file.type.startsWith('image/');

  if (isImage) {
    wrap.classList.add('has-preview');
    const img = make('img', 'file-preview');
    img.loading = 'lazy';
    img.alt = file.name;
    img.src = fileUrl(file, true);
    img.addEventListener('click', () => window.open(fileUrl(file, true), '_blank', 'noopener'));
    wrap.append(img);
  }

  const row = make('div', 'file-row');
  const icon = make('div', 'file-icon', fileExtension(file.name));
  const meta = make('div', 'file-meta');
  const name = make('span', 'file-name', file.name);
  name.title = file.name;
  const size = make('span', 'file-size', humanFileSize(file.size));
  meta.append(name, size);

  const download = make('a', 'file-download');
  download.href = fileUrl(file, false);
  download.download = file.name;
  download.innerHTML = `${ICONS.download}<span>Save</span>`;

  row.append(icon, meta, download);
  wrap.append(row);
  return wrap;
}

function statusText(message, conversation) {
  if (message.userId !== me.id || !conversation) return '';
  const readBy = (message.readBy || []).filter((id) => id !== me.id);
  if (conversation.type === 'dm') return readBy.includes(conversation.peerId) ? '✓✓ seen' : '✓';
  if (conversation.type === 'group') return readBy.length ? `✓✓ ${readBy.length}` : '✓';
  return '';
}

function buildReactionChips(message, conversation) {
  const entries = Object.entries(message.reactions || {});
  if (entries.length === 0) return null;
  const wrap = make('div', 'msg-reactions');
  for (const [emoji, ids] of entries) {
    if (!ids || ids.length === 0) continue;
    const chip = make('button', 'reaction-chip');
    chip.type = 'button';
    chip.append(make('span', 'reaction-emoji', emoji), make('span', 'reaction-count', String(ids.length)));
    if (ids.includes(me.id)) chip.classList.add('active');
    chip.title = ids.length === 1 ? '1 reaction' : `${ids.length} reactions`;
    chip.addEventListener('click', () => toggleReaction(message, conversation, emoji));
    wrap.append(chip);
  }
  return wrap.children.length ? wrap : null;
}

function actionButton(icon, title, handler) {
  const button = make('button', 'msg-action');
  button.type = 'button';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = icon;
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
}

function openReactionPicker(row, message, conversation) {
  document.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());
  const picker = make('div', 'reaction-picker');
  for (const emoji of REACTION_EMOJIS) {
    const button = make('button', 'reaction-option', emoji);
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      picker.remove();
      toggleReaction(message, conversation, emoji);
    });
    picker.append(button);
  }
  picker.addEventListener('click', (event) => event.stopPropagation());
  row.append(picker);
}

function buildMessageRow(message, conversation, previous) {
  const mine = message.userId === me.id;
  const grouped =
    previous &&
    previous.userId === message.userId &&
    !previous.kind &&
    !message.kind &&
    message.time - previous.time < 5 * 60 * 1000;

  const row = make('div', `msg${mine ? ' mine' : ''}${grouped ? ' grouped' : ''}`);
  row.dataset.mid = message.id;

  if (grouped) {
    row.append(make('div', 'avatar avatar-spacer'));
  } else {
    const avatar = make('div', 'avatar', initials(message.name));
    avatar.style.background = avatarColor(message.name);
    row.append(avatar);
  }

  const body = make('div', 'msg-body');

  if (!grouped) {
    const head = make('div', 'msg-head');
    const name = make('span', 'name', mine ? `${message.name} (you)` : message.name);
    const time = make('span', 'msg-time', formatTime(message.time));
    head.append(name, time);
    body.append(head);
  }

  if (message.replyTo) body.append(buildReplyQuote(message));

  if (message.kind === 'file' && message.file) {
    body.append(buildFileBubble(message));
  } else {
    const text = make('div', 'msg-text');
    text.append(linkify(message.text || ''));
    body.append(text);
  }

  const reactions = buildReactionChips(message, conversation);
  if (reactions) body.append(reactions);

  const foot = make('div', 'msg-foot');
  foot.append(make('span', 'msg-time', grouped ? formatTime(message.time) : ''));
  if (message.editedAt) foot.append(make('span', 'msg-edited', 'edited'));
  const status = statusText(message, conversation);
  if (status) foot.append(make('span', 'msg-status', status));
  body.append(foot);

  const actions = make('div', 'msg-actions');
  const reactButton = actionButton(ICONS.react, 'Add reaction', () => openReactionPicker(row, message, conversation));
  const replyButton = actionButton(ICONS.reply, 'Reply', () => startReply(message));
  const copyButton = actionButton(ICONS.copy, 'Copy text', () => {
    if (!message.text) return;
    if (!navigator.clipboard) {
      toast('Copy is not available here', 'error');
      return;
    }
    navigator.clipboard.writeText(message.text).then(
      () => toast('Copied to clipboard'),
      () => toast('Could not copy', 'error'),
    );
  });
  actions.append(reactButton, replyButton, copyButton);

  if (mine) {
    if (message.kind !== 'file') {
      actions.append(
        actionButton(ICONS.edit, 'Edit message', () => startEdit(message)),
      );
    }
    actions.append(
      actionButton(ICONS.delete, 'Delete message', () => deleteMessage(message, conversation)),
    );
  }

  body.append(actions);
  row.append(body);
  return row;
}

function typingNames(conversation) {
  const list = typingByChannel.get(conversation?.id) || [];
  return list.filter((user) => user.id !== me.id).map((user) => user.name);
}

function typingLabel(conversation) {
  const names = typingNames(conversation);
  if (names.length === 0) return '';
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
}

function updateTyping(conversation) {
  const indicator = els.messages.querySelector('.typing-indicator');
  const label = typingLabel(conversation);
  if (indicator) {
    indicator.hidden = !label;
    indicator.textContent = label;
  }
  if (conversation && conversation.id === activeId) {
    els.subtitle.textContent = label || baseSubtitle(conversation);
  }
}

function renderMessages({ scroll = true } = {}) {
  const conversation = activeConversation();
  if (!conversation) {
    els.messages.replaceChildren(emptyState(null));
    updateHeader(null);
    updateScrollButton();
    return;
  }

  const wasNearBottom = isNearBottom();
  const previousScroll = els.messages.scrollTop;
  const history = conversation.history || [];
  const query = searchQuery.trim().toLowerCase();
  const visible = query
    ? history.filter(
        (message) =>
          (message.text || '').toLowerCase().includes(query) ||
          (message.name || '').toLowerCase().includes(query) ||
          (message.file?.name || '').toLowerCase().includes(query),
      )
    : history;

  const fragment = document.createDocumentFragment();
  if (visible.length === 0) {
    if (query) {
      const empty = make('div', 'empty');
      const strong = make('strong', null, 'No matches');
      empty.append(strong, `Nothing matches “${searchQuery.trim()}” in this conversation.`);
      fragment.append(empty);
    } else {
      fragment.append(emptyState(conversation));
    }
  } else {
    let lastDay = '';
    let previous = null;
    for (const message of visible) {
      const day = formatDay(message.time);
      if (day !== lastDay) {
        lastDay = day;
        fragment.append(daySeparator(day));
        previous = null;
      }
      fragment.append(buildMessageRow(message, conversation, previous));
      previous = message;
    }
  }

  const indicator = make('div', 'typing-indicator');
  indicator.hidden = true;
  fragment.append(indicator);

  els.messages.replaceChildren(fragment);
  els.searchCount.textContent = query ? `${visible.length} found` : '';
  updateTyping(conversation);

  if (scroll || wasNearBottom) scrollToBottom();
  else els.messages.scrollTop = previousScroll;

  updateScrollButton();
  if (!query) markReads(conversation);
}

function jumpTo(messageId) {
  const target = els.messages.querySelector(`[data-mid="${CSS.escape(messageId)}"]`);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.classList.add('highlight');
  setTimeout(() => target.classList.remove('highlight'), 1300);
}

/* ---------- Channels / users ---------- */

function sortedConversations() {
  return [...conversations].sort((a, b) => {
    if (a.id === 'general') return -1;
    if (b.id === 'general') return 1;
    return (b.lastTime || 0) - (a.lastTime || 0);
  });
}

function renderChannels() {
  els.channels.replaceChildren();

  for (const conversation of sortedConversations()) {
    const li = make('li', 'channel');
    if (conversation.id === activeId) li.classList.add('active');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.title = conversation.name;

    const icon = make('div', 'avatar channel-avatar');
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

    const main = make('div', 'channel-main');
    const top = make('div', 'channel-top');
    const label = make('span', 'channel-name', conversation.name);
    const last = conversation.history?.[conversation.history.length - 1];
    const time = make('span', 'channel-time', last ? formatTime(last.time) : '');
    top.append(label, time);

    const bottom = make('div', 'channel-bottom');
    const preview = make('span', 'channel-preview', messagePreview(last));
    if (last && last.kind === 'file') preview.classList.add('muted');
    bottom.append(preview);

    const unread = unreadCount(conversation);
    if (unread > 0) {
      const badge = make('span', 'unread', unread > 99 ? '99+' : String(unread));
      bottom.append(badge);
    } else if (conversation.type === 'group') {
      bottom.append(make('span', 'tag', String(conversation.members?.length || 0)));
    }

    main.append(top, bottom);
    li.append(icon, main);

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
  updateTitle();
}

function renderUsers() {
  els.onlineCount.textContent = String(users.length);
  els.users.replaceChildren();

  for (const user of users) {
    const li = make('li');
    if (user.id === me.id) li.classList.add('is-me');

    const avatar = make('div', 'avatar', initials(user.name));
    avatar.style.background = avatarColor(user.name);

    const label = make('span', 'user-name', user.name);
    const dot = make('span', 'presence-dot');
    dot.title = 'Online';

    li.append(avatar, label, dot);

    if (user.id === me.id) {
      li.append(make('span', 'you', 'you'));
    } else {
      li.classList.add('clickable');
      li.title = `Send ${user.name} a private message`;
      li.addEventListener('click', () => openDm(user));
    }

    els.users.append(li);
  }

  const conversation = activeConversation();
  if (conversation) updateHeader(conversation);
}

function setActive(id) {
  const conversation = getConversation(id);
  if (!conversation) return;
  const wasEditing = Boolean(editingId);
  markSeen(activeConversation());
  activeId = id;
  localStorage.setItem(CHANNEL_KEY, activeId);
  markSeen(conversation);
  clearComposerState();
  if (wasEditing) {
    els.input.value = '';
    autoResize();
  }
  closeSearch();
  renderChannels();
  updateHeader(conversation);
  renderMessages({ scroll: true });
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
      online: true,
      history: [],
      unread: 0,
      lastTime: Date.now(),
    });
  }
  setActive(id);
}

/* ---------- Message actions ---------- */

async function apiJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Server responded ${response.status}`);
  return data;
}

function postJson(url, body) {
  return apiJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function upsertMessage(message) {
  const conversation = getConversation(message.channel);
  if (!conversation) return;
  conversation.history = conversation.history || [];
  const index = conversation.history.findIndex((entry) => entry.id === message.id);
  if (index >= 0) conversation.history[index] = { ...conversation.history[index], ...message };
  else conversation.history.push(message);
  conversation.lastTime = message.time;
  if (conversation.id === activeId) renderMessages({ scroll: false });
  renderChannels();
}

async function toggleReaction(message, conversation, emoji) {
  const existing = message.reactions?.[emoji] || [];
  const action = existing.includes(me.id) ? 'remove' : 'add';
  try {
    const data = await postJson('/api/reactions', {
      messageId: message.id,
      userId: me.id,
      emoji,
      action,
      channel: conversation.id,
    });
    if (data.message) upsertMessage(data.message);
  } catch (error) {
    toast(`Reaction failed: ${error.message}`, 'error');
  }
}

function startReply(message) {
  editingId = null;
  replyTo = {
    id: message.id,
    name: message.name,
    text: (message.kind === 'file' ? message.file?.name : message.text || '').slice(0, 140),
  };
  updateComposerBanner();
  els.input.focus();
}

function startEdit(message) {
  replyTo = null;
  editingId = message.id;
  updateComposerBanner();
  els.input.value = message.text || '';
  autoResize();
  els.input.focus();
  els.input.setSelectionRange(els.input.value.length, els.input.value.length);
}

async function deleteMessage(message, conversation) {
  if (!window.confirm('Delete this message? This cannot be undone.')) return;
  try {
    await postJson('/api/messages/delete', {
      id: me.id,
      channel: conversation.id,
      messageId: message.id,
    });
    conversation.history = (conversation.history || []).filter((entry) => entry.id !== message.id);
    if (conversation.id === activeId) renderMessages({ scroll: false });
    renderChannels();
    if (editingId === message.id) clearComposerState();
  } catch (error) {
    toast(`Could not delete: ${error.message}`, 'error');
  }
}

function clearComposerState() {
  replyTo = null;
  editingId = null;
  updateComposerBanner();
}

function updateComposerBanner() {
  if (editingId) {
    const conversation = activeConversation();
    const message = conversation?.history?.find((entry) => entry.id === editingId);
    els.banner.hidden = false;
    els.banner.classList.add('editing');
    els.bannerIcon.textContent = '✎';
    els.bannerTitle.textContent = 'Editing message';
    els.bannerText.textContent = message ? message.text : '';
    return;
  }
  if (replyTo) {
    els.banner.hidden = false;
    els.banner.classList.remove('editing');
    els.bannerIcon.textContent = '↩';
    els.bannerTitle.textContent = `Replying to ${replyTo.name}`;
    els.bannerText.textContent = replyTo.text;
    return;
  }
  els.banner.hidden = true;
  els.banner.classList.remove('editing');
}

/* ---------- Read receipts ---------- */

function markReads(conversation) {
  if (!conversation || document.hidden || conversation.id !== activeId) return;
  const history = conversation.history || [];
  const pending = history
    .filter((message) => message.userId !== me.id && !(message.readBy || []).includes(me.id) && !sentReads.has(message.id))
    .slice(-40);
  for (const message of pending) {
    sentReads.add(message.id);
    postJson('/api/read-receipt', {
      messageId: message.id,
      userId: me.id,
      channel: conversation.id,
    }).catch(() => sentReads.delete(message.id));
  }
}

/* ---------- Typing ---------- */

let typingTimer = null;
let typingSent = false;

function sendTypingState(active) {
  const conversation = activeConversation();
  if (!conversation) return;
  postJson('/api/typing', {
    userId: me.id,
    type: active ? 'start' : 'stop',
    channel: conversation.id,
  }).catch(() => {});
}

function stopTyping() {
  if (!typingSent) return;
  typingSent = false;
  clearTimeout(typingTimer);
  sendTypingState(false);
}

function noteTyping() {
  if (!els.input.value.trim()) {
    stopTyping();
    return;
  }
  if (!typingSent) {
    typingSent = true;
    sendTypingState(true);
  }
  clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 1800);
}

/* ---------- Sounds & notifications ---------- */

let audioCtx = null;

function beep(frequency, duration, volume) {
  if (!settings.sound) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency || 720;
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.07, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (duration || 0.16));
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + (duration || 0.16) + 0.03);
  } catch {
    // Audio is optional.
  }
}

function showNotification(conversation, message) {
  if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const body = message.kind === 'file' ? `Sent a file: ${message.file?.name || ''}` : message.text || '';
  try {
    const notification = new Notification(`${message.name} · ${conversation.name}`, {
      body: body.slice(0, 160),
      icon: '/logo.svg',
      tag: conversation.id,
    });
    notification.onclick = () => {
      window.focus();
      setActive(conversation.id);
      notification.close();
    };
  } catch {
    // Notifications are optional.
  }
}

/* ---------- Incoming messages ---------- */

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
    const peerName =
      peerId === message.userId
        ? message.name
        : users.find((user) => user.id === peerId)?.name || 'Unknown device';
    return {
      id: message.channel,
      type: 'dm',
      name: peerName,
      peerId,
      online: users.some((user) => user.id === peerId),
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

function handleIncomingMessage(message) {
  if (!message || !message.channel) return;

  let conversation = getConversation(message.channel);
  if (!conversation) {
    conversation = conversationFromMessage(message);
    conversations.push(conversation);
  }

  conversation.history = conversation.history || [];
  const index = conversation.history.findIndex((entry) => entry.id === message.id);
  const isNew = index < 0;
  if (isNew) conversation.history.push(message);
  else conversation.history[index] = { ...conversation.history[index], ...message };
  conversation.lastTime = message.time;

  if (conversation.id === activeId) {
    if (isNew && !searchQuery && isNearBottom()) renderMessages({ scroll: true });
    else renderMessages({ scroll: false });
    if (!document.hidden) markSeen(conversation);
  }

  renderChannels();

  if (isNew && message.userId !== me.id) {
    const away = document.hidden || conversation.id !== activeId;
    if (away) {
      beep(860, 0.16, 0.06);
      showNotification(conversation, message);
    }
    if (conversation.id === activeId && !isNearBottom()) {
      jumpCount += 1;
      updateScrollButton();
    }
  }
}

function handleMessageDelete(data) {
  const conversation = getConversation(data.channel);
  if (!conversation) return;
  conversation.history = (conversation.history || []).filter((message) => message.id !== data.id);
  if (conversation.id === activeId) renderMessages({ scroll: false });
  renderChannels();
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
  updateHeader(activeConversation());
  renderMessages({ scroll: false });
}

/* ---------- Calls (WebRTC) ---------- */

const RTC_CONFIG = { iceServers: [] };

let call = null;
let callTimerId = null;
let ringInterval = null;
let ringCtx = null;

function newCallId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function activePeerConversation() {
  const conversation = activeConversation();
  if (!conversation || conversation.type !== 'dm' || !conversation.peerId) return null;
  return conversation;
}

function updateCallButtons(conversation) {
  els.callButtons.hidden = !conversation || conversation.type !== 'dm';
}

function stopRing() {
  if (ringInterval) {
    clearInterval(ringInterval);
    ringInterval = null;
  }
  try {
    navigator.vibrate?.(0);
  } catch {
    // Vibration is optional.
  }
}

function startRing() {
  stopRing();
  try {
    navigator.vibrate?.([400, 200, 400, 200, 600]);
  } catch {
    // Vibration is optional.
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ringCtx = ringCtx || new AudioCtx();
    if (ringCtx.state === 'suspended') ringCtx.resume();
    const ring = () => {
      const osc = ringCtx.createOscillator();
      const gain = ringCtx.createGain();
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.0001, ringCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, ringCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ringCtx.currentTime + 0.5);
      osc.connect(gain).connect(ringCtx.destination);
      osc.start();
      osc.stop(ringCtx.currentTime + 0.55);
    };
    ring();
    ringInterval = setInterval(ring, 1600);
  } catch {
    // Audio ringing is optional.
  }
}

function updateCallTimer() {
  if (!call || !call.startedAt) return;
  const total = Math.floor((Date.now() - call.startedAt) / 1000);
  els.callTimer.textContent = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function stopCallTimer() {
  if (callTimerId) {
    clearInterval(callTimerId);
    callTimerId = null;
  }
}

function startCallTimer() {
  if (!call) return;
  if (!call.startedAt) call.startedAt = Date.now();
  stopCallTimer();
  updateCallTimer();
  callTimerId = setInterval(updateCallTimer, 1000);
}

function renderCallUi() {
  if (!call) {
    els.callOverlay.hidden = true;
    els.callOverlay.classList.remove('video');
    return;
  }

  els.callOverlay.hidden = false;
  els.callPeerName.textContent = call.peerName;
  els.callAvatar.textContent = initials(call.peerName);
  els.callAvatar.style.background = avatarColor(call.peerName);

  const incoming = call.state === 'incoming';
  const active = call.state === 'active';
  const showVideo = call.withVideo && active;

  els.callOverlay.classList.toggle('video', showVideo);
  els.callAccept.hidden = !incoming;
  els.callDecline.hidden = !incoming;
  els.callMute.hidden = !active;
  els.callHangup.hidden = incoming;
  els.callMute.textContent = call.muted ? 'Unmute' : 'Mute';
  els.callRemoteVideo.hidden = !showVideo;
  els.callLocalVideo.hidden = !showVideo;
  els.callAvatar.hidden = showVideo;
  els.callTimer.hidden = !active;

  if (incoming) {
    els.callStatus.textContent = call.withVideo ? 'Incoming video call…' : 'Incoming call…';
  } else if (call.state === 'outgoing') {
    els.callStatus.textContent = call.withVideo ? 'Starting video call…' : 'Calling…';
  } else {
    els.callStatus.textContent = call.withVideo ? 'Video call' : 'Audio call';
    if (call.remoteStream) {
      const media = call.withVideo ? els.callRemoteVideo : els.callRemoteAudio;
      media.play().catch(() => {});
    }
  }
}

function attachRemoteStream() {
  if (!call || !call.remoteStream) return;
  const stream = call.remoteStream;
  if (call.withVideo) {
    if (els.callRemoteVideo.srcObject !== stream) {
      els.callRemoteVideo.srcObject = stream;
      els.callRemoteVideo.play().catch(() => {});
    }
  } else if (els.callRemoteAudio.srcObject !== stream) {
    els.callRemoteAudio.srcObject = stream;
    els.callRemoteAudio.play().catch(() => {});
  }
}

function createPeerConnection() {
  const pc = new RTCPeerConnection(RTC_CONFIG);
  call.pc = pc;
  call.remoteStream = new MediaStream();

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) call.remoteStream = event.streams[0];
    else call.remoteStream.addTrack(event.track);
    attachRemoteStream();
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) sendSignal('ice', event.candidate);
  };

  pc.onconnectionstatechange = () => {
    if (!call || call.pc !== pc) return;
    if (pc.connectionState === 'connected') {
      stopRing();
      if (call.state === 'active' && !call.startedAt) startCallTimer();
      renderCallUi();
    } else if (pc.connectionState === 'failed') {
      endCall('Call connection failed', 'hangup');
    }
  };

  return pc;
}

async function sendSignal(type, data) {
  if (!call) return false;
  try {
    await postJson('/api/signal', {
      fromId: me.id,
      fromName: me.name,
      toId: call.peerId,
      callId: call.callId,
      type,
      data,
    });
    return true;
  } catch (error) {
    if (type !== 'hangup' && type !== 'decline') {
      setStatus(`Call failed: ${error.message}`, 'offline');
    }
    return false;
  }
}

function sendSignalBeacon(target, type) {
  if (!target) return;
  try {
    fetch('/api/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        fromId: me.id,
        fromName: me.name,
        toId: target.peerId,
        callId: target.callId,
        type,
      }),
    }).catch(() => {});
  } catch {
    // Best effort only.
  }
}

function cleanupCall(current) {
  if (!current) return;
  try {
    current.pc?.close();
  } catch {
    // Already closed.
  }
  current.localStream?.getTracks().forEach((track) => track.stop());
  els.callRemoteAudio.srcObject = null;
  els.callRemoteVideo.srcObject = null;
  els.callLocalVideo.srcObject = null;
}

function endCall(message, signalType) {
  const current = call;
  if (!current) return;
  stopRing();
  stopCallTimer();
  if (signalType) sendSignalBeacon(current, signalType);
  call = null;
  cleanupCall(current);
  renderCallUi();
  if (message) setStatus(message, 'offline');
  restoreConnectionStatus();
}

async function startCall(withVideo) {
  const conversation = activePeerConversation();
  if (!conversation) return;
  if (call) {
    toast('You are already in a call', 'error');
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
    toast('Calls need HTTPS on this device (open via localhost or an HTTPS address)', 'error');
    return;
  }
  const peer = users.find((user) => user.id === conversation.peerId);
  if (!peer) {
    toast(`${conversation.name} is offline`, 'error');
    return;
  }

  call = {
    callId: newCallId(),
    peerId: conversation.peerId,
    peerName: conversation.name,
    role: 'caller',
    state: 'outgoing',
    withVideo,
    muted: false,
    pendingIce: [],
    offer: null,
    startedAt: 0,
    pc: null,
    localStream: null,
    remoteStream: null,
  };
  renderCallUi();
  startRing();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo ? { facingMode: 'user' } : false,
    });
    if (!call) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    call.localStream = stream;
    if (withVideo) {
      els.callLocalVideo.srcObject = stream;
      els.callLocalVideo.play().catch(() => {});
    }

    const pc = createPeerConnection();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sent = await sendSignal('offer', pc.localDescription);
    if (!sent) endCall('Could not reach that device', null);
  } catch (error) {
    const denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    endCall(
      denied ? 'Microphone/camera permission was blocked' : `Could not start call: ${error.message}`,
      'hangup',
    );
  }
}

async function flushPendingIce() {
  if (!call || !call.pc) return;
  const queued = call.pendingIce.splice(0);
  for (const candidate of queued) {
    try {
      await call.pc.addIceCandidate(candidate);
    } catch {
      // Ignore candidates that arrive too late.
    }
  }
}

async function acceptCall() {
  if (!call || call.state !== 'incoming') return;
  stopRing();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: call.withVideo ? { facingMode: 'user' } : false,
    });
    if (!call) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    call.localStream = stream;
    if (call.withVideo) {
      els.callLocalVideo.srcObject = stream;
      els.callLocalVideo.play().catch(() => {});
    }

    const pc = createPeerConnection();
    for (const track of stream.getTracks()) pc.addTrack(track, stream);

    await pc.setRemoteDescription(call.offer);
    await flushPendingIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal('answer', pc.localDescription);

    call.offer = null;
    call.state = 'active';
    startCallTimer();
    renderCallUi();
  } catch (error) {
    const denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    endCall(
      denied ? 'Microphone/camera permission was blocked' : `Could not answer call: ${error.message}`,
      'hangup',
    );
  }
}

function toggleMute() {
  if (!call || !call.localStream) return;
  call.muted = !call.muted;
  call.localStream.getAudioTracks().forEach((track) => {
    track.enabled = !call.muted;
  });
  renderCallUi();
}

async function handleSignal(signal) {
  if (!signal || !signal.fromId || signal.fromId === me.id) return;

  if (signal.type === 'offer') {
    if (call) {
      if (call.callId === signal.callId) return;
      sendSignalBeacon({ peerId: signal.fromId, callId: signal.callId }, 'busy');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      sendSignalBeacon({ peerId: signal.fromId, callId: signal.callId }, 'decline');
      return;
    }
    call = {
      callId: signal.callId,
      peerId: signal.fromId,
      peerName: signal.fromName || 'Unknown device',
      role: 'callee',
      state: 'incoming',
      withVideo: Boolean(signal.data && /m=video/.test(signal.data.sdp || '')),
      muted: false,
      pendingIce: [],
      offer: signal.data,
      startedAt: 0,
      pc: null,
      localStream: null,
      remoteStream: null,
    };
    renderCallUi();
    startRing();
    return;
  }

  if (!call || signal.callId !== call.callId || signal.fromId !== call.peerId) return;

  if (signal.type === 'answer') {
    if (call.role !== 'caller' || !call.pc) return;
    stopRing();
    try {
      await call.pc.setRemoteDescription(signal.data);
      await flushPendingIce();
      call.state = 'active';
      startCallTimer();
      renderCallUi();
    } catch (error) {
      endCall(`Call failed: ${error.message}`, 'hangup');
    }
    return;
  }

  if (signal.type === 'ice') {
    if (!signal.data) return;
    if (call.pc && call.pc.remoteDescription) {
      try {
        await call.pc.addIceCandidate(signal.data);
      } catch {
        // Ignore stale candidates.
      }
    } else {
      call.pendingIce.push(signal.data);
    }
    return;
  }

  if (signal.type === 'hangup') return endCall('Call ended', null);
  if (signal.type === 'decline') return endCall('Call declined', null);
  if (signal.type === 'busy') return endCall('That device is already in a call', null);
}

/* ---------- Connection ---------- */

function connect() {
  if (source) source.close();
  setStatus('Connecting…', '');
  const params = new URLSearchParams({ id: me.id, name: me.name });
  source = new EventSource(`/events?${params}`);

  source.addEventListener('open', () => setStatus(`Connected · ${location.host}`, 'connected'));

  source.addEventListener('init', (event) => {
    const data = JSON.parse(event.data);
    if (data.config) {
      if (data.config.maxName) MAX_NAME = data.config.maxName;
      if (data.config.maxGroupName) MAX_GROUP_NAME = data.config.maxGroupName;
      if (data.config.maxText) MAX_TEXT = data.config.maxText;
    }
    users = data.users || [];
    renderUsers();
    applyConversations(data.conversations);
  });

  source.addEventListener('conversations', (event) => {
    applyConversations(JSON.parse(event.data).conversations);
  });

  source.addEventListener('message', (event) => {
    try {
      handleIncomingMessage(JSON.parse(event.data));
    } catch {
      // Ignore malformed payloads.
    }
  });

  source.addEventListener('message-delete', (event) => {
    try {
      handleMessageDelete(JSON.parse(event.data));
    } catch {
      // Ignore malformed payloads.
    }
  });

  source.addEventListener('presence', (event) => {
    users = JSON.parse(event.data).users || [];
    renderUsers();
    for (const conversation of conversations) {
      if (conversation.type === 'dm') {
        conversation.online = users.some((user) => user.id === conversation.peerId);
      }
    }
  });

  source.addEventListener('typing', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (!data || !data.channel) return;
      if (data.users && data.users.length) typingByChannel.set(data.channel, data.users);
      else typingByChannel.delete(data.channel);
      const conversation = activeConversation();
      if (conversation && conversation.id === data.channel) updateTyping(conversation);
    } catch {
      // Ignore malformed payloads.
    }
  });

  source.addEventListener('read-receipt', (event) => {
    try {
      const data = JSON.parse(event.data);
      const conversation = getConversation(data.channel);
      const message = conversation?.history?.find((entry) => entry.id === data.messageId);
      if (!message) return;
      message.readBy = message.readBy || [];
      if (!message.readBy.includes(data.userId)) message.readBy.push(data.userId);
      if (conversation.id === activeId) renderMessages({ scroll: false });
    } catch {
      // Ignore malformed payloads.
    }
  });

  source.addEventListener('signal', (event) => {
    let signal;
    try {
      signal = JSON.parse(event.data);
    } catch {
      return;
    }
    handleSignal(signal);
  });

  source.addEventListener('error', () => {
    setStatus('Disconnected — retrying…', 'offline');
  });
}

/* ---------- Composer ---------- */

function autoResize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
}

async function sendMessage() {
  if (uploadInProgress) return;
  const text = els.input.value.trim();
  const conversation = activeConversation();
  if (!text || !conversation) return;

  els.send.disabled = true;
  els.input.value = '';
  autoResize();
  stopTyping();

  const pendingReply = replyTo;
  const editing = editingId;

  try {
    if (editing) {
      await postJson('/api/messages/edit', {
        id: me.id,
        name: me.name,
        channel: conversation.id,
        messageId: editing,
        text,
      });
      clearComposerState();
    } else {
      await postJson('/api/messages', {
        id: me.id,
        name: me.name,
        text,
        channel: conversation.id,
        replyTo: pendingReply?.id || null,
      });
      replyTo = null;
      updateComposerBanner();
    }
  } catch (error) {
    if (!els.input.value) {
      els.input.value = text;
      autoResize();
    }
    if (editing) editingId = editing;
    if (pendingReply) replyTo = pendingReply;
    updateComposerBanner();
    toast(error.message, 'error');
  } finally {
    els.send.disabled = false;
    els.input.focus();
  }
}

function uploadFile(file, conversation) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      id: me.id,
      name: me.name,
      channel: conversation.id,
      filename: file.name,
      type: file.type || 'application/octet-stream',
    });
    if (replyTo?.id) params.set('reply', replyTo.id);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/files?${params}`);
    xhr.responseType = 'json';

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      setStatus(`Uploading ${file.name} — ${percent}%`, '');
    });

    xhr.addEventListener('load', () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve(data);
      else reject(new Error(data.error || `Server responded ${xhr.status}`));
    });
    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.send(file);
  });
}

let statusTimer = null;

function restoreConnectionStatus() {
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (source && source.readyState === EventSource.OPEN) {
      setStatus(`Connected · ${location.host}`, 'connected');
    }
  }, 2500);
}

async function sendFiles(fileList) {
  const files = [...fileList];
  if (files.length === 0) return;
  if (uploadInProgress) {
    toast('Please wait for the current transfer to finish…', 'error');
    return;
  }

  const conversation = activeConversation();
  if (!conversation) return;

  uploadInProgress = true;
  els.attach.disabled = true;
  els.send.disabled = true;
  stopTyping();

  try {
    for (const file of files) {
      try {
        await uploadFile(file, conversation);
        setStatus(`Sent ${file.name}`, 'connected');
      } catch (error) {
        toast(`Upload failed: ${error.message}`, 'error');
        break;
      }
    }
    replyTo = null;
    updateComposerBanner();
  } finally {
    uploadInProgress = false;
    els.attach.disabled = false;
    els.send.disabled = false;
    els.input.focus();
    restoreConnectionStatus();
  }
}

/* ---------- Group dialog ---------- */

function openGroupDialog() {
  els.groupName.value = '';
  els.groupError.hidden = true;
  els.groupMembers.replaceChildren();

  const others = users.filter((user) => user.id !== me.id);
  if (others.length === 0) {
    const li = make('li', 'member-empty', 'No other devices are online yet. Invite someone first!');
    els.groupMembers.append(li);
  }

  for (const user of others) {
    const li = make('li');
    const label = make('label', 'member');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = user.id;

    const avatar = make('div', 'avatar', initials(user.name));
    avatar.style.background = avatarColor(user.name);

    const name = make('span', null, user.name);

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
    els.groupError.textContent =
      members.length === 0 ? 'Pick at least one person to join the group.' : 'Give the group a name.';
    els.groupError.hidden = false;
    return;
  }
  els.groupError.hidden = true;

  const submit = els.groupForm.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const data = await postJson('/api/groups', { id: me.id, name: me.name, nameValue, members });
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
    toast(`Could not create group: ${error.message}`, 'error');
  } finally {
    submit.disabled = false;
  }
}

/* ---------- Search / theme / settings ---------- */

function openSearch() {
  els.searchbar.hidden = false;
  els.searchInput.focus();
  els.searchInput.select();
}

function closeSearch() {
  if (els.searchbar.hidden) return;
  els.searchbar.hidden = true;
  els.searchInput.value = '';
  els.searchCount.textContent = '';
  searchQuery = '';
  renderMessages({ scroll: false });
}

function applyTheme(theme) {
  settings.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = settings.theme;
  localStorage.setItem(THEME_KEY, settings.theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#f4f6fb' : '#0a0c12');
}

function syncSettingButtons() {
  els.toggleSound.classList.toggle('active', settings.sound);
  els.toggleSound.setAttribute('aria-pressed', String(settings.sound));
  els.toggleNotify.classList.toggle('active', settings.notify);
  els.toggleNotify.setAttribute('aria-pressed', String(settings.notify));
}

async function toggleNotifications() {
  if (settings.notify) {
    settings.notify = false;
    localStorage.setItem(NOTIFY_KEY, '0');
    syncSettingButtons();
    toast('Desktop alerts off');
    return;
  }
  if (!('Notification' in window)) {
    toast('This browser does not support notifications', 'error');
    return;
  }
  let permission = Notification.permission;
  if (permission === 'default') permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    toast('Notification permission was blocked', 'error');
    return;
  }
  settings.notify = true;
  localStorage.setItem(NOTIFY_KEY, '1');
  syncSettingButtons();
  toast('Desktop alerts on');
}

/* ---------- Wiring ---------- */

els.composer.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage();
});

els.attach.addEventListener('click', () => els.fileInput.click());

els.fileInput.addEventListener('change', () => {
  const files = [...els.fileInput.files];
  els.fileInput.value = '';
  sendFiles(files);
});

let dragDepth = 0;

els.composer.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dragDepth += 1;
  els.composer.classList.add('drag');
});

els.composer.addEventListener('dragover', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
});

els.composer.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) els.composer.classList.remove('drag');
});

els.composer.addEventListener('drop', (event) => {
  event.preventDefault();
  dragDepth = 0;
  els.composer.classList.remove('drag');
  if (event.dataTransfer?.files?.length) sendFiles(event.dataTransfer.files);
});

els.input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  } else if (event.key === 'Escape' && (replyTo || editingId)) {
    const wasEditing = Boolean(editingId);
    clearComposerState();
    if (wasEditing) {
      els.input.value = '';
      autoResize();
    }
  }
});

els.input.addEventListener('input', () => {
  autoResize();
  noteTyping();
});

els.input.addEventListener('blur', stopTyping);

els.bannerCancel.addEventListener('click', () => {
  clearComposerState();
  els.input.value = '';
  autoResize();
  els.input.focus();
});

els.messages.addEventListener('scroll', () => {
  updateScrollButton();
  if (isNearBottom()) {
    jumpCount = 0;
    updateJumpBadge();
  }
});

els.scrollBottom.addEventListener('click', () => {
  scrollToBottom();
  const conversation = activeConversation();
  if (conversation) markSeen(conversation);
});

els.toggleSearch.addEventListener('click', () => {
  if (els.searchbar.hidden) openSearch();
  else closeSearch();
});

els.searchInput.addEventListener('input', () => {
  searchQuery = els.searchInput.value;
  renderMessages({ scroll: false });
});

els.searchClose.addEventListener('click', closeSearch);

els.toggleTheme.addEventListener('click', () => {
  applyTheme(settings.theme === 'light' ? 'dark' : 'light');
});

els.toggleSound.addEventListener('click', () => {
  settings.sound = !settings.sound;
  localStorage.setItem(SOUND_KEY, settings.sound ? '1' : '0');
  syncSettingButtons();
  if (settings.sound) beep(720, 0.12, 0.05);
});

els.toggleNotify.addEventListener('click', toggleNotifications);

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
  const label = els.copyLink.querySelector('.label');
  try {
    await navigator.clipboard.writeText(location.origin);
    if (label) label.textContent = 'Copied!';
  } catch {
    if (label) label.textContent = location.host;
  }
  setTimeout(() => {
    if (label) label.textContent = 'Invite';
  }, 1600);
});

els.toggleMenu.addEventListener('click', () => {
  const open = !els.app.classList.contains('sidebar-open');
  els.app.classList.remove('members-open');
  els.app.classList.toggle('sidebar-open', open);
});

els.toggleMembers.addEventListener('click', () => {
  if (window.matchMedia('(max-width: 820px)').matches) {
    const open = !els.app.classList.contains('members-open');
    els.app.classList.remove('sidebar-open');
    els.app.classList.toggle('members-open', open);
  } else {
    els.app.classList.toggle('members-collapsed');
  }
});

els.scrim.addEventListener('click', () => els.app.classList.remove('sidebar-open', 'members-open'));

els.callAudioBtn.addEventListener('click', () => startCall(false));
els.callVideoBtn.addEventListener('click', () => startCall(true));
els.callAccept.addEventListener('click', acceptCall);
els.callDecline.addEventListener('click', () => endCall('Call declined', 'decline'));
els.callHangup.addEventListener('click', () => endCall('Call ended', 'hangup'));
els.callMute.addEventListener('click', toggleMute);

window.addEventListener('pagehide', () => {
  if (call) sendSignalBeacon(call, 'hangup');
  stopTyping();
});

els.newGroup.addEventListener('click', openGroupDialog);
els.groupCancel.addEventListener('click', () => {
  els.groupDialog.hidden = true;
});
els.groupForm.addEventListener('submit', createGroup);
els.groupDialog.addEventListener('click', (event) => {
  if (event.target === els.groupDialog) els.groupDialog.hidden = true;
});

document.addEventListener('click', (event) => {
  if (event.target.closest('.reaction-picker')) return;
  document.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());
});

document.addEventListener('visibilitychange', () => {
  const conversation = activeConversation();
  if (!document.hidden && conversation) {
    markSeen(conversation);
    renderChannels();
    renderMessages({ scroll: false });
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!els.groupDialog.hidden) els.groupDialog.hidden = true;
    else if (els.nameDialog.hidden && !els.searchbar.hidden) closeSearch();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && els.nameDialog.hidden) {
    event.preventDefault();
    openSearch();
  }
});

applyTheme(settings.theme);
syncSettingButtons();
renderChannels();

if (me.name) {
  els.meName.textContent = me.name;
  els.nameDialog.hidden = true;
  updateHeader(activeConversation());
  renderMessages({ scroll: false });
  connect();
} else {
  askForName(true);
}
