// NeXifyAI Betriebskennzahlen · DORA, Kosten je Vorgang (Rechenkern-Cent), Kostenschätzung aus echten Preisen, Schuldbuch
// Reine Funktionen. Zahlen kommen aus Ereignissen (Deploys, Vorfälle, Journal), nie geschätzt. Keine Zielwerte erfinden:
// Ziele stehen in config/kennzahlen.json und sind als Startannahme markiert, bis Messwerte vorliegen.

export class KennzahlFehler extends Error { constructor(code, msg) { super(msg); this.name = "KennzahlFehler"; this.code = code; } }
const TAG = 86400e3;

// ---------- DORA aus Ereignissen ----------
// deploys: [{t, commitT, ok, rollback?}], vorfaelle: [{beginn, ende}]
export function dora(deploys, vorfaelle, vonT, bisT) {
  if (!(bisT > vonT)) throw new KennzahlFehler("E_ZEITRAUM", "Zeitraum ungültig");
  const d = deploys.filter((x) => x.t >= vonT && x.t < bisT), tage = (bisT - vonT) / TAG;
  const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const v = vorfaelle.filter((x) => x.beginn >= vonT && x.beginn < bisT && x.ende);
  return {
    deploysJeTag: d.length / tage,
    vorlaufzeitStundenMedian: med(d.filter((x) => x.commitT).map((x) => (x.t - x.commitT) / 3600e3)),
    fehlerquoteAenderung: d.length ? d.filter((x) => !x.ok || x.rollback).length / d.length : null,
    wiederherstellungMinutenMedian: med(v.map((x) => (x.ende - x.beginn) / 60e3)),
    basis: { deploys: d.length, vorfaelle: v.length, tage },
  };
}

// ---------- Kosten ----------
// Preise ausschließlich aus config/llm-verbindungen.json (centJeMioIn/Out). Platzhalter ${…} = unbekannt, nie raten.
export function preisBekannt(stufe) { return [stufe.centJeMioIn, stufe.centJeMioOut].every((x) => typeof x === "number" && x >= 0); }
export function kostenCent(stufe, tokIn, tokOut) {
  if (!preisBekannt(stufe)) throw new KennzahlFehler("E_PREIS", "Preis für Stufe " + stufe.id + " nicht belegt (Platzhalter) – keine Kostenangabe");
  return Math.ceil((tokIn * stufe.centJeMioIn + tokOut * stufe.centJeMioOut) / 1e6); // aufrunden auf ganze Cent (Rechenkern-Regel)
}
// Hinweis: Eingabe- und Ausgabepreis getrennt rechnen. Summe aus Eingabe+Ausgabe × Eingabepreis unterschätzt die Kosten.
export function monatsschaetzung(stufe, mittelIn, mittelOut, anfragenJeTag, tage = 30) {
  const jeAnfrage = (mittelIn * stufe.centJeMioIn + mittelOut * stufe.centJeMioOut) / 1e6;
  if (!preisBekannt(stufe)) throw new KennzahlFehler("E_PREIS", "Preis nicht belegt");
  return { centJeAnfrage: jeAnfrage, centJeMonat: Math.ceil(jeAnfrage * anfragenJeTag * tage), annahme: "Mittelwerte " + mittelIn + "/" + mittelOut + " Token, " + anfragenJeTag + " Anfragen/Tag" };
}
// Kosten je Vorgang aus dem Journal (nicht aus Schätzung)
export function kostenJeVorgang(journal) {
  const m = {}; for (const b of journal) { if (!Number.isInteger(b.cent)) throw new KennzahlFehler("E_CENT", "Journal in ganzen Cent"); (m[b.vorgangsart] ||= { cent: 0, n: new Set() }).cent += b.cent; m[b.vorgangsart].n.add(b.vorgang); }
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { cent: v.cent, vorgaenge: v.n.size, centJeVorgang: v.cent / v.n.size }]));
}

// ---------- Semantischer Cache: Entscheidung, ob ein Treffer genutzt werden darf ----------
export function cacheTrefferErlaubt(t, opt = {}) {
  const schwelle = opt.schwelle ?? 0.97;
  if (t.personenbezogen) return { ok: false, grund: "Personenbezug" };
  if (t.promptVersion !== opt.promptVersion) return { ok: false, grund: "andere Prompt-Version" };
  if (t.laeuftAb <= (opt.jetzt ?? Date.now())) return { ok: false, grund: "abgelaufen" };
  if (t.aehnlichkeit < schwelle) return { ok: false, grund: "Ähnlichkeit " + t.aehnlichkeit + " < " + schwelle };
  if (opt.kategorie && ["recht", "rechnung", "auftrag"].includes(opt.kategorie)) return { ok: false, grund: "Vorgangsart nie aus dem Cache" };
  return { ok: true };
}

