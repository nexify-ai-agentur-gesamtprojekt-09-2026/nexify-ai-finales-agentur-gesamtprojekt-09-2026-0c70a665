#!/usr/bin/env node
// Support-Modul: Tickets (offen -> in Bearbeitung -> gelöst) + Journal.
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';
import { t as i18n } from './i18n.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const JOURNAL = join(root, 'docs/generiert/support-journal.jsonl');
const TICKETS = join(root, 'docs/generiert/tickets.json');

function ticketId(kunde, frage, ts) {
  return 'tkt-' + createHmac('sha256', 'support').update(`${kunde}|${frage}|${ts}`).digest('hex').slice(0, 12);
}

export function ticketAnlegen(kunde, frage, sprache = 'de') {
  const ts = new Date().toISOString();
  return { id: ticketId(kunde, frage, ts), kunde, frage, zustand: i18n('support.offen', sprache), erstellt: ts, kommentare: [], sprache };
}

export function ticketSpeichern(tickets) {
  mkdirSync(dirname(TICKETS), { recursive: true });
  writeFileSync(TICKETS, JSON.stringify(tickets, null, 2));
}

export function journal(zeile) { mkdirSync(dirname(JOURNAL), { recursive: true }); appendFileSync(JOURNAL, JSON.stringify(zeile) + '\n'); }

// CLI (nur Direktaufruf)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
const [, , kunde = 'kunde@example.com', ...frage] = process.argv;
const t = ticketAnlegen(kunde, frage.join(' ') || 'Wie funktioniert das?');
let tickets = [];
if (existsSync(TICKETS)) { try { tickets = JSON.parse(readFileSync(TICKETS, 'utf8')); } catch {} }
tickets.push(t);
ticketSpeichern(tickets);
journal({ event: 'ticket', id: t.id, zustand: t.zustand, kunde });
// Jeff-Priorisierung (neu): Ticket -> Eskalationsstufe P0..P3
try { execFileSync('node', [join(root, 'tools', 'jeff-incident.mjs'), `${kunde}: ${t.frage}`], { stdio: 'ignore' }); } catch {}
console.log(JSON.stringify({ ticket: t, gesamt: tickets.length, journal: JOURNAL }, null, 2));
}
