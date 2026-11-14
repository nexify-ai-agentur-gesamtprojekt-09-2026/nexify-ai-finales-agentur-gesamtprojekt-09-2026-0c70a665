// Composio-Anbindung: rein, ohne Netz. Nur Dummywerte, keine echten Geheimnisse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { composioEnabled, composioWebhookEnabled, COMPOSIO_CONFIG } from '../../lib/composio.ts';
import { createMemoryComposioStore } from '../../lib/composio-store.ts';
import { computeSignature, handleComposioWebhook, verifyWebhookSignature, webhookMethodNotAllowed } from '../../lib/composio-webhook.ts';
import * as apiRoute from '../../app/api/webhook/v1/route.ts';
import * as liveRoute from '../../app/webhook/v1/route.ts';

const SECRET = 'test-secret';
const ON = { NEXIFY_SUITE: 'on', NEXIFY_SUITE_COMPOSIO: 'on', COMPOSIO_WEBHOOK_SECRET: SECRET, COMPOSIO_API_KEY: 'test-key' };
const NOW = 1_800_000_000_000;
const AC = 'ac_test_1';

function signed(body, { id = 'msg_1', ts = String(Math.floor(NOW / 1000)), secret = SECRET, prefix = 'v1,' } = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('https://x.invalid/webhook/v1', { method: 'POST', body: raw, headers: {
    'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': prefix + computeSignature(secret, id, ts, raw) } });
}
const ev = (type, data = {}, metadata = {}) => ({ id: 'x', type, timestamp: '2026-11-14T00:00:00Z', data, metadata });
async function seeded() {
  const store = createMemoryComposioStore();
  await store.putConnection({ connectedAccountId: 'ca_1', tenantId: 'konto:u1', userId: 'u1', authConfigId: AC, status: 'pending', updatedAt: 1 });
  return store;
}

test('Schalter: Standard aus, nur "on" mit Hauptschalter', () => {
  assert.equal(composioEnabled({}), false);
  assert.equal(composioEnabled({ NEXIFY_SUITE_COMPOSIO: 'on' }), false);
  assert.equal(composioEnabled({ NEXIFY_SUITE: 'on', NEXIFY_SUITE_COMPOSIO: 'true' }), false);
  assert.equal(composioEnabled(ON), true);
});

test('Signatur: Referenzwert nach Doku, gültig/ungültig/Zeitfenster', () => {
  const raw = '{"a":1}';
  const reference = createHmac('sha256', SECRET).update('id1.1800000000.' + raw).digest('base64');
  assert.equal(computeSignature(SECRET, 'id1', '1800000000', raw), reference);
  const base = { secret: SECRET, webhookId: 'id1', timestamp: '1800000000', rawBody: raw, nowMs: NOW };
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,' + reference }).ok, true);
  assert.equal(verifyWebhookSignature({ ...base, signature: reference }).ok, true);
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,bad v1,' + reference }).ok, true);
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,' + reference, rawBody: raw + ' ' }).ok, false);
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,' + reference, secret: 'other' }).ok, false);
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,' + reference, secret: undefined }).reason, 'no_secret');
  assert.equal(verifyWebhookSignature({ ...base, signature: null }).reason, 'missing_header');
  assert.equal(verifyWebhookSignature({ ...base, signature: 'v1,' + reference, nowMs: NOW + 301_000 }).reason, 'stale_timestamp');
});

test('Webhook: Schalter aus = 503, nichts verarbeitet; GET = 405', async () => {
  const store = await seeded();
  const response = await handleComposioWebhook(signed(ev('composio.connected_account.activated', { id: 'ca_1' })), { env: {}, store, nowMs: () => NOW });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'composio_not_configured' });
  assert.equal((await store.getConnection('ca_1')).status, 'pending');
  assert.equal(webhookMethodNotAllowed().status, 405);
  for (const route of [apiRoute, liveRoute]) assert.equal((await route.GET()).status, 405);
});

test('Webhook: ungültige Signatur oder fehlendes Secret = 401, nichts verarbeitet, kein Geheimnis in der Antwort', async () => {
  const store = await seeded();
  const bad = signed(ev('composio.connected_account.activated', { id: 'ca_1' }), { secret: 'wrong' });
  const r1 = await handleComposioWebhook(bad, { env: ON, store, nowMs: () => NOW });
  assert.equal(r1.status, 401);
  const noSecret = { ...ON }; delete noSecret.COMPOSIO_WEBHOOK_SECRET;
  const r2 = await handleComposioWebhook(signed(ev('composio.connected_account.activated', { id: 'ca_1' })), { env: noSecret, store, nowMs: () => NOW });
  assert.equal(r2.status, 401);
  for (const r of [r1, r2]) assert.ok(!JSON.stringify(await r.json()).includes(SECRET));
  assert.equal((await store.getConnection('ca_1')).status, 'pending');
});

