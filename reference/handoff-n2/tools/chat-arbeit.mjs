#!/usr/bin/env node
// Chat-Arbeitsweise: Nachricht -> NeXify befragen -> Auftrag; "Starte" -> sofort Orchestrierung.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nachricht = process.argv.slice(2).join(' ').trim() || '(leer)';
const START = /^\s*starte\b/i.test(nachricht);

function neXify(nachricht) {
  try {
    return execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ nachricht }),
      '--choice', 'auftrag', 'Welche Aufgabe?',
      'umsetzen:direkt umsetzen', 'recherchieren:erst recherchieren', 'rueckfrage:an Nutzer rueckfragen'], { encoding: 'utf8' }).trim();
  } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); }
}

const out = { eingang: nachricht.slice(0, 120), starte: START, neXify: null, auftrag: null };

if (START) {
  // "Starte" -> sofort Auftragsladen (Orchestrierung via Adapter)
  try {
    out.auftrag = execFileSync('node', [join(root, 'tools', 'chat-auftrag-adapter.mjs'), nachricht], { encoding: 'utf8', cwd: root }).trim();
  } catch (e) { out.auftrag = String(e.stdout || '') + String(e.stderr || ''); }
} else {
  out.neXify = neXify(nachricht);
}

console.log(JSON.stringify(out, null, 2));
