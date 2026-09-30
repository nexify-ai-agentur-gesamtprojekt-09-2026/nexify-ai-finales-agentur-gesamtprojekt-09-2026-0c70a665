// NeXifyAI Selbstheilung · führt Runbooks aus config/runbooks.json nach Modus aus · reine Funktionen
// Modi: schatten (nur protokollieren) → vorschlag (Karte Stufe 2/3) → selbst (nur Stufe 1, nach Aufstieg). Hartsperren nie.
// Design § 3.3, Band 05 § 6. Karten über lib/entscheidungen.js, Lernsignale über lib/lernschleife.js.
export class HeilFehler extends Error { constructor(code, msg) { super(msg); this.name = "HeilFehler"; this.code = code; } }
const KATALOG = ["dienst.neustart:gateway", "dienst.neustart:worker", "version.zurueck", "router.rueckfall", "docker.image.prune.dangling", "zertifikat.erneuern", "karte", "karte+pruefffall", "stopp+karte", "prepaid.verwaiste.freigeben", "revolut.abgleich"];
const HART = /reboot|dns|firewall/i, H = 3600e3, TAG = 24 * H;

export function neuerStand(cfg) { return { runbooks: Object.fromEntries(cfg.runbooks.map((r) => [r.id, { modus: r.modus, ausloesungen: [], ausfuehrungen: [], schattenSeit: null, vorschlaegeOk: 0, abgelehnt: 0 }])), protokoll: [] }; }

// Entscheidet, was bei einem Auslöser passiert. Führt nichts aus – liefert die Absicht.
export function behandeln(cfg, stand, rbId, jetzt, befund = {}) {
  const rb = cfg.runbooks.find((r) => r.id === rbId); if (!rb) throw new HeilFehler("E_RB", "Runbook unbekannt: " + rbId);
  if (!KATALOG.includes(rb.massnahme) || HART.test(rb.massnahme)) throw new HeilFehler("E_KATALOG", "Maßnahme nicht im Katalog oder Hartsperre: " + rb.massnahme);
  const s = { ...stand.runbooks[rbId] };
  s.ausloesungen = [...s.ausloesungen, jetzt]; if (!s.schattenSeit && s.modus === "schatten") s.schattenSeit = jetzt;
  const letzteStunde = s.ausfuehrungen.filter((t) => jetzt - t < H).length;
  let absicht;
  if (letzteStunde >= (cfg.schleifensperreJeStunde ?? 3)) { s.modus = "vorschlag"; absicht = { art: "alarm", grund: "Schleifensperre: " + letzteStunde + " Ausführungen in 1 h", karte: { stufe: 2 } }; }
  else if (s.modus === "schatten") absicht = { art: "protokoll", wuerde: rb.massnahme };
  else if (s.modus === "selbst" && rb.stufe === 1) { s.ausfuehrungen = [...s.ausfuehrungen, jetzt]; absicht = { art: "ausfuehren", massnahme: rb.massnahme, pruefung: rb.pruefung, ruecknahme: rb.ruecknahme }; }
  else absicht = { art: "karte", karte: { quelle: "selbstheilung", titel: rbId + " · " + rb.ausloeser, aktion: { typ: rb.massnahme.startsWith("karte") || rb.massnahme.startsWith("stopp") ? "lesen" : "dienst.neustart", runbook: rbId, massnahme: rb.massnahme }, beleg: "Diagnose: " + rb.diagnose.join(", ") + (befund.text ? " · " + befund.text : ""), erwartet: rb.pruefung || "Pascal entscheidet", rueckweg: rb.ruecknahme || "keine Änderung ausgeführt" } };
  return { stand: { runbooks: { ...stand.runbooks, [rbId]: s }, protokoll: [...stand.protokoll, { t: jetzt, rb: rbId, art: absicht.art }] }, absicht };
}

// Ergebnis der Prüfung nach einer Ausführung: gescheitert = Rücknahme + Lernsignal fehler
export function nachpruefen(cfg, rbId, ok) {
  const rb = cfg.runbooks.find((r) => r.id === rbId);
  return ok ? { art: "fertig" } : { art: "ruecknahme", massnahme: rb.ruecknahme, lernsignal: { art: "fehler", bereich: "selbstheilung", muster: rbId + " Prüfung gescheitert" } };
}

// Antwort auf einen Vorschlag (aus dem Entscheidungs-Postfach) zählt für den Aufstieg
export function vorschlagErgebnis(stand, rbId, freigegeben) {
  const s = { ...stand.runbooks[rbId] }; if (freigegeben) s.vorschlaegeOk++; else { s.abgelehnt++; s.vorschlaegeOk = 0; }
  return { ...stand, runbooks: { ...stand.runbooks, [rbId]: s } };
}

// Aufstieg: nur vorwärts mit Beleg; Selbst nur Stufe 1 und nur wenn Pascal den Selbst-Modus grundsätzlich freigegeben hat
export function aufstieg(cfg, stand, rbId, jetzt) {
  const rb = cfg.runbooks.find((r) => r.id === rbId), s = stand.runbooks[rbId], a = cfg.aufstieg;
  if (s.modus === "schatten") { const tage = s.schattenSeit ? (jetzt - s.schattenSeit) / TAG : 0; if (tage >= a.schattenTage && s.ausloesungen.length >= a.schattenAusloesungen) return { nach: "vorschlag", karte: true }; return { nach: null, grund: "Schatten: " + Math.floor(tage) + "/" + a.schattenTage + " Tage, " + s.ausloesungen.length + "/" + a.schattenAusloesungen + " Auslösungen" }; }
  if (s.modus === "vorschlag") {
    if (rb.stufe !== a.selbstNurStufe) return { nach: null, grund: "Stufe " + rb.stufe + " bleibt immer Vorschlag" };
    if (a.selbstFreigabe !== true) return { nach: null, grund: "Selbst-Modus von Pascal nicht freigegeben" };
    if (s.vorschlaegeOk >= a.vorschlaegeOhneAblehnung) return { nach: "selbst", karte: true };
    return { nach: null, grund: s.vorschlaegeOk + "/" + a.vorschlaegeOhneAblehnung + " Vorschläge ohne Ablehnung" };
  }
  return { nach: null, grund: "bereits " + s.modus };
}

