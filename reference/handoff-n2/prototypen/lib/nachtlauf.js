// NeXifyAI Nachtlauf · 03:00 im Worker · verbindet die täglichen Pflichten der Kerne zu einem prüfbaren Lauf
// Karten ablaufen lassen → Gedächtnis vergessen → RAG-Delta planen → Kennzahlen rechnen → Tagesbefunde für den Bericht 19:30
// Reine Orchestrierung; Datenzugriff wird als Werte hereingereicht, Ergebnis ist ein Bericht plus Änderungen, die der Worker schreibt.
import { ablaufen, offen } from "./entscheidungen.js";
import { vergessen } from "./gedaechtnis.js";
import { syncPlan } from "./rag.js";
import { dora, kostenJeVorgang, schuldPrioritaet } from "./betriebskennzahlen.js";
import { trefferquote } from "./prompt-cache.js";

const TAG = 864e5;
// e = { jetzt, postfach, speicher, fertigeLaeufe, quelle, index, modell, deploys, vorfaelle, journal, usages, schuld }
export function nachtlauf(e) {
  const befunde = [];
  const pf = ablaufen(e.postfach, e.jetzt); if (pf.abgelaufen) befunde.push({ art: "karten.abgelaufen", n: pf.abgelaufen, text: pf.abgelaufen + " Karte(n) ohne Antwort verfallen (gelten als abgelehnt)" });
  const v = vergessen(e.speicher, e.jetzt, { fertigeLaeufe: e.fertigeLaeufe || [] });
  const plan = syncPlan(e.quelle || [], e.index || [], e.modell);
  if (plan.vollReindex) befunde.push({ art: "rag.vollReindex", text: plan.grund });
  const k = dora(e.deploys || [], e.vorfaelle || [], e.jetzt - 30 * TAG, e.jetzt);
  const kosten = kostenJeVorgang(e.journal || []);
  const cache = trefferquote(e.usages || []); if (cache.alarm) befunde.push({ art: "cache.alarm", text: "Cache-Trefferquote " + Math.round(cache.quote * 100) + " % – Runbook RB-05" });
  const schuld = schuldPrioritaet(e.schuld || []).slice(0, 5);
  const dringend = offen(pf.postfach, e.jetzt).filter((x) => x.ablauf - e.jetzt < TAG);
  if (dringend.length) befunde.push({ art: "karten.dringend", n: dringend.length, text: dringend.length + " Entscheidung(en) laufen in < 24 h ab" });
  return {
    schreiben: { postfach: pf.postfach, speicher: v.speicher, rag: { einbetten: plan.neu.concat(plan.geaendert), loeschen: plan.geloescht } },
    bericht: { zeit: new Date(e.jetzt).toISOString(), geloescht: v.geloescht.length, ragEinbetten: plan.einbetten, ragEntfernenTeile: plan.entfernenTeile, dora: k, kostenJeVorgang: kosten, cacheQuote: cache.quote, schuldTop5: schuld.map((s) => s.id), befunde },
  };
}

// ---------- Prüffälle ----------
const T = Date.UTC(2026, 8, 29, 3, 0);
const E = (x = {}) => ({ jetzt: T, postfach: { karten: [{ id: "E-1", status: "offen", ablauf: T - 1, stufe: 2 }, { id: "E-2", status: "offen", ablauf: T + 3600e3, stufe: 3 }], protokoll: [] }, speicher: { eintraege: [{ id: "p", art: "episodisch", status: "gueltig", meta: { personenbezogen: true, loeschfristTage: 30, datum: T - 31 * TAG } }], protokoll: [] }, quelle: [{ id: "d1", text: "neu" }], index: [], modell: "emb-v1", deploys: [{ t: T - TAG, ok: true }], vorfaelle: [], journal: [{ vorgangsart: "angebot", vorgang: "A1", cent: 4 }], usages: [], schuld: [{ id: "S1", risiko: 3, aufwandTage: 1 }], ...x });
export const FAELLE = [
  { id: "NL01", art: "Positiv", t: "Abgelaufene Karte verfällt und wird gemeldet", f: () => nachtlauf(E()).bericht.befunde.find((b) => b.art === "karten.abgelaufen").n, soll: 1 },
  { id: "NL02", art: "Positiv", t: "Personenbezug nach Frist gelöscht", f: () => nachtlauf(E()).bericht.geloescht, soll: 1 },
  { id: "NL03", art: "Positiv", t: "Neues Dokument wird zum Einbetten geplant", f: () => nachtlauf(E()).bericht.ragEinbetten, soll: 1 },
  { id: "NL04", art: "Grenzwert", t: "Karte läuft in < 24 h ab → im Bericht", f: () => nachtlauf(E()).bericht.befunde.some((b) => b.art === "karten.dringend"), soll: true },
  { id: "NL05", art: "Positiv", t: "Kosten je Vorgang kommen aus dem Journal", f: () => nachtlauf(E()).bericht.kostenJeVorgang.angebot.centJeVorgang, soll: 4 },
  { id: "NL06", art: "Negativ", t: "Ohne Einbettungsmodell bricht der Lauf ab (kein stiller Teil-Sync)", f: () => { try { nachtlauf(E({ modell: undefined })); return "lief"; } catch (e) { return e.code; } }, soll: "E_MODELL" },
];
