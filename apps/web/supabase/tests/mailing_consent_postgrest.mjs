// Einwilligungsweg gegen ein ECHTES PostgREST und ein lokales Wegwerf-PostgreSQL: Speicher und Handler so, wie sie
// in Betrieb laufen (lib/supabase-rest.ts -> PostgREST -> Migration 0005), samt gleichzeitiger Aufrufe.
//
// Läuft nicht in `pnpm test:auth` (braucht zwei Programme, die das Repository nicht mitbringt), sondern bewusst von Hand:
//
//   PGHOST=127.0.0.1 PGPORT=<port> PGUSER=postgres POSTGREST_BIN=/pfad/zu/postgrest \
//     node --test apps/web/supabase/tests/mailing_consent_postgrest.mjs
//
// Voraussetzungen, alle lokal und ohne Geheimnis:
//   - PostgreSQL 16 auf einer Loopback-Adresse, Anmeldung ohne Passwort (Wegwerf-Cluster, `initdb -A trust`).
//   - Rollen wie bei Supabase:  create role anon nologin; create role authenticated nologin;
//       create role service_role nologin bypassrls; create role authenticator login noinherit;
//       grant anon, authenticated, service_role to authenticator;
//   - Datenbank:  createdb -E UTF8 -T template0 nexify_mailing_fixture
//   - PostgREST als Programmdatei (geprüft mit Release 12.2.3); `psql` im Pfad.
// Zur Laufzeit kein Netz außer Loopback, kein echter Mailversand, keine Zugangsdaten: Das JWT-Geheimnis wird je Lauf
// zufällig erzeugt und gilt nur für das hier gestartete PostgREST.
//
// Das Skript weigert sich außerhalb von `nexify_mailing_fixture` und außerhalb von Loopback. Es legt das Schema
// "mailing" neu an (ein vorhandenes in dieser Wegwerf-Datenbank wird ersetzt) und entfernt es am Ende wieder.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomBytes } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const DATABASE = 'nexify_mailing_fixture';
const MIGRATION = fileURLToPath(new URL('../migrations/0005_mailing_consent.sql', import.meta.url));
const PGHOST = process.env.PGHOST ?? '';
const PGPORT = process.env.PGPORT ?? '5432';
const PGUSER = process.env.PGUSER ?? 'postgres';
const POSTGREST_BIN = process.env.POSTGREST_BIN ?? '';
const HOUR = 3_600_000;
const BASE = 'https://seite.invalid';

if (!POSTGREST_BIN || !['127.0.0.1', 'localhost', '::1'].includes(PGHOST)) {
  console.error('mailing_consent_postgrest: POSTGREST_BIN und PGHOST (nur 127.0.0.1, localhost oder ::1) müssen gesetzt sein. Siehe Kopf der Datei.');
  process.exit(2);
}

const state = { postgrest: null, proxy: null, version: '', postgrestUrl: '', store: null, mod: null, consent: null };

function psql(args, input) {
  const result = spawnSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', DATABASE, ...args], { input, encoding: 'utf8' });
  if (result.status !== 0) throw new Error('psql fehlgeschlagen: ' + (result.stderr || '').split('\n')[0]);
  return result.stdout.trim();
}
const sql = (statement) => psql(['-c', statement]);
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(secret, role) {
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ role })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
const sha = async (value) => (await import('../../mailing/consent.ts')).sha256Hex(value);
const token = () => randomBytes(32).toString('base64url');

