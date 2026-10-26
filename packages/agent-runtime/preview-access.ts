/** Preview-only authenticated metadata read. Credits do not prove model entitlement.
 * Never generates text, creates a model, manually inspects credentials, or changes funds.
 * Vercel deployment protection is an external precondition, not implemented here.
 */
import { createGateway } from 'ai';
import policy from '../../config/llm-policy.json' with { type: 'json' };

const PROJECT = 'prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh';
const BRANCH = 'factory/source-faithful-rebuild-2026-10-26';
const DEADLINE_MS = 5000;
const MAX_BODY_BYTES = 256;
type Environment = Readonly<Record<string, string | undefined>>;
type CreditsReader = { getCredits(): Promise<unknown> };
type GatewayFactory = () => CreditsReader;
type Options = { environment?: Environment; gatewayFactory?: GatewayFactory };

class AccessError extends Error {
  status: number;
  constructor(code: string, status: number) { super(code); this.status = status; }
}

async function deadline<T>(work: Promise<T>, signal: AbortSignal, code: string, status: number): Promise<T> {
  if (signal.aborted) throw new AccessError('request_cancelled', 499);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let rejectAbort!: (error: AccessError) => void;
  const limit = new Promise<never>((_, reject) => {
    rejectAbort = reject;
    timer = setTimeout(() => reject(new AccessError(code, status)), DEADLINE_MS);
  });
  const abort = () => rejectAbort(new AccessError('request_cancelled', 499));
  signal.addEventListener('abort', abort, { once: true });
  try { return await Promise.race([work, limit]); }
  finally { if (timer) clearTimeout(timer); signal.removeEventListener('abort', abort); }
}

async function requireEmptyBody(request: Request): Promise<void> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)) throw new AccessError('body_byte_limit', 413);
  if (!request.body) throw new AccessError('empty_json_object_required', 422);
  if (request.signal.aborted) throw new AccessError('request_cancelled', 499);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let completed = false;
  try {
    await deadline((async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!(value instanceof Uint8Array)) throw new AccessError('invalid_body', 422);
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) throw new AccessError('body_byte_limit', 413);
        chunks.push(value);
      }
    })(), request.signal, 'body_deadline', 408);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body: unknown;
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new AccessError('invalid_json', 422); }
    if (body === null || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 0) throw new AccessError('empty_json_object_required', 422);
    completed = true;
  } finally {
    if (!completed) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function decimal(value: unknown): string {
  // No binary float conversion: tiny positive decimal balances stay positive.
  if (typeof value !== 'string' || value.length > 128 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) throw new Error('invalid_credit_metadata');
  return value;
}

export function createPreviewAccessHandler({ environment = process.env, gatewayFactory = () => createGateway() }: Options = {}) {
  return async function fetch(request: Request): Promise<Response> {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'x-nexify-agent-mode': 'preview_readonly_runtime_status' };
    const base = { model_id: policy.model.id, reasoning_effort: policy.model.reasoning_effort,
      live_model_enabled: false, funding_checked: false, funding_available: false,
      account_access_verified_read: false, entitlement_verified: false };
    let mode = 'preview_credits_probe_disabled';
    try {
      if (policy.model.id !== 'deepseek/deepseek-v4.1-flash-1017' || policy.model.reasoning_effort !== 'high') throw new Error('unsupported_policy');
      const url = new URL(request.url);
      if (url.pathname !== '/api/agent-runtime-status' || url.search) throw new AccessError('not_found', 404);
      if (request.method !== 'POST') return Response.json({ mode, ...base, error: 'post_required' }, { status: 405, headers: { ...headers, Allow: 'POST' } });
      if (request.headers.get('origin') !== url.origin) throw new AccessError('same_origin_required', 403);
      if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') throw new AccessError('application_json_required', 415);
      await requireEmptyBody(request);
      if (environment.NEXIFY_AI_GATEWAY_CREDITS_PROBE !== 'true') return Response.json({ mode, ...base }, { headers });
      if (environment.VERCEL_ENV !== 'preview' || environment.VERCEL_PROJECT_ID !== PROJECT || environment.VERCEL_GIT_COMMIT_REF !== BRANCH) throw new AccessError('preview_access_not_enabled', 403);
      // Presence alone rejects API-key auth; never inspect, decode or return it.
      if ('AI_GATEWAY_API_KEY' in environment) throw new AccessError('oidc_only_probe_required', 403);
      if (request.signal.aborted) throw new AccessError('request_cancelled', 499);
      mode = 'preview_readonly_credits_probe';
      // Normal SDK authentication resolves Vercel runtime OIDC. No apiKey,
      // custom provider URL, model construction, inference, or retry is supplied.
      const credits = await deadline(Promise.resolve().then(() => {
        if (request.signal.aborted) throw new AccessError('request_cancelled', 499);
        return gatewayFactory().getCredits();
      }), request.signal, 'runtime_access_unavailable', 503);
      if (credits === null || typeof credits !== 'object' || Array.isArray(credits)) throw new Error('invalid_credit_metadata');
      const metadata = credits as Record<string, unknown>;
      const balance = decimal(metadata.balance);
      decimal(metadata.totalUsed);
      return Response.json({ mode, ...base, funding_checked: true, funding_available: /[1-9]/.test(balance), account_access_verified_read: true }, { headers });
    } catch (error) {
      // Never expose SDK/provider errors, balance, totalUsed, headers or tokens.
      return Response.json({ mode, ...base, error: error instanceof AccessError ? error.message : 'runtime_access_unavailable' },
        { status: error instanceof AccessError ? error.status : 503, headers });
    }
  };
}
