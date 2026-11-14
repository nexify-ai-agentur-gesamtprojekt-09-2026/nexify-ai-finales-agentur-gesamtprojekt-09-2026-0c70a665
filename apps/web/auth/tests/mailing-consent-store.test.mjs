// Einwilligungs-Speicher auf Supabase (PostgREST): ohne Netz, gegen einen Fake-fetch. Nur Dummywerte, keine echten Geheimnisse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseMailingConsentStore, getMailingConsentStore, MailingConsentStoreError } from '../../mailing/consent-store.ts';
import { handleSubscribe, handleUnsubscribe, sha256Hex } from '../../mailing/consent.ts';

const DB_URL = 'https://db-geheim.invalid';
const DB_KEY = 'service-role-geheim-0815';
const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TIMEOUT_MS'];
const CONFIGURED = { SUPABASE_URL: DB_URL + '/', SUPABASE_SERVICE_ROLE_KEY: DB_KEY };
const HASH = sha256Hex('person@beispiel.invalid');
const TOKEN_HASH = sha256Hex('kennzeichen-eins');
const UNSUB = 'U'.repeat(43);
const PENDING = {
  emailHash: HASH, email: 'person@beispiel.invalid', lang: 'de', source: 'preise/checkliste', consentVersion: 'test.1',
  consentTextSha256: sha256Hex('wortlaut'), requestedAt: NOW, confirmTokenHash: TOKEN_HASH, confirmExpiresAt: NOW + 48 * HOUR, unsubscribeToken: UNSUB,
};

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

/**
 * Kleiner PostgREST-Nachbau für das Schema "mailing": Filter eq/neq/gt/lt, limit, select, Einfügen mit on_conflict und
 * Prefer resolution=ignore-duplicates, PATCH und DELETE mit Filter. Bildet die Sperren der Migration 0005 nach:
 * Zustand nur vorwärts, Löschen nur unbestätigter Zeilen, Sperrliste und Verlauf nur Anfügen.
 */
function fakePostgrest() {
  const keys = { subscriptions: ['email_hash'], suppressions: ['email_hash'], consent_events: null };
  const tables = { subscriptions: [], suppressions: [], consent_events: [] };
  const db = { tables, calls: [], intercept: null };
  const stamp = (value) => (typeof value === 'string' ? value.replace(/Z$/, '+00:00') : value);
  const out = (row, select) => Object.fromEntries((select ? select.split(',') : Object.keys(row)).map((column) => [column, column.endsWith('_at') ? stamp(row[column] ?? null) : row[column] ?? null]));
  const compare = (actual, operator, expected) => {
    if (operator === 'eq') return String(actual) === expected;
    if (operator === 'neq') return String(actual) !== expected;
    if (actual === null || actual === undefined) return false;
    return operator === 'gt' ? Date.parse(actual) > Date.parse(expected) : Date.parse(actual) < Date.parse(expected);
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
    assert.equal(call.headers['Accept-Profile'], 'mailing');
    if (call.method !== 'GET') assert.equal(call.headers['Content-Profile'], 'mailing');
    assert.equal(call.headers.apikey, DB_KEY);
    assert.equal(call.headers.Authorization, 'Bearer ' + DB_KEY);
    const filters = [...target.searchParams].filter(([column]) => !['select', 'limit', 'order', 'on_conflict'].includes(column)).map(([column, value]) => [column, value.slice(0, value.indexOf('.')), value.slice(value.indexOf('.') + 1)]);
    for (const [, operator] of filters) assert.ok(['eq', 'neq', 'gt', 'lt'].includes(operator), 'bekannter Filter');
    const matches = (row) => filters.every(([column, operator, value]) => compare(row[column], operator, value));
    if (call.method === 'GET') {
      let found = tables[table].filter(matches);
      const limit = target.searchParams.get('limit');
      if (limit) found = found.slice(0, Number(limit));
      return Response.json(found.map((row) => out(row, target.searchParams.get('select'))));
    }
    if (call.method === 'DELETE') {
      assert.equal(table, 'subscriptions', 'gelöscht wird nur in subscriptions');
      assert.ok(filters.length > 0, 'DELETE nur mit Filter');
      if (tables[table].filter(matches).some((row) => row.status !== 'pending')) return new Response('{"code":"23514","message":"subscription_delete_only_pending"}', { status: 400 });
      tables[table] = tables[table].filter((row) => !matches(row));
      return new Response(null, { status: 204 });
    }
    if (call.method === 'PATCH') {
      assert.equal(table, 'subscriptions', 'geändert wird nur in subscriptions');
      assert.ok(filters.length > 0, 'PATCH nur mit Filter');
      assert.match(call.headers.Prefer ?? '', /return=representation/);
      const hit = tables[table].filter(matches);
      for (const row of hit) {
        if (row.status === 'unsubscribed' && call.body.status && call.body.status !== 'unsubscribed') return new Response('{"code":"23514","message":"subscription_unsubscribe_final"}', { status: 400 });
        Object.assign(row, call.body);
      }
      return Response.json(hit.map((row) => out(row)));
    }
    if (call.method === 'POST') {
      const prefer = call.headers.Prefer ?? '';
      assert.match(prefer, /return=representation/);
      const conflict = (target.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean);
      if (keys[table]) assert.deepEqual(conflict, keys[table], 'on_conflict nennt den eindeutigen Schlüssel');
      const row = call.body;
      if (keys[table] && tables[table].some((entry) => conflict.every((column) => entry[column] === row[column]))) {
        assert.match(prefer, /resolution=ignore-duplicates/, 'vorhandene Zeilen werden nie überschrieben');
        return Response.json([], { status: 201 });
      }
      tables[table].push({ ...row });
      return Response.json([out(row)], { status: 201 });
    }
    return new Response('{}', { status: 405 });
  };
  return db;
}

