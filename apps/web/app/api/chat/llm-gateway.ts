/**
 * Zweiter, ausdrücklich einzuschaltender Leitungsweg für den Live-Chat: Cloudflare AI Gateway
 * vor OpenRouter. Standard bleibt der 9router (lib/chat-llm.ts); ohne CHAT_LLM_ROUTE ändert
 * diese Datei nichts. Betriebsnotiz: docs/04-betrieb/cloudflare-ai-gateway-2026-11-14.md.
 *
 * Vertrag (config/llm-policy.json):
 *   - Auf der Leitung steht exakt die Policy-Kennung, Reasoning "high", Streaming an.
 *   - Kein Ersatzmodell: Meldet das Gateway einen Ausweichschritt (cf-aig-step ungleich 0) oder
 *     nennt die Antwort ein anderes Modell, endet der Aufruf mit model_policy statt mit Text.
 *   - Text erreicht den Besucher erst, nachdem ein Datenblock das Policy-Modell genannt hat;
 *     bis dahin wird gepuffert. Eine Antwort ganz ohne Modellangabe endet mit model_policy.
 *   - Nur der OpenRouter-Endpunkt des Gateways auf gateway.ai.cloudflare.com. /compat/... wird
 *     abgewiesen: dort gilt eine andere Modellschreibweise, und OpenRouter steht nicht in der
 *     Anbieterliste jener Schnittstelle. Weiterleitungen werden nicht verfolgt.
 *   - Gesperrt, solange config/llm-policy.json als Zielweg nur den 9router nennt
 *     (gatewayRoutePermitted). Die Route antwortet dann mit 503.
 *
 * ENV (serverseitig, nur in diesem Modus gelesen):
 *   CHAT_LLM_ROUTE      "cloudflare-ai-gateway" schaltet um; leer oder "router" = Standard.
 *   CF_AIG_CHAT_URL     https://gateway.ai.cloudflare.com/v1/<konto>/<gateway>/openrouter/chat/completions
 *                       (wahlweise mit /v1 vor /chat). Kein anderer Host, kein Port, kein Query.
 *   CF_AIG_TOKEN        Token des authentifizierten Gateways (Kopfzeile cf-aig-authorization).
 *   CF_AIG_BYOK_ALIAS   optional: Alias des im Gateway hinterlegten OpenRouter-Schlüssels.
 * Der Anbieter-Schlüssel liegt im Gateway (BYOK). Deshalb geht keine Authorization-Kopfzeile
 * mit: Das Gateway setzt den hinterlegten Schlüssel nur ein, wenn sie fehlt.
 *
 * Liegt in app/api/chat und nicht in lib/, weil lib/ an den Browser-Beleg
 * evidence/resize-2026-11-10/text-spacing.json gebunden ist. Zusammenführen mit
 * lib/chat-llm.ts gehört in den nächsten Lauf jenes Belegs.
 */
import { ChatLlmError, chatModelId, type LlmMessage } from '../../../lib/chat-llm';

export type ChatLlmRoute = 'router' | 'cloudflare-ai-gateway';

// Gespiegelt aus config/llm-policy.json (model.reasoning_effort); der Test vergleicht mit der Datei.
const POLICY_REASONING_EFFORT = 'high';
const DEFAULT_MAX_TOKENS = 4096;
const REQUEST_TIMEOUT_MS = 50_000;
const MAX_JSON_BODY_CHARS = 1_000_000;
// Obergrenze für zurückgehaltenen Text vor der Modellbestätigung und für eine einzelne Zeile ohne
// Zeilenumbruch. Ein Anbieter, der das Modell nie nennt, darf den Speicher nicht füllen.
const MAX_PENDING_CHARS = 1_000_000;
const GATEWAY_ORIGIN = 'https://gateway.ai.cloudflare.com';
const ENDPOINT_PATH = /^\/v1\/[0-9a-f]{32}\/[A-Za-z0-9_-]+\/openrouter(\/v1)?\/chat\/completions$/;
// Gespiegelt aus config/llm-policy.json: provider_route_target_2026_11_10.gateway ist
// "9router_only" und direct_provider_bypass_allowed false. Solange das gilt, bleibt dieser Weg
// gesperrt. Der Test vergleicht mit der Datei; wer die Policy nachführt, ändert beides gemeinsam.
const POLICY_PERMITS_CLOUDFLARE_GATEWAY = false;

/** Erlaubt die Policy diesen Leitungsweg? Heute nein; die Route antwortet dann mit 503. */
export function gatewayRoutePermitted(): boolean {
  return POLICY_PERMITS_CLOUDFLARE_GATEWAY;
}
const ALIAS = /^[A-Za-z0-9_-]{1,64}$/;

