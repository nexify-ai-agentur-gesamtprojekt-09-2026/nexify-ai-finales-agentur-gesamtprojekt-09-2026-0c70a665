import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../../web/components/shop/api.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function client(response){
 const exports={};
 vm.runInNewContext(js,{exports,Intl,Date,fetch:async()=>response});
 return exports.api;
}
test('HTTP 200 HTML fallback is rejected, never an empty shop result',async()=>{
 await assert.rejects(client(new Response('<!doctype html>',{headers:{'content-type':'text/html'}}))('/api/shop/products'),e=>e.error==='invalid_json_response');
});
test('malformed JSON and primitive JSON cannot become product data',async()=>{
 for(const body of ['{','null','true','"not a catalogue"']){
  await assert.rejects(client(new Response(body,{headers:{'content-type':'application/json'}}))('/api/shop/products'),e=>e.error==='invalid_json_response');
 }
});
test('structured runtime failures retain status and reason',async()=>{
 await assert.rejects(client(Response.json({detail:{error:'runtime_binding_unavailable',reason:'database_namespace_unapproved'}},{status:503}))('/api/shop/products'),e=>e.status===503&&e.error==='runtime_binding_unavailable'&&e.body.reason==='database_namespace_unapproved');
});
test('real JSON successes and bodyless successful writes keep their meaning',async()=>{
 const response={items:[],total:0,page:1,pages:1};
 assert.deepEqual(JSON.parse(JSON.stringify(await client(Response.json(response))('/api/shop/products'))),response);
 assert.equal(await client(new Response(null,{status:204}))('/api/auth/logout'),null);
});