before(async () => {
  assert.equal(sql('select current_database()'), DATABASE, 'nur gegen die Wegwerf-Datenbank');
  assert.equal(sql("select current_setting('server_encoding')"), 'UTF8');
  assert.equal(sql("select count(*) from pg_roles where rolname in ('anon','authenticated','service_role','authenticator')"), '4', 'Rollen des Wegwerf-Clusters fehlen');
  sql('drop schema if exists mailing cascade');
  psql(['-f', MIGRATION]);
  psql(['-f', MIGRATION]); // zweites Anwenden darf nicht scheitern

  state.version = spawnSync(POSTGREST_BIN, ['--version'], { encoding: 'utf8' }).stdout.trim();
  const secret = randomBytes(48).toString('hex');
  const port = await freePort();
  state.postgrest = spawn(POSTGREST_BIN, [], {
    env: {
      PATH: process.env.PATH,
      PGRST_DB_URI: `postgres://authenticator@${PGHOST}:${PGPORT}/${DATABASE}`,
      PGRST_DB_SCHEMAS: 'mailing',
      PGRST_DB_ANON_ROLE: 'anon',
      PGRST_JWT_SECRET: secret,
      PGRST_SERVER_HOST: '127.0.0.1',
      PGRST_SERVER_PORT: String(port),
    },
    stdio: 'ignore',
  });
  state.postgrestUrl = `http://127.0.0.1:${port}`;
  const serviceKey = jwt(secret, 'service_role');
  state.keys = { service: serviceKey, anon: jwt(secret, 'anon'), authenticated: jwt(secret, 'authenticated') };
  // Bereit ist PostgREST, sobald es mit geladenem Schema-Cache antwortet.
  for (let attempt = 0; ; attempt++) {
    try {
      const probe = await fetch(`${state.postgrestUrl}/subscriptions?limit=1`, { headers: { Authorization: `Bearer ${serviceKey}`, 'Accept-Profile': 'mailing' } });
      if (probe.ok) break;
    } catch {}
    if (attempt > 100) throw new Error('PostgREST wurde nicht bereit');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // Supabase liefert PostgREST unter /rest/v1/ aus (Kong); lib/supabase-rest.ts ruft genau diesen Pfad.
  state.proxy = createServer((incoming, outgoing) => {
    if (!incoming.url.startsWith('/rest/v1/')) {
      outgoing.writeHead(404).end();
      return;
    }
    const upstream = httpRequest(`${state.postgrestUrl}${incoming.url.slice('/rest/v1'.length)}`, { method: incoming.method, headers: { ...incoming.headers, host: `127.0.0.1:${port}` } }, (response) => {
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', () => outgoing.writeHead(502).end());
    incoming.pipe(upstream);
  });
  await new Promise((resolve) => state.proxy.listen(0, '127.0.0.1', resolve));
  process.env.SUPABASE_URL = `http://127.0.0.1:${state.proxy.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;
  state.mod = await import('../../mailing/consent-store.ts');
  state.consent = await import('../../mailing/consent.ts');
  state.store = state.mod.createSupabaseMailingConsentStore();
  console.log(`# ${state.version} · ${sql('select version()').split(',')[0]}`);
});

after(async () => {
  state.postgrest?.kill();
  await new Promise((resolve) => (state.proxy ? state.proxy.close(resolve) : resolve()));
  sql('drop schema if exists mailing cascade');
});

const LIMITS = { perAddress: 3, windowHours: 168, perDay: 10_000 };
async function pendingInput(address, overrides = {}) {
  const now = Date.now();
  return {
    emailHash: await sha(address), email: address, lang: 'de', source: 'preise/checkliste', consentVersion: 'test.1', consentTextSha256: await sha('wortlaut'),
    requestedAt: now, confirmTokenHash: await sha(token()), confirmExpiresAt: now + 48 * HOUR, unsubscribeToken: token(), ...overrides,
  };
}

test('N5: PostgREST liefert das Schema für service_role aus, obwohl anon und authenticated kein USAGE haben', async () => {
  assert.match(state.version, /^PostgREST \d+\.\d+/);
  assert.equal(sql("select has_schema_privilege('anon','mailing','usage') or has_schema_privilege('authenticated','mailing','usage')"), 'f');
  const call = (key, table) => fetch(`${state.postgrestUrl}/${table}?limit=1`, { headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), 'Accept-Profile': 'mailing' } });
  for (const table of ['subscriptions', 'suppressions', 'consent_events', 'confirmation_mails']) {
    assert.equal((await call(state.keys.service, table)).status, 200, table);
    for (const [name, key] of [['ohne Schlüssel', null], ['anon', state.keys.anon], ['authenticated', state.keys.authenticated]]) {
      const response = await call(key, table);
      assert.ok([401, 403].includes(response.status), `${name} auf ${table}: ${response.status}`);
      assert.equal((await response.json()).code, '42501', 'permission denied');
    }
  }
  const write = await fetch(`${state.postgrestUrl}/suppressions`, { method: 'POST', headers: { Authorization: `Bearer ${state.keys.anon}`, 'Content-Profile': 'mailing', 'Content-Type': 'application/json' }, body: JSON.stringify({ email_hash: 'a'.repeat(64), reason: 'manual' }) });
  assert.ok([401, 403].includes(write.status));
});

test('Speicher: anlegen, lesen, weiteres Kennzeichen, bestätigen; der Nachweis bleibt Zeichen für Zeichen stehen', async () => {
  const { store } = state;
  const input = await pendingInput('person@beispiel.invalid');
  assert.equal(await store.insertPending(input), true);
  assert.equal(await store.insertPending({ ...(await pendingInput('person@beispiel.invalid')), lang: 'fr' }), false, 'vorhandene Zeile wird nicht überschrieben');
  const proof = await store.getSubscription(input.emailHash);
  assert.deepEqual(proof, { emailHash: input.emailHash, email: input.email, lang: 'de', status: 'pending', source: input.source, consentVersion: 'test.1', consentTextSha256: input.consentTextSha256, requestedAt: input.requestedAt, confirmExpiresAt: input.confirmExpiresAt, confirmedAt: null, unsubscribedAt: null });
  const second = await sha(token());
  assert.deepEqual(await store.addConfirmToken(input.emailHash, second, Date.now()), { unsubscribeToken: input.unsubscribeToken });
  assert.equal(sql(`select cardinality(confirm_token_hashes) from mailing.subscriptions where email_hash = '${input.emailHash}'`), '2');
  assert.deepEqual(await store.getSubscription(input.emailHash), proof);
  assert.deepEqual(await store.findPendingByTokenHash(second, Date.now()), { emailHash: input.emailHash });
  assert.equal(await store.findPendingByTokenHash(await sha('fremd'), Date.now()), null);
  await store.removeConfirmToken(input.emailHash, second);
  assert.equal(await store.confirmByTokenHash(second, Date.now()), null, 'zurückgenommenes Kennzeichen');
  assert.equal(await store.confirmByTokenHash(input.confirmTokenHash, input.confirmExpiresAt + 1), null, 'nach der Frist');
  const confirmedAt = Date.now();
  assert.deepEqual(await store.confirmByTokenHash(input.confirmTokenHash, confirmedAt), { ...proof, status: 'confirmed', confirmedAt });
  assert.equal(await store.confirmByTokenHash(input.confirmTokenHash, Date.now()), null, 'zweite Verwendung');
  assert.equal(await store.addConfirmToken(input.emailHash, await sha(token()), Date.now()), null);
});

test('Speicher: eine Adresse, deren Prüfsumme nicht passt, oder ein Steuerzeichen lehnt die Datenbank ab', async () => {
  const { store, mod } = state;
  const failed = (error) => error instanceof mod.MailingConsentStoreError && error.code === 'mailing_store_failed';
  await assert.rejects(store.insertPending({ ...(await pendingInput('eine@adresse.invalid')), email: 'andere@adresse.invalid' }), failed);
  const control = 'steuer\u0007zeichen@adresse.invalid';
  await assert.rejects(store.insertPending(await pendingInput(control)), failed);
  assert.equal(sql("select count(*) from mailing.subscriptions where email like '%adresse.invalid'"), '0');
});

test('M1: eine gesperrte Adresse wird nicht bestätigt; die Abmeldung über das Kennzeichen sperrt und ist endgültig', async () => {
  const { store, mod } = state;
  const blocked = await pendingInput('gesperrt@beispiel.invalid');
  await store.insertPending(blocked);
  await store.addSuppression(blocked.emailHash, 'complaint', Date.now());
  await store.addSuppression(blocked.emailHash, 'manual', Date.now());
  assert.equal(sql(`select reason from mailing.suppressions where email_hash = '${blocked.emailHash}'`), 'complaint');
  assert.equal(await store.isSuppressed(blocked.emailHash), true);
  await assert.rejects(store.confirmByTokenHash(blocked.confirmTokenHash, Date.now()), (error) => error instanceof mod.MailingConsentStoreError);
  assert.equal((await store.getSubscription(blocked.emailHash)).status, 'pending');

  const leaving = await pendingInput('abmeldung@beispiel.invalid');
  await store.insertPending(leaving);
  assert.equal(await store.unsubscribeByToken(token(), Date.now()), null);
  assert.deepEqual(await store.unsubscribeByToken(leaving.unsubscribeToken, Date.now()), { emailHash: leaving.emailHash, alreadyUnsubscribed: false });
  assert.deepEqual(await store.unsubscribeByToken(leaving.unsubscribeToken, Date.now()), { emailHash: leaving.emailHash, alreadyUnsubscribed: true });
  assert.equal(await store.isSuppressed(leaving.emailHash), true);
  assert.equal(await store.confirmByTokenHash(leaving.confirmTokenHash, Date.now()), null);
  assert.equal((await store.getSubscription(leaving.emailHash)).status, 'unsubscribed');
});

test('H2 gleichzeitig: von 24 Einträgen zur selben Adresse entstehen genau 3, von 30 Adressen genau die Tagesgrenze', async () => {
  const { store } = state;
  // Eigene Zeitinsel weit in der Vergangenheit, damit die Tagesgrenze der anderen Tests nicht mitzählt.
  const then = Date.now() - 2000 * HOUR;
  const hash = await sha('zugleich@beispiel.invalid');
  const same = await Promise.all(Array.from({ length: 24 }, () => store.reserveConfirmationMail(hash, then, LIMITS)));
  assert.equal(same.filter(Boolean).length, 3);
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where email_hash = '${hash}'`), '3');
  // M3: Ein Fehlschlag gibt seinen Platz frei, ein abgeschlossener Eintrag bleibt abgeschlossen.
  const [first, second] = same.filter(Boolean);
  await store.settleConfirmationMail(first, 'failed');
  await store.settleConfirmationMail(second, 'sent');
  await assert.rejects(store.settleConfirmationMail(second, 'failed'));
  const again = await Promise.all(Array.from({ length: 8 }, () => store.reserveConfirmationMail(hash, then + HOUR, LIMITS)));
  assert.equal(again.filter(Boolean).length, 1, 'genau der freigegebene Platz');
  assert.equal(await store.reserveConfirmationMail(hash, then + 167 * HOUR, LIMITS), null);
  assert.ok(await store.reserveConfirmationMail(hash, then + 168 * HOUR + 1, LIMITS), 'nach dem Fenster');

  // Die Tagesgrenze zählt alles, was jünger ist als 24 Stunden vor dem neuen Eintrag, auch spätere Einträge. Diese
  // Zeitinsel liegt deshalb NACH der obigen und vor allen Einträgen der anderen Tests.
  const day = Date.now() - 1000 * HOUR;
  const daily = { perAddress: 3, windowHours: 168, perDay: 7 };
  const hashes = await Promise.all(Array.from({ length: 30 }, (_, i) => sha(`tag${i}@beispiel.invalid`)));
  const many = await Promise.all(hashes.map((entry) => store.reserveConfirmationMail(entry, day, daily)));
  assert.equal(many.filter(Boolean).length, 7);
  assert.equal(await store.dailyLimitReached(day, 7), true);
  assert.equal(await store.dailyLimitReached(day + 25 * HOUR, 7), false);
});

test('Gleichzeitig: weitere Kennzeichen überschreiben einander nicht; von fünf Bestätigungen gewinnt genau eine', async () => {
  const { store } = state;
  const input = await pendingInput('wettlauf@beispiel.invalid');
  await store.insertPending(input);
  const hashes = await Promise.all(Array.from({ length: 3 }, () => sha(token())));
  const added = await Promise.all(hashes.map((hash) => store.addConfirmToken(input.emailHash, hash, Date.now())));
  const stored = sql(`select array_to_string(confirm_token_hashes, ',') from mailing.subscriptions where email_hash = '${input.emailHash}'`).split(',');
  // Wer kein Kennzeichen anfügen konnte (drei Leseversuche verloren), bekommt `null` und sendet nicht; nie geht eines verloren, das gemeldet wurde.
  for (const [index, result] of added.entries()) assert.equal(stored.includes(hashes[index]), result !== null);
  assert.ok(added.filter(Boolean).length >= 1 && stored.includes(input.confirmTokenHash));
  const now = Date.now();
  const confirms = await Promise.all(Array.from({ length: 5 }, () => store.confirmByTokenHash(input.confirmTokenHash, now)));
  assert.equal(confirms.filter(Boolean).length, 1);
  assert.equal(sql(`select status || ':' || cardinality(confirm_token_hashes) from mailing.subscriptions where email_hash = '${input.emailHash}'`), 'confirmed:0');
});

test('Aufräumen: verfallene unbestätigte Zeilen gehen, alles andere und jeder noch zählende Eintrag bleibt', async () => {
  const { store } = state;
  const now = Date.now();
  const expired = await pendingInput('verfallen@beispiel.invalid', { requestedAt: now - 50 * HOUR, confirmExpiresAt: now - 2 * HOUR });
  await store.insertPending(expired);
  const before = sql("select count(*) from mailing.subscriptions where status <> 'pending'");
  await store.purgeExpiredPending(now);
  assert.equal(await store.getSubscription(expired.emailHash), null);
  assert.equal(sql("select count(*) from mailing.subscriptions where status <> 'pending'"), before);
  const fresh = await store.reserveConfirmationMail(await sha('frisch@beispiel.invalid'), now, LIMITS);
  const old = sql('select count(*) from mailing.confirmation_mails where reserved_at < now() - interval \'168 hours\'');
  assert.ok(Number(old) > 0);
  // Der Dienst fragt mit einer weit vorgehenden Uhr: Die Datenbank löscht trotzdem nur, was nach ihrer Uhr nicht mehr zählt.
  await store.purgeSettledMails(now + 5000 * HOUR, 168);
  assert.equal(sql('select count(*) from mailing.confirmation_mails where reserved_at < now() - interval \'168 hours\''), '0');
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where id = ${fresh.id}`), '1');
});

