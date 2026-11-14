/**
 * Kleiner Speicher für die Composio-Anbindung (Verbindungen, offene Versuche, Ereignisse, Idempotenz).
 *
 * GRENZE (ehrlich): Die Standardimplementierung liegt im Arbeitsspeicher EINER Funktionsinstanz. Auf Vercel/Workers
 * laufen mehrere Instanzen und starten neu; Idempotenz und Verbindungsstatus sind damit nicht verlässlich.
 * TODO echte Datenbank: Implementierung von `ComposioStore` gegen die Suite-Tabellen (Mandant mit RLS,
 * eindeutiger Schlüssel auf die Ereignis-Kennung). Bis dahin bleibt NEXIFY_SUITE_COMPOSIO aus.
 *
 * Jeder Datensatz trägt Pflicht-Mandant (tenantId) und Suite-Nutzer (userId). Lesen über Mandant/Nutzer filtert hart.
 */

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

export interface ComposioStore {
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
  return {
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

let shared: ComposioStore | null = null;
export function getComposioStore(): ComposioStore {
  return (shared ??= createMemoryComposioStore());
}
