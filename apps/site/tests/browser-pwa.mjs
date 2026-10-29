// Test the built explicit-mode artifact, real browser ServiceWorker; local only.
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve('.local/pwa-dist');let mutations=0;let privateReads=0;
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path.startsWith('/api/')){if(req.method!=='GET')mutations++;else privateReads++;res.writeHead(403,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"synthetic_private_denied"}');return;}
 try{let file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))file=resolve(root,'index.html');let data;try{data=await readFile(file);}catch{file=resolve(root,'index.html');data=await readFile(file);}res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(500);res.end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext();const external=[];await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){external.push(r.request().url());return r.abort();}return r.continue();});const report={scope:'explicit public-pwa local build; network-only; no OS install or production acceptance',checks:[]};
try{
 const page=await context.newPage();await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 assert.equal(await page.locator('link[rel=manifest]').getAttribute('href'),'/manifest.webmanifest');
 const cdp=await context.newCDPSession(page);const manifest=await cdp.send('Page.getAppManifest');assert.deepEqual(manifest.errors,[]);const parsed=JSON.parse(manifest.data);assert.equal(parsed.name,'NeXify AI');assert.equal(parsed.scope,'/');report.manifest=parsed;
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/private');return r.status;}),403);
 assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/synthetic-write',{method:'POST',body:'fixture'});return r.status;}),403);assert.equal(mutations,1);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.checks.push('real registration and controller','manifest parsed without browser errors','synthetic API rejection not cached','one online POST only');
 await context.setOffline(true);
 for(const path of ['/api/private','/api/synthetic-write','/account'])assert.equal(await page.evaluate(async(path)=>{try{await fetch(path,{method:path.includes('write')?'POST':'GET',cache:'no-store'});return false;}catch{return true;}},path),true);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
 let failed=false;try{await page.reload({timeout:6000});}catch{failed=true;}assert.equal(failed,true);report.checks.push('offline private GET and POST fail without retry','offline navigation unavailable explicitly; no invented offline data');
 await context.setOffline(false);await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();assert.equal(mutations,1);assert.ok(privateReads>=1);
 assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.checks.push('reconnect restores shell without POST replay','CacheStorage remains empty');
 assert.equal(await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');if(!r?.active?.scriptURL.endsWith('/public-install-worker.js'))return false;return r.unregister();}),true);
 await page.close();const fresh=await context.newPage();await fresh.goto(origin+'/manifest.webmanifest');assert.equal(await fresh.evaluate(()=>navigator.serviceWorker.controller),null);assert.equal(await fresh.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);report.checks.push('owned registration rollback after client closure');assert.deepEqual(external,[]);report.passed=true;
}finally{await context.close();await browser.close();await new Promise(r=>server.close(r));await writeFile('evidence/one-app-2026-10-27/pwa-browser.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,mutations,scope:report.scope}));
