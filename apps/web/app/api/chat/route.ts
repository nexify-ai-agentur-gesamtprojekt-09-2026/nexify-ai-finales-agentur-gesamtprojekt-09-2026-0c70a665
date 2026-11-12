/**
 * NeXify Live-Chat · POST /api/chat
 * Echter, modellgestützter Chat (Policy-Modell via 9router, config/llm-policy.json).
 * Persistiert Konversation/Nachrichten/Angebot in Supabase (self-hosted OSS), sofern
 * konfiguriert; sonst läuft der Chat weiter mit persisted:false (ehrlich kenntlich).
 * Antwort: Server-Sent-Events (Default) oder eine JSON-Antwort (stream:false).
 *
 * Fail-closed: ohne LLM-ENV (ROUTER_URL/ROUTER_KEY) => 503, kein Modellersatz.
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
import { chatLlmConfigured, chatModelId, streamChatCompletion, type LlmMessage } from '../../../lib/chat-llm';
import {
  appendMessage,
  ensureConversation,
  parseOfferDraft,
  persistOffer,
  stripOfferFence,
} from '../../../lib/chat-store';
import { sbSelect, supabaseConfigured } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOCALES: ReadonlySet<string> = new Set(['de', 'nl', 'fr', 'en']);
const MAX_MESSAGE = 8000;
const HISTORY_LIMIT = 20;

function err(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function systemPrompt(locale: ChatLocale, pagePath: string): string {
  return [
    'Du bist AIFly ORACLE, der Beratungs-Chat von NeXify AI („Chat it. Automate it.").',
    'NeXify ist eine B2B-KI-Automatisierungsagentur (Websites, KI-Agenten/Automatisierung, Online-Shops, Sichtbarkeit/Wachstum).',
    `Antworte auf der Sprache "${locale}". Sei präzise, ruhig, premium im Ton. Keine Floskeln.`,
    `Seitenkontext des Besuchers: ${pagePath}.`,
    'Ziel: den konkreten Bedarf des Interessenten verstehen und daraus ein individuelles Angebot formen.',
    'Stelle zuerst die wenigen entscheidenden Rückfragen. Sobald der Umfang klar ist, schlage ein Angebot vor.',
    'Ein Angebot gibst du zusätzlich zum Fließtext als EINEN Codeblock aus, exakt so:',
    '```offer',
    '{ "title": "...", "summary": "...", "currency": "EUR", "valid_until": "YYYY-MM-DD",',
    '  "items": [ { "description": "...", "quantity": 1, "unit_cents": null } ] }',
    '```',
    'Erfinde keine Preise oder verbindlichen Zusagen. Solange keine aktuell freigegebene Preisgrundlage',
    'vorliegt, setze unit_cents auf null und erkläre, dass ein individuelles Angebot vorbereitet wird.',
    'Die verbindliche Bestellung erfolgt erst später über den Bestell-Endpunkt.',
  ].join('\n');
}

async function loadHistory(conversationId: string): Promise<LlmMessage[]> {
  if (!supabaseConfigured() || conversationId.startsWith('local-')) return [];
  try {
    const rows = await sbSelect<Record<string, unknown>>(
      `chat_messages?conversation_id=eq.${encodeURIComponent(conversationId)}&select=role,content&order=created_at.asc&limit=${HISTORY_LIMIT}`,
    );
    return rows
      .map((r) => ({ role: r.role, content: r.content }))
      .filter((r): r is LlmMessage => (r.role === 'user' || r.role === 'assistant') && typeof r.content === 'string');
  } catch {
    return [];
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!chatLlmConfigured()) return err('chat_llm_not_configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return err('invalid_json', 400);
  }
  if (!body || typeof body !== 'object') return err('invalid_body', 400);
  const req = body as Partial<ChatRequest>;

  const message = typeof req.message === 'string' ? req.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE) return err('invalid_message', 422);
  const locale: ChatLocale = (typeof req.locale === 'string' && LOCALES.has(req.locale) ? req.locale : 'de') as ChatLocale;
  const pagePath = typeof req.pagePath === 'string' && req.pagePath.length <= 240 ? req.pagePath : '/';
  const wantsStream = req.stream !== false;

  const conversationId = await ensureConversation(
    typeof req.conversationId === 'string' ? req.conversationId.slice(0, 80) : undefined,
    { locale, pagePath },
  );
  const persisted = supabaseConfigured() && !conversationId.startsWith('local-');

  const history = await loadHistory(conversationId);
  await appendMessage(conversationId, 'user', message, null);

  const llmMessages: LlmMessage[] = [
    { role: 'system', content: systemPrompt(locale, pagePath) },
    ...history,
    { role: 'user', content: message },
  ];
  const model = chatModelId();

  // ---- Nicht-gestreamte JSON-Antwort ----
  if (!wantsStream) {
    let full = '';
    try {
      for await (const chunk of streamChatCompletion(llmMessages, { signal: request.signal })) full += chunk;
    } catch {
      return err('chat_llm_failed', 502);
    }
    const draft = parseOfferDraft(full);
    const visible = draft ? stripOfferFence(full) : full;
    await appendMessage(conversationId, 'assistant', full, model);
    const offer = draft ? await persistOffer(conversationId, draft) : null;
    const dto: ChatResponse = {
      conversationId,
      message: { role: 'assistant', content: visible, created_at: new Date().toISOString() },
      offer: offer ?? undefined,
      persisted,
      model,
    };
    return Response.json(dto, { headers: { 'Cache-Control': 'no-store' } });
  }

  // ---- Server-Sent-Events ----
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ChatStreamEvent) => controller.enqueue(encoder.encode(encodeSseEvent(ev)));
      let full = '';
      try {
        send({ type: 'start', conversationId, model, persisted });
        for await (const chunk of streamChatCompletion(llmMessages, { signal: request.signal })) {
          full += chunk;
          send({ type: 'delta', text: chunk });
        }
        const draft = parseOfferDraft(full);
        const visible = draft ? stripOfferFence(full) : full;
        await appendMessage(conversationId, 'assistant', full, model);
        if (draft) {
          const offer = await persistOffer(conversationId, draft);
          if (offer) send({ type: 'offer', offer });
        }
        const msg: ChatMessageDTO = { role: 'assistant', content: visible, created_at: new Date().toISOString() };
        send({ type: 'done', message: msg });
      } catch {
        send({ type: 'error', error: 'chat_llm_failed' });
      } finally {
        controller.close();
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
