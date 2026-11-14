// Einwilligungsweg für Werbemails: Handler ohne Netz, gegen den Test-Speicher. Nur Dummywerte.
// Die Wortlaute in FREIGEGEBEN sind Prüfdaten dieses Tests, keine Rechtstexte und keine Vorlage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAILING_CONSENT_CONFIG,
  availableLanguages,
  buildConfirmationMail,
  consentReadiness,
  emailHash,
  handleConfirm,
  handleSubscribe,
  handleUnsubscribe,
  listUnsubscribeHeaders,
  mailingConsentEnabled,
  mailingMethodNotAllowed,
  publicBaseUrl,
  sha256Hex,
} from '../../mailing/consent.ts';
import { createMemoryMailingConsentStore, MailingConsentStoreError } from '../../mailing/consent-store.ts';
import { createRateLimiter } from '../../mailing/rate-limit.ts';

const NOW = 1_800_000_000_000;
const HOUR = 3_600_000;
const BASE = 'https://seite.invalid';
const ENV = { NEXIFY_MAILING_CONSENT: 'on', MAILING_PUBLIC_BASE_URL: BASE };
const FREIGABE = { durch: 'Prüfperson', am: '2026-01-01', beleg: 'Prüfbeleg des Tests' };
const TEXT_DE = 'PRÜFTEXT Einwilligung, nur für diesen Test.';
const FREIGEGEBEN = {
  einwilligung: { fassung: 'test.1', freigabe: FREIGABE, texte: { de: TEXT_DE, nl: null, fr: null, en: null } },
  bestaetigungsmail: {
    freigabe: FREIGABE,
    texte: { de: { betreff: 'PRÜFBETREFF', text: 'Prüfabsatz eins.\n\nLink: {{BESTAETIGUNGSLINK}}\n\nWortlaut: {{EINWILLIGUNGSTEXT}}' }, nl: null, fr: null, en: null },
  },
  bestaetigungsfrist_stunden: 48,
  seiten: { bestaetigung: '/anmeldung/bestaetigen', abmeldung: '/anmeldung/abmelden' },
  quellen: ['preise/checkliste'],
  grenzen: { bestaetigungsmails_je_anmeldung: 3, anfragen_je_minute: 3, anfragen_je_stunde: 10, max_body_bytes: 4096 },
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const VALID = { email: ' Person@Beispiel.Invalid ', lang: 'de', consent: true, consent_version: 'test.1', source: 'preise/checkliste' };
const ADDRESS = 'person@beispiel.invalid';

/** Baut eine Umgebung für einen Test: Speicher, Postausgang, fortlaufende Kennzeichen, stellbare Uhr. */
function setup(overrides = {}) {
  const store = createMemoryMailingConsentStore();
  const outbox = [];
  const state = { now: NOW, serial: 0, mailResult: { ok: true, id: 'mail_1' }, logs: [] };
  const deps = {
    env: ENV,
    config: clone(FREIGEGEBEN),
    store,
    mailConfigured: () => true,
    sendMail: async (mail) => { outbox.push(mail); return state.mailResult; },
    nowMs: () => state.now,
    newToken: () => String(++state.serial).padStart(43, 'A'),
    limiter: createRateLimiter([{ ms: 60_000, max: 1000 }]),
    ...overrides,
  };
  return { store, outbox, state, deps };
}
function post(path, body, headers = {}) {
  return new Request(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json', host: 'seite.invalid', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
const subscribe = (deps, body = VALID, headers) => handleSubscribe(post('/api/mailing/subscribe', body, headers), deps);
const confirm = (deps, token, headers) => handleConfirm(post('/api/mailing/confirm', { token }, headers), deps);
const unsubscribe = (deps, token) => handleUnsubscribe(new Request(`${BASE}/api/mailing/unsubscribe?t=${token}`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'List-Unsubscribe=One-Click' }), deps);
const tokenFromMail = (mail) => mail.text.match(/#t=([A-Za-z0-9_-]{43})/)[1];
async function quiet(run) {
  const oldError = console.error, oldWarn = console.warn;
  const logs = [];
  console.error = (...args) => logs.push(args.map(String).join(' '));
  console.warn = (...args) => logs.push(args.map(String).join(' '));
  try { return { result: await run(), logs }; } finally { console.error = oldError; console.warn = oldWarn; }
}

test('Schalter: nur der exakte Wert "on" schaltet ein; ohne ihn 503 und kein Zugriff', async () => {
  assert.equal(mailingConsentEnabled({}), false);
  assert.equal(mailingConsentEnabled({ NEXIFY_MAILING_CONSENT: 'true' }), false);
  assert.equal(mailingConsentEnabled({ NEXIFY_MAILING_CONSENT: 'ON' }), false);
  assert.equal(mailingConsentEnabled({ NEXIFY_MAILING_CONSENT: 'on' }), true);
  const { deps, outbox, store } = setup({ env: { MAILING_PUBLIC_BASE_URL: BASE } });
  const res = await subscribe(deps);
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'mailing_consent_not_configured' });
  assert.equal((await confirm(deps, 'A'.repeat(43))).status, 503);
  assert.equal(outbox.length, 0);
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
});

test('Ausgelieferte Konfiguration: ohne Freigabe des Inhabers arbeitet die Anmeldung nicht, auch mit Schalter', async () => {
  const gaps = consentReadiness(MAILING_CONSENT_CONFIG, ENV);
  const approvalMissing = !MAILING_CONSENT_CONFIG.einwilligung.freigabe || !MAILING_CONSENT_CONFIG.bestaetigungsmail.freigabe;
  // Solange eine Freigabe fehlt, muss die Lücke gemeldet werden. Liegt sie später vor, prüft dieser Test nichts Falsches.
  if (approvalMissing) assert.ok(gaps.includes('consent_text_not_approved') || gaps.includes('confirmation_mail_not_approved'));
  if (gaps.length > 0) {
    const { deps, outbox } = setup({ config: MAILING_CONSENT_CONFIG });
    const { result, logs } = await quiet(() => subscribe(deps));
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: 'mailing_consent_not_ready' });
    assert.equal(outbox.length, 0);
    assert.match(logs.join('\n'), /mailing_consent_not_ready/);
  }
});

