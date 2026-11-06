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
 *   CHAT_MODEL_ID          Modell-ID (Default = Policy-Modell unten)
 *
 * Keine npm-Abhängigkeit: nur fetch.
 */

// Quelle der Wahrheit bleibt config/llm-policy.json. Hier gespiegelt als Default,
// damit kein fragiler Cross-Root-JSON-Import in das Next-Bundle gezogen wird.
const POLICY_MODEL_ID = 'deepseek/deepseek-v4.1-flash-1017';
const POLICY_REASONING_EFFORT = 'high';

export function chatLlmConfigured(): boolean {
  return Boolean((process.env.CHAT_COMPLETIONS_URL || process.env.ROUTER_URL) && process.env.ROUTER_KEY);
}

export function chatModelId(): string {
  return process.env.CHAT_MODEL_ID || POLICY_MODEL_ID;
}

function completionsUrl(): string {
  const explicit = process.env.CHAT_COMPLETIONS_URL;
  if (explicit) return explicit;
  const router = (process.env.ROUTER_URL || '').replace(/\/+$/, '');
  if (!router) throw new Error('chat_llm_not_configured');
  return /\/chat\/completions$/.test(router) ? router : `${router}/chat/completions`;
}

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Streamt Text-Deltas vom OpenAI-kompatiblen Endpunkt.
 * Liefert einen AsyncGenerator von Teilstücken (reiner Text).
 * Wirft bei fehlender Konfiguration oder HTTP-Fehler (kein stiller Ersatz).
 */
export async function* streamChatCompletion(
  messages: readonly LlmMessage[],
  opts: { signal?: AbortSignal; maxTokens?: number } = {},
): AsyncGenerator<string, void, unknown> {
  if (!chatLlmConfigured()) throw new Error('chat_llm_not_configured');
  const key = process.env.ROUTER_KEY as string;

  const res = await fetch(completionsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: chatModelId(),
      messages,
      stream: true,
      max_tokens: opts.maxTokens ?? 1024,
      reasoning: { effort: POLICY_REASONING_EFFORT },
    }),
    cache: 'no-store',
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`chat_llm_upstream_${res.status}:${detail.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json: unknown = JSON.parse(payload);
          const delta = extractDelta(json);
          if (delta) yield delta;
        } catch {
          // Unvollständige/irrelevante Zeile überspringen.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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
