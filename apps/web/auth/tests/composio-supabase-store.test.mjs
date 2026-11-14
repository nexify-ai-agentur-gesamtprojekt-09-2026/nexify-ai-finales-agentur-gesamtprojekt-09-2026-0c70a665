// Composio-Ablage auf Supabase (PostgREST): ohne Netz, gegen einen Fake-fetch. Nur Dummywerte, keine echten Geheimnisse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ComposioStoreError, createMemoryComposioStore, createSupabaseComposioStore, getComposioStore } from '../../lib/composio-store.ts';
import { computeSignature, handleComposioWebhook } from '../../lib/composio-webhook.ts';
import { sbDelete, sbInsert, sbSelect } from '../../lib/supabase-rest.ts';

const DB_URL = 'https://db-geheim.invalid';
const DB_KEY = 'service-role-geheim-0815';
const SECRET = 'test-secret';
const WEBHOOK_ENV = { NEXIFY_COMPOSIO_WEBHOOK: 'on', COMPOSIO_WEBHOOK_SECRET: SECRET };
const NOW = 1_800_000_000_000;
const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TIMEOUT_MS'];

/** Setzt die Umgebung und den Fake-fetch für einen Test und stellt danach alles wieder her. */
async function withEnv(env, fetchImpl, run) {
  const saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  const oldFetch = globalThis.fetch, oldError = console.error, oldWarn = console.warn;
  const logs = [];
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, env);
    globalThis.fetch = fetchImpl;
    console.error = (...args) => logs.push(args.map(String).join(' '));
    console.warn = (...args) => logs.push(args.map(String).join(' '));
    await run(logs);
  } finally {
    globalThis.fetch = oldFetch; console.error = oldError; console.warn = oldWarn;
    for (const key of ENV_KEYS) saved[key] === undefined ? delete process.env[key] : (process.env[key] = saved[key]);
  }
}
const CONFIGURED = { SUPABASE_URL: DB_URL + '/', SUPABASE_SERVICE_ROLE_KEY: DB_KEY };
const noNetwork = async () => { throw new Error('Netzzugriff im Test'); };

/**
 * Kleiner PostgREST-Nachbau für das Schema "composio": eq-Filter, order, limit, select, Upsert über on_conflict
 * mit Prefer resolution=…, DELETE. Zeitstempel kommen wie bei PostgREST mit "+00:00" zurück.
 * `intercept(call)` darf eine eigene Antwort liefern oder werfen (Fehlerfälle).
 */
