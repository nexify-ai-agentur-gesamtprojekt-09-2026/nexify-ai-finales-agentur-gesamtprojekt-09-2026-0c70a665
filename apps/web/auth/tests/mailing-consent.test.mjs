// Einwilligungsweg für Werbemails: Handler ohne Netz, gegen den Test-Speicher. Nur Dummywerte.
// Die Wortlaute in FREIGEGEBEN sind Prüfdaten dieses Tests, keine Rechtstexte und keine Vorlage.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAILING_CONSENT_CONFIG,
  availableLanguages,
  buildConfirmationMail,
  confirmationMailDigest,
  consentReadiness,
  consentTextDigest,
  emailHash,
  handleConfirm,
  handleSubscribe,
  handleUnsubscribe,
  limitsValid,
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
const TEXT_DE = 'PRÜFTEXT Einwilligung, nur für diesen Test.';
const TEXT_FR = 'PRÜFTEXT zweite Sprache, nur für diesen Test.';
const MAIL_DE = { betreff: 'PRÜFBETREFF', text: 'Prüfabsatz eins.\n\nLink: {{BESTAETIGUNGSLINK}}\n\nSperren: {{SPERRLINK}}\n\nWortlaut: {{EINWILLIGUNGSTEXT}}' };
const MAIL_FR = { betreff: 'PRÜFBETREFF ZWEI', text: 'Zweite Sprache.\n\n{{BESTAETIGUNGSLINK}}\n\n{{SPERRLINK}}' };
const FREIGABE = { durch: 'Prüfperson', am: '2026-01-01', beleg: 'Prüfbeleg des Tests' };
const GRENZEN = {
  bestaetigungsmails_je_adresse: 3, bestaetigungsmails_fenster_stunden: 168, bestaetigungsmails_je_tag: 50,
  versandversuche_je_adresse: 9, versandversuche_je_tag: 150,
  anfragen_je_minute: 3, anfragen_je_stunde: 10, anfragen_je_tag: 12, bestaetigungen_je_minute: 10, bestaetigungen_je_stunde: 60, max_body_bytes: 4096,
};
const FREIGEGEBEN = {
  einwilligung: { fassung: 'test.1', freigabe: { ...FREIGABE, sha256: { de: consentTextDigest(TEXT_DE) } }, texte: { de: TEXT_DE, nl: null, fr: null, en: null } },
  bestaetigungsmail: { freigabe: { ...FREIGABE, sha256: { de: confirmationMailDigest(MAIL_DE) } }, texte: { de: MAIL_DE, nl: null, fr: null, en: null } },
  bestaetigungsfrist_stunden: 48,
  seiten: { bestaetigung: '/anmeldung/bestaetigen', abmeldung: '/anmeldung/abmelden' },
  quellen: ['preise/checkliste', 'kontakt/formular'],
  grenzen: GRENZEN,
};
/** Dieselbe Konfiguration mit einer zweiten freigegebenen Sprache. */
function zweisprachig() {
  const config = clone(FREIGEGEBEN);
  config.einwilligung.texte.fr = TEXT_FR;
  config.einwilligung.freigabe.sha256.fr = consentTextDigest(TEXT_FR);
  config.bestaetigungsmail.texte.fr = MAIL_FR;
  config.bestaetigungsmail.freigabe.sha256.fr = confirmationMailDigest(MAIL_FR);
  return config;
}
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
    confirmLimiter: createRateLimiter([{ ms: 60_000, max: 1000 }]),
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
const tokenFromMail = (mail) => mail.text.match(/\/anmeldung\/bestaetigen#t=([A-Za-z0-9_-]{43})/)[1];
/** Das Abmeldekennzeichen, wie es der Empfänger bekommt: aus dem Sperrlink der Mail, nicht aus dem Speicher geraten. */
const blockTokenFromMail = (mail) => mail.text.match(/\/anmeldung\/abmelden#t=([A-Za-z0-9_-]{43})/)[1];
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
    [(c) => { c.einwilligung.texte.de = TEXT_DE + ' {{SPERRLINK}}'; c.einwilligung.freigabe.sha256.de = consentTextDigest(c.einwilligung.texte.de); }, 'consent_text_placeholder_unresolved'],
    [(c) => { c.einwilligung.texte.de = TEXT_DE + ' [FIRMENNAME EINSETZEN]'; c.einwilligung.freigabe.sha256.de = consentTextDigest(c.einwilligung.texte.de); }, 'consent_text_placeholder_unresolved'],
    [(c) => { c.einwilligung.texte.de = TEXT_DE + ' }}'; c.einwilligung.freigabe.sha256.de = consentTextDigest(c.einwilligung.texte.de); }, 'consent_text_placeholder_unresolved'],
    [(c) => { c.bestaetigungsmail.freigabe = null; }, 'confirmation_mail_not_approved'],
    [(c) => { c.bestaetigungsmail.texte.de = null; }, 'confirmation_mail_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.betreff = 'Zeile\nZwei'; }, 'confirmation_mail_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.text = 'ohne Link'; }, 'confirmation_mail_link_missing'],
    [(c) => { c.bestaetigungsmail.texte.de.text = 'nur {{BESTAETIGUNGSLINK}}'; }, 'confirmation_mail_block_link_missing'],
    [(c) => { c.seiten.abmeldung = null; }, 'unsubscribe_page_missing'],
    [(c) => { c.seiten.abmeldung = 'https://fremd.invalid/x'; }, 'unsubscribe_page_missing'],
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
  assert.deepEqual(consentReadiness(zweisprachig(), ENV), []);
  assert.deepEqual(availableLanguages(zweisprachig()), ['de', 'fr']);
});

