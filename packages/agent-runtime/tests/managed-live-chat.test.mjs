/** Managed live-chat is wired but fail-closed: gate stays closed without explicit flag + 9router
 * config, assembly reuses the pinned adapter, and the 9router binding cannot become a silent
 * provider bypass. No network and no real key are used (offline dummy fetch only). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { managedLiveChatGate, assembleManagedLiveChat, LIVE_CHAT_FLAG, ROUTER_URL_VAR,
  ROUTER_KEY_VAR, DAILY_CAP_VAR, PINNED_PROVIDER_ENDPOINT } from '../managed-live-chat.ts';

test('gate is closed with empty environment and names every missing requirement', () => {
  const gate = managedLiveChatGate({});
  assert.equal(gate.enabled, false);
  assert.deepEqual(gate.missing, [LIVE_CHAT_FLAG + '=enabled', ROUTER_URL_VAR, ROUTER_KEY_VAR, DAILY_CAP_VAR]);
});

test('gate stays closed when the flag is set but managed router config is missing', () => {
  assert.equal(managedLiveChatGate({ [LIVE_CHAT_FLAG]: 'enabled' }).enabled, false);
  assert.equal(managedLiveChatGate({ [LIVE_CHAT_FLAG]: 'enabled', [ROUTER_URL_VAR]: PINNED_PROVIDER_ENDPOINT }).enabled, false);
});

test('gate never treats OPENAI/EMERGENT keys as a managed fallback route', () => {
  const gate = managedLiveChatGate({ OPENAI_API_KEY: 'x', EMERGENT_LLM_KEY: 'y' });
  assert.equal(gate.enabled, false);
  assert.ok(!JSON.stringify(gate).includes('x') && !JSON.stringify(gate).includes('y'));
});

test('gate opens only with flag, both managed router variables and a positive daily budget', () => {
  const base = { [LIVE_CHAT_FLAG]: 'enabled', [ROUTER_URL_VAR]: PINNED_PROVIDER_ENDPOINT, [ROUTER_KEY_VAR]: 'offline-dummy' };
  assert.equal(managedLiveChatGate(base).enabled, false);
  for (const bad of ['0', '-5', 'abc', '1.5', '9999999']) assert.equal(managedLiveChatGate({ ...base, [DAILY_CAP_VAR]: bad }).enabled, false);
  const gate = managedLiveChatGate({ ...base, [DAILY_CAP_VAR]: '200' });
  assert.equal(gate.enabled, true);
  assert.equal(gate.dailyCap, 200);
});

test('assembly fails closed for a 9router URL that is not the authorised pinned binding', () => {
  assert.throws(() => assembleManagedLiveChat({ routerUrl: 'https://9router.internal/api/v1/chat/completions',
    routerKey: 'offline-dummy', fetch: async () => { throw new Error('must not run'); } }),
    /managed_live_chat_router_binding_pending/);
});

test('assembly reuses the pinned adapter and never calls the network at construction', async () => {
  let calls = 0;
  const agent = assembleManagedLiveChat({ routerUrl: PINNED_PROVIDER_ENDPOINT, routerKey: 'offline-dummy-contract-key',
    fetch: async () => { calls++; throw new Error('offline fixture: no paid call'); } });
  assert.deepEqual(Object.keys(agent.tools), ['publicPageInfo']);
  assert.equal(calls, 0);
  // A generation attempt uses the injected offline fetch (one bounded attempt, no retry);
  // confirms the pinned adapter is wired without ever reaching a real provider.
  await assert.rejects(agent.generate({ prompt: 'Fixture only' }));
  assert.equal(calls, 1);
});