function fakePostgrest() {
  const keys = { connections: ['connected_account_id'], triggers: ['tenant_id', 'user_id', 'trigger_id'], event_claims: ['event_id'], events: ['event_id'] };
  const tables = { connections: [], triggers: [], event_claims: [], events: [] };
  const db = { tables, calls: [], intercept: null, serial: 0 };
  const stamp = (value) => (typeof value === 'string' ? value.replace(/Z$/, '+00:00') : value);
  const out = (row, select) => {
    const columns = select ? select.split(',') : Object.keys(row);
    return Object.fromEntries(columns.map((column) => [column, column.endsWith('_at') ? stamp(row[column]) : row[column]]));
  };
  db.fetch = async (url, init = {}) => {
    const target = new URL(url);
    assert.ok(String(url).startsWith(DB_URL + '/rest/v1/'), 'Adresse ohne doppelten Schrägstrich');
    const table = target.pathname.slice('/rest/v1/'.length);
    const call = { method: init.method, table, query: target.searchParams, search: target.search, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined };
    db.calls.push(call);
    const intercepted = db.intercept ? await db.intercept(call, init) : undefined;
    if (intercepted) return intercepted;
    if (!(table in tables)) return new Response('{"message":"relation does not exist"}', { status: 404 });
    // Jeder Zugriff muss das Schema "composio" ansprechen und sich mit dem Service-Role-Schlüssel ausweisen.
    assert.equal(call.headers['Accept-Profile'], 'composio');
    if (call.method !== 'GET') assert.equal(call.headers['Content-Profile'], 'composio');
    assert.equal(call.headers.apikey, DB_KEY);
    assert.equal(call.headers.Authorization, 'Bearer ' + DB_KEY);
    const matches = (row) => [...target.searchParams].every(([column, value]) => !value.startsWith('eq.') || String(row[column]) === value.slice(3));
    if (call.method === 'GET') {
      let found = tables[table].filter(matches);
      const order = (target.searchParams.get('order') ?? '').split(',').filter(Boolean).map((part) => part.split('.'));
      found = [...found].sort((a, b) => {
        for (const [column, direction] of order) {
          if (a[column] === b[column]) continue;
          return (a[column] < b[column] ? -1 : 1) * (direction === 'desc' ? -1 : 1);
        }
        return 0;
      });
      const limit = target.searchParams.get('limit');
      if (limit) found = found.slice(0, Number(limit));
      return Response.json(found.map((row) => out(row, target.searchParams.get('select'))));
    }
    if (call.method === 'DELETE') {
      assert.ok([...target.searchParams.values()].some((value) => value.startsWith('eq.')), 'DELETE nur mit Filter');
      tables[table] = tables[table].filter((row) => !matches(row));
      return new Response(null, { status: 204 });
    }
    if (call.method === 'POST') {
      const prefer = call.headers.Prefer ?? '';
      assert.match(prefer, /return=representation/);
      const conflict = (target.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean);
      assert.deepEqual(conflict, keys[table], 'on_conflict nennt den eindeutigen Schlüssel');
      const row = call.body;
      const existing = tables[table].find((entry) => conflict.every((column) => entry[column] === row[column]));
      if (existing) {
        if (prefer.includes('resolution=ignore-duplicates')) return Response.json([], { status: 201 });
        if (!prefer.includes('resolution=merge-duplicates')) return new Response('{"code":"23505","details":"Key already exists"}', { status: 409 });
        // Wie der Trigger der Migration: Mandant und Nutzer einer Verbindung sind unveränderlich.
        if (table === 'connections' && (existing.tenant_id !== row.tenant_id || existing.user_id !== row.user_id)) {
          return new Response(JSON.stringify({ code: '23514', message: 'connection_owner_immutable', details: 'tenant ' + existing.tenant_id }), { status: 400 });
        }
        Object.assign(existing, row);
        return Response.json([out(existing)], { status: 201 });
      }
      const inserted = { id: ++db.serial, created_at: new Date(NOW + db.serial).toISOString(), ...row };
      tables[table].push(inserted);
      return Response.json([out(inserted)], { status: 201 });
    }
    return new Response('{}', { status: 405 });
  };
  return db;
}

