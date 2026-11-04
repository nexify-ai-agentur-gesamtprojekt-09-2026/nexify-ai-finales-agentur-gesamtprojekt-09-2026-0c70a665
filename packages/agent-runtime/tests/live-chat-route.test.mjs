/** /api/agent-chat managed live path: closed by default, opens only behind the server gate
 * and then calls nothing but the pinned endpoint. No real provider call (fetch is stubbed). */
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../../../api/agent-chat.ts';
import { PINNED_PROVIDER_ENDPOINT } from '../managed-live-chat.ts';

const ORIGIN = 'https://nexify.example.invalid';
const body = { id: 'live-fixture', trigger: 'submit-message', locale: 'de', page_path: '/',
  messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Was kostet eine Website?' }] }] };
const request = () => new Request(ORIGIN + '/api/agent-chat', { method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const KEYS = ['NEXIFY_LIVE_CHAT', 'NINEROUTER_URL', 'ROUTER_KEY', 'NEXIFY_LIVE_CHAT_DAILY_CAP'];

async function withEnv(values, fetchStub, run) {
  const saved = Object.fromEntries(KEYS.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, values); globalThis.fetch = fetchStub;
  try { await run(); } finally {
    globalThis.fetch = originalFetch;
    for (const key of KEYS) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
  }
}

test('gate closed: deterministic orientation, no model call', async () => {
  let calls = 0;
  await withEnv({}, async () => { calls++; throw new Error('forbidden'); }, async () => {
    for (const key of KEYS) delete process.env[key];
    const response = await handler.fetch(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-nexify-agent-mode'), 'public_guided_preview');
    await response.text();
  });
  assert.equal(calls, 0);
});

test('gate open with an unapproved router URL stays fail-closed (503, no call)', async () => {
  let calls = 0;
  await withEnv({ NEXIFY_LIVE_CHAT: 'enabled', NINEROUTER_URL: 'https://router.example.invalid/v1', ROUTER_KEY: 'offline-dummy-key', NEXIFY_LIVE_CHAT_DAILY_CAP: '50' },
    async () => { calls++; throw new Error('forbidden'); }, async () => {
      const response = await handler.fetch(request());
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'managed_live_chat_unavailable' });
    });
  assert.equal(calls, 0);
});

test('gate open on the pinned endpoint streams via the policy model and only calls that endpoint', async () => {
  const seen = [];
  await withEnv({ NEXIFY_LIVE_CHAT: 'enabled', NINEROUTER_URL: PINNED_PROVIDER_ENDPOINT, ROUTER_KEY: 'offline-dummy-key', NEXIFY_LIVE_CHAT_DAILY_CAP: '50' },
    async (url, init) => { seen.push({ url: String(url), body: JSON.parse(String(init?.body ?? '{}')) });
      return new Response(JSON.stringify({ error: { message: 'synthetic' } }), { status: 500, headers: { 'content-type': 'application/json' } }); },
    async () => {
      const response = await handler.fetch(request());
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-nexify-agent-mode'), 'managed_live');
      assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
      const text = await response.text();
      assert.match(text, /managed_live_chat_unavailable/);
      assert.doesNotMatch(text, /offline-dummy-key/);
    });
  assert.ok(seen.length >= 1);
  for (const call of seen) {
    assert.equal(call.url, PINNED_PROVIDER_ENDPOINT);
    assert.equal(call.body.model, 'deepseek/deepseek-v4.1-flash-1017');
  }
});

test('live path falls back to the free orientation once the per-client window is used up', async () => {
  let calls = 0;
  await withEnv({ NEXIFY_LIVE_CHAT: 'enabled', NINEROUTER_URL: PINNED_PROVIDER_ENDPOINT, ROUTER_KEY: 'offline-dummy-key', NEXIFY_LIVE_CHAT_DAILY_CAP: '1000' },
    async () => { calls++; return new Response('{}', { status: 500, headers: { 'content-type': 'application/json' } }); }, async () => {
      const modes = [];
      for (let i = 0; i < 9; i++) {
        const req = new Request(ORIGIN + '/api/agent-chat', { method: 'POST',
          headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.77' }, body: JSON.stringify(body) });
        const response = await handler.fetch(req); modes.push(response.headers.get('x-nexify-agent-mode')); await response.text();
      }
      assert.ok(modes.filter(m => m === 'managed_live').length <= 6);
      assert.equal(modes.at(-1), 'public_guided_preview');
    });
});
