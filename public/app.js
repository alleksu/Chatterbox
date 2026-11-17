import { createAuthClient } from './auth-client.js';

const authClient = createAuthClient();
const ID_KEY = 'lanchat.id';
const NAME_KEY = 'lanchat.name';
const FULL_NAME_KEY = 'lanchat.fullName';
const CHANNEL_KEY = 'lanchat.channel';
const SEEN_KEY = 'lanchat.seen';
const THEME_KEY = 'lanchat.theme';
const COLORS_KEY = 'lanchat.colors';
const SOUND_KEY = 'lanchat.sound';
const NOTIFY_KEY = 'lanchat.notify';
const DRAFT_KEY = 'lanchat.drafts';
const MIC_KEY = 'lanchat.mic';
const CAM_KEY = 'lanchat.cam';
const SPEAKER_KEY = 'lanchat.speaker';
const SERVER_KEY = 'chatterbox.server';
const ACCOUNT_KEY = 'chatterbox.lastAccount';

// Authenticated cookies require the UI and API to share one origin.
// Remote-server mode must be redesigned before enabling cross-origin clients.
const SERVER_URL = '';
function apiUrl(path) { return path; }

let MAX_NAME = 24;
let MAX_FULL_NAME = 60;
let MAX_GROUP_NAME = 40;
let MAX_TEXT = 4000;

const ICONS = {
  react: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 14.4a4.5 4.5 0 0 0 7 0"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>',
  reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17 4 12l5-5"/><path d="M4 12h9a7 7 0 0 1 7 7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L20 8l-4-4L4 16v4Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v10M7 10l5 5 5-5M5 19h14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 6 6M14 3l7 7-4 1-2 5-2 2-7-7 2-2 5-2 1-4Z"/><path d="m10 14-6 6"/></svg>',
  unsent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"/><path d="m10 11 4 4M14 11l-4 4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀', '✅', '🙏'];
const REACTION_MAX = 10;

const els = {
  messages: document.getElementById('messages'),
  users: document.getElementById('users'),
  friends: document.getElementById('friends'),
  friendsCount: document.getElementById('friends-count'),
  friendsEmpty: document.getElementById('friends-empty'),
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
  usernameInput: document.getElementById('username-input'),
  passwordInput: document.getElementById('password-input'),
  registrationFields: document.getElementById('registration-fields'),
  authSubtitle: document.getElementById('auth-subtitle'),
  authError: document.getElementById('auth-error'),
  authSubmit: document.getElementById('auth-submit'),
  authToggle: document.getElementById('auth-toggle'),
  authTitle: document.getElementById('name-title'),
  changeName: document.getElementById('change-name'),
  copyLink: document.getElementById('copy-link'),
  toggleMenu: document.getElementById('toggle-menu'),
  toggleMembers: document.getElementById('toggle-members'),
  toggleTheme: document.getElementById('toggle-theme'),
  toggleSearch: document.getElementById('toggle-search'),
  toggleSound: document.getElementById('toggle-sound'),
  toggleNotify: document.getElementById('toggle-notify'),
  themeColors: document.getElementById('theme-colors'),
  newGroup: document.getElementById('new-group'),
  newRoom: document.getElementById('new-room'),
  groupDialog: document.getElementById('group-dialog'),
  groupForm: document.getElementById('group-form'),
  groupName: document.getElementById('group-name'),
  groupMembers: document.getElementById('group-members'),
  groupError: document.getElementById('group-error'),
  groupCancel: document.getElementById('group-cancel'),
  roomDialog: document.getElementById('room-dialog'),
  roomForm: document.getElementById('room-form'),
  roomName: document.getElementById('room-name'),
  roomError: document.getElementById('room-error'),
  roomCancel: document.getElementById('room-cancel'),
  togglePins: document.getElementById('toggle-pins'),
  pinCount: document.getElementById('pin-count'),
  pinsDialog: document.getElementById('pins-dialog'),
  pinsList: document.getElementById('pins-list'),
  pinsSubtitle: document.getElementById('pins-subtitle'),
  pinsClose: document.getElementById('pins-close'),
  chatMenu: document.getElementById('chat-menu'),
  chatMenuPanel: document.getElementById('chat-menu-panel'),
  menuMembers: document.getElementById('menu-members'),
  menuCalls: document.getElementById('menu-calls'),
  menuDevices: document.getElementById('menu-devices'),
  leaveChat: document.getElementById('leave-chat'),
  searchDialog: document.getElementById('search-dialog'),
  globalSearchInput: document.getElementById('global-search-input'),
  globalSearchStatus: document.getElementById('global-search-status'),
  globalSearchResults: document.getElementById('global-search-results'),
  globalSearchClose: document.getElementById('global-search-close'),
  callsDialog: document.getElementById('calls-dialog'),
  callsList: document.getElementById('calls-list'),
  callsClose: document.getElementById('calls-close'),
  devicesDialog: document.getElementById('devices-dialog'),
  micSelect: document.getElementById('mic-select'),
  camSelect: document.getElementById('cam-select'),
  speakerSelect: document.getElementById('speaker-select'),
  deviceNote: document.getElementById('device-note'),
  devicesClose: document.getElementById('devices-close'),
  colorsDialog: document.getElementById('colors-dialog'),
  colorBg: document.getElementById('color-bg'),
  colorSurface: document.getElementById('color-surface'),
  colorText: document.getElementById('color-text'),
  colorAccent: document.getElementById('color-accent'),
  colorAccent2: document.getElementById('color-accent2'),
  colorMine: document.getElementById('color-mine'),
  colorBubble: document.getElementById('color-bubble'),
  colorPresets: document.getElementById('color-presets'),
  colorsReset: document.getElementById('colors-reset'),
  colorsClose: document.getElementById('colors-close'),
  membersTitle: document.getElementById('members-title'),
  mentionMenu: document.getElementById('mention-menu'),
  uploadPanel: document.getElementById('upload-panel'),
  liveRegion: document.getElementById('live-region'),
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
  callShare: document.getElementById('call-share'),
  callDevices: document.getElementById('call-devices'),
  callAccept: document.getElementById('call-accept'),
  callDecline: document.getElementById('call-decline'),
  callHangup: document.getElementById('call-hangup'),
};


function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function loadDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

const COLOR_FIELDS = ['bg', 'surface', 'text', 'accent', 'accent2', 'mine', 'bubble'];
const COLOR_DEFAULTS = {
  dark: {
    bg: '#080a10',
    surface: '#141926',
    text: '#eef1f9',
    accent: '#7b9bff',
    accent2: '#a45cff',
    mine: '#5a78f2',
    bubble: '#232a3d',
  },
  light: {
    bg: '#eef1f8',
    surface: '#ffffff',
    text: '#101728',
    accent: '#4f6ef7',
    accent2: '#8b5cf6',
    mine: '#5a78f2',
    bubble: '#ffffff',
  },
};

function loadColors() {
  try {
    const stored = JSON.parse(localStorage.getItem(COLORS_KEY) || 'null');
    if (!stored || typeof stored !== 'object') return {};
    const colors = {};
    for (const field of COLOR_FIELDS) {
      if (/^#[0-9a-f]{6}$/i.test(stored[field])) colors[field] = stored[field];
    }
    return colors;
  } catch {
    return {};
  }
}

let customColors = loadColors();

const me = { id: '', name: '', username: '', fullName: '' };
let csrfToken = '';
let authMode = 'login';
let lastAccountId = localStorage.getItem(ACCOUNT_KEY) || '';
const settings = {
  theme: localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',
  sound: localStorage.getItem(SOUND_KEY) !== '0',
  notify: localStorage.getItem(NOTIFY_KEY) === '1',
  mic: localStorage.getItem(MIC_KEY) || '',
  cam: localStorage.getItem(CAM_KEY) || '',
  speaker: localStorage.getItem(SPEAKER_KEY) || '',
};

let source = null;
let users = [];
let friends = [];
let conversations = [];
let seen = loadSeen();
let drafts = loadDrafts();
let activeId = localStorage.getItem(CHANNEL_KEY) || 'general';
let typingByChannel = new Map();
let replyTo = null;
let editingId = null;
let searchQuery = '';
let uploadInProgress = false;
let uploads = [];
let jumpCount = 0;
let callLog = [];
let selectedMessageId = null;
let lastDialogTrigger = null;
let pendingDeepLink = null;
let globalSearchTimer = null;
let globalSearchRequest = 0;
let mentionQuery = null;
let mentionIndex = 0;
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentionCandidates(conversation) {
  let list = [];
  if (conversation?.type === 'group' && Array.isArray(conversation.members) && conversation.members.length) {
    list = conversation.members;
  } else if (conversation?.type === 'dm' && conversation.peerId) {
    list = [...users, { id: conversation.peerId, name: conversation.name }];
  } else {
    list = users;
  }
  const seenIds = new Set();
  return list.filter((user) => {
    if (!user || !user.id || !user.name || seenIds.has(user.id)) return false;
    seenIds.add(user.id);
    return true;
  });
}

function linkify(text, conversation) {
  const fragment = document.createDocumentFragment();
  const names = mentionCandidates(conversation)
    .map((user) => user.name)
    .sort((a, b) => b.length - a.length);
  const urlSource = 'https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?\'"]';
  const mentionSource = names.length ? `@(?:${names.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}_])` : '';
  const pattern = new RegExp(`(${[urlSource, mentionSource].filter(Boolean).join('|')})`, 'gu');
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index));
    const value = match[0];
    if (value.startsWith('@')) {
      const mention = make('span', 'mention', value);
      mention.title = value.slice(1);
      fragment.append(mention);
    } else {
      const link = make('a', 'msg-link', value);
      link.href = value;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      fragment.append(link);
    }
    lastIndex = match.index + value.length;
  }
  if (lastIndex < text.length) fragment.append(text.slice(lastIndex));
  return fragment;
}

function announce(text) {
  if (!text) return;
  els.liveRegion.textContent = '';
  setTimeout(() => {
    els.liveRegion.textContent = text;
  }, 40);
}

function motionReduced() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function scrollBehavior() {
  return motionReduced() ? 'auto' : 'smooth';
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

const dialogReturnFocus = new WeakMap();

function focusableElements(container) {
  return [...container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hidden && element.offsetParent !== null);
}

function openDialog(dialog, focusTarget) {
  if (!dialog) return;
  closeChatMenu();
  dialogReturnFocus.set(dialog, document.activeElement);
  dialog.hidden = false;
  requestAnimationFrame(() => {
    const target = focusTarget || focusableElements(dialog)[0];
    target?.focus();
  });
}

function closeDialog(dialog) {
  if (!dialog || dialog.hidden) return;
  dialog.hidden = true;
  const trigger = dialogReturnFocus.get(dialog);
  dialogReturnFocus.delete(dialog);
  if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') trigger.focus();
}

function topOpenDialog() {
  const dialogs = [...document.querySelectorAll('.overlay')].filter((dialog) => !dialog.hidden);
  return dialogs[dialogs.length - 1] || null;
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const dialog = topOpenDialog();
  if (!dialog) return;
  const focusable = focusableElements(dialog);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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

function saveDrafts() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    // Storage may be full or unavailable.
  }
}

