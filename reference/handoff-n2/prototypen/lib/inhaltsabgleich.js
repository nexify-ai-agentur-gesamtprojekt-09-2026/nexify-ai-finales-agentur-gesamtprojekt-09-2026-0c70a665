// NeXify Inhaltsabgleich · prüft, ob alle Seiten und Dokumente dieselben Fakten nennen wie die Quelle der Wahrheit
// Reine Logik. Werkzeug tools/inhaltsabgleich.js löst Quellen auf (config, OpenAPI, Prüffall-Zählung) und liest Dateien.
// Regelarten: muster (Zahl/Wort im Text = Sollwert) · pflicht (Begriff muss vorkommen) · verweis (Link auf Zielseite) · verboten (veralteter Stand)

export class AbgleichFehler extends Error { constructor(code, msg) { super(msg); this.name = "AbgleichFehler"; this.code = code; } }
const WORTE = { einmal: 1, zweimal: 2, dreimal: 3, viermal: 4, fünfmal: 5 };

// "5.000" → 5000 · "1,52" → 1.52 · "zweimal" → 2 · "1.2.0" bleibt Text
export function normalisieren(roh) {
  const s = String(roh).trim().toLowerCase();
  if (s in WORTE) return WORTE[s];
  if (/^\d+\.\d+\.\d+$/.test(s)) return s;
  const z = s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(z) ? Number(z) : s;
}

function regex(re, datei, id) {
  try { return new RegExp(re, "g"); } catch (e) { throw new AbgleichFehler("E_REGEX", id + " · " + datei + ": " + e.message); }
}

// fakten: [{ id, wert, muster?: [{datei, re}], pflicht?: [{datei, text}] }] · dateien: { pfad: inhalt }
export function abgleichen(cfg, dateien) {
  const bef = [], fehlt = (datei) => !(datei in dateien);
  for (const f of cfg.fakten || []) {
    if (f.wert === undefined || f.wert === null) { bef.push({ art: "QUELLE", id: f.id, text: "Sollwert fehlt (Quelle nicht auflösbar)" }); continue; }
    for (const m of f.muster || []) {
      if (fehlt(m.datei)) { bef.push({ art: "DATEI", id: f.id, datei: m.datei, text: "Datei fehlt" }); continue; }
      const treffer = [...dateien[m.datei].matchAll(regex(m.re, m.datei, f.id))];
      if (!treffer.length) { bef.push({ art: "FEHLT", id: f.id, datei: m.datei, text: "Muster nicht gefunden – Text geändert oder Angabe entfernt" }); continue; }
      for (const t of treffer) {
        const ist = normalisieren(t[1] ?? t[0]);
        if (ist !== f.wert) bef.push({ art: "WIDERSPRUCH", id: f.id, datei: m.datei, text: `nennt ${JSON.stringify(ist)}, Quelle sagt ${JSON.stringify(f.wert)}`, stelle: t[0].slice(0, 80) });
      }
    }
    for (const p of f.pflicht || []) {
      if (fehlt(p.datei)) { bef.push({ art: "DATEI", id: f.id, datei: p.datei, text: "Datei fehlt" }); continue; }
      const text = p.text ?? String(f.wert);
      if (!dateien[p.datei].includes(text)) bef.push({ art: "FEHLT", id: f.id, datei: p.datei, text: `„${text}“ wird nicht genannt` });
    }
  }
  for (const v of cfg.verweise || []) {
    if (fehlt(v.datei)) { bef.push({ art: "DATEI", id: "verweis", datei: v.datei, text: "Datei fehlt" }); continue; }
    if (!dateien[v.datei].includes('href="' + v.ziel)) bef.push({ art: "VERWEIS", id: "verweis", datei: v.datei, text: "kein Link auf " + v.ziel });
  }
  for (const v of cfg.verboten || []) for (const d of v.dateien) {
    if (fehlt(d)) continue;
    const t = dateien[d].match(regex(v.re, d, v.id));
    if (t) bef.push({ art: "VERALTET", id: v.id, datei: d, text: v.grund + " (" + t.length + "×)" });
  }
  return bef;
}

export const zusammenfassen = (bef) => bef.reduce((a, b) => ((a[b.art] = (a[b.art] || 0) + 1), a), {});

// ---------- Prüffälle ----------
const C = (x = {}) => ({ fakten: [{ id: "min", wert: 50, muster: [{ datei: "a", re: "mindestens (\\d+) €" }] }], ...x });
const arten = (b) => b.map((x) => x.art).join(",");
export const FAELLE = [
  { id: "IA01", art: "Positiv", t: "Übereinstimmung → kein Befund", f: () => abgleichen(C(), { a: "mindestens 50 € je Vorgang" }).length, soll: 0 },
  { id: "IA02", art: "Negativ", t: "Seite nennt 40 statt 50 → Widerspruch", f: () => arten(abgleichen(C(), { a: "mindestens 40 €" })), soll: "WIDERSPRUCH" },
  { id: "IA03", art: "Negativ", t: "Angabe entfernt → Fehlt (stilles Veralten verhindert)", f: () => arten(abgleichen(C(), { a: "ohne Betrag" })), soll: "FEHLT" },
  { id: "IA04", art: "Grenzwert", t: "Tausenderpunkt: „5.000“ = 5000", f: () => normalisieren("5.000"), soll: 5000 },
  { id: "IA05", art: "Grenzwert", t: "Zahlwort: „zweimal“ = 2", f: () => normalisieren("zweimal"), soll: 2 },
  { id: "IA06", art: "Grenzwert", t: "Versionsnummer bleibt Text", f: () => normalisieren("1.2.0"), soll: "1.2.0" },
  { id: "IA07", art: "Negativ", t: "Zweite Stelle widerspricht → genau ein Befund", f: () => abgleichen(C(), { a: "mindestens 50 € … später: mindestens 25 €" }).length, soll: 1 },
  { id: "IA08", art: "Negativ", t: "Pflichtbegriff fehlt", f: () => arten(abgleichen({ fakten: [{ id: "n", wert: "NeXify AI API", pflicht: [{ datei: "w" }] }] }, { w: "Leistungen" })), soll: "FEHLT" },
  { id: "IA09", art: "Negativ", t: "Link auf Produktseite fehlt", f: () => arten(abgleichen({ verweise: [{ datei: "w", ziel: "NeXify API.dc.html" }] }, { w: '<a href="Kundenportal.dc.html">' })), soll: "VERWEIS" },
  { id: "IA10", art: "Negativ", t: "Veralteter Stand erkannt", f: () => arten(abgleichen({ verboten: [{ id: "v", re: "18/18", grund: "alter Zählstand", dateien: ["d"] }] }, { d: "Kern 18/18" })), soll: "VERALTET" },
  { id: "IA11", art: "Negativ", t: "Quelle nicht auflösbar → Befund statt stiller Erfolg", f: () => arten(abgleichen({ fakten: [{ id: "x", wert: null, muster: [] }] }, {})), soll: "QUELLE" },
  { id: "IA12", art: "Negativ", t: "Fehlerhaftes Muster → klarer Fehler", fehler: "E_REGEX", f: () => abgleichen({ fakten: [{ id: "x", wert: 1, muster: [{ datei: "a", re: "(" }] }] }, { a: "" }) },
];
