/**
 * Handler für Connect-Link und Nutzerprüfung (OAuth user verification). Rein über Abhängigkeiten
 * (Sitzung, Speicher, Client), damit sie ohne Netz testbar sind. Die Route-Dateien sind dünne Hüllen.
 */
import { COMPOSIO_CONFIG, COMPOSIO_ID, COMPOSIO_VERIFY_PATH, ComposioError, composioEnabled, createComposioClient, type ComposioClient, type ComposioEnv } from './composio.ts';
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

/**
 * OAuth user verification: Composio führt den Browser nach dem OAuth-Rücksprung hierher. Die Verbindung wird nur
 * abgeschlossen, wenn der angemeldete Suite-Nutzer derselbe ist, für den sie angelegt wurde. Aus der URL zählt allein
 * die Kontokennung; `user_id`, `status` & Co. aus der Query werden ignoriert.
 */
export async function handleVerify(request: Request, deps: RouteDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!composioEnabled(env)) return reply({ error: 'composio_not_configured' }, 503);
  const session = await (deps.resolveSession ?? shopApiSessionResolver(env))(request);
  if (!session) return reply({ error: 'authentication_required' }, 401);

  const accountId = new URL(request.url).searchParams.get('connected_account_id') ?? '';
  if (!COMPOSIO_ID.test(accountId)) return reply({ error: 'invalid_connected_account_id' }, 422);

  const store = deps.store ?? getComposioStore();
  const record = await store.getConnection(accountId);
  // Unbekannt oder fremd: einheitlich dieselbe Antwort, damit keine Kennungen erraten werden können.
  if (!record || record.tenantId !== session.tenantId || record.userId !== session.userId) return reply({ error: 'verification_mismatch' }, 403);
  if (record.status === 'expired') return reply({ error: 'connection_expired' }, 409);

  if (record.status === 'pending') {
    const client = makeClient(deps, env);
    if (!client) return reply({ error: 'composio_not_configured' }, 503);
    try {
      await client.completeAuth(accountId);
    } catch {
      return reply({ error: 'composio_upstream_failed' }, 502);
    }
    await store.putConnection({ ...record, status: 'verified', updatedAt: deps.nowMs?.() ?? Date.now() });
  }
  return reply({ verified: true, user_id: session.userId, connected_account_id: accountId }, 200);
}
