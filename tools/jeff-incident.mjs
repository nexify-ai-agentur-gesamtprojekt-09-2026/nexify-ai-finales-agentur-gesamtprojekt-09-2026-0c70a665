#!/usr/bin/env node
// Jeff-Incident/Eskalation (neu): Ticket/Meldung -> Jeff -> P0..P3 + SLA.
// Aufruf: node tools/jeff-incident.mjs "<ticket/inzident>"
import { execFileSync } from 'node:child_process';

const meldung = process.argv.slice(2).join(' ').trim() || 'unbekannt';
const SLA = { P0: 'sofort, 24/7', P1: '1h', P2: '8h', P3: '24h' };

let j = {};
try {
  const out = execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ meldung }),
    '--choice', 'eskalation', 'Eskalationsstufe festlegen',
    'P0:Ausfall/Datenverlust, sofort Pascal',
    'P1:kritisch, Funktion gestoert',
    'P2:wichtig, planbar',
    'P3:niedrig, beobachten'], { encoding: 'utf8' }).trim();
  j = JSON.parse(out);
} catch (e) { j = { verfuegbar: false, fehler: String(e.stdout || e.stderr || '').slice(0, 100) }; }

const stufe = j.answers?.eskalation?.choice || 'P3';
const out = {
  meldung, zeit: new Date().toISOString(),
  esk_stufe: stufe,
  sla: SLA[stufe] || '24h',
  wahrscheinlichkeiten: j.answers?.eskalation?.probabilities || {},
};
console.log(JSON.stringify(out, null, 2));
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Jeff-Incident: ${stufe} (${SLA[stufe]}) · "${meldung.slice(0,120)}"`, project: 'ai-stack', concepts: ['jeff', 'incident', 'eskalation', stufe] }),
  });
} catch {}
