import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { APPROVED_INDEX_HOSTS, NOINDEX_HEADER_VALUE, indexablePaths, indexingDecision, robotsDirective } from '../indexing.ts';

// OA-164: Das Meta-Tag `robots` der Seiten mit eigener Route sagt dasselbe wie die Kopfzeile X-Robots-Tag, weil beide aus
// indexingDecision (auth/indexing.ts) entstehen. Geprüft werden die Übersetzung der Entscheidung, beide Schalterzustände je
// Seite und die Bindung der Seitendateien an die Regel, ohne laufenden Server.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const paths = indexablePaths(JSON.parse(read('../../../../config/site-map.json')));
const ON = { NEXIFY_INDEXING: 'enabled', VERCEL_ENV: 'production' };
const ALL = { ...ON, NEXIFY_INDEXING_TEILEKLAR: 'enabled' };
const LEGAL = ['/agb', '/avv', '/widerruf'];
const TEILEKLAR = ['/teileklar/kategorien', '/teileklar/werkstatt'];
// Dieselbe Abbildung wie Next.js für `robots: {index, follow}` im Dokumentkopf.
const metaContent = directive => (directive.index ? 'index' : 'noindex') + ', ' + (directive.follow ? 'follow' : 'nofollow');
// Kopfzeile wie in proxy.ts: gesetzt, wenn die Entscheidung nicht `index` lautet.
const header = decision => (decision.index ? null : NOINDEX_HEADER_VALUE);
const meta = (path, env, hosts = ['www.nexifyai.de']) => metaContent(robotsDirective(indexingDecision({ path, hosts, env, paths })));

test('Die Meta-Angabe ist die Übersetzung der Entscheidung: gesperrt ergibt wörtlich den Wert der Kopfzeile', () => {
  assert.deepEqual(robotsDirective({ index: true, reason: 'allowed' }), { index: true, follow: true });
  for (const reason of ['switch_off', 'not_production', 'host_not_approved', 'path_not_indexable', 'teileklar_switch_off']) {
    assert.deepEqual(robotsDirective({ index: false, reason }), { index: false, follow: false }, reason);
    assert.equal(metaContent(robotsDirective({ index: false, reason })), NOINDEX_HEADER_VALUE, reason);
  }
});

test('Ohne Freigabe tragen alle fünf Seiten im Meta-Tag noindex, nofollow, wie die Kopfzeile', () => {
  for (const env of [{}, { VERCEL_ENV: 'production' }, { NEXIFY_INDEXING: 'true' }, { NEXIFY_INDEXING_TEILEKLAR: 'enabled' }]) {
    for (const path of [...LEGAL, ...TEILEKLAR]) assert.equal(meta(path, env), 'noindex, nofollow', JSON.stringify(env) + ' ' + path);
  }
});

test('Nach Freigabe mit freigegebenem Host: Rechtsseiten index, follow; TEILEKLAR erst mit dem zweiten Schalter', () => {
  for (const host of APPROVED_INDEX_HOSTS) {
    for (const path of LEGAL) assert.equal(meta(path, ON, [host]), 'index, follow', host + path);
    for (const path of TEILEKLAR) {
      assert.equal(meta(path, ON, [host]), 'noindex, nofollow', host + path);
      assert.equal(meta(path, ALL, [host]), 'index, follow', host + path);
    }
  }
});

test('Falscher Host, Vorschau oder fehlender Host sperren das Meta-Tag trotz Schalter', () => {
  for (const path of [...LEGAL, ...TEILEKLAR]) {
    for (const hosts of [['nexify-ai-finales-agentur-gesamtpro-one.vercel.app'], ['localhost:3004'], ['www.nexifyai.de', 'evil.example'], []]) {
      assert.equal(meta(path, ALL, hosts), 'noindex, nofollow', JSON.stringify(hosts) + path);
    }
    assert.equal(meta(path, { ...ALL, VERCEL_ENV: 'preview' }), 'noindex, nofollow', 'preview ' + path);
  }
});

test('Meta-Tag und Kopfzeile widersprechen sich in keiner Kombination aus Seite, Umgebung und Host', () => {
  const envs = [{}, ON, ALL, { ...ALL, VERCEL_ENV: 'preview' }, { NEXIFY_INDEXING: 'enabled' }, { NEXIFY_INDEXING_TEILEKLAR: 'enabled' }];
  const hostSets = [...APPROVED_INDEX_HOSTS.map(host => [host]), ['x.vercel.app'], ['www.nexifyai.de', 'x.vercel.app'], []];
  let compared = 0;
  for (const path of [...LEGAL, ...TEILEKLAR]) for (const env of envs) for (const hosts of hostSets) {
    const decision = indexingDecision({ path, hosts, env, paths });
    const content = metaContent(robotsDirective(decision));
    assert.equal(content === 'index, follow', header(decision) === null, JSON.stringify({ path, env, hosts }));
    if (header(decision) !== null) assert.equal(content, header(decision), JSON.stringify({ path, env, hosts }));
    compared += 1;
  }
  assert.equal(compared, 5 * 6 * 7);
});

test('lib/page-robots.ts ruft die Regel mit denselben Eingaben auf wie der Proxy', () => {
  const source = read('../../lib/page-robots.ts');
  assert.match(source, /const indexable = indexablePaths\(siteMap\);/);
  assert.match(source, /robotsDirective\(indexingDecision\(\{path,hosts:requestHosts\(request\.get\('host'\),request\.get\('x-forwarded-host'\)\),env:process\.env,paths:indexable\}\)\)/);
  assert.match(read('../../proxy.ts'), /indexingDecision\(\{path,hosts:requestHosts\(request\.headers\.get\('host'\),request\.headers\.get\('x-forwarded-host'\)\),env:process\.env,paths:indexable\}\)/);
  assert.match(source, /import siteMap from '\.\.\/\.\.\/\.\.\/config\/site-map\.json';/);
});

test('Die fünf Seiten beziehen ihr Meta-Tag aus pageRobots mit dem eigenen Pfad', () => {
  for (const name of ['agb', 'avv', 'widerruf']) {
    const source = read(`../../app/${name}/page.tsx`);
    assert.match(source, new RegExp(`robots: await pageRobots\\('/${name}'\\),`), name);
    assert.doesNotMatch(source, /export const metadata\b/, name);
  }
  assert.match(read('../../app/teileklar/kategorien/page.tsx'), /routeMetadata\("tk-categories", await pageRobots\("\/teileklar\/kategorien"\)\)/);
  assert.match(read('../../app/teileklar/werkstatt/page.tsx'), /routeMetadata\("tk-workshop", await pageRobots\("\/teileklar\/werkstatt"\)\)/);
});

test('Keine Seitendatei und routeMetadata setzen robots fest auf index', () => {
  const pages = [];
  const walk = dir => { for (const entry of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) { if (entry.isDirectory()) walk(dir + entry.name + '/'); else if (entry.name === 'page.tsx' || entry.name === 'layout.tsx') pages.push(dir + entry.name); } };
  walk('../../app/');
  assert.ok(pages.length >= 20, 'Seitendateien gefunden: ' + pages.length);
  for (const file of pages) {
    const source = read(file);
    assert.doesNotMatch(source, /robots\s*:\s*\{\s*index\s*:\s*true/, file);
    assert.doesNotMatch(source, /routeMetadata\([^)]*,\s*true\s*[,)]/, file);
  }
  const route = read('../../lib/page-seo.ts').split('export function routeMetadata')[1].split('export function')[0];
  assert.doesNotMatch(route, /index\s*:\s*true/);
  assert.match(route, /robots:false\|\{index:boolean;follow:boolean\}/);
});
