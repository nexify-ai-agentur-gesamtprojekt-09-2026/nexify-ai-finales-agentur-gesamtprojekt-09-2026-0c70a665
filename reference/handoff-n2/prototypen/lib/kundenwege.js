// NeXifyAI Kundenwege · Registrierung, Angebotsannahme, Erstbesuch mit Onboarding als reine Zustandslogik
// Keine Ein-/Ausgabe: Gateway speichert, versendet und protokolliert; dieser Kern entscheidet.
// Bezug: docs/handoffs/kundenwege/spezifikationspruefung.md (Neun-Punkte-Prüfung), Regelwerk R-08/R-13, DSGVO Art. 7, § 14 BGB.

export class WegFehler extends Error { constructor(code, msg) { super(msg); this.name = "WegFehler"; this.code = code; } }
const MIN = 60e3, STD = 3600e3, TAG = 24 * STD;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------- Registrierung ----------
export const REG = { pwMin: 12, linkGueltigStd: 24, erneutAbstandMin: 1, erneutProStunde: 5 };

export function registrieren(eingabe, bestehend, jetzt) {
  const email = String(eingabe.email || "").trim().toLowerCase();
  if (!EMAIL.test(email)) throw new WegFehler("E_EMAIL", "E-Mail-Adresse prüfen");
  if (String(eingabe.passwort || "").length < REG.pwMin) throw new WegFehler("E_PASSWORT", "Mindestens " + REG.pwMin + " Zeichen");
  if (!["kunde", "partner", "nachbarschaft", "affiliate"].includes(eingabe.rolle)) throw new WegFehler("E_ROLLE", "Rolle wählen");
  if (eingabe.einwilligung?.vertrag !== true) throw new WegFehler("E_PFLICHT", "Ohne AGB und Datenschutzhinweis kein Konto");
  const freiwillig = { werbung: eingabe.einwilligung.werbung === true, analyse: eingabe.einwilligung.analyse === true };
  // Aufzählungsschutz: Antwort für Nutzer immer gleich; nur die versendete Nachricht unterscheidet sich
  const antwort = { schirm: "bestaetigen", email };
  if (bestehend) return { antwort, nachricht: "konto-besteht", konto: null };
  const konto = { email, rolle: eingabe.rolle, zustand: "unbestaetigt", angelegt: jetzt, einwilligung: { vertrag: true, ...freiwillig, zeit: jetzt, fassung: eingabe.fassung }, link: { ab: jetzt, bis: jetzt + REG.linkGueltigStd * STD, benutzt: false }, versand: [jetzt] };
  return { antwort, nachricht: "bestaetigungslink", konto };
}

export function bestaetigen(konto, jetzt) {
  if (konto.zustand === "aktiv") return { konto, schirm: "anmelden", hinweis: "bereits bestaetigt" };
  if (konto.link.benutzt) throw new WegFehler("E_LINK_BENUTZT", "Link wurde schon verwendet");
  if (jetzt > konto.link.bis) throw new WegFehler("E_LINK_ABGELAUFEN", "Link abgelaufen – neuen anfordern");
  return { konto: { ...konto, zustand: "aktiv", link: { ...konto.link, benutzt: true }, bestaetigt: jetzt }, schirm: "erstbesuch" };
}

export function erneutSenden(konto, jetzt) {
  const letzte = konto.versand[konto.versand.length - 1];
  if (jetzt - letzte < REG.erneutAbstandMin * MIN) throw new WegFehler("E_ZU_SCHNELL", "Bitte eine Minute warten");
  if (konto.versand.filter((t) => jetzt - t < STD).length >= REG.erneutProStunde) throw new WegFehler("E_LIMIT", "Zu viele Anforderungen – in einer Stunde erneut");
  return { ...konto, link: { ab: jetzt, bis: jetzt + REG.linkGueltigStd * STD, benutzt: false }, versand: [...konto.versand, jetzt] };
}