function saveDraft(channelId) {
  if (!channelId) return;
  const value = els.input.value;
  if (value.trim()) drafts[channelId] = value;
  else delete drafts[channelId];
  saveDrafts();
}

function loadDraft(channelId) {
  els.input.value = drafts[channelId] || '';
  autoResize();
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

function formatProfile(user) {
  if (!user) return '';
  const fullName = user.fullName || user.peerFullName || '';
  const creds = user.credentials || user.peerCredentials || '';
  return [fullName, creds].filter(Boolean).join(' | ');
}

function baseSubtitle(conversation) {
  if (!conversation) return 'No messages yet';
  if (conversation.type === 'dm') {
    const peer = users.find((user) => user.id === conversation.peerId) || {};
    const status = peer.id ? 'Online now' : 'Offline';
    const details = formatProfile({ fullName: peer.fullName || conversation.peerFullName, credentials: peer.credentials || conversation.peerCredentials });
    return details ? status + ' | ' + details : status;
  }
  if (conversation.type === 'group') {
    return (conversation.members?.length || 0) + ' member' + (conversation.members?.length === 1 ? '' : 's');
  }
  const online = users.length;
  const scope = conversation.type === 'room' ? 'public room' : 'room';
  return online + ' online | ' + (conversation.history?.length || 0) + ' message' + (conversation.history?.length === 1 ? '' : 's') + ' | ' + scope;
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
    updatePinCount();
    els.menuMembers.hidden = true;
    els.leaveChat.hidden = true;
    return;
  }

  updateCallButtons(conversation);
  els.roomTitle.textContent = conversation.name;
  els.roomIcon.className = `room-icon ${conversation.type}`;
  els.menuMembers.hidden = conversation.type === 'dm';
  els.leaveChat.hidden = conversation.type !== 'group';
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
  } else if (conversation.type === 'room') {
    els.input.placeholder = `Message #${conversation.name}…`;
  } else {
    els.input.placeholder = `Message ${conversation.name}…`;
  }

  els.subtitle.textContent = baseSubtitle(conversation);
  updatePinCount();
}

/* ---------- Message rendering ---------- */

function messagePreview(message) {
  if (!message) return 'No messages yet';
  if (message.deleted) return `${message.name} unsent a message`;
  if (message.kind === 'file') {
    const name = message.file?.name || 'Attachment';
    const caption = (message.text || '').trim();
    return caption && caption !== name ? `📎 ${name} · ${caption}` : `📎 ${name}`;
  }
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
  } else if (conversation.type === 'room') {
    title.textContent = `# ${conversation.name}`;
    empty.append(logo, title, 'This is a public room. Everyone connected to this network can join the conversation.');
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

function buildFileBubble(message, conversation) {
  const file = message.file;
  const wrap = make('div', 'file-msg');
  const isImage = ['image/png','image/jpeg','image/gif','image/webp'].includes(file.type);

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
  const caption = (message.text || '').trim();
  if (caption && caption !== file.name) {
    const cap = make('div', 'file-caption-text');
    cap.append(linkify(caption, conversation));
    wrap.append(cap);
  }
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
  row.tabIndex = -1;
  if (Array.isArray(message.mentions) && message.mentions.includes(me.id)) row.classList.add('mentioned');

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
    let displayName = mine ? message.name + ' (you)' : message.name;
    if (conversation.type === 'dm' && !mine) {
      const peer = users.find((user) => user.id === message.userId) || {};
      const fullName = peer.fullName || conversation.peerFullName || '';
      if (fullName) displayName += ' (' + fullName + ')';
    }
    const name = make('span', 'name', displayName);
    const time = make('span', 'msg-time', formatTime(message.time));
    head.append(name, time);
    body.append(head);
  }

  if (message.deleted) {
    row.classList.add('is-unsent');
    const pad = make('div', 'msg-unsent');
    const icon = make('span', 'msg-unsent-icon');
    icon.innerHTML = ICONS.unsent;
    pad.append(
      icon,
      make('span', 'msg-unsent-text', `${mine ? 'You' : message.name} unsent a message`),
      make('span', 'msg-unsent-time', formatTime(message.time)),
    );
    body.append(pad);
    row.append(body);
    return row;
  }

  if (message.pinnedAt) {
    body.append(make('div', 'pinned-label', 'Pinned message'));
  }
  if (message.replyTo) body.append(buildReplyQuote(message));

  if (message.kind === 'file' && message.file) {
    body.append(buildFileBubble(message, conversation));
  } else {
    const text = make('div', 'msg-text');
    text.append(linkify(message.text || '', conversation));
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
  const pinButton = actionButton(
    ICONS.pin,
    message.pinnedAt ? 'Unpin message' : 'Pin message',
    () => togglePin(message, conversation),
  );
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
  actions.append(reactButton, replyButton, pinButton, copyButton);

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
  wireMessageGestures(row, message);
  return row;
}

function revealMessageActions(row) {
  document.querySelectorAll('.msg.actions-open').forEach((entry) => {
    if (entry !== row) entry.classList.remove('actions-open');
  });
  row.classList.add('actions-open');
}

function wireMessageGestures(row, message) {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let moved = false;
  let longPress = null;

  const reset = () => {
    tracking = false;
    moved = false;
    clearTimeout(longPress);
    longPress = null;
    row.classList.remove('swiping');
    row.style.transform = '';
  };

  row.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    if (event.target.closest('button, a, img, input, textarea, .reaction-picker')) return;
    startX = event.clientX;
    startY = event.clientY;
    tracking = true;
    moved = false;
    longPress = setTimeout(() => {
      if (tracking && !moved) {
        revealMessageActions(row);
        try {
          navigator.vibrate?.(20);
        } catch {
          // Vibration is optional.
        }
      }
    }, 430);
  });

  row.addEventListener('pointermove', (event) => {
    if (!tracking) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx)) {
      reset();
      return;
    }
    if (dx > 8 && Math.abs(dy) < 36) {
      moved = true;
      clearTimeout(longPress);
      row.classList.add('swiping');
      row.style.transform = `translateX(${Math.min(dx * 0.55, 78)}px)`;
    }
  });

  row.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const shouldReply = dx > 56 && Math.abs(dy) < 40;
    reset();
    if (shouldReply) {
      startReply(message);
      try {
        navigator.vibrate?.(15);
      } catch {
        // Vibration is optional.
      }
    }
  });

  row.addEventListener('pointercancel', reset);

  row.addEventListener('click', (event) => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (event.target.closest('button, a, img, input, textarea, .reaction-picker, .reply-quote, .file-download')) return;
    if (row.classList.contains('actions-open')) row.classList.remove('actions-open');
    else revealMessageActions(row);
  });
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
  updatePinCount();

  if (scroll || wasNearBottom) scrollToBottom();
  else els.messages.scrollTop = previousScroll;

  updateScrollButton();
  if (!query) markReads(conversation);
}

function jumpTo(messageId) {
  const target = els.messages.querySelector(`[data-mid="${CSS.escape(messageId)}"]`);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  target.classList.add('highlight');
  setTimeout(() => target.classList.remove('highlight'), 1300);
}

function selectMessageRow(row) {
  if (!row) return;
  els.messages.querySelectorAll('.msg.selected').forEach((entry) => entry.classList.remove('selected'));
  row.classList.add('selected');
  selectedMessageId = row.dataset.mid || null;
  row.focus({ preventScroll: false });
}

function moveMessageSelection(direction) {
  const rows = [...els.messages.querySelectorAll('.msg')];
  if (rows.length === 0) return;
  let index = rows.findIndex((row) => row === document.activeElement || row.dataset.mid === selectedMessageId);
  if (index < 0) index = direction > 0 ? -1 : rows.length;
  index = Math.max(0, Math.min(rows.length - 1, index + direction));
  selectMessageRow(rows[index]);
}

function messageById(messageId) {
  return (activeConversation()?.history || []).find((message) => message.id === messageId) || null;
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
    const draft = drafts[conversation.id];
    const preview = make('span', 'channel-preview', draft ? `Draft: ${draft}` : messagePreview(last));
    if ((last && last.kind === 'file') || draft) preview.classList.add('muted');
    bottom.append(preview);

    const unread = unreadCount(conversation);
    if (unread > 0) {
      const badge = make('span', 'unread', unread > 99 ? '99+' : String(unread));
      bottom.append(badge);
    } else if (draft) {
      bottom.append(make('span', 'tag draft-tag', 'Draft'));
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

function conversationMembers(conversation) {
  if (conversation?.type === 'group') {
    const members = (conversation.members || []).map((member) => {
      const live = users.find((user) => user.id === member.id);
      return {
        id: member.id,
        name: live?.name || member.name || 'Unknown device',
        fullName: live?.fullName || '',
        credentials: live?.credentials || '',
        online: Boolean(live) || member.id === me.id,
      };
    });
    if (!members.some((member) => member.id === me.id)) {
      members.push({ id: me.id, name: me.name, fullName: me.fullName, credentials: '', online: true });
    }
    return members.sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name));
  }

  return users.map((user) => ({ ...user, online: true }));
}

function isFriend(userId) {
  return friends.some((friend) => friend.id === userId);
}

function friendActionButton(user) {
  const button = make('button', 'friend-action', isFriend(user.id) ? '\u2605' : '+');
  button.type = 'button';
  const friend = isFriend(user.id);
  const label = friend ? `Remove ${user.name} from friends` : `Add ${user.name} as a friend`;
  button.title = label;
  button.setAttribute('aria-label', label);
  if (friend) button.classList.add('is-friend');
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (friend) removeFriend(user);
    else addFriend(user);
  });
  return button;
}

async function addFriend(user) {
  try {
    const data = await postJson('/api/friends', { friendId: user.id });
    if (Array.isArray(data.friends)) friends = data.friends;
    renderFriends();
    renderUsers();
    toast(`${user.name} added to friends`);
  } catch (error) {
    toast(`Could not add friend: ${error.message}`, 'error');
  }
}

async function removeFriend(user) {
  try {
    const data = await postJson('/api/friends/remove', { friendId: user.id });
    if (Array.isArray(data.friends)) friends = data.friends;
    renderFriends();
    renderUsers();
    toast(`${user.name} removed from friends`);
  } catch (error) {
    toast(`Could not remove friend: ${error.message}`, 'error');
  }
}

