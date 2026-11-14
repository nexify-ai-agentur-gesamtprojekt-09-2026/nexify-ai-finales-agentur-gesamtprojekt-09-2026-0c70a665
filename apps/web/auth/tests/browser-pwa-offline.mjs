#!/usr/bin/env node
// Browserprüfung des öffentlichen Workers von apps/web (pwa/worker.js) gegen einen laufenden Produktions-Build
// mit NEXIFY_PUBLIC_INSTALLATION=public-pwa. Nur lesend; emuliertes Gerät (Chromium), kein echtes Telefon.
// Aufruf: node apps/web/auth/tests/browser-pwa-offline.mjs [http://localhost:3341]
// Belegt: Registrierung und Installierbarkeit, Offline-Seite statt Browserfehler, keine API-/Kassen-/Film-Antwort
// aus dem Speicher, Seiten nie aus dem Speicher, und der Versionswechsel (alter Worker bleibt bis zum Schließen,
// danach sind die alten Caches weg). Der Versionswechsel läuft über einen kleinen Durchreich-Server in diesem Test,
// der nur die Versionszeile der Worker-Datei austauscht.
import {createServer,request as httpRequest} from 'node:http';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{playwright=createRequire('/opt/node-tools/node_modules/')('playwright');}
const {chromium,devices}=playwright;
const upstream=new URL((process.argv[2]||'http://localhost:3341').replace(/\/$/,''));
const WORKER='/public-install-worker.js',PREFIX='nexify-public-';
let nextVersion=null;const seen=[];
const server=createServer((req,res)=>{
 seen.push(req.method+' '+req.url);
 const forward=httpRequest({hostname:upstream.hostname,port:upstream.port,path:req.url,method:req.method,headers:{...req.headers,host:upstream.host}},reply=>{
  if(req.url===WORKER&&nextVersion){const parts=[];reply.on('data',part=>parts.push(part));reply.on('end',()=>{
   const body=Buffer.concat(parts).toString('utf8').replace(/const VERSION = '[^']+'/,`const VERSION = '${nextVersion}'`);
   const headers={...reply.headers};delete headers['content-length'];delete headers['content-encoding'];res.writeHead(reply.statusCode,headers);res.end(body);});return;}
  res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
 });
 forward.on('error',()=>{res.writeHead(502);res.end();});req.pipe(forward);
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const report={base:upstream.origin,geraet:'Pixel 7 (emuliert, Chromium)',checks:[]};
const ok=text=>report.checks.push(text);
const browser=await chromium.launch({args:['--no-sandbox']});
const watchdog=setTimeout(()=>{console.error('Zeitüberschreitung nach 240 s; erreichte Schritte: '+JSON.stringify(report.checks));process.exit(2);},240000);watchdog.unref();
const context=await browser.newContext({...devices['Pixel 7']});
const cacheState=page=>page.evaluate(async prefix=>{const out={};for(const key of await caches.keys()){const cache=await caches.open(key);out[key]=(await cache.keys()).map(r=>{const u=new URL(r.url);return u.pathname+u.search;});}return {keys:Object.keys(out),own:Object.keys(out).filter(k=>k.startsWith(prefix)),entries:out};},PREFIX);
try{
 let page=await context.newPage();
 await page.goto(origin+'/',{waitUntil:'load'});
 assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/manifest.webmanifest');
 const scriptURL=await page.evaluate(async()=>(await navigator.serviceWorker.ready).active.scriptURL);
 assert.equal(new URL(scriptURL).pathname,WORKER);ok('Worker registriert und aktiv');
 // Kein clients.claim: die erste Seite bleibt unkontrolliert, erst das nächste Laden nutzt den Worker.
 assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller),null);ok('erste Seite wird nicht übernommen (kein clients.claim)');
 await page.reload({waitUntil:'load'});await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const cdp=await context.newCDPSession(page);
 const manifest=await cdp.send('Page.getAppManifest');assert.deepEqual(manifest.errors,[]);
 const parsed=JSON.parse(manifest.data);
 for(const field of ['id','name','short_name','start_url','scope','display','lang','dir','background_color','theme_color'])assert.ok(parsed[field],'Manifest-Feld '+field);
 assert.ok(parsed.icons.some(i=>i.sizes==='192x192')&&parsed.icons.some(i=>i.sizes==='512x512'&&i.purpose==='any')&&parsed.icons.some(i=>i.purpose==='maskable'));
 for(const icon of parsed.icons)assert.equal((await context.request.get(origin+icon.src)).status(),200,icon.src);
 for(const shortcut of parsed.shortcuts)assert.equal((await context.request.get(origin+shortcut.url)).status(),200,shortcut.url);
 const installability=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[]);
 ok('Manifest vollständig, Icons und Kurzwege erreichbar, Chromium meldet keine Installationshindernisse');
 report.manifest=parsed;

 // Besuchte Seiten und sensible Wege online aufrufen, dann den Speicher ansehen.
 assert.equal((await page.goto(origin+'/leistungen',{waitUntil:'load'})).status(),200);
 const liveTitle=await page.locator('h1').first().innerText();
 const apiOnline=await page.evaluate(async()=>{const r=await fetch('/api/shop/status');return r.status;});
 await page.evaluate(async()=>{try{await fetch('/api/shop/cart',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});}catch{}});
 await page.goto(origin+'/teileklar/kasse',{waitUntil:'load'});await page.goto(origin+'/anmelden',{waitUntil:'load'});await page.goto(origin+'/',{waitUntil:'load'});
 // Genutzte Sprachen: deren Offline-Seite wird nachgeladen. Englisch wird hier nicht besucht.
 await page.goto(origin+'/?lang=nl',{waitUntil:'load'});await page.goto(origin+'/kontakt?lang=fr',{waitUntil:'load'});await page.goto(origin+'/',{waitUntil:'load'});
 await page.waitForTimeout(1500);
 const before=await cacheState(page);
 assert.equal(before.own.length,2);assert.equal(before.keys.length,2);
 const offlineKey=before.own.find(k=>k.includes('offline-')),staticKey=before.own.find(k=>k.includes('static-'));
 assert.deepEqual(before.entries[offlineKey].sort(),['/offline','/offline?lang=fr','/offline?lang=nl']);
 const allowed=/^\/(?:_next\/static\/|fonts\/|brand\/|glass\/)|^\/(?:icon-192|icon-512|icon-maskable-512|apple-icon|icon)\.png$|^\/favicon\.ico$/;
 const foreign=before.entries[staticKey].filter(path=>!allowed.test(path.split('?')[0]));
 assert.deepEqual(foreign,[]);assert.ok(before.entries[staticKey].length>10);
 const everything=Object.values(before.entries).flat();
 for(const never of ['/api','/webhook','/teileklar/kasse','/teileklar/warenkorb','/anmelden','/leistungen','/media/','.mp4'])assert.ok(!everything.some(path=>path.startsWith(never)||path.includes(never)&&never.startsWith('.')),'nie im Speicher: '+never);
 assert.ok(!everything.some(path=>path==='/'||path.startsWith('/?')));
 ok(`Speicher: Offline-Seite in den genutzten Sprachen (de, nl, fr) und ${before.entries[staticKey].length} statische Dateien; keine API-, Kassen-, Anmelde-, Film- oder Seitenantwort`);
 report.apiOnlineStatus=apiOnline;report.staticCount=before.entries[staticKey].length;

 await context.setOffline(true);
 // Zuvor besuchte Seite: Offline-Seite statt Browserfehler, und nicht der alte Seiteninhalt.
 for(const [path,title,lang] of [['/leistungen','Keine Verbindung','de'],['/leistungen?lang=nl','Geen verbinding','nl'],['/kontakt?lang=fr','Pas de connexion','fr'],['/?lang=en','Keine Verbindung','de'],['/','Keine Verbindung','de']]){
  const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),503,path);assert.ok(response.fromServiceWorker());
  await page.locator('[data-testid=offline-page]').waitFor({timeout:10000});
  assert.equal((await page.locator('[data-testid=offline-title]').innerText()).trim(),title);
  assert.equal(await page.evaluate(()=>document.documentElement.lang),lang);
  assert.ok(!(await page.locator('main').innerText()).includes(liveTitle),'kein veralteter Seiteninhalt');
 }
 // Gestaltet (Stil und Schrift aus dem Speicher) und bedienbar.
 await page.goto(origin+'/leistungen',{waitUntil:'load'}).catch(()=>{});
 const look=await page.evaluate(async()=>{await document.fonts.ready;const h=document.querySelector('[data-testid=offline-title]'),b=document.querySelector('[data-testid=offline-retry]').getBoundingClientRect(),l=document.querySelector('[data-testid=offline-home]').getBoundingClientRect();return {hero:!!h.closest('.identity-hero'),sheets:[...document.styleSheets].filter(s=>{try{return s.cssRules.length>0;}catch{return false;}}).length,fontsLoaded:[...document.fonts].filter(f=>f.status==='loaded').length,retry:[Math.round(b.width),Math.round(b.height)],home:[Math.round(l.width),Math.round(l.height)],overflow:document.documentElement.scrollWidth-innerWidth,header:!!document.querySelector('.site-header')};});
 assert.ok(look.hero&&look.sheets>0&&look.header);assert.ok(look.retry[1]>=44&&look.home[1]>=44);assert.ok(look.overflow<=1);
 report.offlineSeite=look;ok('Offline-Seite offline gestaltet aufgebaut (HeroStage, Stil aus dem Speicher), Ziele mindestens 44 px, kein Querüberlauf');
 // API, Schreibanfrage, Film: nie aus dem Speicher.
 const offlineFetch=await page.evaluate(async()=>{const out={};for(const [name,url,init] of [['api','/api/shop/status',{}],['post','/api/shop/cart',{method:'POST',body:'{}'}],['film','/media/scenes/eingangshalle-20261114.mp4',{}]]){try{const r=await fetch(url,init);out[name]='antwort '+r.status;}catch{out[name]='netzfehler';}}return out;});
 assert.deepEqual(offlineFetch,{api:'netzfehler',post:'netzfehler',film:'netzfehler'});ok('offline: /api/shop/status, POST und Film enden als Netzfehler, nichts kommt aus dem Speicher');
 // Kasse, Warenkorb, Anmeldung: der Worker antwortet nicht; der Browser meldet selbst die fehlende Verbindung.
 for(const path of ['/teileklar/kasse','/teileklar/warenkorb','/anmelden']){let failure=null,response=null;try{response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});}catch(error){failure=String(error.message||error);}
  assert.equal(response,null,path+' darf offline nicht beantwortet werden');assert.match(failure||'',/ERR_INTERNET_DISCONNECTED|ERR_FAILED/);}
 ok('offline: Kasse, Warenkorb und Anmeldung werden vom Worker nicht beantwortet (Browserfehler statt Speicher)');
 await context.setOffline(false);
 const back=await page.goto(origin+'/leistungen',{waitUntil:'load'});assert.equal(back.status(),200);assert.equal(await page.locator('[data-testid=offline-page]').count(),0);
 assert.equal((await page.locator('h1').first().innerText()),liveTitle);ok('wieder online: die echte Seite kommt aus dem Netz');

 // Versionswechsel: neue Worker-Datei, alter Worker bleibt, solange ein Fenster offen ist.
 const requestsBefore=seen.filter(line=>line.startsWith('GET /leistungen')).length;
 await page.reload({waitUntil:'load'});assert.ok(seen.filter(line=>line.startsWith('GET /leistungen')).length>requestsBefore,'Seite kommt bei jedem Laden aus dem Netz');
 nextVersion='pruefversion2';
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 const waitingWorker=()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 for(let attempt=0;attempt<60&&!(await waitingWorker());attempt++)await page.waitForTimeout(500);
 assert.ok(await waitingWorker(),'neue Version installiert und wartet');
 const waiting=await cacheState(page);
 assert.ok(waiting.keys.includes(offlineKey)&&waiting.keys.includes(staticKey),'alte Caches bleiben, solange der alte Worker arbeitet');
 assert.equal(await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return r.active===navigator.serviceWorker.controller||r.active.scriptURL===navigator.serviceWorker.controller.scriptURL;}),true);
 assert.equal((await page.goto(origin+'/kontakt',{waitUntil:'load'})).status(),200);
 assert.ok(await waitingWorker(),'neuer Worker wartet auch nach einem Seitenwechsel');
 assert.ok((await cacheState(page)).keys.includes(staticKey));
 ok('neue Version wartet; die offene Sitzung behält den alten Worker und seine Caches (kein skipWaiting)');
 await page.close();
 page=await context.newPage();
 let after=null;
 for(let attempt=0;attempt<30;attempt++){await page.goto(origin+'/',{waitUntil:'load'});after=await cacheState(page);if(!after.keys.includes(offlineKey)&&!after.keys.includes(staticKey)&&after.own.length===2)break;await page.close();await new Promise(r=>setTimeout(r,500));page=await context.newPage();}
 assert.deepEqual(after.own.sort(),[PREFIX+'offline-pruefversion2',PREFIX+'static-pruefversion2']);assert.equal(after.keys.length,2);
 ok('nach dem Schließen aller Fenster: neuer Worker aktiv, alte Caches entfernt');
 report.cachesVorher=before.own;report.cachesNachher=after.own;
 report.ergebnis='bestanden';
}catch(error){report.ergebnis='fehlgeschlagen';report.fehler=String(error&&error.stack||error);process.exitCode=1;}
finally{await browser.close();server.close();}
console.log(JSON.stringify(report,null,1));
