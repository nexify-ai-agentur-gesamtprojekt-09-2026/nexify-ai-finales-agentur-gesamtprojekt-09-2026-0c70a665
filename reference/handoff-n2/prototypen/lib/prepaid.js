// NeXifyAI API Prepaid · Preis je Anfrage, Guthaben, Reservierung, Revolut-Aufladung, Nachweis, Rückzahlung
// Reine Logik ohne Ein-/Ausgabe. HMAC wird vom Gateway injiziert (node:crypto), Revolut-Aufrufe macht der Worker.
// Bezug: docs/03-backend/nexifyai-api-abrechnungskonzept.md, docs/03-backend/api-prepaid-umsetzung.md, Revolut Merchant API (Orders, Webhooks v1).
// Einheit intern: Mikrocent (1 € = 100 Cent = 100.000.000 µc) – keine Rundung je Anfrage, Rundung erst je Rechnungsposition.

export class PrepaidFehler extends Error { constructor(code, msg) { super(msg); this.name = "PrepaidFehler"; this.code = code; } }
const UC = 1e6; // µc je Cent
export const zuCent = (uc) => Math.round(uc / UC);

// Preis je Anfrage aus versionierter Preistabelle; modus/satz aus E1 (aufschlag ×(1+s) | marge ÷(1−s))
export function preis(tabelle, modell, usage, opt = {}) {
  const m = tabelle.modelle[modell]; if (!m) throw new PrepaidFehler("E_MODELL", "Modell nicht freigegeben: " + modell);
  for (const f of ["ekEinCent", "ekAusCent"]) if (!Number.isInteger(m[f]) || m[f] < 0) throw new PrepaidFehler("E_PREIS_FEHLT", "Einkaufspreis für " + modell + " nicht freigegeben");
  const tok = (n) => { if (!Number.isInteger(n) || n < 0) throw new PrepaidFehler("E_TOKEN", "Token als ganze Zahl ≥ 0"); return n; };
  const ein = tok(usage.input || 0), aus = tok(usage.output || 0), cache = tok(usage.cacheLesen || 0);
  // EK in Cent je 1 Mio. Token → µc: Token × Cent/1e6 × 1e6 = Token × Cent
  const ekUc = ein * m.ekEinCent + aus * m.ekAusCent + cache * (m.ekCacheCent ?? m.ekEinCent);
  const s = tabelle.satz, modus = tabelle.modus;
  if (!["aufschlag", "marge"].includes(modus) || !(s >= 0 && s < 1)) throw new PrepaidFehler("E_FORMEL", "Preisformel ungültig");
  const vkUc = Math.round(modus === "aufschlag" ? ekUc * (1 + s) : ekUc / (1 - s));
  return { ekUc, vkUc, version: tabelle.version, modell };
}

// Konto: { mandant, saldoUc, reserviertUc, sperre, kostenstellen:{id:{budgetCent, verbrauchtUc}}, journal:[] }
const verfuegbar = (k) => k.saldoUc - k.reserviertUc;
const eigen = (k, mandant) => { if (k.mandant !== mandant) throw new PrepaidFehler("E_FREMD", "Kein Zugriff"); };

// Vor der Anfrage: Obergrenze reservieren – nie Leistung ohne gedecktes Guthaben
export function reservieren(k, mandant, { id, kostenstelle, schaetzungUc, zeit = 0 }) {
  eigen(k, mandant);
  if (k.sperre) throw new PrepaidFehler("E_GESPERRT", "Konto gesperrt: " + k.sperre);
  if (k.reservierungen?.[id]) return k;
  const ks = k.kostenstellen[kostenstelle]; if (!ks) throw new PrepaidFehler("E_KOSTENSTELLE", "Unbekannte Kostenstelle");
  if (ks.budgetCent != null && ks.verbrauchtUc + schaetzungUc > ks.budgetCent * UC) throw new PrepaidFehler("E_BUDGET", "Budget der Kostenstelle erreicht");
  if (verfuegbar(k) < schaetzungUc) throw new PrepaidFehler("E_GUTHABEN", "Guthaben reicht nicht – bitte aufladen");
  return { ...k, reserviertUc: k.reserviertUc + schaetzungUc, reservierungen: { ...(k.reservierungen || {}), [id]: { kostenstelle, uc: schaetzungUc, zeit } } };
}

