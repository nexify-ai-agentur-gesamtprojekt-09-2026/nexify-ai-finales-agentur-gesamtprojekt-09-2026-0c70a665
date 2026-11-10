// Tests a media error occurring before React hydrates server-rendered markup.
// No generated media or external model request is involved.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import React from 'react';
import {renderToString} from 'react-dom/server';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../../../',import.meta.url));
let component;
const server=await createServer({root:root+'apps/web',publicDir:'public',server:{host:'127.0.0.1',port:0},plugins:[{name:'early-media-error-fixture',configureServer(vite){vite.middlewares.use('/film-fixture',async(req,res,next)=>{try{const locale=new URL(req.url,'http://local').searchParams.get('lang')||'de';const asset={src:'/test-film.mp4',poster:'/media/higgsfield/hf-02-lobby-walk-1920.webp',posterAlt:'Poster: Pascal, NeX, ORACLE',width:1280,height:720,title:'Film: Pascal',hasAudio:true};const markup=renderToString(React.createElement(component,{asset,locale,hero:true}));let html=`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"></head><body><div id="root">${markup}</div><script type="module" src="/@fs${root}apps/site/tests/atelier-film-hydration-fixture.tsx"></script></body></html>`;html=await vite.transformIndexHtml(req.url,html);res.statusCode=200;res.setHeader('content-type','text/html');res.end(html);}catch(e){next(e);}});}}]});
await server.listen();
component=(await server.ssrLoadModule(root+'apps/web/components/AtelierFilm.tsx')).default;const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true,args:['--disable-features=Translate']});
const errors={de:'Der Film ist gerade nicht verfügbar.',nl:'De film is momenteel niet beschikbaar.',fr:'Le film est indisponible.',en:'The film is currently unavailable.'};
try{for(const [locale,message] of Object.entries(errors)){
 const context=await browser.newContext({reducedMotion:'reduce',locale});let release;const gate=new Promise(resolve=>release=resolve);let videoRequests=0,blockMedia=true;
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(u.pathname==='/test-film.mp4'){videoRequests++;return blockMedia?route.abort('failed'):route.fulfill({path:root+'apps/web/public/media/home-review/pascal-studio-scene-original-20261109.mp4',contentType:'video/mp4'});}if(u.pathname==='/@vite/client'||u.pathname.endsWith('atelier-film-hydration-fixture.tsx'))await gate;return route.continue();});
 const page=await context.newPage();
 try{await page.goto(origin+'/film-fixture?lang='+locale,{waitUntil:'commit'});await page.waitForFunction(()=>document.querySelector('video')?.error!==null&&document.querySelector('video')?.error!==undefined);assert.ok(videoRequests>=1,'media failure occurred before hydration');assert.equal(await page.locator('.atelier-film').getAttribute('data-playback'),'paused','initial server markup is not hydrated');release();
  await page.waitForSelector('.atelier-film[data-playback="error"]',{timeout:10000});assert.equal(await page.locator('.atelier-film-error').innerText(),message);const poster=page.locator('.atelier-film-fallback');assert.equal(await poster.getAttribute('aria-hidden'),'false');assert.equal(await poster.getAttribute('alt'),'Poster: Pascal, NeX, ORACLE');assert.equal(await poster.isVisible(),true);assert.equal(await page.locator('video').getAttribute('aria-label'),'Film: Pascal');blockMedia=false;await page.locator('.atelier-film-controls button').first().click();await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.readyState>=2;},{timeout:10000});assert.equal(await page.locator('.atelier-film').getAttribute('data-playback'),'playing');assert.equal(await page.locator('.atelier-film-error').count(),0);console.log(JSON.stringify({locale,preHydrationFailure:true,automaticFallback:true,manualRetry:true}));
 }finally{release();await context.close();}
}
// A decoded frame may also arrive before hydration, especially with reduced motion.
// The poster must stop covering that frame without asking the visitor to play.
for(const locale of Object.keys(errors)){
 const context=await browser.newContext({reducedMotion:'reduce',locale});let release;const gate=new Promise(resolve=>release=resolve);
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(u.pathname==='/test-film.mp4')return route.fulfill({path:root+'apps/web/public/media/home-review/pascal-studio-scene-original-20261109.mp4',contentType:'video/mp4'});if(u.pathname==='/@vite/client'||u.pathname.endsWith('atelier-film-hydration-fixture.tsx'))await gate;return route.continue();});
 const page=await context.newPage();
 try{await page.goto(origin+'/film-fixture?lang='+locale,{waitUntil:'commit'});await page.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&v.error===null;},null,{timeout:10000});assert.equal(await page.locator('.atelier-film-fallback').count(),1,'SSR poster exists before hydration');assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'reduced motion does not start video');release();await page.locator('.atelier-film-fallback').waitFor({state:'detached',timeout:10000});assert.equal(await page.locator('.atelier-film-error').count(),0);assert.equal(await page.locator('.atelier-film').getAttribute('data-playback'),'paused');console.log(JSON.stringify({locale,preHydrationDecodedFrame:true,posterRemoved:true,reducedMotionPaused:true}));}finally{release();await context.close();}
}
}finally{await browser.close();await server.close();}
