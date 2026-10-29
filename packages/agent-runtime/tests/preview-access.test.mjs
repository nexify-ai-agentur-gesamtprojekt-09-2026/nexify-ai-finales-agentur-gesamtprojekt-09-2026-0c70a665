import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewAccessHandler } from '../preview-access.ts';
import deployedHandler from '../../../api/agent-runtime-status.ts';

const ORIGIN = 'https://preview.example.invalid';
const ENABLED = Object.freeze({ NEXIFY_AI_GATEWAY_CREDITS_PROBE: 'true', VERCEL_ENV: 'preview',
  VERCEL_PROJECT_ID: 'prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh', VERCEL_GIT_COMMIT_REF: 'factory/source-faithful-rebuild-2026-10-26' });
function request(body = '{}', options = {}) {
  return new Request(ORIGIN + '/api/agent-runtime-status', { method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body, ...options });
}
function reader(credits, inspect = () => {}) {
  return () => new Proxy({ async getCredits() { inspect(); return credits; } }, {
    get(target, key) { assert.equal(key, 'getCredits', 'no model/generation interface may be accessed'); return target[key]; },
  });
}
function noFinancialLeak(body) {
  for (const forbidden of ['balance', 'totalUsed', 'token', 'apiKey', 'authorization']) assert.equal(Object.hasOwn(body, forbidden), false);
  assert.equal(body.live_model_enabled, false); assert.equal(body.entitlement_verified, false);
}

test('default stays disabled and every project/branch/production gate makes zero factory calls', async () => {
  let calls = 0;
  const factory = () => { calls++; throw new Error('must not be invoked'); };
  const disabled = await createPreviewAccessHandler({ environment: {}, gatewayFactory: factory })(request());
  const body = await disabled.json();
  assert.equal(disabled.status, 200); assert.equal(body.funding_checked, false);
  assert.equal(body.mode, 'preview_credits_probe_disabled');
  assert.equal(body.model_id, 'deepseek/deepseek-v4.1-flash-1017'); assert.equal(body.reasoning_effort, 'high');
  noFinancialLeak(body); assert.equal(typeof deployedHandler.fetch, 'function');
  for (const change of [{ VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' }, { VERCEL_PROJECT_ID: 'another-project' }, { VERCEL_GIT_COMMIT_REF: 'main' }]) {
    const response = await createPreviewAccessHandler({ environment: { ...ENABLED, ...change }, gatewayFactory: factory })(request());
    assert.equal(response.status, 403); noFinancialLeak(await response.json());
  }
  assert.equal(calls, 0);
});

test('API-key presence including empty or undefined is blocked before OIDC factory access', async () => {
  let calls = 0;
  for (const key of ['', undefined, 'fixture-do-not-return']) {
    const response = await createPreviewAccessHandler({ environment: { ...ENABLED, AI_GATEWAY_API_KEY: key }, gatewayFactory: () => { calls++; throw new Error('blocked'); } })(request());
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'oidc_only_probe_required');
  }
  assert.equal(calls, 0);
});

test('precise positive and zero metadata yield booleans, never entitlement, generation or balances', async () => {
  for (const [balance, available] of [['0', false], ['0.000000', false], ['0.0000000000000000000000001', true], ['100.25', true]]) {
    let reads = 0;
    const response = await createPreviewAccessHandler({ environment: ENABLED, gatewayFactory: reader({ balance, totalUsed: '123.45' }, () => reads++) })(request());
    assert.equal(response.status, 200); assert.equal(reads, 1);
    const body = await response.json();
    assert.equal(body.mode, 'preview_readonly_credits_probe');
    assert.equal(body.funding_available, available); assert.equal(body.account_access_verified_read, true); assert.equal(body.funding_checked, true);
    noFinancialLeak(body); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
  }
});

test('invalid decimal metadata, provider errors and deadline fail generically with no retry or error-body leak', async () => {
  for (const balance of ['-1', 'NaN', 'Infinity', '1e3', ' 1 ', '+1', '', '01.1', 1, null, '1'.repeat(129)]) {
    const response = await createPreviewAccessHandler({ environment: ENABLED, gatewayFactory: reader({ balance, totalUsed: '0' }) })(request());
    assert.equal(response.status, 503); assert.equal((await response.json()).error, 'runtime_access_unavailable');
  }
  let calls = 0;
  const failed = await createPreviewAccessHandler({ environment: ENABLED, gatewayFactory: () => ({ async getCredits() { calls++; throw new Error('secret-provider-body: balance=777 token=fixture'); } }) })(request());
  const text = await failed.text(); assert.equal(failed.status, 503); assert.doesNotMatch(text, /secret-provider-body|777|fixture/); assert.equal(calls, 1);
  const timed = await createPreviewAccessHandler({ environment: ENABLED, gatewayFactory: () => ({ getCredits() { calls++; return new Promise(() => {}); } }) })(request());
  assert.equal(timed.status, 503); assert.equal((await timed.json()).error, 'runtime_access_unavailable'); assert.equal(calls, 2);
});

test('POST origin JSON and strict streamed empty body are required before even a read-only probe', async () => {
  let calls = 0;
  const handle = createPreviewAccessHandler({ environment: ENABLED, gatewayFactory: () => { calls++; throw new Error('must not run'); } });
  assert.equal((await handle(new Request(ORIGIN + '/api/agent-runtime-status'))).status, 405);
  assert.equal((await handle(request('{}', { headers: { Origin: 'https://other.invalid', 'Content-Type': 'application/json' } }))).status, 403);
  assert.equal((await handle(request('{}', { headers: { Origin: ORIGIN, 'Content-Type': 'text/plain' } }))).status, 415);
  for (const body of ['[]', 'null', '{"model":"other"}', '{invalid']) assert.equal((await handle(request(body))).status, 422);
  assert.equal((await handle(request(' '.repeat(257)))).status, 413);
  let cancelled = false;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(257)); }, cancel() { cancelled = true; } });
  assert.equal((await handle(request(stream, { duplex: 'half' }))).status, 413); assert.equal(cancelled, true);
  const controller = new AbortController();
  const pendingStream = new ReadableStream({ cancel() { cancelled = true; } });
  cancelled = false;
  const pending = handle(request(pendingStream, { duplex: 'half', signal: controller.signal })); controller.abort();
  assert.equal((await pending).status, 499); assert.equal(cancelled, true);
  assert.equal(calls, 0);
});
