#!/usr/bin/env node
// Selbsttest-Suite: alle Module prüfen, pass/fail, Exit-Code.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revolutVerifyWebhook } from './revolut.mjs';
import { aboAnlegen, rechnungErzeugen } from './abo.mjs';
import { ticketAnlegen } from './support.mjs';
import { buchen } from './ledger.mjs';
import { xrechnung } from './rechnung.mjs';
import { t } from './i18n.mjs';
import { createHmac } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ergebnis = [];

function check(name, cond, detail = '') { ergebnis.push({ name, ok: !!cond, detail }); }

// revolut HMAC
const sec = 'test'; const ts = '1700000000'; const body = '{}';
const sig = 'v1=' + createHmac('sha256', sec).update(`v1.${ts}.${body}`).digest('hex');
check('revolut.verify.ok', revolutVerifyWebhook(sig, ts, body, sec));
check('revolut.verify.bad', !revolutVerifyWebhook('v1=deadbeef', ts, body, sec));

// abo + rechnung
const b = aboAnlegen('one', 't@x.de');
check('abo.anlegen', b.id.startsWith('abo-') && b.name === 'NeXify AI one');
const r = rechnungErzeugen(b);
check('abo.rechnung', r.nr.startsWith('RG-') && r.betragEur === 9.99);

// support + ledger + xrechnung + i18n
const tkt = ticketAnlegen('t@x.de', 'Hilfe');
check('support.ticket', tkt.id.startsWith('tkt-'));
const l = buchen({ referenz: 'T', betragCent: 999, typ: 'einnahme' });
check('ledger.buchung', l.id.startsWith('buch-') && l.soll === 'guthaben');
const xml = xrechnung({ nr: 'T', kunde: 'k', betragEur: '9.99', name: 'x', datum: new Date().toISOString() });
check('rechnung.xrechnung', xml.includes('urn:cen.eu:en16931:2017'));
check('i18n.fr', t('willkommen', 'fr') === 'Bienvenue chez');

// agenten-paket + auftrag (CLI)
const agent = JSON.parse(execFileSync('node', [join(root, 'tools', 'agent.mjs'), 'one', 'Test'], { encoding: 'utf8', cwd: root }));
check('agent.tier', agent.name === 'NeXify AI one' && agent.companion === 'NeXify Companion');
const auftrag = JSON.parse(execFileSync('node', [join(root, 'tools', 'auftrag.mjs'), 'neu', 'deploy', 'live'], { encoding: 'utf8', cwd: root }));
check('auftrag.hartsperre', auftrag.auftrag.agent === 'mensch' && auftrag.auftrag.zustand === 'blockiert');

// System-Checks (Dienste + Prometheus + Ein-App)
for (const svc of ['nexify-vorschau','nexify-orchestrierung','nexify-payments','nexify-produkt']) {
  try { const st = execFileSync('systemctl', ['is-active', svc], { encoding: 'utf8' }).trim(); check('system.' + svc, st === 'active', st); }
  catch { check('system.' + svc, false, 'fehlt'); }
}
try { const p = execFileSync('curl', ['-s', '-m', '5', 'http://127.0.0.1:9190/-/healthy'], { encoding: 'utf8' }); check('system.prometheus', p.includes('Healthy')); }
catch { check('system.prometheus', false); }
try { const a = execFileSync('curl', ['-s', '-m', '5', 'http://127.0.0.1:8907/health'], { encoding: 'utf8' }); check('system.nexify-app', a.includes('ok')); }
catch { check('system.nexify-app', false); }

const pass = ergebnis.filter((e) => e.ok).length;
console.log(JSON.stringify({ gesamt: ergebnis.length, pass, fail: ergebnis.length - pass, ergebnis }, null, 2));
// Jeff-Health-Gate (neu): bei Fehlschlag Dringlichkeit + Aktion klassifizieren
if (pass !== ergebnis.length) {
  const fehler = ergebnis.filter((e) => !e.ok).map((e) => e.name).join(', ');
  try { execFileSync('node', ['tools/jeff-triage.mjs', `Selbsttest fehlgeschlagen: ${fehler}`], { stdio: 'ignore' }); } catch {}
}
process.exit(pass === ergebnis.length ? 0 : 1);
