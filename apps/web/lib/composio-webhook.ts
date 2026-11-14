/**
 * Composio-Webhook V3: Signaturprüfung und Ereignisverarbeitung (rein, ohne Netz).
 *
 * Verfahren laut Composio-Doku (https://docs.composio.dev/docs/webhook-verification):
 *  - Header: webhook-signature, webhook-id, webhook-timestamp
 *  - HMAC-SHA256 über `${webhook-id}.${webhook-timestamp}.${roher Body}` mit COMPOSIO_WEBHOOK_SECRET, Base64
 *  - webhook-signature: Teil nach dem ersten Komma, sonst der ganze Wert (Beispielcode der Doku); mehrere Werte
 *    dürfen leerzeichengetrennt vorkommen
 *  - Zeitfenster 300 s gegen Wiederholung
 * Der Algorithmus steht nur in `computeSignature` und `extractSignatures` (austauschbar).
 * Nichts Geheimes gelangt in Fehlertexte oder Protokoll.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { COMPOSIO_CONFIG, composioWebhookEnabled, type ComposioEnv } from './composio.ts';
import { getAgentPort, type AgentEreignisPort } from './composio-agent-port.ts';
import { getComposioStore, type ComposioStore, type StoredEvent } from './composio-store.ts';

export const SIGNATURE_TOLERANCE_SECONDS: number = COMPOSIO_CONFIG.webhook.signatur.toleranz_sekunden;
export const MAX_BODY_BYTES = 1024 * 1024;
export const HANDLED_EVENTS: readonly string[] = COMPOSIO_CONFIG.webhook.ereignisse;

export function computeSignature(secret: string, webhookId: string, timestamp: string, rawBody: string): string {
  return createHmac('sha256', secret).update(`${webhookId}.${timestamp}.${rawBody}`).digest('base64');
}

function extractSignatures(header: string): string[] {
  return header
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.includes(',') ? part.slice(part.indexOf(',') + 1) : part));
}

export type VerifyInput = { secret: string | undefined; webhookId: string | null; timestamp: string | null; signature: string | null; rawBody: string; nowMs?: number };
export type VerifyResult = { ok: true } | { ok: false; reason: 'no_secret' | 'missing_header' | 'stale_timestamp' | 'bad_signature' };

export function verifyWebhookSignature(input: VerifyInput): VerifyResult {
  if (!input.secret) return { ok: false, reason: 'no_secret' };
  if (!input.webhookId || !input.timestamp || !input.signature) return { ok: false, reason: 'missing_header' };
  if (!/^\d{1,12}$/.test(input.timestamp)) return { ok: false, reason: 'stale_timestamp' };
  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - Number(input.timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: 'stale_timestamp' };
  const expected = Buffer.from(computeSignature(input.secret, input.webhookId, input.timestamp, input.rawBody));
  for (const candidate of extractSignatures(input.signature)) {
    const received = Buffer.from(candidate);
    if (received.length === expected.length && timingSafeEqual(received, expected)) return { ok: true };
  }
  return { ok: false, reason: 'bad_signature' };
}

export type WebhookDeps = { env?: ComposioEnv; store?: ComposioStore; nowMs?: () => number; agentPort?: AgentEreignisPort };

function reply(body: Record<string, unknown>, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : null;
}
function obj(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** GET & Co. auf den Webhook-Pfad. */
export function webhookMethodNotAllowed(): Response {
  return reply({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
}

export async function handleComposioWebhook(request: Request, deps: WebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioWebhookEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const secret = env.COMPOSIO_WEBHOOK_SECRET;
  if (!secret) return reply({ error: 'invalid_signature' }, 401);

  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES) return reply({ error: 'payload_too_large' }, 413);
  // Roher Body, unverändert: nur so stimmt die Signatur.
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) return reply({ error: 'payload_too_large' }, 413);

  const webhookId = request.headers.get('webhook-id');
  const verdict = verifyWebhookSignature({
    secret,
    webhookId,
    timestamp: request.headers.get('webhook-timestamp'),
    signature: request.headers.get('webhook-signature'),
    rawBody,
    nowMs: deps.nowMs?.(),
  });
  if (!verdict.ok) {
    console.warn(JSON.stringify({ event: 'composio_webhook_rejected', reason: verdict.reason }));
    return reply({ error: 'invalid_signature' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = obj(JSON.parse(rawBody));
  } catch {
    return reply({ error: 'invalid_json' }, 400);
  }
  const type = str(payload.type);
  const eventId = str(webhookId);
  if (!type || !eventId) return reply({ error: 'invalid_event' }, 400);
  if (!HANDLED_EVENTS.includes(type)) return reply({ status: 'ignored', reason: 'unhandled_type' }, 200);

  const store = deps.store ?? getComposioStore();
  // Je Ereignis-Kennung höchstens einmal. Scheitert die Verarbeitung, wird die Kennung freigegeben (Wiederzustellung).
  if (!(await store.claimEvent(eventId))) return reply({ status: 'duplicate' }, 200);
  try {
    const outcome = await processEvent(store, deps.agentPort ?? getAgentPort(), type, eventId, payload, deps.nowMs?.() ?? Date.now());
    return reply({ status: outcome }, 200);
  } catch {
    await store.releaseEvent(eventId);
    console.error(JSON.stringify({ event: 'composio_webhook_failed', type }));
    return reply({ error: 'processing_failed' }, 500);
  }
}

async function processEvent(store: ComposioStore, port: AgentEreignisPort, type: string, eventId: string, payload: Record<string, unknown>, nowMs: number): Promise<'processed' | 'ignored'> {
  const data = obj(payload.data);
  const metadata = obj(payload.metadata);
  const accountId = type.startsWith('composio.connected_account.') ? str(data.id) : str(metadata.connected_account_id) ?? str(data.connected_account_id);
  // Mandant und Nutzer kommen ausschließlich aus der Verbindung, die die Suite selbst angelegt hat – nie aus dem Ereignis.
  const record = accountId ? await store.getConnection(accountId) : null;
  if (!record) return 'ignored';

  switch (type) {
    case 'composio.connected_account.activated':
      await store.putConnection({ ...record, status: 'active', updatedAt: nowMs });
      break;
    case 'composio.connected_account.expired':
      await store.putConnection({ ...record, status: 'expired', updatedAt: nowMs });
      break;
    case 'composio.trigger.message':
    case 'composio.trigger.disabled':
      // Ereignis mandantengebunden ablegen, danach (genau einmal je neuem Ereignis, durch claimEvent) an die Übergabestelle.
      const stored: StoredEvent = {
        eventId,
        type,
        tenantId: record.tenantId,
        userId: record.userId,
        receivedAt: nowMs,
        summary: { trigger_slug: str(metadata.trigger_slug) ?? '', trigger_id: str(metadata.trigger_id) ?? '' },
      };
      await store.appendEvent(stored);
      try {
        await port.ereignisAngelegt(stored);
      } catch {
        // Ein Fehler der Übergabestelle darf das bereits abgelegte Ereignis nicht erneut zustellen lassen.
        console.error(JSON.stringify({ event: 'composio_agent_port_failed', type }));
      }
      break;
  }
  return 'processed';
}
