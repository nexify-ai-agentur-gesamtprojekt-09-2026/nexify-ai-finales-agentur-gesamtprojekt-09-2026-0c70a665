#!/usr/bin/env node
// Chat->Orchestrierung-Adapter (Demonstration, ohne LibreChat/myADMIN zu ändern).
// Klassifiziert eine Chat-Aufgabe, ruft die Orchestrierungs-API (:8908) auf.
const ORCH = 'http://127.0.0.1:8908/auftrag';

// Einfacher Typ-Klassifikator (im echten Betrieb: nx-jeff/LLM-Router)
function klassifiziere(text) {
  const t = text.toLowerCase();
  if (/wissen|rag|abfrage|finde|suche|erklär/.test(t)) return 'rag';
  if (/doku|dokument|dokumentation|readme/.test(t)) return 'doku';
  if (/design|farbe|token|style|css/.test(t)) return 'design';
  if (/deploy|live|produktion|release|schalten/.test(t)) return 'deploy';
  return 'rag';
}

const text = process.argv.slice(2).join(' ') || 'Was ist das Designsystem?';
const typ = klassifiziere(text);
const r = await fetch(ORCH, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ typ, ziel: text }) });
const d = await r.json();
const a = d.auftrag || {};
console.log(JSON.stringify({ chat: text.slice(0, 60), typ, agent: a.agent, zustand: a.zustand, jeff: d.jeff }, null, 2));
