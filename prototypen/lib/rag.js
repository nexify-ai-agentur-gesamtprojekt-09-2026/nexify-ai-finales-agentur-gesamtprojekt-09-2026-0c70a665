// NeXifyAI RAG-Kern · Delta-Sync mit Content-Hash, Eltern-Kind-Teile, Anfrage-Routing, zweistufiger Abruf, getrennte Güte-Metriken
// Reine Funktionen. Ergänzt lib/gedaechtnis.js (Speichern, Filter, Konflikte) und lib/ki-muster.js (RRF, Belegprüfung).
// Grundlage: Skill rag-pipeline-engineering-grundlagen · Parameter: config/rag.json

export class RagFehler extends Error { constructor(code, msg) { super(msg); this.name = "RagFehler"; this.code = code; } }

// Stabiler Inhalts-Hash (FNV-1a 64 bit als Hex, zwei Hälften) – nur zur Änderungserkennung, keine Sicherheitsfunktion.
// Im Dienst durch SHA-256 ersetzen (gleiche Schnittstelle).
export function inhaltsHash(text) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (const c of String(text).replace(/\r\n/g, "\n").trim()) { const k = c.codePointAt(0); a ^= k; a = Math.imul(a, 0x01000193) >>> 0; b ^= k; b = Math.imul(b ^ (b >>> 13), 0x5bd1e995) >>> 0; }
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(8, "0");
}

// ---------- Delta-Sync: was muss neu eingebettet, was gelöscht werden ----------
// quelle: [{ id, text, version? }]  index: [{ dokId, hash, teile:[teilId…], modell }]
export function syncPlan(quelle, index, modell) {
  if (!modell) throw new RagFehler("E_MODELL", "Einbettungsmodell fehlt – Query und Dokumente müssen dasselbe Modell nutzen");
  const idx = new Map(index.map((d) => [d.dokId, d])), q = new Map(quelle.map((d) => [d.id, d]));
  const plan = { neu: [], geaendert: [], unveraendert: [], geloescht: [], vollReindex: false };
  if (index.some((d) => d.modell !== modell)) { plan.vollReindex = true; plan.grund = "Einbettungsmodell gewechselt – Blue-Green-Neuaufbau"; }
  for (const d of quelle) { const h = inhaltsHash(d.text), alt = idx.get(d.id); if (!alt) plan.neu.push({ id: d.id, hash: h }); else if (alt.hash !== h || plan.vollReindex) plan.geaendert.push({ id: d.id, hash: h, alteTeile: alt.teile }); else plan.unveraendert.push(d.id); }
  for (const d of index) if (!q.has(d.dokId)) plan.geloescht.push({ id: d.dokId, teile: d.teile }); // verwaiste Vektoren entfernen
  plan.einbetten = plan.neu.length + plan.geaendert.length; plan.entfernenTeile = [...plan.geaendert, ...plan.geloescht].reduce((s, x) => s + (x.alteTeile || x.teile || []).length, 0);
  return plan;
}

// ---------- Eltern-Kind: kleine Teile suchen, Abschnitt als Kontext liefern ----------
export function elternKind(abschnitte, opt = {}) {
  const kind = opt.kindZeichen ?? 600, ueber = opt.ueberlappung ?? 0.15;
  const eltern = [], kinder = [];
  abschnitte.forEach((a, i) => {
    const eid = "E" + (i + 1); eltern.push({ id: eid, titel: a.titel, text: a.text });
    if (/^\s*\|.*\|\s*$/m.test(a.text) && a.text.length <= kind * 3) { kinder.push({ id: eid + ".1", eltern: eid, text: a.text }); return; } // Tabelle als Ganzes
    const saetze = a.text.split(/(?<=[.!?])\s+/); let akt = "", n = 0;
    const schliessen = () => { if (!akt.trim()) return; kinder.push({ id: eid + "." + (++n), eltern: eid, text: akt.trim() }); const rest = akt.slice(-Math.floor(kind * ueber)); akt = rest.includes(" ") ? rest.slice(rest.indexOf(" ") + 1) : ""; };
    for (const s of saetze) { if (akt.length + s.length > kind && akt) schliessen(); akt += (akt ? " " : "") + s; }
    schliessen();
  });
  return { eltern, kinder };
}
export function kontextAusTreffern(treffer, eltern, maxEltern = 3) {
  const e = new Map(eltern.map((x) => [x.id, x])), gesehen = []; for (const t of treffer) if (!gesehen.includes(t.eltern)) gesehen.push(t.eltern);
  return gesehen.slice(0, maxEltern).map((id) => e.get(id));
}

