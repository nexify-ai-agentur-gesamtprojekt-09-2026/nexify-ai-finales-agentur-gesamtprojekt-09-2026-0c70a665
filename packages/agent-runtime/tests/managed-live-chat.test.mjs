/** Managed live-chat is wired but fail-closed: gate stays closed without explicit flag + 9router
 * config, assembly remains unavailable, and the 9router binding cannot become a silent
 * provider bypass. No network and no real key are used (offline dummy fetch only). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { managedLiveChatGate, assembleManagedLiveChat, LIVE_CHAT_FLAG, ROUTER_URL_VAR,
  ROUTER_KEY_VAR, PINNED_PROVIDER_ENDPOINT, prepareNineRouterChatPayload } from '../managed-live-chat.ts';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

test('9router preparation keeps bounded multi-turn context and pins the managed model without network', () => {
  const prior=globalThis.fetch; globalThis.fetch=()=>{throw new Error('network forbidden');};
  try {
    const result=prepareNineRouterChatPayload({system:'Trusted public guidance rules',turns:[
      {role:'user',content:'I need a website.'},{role:'assistant',content:'Tell me about your goals.'},
      {role:'user',content:'How long could it take?'}]});
    assert.equal(result.model,'deepseek/deepseek-v4.1-flash-1017');
    assert.deepEqual(result.reasoning,{effort:'high'});assert.equal(result.stream,true);assert.equal(result.max_tokens,1024);
    assert.deepEqual(result.messages.map(message=>message.role),['system','user','assistant','user']);
    assert.equal('provider' in result,false);assert.equal('apiKey' in result,false);
    assert.throws(()=>prepareNineRouterChatPayload({system:'ok',turns:[{role:'system',content:'untrusted'}]}),/invalid_ninerouter_turn/);
    assert.throws(()=>prepareNineRouterChatPayload({system:'ok',turns:[{role:'assistant',content:'last'}]}),/ninerouter_user_turn_required/);
    assert.throws(()=>prepareNineRouterChatPayload({system:'ok',turns:Array(21).fill({role:'user',content:'x'})}),/invalid_ninerouter_input/);
    assert.throws(()=>prepareNineRouterChatPayload({system:'ok',turns:[{role:'user',content:'x'.repeat(4001)}]}),/invalid_ninerouter_turn/);
    const sparse=Array(2);sparse[1]={role:'user',content:'last'};
    assert.throws(()=>prepareNineRouterChatPayload({system:'ok',turns:sparse}),/invalid_ninerouter_turn/);
  }finally{globalThis.fetch=prior;}
});

test('prepared payload survives a real Request JSON wire serialization without null turns or overrides',async()=>{
 const payload=prepareNineRouterChatPayload({system:'Trusted rules',turns:[{role:'user',content:'Website'},{role:'assistant',content:'What is your goal?'},{role:'user',content:'More enquiries'}]});
 const wire=new Request('http://127.0.0.1:9/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const decoded=await wire.json();assert.deepEqual(decoded,payload);assert.equal(decoded.model,'deepseek/deepseek-v4.1-flash-1017');
 assert.deepEqual(decoded.reasoning,{effort:'high'});assert.equal(decoded.stream,true);assert.equal(decoded.max_tokens,1024);
 assert.ok(decoded.messages.every(message=>message&&typeof message.content==='string'));assert.equal('provider' in decoded,false);
});

test('actual SDK streaming shape is compatible with an isolated OpenAI-style router fixture',async()=>{
 let calls=0;const fixture=prepareNineRouterChatPayload({system:'Public guidance',turns:[{role:'user',content:'Hello'}]});
 const provider=createOpenRouter({baseURL:'http://127.0.0.1:9/v1',apiKey:'offline-fixture',fetch:async(url,init)=>{
  calls++;assert.equal(String(url),'http://127.0.0.1:9/v1/chat/completions');const body=JSON.parse(init.body);
  assert.equal(body.model,fixture.model);assert.deepEqual(body.reasoning,fixture.reasoning);assert.equal(body.stream,true);assert.equal(body.max_tokens,fixture.max_tokens);
  const chunks=[{id:'offline',model:fixture.model,created:1,choices:[{index:0,delta:{role:'assistant',content:'Fixture response'},finish_reason:null}]},{id:'offline',model:fixture.model,created:1,choices:[{index:0,delta:{},finish_reason:'stop'}]}];
  return new Response(chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\n\n').join('')+'data: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 }});
 const result=streamText({model:provider.chat(fixture.model,{reasoning:fixture.reasoning}),instructions:fixture.messages[0].content,messages:fixture.messages.slice(1),maxOutputTokens:fixture.max_tokens,maxRetries:0,streamRetries:0});
 assert.equal(await result.text,'Fixture response');assert.equal(calls,1);
});

test('gate is closed with empty environment and names every missing requirement', () => {
  const gate = managedLiveChatGate({});
  assert.equal(gate.enabled, false);
  assert.deepEqual(gate.missing, [LIVE_CHAT_FLAG + '=enabled', ROUTER_URL_VAR, ROUTER_KEY_VAR]);
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

test('gate opens only when flag and both managed router variables are present', () => {
  const gate = managedLiveChatGate({ [LIVE_CHAT_FLAG]: 'enabled',
    [ROUTER_URL_VAR]: PINNED_PROVIDER_ENDPOINT, [ROUTER_KEY_VAR]: 'offline-dummy' });
  assert.equal(gate.enabled, true);
});

test('assembly fails closed for a 9router URL that is not the authorised pinned binding', () => {
  assert.throws(() => assembleManagedLiveChat({ routerUrl: 'https://9router.internal/api/v1/chat/completions',
    routerKey: 'offline-dummy', fetch: async () => { throw new Error('must not run'); } }),
    /managed_live_chat_router_binding_pending/);
});

test('assembly rejects the direct provider as well and never calls the network', () => {
  let calls = 0;
  assert.throws(() => assembleManagedLiveChat({ routerUrl: PINNED_PROVIDER_ENDPOINT, routerKey: 'offline-dummy-contract-key',
    fetch: async () => { calls++; throw new Error('offline fixture: no paid call'); } }),
    /managed_live_chat_router_binding_pending/);
  assert.equal(calls, 0);
});
