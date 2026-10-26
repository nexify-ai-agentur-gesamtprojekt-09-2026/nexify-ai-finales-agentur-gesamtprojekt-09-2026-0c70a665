// NeXifyAI Gedächtnis-Kern · Arten, Speichern mit Konfliktprüfung, Abruf „Metadaten zuerst“, Zeitgewicht, Token-Budget, Vergessen
// Reine Funktionen, kein I/O. Einbettung und Vektorsuche liefern die Dienste (LightRAG, AgentMemory, Cognee); dieser Kern entscheidet,
// WAS gespeichert, gefunden, in den Kontext gelegt und gelöscht wird. Parameter: config/gedaechtnis.json.
import { bereinigen } from "./lernschleife.js";
import { tokens } from "./langlauf.js";

export class GedaechtnisFehler extends Error { constructor(code, msg) { super(msg); this.name = "GedaechtnisFehler"; this.code = code; } }

export const ARTEN = {
  arbeit:     { zweck: "Arbeitsgedächtnis eines Laufs (Zwischenstand, Entscheidungen im Lauf)", dienst: "Postgres laeufe/schritte", halbwertTage: null, budgetAnteil: 0.25 },
  episodisch: { zweck: "Was geschah: Mails, Chats, Vorgänge, Termine – mit Zeit und Beteiligten", dienst: "Cognee (Graph) + CRM-Verlauf", halbwertTage: 30, budgetAnteil: 0.25 },
  semantisch: { zweck: "Fakten und Wissen mit Quelle: Preise, Regeln, Kundenstammdaten, Dokumente", dienst: "LightRAG (Vektor + Graph)", halbwertTage: 365, budgetAnteil: 0.35 },
  prozedural: { zweck: "Wie man es macht: Skills, Abläufe, Regeln, Lessons Learned", dienst: "AgentMemory + Skill-Verzeichnis + config/regelwerk.json", halbwertTage: null, budgetAnteil: 0.15 },
};
const QUELLRANG = { pascal: 4, vertrag: 4, system: 3, dokument: 2, agent: 1, unbekannt: 0 };
const TAG = 86400e3;

export function neuerSpeicher() { return { eintraege: [], protokoll: [] }; }

