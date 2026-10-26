// NeXifyAI Langlauf-Kern · dauerhafte Agenten-Läufe über Stunden/Tage · reine Funktionen, kein I/O
// Der Director besitzt den Zustand. Modelle sind austauschbare Arbeiter. Jeder Schritt ist checkpointbar.
export class LaufFehler extends Error {
  constructor(code, msg) { super(msg); this.name = "LaufFehler"; this.code = code; }
}

// ---------- Pipeline: Aufgabe → Artefakt + Subagenten ----------
export const PIPELINE = [
  { id: "wissen",     name: "Wissen sammeln",       agent: "sammler",    braucht: [],                     tiefe: "alle Brains, MD, Dateien, Chats", parallel: true },
  { id: "recherche",  name: "Bestpraxis-Recherche", agent: "rechercheur", braucht: [],                    tiefe: "3 Ebenen, ≥ 8 Primärquellen, ≤ 30 Tage alt", parallel: true },
  { id: "profil",     name: "Anforderungsprofil",   agent: "analyst",    braucht: ["wissen", "recherche"], tiefe: "Funktionen, Abläufe, Logiken, Ziel, Akzeptanz" },
  { id: "vergleich",  name: "Lösungsvergleich",     agent: "architekt",  braucht: ["profil"],              tiefe: "≥ 3 Lösungen je Anforderung, Muster übernehmen" },
  { id: "loesung",    name: "Gesamtlösung",         agent: "director",   braucht: ["vergleich"],           tiefe: "eine WebUI, Plan, Tests, Gate", mensch: "Freigabe Umsetzung" },
];

export const ZUSTAENDE = ["neu", "laeuft", "wartet", "pausiert", "fertig", "fehler", "abgebrochen"];
const ENDE = new Set(["fertig", "abgebrochen"]);
export const BUDGET_MAX_CENT = 5000; // = config/langlauf.json lauf.budgetCentMax

export function neuerLauf(id, aufgabe, jetzt, opt = {}) {
  if (!id || typeof id !== "string") throw new LaufFehler("E_ID", "Lauf-ID fehlt");
  if (typeof aufgabe !== "string" || !aufgabe.trim()) throw new LaufFehler("E_AUFGABE", "Aufgabe leer");
  return {
    id, aufgabe: aufgabe.trim(), zustand: "neu", erstellt: jetzt, version: 0,
    budgetCent: opt.budgetCent ?? 200, verbrauchtCent: 0,
    maxStunden: opt.maxStunden ?? 72,
    lease: null, leasePflicht: opt.leasePflicht === true, wartetAuf: null,
    schritte: Object.fromEntries(PIPELINE.map((p) => [p.id, { zustand: "neu", versuche: 0, ergebnis: null, fehler: null, gesperrt: false, schluessel: id + ":" + p.id }])),
    kontext: { fest: [], verlauf: [], zusammenfassung: "" },
    log: [],
  };
}

// ---------- Planung: welche Schritte dürfen jetzt laufen ----------
export function bereit(lauf) {
  if (ENDE.has(lauf.zustand) || lauf.zustand === "pausiert" || lauf.zustand === "wartet") return [];
  return PIPELINE.filter((p) => {
    const s = lauf.schritte[p.id];
    if (s.gesperrt || (s.zustand !== "neu" && s.zustand !== "fehler")) return false;
    return p.braucht.every((b) => lauf.schritte[b].zustand === "fertig");
  }).map((p) => p.id);
}

// ---------- Lease/Heartbeat: genau ein Director arbeitet am Lauf ----------
export function lease(lauf, besitzer, jetzt, ttlSek = 900) {
  if (ttlSek < 60 || ttlSek > 3600) throw new LaufFehler("E_TTL", "TTL 60–3600 s");
  const l = lauf.lease;
  if (l && l.besitzer !== besitzer && l.bis > jetzt) throw new LaufFehler("E_LEASE", "Lauf gehört " + l.besitzer);
  return { ...lauf, lease: { besitzer, bis: jetzt + ttlSek * 1000, puls: jetzt } };
}

