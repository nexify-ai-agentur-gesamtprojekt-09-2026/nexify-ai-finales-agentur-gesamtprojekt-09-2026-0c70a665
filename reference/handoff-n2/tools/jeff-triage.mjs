#!/usr/bin/env node
// Jeff-Triage (neu): Meldung/Abweichung/Alert -> Jeff klassifiziert Dringlichkeit + Aktion.
// Aufruf: node tools/jeff-triage.mjs "<meldung>"
import { execFileSync } from 'node:child_process';

const meldung = process.argv.slice(2).join(' ').trim() || 'unbekannte Meldung';
function jfrage(args) {
  try {
    const out = execFileSync('nx-jeff', ['frage', ...args], { encoding: 'utf8' }).trim();
    return JSON.parse(out);
  } catch (e) {
    return { verfuegbar: false, fehler: String(e.stdout || e.stderr || e.message).slice(0, 120) };
  }
}

const dringlichkeit = jfrage(['--state', JSON.stringify({ meldung }),
  '--choice', 'dringlichkeit', 'Klassifiziere Dringlichkeit dieser Meldung',
  'kritisch:sofort handeln, Ausfall/Datenverlust',
  'hoch:schnell, funktional relevant',
  'normal:planen, kein Ausfall',
  'niedrig:beobachten, kosmetisch']);

const aktion = jfrage(['--state', JSON.stringify({ meldung }),
  '--choice', 'aktion', 'Empfohlene Aktion',
  'sofort:jetzt eingreifen (reversibel)',
  'planen:in Auftrag aufnehmen',
  'beobachten:nur dokumentieren',
  'ignorieren:kein Handlungsbedarf']);

const dr = dringlichkeit.answers?.dringlichkeit || {};
const ak = aktion.answers?.aktion || {};
const out = {
  meldung, zeit: new Date().toISOString(),
  dringlichkeit: dr.choice || 'unbekannt',
  dringlichkeit_p: dr.probabilities || {},
  aktion: ak.choice || 'unbekannt',
  aktion_p: ak.probabilities || {},
};
console.log(JSON.stringify(out, null, 2));
// Jeff-Entscheidung ins agentmemory (Audit + Lernschleife)
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Jeff-Triage: ${out.dringlichkeit}/${out.aktion} · "${meldung.slice(0,140)}"`, concepts: ['jeff', 'triage', 'alert', out.dringlichkeit] }),
  });
} catch {}
