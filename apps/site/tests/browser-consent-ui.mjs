// Actual shared application UI (apps/web, Next dev server) and pinned SDK; all ingestion intercepted; no real identities.
// Surface: the Next app, because only there the language comes from `?lang=` (apps/web/proxy.ts → x-nexify-locale).
// The Vite SPA (apps/site) mounts <Workspace> without `initialLocale` and ignores `?lang=` and `nexify-locale` since 5222298,
// so NL cannot be rendered there at all (see PROGRESS/OF-12 finding). Clerk is gone (DECISIONS D-007): no Clerk define needed.
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import {createServer as portServer} from 'node:net';import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=fileURLToPath(new URL('../../../',import.meta.url)),web=repo+'apps/web';
const sources=['apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css','apps/web/components/SiteFooter.tsx','apps/web/observability/exceptions.mjs','apps/web/observability/exceptions.d.mts','apps/site/tests/browser-consent-ui.mjs'];
const hash=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hash(),report={scope:'local synthetic UI/SDK intercept only (Next dev server of apps/web);not legal or live acceptance',surface:'next-dev',checks:[],source_sha256:before,external_events_sent:0,unexpected_origins:[],uncaught:[]};
async function startNext(token){
 const allocator=portServer();allocator.listen(0,'127.0.0.1');await once(allocator,'listening');const port=allocator.address().port;await new Promise(resolve=>allocator.close(resolve));
 // Isolated env: no inherited credentials; the synthetic token is a placeholder and every ingestion request is intercepted below.
 const env={PATH:process.env.PATH,LANG:'C.UTF-8',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN:token,NEXT_PUBLIC_POSTHOG_KEY:'',NEXIFY_RELEASE_SHA:'1'.repeat(40),NEXIFY_APP_ENV:'test'};
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:web,env,stdio:'ignore',detached:true});const origin='http://127.0.0.1:'+port;
 for(let n=0;n<600;n++){try{if((await fetch(origin+'/robots.txt')).status<500)break;}catch{}if(n===599){try{process.kill(-child.pid,'SIGTERM');}catch{}throw Error('Next dev start timeout');}await new Promise(resolve=>setTimeout(resolve,200));}
 // `next dev` forks the real server: stop the whole process group, otherwise it outlives the script and holds the dev lock.
 return {origin,stop:async()=>{if(child.exitCode===null){try{process.kill(-child.pid,'SIGTERM');}catch{}await once(child,'exit');}}};
}
const browser=await chromium.launch({headless:true});
try{
 for(const mode of ['configured','missing','load_failure']){
 const server=await startNext(mode==='missing'?'':'phc_synthetic_no_remote'),origin=server.origin;
 try{
 // Warm-up (nothing asserted): the dev server compiles routes and the SDK chunks on first request and reloads a page that is still loading
 // while it does so. Visiting every route and granting once beforehand keeps the measured cases deterministic. All requests stay local/intercepted.
 {const warm=await browser.newContext({viewport:{width:1280,height:900}});await warm.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin==='https://eu.i.posthog.com')return route.fulfill({status:200,json:{status:1}});if(u.origin!==origin)return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({status:204});return route.continue();});
  const page=await warm.newPage();const visit=async path=>{for(let attempt=0;attempt<8;attempt++){try{await page.goto(origin+path,{timeout:120000});await page.waitForLoadState('networkidle',{timeout:120000});await page.waitForTimeout(1500);return;}catch{await page.waitForTimeout(2000);}}};
  for(const path of ['/kontakt','/kontakt?lang=nl','/datenschutz','/datenschutz?lang=nl','/kontakt'])await visit(path);
  await page.locator('.diagnostic-consent summary').click({timeout:60000});await page.locator('.diagnostic-consent').getByRole('button',{name:'Zulassen',exact:true}).click();await page.waitForTimeout(5000);
  await warm.close();}
