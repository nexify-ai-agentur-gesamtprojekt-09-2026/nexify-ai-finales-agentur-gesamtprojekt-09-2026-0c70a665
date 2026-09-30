// NeXifyAI Einstellungen · ein Schema für vor und nach der Anmeldung · Einwilligung (TDDDG § 25, DSGVO Art. 7) · reine Funktionen
// Vor der Anmeldung: nur Gerät (localStorage, Präfix nx.). Nach der Anmeldung: Konto (Server, /v1/account/settings), Gerät bleibt Vorrang für Darstellung.
// Muster übernommen aus LibreChat/Open-WebUI-Einstellungen (Allgemein, Chat, Daten, Konto) und ergänzt um Barrierefreiheit, Benachrichtigung, Datenschutz.

export class EinstellungFehler extends Error { constructor(code, msg) { super(msg); this.name = "EinstellungFehler"; this.code = code; } }
export const SCHEMA_VERSION = 2;

// art: auswahl | schalter | zahl · bereich: vor = vor Anmeldung möglich · ebene: geraet | konto
export const SCHEMA = {
  sprache:        { gruppe: "allgemein", art: "auswahl", werte: ["de", "nl", "en", "fr"], standard: "de", bereich: "vor", ebene: "geraet", titel: "Sprache" },
  markt:          { gruppe: "allgemein", art: "auswahl", werte: ["DE", "AT", "CH", "NL", "BE", "LU", "FR"], standard: "DE", bereich: "vor", ebene: "geraet", titel: "Land und Steuer" },
  schriftgroesse: { gruppe: "barrierefreiheit", art: "auswahl", werte: ["S", "M", "L", "XL"], standard: "M", bereich: "vor", ebene: "geraet", titel: "Schriftgröße", norm: "WCAG 1.4.4" },
  bewegung:       { gruppe: "barrierefreiheit", art: "auswahl", werte: ["system", "reduziert", "voll"], standard: "system", bereich: "vor", ebene: "geraet", titel: "Bewegung", norm: "WCAG 2.3.3" },
  kontrast:       { gruppe: "barrierefreiheit", art: "auswahl", werte: ["normal", "hoch"], standard: "normal", bereich: "vor", ebene: "geraet", titel: "Kontrast", norm: "WCAG 1.4.6" },
  unterstreichen: { gruppe: "barrierefreiheit", art: "schalter", standard: false, bereich: "vor", ebene: "geraet", titel: "Links unterstreichen", norm: "WCAG 1.4.1" },
  enterSendet:    { gruppe: "chat", art: "schalter", standard: true, bereich: "nach", ebene: "konto", titel: "Enter sendet" },
  kostenZeigen:   { gruppe: "chat", art: "schalter", standard: true, bereich: "nach", ebene: "konto", titel: "Kosten je Antwort zeigen" },
  denkenZeigen:   { gruppe: "chat", art: "schalter", standard: false, bereich: "nach", ebene: "konto", titel: "Zwischenschritte der KI aufklappen" },
  quellenPflicht: { gruppe: "chat", art: "schalter", standard: true, bereich: "nach", ebene: "konto", titel: "Nur belegte Antworten anzeigen", sperre: "pascal" },
  chatLoeschTage: { gruppe: "daten", art: "auswahl", werte: [30, 90, 180, 365], standard: 90, bereich: "nach", ebene: "konto", titel: "Chats löschen nach (Tagen)", norm: "DSGVO Art. 5 Abs. 1 lit. e" },
  gedaechtnis:    { gruppe: "daten", art: "schalter", standard: true, bereich: "nach", ebene: "konto", titel: "Gedächtnis nutzen" },
  training:       { gruppe: "daten", art: "schalter", standard: false, bereich: "nach", ebene: "konto", titel: "Korrekturen für Modelltraining freigeben", norm: "DSGVO Art. 6/7 – nur mit Einwilligung" },
  tagesbericht:   { gruppe: "benachrichtigung", art: "auswahl", werte: ["aus", "18:00", "19:30", "21:00"], standard: "19:30", bereich: "nach", ebene: "konto", titel: "Tagesbericht" },
  entscheidungMelden: { gruppe: "benachrichtigung", art: "auswahl", werte: ["sofort", "stuendlich", "tagesbericht"], standard: "sofort", bereich: "nach", ebene: "konto", titel: "Neue Entscheidungen melden" },
  ruhezeit:       { gruppe: "benachrichtigung", art: "auswahl", werte: ["aus", "20-07", "22-07"], standard: "22-07", bereich: "nach", ebene: "konto", titel: "Ruhezeit (Stufe 3 meldet trotzdem)" },
  zweiterFaktor:  { gruppe: "konto", art: "schalter", standard: true, bereich: "nach", ebene: "konto", titel: "Zweiter Faktor", sperre: "admin-pflicht" },
};
export const GRUPPEN = { allgemein: "Allgemein", barrierefreiheit: "Barrierefreiheit", chat: "Chat", daten: "Daten und Datenschutz", benachrichtigung: "Benachrichtigungen", konto: "Konto" };

