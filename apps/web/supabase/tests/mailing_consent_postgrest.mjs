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
// "mailing" neu an (ein vorhandenes in dieser Wegwerf-Datenbank wird ersetzt) und entfernt es am Ende wieder. Für die
// Probe zur Zeichenkodierung legt es kurz die Datenbank `nexify_mailing_fixture_latin1` an und entfernt sie wieder.
//
// Die Datenbank setzt alle Zeitpunkte selbst. Wo ein Test Zeit vergehen lassen muss, verschiebt er vorhandene Zeilen
// als Besitzer der Datenbank in die Vergangenheit (`age`), an den Triggern vorbei; der Dienst kann das nicht.
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
/** Als Besitzer, an den Triggern vorbei: nur zum Altern von Prüfdaten und zum Stellen der Obergrenzen. */
const owner = (statement) => psql(['-c', 'set session_replication_role = replica', '-c', statement]);
const ageMails = (hours) => owner(`update mailing.confirmation_mails set reserved_at = reserved_at - interval '${hours} hours'`);
const ageSubscription = (hash, hours) => owner(`update mailing.subscriptions set requested_at = requested_at - interval '${hours} hours', confirm_expires_at = confirm_expires_at - interval '${hours} hours' where email_hash = '${hash}'`);
const settings = (daily, attempts) => sql(`update mailing.settings set daily_limit = ${daily}, daily_attempt_limit = ${attempts}`);
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
  // Die ausgelieferte Obergrenze (50 Mails je Tag) wäre für die vielen Prüfadressen zu eng; die Tests zur Tagesgrenze stellen sie selbst.
  settings(10_000, 100_000);

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

const LIMITS = { perAddress: 3, windowHours: 168, perDay: 10_000, attemptsPerAddress: 9, attemptsPerDay: 100_000 };
const near = (actual, expected, toleranceMs = 15_000) => Math.abs(actual - expected) <= toleranceMs;
async function pendingInput(address, overrides = {}) {
  const now = Date.now();
  return {
    emailHash: await sha(address), email: address, lang: 'de', source: 'preise/checkliste', consentVersion: 'test.1', consentTextSha256: await sha('wortlaut'),
    requestedAt: now, confirmTokenHash: await sha(token()), confirmExpiresAt: now + 48 * HOUR, ...overrides,
  };
}

test('N5: PostgREST liefert das Schema für service_role aus, obwohl anon und authenticated kein USAGE haben', async () => {
  assert.match(state.version, /^PostgREST \d+\.\d+/);
  assert.equal(sql("select has_schema_privilege('anon','mailing','usage') or has_schema_privilege('authenticated','mailing','usage')"), 'f');
  const call = (key, table) => fetch(`${state.postgrestUrl}/${table}?limit=1`, { headers: { ...(key ? { Authorization: `Bearer ${key}` } : {}), 'Accept-Profile': 'mailing' } });
  for (const table of ['subscriptions', 'suppressions', 'consent_events', 'confirmation_mails', 'unsubscribe_tokens', 'settings']) {
    assert.equal((await call(state.keys.service, table)).status, 200, table);
    for (const [name, key] of [['ohne Schlüssel', null], ['anon', state.keys.anon], ['authenticated', state.keys.authenticated]]) {
      const response = await call(key, table);
      assert.ok([401, 403].includes(response.status), `${name} auf ${table}: ${response.status}`);
      assert.equal((await response.json()).code, '42501', 'permission denied');
    }
  }
  const write = await fetch(`${state.postgrestUrl}/suppressions`, { method: 'POST', headers: { Authorization: `Bearer ${state.keys.anon}`, 'Content-Profile': 'mailing', 'Content-Type': 'application/json' }, body: JSON.stringify({ email_hash: 'a'.repeat(64), reason: 'manual' }) });
  assert.ok([401, 403].includes(write.status));
  // Die Obergrenzen kann auch der Dienst nur lesen.
  const raise = await fetch(`${state.postgrestUrl}/settings?id=is.true`, { method: 'PATCH', headers: { Authorization: `Bearer ${state.keys.service}`, 'Content-Profile': 'mailing', 'Content-Type': 'application/json' }, body: JSON.stringify({ daily_limit: 9999 }) });
  assert.ok([401, 403].includes(raise.status), `service_role ändert settings: ${raise.status}`);
  assert.equal(sql('select daily_limit from mailing.settings'), '10000');
});

