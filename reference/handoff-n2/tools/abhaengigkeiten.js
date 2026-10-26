// CI-Schranke: Abhängigkeiten der Kerne. Befund = Exit 1.
// Prüft: keine Zyklen · kein Import einer fehlenden Datei · Kerne (lib/) importieren nie Oberflächen, tools/ oder Netzwerk · Schichtregel.
// Aufruf: node tools/abhaengigkeiten.js [--mermaid]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SCHICHT = { "lib/regelwerk.js": 1, "lib/posteingang.js": 0, "lib/rag.js": 0, "lib/lernschleife.js": 0, "lib/langlauf.js": 0, "lib/rechenkern.js": 0, "lib/tagrouter.js": 0 };
const VERBOTEN_IN_LIB = [/from\s+["']node:/, /\bfetch\(/, /\bXMLHttpRequest\b/, /\blocalStorage\b/, /\bdocument\./, /\bprocess\.env\b/];
const dateien = readdirSync("lib").filter((f) => f.endsWith(".js")).map((f) => join("lib", f));
const kanten = [], befunde = [];
for (const f of dateien) {
  const s = readFileSync(f, "utf8");
  const code = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1"); // Kommentare zählen nicht
  for (const re of VERBOTEN_IN_LIB) if (re.test(code)) befunde.push(`${f}: reine Kerne ohne I/O – gefunden ${re}`);
  for (const m of s.matchAll(/from\s+["'](\.\/[^"']+)["']/g)) {
    const ziel = join("lib", m[1].slice(2));
    kanten.push([f, ziel]);
    try { readFileSync(ziel); } catch { befunde.push(`${f}: importiert fehlende Datei ${ziel}`); }
    if ((SCHICHT[ziel] ?? 0) > (SCHICHT[f] ?? 2)) befunde.push(`${f} (Schicht ${SCHICHT[f] ?? 2}) importiert höhere Schicht ${ziel}`);
  }
}
const nach = {}; for (const [a, b] of kanten) (nach[a] ||= []).push(b);
const im = new Set(), fertig = new Set();
const dfs = (v, pfad) => { im.add(v); for (const w of nach[v] || []) { if (im.has(w)) befunde.push("Zyklus: " + [...pfad, v, w].join(" → ")); else if (!fertig.has(w)) dfs(w, [...pfad, v]); } im.delete(v); fertig.add(v); };
dateien.forEach((d) => fertig.has(d) || dfs(d, []));
if (process.argv.includes("--mermaid")) { console.log("graph LR"); for (const [a, b] of kanten) console.log(`  ${a.replace(/\W/g, "_")}["${a}"] --> ${b.replace(/\W/g, "_")}["${b}"]`); }
for (const b of befunde) console.log(b);
console.log(`Kerne ${dateien.length} · Kanten ${kanten.length} · Befunde ${befunde.length}`);
process.exit(befunde.length ? 1 : 0);