export function standard(bereich) { return Object.fromEntries(Object.entries(SCHEMA).filter(([, d]) => !bereich || bereich === "nach" || d.bereich === "vor").map(([k, d]) => [k, d.standard])); }

export function setzen(werte, schluessel, wert, kontext = {}) {
  const d = SCHEMA[schluessel]; if (!d) throw new EinstellungFehler("E_SCHLUESSEL", "Unbekannte Einstellung " + schluessel);
  if (d.bereich === "nach" && !kontext.angemeldet) throw new EinstellungFehler("E_ANMELDUNG", d.titel + " nur nach Anmeldung");
  if (d.sperre === "admin-pflicht" && wert === false && kontext.rolle === "admin") throw new EinstellungFehler("E_PFLICHT", "Zweiter Faktor ist für Admin-Konten Pflicht");
  if (d.sperre === "pascal" && kontext.rolle !== "admin") throw new EinstellungFehler("E_RECHT", d.titel + " stellt nur Pascal um");
  if (d.art === "schalter" && typeof wert !== "boolean") throw new EinstellungFehler("E_WERT", d.titel + ": an oder aus");
  if (d.art === "auswahl" && !d.werte.includes(wert)) throw new EinstellungFehler("E_WERT", d.titel + ": " + d.werte.join(" | "));
  return { ...werte, [schluessel]: wert };
}

// Zusammenführen: Konto (Server) + Gerät; Darstellung (Ebene geraet) gewinnt vom Gerät, alles andere vom Konto
export function zusammenfuehren(geraet, konto) {
  const out = standard("nach");
  for (const [k, d] of Object.entries(SCHEMA)) { const q = d.ebene === "geraet" ? (geraet ?? {}) : (konto ?? {}); if (q[k] !== undefined) { try { setzen(out, k, q[k], { angemeldet: true, rolle: "admin" }); out[k] = q[k]; } catch (e) { /* ungültig → Standard */ } } }
  return out;
}

// Migration alter Speicherstände (z. B. Workspace v1: {enterSend, fontSize, keepDays})
export function migrieren(alt) {
  if (!alt || typeof alt !== "object") return { version: SCHEMA_VERSION, werte: standard("nach") };
  if (alt.version === SCHEMA_VERSION) return alt;
  const w = standard("nach");
  if (typeof alt.enterSend === "boolean") w.enterSendet = alt.enterSend;
  if (["S", "M", "L", "XL"].includes(alt.fontSize)) w.schriftgroesse = alt.fontSize;
  if (typeof alt.showCost === "boolean") w.kostenZeigen = alt.showCost;
  const tage = Number(alt.keepDays); if ([30, 90, 180, 365].includes(tage)) w.chatLoeschTage = tage;
  return { version: SCHEMA_VERSION, werte: w, migriertVon: alt.version || 1 };
}

// Darstellung aus Einstellungen (für jede Fläche gleich)
export function darstellung(w, system = {}) {
  const px = { S: 14, M: 16, L: 18, XL: 20 }[w.schriftgroesse] || 16;
  const reduziert = w.bewegung === "reduziert" || (w.bewegung === "system" && system.reduziertBevorzugt === true);
  return { grundschrift: px + "px", bewegung: reduziert ? "reduziert" : "voll", textSekundaer: w.kontrast === "hoch" ? "#E3E6E3" : "#BCC1BD", linkDeko: w.unterstreichen ? "underline" : "none" };
}

// ---------- Einwilligung (TDDDG § 25, DSGVO Art. 7) ----------
export const ZWECKE = {
  notwendig: { pflicht: true, titel: "Notwendig", text: "Anmeldung, Warenkorb, Sicherheit, diese Auswahl selbst." },
  statistik: { pflicht: false, titel: "Statistik", text: "Anonyme Reichweitenmessung mit Matomo auf eigenem Server in der EU." },
  komfort:   { pflicht: false, titel: "Komfort", text: "Eingebettete Karten und Videos von Drittanbietern." },
  marketing: { pflicht: false, titel: "Marketing", text: "Messung von Kampagnen und Werbepartnern." },
};
export const EINWILLIGUNG_VERSION = "2026-09-28";
export function einwilligung(auswahl, jetzt, quelle) {
  if (!["alle", "ablehnen", "auswahl"].includes(quelle)) throw new EinstellungFehler("E_QUELLE", "alle | ablehnen | auswahl");
  const z = {}; for (const [k, d] of Object.entries(ZWECKE)) z[k] = d.pflicht ? true : quelle === "alle" ? true : quelle === "ablehnen" ? false : auswahl[k] === true;
  return { version: EINWILLIGUNG_VERSION, zeit: new Date(jetzt).toISOString(), quelle, zwecke: z };
}
// Muss der Dialog (erneut) erscheinen? Ohne Entscheidung, bei neuer Fassung oder nach 12 Monaten
export function dialogNoetig(gespeichert, jetzt) {
  if (!gespeichert || !gespeichert.zwecke) return true;
  if (gespeichert.version !== EINWILLIGUNG_VERSION) return true;
  return jetzt - Date.parse(gespeichert.zeit) > 365 * 86400e3;
}
export const erlaubt = (e, zweck) => !!(e && e.zwecke && e.zwecke[zweck]);

