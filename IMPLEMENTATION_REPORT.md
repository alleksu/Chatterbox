# Chatterbox implementation report

Date: 2026-11-16 (Asia/Manila)

## 1. Executive summary

Implemented the approved registration/session integration and security fixes. Automated migration, HTTP integration, and verified HTTPS tests pass. The original SQLite database is migrated to version 2 after a verified backup, with original records preserved. No commit, staging, or push was performed.

Local development testing can proceed. Trusted-LAN readiness remains conditional on physical-device HTTPS and WebRTC checks. Production readiness is not established.

## 2. Architecture

The dependency-free Node HTTP/HTTPS server, vanilla browser UI, SSE transport and peer-to-peer WebRTC architecture remain. Registration uses Name, Username and Password only. Usernames are normalized to lowercase with a case-insensitive unique index. Registered identities are server-assigned UUIDs. Legacy device IDs cannot authenticate.

SQLite stores accounts and seven-day sessions. New password hashes use versioned scrypt (N=131072, r=8, p=1), random 16-byte salts and constant-time digest comparison. Existing candidate scrypt hashes remain verifiable. Four concurrent hashes are permitted to bound memory consumption. Session cookies contain random 32-byte tokens; SQLite stores SHA-256 token hashes. Cookies are HttpOnly and SameSite=Lax, with Secure on HTTPS. Authenticated mutations require a CSRF token.

Chat history, groups, rooms, calls and file metadata remain in memory. Files use isolated temporary directories; no previous instance's directory is deleted at startup. Existing SQLite chat tables are preserved but are not used by the runtime. This integration does not introduce durable chat storage.

## 3. Files changed

Paths are relative to C:\Users\ronal\IdeaProjects\Nadd\Chatterbox.

| File | Change |
| --- | --- |
| server.js | Authenticated identities and authorization, SSE expiry/revocation checks, call participant/state checks, JSON validation, bounded traffic/connections/uploads/storage, attachment inspection, logout call termination |
| auth-db.mjs | Versioned password hashing, bounded hashing concurrency, persisted sessions, schema-version requirement; no migration during import |
| db-migrations.mjs | Consistent verified SQLite backup, transactional versioned migration, integrity and foreign-key checks |
| scripts/backup-db.mjs | Explicit backup command |
| scripts/migrate-db.mjs | Backup-before-migration command |
| scripts/test-migration.mjs | Legacy preservation, backup, repeatability, constraints and rollback tests |
| scripts/test-auth.mjs | Disposable-database HTTP/auth/chat/security integration tests |
| scripts/test-https.mjs | Disposable certificate/database HTTPS tests with trust validation enabled |
| public/app.js | Session restore/expiry handling, account cleanup, upload cancellation, cross-tab reload, password visibility, busy-state feedback, name validation |
| public/index.html | Registration/login fields, password visibility control and accessible status feedback |
| public/styles.css | Authentication controls and mobile/short-viewport scrolling |
| public/sw.js | Shell cache version 5; authenticated API and SSE remain uncached |
| package.json | Migration, backup and test commands |
| .gitignore | Database, journal and backup exclusions |
| Chatterbox_Proposed_Registration_ERD.dbml | Nullable legacy authentication fields |
| README.md | Explicit setup, direct TLS requirements, supported operation and limitations |
| COPY_INTO_VSCODE.md | Reviewed integration instructions replacing blanket file replacement |
| IMPLEMENTATION_REPORT.md | Results and recovery record |

Pre-existing uncommitted work was preserved as the integration baseline. HTTPS launcher, certificate generator, icons and unrelated projects were not edited. The original database changed separately and remains ignored by Git.

## 4. Database results

Migration adds users.username, users.password_hash, users.created_at, a partial case-insensitive unique username index, and user_sessions with a users foreign key and expiry/user indexes. schema_info now records version 2. Existing tables and legacy columns remain. Nullable authentication fields preserve legacy users without granting login access. Foreign-key enforcement is enabled on runtime and migration connections.

Original database before migration: schema version 1; zero users/messages; one conversation. After migration: zero users/messages/sessions; the same conversation remains. The only added schema_info row is version 2. Integrity and foreign-key verification passed. A second migration preserved the entire post-migration data snapshot.

