# Chatterbox

A tiny local web chat for devices on the same network. No accounts, no internet, no dependencies - just Node.js.

## Run it

```bash
npm start
```

If PowerShell blocks `npm.ps1` ("running scripts is disabled on this system"), use `npm.cmd start` or `node server.js`.

The server binds to `0.0.0.0` and prints the addresses to open:

```
  On this machine:  http://localhost:3000
  On the LAN:       http://192.168.1.23:3000
```

Open the LAN address on any phone, tablet or computer connected to the same network, pick a name, and chat. Use **Invite** in the sidebar to copy the address and share it.

## HTTPS for phone calls

Browsers only allow microphone, camera, screen sharing, service workers, and install prompts on secure origins. `http://localhost` is secure, but `http://<LAN-IP>` is not. For calls from a phone, generate a local certificate and start with HTTPS:

```bash
npm run cert
npm run start:https
```

Use `npm.cmd run cert` / `npm.cmd run start:https` if PowerShell blocks npm scripts. The certificate script uses OpenSSL (Git for Windows includes it) and creates `certs/cert.pem` and `certs/key.pem` with `localhost` and your current LAN addresses. Open the printed `https://` address and accept the self-signed certificate warning once per device.

You can also supply your own certificate:

```bash
HTTPS=1 TLS_CERT=C:\certs\cert.pem TLS_KEY=C:\certs\key.pem node server.js
```

## Features

- **General room** - the public channel every connected device shares.
- **Public rooms** - create additional named rooms from the Rooms section. Everyone on the server can see and join them.
- **Private messages** - click a name under **Online** to open a one-to-one conversation.
- **Groups** - create a named group and choose its members. Group messages only reach members.
- **Mentions** - type `@` to pick an online user. Mentioned messages are highlighted for the recipient, with a notification and a louder alert sound.
- **Pinned messages** - pin or unpin any message in a room, group, or DM. The pin button in the header shows the current count and opens the list.
- **Search all chats** - search messages across public rooms, your groups, and your DMs from the chat menu. Ctrl/Cmd+F still filters the current conversation.
- **Export** - download the current conversation as HTML or JSON from the chat menu.
- **Drafts** - unsent text is saved per conversation in local storage and shown in the sidebar.
- **Files & images** - use the paperclip, paste, or drag files onto the composer. Uploads show progress and can be cancelled. Images get an inline preview.
- **Audio & video calls** - open a private message and use the header buttons. Calls are peer-to-peer WebRTC and stay on the LAN.
- **Call extras** - screen sharing during video calls, microphone/camera/speaker selection, ring timeout, ICE restart, and a per-device call history.
- **Replies** - quote a message so the thread stays readable.
- **Reactions** - tap the smiley on any message to react. Reactions are live for everyone in the conversation.
- **Edit & delete** - edit or delete your own messages; attachments can be deleted too.
- **Read receipts** - see when the other side has read your message (single/double check).
- **Typing indicators** - scoped to the conversation you are typing in.
- **Unread badges** - per-conversation counts, plus a count in the browser tab title.
- **Mobile gestures** - tap a message to reveal actions, swipe right to reply, and use the slide-over sidebar.
- **Accessibility** - keyboard message navigation, focus trapping in dialogs, live-region announcements, and reduced-motion support.
- **PWA** - install Chatterbox from the browser on a secure origin. Notifications open the exact conversation and message.
- **Sounds, desktop alerts, light/dark themes** - all remembered on the device.

Set a different port with `PORT=4000 npm start`. Files are capped at 100 MB by default; change that with `MAX_FILE_MB=250 npm start`.

## Mobile app prep

The web client can now target a remote Chatterbox server (useful for Capacitor/WebView wrappers):

- Set a server at runtime with `?server=https://YOUR_SERVER` (persisted in local storage), or define `window.CHATTERBOX_SERVER` before `app.js` loads.
- When a remote server is configured, API/SSE requests go to that server and the local service worker is disabled to avoid caching cross-origin issues.
- Server CORS is enabled (`CORS_ORIGIN` env var, defaults to `*`) so packaged apps can connect.

To package as a native app, wrap `public/` with Capacitor/Cordova, point it at your LAN/hosted HTTPS server, and enable camera/microphone permissions in the native project. Calls/media still require a secure origin on the server side.

## How it works

- `server.js` - Node HTTP/HTTPS server. Serves the static app and streams events with Server-Sent Events (`GET /events`).
- `public/` - the dependency-free UI, service worker, manifest, and icons.
- Messages are posted to `POST /api/messages` with a channel (`general`, `dm:<a>:<b>`, `group:<id>`, or `room:<id>`).
- Conversations and actions:
  - `POST /api/groups`, `POST /api/rooms`
  - `POST /api/messages/edit`, `POST /api/messages/delete`, `POST /api/messages/pin`
  - `POST /api/reactions`, `POST /api/read-receipt`, `POST /api/typing`
- Discovery and history:
  - `GET /api/search?id=<user>&q=<query>` (optional `channel`)
  - `GET /api/export?id=<user>&channel=<channel>&format=json|html`
  - `GET /api/calls?id=<user>`
- Calls use `POST /api/signal` for SDP and ICE signalling. The server records ended/declined/busy call history for the two participants.
- Files stream to `POST /api/files` and download from `GET /api/files/:id` (add `?inline=1` for inline previews). Every message is delivered only to the conversation's participants.

State is kept in memory, so history (last 300 messages per conversation), DMs, groups, rooms, and call history are lost when the server restarts. Uploaded files are stored in the OS temp folder and cleared on startup.

## Notes

- If other devices cannot connect, allow Node through the firewall on the port you use (private networks on Windows, for example) and make sure the network does not isolate clients from each other.
- Use HTTPS for calls, screen sharing, notifications, and installation from phones. Self-signed certificates require accepting a browser warning once on each device.
- Chatterbox has no authentication. Anyone on the LAN who knows the address can read and post messages and can access public rooms. Run it only on networks you trust.
- To use it over the internet, put it behind a reverse proxy with TLS; do not expose the port directly.
- `certs/` is ignored by git and should never be committed.
