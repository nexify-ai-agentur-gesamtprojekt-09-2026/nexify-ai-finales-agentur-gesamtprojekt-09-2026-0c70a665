#!/usr/bin/env node
// Einheitliche Wissensabfrage (RAG-Kern): agentmemory + LightRAG zusammen.
// Aufruf: node tools/wissen-abfrage.mjs "Frage"
import { readFileSync } from 'node:fs';

const frage = process.argv.slice(2).join(' ') || 'Was ist das Designsystem?';
function lrKey() {
  for (const l of readFileSync('/opt/ai-stack/stack/.env','utf8').split('\n'))
    if (l.startsWith('LIGHTRAG_API_KEY=')) return l.split('=',2)[1].trim();
  return '';
}
const KEY = lrKey();

async function post(url, headers, body) {
  const r = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) });
  return r.json();
}

const out = { frage, agentmemory: null, lightrag: null };
try {
  const a = await post('http://127.0.0.1:3111/agentmemory/smart-search', {'Content-Type':'application/json'}, { query: frage, limit: 3 });
  out.agentmemory = (a.results || []).map((r) => (r.content || r.title || '').slice(0,160));
} catch (e) { out.agentmemory = 'fehler: ' + String(e).slice(0,80); }
try {
  const l = await post('http://127.0.0.1:9621/query', {'Content-Type':'application/json','X-API-Key':KEY}, { query: frage, mode:'hybrid' });
  out.lightrag = String(l.response || l.data || l.detail || '').slice(0,600);
} catch (e) { out.lightrag = 'fehler: ' + String(e).slice(0,80); }

console.log(JSON.stringify(out, null, 2));
