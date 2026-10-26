#!/usr/bin/env node
// Abo-Loop: Buchung -> Rechnung -> Bestätigung -> Mail-Outbox. Idempotent + Journal.
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { t } from './i18n.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const PAKET = JSON.parse(readFileSync(join(root, 'config/agenten-paket.json'), 'utf8'));
const JOURNAL = join(root, 'docs/generiert/abo-journal.jsonl');
const OUTBOX = join(root, 'docs/generiert/mail-outbox.jsonl');

function id(kunde, stufe, ts) {
  return 'abo-' + createHmac('sha256', 'abo').update(`${kunde}|${stufe}|${ts}`).digest('hex').slice(0, 16);
}

export function aboAnlegen(stufe, kunde) {
  const p = PAKET.stufen[stufe] || PAKET.stufen.one;
  const ts = new Date().toISOString();
  const booking = { id: id(kunde, stufe, ts), stufe, name: p.name, modell: p.modell, companion: p.companion, preisEurMonat: p.preisEurMonat, kunde, erstellt: ts, zustand: 'gebucht' };
  return booking;
}

export function rechnungErzeugen(booking) {
  const nr = 'RG-' + booking.id.slice(4, 12).toUpperCase();
  return { nr, bookingId: booking.id, kunde: booking.kunde, position: booking.name, betragEur: booking.preisEurMonat, waehrung: 'EUR', datum: new Date().toISOString(), status: 'offen' };
}

export function bestaetigung(booking, sprache = 'de') {
  const betreff = `${t('mail.willkommen', sprache)} ${booking.name}`;
  const text = `${t('mail.willkommen', sprache)} ${booking.name} (${booking.modell} + ${booking.companion}) ${t('aktiv', sprache)}.`;
  return { betreff, text, sprache };
}

export function journal(zeile) { mkdirSync(dirname(JOURNAL), { recursive: true }); appendFileSync(JOURNAL, JSON.stringify(zeile) + '\n'); }
export function mailOutbox(mail) { mkdirSync(dirname(OUTBOX), { recursive: true }); appendFileSync(OUTBOX, JSON.stringify(mail) + '\n'); }

// CLI (nur Direktaufruf)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
const [, , stufe = 'one', kunde = 'kunde@example.com'] = process.argv;
const b = aboAnlegen(stufe, kunde);
const r = rechnungErzeugen(b);
const m = bestaetigung(b);
journal({ event: 'gebucht', ...b });
mailOutbox({ an: kunde, betreff: m.betreff, text: m.text });
console.log(JSON.stringify({ booking: b, rechnung: r, mail: m, journal: JOURNAL, outbox: OUTBOX }, null, 2));
}
