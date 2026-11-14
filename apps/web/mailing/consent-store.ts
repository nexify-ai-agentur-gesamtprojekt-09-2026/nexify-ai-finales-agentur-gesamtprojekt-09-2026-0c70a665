/**
 * Speicher des Einwilligungswegs für Werbemails (Anmeldungen mit Nachweis, Sperrliste, Verlauf).
 *
 * Aufbau wie lib/composio-store.ts: ein Interface, zwei Implementierungen.
 *  - `createSupabaseMailingConsentStore()`: dauerhaft, auf der selbst gehosteten Supabase-Instanz (Schema "mailing",
 *    Migration apps/web/supabase/migrations/0005_mailing_consent.sql). Zugriff nur serverseitig mit Service-Role
 *    über lib/supabase-rest.ts; Row-Level-Security ist auf jeder Tabelle an, ohne Richtlinie.
 *  - `createMemoryMailingConsentStore()`: nur für Tests.
 *
 * Anders als bei Composio gibt es KEINEN Rückfall auf den Arbeitsspeicher: Ein Einwilligungsnachweis, der einen
 * Neustart der Funktion nicht übersteht, ist kein Nachweis. `getMailingConsentStore()` liefert ohne
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY `null`; die Routen antworten dann mit 503.
 *
 * Jeder Zustandswechsel ist eine einzelne Anweisung mit Filter auf den erwarteten Ausgangszustand. Von zwei
 * gleichzeitigen Aufrufen gewinnt genau einer; die Datenbank sichert zusätzlich über Trigger, dass ein Zustand
 * nur vorwärts läuft und ein Nachweis nicht umgeschrieben wird.
 *
 * Was beim Anlegen einer Anmeldung feststeht (Adresse, Sprache, Quelle, Fassung, Prüfsumme des Wortlauts, Zeitpunkt,
 * Frist), ändert kein späterer Aufruf mehr. Eine weitere Anfrage zur selben Adresse fügt nur ein weiteres
 * Bestätigungskennzeichen an; die früheren bleiben bis zum Ablauf der Frist gültig. So kann ein Dritter die offene
 * Anmeldung eines anderen weder umschreiben noch dessen Link entwerten.
 *
 * Die Zählung der Bestätigungsmails (`confirmation_mails`) hängt nicht an der Anmeldung und überlebt deren Verfall.
 * Ob eine Mail noch erlaubt ist, entscheidet die Datenbank unter einer Sperre beim Eintragen.
 */
import { sbDelete, sbInsert, sbSelect, sbUpdate, supabaseConfigured, SupabaseTimeoutError, type SbOptions } from '../lib/supabase-rest.ts';

export type MailingLang = 'de' | 'nl' | 'fr' | 'en';
export type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';
export type SuppressionReason = 'unsubscribe' | 'objection' | 'hard_bounce' | 'complaint' | 'manual';
export type ConsentEventType = 'requested' | 'confirmation_resent' | 'confirmed' | 'unsubscribed';

/** Was von einer Anmeldung gelesen wird. Kennzeichen (Token) und ihre Prüfsummen gehören nicht dazu. */
export type Subscription = {
  emailHash: string;
  email: string;
  lang: MailingLang;
  status: SubscriptionStatus;
  source: string;
  consentVersion: string;
  consentTextSha256: string;
  requestedAt: number;
  confirmExpiresAt: number;
  confirmedAt: number | null;
  unsubscribedAt: number | null;
};

export type PendingInput = {
  emailHash: string;
  email: string;
  lang: MailingLang;
  source: string;
  consentVersion: string;
  consentTextSha256: string;
  requestedAt: number;
  confirmTokenHash: string;
  confirmExpiresAt: number;
  unsubscribeToken: string;
};

export type ConsentEvent = { emailHash: string; type: ConsentEventType; consentVersion: string; source: string; occurredAt: number };

/** Grenzen für Bestätigungsmails: je Adress-Prüfsumme im Fenster und insgesamt in 24 Stunden. */
export type MailLimits = { perAddress: number; windowHours: number; perDay: number };
export type MailReservation = { id: number };