// ---------- Anfrage-Routing: Gewicht Stichwort vs. Bedeutung ----------
export function routing(anfrage) {
  const q = String(anfrage).trim(), w = q.split(/\s+/).filter(Boolean);
  const exakt = /\b([A-Z]{2}-\d{4}-\d{3,5}|RE-|AN-|NX-|[A-Z]{2,}\d+|\d{4,}|v\d+\.\d+)/.test(q) || /"[^"]+"/.test(q);
  if (exakt) return { art: "exakt", gewichte: [0.3, 0.7] }; // [Bedeutung, Stichwort]
  if (w.length <= 3) return { art: "kurz", gewichte: [0.5, 0.5] };
  return { art: "frage", gewichte: [0.7, 0.3] };
}

// ---------- Zweistufiger Abruf: breit (50) → neu bewerten → Schwelle statt fester Menge ----------
export function zweistufig(kandidaten, bewerten, opt = {}) {
  const breit = opt.breit ?? 50, schwelle = opt.schwelle ?? 0.5, max = opt.max ?? 8;
  const stufe1 = kandidaten.slice(0, breit);
  const stufe2 = stufe1.map((k) => ({ ...k, rerank: bewerten(k) })).sort((a, b) => b.rerank - a.rerank);
  const gewaehlt = stufe2.filter((k) => k.rerank >= schwelle).slice(0, max);
  return { gewaehlt, verworfen: stufe2.length - gewaehlt.length, bewertet: stufe1.length };
}

// ---------- Güte getrennt messen: Abruf (Precision/Recall) vs. Antwort (Belegtreue/Relevanz) ----------
export function abrufGuete(gefunden, relevant) {
  const g = new Set(gefunden), r = new Set(relevant); let tp = 0; for (const x of g) if (r.has(x)) tp++;
  return { precision: g.size ? tp / g.size : 0, recall: r.size ? tp / r.size : 1 };
}
export function antwortGuete(aussagen, belegt, beantwortet) {
  if (!aussagen) return { belegtreue: 1, relevanz: beantwortet ? 1 : 0 };
  return { belegtreue: belegt / aussagen, relevanz: beantwortet ? 1 : 0 };
}
// Goldener Satz: ein Lauf, Durchschnitt je Metrik, Ursache benennen
export function goldenerSatz(faelle, schwellen = {}) {
  const s = { precision: 0.6, recall: 0.8, belegtreue: 0.9, relevanz: 0.9, ...schwellen };
  const sum = { precision: 0, recall: 0, belegtreue: 0, relevanz: 0 };
  for (const f of faelle) { const a = abrufGuete(f.gefunden, f.relevant), b = antwortGuete(f.aussagen, f.belegt, f.beantwortet); for (const k of Object.keys(sum)) sum[k] += (a[k] ?? b[k]); }
  const m = Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, faelle.length ? v / faelle.length : 0]));
  const ursache = m.recall < s.recall ? "Abruf findet Relevantes nicht (Zerlegen, Routing, Modell prüfen)" : m.precision < s.precision ? "Abruf liefert zu viel Unpassendes (Filter, Reranking, Schwelle)" : m.belegtreue < s.belegtreue ? "Antwort geht über den Kontext hinaus (Prompt, Belegprüfung)" : m.relevanz < s.relevanz ? "Antwort trifft die Frage nicht" : null;
  return { werte: m, bestanden: !ursache, ursache };
}

