import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APPROVED_INDEX_HOSTS, LEGAL_ROUTE_PATHS, NEVER_INDEXED_PAGE_IDS,
  indexablePaths, indexingDecision, normalizeHost, requestHosts, teileklarIndexingOn,
} from '../../lib/indexing.ts';

// Regel und Freigabeweg: docs/04-betrieb/indexierung-freigabe-2026-11-14.md. Die Tests prüfen beide Zustände des Schalters,
// die Hostbindung und die Ausnahmeliste gegen den echten Seitenkatalog, ohne laufenden Server.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const siteMap = JSON.parse(read('../../../../config/site-map.json'));
const sitemapSource = read('../../app/sitemap.ts');
const paths = indexablePaths(siteMap);
const ON = { NEXIFY_INDEXING: 'enabled', VERCEL_ENV: 'production' };
const ALL = { ...ON, NEXIFY_INDEXING_TEILEKLAR: 'enabled' };
const decide = (path, env = ON, hosts = ['www.nexifyai.de']) => indexingDecision({ path, hosts, env, paths });
const pathOf = id => siteMap.pages.find(page => page.id === id).path;
const agencyPaths = paths.filter(path => !path.startsWith('/teileklar'));

test('Standard ist gesperrt: ohne ausdrücklichen Schalter ist keine einzige Seite indexierbar', () => {
  const candidates = [...siteMap.pages.map(page => page.path), ...LEGAL_ROUTE_PATHS, '/teileklar/produkt/123', '/unbekannt'];
  for (const env of [{}, { VERCEL_ENV: 'production' }, { NEXIFY_INDEXING: '' }, { NEXIFY_INDEXING: 'true' }, { NEXIFY_INDEXING: '1' },
    { NEXIFY_INDEXING: 'Enabled' }, { NEXIFY_INDEXING: 'enabled ' }, { NEXIFY_INDEXING_TEILEKLAR: 'enabled' }]) {
    for (const path of candidates) assert.deepEqual(decide(path, env), { index: false, reason: 'switch_off' }, JSON.stringify(env) + ' ' + path);
  }
});

test('Mit Schalter auf einer freigegebenen Produktionsdomain sind die Agenturseiten und die Rechtsseiten indexierbar', () => {
  assert.deepEqual(APPROVED_INDEX_HOSTS, ['nexifyai.de', 'www.nexifyai.de', 'nexifyai.cloud', 'www.nexifyai.cloud']);
  assert.equal(agencyPaths.length, 28);
  for (const host of APPROVED_INDEX_HOSTS) for (const path of agencyPaths) assert.deepEqual(decide(path, ON, [host]), { index: true, reason: 'allowed' }, host + path);
  for (const path of ['/', '/leistungen', '/kontakt', '/impressum', '/datenschutz', '/agb', '/avv', '/widerruf']) assert.ok(agencyPaths.includes(path), path);
  // Außerhalb von Vercel (VERCEL_ENV fehlt) entscheidet allein Schalter und Host.
  assert.equal(decide('/', { NEXIFY_INDEXING: 'enabled' }).index, true);
  // Schreibweise des Hosts: Großbuchstaben, Port und abschließender Punkt ändern nichts.
  for (const host of ['WWW.NexifyAI.de', 'www.nexifyai.de:443', 'nexifyai.de.']) assert.equal(decide('/', ON, [host]).index, true, host);
});

test('Vorschauen und fremde Hosts bleiben trotz Schalter gesperrt', () => {
  for (const host of ['nexify-ai-finales-agentur-gesamtpro-one.vercel.app', 'projekt-git-main-team.vercel.app', 'nexify.workers.dev', 'x.pages.dev', 'localhost:3000',
    '127.0.0.1', '[::1]:3000', 'nexifyai.de.evil.example', 'evil-nexifyai.de', 'www.nexifyai.de.vercel.app', 'staging.nexifyai.de', 'nexifyai.com', 'www.nexifyai.de@evil.example', '']) {
    assert.deepEqual(decide('/', ON, [host]), { index: false, reason: 'host_not_approved' }, host);
  }
  // Kein Host genannt, oder einer von mehreren nicht freigegeben: gesperrt.
  assert.equal(decide('/', ON, []).reason, 'host_not_approved');
  assert.equal(decide('/', ON, ['www.nexifyai.de', 'projekt.vercel.app']).reason, 'host_not_approved');
  assert.equal(decide('/', ON, requestHosts('www.nexifyai.de', 'www.nexifyai.de, projekt.vercel.app')).reason, 'host_not_approved');
  assert.equal(decide('/', ON, requestHosts('www.nexifyai.de', null)).index, true);
  assert.equal(decide('/', ON, requestHosts('nexifyai.de', 'nexifyai.de')).index, true);
  // Vorschau- und Entwicklungsumgebung von Vercel, auch wenn dort eine Produktionsdomain hinge.
  for (const stage of ['preview', 'development', '']) assert.deepEqual(decide('/', { NEXIFY_INDEXING: 'enabled', VERCEL_ENV: stage }), { index: false, reason: 'not_production' }, stage);
  assert.equal(normalizeHost('a b'), '');
});

