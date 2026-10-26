#!/usr/bin/env node
// Jeff-Kosten-Routing (neu): Aufgabe -> flash (günstig) vs pro (stark).
// Aufruf: node tools/jeff-routing.mjs "<aufgabe>"
import { execFileSync } from 'node:child_process';

const aufgabe = process.argv.slice(2).join(' ').trim() || 'unbekannte Aufgabe';
let j = {};
try {
  const out = execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ aufgabe }),
    '--choice', 'modell', 'Modellwahl nach Komplexität/Kosten',
    'flash:günstig, einfache/Standard-Aufgabe',
    'pro:stark, komplex/kritisch/tief'], { encoding: 'utf8' }).trim();
  j = JSON.parse(out);
} catch (e) { j = { verfuegbar: false, fehler: String(e.stdout || e.stderr || '').slice(0, 100) }; }

const out = { aufgabe, zeit: new Date().toISOString(), modell: j.answers?.modell?.choice || 'flash', wahrscheinlichkeiten: j.answers?.modell?.probabilities || {} };
console.log(JSON.stringify(out, null, 2));
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Jeff-Routing: ${out.modell} · "${aufgabe.slice(0,100)}"`, concepts: ['jeff', 'routing', 'kosten', out.modell] }),
  });
} catch {}
