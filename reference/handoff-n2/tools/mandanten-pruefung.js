// CI-Schranke: Mandantentrennung in db/migrations. Befund = Exit 1.
// Jede Tabelle ist in config/mandanten.json als »global« oder »mandantenbezogen« geführt; mandantenbezogene haben
// mandant_id NOT NULL, RLS aktiv UND erzwungen, eine Richtlinie mit USING und WITH CHECK. Keine fortlaufenden IDs.
// Aufruf: node tools/mandanten-pruefung.js
import { readFileSync, readdirSync } from "node:fs";

// Erlaubende Richtlinien wirken ODER-verknüpft: jede noch bestehende muss dicht sein. Reihenfolge: create/drop in Dateifolge.
const wirksameRichtlinien = (sql, tabelle) => {
  const wirksam = new Map();
  const re = new RegExp(`(create|drop) policy (?:if exists )?(\\w+) on "?${tabelle}"?([^;]*);`, "gi");
  for (const [, art, name, text] of sql.matchAll(re)) {
    if (art.toLowerCase() === "drop") wirksam.delete(name);
    else wirksam.set(name, text);
  }
  return wirksam;
};

export function pruefeMigrationen(sqlJeDatei, cfg) {
  const alle = Object.keys(sqlJeDatei).sort().map((k) => sqlJeDatei[k]).join("\n");
  const befunde = [];
  const tabellen = [...alle.matchAll(/create table (?:if not exists )?"?(\w+)"?\s*\(([\s\S]*?)\n\);/gi)].map((m) => ({ name: m[1], body: m[2] }));
  const hat = (re) => re.test(alle);
  for (const t of tabellen) {
    const g = cfg.global.includes(t.name), mb = cfg.mandantenbezogen.includes(t.name);
    if (!g && !mb) { befunde.push(t.name + ": weder global noch mandantenbezogen eingetragen"); continue; }
    if (/\b(big)?serial\b/i.test(t.body)) befunde.push(t.name + ": fortlaufende ID – UUID verwenden");
    if (g) continue;
    const spalte = /\bmandant_id\b[^,\n]*not null/i.test(t.body) || (hat(new RegExp(`alter table "?${t.name}"? add column if not exists mandant_id`, "i")) && hat(new RegExp(`alter table "?${t.name}"? alter column mandant_id set not null`, "i")));
    if (!spalte) befunde.push(t.name + ": mandant_id fehlt oder ist nicht NOT NULL");
    if (!hat(new RegExp(`alter table "?${t.name}"? enable row level security`, "i"))) befunde.push(t.name + ": RLS nicht aktiv");
    if (!hat(new RegExp(`alter table "?${t.name}"? force row level security`, "i"))) befunde.push(t.name + ": RLS nicht erzwungen (FORCE)");
    const wirksam = wirksameRichtlinien(alle, t.name);
    if (!wirksam.size) befunde.push(t.name + ": keine Richtlinie");
    for (const [name, text] of wirksam) if (!/using\s*\(/i.test(text) || !/with check\s*\(/i.test(text)) befunde.push(t.name + ": Richtlinie " + name + " ohne USING und WITH CHECK");
  }
  for (const n of [...cfg.global, ...cfg.mandantenbezogen]) if (!tabellen.some((t) => t.name === n)) befunde.push(n + ": in config/mandanten.json, aber keine Migration legt sie an");
  return { ok: befunde.length === 0, befunde, tabellen: tabellen.length };
}

if (typeof process !== "undefined" && process.argv[1] && process.argv[1].endsWith("mandanten-pruefung.js")) {
  const sql = Object.fromEntries(readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).map((f) => [f, readFileSync("db/migrations/" + f, "utf8")]));
  const r = pruefeMigrationen(sql, JSON.parse(readFileSync("config/mandanten.json", "utf8")));
  for (const b of r.befunde) console.log(b);
  console.log(`Tabellen ${r.tabellen} · Befunde ${r.befunde.length}`);
  process.exit(r.ok ? 0 : 1);
}