Verified original backup:

`chatterbox.sqlite.backup-1794827396712-8890a3d58dd908.sqlite`

Original pre-migration SHA-256:

`d4b3298b08ce9a56d3ff889f88d33b5532b2445acd3c51de0f9565aa2864b514`

Source snapshot before editing:

`C:\Users\ronal\AppData\Local\Temp\chatterbox-source-6c42b011-56ee-4517-b428-b0311154c167`

Windows process-command inspection was denied. An exclusive-access database-file preflight passed before the original migration. Migration itself uses a SQLite write transaction. No test accounts were inserted into the original database.

## 5. Security improvements

- Private routes derive identity from persisted sessions and check conversation membership or message ownership.
- SSE connections authenticate at establishment; delivery checks expiry/revocation and closes slow clients. Per-user connection counts are bounded.
- Call IDs are bound to their two participants. Only the recipient can answer/decline; only the caller can renegotiate. Ended calls reject new signals. Logout ends active calls involving that account.
- JSON object validation, content-type validation, size limits and top-level request error handling prevent the inspected malformed-input failures.
- Authentication and chat traffic have process-local rate limits. Hash concurrency, uploads, stored attachments and conversation/call counts have capacity limits.
- Uploaded content is inspected before raster previews are enabled. Other content downloads as application/octet-stream with attachment disposition, CSP sandbox and nosniff.
- API replies are no-store. Browser session loss/logout closes event streams, stops media, aborts uploads, clears private state and reloads. Cross-tab account changes reload affected tabs.
- Cross-origin requests are rejected. LAN authenticated API access requires direct TLS; forwarded headers do not bypass that requirement. Loopback HTTP remains a documented development exception.

## 6. Automated test results

Commands: npm.cmd test; npm.cmd run test:https; node --check public/app.js; git diff --check.

All final runs passed. Earlier failures in password-hash serialization and test emoji encoding were corrected before this final run.

| Test group | Expected and actual result |
| --- | --- |
| Verified backup | Backup integrity and row equality: PASS |
| Populated legacy migration | Preserve legacy user/message and leave legacy username null: PASS |
| Migration rerun | No data changes: PASS |
| Failed migration | Duplicate username failure rolls back added columns/tables: PASS |
| Foreign keys | Session referring to nonexistent user rejected: PASS |
| Registration | Valid account succeeds, case-insensitive duplicate rejected, invalid input rejected: PASS |
| Credentials | Incorrect password rejected; correct login works after server restart: PASS |
| Sessions | Auth/me restoration, restart persistence, expiry and logout invalidation: PASS |
| CSRF/origin | Missing token and cross-origin requests rejected: PASS |
| Identity | Browser-supplied author IDs/names cannot impersonate another account: PASS |
| Private conversations | DM/group outsider access and exports denied; member messages work: PASS |
| Message operations | Author edit succeeds; other-author edit/delete denied; reactions, receipts, pins, typing and room creation work: PASS |
| Private search | Outsider receives no private matches: PASS |
| Malformed requests | Null, arrays, primitives, invalid JSON and oversized bodies rejected; server remains available: PASS |
| Attachments | Private upload/member download work; outsider/anonymous access denied; HTML forced to sandboxed binary download: PASS |
| SSE | Anonymous connection denied; authenticated connections established: PASS |
| Call signalling | Offer/answer, ICE and caller renegotiation work; outsider, wrong-role and ended-call requests denied: PASS |
| Rate limiting | Repeated login and messaging return 429: PASS |
| HTTPS | Trusted certificate succeeds, untrusted certificate rejected, Secure/HttpOnly cookies, CSRF and logout work: PASS |
| Original migration | Original record comparison, integrity and repeatability: PASS |
| Syntax/diff | JavaScript syntax and whitespace checks: PASS |

The tests establish server-side account isolation. They do not establish browser UI isolation or media quality. Every resource-cap boundary, concurrent race, alternate image format, browser rendering behavior and network topology is not exhaustively tested.

## 7. UI/UX and manual verification

