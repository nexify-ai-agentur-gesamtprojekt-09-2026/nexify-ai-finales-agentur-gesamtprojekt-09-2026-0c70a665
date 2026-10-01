#!/usr/bin/env node
// Jeff-Kontext vor jeder Arbeit: Orakel-Wissen (agentmemory + LightRAG) + nx-jeff-Entscheidung.
// Aufruf: node tools/jeff-kontext.mjs "Auftrag ..."
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
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

// agentmemory, LightRAG und nx-jeff sind unabhaengige I/O-Aufrufe (zwei HTTP-Requests + ein
// Subprozess) - parallel statt sequentiell ausgefuehrt, damit die Gesamtlaufzeit dem langsamsten
// Aufruf statt der Summe aller drei entspricht. Fehlerformat je Quelle bleibt unveraendert.
async function holeAgentmemory() {
  try {
    const a = await post('http://127.0.0.1:3111/agentmemory/smart-search', { 'Content-Type': 'application/json' }, { query: auftrag, limit: 4 });
    return (a.results || []).map(r => (r.content || r.title || '').slice(0, 180));
  } catch (e) { return ['fehler: ' + String(e).slice(0, 80)]; }
}
async function holeLightrag() {
  try {
    const l = await post('http://127.0.0.1:9621/query', { 'Content-Type': 'application/json', 'X-API-Key': KEY }, { query: auftrag, mode: 'hybrid' });
    return String(l.response || l.data || '').slice(0, 600);
  } catch (e) { return 'fehler: ' + String(e).slice(0, 80); }
}
async function holeJeff() {
  try {
    const { stdout } = await execFileAsync('nx-jeff', ['frage', '--state', JSON.stringify({ auftrag }), '--noul', 'richtung', 'Wie ist die Richtung/Freigabe fuer diesen Auftrag? (nur kurz)']);
    return stdout.trim();
  } catch (e) { return String(e.stdout || e.stderr || '').trim() || 'orakel nicht erreichbar'; }
}

const [agentmemory, lightrag, jeff] = await Promise.all([holeAgentmemory(), holeLightrag(), holeJeff()]);
const out = { auftrag, zeit: new Date().toISOString(), agentmemory, lightrag, jeff };

console.log(JSON.stringify(out, null, 2));
