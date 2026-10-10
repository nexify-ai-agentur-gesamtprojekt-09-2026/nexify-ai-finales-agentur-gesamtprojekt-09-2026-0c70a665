#!/usr/bin/env node
// Selbstlern-Kreis (Orakel-Vorgabe: Nachtlauf, Quelle=Beobachtungen):
// Beobachtungen lesen -> Lehren/Muster extrahieren -> Jeff-Review -> speichern.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const MEM = 'http://127.0.0.1:3111/agentmemory';
const LIGHTRAG = 'http://127.0.0.1:9621';
function lrKey(){ for(const l of readFileSync('/opt/ai-stack/stack/.env','utf8').split('\n')) if(l.startsWith('LIGHTRAG_API_KEY=')) return l.split('=',2)[1].trim(); return ''; }
const KEY = lrKey();

// 1) Beobachtungen lesen
const mems = await (await fetch(`${MEM}/memories?limit=5000`)).json();
const memories = (mems.memories || mems) || [];
if (!Array.isArray(memories)) { console.error('keine memories'); process.exit(1); }

// 2) Muster/Lehren extrahieren
const conc = {};
for (const m of memories) for (const c of (m.concepts || [])) conc[c] = (conc[c] || 0) + 1;
const top = Object.entries(conc).sort((a,b)=>b[1]-a[1]).slice(0,20);
const recent = memories.filter(m=>m.strength>=7).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8);
const lehre = `Reflexion ${new Date().toISOString()}\nTop-Konzepte: ${top.map(([c,n])=>`${c}(${n})`).join(', ')}\nJüngste wichtige Entscheidungen:\n` + recent.map(r=>`- ${String(r.content).slice(0,100)}`).join('\n');

// 3) Lehre speichern (agentmemory + lightrag)
await fetch(`${MEM}/remember`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ content: lehre, concepts:['lernschleife','reflexion','lehren'] }) });
await fetch(`${LIGHTRAG}/documents/text`, { method:'POST', headers:{'content-type':'application/json','X-API-Key':KEY}, body: JSON.stringify({ text:'# Selbstlern-Reflexion\n\n'+lehre, file_source:`lernschleife-${Date.now()}` }) });

// 4) Jeff-Review
let jeff='';
try { jeff = execFileSync('nx-jeff', ['pruefe-aenderung','--was','Selbstlern-Reflexion: Lehren aus Beobachtungen extrahiert und gespeichert','--risiko','niedrig (nur Wissensindex)','--rollback','Indizes zuruecksetzen'], {encoding:'utf8'}).trim(); }
catch(e){ jeff = String(e.stdout||'')+String(e.stderr||''); }

console.log(JSON.stringify({ memories: memories.length, topKonzepte: top.slice(0,8).map(x=>x[0]), jeff: jeff.slice(0,300) }, null, 2));
