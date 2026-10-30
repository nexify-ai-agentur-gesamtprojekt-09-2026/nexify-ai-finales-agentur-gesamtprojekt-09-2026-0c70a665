// Form -> /api -> SQLite -> UI readback proof via the ACTUAL partner form (not just API calls).
// Real Chromium -> loopback Vite -> real apps/agent-gateway/server.py -> temp SQLite. The user
// fills the form, submits, and the stored request is rendered back into the UI from the DB.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const folder=await mkdtemp(join(tmpdir(),'nexify-partner-form-'));
let port,backend;const external=[],checks=[];
const vite=await createServer({root,cacheDir:join(folder,'vite-cache'),server:{port:0,hmr:false},plugins:[{name:'partner-proxy',configureServer(v){v.middlewares.use((req,res,next)=>{
 if(!req.url.startsWith('/api/'))return next();
 const headers={...req.headers,host:'127.0.0.1:'+port};
 const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
 upstream.on('error',()=>{res.writeHead(503);res.end();});req.pipe(upstream);
});}}]});
await vite.listen();const origin='http://127.0.0.1:'+vite.httpServer.address().port;
backend=spawn('python3',[repo+'apps/agent-gateway/server.py','--database',join(folder,'visitor.sqlite'),'--port','0','--web-origin',origin],{stdio:['ignore','pipe','pipe']});
let stderr='';backend.stderr.on('data',c=>stderr+=c);
port=await new Promise((resolve,reject)=>{let out='';const timer=setTimeout(()=>reject(new Error('gateway start timeout: '+stderr)),12000);backend.stdout.on('data',c=>{out+=c;const m=out.match(/port ([0-9]+)/);if(m){clearTimeout(timer);resolve(Number(m[1]));}});backend.on('exit',()=>{clearTimeout(timer);reject(new Error('gateway exited: '+stderr));});});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!u.href.startsWith('data:')){external.push(u.origin);return route.abort();}return route.continue();});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const form=page.locator('[data-testid="partner-request-form"]');
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto(origin+'/teileklar/partner-werden');
 await form.waitFor();
 await check('actual partner form submits and the stored request is rendered back from the DB',async()=>{
  await page.locator('[data-testid="partner-submit"]:not([disabled])').waitFor({timeout:8000});
  await page.locator('[data-testid="partner-company"]').fill('Muster Kfz Nord (synthetisch)');
  await page.locator('[data-testid="partner-contact"]').fill('Testkontakt');
  await page.locator('[data-testid="partner-email"]').fill('test-nord@example.invalid');
  await page.locator('[data-testid="partner-message"]').fill('Synthetischer Werkstattpartner-Testantrag – keine echten Personendaten.');
  await page.locator('[data-testid="partner-submit"]').click();
  await form.locator('[data-testid="partner-ok"]').waitFor({timeout:8000});
  const okText=await form.locator('[data-testid="partner-ok"]').innerText();
  const ref=okText.split('Referenz:').pop().trim();
  assert.match(ref,/[a-f0-9]{32}/,'reference id shown in UI');
  // UI readback list must now contain the stored request (rendered from /mine -> SQLite)
  await form.locator('[data-testid^="partner-mine-"]').first().waitFor({timeout:8000});
  const mineText=await form.locator('[data-testid="partner-mine"]').innerText();
  assert.ok(mineText.includes('pending_review'),'stored status rendered in UI readback');
 });
 await check('reception stays fail-closed for an unauthorised browser request',async()=>{
  const res=await page.request.get(origin+'/api/partner/requests');
  assert.equal(res.status(),403);assert.equal((await res.json()).error,'recipient_auth_required');
 });
 await check('no page errors and no external requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
 const report={scope:'actual partner form in real browser -> /api -> sqlite -> UI readback; isolated gateway + temp DB; synthetic data',checks,external_requests:external,page_errors:errors,recipient_browser_authorised_read:'blocked: needs partner/staff role+tenant from protected portal auth (Clerk)'};
 await mkdir(join(repo,'.local/partner'),{recursive:true});
 await writeFile(join(repo,'.local/partner/browser-partner-form.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REPORT .local/partner/browser-partner-form.json');
}finally{await context.close();await browser.close();await vite.close();backend.kill('SIGTERM');await rm(folder,{recursive:true,force:true});}