test('Speicher: anlegen, lesen, weiteres Kennzeichen, bestätigen; der Nachweis bleibt stehen, die Zeitpunkte setzt die Datenbank', async () => {
  const { store } = state;
  // B7: Der Aufrufer behauptet eine Anfrage vor 300 Tagen. Die Datenbank trägt ihre eigene Uhr ein und behält nur die Dauer der Frist.
  const claimed = Date.now() - 300 * 24 * HOUR;
  const input = await pendingInput('person@beispiel.invalid', { requestedAt: claimed, confirmExpiresAt: claimed + 48 * HOUR });
  assert.equal(await store.insertPending(input), true);
  assert.equal(await store.insertPending({ ...(await pendingInput('person@beispiel.invalid')), lang: 'fr' }), false, 'vorhandene Zeile wird nicht überschrieben');
  const proof = await store.getSubscription(input.emailHash);
  assert.ok(near(proof.requestedAt, Date.now()), 'Zeitpunkt der Anfrage ist die Uhr der Datenbank');
  assert.equal(proof.confirmExpiresAt - proof.requestedAt, 48 * HOUR);
  assert.deepEqual(proof, { emailHash: input.emailHash, email: input.email, lang: 'de', status: 'pending', source: input.source, consentVersion: 'test.1', consentTextSha256: input.consentTextSha256, requestedAt: proof.requestedAt, confirmExpiresAt: proof.confirmExpiresAt, confirmedAt: null, unsubscribedAt: null });
  const second = await sha(token());
  assert.equal(await store.addConfirmToken(input.emailHash, second, Date.now()), true);
  assert.equal(sql(`select cardinality(confirm_token_hashes) from mailing.subscriptions where email_hash = '${input.emailHash}'`), '2');
  assert.deepEqual(await store.getSubscription(input.emailHash), proof);
  assert.deepEqual(await store.findPendingByTokenHash(second, Date.now()), { emailHash: input.emailHash });
  assert.equal(await store.findPendingByTokenHash(await sha('fremd'), Date.now()), null);
  await store.removeConfirmToken(input.emailHash, second);
  assert.equal(await store.confirmByTokenHash(second, Date.now()), null, 'zurückgenommenes Kennzeichen');
  assert.equal(await store.confirmByTokenHash(input.confirmTokenHash, proof.confirmExpiresAt + 1), null, 'nach der Frist (Filter des Dienstes)');
  // B7: Der Aufrufer datiert die Bestätigung 30 Minuten zurück; eingetragen wird die Uhr der Datenbank.
  const confirmed = await store.confirmByTokenHash(input.confirmTokenHash, Date.now() - 30 * 60_000 + 31 * 60_000 - 60_000);
  assert.ok(near(confirmed.confirmedAt, Date.now()), 'Zeitpunkt der Bestätigung ist die Uhr der Datenbank');
  assert.deepEqual(confirmed, { ...proof, status: 'confirmed', confirmedAt: confirmed.confirmedAt });
  assert.equal(await store.confirmByTokenHash(input.confirmTokenHash, Date.now()), null, 'zweite Verwendung');
  assert.equal(await store.addConfirmToken(input.emailHash, await sha(token()), Date.now()), false);

  // Frist nach der Uhr der Datenbank: Die Zeile ist dort abgelaufen; ein Dienst mit nachgehender Uhr bestätigt trotzdem nicht.
  const late = await pendingInput('zu-spaet@beispiel.invalid');
  await store.insertPending(late);
  ageSubscription(late.emailHash, 49);
  await assert.rejects(store.confirmByTokenHash(late.confirmTokenHash, Date.now() - 72 * HOUR), (error) => error instanceof state.mod.MailingConsentStoreError);
  assert.equal((await store.getSubscription(late.emailHash)).status, 'pending');
});

