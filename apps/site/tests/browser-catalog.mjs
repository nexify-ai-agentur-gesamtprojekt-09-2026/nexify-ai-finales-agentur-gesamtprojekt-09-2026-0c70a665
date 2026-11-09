// Real Chromium -> Vite site (apps/site, today's TEILEKLAR catalogue UI from apps/web/components/shop) -> MOCK shop API.
// Browse-only proof for the public catalogue: what is shown comes from the API response, supplier facts are not embellished,
// images only come from the allow-listed supplier host, and browsing is read-only (no cart, no cookie, no write request).
// The API is the in-process synthetic stand-in fixtures/shop-api-mock.mjs ("mit gemockter Antwort"); apps/shop-api is not
// started, nothing here is production data and no supplier, payment or order service is contacted.
// Run from the repository root: PLAYWRIGHT_MODULE=<shim>.mjs node apps/site/tests/browser-catalog.mjs
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {mkdtemp,rm,writeFile,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createShopMock,MOCK_LABEL} from './fixtures/shop-api-mock.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const OUTPUT='evidence/shop-ui-mock-2026-11-09/browser-catalog.json';
const sources=['apps/web/components/shop/api.ts','apps/web/components/shop/CatalogView.tsx','apps/web/components/shop/CategoryList.tsx','apps/web/components/shop/ProductCard.tsx','apps/web/components/shop/ProductDetail.tsx','apps/web/components/shop/PublicShopContent.tsx','apps/web/components/shop/CommerceHeader.tsx','apps/web/components/shop/shop.css','apps/web/components/shop/Storefront.css','apps/web/components/PublicExperience.tsx','apps/site/src/main.tsx','config/shop-interface-copy.json','apps/site/tests/browser-catalog.mjs','apps/site/tests/fixtures/shop-api-mock.mjs'];
async function hashes(){return Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(join(repo,path))).digest('hex')])));}
const before=await hashes();
const cache=await mkdtemp(join(tmpdir(),'nexify-browser-catalog-'));
const mock=createShopMock(),state=mock.state,fullDataset=[...state.products];
const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false},logLevel:'error',define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'},plugins:[{name:'mock-shop-api',configureServer(vite){vite.middlewares.use(mock.handler);}}]});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const checks=[],external=[],pageErrors=[],imageRequests=[];
const PIXEL=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.origin===origin){if(u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/api/shop/'))return route.fulfill({status:404,json:{error:'not_part_of_this_test'}});return route.continue();}
 if(u.protocol==='data:')return route.continue();
 if(u.hostname==='cdnbigbuy.com'){imageRequests.push(u.href);return route.fulfill({status:200,contentType:'image/png',body:PIXEL});}
 external.push(u.origin);return route.abort();
});
const page=await context.newPage();
page.on('pageerror',error=>pageErrors.push(String(error.message)));
const flat=value=>value.replace(/[  ]/g,' ').replace(/\s+/g,' ').trim();
const body=async()=>flat(await page.locator('main').innerText());
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
async function reset(){state.products=[...fullDataset];state.carts.clear();state.orders.clear();state.fail={catalog:null,categories:null,cartItems:null,quote:null,orders:null,validate:null};await context.clearCookies();}
async function go(path){await page.goto(origin+path);await page.locator('main h1').first().waitFor();}
try{
 await check('empty_catalogue_shows_honest_empty_states_and_no_sample_products',async()=>{
  await reset();state.products=[];
  await go('/teileklar/suche');await page.locator('[data-testid="catalog-empty"]').waitFor();assert.ok((await body()).includes('Keine passenden Artikel'));assert.equal(await page.locator('.tk-grid li').count(),0);
  await go('/teileklar/kategorien');await page.locator('[data-testid="categories-empty"]').waitFor();assert.ok((await body()).includes('Keine Kategorien verfügbar'));assert.equal(await page.locator('[data-testid="category-list"]').count(),0);
  await go('/teileklar/produkt/mock-0001');await page.locator('[data-testid="product-missing"]').waitFor();
  state.products=[...fullDataset];
 });
 await check('rendered_products_equal_the_api_page_with_supplier_facts_and_price_stock_states',async()=>{
  await reset();await go('/teileklar/suche');await page.locator('[data-testid="catalog-results"]').waitFor();
  const api=await (await page.request.get(origin+'/api/shop/products?q=&page=1&sort=availability&in_stock=false')).json();
  const shown=await page.locator('[data-testid="catalog-results"] ul.tk-grid > li').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-testid').replace('product-card-','')));
  assert.deepEqual(shown,api.items.map(item=>item.id),'exactly the API items, in the API order');
  const card=id=>page.locator('[data-testid="product-card-'+id+'"]');
  const oil=flat(await card('mock-0001').innerText());assert.ok(oil.includes('Mock-Motoröl 5W-30 1 L')&&oil.includes('SKU MOCK-OIL-5W30')&&oil.includes('EAN 4000000000011')&&oil.includes('15,99 €')&&oil.includes('inkl. MwSt., zzgl. Versandkosten')&&oil.includes('Lagerbestand beim Lieferanten: 12'));
  await go('/teileklar/suche?q=Mock-Artikel');await page.locator('[data-testid="catalog-results"]').waitFor();
  const unpriced=flat(await card('mock-0003').innerText());assert.ok(unpriced.includes('Verkaufspreis noch nicht verfügbar')&&!/\d,\d\d €/.test(unpriced),'an unreleased price is never replaced by a number');
  const unknown=flat(await card('mock-0004').innerText());assert.ok(unknown.includes('Lagerbestand beim Lieferanten unbekannt')&&!unknown.includes('Lagerbestand beim Lieferanten: 0'),'unknown stock is not shown as zero or as available');
  await go('/teileklar/suche?q=Scheibenwischer');await page.locator('[data-testid="catalog-results"]').waitFor();assert.ok(flat(await card('mock-0002').innerText()).includes('Derzeit nicht auf Lager'));
  const wholePage=await body();assert.equal(/passt (garantiert|sicher|zu Ihrem)/i.test(wholePage),false,'no fitment promise in the listing');
 });
 await check('images_load_only_from_the_supplier_allowlist_and_unsafe_hosts_are_never_requested',async()=>{
  await reset();imageRequests.length=0;await go('/teileklar/suche');await page.locator('[data-testid="catalog-results"]').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.tk-public-commerce .tk-image img')].every(image=>image.complete));
  const sourcesShown=await page.locator('.tk-public-commerce .tk-image img').evaluateAll(nodes=>nodes.map(node=>({src:node.src,policy:node.referrerPolicy,loading:node.loading})));
  assert.ok(sourcesShown.length>=1&&sourcesShown.every(image=>image.src.startsWith('https://cdnbigbuy.com/images/')&&image.policy==='no-referrer'&&image.loading==='lazy'));
  assert.ok(imageRequests.length>=1&&imageRequests.every(url=>url.startsWith('https://cdnbigbuy.com/images/')),'only the allow-listed supplier path is requested');
  assert.equal(await page.locator('[data-testid="product-card-mock-0005"] .tk-image-missing').count(),1,'the item with a foreign image host shows the missing-image notice');
  assert.equal(external.includes('https://evil.example'),false);
 });
 await check('browsing_is_read_only_no_write_request_no_visitor_cookie_no_cart',async()=>{
  await reset();const start=state.log.length;
  for(const path of ['/teileklar/shop','/teileklar/suche?q=Mock','/teileklar/kategorien','/teileklar/kategorie/102','/teileklar/produkt/mock-0001']){await go(path);await page.waitForTimeout(300);}
  await go('/teileklar/suche');await page.locator('[data-testid="pagination-next"]').click();await page.waitForFunction(()=>document.querySelector('[data-testid="pagination"]')?.textContent.includes('Seite 2 von 2'));
  await page.locator('[data-testid="catalog-sort"]').selectOption('price_asc');await page.locator('[data-testid="catalog-stock-filter"]').check();
  const methods=new Set(state.log.slice(start).map(entry=>entry.method));assert.deepEqual([...methods],['GET'],'only GET requests while browsing');
  assert.deepEqual(await context.cookies(),[],'browsing sets no cookie');assert.equal(state.carts.size,0,'browsing creates no cart');
  assert.ok(state.log.slice(start).some(entry=>entry.path==='/api/shop/cart'&&entry.status===200),'the cart badge reads the (empty) cart without creating it');
 });
 await check('search_query_and_seite_parameter_are_honoured_on_load_and_reload',async()=>{
  await reset();await go('/teileklar/suche?q=Mock-Zubeh%C3%B6r');await page.locator('[data-testid="catalog-results"]').waitFor();assert.ok((await page.locator('[data-testid="catalog-count"]').innerText()).includes('30 Artikel für „Mock-Zubehör“'));
  await page.reload();await page.locator('[data-testid="catalog-results"]').waitFor();assert.ok((await page.locator('[data-testid="catalog-count"]').innerText()).includes('„Mock-Zubehör“'));assert.equal(await page.locator('main [data-testid="shop-search-input"]').inputValue(),'Mock-Zubehör');
  await go('/teileklar/suche?seite=2');await page.locator('[data-testid="catalog-results"]').waitFor();assert.ok((await body()).includes('Seite 2 von 2'));assert.equal(await page.locator('[data-testid="catalog-results"] ul.tk-grid > li').count(),12);
  await page.goBack();await page.locator('main h1').first().waitFor();
 });
 await check('category_routes_resolve_numeric_ids_and_malformed_ids_fall_back_to_the_category_list',async()=>{
  await reset();await go('/teileklar/kategorie/102');await page.locator('[data-testid="catalog-results"]').waitFor();assert.ok((await page.locator('[data-testid="catalog-count"]').innerText()).includes('4 Artikel'));
  await go('/teileklar/kategorie/abc');await page.locator('[data-testid="category-list"]').waitFor();assert.equal(await page.locator('[data-testid="catalog-results"]').count(),0);
  await go('/teileklar/produkt');await page.locator('main a[href="/teileklar/suche"]').first().waitFor();assert.ok((await body()).includes('Wählen Sie einen Artikel aus der Artikelsuche'));
 });
 await check('catalogue_filters_and_pagination_fit_390px_and_are_keyboard_reachable',async()=>{
  await reset();await page.setViewportSize({width:390,height:844});
  for(const path of ['/teileklar/suche','/teileklar/shop','/teileklar/kategorien','/teileklar/kategorie/101']){await go(path);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow at 390 px: '+path);}
  await go('/teileklar/suche');await page.locator('[data-testid="catalog-results"]').waitFor();
  await page.locator('main [data-testid="shop-search-input"]').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-testid')),'shop-search-submit');
  for(const id of ['pagination-next','catalog-stock-filter']){const box=await page.locator('[data-testid="'+id+'"]').boundingBox();assert.ok(box&&box.height>=24&&box.width>=24,'target size (WCAG 2.2 AA minimum 24 px) of '+id+' '+JSON.stringify(box));}
  await page.locator('[data-testid="pagination-next"]').scrollIntoViewIfNeeded();await page.locator('[data-testid="pagination-next"]').click();await page.waitForFunction(()=>document.querySelector('[data-testid="pagination"]')?.textContent.includes('Seite 2 von 2'));
  await page.setViewportSize({width:1280,height:1000});
 });
 assert.deepEqual(external,[],'no request left the local test origin unanswered');assert.deepEqual(pageErrors,[],'no uncaught page error');
 assert.deepEqual(await hashes(),before,'sources changed during the run; rerun rather than rehash');
 const seen=new Map();for(const entry of state.log){const key=entry.method+' '+entry.path+' '+(entry.aborted?'connection_dropped':entry.status);seen.set(key,(seen.get(key)||0)+1);}
 const report={recorded_at:new Date().toISOString(),passed:true,mock:true,mock_label:MOCK_LABEL,
  scope:'Real Chromium against the Vite site (apps/site) rendering the current TEILEKLAR catalogue components (apps/web/components/shop) with an in-process MOCK of the shop API wire contract. mit gemockter Antwort; no apps/shop-api server code, no MongoDB, no BigBuy, no production data. Browse-only frontend proof; it does not cover the read-only snapshot mode of the removed ShopPanel catalogue.',
  production_data:false,server_code_executed:false,checks,source_sha256:before,
  requests:[...seen].map(([key,count])=>{const[method,path,status]=key.split(' ');return{method,path,status:status==='connection_dropped'?status:Number(status),count};}).sort((a,b)=>(a.path+a.method+a.status).localeCompare(b.path+b.method+b.status)),
  external_requests:external,supplier_image_requests_answered_locally:imageRequests.length,order_started:false,payment_started:false,page_errors:pageErrors,
  reproduction:'PLAYWRIGHT_MODULE=<shim exposing chromium with executablePath /opt/pw-browsers/chromium> node apps/site/tests/browser-catalog.mjs (from the repository root, after node apps/site/scripts/generate-public-data.mjs)'};
 await mkdir(join(repo,dirname(OUTPUT)),{recursive:true});await writeFile(join(repo,OUTPUT),JSON.stringify(report,null,2)+'\n');
}finally{await context.close();await browser.close();await server.close();await rm(cache,{recursive:true,force:true});}
