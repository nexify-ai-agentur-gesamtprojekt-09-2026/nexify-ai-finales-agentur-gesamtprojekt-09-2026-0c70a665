#!/usr/bin/env node
// CI-Schranke für die echte Seite (apps/web, von apps/site mitgenutzt): Schriftgrößen und Abstände
// in Stylesheets müssen auf den Skalen aus docs/01-konzept/Design-Norm.md liegen.
// Gleiche Raster wie prototypen/lib/regelwerk.js (R-17), hier für .css statt Inline-Stile.
//   node tools/css-norm.mjs          prüfen, Befund = Exit 1
//   node tools/css-norm.mjs --fix    Werte auf den nächsten Normwert setzen (bei Gleichstand der größere)
// Radien werden gemeldet, aber nicht erzwungen: die Token-Radien sind eine offene Gestaltungsentscheidung.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
// Maßgebliches Designsystem (D-DESIGN-20261105, docs/design/design-system-authoritative-20261105.md):
// Raster um 6/10/14 erweitert, Typoskala um 13/15/19 (gemessene Werte der Startseite). 12-px-Boden bleibt:
// 11/12.5-px-Kicker werden weiter gemeldet (offener Barrierefreiheits-Konflikt, Entscheid Pascal).
const RASTER = [0, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144]; // Design-Norm § Raster
const SCHRIFT = [12, 13, 14, 15, 16, 18, 19, 20, 24, 28, 32, 40, 48, 56, 64, 72, 80, 96]; // Design-Norm § Typografie, Mindestgröße 12 px
const RADIUS = [0, 1, 2, 8, 10, 14, 16, 20, 28, 36, 999, 9999]; // Design-Norm § Radien (weiche Skala)
const ZEILE = 68;
const BEREICHE = ["apps/web/app", "apps/web/components"];
const AUSLASSEN = /(node_modules|\.next)(\/|$)|(^|\/)(masterplan-tokens|tokens)\.css$/;

export const naechster = (v, skala) => skala.reduce((b, x) => (Math.abs(x - v) < Math.abs(b - v) || (Math.abs(x - v) === Math.abs(b - v) && x > b) ? x : b), skala[0]);

function art(prop) {
  if (prop === "font-size") return "schrift";
  if (/^(padding|margin|gap|row-gap|column-gap)(-|$)/.test(prop)) return "abstand";
  if (prop === "border-radius" || /^border-[a-z-]+-radius$/.test(prop)) return "radius";
  return null;
}

// Prüft und korrigiert eine Deklaration. Ausdrücke mit calc/clamp/min/max bleiben unberührt,
// Werte innerhalb var(...) als Rückfallwert ebenfalls.
function wert(prop, v, befunde, ort) {
  // DIN EN ISO 9241-125: Fließtext höchstens 68 Zeichen breit (Design-Norm § Automatische Prüfung).
  if (prop === "max-width" && /^\s*\d+ch\s*$/.test(v) && parseInt(v, 10) > ZEILE) {
    befunde.push({ ...ort, art: "zeilenlaenge", ist: parseInt(v, 10), soll: ZEILE, erzwungen: true, einheit: "ch" });
    return v.replace(/\d+ch/, ZEILE + "ch");
  }
  const a = art(prop);
  if (!a || /calc|clamp|min\(|max\(/.test(v)) return v;
  const skala = a === "schrift" ? SCHRIFT : a === "abstand" ? RASTER : RADIUS;
  let geschuetzt = 0;
  const masken = [];
  const ohneVar = v.replace(/var\([^)]*\)/g, (m) => { masken.push(m); return `\u0000${geschuetzt++}\u0000`; });
  const neu = ohneVar.replace(/(-?)(\d*\.?\d+)px/g, (m, minus, n) => {
    const x = +n;
    if (skala.includes(x) || (a === "abstand" && x > 144)) return m;
    const ziel = naechster(x, skala);
    befunde.push({ ...ort, art: a, ist: x, soll: ziel, erzwungen: a !== "radius" });
    return a === "radius" ? m : `${minus}${ziel}px`;
  });
  return neu.replace(/\u0000(\d+)\u0000/g, (m, i) => masken[+i]);
}

export function pruefeCss(text, datei = "") {
  const befunde = [];
  const kommentare = [];
  const ohne = text.replace(/\/\*[\s\S]*?\*\//g, (m) => { kommentare.push(m); return `\u0001${kommentare.length - 1}\u0001`; });
  // Je Regelblock prüfen: ein Block mit mask-composite ist ein Verlaufsrahmen (Design-Norm § Radien),
  // dort legt padding die Rahmenbreite fest und darf 1 oder 2 px betragen.
  const neu = ohne.replace(/\{([^{}]*)\}/g, (block, inhalt, start) => {
    const rahmen = /mask-composite/.test(inhalt);
    return "{" + inhalt.replace(/(^|[;\s])([a-z-]+)(\s*:\s*)([^;{}]+)/g, (m, vor, prop, dp, v, pos) => {
      if (prop.startsWith("--")) return m;
      if (rahmen && /^padding/.test(prop) && /^\s*[12]px\s*$/.test(v)) return m;
      const zeile = ohne.slice(0, start + pos).split("\n").length;
      return vor + prop + dp + wert(prop, v, befunde, { datei, zeile, prop });
    }) + "}";
  });
  return { befunde, text: neu.replace(/\u0001(\d+)\u0001/g, (m, i) => kommentare[+i]) };
}

function dateien(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (AUSLASSEN.test(relative(ROOT, p))) continue;
    if (statSync(p).isDirectory()) dateien(p, out); else if (p.endsWith(".css")) out.push(p);
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const fix = process.argv.includes("--fix");
  let erzwungen = 0, hinweise = 0, geaendert = 0;
  for (const p of BEREICHE.flatMap((b) => dateien(join(ROOT, b)))) {
    const rel = relative(ROOT, p);
    const alt = readFileSync(p, "utf8");
    const { befunde, text } = pruefeCss(alt, rel);
    for (const b of befunde) {
      if (b.erzwungen) erzwungen++; else hinweise++;
      if (b.erzwungen && !fix) console.log(`N-CSS  ${b.datei}:${b.zeile}  ${b.prop} ${b.ist}${b.einheit || "px"} → ${b.soll}${b.einheit || "px"} (${b.art})`);
    }
    if (fix && text !== alt) { writeFileSync(p, text); geaendert++; }
  }
  if (fix) console.log(`Korrigiert: ${erzwungen} Werte in ${geaendert} Dateien`);
  console.log(`CSS-Norm · Befunde ${fix ? 0 : erzwungen} · Radius-Hinweise ${hinweise} (offene Gestaltungsentscheidung)`);
  process.exit(!fix && erzwungen ? 1 : 0);
}
