import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

const ENV_KEYS = ['ROUTER_URL', 'ROUTER_KEY', 'CHAT_COMPLETIONS_URL', 'CHAT_MODEL_ID', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_TIMEOUT_MS'];
const CONVERSATION = '11111111-2222-4333-8444-555555555555';
const llmAnswer = text => new Response(`data: {"choices":[{"delta":{"content":${JSON.stringify(text)}}}]}\n\ndata: [DONE]\n\n`, { headers: { 'content-type': 'text/event-stream' } });
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

async function withRoute(run) {
  const saved = Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
  const oldError = console.error, oldFetch = globalThis.fetch;
  const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, { ROUTER_URL: 'https://router.invalid/v1', ROUTER_KEY: 'fixture-key', SUPABASE_URL: 'https://db.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role' });
    const { POST } = await server.ssrLoadModule('/apps/web/app/api/chat/route.ts');
    const { resetChatRateLimit } = await server.ssrLoadModule('/apps/web/lib/chat-rate-limit.ts');
    resetChatRateLimit();
    await run(POST);
  } finally {
    console.error = oldError; globalThis.fetch = oldFetch;
    for (const key of ENV_KEYS) saved[key] === undefined ? delete process.env[key] : process.env[key] = saved[key];
    await server.close();
  }
}
const post = body => new Request('http://localhost/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const isStore = url => String(url).startsWith('https://db.invalid');

test('A4: stored history is loaded newest-first with a limit and handed to the model in chronological order', async () => {
  await withRoute(async POST => {
    const storeCalls = [];
    let sent;
    // 25 gespeicherte Beiträge: der Speicher liefert – wie PostgREST bei order=created_at.desc&limit=20 – die jüngsten 20, jüngster zuerst.
    const all = Array.from({ length: 25 }, (_, index) => ({ role: index % 2 === 0 ? 'user' : 'assistant', content: `Beitrag ${index + 1}` }));
    globalThis.fetch = async (url, init) => {
      if (!isStore(url)) { sent = JSON.parse(init.body); return llmAnswer('Gern.'); }
      const target = new URL(url);
      storeCalls.push(`${init.method} ${target.pathname}${target.search}`);
      if (init.method === 'GET' && target.pathname.endsWith('/chat_conversations')) return json([{ id: CONVERSATION }]);
      if (init.method === 'GET' && target.pathname.endsWith('/chat_messages')) {
        assert.equal(target.searchParams.get('order'), 'created_at.desc');
        assert.equal(target.searchParams.get('limit'), '20');
        return json([...all].reverse().slice(0, 20));
      }
      return json([{}]);
    };
    const response = await POST(post({ message: 'Neue Frage', conversationId: CONVERSATION, stream: false, history: [{ role: 'user', content: 'aus dem Browser' }] }));
    assert.equal(response.status, 200);
    const turns = sent.messages.filter(message => message.role !== 'system').map(message => message.content);
    // Die jüngsten Beiträge, älteste zuerst, danach die neue Frage; der Verlauf aus dem Browser zählt nicht.
    assert.equal(turns.at(-1), 'Neue Frage');
    const history = turns.slice(0, -1);
    assert.ok(history.length > 0 && history.length <= 20);
    assert.equal(history.at(-1), 'Beitrag 25');
    assert.deepEqual(history, [...history].sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1])));
    assert.ok(history.every(text => Number(text.split(' ')[1]) >= 6), 'only the newest 20 stored turns may reach the model');
    assert.ok(!turns.includes('aus dem Browser'));
    assert.ok(storeCalls.some(call => call.startsWith('GET /rest/v1/chat_messages')));
  });
});

test('A5: a hanging store costs one time limit, is logged as timeout and never blocks the answer', async () => {
  await withRoute(async POST => {
    process.env.SUPABASE_TIMEOUT_MS = '150';
    let storeAttempts = 0;
    globalThis.fetch = (url, init) => {
      if (!isStore(url)) return Promise.resolve(llmAnswer('Antwort trotz hängendem Speicher.'));
      storeAttempts += 1;
      // Hängt, bis das Zeitlimit die Anfrage abbricht.
      return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
    };
    for (const stream of [false, true]) {
      storeAttempts = 0;
      const logged = [];
      console.error = line => { logged.push(JSON.parse(line)); };
      const started = Date.now();
      const response = await POST(post({ message: 'Hallo', stream }));
      const body = await response.text();
      const elapsed = Date.now() - started;
      assert.equal(response.status, 200);
      assert.match(body, /Antwort trotz hängendem Speicher\./);
      if (stream) assert.match(body, /"type":"done"/); else assert.equal(JSON.parse(body).persisted, false);
      // Ein einziger Zugriff läuft ins Limit; die übrigen Speicherschritte der Anfrage entfallen.
      assert.equal(storeAttempts, 1);
      assert.ok(elapsed < 2000, `took ${elapsed} ms`);
      assert.deepEqual(logged.map(entry => [entry.event, entry.stage, entry.cause, entry.step]), [['chat_failure', 'persistence', 'timeout', 'conversation']]);
      assert.doesNotMatch(JSON.stringify(logged), /db\.invalid|fixture-service-role|Hallo/);
    }
  });
});

test('A5: in the stream the visitor gets "done" before the answer is saved', async () => {
  await withRoute(async POST => {
    let releaseSave, assistantSaveStarted = false, assistantSaved = false;
    const saveGate = new Promise(resolve => { releaseSave = resolve; });
    globalThis.fetch = async (url, init) => {
      if (!isStore(url)) return llmAnswer('Fertige Antwort.');
      const target = new URL(url);
      if (init.method === 'GET') return json(target.pathname.endsWith('/chat_conversations') ? [] : []);
      if (target.pathname.endsWith('/chat_conversations')) return json([{ id: CONVERSATION }]);
      if (target.pathname.endsWith('/chat_messages') && JSON.parse(init.body).role === 'assistant') {
        assistantSaveStarted = true;
        await saveGate;
        assistantSaved = true;
      }
      return json([{}]);
    };
    const response = await POST(post({ message: 'Hallo', stream: true }));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    const deadline = setTimeout(() => releaseSave(), 3000); // Sicherung: der Test hängt nie.
    while (!text.includes('"type":"done"')) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    clearTimeout(deadline);
    // Der Abschluss ist beim Besucher, während das Speichern der Antwort noch aussteht.
    assert.match(text, /"type":"done"/);
    assert.match(text, /Fertige Antwort\./);
    assert.equal(assistantSaved, false);
    releaseSave();
    while (!(await reader.read()).done) { /* Strom bis zum Ende lesen */ }
    assert.equal(assistantSaveStarted, true);
    assert.equal(assistantSaved, true);
  });
});
