/** Server-only 9router transport primitive. This is not an activation, budget,
 * tenant, or endpoint-identity check. The caller must establish those independently.
 * The public route does not import this module and remains disabled for live AI.
 *
 * Only an explicit loopback binding is accepted: any remote connection needs a
 * separately verified local gateway/tunnel. A loopback address alone does not prove
 * that the service behind it is 9router. No environment variables are read here.
 */
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { EXACT_MODEL_ID, MAX_OUTPUT_TOKENS } from './model-agent.ts';

const MODEL = 'deepseek/deepseek-v4.1-flash-1017';
const MAX_BODY_BYTES = 1024 * 1024;
const REQUEST_DEADLINE_MS = 60_000;
const allowedBodyKeys = new Set([
  'model', 'messages', 'max_tokens', 'reasoning', 'stream', 'stream_options',
  'tools', 'tool_choice', 'temperature', 'top_p', 'top_k', 'frequency_penalty',
  'presence_penalty', 'seed', 'stop', 'response_format',
]);

function endpointForBinding(baseUrl: string): { base: string; endpoint: string } {
  let url: URL;
  try { url = new URL(baseUrl); } catch { throw new Error('invalid_ninerouter_binding'); }
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.port || url.username || url.password || url.search || url.hash
      || !/^\/(?:api\/)?v1\/?$/.test(url.pathname)) {
    throw new Error('invalid_ninerouter_binding');
  }
  const base = `${url.origin}${url.pathname.replace(/\/$/, '')}`;
  return { base, endpoint: `${base}/chat/completions` };
}

