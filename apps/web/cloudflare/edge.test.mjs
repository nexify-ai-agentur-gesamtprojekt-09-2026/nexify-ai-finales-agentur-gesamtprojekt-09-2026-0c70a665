import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cspFrom, isShopPath, shopTarget, withCsp } from './edge.mjs';

const vercel = JSON.parse(readFileSync(new URL('../../../vercel.json', import.meta.url), 'utf8'));

test('Shop-Wege decken genau die Weiterleitungen der vercel.json ab', () => {
  const sources = vercel.rewrites.filter(r => r.destination?.service === 'shop').map(r => r.source);
  assert.equal(sources.length, 9);
  for (const source of sources) {
    const base = source.replace('/:path*', '');
    assert.equal(isShopPath(base), true, base);
    if (source.endsWith('/:path*')) assert.equal(isShopPath(base + '/x/y'), true, source);
  }
  for (const own of ['/', '/api/chat', '/api/offers/1', '/api/internal/workspace/status', '/api/shopping', '/api/healthz', '/teileklar/shop', '/webhook/v1'])
    assert.equal(isShopPath(own), false, own);
});

test('Ziel nur bei gültiger fremder https-Herkunft; Pfad und Abfrage bleiben', () => {
  const req = 'https://nexify-web.example.workers.dev/api/shop/products?page=2';
  assert.equal(shopTarget(req, 'https://shop.example.org'), 'https://shop.example.org/api/shop/products?page=2');
  for (const bad of [undefined, '', 'http://shop.example.org', 'https://shop.example.org/pfad', 'https://u:p@shop.example.org', 'kein-url', 'https://nexify-web.example.workers.dev'])
    assert.equal(shopTarget(req, bad), null, String(bad));
});

test('Richtlinie stammt aus der vercel.json und wird nur ergänzt, nie überschrieben', async () => {
  const csp = cspFrom(vercel);
  assert.match(csp, /^default-src 'self';/);
  assert.match(csp, /frame-ancestors 'none'/);
  const added = withCsp(new Response('a', { status: 201, headers: { 'x-a': '1' } }), csp);
  assert.equal(added.headers.get('content-security-policy'), csp);
  assert.equal(added.status, 201);
  assert.equal(added.headers.get('x-a'), '1');
  assert.equal(await added.text(), 'a');
  const kept = withCsp(new Response('b', { headers: { 'Content-Security-Policy': "default-src 'none'" } }), csp);
  assert.equal(kept.headers.get('content-security-policy'), "default-src 'none'");
  assert.equal(cspFrom({}), null);
});
