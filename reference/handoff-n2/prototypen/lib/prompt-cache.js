// NeXifyAI Prompt-Cache-Kern · Aufbau stabil → variabel, Breakpoints, Invalidierungs-Prüfung, Wirtschaftlichkeit, Trefferquote
// Reine Funktionen. Setzt die Schichten S1–S6 (config/llm-verbindungen.json kontext) in Anbieter-Blöcke um.
// Grundlage: Skill prompt-caching-kosten-latenz-optimierung · Parameter: config/prompt-cache.json
import { inhaltsHash } from "./rag.js";

export class CacheFehler extends Error { constructor(code, msg) { super(msg); this.name = "CacheFehler"; this.code = code; } }
export const REIHENFOLGE = ["S1", "S2", "S3", "S4", "S5", "S6"]; // System · Regeln · Skills+Werkzeuge · Wissen · Vorgang · Eingabe
const MAX_BREAKPOINTS = 4;

// Muster, die einen Prefix bei jedem Aufruf verändern – dürfen nie vor dem letzten Breakpoint stehen
const VARIABEL = [
  [/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Zeitstempel"], [/\b(heute ist|today is|aktuelles datum|current date)\b/i, "Datumssatz"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i, "UUID"], [/\{\{?\s*[a-z_]+\s*\}?\}/i, "unausgefüllter Platzhalter"],
  [/\b(sitzung|session|nutzer-id|user[_-]?id)\s*[:=]/i, "Sitzungswert"],
];

// Kopfzeilen der Prompt-Datei (Status, Freigabe) sind Verwaltung, kein Modellinhalt → vor dem Senden entfernen
export function promptText(datei) { const s = String(datei).replace(/\r\n/g, "\n"); const i = s.indexOf("\n---\n"); return (i >= 0 ? s.slice(i + 5) : s).replace(/[ \t]+$/gm, "").trim(); }

export function werkzeugeSortiert(tools) { return [...tools].sort((a, b) => a.name.localeCompare(b.name)).map((t) => JSON.parse(JSON.stringify(t, Object.keys(t).sort()))); }

// Schichten → Blöcke mit Breakpoints. Stabile Schichten gecacht, S4 mit Versions-Hash, S5 Verlauf bis zum letzten abgeschlossenen Zug.
export function aufbauen(schichten, opt = {}) {
  const cache = opt.cacheSchichten ?? ["S1", "S2", "S3"];
  const bloecke = [], befunde = [];
  let letzterBp = -1;
  for (const id of REIHENFOLGE) {
    const s = schichten[id]; if (s == null || s === "") continue;
    let text = typeof s === "string" ? s : s.text;
    if (id === "S4" && s.version) text = `[Wissensstand ${s.version} · ${inhaltsHash(text)}]\n` + text; // Inhaltsänderung = neuer Eintrag
    const cachen = cache.includes(id) || (id === "S4" && s.stabil === true) || (id === "S5" && opt.verlaufCachen);
    bloecke.push({ schicht: id, text, cache: cachen });
    if (cachen) letzterBp = bloecke.length - 1;
  }
  // Breakpoints: höchstens 4, bevorzugt an den letzten gecachten Blöcken je Gruppe
  const bp = bloecke.map((b, i) => (b.cache ? i : -1)).filter((i) => i >= 0);
  const gesetzt = bp.slice(-MAX_BREAKPOINTS);
  bloecke.forEach((b, i) => { b.breakpoint = gesetzt.includes(i); });
  // Prüfung: variable Werte vor dem letzten Breakpoint
  bloecke.slice(0, letzterBp + 1).forEach((b) => { for (const [re, art] of VARIABEL) if (re.test(b.text)) befunde.push({ schicht: b.schicht, art, folge: "Cache verfällt bei jedem Aufruf" }); });
  const unsortiert = opt.werkzeuge && JSON.stringify(opt.werkzeuge) !== JSON.stringify(werkzeugeSortiert(opt.werkzeuge));
  if (unsortiert) befunde.push({ schicht: "S3", art: "Werkzeuge nicht deterministisch sortiert", folge: "Cache verfällt bei jeder anderen Reihenfolge" });
  return { bloecke, breakpoints: gesetzt.length, befunde, ok: befunde.length === 0, prefixHash: inhaltsHash(bloecke.slice(0, letzterBp + 1).map((b) => b.text).join("\n\u0000")) };
}

// Anthropic-Format (system + messages); andere Anbieter bekommen dieselbe Reihenfolge ohne Markierung
export function anthropicAnfrage(aufbau, werkzeuge = []) {
  const sys = aufbau.bloecke.filter((b) => ["S1", "S2", "S3"].includes(b.schicht)).map((b) => ({ type: "text", text: b.text, ...(b.breakpoint ? { cache_control: { type: "ephemeral" } } : {}) }));
  const nutzer = aufbau.bloecke.filter((b) => !["S1", "S2", "S3"].includes(b.schicht)).map((b) => ({ type: "text", text: b.text, ...(b.breakpoint ? { cache_control: { type: "ephemeral" } } : {}) }));
  const tools = werkzeugeSortiert(werkzeuge); if (tools.length) tools[tools.length - 1].cache_control = { type: "ephemeral" };
  return { system: sys, tools, messages: [{ role: "user", content: nutzer }] };
}

// Lohnt sich Cachen? Schreiben kostet 1,25× (5 min) bzw. 2× (1 h), Lesen 0,1× – Faktoren aus config, nie geraten
export function lohntSich(prefixTokens, aufrufeInTtl, f = { schreiben: 1.25, lesen: 0.1 }) {
  if (!(prefixTokens > 0) || !(aufrufeInTtl >= 1)) throw new CacheFehler("E_WERTE", "Tokens > 0, Aufrufe ≥ 1");
  const ohne = prefixTokens * aufrufeInTtl, mit = prefixTokens * f.schreiben + prefixTokens * f.lesen * (aufrufeInTtl - 1);
  return { lohnt: mit < ohne, ersparnis: 1 - mit / ohne, abAufruf: Math.ceil(1 + (f.schreiben - 1) / (1 - f.lesen)) };
}

// Trefferquote aus usage-Feldern (je Antwort geloggt): stilles Dauer-Verfehlen erkennen
export function trefferquote(usages, opt = {}) {
  let lesen = 0, schreiben = 0, normal = 0;
  for (const u of usages) { lesen += u.cache_read_input_tokens || 0; schreiben += u.cache_creation_input_tokens || 0; normal += u.input_tokens || 0; }
  const quote = lesen + schreiben ? lesen / (lesen + schreiben) : 0, min = opt.mindestQuote ?? 0.6;
  return { quote, alarm: usages.length >= (opt.mindestAufrufe ?? 20) && quote < min, lesen, schreiben, normal };
}

// ---------- Prüffälle ----------
const S1 = "# S1 · Orchestrator · Version 1.0.0\n\n**Status:** aktiv · **Freigabe:** Pascal, 28.09.2026\n\n---\n\nDu bist der Master-Orchestrator.  \n";
export const FAELLE = [
  { id: "PC01", art: "Positiv", t: "Verwaltungskopf wird vor dem Senden entfernt", f: () => promptText(S1), soll: "Du bist der Master-Orchestrator." },
  { id: "PC02", art: "Positiv", t: "Reihenfolge stabil → variabel, egal wie übergeben", f: () => aufbauen({ S6: "Frage", S1: "Rolle", S4: "Wissen", S2: "Regeln" }).bloecke.map((b) => b.schicht).join(","), soll: "S1,S2,S4,S6" },
  { id: "PC03", art: "Negativ", t: "Datum im System-Prompt wird gemeldet", f: () => aufbauen({ S1: "Rolle. Heute ist Montag.", S6: "x" }).befunde[0].art, soll: "Datumssatz" },
  { id: "PC04", art: "Positiv", t: "Datum in der Eingabe (S6) ist erlaubt", f: () => aufbauen({ S1: "Rolle", S6: "Heute ist der 28.09., was steht an?" }).ok, soll: true },
  { id: "PC05", art: "Negativ", t: "Unsortierte Werkzeuge werden gemeldet", f: () => aufbauen({ S1: "R", S3: "Skills" }, { werkzeuge: [{ name: "zz" }, { name: "aa" }] }).befunde[0].schicht, soll: "S3" },
  { id: "PC06", art: "Positiv", t: "Werkzeuge in fester Reihenfolge, letztes markiert", f: () => { const a = anthropicAnfrage(aufbauen({ S1: "R" }), [{ name: "zz" }, { name: "aa" }]); return a.tools.map((t) => t.name).join(",") + "/" + !!a.tools[1].cache_control; }, soll: "aa,zz/true" },
  { id: "PC07", art: "Grenzwert", t: "Höchstens 4 Breakpoints", f: () => aufbauen({ S1: "a", S2: "b", S3: "c", S4: { text: "d", stabil: true, version: "v1" }, S5: "e" }, { verlaufCachen: true }).breakpoints, soll: 4 },
  { id: "PC08", art: "Positiv", t: "Geändertes Wissen ergibt neuen Prefix (kein veralteter Treffer)", f: () => aufbauen({ S1: "R", S4: { text: "Preis 449 €", stabil: true, version: "v1" } }).prefixHash !== aufbauen({ S1: "R", S4: { text: "Preis 499 €", stabil: true, version: "v1" } }).prefixHash, soll: true },
  { id: "PC09", art: "Grenzwert", t: "Nur Leerraum am Zeilenende ändert den Prefix nicht", f: () => aufbauen({ S1: promptText("---\nRolle  ") }).prefixHash === aufbauen({ S1: promptText("---\nRolle") }).prefixHash, soll: true },
  { id: "PC10", art: "Grenzwert", t: "Ein Aufruf: Cachen lohnt nicht", f: () => lohntSich(3000, 1).lohnt, soll: false },
  { id: "PC11", art: "Positiv", t: "Ab dem 2. Aufruf lohnt es (5-min-TTL)", f: () => lohntSich(3000, 2).lohnt + "/" + lohntSich(3000, 2).abAufruf, soll: "true/2" },
  { id: "PC12", art: "Positiv", t: "10 Aufrufe sparen 78,5 % (nachgerechnet; Skill nennt »über 80 %« – stimmt erst ab 13 Aufrufen)", f: () => Math.round(lohntSich(3000, 10).ersparnis * 1000) / 10 + "/" + (lohntSich(3000, 13).ersparnis > 0.8), soll: "78.5/true" },
  { id: "PC13", art: "Negativ", t: "Dauerhafte Fehlschläge lösen Alarm aus", f: () => trefferquote(Array.from({ length: 20 }, () => ({ cache_creation_input_tokens: 3000 }))).alarm, soll: true },
];
