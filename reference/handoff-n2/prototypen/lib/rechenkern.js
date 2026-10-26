// NeXifyAI Rechenkern · Preis, Steuer, Guthaben, Buchung · reine Funktionen, keine Seiteneffekte
// Formel-Entscheidung E1 offen: MODUS "aufschlag" (EK × 1,45) oder "marge" (EK ÷ 0,55). Beide abgebildet, Modus explizit.

export class RechenFehler extends Error {
  constructor(code, msg) { super(msg); this.name = "RechenFehler"; this.code = code; }
}

export const rund = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

const zahl = (v, feld) => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new RechenFehler("E_TYP", feld + " muss eine endliche Zahl sein");
  if (v < 0) throw new RechenFehler("E_NEGATIV", feld + " darf nicht negativ sein");
  if (v > 1e9) throw new RechenFehler("E_MAX", feld + " überschreitet 1.000.000.000");
  return v;
};

export function verkaufspreis(ek, modus = "aufschlag", satz = 0.45) {
  zahl(ek, "EK"); zahl(satz, "Satz");
  if (modus === "aufschlag") return rund(ek * (1 + satz));
  if (modus === "marge") {
    if (satz >= 1) throw new RechenFehler("E_MARGE", "Marge muss unter 100 % liegen");
    return rund(ek / (1 - satz));
  }
  throw new RechenFehler("E_MODUS", "Unbekannter Modus: " + modus);
}

const EU = ["AT","BE","BG","CY","CZ","DE","DK","EE","EL","ES","FI","FR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","RO","SE","SI","SK"];
export const ustIdFormat = (id) => typeof id === "string" && /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(id.replace(/\s/g, "")) && EU.includes(id.slice(0, 2));

// Leistender Unternehmer: NL. VIES-Prüfung erfolgt serverseitig; hier nur Format.
export function steuer(netto, land, ustId) {
  zahl(netto, "Netto");
  if (typeof land !== "string" || land.length !== 2) throw new RechenFehler("E_LAND", "Land als ISO-Code (2 Zeichen)");
  if (land === "NL") return { satz: 0.21, betrag: rund(netto * 0.21), hinweis: "BTW 21 %" };
  if (EU.includes(land)) {
    if (ustId && ustIdFormat(ustId)) return { satz: 0, betrag: 0, hinweis: "BTW verlegd (Reverse Charge)" };
    return { satz: null, betrag: null, hinweis: "Klärung nötig: B2C/ohne USt-ID (OSS) – nicht automatisch" };
  }
  return { satz: 0, betrag: 0, hinweis: "Drittland – steuerlich prüfen" };
}

export function guthabenStufe(verbraucht, budget) {
  zahl(verbraucht, "Verbrauch"); zahl(budget, "Budget");
  if (budget === 0) return { quote: 1, stufe: "stopp" };
  const q = verbraucht / budget;
  return { quote: rund(q), stufe: q >= 1 ? "stopp" : q >= 0.8 ? "warn80" : q >= 0.5 ? "warn50" : "ok" };
}

// Idempotente Buchung: gleicher Schlüssel → keine zweite Abbuchung
export function buche(journal, { schluessel, betrag, kostenstelle }) {
  if (!schluessel || typeof schluessel !== "string") throw new RechenFehler("E_SCHLUESSEL", "Idempotenz-Schlüssel fehlt");
  zahl(betrag, "Betrag");
  if (!kostenstelle || !String(kostenstelle).trim()) throw new RechenFehler("E_KST", "Kostenstelle fehlt");
  const vorhanden = journal.find((b) => b.schluessel === schluessel);
  if (vorhanden) return { journal, buchung: vorhanden, neu: false };
  const buchung = { schluessel, betrag: rund(betrag), kostenstelle: String(kostenstelle).trim() };
  return { journal: journal.concat([buchung]), buchung, neu: true };
}

export function storniere(journal, schluessel) {
  const b = journal.find((x) => x.schluessel === schluessel);
  if (!b) throw new RechenFehler("E_UNBEKANNT", "Buchung nicht gefunden");
  if (journal.some((x) => x.schluessel === "storno:" + schluessel)) return journal;
  return journal.concat([{ schluessel: "storno:" + schluessel, betrag: -b.betrag, kostenstelle: b.kostenstelle }]);
}

export const saldo = (journal) => rund(journal.reduce((s, b) => s + b.betrag, 0));