test('Freigabe ist an den Wortlaut gebunden: ein nach der Freigabe geänderter Text zählt als Lücke', async () => {
  const cases = [
    [(c) => { c.einwilligung.texte.de += ' Nachträglich ergänzt.'; }, 'consent_text_approval_mismatch'],
    [(c) => { c.einwilligung.texte.de = TEXT_DE + ' '; }, 'consent_text_approval_mismatch'],
    [(c) => { delete c.einwilligung.freigabe.sha256; }, 'consent_text_approval_mismatch'],
    [(c) => { c.einwilligung.freigabe.sha256 = { de: 'kein-hash' }; }, 'consent_text_approval_mismatch'],
    [(c) => { c.einwilligung.texte.fr = TEXT_FR; }, 'consent_text_approval_mismatch'],
    [(c) => { c.bestaetigungsmail.texte.de.text += '\n\nZusatz.'; }, 'confirmation_mail_approval_mismatch'],
    [(c) => { c.bestaetigungsmail.texte.de.betreff = 'ANDERER BETREFF'; }, 'confirmation_mail_approval_mismatch'],
    [(c) => { c.bestaetigungsmail.freigabe.sha256 = null; }, 'confirmation_mail_approval_mismatch'],
    [(c) => { c.bestaetigungsmail.freigabe.sha256.de = consentTextDigest(TEXT_DE); }, 'confirmation_mail_approval_mismatch'],
  ];
  for (const [change, gap] of cases) {
    const config = clone(FREIGEGEBEN);
    change(config);
    assert.deepEqual(consentReadiness(config, ENV), [gap], gap);
    const { deps, outbox, store } = setup({ config });
    const { result } = await quiet(() => subscribe(deps));
    assert.equal(result.status, 503, gap);
    assert.equal(outbox.length, 0);
    assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
  }
  assert.equal(confirmationMailDigest({ betreff: 'a', text: 'b' }), sha256Hex('a\nb'));
  assert.notEqual(confirmationMailDigest({ betreff: 'a', text: 'b' }), confirmationMailDigest({ betreff: 'ab', text: '' }));
});

