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
// agentmemory und LightRAG sind unabhängige Dienste -> parallel abfragen statt
// nacheinander (halbiert die Wartezeit, da jeweils auf den langsameren Dienst gewartet wird).
const [agentmemoryResult, lightragResult] = await Promise.allSettled([
  post('http://127.0.0.1:3111/agentmemory/smart-search', {'Content-Type':'application/json'}, { query: frage, limit: 3 }),
  post('http://127.0.0.1:9621/query', {'Content-Type':'application/json','X-API-Key':KEY}, { query: frage, mode:'hybrid' }),
]);
if (agentmemoryResult.status === 'fulfilled') {
  out.agentmemory = (agentmemoryResult.value.results || []).map((r) => (r.content || r.title || '').slice(0,160));
} else { out.agentmemory = 'fehler: ' + String(agentmemoryResult.reason).slice(0,80); }
if (lightragResult.status === 'fulfilled') {
  const l = lightragResult.value;
  out.lightrag = String(l.response || l.data || l.detail || '').slice(0,600);
} else { out.lightrag = 'fehler: ' + String(lightragResult.reason).slice(0,80); }

console.log(JSON.stringify(out, null, 2));
