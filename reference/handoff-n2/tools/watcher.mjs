#!/usr/bin/env node
// Datei-Watcher (Orakel-Ausloeser=Datei): Änderung in Quellen → einbringen.mjs.
import { watch, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dirs = [
  join(root, 'config'), join(root, 'prototypen'), join(root, 'docs'),
  '/opt/nexifyai/zk',
].filter(existsSync);

let debounce = null;
function triggern() {
  if (debounce) return;
  debounce = setTimeout(() => {
    debounce = null;
    execFile('node', [join(root, 'tools', 'einbringen.mjs')], { cwd: root }, (err, so, se) => {
      const t = new Date().toISOString();
      console.log(`[${t}] einbringen: ${err ? 'FEHLER' : 'OK'}`);
      if (so.trim()) console.log(so.trim().split('\n').slice(-3).join('\n'));
      if (se.trim()) console.error(se.trim().slice(0, 300));
    });
  }, 2500);
}

for (const d of dirs) {
  try { watch(d, { recursive: true }, () => triggern()); } catch {}
}
console.log('Watcher aktiv:', dirs.join(' · '));
setInterval(() => {}, 60_000); // offen halten
