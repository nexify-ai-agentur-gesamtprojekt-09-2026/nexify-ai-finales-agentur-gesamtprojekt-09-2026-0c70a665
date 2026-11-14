// Einstieg des Workers `nexify-web` (wrangler.jsonc, "main"). Umschließt den von OpenNext erzeugten Worker
// (.open-next/worker.js, entsteht mit `pnpm cf:build`) und ersetzt zwei Dinge, die auf Vercel die vercel.json
// an der Wurzel leistet: die Content-Security-Policy und die Weiterleitung der Shop-API-Wege.
// Umzugsplan und Messwerte: docs/04-betrieb/cloudflare-umzug-2026-11-14.md
import openNext from '../.open-next/worker.js';
import vercelConfig from '../../../vercel.json';
import { cspFrom, isShopPath, shopTarget, withCsp, withNoindex } from './edge.mjs';

// Eine Quelle für die Richtlinie, solange Vercel parallel ausliefert.
const CSP = cspFrom(vercelConfig);
const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' },
});

export default {
  async fetch(request, env, ctx) {
    // Auf *.workers.dev zusätzlich `X-Robots-Tag: noindex, nofollow`; auf einer eigenen Domain unverändert.
    return withNoindex(await respond(request, env, ctx), new URL(request.url).hostname);
  },
};

async function respond(request, env, ctx) {
  const url = new URL(request.url);
  if (isShopPath(url.pathname)) {
    // apps/shop-api (FastAPI) läuft nicht auf diesem Worker. Ohne Ziel ehrlich 503 statt einer 404-Seite.
    const target = shopTarget(request.url, env.SHOP_API_ORIGIN);
    if (!target) return withCsp(json({ error: 'shop_api_origin_not_configured' }, 503), CSP);
    const forwarded = new Request(target, request);
    forwarded.headers.set('x-forwarded-host', url.host);
    forwarded.headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
    return withCsp(await fetch(forwarded, { redirect: 'manual' }), CSP);
  }
  return withCsp(await openNext.fetch(request, env, ctx), CSP);
}
