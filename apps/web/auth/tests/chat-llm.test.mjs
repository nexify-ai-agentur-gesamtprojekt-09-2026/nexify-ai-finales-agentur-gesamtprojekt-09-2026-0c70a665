import test from 'node:test';
import assert from 'node:assert/strict';
import {chatModelId,streamChatCompletion,generateChatCompletion,describeChatFailure,ChatLlmError} from '../../lib/chat-llm.ts';

const POLICY='deepseek/deepseek-v4.1-flash-1017';
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

test('request carries exact model, reasoning high and a limit that leaves room after reasoning',()=>withEnv({...configured},async()=>{
  let body;globalThis.fetch=async(_url,init)=>{body=JSON.parse(init.body);assert.ok(init.signal);return sse(delta('Guten Tag'),'data: [DONE]\n');};
  assert.equal(await generateChatCompletion([{role:'user',content:'Hallo'}]),'Guten Tag');
  assert.equal(body.model,POLICY);assert.deepEqual(body.reasoning,{effort:'high'});assert.equal(body.stream,true);assert.ok(body.max_tokens>=4096);
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

const failure=async run=>{try{await run();}catch(error){assert.ok(error instanceof ChatLlmError);return describeChatFailure(error);}assert.fail('expected a ChatLlmError');};
const ask=()=>generateChatCompletion([{role:'user',content:'vertraulicher Nutzertext'}]);

test('every failure gets a distinct, secret-free cause for the server log',()=>withEnv({...configured},async()=>{
  const privateDetail='fixture-private-provider-detail';
  // Router antwortet mit Fehlerstatus: Statuszahl bleibt, Antworttext nie.
  globalThis.fetch=async()=>new Response(privateDetail,{status:401,headers:{'content-type':'application/json'}});
  assert.deepEqual(await failure(ask),{cause:'upstream_http',status:401,upstream_content_type:'json'});
  // Verbindung kommt nicht zustande: nur der Systemfehlercode aus der Ursachenkette.
  globalThis.fetch=async()=>{throw Object.assign(new TypeError('fetch failed'),{cause:Object.assign(new Error('getaddrinfo ENOTFOUND router.invalid '+privateDetail),{code:'ENOTFOUND'})});};
  assert.deepEqual(await failure(ask),{cause:'network',network_code:'ENOTFOUND'});
  globalThis.fetch=async()=>{throw new Error(privateDetail);};
  assert.deepEqual(await failure(ask),{cause:'network'});
  // Erfolgsstatus, aber eine HTML-Seite statt einer Chat-Antwort (z. B. falscher Pfad).
  globalThis.fetch=async()=>new Response('<html>'+privateDetail+'</html>',{status:200,headers:{'content-type':'text/html'}});
  assert.deepEqual(await failure(ask),{cause:'invalid_response',status:200,upstream_content_type:'html'});
  // Gültiges Format ohne Antworttext.
  globalThis.fetch=async()=>sse('data: '+JSON.stringify({choices:[{delta:{}}]})+'\n','data: [DONE]\n');
  assert.deepEqual(await failure(ask),{cause:'empty_response',status:200,upstream_content_type:'missing'});
  // Fehlerobjekt des Routers innerhalb einer 200-Antwort.
  globalThis.fetch=async()=>sse('data: '+JSON.stringify({error:{message:privateDetail}})+'\n');
  assert.deepEqual(await failure(ask),{cause:'upstream_stream_error',status:200,upstream_content_type:'missing'});
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{message:privateDetail}}),{status:200,headers:{'content-type':'application/json'}});
  assert.deepEqual(await failure(ask),{cause:'upstream_stream_error',status:200,upstream_content_type:'json'});
  // Verbindung reisst während der Antwort ab.
  globalThis.fetch=async()=>new Response(new ReadableStream({pull(c){c.error(Object.assign(new Error(privateDetail),{code:'ECONNRESET'}));}}),{status:200});
  assert.deepEqual(await failure(ask),{cause:'stream_interrupted',network_code:'ECONNRESET'});
  // Abbruch durch den Besucher ist keine Störung des Routers.
  const visitor=new AbortController();visitor.abort();
  globalThis.fetch=async(_url,init)=>{init.signal.throwIfAborted();};
  assert.deepEqual(await failure(()=>generateChatCompletion([{role:'user',content:'x'}],{signal:visitor.signal})),{cause:'client_abort'});
  // Fehlende oder ungültige Konfiguration.
  process.env.CHAT_MODEL_ID='other/model';
  assert.deepEqual(await failure(ask),{cause:'model_policy'});
  delete process.env.CHAT_MODEL_ID;process.env.ROUTER_URL='kein-url '+privateDetail;
  globalThis.fetch=()=>{throw new Error('must not be called with an invalid endpoint');};
  assert.deepEqual(await failure(ask),{cause:'invalid_endpoint'});
  process.env.ROUTER_URL='ftp://router.invalid/v1';
  assert.deepEqual(await failure(ask),{cause:'invalid_endpoint'});
  delete process.env.ROUTER_URL;delete process.env.ROUTER_KEY;
  assert.deepEqual(await failure(ask),{cause:'not_configured'});
  assert.deepEqual(describeChatFailure(new Error(privateDetail)),{cause:'unexpected'});
}));

test('a router that answers with one JSON body instead of a stream is still read',()=>withEnv({...configured},async()=>{
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{role:'assistant',content:'Guten Tag'},finish_reason:'stop'}]}),{status:200,headers:{'content-type':'application/json; charset=utf-8'}});
  assert.equal(await ask(),'Guten Tag');
  globalThis.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:''},finish_reason:'length'}]}),{status:200,headers:{'content-type':'application/json'}});
  assert.deepEqual(await failure(ask),{cause:'token_budget',upstream_content_type:'json'});
}));
