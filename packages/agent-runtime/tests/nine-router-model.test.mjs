import test from 'node:test';
import assert from 'node:assert/strict';
import { streamText } from 'ai';
import { createNineRouterModel } from '../nine-router-model.ts';
import { createPublicPageAgent } from '../model-agent.ts';

const baseUrl = 'http://127.0.0.1:20128/v1';
const key = 'synthetic-fixture-key';
const stream = () => {
  const chunks = [
    { id:'fixture',model:'deepseek/deepseek-v4.1-flash-1017',created:1,choices:[{index:0,delta:{role:'assistant',content:'Guten Tag'},finish_reason:null}] },
    { id:'fixture',model:'deepseek/deepseek-v4.1-flash-1017',created:1,choices:[{index:0,delta:{},finish_reason:'stop'}] },
  ];
  return new Response(chunks.map(c=>'data: '+JSON.stringify(c)+'\n\n').join('')+'data: [DONE]\n\n',
    {headers:{'content-type':'text/event-stream'}});
};
const invoke = (model, extra={}) => streamText({model, prompt:'Meine Website', maxOutputTokens:100,
  maxRetries:0, streamRetries:0, onError:()=>{}, ...extra});

test('streams through the actual SDK into a local 9router-shaped fixture with the pinned policy', async () => {
  let calls = 0;
  const model = createNineRouterModel({baseUrl, apiKey:key, fetch:async (url, init) => {
    calls++;
    assert.equal(url, baseUrl + '/chat/completions');
    assert.equal(init.redirect, 'error');
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer ' + key);
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'deepseek/deepseek-v4.1-flash-1017');
    assert.deepEqual(body.reasoning, {effort:'high'});
    assert.equal(body.max_tokens,100);
    assert.equal(body.stream,true);
    assert.equal(body.provider,undefined);
    return stream();
  }});
  assert.equal(await invoke(model).text, 'Guten Tag');
  assert.equal(calls, 1);
});

test('rejects public providers, non-loopback hosts and unsafe endpoint syntax before any fetch', () => {
  let calls=0;
  for (const binding of ['https://openrouter.ai/api/v1','https://api.openai.com/v1',
    'http://192.168.1.1:20128/v1','http://localhost:20128/v1?route=provider',
    'http://user:password@127.0.0.1:20128/v1','http://127.0.0.1:20128/other']) {
    assert.throws(()=>createNineRouterModel({baseUrl:binding,apiKey:key,fetch:async()=>{calls++;return stream();}}),
      /invalid_ninerouter_binding/);
  }
  assert.equal(calls,0);
});

test('does not expose upstream error details and makes no retries', async () => {
  let calls=0;
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>{
    calls++;return new Response('SENSITIVE_UPSTREAM_VALUE',{status:401});
  }});
  await assert.rejects(invoke(model).text, error => !String(error).includes('SENSITIVE_UPSTREAM_VALUE'));
  assert.equal(calls,1);
});

test('passes cancellation to the injected transport', async () => {
  const controller=new AbortController();
  let received;
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async (_url,init)=>{
    received=init.signal;
    return await new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));
  }});
  const result=invoke(model,{abortSignal:controller.signal});
  const pending=result.text;
  await new Promise(resolve=>setTimeout(resolve,10));
  controller.abort();
  await assert.rejects(pending);
  assert.equal(received.aborted,true);
});

test('rejects provider overrides and output-policy violations before transport', async () => {
  let calls=0;
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>{calls++;return stream();}});
  await assert.rejects(model.doStream({prompt:[],maxOutputTokens:100,providerOptions:{openrouter:{model:'other'}}}),/unsupported_provider_options/);
  await assert.rejects(model.doStream({prompt:[],maxOutputTokens:3000}),/ninerouter_request_policy_violation/);
  assert.equal(calls,0);
});

test('the existing public-page agent can use the guarded streaming adapter without new tools', async () => {
  let calls=0;
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async (_url,init)=>{
    calls++;
    const body=JSON.parse(init.body);
    assert.deepEqual(body.tools.map(tool=>tool.function.name),['publicPageInfo']);
    assert.equal(body.max_tokens,512);
    return stream();
  }});
  const result=await createPublicPageAgent({model}).stream({prompt:'Welche Leistungen gibt es?',onError:()=>{}});
  assert.equal(await result.text,'Guten Tag');
  assert.equal(calls,1);
});

test('redacts HTTP-200 SSE error payloads and response headers from SDK stream parts', async () => {
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>new Response(
    'data: '+JSON.stringify({error:{message:'fixture-sensitive-error',code:429}})+'\n\n',
    {headers:{'content-type':'text/event-stream','x-debug':'fixture-sensitive-header'}})});
  const parts=[];
  for await(const part of invoke(model).fullStream) parts.push(part);
  const serialized=JSON.stringify(parts,(_key,value)=>value instanceof Error ? {message:value.message} : value);
  assert.ok(parts.some(part=>part.type==='error'));
  assert.doesNotMatch(serialized,/fixture-sensitive-error|fixture-sensitive-header/);
});

test('cancellation after SSE has started releases the upstream reader', async () => {
  let cancelled=false;
  let release;
  const cancellation=new Promise(resolve=>{release=resolve;});
  const encoder=new TextEncoder();
  const body=new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: '+JSON.stringify({id:'fixture',model:'deepseek/deepseek-v4.1-flash-1017',created:1,
        choices:[{index:0,delta:{role:'assistant',content:'Teilantwort'},finish_reason:null}]})+'\n\n'));
    },
    cancel() { cancelled=true; release(); },
  });
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>new Response(body,{headers:{'content-type':'text/event-stream'}})});
  const generated=await model.doStream({prompt:[{role:'user',content:[{type:'text',text:'Hallo'}]}],maxOutputTokens:100});
  const reader=generated.stream.getReader();
  for (;;) { const part=await reader.read(); if (part.done || part.value.type==='text-delta') break; }
  await reader.cancel();
  await Promise.race([cancellation,new Promise(resolve=>setTimeout(resolve,250))]);
  assert.equal(cancelled,true);
});

test('a broken upstream stream does not expose its exception details', async () => {
  const body=new ReadableStream({start(controller){controller.error(new Error('fixture-private-stream-failure'));}});
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>new Response(body,{headers:{'content-type':'text/event-stream'}})});
  const parts=[];
  for await (const part of invoke(model).fullStream) parts.push(part);
  const serialized=JSON.stringify(parts,(_key,value)=>value instanceof Error ? {message:value.message} : value);
  assert.ok(parts.some(part=>part.type==='error'));
  assert.doesNotMatch(serialized,/fixture-private-stream-failure/);
});

test('non-streaming results do not return raw prompt, response headers or response body', async () => {
  const model=createNineRouterModel({baseUrl,apiKey:key,fetch:async()=>new Response(JSON.stringify({
    id:'fixture',model:'deepseek/deepseek-v4.1-flash-1017',created:1,
    choices:[{index:0,message:{role:'assistant',content:'Antwort'},finish_reason:'stop'}],
    usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2},
    private_debug:'fixture-private-body',
  }),{headers:{'content-type':'application/json','x-debug':'fixture-private-header'}})});
  const result=await model.doGenerate({prompt:[{role:'user',content:[{type:'text',text:'fixture-private-prompt'}]}],maxOutputTokens:100});
  const serialized=JSON.stringify(result);
  assert.match(serialized,/Antwort/);
  assert.doesNotMatch(serialized,/fixture-private-body|fixture-private-header|fixture-private-prompt/);
});
