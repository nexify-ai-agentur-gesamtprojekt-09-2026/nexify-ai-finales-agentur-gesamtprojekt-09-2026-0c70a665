import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';
const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const scenario of ['invalid-html','accepted']) {
  const context=await browser.newContext({viewport:{width:390,height:900}});
  const page=await context.newPage(); const keys=[];
  await page.route('**/api/**',async route=>{
   if(new URL(route.request().url()).pathname==='/api/requests'&&route.request().method()==='POST'){
    keys.push(route.request().headers()['idempotency-key']);
    return scenario==='invalid-html'?route.fulfill({status:200,contentType:'text/html',body:'<html>fallback</html>'}):route.fulfill({status:201,json:{number:'NX-TEST-12345678',status:'eingegangen',notification_status:'wartend'}});
   }
   return route.fulfill({status:503,json:{error:'offline_fixture'}});
  });
  await page.goto(origin+'/kontakt');
  await page.getByTestId('contact-name').fill('Synthetic Tester');
  await page.getByTestId('contact-email').fill('synthetic@example.invalid');
  await page.getByTestId('contact-message').fill('Synthetic offline test request only.');
  await page.getByTestId('contact-consent').check();
  await page.getByTestId('contact-submit').click();
  if(scenario==='invalid-html'){
   await page.getByTestId('contact-error').waitFor();
   assert.equal(await page.getByTestId('contact-success').count(),0);
   assert.equal(await page.getByTestId('contact-email-fallback').getAttribute('href'),'mailto:mail@nexifyai.cloud');
   await page.getByTestId('contact-submit').click();
   await page.waitForFunction(()=>!document.querySelector('[data-testid="contact-submit"]').disabled);
   assert.equal(keys.length,2);assert.ok(keys[0]);assert.equal(keys[0],keys[1],'uncertain retry must reuse key');
  }else{
   await page.getByTestId('contact-success').waitFor();
   assert.equal(await page.getByTestId('contact-number').innerText(),'NX-TEST-12345678');
   assert.match(await page.getByTestId('contact-notification-status').innerText(),/noch nicht bestätigt/);
   assert.equal(await page.getByTestId('contact-email-fallback').count(),0);
  }
  console.log('PASS contact '+scenario);await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.httpServer.close(done));}
