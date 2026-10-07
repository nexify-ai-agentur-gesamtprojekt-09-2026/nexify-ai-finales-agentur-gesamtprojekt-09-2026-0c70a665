#!/usr/bin/env node
// Schwachstellen-Scan der eingesetzten Container-Images (Bereich U/C, Supply-Chain).
// Ruft trivy je Image auf und meldet HIGH/CRITICAL inkl. der mit verfuegbarem Fix.
// Reiner Report (kein Gate): Ergebnis dient der Bewertung und Priorisierung.
// Aufruf: node tools/image-scan.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';

const IMAGES = (process.env.IMAGE_SCAN_LIST || [
  'deploy-api:latest', 'deploy-db:hardened', 'deploy-scanner:latest', 'nexify-app:latest',
  'nx-app-check:latest', 'nx-web-check:latest', 'nx-gateway-check:latest', 'nx-mcp-check:latest', 'nx-worker-check:latest', 'ghcr.io/get-convex/convex-backend:latest',
  'registry.librechat.ai/librechat-ai/librechat-dev:latest',
  'dataelement/bisheng-backend:v3.0.0-beta2', 'cr.dataelem.com/dataelement/gateway:v1.6.0',
  'searxng/searxng:latest', 'openbao/openbao:2', 'pgvector/pgvector:pg16', 'node:22-alpine',
].join(',')).split(',').map((s) => s.trim()).filter(Boolean);

// --alarm: Dauerbetrieb. Meldet per E-Mail, wenn ein EIGENES Image patchbare Findings
// (FixedVersion vorhanden) oder Scan-Fehler hat. Fremdimages (Hersteller) bleiben reiner Report.
const ALARM = process.argv.includes('--alarm');
const TROCKEN = process.argv.includes('--trocken') || process.env.IMAGE_SCAN_TROCKEN === '1';
const OWN = (process.env.IMAGE_SCAN_OWN || 'deploy-api:latest,deploy-db:hardened,deploy-scanner:latest,nexify-app:latest,nx-app-check:latest,nx-web-check:latest,nx-gateway-check:latest,nx-mcp-check:latest,nx-worker-check:latest').split(',').map((s) => s.trim()).filter(Boolean);

const ergebnisse = [];
for (const img of IMAGES) {
  try { execFileSync('docker', ['image', 'inspect', img], { stdio: 'ignore' }); }
  catch { ergebnisse.push({ image: img, status: 'nicht vorhanden' }); continue; }
  let json = '';
  try { json = execFileSync('trivy', ['image', '--severity', 'HIGH,CRITICAL', '--no-progress', '--quiet', '--format', 'json', img], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }); }
  catch (e) { ergebnisse.push({ image: img, status: 'Scan-Fehler: ' + String(e.message || e).slice(0, 80) }); continue; }
  let d = {}; try { d = JSON.parse(json); } catch { ergebnisse.push({ image: img, status: 'JSON-Fehler' }); continue; }
  let high = 0, critical = 0, fixbar = 0;
  for (const r of (d.Results || []).filter((x) => x.Vulnerabilities)) {
    for (const v of r.Vulnerabilities) {
      if (v.Severity === 'CRITICAL') critical++; else if (v.Severity === 'HIGH') high++;
      if (v.FixedVersion) fixbar++;
    }
  }
  ergebnisse.push({ image: img, status: 'gescannt', high, critical, fixbar });
}
const bericht = { stand: new Date().toISOString(), ergebnisse };
try { mkdirSync('evidence', { recursive: true }); writeFileSync('evidence/image-scan.json', JSON.stringify(bericht, null, 2) + '\n'); } catch { /* optional */ }
const md = ['# Schwachstellen-Scan der Container-Images', '', `Stand: ${bericht.stand}`, '', '| Image | HIGH | CRITICAL | mit Fix | Status |', '| --- | --- | --- | --- | --- |',
  ...ergebnisse.map((e) => e.status === 'gescannt' ? `| \`${e.image}\` | ${e.high} | ${e.critical} | ${e.fixbar} | gescannt |` : `| \`${e.image}\` | - | - | - | ${e.status} |`), '',
  'Report, kein Gate: Findings mit verfuegbarem Fix sind priorisiert zu patchen (Image-Rebuild/Update); ohne Fix bleibt nur Bewertung/Risikoentscheidung.'];
