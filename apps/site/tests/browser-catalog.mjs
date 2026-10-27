// Actual browser -> loopback HTTP -> immutable catalog input. No order/model/remote image calls.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const sources=['apps/agent-gateway/catalog.py','apps/agent-gateway/server.py','apps/web/components/OracleCompanion.tsx','apps/web/components/OracleCompanion.css','apps/web/lib/i18n.ts','apps/web/public/media/presenters/ai-fly-oracle-avatar-9f705e5b.png','apps/web/components/PublicExperience.tsx','apps/web/components/ShopPanel.tsx','apps/web/components/ShopPanel.css','apps/site/tests/browser-catalog.mjs','apps/site/tests/fixtures/catalog-server.py'];
async function hashes(){return Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(join(repo,path))).digest('hex')])));}
const before=await hashes(),checks=[],external=[],requests=[];const folder=await mkdtemp(join(tmpdir(),'nexify-readonly-catalog-'));let port,backend;
const vite=await createServer({root,cacheDir:join(folder,'vite-cache'),server:{port:0,hmr:false},plugins:[{name:'isolated-readonly-proxy',configureServer(v){v.middlewares.use((req,res,next)=>{
 if(!(req.url==='/api/session'||req.url.startsWith('/api/shop/')))return next();
 const headers={...req.headers,host:'127.0.0.1:'+port};const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers},reply=>{requests.push({method:req.method,path:req.url.split('?')[0],status:reply.statusCode});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});upstream.on('error',()=>{res.writeHead(503);res.end();});req.pipe(upstream);
 });}}]});
await vite.listen();const origin='http://127.0.0.1:'+vite.httpServer.address().port;
const args=process.env.CATALOG_SNAPSHOT_MANIFEST?[repo+'apps/agent-gateway/server.py','--database',join(folder,'visitor.sqlite'),'--port','0','--web-origin',origin,'--catalog-snapshot',process.env.CATALOG_SNAPSHOT_MANIFEST,'--catalog-tenant','local-public-review','--catalog-project','public-snapshot-review','--catalog-store','readonly-review','--catalog-max-bytes','1048576','--catalog-max-rows','20','--catalog-max-text','1024','--catalog-max-price-minor','100000000']:[repo+'apps/site/tests/fixtures/catalog-server.py','--fixture-test-run','--database',join(folder,'visitor.sqlite'),'--web-origin',origin];
backend=spawn('python3',args,{stdio:['ignore','pipe','pipe']});let stderr='';backend.stderr.on('data',c=>stderr+=c);
port=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(new Error('fixture startup timeout')),10000);backend.stdout.on('data',c=>{output+=c;if(output.includes('\n')){clearTimeout(timer);const line=output.split('\n')[0];resolve(process.env.CATALOG_SNAPSHOT_MANIFEST?Number(line.match(/port ([0-9]+)/)?.[1]):JSON.parse(line).port);}});backend.on('exit',()=>{clearTimeout(timer);reject(new Error('fixture exited'));});});
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:900}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&!u.href.startsWith('data:')){external.push(u.origin);return route.abort();}return route.continue();});
const page=await context.newPage(),panel=page.locator('.shop-panel');
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto(origin+'/teileklar/suche');await panel.locator('[data-catalog-mode="read_only"]').waitFor();
 const response=await page.request.get(origin+'/api/shop/catalog');assert.equal(response.status(),200);const catalog=await response.json();const product=catalog.products[0];
 await check('source-bound partial catalog displayed without commerce or image requests',async()=>{
  assert.equal(catalog.mode,'read_only');assert.equal(catalog.partial,true);assert.equal(catalog.checkout_enabled,false);
  assert.equal(catalog.products.every(p=>p.buyable===false&&p.image.status==='association_not_verified'),true);
  assert.equal(await panel.getByRole('button').count(),0);assert.ok((await panel.innerText()).includes(product.sku));
  assert.ok((await panel.innerText()).includes(product.ean));assert.ok((await panel.innerText()).includes(catalog.observed_at));
  assert.equal(await panel.locator('img').count(),0);assert.ok((await panel.innerText()).includes(String(catalog.pagination.reported_total)));
 });
 await check('DE NL FR labels retain explicit German supplier facts',async()=>{
  for(const [locale,label] of [['nl','Bronteksten: Duits'],['fr','Textes source : allemand'],['de','Quellentexte: Deutsch']]){
   await page.locator('#locale').selectOption(locale);await panel.getByText(label,{exact:true}).waitFor();
   assert.ok((await panel.innerText()).includes(product.name));assert.equal(await panel.getByRole('button').count(),0);
  }
 });
 await check('local filtering and reload remain scoped to partial snapshot',async()=>{
  await panel.getByLabel('Artikel suchen',{exact:true}).fill(product.sku);await page.waitForFunction(sku=>document.querySelectorAll('.shop-products li').length===1&&document.querySelector('.shop-products')?.textContent.includes(sku),product.sku);
  await page.reload();await panel.locator('[data-catalog-mode="read_only"]').waitFor();assert.ok((await panel.innerText()).includes(product.sku));
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 });
 await check('valid visitor and csrf cannot create cart or checkout from read-only source',async()=>{
  const session=await (await page.request.get(origin+'/api/session')).json();
  for(const path of ['/api/shop/cart','/api/shop/cart/checkout-draft']){
   const r=await page.request.post(origin+path,{headers:{Origin:origin,'X-CSRF-Token':session.csrf,'Idempotency-Key':'synthetic-readonly-check'},data:{}});assert.equal(r.status(),403);assert.equal((await r.json()).error,'catalog_read_only');
  }
 });
 assert.deepEqual(external,[]);assert.equal(stderr,'');assert.deepEqual(await hashes(),before);
 const report={scope:process.env.CATALOG_SNAPSHOT_MANIFEST?'actual public source snapshot in local browser, no provider acceptance':'isolated synthetic supplier-shaped snapshot in actual browser/API',checks,requests,external_requests:external,source_sha256:before,mode:'read_only',order_started:false,payment_started:false,image_requests:0,catalog_input_sha256:catalog.source_sha256,observed_at:catalog.observed_at,source_facts:catalog.products.map(p=>({sku:p.sku,ean:p.ean,stock:p.stock,source_price_minor:p.source_price.minor,fact_ids:p.text_facts.fact_ids})),returned_skus:catalog.products.map(p=>p.sku),partial:catalog.partial,reported_total:catalog.pagination.reported_total};
 await writeFile(join(repo,process.env.CATALOG_SNAPSHOT_MANIFEST?'.local/catalog/actual-source-browser.json':'.local/catalog/browser-catalog.json'),JSON.stringify(report,null,2)+'\n');
}finally{await context.close();await browser.close();await vite.close();backend.kill('SIGTERM');await rm(folder,{recursive:true,force:true});}