/** Höchstzahl gleichzeitig gültiger Bestätigungskennzeichen je unbestätigter Anmeldung (wie in der Migration). */
export const MAX_CONFIRM_TOKENS = 8;
/** Schranken der Grenzwerte, wie die Datenbank sie prüft. Außerhalb davon wird nichts eingetragen und nichts gesendet. */
export const MAIL_LIMIT_BOUNDS = { perAddress: [1, 10], windowHours: [1, 8760], perDay: [1, 10000] } as const;

export function mailLimitsValid(limits: MailLimits): boolean {
  return (Object.keys(MAIL_LIMIT_BOUNDS) as (keyof MailLimits)[]).every((key) => {
    const value = limits?.[key];
    return typeof value === 'number' && Number.isInteger(value) && value >= MAIL_LIMIT_BOUNDS[key][0] && value <= MAIL_LIMIT_BOUNDS[key][1];
  });
}

export interface MailingConsentStore {
  isSuppressed(emailHash: string): Promise<boolean>;
  getSubscription(emailHash: string): Promise<Subscription | null>;
  /** Legt eine unbestätigte Anmeldung an. `false`, wenn es zu dieser Adresse schon eine Zeile gibt. */
  insertPending(input: PendingInput): Promise<boolean>;
  /**
   * Fügt einer unbestätigten, nicht verfallenen Anmeldung ein weiteres Bestätigungskennzeichen an. Nichts sonst
   * ändert sich; frühere Kennzeichen bleiben gültig. `null`, wenn es keine solche Anmeldung (mehr) gibt oder die
   * Höchstzahl an Kennzeichen erreicht ist.
   *
   * Einzige Stelle, an der der Speicher das Abmeldekennzeichen herausgibt: Es gehört als Sperrlink in genau die
   * Bestätigungsmail, für die das neue Kennzeichen angefügt wurde, und nirgendwohin sonst (kein Protokoll, keine Antwort).
   */
  addConfirmToken(emailHash: string, tokenHash: string, nowMs: number): Promise<{ unsubscribeToken: string } | null>;
  /** Nimmt ein Kennzeichen zurück, dessen Mail nicht hinausging. Das letzte Kennzeichen einer Anmeldung bleibt stehen. */
  removeConfirmToken(emailHash: string, tokenHash: string): Promise<void>;
  /** Zu welcher unbestätigten, nicht verfallenen Anmeldung das Kennzeichen gehört. Ändert nichts. */
  findPendingByTokenHash(tokenHash: string, nowMs: number): Promise<{ emailHash: string } | null>;
  /** Bestätigt genau die unbestätigte, nicht verfallene Anmeldung zu diesem Kennzeichen. Sonst `null`. */
  confirmByTokenHash(tokenHash: string, nowMs: number): Promise<Subscription | null>;
  /**
   * Meldet ab: erst Eintrag auf der Sperrliste, dann Zustand. Beliebig oft wiederholbar.
   * `null`, wenn das Kennzeichen unbekannt ist.
   */
  unsubscribeByToken(token: string, nowMs: number): Promise<{ emailHash: string; alreadyUnsubscribed: boolean } | null>;
  addSuppression(emailHash: string, reason: SuppressionReason, nowMs: number): Promise<void>;
  appendEvent(event: ConsentEvent): Promise<void>;
  /**
   * Trägt eine Bestätigungsmail VOR dem Versand ein. `null`, wenn die Grenze je Adresse oder die Tagesgrenze erreicht
   * ist; dann wird nicht gesendet. Von gleichzeitigen Aufrufen kommen nie mehr durch, als die Grenzen erlauben.
   */
  reserveConfirmationMail(emailHash: string, nowMs: number, limits: MailLimits): Promise<MailReservation | null>;
  /** Schließt einen Eintrag ab: `sent` zählt weiter, `failed` gibt den Platz frei (ein Fehlschlag verbraucht keine Mail). */
  settleConfirmationMail(reservation: MailReservation, outcome: 'sent' | 'failed'): Promise<void>;
  /** Nur für die Meldung im Protokoll: Ist die Tagesgrenze erreicht? */
  dailyLimitReached(nowMs: number, perDay: number): Promise<boolean>;
  /** Löscht unbestätigte Anmeldungen, deren Frist abgelaufen ist. Bestätigte und abgemeldete bleiben. */
  purgeExpiredPending(nowMs: number): Promise<void>;
  /** Löscht Einträge der Mailzählung, die für keine Grenze mehr zählen. */
  purgeSettledMails(nowMs: number, windowHours: number): Promise<void>;
}

