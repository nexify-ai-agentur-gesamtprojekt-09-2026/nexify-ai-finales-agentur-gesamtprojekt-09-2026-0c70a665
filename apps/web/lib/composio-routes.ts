/**
 * Handler für Connect-Link und Nutzerprüfung (OAuth user verification). Rein über Abhängigkeiten
 * (Sitzung, Speicher, Client), damit sie ohne Netz testbar sind. Die Route-Dateien sind dünne Hüllen.
 */
import { createHash } from 'node:crypto';
import { COMPOSIO_CONFIG, COMPOSIO_ID, COMPOSIO_VERIFY_PATH, SESSION_URI, ComposioError, composioEnabled, createComposioClient, type ComposioClient, type ComposioEnv } from './composio.ts';
import { getComposioStore, type ComposioStore } from './composio-store.ts';
import { shopApiSessionResolver, type SessionResolver } from './suite-session.ts';

export type RouteDeps = { env?: ComposioEnv; store?: ComposioStore; resolveSession?: SessionResolver; client?: ComposioClient; nowMs?: () => number };

const PRIVATE = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Authorization' };
const reply = (body: Record<string, unknown>, status: number): Response => Response.json(body, { status, headers: PRIVATE });

/** Schreibende Browser-Aufrufe nur von der eigenen Seite (wie /api/chat). */
export function crossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'cross-site';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export function makeClient(deps: RouteDeps, env: ComposioEnv): ComposioClient | null {
  if (deps.client) return deps.client;
  try {
    return createComposioClient({ env });
  } catch {
    return null;
  }
}

export async function handleConnect(request: Request, deps: RouteDeps = {}): Promise<Response> {
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
  const authConfigId = typeof body.auth_config_id === 'string' ? body.auth_config_id : '';
  const allowed: readonly string[] = COMPOSIO_CONFIG.erlaubte_auth_config_ids;
  // Allowlist aus der Konfiguration; leer = nichts erlaubt.
  if (!COMPOSIO_ID.test(authConfigId) || !allowed.includes(authConfigId)) return reply({ error: 'auth_config_not_allowed' }, 422);

  const client = makeClient(deps, env);
  if (!client) return reply({ error: 'composio_not_configured' }, 503);
  const store = deps.store ?? getComposioStore();
  try {
    const link = await client.createConnectLink({
      // Composio-Nutzerkennung = Suite-Nutzer: die Verbindung gehört genau diesem Konto.
      userId: session.userId,
      authConfigId,
      callbackUrl: COMPOSIO_CONFIG.public_origin + COMPOSIO_VERIFY_PATH,
    });
    await store.putConnection({
      connectedAccountId: link.connectedAccountId,
      tenantId: session.tenantId,
      userId: session.userId,
      authConfigId,
      status: 'pending',
      updatedAt: deps.nowMs?.() ?? Date.now(),
    });
    return reply({ redirect_url: link.redirectUrl, connected_account_id: link.connectedAccountId }, 200);
  } catch (error) {
    if (error instanceof ComposioError && error.code === 'composio_not_configured') return reply({ error: error.code }, 503);
    return reply({ error: 'composio_upstream_failed' }, 502);
  }
}

/** Ziel nach erfolgreicher Verbindung (nur Pfad, fest; nie aus Query/Header). */
export const COMPOSIO_VERIFIED_REDIRECT = '/?composio=verified';

/**
 * OAuth Identity-Verification (belegt, Composio-Doku 14.11.2026): Composio leitet den Browser mit NUR `session_uri` hierher.
 * Der Server ruft `complete_auth { session_uri, user_id }`; `user_id` ist ausschließlich die Suite-Sitzungs-Nutzer-ID.
 * Composio prüft den Besitzer (400 bei Fremdem). Query-Parameter außer `session_uri` werden ignoriert.
 * `session_uri` ist einmalig: ein zweiter Einlösungsversuch wird lokal abgewiesen (Composio selbst antwortet dann 404).
 */
export async function handleVerify(request: Request, deps: RouteDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const session = await (deps.resolveSession ?? shopApiSessionResolver(env))(request);
  if (!session) return reply({ error: 'authentication_required' }, 401);

  const sessionUri = new URL(request.url).searchParams.get('session_uri') ?? '';
  if (!SESSION_URI.test(sessionUri)) return reply({ error: 'session_uri_required' }, 400);

  const client = makeClient(deps, env);
  if (!client) return reply({ error: 'composio_not_configured' }, 503);
  const store = deps.store ?? getComposioStore();

  // Einmaligkeit: nur ein Hash wird gemerkt, nie die URI selbst. Verbraucht auch bei Fehlern, daher keine Freigabe.
  const claimKey = 'session_uri:' + createHash('sha256').update(sessionUri).digest('hex');
  if (!(await store.claimEvent(claimKey))) return reply({ error: 'session_uri_already_used' }, 409);

  let result: { connectedAccountId: string; toolkitSlug: string };
  try {
    result = await client.completeAuth({ sessionUri, userId: session.userId });
  } catch (error) {
    const status = error instanceof ComposioError ? error.upstreamStatus : undefined;
    if (error instanceof ComposioError && error.code === 'composio_not_configured') return reply({ error: error.code }, 503);
    // 400: user_id ist nicht der Besitzer der Verbindung. 404: unbekannt, abgelaufen oder schon verbraucht.
    if (status === 400) return reply({ error: 'verification_mismatch' }, 403);
    if (status === 404) return reply({ error: 'session_uri_expired_or_used' }, 410);
    return reply({ error: 'composio_upstream_failed' }, 502);
  }

  const existing = await store.getConnection(result.connectedAccountId);
  // Gehört das Konto laut eigenem Speicher jemand anderem, wird es nicht umgebunden.
  if (existing && (existing.tenantId !== session.tenantId || existing.userId !== session.userId)) return reply({ error: 'verification_mismatch' }, 403);
  await store.putConnection({
    connectedAccountId: result.connectedAccountId,
    tenantId: session.tenantId,
    userId: session.userId,
    authConfigId: existing?.authConfigId ?? '',
    // Ein bereits per Webhook aktives Konto bleibt aktiv; sonst gilt es als geprüft (Composio meldet ACTIVE).
    status: existing?.status === 'active' ? 'active' : 'verified',
    updatedAt: deps.nowMs?.() ?? Date.now(),
  });
  return new Response(null, { status: 303, headers: { ...PRIVATE, Location: COMPOSIO_CONFIG.public_origin + COMPOSIO_VERIFIED_REDIRECT } });
}
