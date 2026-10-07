#!/usr/bin/env node
// Rechte-Pruefung fuer Geheimnistraeger (Konfigurationsdateien, keine Quelltexte):
// eine Datei mit einem KLARTEXT-Geheimnis darf nicht gruppen-/weltlesbar sein.
// Ausnahme: liegt die Datei unter einem Verzeichnis ohne Gruppen-/Weltrechte (z. B. /root 700),
// ist sie unabhaengig von ihren eigenen Rechten geschuetzt.
// Fail-closed: weltlesbare Konfigurationsdatei mit Klartext-Geheimnis ausserhalb eines 700-Pfads = FAIL.
// Aufruf: node tools/secret-perms-check.mjs
import { readFileSync, statSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';

const WURZELN = (process.env.SECRET_PERMS_ROOTS || '/etc,/root,/opt/customers,/opt/nex2fly,/opt/open-design,/opt/nexifyai').split(',').map((s) => s.trim()).filter(Boolean);
// Nur Konfigurations-/Schluesseldateien — Quelltexte (die Schluesselnamen nur verarbeiten) sind ausgenommen.
const ENDUNGEN = new Set(['.env', '.pem', '.key', '.conf', '.ini', '.toml', '.yaml', '.yml', '.json', '.txt', '.env.local']);
const NAMEN = /(^|\/)(\.env|\.env\.[a-z]+|[^/]*\.env)$/i;
// Drittanbieter-/Beispielpfade (deren Default-Werte sind keine Geheimnisse dieses Projekts).
const SKIP = /(node_modules|\/\.git\/|\/reference\/|\.example$|\.sample$|testdata|\/demos?\/|\/third_party\/|\/vendor\/|Agents-Anywhere|open-design|skills-backup|archive-legacy|change-me|sudo_logsrvd)/;
// Klartext-Zuweisung mit geheimnisartigem Wert (>= 20 Zeichen Base64/Hex/Alnum).
const GEHEIM = /(PASSWORD|PASSWORT|SECRET|API_?KEY|ACCESS_?KEY|PRIVATE_?KEY|TOKEN|_KEY)\s*[:=]\s*["']?[A-Za-z0-9+/_\-]{20,}["']?/i;
const fehler = [];
let geprueft = 0;

function geschuetzt(p) {
  let d = dirname(p);
  for (let i = 0; i < 8 && d !== '/'; i++) {
    try { if ((statSync(d).mode & 0o077) === 0) return true; } catch { return false; }
    d = dirname(d);
  }
  return false;
}
function* walk(dir, tiefe = 0) {
  if (tiefe > 7) return;
  let e; try { e = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const x of e) {
    const p = join(dir, x.name);
    if (SKIP.test(p)) continue;
    if (x.isDirectory()) yield* walk(p, tiefe + 1);
    else if (x.isFile()) yield p;
  }
}
for (const wurzel of WURZELN) {
  for (const p of walk(wurzel)) {
    const nameOk = NAMEN.test(p) || ENDUNGEN.has(extname(p).toLowerCase());
    if (!nameOk) continue;
    let st; try { st = statSync(p); } catch { continue; }
    if (st.size > 300000 || (st.mode & 0o004) === 0) continue;
    let txt; try { txt = readFileSync(p, 'utf8'); } catch { continue; }
    if (!GEHEIM.test(txt)) continue;
    geprueft++;
    if (!geschuetzt(p)) fehler.push(`${p} (${(st.mode & 0o777).toString(8)}) — weltlesbar mit Klartext-Geheimnis`);
  }
}
const bericht = { stand: new Date().toISOString(), wurzeln: WURZELN, kandidaten: geprueft, fehler };
try { mkdirSync('evidence', { recursive: true }); writeFileSync('evidence/secret-perms.json', JSON.stringify(bericht, null, 2) + '\n'); } catch { /* optional */ }
console.log(`  Rechte-Pruefung: ${geprueft} weltlesbare Geheimnisdatei(en), ${fehler.length} ungeschuetzt`);
if (fehler.length) { for (const f of fehler.slice(0, 20)) console.error('  ' + f); console.error('secret-perms-check: FAIL'); process.exit(1); }
console.log('secret-perms-check: bestanden; Evidenz evidence/secret-perms.json');