test('Grenzen: fehlende, gebrochene oder unsinnige Werte schalten keinen Schutz ab, sondern den ganzen Weg', async () => {
  assert.equal(limitsValid(clone(FREIGEGEBEN)), true);
  assert.equal(limitsValid(MAILING_CONSENT_CONFIG), true, 'ausgelieferte Grenzen sind gültig');
  const keys = Object.keys(GRENZEN);
  for (const key of keys) {
    for (const bad of [0, -1, 1.5, Number.NaN, '3', null, undefined, 1e9]) {
      const config = clone(FREIGEGEBEN);
      config.grenzen[key] = bad;
      if (bad === undefined) delete config.grenzen[key];
      assert.ok(consentReadiness(config, ENV).includes('limits_invalid'), `${key}=${String(bad)}`);
    }
  }
  // JSON kennt kein NaN; ein von Hand gebautes Objekt schon. Beides darf nicht bis zur Anmeldung durchkommen.
  const config = clone(FREIGEGEBEN);
  config.grenzen.bestaetigungsmails_je_adresse = Number.NaN;
  config.grenzen.anfragen_je_minute = Number.NaN;
  const { deps, outbox, store } = setup({ config, limiter: undefined });
  const { result, logs } = await quiet(() => subscribe(deps));
  assert.equal(result.status, 503);
  assert.match(logs.join('\n'), /limits_invalid/);
  assert.equal(outbox.length, 0);
  assert.equal(store.mails.length, 0);
  assert.equal((await quiet(() => confirm({ ...deps, confirmLimiter: undefined }, 'A'.repeat(43)))).result.status, 503);
  assert.throws(() => createRateLimiter([{ ms: 60_000, max: Number.NaN }]), /invalid_rate_window/);
  assert.throws(() => createRateLimiter([{ ms: 60_000, max: 0 }]), /invalid_rate_window/);
  assert.throws(() => createRateLimiter([]), /invalid_rate_window/);
  await assert.rejects(store.reserveConfirmationMail(emailHash(ADDRESS), NOW, { perAddress: 0, windowHours: 168, perDay: 50 }), MailingConsentStoreError);
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
  assert.equal(record.confirmExpiresAt, NOW + 48 * HOUR);
  assert.deepEqual(store.mails.map((entry) => [entry.emailHash, entry.state]), [[emailHash(ADDRESS), 'sent']]);
  assert.equal(outbox.length, 1);
  const mail = outbox[0];
  assert.equal(mail.to, ADDRESS);
  assert.equal(mail.subject, 'PRÜFBETREFF');
  assert.match(mail.text, /https:\/\/seite\.invalid\/anmeldung\/bestaetigen#t=[A-Za-z0-9_-]{43}/);
  assert.ok(mail.text.includes(TEXT_DE), 'Wortlaut der Einwilligung steht in der Mail');
  assert.ok(!mail.text.includes('{{') && !mail.html.includes('{{'));
  assert.match(mail.html, /<a href="https:\/\/seite\.invalid\/anmeldung\/bestaetigen#t=/);
  assert.match(mail.html, /<a href="https:\/\/seite\.invalid\/anmeldung\/abmelden#t=/);
  assert.notEqual(tokenFromMail(mail), blockTokenFromMail(mail), 'zwei verschiedene Kennzeichen');
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
    // Steuerzeichen (C0, DEL, C1), auch am Rand, wo sie sonst still abgeschnitten würden.
    [{ ...VALID, email: 'a\u0000b@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u0007b@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u001fb@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u007fb@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u0085b@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u009fb@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'rand@steuer.invalid\u0000' }, 422, 'invalid_email'],
    [{ ...VALID, email: '\u0007rand@steuer.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'rand@steuer.invalid\n' }, 422, 'invalid_email'],
    // Unsichtbare und umstellende Zeichen: gleiche Erscheinung, andere Prüfsumme, eigene Grenzen.
    [{ ...VALID, email: 'a\u200bb@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u202eb@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u00adb@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u2060b@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: '\ufeffa@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\u2028b@unsichtbar.invalid' }, 422, 'invalid_email'],
    [{ ...VALID, email: 'a\ue000b@unsichtbar.invalid' }, 422, 'invalid_email'],
  ];
  for (const [body, status, error] of cases) {
    const { deps, outbox, store } = setup();
    const res = await subscribe(deps, body);
    assert.equal(res.status, status, error);
    assert.deepEqual(await res.json(), { error });
    assert.equal(outbox.length, 0);
    assert.equal(store.events.length, 0);
    assert.equal(store.mails.length, 0);
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

test('Herkunft hinter einem Vorschaltdienst: maßgeblich ist x-forwarded-host, nicht der interne Host', async () => {
  const { deps, outbox } = setup();
  const intern = { host: 'intern.invalid:3000', 'x-forwarded-host': 'seite.invalid' };
  // Eigene Seite, interner Host weicht ab: erlaubt, weil der weitergereichte Host zur Herkunft passt.
  assert.equal((await subscribe(deps, VALID, { ...intern, origin: BASE })).status, 202);
  assert.equal(outbox.length, 1);
  // Fremde Seite, die den internen Host als Herkunft nennt: abgelehnt.
  assert.equal((await subscribe(deps, { ...VALID, email: 'zweite@person.invalid' }, { ...intern, origin: 'https://intern.invalid:3000' })).status, 403);
  assert.equal((await confirm(deps, tokenFromMail(outbox[0]), { ...intern, origin: 'https://intern.invalid:3000' })).status, 403);
  assert.equal((await confirm(deps, tokenFromMail(outbox[0]), { ...intern, origin: BASE })).status, 200);
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

test('Bestätigung: eigene Mengenbegrenzung je Absender, getrennt von der Anmeldung', async () => {
  // Ohne eigene Zähler: Es gelten die gemeinsamen nach `grenzen`, je Route einer.
  const config = clone(FREIGEGEBEN);
  Object.assign(config.grenzen, { anfragen_je_minute: 2, anfragen_je_stunde: 7, bestaetigungen_je_minute: 3, bestaetigungen_je_stunde: 9 });
  const { deps, outbox } = setup({ config, limiter: undefined, confirmLimiter: undefined });
  const headers = { 'x-forwarded-for': '198.51.100.23' };
  assert.equal((await subscribe(deps, VALID, headers)).status, 202);
  assert.equal((await subscribe(deps, { ...VALID, email: 'b@zwei.invalid' }, headers)).status, 202);
  assert.equal((await subscribe(deps, { ...VALID, email: 'c@drei.invalid' }, headers)).status, 429, 'Anmeldung ausgeschöpft');
  // Die ausgeschöpfte Anmeldung bremst die Bestätigung nicht.
  assert.equal((await confirm(deps, tokenFromMail(outbox[0]), headers)).status, 200);
  assert.equal((await confirm(deps, 'B'.repeat(43), headers)).status, 404);
  assert.equal((await confirm(deps, 'B'.repeat(43), headers)).status, 404);
  const limited = await confirm(deps, tokenFromMail(outbox[1]), headers);
  assert.equal(limited.status, 429, 'vierte Bestätigung in einer Minute');
  assert.deepEqual(await limited.json(), { error: 'rate_limited' });
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  assert.equal((await confirm(deps, tokenFromMail(outbox[1]), { 'x-forwarded-for': '198.51.100.24' })).status, 200, 'anderer Absender');
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
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, 'verfallene Zeile samt Adresse gelöscht, schon durch diesen Aufruf');
  await subscribe(deps, { ...VALID, email: 'andere@person.invalid' });
  assert.equal((await store.getSubscription(emailHash('andere@person.invalid'))).status, 'pending');
});

test('Wiederholte Anmeldung: höchstens drei Bestätigungsmails je Adresse, immer dieselbe Antwort, jeder Link bleibt gültig', async () => {
  const { deps, outbox, store } = setup();
  for (let i = 0; i < 6; i++) {
    const res = await subscribe(deps);
    assert.equal(res.status, 202);
    assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
  }
  assert.equal(outbox.length, 3);
  assert.equal(store.mails.filter((entry) => entry.state === 'sent').length, 3);
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'confirmation_resent', 'confirmation_resent']);
  assert.equal(new Set(outbox.map(tokenFromMail)).size, 3, 'jede Mail trägt ein eigenes Kennzeichen');
  assert.equal(new Set(outbox.map(blockTokenFromMail)).size, 1, 'der Sperrlink ist in jeder Mail derselbe');
  // Auch der erste Link gilt noch; nach der Bestätigung sind alle verbraucht.
  assert.equal((await confirm(deps, tokenFromMail(outbox[0]))).status, 200);
  assert.equal((await confirm(deps, tokenFromMail(outbox[2]))).status, 404);
});

test('Weitere Anfrage, auch durch Dritte: die offene Anmeldung bleibt unverändert und der erste Link gültig', async () => {
  const { deps, outbox, store, state } = setup({ config: zweisprachig() });
  await subscribe(deps);
  const before = await store.getSubscription(emailHash(ADDRESS));
  const first = tokenFromMail(outbox[0]);
  state.now = NOW + 5 * HOUR;
  // Ein Dritter fragt dieselbe Adresse mit anderer Sprache und anderer Quelle an.
  const res = await subscribe(deps, { ...VALID, lang: 'fr', source: 'kontakt/formular' });
  assert.equal(res.status, 202);
  assert.deepEqual(await store.getSubscription(emailHash(ADDRESS)), before, 'Sprache, Quelle, Zeitpunkt, Fassung und Frist bleiben die der ersten Anfrage');
  assert.equal(outbox.length, 2);
  assert.equal(outbox[1].subject, 'PRÜFBETREFF', 'die weitere Mail kommt in der Sprache der ersten Anfrage');
  assert.ok(outbox[1].text.includes(TEXT_DE));
  assert.equal(store.events[1].type, 'confirmation_resent');
  assert.equal(store.events[1].source, 'preise/checkliste');
  // Der Berechtigte bestätigt mit seinem ursprünglichen Link.
  state.now = NOW + 6 * HOUR;
  assert.equal((await confirm(deps, first)).status, 200);
  const record = await store.getSubscription(emailHash(ADDRESS));
  assert.deepEqual([record.status, record.lang, record.source, record.requestedAt, record.confirmedAt], ['confirmed', 'de', 'preise/checkliste', NOW, NOW + 6 * HOUR]);
  assert.equal((await confirm(deps, tokenFromMail(outbox[1]))).status, 404, 'der zweite Link ist mit der Bestätigung verbraucht');
});

test('Offene Anmeldung zu einem inzwischen geänderten Wortlaut: keine weitere Mail, nichts wird umgeschrieben', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  const before = await store.getSubscription(emailHash(ADDRESS));
  const config = clone(FREIGEGEBEN);
  config.einwilligung.fassung = 'test.2';
  config.einwilligung.texte.de = TEXT_DE + ' Neue Fassung.';
  config.einwilligung.freigabe.sha256.de = consentTextDigest(config.einwilligung.texte.de);
  assert.deepEqual(consentReadiness(config, ENV), []);
  const res = await subscribe({ ...deps, config }, { ...VALID, consent_version: 'test.2' });
  assert.equal(res.status, 202);
  assert.equal(outbox.length, 1);
  assert.deepEqual(await store.getSubscription(emailHash(ADDRESS)), before);
  assert.equal(store.mails.length, 1, 'kein Platz der Zählung verbraucht');
  // Auch eine neue Fassung bei gleichem Wortlaut gilt als anderer Stand: Die offene Anmeldung nennt die alte Fassung.
  const renamed = clone(FREIGEGEBEN);
  renamed.einwilligung.fassung = 'test.3';
  assert.equal((await subscribe({ ...deps, config: renamed }, { ...VALID, consent_version: 'test.3' })).status, 202);
  assert.equal(outbox.length, 1);
  assert.equal(store.mails.length, 1);
  // Nach dem Verfall entsteht die Anmeldung neu, mit der neuen Fassung.
  state.now = NOW + 49 * HOUR;
  assert.equal((await subscribe({ ...deps, config: renamed }, { ...VALID, consent_version: 'test.3' })).status, 202);
  assert.equal(outbox.length, 2);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).consentVersion, 'test.3');
});

test('Grenze je Adresse überlebt den Verfall der Anmeldung und gilt über das Zeitfenster', async () => {
  const { deps, outbox, store, state } = setup();
  // Vier Runden: anfragen, verfallen lassen, erneut anfragen. Früher begann die Zählung nach jedem Verfall neu.
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 5; i++) assert.equal((await subscribe(deps)).status, 202);
    state.now += 49 * HOUR;
  }
  assert.equal(outbox.length, 3, 'drei Mails in 168 Stunden, nicht drei je Anmeldung');
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, 'die Anmeldung ist verfallen; die Zählung nicht');
  // Eine andere Adresse ist davon nicht betroffen.
  assert.equal((await subscribe(deps, { ...VALID, email: 'andere@person.invalid' })).status, 202);
  assert.equal(outbox.length, 4);
  // Nach Ablauf des Fensters ist wieder Platz, und die alten Einträge der Zählung werden gelöscht.
  state.now = NOW + 169 * HOUR + 3 * 49 * HOUR;
  assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, 5);
  assert.ok(store.mails.every((entry) => entry.reservedAt >= state.now - 168 * HOUR), 'abgelaufene Einträge aufgeräumt');
});

test('Tagesgrenze: insgesamt höchstens so viele Bestätigungsmails in 24 Stunden, mit Meldung im Protokoll', async () => {
  const config = clone(FREIGEGEBEN);
  Object.assign(config.grenzen, { bestaetigungsmails_je_tag: 4, anfragen_je_tag: 1 });
  const { deps, outbox, store, state } = setup({ config });
  const { logs } = await quiet(async () => {
    for (let i = 0; i < 7; i++) {
      const res = await subscribe(deps, { ...VALID, email: `person${i}@tagesgrenze.invalid` });
      assert.equal(res.status, 202);
      assert.deepEqual(await res.json(), { status: 'confirmation_pending' });
    }
  });
  assert.equal(outbox.length, 4);
  assert.equal(await store.getSubscription(emailHash('person5@tagesgrenze.invalid')), null, 'über der Grenze entsteht auch keine Zeile');
  assert.match(logs.join('\n'), /"event":"mailing_consent_daily_limit_reached"/);
  assert.ok(!logs.join('\n').includes('tagesgrenze.invalid'));
  state.now = NOW + 24 * HOUR + 1;
  assert.equal((await subscribe(deps, { ...VALID, email: 'person6@tagesgrenze.invalid' })).status, 202);
  assert.equal(outbox.length, 5);
});

test('Gleichzeitige Anmeldungen: nie mehr Mails als die Grenzen erlauben, genau eine Zeile je Adresse', async () => {
  const config = clone(FREIGEGEBEN);
  Object.assign(config.grenzen, { bestaetigungsmails_je_tag: 5, anfragen_je_tag: 1 });
  const { deps, outbox, store } = setup({ config });
  // Der Versand dauert, damit sich die Aufrufe tatsächlich überlappen.
  deps.sendMail = async (mail) => { await new Promise((resolve) => setTimeout(resolve, 5)); outbox.push(mail); return { ok: true }; };
  const same = await Promise.all(Array.from({ length: 12 }, () => subscribe(deps)));
  assert.ok(same.every((res) => res.status === 202));
  const own = () => outbox.filter((mail) => mail.to === ADDRESS);
  assert.ok(own().length >= 1 && own().length <= 3, `gleichzeitig: ${own().length} Mails`);
  for (let i = 0; i < 4; i++) await subscribe(deps);
  assert.equal(own().length, 3, 'auch mit Nachzüglern genau die Grenze je Adresse');
  assert.equal(new Set(own().map(blockTokenFromMail)).size, 1, 'eine Zeile, ein Sperrlink');
  // Viele verschiedene Adressen zugleich: die Tagesgrenze hält.
  await quiet(() => Promise.all(Array.from({ length: 10 }, (_, i) => subscribe(deps, { ...VALID, email: `p${i}@zugleich.invalid` }))));
  assert.equal(outbox.length, 5);
  assert.equal(store.mails.filter((entry) => entry.state !== 'failed').length, 5);
  // Gleichzeitige Bestätigungen mit demselben Kennzeichen: genau eine gewinnt.
  const token = tokenFromMail(own()[0]);
  const confirms = await Promise.all(Array.from({ length: 5 }, () => confirm(deps, token)));
  assert.deepEqual(confirms.map((res) => res.status).sort(), [200, 404, 404, 404, 404]);
  assert.deepEqual(store.events.filter((event) => event.type === 'confirmed').length, 1);
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
  const unsubscribeToken = blockTokenFromMail(outbox[0]);
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
  const blockToken = blockTokenFromMail(outbox[0]);
  assert.equal((await unsubscribe(off, blockToken)).status, 200);
  assert.equal(await store.isSuppressed(emailHash(ADDRESS)), true);
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, 'nie bestätigt: die Zeile ist gelöscht, die Sperre steht');
  assert.equal(outbox.length, 1);
  assert.equal((await unsubscribe({ ...deps, store: null }, blockToken)).status, 503);
});

test('Sperrlink: wer eine von Dritten ausgelöste Bestätigungsmail bekommt, sperrt seine Adresse aus der Mail heraus', async () => {
  const { deps, outbox, store, state } = setup();
  // Ein Dritter trägt die Adresse ein. Der Empfänger hat nur die Mail.
  await subscribe(deps);
  const mail = outbox[0];
  assert.match(mail.text, /Sperren: https:\/\/seite\.invalid\/anmeldung\/abmelden#t=[A-Za-z0-9_-]{43}\n/);
  const blockToken = blockTokenFromMail(mail);
  assert.ok(mail.html.includes(`<a href="https://seite.invalid/anmeldung/abmelden#t=${blockToken}">`));
  // Die Abmeldeseite sendet das Kennzeichen an die Abmelderoute.
  state.now = NOW + HOUR;
  const res = await unsubscribe(deps, blockToken);
  assert.equal(res.status, 200);
  assert.equal(store.suppressions.get(emailHash(ADDRESS)), 'unsubscribe');
  // Wer nie eingewilligt hat, bleibt nicht im Klartext gespeichert: Für die Sperre genügt die Prüfsumme.
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'unsubscribed']);
  assert.equal((await unsubscribe(deps, blockToken)).status, 200, 'Wiederholung');
  assert.deepEqual(store.events.map((event) => event.type), ['requested', 'unsubscribed'], 'die Wiederholung schreibt keinen zweiten Eintrag');
  // Danach: der Bestätigungslink ist wirkungslos, und kein Dritter löst je wieder eine Mail an diese Adresse aus.
  assert.equal((await confirm(deps, tokenFromMail(mail))).status, 404);
  state.now = NOW + 400 * HOUR;
  for (let i = 0; i < 3; i++) assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, 1);
});

