/**
 * Kleiner Speicher für die Composio-Anbindung (Verbindungen, Trigger, Ereignisse, Idempotenz).
 *
 * Zwei Implementierungen desselben Interface `ComposioStore`:
 *  - `createSupabaseComposioStore()`: dauerhaft, auf der selbst gehosteten Supabase-Instanz (Schema "composio",
 *    Migration apps/web/supabase/migrations/0004_composio.sql). Zugriff nur serverseitig mit Service-Role über
 *    lib/supabase-rest.ts; Row-Level-Security ist auf jeder Tabelle an, ohne Richtlinie für anon/authenticated.
 *    Die Idempotenz liegt in der Datenbank: eindeutiger Schlüssel auf der Ereignis-Kennung, Einfügen mit
 *    ON CONFLICT DO NOTHING. Von zwei gleichzeitigen Zustellungen gewinnt genau eine.
 *  - `createMemoryComposioStore()`: Arbeitsspeicher EINER Funktionsinstanz. Auf Vercel überlebt er keinen Aufruf
 *    verlässlich; er ist nur der Rückfall ohne Konfiguration und die Grundlage der Tests.
 * `getComposioStore()` wählt Supabase, sobald SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY gesetzt sind.
 *
 * Jeder Datensatz trägt Pflicht-Mandant (tenantId) und Suite-Nutzer (userId). Lesen über Mandant/Nutzer filtert hart.
 * Von einem Ereignis wird nur die Zusammenfassung abgelegt (Trigger-Slug, Trigger-Kennung), nie sein Inhalt.
 */
import { sbDelete, sbInsert, sbSelect, supabaseConfigured, SupabaseTimeoutError, type SbOptions } from './supabase-rest.ts';

export type ConnectionStatus = 'pending' | 'verified' | 'active' | 'expired';

export type ConnectionRecord = {
  connectedAccountId: string;
  tenantId: string;
  userId: string;
  authConfigId: string;
  status: ConnectionStatus;
  updatedAt: number;
};

export type StoredEvent = { eventId: string; type: string; tenantId: string; userId: string; receivedAt: number; summary: Record<string, string> };

export type TriggerRecord = { triggerId: string; slug: string; tenantId: string; userId: string; createdAt: number };

export interface ComposioStore {
  putTrigger(record: TriggerRecord): Promise<void>;
  listTriggers(tenantId: string, userId: string): Promise<TriggerRecord[]>;
  putConnection(record: ConnectionRecord): Promise<void>;
  getConnection(connectedAccountId: string): Promise<ConnectionRecord | null>;
  listConnections(tenantId: string, userId: string): Promise<ConnectionRecord[]>;
  /** true genau beim ersten Mal je Ereignis-Kennung. */
  claimEvent(eventId: string): Promise<boolean>;
  /** Gibt die Kennung frei, wenn die Verarbeitung scheiterte (Composio darf erneut zustellen). */
  releaseEvent(eventId: string): Promise<void>;
  appendEvent(event: StoredEvent): Promise<void>;
  listEvents(tenantId: string, userId: string): Promise<StoredEvent[]>;
}

const MAX_EVENT_IDS = 10_000;
const MAX_EVENTS_PER_TENANT = 200;

export function createMemoryComposioStore(): ComposioStore {
  const connections = new Map<string, ConnectionRecord>();
  const seen = new Set<string>();
  const events = new Map<string, StoredEvent[]>();
  const triggers = new Map<string, TriggerRecord>();
  return {
    async putTrigger(record) {
      if (!record.tenantId || !record.userId) throw new Error('tenant_required');
      triggers.set(record.tenantId + '\u0000' + record.userId + '\u0000' + record.triggerId, { ...record });
    },
    async listTriggers(tenantId, userId) {
      return [...triggers.values()].filter((t) => t.tenantId === tenantId && t.userId === userId).map((t) => ({ ...t }));
    },
    async putConnection(record) {
      if (!record.tenantId || !record.userId) throw new Error('tenant_required');
      connections.set(record.connectedAccountId, { ...record });
    },
    async getConnection(id) {
      const found = connections.get(id);
      return found ? { ...found } : null;
    },
    async listConnections(tenantId, userId) {
      return [...connections.values()].filter((c) => c.tenantId === tenantId && c.userId === userId).map((c) => ({ ...c }));
    },
    async claimEvent(eventId) {
      if (seen.has(eventId)) return false;
      seen.add(eventId);
      if (seen.size > MAX_EVENT_IDS) {
        const oldest = seen.values().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }
      return true;
    },
    async releaseEvent(eventId) {
      seen.delete(eventId);
    },
    async appendEvent(event) {
      if (!event.tenantId || !event.userId) throw new Error('tenant_required');
      const key = event.tenantId + '\u0000' + event.userId;
      const list = events.get(key) ?? [];
      list.push({ ...event });
      if (list.length > MAX_EVENTS_PER_TENANT) list.shift();
      events.set(key, list);
    },
    async listEvents(tenantId, userId) {
      return (events.get(tenantId + '\u0000' + userId) ?? []).map((e) => ({ ...e }));
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Supabase (self-hosted, PostgREST): Schema "composio"
// ---------------------------------------------------------------------------------------------------------------

export type ComposioStoreErrorCode = 'composio_store_not_configured' | 'composio_store_timeout' | 'composio_store_failed';

/**
 * Einziger Fehler, den der Supabase-Speicher nach außen gibt. Die Meldung ist nur der Code: keine Adresse, kein
 * Schlüssel, kein Pfad, kein Antworttext der Datenbank und keine Nutzdaten. Der ursprüngliche Fehler wird bewusst
 * nicht als `cause` angehängt, damit er auch über ein Protokoll nicht nach außen gelangt.
 */
export class ComposioStoreError extends Error {
  readonly code: ComposioStoreErrorCode;
  constructor(code: ComposioStoreErrorCode) {
    super(code);
    this.name = 'ComposioStoreError';
    this.code = code;
  }
}

const COMPOSIO_SCHEMA = 'composio';
const DB: SbOptions = { schema: COMPOSIO_SCHEMA };
const SUMMARY_MAX = 256;
const STATUSES: readonly ConnectionStatus[] = ['pending', 'verified', 'active', 'expired'];

type DbRow = Record<string, unknown>;

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ComposioStoreError) throw error;
    if (error instanceof SupabaseTimeoutError) throw new ComposioStoreError('composio_store_timeout');
    if (error instanceof Error && error.message === 'supabase_not_configured') throw new ComposioStoreError('composio_store_not_configured');
    throw new ComposioStoreError('composio_store_failed');
  }
}

