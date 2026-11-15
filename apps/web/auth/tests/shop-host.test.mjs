import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as indexing from '../indexing.ts';
import { APPROVED_INDEX_HOSTS, LEGAL_ROUTE_PATHS, indexablePaths, indexingDecision } from '../indexing.ts';
import * as shopHost from '../shop-host.ts';
import {
  AGENCY_HOSTS, PUBLIC_ASSET_FOLDERS, SHOP_CANONICAL_HOST, SHOP_HOST_SWITCH, shopHostOn, AGENCY_ORIGIN, SHOP_HOSTS, SHOP_HOST_HEADER, SHOP_LANDING_TARGETS, SHOP_ORIGIN, SHOP_SHARED_PATHS, agencyPagePaths, hostKind,
  publicUrl, shopCanonicalBase, shopHostDecision, shopInternalPath, shopPublicHref, shopRobotsDisallow, stripShopPrefix,
} from '../shop-host.ts';
import { canonicalPath, privateRoute } from '../policy.ts';

// TEILEKLAR auf eigener Domain: Regel in auth/shop-host.ts, Plan in docs/04-betrieb/shop-eigene-domain-2026-11-15.md.
// Geprüft wird die Weiterleitungstabelle (Host + Pfad → Ziel und Status) gegen den echten Seitenkatalog, ohne laufenden Server.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const siteMap = JSON.parse(read('../../../../config/site-map.json'));
const agencyPaths = agencyPagePaths(siteMap, LEGAL_ROUTE_PATHS);
const shopPagePaths = siteMap.pages.map(page => page.path).filter(path => path === '/teileklar' || path.startsWith('/teileklar/'));
const protectedPaths = siteMap.pages.filter(page => page.access.visibility !== 'public' || page.access.auth_required).map(page => page.path).concat(['/api/internal/workspace']);
const ON = { [SHOP_HOST_SWITCH]: 'enabled' };
const decide = (host, path, env = ON, search = '') => shopHostDecision({ hosts: [host], path, search, env, agencyPaths });
const pass = (path, shopHost = false) => ({ action: 'pass', shopHost, path });
const rewrite = path => ({ action: 'rewrite', shopHost: true, path });
const to = (location, status = 308) => ({ action: 'redirect', status, location });

test('Feste Werte: Schalter, Hosts und Adressen', () => {
  assert.equal(SHOP_HOST_SWITCH, 'NEXIFY_SHOP_HOST');
  assert.equal(SHOP_CANONICAL_HOST, 'teileklar.shop');
  assert.deepEqual(SHOP_HOSTS, ['teileklar.shop', 'www.teileklar.shop']);
  assert.equal(SHOP_ORIGIN, 'https://teileklar.shop');
  assert.equal(SHOP_HOST_HEADER, 'x-nexify-shop-host');
  // Dieselbe Agenturadresse wie Canonical und Sitemap (lib/page-seo.ts).
  assert.match(read('../../lib/page-seo.ts'), new RegExp("export const PUBLIC_ORIGIN='" + AGENCY_ORIGIN + "';"));
  for (const host of SHOP_HOSTS) assert.equal(APPROVED_INDEX_HOSTS.includes(host), false, host);
});

test('Die Grundwerte stehen in indexing.ts und shop-host.ts gleich (beide Module bleiben ohne Importe)', () => {
  assert.doesNotMatch(read('../shop-host.ts'), /^\s*import\s/m);
  assert.doesNotMatch(read('../indexing.ts'), /^\s*import\s/m);
  assert.equal(shopHost.SHOP_HOST_SWITCH, indexing.SHOP_HOST_SWITCH);
  assert.equal(shopHost.SHOP_CANONICAL_HOST, indexing.SHOP_CANONICAL_HOST);
  assert.deepEqual(AGENCY_HOSTS, APPROVED_INDEX_HOSTS);
  for (const name of ['normalizeHost', 'requestHosts', 'isTeileklarPath', 'shopHostOn']) {
    // Gleicher Funktionskörper; nur der Name des Umgebungstyps in der Signatur darf abweichen (wird beim Laden ohnehin entfernt).
    assert.equal(shopHost[name].toString(), indexing[name].toString(), name);
  }
  for (const value of ['teileklar.shop', 'TEILEKLAR.shop:443', 'teileklar.shop.', ' www.nexifyai.de ', '[::1]:3000', 'a b', '', 'x.vercel.app:80.']) {
    assert.equal(shopHost.normalizeHost(value), indexing.normalizeHost(value), value);
  }
  assert.deepEqual(shopHost.requestHosts('a, b', null, undefined, ' c '), indexing.requestHosts('a, b', null, undefined, ' c '));
});

