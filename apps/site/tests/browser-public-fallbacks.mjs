// Controlled local unavailable states; never sends mail, orders or provider requests.
// Surface: the Next app (apps/web, real production build served by `next start`). Only there the language is URL-driven (`?lang=` → proxy.ts → <Workspace initialLocale>);
// the Vite SPA (apps/site) ignores `?lang=` and `nexify-locale` since 5222298 and cannot render NL. Clerk is gone (DECISIONS D-007).
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer as portServer} from 'node:net';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const data=await generate(),repo=fileURLToPath(new URL('../../../',import.meta.url)),web=repo+'apps/web';
const sources=['apps/web/components/Workspace.tsx','apps/web/components/DeferredChatBoundary.tsx','apps/web/components/PublicRequestFallback.tsx','apps/web/components/ShopPanel.tsx','apps/site/tests/browser-public-fallbacks.mjs'];
const hash=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hash(),report={scope:'synthetic local failure injection (Next production build of apps/web);not PostHog/Sentry or production acceptance',surface:'next-production-build',checks:[],source_sha256:before,external:[],uncaught:[],mutations:0,cta_routes:data.pages.filter(p=>p.actions.some(a=>a.type==='chat')).map(p=>p.path)};
const allocator=portServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
// Isolated env: no inherited credentials, no analytics token; every request leaving the origin is aborted below.
// A production build is used because the Next dev runtime reloads the page when a chunk fails to load, which is not the behaviour under test.
for(const dir of [repo,web])for(const name of ['.env','.env.local','.env.production','.env.production.local']){let exists=true;try{await access(dir+name);}catch(e){if(e.code==='ENOENT')exists=false;else throw e;}assert.equal(exists,false,'dotenv file present: use an isolated checkout; do not read or inherit its secrets');}
const env={PATH:process.env.PATH,LANG:'C.UTF-8',NEXT_TELEMETRY_DISABLED:'1'};
execFileSync(process.execPath,['scripts/generate-public-data.mjs'],{cwd:web,env,stdio:'pipe'});
execFileSync(process.execPath,['node_modules/next/dist/bin/next','build'],{cwd:web,env,stdio:'pipe',maxBuffer:64*1024*1024});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:web,env:{...env,NODE_ENV:'production'},stdio:'ignore',detached:true});
const origin='http://127.0.0.1:'+port;
let browser;
try{
 for(let n=0;n<600;n++){try{if((await fetch(origin+'/robots.txt')).status<500)break;}catch{}if(n===599)throw Error('Next start timeout');await new Promise(resolve=>setTimeout(resolve,200));}
 browser=await chromium.launch({headless:true});
 // Production chunks have hashed names, so the lazily loaded PublicOrientationChat chunk is identified by its content (its only
 // className `public-orientation`), once, before the matrix. That exact chunk is what the "chunk" case aborts.
 const lazyChunks=new Set();
 {const probe=await browser.newContext({viewport:{width:1280,height:900}});await probe.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();if(url.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'synthetic_unavailable'}});return route.continue();});
  const page=await probe.newPage(),bodies=[];page.on('response',response=>{const url=new URL(response.url());if(url.origin===origin&&/^\/_next\/static\/.+\.js$/.test(url.pathname))bodies.push(response.text().then(text=>({path:url.pathname,text})).catch(()=>null));});
  await page.goto(origin+'/kontakt',{timeout:120000});await page.waitForLoadState('networkidle',{timeout:120000}).catch(()=>{});await page.locator('.public-orientation').waitFor({state:'attached'});
  for(const body of await Promise.all(bodies))if(body&&body.text.includes('public-orientation'))lazyChunks.add(body.path);
  await probe.close();}
 assert.ok(lazyChunks.size>=1,'the lazily loaded PublicOrientationChat chunk must be identifiable');
 for(const width of [320,390,1280])for(const locale of ['de','nl'])for(const failure of ['unavailable','capabilities','chunk']){
  process.stderr.write(`case ${width} ${locale} ${failure}\n`);const context=await browser.newContext({viewport:{width,height:900}});let catalogUnconfigured=false,blocked=0,sessionStatus;
  // Language is URL-driven (proxy.ts): German is the default without parameter, the others use ?lang=.
  const query=locale==='de'?'':'?lang='+locale;
  await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin){report.external.push(url.origin);return route.abort();}
   if(failure==='chunk'&&lazyChunks.has(url.pathname)){blocked++;return route.abort('failed');}
   if(!['GET','HEAD'].includes(request.method())){report.mutations++;return route.abort();}
   if(url.pathname==='/api/session'){
    sessionStatus=failure==='capabilities'?200:failure==='unavailable'?204:404;
    if(sessionStatus===204)return route.fulfill({status:204,body:''});
    if(sessionStatus===200)return route.fulfill({json:{csrf:'synthetic-local-only',history:[],capabilities:Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,false]))}});
    return route.fulfill({status:404,json:{error:'synthetic_unavailable'}});
   }
   if(url.pathname==='/api/slots')throw new Error('unsupported booking capability must not request slots');
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:catalogUnconfigured?503:404,json:{error:catalogUnconfigured?'catalog_not_configured':'synthetic_unavailable'}});
   return route.continue();
  });const page=await context.newPage();page.on('pageerror',e=>report.uncaught.push(e.name));
  try{
   await page.goto(origin+'/kontakt'+query,{timeout:120000});await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   if(failure==='chunk'){
    await page.locator('.sdk-orientation-view .request-fallback').waitFor({state:'attached'});// The Next chunk runtime asks for the failed script once more (observed: exactly two GETs); a retry storm would still fail here.
    assert.ok(blocked>=1&&blocked<=3,'blocked chunk requests: '+blocked);assert.equal(await page.locator('.workspace-shell').count(),1);
    // The assistant panel starts closed at every width now (it used to be open on desktop): open it with the keyboard, then it must be visible.
    await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');await page.locator('#aifly-panel').waitFor({state:'visible'});
    const link=page.locator('.sdk-orientation-view a[href="mailto:mail@nexifyai.cloud"]');await link.focus();assert.equal(await link.evaluate(a=>a===document.activeElement),true);
    await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Enter');await page.locator('.reopen-chat').waitFor();
    // The language switch is a full navigation to `?lang=` (Workspace.tsx); the failed chunk must degrade the same way in the other language.
    const other=locale==='de'?'nl':'de',otherQuery=other==='de'?'':'?lang='+other;
    await Promise.all([page.waitForURL(origin+'/kontakt'+otherQuery),page.locator('#locale').selectOption(other)]);
    await page.waitForFunction(l=>document.documentElement.lang===l,other);await page.locator('.reopen-chat').waitFor();await page.locator('.reopen-chat').click();
    assert.equal(await page.locator('.sdk-orientation-view .request-fallback button').innerText(),other==='nl'?'Advies opnieuw laden':'Beratung neu laden');
    await page.locator('.panel-heading .icon-button').click();
    await page.evaluate(()=>window.failureShell=document.querySelector('.workspace-shell'));
    // The first footer link is the current page itself (same-URL navigation adds no history entry), so take the first link to another page.
    const target=page.locator('.site-footer a[href^="/"]:not([href^="/kontakt"])').first();const href=await target.getAttribute('href');
    await target.focus();await page.keyboard.press('Enter');await page.waitForURL(origin+href);await page.goBack();await page.waitForURL(origin+'/kontakt'+otherQuery);
    assert.equal(await page.evaluate(()=>window.failureShell===document.querySelector('.workspace-shell')),true);
   }else{
    if(failure!=='capabilities')await page.locator('.public-orientation').waitFor({state:'attached'});else await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
    for(const intent of ['booking','quote','marketing']){
     // The home page keeps its own finish links (HomeContent.tsx) and no longer renders the chat actions that site-map still lists for "/";
     // the buttons live in PublicContent.tsx, so take the first page that actually renders them.
     const p=data.pages.find(p=>p.path!=='/'&&p.actions.some(a=>a.type==='chat'&&a.chat_intent===intent));const action=p.actions.find(a=>a.type==='chat'&&a.chat_intent===intent);
     await page.goto(origin+p.path+query);if(failure!=='capabilities')await page.locator('.public-orientation').waitFor({state:'attached'});else await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
     const actionButton=page.locator('main').getByRole('button',{name:action.label[locale],exact:true}).first();
     await actionButton.click();
     const card=page.locator('.action-card');await card.locator('.request-fallback').waitFor();const link=card.locator('a[href="mailto:mail@nexifyai.cloud"]');await link.focus();assert.equal(await link.evaluate(a=>a===document.activeElement),true);
     assert.equal(await card.locator('form').count(),0);assert.equal(await page.locator('#chat-message').isVisible(),failure==='capabilities');
     assert.doesNotMatch(await card.innerText(),/Beschreibe deinen Terminwunsch im Chat|Beschrijf uw afspraakwens in de chat/);
     await card.locator('.action-card-heading button').click();if(failure!=='capabilities')await page.locator('.conversation > .request-fallback').waitFor();
     await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Enter');await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');if(failure!=='capabilities')assert.equal(await page.locator('.conversation > .request-fallback').isVisible(),true);
    }
    if(await page.locator('#aifly-panel').isVisible())await page.locator('.panel-heading .icon-button').click();
    // TEILEKLAR is a German-only market: the document language stays "de" even with ?lang=nl (proxy.ts, WCAG 3.1.1).
    // The former ShopPanel is orphaned; the catalogue is now shop/CatalogView, which shows an alert and never invents products when the API is down.
    await page.goto(origin+'/teileklar/suche'+query);const shop=page.locator('main');await shop.locator('h1').waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.lang),'de');
    assert.equal(await shop.locator('h1').innerText(),'Teile suchen');assert.doesNotMatch(await shop.innerText(),/Dein Warenkorb|Je winkelwagen/);
    await shop.locator('[data-testid="catalog-error"]').waitFor();assert.equal(await shop.locator('[data-testid="catalog-results"]').count(),0);assert.equal(await shop.locator('.tk-grid li').count(),0);
    catalogUnconfigured=true;await page.reload();await shop.locator('[data-testid="catalog-error"]').waitFor();
    assert.equal(await shop.locator('[data-testid="catalog-results"]').count(),0);assert.equal(await shop.locator('.tk-grid li').count(),0);assert.equal(await shop.locator('[data-testid="catalog-source-status"]').count(),0);
    assert.equal(await shop.locator('[data-testid^="product-"],[data-testid="add-to-cart"]').count(),0);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.equal(sessionStatus,failure==='capabilities'?200:failure==='unavailable'?204:404);
   report.checks.push({width,locale,failure,session_status:sessionStatus,passed:true});
  }finally{await context.close();}
 }
 assert.deepEqual(report.external,[]);assert.deepEqual(report.uncaught,[]);assert.equal(report.mutations,0);assert.deepEqual(await hash(),before);report.passed=true;
}finally{await browser?.close();// `next start` may fork the real server: stop the whole process group, otherwise it outlives the script and holds the dev lock.
if(child.exitCode===null){try{process.kill(-child.pid,'SIGTERM');}catch{}await once(child,'exit');}await mkdir(repo+'.local/frontend-reliability',{recursive:true});await writeFile(repo+'.local/frontend-reliability/public-fallbacks.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,cta_routes:report.cta_routes.length,passed:report.passed}));
