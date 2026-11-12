import {preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const phase=process.argv[2]==='--after'?'after':'before';
const root=new URL('../',import.meta.url).pathname;
const destination=resolve(root,'../../ops/goal/EVIDENCE',phase);
await mkdir(destination,{recursive:true});
const server=await preview({root,preview:{host:'127.0.0.1',port:0}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const width of [320,375,768,1024,1265,1440]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'not_configured_in_local_preview'}}));
  await page.goto(origin);
  await page.locator('[data-testid="hero-grid"]').waitFor();
  await page.screenshot({path:resolve(destination,`home-${width}.png`)});
  const metrics=await page.evaluate(()=>{
   const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)};};
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,copy:rect('[data-testid="hero-copy"]'),media:rect('[data-testid="hero-media"]'),chat:rect('#aifly-panel'),chatVisible:!!document.querySelector('#aifly-panel:not([hidden])')};
  });
  results.push({width,...metrics});
  await context.close();
 }
 await writeFile(resolve(destination,'metrics.json'),JSON.stringify({phase,source:'local standalone build',results},null,2)+'\n');
 console.log(JSON.stringify({phase,results}));
}finally{await browser.close();await new Promise(done=>server.httpServer.close(done));}
