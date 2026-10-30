// Isolated browser proof for the TEILEKLAR workshop directory. Real Chromium -> loopback Vite
// build. The 579-record directory is NEVER bundled into the public build; here it is injected
// only as a clearly labelled isolated fixture via request interception. External requests are
// blocked. Proves success / empty(not-configured) / error(invalid JSON) / error(invalid schema).
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdtemp,rm,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
// Isolated fixture ONLY (not a public asset): the real prototype directory data.
const fixture=await readFile(join(repo,'prototypen/assets/workshops.json'),'utf8');

const folder=await mkdtemp(join(tmpdir(),'nexify-workshop-'));
const vite=await createServer({root,cacheDir:join(folder,'vite-cache'),server:{port:0,hmr:false},plugins:[{name:'isolated-no-api',configureServer(v){v.middlewares.use((req,res,next)=>{
 if(req.url&&req.url.startsWith('/api/')){res.statusCode=503;res.setHeader('content-type','application/json');return res.end('{"error":"isolated_no_api"}');}
 return next();
});}}]});
await vite.listen();
const origin='http://127.0.0.1:'+vite.httpServer.address().port;
const DATA='**/teileklar/workshops.json';
const checks=[],external=[],pageErrors=[];
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!u.href.startsWith('data:')){external.push(u.origin);return route.abort();}return route.continue();});
const page=await context.newPage(),panel=page.locator('[data-testid="workshop-directory"]');
page.on('pageerror',e=>pageErrors.push(String(e)));
async function serve(scenario){
 await page.unroute(DATA).catch(()=>{});
 await context.unroute(DATA).catch(()=>{});
 await context.route(DATA,route=>{
  if(scenario==='valid')return route.fulfill({status:200,contentType:'application/json',body:fixture});
  if(scenario==='html')return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><title>spa</title>'});
  if(scenario==='badjson')return route.fulfill({status:200,contentType:'application/json',body:'this is not json'});
  if(scenario==='badschema')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({'de-DE':{total:5}})});
  return route.fulfill({status:404,contentType:'application/json',body:'{}'});
 });
}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 // 1) SUCCESS: valid isolated fixture renders regions, detail, filter, back
 await serve('valid');
 await page.goto(origin+'/teileklar/werkstatt');
 await panel.waitFor();
 await check('valid isolated fixture lists metro regions and never claims contractual partners',async()=>{
  await page.locator('[data-testid="workshop-regions"]').waitFor();
  assert.ok((await page.locator('[data-testid="workshop-disclaimer"]').innerText()).includes('keine verifizierten Vertragspartner'));
  assert.ok(await page.locator('[data-testid^="workshop-region-"]').count()>=1);
 });
 await check('opening a region shows its workshops and search narrows the list',async()=>{
  await page.locator('[data-testid="workshop-open-berlin"]').click();
  await page.locator('[data-testid="workshop-detail"]').waitFor();
  const before=await page.locator('[data-testid^="workshop-shop-"]').count();
  assert.ok(before>=1,'expected at least one Berlin workshop in fixture');
  await page.locator('[data-testid="workshop-search"]').fill('zzzznonexistent');
  await page.locator('[data-testid="workshop-nohits"]').waitFor();
  await page.locator('[data-testid="workshop-search"]').fill('');
  await page.waitForFunction(n=>document.querySelectorAll('[data-testid^="workshop-shop-"]').length===n,before);
  await page.locator('[data-testid="workshop-back"]').click();
  await page.locator('[data-testid="workshop-regions"]').waitFor();
 });
 await check('mobile width keeps directory within viewport (no horizontal overflow)',async()=>{
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.setViewportSize({width:1280,height:900});
 });
 // 2) EMPTY: SPA HTML fallback / not configured -> honest empty, not error
 await serve('html');
 await page.goto(origin+'/teileklar/werkstatt');
 await check('spa html fallback is treated as honest empty not-configured state',async()=>{
  await panel.locator('[data-testid="workshop-empty"]').waitFor();
  assert.equal(await panel.locator('[data-testid="workshop-regions"]').count(),0);
 });
 // 3) ERROR: configured source returns invalid JSON -> traceable error, not silent empty
 await serve('badjson');
 await page.goto(origin+'/teileklar/werkstatt');
 await check('configured source with invalid JSON surfaces a traceable error state',async()=>{
  await panel.locator('[data-testid="workshop-state"][role="alert"]').waitFor();
  assert.equal(await panel.locator('[data-testid="workshop-empty"]').count(),0);
 });
 // 4) ERROR: configured source with invalid schema -> error, not empty
 await serve('badschema');
 await page.goto(origin+'/teileklar/werkstatt');
 await check('configured source with invalid schema surfaces a traceable error state',async()=>{
  await panel.locator('[data-testid="workshop-state"][role="alert"]').waitFor();
  assert.equal(await panel.locator('[data-testid="workshop-empty"]').count(),0);
 });
 assert.deepEqual(external,[]);
 assert.deepEqual(pageErrors,[]);
 const report={scope:'isolated real-prototype workshop fixture in actual browser; not a public asset; no contractual-partner claim',checks,external_requests:external,page_errors:pageErrors,data_source:'prototypen/assets/workshops.json (unverified directory, isolated test only)'};
 await mkdir(join(repo,'.local/workshop'),{recursive:true});
 await writeFile(join(repo,'.local/workshop/browser-workshop-directory.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REPORT .local/workshop/browser-workshop-directory.json');
}finally{await context.close();await browser.close();await vite.close();await rm(folder,{recursive:true,force:true});}
