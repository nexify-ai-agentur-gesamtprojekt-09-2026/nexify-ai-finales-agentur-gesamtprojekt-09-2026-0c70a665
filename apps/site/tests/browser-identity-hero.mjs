// Actual regular Hero and two editorial compositions; no provider or generated media.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer as allocator} from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url)),renderer=process.env.IDENTITY_RENDERER||'vite';assert.ok(['vite','next'].includes(renderer));
const paths=['apps/web/components/Workspace.tsx','apps/web/components/SiteNavigation.tsx','config/identity-hero.json','config/interim-scene-images.json','config/companion-avatar.json','config/page-explainers.json','config/page-media-registry.json','config/design-tokens.json','apps/web/components/IdentityIllustration.tsx','apps/web/components/IdentityIllustration.css','apps/web/components/HomeContent.tsx','apps/web/components/HomeRebuild.css','apps/web/components/ExplainerSections.tsx','apps/web/components/PresenterScene.tsx','apps/web/components/PresenterEditorial.css','apps/web/components/WorkspaceRebuild.css','apps/web/app/globals.css','packages/tokens/tokens.css','apps/site/tests/browser-identity-hero.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')]))),before=await hashes();
const assets=JSON.parse(await readFile(root+'config/interim-scene-images.json','utf8')).images;
const out=root+'.local/identity-hero/'+renderer;await mkdir(out,{recursive:true});
const cwd=root+(renderer==='vite'?'apps/site':'apps/web'),env={PATH:process.env.PATH,LANG:'C.UTF-8',NEXT_TELEMETRY_DISABLED:'1',NEXIFY_APP_ENV:'test'};
execFileSync(process.execPath,['scripts/generate-public-data.mjs'],{cwd,env,stdio:'pipe'});
execFileSync(process.execPath,renderer==='vite'?['node_modules/vite/bin/vite.js','build']:['node_modules/next/dist/bin/next','build'],{cwd,env,stdio:'pipe',maxBuffer:4*1024*1024});
let server,child,origin,log='';
if(renderer==='vite'){server=await preview({root:root+'apps/site',preview:{host:'127.0.0.1',port:0}});origin='http://127.0.0.1:'+server.httpServer.address().port;}
else{const s=allocator();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(resolve=>s.close(resolve));origin='http://127.0.0.1:'+port;child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd,env:{PATH:process.env.PATH,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);}
const browser=await chromium.launch({headless:true}),views=[],text_resize=[],external=[],errors=[],asset_hashes={};
try{
 if(child)for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 for(const width of [320,375,390,1180,1440])for(const locale of ['de','nl','fr']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.addInitScript(l=>localStorage.setItem('nexify-locale',l),locale);
  for(const[name,a]of Object.entries(assets)){const r=await context.request.get(origin+a.src);assert.equal(r.status(),200);asset_hashes[name]=createHash('sha256').update(await r.body()).digest('hex');assert.equal(asset_hashes[name],a.sha256);}
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:204});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const close=async()=>{if(await page.locator('#aifly-panel').isVisible()){await page.locator('.panel-heading .icon-button').click();await page.locator('.reopen-chat').waitFor();}};
  const inspect=async()=>{
   const hero=page.locator('.home-hero');assert.equal(await hero.count(),1);assert.equal(await page.locator('.identity-hero').count(),0);assert.equal(await hero.locator('h1').count(),1);assert.equal(await hero.locator('[data-identity-illustration="hero"]').count(),1);
   const modules=page.locator('.editorial-module');assert.equal(await modules.count(),2);
   for(let i=0;i<2;i++){assert.equal(await modules.nth(i).locator('[data-identity-illustration]').getAttribute('data-identity-illustration'),i===0?'project':'orientation');}
   const graphics=page.locator('[data-identity-illustration]');assert.equal(await graphics.count(),3);
   for(const g of await graphics.all()){
    await g.scrollIntoViewIfNeeded();assert.ok(await g.getAttribute('aria-label'));
    for(const img of await g.locator('img').all())await img.evaluate(async i=>{i.loading='eager';await i.decode();});
    const measured=await g.evaluate(g=>{const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};return{bounds:rect(g.querySelector('.illustration-surface')),images:[...g.querySelectorAll('img')].map(i=>({persona:i.dataset.persona,src:i.getAttribute('src'),rect:rect(i),ratio:i.naturalWidth/i.naturalHeight,fit:getComputedStyle(i).objectFit,filter:getComputedStyle(i).filter,opacity:getComputedStyle(i).opacity,animation:getComputedStyle(i).animationName}))};});
    assert.equal(measured.images.length,3);for(const f of measured.images){const r=f.rect,b=measured.bounds;assert.equal(f.src,assets[f.persona].src);assert.equal(f.fit,'contain');assert.equal(f.filter,'none');assert.equal(f.opacity,'1');assert.equal(f.animation,'none');assert.ok(Math.abs(r.width/r.height-f.ratio)<.001);assert.ok(r.left>=b.left-1&&r.right<=b.right+1&&r.top>=b.top-1&&r.bottom<=b.bottom+1,'whole original inside illustration');}
   }
   assert.equal(await page.locator('img[src*="hero-trio"],video,audio,iframe,.presenter-video-play').count(),0);
   const geometry=await hero.evaluate(h=>{const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom};};const c=rect(h.querySelector('.home-hero-copy')),a=rect(h.querySelector('.home-presenter-art'));return{copy:c,art:a,collision:c.left<a.right&&c.right>a.left&&c.top<a.bottom&&c.bottom>a.top,overflow:document.documentElement.scrollWidth>innerWidth+1,text_overflow:[...h.querySelectorAll('h1,p')].some(e=>e.scrollWidth>e.clientWidth+1)};});assert.equal(geometry.collision,false);assert.equal(geometry.overflow,false);assert.equal(geometry.text_overflow,false);return geometry;
  };
  const zoom=async metadata=>{const original=await page.evaluateHandle(()=>{const rows=[...document.querySelectorAll('body,body *')].filter(e=>e instanceof HTMLElement).map(e=>({e,size:parseFloat(getComputedStyle(e).fontSize),value:e.style.getPropertyValue('font-size'),priority:e.style.getPropertyPriority('font-size')}));for(const r of rows)r.e.style.setProperty('font-size',r.size*2+'px','important');return rows;});try{assert.equal(await original.evaluate(rows=>rows.every(r=>Math.abs(parseFloat(getComputedStyle(r.e).fontSize)-r.size*2)<.05)),true);const geometry=await inspect();text_resize.push({...metadata,locale,all_doubled:true,...geometry,passed:true});}finally{await original.evaluate(rows=>{for(const r of rows){if(r.value)r.e.style.setProperty('font-size',r.value,r.priority);else r.e.style.removeProperty('font-size');}});await original.dispose();}};
  try{
   await page.goto(origin);await page.waitForFunction(l=>document.documentElement.lang===l,locale);await close();
   for(const sidebar of width===1440?['closed','open']:['closed']){
    if(sidebar==='open')await page.locator('.reopen-chat').click();const geometry=await inspect();views.push({width,locale,sidebar,...geometry,regular_hero:true,section_variants:['project','orientation'],passed:true});await page.locator('.home-hero').screenshot({path:out+'/'+width+'-'+locale+'-'+sidebar+'.png'});for(let i=0;i<2;i++)await page.locator('.editorial-module').nth(i).screenshot({path:out+'/'+width+'-'+locale+'-'+sidebar+'-section-'+(i+1)+'.png'});await zoom({width,sidebar});
    if(width===1440&&sidebar==='closed')for(const forcedWidth of [860,899,900,901,920]){await page.locator('.home-rebuild').evaluate((e,w)=>e.style.width=w+'px',forcedWidth);const probe=await inspect();views.push({width,forced_width:forcedWidth,locale,sidebar,breakpoint_probe:true,...probe,passed:true});if([899,901].includes(forcedWidth))await zoom({width,sidebar,forced_width:forcedWidth});await page.locator('.home-rebuild').evaluate(e=>e.style.removeProperty('width'));}
   }
   await close();assert.equal(await page.locator('.reopen-chat').evaluate(e=>getComputedStyle(e).position),'static');const actions=page.locator('.home-hero-actions button');assert.equal(await actions.count(),2);for(const b of await actions.all()){const r=await b.boundingBox();assert.ok(r.width>=44&&r.height>=44);await b.focus();assert.equal(await b.evaluate(e=>e===document.activeElement),true);}await actions.first().press('Enter');assert.equal(await page.locator('#aifly-panel').isVisible(),true);await page.locator('.project-brief').waitFor();if(width<=390)await page.waitForFunction(()=>Boolean(document.activeElement?.closest('#aifly-panel')));await page.locator('.panel-heading .icon-button').focus();await page.keyboard.press('Escape');await page.locator('.reopen-chat').waitFor();
   if(width<=390){const menu=page.locator('.mobile-navigation');await menu.locator('summary').press('Enter');await menu.locator('a[href="/leistungen"]').click();await page.waitForURL(origin+'/leistungen');await page.goBack();await page.waitForURL(origin+'/');}else{await page.locator('.home-area-link[href="/produkte/nex2fly"]').click();await page.waitForURL(origin+'/produkte/nex2fly');await page.goBack();await page.waitForURL(origin+'/');}
  }finally{await context.close();}
 }
 assert.equal(views.length,33);assert.equal(text_resize.length,24);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(out+'/browser.json',JSON.stringify({renderer,scope:'local optimized regular Hero plus two native original-figure scene compositions;not video/provider/production acceptance',views,text_resize,asset_hashes,source_sha256:before,external_requests:0,page_errors:errors,fresh_build_performed:true,passed:true},null,2)+'\n');console.log(JSON.stringify({renderer,views:views.length,text_resize:text_resize.length,external:0,errors:0,passed:true}));
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(child){child.kill('SIGTERM');if(child.exitCode===null&&child.signalCode===null)await once(child,'exit');await writeFile(out+'/runtime.log',log);}}
