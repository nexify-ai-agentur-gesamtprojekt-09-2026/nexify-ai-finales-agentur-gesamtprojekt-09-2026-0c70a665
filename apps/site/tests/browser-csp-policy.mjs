// Exact current deployment headers over actual local production assets.
// Controlled policy violations only; no provider events or external report collector.
import assert from 'node:assert/strict';
import {preview} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const config=JSON.parse(await readFile(repo+'vercel.json','utf8'));
const headers=Object.fromEntries(config.headers.find(h=>h.source==='/(.*)').headers.map(h=>[h.key,h.value]));
const server=await preview({root,preview:{host:'127.0.0.1',port:0,strictPort:false,headers}});
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true}),external=[],pageErrors=[];
try{
 const context=await browser.newContext();
 await context.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==origin){external.push(u.origin);return r.abort();}if(u.pathname.startsWith('/api/'))return r.fulfill({status:204});return r.continue();});
 const page=await context.newPage();page.on('pageerror',e=>pageErrors.push(e.message));
 const response=await page.goto(origin+'/?synthetic_csp_probe=1');
 assert.equal(response.headers()['content-security-policy'],headers['Content-Security-Policy']);
 assert.equal(response.headers()['report-to'],undefined);
 await page.locator('.home-interim-scenes').waitFor();
 for(const img of await page.locator('.home-interim-scenes img').all())await img.evaluate(i=>i.decode());
 await page.evaluate(()=>{
  window.__cspProbe=[];
  addEventListener('securitypolicyviolation',e=>window.__cspProbe.push({directive:e.effectiveDirective,disposition:e.disposition}));
  const image=new Image();image.src='https://blocked.invalid/csp-probe.png';document.body.append(image);
  const script=document.createElement('script');script.src='https://blocked.invalid/csp-probe.js';document.head.append(script);
 });
 await page.waitForFunction(()=>window.__cspProbe.length>=2);
 const violations=await page.evaluate(()=>window.__cspProbe);
 assert.ok(violations.some(v=>v.directive==='img-src'&&v.disposition==='enforce'));
 assert.ok(violations.some(v=>v.directive==='script-src-elem'&&v.disposition==='enforce'));
 assert.deepEqual(external,[]);assert.deepEqual(pageErrors,[]);
 await mkdir(repo+'.local/csp-report-removal',{recursive:true});
 const source_sha256=Object.fromEntries(await Promise.all(['vercel.json','apps/site/tests/fixtures/csp-enforcement-baseline.json','apps/site/tests/csp-reporting.test.mjs','apps/site/tests/browser-csp-policy.mjs'].map(async f=>[f,createHash('sha256').update(await readFile(repo+f)).digest('hex')])));
 await writeFile(repo+'.local/csp-report-removal/browser.json',JSON.stringify({scope:'actual local production assets with current deployment CSP;two controlled blocked URLs;no live deployment or customer data',violations,external_requests:0,external_events:0,page_errors:pageErrors,source_sha256,passed:true},null,2)+'\n');
 console.log(JSON.stringify({passed:true,violations,external_requests:0}));
 await context.close();
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
