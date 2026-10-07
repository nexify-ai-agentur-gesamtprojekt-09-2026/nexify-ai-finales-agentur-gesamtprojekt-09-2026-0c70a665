// NeXifyAI Regelwerk-Kern · Regeln aus AGENT.md § 0 als ausführbare Schranke · reine Funktionen, kein I/O
// Jede Aktion eines Agenten, Dienstes oder Menschen läuft vor der Ausführung durch pruefe(). Unbekannte Aktionen sind gesperrt (fail-closed).
// Regeltexte und Parameter: config/regelwerk.json. Dieser Kern ist die einzige Stelle, an der entschieden wird.
import { KI_HINWEIS } from "./posteingang.js";

export const ENTSCHEIDUNG = ["erlaubt", "mensch", "gesperrt"];
export const AKTIONEN = ["lesen", "entwurf.anlegen", "mail.senden", "ki.antwort", "modell.aufruf", "daten.speichern", "geld.buchen",
  "inhalt.veroeffentlichen", "preis.aendern", "rechtstext.aendern", "recht.aendern", "deploy.vorschau", "deploy.live", "computer.bedienen",
  "server.reboot", "dns.live", "firewall.voll", "endabnahme", "lernen.uebernehmen", "server.bereinigen"];
const HARTSPERREN = { "server.reboot": "REBOOT", "dns.live": "LIVE-DNS", "firewall.voll": "FIREWALL" };
const GEHEIMNIS = [/\bsk-[A-Za-z0-9_-]{20,}/, /\bAKIA[0-9A-Z]{16}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bnx_(live|test)_[A-Za-z0-9]{16,}/, /\b(passwor[dt]|secret|api[_-]?key)\s*[:=]\s*["']?[^\s"'${}]{8,}/i, /\bghp_[A-Za-z0-9]{30,}/, /\bglpat-[A-Za-z0-9_-]{20,}/];
const TAG = 24 * 3600 * 1000;
const RASTER = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144]; // Design-Norm § Raster

function v(regel, folge, grund) { return { regel, folge, grund }; }
const geheimnisIn = (x) => { const s = typeof x === "string" ? x : JSON.stringify(x ?? ""); return GEHEIMNIS.some((r) => r.test(s)); };

// Einzelfreigabe-Wortlaut: »FREIGABE <ART> <Ziel …>. Pascal, TT.MM.JJJJ HH:MM« – höchstens 24 h alt
export function einzelfreigabeGueltig(text, art, jetzt) {
  const m = String(text || "").match(/^FREIGABE ([A-Z-]+) (.+?)\.? Pascal, (\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!m || m[1] !== art) return false;
  const t = Date.UTC(+m[5], +m[4] - 1, +m[3], +m[6], +m[7]);
  return t <= jetzt + 5 * 60e3 && jetzt - t <= TAG;
}

// Jede Regel: (aktion, kontext, cfg) → Verstoß | null. Reihenfolge ist egal, alle Regeln laufen immer.
export const REGELN = [
  ["R-11", "#stopp hat Vorrang", (a, k) => k.stopp && a.typ !== "lesen" ? v("R-11", "gesperrt", "#stopp aktiv – nur Lesen erlaubt") : null],
  ["R-00", "Nur registrierte Aktionen", (a) => !AKTIONEN.includes(a.typ) ? v("R-00", "gesperrt", "Aktionstyp nicht registriert: " + a.typ) : null],
  ["R-01", "Endabnahme nur durch Pascal", (a) => a.typ === "endabnahme" && a.akteur !== "pascal" ? v("R-01", "gesperrt", "Endabnahme ist nicht delegierbar") : null],
  ["R-02", "Hartsperren nur mit Einzelfreigabe", (a, k) => HARTSPERREN[a.typ] && !einzelfreigabeGueltig(a.einzelfreigabe, HARTSPERREN[a.typ], k.jetzt) ? v("R-02", "gesperrt", "Einzelfreigabe " + HARTSPERREN[a.typ] + " fehlt, falsch oder älter als 24 h") : null],
  ["R-03", "Live nur mit vollständigem Gate-Nachweis", (a) => {
    if (a.typ !== "deploy.live") return null;
    const n = a.nachweis || {}, fehlt = [];
    for (const f of ["vorschau", "health60", "e3"]) if (n[f] !== "PASS") fehlt.push(f);
    if (n.rollbackAusgefuehrt !== true) fehlt.push("rollbackAusgefuehrt");
    if (!n.gutachten) fehlt.push("gutachten");
    if (!n.endabnahme) fehlt.push("endabnahme");
    return fehlt.length ? v("R-03", "gesperrt", "Gate unvollständig: " + fehlt.join(", ")) : null;
  }],
  ["R-04", "Geld nur über den Rechenkern, idempotent, Storno als Gegenbuchung", (a) => {
    if (a.typ !== "geld.buchen") return null;
    if (a.quelle !== "rechenkern") return v("R-04", "gesperrt", "Buchung nicht aus lib/rechenkern.js");
    if (!a.idempotenzSchluessel) return v("R-04", "gesperrt", "Idempotenz-Schlüssel fehlt");
    if (!Number.isInteger(a.betragCent)) return v("R-04", "gesperrt", "Betrag in ganzen Cent");
    if (a.art === "loeschen" || a.art === "aendern") return v("R-04", "gesperrt", "Buchungen werden nie gelöscht oder geändert – Storno als Gegenbuchung");
    return null;
  }],
  ["R-05", "KI-Kennzeichnung (Art. 50 KI-VO)", (a) => {
    if (a.typ === "mail.senden" && a.ki && !String(a.text || "").includes(KI_HINWEIS)) return v("R-05", "gesperrt", "KI-Mail ohne festen Hinweissatz");
    if (a.typ === "ki.antwort" && a.kennzeichnung !== true) return v("R-05", "gesperrt", "KI-Antwort ohne sichtbare Kennzeichnung");
    if (a.typ === "ki.antwort" && a.belegPruefung === false) return v("R-20", "gesperrt", "Belegprüfung nicht bestanden – Antwort wird nicht ausgeliefert");
    return null;
  }],
  ["R-06", "EU-Verarbeitung, Drittland nur mit AVV/SCC", (a, k, c) => {
    if (a.typ !== "modell.aufruf" && a.typ !== "daten.speichern") return null;
    if (!String(a.region || "").startsWith("eu-")) return v("R-06", "gesperrt", "Region nicht EU: " + (a.region || "unbekannt"));
    const anb = (c.anbieter || {})[a.anbieter];
    if (a.personenbezogen && anb && anb.drittland && !anb.avvScc) return v("R-06", "gesperrt", "Personenbezogene Daten an Drittlandanbieter ohne AVV/SCC: " + a.anbieter);
    return null;
  }],
  ["R-07", "Keine Geheimnisse in Inhalten, Logs, Repo", (a) => geheimnisIn([a.text, a.inhalt, a.daten]) ? v("R-07", "gesperrt", "Geheimnis-Muster im Inhalt – nur OpenBao-Verweis zulässig") : null],
  ["R-08", "Keine erfundenen Zahlen", (a) => {
    if (a.typ !== "inhalt.veroeffentlichen") return null;
    const ohne = (a.zahlen || []).filter((z) => !z.beleg && z.beispiel !== true);
    return ohne.length ? v("R-08", "gesperrt", "Zahl ohne Beleg und ohne Beispiel-Kennzeichnung: " + ohne.map((z) => z.wert).join(", ")) : null;
  }],
  ["R-09", "Preise, Rechte, Rechtstexte nie automatisch", (a) => ["preis.aendern", "rechtstext.aendern", "recht.aendern"].includes(a.typ) && a.akteur !== "pascal" ? v("R-09", "mensch", "nur als Entwurf; Übernahme durch Pascal") : null],
  ["R-10", "Lernen nur über das Bewertungs-Gate", (a) => {
    if (a.typ !== "lernen.uebernehmen") return null;
    if (!a.gate || a.gate.entscheidung !== "BESTANDEN") return v("R-10", "gesperrt", "Kandidat hat das Bewertungs-Gate nicht bestanden");
    if (a.stufe === 100 && a.akteur !== "pascal") return v("R-10", "mensch", "Übernahme auf 100 % nur durch Pascal");
    return null;
  }],
  ["R-12", "Tagesbudget des Agenten", (a, k) => a.typ === "modell.aufruf" && Number.isInteger(k.budgetCent) && (k.verbrauchtCent || 0) + (a.kostenCent || 0) > k.budgetCent ? v("R-12", "gesperrt", "Tagesbudget überschritten") : null],
  ["R-13", "Server-Bereinigung nur mit Sicherung, Inventar und Probelauf", (a) => {
    if (a.typ !== "server.bereinigen") return null;
    const f = [];
    if (!a.sicherungGeprueft) f.push("Sicherung wiederhergestellt und geprüft");
    if (!a.inventar || !a.inventar.length) f.push("Inventar der zu entfernenden Objekte");
    if (!a.probelauf) f.push("Probelauf (check mode)");
    if (f.length) return v("R-13", "gesperrt", "Es fehlt: " + f.join(", "));
    return a.akteur !== "pascal" ? v("R-13", "mensch", "Löschen nach Probelauf nur mit Bestätigung durch Pascal") : null;
  }],
  ["R-21", "Bildschirmsteuerung nur als letzte Wahl, nur in der Sandbox", (a) => {
    if (a.typ !== "computer.bedienen") return null;
    if (a.apiVorhanden === true) return v("R-21", "gesperrt", "API/MCP vorhanden – Bildschirmsteuerung verboten");
    const s = a.sandbox || {}, fehlt = [];
    if (s.netz !== "intern") fehlt.push("Netz intern");
    if (s.readOnly !== true) fehlt.push("Dateisystem nur lesend");
    if (s.hostZugang === true) fehlt.push("keine Host-Zugangsdaten");
    if (!(s.maxSchritte > 0 && s.maxSchritte <= 50)) fehlt.push("maxSchritte 1–50");
    if (!(s.maxKostenCent > 0)) fehlt.push("Kostengrenze je Lauf");
    if (fehlt.length) return v("R-21", "gesperrt", "Sandbox unvollständig: " + fehlt.join(", "));
    if (a.folgenreich === true) return v("R-21", "mensch", "Löschen, Zahlen, Senden per Bildschirm nur nach Freigabe");
    return null;
  }],
  ["R-14", "Vorschau-Deploy nur mit grüner Testsuite", (a) => a.typ === "deploy.vorschau" && !(a.tests && a.tests.gruen === true && a.tests.gesamt > 0) ? v("R-14", "gesperrt", "Testsuite nicht grün oder leer") : null],
];

export function pruefe(aktion, kontext = {}, cfg = {}) {
  if (!aktion || typeof aktion !== "object" || !aktion.typ) return { erlaubt: false, entscheidung: "gesperrt", verstoesse: [v("R-00", "gesperrt", "Aktion ohne Typ")], geprueft: 0 };
  const k = { jetzt: Date.now(), ...kontext };
  const verstoesse = [];
  for (const [, , f] of REGELN) { try { const x = f(aktion, k, cfg); if (x) verstoesse.push(x); } catch (e) { verstoesse.push(v("R-FEHLER", "gesperrt", "Regel wirft: " + e.message)); } }
  const entscheidung = verstoesse.some((x) => x.folge === "gesperrt") ? "gesperrt" : verstoesse.some((x) => x.folge === "mensch") ? "mensch" : "erlaubt";
  return { erlaubt: entscheidung === "erlaubt", entscheidung, verstoesse, geprueft: REGELN.length, typ: aktion.typ, akteur: aktion.akteur || "unbekannt", t: k.jetzt };
}

// ---------- Projektprüfung: dieselben Regeln gegen Dateien (CI und Leitstand) ----------
export function pruefeDateien(dateien) {
  const befunde = [];
  for (const [pfad, inhalt] of Object.entries(dateien)) {
    const s = String(inhalt || "");
    // Selbst-Ausschluss und Testpfade muessen auch bei vorangestelltem Verzeichnis greifen.
    if (!/\.example$|(^|\/)tests\//.test(pfad) && !/(^|\/)lib\/regelwerk\.js$/.test(pfad) && geheimnisIn(s)) befunde.push({ regel: "R-07", pfad, grund: "Geheimnis-Muster" });
    if (/\.dc\.html$/.test(pfad) && /(role:\s*"ai"|9router|KI-Antwort)/.test(s) && !/Art\. 50/.test(s)) befunde.push({ regel: "R-05", pfad, grund: "Fläche mit KI-Antworten ohne Art.-50-Hinweis" });
    if (pfad === "config/integrationen.json") {
      try { for (const d of JSON.parse(s).dienste || []) if (d.status === "vorhanden" && !d.belegt_am) befunde.push({ regel: "R-15", pfad, grund: d.id + ": »vorhanden« ohne belegt_am" }); }
      catch (e) { befunde.push({ regel: "R-00", pfad, grund: "JSON ungültig" }); }
    }
    if (/\.(js|html)$/.test(pfad) && /\{\{\s*[^}]*[+\-!()?][^}]*\}\}/.test(s)) befunde.push({ regel: "R-16", pfad, grund: "Ausdruck in Template-Loch" });
    if (/\.dc\.html$/.test(pfad) && !/^NeXifyAI Cloud( v[3-9])?\.dc\.html$/.test(pfad) && !/Wireframes?\.dc\.html$/i.test(pfad)) { // Skizzen sind kein Produkt
      const tpl = s.split(/<script (?:type="text\/x-dc" )?data-dc-script/)[0]; const ab = new Set();
      for (const m of tpl.matchAll(/(?:^|[;"\s])(padding|margin|gap|row-gap|column-gap)(?:-[a-z]+)?:([^;"{}]*)/g)) { if (/calc|clamp|min\(|max\(|var\(/.test(m[2])) continue; for (const x of m[2].matchAll(/(\d+(?:\.\d+)?)px/g)) { const w = +x[1]; if (w <= 144 && !RASTER.includes(w)) ab.add(w); } }
      if (ab.size) befunde.push({ regel: "R-17", pfad, grund: "Abstand außerhalb des Rasters: " + [...ab].sort((a, b) => a - b).join(", ") + " px" });
      const umbruch = [...s.matchAll(/\+ ?" (ct|€|EUR|km|kg|mm|cm|min|Std\.|h|%|Tage|MB|KB|GB|px|Token)"/g)].map((m) => m[1]);
      const js = s.split(/data-dc-script[^>]*>/)[1] || "";
      for (const m of ["componentDidMount", "componentDidUpdate", "componentWillUnmount", "renderVals"]) { const k = (js.match(new RegExp("\\n\\s{2}" + m + "\\(", "g")) || []).length; if (k > 1) befunde.push({ regel: "R-19", pfad, grund: m + " " + k + "× definiert – nur die letzte wirkt" }); }
      if (umbruch.length) befunde.push({ regel: "R-18", pfad, grund: "Zahl und Einheit mit normalem Leerzeichen (DIN 5008): " + [...new Set(umbruch)].join(", ") });
    }
  }
  return { ok: befunde.length === 0, befunde, dateien: Object.keys(dateien).length };
}

// ---------- Prüffälle (Vitest liest diese Liste) ----------
const J = Date.UTC(2026, 8, 27, 12, 0);
const P = (a, k) => pruefe(a, { jetzt: J, ...k }, { anbieter: { composio: { drittland: true, avvScc: false }, mistral: { drittland: false } } });
const GATE = { vorschau: "PASS", health60: "PASS", e3: "PASS", rollbackAusgefuehrt: true, gutachten: "NX-WS-KERNE-2026-09", endabnahme: "2026-09-27T12:00Z" };
export const FAELLE = [
  { id: "RW01", art: "Negativ", t: "Unbekannte Aktion ist gesperrt", f: () => P({ typ: "datei.loeschen" }).entscheidung, soll: "gesperrt" },
  { id: "RW02", art: "Positiv", t: "Lesen ist erlaubt", f: () => P({ typ: "lesen" }).entscheidung, soll: "erlaubt" },
  { id: "RW03", art: "Negativ", t: "#stopp sperrt alles außer Lesen", f: () => P({ typ: "entwurf.anlegen" }, { stopp: true }).verstoesse[0].regel, soll: "R-11" },
  { id: "RW04", art: "Negativ", t: "Endabnahme durch Director gesperrt", f: () => P({ typ: "endabnahme", akteur: "director" }).entscheidung, soll: "gesperrt" },
  { id: "RW05", art: "Positiv", t: "Endabnahme durch Pascal erlaubt", f: () => P({ typ: "endabnahme", akteur: "pascal" }).entscheidung, soll: "erlaubt" },
  { id: "RW06", art: "Negativ", t: "Live-DNS ohne Einzelfreigabe gesperrt", f: () => P({ typ: "dns.live" }).entscheidung, soll: "gesperrt" },
  { id: "RW07", art: "Positiv", t: "Live-DNS mit gültiger Einzelfreigabe erlaubt", f: () => P({ typ: "dns.live", einzelfreigabe: "FREIGABE LIVE-DNS vorschau.nexifyai.cloud → Frankfurt, noindex. Pascal, 27.09.2026 10:00" }).entscheidung, soll: "erlaubt" },
  { id: "RW08", art: "Grenzwert", t: "Einzelfreigabe älter als 24 h gesperrt", f: () => P({ typ: "dns.live", einzelfreigabe: "FREIGABE LIVE-DNS vorschau. Pascal, 26.09.2026 11:59" }).entscheidung, soll: "gesperrt" },
  { id: "RW09", art: "Negativ", t: "Freigabe für falsche Hartsperre gilt nicht", f: () => P({ typ: "server.reboot", einzelfreigabe: "FREIGABE LIVE-DNS x. Pascal, 27.09.2026 10:00" }).entscheidung, soll: "gesperrt" },
  { id: "RW10", art: "Negativ", t: "Live ohne ausgeführten Rollback gesperrt", f: () => P({ typ: "deploy.live", nachweis: { ...GATE, rollbackAusgefuehrt: false } }).verstoesse[0].grund, soll: "Gate unvollständig: rollbackAusgefuehrt" },
  { id: "RW11", art: "Positiv", t: "Live mit vollständigem Nachweis erlaubt", f: () => P({ typ: "deploy.live", nachweis: GATE }).entscheidung, soll: "erlaubt" },
  { id: "RW12", art: "Negativ", t: "Buchung außerhalb des Rechenkerns gesperrt", f: () => P({ typ: "geld.buchen", quelle: "n8n", idempotenzSchluessel: "k", betragCent: 100 }).entscheidung, soll: "gesperrt" },
  { id: "RW13", art: "Negativ", t: "Buchung löschen gesperrt (GoBD)", f: () => P({ typ: "geld.buchen", quelle: "rechenkern", idempotenzSchluessel: "k", betragCent: 100, art: "loeschen" }).entscheidung, soll: "gesperrt" },
  { id: "RW14", art: "Positiv", t: "Gegenbuchung über Rechenkern erlaubt", f: () => P({ typ: "geld.buchen", quelle: "rechenkern", idempotenzSchluessel: "k", betragCent: -100, art: "storno" }).entscheidung, soll: "erlaubt" },
  { id: "RW15", art: "Negativ", t: "KI-Mail ohne Hinweissatz gesperrt", f: () => P({ typ: "mail.senden", ki: true, text: "Anbei die Skizze." }).entscheidung, soll: "gesperrt" },
  { id: "RW16", art: "Positiv", t: "KI-Mail mit Hinweissatz erlaubt", f: () => P({ typ: "mail.senden", ki: true, text: "Hallo\n\n" + KI_HINWEIS }).entscheidung, soll: "erlaubt" },
  { id: "RW17", art: "Negativ", t: "Modellaufruf außerhalb der EU gesperrt", f: () => P({ typ: "modell.aufruf", region: "us-east-1" }).entscheidung, soll: "gesperrt" },
  { id: "RW18", art: "Negativ", t: "Personenbezug an Drittland ohne AVV/SCC gesperrt", f: () => P({ typ: "daten.speichern", region: "eu-central", anbieter: "composio", personenbezogen: true }).verstoesse[0].regel, soll: "R-06" },
  { id: "RW19", art: "Negativ", t: "Schlüssel im Inhalt gesperrt", f: () => P({ typ: "entwurf.anlegen", text: "api_key = 'abcd1234efgh5678'" }).verstoesse[0].regel, soll: "R-07" },
  { id: "RW20", art: "Positiv", t: "OpenBao-Verweis ist kein Geheimnis", f: () => P({ typ: "entwurf.anlegen", text: "api_key: ${ROUTER_KEY}" }).entscheidung, soll: "erlaubt" },
  { id: "RW21", art: "Negativ", t: "Zahl ohne Beleg nicht veröffentlichen", f: () => P({ typ: "inhalt.veroeffentlichen", zahlen: [{ wert: "4 Min." }, { wert: "3 Tage", beispiel: true }] }).verstoesse[0].grund, soll: "Zahl ohne Beleg und ohne Beispiel-Kennzeichnung: 4 Min." },
  { id: "RW22", art: "Grenzwert", t: "Preisänderung durch Agent → Mensch", f: () => P({ typ: "preis.aendern", akteur: "angebot" }).entscheidung, soll: "mensch" },
  { id: "RW23", art: "Negativ", t: "Lernkandidat ohne Gate gesperrt", f: () => P({ typ: "lernen.uebernehmen", stufe: 5 }).entscheidung, soll: "gesperrt" },
  { id: "RW24", art: "Grenzwert", t: "Lernkandidat 100 % durch Agent → Mensch", f: () => P({ typ: "lernen.uebernehmen", stufe: 100, gate: { entscheidung: "BESTANDEN" } }).entscheidung, soll: "mensch" },
  { id: "RW25", art: "Grenzwert", t: "Tagesbudget: 1 ct zu viel gesperrt", f: () => P({ typ: "modell.aufruf", region: "eu-central", kostenCent: 2 }, { budgetCent: 100, verbrauchtCent: 99 }).verstoesse[0].regel, soll: "R-12" },
  { id: "RW26", art: "Negativ", t: "Bereinigung ohne Probelauf gesperrt", f: () => P({ typ: "server.bereinigen", sicherungGeprueft: true, inventar: ["alt-dsh"] }).entscheidung, soll: "gesperrt" },
  { id: "RW27", art: "Rollback", t: "Bereinigung nach Probelauf wartet auf Pascal", f: () => P({ typ: "server.bereinigen", sicherungGeprueft: true, inventar: ["alt-dsh"], probelauf: true, akteur: "director" }).entscheidung, soll: "mensch" },
  { id: "RW28", art: "Negativ", t: "Vorschau-Deploy mit leerer Suite gesperrt", f: () => P({ typ: "deploy.vorschau", tests: { gruen: true, gesamt: 0 } }).entscheidung, soll: "gesperrt" },
  { id: "RW29", art: "Negativ", t: "Mehrere Verstöße werden alle gemeldet", f: () => P({ typ: "mail.senden", ki: true, text: "sk-ABCDEFGHIJKLMNOPQRSTUVWX" }).verstoesse.length, soll: 2 },
  { id: "RW31", art: "Negativ", t: "Dateiprüfung findet Abstand außerhalb des Rasters", f: () => pruefeDateien({ "X.dc.html": '<div style="padding:10px 16px;gap:8px"></div>' }).befunde[0].grund, soll: "Abstand außerhalb des Rasters: 10 px" },
  { id: "RW32", art: "Positiv", t: "Rasterwerte und clamp() sind zulässig", f: () => pruefeDateien({ "X.dc.html": '<div style="padding:12px 16px;margin:clamp(88px,10vw,144px) auto"></div>' }).ok, soll: true },
  { id: "RW33", art: "Negativ", t: "Zahl + Einheit mit normalem Leerzeichen wird gemeldet", f: () => pruefeDateien({ "X.dc.html": 'const ct = (v) => v + " ct";' }).befunde[0].regel, soll: "R-18" },
  { id: "RW34", art: "Negativ", t: "Doppelte Lebenszyklus-Methode wird gemeldet", f: () => pruefeDateien({ "X.dc.html": '<script type="text/x-dc" data-dc-script>\nclass Component extends DCLogic {\n  componentDidUpdate() {}\n  componentDidUpdate(a, b) {}\n}' }).befunde[0].regel, soll: "R-19" },
  { id: "RW35", art: "Negativ", t: "Antwort mit gescheiterter Belegprüfung gesperrt", f: () => P({ typ: "ki.antwort", kennzeichnung: true, belegPruefung: false }).verstoesse[0].regel, soll: "R-20" },
  { id: "RW36", art: "Negativ", t: "Bildschirmsteuerung trotz vorhandener API gesperrt", f: () => P({ typ: "computer.bedienen", apiVorhanden: true }).verstoesse[0].regel, soll: "R-21" },
  { id: "RW37", art: "Negativ", t: "Bildschirmsteuerung mit Internetzugang gesperrt", f: () => P({ typ: "computer.bedienen", sandbox: { netz: "offen", readOnly: true, maxSchritte: 30, maxKostenCent: 50 } }).entscheidung, soll: "gesperrt" },
  { id: "RW38", art: "Grenzwert", t: "Sandbox vollständig, aber Zahlung → Freigabe nötig", f: () => P({ typ: "computer.bedienen", folgenreich: true, sandbox: { netz: "intern", readOnly: true, maxSchritte: 30, maxKostenCent: 50 } }).entscheidung, soll: "mensch" },
  { id: "RW30", art: "Negativ", t: "Dateiprüfung findet »vorhanden« ohne Beleg", f: () => pruefeDateien({ "config/integrationen.json": JSON.stringify({ dienste: [{ id: "x", status: "vorhanden" }] }) }).befunde[0].regel, soll: "R-15" },
];
