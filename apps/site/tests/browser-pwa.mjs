// Test the built explicit-mode artifact, real browser ServiceWorker; local only.
import {createServer} from 'node:http';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,extname,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.local/pwa-dist'),sourceRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');let mutations=0;let privateReads=0;let workerRevision=1;
const sourcePaths=['apps/site/pwa/worker.js','apps/site/pwa/plugin.mjs','apps/site/src/public-installation.mjs','apps/site/tests/browser-pwa.mjs','apps/site/tests/pwa-offline-worker.test.mjs','apps/site/tests/public-installation.test.mjs','apps/site/index.html','apps/site/vite.config.ts','packages/tokens/tokens.json','apps/web/public/icon-192.png','apps/web/public/icon-512.png','apps/web/public/icon-maskable-512.png'];
const digest=async(root,paths)=>Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(resolve(root,path))).digest('hex')])));
const sourceBefore=await digest(sourceRoot,sourcePaths);
assert.equal(await readFile(resolve(root,'public-install-worker.js'),'utf8'),await readFile(resolve(sourceRoot,'apps/site/pwa/worker.js'),'utf8'),'built worker must match source');
const buildPaths=['index.html','manifest.webmanifest','public-install-worker.js','icon-192.png','icon-512.png','icon-maskable-512.png',...(await readdir(resolve(root,'assets'))).sort().map(file=>'assets/'+file)];
const buildBefore=await digest(root,buildPaths);
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){if(req.method!=='GET')mutations++;else privateReads++;res.writeHead(403,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"synthetic_private_denied"}');return;}
 if(path==='/unavailable-page'){res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('real-server-error');return;}
 try{let file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))file=resolve(root,'index.html');let data;try{data=await readFile(file);}catch{file=resolve(root,'index.html');data=await readFile(file);}if(path==='/public-install-worker.js')data=Buffer.concat([data,Buffer.from(`\n/* test revision ${workerRevision} */\n`)]);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(500);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext();const external=[];await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});const report={scope:'explicit public-pwa local build; bounded source and artifact hashes; neutral offline notice only; no OS install or production acceptance',observed_at:new Date().toISOString(),node_version:process.version,browser_version:browser.version(),source_sha256:sourceBefore,artifact_sha256:buildBefore,offline_cases:[],checks:[]};
try{
 const page=await context.newPage();await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/manifest.webmanifest');
 const cdp=await context.newCDPSession(page);const manifest=await cdp.send('Page.getAppManifest');assert.deepEqual(manifest.errors,[]);const parsed=JSON.parse(manifest.data);assert.equal(parsed.name,'NeXify AI');assert.equal(parsed.scope,'/');report.manifest=parsed;
 const installability=await cdp.send('Page.getInstallabilityErrors');assert.deepEqual(installability.installabilityErrors,[]);report.checks.push('Chromium reports no installability errors for localhost build');
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/private');return r.status;}),403);
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/synthetic-write',{method:'POST',body:'fixture'});return r.status;}),403);assert.equal(mutations,1);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.checks.push('real registration and controller','manifest parsed without browser errors','synthetic API rejection not cached','one online POST only');
 const failedNavigation=await page.goto(origin+'/unavailable-page');assert.equal(failedNavigation.status(),503);assert.equal(await page.locator('body').innerText(),'real-server-error');await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();report.checks.push('online server errors pass through without replacing their response');
 await context.setOffline(true);
 for(const path of ['/api/private','/api/synthetic-write','/account'])assert.equal(await page.evaluate(async(path)=>{try{await fetch(path,{method:path.includes('write')?'POST':'GET',cache:'no-store'});return false;}catch{return true;}},path),true);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
 for(const [path,language,brand,title,retry] of [
  ['/kontakt?message=synthetic-sensitive','de','NeXify AI','Keine Verbindung','Erneut versuchen'],
  ['/?lang=nl','nl','NeXify AI','Geen verbinding','Opnieuw proberen'],
  ['/?lang=fr','fr','NeXify AI','Pas de connexion','Réessayer'],
  ['/?lang=en','en','NeXify AI','No connection','Try again'],
  ['/teileklar/werkstatt?lang=nl&message=synthetic-sensitive','de','TEILEKLAR','Keine Verbindung','Erneut versuchen'],
  ['/teileklarish?lang=en','en','NeXify AI','No connection','Try again'],
  ['/?lang=__proto__&message=synthetic-sensitive','de','NeXify AI','Keine Verbindung','Erneut versuchen']
 ]){const response=await page.goto(origin+path,{timeout:10000});assert.equal(response.status(),503);assert.equal(response.headers()['content-language'],language);assert.match(response.headers()['cache-control'],/no-store/);assert.match(response.headers()['content-security-policy'],/default-src 'none'/);assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.locator('main>p').first().innerText(),brand);assert.equal(await page.locator('h1').innerText(),title);assert.equal(await page.locator('a').innerText(),retry);assert.ok((await page.locator('a').boundingBox()).height>=44);assert.equal(await page.locator('input,textarea').count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/synthetic-sensitive|__proto__/);report.offline_cases.push({path,language,brand,status:response.status(),passed:true});}
 report.checks.push('offline private GET and POST fail without retry','offline navigation selects fixed language and brand without echoing request data');
 await page.locator('a').click();assert.equal(await page.locator('h1').innerText(),'Keine Verbindung');
 await context.setOffline(false);await page.locator('a').click();await page.locator('.workspace-shell').waitFor();assert.equal(mutations,1);assert.ok(privateReads>=1);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.checks.push('reconnect restores shell without POST replay','CacheStorage remains empty');
 workerRevision=2;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');await r.update();});await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration('/'))?.waiting,null,{timeout:10000});assert.equal(await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');return r.active===navigator.serviceWorker.controller;}),true);report.checks.push('updated worker waits without taking over active client');
 await page.close();const updated=await context.newPage();await updated.goto(origin+'/');await updated.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration('/');return !!r?.active&&!r.waiting;},null,{timeout:10000});assert.equal(await updated.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');return r.unregister();}),true);
 await updated.close();const fresh=await context.newPage();await fresh.goto(origin+'/manifest.webmanifest');assert.equal(await fresh.evaluate(()=>navigator.serviceWorker.controller),null);assert.equal(await fresh.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);report.checks.push('updated worker activates after clients close','owned registration rollback after client closure');assert.deepEqual(external,[]);assert.deepEqual(await digest(sourceRoot,sourcePaths),sourceBefore,'PWA sources changed during browser test');assert.deepEqual(await digest(root,buildPaths),buildBefore,'PWA build changed during browser test');report.passed=true;
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));await writeFile('evidence/one-app-2026-10-27/pwa-browser.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,mutations,scope:report.scope}));
