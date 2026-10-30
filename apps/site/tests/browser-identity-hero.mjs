// zielbild-v2 live-scene in actual local optimized renderers; no provider/library calls. Design approved via config/identity-hero.json (identity-hero-v2); technical checks run for real here.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer as allocator} from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url)),renderer=process.env.IDENTITY_RENDERER||'vite';assert.ok(['vite','next'].includes(renderer));
const paths=['config/identity-hero.json','config/interim-scene-images.json','config/design-tokens.json','apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css','apps/web/components/TrioScene.tsx','apps/web/components/TrioScene.css','apps/web/components/HomeContent.tsx','apps/web/components/HomeRebuild.css','apps/web/components/PresenterScene.tsx','apps/web/components/PresenterEditorial.css','apps/web/components/WorkspaceRebuild.css','apps/web/app/globals.css','packages/tokens/tokens.css','apps/site/tests/browser-identity-hero.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')]))),before=await hashes();
const assets=JSON.parse(await readFile(root+'config/identity-hero.json','utf8')).figures;
const out=root+'.local/identity-hero/'+renderer;await mkdir(out,{recursive:true});
let server,child,origin,log='';
if(renderer==='vite'){server=await preview({root:root+'apps/site',preview:{host:'127.0.0.1',port:0,strictPort:false}});origin='http://127.0.0.1:'+server.httpServer.address().port;}
else{const socket=allocator();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));origin='http://127.0.0.1:'+port;child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'apps/web',env:{PATH:process.env.PATH,LANG:'C.UTF-8',NODE_ENV:'production',APP_ENV:'production'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);}
const browser=await chromium.launch({headless:true}),views=[],text_resize=[],external=[],errors=[],asset_hashes={};
const undistorted=f=>!/blur\(|grayscale\(|invert\(|hue-rotate\(|sepia\(|saturate\(0/.test(f);
try{
 if(child)for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 for(const width of [320,390,1440])for(const locale of ['de','nl','fr']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.addInitScript(l=>localStorage.setItem('nexify-locale',l),locale);
  for(const [name,asset] of Object.entries(assets)){const response=await context.request.get(origin+asset.src);assert.equal(response.status(),200,'approved figure served '+name);const body=await response.body();assert.ok(body.length>1000,'figure bytes present '+name);asset_hashes[name]=createHash('sha256').update(body).digest('hex');}
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{error:'local_unconfigured'}});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));
  async function closePanel(){if(await page.locator('#aifly-panel').isVisible()){await page.locator('.panel-heading .icon-button').click();await page.waitForFunction(()=>document.activeElement?.classList.contains('reopen-chat'));}}
  async function checkZoom(hero,metadata){
   const original=await page.evaluateHandle(()=>{const entries=[...document.querySelectorAll('body,body *')].filter(e=>e instanceof HTMLElement).map(element=>({element,size:parseFloat(getComputedStyle(element).fontSize),value:element.style.getPropertyValue('font-size'),priority:element.style.getPropertyPriority('font-size')}));for(const e of entries)e.element.style.setProperty('font-size',String(e.size*2)+'px','important');return entries;});
   try{
    assert.equal(await original.evaluate(es=>es.every(e=>Math.abs(parseFloat(getComputedStyle(e.element).fontSize)-e.size*2)<.05)),true);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const measured=await hero.evaluate(h=>{const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};return {scene:r(h.querySelector('.identity-scene')),copy:r(h.querySelector('.identity-copy')),figures:[...h.querySelectorAll('.trio-media .trio-poster')].map(r),hero_overflow:h.scrollWidth>h.clientWidth+1};});
    assert.equal(measured.hero_overflow,false,'200% hero horizontal overflow');assert.ok(measured.copy.top>=measured.scene.top-1&&measured.copy.bottom<=measured.scene.bottom+1,'200% copy clipped');
    for(const r of measured.figures){const c=measured.copy,s=measured.scene;assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'200% copy/figure collision');assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1);}
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await hero.screenshot({path:out+'/'+metadata.width+'-'+locale+'-'+metadata.sidebar+(metadata.forced_width?'-'+metadata.forced_width:'')+'-zoom200.png'});
    text_resize.push({...metadata,locale,all_doubled:true,...measured,passed:true});
   }finally{await original.evaluate(es=>{for(const e of es){if(e.value)e.element.style.setProperty('font-size',e.value,e.priority);else e.element.style.removeProperty('font-size');}});await original.dispose();}
  }
  try{
   await page.goto(origin+'/');await page.waitForFunction(l=>document.documentElement.lang===l,locale);await page.evaluate(()=>document.fonts.ready);
   await closePanel();
   await page.locator('.workspace-shell.is-closed').waitFor();
   for(const sidebar of width===1440?['closed','open']:['closed']){
    if(sidebar==='open'){await page.locator('.reopen-chat').click();await page.locator('.workspace-shell.is-open').waitFor();}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const hero=page.locator('.identity-hero');assert.equal(await hero.getAttribute('data-identity-layout'),'zielbild-v2');assert.equal(await hero.getAttribute('data-media-state'),'live-scene');
    assert.equal(await hero.locator('h1').count(),1);
    // reduced-motion must stay a calm still: scene marks reduced and no clip is playing
    assert.equal(await hero.locator('.trio-scene.is-reduced').count(),1,'reduced-motion scene still');
    assert.equal(await hero.evaluate(h=>[...h.querySelectorAll('video')].every(v=>v.paused&&v.muted)),true,'decorative clips paused+muted under reduced-motion');
    const images=hero.locator('.trio-media .trio-poster');assert.equal(await images.count(),1,'live-scene poster present');for(const img of await images.all())await img.evaluate(i=>i.decode());
    const geometry=await hero.evaluate(h=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
     const scene=rect(h.querySelector('.identity-scene')),copy=rect(h.querySelector('.identity-copy')),stage=rect(h.querySelector('.trio-stage'));
     const figures=[...h.querySelectorAll('.trio-media .trio-poster')].map(i=>({speaker:'poster',rect:rect(i),src:i.getAttribute('src'),ratio:i.naturalWidth/i.naturalHeight,fit:getComputedStyle(i).objectFit,filter:getComputedStyle(i).filter,opacity:Number(getComputedStyle(i).opacity)}));
     return {scene,copy,stage,figures,overflow:document.documentElement.scrollWidth>innerWidth+1,text_overflow:[...h.querySelectorAll('h1,h2,p')].some(e=>e.scrollWidth>e.clientWidth+1),stacked:getComputedStyle(h.querySelector('.trio-stage')).position==='relative'};
    });
    assert.equal(geometry.overflow,false,'viewport overflow');assert.equal(geometry.text_overflow,false,'text overflow');
    for(const f of geometry.figures){const r=f.rect,s=geometry.scene,c=geometry.copy;assert.ok(r.width>0&&r.height>0,'poster has size');assert.ok(/\/media\/home-loops\/welcome-loop\.jpg$/.test(f.src),'approved brand-stage poster: '+f.src);assert.ok(f.opacity>=0.99,'scene fully visible');assert.ok(undistorted(f.filter),'no identity-distorting filter: '+f.filter);assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1,'whole scene inside hero scene');assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'copy/scene collision');}
    if(width<500)assert.equal(geometry.stacked,true,'narrow stacks figures below copy');
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await hero.screenshot({path:out+'/'+width+'-'+locale+'-'+sidebar+'.png'});
    views.push({width,locale,sidebar,...geometry,passed:true});
    await checkZoom(hero,{width,sidebar});
    if(width===1440&&sidebar==='closed')for(const forcedWidth of [720,763,765,800]){
     await hero.evaluate((h,w)=>h.style.width=w+'px',forcedWidth);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const probe=await hero.evaluate(h=>{const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};const scene=r(h.querySelector('.identity-scene')),copy=r(h.querySelector('.identity-copy'));return {scene,copy,stacked:getComputedStyle(h.querySelector('.trio-stage')).position==='relative',figures:[...h.querySelectorAll('.trio-media .trio-poster')].map(i=>r(i)),overflow:document.documentElement.scrollWidth>innerWidth+1};});
     for(const r of probe.figures){const c=probe.copy,s=probe.scene;assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'breakpoint copy/figure collision');assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1);}
     assert.equal(probe.overflow,false,'breakpoint overflow');assert.equal(probe.stacked,forcedWidth<=763,'stack threshold');
     await hero.screenshot({path:out+'/breakpoint-'+forcedWidth+'-'+locale+'.png'});views.push({width,forced_width:forcedWidth,locale,sidebar,breakpoint_probe:true,...probe,passed:true});
     if(forcedWidth===720)await checkZoom(hero,{width,sidebar,forced_width:forcedWidth});
     await hero.evaluate(h=>h.style.removeProperty('width'));
    }
   }
   // Operability: hero navigation links + real media controls (touch >=48px, keyboard reachable). No fake provider call.
   await closePanel();
   const links=page.locator('.identity-copy .identity-links a');assert.equal(await links.count(),2,'two hero links');
   for(const link of await links.all()){assert.ok(await link.getAttribute('href'),'hero link has href');await link.focus();assert.equal(await link.evaluate(e=>e===document.activeElement),true,'hero link keyboard-focusable');}
   const controls=page.locator('.identity-hero .trio-controls button');assert.ok(await controls.count()>=3,'media controls present');
   for(const control of await controls.all()){const b=await control.boundingBox();assert.ok(b.height>=48&&b.width>=48,'control touch target >=48px');await control.focus();assert.equal(await control.evaluate(e=>e===document.activeElement),true,'control keyboard-focusable');}
   // Keyboard media control on the stage: 'c' toggles captions without a network/provider call.
   const captionsToggle=page.locator('[data-testid="hero-captions-toggle"]');const before_pressed=await captionsToggle.getAttribute('aria-pressed');
   await page.locator('[data-testid="hero-stage"]').focus();await page.keyboard.press('c');
   assert.notEqual(await captionsToggle.getAttribute('aria-pressed'),before_pressed,'keyboard c toggles captions');
   await page.locator('.identity-primary-link').click();await page.waitForURL(origin+'/leistungsumfang');await page.goBack();await page.waitForURL(origin+'/');await page.locator('.identity-hero').waitFor();
  }finally{await context.close();}
 }
 assert.equal(views.length,24);assert.equal(text_resize.length,15);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(out+'/browser.json',JSON.stringify({renderer,scope:'zielbild-v2 live-scene; design approved (identity-hero-v2), technical checks executed; original figure PNG bytes; not video/provider/production acceptance',layout:'zielbild-v2',media_state:'live-scene',reduced_motion:'still',views,text_resize,asset_hashes,source_sha256:before,external_requests:0,page_errors:errors,passed:true},null,2)+'\n');console.log(JSON.stringify({renderer,layout:'zielbild-v2',views:views.length,text_resize:text_resize.length,locales:3,figures:3,external:0,errors:0,passed:true}));
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(child){child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');await writeFile(out+'/runtime.log',log);}}
