// Intended exclusively for a disposable, local PostgREST/PostgreSQL fixture.
// No fallback to configured application credentials or external hostnames.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createConversationRpcAdapter} from '../../lib/oracle-conversation-rpc.mjs';
import {createOwnedConversationHandler} from '../../lib/oracle-owned-conversations.mjs';
import {issueOracleSession} from '../../lib/oracle-visitor-session.mjs';

test('HTTP to PostgREST: owner, foreign visitor and anonymous privilege boundary', async()=>{
 const base=process.env.ORACLE_FIXTURE_URL, serviceKey=process.env.ORACLE_FIXTURE_SERVICE_JWT, anonKey=process.env.ORACLE_FIXTURE_ANON_JWT;
 assert.ok(base && serviceKey && anonKey,'Explicit synthetic fixture configuration required');
 const parsed=new URL(base);
 assert.equal(parsed.protocol,'http:');assert.equal(parsed.hostname,'127.0.0.1');assert.equal(parsed.pathname,'/');
 const a=issueOracleSession(),b=issueOracleSession(),origin='http://127.0.0.1:4174';
 const fetchImpl=async(url,opts)=>{
  assert.equal(new URL(url).origin,parsed.origin);
  assert.equal(opts.redirect,'error');
  assert.equal(opts.body.includes(a.cookie.split(';')[0]),false);
  assert.equal(opts.body.includes(b.cookie.split(';')[0]),false);
  const response=await fetch(url,opts);
  if(!response.ok) console.error(`Fixture RPC HTTP status: ${response.status}`);
  return response;
 };
 const db=createConversationRpcAdapter({baseUrl:base,allowedOrigin:parsed.origin,serviceKey,fetchImpl,allowLoopback:true});
 const handler=createOwnedConversationHandler({db,origin,allowLoopback:true});
 const req=(body,s)=>new Request(origin+'/',{method:'POST',headers:{origin,cookie:s.cookie.split(';')[0],'content-type':'application/json'},body:JSON.stringify(body)});
 const created=await handler(req({action:'create',locale:'de',pagePath:'/'},a));
 assert.equal(created.status,201);const {id}=await created.json();
 assert.equal((await handler(req({action:'read',id},a))).status,200);
 assert.equal((await handler(req({action:'read',id},b))).status,404);
 const anon=createConversationRpcAdapter({baseUrl:base,allowedOrigin:parsed.origin,serviceKey:anonKey,fetchImpl,allowLoopback:true});
 await assert.rejects(anon.read(id,a.digest,{signal:new AbortController().signal}),{message:'database_unavailable'});
});