test('Sperrlink überlebt den Verfall der Anmeldung: auch wer die Mail nach der Frist liest, kann seine Adresse sperren', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  const blockToken = blockTokenFromMail(outbox[0]);
  // Die Frist (48 Stunden) läuft ab, und die Anmeldung eines anderen räumt die verfallene Zeile ab.
  state.now = NOW + 49 * HOUR;
  await subscribe(deps, { ...VALID, email: 'fremd@person.invalid' });
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, 'die Anmeldung ist verfallen und gelöscht');
  // Der Sperrlink der alten Mail wirkt trotzdem.
  const res = await unsubscribe(deps, blockToken);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'unsubscribed' });
  assert.equal(await store.isSuppressed(emailHash(ADDRESS)), true);
  const before = outbox.length;
  for (let i = 0; i < 3; i++) assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, before, 'kein Dritter löst wieder eine Mail an diese Adresse aus');
  assert.equal(await store.getSubscription(emailHash(ADDRESS)), null);
  // Ohne Sperre: Eine neue Anmeldung nach dem Verfall trägt denselben Sperrlink wie die erste Mail.
  const other = setup();
  await subscribe(other.deps);
  other.state.now = NOW + 49 * HOUR;
  await subscribe(other.deps);
  assert.equal(other.outbox.length, 2);
  assert.equal(blockTokenFromMail(other.outbox[1]), blockTokenFromMail(other.outbox[0]), 'ein Kennzeichen je Adresse, über jeden Verfall hinweg');
  assert.notEqual(tokenFromMail(other.outbox[1]), tokenFromMail(other.outbox[0]));
  assert.equal((await unsubscribe(other.deps, blockTokenFromMail(other.outbox[0]))).status, 200);
  assert.equal(await other.store.getSubscription(emailHash(ADDRESS)), null);
});

