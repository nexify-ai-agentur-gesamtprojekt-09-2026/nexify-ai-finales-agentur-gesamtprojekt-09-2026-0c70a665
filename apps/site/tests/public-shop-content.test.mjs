import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const componentRoot=new URL('../../web/components/shop/',import.meta.url);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const jsx=(type,props)=>({type,props:props||{}});
const shopCopy=JSON.parse(readFileSync(new URL('../../../config/shop-interface-copy.json',import.meta.url),'utf8'));
const useShopCopy=()=>({t:(key,values={})=>shopCopy.de[key].replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??'')),number:value=>new Intl.NumberFormat('de').format(value),money:value=>new Intl.NumberFormat('de',{style:'currency',currency:'EUR'}).format(value/100),date:value=>new Intl.DateTimeFormat('de').format(new Date(value))});
// The real failure classifier from api.ts (no imports), so tests bind to the shipped mapping.
const apiModule=(()=>{const compiled=ts.transpileModule(readFileSync(new URL('api.ts',componentRoot),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,Intl,Set});return mod.exports;})();
function harness(filename,api=()=>Promise.reject(new Error('Unexpected API call'))){
 const state=[],effects=[],cleanups=[];let cursor=0,rendered;
 const react={useId:()=>':test-id:',useState(initial){const index=cursor++;if(!(index in state))state[index]=initial;return [state[index],value=>{state[index]=typeof value==='function'?value(state[index]):value;}];},useEffect(effect,deps){const index=cursor++,old=effects[index];if(!old||deps.some((x,i)=>x!==old.deps[i]))effects[index]={effect,deps,pending:true};}};
 const mocks={react,'react/jsx-runtime':{jsx,jsxs:jsx,Fragment:'fragment'},'../Router':{SiteLink:'link',useSiteNavigate:()=>()=>{}},'./api':{api,CART_EVENT:'teileklar-cart-changed',catalogFailure:apiModule.catalogFailure},'./ProductCard':{ProductCard:'product-card',useShopCopy},'./CatalogView':{__esModule:true,default:'catalog',SearchBar:'search'},'./CategoryList':{__esModule:true,default:'categories'},'./ProductDetail':{__esModule:true,default:'product-detail'},'./CartView':{__esModule:true,default:'cart-view'},'./Checkout':{__esModule:true,default:'checkout'},'./WorkshopFinder':{__esModule:true,default:'workshop-finder'},'./WorkshopDetail':{__esModule:true,default:'workshop-detail'},'./shop.css':{}};
 const source=readFileSync(new URL(filename,componentRoot),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const mod={exports:{}};vm.runInNewContext(compiled,{module:mod,exports:mod.exports,require(name){if(!(name in mocks))throw new Error('Unmocked import '+name);return mocks[name];},AbortController,URLSearchParams,console},{filename});
 return {exports:mod.exports,render(props={}){cursor=0;rendered=mod.exports.default(props);return rendered;},flush(){effects.forEach((e,i)=>{if(e.pending){cleanups[i]?.();e.pending=false;cleanups[i]=e.effect();}});},unmount(){cleanups.forEach(cleanup=>cleanup?.());},source};
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function text(node){if(node==null||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.props?.children);}
function children(node){return [node,...(Array.isArray(node?.props?.children)?node.props.children:[node?.props?.children]).filter(x=>x&&typeof x==='object').flatMap(children)];}
const catalog=(name)=>({items:[{id:name}],total:1,page:1,pages:1});

test('public shop route projection preserves catalogue, checkout and workshop journeys',()=>{
 const {exports:{publicShopRoute:route}}=harness('PublicShopContent.tsx');
 assert.equal(route('tk-search','/teileklar/suche','?q=Bremsen&seite=2').q,'Bremsen');
 assert.equal(route('tk-search','/teileklar/suche','?seite=2').page,2);
 assert.equal(route('tk-category','/teileklar/kategorie/42','?seite=3').category,42);
 for(const path of ['/teileklar/kategorie','/teileklar/kategorie/NaN','/teileklar/kategorie/0','/teileklar/kategorie/9007199254740992'])assert.equal(route('tk-category',path,'').kind,'categories');
 for(const value of ['-1','NaN','1.5','9007199254740992'])assert.equal(route('tk-search','/teileklar/suche','?seite='+value).page,1);
 assert.equal(route('tk-product','/teileklar/produkt/abc123','').id,'abc123');
 assert.equal(route('tk-product','/teileklar/produkt','').kind,'product-search');
 assert.equal(route('tk-cart','/teileklar/warenkorb','').kind,'cart');
 assert.equal(route('tk-checkout','/teileklar/kasse','').kind,'checkout');
 const workshops=route('tk-workshop','/teileklar/werkstatt','?q=50667&umkreis=50');assert.equal(workshops.kind,'workshops');assert.equal(workshops.q,'50667');assert.equal(workshops.radius,50);
 const workshop=route('tk-workshop','/teileklar/werkstatt/ws_42','');assert.equal(workshop.kind,'workshop-detail');assert.equal(workshop.id,'ws_42');
});
test('public renderer uses real catalogue, transactional and workshop components',()=>{
 const h=harness('PublicShopContent.tsx');
 const shop=children(h.render({pageId:'tk-shop',pathname:'/teileklar/shop',search:''}));
 assert.ok(shop.some(n=>n.type==='catalog'));assert.ok(shop.some(n=>n.type==='categories'));assert.ok(shop.some(n=>n.type==='search'));
 const detail=children(h.render({pageId:'tk-product',pathname:'/teileklar/produkt/abc',search:''})).find(n=>n.type==='product-detail');assert.equal(detail.props.readOnly,undefined);
 assert.ok(children(h.render({pageId:'tk-cart',pathname:'/teileklar/warenkorb',search:''})).some(n=>n.type==='cart-view'));
 assert.ok(children(h.render({pageId:'tk-checkout',pathname:'/teileklar/kasse',search:''})).some(n=>n.type==='checkout'));
 assert.ok(children(h.render({pageId:'tk-workshop',pathname:'/teileklar/werkstatt',search:'?q=Köln'})).some(n=>n.type==='workshop-finder'));
 assert.match(text(h.render({pageId:'tk-product',pathname:'/teileklar/produkt',search:''})),/Artikelsuche/);
});
test('catalogue ignores old responses and aborts requests on query change/unmount',async()=>{
 const calls=[];const h=harness('CatalogView.tsx',(url,init)=>{const d=deferred();calls.push({url,init,...d});return d.promise;});
 h.render({q:'alt',base:'/teileklar/suche'});h.flush();
 h.render({q:'neu',base:'/teileklar/suche'});h.flush();assert.equal(calls[0].init.signal.aborted,true);
 calls[1].resolve(catalog('new'));await tick();calls[0].resolve(catalog('old'));await tick();
 const tree=h.render({q:'neu',base:'/teileklar/suche'});assert.equal(children(tree).find(n=>n.type==='product-card').props.product.id,'new');
 h.unmount();assert.equal(calls[1].init.signal.aborted,true);
});
test('503 is an error, successful empty catalogue makes no progress claim',async()=>{
 const h=harness('CatalogView.tsx',()=>Promise.reject({status:503,error:'db_unavailable'}));h.render({base:'/teileklar/shop'});h.flush();await tick();const error=h.render({base:'/teileklar/shop'});assert.equal(error.props.role,'alert');assert.equal(error.props['data-testid'],'catalog-error');assert.doesNotMatch(text(error),/Keine Artikel/);
 const e=harness('CatalogView.tsx',()=>Promise.resolve({items:[],total:0,page:1,pages:0}));e.render({base:'/teileklar/shop'});e.flush();await tick();assert.equal(e.render({base:'/teileklar/shop'}).props['data-testid'],'catalog-empty');assert.doesNotMatch(text(e.render({base:'/teileklar/shop'})),/aufgebaut|bald|bestellen/i);
});
test('setup missing and connection failure stay distinct for catalogue and categories',async()=>{
 const cases=[[{status:503,error:'runtime_binding_unavailable',body:{reason:'database_binding_missing_or_unsuitable'}},'catalog-unconfigured'],
  [{status:503,error:'catalog_not_configured'},'catalog-unconfigured'],
  [{status:503,error:'runtime_binding_unavailable',body:{reason:'database_metadata_unavailable'}},'catalog-error'],
  [{status:503,error:'runtime_binding_unavailable',body:{reason:'unknown_future_reason'}},'catalog-error'],
  [{status:500,error:'invalid_json_response'},'catalog-error'],[new TypeError('Failed to fetch'),'catalog-error']];
 for(const [failure,testid] of cases){const h=harness('CatalogView.tsx',()=>Promise.reject(failure));h.render({base:'/teileklar/shop'});h.flush();await tick();const node=h.render({base:'/teileklar/shop'});
  assert.equal(node.props['data-testid'],testid,JSON.stringify(failure));assert.equal(node.props.role,testid==='catalog-error'?'alert':'status');
  assert.equal(text(node),shopCopy.de[testid==='catalog-error'?'catalogError':'catalogUnconfigured']);}
 const setup={status:503,error:'runtime_binding_unavailable',body:{reason:'namespace_schema_unbound'}};
 const full=harness('CategoryList.tsx',()=>Promise.reject(setup));full.render();full.flush();await tick();assert.equal(full.render().props['data-testid'],'categories-unconfigured');
 const compact=harness('CategoryList.tsx',()=>Promise.reject(setup));compact.render({compact:true});compact.flush();await tick();assert.equal(compact.render({compact:true}),null);
 const down=harness('CategoryList.tsx',()=>Promise.reject(new TypeError('Failed to fetch')));down.render({compact:true});down.flush();await tick();assert.equal(down.render({compact:true}).props['data-testid'],'categories-error');
});
test('category errors are distinct from empty data and unmount aborts stale loads',async()=>{
 const d=deferred();let signal;const h=harness('CategoryList.tsx',(_url,init)=>{signal=init.signal;return d.promise;});h.render();h.flush();h.unmount();assert.equal(signal.aborted,true);d.resolve({categories:[{id:1,name:'late',count:1}]});await tick();assert.match(text(h.render()),/geladen/);
 const e=harness('CategoryList.tsx',()=>Promise.reject({status:503}));e.render();e.flush();await tick();assert.equal(e.render().props.role,'alert');
 const empty=harness('CategoryList.tsx',()=>Promise.resolve({categories:[]}));empty.render();empty.flush();await tick();assert.equal(empty.render().props['data-testid'],'categories-empty');assert.doesNotMatch(text(empty.render()),/aufgebaut|bald/);
});
test('shop entry offers discovery without a purchase promise',()=>{
 const source=readFileSync(new URL('ShopEntry.tsx',componentRoot),'utf8');assert.match(source,/t\("entryTitle"\)/);assert.match(shopCopy.de.entryTitle,/Teile und Zubehör finden/);assert.doesNotMatch(shopCopy.de.entryTitle,/finden und bestellen/);
});
