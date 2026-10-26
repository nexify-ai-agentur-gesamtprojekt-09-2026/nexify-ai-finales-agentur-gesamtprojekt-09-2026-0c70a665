#!/usr/bin/env node
// Inhaltsabgleich (CI) · Quellen auflösen, Dateien lesen, lib/inhaltsabgleich.js anwenden · Exit 1 bei Befund
import { readFile, readdir } from "node:fs/promises";
import { abgleichen, zusammenfassen } from "../lib/inhaltsabgleich.js";

const cfg = JSON.parse(await readFile("config/fakten.json", "utf8"));
const pfad = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

async function zaehle(datei) { const m = await import("../" + datei); return (m.FAELLE || []).length + (m.FAELLE_ASYNC || []).length; }
async function summe() {
  let n = 0;
  for (const f of (await readdir("lib")).filter((x) => x.endsWith(".js"))) n += await zaehle("lib/" + f);
  const pe = await readFile("tests/posteingang.test.js", "utf8"); n += (pe.match(/\{\s*id:\s*"/g) || []).length;
  return n;
}
async function wert(f) {
  if (!f.quelle) return f.wert;
  const [datei, weg] = f.quelle.split("#");
  let v;
  if (datei === "summe") v = await summe();
  else if (weg === "FAELLE") v = await zaehle(datei);
  else if (datei.endsWith(".json")) v = pfad(JSON.parse(await readFile(datei, "utf8")), weg);
  else if (datei.endsWith(".yaml")) v = ((await readFile(datei, "utf8")).match(new RegExp("^\\s+" + weg + ":\\s*([^\\s#]+)", "m")) || [])[1];
  if (typeof v === "number" && f.teiler) v = v / f.teiler;
  if (typeof v === "number" && f.faktor) v = Math.round(v * f.faktor);
  return v ?? null;
}

for (const f of cfg.fakten) f.wert = await wert(f);
const benoetigt = new Set([...cfg.fakten.flatMap((f) => [...(f.muster || []), ...(f.pflicht || [])].map((x) => x.datei)), ...cfg.verweise.map((v) => v.datei), ...cfg.verboten.flatMap((v) => v.dateien)]);
const dateien = {};
for (const d of benoetigt) { try { dateien[d] = await readFile(d, "utf8"); } catch { /* fehlt → Befund DATEI */ } }
const bef = abgleichen({ ...cfg, verweise: cfg.verweise.filter((v) => !v.hinweis) }, dateien);
for (const b of bef) console.log(`${b.art.padEnd(11)} ${b.id.padEnd(24)} ${b.datei || ""}  ${b.text}`);
console.log(bef.length ? `\n${bef.length} Befund(e): ${JSON.stringify(zusammenfassen(bef))}` : `Inhaltsabgleich: ${cfg.fakten.length} Fakten, ${benoetigt.size} Dateien – 0 Befunde`);
for (const o of cfg.offen || []) console.log(`OFFEN       ${o.id}: ${o.text}`);
process.exit(bef.length ? 1 : 0);
