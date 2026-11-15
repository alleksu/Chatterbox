import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const certDir = path.join(root, 'certs');
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');

const candidates = [
  process.env.OPENSSL,
  'openssl',
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  'C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe',
  'C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.exe',
  '/usr/bin/openssl',
  '/usr/local/bin/openssl',
].filter(Boolean);

const openssl = candidates.find((candidate) => {
  const result = spawnSync(candidate, ['version'], { stdio: 'ignore' });
  return result.status === 0;
});

if (!openssl) {
  console.error('OpenSSL was not found. Install OpenSSL or set OPENSSL to the executable path.');
  console.error('On Windows, Git for Windows includes OpenSSL at C:\\Program Files\\Git\\usr\\bin\\openssl.exe.');
  process.exit(1);
}

const addresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
  .map((iface) => iface.address);

const san = ['DNS:localhost', 'IP:127.0.0.1', ...addresses.map((address) => `IP:${address}`)].join(',');
fs.mkdirSync(certDir, { recursive: true });

const result = spawnSync(
  openssl,
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    keyPath,
    '-out',
    certPath,
    '-days',
    '825',
    '-subj',
    '/CN=Chatterbox',
    '-addext',
    `subjectAltName=${san}`,
  ],
  { cwd: root, stdio: 'inherit' },
);

if (result.status !== 0) {
  console.error('Could not generate the certificate.');
  process.exit(result.status || 1);
}

try {
  fs.chmodSync(keyPath, 0o600);
} catch {
  // Windows permissions are handled by the user profile.
}

console.log('\nCreated a self-signed certificate:');
console.log(`  ${certPath}`);
console.log(`  ${keyPath}`);
console.log('\nStart with HTTPS using: npm run start:https');
console.log('Each device must accept the browser certificate warning once.');
