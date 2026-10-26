#!/usr/bin/env node
// NeXify AI Agent: Stufe (one/one+) -> Modell (via 9router) + Companion (Jeff AI).
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PAKET = JSON.parse(readFileSync(join(root, 'config/agenten-paket.json'), 'utf8'));
const stufe = process.argv[2] || 'one';
const ziel = process.argv.slice(3).join(' ') || 'Hallo';
const p = PAKET.stufen[stufe] || PAKET.stufen.one;

const out = { stufe, name: p.name, modell: p.modell, companion: p.companion, ziel, llm: null, jeff: null };

// LLM via 9router (openai-kompatibel). Erfordert Router-Key; hier nur Status/Schema.
try {
  const r = await fetch('http://127.0.0.1:20128/v1/models');
  out.llm = { status: r.status, modellIntern: p.modellIntern };
} catch (e) { out.llm = { fehler: String(e).slice(0, 60) }; }

// Companion Jeff AI (Orakel) konsultieren
try {
  out.jeff = execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ stufe, ziel }), '--choice', 'weg', 'Weiter?', 'fortfahren:weiter', 'rueckfrage:betreiber'], { encoding: 'utf8' }).trim().slice(0, 200);
} catch (e) { out.jeff = 'nicht erreichbar'; }

console.log(JSON.stringify(out, null, 2));
