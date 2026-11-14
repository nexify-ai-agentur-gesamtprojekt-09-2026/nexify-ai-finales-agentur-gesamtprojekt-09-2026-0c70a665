// Grenzen des öffentlichen Workers von apps/web (pwa/worker.js). Läuft ohne Browser: der Worker wird in einer
// nachgestellten Umgebung ausgeführt (Ereignisse, CacheStorage, fetch). Der Browserlauf steht in browser-pwa-offline.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {stampWorker,workerVersion,WORKER_VERSION_MARK} from '../../scripts/generate-public-data.mjs';

const raw=await readFile(new URL('../../pwa/worker.js',import.meta.url),'utf8');
const siteMap=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
const ORIGIN='https://nexify.example';
const html=(locale='de')=>`<!doctype html><html lang="${locale}"><head><link rel="stylesheet" href="/_next/static/chunks/a1.css"/><link rel="preload" href="/fonts/inter-latin.woff2" as="font"/></head><body><img src="/brand/nexify-figur.png"><a href="/kontakt">Kontakt</a><img src="/media/higgsfield/hf-09-800.webp"><script src="/_next/static/chunks/b2.js"></script><script>self.__next_f.push([1,"\\"/_next/static/chunks/c3.js\\" /api/shop/status"])</script></body></html>`;
const reply=(body,{status=200,type='basic',redirected=false,headers={}}={})=>{const response=new Response(body,{status,headers});Object.defineProperties(response,{type:{value:type},redirected:{value:redirected}});return response;};
const assetHeaders={'Cache-Control':'public, max-age=31536000, immutable'};

function setup({version='v1',online=true,routes={},existing={}}={}){
 const events={},pending=[],stores=new Map(Object.entries(existing).map(([name,entries])=>[name,new Map(Object.entries(entries))])),calls=[];
 const caches={
  async open(name){if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {async match(key){const hit=store.get(typeof key==='string'?new URL(key,ORIGIN).pathname+new URL(key,ORIGIN).search:key);return hit?hit.clone():undefined;},async put(key,response){store.set(new URL(key,ORIGIN).pathname+new URL(key,ORIGIN).search,response);}};},
  async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
 };
 const state={online};
 const fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,ORIGIN),key=url.pathname+url.search;calls.push({key,init,method:typeof input==='string'?'GET':input.method});
  if(!state.online)throw new TypeError('offline');
  if(key in routes)return routes[key]();
  if(url.pathname==='/offline')return reply(html(url.searchParams.get('lang')||'de'),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-cache, no-store'}});
  if(/^\/(?:_next\/static|fonts|brand|glass)\//.test(url.pathname))return reply('asset '+key,{headers:assetHeaders});
  return reply('page '+key,{headers:{'Content-Type':'text/html','Cache-Control':'private, no-store'}});
 };
 runInNewContext(raw.replaceAll(WORKER_VERSION_MARK,version),{self:{location:new URL(ORIGIN),addEventListener:(name,callback)=>events[name]=callback},caches,fetch,URL,Response,Promise,Set,Error});
 const lifecycle=async name=>{let pending;events[name]({waitUntil(value){pending=value;}});await pending;};
 const request=(path,{method='GET',mode='navigate',headers={}}={})=>({url:path.startsWith('http')?path:ORIGIN+path,method,mode,headers:new Headers(headers)});
 const dispatch=async(path,options)=>{let answer;events.fetch({request:request(path,options),respondWith(value){answer=value;},waitUntil(value){pending.push(value);}});return answer===undefined?null:await answer;};
 return {events,pending,stores,calls,state,lifecycle,dispatch,names:()=>[...stores.keys()],keys:name=>[...(stores.get(name)||new Map()).keys()].sort()};
}