test('Speicher: falsche Prüfsumme, Steuerzeichen, unsichtbare Zeichen und Großbuchstaben lehnt die Datenbank ab (B8)', async () => {
  const { store, mod } = state;
  const failed = (error) => error instanceof mod.MailingConsentStoreError && error.code === 'mailing_store_failed';
  await assert.rejects(store.insertPending({ ...(await pendingInput('eine@adresse.invalid')), email: 'andere@adresse.invalid' }), failed);
  for (const address of ['steuer\u0007zeichen@adresse.invalid', 'null​breite@adresse.invalid', 'um‮gedreht@adresse.invalid', 'Gross@Adresse.invalid']) {
    await assert.rejects(store.insertPending(await pendingInput(address)), failed, JSON.stringify(address));
  }
  assert.equal(sql("select count(*) from mailing.subscriptions where lower(email) like '%adresse.invalid'"), '0');
});

test('Sperre über das Kennzeichen: überlebt den Verfall (B1), löscht nie bestätigte Zeilen samt Adresse (B3), meldet bestätigte ab', async () => {
  const { store, mod } = state;
  // M1: von Hand gesperrt, dann Bestätigung mit gültigem Kennzeichen.
  const blocked = await pendingInput('gesperrt@beispiel.invalid');
  await store.insertPending(blocked);
  await store.addSuppression(blocked.emailHash, 'complaint', Date.now() - 9 * 365 * 24 * HOUR);
  await store.addSuppression(blocked.emailHash, 'manual', Date.now());
  assert.equal(sql(`select reason from mailing.suppressions where email_hash = '${blocked.emailHash}'`), 'complaint');
  assert.equal(sql(`select created_at > now() - interval '1 minute' from mailing.suppressions where email_hash = '${blocked.emailHash}'`), 't', 'Zeitpunkt der Sperre ist die Uhr der Datenbank');
  await assert.rejects(store.confirmByTokenHash(blocked.confirmTokenHash, Date.now()), (error) => error instanceof mod.MailingConsentStoreError);
  assert.equal((await store.getSubscription(blocked.emailHash)).status, 'pending');

  // Ein Kennzeichen je Adresse, auch bei gleichzeitigen Aufrufen; nie ersetzt.
  const leaving = await pendingInput('nie-bestaetigt@beispiel.invalid');
  await store.insertPending(leaving);
  const issued = await Promise.all(Array.from({ length: 6 }, () => store.issueUnsubscribeToken(leaving.emailHash, token())));
  assert.equal(new Set(issued).size, 1);
  assert.equal(await store.issueUnsubscribeToken(leaving.emailHash, token()), issued[0]);
  assert.equal(await store.unsubscribeByToken(token(), Date.now()), null);
  // B3: nie bestätigt, über den Sperrlink gesperrt: Die Zeile samt Adresse ist weg, die Sperre (nur Prüfsumme) steht.
  assert.deepEqual(await store.unsubscribeByToken(issued[0], Date.now()), { emailHash: leaving.emailHash, alreadyUnsubscribed: false });
  assert.equal(await store.getSubscription(leaving.emailHash), null);
  assert.equal(sql("select count(*) from mailing.subscriptions where email = 'nie-bestaetigt@beispiel.invalid'"), '0');
  assert.equal(await store.isSuppressed(leaving.emailHash), true);
  assert.deepEqual(await store.unsubscribeByToken(issued[0], Date.now()), { emailHash: leaving.emailHash, alreadyUnsubscribed: true });
  assert.equal(await store.confirmByTokenHash(leaving.confirmTokenHash, Date.now()), null);

  // B1: Die Anmeldung verfällt und wird gelöscht. Der Sperrlink der alten Mail wirkt weiter.
  const expired = await pendingInput('verfallen-und-gesperrt@beispiel.invalid');
  await store.insertPending(expired);
  const oldLink = await store.issueUnsubscribeToken(expired.emailHash, token());
  ageSubscription(expired.emailHash, 49);
  await store.purgeExpiredPending(Date.now());
  assert.equal(await store.getSubscription(expired.emailHash), null, 'verfallen und gelöscht');
  assert.deepEqual(await store.unsubscribeByToken(oldLink, Date.now()), { emailHash: expired.emailHash, alreadyUnsubscribed: false });
  assert.equal(await store.isSuppressed(expired.emailHash), true);

  // Bestätigte Adresse: abgemeldet, der Nachweis bleibt, der Zeitpunkt kommt von der Datenbank.
  const member = await pendingInput('bestaetigt@beispiel.invalid');
  await store.insertPending(member);
  const memberToken = await store.issueUnsubscribeToken(member.emailHash, token());
  await store.confirmByTokenHash(member.confirmTokenHash, Date.now());
  assert.deepEqual(await store.unsubscribeByToken(memberToken, Date.now() - 5 * 24 * HOUR), { emailHash: member.emailHash, alreadyUnsubscribed: false });
  const record = await store.getSubscription(member.emailHash);
  assert.deepEqual([record.status, record.email], ['unsubscribed', 'bestaetigt@beispiel.invalid']);
  assert.ok(near(record.unsubscribedAt, Date.now()) && record.confirmedAt !== null);
});