function signed(body, id) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(NOW / 1000));
  return new Request('https://x.invalid/webhook/v1', { method: 'POST', body: raw, headers: { 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': 'v1,' + computeSignature(SECRET, id, ts, raw) } });
}
const ev = (type, data = {}, metadata = {}) => ({ id: 'x', type, timestamp: '2026-11-14T00:00:00Z', data, metadata });
const deliver = (body, id) => handleComposioWebhook(signed(body, id), { env: WEBHOOK_ENV, nowMs: () => NOW });
const CONNECTION = { connectedAccountId: 'ca_1', tenantId: 'konto:u1', userId: 'u1', authConfigId: 'ac_test_1', status: 'pending', updatedAt: NOW - 5000 };

test('Supabase-Speicher: Felder werden in beide Richtungen zugeordnet, Schema "composio", Upsert über den Schlüssel', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseComposioStore();
    await store.putConnection(CONNECTION);
    const put = db.calls.at(-1);
    assert.equal(put.method, 'POST');
    assert.equal(put.table, 'connections');
    assert.equal(put.headers.Prefer, 'return=representation,resolution=merge-duplicates');
    assert.deepEqual(put.body, { connected_account_id: 'ca_1', tenant_id: 'konto:u1', user_id: 'u1', auth_config_id: 'ac_test_1', status: 'pending', updated_at: new Date(NOW - 5000).toISOString() });
    assert.deepEqual(await store.getConnection('ca_1'), CONNECTION);
    assert.equal(db.calls.at(-1).query.get('connected_account_id'), 'eq.ca_1');
    assert.equal(await store.getConnection('ca_unbekannt'), null);
    // Statuswechsel überschreibt dieselbe Zeile.
    await store.putConnection({ ...CONNECTION, status: 'active', updatedAt: NOW });
    assert.equal(db.tables.connections.length, 1);
    assert.deepEqual(await store.getConnection('ca_1'), { ...CONNECTION, status: 'active', updatedAt: NOW });

    await store.putTrigger({ triggerId: 'ti_1', slug: 'GITHUB_COMMIT_EVENT', tenantId: 'konto:u1', userId: 'u1', createdAt: NOW });
    assert.deepEqual(db.calls.at(-1).body, { trigger_id: 'ti_1', slug: 'GITHUB_COMMIT_EVENT', tenant_id: 'konto:u1', user_id: 'u1', created_at: new Date(NOW).toISOString() });
    await store.putTrigger({ triggerId: 'ti_1', slug: 'GITHUB_COMMIT_EVENT', tenantId: 'konto:u2', userId: 'u2', createdAt: NOW });
    assert.deepEqual(await store.listTriggers('konto:u1', 'u1'), [{ triggerId: 'ti_1', slug: 'GITHUB_COMMIT_EVENT', tenantId: 'konto:u1', userId: 'u1', createdAt: NOW }]);

    const event = { eventId: 'msg_1', type: 'composio.trigger.message', tenantId: 'konto:u1', userId: 'u1', receivedAt: NOW, summary: { trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1', inhalt: 'vertraulicher Text', email: 'person@example.invalid' } };
    await store.appendEvent(event);
    // Nur die beiden Felder der Zusammenfassung verlassen den Server; sonstige Schlüssel werden nicht gespeichert.
    assert.deepEqual(db.calls.at(-1).body, { event_id: 'msg_1', type: 'composio.trigger.message', tenant_id: 'konto:u1', user_id: 'u1', received_at: new Date(NOW).toISOString(), trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1' });
    assert.equal(db.calls.at(-1).headers.Prefer, 'return=representation,resolution=ignore-duplicates');
    await store.appendEvent(event);
    assert.equal(db.tables.events.length, 1, 'dieselbe Ereignis-Kennung legt keine zweite Zeile an');
    assert.deepEqual(await store.listEvents('konto:u1', 'u1'), [{ ...event, summary: { trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1' } }]);
  });
});

test('Supabase-Speicher: Lesen filtert hart nach Mandant und Nutzer; Pflicht-Mandant beim Schreiben', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseComposioStore();
    await store.putConnection(CONNECTION);
    await store.putConnection({ ...CONNECTION, connectedAccountId: 'ca_2', tenantId: 'konto:u2', userId: 'u2' });
    for (let index = 1; index <= 3; index++) {
      await store.appendEvent({ eventId: 'msg_' + index, type: 'composio.trigger.message', tenantId: 'konto:u1', userId: 'u1', receivedAt: NOW + index, summary: { trigger_slug: 'S', trigger_id: 't' + index } });
    }
    await store.appendEvent({ eventId: 'msg_fremd', type: 'composio.trigger.message', tenantId: 'konto:u2', userId: 'u2', receivedAt: NOW, summary: { trigger_slug: 'S', trigger_id: 't' } });

    assert.deepEqual((await store.listConnections('konto:u1', 'u1')).map((c) => c.connectedAccountId), ['ca_1']);
    const listed = db.calls.at(-1);
    assert.equal(listed.query.get('tenant_id'), 'eq.konto:u1');
    assert.equal(listed.query.get('user_id'), 'eq.u1');
    assert.deepEqual(await store.listConnections('konto:u1', 'u2'), []);
    // Ereignisse: jüngste 200, ältestes zuerst (wie der Arbeitsspeicher).
    assert.deepEqual((await store.listEvents('konto:u1', 'u1')).map((e) => e.eventId), ['msg_1', 'msg_2', 'msg_3']);
    assert.equal(db.calls.at(-1).query.get('order'), 'received_at.desc,id.desc');
    assert.equal(db.calls.at(-1).query.get('limit'), '200');
    // Sonderzeichen in Kennungen werden kodiert und brechen den Filter nicht auf.
    await store.listEvents('konto:u1&user_id=eq.u2', 'u1');
    assert.ok(db.calls.at(-1).search.includes('tenant_id=eq.konto%3Au1%26user_id%3Deq.u2&user_id=eq.u1'));
    // Ohne Mandant oder Nutzer wird nichts gelesen und nichts abgefragt.
    const before = db.calls.length;
    assert.deepEqual(await store.listEvents('', 'u1'), []);
    assert.deepEqual(await store.listConnections('konto:u1', ''), []);
    assert.deepEqual(await store.listTriggers('', ''), []);
    assert.equal(db.calls.length, before);
    // Zweite Schranke: Liefert die Datenbank trotz Filter fremde Zeilen, gibt der Speicher sie nicht heraus.
    db.intercept = (call) => (call.method === 'GET' ? Response.json(db.tables[call.table]) : undefined);
    assert.deepEqual((await store.listConnections('konto:u1', 'u1')).map((c) => c.tenantId), ['konto:u1']);
    assert.deepEqual((await store.listEvents('konto:u2', 'u2')).map((e) => e.eventId), ['msg_fremd']);
    db.intercept = null;

    await assert.rejects(() => store.putConnection({ ...CONNECTION, tenantId: '' }), /tenant_required/);
    await assert.rejects(() => store.putTrigger({ triggerId: 't', slug: 's', tenantId: 'konto:u1', userId: '', createdAt: NOW }), /tenant_required/);
    await assert.rejects(() => store.appendEvent({ eventId: 'e', type: 't', tenantId: '', userId: 'u1', receivedAt: NOW, summary: {} }), /tenant_required/);
    // Eine bestehende Verbindung wechselt nicht den Mandanten (die Datenbank lehnt ab, der Speicher meldet nur den Code).
    await assert.rejects(() => store.putConnection({ ...CONNECTION, tenantId: 'konto:fremd', userId: 'fremd' }), (e) => e instanceof ComposioStoreError && e.message === 'composio_store_failed');
    assert.equal((await store.getConnection('ca_1')).tenantId, 'konto:u1');
  });
});

test('Supabase-Speicher: claimEvent gewinnt genau einmal je Kennung, auch bei gleichzeitigen Zustellungen; Freigabe erlaubt eine neue', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseComposioStore();
    assert.equal(await store.claimEvent('msg_1'), true);
    const claim = db.calls.at(-1);
    assert.equal(claim.method, 'POST');
    assert.equal(claim.table, 'event_claims');
    assert.equal(claim.query.get('on_conflict'), 'event_id');
    assert.equal(claim.headers.Prefer, 'return=representation,resolution=ignore-duplicates');
    assert.deepEqual(claim.body, { event_id: 'msg_1' });
    // Konflikt: PostgREST antwortet mit leerer Liste, kein Fehler.
    assert.equal(await store.claimEvent('msg_1'), false);
    assert.equal(db.tables.event_claims.length, 1);
    const race = await Promise.all(Array.from({ length: 25 }, () => store.claimEvent('msg_gleichzeitig')));
    assert.equal(race.filter(Boolean).length, 1);
    await store.releaseEvent('msg_1');
    assert.equal(db.calls.at(-1).method, 'DELETE');
    assert.equal(db.calls.at(-1).query.get('event_id'), 'eq.msg_1');
    assert.equal(await store.claimEvent('msg_1'), true);
    // Eine unerwartete Antwort wird nie als gewonnen gewertet.
    db.intercept = () => new Response('', { status: 201 });
    await assert.rejects(() => store.claimEvent('msg_leer'), (e) => e.code === 'composio_store_failed');
    db.intercept = () => Response.json([{ event_id: 'andere' }], { status: 201 });
    assert.equal(await store.claimEvent('msg_falsch'), false);
  });
});

test('Ohne Konfiguration: getComposioStore liefert den Arbeitsspeicher und fasst das Netz nicht an; mit Konfiguration Supabase', async () => {
  await withEnv({}, noNetwork, async () => {
    const store = getComposioStore();
    assert.equal(getComposioStore(), store);
    assert.equal(await store.claimEvent('msg_lokal'), true);
    assert.equal(await store.claimEvent('msg_lokal'), false);
    await store.releaseEvent('msg_lokal');
    // Der Supabase-Speicher selbst scheitert ohne Konfiguration geschlossen, mit festem Code.
    await assert.rejects(() => createSupabaseComposioStore().claimEvent('msg_x'), (e) => e instanceof ComposioStoreError && e.code === 'composio_store_not_configured');
    await assert.rejects(() => createSupabaseComposioStore().getConnection('ca_1'), (e) => e.code === 'composio_store_not_configured');
  });
  // Nur eine der beiden Variablen gilt nicht als konfiguriert.
  await withEnv({ SUPABASE_URL: DB_URL }, noNetwork, async () => {
    assert.equal(await getComposioStore().claimEvent('msg_halb'), true);
  });
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    assert.equal(await getComposioStore().claimEvent('msg_db'), true);
    assert.deepEqual(db.tables.event_claims.map((row) => row.event_id), ['msg_db']);
  });
});

