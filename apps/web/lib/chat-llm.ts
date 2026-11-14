/**
 * Server-only LLM-Adapter für den Live-Chat.
 *
 * Verbindlicher Modellvertrag: config/llm-policy.json + config/llm-verbindungen.json
 *   - Provider: 9router (OpenAI-kompatibel), Streaming an.
 *   - Modell:   deepseek/deepseek-v4.1-flash-1017, reasoning_effort "high".
 *   - KEIN stiller Modell-Fallback; nicht verfügbar => Fehler, kein Ersatz.
 *   - Zugangsdaten nur serverseitig; niemals erfinden.
 *
 * ENV (serverseitig):
 *   ROUTER_URL     OpenAI-kompatible Basis-URL des 9router (z. B. https://router.../v1)
 *   ROUTER_KEY     Router-Schlüssel
 * Optionale, ausdrücklich gesetzte Server-Overrides (Policy: Provider-Routenwechsel
 * nur per expliziter Server-Konfiguration):
 *   CHAT_COMPLETIONS_URL   vollständige Endpunkt-URL, überschreibt ROUTER_URL-Ableitung
 *   CHAT_MODEL_ID          nur zulässig, wenn identisch mit dem Policy-Modell; jede Abweichung
 *                          macht den Chat unverfügbar (kein stiller Ersatz).
 *
 * Router-Name: Der 9router führt das Policy-Modell unter `openrouter/deepseek-v4.1-flash` und
 * lehnt die Policy-Kennung mit HTTP 400 ab (gemessen 13.11.2026). Gesendet wird deshalb
 * der Router-Name; Protokoll und Ablage führen weiter die Policy-Kennung. Vom Inhaber am
 * 13.11.2026 geprüft und freigegeben. Der Router bietet keinen datierten Stand (-1017) an.
 *
 * Keine npm-Abhängigkeit: nur fetch.
 */

// Quelle der Wahrheit bleibt config/llm-policy.json. Hier gespiegelt als Default,
// damit kein fragiler Cross-Root-JSON-Import in das Next-Bundle gezogen wird.
const POLICY_MODEL_ID = 'deepseek/deepseek-v4.1-flash-1017';
const POLICY_REASONING_EFFORT = 'high';
// Name, unter dem der 9router das Policy-Modell führt. Fest, nicht per ENV änderbar.
const ROUTER_MODEL_NAME = 'openrouter/deepseek-v4.1-flash';

export function chatLlmConfigured(): boolean {
  return Boolean((process.env.CHAT_COMPLETIONS_URL || process.env.ROUTER_URL) && process.env.ROUTER_KEY);
}

/** Das Policy-Modell ist fest; eine abweichende Server-Einstellung ist ein Fehler, kein Ersatz. */
export function chatModelId(): string {
  const configured = process.env.CHAT_MODEL_ID;
  if (configured && configured !== POLICY_MODEL_ID) throw new ChatLlmError('chat_llm_model_policy_violation', 'model_policy');
  return POLICY_MODEL_ID;
}

/** Name des Policy-Modells auf der Leitung zum 9router. Prüft zuerst die Policy. */
export function routerModelName(): string {
  chatModelId();
  return ROUTER_MODEL_NAME;
}

/**
 * Unterscheidbare, geheimnisfreie Fehlerursachen des Modellaufrufs.
 * Die Ursache dient ausschließlich dem Serverprotokoll. Sie enthält niemals
 * Adresse, Schlüssel, Antworttext des Routers oder Nutzertext.
 */
export type ChatLlmCause =
  | 'not_configured' // ROUTER_URL/ROUTER_KEY fehlen
  | 'model_policy' // CHAT_MODEL_ID weicht vom Policy-Modell ab
  | 'invalid_endpoint' // Adresse ist keine gültige http(s)-URL
  | 'network' // Verbindung kam nicht zustande (DNS, TLS, abgelehnt)
  | 'timeout' // eigene Frist überschritten
  | 'client_abort' // Besucher hat abgebrochen
  | 'upstream_http' // Router antwortet mit Fehlerstatus
  | 'upstream_stream_error' // Router meldet einen Fehler innerhalb der Antwort
  | 'invalid_response' // Antwort ist kein auswertbares Chat-Format
  | 'empty_response' // gültiges Format, aber kein Antworttext
  | 'token_budget' // Limit durch Denk-Tokens aufgebraucht
  | 'stream_interrupted'; // Verbindung riss während der Antwort ab

export class ChatLlmError extends Error {
  readonly kind: ChatLlmCause;
  readonly status: number | undefined;
  readonly networkCode: string | undefined;
  readonly contentType: string | undefined;
  constructor(
    message: string,
    kind: ChatLlmCause,
    detail: { status?: number; networkCode?: string; contentType?: string } = {},
  ) {
    super(message);
    this.name = 'ChatLlmError';
    this.kind = kind;
    this.status = detail.status;
    this.networkCode = detail.networkCode;
    this.contentType = detail.contentType;
  }
}

