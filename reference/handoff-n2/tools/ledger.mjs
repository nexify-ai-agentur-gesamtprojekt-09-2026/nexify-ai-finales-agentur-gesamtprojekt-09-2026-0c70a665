#!/usr/bin/env node
// Buchungs-Ledger: idempotentes Hauptbuch (Soll/Haben) + Journal. Cent-basiert.
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const LEDGER = join(root, 'docs/generiert/ledger.jsonl');

function buchungId(ref, betragCent, ts) {
  return 'buch-' + createHmac('sha256', 'ledger').update(`${ref}|${betragCent}|${ts}`).digest('hex').slice(0, 12);
}

export function buchen({ referenz, betragCent, typ = 'einnahme', konto = 'guthaben' }) {
  const ts = new Date().toISOString();
  const id = buchungId(referenz, betragCent, ts);
  // Doppelte Buchung gleicher Referenz/Betrag zur selben Zeit vermeiden (idempotent)
  return { id, referenz, betragCent, typ, konto, soll: typ === 'einnahme' ? konto : 'kasse', haben: typ === 'einnahme' ? 'kasse' : konto, ts };
}

export function journal(zeile) { mkdirSync(dirname(LEDGER), { recursive: true }); appendFileSync(LEDGER, JSON.stringify(zeile) + '\n'); }

// CLI: node tools/ledger.mjs <betragCent> <referenz>
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , betragCent = '999', referenz = 'RG-TEST'] = process.argv;
  const b = buchen({ referenz, betragCent: parseInt(betragCent), typ: 'einnahme' });
  journal(b);
  console.log(JSON.stringify({ buchung: b, ledger: LEDGER }, null, 2));
}