function renderFriends() {
  if (!els.friends) return;
  const onlineIds = new Set(users.map((user) => user.id));
  const list = [...friends].sort((a, b) => {
    return Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id)) || a.name.localeCompare(b.name);
  });
  const onlineCount = list.filter((friend) => onlineIds.has(friend.id)).length;
  els.friendsCount.textContent = String(onlineCount);
  els.friendsCount.title = `${onlineCount} of ${list.length} friends online`;
  els.friendsEmpty.hidden = list.length > 0;
  els.friends.replaceChildren();

  for (const friend of list) {
    const online = onlineIds.has(friend.id);
    const li = make('li', 'clickable');
    if (!online) li.classList.add('offline');
    li.title = `Message ${friend.name}`;

    const avatar = make('div', 'avatar', initials(friend.name));
    avatar.style.background = avatarColor(friend.name);

    const info = make('div', 'user-info');
    info.append(make('span', 'user-name', friend.name));
    info.append(make('span', 'user-meta', online ? 'Online' : 'Offline'));

    const dot = make('span', 'presence-dot');
    dot.title = online ? 'Online' : 'Offline';

    li.append(avatar, info, dot, friendActionButton(friend));
    li.addEventListener('click', () => openDm(friend));
    els.friends.append(li);
  }
}

function renderUsers() {
  const conversation = activeConversation();
  const members = conversationMembers(conversation);
  const isGroup = conversation?.type === 'group';
  if (els.membersTitle) els.membersTitle.textContent = isGroup ? 'Members' : 'Online';
  els.onlineCount.textContent = String(isGroup ? members.length : users.length);
  els.users.replaceChildren();

  for (const user of members) {
    const li = make('li');
    if (user.id === me.id) li.classList.add('is-me');
    if (!user.online) li.classList.add('offline');

    const avatar = make('div', 'avatar', initials(user.name));
    avatar.style.background = avatarColor(user.name);

    const info = make('div', 'user-info');
    info.append(make('span', 'user-name', user.name));
    const metaText = formatProfile(user);
    if (metaText) info.append(make('span', 'user-meta', metaText));
    if (!user.online) info.append(make('span', 'user-meta', 'Offline'));

    const dot = make('span', 'presence-dot');
    dot.title = user.online ? 'Online' : 'Offline';

    li.append(avatar, info, dot);

    if (user.id === me.id) {
      li.append(make('span', 'you', 'you'));
    } else if (user.online) {
      li.classList.add('clickable');
      li.title = `Send ${user.name} a private message`;
      li.addEventListener('click', () => openDm(user));
      li.insertBefore(friendActionButton(user), dot);
    }

    els.users.append(li);
  }

  if (conversation) updateHeader(conversation);
}

function setActive(id) {
  const conversation = getConversation(id);
  if (!conversation) return;
  const wasEditing = Boolean(editingId);
  if (!wasEditing) saveDraft(activeId);
  markSeen(activeConversation());
  activeId = id;
  localStorage.setItem(CHANNEL_KEY, activeId);
  markSeen(conversation);
  clearComposerState();
  loadDraft(activeId);
  if (wasEditing) closeMentionMenu();
  closeSearch();
  renderChannels();
  updateHeader(conversation);
  renderUsers();
  renderMessages({ scroll: true });
  els.app.classList.remove('sidebar-open', 'members-open');
  els.input.focus();
}

function openDm(peer) {
  if (!peer || peer.id === me.id) return;
  const id = dmChannelId(me.id, peer.id);
  const existing = getConversation(id);
  if (!existing) {
    conversations.push({
      id,
      type: 'dm',
      name: peer.name,
      peerId: peer.id,
      peerFullName: peer.fullName || '',
      peerCredentials: peer.credentials || '',
      online: true,
      history: [],
      unread: 0,
      lastTime: Date.now(),
    });
  } else {
    existing.name = peer.name;
    existing.peerFullName = peer.fullName || existing.peerFullName || '';
    existing.peerCredentials = peer.credentials || existing.peerCredentials || '';
  }
  setActive(id);
}

/* ---------- Message actions ---------- */

async function apiJson(url, options) {
  const accountAtStart=me.id;
  const response = await fetch(apiUrl(url), { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if(accountAtStart && accountAtStart!==me.id) throw new Error('Account changed. Please retry.');
  if (response.status === 401 && me.id) { clearAccountState(); location.reload(); }
  if (!response.ok) throw new Error(data.error || `Server responded ${response.status}`);
  return data;
}

function postJson(url, body) {
  return apiJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) },
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

async function togglePin(message, conversation) {
  try {
    const data = await postJson('/api/messages/pin', {
      userId: me.id,
      channel: conversation.id,
      messageId: message.id,
      action: message.pinnedAt ? 'remove' : 'add',
    });
    if (data.message) upsertMessage(data.message);
    toast(message.pinnedAt ? 'Message unpinned' : 'Message pinned');
  } catch (error) {
    toast(`Could not update pin: ${error.message}`, 'error');
  }
}

function pinnedMessages(conversation = activeConversation()) {
  return (conversation?.history || []).filter((message) => message.pinnedAt);
}

function updatePinCount() {
  const count = pinnedMessages().length;
  els.pinCount.textContent = count > 9 ? '9+' : String(count);
  els.pinCount.hidden = count === 0;
  els.togglePins.setAttribute('aria-label', count ? `${count} pinned messages` : 'Pinned messages');
}

function openPins() {
  const conversation = activeConversation();
  const pinned = pinnedMessages(conversation);
  els.pinsSubtitle.textContent = conversation
    ? `Pinned messages in ${conversation.name}.`
    : 'Pinned messages from this conversation.';
  els.pinsList.replaceChildren();

  if (pinned.length === 0) {
    els.pinsList.append(make('li', 'info-empty', 'No pinned messages yet. Use the pin action on any message.'));
  }

  for (const message of pinned) {
    const li = make('li', 'info-item pin-item');
    const main = make('button', 'info-main');
    main.type = 'button';
    main.append(
      make('strong', null, message.name),
      make('span', null, (message.kind === 'file' ? message.file?.name : message.text || '').slice(0, 160)),
      make('time', null, formatTime(message.time)),
    );
    main.addEventListener('click', () => {
      closeDialog(els.pinsDialog);
      jumpTo(message.id);
    });
    const unpin = make('button', 'info-action', 'Unpin');
    unpin.type = 'button';
    unpin.addEventListener('click', () => {
      togglePin(message, conversation);
      closeDialog(els.pinsDialog);
    });
    li.append(main, unpin);
    els.pinsList.append(li);
  }

  openDialog(els.pinsDialog, els.pinsClose);
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

function markMessageDeleted(message) {
  message.deleted = true;
  message.text = '';
  message.kind = 'deleted';
  message.file = null;
  message.replyTo = null;
  message.reactions = null;
  message.pinnedAt = null;
}

async function deleteMessage(message, conversation) {
  if (!window.confirm('Delete this message? This cannot be undone.')) return;
  try {
    await postJson('/api/messages/delete', {
      id: me.id,
      channel: conversation.id,
      messageId: message.id,
    });
    const target = (conversation.history || []).find((entry) => entry.id === message.id);
    if (target) markMessageDeleted(target);
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

function deepLinkFor(conversation, message) {
  const params = new URLSearchParams({ channel: conversation.id });
  if (message?.id) params.set('message', message.id);
  return `${location.origin}/#${params}`;
}

function parseDeepLink() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''));
  const channel = params.get('channel');
  if (!channel) return null;
  return { channel, message: params.get('message') || '' };
}

function applyDeepLink(link = parseDeepLink()) {
  if (!link) return false;
  if (!getConversation(link.channel)) {
    pendingDeepLink = link;
    return false;
  }
  pendingDeepLink = null;
  setActive(link.channel);
  if (link.message) requestAnimationFrame(() => jumpTo(link.message));
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  } catch {
    // URL cleanup is optional.
  }
  return true;
}

function openNotificationTarget(conversation, message) {
  window.focus();
  setActive(conversation.id);
  if (message?.id) jumpTo(message.id);
}