/** Gewählter Leitungsweg. Ein unbekannter Wert ist ein Fehler, kein stiller Rückfall auf den Standard. */
export function chatLlmRoute(): ChatLlmRoute {
  const value = (process.env.CHAT_LLM_ROUTE || '').trim();
  if (!value || value === 'router') return 'router';
  if (value === 'cloudflare-ai-gateway') return 'cloudflare-ai-gateway';
  throw new ChatLlmError('chat_llm_route_invalid', 'not_configured');
}

/** Namen der fehlenden Variablen des Gateway-Wegs (nur Namen). */
export function missingGatewayEnv(): string[] {
  const missing: string[] = [];
  if (!(process.env.CF_AIG_CHAT_URL || '').trim()) missing.push('CF_AIG_CHAT_URL');
  if (!(process.env.CF_AIG_TOKEN || '').trim()) missing.push('CF_AIG_TOKEN');
  return missing;
}

export function gatewayConfigured(): boolean {
  return missingGatewayEnv().length === 0;
}

function gatewayUrl(): string {
  const target = (process.env.CF_AIG_CHAT_URL || '').trim();
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new ChatLlmError('chat_llm_invalid_endpoint', 'invalid_endpoint');
  }
  // Der Vergleich mit der normalisierten Form weist Zugangsdaten, Port, Query (auch ein leeres ?),
  // Fragment und Pfadtricks wie /x/../ ab: Die Adresse muss wörtlich die geprüfte sein.
  if (parsed.origin !== GATEWAY_ORIGIN || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash
    || !ENDPOINT_PATH.test(parsed.pathname) || target !== GATEWAY_ORIGIN + parsed.pathname) {
    throw new ChatLlmError('chat_llm_invalid_endpoint', 'invalid_endpoint');
  }
  return target;
}

/** Systemfehlercode aus der Ursachenkette; nachgebildet aus lib/chat-llm.ts (dort nicht exportiert). */
function networkCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,40}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function contentTypeClass(header: string | null): string {
  const value = (header || '').toLowerCase();
  if (!value) return 'missing';
  if (value.includes('text/event-stream')) return 'event-stream';
  if (value.includes('json')) return 'json';
  if (value.includes('html')) return 'html';
  return value.startsWith('text/') ? 'text' : 'other';
}

interface Parsed {
  text: string;
  truncated: boolean;
  failed: boolean;
  choices: boolean;
  /** Der Block nennt das Policy-Modell. */
  verified: boolean;
}

/** Ein Antwortobjekt auswerten. Ein abweichendes Modell beendet den Aufruf, bevor Text weitergeht. */
function read(json: unknown, policyModel: string): Parsed {
  const out: Parsed = { text: '', truncated: false, failed: false, choices: false, verified: false };
  if (!json || typeof json !== 'object') return out;
  const body = json as { model?: unknown; error?: unknown; choices?: unknown };
  if (body.error !== undefined && body.error !== null && body.error !== false) out.failed = true;
  if (typeof body.model === 'string' && body.model) {
    if (body.model !== policyModel) throw new ChatLlmError('chat_llm_model_policy_violation', 'model_policy');
    out.verified = true;
  }
  if (!Array.isArray(body.choices)) return out;
  out.choices = true;
  const first = body.choices[0] as { delta?: { content?: unknown }; message?: { content?: unknown }; finish_reason?: unknown } | undefined;
  if (!first || typeof first !== 'object') return out;
  if (first.finish_reason === 'length') out.truncated = true;
  const content = first.delta?.content ?? first.message?.content;
  if (typeof content === 'string') out.text = content;
  return out;
}

/**
 * Streamt Text-Deltas über das Gateway. Gleiche Zusage wie streamChatCompletion: jede Störung
 * wirft einen ChatLlmError mit benannter Ursache, nie eine leere oder ersetzte Antwort.
 */
