# Chatterbox

A local web chat for devices on the same network. Basic account registration, login, and session storage use SQLite via Node.js built-in `node:sqlite`; there are no npm runtime dependencies. **Node.js 22.13+ required.**

## Run it

```powershell
npm.cmd run db:migrate
npm.cmd start
```

If PowerShell blocks `npm.ps1` ("running scripts is disabled on this system"), use `npm.cmd start` or `node server.js`.

The server binds to `0.0.0.0` and prints the addresses to open. When `certs/cert.pem` and `certs/key.pem` exist it starts with HTTPS automatically:

```
  On this machine:  https://localhost:3000
  On the LAN:       https://192.168.1.23:3000
```

Open `http://localhost:3000` to log in with your Username and Password. New visitors see **Log in to Chatterbox** first and can select **No account? Create one** to register with Name, Username and Password. For another device on the LAN, **start in HTTPS mode** (`npm run cert` then `npm run start:https`) before registering or logging in. Use **Invite** in the sidebar to copy the address and share it.

## HTTPS for phone calls

Browsers only allow microphone, camera, screen sharing, service workers, and install prompts on secure origins. `http://localhost` is secure, but `http://<LAN-IP>` is not. Generate a local certificate once:

```bash
npm run cert
```

Use `npm.cmd run cert` / `npm.cmd run start:https` if PowerShell blocks npm scripts. The certificate script uses OpenSSL (Git for Windows includes it) and creates `certs/cert.pem` and `certs/key.pem` with `localhost` and your current LAN addresses. After that, `npm start` serves HTTPS automatically. Open the printed `https://` address and accept the self-signed certificate warning once per device, or configure each device to trust the issuing local certificate authority. Re-run `npm run cert` if your LAN IP changes.

To force HTTPS or HTTP explicitly, use `npm run start:https`, `HTTPS=1 node server.js`, or `HTTPS=0 node server.js`.

You can also supply your own certificate:

```bash
HTTPS=1 TLS_CERT=C:\certs\cert.pem TLS_KEY=C:\certs\key.pem node server.js
```

## Features

- **General room** - the public channel every connected device shares.
- **Public rooms** - create additional named rooms from the Rooms section. Everyone on the server can see and join them.
- **Private messages** - click a name under **Online** to open a one-to-one conversation.
- **Friends** - use the **+** button next to an online user to add them as a friend. Friends appear in their own section of the side panel with live online/offline status, and the **★** button removes them again.
- **Groups** - create a named group and choose its members. Group messages only reach members. View the member list and leave a group from the chat menu.
- **Chat members** - the side panel shows the full member list in groups and everyone online in public rooms.
- **Mentions** - type `@` to pick an online user. Mentioned messages are highlighted for the recipient, with a notification and a louder alert sound.
- **Pinned messages** - pin or unpin any message in a room, group, or DM. The pin button in the header shows the current count and opens the list.
- **Search all chats** - search messages across public rooms, your groups, and your DMs from the chat menu. Ctrl/Cmd+F still filters the current conversation.
- **Export** - download the current conversation as HTML or JSON from the chat menu.
- **Drafts** - unsent text is saved per conversation in local storage and shown in the sidebar.
- **Files & images** - use the paperclip, paste, or drag files onto the composer. Attach a file and type a message to send both together in one action. Uploads show progress and can be cancelled. Images get an inline preview.
- **Audio & video calls** - open a private message and use the header buttons. Calls are peer-to-peer WebRTC and stay on the LAN.
- **Call extras** - screen sharing during video calls, microphone/camera/speaker selection, ring timeout, ICE restart, and a per-device call history.
- **Replies** - quote a message so the thread stays readable.
- **Reactions** - tap the smiley on any message to react. Reactions are live for everyone in the conversation.
- **Edit & delete** - edit or delete your own messages; attachments can be deleted too. Unsent messages leave a visible placeholder in the conversation.
- **Read receipts** - see when the other side has read your message (single/double check).
- **Typing indicators** - scoped to the conversation you are typing in.
- **Unread badges** - per-conversation counts, plus a count in the browser tab title.
- **Mobile gestures** - tap a message to reveal actions, swipe right to reply, and use the slide-over sidebar.
- **Accessibility** - keyboard message navigation, focus trapping in dialogs, live-region announcements, and reduced-motion support.
- **PWA** - install Chatterbox from the browser on a secure origin. Notifications open the exact conversation and message.
- **Sounds, desktop alerts, light/dark themes** - all remembered on the device. Pick from presets or build a custom color palette with the **Colors** button.

