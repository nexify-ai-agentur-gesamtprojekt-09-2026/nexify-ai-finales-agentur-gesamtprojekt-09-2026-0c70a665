import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { revolutVerifyWebhook } from './revolut.mjs';
import { xrechnung } from './rechnung.mjs';
import { preis, reservieren, abrechnen } from '../prototypen/lib/prepaid.js';

const now = Date.UTC(2026, 8, 30, 12);
const secret = 'test-secret';
const raw = '{"event":"ORDER_COMPLETED"}';
const signature = 'v1=' + createHmac('sha256', secret).update(`v1.${now}.${raw}`).digest('hex');

test('Webhook-Signaturen akzeptieren Schlüsselwechsel, aber keine alten oder kaputten Signaturen', () => {
  assert.equal(revolutVerifyWebhook(`v1=${'0'.repeat(64)}, ${signature}`, String(now), raw, secret, now), true);
  assert.equal(revolutVerifyWebhook(signature, String(now - 300_001), raw, secret, now), false);
  assert.equal(revolutVerifyWebhook(signature, String(now), raw + ' ', secret, now), false);
  assert.equal(revolutVerifyWebhook(signature, 'ungueltig', raw, secret, now), false);
  assert.equal(revolutVerifyWebhook(signature, String(now), raw, '', now), false);
});

const konto = () => ({
  mandant: 'm1', saldoUc: 10_000_000, reserviertUc: 0, sperre: null,
  kostenstellen: { frei: { budgetCent: null, verbrauchtUc: 0 } }, journal: [],
});
const anfrage = { id: 'req-1', kostenstelle: 'frei', schaetzungUc: 2_000_000 };
const kosten = { vkUc: 1_000_000, ekUc: 500_000, modell: 'test', version: 'v1' };

test('Ungültige Token und Reservierungen werden abgewiesen', () => {
  const tabelle = { version: 'v1', modus: 'aufschlag', satz: 0.45, modelle: { test: { ekEinCent: 10, ekAusCent: 20 } } };
  assert.throws(() => preis(tabelle, 'test', { input: NaN }), { code: 'E_TOKEN' });
  assert.throws(() => preis(tabelle, 'test', { input: Number.MAX_SAFE_INTEGER }), { code: 'E_PREIS' });
  assert.throws(() => preis({ ...tabelle, modelle: { test: { ...tabelle.modelle.test, ekCacheCent: -1 } } }, 'test', { cacheLesen: 1 }), { code: 'E_PREIS_FEHLT' });
  assert.throws(() => reservieren(konto(), 'm1', { ...anfrage, schaetzungUc: -1 }), { code: 'E_RESERVIERUNG' });
  assert.throws(() => reservieren(konto(), 'm1', { ...anfrage, schaetzungUc: 0.5 }), { code: 'E_RESERVIERUNG' });
  const k = reservieren(konto(), 'm1', anfrage);
  assert.throws(() => reservieren(k, 'm1', { ...anfrage, schaetzungUc: 1 }), { code: 'E_RESERVIERUNG' });
  assert.equal(reservieren(k, 'm1', anfrage), k);
});

test('Abrechnung darf Reservierung nicht still unterschreiten oder ungültige Beträge buchen', () => {
  const k = reservieren(konto(), 'm1', anfrage);
  assert.throws(() => abrechnen(k, 'm1', anfrage.id, { ...kosten, vkUc: 3_000_000 }, now), { code: 'E_OBERGRENZE' });
  assert.throws(() => abrechnen(k, 'm1', anfrage.id, { ...kosten, vkUc: NaN }, now), { code: 'E_PREIS' });
  assert.equal(abrechnen(k, 'm1', anfrage.id, kosten, now).saldoUc, 9_000_000);
});

test('Rechnungsdaten bleiben gültiger XML-Text und die CLI verbietet Dateipfade', () => {
  const xml = xrechnung({ nr: 'RG&1', kunde: 'A & B <GmbH>', name: '"Beratung"', betragEur: '9.99', datum: '2026-09-30' });
  assert.match(xml, /<cbc:ID>RG&amp;1<\/cbc:ID>/);
  assert.match(xml, /A &amp; B &lt;GmbH&gt;/);
  assert.match(xml, /&quot;Beratung&quot;/);
  assert.throws(() => xrechnung({ nr: 'RG-1', kunde: 'A', name: 'B', datum: '2026-09-30', betragEur: '9.99</cbc:PayableAmount>' }), /Betrag muss/);
  const cli = fileURLToPath(new URL('./rechnung.mjs', import.meta.url));
  const attempt = spawnSync(process.execPath, [cli, '../ausserhalb', 'Kunde', '9.99', 'Test'], { encoding: 'utf8' });
  assert.notEqual(attempt.status, 0);
  assert.match(attempt.stderr, /Ungültige Rechnungsnummer/);
});