test('Abmeldung einer bestätigten Adresse: der Nachweis der Einwilligung bleibt, die Zeile wird abgemeldet statt gelöscht', async () => {
  const { deps, outbox, store, state } = setup();
  await subscribe(deps);
  state.now = NOW + HOUR;
  await confirm(deps, tokenFromMail(outbox[0]));
  state.now = NOW + 2 * HOUR;
  assert.equal((await unsubscribe(deps, blockTokenFromMail(outbox[0]))).status, 200);
  const record = await store.getSubscription(emailHash(ADDRESS));
  assert.deepEqual([record.status, record.email, record.confirmedAt, record.unsubscribedAt], ['unsubscribed', ADDRESS, NOW + HOUR, NOW + 2 * HOUR]);
});

test('Aufräumen hängt nicht am Schalter: auch bei ausgeschalteter Anmeldung verschwinden verfallene Adressen', async () => {
  for (const route of ['subscribe', 'confirm', 'unsubscribe']) {
    const { deps, store, state } = setup();
    await subscribe(deps);
    state.now = NOW + 49 * HOUR;
    // Rückweg laut Betriebsnotiz: Schalter gelöscht, Freigaben fehlen.
    const off = { ...deps, env: {}, config: MAILING_CONSENT_CONFIG };
    const res = route === 'subscribe' ? await subscribe(off) : route === 'confirm' ? await confirm(off, 'A'.repeat(43)) : await unsubscribe(off, 'A'.repeat(43));
    assert.equal(res.status, route === 'unsubscribe' ? 404 : 503, route);
    if (route === 'confirm') {
      // Die Bestätigung räumt erst hinter ihrer Mengenbegrenzung auf; bei ausgeschaltetem Schalter erreicht sie die nicht.
      assert.notEqual(await store.getSubscription(emailHash(ADDRESS)), null);
      continue;
    }
    assert.equal(await store.getSubscription(emailHash(ADDRESS)), null, `${route}: verfallene Zeile gelöscht, obwohl der Schalter aus ist`);
  }
  // Höchstens ein Aufräumlauf je Minute und Speicher, damit ein Aufrufer die Datenbank damit nicht belasten kann.
  const { deps, store, state } = setup();
  let purges = 0;
  const real = store.purgeExpiredPending.bind(store);
  store.purgeExpiredPending = async (now) => { purges += 1; return real(now); };
  for (let i = 0; i < 5; i++) await unsubscribe(deps, 'A'.repeat(43));
  assert.equal(purges, 1);
  state.now = NOW + 61_000;
  await unsubscribe(deps, 'A'.repeat(43));
  assert.equal(purges, 2);
  // Ein Fehler beim Aufräumen bricht keine Anfrage ab.
  store.purgeExpiredPending = async () => { throw new MailingConsentStoreError('mailing_store_timeout'); };
  state.now = NOW + 200_000;
  const { result, logs } = await quiet(() => subscribe(deps));
  assert.equal(result.status, 202);
  assert.match(logs.join('\n'), /"event":"mailing_consent_cleanup_failed","step":"purge_expired_pending"/);
});