// ---------- Prüffälle ----------
const CFG = { schleifensperreJeStunde: 3, aufstieg: { schattenTage: 7, schattenAusloesungen: 5, vorschlaegeOhneAblehnung: 10, selbstNurStufe: 1, selbstFreigabe: "offen" }, runbooks: [
  { id: "RB-01", ausloeser: "health.rot", diagnose: ["ps"], massnahme: "dienst.neustart:gateway", pruefung: "health 13/13", ruecknahme: null, stufe: 1, modus: "schatten" },
  { id: "RB-02", ausloeser: "health.rot nach RB-01", diagnose: ["commit"], massnahme: "version.zurueck", pruefung: "health", ruecknahme: "version.vor", stufe: 2, modus: "schatten" },
  { id: "RB-X", ausloeser: "x", diagnose: [], massnahme: "server.reboot", stufe: 1, modus: "selbst" }] };
const T = Date.UTC(2026, 8, 28);
const mit = (modus, cfg = CFG) => { const s = neuerStand(cfg); s.runbooks["RB-01"].modus = modus; return s; };
export const FAELLE = [
  { id: "SH01", art: "Positiv", t: "Schatten führt nichts aus, protokolliert »würde«", f: () => { const r = behandeln(CFG, neuerStand(CFG), "RB-01", T).absicht; return r.art + "/" + r.wuerde; }, soll: "protokoll/dienst.neustart:gateway" },
  { id: "SH02", art: "Negativ", t: "Reboot als Maßnahme wird abgewiesen", f: () => behandeln(CFG, neuerStand(CFG), "RB-X", T), fehler: "E_KATALOG" },
  { id: "SH03", art: "Positiv", t: "Vorschlag erzeugt Karte mit Diagnose und Rückweg", f: () => { const k = behandeln(CFG, mit("vorschlag"), "RB-01", T).absicht.karte; return k.quelle + "/" + k.beleg.startsWith("Diagnose"); }, soll: "selbstheilung/true" },
  { id: "SH04", art: "Grenzwert", t: "Schleifensperre nach 3 Ausführungen in 1 h → Alarm, zurück auf Vorschlag", f: () => { let s = mit("selbst"); for (let i = 0; i < 3; i++) s = behandeln(CFG, s, "RB-01", T + i * 60e3).stand; const r = behandeln(CFG, s, "RB-01", T + 4 * 60e3); return r.absicht.art + "/" + r.stand.runbooks["RB-01"].modus; }, soll: "alarm/vorschlag" },
  { id: "SH05", art: "Negativ", t: "Stufe 2 steigt nie in den Selbst-Modus", f: () => { const s = neuerStand(CFG); s.runbooks["RB-02"].modus = "vorschlag"; s.runbooks["RB-02"].vorschlaegeOk = 50; return aufstieg(CFG, s, "RB-02", T).nach; }, soll: null },
  { id: "SH06", art: "Negativ", t: "Ohne Grundfreigabe von Pascal kein Selbst-Modus", f: () => { const s = mit("vorschlag"); s.runbooks["RB-01"].vorschlaegeOk = 10; return aufstieg(CFG, s, "RB-01", T).grund; }, soll: "Selbst-Modus von Pascal nicht freigegeben" },
  { id: "SH07", art: "Positiv", t: "Mit Grundfreigabe und 10 Vorschlägen → Aufstieg als Karte", f: () => { const c = { ...CFG, aufstieg: { ...CFG.aufstieg, selbstFreigabe: true } }; const s = mit("vorschlag", c); s.runbooks["RB-01"].vorschlaegeOk = 10; const a = aufstieg(c, s, "RB-01", T); return a.nach + "/" + a.karte; }, soll: "selbst/true" },
  { id: "SH08", art: "Rollback", t: "Eine Ablehnung setzt den Zähler auf 0", f: () => { let s = mit("vorschlag"); s.runbooks["RB-01"].vorschlaegeOk = 9; s = vorschlagErgebnis(s, "RB-01", false); return s.runbooks["RB-01"].vorschlaegeOk + "/" + s.runbooks["RB-01"].abgelehnt; }, soll: "0/1" },
  { id: "SH09", art: "Grenzwert", t: "Schatten zu kurz → kein Aufstieg", f: () => { let s = neuerStand(CFG); for (let i = 0; i < 5; i++) s = behandeln(CFG, s, "RB-01", T + i * TAG).stand; return aufstieg(CFG, s, "RB-01", T + 6 * TAG).nach; }, soll: null },
  { id: "SH10", art: "Positiv", t: "7 Tage und 5 Auslösungen → Vorschlag", f: () => { let s = neuerStand(CFG); for (let i = 0; i < 5; i++) s = behandeln(CFG, s, "RB-01", T + i * TAG).stand; return aufstieg(CFG, s, "RB-01", T + 7 * TAG).nach; }, soll: "vorschlag" },
  { id: "SH11", art: "Rollback", t: "Gescheiterte Prüfung → Rücknahme + Lernsignal", f: () => { const r = nachpruefen(CFG, "RB-02", false); return r.massnahme + "/" + r.lernsignal.art; }, soll: "version.vor/fehler" },
];
