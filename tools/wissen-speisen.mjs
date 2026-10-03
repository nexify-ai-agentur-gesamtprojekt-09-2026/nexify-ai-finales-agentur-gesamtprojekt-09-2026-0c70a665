#!/usr/bin/env node
// P1 Wissensschicht: idempotente Speisung (nur geänderte Quellen) in agentmemory + LightRAG.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const QUELLEN = [
  { path: '/opt/nexifyai/zk/ZIELBILD.md', source: 'zielbild', desc: 'NeXify Zielbild und Zettelkasten (führend)' },
  { path: '/opt/nexifyai/zk/GESAMTINTEGRATION-PLAN.md', source: 'gesamtintegration-plan', desc: 'Gesamtintegration NeXify/Jeff Plan' },
  { path: join(root, 'packages/design-system/README.md'), source: 'designsystem', desc: 'NeXify Designsystem (fixes System)' },
  { path: join(root, 'docs/jeff-integration.md'), source: 'jeff-integration', desc: 'Jeff Einsatzorte und Konventionen' },
  { path: '/opt/nexifyai/zk/KONSOLIDIERTES-WISSEN-FRA.md', source: 'konsolidiertes-wissen-fra', desc: 'Historisches FRA-Wissen, datumsortiert + extrahiert (575 MD)' },
];
const STATE = join(root, 'docs/generiert/wissen-speisen-state.json');

const LIGHTRAG = 'http://127.0.0.1:9621';
function lrKey() {
  for (const l of readFileSync('/opt/ai-stack/stack/.env','utf8').split('\n'))
    if (l.startsWith('LIGHTRAG_API_KEY=')) return l.split('=',2)[1].trim();
  return '';
}
const KEY = lrKey();
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

let state = {};
if (existsSync(STATE)) try { state = JSON.parse(readFileSync(STATE, 'utf8')); } catch {}
async function post(url, headers, body) { const r = await fetch(url, { method:'POST', headers, body: JSON.stringify(body) }); return r.json(); }

// Jede Quelle ist unabhängig (eigene Datei, eigener LightRAG-/agentmemory-Eintrag)
// -> alle Quellen parallel speisen statt nacheinander. Spart bei mehreren
// geänderten Quellen die Summe aller Netzwerk-Round-Trips (bislang bis zu
// 2 * QUELLEN.length sequentielle HTTP-Requests).
let neu = 0, skip = 0, am = 0;
await Promise.all(QUELLEN.map(async (q) => {
  let text = '';
  try { text = readFileSync(q.path, 'utf8').trim(); } catch { console.log('FEHLT', q.source); return; }
  const h = hash(text);
  if (state[q.source] === h) { skip++; return; }
  const fs = `${q.source}-${h}`;
  // LightRAG-Speisung und agentmemory-Eintrag sind voneinander unabhängig
  // -> ebenfalls parallel statt nacheinander.
  const [lightragResult, agentmemoryResult] = await Promise.allSettled([
    post(`${LIGHTRAG}/documents/text`, { 'Content-Type':'application/json', 'X-API-Key':KEY }, { text: `# ${q.desc}\n\n${text.slice(0,6000)}`, file_source: fs }),
    post('http://127.0.0.1:3111/agentmemory/remember', { 'Content-Type':'application/json' }, { content: `${q.desc}: ${text.slice(0,400)}`, concepts: ['wissensschicht', q.source] }),
  ]);
  if (lightragResult.status === 'fulfilled') {
    const r = lightragResult.value ?? {};
    if (r.status === 'success') { neu++; state[q.source] = h; }
    else if (String(r.detail || r.status).includes('already contains')) { state[q.source] = h; skip++; }
    else console.log('LIGHTRAG-FEHLER', q.source, String(r.status || r.detail).slice(0,80));
  } else { console.log('LIGHTRAG-FEHLER', q.source, String(lightragResult.reason).slice(0,80)); }
  if (agentmemoryResult.status === 'fulfilled' && agentmemoryResult.value?.memory?.id) am++;
}));
mkdirSync(dirname(STATE), { recursive: true });
writeFileSync(STATE, JSON.stringify(state, null, 2));
console.log(`LightRAG neu: ${neu} · unverändert: ${skip} · agentmemory: ${am}/${QUELLEN.length}`);
