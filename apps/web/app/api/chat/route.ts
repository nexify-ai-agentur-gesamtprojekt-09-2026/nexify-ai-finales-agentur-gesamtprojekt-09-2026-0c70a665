/**
 * NeXify Live-Chat · POST /api/chat
 * Echter, modellgestützter Chat (Policy-Modell via 9router, config/llm-policy.json).
 * Persistiert Konversation/Nachrichten/Angebot in Supabase (self-hosted OSS), sofern
 * konfiguriert; sonst läuft der Chat weiter mit persisted:false (ehrlich kenntlich).
 * Antwort: Server-Sent-Events (Default) oder eine JSON-Antwort (stream:false).
 * Gesprächsführung und Leitplanken: lib/chat-guidance.ts (versioniert). Die Modellantwort erreicht
 * den Besucher erst nach der Prüfung durch createOutputGuard.
 *
 * Fail-closed: ohne LLM-ENV (ROUTER_URL/ROUTER_KEY) => 503, kein Modellersatz.
 * Störungen: Der Besucher erhält nur den festen Code chat_llm_failed. Die Ursache steht als
 * eine geheimnisfreie JSON-Zeile im Serverprotokoll (siehe logChatFailure).
 * Keine Secrets im Code, keine erfundenen Werte.
 */
import type {
  ChatLocale,
  ChatMessageDTO,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
} from '../../../lib/chat-contract';
import { CHAT_SSE_CONTENT_TYPE, encodeSseEvent } from '../../../lib/chat-contract';
import {
  chatLlmConfigured,
  chatModelId,
  describeChatFailure,
  streamChatCompletion,
  type LlmMessage,
} from '../../../lib/chat-llm';
import { appendMessage, ensureConversation, parseOfferDraft, persistOffer } from '../../../lib/chat-store';
import { sbSelect, supabaseConfigured } from '../../../lib/supabase-rest';
import {
  CHAT_GUIDANCE_VERSION,
  buildSystemPrompt,
  createOutputGuard,
  formatBriefing,
  parseBriefing,
  safePagePath,
  sanitizeClientHistory,
  visitorAmounts,
  type GuidanceTurn,
  type OutputGuard,
} from '../../../lib/chat-guidance';
import { chatRateLimit, clientKey } from '../../../lib/chat-rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOCALES: ReadonlySet<string> = new Set(['de', 'nl', 'fr', 'en']);
// Die Oberfläche begrenzt auf 1.000 Zeichen; die Route lässt Spielraum für andere Eingänge.
const MAX_MESSAGE = 4000;
const MAX_BODY_BYTES = 64 * 1024;
const HISTORY_LIMIT = 20;

function err(error: string, status: number, headers: Record<string, string> = {}): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

/** Browser-Aufrufe nur von der eigenen Seite. Aufrufe ohne Origin (Server, Rauchtest) bleiben möglich. */
function crossOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') === 'cross-site';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** Ausgelöste Leitplanken zählen: nur Kennwörter, kein Antwort- oder Nutzertext. */
function logGuardrail(guard: OutputGuard, stream: boolean): void {
  if (guard.violations.length === 0) return;
  console.warn(JSON.stringify({ event: 'chat_guardrail', route: '/api/chat', stream, guidance: CHAT_GUIDANCE_VERSION, violations: [...new Set(guard.violations)], count: guard.violations.length }));
}

type FailureStage = 'llm' | 'persistence';

/**
 * Eine JSON-Zeile je Störung für das Serverprotokoll (Vercel-Laufzeitprotokoll).
 * Enthält ausschließlich feste Kennwörter, Statuszahl, Systemfehlercode und Dauer.
 * Niemals: Adresse oder Parameter des Routers, Schlüssel, Antworttext, Nutzertext, Konversations-ID.
 */