function showNotification(conversation, message) {
  if (!settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const body = message.kind === 'file' ? `Sent a file: ${message.file?.name || ''}` : message.text || '';
  const title = `${message.name} · ${conversation.name}`;
  const options = {
    body: body.slice(0, 160),
    icon: '/logo.svg',
    tag: conversation.id,
    data: { url: deepLinkFor(conversation, message) },
  };

  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, options))
      .catch(() => {
        try {
          const notification = new Notification(title, options);
          notification.onclick = () => {
            openNotificationTarget(conversation, message);
            notification.close();
          };
        } catch {
          // Notifications are optional.
        }
      });
    return;
  }

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      openNotificationTarget(conversation, message);
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
    const peer = users.find((user) => user.id === peerId) || {};
    return {
      id: message.channel,
      type: 'dm',
      name: peer.name || peerName,
      peerId,
      peerFullName: peer.fullName || '',
      peerCredentials: peer.credentials || '',
      online: users.some((user) => user.id === peerId),
      history: [],
      unread: 0,
      lastTime: message.time,
    };
  }

  const isGroup = message.channel?.startsWith('group:');
  const isRoom = message.channel?.startsWith('room:');
  return {
    id: message.channel || 'general',
    type: isGroup ? 'group' : isRoom ? 'room' : 'general',
    name: isGroup ? 'Group' : isRoom ? 'Room' : 'General',
    groupId: isGroup ? message.channel.slice(6) : undefined,
    roomId: isRoom ? message.channel.slice(5) : undefined,
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
    const mentioned = Array.isArray(message.mentions) && message.mentions.includes(me.id);
    const preview = message.kind === 'file' ? message.file?.name || 'Attachment' : message.text || '';
    announce(`${message.name} in ${conversation.name}: ${preview}`);
    if (away || mentioned) {
      beep(mentioned ? 980 : 860, 0.16, 0.06);
      showNotification(conversation, message);
    }
    if (mentioned && conversation.id !== activeId) {
      toast(`${message.name} mentioned you in ${conversation.name}`);
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
  const message = (conversation.history || []).find((entry) => entry.id === data.id);
  if (message) markMessageDeleted(message);
  else conversation.history = (conversation.history || []).filter((entry) => entry.id !== data.id);
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

  const previousActive = activeId;
  if (!getConversation(activeId) && conversations.length) {
    activeId = conversations[0].id;
    localStorage.setItem(CHANNEL_KEY, activeId);
  }
  if (previousActive !== activeId) loadDraft(activeId);

  renderChannels();
  updateHeader(activeConversation());
  renderUsers();
  renderMessages({ scroll: false });
}

/* ---------- Calls (WebRTC) ---------- */

const RTC_CONFIG = { iceServers: [] };
const RING_TIMEOUT = 35_000;
const CONNECT_TIMEOUT = 15_000;

let call = null;
let callTimerId = null;
let ringInterval = null;
let ringCtx = null;
const earlyIce = new Map();

function configureRtc(config) {
  const port = Number(config?.stunPort);
  if (!port) return;
  let host = location.hostname;
  if (SERVER_URL) {
    try {
      host = new URL(SERVER_URL, location.href).hostname;
    } catch {
      // Fall back to the page host.
    }
  }
  if (!host) return;
  if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
  const urls = `stun:${host}:${port}`;
  if (!RTC_CONFIG.iceServers.some((entry) => entry.urls === urls)) {
    RTC_CONFIG.iceServers.push({ urls });
  }
}

function mediaConstraints(withVideo) {
  const audio = settings.mic ? { deviceId: { ideal: settings.mic } } : true;
  let video = false;
  if (withVideo) {
    video = { facingMode: 'user' };
    if (settings.cam) video.deviceId = { ideal: settings.cam };
  }
  return { audio, video };
}

function clearRingTimeout(current = call) {
  if (current?.ringTimeout) {
    clearTimeout(current.ringTimeout);
    current.ringTimeout = null;
  }
}

function armRingTimeout() {
  if (!call || call.state === 'active') return;
  clearRingTimeout(call);
  const callId = call.callId;
  const role = call.role;
  call.ringTimeout = setTimeout(() => {
    if (!call || call.callId !== callId || call.state === 'active') return;
    endCall(role === 'callee' ? 'Missed call' : 'No answer', role === 'callee' ? 'decline' : 'hangup');
    toast(role === 'callee' ? 'Missed call' : 'No answer');
  }, RING_TIMEOUT);
}

function armConnectTimeout() {
  const current = call;
  if (!current || current.connectTimeout) return;
  current.connectTimeout = setTimeout(() => {
    if (!call || call !== current) return;
    if (current.pc?.connectionState === 'connected') return;
    endCall('Call could not connect', 'hangup');
    toast('Call could not connect. Check that both devices can reach each other on this network.', 'error');
  }, CONNECT_TIMEOUT);
}

function clearConnectTimeout(current = call) {
  if (current?.connectTimeout) {
    clearTimeout(current.connectTimeout);
    current.connectTimeout = null;
  }
}

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
  clearRingTimeout();
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
  els.callShare.hidden = !active || !call.withVideo;
  els.callDevices.hidden = !active && !incoming;
  els.callHangup.hidden = incoming;
  els.callMute.textContent = call.muted ? 'Unmute' : 'Mute';
  els.callShare.textContent = call.screenStream ? 'Stop sharing' : 'Share screen';
  els.callRemoteVideo.hidden = !showVideo;
  els.callLocalVideo.hidden = !showVideo;
  els.callAvatar.hidden = showVideo;
  els.callTimer.hidden = !call.startedAt;

  if (incoming) {
    els.callStatus.textContent = call.withVideo ? 'Incoming video call…' : 'Incoming call…';
  } else if (call.state === 'outgoing') {
    els.callStatus.textContent = call.withVideo ? 'Starting video call…' : 'Calling…';
  } else {
    const connected = call.pc?.connectionState === 'connected';
    if (mediaBlocked) {
      els.callStatus.textContent = 'Tap the screen to enable audio/video';
    } else {
      els.callStatus.textContent = !call.startedAt || !connected
        ? 'Connecting media…'
        : call.withVideo ? 'Video call' : 'Audio call';
    }
    if (call.remoteStream) resumeCallMedia();
  }
}

let mediaBlocked = false;

async function resumeCallMedia() {
  const current = call;
  if (!current) return;
  const media = current.withVideo ? els.callRemoteVideo : els.callRemoteAudio;
  if (!media.srcObject) return;
  try {
    await media.play();
    if (mediaBlocked && call) {
      mediaBlocked = false;
      renderCallUi();
    }
  } catch {
    if (!call) return;
    mediaBlocked = true;
    if (call.state === 'active') els.callStatus.textContent = 'Tap the screen to enable audio/video';
  }
}

function attachRemoteStream() {
  if (!call || !call.remoteStream) return;
  const stream = call.remoteStream;
  if (call.withVideo) {
    if (els.callRemoteVideo.srcObject !== stream) els.callRemoteVideo.srcObject = stream;
  } else if (els.callRemoteAudio.srcObject !== stream) {
    els.callRemoteAudio.srcObject = stream;
  }
  applySpeaker();
  resumeCallMedia();
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
      clearRingTimeout();
      clearConnectTimeout();
      call.iceAttempts = 0;
      if (call.iceTimer) {
        clearTimeout(call.iceTimer);
        call.iceTimer = null;
      }
      if (call.state === 'active' && !call.startedAt) startCallTimer();
      renderCallUi();
    } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
      scheduleIceRestart();
    }
  };

  return pc;
}