test('Standard ist AUS: nur der genaue Wert "enabled" schaltet, sonst wird jeder Aufruf unverändert durchgelassen', () => {
  const hosts = ['teileklar.shop', 'www.teileklar.shop', 'nexifyai.de', 'www.nexifyai.de', 'nexifyai.cloud', 'x.vercel.app', 'localhost:3004', ''];
  const paths = ['/', '/shop', '/teileklar', '/teileklar/shop', '/teileklar/kasse', '/kontakt', '/anmelden', '/api/shop/products', '/intern/workspace', '/unbekannt'];
  for (const env of [{}, { NEXIFY_SHOP_HOST: '' }, { NEXIFY_SHOP_HOST: 'true' }, { NEXIFY_SHOP_HOST: '1' }, { NEXIFY_SHOP_HOST: 'Enabled' }, { NEXIFY_SHOP_HOST: 'enabled ' },
    { NEXIFY_INDEXING: 'enabled', NEXIFY_INDEXING_TEILEKLAR: 'enabled' }]) {
    assert.equal(shopHostOn(env), false);
    for (const host of hosts) for (const path of paths) assert.deepEqual(decide(host, path, env, '?q=1'), pass(path), JSON.stringify(env) + ' ' + host + path);
    for (const path of paths) assert.equal(publicUrl(path, env), AGENCY_ORIGIN + path);
    assert.equal(shopCanonicalBase(env), 'https://www.nexifyai.de/teileklar');
  }
});