function logChatFailure(stage: FailureStage, error: unknown, context: { stream: boolean; startedAt: number; step?: string }): void {
  const entry: Record<string, string | number | boolean> = {
    event: 'chat_failure',
    route: '/api/chat',
    stage,
    stream: context.stream,
    elapsed_ms: Date.now() - context.startedAt,
  };
  if (context.step) entry.step = context.step;
  if (stage === 'llm') {
    Object.assign(entry, describeChatFailure(error));
  } else {
    // Meldungen des Speichers enthalten Pfad und Antworttext: nur die Statuszahl übernehmen.
    const status = error instanceof Error ? /-> (\d{3})\b/.exec(error.message)?.[1] : undefined;
    entry.cause = error instanceof Error && error.message === 'supabase_not_configured' ? 'not_configured' : status ? 'upstream_http' : 'unexpected';
    if (status) entry.status = Number(status);
  }
  const line = JSON.stringify(entry);
  // Ein Abbruch durch den Besucher ist keine Störung des Dienstes.
  if (entry.cause === 'client_abort') console.info(line);
  else console.error(line);
}

/** Speicherfehler dürfen die Antwort nicht verhindern und nicht als Modellfehler erscheinen. */
async function persistenceStep<T>(step: string, run: () => Promise<T>, fallback: T, context: { stream: boolean; startedAt: number }): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logChatFailure('persistence', error, { ...context, step });
    return fallback;
  }
}

