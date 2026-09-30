#!/usr/bin/env node
// Jeff-Kontext vor jeder Arbeit: Orakel-Wissen (agentmemory + LightRAG) + nx-jeff-Entscheidung.
// Aufruf: node tools/jeff-kontext.mjs "Auftrag ..."
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const auftrag = process.argv.slice(2).join(' ') || 'unbekannter Auftrag';
function lrKey() {
  for (const l of readFileSync('/opt/ai-stack/stack/.env', 'utf8').split('\n'))
    if (l.startsWith('LIGHTRAG_API_KEY=')) return l.split('=', 2)[1].trim();
  return '';
}
const KEY = lrKey();
async function post(url, headers, body) {
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  return r.json();
}

const out = { auftrag, zeit: new Date().toISOString(), agentmemory: null, lightrag: null, jeff: null };
try {
  const a = await post('http://127.0.0.1:3111/agentmemory/smart-search', { 'Content-Type': 'application/json' }, { query: auftrag, limit: 4 });
  out.agentmemory = (a.results || []).map(r => (r.content || r.title || '').slice(0, 180));
} catch (e) { out.agentmemory = ['fehler: ' + String(e).slice(0, 80)]; }
try {
  const l = await post('http://127.0.0.1:9621/query', { 'Content-Type': 'application/json', 'X-API-Key': KEY }, { query: auftrag, mode: 'hybrid' });
  out.lightrag = String(l.response || l.data || '').slice(0, 600);
} catch (e) { out.lightrag = 'fehler: ' + String(e).slice(0, 80); }
try {
  out.jeff = execFileSync('nx-jeff', ['frage', '--state', JSON.stringify({ auftrag }), '--noul', 'richtung', 'Wie ist die Richtung/Freigabe fuer diesen Auftrag? (nur kurz)'], { encoding: 'utf8' }).trim();
} catch (e) { out.jeff = String(e.stdout || e.stderr || '').trim() || 'orakel nicht erreichbar'; }

console.log(JSON.stringify(out, null, 2));
