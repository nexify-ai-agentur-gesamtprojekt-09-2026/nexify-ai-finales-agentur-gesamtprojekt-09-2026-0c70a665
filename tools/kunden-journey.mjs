#!/usr/bin/env node
// Komplette Kunden-Journey in einem Lauf: Auftrag -> Agent -> Abo -> Rechnung -> Buchung -> Mail -> Support.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
function run(n, args) {
  try { return JSON.parse(execFileSync('node', [join(root, 'tools', n + '.mjs'), ...args], { encoding: 'utf8', cwd: root })); }
  catch { return { fehler: 'modul fehlgeschlagen' }; }
}
const stufe = process.argv[2] || 'one';
const kunde = process.argv[3] || 'p.courbois@icloud.com';
const sprache = process.argv[4] || 'de';
const out = {
  '1_auftrag': run('auftrag', ['neu', 'rag', 'Was ist NeXify?']),
  '2_agent': run('agent', [stufe, 'Hallo']),
  '3_abo': run('abo', [stufe, kunde]),
  '4_rechnung': run('rechnung', ['RG-JOURNEY', kunde, stufe === 'one' ? '9.99' : '19.99', stufe === 'one' ? 'NeXify AI one' : 'NeXify AI one+']),
  '5_ledger': run('ledger', [stufe === 'one' ? '999' : '1999', 'RG-JOURNEY']),
  '6_mail': run('mail', [kunde, 'Willkommen']),
  '7_support': run('support', [kunde, 'Wie geht das?']),
};
console.log(JSON.stringify({
  journey: {
    auftrag: out['1_auftrag']?.auftrag?.agent || '-',
    agent: out['2_agent']?.name || '-',
    abo: out['3_abo']?.booking?.name || '-',
    rechnung: out['4_rechnung']?.datei || '-',
    buchung: out['5_ledger']?.buchung?.id || '-',
    mail: out['6_mail']?.ok !== undefined ? (out['6_mail'].ok ? 'gesendet' : out['6_mail'].grund) : '-',
    support: out['7_support']?.ticket?.id || '-',
  }
}, null, 2));