test('Zählung gleichzeitig: von 24 Einträgen zur selben Adresse entstehen genau 3; Uhr und Obergrenzen der Datenbank gelten (B7); Versuche sind begrenzt (B11)', async () => {
  const { store } = state;
  const hash = await sha('zugleich@beispiel.invalid');
  const same = await Promise.all(Array.from({ length: 24 }, () => store.reserveConfirmationMail(hash, Date.now(), LIMITS)));
  assert.equal(same.filter(Boolean).length, 3);
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where email_hash = '${hash}'`), '3');
  // B7: Weder ein 8 Tage vorausdatierter Eintrag noch ein vom Aufrufer angehobener Grenzwert kommt durch.
  assert.equal(await store.reserveConfirmationMail(hash, Date.now() + 8 * 24 * HOUR, LIMITS), null, '8 Tage voraus');
  assert.equal(await store.reserveConfirmationMail(hash, Date.now(), { ...LIMITS, perAddress: 10 }), null, 'Grenze 10 behauptet');
  assert.equal(await store.reserveConfirmationMail(hash, Date.now(), { ...LIMITS, windowHours: 1 }), null, 'Fenster 1 Stunde behauptet');
  assert.equal(sql(`select string_agg(distinct address_limit || '/' || address_window_hours, ',') from mailing.confirmation_mails where email_hash = '${hash}'`), '3/168', 'in der Zeile steht, was galt');
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where email_hash = '${hash}' and reserved_at > now() + interval '1 minute'`), '0');
  // M3: Ein Fehlschlag zählt nicht als Mail; ein abgeschlossener Eintrag bleibt abgeschlossen.
  const [first, second] = same.filter(Boolean);
  await store.settleConfirmationMail(first, 'failed');
  await store.settleConfirmationMail(second, 'sent');
  await assert.rejects(store.settleConfirmationMail(second, 'failed'));
  const again = await Promise.all(Array.from({ length: 8 }, () => store.reserveConfirmationMail(hash, Date.now(), LIMITS)));
  assert.equal(again.filter(Boolean).length, 1, 'genau der freigegebene Platz');
  ageMails(167);
  assert.equal(await store.reserveConfirmationMail(hash, Date.now(), LIMITS), null, 'noch im Fenster');
  ageMails(2);
  assert.ok(await store.reserveConfirmationMail(hash, Date.now(), LIMITS), 'nach dem Fenster');

  // B11: neun Versuche je Adresse im Fenster, auch wenn jeder scheitert; der Aufrufer kann die Grenze nicht anheben.
  const flaky = await sha('versand-gestoert@beispiel.invalid');
  for (let attempt = 0; attempt < 9; attempt++) {
    const reserved = await store.reserveConfirmationMail(flaky, Date.now(), LIMITS);
    assert.ok(reserved, `Versuch ${attempt + 1}`);
    await store.settleConfirmationMail(reserved, 'failed');
  }
  assert.equal(await store.reserveConfirmationMail(flaky, Date.now(), LIMITS), null, 'zehnter Versuch');
  assert.equal(await store.reserveConfirmationMail(flaky, Date.now(), { ...LIMITS, attemptsPerAddress: 100 }), null);
});

