/**
 * Einwilligungsweg für Werbemails: Anmeldung mit Bestätigungsmail (Double-Opt-in), Bestätigung, Abmeldung.
 * Reine Handler ohne Next-Abhängigkeit; die Routen unter app/api/mailing/ rufen nur diese Funktionen auf.
 *
 * Standard AUS. Die Anmeldung arbeitet nur, wenn ALLES zugleich vorliegt:
 *  - Schalter NEXIFY_MAILING_CONSENT=on
 *  - vom Inhaber freigegebener Einwilligungstext und freigegebene Bestätigungsmail samt Fassung, Frist, Seite
 *    und Quellen in config/integrations/mailing-consent.json (heute alles `null`)
 *  - dauerhafter Speicher (Supabase, Schema "mailing"), Mailversand (Resend) und MAILING_PUBLIC_BASE_URL
 * Fehlt etwas, antwortet sie mit 503 und versendet nichts. Dieser Code enthält keinen Rechtstext.
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
import { getMailingConsentStore, MailingConsentStoreError, type ConsentEventType, type MailingConsentStore, type MailingLang } from './consent-store.ts';

export type MailingEnv = Record<string, string | undefined>;
export type Approval = { durch: string; am: string; beleg: string };
export type ConfirmationMailText = { betreff: string; text: string };

export type MailingConsentConfig = {
  einwilligung: { fassung: string | null; freigabe: Approval | null; texte: Record<MailingLang, string | null> };
  bestaetigungsmail: { freigabe: Approval | null; texte: Record<MailingLang, ConfirmationMailText | null> };
  bestaetigungsfrist_stunden: number | null;
  seiten: { bestaetigung: string | null; abmeldung: string | null };
  quellen: string[];
  grenzen: { bestaetigungsmails_je_anmeldung: number; anfragen_je_minute: number; anfragen_je_stunde: number; max_body_bytes: number };
};

export const MAILING_CONSENT_CONFIG = rawConfig as unknown as MailingConsentConfig;

export const LINK_PLACEHOLDER = '{{BESTAETIGUNGSLINK}}';
export const CONSENT_PLACEHOLDER = '{{EINWILLIGUNGSTEXT}}';

const LANGS: readonly MailingLang[] = ['de', 'nl', 'fr', 'en'];
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const SOURCE = /^[a-z0-9/_-]{1,64}$/;
const PAGE = /^\/[a-z0-9/_-]{1,128}$/;
const VERSION = /^[A-Za-z0-9._-]{1,64}$/;
const EMAIL = /^[^\s@<>"',;:\\()[\]]+@[^\s@<>"',;:\\()[\]]+\.[^\s@<>"',;:\\()[\]]{2,}$/;
const MAX_DEADLINE_HOURS = 14 * 24;

/** Standard AUS: nur der exakte Wert "on" (Muster lib/composio.ts). */
export function mailingConsentEnabled(env: MailingEnv = process.env): boolean {
  return env.NEXIFY_MAILING_CONSENT === 'on';
}

export type ReadinessGap =
  | 'consent_version_missing'
  | 'consent_text_not_approved'
  | 'consent_text_missing'
  | 'confirmation_mail_not_approved'
  | 'confirmation_mail_missing'
  | 'confirmation_mail_link_missing'
  | 'confirmation_mail_placeholder_unresolved'
  | 'confirmation_deadline_missing'
  | 'confirmation_page_missing'
  | 'sources_missing'
  | 'base_url_missing'
  | 'store_not_configured'
  | 'mail_not_configured';

