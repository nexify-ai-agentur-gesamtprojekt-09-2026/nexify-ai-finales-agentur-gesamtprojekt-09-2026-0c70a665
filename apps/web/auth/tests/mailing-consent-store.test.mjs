// Einwilligungs-Speicher auf Supabase (PostgREST): ohne Netz, gegen einen Fake-fetch. Nur Dummywerte, keine echten Geheimnisse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseMailingConsentStore, getMailingConsentStore, MailingConsentStoreError } from '../../mailing/consent-store.ts';
import { confirmationMailDigest, consentTextDigest, handleConfirm, handleSubscribe, handleUnsubscribe, sha256Hex } from '../../mailing/consent.ts';

const DB_URL = 'https://db-geheim.invalid';
const DB_KEY = 'service-role-geheim-0815';
const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const ENV_KEYS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TIMEOUT_MS'];
const CONFIGURED = { SUPABASE_URL: DB_URL + '/', SUPABASE_SERVICE_ROLE_KEY: DB_KEY };
const HASH = sha256Hex('person@beispiel.invalid');
const TOKEN_HASH = sha256Hex('kennzeichen-eins');
const UNSUB = 'U'.repeat(43);
const LIMITS = { perAddress: 3, windowHours: 168, perDay: 50 };
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
 * Kleiner PostgREST-Nachbau für das Schema "mailing": Filter eq/neq/gt/lt/cs (auch auf Feldern), limit, select, Einfügen
 * mit on_conflict und Prefer resolution=ignore-duplicates, PATCH und DELETE mit Filter. Bildet die Sperren der
 * Migration 0005 nach: Anlegen nur unbestätigt, Nachweis unveränderlich, Zustand nur vorwärts, keine Bestätigung einer
 * gesperrten Adresse oder nach der Frist, Löschen nur unbestätigter Zeilen, Sperrliste und Verlauf nur Anfügen,
 * Mailzählung mit Grenzen. Das echte Verhalten prüft apps/web/supabase/tests/mailing_consent_postgrest.mjs.
 */
