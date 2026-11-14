/**
 * Suite-Sitzung für die Composio-Routen. Es gibt keine Anmeldung über Header, Query oder Body:
 * Die Sitzung wird serverseitig bei der Shop-API erfragt (`GET /api/auth/me`, Cookie/Authorization werden
 * nur weitergereicht). Ohne gültige Sitzung oder ohne konfigurierte Shop-API: null (fail-closed).
 *
 * Annahme Mandant: Bis eine Organisations-Zuordnung (Mitgliedschaft, db/foundation/002_suite_tenancy.sql) für Web-Anfragen
 * angebunden ist, ist der Mandant das eigene Konto (`konto:<user_id>`). Der Resolver ist austauschbar.
 */
export type SuiteSession = { userId: string; tenantId: string };
export type SessionResolver = (request: Request) => Promise<SuiteSession | null>;

const USER_ID = /^[A-Za-z0-9_.:@-]{1,128}$/;

export function shopApiSessionResolver(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): SessionResolver {
  return async (request) => {
    const origin = env.SHOP_API_BASE_URL || env.REACT_APP_BACKEND_URL;
    if (!origin) return null;
    const cookie = request.headers.get('cookie');
    const authorization = request.headers.get('authorization');
    if (!cookie && !authorization) return null;
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (authorization) headers.authorization = authorization;
    try {
      const response = await fetchImpl(origin.replace(/\/$/, '') + '/api/auth/me', { headers, cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const body = (await response.json()) as { user_id?: unknown };
      if (typeof body.user_id !== 'string' || !USER_ID.test(body.user_id)) return null;
      return { userId: body.user_id, tenantId: 'konto:' + body.user_id };
    } catch {
      return null;
    }
  };
}