// Die Tabelle des Dokuments, Zeile für Zeile. Ziele auf demselben Host sind Pfade, Ziele auf einem anderen Host vollständige Adressen.
const TABLE = [
  // Shop-Domain: der Shop ohne Präfix
  ['teileklar.shop', '/', rewrite('/teileklar')],
  ['teileklar.shop', '/shop', rewrite('/teileklar/shop')],
  ['teileklar.shop', '/produkt/123', rewrite('/teileklar/produkt/123')],
  ['teileklar.shop', '/kategorie/7', rewrite('/teileklar/kategorie/7')],
  ['teileklar.shop', '/warenkorb', rewrite('/teileklar/warenkorb')],
  ['teileklar.shop', '/kasse', rewrite('/teileklar/kasse')],
  ['teileklar.shop', '/bestellung/abc', rewrite('/teileklar/bestellung/abc')],
  ['teileklar.shop', '/rechtliches', rewrite('/teileklar/rechtliches')],
  ['teileklar.shop', '/konto', rewrite('/teileklar/konto')],
  ['teileklar.shop', '/admin', rewrite('/teileklar/admin')],
  // Shop-Domain: alte Adresse mit Präfix → dieselbe Seite ohne Präfix
  ['teileklar.shop', '/teileklar', to('/')],
  ['teileklar.shop', '/teileklar/shop', to('/shop')],
  ['teileklar.shop', '/teileklar/produkt/123', to('/produkt/123')],
  // Shop-Domain: Schnittstellen und Kontoseiten bleiben, wo sie sind
  ['teileklar.shop', '/api/shop/products', pass('/api/shop/products', true)],
  ['teileklar.shop', '/api/auth/me', pass('/api/auth/me', true)],
  ['teileklar.shop', '/api/internal/workspace', pass('/api/internal/workspace', true)],
  ['teileklar.shop', '/_next/data/x.json', pass('/_next/data/x.json', true)],
  ['teileklar.shop', '/brand/nexify-figur.png', pass('/brand/nexify-figur.png', true)],
  ['teileklar.shop', '/media/atelier/film.mp4', pass('/media/atelier/film.mp4', true)],
  ['www.teileklar.shop', '/brand/nexify-figur.png', pass('/brand/nexify-figur.png', true)],
  ['teileklar.shop', '/anmelden', pass('/anmelden', true)],
  ['teileklar.shop', '/registrieren', pass('/registrieren', true)],
  ['teileklar.shop', '/passwort-vergessen', pass('/passwort-vergessen', true)],
  ['teileklar.shop', '/passwort-zuruecksetzen', pass('/passwort-zuruecksetzen', true)],
  ['teileklar.shop', '/sitemap.xml', pass('/sitemap.xml', true)],
  // Shop-Domain: Ziele nach der Anmeldung
  ['teileklar.shop', '/portal/kunde', to('/bestellungen', 307)],
  ['teileklar.shop', '/intern/leitstand', to('/admin', 307)],
  // Shop-Domain: Agenturseiten liegen auf der Agentur-Domain, Unbekanntes endet im 404 der App
  ['teileklar.shop', '/kontakt', to('https://www.nexifyai.de/kontakt')],
  ['teileklar.shop', '/datenschutz', to('https://www.nexifyai.de/datenschutz')],
  ['teileklar.shop', '/leistungen/websites', to('https://www.nexifyai.de/leistungen/websites')],
  ['teileklar.shop', '/agb', to('https://www.nexifyai.de/agb')],
  ['teileklar.shop', '/intern/workspace', to('https://www.nexifyai.de/intern/workspace')],
  ['teileklar.shop', '/gibt-es-nicht', rewrite('/teileklar/gibt-es-nicht')],
  ['teileklar.shop', '/intern', rewrite('/teileklar/intern')],
  ['teileklar.shop', '/offline', rewrite('/teileklar/offline')],
  // www.teileklar.shop: ein Sprung auf die kanonische Adresse, schon mit dem endgültigen Pfad
  ['www.teileklar.shop', '/', to('https://teileklar.shop/')],
  ['www.teileklar.shop', '/shop', to('https://teileklar.shop/shop')],
  ['www.teileklar.shop', '/teileklar/shop', to('https://teileklar.shop/shop')],
  ['www.teileklar.shop', '/anmelden', to('https://teileklar.shop/anmelden')],
  ['www.teileklar.shop', '/portal/kunde', to('https://teileklar.shop/bestellungen', 307)],
  ['www.teileklar.shop', '/kontakt', to('https://www.nexifyai.de/kontakt')],
  ['www.teileklar.shop', '/api/shop/products', pass('/api/shop/products', true)],
  // Agentur-Domains: der Shop liegt nur noch unter der Shop-Domain, alles andere bleibt
  ['nexifyai.de', '/teileklar', to('https://teileklar.shop/')],
  ['nexifyai.de', '/teileklar/shop', to('https://teileklar.shop/shop')],
  ['www.nexifyai.de', '/teileklar/produkt/123', to('https://teileklar.shop/produkt/123')],
  ['nexifyai.cloud', '/teileklar/kasse', to('https://teileklar.shop/kasse')],
  ['www.nexifyai.cloud', '/teileklar/bestellung/abc', to('https://teileklar.shop/bestellung/abc')],
  ['nexifyai.de', '/', pass('/')],
  ['www.nexifyai.de', '/kontakt', pass('/kontakt')],
  ['nexifyai.de', '/anmelden', pass('/anmelden')],
  ['nexifyai.de', '/api/shop/products', pass('/api/shop/products')],
  ['nexifyai.de', '/shop', pass('/shop')],
  ['nexifyai.de', '/teileklarer', pass('/teileklarer')],
  // Vorschauen, lokale Aufrufe und fremde Hosts: unverändert, auch mit Schalter
  ['x.vercel.app', '/teileklar/shop', pass('/teileklar/shop')],
  ['x.vercel.app', '/shop', pass('/shop')],
  ['localhost:3004', '/teileklar', pass('/teileklar')],
  ['127.0.0.1:3004', '/teileklar/kasse', pass('/teileklar/kasse')],
  ['teileklar.shop.evil.example', '/shop', pass('/shop')],
  ['evil-teileklar.shop', '/shop', pass('/shop')],
];

