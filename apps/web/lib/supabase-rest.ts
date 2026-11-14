/**
 * Server-only PostgREST-Client für self-hosted Supabase (OSS).
 * Keine npm-Abhängigkeit: nur fetch. Nutzt den Service-Role-Key (umgeht RLS)
 * und spricht das dedizierte Schema "chat" über Accept-/Content-Profile an.
 *
 * ENV (serverseitig, niemals im Client, niemals erfunden):
 *   SUPABASE_URL                  z. B. https://db.nexifyai.cloud
 *   SUPABASE_SERVICE_ROLE_KEY     Service-Role-JWT (nur Server)
 * PostgREST muss das Schema "chat" ausliefern: PGRST_DB_SCHEMAS="public,chat".
 *   SUPABASE_TIMEOUT_MS           optional: Zeitlimit je Zugriff in Millisekunden (Standard 4000, 100–15000)
 *
 * Jeder Zugriff hat ein Zeitlimit: ein hängender Speicher darf weder die Antwort des Chats
 * aufhalten noch die Funktion bis zur Zeitgrenze der Plattform offen halten.
 */

const SCHEMA = 'chat';

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function base(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase_not_configured');
  return { url: url.replace(/\/+$/, ''), key };
}

type Row = Record<string, unknown>;

const DEFAULT_TIMEOUT_MS = 4000;

/** Ein Zugriff auf den Speicher hat das Zeitlimit überschritten. Die Meldung enthält weder Pfad noch Inhalt. */
export class SupabaseTimeoutError extends Error {
  constructor() {
    super('supabase_timeout');
    this.name = 'SupabaseTimeoutError';
  }
}

function timeoutMs(): number {
  const configured = Number(process.env.SUPABASE_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 100 && configured <= 15_000 ? Math.floor(configured) : DEFAULT_TIMEOUT_MS;
}

async function rest<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  opts: { body?: unknown; profile?: boolean; representation?: boolean; headers?: Record<string, string> } = {},
): Promise<T> {
  const { url, key } = base();
  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };
  if (opts.profile !== false) {
    headers['Accept-Profile'] = SCHEMA;
    if (method !== 'GET') headers['Content-Profile'] = SCHEMA;
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.representation) headers['Prefer'] = 'return=representation';
  Object.assign(headers, opts.headers ?? {});

  // Das Limit gilt für Verbindung und Lesen der Antwort zusammen.
  const limit = AbortSignal.timeout(timeoutMs());
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      signal: limit,
    });
    text = await res.text();
  } catch (error) {
    if (limit.aborted) throw new SupabaseTimeoutError();
    throw error;
  }
  if (!res.ok) {
    throw new Error(`supabase ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

/** Zeile(n) einfügen, gibt die eingefügten Zeilen zurück. */
export async function sbInsert<T = Row>(table: string, rows: Row | Row[]): Promise<T[]> {
  return rest<T[]>('POST', table, { body: rows, representation: true });
}

/** Felder einer Selektion aktualisieren (PostgREST-Query im path, z. B. "chat_offers?id=eq.<uuid>"). */
export async function sbUpdate<T = Row>(pathWithQuery: string, patch: Row): Promise<T[]> {
  return rest<T[]>('PATCH', pathWithQuery, { body: patch, representation: true });
}

/** Zeilen lesen (PostgREST-Query im path). */
export async function sbSelect<T = Row>(pathWithQuery: string): Promise<T[]> {
  return rest<T[]>('GET', pathWithQuery);
}
