/**
 * Browser-Seite des öffentlichen Chats: ein Aufruf von POST /api/chat und das Lesen des
 * Antwortstroms. Ohne React und ohne Zustand, damit Ablauf und Fehlerfälle direkt testbar sind
 * (apps/web/auth/tests/chat-client.test.mjs).
 */
import type { BriefingDTO, ChatMessageDTO, ChatRequest, ChatStreamEvent } from './chat-contract';
import { parseSseData } from './chat-contract';

/** Wie ein Aufruf endete. Die Oberfläche übersetzt das in einen verständlichen Zustand. */
export type ChatOutcome =
  | { kind: 'done'; text: string; briefing: BriefingDTO | null; conversationId: string | null }
  /** Der Chat ist auf diesem Stand nicht angebunden: Oberfläche wechselt auf den Kontaktweg. */
  | { kind: 'unavailable' }
  /** Zu viele Nachrichten in kurzer Zeit. */
  | { kind: 'limited'; retryAfterSeconds: number }
  /** Vorübergehende Störung; text enthält bereits geprüften Teiltext (kann leer sein). */
  | { kind: 'failed'; text: string; conversationId: string | null }
  /** Vom Besucher angehalten. */
  | { kind: 'stopped'; text: string; conversationId: string | null };

export interface ChatStreamHandlers {
  /** Erstes Lebenszeichen des Servers (Konversation angelegt). */
  onStart?: (conversationId: string) => void;
  /** Geprüfter Textzuwachs; full ist der bisher sichtbare Gesamttext. */
  onText?: (full: string) => void;
}

export interface ChatTurnInput {
  message: string;
  locale: ChatRequest['locale'];
  pagePath: string;
  conversationId?: string | null;
  history: ChatMessageDTO[];
}

const UNAVAILABLE_STATUS = new Set([404, 405, 501, 503]);

export async function streamChat(
  input: ChatTurnInput,
  handlers: ChatStreamHandlers = {},
  options: { signal?: AbortSignal; fetch?: typeof fetch; endpoint?: string } = {},
): Promise<ChatOutcome> {
  const doFetch = options.fetch ?? fetch;
  let text = '';
  let conversationId: string | null = input.conversationId ?? null;
  const stopped = (): ChatOutcome => ({ kind: 'stopped', text, conversationId });
  const failed = (): ChatOutcome => ({ kind: 'failed', text, conversationId });

  const body: ChatRequest = {
    message: input.message,
    locale: input.locale,
    pagePath: input.pagePath,
    history: input.history,
    stream: true,
    ...(conversationId ? { conversationId } : {}),
  };
  let response: Response;
  try {
    response = await doFetch(options.endpoint ?? '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin',
      signal: options.signal,
    });
  } catch {
    return options.signal?.aborted ? stopped() : failed();
  }

  if (!response.ok || !response.body) {
    void response.body?.cancel().catch(() => {});
    if (response.status === 429) {
      const seconds = Number(response.headers.get('retry-after'));
      return { kind: 'limited', retryAfterSeconds: Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 3600) : 60 };
    }
    return UNAVAILABLE_STATUS.has(response.status) ? { kind: 'unavailable' } : failed();
  }
  // Eine Weiterleitung auf eine HTML-Seite ist keine Chat-Antwort.
  if (!(response.headers.get('content-type') || '').includes('text/event-stream')) return failed();

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let briefing: BriefingDTO | null = null;
  let outcome: ChatOutcome | null = null;
  const handle = (event: ChatStreamEvent | null): void => {
    if (!event || outcome) return;
    if (event.type === 'start') {
      conversationId = event.conversationId || conversationId;
      if (conversationId) handlers.onStart?.(conversationId);
    } else if (event.type === 'delta') {
      if (typeof event.text !== 'string' || !event.text) return;
      text += event.text;
      handlers.onText?.(text);
    } else if (event.type === 'briefing') {
      if (event.briefing && typeof event.briefing.text === 'string' && event.briefing.text.trim()) briefing = event.briefing;
    } else if (event.type === 'done') {
      const final = typeof event.message?.content === 'string' ? event.message.content : text;
      // Antwort ohne Text und ohne Briefing ist eine Störung, keine leere Sprechblase.
      outcome = final.trim() || briefing ? { kind: 'done', text: final, briefing, conversationId } : failed();
    } else if (event.type === 'error') {
      outcome = failed();
    }
  };
  try {
    while (!outcome) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let split: number;
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        for (const line of frame.split('\n')) if (line.startsWith('data:')) handle(parseSseData(line));
      }
    }
  } catch {
    return options.signal?.aborted ? stopped() : failed();
  } finally {
    void reader.cancel().catch(() => {});
  }
  // Strom endete ohne Abschlussereignis (z. B. Zeitgrenze der Plattform).
  return outcome ?? (options.signal?.aborted ? stopped() : failed());
}