// Einladung aus dem Angebot: Der Link beweist den Besitz der Adresse – keine zweite Bestätigung
export function einladungAnnehmen(einladung, passwort, jetzt) {
  if (jetzt > einladung.bis) throw new WegFehler("E_LINK_ABGELAUFEN", "Einladung abgelaufen – NeXify sendet eine neue");
  if (einladung.benutzt) throw new WegFehler("E_LINK_BENUTZT", "Einladung schon angenommen – bitte anmelden");
  if (String(passwort || "").length < REG.pwMin) throw new WegFehler("E_PASSWORT", "Mindestens " + REG.pwMin + " Zeichen");
  return { konto: { email: einladung.email, rolle: "kunde", firma: einladung.firma, zustand: "aktiv", bestaetigt: jetzt, einwilligung: null }, schirm: "einwilligung", angebot: einladung.angebot };
}

// ---------- Angebotsannahme ----------
export const ANGEBOT_ZUSTAENDE = ["versendet", "angesehen", "angenommen", "abgelehnt", "abgelaufen", "ersetzt"];

export function angebotAnsehen(ang, konto, jetzt) {
  darfSehen(ang, konto);
  const zustand = ang.zustand === "versendet" ? "angesehen" : ang.zustand;
  const abgelaufen = !["angenommen", "abgelehnt", "ersetzt"].includes(zustand) && jetzt > ang.gueltigBis;
  const z = abgelaufen ? "abgelaufen" : zustand;
  return { ...ang, zustand: z, erstGesehen: ang.erstGesehen ?? jetzt, annehmbar: ["versendet", "angesehen"].includes(z), summe: summe(ang.positionen, ang.ustSatz) };
}

// antrag = { version, zeichnungsberechtigt, unternehmer, agbFassung, bestellnummer?, schluessel }
// Idempotenz-Schlüssel gilt je Firma und Angebot – derselbe Schlüssel auf einem anderen Angebot darf kein fremdes Ergebnis liefern
export const idemSchluessel = (ang, konto, schluessel) => ang.firma + ":" + ang.nummer + ":" + konto.email + ":" + schluessel;
export function angebotAnnehmen(ang, konto, antrag, jetzt, frueher = {}) {
  const idem = idemSchluessel(ang, konto, antrag.schluessel);
  if (frueher[idem]) return frueher[idem]; // Idempotenz: Doppelklick, Wiederholung nach Abbruch
  darfSehen(ang, konto);
  if (ang.zustand === "angenommen") throw new WegFehler("E_SCHON_ANGENOMMEN", "Bereits angenommen am " + new Date(ang.angenommen.zeit).toISOString().slice(0, 10));
  if (ang.zustand === "ersetzt") throw new WegFehler("E_ERSETZT", "Es gibt eine neuere Fassung dieses Angebots");
  if (ang.zustand === "abgelehnt") throw new WegFehler("E_ABGELEHNT", "Angebot wurde abgelehnt – bitte neues anfragen");
  if (jetzt > ang.gueltigBis) throw new WegFehler("E_ABGELAUFEN", "Angebot abgelaufen – Verlängerung anfragen");
  if (antrag.version !== ang.version) throw new WegFehler("E_VERSION", "Das Angebot wurde geändert – bitte die neue Fassung prüfen");
  if (antrag.unternehmer !== true) throw new WegFehler("E_UNTERNEHMER", "NeXify beauftragt nur Unternehmen (§ 14 BGB)");
  if (antrag.zeichnungsberechtigt !== true) throw new WegFehler("E_BERECHTIGUNG", "Bitte bestätigen, dass Sie beauftragen dürfen – oder an die berechtigte Person weiterleiten");
  if (!antrag.agbFassung) throw new WegFehler("E_AGB", "AGB-Fassung fehlt");
  const s = summe(ang.positionen, ang.ustSatz);
  const ergebnis = {
    angebot: { ...ang, zustand: "angenommen", angenommen: { zeit: jetzt, von: konto.email, agbFassung: antrag.agbFassung, bestellnummer: antrag.bestellnummer || null, summe: s } },
    ereignis: { typ: "auftrag.angenommen", angebot: ang.nummer, version: ang.version, bruttoCent: s.bruttoCent, zeit: jetzt },
    dokument: "auftragsbestaetigung", schirm: "danke", onboarding: true,
  };
  return ergebnis;
}

