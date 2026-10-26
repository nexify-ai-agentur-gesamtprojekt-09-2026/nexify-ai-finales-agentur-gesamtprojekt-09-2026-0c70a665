#!/usr/bin/env node
// Backup/Restore: timestamped tar.gz der kritischen Daten + Rotation (keep 7).
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, mkdirSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const ZIEL = '/opt/nexifyai/backup/nexify';
const QUELLEN = [
  '/opt/nexifyai/zk',
  '/opt/ai-stack/design_handoff_nexify_gesamtloesung/config',
  '/opt/ai-stack/design_handoff_nexify_gesamtloesung/packages',
  '/opt/ai-stack/design_handoff_nexify_gesamtloesung/tools',
  '/opt/ai-stack/design_handoff_nexify_gesamtloesung/docs',
  '/opt/ai-stack/nexify-app',
];
const KEEP = 7;

mkdirSync(ZIEL, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const datei = join(ZIEL, `nexify-${ts}.tar.gz`);

try {
  execFileSync('tar', ['-czf', datei, ...QUELLEN], { encoding: 'utf8' });
} catch (e) {
  console.log(JSON.stringify({ ok: false, fehler: String(e.stderr || e).slice(0, 200) }));
  process.exit(1);
}

// Rotation: älteste über KEEP löschen
const alle = readdirSync(ZIEL).filter((f) => f.startsWith('nexify-') && f.endsWith('.tar.gz')).sort();
while (alle.length > KEEP) { const alt = alle.shift(); rmSync(join(ZIEL, alt), { force: true }); }

appendFileSync(join(ZIEL, 'backup-journal.log'), `${ts} ${datei}\n`);
console.log(JSON.stringify({ ok: true, datei, behalten: Math.min(alle.length + 1, KEEP), groesse: execFileSync('du', ['-h', datei]).toString().split('\t')[0] }));
// Jeff-Verify (neu): nach jedem Backup Zustand durch Orakel bewerten
try { execFileSync('node', ['tools/jeff-backup.mjs'], { stdio: 'ignore' }); } catch {}
