import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NOINDEX_HEADER_VALUE, indexablePaths } from '../indexing.ts';

// Bindet die Indexierungsregel (auth/indexing.ts, geprüft in indexing.test.mjs) an die Stelle, die sie durchsetzt: proxy.ts.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const proxySource = read('../../proxy.ts');
const paths = indexablePaths(JSON.parse(read('../../../../config/site-map.json')));

test('Der Proxy setzt die Regel als Kopfzeile durch und lässt die Sperre privater Bereiche unverändert', () => {
  assert.equal(NOINDEX_HEADER_VALUE, 'noindex, nofollow');
  // Bestehende Sperre privater Seiten (policy.test.mjs) bleibt wörtlich erhalten.
  assert.match(proxySource, /if\(privateRoute\(path,protectedPaths\)\)\{[^}]*response\.headers\.set\('X-Robots-Tag','noindex, nofollow'\);\}/);
  // Für alle übrigen Seiten entscheidet indexingDecision mit Host, X-Forwarded-Host, Umgebung und Katalogliste.
  assert.match(proxySource, /else if\(path!=='\/sitemap\.xml'&&!indexingDecision\(\{path,hosts:requestHosts\(request\.headers\.get\('host'\),request\.headers\.get\('x-forwarded-host'\)\),env:process\.env,paths:indexable\}\)\.index\)response\.headers\.set\('X-Robots-Tag',NOINDEX_HEADER_VALUE\);/);
  assert.match(proxySource, /const indexable = indexablePaths\(siteMap\);/);
  // Der Proxy läuft für jede Seite; nur dann greift die Kopfzeile überall (siehe proxy-matcher.test.mjs).
  const matcher = new RegExp('^' + JSON.parse(/matcher:\s*\[("(?:[^"\\]|\\.)*")\]/.exec(proxySource)[1]) + '$');
  for (const path of [...paths, '/teileklar/produkt/123', '/anmelden', '/gibt-es-nicht']) assert.equal(matcher.test(path), true, path);
});