// ---------- Schuldbuch: technische Schuld priorisiert nach Risiko × Häufigkeit ÷ Aufwand ----------
export function schuldPrioritaet(posten) {
  return posten.map((p) => { if (![1, 2, 3].includes(p.risiko) || !(p.aufwandTage > 0)) throw new KennzahlFehler("E_POSTEN", "risiko 1–3, aufwandTage > 0"); return { ...p, wert: (p.risiko * (p.trefferJeMonat || 1)) / p.aufwandTage }; }).sort((a, b) => b.wert - a.wert);
}

// ---------- Prüffälle ----------
const T0 = Date.UTC(2026, 8, 1), H = 3600e3;
const S1 = { id: 1, centJeMioIn: 100, centJeMioOut: 500 };
export const FAELLE = [
  { id: "BK01", art: "Positiv", t: "Deploys je Tag aus Ereignissen", f: () => dora([{ t: T0 + H, ok: true }, { t: T0 + 2 * H, ok: true }], [], T0, T0 + 2 * TAG).deploysJeTag, soll: 1 },
  { id: "BK02", art: "Positiv", t: "Rollback zählt als fehlgeschlagene Änderung", f: () => dora([{ t: T0 + H, ok: true, rollback: true }, { t: T0 + 2 * H, ok: true }], [], T0, T0 + TAG).fehlerquoteAenderung, soll: 0.5 },
  { id: "BK03", art: "Positiv", t: "Wiederherstellungszeit als Median", f: () => dora([], [{ beginn: T0, ende: T0 + 30 * 60e3 }, { beginn: T0 + H, ende: T0 + H + 90 * 60e3 }, { beginn: T0 + 2 * H, ende: T0 + 2 * H + 10 * 60e3 }], T0, T0 + TAG).wiederherstellungMinutenMedian, soll: 30 },
  { id: "BK04", art: "Grenzwert", t: "Ohne Deploys keine Fehlerquote (null statt 0)", f: () => dora([], [], T0, T0 + TAG).fehlerquoteAenderung, soll: null },
  { id: "BK05", art: "Negativ", t: "Platzhalterpreis → keine Kostenangabe", f: () => kostenCent({ id: 2, centJeMioIn: "${PREIS_2_IN}", centJeMioOut: "${PREIS_2_OUT}" }, 1000, 1000), fehler: "E_PREIS" },
  { id: "BK06", art: "Positiv", t: "Ein- und Ausgabe getrennt bepreist, aufgerundet", f: () => kostenCent(S1, 10000, 2000), soll: 2 },
  { id: "BK07", art: "Grenzwert", t: "Summe×Eingabepreis wäre zu niedrig (Gegenprobe)", f: () => monatsschaetzung(S1, 1000, 1000, 100).centJeMonat > Math.ceil((2000 * 100 / 1e6) * 100 * 30), soll: true },
  { id: "BK08", art: "Positiv", t: "Kosten je Vorgang aus dem Journal", f: () => kostenJeVorgang([{ vorgangsart: "angebot", vorgang: "A1", cent: 3 }, { vorgangsart: "angebot", vorgang: "A1", cent: 1 }, { vorgangsart: "angebot", vorgang: "A2", cent: 2 }]).angebot.centJeVorgang, soll: 3 },
  { id: "BK09", art: "Negativ", t: "Cache nie für Rechnungen", f: () => cacheTrefferErlaubt({ aehnlichkeit: 0.99, promptVersion: "1.0.0", laeuftAb: T0 + TAG }, { promptVersion: "1.0.0", jetzt: T0, kategorie: "rechnung" }).ok, soll: false },
  { id: "BK10", art: "Grenzwert", t: "Ähnlichkeit knapp unter Schwelle → kein Treffer", f: () => cacheTrefferErlaubt({ aehnlichkeit: 0.969, promptVersion: "1.0.0", laeuftAb: T0 + TAG }, { promptVersion: "1.0.0", jetzt: T0 }).ok, soll: false },
  { id: "BK11", art: "Positiv", t: "Schuldbuch: hohes Risiko, wenig Aufwand zuerst", f: () => schuldPrioritaet([{ id: "a", risiko: 1, aufwandTage: 1 }, { id: "b", risiko: 3, aufwandTage: 1 }, { id: "c", risiko: 3, aufwandTage: 10 }])[0].id, soll: "b" },
  { id: "BK12", art: "Negativ", t: "Schuldposten ohne Aufwand abgelehnt", f: () => schuldPrioritaet([{ id: "x", risiko: 2, aufwandTage: 0 }]), fehler: "E_POSTEN" },
];