test('Weiterleitungstabelle: Host + Pfad → Ziel und Status', () => {
  for (const [host, path, expected] of TABLE) assert.deepEqual(decide(host, path), expected, host + path);
});

test('Abfrage und Sonderzeichen bleiben erhalten', () => {
  assert.deepEqual(decide('nexifyai.de', '/teileklar/suche', ON, '?q=bremse&seite=2'), to('https://teileklar.shop/suche?q=bremse&seite=2'));
  assert.deepEqual(decide('teileklar.shop', '/teileklar/suche', ON, '?q=bremse'), to('/suche?q=bremse'));
  assert.deepEqual(decide('teileklar.shop', '/kontakt', ON, '?lang=nl'), to('https://www.nexifyai.de/kontakt?lang=nl'));
  assert.deepEqual(decide('teileklar.shop', '/suche', ON, '?q=bremse'), rewrite('/teileklar/suche'));
  // canonicalPath liefert entschlüsselte Pfade; das Ziel wird wieder verschlüsselt.
  assert.deepEqual(decide('nexifyai.de', canonicalPath('/teileklar/produkt/%C3%B6l'), ON), to('https://teileklar.shop/produkt/%C3%B6l'));
  // Schreibweise des Hosts: Port, Großbuchstaben, abschließender Punkt.
  assert.deepEqual(decide('TEILEKLAR.shop:443', '/shop'), rewrite('/teileklar/shop'));
  assert.deepEqual(decide('teileklar.shop.', '/shop'), rewrite('/teileklar/shop'));
});

test('Gemischte oder fehlende Host-Angaben lösen nie eine Umleitung aus', () => {
  const mixed = [[], ['teileklar.shop', 'nexifyai.de'], ['nexifyai.de', 'teileklar.shop'], ['teileklar.shop', 'x.vercel.app'], ['nexifyai.de', 'x.vercel.app'], ['[::1]:3000']];
  for (const hosts of mixed) {
    assert.equal(hostKind(hosts), 'other', JSON.stringify(hosts));
    for (const path of ['/', '/shop', '/teileklar/shop', '/kontakt']) assert.deepEqual(shopHostDecision({ hosts, path, search: '', env: ON, agencyPaths }), pass(path), JSON.stringify(hosts) + path);
  }
  // Host und X-Forwarded-Host stimmen überein (Regelfall hinter der Plattform): eine Gruppe.
  assert.equal(hostKind(['teileklar.shop', 'teileklar.shop']), 'shop');
  assert.equal(hostKind(['www.teileklar.shop', 'teileklar.shop']), 'shop');
  assert.equal(hostKind(['nexifyai.de', 'www.nexifyai.de']), 'agency');
  assert.deepEqual(shopHostDecision({ hosts: ['www.teileklar.shop', 'teileklar.shop'], path: '/shop', search: '', env: ON, agencyPaths }), to('https://teileklar.shop/shop'));
});

