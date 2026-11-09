// MOCK of the TEILEKLAR shop API (apps/shop-api, FastAPI + MongoDB). In-process, in-memory, synthetic data only.
// It reproduces the wire contract of catalog_api.py, cart_api.py and checkout_api.py (paths, status codes, JSON
// shapes, the tk_guest cookie, Idempotency-Key replay, quote_hash), NOT the server code. Evidence produced with it
// proves the browser frontend against this contract; it is never production data and never a server proof.
import {createHash,randomBytes} from 'node:crypto';

export const MOCK_LABEL='mit gemockter Antwort: synthetic in-memory shop API; contract copied from apps/shop-api, server code not executed';
const FREE_SHIPPING_CENTS=7500,FLAT_RATE_CENTS=995,VAT_PERCENT='19',MAX_QTY=20,GUEST_COOKIE='tk_guest',PAGE_SIZE=24;
const COUNTRIES={DE:/^\d{5}$/,AT:/^\d{4}$/,NL:/^\d{4} ?[A-Za-z]{2}$/,BE:/^\d{4}$/,LU:/^(L-)?\d{4}$/};
const EMAIL=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function dataset(){
 const products=[
  {id:'mock-0001',name:'Mock-Motoröl 5W-30 1 L',sku:'MOCK-OIL-5W30',ean:'4000000000011',stock:12,price:1599,category:101,images:['https://cdnbigbuy.com/images/mock/oil-1.jpg'],description:'<p>Synthetischer Mock-Datensatz, kein echter Artikel.</p>',details:{weight:1.1,height:20,condition:'Neu'}},
  {id:'mock-0002',name:'Mock-Scheibenwischer 55 cm',sku:'MOCK-WIPER-55',ean:'4000000000028',stock:0,price:899,category:102,images:[]},
  {id:'mock-0003',name:'Mock-Artikel ohne freigegebenen Preis',sku:'MOCK-NOPRICE',ean:'4000000000035',stock:4,price:null,category:102,images:[]},
  {id:'mock-0004',name:'Mock-Artikel Lagerbestand unbekannt',sku:'MOCK-NOSTOCK',ean:'4000000000042',stock:null,price:999,category:102,images:[]},
  {id:'mock-0005',name:'Mock-Artikel mit unsicherer Bildquelle',sku:'MOCK-BADIMG',ean:'4000000000059',stock:6,price:1250,category:101,images:['https://evil.example/pic.png']},
  {id:'mock-0006',name:'Mock-Ladegerät (über Versandgrenze)',sku:'MOCK-CHARGER',ean:'4000000000066',stock:3,price:8200,category:102,images:[]},
 ];
 for(let i=1;i<=30;i+=1)products.push({id:'mock-f'+String(i).padStart(2,'0'),name:'Mock-Zubehör '+String(i).padStart(2,'0'),sku:'MOCK-ACC-'+String(i).padStart(2,'0'),ean:'',stock:5,price:500+i*10,category:101,images:[]});
 return products;
}

