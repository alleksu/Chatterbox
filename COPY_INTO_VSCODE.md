# Chatterbox registration integration

This workspace contains the reviewed integration. Do not replace files wholesale from the original ZIP.

## Run

1. Stop Chatterbox before schema changes.
2. Run `npm.cmd test` (disposable databases).
3. Run `npm.cmd run test:https` (requires OpenSSL; disposable TLS certificate).
4. Run `npm.cmd run db:migrate`. Existing databases receive a verified adjacent backup before a transactional migration. Fresh installations are initialized here.
5. Run `npm.cmd start` for loopback development or `npm.cmd run start:https` with trusted TLS configured for LAN use.

Normal startup requires schema version 2; it does not migrate. Register with Name, Username and Password only. No email, administrator approval, or device identifier is required.

Accounts and seven-day sessions persist; messaging, groups, rooms, calls and attachments remain transient. Do not infer durable chat storage from the legacy chat tables in SQLite.

## Backup and recovery

`npm.cmd run db:backup` creates a consistent SQLite backup and checks integrity and row equality. Keep backups private and outside Git. Stop the server before recovery. Preserve the current database first, then restore the verified backup together with compatible source code. Restoring an older database discards later accounts/sessions; do not merge SQLite WAL files from different database copies.

See IMPLEMENTATION_REPORT.md for this integration's specific backup and source snapshot paths. Never commit databases, keys, test data, or backups. No commit or push is authorized yet.
