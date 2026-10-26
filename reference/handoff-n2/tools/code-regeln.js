// CI-Schranke: Code-Regeln (Clean Architecture/DDD-Skill) für lib/, mit Sperrklinke gegen neue Verstöße
// Regeln: Datei ≤ 200 Codezeilen (ohne Prüffälle) · Funktion ≤ 50 Zeilen · Verschachtelung ≤ 3 · keine Sammelnamen (utils, helpers, common, shared, misc)
// · Zeilen > 200 Zeichen nur bis zur Grundlinie (Altbestand wird abgebaut, nie mehr). Aufruf: node tools/code-regeln.js [--grundlinie]
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const GL = "tools/code-regeln.grundlinie.json";
const messen = (datei) => {
  const z = readFileSync(datei, "utf8").split("\n");
  const ab = z.findIndex((l) => /^export const FAELLE|^\/\/ -+ Prüffälle/.test(l));
  const code = ab > 0 ? z.slice(0, ab) : z;
  const lang = [];
  code.forEach((l, i) => {
    const m = l.match(/^export (?:async )?function (\w+)|^(?:export )?const (\w+) = (?:async )?\(/); if (!m) return;
    let d = 0, j = i; do { d += (code[j].match(/\{/g) || []).length - (code[j].match(/\}/g) || []).length; j++; } while (j < code.length && d > 0);
    if (j - i > 50) lang.push((m[1] || m[2]) + ":" + (j - i));
  });
  const tief = Math.max(0, ...code.filter((l) => /\b(if|for|while)\b/.test(l)).map((l) => l.match(/^ */)[0].length / 2));
  return { codezeilen: code.length, langeFunktionen: lang, tief, breiteZeilen: code.filter((l) => l.length > 200).length };
};
const dateien = readdirSync("lib").filter((f) => f.endsWith(".js"));
const ist = Object.fromEntries(dateien.map((f) => [f, messen("lib/" + f)]));
if (process.argv.includes("--grundlinie")) { writeFileSync(GL, JSON.stringify(ist, null, 1)); console.log("Grundlinie geschrieben"); process.exit(0); }
const gl = existsSync(GL) ? JSON.parse(readFileSync(GL, "utf8")) : {};
const befunde = [];
for (const [f, m] of Object.entries(ist)) {
  const alt = gl[f] || { breiteZeilen: 0, langeFunktionen: [] };
  if (/^(utils|helpers|common|shared|misc)/i.test(f)) befunde.push(`${f}: Sammelname – fachlich benennen`);
  if (m.codezeilen > 200) befunde.push(`${f}: ${m.codezeilen} Codezeilen > 200 – aufteilen`);
  if (m.tief > 3) befunde.push(`${f}: Verschachtelung ${m.tief} > 3 – früh zurückkehren`);
  const bekannt = new Set(alt.langeFunktionen.map((x) => x.split(":")[0]));
  for (const l of m.langeFunktionen) {
    if (bekannt.has(l.split(":")[0])) continue;
    befunde.push(`${f}: Funktion ${l} Zeilen > 50`);
  }
  if (m.breiteZeilen > alt.breiteZeilen) befunde.push(`${f}: ${m.breiteZeilen} Zeilen > 200 Zeichen (Grundlinie ${alt.breiteZeilen}) – umbrechen`);
}
for (const b of befunde) console.log(b);
console.log(`Kerne ${dateien.length} · Befunde ${befunde.length}`);
process.exit(befunde.length ? 1 : 0);
