// Fresh local critical browser evidence. Real deterministic SDK SSE, no provider.
// Run under Node22 with PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSERS_PATH configured.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer as httpServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createServer} from 'vite';
import handler from '../../../api/agent-chat.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=new URL('../../../',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const sourcePaths=['apps/web/components/HomeContent.tsx','apps/web/components/Workspace.tsx','apps/web/components/PublicContentLayout.css','config/site-map.json'];
const sdkPaths=['apps/web/components/PublicOrientationChat.tsx','apps/web/components/PublicOrientationChat.css','api/agent-chat.ts','packages/agent-runtime/public-orientation.ts','tools/agent-preview.mjs'];
async function hashes(paths){return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(new URL(p,repo))).digest('hex')])));}
const auxiliaryPaths=['apps/site/src/main.tsx','apps/web/components/WorkspaceRebuild.css','apps/web/components/HomeRebuild.css','packages/tokens/tokens.css','apps/site/tests/browser-critical.mjs'];
const before=await hashes([...sourcePaths,...sdkPaths,...auxiliaryPaths]);
const map=JSON.parse(await readFile(new URL('config/site-map.json',repo),'utf8'));
const pages=map.pages.filter(p=>map.public_allowlist.includes(p.id)&&p.access.visibility==='public'&&!p.access.auth_required);
const observedRequests=[];let origin;
// Isolated equivalent Web Request adapter; imports the exact handler, never status/provider code.
const backend=httpServer(async(req,res)=>{try{
 const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
 const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});
 const response=await handler.fetch(request);observedRequests.push({path:req.url,status:response.status});res.writeHead(response.status,Object.fromEntries(response.headers));
 if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
}catch{res.writeHead(500);res.end();}});
await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
const server=await createServer({root,server:{port:0,strictPort:false,proxy:{'/api/agent-chat':{target:`http://127.0.0.1:${backend.address().port}`,changeOrigin:false}}},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const checks=[],sdkChecks=[],gutters=[],presenters=[],external=[];
async function context(viewport={width:1920,height:1080}){const c=await browser.newContext({viewport,reducedMotion:'reduce'});await c.route('**/*',r=>{const u=new URL(r.request().url());if(![origin,'null'].includes(u.origin)&&u.protocol!=='data:'){external.push(u.origin);return r.abort();}if(u.pathname==='/api/session')return r.fulfill({status:404,json:{error:'synthetic_no_visitor_session'}});if(u.pathname==='/api/agent-runtime-status')return r.fulfill({status:503,json:{error:'synthetic_runtime_not_connected'}});if(u.pathname.startsWith('/api/')&&u.pathname!=='/api/agent-chat')return r.fulfill({status:403,json:{error:'not_authorized_in_test'}});return r.continue();});return c;}
async function check(name,fn,sdk=false){await fn();(sdk?sdkChecks:checks).push(name);console.log('PASS '+name);}
async function navigate(page,path){await page.goto(origin+path);await page.locator('#locale').waitFor();await page.locator('main h1').first().waitFor();}
try{
 const c=await context(),page=await c.newPage();
 await check('nex2fly_product_copy_all_locales_and_section_focus_preserves_route',async()=>{
  await navigate(page,'/produkte/nex2fly');const source=pages.find(p=>p.id==='nex2fly');
  for(const locale of ['de','nl','fr']){
   await page.locator('#locale').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   assert.equal(await page.locator('main h1').innerText(),source.title[locale]);
   const body=await page.locator('main').innerText();for(const section of source.sections)assert.ok(body.includes(section.body[locale]),locale+' '+section.id);
   const prior=page.url();await page.locator('.content-section-nav button').last().click();assert.equal(page.url(),prior);
   assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('content-section')));
  }
 });
 await check('native_product_menu_and_direct_legal_footer_links',async()=>{
  await navigate(page,'/');await page.locator('.product-navigation summary').click();assert.ok(await page.locator('.product-navigation').evaluate(n=>n.open));
  const link=page.locator('.product-navigation-menu a[href="/produkte/nex2fly"]');await link.click();assert.equal(new URL(page.url()).pathname,'/produkte/nex2fly');
  for(const path of ['/impressum','/datenschutz','/vertragsgrundlagen']){const legal=page.locator('.site-footer a[href="'+path+'"]').first();await legal.click();assert.equal(new URL(page.url()).pathname,path);await page.locator('main h1').waitFor();}
 });
 await check('uncropped_presenter_contain_and_no_overflow_across_five_desktop_sizes',async()=>{
  for(const width of [1024,1280,1440,1600,1920]){await page.setViewportSize({width,height:1080});await navigate(page,'/');await page.locator('.home-presenter-trio').waitFor();await page.waitForFunction(()=>document.querySelector('.home-presenter-trio')?.naturalWidth>0);
   const row=await page.locator('.home-presenter-trio').evaluate(img=>{const r=img.getBoundingClientRect(),p=img.parentElement.getBoundingClientRect();return {fit:getComputedStyle(img).objectFit,left:r.left,right:r.right,parentLeft:p.left,parentRight:p.right,width:r.width,height:r.height,overflow:document.documentElement.scrollWidth>innerWidth};});
   assert.equal(row.fit,'contain');assert.ok(row.width>0&&row.height>0);assert.ok(row.left>=row.parentLeft-1&&row.right<=row.parentRight+1);assert.equal(row.overflow,false);presenters.push({width,...row});}
 });
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});for(const path of ['/produkte/nex2fly','/teileklar/werkstatt','/impressum']){await navigate(page,path);const gutter=await page.locator('.content-supplement .editorial-explainers').evaluate(n=>({left:parseFloat(getComputedStyle(n).paddingLeft),right:parseFloat(getComputedStyle(n).paddingRight)}));assert.ok(gutter.left>=24&&gutter.right>=24);gutters.push({width,path,gutter,passed:true});}}
 await c.close();
 await check('keyboard_skip_link_preserves_standalone_product_hash_route',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(new URL('../standalone/nexify-preview.html',import.meta.url).href+'#/produkte/nex2fly');await p.locator('main h1').waitFor();await p.locator('.skip-link').focus();await p.keyboard.press('Enter');assert.equal(new URL(p.url()).hash,'#/produkte/nex2fly');assert.equal(await p.evaluate(()=>document.activeElement?.id),'page-content');await c.close();
 });
 await check('sdk_guided_preview_works_when_visitor_session_is_404',async()=>{
  const c=await context(),p=await c.newPage();await navigate(p,'/produkte/nex2fly');const input=p.locator('#orientation-message');await input.waitFor();await input.fill('Wie beginne ich mit NeX2fly?');const response=p.waitForResponse(r=>r.url().endsWith('/api/agent-chat'));await p.locator('.orientation-composer button').first().click();const r=await response;assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/text\/event-stream/);await p.locator('.orientation-message.role-assistant').waitFor();assert.match(await p.locator('.orientation-message.role-assistant').innerText(),/ohne Live-KI/);await c.close();
 },true);
 await check('sdk_unknown_and_private_page_context_fail_closed_with_draft_retained',async()=>{
  for(const path of ['/unknown-unlisted',map.pages.find(p=>p.access.visibility!=='public').path]){
   const c=await context(),p=await c.newPage();await c.route('**/api/agent-chat',r=>{const body=r.request().postDataJSON();body.page_path=path;return r.continue({postData:JSON.stringify(body)});});
   await navigate(p,'/produkte/nex2fly');const input=p.locator('#orientation-message');await input.waitFor();await input.fill('Synthetic retained draft');const response=p.waitForResponse(r=>r.url().endsWith('/api/agent-chat'));await p.locator('.orientation-composer button').first().click();assert.equal((await response).status(),422);await p.locator('.public-orientation [role="alert"]').waitFor();assert.equal(await input.inputValue(),'Synthetic retained draft');assert.equal(await p.locator('.orientation-message.role-assistant').count(),0);await c.close();
  }
 },true);
 await check('sdk_mobile_real_chat_no_overflow_escape_and_focus_return',async()=>{
  const c=await context({width:390,height:844}),p=await c.newPage();await navigate(p,'/produkte/nex2fly');await p.locator('.reopen-chat').focus();await p.keyboard.press('Enter');await p.locator('#orientation-message').waitFor();await p.locator('#orientation-message').fill('Wie beginne ich?');await p.locator('.orientation-composer button').first().click();await p.locator('.orientation-message.role-assistant').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await p.locator('#aifly-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.locator('#orientation-message').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#aifly-panel')?.hidden===true);assert.ok(await p.evaluate(()=>document.activeElement?.classList.contains('reopen-chat')));await c.close();
 },true);
 assert.deepEqual(external,[]);assert.deepEqual(await hashes([...sourcePaths,...sdkPaths,...auxiliaryPaths]),before,'Sources changed during run; rerun rather than rehash');
 const now=new Date().toISOString();const report={recorded_at:now,checks,public_routes:pages.map(p=>p.path),passed:true,scope:'Fresh local critical subset only; actual browser and deterministic Web handler SSE with simulated session404; no provider, production or full accessibility acceptance. Public route list is inventory, not an assertion every route was revisited here.',source_sha256:Object.fromEntries(sourcePaths.map(p=>[p,before[p]])),auxiliary_source_sha256:Object.fromEntries(auxiliaryPaths.map(p=>[p,before[p]])),sdk_source_sha256:Object.fromEntries(sdkPaths.map(p=>[p,before[p]])),targeted_supplement_gutter_followup:gutters,sdk_browser_observations:{recorded_at:now,checks:sdkChecks,passed:true,scope:'Real AI SDK streaming over isolated loopback bridge to exact api/agent-chat.ts; tools/agent-preview.mjs source-bound but not launched; no external provider'},presenter_measurements:presenters,observed_handler_requests:observedRequests,external_requests:external,acceptance:'local_behavior_verified_final_user_and_production_acceptance_open',reproduction:'Node22 apps/site/tests/browser-critical.mjs with existing Playwright module/browser paths; requires fresh standalone build'};
 await writeFile(new URL('evidence/one-app-2026-10-27/critical-browser-fresh.json',repo),JSON.stringify(report,null,2)+'\n');
 await writeFile(new URL('docs/design/detail-browser-evidence.json',repo),JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();await server.close();await new Promise(resolve=>backend.close(resolve));}
