/**
 * NeXify Live-Chat · POST /api/chat
 * Echter, modellgestützter Chat (Policy-Modell via 9router, config/llm-policy.json).
 * Persistiert Konversation/Nachrichten/Angebot in Supabase (self-hosted OSS), sofern
 * konfiguriert; sonst läuft der Chat weiter mit persisted:false (ehrlich kenntlich).
 * Antwort: Server-Sent-Events (Default) oder eine JSON-Antwort (stream:false).
 * Gesprächsführung und Leitplanken: lib/chat-guidance.ts (versioniert). Die Modellantwort erreicht
 * den Besucher erst nach der Prüfung durch createOutputGuard.
 *
 * Fail-closed: ohne LLM-ENV (ROUTER_URL/ROUTER_KEY) => 503, kein Modellersatz. Das Protokoll nennt
 * dabei die Namen der fehlenden Variablen (logChatRejected).
 * Störungen: Der Besucher erhält nur den festen Code chat_llm_failed. Die Ursache steht als
 * eine geheimnisfreie JSON-Zeile im Serverprotokoll (siehe logChatFailure).
 * Keine Secrets im Code, keine erfundenen Werte.
 * Leitungsweg: Standard ist der 9router. Nur mit CHAT_LLM_ROUTE=cloudflare-ai-gateway läuft der
 * Aufruf über das Cloudflare AI Gateway (./llm-gateway.ts); ein unbekannter Wert ergibt 503.
 * Die Modellkennung geht nicht an den Browser (Inhaberentscheidung 13.11.2026, DECISIONS.md D-010);
 * sie bleibt in der Ablage der Nachricht.
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
import { SupabaseTimeoutError, sbSelect, supabaseConfigured } from '../../../lib/supabase-rest';
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
import { chatLlmRoute, gatewayConfigured, missingGatewayEnv, streamGatewayCompletion, type ChatLlmRoute } from './llm-gateway';

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
    entry.cause = error instanceof SupabaseTimeoutError ? 'timeout' : error instanceof Error && error.message === 'supabase_not_configured' ? 'not_configured' : status ? 'upstream_http' : 'unexpected';
    if (status) entry.status = Number(status);
  }
  const line = JSON.stringify(entry);
  // Ein Abbruch durch den Besucher ist keine Störung des Dienstes.
  if (entry.cause === 'client_abort') console.info(line);
  else console.error(line);
}

/**
 * Speicherfehler dürfen die Antwort nicht verhindern und nicht als Modellfehler erscheinen.
 * Nach dem ersten Fehlschlag entfallen die weiteren Speicherschritte dieser Anfrage: ein hängender
 * Speicher kostet höchstens ein Zeitlimit, nicht eines je Schritt.
 */
async function persistenceStep<T>(step: string, run: () => Promise<T>, fallback: T, context: { stream: boolean; startedAt: number; storeFailed?: boolean }): Promise<T> {
  if (context.storeFailed) return fallback;
  try {
    return await run();
  } catch (error) {
    // Merken, damit die Antwort nicht behauptet, das Gespräch sei gespeichert.
    context.storeFailed = true;
    logChatFailure('persistence', error, { ...context, step });
    return fallback;
  }
}

/**
 * Die jüngsten Beiträge der Konversation in zeitlicher Reihenfolge. Geladen wird absteigend und
 * begrenzt, damit bei langen Gesprächen die letzten Beiträge zählen und nicht die ersten; danach
 * wird umgekehrt. Ein Fehler oder Zeitlimit wirft, damit persistenceStep ihn protokolliert.
 */
