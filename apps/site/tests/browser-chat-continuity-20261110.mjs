import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';

const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'local_unavailable'}}));
 await page.goto(origin);
 await page.locator('[data-testid="hero-project-link"]').click();
 const input=page.locator('#orientation-message');
 await input.fill('Ich brauche eine Website für meinen Handwerksbetrieb.');
 await page.locator('.orientation-composer button.primary-button').click();
 await page.locator('.orientation-message.role-assistant').first().waitFor();
 await input.fill('Wie lange dauert das und was kostet es?');
 await page.locator('.orientation-composer button.primary-button').click();
 await page.waitForFunction(()=>document.querySelectorAll('.orientation-message.role-assistant').length===2);
 const answer=page.locator('.orientation-message.role-assistant').last();
 assert.match(await answer.innerText(),/Dauer und Gesamtpreis/);
 assert.equal(await answer.locator('a[href="/preise-ablauf"]').count(),1);
 await page.evaluate(()=>{history.pushState(null,'','/teileklar');dispatchEvent(new PopStateEvent('popstate'));});
 await page.waitForURL('**/teileklar');
 await page.waitForFunction(()=>document.querySelectorAll('.orientation-message.role-user').length===0);
 console.log(JSON.stringify({contextualFollowUp:true,pricingLink:true,tenantReset:true}));
 await page.close();
 for(const source of ['hero','footer']){
  const view=await browser.newPage({viewport:{width:390,height:844}});
  await view.route('**/api/**',route=>new URL(route.request().url()).pathname==='/api/session'?route.fulfill({json:{csrf:'synthetic-test-only',history:[],capabilities:{quote_pdf:false,pending_outbox:false,booking_request:false,marketing_template:false,email_delivery:false,external_calendar:false,model_chat:false,local_planning:false}}}):route.fulfill({status:503,json:{error:'local_unavailable'}}));
  await view.goto(origin);
  if(source==='footer')await view.locator('[data-testid="footer-intro"]').scrollIntoViewIfNeeded();
  const selector=source==='hero'?'[data-testid="hero-project-link"]':'.reopen-chat';
  const trigger=view.locator(selector);await trigger.scrollIntoViewIfNeeded();await trigger.click();
  await view.waitForFunction(()=>document.activeElement?.id==='orientation-message',{timeout:10000});
  await view.locator('[data-testid="chat-panel-close-button"]').click();
  await view.waitForFunction(sel=>document.activeElement===document.querySelector(sel),selector);
  await view.close();
 }
 console.log(JSON.stringify({successfulSession:true,heroAndFooterFocusReturn:true}));
 for(const width of [320,390,768]){
  const view=await browser.newPage({viewport:{width,height:844}});
  await view.route('**/api/**',route=>route.fulfill({status:503,json:{error:'local_unavailable'}}));
  await view.goto(origin+'/kontakt');await view.locator('footer').waitFor();
  const bounds=await view.evaluate(()=>{const r=document.querySelector('footer').getBoundingClientRect();return {start:r.top+scrollY,end:r.bottom+scrollY};});
  for(let y=Math.max(0,bounds.start-844);y<bounds.end;y+=100){
   await view.evaluate(offset=>scrollTo(0,offset),y);await view.waitForTimeout(25);
   const collisions=await view.evaluate(()=>{const launcher=document.querySelector('.reopen-chat');if(!launcher||getComputedStyle(launcher).visibility==='hidden')return ['launcher unavailable'];const a=launcher.getBoundingClientRect();return [...document.querySelectorAll('footer p,footer a,footer button,footer h2,footer summary')].filter(element=>{const b=element.getBoundingClientRect();return element.checkVisibility()&&getComputedStyle(element).visibility!=='hidden'&&b.width>0&&b.height>0&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}).map(element=>element.textContent?.trim().slice(0,60));});
   assert.deepEqual(collisions,[],`footer launcher collision at ${width}px, scroll ${y}`);
  }
  await view.close();
 }
 console.log(JSON.stringify({footerLauncherWidths:[320,390,768],noVisibleOverlap:true}));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
