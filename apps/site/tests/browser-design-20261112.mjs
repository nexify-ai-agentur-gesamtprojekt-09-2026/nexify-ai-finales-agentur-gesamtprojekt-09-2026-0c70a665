import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';
const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const width of [320,768,1440]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'offline_fixture'}}));
  for(const path of ['/','/leistungen','/leistungen/websites','/produkte/nex2fly','/produkte/aifly-oracle','/kontakt']) {
   await page.goto(origin+path); await page.locator('h1').first().waitFor();
   const heading=await page.locator('h1').first().innerText();
   const heroImages=page.locator('.pc-hero-media img');
   await heroImages.evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
   if(path==='/' && width===1440){
    const copy=await page.locator('.identity-copy').boundingBox(),media=await page.locator('.identity-media').boundingBox();
    assert.ok(copy && media && copy.x+copy.width<=media.x+1,'desktop hero copy must stay outside the film');
   }
   assert.doesNotMatch(heading,/Seite nicht verfügbar/i,`route ${path}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${path} ${width}`);
   if(path==='/kontakt') assert.equal(await page.getByTestId('contact-name').count(),1);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));
   await page.evaluate(()=>document.fonts.ready);
   const shot=await page.screenshot({type:'jpeg',quality:25,animations:'disabled',fullPage:true});
   console.log(`DESIGN_SCREENSHOT ${width} ${path} ${shot.toString('base64')}`);
   console.log(`PASS design ${width} ${path}: ${heading.replace(/\s+/g,' ')}`);
   if(path==='/kontakt'){
    await page.getByTestId('contact-name').fill('Synthetic Tester');
    await page.getByTestId('contact-email').fill('synthetic@example.invalid');
    await page.getByTestId('contact-message').fill('Synthetic offline test only.');
    await page.getByTestId('contact-consent').check();
    await page.getByTestId('contact-submit').click();
    await page.getByTestId('contact-error').waitFor();
    await page.getByTestId('contact-error').scrollIntoViewIfNeeded();
    console.log(`STATE_SCREENSHOT ${width} contact-error ${(await page.screenshot({type:'jpeg',quality:25})).toString('base64')}`);
   }
   const disclosure=page.locator('.hc-service-detail summary').first();
   if(await disclosure.count()){
    await disclosure.click();
    assert.equal(await disclosure.evaluate(e=>e.parentElement.open),true,`disclosure ${path} ${width}`);
    const openShot=await page.screenshot({type:'jpeg',quality:25,animations:'disabled'});
    console.log(`STATE_SCREENSHOT ${width} disclosure-${path} ${openShot.toString('base64')}`);
   }
  }
  await page.goto(origin);
  const mobile=page.getByTestId('mobile-navigation-toggle');
  if(await mobile.isVisible()){
   await mobile.focus(); await page.keyboard.press('Enter');
   assert.equal(await page.getByTestId('mobile-navigation').evaluate(e=>e.open),true,'mobile menu opens');
   console.log(`STATE_SCREENSHOT ${width} mobile-menu ${ (await page.screenshot({type:'jpeg',quality:25})).toString('base64') }`);
   await page.keyboard.press('Escape');
   assert.equal(await page.getByTestId('mobile-navigation').evaluate(e=>e.open),false,'mobile menu closes');
  } else {
   const desktop=page.getByTestId('desktop-products-megamenu-toggle');
   await desktop.focus(); await page.keyboard.press('Enter');
   assert.equal(await page.getByTestId('desktop-products-megamenu-panel').isVisible(),true,'desktop menu opens');
   await page.keyboard.press('Escape');
   assert.equal(await page.getByTestId('desktop-products-megamenu-panel').isVisible(),false,'desktop menu closes');
  }
  const launcher=page.getByTestId('chat-launcher');
  if(await launcher.isVisible()) await launcher.click();
  await page.getByTestId('chat-panel').waitFor({state:'visible'});
  console.log(`STATE_SCREENSHOT ${width} oracle-open ${(await page.screenshot({type:'jpeg',quality:25})).toString('base64')}`);
  await page.getByTestId('chat-panel-close-button').click();
  assert.equal(await page.getByTestId('chat-panel').isVisible(),false,'oracle closes');
  await context.close();
 }
} finally {await browser.close();await new Promise(done=>server.httpServer.close(done));}
