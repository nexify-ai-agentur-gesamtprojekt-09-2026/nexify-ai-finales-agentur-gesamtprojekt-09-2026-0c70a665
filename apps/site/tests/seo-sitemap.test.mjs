import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

// The sitemap and robots rules are Next metadata routes (apps/web/app/sitemap.ts, robots.ts), not static files.
// The contract is checked against their source so the test needs no running server.
const root=new URL('../../../',import.meta.url);
const siteMap=JSON.parse(await readFile(new URL('config/site-map.json',root),'utf8'));
const sitemapSource=await readFile(new URL('apps/web/app/sitemap.ts',root),'utf8');
const robotsSource=await readFile(new URL('apps/web/app/robots.ts',root),'utf8');
const seoSource=await readFile(new URL('apps/web/lib/page-seo.ts',root),'utf8');

const excludedIds=[...(sitemapSource.match(/\[((?:'[a-z-]+',?\s*)+)\]\.includes/)?.[1]??'').matchAll(/'([a-z-]+)'/g)].map(match=>match[1]);
const publicPages=siteMap.pages.filter(page=>siteMap.public_allowlist.includes(page.id)&&page.access?.visibility==='public'&&page.access.auth_required===false);
const robotsDisallow=[...(robotsSource.match(/disallow:\[([^\]]+)\]/)?.[1]??'').matchAll(/'([^']+)'/g)].map(match=>match[1]);

test('sitemap lists every indexable public route; only transactional or search routes are excluded',()=>{
  assert.ok(excludedIds.length>0,'exclusion list must be parseable');
  const publicIds=new Set(publicPages.map(page=>page.id));
  for(const id of excludedIds)assert.ok(publicIds.has(id),'excluded id is not a public page: '+id);
  // Anything excluded from the sitemap must not be a content page: only auth, cart, checkout, search and parametrised detail routes.
  assert.deepEqual([...excludedIds].sort(),['login','signup','tk-cart','tk-category','tk-checkout','tk-product','tk-search']);
  assert.equal(publicPages.length-excludedIds.length,36);
  assert.match(sitemapSource,/localizedUrl\(p\.path,'de'\)/);
});

test('private areas are never exposed to crawlers',()=>{
  for(const path of ['/api/','/intern/','/portal/','/teileklar/kasse','/teileklar/warenkorb','/teileklar/konto','/teileklar/partnerportal'])assert.ok(robotsDisallow.includes(path),path);
  for(const page of siteMap.pages.filter(page=>page.access.visibility!=='public'||page.access.auth_required)){
    assert.ok(!sitemapSource.includes(page.path),'private route in sitemap source: '+page.path);
  }
});

test('canonical origin is the documented German market origin and is defined in one place',()=>{
  assert.match(seoSource,/PUBLIC_ORIGIN='https:\/\/www\.nexifyai\.de'/);
  assert.match(robotsSource,/sitemap:'https:\/\/www\.nexifyai\.de\/sitemap\.xml'/);
});

test('TEILEKLAR advisory routes stay in the sitemap',()=>{
  for(const id of ['tk-shop','tk-reifenrechner','tk-batterie'])assert.ok(publicPages.some(page=>page.id===id)&&!excludedIds.includes(id),id);
});
