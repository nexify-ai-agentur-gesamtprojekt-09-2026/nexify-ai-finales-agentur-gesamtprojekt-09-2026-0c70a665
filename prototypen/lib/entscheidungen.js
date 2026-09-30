// NeXifyAI Entscheidungs-Postfach · Karten aus Regelwerk, Langlauf, Posteingang, Selbstheilung, Gedächtnis, Lernschleife
// Reine Funktionen. Design: docs/plans/2026-09-28-agentur-steuerung-design.md §3.1–3.2, ADR-0002.
// Grundsatz: vorschlagen, dann ausführen. Ausgeführt wird genau einmal, nur die freigegebene Fassung (Hash), nie nach Ablauf.
import { einzelfreigabeGueltig } from "./regelwerk.js";

export class PostfachFehler extends Error { constructor(code, msg) { super(msg); this.name = "PostfachFehler"; this.code = code; } }
export const QUELLEN = ["regelwerk", "langlauf", "posteingang", "selbstheilung", "gedaechtnis", "lernschleife"];
const H = 3600e3, TAG = 24 * H;
const HART = { "server.reboot": "REBOOT", "dns.live": "LIVE-DNS", "firewall.voll": "FIREWALL", endabnahme: null };
const NACH_AUSSEN = ["mail.senden", "inhalt.veroeffentlichen", "deploy.live"];
const HEIKEL = ["geld.buchen", "preis.aendern", "rechtstext.aendern", "recht.aendern", "lernen.uebernehmen", "server.bereinigen", "zugang.aendern", "budget.erhoehen"];
const INTERN_UMKEHRBAR = ["entwurf.anlegen", "posteingang.zuordnen", "dienst.neustart", "runbook.schatten", "lauf.pausieren"];

const fnv = (s) => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
// kanonisch und rekursiv: jede Ebene sortiert, Arrays in Reihenfolge (ein Replacer-Array würde verschachtelte Schlüssel verwerfen)
const stabil = (o) => o === null || typeof o !== "object" ? JSON.stringify(o) : Array.isArray(o) ? "[" + o.map(stabil).join(",") + "]" : "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + stabil(o[k])).join(",") + "}";
export const aktionsHash = (a) => fnv(stabil(a));

// Stufe aus der Aktion berechnen – nie vom Agenten übernehmen (§3.2)
export function stufe(aktion, regelEntscheidung) {
  if (aktion.typ in HART) return 3;
  if (regelEntscheidung === "mensch" || NACH_AUSSEN.includes(aktion.typ) || HEIKEL.includes(aktion.typ)) return 2;
  if (aktion.typ === "lesen") return 0;
  if (INTERN_UMKEHRBAR.includes(aktion.typ)) return 1;
  return 2; // unbekannt = vorsichtig
}
export function sensibel(aktion) { return (aktion.typ === "geld.buchen" && Math.abs(aktion.betragCent || 0) > 50000) || /recht|zugang/.test(aktion.typ) || aktion.typ === "budget.erhoehen"; }

export function neuesPostfach() { return { karten: [], protokoll: [] }; }

export function anlegen(pf, e, jetzt) {
  if (!QUELLEN.includes(e.quelle)) throw new PostfachFehler("E_QUELLE", "Quelle: " + QUELLEN.join("|"));
  if (!e.aktion || !e.aktion.typ) throw new PostfachFehler("E_AKTION", "Aktion mit Typ fehlt");
  const st = stufe(e.aktion, e.regelEntscheidung);
  if (st < 2) return { postfach: { ...pf, protokoll: [...pf.protokoll, { t: jetzt, e: "Stufe " + st + " ohne Karte: " + e.aktion.typ }] }, karte: null, stufe: st };
  for (const f of ["beleg", "erwartet", "rueckweg"]) if (!e[f] || !String(e[f]).trim()) throw new PostfachFehler("E_KARTE", "Karte braucht " + f + " (was belegt es, was passiert, wie geht es zurück)");
  const hash = aktionsHash(e.aktion);
  const doppelt = pf.karten.find((k) => k.hash === hash && k.status === "offen");
  if (doppelt) return { postfach: pf, karte: doppelt, stufe: st, doppelt: true };
  const frist = st === 3 || sensibel(e.aktion) ? TAG : 7 * TAG;
  const karte = { id: "E-" + (pf.karten.length + 1), quelle: e.quelle, titel: e.titel || e.aktion.typ, aktion: e.aktion, hash, stufe: st, gruppe: e.gruppe || e.aktion.typ + "|" + (e.aktion.vorlage || ""), beleg: e.beleg, erwartet: e.erwartet, rueckweg: e.rueckweg, bezug: e.bezug || null, erstellt: jetzt, ablauf: jetzt + frist, status: "offen", ausgefuehrt: false };
  return { postfach: { karten: [...pf.karten, karte], protokoll: [...pf.protokoll, { t: jetzt, e: "Karte " + karte.id + " Stufe " + st }] }, karte, stufe: st };
}