function fakePostgrest() {
  const keys = { subscriptions: ['email_hash'], suppressions: ['email_hash'], consent_events: null, confirmation_mails: null };
  const tables = { subscriptions: [], suppressions: [], consent_events: [], confirmation_mails: [] };
  const db = { tables, calls: [], intercept: null, now: NOW };
  const PROOF = ['email_hash', 'email', 'lang', 'source', 'consent_version', 'consent_text_sha256', 'requested_at', 'confirm_expires_at', 'unsubscribe_token'];
  const stamp = (value) => (typeof value === 'string' ? value.replace(/Z$/, '+00:00') : value);
  const out = (row, select) => Object.fromEntries((select ? select.split(',') : Object.keys(row)).map((column) => [column, column.endsWith('_at') ? stamp(row[column] ?? null) : row[column] ?? null]));
  const list = (literal) => { assert.match(literal, /^\{[0-9a-f,]*\}$/, 'Feldliteral'); return literal.slice(1, -1).split(',').filter(Boolean); };
  const compare = (actual, operator, expected) => {
    if (Array.isArray(actual)) {
      if (operator === 'cs') return list(expected).every((entry) => actual.includes(entry));
      assert.equal(operator, 'eq', 'Felder nur mit eq oder cs');
      return JSON.stringify(actual) === JSON.stringify(list(expected));
    }
    if (operator === 'eq') return String(actual) === expected;
    if (operator === 'neq') return String(actual) !== expected;
    if (actual === null || actual === undefined) return false;
    return operator === 'gt' ? Date.parse(actual) > Date.parse(expected) : Date.parse(actual) < Date.parse(expected);
  };
  const refuse = (message) => new Response(JSON.stringify({ code: '23514', message }), { status: 400 });
  const guardSubscription = (row, patch) => {
    const next = { ...row, ...patch };
    if (PROOF.some((column) => next[column] !== row[column])) return 'subscription_proof_immutable';
    if (row.status === 'unsubscribed') return 'subscription_unsubscribe_final';
    if (next.status === 'pending' && row.status !== 'pending') return 'subscription_status_forward_only';
    if (row.status === 'pending' && next.status === 'confirmed') {
      if (!next.confirmed_at || Date.parse(next.confirmed_at) >= Date.parse(row.confirm_expires_at)) return 'subscription_confirm_outside_deadline';
      if (tables.suppressions.some((entry) => entry.email_hash === row.email_hash)) return 'subscription_confirm_suppressed';
    }
    if (next.status !== 'pending' && next.confirm_token_hashes.length > 0) return 'subscriptions_token_only_pending';
    if (next.status === 'pending' && (next.confirm_token_hashes.length < 1 || next.confirm_token_hashes.length > 8)) return 'subscriptions_pending_has_token';
    return null;
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
    for (const [, operator] of filters) assert.ok(['eq', 'neq', 'gt', 'lt', 'cs'].includes(operator), 'bekannter Filter');
    const matches = (row) => filters.every(([column, operator, value]) => compare(row[column], operator, value));
    if (call.method === 'GET') {
      let found = tables[table].filter(matches);
      const limit = target.searchParams.get('limit');
      if (limit) found = found.slice(0, Number(limit));
      return Response.json(found.map((row) => out(row, target.searchParams.get('select'))));
    }
    if (call.method === 'DELETE') {
      assert.ok(['subscriptions', 'confirmation_mails'].includes(table), 'gelöscht wird nur in subscriptions und confirmation_mails');
      assert.ok(filters.length > 0, 'DELETE nur mit Filter');
      if (table === 'confirmation_mails') {
        // Wie der Trigger: Was nach der Uhr der Datenbank noch zählt, bleibt ohne Fehler stehen.
        tables[table] = tables[table].filter((row) => !matches(row) || Date.parse(row.reserved_at) > db.now - Math.max(row.address_window_hours, 24) * HOUR);
        return new Response(null, { status: 204 });
      }
      if (tables[table].filter(matches).some((row) => row.status !== 'pending')) return refuse('subscription_delete_only_pending');
      tables[table] = tables[table].filter((row) => !matches(row));
      return new Response(null, { status: 204 });
    }
    if (call.method === 'PATCH') {
      assert.ok(['subscriptions', 'confirmation_mails'].includes(table), 'geändert wird nur in subscriptions und confirmation_mails');
      assert.ok(filters.length > 0, 'PATCH nur mit Filter');
      assert.match(call.headers.Prefer ?? '', /return=representation/);
      const hit = tables[table].filter(matches);
      for (const row of hit) {
        if (table === 'confirmation_mails') {
          if (row.state !== 'reserved' || !['sent', 'failed'].includes(call.body.state) || Object.keys(call.body).join() !== 'state') return refuse('confirmation_mail_settle_once');
        } else {
          const refused = guardSubscription(row, call.body);
          if (refused) return refuse(refused);
        }
      }
      for (const row of hit) Object.assign(row, call.body);
      return Response.json(hit.map((row) => out(row)));
    }
    if (call.method === 'POST') {
      const prefer = call.headers.Prefer ?? '';
      assert.match(prefer, /return=representation/);
      const conflict = (target.searchParams.get('on_conflict') ?? '').split(',').filter(Boolean);
      if (keys[table]) assert.deepEqual(conflict, keys[table], 'on_conflict nennt den eindeutigen Schlüssel');
      const row = { ...call.body };
      if (table === 'subscriptions' && (row.status !== 'pending' || row.confirmed_at || row.unsubscribed_at)) return refuse('subscription_insert_only_pending');
      if (table === 'confirmation_mails') {
        for (const [column, min, max] of [['address_limit', 1, 10], ['address_window_hours', 1, 8760], ['daily_limit', 1, 10000]]) {
          if (!Number.isInteger(row[column]) || row[column] < min || row[column] > max) return refuse('check ' + column);
        }
        if ('state' in row && row.state !== 'reserved') return refuse('confirmation_mail_insert_only_reserved');
        const at = Date.parse(row.reserved_at);
        const counted = tables[table].filter((entry) => entry.state !== 'failed');
        // Wie der Trigger: Über der Grenze entsteht keine Zeile, und das ist kein Fehler.
        if (counted.filter((entry) => entry.email_hash === row.email_hash && Date.parse(entry.reserved_at) > at - row.address_window_hours * HOUR).length >= row.address_limit) return Response.json([], { status: 201 });
        if (counted.filter((entry) => Date.parse(entry.reserved_at) > at - 24 * HOUR).length >= row.daily_limit) return Response.json([], { status: 201 });
        Object.assign(row, { id: tables[table].length + 1, state: 'reserved' });
      }
      if (keys[table] && tables[table].some((entry) => conflict.every((column) => entry[column] === row[column]))) {
        assert.match(prefer, /resolution=ignore-duplicates/, 'vorhandene Zeilen werden nie überschrieben');
        return Response.json([], { status: 201 });
      }
      tables[table].push(row);
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

test('Anlegen, weiteres Kennzeichen, bestätigen: der Nachweis wird nie umgeschrieben, jede Änderung trägt den erwarteten Ausgangszustand im Filter', async () => {
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
    assert.deepEqual(insert.body.confirm_token_hashes, [TOKEN_HASH]);
    const proof = {
      emailHash: HASH, email: 'person@beispiel.invalid', lang: 'de', status: 'pending', source: 'preise/checkliste', consentVersion: 'test.1',
      consentTextSha256: sha256Hex('wortlaut'), requestedAt: NOW, confirmExpiresAt: NOW + 48 * HOUR, confirmedAt: null, unsubscribedAt: null,
    };
    let record = await store.getSubscription(HASH);
    assert.deepEqual(record, proof);
    assert.ok(!JSON.stringify(record).includes(UNSUB) && !JSON.stringify(record).includes(TOKEN_HASH), 'Kennzeichen werden beim Lesen nie herausgegeben');
    const read = db.calls.filter((call) => call.method === 'GET').at(-1);
    assert.ok(!read.query.get('select').includes('token'), 'und gar nicht erst abgefragt');

    // Weiteres Kennzeichen: Der Filter trägt den gelesenen Stand der Liste; geschrieben wird nur die Liste.
    const second = sha256Hex('kennzeichen-zwei');
    assert.deepEqual(await store.addConfirmToken(HASH, second, NOW + HOUR), { unsubscribeToken: UNSUB }, 'einzige Stelle, an der das Abmeldekennzeichen herauskommt');
    const patch = db.calls.filter((call) => call.method === 'PATCH').at(-1);
    assert.equal(patch.query.get('status'), 'eq.pending');
    assert.equal(patch.query.get('confirm_token_hashes'), `eq.{${TOKEN_HASH}}`);
    assert.equal(patch.query.get('confirm_expires_at'), 'gt.' + new Date(NOW + HOUR).toISOString());
    assert.deepEqual(Object.keys(patch.body).sort(), ['confirm_token_hashes', 'updated_at']);
    assert.deepEqual(patch.body.confirm_token_hashes, [TOKEN_HASH, second]);
    assert.deepEqual(await store.getSubscription(HASH), proof, 'Nachweis unverändert');
    assert.equal(await store.addConfirmToken(HASH, sha256Hex('zu-spät'), NOW + 49 * HOUR), null, 'nach der Frist kein weiteres Kennzeichen');
    assert.equal(await store.addConfirmToken(sha256Hex('unbekannt'), second, NOW), null);

    assert.deepEqual(await store.findPendingByTokenHash(TOKEN_HASH, NOW + 2 * HOUR), { emailHash: HASH });
    assert.equal(await store.findPendingByTokenHash(sha256Hex('fremd'), NOW + 2 * HOUR), null);
    assert.equal(await store.findPendingByTokenHash(TOKEN_HASH, NOW + 50 * HOUR), null, 'Frist abgelaufen');
    assert.equal(await store.confirmByTokenHash(second, NOW + 50 * HOUR), null, 'Frist abgelaufen');
    // Das zurückgenommene Kennzeichen einer gescheiterten Mail wirkt nicht mehr, das erste weiterhin.
    await store.removeConfirmToken(HASH, second);
    assert.equal(await store.confirmByTokenHash(second, NOW + 2 * HOUR), null);
    record = await store.confirmByTokenHash(TOKEN_HASH, NOW + 2 * HOUR);
    assert.deepEqual(record, { ...proof, status: 'confirmed', confirmedAt: NOW + 2 * HOUR });
    const confirm = db.calls.filter((call) => call.method === 'PATCH').at(-1);
    assert.equal(confirm.query.get('status'), 'eq.pending');
    assert.equal(confirm.query.get('confirm_token_hashes'), `cs.{${TOKEN_HASH}}`);
    assert.equal(confirm.query.get('confirm_expires_at'), 'gt.' + new Date(NOW + 2 * HOUR).toISOString());
    assert.deepEqual(Object.keys(confirm.body).sort(), ['confirm_token_hashes', 'confirmed_at', 'status', 'updated_at'], 'die Bestätigung schreibt keinen Teil des Nachweises');
    assert.deepEqual(confirm.body.confirm_token_hashes, [], 'alle Kennzeichen verbraucht');
    assert.equal(await store.confirmByTokenHash(TOKEN_HASH, NOW + 3 * HOUR), null, 'zweite Verwendung');
    assert.equal(await store.addConfirmToken(HASH, sha256Hex('nach-bestätigung'), NOW + 3 * HOUR), null, 'eine bestätigte Zeile bekommt kein Kennzeichen mehr');
  });
});

test('Weiteres Kennzeichen bei gleichzeitigen Aufrufen: keiner überschreibt den anderen; höchstens acht je Anmeldung', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    await store.insertPending(PENDING);
    const hashes = Array.from({ length: 3 }, (_, i) => sha256Hex('gleichzeitig-' + i));
    // Alle lesen denselben Stand; nur einer trifft mit seinem Filter, die anderen lesen neu und versuchen es erneut.
    const results = await Promise.all(hashes.map((hash) => store.addConfirmToken(HASH, hash, NOW)));
    assert.ok(results.every((result) => result && result.unsubscribeToken === UNSUB));
    assert.deepEqual([...db.tables.subscriptions[0].confirm_token_hashes].sort(), [TOKEN_HASH, ...hashes].sort());
    for (let i = 0; i < 4; i++) assert.ok(await store.addConfirmToken(HASH, sha256Hex('weiter-' + i), NOW));
    assert.equal(db.tables.subscriptions[0].confirm_token_hashes.length, 8);
    assert.equal(await store.addConfirmToken(HASH, sha256Hex('neuntes'), NOW), null);
    // Das letzte Kennzeichen einer offenen Anmeldung bleibt stehen.
    db.tables.subscriptions[0].confirm_token_hashes = [TOKEN_HASH];
    await store.removeConfirmToken(HASH, TOKEN_HASH);
    assert.deepEqual(db.tables.subscriptions[0].confirm_token_hashes, [TOKEN_HASH]);
  });
});

