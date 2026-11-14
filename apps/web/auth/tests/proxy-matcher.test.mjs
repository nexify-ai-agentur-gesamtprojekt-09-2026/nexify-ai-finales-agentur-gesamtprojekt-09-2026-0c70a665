import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../proxy.ts', import.meta.url), 'utf8');
const siteMap = JSON.parse(readFileSync(new URL('../../../../config/site-map.json', import.meta.url), 'utf8'));
// Der Ausdruck steht als Zeichenkette in der Quelle; hier wird er so ausgewertet, wie die Laufzeit ihn anwendet.
const literal = /matcher:\s*\[("(?:[^"\\]|\\.)*")\]/.exec(source)?.[1];
assert.ok(literal, 'matcher literal not found');
const matcher = new RegExp('^' + JSON.parse(literal) + '$');
const runs = path => matcher.test(path);

test('the proxy still runs for every page and every API path, including all protected ones', () => {
  for (const page of siteMap.pages) assert.equal(runs(page.path), true, page.path);
  for (const path of ['/', '/kontakt', '/teileklar', '/teileklar/produkt/123', '/api/chat', '/api/internal/workspace', '/api/internal/workspace/status',
    '/intern/workspace', '/portal/kunde', '/anmelden', '/unbekannt', '/sitemap.xml']) assert.equal(runs(path), true, path);
  // Eine Dateiendung unterhalb eines Ordners nimmt nichts aus: geschützte Bereiche bleiben erfasst.
  for (const path of ['/intern/bericht.png', '/portal/kunde/datei.svg', '/api/internal/workspace/export.txt', '/teileklar/konto/bild.jpg', '/api/x.png',
    '/mediathek', '/media', '/fonts', '/glassware/x', '/media%2F..%2Fintern/workspace']) assert.equal(runs(path), true, path);
});

test('static files skip the proxy', () => {
  for (const path of ['/_next/static/chunks/a.js', '/_next/image', '/favicon.ico', '/icon.svg', '/icon-192.png', '/portrait.png', '/signet.svg',
    '/manifest.webmanifest', '/robots.txt', '/media/atelier/film.mp4', '/media/home-loops/a.webm', '/media/presenters/x.vtt', '/fonts/inter-latin.woff2',
    '/glass/linse.svg']) assert.equal(runs(path), false, path);
});

test('no page of the site map lives under a folder that skips the proxy', () => {
  for (const page of siteMap.pages) assert.doesNotMatch(page.path, /^\/(?:media|fonts|glass)\//, page.path);
});