test('Zeitüberschreitung: fester Code, und der Webhook antwortet 500, damit Composio erneut zustellt', async () => {
  // Der Zeitgeber von AbortSignal.timeout hält den Prozess nicht am Leben; der Fake tut es bis zum Abbruch selbst.
  const hanging = (url, init) => new Promise((resolve, reject) => {
    const alive = setTimeout(() => reject(new Error('Zeitlimit hat nicht gegriffen')), 5000);
    init.signal.addEventListener('abort', () => { clearTimeout(alive); reject(init.signal.reason); });
  });
  await withEnv({ ...CONFIGURED, SUPABASE_TIMEOUT_MS: '100' }, hanging, async (logs) => {
    const started = Date.now();
    await assert.rejects(() => createSupabaseComposioStore().claimEvent('msg_1'), (e) => e instanceof ComposioStoreError && e.code === 'composio_store_timeout' && e.message === 'composio_store_timeout');
    assert.ok(Date.now() - started < 2000);
    const response = await deliver(ev('composio.connected_account.activated', { id: 'ca_1' }), 'msg_zeit');
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'storage_unavailable' });
    assert.ok(logs.some((line) => line.includes('"code":"composio_store_timeout"')));
  });
});

test('Fehler tragen kein Geheimnis: weder Adresse noch Schlüssel, Pfad, Datenbanktext oder Kennungen in Meldung, Antwort und Protokoll', async () => {
  const leaks = [DB_URL, 'db-geheim', DB_KEY, 'geheimer Datenbanktext', 'ca_vertraulich', 'msg_vertraulich', 'konto:u1', 'rest/v1', 'event_claims'];
  const clean = (text) => leaks.forEach((leak) => assert.ok(!text.includes(leak), `"${leak}" darf nicht vorkommen`));
  const failing = [
    async () => new Response(`{"message":"geheimer Datenbanktext ${DB_KEY}","details":"Key (event_id)=(msg_vertraulich)"}`, { status: 500 }),
    async () => { throw new TypeError(`fetch failed: getaddrinfo ENOTFOUND ${DB_URL} mit ${DB_KEY}`); },
    async () => new Response('<html>geheimer Datenbanktext</html>', { status: 200 }),
  ];
  for (const fetchImpl of failing) {
    await withEnv(CONFIGURED, fetchImpl, async (logs) => {
      const store = createSupabaseComposioStore();
      const attempts = [
        () => store.claimEvent('msg_vertraulich'),
        () => store.releaseEvent('msg_vertraulich'),
        () => store.getConnection('ca_vertraulich'),
        () => store.listEvents('konto:u1', 'u1'),
        () => store.putConnection({ ...CONNECTION, connectedAccountId: 'ca_vertraulich' }),
        () => store.appendEvent({ eventId: 'msg_vertraulich', type: 'composio.trigger.message', tenantId: 'konto:u1', userId: 'u1', receivedAt: NOW, summary: {} }),
      ];
      for (const attempt of attempts) {
        const error = await attempt().then(() => null, (e) => e);
        assert.ok(error instanceof ComposioStoreError);
        assert.equal(error.message, 'composio_store_failed');
        assert.equal(error.cause, undefined);
        clean(String(error.stack) + JSON.stringify(error) + JSON.stringify(Object.getOwnPropertyNames(error).map((name) => String(error[name]))));
      }
      const response = await deliver(ev('composio.connected_account.activated', { id: 'ca_vertraulich' }), 'msg_vertraulich');
      assert.equal(response.status, 500);
      const text = await response.text();
      assert.deepEqual(JSON.parse(text), { error: 'storage_unavailable' });
      clean(text);
      assert.ok(logs.length > 0);
      clean(logs.join('\n'));
    });
  }
});

