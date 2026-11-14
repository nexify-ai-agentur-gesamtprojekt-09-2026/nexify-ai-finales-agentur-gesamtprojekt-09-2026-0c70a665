import {createServer} from 'vite';
import {readFile,writeFile,readdir,lstat,mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {extname,join} from 'node:path';
import {tmpdir} from 'node:os';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));const data=JSON.parse(await readFile(root+'.generated/public-site.json','utf8'));
const repo=fileURLToPath(new URL('../../../',import.meta.url));
// Allow a fresh, versioned report without overwriting historical evidence.
// The caller creates the destination directory before running the test.
const reportPath=process.env.NEXIFY_TEXT_SPACING_EVIDENCE_PATH || 'evidence/one-app-2026-10-27/text-spacing.json';
const binding=JSON.parse(await readFile(repo+'config/text-resize-sources.json','utf8'));
async function hashes(){
 const paths=new Set(binding.files);
 async function walk(relative){for(const name of await readdir(repo+relative)){const path=relative+'/'+name,info=await lstat(repo+path);assert.equal(info.isSymbolicLink(),false,'linked resize source');if(info.isDirectory())await walk(path);else if(info.isFile()&&binding.extensions.includes(extname(path)))paths.add(path);}}
 for(const path of binding.directories)await walk(path);
 return Object.fromEntries(await Promise.all([...paths].sort().map(async path=>[path,createHash('sha256').update(await readFile(repo+path)).digest('hex')])));
}
const before=await hashes();
const cache=await mkdtemp(join(tmpdir(),'nexify-resize-cache-'));
const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false,hmr:false}});await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});const context=await browser.newContext();await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin)return r.abort();if(u.pathname.startsWith('/api/'))return r.fulfill({status:403,json:{error:'synthetic'}});return r.continue();});
const report={runtime_error_capture:true,runtime_errors:[],completed:false,observed_at:new Date().toISOString(),source_sha256:before,scope:'text-spacing and 200% text resize geometry; not screenreader or full visual conformance',checks:[],issues:[]};
let testFailure;
try{const page=await context.newPage();page.on('pageerror',error=>report.runtime_errors.push({name:error.name,message:error.message.slice(0,500)}));page.on('console',message=>{if(/An error occurred in one of your React components|Failed to fetch dynamically imported module/.test(message.text()))report.runtime_errors.push({name:'component_runtime_error',message:message.text().slice(0,500)});});for(const item of data.pages){for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.goto(origin+item.path);await page.locator('.workspace-shell').waitFor();if(process.env.RESIZE_RUNTIME_ERROR_PROBE==='1')await page.evaluate(()=>setTimeout(()=>{throw new Error('synthetic resize runtime failure');},0));await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.deepEqual(report.runtime_errors,[],'runtime errors invalidate geometry evidence');await page.addStyleTag({content:'* {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important;} p {margin-bottom:2em !important;}'});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.checks.push({path:item.path,width,text_spacing:true,overflow});if(overflow)report.issues.push({path:item.path,width,type:'text_spacing_overflow'});}
 await page.setViewportSize({width:1280,height:900});await page.goto(origin+item.path);await page.locator('.workspace-shell').waitFor();const resized=await page.evaluate(()=>{
  // <track> und <source> in <video>/<audio> sind leere Ressourcenverweise (HTML: Inhaltsmodell "nichts"). Sie liegen nicht im gerenderten Baum,
  // der Browser berechnet fuer sie keine Schriftgroesse (getComputedStyle liefert ''), und sie koennen keinen Text darstellen.
  // Nur genau diese Elemente werden ausgenommen und gezaehlt; jedes andere Element ohne messbare Schriftgroesse laesst die Pruefung weiter scheitern.
  const all=[...document.querySelectorAll('body,body *')].filter(e=>e instanceof HTMLElement);
  const resourceOnly=e=>(e instanceof HTMLTrackElement||e instanceof HTMLSourceElement)&&e.parentElement instanceof HTMLMediaElement;
  const excluded=all.filter(resourceOnly),nodes=all.filter(e=>!resourceOnly(e));
  const excluded_without_text=excluded.every(e=>e.childNodes.length===0&&getComputedStyle(e).fontSize==='');
  const before=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));nodes.forEach((e,i)=>e.style.setProperty('font-size',String(before[i]*2)+'px','important'));
  return {count:nodes.length,measurable:before.every(size=>Number.isFinite(size)),excluded_resource_elements:excluded.length,excluded_without_text,all_doubled:nodes.every((e,i)=>Math.abs(parseFloat(getComputedStyle(e).fontSize)-before[i]*2)<0.05)};});
 assert.equal(resized.excluded_without_text,true,'only empty, unrendered media resource elements may be left out');assert.equal(resized.measurable,true,'every text-capable element has a measurable font size');assert.equal(resized.all_doubled,true);const content_overflows=await page.evaluate(()=>[...document.querySelectorAll('h1,h2,h3,p,.home-area-name,.home-area-detail,.home-service,.footer-link-groups a,.site-header,.aifly-panel')].filter(e=>{const s=getComputedStyle(e);const accessiblyClipped=e.classList.contains('visually-hidden')&&s.position==='absolute'&&s.overflow==='hidden'&&e.clientWidth<=1&&e.clientHeight<=1&&(s.clip!=='auto'||s.clipPath!=='none');return !accessiblyClipped&&e.checkVisibility({checkVisibilityCSS:true})&&e.clientWidth>0&&e.scrollWidth>e.clientWidth+1;}).map(e=>({tag:e.tagName,class:e.className,client:e.clientWidth,scroll:e.scrollWidth})));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);report.checks.push({path:item.path,width:1280,text_resize_200:true,resized,overflow,content_overflows});if(overflow||content_overflows.length)report.issues.push({path:item.path,width:1280,type:'text_resize_overflow',content_overflows});
}assert.deepEqual(await hashes(),before,'source drift during resize measurement');assert.deepEqual(report.runtime_errors,[],'runtime errors invalidate geometry evidence');report.completed=report.issues.length===0;}catch(error){testFailure=error;throw error;}finally{await browser.close();await server.close();await rm(cache,{recursive:true,force:true});try{await writeFile(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}catch(error){if(testFailure)throw new AggregateError([testFailure,error],'resize test and report write failed');throw error;}}console.log(JSON.stringify({checks:report.checks.length,issues:report.issues}));assert.equal(report.issues.length,0);
