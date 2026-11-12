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
  for(const path of ['/','/leistungen','/produkte/nex2fly','/kontakt']) {
   await page.goto(origin+path); await page.locator('h1').first().waitFor();
   const heading=await page.locator('h1').first().innerText();
   assert.doesNotMatch(heading,/Seite nicht verfügbar/i,`route ${path}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`overflow ${path} ${width}`);
   if(path==='/kontakt') assert.equal(await page.getByTestId('contact-name').count(),1);
   const shot=await page.screenshot({type:'jpeg',quality:35,animations:'disabled'});
   console.log(`DESIGN_SCREENSHOT ${width} ${path} ${shot.toString('base64')}`);
   console.log(`PASS design ${width} ${path}: ${heading.replace(/\s+/g,' ')}`);
  }
  await page.goto(origin);
  const mobile=page.getByTestId('mobile-navigation-toggle');
  if(await mobile.isVisible()){
   await mobile.focus(); await page.keyboard.press('Enter');
   assert.equal(await page.getByTestId('mobile-navigation').evaluate(e=>e.open),true,'mobile menu opens');
   await page.keyboard.press('Escape');
   assert.equal(await page.getByTestId('mobile-navigation').evaluate(e=>e.open),false,'mobile menu closes');
  } else {
   const desktop=page.getByTestId('desktop-products-megamenu-toggle');
   await desktop.focus(); await page.keyboard.press('Enter');
   assert.equal(await page.getByTestId('desktop-products-megamenu-panel').isVisible(),true,'desktop menu opens');
   await page.keyboard.press('Escape');
   assert.equal(await page.getByTestId('desktop-products-megamenu-panel').isVisible(),false,'desktop menu closes');
  }
  await context.close();
 }
} finally {await browser.close();await new Promise(done=>server.httpServer.close(done));}
