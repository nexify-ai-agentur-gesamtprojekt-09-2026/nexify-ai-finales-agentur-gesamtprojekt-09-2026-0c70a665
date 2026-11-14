// Fresh local critical browser evidence. Real deterministic SDK SSE, no provider.
// Run under Node22 with PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSERS_PATH configured.
import assert from 'node:assert/strict';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer as httpServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createServer} from 'vite';
import handler from '../../../api/agent-chat.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=new URL('../../../',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const sourcePaths=['apps/site/src/Auth.tsx','apps/site/src/main.tsx','apps/web/app/globals.css','apps/web/components/HomeContent.tsx','apps/web/components/Workspace.tsx','apps/web/components/PageConcept.css','config/site-map.json'];
const sdkPaths=['apps/web/components/PublicOrientationChat.tsx','apps/web/components/PublicOrientationChat.css','api/agent-chat.ts','packages/agent-runtime/public-orientation.ts','tools/agent-preview.mjs'];
async function hashes(paths){return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(new URL(p,repo))).digest('hex')])));}
const auxiliaryPaths=['apps/web/components/DeferredChatBoundary.tsx','apps/web/components/PublicRequestFallback.tsx','apps/web/components/OracleCompanion.tsx','apps/web/components/OracleCompanion.css','apps/web/lib/i18n.ts','apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png','apps/web/components/PublicExperience.tsx','apps/web/components/ShopPanel.tsx','apps/web/components/ShopPanel.css','apps/site/src/main.tsx','apps/web/components/WorkspaceRebuild.css','apps/web/components/HomeRebuild.css','apps/web/components/HomeConcept.css','apps/web/components/AtelierFilm.css','apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css','config/identity-hero.json','apps/site/tests/browser-identity-hero.mjs','packages/tokens/tokens.css','apps/site/tests/browser-critical.mjs'];
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
const cache=await mkdtemp(join(tmpdir(),'nexify-critical-cache-'));
const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false,proxy:{'/api/agent-chat':{target:`http://127.0.0.1:${backend.address().port}`,changeOrigin:false}}},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"','__NEXIFY_STATIC_ORIENTATION__':false}});// the shipped Vite site defaults to the static orientation chat; the SDK checks need the server variant (as served by apps/web), so the test overrides the define
await server.listen();origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const checks=[],sdkChecks=[],gutters=[],presenters=[],external=[];
async function context(viewport={width:1920,height:1080}){const c=await browser.newContext({viewport,reducedMotion:'reduce'});await c.route('**/*',r=>{const u=new URL(r.request().url());if(![origin,'null'].includes(u.origin)&&u.protocol!=='data:'){external.push(u.origin);return r.abort();}if(u.pathname==='/api/session')return r.fulfill({status:404,json:{error:'synthetic_no_visitor_session'}});if(u.pathname==='/api/agent-runtime-status')return r.fulfill({status:503,json:{error:'synthetic_runtime_not_connected'}});if(u.pathname.startsWith('/api/')&&u.pathname!=='/api/agent-chat')return r.fulfill({status:403,json:{error:'not_authorized_in_test'}});return r.continue();});return c;}
async function check(name,fn,sdk=false){await fn();(sdk?sdkChecks:checks).push(name);console.log('PASS '+name);}
async function openChat(page){if(!(await page.locator('#aifly-panel').isVisible()))await page.locator('.reopen-chat').click();}
async function navigate(page,path){await page.goto(origin+path);await page.waitForFunction(()=>{const select=document.querySelector('#locale');return select?!select.disabled:Boolean(document.querySelector('.workspace-shell.site-teileklar'));});await page.locator('main h1').first().waitFor();}// #locale is enabled only after hydration and is hidden in the mobile layout; TEILEKLAR pages use the German-only commerce header without a language select
try{
 const c=await context(),page=await c.newPage();
 await check('account_control_fallback_and_auth_routes_present',async()=>{
  // The header account control no longer exists (Clerk removed, D-007). The account entry points are the
  // footer links to /anmelden and /registrieren; both must lead to the static contact-based fallback panel.
  await navigate(page,'/');
  const login=page.locator('.site-footer a[href="/anmelden"]:visible').first();await login.click();
  await page.waitForURL('**/anmelden');await page.locator('.auth-fallback').waitFor();
  assert.equal(await page.locator('.auth-fallback [data-testid="site-auth-link"]').getAttribute('href'),'/kontakt');
  await navigate(page,'/');
  const signup=page.locator('.site-footer a[href="/registrieren"]:visible').first();await signup.click();
  await page.waitForURL('**/registrieren');await page.locator('.auth-fallback').waitFor();
  await navigate(page,'/registrieren');await page.locator('.auth-fallback').waitFor();
 });
 await check('nex2fly_product_copy_all_locales_and_section_focus_preserves_route',async()=>{
  await navigate(page,'/produkte/aifly-suite');const source=pages.find(p=>p.id==='nex2fly');
  const flat=value=>value.replace(/\s+/g,' ').trim();
  for(const locale of ['de','nl','fr','en']){
   await page.locator('#locale').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l,locale,{timeout:8000}).catch(()=>assert.fail('language switch to '+locale+' has no effect: the selector navigates to ?lang= but apps/site/src/main.tsx never passes it to Workspace (OF-12)'));
   await page.locator('main h1').first().waitFor();
   assert.equal(flat(await page.locator('main h1').first().innerText()),flat(source.title[locale]));
   const body=flat(await page.locator('main').innerText());for(const section of source.sections)assert.ok(body.includes(flat(section.body[locale])),locale+' '+section.id);
   const anchors=page.locator('main nav.hc-anchors a');assert.ok(await anchors.count()>=2,'on-page section navigation present');
   const prior=new URL(page.url());await anchors.last().click();const now=new URL(page.url());
   assert.equal(now.pathname+now.search,prior.pathname+prior.search,'section jump keeps route and language');
   assert.ok(now.hash.startsWith('#content-nex2fly-'),'section jump uses the in-page anchor');
   assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('pc-section')&&document.activeElement.id===location.hash.slice(1)),'target section receives focus');
  }
 });
 await check('native_product_menu_and_direct_legal_footer_links',async()=>{
  await navigate(page,'/');await page.locator('#produktwelt .hc-products').waitFor();
  const link=page.locator('#produktwelt .hc-products a[href="/produkte/aifly-suite"]');await link.click();assert.equal(new URL(page.url()).pathname,'/produkte/aifly-suite');
  await navigate(page,'/');await page.locator('[data-testid="desktop-products-megamenu-toggle"]').click();
  await page.locator('[data-testid="desktop-products-megamenu-link-nex2fly"]').click();assert.equal(new URL(page.url()).pathname,'/produkte/aifly-suite');
  for(const path of ['/impressum','/datenschutz','/vertragsgrundlagen']){await navigate(page,'/');const legal=page.locator('.site-footer a[href="'+path+'"]:visible').first();await legal.click();assert.equal(new URL(page.url()).pathname,path);await page.locator('main h1').waitFor();}
 });
 await check('hero_scene_and_controls_across_five_desktop_sizes',async()=>{
  for(const width of [1024,1280,1440,1600,1920]){await page.setViewportSize({width,height:1080});await navigate(page,'/');const poster=page.locator('.identity-hero .identity-hero-photo video');await poster.waitFor();
   const measurement=await poster.evaluate(p=>{const vr=p.getBoundingClientRect(),stage=p.closest('.identity-media').getBoundingClientRect(),copy=document.querySelector('.identity-copy')?.getBoundingClientRect(),media=document.querySelector('.identity-media')?.getBoundingClientRect();const overlap=!!(copy&&media&&copy.right>media.left&&media.right>copy.left&&copy.bottom>media.top&&media.bottom>copy.top);return {fit:getComputedStyle(p).objectFit,opacity:Number(getComputedStyle(p).opacity),left:vr.left,right:vr.right,top:vr.top,bottom:vr.bottom,stageLeft:stage.left,stageRight:stage.right,stageTop:stage.top,stageBottom:stage.bottom,width:vr.width,height:vr.height,overflow:document.documentElement.scrollWidth>innerWidth,copyRight:copy?.right||0,mediaLeft:media?.left||0,noOverlap:!overlap};});
   assert.ok(['cover','contain'].includes(measurement.fit),'brand scene keeps aspect (no distortion): '+measurement.fit);assert.ok(measurement.opacity>=0.99,'brand scene fully visible');assert.ok(measurement.width>0&&measurement.height>0);assert.ok(measurement.left>=measurement.stageLeft-1&&measurement.right<=measurement.stageRight+1&&measurement.top>=measurement.stageTop-1&&measurement.bottom<=measurement.stageBottom+1,'whole scene inside stage (no spill)');assert.equal(measurement.overflow,false);
   if(!measurement.noOverlap){
    const layered=await page.evaluate(()=>{const copy=document.querySelector('.identity-copy'),media=document.querySelector('.identity-media'),action=copy?.querySelector('button'),controls=media?.querySelector('.atelier-film-controls');if(!copy||!media||!action||!controls)return false;const a=action.getBoundingClientRect(),c=controls.getBoundingClientRect();const hit=document.elementFromPoint(a.left+a.width/2,a.top+a.height/2);return Number(getComputedStyle(copy).zIndex)>Number(getComputedStyle(media).zIndex)&&!!hit&&action.contains(hit)&&!(a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top);});
    assert.ok(layered,`layered hero must keep its action above the scene and clear of video controls at ${width}`);
   }
   presenters.push({...measurement,viewportWidth:width,layeredActionClear:true});}
 });
 for(const width of [1920,390]){await page.setViewportSize({width,height:1080});for(const path of ['/produkte/aifly-suite','/teileklar/werkstatt','/impressum']){await navigate(page,path);const gutter=await page.locator('.pc-supplement').first().evaluate(n=>({left:parseFloat(getComputedStyle(n).paddingLeft),right:parseFloat(getComputedStyle(n).paddingRight)}));assert.ok(gutter.left>=24&&gutter.right>=24);gutters.push({width,path,gutter,passed:true});}}
 await c.close();
 await check('keyboard_skip_link_preserves_standalone_product_hash_route',async()=>{
  const c=await context(),p=await c.newPage();await p.goto(new URL('../standalone/nexify-preview.html',import.meta.url).href+'#/produkte/aifly-suite');await p.locator('main h1').waitFor();await p.locator('.skip-link').focus();await p.keyboard.press('Enter');assert.equal(new URL(p.url()).hash,'#/produkte/aifly-suite');assert.equal(await p.evaluate(()=>document.activeElement?.id),'page-content');await c.close();
 });
 await check('sdk_guided_preview_works_when_visitor_session_is_404',async()=>{
  const c=await context(),p=await c.newPage();await navigate(p,'/produkte/aifly-suite');const input=p.locator('#orientation-message');await openChat(p);await input.waitFor();await input.fill('Wie beginne ich mit NeX AIFly Suite?');const response=p.waitForResponse(r=>r.url().endsWith('/api/agent-chat'));await p.locator('.orientation-composer button').first().click();const r=await response;assert.equal(r.status(),200);assert.match(r.headers()['content-type'],/text\/event-stream/);await p.locator('.orientation-message.role-assistant').waitFor();assert.match(await p.locator('.orientation-message.role-assistant').innerText(),/ohne Live-KI/);await c.close();
 },true);
 await check('sdk_unknown_and_private_page_context_fail_closed_with_draft_retained',async()=>{
  for(const path of ['/unknown-unlisted',map.pages.find(p=>p.access.visibility!=='public').path]){
   const c=await context(),p=await c.newPage();await c.route('**/api/agent-chat',r=>{const body=r.request().postDataJSON();body.page_path=path;return r.continue({postData:JSON.stringify(body)});});
   await navigate(p,'/produkte/aifly-suite');const input=p.locator('#orientation-message');await openChat(p);await input.waitFor();await input.fill('Synthetic retained draft');const response=p.waitForResponse(r=>r.url().endsWith('/api/agent-chat'));await p.locator('.orientation-composer button').first().click();assert.equal((await response).status(),422);await p.locator('.public-orientation [role="alert"]').waitFor();assert.equal(await input.inputValue(),'Synthetic retained draft');assert.equal(await p.locator('.orientation-message.role-assistant').count(),0);await c.close();
  }
 },true);
 await check('sdk_mobile_real_chat_no_overflow_escape_and_focus_return',async()=>{
  const c=await context({width:390,height:844}),p=await c.newPage();await navigate(p,'/produkte/aifly-suite');await p.locator('.reopen-chat').focus();await p.keyboard.press('Enter');await p.locator('#orientation-message').waitFor();await p.locator('#orientation-message').fill('Wie beginne ich?');await p.locator('.orientation-composer button').first().click();await p.locator('.orientation-message.role-assistant').waitFor();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.ok(await p.locator('#aifly-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1));await p.locator('#orientation-message').focus();await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('#aifly-panel')?.hidden===true);assert.ok(await p.evaluate(()=>document.activeElement?.classList.contains('reopen-chat')));await c.close();
 },true);
 assert.deepEqual(external,[]);assert.deepEqual(await hashes([...sourcePaths,...sdkPaths,...auxiliaryPaths]),before,'Sources changed during run; rerun rather than rehash');
 const now=new Date().toISOString();const report={recorded_at:now,checks,public_routes:pages.map(p=>p.path),passed:true,scope:'Fresh local critical subset only; actual browser and deterministic Web handler SSE with simulated session404; no provider, production or full accessibility acceptance. Public route list is inventory, not an assertion every route was revisited here.',source_sha256:Object.fromEntries(sourcePaths.map(p=>[p,before[p]])),auxiliary_source_sha256:Object.fromEntries(auxiliaryPaths.map(p=>[p,before[p]])),sdk_source_sha256:Object.fromEntries(sdkPaths.map(p=>[p,before[p]])),targeted_supplement_gutter_followup:gutters,sdk_browser_observations:{recorded_at:now,checks:sdkChecks,passed:true,scope:'Real AI SDK streaming over isolated loopback bridge to exact api/agent-chat.ts; tools/agent-preview.mjs source-bound but not launched; no external provider'},presenter_measurements:presenters,observed_handler_requests:observedRequests,external_requests:external,acceptance:'local_behavior_verified_final_user_and_production_acceptance_open',reproduction:'Node22 apps/site/tests/browser-critical.mjs with existing Playwright module/browser paths; requires fresh standalone build'};
 if(process.env.NEXIFY_EVIDENCE_DIRECTORY){
  await writeFile(join(process.env.NEXIFY_EVIDENCE_DIRECTORY,'critical-browser.json'),JSON.stringify(report,null,2)+'\n');
 }else{
  await writeFile(new URL('evidence/one-app-2026-10-27/critical-browser-fresh.json',repo),JSON.stringify(report,null,2)+'\n');
  await writeFile(new URL('docs/design/detail-browser-evidence.json',repo),JSON.stringify(report,null,2)+'\n');
 }
}finally{await browser.close();await server.close();await new Promise(resolve=>backend.close(resolve));await rm(cache,{recursive:true,force:true});}
