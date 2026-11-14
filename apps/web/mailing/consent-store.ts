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
 */
import { sbDelete, sbInsert, sbSelect, sbUpdate, supabaseConfigured, SupabaseTimeoutError, type SbOptions } from '../lib/supabase-rest.ts';

export type MailingLang = 'de' | 'nl' | 'fr' | 'en';
export type SubscriptionStatus = 'pending' | 'confirmed' | 'unsubscribed';
export type SuppressionReason = 'unsubscribe' | 'objection' | 'hard_bounce' | 'complaint' | 'manual';
export type ConsentEventType = 'requested' | 'confirmation_resent' | 'confirmed' | 'unsubscribed';

/** Was von einer Anmeldung gelesen wird. Kennzeichen (Token) werden nie herausgegeben, nur geprüft. */
export type Subscription = {
  emailHash: string;
  email: string;
  lang: MailingLang;
  status: SubscriptionStatus;
  source: string;
  consentVersion: string;
  consentTextSha256: string;
  requestedAt: number;
  confirmedAt: number | null;
  unsubscribedAt: number | null;
  confirmMailsSent: number;
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

export type RenewInput = Omit<PendingInput, 'emailHash' | 'email' | 'unsubscribeToken'>;

export type ConsentEvent = { emailHash: string; type: ConsentEventType; consentVersion: string; source: string; occurredAt: number };

export interface MailingConsentStore {
  isSuppressed(emailHash: string): Promise<boolean>;
  getSubscription(emailHash: string): Promise<Subscription | null>;
  /** Legt eine unbestätigte Anmeldung an. `false`, wenn es zu dieser Adresse schon eine Zeile gibt. */
  insertPending(input: PendingInput): Promise<boolean>;
  /**
   * Erneuert Kennzeichen, Frist und Wortlaut-Fassung einer unbestätigten Anmeldung und zählt die Mail.
   * `false`, wenn die Zeile inzwischen nicht mehr unbestätigt ist oder ein anderer Aufruf schneller war.
   */
  renewPending(emailHash: string, expectedMailsSent: number, input: RenewInput): Promise<boolean>;
  /** Bestätigt genau die unbestätigte, nicht verfallene Anmeldung zu diesem Kennzeichen. Sonst `null`. */
  confirmByTokenHash(tokenHash: string, nowMs: number): Promise<Subscription | null>;
  /**
   * Meldet ab: erst Eintrag auf der Sperrliste, dann Zustand. Beliebig oft wiederholbar.
   * `null`, wenn das Kennzeichen unbekannt ist.
   */
  unsubscribeByToken(token: string, nowMs: number): Promise<{ emailHash: string; alreadyUnsubscribed: boolean } | null>;
  addSuppression(emailHash: string, reason: SuppressionReason, nowMs: number): Promise<void>;
  appendEvent(event: ConsentEvent): Promise<void>;
  /** Löscht unbestätigte Anmeldungen, deren Frist abgelaufen ist. Bestätigte und abgemeldete bleiben. */
  purgeExpiredPending(nowMs: number): Promise<void>;
}

const HEX64 = /^[0-9a-f]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

type MemoryRow = Subscription & { confirmTokenHash: string | null; confirmExpiresAt: number | null; unsubscribeToken: string };

/** Nur für Tests. Verhält sich wie die Datenbank samt ihrer Sperren (Zustand nur vorwärts, Sperrliste nur Anfügen). */
export function createMemoryMailingConsentStore(): MailingConsentStore & { events: ConsentEvent[]; suppressions: Map<string, SuppressionReason> } {
  const subscriptions = new Map<string, MemoryRow>();
  const suppressions = new Map<string, SuppressionReason>();
  const events: ConsentEvent[] = [];
  const view = (row: MemoryRow): Subscription => {
    const { confirmTokenHash: _hash, confirmExpiresAt: _expires, unsubscribeToken: _token, ...rest } = row;
    return { ...rest };
  };
  return {
    events,
    suppressions,
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
        confirmedAt: null,
        unsubscribedAt: null,
        confirmMailsSent: 1,
        confirmTokenHash: input.confirmTokenHash,
        confirmExpiresAt: input.confirmExpiresAt,
        unsubscribeToken: input.unsubscribeToken,
      });
      return true;
    },
    async renewPending(emailHash, expectedMailsSent, input) {
      const row = subscriptions.get(emailHash);
      if (!row || row.status !== 'pending' || row.confirmMailsSent !== expectedMailsSent) return false;
      Object.assign(row, {
        lang: input.lang,
        source: input.source,
        consentVersion: input.consentVersion,
        consentTextSha256: input.consentTextSha256,
        requestedAt: input.requestedAt,
        confirmTokenHash: input.confirmTokenHash,
        confirmExpiresAt: input.confirmExpiresAt,
        confirmMailsSent: expectedMailsSent + 1,
      });
      return true;
    },
    async confirmByTokenHash(tokenHash, nowMs) {
      for (const row of subscriptions.values()) {
        if (row.status === 'pending' && row.confirmTokenHash === tokenHash && row.confirmExpiresAt !== null && row.confirmExpiresAt > nowMs) {
          Object.assign(row, { status: 'confirmed', confirmedAt: nowMs, confirmTokenHash: null, confirmExpiresAt: null });
          return view(row);
        }
      }
      return null;
    },
    async unsubscribeByToken(token, nowMs) {
      for (const row of subscriptions.values()) {
        if (row.unsubscribeToken !== token) continue;
        if (!suppressions.has(row.emailHash)) suppressions.set(row.emailHash, 'unsubscribe');
        if (row.status === 'unsubscribed') return { emailHash: row.emailHash, alreadyUnsubscribed: true };
        Object.assign(row, { status: 'unsubscribed', unsubscribedAt: nowMs, confirmTokenHash: null, confirmExpiresAt: null });
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
    async purgeExpiredPending(nowMs) {
      for (const [key, row] of subscriptions) {
        if (row.status === 'pending' && row.confirmExpiresAt !== null && row.confirmExpiresAt < nowMs) subscriptions.delete(key);
      }
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
const COLUMNS = 'email_hash,email,lang,status,source,consent_version,consent_text_sha256,requested_at,confirmed_at,unsubscribed_at,confirm_mails_sent';

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
  const sent = row.confirm_mails_sent;
  if (!STATUSES.includes(status) || !LANGS.includes(lang) || typeof sent !== 'number' || !Number.isInteger(sent)) fail();
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
    confirmedAt: optionalTime(row, 'confirmed_at'),
    unsubscribedAt: optionalTime(row, 'unsubscribed_at'),
    confirmMailsSent: sent as number,
  };
}

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
              confirm_token_hash: input.confirmTokenHash,
              confirm_expires_at: iso(input.confirmExpiresAt),
              confirm_mails_sent: 1,
              unsubscribe_token: input.unsubscribeToken,
            },
            { ...DB, prefer: 'resolution=ignore-duplicates' },
          ),
        );
        return inserted.length === 1 && inserted[0].email_hash === input.emailHash;
      });
    },
    async renewPending(emailHash, expectedMailsSent, input) {
      if (!HEX64.test(emailHash) || !HEX64.test(input.confirmTokenHash) || !Number.isInteger(expectedMailsSent) || expectedMailsSent < 0) fail();
      // Der Filter trägt den erwarteten Zustand und den erwarteten Zählerstand: Von zwei gleichzeitigen
      // Erneuerungen ändert genau eine die Zeile, die andere bekommt keine Zeile zurück und sendet nicht.
      return guarded(async () => {
        const updated = rows(
          await sbUpdate(
            `subscriptions?email_hash=${eq(emailHash)}&status=eq.pending&confirm_mails_sent=eq.${expectedMailsSent}`,
            {
              lang: input.lang,
              source: input.source,
              consent_version: input.consentVersion,
              consent_text_sha256: input.consentTextSha256,
              requested_at: iso(input.requestedAt),
              confirm_token_hash: input.confirmTokenHash,
              confirm_expires_at: iso(input.confirmExpiresAt),
              confirm_mails_sent: expectedMailsSent + 1,
              updated_at: iso(input.requestedAt),
            },
            DB,
          ),
        );
        return updated.length === 1 && updated[0].email_hash === emailHash;
      });
    },
    async confirmByTokenHash(tokenHash, nowMs) {
      if (!HEX64.test(tokenHash)) fail();
      return guarded(async () => {
        const now = iso(nowMs);
        const updated = rows(
          await sbUpdate(
            `subscriptions?confirm_token_hash=${eq(tokenHash)}&status=eq.pending&confirm_expires_at=gt.${encodeURIComponent(now)}`,
            { status: 'confirmed', confirmed_at: now, confirm_token_hash: null, confirm_expires_at: null, updated_at: now },
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
            { status: 'unsubscribed', unsubscribed_at: now, confirm_token_hash: null, confirm_expires_at: null, updated_at: now },
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
    async purgeExpiredPending(nowMs) {
      // Der Filter nennt den Zustand ausdrücklich; die Datenbank lässt zusätzlich nur das Löschen unbestätigter Zeilen zu.
      await guarded(() => sbDelete(`subscriptions?status=eq.pending&confirm_expires_at=lt.${encodeURIComponent(iso(nowMs))}`, DB));
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
