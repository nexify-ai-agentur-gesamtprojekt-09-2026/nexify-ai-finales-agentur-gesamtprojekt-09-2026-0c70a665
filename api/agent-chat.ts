/** Vercel Node 22 Web handler. Public guided preview by default; managed live model only behind the server gate. No session, persistence or write tools. */
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { InputError, publicOrientation, validateOrientationInput } from '../packages/agent-runtime/public-orientation.ts';
import { assembleManagedLiveChat, managedLiveChatGate } from '../packages/agent-runtime/managed-live-chat.ts';
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

async function fetchHandler(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.pathname !== '/api/agent-chat' || url.search) throw new InputError('not_found', 404);
    if (request.method !== 'POST') return Response.json({ error: 'post_required' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
    if (request.headers.get('origin') !== url.origin) throw new InputError('same_origin_required', 403);
    if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') throw new InputError('application_json_required', 415);
    const input = validateOrientationInput(await readBounded(request));
    if (request.signal.aborted) throw new InputError('request_cancelled', 499);
    // Managed live path (owner request 04.11.2026: connect the AI). OFF by default and
    // fail-closed: it only engages when the server sets NEXIFY_LIVE_CHAT=enabled plus the
    // router URL/key, and assembleManagedLiveChat still refuses any endpoint other than the
    // pinned one. Setting those variables is the explicit funding release. The model stays
    // the policy pin (config/llm-policy.json); no secret is read into any response.
    const gate = managedLiveChatGate(liveEnv());
    if (gate.enabled) {
      let agent: ReturnType<typeof assembleManagedLiveChat>;
      try { agent = assembleManagedLiveChat({ routerUrl: gate.routerUrl, routerKey: gate.routerKey, fetch: globalThis.fetch }); }
      catch { throw new InputError('managed_live_chat_unavailable', 503); }
      const prompt = 'Locale: ' + input.locale + '. Current public page: ' + input.context.path
        + '. Answer briefly in that locale and point to the matching public page.\nQuestion: ' + input.question;
      const result = await agent.stream({ prompt, abortSignal: request.signal });
      return result.toUIMessageStreamResponse({ headers: { ...HEADERS, 'x-nexify-agent-mode': 'managed_live' },
        onError: () => 'managed_live_chat_unavailable' });
    }
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

export default { fetch: fetchHandler };
