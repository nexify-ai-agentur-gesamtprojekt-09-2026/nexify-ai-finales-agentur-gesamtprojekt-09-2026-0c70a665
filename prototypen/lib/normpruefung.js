// NeXifyAI Normprüfung zur Laufzeit · erkennt Überlappung, Abschneiden, zu kleine Ziele, Rasterabweichung, Kontrast, Zeilenlänge
// Läuft im Browser gegen eine gerenderte Fläche (Leitstand › Normprüfung, E2E in CI). Keine Abhängigkeiten.
// Bezug: WCAG 2.2 AA (= ISO/IEC 40500), EN 301 549, DIN EN ISO 9241-110/-112/-125, docs/01-konzept/Design-Norm.md.

export const RASTER = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144];
export const REGELN = {
  "N-01": { norm: "WCAG 1.4.10 / Design-Norm", text: "Keine Überlappung sichtbarer Inhalte" },
  "N-02": { norm: "WCAG 1.4.10, 1.4.12", text: "Kein abgeschnittener Text ohne Auslassungszeichen" },
  "N-03": { norm: "WCAG 2.5.8 (AA) · Design-Norm 44 px", text: "Bedienelemente ≥ 44 × 44 px, Listenlinks ≥ 24 px Höhe" },
  "N-04": { norm: "Design-Norm Raster (DIN EN ISO 9241-112: Konsistenz)", text: "Abstände nur 0·4·8·12·16·20·24·32·40·48·56·64·72·80·96·112·128·144 px" },
  "N-05": { norm: "WCAG 1.4.3 / 1.4.11", text: "Kontrast Text ≥ 4,5 : 1, groß ≥ 3 : 1" },
  "N-06": { norm: "DIN EN ISO 9241-125 / Design-Norm", text: "Fließtext höchstens 68 Zeichen je Zeile" },
  "N-07": { norm: "WCAG 1.4.10", text: "Keine waagrechte Bildlaufleiste der Seite" },
  "N-08": { norm: "WCAG 1.4.4 · Design-Norm Typografie", text: "Schrift ≥ 12 px" },
};
export const naechsterRasterwert = (v) => { const a = Math.abs(v); if (a > 144) return v; let b = 0; for (const r of RASTER) if (Math.abs(r - a) < Math.abs(b - a) || (Math.abs(r - a) === Math.abs(b - a) && r > b)) b = r; return Math.sign(v) * b; };