function scheduleIceRestart() {
  const current = call;
  if (!current || current.role !== 'caller' || !current.pc || current.iceTimer) return;
  if (current.pc.connectionState === 'connected') return;
  current.iceTimer = setTimeout(async () => {
    if (!call || call !== current || !current.pc) return;
    current.iceTimer = null;
    if (current.pc.connectionState === 'connected') return;
    if (current.pc.signalingState !== 'stable') return;
    try {
      current.pc.restartIce();
      const offer = await current.pc.createOffer({ iceRestart: true });
      await current.pc.setLocalDescription(offer);
      await sendSignal('offer', current.pc.localDescription);
      current.iceAttempts = (current.iceAttempts || 0) + 1;
      if (current.iceAttempts < 2) scheduleIceRestart();
      else if (current.pc.connectionState !== 'connected') endCall('Call connection failed', 'hangup');
    } catch {
      endCall('Call connection failed', 'hangup');
    }
  }, 2600);
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
    fetch(apiUrl('/api/signal'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      credentials: 'same-origin',
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
  mediaBlocked = false;
  clearRingTimeout(current);
  clearConnectTimeout(current);
  if (current.iceTimer) clearTimeout(current.iceTimer);
  current.ringTimeout = null;
  current.iceTimer = null;
  try {
    current.pc?.close();
  } catch {
    // Already closed.
  }
  current.screenStream?.getTracks().forEach((track) => track.stop());
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
  earlyIce.delete(`${current.peerId}:${current.callId}`);
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
    videoSender: null,
    screenStream: null,
    ringTimeout: null,
    connectTimeout: null,
    iceTimer: null,
    iceAttempts: 0,
  };
  renderCallUi();
  startRing();
  armRingTimeout();

  try {
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(withVideo));
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
    call.videoSender = pc.getSenders().find((sender) => sender.track?.kind === 'video') || null;

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
    const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints(call.withVideo));
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
    call.videoSender = pc.getSenders().find((sender) => sender.track?.kind === 'video') || null;

    await pc.setRemoteDescription(call.offer);
    await flushPendingIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await sendSignal('answer', pc.localDescription);

    call.offer = null;
    call.state = 'active';
    armConnectTimeout();
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

async function stopScreenShare() {
  const current = call;
  if (!current?.screenStream) return;
  const screen = current.screenStream;
  current.screenStream = null;
  const camera = current.localStream?.getVideoTracks()[0] || null;
  try {
    await current.videoSender?.replaceTrack(camera);
  } catch {
    // The sender may already be closed.
  }
  screen.getTracks().forEach((track) => track.stop());
  if (call === current) {
    els.callLocalVideo.srcObject = current.localStream;
    els.callLocalVideo.play().catch(() => {});
    renderCallUi();
  }
}

async function toggleScreenShare() {
  if (!call || call.state !== 'active' || !call.withVideo) return;
  if (call.screenStream) {
    await stopScreenShare();
    return;
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    toast('Screen sharing is not available in this browser', 'error');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    if (!call || call.state !== 'active') {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    const track = stream.getVideoTracks()[0];
    await call.videoSender?.replaceTrack(track);
    call.screenStream = stream;
    track.addEventListener('ended', () => {
      if (call?.screenStream === stream) stopScreenShare();
    });
    els.callLocalVideo.srcObject = stream;
    els.callLocalVideo.play().catch(() => {});
    renderCallUi();
  } catch (error) {
    if (error?.name !== 'NotAllowedError') toast(`Could not share screen: ${error.message}`, 'error');
  }
}

async function handleSignal(signal) {
  if (!signal || !signal.fromId || signal.fromId === me.id) return;

  if (signal.type === 'offer') {
    if (call) {
      if (call.callId === signal.callId) {
        if (call.pc && call.state === 'active' && signal.data) {
          try {
            await call.pc.setRemoteDescription(signal.data);
            await flushPendingIce();
            const answer = await call.pc.createAnswer();
            await call.pc.setLocalDescription(answer);
            await sendSignal('answer', call.pc.localDescription);
          } catch (error) {
            endCall(`Call connection failed: ${error.message}`, 'hangup');
          }
        }
        return;
      }
      sendSignalBeacon({ peerId: signal.fromId, callId: signal.callId }, 'busy');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      sendSignalBeacon({ peerId: signal.fromId, callId: signal.callId }, 'decline');
      return;
    }
    const iceKey = `${signal.fromId}:${signal.callId}`;
    call = {
      callId: signal.callId,
      peerId: signal.fromId,
      peerName: signal.fromName || 'Unknown device',
      role: 'callee',
      state: 'incoming',
      withVideo: Boolean(signal.data && /m=video/.test(signal.data.sdp || '')),
      muted: false,
      pendingIce: earlyIce.get(iceKey) || [],
      offer: signal.data,
      startedAt: 0,
      pc: null,
      localStream: null,
      remoteStream: null,
      videoSender: null,
      screenStream: null,
      ringTimeout: null,
      connectTimeout: null,
      iceTimer: null,
      iceAttempts: 0,
    };
    earlyIce.delete(iceKey);
    renderCallUi();
    startRing();
    armRingTimeout();
    return;
  }

  if (signal.type === 'ice' && signal.data && (!call || call.callId !== signal.callId)) {
    const key = `${signal.fromId}:${signal.callId}`;
    const queued = earlyIce.get(key) || [];
    queued.push(signal.data);
    if (queued.length > 64) queued.shift();
    earlyIce.set(key, queued);
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
      armConnectTimeout();
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
  setStatus('Connecting.', '');
  source = new EventSource(apiUrl('/events'));

  source.addEventListener('open', () => setStatus(`Connected · ${location.host}`, 'connected'));

  source.addEventListener('name-taken', (event) => {
    let taken = '';
    try {
      taken = JSON.parse(event.data).name || '';
    } catch {
      // Ignore malformed payloads.
    }
    source.close();
    source = null;
    me.name = '';
    me.fullName = '';
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(FULL_NAME_KEY);
    setStatus('Choose another name.', 'error');
    toast(`The name "${taken || 'you picked'}" is already in use. Pick a different one.`, 'error');
    askForName(true);
  });

  source.addEventListener('init', (event) => {
    const data = JSON.parse(event.data);
    if (data.config) {
      if (data.config.maxName) MAX_NAME = data.config.maxName;
      if (data.config.maxFullName) MAX_FULL_NAME = data.config.maxFullName;
      if (data.config.maxGroupName) MAX_GROUP_NAME = data.config.maxGroupName;
      if (data.config.maxText) MAX_TEXT = data.config.maxText;
      configureRtc(data.config);
    }
    users = data.users || [];
    friends = data.friends || [];
    callLog = data.calls || [];
    renderUsers();
    renderFriends();
    applyConversations(data.conversations);
    applyDeepLink(pendingDeepLink || parseDeepLink());
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
    renderFriends();
    for (const conversation of conversations) {
      if (conversation.type === 'dm') {
        conversation.online = users.some((user) => user.id === conversation.peerId);
      }
    }
  });

  source.addEventListener('friends', (event) => {
    try {
      friends = JSON.parse(event.data).friends || [];
      renderFriends();
      renderUsers();
    } catch {
      // Ignore malformed payloads.
    }
  });

  source.addEventListener('group-members', (event) => {
    try {
      const data = JSON.parse(event.data);
      const conversation = getConversation(data.channel);
      if (!conversation) return;
      conversation.members = data.members || [];
      renderUsers();
      if (conversation.id === activeId) updateHeader(conversation);
    } catch {
      // Ignore malformed payloads.
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

  source.addEventListener('calls', (event) => {
    try {
      callLog = JSON.parse(event.data).calls || [];
      if (!els.callsDialog.hidden) renderCallHistory();
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
    if(me.id) apiJson('/api/auth/me').catch(() => {});
    setStatus('Disconnected — retrying…', 'offline');
  });
}

/* ---------- Composer ---------- */

function autoResize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
}

function closeMentionMenu() {
  mentionQuery = null;
  mentionIndex = 0;
  els.mentionMenu.hidden = true;
  els.mentionMenu.replaceChildren();
}

function updateMentionMenu() {
  const conversation = activeConversation();
  if (!conversation) return closeMentionMenu();
  const caret = els.input.selectionStart || 0;
  const before = els.input.value.slice(0, caret);
  const match = /(?:^|\s)@([\p{L}\p{N}_.-]*)$/u.exec(before);
  if (!match) return closeMentionMenu();

  const query = match[1].toLowerCase();
  const options = mentionCandidates(conversation)
    .filter((user) => user.id !== me.id && user.name.toLowerCase().includes(query))
    .slice(0, 6);
  if (options.length === 0) return closeMentionMenu();

  mentionQuery = { start: match.index + match[0].lastIndexOf('@'), options, query };
  mentionIndex = Math.min(mentionIndex, options.length - 1);
  els.mentionMenu.replaceChildren();

  options.forEach((user, index) => {
    const button = make('button', `mention-option${index === mentionIndex ? ' active' : ''}`);
    button.type = 'button';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(index === mentionIndex));
    const avatar = make('span', 'avatar', initials(user.name));
    avatar.style.background = avatarColor(user.name);
    button.append(avatar, make('span', null, user.name));
    button.addEventListener('mousedown', (event) => {
      event.preventDefault();
      chooseMention(user);
    });
    els.mentionMenu.append(button);
  });

  els.mentionMenu.hidden = false;
}

function chooseMention(user) {
  if (!mentionQuery) return;
  const caret = els.input.selectionStart || 0;
  const before = els.input.value.slice(0, mentionQuery.start);
  const after = els.input.value.slice(caret);
  const inserted = `@${user.name} `;
  els.input.value = `${before}${inserted}${after}`;
  const nextCaret = before.length + inserted.length;
  els.input.setSelectionRange(nextCaret, nextCaret);
  closeMentionMenu();
  autoResize();
  noteTyping();
  saveDraft(activeId);
  els.input.focus();
}

function mentionsInText(text, conversation) {
  return mentionCandidates(conversation)
    .filter((user) => user.id !== me.id && text.includes(`@${user.name}`))
    .map((user) => user.id);
}

async function sendMessage() {
  if (uploadInProgress) return;
  const conversation = activeConversation();
  if (!conversation) return;
  const text = els.input.value.trim();
  const pendingFiles = uploads.filter((item) => item.status === 'pending' && item.channel === conversation.id);

  if (!editingId && pendingFiles.length > 0) {
    await sendFilesWithMessage(conversation, pendingFiles, text);
    return;
  }
  if (!text) return;

  els.send.disabled = true;
  els.input.value = '';
  autoResize();
  stopTyping();
  closeMentionMenu();

  const targetId = conversation.id;
  const pendingReply = replyTo;
  const editing = editingId;
  const mentions = mentionsInText(text, conversation);

  try {
    if (editing) {
      await postJson('/api/messages/edit', {
        id: me.id,
        name: me.name,
        channel: conversation.id,
        messageId: editing,
        text,
        mentions,
      });
      if (activeId === targetId && editingId === editing) {
        editingId = null;
        updateComposerBanner();
      }
    } else {
      await postJson('/api/messages', {
        id: me.id,
        name: me.name,
        text,
        channel: conversation.id,
        replyTo: pendingReply?.id || null,
        mentions,
      });
      if (activeId === targetId && pendingReply && replyTo?.id === pendingReply.id) {
        replyTo = null;
        updateComposerBanner();
      }
    }
    if (!editing) {
      delete drafts[conversation.id];
      saveDrafts();
      renderChannels();
    }
  } catch (error) {
    if (me.id && activeId === targetId) {
      if (!els.input.value) {
        els.input.value = text;
        autoResize();
      }
      if (editing && !editingId) editingId = editing;
      if (pendingReply && !replyTo) replyTo = pendingReply;
      updateComposerBanner();
    }
    toast(error.message, 'error');
  } finally {
    els.send.disabled = false;
    if (activeId === targetId) els.input.focus();
  }
}

async function sendFilesWithMessage(conversation, items, text) {
  const targetId = conversation.id;
  const pendingReply = replyTo;
  els.send.disabled = true;
  els.input.value = '';
  autoResize();
  stopTyping();
  closeMentionMenu();

  let firstFailed = false;
  let captionPending = text;
  try {
    for (const item of items) {
      if (item.status !== 'pending') continue;
      const sent = await sendPendingItem(item, { caption: captionPending });
      if (!sent && captionPending === text) firstFailed = true;
      captionPending = '';
    }
    delete drafts[conversation.id];
    saveDrafts();
    renderChannels();
    if (activeId === targetId && pendingReply && replyTo?.id === pendingReply.id) {
      replyTo = null;
      updateComposerBanner();
    }
  } finally {
    els.send.disabled = false;
    if (firstFailed && activeId === targetId && text && !els.input.value) {
      els.input.value = text;
      autoResize();
    }
    if (activeId === targetId) els.input.focus();
  }
}

function renderUploads() {
  els.uploadPanel.replaceChildren();
  if (uploads.length === 0) {
    els.uploadPanel.hidden = true;
    return;
  }

  els.uploadPanel.hidden = false;

  const pending = uploads.filter((item) => item.status === 'pending');
  if (pending.length > 1) {
    const bar = make('div', 'upload-bulk');
    bar.append(make('span', 'upload-bulk-label', pending.length + ' files ready to send'));
    const sendAll = make('button', 'upload-send', 'Send all');
    sendAll.type = 'button';
    sendAll.addEventListener('click', sendAllPending);
    const deleteAll = make('button', 'upload-cancel', 'Delete all');
    deleteAll.type = 'button';
    deleteAll.addEventListener('click', deleteAllPending);
    const actions = make('div', 'upload-actions');
    actions.append(sendAll, deleteAll);
    bar.append(actions);
    els.uploadPanel.append(bar);
  }

  for (const item of uploads) {
    const row = make('div', 'upload-item ' + item.status);
    const head = make('div', 'upload-head');
    let statusText = item.percent + '%';
    if (item.status === 'pending') statusText = 'Ready';
    else if (item.status === 'done') statusText = 'Sent';
    else if (item.status === 'failed') statusText = 'Failed';
    else if (item.status === 'cancelled') statusText = 'Cancelled';
    head.append(
      make('span', 'upload-name', item.file.name),
      make('span', 'upload-percent', statusText),
    );

    const track = make('div', 'upload-track');
    const bar = make('div', 'upload-bar');
    const width = item.status === 'pending' ? 0 : item.status === 'done' ? 100 : item.percent;
    bar.style.width = width + '%';
    track.append(bar);

    const actions = make('div', 'upload-actions');
    if (item.status === 'pending' || item.status === 'failed') {
      const send = make('button', 'upload-send', item.status === 'failed' ? 'Retry' : 'Send');
      send.type = 'button';
      send.addEventListener('click', () => sendPendingItem(item));
      const remove = make('button', 'upload-cancel', 'Delete');
      remove.type = 'button';
      remove.addEventListener('click', () => deleteUpload(item));
      actions.append(send, remove);
    } else if (item.status === 'uploading') {
      const cancel = make('button', 'upload-cancel', 'Cancel');
      cancel.type = 'button';
      cancel.addEventListener('click', () => cancelUpload(item));
      actions.append(cancel);
    }

    row.append(head, track, actions);
    els.uploadPanel.append(row);
  }
}

function removeUpload(item) {
  uploads = uploads.filter((entry) => entry !== item);
  renderUploads();
}

function deleteUpload(item) {
  if (!item) return;
  if (item.status === 'uploading' && item.xhr) {
    try {
      item.xhr.abort();
    } catch {
      // The request may already be finished.
    }
  }
  removeUpload(item);
  toast('Removed ' + item.file.name);
}

function deleteAllPending() {
  for (const item of uploads.filter((entry) => entry.status === 'pending')) {
    uploads = uploads.filter((entry) => entry !== item);
  }
  renderUploads();
  toast('Removed pending files');
}

function cancelUpload(item) {
  if (!item || item.status === 'done' || item.status === 'cancelled') return;
  item.cancelled = true;
  item.status = 'cancelled';
  if (item.xhr) {
    try {
      item.xhr.abort();
    } catch {
      // The request may already be finished.
    }
  }
  renderUploads();
  toast('Cancelled ' + item.file.name);
  setTimeout(() => removeUpload(item), 1200);
}

function uploadFile(item, conversation, pendingReply, caption) {
  return new Promise((resolve, reject) => {
    const file = item.file;
    const params = new URLSearchParams({
      id: me.id,
      name: me.name,
      channel: conversation.id,
      filename: file.name,
      type: file.type || 'application/octet-stream',
    });
    if (pendingReply?.id) params.set('reply', pendingReply.id);
    if (caption) params.set('caption', caption);

    const xhr = new XMLHttpRequest();
    item.xhr = xhr;
    xhr.open('POST', apiUrl('/api/files?' + params));
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
    xhr.withCredentials = true;
    xhr.responseType = 'json';

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable || item.cancelled) return;
      item.percent = Math.round((event.loaded / event.total) * 100);
      item.status = 'uploading';
      renderUploads();
    });

    xhr.addEventListener('load', () => {
      item.xhr = null;
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve(data);
      else reject(new Error(data.error || 'Server responded ' + xhr.status));
    });
    xhr.addEventListener('error', () => {
      item.xhr = null;
      reject(new Error('Upload failed'));
    });
    xhr.addEventListener('abort', () => {
      item.xhr = null;
      const error = new Error('Upload cancelled');
      error.cancelled = true;
      reject(error);
    });

    xhr.send(file);
  });
}

let statusTimer = null;

function restoreConnectionStatus() {
  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (source && source.readyState === EventSource.OPEN) {
      setStatus('Connected | ' + location.host, 'connected');
    }
  }, 2500);
}

