import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pruefeDienste, schreibeStatus, ressourcenGrenzen, pruefeVorschauDNS } from '../tools/gesundheit-kern.mjs';

test('echte lokale HTTP-Proben, Redirectstatus, Ausfall und Statusdatei', async t => {
  const server = createServer((req, res) => {
    res.writeHead(req.url === '/kaputt' ? 503 : req.url === '/redirect' ? 302 : 200, { Location: '/kaputt' });
    res.end('lokale Testfixture');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const gesund = await pruefeDienste([['web', base], ['redirect', base + '/redirect', 302]], { minimum: 2 });
  assert.equal(gesund.exitCode, 0);
  assert.deepEqual(gesund.ausfaelle, []);
  const rot = await pruefeDienste([['web', base + '/kaputt']], { minimum: 1 });
  assert.equal(rot.exitCode, 1);
  assert.deepEqual(rot.ausfaelle, ['web=503']);
  const dir = mkdtempSync(path.join(tmpdir(), 'gesundheit-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  schreibeStatus(path.join(dir, 'status.json'), rot);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, 'status.json'), 'utf8')), rot);
});

test('Check-Untergrenze sperrt auch bei gesunden Diensten', async () => {
  const r = await pruefeDienste([['disk', 'ressource:disk:ok']], { minimum: 2 });
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.ausfaelle, ['monitor-untergrenze=0']);
  await assert.rejects(pruefeDienste([], { minimum: NaN }), /Untergrenze/);
  await assert.rejects(pruefeDienste([], { minimum: 0 }), /Untergrenze/);
});

test('Hostproben unterscheiden aktive Units und gesunde Container', async () => {
  const execImpl = cmd => cmd === 'systemctl' ? 'inactive\n' : JSON.stringify([{ State: { Running: true, Health: { Status: 'unhealthy' } } }]);
  const r = await pruefeDienste([['unit', 'systemd:app'], ['container', 'docker:app'], ['unknown', 'bypass:unbekannt']], { minimum: 3, execImpl });
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.ausfaelle, ['unit=0', 'container=0', 'unknown=0']);
  const ok = await pruefeDienste([['unit', 'systemd:app'], ['container', 'docker:app']], { minimum: 2, execImpl: cmd => cmd === 'systemctl' ? 'active\n' : JSON.stringify([{ State: { Running: true } }]) });
  assert.equal(ok.exitCode, 0);
});

test('Transportfehler werden begrenzt wiederholt', async () => {
  let calls = 0;
  const options = { minimum: 1, versuche: 3, warten: async () => {}, fetchImpl: async () => { calls++; throw new Error('timeout'); } };
  const r = await pruefeDienste([['web', 'http://127.0.0.1/']], options);
  assert.equal(calls, 3);
  assert.equal(r.exitCode, 1);
  await assert.rejects(pruefeDienste([['x', 'ressource:x:ok'], ['x', 'ressource:x:ok']], { minimum: 1 }), /Doppelter/);
});

test('Statuspersistenzfehler sind sichtbar', () => {
  assert.throws(() => schreibeStatus('/unbenutzt', {}, () => { throw new Error('disk full'); }), /disk full/);
});

test('Spezialnamen und ungueltige Erwartungswerte koennen Ausfaelle nicht verstecken', async () => {
  const r = await pruefeDienste([['__proto__', 'ressource:disk:rot']], { minimum: 1 });
  assert.equal(r.exitCode, 1);
  assert.deepEqual(r.ausfaelle, ['__proto__=0']);
  await assert.rejects(pruefeDienste([['bad', 'unknown:target', 0]], { minimum: 1 }), /Erwartungsstatus/);
  await assert.rejects(pruefeDienste([['bad', 'ressource:disk:rot', 503]], { minimum: 1 }), /Erwartungsstatus/);
  await assert.rejects(pruefeDienste([['', 'ressource:disk:ok']], { minimum: 1 }), /Check/);
});

test('Ressourcengrenzen sind definiert, konfigurierbar und fail-closed', () => {
  assert.deepEqual(ressourcenGrenzen({}), { diskMaxProzent: 90, speicherMinProzent: 5, lastFaktor: 2 });
  assert.equal(ressourcenGrenzen({ GESUNDHEIT_DISK_MAX_PROZENT: '80' }).diskMaxProzent, 80);
  for (const env of [{ GESUNDHEIT_DISK_MAX_PROZENT: 'kaputt' }, { GESUNDHEIT_DISK_MAX_PROZENT: '101' }, { GESUNDHEIT_SPEICHER_MIN_PROZENT: '-1' }, { GESUNDHEIT_LAST_FAKTOR: '0' }, { GESUNDHEIT_SPEICHER_MIN_PROZENT: '' }, { GESUNDHEIT_SPEICHER_MIN_PROZENT: '  ' }]) assert.throws(() => ressourcenGrenzen(env), /Ressourcengrenzen/);
});

test('DNS-Diagnose prueft exakten DNS-only-Eintrag und hat keine Schreibschnittstelle', async () => {
  const paths = [];
  const options = { zoneName: 'example.test', recordName: 'preview.example.test', expectedIP: '192.0.2.1' };
  const lesen = async path => {
    paths.push(path);
    return paths.length === 1 ? { success: true, result: [{ name: 'example.test', id: 'zone' }] } : { success: true, result: [{ name: 'preview.example.test', type: 'A', content: '192.0.2.1', proxied: false }] };
  };
  assert.deepEqual(await pruefeVorschauDNS({ ...options, lesen }), { cname: 'ok', fehler: false });
  assert.deepEqual(paths, ['/zones?name=example.test', '/zones/zone/dns_records?name=preview.example.test']);
  const mismatch = await pruefeVorschauDNS({ ...options, lesen: async path => path.startsWith('/zones?') ? { success: true, result: [{ name: 'example.test', id: 'zone' }] } : { success: true, result: [{ name: 'preview.example.test', type: 'A', content: '192.0.2.1', proxied: true }] } });
  assert.deepEqual(mismatch, { cname: 'abweichung', fehler: true });
  const red = await pruefeDienste([['dns', 'diagnose:dns:abweichung']], { minimum: 1 });
  assert.equal(red.exitCode, 1);
});

test('Fehlender DNS-Zugriff oder fremde Zone ist unbekannt statt gruen', async () => {
  const options = { zoneName: 'example.test', recordName: 'preview.example.test', expectedIP: '192.0.2.1' };
  for (const lesen of [async () => { throw new Error('not configured'); }, async () => ({ success: true, result: [{ name: 'other.test', id: 'other' }] })]) {
    assert.deepEqual(await pruefeVorschauDNS({ ...options, lesen }), { cname: 'unbekannt', fehler: true });
  }
});

test('Gemischte DNS-Aufloesung und Providerfehler koennen nicht gruen sein', async () => {
  const options = { zoneName: 'example.test', recordName: 'preview.example.test', expectedIP: '192.0.2.1' };
  const correct = { name: 'preview.example.test', type: 'A', content: '192.0.2.1', proxied: false };
  const zone = { success: true, result: [{ name: 'example.test', id: 'zone' }] };
  for (const conflict of [{ ...correct, content: '192.0.2.2' }, { ...correct, type: 'AAAA', content: '2001:db8::1' }]) {
    const result = await pruefeVorschauDNS({ ...options, lesen: async path => path.startsWith('/zones?') ? zone : { success: true, result: [correct, conflict] } });
    assert.deepEqual(result, { cname: 'abweichung', fehler: true });
  }
  const failed = await pruefeVorschauDNS({ ...options, lesen: async path => path.startsWith('/zones?') ? zone : { success: false, result: [correct] } });
  assert.deepEqual(failed, { cname: 'unbekannt', fehler: true });
});
