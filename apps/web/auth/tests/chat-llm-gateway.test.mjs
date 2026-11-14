import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

// Leitungsweg Cloudflare AI Gateway (app/api/chat/llm-gateway.ts): standardmäßig aus,
// exakt das Policy-Modell, kein Ersatz, keine Geheimnisse im Protokoll.
const ROOT = fileURLToPath(new URL('../../../..', import.meta.url));
const policy = JSON.parse(readFileSync(ROOT + '/config/llm-policy.json', 'utf8'));
const ENV_KEYS = ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'CHAT_LLM_ROUTE', 'CF_AIG_CHAT_URL', 'CF_AIG_TOKEN',
  'CF_AIG_BYOK_ALIAS', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL_ENV'];
const GATEWAY_URL = 'https://gateway.invalid/v1/konto/default/openrouter/v1/chat/completions';
const GATEWAY = { CHAT_LLM_ROUTE: 'cloudflare-ai-gateway', CF_AIG_CHAT_URL: GATEWAY_URL, CF_AIG_TOKEN: 'fixture-gateway-token' };
const ROUTER = { ROUTER_URL: 'https://router.invalid/v1', ROUTER_KEY: 'fixture-router-key' };

async function withRoute(env, run) {
  const saved = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  const oldError = console.error;
  const oldFetch = globalThis.fetch;
  const server = await createServer({ root: ROOT, configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, env);
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    const { resetChatRateLimit } = await server.ssrLoadModule('/apps/web/lib/chat-rate-limit.ts');
    const lines = [];
    console.error = line => { lines.push(line); };
    const ask = () => { resetChatRateLimit(); return POST(new Request('http://localhost/api/chat', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'vertrauliche-besucherfrage', stream: false }) })); };
    await run(ask, lines);
  } finally {
    console.error = oldError;
    globalThis.fetch = oldFetch;
    for (const key of ENV_KEYS) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
    await server.close();
  }
}

const sse = (events, headers = {}) => new Response(events.map(event => 'data: ' + (typeof event === 'string' ? event : JSON.stringify(event)) + '\n\n').join(''),
  { headers: { 'content-type': 'text/event-stream', ...headers } });
const answer = (model = policy.model.id) => [{ model, choices: [{ delta: { content: 'Guten Tag.' } }] }, '[DONE]'];
const noCall = async () => { throw new Error('must not call any provider'); };

test('without CHAT_LLM_ROUTE the chat keeps the router path even when gateway variables are present', async () => {
  await withRoute({ ...ROUTER, CF_AIG_CHAT_URL: GATEWAY_URL, CF_AIG_TOKEN: 'fixture-gateway-token' }, async ask => {
    for (const value of [undefined, 'router']) {
      if (value) process.env.CHAT_LLM_ROUTE = value;
      let call;
      globalThis.fetch = async (url, init) => { call = { url, init }; return sse([{ choices: [{ delta: { content: 'Guten Tag.' } }] }, '[DONE]']); };
      const response = await ask();
      assert.equal(response.status, 200);
      assert.equal(call.url, 'https://router.invalid/v1/chat/completions');
      assert.equal(call.init.headers.Authorization, 'Bearer fixture-router-key');
      assert.equal(call.init.headers['cf-aig-authorization'], undefined);
      assert.equal(JSON.parse(call.init.body).model, 'openrouter/deepseek-v4.1-flash');
    }
  });
});

test('the gateway path sends exactly the policy model with reasoning high, the gateway token and no provider key', async () => {
  await withRoute({ ...GATEWAY, ...ROUTER }, async ask => {
    let call;
    globalThis.fetch = async (url, init) => { call = { url, init }; return sse(answer(), { 'cf-aig-step': '0' }); };
    const response = await ask();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).message.content, 'Guten Tag.');
    assert.equal(call.url, GATEWAY_URL);
    const headers = call.init.headers;
    assert.equal(headers['cf-aig-authorization'], 'Bearer fixture-gateway-token');
    // BYOK: mit Authorization würde das Gateway diesen Wert statt des hinterlegten Schlüssels weiterreichen.
    assert.equal(Object.keys(headers).some(name => name.toLowerCase() === 'authorization'), false);
    assert.equal(headers['cf-aig-collect-log-payload'], 'false');
    assert.equal(headers['cf-aig-skip-cache'], 'true');
    assert.equal(headers['cf-aig-byok-alias'], undefined);
    assert.doesNotMatch(JSON.stringify(headers), /fixture-router-key/);
    const body = JSON.parse(call.init.body);
    assert.equal(body.model, policy.model.id);
    assert.deepEqual(body.reasoning, { effort: policy.model.reasoning_effort });
    assert.equal(body.stream, true);
    assert.deepEqual(body.provider, { require_parameters: true });
    assert.equal('models' in body, false);
    process.env.CF_AIG_BYOK_ALIAS = 'production';
    await ask();
    assert.equal(call.init.headers['cf-aig-byok-alias'], 'production');
  });
});