test('Tagesgrenze gleichzeitig: von 30 Adressen entstehen genau so viele, wie die Obergrenze der Datenbank erlaubt, auch wenn der Dienst mehr behauptet (B7)', async () => {
  const { store } = state;
  ageMails(30); // alles Bisherige liegt außerhalb der letzten 24 Stunden
  settings(7, 100_000);
  try {
    const hashes = await Promise.all(Array.from({ length: 30 }, (_, i) => sha(`tag${i}@beispiel.invalid`)));
    const many = await Promise.all(hashes.map((entry) => store.reserveConfirmationMail(entry, Date.now(), LIMITS)));
    assert.equal(many.filter(Boolean).length, 7, 'der Dienst behauptet 10000 je Tag, die Datenbank lässt 7 zu');
    assert.equal(await store.dailyLimitReached(Date.now(), 7), true);
    assert.equal(await store.dailyLimitReached(Date.now() + 25 * HOUR, 7), false);
    // Der Dienst darf strenger sein als die Obergrenze.
    ageMails(30);
    settings(10_000, 100_000);
    const strict = await Promise.all(hashes.map((entry) => store.reserveConfirmationMail(entry, Date.now(), { ...LIMITS, perDay: 4 })));
    assert.equal(strict.filter(Boolean).length, 4);
  } finally {
    settings(10_000, 100_000);
    ageMails(30);
  }
});

test('Gleichzeitig: weitere Kennzeichen überschreiben einander nicht; von fünf Bestätigungen gewinnt genau eine', async () => {
  const { store } = state;
  const input = await pendingInput('wettlauf@beispiel.invalid');
  await store.insertPending(input);
  const hashes = await Promise.all(Array.from({ length: 3 }, () => sha(token())));
  const added = await Promise.all(hashes.map((hash) => store.addConfirmToken(input.emailHash, hash, Date.now())));
  const stored = sql(`select array_to_string(confirm_token_hashes, ',') from mailing.subscriptions where email_hash = '${input.emailHash}'`).split(',');
  // Wer kein Kennzeichen anfügen konnte (drei Leseversuche verloren), bekommt `false` und sendet nicht; nie geht eines verloren, das gemeldet wurde.
  for (const [index, result] of added.entries()) assert.equal(stored.includes(hashes[index]), result);
  assert.ok(added.filter(Boolean).length >= 1 && stored.includes(input.confirmTokenHash));
  const now = Date.now();
  const confirms = await Promise.all(Array.from({ length: 5 }, () => store.confirmByTokenHash(input.confirmTokenHash, now)));
  assert.equal(confirms.filter(Boolean).length, 1);
  assert.equal(sql(`select status || ':' || cardinality(confirm_token_hashes) from mailing.subscriptions where email_hash = '${input.emailHash}'`), 'confirmed:0');
});