export async function* streamGatewayCompletion(
  messages: readonly LlmMessage[],
  opts: { signal?: AbortSignal; maxTokens?: number } = {},
): AsyncGenerator<string, void, unknown> {
  if (!gatewayConfigured()) throw new ChatLlmError('chat_llm_not_configured', 'not_configured');
  const model = chatModelId();
  const url = gatewayUrl();
  const headers: Record<string, string> = {
    'cf-aig-authorization': `Bearer ${(process.env.CF_AIG_TOKEN as string).trim()}`,
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    // Besuchertext und Antwort nicht im Gateway-Protokoll ablegen; Zähler und Kosten bleiben.
    'cf-aig-collect-log-payload': 'false',
    // Keine Antwort aus dem Zwischenspeicher: jede Antwort stammt aus einem Modellaufruf.
    'cf-aig-skip-cache': 'true',
  };
  const alias = (process.env.CF_AIG_BYOK_ALIAS || '').trim();
  if (alias) {
    if (!ALIAS.test(alias)) throw new ChatLlmError('chat_llm_invalid_endpoint', 'invalid_endpoint');
    headers['cf-aig-byok-alias'] = alias;
  }
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
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
      headers,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
        reasoning: { effort: POLICY_REASONING_EFFORT },
        // OpenRouter: nur Anbieter, die alle Parameter annehmen, sonst Fehler statt stillem
        // Wegfall von `reasoning` (wie ops/hermes/home/config.yaml, provider_routing).
        provider: { require_parameters: true },
      }),
      cache: 'no-store',
      // Eine Weiterleitung würde Token und Gesprächstext an eine ungeprüfte Adresse tragen.
      redirect: 'error',
      signal,
    });
  } catch (error) {
    throw transportError(error, false);
  }

  const contentType = contentTypeClass(res.headers.get('content-type'));
  if (!res.ok || !res.body) {
    void res.body?.cancel().catch(() => {});
    throw new ChatLlmError(`chat_llm_upstream_${res.status}`, 'upstream_http', { status: res.status, contentType });
  }
  // Das Gateway zählt Ausweichschritte: 0 ist die angefragte Route, alles andere ein Ersatz.
  const step = res.headers.get('cf-aig-step');
  if (step !== null && step.trim() !== '0') {
    void res.body.cancel().catch(() => {});
    throw new ChatLlmError('chat_llm_model_policy_violation', 'model_policy');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let produced = false;
  let truncated = false;
  let failed = false;
  let events = 0;
  let finished = false;
  // Solange kein Block das Policy-Modell genannt hat, geht kein Text weiter.
  let verified = false;
  let held = '';
  const line = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('data:')) return '';
    const payload = trimmed.slice(5).trim();
    if (payload === '[DONE]') { finished = true; return ''; }
    let json: unknown;
    try { json = JSON.parse(payload); } catch { return ''; }
    events += 1;
    const parsed = read(json, model);
    if (parsed.failed) failed = true;
    if (parsed.truncated) truncated = true;
    if (parsed.verified && !verified) {
      verified = true;
      const text = held + parsed.text;
      held = '';
      return text;
    }
    if (!verified) {
      held += parsed.text;
      if (held.length > MAX_PENDING_CHARS) throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
      return '';
    }
    return parsed.text;
  };
  try {
    while (!finished) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try { chunk = await reader.read(); } catch (error) { throw transportError(error, true); }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (contentType === 'json') {
        if (buffer.length > MAX_JSON_BODY_CHARS) throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
        continue;
      }
      let nl: number;
      while (!finished && (nl = buffer.indexOf('\n')) !== -1) {
        const text = line(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
        if (text) { produced = true; yield text; }
      }
      // Rest ohne Zeilenumbruch: eine einzelne Zeile dieser Länge ist kein gültiger Datenblock.
      if (buffer.length > MAX_PENDING_CHARS) throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
    }
    buffer += decoder.decode();
    if (contentType === 'json') {
      // Einzelne JSON-Antwort statt Strom.
      let json: unknown;
      try { json = JSON.parse(buffer); } catch { throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType }); }
      const parsed = read(json, model);
      if (parsed.failed) throw new ChatLlmError('chat_llm_upstream_stream_error', 'upstream_stream_error', { status: res.status, contentType });
      if (parsed.choices && !parsed.verified) throw new ChatLlmError('chat_llm_model_policy_violation', 'model_policy');
      if (parsed.text) { yield parsed.text; return; }
      if (parsed.truncated) throw new ChatLlmError('chat_llm_token_budget_exhausted', 'token_budget', { contentType });
      throw new ChatLlmError('chat_llm_empty_response', parsed.choices ? 'empty_response' : 'invalid_response', { status: res.status, contentType });
    }
    if (!finished && buffer) {
      const text = line(buffer);
      if (text) { produced = true; yield text; }
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (failed) throw new ChatLlmError('chat_llm_upstream_stream_error', 'upstream_stream_error', { status: res.status, contentType });
  if (events > 0 && !verified) throw new ChatLlmError('chat_llm_model_policy_violation', 'model_policy');
  if (produced) return;
  if (truncated) throw new ChatLlmError('chat_llm_token_budget_exhausted', 'token_budget', { contentType });
  if (events === 0) throw new ChatLlmError('chat_llm_invalid_response', 'invalid_response', { status: res.status, contentType });
  throw new ChatLlmError('chat_llm_empty_response', 'empty_response', { status: res.status, contentType });
}