test('Bestätigung einer gesperrten Adresse: die Datenbank verweigert, der Speicher meldet einen Fehler statt Erfolg', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    await store.insertPending(PENDING);
    await store.addSuppression(HASH, 'complaint', NOW);
    await assert.rejects(store.confirmByTokenHash(TOKEN_HASH, NOW + HOUR), (error) => error instanceof MailingConsentStoreError && error.code === 'mailing_store_failed');
    assert.equal(db.tables.subscriptions[0].status, 'pending');
  });
});

test('Mailzählung: Grenze je Adresse und je Tag, Fehlschlag gibt den Platz frei, Aufräumen lässt Zählendes stehen', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    const first = await store.reserveConfirmationMail(HASH, NOW, LIMITS);
    assert.deepEqual(first, { id: 1 });
    const insert = db.calls.at(-1);
    assert.equal(insert.table, 'confirmation_mails');
    assert.deepEqual(insert.body, { email_hash: HASH, reserved_at: new Date(NOW).toISOString(), address_limit: 3, address_window_hours: 168, daily_limit: 50 });
    assert.ok(!JSON.stringify(insert.body).includes('@'), 'keine Adresse in der Zählung');
    const second = await store.reserveConfirmationMail(HASH, NOW + HOUR, LIMITS);
    const third = await store.reserveConfirmationMail(HASH, NOW + 2 * HOUR, LIMITS);
    assert.equal(await store.reserveConfirmationMail(HASH, NOW + 3 * HOUR, LIMITS), null, 'vierte Mail im Fenster');
    assert.equal(await store.reserveConfirmationMail(HASH, NOW + 167 * HOUR, LIMITS), null, 'noch im Fenster der ersten');
    await store.settleConfirmationMail(first, 'sent');
    await store.settleConfirmationMail(second, 'failed');
    const settle = db.calls.at(-1);
    assert.equal(settle.query.get('state'), 'eq.reserved');
    assert.deepEqual(settle.body, { state: 'failed' });
    await assert.rejects(store.settleConfirmationMail(second, 'sent'), MailingConsentStoreError, 'ein Eintrag wird genau einmal abgeschlossen');
    assert.ok(await store.reserveConfirmationMail(HASH, NOW + 3 * HOUR, LIMITS), 'der Fehlschlag hat seinen Platz freigegeben');
    assert.equal(await store.reserveConfirmationMail(HASH, NOW + 4 * HOUR, LIMITS), null);
    assert.ok(third);

    // Tagesgrenze über alle Adressen.
    const day = { perAddress: 3, windowHours: 168, perDay: 5 };
    assert.equal(await store.dailyLimitReached(NOW + 4 * HOUR, 5), false);
    assert.ok(await store.reserveConfirmationMail(sha256Hex('a'), NOW + 4 * HOUR, day));
    assert.ok(await store.reserveConfirmationMail(sha256Hex('b'), NOW + 4 * HOUR, day));
    assert.equal(await store.reserveConfirmationMail(sha256Hex('c'), NOW + 4 * HOUR, day), null, 'fünf zählende Einträge in 24 Stunden');
    assert.equal(await store.dailyLimitReached(NOW + 4 * HOUR, 5), true);
    assert.ok(await store.reserveConfirmationMail(sha256Hex('c'), NOW + 29 * HOUR, day), 'einen Tag später wieder frei');

    // Gleichzeitig: nie mehr als die Grenze.
    const many = await Promise.all(Array.from({ length: 9 }, () => store.reserveConfirmationMail(sha256Hex('zugleich'), NOW + 60 * HOUR, LIMITS)));
    assert.equal(many.filter(Boolean).length, 3);

    // Aufräumen: Der Dienst fragt nach seiner Uhr, die Datenbank lässt stehen, was nach ihrer noch zählt.
    db.now = NOW + 60 * HOUR;
    const before = db.tables.confirmation_mails.length;
    await store.purgeSettledMails(NOW + 400 * HOUR, 168);
    assert.equal(db.calls.at(-1).query.get('reserved_at'), 'lt.' + new Date(NOW + 232 * HOUR).toISOString());
    assert.equal(db.tables.confirmation_mails.length, before, 'vorgehende Uhr des Dienstes löscht nichts, was noch zählt');
    db.now = NOW + 400 * HOUR;
    await store.purgeSettledMails(NOW + 400 * HOUR, 168);
    assert.equal(db.tables.confirmation_mails.length, 0);
  });
});

