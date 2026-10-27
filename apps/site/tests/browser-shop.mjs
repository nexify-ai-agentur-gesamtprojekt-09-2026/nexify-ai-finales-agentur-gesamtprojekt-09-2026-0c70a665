// Real browser -> loopback HTTP -> SQLite. Only the isolated Python test fixture seeds synthetic products.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {request as httpRequest} from 'node:http';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const folder=await mkdtemp(join(tmpdir(),'nexify-browser-shop-')),database=join(folder,'visitor.sqlite');
let backendPort=0,backend;const requests=[],external=[],checks=[];
const server=await createServer({root,server:{port:0,strictPort:false},plugins:[{name:'isolated-shop-proxy',configureServer(vite){vite.middlewares.use((req,res,next)=>{
 if(!(req.url==='/api/session'||req.url.startsWith('/api/shop/')))return next();
 const upstream=httpRequest({host:'127.0.0.1',port:backendPort,path:req.url,method:req.method,headers:{...req.headers,host:`127.0.0.1:${backendPort}`}},reply=>{
  requests.push({path:req.url,method:req.method,status:reply.statusCode});res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
 });upstream.on('error',()=>{res.writeHead(503);res.end();});req.pipe(upstream);
 });}}]});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
let stderr='';
async function startBackend(){
backend=spawn('python3',[repo+'/apps/site/tests/fixtures/shop-server.py','--fixture-test-run','--database',database,'--web-origin',origin],{stdio:['ignore','pipe','pipe']});
backend.stderr.on('data',chunk=>{stderr+=chunk;});
backendPort=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(new Error('fixture startup timed out')),10000);backend.stdout.on('data',chunk=>{text+=chunk;if(text.includes('\n')){clearTimeout(timer);try{resolve(JSON.parse(text.split('\n')[0]).port);}catch(error){reject(error);}}});backend.on('exit',code=>{clearTimeout(timer);reject(new Error('fixture exited '+code));});});
}
await startBackend();
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1000}});
await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&u.protocol!=='data:'){external.push(u.origin);return route.abort();}return route.continue();});
const page=await context.newPage();
const panel=page.locator('.shop-panel');
const start=()=>panel.getByRole('button',{name:'Warenkorb beginnen',exact:true});
const add=()=>panel.getByRole('button',{name:'Hinzufügen · Testfilter',exact:true});
const refresh=()=>panel.getByRole('button',{name:'Gespeicherten Stand prüfen',exact:true});
const quantity=()=>panel.locator('.shop-cart input[name="quantity"]');
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
async function waitEnabled(locator){await locator.waitFor();await page.waitForFunction(()=>{const node=document.querySelector('.shop-panel');return node&&!Array.from(node.querySelectorAll('button')).some(b=>b.textContent==='Gespeicherten Stand prüfen'&&b.disabled);});assert.equal(await locator.isEnabled(),true);}
function dbCounts(){const r=spawnSync('python3',['-c',"import sqlite3,json,sys;d=sqlite3.connect(sys.argv[1]);print(json.dumps({k:d.execute('SELECT count(*) FROM objects WHERE kind=?',(k,)).fetchone()[0] for k in ('cart','checkout_draft')}))",database],{encoding:'utf8'});assert.equal(r.status,0);return JSON.parse(r.stdout);}
try{
 await check('real DE NL FR catalog search and categories using isolated fixtures',async()=>{
  await page.goto(origin+'/teileklar/suche');await panel.getByText('synthetic_test_fixture_only',{exact:false}).waitFor();await waitEnabled(start());
  await panel.getByLabel('Kategorie',{exact:true}).selectOption('lights');await panel.getByRole('button',{name:'Hinzufügen · Testlampe',exact:true}).waitFor();await add().waitFor({state:'detached'});assert.equal(await add().count(),0);
  await page.locator('#locale').selectOption('nl');await panel.getByRole('button',{name:'Toevoegen · Testlamp',exact:true}).waitFor();
  await panel.getByLabel('Categorie',{exact:true}).selectOption('');await panel.getByLabel('Artikelen zoeken',{exact:true}).fill('filter');await panel.getByRole('button',{name:'Toevoegen · Testfilter',exact:true}).waitFor();
  await page.locator('#locale').selectOption('fr');await panel.getByLabel('Rechercher des articles',{exact:true}).fill('filtre');await panel.getByRole('button',{name:'Ajouter · Filtre test',exact:true}).waitFor();
  await page.locator('#locale').selectOption('de');await panel.getByLabel('Artikel suchen',{exact:true}).fill('');await add().waitFor();
 });
 await check('aborted create before commit blocks writes until deliberate successful empty readback',async()=>{
  await page.route('**/api/shop/cart',route=>route.request().method()==='POST'?route.abort():route.continue());
  await start().click();await panel.getByRole('alert').waitFor();assert.equal(await start().isDisabled(),true);assert.equal(dbCounts().cart,0);
  await page.unroute('**/api/shop/cart');await refresh().click();await waitEnabled(start());assert.equal(await panel.getByRole('alert').count(),0);
 });
 await check('browser creates scoped HttpOnly cart and persists server-authoritative amount across reload',async()=>{
  await start().click();await waitEnabled(add());await add().click();await quantity().waitFor();assert.equal(await quantity().inputValue(),'1');
  await page.reload();await quantity().waitFor();assert.equal(await quantity().inputValue(),'1');assert.ok((await panel.innerText()).includes('1,23'));
  const cookies=await context.cookies();for(const name of ['nx_visit','nx_cart'])assert.equal(cookies.find(c=>c.name===name)?.httpOnly,true);
  assert.equal(await page.evaluate(()=>document.cookie.includes('nx_cart')||document.cookie.includes('nx_visit')),false);assert.equal(dbCounts().cart,1);
 });
 await check('committed change with lost response requires readback and does not blindly repeat effect',async()=>{
  await page.route('**/api/shop/cart/items',async route=>{const response=await route.fetch();assert.equal(response.status(),200);await route.abort();});
  await waitEnabled(add());await add().click();await panel.getByRole('alert').waitFor();assert.equal(await add().isDisabled(),true);
  await page.unroute('**/api/shop/cart/items');await refresh().click();await page.waitForFunction(()=>document.querySelector('.shop-cart input')?.value==='2');await waitEnabled(add());
  assert.equal(await panel.getByRole('alert').count(),0);assert.ok((await panel.innerText()).includes('2,46'));
 });
 await check('quantity submit remove and repeated blocked checkout survive direct cart link and reload',async()=>{
  await quantity().fill('3');await panel.getByRole('button',{name:'Ändern',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.shop-cart input')?.value==='3'&&!document.querySelector('.shop-cart input')?.disabled);
  await panel.getByRole('link',{name:'Zum Warenkorb',exact:true}).click();await page.waitForURL('**/teileklar/warenkorb');await quantity().waitFor();
  await panel.getByRole('button',{name:'Checkout vorbereiten',exact:true}).click();await panel.locator('[data-checkout-state="blocked_provider_acceptance"]').waitFor();
  await page.reload();await panel.locator('[data-checkout-state="blocked_provider_acceptance"]').waitFor();
  await panel.getByRole('button',{name:'Checkout vorbereiten',exact:true}).click();await waitEnabled(refresh());assert.equal(dbCounts().checkout_draft,1);
  assert.ok((await panel.innerText()).includes('Keine Bestellung abgegeben und keine Zahlung gestartet'));
  await panel.getByRole('button',{name:'Entfernen',exact:true}).click();await quantity().waitFor({state:'detached'});assert.equal(await panel.getByRole('button',{name:'Checkout vorbereiten',exact:true}).isDisabled(),true);
  await waitEnabled(add());await add().click();await quantity().waitFor();assert.equal(await quantity().inputValue(),'1');
 });
 await check('HTTP backend process restart keeps browser session cart and persisted source binding',async()=>{
  const old=backend;await new Promise(resolve=>{old.once('exit',resolve);old.kill('SIGTERM');});
  await startBackend();await page.reload();await quantity().waitFor();assert.equal(await quantity().inputValue(),'1');assert.equal(dbCounts().cart,1);
 });
 await check('foreign visitor cart cookie and client role/tenant claims grant no cart access',async()=>{
  const other=await browser.newContext();await other.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin&&u.protocol!=='data:'){external.push(u.origin);return route.abort();}return route.continue();});await other.addCookies((await context.cookies()).filter(c=>c.name==='nx_cart'));
  const outsider=await other.newPage();await outsider.goto(origin+'/teileklar/warenkorb');await outsider.locator('.shop-panel').waitFor();
  await outsider.evaluate(()=>{localStorage.setItem('role','admin');localStorage.setItem('tenant','synthetic-tenant');});
  await outsider.waitForFunction(()=>document.querySelector('.shop-panel')?.textContent.includes('Warenkorb beginnen'));
  assert.equal(await outsider.locator('.shop-cart').count(),0);await other.close();
 });
 await check('unconfigured catalog and failed catalog connection remain distinct with no sample products',async()=>{
  await page.route('**/api/shop/catalog?**',route=>route.fulfill({status:503,json:{error:'catalog_not_configured',available:false}}));
  await page.reload();await panel.getByText('Für diesen Shop ist noch kein freigegebener Katalog verbunden.',{exact:false}).waitFor();assert.equal(await panel.locator('.shop-products').count(),0);
  await page.unroute('**/api/shop/catalog?**');await page.route('**/api/shop/catalog?**',route=>route.fulfill({status:503,json:{error:'storage_unavailable'}}));
  await page.reload();await panel.getByText('Verbindung zum Warenkorb noch nicht verfügbar.',{exact:true}).waitFor();assert.equal(await panel.locator('.shop-products').count(),0);
  await page.unroute('**/api/shop/catalog?**');
 });
 await check('mobile keyboard layout retains shared tokens and no horizontal overflow',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(origin+'/teileklar/warenkorb');await quantity().waitFor();
  const close=page.locator('#aifly-panel button.icon-button');if(await close.isVisible())await close.click();
  await waitEnabled(refresh());await quantity().focus();assert.equal(await quantity().evaluate(n=>n===document.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Ändern');
  await page.keyboard.press('Shift+Tab');assert.equal(await quantity().evaluate(n=>n===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.ok(await panel.evaluate(n=>getComputedStyle(n).getPropertyValue('--color-marke-lime').trim()));
  await panel.screenshot({path:join(repo,'.local/shop-http/mobile-panel.png')});
 });
 assert.deepEqual(external,[]);assert.equal(stderr,'');
 const sources=['apps/agent-gateway/cart.py','apps/agent-gateway/server.py','apps/web/components/ShopPanel.tsx','apps/web/components/ShopPanel.css','apps/web/components/Workspace.tsx','apps/site/src/main.tsx','apps/site/tests/browser-shop.mjs','apps/site/tests/fixtures/shop-server.py'];
 const source_sha256=Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(join(repo,path))).digest('hex')])));
 const report={scope:'actual local browser/API/SQLite with isolated synthetic catalog fixture; no provider or production acceptance',checks,requests,external_requests:external,source_sha256,persistent_objects:dbCounts(),payment_started:false,order_submitted:false};
 await writeFile(join(repo,'.local/shop-http/browser-shop.json'),JSON.stringify(report,null,2)+'\n');
}finally{await context.close();await browser.close();await server.close();backend.kill('SIGTERM');await rm(folder,{recursive:true,force:true});}