export function leaseFreigeben(lauf, besitzer, jetzt) {
  if (lauf.lease && lauf.lease.besitzer !== besitzer && lauf.lease.bis > jetzt) throw new LaufFehler("E_LEASE", "Lauf gehört " + lauf.lease.besitzer);
  return { ...lauf, lease: null };
}

// Schranke: wer einen Besitzer nennt, muss den aktiven Lease halten; bei leasePflicht muss jeder ihn halten.
function pruefeLease(lauf, besitzer, jetzt) {
  const l = lauf.lease, aktiv = l && l.bis > jetzt;
  if (aktiv && besitzer && l.besitzer !== besitzer) throw new LaufFehler("E_LEASE", "Lauf gehört " + l.besitzer);
  if (lauf.leasePflicht && (!aktiv || !besitzer || l.besitzer !== besitzer)) throw new LaufFehler("E_LEASE", "Kein gültiger Lease für " + (besitzer || "unbekannt"));
}

// ---------- Schritt-Übergänge (idempotent) ----------
export function starte(lauf, schritt, jetzt, besitzer) {
  const s = lauf.schritte[schritt];
  if (!s) throw new LaufFehler("E_SCHRITT", "Unbekannter Schritt " + schritt);
  pruefeLease(lauf, besitzer, jetzt);
  if (zeitUeberschritten(lauf, jetzt)) throw new LaufFehler("E_ZEIT", "Laufzeitgrenze " + lauf.maxStunden + " h erreicht");
  if (s.versuche >= 3) throw new LaufFehler("E_VERSUCHE", schritt + ": 3 Versuche erreicht");
  if (!bereit(lauf).includes(schritt)) throw new LaufFehler("E_REIHENFOLGE", schritt + " ist noch nicht bereit");
  return mit(lauf, schritt, { zustand: "laeuft", versuche: s.versuche + 1, fehler: null }, "laeuft", jetzt, "start " + schritt);
}

export function erledige(lauf, schritt, ergebnis, kostenCent, jetzt, schluessel, besitzer) {
  const s = lauf.schritte[schritt];
  if (!s) throw new LaufFehler("E_SCHRITT", "Unbekannter Schritt " + schritt);
  pruefeLease(lauf, besitzer, jetzt);
  if (schluessel && schluessel !== s.schluessel) throw new LaufFehler("E_SCHLUESSEL", "Idempotenz-Schlüssel passt nicht");
  if (s.zustand === "fertig") return lauf; // Wiederholung nach Abbruch: kein Doppelgebucht
  if (s.zustand !== "laeuft") throw new LaufFehler("E_ZUSTAND", schritt + " läuft nicht");
  if (!ergebnis || (typeof ergebnis === "string" && !ergebnis.trim())) throw new LaufFehler("E_LEER", schritt + ": leeres Ergebnis ist kein Abschluss");
  if (!Number.isInteger(kostenCent) || kostenCent < 0) throw new LaufFehler("E_KOSTEN", "Kosten in ganzen Cent");
  let l = mit(lauf, schritt, { zustand: "fertig", ergebnis }, lauf.zustand, jetzt, "fertig " + schritt);
  l = { ...l, verbrauchtCent: l.verbrauchtCent + kostenCent };
  const p = PIPELINE.find((x) => x.id === schritt);
  if (p.mensch) l = { ...l, wartetAuf: p.mensch, log: [...l.log, { t: jetzt, e: "wartet auf Mensch: " + p.mensch }] };
  // Vorrang: Budgetpause > Warten auf Mensch > fertig. Die offene Freigabe bleibt in wartetAuf erhalten.
  if (l.verbrauchtCent > l.budgetCent) return { ...l, zustand: "pausiert", log: [...l.log, { t: jetzt, e: "Budget erreicht, pausiert" }] };
  if (l.wartetAuf) return { ...l, zustand: "wartet" };
  if (PIPELINE.every((x) => l.schritte[x.id].zustand === "fertig")) return { ...l, zustand: "fertig" };
  return l;
}

