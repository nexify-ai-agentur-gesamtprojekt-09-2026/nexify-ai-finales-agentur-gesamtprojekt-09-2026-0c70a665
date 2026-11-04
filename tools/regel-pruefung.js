// CI-Schranke: Regelwerk gegen das Repository. Befund = Exit 1 = Pipeline rot.
// Aufruf: node tools/regel-pruefung.js
// Geprüfte Fehlalarme stehen in tools/regel-pruefung.ausnahmen.json: nur Pfad, Regel, Anzahl und Grund,
// nie ein Treffertext. Eine Ausnahme deckt genau die genannte Anzahl; ein zusätzlicher Treffer und eine
// nicht mehr benötigte Ausnahme sind selbst Befunde.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pruefeDateien, FAELLE as RW, GEHEIMNIS_MUSTER } from "../prototypen/lib/regelwerk.js";

const AUSLASSEN = /(^|\/)(node_modules|\.git|\.next|dist|build|coverage|uploads|versions|screenshots|docs_dev)(\/|$)|\.(png|jpe?g|webp|gif|pdf|woff2?|glb|obj)$/i;
const ARCHIV = /^NeXifyAI Cloud( v[3-9])?\.dc\.html$/; // Archiv laut AGENT.md, nicht bearbeiten
// Historische Referenzablage N2, keine Anwendung (docs/architecture/0011-source-and-customer-boundaries.md).
const REFERENZ = /^reference(\/|$)/;
function sammeln(dir = ".", out = {}) {
  for (const n of readdirSync(dir)) {
    const p = dir === "." ? n : join(dir, n);
    if (AUSLASSEN.test(p) || ARCHIV.test(p) || REFERENZ.test(p)) continue;
    if (statSync(p).isDirectory()) sammeln(p, out); else if (statSync(p).size < 2e6) out[p] = readFileSync(p, "utf8");
  }
  return out;
}

// Ein Treffer der allgemeinen Zuweisungsregel ist ein Code-Verweis, wenn der Wert nicht in Anführungszeichen
// steht und ein Ausdruck (Aufruf, Eigenschaft, Index) oder ein Variablenname ohne Ziffern ist. Schlüssel
// selbst bestehen aus Zufallszeichen mit Ziffern; Literale bleiben immer Befund.
const ZUWEISUNG = /\b(passwor[dt]|secret|api[_-]?key)\s*[:=]\s*(["']?)([^\s"'${}]{8,})/gi;
const codeVerweis = (zitat, wert) => !zitat && (/[.([]/.test(wert) || /^[A-Za-z_]+,?$/.test(wert));
function geheimnisLiterale(text) {
  let n = 0;
  for (const muster of GEHEIMNIS_MUSTER) {
    const global = new RegExp(muster.source, muster.flags.includes("g") ? muster.flags : muster.flags + "g");
    for (const m of text.matchAll(global)) {
      if (muster.source.startsWith("\\b(passwor[dt]|secret|api")) { const [, , zitat, wert] = text.slice(m.index).match(new RegExp(ZUWEISUNG.source, "i")); if (codeVerweis(zitat, wert)) continue; }
      n++;
    }
  }
  return n;
}
const TEMPLATE_LOCH = /\{\{\s*[^}]*[+\-!()?][^}]*\}\}/g;
const ZAEHLER = { "R-07": geheimnisLiterale, "R-16": (s) => [...s.matchAll(TEMPLATE_LOCH)].length };

const ausnahmen = JSON.parse(readFileSync("tools/regel-pruefung.ausnahmen.json", "utf8")).ausnahmen;
const dateien = sammeln();
const rot = RW.filter((c) => { try { const ist = c.f(); return c.fehler || ist !== c.soll; } catch (e) { return !c.fehler; } });
const r = pruefeDateien(dateien);
const offen = [];
const genutzt = new Set();
for (const b of r.befunde) {
  const zaehler = ZAEHLER[b.regel];
  if (!zaehler) { offen.push(b); continue; }
  const ist = zaehler(dateien[b.pfad]);
  if (ist === 0) continue; // nur Code-Verweise
  const a = ausnahmen.find((x) => x.regel === b.regel && x.pfad === b.pfad);
  if (a && a.grund && ist === a.anzahl) { genutzt.add(a); continue; }
  offen.push({ ...b, grund: b.grund + (a ? ` (${ist} Treffer, Ausnahme deckt ${a.anzahl})` : ` (${ist} Treffer ohne Ausnahme)`) });
}
for (const a of ausnahmen) if (!genutzt.has(a)) offen.push({ regel: a.regel, pfad: a.pfad, grund: "Ausnahme nicht mehr benötigt oder Anzahl veraltet" });
for (const b of offen) console.log(`${b.regel}  ${b.pfad}  ${b.grund}`);
console.log(`Regelwerk-Prüffälle ${RW.length - rot.length}/${RW.length} · Dateien ${r.dateien} · Befunde ${offen.length} · geprüfte Ausnahmen ${genutzt.size}`);
process.exit(rot.length || offen.length ? 1 : 0);
