#!/usr/bin/env node
// Selbsttest-Suite: alle Module prüfen, pass/fail, Exit-Code.
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { revolutVerifyWebhook } from './revolut.mjs';
import { aboAnlegen, rechnungErzeugen } from './abo.mjs';
import { ticketAnlegen } from './support.mjs';
import { buchen } from './ledger.mjs';
import { xrechnung } from './rechnung.mjs';
import { t } from './i18n.mjs';
import { createHmac } from 'node:crypto';

const execFileAsync = promisify(execFile);

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

// agenten-paket + auftrag (CLI) + System-Checks (Dienste + Prometheus + Ein-App)
// Alle Subprozesse sind voneinander unabhängig (keine teilt Ein-/Ausgabe mit einer anderen),
// liefen zuvor aber nacheinander über execFileSync – macOS/Linux + Node-Kaltstart + bis zu zwei
// 5s-curl-Timeouts summierten sich so zu mehreren Sekunden Laufzeit. Mit Promise.all parallel
// gestartet, dauert der Selbsttest nur noch so lange wie der langsamste einzelne Aufruf.
// Jeder Aufruf fängt seinen eigenen Fehler ab, damit ein Fehlschlag die anderen nicht abbricht
// und die Reihenfolge der Einträge in `ergebnis` (und damit die JSON-Ausgabe) unverändert bleibt.
const [agentErg, auftragErg, ...systemErg] = await Promise.all([
  execFileAsync('node', [join(root, 'tools', 'agent.mjs'), 'one', 'Test'], { encoding: 'utf8', cwd: root })
    .then(({ stdout }) => ({ ok: true, agent: JSON.parse(stdout) }))
    .catch((e) => ({ ok: false, fehler: e })),
  execFileAsync('node', [join(root, 'tools', 'auftrag.mjs'), 'neu', 'deploy', 'live'], { encoding: 'utf8', cwd: root })
    .then(({ stdout }) => ({ ok: true, antwort: JSON.parse(stdout) }))
    .catch((e) => ({ ok: false, fehler: e })),
  ...['nexify-vorschau', 'nexify-orchestrierung', 'nexify-payments', 'nexify-produkt'].map((svc) =>
    execFileAsync('systemctl', ['is-active', svc], { encoding: 'utf8' })
      .then(({ stdout }) => ({ svc, status: stdout.trim() }))
      .catch(() => ({ svc, status: null }))),
  execFileAsync('curl', ['-s', '-m', '5', 'http://127.0.0.1:9190/-/healthy'], { encoding: 'utf8' })
    .then(({ stdout }) => ({ svc: 'prometheus', body: stdout })).catch(() => ({ svc: 'prometheus', body: null })),
  execFileAsync('curl', ['-s', '-m', '5', 'http://127.0.0.1:8907/health'], { encoding: 'utf8' })
    .then(({ stdout }) => ({ svc: 'nexify-app', body: stdout })).catch(() => ({ svc: 'nexify-app', body: null })),
]);

if (agentErg.ok) check('agent.tier', agentErg.agent.name === 'NeXify AI one' && agentErg.agent.companion === 'NeXify Companion');
else check('agent.tier', false, String(agentErg.fehler));
if (auftragErg.ok) check('auftrag.hartsperre', auftragErg.antwort.auftrag.agent === 'mensch' && auftragErg.antwort.auftrag.zustand === 'blockiert');
else check('auftrag.hartsperre', false, String(auftragErg.fehler));

for (const r of systemErg.slice(0, 4)) check('system.' + r.svc, r.status === 'active', r.status ?? 'fehlt');
const prom = systemErg[4], app = systemErg[5];
check('system.prometheus', prom.body != null && prom.body.includes('Healthy'));
check('system.nexify-app', app.body != null && app.body.includes('ok'));

const pass = ergebnis.filter((e) => e.ok).length;
console.log(JSON.stringify({ gesamt: ergebnis.length, pass, fail: ergebnis.length - pass, ergebnis }, null, 2));
// Jeff-Health-Gate (neu): bei Fehlschlag Dringlichkeit + Aktion klassifizieren
if (pass !== ergebnis.length) {
  const fehler = ergebnis.filter((e) => !e.ok).map((e) => e.name).join(', ');
  try { execFileSync('node', ['tools/jeff-triage.mjs', `Selbsttest fehlgeschlagen: ${fehler}`], { stdio: 'ignore' }); } catch {}
}
process.exit(pass === ergebnis.length ? 0 : 1);
