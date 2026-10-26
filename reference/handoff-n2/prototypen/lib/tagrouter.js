// NeXifyAI Tag-Router · #tag → Ablauf, Agent, Skill, Mensch-Pflicht · reine Funktionen
export class RouterFehler extends Error {
  constructor(code, msg) { super(msg); this.name = "RouterFehler"; this.code = code; }
}

export const ROUTEN = {
  anfrage:    { ablauf: "Anfrage → Angebot", agent: "eingang", skill: "conversion-copywriting", mensch: "Angebot freigeben" },
  auftrag:    { ablauf: "Auftrag anlegen", agent: "director", skill: "detaillierte-umsetzungsplanung", mensch: null },
  "go-live":  { ablauf: "Freigabe-Gate", agent: "pruefer", skill: "freigabe-gate-live-betrieb", mensch: "Endabnahme" },
  review:     { ablauf: "Code-Review", agent: "pruefer", skill: "code-review-pruefkatalog", mensch: null },
  gutachten:  { ablauf: "Gutachtenkette", agent: "pruefer", skill: "gutachten-autopilot-de", mensch: null },
  rechnung:   { ablauf: "Rechnung", agent: "abrechnung", skill: "rechenkern", mensch: "bei Abweichung" },
  werkstatt:  { ablauf: "Werkstatt-Onboarding", agent: "support-werkstatt", skill: "auth-und-rollen", mensch: "Freischaltung" },
  guthaben:   { ablauf: "API-Guthaben: Stand, Aufladung, Nachweis", agent: "abrechnung", skill: "prepaid", mensch: "Rückzahlung, Korrektur" },
  affiliate:  { ablauf: "Affiliate-Provision", agent: "abrechnung", skill: "rechenkern", mensch: "Auszahlung" },
  dsgvo:      { ablauf: "Datenrechte Art. 15–21", agent: "support-kunden", skill: "datenschutz", mensch: "bei Löschung" },
  vorfall:    { ablauf: "Vorfall", agent: "waechter", skill: "sre-incident-response-methodik", mensch: "ab Stufe hoch" },
  optimieren: { ablauf: "Optimierung", agent: "optimierer", skill: "ab-test-planung", mensch: "Übernahme S1/S2" },
  stopp:      { ablauf: "Alle Agenten des Vorgangs pausieren", agent: "director", skill: null, mensch: null, vorrang: true },
};

// Hartsperren: diese Wörter erzwingen immer Mensch, egal welcher Tag
const HART = [/\breboot\b/i, /\bneustart\b.*server/i, /\bdns\b/i, /\bfirewall\b/i];

export function tags(text) {
  if (typeof text !== "string") throw new RouterFehler("E_TYP", "Text erwartet");
  if (text.length > 20000) throw new RouterFehler("E_LAENGE", "Text über 20.000 Zeichen");
  const gesehen = new Set(); const out = [];
  for (const m of text.matchAll(/(^|[\s(,;])#([a-z][a-z0-9-]{1,30})\b/gi)) {
    const t = m[2].toLowerCase();
    if (!gesehen.has(t)) { gesehen.add(t); out.push(t); }
  }
  return out;
}

export function route(text) {
  const ts = tags(text);
  const bekannt = ts.filter((t) => ROUTEN[t]);
  const unbekannt = ts.filter((t) => !ROUTEN[t]);
  const hart = HART.some((r) => r.test(text));
  if (bekannt.includes("stopp")) return { ziele: [{ tag: "stopp", ...ROUTEN.stopp }], unbekannt, hartsperre: hart, mensch: hart };
  const ziele = bekannt.map((t) => ({ tag: t, ...ROUTEN[t] }));
  return { ziele, unbekannt, hartsperre: hart, mensch: hart || ziele.some((z) => z.mensch) };
}

export const FAELLE = [
  { id: "P-01", art: "Positiv", t: "#anfrage → Eingang-Agent", f: () => route("Neue Mail #anfrage").ziele[0].agent, soll: "eingang" },
  { id: "P-02", art: "Positiv", t: "#go-live verlangt Mensch", f: () => route("bitte #go-live").mensch, soll: true },
  { id: "P-03", art: "Positiv", t: "zwei Tags, Reihenfolge bleibt", f: () => route("#review und #rechnung").ziele.map((z) => z.tag).join(","), soll: "review,rechnung" },
  { id: "P-04", art: "Positiv", t: "Groß/klein egal", f: () => tags("#GO-LIVE").join(), soll: "go-live" },
  { id: "P-05", art: "Positiv", t: "#guthaben → Abrechnung, Mensch bei Rückzahlung", f: () => { const r = route("#guthaben bitte prüfen"); return r.ziele[0].agent + "/" + r.ziele[0].skill; }, soll: "abrechnung/prepaid" },
  { id: "N-01", art: "Negativ", t: "unbekannter Tag landet in 'unbekannt'", f: () => route("#banane").unbekannt.join(), soll: "banane" },
  { id: "N-02", art: "Negativ", t: "Zahl statt Text → E_TYP", f: () => tags(42), fehler: "E_TYP" },
  { id: "N-03", art: "Negativ", t: "Hashtag in URL-Anker zählt nicht", f: () => tags("siehe https://x.de/seite#anfrage").length, soll: 0 },
  { id: "N-04", art: "Negativ", t: "'DNS' im Text erzwingt Mensch, auch bei #review", f: () => route("#review DNS umstellen").mensch, soll: true },
  { id: "G-01", art: "Grenzwert", t: "leerer Text → keine Ziele", f: () => route("").ziele.length, soll: 0 },
  { id: "G-02", art: "Grenzwert", t: "doppelter Tag zählt einmal", f: () => tags("#auftrag #auftrag").length, soll: 1 },
  { id: "G-03", art: "Grenzwert", t: "Text über 20.000 Zeichen → E_LAENGE", f: () => tags("a".repeat(20001)), fehler: "E_LAENGE" },
  { id: "G-04", art: "Grenzwert", t: "#stopp hat Vorrang vor allen", f: () => route("#rechnung #stopp #go-live").ziele.map((z) => z.tag).join(), soll: "stopp" },
];

export function pruefe() {
  return FAELLE.map((c) => {
    try {
      const ist = c.f();
      if (c.fehler) return { ...c, ok: false, ist: "kein Fehler" };
      return { ...c, ok: ist === c.soll, ist: JSON.stringify(ist) };
    } catch (e) {
      if (c.fehler) return { ...c, ok: e instanceof RouterFehler && e.code === c.fehler, ist: e.code || e.message };
      return { ...c, ok: false, ist: "Ausnahme: " + (e.code || e.message) };
    }
  });
}
