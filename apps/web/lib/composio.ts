/**
 * Composio-Anbindung der NeX2fly-Suite: Schalter, Konfiguration und ein kleiner REST-Client über `fetch`.
 *
 * Geheimnisse (COMPOSIO_API_KEY, COMPOSIO_AUTH_TOKEN, COMPOSIO_WEBHOOK_SECRET) kommen ausschließlich aus der
 * Laufzeitumgebung (`process.env`). Dieses Modul schreibt sie weder in Fehlertexte noch ins Protokoll.
 * Keine neue Abhängigkeit, kein SDK. Fehler tragen nur feste Kennwörter, nie Antworttext von Composio.
 */
import composioConfig from '../../../config/integrations/composio.json' with { type: 'json' };

export type ComposioEnv = Record<string, string | undefined>;

export const COMPOSIO_CONFIG = composioConfig;
export const COMPOSIO_API_BASE: string = composioConfig.api_base;
export const COMPOSIO_VERIFY_PATH = '/api/suite/composio/verify';

/** `session_uri` aus dem Composio-Redirect: nur Zeichen einer URL, begrenzt. */
export const SESSION_URI = /^[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]{1,2048}$/;

/** Kennungen (Konto, Auth-Config) bleiben auf ein enges Zeichenalphabet beschränkt. */
export const COMPOSIO_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Standard AUS: nur der exakte Wert "on" und zusätzlich der Suite-Hauptschalter (Muster apps/suite/flags.py). */
export function composioEnabled(env: ComposioEnv = process.env): boolean {
  return env.NEXIFY_SUITE === 'on' && env.NEXIFY_SUITE_COMPOSIO === 'on';
}

/**
 * Nur der Webhook-Empfang. Eigener Schalter, damit der bei Composio eingetragene Endpunkt antworten kann, bevor die
 * Suite auf `main` liegt: `NEXIFY_SUITE=on` würde sonst später die ganze Suite mit einschalten. Ohne gebundene
 * Verbindung verarbeitet der Empfang nichts; er prüft die Signatur und quittiert.
 */
export function composioWebhookEnabled(env: ComposioEnv = process.env): boolean {
  return env.NEXIFY_COMPOSIO_WEBHOOK === 'on' || composioEnabled(env);
}

export type ComposioErrorCode = 'composio_not_configured' | 'composio_upstream_failed' | 'composio_link_incomplete' | 'composio_trigger_incomplete';

export class ComposioError extends Error {
  readonly code: ComposioErrorCode;
  /** HTTP-Status der Composio-Antwort (nur Zahl, nie Antworttext), falls der Fehler von dort stammt. */
  readonly upstreamStatus?: number;
  constructor(code: ComposioErrorCode, upstreamStatus?: number) {
    super(code);
    this.code = code;
    if (upstreamStatus !== undefined) this.upstreamStatus = upstreamStatus;
  }
}

export type ConnectLink = { redirectUrl: string; connectedAccountId: string };

/** Kennung eines Triggers (Slug) in Großbuchstaben, Ziffern und Unterstrich. */
export const TRIGGER_SLUG = /^[A-Z0-9_]{1,128}$/;

export type TriggerType = { slug: string; config: Record<string, unknown> };

export type ComposioClient = {
  /** Trigger-Typ samt Konfigurationsschema (GET /triggers_types/{slug}). */
  getTriggerType(slug: string): Promise<TriggerType>;
  /** Legt einen Trigger für den Suite-Nutzer an (POST /trigger_instances/{slug}/upsert). */
  createTrigger(userId: string, slug: string, triggerConfig: Record<string, unknown>, connectedAccountId?: string): Promise<{ triggerId: string }>;
  /** POST /connected_accounts/link { auth_config_id, user_id, callback_url? } -> 201 { redirect_url, connected_account_id, ... }. */
  createConnectLink(input: { userId: string; authConfigId: string; callbackUrl?: string }): Promise<ConnectLink>;
  /**
   * Identity-Verification: POST /connected_accounts/complete_auth { session_uri, user_id } -> 200 { connected_account_id, toolkit_slug }.
   * `userId` ist immer die Suite-Sitzungs-Nutzer-ID. `session_uri` ist einmalig und verbraucht sich auch bei Fehlern.
   */
  completeAuth(input: { sessionUri: string; userId: string }): Promise<{ connectedAccountId: string; toolkitSlug: string }>;
};