export interface ChatFailureDescription {
  cause: ChatLlmCause | 'unexpected';
  status?: number;
  network_code?: string;
  upstream_content_type?: string;
}

/** Protokollierbare Kurzbeschreibung: nur feste Kennwörter, Statuszahl und Systemfehlercode. */
export function describeChatFailure(error: unknown): ChatFailureDescription {
  if (!(error instanceof ChatLlmError)) return { cause: 'unexpected' };
  const out: ChatFailureDescription = { cause: error.kind };
  if (typeof error.status === 'number') out.status = error.status;
  if (error.networkCode) out.network_code = error.networkCode;
  if (error.contentType) out.upstream_content_type = error.contentType;
  return out;
}

/** Systemfehlercode (z. B. ENOTFOUND, ECONNREFUSED) aus der Ursachenkette; nie die Meldung selbst. */
function networkCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,40}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Grobe Klasse des Antworttyps; der rohe Header wird nicht protokolliert. */
function contentTypeClass(header: string | null): string {
  const value = (header || '').toLowerCase();
  if (!value) return 'missing';
  if (value.includes('text/event-stream')) return 'event-stream';
  if (value.includes('json')) return 'json';
  if (value.includes('html')) return 'html';
  if (value.startsWith('text/')) return 'text';
  return 'other';
}

// Reasoning-Tokens zählen gegen das Antwortlimit: ein kleines Limit liefert leere oder abgeschnittene Antworten.
const DEFAULT_MAX_TOKENS = 4096;
// Unter der Funktionsgrenze der Route (maxDuration 60 s), damit eine Zeitüberschreitung
// noch als eigene Ursache protokolliert wird, bevor die Plattform die Funktion beendet.
const REQUEST_TIMEOUT_MS = 50_000;
const MAX_JSON_BODY_CHARS = 1_000_000;

function completionsUrl(): string {
  const explicit = process.env.CHAT_COMPLETIONS_URL;
  const router = (process.env.ROUTER_URL || '').trim().replace(/\/+$/, '');
  if (!explicit && !router) throw new ChatLlmError('chat_llm_not_configured', 'not_configured');
  const target = explicit ? explicit.trim() : /\/chat\/completions$/.test(router) ? router : `${router}/chat/completions`;
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new ChatLlmError('chat_llm_invalid_endpoint', 'invalid_endpoint');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ChatLlmError('chat_llm_invalid_endpoint', 'invalid_endpoint');
  }
  return target;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streamt Text-Deltas vom OpenAI-kompatiblen Endpunkt.
 * Liefert einen AsyncGenerator von Teilstücken (reiner Text).
 * Wirft bei jeder Störung einen ChatLlmError mit benannter Ursache (kein stiller Ersatz,
 * keine leere Antwort).
 */
