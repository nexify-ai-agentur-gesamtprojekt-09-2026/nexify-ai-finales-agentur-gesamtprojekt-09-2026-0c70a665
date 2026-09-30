// Abstandsraster systemweit (Designsystem.md § Raster): Seitenrand 24 px = calc(100% - 48px); Leisten padding ≥ 16 px, min-height ≥ 56 px, wenn 44-px-Knöpfe drin; Gruppenabstand 8 px.
// Aufruf: node tools/abstaende.js  → Exit 1 bei Verstoß
import { readdirSync, readFileSync } from "node:fs";
const dateien = readdirSync(".").filter((f) => f.endsWith(".dc.html"));
const befunde = [];
for (const f of dateien) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/width:min\(\d+px,\s*calc\(100% - (\d+)px\)\)/g)) if (m[1] !== "48") befunde.push(`${f}: Seitenrand ${m[1] / 2} px statt 24 px`);
  for (const m of t.matchAll(/<(header|nav|footer)\b[^>]*style="([^"]*)"/g)) {
    const css = m[2]; const pad = css.match(/padding:0 (\d+)px/); const h = css.match(/(?:min-)?height:(\d+)px/);
    if (pad && +pad[1] < 16 && /display:(inline-)?flex/.test(css)) befunde.push(`${f}: <${m[1]}> Innenabstand ${pad[1]} px < 16 px`);
    if (h && +h[1] < 56 && /display:(inline-)?flex/.test(css) && /border-bottom|border-top/.test(css)) befunde.push(`${f}: <${m[1]}> Leistenhöhe ${h[1]} px < 56 px`);
  }
  for (const m of t.matchAll(/<(nav|div)\b[^>]*role="(group|tablist)"[^>]*style="([^"]*gap:(\d)px[^"]*)"/g)) if (+m[4] < 8) befunde.push(`${f}: Gruppe gap ${m[4]} px < 8 px`);
}
befunde.forEach((b) => console.log("BEFUND", b));
console.log(befunde.length ? befunde.length + " Abstandsverstöße" : "Abstandsraster eingehalten");
if (befunde.length) process.exit(1);
