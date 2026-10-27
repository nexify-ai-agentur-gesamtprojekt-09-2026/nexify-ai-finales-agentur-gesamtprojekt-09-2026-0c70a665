// Exhaustive local public-route coverage; synthetic session, no external provider.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const data=await generate(), root=fileURLToPath(new URL('../',import.meta.url));
const byPath=new Map(data.pages.map(p=>[p.path,p]));
const server=await createServer({root,configFile:root+'vite.config.ts',server:{port:0,strictPort:false,hmr:false},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const report={scope:'local public app, synthetic session; no real auth/provider or WCAG certification',routes:data.pages.length,locales:['de','nl'],viewports:[320,390,1280],checks:[],edges:[],issues:[],requests:{mutations:0,external:0},pwa:{}};
const capabilities=Object.fromEntries(['quote_pdf','pending_outbox','booking_request','marketing_template','email_delivery','external_calendar','model_chat','local_planning'].map(k=>[k,false]));
const norm=s=>s.replace(/\s+/g,' ').trim();
let offline=false;
async function setup(context){await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==origin&&u.protocol!=='data:'){report.requests.external++;return route.abort();}if(offline)return route.abort('internetdisconnected');if(u.pathname.startsWith('/api/')){if(req.method()!=='GET')report.requests.mutations++;if(u.pathname==='/api/session')return route.fulfill({json:{csrf:'synthetic-only',history:[],capabilities}});return route.fulfill({status:403,json:{error:'synthetic_denied'}});}return route.continue();});}
async function ready(page,path,locale){await page.waitForFunction(({title,locale})=>document.title===title&&document.documentElement.lang===locale,{title:byPath.get(path).localizedTitle[locale]+' · NeXify AI',locale});assert.equal(await page.locator('.workspace-shell').count(),1);assert.equal(await page.locator('main h1').count(),1);}
try{
 await Promise.all(report.locales.map(async locale=>{
  const context=await browser.newContext({viewport:{width:1280,height:900}});await setup(context);let page;
  for(const p of data.pages){
   if(page)await page.close();page=await context.newPage();
   await page.goto(origin+p.path);await page.locator('#locale').selectOption(locale);await ready(page,p.path,locale);
   if(p.path==='/')assert.equal(await page.locator('.home-area-link[href="/teileklar/werkstatt"] .home-area-name').innerText(),locale==='nl'?'Werkplaats':'Werkstatt');
   if(p.path!=='/'){
    assert.equal(norm(await page.locator('main h1').innerText()),norm(p.localizedTitle[locale]));
    assert.equal(norm(await page.locator('.content-purpose').innerText()),norm(p.localizedSummary[locale]));
    const rendered=await page.locator('.content-section').allInnerTexts();
    for(const s of p.sections)assert.ok(rendered.some(t=>norm(t).includes(norm(s.heading[locale]))&&norm(t).includes(norm(s.body[locale]))),p.path+' '+locale+' section '+s.id);
   }
   const mainText=await page.locator('main').innerText();assert.ok(!/\[object Object\]|undefined|NaN/.test(mainText));
   await page.reload();await ready(page,p.path,locale);
   // Keyboard entry and heading focus on every direct route, not only homepage.
   await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'page-content');
   const shape=await page.evaluate(()=>{
    const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
    const name=e=>e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')?.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ')||e.labels?.[0]?.textContent||e.innerText||e.getAttribute('title')||e.querySelector('img')?.getAttribute('alt')||'';
    const controls=[...document.querySelectorAll('button,input:not([type=hidden]),select,textarea,a[href],summary')].filter(visible);
    return {unnamed:controls.filter(e=>!name(e).trim()).map(e=>e.outerHTML.slice(0,150)),missingAlt:[...document.images].filter(e=>visible(e)&&!e.hasAttribute('alt')).map(e=>e.src),small:controls.filter(e=>{const b=e.getBoundingClientRect();return (b.width<44||b.height<44)&&!e.closest('p');}).map(e=>({tag:e.tagName,class:e.className,label:name(e).trim().slice(0,50),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})),links:[...document.querySelectorAll('a[href]')].map(e=>e.getAttribute('href')).filter(h=>h.startsWith('/')&&!h.startsWith('//'))};
   });
   if(shape.unnamed.length||shape.missingAlt.length)report.issues.push({path:p.path,locale,type:'accessible_names',unnamed:shape.unnamed,missingAlt:shape.missingAlt});
   if(shape.small.length)report.issues.push({path:p.path,locale,type:'target_under_44',elements:shape.small});
   // All actual distinct cross-route anchors present in the DOM. Programmatic
   // activation tests router behavior; separate keyboard/viewport checks test input.
   const targets=[...new Set(shape.links.map(h=>new URL(h,origin).pathname).filter(t=>t!==p.path))];
   await page.evaluate(()=>window.coverageShell=document.querySelector('.workspace-shell'));
   for(const target of targets)assert.ok(byPath.has(target),'unbound public link '+p.path+' -> '+target);
   await page.evaluate(async({targets,from,titles,locale})=>{
    const wait=path=>new Promise((resolve,reject)=>{const end=Date.now()+5000;function poll(){if(location.pathname===path&&document.title===titles[path]+' · NeXify AI'&&document.documentElement.lang===locale)return resolve();if(Date.now()>end)return reject(Error('route did not settle '+path));requestAnimationFrame(poll);}poll();});
    for(const target of targets){
     const a=[...document.querySelectorAll('a[href]')].find(a=>a.origin===location.origin&&new URL(a.href).pathname===target);if(!a)throw Error('missing anchor');a.click();await wait(target);
     if(window.coverageShell!==document.querySelector('.workspace-shell'))throw Error('shell replaced');
     history.back();await wait(from);if(target===targets[0]){history.forward();await wait(target);history.back();await wait(from);}
    }
   },{targets,from:p.path,titles:Object.fromEntries(data.pages.map(p=>[p.path,p.localizedTitle[locale]])),locale});
   for(const target of targets)report.edges.push({from:p.path,to:target,locale,history:'back on each edge; forward/back on first edge per source',shell_preserved:true});
   assert.match(await page.locator('.site-header .brand').getAttribute('aria-label'),locale==='nl'?/Startpagina/:/Startseite/);
   if(p.site_context==='teileklar')assert.equal(await page.locator('.site-header .brand small').innerText(),locale==='nl'?'Een onderdeel van NeXify AI':'Ein Bereich von NeXify AI');

   for(const width of report.viewports){await page.setViewportSize({width,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));if(overflow.scroll>width+1)report.issues.push({path:p.path,locale,type:'horizontal_overflow',...overflow});}
   await page.setViewportSize({width:1280,height:900});report.checks.push({path:p.path,locale,deep_link:true,reload:true,localized_content:true,skip_link:true,viewports:report.viewports});
   console.log('CHECK '+locale+' '+p.path+' edges='+targets.length);
  }
  await context.close();
 }));
 const context=await browser.newContext();await setup(context);const page=await context.newPage();await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();
 report.pwa={manifest_links:await page.locator('link[rel=manifest]').count(),registrations:await page.evaluate(async()=>('serviceWorker'in navigator?(await navigator.serviceWorker.getRegistrations()).length:0)),cache_names:await page.evaluate(async()=>('caches'in window?await caches.keys():[])),active_pwa:false};
 assert.equal(report.pwa.manifest_links,0);assert.equal(report.pwa.registrations,0);assert.deepEqual(report.pwa.cache_names,[]);
 offline=true;await context.setOffline(true);let failed=false;try{await page.reload({timeout:6000});}catch{failed=true;}assert.ok(failed,'offline network document unexpectedly reloads');report.pwa.network_reload_offline_unavailable=true;
 offline=false;await context.setOffline(false);await page.goto(origin+'/');await page.locator('.workspace-shell').waitFor();report.pwa.reconnect_restores_shell=true;await context.close();
 assert.equal(report.requests.mutations,0);assert.equal(report.requests.external,0);
}finally{await browser.close();await server.close();await writeFile(new URL('../../../evidence/one-app-2026-10-27/public-route-coverage.json',import.meta.url),JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({routes:report.routes,route_locale_checks:report.checks.length,edges:report.edges.length,issues:report.issues.length,pwa:report.pwa}));
if(report.issues.length)process.exitCode=1;