Implemented the three-field registration flow, labelled login form, password visibility, disabled submission/mode switching during processing, aria-busy and error alerts. Authentication reuses existing colors and the chat layout. Existing focus trapping remains; authentication overlays can scroll on small viewports.

Browser automation inventory reported that the browser access host was unavailable. No visual or interactive browser pass is claimed.

Manual checks still required:

- Desktop/tablet/mobile layout, short viewport and software keyboard.
- Keyboard focus, screen-reader feedback and password visibility.
- Refresh persistence, expired-session UI, logout/account switching across tabs and pending uploads.
- Service-worker update from an older cached installation.
- Two physical LAN devices using a trusted certificate containing their access hostname/IP.
- Microphone/camera permissions, audio/video, screen sharing, busy/decline, network reconnect and real ICE restart.
- Upload/download previews in target browsers, including unsafe HTML/SVG.

## 8. Limitations

No known failing automated tests remain. Browser/physical-device checks are outstanding release gates. Chat and upload storage remain transient; abandoned per-instance temporary directories may need offline cleanup. Rate limits reset on restart and are not distributed. Capacity ceilings can require a restart once reached. There is no account recovery, email verification, admin approval or public-internet deployment hardening. Direct HTTPS is supported; TLS-terminating proxy deployment needs a separately reviewed trust model.

The generated development certificate was used only in disposable tests. No certificate was installed in the operating system or browser trust store, and TLS validation was never disabled.

## 9. Rollback and recommendation

1. Stop Chatterbox and preserve the current database/source before rollback.
2. Verify the named pre-migration backup with SQLite integrity/foreign-key checks.
3. Restore that database together with the saved source snapshot or another explicitly reviewed compatible version. Do not combine journal/WAL sidecars from different copies.
4. The saved pre-edit source contains the original candidate's automatic migration: do not launch it expecting schema version 1 to remain unchanged. Restoring files alone is not an authorization to run that older code. The committed unauthenticated baseline restores the original identity vulnerabilities and is not recommended for LAN operation.
5. Restoring the backup discards accounts/sessions created after it. Preserve the newer database for recovery. The backup and source snapshot contain private material and must remain outside Git.

Ready for local development testing. Trusted-LAN release is conditional on the manual checklist; production release is not approved. Request explicit user approval before committing. Do not push.

## 10. Account-creation reconciliation — 2026-11-17

The reported console 401 was reproducible on the old anonymous `/api/auth/me` session check. The registration endpoint did not require an existing account, and registration passed the integration tests. A LAN HTTPS tab also showed an untrusted-certificate warning. During the follow-up, neither HTTP nor HTTPS was listening on port 3000; the local server was started again after the changes below. These findings do not establish which request produced the user's original console message.

- Added a same-origin, no-store `GET /api/auth/session` probe returning `{ user: null, csrfToken: null }` for signed-out visitors. Protected endpoints retain their 401 responses, and LAN authentication still requires HTTPS.
- New visitors now see account creation first. Returning users with a remembered account see login. Network, timeout, server and HTTPS errors are displayed in the form instead of being silently treated as a logged-out session.
- Extracted the production authentication client to `public/auth-client.js`, with name/username normalization, matching field validation and bounded request time. Added it to service-worker shell cache version 6.
- Expanded HTTP integration tests to exercise this exact client against a disposable database, including registration cookies, session restore after server restart, logout/login, duplicate usernames, invalid fields, malformed responses and connection/timeout/HTTPS failures. HTTPS tests now cover the optional session probe as well.

Verification: `npm.cmd test`, `npm.cmd run test:https`, JavaScript syntax checks and `git diff --check` passed. The running main server returned 200 for health and the signed-out session probe, served the updated HTML/JavaScript/service worker exactly, and retained a 401 for protected `/api/auth/me` access.

A real Edge browser on an isolated loopback test instance successfully displayed the new registration form, created a disposable account, closed the dialog and connected to chat with the correct identity. Browser refresh/logout checks could not be completed because the automation reported user input in the window; those flows passed the automated client/server tests. This does not replace physical-device HTTPS or WebRTC verification. Test accounts were confined to disposable databases. The main server uses the existing `chatterbox.sqlite` and is available on this PC at `http://localhost:3000`. No commit or push was performed.