test('B6: eine Sperre, die gerade eingetragen wird, ist für die gleichzeitige Bestätigung sichtbar', async () => {
  const { store, mod } = state;
  const input = await pendingInput('rueckläufer@beispiel.invalid'.normalize('NFC'));
  await store.insertPending(input);
  // Eine zweite Verbindung trägt die Sperre ein und schließt erst nach anderthalb Sekunden ab (wie ein langsamer Ereignisempfang).
  const holder = spawn('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', DATABASE, '-c', `begin; insert into mailing.suppressions(email_hash, reason) values ('${input.emailHash}', 'hard_bounce'); select pg_sleep(1.5); commit;`], { stdio: 'ignore' });
  const done = new Promise((resolve) => holder.on('exit', resolve));
  for (let attempt = 0; sql(`select count(*) from pg_stat_activity where datname = '${DATABASE}' and query like '%hard_bounce%pg_sleep%' and pid <> pg_backend_pid()`) === '0'; attempt++) {
    if (attempt > 100) throw new Error('die zweite Verbindung hat nicht begonnen');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  const started = Date.now();
  // Die Bestätigung wartet auf den Abschluss der Sperre und wird dann verweigert. Vorher bestätigte sie sofort.
  await assert.rejects(store.confirmByTokenHash(input.confirmTokenHash, Date.now()), (error) => error instanceof mod.MailingConsentStoreError);
  assert.ok(Date.now() - started > 500, `gewartet: ${Date.now() - started} ms`);
  assert.equal(await done, 0);
  assert.equal(sql(`select s.status || ':' || exists(select 1 from mailing.suppressions x where x.email_hash = s.email_hash) from mailing.subscriptions s where email_hash = '${input.emailHash}'`), 'pending:true');
});

test('Aufräumen: verfallene unbestätigte Zeilen gehen, alles andere und jeder noch zählende Eintrag bleibt', async () => {
  const { store } = state;
  const expired = await pendingInput('verfallen@beispiel.invalid');
  await store.insertPending(expired);
  ageSubscription(expired.emailHash, 50);
  const before = sql("select count(*) from mailing.subscriptions where status <> 'pending'");
  await store.purgeExpiredPending(Date.now());
  assert.equal(await store.getSubscription(expired.emailHash), null);
  assert.equal(sql("select count(*) from mailing.subscriptions where status <> 'pending'"), before);
  const fresh = await store.reserveConfirmationMail(await sha('frisch@beispiel.invalid'), Date.now(), LIMITS);
  ageMails(0);
  owner("update mailing.confirmation_mails set reserved_at = reserved_at - interval '169 hours' where id <> " + fresh.id);
  assert.ok(Number(sql("select count(*) from mailing.confirmation_mails where reserved_at < now() - interval '168 hours'")) > 0);
  // Der Dienst fragt mit einer weit vorgehenden Uhr: Die Datenbank löscht trotzdem nur, was nach ihrer Uhr nicht mehr zählt.
  await store.purgeSettledMails(Date.now() + 5000 * HOUR, 168);
  assert.equal(sql("select count(*) from mailing.confirmation_mails where reserved_at < now() - interval '168 hours'"), '0');
  assert.equal(sql(`select count(*) from mailing.confirmation_mails where id = ${fresh.id}`), '1');
});

