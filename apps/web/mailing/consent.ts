/**
 * Einwilligungsweg für Werbemails: Anmeldung mit Bestätigungsmail (Double-Opt-in), Bestätigung, Abmeldung.
 * Reine Handler ohne Next-Abhängigkeit; die Routen unter app/api/mailing/ rufen nur diese Funktionen auf.
 *
 * Standard AUS. Die Anmeldung arbeitet nur, wenn ALLES zugleich vorliegt:
 *  - Schalter NEXIFY_MAILING_CONSENT=on
 *  - vom Inhaber freigegebener Einwilligungstext und freigegebene Bestätigungsmail samt Fassung, Frist, Seiten
 *    und Quellen in config/integrations/mailing-consent.json (heute alles `null`); jede Freigabe nennt die
 *    SHA-256 des freigegebenen Wortlauts je Sprache, ein später geänderter Text gilt als nicht freigegeben
 *  - dauerhafter Speicher (Supabase, Schema "mailing"), Mailversand (Resend) und MAILING_PUBLIC_BASE_URL
 * Fehlt etwas, antwortet sie mit 503 und versendet nichts. Dieselben Freigaben prüft die Bestätigung.
 * Dieser Code enthält keinen Rechtstext.
 *
 * Die Abmeldung hängt bewusst NICHT am Schalter: Wer einmal eine Mail bekommen hat, muss sich auch dann
 * abmelden können, wenn die Anmeldung später wieder abgeschaltet wird. Sie braucht nur den Speicher.
 *
 * Nichts Personenbezogenes gelangt ins Protokoll: keine Adresse, keine Prüfsumme, kein Kennzeichen.
 *
 * Ablageort: apps/web/mailing/ statt apps/web/lib/. Das ist reiner Servercode ohne Einfluss auf gerenderten Text;
 * apps/web/lib ist als Verzeichnis an den Text-Resize-Beleg gebunden (config/text-resize-sources.json), und jede
 * neue Datei dort macht einen Browser-Beleg ungültig, der mit diesem Code nichts zu tun hat.
 * Register: OA-003, OA-098. Betrieb: docs/04-betrieb/einwilligungsweg-2026-11-14.md.
 */
import { createHash, randomBytes } from 'node:crypto';
import rawConfig from '../../../config/integrations/mailing-consent.json' with { type: 'json' };
import { clientKey } from '../lib/chat-rate-limit.ts';
import { createRateLimiter, type RateLimiter } from './rate-limit.ts';
import { mailingConfigured, sendMail, type MailInput, type MailResult } from '../lib/mailing.ts';
import {
  getMailingConsentStore,
  MailingConsentStoreError,
  mailLimitsValid,
  type ConsentEventType,
  type MailLimits,
  type MailReservation,
  type MailingConsentStore,
  type MailingLang,
} from './consent-store.ts';

export type MailingEnv = Record<string, string | undefined>;
/**
 * Freigabe des Inhabers. `sha256` bindet sie an den Wortlaut: je Sprache die SHA-256 des freigegebenen Texts
 * (`consentTextDigest`, `confirmationMailDigest`). Weicht der Text in der Konfiguration davon ab, zählt er als nicht freigegeben.
 */
export type Approval = { durch: string; am: string; beleg: string; sha256?: Partial<Record<MailingLang, string | null>> | null };
export type ConfirmationMailText = { betreff: string; text: string };
export type MailingConsentLimits = {
  bestaetigungsmails_je_adresse: number;
  bestaetigungsmails_fenster_stunden: number;
  bestaetigungsmails_je_tag: number;
  anfragen_je_minute: number;
  anfragen_je_stunde: number;
  bestaetigungen_je_minute: number;
  bestaetigungen_je_stunde: number;
  max_body_bytes: number;
};

export type MailingConsentConfig = {
  einwilligung: { fassung: string | null; freigabe: Approval | null; texte: Record<MailingLang, string | null> };
  bestaetigungsmail: { freigabe: Approval | null; texte: Record<MailingLang, ConfirmationMailText | null> };
  bestaetigungsfrist_stunden: number | null;
  seiten: { bestaetigung: string | null; abmeldung: string | null };
  quellen: string[];
  grenzen: MailingConsentLimits;
};