async function loadHistory(conversationId: string): Promise<GuidanceTurn[]> {
  if (!supabaseConfigured() || conversationId.startsWith('local-')) return [];
  try {
    const rows = await sbSelect<Record<string, unknown>>(
      `chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=role,content&order=created_at.asc&limit=${HISTORY_LIMIT}`,
    );
    return rows
      .map((r) => ({ role: r.role, content: r.content }))
      .filter((r): r is GuidanceTurn => (r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string');
  } catch {
    return [];
  }
}

export async function POST(request: Request): Promise<Response> {
  if (crossOrigin(request)) return err('same_origin_required', 403);
  if (!chatLlmConfigured()) return err('chat_llm_not_configured', 503);

  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES) return err('body_too_large', 413);
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return err('body_too_large', 413);
    body = JSON.parse(raw);
  } catch {
    return err('invalid_json', 400);
  }
  if (!body || typeof body !== 'object') return err('invalid_body', 400);
  const req = body as Partial<ChatRequest> & { page_path?: unknown };

  const message = typeof req.message === 'string' ? req.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE) return err('invalid_message', 422);
  const locale: ChatLocale = (typeof req.locale === 'string' && LOCALES.has(req.locale) ? req.locale : 'de') as ChatLocale;
  const pagePath = safePagePath(req.pagePath ?? req.page_path);
  const wantsStream = req.stream !== false;

  // Begrenzung je Absender, bevor Speicher oder Modell angesprochen werden.
  const limit = chatRateLimit(clientKey(request));
  if (!limit.allowed) return err('chat_rate_limited', 429, { 'Retry-After': String(limit.retryAfterSeconds) });

  const startedAt = Date.now();
  const logContext = { stream: wantsStream, startedAt };
  const requestedId = typeof req.conversationId === 'string' ? req.conversationId.slice(0, 80) : undefined;
  const localId = requestedId?.startsWith('local-') ? requestedId : `local-${crypto.randomUUID()}`;
  const conversationId =
    (await persistenceStep('conversation', () => ensureConversation(requestedId, { locale, pagePath }), localId, logContext)) || localId;
  const persisted = supabaseConfigured() && !conversationId.startsWith('local-');

  // Gespeicherter Verlauf hat Vorrang. Ohne Speicherung zählt der begrenzte Verlauf aus dem
  // Browser: Kontext des Besuchers, kein Nachweis und nie eine Systemvorgabe.
  const stored = await loadHistory(conversationId);
  const history = stored.length > 0 ? sanitizeClientHistory(stored) : sanitizeClientHistory(req.history);
  await persistenceStep('user_message', () => appendMessage(conversationId, 'user', message, null), undefined, logContext);

  const llmMessages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt({ locale, pagePath }) },
    ...history,
    { role: 'user', content: message },
  ];
  const allowedAmounts = visitorAmounts(history, message);
  const guard = createOutputGuard({ locale, allowedAmounts });
  let model: string;
  try {
    model = chatModelId();
  } catch (error) {
    logChatFailure('llm', error, logContext);
    return err('chat_llm_failed', 502);
  }

  /** Nach vollständiger Antwort: Blöcke auswerten, speichern, Ergebnis für beide Antwortformen. */
  const conclude = async () => {
    const visible = guard.text;
    const briefingBlock = [...guard.blocks].reverse().find((block) => block.lang === 'briefing');
    const briefingData = briefingBlock ? parseBriefing(briefingBlock.body, allowedAmounts) : null;
    const briefing = briefingData ? { data: briefingData, text: formatBriefing(briefingData, locale) } : null;
    const offerBlock = guard.blocks.find((block) => block.lang === 'offer' || block.lang === 'offer-json');
    const draft = offerBlock ? parseOfferDraft('```offer\n' + offerBlock.body + '\n```') : null;
    // Preise setzt ausschließlich der Inhaber: ein vom Modell gesetzter Betrag wird verworfen.
    if (draft) for (const item of draft.items) { item.unit_cents = null; item.line_cents = null; }
    logGuardrail(guard, wantsStream);
    // Gespeichert wird die geprüfte Fassung, damit ein verworfener Betrag nicht in den Verlauf zurückkehrt.
    const record = briefingBlock && briefingData ? `${visible}\n\n\`\`\`briefing\n${JSON.stringify(briefingData)}\n\`\`\`` : visible;
    await persistenceStep('assistant_message', () => appendMessage(conversationId, 'assistant', record, model), undefined, logContext);
    const offer = draft ? await persistenceStep('offer', () => persistOffer(conversationId, draft), null, logContext) : null;
    return { visible, briefing, offer };
  };

  // ---- Nicht-gestreamte JSON-Antwort ----
  if (!wantsStream) {
    try {
      for await (const chunk of streamChatCompletion(llmMessages, { signal: request.signal })) guard.push(chunk);
      guard.finish();
    } catch (error) {
      logChatFailure('llm', error, logContext);
      return err('chat_llm_failed', 502);
    }
    const { visible, briefing, offer } = await conclude();
    const dto: ChatResponse = {
      conversationId,
      message: { role: 'assistant', content: visible, created_at: new Date().toISOString() },
      offer: offer ?? undefined,
      briefing: briefing ?? undefined,
      persisted,
      model,
      guidance: CHAT_GUIDANCE_VERSION,
    };
    return Response.json(dto, { headers: { 'Cache-Control': 'no-store' } });
  }

  // ---- Server-Sent-Events ----
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ChatStreamEvent) => controller.enqueue(encoder.encode(encodeSseEvent(ev)));
      try {
        send({ type: 'start', conversationId, model, persisted, guidance: CHAT_GUIDANCE_VERSION });
        try {
          for await (const chunk of streamChatCompletion(llmMessages, { signal: request.signal })) {
            const safe = guard.push(chunk);
            if (safe) send({ type: 'delta', text: safe });
          }
          const rest = guard.finish();
          if (rest) send({ type: 'delta', text: rest });
        } catch (error) {
          logChatFailure('llm', error, logContext);
          send({ type: 'error', error: 'chat_llm_failed' });
          return;
        }
        const { visible, briefing, offer } = await conclude();
        if (briefing) send({ type: 'briefing', briefing });
        if (offer) send({ type: 'offer', offer });
        const msg: ChatMessageDTO = { role: 'assistant', content: visible, created_at: new Date().toISOString() };
        send({ type: 'done', message: msg });
      } catch {
        // Der Besucher hat die Verbindung geschlossen: nichts mehr zu senden.
      } finally {
        try { controller.close(); } catch { /* bereits geschlossen */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': CHAT_SSE_CONTENT_TYPE,
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
