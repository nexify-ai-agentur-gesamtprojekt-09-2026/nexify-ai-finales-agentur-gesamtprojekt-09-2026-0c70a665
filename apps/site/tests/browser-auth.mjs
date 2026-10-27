// Local-only UI regression: synthetic SDK, no real identity or external requests.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=fileURLToPath(new URL('./fixtures/clerk.tsx',import.meta.url));
const key='pk_test_'+btoa('clerk.example.invalid$');
const server=await createServer({root,configFile:root+'vite.config.ts',server:{port:0,strictPort:false},
 define:{'import.meta.env.VITE_CLERK_ENABLED':'"true"','import.meta.env.VITE_CLERK_PUBLISHABLE_KEY':JSON.stringify(key)},
 resolve:{alias:{'@clerk/react':fixture}}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
let failures=0;
async function scenario(name,run){
 const context=await browser.newContext();
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url===origin+'/api/session')return route.fulfill({json:{csrf:'synthetic-local-only',history:[],capabilities:Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(key=>[key,false]))}});
  return url.startsWith(origin)||url.startsWith('data:')?route.continue():route.abort();
 });
 const page=await context.newPage();
 try{await run(page);console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}finally{await context.close();}
}
try{
 await scenario('failed lazy auth chunk preserves public application and language control',async page=>{
  await page.route('**/tests/fixtures/clerk.tsx*',route=>route.abort());
  await page.goto(origin+'/anmelden');
  await page.locator('#locale').waitFor();
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#locale').count(),1);
  await page.locator('#locale').selectOption('nl');
  await page.locator('.auth-fallback').waitFor();
  assert.match(await page.locator('.auth-fallback').innerText(),/niet|onbeschikbaar/i);
 });
 await scenario('signed in account exposes keyboard signout with fixed local redirect',async page=>{
  await page.goto(origin+'/anmelden');
  const button=page.getByRole('button',{name:'Abmelden',exact:true});
  await button.waitFor({timeout:5000});await button.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>window.fixtureSignouts?.length===1);
  assert.deepEqual(await page.evaluate(()=>window.fixtureSignouts),[{redirectUrl:'/'}]);
 });
 await scenario('public state survives delayed route-local SDK load',async page=>{
  let release;const gate=new Promise(resolve=>release=resolve);let requests=0;
  await page.route('**/tests/fixtures/clerk.tsx*',async route=>{requests++;await gate;await route.continue();});
  await page.goto(origin+'/');await page.locator('#chat-message').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#chat-message').disabled);
  assert.equal(requests,0);
  await page.locator('#chat-message').fill('Synthetic unsent draft');
  await page.locator('#locale').selectOption('nl');
  await page.evaluate(()=>{history.pushState(null,'','/anmelden');window.dispatchEvent(new Event('popstate'));});
  await page.locator('.auth-fallback').waitFor();
  release();await page.getByRole('button',{name:'Afmelden',exact:true}).waitFor();
  assert.equal(await page.locator('#chat-message').inputValue(),'Synthetic unsent draft');
  assert.equal(await page.locator('#locale').inputValue(),'nl');assert.equal(requests,1);
 });
 await scenario('signout failure stays explicit and supports a later deliberate retry',async page=>{
  await page.addInitScript(()=>window.fixtureFail=true);
  await page.goto(origin+'/anmelden');const button=page.getByRole('button',{name:'Abmelden',exact:true});
  await button.click();await page.getByRole('alert').waitFor();
  assert.equal(await page.evaluate(()=>window.fixtureSignouts?.length||0),0);
  await page.evaluate(()=>window.fixtureFail=false);await button.click();
  await page.waitForFunction(()=>window.fixtureSignouts?.length===1);
  assert.equal(await page.getByRole('alert').count(),0);
 });
 await scenario('mobile signout is keyboard accessible with existing target size',async page=>{
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/anmelden');
  const button=page.getByRole('button',{name:'Abmelden',exact:true});await button.waitFor();
  const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44);
  await button.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.fixtureSignouts?.length===1);
 });
 await scenario('offline hash preview never initializes SDK even with fixture flag enabled',async page=>{
  let requests=0;page.on('request',request=>{if(request.url().includes('/tests/fixtures/clerk.tsx'))requests++;});
  await page.addInitScript(()=>window.__NEXIFY_STANDALONE_PREVIEW__=true);
  await page.goto(origin+'/#/anmelden');await page.locator('.auth-fallback').waitFor();
  assert.equal(requests,0);assert.equal(await page.getByRole('button',{name:'Abmelden',exact:true}).count(),0);
 });
 await scenario('widget locale follows DE NL FR selection',async page=>{
  await page.goto(origin+'/registrieren');await page.locator('[data-fixture-locale]').waitFor();
  for(const [locale,expected]of[['de','de-DE'],['nl','nl-NL'],['fr','fr-FR']]){
   await page.locator('#locale').selectOption(locale);
   await page.waitForFunction(value=>document.querySelector('[data-fixture-locale]')?.getAttribute('data-fixture-locale')===value,expected,{timeout:3000});
  }
 });
}finally{await browser.close();await server.close();}
if(failures)process.exitCode=1;
