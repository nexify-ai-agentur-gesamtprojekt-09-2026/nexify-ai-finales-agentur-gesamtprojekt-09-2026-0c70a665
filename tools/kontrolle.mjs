#!/usr/bin/env node
// Kontrolle/Abweichungs-Erkennung: unkontrollierte Dinge + Drift aufdecken.
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ergebnis = { abweichungen: [], unkontrolliert: [], zeit: new Date().toISOString() };

// 1) Dienste, die nicht per systemd laufen (unkontrolliert)
// Jeder systemctl-Aufruf startet einen eigenen Prozess; parallel statt sequenziell
// spart bei 7 Diensten den Großteil der kumulierten Prozessstart-Latenz.
const services = ['nexify-vorschau','nexify-watcher','nexify-orchestrierung','nexify-payments','nexify-produkt','nexify-lernschleife.timer','nexify-gesundheit.timer'];
const diensteBefunde = await Promise.all(services.map(async (s) => {
  try {
    const { stdout } = await execFileAsync('systemctl', ['is-active', s], { encoding: 'utf8' });
    const st = stdout.trim();
    return st !== 'active' ? `dienst ${s}: ${st}` : null;
  } catch { return `dienst ${s}: fehlt`; }
}));
ergebnis.unkontrolliert.push(...diensteBefunde.filter(Boolean));

// 2)-6) Unabhängige Drift-Prüfungen: ebenfalls parallel statt sequenziell,
// da keine der Prüfungen von den Ergebnissen der anderen abhängt.
const pruefungen = await Promise.all([
  // 2) Audit-Drift (Designsystem)
  (async () => {
    try {
      const { stdout } = await execFileAsync('node', ['tools/ds-audit-cli.js'], { encoding: 'utf8' });
      return /0 Fehler/.test(stdout) ? null : 'design-audit nicht 0 Fehler';
    } catch { return 'design-audit fehlgeschlagen'; }
  })(),
  // 3) Manifest-Integrität
  (async () => {
    try {
      await execFileAsync('bash', ['-c', 'cd prototypen && sha256sum -c MANIFEST.sha256 --quiet'], { encoding: 'utf8' });
      return null;
    } catch { return 'Manifest-Mismatch'; }
  })(),
  // 4) NeXify/Orakel erreichbar
  (async () => {
    try {
      const { stdout } = await execFileAsync('nx-jeff', ['health'], { encoding: 'utf8' });
      return stdout.trim().includes('"verfuegbar": true') ? null : 'Orakel nicht erreichbar';
    } catch { return 'Orakel-Aufruf fehlgeschlagen'; }
  })(),
  // 5) Disk-Nutzung (>/85% = Abweichung)
  (async () => {
    try {
      const { stdout } = await execFileAsync('df', ['-P', '/'], { encoding: 'utf8' });
      const m = stdout.split('\n')[1].match(/(\d+)%/);
      return (m && parseInt(m[1]) > 85) ? 'Disk-Nutzung ' + m[1] + '% > 85%' : null;
    } catch { return null; }
  })(),
  // 6) Backup-Frische (letztes Backup < 2 Tage)
  (async () => {
    try {
      const { stdout: bakOut } = await execFileAsync('bash', ['-c', 'ls -t /opt/nexifyai/backup/nexify/nexify-*.tar.gz 2>/dev/null | head -1'], { encoding: 'utf8' });
      const bak = bakOut.trim();
      if (!bak) return 'kein Backup vorhanden';
      const { stdout: alterOut } = await execFileAsync('bash', ['-c', `echo $(( ($(date +%s) - $(stat -c %Y "${bak}")) / 86400 ))`], { encoding: 'utf8' });
      const alter = alterOut.trim();
      return parseInt(alter) >= 2 ? `Backup ${alter} Tage alt` : null;
    } catch { return null; }
  })(),
]);
ergebnis.abweichungen.push(...pruefungen.filter(Boolean));

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