test('Webhook Ende-zu-Ende mit dem Supabase-Speicher: Status, Idempotenz, mandantengebundene Ablage ohne Ereignisinhalt', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    await getComposioStore().putConnection(CONNECTION);
    const activated = ev('composio.connected_account.activated', { id: 'ca_1' });
    const first = await deliver(activated, 'msg_a');
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { status: 'processed' });
    assert.equal(db.tables.connections[0].status, 'active');
    assert.equal(db.tables.connections[0].updated_at, new Date(NOW).toISOString());
    // Wiederholung derselben Kennung: quittiert, aber nichts wird erneut geschrieben.
    db.tables.connections[0].status = 'pending';
    const writesBefore = db.calls.filter((call) => call.table === 'connections' && call.method === 'POST').length;
    const again = await deliver(activated, 'msg_a');
    assert.deepEqual(await again.json(), { status: 'duplicate' });
    assert.equal(db.tables.connections[0].status, 'pending');
    assert.equal(db.calls.filter((call) => call.table === 'connections' && call.method === 'POST').length, writesBefore);

    // Trigger-Ereignis: Mandant und Nutzer kommen aus der Verbindung, nicht aus dem Ereignis; der Inhalt bleibt draußen.
    const message = ev('composio.trigger.message', { betreff: 'Vertraulicher Betreff', von: 'person@example.invalid', tenant_id: 'konto:angreifer' }, { connected_account_id: 'ca_1', trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1', user_id: 'angreifer' });
    const stored = await deliver(message, 'msg_b');
    assert.deepEqual(await stored.json(), { status: 'processed' });
    assert.equal(db.tables.events.length, 1);
    const { id, created_at, ...row } = db.tables.events[0];
    assert.deepEqual(row, { event_id: 'msg_b', type: 'composio.trigger.message', tenant_id: 'konto:u1', user_id: 'u1', received_at: new Date(NOW).toISOString(), trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1' });
    const sent = JSON.stringify(db.calls.map((call) => call.body ?? null));
    for (const leak of ['Vertraulicher Betreff', 'person@example.invalid', 'angreifer', SECRET]) assert.ok(!sent.includes(leak));
    assert.deepEqual(await getComposioStore().listEvents('konto:u1', 'u1'), [{ eventId: 'msg_b', type: 'composio.trigger.message', tenantId: 'konto:u1', userId: 'u1', receivedAt: NOW, summary: { trigger_slug: 'GITHUB_COMMIT_EVENT', trigger_id: 'ti_1' } }]);
    assert.deepEqual(await getComposioStore().listEvents('konto:angreifer', 'angreifer'), []);

    // Unbekanntes Konto: quittiert und ignoriert, nichts abgelegt.
    const unknown = await deliver(ev('composio.trigger.message', {}, { connected_account_id: 'ca_fremd', trigger_slug: 'X', trigger_id: 'y' }), 'msg_c');
    assert.deepEqual(await unknown.json(), { status: 'ignored' });
    assert.equal(db.tables.events.length, 1);
    assert.deepEqual(db.tables.event_claims.map((claim) => claim.event_id).sort(), ['msg_a', 'msg_b', 'msg_c']);
  });
});

