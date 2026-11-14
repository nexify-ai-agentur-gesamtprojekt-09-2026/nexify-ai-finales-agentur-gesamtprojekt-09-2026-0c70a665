import test from 'node:test';
import assert from 'node:assert/strict';
import {handleMcpRequest,resetRateLimit,MCP_TOOL_NAMES,RATE_LIMIT_PER_MINUTE} from '../../lib/mcp-server.ts';

// Nur Dummywerte, kein Netz: die Shop-API ist ein Fake-Fetch.
const TOKEN='dummy-token-for-tests-0123456789';
const env=(extra={})=>({NEXIFY_MCP:'1',MCP_ACCESS_TOKEN:TOKEN,SHOP_API_BASE_URL:'https://shop.invalid',...extra});
const modernMeta={'io.modelcontextprotocol/protocolVersion':'2026-07-28'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const make=(body,{headers={},method='POST',raw}={})=>new Request('https://mcp.test/mcp',{method,headers:{'content-type':'application/json',authorization:'Bearer '+TOKEN,...headers},body:method==='GET'?undefined:(raw??JSON.stringify(body))});
const rpc=(method,params,id=1)=>({jsonrpc:'2.0',id,method,params});
const modernHeaders=(method,name)=>({'mcp-protocol-version':'2026-07-28','mcp-method':method,...(name?{'mcp-name':name}:{})});
const noFetch=async()=>{throw new Error('kein Netzaufruf erwartet');};
test.beforeEach(()=>resetRateLimit());

test('Schalter aus -> 503, auch ohne Token',async()=>{
  const r=await handleMcpRequest(make(rpc('tools/list')),{env:{MCP_ACCESS_TOKEN:TOKEN},fetch:noFetch});
  assert.equal(r.status,503);
  const r2=await handleMcpRequest(make(rpc('tools/list'),{headers:{authorization:''}}),{env:{NEXIFY_MCP:'0',MCP_ACCESS_TOKEN:TOKEN},fetch:noFetch});
  assert.equal(r2.status,503);
});
test('Schalter an, aber Token fehlt oder zu kurz -> 503',async()=>{
  assert.equal((await handleMcpRequest(make(rpc('ping')),{env:{NEXIFY_MCP:'1'},fetch:noFetch})).status,503);
  assert.equal((await handleMcpRequest(make(rpc('ping')),{env:{NEXIFY_MCP:'1',MCP_ACCESS_TOKEN:'kurz'},fetch:noFetch})).status,503);
});
test('falscher oder fehlender Token -> 401',async()=>{
  for(const headers of [{authorization:'Bearer falsch-falsch-falsch-falsch-0000'},{authorization:''},{authorization:'Basic abc'},{authorization:'',['x-nexify-mcp-key']:'nein'}]){
    const r=await handleMcpRequest(make(rpc('tools/list'),{headers}),{env:env(),fetch:noFetch});
    assert.equal(r.status,401);
    assert.match(r.headers.get('www-authenticate'),/Bearer/);
  }
});
test('Kopf X-Nexify-MCP-Key funktioniert wie Bearer',async()=>{
  const r=await handleMcpRequest(make(rpc('ping'),{headers:{authorization:'','x-nexify-mcp-key':TOKEN}}),{env:env(),fetch:noFetch});
  assert.equal(r.status,200);
});
test('falsche Methode -> 405, kein GET-Strom',async()=>{
  const r=await handleMcpRequest(make(null,{method:'GET'}),{env:env(),fetch:noFetch});
  assert.equal(r.status,405);
  assert.equal(r.headers.get('allow'),'POST');
  assert.equal((await handleMcpRequest(make(null,{method:'DELETE'}),{env:env(),fetch:noFetch})).status,405);
});
test('Origin-Kopf ohne Erlaubnis -> 403',async()=>{
  const r=await handleMcpRequest(make(rpc('ping'),{headers:{origin:'https://boese.example'}}),{env:env(),fetch:noFetch});
  assert.equal(r.status,403);
  const ok=await handleMcpRequest(make(rpc('ping'),{headers:{origin:'https://gut.example'}}),{env:env({MCP_ALLOWED_ORIGINS:'https://gut.example'}),fetch:noFetch});
  assert.equal(ok.status,200);
});
test('ungueltige Nachrichten',async()=>{
  const e={env:env(),fetch:noFetch};
  assert.equal((await handleMcpRequest(make(null,{raw:'{kaputt'}),e)).status,400);
  assert.equal((await handleMcpRequest(make([rpc('ping')]),e)).status,400);
  assert.equal((await handleMcpRequest(make({jsonrpc:'1.0',id:1,method:'ping'}),e)).status,400);
  assert.equal((await handleMcpRequest(make({jsonrpc:'2.0',id:{},method:'ping'}),e)).status,400);
  assert.equal((await handleMcpRequest(make(null,{raw:'x'.repeat(40000)}),e)).status,413);
  assert.equal((await handleMcpRequest(make(rpc('ping'),{headers:{'content-type':'text/plain'}}),e)).status,415);
});
test('unbekannte Methode -> JSON-RPC-Fehler -32601; Notification -> 202',async()=>{
  const r=await handleMcpRequest(make(rpc('resources/list')),{env:env(),fetch:noFetch});
  assert.equal((await r.json()).error.code,-32601);
  const n=await handleMcpRequest(make({jsonrpc:'2.0',method:'notifications/initialized'}),{env:env(),fetch:noFetch});
  assert.equal(n.status,202);
});
test('initialize (alt) ohne Sitzungskennung, tools/list liefert drei lesende Werkzeuge',async()=>{
  const init=await handleMcpRequest(make(rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'t',version:'1'}}),{headers:{'mcp-protocol-version':'2025-06-18'}}),{env:env(),fetch:noFetch});
  const initBody=await init.json();
  assert.equal(initBody.result.protocolVersion,'2025-06-18');
  assert.equal(init.headers.get('mcp-session-id'),null);
  const list=await handleMcpRequest(make(rpc('tools/list')),{env:env(),fetch:noFetch});
  const tools=(await list.json()).result.tools;
  assert.deepEqual(tools.map(t=>t.name).sort(),['nexify_katalog_suche','nexify_status','nexify_werkstatt_suche']);
  assert.deepEqual(MCP_TOOL_NAMES.slice().sort(),tools.map(t=>t.name).sort());
  for(const t of tools){assert.equal(t.annotations.readOnlyHint,true);assert.equal(t.annotations.destructiveHint,false);assert.equal(t.inputSchema.type,'object');assert.equal(t.inputSchema.additionalProperties,false);}
});
test('keine Schreib-/Admin-Werkzeuge erreichbar',async()=>{
  for(const name of ['shop_bestellung_anlegen','warenkorb_schreiben','admin_import','zahlung_starten','nexify_katalog_suche/../x']){
    const r=await handleMcpRequest(make(rpc('tools/call',{name,arguments:{}})),{env:env(),fetch:noFetch});
    assert.equal((await r.json()).error.code,-32602);
  }
});
test('modern 2026-07-28: server/discover, Kopfpruefung, unbekannte Version',async()=>{
  const d=await handleMcpRequest(make(rpc('server/discover',{_meta:modernMeta}),{headers:modernHeaders('server/discover')}),{env:env(),fetch:noFetch});
  const body=await d.json();
  assert.deepEqual(body.result.supportedVersions.includes('2026-07-28'),true);
  const mismatch=await handleMcpRequest(make(rpc('tools/list',{_meta:modernMeta}),{headers:modernHeaders('ping')}),{env:env(),fetch:noFetch});
  assert.equal(mismatch.status,400);assert.equal((await mismatch.json()).error.code,-32020);
  const noName=await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:{},_meta:modernMeta}),{headers:modernHeaders('tools/call')}),{env:env(),fetch:noFetch});
  assert.equal(noName.status,400);
  const unknownMethod=await handleMcpRequest(make(rpc('foo',{_meta:modernMeta}),{headers:modernHeaders('foo')}),{env:env(),fetch:noFetch});
  assert.equal(unknownMethod.status,404);
  const old=await handleMcpRequest(make(rpc('tools/list'),{headers:{'mcp-protocol-version':'1900-01-01'}}),{env:env(),fetch:noFetch});
  assert.equal(old.status,400);
  const oldBody=await old.json();assert.equal(oldBody.error.code,-32022);assert.ok(oldBody.error.data.supported.includes('2026-07-28'));
});
test('tools/call Katalogsuche gegen Fake-Fetch: Parameter, Projektion, Preisfreigabe',async()=>{
  const seen=[];
  const fake=async(url,init)=>{seen.push({url,init});return json({total:2,page:1,pages:1,items:[
    {id:'p1',name:'Bremsscheibe',sku:'S1',ean:'123',price_cents:1999,price_status:'released',currency:'EUR',in_stock:true,stock_status:'reported',category_id:7,image:'https://x',internal_note:'GEHEIM'},
    {id:'p2',name:'Zuendkerze',sku:'S2',ean:'456',price_cents:500,price_status:'not_released',currency:'EUR',in_stock:false,category_id:7}]});};
  const r=await handleMcpRequest(make(rpc('tools/call',{name:'nexify_katalog_suche',arguments:{q:'  Bremse ',kategorie:7,nur_verfuegbar:true,seitengroesse:5}})),{env:env(),fetch:fake});
  const body=await r.json();
  assert.equal(body.result.isError,false);
  const url=new URL(seen[0].url);
  assert.equal(url.origin+url.pathname,'https://shop.invalid/api/shop/products');
  assert.equal(url.searchParams.get('q'),'Bremse');assert.equal(url.searchParams.get('category'),'7');assert.equal(url.searchParams.get('in_stock'),'true');assert.equal(url.searchParams.get('page_size'),'5');
  assert.equal(seen[0].init.method,'GET');assert.equal(seen[0].init.redirect,'manual');
  const hits=body.result.structuredContent.treffer;
  assert.equal(hits[0].preis_cent,1999);assert.equal(hits[1].preis_cent,null);assert.equal(hits[1].preis_freigegeben,false);
  assert.ok(!JSON.stringify(body).includes('GEHEIM'));assert.ok(!JSON.stringify(body).includes('https://x'));
  const filtered=await handleMcpRequest(make(rpc('tools/call',{name:'nexify_katalog_suche',arguments:{nur_mit_freigegebenem_preis:true}})),{env:env(),fetch:fake});
  assert.equal((await filtered.json()).result.structuredContent.treffer.length,1);
});
test('Werkstattsuche und Status ueber Fake-Fetch',async()=>{
  const fake=async(url)=>url.includes('/api/workshops/search')?json({total:1,results:[{id:'w1',name:'Werkstatt A',city:'Aachen',zip:'52062',tel:'0241',distance_km:3.2,kind_label:'Reifen',secret:'x'}],unlocated:[]}):json({products:120,last_import_at:'2026-11-01T00:00:00Z',partial:false,extra:'x'});
  const w=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_werkstatt_suche',arguments:{q:'52062',umkreis_km:50}})),{env:env(),fetch:fake})).json();
  assert.equal(w.result.structuredContent.treffer[0].ort,'Aachen');assert.ok(!JSON.stringify(w).includes('"secret"'));
  const s=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:{}})),{env:env(),fetch:fake})).json();
  assert.deepEqual(s.result.structuredContent,{produkte:120,letzter_import:'2026-11-01T00:00:00Z',teilbestand:false});
});
test('strenge Eingabevalidierung -> -32602, kein Netzaufruf',async()=>{
  const bad=[['nexify_katalog_suche',{q:'x'.repeat(121)}],['nexify_katalog_suche',{q:5}],['nexify_katalog_suche',{seitengroesse:21}],['nexify_katalog_suche',{seite:0}],['nexify_katalog_suche',{kategorie:1.5}],['nexify_katalog_suche',{nur_verfuegbar:'ja'}],['nexify_katalog_suche',{pfad:'/admin'}],['nexify_katalog_suche',{q:'a\u0000b'}],
    ['nexify_werkstatt_suche',{}],['nexify_werkstatt_suche',{q:'a'}],['nexify_werkstatt_suche',{q:'Aachen',umkreis_km:7}],['nexify_status',{x:1}]];
  for(const [name,args] of bad){
    const body=await (await handleMcpRequest(make(rpc('tools/call',{name,arguments:args})),{env:env(),fetch:noFetch})).json();
    assert.equal(body.error?.code,-32602,name+JSON.stringify(args));
  }
  const arr=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:[]})),{env:env(),fetch:noFetch})).json();
  assert.equal(arr.error.code,-32602);
});
test('Upstream-Fehler werden ohne interne Texte als Werkzeugfehler gemeldet',async()=>{
  const cases=[async()=>{throw new Error('connect ECONNREFUSED 10.0.0.5:8001 secret-host');},async()=>new Response('<html>',{status:200,headers:{'content-type':'text/html'}}),async()=>json({detail:'SQL-Fehler intern'},500),async()=>new Response('{',{status:200,headers:{'content-type':'application/json'}}),async()=>new Response('x',{status:302,headers:{location:'http://intern'}})];
  for(const fake of cases){
    const raw=JSON.stringify(await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:{}})),{env:env(),fetch:fake})).json());
    assert.ok(raw.includes('"isError":true'));
    for(const leak of ['ECONNREFUSED','10.0.0.5','secret-host','SQL-Fehler','intern']) assert.ok(!raw.includes(leak),leak);
  }
});
test('Shop-Basis-URL fehlt oder ist unsicher -> Werkzeugfehler ohne Abruf',async()=>{
  for(const base of [undefined,'http://shop.example','ftp://x','https://user:pw@shop.example','not a url']){
    const body=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:{}})),{env:env({SHOP_API_BASE_URL:base}),fetch:noFetch})).json();
    assert.equal(body.result.isError,true);
  }
});
test('Antwortgroesse wird begrenzt und Upstream-Groesse abgewiesen',async()=>{
  const big=async()=>json({total:1,results:Array.from({length:500},(_,i)=>({id:'w'+i,name:'N'.repeat(900)})),unlocated:[]});
  const body=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_werkstatt_suche',arguments:{q:'Aachen'}})),{env:env(),fetch:big})).json();
  assert.ok(body.result.content[0].text.length<=24000);
  assert.ok(body.result.structuredContent.treffer.length<=20);
  const huge=async()=>new Response('{"a":"'+'x'.repeat(600000)+'"}',{status:200,headers:{'content-type':'application/json'}});
  const rejected=await (await handleMcpRequest(make(rpc('tools/call',{name:'nexify_status',arguments:{}})),{env:env(),fetch:huge})).json();
  assert.equal(rejected.result.isError,true);
});
test('Ratenbegrenzung -> 429',async()=>{
  let last;
  for(let i=0;i<=RATE_LIMIT_PER_MINUTE;i+=1)last=await handleMcpRequest(make(rpc('ping')),{env:env(),fetch:noFetch,now:()=>1000});
  assert.equal(last.status,429);
});
test('Discovery: protected-resource ehrlich ohne Autorisierungsserver, nur mit Schalter',async()=>{
  const {protectedResourceDocument,discoveryOrigin}=await import('../../lib/mcp-server.ts');
  const doc=protectedResourceDocument(discoveryOrigin(new Request('https://x.test/'),{}));
  assert.equal(doc.resource,'https://mcp.nexifyai.cloud/mcp');
  assert.equal('authorization_servers' in doc,false);
  assert.equal(doc.nexify_auth.oauth,false);
  assert.equal(discoveryOrigin(new Request('https://x.test/'),{MCP_PUBLIC_ORIGIN:'http://boese.example'}),'https://mcp.nexifyai.cloud');
});
