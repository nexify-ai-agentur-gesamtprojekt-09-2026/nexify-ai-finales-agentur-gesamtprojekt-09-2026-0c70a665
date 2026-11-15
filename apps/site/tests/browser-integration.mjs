// Combined shell + route + local auth regression. All identity/session replies
// are synthetic; no external provider, authenticated tenant API or real sign-in.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
await generate();
const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=fileURLToPath(new URL('./fixtures/clerk-integration.tsx',import.meta.url));
const source=JSON.parse(readFileSync(new URL('../../../config/site-map.json',import.meta.url),'utf8'));
const privatePaths=source.pages.filter(p=>p.access.visibility!=='public').map(p=>p.path);
const capabilities=Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,false]));
const server=await createServer({root,configFile:root+'vite.config.ts',server:{port:0,strictPort:false},
 define:{'import.meta.env.VITE_CLERK_ENABLED':'"true"','import.meta.env.VITE_CLERK_PUBLISHABLE_KEY':JSON.stringify('pk_test_'+btoa('clerk.example.invalid$'))},
 resolve:{alias:{'@clerk/react':fixture}}});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});let failures=0;
async function scenario(name,run){
 const context=await browser.newContext();const external=[],api=[];
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin&&url.protocol!=='data:'){external.push(url.origin);return route.abort();}
  if(url.pathname.startsWith('/api/')){
   api.push({path:url.pathname,method:route.request().method()});
   if(url.pathname==='/api/session')return route.fulfill({json:{csrf:'synthetic-local-only',history:[],capabilities}});
   return route.fulfill({status:403,json:{error:'synthetic_operation_not_authorized'}});
  }
  return route.continue();
 });
 const page=await context.newPage();
 try{await run(page,api);assert.deepEqual(external,[]);assert.ok(api.every(r=>r.method==='GET'),'unexpected mutation');console.log('PASS '+name);}
 catch(error){failures++;console.error('FAIL '+name+': '+error.stack);}
 finally{await context.close();}
}
const navigate=async(page,path)=>page.evaluate(path=>{history.pushState(null,'',path);window.dispatchEvent(new Event('popstate'));},path);
const shell=async page=>{await page.locator('.workspace-shell').waitFor();assert.equal(await page.locator('.workspace-shell').count(),1);assert.equal(await page.locator('#locale').count(),1);};
try{
 await scenario('public deep links refresh navigation back forward and persistent shared shell',async page=>{
  await page.goto(origin+'/produkte/aifly-suite');await shell(page);
  await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
  await page.locator('#chat-message').fill('Synthetic unsent module draft');
  await page.locator('#locale').selectOption('nl');
  await page.evaluate(()=>window.integrationShell=document.querySelector('.workspace-shell'));
  await page.locator('.site-header .main-navigation a[href="/kontakt"]').click();await page.waitForURL('**/kontakt');
  assert.equal(await page.evaluate(()=>window.integrationShell===document.querySelector('.workspace-shell')),true);
  assert.equal(await page.locator('#chat-message').inputValue(),'Synthetic unsent module draft');
  await page.goBack();await page.waitForURL('**/produkte/aifly-suite');
  await page.goForward();await page.waitForURL('**/kontakt');
  assert.equal(await page.locator('#locale').inputValue(),'nl');
  await page.reload();await shell(page);await page.waitForFunction(()=>document.documentElement.lang==='nl');
  assert.equal(await page.locator('main h1').count(),1);
 });
 await scenario('DE NL content and canonical design tokens survive module and auth transitions',async page=>{
  await page.goto(origin+'/produkte/aifly-suite');await shell(page);
  const de=await page.locator('main').innerText();
  const token=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--color-graphit-600').trim());
  assert.ok(token);await page.locator('#locale').selectOption('nl');
  await page.waitForFunction(()=>document.documentElement.lang==='nl');assert.notEqual(await page.locator('main').innerText(),de);
  await navigate(page,'/anmelden');await page.locator('[data-fixture-login]').waitFor();
  assert.equal(await page.locator('[data-fixture-locale]').getAttribute('data-fixture-locale'),'nl-NL');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--color-graphit-600').trim()),token);
 });
 await scenario('synthetic sign-in sign-out and failed sign-out preserve shell without granting module roles',async page=>{
  await page.goto(origin+'/anmelden');await shell(page);
  await page.locator('[data-fixture-login]').click();await page.getByRole('button',{name:'Abmelden',exact:true}).waitFor();
  await page.evaluate(()=>{window.fixtureFail=true;localStorage.setItem('role','admin');localStorage.setItem('tenant','other-tenant');});
  await page.getByRole('button',{name:'Abmelden',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.fixtureSignouts?.length||0),0);
  await page.evaluate(()=>window.fixtureFail=false);await page.getByRole('button',{name:'Abmelden',exact:true}).click();
  await page.locator('[data-fixture-login]').waitFor();assert.deepEqual(await page.evaluate(()=>window.fixtureSignouts),[{redirectUrl:'/'}]);
  await page.locator('[data-fixture-login]').click();
  for(const path of privatePaths){await navigate(page,path);await page.waitForFunction(()=>document.querySelector('main h1')?.textContent==='Seite nicht verfügbar');await shell(page);}
  assert.equal(await page.locator('[data-fixture-login]').count(),0);
 });
 await scenario('all private direct routes remain unavailable with forged role tenant and signed-in fixture',async(page,api)=>{
  await page.addInitScript(()=>{window.fixtureSignedIn=true;localStorage.setItem('role','admin');localStorage.setItem('tenant','other-tenant');});
  for(const path of privatePaths){await page.goto(origin+path+'?role=admin&tenant=other-tenant');await shell(page);assert.equal(await page.locator('main h1').innerText(),'Seite nicht verfügbar');}
  assert.ok(api.every(r=>r.path==='/api/session')); // no protected endpoint/data lookup
 });
 await scenario('lazy provider failure preserves shared navigation language and public module access',async page=>{
  await page.route('**/tests/fixtures/clerk-integration.tsx*',route=>route.abort());
  await page.goto(origin+'/anmelden');await page.locator('.auth-fallback').waitFor();
  await page.locator('#locale').selectOption('nl');await page.waitForFunction(()=>document.querySelector('.auth-fallback')?.textContent.includes('niet beschikbaar'));
  await page.locator('.site-header .main-navigation a[href="/kontakt"]').click();await page.waitForURL('**/kontakt');await shell(page);
  assert.equal(await page.locator('#locale').inputValue(),'nl');assert.equal(await page.locator('main h1').count(),1);
 });
 await scenario('unknown and malformed direct links never expose private payload',async page=>{
  for(const path of ['/not-a-real-page','/portal%252fkunde']){await page.goto(origin+path);await shell(page);assert.equal(await page.locator('main h1').innerText(),'Seite nicht verfügbar');}
  await navigate(page,'/%ZZ');await page.waitForFunction(()=>document.querySelector('main h1')?.textContent==='Seite nicht verfügbar');
 });
 await scenario('unknown-route title and recovery stay localized within the shared shell',async page=>{
  await page.goto(origin+'/not-a-real-page');await shell(page);await page.locator('#locale').selectOption('nl');
  await page.waitForFunction(()=>document.title==='Pagina niet beschikbaar · NeXify AI');
  assert.equal(await page.locator('main h1').innerText(),'Pagina niet beschikbaar');
  await page.locator('#chat-message').fill('Recovery draft');
  await page.locator('main').getByRole('link',{name:'Naar de startpagina',exact:true}).click();await page.waitForURL(origin+'/');
  assert.equal(await page.locator('#locale').inputValue(),'nl');assert.equal(await page.locator('#chat-message').inputValue(),'Recovery draft');
 });
 await scenario('mobile keyboard navigation and session action preserve a single shell',async page=>{
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/anmelden');await shell(page);
  await page.locator('[data-fixture-login]').focus();await page.keyboard.press('Enter');
  const button=page.getByRole('button',{name:'Abmelden',exact:true});await button.waitFor();await button.focus();await page.keyboard.press('Enter');
  await page.locator('[data-fixture-login]').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 });
}finally{await browser.close();await server.close();}
if(failures)process.exitCode=1;