async function sendPendingItem(item, options = {}) {
  if (!item || (item.status !== 'pending' && item.status !== 'failed')) return false;
  if (uploadInProgress) {
    toast('Please wait for the current transfer to finish.', 'error');
    return false;
  }
  const conversation = getConversation(item.channel) || activeConversation();
  if (!conversation) {
    toast('Open a conversation to send this file.', 'error');
    return false;
  }

  const composerText = options.caption === undefined && item.channel === activeId ? els.input.value.trim() : '';
  let caption;
  if (options.caption !== undefined) caption = options.caption;
  else if (composerText) caption = composerText;
  else caption = item.caption || '';
  if (caption) item.caption = caption;
  if (composerText) {
    els.input.value = '';
    autoResize();
    delete drafts[item.channel];
    saveDrafts();
    renderChannels();
  }

  item.cancelled = false;
  item.status = 'uploading';
  item.percent = 0;
  renderUploads();

  uploadInProgress = true;
  els.attach.disabled = true;
  stopTyping();
  try {
    await uploadFile(item, conversation, item.reply, caption);
    item.status = 'done';
    item.percent = 100;
    renderUploads();
    setTimeout(() => removeUpload(item), 1600);
    if (activeId === item.channel && item.reply && replyTo?.id === item.reply.id) {
      replyTo = null;
      updateComposerBanner();
    }
    return true;
  } catch (error) {
    if (error.cancelled || item.cancelled) {
      removeUpload(item);
    } else {
      item.status = 'failed';
      renderUploads();
      toast('Upload failed: ' + error.message, 'error');
    }
    if (composerText && activeId === item.channel && !els.input.value) {
      els.input.value = composerText;
      autoResize();
      saveDraft(item.channel);
    }
    return false;
  } finally {
    uploadInProgress = false;
    els.attach.disabled = false;
    els.send.disabled = false;
    restoreConnectionStatus();
    if (activeId === item.channel) els.input.focus();
  }
}

async function sendAllPending() {
  for (const item of uploads.filter((entry) => entry.status === 'pending')) {
    if (item.status !== 'pending') continue;
    await sendPendingItem(item);
  }
}