test('Bereitschaft: jede fehlende Freigabe oder Festlegung wird einzeln benannt', () => {
  assert.deepEqual(consentReadiness(clone(FREIGEGEBEN), ENV), []);
  const cases = [
    [(c) => { c.einwilligung.fassung = null; }, 'consent_version_missing'],
    [(c) => { c.einwilligung.freigabe = null; }, 'consent_text_not_approved'],
    [(c) => { c.einwilligung.freigabe = { durch: 'x', am: 'bald', beleg: 'y' }; }, 'consent_text_not_approved'],
    [(c) => { c.einwilligung.freigabe = { durch: 'x', am: '2026-01-01', beleg: ' ' }; }, 'consent_text_not_approved'],
    [(c) => { c.einwilligung.texte.de = '  '; }, 'consent_text_missing'],
    [(c) => { c.bestaetigungsmail.freigabe = null; }, 'confirmation_mail_not_approved'],
    [(c) => { c.bestaetigungsmail.texte.de = null; }, 'confirmation_mail_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.betreff = 'Zeile\nZwei'; }, 'confirmation_mail_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.text = 'ohne Link'; }, 'confirmation_mail_link_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.text += ' {{IMPRESSUM_NAME}}'; }, 'confirmation_mail_placeholder_unresolved'],
    [(c) => { c.bestaetigungsmail.texte.de.text += ' [EINWILLIGUNGSTEXT – folgt]'; }, 'confirmation_mail_placeholder_unresolved'],
    [(c) => { c.bestaetigungsfrist_stunden = null; }, 'confirmation_deadline_missing'],
    [(c) => { c.bestaetigungsfrist_stunden = 0; }, 'confirmation_deadline_missing'],
    [(c) => { c.bestaetigungsfrist_stunden = 10_000; }, 'confirmation_deadline_missing'],
    [(c) => { c.seiten.bestaetigung = null; }, 'confirmation_page_missing'],
    [(c) => { c.seiten.bestaetigung = 'https://fremd.invalid/x'; }, 'confirmation_page_missing'],
    [(c) => { c.quellen = []; }, 'sources_missing'],
    [(c) => { c.quellen = ['Mit Leerzeichen']; }, 'sources_missing'],
  ];
  for (const [change, gap] of cases) {
    const config = clone(FREIGEGEBEN);
    change(config);
    assert.ok(consentReadiness(config, ENV).includes(gap), gap);
  }
  assert.ok(consentReadiness(clone(FREIGEGEBEN), { NEXIFY_MAILING_CONSENT: 'on' }).includes('base_url_missing'));
  assert.deepEqual(availableLanguages(clone(FREIGEGEBEN)), ['de']);
});

