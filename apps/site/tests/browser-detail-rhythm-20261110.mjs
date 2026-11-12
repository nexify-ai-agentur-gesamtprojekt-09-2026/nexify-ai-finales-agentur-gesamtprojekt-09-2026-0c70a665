import {preview} from 'vite';
import {chromium} from 'playwright';

const root=new URL('../',import.meta.url).pathname;
const server=await preview({root,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const path of ['/leistungen/websites','/produkte/nex2fly']){
  for(const width of [375,768,1265]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   const page=await context.newPage();
   await page.goto(origin+path);
   await page.locator('.pc-hero').waitFor();
   const heroImage=page.locator('.pc-hero-media img');
   if(await heroImage.count()){
    await heroImage.evaluate(image=>image.decode());
    if(!await heroImage.evaluate(image=>image.complete&&image.naturalWidth>0))throw new Error(`Hero image missing: ${path} ${width}`);
   }
   const result=await page.evaluate(()=>{
    const box=selector=>document.querySelector(selector)?.getBoundingClientRect();
    const hero=box('.pc-hero'),image=box('.pc-hero-media'),first=box('.pc-section');
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,heroBottom:hero?.bottom,imageBottom:image?.bottom,firstSectionTop:first?.top};
   });
   if(result.overflow)throw new Error(`Horizontal overflow: ${path} ${width}`);
   if(result.imageBottom>result.heroBottom+1)throw new Error(`Image exceeds intro: ${path} ${width}`);
   if(width>=768&&result.firstSectionTop>900)throw new Error(`First concrete section starts below viewport: ${path} ${width} ${result.firstSectionTop}`);
   if(await page.locator('[data-testid^="page-finish-"] .hc-finish-cast').count())throw new Error(`Unverified finale portrait: ${path}`);
   if(width===1265)await page.screenshot({path:`/tmp/nexify-detail-${path.split('/').at(-1)}-1265-after.png`});
   results.push({path,width,...result});
   await context.close();
  }
 }
 console.log(JSON.stringify({passed:true,results}));
}finally{await browser.close();await new Promise(done=>server.httpServer.close(done));}
