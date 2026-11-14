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
const ACCOUNT = '0'.repeat(32);
const GATEWAY_URL = `https://gateway.ai.cloudflare.com/v1/${ACCOUNT}/default/openrouter/v1/chat/completions`;
const LOCK = 'const POLICY_PERMITS_CLOUDFLARE_GATEWAY = false;';
// Stellt für die Tests den Zustand nach einer Policy-Änderung her, ohne Hintertür im Produktcode:
// Nur das Testmodul wird beim Laden umgeschrieben. Der gesperrte Ist-Zustand hat eigene Tests.
const permitted = { name: 'test-gateway-permitted', enforce: 'pre', transform(code, id) {
  if (!id.endsWith('/app/api/chat/llm-gateway.ts')) return null;
  assert.ok(code.includes(LOCK), 'lock constant not found');
  return code.replace(LOCK, LOCK.replace('false', 'true'));
} };
const GATEWAY = { CHAT_LLM_ROUTE: 'cloudflare-ai-gateway', CF_AIG_CHAT_URL: GATEWAY_URL, CF_AIG_TOKEN: 'fixture-gateway-token' };
const ROUTER = { ROUTER_URL: 'https://router.invalid/v1', ROUTER_KEY: 'fixture-router-key' };

async function withRoute(env, run, { unlocked = true, stream = false } = {}) {
  const saved = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  const oldError = console.error;
  const oldFetch = globalThis.fetch;
  const server = await createServer({ root: ROOT, configFile: false, plugins: unlocked ? [permitted] : [], server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, env);
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    const { resetChatRateLimit } = await server.ssrLoadModule('/apps/web/lib/chat-rate-limit.ts');
    const lines = [];
    console.error = line => { lines.push(line); };
    const ask = () => { resetChatRateLimit(); return POST(new Request('http://localhost/api/chat', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'vertrauliche-besucherfrage', stream }) })); };
    await run(ask, lines, server);
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
    assert.equal(call.init.redirect, 'error');
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
    process.env.CF_AIG_TOKEN = '  fixture-gateway-token\n';
    await ask();
    assert.equal(call.init.headers['cf-aig-byok-alias'], 'production');
    assert.equal(call.init.headers['cf-aig-authorization'], 'Bearer fixture-gateway-token');
  });
});

test('an answer from another model or from a gateway fallback step is a failure, never shown text', async () => {
  await withRoute({ ...GATEWAY }, async (ask, lines) => {
    const cases = [
      () => sse(answer('openai/gpt-4o-mini')),
      () => sse(answer('workers-ai/@cf/meta/llama-3.1-8b-instruct-fast')),
      () => sse(answer(), { 'cf-aig-step': '1' }),
      () => Response.json({ model: 'deepseek/deepseek-v4.1-flash', choices: [{ message: { content: 'Guten Tag.' } }] }),
      // Ohne Modellangabe ist die Herkunft nicht belegt.
      () => Response.json({ choices: [{ message: { content: 'Guten Tag.' } }] }),
      () => sse([{ choices: [{ delta: { content: 'Guten Tag.' } }] }, '[DONE]']),
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
    const good = `/v1/${ACCOUNT}/default/openrouter/chat/completions`;
    const host = 'https://gateway.ai.cloudflare.com';
    for (const url of ['kein-url', `http://gateway.ai.cloudflare.com${good}`, `https://gateway.invalid${good}`, `https://gateway.nexifyai.cloud${good}`,
      `https://gateway.ai.cloudflare.com@angreifer.invalid${good}`, `https://nutzer:pw@gateway.ai.cloudflare.com${good}`,
      `https://203.0.113.7${good}`, `${host}:8443${good}`, `${host}:443${good}`, `${host}${good}#f`, `${host}${good}?`, `${host}${good}?a=1`,
      `${host}/v1/${ACCOUNT}/default/compat/chat/completions`, `${host}/v1/${ACCOUNT}/default/compat/openrouter/chat/completions`,
      `${host}/compat/openrouter/chat/completions`, `${host}/openrouter/chat/completions`, `${host}/v1/${ACCOUNT}/default/deepseek/chat/completions`,
      `${host}/v1/${ACCOUNT}/default/x/../openrouter/chat/completions`, `${host}/x/..${good}`, `${host}/v1/KONTO/default/openrouter/chat/completions`,
      `${host}${good}/`]) {
      process.env.CF_AIG_CHAT_URL = url;
      response = await ask();
      assert.equal(response.status, 502);
      assert.equal(response.status, 502, url);
      assert.equal(JSON.parse(lines.at(-1)).cause, 'invalid_endpoint', url);
      assert.equal(JSON.parse(lines.at(-1)).llm_route, 'cloudflare-ai-gateway');
    }
    process.env.CF_AIG_CHAT_URL = host + good;
    globalThis.fetch = async () => sse(answer());
    assert.equal((await ask()).status, 200);
    globalThis.fetch = noCall;
    for (const key of ['CF_AIG_CHAT_URL', 'CF_AIG_TOKEN']) {
      const value = process.env[key];
      process.env[key] = '   ';
      response = await ask();
      assert.equal(response.status, 503);
      assert.deepEqual(JSON.parse(lines.at(-1)).missing, [key]);
      process.env[key] = value;
    }
    process.env.CF_AIG_BYOK_ALIAS = 'zwei worte';
    assert.equal((await ask()).status, 502);
    assert.doesNotMatch(lines.join('\n'), /fixture-gateway-token|fixture-router-key|gateway\.invalid|cloudflare\.com|angreifer|vertrauliche/);
  });
});

test('gateway errors keep their cause and never leak the upstream body', async () => {
  await withRoute({ ...GATEWAY }, async (ask, lines) => {
    globalThis.fetch = async () => new Response('synthetic-private-detail', { status: 401 });
    assert.equal((await ask()).status, 502);
    assert.deepEqual(JSON.parse(lines.at(-1)).cause, 'upstream_http');
    assert.equal(JSON.parse(lines.at(-1)).status, 401);
    assert.equal(JSON.parse(lines.at(-1)).llm_route, 'cloudflare-ai-gateway');
    // Eine Weiterleitung lässt fetch mit redirect:'error' scheitern; gemeldet wird der Systemcode wie auf dem Router-Weg.
    globalThis.fetch = async () => { throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('synthetic-private-detail'), { code: 'ECONNREFUSED' }) }); };
    assert.equal((await ask()).status, 502);
    assert.deepEqual([JSON.parse(lines.at(-1)).cause, JSON.parse(lines.at(-1)).network_code], ['network', 'ECONNREFUSED']);
    globalThis.fetch = async () => sse([{ model: policy.model.id, choices: [{ delta: {}, finish_reason: 'length' }] }, '[DONE]']);
    assert.equal((await ask()).status, 502);
    assert.equal(JSON.parse(lines.at(-1)).cause, 'token_budget');
    globalThis.fetch = async () => sse([{ model: policy.model.id, choices: [{ delta: { content: 'Teil' } }] }, { error: { message: 'synthetic-private-detail' } }]);
    assert.equal((await ask()).status, 502);
    assert.equal(JSON.parse(lines.at(-1)).cause, 'upstream_stream_error');
    assert.doesNotMatch(lines.join('\n'), /synthetic-private-detail|fixture-gateway-token/);
  });
});