test('Webhook: scheitert claimEvent, kommt 500 und die Wiederzustellung wird verarbeitet; scheitert die Verarbeitung, wird die Kennung freigegeben', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async (logs) => {
    await getComposioStore().putConnection(CONNECTION);
    const activated = ev('composio.connected_account.activated', { id: 'ca_1' });

    // 1) Die Beanspruchung scheitert (Datenbank antwortet 503).
    db.intercept = (call) => (call.table === 'event_claims' && call.method === 'POST' ? new Response('{"message":"upstream"}', { status: 503 }) : undefined);
    const failed = await deliver(activated, 'msg_1');
    assert.equal(failed.status, 500);
    assert.deepEqual(await failed.json(), { error: 'storage_unavailable' });
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    assert.equal(db.tables.connections[0].status, 'pending', 'ohne Beanspruchung wird nichts verarbeitet');
    assert.ok(logs.some((line) => line.includes('"step":"claim"') && line.includes('"code":"composio_store_failed"')));
    db.intercept = null;
    const retried = await deliver(activated, 'msg_1');
    assert.deepEqual(await retried.json(), { status: 'processed' });
    assert.equal(db.tables.connections[0].status, 'active');

    // 2) Die Beanspruchung wurde geschrieben, aber die Antwort ging verloren: Die Kennung wird freigegeben,
    //    sonst gälte die Wiederzustellung als Duplikat und das Ereignis wäre verloren.
    db.intercept = (call) => {
      if (call.table !== 'event_claims' || call.method !== 'POST') return undefined;
      db.tables.event_claims.push({ event_id: call.body.event_id });
      throw new TypeError('fetch failed');
    };
    assert.equal((await deliver(ev('composio.connected_account.expired', { id: 'ca_1' }), 'msg_2')).status, 500);
    assert.ok(!db.tables.event_claims.some((claim) => claim.event_id === 'msg_2'));
    db.intercept = null;
    assert.deepEqual(await (await deliver(ev('composio.connected_account.expired', { id: 'ca_1' }), 'msg_2')).json(), { status: 'processed' });
    assert.equal(db.tables.connections[0].status, 'expired');

    // 3) Die Verarbeitung scheitert nach gewonnener Beanspruchung (Ablage des Ereignisses): 500 und Freigabe.
    const message = ev('composio.trigger.message', {}, { connected_account_id: 'ca_1', trigger_slug: 'S', trigger_id: 't' });
    db.intercept = (call) => (call.table === 'events' ? new Response('{"message":"down"}', { status: 500 }) : undefined);
    const broken = await deliver(message, 'msg_3');
    assert.equal(broken.status, 500);
    assert.deepEqual(await broken.json(), { error: 'processing_failed' });
    assert.ok(!db.tables.event_claims.some((claim) => claim.event_id === 'msg_3'));
    db.intercept = null;
    assert.deepEqual(await (await deliver(message, 'msg_3')).json(), { status: 'processed' });
    assert.deepEqual(db.tables.events.map((row) => row.event_id), ['msg_3']);

    // 4) Scheitert auch die Freigabe, bleibt es bei 500 (kein unbehandelter Fehler).
    db.intercept = (call) => (call.table === 'events' || call.method === 'DELETE' ? new Response('{}', { status: 500 }) : undefined);
    const stuck = await deliver(message, 'msg_4');
    assert.equal(stuck.status, 500);
    assert.ok(logs.some((line) => line.includes('"step":"release"')));
  });
});

