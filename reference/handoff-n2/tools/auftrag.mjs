#!/usr/bin/env node
// Auftrag-Vertrag + Zustandsmaschine + Journal + Jeff-Gate (Agenten-Orchestrierung).
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const REGEL = JSON.parse(readFileSync(join(root, 'config/agenten-regelwerk.json'), 'utf8'));
const JOURNAL = join(root, 'docs/generiert/auftraege-journal.jsonl');
const STATES = ['offen', 'aktiv', 'pruefung', 'abgenommen', 'abgelehnt', 'blockiert'];

function auswahl(typ) {
  const r = REGEL.regeln.find((x) => x.typ === typ);
  if (!r) return { agent: 'unbekannt', hartsperre: false };
  return { agent: r.agent, tools: r.tools, skills: r.skills, hartsperre: r.hartsperre };
}

function jeffGate(ziel) {
  try {
    return execFileSync('nx-jeff', ['pruefe-aenderung',
      '--was', `Auftrag freigeben: ${ziel}`,
      '--risiko', 'abhaengig von Auftragsart',
      '--rollback', 'Auftrag zuruecksetzen'], { encoding: 'utf8' }).trim();
  } catch (e) { return String(e.stdout || '') + String(e.stderr || ''); }
}

// Auftrag anlegen/übernehmen
const cmd = process.argv[2];
const auftrag = {
  id: 'auftrag-' + Date.now().toString(36),
  typ: process.argv[3] || 'rag',
  ziel: process.argv.slice(4).join(' ') || 'Beispielauftrag',
  zustand: 'offen',
  erstellt: new Date().toISOString(),
};
const sel = auswahl(auftrag.typ);
auftrag.agent = sel.agent; auftrag.tools = sel.tools || []; auftrag.skills = sel.skills || []; auftrag.hartsperre = sel.hartsperre;

function journal(e) {
  mkdirSync(dirname(JOURNAL), { recursive: true });
  writeFileSync(JOURNAL, JSON.stringify({ ...auftrag, event: e, zeit: new Date().toISOString() }) + '\n', { flag: 'a' });
}

journal('erstellt');

if (auftrag.hartsperre) {
  auftrag.zustand = 'blockiert';
  journal('hartsperre-mensch');
  console.log(JSON.stringify({ auftrag, hinweis: 'Hartsperre: nur Mensch' }, null, 2));
  process.exit(0);
}

// Zustandsübergang: offen -> aktiv -> pruefung -> abgenommen/abgelehnt
auftrag.zustand = 'aktiv'; journal('aktiv');

// Ausführung (Pilot): rag -> wissen-abfrage, doku -> docs-aktualisieren
try {
  if (auftrag.typ === 'rag') {
    auftrag.ergebnis = execFileSync('node', [join(root, 'tools', 'wissen-abfrage.mjs'), auftrag.ziel], { encoding: 'utf8' }).slice(0, 800);
  } else if (auftrag.typ === 'doku') {
    auftrag.ergebnis = execFileSync('node', [join(root, 'tools', 'docs-aktualisieren.mjs')], { encoding: 'utf8' }).slice(0, 800);
  }
} catch (e) { auftrag.ergebnis = String(e.stdout || '') + String(e.stderr || ''); }
journal('ausgefuehrt');

auftrag.zustand = 'pruefung'; journal('pruefung');
const jeff = jeffGate(auftrag.ziel);
let j = {};
try { j = JSON.parse(jeff); } catch {}
const entscheidung = j.entscheidung || 'rueckfrage';
auftrag.zustand = entscheidung === 'go' ? 'abgenommen' : 'abgelehnt';
journal(auftrag.zustand);

console.log(JSON.stringify({ auftrag, jeff: j.entscheidung || 'unbekannt', konfidenz: j.konfidenz, risiko: j.risiko_0_10, journal: JOURNAL }, null, 2));