// ---------- reine Hilfen (testbar ohne Browser) ----------
export function schnitt(a, b) { const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return w > 1 && h > 1 ? { w, h } : null; }
export function begrenze(r, c) { return { left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) }; }
const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
export function kontrast(f, h) { const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); const a = L(f), b = L(h); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
export const hex = (c) => "#" + c.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, "0")).join("").toUpperCase();
export function farbe(s) { const m = String(s).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; }
export function abweichungen(css) { // "padding:10px 14px" → [{wert,soll}]
  const out = [];
  for (const [k, v] of Object.entries(css)) {
    if (!/^(padding|margin|gap|row-gap|column-gap)/.test(k) || /calc|clamp|min\(|max\(|var\(/.test(v)) continue;
    for (const m of String(v).matchAll(/(-?\d+(?:\.\d+)?)px/g)) { const x = parseFloat(m[1]); const s = naechsterRasterwert(x); if (s !== x) out.push({ eigenschaft: k, wert: x, soll: s }); }
  }
  return out;
}

// ---------- Laufzeitprüfung ----------
export function pruefeLayout(doc = document, opt = {}) {
  const win = doc.defaultView, B = [], max = opt.max ?? 200;
  const add = (regel, el, grund) => { if (B.length < max) B.push({ regel, norm: REGELN[regel].norm, ziel: beschreibe(el), grund }); };
  const beschreibe = (e) => e ? ((e.getAttribute && (e.getAttribute("aria-label") || e.getAttribute("data-screen-label"))) || (e.innerText || e.tagName || "").trim().replace(/\s+/g, " ").slice(0, 48)) : "Seite";
  const sichtbar = (e) => { const r = e.getBoundingClientRect(), s = win.getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity !== 0; };
  const clipRect = (e) => { let r = e.getBoundingClientRect(); r = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; for (let p = e.parentElement; p; p = p.parentElement) { const s = win.getComputedStyle(p); if (s.overflow !== "visible" || s.overflowX !== "visible" || s.overflowY !== "visible") r = begrenze(r, p.getBoundingClientRect()); } return r; };
  const alle = [...doc.body.querySelectorAll("*")].filter((e) => !e.closest("svg") && !e.closest("[data-norm-ignorieren],[aria-hidden=true]") && sichtbar(e));

  // N-01 Überlappung: nur Textträger und Bedienelemente, sichtbarer (beschnittener) Anteil, gleiche Stapelebene
  const blaetter = alle.filter((e) => e.matches("button,a,input,select,textarea,img,label,kbd") || ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !e.matches("option")));
  // Zeilenweise Boxen (getClientRects), damit umbrechender Inline-Text nicht als eine große Box zählt; je Box der sichtbare Anteil
  const boxen = (e) => { const c = clipRect(e); return [...e.getClientRects()].map((r) => begrenze({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }, c)).filter((r) => r.right - r.left > 0 && r.bottom - r.top > 0); };
  const R = blaetter.map((e) => ({ e, b: boxen(e), z: win.getComputedStyle(e).position }));
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const a = R[i], b = R[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    if (a.z === "fixed" || b.z === "fixed") continue;
    let s = null; for (const x of a.b) { for (const y of b.b) { s = schnitt(x, y); if (s) break; } if (s) break; }
    if (s && s.w >= 4 && s.h >= 4) add("N-01", a.e, "überdeckt »" + beschreibe(b.e) + "« (" + Math.round(s.w) + " × " + Math.round(s.h) + " px)");
  }
  // N-02 Abschneiden
  for (const e of alle) { const s = win.getComputedStyle(e); const zu = s.overflowX === "hidden" || s.overflowY === "hidden" || s.overflow === "hidden";
    if (zu && e.innerText && e.innerText.trim() && s.textOverflow !== "ellipsis" && !/-webkit-box/.test(s.display) && (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) && e.children.length < 3) add("N-02", e, "Inhalt " + e.scrollWidth + "×" + e.scrollHeight + " > Fläche " + e.clientWidth + "×" + e.clientHeight); }
  // N-03 Zielgröße
  for (const e of alle.filter((x) => x.matches("button,[role=button],[role=tab],select,input:not([type=hidden]),a"))) {
    const label = e.matches("input,select") && e.closest("label"); const r = (label || e).getBoundingClientRect();
    const imText = e.matches("a") && e.closest("p,li") && !e.closest("nav"); if (imText) continue;
    const liste = e.matches("a,[aria-current],[role=option]") || !!e.closest("[role=list],[role=listbox],nav ul");
    const minH = liste ? 24 : 44, minW = liste ? 24 : (e.innerText && e.innerText.trim() ? 24 : 44);
    if (r.height < minH - 0.5 || r.width < minW - 0.5) add("N-03", e, Math.round(r.width) + " × " + Math.round(r.height) + " px (Soll ≥ " + minW + " × " + minH + ")"); }
  // N-04 Raster
  const gesehen = new Set();
  for (const e of alle) { const s = win.getComputedStyle(e); const css = {}; for (const k of ["padding-top", "padding-right", "padding-bottom", "padding-left", "row-gap", "column-gap"]) css[k] = s.getPropertyValue(k); // Außenabstände nicht: berechnete auto-Werte (Zentrierung) sind keine Rasterwerte
    for (const x of abweichungen(css)) { if (!Number.isInteger(x.wert)) continue; const key = x.eigenschaft + x.wert; if (gesehen.has(key + beschreibe(e))) continue; gesehen.add(key + beschreibe(e)); add("N-04", e, x.eigenschaft + " " + x.wert + " px → " + x.soll + " px"); } }
  // N-05 Kontrast gegen erste deckende Hintergrundfarbe
  const hg = (e) => { for (let p = e; p; p = p.parentElement) { const c = farbe(win.getComputedStyle(p).backgroundColor); if (c && c[3] > 0.9) return c; if (/gradient|url\(/.test(win.getComputedStyle(p).backgroundImage)) return null; } return [255, 255, 255, 1]; };
  for (const e of blaetter) { if (!e.innerText || !e.innerText.trim() || e.matches("input,img")) continue; const s = win.getComputedStyle(e); const f = farbe(s.color), h = hg(e); if (!f || !h || f[3] < 0.99 || e.closest("[disabled],[aria-disabled=true]")) continue;
    const gross = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700); const k = kontrast(f, h); if (k < (gross ? 3 : 4.5)) add("N-05", e, k.toFixed(2).replace(".", ",") + " : 1 (Soll " + (gross ? "3" : "4,5") + " : 1) · Schrift " + hex(f) + " auf " + hex(h)); }
  // N-06 Zeilenlänge
  // gezählt, nicht geschätzt: Zeichen je tatsächlich gesetzter Zeile (Range-Rechtecke)
  for (const e of alle.filter((x) => x.matches("p") && (x.innerText || "").length > 80 && parseFloat(win.getComputedStyle(x).fontSize) >= 14)) {
    const rg = doc.createRange(); rg.selectNodeContents(e); const tops = new Set([...rg.getClientRects()].map((r) => Math.round(r.top)));
    const zeilen = Math.max(1, tops.size); if (zeilen < 2) continue; const proZeile = e.innerText.replace(/\s+/g, " ").length / zeilen;
    if (proZeile > 75) add("N-06", e, "≈ " + Math.round(proZeile) + " Zeichen je Zeile (Soll ≤ 68, Toleranz 75)"); }
  // N-07 waagrechtes Scrollen
  if (doc.documentElement.scrollWidth > win.innerWidth + 1) add("N-07", null, "Seite " + doc.documentElement.scrollWidth + " px breiter als Fenster " + win.innerWidth + " px");
  // N-08 Mindestschrift
  for (const e of blaetter) { const fs = parseFloat(win.getComputedStyle(e).fontSize); if (e.innerText && e.innerText.trim() && fs < 12) add("N-08", e, fs + " px"); }

  const zaehler = {}; for (const b of B) zaehler[b.regel] = (zaehler[b.regel] || 0) + 1;
  return { ok: B.length === 0, befunde: B, zaehler, breite: win.innerWidth, geprueft: alle.length };
}

// ---------- Prüffälle der reinen Hilfen ----------
export const FAELLE = [
  { id: "NP01", art: "Positiv", t: "10 px → 12 px (Gleichstand aufrunden)", f: () => naechsterRasterwert(10), soll: 12 },
  { id: "NP02", art: "Positiv", t: "14 px → 16 px", f: () => naechsterRasterwert(14), soll: 16 },
  { id: "NP03", art: "Grenzwert", t: "28 px → 32 px (Lücke 24/32)", f: () => naechsterRasterwert(28), soll: 32 },
  { id: "NP04", art: "Grenzwert", t: "über 144 px unverändert", f: () => naechsterRasterwert(200), soll: 200 },
  { id: "NP05", art: "Negativ", t: "Abweichung in padding erkannt", f: () => abweichungen({ padding: "10px 16px" }).length, soll: 1 },
  { id: "NP06", art: "Positiv", t: "clamp() wird nicht bewertet", f: () => abweichungen({ padding: "clamp(88px,10vw,144px)" }).length, soll: 0 },
  { id: "NP07", art: "Positiv", t: "Kontrast Weiß auf #242826 ≥ 4,5", f: () => kontrast([255, 255, 255], [36, 40, 38]) >= 4.5, soll: true },
  { id: "NP08", art: "Negativ", t: "Kontrast #6F7571 auf #242826 < 4,5", f: () => kontrast([111, 117, 113], [36, 40, 38]) < 4.5, soll: true },
  { id: "NP09", art: "Grenzwert", t: "Berührende Kanten sind keine Überlappung", f: () => schnitt({ left: 0, right: 10, top: 0, bottom: 10 }, { left: 10, right: 20, top: 0, bottom: 10 }), soll: null },
  { id: "NP10", art: "Positiv", t: "Beschnittener Anteil zählt, nicht die volle Box", f: () => begrenze({ left: 46, right: 291, top: 0, bottom: 18 }, { left: 46, right: 224, top: 0, bottom: 40 }).right, soll: 224 },
];