const HEX64 = /^[0-9a-f]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const HOUR_MS = 3_600_000;

type MemoryRow = Subscription & { confirmTokenHashes: string[]; unsubscribeToken: string };
type MemoryMail = { id: number; emailHash: string; state: 'reserved' | 'sent' | 'failed'; reservedAt: number; limits: MailLimits };

/**
 * Nur für Tests. Verhält sich wie die Datenbank samt ihrer Sperren: Zustand nur vorwärts, Nachweis unveränderlich,
 * keine Bestätigung einer gesperrten Adresse, Sperrliste nur Anfügen, Mailzählung mit Grenzen.
 */
export function createMemoryMailingConsentStore(): MailingConsentStore & { events: ConsentEvent[]; suppressions: Map<string, SuppressionReason>; mails: MemoryMail[] } {
  const subscriptions = new Map<string, MemoryRow>();
  const suppressions = new Map<string, SuppressionReason>();
  const events: ConsentEvent[] = [];
  const mails: MemoryMail[] = [];
  const view = (row: MemoryRow): Subscription => {
    const { confirmTokenHashes: _hashes, unsubscribeToken: _token, ...rest } = row;
    return { ...rest };
  };
  const open = (row: MemoryRow, nowMs: number): boolean => row.status === 'pending' && row.confirmExpiresAt > nowMs;
  return {
    events,
    suppressions,
    mails,
    async isSuppressed(emailHash) {
      return suppressions.has(emailHash);
    },
    async getSubscription(emailHash) {
      const row = subscriptions.get(emailHash);
      return row ? view(row) : null;
    },
    async insertPending(input) {
      if (subscriptions.has(input.emailHash)) return false;
      subscriptions.set(input.emailHash, {
        emailHash: input.emailHash,
        email: input.email,
        lang: input.lang,
        status: 'pending',
        source: input.source,
        consentVersion: input.consentVersion,
        consentTextSha256: input.consentTextSha256,
        requestedAt: input.requestedAt,
        confirmExpiresAt: input.confirmExpiresAt,
        confirmedAt: null,
        unsubscribedAt: null,
        confirmTokenHashes: [input.confirmTokenHash],
        unsubscribeToken: input.unsubscribeToken,
      });
      return true;
    },
    async addConfirmToken(emailHash, tokenHash, nowMs) {
      const row = subscriptions.get(emailHash);
      if (!row || !open(row, nowMs) || row.confirmTokenHashes.length >= MAX_CONFIRM_TOKENS) return null;
      row.confirmTokenHashes.push(tokenHash);
      return { unsubscribeToken: row.unsubscribeToken };
    },
    async removeConfirmToken(emailHash, tokenHash) {
      const row = subscriptions.get(emailHash);
      if (!row || row.status !== 'pending' || row.confirmTokenHashes.length < 2) return;
      row.confirmTokenHashes = row.confirmTokenHashes.filter((hash) => hash !== tokenHash);
    },
    async findPendingByTokenHash(tokenHash, nowMs) {
      for (const row of subscriptions.values()) {
        if (open(row, nowMs) && row.confirmTokenHashes.includes(tokenHash)) return { emailHash: row.emailHash };
      }
      return null;
    },
    async confirmByTokenHash(tokenHash, nowMs) {
      for (const row of subscriptions.values()) {
        if (!open(row, nowMs) || !row.confirmTokenHashes.includes(tokenHash)) continue;
        // Wie der Trigger der Datenbank: Eine gesperrte Adresse wird nicht bestätigt, auch wenn der Aufrufer nicht geprüft hat.
        if (suppressions.has(row.emailHash)) throw new MailingConsentStoreError('mailing_store_failed');
        Object.assign(row, { status: 'confirmed', confirmedAt: nowMs, confirmTokenHashes: [] });
        return view(row);
      }
      return null;
    },
    async unsubscribeByToken(token, nowMs) {
      for (const row of subscriptions.values()) {
        if (row.unsubscribeToken !== token) continue;
        if (!suppressions.has(row.emailHash)) suppressions.set(row.emailHash, 'unsubscribe');
        if (row.status === 'unsubscribed') return { emailHash: row.emailHash, alreadyUnsubscribed: true };
        Object.assign(row, { status: 'unsubscribed', unsubscribedAt: nowMs, confirmTokenHashes: [] });
        return { emailHash: row.emailHash, alreadyUnsubscribed: false };
      }
      return null;
    },
    async addSuppression(emailHash, reason) {
      if (!suppressions.has(emailHash)) suppressions.set(emailHash, reason);
    },
    async appendEvent(event) {
      events.push({ ...event });
    },
    async reserveConfirmationMail(emailHash, nowMs, limits) {
      if (!mailLimitsValid(limits)) throw new MailingConsentStoreError('mailing_store_failed');
      const counted = mails.filter((mail) => mail.state !== 'failed');
      if (counted.filter((mail) => mail.emailHash === emailHash && mail.reservedAt > nowMs - limits.windowHours * HOUR_MS).length >= limits.perAddress) return null;
      if (counted.filter((mail) => mail.reservedAt > nowMs - 24 * HOUR_MS).length >= limits.perDay) return null;
      const id = mails.length + 1;
      mails.push({ id, emailHash, state: 'reserved', reservedAt: nowMs, limits: { ...limits } });
      return { id };
    },
    async settleConfirmationMail(reservation, outcome) {
      const mail = mails.find((entry) => entry.id === reservation.id);
      if (mail && mail.state === 'reserved') mail.state = outcome;
    },
    async dailyLimitReached(nowMs, perDay) {
      return mails.filter((mail) => mail.state !== 'failed' && mail.reservedAt > nowMs - 24 * HOUR_MS).length >= perDay;
    },
    async purgeExpiredPending(nowMs) {
      for (const [key, row] of subscriptions) {
        if (row.status === 'pending' && row.confirmExpiresAt < nowMs) subscriptions.delete(key);
      }
    },
    async purgeSettledMails(nowMs, windowHours) {
      const keep = mails.filter((mail) => mail.reservedAt >= nowMs - Math.max(windowHours, mail.limits.windowHours, 24) * HOUR_MS);
      mails.length = 0;
      mails.push(...keep);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Supabase (self-hosted, PostgREST): Schema "mailing"
// ---------------------------------------------------------------------------------------------------------------

export type MailingConsentStoreErrorCode = 'mailing_store_not_configured' | 'mailing_store_timeout' | 'mailing_store_failed';

/**
 * Einziger Fehler, den der Supabase-Speicher nach außen gibt. Die Meldung ist nur der Code: keine Adresse, kein
 * Schlüssel, kein Pfad, kein Antworttext der Datenbank und keine Nutzdaten (wie ComposioStoreError).
 */
export class MailingConsentStoreError extends Error {
  readonly code: MailingConsentStoreErrorCode;
  constructor(code: MailingConsentStoreErrorCode) {
    super(code);
    this.name = 'MailingConsentStoreError';
    this.code = code;
  }
}

const DB: SbOptions = { schema: 'mailing' };
const STATUSES: readonly SubscriptionStatus[] = ['pending', 'confirmed', 'unsubscribed'];
const LANGS: readonly MailingLang[] = ['de', 'nl', 'fr', 'en'];
const COLUMNS = 'email_hash,email,lang,status,source,consent_version,consent_text_sha256,requested_at,confirm_expires_at,confirmed_at,unsubscribed_at';

type DbRow = Record<string, unknown>;

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof MailingConsentStoreError) throw error;
    if (error instanceof SupabaseTimeoutError) throw new MailingConsentStoreError('mailing_store_timeout');
    if (error instanceof Error && error.message === 'supabase_not_configured') throw new MailingConsentStoreError('mailing_store_not_configured');
    throw new MailingConsentStoreError('mailing_store_failed');
  }
}