test('Handler über den echten Weg: Anmeldung, Grenze, Sperrlink aus der Mail, Bestätigung, gleichzeitige Anmeldungen', async () => {
  const { consent, store } = state;
  const text = 'PRÜFTEXT, nur für diesen Test.';
  const mail = { betreff: 'PRÜFBETREFF', text: '{{BESTAETIGUNGSLINK}}\n\n{{SPERRLINK}}\n\n{{EINWILLIGUNGSTEXT}}' };
  const freigabe = { durch: 'Prüfperson', am: '2026-01-01', beleg: 'Prüfbeleg' };
  const config = {
    einwilligung: { fassung: 'test.1', freigabe: { ...freigabe, sha256: { de: consent.consentTextDigest(text) } }, texte: { de: text, nl: null, fr: null, en: null } },
    bestaetigungsmail: { freigabe: { ...freigabe, sha256: { de: consent.confirmationMailDigest(mail) } }, texte: { de: mail, nl: null, fr: null, en: null } },
    bestaetigungsfrist_stunden: 48,
    seiten: { bestaetigung: '/b', abmeldung: '/a' },
    quellen: ['preise/checkliste'],
    grenzen: { bestaetigungsmails_je_adresse: 3, bestaetigungsmails_fenster_stunden: 168, bestaetigungsmails_je_tag: 10_000, anfragen_je_minute: 1000, anfragen_je_stunde: 100_000, bestaetigungen_je_minute: 1000, bestaetigungen_je_stunde: 100_000, max_body_bytes: 4096 },
  };
  assert.deepEqual(consent.consentReadiness(config, { MAILING_PUBLIC_BASE_URL: BASE }), []);
  const outbox = [];
  const deps = { env: { NEXIFY_MAILING_CONSENT: 'on', MAILING_PUBLIC_BASE_URL: BASE }, config, mailConfigured: () => true, sendMail: async (entry) => { await new Promise((resolve) => setTimeout(resolve, 3)); outbox.push(entry); return { ok: true }; } };
  const post = (path, body) => new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', host: 'seite.invalid' }, body: JSON.stringify(body) });
  const subscribe = (email) => consent.handleSubscribe(post('/api/mailing/subscribe', { email, lang: 'de', consent: true, consent_version: 'test.1', source: 'preise/checkliste' }), deps);
  const to = (address) => outbox.filter((entry) => entry.to === address);
  const part = (entry, page) => entry.text.match(new RegExp(`${page}#t=([A-Za-z0-9_-]{43})`))[1];

  // Gleichzeitig zur selben Adresse: nie mehr als die Grenze, genau eine Zeile.
  const first = 'handler@beispiel.invalid';
  const responses = await Promise.all(Array.from({ length: 12 }, () => subscribe(first)));
  assert.ok(responses.every((response) => response.status === 202));
  assert.ok(to(first).length >= 1 && to(first).length <= 3, `${to(first).length} Mails`);
  for (let i = 0; i < 4; i++) assert.equal((await subscribe(first)).status, 202);
  assert.equal(to(first).length, 3, 'genau die Grenze je Adresse');
  const hash = consent.emailHash(first);
  assert.equal(sql(`select count(*) from mailing.subscriptions where email_hash = '${hash}'`), '1');
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where email_hash = '${hash}' and state = 'sent'`), '3');
  assert.equal(new Set(to(first).map((entry) => part(entry, '/a'))).size, 1, 'ein Sperrlink');
  assert.equal(part(to(first)[0], '/a'), sql(`select unsubscribe_token from mailing.subscriptions where email_hash = '${hash}'`));
  // Bestätigung mit dem zuerst zugestellten Link.
  const confirmed = await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(first)[0], '/b') }), deps);
  assert.equal(confirmed.status, 200);
  assert.equal((await store.getSubscription(hash)).status, 'confirmed');
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(first)[1], '/b') }), deps)).status, 404);

  // H1: Ein Empfänger sperrt seine Adresse über den Sperrlink, ohne je zu bestätigen.
  const second = 'fremd-eingetragen@beispiel.invalid';
  assert.equal((await subscribe(second)).status, 202);
  const block = part(to(second)[0], '/a');
  assert.equal((await consent.handleUnsubscribe(new Request(`${BASE}/api/mailing/unsubscribe?t=${block}`, { method: 'POST' }), deps)).status, 200);
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(second)[0], '/b') }), deps)).status, 404);
  for (let i = 0; i < 3; i++) assert.equal((await subscribe(second)).status, 202);
  assert.equal(to(second).length, 1, 'keine weitere Mail an die gesperrte Adresse');
  assert.deepEqual(sql(`select type from mailing.consent_events where email_hash = '${consent.emailHash(second)}' order by id`).split('\n'), ['requested', 'unsubscribed']);

  // M1 über den Handler: von Hand gesperrt, dann Bestätigung mit gültigem Link.
  const third = 'spaeter-gesperrt@beispiel.invalid';
  await subscribe(third);
  await store.addSuppression(consent.emailHash(third), 'objection', Date.now());
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(third)[0], '/b') }), deps)).status, 404);
  assert.equal((await store.getSubscription(consent.emailHash(third))).status, 'pending');

  // M3 über den Handler: Fehlschläge verbrauchen nichts.
  const fourth = 'versand-kaputt@beispiel.invalid';
  const broken = { ...deps, sendMail: async () => ({ ok: false, error: 'resend_500' }) };
  const quiet = console.error;
  console.error = () => {};
  try {
    for (let i = 0; i < 4; i++) assert.equal((await consent.handleSubscribe(post('/api/mailing/subscribe', { email: fourth, lang: 'de', consent: true, consent_version: 'test.1', source: 'preise/checkliste' }), broken)).status, 502);
  } finally {
    console.error = quiet;
  }
  assert.equal(sql(`select string_agg(distinct state, ',') from mailing.confirmation_mails where email_hash = '${consent.emailHash(fourth)}'`), 'failed');
  for (let i = 0; i < 4; i++) assert.equal((await subscribe(fourth)).status, 202);
  assert.equal(to(fourth).length, 3);
});