export function angebotAblehnen(ang, konto, grund, jetzt) {
  darfSehen(ang, konto);
  if (!["versendet", "angesehen"].includes(ang.zustand)) throw new WegFehler("E_ZUSTAND", "Nur offene Angebote können abgelehnt werden");
  return { ...ang, zustand: "abgelehnt", abgelehnt: { zeit: jetzt, von: konto.email, grund: String(grund || "").slice(0, 500) || null } };
}

function darfSehen(ang, konto) {
  if (!konto || konto.zustand !== "aktiv") throw new WegFehler("E_ANMELDUNG", "Bitte anmelden");
  if (konto.rolle !== "kunde" || konto.firma !== ang.firma) throw new WegFehler("E_FREMD", "Kein Zugriff auf dieses Angebot"); // gleiche Antwort wie „nicht vorhanden“ im Gateway (404)
}

export function summe(positionen, ustSatz) {
  const nettoCent = positionen.reduce((a, p) => { if (!Number.isInteger(p.einzelCent) || !Number.isInteger(p.menge)) throw new WegFehler("E_CENT", "Beträge in ganzen Cent"); return a + p.einzelCent * p.menge; }, 0);
  const ustCent = Math.round(nettoCent * ustSatz / 100);
  return { nettoCent, ustCent, bruttoCent: nettoCent + ustCent, ustSatz };
}

// ---------- Erstbesuch und Onboarding ----------
export const SCHRITTE = [
  { id: "willkommen", pflicht: false, titel: "Willkommen" },
  { id: "firma", pflicht: true, titel: "Rechnungsdaten" },
  { id: "team", pflicht: false, titel: "Team einladen", nurAdmin: true },
  { id: "kickoff", pflicht: true, titel: "Kickoff-Termin" },
  { id: "sicherheit", pflicht: false, titel: "Zweiter Faktor" },
];

export function onboardingStart(konto, bestand = {}) {
  const erledigt = {};
  if (bestand.firmaVollstaendig) erledigt.firma = "bestand"; // Bestandskunden werden nicht erneut gefragt
  if (bestand.zweiterFaktor) erledigt.sicherheit = "bestand";
  if (bestand.kickoff) erledigt.kickoff = "bestand";
  return { erledigt, uebersprungen: {}, aktuell: naechster({ erledigt, uebersprungen: {} }, konto), admin: konto.admin === true };
}

export function schrittAbschliessen(stand, konto, id, daten, jetzt) {
  const s = SCHRITTE.find((x) => x.id === id); if (!s) throw new WegFehler("E_SCHRITT", "Unbekannter Schritt");
  if (s.nurAdmin && !konto.admin) throw new WegFehler("E_BERECHTIGUNG", "Nur Firmen-Admins laden ein");
  if (id === "firma") pruefeFirma(daten);
  if (id === "team") for (const e of daten.einladungen || []) if (!EMAIL.test(e)) throw new WegFehler("E_EMAIL", "E-Mail prüfen: " + e);
  if (id === "kickoff" && !(daten.slot > jetzt + TAG)) throw new WegFehler("E_SLOT", "Termin frühestens morgen");
  const n = { ...stand, erledigt: { ...stand.erledigt, [id]: jetzt }, uebersprungen: { ...stand.uebersprungen } };
  delete n.uebersprungen[id];
  return { ...n, aktuell: naechster(n, konto) };
}

export function schrittUeberspringen(stand, konto, id) {
  const s = SCHRITTE.find((x) => x.id === id);
  if (!s || s.pflicht) throw new WegFehler("E_PFLICHT", s ? s.titel + " ist nötig, bevor das Projekt startet" : "Unbekannter Schritt");
  const n = { ...stand, uebersprungen: { ...stand.uebersprungen, [id]: true } };
  return { ...n, aktuell: naechster(n, konto) };
}