const fail = (): never => {
  throw new MailingConsentStoreError('mailing_store_failed');
};
const eq = (value: string) => 'eq.' + encodeURIComponent(value);
const iso = (ms: number): string => (Number.isFinite(ms) ? new Date(ms).toISOString() : fail());
function rows(value: unknown): DbRow[] {
  return Array.isArray(value) ? (value as DbRow[]) : fail();
}
function text(row: DbRow, column: string): string {
  const value = row[column];
  return typeof value === 'string' && value ? value : fail();
}
function time(row: DbRow, column: string): number {
  const ms = Date.parse(text(row, column));
  return Number.isFinite(ms) ? ms : fail();
}
function optionalTime(row: DbRow, column: string): number | null {
  return row[column] === null || row[column] === undefined ? null : time(row, column);
}
function toSubscription(row: DbRow): Subscription {
  const status = text(row, 'status') as SubscriptionStatus;
  const lang = text(row, 'lang') as MailingLang;
  if (!STATUSES.includes(status) || !LANGS.includes(lang)) fail();
  const emailHash = text(row, 'email_hash');
  if (!HEX64.test(emailHash)) fail();
  return {
    emailHash,
    email: text(row, 'email'),
    lang,
    status,
    source: text(row, 'source'),
    consentVersion: text(row, 'consent_version'),
    consentTextSha256: text(row, 'consent_text_sha256'),
    requestedAt: time(row, 'requested_at'),
    confirmExpiresAt: time(row, 'confirm_expires_at'),
    confirmedAt: optionalTime(row, 'confirmed_at'),
    unsubscribedAt: optionalTime(row, 'unsubscribed_at'),
  };
}
function tokenHashes(row: DbRow): string[] {
  const value = row.confirm_token_hashes;
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string' && HEX64.test(entry))) fail();
  return value as string[];
}
/** PostgreSQL-Feldliteral für Filter (`cs.{…}`, `eq.{…}`). Die Einträge sind geprüfte Hex-Prüfsummen. */
const arrayLiteral = (hashes: readonly string[]): string => encodeURIComponent('{' + hashes.join(',') + '}');
const CAS_ATTEMPTS = 3;

