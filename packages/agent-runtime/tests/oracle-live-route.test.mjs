import test from 'node:test';
import assert from 'node:assert/strict';
import { DefaultChatTransport, readUIMessageStream } from 'ai';
import handler, { createIsolatedLiveChatHandler } from '../../../api/agent-chat.ts';

const origin = 'https://nexify.example.invalid';
const user = (id, text) => ({ id, role: 'user', parts: [{ type: 'text', text }] });
const reply = (id, text) => ({ id, role: 'assistant', parts: [{ type: 'text', text }] });
function providerSse(text) {
  const delta = { id: 'fixture', model: 'deepseek/deepseek-v4.1-flash-1017', created: 1,
    choices: [{ index: 0, delta: { role: 'assistant', content: text }, finish_reason: null }] };
  const end = { id: 'fixture', model: delta.model, created: 1, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] };
  return new Response(`data: ${JSON.stringify(delta)}\n\ndata: ${JSON.stringify(end)}\n\ndata: [DONE]\n\n`,
    { headers: { 'content-type': 'text/event-stream' } });
}
function request(messages, signal) {
  return new Request(origin + '/api/agent-chat', { method: 'POST', signal,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: 'de', page_path: '/', messages }) });
}

test('isolated actual 9router adapter streams through the SDK transport with retained turns', async () => {
  const seen = [];
  const isolated = createIsolatedLiveChatHandler({ baseUrl: 'http://127.0.0.1:20128/v1', apiKey: 'fixture-key',
    fetch: async (_url, init) => { seen.push(JSON.parse(init.body)); return providerSse('Gern, erzählen Sie mir mehr.'); } });
  const transport = new DefaultChatTransport({ api: origin + '/api/agent-chat', body: { locale: 'de', page_path: '/' },
    fetch: async (url, init) => isolated.fetch(new Request(url, { ...init, headers: { ...init.headers, Origin: origin } })) });
  const messages = [user('u1', 'Ich brauche eine Website.'), reply('a1', 'Für wen ist sie?'), user('u2', 'Für eine Werkstatt.')];
  const stream = await transport.sendMessages({ chatId: 'fixture', trigger: 'submit-message', messages });
  let final;
  for await (const item of readUIMessageStream({ stream, terminateOnError: true })) final = item;
  assert.equal(final.parts.filter(part => part.type === 'text').map(part => part.text).join(''), 'Gern, erzählen Sie mir mehr.');
  assert.deepEqual(final.parts.find(part => part.type === 'data-page').data, { page_id: 'home', path: '/' });
  assert.equal(seen.length, 1);
  const wire = seen[0].messages.filter(message => ['user', 'assistant'].includes(message.role));
  assert.deepEqual(wire.map(message => message.role), ['user', 'assistant', 'user']);
  assert.match(JSON.stringify(wire), /Werkstatt/);
  assert.ok(JSON.stringify(wire).includes('Seitenkontext: /; Sprache: de'));
  assert.equal(seen[0].model, 'deepseek/deepseek-v4.1-flash-1017');
});

test('isolated errors do not leak provider data and default handler never calls the model', async () => {
  const isolated = createIsolatedLiveChatHandler({ baseUrl: 'http://127.0.0.1:20128/v1', apiKey: 'fixture-key',
    fetch: async () => new Response('synthetic-private-provider-data', { status: 500 }) });
  const response = await isolated.fetch(request([user('u1', 'Hallo')]));
  const text = await response.text();
  assert.match(text, /oracle_live_unavailable/);
  assert.doesNotMatch(text, /synthetic-private-provider-data|fixture-key/);
  let calls = 0; const old = globalThis.fetch;
  globalThis.fetch = async () => { calls++; throw new Error('network forbidden'); };
  try { const fallback = await handler.fetch(request([user('u1', 'Hallo')])); assert.equal(fallback.status, 200); await fallback.text(); assert.equal(calls, 0); }
  finally { globalThis.fetch = old; }
});

test('pre-aborted isolated requests do not invoke the router', async () => {
  let calls = 0; const controller = new AbortController(); controller.abort();
  const isolated = createIsolatedLiveChatHandler({ baseUrl: 'http://127.0.0.1:20128/v1', apiKey: 'fixture-key',
    fetch: async () => { calls++; return providerSse('unexpected'); } });
  const response = await isolated.fetch(request([user('u1', 'Hallo')], controller.signal));
  assert.equal(response.status, 499); assert.equal(calls, 0);
});

test('client abort propagates to an active router stream', async () => {
  const controller = new AbortController();
  let upstreamSignal;
  const encoder = new TextEncoder();
  const body = new ReadableStream({ start(stream) {
    stream.enqueue(encoder.encode('data: '+JSON.stringify({ id:'fixture', model:'deepseek/deepseek-v4.1-flash-1017', created:1,
      choices:[{index:0,delta:{role:'assistant',content:'Hallo'},finish_reason:null}] })+'\n\n'));
  } });
  const isolated = createIsolatedLiveChatHandler({ baseUrl: 'http://127.0.0.1:20128/v1', apiKey: 'fixture-key',
    fetch: async (_url, init) => { upstreamSignal = init.signal; return new Response(body, {headers:{'content-type':'text/event-stream'}}); } });
  const response = await isolated.fetch(request([user('u1', 'Hallo')], controller.signal));
  const reader = response.body.getReader();
  let content = '';
  for (let i = 0; i < 12 && !content.includes('Hallo'); i++) {
    const chunk = await reader.read(); if (chunk.done) break; content += new TextDecoder().decode(chunk.value);
  }
  assert.match(content, /Hallo/);
  controller.abort();
  assert.equal(upstreamSignal.aborted, true);
  await reader.cancel();
});

test('cancelling only the HTTP response reader aborts an active upstream stream', async () => {
  let upstreamSignal;
  let upstreamCancelled = false;
  let notifyCancel;
  const cancelled = new Promise(resolve => { notifyCancel = resolve; });
  const encoder = new TextEncoder();
  const isolated = createIsolatedLiveChatHandler({ baseUrl: 'http://127.0.0.1:20128/v1', apiKey: 'fixture-key',
    fetch: async (_url, init) => {
      upstreamSignal = init.signal;
      const upstream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: '+JSON.stringify({ id:'fixture', model:'deepseek/deepseek-v4.1-flash-1017', created:1,
            choices:[{index:0,delta:{role:'assistant',content:'Antwortbeginn'},finish_reason:null}] })+'\n\n'));
          init.signal.addEventListener('abort', () => { upstreamCancelled = true; notifyCancel(); controller.error(new DOMException('cancelled', 'AbortError')); }, { once: true });
        },
        cancel() { upstreamCancelled = true; notifyCancel(); },
      });
      return new Response(upstream, {headers:{'content-type':'text/event-stream'}});
    } });
  const response = await isolated.fetch(request([user('u1', 'Hallo')]));
  const reader = response.body.getReader();
  let content = '';
  for (let i = 0; i < 12 && !content.includes('Antwortbeginn'); i++) {
    const chunk = await reader.read(); if (chunk.done) break; content += new TextDecoder().decode(chunk.value);
  }
  assert.match(content, /Antwortbeginn/);
  await reader.cancel();
  await Promise.race([cancelled, new Promise(resolve => setTimeout(resolve, 250))]);
  assert.equal(upstreamSignal.aborted, true);
  assert.equal(upstreamCancelled, true);
  // Let the SDK's pending stream cleanup settle before this test ends; a late
  // rejected cleanup promise must fail the test instead of escaping the case.
  await new Promise(resolve => setTimeout(resolve, 100));
});