// Nach der Anfrage: Ist-Kosten abbuchen, Reservierung freigeben. Idempotent je Anfrage-ID.
export function abrechnen(k, mandant, id, p, zeit) {
  eigen(k, mandant);
  if (k.journal.some((b) => b.id === "v:" + id)) return k;
  // Verspätete Antwort nach Freigabe einer verwaisten Reservierung wird trotzdem abgerechnet (kein Umsatzverlust)
  const spaet = !k.reservierungen?.[id] && k.verfallen?.[id];
  const r = k.reservierungen?.[id] || (spaet && { ...k.verfallen[id], uc: 0 });
  if (!r) throw new PrepaidFehler("E_RESERVIERUNG", "Keine Reservierung für " + id);
  const betrag = spaet ? p.vkUc : Math.min(p.vkUc, r.uc); // mit schaetzung() ist Ist ≤ Reservierung
  const res = { ...k.reservierungen }; delete res[id];
  const verf = { ...(k.verfallen || {}) }; delete verf[id];
  const ks = { ...k.kostenstellen[r.kostenstelle], verbrauchtUc: k.kostenstellen[r.kostenstelle].verbrauchtUc + betrag };
  return { ...k, saldoUc: k.saldoUc - betrag, reserviertUc: k.reserviertUc - r.uc, reservierungen: res, verfallen: verf, kostenstellen: { ...k.kostenstellen, [r.kostenstelle]: ks },
    journal: [...k.journal, { id: "v:" + id, art: "verbrauch", uc: -betrag, ekUc: p.ekUc, kostenstelle: r.kostenstelle, modell: p.modell, version: p.version, zeit, ...(spaet ? { spaet: true } : {}) }] };
}

// Schwellen für Hinweise und Auto-Aufladung (Anteil am letzten Aufladebetrag)
export function stand(k, cfg) {
  const rest = zuCent(verfuegbar(k));
  const stufe = rest <= 0 ? "leer" : rest < cfg.warnungCent ? "niedrig" : "ok";
  const auto = k.auto && rest < k.auto.unterCent ? { betragCent: k.auto.betragCent } : null;
  return { restCent: rest, stufe, auto };
}

// Reservierung = exakte Obergrenze: Eingabe gezählt + max_tokens als Ausgabe. Ohne max_tokens keine Anfrage (Prüfprotokoll N1).
export function schaetzung(tabelle, modell, eingabeToken, maxAusgabeToken) {
  if (!Number.isInteger(maxAusgabeToken) || maxAusgabeToken <= 0) throw new PrepaidFehler("E_MAX_TOKEN", "max_tokens muss gesetzt sein");
  return preis(tabelle, modell, { input: eingabeToken, output: maxAusgabeToken }).vkUc;
}

// Auto-Aufladung fällig? Höchstens cfg.autoMaxProTag je Kalendertag (UTC), nur mit Zustimmung (k.auto gesetzt)
export function autoFaellig(k, cfg, jetzt) {
  const s = stand(k, cfg); if (!s.auto) return null;
  const tag = new Date(jetzt).toISOString().slice(0, 10);
  const heute = k.journal.filter((b) => b.art === "aufladung" && b.auto && new Date(b.zeit).toISOString().slice(0, 10) === tag).length;
  return heute >= (cfg.autoMaxProTag ?? 2) ? { gesperrt: "tageslimit", heute } : { betragCent: s.auto.betragCent };
}

// Betrieb (Worker, alle 5 min): Reservierungen älter als maxAlterMs freigeben – Anfrage abgestürzt oder Antwort verloren
export function verwaisteFreigeben(k, jetzt, maxAlterMs = 15 * 60e3) {
  const res = {}, verf = { ...(k.verfallen || {}) }, frei = []; let uc = 0;
  for (const [id, r] of Object.entries(k.reservierungen || {})) { if (jetzt - r.zeit > maxAlterMs) { frei.push(id); uc += r.uc; verf[id] = { kostenstelle: r.kostenstelle }; } else res[id] = r; }
  return { konto: { ...k, reserviertUc: k.reserviertUc - uc, reservierungen: res, verfallen: verf }, freigegeben: frei };
}

