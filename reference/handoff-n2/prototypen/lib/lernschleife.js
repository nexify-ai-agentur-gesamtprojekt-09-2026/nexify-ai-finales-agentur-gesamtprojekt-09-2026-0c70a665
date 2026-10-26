// NeXifyAI Lernschleife · jedes Signal wird zu genau einer Lernform · reine Funktionen, kein I/O
// Reihenfolge nach Bestpraxis: Regel/Prompt → Wissen (RAG) → Prüffall → Adapter (LoRA/DPO). Gewichte ändern sich nie live.
// Parameter: config/lernen.json. Übernahme jeder Lernform in den Betrieb nur über promotion() und Regelwerk R-10.

export const SIGNALARTEN = ["korrektur", "bewertung", "fehler", "vorfall", "hinweis"];
export const LERNFORMEN = {
  regel: "L1 Regel/Prompt-Vorschlag (versioniert, Freigabe Pascal)",
  wissen: "L2 Wissen: Fundstelle in LightRAG/AgentMemory",
  skill: "L3 Skill/Ablauf aus wiederholtem Erfolg",
  test: "L4 Prüffall (Regression) – jeder Fehler bekommt einen",
  praeferenz: "L5 Präferenzpaar für Adapter-Training (nur mit Einwilligung)",
  watchlist: "Watch-List: Muster beobachten, ab Schwelle Prüffall",
};
export class LernFehler extends Error { constructor(code, msg) { super(msg); this.name = "LernFehler"; this.code = code; } }

// Personenbezug vor jeder Speicherung entfernen (DSGVO Art. 5 Datenminimierung)
export function bereinigen(text) {
  return String(text ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g, "[IBAN]")
    .replace(/(?:\+|00)\d{2}[\s\/-]?\d{2,5}[\s\/-]?\d{3,}[\s\/-]?\d{0,6}|\b0\d{2,5}[\s\/-]?\d{4,9}\b/g, "[TEL]");
}

export function fingerabdruck(s) { // FNV-1a, stabil über Läufe, zum Zählen gleicher Muster (keine Sicherheitsfunktion)
  let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0");
}

export function neuerSpeicher() { return { signale: [], muster: {}, paare: [], version: 0 }; }

// Signal → Lernform. Deterministisch, damit dieselbe Lage immer dieselbe Folge hat.
export function ableiten(sig, anzahlGleich, cfg = {}) {
  const schwelle = cfg.watchlistSchwelle ?? 2;
  if (sig.art === "fehler" || sig.art === "vorfall") return "test";
  if (sig.art === "korrektur" && sig.typ === "fakt") return "wissen";
  if (sig.art === "korrektur" && sig.typ === "stil") return sig.einwilligung === true ? "praeferenz" : "regel";
  if (sig.art === "korrektur" && sig.typ === "ablauf") return anzahlGleich >= schwelle ? "skill" : "watchlist";
  if (sig.art === "hinweis") return "regel";
  if (sig.art === "bewertung" && sig.wert < 0) return anzahlGleich >= schwelle ? "test" : "watchlist";
  return "watchlist";
}

export function aufnehmen(speicher, sig, jetzt, cfg = {}) {
  if (!sig || !SIGNALARTEN.includes(sig.art)) throw new LernFehler("E_ART", "Signalart: " + SIGNALARTEN.join("|"));
  if (!sig.bereich) throw new LernFehler("E_BEREICH", "Bereich fehlt (z. B. posteingang, angebot, langlauf)");
  if (sig.art === "korrektur" && (sig.vorher == null || sig.nachher == null)) throw new LernFehler("E_PAAR", "Korrektur braucht vorher und nachher");
  if (sig.art === "bewertung" && ![-1, 1].includes(sig.wert)) throw new LernFehler("E_WERT", "Bewertung ist -1 oder 1");
  const s = { ...sig, text: bereinigen(sig.text), vorher: sig.vorher == null ? undefined : bereinigen(sig.vorher), nachher: sig.nachher == null ? undefined : bereinigen(sig.nachher), t: jetzt };
  const key = fingerabdruck(s.bereich + "|" + (s.muster || s.typ || s.art));
  const anzahl = (speicher.muster[key]?.anzahl || 0) + 1;
  if (speicher.signale.some((x) => x.id && x.id === s.id)) return { speicher, lernform: null, doppelt: true }; // idempotent
  const lernform = ableiten(s, anzahl, cfg);
  const muster = { ...speicher.muster, [key]: { anzahl, bereich: s.bereich, muster: s.muster || s.typ || s.art, letzte: jetzt, lernform } };
  const paare = lernform === "praeferenz" ? [...speicher.paare, { bereich: s.bereich, abgelehnt: s.vorher, gewaehlt: s.nachher, h: fingerabdruck(s.vorher + "→" + s.nachher) }] : speicher.paare;
  return { speicher: { signale: [...speicher.signale, s], muster, paare, version: speicher.version + 1 }, lernform, doppelt: false };
}

