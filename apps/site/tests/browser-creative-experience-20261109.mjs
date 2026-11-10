import {preview} from 'vite';
import {chromium} from 'playwright';
import {resolve} from 'node:path';

const root=new URL('../',import.meta.url).pathname;
const evidence=resolve(root,'../../ops/goal/EVIDENCE/after');
const server=await preview({root,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const width of [320,360,375,390,430,768,820,1024,1265,1280,1440,1480,1920]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(origin);
  await page.locator('[data-testid="hero-grid"]').waitFor();
  await page.waitForTimeout(900);
  const placement=await page.evaluate(()=>{
   const box=s=>document.querySelector(s)?.getBoundingClientRect();
   const film=box('[data-testid="hero-media"]'),copy=box('[data-testid="hero-copy"]');
   const hero=box('.identity-hero .identity-scene'),gallery=[...document.querySelectorAll('.hc-gallery .hc-art')].map(node=>node.getBoundingClientRect());
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,filmTop:film?.top,filmBottom:film?.bottom,heroBottom:hero?.bottom,copyTop:copy?.top,galleryWidths:gallery.map(node=>node.width)};
  });
  if(placement.overflow)throw new Error(`Horizontal overflow at ${width}`);
  if(width<=820&&placement.filmTop>placement.copyTop)throw new Error(`Film below copy at ${width}`);
  if(width>820&&placement.filmTop>placement.copyTop+70)throw new Error(`Film too low at ${width}`);
  if(width>820&&placement.filmBottom>placement.heroBottom+1)throw new Error(`Film exceeds hero section at ${width}: ${placement.filmBottom}-${placement.heroBottom}`);
  if(width===768&&placement.galleryWidths[2]<placement.galleryWidths[0]*.9)throw new Error(`Third gallery image too narrow at ${width}: ${placement.galleryWidths}`);
  const chat=page.locator('#aifly-panel');
  if(width>820&&!await chat.isVisible())throw new Error(`Desktop Oracle hidden at ${width}`);
  if(width<=820){
   const overlapping=await page.evaluate(()=>{
    const action=document.querySelector('[data-testid="hero-project-link"]')?.getBoundingClientRect();
    const launcher=document.querySelector('[data-testid="chat-launcher"]')?.getBoundingClientRect();
    return !!action&&!!launcher&&action.left<launcher.right&&action.right>launcher.left&&action.top<launcher.bottom&&action.bottom>launcher.top;
   });
   if(overlapping)throw new Error(`Mobile chat launcher covers hero action at ${width}`);
   await page.locator('[data-testid="hero-project-link"]').click();
   await page.locator('#orientation-message').waitFor({state:'visible'});
   if(!await chat.isVisible())throw new Error(`Mobile Oracle hidden after action at ${width}`);
   if(await page.evaluate(()=>document.activeElement?.id)!=='orientation-message')throw new Error(`Mobile composer unfocused at ${width}`);
  }
  if(width===320||width===1265)await page.screenshot({path:resolve(evidence,`creative-${width}.png`)});
  if(width===1265){
   if(await page.locator('.chat-return').isVisible())throw new Error('Next-step rail visible before first answer');
   const gallery=page.locator('.hc-gallery');
   if(await gallery.locator('.hc-scene-context').count()!==3||await gallery.locator('.hc-scene-value').count()!==3)throw new Error('Scene narrative incomplete');
   await gallery.scrollIntoViewIfNeeded();
   await gallery.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>undefined))));
   const broken=await gallery.locator('img').evaluateAll(images=>images.map(image=>({src:image.currentSrc,loaded:image.complete&&image.naturalWidth>0})).filter(image=>!image.loaded));
   if(broken.length)throw new Error(`Gallery images failed to load: ${JSON.stringify(broken)}`);
   await page.screenshot({path:resolve(evidence,'creative-gallery-1265.png')});
   const finish=page.locator('.hc-finish');
   await finish.scrollIntoViewIfNeeded();
   if(await finish.locator('.hc-finish-cast').count())throw new Error('Unverified portrait still used in finale');
   await page.locator('[data-testid="finish-project-action"]').click();
   await page.waitForFunction(()=>document.activeElement?.id==='orientation-message');
   await page.screenshot({path:resolve(evidence,'creative-finale-1265.png')});
  }
  results.push({width,...placement,chatVisible:await chat.isVisible()});
  await context.close();
 }
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();await new Promise(done=>server.httpServer.close(done));}