try { mkdirSync('docs', { recursive: true }); writeFileSync('docs/SCHWACHSTELLEN.md', md.join('\n') + '\n'); } catch { /* optional */ }

console.log(`  Image-Scan: ${ergebnisse.length} Images`);
for (const e of ergebnisse) console.log(`  ${String(e.status === 'gescannt' ? `${e.high} HIGH / ${e.critical} CRIT` : e.status).padEnd(20)} ${e.image}`);

if (ALARM) {
  const probleme = [];
  for (const e of ergebnisse) {
    if (!OWN.includes(e.image)) continue;
    if (e.status !== 'gescannt') probleme.push(`${e.image}: ${e.status}`);
    else if (e.fixbar > 0) probleme.push(`${e.image}: ${e.fixbar} mit Fix (${e.high} HIGH/${e.critical} CRIT)`);
  }
  const sig = [...probleme].sort().join('|');
  const stateDatei = process.env.IMAGE_SCAN_STATE || '/var/log/nexify-image-scan-state.json';
  let letzte = '';
  try { letzte = JSON.parse(readFileSync(stateDatei, 'utf8')).signatur || ''; } catch { /* none */ }
  if (probleme.length === 0) {
    try { writeFileSync(stateDatei, JSON.stringify({ signatur: '', zeit: bericht.stand }) + '\n'); } catch { /* optional */ }
    console.log('  image-scan: keine patchbaren Findings in eigenen Images');
  } else if (sig === letzte) {
    console.log('  image-scan: Signatur unveraendert — kein erneuter Alarm');
  } else {
    const empfaenger = process.env.ALARM_EMPFAENGER || 'nexify.login@gmail.com';
    const konto = process.env.ALARM_KONTO || 'gmail_trabal-shap';
    const composio = existsSync('/root/.local/bin/composio') ? '/root/.local/bin/composio' : 'composio';
    const nutzlast = '/tmp/image-scan-alarm.json';
    writeFileSync(nutzlast, JSON.stringify({
      recipient_email: empfaenger,
      subject: `ALARM aiNeX2fly Supply-Chain: ${probleme.length} eigenes Image mit patchbaren Findings`,
      body: `Automatischer Supply-Chain-Scan (Dauerbetrieb, trivy).\n\nZeit: ${bericht.stand}\n\nPatchbar/Fehler:\n${probleme.map((p) => '- ' + p).join('\n')}\n\nReport: docs/SCHWACHSTELLEN.md\nRunbook: Image neu bauen (Image-Rebuild), Container neu erstellen, Scan wiederholen.\n`,
      is_html: false,
    }));
    try {
      if (TROCKEN) { writeFileSync(stateDatei, JSON.stringify({ signatur: sig, gesendet: null, probleme }) + '\n'); console.log(`  image-scan: TROCKENLAUF — Alarm nicht gesendet (${probleme.length} eigenes Image)`); }
      else {
      const roh = execFileSync(composio, ['execute', 'GMAIL_SEND_EMAIL', '--account', konto, '-d', '@' + nutzlast], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
      const antwort = JSON.parse(roh);
      if (!antwort.successful) throw new Error('Versand nicht bestaetigt');
      writeFileSync(stateDatei, JSON.stringify({ signatur: sig, gesendet: bericht.stand, probleme }) + '\n');
      console.log(`  image-scan: Alarm gesendet (${probleme.length} eigenes Image)`);
      }
    } catch (e) {
      console.error('  image-scan: Alarm-Versand fehlgeschlagen: ' + (e.message || e));
      process.exitCode = 1;
    }
  }
}