export function scheitere(lauf, schritt, fehlerKlasse, jetzt, besitzer) {
  const erlaubt = ["zeit", "netz", "modell", "schema"];
  if (!erlaubt.includes(fehlerKlasse)) throw new LaufFehler("E_KLASSE", "Fehlerklasse benennen: " + erlaubt.join("|"));
  pruefeLease(lauf, besitzer, jetzt);
  const s = lauf.schritte[schritt];
  // schema: nicht automatisch wiederholen (config/llm-verbindungen.json wiederholung.nichtBei)
  const endgueltig = s.versuche >= 3 || fehlerKlasse === "schema";
  return mit(lauf, schritt, { zustand: "fehler", fehler: fehlerKlasse, gesperrt: endgueltig }, endgueltig ? "wartet" : lauf.zustand, jetzt, "fehler " + schritt + " (" + fehlerKlasse + ")" + (endgueltig ? ", gesperrt bis Freigabe" : ""));
}

export function freigeben(lauf, wer, jetzt) {
  if (lauf.zustand !== "wartet") throw new LaufFehler("E_ZUSTAND", "Nichts wartet auf Freigabe");
  if (wer !== "pascal") throw new LaufFehler("E_RECHT", "Nur Pascal gibt frei");
  // Freigabe entsperrt gesperrte Schritte und gibt ihnen neue Versuche.
  const schritte = Object.fromEntries(Object.entries(lauf.schritte).map(([k, s]) => [k, s.gesperrt ? { ...s, gesperrt: false, versuche: 0 } : s]));
  const offen = PIPELINE.some((x) => schritte[x.id].zustand !== "fertig");
  return { ...lauf, schritte, wartetAuf: null, zustand: offen ? "laeuft" : "fertig", version: lauf.version + 1, log: [...lauf.log, { t: jetzt, e: "freigegeben von " + wer }] };
}

export function budgetErhoehen(lauf, wer, neuCent, jetzt) {
  if (wer !== "pascal") throw new LaufFehler("E_RECHT", "Nur Pascal erhöht das Budget");
  if (!Number.isInteger(neuCent) || neuCent <= lauf.budgetCent || neuCent > BUDGET_MAX_CENT) throw new LaufFehler("E_BUDGET", "Neues Budget: ganze Cent, über " + lauf.budgetCent + ", höchstens " + BUDGET_MAX_CENT);
  return { ...lauf, budgetCent: neuCent, version: lauf.version + 1, log: [...lauf.log, { t: jetzt, e: "Budget " + lauf.budgetCent + " → " + neuCent + " ct durch " + wer }] };
}

export function pausiere(lauf, jetzt) { if (ENDE.has(lauf.zustand)) return lauf; return { ...lauf, zustand: "pausiert", version: lauf.version + 1, log: [...lauf.log, { t: jetzt, e: "pausiert (#stopp)" }] }; }
export function fortsetzen(lauf, jetzt) {
  if (lauf.zustand !== "pausiert") return lauf;
  if (lauf.verbrauchtCent > lauf.budgetCent) throw new LaufFehler("E_BUDGET", "Budget erhöhen vor Fortsetzen");
  const alleFertig = PIPELINE.every((x) => lauf.schritte[x.id].zustand === "fertig");
  const zustand = lauf.wartetAuf ? "wartet" : alleFertig ? "fertig" : "laeuft";
  return { ...lauf, zustand, version: lauf.version + 1, log: [...lauf.log, { t: jetzt, e: "fortgesetzt" + (lauf.wartetAuf ? ", wartet weiter auf " + lauf.wartetAuf : "") }] };
}

export function zeitUeberschritten(lauf, jetzt) { return jetzt - lauf.erstellt > lauf.maxStunden * 3600 * 1000; }