test('Ohne Supabase-Konfiguration gibt es keinen Speicher (kein Rückfall auf den Arbeitsspeicher)', async () => {
  await withEnv({}, async () => { throw new Error('Netzzugriff im Test'); }, async () => {
    assert.equal(getMailingConsentStore(), null);
    await assert.rejects(createSupabaseMailingConsentStore().isSuppressed(HASH), (error) => error instanceof MailingConsentStoreError && error.code === 'mailing_store_not_configured');
  });
  await withEnv(CONFIGURED, fakePostgrest().fetch, async () => assert.ok(getMailingConsentStore()));
});

test('Anlegen, erneut anfragen, bestätigen: jede Änderung trägt den erwarteten Ausgangszustand im Filter', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    assert.equal(await store.getSubscription(HASH), null);
    assert.equal(await store.insertPending(PENDING), true);
    assert.equal(await store.insertPending({ ...PENDING, email: 'fremd@adresse.invalid' }), false, 'vorhandene Zeile wird nicht überschrieben');
    const insert = db.calls.find((call) => call.method === 'POST');
    assert.equal(insert.search, '?on_conflict=email_hash');
    assert.match(insert.headers.Prefer, /resolution=ignore-duplicates/);
    assert.equal(insert.body.status, 'pending');
    assert.equal(insert.body.requested_at, new Date(NOW).toISOString());
    assert.equal(insert.body.confirm_mails_sent, 1);
    let record = await store.getSubscription(HASH);
    assert.deepEqual(record, {
      emailHash: HASH, email: 'person@beispiel.invalid', lang: 'de', status: 'pending', source: 'preise/checkliste', consentVersion: 'test.1',
      consentTextSha256: sha256Hex('wortlaut'), requestedAt: NOW, confirmedAt: null, unsubscribedAt: null, confirmMailsSent: 1,
    });
    assert.ok(!('confirmTokenHash' in record) && !('unsubscribeToken' in record), 'Kennzeichen werden nie herausgegeben');

    const renewed = { lang: 'de', source: 'preise/checkliste', consentVersion: 'test.2', consentTextSha256: sha256Hex('neu'), requestedAt: NOW + HOUR, confirmTokenHash: sha256Hex('kennzeichen-zwei'), confirmExpiresAt: NOW + 49 * HOUR };
    assert.equal(await store.renewPending(HASH, 0, renewed), false, 'falscher Zählerstand: ein anderer Aufruf war schneller');
    assert.equal(await store.renewPending(HASH, 1, renewed), true);
    const patch = db.calls.filter((call) => call.method === 'PATCH').at(-1);
    assert.equal(patch.query.get('status'), 'eq.pending');
    assert.equal(patch.query.get('confirm_mails_sent'), 'eq.1');
    assert.equal(patch.body.confirm_mails_sent, 2);

    assert.equal(await store.confirmByTokenHash(TOKEN_HASH, NOW + 2 * HOUR), null, 'altes Kennzeichen gilt nicht mehr');
    assert.equal(await store.confirmByTokenHash(sha256Hex('kennzeichen-zwei'), NOW + 50 * HOUR), null, 'Frist abgelaufen');
    record = await store.confirmByTokenHash(sha256Hex('kennzeichen-zwei'), NOW + 2 * HOUR);
    assert.equal(record.status, 'confirmed');
    assert.equal(record.confirmedAt, NOW + 2 * HOUR);
    assert.equal(record.consentVersion, 'test.2');
    const confirm = db.calls.filter((call) => call.method === 'PATCH').at(-1);
    assert.equal(confirm.query.get('status'), 'eq.pending');
    assert.equal(confirm.query.get('confirm_expires_at'), 'gt.' + new Date(NOW + 2 * HOUR).toISOString());
    assert.deepEqual([confirm.body.confirm_token_hash, confirm.body.confirm_expires_at], [null, null], 'Kennzeichen verbraucht');
    assert.equal(await store.confirmByTokenHash(sha256Hex('kennzeichen-zwei'), NOW + 3 * HOUR), null, 'zweite Verwendung');
    assert.equal(await store.renewPending(HASH, 2, renewed), false, 'eine bestätigte Zeile wird nicht zurückgesetzt');
  });
});

