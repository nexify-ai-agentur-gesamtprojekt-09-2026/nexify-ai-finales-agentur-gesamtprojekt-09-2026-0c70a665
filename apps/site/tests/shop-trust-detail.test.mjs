// Offline render checks for the TEILEKLAR trust bar, product card/detail facts and checkout legal
// elements (concept docs/shop/onlineshop-konzept-2026-11-04.md 1.3, 3.3-3.9). Nothing is fetched.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const componentRoot=new URL('../../web/components/shop/',import.meta.url);
const copy=JSON.parse(readFileSync(new URL('../../../config/shop-interface-copy.json',import.meta.url),'utf8'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const jsx=(type,props)=>({type,props:props||{}});
const source=name=>readFileSync(new URL(name,componentRoot),'utf8');
function compile(name,modules,globals={}){
 const out=ts.transpileModule(source(name),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};
 vm.runInNewContext(out,{module:mod,exports:mod.exports,require(n){if(!(n in modules))throw new Error('Unmocked import '+n);return modules[n];},Intl,URL,Date,Number,Math,AbortController,...globals},{filename:name});
 return mod.exports;
}
// Hook state shared by every component of one deep render; the tree shape is stable between renders.
function hooks(){
 const state=[],effects=[];let cursor=0;
 const react={useId:()=>':id:',useRef:initial=>{const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i];},
  useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}];},
  useEffect(effect,deps){const i=cursor++,old=effects[i];if(!old||deps.some((x,k)=>x!==old.deps[k]))effects[i]={effect,deps,pending:true};}};
 return {react,reset(){cursor=0;},flush(){effects.forEach(e=>{if(e&&e.pending){e.pending=false;e.effect();}});}};
}
function deep(node){
 if(node==null||typeof node!=='object')return node;
 if(Array.isArray(node))return node.map(deep);
 if(typeof node.type==='function')return deep(node.type(node.props));
 return {type:node.type,props:{...node.props,children:deep(node.props?.children)}};
}
function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.props?.children);}
function nodes(node){if(node==null||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)];}
const byTestId=(tree,id)=>nodes(tree).find(n=>n.props?.['data-testid']===id);
const norm=s=>String(s).replace(/\s+/g,' ').trim();
const api=compile('api.ts',{},{Set});

