// Composio-Anbindung: rein, ohne Netz. Nur Dummywerte, keine echten Geheimnisse.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { composioEnabled, COMPOSIO_CONFIG } from '../../lib/composio.ts';
import { createMemoryComposioStore } from '../../lib/composio-store.ts';
import { computeSignature, handleComposioWebhook, verifyWebhookSignature, webhookMethodNotAllowed } from '../../lib/composio-webhook.ts';
import { handleConnect, handleVerify } from '../../lib/composio-routes.ts';
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

test('Connect: nur für Angemeldete, nur bei Schalter, nur erlaubte Auth-Config', async () => {
  const calls = [];
  const store = createMemoryComposioStore();
  const deps = { env: ON, store, client: fakeClient(calls), resolveSession: session('u1'), nowMs: () => NOW };
  assert.equal((await handleConnect(post({ auth_config_id: AC }), { ...deps, env: {} })).status, 503);
  assert.equal((await handleConnect(post({ auth_config_id: AC }), { ...deps, resolveSession: session(null) })).status, 401);
  // Allowlist in der ausgelieferten Konfiguration ist leer: fail-closed.
  assert.deepEqual(COMPOSIO_CONFIG.erlaubte_auth_config_ids, []);
  assert.equal((await handleConnect(post({ auth_config_id: AC }), deps)).status, 422);
  assert.equal(calls.length, 0);
  COMPOSIO_CONFIG.erlaubte_auth_config_ids.push(AC);
  try {
    const cross = new Request('https://nexifyai.cloud/x', { method: 'POST', headers: { origin: 'https://evil.invalid', host: 'nexifyai.cloud' }, body: '{}' });
    assert.equal((await handleConnect(cross, deps)).status, 403);
    const ok = await handleConnect(post({ auth_config_id: AC }), deps);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).redirect_url, 'https://connect.invalid/x');
    assert.equal(calls[0][1].userId, 'u1');
    const stored = await store.getConnection('ca_new');
    assert.deepEqual([stored.tenantId, stored.userId, stored.status], ['konto:u1', 'u1', 'pending']);
  } finally { COMPOSIO_CONFIG.erlaubte_auth_config_ids.length = 0; }
});

test('Verify: session_uri + Sitzungs-Nutzer -> complete_auth, Konto gebunden, Weiterleitung', async () => {
  const calls = [];
  const store = await seeded();
  const deps = { env: ON, store, client: fakeClient(calls), nowMs: () => NOW };
  const url = (q) => new Request('https://nexifyai.cloud/api/suite/composio/verify?' + q);
  assert.equal((await handleVerify(url('session_uri=su_1'), { ...deps, env: {}, resolveSession: session('u1') })).status, 503);
  assert.equal((await handleVerify(url('session_uri=su_1'), { ...deps, resolveSession: session(null) })).status, 401);
  // fehlend oder ungültig: 400, kein Aufruf
  assert.equal((await handleVerify(url(''), { ...deps, resolveSession: session('u1') })).status, 400);
  assert.equal((await handleVerify(url('connected_account_id=ca_1'), { ...deps, resolveSession: session('u1') })).status, 400);
  assert.equal(calls.length, 0);
  // user_id/connected_account_id aus der Query zählen nicht; user_id kommt aus der Sitzung
  const ok = await handleVerify(url('session_uri=su_1&user_id=u2&connected_account_id=ca_evil'), { ...deps, resolveSession: session('u1') });
  assert.equal(ok.status, 303);
  assert.equal(ok.headers.get('location'), 'https://nexifyai.cloud/?composio=verified');
  assert.deepEqual(calls, [['complete', { sessionUri: 'su_1', userId: 'u1' }]]);
  const rec = await store.getConnection('ca_1');
  assert.deepEqual([rec.tenantId, rec.userId, rec.status, rec.authConfigId], ['konto:u1', 'u1', 'verified', AC]);
  assert.equal(await store.getConnection('ca_evil'), null);
  // verbrauchte session_uri wird nicht erneut eingelöst
  const again = await handleVerify(url('session_uri=su_1'), { ...deps, resolveSession: session('u1') });
  assert.equal(again.status, 409);
  assert.equal(calls.length, 1);
});