type ClientOptions = { env?: ComposioEnv; fetchImpl?: typeof fetch; timeoutMs?: number };

export function createComposioClient(options: ClientOptions = {}): ComposioClient {
  const env = options.env ?? process.env;
  const doFetch = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const apiKey = env.COMPOSIO_API_KEY;
  if (!apiKey) throw new ComposioError('composio_not_configured');

  async function call(path: string, body: unknown, method: 'GET' | 'POST' = 'POST'): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-api-key': apiKey as string };
    let response: Response;
    try {
      response = await doFetch(COMPOSIO_API_BASE + path, {
        method,
        headers,
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ComposioError('composio_upstream_failed');
    }
    if (!response.ok) throw new ComposioError('composio_upstream_failed', response.status);
    try {
      const parsed: unknown = await response.json();
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return {
    async getTriggerType(slug) {
      if (!TRIGGER_SLUG.test(slug)) throw new ComposioError('composio_trigger_incomplete');
      // Doku "Creating triggers": GET /triggers_types/{slug}, Schema im Feld `config`.
      const result = await call('/triggers_types/' + encodeURIComponent(slug), undefined, 'GET');
      const config = result.config;
      if (!config || typeof config !== 'object' || Array.isArray(config)) throw new ComposioError('composio_trigger_incomplete');
      return { slug, config: config as Record<string, unknown> };
    },
    async createTrigger(userId, slug, triggerConfig, connectedAccountId) {
      if (!TRIGGER_SLUG.test(slug)) throw new ComposioError('composio_trigger_incomplete');
      // Doku: POST /trigger_instances/{slug}/upsert { user_id, trigger_config, connected_account_id? }
      const body: Record<string, unknown> = { user_id: userId, trigger_config: triggerConfig };
      if (connectedAccountId) body.connected_account_id = connectedAccountId;
      const result = await call('/trigger_instances/' + encodeURIComponent(slug) + '/upsert', body);
      // Annahme: Antwortfeld `trigger_id` (Doku-Beispiel nicht abgerufen). Ohne Kennung lässt sich der Trigger nicht zuordnen.
      const triggerId = result.trigger_id ?? result.triggerId ?? result.id;
      if (typeof triggerId !== 'string' || !COMPOSIO_ID.test(triggerId)) throw new ComposioError('composio_trigger_incomplete');
      return { triggerId };
    },
    async createConnectLink({ userId, authConfigId, callbackUrl }) {
      // Belegt (Composio-Doku, 14.11.2026): Body { auth_config_id, user_id, callback_url? }, Antwort 201 { redirect_url, connected_account_id, link_token, expires_at }.
      const body: Record<string, unknown> = { auth_config_id: authConfigId, user_id: userId };
      if (callbackUrl) body.callback_url = callbackUrl;
      const result = await call('/connected_accounts/link', body);
      const redirectUrl = result.redirect_url;
      const connectedAccountId = result.connected_account_id;
      if (typeof redirectUrl !== 'string' || !/^https:\/\//.test(redirectUrl)) throw new ComposioError('composio_link_incomplete');
      if (typeof connectedAccountId !== 'string' || !COMPOSIO_ID.test(connectedAccountId)) throw new ComposioError('composio_link_incomplete');
      return { redirectUrl, connectedAccountId };
    },
    async completeAuth({ sessionUri, userId }) {
      // Belegt: Body { session_uri, user_id }, Antwort 200 { connected_account_id, toolkit_slug }. 400 = user_id ist nicht der Besitzer
      // (Verbindung wird FAILED); 404 = session_uri unbekannt, abgelaufen (10 Min) oder schon verbraucht.
      const result = await call('/connected_accounts/complete_auth', { session_uri: sessionUri, user_id: userId });
      const connectedAccountId = result.connected_account_id;
      const toolkitSlug = result.toolkit_slug;
      if (typeof connectedAccountId !== 'string' || !COMPOSIO_ID.test(connectedAccountId)) throw new ComposioError('composio_link_incomplete');
      return { connectedAccountId, toolkitSlug: typeof toolkitSlug === 'string' && COMPOSIO_ID.test(toolkitSlug) ? toolkitSlug : '' };
    },
  };
}