// Datensatz für Adapter-Training: nur Einwilligung, ohne Dubletten, mit Hash. Bereit erst ab Mindestgröße.
export function datensatz(speicher, bereich, cfg = {}) {
  const min = cfg.mindestPaare ?? 500;
  const gesehen = new Set(), paare = [];
  for (const p of speicher.paare) if (p.bereich === bereich && !gesehen.has(p.h)) { gesehen.add(p.h); paare.push(p); }
  return { bereich, anzahl: paare.length, bereit: paare.length >= min, fehlend: Math.max(0, min - paare.length), hash: fingerabdruck(paare.map((p) => p.h).join(",")), paare };
}

// Bewertungs-Gate: Kandidat gegen Basis auf dem festen Fragensatz je Vorgangsart.
export function promotion(kandidat, basis, cfg = {}) {
  const tol = cfg.toleranzPunkte ?? 0, kostenMax = cfg.kostenFaktorMax ?? 1.1;
  const gruende = [];
  for (const [art, b] of Object.entries(basis.treffer || {})) {
    const k = (kandidat.treffer || {})[art];
    if (k == null) gruende.push(art + ": nicht gemessen");
    else if (k < b - tol) gruende.push(art + ": " + k + " < " + b);
  }
  if ((kandidat.sicherheit ?? 0) < 100) gruende.push("Sicherheitsfälle " + (kandidat.sicherheit ?? 0) + " % (Pflicht 100 %)");
  if (kandidat.kostenCent > basis.kostenCent * kostenMax) gruende.push("Kosten je Vorgang über " + Math.round(kostenMax * 100) + " % der Basis");
  if (!kandidat.datensatzHash) gruende.push("Datensatz-Hash fehlt");
  return { entscheidung: gruende.length ? "ABGELEHNT" : "BESTANDEN", gruende };
}

// Canary: 0 → 5 → 25 → 100 %. Schlechte Messung = sofort zurück auf 0 (Vorversion). 100 % nur durch Pascal.
export const STUFEN = [0, 5, 25, 100];
export function rollout(stand, messung, wer) {
  const i = STUFEN.indexOf(stand.stufe);
  if (i < 0) throw new LernFehler("E_STUFE", "Stufe " + stand.stufe + " unbekannt");
  if (!messung || messung.ok !== true) return { ...stand, stufe: 0, rollbackAusgefuehrt: true, grund: (messung && messung.grund) || "Messung fehlt" };
  if (i === STUFEN.length - 1) return stand;
  const naechste = STUFEN[i + 1];
  if (naechste === 100 && wer !== "pascal") throw new LernFehler("E_RECHT", "100 % nur durch Pascal");
  if ((messung.stunden ?? 0) < (stand.mindestStunden ?? 48)) throw new LernFehler("E_DAUER", "Stufe " + stand.stufe + " braucht " + (stand.mindestStunden ?? 48) + " h Messung");
  return { ...stand, stufe: naechste, rollbackAusgefuehrt: false, grund: "" };
}

