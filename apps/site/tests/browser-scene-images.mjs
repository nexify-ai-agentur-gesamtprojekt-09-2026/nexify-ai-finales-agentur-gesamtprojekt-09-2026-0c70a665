// Actual optimized public renderer. No providers, sessions or external requests.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const sources=['config/site-map.json','config/page-explainers.json','config/companion-avatar.json','apps/web/components/PublicContent.tsx','apps/web/components/IdentityIllustration.tsx','apps/web/components/IdentityIllustration.css','config/interim-scene-images.json','apps/web/components/PresenterScene.tsx','apps/web/components/ExplainerSections.tsx','apps/web/components/PresenterEditorial.css','apps/web/components/HomeContent.tsx','apps/web/components/IdentityHero.tsx','apps/web/components/IdentityHero.css','config/identity-hero.json','packages/tokens/tokens.css','apps/site/scripts/generate-public-data.mjs','apps/site/tests/browser-scene-images.mjs'];
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
  for(const locale of ['de','nl','fr'])for(const entry of data.pages){
   await page.goto(origin+entry.path);await page.locator('#locale').selectOption(locale);await page.waitForFunction(l=>document.documentElement.lang===l,locale);
   const expected=data.explainers.find(p=>p.page_id===entry.id).modules;
   const route_modules=[];const modules=page.locator('.editorial-module');assert.equal(await modules.count(),expected.length);
   for(let i=0;i<expected.length;i++){
    const module=modules.nth(i),composite=entry.id==='home';const scene=module.locator(composite?'.identity-illustration':'.presenter-scene');await scene.scrollIntoViewIfNeeded();
    if(composite){assert.equal(await scene.getAttribute('data-identity-illustration'),i===0?'project':'orientation');assert.equal(await scene.locator('img').count(),3);assert.ok(await scene.getAttribute('aria-label'));}else assert.equal(await scene.getAttribute('data-scene-speaker'),expected[i].speaker);
    const rendered_assets=[];for(const img of await scene.locator('img').all()){
     await img.evaluate(async i=>{i.loading='eager';await i.decode();});const state=await img.evaluate(i=>({loaded:i.naturalWidth>0,fit:getComputedStyle(i).objectFit,alt:i.alt,width:i.getBoundingClientRect().width,persona:i.dataset.persona,src:i.getAttribute('src')}));
     assert.equal(state.loaded,true);assert.equal(state.fit,'contain');if(composite)assert.equal(state.src,sceneAssets.images[state.persona].src);else assert.ok(state.alt.includes(expected[i].title[locale]));assert.ok(state.width>0&&state.width<=width);rendered_assets.push({src:state.src,persona:state.persona||expected[i].speaker,width:state.width,loaded:state.loaded});
    }
    route_modules.push({module_id:expected[i].id,title:expected[i].title[locale],lead_speaker:expected[i].speaker,composition:composite?(i===0?'project':'orientation'):'original-role-illustration',assets:rendered_assets});
   }
   if(entry.id!=='home'&&await page.locator('.public-page').count()){
    const summary=entry.localizedSummary[locale].trim();for(const p of await page.locator('.content-section p').all())assert.notEqual((await p.textContent()).trim(),summary,'duplicate introductory body');
    for(let i=0;i<entry.sections.length;i++){const section=entry.sections[i];const id='content-'+entry.id.replace(/[^a-z0-9_-]/gi,'-')+'-'+section.id.replace(/[^a-z0-9_-]/gi,'-')+'-'+i;assert.equal(await page.locator('[id="'+id+'"]').count(),1,'preserved section anchor');}
   }
   assert.doesNotMatch(await page.locator('main').innerText(),/B\.V\./,'old operator in current or related content');
   if(locale==='de')assert.doesNotMatch(await page.locator('.editorial-module-copy').allTextContents().then(t=>t.join(' ')),/Beschreiben Sie|Ihren Einstieg|Ihr Vorhaben|Ihr nächster Schritt/);
   assert.equal(await page.locator('video,audio,.presenter-video-play').count(),0);
   assert.equal(await page.locator('img[src="/media/presenters/hero-trio.png"]').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(entry.path==='/'){
    const hero=page.locator('.home-interim-scenes img');assert.equal(await hero.count(),3);
    for(const img of await hero.all())await img.evaluate(i=>i.decode());
    await page.locator('.home-interim-scenes').screenshot({path:out+`hero-${width}-${locale}.png`});
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+`home-${width}-${locale}.png`});
   }
   views.push({page_id:entry.id,path:entry.path,locale,width,scenes:expected.length,modules:route_modules,passed:true});
  }
  await context.close();
 }
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(await hashes(),before);
 await writeFile(out+'browser.json',JSON.stringify({scope:'local optimized Vite output,interim unchanged reference images;not final videos or live acceptance',views,source_sha256:before,external_requests:0,page_errors:errors,passed:true},null,2)+'\n');
 console.log(JSON.stringify({views:views.length,scene_slots:49,public_routes:data.pages.length,external:0,passed:true}));
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
