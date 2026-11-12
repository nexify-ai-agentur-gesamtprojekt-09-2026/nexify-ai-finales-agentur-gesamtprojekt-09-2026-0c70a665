import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('../pwa/worker.js',import.meta.url),'utf8');
function worker(origin,{online=false}={}){
 const events={};
 const scope={location:new URL(origin),addEventListener:(name,callback)=>events[name]=callback};
 runInNewContext(source,{self:scope,URL,Response,fetch:async()=>{if(online)return new Response('provider-response',{status:503});throw new TypeError('offline');}});
 return async(url,overrides={})=>{
  let response;events.fetch({request:{url,method:'GET',mode:'navigate',...overrides},respondWith(value){response=value;}});
  return response?await response:null;
 };
}

test('TEILEKLAR subdomains show fixed German brand copy without reflecting request data',async()=>{
 const fetch=worker('https://werkstatt.teileklar.shop');
 const response=await fetch('https://werkstatt.teileklar.shop/start?lang=fr&message=synthetic-sensitive');
 const html=await response.text();
 assert.equal(response.status,503);assert.equal(response.headers.get('content-language'),'de');
 assert.match(html,/<html lang="de">/);assert.match(html,/<p>TEILEKLAR<\/p>/);assert.doesNotMatch(html,/synthetic-sensitive|lang=fr/);
});
test('similar hostnames do not become TEILEKLAR and online errors pass through',async()=>{
 const external=worker('https://evilteileklar.shop');const html=await (await external('https://evilteileklar.shop/?lang=en')).text();
 assert.match(html,/<p>NeXify AI<\/p>/);assert.match(html,/<html lang="en">/);
 const online=worker('https://nexify.example',{online:true});const response=await online('https://nexify.example/');assert.equal(response.status,503);assert.equal(await response.text(),'provider-response');
});
test('API, writes, non-navigations and external requests remain outside the worker',async()=>{
 const fetch=worker('https://nexify.example');
 for(const [url,options] of [['https://nexify.example/api',{}],['https://nexify.example/api/private',{}],['https://nexify.example/contact',{method:'POST'}],['https://nexify.example/contact',{mode:'cors'}],['https://other.example/',{}]])assert.equal(await fetch(url,options),null);
});