for(const width of [320,390,1280])for(const locale of ['de','nl']){
 const context=await browser.newContext({viewport:{width,height:900},userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'});let requests=0;
 await context.addInitScript(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(navigator,'userAgentData',{get:()=>({brands:[{brand:'Chromium',version:'134'}]})});});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin==='https://eu.i.posthog.com'){requests++;return route.fulfill({status:200,json:{status:1}});}if(u.origin!==origin){report.unexpected_origins.push(u.origin);return route.abort();}if(mode==='load_failure'&&/posthog-js.*(?:no-external|exception-autocapture)/.test(decodeURIComponent(u.pathname)))return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({status:204});return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>report.uncaught.push(e.name));const box=page.locator('.diagnostic-consent'),summary=box.locator('summary'),status=box.getByRole('status');
 // Language is URL-driven (proxy.ts): German is the default without parameter, the others use ?lang=. The cross-page link keeps the parameter.
 const query=locale==='de'?'':'?lang='+locale;
 const t=locale==='de'?{title:'Fehlerdiagnose-Einstellungen',allow:'Zulassen',deny:'Ablehnen',revoke:'Einwilligung widerrufen',off:'Aus · noch keine Auswahl',declined:'Aus · abgelehnt',active:'Fehlerdiagnose eingeschaltet.',missing:'Technisch nicht verfügbar.',failed:'Laden fehlgeschlagen.',revoked:'Aus · widerrufen.'}:{title:'Instellingen voor foutdiagnose',allow:'Toestaan',deny:'Weigeren',revoke:'Toestemming intrekken',off:'Uit · nog geen keuze',declined:'Uit · geweigerd',active:'Foutdiagnose ingeschakeld.',missing:'Technisch niet beschikbaar.',failed:'Laden mislukt.',revoked:'Uit · ingetrokken.'};
 try{
 await page.goto(origin+'/kontakt'+query,{timeout:120000});await page.waitForFunction(l=>document.documentElement.lang===l,locale);await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.innerText(),t.title);await assert.doesNotReject(async()=>{await status.filter({hasText:t.off}).waitFor();});assert.equal(requests,0);
 const allow=box.getByRole('button',{name:t.allow,exact:true}),deny=box.getByRole('button',{name:t.deny,exact:true});
 assert.equal(await allow.getAttribute('class'),await deny.getAttribute('class'));for(const b of [allow,deny]){const r=await b.boundingBox();assert.ok(r.height>=44&&r.width>=44);}
 await deny.focus();await page.keyboard.press('Enter');await status.filter({hasText:t.declined}).waitFor();assert.equal(requests,0);
 await box.getByRole('link').click();await page.waitForURL(origin+'/datenschutz'+query);assert.equal(await page.locator('.workspace-shell').count(),1);if(!await box.evaluate(d=>d.open))await summary.click();await status.filter({hasText:t.declined}).waitFor();
 await allow.click();await status.filter({hasText:mode==='configured'?t.active:mode==='missing'?t.missing:t.failed}).waitFor();assert.equal(requests,0);
 if(mode==='configured'){await page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')].capture(new Error('synthetic consent test')));for(let i=0;i<100&&requests===0;i++)await page.waitForTimeout(50);assert.equal(requests,1);}
 await box.getByRole('button',{name:t.revoke,exact:true}).click();await status.filter({hasText:t.revoked}).waitFor();assert.equal(await allow.isDisabled(),true);const previous=requests;await page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')].capture(new Error('must not send after revoke')));await page.waitForTimeout(100);assert.equal(requests,previous);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.reload();await summary.focus();await page.keyboard.press('Enter');await status.filter({hasText:t.off}).waitFor();assert.equal(await allow.isEnabled(),true);assert.equal((await context.cookies()).length,0);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='nexify-locale')),[]);
 report.checks.push({mode,width,locale,passed:true});
 }finally{await context.close();}
 }}finally{await server.stop();}
 }
 assert.equal(report.checks.length,18);assert.deepEqual(report.unexpected_origins,[]);assert.deepEqual(report.uncaught,[]);assert.deepEqual(await hash(),before);report.passed=true;
}finally{await browser.close();await mkdir(repo+'.local/consent-ui',{recursive:true});await writeFile(repo+'.local/consent-ui/browser-consent-ui.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,passed:report.passed}));