// Betrieb (Nachtlauf): Invarianten je Konto; jeder Befund → Karte an Pascal, keine automatische Korrektur
export function kontoPruefen(k) {
  const bef = [], sum = Object.values(k.reservierungen || {}).reduce((a, r) => a + r.uc, 0);
  if (sum !== k.reserviertUc) bef.push("RESERVIERT_SUMME");
  if (k.reserviertUc < 0) bef.push("RESERVIERT_NEGATIV");
  const ids = k.journal.map((b) => b.id); if (new Set(ids).size !== ids.length) bef.push("DOPPELTE_BUCHUNG");
  if (k.saldoUc < -100 * UC) bef.push("SALDO_UNTER_MINUS_1_EUR");
  return bef;
}

// ---------- Aufladung über Revolut Merchant API ----------
export function aufladungAnlegen(k, mandant, betragCent, cfg, { schluessel, kundeEmail, auto = false }) {
  eigen(k, mandant);
  if (!Number.isInteger(betragCent)) throw new PrepaidFehler("E_CENT", "Betrag in ganzen Cent");
  if (betragCent < cfg.minCent || betragCent > cfg.maxCent) throw new PrepaidFehler("E_BETRAG", `Aufladung zwischen ${cfg.minCent / 100} und ${cfg.maxCent / 100} €`);
  if (k.sperre === "rueckzahlung") throw new PrepaidFehler("E_GESPERRT", "Konto in Auflösung");
  // Body für POST https://merchant.revolut.com/api/orders (Header Revolut-Api-Version); Betrag in kleinster Einheit
  return { ref: "NX-" + mandant + "-" + schluessel, auto, order: { amount: betragCent, currency: "EUR", merchant_order_ext_ref: "NX-" + mandant + "-" + schluessel, description: "NeXify AI API Guthaben", customer: kundeEmail ? { email: kundeEmail } : undefined } };
}

// Signatur: Revolut-Signature "v1=<hex>[,v1=<hex>]", signiert wird "v1.<Revolut-Request-Timestamp>.<roher Körper>", Toleranz 5 min
export function webhookEcht(roh, kopf, geheimnis, jetzt, hmacHex) {
  const ts = Number(kopf["revolut-request-timestamp"]), sig = String(kopf["revolut-signature"] || "");
  if (!ts || !sig) return { ok: false, grund: "kopf" };
  if (Math.abs(jetzt - ts) > 5 * 60e3) return { ok: false, grund: "zeit" };
  const soll = "v1=" + hmacHex(geheimnis, "v1." + ts + "." + roh);
  return { ok: sig.split(",").some((s) => gleich(s.trim(), soll)), grund: "signatur" };
}