const eq = (value: string) => 'eq.' + encodeURIComponent(value);

function text(row: DbRow, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') throw new ComposioStoreError('composio_store_failed');
  return value;
}
/** Pflichtfeld: eine Zeile ohne Mandant oder Nutzer wird nie als Datensatz herausgegeben. */
function required(row: DbRow, column: string): string {
  const value = text(row, column);
  if (!value) throw new ComposioStoreError('composio_store_failed');
  return value;
}
function toIso(ms: number): string {
  if (!Number.isFinite(ms)) throw new ComposioStoreError('composio_store_failed');
  return new Date(ms).toISOString();
}
function toMs(row: DbRow, column: string): number {
  const ms = Date.parse(text(row, column));
  if (!Number.isFinite(ms)) throw new ComposioStoreError('composio_store_failed');
  return ms;
}
function rows(value: unknown): DbRow[] {
  if (!Array.isArray(value)) throw new ComposioStoreError('composio_store_failed');
  return value as DbRow[];
}

function toConnection(row: DbRow): ConnectionRecord {
  const status = text(row, 'status') as ConnectionStatus;
  if (!STATUSES.includes(status)) throw new ComposioStoreError('composio_store_failed');
  return {
    connectedAccountId: required(row, 'connected_account_id'),
    tenantId: required(row, 'tenant_id'),
    userId: required(row, 'user_id'),
    authConfigId: text(row, 'auth_config_id'),
    status,
    updatedAt: toMs(row, 'updated_at'),
  };
}
function toTrigger(row: DbRow): TriggerRecord {
  return {
    triggerId: required(row, 'trigger_id'),
    slug: text(row, 'slug'),
    tenantId: required(row, 'tenant_id'),
    userId: required(row, 'user_id'),
    createdAt: toMs(row, 'created_at'),
  };
}
function toEvent(row: DbRow): StoredEvent {
  return {
    eventId: required(row, 'event_id'),
    type: text(row, 'type'),
    tenantId: required(row, 'tenant_id'),
    userId: required(row, 'user_id'),
    receivedAt: toMs(row, 'received_at'),
    summary: { trigger_slug: text(row, 'trigger_slug'), trigger_id: text(row, 'trigger_id') },
  };
}
const owner = (tenantId: string, userId: string) => `tenant_id=${eq(tenantId)}&user_id=${eq(userId)}`;
/** Zweite, harte Schranke hinter dem Filter der Abfrage: nur Zeilen genau dieses Mandanten und Nutzers. */
const owned = <T extends { tenantId: string; userId: string }>(list: T[], tenantId: string, userId: string): T[] =>
  list.filter((entry) => entry.tenantId === tenantId && entry.userId === userId);

/**
 * Dauerhafter Speicher auf der selbst gehosteten Supabase-Instanz (PostgREST, Schema "composio").
 * Ohne SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY scheitert jeder Zugriff mit `composio_store_not_configured`.
 */
