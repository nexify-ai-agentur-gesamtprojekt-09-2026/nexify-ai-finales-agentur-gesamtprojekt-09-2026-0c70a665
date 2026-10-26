#!/usr/bin/env node
// Local development stack only; no cloud deployment, provider credentials or seeding.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
if (process.argv.includes('--help')) {
  console.log('pnpm dev: React/Vite on loopback 3004 and local visitor gateway on 3003. Stop with Ctrl+C. No external services or calendar slots are configured automatically.');
  process.exit(0);
}
mkdirSync(join(root, '.local'), { recursive: true, mode: 0o700 });
const env = { NEXT_TELEMETRY_DISABLED: '1' };
for (const key of ['PATH', 'LANG', 'LC_ALL', 'TMPDIR', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE', 'REQUESTS_CA_BUNDLE']) {
  if (process.env[key]) env[key] = process.env[key];
}
const children = [
  spawn('python3', ['apps/agent-gateway/server.py', '--database', '.local/visitor.sqlite', '--port', '3003', '--web-origin', 'http://127.0.0.1:3004'], { cwd: root, env, stdio: 'inherit' }),
  spawn('pnpm', ['--filter', '@nexify/site', 'dev'], { cwd: root, env, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  }, 5000);
  Promise.all(children.map(child => child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once('close', resolve))))
    .then(() => { clearTimeout(timer); process.exitCode = code; });
}
for (const child of children) {
  child.once('error', () => { console.error('A local development command could not start. Check pinned Node/pnpm and Python setup.'); stop(1); });
  child.once('exit', code => { if (!stopping) stop(code || 1); });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