// ---------- Prüffälle ----------
const Q = [{ id: "d1", text: "Gutscheine gelten 90 Tage." }, { id: "d2", text: "Tagessatz 449 € netto." }];
const IX = [{ dokId: "d1", hash: inhaltsHash("Gutscheine gelten 90 Tage."), teile: ["t1"], modell: "emb-v1" }, { dokId: "d9", hash: "x", teile: ["t8", "t9"], modell: "emb-v1" }];
export const FAELLE = [
  { id: "RG01", art: "Positiv", t: "Unveränderter Inhalt wird nicht neu eingebettet", f: () => syncPlan(Q, IX, "emb-v1").unveraendert.join(","), soll: "d1" },
  { id: "RG02", art: "Positiv", t: "Neues Dokument wird eingebettet", f: () => syncPlan(Q, IX, "emb-v1").neu.map((x) => x.id).join(","), soll: "d2" },
  { id: "RG03", art: "Negativ", t: "Verwaiste Vektoren gelöschter Dokumente werden entfernt", f: () => syncPlan(Q, IX, "emb-v1").entfernenTeile, soll: 2 },
  { id: "RG04", art: "Grenzwert", t: "Nur Leerraum geändert = gleicher Hash", f: () => inhaltsHash("Gutscheine gelten 90 Tage.\r\n") === inhaltsHash("Gutscheine gelten 90 Tage."), soll: true },
  { id: "RG05", art: "Negativ", t: "Modellwechsel erzwingt Voll-Neuaufbau", f: () => syncPlan(Q, IX, "emb-v2").vollReindex, soll: true },
  { id: "RG06", art: "Negativ", t: "Sync ohne Modell verboten", f: () => syncPlan(Q, IX), fehler: "E_MODELL" },
  { id: "RG07", art: "Positiv", t: "Tabelle bleibt ein Teil", f: () => elternKind([{ titel: "Preise", text: "| Leistung | Preis |\n|---|---|\n| Website | 4.800 € |" }]).kinder.length, soll: 1 },
  { id: "RG08", art: "Positiv", t: "Treffer liefert den Abschnitt, nicht nur den Teil", f: () => { const { eltern, kinder } = elternKind([{ titel: "A", text: "Satz eins ist hier. ".repeat(60) }], { kindZeichen: 200 }); return kontextAusTreffern([kinder[3], kinder[1]], eltern).length + "/" + (kinder.length > 3); }, soll: "1/true" },
  { id: "RG09", art: "Positiv", t: "Nummer in der Anfrage → Stichwort stärker", f: () => routing("Status RE-2026-0031").art, soll: "exakt" },
  { id: "RG10", art: "Positiv", t: "Lange Frage → Bedeutung stärker", f: () => routing("Wie löse ich einen Gutschein im Partnerportal ein?").gewichte[0], soll: 0.7 },
  { id: "RG11", art: "Grenzwert", t: "Schwelle statt fester Menge: schwache Treffer fallen raus", f: () => zweistufig([{ id: 1 }, { id: 2 }, { id: 3 }], (k) => [0.9, 0.49, 0.6][k.id - 1]).gewaehlt.map((k) => k.id).join(","), soll: "1,3" },
  { id: "RG12", art: "Positiv", t: "Abruf-Recall getrennt von Belegtreue gemessen", f: () => { const r = goldenerSatz([{ gefunden: ["a"], relevant: ["a", "b"], aussagen: 4, belegt: 4, beantwortet: true }]); return r.werte.recall + "/" + r.werte.belegtreue + "/" + r.bestanden; }, soll: "0.5/1/false" },
  { id: "RG13", art: "Positiv", t: "Ursache wird benannt, nicht nur »schlecht«", f: () => goldenerSatz([{ gefunden: ["a", "x", "y"], relevant: ["a"], aussagen: 2, belegt: 2, beantwortet: true }]).ursache, soll: "Abruf liefert zu viel Unpassendes (Filter, Reranking, Schwelle)" },
  { id: "RG14", art: "Positiv", t: "Guter Lauf besteht", f: () => goldenerSatz([{ gefunden: ["a"], relevant: ["a"], aussagen: 3, belegt: 3, beantwortet: true }]).bestanden, soll: true },
];