function shopModules(h,locale='de',request=()=>Promise.reject(new Error('unexpected request'))){
 const card=compile('ProductCard.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../Router':{SiteLink:'link'},'../Workspace':{useUI:()=>({locale})},
  '../../../../config/shop-interface-copy.json':copy,'./api':api});
 const trust=compile('TrustBar.tsx',{'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'./ProductCard':card});
 const apiMock={...api,api:request,cartIntentKey:()=>'add:test',notifyCart:()=>{}};
 return {card,trust,apiMock};
}
const PRODUCT={id:'p1',name:'Produkt',sku:'S-1',ean:'4000000000001',image:null,stock:5,in_stock:true,price_cents:1190,price_status:'released',currency:'EUR'};

test('shop copy keeps an identical key and placeholder set for de, nl, fr and en',()=>{
 const locales=['de','nl','fr','en'];const keys=Object.keys(copy.de).sort();
 assert.deepEqual(Object.keys(copy).sort(),[...locales].sort());
 for(const l of locales){
  assert.deepEqual(Object.keys(copy[l]).sort(),keys,l);
  for(const k of keys){
   assert.equal(typeof copy[l][k],'string',l+'.'+k);
   const ph=v=>(v.match(/\{\w+\}/g)||[]).sort();assert.deepEqual(ph(copy[l][k]),ph(copy.de[k]),l+'.'+k);
  }
 }
});

test('trust bar shows only the five verifiable claims, never free shipping or free returns',()=>{
 const h=hooks();const {trust}=shopModules(h);
 const bar=deep(jsx(trust.default,{}));
 assert.deepEqual(nodes(bar).filter(n=>n.type==='li').map(n=>text(n)),['Endpreise inkl. MwSt.','14 Tage Widerrufsrecht','Sichere Zahlung über Revolut','Deutscher Ansprechpartner','Werkstattsuche für den Einbau']);
 for(const l of ['de','nl','fr','en'])for(const k of trust.TRUST_ITEMS)assert.doesNotMatch(copy[l][k],/kostenlos|versandkostenfrei|gratis|gratuit|free|retour gratuit|gratis retour/i,l+'.'+k);
 const line=deep(jsx(trust.default,{items:trust.TRUST_LINE,compact:true,testId:'x'}));assert.equal(nodes(line).filter(n=>n.type==='li').length,3);
 for(const name of ['ShopEntry.tsx','CartView.tsx','Checkout.tsx','ProductDetail.tsx','PublicShopContent.tsx'])assert.match(source(name),/TrustBar|TrustBox/,name);
});

test('product card renders eligibility, base price and delivery only from data',()=>{
 const h=hooks();const {card}=shopModules(h);
 const bare=deep(jsx(card.ProductCard,{product:PRODUCT}));
 for(const id of ['product-eligibility-p1','product-base-price-p1','product-delivery-p1','product-manufacturer-p1'])assert.equal(byTestId(bare,id),undefined,id);
 assert.equal(norm(text(byTestId(bare,'product-price-p1'))),norm('11,90 € '+copy.de.taxShipping));
 const rich=deep(jsx(card.ProductCard,{product:{...PRODUCT,manufacturer:'Hersteller GmbH',suitability:['universal','12 V'],net_content:500,unit:'ml',delivery_days_min:3,delivery_days_max:6}}));
 assert.deepEqual(nodes(byTestId(rich,'product-eligibility-p1')).filter(n=>n.type==='li').map(text),['Universell','12 V']);
 assert.equal(norm(text(byTestId(rich,'product-base-price-p1'))),'Grundpreis: 23,80 € / 1 l');
 assert.equal(text(byTestId(rich,'product-delivery-p1')),'Lieferzeit 3–6 Werktage');
 assert.equal(text(byTestId(rich,'product-manufacturer-p1')),'Hersteller GmbH');
 // No delivery promise for an article that is not in stock, and no base price without a released price.
 const out=deep(jsx(card.ProductCard,{product:{...PRODUCT,stock:0,price_cents:null,net_content:1,unit:'l',delivery_days_min:3,delivery_days_max:6}}));
 assert.equal(byTestId(out,'product-delivery-p1'),undefined);assert.equal(byTestId(out,'product-base-price-p1'),undefined);
});

test('base price and delivery window helpers refuse malformed data',()=>{
 assert.deepEqual({...api.basePrice(999,250,'g')},{cents:3996,unit:'kg'});
 assert.deepEqual({...api.basePrice(1500,1.5,'l')},{cents:1000,unit:'l'});
 for(const [p,c,u] of [[null,1,'l'],[100,0,'l'],[100,-1,'kg'],[100,NaN,'l'],[100,1,'stk'],[100,1,null],[1.5,1,'l']])assert.equal(api.basePrice(p,c,u),null,JSON.stringify([p,c,u]));
 assert.deepEqual({...api.deliveryWindow(2,2)},{min:2,max:2});
 for(const [a,b] of [[null,3],[3,null],[0,2],[5,3],[1.5,3]])assert.equal(api.deliveryWindow(a,b),null);
});

async function detail(product,locale='de'){
 const h=hooks();const {card,trust,apiMock}=shopModules(h,locale,()=>Promise.resolve(product));
 const mod=compile('ProductDetail.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../Router':{SiteLink:'link'},'./api':apiMock,'./ProductCard':card,'./TrustBar':trust});
 const render=()=>{h.reset();return deep(jsx(mod.default,{id:product.id}));};
 render();h.flush();await tick();return render();
}
const DETAIL={...PRODUCT,images:[],description:'<p>Text</p>',details:{weight:1.2,manufacturer:4711},fitment_status:'not_checked',source:'BigBuy',imported_at:'2026-11-04T00:00:00+00:00',bigbuy_id:1,vat_percent:'19'};

test('product detail follows the concept order and links shipping, workshop and withdrawal',async()=>{
 const tree=await detail(DETAIL);
 const order=['product-name','product-identifiers','product-price','stock-label','add-to-cart-button','product-trust','fitment-status','product-facts','product-safety','product-shipping-returns'];
 const seen=nodes(tree).map(n=>n.props?.['data-testid']).filter(Boolean);
 assert.deepEqual(order.map(id=>seen.indexOf(id)).every((v,i,a)=>v>=0&&(i===0||v>a[i-1])),true,seen.join(','));
 assert.equal(byTestId(tree,'product-shipping-info-link').props.href,'/teileklar/versand-und-zahlung');
 assert.equal(byTestId(tree,'fitment-workshop-link').props.href,'/teileklar/werkstatt');
 assert.equal(byTestId(tree,'product-withdrawal-link').props.href,'/teileklar/rechtliches#widerruf');
 // Missing data: neutral fallback, never "Universell", never a GPSR or disposal claim.
 assert.equal(byTestId(tree,'fitment-status').props['data-fitment'],'none');assert.match(text(byTestId(tree,'fitment-status')),new RegExp(copy.de.fitmentBody.slice(0,30)));
 assert.doesNotMatch(text(tree),/Universell/);
 for(const id of ['product-manufacturer','product-base-price','product-delivery','product-eligibility','product-disposal','product-scope-of-delivery','product-safety-notes'])assert.equal(byTestId(tree,id),undefined,id);
 assert.ok(byTestId(tree,'product-safety-manufacturer-missing'));assert.ok(byTestId(tree,'product-safety-notes-missing'));
 assert.doesNotMatch(text(tree),/4711/,'BigBuy manufacturer id is not shown as a manufacturer');
});