function mit(lauf, schritt, patch, zustand, jetzt, e) {
  return { ...lauf, zustand: zustand === "neu" ? "laeuft" : zustand, version: lauf.version + 1, schritte: { ...lauf.schritte, [schritt]: { ...lauf.schritte[schritt], ...patch } }, log: [...lauf.log, { t: jetzt, e }] };
}

// ---------- Wiederholung: exponentielles Backoff mit fester Streuung ----------
export function wartezeitMs(versuch, basis = 1000, max = 60000, streuung = 0.2, zufall = 0.5) {
  if (!Number.isInteger(versuch) || versuch < 1) throw new LaufFehler("E_VERSUCH", "Versuch ≥ 1");
  const roh = Math.min(max, basis * 2 ** (versuch - 1));
  return Math.round(roh * (1 - streuung + 2 * streuung * zufall));
}

// ---------- Kontextfenster: feste Schichten bleiben, Verlauf wird verdichtet ----------
export const tokens = (t) => Math.ceil(String(t).length / 4);

export function kontextBauen(fest, verlauf, zusammenfassung, grenze, zusMaxTokens = 1500) {
  if (!Number.isInteger(grenze) || grenze < 500) throw new LaufFehler("E_GRENZE", "Kontextgrenze ≥ 500 Tokens");
  const festT = fest.reduce((a, x) => a + tokens(x), 0);
  if (festT > grenze * 0.5) throw new LaufFehler("E_FEST", "Feste Schichten > 50 % des Fensters");
  // Zusammenfassung höchstens zusMaxTokens und nie mehr als der Platz neben den festen Schichten
  const zusMax = Math.min(zusMaxTokens, grenze - festT);
  const gekuerzt = tokens(zusammenfassung) > zusMax;
  if (gekuerzt) zusammenfassung = String(zusammenfassung).slice(0, zusMax * 4);
  let rest = grenze - festT - tokens(zusammenfassung);
  const behalten = [];
  for (let i = verlauf.length - 1; i >= 0; i--) { const t = tokens(verlauf[i]); if (t > rest) break; rest -= t; behalten.unshift(verlauf[i]); }
  const verdichten = verlauf.slice(0, verlauf.length - behalten.length);
  return { fest, zusammenfassung, gekuerzt, verlauf: behalten, verdichten, genutzt: grenze - rest, cacheAnteil: festT / Math.max(1, grenze - rest) };
}