test('an answer from another model or from a gateway fallback step is a failure, never shown text', async () => {
  await withRoute({ ...GATEWAY }, async (ask, lines) => {
    const cases = [
      () => sse(answer('openai/gpt-4o-mini')),
      () => sse(answer('workers-ai/@cf/meta/llama-3.1-8b-instruct-fast')),
      () => sse(answer(), { 'cf-aig-step': '1' }),
      () => Response.json({ model: 'deepseek/deepseek-v4.1-flash', choices: [{ message: { content: 'Guten Tag.' } }] }),
    ];
    for (const reply of cases) {
      lines.length = 0;
      globalThis.fetch = async () => reply();
      const response = await ask();
      assert.equal(response.status, 502);
      assert.deepEqual(await response.json(), { error: 'chat_llm_failed' });
      assert.equal(JSON.parse(lines.at(-1)).cause, 'model_policy');
    }
    globalThis.fetch = async () => Response.json({ model: policy.model.id, choices: [{ message: { content: 'Guten Tag.' } }] });
    assert.equal((await ask()).status, 200);
  });
});

test('missing gateway variables, an unknown route and a non-OpenRouter endpoint fail closed without a provider call', async () => {
  await withRoute({ CHAT_LLM_ROUTE: 'cloudflare-ai-gateway', ...ROUTER, VERCEL_ENV: 'production' }, async (ask, lines) => {
    globalThis.fetch = noCall;
    // Die Router-Variablen sind gesetzt: trotzdem kein Rückfall auf den Router.
    let response = await ask();
    assert.equal(response.status, 503);
    assert.deepEqual(JSON.parse(lines.at(-1)), { event: 'chat_rejected', route: '/api/chat', status: 503, cause: 'not_configured',
      missing: ['CF_AIG_CHAT_URL', 'CF_AIG_TOKEN'], deployment: 'production', llm_route: 'cloudflare-ai-gateway' });

    process.env.CHAT_LLM_ROUTE = 'workers-ai';
    response = await ask();
    assert.equal(response.status, 503);
    assert.deepEqual(JSON.parse(lines.at(-1)), { event: 'chat_rejected', route: '/api/chat', status: 503, cause: 'route_invalid', deployment: 'production' });

    Object.assign(process.env, GATEWAY);
    for (const url of ['https://gateway.invalid/compat/chat/completions', 'http://gateway.invalid/openrouter/chat/completions',
      'https://gateway.invalid/v1/konto/default/deepseek/chat/completions', 'kein-url']) {
      process.env.CF_AIG_CHAT_URL = url;
      response = await ask();
      assert.equal(response.status, 502);
      assert.equal(JSON.parse(lines.at(-1)).cause, 'invalid_endpoint');
    }
    process.env.CF_AIG_CHAT_URL = 'https://gateway.invalid/openrouter/chat/completions';
    process.env.CF_AIG_BYOK_ALIAS = 'zwei worte';
    assert.equal((await ask()).status, 502);
    assert.doesNotMatch(lines.join('\n'), /fixture-gateway-token|fixture-router-key|gateway\.invalid|vertrauliche/);
  });
});

test('gateway errors keep their cause and never leak the upstream body', async () => {
  await withRoute({ ...GATEWAY }, async (ask, lines) => {
    globalThis.fetch = async () => new Response('synthetic-private-detail', { status: 401 });
    assert.equal((await ask()).status, 502);
    assert.deepEqual(JSON.parse(lines.at(-1)).cause, 'upstream_http');
    assert.equal(JSON.parse(lines.at(-1)).status, 401);
    globalThis.fetch = async () => sse([{ model: policy.model.id, choices: [{ delta: {}, finish_reason: 'length' }] }, '[DONE]']);
    assert.equal((await ask()).status, 502);
    assert.equal(JSON.parse(lines.at(-1)).cause, 'token_budget');
    globalThis.fetch = async () => sse([{ model: policy.model.id, choices: [{ delta: { content: 'Teil' } }] }, { error: { message: 'synthetic-private-detail' } }]);
    assert.equal((await ask()).status, 502);
    assert.equal(JSON.parse(lines.at(-1)).cause, 'upstream_stream_error');
    assert.doesNotMatch(lines.join('\n'), /synthetic-private-detail|fixture-gateway-token/);
  });
});
