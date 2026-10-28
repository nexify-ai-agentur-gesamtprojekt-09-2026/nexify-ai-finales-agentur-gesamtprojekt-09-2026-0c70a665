// Actual shared application UI and pinned SDK; all ingestion intercepted; no real identities.
import assert from 'node:assert/strict';import {createServer} from 'vite';import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root=repo+'apps/site';
const sources=['apps/web/components/DiagnosticConsent.tsx','apps/web/components/DiagnosticConsent.css','apps/web/components/SiteFooter.tsx','apps/web/observability/exceptions.mjs','apps/web/observability/exceptions.d.mts','apps/site/tests/browser-consent-ui.mjs'];
const hash=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hash(),report={scope:'local synthetic UI/SDK intercept only;not legal or live acceptance',checks:[],source_sha256:before,external_events_sent:0,unexpected_origins:[],uncaught:[]};
const browser=await chromium.launch({headless:true});
try{
 for(const mode of ['configured','missing','load_failure']){
 const server=await createServer({root,server:{port:0,strictPort:false,hmr:false},define:{'import.meta.env.VITE_POSTHOG_PROJECT_TOKEN':JSON.stringify(mode==='missing'?'':'phc_synthetic_no_remote'),'import.meta.env.VITE_POSTHOG_KEY':'""','import.meta.env.VITE_RELEASE_SHA':JSON.stringify('1'.repeat(40)),'import.meta.env.VITE_APP_ENV':'"test"','import.meta.env.VITE_CLERK_ENABLED':'"false"'}});await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 try{for(const width of [320,390,1280])for(const locale of ['de','nl']){
 const context=await browser.newContext({viewport:{width,height:900},userAgent:'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'});let requests=0;
 await context.addInitScript(l=>{localStorage.setItem('nexify-locale',l);Object.defineProperty(navigator,'webdriver',{get:()=>false});Object.defineProperty(navigator,'userAgentData',{get:()=>({brands:[{brand:'Chromium',version:'134'}]})});},locale);
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin==='https://eu.i.posthog.com'){requests++;return route.fulfill({status:200,json:{status:1}});}if(u.origin!==origin){report.unexpected_origins.push(u.origin);return route.abort();}if(mode==='load_failure'&&/posthog-js.*(?:no-external|exception-autocapture)/.test(u.pathname))return route.abort();if(u.pathname.startsWith('/api/'))return route.fulfill({status:204});return route.continue();});
 const page=await context.newPage();page.on('pageerror',e=>report.uncaught.push(e.name));const box=page.locator('.diagnostic-consent'),summary=box.locator('summary'),status=box.getByRole('status');
 const t=locale==='de'?{title:'Fehlerdiagnose-Einstellungen',allow:'Zulassen',deny:'Ablehnen',revoke:'Einwilligung widerrufen',off:'Aus · noch keine Auswahl',declined:'Aus · abgelehnt',active:'Fehlerdiagnose eingeschaltet.',missing:'Technisch nicht verfügbar.',failed:'Laden fehlgeschlagen.',revoked:'Aus · widerrufen.'}:{title:'Instellingen voor foutdiagnose',allow:'Toestaan',deny:'Weigeren',revoke:'Toestemming intrekken',off:'Uit · nog geen keuze',declined:'Uit · geweigerd',active:'Foutdiagnose ingeschakeld.',missing:'Technisch niet beschikbaar.',failed:'Laden mislukt.',revoked:'Uit · ingetrokken.'};
 try{
 await page.goto(origin+'/kontakt');await page.waitForFunction(l=>document.documentElement.lang===l,locale);await summary.focus();await page.keyboard.press('Enter');assert.equal(await summary.innerText(),t.title);await assert.doesNotReject(async()=>{await status.filter({hasText:t.off}).waitFor();});assert.equal(requests,0);
 const allow=box.getByRole('button',{name:t.allow,exact:true}),deny=box.getByRole('button',{name:t.deny,exact:true});
 assert.equal(await allow.getAttribute('class'),await deny.getAttribute('class'));for(const b of [allow,deny]){const r=await b.boundingBox();assert.ok(r.height>=44&&r.width>=44);}
 await deny.focus();await page.keyboard.press('Enter');await status.filter({hasText:t.declined}).waitFor();assert.equal(requests,0);
 await box.getByRole('link').click();await page.waitForURL(origin+'/datenschutz');assert.equal(await page.locator('.workspace-shell').count(),1);if(!await box.evaluate(d=>d.open))await summary.click();await status.filter({hasText:t.declined}).waitFor();
 await allow.click();await status.filter({hasText:mode==='configured'?t.active:mode==='missing'?t.missing:t.failed}).waitFor();assert.equal(requests,0);
 if(mode==='configured'){await page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')].capture(new Error('synthetic consent test')));for(let i=0;i<100&&requests===0;i++)await page.waitForTimeout(50);assert.equal(requests,1);}
 await box.getByRole('button',{name:t.revoke,exact:true}).click();await status.filter({hasText:t.revoked}).waitFor();assert.equal(await allow.isDisabled(),true);const previous=requests;await page.evaluate(()=>window[Symbol.for('nexify.exceptions.v1')].capture(new Error('must not send after revoke')));await page.waitForTimeout(100);assert.equal(requests,previous);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.reload();await summary.focus();await page.keyboard.press('Enter');await status.filter({hasText:t.off}).waitFor();assert.equal(await allow.isEnabled(),true);assert.equal((await context.cookies()).length,0);assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k!=='nexify-locale')),[]);
 report.checks.push({mode,width,locale,passed:true});
 }finally{await context.close();}
 }}finally{await server.close();}
 }
 assert.equal(report.checks.length,18);assert.deepEqual(report.unexpected_origins,[]);assert.deepEqual(report.uncaught,[]);assert.deepEqual(await hash(),before);report.passed=true;
}finally{await browser.close();await mkdir(repo+'.local/consent-ui',{recursive:true});await writeFile(repo+'.local/consent-ui/browser-consent-ui.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,passed:report.passed}));
