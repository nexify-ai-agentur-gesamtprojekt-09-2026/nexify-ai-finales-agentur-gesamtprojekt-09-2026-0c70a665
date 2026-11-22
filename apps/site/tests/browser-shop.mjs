// Real Chromium -> Vite site (apps/site, serving today's TEILEKLAR shop UI from apps/web/components/shop) -> MOCK shop API.
// The API is an in-process, in-memory stand-in (fixtures/shop-api-mock.mjs) for apps/shop-api (FastAPI + MongoDB), which is not
// started here. Every response is synthetic: this is "mit gemockter Antwort" evidence for the browser frontend against the API
// wire contract. It is neither a server proof nor production data. No real checkout, payment, order, e-mail or supplier call:
// the hosted-payment redirect target and the supplier image host are answered by local stand-ins and counted.
// Run from the repository root: PLAYWRIGHT_MODULE=<shim>.mjs node apps/site/tests/browser-shop.mjs
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
const OUTPUT='evidence/shop-ui-mock-2026-11-09/browser-shop.json';
const sources=['apps/web/components/shop/api.ts','apps/web/components/shop/ProductPlaceholder.tsx','apps/web/components/shop/ProductStory.tsx','apps/web/components/shop/product-story-copy.ts','apps/web/components/shop/CatalogView.tsx','apps/web/components/shop/CategoryList.tsx','apps/web/components/shop/ProductCard.tsx','apps/web/components/shop/ProductDetail.tsx','apps/web/components/shop/CartView.tsx','apps/web/components/shop/Checkout.tsx','apps/web/components/shop/AddressStep.tsx','apps/web/components/shop/SellerInfo.tsx','apps/web/components/shop/CommerceHeader.tsx','apps/web/components/shop/PublicShopContent.tsx','apps/web/components/shop/shipping-hint.ts','apps/web/components/shop/shop.css','apps/web/components/shop/Storefront.css','apps/web/components/PublicExperience.tsx','apps/site/src/main.tsx','config/shop-interface-copy.json','apps/site/tests/browser-shop.mjs','apps/site/tests/fixtures/shop-api-mock.mjs'];
async function hashes(){return Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await readFile(join(repo,path))).digest('hex')])));}
const before=await hashes();
const cache=await mkdtemp(join(tmpdir(),'nexify-browser-shop-'));
const mock=createShopMock(),state=mock.state;
const server=await createServer({root,cacheDir:cache,server:{port:0,strictPort:false},logLevel:'error',define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'},plugins:[{name:'mock-shop-api',configureServer(vite){vite.middlewares.use(mock.handler);}}]});
await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
const checks=[],external=[],pageErrors=[],orderBodies=[],counters={supplier_image_requests_answered_locally:0,payment_page_navigations_answered_locally:0};
const PIXEL=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
await context.route('**/*',route=>{
 const u=new URL(route.request().url());
 if(u.origin===origin){if(u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/api/shop/'))return route.fulfill({status:404,json:{error:'not_part_of_this_test'}});return route.continue();}
 if(u.protocol==='data:')return route.continue();
 if(u.hostname==='cdnbigbuy.com'){counters.supplier_image_requests_answered_locally+=1;return route.fulfill({status:200,contentType:'image/png',body:PIXEL});}
 if(u.hostname==='checkout.revolut.com'){counters.payment_page_navigations_answered_locally+=1;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Mock hosted payment page</title><p>Local stand-in. No payment is possible here.</p>'});}
 external.push(u.origin);return route.abort();
});
const page=await context.newPage();
page.on('pageerror',error=>pageErrors.push(String(error.message)));
page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/api/shop/orders')orderBodies.push({idempotency_key:request.headers()['idempotency-key'],body:request.postDataJSON()});});
const flat=value=>value.replace(/[  ]/g,' ').replace(/\s+/g,' ').trim();
const body=async()=>flat(await page.locator('main').innerText());
const requestsOf=(method,path)=>state.log.filter(entry=>entry.method===method&&entry.path===path);
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
async function reset(){state.carts.clear();state.orders.clear();state.fail={catalog:null,categories:null,cartItems:null,quote:null,orders:null,validate:null};state.orderMode='ok';state.priceChange=null;await context.clearCookies();}
async function go(path){await page.goto(origin+path);await page.locator('main h1').first().waitFor();await page.evaluate(()=>sessionStorage.clear());}
const ADDRESS={first_name:'Mia',last_name:'Muster',street:'Musterstraße 1',zip:'41061',city:'Mönchengladbach',email:'mia.muster@example.invalid'};
async function fillAddress(values={}){const data={...ADDRESS,...values};for(const[key,value]of Object.entries(data).filter(([key])=>key!=='country'))await page.locator('[data-testid="checkout-address-'+key+'"]').fill(value);if(values.country)await page.locator('[data-testid="checkout-address-country"]').selectOption(values.country);}
async function addProduct(id,quantity=1){await go('/teileklar/produkt/'+id);const input=page.locator('[data-testid="product-quantity"]');await input.fill(String(quantity));await page.locator('[data-testid="add-to-cart-button"]').click();await page.locator('[data-testid="add-to-cart-success"]').waitFor();}
async function reachReview(){
 await reset();await addProduct('mock-0001',1);await go('/teileklar/kasse');await page.locator('[data-testid="checkout-address-form"]').waitFor();
 await fillAddress();await page.locator('[data-testid="checkout-address-continue"]').click();
 await page.locator('[data-testid="checkout-shipping-form"]').waitFor();await page.locator('[data-testid="checkout-shipping-continue"]').click();
 await page.locator('[data-testid="checkout-review"]').waitFor();
}
try{
 await check('catalog_search_sort_stock_filter_category_and_pagination_use_server_parameters',async()=>{
  await reset();await go('/teileklar/suche');await page.locator('[data-testid="catalog-results"]').waitFor();
  assert.ok((await body()).includes('36 Artikel'),'total count from the API response');
  assert.equal(await page.locator('[data-testid="catalog-results"] ul.tk-grid > li').count(),24,'first page holds 24 items');
  assert.ok((await body()).includes('Seite 1 von 2'));
  await page.locator('[data-testid="pagination-next"]').click();await page.waitForFunction(()=>document.querySelector('[data-testid="pagination"]')?.textContent.includes('Seite 2 von 2'));
  assert.equal(await page.locator('[data-testid="catalog-results"] ul.tk-grid > li').count(),12,'second page holds the remaining 12 items');
  assert.ok(state.log.some(entry=>entry.method==='GET'&&entry.path==='/api/shop/products'&&entry.status===200),'products were read through the API');
  await page.locator('main [data-testid="shop-search-input"]').fill('Öl');await page.locator('main [data-testid="shop-search-submit"]').click();
  await page.waitForURL(origin+'/teileklar/suche?q=%C3%96l');await page.waitForFunction(()=>document.querySelector('[data-testid="catalog-count"]')?.textContent.includes('1 Artikel'));
  assert.ok((await page.locator('[data-testid="catalog-count"]').innerText()).includes('„Öl“'));
  assert.equal(await page.locator('[data-testid="product-card-mock-0001"]').count(),1);
  await go('/teileklar/suche');await page.locator('[data-testid="catalog-results"]').waitFor();
  await page.locator('[data-testid="catalog-sort"]').selectOption('price_desc');await page.waitForFunction(()=>document.querySelector('[data-testid="catalog-results"] li')?.getAttribute('data-testid')==='product-card-mock-0006');
  await page.locator('[data-testid="catalog-sort"]').selectOption('availability');
  await page.locator('[data-testid="catalog-sort"]').selectOption('name');await page.locator('[data-testid="product-card-mock-0002"]').waitFor();
  await page.locator('[data-testid="catalog-stock-filter"]').check();await page.waitForFunction(()=>document.querySelector('[data-testid="catalog-count"]')?.textContent.includes('34 Artikel'));
  assert.equal(await page.locator('[data-testid="product-card-mock-0002"]').count(),0,'out-of-stock item filtered by the API');
  await page.locator('[data-testid="catalog-stock-filter"]').uncheck();
  await page.locator('[data-testid="catalog-category-102"]').click();await page.waitForFunction(()=>document.querySelector('[data-testid="catalog-count"]')?.textContent.includes('4 Artikel'));
  assert.ok(state.log.length>0);
  await page.locator('main [data-testid="shop-search-input"]').fill('zzzz-kein-treffer');await page.locator('main [data-testid="shop-search-submit"]').click();
  await page.locator('[data-testid="catalog-empty"]').waitFor();assert.ok((await body()).includes('Keine passenden Artikel'));assert.equal(await page.locator('.tk-grid li').count(),0,'no invented sample products');
 });
 await check('product_detail_shows_price_stock_fitment_states_and_missing_product',async()=>{
  await reset();
  await go('/teileklar/produkt/mock-0001');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.equal(flat(await page.locator('[data-testid="product-name"]').innerText()),'Mock-Motoröl 5W-30 1 L');
  assert.ok(flat(await page.locator('[data-testid="product-price"]').innerText()).startsWith('15,99 €'));
  assert.ok(flat(await page.locator('[data-testid="fitment-status"]').innerText()).includes('Passung nicht geprüft'));
  assert.equal(await page.locator('[data-testid="product-sku"]').innerText(),'MOCK-OIL-5W30');assert.equal(await page.locator('[data-testid="product-ean"]').innerText(),'4000000000011');
  assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isEnabled(),true);
  const description=await page.locator('.tk-description').innerText();assert.ok(description.includes('Synthetischer Mock-Datensatz')&&!description.includes('<p>'),'supplier HTML is rendered as plain text');
  await page.waitForFunction(()=>{const image=document.querySelector('.tk-image img');return image&&image.complete&&image.naturalWidth>0;});
  assert.equal(await page.locator('.tk-image img').first().getAttribute('referrerpolicy'),'no-referrer');
  await go('/teileklar/produkt/mock-0002');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isDisabled(),true);assert.ok((await page.locator('[data-testid="out-of-stock-note"]').innerText()).includes('nicht auf Lager'));assert.ok((await page.locator('[data-testid="stock-label"]').first().innerText()).includes('Derzeit nicht auf Lager'));
  await go('/teileklar/produkt/mock-0003');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.ok((await body()).includes('Verkaufspreis noch nicht verfügbar'));assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isDisabled(),true);assert.ok(await page.locator('[data-testid="price-not-released-note"]').count()===1);
  await go('/teileklar/produkt/mock-0004');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.ok((await page.locator('[data-testid="stock-label"]').first().innerText()).includes('unbekannt'));assert.equal(await page.locator('[data-testid="add-to-cart-button"]').isDisabled(),true);
  await go('/teileklar/produkt/mock-0005');await page.locator('[data-testid="product-detail"]').waitFor();
  assert.equal(await page.locator('.tk-image img').count(),0,'a non-allowlisted image host is never rendered');assert.equal(await page.locator('[data-testid="product-placeholder"]').count()>0,true,'the branded placeholder stands in for the refused image');
  await go('/teileklar/produkt/gibt-es-nicht');await page.locator('[data-testid="product-missing"]').waitFor();assert.ok((await body()).includes('Artikel nicht gefunden'));
 });
 await check('add_to_cart_creates_httponly_visitor_cart_and_cart_survives_reload',async()=>{
  await reset();await go('/teileklar/produkt/mock-0001');
  assert.equal((await context.cookies()).some(cookie=>cookie.name==='tk_guest'),false,'no visitor state before the first cart write');
  await page.locator('[data-testid="product-quantity"]').fill('2');await page.locator('[data-testid="add-to-cart-button"]').click();await page.locator('[data-testid="add-to-cart-success"]').waitFor();
  const cookie=(await context.cookies()).find(entry=>entry.name==='tk_guest');assert.ok(cookie,'visitor cookie set by the first cart write');assert.equal(cookie.httpOnly,true);assert.equal(await page.evaluate(()=>document.cookie.includes('tk_guest')),false,'cookie is not readable by scripts');
  await page.waitForFunction(()=>document.querySelector('[data-testid="shop-nav-cart-count"]')?.textContent==='2');
  await page.locator('[data-testid="add-to-cart-success"] a').click();await page.waitForURL('**/teileklar/warenkorb');await page.locator('[data-testid="cart-view"]').waitFor();
  assert.equal(await page.locator('[data-testid="cart-qty-mock-0001"]').inputValue(),'2');
  assert.equal(flat(await page.locator('[data-testid="cart-line-total-mock-0001"]').innerText()),'31,98 €');assert.equal(flat(await page.locator('[data-testid="cart-subtotal"]').innerText()),'31,98 €');
  assert.equal(flat(await page.locator('[data-testid="cart-shipping"]').innerText()),'Berechnung nach Lieferadresse');
  assert.equal(flat(await page.locator('[data-testid="cart-free-shipping"]').innerText()),'Noch 43,02 € bis zum kostenlosen Versand (ab 75,00 €).');
  await page.reload();await page.locator('[data-testid="cart-view"]').waitFor();assert.equal(await page.locator('[data-testid="cart-qty-mock-0001"]').inputValue(),'2','the cart is read back from the API after a reload');
  assert.equal(state.carts.size,1);
 });
 await check('cart_quantity_change_follows_server_total_rejects_over_stock_and_remove_empties_cart',async()=>{
  await reset();await addProduct('mock-0001',2);await go('/teileklar/warenkorb');await page.locator('[data-testid="cart-view"]').waitFor();
  const quantity=page.locator('[data-testid="cart-qty-mock-0001"]');await quantity.fill('3');await quantity.blur();
  await page.waitForFunction(()=>document.querySelector('[data-testid="cart-line-total-mock-0001"]')?.textContent.replace(/\s/g,' ').includes('47,97'));
  assert.equal(flat(await page.locator('[data-testid="cart-total"]').innerText()),'47,97 €');
  await quantity.fill('13');await quantity.blur();await page.locator('main [role="alert"]').first().waitFor();
  assert.ok((await body()).includes('Die Menge konnte nicht geändert werden. Bitte prüfen Sie den Lagerbestand.'));
  await page.waitForFunction(()=>document.querySelector('[data-testid="cart-qty-mock-0001"]')?.value==='3');
  assert.equal([...state.carts.values()][0].items[0].quantity,3,'a rejected quantity leaves the server cart unchanged');
  await page.locator('[data-testid="cart-remove-mock-0001"]').click();await page.locator('[data-testid="cart-empty"]').waitFor();
  assert.ok((await body()).includes('Ihr Warenkorb ist leer'));assert.equal([...state.carts.values()][0].items.length,0);
 });
 await check('stock_limit_blocks_second_add_without_a_write_request',async()=>{
  await reset();await addProduct('mock-0006',3);
  await go('/teileklar/produkt/mock-0006');const writesBefore=requestsOf('POST','/api/shop/cart/items').length;
  await page.locator('[data-testid="add-to-cart-button"]').click();await page.locator('[data-testid="add-to-cart-error"]').waitFor();
  assert.ok((await page.locator('[data-testid="add-to-cart-error"]').innerText()).includes('Diese Menge ist beim Lieferanten nicht verfügbar.'));
  assert.equal(requestsOf('POST','/api/shop/cart/items').length,writesBefore,'the stock limit is checked against a fresh cart read before any write');
  assert.equal([...state.carts.values()][0].items[0].quantity,3);
 });
 await check('lost_response_after_committed_cart_write_is_reread_before_the_retry',async()=>{
  await reset();await addProduct('mock-0001',1);await go('/teileklar/produkt/mock-0001');
  state.fail.cartItems='drop-after';await page.locator('[data-testid="add-to-cart-button"]').click();await page.locator('[data-testid="add-to-cart-error"]').waitFor();
  assert.ok((await page.locator('[data-testid="add-to-cart-error"]').innerText()).includes('Der Artikel konnte nicht hinzugefügt werden.'));
  assert.ok(state.log.some(entry=>entry.aborted&&entry.path==='/api/shop/cart/items'),'the response really was lost (Chromium may redeliver the dropped POST; the absolute quantity makes that harmless)');
  assert.equal([...state.carts.values()][0].items[0].quantity,2,'the write was committed although the response was lost, and redelivery did not add more');
  state.fail.cartItems=null;const readsBefore=requestsOf('GET','/api/shop/cart').length;
  await page.locator('[data-testid="add-to-cart-button"]').click();await page.locator('[data-testid="add-to-cart-success"]').waitFor();
  assert.ok(requestsOf('GET','/api/shop/cart').length>readsBefore,'the retry first reads the committed cart');
  assert.equal([...state.carts.values()][0].items[0].quantity,3,'committed 2 plus the one new click; an absolute quantity from a fresh read, not a blind repeat of the lost write');
 });
 await check('catalog_and_category_failures_show_errors_never_an_empty_or_sample_catalogue',async()=>{
  await reset();state.fail.catalog='503';await go('/teileklar/suche');await page.locator('[data-testid="catalog-error"]').waitFor();
  assert.ok((await body()).includes('Der Katalog konnte nicht geladen werden.'));assert.equal(await page.locator('.tk-grid li').count(),0);assert.equal(await page.locator('[data-testid="catalog-empty"]').count(),0,'a failure is not shown as "no results"');
  state.fail.catalog='html';await page.locator('[data-testid="catalog-retry"]').click();await page.locator('[data-testid="catalog-error"]').waitFor();
  assert.equal(await page.locator('[data-testid="catalog-results"]').count(),0,'an HTTP 200 HTML fallback is treated as unavailable, not as an empty catalogue');
  state.fail.catalog=null;await page.locator('[data-testid="catalog-retry"]').click();await page.locator('[data-testid="catalog-results"]').waitFor();
  state.fail.categories='503';await go('/teileklar/kategorien');await page.locator('main [role="alert"]').first().waitFor();assert.ok((await body()).includes('Die Kategorien konnten nicht geladen werden.'));assert.equal(await page.locator('[data-testid="category-list"]').count(),0);
  state.fail.categories=null;await go('/teileklar/kategorien');await page.locator('[data-testid="category-list"]').waitFor();assert.equal(await page.locator('[data-testid="category-list"] li').count(),3);
 });
 await check('checkout_without_cart_is_explicit_and_address_is_validated_client_and_server_side',async()=>{
  await reset();await go('/teileklar/kasse');await page.locator('[data-testid="checkout-empty"]').waitFor();assert.ok((await body()).includes('Ihr Warenkorb ist leer'));
  await addProduct('mock-0001',1);await go('/teileklar/kasse');await page.locator('[data-testid="checkout-address-form"]').waitFor();
  const calls=()=>requestsOf('POST','/api/shop/checkout/validate-address').length+requestsOf('POST','/api/shop/checkout/quote').length;const base=calls();
  await page.locator('[data-testid="checkout-address-continue"]').click();
  for(const field of ['first_name','last_name','street','zip','city','email'])await page.locator('[data-testid="checkout-address-'+field+'-error"]').waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'addr-first_name','focus moves to the first invalid field');assert.equal(calls(),base,'client-side validation sends nothing');
  await fillAddress({zip:'123'});await page.locator('[data-testid="checkout-address-continue"]').click();await page.locator('[data-testid="checkout-address-zip-error"]').waitFor();assert.equal(calls(),base);
  await fillAddress({country:'NL',zip:'1234'});const verdict=page.waitForResponse(response=>response.url().endsWith('/api/shop/checkout/validate-address'));await page.locator('[data-testid="checkout-address-continue"]').click();
  assert.equal((await verdict).status(),422,'the server rejects what the client cannot judge (NL postcode)');await page.locator('[data-testid="checkout-address-zip-error"]').waitFor();
  assert.equal(await page.locator('[data-testid="checkout-shipping-form"]').count(),0,'no step change on a server-side address error');
  await fillAddress({country:'NL',zip:'1234 AB'});await page.locator('[data-testid="checkout-address-continue"]').click();await page.locator('[data-testid="checkout-shipping-form"]').waitFor();
 });
 await check('checkout_review_shows_server_totals_seller_info_and_gates_the_order_on_terms',async()=>{
  await reachReview();
  const review=await flat(await page.locator('[data-testid="checkout-review"]').innerText());
  assert.ok(review.includes('Mia Muster')&&review.includes('41061 Mönchengladbach')&&review.includes('1 × Mock-Motoröl 5W-30 1 L'));
  assert.ok(review.includes('25,94 €')&&review.includes('4,14 €')&&review.includes('Versand: 9,95 €'),'subtotal 15,99 plus flat-rate shipping 9,95 = 25,94 incl. 4,14 VAT, all taken from the API response');
  assert.ok((await page.locator('[data-testid="checkout-seller"]').innerText()).includes('Pascal Courbois'));assert.ok((await page.locator('[data-testid="checkout-countries"]').innerText()).includes('Deutschland'));
  const order=page.locator('[data-testid="checkout-place-order"]');assert.equal(await order.isDisabled(),true,'no order without accepted terms');
  assert.equal(await page.locator('[data-testid="checkout-agb-link"]').getAttribute('href'),'/teileklar/rechtliches#agb');assert.equal(await page.locator('[data-testid="checkout-withdrawal-link"]').getAttribute('href'),'/teileklar/rechtliches#widerruf');
  await page.locator('[data-testid="checkout-terms-checkbox"]').check();assert.equal(await order.isEnabled(),true);
  assert.equal(requestsOf('POST','/api/shop/orders').length,0,'reviewing creates no order');
 });
 await check('price_change_blocks_the_order_until_the_customer_confirms_the_changes',async()=>{
  await reachReview();state.priceChange={product_id:'mock-0001',new:1799};
  await page.locator('[data-testid="checkout-terms-checkbox"]').check();await page.locator('[data-testid="checkout-place-order"]').click();
  await page.locator('[data-testid="checkout-changes"]').waitFor();const changes=flat(await page.locator('[data-testid="checkout-changes"]').innerText());assert.ok(changes.includes('Preis geändert')&&changes.includes('15,99 € → 17,99 €'));
  assert.equal(await page.locator('[data-testid="checkout-place-order"]').isDisabled(),true);assert.equal(counters.payment_page_navigations_answered_locally,0,'no hand-over while changes are pending');assert.equal(state.orders.size,0);
  await page.locator('[data-testid="checkout-accept-changes"]').click();await page.waitForFunction(()=>!document.querySelector('[data-testid="checkout-changes"]'));
  assert.ok(flat(await page.locator('[data-testid="checkout-review"]').innerText()).includes('27,94 €'),'17,99 plus 9,95 shipping');
  assert.equal(await page.locator('[data-testid="checkout-place-order"]').isEnabled(),true);
 });
 await check('order_hands_over_to_hosted_payment_and_retry_reuses_the_same_idempotency_key',async()=>{
  await reachReview();state.orderMode='provider_down';orderBodies.length=0;
  await page.locator('[data-testid="checkout-terms-checkbox"]').check();await page.locator('[data-testid="checkout-place-order"]').click();
  await page.locator('[data-testid="checkout-error"]').waitFor();assert.ok((await page.locator('[data-testid="checkout-error"]').innerText()).includes('Die Weiterleitung zur Zahlung ist noch nicht bestätigt'));
  assert.ok(await page.evaluate(()=>sessionStorage.getItem('tk-order-key')),'the attempt key is kept for the retry');assert.equal(counters.payment_page_navigations_answered_locally,0);
  state.orderMode='ok';await page.locator('[data-testid="checkout-place-order"]').click();await page.waitForURL(/^https:\/\/checkout\.revolut\.com\/payment-link\/mock-order-1$/);
  assert.equal(counters.payment_page_navigations_answered_locally,1,'the hand-over is a plain navigation to the (locally answered) hosted payment host');
  assert.equal(orderBodies.length,2);assert.equal(orderBodies[0].idempotency_key,orderBodies[1].idempotency_key,'the retry reuses the idempotency key');assert.ok(orderBodies[0].idempotency_key.length>=16);
  assert.equal(state.orders.size,1,'one order for two attempts');assert.deepEqual(orderBodies[1].body.accept_terms,true);assert.equal(orderBodies[1].body.shipping_method,'standard');assert.match(orderBodies[1].body.quote_hash,/^[0-9a-f]{64}$/);assert.equal(orderBodies[1].body.address.email,ADDRESS.email);
  assert.equal(Object.keys(orderBodies[1].body).some(key=>/price|total|amount/i.test(key)),false,'the client sends no prices or totals');
 });
 await check('payment_url_on_a_foreign_host_is_rejected_without_navigation',async()=>{
  await reachReview();state.orderMode='bad_url';const url=page.url();
  await page.locator('[data-testid="checkout-terms-checkbox"]').check();await page.locator('[data-testid="checkout-place-order"]').click();
  await page.locator('[data-testid="checkout-error"]').waitFor();assert.equal(page.url(),url,'no navigation to a non-Revolut host');
 });
 await check('commerce_pages_are_german_only_keyboard_operable_and_fit_390px_without_overflow',async()=>{
  await reset();await page.setViewportSize({width:390,height:844});await addProduct('mock-0001',1);
  const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
  for(const path of ['/teileklar/suche','/teileklar/produkt/mock-0001','/teileklar/warenkorb','/teileklar/kasse']){
   await go(path);await page.waitForTimeout(250);
   assert.equal(await page.evaluate(()=>document.documentElement.lang),'de');assert.equal(await page.locator('#locale').count(),0,'the TEILEKLAR header has no language switch (German only)');
   assert.equal(await fits(),true,'no horizontal overflow at 390 px: '+path);
  }
  await go('/teileklar/warenkorb');await page.locator('[data-testid="cart-view"]').waitFor();
  assert.equal(await page.locator('.tk-mobile-commerce-nav .tk-mobile-cart span').innerText(),'1');
  await page.locator('[data-testid="cart-qty-mock-0001"]').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-testid')),'cart-remove-mock-0001');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-testid')),'cart-qty-mock-0001');
  await go('/teileklar/produkt/mock-0001');const target=await page.locator('[data-testid="add-to-cart-button"]').boundingBox();assert.ok(target.height>=44&&target.width>=44,'primary action target size '+JSON.stringify(target));
  await page.setViewportSize({width:1280,height:1000});
 });
 assert.deepEqual(external,[],'no request left the local test origin unanswered');assert.deepEqual(pageErrors,[],'no uncaught page error');
 const after=await hashes();assert.deepEqual(after,before,'sources changed during the run; rerun rather than rehash');
 const seen=new Map();for(const entry of state.log){const key=entry.method+' '+entry.path+' '+(entry.aborted?'connection_dropped':entry.status);seen.set(key,(seen.get(key)||0)+1);}
 const report={recorded_at:new Date().toISOString(),passed:true,mock:true,mock_label:MOCK_LABEL,
  scope:'Real Chromium against the Vite site (apps/site) rendering the current TEILEKLAR shop components (apps/web/components/shop) with an in-process MOCK of the shop API wire contract. mit gemockter Antwort; no apps/shop-api server code, no MongoDB, no BigBuy, no Revolut, no production data. Frontend contract proof only.',
  production_data:false,server_code_executed:false,checks,source_sha256:before,
  requests:[...seen].map(([key,count])=>{const[method,path,status]=key.split(' ');return{method,path,status:status==='connection_dropped'?status:Number(status),count};}).sort((a,b)=>(a.path+a.method+a.status).localeCompare(b.path+b.method+b.status)),
  external_requests:external,...counters,real_payment_started:false,real_order_submitted:false,page_errors:pageErrors,
  reproduction:'PLAYWRIGHT_MODULE=<shim exposing chromium with executablePath /opt/pw-browsers/chromium> node apps/site/tests/browser-shop.mjs (from the repository root, after node apps/site/scripts/generate-public-data.mjs)'};
 await mkdir(join(repo,dirname(OUTPUT)),{recursive:true});await writeFile(join(repo,OUTPUT),JSON.stringify(report,null,2)+'\n');
}finally{await context.close();await browser.close();await server.close();await rm(cache,{recursive:true,force:true});}
