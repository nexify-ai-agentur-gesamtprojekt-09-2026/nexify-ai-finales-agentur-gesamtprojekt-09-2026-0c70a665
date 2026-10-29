// Real local Next production output; no provider credentials or real customer data.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const sourcePaths=['apps/web/proxy.ts','apps/web/auth/policy.ts','apps/web/app/api/internal/workspace/status/route.ts','apps/web/app/api/internal/workspace/mail/route.ts','apps/web/app/intern/workspace/page.tsx','apps/web/components/AuthAvailabilityNotice.tsx','apps/web/components/LocaleAwareClerk.tsx','apps/web/auth/public-provider.ts','apps/web/app/layout.tsx','apps/web/app/anmelden/[[...sign-in]]/page.tsx','apps/web/app/registrieren/[[...sign-up]]/page.tsx','apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css','apps/web/components/SiteFooter.tsx','apps/web/auth/tests/browser-public-experience.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')])));const sourceHashes=await hashes();
const data=JSON.parse(await readFile(new URL('../../../site/.generated/public-site.json',import.meta.url),'utf8'));
const map=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
const allocator=createServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
const env={...process.env,NODE_ENV:'production',APP_ENV:'production'};delete env.CLERK_SECRET_KEY;delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'apps/web',env,stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});
const installationOnly=process.env.TEST_PUBLIC_INSTALLATION==='enabled';
const origin=`http://127.0.0.1:${port}`,report={scope:'local Next build;no provider or tenant acceptance',routes:[],private:[],external:0,mutations:0,pageErrors:[],pwa:{},navigation:false,source_sha256:sourceHashes,auth_mobile:[]};
let browser;
try{
 for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==origin){report.external++;return route.abort();}if(!['GET','HEAD'].includes(req.method())){report.mutations++;return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.name));page.on('console',m=>{if(/hydration|hydrated but|did not match|An error occurred in one of your React components/i.test(m.text()))report.pageErrors.push('hydration_or_component_error');});
 if(!installationOnly)for(const locale of ['de','nl'])for(const source of data.pages){
  await page.goto(origin+source.path);await page.locator('#locale').selectOption(locale);
  await page.waitForFunction(l=>document.documentElement.lang===l,locale);
  await page.waitForFunction(t=>document.title===t,source.localizedTitle[locale]+' · NeXify AI');
  assert.equal(await page.locator('.workspace-shell').count(),1);
  assert.equal(await page.locator('.panel-heading h2').innerText(),'AI Fly Oracle');
  assert.equal(await page.locator('.panel-heading .oracle-companion').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('.panel-heading .oracle-companion img').evaluate(i=>i.complete&&i.naturalWidth===512),true);
  assert.equal(await page.locator('main h1').count(),1);assert.equal(await page.locator('head title').count(),1);
  assert.equal(await page.locator('.editorial-module').count(),data.explainers.find(p=>p.page_id===source.id)?.modules.length||0);
  assert.equal(await page.locator('.editorial-guide').count(),1);
  assert.equal(await page.locator('video').count(),0,'pending media must not become playable');
  if(['login','signup'].includes(source.id)){const expected=locale==='de'?(source.id==='login'?'Anmeldung noch nicht verfügbar':'Registrierung noch nicht verfügbar'):(source.id==='login'?'Aanmelden nog niet beschikbaar':'Registreren nog niet beschikbaar');assert.equal(await page.locator('.auth-availability-notice h2').innerText(),expected);}
  if(['tk-search','tk-categories','tk-category','tk-product','tk-cart','tk-checkout'].includes(source.id))assert.equal(await page.locator('.shop-panel').count(),1);
  report.routes.push({path:source.path,locale,passed:true});
 }
 if(!installationOnly)for(const locale of ['de','nl'])for(const path of ['/anmelden','/registrieren']){await page.setViewportSize({width:320,height:900});await page.goto(origin+path);await page.locator('#locale').selectOption(locale);await page.locator('.auth-availability-notice').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const back=page.locator('.auth-availability-notice a');await back.focus();assert.equal(await back.evaluate(a=>a===document.activeElement),true);report.auth_mobile.push({locale,path,width:320,passed:true});}await page.setViewportSize({width:1280,height:900});
 for(const p of map.pages.filter(p=>p.access.visibility!=='public'||p.access.auth_required)){
  const r=await context.request.get(origin+p.path);assert.equal(r.status(),503);assert.equal((await r.json()).error,'authentication_unavailable');report.private.push(p.path);
 }
 await page.goto(origin+'/');await page.locator('.home-area-link[href="/teileklar/werkstatt"]').click();await page.waitForURL(origin+'/teileklar/werkstatt');await page.goBack();await page.waitForURL(origin+'/');await page.goForward();await page.waitForURL(origin+'/teileklar/werkstatt');assert.equal(await page.locator('.workspace-shell').count(),1);report.navigation=true;
 for(const path of ['/manifest.webmanifest','/public-install-worker.js']){const r=await context.request.get(origin+path);assert.equal(r.status(),installationOnly?200:404);report.pwa[path]=r.status();if(installationOnly&&path.endsWith('.js'))assert.equal(await r.text(),await readFile(root+'apps/site/pwa/worker.js','utf8'));}
 assert.equal(await page.locator('link[rel="manifest"]').count(),installationOnly?1:0);
 if(installationOnly){await page.waitForFunction(async()=>navigator.serviceWorker&&(await navigator.serviceWorker.getRegistrations()).length===1);assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.pwa.registered_network_only=true;}
 const internal=await context.request.get(origin+'/api/internal/workspace/status?request_id='+('0'.repeat(64)));assert.equal(internal.status(),503);assert.equal(internal.headers()['cache-control'],'private, no-store');assert.equal((await internal.json()).error,'authentication_unavailable');report.internal_workspace_api_unbound_503=true;
 for(const method of ['GET','POST']){const r=await context.request.fetch(origin+'/api/internal/workspace/mail',{method,...(method==='POST'?{data:{action:'send'}}:{})});assert.equal(r.status(),503);assert.equal(r.headers()['cache-control'],'private, no-store');assert.equal((await r.json()).error,'authentication_unavailable');}report.internal_mail_api_unbound_503=true;
 assert.deepEqual(report.pageErrors,[]);assert.equal(report.external,0);assert.equal(report.mutations,0);
 assert.deepEqual(await hashes(),sourceHashes);report.passed=true;
}finally{
 if(browser)await browser.close();child.kill('SIGTERM');await once(child,'exit');
 await mkdir(root+'.local/next-parity',{recursive:true});await writeFile(root+'.local/next-parity/'+(installationOnly?'browser-next-installation.json':'browser-next.json'),JSON.stringify(report,null,2)+'\n');await writeFile(root+'.local/next-parity/runtime.log',log);
}
console.log(JSON.stringify({routes:report.routes.length,private:report.private.length,passed:report.passed}));
