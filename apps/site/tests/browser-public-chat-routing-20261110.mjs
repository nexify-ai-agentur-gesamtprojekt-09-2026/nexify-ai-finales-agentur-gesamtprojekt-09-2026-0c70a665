import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

// Real local browser; all API calls are synthetic and all external traffic is blocked.
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,server:{host:'127.0.0.1',port:0,strictPort:false},
  define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const cases=[];
try {
 for(const width of [390,1440]) for(const path of ['/','/teileklar']) {
  const requests=[];const external=[];
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('**/*',route=>{
   const request=route.request();const url=new URL(request.url());
   if(url.origin!==origin && url.protocol!=='data:'){external.push(url.origin);return route.abort();}
   if(!url.pathname.startsWith('/api/'))return route.continue();
   requests.push(`${request.method()} ${url.pathname}`);
   if(url.pathname==='/api/session')return route.fulfill({json:{csrf:'synthetic',history:[],capabilities:{quote_pdf:false,pending_outbox:false,booking_request:false,marketing_template:false,email_delivery:false,external_calendar:false,model_chat:true,local_planning:true,speech_readout:false,chatgpt_option:true}}});
   if(url.pathname==='/api/chat')return route.fulfill({json:{intent:'choose'}});
   return route.fulfill({status:503,json:{error:'synthetic_unavailable'}});
  });
  await page.goto(origin+path);await page.locator('main h1').first().waitFor();
  const launcher=page.locator('.reopen-chat');
  if(!await page.locator('#aifly-panel').isVisible())await launcher.click();
  const panel=page.locator('#aifly-panel');await panel.waitFor({state:'visible'});
  await page.locator('[data-testid="chat-status"][data-state="connected"]').waitFor({state:'attached'});
  // Existing project-intent entry point; it opens the workspace without invoking a provider.
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nexify-action',{detail:'quote'})));
  const input=page.locator('[data-testid="chat-composer-textarea"]');
  try{await input.waitFor({state:'visible',timeout:8000});}catch(error){console.error(JSON.stringify({path,width,requests,panel:await panel.innerText()}));throw error;}
  await page.locator('[data-testid="chat-hints-toggle"]').click();
  assert.equal(await page.locator('[data-testid="chat-live-ai-toggle"]').count(),0);
  assert.doesNotMatch(await panel.innerText(),/ChatGPT/i);
  assert.match(await panel.innerText(),/Passwörter|vertraulichen Daten/);
  if(path==='/teileklar')assert.match(await panel.innerText(),/Fahrzeug|Teil/);
  await input.fill('Ich benötige Unterstützung für mein Vorhaben.');
  await page.locator('[data-testid="chat-send-button"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.message.user').length>0);
  assert.ok(requests.includes('POST /api/chat'));
  assert.ok(!requests.some(x=>x.includes('/api/assistant/chatgpt')));
  assert.deepEqual(external,[]);
  if(width===390){
   await page.locator('[data-testid="chat-panel-close-button"]').click();
   await page.waitForFunction(()=>!document.querySelector('#aifly-panel')?.checkVisibility());
   await page.waitForFunction(()=>document.activeElement?.classList.contains('reopen-chat'));
  }
  cases.push({width,path,syntheticSession:true,publicProviderToggle:false,planningRequest:true,externalRequests:0});
  await page.close();
 }
 console.log(JSON.stringify({cases,scope:'local synthetic APIs; no live model or production'}));
} finally {await browser.close();await server.close();}