test('Webhook: ein Speicher, dessen claimEvent wirft, führt zu 500 (auch außerhalb von Supabase)', async () => {
  const store = createMemoryComposioStore();
  await store.putConnection(CONNECTION);
  let released = 0;
  const throwing = { ...store, claimEvent: async () => { throw new Error('intern: ' + DB_KEY); }, releaseEvent: async () => { released += 1; } };
  await withEnv({}, noNetwork, async (logs) => {
    const response = await handleComposioWebhook(signed(ev('composio.connected_account.activated', { id: 'ca_1' }), 'msg_1'), { env: WEBHOOK_ENV, store: throwing, nowMs: () => NOW });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'storage_unavailable' });
    assert.equal(released, 1);
    assert.equal((await store.getConnection('ca_1')).status, 'pending');
    assert.ok(!logs.join('\n').includes(DB_KEY));
    assert.ok(logs.some((line) => line.includes('"code":"unknown"')));
  });
});

test('PostgREST-Client: Chat-Standard unverändert (Schema "chat"), Schema-Parameter nur auf Wunsch, Löschen nur mit Filter', async () => {
  const seen = [];
  const record = async (url, init) => { seen.push({ url: String(url), init }); return Response.json([{ id: 1 }]); };
  await withEnv(CONFIGURED, record, async () => {
    await sbInsert('chat_messages', { content: 'x' });
    assert.equal(seen[0].url, DB_URL + '/rest/v1/chat_messages');
    assert.equal(seen[0].init.headers['Accept-Profile'], 'chat');
    assert.equal(seen[0].init.headers['Content-Profile'], 'chat');
    assert.equal(seen[0].init.headers.Prefer, 'return=representation');
    await sbSelect('chat_offers?id=eq.1&select=*');
    assert.equal(seen[1].init.headers['Accept-Profile'], 'chat');
    assert.equal(seen[1].init.headers['Content-Profile'], undefined);
    assert.equal(seen[1].init.headers.Prefer, undefined);
    await sbSelect('events?tenant_id=eq.t', { schema: 'composio' });
    assert.equal(seen[2].init.headers['Accept-Profile'], 'composio');
    await assert.rejects(() => sbDelete('event_claims', { schema: 'composio' }), /supabase_delete_requires_filter/);
    await assert.rejects(() => sbDelete('event_claims?select=*', { schema: 'composio' }), /supabase_delete_requires_filter/);
    assert.equal(seen.length, 3, 'ohne Filter geht keine Löschanfrage hinaus');
  });
});