test('Keine Schleifen: jede Kette endet nach höchstens zwei Sprüngen bei einer ausgelieferten Seite', () => {
  const hosts = [...SHOP_HOSTS, ...APPROVED_INDEX_HOSTS];
  const paths = [...new Set([...siteMap.pages.map(page => page.path), ...shopPagePaths.map(stripShopPrefix), ...LEGAL_ROUTE_PATHS, ...SHOP_SHARED_PATHS,
    ...Object.keys(SHOP_LANDING_TARGETS), ...Object.values(SHOP_LANDING_TARGETS), '/teileklar/produkt/1', '/produkt/1', '/api/shop/status', '/x', '/intern', '/portal'])];
  for (const start of hosts) for (const path of paths) {
    let host = start, current = path, hops = 0;
    for (;;) {
      const decision = decide(host, current);
      if (decision.action !== 'redirect') break;
      hops += 1;
      assert.ok(hops <= 2, 'zu viele Sprünge: ' + start + path);
      const url = new URL(decision.location, 'https://' + host);
      host = url.host; current = url.pathname;
    }
    // Was am Ende ausgeliefert wird, liegt auf einer kanonischen Adresse: nie www.teileklar.shop (außer /api), nie /teileklar auf einem freigegebenen Host.
    const final = decide(host, current);
    if (!current.startsWith('/api')) assert.notEqual(host, 'www.teileklar.shop', start + path);
    if (final.action === 'pass') assert.equal(current === '/teileklar' || current.startsWith('/teileklar/'), false, start + path);
  }
});

test('Jede Shop-Seite des Katalogs hat genau eine Adresse, und keine kollidiert mit einer Agenturseite oder einer Kontoseite', () => {
  const visible = shopPagePaths.map(stripShopPrefix);
  assert.equal(new Set(visible).size, visible.length);
  for (const path of shopPagePaths) {
    const short = stripShopPrefix(path);
    assert.equal(shopInternalPath(short), path, path);
    assert.deepEqual(decide('teileklar.shop', short), rewrite(path), short);
    assert.deepEqual(decide('www.nexifyai.de', path), to(SHOP_ORIGIN + short), path);
    assert.equal(publicUrl(path, ON), SHOP_ORIGIN + (short === '/' ? '' : short), path);
    if (short !== '/') assert.equal(agencyPaths.includes(short), false, 'Kollision mit Agenturseite: ' + short);
    assert.equal(SHOP_SHARED_PATHS.some(shared => short === shared || short.startsWith(shared + '/')), false, 'Kollision mit Kontoseite: ' + short);
    assert.equal(Object.hasOwn(SHOP_LANDING_TARGETS, short), false, short);
  }
  for (const target of Object.values(SHOP_LANDING_TARGETS)) assert.equal(decide('teileklar.shop', target).action, 'rewrite', target);
  for (const path of agencyPaths) assert.equal(publicUrl(path, ON), AGENCY_ORIGIN + path, path);
});