test('Ausnahmeliste: private, transaktionale und unbekannte Seiten bleiben unabhängig von jedem Schalter gesperrt', () => {
  const privatePaths = siteMap.pages.filter(page => page.access.visibility !== 'public' || page.access.auth_required).map(page => page.path);
  assert.equal(privatePaths.length, 10);
  const never = [...privatePaths, ...privatePaths.map(path => path + '/detail'), ...NEVER_INDEXED_PAGE_IDS.map(pathOf),
    '/anmelden/sso', '/registrieren/bestaetigen', '/passwort-vergessen', '/passwort-zuruecksetzen', '/offline', '/webhook/v1',
    '/api/chat', '/api/shop/products', '/teileklar/admin', '/teileklar/bestellung/1', '/teileklar/bestellungen', '/teileklar/produkt/1/extra',
    '/gibt-es-nicht', '/leistungen/gibt-es-nicht', '/Leistungen', '/sitemap.xml'];
  for (const env of [ON, ALL]) for (const host of APPROVED_INDEX_HOSTS) for (const path of never) {
    assert.deepEqual(decide(path, env, [host]), { index: false, reason: 'path_not_indexable' }, path);
  }
  assert.deepEqual([...NEVER_INDEXED_PAGE_IDS].sort(), ['login', 'signup', 'tk-cart', 'tk-category', 'tk-checkout', 'tk-product', 'tk-search']);
  for (const path of ['/anmelden', '/registrieren', '/teileklar/suche', '/teileklar/warenkorb', '/teileklar/kasse']) assert.ok(!paths.includes(path), path);
  // Nur zugelassene öffentliche Katalogseiten können je indexierbar werden.
  const allowed = new Set(siteMap.public_allowlist);
  for (const path of paths.filter(path => !LEGAL_ROUTE_PATHS.includes(path))) {
    const page = siteMap.pages.find(candidate => candidate.path === path);
    assert.ok(page && allowed.has(page.id) && page.access.visibility === 'public' && page.access.auth_required === false, path);
  }
});

test('TEILEKLAR bleibt gesperrt, bis der eigene Schalter zusätzlich gesetzt ist', () => {
  const shop = [...paths.filter(path => path.startsWith('/teileklar')), '/teileklar/produkt/123', '/teileklar/kategorie/bremsen'];
  assert.equal(shop.length, 13);
  for (const path of shop) {
    assert.deepEqual(decide(path, ON), { index: false, reason: 'teileklar_switch_off' }, path);
    assert.deepEqual(decide(path, ALL), { index: true, reason: 'allowed' }, path);
    // Der Shop-Schalter allein gibt nichts frei, und auch er gilt nur auf freigegebenen Hosts.
    assert.equal(decide(path, { NEXIFY_INDEXING_TEILEKLAR: 'enabled', VERCEL_ENV: 'production' }).reason, 'switch_off', path);
    assert.equal(decide(path, ALL, ['projekt.vercel.app']).reason, 'host_not_approved', path);
  }
  assert.equal(teileklarIndexingOn({ NEXIFY_INDEXING_TEILEKLAR: 'enabled' }), false);
  assert.equal(teileklarIndexingOn(ALL), true);
  // Die Agenturseiten hängen nicht am Shop-Schalter.
  assert.equal(decide('/leistungen', ALL).index, true);
});

test('Sitemap und Regel nennen dieselben Seiten', () => {
  const excluded = [...(sitemapSource.match(/\[((?:'[a-z-]+',?\s*)+)\]\.includes/)?.[1] ?? '').matchAll(/'([a-z-]+)'/g)].map(match => match[1]);
  assert.deepEqual([...excluded].sort(), [...NEVER_INDEXED_PAGE_IDS].sort());
  const legal = [...(sitemapSource.match(/const legalPages=\[([^\]]+)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.deepEqual(legal, [...LEGAL_ROUTE_PATHS]);
  // TEILEKLAR-Einträge erscheinen in der Sitemap nur mit dem Shop-Schalter.
  assert.match(sitemapSource, /const listed=\(p:\{site_context:string\}\)=>p\.site_context!=='teileklar'\|\|teileklarIndexingOn\(process\.env\);/);
  assert.match(sitemapSource, /\.includes\(p\.id\)\)\.filter\(listed\)\.map\(/);
  // Jede Katalogseite der Regel ist eine Sitemap-Seite und umgekehrt (gleiche Herkunft: public_allowlist ohne Ausnahmen).
  const allowed = new Set(siteMap.public_allowlist);
  const sitemapPaths = siteMap.pages.filter(page => allowed.has(page.id) && page.access.visibility === 'public' && page.access.auth_required === false && !excluded.includes(page.id)).map(page => page.path);
  assert.deepEqual([...sitemapPaths, ...legal].sort(), [...paths].sort());
  assert.equal(paths.length, 39);
});
