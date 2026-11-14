import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const [width,reducedMotion] of [[1440,'no-preference'],[390,'no-preference'],[390,'reduce']]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion});
  const page=await context.newPage();
  await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'local_unconfigured'}}));
  await page.goto(origin);
  const video=page.locator('.identity-hero video');
  await video.waitFor();
  const poster=await video.getAttribute('poster');
  const src=await video.getAttribute('src');
  assert.equal(poster,'/media/higgsfield/hf-02-lobby-walk-1920.webp');
  assert.equal(src,'/media/scenes/eingangshalle-20261114.mp4');
  assert.equal((await context.request.get(origin+poster)).status(),200);
  assert.equal((await context.request.get(origin+src)).status(),200);
  await page.waitForTimeout(500);
  let state=await video.evaluate(e=>({paused:e.paused,muted:e.muted,time:e.currentTime,ready:e.readyState,width:e.videoWidth,height:e.videoHeight}));
  if(reducedMotion==='reduce')assert.equal(state.paused,true);
  const controls=await page.locator('.identity-hero .atelier-film-controls button').count();
  assert.ok(controls>=2);
  if(reducedMotion==='no-preference'&&state.muted){
   await page.locator('.identity-hero .atelier-film-controls button').nth(1).click();
   await page.waitForFunction(()=>{const v=document.querySelector('.identity-hero video');return v&&!v.paused&&!v.muted;});
   state=await video.evaluate(e=>({paused:e.paused,muted:e.muted,time:e.currentTime,ready:e.readyState,width:e.videoWidth,height:e.videoHeight}));
   assert.equal(state.muted,false);
   assert.equal(state.paused,false);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  results.push({width,reducedMotion,poster,src,controls,state});
  await context.close();
 }
 await mkdir('evidence/video-rollout-2026-11-09',{recursive:true});
 await writeFile('evidence/video-rollout-2026-11-09/hero-browser.json',JSON.stringify({renderer:'standalone local',results,passed:true},null,2)+'\n');
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
