// Home hero video, approved brand-photo poster and responsive graphite layout in local renderers.
// This checks browser behavior and asset delivery; it does not grant identity, audio or release approval.
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
const paths=['config/identity-hero.json','config/interim-scene-images.json','config/design-tokens.json','apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css','apps/web/components/HomeContent.tsx','apps/web/components/HomeConcept.css','apps/web/components/LuxuryMaterials.css','apps/web/components/HomeRebuild.css','apps/web/components/WorkspaceRebuild.css','apps/web/lib/brand-media.ts','apps/web/app/globals.css','packages/tokens/tokens.css','apps/site/tests/browser-identity-hero.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(root+p)).digest('hex')]))),before=await hashes();
const out=root+'.local/identity-hero/'+renderer;await mkdir(out,{recursive:true});
let server,child,origin,log='';
if(renderer==='vite'){server=await preview({root:root+'apps/site',preview:{host:'127.0.0.1',port:0,strictPort:false}});origin='http://127.0.0.1:'+server.httpServer.address().port;}
else{const socket=allocator();socket.listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));origin='http://127.0.0.1:'+port;child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:root+'apps/web',env:{PATH:process.env.PATH,LANG:'C.UTF-8',NODE_ENV:'production',APP_ENV:'production'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);}
const browser=await chromium.launch({headless:true}),views=[],text_resize=[],external=[],errors=[],asset_hashes={};
// Sprache heute: per ?lang= (Next serverseitig in apps/web/proxy.ts seit 5222298; das Vite-SPA liest ?lang= in apps/site/src/main.tsx und reicht es als initialLocale an Workspace, 024c6f2; nexify-locale wird nicht mehr gelesen, OF-12). Beide Renderer liefern de/nl/fr.
const locales=['de','nl','fr'],suffix=l=>l==='de'?'':'?lang='+l;
// Next baut interne Links serverseitig mit ?lang=; das Vite-SPA haelt die Sprache im Client-Zustand und navigiert ohne ?lang= (Hero-Links, wie die Footer-Links).
const linkSuffix=l=>renderer==='next'?suffix(l):'';
// Heutiger Umbruch der Hero-Spalten auf der Startseite: HomeConcept.css stapelt bis einschliesslich 1100 px Containerbreite
// (IdentityHero.css deklariert 820 px, wird dort uebersteuert). Die Konstante wird gegen die Quelle gebunden und gegen die Renderung gemessen.
const STACK_MAX=1100;assert.ok((await readFile(root+'apps/web/components/HomeConcept.css','utf8')).includes('@container identity-hero (max-width:'+STACK_MAX+'px){.workspace-shell .home-concept .identity-hero .identity-scene{grid-template-columns:1fr}'),'stack threshold declared in HomeConcept.css');
const undistorted=f=>!/blur\(|grayscale\(|invert\(|hue-rotate\(|sepia\(|saturate\(0/.test(f);
try{
 if(child)for(let n=0;n<100;n++){try{if((await fetch(origin)).ok)break;}catch{}if(n===99)throw Error('Next startup timeout');await new Promise(resolve=>setTimeout(resolve,100));}
 for(const width of [320,390,1440])for(const locale of locales){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:503,json:{error:'local_unconfigured'}});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));
  async function closePanel(){if(await page.locator('#aifly-panel').isVisible()){await page.locator('.panel-heading .icon-button').click();await page.waitForFunction(()=>document.activeElement?.classList.contains('reopen-chat'));}}
  async function checkZoom(hero,metadata){
   const original=await page.evaluateHandle(()=>{const entries=[...document.querySelectorAll('body,body *')].filter(e=>e instanceof HTMLElement).map(element=>({element,size:parseFloat(getComputedStyle(element).fontSize),value:element.style.getPropertyValue('font-size'),priority:element.style.getPropertyPriority('font-size')}));for(const e of entries)e.element.style.setProperty('font-size',String(e.size*2)+'px','important');return entries;});
   try{
    assert.equal(await original.evaluate(es=>es.every(e=>Math.abs(parseFloat(getComputedStyle(e.element).fontSize)-e.size*2)<.05)),true);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const measured=await hero.evaluate(h=>{const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};return {scene:r(h.querySelector('.identity-scene')),copy:r(h.querySelector('.identity-copy')),figures:[...h.querySelectorAll('.identity-hero-photo video')].map(r),hero_overflow:h.scrollWidth>h.clientWidth+1};});
    assert.equal(measured.hero_overflow,false,'200% hero horizontal overflow');assert.ok(measured.copy.top>=measured.scene.top-1&&measured.copy.bottom<=measured.scene.bottom+1,'200% copy clipped');
    for(const r of measured.figures){const c=measured.copy,s=measured.scene;assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'200% copy/video collision');assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1);}
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await hero.screenshot({path:out+'/'+metadata.width+'-'+locale+'-'+metadata.sidebar+(metadata.forced_width?'-'+metadata.forced_width:'')+'-zoom200.png'});
    text_resize.push({...metadata,locale,all_doubled:true,...measured,passed:true});
   }finally{await original.evaluate(es=>{for(const e of es){if(e.value)e.element.style.setProperty('font-size',e.value,e.priority);else e.element.style.removeProperty('font-size');}});await original.dispose();}
  }
  try{
   await page.goto(origin+'/'+suffix(locale));await page.waitForFunction(l=>document.documentElement.lang===l,locale);await page.evaluate(()=>document.fonts.ready);
   await closePanel();
   await page.locator('.workspace-shell.is-closed').waitFor();
   // Deferred Orientierung (React.lazy + Suspense) vollständig auflösen lassen, bevor gemessen wird:
   // sonst tauscht die Suspense-Fallback-Zeile (.orientation-loading) mitten in der Font-Verdopplung
   // DOM-Knoten aus (abgelöster Knoten -> getComputedStyle '' -> NaN). Kein Hero-Defekt, reine Testdeterminanz.
   await page.locator('.public-orientation').waitFor({state:'attached'});
   await page.locator('.orientation-loading').waitFor({state:'detached'}).catch(()=>{});
   // The original video and retained brand-photo poster must both be served.
   const mediaSources=await page.evaluate(()=>{const v=document.querySelector('.identity-hero-photo video');return [v.getAttribute('src'),v.getAttribute('poster')];});
   for(const u of mediaSources){const response=await context.request.get(origin+u);assert.equal(response.status(),200,'hero media served '+u);const body=await response.body();assert.ok(body.length>1000,'hero media bytes present '+u);asset_hashes[u]=createHash('sha256').update(body).digest('hex');}
   for(const sidebar of width===1440?['closed','open']:['closed']){
    if(sidebar==='open'){await page.locator('.reopen-chat').click();await page.locator('.workspace-shell.is-open').waitFor();}
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const hero=page.locator('.identity-hero');assert.equal(await hero.getAttribute('data-identity-layout'),'graphite-atelier');assert.equal(await hero.getAttribute('data-media-state'),'editorial-video');
    assert.equal(await hero.locator('h1').count(),1);
    assert.equal(await hero.locator('video').count(),1,'one original hero video');
    assert.equal(await hero.locator('audio,.trio-scene,.trio-controls').count(),0,'no duplicate audio or scene controller');
    assert.equal(await hero.locator('video').evaluate(v=>v.paused),true,'reduced motion pauses autoplay');
    assert.equal(await hero.locator('video').getAttribute('poster'),'/media/higgsfield/hf-02-lobby-walk-1920.webp','approved image is poster');
    assert.equal(await hero.evaluate(h=>[...h.querySelectorAll('*')].every(e=>{const c=getComputedStyle(e);return c.animationName==='none'&&c.transitionDuration.split(',').every(d=>parseFloat(d)===0);})),true,'reduced-motion: no hero animation or transition');
    const videos=hero.locator('.identity-hero-photo video');assert.equal(await videos.count(),1,'hero video present');await videos.first().evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=1)return resolve();v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',reject,{once:true});}));assert.equal(await videos.first().evaluate(v=>v.videoWidth===1280&&v.videoHeight===720),true,'hero video metadata decoded');
    const geometry=await hero.evaluate(h=>{
     const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
     const scene=rect(h.querySelector('.identity-scene')),copy=rect(h.querySelector('.identity-copy'));
     const figures=[...h.querySelectorAll('.identity-hero-photo video')].map(i=>({speaker:'video',rect:rect(i),src:i.getAttribute('src'),alt:i.getAttribute('aria-label')||'',ratio:i.videoWidth/i.videoHeight,fit:getComputedStyle(i).objectFit,filter:getComputedStyle(i).filter,opacity:Number(getComputedStyle(i).opacity)}));
     return {scene,copy,figures,overflow:document.documentElement.scrollWidth>innerWidth+1,text_overflow:[...h.querySelectorAll('h1,h2,p')].some(e=>e.scrollWidth>e.clientWidth+1),stacked:getComputedStyle(h.querySelector('.identity-scene')).gridTemplateColumns.split(' ').filter(Boolean).length===1};
    });
    assert.equal(geometry.overflow,false,'viewport overflow');assert.equal(geometry.text_overflow,false,'text overflow');
    for(const f of geometry.figures){const r=f.rect,s=geometry.scene,c=geometry.copy;assert.ok(r.width>0&&r.height>0,'video has size');assert.ok(/\/media\/home-review\/pascal-studio-scene-original-20261109\.mp4$/.test(f.src),'original personal video: '+f.src);assert.ok(f.alt.length>10,'video has an accessible name');assert.ok(f.opacity>=0.99,'video fully visible');assert.ok(undistorted(f.filter),'no identity-distorting filter: '+f.filter);assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1,'whole video inside hero scene');assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'copy/video collision');}
    if(width<500){assert.equal(geometry.stacked,true,'narrow stacks video below copy');for(const f of geometry.figures)assert.ok(f.rect.top>=geometry.copy.bottom-1,'stacked video sits below the copy');}
    await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
    await hero.screenshot({path:out+'/'+width+'-'+locale+'-'+sidebar+'.png'});
    views.push({width,locale,sidebar,...geometry,passed:true});
    await checkZoom(hero,{width,sidebar});
   // Breakpoint-Register straddelt den heutigen Umbruch (STACK_MAX) sowie den frueheren 820px-Umbruch:
   // echte Spaltenmessung, gestapelt bis STACK_MAX, zweispaltig darueber. 200%-Zoom in BEIDEN Zuständen belegt.
   if(width===1440&&sidebar==='closed')for(const forcedWidth of [764,820,821,1000,STACK_MAX,STACK_MAX+1,1300]){
     await hero.evaluate((h,w)=>h.style.width=w+'px',forcedWidth);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const probe=await hero.evaluate(h=>{const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};const scene=r(h.querySelector('.identity-scene')),copy=r(h.querySelector('.identity-copy'));return {scene,copy,stacked:getComputedStyle(h.querySelector('.identity-scene')).gridTemplateColumns.split(' ').filter(Boolean).length===1,figures:[...h.querySelectorAll('.identity-hero-photo video')].map(i=>r(i)),overflow:document.documentElement.scrollWidth>innerWidth+1};});
     for(const r of probe.figures){const c=probe.copy,s=probe.scene;assert.equal(r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top,false,'breakpoint copy/video collision');assert.ok(r.left>=s.left-1&&r.right<=s.right+1&&r.top>=s.top-1&&r.bottom<=s.bottom+1);}
     assert.equal(probe.overflow,false,'breakpoint overflow');assert.equal(probe.stacked,forcedWidth<=STACK_MAX,'stack threshold');
     await hero.screenshot({path:out+'/breakpoint-'+forcedWidth+'-'+locale+'.png'});views.push({width,forced_width:forcedWidth,locale,sidebar,breakpoint_probe:true,...probe,passed:true});
     if([764,1000,STACK_MAX+1,1300].includes(forcedWidth))await checkZoom(hero,{width,sidebar,forced_width:forcedWidth});
     await hero.evaluate(h=>h.style.removeProperty('width'));
    }
   }
   // Operability: hero navigation and real media controls, with reduced-motion autoplay stopped.
   await closePanel();
   const links=page.locator('.identity-copy .identity-links a');assert.equal(await links.count(),2,'two hero links');
   for(const link of await links.all()){assert.ok(await link.getAttribute('href'),'hero link has href');const b=await link.boundingBox();assert.ok(b.height>=48&&b.width>=48,'hero link touch target >=48px');await link.focus();assert.equal(await link.evaluate(e=>e===document.activeElement),true,'hero link keyboard-focusable');}
   assert.equal(await page.locator('.identity-hero video').count(),1);assert.equal(await page.locator('.identity-hero .atelier-film-controls button').count(),2);
   for(const control of await page.locator('.identity-hero .atelier-film-controls button').all()){const box=await control.boundingBox();assert.ok(box.width>=44&&box.height>=44,'media control touch target');await control.focus();assert.equal(await control.evaluate(e=>e===document.activeElement),true,'media control keyboard-focusable');}
   for(const [selector,target] of [['.identity-primary-link','/kontakt'],['.identity-secondary-link','/leistungen']]){await page.locator(selector).click();await page.waitForURL(origin+target+linkSuffix(locale));await page.goBack();await page.waitForURL(origin+'/'+suffix(locale));await page.locator('.identity-hero').waitFor();}
  }finally{await context.close();}
 }
 assert.equal(views.length,locales.length*11);assert.equal(text_resize.length,locales.length*8);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(out+'/browser.json',JSON.stringify({renderer,scope:'home hero original video and approved photo poster; technical checks in the local optimized renderer; not identity/audio/release acceptance',layout:'graphite-atelier',media_state:'editorial-video',locales,reduced_motion:'autoplay_paused',views,text_resize,asset_hashes,source_sha256:before,external_requests:0,page_errors:errors,passed:true},null,2)+'\n');console.log(JSON.stringify({renderer,layout:'graphite-atelier',views:views.length,text_resize:text_resize.length,locales:locales.length,videos:1,external:0,errors:0,passed:true}));
}finally{await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(child){child.kill('SIGTERM');if(child.exitCode===null)await once(child,'exit');await writeFile(out+'/runtime.log',log);}}
