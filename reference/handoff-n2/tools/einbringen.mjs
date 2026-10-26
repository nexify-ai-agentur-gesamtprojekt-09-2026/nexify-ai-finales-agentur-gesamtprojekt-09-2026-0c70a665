#!/usr/bin/env node
// Loesungseinbringung-Pipeline (Orakel-Vorgabe: Pipeline, Ausloeser=Datei).
// Kette: Doku+Tokens+Manifest+Audit+Jeff-Gate -> Wissen speisen -> finales Jeff-Review.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function run(cmd, args) {
  try { return execFileSync(cmd, args, { encoding: 'utf8', cwd: root }).trim(); }
  catch (e) { return String(e.stdout || '') + String(e.stderr || ''); }
}

const schritte = [
  ['doku', run('node', ['tools/docs-aktualisieren.mjs'])],
  ['wissen', run('node', ['tools/wissen-speisen.mjs'])],
];
const jeff = run('nx-jeff', ['pruefe-aenderung',
  '--was', 'Loesungseinbringung: Doku + Tokens + Audit + Wissensindex regeneriert/gespeist',
  '--risiko', 'niedrig (generierte Artefakte + Wissensindex, vollstaendig reversibel)',
  '--rollback', 'generierte Dateien + Indizes zuruecksetzen']);

console.log(JSON.stringify({
  zeit: new Date().toISOString(),
  schritte: schritte.map(([k, v]) => [k, v.slice(0, 140)]),
  jeff: jeff.slice(0, 500),
}, null, 2));
