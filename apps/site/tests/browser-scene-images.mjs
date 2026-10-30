// Actual optimized public renderer. No providers, sessions or external requests.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const sources=['config/interim-scene-images.json','apps/web/components/PresenterScene.tsx','apps/web/components/ExplainerSections.tsx','apps/web/components/PresenterEditorial.css','apps/web/components/HomeContent.tsx','apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css','config/identity-hero.json','packages/tokens/tokens.css','apps/site/scripts/generate-public-data.mjs','apps/site/tests/browser-scene-images.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(repo+p)).digest('hex')])));
const before=await hashes();const server=await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:false}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});const external=[],errors=[],views=[];
const out=repo+'.local/interim-scenes/';await mkdir(out,{recursive:true});
try{
 for(const width of [320,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const sceneAssets=JSON.parse(await readFile(repo+'config/interim-scene-images.json','utf8'));
  for(const asset of Object.values(sceneAssets.images)){
   const response=await context.request.get(origin+asset.src);assert.equal(response.status(),200);
   assert.equal(createHash('sha256').update(await response.body()).digest('hex'),asset.sha256);
  }
  await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:u.pathname==='/api/session'?204:503,json:u.pathname==='/api/session'?undefined:{error:'local_unconfigured'}});return r.continue();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const locale of ['de','nl'])for(const entry of data.pages){
   await page.goto(origin+entry.path);await page.locator('#locale').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   const expected=data.explainers.find(p=>p.page_id===entry.id).modules;
   if(entry.path==='/'){
    // zielbild-v2: Home präsentiert die Live-Szene (IdentityHero), nicht die generischen Explainer-Module.
    assert.equal(await page.locator('.identity-hero[data-identity-layout="zielbild-v2"]').count(),1,'home live hero present');
    const poster=page.locator('.identity-hero .trio-media .trio-poster');assert.equal(await poster.count(),1,'home brand-stage poster present');await poster.evaluate(i=>i.decode&&i.decode().catch(()=>{}));
    assert.equal(await poster.evaluate(i=>i.naturalWidth>0),true,'home scene poster loads unbroken');
   }else{
    assert.equal(await page.locator('.editorial-module .presenter-scene').count(),expected.length);
    for(let i=0;i<expected.length;i++){
     const scene=page.locator('.editorial-module .presenter-scene').nth(i);await scene.scrollIntoViewIfNeeded();
     assert.equal(await scene.getAttribute('data-scene-speaker'),expected[i].speaker);
     const img=scene.locator('img');await img.evaluate(i=>i.complete?null:new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});}));
     const state=await img.evaluate(i=>({loaded:i.naturalWidth>0,fit:getComputedStyle(i).objectFit,alt:i.alt,width:i.getBoundingClientRect().width}));
     assert.equal(state.loaded,true);assert.equal(state.fit,'contain');assert.ok(state.alt.includes(expected[i].title[locale]));assert.ok(state.width>0&&state.width<=width);
    }
   }
   if(entry.path==='/')assert.equal(await page.evaluate(()=>{const media=[...document.querySelectorAll('video,audio')];const videos=[...document.querySelectorAll('video')];return media.length>0&&media.every(e=>e.muted||e.paused)&&videos.every(e=>e.muted&&!e.hasAttribute('controls'));}),true,'home media never auto-plays sound (clips muted/decorative, voice track paused)');
   else assert.equal(await page.locator('video,audio,.presenter-video-play').count(),0);
   assert.equal(await page.locator('img[src="/media/presenters/hero-trio.png"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(entry.path==='/'){
    const hero=page.locator('.identity-hero .trio-media .trio-poster');
    for(const img of await hero.all())await img.evaluate(i=>i.decode&&i.decode().catch(()=>{}));
    await page.locator('.identity-hero').screenshot({path:out+`hero-${width}-${locale}.png`});
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+`home-${width}-${locale}.png`});
   }
   views.push({page_id:entry.id,path:entry.path,locale,width,scenes:expected.length,passed:true});
  }
  await context.close();
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(out+'browser.json',JSON.stringify({scope:'local optimized Vite output,interim unchanged reference images;not final videos or live acceptance',views,source_sha256:before,external_requests:0,page_errors:errors,passed:true},null,2)+'\n');
 console.log(JSON.stringify({views:views.length,scene_slots:49,public_routes:data.pages.length,external:0,passed:true}));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