test('B5 und B10: die Migration ist eine Transaktion; ohne UTF8 entsteht nichts, auch ohne ON_ERROR_STOP; ein erneuter Lauf mit Daten ändert nichts', () => {
  const admin = (database, args, input) => spawnSync('psql', ['-X', '-q', '-At', '-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', database, ...args], { input, encoding: 'utf8' });
  const other = 'nexify_mailing_fixture_latin1';
  admin(DATABASE, ['-c', `drop database if exists ${other}`]);
  assert.equal(admin(DATABASE, ['-c', `create database ${other} encoding 'LATIN1' template template0 lc_collate 'C' lc_ctype 'C'`]).status, 0);
  try {
    // Bewusst OHNE ON_ERROR_STOP: psql läuft nach dem ersten Fehler weiter. Früher entstanden so vier Tabellen.
    const loose = admin(other, ['-f', MIGRATION]);
    assert.match(loose.stderr, /verlangt eine Datenbank in UTF8/);
    assert.equal(admin(other, ['-c', "select count(*) from pg_tables where schemaname = 'mailing'"]).stdout.trim(), '0');
    assert.equal(admin(other, ['-c', "select count(*) from pg_namespace where nspname = 'mailing'"]).stdout.trim(), '0');
    assert.equal(admin(other, ['-v', 'ON_ERROR_STOP=1', '-f', MIGRATION]).status, 3);
  } finally {
    admin(DATABASE, ['-c', `drop database if exists ${other}`]);
  }
  // Erneuter Lauf gegen die Datenbank mit Daten, als eine Transaktion: Zeilen, Obergrenzen und Sperren unverändert.
  const counts = () => sql("select (select count(*) from mailing.subscriptions) || '/' || (select count(*) from mailing.suppressions) || '/' || (select count(*) from mailing.confirmation_mails) || '/' || (select count(*) from mailing.unsubscribe_tokens) || '/' || (select daily_limit from mailing.settings) || '/' || (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'mailing' and not g.tgisinternal and g.tgenabled = 'O')");
  const before = counts();
  assert.match(before, /^\d+\/\d+\/\d+\/\d+\/10000\/9$/);
  psql(['-f', MIGRATION]);
  assert.equal(counts(), before);
  // Scheitert die Migration mittendrin, bleibt der alte Stand vollständig stehen (kein Fenster ohne Sperren).
  const broken = spawnSync('psql', ['-X', '-q', '-h', PGHOST, '-p', PGPORT, '-U', PGUSER, '-d', DATABASE, '-f', '-'], { input: spawnSync('cat', [MIGRATION], { encoding: 'utf8' }).stdout.replace('create index if not exists confirmation_mails_time_idx', 'select 1/0;\ncreate index if not exists confirmation_mails_time_idx'), encoding: 'utf8' });
  assert.match(broken.stderr, /division by zero/);
  assert.equal(counts(), before, 'nach einem abgebrochenen Lauf sind alle neun Trigger noch da');
});