test('Webhook: activated/expired setzen den Status der gebundenen Verbindung', async () => {
  const store = await seeded();
  const deps = { env: ON, store, nowMs: () => NOW };
  let r = await handleComposioWebhook(signed(ev('composio.connected_account.activated', { id: 'ca_1' }), { id: 'm1' }), deps);
  assert.deepEqual(await r.json(), { status: 'processed' });
  assert.equal((await store.getConnection('ca_1')).status, 'active');
  r = await handleComposioWebhook(signed(ev('composio.connected_account.expired', { id: 'ca_1' }), { id: 'm2' }), deps);
  assert.equal((await r.json()).status, 'processed');
  const after = await store.getConnection('ca_1');
  assert.equal(after.status, 'expired');
  assert.equal(after.tenantId, 'konto:u1');
});

test('Webhook: Wiederholung derselben Ereignis-Kennung wirkt nur einmal', async () => {
  const store = await seeded();
  const deps = { env: ON, store, nowMs: () => NOW };
  const body = ev('composio.trigger.message', { text: 'x' }, { connected_account_id: 'ca_1', trigger_slug: 'T', trigger_id: 'ti_1' });
  assert.equal((await (await handleComposioWebhook(signed(body, { id: 'dup' }), deps)).json()).status, 'processed');
  assert.equal((await (await handleComposioWebhook(signed(body, { id: 'dup' }), deps)).json()).status, 'duplicate');
  assert.equal((await store.listEvents('konto:u1', 'u1')).length, 1);
});

test('Webhook: trigger.message/disabled mandantengebunden, fremde/unbekannte Konten ignoriert', async () => {
  const store = await seeded();
  const deps = { env: ON, store, nowMs: () => NOW };
  await handleComposioWebhook(signed(ev('composio.trigger.disabled', {}, { connected_account_id: 'ca_1', trigger_id: 't' }), { id: 'd1' }), deps);
  const unknown = await handleComposioWebhook(signed(ev('composio.trigger.message', {}, { connected_account_id: 'ca_zzz' }), { id: 'd2' }), deps);
  assert.equal((await unknown.json()).status, 'ignored');
  assert.equal((await store.listEvents('konto:u1', 'u1')).length, 1);
  assert.equal((await store.listEvents('konto:u2', 'u2')).length, 0);
  assert.equal((await store.listEvents('konto:u1', 'u2')).length, 0);
  // Mandant/Nutzer aus dem Ereignis werden nie übernommen.
  const spoof = ev('composio.connected_account.activated', { id: 'ca_1', user_id: 'u2' }, { tenant_id: 'konto:u2' });
  await handleComposioWebhook(signed(spoof, { id: 'd3' }), deps);
  assert.equal((await store.getConnection('ca_1')).userId, 'u1');
});

test('Webhook: unbekannter Typ und ungültiges JSON', async () => {
  const store = await seeded();
  const deps = { env: ON, store, nowMs: () => NOW };
  assert.equal((await (await handleComposioWebhook(signed(ev('composio.other'), { id: 'o1' }), deps)).json()).status, 'ignored');
  assert.equal((await handleComposioWebhook(signed('{kaputt', { id: 'o2' }), deps)).status, 400);
});

const session = (userId) => async () => (userId ? { userId, tenantId: 'konto:' + userId } : null);
function fakeClient(calls) {
  return {
    async createConnectLink(input) { calls.push(['link', input]); return { redirectUrl: 'https://connect.invalid/x', connectedAccountId: 'ca_new' }; },
    async completeAuth(input) { calls.push(['complete', input]); return { connectedAccountId: 'ca_1', toolkitSlug: 'gmail' }; },
  };
}
const post = (body) => new Request('https://nexifyai.cloud/api/suite/composio/connect', { method: 'POST', headers: { origin: 'https://nexifyai.cloud', host: 'nexifyai.cloud' }, body: JSON.stringify(body) });
test('Konfiguration enthält nur Nicht-Geheimes und keine Personendaten', () => {
  const text = readFileSync(new URL('../../../../config/integrations/composio.json', import.meta.url), 'utf8');
  assert.equal(COMPOSIO_CONFIG.projekt_id, 'pr_Rl-waED4hLoX');
  assert.equal(COMPOSIO_CONFIG.webhook.pfad, '/webhook/v1');
  assert.ok(!/@|ak_|whsec_|sk_/.test(text));
});