test('Private Bereiche bleiben gesperrt: die Sperre des Proxys greift auf den App-Pfad, auch über die Shop-Domain', () => {
  for (const path of protectedPaths) {
    const decision = decide('teileklar.shop', path.startsWith('/teileklar') ? stripShopPrefix(path) : path);
    if (path.startsWith('/api/')) { assert.deepEqual(decision, pass(path, true)); assert.equal(privateRoute(decision.path, protectedPaths), true, path); }
    else if (path.startsWith('/teileklar')) { assert.deepEqual(decision, rewrite(path)); assert.equal(privateRoute(decision.path, protectedPaths), true, path); }
    // Private Agenturbereiche werden auf der Shop-Domain nicht ausgeliefert: Sprung zur Agentur-Domain (dort gesperrt) oder zum Shop-Ziel.
    else assert.equal(decision.action, 'redirect', path);
  }
  // Ein privater Agenturpfad wird über die Shop-Domain nie als Seite ausgeliefert, auch nicht in Unterpfaden.
  for (const path of ['/intern/workspace/x', '/portal/kunde/x', '/intern/x']) {
    const decision = decide('teileklar.shop', path);
    assert.equal(decision.action, 'rewrite', path);
    assert.equal(decision.path, '/teileklar' + path);
  }
  const source = read('../../proxy.ts');
  // Reihenfolge im Proxy: erst die Adressentscheidung, dann mit dem App-Pfad die unveränderte Sperre.
  assert.match(source, /const shop = shopHostDecision\(\{ path: requested, search: request\.nextUrl\.search, hosts: requestHosts\(request\.headers\.get\('host'\), request\.headers\.get\('x-forwarded-host'\)\), env: process\.env, agencyPaths \}\);\n  \/\/ Ziele auf demselben Host[^\n]*\n  if \(shop\.action === 'redirect'\) return NextResponse\.redirect\(new URL\(shop\.location, request\.url\), shop\.status\);\n  const path = shop\.path;\n  if \(privateRoute\(path, protectedPaths\) && path\.startsWith\('\/api\/'\)\) \{/);
  assert.match(source, /if\(shop\.shopHost\)requestHeaders\.set\(SHOP_HOST_HEADER,'1'\);else requestHeaders\.delete\(SHOP_HOST_HEADER\);/);
  assert.match(source, /const response=shop\.action==='rewrite'\?NextResponse\.rewrite\(target,\{request:\{headers:requestHeaders\}\}\):NextResponse\.next\(\{request:\{headers:requestHeaders\}\}\);/);
});

test('Verweise der Oberfläche auf der Shop-Domain: Shop ohne Präfix, Konto und /api unverändert, Agentur mit voller Adresse', () => {
  const cases = [
    ['/teileklar', '/'], ['/teileklar/shop', '/shop'], ['/teileklar/suche?q=a#treffer', '/suche?q=a#treffer'], ['/teileklar/rechtliches#agb', '/rechtliches#agb'],
    ['/teileklar?lang=nl', '/?lang=nl'], ['/anmelden', '/anmelden'], ['/anmelden?next=/teileklar/kasse', '/anmelden?next=/teileklar/kasse'], ['/registrieren', '/registrieren'],
    ['/passwort-vergessen', '/passwort-vergessen'], ['/api/shop/cart', '/api/shop/cart'], ['/', 'https://www.nexifyai.de/'], ['/kontakt', 'https://www.nexifyai.de/kontakt'],
    ['/datenschutz?lang=fr', 'https://www.nexifyai.de/datenschutz?lang=fr'], ['https://example.org/x', 'https://example.org/x'], ['//example.org/x', '//example.org/x'],
    ['#sortiment', '#sortiment'], ['tel:+49', 'tel:+49'], ['mailto:a@b.c', 'mailto:a@b.c'],
  ];
  for (const [href, expected] of cases) assert.equal(shopPublicHref(href), expected, href);
  // Sichtbarer Pfad → App-Pfad (Router-Brücke): Shop-Seiten bekommen den Präfix, Kontoseiten nicht; schon vollständige Pfade bleiben.
  for (const [visible, internal] of [['/', '/teileklar'], ['/shop', '/teileklar/shop'], ['/produkt/1', '/teileklar/produkt/1'], ['/anmelden', '/anmelden'],
    ['/teileklar/shop', '/teileklar/shop'], ['/api/x', '/api/x']]) assert.equal(shopInternalPath(visible), internal, visible);
  const bridge = read('../../components/NextRouterBridge.tsx');
  assert.match(bridge, /shopHost=false\}/);
  assert.match(bridge, /const pathname=shopHost\?shopInternalPath\(visible\):visible;/);
  assert.match(bridge, /const local=\(href:string\)=>shopHost\?shopPublicHref\(localized\(href\)\):localized\(href\);/);
  const layout = read('../../app/layout.tsx');
  assert.match(layout, /const shopHost=\(await headers\(\)\)\.get\(SHOP_HOST_HEADER\)==='1';/);
  assert.match(layout, /<NextRouterBridge locale=\{locale\} \{\.\.\.\(shopHost\?\{shopHost:true\}:\{\}\)\}>/);
  assert.match(layout, /<PublicInstallation enabled=\{installation\.enabled&&!shopHost\}\/>/);
});