// ---------- Kontextuelles Zerlegen: jeder Abschnitt trägt seinen Zusammenhang (Dokument, Abschnitt, Stand) ----------
export function zerlegen(text, kopf, opt = {}) {
  const ziel = opt.zielTokens ?? 300, ueber = opt.ueberlappungTokens ?? 40;
  if (!kopf || !kopf.dokument) throw new GedaechtnisFehler("E_KOPF", "Zerlegen braucht dokument im Kopf");
  const absaetze = String(text).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const teile = []; let akt = [], n = 0, abschnitt = kopf.abschnitt || "";
  const schliessen = () => { if (!akt.length) return; const t = akt.join("\n\n"); teile.push({ text: t, kontext: `Dokument: ${kopf.dokument}${abschnitt ? " · Abschnitt: " + abschnitt : ""}${kopf.stand ? " · Stand: " + kopf.stand : ""}` }); const rest = t.slice(-ueber * 4); akt = ueber ? [rest] : []; n = tokens(rest); };
  for (const a of absaetze) {
    const ueberschrift = a.match(/^#{1,4}\s+(.+)/); if (ueberschrift) { schliessen(); akt = []; n = 0; abschnitt = ueberschrift[1].trim(); continue; }
    if (n + tokens(a) > ziel && akt.length) schliessen();
    akt.push(a); n += tokens(a);
  }
  schliessen();
  return teile;
}

// ---------- Speichern ----------
export function speichern(sp, e, jetzt, cfg = {}) {
  if (!ARTEN[e.art]) throw new GedaechtnisFehler("E_ART", "Art: " + Object.keys(ARTEN).join("|"));
  const m = e.meta || {};
  if (!m.mandant) throw new GedaechtnisFehler("E_MANDANT", "Mandant fehlt – ohne Mandant kein Speichern");
  if (!m.quelle) throw new GedaechtnisFehler("E_QUELLE", "Quelle fehlt");
  if ((e.art === "semantisch" || e.art === "episodisch") && !m.einbettungsModell) throw new GedaechtnisFehler("E_MODELL", "Einbettungsmodell in den Metadaten fehlt");
  if (m.personenbezogen && !Number.isInteger(m.loeschfristTage)) throw new GedaechtnisFehler("E_FRIST", "Personenbezogener Eintrag braucht loeschfristTage");
  if (e.art === "arbeit" && !m.lauf) throw new GedaechtnisFehler("E_LAUF", "Arbeitsgedächtnis gehört zu einem Lauf");
  const neu = { id: e.id || "g" + (sp.eintraege.length + 1), art: e.art, text: m.personenbezogen ? e.text : bereinigen(e.text), kontext: e.kontext || "", schluessel: e.schluessel || null, wert: e.wert ?? null, wichtigkeit: e.wichtigkeit ?? 0.5, meta: { ...m, datum: m.datum ?? jetzt }, status: "gueltig" };
  if (sp.eintraege.some((x) => x.id === neu.id)) return { speicher: sp, ergebnis: "doppelt" };
  let eintraege = sp.eintraege, ergebnis = "neu", konflikt = null;
  if (neu.schluessel && neu.art === "semantisch") {
    const alt = eintraege.find((x) => x.status === "gueltig" && x.schluessel === neu.schluessel && x.meta.mandant === m.mandant);
    if (alt && JSON.stringify(alt.wert) !== JSON.stringify(neu.wert)) {
      const rNeu = QUELLRANG[m.quelle] ?? 0, rAlt = QUELLRANG[alt.meta.quelle] ?? 0;
      if (rNeu >= rAlt && neu.meta.datum >= alt.meta.datum) { eintraege = eintraege.map((x) => x === alt ? { ...x, status: "ersetzt", ersetztDurch: neu.id } : x); ergebnis = "ersetzt"; }
      else { neu.status = "strittig"; konflikt = { schluessel: neu.schluessel, bisher: alt.wert, neu: neu.wert, quelleBisher: alt.meta.quelle, quelleNeu: m.quelle }; ergebnis = "konflikt"; }
    } else if (alt) return { speicher: sp, ergebnis: "bestaetigt" };
  }
  return { speicher: { eintraege: [...eintraege, neu], protokoll: [...sp.protokoll, { t: jetzt, e: ergebnis + " " + neu.id }] }, ergebnis, konflikt };
}

// ---------- Abrufen: Metadaten zuerst, dann Relevanz, Zeit, Wichtigkeit ----------
export function lexikalisch(anfrage, text) { const w = (s) => new Set(String(s).toLowerCase().match(/[a-zäöüß0-9]{3,}/g) || []); const a = w(anfrage), b = w(text); if (!a.size) return 0; let t = 0; for (const x of a) if (b.has(x)) t++; return t / a.size; }
export function zeitgewicht(art, datum, jetzt) { const h = ARTEN[art].halbwertTage; if (!h) return 1; return Math.pow(0.5, Math.max(0, jetzt - datum) / TAG / h); }

export function abrufen(sp, anfrage, filter, jetzt, opt = {}) {
  if (!filter || !filter.mandant) throw new GedaechtnisFehler("E_MANDANT", "Abruf ohne Mandant verboten");
  const modell = opt.einbettungsModell, sim = opt.aehnlichkeit || lexikalisch, g = { relevanz: 0.6, zeit: 0.25, wichtigkeit: 0.15, ...(opt.gewichte || {}) };
  const ausgeschlossen = { anderesModell: 0, abgelaufen: 0 };
  const kandidaten = sp.eintraege.filter((e) => {
    if (e.meta.mandant !== filter.mandant || e.status === "ersetzt") return false;
    for (const k of ["kunde", "fall", "bereich", "lauf", "sprache"]) if (filter[k] != null && e.meta[k] !== filter[k]) return false;
    if (filter.arten && !filter.arten.includes(e.art)) return false;
    if (e.meta.gueltigBis && e.meta.gueltigBis < jetzt) { ausgeschlossen.abgelaufen++; return false; }
    if (modell && e.meta.einbettungsModell && e.meta.einbettungsModell !== modell) { ausgeschlossen.anderesModell++; return false; }
    return true;
  });
  const treffer = kandidaten.map((e) => { const r = sim(anfrage, e.kontext + " " + e.text); return { ...e, relevanz: r, punkte: g.relevanz * r + g.zeit * zeitgewicht(e.art, e.meta.datum, jetzt) + g.wichtigkeit * e.wichtigkeit }; })
    .filter((e) => e.relevanz >= (opt.mindestRelevanz ?? 0.1)).sort((a, b) => b.punkte - a.punkte);
  return { treffer, ausgeschlossen, strittig: treffer.filter((t) => t.status === "strittig").map((t) => t.schluessel) };
}

// ---------- Token-Budget je Art für Schicht S4/S5 des Kontexts ----------
export function budgetieren(treffer, gesamtTokens, anteile = null) {
  const a = anteile || Object.fromEntries(Object.entries(ARTEN).map(([k, v]) => [k, v.budgetAnteil]));
  const rest = Object.fromEntries(Object.keys(a).map((k) => [k, Math.floor(gesamtTokens * a[k])]));
  const gewaehlt = [];
  for (const t of treffer) { const n = tokens(t.kontext + " " + t.text); if (rest[t.art] >= n) { rest[t.art] -= n; gewaehlt.push(t); } }
  return { gewaehlt, genutzt: gewaehlt.reduce((s, t) => s + tokens(t.kontext + " " + t.text), 0), rest };
}

// ---------- Vergessen: Löschfrist, abgeschlossene Läufe, ersetzte Fakten nach Aufbewahrung ----------
export function vergessen(sp, jetzt, opt = {}) {
  const fertig = new Set(opt.fertigeLaeufe || []), halteErsetzt = (opt.ersetztAufbewahrenTage ?? 90) * TAG;
  const weg = [];
  const bleiben = sp.eintraege.filter((e) => {
    const grund = e.meta.personenbezogen && jetzt - e.meta.datum > e.meta.loeschfristTage * TAG ? "Löschfrist" : e.art === "arbeit" && fertig.has(e.meta.lauf) ? "Lauf beendet" : e.status === "ersetzt" && jetzt - e.meta.datum > halteErsetzt ? "ersetzt, Aufbewahrung abgelaufen" : null;
    if (grund) weg.push({ id: e.id, grund }); return !grund;
  });
  return { speicher: { eintraege: bleiben, protokoll: [...sp.protokoll, ...weg.map((w) => ({ t: jetzt, e: "vergessen " + w.id + " (" + w.grund + ")" }))] }, geloescht: weg };
}

// ---------- Prüffälle ----------
const T = Date.UTC(2026, 8, 28);
const M = (x = {}) => ({ mandant: "nexify", quelle: "dokument", einbettungsModell: "emb-v1", ...x });
const S = (...es) => es.reduce((sp, e) => speichern(sp, e, T).speicher, neuerSpeicher());
export const FAELLE = [
  { id: "GD01", art: "Negativ", t: "Speichern ohne Mandant verboten", f: () => speichern(neuerSpeicher(), { art: "semantisch", text: "x", meta: { quelle: "pascal", einbettungsModell: "e" } }, T), fehler: "E_MANDANT" },
  { id: "GD02", art: "Negativ", t: "Wissen ohne Einbettungsmodell in den Metadaten abgelehnt", f: () => speichern(neuerSpeicher(), { art: "semantisch", text: "x", meta: { mandant: "n", quelle: "pascal" } }, T), fehler: "E_MODELL" },
  { id: "GD03", art: "Negativ", t: "Personenbezug ohne Löschfrist abgelehnt", f: () => speichern(neuerSpeicher(), { art: "episodisch", text: "Mail von Erika", meta: M({ personenbezogen: true }) }, T), fehler: "E_FRIST" },
  { id: "GD04", art: "Positiv", t: "Neuerer Fakt gleicher oder höherer Quelle ersetzt den alten", f: () => { const sp = S({ id: "a", art: "semantisch", schluessel: "tagessatz", wert: 400, text: "Tagessatz 400 €", meta: M({ datum: T - TAG }) }); return speichern(sp, { id: "b", art: "semantisch", schluessel: "tagessatz", wert: 449, text: "Tagessatz 449 €", meta: M({ quelle: "pascal" }) }, T).ergebnis; }, soll: "ersetzt" },
  { id: "GD05", art: "Negativ", t: "Agent widerspricht Pascal → Konflikt, nicht Überschreiben", f: () => { const sp = S({ id: "a", art: "semantisch", schluessel: "tagessatz", wert: 449, text: "449", meta: M({ quelle: "pascal" }) }); return speichern(sp, { id: "b", art: "semantisch", schluessel: "tagessatz", wert: 399, text: "399", meta: M({ quelle: "agent" }) }, T).ergebnis; }, soll: "konflikt" },
  { id: "GD06", art: "Grenzwert", t: "Gleicher Wert erneut = bestätigt, kein Doppel", f: () => { const sp = S({ id: "a", art: "semantisch", schluessel: "k", wert: 1, text: "x", meta: M() }); const r = speichern(sp, { id: "b", art: "semantisch", schluessel: "k", wert: 1, text: "x", meta: M() }, T); return r.ergebnis + "/" + r.speicher.eintraege.length; }, soll: "bestaetigt/1" },
  { id: "GD07", art: "Negativ", t: "Abruf ohne Mandant verboten", f: () => abrufen(neuerSpeicher(), "x", {}, T), fehler: "E_MANDANT" },
  { id: "GD08", art: "Negativ", t: "Fremder Mandant wird nie gefunden", f: () => abrufen(S({ art: "semantisch", text: "Gutschein einlösen im Partnerportal", meta: M({ mandant: "kunde-a" }) }), "Gutschein einlösen", { mandant: "kunde-b" }, T).treffer.length, soll: 0 },
  { id: "GD09", art: "Positiv", t: "Metadaten-Filter vor Relevanz (Kunde)", f: () => { const sp = S({ id: "a", art: "episodisch", text: "Login geht nicht", meta: M({ kunde: "K-001" }) }, { id: "b", art: "episodisch", text: "Login geht nicht", meta: M({ kunde: "K-002" }) }); return abrufen(sp, "Login", { mandant: "nexify", kunde: "K-002" }, T).treffer.map((t) => t.id).join(","); }, soll: "b" },
  { id: "GD10", art: "Grenzwert", t: "Anderes Einbettungsmodell wird ausgeschlossen und gezählt", f: () => abrufen(S({ art: "semantisch", text: "Rechnung prüfen", meta: M({ einbettungsModell: "emb-alt" }) }), "Rechnung", { mandant: "nexify" }, T, { einbettungsModell: "emb-v1" }).ausgeschlossen.anderesModell, soll: 1 },
  { id: "GD11", art: "Positiv", t: "Zeitgewicht: jüngere Episode vor älterer bei gleicher Relevanz", f: () => { const sp = S({ id: "alt", art: "episodisch", text: "Termin Reifenwechsel verschoben", meta: M({ datum: T - 90 * TAG }) }, { id: "neu", art: "episodisch", text: "Termin Reifenwechsel verschoben", meta: M({ datum: T - TAG }) }); return abrufen(sp, "Termin Reifenwechsel", { mandant: "nexify" }, T).treffer[0].id; }, soll: "neu" },
  { id: "GD12", art: "Grenzwert", t: "Abgelaufener Fakt (gueltigBis) wird nicht geliefert", f: () => abrufen(S({ art: "semantisch", text: "Aktion Winterreifen", meta: M({ gueltigBis: T - 1 }) }), "Winterreifen", { mandant: "nexify" }, T).ausgeschlossen.abgelaufen, soll: 1 },
  { id: "GD13", art: "Positiv", t: "Strittiger Fakt wird beim Abruf markiert", f: () => { let sp = S({ id: "a", art: "semantisch", schluessel: "frist", wert: 14, text: "Frist 14 Tage", meta: M({ quelle: "vertrag" }) }); sp = speichern(sp, { id: "b", art: "semantisch", schluessel: "frist", wert: 30, text: "Frist 30 Tage", meta: M({ quelle: "agent" }) }, T).speicher; return abrufen(sp, "Frist Tage", { mandant: "nexify" }, T).strittig.join(","); }, soll: "frist" },
  { id: "GD14", art: "Grenzwert", t: "Budget je Art wird eingehalten", f: () => { const t = [{ art: "semantisch", kontext: "", text: "a".repeat(400) }, { art: "semantisch", kontext: "", text: "b".repeat(400) }]; return budgetieren(t, 800, { semantisch: 0.2 }).gewaehlt.length; }, soll: 1 },
  { id: "GD15", art: "Positiv", t: "Zerlegen trägt Dokument und Abschnitt in jeden Teil", f: () => zerlegen("# Gutscheine\n\nCode eingeben.\n\nTermin wählen.", { dokument: "Handbuch Partnerportal", stand: "27.09.2026" })[0].kontext, soll: "Dokument: Handbuch Partnerportal · Abschnitt: Gutscheine · Stand: 27.09.2026" },
  { id: "GD16", art: "Rollback", t: "Vergessen löscht nach Frist und beendete Läufe, protokolliert den Grund", f: () => { const sp = S({ id: "p", art: "episodisch", text: "Mail", meta: M({ personenbezogen: true, loeschfristTage: 30, datum: T - 31 * TAG }) }, { id: "w", art: "arbeit", text: "Zwischenstand", meta: { mandant: "nexify", quelle: "system", lauf: "L1" } }, { id: "k", art: "semantisch", text: "bleibt", meta: M() }); const r = vergessen(sp, T, { fertigeLaeufe: ["L1"] }); return r.geloescht.map((g) => g.id).join(",") + "/" + r.speicher.eintraege.length; }, soll: "p,w/1" },
  { id: "GD17", art: "Negativ", t: "Nicht personenbezogener Text wird vor Speicherung bereinigt", f: () => S({ art: "semantisch", text: "Rückfragen an max@firma.de", meta: M() }).eintraege[0].text, soll: "Rückfragen an [EMAIL]" },
];
