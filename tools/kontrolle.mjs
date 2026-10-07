#!/usr/bin/env node
// Kontrolle/Abweichungs-Erkennung: unkontrollierte Dinge + Drift aufdecken.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ergebnis = { abweichungen: [], unkontrolliert: [], zeit: new Date().toISOString() };

// 1) Dienste, die nicht per systemd laufen (unkontrolliert)
const services = ['nexify-vorschau','nexify-watcher','nexify-orchestrierung','nexify-payments','nexify-produkt','nexify-gesamt','ainex-studio','nexify-lernschleife.timer','nexify-gesundheit.timer'];
for (const s of services) {
  try { const st = execFileSync('systemctl', ['is-active', s], { encoding: 'utf8' }).trim(); if (st !== 'active') ergebnis.unkontrolliert.push(`dienst ${s}: ${st}`); }
  catch { ergebnis.unkontrolliert.push(`dienst ${s}: fehlt`); }
}

// 2) Audit-Drift (Designsystem)
try {
  const audit = execFileSync('node', ['tools/ds-audit-cli.js'], { encoding: 'utf8' });
  if (!/0 Fehler/.test(audit)) ergebnis.abweichungen.push('design-audit nicht 0 Fehler');
} catch { ergebnis.abweichungen.push('design-audit fehlgeschlagen'); }

// 3) Manifest-Integrität
try {
  execFileSync('bash', ['-c', 'cd prototypen && sha256sum -c MANIFEST.sha256 --quiet'], { encoding: 'utf8' });
} catch { ergebnis.abweichungen.push('Manifest-Mismatch'); }

// 4) NeXify/Orakel erreichbar
try {
  const h = execFileSync('nx-jeff', ['health'], { encoding: 'utf8' }).trim();
  if (!h.includes('"verfuegbar": true')) ergebnis.abweichungen.push('Orakel nicht erreichbar');
} catch { ergebnis.abweichungen.push('Orakel-Aufruf fehlgeschlagen'); }

// 5) Disk-Nutzung (>/85% = Abweichung)
try {
  const df = execFileSync('df', ['-P', '/'], { encoding: 'utf8' });
  const m = df.split('\n')[1].match(/(\d+)%/);
  if (m && parseInt(m[1]) > 85) ergebnis.abweichungen.push('Disk-Nutzung ' + m[1] + '% > 85%');
} catch {}

// 6) Backup-Frische (letztes Backup < 2 Tage)
try {
  const bak = execFileSync('bash', ['-c', 'ls -t /opt/nexifyai/backup/nexify/nexify-*.tar.gz 2>/dev/null | head -1'], { encoding: 'utf8' }).trim();
  if (!bak) ergebnis.abweichungen.push('kein Backup vorhanden');
  else {
    const alter = execFileSync('bash', ['-c', `echo $(( ($(date +%s) - $(stat -c %Y "${bak}")) / 86400 ))`], { encoding: 'utf8' }).trim();
    if (parseInt(alter) >= 2) ergebnis.abweichungen.push(`Backup ${alter} Tage alt`);
  }
} catch {}

console.log(JSON.stringify(ergebnis, null, 2));
// Ergebnis ins Brain
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: `Kontrolle: ${JSON.stringify(ergebnis)}`, concepts: ['kontrolle', 'abweichung', 'drift'] }) });
} catch {}
// Jeff-Triage bei Abweichungen (neu): Dringlichkeit + Aktion automatisch klassifizieren
if (ergebnis.abweichungen.length || ergebnis.unkontrolliert.length) {
  const meldung = [ ...ergebnis.abweichungen, ...ergebnis.unkontrolliert ].join('; ').slice(0, 300);
  try {
    execFileSync('node', [ 'tools/jeff-triage.mjs', meldung ], { stdio: 'ignore' });
  } catch {}
}