test('Basisadresse: nur https und nur der Ursprung', () => {
  assert.equal(publicBaseUrl({ MAILING_PUBLIC_BASE_URL: 'https://seite.invalid/' }), 'https://seite.invalid');
  for (const bad of ['', 'http://seite.invalid', 'https://seite.invalid/pfad', 'https://nutzer:geheim@seite.invalid', 'https://seite.invalid/?a=1', 'keine adresse']) {
    assert.equal(publicBaseUrl({ MAILING_PUBLIC_BASE_URL: bad }), null, bad);
  }
});

test('Speicher oder Mailversand fehlen: 503, nichts gespeichert, nichts gesendet', async () => {
  for (const override of [{ store: null }, { mailConfigured: () => false }]) {
    const { deps, outbox, store } = setup(override);
    const { result, logs } = await quiet(() => subscribe(deps));
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: 'mailing_consent_not_ready' });
    assert.equal(outbox.length, 0);
    assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
    assert.match(logs.join('\n'), /store_not_configured|mail_not_configured/);
  }
});

test('Anmeldung: legt eine unbestätigte Zeile mit Nachweis an und sendet genau eine Bestätigungsmail', async () => {
  const { deps, outbox, store } = setup();
  const res = await subscribe(deps);
  assert.equal(res.status, 202);
  assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const record = await store.getSubscription(emailHash(ADDRESS));
  assert.equal(record.status, 'pending');
  assert.equal(record.email, ADDRESS, 'Adresse klein und ohne Rand');
  assert.equal(record.lang, 'de');
  assert.equal(record.source, 'preise/checkliste');
  assert.equal(record.consentVersion, 'test.1');
  assert.equal(record.consentTextSha256, sha256Hex(TEXT_DE), 'Prüfsumme des gezeigten Wortlauts');
  assert.equal(record.requestedAt, NOW);
  assert.equal(record.confirmedAt, null);
  assert.equal(record.confirmMailsSent, 1);
  assert.equal(outbox.length, 1);
  const mail = outbox[0];
  assert.equal(mail.to, ADDRESS);
  assert.equal(mail.subject, 'PRÜFBETREFF');
  assert.match(mail.text, /https:\/\/seite\.invalid\/anmeldung\/bestaetigen#t=[A-Za-z0-9_-]{43}/);
  assert.ok(mail.text.includes(TEXT_DE), 'Wortlaut der Einwilligung steht in der Mail');
  assert.ok(!mail.text.includes('{{') && !mail.html.includes('{{'));
  assert.match(mail.html, /<a href="https:\/\/seite\.invalid\/anmeldung\/bestaetigen#t=/);
  assert.equal(mail.headers, undefined, 'die Bestätigungsmail ist keine Kampagne');
  assert.deepEqual(store.events.map((event) => event.type), ['requested']);
  assert.equal(store.events[0].emailHash, emailHash(ADDRESS));
});

test('Anmeldung: ohne ausdrückliche Einwilligung, mit falscher Fassung, Sprache, Quelle oder Adresse wird nichts gespeichert', async () => {
  const cases = [
    [{ ...VALID, consent: 'true' }, 422, 'consent_required'],
    [{ ...VALID, consent: 1 }, 422, 'consent_required'],
    [{ ...VALID, consent: false }, 422, 'consent_required'],
    [{ ...VALID, consent: undefined }, 422, 'consent_required'],
    [{ ...VALID, consent_version: 'alt.0' }, 409, 'consent_version_mismatch'],
    [{ ...VALID, consent_version: undefined }, 409, 'consent_version_mismatch'],
    [{ ...VALID, lang: 'nl' }, 422, 'language_not_available'],
    [{ ...VALID, lang: 'xx' }, 422, 'language_not_available'],
    [{ ...VALID, source: 'unbekannt' }, 422, 'invalid_source'],
    [{ ...VALID, email: 'keine-adresse' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a@b' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'zwei@adressen.invalid, dritte@adresse.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'kopf@zeile.invalid\nBcc: fremd@adresse.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'x'.repeat(250) + '@lang.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 42 }, 422, 'invalid_email'],
  ];
  for (const [body, status, error] of cases) {
    const { deps, outbox, store } = setup();
    const res = await subscribe(deps, body);
    assert.equal(res.status, status, error);
    assert.deepEqual(await res.json(), { error });
    assert.equal(outbox.length, 0);
    assert.equal(store.events.length, 0);
  }
});

test('Anmeldung: Form der Anfrage wird geprüft (JSON, Größe, Herkunft)', async () => {
  const { deps, outbox } = setup();
  assert.equal((await handleSubscribe(new Request(BASE + '/api/mailing/subscribe', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(VALID) }), deps)).status, 415);
  assert.equal((await subscribe(deps, '{kein json')).status, 400);
  assert.equal((await subscribe(deps, '[1,2]')).status, 400);
  assert.equal((await subscribe(deps, { ...VALID, fuellung: 'x'.repeat(5000) })).status, 413);
  const fremd = await subscribe(deps, VALID, { origin: 'https://fremd.invalid' });
  assert.equal(fremd.status, 403);
  assert.deepEqual(await fremd.json(), { error: 'same_origin_required' });
  assert.equal((await subscribe(deps, VALID, { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal(outbox.length, 0);
  assert.equal((await subscribe(deps, VALID, { origin: BASE })).status, 202);
  assert.equal(outbox.length, 1);
});

test('Anmeldung: Mengenbegrenzung je Absender mit Retry-After', async () => {
  const { deps } = setup({ limiter: createRateLimiter([{ ms: 60_000, max: 2 }]) });
  const headers = { 'x-forwarded-for': '203.0.113.7' };
  assert.equal((await subscribe(deps, { ...VALID, email: 'a@eins.invalid' }, headers)).status, 202);
  assert.equal((await subscribe(deps, { ...VALID, email: 'b@zwei.invalid' }, headers)).status, 202);
  const limited = await subscribe(deps, { ...VALID, email: 'c@drei.invalid' }, headers);
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal((await subscribe(deps, { ...VALID, email: 'd@vier.invalid' }, { 'x-forwarded-for': '203.0.113.8' })).status, 202);
});

test('Bestätigung: nur per POST mit gültigem Kennzeichen; danach ist die Einwilligung belegt und das Kennzeichen verbraucht', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  const token = tokenFromMail(outbox[0]);
  state.now = NOW + HOUR;
  assert.equal((await confirm(deps, 'B'.repeat(43))).status, 404, 'fremdes Kennzeichen');
  assert.equal((await confirm(deps, 'kurz')).status, 404);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
  const res = await confirm(deps, token);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'confirmed' });
  const record = await store.getSubscription(emailHash(ADDRESS));
  assert.equal(record.status, 'confirmed');
  assert.equal(record.confirmedAt, NOW + HOUR);
  assert.equal(record.requestedAt, NOW);
  assert.equal(record.consentVersion, 'test.1');
  assert.equal((await confirm(deps, token)).status, 404, 'zweite Verwendung');
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'confirmed']);
  assert.equal((await confirm(deps, token, { origin: 'https://fremd.invalid' })).status, 403);
});