export const MAILING_CONSENT_CONFIG = rawConfig as unknown as MailingConsentConfig;

export const LINK_PLACEHOLDER = '{{BESTAETIGUNGSLINK}}';
/** Link, mit dem der Empfänger seine Adresse sperrt, ohne zu bestätigen (für Mails, die ein Dritter ausgelöst hat). */
export const BLOCK_LINK_PLACEHOLDER = '{{SPERRLINK}}';
export const CONSENT_PLACEHOLDER = '{{EINWILLIGUNGSTEXT}}';
const PLACEHOLDERS = /\{\{(BESTAETIGUNGSLINK|SPERRLINK|EINWILLIGUNGSTEXT)\}\}/g;

const LANGS: readonly MailingLang[] = ['de', 'nl', 'fr', 'en'];
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const SOURCE = /^[a-z0-9/_-]{1,64}$/;
const PAGE = /^\/[a-z0-9/_-]{1,128}$/;
const VERSION = /^[A-Za-z0-9._-]{1,64}$/;
const EMAIL = /^[^\s@<>"',;:\\()[\]]+@[^\s@<>"',;:\\()[\]]+\.[^\s@<>"',;:\\()[\]]{2,}$/;
/** Steuerzeichen (C0, DEL, C1). In einer Adresse haben sie nichts zu suchen; `\s` erfasst nur einen Teil davon. */
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const MAX_DEADLINE_HOURS = 14 * 24;

/** Standard AUS: nur der exakte Wert "on" (Muster lib/composio.ts). */
export function mailingConsentEnabled(env: MailingEnv = process.env): boolean {
  return env.NEXIFY_MAILING_CONSENT === 'on';
}

export type ReadinessGap =
  | 'consent_version_missing'
  | 'consent_text_not_approved'
  | 'consent_text_missing'
  | 'consent_text_approval_mismatch'
  | 'confirmation_mail_not_approved'
  | 'confirmation_mail_missing'
  | 'confirmation_mail_approval_mismatch'
  | 'confirmation_mail_link_missing'
  | 'confirmation_mail_block_link_missing'
  | 'confirmation_mail_placeholder_unresolved'
  | 'confirmation_deadline_missing'
  | 'confirmation_page_missing'
  | 'unsubscribe_page_missing'
  | 'sources_missing'
  | 'limits_invalid'
  | 'base_url_missing'
  | 'store_not_configured'
  | 'mail_not_configured';

