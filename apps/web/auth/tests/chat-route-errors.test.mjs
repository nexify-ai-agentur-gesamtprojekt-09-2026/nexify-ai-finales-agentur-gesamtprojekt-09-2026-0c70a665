import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

test('chat JSON and SSE hide provider and transport error details while the server log names the cause', async () => {
  const keys = ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const oldFetch = globalThis.fetch;
  const oldError = console.error;
  const secret = 'synthetic-private-error-detail';
  const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)),
    configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    process.env.ROUTER_URL = 'https://router.invalid/v1';
    process.env.ROUTER_KEY = 'fixture-key';
    for (const key of ['CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) delete process.env[key];
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    const { resetChatRateLimit } = await server.ssrLoadModule('/apps/web/lib/chat-rate-limit.ts');
    resetChatRateLimit();
    let sent;
    globalThis.fetch = async (_url, init) => {
      sent = JSON.parse(init.body);
      return new Response('data: {"choices":[{"delta":{"content":"Ich bereite eine Anfrage vor."}}]}\n\ndata: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } });
    };
    const success = await POST(new Request('http://localhost/api/chat', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'Was kostet das?', stream: false }) }));
    assert.equal(success.status, 200);
    const guidance = sent.messages.find(message => message.role === 'system').content;
    assert.doesNotMatch(guidance, /44900|449\s*€/);
    assert.match(guidance, /unit_cents.*null/);
    const visitorText = 'vertrauliche-besucherfrage';
    const failures = [
      [async () => new Response(secret, { status: 429 }), { cause: 'upstream_http', status: 429, upstream_content_type: 'text' }],
      [async () => { throw new Error(secret); }, { cause: 'network' }],
      [async () => { throw Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error(secret), { code: 'ECONNREFUSED' }) }); },
        { cause: 'network', network_code: 'ECONNREFUSED' }],
      [async () => new Response('<html>' + secret + '</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
        { cause: 'invalid_response', status: 200, upstream_content_type: 'html' }],
    ];
    for (const streaming of [false, true]) {
      for (const [fail, expected] of failures) {
        resetChatRateLimit();
        globalThis.fetch = fail;
        const logged = [];
        console.error = line => { logged.push(line); };
        const request = new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message: visitorText, stream: streaming }) });
        const response = await POST(request);
        const body = await response.text();
        console.error = oldError;
        assert.equal(response.status, streaming ? 200 : 502);
        assert.match(body, /chat_llm_failed/);
        assert.doesNotMatch(body, new RegExp(secret));
        assert.doesNotMatch(body, /fixture-key/);
        // Der Besucher sieht nur den festen Code, nie die Ursache.
        // Die zufällige Gesprächskennung zählt nicht dazu: Eine UUID mit der Ziffernfolge "429" ist keine Ursache.
        const visible = body.replace(/local-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/g, '');
        if (streaming) assert.notEqual(visible, body, 'die Gesprächskennung wurde gefunden und entfernt');
        assert.doesNotMatch(visible, /upstream_http|network|invalid_response|ECONNREFUSED|429/);
        // Genau eine Protokollzeile mit unterscheidbarer Ursache und ohne Geheimnis, Adresse oder Nutzertext.
        assert.equal(logged.length, 1);
        const entry = JSON.parse(logged[0]);
        const { elapsed_ms, ...rest } = entry;
        assert.equal(typeof elapsed_ms, 'number');
        assert.deepEqual(rest, { event: 'chat_failure', route: '/api/chat', stage: 'llm', stream: streaming, ...expected });
        assert.doesNotMatch(logged[0], new RegExp(`${secret}|fixture-key|router\\.invalid|${visitorText}|local-`));
      }
    }
    resetChatRateLimit();
    // Eine abweichende Modellvorgabe ist eine benannte Ursache und kein unbehandelter Serverfehler.
    process.env.CHAT_MODEL_ID = 'other/model';
    globalThis.fetch = async () => { throw new Error('must not call the provider'); };
    const policyLog = [];
    console.error = line => { policyLog.push(line); };
    const policy = await POST(new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Hallo', stream: false }) }));
    console.error = oldError;
    assert.equal(policy.status, 502);
    assert.equal(JSON.parse(policyLog[0]).cause, 'model_policy');
    delete process.env.CHAT_MODEL_ID;
    // Ein Speicherfehler verhindert die Antwort nicht und erscheint nicht als Modellfehler.
    process.env.SUPABASE_URL = 'https://db.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service-role';
    globalThis.fetch = async url => String(url).startsWith('https://db.invalid')
      ? new Response(secret, { status: 503 })
      : new Response('data: {"choices":[{"delta":{"content":"Antwort trotz Speicherfehler."}}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
    const storeLog = [];
    console.error = line => { storeLog.push(line); };
    const stored = await POST(new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: visitorText, stream: false }) }));
    console.error = oldError;
    assert.equal(stored.status, 200);
    const storedBody = await stored.json();
    assert.equal(storedBody.message.content, 'Antwort trotz Speicherfehler.');
    assert.equal(storedBody.persisted, false);
    assert.ok(storeLog.length >= 1);
    for (const line of storeLog) {
      const entry = JSON.parse(line);
      assert.equal(entry.stage, 'persistence');
      assert.equal(entry.cause, 'upstream_http');
      assert.equal(entry.status, 503);
      assert.doesNotMatch(line, new RegExp(`${secret}|fixture-service-role|db\\.invalid|${visitorText}`));
    }
  } finally {
    globalThis.fetch = oldFetch;
    console.error = oldError;
    for (const key of keys) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
    await server.close();
  }
});