test('Handler über den echten Weg: Anmeldung, Grenze, Sperrlink (auch nach Verfall), Bestätigung, gleichzeitige Anmeldungen, Aufräumen ohne Schalter', async () => {
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
    grenzen: { bestaetigungsmails_je_adresse: 3, bestaetigungsmails_fenster_stunden: 168, bestaetigungsmails_je_tag: 10_000, versandversuche_je_adresse: 9, versandversuche_je_tag: 100_000, anfragen_je_minute: 1000, anfragen_je_stunde: 2000, anfragen_je_tag: 2500, bestaetigungen_je_minute: 1000, bestaetigungen_je_stunde: 100_000, max_body_bytes: 4096 },
  };
  assert.deepEqual(consent.consentReadiness(config, { MAILING_PUBLIC_BASE_URL: BASE }), []);
  const outbox = [];
  const clock = { skew: 0 };
  const deps = { env: { NEXIFY_MAILING_CONSENT: 'on', MAILING_PUBLIC_BASE_URL: BASE }, config, mailConfigured: () => true, nowMs: () => Date.now() + clock.skew, sendMail: async (entry) => { await new Promise((resolve) => setTimeout(resolve, 3)); outbox.push(entry); return { ok: true }; } };
  const post = (path, body) => new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', host: 'seite.invalid' }, body: JSON.stringify(body) });
  const subscribe = (email, with_ = deps) => consent.handleSubscribe(post('/api/mailing/subscribe', { email, lang: 'de', consent: true, consent_version: 'test.1', source: 'preise/checkliste' }), with_);
  const unsubscribe = (value, with_ = deps) => consent.handleUnsubscribe(new Request(`${BASE}/api/mailing/unsubscribe?t=${value}`, { method: 'POST' }), with_);
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
  assert.equal(part(to(first)[0], '/a'), sql(`select token from mailing.unsubscribe_tokens where email_hash = '${hash}'`));
  // Bestätigung mit dem zuerst zugestellten Link.
  const confirmed = await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(first)[0], '/b') }), deps);
  assert.equal(confirmed.status, 200);
  assert.equal((await store.getSubscription(hash)).status, 'confirmed');
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(first)[1], '/b') }), deps)).status, 404);

  // H1 und B3: Ein Empfänger sperrt seine Adresse über den Sperrlink, ohne je zu bestätigen. Die Adresse bleibt nicht gespeichert.
  const second = 'fremd-eingetragen@beispiel.invalid';
  assert.equal((await subscribe(second)).status, 202);
  assert.equal((await unsubscribe(part(to(second)[0], '/a'))).status, 200);
  assert.equal(sql(`select count(*) from mailing.subscriptions where email = '${second}'`), '0');
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(second)[0], '/b') }), deps)).status, 404);
  for (let i = 0; i < 3; i++) assert.equal((await subscribe(second)).status, 202);
  assert.equal(to(second).length, 1, 'keine weitere Mail an die gesperrte Adresse');
  assert.deepEqual(sql(`select type from mailing.consent_events where email_hash = '${consent.emailHash(second)}' order by id`).split('\n'), ['requested', 'unsubscribed']);

  // B1 und B4: Die Anmeldung verfällt. Bei ausgeschaltetem Schalter räumt schon der nächste Aufruf sie ab; der Sperrlink der alten Mail wirkt trotzdem.
  const late = 'liest-spaet@beispiel.invalid';
  assert.equal((await subscribe(late)).status, 202);
  ageSubscription(consent.emailHash(late), 49);
  clock.skew += 2 * 60_000; // das Aufräumen läuft höchstens einmal je Minute
  assert.equal((await subscribe('irgendwer@beispiel.invalid', { ...deps, env: {} })).status, 503, 'Schalter aus');
  assert.equal(sql(`select count(*) from mailing.subscriptions where email = '${late}'`), '0', 'verfallene Adresse gelöscht, obwohl der Schalter aus ist');
  assert.equal((await unsubscribe(part(to(late)[0], '/a'))).status, 200, 'Sperrlink nach dem Verfall');
  assert.equal(await store.isSuppressed(consent.emailHash(late)), true);
  assert.equal((await subscribe(late)).status, 202);
  assert.equal(to(late).length, 1, 'kein Dritter löst wieder eine Mail aus');

  // M1 über den Handler: von Hand gesperrt, dann Bestätigung mit gültigem Link.
  const third = 'spaeter-gesperrt@beispiel.invalid';
  await subscribe(third);
  await store.addSuppression(consent.emailHash(third), 'objection', Date.now());
  assert.equal((await consent.handleConfirm(post('/api/mailing/confirm', { token: part(to(third)[0], '/b') }), deps)).status, 404);
  assert.equal((await store.getSubscription(consent.emailHash(third))).status, 'pending');

  // M3 und B11 über den Handler: Fehlschläge verbrauchen keine Mail, sind aber begrenzt.
  const fourth = 'versand-kaputt@beispiel.invalid';
  let handed = 0;
  const broken = { ...deps, sendMail: async () => { handed += 1; return { ok: false, error: 'resend_500' }; } };
  const quiet = console.error;
  console.error = () => {};
  try {
    for (let i = 0; i < 4; i++) assert.equal((await subscribe(fourth, broken)).status, 502);
    assert.equal(sql(`select string_agg(distinct state, ',') from mailing.confirmation_mails where email_hash = '${consent.emailHash(fourth)}'`), 'failed');
    for (let i = 0; i < 4; i++) assert.equal((await subscribe(fourth)).status, 202);
    assert.equal(to(fourth).length, 3, 'drei zugestellte Mails nach vier Fehlschlägen');
    const fifth = 'versand-dauerhaft-kaputt@beispiel.invalid';
    handed = 0;
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await subscribe(fifth, broken)).status);
    assert.deepEqual(statuses, [...Array(9).fill(502), 202, 202, 202]);
    assert.equal(handed, 9, 'nach neun Versuchen geht nichts mehr an den Versanddienst');
  } finally {
    console.error = quiet;
  }
});
