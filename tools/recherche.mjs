#!/usr/bin/env node
/** Existing SearXNG search; no LLM invocation or router/credential-file lookup. */
import {pathToFileURL} from 'node:url';
const SEARXNG = process.env.SEARXNG_URL || 'http://127.0.0.1:8888';

export async function recherche(query, maxResults = 5, {fetch: request = globalThis.fetch} = {}) {
  try {
    const r = await request(`${SEARXNG}/search?q=${encodeURIComponent(query)}&format=json`);
    const d = await r.json();
    const ergebnisse = (d.results || []).slice(0, maxResults).map(x => ({
      titel:x.title||'',url:x.url||'',text:(x.content||x.snippet||'').slice(0,200)
    }));
    return {query,suchmaschine:'SearXNG',anzahl:ergebnisse.length,ergebnisse,
      model_invoked:false,quellenGeprueft:false,
      url_scheme_checked:ergebnisse.every(e=>e.url.startsWith('http')),
      source_content_review:'not_performed'};
  } catch {
    return {query,fehler:'search_unavailable',suchmaschine:'SearXNG',model_invoked:false,quellenGeprueft:false};
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await recherche(process.argv.slice(2).join(' ')||'NeXify AI'),null,2));
}
