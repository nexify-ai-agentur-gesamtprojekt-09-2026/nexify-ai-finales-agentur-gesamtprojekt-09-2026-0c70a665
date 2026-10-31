// EN-slice QA regression: locale-switch audit over all public routes.
// Loads each public page, switches #locale through de/nl/fr/en, opens chat + mobile
// nav, and records any browser pageerror. Enumerates ALL en-gap crash sites in one
// pass (not just the first). Permanent diagnostic/regression artifact — do not delete.
// Run: PLAYWRIGHT_MODULE=/app/.local/pw-shim.mjs PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright \
//   /root/toolchain/node22/bin/node --experimental-strip-types apps/site/tests/en-locale-audit.mjs
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer as httpServer} from 'node:http';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createServer} from 'vite';
import handler from '../../../api/agent-chat.ts';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=new URL('../../../',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const map=JSON.parse(await readFile(new URL('config/site-map.json',repo),'utf8'));
const pages=map.pages.filter(p=>map.public_allowlist.includes(p.id)&&p.access.visibility==='public'&&!p.access.auth_required);
let origin;
const backend=httpServer(async(req,res)=>{try{
 const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(v!==undefined)headers.set(k,Array.isArray(v)?v.join(','):v);
 const request=new Request(new URL(req.url,origin),{method:req.method,headers,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});
 const response=await handler.fetch(request);res.writeHead(response.status,Object.fromEntries(response.headers));
 if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
}catch{res.writeHead(500);res.end();}});
await new Promise(r=>backend.listen(0,'127.0.0.1',r));
const cache=await mkdtemp(join(tmpdir(),'en-audit-cache-'));
const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false,proxy:{'/api/agent-chat':{target:`http://127.0.0.1:${backend.address().port}`,changeOrigin:false}}},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const findings=[];
async function newCtx(viewport){const c=await browser.newContext({viewport,reducedMotion:'reduce'});await c.route('**/*',r=>{const u=new URL(r.request().url());if(![origin,'null'].includes(u.origin)&&u.protocol!=='data:')return r.abort();if(u.pathname==='/api/session')return r.fulfill({status:404,json:{error:'no'}});if(u.pathname==='/api/agent-runtime-status')return r.fulfill({status:503,json:{error:'no'}});if(u.pathname.startsWith('/api/')&&u.pathname!=='/api/agent-chat')return r.fulfill({status:403,json:{error:'no'}});return r.continue();});return c;}
async function auditPage(path,viewport){
 const errors=[];const c=await newCtx(viewport);const page=await c.newPage();
 page.on('pageerror',e=>errors.push(String(e.message)));
 try{
  await page.goto(origin+path,{waitUntil:'load'});
  await page.locator('#locale').waitFor({timeout:8000});
  for(const locale of ['de','nl','fr','en']){
   await page.locator('#locale').selectOption(locale).catch(()=>errors.push(`selectOption(${locale}) failed @${path}`));
   await page.waitForTimeout(250);
  }
  const burger=page.locator('.site-nav-toggle, .menu-toggle, [data-testid="nav-toggle"]').first();
  if(await burger.count())await burger.click({force:true}).catch(()=>{});
  await page.waitForTimeout(150);
  const reopen=page.locator('.reopen-chat, [aria-controls="aifly-panel"]').first();
  if(await reopen.count())await reopen.click({force:true}).catch(()=>{});
  await page.waitForTimeout(200);
 }catch(e){errors.push('AUDIT-EX: '+String(e.message).split('\n')[0]);}
 await c.close();
 if(errors.length)findings.push({path,viewport:viewport.width,errors:[...new Set(errors)]});
}
try{
 for(const p of pages){await auditPage(p.path,{width:1440,height:900});}
 for(const path of ['/','/produkte/nex2fly','/teileklar']){await auditPage(path,{width:390,height:844});}
}finally{await browser.close();await server.close();await new Promise(r=>backend.close(r));await rm(cache,{recursive:true,force:true});}
const report={recorded_at:new Date().toISOString(),audited_routes:pages.map(p=>p.path),locale_sequence:['de','nl','fr','en'],pages_with_errors:findings,passed:findings.length===0};
await writeFile(new URL('../../../.local/diagnostics/en-slice-qa/en-locale-audit-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log('AUDIT pages_with_errors='+findings.length);
for(const f of findings)console.log('  '+f.path+' @'+f.viewport+': '+f.errors.join(' | '));
console.log(findings.length?'AUDIT_FAIL':'AUDIT_PASS');
