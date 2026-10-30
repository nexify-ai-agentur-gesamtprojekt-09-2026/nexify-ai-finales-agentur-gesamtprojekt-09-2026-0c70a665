// Isolated real-browser proof for partner request STORAGE and fail-closed RECEPTION.
// Actual Chromium -> loopback Vite proxy -> real apps/agent-gateway/server.py -> temp SQLite.
// The gateway runs WITHOUT --public-origin, so cookies are not Secure (existing design for
// http loopback; the Secure flag is NOT weakened anywhere). Separate throwaway DB; synthetic
// data only. Proves: submit -> API -> DB -> submitter readback; reception is fail-closed
// (needs a partner/staff role+tenant from the protected portal auth, absent here).
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
const folder=await mkdtemp(join(tmpdir(),'nexify-partner-'));
let port,backend;
const external=[],checks=[];
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
const browser=await chromium.launch({headless:true}),context=await browser.newContext();
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!u.href.startsWith('data:')){external.push(u.origin);return route.abort();}return route.continue();});
const page=await context.newPage();
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 const session=await (await page.request.get(origin+'/api/session')).json();
 assert.ok(session.csrf,'session csrf issued');
 const synthetic={tenant:'tenant-nord',company:'Muster Kfz Nord (synthetisch)',contact:'Testkontakt',email:'test-nord@example.invalid',message:'Synthetischer Werkstattpartner-Testantrag – keine echten Personendaten.',locale:'de'};
 let reference;
 await check('browser submit persists a partner request through the real API',async()=>{
  const res=await page.request.post(origin+'/api/partner/requests',{headers:{Origin:origin,'X-CSRF-Token':session.csrf,'Idempotency-Key':'synthetic-partner-browser-0001','Content-Type':'application/json'},data:synthetic});
  assert.equal(res.status(),200);const body=await res.json();
  assert.equal(body.status,'pending_review');assert.equal(body.stored,true);
  assert.equal(body.received,false);assert.equal(body.delivered,false);assert.equal(body.approved,false);
  reference=body.id;assert.match(reference,/^[a-f0-9]{32}$/);
 });
 await check('submitter readback returns the stored request from the database',async()=>{
  const mine=await (await page.request.get(origin+'/api/partner/requests/mine')).json();
  assert.ok(mine.requests.some(r=>r.id===reference&&r.tenant==='tenant-nord'&&r.status==='pending_review'),'stored row read back via API');
  assert.match(mine.meaning,/not a receipt, delivery or approval/);
 });
 await check('reception inbox is fail-closed without a partner role and tenant',async()=>{
  const res=await page.request.get(origin+'/api/partner/requests');
  assert.equal(res.status(),403);assert.equal((await res.json()).error,'recipient_auth_required');
 });
 await check('a second visitor cannot read the first submitter\u2019s stored request',async()=>{
  const other=await browser.newContext();const op=await other.newPage();
  await op.request.get(origin+'/api/session');
  const mine=await (await op.request.get(origin+'/api/partner/requests/mine')).json();
  assert.equal((mine.requests||[]).some(r=>r.id===reference),false);
  await other.close();
 });
 assert.deepEqual(external,[]);
 const report={scope:'isolated real gateway + chromium over http loopback; non-Secure cookie by existing design (not weakened); throwaway DB; synthetic data',chain:'browser -> /api -> sqlite -> readback',checks,external_requests:external,reception_browser_authorised_read:'blocked: needs partner/staff role+tenant from protected portal auth (Clerk)'};
 await mkdir(join(repo,'.local/partner'),{recursive:true});
 await writeFile(join(repo,'.local/partner/browser-partner-reception.json'),JSON.stringify(report,null,2)+'\n');
 console.log('REPORT .local/partner/browser-partner-reception.json');
}finally{await context.close();await browser.close();await vite.close();backend.kill('SIGTERM');await rm(folder,{recursive:true,force:true});}