function approved(value: Approval | null): value is Approval {
  return Boolean(value && typeof value.durch === 'string' && value.durch.trim() && /^\d{4}-\d{2}-\d{2}$/.test(String(value.am)) && typeof value.beleg === 'string' && value.beleg.trim());
}
function filled(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function mailText(value: ConfirmationMailText | null): value is ConfirmationMailText {
  return Boolean(value && filled(value.betreff) && filled(value.text) && !/[\r\n]/.test(value.betreff));
}

/** Öffentliche Basisadresse der Website für Links in Mails. Nur https, nur Ursprung, kein Pfad. */
export function publicBaseUrl(env: MailingEnv = process.env): string | null {
  const raw = (env.MAILING_PUBLIC_BASE_URL ?? '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const sha256Hex = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
/** Prüfsumme, an die eine Freigabe des Einwilligungstexts gebunden wird: SHA-256 des Texts, UTF-8, Zeichen für Zeichen. */
export const consentTextDigest = (text: string): string => sha256Hex(text);
/** Prüfsumme, an die eine Freigabe der Bestätigungsmail gebunden wird: SHA-256 von Betreff, Zeilenumbruch, Text. */
export const confirmationMailDigest = (mail: ConfirmationMailText): string => sha256Hex(mail.betreff + '\n' + mail.text);

/** Gilt die Freigabe für genau diesen Wortlaut? Ohne eingetragene, passende Prüfsumme nicht. */
function approvalCovers(approval: Approval | null, lang: MailingLang, digest: string): boolean {
  const pinned = approval?.sha256?.[lang];
  return typeof pinned === 'string' && HEX64.test(pinned) && pinned === digest;
}

/** Sprachen, für die Einwilligungstext UND Bestätigungsmail vorliegen. */
export function availableLanguages(config: MailingConsentConfig): MailingLang[] {
  return LANGS.filter((lang) => filled(config.einwilligung.texte[lang]) && mailText(config.bestaetigungsmail.texte[lang]));
}

const INTEGER_BOUNDS: Record<'anfragen_je_minute' | 'anfragen_je_stunde' | 'bestaetigungen_je_minute' | 'bestaetigungen_je_stunde' | 'max_body_bytes', readonly [number, number]> = {
  anfragen_je_minute: [1, 1000],
  anfragen_je_stunde: [1, 100_000],
  bestaetigungen_je_minute: [1, 1000],
  bestaetigungen_je_stunde: [1, 100_000],
  max_body_bytes: [256, 65_536],
};

/** Grenzen für Bestätigungsmails in der Form, die der Speicher erwartet. */
export function mailLimits(config: MailingConsentConfig): MailLimits {
  return {
    perAddress: config.grenzen?.bestaetigungsmails_je_adresse,
    windowHours: config.grenzen?.bestaetigungsmails_fenster_stunden,
    perDay: config.grenzen?.bestaetigungsmails_je_tag,
  };
}

/**
 * Jede Grenze ist eine ganze Zahl in ihrem Bereich. Eine fehlende, gebrochene oder unsinnige Angabe (0, NaN, Text)
 * würde einen Schutz still abschalten; deshalb arbeitet der Weg dann gar nicht.
 */
export function limitsValid(config: MailingConsentConfig): boolean {
  const limits = config.grenzen;
  if (!limits || typeof limits !== 'object') return false;
  return (
    mailLimitsValid(mailLimits(config)) &&
    (Object.keys(INTEGER_BOUNDS) as (keyof typeof INTEGER_BOUNDS)[]).every((key) => {
      const value = limits[key];
      return typeof value === 'number' && Number.isInteger(value) && value >= INTEGER_BOUNDS[key][0] && value <= INTEGER_BOUNDS[key][1];
    })
  );
}

/**
 * Was dem Einwilligungsweg zur Arbeitsfähigkeit fehlt (ohne Speicher und Mailversand, die zur Laufzeit geprüft werden).
 * Leere Liste = alle Freigaben und Festlegungen liegen vor. Eine Freigabe ist ein Eintrag mit Name, Datum, Beleg und
 * der Prüfsumme des freigegebenen Wortlauts je Sprache; ein vorhandener Text ohne Freigabe zählt nicht, und ein Text,
 * der nach der Freigabe geändert wurde, auch nicht. Anmeldung und Bestätigung prüfen beide diese Liste.
 */
export function consentReadiness(config: MailingConsentConfig, env: MailingEnv = process.env): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  const add = (gap: ReadinessGap) => {
    if (!gaps.includes(gap)) gaps.push(gap);
  };
  if (!filled(config.einwilligung.fassung) || !VERSION.test(config.einwilligung.fassung)) add('consent_version_missing');
  if (!approved(config.einwilligung.freigabe)) add('consent_text_not_approved');
  if (!filled(config.einwilligung.texte.de)) add('consent_text_missing');
  if (!approved(config.bestaetigungsmail.freigabe)) add('confirmation_mail_not_approved');
  if (!mailText(config.bestaetigungsmail.texte.de)) add('confirmation_mail_missing');
  for (const lang of LANGS) {
    const consent = config.einwilligung.texte[lang];
    if (filled(consent) && !approvalCovers(config.einwilligung.freigabe, lang, consentTextDigest(consent))) add('consent_text_approval_mismatch');
    const mail = config.bestaetigungsmail.texte[lang];
    if (!mailText(mail)) continue;
    if (!approvalCovers(config.bestaetigungsmail.freigabe, lang, confirmationMailDigest(mail))) add('confirmation_mail_approval_mismatch');
    if (!mail.text.includes(LINK_PLACEHOLDER)) add('confirmation_mail_link_missing');
    // Wer die Mail bekommt, ohne sich angemeldet zu haben, muss seine Adresse aus der Mail heraus sperren können.
    if (!mail.text.includes(BLOCK_LINK_PLACEHOLDER)) add('confirmation_mail_block_link_missing');
    const rest = (mail.betreff + mail.text).replace(PLACEHOLDERS, '');
    // Ein übrig gebliebener Platzhalter (zum Beispiel für Anbieterangaben) darf nie in einer Mail landen.
    if (/\{\{|\}\}|\[[A-ZÄÖÜ_ ]{4,}/.test(rest)) add('confirmation_mail_placeholder_unresolved');
  }
  const hours = config.bestaetigungsfrist_stunden;
  if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < 1 || hours > MAX_DEADLINE_HOURS) add('confirmation_deadline_missing');
  if (!filled(config.seiten.bestaetigung) || !PAGE.test(config.seiten.bestaetigung)) add('confirmation_page_missing');
  if (!filled(config.seiten.abmeldung) || !PAGE.test(config.seiten.abmeldung)) add('unsubscribe_page_missing');
  if (!Array.isArray(config.quellen) || config.quellen.length === 0 || !config.quellen.every((source) => typeof source === 'string' && SOURCE.test(source))) add('sources_missing');
  if (!limitsValid(config)) add('limits_invalid');
  if (!publicBaseUrl(env)) add('base_url_missing');
  return gaps;
}

/** Schreibweise, unter der eine Adresse geführt und gesperrt wird: ohne Rand, klein. */
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();
export const emailHash = (email: string): string => sha256Hex(normalizeEmail(email));
const newToken = (): string => randomBytes(32).toString('base64url');

/**
 * Kopfzeilen für die Abmeldung mit einem Klick (RFC 8058) samt Adresse, für den späteren Kampagnenweg (OA-106).
 * Die Adresse nimmt einen POST ohne Anmeldung an (handleUnsubscribe).
 */
export function listUnsubscribeHeaders(baseUrl: string, unsubscribeToken: string): Record<string, string> {
  if (!TOKEN.test(unsubscribeToken)) throw new Error('invalid_unsubscribe_token');
  const origin = publicBaseUrl({ MAILING_PUBLIC_BASE_URL: baseUrl });
  if (!origin) throw new Error('invalid_base_url');
  return { 'List-Unsubscribe': `<${origin}/api/mailing/unsubscribe?t=${unsubscribeToken}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Setzt die freigegebene Bestätigungsmail zusammen. Der Wortlaut kommt vollständig aus der Konfiguration.
 * `link` bestätigt, `blockLink` sperrt die Adresse. Jeder Platzhalter wird in einem Durchgang ersetzt; ein
 * eingesetzter Wert wird nicht noch einmal nach Platzhaltern durchsucht.
 */
export function buildConfirmationMail(mail: ConfirmationMailText, consentText: string, link: string, blockLink: string): { subject: string; text: string; html: string } {
  const fill = (template: string, values: Record<string, string>) => template.replace(PLACEHOLDERS, (_match, name: string) => values[name] ?? '');
  const anchor = (href: string) => `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>`;
  const text = fill(mail.text, { BESTAETIGUNGSLINK: link, SPERRLINK: blockLink, EINWILLIGUNGSTEXT: consentText });
  const html = fill(escapeHtml(mail.text), { BESTAETIGUNGSLINK: anchor(link), SPERRLINK: anchor(blockLink), EINWILLIGUNGSTEXT: escapeHtml(consentText) })
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return { subject: fill(mail.betreff, {}).trim(), text, html };
}

export type ConsentDeps = {
  env?: MailingEnv;
  config?: MailingConsentConfig;
  /** `null` = Speicher nicht eingerichtet. Ohne Angabe: Supabase, sobald konfiguriert. */
  store?: MailingConsentStore | null;
  sendMail?: (mail: MailInput) => Promise<MailResult>;
  mailConfigured?: () => boolean;
  nowMs?: () => number;
  newToken?: () => string;
  /** Mengenbegrenzung der Anmeldung. Ohne Angabe: gemeinsamer Zähler nach `grenzen.anfragen_*`. */
  limiter?: RateLimiter;
  /** Mengenbegrenzung der Bestätigung, getrennt von der Anmeldung. Ohne Angabe: nach `grenzen.bestaetigungen_*`. */
  confirmLimiter?: RateLimiter;
};

// Anmeldung und Bestätigung zählen getrennt: Wer bestätigt, soll nicht am Kontingent der Anmeldung scheitern, und umgekehrt.
const sharedLimiters = new Map<string, RateLimiter>();
function limiterFor(route: 'subscribe' | 'confirm', config: MailingConsentConfig): RateLimiter {
  const perMinute = route === 'subscribe' ? config.grenzen.anfragen_je_minute : config.grenzen.bestaetigungen_je_minute;
  const perHour = route === 'subscribe' ? config.grenzen.anfragen_je_stunde : config.grenzen.bestaetigungen_je_stunde;
  const key = `${route}:${perMinute}/${perHour}`;
  let limiter = sharedLimiters.get(key);
  if (!limiter) {
    limiter = createRateLimiter([
      { ms: 60_000, max: perMinute },
      { ms: 3_600_000, max: perHour },
    ]);
    sharedLimiters.set(key, limiter);
  }
  return limiter;
}

function reply(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}
function log(level: 'warn' | 'error', entry: Record<string, unknown>): void {
  console[level](JSON.stringify(entry));
}
const storeErrorCode = (error: unknown): string => (error instanceof MailingConsentStoreError ? error.code : 'unknown');

/** GET & Co. auf die Mailing-Routen. */
export function mailingMethodNotAllowed(): Response {
  return reply({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
}

/** Browser-Aufrufe nur von der eigenen Seite (wie app/api/chat/route.ts). Aufrufe ohne Origin bleiben möglich. */
function crossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'cross-site';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

async function readJson(request: Request, maxBytes: number): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: Response }> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return { ok: false, response: reply({ error: 'json_required' }, 415) };
  if (Number(request.headers.get('content-length') ?? '0') > maxBytes) return { ok: false, response: reply({ error: 'payload_too_large' }, 413) };
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) return { ok: false, response: reply({ error: 'payload_too_large' }, 413) };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, response: reply({ error: 'invalid_json' }, 400) };
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false, response: reply({ error: 'invalid_json' }, 400) };
  }
}

/** Der Verlauf ist eine Zusatzspur; der Nachweis selbst steht in der Anmeldung. Ein Fehler hier bricht nichts ab. */
async function recordEvent(store: MailingConsentStore, hash: string, type: ConsentEventType, consentVersion: string, source: string, occurredAt: number): Promise<void> {
  try {
    await store.appendEvent({ emailHash: hash, type, consentVersion, source, occurredAt });
  } catch (error) {
    log('error', { event: 'mailing_consent_event_failed', type, code: storeErrorCode(error) });
  }
}

/** Aufräumen und Rücknahmen sind Nebenarbeit: Ein Fehler dort wird gemeldet, bricht die Anfrage aber nicht ab. */
async function quietly(step: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    log('error', { event: 'mailing_consent_cleanup_failed', step, code: storeErrorCode(error) });
  }
}

const ACCEPTED = { status: 'confirmation_pending' } as const;

/**
 * POST /api/mailing/subscribe  { email, lang, consent: true, consent_version, source }
 *
 * Antwortet für jede angenommene Adresse gleich (202), ob neu, schon bestätigt, abgemeldet, gesperrt oder über der
 * Grenze: Die Antwort verrät nicht, ob eine Adresse bekannt ist. Eine Mail geht nur an neue und an unbestätigte Adressen.
 *
 * Eine offene (unbestätigte) Anmeldung wird durch eine weitere Anfrage nicht verändert, gleich von wem sie kommt:
 * Sprache, Quelle, Zeitpunkt, Fassung und Frist bleiben die der ersten Anfrage, und deren Link bleibt gültig. Die
 * weitere Anfrage löst nur eine weitere Mail mit einem zusätzlichen Link aus, in der Sprache der ersten Anfrage,
 * solange die Grenzen es zulassen und der freigegebene Wortlaut noch derselbe ist.
 *
 * Grenzen für Bestätigungsmails (dauerhaft in der Datenbank, unabhängig vom Verfall der Anmeldung):
 * `bestaetigungsmails_je_adresse` in `bestaetigungsmails_fenster_stunden` und `bestaetigungsmails_je_tag` insgesamt.
 * Ein gescheiterter Versand verbraucht keine davon.
 */
export async function handleSubscribe(request: Request, deps: ConsentDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!mailingConsentEnabled(env)) return reply({ error: 'mailing_consent_not_configured' }, 503);
  const config = deps.config ?? MAILING_CONSENT_CONFIG;
  const gaps = consentReadiness(config, env);
  const store = deps.store === undefined ? getMailingConsentStore() : deps.store;
  if (!store) gaps.push('store_not_configured');
  if (!(deps.mailConfigured ?? mailingConfigured)()) gaps.push('mail_not_configured');
  const base = publicBaseUrl(env);
  if (gaps.length > 0 || !store || !base) {
    log('warn', { event: 'mailing_consent_not_ready', gaps });
    return reply({ error: 'mailing_consent_not_ready' }, 503);
  }

  if (crossOrigin(request)) return reply({ error: 'same_origin_required' }, 403);
  const now = deps.nowMs?.() ?? Date.now();
  const verdict = (deps.limiter ?? limiterFor('subscribe', config)).check(clientKey(request), now);
  if (!verdict.allowed) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': String(verdict.retryAfterSeconds) });

  const parsed = await readJson(request, config.grenzen.max_body_bytes);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  // Die Einwilligung ist eine eigene, ausdrückliche Angabe: nur der Wahrheitswert `true` zählt.
  if (body.consent !== true) return reply({ error: 'consent_required' }, 422);
  // Der Besucher willigt in genau den Wortlaut ein, den er gesehen hat. Zeigt das Formular eine andere Fassung
  // als die freigegebene, wird nichts gespeichert.
  if (body.consent_version !== config.einwilligung.fassung) return reply({ error: 'consent_version_mismatch' }, 409);
  const requestedLang = typeof body.lang === 'string' && (LANGS as readonly string[]).includes(body.lang) ? (body.lang as MailingLang) : null;
  if (!requestedLang || !availableLanguages(config).includes(requestedLang)) return reply({ error: 'language_not_available' }, 422);
  const requestedSource = typeof body.source === 'string' ? body.source : '';
  if (!config.quellen.includes(requestedSource)) return reply({ error: 'invalid_source' }, 422);
  // Steuerzeichen werden vor dem Beschneiden geprüft, damit keines am Rand still verschwindet.
  if (typeof body.email !== 'string' || CONTROL.test(body.email)) return reply({ error: 'invalid_email' }, 422);
  const email = normalizeEmail(body.email);
  if (email.length < 6 || email.length > 254 || !EMAIL.test(email)) return reply({ error: 'invalid_email' }, 422);

  const consentVersion = config.einwilligung.fassung as string;
  const hash = sha256Hex(email);
  const token = (deps.newToken ?? newToken)();
  const tokenHash = sha256Hex(token);
  const limits = mailLimits(config);

  let lang = requestedLang;
  let source = requestedSource;
  let eventType: ConsentEventType = 'requested';
  let unsubscribeToken = '';
  let reservation: MailReservation | null = null;
  let tokenAdded = false;
  try {
    await store.purgeExpiredPending(now);
    await quietly('purge_mail_count', () => store.purgeSettledMails(now, limits.windowHours));
    // Sperrliste zuerst: Eine gesperrte Adresse bekommt keine Mail, auch keine Bestätigungsmail.
    if (await store.isSuppressed(hash)) return reply(ACCEPTED, 202);
    const existing = await store.getSubscription(hash);
    if (existing && existing.status !== 'pending') return reply(ACCEPTED, 202);
    if (existing) {
      // Offene Anmeldung: Es gilt, was bei der ersten Anfrage festgehalten wurde. Ist der freigegebene Wortlaut
      // inzwischen ein anderer, gibt es keine weitere Mail; die Anmeldung verfällt zur Frist und kann dann neu entstehen.
      const storedText = config.einwilligung.texte[existing.lang];
      if (existing.confirmExpiresAt <= now || existing.consentVersion !== consentVersion || !filled(storedText) || consentTextDigest(storedText) !== existing.consentTextSha256 || !availableLanguages(config).includes(existing.lang)) {
        return reply(ACCEPTED, 202);
      }
      lang = existing.lang;
      source = existing.source;
      eventType = 'confirmation_resent';
    }
    // Erst zählen, dann schreiben, dann senden: Ohne freien Platz in der Zählung entsteht weder Zeile noch Mail.
    reservation = await store.reserveConfirmationMail(hash, now, limits);
    if (!reservation) {
      if (await store.dailyLimitReached(now, limits.perDay)) log('warn', { event: 'mailing_consent_daily_limit_reached' });
      return reply(ACCEPTED, 202);
    }
    if (existing) {
      const added = await store.addConfirmToken(hash, tokenHash, now);
      if (added) {
        unsubscribeToken = added.unsubscribeToken;
        tokenAdded = true;
      }
    } else {
      const fresh = (deps.newToken ?? newToken)();
      const inserted = await store.insertPending({
        emailHash: hash,
        email,
        lang,
        source,
        consentVersion,
        consentTextSha256: consentTextDigest(config.einwilligung.texte[lang] as string),
        requestedAt: now,
        confirmTokenHash: tokenHash,
        confirmExpiresAt: now + (config.bestaetigungsfrist_stunden as number) * 3_600_000,
        unsubscribeToken: fresh,
      });
      if (inserted) unsubscribeToken = fresh;
    }
    // Ein gleichzeitiger Aufruf war schneller, oder die Anmeldung ist inzwischen nicht mehr offen: keine Mail, Platz frei.
    // Zweite Prüfung der Sperrliste unmittelbar vor dem Versand: Wer in der Zwischenzeit gesperrt hat, bekommt nichts mehr.
    if (!unsubscribeToken || (await store.isSuppressed(hash))) {
      const held = reservation;
      await quietly('release_mail_count', () => store.settleConfirmationMail(held, 'failed'));
      if (tokenAdded) await quietly('remove_confirm_token', () => store.removeConfirmToken(hash, tokenHash));
      return reply(ACCEPTED, 202);
    }
  } catch (error) {
    log('error', { event: 'mailing_consent_store_failed', step: 'subscribe', code: storeErrorCode(error) });
    if (reservation) {
      const held = reservation;
      await quietly('release_mail_count', () => store.settleConfirmationMail(held, 'failed'));
    }
    return reply({ error: 'storage_unavailable' }, 503);
  }
  await recordEvent(store, hash, eventType, consentVersion, source, now);

  // Die Kennzeichen stehen hinter dem #: Sie werden beim Öffnen der Seite nicht an den Server übertragen. Die
  // Bestätigungsseite sendet ihres per POST an /api/mailing/confirm, die Abmeldeseite ihres an /api/mailing/unsubscribe.
  const link = `${base}${config.seiten.bestaetigung}#t=${token}`;
  const blockLink = `${base}${config.seiten.abmeldung}#t=${unsubscribeToken}`;
  const mail = buildConfirmationMail(config.bestaetigungsmail.texte[lang] as ConfirmationMailText, config.einwilligung.texte[lang] as string, link, blockLink);
  let sent: MailResult;
  try {
    sent = await (deps.sendMail ?? sendMail)({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  } catch {
    sent = { ok: false };
  }
  const held = reservation;
  if (!sent.ok) {
    // Ehrlich melden: Ohne Mail kann niemand bestätigen. Der Fehlschlag gibt seinen Platz in der Zählung zurück,
    // und das Kennzeichen, das niemand erhalten hat, wird zurückgenommen. Ein neuer Versuch sendet erneut.
    log('error', { event: 'mailing_consent_mail_failed', skipped: Boolean(sent.skipped) });
    await quietly('release_mail_count', () => store.settleConfirmationMail(held, 'failed'));
    if (tokenAdded) await quietly('remove_confirm_token', () => store.removeConfirmToken(hash, tokenHash));
    return reply({ error: 'confirmation_mail_failed' }, 502);
  }
  await quietly('settle_mail_count', () => store.settleConfirmationMail(held, 'sent'));
  return reply(ACCEPTED, 202);
}

/**
 * POST /api/mailing/confirm  { token }
 * Aufgerufen von der Bestätigungsseite. Ein bloßer Abruf des Links aus der Mail bestätigt nichts.
 * Bestätigt wird nur, solange alle Freigaben vorliegen (wie bei der Anmeldung) und die Adresse nicht gesperrt ist.
 */
export async function handleConfirm(request: Request, deps: ConsentDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!mailingConsentEnabled(env)) return reply({ error: 'mailing_consent_not_configured' }, 503);
  const config = deps.config ?? MAILING_CONSENT_CONFIG;
  const gaps = consentReadiness(config, env);
  const store = deps.store === undefined ? getMailingConsentStore() : deps.store;
  if (!store) gaps.push('store_not_configured');
  if (gaps.length > 0 || !store) {
    log('warn', { event: 'mailing_consent_not_ready', gaps });
    return reply({ error: 'mailing_consent_not_ready' }, 503);
  }
  if (crossOrigin(request)) return reply({ error: 'same_origin_required' }, 403);
  const now = deps.nowMs?.() ?? Date.now();
  const verdict = (deps.confirmLimiter ?? limiterFor('confirm', config)).check(clientKey(request), now);
  if (!verdict.allowed) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': String(verdict.retryAfterSeconds) });
  const parsed = await readJson(request, config.grenzen.max_body_bytes);
  if (!parsed.ok) return parsed.response;
  const token = parsed.value.token;
  if (typeof token !== 'string' || !TOKEN.test(token)) return reply({ error: 'token_invalid_or_expired' }, 404);
  try {
    const tokenHash = sha256Hex(token);
    const pending = await store.findPendingByTokenHash(tokenHash, now);
    if (!pending) return reply({ error: 'token_invalid_or_expired' }, 404);
    // Eine gesperrte Adresse (Widerspruch, Rückläufer, Beschwerde, von Hand) wird nicht zur Einwilligung, auch nicht
    // mit gültigem Kennzeichen. Die Datenbank verweigert denselben Wechsel zusätzlich selbst.
    if (await store.isSuppressed(pending.emailHash)) return reply({ error: 'token_invalid_or_expired' }, 404);
    const confirmed = await store.confirmByTokenHash(tokenHash, now);
    if (!confirmed) return reply({ error: 'token_invalid_or_expired' }, 404);
    await recordEvent(store, confirmed.emailHash, 'confirmed', confirmed.consentVersion, confirmed.source, now);
    return reply({ status: 'confirmed' }, 200);
  } catch (error) {
    log('error', { event: 'mailing_consent_store_failed', step: 'confirm', code: storeErrorCode(error) });
    return reply({ error: 'storage_unavailable' }, 503);
  }
}

/**
 * POST /api/mailing/unsubscribe?t=<Kennzeichen>
 * Abmeldung mit einem Klick (RFC 8058): Mailprogramme senden den POST ohne Anmeldung, ohne Origin und mit dem
 * Body "List-Unsubscribe=One-Click". Der Body wird nicht gelesen. Keine Mengenbegrenzung je Absender, weil
 * Postfachanbieter von gemeinsamen Adressen aus senden; das Kennzeichen hat 256 Bit.
 * Wirkt sofort und unabhängig vom Schalter. Wiederholung ist unschädlich.
 */
export async function handleUnsubscribe(request: Request, deps: ConsentDeps = {}): Promise<Response> {
  const store = deps.store === undefined ? getMailingConsentStore() : deps.store;
  if (!store) return reply({ error: 'storage_unavailable' }, 503);
  let token: string | null;
  try {
    token = new URL(request.url).searchParams.get('t');
  } catch {
    token = null;
  }
  if (!token || !TOKEN.test(token)) return reply({ error: 'token_invalid' }, 404);
  const now = deps.nowMs?.() ?? Date.now();
  try {
    const outcome = await store.unsubscribeByToken(token, now);
    if (!outcome) return reply({ error: 'token_invalid' }, 404);
    if (!outcome.alreadyUnsubscribed) await recordEvent(store, outcome.emailHash, 'unsubscribed', '', '', now);
    return reply({ status: 'unsubscribed' }, 200);
  } catch (error) {
    // 503, damit ein Mailprogramm oder die Seite es erneut versucht; eine Abmeldung darf nicht still verloren gehen.
    log('error', { event: 'mailing_consent_store_failed', step: 'unsubscribe', code: storeErrorCode(error) });
    return reply({ error: 'storage_unavailable' }, 503);
  }
}
