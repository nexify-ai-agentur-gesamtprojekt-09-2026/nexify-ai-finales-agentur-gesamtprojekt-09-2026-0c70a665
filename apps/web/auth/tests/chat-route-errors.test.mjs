import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

test('chat JSON and SSE hide provider and transport error details', async () => {
  const keys = ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  const secret = 'synthetic-private-error-detail';
  const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)),
    configFile: false, server: { middlewareMode: true }, appType: 'custom' });
  try {
    process.env.ROUTER_URL = 'https://router.invalid/v1';
    process.env.ROUTER_KEY = 'fixture-key';
    for (const key of ['CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[key];
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    for (const streaming of [false, true]) {
      for (const fail of [async () => new Response(secret, { status: 429 }), async () => { throw new Error(secret); }]) {
        globalThis.fetch = fail;
        const request = new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: 'Hallo', stream: streaming }) });
        const response = await POST(request);
        const body = await response.text();
        assert.equal(response.status, streaming ? 200 : 502);
        assert.match(body, /chat_llm_failed/);
        assert.doesNotMatch(body, new RegExp(secret));
        assert.doesNotMatch(body, /fixture-key/);
      }
    }
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
    await server.close();
  }
});
