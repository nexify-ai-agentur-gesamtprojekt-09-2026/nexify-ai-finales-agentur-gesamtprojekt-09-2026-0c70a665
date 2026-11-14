import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

const ENV_KEYS = ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL_ENV'];

async function withRoute(run) {
  const saved = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  const oldError = console.error;
  const oldFetch = globalThis.fetch;
  const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)),
    configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    const { resetChatRateLimit } = await server.ssrLoadModule('/apps/web/lib/chat-rate-limit.ts');
    resetChatRateLimit();
    await run(POST);
  } finally {
    console.error = oldError;
    globalThis.fetch = oldFetch;
    for (const key of ENV_KEYS) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
    await server.close();
  }
}

const post = (headers = {}) => new Request('https://vorschau-abc.vercel.app/api/chat', { method: 'POST',
  headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify({ message: 'vertrauliche-besucherfrage' }) });

async function capture(run) {
  const lines = [];
  const oldError = console.error;
  console.error = line => { lines.push(line); };
  try { return { response: await run(), lines }; } finally { console.error = oldError; }
}

test('503 not_configured logs which variable names are missing and never a value', async () => {
  await withRoute(async POST => {
    globalThis.fetch = async () => { throw new Error('must not call the provider'); };
    const cases = [
      [{}, ['ROUTER_URL/CHAT_COMPLETIONS_URL', 'ROUTER_KEY']],
      [{ ROUTER_URL: 'https://router.invalid/v1' }, ['ROUTER_KEY']],
      [{ ROUTER_KEY: 'fixture-key' }, ['ROUTER_URL/CHAT_COMPLETIONS_URL']],
      [{ CHAT_COMPLETIONS_URL: 'https://router.invalid/v1/chat/completions' }, ['ROUTER_KEY']],
    ];
    for (const [env, missing] of cases) {
      for (const key of ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL']) delete process.env[key];
      Object.assign(process.env, env, { VERCEL_ENV: 'preview' });
      const { response, lines } = await capture(() => POST(post()));
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'chat_llm_not_configured' });
      assert.equal(lines.length, 1);
      assert.deepEqual(JSON.parse(lines[0]), { event: 'chat_rejected', route: '/api/chat', status: 503, cause: 'not_configured', missing, deployment: 'preview' });
      assert.doesNotMatch(lines[0], /fixture-key|router\.invalid|vertrauliche|vercel\.app/);
    }
  });
});

test('a same-origin request on a vercel.app preview host passes the origin check; a foreign origin is logged without host names', async () => {
  await withRoute(async POST => {
    // Gleiche Herkunft: die Prüfung lässt durch, es folgt die Konfigurationsprüfung (503), nicht 403.
    const same = await capture(() => POST(post({ origin: 'https://vorschau-abc.vercel.app', host: 'vorschau-abc.vercel.app', 'x-forwarded-host': 'vorschau-abc.vercel.app' })));
    assert.equal(same.response.status, 503);
    // Ohne x-forwarded-host zählt der Host der Anfrage.
    const direct = await capture(() => POST(post({ origin: 'https://vorschau-abc.vercel.app' })));
    assert.equal(direct.response.status, 503);
    const foreign = await capture(() => POST(post({ origin: 'https://fremd.example', 'x-forwarded-host': 'vorschau-abc.vercel.app' })));
    assert.equal(foreign.response.status, 403);
    assert.deepEqual(JSON.parse(foreign.lines[0]), { event: 'chat_rejected', route: '/api/chat', status: 403, cause: 'same_origin_required', has_origin: true, host_source: 'x-forwarded-host', deployment: 'unset' });
    assert.doesNotMatch(foreign.lines[0], /fremd\.example|vercel\.app|vertrauliche/);
  });
});