export function createSupabaseComposioStore(): ComposioStore {
  return {
    async putTrigger(record) {
      if (!record.tenantId || !record.userId) throw new Error('tenant_required');
      await guarded(() =>
        sbInsert(
          'triggers?on_conflict=tenant_id,user_id,trigger_id',
          { trigger_id: record.triggerId, slug: record.slug, tenant_id: record.tenantId, user_id: record.userId, created_at: toIso(record.createdAt) },
          { ...DB, prefer: 'resolution=merge-duplicates' },
        ),
      );
    },
    async listTriggers(tenantId, userId) {
      if (!tenantId || !userId) return [];
      return guarded(async () => {
        const found = rows(await sbSelect(`triggers?${owner(tenantId, userId)}&select=trigger_id,slug,tenant_id,user_id,created_at&order=created_at.asc,trigger_id.asc`, DB));
        return owned(found.map(toTrigger), tenantId, userId);
      });
    },
    async putConnection(record) {
      if (!record.tenantId || !record.userId) throw new Error('tenant_required');
      // Mandant und Nutzer einer bestehenden Verbindung lässt die Datenbank nicht ändern (Trigger in der Migration).
      await guarded(() =>
        sbInsert(
          'connections?on_conflict=connected_account_id',
          {
            connected_account_id: record.connectedAccountId,
            tenant_id: record.tenantId,
            user_id: record.userId,
            auth_config_id: record.authConfigId,
            status: record.status,
            updated_at: toIso(record.updatedAt),
          },
          { ...DB, prefer: 'resolution=merge-duplicates' },
        ),
      );
    },
    async getConnection(connectedAccountId) {
      if (!connectedAccountId) return null;
      return guarded(async () => {
        const found = rows(
          await sbSelect(`connections?connected_account_id=${eq(connectedAccountId)}&select=connected_account_id,tenant_id,user_id,auth_config_id,status,updated_at&limit=1`, DB),
        );
        const record = found.length > 0 ? toConnection(found[0]) : null;
        return record && record.connectedAccountId === connectedAccountId ? record : null;
      });
    },
    async listConnections(tenantId, userId) {
      if (!tenantId || !userId) return [];
      return guarded(async () => {
        const found = rows(
          await sbSelect(`connections?${owner(tenantId, userId)}&select=connected_account_id,tenant_id,user_id,auth_config_id,status,updated_at&order=created_at.asc,connected_account_id.asc`, DB),
        );
        return owned(found.map(toConnection), tenantId, userId);
      });
    },
    async claimEvent(eventId) {
      if (!eventId) throw new ComposioStoreError('composio_store_failed');
      // INSERT ... ON CONFLICT (event_id) DO NOTHING RETURNING: die Datenbank entscheidet in einer Anweisung.
      // Eine zurückgegebene Zeile = diese Zustellung hat gewonnen; keine Zeile = die Kennung war schon vergeben.
      return guarded(async () => {
        const inserted = rows(await sbInsert('event_claims?on_conflict=event_id', { event_id: eventId }, { ...DB, prefer: 'resolution=ignore-duplicates' }));
        return inserted.length === 1 && inserted[0].event_id === eventId;
      });
    },
    async releaseEvent(eventId) {
      if (!eventId) return;
      await guarded(() => sbDelete(`event_claims?event_id=${eq(eventId)}`, DB));
    },
    async appendEvent(event) {
      if (!event.tenantId || !event.userId) throw new Error('tenant_required');
      // Nur die beiden Felder der Zusammenfassung; alles andere an `summary` wird nicht gespeichert.
      // Dieselbe Ereignis-Kennung ein zweites Mal (Wiederzustellung nach einem Fehler) legt keine zweite Zeile an.
      await guarded(() =>
        sbInsert(
          'events?on_conflict=event_id',
          {
            event_id: event.eventId,
            type: event.type,
            tenant_id: event.tenantId,
            user_id: event.userId,
            received_at: toIso(event.receivedAt),
            trigger_slug: String(event.summary.trigger_slug ?? '').slice(0, SUMMARY_MAX),
            trigger_id: String(event.summary.trigger_id ?? '').slice(0, SUMMARY_MAX),
          },
          { ...DB, prefer: 'resolution=ignore-duplicates' },
        ),
      );
    },
    async listEvents(tenantId, userId) {
      if (!tenantId || !userId) return [];
      return guarded(async () => {
        // Wie der Arbeitsspeicher: die jüngsten 200, ältestes zuerst.
        const found = rows(
          await sbSelect(
            `events?${owner(tenantId, userId)}&select=event_id,type,tenant_id,user_id,received_at,trigger_slug,trigger_id&order=received_at.desc,id.desc&limit=${MAX_EVENTS_PER_TENANT}`,
            DB,
          ),
        );
        return owned(found.map(toEvent), tenantId, userId).reverse();
      });
    },
  };
}

let shared: { store: ComposioStore; durable: boolean } | null = null;
/** Supabase, sobald die Instanz konfiguriert ist; sonst wie bisher der Arbeitsspeicher. */
export function getComposioStore(): ComposioStore {
  const durable = supabaseConfigured();
  if (!shared || shared.durable !== durable) shared = { store: durable ? createSupabaseComposioStore() : createMemoryComposioStore(), durable };
  return shared.store;
}