function sendFiles(fileList) {
  const files = [...fileList];
  if (files.length === 0) return;

  const conversation = activeConversation();
  if (!conversation) return;

  const pendingReply = replyTo ? { id: replyTo.id, name: replyTo.name, text: replyTo.text } : null;
  const items = files.map((file) => ({
    file,
    percent: 0,
    status: 'pending',
    cancelled: false,
    xhr: null,
    channel: conversation.id,
    reply: pendingReply,
  }));
  uploads.push(...items);
  renderUploads();
  els.uploadPanel.scrollIntoView({ block: 'nearest' });
  toast(items.length === 1 ? 'File attached — add a message if you like, then press Send.' : 'Files attached — add a message if you like, then press Send.');
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

  openDialog(els.groupDialog, els.groupName);
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
    closeDialog(els.groupDialog);

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

/* ---------- Public rooms ---------- */

function showMembersPanel() {
  closeChatMenu();
  renderUsers();
  if (window.matchMedia('(max-width: 820px)').matches) {
    els.app.classList.remove('sidebar-open');
    els.app.classList.add('members-open');
  } else {
    els.app.classList.remove('members-collapsed');
  }
}

async function leaveGroup() {
  const conversation = activeConversation();
  if (!conversation || conversation.type !== 'group') return;
  if (!window.confirm(`Leave "${conversation.name}"? You will stop receiving its messages.`)) return;
  closeChatMenu();

  try {
    await postJson('/api/groups/leave', { id: me.id, channel: conversation.id });
    conversations = conversations.filter((entry) => entry.id !== conversation.id);
    if (activeId === conversation.id) {
      const next = getConversation('general') || sortedConversations()[0];
      activeId = next ? next.id : 'general';
      localStorage.setItem(CHANNEL_KEY, activeId);
      loadDraft(activeId);
    }
    renderChannels();
    updateHeader(activeConversation());
    renderUsers();
    renderMessages({ scroll: false });
    els.app.classList.remove('sidebar-open', 'members-open');
    toast(`You left ${conversation.name}`);
  } catch (error) {
    toast(`Could not leave group: ${error.message}`, 'error');
  }
}

function openRoomDialog() {
  els.roomName.value = '';
  els.roomError.hidden = true;
  openDialog(els.roomDialog, els.roomName);
}

async function createRoom(event) {
  event.preventDefault();
  const roomName = els.roomName.value.trim().slice(0, MAX_GROUP_NAME);
  if (!roomName) {
    els.roomError.textContent = 'Give the room a name.';
    els.roomError.hidden = false;
    return;
  }
  els.roomError.hidden = true;
  const submit = els.roomForm.querySelector('button[type="submit"]');
  submit.disabled = true;

  try {
    const data = await postJson('/api/rooms', { id: me.id, name: roomName, displayName: me.name });
    closeDialog(els.roomDialog);
    if (!getConversation(data.room.channel)) {
      conversations.push({
        id: data.room.channel,
        type: 'room',
        name: data.room.name,
        roomId: data.room.id,
        history: [],
        unread: 0,
        lastTime: Date.now(),
      });
      renderChannels();
    }
    setActive(data.room.channel);
    toast(`Created #${data.room.name}`);
  } catch (error) {
    els.roomError.textContent = error.message;
    els.roomError.hidden = false;
  } finally {
    submit.disabled = false;
  }
}

/* ---------- Chat menu, search, export, calls, devices ---------- */

function closeChatMenu() {
  const hadFocus = els.chatMenuPanel.contains(document.activeElement);
  els.chatMenuPanel.hidden = true;
  els.chatMenu.setAttribute('aria-expanded', 'false');
  if (hadFocus) els.chatMenu.focus();
}

function toggleChatMenu() {
  const open = els.chatMenuPanel.hidden;
  els.chatMenuPanel.hidden = !open;
  els.chatMenu.setAttribute('aria-expanded', String(open));
  if (open) {
    const first = els.chatMenuPanel.querySelector('button');
    first?.focus();
  }
}

function openGlobalSearch() {
  closeChatMenu();
  els.globalSearchInput.value = '';
  els.globalSearchResults.replaceChildren();
  els.globalSearchStatus.textContent = 'Type at least 2 characters.';
  openDialog(els.searchDialog, els.globalSearchInput);
}

function searchResultLabel(result) {
  if (result.kind === 'file') return `📎 ${result.text || 'Attachment'}`;
  return result.text || '';
}

async function runGlobalSearch() {
  const query = els.globalSearchInput.value.trim();
  const request = ++globalSearchRequest;
  if (query.length < 2) {
    els.globalSearchResults.replaceChildren();
    els.globalSearchStatus.textContent = 'Type at least 2 characters.';
    return;
  }

  els.globalSearchStatus.textContent = 'Searching…';
  try {
    const params = new URLSearchParams({ id: me.id, q: query });
    const data = await apiJson(`/api/search?${params}`);
    if (request !== globalSearchRequest) return;
    els.globalSearchResults.replaceChildren();
    const results = data.results || [];
    els.globalSearchStatus.textContent = results.length
      ? `${results.length}${data.truncated ? '+' : ''} result${results.length === 1 ? '' : 's'}`
      : 'No messages found.';

    for (const result of results) {
      const li = make('li', 'info-item');
      const button = make('button', 'info-main search-result');
      const title = make('span', 'result-title');
      title.append(
        make('strong', null, result.channelType === 'dm' ? result.channelName : `# ${result.channelName}`),
        make('time', null, formatTime(result.time)),
      );
      const preview = make('span', 'result-preview', searchResultLabel(result));
      button.append(title, make('span', 'result-name', result.name), preview);
      button.addEventListener('click', () => {
        closeDialog(els.searchDialog);
        setActive(result.channel);
        requestAnimationFrame(() => jumpTo(result.messageId));
      });
      li.append(button);
      els.globalSearchResults.append(li);
    }
  } catch (error) {
    if (request !== globalSearchRequest) return;
    els.globalSearchStatus.textContent = `Search failed: ${error.message}`;
  }
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function callStateLabel(entry) {
  if (entry.state === 'declined') return 'Declined';
  if (entry.state === 'busy') return 'Busy';
  if (entry.state === 'ringing') return 'Ringing';
  if (entry.state === 'active') return 'In progress';
  return entry.answeredAt ? `Ended · ${formatDuration(entry.duration)}` : 'No answer';
}

function renderCallHistory() {
  els.callsList.replaceChildren();
  if (callLog.length === 0) {
    els.callsList.append(make('li', 'info-empty', 'No calls yet. Open a private chat to start an audio or video call.'));
    return;
  }

  for (const entry of callLog) {
    const li = make('li', 'info-item call-item');
    const main = make('div', 'info-main');
    const title = make('span', 'result-title');
    const icon = entry.direction === 'outgoing' ? '↗' : '↙';
    title.append(
      make('strong', null, `${icon} ${entry.peerName || 'Unknown device'}`),
      make('time', null, new Date(entry.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
    );
    main.append(
      title,
      make('span', 'result-name', `${entry.withVideo ? 'Video' : 'Audio'} · ${callStateLabel(entry)}`),
    );
    li.append(main);
    els.callsList.append(li);
  }
}

function openCallHistory() {
  closeChatMenu();
  renderCallHistory();
  openDialog(els.callsDialog, els.callsClose);
}

function deviceLabel(device, fallback) {
  return device.label || fallback;
}

async function populateDevices() {
  const selects = [
    { el: els.micSelect, kind: 'audioinput', saved: settings.mic, fallback: 'Microphone' },
    { el: els.camSelect, kind: 'videoinput', saved: settings.cam, fallback: 'Camera' },
    { el: els.speakerSelect, kind: 'audiooutput', saved: settings.speaker, fallback: 'Speaker' },
  ];
  let devices = [];
  try {
    devices = await navigator.mediaDevices?.enumerateDevices?.() || [];
  } catch {
    devices = [];
  }

  for (const config of selects) {
    const options = devices.filter((device) => device.kind === config.kind);
    config.el.replaceChildren();
    const fallbackOption = document.createElement('option');
    fallbackOption.value = '';
    fallbackOption.textContent = `Default ${config.fallback.toLowerCase()}`;
    config.el.append(fallbackOption);

    options.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = deviceLabel(device, `${config.fallback} ${index + 1}`);
      config.el.append(option);
    });

    if (config.saved && options.some((device) => device.deviceId === config.saved)) config.el.value = config.saved;
  }

  const hasLabels = devices.some((device) => device.label);
  els.deviceNote.textContent = hasLabels
    ? 'Changes apply to your next call and to the active speaker immediately.'
    : 'Device names appear after you allow microphone/camera access.';
}

async function openDevices() {
  closeChatMenu();
  openDialog(els.devicesDialog, els.micSelect);
  await populateDevices();
}

function applySpeaker() {
  const media = [els.callRemoteAudio, els.callRemoteVideo];
  for (const element of media) {
    if (settings.speaker && element.setSinkId) {
      element.setSinkId(settings.speaker).catch(() => {});
    } else if (!settings.speaker && element.setSinkId && element.sinkId) {
      element.setSinkId('').catch(() => {});
    }
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

function hexToRgb(hex) {
  const value = Number.parseInt(String(hex).replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function hexToRgba(hex, alpha) {
  const [red, green, blue] = hexToRgb(hex);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function shadeHex(hex, amount) {
  const [red, green, blue] = hexToRgb(hex);
  return rgbToHex(red + 255 * amount, green + 255 * amount, blue + 255 * amount);
}

function colorPalette() {
  const base = COLOR_DEFAULTS[settings.theme === 'light' ? 'light' : 'dark'];
  return { ...base, ...customColors };
}

function applyCustomColors() {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const variables = [
    '--bg', '--bg-2', '--panel', '--panel-solid', '--panel-2', '--panel-3',
    '--bubble', '--bubble-mine', '--text', '--accent', '--accent-2',
    '--accent-soft', '--gradient',
  ];

  if (Object.keys(customColors).length === 0) {
    for (const name of variables) root.style.removeProperty(name);
    els.themeColors?.classList.remove('active');
    if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#f4f6fb' : '#0a0c12');
    return;
  }

  const palette = colorPalette();
  root.style.setProperty('--bg', palette.bg);
  root.style.setProperty('--bg-2', palette.bg);
  root.style.setProperty('--panel', hexToRgba(palette.surface, 0.82));
  root.style.setProperty('--panel-solid', palette.surface);
  root.style.setProperty('--panel-2', palette.surface);
  root.style.setProperty('--panel-3', shadeHex(palette.surface, settings.theme === 'light' ? -0.04 : 0.07));
  root.style.setProperty('--bubble', palette.bubble);
  root.style.setProperty('--bubble-mine', `linear-gradient(135deg, ${palette.mine} 0%, ${shadeHex(palette.mine, 0.1)} 100%)`);
  root.style.setProperty('--text', palette.text);
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-2', palette.accent2);
  root.style.setProperty('--accent-soft', hexToRgba(palette.accent, 0.14));
  root.style.setProperty('--gradient', `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accent2} 100%)`);
  if (meta) meta.setAttribute('content', palette.bg);
  els.themeColors?.classList.add('active');
}

function saveColors() {
  try {
    if (Object.keys(customColors).length === 0) localStorage.removeItem(COLORS_KEY);
    else localStorage.setItem(COLORS_KEY, JSON.stringify(customColors));
  } catch {
    // Storage may be full or unavailable.
  }
}

function colorInputMap() {
  return {
    bg: els.colorBg,
    surface: els.colorSurface,
    text: els.colorText,
    accent: els.colorAccent,
    accent2: els.colorAccent2,
    mine: els.colorMine,
    bubble: els.colorBubble,
  };
}

function syncColorInputs() {
  const palette = colorPalette();
  for (const [field, input] of Object.entries(colorInputMap())) {
    if (input) input.value = palette[field];
  }
}

const COLOR_PRESETS = [
  { name: 'Midnight', colors: COLOR_DEFAULTS.dark },
  { name: 'Daylight', colors: COLOR_DEFAULTS.light },
  { name: 'Ocean', colors: { bg: '#061826', surface: '#0c2a42', text: '#e7f6ff', accent: '#38bdf8', accent2: '#22d3ee', mine: '#0ea5e9', bubble: '#123c5a' } },
  { name: 'Sunset', colors: { bg: '#1b0c12', surface: '#2a141c', text: '#fff1f4', accent: '#fb7185', accent2: '#f59e0b', mine: '#f43f5e', bubble: '#3a1d28' } },
  { name: 'Forest', colors: { bg: '#07130d', surface: '#0f2418', text: '#eafff3', accent: '#34d399', accent2: '#a3e635', mine: '#10b981', bubble: '#173a28' } },
  { name: 'Rose', colors: { bg: '#fdf2f8', surface: '#ffffff', text: '#3b0a2a', accent: '#db2777', accent2: '#9333ea', mine: '#ec4899', bubble: '#ffffff' } },
];

function renderColorPresets() {
  if (!els.colorPresets) return;
  els.colorPresets.replaceChildren();
  for (const preset of COLOR_PRESETS) {
    const button = make('button', 'color-preset');
    button.type = 'button';
    const swatch = make('span', 'color-preset-swatch');
    swatch.style.background = `linear-gradient(135deg, ${preset.colors.accent}, ${preset.colors.accent2})`;
    button.append(swatch, make('span', null, preset.name));
    button.addEventListener('click', () => {
      customColors = { ...preset.colors };
      saveColors();
      syncColorInputs();
      applyCustomColors();
    });
    els.colorPresets.append(button);
  }
}

function openColors() {
  syncColorInputs();
  renderColorPresets();
  openDialog(els.colorsDialog, els.colorBg);
}

function applyColorInputs() {
  customColors = {};
  for (const [field, input] of Object.entries(colorInputMap())) {
    if (input && /^#[0-9a-f]{6}$/i.test(input.value)) customColors[field] = input.value;
  }
  saveColors();
  applyCustomColors();
}

function resetColors() {
  customColors = {};
  saveColors();
  syncColorInputs();
  applyCustomColors();
  toast('Theme colors reset');
}

function applyTheme(theme) {
  settings.theme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = settings.theme;
  localStorage.setItem(THEME_KEY, settings.theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', settings.theme === 'light' ? '#f4f6fb' : '#0a0c12');
  applyCustomColors();
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
  if (!els.mentionMenu.hidden && mentionQuery) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      mentionIndex = (mentionIndex + direction + mentionQuery.options.length) % mentionQuery.options.length;
      updateMentionMenu();
      return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      chooseMention(mentionQuery.options[mentionIndex]);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMentionMenu();
      return;
    }
  }

  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    sendMessage();
  } else if (event.key === 'Escape' && (replyTo || editingId)) {
    const wasEditing = Boolean(editingId);
    clearComposerState();
    if (wasEditing) {
      loadDraft(activeId);
    }
  }
});

els.input.addEventListener('input', () => {
  autoResize();
  noteTyping();
  saveDraft(activeId);
  updateMentionMenu();
});

els.input.addEventListener('paste', (event) => {
  const files = [...(event.clipboardData?.files || [])];
  if (files.length === 0) return;
  event.preventDefault();
  sendFiles(files);
});

els.input.addEventListener('click', updateMentionMenu);

els.input.addEventListener('blur', () => {
  stopTyping();
  setTimeout(closeMentionMenu, 120);
});

els.bannerCancel.addEventListener('click', () => {
  const wasEditing = Boolean(editingId);
  clearComposerState();
  if (wasEditing) loadDraft(activeId);
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

els.messages.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    moveMessageSelection(event.key === 'ArrowDown' ? 1 : -1);
    return;
  }
  if (event.key === 'Home' || event.key === 'End') {
    const rows = [...els.messages.querySelectorAll('.msg')];
    if (rows.length === 0) return;
    event.preventDefault();
    selectMessageRow(event.key === 'Home' ? rows[0] : rows[rows.length - 1]);
    return;
  }

  const row = event.target.closest?.('.msg');
  if (!row) return;
  const message = messageById(row.dataset.mid);
  if (!message) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    revealMessageActions(row);
    row.querySelector('.msg-action')?.focus();
  } else if (event.key.toLowerCase() === 'r') {
    event.preventDefault();
    startReply(message);
  } else if (event.key.toLowerCase() === 'p') {
    event.preventDefault();
    const conversation = activeConversation();
    if (conversation) togglePin(message, conversation);
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
  syncColorInputs();
});

els.themeColors.addEventListener('click', openColors);
for (const input of Object.values(colorInputMap())) {
  if (input) input.addEventListener('input', applyColorInputs);
}
els.colorsReset.addEventListener('click', resetColors);
els.colorsClose.addEventListener('click', () => closeDialog(els.colorsDialog));
els.colorsDialog.addEventListener('click', (event) => {
  if (event.target === els.colorsDialog) closeDialog(els.colorsDialog);
});

els.toggleSound.addEventListener('click', () => {
  settings.sound = !settings.sound;
  localStorage.setItem(SOUND_KEY, settings.sound ? '1' : '0');
  syncSettingButtons();
  if (settings.sound) beep(720, 0.12, 0.05);
});

els.toggleNotify.addEventListener('click', toggleNotifications);

function clearAccountState() {
  if(source) { source.close(); source=null; }
  if(call) endCall('Signed out', null);
  for(const item of uploads) { item.cancelled=true; item.xhr?.abort(); }
  uploads=[]; uploadInProgress=false; renderUploads();
  replyTo=null; editingId=null; searchQuery=''; selectedMessageId=null; typingByChannel.clear(); sentReads.clear();
  globalSearchRequest++; clearTimeout(globalSearchTimer);
  for(const key of ['pinsList','callsList','searchResults']) els[key]?.replaceChildren();
  updateComposerBanner();
  els.input.value=''; autoResize();
  conversations=[]; users=[]; friends=[]; callLog=[]; seen={}; drafts={}; activeId='general';
  me.id=''; me.name=''; me.username=''; csrfToken=''; lastAccountId='';
  for(const key of [ACCOUNT_KEY,SEEN_KEY,DRAFT_KEY,CHANNEL_KEY]) localStorage.removeItem(key);
  for(const dialog of document.querySelectorAll('.overlay')) dialog.hidden=true;
  renderChannels(); renderUsers(); renderFriends(); renderMessages();
  els.meName.textContent='';
}
window.addEventListener('storage', event => {
  if(event.key===ACCOUNT_KEY && event.newValue!==me.id && me.id) { location.reload(); }
});
document.getElementById('password-visibility').addEventListener('click', event => {
  const visible=els.passwordInput.type==='password';
  els.passwordInput.type=visible?'text':'password';
  const label=visible?'Hide password':'Show password';
  event.currentTarget.setAttribute('aria-label',label);
  event.currentTarget.title=label;
  event.currentTarget.setAttribute('aria-pressed',String(visible));
  event.currentTarget.innerHTML=visible
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a14.6 14.6 0 0 1-3.1 4.1M6.6 6.6C4 8.3 2.5 12 2.5 12s3.5 7 9.5 7c1 0 2-.2 2.9-.5"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
});
function showAuth(mode = 'login') {
  els.passwordInput.type='password';
  const passwordVisibility=document.getElementById('password-visibility');
  passwordVisibility.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
  passwordVisibility.setAttribute('aria-label','Show password');
  passwordVisibility.title='Show password';
  passwordVisibility.setAttribute('aria-pressed','false');
  authMode = mode;
  const registering = mode === 'register';
  els.authTitle.textContent = registering ? 'Create your Chatterbox account' : 'Log in to Chatterbox';
  els.authSubtitle.textContent = registering
    ? 'Only your name, username and password are required.'
    : 'Use your username and password to continue chatting.';
  els.registrationFields.hidden = !registering;
  els.nameInput.disabled = !registering;
  els.nameInput.required = registering;
  els.passwordInput.autocomplete = registering ? 'new-password' : 'current-password';
  els.authSubmit.textContent = registering ? 'Create account' : 'Log in';
  els.authToggle.textContent = registering ? 'Already registered? Log in' : 'No account? Create one';
  els.authError.hidden = true;
  els.passwordInput.value = '';
  els.nameDialog.hidden = false;
  openDialog(els.nameDialog, registering ? els.nameInput : els.usernameInput);
}

els.authToggle.addEventListener('click', () => showAuth(authMode === 'login' ? 'register' : 'login'));

function setAuthenticated(data) {
  const user = data.user;
  if(lastAccountId !== user.id) clearAccountState();
  if (lastAccountId !== user.id) {
    conversations = [];
    users = [];
    friends = [];
    callLog = [];
    seen = {};
    drafts = {};
    activeId = 'general';
    localStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(CHANNEL_KEY);
    renderChannels();
    renderUsers();
  }
  lastAccountId = user.id;
  localStorage.setItem(ACCOUNT_KEY, user.id);
  me.id = user.id;
  me.name = user.name;
  me.username = user.username;
  me.fullName = '';
  csrfToken = data.csrfToken;
  els.meName.textContent = `${me.name} (@${me.username})`;
  closeDialog(els.nameDialog);
  updateHeader(activeConversation());
  connect();
}

els.nameForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.authError.hidden = true;
  if(els.authSubmit.disabled) return;
  els.authSubmit.disabled = true;
  els.authToggle.disabled = true;
  els.nameForm.setAttribute('aria-busy','true');
  els.authSubmit.textContent = authMode==='register' ? 'Creating account...' : 'Logging in...';
  try {
    const result = await authClient.submit(authMode, {
      name: els.nameInput.value,
      username: els.usernameInput.value,
      password: els.passwordInput.value,
    });
    setAuthenticated(result);
    els.nameForm.reset();
  } catch (error) {
    els.authError.textContent = error.message;
    els.authError.hidden = false;
  } finally {
    els.authSubmit.disabled = false;
    els.authToggle.disabled = false;
    els.nameForm.removeAttribute('aria-busy');
    els.authSubmit.textContent=authMode==='register'?'Create account':'Log in';
  }
});

els.changeName.addEventListener('click', async () => {
  try {
    await postJson('/api/auth/logout', {});
  } catch (error) {
    toast(`Could not log out: ${error.message}`, 'error');
    return;
  }
  if (source) { source.close(); source = null; }
  if (call) endCall('Logged out', null);
  me.id = '';
  lastAccountId = '';
  localStorage.removeItem(ACCOUNT_KEY);
  me.name = '';
  me.username = '';
  csrfToken = '';
  els.meName.textContent = '—';
  conversations = [];
  users = [];
  friends = [];
  callLog = [];
  activeId = 'general';
  seen = {};
  drafts = {};
  localStorage.removeItem(SEEN_KEY);
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(CHANNEL_KEY);
  renderChannels();
  renderUsers();
  renderMessages();
  clearAccountState();
  location.reload();
});

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
els.callOverlay.addEventListener('click', () => resumeCallMedia());

window.addEventListener('pagehide', () => {
  if (call) sendSignalBeacon(call, 'hangup');
  stopTyping();
});

els.newGroup.addEventListener('click', openGroupDialog);
els.groupCancel.addEventListener('click', () => closeDialog(els.groupDialog));
els.groupForm.addEventListener('submit', createGroup);
els.groupDialog.addEventListener('click', (event) => {
  if (event.target === els.groupDialog) closeDialog(els.groupDialog);
});

els.newRoom.addEventListener('click', openRoomDialog);
els.roomCancel.addEventListener('click', () => closeDialog(els.roomDialog));
els.roomForm.addEventListener('submit', createRoom);
els.roomDialog.addEventListener('click', (event) => {
  if (event.target === els.roomDialog) closeDialog(els.roomDialog);
});

els.togglePins.addEventListener('click', openPins);
els.pinsClose.addEventListener('click', () => closeDialog(els.pinsDialog));
els.pinsDialog.addEventListener('click', (event) => {
  if (event.target === els.pinsDialog) closeDialog(els.pinsDialog);
});

els.chatMenu.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleChatMenu();
});
els.menuMembers.addEventListener('click', showMembersPanel);
els.leaveChat.addEventListener('click', leaveGroup);
els.menuCalls.addEventListener('click', openCallHistory);
els.menuDevices.addEventListener('click', openDevices);

