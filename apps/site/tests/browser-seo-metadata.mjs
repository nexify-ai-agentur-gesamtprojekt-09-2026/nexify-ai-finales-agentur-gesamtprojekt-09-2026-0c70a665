// Route-level metadata regression in a real browser. No external requests.
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {generate} from '../scripts/generate-public-data.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');

const data=await generate();
const root=fileURLToPath(new URL('../',import.meta.url));
const server=await createServer({root,configFile:root+'vite.config.ts',server:{port:0,strictPort:false,hmr:false},define:{'import.meta.env.VITE_CLERK_ENABLED':'"false"'}});
await server.listen();
const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE}:{}),args:['--no-sandbox']});
const context=await browser.newContext();
await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin&&url.protocol!=='data:')return route.abort();
  if(url.pathname.startsWith('/api/'))return route.fulfill({status:403,json:{error:'synthetic_denied'}});
  return route.continue();
});
const page=await context.newPage();

async function state(){
  return page.evaluate(()=>({
    title:document.title,
    language:document.documentElement.lang,
    description:document.querySelector('meta[name="description"]')?.content,
    robots:document.querySelector('meta[name="robots"]')?.content,
    canonical:document.querySelector('link[rel="canonical"]')?.href,
    ogTitle:document.querySelector('meta[property="og:title"]')?.content,
    ogUrl:document.querySelector('meta[property="og:url"]')?.content,
    twitterTitle:document.querySelector('meta[name="twitter:title"]')?.content,
    schema:JSON.parse(document.querySelector('#route-structured-data')?.textContent||'null')
  }));
}

try{
  for(const route of ['/leistungen/websites','/produkte/nex2fly','/teileklar/werkstatt']){
    const source=data.pages.find(item=>item.path===route);
    await page.goto(origin+route);
    await page.locator('#locale').selectOption('de');
    await page.waitForFunction(title=>document.title===title,source.localizedTitle.de+' · NeXify AI');
    let meta=await state();
    assert.equal(meta.canonical,origin+route);
    assert.equal(meta.ogUrl,origin+route);
    assert.equal(meta.title,meta.ogTitle);
    assert.equal(meta.title,meta.twitterTitle);
    assert.equal(meta.description,source.localizedSummary.de);
    assert.equal(meta.schema['@graph'].find(item=>item['@type']==='WebPage').url,origin+route);
    await page.locator('#locale').selectOption('nl');
    await page.waitForFunction(title=>document.title===title,source.localizedTitle.nl+' · NeXify AI');
    meta=await state();
    assert.equal(meta.language,'nl');
    assert.equal(meta.description,source.localizedSummary.nl);
    assert.equal(meta.schema['@graph'].find(item=>item['@type']==='WebPage').inLanguage,'nl-NL');
  }

  await page.goto(origin+'/teileklar/produkt/belegt-123');
  await page.waitForFunction(()=>document.querySelector('link[rel="canonical"]')?.href.endsWith('/teileklar/produkt'));
  assert.equal((await state()).canonical,origin+'/teileklar/produkt');

  await page.goto(origin+'/nicht-vorhanden');
  await page.waitForFunction(()=>document.title==='Seite nicht verfügbar · NeXify AI');
  const missing=await state();
  assert.equal(missing.canonical,origin+'/');
  assert.equal(missing.robots,'noindex,nofollow,noarchive');
  assert.equal(missing.schema['@graph'].some(item=>item['@type']==='WebPage'),false);
}finally{
  await context.close();
  await browser.close();
  await server.close();
}

console.log(JSON.stringify({status:'passed',direct_routes:3,locales:['de','nl'],dynamic_detail:true,unknown_route:true,external_requests:0}));