test('Bestätigung: nach Ablauf der Frist wirkungslos; die verfallene Anmeldung wird beim nächsten Aufruf gelöscht', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  const token = tokenFromMail(outbox[0]);
  state.now = NOW + 48 * HOUR + 1;
  assert.equal((await confirm(deps, token)).status, 404);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
  await subscribe(deps, { ...VALID, email: 'andere@person.invalid' });
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, 'verfallene Zeile gelöscht');
  assert.equal((await store.getSubscription(emailHash('andere@person.invalid'))).status, 'pending');
});

test('Wiederholte Anmeldung: höchstens drei Bestätigungsmails je unbestätigter Adresse, immer dieselbe Antwort', async () => {
  const { deps, outbox, store } = setup();
  for (let i = 0; i < 6; i++) {
    const res = await subscribe(deps);
    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
  }
  assert.equal(outbox.length, 3);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).confirmMailsSent, 3);
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'confirmation_resent', 'confirmation_resent']);
  // Nur das jüngste Kennzeichen gilt.
  assert.equal((await confirm(deps, tokenFromMail(outbox[0]))).status, 404);
  assert.equal((await confirm(deps, tokenFromMail(outbox[2]))).status, 200);
});

test('Bestätigte Adresse meldet sich erneut an: gleiche Antwort, keine Mail, Nachweis unverändert', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  await confirm(deps, tokenFromMail(outbox[0]));
  const before = await store.getSubscription(emailHash(ADDRESS));
  state.now = NOW + 5 * HOUR;
  const res = await subscribe(deps);
  assert.equal(res.status, 202);
  assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
  assert.equal(outbox.length, 1);
  assert.deepEqual(await store.getSubscription(emailHash(ADDRESS)), before);
});