async function loadHistory(conversationId: string): Promise<GuidanceTurn[]> {
  if (!supabaseConfigured() || conversationId.startsWith('local-')) return [];
  const rows = await sbSelect<Record<string, unknown>>(
    `chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=role,content&order=created_at.desc&limit=${HISTORY_LIMIT}`,
  );
  return rows
    .reverse()
    .map((r) => ({ role: r.role, content: r.content }))
    .filter((r): r is GuidanceTurn => (r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string');
}

/**
 * Eine JSON-Zeile, wenn die Route eine Anfrage vor dem Modellaufruf abweist und der Chat dadurch
 * für den Besucher nicht nutzbar ist. Nur feste Kennwörter und Namen von Variablen, niemals deren
 * Werte, keine Adresse, kein Nutzertext.
 */
function logChatRejected(entry: Record<string, string | number | boolean | string[]>): void {
  console.error(JSON.stringify({ event: 'chat_rejected', route: '/api/chat', ...entry }));
}

/** Namen der fehlenden Variablen für den Modellaufruf (nur Namen). */
function missingLlmEnv(): string[] {
  const missing: string[] = [];
  if (!process.env.CHAT_COMPLETIONS_URL && !process.env.ROUTER_URL) missing.push('ROUTER_URL/CHAT_COMPLETIONS_URL');
  if (!process.env.ROUTER_KEY) missing.push('ROUTER_KEY');
  return missing;
}

/** Auf welcher Art Stand die Funktion läuft; nur die von der Plattform gesetzte Kennung. */
function deploymentKind(): string {
  const value = process.env.VERCEL_ENV;
  return value === 'production' || value === 'preview' || value === 'development' ? value : 'unset';
}

export async function POST(request: Request): Promise<Response> {
  if (crossOrigin(request)) {
    // Ohne Namen der Hosts: nur, woher der Vergleichswert stammt.
    logChatRejected({
      status: 403,
      cause: 'same_origin_required',
      has_origin: request.headers.has('origin'),
      host_source: request.headers.get('x-forwarded-host') ? 'x-forwarded-host' : request.headers.get('host') ? 'host' : 'url',
      deployment: deploymentKind(),
    });
    return err('same_origin_required', 403);
  }
  let llmRoute: ChatLlmRoute;
  try {
    llmRoute = chatLlmRoute();
  } catch {
    // Unbekannter Wert in CHAT_LLM_ROUTE: nicht raten, nicht auf den Standard zurückfallen.
    logChatRejected({ status: 503, cause: 'route_invalid', deployment: deploymentKind() });
    return err('chat_llm_not_configured', 503);
  }
  const viaGateway = llmRoute === 'cloudflare-ai-gateway';
  if (viaGateway ? !gatewayConfigured() : !chatLlmConfigured()) {
    logChatRejected(viaGateway
      ? { status: 503, cause: 'not_configured', missing: missingGatewayEnv(), deployment: deploymentKind(), llm_route: llmRoute }
      : { status: 503, cause: 'not_configured', missing: missingLlmEnv(), deployment: deploymentKind() });
    return err('chat_llm_not_configured', 503);
  }
  const complete = viaGateway ? streamGatewayCompletion : streamChatCompletion;

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
  const logContext: { stream: boolean; startedAt: number; storeFailed?: boolean } = { stream: wantsStream, startedAt };
  const requestedId = typeof req.conversationId === 'string' ? req.conversationId.slice(0, 80) : undefined;
  const localId = requestedId?.startsWith('local-') ? requestedId : `local-${crypto.randomUUID()}`;
  const conversationId =
    (await persistenceStep('conversation', () => ensureConversation(requestedId, { locale, pagePath }), localId, logContext)) || localId;
  // Gespeichert gilt nur, solange kein Schreibschritt fehlgeschlagen ist.
  const isPersisted = () => supabaseConfigured() && !conversationId.startsWith('local-') && !logContext.storeFailed;

  // Gespeicherter Verlauf hat Vorrang. Ohne Speicherung zählt der begrenzte Verlauf aus dem
  // Browser: Kontext des Besuchers, kein Nachweis und nie eine Systemvorgabe.
  const stored = await persistenceStep('history', () => loadHistory(conversationId), [] as GuidanceTurn[], logContext);
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

  /** Nach vollständiger Antwort: Blöcke auswerten. Ohne Speicherzugriff, damit das Ergebnis sofort feststeht. */
  const evaluate = () => {
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
    return { visible, briefing, draft, record };
  };
  /** Antwort und Angebot ablegen. Im Strom läuft das erst nach dem Abschlussereignis. */
  const store = async (result: ReturnType<typeof evaluate>) => {
    await persistenceStep('assistant_message', () => appendMessage(conversationId, 'assistant', result.record, model), undefined, logContext);
    return result.draft ? persistenceStep('offer', () => persistOffer(conversationId, result.draft!), null, logContext) : null;
  };

  // ---- Nicht-gestreamte JSON-Antwort ----
  if (!wantsStream) {
    try {
      for await (const chunk of complete(llmMessages, { signal: request.signal })) guard.push(chunk);
      guard.finish();
    } catch (error) {
      logChatFailure('llm', error, logContext);
      return err('chat_llm_failed', 502);
    }
    const result = evaluate();
    const { visible, briefing } = result;
    // Die JSON-Antwort trägt das abgelegte Angebot selbst: hier wird vor der Antwort gespeichert.
    const offer = await store(result);
    const dto: ChatResponse = {
      conversationId,
      message: { role: 'assistant', content: visible, created_at: new Date().toISOString() },
      offer: offer ?? undefined,
      briefing: briefing ?? undefined,
      persisted: isPersisted(),
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
        send({ type: 'start', conversationId, persisted: isPersisted(), guidance: CHAT_GUIDANCE_VERSION });
        try {
          for await (const chunk of complete(llmMessages, { signal: request.signal })) {
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
        const result = evaluate();
        if (result.briefing) send({ type: 'briefing', briefing: result.briefing });
        const msg: ChatMessageDTO = { role: 'assistant', content: result.visible, created_at: new Date().toISOString() };
        // Der Besucher erhält den Abschluss sofort; das Speichern folgt und kann die Antwort nicht mehr aufhalten.
        send({ type: 'done', message: msg });
        let offer: Awaited<ReturnType<typeof store>> = null;
        try {
          offer = await store(result);
        } catch {
          /* persistenceStep fängt und protokolliert bereits. */
        }
        // Nachgelagert für Abnehmer, die den Strom bis zum Ende lesen; die eigene Oberfläche endet mit „done".
        if (offer) send({ type: 'offer', offer });
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