test('Ein einzelner Absender kann die Tagesgrenze nicht ausschöpfen: Grenze je Absender und Tag, an die Tagesgrenze gebunden', async () => {
  // Die ausgelieferten Werte halten die Regel ein; ein Viertel der Tagesgrenze ist das Höchste für einen Absender.
  const shipped = MAILING_CONSENT_CONFIG.grenzen;
  assert.ok(shipped.anfragen_je_tag * 4 <= shipped.bestaetigungsmails_je_tag, 'ausgelieferte Grenzen');
  const loose = clone(FREIGEGEBEN);
  loose.grenzen.anfragen_je_tag = 13;
  assert.deepEqual(consentReadiness(loose, ENV), ['limits_invalid'], '13 × 4 > 50');
  const missing = clone(FREIGEGEBEN);
  delete missing.grenzen.anfragen_je_tag;
  assert.deepEqual(consentReadiness(missing, ENV), ['limits_invalid']);
  // Ein Absender, je Aufruf eine neue Adresse, über 24 Stunden so schnell die Bremse es zulässt (echter Begrenzer, Werte der Konfiguration).
  const config = clone(FREIGEGEBEN);
  Object.assign(config.grenzen, shipped);
  const { deps, outbox, state } = setup({ config, limiter: undefined });
  const attacker = { 'x-forwarded-for': '203.0.113.200' };
  let limited = 0;
  for (let minute = 0; minute < 24 * 60; minute += 2) {
    state.now = NOW + minute * 60_000;
    const res = await subscribe(deps, { ...VALID, email: `ziel${minute}@beispiel.invalid` }, attacker);
    if (res.status === 429) limited += 1;
  }
  assert.equal(outbox.length, shipped.anfragen_je_tag, 'nicht mehr Mails, als ein Absender je Tag anfragen darf');
  assert.ok(outbox.length * 4 <= shipped.bestaetigungsmails_je_tag);
  assert.ok(limited > 600);
  // Eine echte Anmeldung von einem anderen Absender bekommt danach ihre Mail.
  state.now = NOW + 24 * HOUR - 60_000;
  const before = outbox.length;
  assert.equal((await subscribe(deps, VALID, { 'x-forwarded-for': '198.51.100.77' })).status, 202);
  assert.equal(outbox.length, before + 1);
  assert.equal(outbox.at(-1).to, ADDRESS);
});