Run `npm test` to verify registration, login, authentication, and SQLite persistence. Set a different port with `PORT=4000 npm start`. Files are capped at 100 MB by default; change that with `MAX_FILE_MB=250 npm start`.

The initial session check (`GET /api/auth/session`) returns a successful signed-out response when there is no session. Protected endpoints still return 401 without a login. Connection failures, timeouts and HTTPS requirements appear inside the account form. Usernames use 3–24 letters, numbers, dots or underscores, and passwords use 8–128 characters.

## Cross-origin/mobile deployment

The old `?server=` cross-origin server override is disabled in this authenticated version. Cookie sessions, CSRF protection and the browser frontend currently require the same origin for the app and API. To add native app clients later, design a separately authenticated mobile client interface instead of exposing cross-origin cookies.

## How it works

- `server.js` - Node HTTP/HTTPS server. Serves the static app, authenticated endpoints, and SSE (`GET /events`).
- `auth-db.mjs` - SQLite auto-migration, salted password hashing, sessions, credential verification.
- `public/` - the dependency-free UI, service worker, manifest, and icons.
- Messages are posted to `POST /api/messages` with a channel (`general`, `dm:<a>:<b>`, `group:<id>`, or `room:<id>`).
- Conversations and actions:
  - `POST /api/groups`, `POST /api/groups/leave`, `POST /api/rooms`
  - `POST /api/messages/edit`, `POST /api/messages/delete`, `POST /api/messages/pin`
  - `POST /api/reactions`, `POST /api/read-receipt`, `POST /api/typing`
- Friends:
  - `GET /api/friends` lists your friends with live online status
  - `POST /api/friends` with `{ friendId }` adds a mutual friend
  - `POST /api/friends/remove` with `{ friendId }` removes one
- Discovery and history:
  - `GET /api/search?id=<user>&q=<query>` (optional `channel`)
  - `GET /api/export?id=<user>&channel=<channel>&format=json|html`
  - `GET /api/calls?id=<user>`
- Calls use `POST /api/signal` for SDP and ICE signalling. The server records ended/declined/busy call history for the two participants.
- Files stream to `POST /api/files` and download from `GET /api/files/:id` (add `?inline=1` for inline previews). Every message is delivered only to the conversation's participants.

Accounts and sessions persist in SQLite, but chat state is still kept in memory, so history (last 300 messages per conversation), DMs, groups, rooms, and call history are lost when the server restarts. Uploaded files are stored in the OS temp folder and cleared on startup.

## Notes

- If other devices cannot connect, allow Node through the firewall on the web port and UDP `3478` (private networks on Windows, for example) and make sure the network does not isolate clients from each other. The built-in STUN responder on UDP `3478` helps calls find each other; set `STUN_PORT=0` to disable it, or `STUN_PORT=<port>` to change it.
- Use HTTPS for calls, screen sharing, notifications, and installation from phones. The generated self-signed certificate is a development aid; use a trusted local CA for LAN devices and verify the certificate covers the hostname or IP used.
- Chatterbox requires registration or login for chat API access. Always use HTTPS for other LAN devices, and run only on networks you trust. No email or password-reset service is included.
- To use it over the internet, design and test a separate hardened deployment. TLS-terminating reverse proxies are not currently supported: the app uses the actual TLS socket, not forwarded headers, to decide cookie security.
- `certs/` is ignored by git and should never be committed.

## Registration and SQLite migration

See [`COPY_INTO_VSCODE.md`](COPY_INTO_VSCODE.md) for the manual-copy steps, backup precautions, Node version requirements, and testing instructions. Run `npm.cmd run db:migrate` explicitly before first launch. This creates and verifies a backup when the database already exists, then applies a versioned transaction. Normal server startup never migrates the schema. Stop Chatterbox before migration.

## Verification and operating limits

`npm.cmd test` runs migration and HTTP integration tests on disposable databases. `npm.cmd run test:https` checks TLS verification and Secure cookies using a disposable certificate; it requires OpenSSL (`OPENSSL` can specify its executable). Physical LAN access, browser accessibility/responsiveness, camera/microphone permissions and real WebRTC media need manual verification.

Sessions expire after seven days. HTTP authentication is allowed only from loopback for development; LAN APIs require direct HTTPS. The server rejects cross-origin requests and requires a CSRF token for authenticated mutations. Message, signalling, upload and connection budgets bound resource use. Limits are process-local and reset on restart. Chat remains transient; account/session persistence does not make chat history durable.

See `IMPLEMENTATION_REPORT.md` for the verified migration backup, results, limitations and rollback procedure.
