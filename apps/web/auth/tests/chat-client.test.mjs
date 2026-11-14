import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../site/node_modules/vite/dist/node/index.js';

const frame = event => 'data: ' + JSON.stringify(event) + '\n\n';
/** Antwortstrom in beliebig geschnittenen Stücken, wie ihn ein Netzwerk liefert. */
function sse(text, { status = 200, size = 17, type = 'text/event-stream; charset=utf-8', fail = false } = {}) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return new Response(new ReadableStream({ pull(c) {
    if (offset >= bytes.length) return fail ? c.error(new Error('connection lost')) : c.close();
    c.enqueue(bytes.slice(offset, offset + size)); offset += size;
  } }), { status, headers: { 'content-type': type } });
}
const input = { message: 'Ich brauche eine Website.', locale: 'de', pagePath: '/', conversationId: null, history: [] };
const briefing = { data: { vorhaben: 'Website', ziel: 'Anfragen', ausgangslage: '', zielgruppe: '', umfang: [], zeitrahmen: '', budget: '', leistungen: ['websites'], offene_punkte: [] }, text: 'Projektbriefing\n\nVorhaben: Website' };

test('the browser transport turns every server outcome into one clear state for the interface', async () => {
  const server = await createServer({ root: fileURLToPath(new URL('../../../..', import.meta.url)), configFile: false, server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
  try {
    const { streamChat } = await server.ssrLoadModule('/apps/web/lib/chat-client.ts');
    const call = (fetchImpl, handlers = {}, options = {}) => streamChat(input, handlers, { fetch: fetchImpl, ...options });

    // Erfolg: Anfrageform, wachsender Text, Abschlusstext ersetzt den Stromtext, Briefing strukturiert.
    let request;
    const seen = [], started = [];
    const ok = await call(async (url, init) => { request = { url, init, body: JSON.parse(init.body) };
      return sse(frame({ type: 'start', conversationId: 'local-1', model: 'm', persisted: false }) + frame({ type: 'delta', text: 'Verstanden. ' })
        + frame({ type: 'delta', text: 'Für wen ist die Seite?' }) + frame({ type: 'briefing', briefing }) + frame({ type: 'done', message: { role: 'assistant', content: 'Verstanden. Für wen ist die Seite?' } }), { size: 5 }); },
      { onText: full => seen.push(full), onStart: id => started.push(id) });
    assert.deepEqual(ok, { kind: 'done', text: 'Verstanden. Für wen ist die Seite?', briefing, conversationId: 'local-1' });
    assert.deepEqual(seen, ['Verstanden. ', 'Verstanden. Für wen ist die Seite?']);
    assert.deepEqual(started, ['local-1']);
    assert.equal(request.url, '/api/chat');
    assert.equal(request.init.method, 'POST');
    assert.equal(request.init.credentials, 'same-origin');
    assert.deepEqual(request.body, { message: input.message, locale: 'de', pagePath: '/', history: [], stream: true });
    // Folgeaufruf trägt die Konversation weiter.
    await streamChat({ ...input, conversationId: 'local-1' }, {}, { fetch: async (url, init) => { request.body = JSON.parse(init.body); return sse(frame({ type: 'done', message: { content: 'x' } })); } });
    assert.equal(request.body.conversationId, 'local-1');

    // Nicht angebunden gilt nur bei der ausdrücklichen Meldung des Servers (503 chat_llm_not_configured).
    assert.deepEqual(await call(async () => Response.json({ error: 'chat_llm_not_configured' }, { status: 503 })), { kind: 'unavailable' });
    // Jede andere Störung bleibt wiederholbar: 503 ohne diese Meldung, 404, 405, 501, 500, auch mit HTML-Körper.
    const retryable = { kind: 'failed', text: '', conversationId: null };
    assert.deepEqual(await call(async () => Response.json({ error: 'overloaded' }, { status: 503 })), retryable);
    assert.deepEqual(await call(async () => new Response('<html>Service Unavailable</html>', { status: 503, headers: { 'content-type': 'text/html' } })), retryable);
    for (const status of [404, 405, 501, 500]) assert.deepEqual(await call(async () => Response.json({ error: 'chat_llm_not_configured' }, { status })), retryable);
    // Abgelehnte Anfragen sind nicht wiederholbar.
    for (const status of [400, 403, 413, 422]) assert.deepEqual(await call(async () => Response.json({ error: 'invalid_message' }, { status })), { kind: 'rejected' });
    assert.deepEqual(await call(async () => Response.json({ error: 'chat_rate_limited' }, { status: 429, headers: { 'retry-after': '7' } })), { kind: 'limited', retryAfterSeconds: 7 });
    // Mengenbegrenzung mit Wartezeit.
    assert.deepEqual(await call(async () => Response.json({ error: 'chat_rate_limited' }, { status: 429, headers: { 'retry-after': '42' } })), { kind: 'limited', retryAfterSeconds: 42 });
    assert.deepEqual(await call(async () => new Response('', { status: 429 })), { kind: 'limited', retryAfterSeconds: 60 });
    // Störungen: Fehlerereignis, Serverfehler, Netzwerk, Abriss, Strom ohne Abschluss, falscher Inhaltstyp, leere Antwort.
    const failedEmpty = { kind: 'failed', text: '', conversationId: null };
    assert.deepEqual(await call(async () => sse(frame({ type: 'start', conversationId: 'local-2', model: 'm', persisted: false }) + frame({ type: 'error', error: 'chat_llm_failed' }))), { kind: 'failed', text: '', conversationId: 'local-2' });
    assert.deepEqual(await call(async () => Response.json({ error: 'chat_llm_failed' }, { status: 502 })), failedEmpty);
    assert.deepEqual(await call(async () => { throw new TypeError('Failed to fetch'); }), failedEmpty);
    assert.deepEqual(await call(async () => sse(frame({ type: 'delta', text: 'Teil' }), { fail: true })), { kind: 'failed', text: 'Teil', conversationId: null });
    assert.deepEqual(await call(async () => sse(frame({ type: 'delta', text: 'ohne Ende' }))), { kind: 'failed', text: 'ohne Ende', conversationId: null });
    assert.deepEqual(await call(async () => sse('<html>Anmeldung</html>', { type: 'text/html' })), failedEmpty);
    assert.deepEqual(await call(async () => sse(frame({ type: 'done', message: { role: 'assistant', content: '   ' } }))), failedEmpty);
    // Unlesbare Zeilen werden übersprungen, nicht als Antwort gezeigt.
    assert.equal((await call(async () => sse('data: {kaputt\n\n: Kommentar\n\n' + frame({ type: 'done', message: { content: 'Gut.' } })))).text, 'Gut.');

    // Vom Besucher angehalten: bereits geprüfter Teiltext bleibt, kein Fehlerzustand.
    const abort = new AbortController();
    const stopped = await call(async (_url, init) => new Response(new ReadableStream({ start(c) {
      c.enqueue(new TextEncoder().encode(frame({ type: 'delta', text: 'Erster Satz. ' })));
      init.signal.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')));
    } }), { headers: { 'content-type': 'text/event-stream' } }), { onText: () => abort.abort() }, { signal: abort.signal });
    assert.deepEqual(stopped, { kind: 'stopped', text: 'Erster Satz. ', conversationId: null });
    const before = new AbortController(); before.abort();
    assert.equal((await call(async (_url, init) => { init.signal.throwIfAborted(); }, {}, { signal: before.signal })).kind, 'stopped');
  } finally {
    await server.close();
  }
});