export function createNineRouterModel(options: { baseUrl: string; apiKey: string; fetch: typeof fetch }) {
  if (EXACT_MODEL_ID !== MODEL) throw new Error('unsupported_model_policy');
  if (!options || typeof options !== 'object' || Array.isArray(options)
      || Reflect.ownKeys(options).some(key => typeof key !== 'string' || !['baseUrl', 'apiKey', 'fetch'].includes(key))) {
    throw new Error('unsupported_model_options');
  }
  if (typeof options.baseUrl !== 'string') throw new Error('invalid_ninerouter_binding');
  const { base, endpoint } = endpointForBinding(options.baseUrl);
  if (typeof options.apiKey !== 'string' || !options.apiKey || options.apiKey.length > 4096
      || /[\u0000-\u0020\u007f]/.test(options.apiKey)) throw new Error('explicit_server_key_required');
  if (typeof options.fetch !== 'function') throw new Error('explicit_server_fetch_required');

  const safeFetch: typeof fetch = async (input, init) => {
    if (String(input) !== endpoint || init?.method !== 'POST' || typeof init.body !== 'string'
        || Buffer.byteLength(init.body, 'utf8') > MAX_BODY_BYTES) throw new Error('ninerouter_request_policy_violation');
    const headers = new Headers(init.headers);
    if (headers.get('authorization') !== `Bearer ${options.apiKey}`
        || headers.get('content-type') !== 'application/json'
        || [...headers.keys()].some(name => !['authorization', 'content-type', 'user-agent'].includes(name))) {
      throw new Error('ninerouter_request_policy_violation');
    }
    let body: unknown;
    try { body = JSON.parse(init.body); } catch { throw new Error('ninerouter_request_policy_violation'); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('ninerouter_request_policy_violation');
    const request = body as Record<string, unknown>;
    if (Object.keys(request).some(key => !allowedBodyKeys.has(key)) || request.model !== MODEL
        || !Array.isArray(request.messages) || request.messages.length < 1 || request.messages.length > 64
        || !Number.isInteger(request.max_tokens) || (request.max_tokens as number) < 1
        || (request.max_tokens as number) > MAX_OUTPUT_TOKENS
        || JSON.stringify(request.reasoning) !== '{"effort":"high"}'
        || (request.stream !== undefined && typeof request.stream !== 'boolean')) {
      throw new Error('ninerouter_request_policy_violation');
    }
    if (request.tools !== undefined && (!Array.isArray(request.tools) || request.tools.length > 1
        || request.tools.some((item: unknown) => !item || typeof item !== 'object'
          || (item as { type?: unknown }).type !== 'function'
          || (item as { function?: { name?: unknown } }).function?.name !== 'publicPageInfo'))) {
      throw new Error('ninerouter_request_policy_violation');
    }
    // Never follow a redirect with server credentials. Do not surface upstream error bodies.
    let response: Response;
    const deadline = AbortSignal.timeout(REQUEST_DEADLINE_MS);
    const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    try { response = await options.fetch(endpoint, { ...init, headers, signal, redirect: 'error' }); }
    catch (error) {
      if (init.signal?.aborted) throw error;
      throw new Error('ninerouter_transport_failed');
    }
    if (!response.ok) return new Response('{"error":{"message":"ninerouter_unavailable"}}', {
      status: 502, headers: { 'content-type': 'application/json' },
    });
    return response;
  };

  const provider = createOpenRouter({ baseURL: base, apiKey: options.apiKey, fetch: safeFetch, compatibility: 'strict' });
  const model = provider.chat(MODEL, { reasoning: { effort: 'high' } });
  function validateCall(input: Parameters<typeof model.doGenerate>[0]) {
    if (input.providerOptions != null && (typeof input.providerOptions !== 'object'
        || Array.isArray(input.providerOptions) || Reflect.ownKeys(input.providerOptions).length)) {
      throw new Error('unsupported_provider_options');
    }
    if (input.reasoning !== undefined && input.reasoning !== 'high') throw new Error('ninerouter_request_policy_violation');
    if (!Number.isInteger(input.maxOutputTokens) || input.maxOutputTokens! < 1 || input.maxOutputTokens! > MAX_OUTPUT_TOKENS) {
      throw new Error('ninerouter_request_policy_violation');
    }
  }
  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    supportedUrls: model.supportedUrls,
    async doGenerate(input: Parameters<typeof model.doGenerate>[0]) {
      validateCall(input);
      try {
        const result = await model.doGenerate({ ...input, providerOptions: Object.create(null) });
        const content = result.content.map(item => {
          const copy = { ...item };
          delete (copy as { providerMetadata?: unknown }).providerMetadata;
          return copy;
        });
        // SDK request/response details may contain user messages or upstream headers.
        return { content, finishReason: result.finishReason, usage: result.usage, warnings: [] };
      }
      catch {
        if (input.abortSignal?.aborted) throw new DOMException('cancelled', 'AbortError');
        throw new Error('ninerouter_unavailable');
      }
    },
    async doStream(input: Parameters<typeof model.doStream>[0]) {
      validateCall(input);
      try {
        const result = await model.doStream({ ...input, providerOptions: Object.create(null) });
        const reader = result.stream.getReader();
        const stream = new ReadableStream<Awaited<ReturnType<typeof reader.read>>['value']>({
          async pull(controller) {
            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) { reader.releaseLock(); controller.close(); return; }
                if (value.type === 'response-metadata' || value.type === 'raw') continue;
                if (value.type === 'error') {
                  controller.enqueue({ type: 'error', error: new Error('ninerouter_unavailable') });
                } else if (value.type === 'stream-start') {
                  controller.enqueue({ type: 'stream-start', warnings: [] });
                } else {
                  const copy = { ...value };
                  delete (copy as { providerMetadata?: unknown }).providerMetadata;
                  controller.enqueue(copy);
                }
                return;
              }
            } catch { reader.releaseLock(); controller.error(new Error('ninerouter_stream_failed')); }
          },
          async cancel() { await reader.cancel().catch(() => {}); reader.releaseLock(); },
        });
        // No raw request body or response headers reach SDK clients or telemetry.
        return { stream };
      }
      catch {
        if (input.abortSignal?.aborted) throw new DOMException('cancelled', 'AbortError');
        throw new Error('ninerouter_unavailable');
      }
    },
  };
}