test('kein Übernehmen offener Sitzungen, kein Push, keine Hintergrund-Synchronisierung, keine Nachrichten',()=>{
 assert.doesNotMatch(raw,/\bskipWaiting\s*\(|\bclients\s*\.\s*claim\s*\(|addEventListener\s*\(\s*['"](?:sync|periodicsync|push|notificationclick|message)['"]|\bimportScripts\s*\(|\bindexedDB\b|\blocalStorage\b|\bcookieStore\b/);
 assert.deepEqual([...raw.matchAll(/addEventListener\s*\(\s*'([a-z]+)'/g)].map(m=>m[1]).sort(),['activate','fetch','install']);
});

test('jeder Build bekommt eigene Cache-Namen',()=>{
 assert.ok(raw.includes(WORKER_VERSION_MARK));
 const a=stampWorker(raw,'commit-a'),b=stampWorker(raw,'commit-b');
 assert.ok(!a.includes(WORKER_VERSION_MARK));assert.notEqual(a,b);assert.equal(workerVersion(raw,'commit-a').length,12);
 assert.throws(()=>stampWorker('ohne Marke','x'),/version mark/);
});

test('Installation speichert nur die deutsche Offline-Seite (ohne Cookies) und deren statische Dateien',async()=>{
 const w=setup();await w.lifecycle('install');
 assert.deepEqual(w.names().sort(),['nexify-public-offline-v1','nexify-public-static-v1']);
 assert.deepEqual(w.keys('nexify-public-offline-v1'),['/offline']);
 assert.deepEqual(w.keys('nexify-public-static-v1'),['/_next/static/chunks/a1.css','/_next/static/chunks/b2.js','/_next/static/chunks/c3.js','/brand/nexify-figur.png','/fonts/inter-latin.woff2']);
 assert.ok(w.calls.every(call=>call.init.credentials==='omit'),'jeder Abruf beim Installieren läuft ohne Cookies');
 assert.ok(!w.calls.some(call=>call.key.startsWith('/api')||call.key.startsWith('/media')||call.key==='/kontakt'));
});

test('weitere Sprachen der Offline-Seite kommen erst bei Nutzung dazu, einmal und ohne Cookies',async()=>{
 const w=setup();await w.lifecycle('install');
 await w.dispatch('/leistungen?lang=nl');await w.dispatch('/kontakt?lang=nl');await w.dispatch('/?lang=xx');await w.dispatch('/teileklar?lang=fr');await w.dispatch('/leistungen?lang=fr',{mode:'cors'});
 await Promise.all(w.pending);
 assert.deepEqual(w.keys('nexify-public-offline-v1'),['/offline','/offline?lang=nl']);
 const extra=w.calls.filter(call=>call.key==='/offline?lang=nl');assert.equal(extra.length,1);assert.equal(extra[0].init.credentials,'omit');
});

test('Installation schlägt fehl statt halb zu speichern',async()=>{
 await assert.rejects(setup({routes:{'/offline':()=>reply('fehler',{status:500})}}).lifecycle('install'));
 await assert.rejects(setup({routes:{'/offline':()=>reply('{}',{headers:{'Content-Type':'application/json'}})}}).lifecycle('install'));
 await assert.rejects(setup({routes:{'/_next/static/chunks/b2.js':()=>reply('fehlt',{status:404})}}).lifecycle('install'));
 await assert.rejects(setup({online:false}).lifecycle('install'));
});

test('API, Webhook, Anmeldung, Konto, Warenkorb, Kasse und Portale beantwortet der Worker nie',async()=>{
 const w=setup();await w.lifecycle('install');const before=w.calls.length;
 const fixed=['/api','/api/shop/status','/api/shop/cart','/api/chat','/api/offers/1/order','/webhook','/webhook/v1','/anmelden','/anmelden/sso-callback','/registrieren','/login','/signup','/passwort-vergessen','/passwort-zuruecksetzen','/portal/kunde','/intern/workspace',
  '/teileklar/warenkorb','/teileklar/kasse','/teileklar/kasse/zahlung','/teileklar/bestellung/42','/teileklar/bestellungen','/teileklar/konto','/teileklar/admin'];
 const protectedPages=siteMap.pages.filter(page=>page.access.visibility!=='public'||page.access.auth_required).map(page=>page.path);
 assert.ok(protectedPages.length>=5);
 for(const path of [...fixed,...protectedPages])for(const mode of ['navigate','cors','same-origin'])assert.equal(await w.dispatch(path,{mode}),null,path+' '+mode);
 // Auch eine statisch aussehende Adresse unter einem geschützten Pfad bleibt außen vor.
 assert.equal(await w.dispatch('/api/_next/static/x.js',{mode:'cors'}),null);
 assert.equal(w.calls.length,before,'kein Netzabruf durch den Worker');
});

test('nichts außer GET, keine fremden Ursprünge, keine Bereichsanfragen, keine Filme, keine Daten',async()=>{
 const w=setup();await w.lifecycle('install');const before=w.calls.length;
 for(const method of ['POST','PUT','PATCH','DELETE','HEAD'])for(const path of ['/kontakt','/','/_next/static/chunks/a1.css','/api/chat'])assert.equal(await w.dispatch(path,{method}),null,method+' '+path);
 assert.equal(await w.dispatch('https://eu.i.posthog.com/e/',{mode:'cors'}),null);
 assert.equal(await w.dispatch('https://other.example/_next/static/x.js',{mode:'no-cors'}),null);
 assert.equal(await w.dispatch('/media/scenes/eingangshalle-20261114.mp4',{mode:'no-cors',headers:{Range:'bytes=0-'}}),null);
 assert.equal(await w.dispatch('/media/scenes/eingangshalle-20261114.mp4',{mode:'no-cors'}),null);
 assert.equal(await w.dispatch('/_next/static/media/film.mp4',{mode:'no-cors',headers:{Range:'bytes=0-'}}),null);
 assert.equal(await w.dispatch('/media/higgsfield/hf-09-800.webp',{mode:'no-cors'}),null);
 assert.equal(await w.dispatch('/leistungen?_rsc=abc',{mode:'cors'}),null,'Seitendaten (RSC) laufen am Worker vorbei');
 assert.equal(await w.dispatch('/manifest.webmanifest',{mode:'cors'}),null);
 assert.equal(await w.dispatch('/public-install-worker.js',{mode:'same-origin'}),null);
 assert.equal(w.calls.length,before);
});

test('Seiten kommen immer aus dem Netz und werden nie gespeichert',async()=>{
 let version=1;const w=setup({routes:{'/leistungen':()=>reply('stand '+version++,{headers:{'Content-Type':'text/html'}}),'/stoerung':()=>reply('serverfehler',{status:500})}});
 await w.lifecycle('install');const stored=()=>w.names().flatMap(name=>w.keys(name));const before=stored();
 assert.equal(await (await w.dispatch('/leistungen')).text(),'stand 1');
 assert.equal(await (await w.dispatch('/leistungen')).text(),'stand 2','zweiter Aufruf geht wieder ins Netz');
 const failure=await w.dispatch('/stoerung');assert.equal(failure.status,500);assert.equal(await failure.text(),'serverfehler','Serverfehler werden nicht durch die Offline-Seite ersetzt');
 assert.deepEqual(stored(),before);
});

test('ohne Netz: Offline-Seite in der genutzten Sprache, sonst Deutsch; mit 503 und ohne Zwischenspeichern',async()=>{
 const w=setup();await w.lifecycle('install');await w.dispatch('/leistungen');await w.dispatch('/?lang=nl');await w.dispatch('/?lang=fr');await Promise.all(w.pending);w.state.online=false;
 for(const [path,locale] of [['/leistungen','de'],['/kontakt?lang=nl','nl'],['/?lang=fr','fr'],['/?lang=en','de'],['/?lang=xx&message=synthetic-sensitive','de']]){
  const response=await w.dispatch(path);const body=await response.text();
  assert.equal(response.status,503);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('content-language'),locale);
  assert.match(body,new RegExp(`<html lang="${locale}">`));assert.doesNotMatch(body,/synthetic-sensitive|page \//);
 }
 await Promise.all(w.pending);assert.deepEqual(w.keys('nexify-public-offline-v1'),['/offline','/offline?lang=fr','/offline?lang=nl'],'offline wird nichts nachgeladen');
});

test('TEILEKLAR bekommt einen eigenen schlichten Hinweis; ohne gespeicherte Seite bleibt ein Rückfall',async()=>{
 const w=setup();await w.lifecycle('install');w.state.online=false;
 const shop=await w.dispatch('/teileklar/shop?lang=fr&q=synthetic-sensitive');const body=await shop.text();
 assert.equal(shop.status,503);assert.match(body,/<p>TEILEKLAR<\/p>/);assert.match(body,/<html lang="de">/);assert.doesNotMatch(body,/NeXify|synthetic-sensitive/);
 assert.match(shop.headers.get('content-security-policy'),/default-src 'none'/);
 const bare=setup({online:false});const fallback=await bare.dispatch('/leistungen');
 assert.equal(fallback.status,503);assert.match(await fallback.text(),/<p>NeXify AI<\/p>/);
});

test('statische Dateien: zuerst aus dem Speicher, sonst Netz und nur unbedenkliche Antworten speichern',async()=>{
 let hits=0;const count=()=>{hits++;return reply('schrift',{headers:assetHeaders});};
 const w=setup({routes:{'/fonts/jakarta-latin.woff2':count,
  '/_next/static/chunks/no-store.js':()=>reply('x',{headers:{'Cache-Control':'no-store'}}),
  '/_next/static/chunks/private.js':()=>reply('x',{headers:{'Cache-Control':'private, max-age=60'}}),
  '/_next/static/chunks/cookie.js':()=>reply('x',{headers:{...assetHeaders,'Set-Cookie':'sid=1'}}),
  '/_next/static/chunks/missing.js':()=>reply('x',{status:404,headers:assetHeaders}),
  '/_next/static/chunks/partial.js':()=>reply('x',{status:206,headers:assetHeaders}),
  '/_next/static/chunks/moved.js':()=>reply('x',{redirected:true,headers:assetHeaders}),
  '/_next/static/chunks/opaque.js':()=>reply('x',{type:'opaque',headers:assetHeaders})}});
 for(let i=0;i<3;i++)assert.equal(await (await w.dispatch('/fonts/jakarta-latin.woff2',{mode:'cors'})).text(),'schrift');
 assert.equal(hits,1,'nach dem ersten Abruf kommt die Datei aus dem Speicher');
 for(const name of ['no-store','private','cookie','missing','partial','moved','opaque'])await w.dispatch(`/_next/static/chunks/${name}.js`,{mode:'no-cors'});
 assert.deepEqual(w.keys('nexify-public-static-v1'),['/fonts/jakarta-latin.woff2']);
 for(const path of ['/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-icon.png','/favicon.ico','/glass/linse.svg','/brand/nexify-figur.png'])assert.ok(await w.dispatch(path,{mode:'no-cors'}),path);
 for(const path of ['/portrait.png','/robots.txt','/sitemap.xml','/archiv/x.pdf'])assert.equal(await w.dispatch(path,{mode:'no-cors'}),null,path);
});

test('neue Version räumt beim Aktivieren nur die eigenen alten Caches ab',async()=>{
 const old={'nexify-public-static-v0':{'/_next/static/chunks/alt.js':reply('alt')},'nexify-public-offline-v0':{'/offline':reply('alt')},'fremd-cache':{'/x':reply('x')},'nexify-chat':{'/y':reply('y')}};
 const w=setup({version:'v1',existing:old});await w.lifecycle('install');
 assert.ok(w.names().includes('nexify-public-static-v0'),'bis zur Aktivierung bleibt der alte Stand nutzbar');
 await w.lifecycle('activate');
 assert.deepEqual(w.names().sort(),['fremd-cache','nexify-chat','nexify-public-offline-v1','nexify-public-static-v1']);
});