test('Client: Anfrage nach Doku, Schlüssel nur im Header, Fehler ohne Antworttext (Fake-fetch, kein Netz)', async () => {
  const { createComposioClient, ComposioError } = await import('../../lib/composio.ts');
  assert.throws(() => createComposioClient({ env: {} }), (e) => e instanceof ComposioError && e.code === 'composio_not_configured');
  let seen;
  const okFetch = async (url, init) => { seen = { url, init }; return Response.json({ redirect_url: 'https://connect.invalid/a', connected_account_id: 'ca_9' }); };
  const client = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: okFetch });
  const link = await client.createConnectLink({ userId: 'u1', authConfigId: AC, callbackUrl: 'https://nexifyai.cloud/cb' });
  assert.deepEqual(link, { redirectUrl: 'https://connect.invalid/a', connectedAccountId: 'ca_9' });
  assert.equal(seen.url, 'https://backend.composio.dev/api/v3.1/connected_accounts/link');
  assert.equal(seen.init.headers['x-api-key'], 'test-key');
  assert.deepEqual(JSON.parse(seen.init.body), { auth_config_id: AC, user_id: 'u1', callback_url: 'https://nexifyai.cloud/cb' });
  // callback_url ist optional; nicht anderes als die belegten Felder (id/connectionId werden nicht gelesen)
  await client.createConnectLink({ userId: 'u1', authConfigId: AC });
  assert.deepEqual(JSON.parse(seen.init.body), { auth_config_id: AC, user_id: 'u1' });
  const wrongShape = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => Response.json({ id: 'ca_1', connectionId: 'ca_1', redirectUrl: 'https://c.invalid/' }) });
  await assert.rejects(() => wrongShape.createConnectLink({ userId: 'u1', authConfigId: AC }), (e) => e.code === 'composio_link_incomplete');
  // complete_auth: Body { session_uri, user_id }, Antwort { connected_account_id, toolkit_slug }
  const completeClient = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async (u, i) => { seen = { url: u, init: i }; return Response.json({ connected_account_id: 'ca_7', toolkit_slug: 'gmail' }); } });
  assert.deepEqual(await completeClient.completeAuth({ sessionUri: 'su_x', userId: 'u1' }), { connectedAccountId: 'ca_7', toolkitSlug: 'gmail' });
  assert.equal(seen.url, 'https://backend.composio.dev/api/v3.1/connected_accounts/complete_auth');
  assert.deepEqual(JSON.parse(seen.init.body), { session_uri: 'su_x', user_id: 'u1' });
  assert.equal(seen.init.headers['x-api-key'], 'test-key');
  assert.equal(seen.init.headers['x-project-id'], undefined);
  assert.ok(!seen.init.body.includes('test-key'));
  const failing = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => new Response('geheimer Fehlertext', { status: 500 }) });
  await assert.rejects(() => failing.completeAuth({ sessionUri: 'su_9', userId: 'u1' }), (e) => e.code === 'composio_upstream_failed' && !String(e.message).includes('geheim'));
  const noId = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => Response.json({ redirect_url: 'https://c.invalid/' }) });
  await assert.rejects(() => noId.createConnectLink({ userId: 'u1', authConfigId: AC, callbackUrl: 'https://x.invalid' }), (e) => e.code === 'composio_link_incomplete');
});

test('Webhook-Schalter: Empfang allein mit NEXIFY_COMPOSIO_WEBHOOK, ohne die Suite einzuschalten', async () => {
  assert.equal(composioWebhookEnabled({}), false);
  assert.equal(composioWebhookEnabled({ NEXIFY_COMPOSIO_WEBHOOK: 'true' }), false);
  assert.equal(composioWebhookEnabled({ NEXIFY_COMPOSIO_WEBHOOK: 'on' }), true);
  assert.equal(composioWebhookEnabled({ NEXIFY_SUITE: 'on', NEXIFY_SUITE_COMPOSIO: 'on' }), true);
  // Der Empfangsschalter schaltet die Suite-Funktionen (Connect, Trigger) nicht mit ein.
  assert.equal(composioEnabled({ NEXIFY_COMPOSIO_WEBHOOK: 'on' }), false);
  const req = new Request('https://nexifyai.cloud/webhook/v1', { method: 'POST', body: '{}' });
  assert.equal((await handleComposioWebhook(req, { env: { NEXIFY_COMPOSIO_WEBHOOK: 'on' } })).status, 401);
});