test('Versandversuche sind begrenzt: ein gestörter Versanddienst wird nicht endlos bestürmt', async () => {
  const { deps, outbox, store, state } = setup();
  state.mailResult = { ok: false, error: 'resend_500' };
  const { result } = await quiet(async () => {
    const statuses = [];
    for (let i = 0; i < 14; i++) statuses.push((await subscribe(deps)).status);
    return statuses;
  });
  // Neun Versuche je Adresse im Fenster gehen an den Versand, danach antwortet die Anmeldung wie bei jeder erreichten Grenze.
  assert.deepEqual(result, [...Array(9).fill(502), ...Array(5).fill(202)]);
  assert.equal(outbox.length, 9);
  assert.equal(store.mails.length, 9);
  // Auch wenn der Versand wieder geht: Die Versuche der Adresse sind für dieses Fenster verbraucht.
  state.mailResult = { ok: true };
  assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, 9);
  // Insgesamt je Tag: bei gestörtem Versand über viele Adressen.
  const config = clone(FREIGEGEBEN);
  Object.assign(config.grenzen, { versandversuche_je_tag: 50, bestaetigungsmails_je_tag: 50 });
  const day = setup({ config });
  day.state.mailResult = { ok: false };
  await quiet(async () => { for (let i = 0; i < 60; i++) await subscribe(day.deps, { ...VALID, email: `v${i}@beispiel.invalid` }); });
  assert.equal(day.outbox.length, 50);
  // Versuche schließen gelungene Mails ein; eine Grenze darunter wäre widersprüchlich.
  const low = clone(FREIGEGEBEN);
  low.grenzen.versandversuche_je_adresse = 2;
  assert.deepEqual(consentReadiness(low, ENV), ['limits_invalid']);
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
    assert.equal(store.mails.length, 0);
  }
});

test('Bestätigung: eine inzwischen gesperrte Adresse wird nicht zur Einwilligung, auch mit gültigem Kennzeichen', async () => {
  for (const reason of ['hard_bounce', 'complaint', 'objection', 'manual']) {
    const { deps, outbox, store } = setup();
    await subscribe(deps);
    await store.addSuppression(emailHash(ADDRESS), reason, NOW);
    const res = await confirm(deps, tokenFromMail(outbox[0]));
    assert.equal(res.status, 404, reason);
    assert.deepEqual(await res.json(), { error: 'token_invalid_or_expired' });
    const record = await store.getSubscription(emailHash(ADDRESS));
    assert.deepEqual([record.status, record.confirmedAt], ['pending', null]);
    assert.deepEqual(store.events.map((event) => event.type), ['requested']);
  }
  // Prüft der Aufrufer nicht (Lücke zwischen Prüfung und Wechsel), verweigert der Speicher wie die Datenbank selbst.
  const { deps, outbox, store } = setup();
  await subscribe(deps);
  const seen = [];
  const real = store.isSuppressed.bind(store);
  store.isSuppressed = async (hash) => { seen.push(hash); const answer = await real(hash); await store.addSuppression(hash, 'complaint', NOW); return answer; };
  const { result } = await quiet(() => confirm(deps, tokenFromMail(outbox[0])));
  assert.equal(result.status, 503);
  assert.equal(seen.length, 1);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
});

test('Anmeldung: wird die Adresse zwischen Sperrprüfung und Versand gesperrt, geht keine Mail hinaus', async () => {
  const { deps, outbox, store } = setup();
  let calls = 0;
  const real = store.isSuppressed.bind(store);
  // Die erste Prüfung sieht "frei"; unmittelbar danach trägt sich die Sperre ein (zum Beispiel durch den Sperrlink).
  store.isSuppressed = async (hash) => { calls += 1; const answer = await real(hash); if (calls === 1) await store.addSuppression(hash, 'objection', NOW); return answer; };
  const res = await subscribe(deps);
  assert.equal(res.status, 202);
  assert.equal(calls, 2, 'zweite Prüfung unmittelbar vor dem Versand');
  assert.equal(outbox.length, 0);
  assert.deepEqual(store.mails.map((entry) => entry.state), ['failed'], 'der Platz in der Zählung ist wieder frei');
});

test('Bestätigung prüft dieselben Freigaben wie die Anmeldung: ohne sie 503, nichts wird bestätigt', async () => {
  const { deps, outbox, store } = setup();
  await subscribe(deps);
  const token = tokenFromMail(outbox[0]);
  const withdrawn = clone(FREIGEGEBEN);
  withdrawn.einwilligung.freigabe = null;
  const changed = clone(FREIGEGEBEN);
  changed.einwilligung.texte.de += ' geändert';
  for (const config of [MAILING_CONSENT_CONFIG, withdrawn, changed]) {
    if (consentReadiness(config, ENV).length === 0) continue; // Liegen die Freigaben des Inhabers später vor, prüft dieser Fall nichts Falsches.
    const { result, logs } = await quiet(() => confirm({ ...deps, config }, token));
    assert.equal(result.status, 503);
    assert.deepEqual(await result.json(), { error: 'mailing_consent_not_ready' });
    assert.match(logs.join('\n'), /mailing_consent_not_ready/);
    assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
  }
  assert.equal((await quiet(() => confirm({ ...deps, store: null }, token))).result.status, 503);
  assert.equal((await confirm(deps, token)).status, 200, 'mit Freigaben wirkt dasselbe Kennzeichen');
});