function approved(value: Approval | null): boolean {
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

/** Sprachen, für die Einwilligungstext UND Bestätigungsmail vorliegen. */
export function availableLanguages(config: MailingConsentConfig): MailingLang[] {
  return LANGS.filter((lang) => filled(config.einwilligung.texte[lang]) && mailText(config.bestaetigungsmail.texte[lang]));
}

/**
 * Was der Anmeldung zur Arbeitsfähigkeit fehlt (ohne Speicher und Mailversand, die zur Laufzeit geprüft werden).
 * Leere Liste = alle Freigaben und Festlegungen liegen vor. Eine Freigabe ist ein Eintrag mit Name, Datum und Beleg;
 * ein vorhandener Text ohne Freigabe zählt nicht.
 */
export function consentReadiness(config: MailingConsentConfig, env: MailingEnv = process.env): ReadinessGap[] {
  const gaps: ReadinessGap[] = [];
  if (!filled(config.einwilligung.fassung) || !VERSION.test(config.einwilligung.fassung)) gaps.push('consent_version_missing');
  if (!approved(config.einwilligung.freigabe)) gaps.push('consent_text_not_approved');
  if (!filled(config.einwilligung.texte.de)) gaps.push('consent_text_missing');
  if (!approved(config.bestaetigungsmail.freigabe)) gaps.push('confirmation_mail_not_approved');
  if (!mailText(config.bestaetigungsmail.texte.de)) gaps.push('confirmation_mail_missing');
  for (const lang of LANGS) {
    const mail = config.bestaetigungsmail.texte[lang];
    if (!mailText(mail)) continue;
    if (!mail.text.includes(LINK_PLACEHOLDER) && !gaps.includes('confirmation_mail_link_missing')) gaps.push('confirmation_mail_link_missing');
    const rest = (mail.betreff + mail.text).split(LINK_PLACEHOLDER).join('').split(CONSENT_PLACEHOLDER).join('');
    // Ein übrig gebliebener Platzhalter (zum Beispiel für Anbieterangaben) darf nie in einer Mail landen.
    if (/\{\{|\}\}|\[[A-ZÄÖÜ_ ]{4,}/.test(rest) && !gaps.includes('confirmation_mail_placeholder_unresolved')) gaps.push('confirmation_mail_placeholder_unresolved');
  }
  const hours = config.bestaetigungsfrist_stunden;
  if (typeof hours !== 'number' || !Number.isInteger(hours) || hours < 1 || hours > MAX_DEADLINE_HOURS) gaps.push('confirmation_deadline_missing');
  if (!filled(config.seiten.bestaetigung) || !PAGE.test(config.seiten.bestaetigung)) gaps.push('confirmation_page_missing');
  if (!Array.isArray(config.quellen) || config.quellen.length === 0 || !config.quellen.every((source) => typeof source === 'string' && SOURCE.test(source))) gaps.push('sources_missing');
  if (!publicBaseUrl(env)) gaps.push('base_url_missing');
  return gaps;
}

export const sha256Hex = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
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

/** Setzt die freigegebene Bestätigungsmail zusammen. Der Wortlaut kommt vollständig aus der Konfiguration. */
export function buildConfirmationMail(mail: ConfirmationMailText, consentText: string, link: string): { subject: string; text: string; html: string } {
  const fill = (template: string, linkValue: string, consentValue: string) => template.split(LINK_PLACEHOLDER).join(linkValue).split(CONSENT_PLACEHOLDER).join(consentValue);
  const text = fill(mail.text, link, consentText);
  const anchor = `<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`;
  const html = fill(escapeHtml(mail.text), anchor, escapeHtml(consentText))
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
  return { subject: fill(mail.betreff, '', '').trim(), text, html };
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
  limiter?: RateLimiter;
};

let sharedLimiter: { limiter: RateLimiter; key: string } | null = null;
function limiterFor(config: MailingConsentConfig): RateLimiter {
  const key = `${config.grenzen.anfragen_je_minute}/${config.grenzen.anfragen_je_stunde}`;
  if (!sharedLimiter || sharedLimiter.key !== key) {
    sharedLimiter = {
      key,
      limiter: createRateLimiter([
        { ms: 60_000, max: config.grenzen.anfragen_je_minute },
        { ms: 3_600_000, max: config.grenzen.anfragen_je_stunde },
      ]),
    };
  }
  return sharedLimiter.limiter;
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

const ACCEPTED = { status: 'confirmation_pending' } as const;

/**
 * POST /api/mailing/subscribe  { email, lang, consent: true, consent_version, source }
 *
 * Antwortet für jede angenommene Adresse gleich (202), ob neu, schon bestätigt, abgemeldet oder gesperrt:
 * Die Antwort verrät nicht, ob eine Adresse bekannt ist. Eine Mail geht nur an neue und an unbestätigte Adressen.
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
  const verdict = (deps.limiter ?? limiterFor(config)).check(clientKey(request), now);
  if (!verdict.allowed) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': String(verdict.retryAfterSeconds) });

  const parsed = await readJson(request, config.grenzen.max_body_bytes);
  if (!parsed.ok) return parsed.response;
  const body = parsed.value;

  // Die Einwilligung ist eine eigene, ausdrückliche Angabe: nur der Wahrheitswert `true` zählt.
  if (body.consent !== true) return reply({ error: 'consent_required' }, 422);
  // Der Besucher willigt in genau den Wortlaut ein, den er gesehen hat. Zeigt das Formular eine andere Fassung
  // als die freigegebene, wird nichts gespeichert.
  if (body.consent_version !== config.einwilligung.fassung) return reply({ error: 'consent_version_mismatch' }, 409);
  const lang = typeof body.lang === 'string' && (LANGS as readonly string[]).includes(body.lang) ? (body.lang as MailingLang) : null;
  if (!lang || !availableLanguages(config).includes(lang)) return reply({ error: 'language_not_available' }, 422);
  const source = typeof body.source === 'string' ? body.source : '';
  if (!config.quellen.includes(source)) return reply({ error: 'invalid_source' }, 422);
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  if (email.length < 6 || email.length > 254 || !EMAIL.test(email)) return reply({ error: 'invalid_email' }, 422);

  const consentText = config.einwilligung.texte[lang] as string;
  const mailTemplate = config.bestaetigungsmail.texte[lang] as ConfirmationMailText;
  const consentVersion = config.einwilligung.fassung as string;
  const hash = sha256Hex(email);
  const token = (deps.newToken ?? newToken)();
  const pending = {
    lang,
    source,
    consentVersion,
    consentTextSha256: sha256Hex(consentText),
    requestedAt: now,
    confirmTokenHash: sha256Hex(token),
    confirmExpiresAt: now + (config.bestaetigungsfrist_stunden as number) * 3_600_000,
  };

  let eventType: ConsentEventType;
  try {
    await store.purgeExpiredPending(now);
    // Sperrliste zuerst: Eine gesperrte Adresse bekommt keine Mail, auch keine Bestätigungsmail.
    if (await store.isSuppressed(hash)) return reply(ACCEPTED, 202);
    const existing = await store.getSubscription(hash);
    if (existing && existing.status !== 'pending') return reply(ACCEPTED, 202);
    if (existing) {
      // Höchstens so viele Bestätigungsmails je unbestätigter Anmeldung; schützt fremde Postfächer vor Wiederholung.
      if (existing.confirmMailsSent >= config.grenzen.bestaetigungsmails_je_anmeldung) return reply(ACCEPTED, 202);
      if (!(await store.renewPending(hash, existing.confirmMailsSent, pending))) return reply(ACCEPTED, 202);
      eventType = 'confirmation_resent';
    } else {
      if (!(await store.insertPending({ ...pending, emailHash: hash, email, unsubscribeToken: (deps.newToken ?? newToken)() }))) return reply(ACCEPTED, 202);
      eventType = 'requested';
    }
  } catch (error) {
    log('error', { event: 'mailing_consent_store_failed', step: 'subscribe', code: storeErrorCode(error) });
    return reply({ error: 'storage_unavailable' }, 503);
  }
  await recordEvent(store, hash, eventType, consentVersion, source, now);

  // Das Kennzeichen steht hinter dem #: Es wird beim Öffnen der Seite nicht an den Server übertragen und
  // erscheint in keinem Zugriffsprotokoll. Die Seite sendet es per POST an /api/mailing/confirm.
  const link = `${base}${config.seiten.bestaetigung}#t=${token}`;
  const mail = buildConfirmationMail(mailTemplate, consentText, link);
  const sent = await (deps.sendMail ?? sendMail)({ to: email, subject: mail.subject, text: mail.text, html: mail.html });
  if (!sent.ok) {
    // Ehrlich melden: Ohne Mail kann niemand bestätigen. Die unbestätigte Zeile bleibt bis zum Verfall stehen;
    // ein neuer Versuch erneuert sie (bis zur Grenze je Anmeldung).
    log('error', { event: 'mailing_consent_mail_failed', skipped: Boolean(sent.skipped) });
    return reply({ error: 'confirmation_mail_failed' }, 502);
  }
  return reply(ACCEPTED, 202);
}

/**
 * POST /api/mailing/confirm  { token }
 * Aufgerufen von der Bestätigungsseite. Ein bloßer Abruf des Links aus der Mail bestätigt nichts.
 */
export async function handleConfirm(request: Request, deps: ConsentDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!mailingConsentEnabled(env)) return reply({ error: 'mailing_consent_not_configured' }, 503);
  const config = deps.config ?? MAILING_CONSENT_CONFIG;
  const store = deps.store === undefined ? getMailingConsentStore() : deps.store;
  if (!store) return reply({ error: 'mailing_consent_not_ready' }, 503);
  if (crossOrigin(request)) return reply({ error: 'same_origin_required' }, 403);
  const now = deps.nowMs?.() ?? Date.now();
  const verdict = (deps.limiter ?? limiterFor(config)).check(clientKey(request), now);
  if (!verdict.allowed) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': String(verdict.retryAfterSeconds) });
  const parsed = await readJson(request, config.grenzen.max_body_bytes);
  if (!parsed.ok) return parsed.response;
  const token = parsed.value.token;
  if (typeof token !== 'string' || !TOKEN.test(token)) return reply({ error: 'token_invalid_or_expired' }, 404);
  try {
    const confirmed = await store.confirmByTokenHash(sha256Hex(token), now);
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