test('Mailzählung: ungültige Grenzen (0, NaN, Bruch, zu groß) erreichen die Datenbank nicht', async () => {
  const db = fakePostgrest();
  await withEnv(CONFIGURED, db.fetch, async () => {
    const store = createSupabaseMailingConsentStore();
    const failed = (error) => error instanceof MailingConsentStoreError && error.code === 'mailing_store_failed';
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '3', null, undefined]) {
      await assert.rejects(store.reserveConfirmationMail(HASH, NOW, { ...LIMITS, perAddress: bad }), failed, `perAddress=${String(bad)}`);
      await assert.rejects(store.reserveConfirmationMail(HASH, NOW, { ...LIMITS, windowHours: bad }), failed, `windowHours=${String(bad)}`);
      await assert.rejects(store.reserveConfirmationMail(HASH, NOW, { ...LIMITS, perDay: bad }), failed, `perDay=${String(bad)}`);
    }
    await assert.rejects(store.reserveConfirmationMail(HASH, NOW, { ...LIMITS, perAddress: 11 }), failed);
    await assert.rejects(store.dailyLimitReached(NOW, Number.NaN), failed);
    await assert.rejects(store.purgeSettledMails(NOW, 0), failed);
    await assert.rejects(store.settleConfirmationMail({ id: Number.NaN }, 'sent'), failed);
    await assert.rejects(store.settleConfirmationMail({ id: 1 }, 'reserved'), failed);
    assert.equal(db.calls.length, 0);
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
    assert.deepEqual(db.calls[2].body.confirm_token_hashes, [], 'kein Bestätigungskennzeichen bleibt gültig');
    assert.equal(await store.isSuppressed(HASH), true);
    assert.equal((await store.getSubscription(HASH)).status, 'unsubscribed');
    assert.equal(await store.confirmByTokenHash(TOKEN_HASH, NOW + 2 * HOUR), null, 'nach der Abmeldung bestätigt kein Link mehr');
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
    await assert.rejects(store.findPendingByTokenHash('{a},b', NOW), failed);
    await assert.rejects(store.addConfirmToken(HASH, 'a}&status=eq.confirmed', NOW), failed);
    await assert.rejects(store.removeConfirmToken('kein-hash', TOKEN_HASH), failed);
    await assert.rejects(store.reserveConfirmationMail('kein-hash', NOW, LIMITS), failed);
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

test('Handler mit Supabase-Speicher: Anmeldung, Sperrlink aus der Mail, Bestätigung, Grenze je Adresse über den echten Weg', async () => {
  const db = fakePostgrest();
  const text = 'PRÜFTEXT, nur für diesen Test.';
  const mail = { betreff: 'PRÜFBETREFF', text: '{{BESTAETIGUNGSLINK}}\n\n{{SPERRLINK}}' };
  const freigabe = { durch: 'Prüfperson', am: '2026-01-01', beleg: 'Prüfbeleg' };
  const config = {
    einwilligung: { fassung: 'test.1', freigabe: { ...freigabe, sha256: { de: consentTextDigest(text) } }, texte: { de: text, nl: null, fr: null, en: null } },
    bestaetigungsmail: { freigabe: { ...freigabe, sha256: { de: confirmationMailDigest(mail) } }, texte: { de: mail, nl: null, fr: null, en: null } },
    bestaetigungsfrist_stunden: 48,
    seiten: { bestaetigung: '/b', abmeldung: '/a' },
    quellen: ['preise/checkliste'],
    grenzen: { bestaetigungsmails_je_adresse: 2, bestaetigungsmails_fenster_stunden: 168, bestaetigungsmails_je_tag: 50, anfragen_je_minute: 100, anfragen_je_stunde: 1000, bestaetigungen_je_minute: 100, bestaetigungen_je_stunde: 1000, max_body_bytes: 4096 },
  };
  await withEnv(CONFIGURED, db.fetch, async () => {
    const outbox = [];
    const state = { now: NOW };
    const deps = { env: { NEXIFY_MAILING_CONSENT: 'on', MAILING_PUBLIC_BASE_URL: 'https://seite.invalid' }, config, mailConfigured: () => true, sendMail: async (entry) => { outbox.push(entry); return { ok: true }; }, nowMs: () => state.now };
    const post = (path, body) => new Request('https://seite.invalid' + path, { method: 'POST', headers: { 'content-type': 'application/json', host: 'seite.invalid' }, body: JSON.stringify(body) });
    const subscribe = (email) => handleSubscribe(post('/api/mailing/subscribe', { email, lang: 'de', consent: true, consent_version: 'test.1', source: 'preise/checkliste' }), deps);
    for (let i = 0; i < 4; i++) assert.equal((await subscribe('person@beispiel.invalid')).status, 202);
    assert.equal(outbox.length, 2, 'Grenze je Adresse');
    assert.deepEqual(db.tables.confirmation_mails.map((row) => row.state), ['sent', 'sent']);
    assert.equal(db.tables.subscriptions.length, 1);
    assert.equal(db.tables.subscriptions[0].confirm_token_hashes.length, 2);
    const confirmToken = outbox[0].text.match(/\/b#t=([A-Za-z0-9_-]{43})/)[1];
    const blockToken = outbox[1].text.match(/\/a#t=([A-Za-z0-9_-]{43})/)[1];
    assert.equal(blockToken, db.tables.subscriptions[0].unsubscribe_token, 'der Sperrlink der zweiten Mail trägt das gespeicherte Abmeldekennzeichen');
    // Eine zweite Adresse wird über ihren Sperrlink gesperrt, ohne je zu bestätigen.
    assert.equal((await subscribe('zweite@person.invalid')).status, 202);
    const otherBlock = outbox[2].text.match(/\/a#t=([A-Za-z0-9_-]{43})/)[1];
    assert.equal((await handleUnsubscribe(new Request(`https://seite.invalid/api/mailing/unsubscribe?t=${otherBlock}`, { method: 'POST' }), deps)).status, 200);
    assert.equal((await handleConfirm(post('/api/mailing/confirm', { token: outbox[2].text.match(/\/b#t=([A-Za-z0-9_-]{43})/)[1] }), deps)).status, 404);
    assert.equal((await subscribe('zweite@person.invalid')).status, 202);
    assert.equal(outbox.length, 3, 'keine Mail mehr an die gesperrte Adresse');
    // Die erste Adresse bestätigt mit ihrem ersten Link.
    state.now = NOW + HOUR;
    assert.equal((await handleConfirm(post('/api/mailing/confirm', { token: confirmToken }), deps)).status, 200);
    assert.deepEqual([db.tables.subscriptions[0].status, db.tables.subscriptions[0].confirm_token_hashes], ['confirmed', []]);
    assert.deepEqual(db.tables.consent_events.map((row) => row.type), ['requested', 'confirmation_resent', 'requested', 'unsubscribed', 'confirmed']);
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