// ---------- Prüffälle ----------
const T = 1790000000000;
const S0 = () => neuerSpeicher();
const auf = (sig, sp = S0()) => aufnehmen(sp, sig, T);
const BASIS = { treffer: { anfrage: 86, support: 80 }, sicherheit: 100, kostenCent: 10 };
export const FAELLE = [
  { id: "LS01", art: "Positiv", t: "Fehler wird immer zum Prüffall", f: () => auf({ art: "fehler", bereich: "posteingang", muster: "Teilwort-Regex" }).lernform, soll: "test" },
  { id: "LS02", art: "Positiv", t: "Faktenkorrektur wird Wissen", f: () => auf({ art: "korrektur", bereich: "angebot", typ: "fakt", vorher: "Tagessatz 400 €", nachher: "Tagessatz 449 €" }).lernform, soll: "wissen" },
  { id: "LS03", art: "Positiv", t: "Stilkorrektur mit Einwilligung wird Präferenzpaar", f: () => auf({ art: "korrektur", bereich: "angebot", typ: "stil", vorher: "Sehr geehrte Damen und Herren", nachher: "Guten Tag", einwilligung: true }).speicher.paare.length, soll: 1 },
  { id: "LS04", art: "Negativ", t: "Stilkorrektur ohne Einwilligung nie ins Training", f: () => { const r = auf({ art: "korrektur", bereich: "angebot", typ: "stil", vorher: "a", nachher: "b" }); return r.lernform + "/" + r.speicher.paare.length; }, soll: "regel/0" },
  { id: "LS05", art: "Grenzwert", t: "Erste negative Bewertung → Watch-List, zweite gleiche → Prüffall", f: () => { const sig = { art: "bewertung", bereich: "workspace", muster: "Quelle fehlt", wert: -1 }; const a = auf(sig); return a.lernform + "/" + auf({ ...sig }, a.speicher).lernform; }, soll: "watchlist/test" },
  { id: "LS06", art: "Negativ", t: "E-Mail, IBAN und Telefon werden vor Speicherung entfernt", f: () => bereinigen("max@firma.de, DE89 3704 0044 0532 0130 00, +49 221 1234567"), soll: "[EMAIL], [IBAN], [TEL]" },
  { id: "LS07", art: "Negativ", t: "Korrektur ohne vorher/nachher abgelehnt", f: () => auf({ art: "korrektur", bereich: "x", typ: "fakt" }), fehler: "E_PAAR" },
  { id: "LS08", art: "Negativ", t: "Unbekannte Signalart abgelehnt", f: () => auf({ art: "gefuehl", bereich: "x" }), fehler: "E_ART" },
  { id: "LS09", art: "Grenzwert", t: "Gleiches Signal (id) zweimal wird nur einmal gezählt", f: () => { const s = { id: "s1", art: "fehler", bereich: "x" }; const a = auf(s); return auf(s, a.speicher).doppelt + "/" + a.speicher.signale.length; }, soll: "true/1" },
  { id: "LS10", art: "Grenzwert", t: "Datensatz unter Mindestgröße ist nicht bereit", f: () => { const sp = auf({ art: "korrektur", bereich: "angebot", typ: "stil", vorher: "a", nachher: "b", einwilligung: true }).speicher; const d = datensatz(sp, "angebot"); return d.bereit + "/" + d.fehlend; }, soll: "false/499" },
  { id: "LS11", art: "Positiv", t: "Dubletten zählen im Datensatz einmal", f: () => { let sp = S0(); for (let i = 0; i < 3; i++) sp = aufnehmen(sp, { art: "korrektur", bereich: "a", typ: "stil", vorher: "x", nachher: "y", einwilligung: true }, T).speicher; return datensatz(sp, "a", { mindestPaare: 1 }).anzahl; }, soll: 1 },
  { id: "LS12", art: "Positiv", t: "Besserer Kandidat besteht das Gate", f: () => promotion({ treffer: { anfrage: 88, support: 80 }, sicherheit: 100, kostenCent: 10, datensatzHash: "abc" }, BASIS).entscheidung, soll: "BESTANDEN" },
  { id: "LS13", art: "Negativ", t: "Rückschritt in einer Vorgangsart fällt durch", f: () => promotion({ treffer: { anfrage: 95, support: 79 }, sicherheit: 100, kostenCent: 9, datensatzHash: "abc" }, BASIS).gruende[0], soll: "support: 79 < 80" },
  { id: "LS14", art: "Negativ", t: "Ein Sicherheitsfall verfehlt → abgelehnt", f: () => promotion({ treffer: { anfrage: 90, support: 90 }, sicherheit: 99, kostenCent: 9, datensatzHash: "abc" }, BASIS).entscheidung, soll: "ABGELEHNT" },
  { id: "LS15", art: "Grenzwert", t: "Kosten 11 % über Basis → abgelehnt", f: () => promotion({ treffer: { anfrage: 90, support: 90 }, sicherheit: 100, kostenCent: 11.1, datensatzHash: "abc" }, BASIS).entscheidung, soll: "ABGELEHNT" },
  { id: "LS16", art: "Positiv", t: "Canary 5 → 25 nach 48 h guter Messung", f: () => rollout({ stufe: 5 }, { ok: true, stunden: 48 }, "director").stufe, soll: 25 },
  { id: "LS17", art: "Negativ", t: "25 → 100 durch Agent verweigert", f: () => rollout({ stufe: 25 }, { ok: true, stunden: 48 }, "director"), fehler: "E_RECHT" },
  { id: "LS18", art: "Rollback", t: "Schlechte Messung → sofort Vorversion", f: () => { const r = rollout({ stufe: 25 }, { ok: false, grund: "Treffer −4 Punkte" }, "director"); return r.stufe + "/" + r.rollbackAusgefuehrt; }, soll: "0/true" },
  { id: "LS19", art: "Grenzwert", t: "Zu kurze Messung blockiert den nächsten Schritt", f: () => rollout({ stufe: 5 }, { ok: true, stunden: 47 }, "pascal"), fehler: "E_DAUER" },
  { id: "LS20", art: "Grenzwert", t: "Ablauf-Korrektur zweimal → Skill-Kandidat", f: () => { const s = { art: "korrektur", bereich: "angebot", typ: "ablauf", muster: "Vorlage zuerst", vorher: "a", nachher: "b" }; const a = auf(s); return auf({ ...s }, a.speicher).lernform; }, soll: "skill" },
];