test('Abmeldung mit einem Klick: wirkt sofort, sperrt die Adresse dauerhaft und ist wiederholbar', async () => {
  const { deps, outbox, store } = setup();
  await subscribe(deps);
  await confirm(deps, tokenFromMail(outbox[0]));
  // Kennzeichen 1 = Bestätigung, Kennzeichen 2 = Abmeldung (fortlaufend aus newToken).
  const unsubscribeToken = '2'.padStart(43, 'A');
  assert.equal((await unsubscribe(deps, 'Z'.repeat(43))).status, 404);
  assert.equal((await unsubscribe(deps, 'kurz')).status, 404);
  const res = await unsubscribe(deps, unsubscribeToken);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'unsubscribed' });
  const record = await store.getSubscription(emailHash(ADDRESS));
  assert.equal(record.status, 'unsubscribed');
  assert.equal(record.unsubscribedAt, NOW);
  assert.equal(store.suppressions.get(emailHash(ADDRESS)), 'unsubscribe');
  assert.equal(await store.isSuppressed(emailHash(ADDRESS)), true);
  assert.equal((await unsubscribe(deps, unsubscribeToken)).status, 200, 'Wiederholung');
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'confirmed', 'unsubscribed']);
  // Negativprobe: Eine abgemeldete Adresse bekommt keine Mail mehr, auch keine Bestätigungsmail.
  const again = await subscribe(deps);
  assert.equal(again.status, 202);
  assert.equal(outbox.length, 1);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'unsubscribed');
});

test('Abmeldung arbeitet ohne Schalter und ohne Freigaben; ohne Speicher 503 statt stillem Erfolg', async () => {
  const { deps, outbox, store } = setup();
  await subscribe(deps);
  const off = { ...deps, env: {}, config: MAILING_CONSENT_CONFIG };
  assert.equal((await unsubscribe(off, '2'.padStart(43, 'A'))).status, 200);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'unsubscribed');
  assert.equal(outbox.length, 1);
  assert.equal((await unsubscribe({ ...deps, store: null }, '2'.padStart(43, 'A'))).status, 503);
});

test('Sperrliste: eine gesperrte Adresse (Rückläufer, Beschwerde, Widerspruch) bekommt keine Bestätigungsmail', async () => {
  for (const reason of ['hard_bounce', 'complaint', 'objection', 'manual']) {
    const { deps, outbox, store } = setup();
    await store.addSuppression(emailHash(ADDRESS), reason, NOW);
    const res = await subscribe(deps);
    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
    assert.equal(outbox.length, 0, reason);
    assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
  }
});

