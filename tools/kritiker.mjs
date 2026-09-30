#!/usr/bin/env node
// Kritiker-Gate: adversarial Prüfung einer Fertigmeldung.
// Aufruf: node tools/kritiker.mjs "Fertigmeldung ..."
// Erzeugt Prüfungsliste + führt verfügbare Checks aus -> angenommen/abgelehnt.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const claim = process.argv.slice(2).join(' ').trim() || '(keine Fertigmeldung angegeben)';

// Adversariale Prüfungsliste (immer, unabhängig von der Meldung)
const fragen = [
  ['beweis', 'Welche messbare Evidenz belegt diese Meldung (Zahl, Exit-Code, Log)?'],
  ['negativ', 'Welcher Fehler-/Randfall lässt die Lösung scheitern (leer, timeout, doppelt)?'],
  ['tests', 'Welcher Test fehlt (negativ, restart, permission, drift, rollback)?'],
  ['annahme', 'Welche Annahme ist ungeprüft und wird als Tatsache verwendet?'],
  ['abweichung', 'Welche Abweichung vom Sollbild ist möglich und ungemeldet?'],
  ['downstream', 'Welcher nachgelagerte Prozess/Kunde/Dienst bricht bei dieser Änderung?'],
  ['scheinerfolg', 'Ist es Happy-Path/Mock/Platzhalter statt echter Funktion?'],
  ['sicherheit', 'Sind Geheimnisse/Daten/Berechtigungen/Rollback geprüft?'],
];

const checks = [];
function run(name, cmd, args) {
  try {
    const out = execFileSync(cmd, args, { encoding: 'utf8', timeout: 120000 }).trim();
    checks.push({ name, ok: true, detail: out.slice(0, 240) });
  } catch (e) {
    checks.push({ name, ok: false, detail: String(e.stdout || e.stderr || e.message).slice(0, 240) });
  }
}
run('selbsttest', 'node', [join(root, 'tools', 'selbsttest.mjs')]);
run('kontrolle', 'node', [join(root, 'tools', 'kontrolle.mjs')]);
run('review', 'node', [join(root, 'tools', 'review.mjs')]);
run('ds-audit', 'node', [join(root, 'tools', 'ds-audit-cli.js')]);

const failed = checks.filter(c => !c.ok);
const out = {
  fertigmeldung: claim,
  zeit: new Date().toISOString(),
  pruefungsliste: fragen.map(([id, f]) => ({ id, frage: f })),
  checks,
  entscheidung: failed.length === 0 ? 'angenommen' : 'abgelehnt',
  verbleibende_zweifel: failed.map(c => `${c.name}: ${c.detail}`),
};
console.log(JSON.stringify(out, null, 2));
// Kritiker-Befund ins agentmemory (Lernschleife)
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: `Kritiker: ${out.entscheidung} · "${claim.slice(0,120)}" · ${failed.length} fehlgeschlagene Checks`, concepts: ['kritiker', 'gate', 'review', out.entscheidung] }),
  });
} catch {}