const frames = async response => (await response.text()).split('\n\n').filter(Boolean).map(frame => JSON.parse(frame.replace(/^data:\s*/, '')));
const block = (text, model) => ({ ...(model ? { model } : {}), choices: [{ delta: { content: text } }] });

test('streamed text reaches the visitor only after a block named the policy model', async () => {
  await withRoute({ ...GATEWAY }, async (ask, lines) => {
    // (a) Text ohne Modellangabe, danach ein fremdes Modell: nichts davon erreicht den Besucher.
    globalThis.fetch = async () => sse([block('Fremder Text. '), block('Noch mehr.', 'openai/gpt-4o-mini'), '[DONE]']);
    let events = await frames(await ask());
    assert.deepEqual(events.filter(event => event.type === 'delta'), []);
    assert.equal(events.at(-1).type, 'error');
    assert.equal(JSON.parse(lines.at(-1)).cause, 'model_policy');
    assert.doesNotMatch(JSON.stringify(events), /Fremder|Noch mehr/);
    // (b) Strom ganz ohne Modellangabe.
    globalThis.fetch = async () => sse([block('Ohne Herkunft. '), block('Weiter.'), '[DONE]']);
    events = await frames(await ask());
    assert.deepEqual(events.filter(event => event.type === 'delta'), []);
    assert.equal(events.at(-1).type, 'error');
    assert.equal(JSON.parse(lines.at(-1)).cause, 'model_policy');
    // (c) Regulär: auch der gepufferte Anfang kommt an, vollständig und in Reihenfolge.
    globalThis.fetch = async () => sse([block('Guten '), block('Tag, ', policy.model.id), block('wie kann '), block('ich helfen?', policy.model.id), '[DONE]']);
    events = await frames(await ask());
    assert.equal(events.filter(event => event.type === 'delta').map(event => event.text).join(''), 'Guten Tag, wie kann ich helfen?');
    assert.equal(events.find(event => event.type === 'done').message.content, 'Guten Tag, wie kann ich helfen?');
  }, { stream: true });
});

test('as long as the policy names the 9router as the only gateway the Cloudflare path stays locked', async () => {
  // Die Sperre im Code spiegelt config/llm-policy.json; wer die Policy nachführt, ändert beides gemeinsam.
  const target = policy.provider_route_target_2026_11_10;
  const policyPermits = target.gateway !== '9router_only' && target.direct_provider_bypass_allowed !== false;
  await withRoute({ ...GATEWAY, ...ROUTER, VERCEL_ENV: 'production' }, async (ask, lines, server) => {
    const { gatewayRoutePermitted } = await server.ssrLoadModule('/apps/web/app/api/chat/llm-gateway.ts');
    assert.equal(gatewayRoutePermitted(), policyPermits);
    assert.equal(policyPermits, false);
    globalThis.fetch = noCall;
    const response = await ask();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'chat_llm_not_configured' });
    assert.deepEqual(JSON.parse(lines.at(-1)), { event: 'chat_rejected', route: '/api/chat', status: 503, cause: 'route_not_permitted_by_policy',
      deployment: 'production', llm_route: 'cloudflare-ai-gateway' });
  }, { unlocked: false });
});