test('Mailversand scheitert: ehrliche 502, die Zeile bleibt unbestätigt und ein neuer Versuch sendet erneut', async () => {
  const { deps, outbox, store, state } = setup();
  state.mailResult = { ok: false, error: 'resend_500' };
  const { result, logs } = await quiet(() => subscribe(deps));
  assert.equal(result.status, 502);
  assert.deepEqual(await result.json(), { error: 'confirmation_mail_failed' });
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
  assert.ok(!logs.join('\n').includes(ADDRESS) && !logs.join('\n').includes(emailHash(ADDRESS)));
  state.mailResult = { ok: true, id: 'mail_2' };
  assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, 2);
  assert.equal((await confirm(deps, tokenFromMail(outbox[1]))).status, 200);
});

test('Speicherfehler: 503 mit festem Code; Protokoll ohne Adresse, Prüfsumme oder Kennzeichen', async () => {
  const broken = createMemoryMailingConsentStore();
  broken.isSuppressed = async () => { throw new MailingConsentStoreError('mailing_store_timeout'); };
  broken.confirmByTokenHash = async () => { throw new Error('geheimer Datenbanktext ' + ADDRESS); };
  broken.unsubscribeByToken = async () => { throw new MailingConsentStoreError('mailing_store_failed'); };
  const { deps, outbox } = setup({ store: broken });
  const token = 'C'.repeat(43);
  const { result, logs } = await quiet(async () => [await subscribe(deps), await confirm(deps, token), await unsubscribe(deps, token)]);
  for (const res of result) {
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'storage_unavailable' });
  }
  assert.equal(outbox.length, 0);
  const text = logs.join('\n');
  assert.match(text, /"code":"mailing_store_timeout"/);
  assert.match(text, /"step":"confirm","code":"unknown"/);
  for (const secret of [ADDRESS, emailHash(ADDRESS), token, 'geheimer Datenbanktext']) assert.ok(!text.includes(secret), secret);
});

test('Verlauf scheitert: der Zustandswechsel bleibt gültig und die Antwort ehrlich', async () => {
  const { deps, outbox, store } = setup();
  store.appendEvent = async () => { throw new MailingConsentStoreError('mailing_store_failed'); };
  const { result, logs } = await quiet(() => subscribe(deps));
  assert.equal(result.status, 202);
  assert.equal(outbox.length, 1);
  assert.match(logs.join('\n'), /mailing_consent_event_failed/);
});

test('Bestätigungsmail: Wortlaut nur aus der Konfiguration, HTML maskiert', () => {
  const mail = buildConfirmationMail({ betreff: 'Betreff <b>', text: 'A & B <x>\n\n{{BESTAETIGUNGSLINK}}\nZeile\n\n{{EINWILLIGUNGSTEXT}}' }, 'Wortlaut "eins" <i>', 'https://seite.invalid/p#t=abc');
  assert.equal(mail.subject, 'Betreff <b>');
  assert.equal(mail.text, 'A & B <x>\n\nhttps://seite.invalid/p#t=abc\nZeile\n\nWortlaut "eins" <i>');
  assert.equal(mail.html, '<p>A &amp; B &lt;x&gt;</p>\n<p><a href="https://seite.invalid/p#t=abc">https://seite.invalid/p#t=abc</a><br>Zeile</p>\n<p>Wortlaut &quot;eins&quot; &lt;i&gt;</p>');
});

test('Abmelde-Kopfzeilen für den späteren Kampagnenweg (RFC 8058)', () => {
  const token = 'D'.repeat(43);
  assert.deepEqual(listUnsubscribeHeaders(BASE + '/', token), {
    'List-Unsubscribe': `<https://seite.invalid/api/mailing/unsubscribe?t=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  });
  assert.throws(() => listUnsubscribeHeaders('http://seite.invalid', token), /invalid_base_url/);
  assert.throws(() => listUnsubscribeHeaders(BASE, 'kurz'), /invalid_unsubscribe_token/);
});

test('Andere Methoden: 405 mit Allow', async () => {
  const res = mailingMethodNotAllowed();
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('allow'), 'POST');
});