test('Indexierung: die Regel bleibt, die Shop-Domain kommt nur für Shop-Seiten und nur mit beiden Schaltern dazu', () => {
  const paths = indexablePaths(siteMap);
  const index = (path, env, host) => indexingDecision({ path, hosts: [host], env, paths });
  const BASE = { NEXIFY_INDEXING: 'enabled', VERCEL_ENV: 'production' };
  const ALL = { ...BASE, NEXIFY_INDEXING_TEILEKLAR: 'enabled' };
  // Ohne den Schalter der Shop-Domain ist teileklar.shop keine freigegebene Adresse (Verhalten wie bisher).
  for (const env of [BASE, ALL]) for (const host of SHOP_HOSTS) assert.deepEqual(index('/teileklar/shop', env, host), { index: false, reason: 'host_not_approved' });
  assert.deepEqual(index('/teileklar/shop', ALL, 'www.nexifyai.de'), { index: true, reason: 'allowed' });
  // Mit Schalter der Shop-Domain, aber ohne Freigabe der TEILEKLAR-Seiten: weiter gesperrt.
  assert.deepEqual(index('/teileklar/shop', { ...BASE, ...ON }, 'teileklar.shop'), { index: false, reason: 'teileklar_switch_off' });
  assert.deepEqual(index('/teileklar/shop', ON, 'teileklar.shop'), { index: false, reason: 'switch_off' });
  assert.deepEqual(index('/teileklar/shop', { ...ALL, ...ON, VERCEL_ENV: 'preview' }, 'teileklar.shop'), { index: false, reason: 'not_production' });
  // Mit allen Schaltern: Shop-Seiten nur auf teileklar.shop, nie auf www, nie mehr auf der Agentur-Domain; Agenturseiten nur dort.
  const FULL = { ...ALL, ...ON };
  for (const path of ['/teileklar', '/teileklar/shop', '/teileklar/produkt/123', '/teileklar/kategorie/7']) {
    assert.deepEqual(index(path, FULL, 'teileklar.shop'), { index: true, reason: 'allowed' }, path);
    for (const host of ['www.teileklar.shop', 'www.nexifyai.de', 'nexifyai.de', 'x.vercel.app']) assert.equal(index(path, FULL, host).index, false, host + path);
  }
  for (const path of ['/teileklar/kasse', '/teileklar/warenkorb', '/teileklar/suche', '/teileklar/konto', '/teileklar/admin']) assert.equal(index(path, FULL, 'teileklar.shop').index, false, path);
  for (const path of ['/', '/kontakt', '/anmelden', '/agb']) assert.deepEqual(index(path, FULL, 'teileklar.shop'), { index: false, reason: 'host_not_approved' }, path);
  assert.deepEqual(index('/kontakt', FULL, 'www.nexifyai.de'), { index: true, reason: 'allowed' });
  assert.deepEqual(indexingDecision({ path: '/teileklar/shop', hosts: ['teileklar.shop', 'x.vercel.app'], env: FULL, paths }), { index: false, reason: 'host_not_approved' });
});

