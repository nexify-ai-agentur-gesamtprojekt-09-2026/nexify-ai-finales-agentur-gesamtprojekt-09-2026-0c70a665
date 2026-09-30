#!/usr/bin/env node
// Tiefe Internetrecherche mit Quelllink-Kontrolle via 9Router /v1/search.
import { readFileSync } from 'node:fs';

const SEARXNG = process.env.SEARXNG_URL || 'http://127.0.0.1:8888';
const ROUTER = process.env.NINEROUTER_URL || 'http://127.0.0.1:20128';
const KEY = process.env.NINEROUTER_KEY || process.env.NX_ROUTER_KEY || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
const ROOT = (() => { for (const l of readFileSync('/etc/nexifyai/kanon/modelle.env','utf8').split('\n')) { if (l.startsWith('NX_ROUTER_URL=')) return l.split('=',2)[1].trim(); } return ROUTER; })();

export async function recherche(query, maxResults = 5) {
  const headers = { 'Content-Type': 'application/json' };
  if (KEY) headers.Authorization = 'Bearer ' + KEY;
  try {
    const r = await fetch(`${SEARXNG}/search?q=${encodeURIComponent(query)}&format=json`);
    const d = await r.json();
    const ergebnisse = (d.results || []).slice(0, maxResults).map((x) => ({ titel: x.title || '', url: x.url || '', text: (x.content || x.snippet || '').slice(0, 200) }));
    return { query, suchmaschine: 'SearXNG', anzahl: ergebnisse.length, ergebnisse, quellenGeprueft: ergebnisse.every((e) => e.url.startsWith('http')) };
  } catch (e) {
    return { query, fehler: String(e).slice(0, 120), suchmaschine: 'SearXNG' };
  }
}

// CLI: node tools/recherche.mjs "Thema"
const q = process.argv.slice(2).join(' ') || 'NeXify AI';
const r = await recherche(q);
console.log(JSON.stringify(r, null, 2));
