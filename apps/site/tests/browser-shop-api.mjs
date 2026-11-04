// Real browser evidence for the mounted TEILEKLAR shop (shop/PublicShopContent) against
// the real apps/shop-api production adapter (vercel_app.create_app + shop routers).
// Database: in-memory mongomock-motor with SYNTHETIC products. No order, payment, mail
// or supplier image leaves the machine: /api/shop/orders and every non-local origin are
// blocked in the browser, and the fixture refuses provider/mail calls server-side.
// Run under Node22 with PLAYWRIGHT_MODULE and SHOP_FIXTURE_PYTHON (python with
// apps/shop-api/requirements.txt + mongomock-motor + uvicorn).
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {createServer as netServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const repo=new URL('../../../',import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const fixture=fileURLToPath(new URL('./fixtures/shop_api_fixture.py',import.meta.url));
const CATALOG_SOURCES=['apps/shop-api/vercel_app.py','apps/shop-api/shop/catalog_api.py','apps/shop-api/shop/pricing.py',
 'apps/web/components/shop/PublicShopContent.tsx','apps/web/components/shop/CatalogView.tsx','apps/web/components/shop/CategoryList.tsx',
 'apps/web/components/shop/ProductCard.tsx','apps/web/components/shop/ProductDetail.tsx','apps/web/components/shop/api.ts',
 'apps/web/components/shop/shop.css','config/shop-interface-copy.json','apps/site/src/main.tsx',
 'apps/site/tests/browser-shop-api.mjs','apps/site/tests/fixtures/shop_api_fixture.py'];
const SHOP_SOURCES=['apps/shop-api/vercel_app.py','apps/shop-api/shop/cart_api.py','apps/shop-api/shop/checkout_api.py',
 'apps/shop-api/shop/auth.py','apps/shop-api/shop/pricing.py','apps/shop-api/shop/catalog_api.py',
 'apps/web/components/shop/PublicShopContent.tsx','apps/web/components/shop/ProductDetail.tsx','apps/web/components/shop/CartView.tsx',
 'apps/web/components/shop/Checkout.tsx','apps/web/components/shop/AddressStep.tsx','apps/web/components/shop/api.ts',
 'apps/web/components/shop/shop.css','config/shop-interface-copy.json','apps/site/src/main.tsx',
 'apps/site/tests/browser-shop-api.mjs','apps/site/tests/fixtures/shop_api_fixture.py'];
const ALL=[...new Set([...CATALOG_SOURCES,...SHOP_SOURCES])];
async function hashes(paths){return Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(new URL(p,repo))).digest('hex')])));}
const before=await hashes(ALL);
const copy=JSON.parse(await readFile(new URL('config/shop-interface-copy.json',repo),'utf8'));
const PUBLIC_ORIGIN='https://teileklar.example.invalid',LOCALES=['de','nl','fr'];
// Independent expectation for the synthetic fixture: purchase × 1.30 markup × 1.19 VAT, half-up.
const gross=purchase=>Math.round(purchase*1.3*1.19);
const BRAKE='synthetic-brake-set',CLEANER='synthetic-rim-cleaner',WIPER='synthetic-wiper-blade';
const UNIT={[BRAKE]:gross(2000),[CLEANER]:gross(500)},SHIPPING=490;
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const t=(locale,key,values={})=>copy[locale][key].replace(/\{(\w+)\}/g,(_,n)=>String(values[n]??''));
const euro=(locale,cents)=>new Intl.NumberFormat(locale,{style:'currency',currency:'EUR'}).format(cents/100);
const sha=v=>createHash('sha256').update(v).digest('hex');