test('robots.txt und Sitemap je Host: ohne Schalter die bisherige Datei, mit Schalter die Liste der jeweiligen Domain', () => {
  const robots = read('../../app/robots.ts');
  const list = JSON.parse('[' + /const disallow=\[([^\]]+)\];/.exec(robots)[1].replaceAll("'", '"') + ']');
  // Dieselbe Sperrliste wie vor der Änderung.
  assert.deepEqual(list, ['/api/', '/intern/', '/portal/', '/teileklar/kasse', '/teileklar/warenkorb', '/teileklar/bestellung/', '/teileklar/bestellungen', '/teileklar/konto', '/teileklar/partnerportal', '/teileklar/nachbarschaft']);
  assert.deepEqual(shopRobotsDisallow(list), ['/api/', '/kasse', '/warenkorb', '/bestellung/', '/bestellungen', '/konto', '/partnerportal', '/nachbarschaft']);
  assert.match(robots, /return\{rules:\{userAgent:'\*',allow:'\/',disallow\},sitemap:'https:\/\/www\.nexifyai\.de\/sitemap\.xml'\};/);
  // Kopfzeilen werden nur mit Schalter gelesen; ohne Schalter bleiben beide Dateien beim Build erzeugt.
  assert.match(robots, /if\(shopHostOn\(process\.env\)&&hostKind\(requestHosts\(\(await headers\(\)\)/);
  const sitemap = read('../../app/sitemap.ts');
  assert.match(sitemap, /const split=shopHostOn\(process\.env\),shop=split&&hostKind\(requestHosts\(\(await headers\(\)\)/);
  assert.match(sitemap, /const own=\(p:\{site_context:string\}\)=>!split\|\|\(p\.site_context==='teileklar'\)===shop;/);
  assert.match(sitemap, /\.\.\.\(shop\?\[\]:legalPages\)\.map\(/);
  // Canonical, hreflang und strukturierte Daten laufen über dieselbe Funktion.
  assert.match(read('../../lib/page-seo.ts'), /export const localizedUrl=\(path:string,locale:Locale\)=>publicUrl\(path,process\.env\)\+\(locale==='de'\?'':'\?lang='\+locale\);/);
  assert.match(read('../../lib/shop-server.ts'), /export const SHOP_CANONICAL=shopCanonicalBase\(process\.env\);/);
  assert.equal(shopCanonicalBase(ON), 'https://teileklar.shop');
  assert.equal(publicUrl('/teileklar', ON), 'https://teileklar.shop');
});

test('Die beiden Shop-Seiten mit fester Adresse im Seitenkopf nehmen sie aus derselben Funktion', () => {
  const home = read('../../app/teileklar/page.tsx'), shop = read('../../app/teileklar/shop/page.tsx');
  assert.match(home, /const SHOP_HOME_URL=publicUrl\('\/teileklar',process\.env\);/);
  assert.match(home, /alternates:\{canonical:SHOP_HOME_URL,languages:\{de:SHOP_HOME_URL,'x-default':SHOP_HOME_URL\}\}/);
  assert.match(shop, /const SHOP_URL=publicUrl\('\/teileklar\/shop',process\.env\);/);
  assert.match(shop, /alternates:\{canonical:SHOP_URL,languages:\{de:SHOP_URL,'x-default':SHOP_URL\}\}/);
  // Keine weitere fest eingetragene Shop-Adresse der Agentur-Domain in Seiten, Komponenten oder Bibliothek.
  assert.equal(publicUrl('/teileklar', {}), 'https://www.nexifyai.de/teileklar');
  assert.equal(publicUrl('/teileklar/shop', {}), 'https://www.nexifyai.de/teileklar/shop');
  assert.equal(publicUrl('/teileklar/shop', ON), 'https://teileklar.shop/shop');
});

test('Dateien aus public/ werden auf der Shop-Domain unverändert ausgeliefert: die Liste entspricht dem Verzeichnis', () => {
  const folders = readdirSync(new URL('../../public/', import.meta.url), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => '/' + entry.name).sort();
  assert.deepEqual([...PUBLIC_ASSET_FOLDERS].sort(), folders);
  const firstSegments = new Set(shopPagePaths.map(stripShopPrefix).map(path => '/' + path.split('/')[1]));
  for (const folder of PUBLIC_ASSET_FOLDERS) {
    assert.equal(firstSegments.has(folder), false, 'Kollision mit Shop-Seite: ' + folder);
    assert.deepEqual(decide('teileklar.shop', folder + '/datei.png'), pass(folder + '/datei.png', true));
    // Ohne Schalter und auf den Agentur-Domains wie bisher.
    assert.deepEqual(decide('www.nexifyai.de', folder + '/datei.png'), pass(folder + '/datei.png'));
  }
  // Kein geschützter Pfad liegt in einem dieser Ordner.
  for (const path of protectedPaths) assert.equal(PUBLIC_ASSET_FOLDERS.some(folder => path === folder || path.startsWith(folder + '/')), false, path);
});
