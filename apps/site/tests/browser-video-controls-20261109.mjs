import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const server=await preview({root:new URL('../',import.meta.url).pathname,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const width of [320,375,768,1265,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'local_test'}}));
  await page.goto(origin);
  const picture=page.locator('.identity-hero .atelier-film-picture');await picture.waitFor();
  const geometry=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}:null;};
   return {video:rect('.identity-hero video'),controls:rect('.identity-hero .atelier-film-controls'),caption:rect('.identity-hero-video-note'),volume:rect('.identity-hero .atelier-volume summary'),overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.ok(geometry.video&&geometry.controls&&geometry.volume);
  assert.equal(geometry.caption,null,'no caption rail at '+width);
  assert.ok(geometry.controls.top>=geometry.video.top && geometry.controls.bottom<=geometry.video.bottom+1,'controls inside video at '+width);
  assert.ok(geometry.volume.top>=geometry.controls.top&&geometry.volume.bottom<=geometry.controls.bottom+1,'volume button stays in controls at '+width);
  assert.equal(geometry.overflow,false);
  await page.locator('.identity-hero .atelier-volume summary').click();
  const panel=page.locator('.identity-hero .atelier-volume>div');await panel.waitFor();
  const popup=await panel.boundingBox();assert.ok(popup&&popup.x>=0&&popup.x+popup.width<=width+1,'volume panel inside viewport at '+width);
  assert.ok(popup.y>=0&&popup.y+popup.height<=900,'volume panel vertically inside viewport at '+width);
  const visibleAtEdges=await panel.evaluate(element=>{const box=element.getBoundingClientRect(),x=box.left+Math.min(20,box.width/2);return [box.top+12,box.bottom-12].every(y=>element.contains(document.elementFromPoint(x,y)));});
  assert.equal(visibleAtEdges,true,'volume panel not clipped at '+width);
  const slider=page.locator('.identity-hero .atelier-volume input');
  const sliderHit=await slider.evaluate(element=>{const box=element.getBoundingClientRect();return document.elementFromPoint(box.left+box.width/2,box.top+box.height/2)===element;});
  assert.equal(sliderHit,true,'volume slider not covered at '+width);
  await slider.fill('0.5');
  assert.equal(await slider.inputValue(),'0.5','volume slider responds at '+width);
  results.push({width,geometry,popup});
  await context.close();
 }
 await mkdir('evidence/video-rollout-2026-11-09',{recursive:true});
 await writeFile('evidence/video-rollout-2026-11-09/controls-browser.json',JSON.stringify({passed:true,results},null,2)+'\n');
 console.log(JSON.stringify({passed:true,widths:results.map(result=>result.width)}));
}finally{await browser.close();await new Promise(done=>server.httpServer.close(done));}