test('product detail renders GPSR, base price, delivery, contents and disposal when the data has them',async()=>{
 const tree=await detail({...DETAIL,manufacturer:'Muster AG, Musterstraße 1, 12345 Musterstadt',safety_notes:['Von Kindern fernhalten.'],net_content:2,unit:'kg',delivery_days_min:1,delivery_days_max:1,suitability:['12 V'],scope_of_delivery:['Gerät','Kabel'],disposal_class:'battery'});
 assert.match(norm(text(byTestId(tree,'product-identifiers'))),/Hersteller Muster AG/);
 assert.equal(norm(text(byTestId(tree,'product-base-price'))),'Grundpreis: 5,95 € / 1 kg');
 assert.equal(text(byTestId(tree,'product-delivery')),'Lieferzeit 1 Werktag');
 assert.equal(byTestId(tree,'fitment-status').props['data-fitment'],'data');assert.match(text(byTestId(tree,'fitment-values')),/12 V/);
 assert.deepEqual(nodes(byTestId(tree,'product-safety-notes')).filter(n=>n.type==='li').map(text),['Von Kindern fernhalten.']);
 assert.deepEqual(nodes(byTestId(tree,'product-scope-of-delivery')).filter(n=>n.type==='li').map(text),['Gerät','Kabel']);
 assert.match(text(byTestId(tree,'product-disposal')),/Batteriegesetz/);
 const weee=await detail({...DETAIL,disposal_class:'weee'});assert.match(text(byTestId(weee,'product-disposal')),/ElektroG/);
 const none=await detail({...DETAIL,disposal_class:'none',suitability:['Universal']});assert.equal(byTestId(none,'product-disposal'),undefined);
 assert.equal(byTestId(none,'fitment-status').props['data-fitment'],'universal');
 const en=await detail({...DETAIL},'en');assert.equal(text(nodes(en).find(n=>n.type==='h3'&&n.props.id==='pdp-safety')),'Safety & manufacturer');
});

test('checkout keeps the button solution, legal links and German legal wording',()=>{
 const src=source('Checkout.tsx');
 assert.match(src,/>Zahlungspflichtig bestellen</);
 for(const id of ['checkout-place-order','checkout-terms-checkbox','checkout-review','checkout-error','checkout-redirecting','review-shipping-note','checkout-withdrawal-hint','checkout-trust','checkout-payment-note'])assert.match(src,new RegExp('"'+id+'"'),id);
 for(const anchor of ['agb','widerruf','widerrufsformular'])assert.match(src,new RegExp('legalLink\\("'+anchor+'"'),anchor);
 const legal=source('TeileklarLegal.tsx');assert.match(legal,/id=\{key\}/);assert.match(legal,/"widerrufsformular"/);
 for(const l of ['de','nl','fr','en'])assert.ok(copy[l].checkoutHeadReview&&copy[l].paymentRedirectNote,l);
 assert.equal(copy.de.checkoutHeadAddress,'Wohin dürfen wir liefern?');assert.equal(copy.de.checkoutHeadReview,'Bitte prüfen Sie Ihre Bestellung');
 const h=hooks();const {card,trust}=shopModules(h);
 const checkout=compile('Checkout.tsx',{react:h.react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../Router':{SiteLink:'link'},'./api':api,'./AddressStep':{__esModule:true,default:'address',EMPTY_ADDRESS:{}},'./CartView':{Totals:'totals'},'./ProductCard':card,'./SellerInfo':{__esModule:true,default:'seller'},'./TrustBar':trust},{sessionStorage:{},crypto:{}});
 assert.deepEqual({...checkout.orderDelivery([{delivery_days_min:2,delivery_days_max:4},{delivery_days_min:3,delivery_days_max:6}])},{min:3,max:6});
 assert.equal(checkout.orderDelivery([{delivery_days_min:2,delivery_days_max:4},{}]),null,'no order-level window when one line has none');
 assert.equal(checkout.orderDelivery([]),null);
});

test('cart and confirmation copy follow the concept and claim no unbacked facts',()=>{
 assert.equal(copy.de.cartChanged,'Seit Ihrem letzten Besuch hat sich ein Preis oder die Verfügbarkeit geändert. Bitte prüfen Sie die markierten Artikel.');
 assert.equal(copy.de.orderThanks,'Vielen Dank – Ihre Bestellung ist eingegangen.');
 assert.equal(copy.de.catalogError,'Der Katalog ist gerade nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.');
 assert.match(copy.de.catalogUnconfigured,/Werkstatt/);assert.notEqual(copy.de.catalogUnconfigured,copy.de.catalogError);
 for(const l of ['de','nl','fr','en'])for(const [k,v] of Object.entries(copy[l]))assert.doesNotMatch(v,/Reaktionszeit|innerhalb von \d+ Stunden|kostenlos(er)? Versand|Trusted Shops|Bewertung/i,l+'.'+k);
 const confirmation=source('OrderConfirmation.tsx');assert.match(confirmation,/paid && <section className="tk-side-path"/);assert.match(confirmation,/data-testid="order-paid-title"/);
});
