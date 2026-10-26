#!/usr/bin/env node
// Verweisprüfung (CI) · jede Seite, jeder Link, jeder Anker muss ein Ziel haben
// Seiten: alle *.dc.html, die MANIFEST.md nicht als ersetzt führt. Anker auf Seiten mit Einsprung (const ANSICHT / const RECHT) werden gegen diese Listen geprüft.
import { readFile, readdir } from "node:fs/promises";

const ERSETZT = /^NeXifyAI Cloud( v[3-9])?\.dc\.html$|^myADMIN\.dc\.html$|^Canvas\.dc\.html$|^Workspace Wireframes\.dc\.html$/;
const alle = new Set(await readdir("."));
const seiten = [...alle].filter((f) => f.endsWith(".dc.html") && !ERSETZT.test(f)).sort();
const text = Object.fromEntries(await Promise.all(seiten.map(async (f) => [f, await readFile(f, "utf8")])));

// Einsprungziele je Seite: Schlüssel aus const ANSICHT = {…} und const RECHT = […]; sonst id-Attribute
const ziele = {};
for (const [f, t] of Object.entries(text)) {
  const a = (t.match(/const ANSICHT = \{([^}]*)\}/) || [])[1], r = (t.match(/const RECHT = \[([^\]]*)\]/) || [])[1];
  const s = new Set([...t.matchAll(/\bid="([\w-]+)"/g)].map((m) => m[1]));
  if (a) for (const m of a.matchAll(/(\w+):/g)) s.add(m[1]);
  if (r) for (const m of r.matchAll(/"([\w-]+)"/g)) s.add(m[1]);
  ziele[f] = { s, einsprung: !!(a || r) };
}
const konst = (t, n) => (t.match(new RegExp("const " + n + ' = "([^"]+)"')) || [])[1];
const bef = [];
for (const [f, t] of Object.entries(text)) {
  const refs = [];
  for (const m of t.matchAll(/href="([^"{]+)"/g)) refs.push(m[1]);
  for (const m of t.matchAll(/["']([^"'\s{}]+\.dc\.html(?:[?#][^"'\s]*)?)["']/g)) refs.push(m[1]);
  for (const k of ["CLOUD", "SHOP"]) { const z = konst(t, k); if (z) for (const m of t.matchAll(new RegExp(k + '\\s*\\+\\s*"(#[\\w-]+)"', "g"))) refs.push(z + m[1]); }
  for (const h of new Set(refs)) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(h)) continue;
    const [pfadQ, anker] = h.split("#"); const pfad = decodeURIComponent(pfadQ.split("?")[0]);
    if (!pfad || pfad.includes("/")) continue;
    if (!alle.has(pfad)) { bef.push(`FEHLT     ${f} → ${pfad}`); continue; }
    if (ERSETZT.test(pfad)) bef.push(`ERSETZT   ${f} → ${pfad} (aktuelle Fassung verlinken)`);
    if (anker && ziele[pfad] && !ziele[pfad].s.has(anker)) bef.push(`ANKER     ${f} → ${pfad}#${anker}${ziele[pfad].einsprung ? "" : " (Zielseite hat keinen Einsprung)"}`);
  }
}
for (const b of bef) console.log(b);
console.log(bef.length ? `\n${bef.length} Befund(e)` : `Verweise: ${seiten.length} Seiten – 0 Befunde`);
process.exit(bef.length ? 1 : 0);