export function ablaufen(pf, jetzt) {
  let n = 0; const karten = pf.karten.map((k) => { if (k.status === "offen" && k.ablauf <= jetzt) { n++; return { ...k, status: "abgelaufen" }; } return k; });
  return { postfach: n ? { karten, protokoll: [...pf.protokoll, { t: jetzt, e: n + " Karte(n) abgelaufen = abgelehnt" }] } : pf, abgelaufen: n };
}

// Antwort: freigeben · aendern (geänderte Aktion wird die freigegebene Fassung) · ablehnen (mit Grund). Nur Pascal.
export function entscheiden(pf, id, ant, jetzt) {
  const k = pf.karten.find((x) => x.id === id); if (!k) throw new PostfachFehler("E_ID", "Karte " + id + " unbekannt");
  if (ant.wer !== "pascal") throw new PostfachFehler("E_RECHT", "Nur Pascal entscheidet");
  if (k.status !== "offen") throw new PostfachFehler("E_ZUSTAND", "Karte ist " + k.status);
  if (k.ablauf <= jetzt) throw new PostfachFehler("E_ABGELAUFEN", "Frist abgelaufen – Vorgang neu vorschlagen lassen");
  let neu, signal = null;
  if (ant.antwort === "ablehnen") { if (!ant.grund || !ant.grund.trim()) throw new PostfachFehler("E_GRUND", "Ablehnung braucht einen Grund (wird Lernsignal)"); neu = { ...k, status: "abgelehnt", grund: ant.grund }; signal = { art: "hinweis", bereich: k.quelle, muster: k.gruppe, text: ant.grund }; }
  else if (ant.antwort === "freigeben" || ant.antwort === "aendern") {
    if (k.stufe === 3 && HART[k.aktion.typ] && !einzelfreigabeGueltig(ant.einzelfreigabe, HART[k.aktion.typ], jetzt)) throw new PostfachFehler("E_EINZELFREIGABE", "Hartsperre braucht den Wortlaut FREIGABE " + HART[k.aktion.typ] + " … Pascal, TT.MM.JJJJ HH:MM");
    const aktion = ant.antwort === "aendern" ? ant.aenderung : k.aktion;
    if (ant.antwort === "aendern" && (!aktion || aktion.typ !== k.aktion.typ)) throw new PostfachFehler("E_AENDERUNG", "Änderung muss dieselbe Art Aktion sein");
    neu = { ...k, status: "freigegeben", freigabeHash: aktionsHash(aktion), freigabeAktion: aktion, entschieden: jetzt };
    if (ant.antwort === "aendern") signal = { art: "korrektur", bereich: k.quelle, typ: "stil", vorher: JSON.stringify(k.aktion), nachher: JSON.stringify(aktion) };
  } else throw new PostfachFehler("E_ANTWORT", "Antwort: freigeben|aendern|ablehnen");
  return { postfach: { karten: pf.karten.map((x) => x.id === id ? neu : x), protokoll: [...pf.protokoll, { t: jetzt, e: id + " " + neu.status + " durch " + ant.wer }] }, karte: neu, lernsignal: signal };
}

export function sammelFreigeben(pf, ids, wer, jetzt) {
  const ks = ids.map((id) => pf.karten.find((x) => x.id === id));
  if (ks.some((k) => !k)) throw new PostfachFehler("E_ID", "Unbekannte Karte in der Auswahl");
  if (ks.some((k) => k.stufe !== 2)) throw new PostfachFehler("E_SAMMEL", "Sammelfreigabe nur in Stufe 2");
  if (new Set(ks.map((k) => k.gruppe)).size !== 1) throw new PostfachFehler("E_SAMMEL", "Nur gleichartige Karten (gleiche Gruppe)");
  return ids.reduce((acc, id) => entscheiden(acc.postfach, id, { wer, antwort: "freigeben" }, jetzt), { postfach: pf });
}

