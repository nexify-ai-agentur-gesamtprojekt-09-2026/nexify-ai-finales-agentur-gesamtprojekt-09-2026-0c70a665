import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';

const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
try {
 for(const width of [320,375,768,1165,1440]) {
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(origin);
  const video=page.locator('.identity-hero video'), controls=page.locator('.identity-hero .atelier-film-controls');
  await video.waitFor();
  const v=await video.boundingBox(), c=await controls.boundingBox();
  assert.ok(v&&c&&c.x>=v.x-1&&c.x+c.width<=v.x+v.width+1&&c.y>=v.y&&c.y+c.height<=v.y+v.height+1,'controls inside video '+width);
  assert.equal(await page.locator('.identity-hero-video-note').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow '+width);
  if(width===1165) {
   const media=await page.locator('.identity-media').boundingBox(), copy=await page.locator('.identity-copy').boundingBox(), panel=await page.locator('.aifly-panel').boundingBox();
   assert.ok(media&&copy&&panel&&panel.width<=325,'panel width '+width);
   assert.ok(copy.y<media.y+media.height,'hero copy remains beside video '+width);
  }
  const play=controls.locator('button').first();
  await play.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('.identity-hero video').paused);
  await page.keyboard.press('Space');
  assert.equal(await video.evaluate(v=>v.paused),true,'keyboard pause '+width);
  const sound=controls.locator('button').nth(1);
  await sound.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(()=>!document.querySelector('.identity-hero video').muted);
  await page.keyboard.press('Enter');
  assert.equal(await video.evaluate(v=>v.muted),true,'keyboard mute '+width);
  await controls.locator('.atelier-volume summary').click();
  const popup=controls.locator('.atelier-volume>div'); await popup.waitFor();
  const p=await popup.boundingBox(); assert.ok(p&&p.x>=v.x&&p.x+p.width<=v.x+v.width&&p.y>=v.y&&p.y+p.height<=v.y+v.height,'volume popup inside image '+width);
  const input=popup.locator('input'); const hit=await input.evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e});
  assert.equal(hit,true,'slider reachable '+width);
  await context.close();
  console.log('PASS hero '+width);
 }
} finally {await browser.close();await new Promise(done=>server.httpServer.close(done));}
