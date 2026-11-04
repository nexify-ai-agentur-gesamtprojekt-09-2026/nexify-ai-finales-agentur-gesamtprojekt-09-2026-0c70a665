// Controlled local unavailable states; never sends mail, orders or provider requests.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const shopCopy=JSON.parse(await readFile(new URL('../../../config/shop-interface-copy.json',import.meta.url),'utf8'));
const data=await generate(),root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const cache=await mkdtemp(join(tmpdir(),'nexify-public-fallback-'));
const server=await createServer({root,cacheDir:cache,server:{port:0,hmr:false},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});await server.listen();
const origin='http://127.0.0.1:'+server.httpServer.address().port,browser=await chromium.launch({headless:true});
const sources=['apps/web/components/Workspace.tsx','apps/web/components/DeferredChatBoundary.tsx','apps/web/components/PublicRequestFallback.tsx','apps/web/components/ShopPanel.tsx','apps/site/tests/browser-public-fallbacks.mjs'];
const hash=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hash(),report={scope:'synthetic local failure injection;not PostHog/Sentry or production acceptance',checks:[],source_sha256:before,external:[],uncaught:[],mutations:0,cta_routes:data.pages.filter(p=>p.actions.some(a=>a.type==='chat')).map(p=>p.path)};
try{
 for(const width of [320,390,1280])for(const locale of ['de','nl'])for(const failure of ['unavailable','capabilities','chunk']){
  const context=await browser.newContext({viewport:{width,height:900}});let catalogUnconfigured=false,blocked=0,catalogReads=0,sessionStatus;
  await context.addInitScript(l=>localStorage.setItem('nexify-locale',l),locale);
  await context.route('**/*',route=>{const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin){report.external.push(url.origin);return route.abort();}
   if(failure==='chunk'&&url.pathname.includes('PublicOrientationChat.tsx')){blocked++;return route.abort('failed');}
   if(!['GET','HEAD'].includes(request.method())){report.mutations++;return route.abort();}
   if(url.pathname==='/api/session'){
    sessionStatus=failure==='capabilities'?200:failure==='unavailable'?204:404;
    if(sessionStatus===204)return route.fulfill({status:204,body:''});
    if(sessionStatus===200)return route.fulfill({json:{csrf:'synthetic-local-only',history:[],capabilities:Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,false]))}});
    return route.fulfill({status:404,json:{error:'synthetic_unavailable'}});
   }
   if(url.pathname==='/api/slots')throw new Error('unsupported booking capability must not request slots');
   if(url.pathname==='/api/shop/products')catalogReads++;
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:catalogUnconfigured?503:404,json:{error:catalogUnconfigured?'catalog_not_configured':'synthetic_unavailable'}});
   return route.continue();
  });const page=await context.newPage();page.on('pageerror',e=>report.uncaught.push(e.name));
  try{
   await page.goto(origin+'/kontakt');await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   if(failure==='chunk'){
    await page.locator('.sdk-orientation-view .request-fallback').waitFor({state:'attached'});assert.equal(blocked,1);assert.equal(await page.locator('.workspace-shell').count(),1);
    // Workspace now starts with the assistant panel closed at every width (sessionStorage nx-chat-open), so open it via the launcher by keyboard.
    await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');
    const link=page.locator('.sdk-orientation-view a[href="mailto:mail@nexifyai.cloud"]');await link.focus();assert.equal(await link.evaluate(a=>a===document.activeElement),true);
    await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Enter');await page.locator('.reopen-chat').waitFor();
    await page.locator('#locale').selectOption(locale==='de'?'nl':'de');await page.locator('.reopen-chat').click();
    assert.equal(await page.locator('.sdk-orientation-view .request-fallback button').innerText(),locale==='de'?'Advies opnieuw laden':'Beratung neu laden');
    await page.locator('.panel-heading .icon-button').click();
    await page.evaluate(()=>window.failureShell=document.querySelector('.workspace-shell'));
    const target=page.locator('.site-footer a[href^="/"]').first();const href=await target.getAttribute('href');
    await target.focus();await page.keyboard.press('Enter');await page.waitForURL(origin+href);await page.goBack();await page.waitForURL(origin+'/kontakt');
    assert.equal(await page.evaluate(()=>window.failureShell===document.querySelector('.workspace-shell')),true);
   }else{
    if(failure!=='capabilities')await page.locator('.public-orientation').waitFor({state:'attached'});else await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
    for(const intent of ['booking','quote','marketing']){
     // HomeContent renders fixed links (/kontakt) instead of page.actions; data-driven chat CTAs render via PublicContent on content pages.
     const p=data.pages.find(p=>p.path!=='/'&&p.actions.some(a=>a.type==='chat'&&a.chat_intent===intent));const action=p.actions.find(a=>a.type==='chat'&&a.chat_intent===intent);
     await page.goto(origin+p.path);if(failure!=='capabilities')await page.locator('.public-orientation').waitFor({state:'attached'});else await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
     const actionButton=page.locator('main').getByRole('button',{name:action.label[locale],exact:true}).first();
     await actionButton.click();
     const card=page.locator('.action-card');await card.locator('.request-fallback').waitFor();const link=card.locator('a[href="mailto:mail@nexifyai.cloud"]');await link.focus();assert.equal(await link.evaluate(a=>a===document.activeElement),true);
     assert.equal(await card.locator('form').count(),0);assert.equal(await page.locator('#chat-message').isVisible(),failure==='capabilities');
     assert.doesNotMatch(await card.innerText(),/Beschreibe deinen Terminwunsch im Chat|Beschrijf uw afspraakwens in de chat/);
     await card.locator('.action-card-heading button').click();if(failure!=='capabilities')await page.locator('.conversation > .request-fallback').waitFor();
     await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Enter');await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');if(failure!=='capabilities')assert.equal(await page.locator('.conversation > .request-fallback').isVisible(),true);
    }
    if(width<=820){await page.locator('.panel-heading .icon-button').click();}
    // ShopPanel.tsx is no longer mounted; /teileklar/suche renders shop/PublicShopContent + CatalogView. Both catalogue failures fail closed
    // and stay distinct (D-010): explicit 503 setup answer -> catalog-unconfigured, any other failure -> catalog-error.
    const shop=page.locator('[data-testid="public-shop-search"]');
    for(const unconfigured of [false,true]){
     catalogUnconfigured=unconfigured;const reads=catalogReads;if(unconfigured)await page.reload();else await page.goto(origin+'/teileklar/suche');
     const [testid,key]=unconfigured?['catalog-unconfigured','catalogUnconfigured']:['catalog-error','catalogError'];
     const alert=shop.locator('[data-testid="'+testid+'"]');await alert.waitFor();assert.equal(await alert.innerText(),shopCopy[locale][key]);assert.ok(catalogReads>reads);
     assert.equal(await shop.locator(unconfigured?'[data-testid="catalog-error"]':'[data-testid="catalog-unconfigured"]').count(),0);
     assert.equal(await shop.locator('[data-testid="catalog-results"], .tk-grid, [data-testid="catalog-empty"]').count(),0);
     // Connection failure offers exactly one retry action; a missing setup offers none (workshop link instead).
     assert.deepEqual(await shop.locator('button').evaluateAll(b=>b.map(x=>x.dataset.testid)),unconfigured?['shop-search-submit']:['shop-search-submit','catalog-retry']);
     if(unconfigured)assert.equal(await shop.locator('[data-testid="catalog-unconfigured-workshop"]').getAttribute('href'),'/teileklar/werkstatt');
     assert.doesNotMatch(await shop.innerText(),/Warenkorb|winkelwagen|Beispielartikel|voorbeeldartikel/i);
    }
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   assert.equal(sessionStatus,failure==='capabilities'?200:failure==='unavailable'?204:404);
   report.checks.push({width,locale,failure,session_status:sessionStatus,passed:true});
  }finally{await context.close();}
 }
 assert.deepEqual(report.external,[]);assert.deepEqual(report.uncaught,[]);assert.equal(report.mutations,0);assert.deepEqual(await hash(),before);report.passed=true;
}finally{await browser.close();await server.close();await rm(cache,{recursive:true,force:true});await mkdir(repo+'.local/frontend-reliability',{recursive:true});await writeFile(repo+'.local/frontend-reliability/public-fallbacks.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,cta_routes:report.cta_routes.length,passed:report.passed}));