test('Abmeldung: erst die Sperre, dann der Zustand; wiederholbar', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    await store.insertPending(PENDING);
    assert.equal(await store.unsubscribeByToken('X'.repeat(43), NOW), null);
    db.calls.length = 0;
    assert.deepEqual(await store.unsubscribeByToken(UNSUB, NOW + HOUR), { emailHash: HASH, alreadyUnsubscribed: false });
    assert.deepEqual(db.calls.map((call) => call.method + ' ' + call.table), ['GET subscriptions', 'POST suppressions', 'PATCH subscriptions']);
    assert.deepEqual(db.tables.suppressions, [{ email_hash: HASH, reason: 'unsubscribe', created_at: new Date(NOW + HOUR).toISOString() }]);
    assert.equal(db.calls[2].query.get('status'), 'neq.unsubscribed');
    assert.equal(await store.isSuppressed(HASH), true);
    assert.equal((await store.getSubscription(HASH)).status, 'unsubscribed');
    assert.deepEqual(await store.unsubscribeByToken(UNSUB, NOW + 2 * HOUR), { emailHash: HASH, alreadyUnsubscribed: true });
    assert.equal(db.tables.suppressions.length, 1);
    assert.equal(db.tables.suppressions[0].created_at, new Date(NOW + HOUR).toISOString(), 'erster Eintrag bleibt stehen');
  });
});

test('Abmeldung bricht nach der Sperre ab: die Adresse ist trotzdem gesperrt', async () => {
  const db = fakePostgrest();
  db.intercept = (call) => (call.method === 'PATCH' ? new Response('{"message":"kaputt"}', { status: 500 }) : undefined);
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    await store.insertPending(PENDING);
    await assert.rejects(store.unsubscribeByToken(UNSUB, NOW), (error) => error instanceof MailingConsentStoreError && error.code === 'mailing_store_failed');
    assert.equal(await store.isSuppressed(HASH), true);
  });
});

test('Sperrliste und Verlauf: nur Anfügen; Verfall löscht nur unbestätigte, abgelaufene Zeilen', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    assert.equal(await store.isSuppressed(HASH), false);
    await store.addSuppression(HASH, 'complaint', NOW);
    await store.addSuppression(HASH, 'manual', NOW + HOUR);
    assert.deepEqual(db.tables.suppressions.map((row) => row.reason), ['complaint'], 'der erste Grund bleibt');
    await store.appendEvent({ emailHash: HASH, type: 'requested', consentVersion: 'v'.repeat(80), source: 'preise/checkliste', occurredAt: NOW });
    assert.equal(db.tables.consent_events[0].consent_version.length, 64);
    assert.deepEqual(Object.keys(db.tables.consent_events[0]).sort(), ['consent_version', 'email_hash', 'occurred_at', 'source', 'type'], 'weder Adresse noch Kennzeichen im Verlauf');

    const other = sha256Hex('andere@person.invalid');
    await store.insertPending(PENDING);
    await store.insertPending({ ...PENDING, emailHash: other, email: 'andere@person.invalid', confirmTokenHash: sha256Hex('k3'), unsubscribeToken: 'V'.repeat(43), confirmExpiresAt: NOW + 100 * HOUR });
    db.calls.length = 0;
    await store.purgeExpiredPending(NOW + 49 * HOUR);
    assert.equal(db.calls[0].method, 'DELETE');
    assert.equal(db.calls[0].query.get('status'), 'eq.pending');
    assert.equal(db.calls[0].query.get('confirm_expires_at'), 'lt.' + new Date(NOW + 49 * HOUR).toISOString());
    assert.deepEqual(db.tables.subscriptions.map((row) => row.email_hash), [other]);
  });
});