// Ausführen: genau einmal, nur die freigegebene Fassung
export function ausfuehren(pf, id, aktion, jetzt) {
  const k = pf.karten.find((x) => x.id === id); if (!k) throw new PostfachFehler("E_ID", "Karte unbekannt");
  if (k.status !== "freigegeben") throw new PostfachFehler("E_NICHT_FREI", "Nicht freigegeben (" + k.status + ")");
  if (k.ausgefuehrt) return { postfach: pf, ausfuehren: false, grund: "bereits ausgeführt" };
  if (aktionsHash(aktion) !== k.freigabeHash) throw new PostfachFehler("E_HASH", "Aktion weicht von der freigegebenen Fassung ab – neue Karte nötig");
  return { postfach: { karten: pf.karten.map((x) => x.id === id ? { ...x, ausgefuehrt: true, ausgefuehrtAm: jetzt } : x), protokoll: [...pf.protokoll, { t: jetzt, e: id + " ausgeführt" }] }, ausfuehren: true };
}

export function offen(pf, jetzt) { return pf.karten.filter((k) => k.status === "offen" && k.ablauf > jetzt).sort((a, b) => a.ablauf - b.ablauf || b.stufe - a.stufe); }

// ---------- Prüffälle ----------
const T = Date.UTC(2026, 8, 28, 10, 0);
const MAIL = (an) => ({ typ: "mail.senden", an, vorlage: "eingangsbestaetigung", ki: true });
const KARTE = (a, x = {}) => ({ quelle: "posteingang", aktion: a, beleg: "Mail m2, Kategorie anfrage", erwartet: "Bestätigung an Absender", rueckweg: "Korrekturmail", ...x });
const MIT = (...es) => es.reduce((p, e) => anlegen(p, e, T).postfach, neuesPostfach());
export const FAELLE = [
  { id: "EP01", art: "Positiv", t: "Stufe 1 (intern, umkehrbar) erzeugt keine Karte", f: () => anlegen(neuesPostfach(), KARTE({ typ: "entwurf.anlegen" }), T).karte, soll: null },
  { id: "EP02", art: "Positiv", t: "Mail nach außen = Stufe 2, Frist 7 Tage", f: () => { const k = anlegen(neuesPostfach(), KARTE(MAIL("a@b.de")), T).karte; return k.stufe + "/" + (k.ablauf - T) / TAG; }, soll: "2/7" },
  { id: "EP03", art: "Grenzwert", t: "Geld über 500 € = sensibel, Frist 24 h", f: () => (anlegen(neuesPostfach(), KARTE({ typ: "geld.buchen", betragCent: 50001 }, { quelle: "regelwerk" }), T).karte.ablauf - T) / H, soll: 24 },
  { id: "EP04", art: "Negativ", t: "Karte ohne Rückweg abgelehnt", f: () => anlegen(neuesPostfach(), KARTE(MAIL("a@b.de"), { rueckweg: "" }), T), fehler: "E_KARTE" },
  { id: "EP05", art: "Grenzwert", t: "Gleiche Aktion zweimal = eine Karte", f: () => { const p = MIT(KARTE(MAIL("a@b.de"))); return anlegen(p, KARTE(MAIL("a@b.de")), T).doppelt + "/" + p.karten.length; }, soll: "true/1" },
  { id: "EP06", art: "Negativ", t: "Agent kann nicht entscheiden", f: () => entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "director", antwort: "freigeben" }, T), fehler: "E_RECHT" },
  { id: "EP07", art: "Negativ", t: "Ablehnen ohne Grund nicht möglich", f: () => entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "ablehnen" }, T), fehler: "E_GRUND" },
  { id: "EP08", art: "Positiv", t: "Ablehnung wird Lernsignal »hinweis«", f: () => entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "ablehnen", grund: "Nicht an Freemail-Adressen" }, T).lernsignal.art, soll: "hinweis" },
  { id: "EP09", art: "Negativ", t: "Nach Ablauf keine Entscheidung mehr", f: () => entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "freigeben" }, T + 8 * TAG), fehler: "E_ABGELAUFEN" },
  { id: "EP10", art: "Rollback", t: "Abgelaufene Karte gilt als abgelehnt, nicht ausgeführt", f: () => { const p = ablaufen(MIT(KARTE(MAIL("a@b.de"))), T + 8 * TAG).postfach; return p.karten[0].status + "/" + p.karten[0].ausgefuehrt; }, soll: "abgelaufen/false" },
  { id: "EP11", art: "Negativ", t: "Hartsperre ohne Einzelfreigabe-Wortlaut nicht freigebbar", f: () => entscheiden(MIT(KARTE({ typ: "dns.live", ziel: "vorschau" }, { quelle: "regelwerk" })), "E-1", { wer: "pascal", antwort: "freigeben" }, T), fehler: "E_EINZELFREIGABE" },
  { id: "EP12", art: "Positiv", t: "Hartsperre mit gültigem Wortlaut freigegeben", f: () => entscheiden(MIT(KARTE({ typ: "dns.live", ziel: "vorschau" }, { quelle: "regelwerk" })), "E-1", { wer: "pascal", antwort: "freigeben", einzelfreigabe: "FREIGABE LIVE-DNS vorschau.nexifyai.cloud. Pascal, 28.09.2026 09:30" }, T).karte.status, soll: "freigegeben" },
  { id: "EP13", art: "Positiv", t: "Freigegebene Aktion wird genau einmal ausgeführt", f: () => { let p = entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "freigeben" }, T).postfach; const a = ausfuehren(p, "E-1", MAIL("a@b.de"), T); const b = ausfuehren(a.postfach, "E-1", MAIL("a@b.de"), T); return a.ausfuehren + "/" + b.ausfuehren; }, soll: "true/false" },
  { id: "EP14", art: "Negativ", t: "Nach Freigabe veränderte Aktion wird nicht ausgeführt", f: () => ausfuehren(entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "freigeben" }, T).postfach, "E-1", MAIL("fremd@x.de"), T), fehler: "E_HASH" },
  { id: "EP15", art: "Positiv", t: "Ändern und freigeben: geänderte Fassung gilt, Lernsignal »korrektur«", f: () => { const r = entscheiden(MIT(KARTE(MAIL("a@b.de"))), "E-1", { wer: "pascal", antwort: "aendern", aenderung: { ...MAIL("a@b.de"), vorlage: "eingangsbestaetigung-kurz" } }, T); return ausfuehren(r.postfach, "E-1", { ...MAIL("a@b.de"), vorlage: "eingangsbestaetigung-kurz" }, T).ausfuehren + "/" + r.lernsignal.art; }, soll: "true/korrektur" },
  { id: "EP16", art: "Positiv", t: "Sammelfreigabe für gleichartige Karten", f: () => sammelFreigeben(MIT(KARTE(MAIL("a@b.de")), KARTE(MAIL("c@d.de"))), ["E-1", "E-2"], "pascal", T).postfach.karten.filter((k) => k.status === "freigegeben").length, soll: 2 },
  { id: "EP17", art: "Negativ", t: "Sammelfreigabe mit Hartsperre verweigert", f: () => sammelFreigeben(MIT(KARTE(MAIL("a@b.de")), KARTE({ typ: "server.reboot" }, { quelle: "selbstheilung" })), ["E-1", "E-2"], "pascal", T), fehler: "E_SAMMEL" },
  { id: "EP18", art: "Negativ", t: "Nicht freigegebene Karte nicht ausführbar", f: () => ausfuehren(MIT(KARTE(MAIL("a@b.de"))), "E-1", MAIL("a@b.de"), T), fehler: "E_NICHT_FREI" },
  { id: "EP19", art: "Positiv", t: "Offene Karten nach Frist sortiert (dringend zuerst)", f: () => offen(MIT(KARTE(MAIL("a@b.de")), KARTE({ typ: "geld.buchen", betragCent: 90000 }, { quelle: "regelwerk" })), T).map((k) => k.id).join(","), soll: "E-2,E-1" },
  { id: "EP21", art: "Negativ", t: "Änderung in verschachteltem Wert macht die Freigabe ungültig", f: () => { const p = entscheiden(MIT(KARTE({ typ: "geld.buchen", daten: { betragCent: 100 } }, { quelle: "regelwerk" })), "E-1", { wer: "pascal", antwort: "freigeben" }, T).postfach; return ausfuehren(p, "E-1", { typ: "geld.buchen", daten: { betragCent: 999999 } }, T); }, fehler: "E_HASH" },
  { id: "EP22", art: "Positiv", t: "Schlüsselreihenfolge ändert den Hash nicht", f: () => aktionsHash({ typ: "x", a: { c: 1, b: 2 } }) === aktionsHash({ a: { b: 2, c: 1 }, typ: "x" }), soll: true },
  { id: "EP20", art: "Grenzwert", t: "Unbekannter Aktionstyp landet vorsichtig in Stufe 2", f: () => stufe({ typ: "irgendwas.neu" }), soll: 2 },
];