test('Mailversand scheitert: ehrliche 502, verbraucht keine Mail der Grenze, ein neuer Versuch sendet erneut', async () => {
  const { deps, outbox, store, state } = setup();
  state.mailResult = { ok: false, error: 'resend_500' };
  const { result, logs } = await quiet(async () => {
    const responses = [];
    for (let i = 0; i < 5; i++) responses.push(await subscribe(deps));
    return responses;
  });
  for (const res of result) {
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { error: 'confirmation_mail_failed' });
  }
  assert.equal(outbox.length, 5, 'jeder Versuch wurde dem Versand übergeben; früher endete das nach drei Fehlschlägen still mit 202');
  assert.deepEqual(store.mails.map((entry) => entry.state), ['failed', 'failed', 'failed', 'failed', 'failed']);
  assert.equal((await store.getSubscription(emailHash(ADDRESS))).status, 'pending');
  assert.ok(!logs.join('\n').includes(ADDRESS) && !logs.join('\n').includes(emailHash(ADDRESS)));
  // Der Versand geht wieder: Die Grenze je Adresse steht noch vollständig zur Verfügung.
  state.mailResult = { ok: true, id: 'mail_2' };
  for (let i = 0; i < 5; i++) assert.equal((await subscribe(deps)).status, 202);
  assert.equal(outbox.length, 8, 'drei zugestellte Mails nach fünf Fehlschlägen');
  assert.equal(store.mails.filter((entry) => entry.state === 'sent').length, 3);
  assert.equal((await confirm(deps, tokenFromMail(outbox[5]))).status, 200);
  // Ein Kennzeichen aus einer gescheiterten Mail (niemand hat es erhalten) wurde zurückgenommen.
  const other = setup();
  await subscribe(other.deps);
  other.state.mailResult = { ok: false };
  await quiet(() => subscribe(other.deps));
  other.state.mailResult = { ok: true };
  assert.equal((await confirm(other.deps, tokenFromMail(other.outbox[1]))).status, 404);
  assert.equal((await confirm(other.deps, tokenFromMail(other.outbox[0]))).status, 200);
});

test('Mailversand wirft: wie ein Fehlschlag behandelt, kein hängender Platz in der Zählung', async () => {
  const { deps, store } = setup({ sendMail: async () => { throw new Error('Netz weg'); } });
  const { result } = await quiet(() => subscribe(deps));
  assert.equal(result.status, 502);
  assert.deepEqual(store.mails.map((entry) => entry.state), ['failed']);
});

test('Speicherfehler: 503 mit festem Code; Protokoll ohne Adresse, Prüfsumme oder Kennzeichen', async () => {
  const broken = createMemoryMailingConsentStore();
  broken.isSuppressed = async () => { throw new MailingConsentStoreError('mailing_store_timeout'); };
  broken.findPendingByTokenHash = async () => { throw new Error('geheimer Datenbanktext ' + ADDRESS); };
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

test('Bestätigungsmail: Wortlaut nur aus der Konfiguration, HTML maskiert, auch in den Links', () => {
  const mail = buildConfirmationMail(
    { betreff: 'Betreff <b>', text: 'A & B <x>\n\n{{BESTAETIGUNGSLINK}}\nZeile\n\n{{SPERRLINK}}\n\n{{EINWILLIGUNGSTEXT}}' },
    'Wortlaut "eins" <i>',
    'https://seite.invalid/p#t=abc',
    'https://seite.invalid/s#t=xyz',
  );
  assert.equal(mail.subject, 'Betreff <b>');
  assert.equal(mail.text, 'A & B <x>\n\nhttps://seite.invalid/p#t=abc\nZeile\n\nhttps://seite.invalid/s#t=xyz\n\nWortlaut "eins" <i>');
  assert.equal(
    mail.html,
    '<p>A &amp; B &lt;x&gt;</p>\n<p><a href="https://seite.invalid/p#t=abc">https://seite.invalid/p#t=abc</a><br>Zeile</p>\n<p><a href="https://seite.invalid/s#t=xyz">https://seite.invalid/s#t=xyz</a></p>\n<p>Wortlaut &quot;eins&quot; &lt;i&gt;</p>',
  );
  // Ein Link mit Zeichen, die im HTML eine Bedeutung haben, darf weder das Attribut noch das Element verlassen.
  const hostile = buildConfirmationMail({ betreff: 'B', text: '{{BESTAETIGUNGSLINK}}\n\n{{SPERRLINK}}' }, '', 'https://seite.invalid/p?a=1&b="><script>x</script>', 'https://seite.invalid/s?c=<i>&d="');
  assert.ok(!hostile.html.includes('<script>') && !hostile.html.includes('<i>') && !hostile.html.includes('"><'), hostile.html);
  assert.equal(
    hostile.html,
    '<p><a href="https://seite.invalid/p?a=1&amp;b=&quot;&gt;&lt;script&gt;x&lt;/script&gt;">https://seite.invalid/p?a=1&amp;b=&quot;&gt;&lt;script&gt;x&lt;/script&gt;</a></p>\n<p><a href="https://seite.invalid/s?c=&lt;i&gt;&amp;d=&quot;">https://seite.invalid/s?c=&lt;i&gt;&amp;d=&quot;</a></p>',
  );
  // Ein eingesetzter Wert wird nicht noch einmal nach Platzhaltern durchsucht.
  const nested = buildConfirmationMail({ betreff: 'B {{SPERRLINK}}', text: '{{EINWILLIGUNGSTEXT}} / {{BESTAETIGUNGSLINK}}' }, 'Text mit {{SPERRLINK}}', 'https://seite.invalid/p', 'https://seite.invalid/s');
  assert.equal(nested.text, 'Text mit {{SPERRLINK}} / https://seite.invalid/p');
  assert.equal(nested.subject, 'B', 'im Betreff steht kein Link');
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
