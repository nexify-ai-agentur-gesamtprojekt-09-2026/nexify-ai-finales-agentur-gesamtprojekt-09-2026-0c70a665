// Actual browser controls + isolated media-element double; no real video/audio
// decode, voice approval or production acceptance. No fixture is a public asset.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repository=new URL('../../../',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const paths=['apps/web/components/PresenterVideo.tsx','apps/web/components/PresenterVideo.css','apps/web/components/HomeContent.tsx','apps/web/components/ExplainerSections.tsx','apps/site/src/main.tsx','apps/site/scripts/generate-public-data.mjs','config/site-map.json','apps/site/tests/fixtures/presenter-video.tsx','apps/site/tests/browser-video-player.mjs','apps/site/scripts/public-video-assets.mjs','config/page-media-registry.json','apps/web/components/HomeRebuild.css','apps/web/app/globals.css','packages/tokens/tokens.css','apps/site/scripts/public-explainers.mjs','config/page-explainers.json','apps/site/tests/fixtures/presenter-video.html'];
async function hashes(){return Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(new URL(path,repository))).digest('hex')])));}
const before=await hashes(),cache=await mkdtemp(join(tmpdir(),'nexify-video-controls-'));
const server=await createServer({root,configFile:false,plugins:[react()],publicDir:fileURLToPath(new URL('../../web/public',import.meta.url)),cacheDir:cache,resolve:{dedupe:['react','react-dom']},define:{__PUBLIC_PWA__:'false'},optimizeDeps:{entries:['index.html','tests/fixtures/presenter-video.html']},server:{host:'127.0.0.1',port:0,fs:{allow:[fileURLToPath(repository)]}}});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{})});
const checks=[],external=[],runtimeErrors=[];
async function check(id,run){await run();checks.push({id,passed:true});}
async function context(options={}){
  const context=await browser.newContext({viewport:{width:390,height:844},...options});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin){external.push(url.origin);return route.abort();}if(url.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'isolated_browser_backend_unavailable'})});if(url.pathname.startsWith('/media/test-only/'))return route.fulfill(url.pathname.endsWith('.vtt')?{status:200,contentType:'text/vtt',body:'WEBVTT\n\n00:00.000 --> 00:01.000\nIsolated test caption\n'}:{status:204,body:''});return route.continue();});
  context.on('page',page=>page.on('pageerror',error=>runtimeErrors.push(error.message)));
  return context;
}
try{
  const context1=await context({reducedMotion:'reduce'});
  await context1.addInitScript(()=>{
    window.__mediaCalls=[];window.__denyMediaPlay=false;
    Object.defineProperty(HTMLMediaElement.prototype,'paused',{configurable:true,get(){return !this.__testPlaying;}});
    HTMLMediaElement.prototype.play=function(){window.__mediaCalls.push({action:'play',muted:this.muted});if(window.__denyMediaPlay)return Promise.reject(new Error('Isolated autoplay rejection'));this.__testPlaying=true;this.dispatchEvent(new Event('play'));return Promise.resolve();};
    HTMLMediaElement.prototype.pause=function(){window.__mediaCalls.push({action:'pause'});this.__testPlaying=false;this.dispatchEvent(new Event('pause'));};
  });
  const page=await context1.newPage();await page.goto(origin+'/tests/fixtures/presenter-video.html');await page.locator('.presenter-video').first().waitFor();
  await check('manual_start_no_audible_autoplay_preload_none_and_contain',async()=>{
    assert.equal(await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='play').length),0);
    assert.equal(await page.locator('video[autoplay]').count(),0);assert.equal(await page.locator('.presenter-video').first().getByRole('button',{name:'Video abspielen',exact:true}).getAttribute('aria-pressed'),null);assert.equal(await page.locator('video[preload="none"]').count(),2);
    assert.equal(await page.locator('video').first().evaluate(node=>getComputedStyle(node).objectFit),'contain');
    await page.locator('.presenter-video').first().getByRole('button',{name:'Video abspielen',exact:true}).focus();await page.keyboard.press('Enter');
    await page.locator('.presenter-video').first().getByRole('button',{name:'Video pausieren',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='play')[0].muted),false);
  });
  await check('sound_pause_captions_and_plain_transcript_are_keyboard_accessible',async()=>{
    const player=page.locator('.presenter-video').first();assert.equal(await player.getByRole('button',{name:'Ton ausschalten'}).getAttribute('aria-pressed'),null);await player.getByRole('button',{name:'Ton ausschalten'}).click();assert.equal(await player.locator('video').evaluate(node=>node.muted),true);
    await player.getByRole('button',{name:'Untertitel',exact:true}).click();assert.equal(await player.getByRole('button',{name:'Untertitel',exact:true}).getAttribute('aria-pressed'),'false');
    await player.locator('summary').focus();await page.keyboard.press('Enter');assert.match(await player.locator('details[open]').innerText(),/<script>never executed<\/script>/);assert.equal(await player.locator('script').count(),0);
    await player.getByRole('button',{name:'Video pausieren',exact:true}).click();assert.equal(await player.locator('video').evaluate(node=>node.paused),true);
  });
  await check('second_film_stops_first_and_locale_change_stops_speech',async()=>{
    await page.locator('.presenter-video').first().getByRole('button',{name:'Video abspielen',exact:true}).click();await page.locator('.presenter-video').nth(1).getByRole('button',{name:'Video abspielen',exact:true}).click();
    assert.equal(await page.locator('video').first().evaluate(node=>node.paused),true);
    const before=await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='pause').length);await page.getByLabel('Locale').selectOption('nl');
    await page.locator('.presenter-video').first().getByRole('button',{name:'Video afspelen',exact:true}).waitFor();assert.ok(await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='pause').length)>before);assert.equal(await page.locator('video').first().getAttribute('autoplay'),null);
    await page.getByLabel('Locale').selectOption('fr');await page.locator('.presenter-video').first().getByRole('button',{name:'Lire la vidéo',exact:true}).waitFor();
  });
  await check('failed_play_retains_transcript_and_retry_and_unmount_pause',async()=>{
    await page.getByLabel('Locale').selectOption('de');await page.evaluate(()=>{window.__denyMediaPlay=true;});await page.locator('.presenter-video').first().getByRole('button',{name:'Video abspielen',exact:true}).click();await page.locator('.presenter-video').first().getByRole('status').waitFor();
    assert.equal(await page.locator('.presenter-video').first().locator('details').count(),1);await page.evaluate(()=>{window.__denyMediaPlay=false;});await page.locator('.presenter-video').first().getByRole('button',{name:'Video abspielen',exact:true}).click();
    const before=await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='pause').length);await page.locator('#unmount').click();assert.equal(await page.locator('video').count(),0);assert.ok(await page.evaluate(()=>window.__mediaCalls.filter(x=>x.action==='pause').length)>before);
    await page.locator('#unmount').click();await page.locator('#invalid').click();assert.equal(await page.locator('video').count(),0);
  });
  await check('mobile_geometry_focus_and_reduced_motion',async()=>{
    await page.locator('#invalid').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.presenter-video-motion').count(),2);
    for(const button of await page.locator('.presenter-video-controls button').all()){const box=await button.boundingBox();assert.ok(box.height>=44);}
  });
  await check('route_intro_and_module_binding_are_distinct_no_first_module_or_foreign_locale_fallback',async()=>{
    await page.locator('#module-mode').click();const modules=page.locator('.editorial-module');
    assert.equal(await page.locator('.editorial-route-film video').count(),1);
    assert.equal(await modules.nth(0).locator('video').count(),0);
    assert.equal(await modules.nth(1).locator('video').count(),1);
    assert.equal(await page.locator('.editorial-explainers video').count(),2);
    assert.equal(await modules.nth(1).locator('video').getAttribute('aria-label'),'Second module film');
    assert.equal(await page.getByText('UNBOUND_TEST',{exact:true}).count(),0);
  });
  await context1.close();
  const map=JSON.parse(await readFile(new URL('config/site-map.json',repository),'utf8'));const publicPages=map.pages.filter(p=>map.public_allowlist.includes(p.id)&&p.access.visibility==='public');
  const projected=JSON.parse(await readFile(new URL('apps/site/.generated/public-site.json',repository),'utf8'));
  const baseline=await context();const routePage=await baseline.newPage(),routes=[];
  for(const entry of publicPages){await routePage.goto(origin+entry.path);await routePage.locator('#root main').first().waitFor();const expected=(projected.videos?.[entry.id]?.de?1:0)+Object.values(projected.videoModules?.[entry.id]||{}).filter(binding=>binding.de).length;assert.equal(await routePage.locator('video').count(),expected);assert.equal(await routePage.locator('track').count(),expected);assert.equal(await routePage.locator('audio,iframe').count(),0);routes.push({page_id:entry.id,path:entry.path,approved_videos:expected,observed_video_nodes:expected,status:expected?'approved_projection_rendered_decode_not_verified':'pending_real_assets'});}
  await baseline.close();assert.deepEqual(external,[]);assert.deepEqual(runtimeErrors,[]);assert.deepEqual(await hashes(),before,'Sources changed during browser run');
  const report={recorded_at:new Date().toISOString(),source_sha256:before,checks,routes,external_requests:external,runtime_errors:runtimeErrors,passed:true,controller_test_adapter:'HTMLMediaElement play/pause controlled double; no real decode or audible QA',production_accepted:false,scope:'Actual isolated browser keyboard/locale/lifecycle/geometry;36public route pending baseline, no private login or provider call'};
  await mkdir(new URL('evidence/page-videos-2026-10-27/',repository),{recursive:true});await writeFile(new URL('evidence/page-videos-2026-10-27/browser-video.json',repository),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,public_routes:routes.length,passed:true,real_media_decode:false}));
}finally{await browser.close();await server.close();await rm(cache,{recursive:true,force:true});}
