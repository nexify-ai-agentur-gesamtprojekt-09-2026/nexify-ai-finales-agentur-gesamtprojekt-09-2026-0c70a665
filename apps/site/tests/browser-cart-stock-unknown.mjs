// Browser contract test with synthetic API responses; no order or supplier request is made.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,server:{host:'127.0.0.1',port:0},logLevel:'error',define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();
const origin='http://127.0.0.1:'+server.httpServer.address().port;
const browser=await chromium.launch({headless:true});
try {
 for(const width of [390,1440]) {
  let lines=['a','b'].map(id=>({product_id:id,name:'Testartikel '+id,sku:id,ean:'',image:null,quantity:1,unit_cents:100,line_cents:100,stock:null,stock_status:'unknown'}));
  const cart=()=>({lines,changes:lines.map(line=>({product_id:line.product_id,kind:'stock_unknown',name:line.name})),subtotal_cents:lines.length*100,shipping_cents:0,total_cents:lines.length*100,vat_included_cents:0,vat_percent:'19',currency:'EUR',count:lines.length});
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  try {
   await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());
    if(u.origin!==origin)return route.abort();
    if(u.pathname==='/api/shop/cart'&&request.method()==='GET')return route.fulfill({status:200,json:cart()});
    if(u.pathname==='/api/shop/cart/items'&&request.method()==='POST'){
     const body=request.postDataJSON();assert.equal(body.quantity,0);lines=lines.filter(line=>line.product_id!==body.product_id);return route.fulfill({status:200,json:cart()});
    }
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'not_in_fixture'}});
    return route.continue();
   });
   const page=await context.newPage();await page.goto(origin+'/teileklar/warenkorb');await page.locator('[data-testid="cart-view"]').waitFor();
   for(const id of ['a','b']) {
    const input=page.getByTestId('cart-qty-'+id),hint=page.getByTestId('cart-stock-unknown-'+id);
    assert.equal(await input.isDisabled(),true);assert.equal(await input.getAttribute('aria-describedby'),'stock-unknown-'+id);
    assert.match(await hint.innerText(),/Bestand kann derzeit nicht bestätigt/);
    assert.equal(await page.getByTestId('cart-remove-'+id).isEnabled(),true);
   }
   assert.equal(await page.getByTestId('cart-checkout-link').count(),0);
   assert.match(await page.getByTestId('cart-checkout-unavailable').innerText(),/Bestand aller Artikel bestätigt/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal viewport overflow');
   await page.goto(origin+'/teileklar/kasse');await page.getByTestId('checkout-stock-unavailable').waitFor();
   assert.equal(await page.getByTestId('checkout-address-form').count(),0,'direct checkout explains the unavailable stock before requesting an address');
   await page.getByRole('link',{name:'Zum Warenkorb'}).click();await page.getByTestId('cart-view').waitFor();
   await page.getByTestId('cart-remove-a').focus();await page.keyboard.press('Enter');await page.getByTestId('cart-line-a').waitFor({state:'detached'});
   assert.equal(await page.getByTestId('cart-remove-b').isEnabled(),true,'remaining unknown item remains removable');
   await page.getByTestId('cart-remove-b').click();await page.getByTestId('cart-empty').waitFor();
   console.log(JSON.stringify({width,unknownStockExplained:true,checkoutBlocked:true,bothRemovable:true}));
  } finally {await context.close();}
 }
 for(const failureAt of ['quote','order']) {
  const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  let releaseCart;const cartGate=new Promise(resolve=>releaseCart=resolve);let orderCalls=0,quoteCalls=0;
  const line={product_id:'a',name:'Testartikel',sku:'a',ean:'',image:null,quantity:1,unit_cents:100,line_cents:100,stock:5,stock_status:'reported'};
  const cart={lines:[line],changes:[],subtotal_cents:100,shipping_cents:0,total_cents:100,vat_included_cents:0,vat_percent:'19',currency:'EUR',count:1,quote_hash:'fixture-quote'};
  try {
   await context.route('**/*',async route=>{const request=route.request(),u=new URL(request.url());
    if(u.origin!==origin)return route.abort();
    if(u.pathname==='/api/shop/cart'&&request.method()==='GET'){await cartGate;return route.fulfill({status:200,json:cart});}
    if(u.pathname==='/api/shop/checkout/validate-address')return route.fulfill({status:200,json:{}});
    if(u.pathname==='/api/shop/checkout/quote'){quoteCalls++;return failureAt==='quote'?route.fulfill({status:409,json:{detail:{error:'stock_unavailable',product_id:'a'}}}):route.fulfill({status:200,json:cart});}
    if(u.pathname==='/api/shop/orders'){orderCalls++;return route.fulfill({status:409,json:{detail:{error:'stock_unavailable',product_id:'a'}}});}
    if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'not_in_fixture'}});
    return route.continue();
   });
   const page=await context.newPage();await page.goto(origin+'/teileklar/kasse',{waitUntil:'domcontentloaded'});
   await page.getByTestId('checkout-cart-loading').waitFor();assert.equal(await page.getByTestId('checkout-address-form').count(),0,'form is absent until cart read resolves');
   releaseCart();await page.getByTestId('checkout-address-form').waitFor();
   await page.waitForFunction(()=>document.activeElement?.getAttribute('data-testid')==='checkout-step-title');
   for(const [key,value] of Object.entries({first_name:'Mia',last_name:'Muster',street:'Musterstrasse 1',zip:'41061',city:'Musterstadt',email:'mia@example.invalid'}))await page.getByTestId('checkout-address-'+key).fill(value);
   await page.getByTestId('checkout-address-continue').click();
   if(failureAt==='order'){
    await page.getByTestId('checkout-shipping-continue').click();await page.getByTestId('checkout-review').waitFor();
    await page.getByTestId('checkout-terms-checkbox').check();await page.getByTestId('checkout-place-order').click();
   }
   await page.getByTestId('checkout-stock-unavailable').waitFor();assert.equal(quoteCalls,1);assert.equal(orderCalls,failureAt==='order'?1:0);
   assert.equal(await page.getByTestId('checkout-address-form').count(),0);assert.equal(await page.getByTestId('checkout-place-order').count(),0);
   assert.equal(await page.getByRole('link',{name:'Zum Warenkorb'}).isVisible(),true);
   console.log(JSON.stringify({failureAt,delayedCartProtected:true,nested409Explained:true,orderCalls}));
  } finally {releaseCart();await context.close();}
 }
 const failedLoad=await browser.newContext({viewport:{width:390,height:900}});
 try {
  await failedLoad.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(u.pathname==='/api/shop/cart')return route.fulfill({status:503,json:{error:'unavailable'}});if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'not_in_fixture'}});return route.continue();});
  const page=await failedLoad.newPage();await page.goto(origin+'/teileklar/kasse');await page.getByTestId('checkout-error').waitFor();
  assert.match(await page.getByTestId('checkout-error').innerText(),/Warenkorb konnte nicht geladen/);assert.equal(await page.getByTestId('checkout-address-form').count(),0);
  console.log(JSON.stringify({cartReadFailure:true,checkoutFormBlocked:true}));
 } finally {await failedLoad.close();}
 for(const width of [390,1440]) {
  const unavailable=await browser.newContext({viewport:{width,height:900}});
  try {
   await unavailable.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(u.pathname==='/api/shop/cart')return route.fulfill({status:503,json:{detail:{error:'runtime_binding_unavailable',reason:'payment_mode_unbound'}}});if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:'not_in_fixture'}});return route.continue();});
   const page=await unavailable.newPage();
   for(const [path,id] of [['/teileklar/warenkorb','cart-service-unavailable'],['/teileklar/kasse','checkout-service-unavailable']]) {
    await page.goto(origin+path);const section=page.getByTestId(id);await section.waitFor();
    assert.equal(await section.getAttribute('role'),'alert');
    assert.match(await section.innerText(),/Warenkorb momentan nicht abrufen/);
    assert.equal(await section.getByRole('link',{name:'Zum Shop'}).isVisible(),true);
    assert.equal(await section.getByRole('link',{name:'Kontakt aufnehmen'}).isVisible(),true);
    const shopLink=section.getByRole('link',{name:'Zum Shop'}),contactLink=section.getByRole('link',{name:'Kontakt aufnehmen'});
    assert.equal(await shopLink.getAttribute('href'),'/teileklar/shop');assert.equal(await contactLink.getAttribute('href'),'/kontakt');
    await shopLink.focus();assert.equal(await shopLink.evaluate(element=>element===document.activeElement),true);
    await page.keyboard.press('Tab');assert.equal(await contactLink.evaluate(element=>element===document.activeElement),true,'contact remains keyboard reachable after shop link');
    assert.equal(await page.getByTestId('checkout-address-form').count(),0);
    assert.doesNotMatch(await section.innerText(),/runtime_binding_unavailable|payment_mode_unbound/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
   }
   console.log(JSON.stringify({width,runtimeUnavailableExplained:true,contactAndReturn:true}));
  } finally {await unavailable.close();}
 }
} finally {await browser.close();await server.close();}
