// Internal screenshots only. Synthetic held request tests UI state; no model/provider.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
await generate();const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const sources=['apps/web/components/OracleCompanion.tsx','apps/web/components/OracleCompanion.css','apps/web/components/Workspace.tsx','apps/web/components/PublicOrientationChat.tsx','apps/web/lib/i18n.ts','apps/site/tests/browser-oracle-companion.mjs','apps/web/app/globals.css','apps/web/components/WorkspaceRebuild.css','apps/web/components/PublicOrientationChat.css','packages/tokens/tokens.css','apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png'];
async function hashes(){return Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(repo+path)).digest('hex')])));}
const before=await hashes(),directory=repo+'.local/oracle-companion';await mkdir(directory,{recursive:true});
async function bounded(promise){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('synthetic request did not reach the held adapter')),5000);})]);}finally{clearTimeout(timer);}}
const cache=await mkdtemp(join(tmpdir(),'nexify-oracle-'));const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false,hmr:false},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`,browser=await chromium.launch({headless:true});
const report={scope:'local Vite and shared companion;synthetic request,not provider or assistive-technology certification',checks:[],runtime_errors:[],external_requests:[],source_sha256:before,screenshots:'internal_QA_only',video_animation_delivered:false};
try{
 for(const width of [320,390,1280])for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion});let held,release;
  const requestHeld=new Promise(resolve=>{held=resolve;});const requestRelease=new Promise(resolve=>{release=resolve;});
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());if(url.origin!==origin){report.external_requests.push(url.origin);return route.abort();}
   if(url.pathname==='/api/session')return route.fulfill({status:404,json:{error:'synthetic_session_unavailable'}});
   if(url.pathname==='/api/agent-chat'){held();await requestRelease;return route.fulfill({status:503,json:{error:'synthetic_unavailable'}});}
   if(url.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'synthetic_unavailable'}});
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.runtime_errors.push(e.message));
  try{
   await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();
   if(width<=820){await page.locator('.reopen-chat').focus();await page.keyboard.press('Enter');}
   await page.locator('.public-orientation').waitFor();
   const avatar=page.locator('.panel-heading .oracle-companion'),img=avatar.locator('img');
   assert.equal(await page.locator('.panel-heading h2').innerText(),'AI Fly Oracle');
   assert.equal(await avatar.getAttribute('aria-hidden'),'true');assert.equal(await img.getAttribute('alt'),'');
   assert.equal(await img.evaluate(i=>i.complete&&i.naturalWidth===512&&i.naturalHeight===512),true);
   const response=await context.request.get(origin+await img.getAttribute('src'));assert.equal(createHash('sha256').update(await response.body()).digest('hex'),before[sources.at(-1)]);
   await page.locator('#orientation-message').fill('Synthetic request for UI state');await page.locator('.orientation-composer button[type="submit"],.orientation-composer .primary-button').click();await bounded(requestHeld);
   await page.waitForFunction(()=>document.querySelector('.panel-heading .oracle-companion')?.getAttribute('data-state')==='working');
   await page.waitForTimeout(220);
   const style=await img.evaluate(i=>({transform:getComputedStyle(i).transform,transition:getComputedStyle(i).transitionDuration,animation:getComputedStyle(i).animationName}));
   assert.equal(style.animation,'none');if(reducedMotion==='reduce'){assert.equal(style.transform,'none');assert.equal(style.transition,'0s');}else assert.notEqual(style.transform,'none');
   const shape=await page.evaluate(()=>{
    const a=document.querySelector('.panel-heading .oracle-companion').getBoundingClientRect(),heading=document.querySelector('.panel-heading h2').getBoundingClientRect(),close=document.querySelector('.panel-heading .icon-button').getBoundingClientRect();
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,overlapsText:a.right>heading.left,overlapsClose:a.right>close.left,headingVisible:heading.right<=close.left};
   });assert.deepEqual(shape,{overflow:false,overlapsText:false,overlapsClose:false,headingVisible:true});
   const accessibility=await page.locator('#aifly-panel').ariaSnapshot();assert.ok(accessibility.includes('AI Fly Oracle'));assert.ok(!accessibility.includes('ai-fly-oracle-avatar'));
   await page.screenshot({path:`${directory}/${width}-${reducedMotion}.png`});
   release();await page.locator('.public-orientation .error-note').waitFor();await page.waitForFunction(()=>document.querySelector('.panel-heading .oracle-companion')?.getAttribute('data-state')==='idle');
   assert.equal(await page.locator('#orientation-message').inputValue(),'Synthetic request for UI state');
   await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Enter');await page.locator('.reopen-chat').waitFor();assert.match(await page.locator('.reopen-chat').innerText(),/AI Fly Oracle/);
   report.checks.push({width,reducedMotion,working_state:true,error_returns_idle:true,draft_preserved:true,decorative_image:true,keyboard:true,geometry:shape,working_style:style,accessibility_snapshot_checked:true});
  }finally{release();await context.close();}
 }
 assert.deepEqual(report.runtime_errors,[]);assert.deepEqual(report.external_requests,[]);assert.deepEqual(await hashes(),before);report.passed=true;
}finally{await browser.close();await server.close();await rm(cache,{recursive:true,force:true});await writeFile(directory+'/browser.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({checks:report.checks.length,passed:report.passed}));