// Vergleich in konstanter Zeit (gegen Zeitmessungsangriffe); im Gateway zusätzlich crypto.timingSafeEqual
function gleich(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

// Verarbeitung: Ereignis enthält nur order_id – Worker holt die Order (GET /api/orders/{id}) und übergibt sie hier.
// Gutschrift nur bei state=completed, passender Referenz, Betrag und Währung; doppelte oder ungeordnete Ereignisse schaden nicht.
export function zahlungVerbuchen(k, erwartet, order, zeit) {
  if (k.journal.some((b) => b.id === "a:" + order.id)) return { konto: k, neu: false };
  if (order.merchant_order_ext_ref !== erwartet.ref) throw new PrepaidFehler("E_REF", "Referenz passt nicht");
  if (!k.mandant || !erwartet.ref.startsWith("NX-" + k.mandant + "-")) throw new PrepaidFehler("E_FREMD", "Zahlung gehört zu anderem Mandanten");
  if (order.state !== "completed") return { konto: k, neu: false, offen: order.state };
  if (order.amount !== erwartet.order.amount || order.currency !== "EUR") throw new PrepaidFehler("E_BETRAG_ABWEICHUNG", "Betrag oder Währung weicht ab – manuelle Prüfung");
  const b = { id: "a:" + order.id, art: "aufladung", uc: order.amount * UC, zeit, ref: erwartet.ref, auto: !!erwartet.auto };
  return { konto: { ...k, saldoUc: k.saldoUc + b.uc, sperre: k.sperre === "leer" ? null : k.sperre, journal: [...k.journal, b] }, neu: true, beleg: { art: "anzahlungsrechnung", nettoCent: order.amount, ref: erwartet.ref } };
}

// ---------- Nachweis, Rechnung, Rückzahlung ----------
// Monatlicher Verbrauchsnachweis je Kostenstelle; Rundung je Position auf Cent
export function monatsnachweis(k, von, bis) {
  const zeilen = {};
  for (const b of k.journal) if (b.art === "verbrauch" && b.zeit >= von && b.zeit < bis) { const z = (zeilen[b.kostenstelle] ||= { kostenstelle: b.kostenstelle, anfragen: 0, uc: 0 }); z.anfragen++; z.uc += -b.uc; }
  const pos = Object.values(zeilen).map((z) => ({ kostenstelle: z.kostenstelle, anfragen: z.anfragen, cent: zuCent(z.uc) }));
  return { positionen: pos, summeCent: pos.reduce((a, p) => a + p.cent, 0) };
}

// Kündigung: Restguthaben (ohne Reservierungen) auf Antrag zurück, Konto gesperrt; Verbrauch der letzten Anfragen zuerst abrechnen
export function rueckzahlung(k, mandant, zeit) {
  eigen(k, mandant);
  if (k.reserviertUc > 0) throw new PrepaidFehler("E_OFFEN", "Laufende Anfragen erst abschließen");
  const cent = Math.floor(k.saldoUc / UC);
  return { konto: { ...k, sperre: "rueckzahlung", saldoUc: k.saldoUc - cent * UC, journal: [...k.journal, { id: "r:" + zeit, art: "rueckzahlung", uc: -cent * UC, zeit }] }, auszahlungCent: cent };
}

// ---------- Prüffälle ----------
const TAB = { version: "2026-09-28", modus: "aufschlag", satz: 0.45, modelle: { "nexify-guenstig": { ekEinCent: 20, ekAusCent: 80 }, "nexify-stark": { ekEinCent: 300, ekAusCent: 1500, ekCacheCent: 30 } } };
const CFG = { minCent: 5000, maxCent: 500000, warnungCent: 1000 };
const KTO = (x = {}) => ({ mandant: "m1", saldoUc: 1000 * UC, reserviertUc: 0, sperre: null, kostenstellen: { lern: { budgetCent: 500, verbrauchtUc: 0 }, frei: { budgetCent: null, verbrauchtUc: 0 } }, journal: [], ...x });
const code = (f) => { try { f(); return "kein Fehler"; } catch (e) { return e.code; } };
const HM = (g, s) => "h(" + g + "|" + s + ")"; // Test-HMAC, echt: node:crypto
const T = Date.UTC(2026, 8, 28, 10);
export const FAELLE = [
  { id: "PP01", art: "Positiv", t: "1 Mio. Eingabe-Token stark, Aufschlag 45 % → 435 Cent", f: () => zuCent(preis(TAB, "nexify-stark", { input: 1e6 }).vkUc), soll: 435 },
  { id: "PP02", art: "Positiv", t: "Marge 45 %: 300 Cent EK → 545 Cent", f: () => zuCent(preis({ ...TAB, modus: "marge" }, "nexify-stark", { input: 1e6 }).vkUc), soll: 545 },
  { id: "PP03", art: "Grenzwert", t: "Kleinstanfrage wird nicht auf 1 Cent aufgerundet", f: () => preis(TAB, "nexify-guenstig", { input: 10, output: 5 }).vkUc, soll: 870 },
  { id: "PP04", art: "Negativ", t: "Nicht freigegebenes Modell abgewiesen", f: () => code(() => preis(TAB, "gpt-x", { input: 1 })), soll: "E_MODELL" },
  { id: "PP05", art: "Negativ", t: "Guthaben reicht nicht → keine Leistung", f: () => code(() => reservieren(KTO({ saldoUc: 10 * UC }), "m1", { id: "a1", kostenstelle: "frei", schaetzungUc: 11 * UC })), soll: "E_GUTHABEN" },
  { id: "PP06", art: "Negativ", t: "Budget der Kostenstelle greift vor dem Guthaben", f: () => code(() => reservieren(KTO(), "m1", { id: "a1", kostenstelle: "lern", schaetzungUc: 501 * UC })), soll: "E_BUDGET" },
  { id: "PP07", art: "Positiv", t: "Reservieren → abrechnen: Saldo sinkt um Ist, Reservierung frei", f: () => { let k = reservieren(KTO(), "m1", { id: "a1", kostenstelle: "frei", schaetzungUc: 50 * UC }); k = abrechnen(k, "m1", "a1", { vkUc: 12 * UC, ekUc: 8 * UC, modell: "nexify-stark", version: "v" }, T); return k.saldoUc / UC + "/" + k.reserviertUc; }, soll: "988/0" },
  { id: "PP08", art: "Negativ", t: "Doppelte Abrechnung derselben Anfrage bucht nicht zweimal", f: () => { let k = reservieren(KTO(), "m1", { id: "a1", kostenstelle: "frei", schaetzungUc: 50 * UC }); const p = { vkUc: 12 * UC, ekUc: 1, modell: "x", version: "v" }; k = abrechnen(k, "m1", "a1", p, T); return abrechnen(k, "m1", "a1", p, T).journal.length; }, soll: 1 },
  { id: "PP09", art: "Negativ", t: "Mandant B greift nicht auf Konto A zu", f: () => code(() => reservieren(KTO(), "m2", { id: "a1", kostenstelle: "frei", schaetzungUc: 1 })), soll: "E_FREMD" },
  { id: "PP10", art: "Grenzwert", t: "Aufladung 49,99 € abgewiesen, 50,00 € angelegt", f: () => code(() => aufladungAnlegen(KTO(), "m1", 4999, CFG, { schluessel: "s1" })) + "/" + aufladungAnlegen(KTO(), "m1", 5000, CFG, { schluessel: "s1" }).order.amount, soll: "E_BETRAG/5000" },
  { id: "PP11", art: "Positiv", t: "Echte Signatur innerhalb 5 min akzeptiert", f: () => webhookEcht("{}", { "revolut-request-timestamp": String(T), "revolut-signature": "v1=alt," + "v1=" + HM("wsk", "v1." + T + ".{}") }, "wsk", T + 60e3, HM).ok, soll: true },
  { id: "PP12", art: "Negativ", t: "Signatur 6 min alt → abgewiesen (Replay)", f: () => webhookEcht("{}", { "revolut-request-timestamp": String(T), "revolut-signature": "v1=" + HM("wsk", "v1." + T + ".{}") }, "wsk", T + 6 * 60e3, HM).grund, soll: "zeit" },
  { id: "PP13", art: "Positiv", t: "completed → Gutschrift + Anzahlungsrechnung; zweites Ereignis ohne Wirkung", f: () => { const e = aufladungAnlegen(KTO(), "m1", 10000, CFG, { schluessel: "s1" }); const o = { id: "o1", state: "completed", amount: 10000, currency: "EUR", merchant_order_ext_ref: e.ref }; const r1 = zahlungVerbuchen(KTO(), e, o, T); const r2 = zahlungVerbuchen(r1.konto, e, o, T + 1); return r1.konto.saldoUc / UC + "/" + r1.beleg.art + "/" + r2.neu; }, soll: "11000/anzahlungsrechnung/false" },
  { id: "PP14", art: "Negativ", t: "Betrag weicht ab → keine Gutschrift, manuelle Prüfung", f: () => { const e = aufladungAnlegen(KTO(), "m1", 10000, CFG, { schluessel: "s1" }); return code(() => zahlungVerbuchen(KTO(), e, { id: "o1", state: "completed", amount: 100, currency: "EUR", merchant_order_ext_ref: e.ref }, T)); }, soll: "E_BETRAG_ABWEICHUNG" },
  { id: "PP15", art: "Grenzwert", t: "Ungeordnet: authorised vor completed → noch keine Gutschrift", f: () => { const e = aufladungAnlegen(KTO(), "m1", 10000, CFG, { schluessel: "s1" }); return zahlungVerbuchen(KTO(), e, { id: "o1", state: "authorised", amount: 10000, currency: "EUR", merchant_order_ext_ref: e.ref }, T).offen; }, soll: "authorised" },
  { id: "PP16", art: "Positiv", t: "Nachweis je Kostenstelle, Rundung erst je Position", f: () => { let k = KTO(); for (let i = 0; i < 3; i++) { k = reservieren(k, "m1", { id: "a" + i, kostenstelle: "frei", schaetzungUc: UC }); k = abrechnen(k, "m1", "a" + i, { vkUc: 0.4 * UC, ekUc: 0, modell: "x", version: "v" }, T); } return JSON.stringify(monatsnachweis(k, T - 1, T + 1)); }, soll: '{"positionen":[{"kostenstelle":"frei","anfragen":3,"cent":1}],"summeCent":1}' },
  { id: "PP17", art: "Rollback", t: "Kündigung: Rest in ganzen Cent zurück, Konto gesperrt", f: () => { const r = rueckzahlung(KTO({ saldoUc: 1234.5 * UC }), "m1", T); return r.auszahlungCent + "/" + r.konto.sperre; }, soll: "1234/rueckzahlung" },
  { id: "PP19", art: "Negativ", t: "Nicht freigegebener Einkaufspreis (null) → Fehler statt NaN", f: () => code(() => preis({ ...TAB, modelle: { x: { ekEinCent: null, ekAusCent: null } } }, "x", { input: 1 })), soll: "E_PREIS_FEHLT" },
  { id: "PP18", art: "Positiv", t: "Unter Auto-Schwelle → Auto-Aufladung vorgeschlagen", f: () => stand(KTO({ saldoUc: 800 * UC, auto: { unterCent: 1000, betragCent: 10000 } }), CFG).auto.betragCent, soll: 10000 },
  { id: "PP20", art: "Negativ", t: "Ohne max_tokens keine Reservierung", f: () => code(() => schaetzung(TAB, "nexify-stark", 1000, 0)), soll: "E_MAX_TOKEN" },
  { id: "PP21", art: "Positiv", t: "Schätzung deckt Ist: NeXify trägt nichts", f: () => { const s = schaetzung(TAB, "nexify-stark", 2000, 1000), ist = preis(TAB, "nexify-stark", { input: 2000, output: 400 }); let k = reservieren(KTO(), "m1", { id: "a1", kostenstelle: "frei", schaetzungUc: s }); k = abrechnen(k, "m1", "a1", ist, T); return KTO().saldoUc - k.saldoUc === ist.vkUc && ist.vkUc <= s; }, soll: true },
  { id: "PP22", art: "Grenzwert", t: "Dritte Auto-Aufladung am selben Tag gesperrt", f: () => { const j = [1, 2].map((i) => ({ id: "a:o" + i, art: "aufladung", auto: true, uc: 1, zeit: T - i * 1000 })); return autoFaellig(KTO({ saldoUc: 800 * UC, auto: { unterCent: 1000, betragCent: 10000 }, journal: j }), CFG, T).gesperrt; }, soll: "tageslimit" },
  { id: "PP23", art: "Rollback", t: "Verwaiste Reservierung frei nach 15 min, späte Antwort wird trotzdem abgerechnet", f: () => { let k = reservieren(KTO(), "m1", { id: "a1", kostenstelle: "frei", schaetzungUc: 50 * UC, zeit: T }); const v = verwaisteFreigeben(k, T + 16 * 60e3); k = abrechnen(v.konto, "m1", "a1", { vkUc: 12 * UC, ekUc: 0, modell: "x", version: "v" }, T + 17 * 60e3); return v.freigegeben.length + "/" + k.reserviertUc + "/" + k.saldoUc / UC + "/" + kontoPruefen(k).length; }, soll: "1/0/988/0" },
  { id: "PP24", art: "Negativ", t: "Invariante erkennt Reservierungs-Differenz", f: () => kontoPruefen(KTO({ reserviertUc: 5 })).join(), soll: "RESERVIERT_SUMME" },
];
