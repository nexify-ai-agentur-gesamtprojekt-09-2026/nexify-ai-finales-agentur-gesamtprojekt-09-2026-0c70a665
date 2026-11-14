/**
 * Handler für Trigger-Anlage/-Liste und die Ereignis-Lese-Schnittstelle der Composio-Anbindung.
 * Nutzer und Mandant kommen ausschließlich aus der serverseitig geprüften Suite-Sitzung, nie aus Query, Body oder Header.
 */
import { COMPOSIO_CONFIG, COMPOSIO_ID, TRIGGER_SLUG, ComposioError, composioEnabled } from './composio.ts';
import { getComposioStore } from './composio-store.ts';
import { crossOrigin, makeClient, type RouteDeps } from './composio-routes.ts';
import { shopApiSessionResolver } from './suite-session.ts';

const PRIVATE = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const reply = (body: Record<string, unknown>, status: number): Response => Response.json(body, { status, headers: PRIVATE });

export const EVENTS_MAX_LIMIT = 100;
export const EVENTS_DEFAULT_LIMIT = 50;

export async function handleTriggerCreate(request: Request, deps: RouteDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const session = await (deps.resolveSession ?? shopApiSessionResolver(env))(request);
  if (!session) return reply({ error: 'authentication_required' }, 401);
  if (crossOrigin(request)) return reply({ error: 'cross_origin_forbidden' }, 403);

  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: 'invalid_json' }, 400);
  }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  const allowed: readonly string[] = COMPOSIO_CONFIG.erlaubte_trigger_slugs;
  // Allowlist aus der Konfiguration; leer = nichts erlaubt.
  if (!TRIGGER_SLUG.test(slug) || !allowed.includes(slug)) return reply({ error: 'trigger_slug_not_allowed' }, 422);
  const triggerConfig = body.trigger_config ?? {};
  if (!triggerConfig || typeof triggerConfig !== 'object' || Array.isArray(triggerConfig)) return reply({ error: 'invalid_trigger_config' }, 422);

  const store = deps.store ?? getComposioStore();
  let connectedAccountId: string | undefined;
  if (body.connected_account_id !== undefined) {
    const id = typeof body.connected_account_id === 'string' ? body.connected_account_id : '';
    const record = COMPOSIO_ID.test(id) ? await store.getConnection(id) : null;
    // Nur eigene Verbindungen; fremde oder unbekannte einheitlich 403.
    if (!record || record.tenantId !== session.tenantId || record.userId !== session.userId) return reply({ error: 'connection_not_allowed' }, 403);
    connectedAccountId = id;
  }

  const client = makeClient(deps, env);
  if (!client) return reply({ error: 'composio_not_configured' }, 503);
  try {
    // Fail-closed: der Trigger-Typ muss bei Composio existieren und ein Schema liefern.
    await client.getTriggerType(slug);
    // Composio-Nutzerkennung = Suite-Nutzer der Sitzung.
    const { triggerId } = await client.createTrigger(session.userId, slug, triggerConfig as Record<string, unknown>, connectedAccountId);
    await store.putTrigger({ triggerId, slug, tenantId: session.tenantId, userId: session.userId, createdAt: deps.nowMs?.() ?? Date.now() });
    return reply({ trigger_id: triggerId, slug }, 200);
  } catch (error) {
    if (error instanceof ComposioError && error.code === 'composio_not_configured') return reply({ error: error.code }, 503);
    return reply({ error: 'composio_upstream_failed' }, 502);
  }
}

export async function handleTriggerList(request: Request, deps: RouteDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const session = await (deps.resolveSession ?? shopApiSessionResolver(env))(request);
  if (!session) return reply({ error: 'authentication_required' }, 401);
  const store = deps.store ?? getComposioStore();
  const triggers = await store.listTriggers(session.tenantId, session.userId);
  return reply({ triggers: triggers.map((t) => ({ trigger_id: t.triggerId, slug: t.slug, created_at: t.createdAt })) }, 200);
}

/** Ereignisse des angemeldeten Nutzers, neueste zuerst. Query: nur `limit` (1..100) und `offset`. */
export async function handleEventsList(request: Request, deps: RouteDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const session = await (deps.resolveSession ?? shopApiSessionResolver(env))(request);
  if (!session) return reply({ error: 'authentication_required' }, 401);

  const params = new URL(request.url).searchParams;
  const num = (name: string, fallback: number): number | null => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    return /^\d{1,6}$/.test(raw) ? Number(raw) : null;
  };
  const limit = num('limit', EVENTS_DEFAULT_LIMIT);
  const offset = num('offset', 0);
  if (limit === null || offset === null || limit < 1) return reply({ error: 'invalid_paging' }, 422);
  const effective = Math.min(limit, EVENTS_MAX_LIMIT);

  const store = deps.store ?? getComposioStore();
  const all = (await store.listEvents(session.tenantId, session.userId)).sort((a, b) => b.receivedAt - a.receivedAt);
  const page = all.slice(offset, offset + effective);
  return reply(
    {
      events: page.map((e) => ({ event_id: e.eventId, type: e.type, received_at: e.receivedAt, summary: e.summary })),
      total: all.length,
      limit: effective,
      offset,
      next_offset: offset + effective < all.length ? offset + effective : null,
    },
    200,
  );
}