const port=await new Promise(resolve=>{const s=netServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
const backend=`http://127.0.0.1:${port}`;let child=null;
async function startBackend(mode){
 child=spawn(process.env.SHOP_FIXTURE_PYTHON||'python3',['-I',fixture,'--port',String(port),'--mode',mode],{stdio:['ignore','ignore','inherit']});
 for(let i=0;i<200;i++){try{const s=await (await fetch(backend+'/__fixture/state')).json();assert.equal(s.mode,mode);return;}catch{await new Promise(r=>setTimeout(r,100));}}
 throw new Error('fixture_not_ready');
}
async function stopBackend(){if(!child)return;const exited=once(child,'exit');child.kill('SIGTERM');await exited;child=null;}
const state=async()=>(await fetch(backend+'/__fixture/state')).json();
const control=async(path,body)=>assert.equal((await fetch(backend+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})).status,200);

const cache=await mkdtemp(join(tmpdir(),'nexify-shop-api-cache-'));let origin;
// Same-origin deployment: the site and /api/shop share one public origin. The proxy maps
// only this site's own Origin to it; any other Origin reaches the server unchanged.
const server=await createServer({root,cacheDir:cache,logLevel:'error',server:{port:0,strictPort:false,hmr:false,proxy:{'/api':{target:backend,changeOrigin:false,
 configure(proxy){proxy.on('proxyReq',(request,incoming)=>{if(incoming.headers.origin===origin)request.setHeader('origin',PUBLIC_ORIGIN);});}}}},
 define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"','__NEXIFY_STATIC_ORIENTATION__':false}});
await server.listen();origin=`http://127.0.0.1:${server.httpServer.address().port}`;

const external=[],blockedImages=[],blockedEffects=[],uncaught=[];let phase='catalog';const requests={catalog:[],shop:[]};
const record=(method,url,status)=>{const u=new URL(url);if(!u.pathname.startsWith('/api/shop/'))return;
 const path=u.pathname.replace(/^\/api\/shop\/products\/[^/]+$/,'/api/shop/products/{id}');requests[phase].push({method,path,status});};
const browser=await chromium.launch({headless:true});
async function context(viewport={width:1280,height:900}){
 const c=await browser.newContext({viewport,reducedMotion:'reduce'});
 await c.route('**/*',route=>{const request=route.request(),u=new URL(request.url());
  if(u.origin!==origin){if(u.hostname==='cdnbigbuy.com')blockedImages.push(u.pathname);else if(u.protocol!=='data:')external.push(u.origin);return route.abort();}
  if(u.pathname==='/api/shop/orders'||u.pathname.startsWith('/api/shop/orders/')||u.pathname.startsWith('/api/shop/webhooks/')){blockedEffects.push({method:request.method(),path:u.pathname});return route.abort();}
  if(u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/api/shop/'))return route.fulfill({status:404,json:{error:'outside_shop_run'}});
  return route.continue();});
 c.on('response',r=>record(r.request().method(),r.url(),r.status()));
 c.on('requestfailed',r=>record(r.method(),r.url(),'failed'));
 c.on('page',p=>p.on('pageerror',e=>uncaught.push(String(e.message).slice(0,200))));
 return c;
}
// In-page fetch: the real browser cookie jar and same-origin rules apply (recorded via the
// context response listener). Only a deliberately foreign Origin uses the API client,
// because a page cannot forge its own Origin header.
async function apiCall(page,method,path,data){
 return page.evaluate(async([method,path,data])=>{const response=await fetch(path,{method,cache:'no-store',credentials:'same-origin',
  headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});return {status:response.status,json:await response.json()};},[method,path,data??null]);
}
async function foreignOriginCall(page,path,data,cookieValue){
 const response=await page.request.fetch(origin+path,{method:'POST',data,failOnStatusCode:false,
  headers:{Origin:'https://foreign.example.invalid',Cookie:'tk_guest='+cookieValue}});
 record('POST',origin+path,response.status());return {status:response.status(),json:await response.json()};
}
async function open(page,path){await page.goto(origin+path);await page.locator('#locale').waitFor();}
async function locale(page,l){await page.locator('#locale').selectOption(l);await page.waitForFunction(x=>document.documentElement.lang===x,l);}
const text=async locator=>norm(await locator.innerText());
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
const catalogChecks=[],shopChecks=[];
async function check(list,name,fn){await fn();list.push(name);console.log('PASS '+name);}
async function serverCart(cookieValue){const s=await state();return s.carts.find(c=>c.owner_sha256===sha('guest:'+cookieValue));}
const lines=cart=>Object.fromEntries((cart?.items||[]).map(i=>[i.product_id,i.quantity]));
let passed=false,finalState=null;
try{
 // ---------------- Catalogue ----------------
 await startBackend('configured');
 const desk=await context(),page=await desk.newPage();
 await check(catalogChecks,'catalog_search_and_category_browse_de_nl_fr_from_live_shop_api',async()=>{
  for(const l of LOCALES){
   await open(page,'/teileklar/suche?q=Felgenreiniger');await locale(page,l);
   const count=page.locator('[data-testid="catalog-count"]');await count.waitFor();
   assert.ok((await text(count)).startsWith(norm(t(l,'resultCount',{count:new Intl.NumberFormat(l).format(1)}))),l);
   assert.deepEqual(await page.locator('.tk-grid > li').evaluateAll(n=>n.map(x=>x.dataset.testid)),['product-card-'+CLEANER]);
  }
  await open(page,'/teileklar/suche');await locale(page,'de');
  await page.locator('[data-testid="shop-search-input"]').fill('TEST-BRK');await page.locator('[data-testid="shop-search-submit"]').click();
  await page.waitForURL(u=>new URL(u).searchParams.get('q')==='TEST-BRK');
  await page.locator('[data-testid="product-card-'+BRAKE+'"]').waitFor();assert.equal(await page.locator('.tk-grid > li').count(),1);
  await open(page,'/teileklar/suche?q=nicht-vorhanden-synthetic');await page.locator('[data-testid="catalog-empty"]').waitFor();
  await open(page,'/teileklar/shop');await page.locator('[data-testid="category-link-990002"]').click();
  await page.waitForURL('**/teileklar/kategorie/990002');await page.locator('[data-testid="product-card-'+CLEANER+'"]').waitFor();
  assert.equal(await page.locator('.tk-grid > li').count(),1);
  await open(page,'/teileklar/kategorie/990001');await page.locator('[data-testid="catalog-results"]').waitFor();
  assert.deepEqual((await page.locator('.tk-grid > li').evaluateAll(n=>n.map(x=>x.dataset.testid))).sort(),['product-card-'+BRAKE,'product-card-'+WIPER]);
 });
 await check(catalogChecks,'product_detail_shows_server_price_stock_and_blocks_out_of_stock',async()=>{
  const api=await apiCall(page,'GET','/api/shop/products/'+BRAKE);assert.equal(api.status,200);
  assert.equal(api.json.price_cents,UNIT[BRAKE]);assert.equal(api.json.price_status,'released');
  for(const l of LOCALES){
   await open(page,'/teileklar/produkt/'+BRAKE);await locale(page,l);await page.locator('[data-testid="product-detail"]').waitFor();
   assert.ok((await text(page.locator('[data-testid="product-price"]'))).startsWith(norm(euro(l,api.json.price_cents))),l);
   assert.equal(await text(page.locator('[data-testid="stock-label"]')),norm(t(l,'stockCount',{count:new Intl.NumberFormat(l).format(8)})));
   assert.match(await text(page.locator('[data-testid="product-name"]')),/SYNTHETISCHER TESTARTIKEL/);
   assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isEnabled(),true);
  }
  await open(page,'/teileklar/produkt/'+WIPER);await locale(page,'de');
  assert.equal(await text(page.locator('[data-testid="out-of-stock-note"]')),norm(t('de','outNoOrder')));
  assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isDisabled(),true);
 });
 await check(catalogChecks,'trust_bar_and_card_facts_rendered_only_from_data_de_nl_fr',async()=>{
  const TRUST=['trustPrices','trustWithdrawal','trustPayment','trustContact','trustWorkshop'];
  for(const l of LOCALES){
   await open(page,'/teileklar/shop');await locale(page,l);await page.locator('[data-testid="catalog-results"]').waitFor();
   assert.deepEqual((await page.locator('[data-testid="shop-trust"] li').allInnerTexts()).map(norm),TRUST.map(k=>norm(t(l,k))),l);
   assert.doesNotMatch(await text(page.locator('[data-testid="shop-trust"]')),/kostenlos|versandkostenfrei|gratis|gratuit/i);
   const cleaner=page.locator('[data-testid="product-card-'+CLEANER+'"]');
   // 500 ml synthetic net content -> Grundpreis per 1 l = gross price × 2.
   assert.equal(await text(cleaner.locator('[data-testid="product-base-price-'+CLEANER+'"]')),norm(t(l,'basePrice',{price:euro(l,UNIT[CLEANER]*2),unit:'l'})));
   assert.equal(await text(cleaner.locator('[data-testid="product-delivery-'+CLEANER+'"]')),norm(t(l,'deliveryRange',{min:new Intl.NumberFormat(l).format(3),max:new Intl.NumberFormat(l).format(6)})));
   assert.equal(await text(cleaner.locator('[data-testid="product-eligibility-'+CLEANER+'"]')),norm(t(l,'eligibilityUniversal')));
   assert.match(await text(cleaner.locator('[data-testid="product-manufacturer-'+CLEANER+'"]')),/SYNTHETISCHER TESTHERSTELLER/);
   const brake=page.locator('[data-testid="product-card-'+BRAKE+'"]');
   assert.equal(await text(brake.locator('[data-testid="product-delivery-'+BRAKE+'"]')),norm(t(l,'deliveryRange',{min:new Intl.NumberFormat(l).format(2),max:new Intl.NumberFormat(l).format(4)})));
   assert.equal(await brake.locator('[data-testid^="product-base-price-"], [data-testid^="product-manufacturer-"]').count(),0,'no base price or manufacturer without data');
   assert.doesNotMatch(await text(brake),new RegExp(t(l,'eligibilityUniversal')));
  }
  await open(page,'/teileklar/kategorie/990001');await locale(page,'de');await page.locator('[data-testid="product-card-'+WIPER+'"]').waitFor();
  assert.equal(await page.locator('[data-testid="product-card-'+WIPER+'"] [data-testid^="product-delivery-"], [data-testid="product-card-'+WIPER+'"] [data-testid^="product-eligibility-"]').count(),0,'out of stock and no data: no delivery or eligibility claim');
  await open(page,'/teileklar');await locale(page,'de');
  const entryTrust=page.locator('[data-testid="entry-trust"]');await entryTrust.waitFor();
  assert.deepEqual((await entryTrust.locator('li').allInnerTexts()).map(norm),TRUST.map(k=>norm(t('de',k))));
 });
 await check(catalogChecks,'product_detail_mandatory_information_gpsr_disposal_and_fallbacks',async()=>{
  for(const l of LOCALES){
   await open(page,'/teileklar/produkt/'+CLEANER);await locale(page,l);await page.locator('[data-testid="product-detail"]').waitFor();
   assert.match(await text(page.locator('[data-testid="product-identifiers"]')),/SYNTHETISCHER TESTHERSTELLER.*TEST-CLN-002.*0000000990102/);
   assert.equal(await page.locator('[data-testid="product-shipping-info-link"]').getAttribute('href'),'/teileklar/versand-und-zahlung');
   assert.equal(await text(page.locator('[data-testid="product-base-price"]')),norm(t(l,'basePrice',{price:euro(l,UNIT[CLEANER]*2),unit:'l'})));
   assert.equal(await text(page.locator('[data-testid="product-delivery"]')),norm(t(l,'deliveryRange',{min:new Intl.NumberFormat(l).format(3),max:new Intl.NumberFormat(l).format(6)})));
   assert.deepEqual((await page.locator('[data-testid="product-trust"] li').allInnerTexts()).map(norm),['trustWithdrawal','trustPayment','trustContact'].map(k=>norm(t(l,k))));
   assert.equal(await page.locator('[data-testid="fitment-status"]').getAttribute('data-fitment'),'universal');
   assert.match(await text(page.locator('[data-testid="fitment-status"]')),new RegExp(norm(t(l,'fitmentUniversal')).slice(0,20)));
   assert.equal(await page.locator('[data-testid="fitment-workshop-link"]').getAttribute('href'),'/teileklar/werkstatt');
   assert.match(await text(page.locator('[data-testid="product-safety-manufacturer"]')),/SYNTHETISCHER TESTHERSTELLER/);
   assert.match(await text(page.locator('[data-testid="product-safety-notes"]')),/Synthetischer Testhinweis/);
   assert.match(await text(page.locator('[data-testid="product-scope-of-delivery"]')),/synthetische Testflasche/);
   assert.equal(await page.locator('[data-testid="product-disposal"]').getAttribute('data-disposal'),'battery');
   assert.equal(await page.locator('[data-testid="product-withdrawal-link"]').getAttribute('href'),'/teileklar/rechtliches#widerruf');
   // Concept 3.4 order: price block before availability, CTA, trust line and eligibility box.
   const order=await page.evaluate(ids=>ids.map(id=>document.querySelector('[data-testid="'+id+'"]')).map((n,i,a)=>i===0||Boolean(a[i-1].compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)),
    ['product-name','product-identifiers','product-price','product-base-price','stock-label','product-delivery','add-to-cart-button','product-trust','fitment-status','product-facts','product-safety','product-disposal','product-shipping-returns']);
   assert.ok(order.every(Boolean),JSON.stringify(order));
  }
  await open(page,'/teileklar/produkt/'+BRAKE);await locale(page,'de');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.equal(await text(page.locator('[data-testid="product-safety-manufacturer-missing"]')),norm(t('de','pdpManufacturerMissing')));
  assert.equal(await text(page.locator('[data-testid="product-safety-notes-missing"]')),norm(t('de','pdpSafetyMissing')));
  assert.equal(await page.locator('[data-testid="product-disposal"], [data-testid="product-base-price"], [data-testid="product-manufacturer"]').count(),0);
  assert.equal(await page.locator('[data-testid="fitment-status"]').getAttribute('data-fitment'),'data');
  await open(page,'/teileklar/produkt/'+WIPER);await page.locator('[data-testid="product-detail"]').waitFor();
  assert.equal(await page.locator('[data-testid="fitment-status"]').getAttribute('data-fitment'),'none');
  assert.equal(await text(page.locator('[data-testid="fitment-status"] p')),norm(t('de','fitmentBody')));
  assert.equal(await page.locator('[data-testid="product-delivery"], [data-testid="product-eligibility"]').count(),0);
 });
 await check(catalogChecks,'supplier_images_blocked_before_network_with_local_placeholder',async()=>{
  await open(page,'/teileklar/produkt/'+BRAKE);await locale(page,'de');
  await page.locator('.tk-image-missing',{hasText:t('de','imageError')}).first().waitFor();
  assert.ok(blockedImages.length>0&&blockedImages.every(p=>p.startsWith('/images/synthetic-test-only')));
  assert.deepEqual(external,[]);
 });
 await check(catalogChecks,'price_not_released_hides_price_and_server_refuses_add',async()=>{
  await control('/__fixture/price-release',{released:false});
  await open(page,'/teileklar/shop');await locale(page,'de');
  assert.equal(await text(page.locator('[data-testid="product-price-'+BRAKE+'"]')),norm(t('de','priceUnavailable')));
  await open(page,'/teileklar/produkt/'+BRAKE);
  assert.equal(await text(page.locator('[data-testid="price-not-released-note"]')),norm(t('de','priceNote')));
  assert.equal(await text(page.locator('[data-testid="out-of-stock-note"]')),norm(t('de','priceNoOrder')));
  assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isDisabled(),true);
  const refused=await apiCall(page,'POST','/api/shop/cart/items',{product_id:BRAKE,quantity:1});
  assert.equal(refused.status,409);assert.equal(refused.json.detail.error,'price_not_released');
  assert.deepEqual((await state()).carts,[]);
  await control('/__fixture/price-release',{released:true});
 });
 await check(catalogChecks,'mobile_390_catalog_and_detail_without_horizontal_overflow',async()=>{
  const mobile=await context({width:390,height:844}),m=await mobile.newPage();
  for(const path of ['/teileklar/shop','/teileklar/suche?q=SYNTHETISCHER','/teileklar/produkt/'+BRAKE]){
   await open(m,path);await m.locator('[data-testid="catalog-results"], [data-testid="product-detail"]').first().waitFor();
   assert.equal(await noOverflow(m),true,path);
  }
  await mobile.close();
 });
 await stopBackend();
 await check(catalogChecks,'catalog_not_configured_503_and_connection_failure_distinct_de_nl_fr',async()=>{
  await startBackend('unconfigured');
  for(const l of LOCALES){
   await open(page,'/teileklar/suche');await locale(page,l);
   const notice=page.locator('[data-testid="catalog-unconfigured"]');await notice.waitFor();
   assert.equal(await text(notice),norm(t(l,'catalogUnconfigured')));
   assert.equal(await page.locator('[data-testid="catalog-error"], .tk-grid, [data-testid="catalog-empty"]').count(),0);
  }
  await stopBackend();
  for(const l of LOCALES){
   await open(page,'/teileklar/suche');await locale(page,l);
   const alert=page.locator('[data-testid="catalog-error"]');await alert.waitFor();
   assert.equal(await text(alert),norm(t(l,'catalogError')));assert.equal(await alert.getAttribute('role'),'alert');
   assert.equal(await page.locator('[data-testid="catalog-unconfigured"], .tk-grid').count(),0);
  }
 });
 await desk.close();

 // ---------------- Cart and checkout ----------------
 phase='shop';await startBackend('configured');
 const a=await context(),pa=await a.newPage();let guest;
 const cookie=async c=>(await c.cookies()).filter(x=>x.name==='tk_guest');
 await check(shopChecks,'cart_add_update_remove_with_server_amounts_surviving_reload',async()=>{
  await open(pa,'/teileklar/produkt/'+BRAKE);await pa.locator('[data-testid="product-quantity"]').fill('2');
  await pa.locator('[data-testid="add-to-cart-button"]').click();await pa.locator('[data-testid="add-to-cart-success"]').waitFor();
  guest=(await cookie(a))[0].value;assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:2});
  await open(pa,'/teileklar/produkt/'+CLEANER);await pa.locator('[data-testid="add-to-cart-button"]').click();await pa.locator('[data-testid="add-to-cart-success"]').waitFor();
  const verify=async expected=>{
   const cart=await apiCall(pa,'GET','/api/shop/cart');assert.equal(cart.status,200);
   const subtotal=Object.entries(expected).reduce((sum,[id,q])=>sum+UNIT[id]*q,0);
   assert.equal(cart.json.subtotal_cents,subtotal);assert.equal(cart.json.total_cents,subtotal+SHIPPING);
   for(const reload of [false,true]){
    if(reload)await pa.reload();await pa.locator('[data-testid="cart-view"]').waitFor();
    assert.deepEqual((await pa.locator('[data-testid^="cart-line-"]:not([data-testid*="total"])').evaluateAll(n=>n.map(x=>x.dataset.testid))).sort(),Object.keys(expected).map(id=>'cart-line-'+id).sort());
    for(const [id,q] of Object.entries(expected))assert.equal(await text(pa.locator('[data-testid="cart-line-total-'+id+'"]')),norm(euro('de',UNIT[id]*q)));
    assert.equal(await text(pa.locator('[data-testid="cart-subtotal"]')),norm(euro('de',subtotal)));
    assert.equal(await text(pa.locator('[data-testid="cart-total"]')),norm(euro('de',subtotal+SHIPPING)));
   }
   assert.deepEqual(lines(await serverCart(guest)),expected);
  };
  await open(pa,'/teileklar/warenkorb');await verify({[BRAKE]:2,[CLEANER]:1});
  const changed=pa.waitForResponse(r=>r.url().endsWith('/api/shop/cart/items')&&r.request().method()==='POST');
  await pa.locator('[data-testid="cart-qty-'+BRAKE+'"]').fill('3');await pa.locator('[data-testid="cart-qty-'+BRAKE+'"]').blur();
  assert.equal((await changed).status(),200);await verify({[BRAKE]:3,[CLEANER]:1});
  await pa.locator('[data-testid="cart-remove-'+CLEANER+'"]').click();await pa.locator('[data-testid="cart-line-'+CLEANER+'"]').waitFor({state:'detached'});
  await verify({[BRAKE]:3});
 });
 await check(shopChecks,'cart_summary_vat_trust_box_and_localized_chrome_de_nl_fr',async()=>{
  for(const l of LOCALES){
   await open(pa,'/teileklar/warenkorb');await locale(pa,l);await pa.locator('[data-testid="cart-view"]').waitFor();
   const cart=await apiCall(pa,'GET','/api/shop/cart');
   assert.equal(await text(pa.locator('[data-testid="cart-vat"]')),norm(euro(l,cart.json.vat_included_cents)));
   assert.match(await text(pa.locator('[data-testid="cart-totals"]')),new RegExp(t(l,'totalInclVat').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   assert.equal(await text(pa.locator('[data-testid="cart-checkout-link"]')),norm(t(l,'goCheckout')));
   assert.equal(await pa.locator('[data-testid="cart-continue-shopping"]').getAttribute('href'),'/teileklar/shop');
   assert.equal(await pa.locator('[data-testid="cart-trust-items"] li').count(),5);
   assert.equal(await pa.locator('[data-testid="cart-trust-contact"]').getAttribute('href'),'/kontakt');
  }
  await locale(pa,'de');
 });
 await check(shopChecks,'lost_add_response_retry_replays_same_key_without_double_add',async()=>{
  await open(pa,'/teileklar/produkt/'+BRAKE);const keys=[];
  await pa.route('**/api/shop/cart/items',async route=>{keys.push(route.request().headers()['idempotency-key']);
   const committed=await route.fetch();assert.equal(committed.status(),200);return route.abort('failed');},{times:1});
  await pa.locator('[data-testid="add-to-cart-button"]').click();
  const unknown=pa.locator('[data-testid="add-to-cart-error"]');await unknown.waitFor();
  assert.ok((await text(unknown)).startsWith(norm(t('de','cartUnknown'))));
  assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:4},'committed exactly once');
  const retry=pa.waitForRequest(r=>r.url().endsWith('/api/shop/cart/items')&&r.method()==='POST');
  await pa.locator('[data-testid="add-to-cart-button"]').click();keys.push((await retry).headers()['idempotency-key']);
  await pa.locator('[data-testid="add-to-cart-success"]').waitFor();
  assert.equal(keys.length,2);assert.match(keys[0],/^add:[0-9a-f-]{36}$/);assert.equal(keys[1],keys[0]);
  assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:4},'replay added nothing');
  const fresh=pa.waitForRequest(r=>r.url().endsWith('/api/shop/cart/items')&&r.method()==='POST');
  await pa.locator('[data-testid="add-to-cart-button"]').click();assert.notEqual((await fresh).headers()['idempotency-key'],keys[0]);
  await pa.locator('[data-testid="add-to-cart-success"]').waitFor();assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:5},'new intent adds once');
 });
 await check(shopChecks,'insufficient_stock_refused_with_localized_message_de_nl_fr',async()=>{
  for(const l of LOCALES){
   await open(pa,'/teileklar/produkt/'+CLEANER);await locale(pa,l);await pa.locator('[data-testid="product-quantity"]').fill('3');
   const response=pa.waitForResponse(r=>r.url().endsWith('/api/shop/cart/items'));await pa.locator('[data-testid="add-to-cart-button"]').click();
   assert.equal((await response).status(),409);
   assert.equal(await text(pa.locator('[data-testid="add-to-cart-error"]')),norm(t(l,'quantityAvailable',{count:new Intl.NumberFormat(l).format(2)})));
  }
  assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:5});await locale(pa,'de');
 });
 await check(shopChecks,'guest_cart_cookie_httponly_secure_lax_host_only_not_script_readable',async()=>{
  const jar=await cookie(a);assert.equal(jar.length,1);
  assert.deepEqual({httpOnly:jar[0].httpOnly,secure:jar[0].secure,sameSite:jar[0].sameSite,domain:jar[0].domain,path:jar[0].path},{httpOnly:true,secure:true,sameSite:'Lax',domain:'127.0.0.1',path:'/'});
  assert.match(jar[0].value,/^[A-Za-z0-9_-]{43}$/);assert.doesNotMatch(await pa.evaluate(()=>document.cookie),/tk_guest/);
 });
 await check(shopChecks,'forged_malformed_and_foreign_cart_cookies_grant_no_cart_access',async()=>{
  const victim=lines(await serverCart(guest));
  for(const value of ['F'.repeat(43),'not valid!']){
   const b=await context(),pb=await b.newPage();
   await b.addCookies([{name:'tk_guest',value,domain:'127.0.0.1',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
   await open(pb,'/teileklar/warenkorb');await pb.locator('[data-testid="cart-empty"]').waitFor();
   const hostile=await apiCall(pb,'POST','/api/shop/cart/items',{product_id:CLEANER,quantity:1,price_cents:1,unit_cents:1,line_cents:1,owner:'guest:'+guest,role:'admin',tenant:'foreign'});
   assert.equal(hostile.status,200);assert.equal(hostile.json.lines[0].unit_cents,UNIT[CLEANER]);assert.equal(hostile.json.count,1);
   const rotated=(await cookie(b))[0].value;assert.notEqual(rotated,value);assert.notEqual(rotated,guest);
   const s=await state();assert.equal(s.carts.some(c=>c.owner_sha256===sha('guest:'+value)),false,'forged id never becomes an owner');
   await b.close();
  }
  const c=await context(),pc=await c.newPage();await open(pc,'/teileklar/warenkorb');await pc.locator('[data-testid="cart-empty"]').waitFor();await c.close();
  assert.deepEqual(lines(await serverCart(guest)),victim,'other visitors never changed this cart');
 });
 await check(shopChecks,'cross_origin_cart_write_rejected_by_server',async()=>{
  const denied=await foreignOriginCall(pa,'/api/shop/cart/items',{product_id:BRAKE,quantity:1},guest);
  assert.equal(denied.status,403);assert.equal(denied.json.detail.error,'origin_rejected');assert.deepEqual(lines(await serverCart(guest)),{[BRAKE]:5});
 });
 await check(shopChecks,'checkout_review_shows_delivery_legal_links_withdrawal_and_trust_before_payment',async()=>{
  await open(pa,'/teileklar/kasse');await locale(pa,'de');await pa.locator('[data-testid="checkout-address-form"]').waitFor();
  assert.equal(await text(pa.locator('[data-testid="checkout-heading"]')),norm(t('de','checkoutHeadAddress')));
  for(const [field,value] of Object.entries({first_name:'Synthetisch',last_name:'Testlauf',street:'Teststraße 1',zip:'10115',city:'Berlin',email:'synthetic@example.invalid'}))
   await pa.locator('[data-testid="checkout-address-'+field+'"]').fill(value);
  await pa.locator('[data-testid="checkout-address-continue"]').click();await pa.locator('[data-testid="shipping-option-standard"]').waitFor();
  assert.equal(await text(pa.locator('[data-testid="checkout-heading"]')),norm(t('de','checkoutHeadShipping')));
  const window=norm(t('de','deliveryRange',{min:'2',max:'4'}));
  assert.equal(await text(pa.locator('[data-testid="shipping-option-delivery-standard"]')),window);
  await pa.locator('[data-testid="checkout-shipping-continue"]').click();await pa.locator('[data-testid="checkout-review"]').waitFor();
  assert.equal(await text(pa.locator('[data-testid="checkout-heading"]')),norm(t('de','checkoutHeadReview')));
  assert.equal(await text(pa.locator('[data-testid="review-delivery-value"]')),window);
  const hrefs={'checkout-withdrawal-link':'/teileklar/rechtliches#widerruf','checkout-withdrawal-form-link':'/teileklar/rechtliches#widerrufsformular',
   'checkout-terms-agb-link':'/teileklar/rechtliches#agb','checkout-terms-withdrawal-link':'/teileklar/rechtliches#widerruf'};
  for(const [id,href] of Object.entries(hrefs)){const link=pa.locator('[data-testid="'+id+'"]');assert.equal(await link.getAttribute('href'),href,id);assert.equal(await link.getAttribute('target'),'_blank');}
  assert.match(await text(pa.locator('[data-testid="checkout-withdrawal-hint"]')),/innerhalb von 14 Tagen/);
  assert.equal(await text(pa.locator('[data-testid="checkout-place-order"]')),'Zahlungspflichtig bestellen');
  assert.equal(await pa.locator('[data-testid="checkout-place-order"]').isDisabled(),true,'terms first');
  assert.equal(await text(pa.locator('[data-testid="checkout-payment-note"]')),norm(t('de','paymentRedirectNote')));
  assert.deepEqual((await pa.locator('[data-testid="checkout-trust"] li').allInnerTexts()).map(norm),['trustWithdrawal','trustPayment','trustContact'].map(k=>norm(t('de',k))));
  const below=await pa.evaluate(()=>{const cta=document.querySelector('[data-testid="checkout-place-order"]');return ['checkout-payment-note','checkout-trust'].every(id=>Boolean(cta.compareDocumentPosition(document.querySelector('[data-testid="'+id+'"]'))&Node.DOCUMENT_POSITION_FOLLOWING));});
  assert.equal(below,true);
  // The Muster-Widerrufsformular target exists on the legal page.
  const legal=await pa.context().newPage();await open(legal,'/teileklar/rechtliches');await legal.locator('#widerrufsformular').waitFor();
  for(const id of ['agb','widerruf'])assert.equal(await legal.locator('#'+id).count(),1);await legal.close();
  assert.deepEqual(blockedEffects,[]);assert.equal((await state()).orders,0);
 });
 await check(shopChecks,'checkout_reachable_with_server_quote_while_order_and_payment_blocked',async()=>{
  await open(pa,'/teileklar/kasse');await pa.locator('[data-testid="checkout-address-form"]').waitFor();
  for(const [field,value] of Object.entries({first_name:'Synthetisch',last_name:'Testlauf',street:'Teststraße 1',zip:'10115',city:'Berlin',email:'synthetic@example.invalid'}))
   await pa.locator('[data-testid="checkout-address-'+field+'"]').fill(value);
  await pa.locator('[data-testid="checkout-address-continue"]').click();
  await pa.locator('[data-testid="shipping-option-standard"]').waitFor();assert.equal(await pa.locator('[data-testid="shipping-option-standard"]').isChecked(),true);
  const quote=pa.waitForResponse(r=>r.url().endsWith('/api/shop/checkout/quote'));await pa.locator('[data-testid="checkout-shipping-continue"]').click();
  const q=await (await quote).json();assert.equal(q.subtotal_cents,UNIT[BRAKE]*5);assert.equal(q.total_cents,UNIT[BRAKE]*5+SHIPPING);assert.match(q.quote_hash,/^[0-9a-f]{64}$/);
  await pa.locator('[data-testid="checkout-review"]').waitFor();assert.equal(await text(pa.locator('[data-testid="cart-total"]')),norm(euro('de',q.total_cents)));
  await pa.locator('[data-testid="checkout-terms-checkbox"]').check();
  await pa.locator('[data-testid="checkout-place-order"]').click();
  const error=pa.locator('[data-testid="checkout-error"]');await error.waitFor();assert.match(await text(error),/Es wurde keine Zahlung ausgelöst/);
  assert.equal(new URL(pa.url()).origin,origin);
  assert.deepEqual(blockedEffects,[{method:'POST',path:'/api/shop/orders'}]);
  const s=await state();assert.equal(s.orders,0);assert.deepEqual(s.provider_calls,[]);assert.deepEqual(s.mail_calls,[]);
 });
 await check(shopChecks,'mobile_390_cart_and_checkout_without_horizontal_overflow',async()=>{
  await pa.setViewportSize({width:390,height:844});
  for(const [path,ready] of [['/teileklar/warenkorb','cart-view'],['/teileklar/kasse','checkout-address-form'],['/teileklar/produkt/'+BRAKE,'product-detail']]){
   await open(pa,path);await pa.locator('[data-testid="'+ready+'"]').waitFor();assert.equal(await noOverflow(pa),true,path);
  }
 });
 await a.close();
 finalState=await state();
 assert.deepEqual(external,[]);assert.deepEqual(uncaught,[]);assert.equal(finalState.orders,0);
 assert.deepEqual(finalState.provider_calls,[]);assert.deepEqual(finalState.mail_calls,[]);
 assert.deepEqual(await hashes(ALL),before,'Sources changed during run; rerun rather than rehash');
 passed=true;
}finally{await browser.close().catch(()=>{});await server.close();await stopBackend();await rm(cache,{recursive:true,force:true});}

const recorded_at=new Date().toISOString();
const runtime={backend:'apps/shop-api vercel_app.create_app (production adapter, real shop routers) on loopback',
 database:'mongomock-motor in-process, synthetic seed from apps/site/tests/fixtures/shop_api_fixture.py',
 schema_probe:'accepted_in_memory (validators unsupported by mongomock; covered by apps/shop-api/tests/test_vercel_adapter.py)',
 frontend:'apps/site Vite dev server, /api proxied to the fixture; site Origin mapped to the bound public origin',
 browser:'Chromium headless via Playwright',payment_provider:'refused in fixture and /api/shop/orders blocked in browser'};
const pick=paths=>Object.fromEntries(paths.map(p=>[p,before[p]]));
const common={recorded_at,passed,runtime,synthetic_data:true,external_requests:external,uncaught_errors:uncaught,
 supplier_image_requests_blocked:blockedImages.length};
const catalogReport={...common,scope:'Local real-browser catalogue run against the real shop-api adapter with synthetic in-memory data. Not production, supplier data, price approval or accessibility acceptance.',
 checks:catalogChecks,requests:requests.catalog,source_sha256:pick(CATALOG_SOURCES)};
const shopReport={...common,scope:'Local real-browser cart/checkout run against the real shop-api adapter with synthetic in-memory data. No order, payment, mail or provider call; not production or legal acceptance.',
 checks:shopChecks,requests:requests.shop,blocked_effect_requests:blockedEffects,order_submitted:finalState?.orders!==0?null:false,
 payment_started:finalState&&finalState.provider_calls.length===0?false:null,
 server_effects:finalState&&{orders:finalState.orders,provider_calls:finalState.provider_calls,mail_calls:finalState.mail_calls},
 source_sha256:pick(SHOP_SOURCES)};
const out=new URL('.local/shop-api/',repo);await mkdir(out,{recursive:true});
await writeFile(new URL('browser-catalog.json',out),JSON.stringify(catalogReport,null,2)+'\n');
await writeFile(new URL('browser-shop.json',out),JSON.stringify(shopReport,null,2)+'\n');
console.log(JSON.stringify({passed,catalog_checks:catalogChecks.length,shop_checks:shopChecks.length,output:'.local/shop-api/'}));
if(!passed)process.exitCode=1;