test('Ungültige Eingaben erreichen die Datenbank nicht', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    const failed = (error) => error instanceof MailingConsentStoreError && error.code === 'mailing_store_failed';
    await assert.rejects(store.isSuppressed('kein-hash'), failed);
    await assert.rejects(store.getSubscription("x' or 1=1"), failed);
    await assert.rejects(store.insertPending({ ...PENDING, unsubscribeToken: 'kurz' }), failed);
    await assert.rejects(store.confirmByTokenHash('&status=eq.confirmed', NOW), failed);
    await assert.rejects(store.unsubscribeByToken('a&select=*', NOW), failed);
    await assert.rejects(store.purgeExpiredPending(Number.NaN), failed);
    assert.equal(db.calls.length, 0);
  });
});

test('Fehler der Datenbank: nur feste Codes, im Zweifel gesperrt', async () => {
  const db = fakePostgrest();
  await withEnv({ ...CONFIGURED, SUPABASE_TIMEOUT_MS: '100' }, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    const code = (expected) => (error) => error instanceof MailingConsentStoreError && error.code === expected && error.message === expected && error.cause === undefined;
    db.intercept = () => new Response('{"message":"geheimer Datenbanktext"}', { status: 500 });
    await assert.rejects(store.isSuppressed(HASH), code('mailing_store_failed'));
    db.intercept = () => Response.json({ kein: 'feld' });
    await assert.rejects(store.isSuppressed(HASH), code('mailing_store_failed'));
    db.intercept = () => Response.json([{ email_hash: sha256Hex('andere') }]);
    await assert.rejects(store.isSuppressed(HASH), code('mailing_store_failed'), 'fremde Zeile gilt nicht als "frei"');
    db.intercept = () => Response.json([{ email_hash: HASH, status: 'erfunden', lang: 'de' }]);
    await assert.rejects(store.getSubscription(HASH), code('mailing_store_failed'));
    // Der Zeitgeber von AbortSignal.timeout hält den Prozess nicht am Leben; der Fake tut es bis zum Abbruch selbst
    // (Muster aus composio-supabase-store.test.mjs).
    db.intercept = (call, init) => new Promise((resolve, reject) => {
      const alive = setTimeout(() => reject(new Error('Zeitlimit hat nicht gegriffen')), 5000);
      init.signal.addEventListener('abort', () => { clearTimeout(alive); reject(init.signal.reason); });
    });
    await assert.rejects(store.isSuppressed(HASH), code('mailing_store_timeout'));
  });
});

test('Handler mit Supabase-Speicher: Abmeldung über den echten Weg; Fehler ohne Adresse, Schlüssel oder Datenbanktext im Protokoll', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async (logs) => {
    await createSupabaseMailingConsentStore().insertPending(PENDING);
    const request = () => new Request(`https://seite.invalid/api/mailing/unsubscribe?t=${UNSUB}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' });
    const ok = await handleUnsubscribe(request());
    assert.equal(ok.status, 200);
    assert.equal(db.tables.subscriptions[0].status, 'unsubscribed');
    assert.deepEqual(db.tables.consent_events.map((row) => row.type), ['unsubscribed']);
    db.intercept = () => new Response(`{"message":"geheim ${DB_KEY} person@beispiel.invalid"}`, { status: 500 });
    const failed = await handleUnsubscribe(request());
    assert.equal(failed.status, 503);
    const text = logs.join('\n');
    assert.match(text, /"step":"unsubscribe","code":"mailing_store_failed"/);
    for (const secret of [DB_KEY, DB_URL, 'person@beispiel.invalid', HASH, UNSUB, 'geheim']) assert.ok(!text.includes(secret), secret);
  });
});

test('Schalter aus: die Anmeldung fasst die Datenbank nicht an, auch wenn Supabase konfiguriert ist', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const res = await handleSubscribe(new Request('https://seite.invalid/api/mailing/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), { env: {} });
    assert.equal(res.status, 503);
    assert.equal(db.calls.length, 0);
  });
});
