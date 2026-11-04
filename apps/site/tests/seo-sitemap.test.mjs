import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const root=new URL('../../../',import.meta.url);
const siteMap=JSON.parse(await readFile(new URL('config/site-map.json',root),'utf8'));
const xml=await readFile(new URL('apps/web/public/sitemap.xml',root),'utf8');
const robots=await readFile(new URL('apps/web/public/robots.txt',root),'utf8');
const urls=[...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map(match=>new URL(match[1]));
const expected=siteMap.pages
  .filter(page=>siteMap.public_allowlist.includes(page.id)&&page.access?.visibility==='public'&&page.access.auth_required===false)
  .map(page=>page.path)
  .sort();

test('sitemap contains every public route exactly once and no private route',()=>{
  const actual=urls.map(url=>url.pathname).sort();
  assert.equal(urls.length,39);
  assert.deepEqual(actual,expected);
  assert.equal(new Set(actual).size,actual.length);
});

test('sitemap URLs share the documented German market origin and have no query or fragment',()=>{
  for(const url of urls){
    assert.equal(url.origin,'https://www.nexifyai.de');
    assert.equal(url.search,'');
    assert.equal(url.hash,'');
  }
  assert.match(robots,/^Sitemap: https:\/\/www\.nexifyai\.de\/sitemap\.xml$/m);
});

test('the three newer TEILEKLAR advisory routes cannot silently disappear',()=>{
  for(const path of ['/teileklar/shop','/teileklar/reifenrechner','/teileklar/batterie-berater'])assert.ok(urls.some(url=>url.pathname===path),path);
});