els.globalSearchInput.addEventListener('input', () => {
  clearTimeout(globalSearchTimer);
  globalSearchTimer = setTimeout(runGlobalSearch, 220);
});
els.globalSearchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(globalSearchTimer);
    runGlobalSearch();
  }
});
els.globalSearchClose.addEventListener('click', () => closeDialog(els.searchDialog));
els.searchDialog.addEventListener('click', (event) => {
  if (event.target === els.searchDialog) closeDialog(els.searchDialog);
});

els.callsClose.addEventListener('click', () => closeDialog(els.callsDialog));
els.callsDialog.addEventListener('click', (event) => {
  if (event.target === els.callsDialog) closeDialog(els.callsDialog);
});

els.micSelect.addEventListener('change', () => {
  settings.mic = els.micSelect.value;
  localStorage.setItem(MIC_KEY, settings.mic);
});
els.camSelect.addEventListener('change', () => {
  settings.cam = els.camSelect.value;
  localStorage.setItem(CAM_KEY, settings.cam);
});
els.speakerSelect.addEventListener('change', () => {
  settings.speaker = els.speakerSelect.value;
  localStorage.setItem(SPEAKER_KEY, settings.speaker);
  applySpeaker();
});
els.devicesClose.addEventListener('click', () => closeDialog(els.devicesDialog));
els.devicesDialog.addEventListener('click', (event) => {
  if (event.target === els.devicesDialog) closeDialog(els.devicesDialog);
});

els.callShare.addEventListener('click', toggleScreenShare);
els.callDevices.addEventListener('click', openDevices);

document.addEventListener('click', (event) => {
  if (!event.target.closest('.reaction-picker')) {
    document.querySelectorAll('.reaction-picker').forEach((picker) => picker.remove());
  }
  if (!event.target.closest('.msg')) {
    document.querySelectorAll('.msg.actions-open').forEach((row) => row.classList.remove('actions-open'));
  }
  if (!event.target.closest('.menu-wrap')) closeChatMenu();
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
  trapDialogFocus(event);

  if (event.key === 'Escape') {
    const dialog = topOpenDialog();
    if (dialog) {
      if (dialog === els.nameDialog && !me.id) return;
      if (dialog === els.groupDialog) closeDialog(els.groupDialog);
      else if (dialog === els.roomDialog) closeDialog(els.roomDialog);
      else if (dialog === els.pinsDialog) closeDialog(els.pinsDialog);
      else if (dialog === els.searchDialog) closeDialog(els.searchDialog);
      else if (dialog === els.callsDialog) closeDialog(els.callsDialog);
      else if (dialog === els.devicesDialog) closeDialog(els.devicesDialog);
      else if (dialog === els.colorsDialog) closeDialog(els.colorsDialog);
      else closeDialog(dialog);
      return;
    }
    if (!els.chatMenuPanel.hidden) {
      closeChatMenu();
      els.chatMenu.focus();
      return;
    }
    if (!els.searchbar.hidden) closeSearch();
    if (!els.mentionMenu.hidden) closeMentionMenu();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !topOpenDialog()) {
    event.preventDefault();
    openSearch();
  }
});

document.addEventListener('hashchange', () => applyDeepLink());

if ('serviceWorker' in navigator && !SERVER_URL) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration failures (e.g. non-secure origins on phones).
    });
  });
} else if ('serviceWorker' in navigator && SERVER_URL) {
  navigator.serviceWorker.getRegistrations?.().then((regs) => {
    regs.forEach((reg) => reg.unregister().catch(() => {}));
  }).catch(() => {});
}

applyTheme(settings.theme);
syncSettingButtons();
renderChannels();
loadDraft(activeId);

async function restoreLogin() {
  try {
    const data = await authClient.session();
    if (data.user) setAuthenticated(data);
    else {
      showAuth('login');
      setStatus('Log in or create an account', '');
    }
  } catch (error) {
    showAuth('login');
    els.authError.textContent = error.message;
    els.authError.hidden = false;
    setStatus('Cannot connect', 'offline');
  }
}

restoreLogin();