export function fortschritt(stand, konto) {
  const sichtbar = SCHRITTE.filter((s) => !s.nurAdmin || konto.admin);
  const fertig = sichtbar.filter((s) => stand.erledigt[s.id] || stand.uebersprungen[s.id]).length;
  const offenPflicht = sichtbar.filter((s) => s.pflicht && !stand.erledigt[s.id]).map((s) => s.id);
  return { fertig, gesamt: sichtbar.length, offenPflicht, abgeschlossen: offenPflicht.length === 0 && fertig === sichtbar.length };
}

function naechster(stand, konto) {
  const s = SCHRITTE.find((x) => (!x.nurAdmin || konto.admin) && !stand.erledigt[x.id] && !stand.uebersprungen[x.id]);
  return s ? s.id : "fertig";
}

function pruefeFirma(d) {
  if (!d || !String(d.name || "").trim()) throw new WegFehler("E_FIRMA", "Firmenname fehlt");
  if (!String(d.strasse || "").trim() || !/^\d{4,5}$/.test(String(d.plz || "")) || !String(d.ort || "").trim()) throw new WegFehler("E_ADRESSE", "Rechnungsadresse unvollständig");
  if (d.ustId && !/^[A-Z]{2}[0-9A-Z]{8,12}$/.test(String(d.ustId).replace(/\s/g, ""))) throw new WegFehler("E_USTID", "USt-IdNr. im Format DE123456789");
}

// Tippfehler in häufigen Domains → Vorschlag, nie automatische Korrektur (Nutzer entscheidet)
const DOMAINS = ["gmail.com", "gmx.de", "gmx.net", "web.de", "t-online.de", "outlook.com", "outlook.de", "hotmail.com", "hotmail.de", "yahoo.com", "yahoo.de", "icloud.com", "posteo.de", "mailbox.org", "freenet.de", "arcor.de"];
const abstand = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
export function emailVorschlag(email) {
  const e = String(email || "").trim().toLowerCase(); const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const dom = e.slice(at + 1); if (!dom || DOMAINS.includes(dom)) return null;
  let best = null, bd = 3;
  for (const d of DOMAINS) { const x = abstand(dom, d); if (x < bd) { bd = x; best = d; } }
  return best && bd <= 2 ? e.slice(0, at + 1) + best : null;
}

