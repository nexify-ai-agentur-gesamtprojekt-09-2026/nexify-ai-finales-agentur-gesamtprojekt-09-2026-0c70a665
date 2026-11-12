import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationRpcAdapter} from '../../lib/oracle-conversation-rpc.mjs';
import {createOwnedConversationHandler} from '../../lib/oracle-owned-conversations.mjs';
import {issueOracleSession} from '../../lib/oracle-visitor-session.mjs';

test('HTTP handler sends only server-computed digest to owner RPC and hides foreign record',async()=>{
 const now=1800000000000, a=issueOracleSession(now), b=issueOracleSession(now), id='00000000-0000-4000-8000-000000000001';
 let saved; const calls=[];
 const fakeFetch=async(url,opts)=>{const input=JSON.parse(opts.body);calls.push({url:String(url),input,opts});
  if(String(url).endsWith('/create_owned_conversation')) {saved=input.p_owner_digest;return Response.json(id);}
  return Response.json(input.p_owner_digest===saved?[{id,locale:'de',page_path:'/',status:'open'}]:[]);
 };
 const db=createConversationRpcAdapter({baseUrl:'https://db.example.test',allowedOrigin:'https://db.example.test',serviceKey:'fixture-only',fetchImpl:fakeFetch});
 const handler=createOwnedConversationHandler({db,origin:'https://web.example.test',now:()=>now});
 const req=(body,s)=>new Request('https://web.example.test/',{method:'POST',headers:{origin:'https://web.example.test',cookie:s.cookie.split(';')[0],'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handler(req({action:'create',locale:'de',pagePath:'/'},a))).status,201);
 assert.equal((await handler(req({action:'read',id},a))).status,200);
 assert.equal((await handler(req({action:'read',id},b))).status,404);
 assert.equal(calls[0].input.p_owner_digest,'\\x'+a.digest.toString('hex'));
 assert.equal(JSON.stringify(calls.map(c=>c.input)).includes(a.cookie.split(';')[0]),false);
 assert.ok(calls.every(c=>c.opts.signal instanceof AbortSignal && c.opts.redirect==='error'));
});
test('rejects unsafe URL, absent credential, invalid digest and aborted signal',async()=>{
 assert.throws(()=>createConversationRpcAdapter({baseUrl:'http://db.example.test',allowedOrigin:'http://db.example.test',serviceKey:'x'}));
 assert.throws(()=>createConversationRpcAdapter({baseUrl:'https://db.example.test',allowedOrigin:'https://db.example.test',serviceKey:''}));
 assert.throws(()=>createConversationRpcAdapter({baseUrl:'https://evil.example.test',allowedOrigin:'https://db.example.test',serviceKey:'fixture-only'}));
 assert.throws(()=>createConversationRpcAdapter({baseUrl:'https://db.example.test',serviceKey:'fixture-only'}));
 const db=createConversationRpcAdapter({baseUrl:'https://db.example.test',allowedOrigin:'https://db.example.test',serviceKey:'fixture-only'}), ctrl=new AbortController();ctrl.abort();
 await assert.rejects(db.create(Buffer.alloc(32),'de','/',{signal:ctrl.signal}));
 await assert.rejects(db.create(Buffer.alloc(1),'de','/',{signal:new AbortController().signal}));
});
test('redirect and oversized RPC responses fail generically',async()=>{
 for(const reply of [()=>new Response(null,{status:302,headers:{location:'https://elsewhere.test'}}),()=>new Response('x'.repeat(4097))]) {
  const db=createConversationRpcAdapter({baseUrl:'https://db.example.test',allowedOrigin:'https://db.example.test',serviceKey:'fixture-only',fetchImpl:async()=>reply()});
  await assert.rejects(db.read('00000000-0000-4000-8000-000000000001',Buffer.alloc(32),{signal:new AbortController().signal}),{message:'database_unavailable'});
 }
});
test('abort while consuming the RPC response fails closed',async()=>{
 const controller=new AbortController();
 const db=createConversationRpcAdapter({baseUrl:'https://db.example.test',allowedOrigin:'https://db.example.test',serviceKey:'fixture-only',fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('['));}}))});
 const pending=db.read('00000000-0000-4000-8000-000000000001',Buffer.alloc(32),{signal:controller.signal});
 setTimeout(()=>controller.abort(),5);
 await assert.rejects(pending,{message:'database_unavailable'});
});