// ---------- Prüffälle (Vitest liest diese Liste) ----------
const T0 = 1790000000000;
const L = () => neuerLauf("L1", "Webshop für Werkstatt planen", T0);
const alleFertig = () => {
  let l = L();
  for (const s of ["wissen", "recherche", "profil", "vergleich", "loesung"]) { l = starte(l, s, T0); l = erledige(l, s, "Ergebnis " + s, 10, T0); }
  return l;
};
export const FAELLE = [
  { id: "LL01", art: "Positiv", t: "Wissen und Recherche starten parallel", f: () => bereit(L()).join(","), soll: "wissen,recherche" },
  { id: "LL02", art: "Positiv", t: "Profil erst nach Wissen + Recherche", f: () => { let l = L(); l = starte(l, "wissen", T0); l = erledige(l, "wissen", "x", 5, T0); return bereit(l).join(","); }, soll: "recherche" },
  { id: "LL03", art: "Positiv", t: "Ganzer Lauf wartet am Ende auf Pascal", f: () => alleFertig().zustand, soll: "wartet" },
  { id: "LL04", art: "Positiv", t: "Freigabe durch Pascal schließt ab", f: () => freigeben(alleFertig(), "pascal", T0).zustand, soll: "fertig" },
  { id: "LL05", art: "Negativ", t: "Freigabe durch Agent wird verweigert", f: () => freigeben(alleFertig(), "director", T0), fehler: "E_RECHT" },
  { id: "LL06", art: "Negativ", t: "Vergleich vor Profil ist nicht erlaubt", f: () => starte(L(), "vergleich", T0), fehler: "E_REIHENFOLGE" },
  { id: "LL07", art: "Negativ", t: "Leeres Ergebnis ist kein Abschluss", f: () => erledige(starte(L(), "wissen", T0), "wissen", "  ", 1, T0), fehler: "E_LEER" },
  { id: "LL08", art: "Negativ", t: "Fehler ohne Klasse wird abgelehnt", f: () => scheitere(starte(L(), "wissen", T0), "wissen", "irgendwas", T0), fehler: "E_KLASSE" },
  { id: "LL09", art: "Grenzwert", t: "Doppelter Abschluss bucht nicht doppelt", f: () => { let l = erledige(starte(L(), "wissen", T0), "wissen", "x", 7, T0); l = erledige(l, "wissen", "x", 7, T0); return l.verbrauchtCent; }, soll: 7 },
  { id: "LL10", art: "Grenzwert", t: "Budget überschritten → pausiert", f: () => { let l = neuerLauf("L2", "A", T0, { budgetCent: 5 }); l = erledige(starte(l, "wissen", T0), "wissen", "x", 6, T0); return l.zustand; }, soll: "pausiert" },
  { id: "LL11", art: "Grenzwert", t: "Vierter Versuch wird gesperrt", f: () => { let l = L(); for (let i = 0; i < 3; i++) { l = starte(l, "wissen", T0); l = scheitere(l, "wissen", "netz", T0); } return starte(l, "wissen", T0); }, fehler: "E_VERSUCHE" },
  { id: "LL12", art: "Grenzwert", t: "Fremder aktiver Lease wird nicht übernommen", f: () => lease(lease(L(), "director-a", T0), "director-b", T0 + 1000), fehler: "E_LEASE" },
  { id: "LL13", art: "Positiv", t: "Abgelaufener Lease darf übernommen werden", f: () => lease(lease(L(), "director-a", T0, 60), "director-b", T0 + 61000).lease.besitzer, soll: "director-b" },
  { id: "LL14", art: "Positiv", t: "Backoff Versuch 3 = 4 s (Mitte)", f: () => wartezeitMs(3), soll: 4000 },
  { id: "LL15", art: "Grenzwert", t: "Backoff gedeckelt bei 60 s", f: () => wartezeitMs(20), soll: 60000 },
  { id: "LL16", art: "Positiv", t: "Kontext behält neuesten Verlauf, verdichtet alten", f: () => { const k = kontextBauen(["S".repeat(800)], ["a".repeat(2000), "b".repeat(2000), "c".repeat(400)], "", 1000); return k.verlauf.length + "/" + k.verdichten.length; }, soll: "2/1" },
  { id: "LL17", art: "Negativ", t: "Zu große feste Schichten werden gemeldet", f: () => kontextBauen(["S".repeat(3000)], [], "", 1000), fehler: "E_FEST" },
  { id: "LL18", art: "Rollback", t: "#stopp pausiert, Fortsetzen läuft weiter am selben Schritt", f: () => { let l = starte(L(), "wissen", T0); l = pausiere(l, T0); const leer = bereit(l).length; l = fortsetzen(l, T0); return leer + "/" + l.zustand + "/" + l.schritte.wissen.zustand; }, soll: "0/laeuft/laeuft" },
  { id: "LL19", art: "Grenzwert", t: "Laufzeitgrenze 72 h wird erkannt", f: () => zeitUeberschritten(L(), T0 + 73 * 3600 * 1000), soll: true },
  // Regressionsfälle aus Gutachten NX-WS-KERNE-2026-09 (WK-01 … WK-06)
  { id: "LL20", art: "Negativ", t: "WK-01 Schemafehler: nichts ist bereit, solange der Lauf wartet", f: () => { let l = starte(L(), "wissen", T0); l = scheitere(l, "wissen", "schema", T0); return l.zustand + "/" + bereit(l).length; }, soll: "wartet/0" },
  { id: "LL21", art: "Negativ", t: "WK-01 Schemafehler: Neustart ohne Freigabe verweigert", f: () => { let l = starte(L(), "wissen", T0); l = scheitere(l, "wissen", "schema", T0); return starte(l, "wissen", T0); }, fehler: "E_REIHENFOLGE" },
  { id: "LL22", art: "Positiv", t: "WK-01 nach Freigabe durch Pascal wieder startbar", f: () => { let l = starte(L(), "wissen", T0); l = scheitere(l, "wissen", "schema", T0); l = freigeben(l, "pascal", T0); return starte(l, "wissen", T0).schritte.wissen.zustand; }, soll: "laeuft" },
  { id: "LL23", art: "Positiv", t: "WK-02 Budget erhöhen durch Pascal, dann Fortsetzen", f: () => { let l = neuerLauf("L2", "A", T0, { budgetCent: 5 }); l = erledige(starte(l, "wissen", T0), "wissen", "x", 6, T0); l = budgetErhoehen(l, "pascal", 50, T0); return fortsetzen(l, T0).zustand; }, soll: "laeuft" },
  { id: "LL24", art: "Negativ", t: "WK-02 Agent darf Budget nicht erhöhen", f: () => budgetErhoehen(neuerLauf("L2", "A", T0), "director", 300, T0), fehler: "E_RECHT" },
  { id: "LL25", art: "Grenzwert", t: "WK-02 Budget über Höchstwert 5.000 ct verweigert", f: () => budgetErhoehen(neuerLauf("L2", "A", T0), "pascal", 5001, T0), fehler: "E_BUDGET" },
  { id: "LL26", art: "Grenzwert", t: "WK-03 Budget im letzten Schritt überschritten → pausiert, nicht wartet", f: () => { let l = neuerLauf("L3", "A", T0, { budgetCent: 40 }); for (const s of ["wissen", "recherche", "profil", "vergleich", "loesung"]) { l = starte(l, s, T0); l = erledige(l, s, "x", s === "loesung" ? 50 : 10, T0); } return l.zustand; }, soll: "pausiert" },
  { id: "LL27", art: "Rollback", t: "WK-03 nach Budgeterhöhung zurück zur offenen Freigabe", f: () => { let l = neuerLauf("L3", "A", T0, { budgetCent: 40 }); for (const s of ["wissen", "recherche", "profil", "vergleich", "loesung"]) { l = starte(l, s, T0); l = erledige(l, s, "x", s === "loesung" ? 50 : 10, T0); } l = fortsetzen(budgetErhoehen(l, "pascal", 200, T0), T0); return l.zustand + "/" + freigeben(l, "pascal", T0).zustand; }, soll: "wartet/fertig" },
  { id: "LL28", art: "Negativ", t: "WK-04 Lease-Pflicht: Start ohne Lease verweigert", f: () => starte(neuerLauf("L4", "A", T0, { leasePflicht: true }), "wissen", T0, "director-a"), fehler: "E_LEASE" },
  { id: "LL29", art: "Negativ", t: "WK-04 fremder Besitzer darf nicht starten", f: () => starte(lease(L(), "director-a", T0), "wissen", T0, "director-b"), fehler: "E_LEASE" },
  { id: "LL30", art: "Positiv", t: "WK-04 eigener Besitzer startet und gibt Lease frei", f: () => { let l = lease(neuerLauf("L4", "A", T0, { leasePflicht: true }), "director-a", T0); l = starte(l, "wissen", T0, "director-a"); l = leaseFreigeben(l, "director-a", T0); return l.schritte.wissen.zustand + "/" + l.lease; }, soll: "laeuft/null" },
  { id: "LL31", art: "Negativ", t: "WK-05 Start nach 72 h verweigert", f: () => starte(L(), "wissen", T0 + 73 * 3600 * 1000), fehler: "E_ZEIT" },
  { id: "LL32", art: "Grenzwert", t: "WK-06 lange Zusammenfassung sprengt das Fenster nicht", f: () => { const k = kontextBauen(["S".repeat(800)], ["a"], "z".repeat(4000), 1000); return k.genutzt <= 1000 && k.gekuerzt === true; }, soll: true },
];
