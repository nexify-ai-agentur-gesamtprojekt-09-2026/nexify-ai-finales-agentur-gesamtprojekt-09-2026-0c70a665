// CI-Schranke: Regelwerk gegen das Repository. Befund = Exit 1 = Pipeline rot.
// Aufruf: node tools/regel-pruefung.js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pruefeDateien, FAELLE as RW } from "../lib/regelwerk.js";

const AUSLASSEN = /^(node_modules|\.git|uploads|versions|screenshots|docs_dev)(\/|$)|\.(png|jpe?g|webp|gif|pdf|woff2?|glb|obj)$/i;
const ARCHIV = /^NeXifyAI Cloud( v[3-9])?\.dc\.html$/; // Archiv laut AGENT.md, nicht bearbeiten
function sammeln(dir = ".", out = {}) {
  for (const n of readdirSync(dir)) {
    const p = dir === "." ? n : join(dir, n);
    if (AUSLASSEN.test(p) || ARCHIV.test(p)) continue;
    if (statSync(p).isDirectory()) sammeln(p, out); else if (statSync(p).size < 2e6) out[p] = readFileSync(p, "utf8");
  }
  return out;
}
const rot = RW.filter((c) => { try { const ist = c.f(); return c.fehler || ist !== c.soll; } catch (e) { return !c.fehler; } });
const r = pruefeDateien(sammeln());
for (const b of r.befunde) console.log(`${b.regel}  ${b.pfad}  ${b.grund}`);
console.log(`Regelwerk-Prüffälle ${RW.length - rot.length}/${RW.length} · Dateien ${r.dateien} · Befunde ${r.befunde.length}`);
process.exit(rot.length || r.befunde.length ? 1 : 0);