// Testfälle – laufen im Browser (myADMIN › Tests) und unter Vitest (tests/rechenkern.test.js)
export const FAELLE = [
  { id: "P-01", art: "Positiv", t: "Aufschlag: 100 € EK → 145,00 €", f: () => verkaufspreis(100, "aufschlag", 0.45), soll: 145 },
  { id: "P-02", art: "Positiv", t: "Marge: 100 € EK → 181,82 €", f: () => verkaufspreis(100, "marge", 0.45), soll: 181.82 },
  { id: "P-03", art: "Positiv", t: "Tagessatz 449 € netto NL → 94,29 € BTW", f: () => steuer(449, "NL").betrag, soll: 94.29 },
  { id: "P-04", art: "Positiv", t: "DE mit USt-ID → Reverse Charge 0 €", f: () => steuer(449, "DE", "DE123456789").betrag, soll: 0 },
  { id: "P-05", art: "Positiv", t: "Idempotenz: doppelte Buchung bucht einmal", f: () => { let j = buche([], { schluessel: "a1", betrag: 10, kostenstelle: "Pruefungen" }).journal; j = buche(j, { schluessel: "a1", betrag: 10, kostenstelle: "Pruefungen" }).journal; return saldo(j); }, soll: 10 },
  { id: "N-01", art: "Negativ", t: "EK negativ → E_NEGATIV", f: () => verkaufspreis(-1), fehler: "E_NEGATIV" },
  { id: "N-02", art: "Negativ", t: "EK als Text → E_TYP", f: () => verkaufspreis("100"), fehler: "E_TYP" },
  { id: "N-03", art: "Negativ", t: "Marge 100 % → E_MARGE", f: () => verkaufspreis(100, "marge", 1), fehler: "E_MARGE" },
  { id: "N-04", art: "Negativ", t: "Buchung ohne Schlüssel → E_SCHLUESSEL", f: () => buche([], { betrag: 5, kostenstelle: "x" }), fehler: "E_SCHLUESSEL" },
  { id: "N-05", art: "Negativ", t: "Kostenstelle nur Leerzeichen → E_KST", f: () => buche([], { schluessel: "k", betrag: 5, kostenstelle: "  " }), fehler: "E_KST" },
  { id: "N-06", art: "Negativ", t: "DE ohne USt-ID → keine automatische Steuer", f: () => steuer(100, "DE").satz, soll: null },
  { id: "G-01", art: "Grenzwert", t: "EK 0 € → 0,00 €", f: () => verkaufspreis(0), soll: 0 },
  { id: "G-02", art: "Grenzwert", t: "Rundung 0,005 € → 0,01 €", f: () => rund(0.005), soll: 0.01 },
  { id: "G-03", art: "Grenzwert", t: "Guthaben genau 80 % → warn80", f: () => guthabenStufe(80, 100).stufe, soll: "warn80" },
  { id: "G-04", art: "Grenzwert", t: "Budget 0 → sofort Stopp", f: () => guthabenStufe(0, 0).stufe, soll: "stopp" },
  { id: "G-05", art: "Grenzwert", t: "EK über Maximum → E_MAX", f: () => verkaufspreis(2e9), fehler: "E_MAX" },
  { id: "R-01", art: "Rücknahme", t: "Storno gleicht Buchung aus → Saldo 0", f: () => { const j = buche([], { schluessel: "b1", betrag: 42.5, kostenstelle: "Chat" }).journal; return saldo(storniere(j, "b1")); }, soll: 0 },
  { id: "R-02", art: "Rücknahme", t: "Doppeltes Storno wirkt einmal", f: () => { let j = buche([], { schluessel: "b2", betrag: 7, kostenstelle: "Chat" }).journal; j = storniere(storniere(j, "b2"), "b2"); return saldo(j); }, soll: 0 },
];

export function pruefe() {
  return FAELLE.map((c) => {
    try {
      const ist = c.f();
      if (c.fehler) return { ...c, ok: false, ist: "kein Fehler (" + JSON.stringify(ist) + ")" };
      return { ...c, ok: Object.is(ist, c.soll) || ist === c.soll, ist: JSON.stringify(ist) };
    } catch (e) {
      if (c.fehler) return { ...c, ok: e instanceof RechenFehler && e.code === c.fehler, ist: e.code || e.message };
      return { ...c, ok: false, ist: "Ausnahme: " + (e.code || e.message) };
    }
  });
}