export async function* streamChatCompletion(
  messages: readonly LlmMessage[],
  opts: { signal?: AbortSignal; maxTokens?: number } = {},
): AsyncGenerator<string, void, unknown> {
  if (!chatLlmConfigured()) throw new ChatLlmError('chat_llm_not_configured', 'not_configured');
  const key = process.env.ROUTER_KEY as string;
  const model = routerModelName();
  const url = completionsUrl();
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  // Abbruch durch Besucher, eigene Frist und Verbindungsfehler getrennt benennen.
  const transportError = (error: unknown, duringStream: boolean): ChatLlmError => {
    if (error instanceof ChatLlmError) return error;
    if (opts.signal?.aborted) return new ChatLlmError('chat_llm_client_abort', 'client_abort');
    if (timeout.aborted) return new ChatLlmError('chat_llm_timeout', 'timeout');
    return duringStream
      ? new ChatLlmError('chat_llm_stream_interrupted', 'stream_interrupted', { networkCode: networkCode(error) })
      : new ChatLlmError('chat_llm_network', 'network', { networkCode: networkCode(error) });
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        reasoning: { effort: POLICY_REASONING_EFFORT },
      }),
      cache: 'no-store',
      signal,
    });
  } catch (error) {
    throw transportError(error, false);
  }

  const contentType = contentTypeClass(res.headers.get('content-type'));
  if (!res.ok || !res.body) {
    // Provider responses may contain request details or credentials. Keep the
    // useful status code, but never propagate the upstream response body.
    void res.body?.cancel().catch(() => {});
    throw new ChatLlmError(`chat_llm_upstream_${res.status}`, 'upstream_http', { status: res.status, contentType });
  }

  // Manche Router ignorieren stream:true und liefern eine einzelne JSON-Antwort.
  if (contentType === 'json') {
    // Schrittweise lesen und bei Überschreitung abbrechen, damit die Grenze auch den Speicher begrenzt.
    let raw = '';
    const jsonReader = res.body.getReader();
    const jsonDecoder = new TextDecoder('utf-8');
    try {
      while (true) {
        const { value, done } = await jsonReader.read();
        if (done) break;
        raw += jsonDecoder.decode(value, { stream: true });
        if (raw.length > MAX_JSON_BODY_CHARS) {
          void jsonReader.cancel().catch(() => {});
          throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
        }
      }
      raw += jsonDecoder.decode();
    } catch (error) {
      throw transportError(error, true);
    } finally {
      jsonReader.releaseLock();
    }
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
    }
    if (hasUpstreamError(json)) {
      throw new ChatLlmError('chat_llm_upstream_stream_error', 'upstream_stream_error', { status: res.status, contentType });
    }
    const text = extractDelta(json);
    if (!text) {
      if (finishReason(json) === 'length') throw new ChatLlmError('chat_llm_token_budget_exhausted', 'token_budget', { contentType });
      throw new ChatLlmError('chat_llm_empty_response', hasChoices(json) ? 'empty_response' : 'invalid_response', { status: res.status, contentType });
    }
    yield text;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let produced = false;
  let truncated = false;
  let finished = false;
  let events = 0;
  let upstreamError = false;
  // Ein SSE-Datenpaket; liefert den Text oder null bei [DONE].
  const parse = (raw: string): { done: boolean; text: string } => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return { done: false, text: '' };
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') return { done: true, text: '' };
    try {
      const json: unknown = JSON.parse(payload);
      events += 1;
      if (hasUpstreamError(json)) upstreamError = true;
      if (finishReason(json) === 'length') truncated = true;
      return { done: false, text: extractDelta(json) };
    } catch {
      return { done: false, text: '' }; // Unvollständige/irrelevante Zeile überspringen.
    }
  };
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (error) {
        throw transportError(error, true);
      }
      const { value, done } = chunk;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const parsed = parse(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
        if (parsed.text) { produced = true; yield parsed.text; }
        if (parsed.done) { finished = true; break; }
      }
      if (finished) break;
    }
    // Rest ohne abschließenden Zeilenumbruch nicht verlieren.
    const rest = finished ? { done: true, text: '' } : parse(buffer + decoder.decode());
    if (rest.text) { produced = true; yield rest.text; }
  } finally {
    // Bricht der Abnehmer vorzeitig ab (Besucher hält an, Leitplanke beendet), wird die Verbindung
    // zum Router geschlossen statt offen gehalten. Nach einem vollständig gelesenen Strom ohne Wirkung.
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  // Ein Fehler des Routers mitten in der Antwort ist eine Störung, auch wenn schon Text kam:
  // eine abgebrochene Antwort wird nicht als vollständig ausgegeben.
  if (upstreamError) throw new ChatLlmError('chat_llm_upstream_stream_error', 'upstream_stream_error', { status: res.status, contentType });
  if (produced) return;
  // Ohne Antworttext wird nie leer geantwortet: die Ursache wird benannt.
  // Das Limit wurde durch Denk-Tokens aufgebraucht, bevor Text entstand.
  if (truncated) throw new ChatLlmError('chat_llm_token_budget_exhausted', 'token_budget', { contentType });
  if (events === 0) throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
  throw new ChatLlmError('chat_llm_empty_response', 'empty_response', { status: res.status, contentType });
}

/** Nicht-gestreamte Variante: gesamten Text einsammeln. */
export async function generateChatCompletion(
  messages: readonly LlmMessage[],
  opts: { signal?: AbortSignal; maxTokens?: number } = {},
): Promise<string> {
  let out = '';
  for await (const chunk of streamChatCompletion(messages, opts)) out += chunk;
  return out;
}

function extractDelta(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return '';
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';
  const delta = (first as { delta?: unknown }).delta;
  if (delta && typeof delta === 'object') {
    const content = (delta as { content?: unknown }).content;
    if (typeof content === 'string') return content;
  }
  // Manche OpenAI-kompatible Router senden am Ende ein "message".
  const message = (first as { message?: unknown }).message;
  if (message && typeof message === 'object') {
    const content = (message as { content?: unknown }).content;
    if (typeof content === 'string') return content;
  }
  return '';
}

function finishReason(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return '';
  const reason = (choices[0] as { finish_reason?: unknown }).finish_reason;
  return typeof reason === 'string' ? reason : '';
}

function hasChoices(json: unknown): boolean {
  return Boolean(json && typeof json === 'object' && Array.isArray((json as { choices?: unknown }).choices));
}

/** Fehlerobjekt des Routers innerhalb einer formal erfolgreichen Antwort. Der Inhalt wird nicht gelesen. */
function hasUpstreamError(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const error = (json as { error?: unknown }).error;
  return error !== undefined && error !== null && error !== false;
}
