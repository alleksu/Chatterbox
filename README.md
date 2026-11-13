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

Set a different port with `PORT=4000 npm start`.

## How it works

- `server.js` — Node HTTP server. Serves the static page and streams events to browsers with Server-Sent Events (`GET /events`). Messages are posted to `POST /api/messages` and fanned out to every open connection.
- `public/` — the Chatterbox UI.

State is kept in memory, so history (last 200 messages) is lost when the server restarts.

## Notes

- If other devices cannot connect, allow Node through the firewall on the port you use (private networks on Windows, for example) and make sure the network does not isolate clients from each other.
- Chatterbox has no authentication. Anyone on the LAN who knows the address can read and post messages — run it only on networks you trust.
- To use it over the internet, put it behind a reverse proxy with TLS; do not expose the port directly.