// Datenübertragbarkeit (Art. 20): Export ohne Geheimnisse, Import mit Prüfung
export function exportieren(w) { return JSON.stringify({ format: "nexify-einstellungen", version: SCHEMA_VERSION, werte: w }, null, 2); }
export function importieren(text, kontext) {
  let o; try { o = JSON.parse(text); } catch (e) { throw new EinstellungFehler("E_FORMAT", "Keine gültige Datei"); }
  if (o.format !== "nexify-einstellungen") throw new EinstellungFehler("E_FORMAT", "Falsches Format");
  let w = standard("nach"), verworfen = [];
  for (const [k, v] of Object.entries(o.werte || {})) { try { w = setzen(w, k, v, kontext); } catch (e) { verworfen.push(k); } }
  return { werte: w, verworfen };
}

// ---------- Prüffälle ----------
const T = Date.UTC(2026, 8, 28);
export const FAELLE = [
  { id: "ES01", art: "Positiv", t: "Vor Anmeldung nur Geräte-Einstellungen", f: () => Object.keys(standard("vor")).sort().join(","), soll: "bewegung,kontrast,markt,schriftgroesse,sprache,unterstreichen" },
  { id: "ES02", art: "Negativ", t: "Chat-Einstellung vor Anmeldung verweigert", f: () => setzen({}, "enterSendet", false, {}), fehler: "E_ANMELDUNG" },
  { id: "ES03", art: "Negativ", t: "Ungültiger Wert abgelehnt", f: () => setzen({}, "chatLoeschTage", 7, { angemeldet: true }), fehler: "E_WERT" },
  { id: "ES04", art: "Negativ", t: "Admin kann zweiten Faktor nicht abschalten", f: () => setzen({}, "zweiterFaktor", false, { angemeldet: true, rolle: "admin" }), fehler: "E_PFLICHT" },
  { id: "ES05", art: "Negativ", t: "Nur Pascal schaltet »nur belegte Antworten« ab", f: () => setzen({}, "quellenPflicht", false, { angemeldet: true, rolle: "team" }), fehler: "E_RECHT" },
  { id: "ES06", art: "Positiv", t: "Darstellung vom Gerät, Rest vom Konto", f: () => { const w = zusammenfuehren({ schriftgroesse: "XL", enterSendet: false }, { schriftgroesse: "S", enterSendet: true }); return w.schriftgroesse + "/" + w.enterSendet; }, soll: "XL/true" },
  { id: "ES07", art: "Grenzwert", t: "Ungültiger gespeicherter Wert fällt auf Standard zurück", f: () => zusammenfuehren({ kontrast: "grell" }, {}).kontrast, soll: "normal" },
  { id: "ES08", art: "Positiv", t: "Migration aus Workspace v1", f: () => { const m = migrieren({ enterSend: false, fontSize: "L", keepDays: "180", showCost: false }); return [m.werte.enterSendet, m.werte.schriftgroesse, m.werte.chatLoeschTage, m.werte.kostenZeigen, m.migriertVon].join("/"); }, soll: "false/L/180/false/1" },
  { id: "ES09", art: "Positiv", t: "System-Vorgabe »weniger Bewegung« wird übernommen", f: () => darstellung({ bewegung: "system" }, { reduziertBevorzugt: true }).bewegung, soll: "reduziert" },
  { id: "ES10", art: "Negativ", t: "Ablehnen lässt nur Notwendiges an", f: () => Object.values(einwilligung({}, T, "ablehnen").zwecke).filter(Boolean).length, soll: 1 },
  { id: "ES11", art: "Positiv", t: "Auswahl: nur gewählte Zwecke", f: () => { const e = einwilligung({ statistik: true }, T, "auswahl"); return erlaubt(e, "statistik") + "/" + erlaubt(e, "marketing"); }, soll: "true/false" },
  { id: "ES12", art: "Grenzwert", t: "Neue Fassung der Einwilligung → Dialog erneut", f: () => dialogNoetig({ version: "2026-01-01", zeit: new Date(T).toISOString(), zwecke: {} }, T), soll: true },
  { id: "ES13", art: "Grenzwert", t: "Nach 12 Monaten erneut fragen", f: () => dialogNoetig(einwilligung({}, T, "alle"), T + 366 * 86400e3), soll: true },
  { id: "ES14", art: "Positiv", t: "Frische Entscheidung → kein Dialog", f: () => dialogNoetig(einwilligung({}, T, "ablehnen"), T + 86400e3), soll: false },
  { id: "ES15", art: "Negativ", t: "Import verwirft unzulässige Werte und meldet sie", f: () => importieren(exportieren({ schriftgroesse: "XXL", tagesbericht: "19:30" }), { angemeldet: true }).verworfen.join(","), soll: "schriftgroesse" },
];