// ---------- Prüffälle ----------
const T = Date.UTC(2026, 8, 28, 10);
const EIN = (x = {}) => ({ email: "Erika@Musterfirma.de", passwort: "ein langer satz zum merken", rolle: "kunde", einwilligung: { vertrag: true }, fassung: "2026-09-28", ...x });
const K = { email: "erika@musterfirma.de", rolle: "kunde", firma: "f1", zustand: "aktiv", admin: true };
const ANG = (x = {}) => ({ nummer: "A-2026-00302", firma: "f1", version: 2, zustand: "versendet", gueltigBis: T + 10 * TAG, ustSatz: 19, positionen: [{ titel: "NeXify Care", einzelCent: 134700, menge: 1 }], ...x });
const ANTRAG = (x = {}) => ({ version: 2, zeichnungsberechtigt: true, unternehmer: true, agbFassung: "2026-09-01", schluessel: "k-0000000000000001", ...x });
const code = (f) => { try { f(); return "kein Fehler"; } catch (e) { return e.code; } };
const FIRMA = { name: "Musterfirma GmbH", strasse: "Hauptstr. 1", plz: "52062", ort: "Aachen", ustId: "DE123456789" };
export const FAELLE = [
  { id: "KW00", art: "Positiv", t: "Tippfehler gmial.com / gmx.dee → Vorschlag; korrekte und Firmen-Domain → kein Vorschlag", f: () => [emailVorschlag("erika@gmial.com"), emailVorschlag("erika@gmx.dee"), emailVorschlag("erika@gmx.de"), emailVorschlag("erika@musterfirma.de")].join("|"), soll: "erika@gmail.com|erika@gmx.de||" },
  { id: "KW01", art: "Positiv", t: "Registrierung → Bestätigen-Schirm, Adresse normalisiert, freiwillig nicht vorbelegt", f: () => { const r = registrieren(EIN(), null, T); return r.antwort.schirm + "/" + r.konto.email + "/" + r.konto.einwilligung.werbung; }, soll: "bestaetigen/erika@musterfirma.de/false" },
  { id: "KW02", art: "Negativ", t: "Bestehende Adresse → gleiche Antwort, kein zweites Konto (Aufzählungsschutz)", f: () => { const r = registrieren(EIN(), { email: "erika@musterfirma.de" }, T); return r.antwort.schirm + "/" + r.nachricht + "/" + r.konto; }, soll: "bestaetigen/konto-besteht/null" },
  { id: "KW03", art: "Negativ", t: "Ohne Pflichteinwilligung kein Konto", f: () => code(() => registrieren(EIN({ einwilligung: { vertrag: false, werbung: true } }), null, T)), soll: "E_PFLICHT" },
  { id: "KW04", art: "Grenzwert", t: "Passwort 11 Zeichen abgewiesen", f: () => code(() => registrieren(EIN({ passwort: "a".repeat(11) }), null, T)), soll: "E_PASSWORT" },
  { id: "KW05", art: "Grenzwert", t: "Link nach 24 h + 1 s abgelaufen", f: () => code(() => bestaetigen(registrieren(EIN(), null, T).konto, T + 24 * STD + 1000)), soll: "E_LINK_ABGELAUFEN" },
  { id: "KW06", art: "Positiv", t: "Zweiter Klick auf denselben Link führt zur Anmeldung statt Fehler", f: () => { const k = bestaetigen(registrieren(EIN(), null, T).konto, T + MIN).konto; return bestaetigen(k, T + 2 * MIN).schirm; }, soll: "anmelden" },
  { id: "KW07", art: "Negativ", t: "Erneut senden nach 30 s gebremst, 6. Anforderung in 1 h gesperrt", f: () => { let k = registrieren(EIN(), null, T).konto; const a = code(() => erneutSenden(k, T + 30e3)); for (let i = 1; i <= 4; i++) k = erneutSenden(k, T + i * 2 * MIN); return a + "/" + code(() => erneutSenden(k, T + 11 * MIN)); }, soll: "E_ZU_SCHNELL/E_LIMIT" },
  { id: "KW08", art: "Positiv", t: "Einladung aus Angebot → aktiv ohne zweite Bestätigung, danach Einwilligung", f: () => { const r = einladungAnnehmen({ email: "erika@musterfirma.de", firma: "f1", angebot: "A-2026-00302", bis: T + 7 * TAG, benutzt: false }, "ein langer satz zum merken", T); return r.konto.zustand + "/" + r.schirm; }, soll: "aktiv/einwilligung" },
  { id: "KW09", art: "Positiv", t: "Annahme: Summe in Cent, Ereignis, Onboarding folgt", f: () => { const r = angebotAnnehmen(ANG(), K, ANTRAG(), T); return r.angebot.zustand + "/" + r.ereignis.bruttoCent + "/" + r.onboarding; }, soll: "angenommen/160293/true" },
  { id: "KW10", art: "Negativ", t: "Doppelklick mit gleichem Schlüssel → dasselbe Ergebnis, kein zweiter Auftrag", f: () => { const r = angebotAnnehmen(ANG(), K, ANTRAG(), T); const f = { [idemSchluessel(ANG(), K, ANTRAG().schluessel)]: r }; return angebotAnnehmen(r.angebot, K, ANTRAG(), T + 500, f) === r; }, soll: true },
  { id: "KW11", art: "Negativ", t: "Zweite Annahme mit neuem Schlüssel → klarer Hinweis statt Doppelauftrag", f: () => code(() => angebotAnnehmen(angebotAnnehmen(ANG(), K, ANTRAG(), T).angebot, K, ANTRAG({ schluessel: "k-0000000000000002" }), T + MIN)), soll: "E_SCHON_ANGENOMMEN" },
  { id: "KW12", art: "Grenzwert", t: "Annahme 1 ms nach Gültigkeitsende abgewiesen", f: () => code(() => angebotAnnehmen(ANG(), K, ANTRAG(), T + 10 * TAG + 1)), soll: "E_ABGELAUFEN" },
  { id: "KW13", art: "Negativ", t: "Während der Prüfung geändert (Version 3) → neue Fassung prüfen", f: () => code(() => angebotAnnehmen(ANG({ version: 3 }), K, ANTRAG(), T)), soll: "E_VERSION" },
  { id: "KW14", art: "Negativ", t: "Fremde Firma sieht das Angebot nicht", f: () => code(() => angebotAnsehen(ANG(), { ...K, firma: "f2" }, T)), soll: "E_FREMD" },
  { id: "KW15", art: "Negativ", t: "Ohne Zeichnungsberechtigung keine Annahme", f: () => code(() => angebotAnnehmen(ANG(), K, ANTRAG({ zeichnungsberechtigt: false }), T)), soll: "E_BERECHTIGUNG" },
  { id: "KW16", art: "Positiv", t: "Ansehen setzt »angesehen« und zeigt Abgelaufenes als abgelaufen", f: () => angebotAnsehen(ANG(), K, T).zustand + "/" + angebotAnsehen(ANG(), K, T + 11 * TAG).annehmbar, soll: "angesehen/false" },
  { id: "KW17", art: "Positiv", t: "Bestandskunde mit vollständigen Daten wird nicht erneut nach Rechnungsdaten gefragt", f: () => schrittUeberspringen(onboardingStart(K, { firmaVollstaendig: true }), K, "willkommen").aktuell, soll: "team" },
  { id: "KW18", art: "Negativ", t: "Pflichtschritt Rechnungsdaten nicht überspringbar", f: () => code(() => schrittUeberspringen(onboardingStart(K), K, "firma")), soll: "E_PFLICHT" },
  { id: "KW19", art: "Negativ", t: "Nicht-Admin sieht »Team« nicht und darf nicht einladen", f: () => { const k = { ...K, admin: false }; return fortschritt(onboardingStart(k), k).gesamt + "/" + code(() => schrittAbschliessen(onboardingStart(k), k, "team", { einladungen: [] }, T)); }, soll: "4/E_BERECHTIGUNG" },
  { id: "KW20", art: "Rollback", t: "Unterbrochen und fortgesetzt: Stand bleibt, nächster offener Schritt", f: () => { let s = onboardingStart(K); s = schrittUeberspringen(s, K, "willkommen"); s = schrittAbschliessen(s, K, "firma", FIRMA, T); const wieder = JSON.parse(JSON.stringify(s)); return wieder.aktuell + "/" + fortschritt(wieder, K).fertig; }, soll: "team/2" },
  { id: "KW21", art: "Negativ", t: "USt-IdNr. im falschen Format abgewiesen", f: () => code(() => schrittAbschliessen(onboardingStart(K), K, "firma", { ...FIRMA, ustId: "123" }, T)), soll: "E_USTID" },
  { id: "KW22", art: "Grenzwert", t: "Kickoff heute abgewiesen, morgen + 1 min angenommen", f: () => code(() => schrittAbschliessen(onboardingStart(K), K, "kickoff", { slot: T + STD }, T)) + "/" + schrittAbschliessen(onboardingStart(K), K, "kickoff", { slot: T + TAG + MIN }, T).erledigt.kickoff, soll: "E_SLOT/" + T },
  { id: "KW24", art: "Negativ", t: "Gleicher Schlüssel auf anderem Angebot liefert kein fremdes Ergebnis", f: () => { const r = angebotAnnehmen(ANG(), K, ANTRAG(), T); const f = { [idemSchluessel(ANG(), K, ANTRAG().schluessel)]: r }; return angebotAnnehmen(ANG({ nummer: "A-2026-00399" }), K, ANTRAG(), T, f).angebot.nummer; }, soll: "A-2026-00399" },
  { id: "KW23", art: "Positiv", t: "Alle Pflichtschritte erledigt → abgeschlossen", f: () => { let s = onboardingStart(K, { zweiterFaktor: true }); s = schrittUeberspringen(s, K, "willkommen"); s = schrittAbschliessen(s, K, "firma", FIRMA, T); s = schrittUeberspringen(s, K, "team"); s = schrittAbschliessen(s, K, "kickoff", { slot: T + 2 * TAG }, T); return s.aktuell + "/" + fortschritt(s, K).abgeschlossen; }, soll: "fertig/true" },
];
