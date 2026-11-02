// Real local MP4 playback regression: visibility pause/resume, explicit pause,
// natural end/replay and a delayed local media response. No provider or business action.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin=process.env.PLAYBACK_BASE_URL||'http://127.0.0.1:3004';
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{}),args:['--no-sandbox']});
const checks=[],errors=[];
const media=JSON.parse(await readFile(new URL('../../../config/hero-film.json',import.meta.url),'utf8')).film;
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.route('**/*',route=>{
 const url=new URL(route.request().url());
 if(url.origin!==origin)return route.abort();
 if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated_preview"}'});
 return route.continue();
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const film=page.locator('.identity-media .atelier-film'),video=page.locator('.identity-media video'),button=page.locator('.identity-media .atelier-film-controls button').first();
async function check(id,fn){await fn();checks.push({id,passed:true});}
try{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(origin,{waitUntil:'networkidle'});
 await check('reduced_motion_does_not_autoplay',async()=>assert.equal(await video.evaluate(v=>v.paused),true));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await check('manual_pause_survives_scroll_away_and_back',async()=>{
  await page.waitForFunction(()=>!document.querySelector('.identity-media video').paused);
  await button.click();await page.waitForFunction(()=>document.querySelector('.identity-media video').paused);
  await page.evaluate(()=>scrollTo(0,1800));await page.waitForTimeout(200);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);
  assert.equal(await video.evaluate(v=>v.paused),true);
 });
 await check('playing_video_resumes_after_temporary_viewport_pause',async()=>{
  await button.click();await page.waitForFunction(()=>document.querySelector('.identity-media video').currentTime>.2);
  const before=await video.evaluate(v=>v.currentTime);
  await page.evaluate(()=>scrollTo(0,1800));await page.waitForFunction(()=>document.querySelector('.identity-media video').paused);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.querySelector('.identity-media video').paused);
  await page.waitForFunction(t=>document.querySelector('.identity-media video').currentTime>t+.15,before);
 });
 await check('actual_decode_advances_to_natural_end_and_exposes_replay',async()=>{
  await page.waitForFunction(()=>document.querySelector('.identity-media video').ended,{},{timeout:Math.ceil(media.duration_seconds*1000)+6000});
  assert.equal(await film.getAttribute('data-playback'),'ended');
  assert.equal(await button.getAttribute('aria-label'),'Erneut abspielen');
  assert.equal(await video.evaluate(v=>v.videoWidth),media.width);
 });
 await check('ended_video_restarts_from_beginning',async()=>{
  await button.click();await page.waitForFunction(()=>{const v=document.querySelector('.identity-media video');return !v.paused&&v.currentTime>.05&&v.currentTime<2;});
 });
 if(media.hasAudio){
  await check('sound_start_volume_and_captions_are_real_media_controls',async()=>{
   await page.getByRole('button',{name:'Film mit Ton starten',exact:true}).click();
   await page.waitForFunction(()=>{const v=document.querySelector('.identity-media video');return !v.paused&&!v.muted&&v.currentTime<2;});
   await page.locator('.identity-media .atelier-volume summary').click();
   const slider=page.locator('.identity-media input[type=range]');await slider.focus();await slider.press('Home');
   assert.equal(await video.evaluate(v=>v.volume),0);assert.equal(await video.evaluate(v=>v.muted),true);
   await page.getByRole('button',{name:'Film mit Ton starten',exact:true}).click();
   assert.ok(await video.evaluate(v=>v.volume>0&&!v.muted));
   const captions=page.getByRole('button',{name:'Untertitel',exact:true});
   await captions.click();assert.equal(await video.evaluate(v=>v.textTracks[0].mode),'hidden');
   await captions.click();assert.equal(await video.evaluate(v=>v.textTracks[0].mode),'showing');
   await page.locator('.identity-media .atelier-volume summary').click();
   await page.locator('.identity-media .atelier-film-transcript summary').click();
   assert.equal(await page.locator('.identity-media .atelier-film-transcript p').innerText(),media.transcript);
  });
 }
 await check('delayed_media_has_visible_loading_then_real_playback',async()=>{
  const slow=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await slow.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{"error":"isolated_preview"}'});
   if(url.pathname===media.src)await new Promise(resolve=>setTimeout(resolve,1800));
   return route.continue();
  });
  const p=await slow.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin,{waitUntil:'domcontentloaded'});
  await p.locator('.identity-media .atelier-film-controls button').first().click();
  await p.locator('.identity-media .atelier-film-loading').waitFor({state:'visible'});
  await p.waitForFunction(()=>document.querySelector('.identity-media video').currentTime>.1);
  assert.equal(await p.locator('.identity-media .atelier-film-loading').count(),0);await slow.close();
 });
 assert.deepEqual(errors,[]);
 await mkdir(new URL('../../../docs/design/',import.meta.url),{recursive:true});
 const report={scope:'compiled local Home, real H264 decoding, no external services',checks,pageErrors:errors,sound:media.hasAudio,physicalSafari:false};
 await writeFile(new URL('../../../docs/design/home-studio-playback-2026-11-02.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
