// NEX-MEDIA-SYNC-20261030-01 — real functional browser proof of Weg B behaviour on actual media.
// Serves the built apps/site, runs Chromium with MOTION ON and drives the real <audio>/<video>
// elements of welcome/project/choice: start, pause (audio+loop time frozen), seek (loop = master
// modulo clip duration), resume, replay, and cross-scene single-audible. Captures mediaTime vs
// master time, viewport and browser. No provider/generation calls. Makes NO lip-sync claim.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url));
const server=await preview({root:root+'apps/site',preview:{host:'127.0.0.1',port:0,strictPort:false}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const report={scope:'real measured Weg B media behaviour',origin,scenes:{},limits:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const SCENES=['hero','home-project','home-choice'];
const viewport={width:390,height:844};
try{
 const context=await browser.newContext({viewport});
 // keep API inert, but never block same-origin media
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{error:'local_unconfigured'}});return r.continue();});
 const page=await context.newPage();const perr=[];page.on('pageerror',e=>perr.push(e.name));
 report.userAgent=await page.evaluate(()=>navigator.userAgent).catch(()=>null);
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 report.userAgent=await page.evaluate(()=>navigator.userAgent);
 // close the chat panel if it overlays the hero controls
 try{if(await page.locator('#aifly-panel').isVisible())await page.locator('.panel-heading .icon-button').click({timeout:2000});}catch{}
 // read live media state for a scene id
 const read=id=>page.evaluate(sid=>{const a=document.querySelector(`[data-testid="${sid}-audio"]`);const v=document.querySelector(`[data-testid="${sid}-clips"] .trio-clip-loop`);return{hasAudio:!!a,master:a?a.currentTime:null,audioPaused:a?a.paused:null,audioDur:a?a.duration:null,hasLoop:!!v,loopTime:v?v.currentTime:null,loopPaused:v?v.paused:null,loopDur:v&&Number.isFinite(v.duration)?v.duration:null};},id);
 const setMaster=(id,t)=>page.evaluate(({sid,tt})=>{const a=document.querySelector(`[data-testid="${sid}-audio"]`);return new Promise(res=>{if(!a)return res(false);const done=()=>{a.removeEventListener('seeked',done);res(true);};a.addEventListener('seeked',done);a.currentTime=tt;setTimeout(()=>res(true),1500);});},{sid:id,tt:t});
 for(const id of SCENES){
  const r={viewport,steps:{}};
  const toggle=page.locator(`[data-testid="${id}-play-toggle"]`);
  try{
   await toggle.scrollIntoViewIfNeeded({timeout:4000});
   await sleep(700); // let IntersectionObserver kick the ambient loop
   r.steps.initial=await read(id);
   // START
   await toggle.click({timeout:4000,force:true});
   await sleep(900);
   const started=await read(id);r.steps.started=started;
   assert.ok(started.hasAudio&&started.hasLoop,`${id}: audio+loop present`);
   assert.ok(started.master>0.05,`${id}: master clock advances on start (got ${started.master})`);
   assert.equal(started.loopPaused,false,`${id}: ambient loop plays while scene plays`);
   // PAUSE → audio + loop time frozen
   await toggle.click({timeout:4000,force:true});
   await sleep(200);const p1=await read(id);await sleep(600);const p2=await read(id);
   r.steps.pausedA=p1;r.steps.pausedB=p2;
   assert.equal(p2.audioPaused,true,`${id}: audio paused`);
   assert.equal(p2.loopPaused,true,`${id}: ambient loop FROZEN on pause (Weg B)`);
   assert.ok(Math.abs(p2.master-p1.master)<0.08,`${id}: master frozen while paused`);
   assert.ok(Math.abs(p2.loopTime-p1.loopTime)<0.08,`${id}: loop time frozen while paused`);
   // SEEK → loop position = master modulo clip duration
   const target=Math.min(20,(p2.audioDur||25)-3);
   await setMaster(id,target);await sleep(300);const s=await read(id);r.steps.seek={target,...s};
   if(s.loopDur){const expected=target%s.loopDur;const tol=Math.max(0.4,s.loopDur*0.06);
    r.steps.seek.expectedLoop=expected;r.steps.seek.drift=Math.abs(s.loopTime-expected);
    assert.ok(Math.abs(s.loopTime-expected)<=tol,`${id}: loop = master%%dur after seek (loop ${s.loopTime.toFixed(2)} vs exp ${expected.toFixed(2)}, tol ${tol.toFixed(2)})`);
   }else r.limits.push&&report.limits.push(`${id}: loop duration unavailable (metadata) — modulo check skipped`);
   // RESUME
   await toggle.click({timeout:4000,force:true});await sleep(800);const res=await read(id);r.steps.resumed=res;
   assert.equal(res.audioPaused,false,`${id}: resumes playing`);
   assert.ok(res.master>=target-0.5,`${id}: master continues from seek`);
   // REPLAY (if restart control present)
   const restart=page.locator(`[data-testid="${id}-restart"]`);
   if(await restart.count()&&await restart.first().isVisible()){await restart.first().click({timeout:3000,force:true});await sleep(500);r.steps.replayed=await read(id);assert.ok(r.steps.replayed.master<3,`${id}: replay resets master`);}
   // CROSS-SCENE single audible: another presenter-play must pause this scene
   await toggle.click({timeout:3000,force:true}).catch(()=>{});await sleep(400);
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nexify:presenter-play',{detail:'another-scene'})));
   await sleep(400);const other=await read(id);r.steps.crossScenePaused=other;
   assert.equal(other.audioPaused,true,`${id}: cross-scene start pauses this audio (single audible)`);
   r.ok=true;
  }catch(err){r.ok=false;r.error=String(err&&err.message||err);report.scenes[id]=r;throw err;}
  report.scenes[id]=r;
 }
 report.pageErrors=perr;
 assert.deepEqual(perr,[],'no page errors during media behaviour');
 report.passed=true;
 await context.close();
}finally{
 await browser.close();await server.httpServer.close();
 const out=root+'.local/media-sync';await mkdir(out,{recursive:true});
 await writeFile(out+'/browser-media-sync.json',JSON.stringify(report,null,1));
 console.log(JSON.stringify({passed:!!report.passed,viewport,userAgent:report.userAgent,scenes:Object.fromEntries(Object.entries(report.scenes).map(([k,v])=>[k,{ok:v.ok,startMaster:v.steps?.started?.master,seekDrift:v.steps?.seek?.drift,loopDur:v.steps?.started?.loopDur}])),limits:report.limits}));
}
