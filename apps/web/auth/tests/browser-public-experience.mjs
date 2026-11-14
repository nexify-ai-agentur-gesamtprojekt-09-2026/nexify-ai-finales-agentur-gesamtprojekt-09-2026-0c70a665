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
const sourcePaths=['apps/web/proxy.ts','apps/web/auth/policy.ts','apps/web/app/api/internal/workspace/status/route.ts','apps/web/app/api/internal/workspace/mail/route.ts','apps/web/app/intern/workspace/page.tsx','apps/web/components/AuthAvailabilityNotice.tsx','apps/web/auth/public-provider.ts','apps/web/app/layout.tsx','apps/web/app/anmelden/[[...sign-in]]/page.tsx','apps/web/app/registrieren/[[...sign-up]]/page.tsx','apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css','apps/web/components/SiteFooter.tsx','apps/web/auth/tests/browser-public-experience.mjs','apps/web/app/page.tsx','apps/web/app/[...slug]/page.tsx','apps/web/next.config.ts'];
const hashes=async()=>Object.fromEntries(await Promise.all(sourcePaths.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')])));const sourceHashes=await hashes();
const data=JSON.parse(await readFile(new URL('../../../site/.generated/public-site.json',import.meta.url),'utf8'));
const map=JSON.parse(await readFile(new URL('../../../../config/site-map.json',import.meta.url),'utf8'));
const ORACLE_NAME=['AIFly ORACLE','with NeXify AI Intelligence by NeXify'];
assert.ok((await readFile(root+'apps/web/components/Logo.tsx','utf8')).includes("export const ORACLE_NAME=['"+ORACLE_NAME.join("','")+"'] as const;"),'assistant name is the one declared in Logo.tsx');
// Vom Inhaber gelieferte Markenszenen: Datei und SHA-256 der eingebauten Datei aus docs/design/scene-videos-2026-11-13.md (beide Tabellen).
const sceneRecord=await readFile(root+'docs/design/scene-videos-2026-11-13.md','utf8');
const approvedScenes=new Map([...sceneRecord.matchAll(/^\|(?:[^|`]*`[a-z0-9-]+`(?:, `[a-z0-9-]+`)* \|)? `([a-z0-9-]+\.mp4)` \| `([0-9a-f]{64})` \|/gm)].map(match=>[match[1],match[2]]));
assert.equal(approvedScenes.size,6,'delivered scene list is read completely (three built-in scenes, three recorded later)');const servedScenes=new Map();
const allocator=createServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
const env={...process.env,NODE_ENV:'production',APP_ENV:'production'};delete env.CLERK_SECRET_KEY;delete env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'apps/web',env,stdio:['ignore','pipe','pipe']});
let log='';child.stdout.on('data',b=>{log+=b;});child.stderr.on('data',b=>{log+=b;});
const installationOnly=process.env.TEST_PUBLIC_INSTALLATION==='enabled';
const origin=`http://127.0.0.1:${port}`,report={scope:'local Next build;no provider or tenant acceptance',routes:[],private:[],external:0,mutations:0,pageErrors:[],pwa:{},navigation:false,source_sha256:sourceHashes,auth_mobile:[],videos:[],scene_sha256:{}};
let browser;
try{
 for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==origin&&u.origin!=='null'&&u.protocol!=='data:'&&u.protocol!=='blob:'){report.external++;return route.abort();}if(!['GET','HEAD'].includes(req.method())){report.mutations++;return route.abort();}return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.name));page.on('console',m=>{if(/hydration|hydrated but|did not match|An error occurred in one of your React components/i.test(m.text()))report.pageErrors.push('hydration_or_component_error');});
 // Companion-/Avatar-Integrität (zielbild-v2): der AI-Fly-Oracle-Companion sitzt jetzt am reopen-chat-Launcher
 // (Panel desktop-default zu seit 2026-11, offen nur nach Nutzeraktion). Dekorativ (aria-hidden) und das Avatar-Asset lädt unbeschädigt mit 512px.
 if(!installationOnly){await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();{const closeButton=page.locator('[data-testid="chat-panel-close-button"]');if(await closeButton.isVisible())await closeButton.click();}const companion=page.locator('.reopen-chat .oracle-companion');await companion.waitFor();assert.equal(await companion.getAttribute('aria-hidden'),'true','companion stays decorative');await page.waitForFunction(()=>{const i=document.querySelector('.reopen-chat .oracle-companion img');return i&&i.complete&&i.naturalWidth>0;});assert.equal(await companion.locator('img').evaluate(i=>i.complete&&i.naturalWidth>=128&&Math.abs(i.naturalWidth-i.naturalHeight)<=2),true,'companion avatar loads unbroken, square and not tiny (atelier asset oracle-lossless.webp)');report.companion_avatar={aria_hidden:true,natural_width:await companion.locator('img').evaluate(i=>i.naturalWidth),location:'reopen-chat launcher',passed:true};}
 if(!installationOnly)for(const locale of ['de','nl'])for(const source of data.pages){if(locale==='nl'&&source.path.startsWith('/teileklar'))continue;
  const shop=source.path.startsWith('/teileklar');await page.goto(origin+source.path);if(!shop)await page.locator('#locale').selectOption(locale);
  await page.waitForFunction(l=>document.documentElement.lang===l,shop?'de':locale);
  if(shop)await page.waitForFunction(()=>/TEILEKLAR/.test(document.title));else await page.waitForFunction(t=>document.title===t,source.localizedTitle[locale]+' · NeXify AI');
  assert.equal(await page.locator('.workspace-shell').count(),1);
  // Name des Assistenten seit 32616db (PR 127): apps/web/components/Logo.tsx ORACLE_NAME, zweizeilig gesetzt (Eigenname, darunter die Herkunft).
  // Geprueft wird der volle Name in beiden Zeilen, jede Zeile exakt; die Konstante oben ist gegen die Quelle gebunden.
  assert.equal(await page.locator('.panel-heading h2 strong').innerText(),ORACLE_NAME[0],'panel heading carries the assistant name');
  assert.equal(await page.locator('.panel-heading h2 .panel-identity-subtitle').innerText(),ORACLE_NAME[1],'panel keeps the NeXify brandline (subtitle)');
  assert.equal((await page.locator('.panel-heading h2').innerText()).replace(/\s+/g,' ').trim(),ORACLE_NAME.join(' '),'panel heading is the full assistant name and nothing else');
  assert.equal(await page.locator('main h1').count(),1);assert.equal(await page.locator('head title').count(),1);
  // zielbild-v2: die Home-Seite präsentiert ihre Szenen über HomeContent (Live-Hero + Home-Journey),
  // nicht über die generischen .editorial-module; Unterseiten nutzen weiterhin ExplainerSections.
  if(source.path==='/')assert.equal(await page.locator('.identity-hero .identity-hero-photo').count(),1,'home presents exactly one editorial hero stage');
  else assert.ok(await page.locator('main section').count()>=1,'sub page renders at least one content section in main (explainer module count binding retired with the atelier content model)');
  assert.ok(await page.locator('main a[href]').count()>0,'page offers a next step inside main (editorial guide block was retired in the atelier redesign)');
  // Medien heute: Der Hero der Startseite ist seit 0ea229c (PR 104) der Eingangshallen-Film; Unterseiten tragen seit 32616db (PR 127)
  // die vom Inhaber gelieferten Markenszenen (docs/design/scene-videos-2026-11-13.md). Schutzziel unveraendert: Es darf kein Medium
  // abspielbar werden, das nicht freigegeben ist. Statt "kein Video" gilt deshalb: jedes <video> zeigt auf eine dort gefuehrte Datei,
  // die ausgelieferten Bytes tragen die dort festgehaltene Pruefsumme, und ausserhalb des Hero der Startseite laedt und spielt nichts ohne Klick.
  const videos=await page.locator('video').evaluateAll(nodes=>nodes.map(v=>({src:v.getAttribute('src'),sources:v.querySelectorAll('source').length,hero:!!v.closest('.identity-hero'),scene:v.classList.contains('scene-video'),autoplay:v.autoplay,paused:v.paused,preload:v.getAttribute('preload'),network:v.networkState,ready:v.readyState})));
  for(const video of videos){
   assert.equal(video.sources,0,'video has one source only, the bound src attribute');
   const file=/^\/media\/scenes\/([a-z0-9-]+\.mp4)$/.exec(video.src||'')?.[1];
   assert.ok(file&&approvedScenes.has(file),'only owner-delivered scenes may be playable: '+video.src+' on '+source.path);
   if(!servedScenes.has(file)){const response=await context.request.get(origin+video.src);assert.equal(response.status(),200,'scene is served: '+video.src);servedScenes.set(file,createHash('sha256').update(await response.body()).digest('hex'));}
   assert.equal(servedScenes.get(file),approvedScenes.get(file),'served scene bytes equal the recorded delivery: '+file);
   if(!(source.path==='/'&&video.hero)){assert.equal(video.autoplay,false,'only the home hero film may start by itself');assert.equal(video.paused,true,'film does not play without a click');}
   // Markenszenen im Kopfbild der Unterseiten (SceneVideo): laut Lieferprotokoll wird vor dem Klick nichts geladen.
   if(video.scene){assert.equal(video.preload,'none','scene loads nothing before a click');assert.equal(video.ready,0,'scene has loaded no media data before a click');}
  }
  if(source.path==='/'){const hero=videos.filter(video=>video.hero);assert.equal(hero.length,1,'home hero carries exactly one film');assert.equal(hero[0].src,'/media/scenes/eingangshalle-20261114.mp4','home hero film is the delivered entrance scene');}
  report.videos.push({path:source.path,locale,videos:videos.map(video=>video.src)});
  if(['login','signup'].includes(source.id)){const mode=source.id==='login'?'login':'register';assert.equal(await page.locator('[data-testid="auth-'+mode+'-form"]').count(),1,'auth page renders its real form (Clerk-era availability notice retired)');assert.equal(await page.locator('[data-testid="auth-'+mode+'-submit"]').count(),1);assert.equal(await page.locator('.auth-availability-notice').count(),0);}
  if(['tk-search','tk-categories','tk-category','tk-product','tk-cart','tk-checkout'].includes(source.id))assert.ok(await page.locator('main [class*="tk-"]').count()>=1,'shop route renders its shop content (shop-panel class retired)');
  report.routes.push({path:source.path,locale,passed:true});
 }
 if(!installationOnly)for(const locale of ['de','nl'])for(const path of ['/anmelden','/registrieren']){await page.setViewportSize({width:320,height:900});await page.goto(origin+path);await page.locator('#locale').selectOption(locale);const form=page.locator('[data-testid="auth-'+(path==='/anmelden'?'login':'register')+'-form"]');await form.waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);const back=form.locator('input').first();await back.focus();assert.equal(await back.evaluate(a=>a===document.activeElement),true);report.auth_mobile.push({locale,path,width:320,passed:true});}await page.setViewportSize({width:1280,height:900});
 for(const p of map.pages.filter(p=>p.access.visibility!=='public'||p.access.auth_required)){
  const r=await context.request.get(origin+p.path);assert.equal(r.status(),200,'private page shell is served without data (D-007)');assert.match(r.headers()['cache-control']||'',/private, no-store/);assert.match(r.headers()['x-robots-tag']||'',/noindex/);report.private.push(p.path);
 }
 await page.goto(origin+'/');const navLink=page.locator('main a[href="/produkte/aifly-suite"]').first();await navLink.scrollIntoViewIfNeeded();await navLink.click();await page.waitForURL(origin+'/produkte/aifly-suite');await page.goBack();await page.waitForURL(origin+'/');await page.goForward();await page.waitForURL(origin+'/produkte/aifly-suite');assert.equal(await page.locator('.workspace-shell').count(),1);report.navigation=true;
 for(const path of ['/manifest.webmanifest','/public-install-worker.js']){const r=await context.request.get(origin+path);assert.equal(r.status(),installationOnly?200:404);report.pwa[path]=r.status();if(installationOnly&&path.endsWith('.js'))assert.equal(await r.text(),await readFile(root+'apps/site/pwa/worker.js','utf8'));}
 assert.equal(await page.locator('link[rel="manifest"]').count(),installationOnly?1:0);
 if(installationOnly){await page.waitForFunction(async()=>navigator.serviceWorker&&(await navigator.serviceWorker.getRegistrations()).length===1);assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);report.pwa.registered_network_only=true;}
  const internal=await context.request.get(origin+'/api/internal/workspace/status?request_id='+('0'.repeat(64)));assert.equal(internal.status(),401);assert.equal(internal.headers()['cache-control'],'private, no-store');assert.equal((await internal.json()).error,'authentication_required');report.internal_workspace_api_auth_required_401=true;
  for(const method of ['GET','POST']){const r=await context.request.fetch(origin+'/api/internal/workspace/mail',{method,...(method==='POST'?{data:{action:'send'}}:{})});assert.equal(r.status(),401);assert.equal(r.headers()['cache-control'],'private, no-store');assert.equal((await r.json()).error,'authentication_required');}report.internal_mail_api_auth_required_401=true;
 assert.deepEqual(report.pageErrors,[]);assert.equal(report.external,0);assert.equal(report.mutations,0);
 report.scene_sha256=Object.fromEntries([...servedScenes].sort());
 assert.deepEqual(await hashes(),sourceHashes);report.passed=true;
}finally{
 if(browser)await browser.close();child.kill('SIGTERM');await once(child,'exit');
 await mkdir(root+'.local/next-parity',{recursive:true});await writeFile(root+'.local/next-parity/'+(installationOnly?'browser-next-installation.json':'browser-next.json'),JSON.stringify(report,null,2)+'\n');await writeFile(root+'.local/next-parity/runtime.log',log);
}
console.log(JSON.stringify({routes:report.routes.length,private:report.private.length,passed:report.passed}));
