import test from 'node:test';
import assert from 'node:assert/strict';
import {chatModelId,routerModelName,streamChatCompletion,generateChatCompletion} from '../../lib/chat-llm.ts';

const POLICY='deepseek/deepseek-v4.1-flash-1017';
const ROUTER_NAME='ds/deepseek-v4.1-flash';
const sse=(...events)=>new Response(new ReadableStream({start(c){const e=new TextEncoder();for(const x of events)c.enqueue(e.encode(x));c.close();}}),{status:200});
const delta=text=>'data: '+JSON.stringify({choices:[{delta:{content:text}}]})+'\n';
function withEnv(env,run){
  const saved={};for(const k of Object.keys(env)){saved[k]=process.env[k];if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k];}
  const fetchBefore=globalThis.fetch;
  return Promise.resolve(run()).finally(()=>{globalThis.fetch=fetchBefore;for(const k of Object.keys(saved)){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
}
const configured={ROUTER_URL:'https://router.invalid/v1',ROUTER_KEY:'test-key',CHAT_COMPLETIONS_URL:undefined,CHAT_MODEL_ID:undefined};

test('the policy model is fixed; a different server override fails closed instead of substituting',()=>withEnv({...configured},async()=>{
  assert.equal(chatModelId(),POLICY);
  process.env.CHAT_MODEL_ID='other/model';
  assert.throws(()=>chatModelId(),/chat_llm_model_policy_violation/);
  globalThis.fetch=()=>{throw new Error('must not call the provider with a substituted model');};
  await assert.rejects(generateChatCompletion([{role:'user',content:'Hallo'}]),/chat_llm_model_policy_violation/);
  process.env.CHAT_MODEL_ID=POLICY;assert.equal(chatModelId(),POLICY);
}));

test('request carries the router name of the policy model, reasoning high and a limit that leaves room after reasoning',()=>withEnv({...configured},async()=>{
  let body;globalThis.fetch=async(_url,init)=>{body=JSON.parse(init.body);assert.ok(init.signal);return sse(delta('Guten Tag'),'data: [DONE]\n');};
  assert.equal(await generateChatCompletion([{role:'user',content:'Hallo'}]),'Guten Tag');
  assert.equal(body.model,ROUTER_NAME);assert.equal(routerModelName(),ROUTER_NAME);assert.equal(chatModelId(),POLICY);assert.deepEqual(body.reasoning,{effort:'high'});assert.equal(body.stream,true);assert.ok(body.max_tokens>=4096);
}));

test('the last event is kept even without a trailing newline',()=>withEnv({...configured},async()=>{
  globalThis.fetch=async()=>sse(delta('Eins '),'data: '+JSON.stringify({choices:[{delta:{content:'zwei'}}]}));
  assert.equal(await generateChatCompletion([{role:'user',content:'x'}]),'Eins zwei');
}));

test('reasoning-only output is never shown and an exhausted budget is reported, not answered empty',()=>withEnv({...configured},async()=>{
  const reasoning='data: '+JSON.stringify({choices:[{delta:{reasoning:'interne Gedanken'}}]})+'\n';
  const cut='data: '+JSON.stringify({choices:[{delta:{},finish_reason:'length'}]})+'\n';
  globalThis.fetch=async()=>sse(reasoning,cut,'data: [DONE]\n');
  await assert.rejects(generateChatCompletion([{role:'user',content:'x'}]),/chat_llm_token_budget_exhausted/);
  globalThis.fetch=async()=>sse(reasoning,delta('Antwort'),'data: [DONE]\n');
  const text=await generateChatCompletion([{role:'user',content:'x'}]);assert.equal(text,'Antwort');assert.doesNotMatch(text,/Gedanken/);
}));

test('upstream errors surface honestly and without a replacement answer',()=>withEnv({...configured},async()=>{
  const privateDetail='fixture-private-provider-detail';
  globalThis.fetch=async()=>new Response(privateDetail,{status:429});
  await assert.rejects(generateChatCompletion([{role:'user',content:'x'}]),err=>{
    assert.equal(err.message,'chat_llm_upstream_429');assert.doesNotMatch(err.message,new RegExp(privateDetail));return true;
  });
  await withEnv({ROUTER_URL:undefined,ROUTER_KEY:undefined,CHAT_COMPLETIONS_URL:undefined},()=>assert.rejects(generateChatCompletion([{role:'user',content:'x'}]),/chat_llm_not_configured/));
}));
