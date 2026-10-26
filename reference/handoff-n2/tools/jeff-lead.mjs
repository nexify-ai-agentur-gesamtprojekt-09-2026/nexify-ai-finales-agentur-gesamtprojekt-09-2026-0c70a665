#!/usr/bin/env node
// Jeff-Lead-Vorqualifizierung (neu): Anfrage -> Wert + Risiko -> Verfolgen/Qualifizieren/Ablehnen.
// Aufruf: node tools/jeff-lead.mjs "<anfrage>"
import { execFileSync } from 'node:child_process';

const anfrage = process.argv.slice(2).join(' ').trim() || 'unbekannte Anfrage';
function jfrage(args) {
  try { return JSON.parse(execFileSync('nx-jeff', ['frage', ...args], { encoding: 'utf8' }).trim()); }
  catch (e) { return { verfuegbar: false }; }
}

const wert = jfrage(['--state', JSON.stringify({ anfrage }),
  '--choice', 'wert', 'Wert der Anfrage',
  'hoch:großes Potenzial/Volumen',
  'mittel:durchschnittlich',
  'niedrig:gering/unpassend']);
const ris = jfrage(['--state', JSON.stringify({ anfrage }),
  '--choice', 'risiko', 'Risiko der Anfrage',
  'niedrig:klar, Standard',
  'mittel:etwas Klärung nötig',
  'hoch:unklar/riskant']);
const akt = jfrage(['--state', JSON.stringify({ anfrage }),
  '--choice', 'aktion', 'Empfehlung',
  'verfolgen:sofort Angebot/Erstgespräch',
  'qualifizieren:erst Rückfragen klären',
  'ablehnen:nicht passend/riskant']);

const out = {
  anfrage, zeit: new Date().toISOString(),
  wert: wert.answers?.wert?.choice || 'mittel',
  risiko: ris.answers?.risiko?.choice || 'mittel',
  aktion: akt.answers?.aktion?.choice || 'qualifizieren',
};
console.log(JSON.stringify(out, null, 2));
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Jeff-Lead: ${out.wert}/${out.risiko} → ${out.aktion} · "${anfrage.slice(0,100)}"`, concepts: ['jeff', 'lead', 'vertrieb', out.aktion] }),
  });
} catch {}
