// NeXify Designsystem 2.0 – Kommandozeilen-Prüfung (Node ≥ 18). Aufruf im Projektstamm:  node tools/ds-audit-cli.js
// Liest alle *.dc.html, wendet config/design-rules.json an und meldet Abweichungen. Exit-Code 1 bei Fehlern (CI-tauglich).
const fs = require('fs'), path = require('path');
const { auditDateien, paritaet } = require('./ds-audit.js');
const root = process.cwd();
const rules = JSON.parse(fs.readFileSync(path.join(root, 'config/design-rules.json'), 'utf8'));
const R = { farbe: { bildschirm: rules.farbe.bildschirm, abgeleitet: rules.farbe.abgeleitet, veraltet: Object.keys(rules.farbe.veraltet_migrieren).concat(['#191C1F']), papier: rules.farbe.papier }, radius: { erlaubt: rules.radius.erlaubt_px.map(x => x + 'px') } };
const PRINT = /^(Geschaeftsdokumente-Vorlagen|Investoren-PowerPoint|Kundenbroschuere|Partner-Broschuere|Partner-PowerPoint Werkstatt|Visitenkarte-Pascal-Courbois)\.dc\.html$/;
const LEGACY = /^(NeXifyAI Cloud v1[01]|NX 2026 Website)\.dc\.html$/;
// Seiten liegen im Produktstamm ODER (im Handoff-Paket) unter prototypen/.
let seitenDir = root;
let files = fs.readdirSync(root).filter(f => f.endsWith('.dc.html'));
if (files.length === 0 && fs.existsSync(path.join(root, 'prototypen'))) {
  seitenDir = path.join(root, 'prototypen');
  files = fs.readdirSync(seitenDir).filter(f => f.endsWith('.dc.html'));
}
const d = files.map(n => ({ name: n, text: fs.readFileSync(path.join(seitenDir, n), 'utf8'), art: LEGACY.test(n) ? 'legacy' : PRINT.test(n) ? 'papier' : 'bildschirm' }));
const res = auditDateien(d, { rules: R });
for (const n of ['NX-Header.dc.html', 'NX-Footer.dc.html']) { const p = paritaet(d.find(x => x.name === n).text); if (p) for (const [l, arr] of Object.entries(p)) if (arr.length) (res[n]['DS-I-04'] = res[n]['DS-I-04'] || { n: 0, werte: {}, zeilen: [] }).n += arr.length; }
const stufe = Object.fromEntries(rules.regeln.map(r => [r.id, r.stufe]));
// Dokumentierte Ausnahmen (design-rules.json → ausnahmen) je Datei einsammeln,
// damit die CI-Schwelle "0 Fehler außerhalb dokumentierter Ausnahmen" stimmt.
const exByName = {};
for (const a of (rules.ausnahmen || [])) {
  let names;
  if (a.datei === 'Papier-Dateien') names = files.filter((f) => PRINT.test(f));
  else names = files.filter((f) => a.datei.split(',').some((t) => f.includes(t.trim())));
  for (const n of names) { (exByName[n] = exByName[n] || new Set()); for (const r of a.regeln) exByName[n].add(r); }
}
let fehler = 0, warn = 0;
for (const [n, f] of Object.entries(res)) for (const [id, x] of Object.entries(f)) {
  if (stufe[id] === 'Info') continue;
  if (exByName[n] && exByName[n].has(id)) continue; // dokumentierte Ausnahme
  if (stufe[id] === 'Fehler') fehler += x.n; else warn += x.n;
  console.log(`${stufe[id]}\t${id}\t${n}\t${x.n}×\t${Object.keys(x.werte).slice(0, 3).join(', ')}`);
}
console.log(`\nErgebnis: ${fehler} Fehler, ${warn} Warnungen (dokumentierte Ausnahmen aus design-rules.json abgezogen)`);
process.exit(fehler ? 1 : 0);