test('Verify: Fehlerpfade von complete_auth (400/404/401/500) ohne interne Texte, session_uri bleibt verbraucht', async () => {
  const { createComposioClient } = await import('../../lib/composio.ts');
  const url = (q) => new Request('https://nexifyai.cloud/api/suite/composio/verify?' + q);
  const run = async (status, uri) => {
    const store = await seeded();
    const fetchImpl = async () => new Response('interner Fehlertext geheim', { status });
    const client = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl });
    const deps = { env: ON, store, client, resolveSession: session('u2'), nowMs: () => NOW };
    const r = await handleVerify(url('session_uri=' + uri), deps);
    const text = JSON.stringify(await r.json());
    assert.ok(!text.includes('geheim'));
    assert.equal((await store.getConnection('ca_1')).status, 'pending');
    assert.equal((await handleVerify(url('session_uri=' + uri), deps)).status, 409);
    return r.status;
  };
  assert.equal(await run(400, 'su_a'), 403); // user_id nicht Besitzer (fremder Nutzer)
  assert.equal(await run(404, 'su_b'), 410); // abgelaufen oder verbraucht
  assert.equal(await run(401, 'su_c'), 502); // eigener Schlüssel ungültig
  assert.equal(await run(500, 'su_d'), 502);
  // Antwort ohne connected_account_id
  const store = await seeded();
  const client = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => Response.json({}) });
  assert.equal((await handleVerify(url('session_uri=su_e'), { env: ON, store, client, resolveSession: session('u1') })).status, 502);
  // Konto gehört laut Speicher einem anderen Nutzer: keine Umbindung
  const fremd = fakeClient([]);
  const r = await handleVerify(url('session_uri=su_f'), { env: ON, store, client: fremd, resolveSession: session('u2') });
  assert.equal(r.status, 403);
  assert.equal((await store.getConnection('ca_1')).userId, 'u1');
});

test('Verify: unbekanntes Konto (z. B. Speicher neu gestartet) wird an den Sitzungs-Nutzer gebunden', async () => {
  const store = createMemoryComposioStore();
  const r = await handleVerify(new Request('https://nexifyai.cloud/api/suite/composio/verify?session_uri=su_n'), { env: ON, store, client: fakeClient([]), resolveSession: session('u3'), nowMs: () => NOW });
  assert.equal(r.status, 303);
  const rec = await store.getConnection('ca_1');
  assert.deepEqual([rec.tenantId, rec.userId, rec.status], ['konto:u3', 'u3', 'verified']);
});

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

test('Keine fest verdrahtete Test-Nutzerkennung im Quelltext; Composio-Nutzer = Suite-Sitzung', () => {
  for (const f of ['composio.ts', 'composio-routes.ts', 'composio-webhook.ts', 'composio-store.ts', 'suite-session.ts']) {
    assert.ok(!readFileSync(new URL('../../lib/' + f, import.meta.url), 'utf8').includes('pg-test-'), f);
  }
});

// ---- Trigger-Schicht ----
import { handleTriggerCreate, handleTriggerList, handleEventsList } from '../../lib/composio-trigger-routes.ts';
import { setAgentPort } from '../../lib/composio-agent-port.ts';
import * as triggersRoute from '../../app/api/suite/composio/triggers/route.ts';
import * as eventsRoute from '../../app/api/suite/composio/events/route.ts';

const SLUG = 'TEST_TRIGGER_EVENT';
function triggerClient(calls) {
  return {
    async getTriggerType(slug) { calls.push(['type', slug]); return { slug, config: {} }; },
    async createTrigger(userId, slug, cfg, acc) { calls.push(['create', userId, slug, cfg, acc]); return { triggerId: 'ti_new' }; },
  };
}
const postT = (body) => new Request('https://nexifyai.cloud/api/suite/composio/triggers', { method: 'POST', headers: { origin: 'https://nexifyai.cloud', host: 'nexifyai.cloud' }, body: JSON.stringify(body) });

test('Trigger-Routen sind exportiert', () => {
  assert.equal(typeof triggersRoute.POST, 'function');
  assert.equal(typeof triggersRoute.GET, 'function');
  assert.equal(typeof eventsRoute.GET, 'function');
});

test('Trigger: Flag aus 503, nicht angemeldet 401, Allowlist leer 422 (kein Aufruf)', async () => {
  const calls = [];
  const store = createMemoryComposioStore();
  const deps = { env: ON, store, client: triggerClient(calls), resolveSession: session('u1'), nowMs: () => NOW };
  assert.equal((await handleTriggerCreate(postT({ slug: SLUG }), { ...deps, env: {} })).status, 503);
  assert.equal((await handleTriggerList(postT({}), { ...deps, env: {} })).status, 503);
  assert.equal((await handleTriggerCreate(postT({ slug: SLUG }), { ...deps, resolveSession: session(null) })).status, 401);
  assert.equal((await handleTriggerList(postT({}), { ...deps, resolveSession: session(null) })).status, 401);
  assert.deepEqual(COMPOSIO_CONFIG.erlaubte_trigger_slugs, []);
  const r = await handleTriggerCreate(postT({ slug: SLUG }), deps);
  assert.equal(r.status, 422);
  assert.deepEqual(await r.json(), { error: 'trigger_slug_not_allowed' });
  assert.equal(calls.length, 0);
});