export function createShopMock(){
 const state={
  products:dataset(),
  carts:new Map(),orders:new Map(),
  // failure injection, set by the test: null | '503' | 'html' | 'drop' (response lost after the effect was committed)
  fail:{catalog:null,categories:null,cartItems:null,quote:null,orders:null,validate:null},
  orderMode:'ok',// ok | provider_down | bad_url
  priceChange:null,// {product_id,new} -> next cart/quote read reports a price change once
  log:[],
 };
 const categories=[{id:100,name:'Auto & Motorrad (Mock)',root:true},{id:101,name:'Öle und Pflege (Mock)',root:false},{id:102,name:'Elektrik und Zubehör (Mock)',root:false}];
 const send=(res,status,body,headers={})=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(body));};
 const error=(res,status,detail)=>send(res,status,{detail});
 const present=(p)=>({id:p.id,sku:p.sku,ean:p.ean,name:p.name,image:p.images[0]||null,image_status:p.images.length?'supplier_original':'unavailable',stock:p.stock,in_stock:p.stock===null?null:p.stock>0,stock_status:p.stock===null?'unknown':'reported',price_cents:p.price,price_status:p.price===null?'not_released':'released',currency:'EUR',vat_included:true,vat_percent:VAT_PERCENT,category_id:p.category,imported_at:'2026-11-01T08:00:00+00:00',source_partial:true});
 const vat=(gross)=>Math.round(gross*Number(VAT_PERCENT)/(100+Number(VAT_PERCENT)));
 const readBody=(req)=>new Promise(resolve=>{let text='';req.on('data',c=>{text+=c;});req.on('end',()=>{try{resolve(text?JSON.parse(text):{});}catch{resolve(null);}});});
 const cookie=(req)=>{const m=/(?:^|;\s*)tk_guest=([A-Za-z0-9_-]{32,64})/.exec(req.headers.cookie||'');return m?m[1]:null;};
 const unitPrice=(p)=>state.priceChange&&state.priceChange.product_id===p.id?state.priceChange.new:p.price;
 function priced(owner,address){
  const cart=state.carts.get(owner)||{items:[]},lines=[],changes=[];
  for(const item of cart.items){
   const p=state.products.find(x=>x.id===item.product_id);
   if(!p){changes.push({product_id:item.product_id,kind:'unavailable',name:item.name});continue;}
   const unit=unitPrice(p);
   if(item.price_seen_cents!==undefined&&item.price_seen_cents!==unit)changes.push({product_id:p.id,kind:'price',name:p.name,old:item.price_seen_cents,new:unit});
   if((p.stock??0)<item.quantity)changes.push({product_id:p.id,kind:'stock',name:p.name,old:item.quantity,new:p.stock??0});
   lines.push({product_id:p.id,name:p.name,sku:p.sku,ean:p.ean,image:p.images[0]||null,quantity:item.quantity,unit_cents:unit,line_cents:unit*item.quantity,stock:p.stock??0});
  }
  const subtotal=lines.reduce((sum,l)=>sum+l.line_cents,0);let shipping=0,pending=false,source=!lines.length||subtotal>=FREE_SHIPPING_CENTS?'free':'pending';
  if(lines.length&&subtotal<FREE_SHIPPING_CENTS){if(address&&address.country&&address.zip){shipping=FLAT_RATE_CENTS;source='configured_flat_rate';}else pending=true;}
  const total=subtotal+shipping;
  return {lines,changes,subtotal_cents:subtotal,shipping_cents:shipping,total_cents:total,vat_included_cents:vat(total),vat_percent:VAT_PERCENT,currency:'EUR',count:lines.reduce((s,l)=>s+l.quantity,0),shipping_pending:pending,shipping_source:source,free_shipping_threshold_cents:FREE_SHIPPING_CENTS};
 }
 const quoteHash=(q)=>createHash('sha256').update(JSON.stringify([q.lines.map(l=>[l.product_id,l.quantity,l.unit_cents]),q.shipping_cents,q.total_cents])).digest('hex');
 function addressErrors(a){
  const errors={};
  for(const f of ['first_name','last_name','street','zip','city','email'])if(!String(a?.[f]??'').trim())errors[f]='required';
  if(!COUNTRIES[a?.country])errors.country='unsupported';
  else if(String(a.zip||'').trim()&&!COUNTRIES[a.country].test(String(a.zip).trim()))errors.zip='invalid';
  if(String(a?.email||'').trim()&&!EMAIL.test(String(a.email).trim()))errors.email='invalid';
  return errors;
 }
 function maybeFail(kind,req,res,committed){
  const mode=state.fail[kind];
  if(!mode)return false;
  if(mode==='503'){error(res,503,{error:'storage_unavailable'});return true;}
  if(mode==='html'){res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>SPA fallback</title>');return true;}
  if(mode==='drop'){req.socket.destroy();return true;}
  return false;
 }
 async function handler(req,res,next){
  const url=new URL(req.url,'http://mock.invalid');
  if(!url.pathname.startsWith('/api/shop/'))return next();
  const path=url.pathname.replace(/\/$/,''),entry={method:req.method,path,status:0};
  if(req.headers['idempotency-key'])entry.idempotency_key=String(req.headers['idempotency-key']);
  state.log.push(entry);
  res.on('finish',()=>{entry.status=res.statusCode;});res.on('close',()=>{if(!res.writableFinished)entry.aborted=true;});
  const guest=cookie(req),owner=guest?'guest:'+guest:null;
  try{
   if(req.method==='GET'&&path==='/api/shop/categories'){
    if(maybeFail('categories',req,res))return;
    const counts=new Map();for(const p of state.products)counts.set(p.category,(counts.get(p.category)||0)+1);
    return send(res,200,{categories:[...categories.map(c=>({...c,count:c.root?state.products.length:counts.get(c.id)||0})).filter(c=>c.count>0)].sort((a,b)=>Number(b.root)-Number(a.root)||a.name.localeCompare(b.name,'de'))});
   }
   if(req.method==='GET'&&path==='/api/shop/products'){
    if(maybeFail('catalog',req,res))return;
    const q=(url.searchParams.get('q')||'').trim(),category=url.searchParams.get('category'),page=Math.max(1,Number(url.searchParams.get('page')||1)),size=Math.min(60,Math.max(1,Number(url.searchParams.get('page_size')||PAGE_SIZE))),sort=url.searchParams.get('sort')||'availability',inStock=url.searchParams.get('in_stock')==='true';
    let rows=state.products.filter(p=>(!inStock||(p.stock??0)>0)&&(!q||new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i').test(p.name)||p.sku.toLowerCase().startsWith(q.toLowerCase())||p.ean===q)&&(category===null||category===''||p.category===Number(category)));
    const byName=(a,b)=>a.name.localeCompare(b.name,'de');
    rows=[...rows].sort(sort==='price_asc'?(a,b)=>(a.price??0)-(b.price??0)||byName(a,b):sort==='price_desc'?(a,b)=>(b.price??0)-(a.price??0)||byName(a,b):sort==='name'?byName:(a,b)=>(b.stock??-1)-(a.stock??-1)||byName(a,b));
    const total=rows.length;
    return send(res,200,{items:rows.slice((page-1)*size,page*size).map(present),total,page,page_size:size,pages:Math.max(1,Math.ceil(total/size)),q,category:category===null?null:Number(category)});
   }
   const detail=/^\/api\/shop\/products\/([^/]+)$/.exec(path);
   if(req.method==='GET'&&detail){
    const p=state.products.find(x=>x.id===decodeURIComponent(detail[1]));
    if(!p)return error(res,404,{error:'product_not_found'});
    const c=categories.find(x=>x.id===p.category);
    return send(res,200,{...present(p),images:p.images,description:p.description||'',details:p.details||{},fitment_status:'not_checked',source:'BigBuy',bigbuy_id:1,category_name:c.name});
   }
   if(req.method==='GET'&&path==='/api/shop/cart'){
    if(!owner)return send(res,200,{lines:[],changes:[],subtotal_cents:0,shipping_cents:0,total_cents:0,vat_included_cents:0,currency:'EUR',count:0});
    return send(res,200,priced(owner));
   }
   if(req.method==='POST'&&path==='/api/shop/cart/items'){
    if(maybeFail('cartItems',req,res)){return;}
    const body=await readBody(req);
    if(!body||typeof body.product_id!=='string'||!Number.isInteger(body.quantity)||body.quantity<0||body.quantity>MAX_QTY)return error(res,422,[{type:'validation_error'}]);
    const headers={};let id=owner;
    if(!id){const g=randomBytes(32).toString('base64url');id='guest:'+g;headers['set-cookie']=`${GUEST_COOKIE}=${g}; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`;}
    const cart=state.carts.get(id)||{items:[]};let items=cart.items.filter(i=>i.product_id!==body.product_id);
    if(body.quantity>0){
     const p=state.products.find(x=>x.id===body.product_id);
     if(!p)return error(res,404,{error:'product_not_found'});
     if((p.stock??0)<body.quantity)return error(res,409,{error:'insufficient_stock',stock:p.stock??0});
     if(p.price===null)return error(res,409,{error:'price_not_released',message:'Preis noch nicht freigegeben'});
     items.push({product_id:p.id,name:p.name,quantity:body.quantity,price_seen_cents:p.price});
    }
    state.carts.set(id,{items});
    if(state.fail.cartItems==='drop-after'){req.socket.destroy();return;}
    return send(res,200,priced(id),headers);
   }
   if(req.method==='POST'&&path==='/api/shop/cart/confirm-changes'){
    if(!owner)return error(res,404,{error:'cart_not_found'});
    const current=priced(owner);const items=current.lines.map(l=>({product_id:l.product_id,name:l.name,quantity:Math.min(l.quantity,l.stock),price_seen_cents:l.unit_cents})).filter(i=>i.quantity>0);
    state.carts.set(owner,{items});
    return send(res,200,priced(owner));
   }
   if(req.method==='POST'&&path==='/api/shop/checkout/validate-address'){
    if(maybeFail('validate',req,res))return;
    const body=await readBody(req),errors=addressErrors(body);
    return Object.keys(errors).length?error(res,422,{error:'address_invalid',fields:errors}):send(res,200,{ok:true});
   }
   if(req.method==='POST'&&path==='/api/shop/checkout/quote'){
    if(maybeFail('quote',req,res))return;
    const body=await readBody(req),errors=body?.address?addressErrors(body.address):{};
    if(Object.keys(errors).length)return error(res,422,{error:'address_invalid',fields:errors});
    const quote=priced(owner||'none',body?.address||null);
    if(!quote.lines.length)return error(res,409,{error:'cart_empty'});
    return send(res,200,{...quote,quote_hash:quoteHash(quote)});
   }
   if(req.method==='POST'&&path==='/api/shop/orders'){
    if(maybeFail('orders',req,res))return;
    const key=req.headers['idempotency-key'];
    if(typeof key!=='string'||key.length<16||key.length>80)return error(res,422,[{type:'missing',loc:['header','idempotency-key']}]);
    if(!owner)return error(res,409,{error:'cart_empty'});
    const body=await readBody(req),bodyHash=createHash('sha256').update(JSON.stringify(body)).digest('hex'),existing=state.orders.get(owner+'|'+key);
    const reply=(order)=>{
     if(state.orderMode==='provider_down'&&!order.checkout_url){return error(res,502,{error:'payment_provider_unavailable',order_id:order.id});}
     order.checkout_url=order.checkout_url||(state.orderMode==='bad_url'?'https://pay.evil.example/'+order.id:'https://checkout.revolut.com/payment-link/mock-'+order.id);
     return send(res,200,{order_id:order.id,number:order.number,checkout_url:order.checkout_url});
    };
    if(existing){if(existing.bodyHash!==bodyHash)return error(res,409,{error:'idempotency_conflict'});return reply(existing);}
    const errors=addressErrors(body?.address);
    if(Object.keys(errors).length)return error(res,422,{error:'address_invalid',fields:errors});
    if(!body.accept_terms)return error(res,422,{error:'terms_not_accepted'});
    if(body.shipping_method!=='standard')return error(res,422,{error:'shipping_method_invalid'});
    const quote=priced(owner,body.address);
    if(!quote.lines.length)return error(res,409,{error:'cart_empty'});
    if(quote.changes.length||quoteHash(quote)!==body.quote_hash)return error(res,409,{error:'changes_pending',quote:{...quote,quote_hash:quoteHash(quote)}});
    const id='order-'+(state.orders.size+1),order={id,number:'TK-MOCK-'+String(state.orders.size+1).padStart(4,'0'),bodyHash,total_cents:quote.total_cents,lines:quote.lines,address:body.address,key,checkout_url:null};
    state.orders.set(owner+'|'+key,order);
    return reply(order);
   }
   return error(res,404,{error:'mock_has_no_such_endpoint'});
  }catch(failure){if(!res.headersSent)error(res,500,{error:'mock_failure',message:String(failure&&failure.message||failure)});}
 }
 return {state,handler,label:MOCK_LABEL};
}