/**
 * Dauerhafter Speicher auf der selbst gehosteten Supabase-Instanz (PostgREST, Schema "mailing").
 * Ohne SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY scheitert jeder Zugriff mit `mailing_store_not_configured`.
 */
export function createSupabaseMailingConsentStore(): MailingConsentStore {
  const store: MailingConsentStore = {
    async isSuppressed(emailHash) {
      if (!HEX64.test(emailHash)) fail();
      return guarded(async () => {
        const found = rows(await sbSelect(`suppressions?email_hash=${eq(emailHash)}&select=email_hash&limit=1`, DB));
        // Im Zweifel gesperrt: Eine Antwort, die nicht genau diese Prüfsumme trägt, gilt als Fehler, nicht als "frei".
        if (found.length > 0 && found[0].email_hash !== emailHash) fail();
        return found.length > 0;
      });
    },
    async getSubscription(emailHash) {
      if (!HEX64.test(emailHash)) fail();
      return guarded(async () => {
        const found = rows(await sbSelect(`subscriptions?email_hash=${eq(emailHash)}&select=${COLUMNS}&limit=1`, DB));
        if (found.length === 0) return null;
        const record = toSubscription(found[0]);
        return record.emailHash === emailHash ? record : fail();
      });
    },
    async insertPending(input) {
      if (!HEX64.test(input.emailHash) || !HEX64.test(input.confirmTokenHash) || !TOKEN.test(input.unsubscribeToken)) fail();
      // INSERT ... ON CONFLICT (email_hash) DO NOTHING RETURNING: eine Zeile zurück = neu angelegt.
      return guarded(async () => {
        const inserted = rows(
          await sbInsert(
            'subscriptions?on_conflict=email_hash',
            {
              email_hash: input.emailHash,
              email: input.email,
              lang: input.lang,
              status: 'pending',
              source: input.source,
              consent_version: input.consentVersion,
              consent_text_sha256: input.consentTextSha256,
              requested_at: iso(input.requestedAt),
              confirm_expires_at: iso(input.confirmExpiresAt),
              confirm_token_hashes: [input.confirmTokenHash],
              unsubscribe_token: input.unsubscribeToken,
            },
            { ...DB, prefer: 'resolution=ignore-duplicates' },
          ),
        );
        return inserted.length === 1 && inserted[0].email_hash === input.emailHash;
      });
    },
    async addConfirmToken(emailHash, tokenHash, nowMs) {
      if (!HEX64.test(emailHash) || !HEX64.test(tokenHash)) fail();
      // Lesen, dann schreiben mit dem gelesenen Stand im Filter: Von zwei gleichzeitigen Aufrufen ändert genau einer
      // die Zeile, der andere liest neu. Geschrieben wird nur die Liste der Kennzeichen, nie der Nachweis.
      return guarded(async () => {
        const now = encodeURIComponent(iso(nowMs));
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const found = rows(await sbSelect(`subscriptions?email_hash=${eq(emailHash)}&status=eq.pending&confirm_expires_at=gt.${now}&select=email_hash,confirm_token_hashes,unsubscribe_token&limit=1`, DB));
          if (found.length === 0) return null;
          if (found[0].email_hash !== emailHash) fail();
          const current = tokenHashes(found[0]);
          const unsubscribeToken = text(found[0], 'unsubscribe_token');
          if (!TOKEN.test(unsubscribeToken)) fail();
          if (current.includes(tokenHash)) return { unsubscribeToken };
          if (current.length >= MAX_CONFIRM_TOKENS) return null;
          const updated = rows(
            await sbUpdate(
              `subscriptions?email_hash=${eq(emailHash)}&status=eq.pending&confirm_expires_at=gt.${now}&confirm_token_hashes=eq.${arrayLiteral(current)}`,
              { confirm_token_hashes: [...current, tokenHash], updated_at: iso(nowMs) },
              DB,
            ),
          );
          if (updated.length === 1 && updated[0].email_hash === emailHash) return { unsubscribeToken };
        }
        return null;
      });
    },
    async removeConfirmToken(emailHash, tokenHash) {
      if (!HEX64.test(emailHash) || !HEX64.test(tokenHash)) fail();
      await guarded(async () => {
        for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt++) {
          const found = rows(await sbSelect(`subscriptions?email_hash=${eq(emailHash)}&status=eq.pending&select=email_hash,confirm_token_hashes&limit=1`, DB));
          if (found.length === 0) return;
          const current = tokenHashes(found[0]);
          if (!current.includes(tokenHash) || current.length < 2) return;
          const updated = rows(
            await sbUpdate(
              `subscriptions?email_hash=${eq(emailHash)}&status=eq.pending&confirm_token_hashes=eq.${arrayLiteral(current)}`,
              { confirm_token_hashes: current.filter((hash) => hash !== tokenHash) },
              DB,
            ),
          );
          if (updated.length === 1) return;
        }
      });
    },
    async findPendingByTokenHash(tokenHash, nowMs) {
      if (!HEX64.test(tokenHash)) fail();
      return guarded(async () => {
        const found = rows(
          await sbSelect(`subscriptions?confirm_token_hashes=cs.${arrayLiteral([tokenHash])}&status=eq.pending&confirm_expires_at=gt.${encodeURIComponent(iso(nowMs))}&select=email_hash&limit=2`, DB),
        );
        if (found.length === 0) return null;
        const emailHash = text(found[0], 'email_hash');
        return found.length === 1 && HEX64.test(emailHash) ? { emailHash } : fail();
      });
    },
    async confirmByTokenHash(tokenHash, nowMs) {
      if (!HEX64.test(tokenHash)) fail();
      return guarded(async () => {
        const now = iso(nowMs);
        const updated = rows(
          await sbUpdate(
            `subscriptions?confirm_token_hashes=cs.${arrayLiteral([tokenHash])}&status=eq.pending&confirm_expires_at=gt.${encodeURIComponent(now)}`,
            { status: 'confirmed', confirmed_at: now, confirm_token_hashes: [], updated_at: now },
            DB,
          ),
        );
        if (updated.length === 0) return null;
        const record = toSubscription(updated[0]);
        return updated.length === 1 && record.status === 'confirmed' ? record : fail();
      });
    },
    async unsubscribeByToken(token, nowMs) {
      if (!TOKEN.test(token)) fail();
      return guarded(async () => {
        const found = rows(await sbSelect(`subscriptions?unsubscribe_token=${eq(token)}&select=email_hash,status&limit=1`, DB));
        if (found.length === 0) return null;
        const emailHash = text(found[0], 'email_hash');
        const status = text(found[0], 'status');
        if (!HEX64.test(emailHash)) fail();
        // Reihenfolge: erst die Sperre, dann der Zustand. Bricht der Aufruf dazwischen ab, ist die Adresse gesperrt.
        await sbInsert('suppressions?on_conflict=email_hash', { email_hash: emailHash, reason: 'unsubscribe', created_at: iso(nowMs) }, { ...DB, prefer: 'resolution=ignore-duplicates' });
        if (status === 'unsubscribed') return { emailHash, alreadyUnsubscribed: true };
        const now = iso(nowMs);
        const updated = rows(
          await sbUpdate(
            `subscriptions?email_hash=${eq(emailHash)}&status=neq.unsubscribed`,
            { status: 'unsubscribed', unsubscribed_at: now, confirm_token_hashes: [], updated_at: now },
            DB,
          ),
        );
        return { emailHash, alreadyUnsubscribed: updated.length === 0 };
      });
    },
    async addSuppression(emailHash, reason, nowMs) {
      if (!HEX64.test(emailHash)) fail();
      await guarded(() => sbInsert('suppressions?on_conflict=email_hash', { email_hash: emailHash, reason, created_at: iso(nowMs) }, { ...DB, prefer: 'resolution=ignore-duplicates' }));
    },
    async appendEvent(event) {
      if (!HEX64.test(event.emailHash)) fail();
      await guarded(() =>
        sbInsert(
          'consent_events',
          { email_hash: event.emailHash, type: event.type, consent_version: event.consentVersion.slice(0, 64), source: event.source.slice(0, 64), occurred_at: iso(event.occurredAt) },
          DB,
        ),
      );
    },
    async reserveConfirmationMail(emailHash, nowMs, limits) {
      // Ungültige Grenzen (0, NaN, Bruch) erreichen die Datenbank nicht: Sie würden den Schutz abschalten oder verfälschen.
      if (!HEX64.test(emailHash) || !mailLimitsValid(limits)) fail();
      // Die Datenbank zählt und trägt unter einer Sperre ein; ist eine Grenze erreicht, entsteht keine Zeile.
      return guarded(async () => {
        const inserted = rows(
          await sbInsert(
            'confirmation_mails',
            { email_hash: emailHash, reserved_at: iso(nowMs), address_limit: limits.perAddress, address_window_hours: limits.windowHours, daily_limit: limits.perDay },
            DB,
          ),
        );
        if (inserted.length === 0) return null;
        const id = inserted[0].id;
        return inserted.length === 1 && inserted[0].email_hash === emailHash && typeof id === 'number' && Number.isSafeInteger(id) && id > 0 ? { id } : fail();
      });
    },
    async settleConfirmationMail(reservation, outcome) {
      if (!Number.isSafeInteger(reservation.id) || reservation.id < 1 || (outcome !== 'sent' && outcome !== 'failed')) fail();
      await guarded(async () => {
        const updated = rows(await sbUpdate(`confirmation_mails?id=eq.${reservation.id}&state=eq.reserved`, { state: outcome }, DB));
        if (updated.length !== 1) fail();
      });
    },
    async dailyLimitReached(nowMs, perDay) {
      if (!Number.isInteger(perDay) || perDay < 1 || perDay > MAIL_LIMIT_BOUNDS.perDay[1]) fail();
      return guarded(async () => {
        const since = encodeURIComponent(iso(nowMs - 24 * HOUR_MS));
        return rows(await sbSelect(`confirmation_mails?state=neq.failed&reserved_at=gt.${since}&select=id&limit=${perDay}`, DB)).length >= perDay;
      });
    },
    async purgeExpiredPending(nowMs) {
      // Der Filter nennt den Zustand ausdrücklich; die Datenbank lässt zusätzlich nur das Löschen unbestätigter Zeilen zu.
      await guarded(() => sbDelete(`subscriptions?status=eq.pending&confirm_expires_at=lt.${encodeURIComponent(iso(nowMs))}`, DB));
    },
    async purgeSettledMails(nowMs, windowHours) {
      if (!Number.isInteger(windowHours) || windowHours < 1 || windowHours > MAIL_LIMIT_BOUNDS.windowHours[1]) fail();
      // Die Datenbank lässt dabei jeden Eintrag stehen, der nach ihrer eigenen Uhr noch für eine Grenze zählt.
      await guarded(() => sbDelete(`confirmation_mails?reserved_at=lt.${encodeURIComponent(iso(nowMs - Math.max(windowHours, 24) * HOUR_MS))}`, DB));
    },
  };
  return store;
}

let shared: MailingConsentStore | null = null;
/** Supabase, sobald die Instanz konfiguriert ist; sonst `null` (kein Rückfall auf den Arbeitsspeicher). */
export function getMailingConsentStore(): MailingConsentStore | null {
  if (!supabaseConfigured()) return null;
  shared ??= createSupabaseMailingConsentStore();
  return shared;
}