test('Trigger: erlaubter Slug legt mit Sitzungs-Nutzer an, Liste mandantengebunden, fremde Verbindung 403', async () => {
  const calls = [];
  const store = await seeded();
  const deps = { env: ON, store, client: triggerClient(calls), resolveSession: session('u1'), nowMs: () => NOW };
  COMPOSIO_CONFIG.erlaubte_trigger_slugs.push(SLUG);
  try {
    // user_id/tenant im Body werden ignoriert
    const ok = await handleTriggerCreate(postT({ slug: SLUG, trigger_config: { a: 1 }, user_id: 'u2', connected_account_id: 'ca_1' }), deps);
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { trigger_id: 'ti_new', slug: SLUG });
    assert.deepEqual(calls.map((c) => c[0]), ['type', 'create']);
    assert.deepEqual(calls[1].slice(1), ['u1', SLUG, { a: 1 }, 'ca_1']);
    const foreign = await handleTriggerCreate(postT({ slug: SLUG, connected_account_id: 'ca_1' }), { ...deps, resolveSession: session('u2') });
    assert.equal(foreign.status, 403);
    assert.equal(calls.length, 2);
    const cross = new Request('https://nexifyai.cloud/x', { method: 'POST', headers: { origin: 'https://evil.invalid', host: 'nexifyai.cloud' }, body: '{}' });
    assert.equal((await handleTriggerCreate(cross, deps)).status, 403);
    const mine = await (await handleTriggerList(postT({}), deps)).json();
    assert.deepEqual(mine.triggers.map((t) => t.trigger_id), ['ti_new']);
    const theirs = await (await handleTriggerList(postT({}), { ...deps, resolveSession: session('u2') })).json();
    assert.deepEqual(theirs.triggers, []);
    const failing = { ...deps, client: { ...triggerClient([]), async createTrigger() { throw new Error('boom geheim'); } } };
    const bad = await handleTriggerCreate(postT({ slug: SLUG }), failing);
    assert.equal(bad.status, 502);
    assert.ok(!JSON.stringify(await bad.json()).includes('geheim'));
  } finally { COMPOSIO_CONFIG.erlaubte_trigger_slugs.length = 0; }
});

test('Ereignisse lesen: nur eigener Mandant, Paging mit Obergrenze, Flag/Anmeldung', async () => {
  const store = await seeded();
  for (let i = 0; i < 130; i++) await store.appendEvent({ eventId: 'e' + i, type: 'composio.trigger.message', tenantId: 'konto:u1', userId: 'u1', receivedAt: i, summary: { trigger_slug: 'T', trigger_id: 'ti' } });
  await store.appendEvent({ eventId: 'fremd', type: 'composio.trigger.message', tenantId: 'konto:u2', userId: 'u2', receivedAt: 999, summary: {} });
  const get = (q = '') => new Request('https://nexifyai.cloud/api/suite/composio/events' + q + (q ? '&' : '?') + 'tenant=konto:u2&user_id=u2', { headers: { 'x-tenant-id': 'konto:u2' } });
  const deps = { env: ON, store, resolveSession: session('u1') };
  assert.equal((await handleEventsList(get(), { ...deps, env: {} })).status, 503);
  assert.equal((await handleEventsList(get(), { ...deps, resolveSession: session(null) })).status, 401);
  const first = await (await handleEventsList(get('?limit=1000'), deps)).json();
  assert.equal(first.events.length, 100);
  assert.equal(first.limit, 100);
  assert.equal(first.total, 130);
  assert.equal(first.next_offset, 100);
  assert.ok(first.events.every((e) => e.event_id !== 'fremd'));
  const second = await (await handleEventsList(get('?limit=100&offset=100'), deps)).json();
  assert.equal(second.events.length, 30);
  assert.equal(second.next_offset, null);
  assert.equal((await handleEventsList(get('?limit=abc'), deps)).status, 422);
  const other = await (await handleEventsList(get(), { ...deps, resolveSession: session('u3') })).json();
  assert.deepEqual(other.events, []);
  const u2 = await (await handleEventsList(get(), { ...deps, resolveSession: session('u2') })).json();
  assert.deepEqual(u2.events.map((e) => e.event_id), ['fremd']);
});

