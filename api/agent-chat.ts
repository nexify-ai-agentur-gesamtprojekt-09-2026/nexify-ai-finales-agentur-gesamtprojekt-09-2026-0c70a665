/** Vercel Node 22 Web handler. Public guided preview: no model, session, persistence or write tools. */
import { createUIMessageStream, createUIMessageStreamResponse, type ModelMessage } from 'ai';
import { InputError, publicOrientation, validateOrientationInput } from '../packages/agent-runtime/public-orientation.ts';
import { managedLiveChatGate } from '../packages/agent-runtime/managed-live-chat.ts';
import { createNineRouterModel } from '../packages/agent-runtime/nine-router-model.ts';
import { createPublicPageAgent } from '../packages/agent-runtime/model-agent.ts';
import { captureServerError, flush } from '../packages/observability/sentry-server.ts';

/** Server env for the off-by-default managed live path. No secret is read into the response. */
function liveEnv(): Record<string, string | undefined> {
  return typeof process !== 'undefined' && process?.env ? process.env : {};
}

const MAX_BYTES = 16 * 1024;
const BODY_DEADLINE_MS = 5000;
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'x-nexify-agent-mode': 'public_guided_preview', 'x-nexify-session': 'false', 'x-nexify-persistence': 'false' };

async function readBounded(request: Request): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) throw new InputError('body_byte_limit', 413);
  if (!request.body) throw new InputError('body_required');
  if (request.signal.aborted) throw new InputError('request_cancelled', 499);
  const reader = request.body.getReader();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fail!: (reason: InputError) => void;
  const deadline = new Promise<never>((_, reject) => { fail = reject;
    timer = setTimeout(() => reject(new InputError('body_deadline', 408)), BODY_DEADLINE_MS); });
  const abort = () => fail(new InputError('request_cancelled', 499));
  request.signal.addEventListener('abort', abort, { once: true });
  const chunks: Uint8Array[] = [];
  let length = 0;
  let completed = false;
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new InputError('invalid_body');
      length += value.byteLength;
      if (length > MAX_BYTES) throw new InputError('body_byte_limit', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new InputError('invalid_json'); }
    completed = true;
    return parsed;
  } finally {
    if (timer) clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
    if (!completed) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

type IsolatedTransport = { baseUrl: string; apiKey: string; fetch: typeof fetch };

/** Explicit server-side composition for isolated verification and a future authorised
 * runtime. It is never constructed from HTTP input or used by the deployed handler.
 * The caller must separately establish router identity, tenant and spending controls. */
export function createIsolatedLiveChatHandler(transport: IsolatedTransport) {
  const model = createNineRouterModel(transport);
  const agent = createPublicPageAgent({ model });
  return { fetch: (request: Request) => fetchHandler(request, agent) };
}

async function fetchHandler(request: Request, isolatedAgent?: ReturnType<typeof createPublicPageAgent>): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.pathname !== '/api/agent-chat' || url.search) throw new InputError('not_found', 404);
    if (request.method !== 'POST') return Response.json({ error: 'post_required' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
    if (request.headers.get('origin') !== url.origin) throw new InputError('same_origin_required', 403);
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') throw new InputError('application_json_required', 415);
    const raw = await readBounded(request);
    const input = validateOrientationInput(raw);
    if (request.signal.aborted) throw new InputError('request_cancelled', 499);
    if (isolatedAgent) {
      // validateOrientationInput has already rejected system/tool messages, unknown
      // fields, private paths and oversized content. Client assistant turns remain
      // untrusted context: no tools, authority or metadata are accepted from them.
      const body = raw as { messages: { role: 'user' | 'assistant'; parts: { text: string }[] }[] };
      if (body.messages.at(-1)?.role !== 'user') throw new InputError('user_turn_required');
      const history: ModelMessage[] = body.messages.map(message => ({ role: message.role,
        content: message.parts.map(part => part.text).join(' ') }));
      const last = history[history.length - 1];
      if (last.role !== 'user' || typeof last.content !== 'string') throw new InputError('user_turn_required');
      last.content = `[Aktueller öffentlicher Seitenkontext: ${input.context.path}; Sprache: ${input.locale}]\n\n${last.content}`;
      const responseCancelled = new AbortController();
      const signal = AbortSignal.any([request.signal, responseCancelled.signal]);
      const result = await isolatedAgent.stream({ messages: history, abortSignal: signal });
      const stream = createUIMessageStream({ async execute({ writer }) {
        writer.write({ type: 'start' });
        writer.write({ type: 'data-page', data: input.context });
        writer.write({ type: 'text-start', id: 'oracle-live' });
        let hasText = false;
        for await (const part of result.fullStream) {
          if (part.type === 'error') throw new Error('oracle_live_unavailable');
          if (part.type === 'text-delta') {
            hasText = true;
            writer.write({ type: 'text-delta', id: 'oracle-live', delta: part.text });
          }
        }
        if (!hasText) throw new Error('oracle_live_unavailable');
        writer.write({ type: 'text-end', id: 'oracle-live' });
        writer.write({ type: 'finish', finishReason: 'stop' });
      }, onError: () => 'oracle_live_unavailable' });
      const response = createUIMessageStreamResponse({ stream, headers: { ...HEADERS, 'x-nexify-agent-mode': 'isolated_live_test' } });
      if (!response.body) throw new Error('oracle_live_unavailable');
      // The platform may cancel the response body without aborting request.signal.
      // Propagate that separate lifecycle signal back through the SDK to 9router.
      const reader = response.body.getReader();
      const bodyStream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await reader.read();
            if (next.done) { reader.releaseLock(); controller.close(); }
            else controller.enqueue(next.value);
          } catch { reader.releaseLock(); controller.error(new Error('oracle_live_unavailable')); }
        },
        async cancel() {
          responseCancelled.abort();
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        },
      });
      return new Response(bodyStream, { status: response.status, headers: response.headers });
    }
    // Managed live DeepSeek path is wired (packages/agent-runtime/managed-live-chat.ts) but
    // OFF by default and fail-closed: it only engages with an explicit server flag plus the
    // managed 9router configuration, and even then requires a separately authorised router
    // binding + funding release. No secret is read into any response. Preview/CI never set
    // these, so the deterministic public orientation below stays the live behaviour.
    const gate = managedLiveChatGate(liveEnv());
    if (gate.enabled) throw new InputError('managed_live_chat_unavailable', 503);
    const answer = publicOrientation(input);
    const stream = createUIMessageStream({ execute({ writer }) {
      if (request.signal.aborted) { writer.write({ type: 'abort', reason: 'request_cancelled' }); return; }
      writer.write({ type: 'start' });
      writer.write({ type: 'data-page', data: input.context });
      writer.write({ type: 'text-start', id: 'public-orientation' });
      writer.write({ type: 'text-delta', id: 'public-orientation', delta: answer });
      writer.write({ type: 'text-end', id: 'public-orientation' });
      writer.write({ type: 'finish', finishReason: 'stop' });
    }, onError: () => 'public_orientation_unavailable' });
    return createUIMessageStreamResponse({ stream, headers: HEADERS });
  } catch (error) {
    if (!(error instanceof InputError)) { captureServerError(error, { route: '/api/agent-chat' }); await flush(); }
    return Response.json({ error: error instanceof InputError ? error.message : 'public_orientation_unavailable' },
      { status: error instanceof InputError ? error.status : 500, headers: HEADERS });
  }
}

export default { fetch: (request: Request) => fetchHandler(request) };
