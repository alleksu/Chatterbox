# Chatterbox

A tiny local web chat for devices on the same network. No accounts, no internet, no dependencies — just Node.js.

## Run it

```bash
npm start
```

If PowerShell blocks `npm.ps1` ("running scripts is disabled on this system"), run `node server.js` or `npm.cmd start` instead.

The server binds to `0.0.0.0` and prints the addresses to open:

```
  On this machine:  http://localhost:3000
  On the LAN:       http://192.168.1.23:3000
```

Open the LAN address on any phone, tablet or computer connected to the same network, pick a name, and chat. Use **Invite** in the sidebar to copy the address and share it with another device.

## Features

- **General room** — the public channel every connected device shares.
- **Private messages** — click a name under **Online** to open a one-to-one conversation.
- **Groups** — create a named group and choose its members. Group messages only reach members.
- **Files & images** — use the paperclip or drag files onto the composer. Image attachments show an inline preview; everything else gets a download link.
- **Audio & video calls** — open a private message and use the buttons in the header. Calls are peer-to-peer WebRTC and stay on the LAN.
- **Replies** — quote a message so the thread stays readable.
- **Reactions** — tap the smiley on any message to react. Reactions are live for everyone in the conversation.
- **Edit & delete** — edit or delete your own messages; attachments can be deleted too.
- **Read receipts** — see when the other side has read your message (✓ / ✓✓ seen).
- **Typing indicators** — scoped to the conversation you are typing in.
- **Unread badges** — per-conversation counts, plus a count in the browser tab title.
- **Search** — filter the current conversation (Ctrl/Cmd+F) by text, author or filename.
- **Sounds & desktop alerts** — toggle notification sounds and browser notifications in the sidebar.
- **Light & dark themes** — toggle from the top bar; the choice is remembered.
- **Day separators, message grouping, scroll-to-latest, link previews** and other quality-of-life touches.

Set a different port with `PORT=4000 npm start`. Files are capped at 100 MB by default; change that with `MAX_FILE_MB=250 npm start`.

## How it works

- `server.js` — Node HTTP server. Serves the static page and streams events to browsers with Server-Sent Events (`GET /events`). Messages are posted to `POST /api/messages` with a channel (`general`, `dm:<a>:<b>` or `group:<id>`), and groups are created with `POST /api/groups`.
- Message actions use `POST /api/messages/edit`, `POST /api/messages/delete`, `POST /api/reactions`, `POST /api/read-receipt` and `POST /api/typing`.
- Files are streamed to `POST /api/files` and downloaded from `GET /api/files/:id` (add `?inline=1` for inline previews). Each message is delivered only to the conversation's participants.
- `public/` — the Chatterbox UI (HTML, CSS and a dependency-free module script).

State is kept in memory, so history (last 300 messages per conversation), DMs and groups are lost when the server restarts. Uploaded files are stored in the OS temp folder and cleared on startup.

## Notes

- If other devices cannot connect, allow Node through the firewall on the port you use (private networks on Windows, for example) and make sure the network does not isolate clients from each other.
- Calls use `getUserMedia`, which browsers only allow on secure origins. `http://localhost` works on the machine running the server, but phones opening `http://<LAN-IP>:3000` cannot access the microphone/camera. To call from a phone, serve the app over HTTPS (for example with a reverse proxy or a self-signed certificate) and open it via `https://`.
- Chatterbox has no authentication. Anyone on the LAN who knows the address can read and post messages — run it only on networks you trust.
- To use it over the internet, put it behind a reverse proxy with TLS; do not expose the port directly.