test('Webhook: Agenten-Port genau einmal je neuem Ereignis, Port-Fehler bricht nicht ab', async () => {
  const store = await seeded();
  const got = [];
  const agentPort = { async ereignisAngelegt(e) { got.push(e); } };
  const deps = { env: ON, store, nowMs: () => NOW, agentPort };
  const body = ev('composio.trigger.message', { text: 'x' }, { connected_account_id: 'ca_1', trigger_slug: 'T', trigger_id: 'ti_1' });
  await handleComposioWebhook(signed(body, { id: 'p1' }), deps);
  await handleComposioWebhook(signed(body, { id: 'p1' }), deps); // Wiederholung
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].tenantId, got[0].userId, got[0].eventId], ['konto:u1', 'u1', 'p1']);
  // unbekanntes Konto und Statusereignis: kein Aufruf
  await handleComposioWebhook(signed(ev('composio.trigger.message', {}, { connected_account_id: 'ca_zzz' }), { id: 'p2' }), deps);
  await handleComposioWebhook(signed(ev('composio.connected_account.activated', { id: 'ca_1' }), { id: 'p3' }), deps);
  assert.equal(got.length, 1);
  // disabled zählt als Trigger-Ereignis
  await handleComposioWebhook(signed(ev('composio.trigger.disabled', {}, { connected_account_id: 'ca_1' }), { id: 'p4' }), deps);
  assert.equal(got.length, 2);
  // Port-Fehler: 200, Ereignis bleibt abgelegt, keine erneute Ablage bei Wiederholung
  const failing = { ...deps, agentPort: { async ereignisAngelegt() { throw new Error('x'); } } };
  const r = await handleComposioWebhook(signed(body, { id: 'p5' }), failing);
  assert.equal(r.status, 200);
  assert.equal((await handleComposioWebhook(signed(body, { id: 'p5' }), failing)).status, 200);
  assert.equal((await store.listEvents('konto:u1', 'u1')).length, 3);
  // Standard-Port ist No-Op
  setAgentPort(null);
  assert.equal((await handleComposioWebhook(signed(body, { id: 'p6' }), { env: ON, store, nowMs: () => NOW })).status, 200);
});

test('Client: Trigger-Typ und -Anlage nach Doku (Fake-fetch, kein Netz)', async () => {
  const { createComposioClient, ComposioError } = await import('../../lib/composio.ts');
  const seen = [];
  const f = async (url, init) => { seen.push({ url, init }); return Response.json(url.includes('/upsert') ? { trigger_id: 'ti_7' } : { config: { type: 'object' } }); };
  const client = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: f });
  assert.deepEqual(await client.getTriggerType(SLUG), { slug: SLUG, config: { type: 'object' } });
  assert.equal(seen[0].url, 'https://backend.composio.dev/api/v3.1/triggers_types/' + SLUG);
  assert.equal(seen[0].init.method, 'GET');
  assert.equal(seen[0].init.body, undefined);
  assert.equal(seen[0].init.headers['x-api-key'], 'test-key');
  assert.deepEqual(await client.createTrigger('u1', SLUG, { a: 1 }), { triggerId: 'ti_7' });
  assert.equal(seen[1].url, 'https://backend.composio.dev/api/v3.1/trigger_instances/' + SLUG + '/upsert');
  assert.deepEqual(JSON.parse(seen[1].init.body), { user_id: 'u1', trigger_config: { a: 1 } });
  await assert.rejects(() => client.getTriggerType('../x'), (e) => e instanceof ComposioError && e.code === 'composio_trigger_incomplete');
  const bad = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => Response.json({}) });
  await assert.rejects(() => bad.createTrigger('u1', SLUG, {}), (e) => e.code === 'composio_trigger_incomplete');
  const down = createComposioClient({ env: { COMPOSIO_API_KEY: 'test-key' }, fetchImpl: async () => new Response('geheim', { status: 500 }) });
  await assert.rejects(() => down.getTriggerType(SLUG), (e) => e.code === 'composio_upstream_failed');
});

test('Neue Dateien: keine pg-test-Kennung', () => {
  for (const f of ['composio-trigger-routes.ts', 'composio-agent-port.ts']) {
    assert.ok(!readFileSync(new URL('../../lib/' + f, import.meta.url), 'utf8').includes('pg-test-'), f);
  }
});
