#!/usr/bin/env node
// Expositionspruefung: Docker veroeffentlichte Ports umgehen ufw (eigene iptables-Kette
// DOCKER-USER wird vor den ufw-Regeln ausgewertet). Ein Container, der auf 0.0.0.0/:: lauscht,
// ist damit aus dem Internet erreichbar, sofern die DOCKER-USER-Kette keine Sperre enthaelt.
// Fail-closed: oeffentlich veroeffentlichter Port ohne Sperre = FAIL.
// Aufruf: node tools/exposure-check.mjs
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const erlaubt = (process.env.EXPOSURE_ERLAUBT || '').split(',').map((s) => s.trim()).filter(Boolean);
const fehler = [];

// 1) Veroeffentlichte Ports sammeln (nur 0.0.0.0 / :: — 127.0.0.1 ist gebunden).
const expose = [];
for (const id of execFileSync('docker', ['ps', '-q'], { encoding: 'utf8' }).split('\n').filter(Boolean)) {
  const info = JSON.parse(execFileSync('docker', ['inspect', id], { encoding: 'utf8' }))[0];
  const name = String(info.Name).replace(/^\//, '');
  for (const [containerPort, bindungen] of Object.entries(info.NetworkSettings?.Ports || {})) {
    for (const b of bindungen || []) {
      if (b.HostIp && b.HostIp !== '0.0.0.0' && b.HostIp !== '::') continue;
      expose.push({ name, hostPort: Number(b.HostPort), containerPort, hostIp: b.HostIp || '0.0.0.0' });
    }
  }
}

// 2) Sperren in der DOCKER-USER-Kette lesen (DROP/REJECT-Regeln).
let sperren = '';
try { sperren = execFileSync('iptables', ['-S', 'DOCKER-USER'], { encoding: 'utf8' }); } catch { sperren = ''; }
const hatSperre = /-j (DROP|REJECT)/.test(sperren);

const offen = expose.filter((e) => !hatSperre && !erlaubt.includes(String(e.hostPort)));
if (offen.length) {
  fehler.push(`${offen.length} Container-Port(s) oeffentlich veroeffentlicht und ohne Sperre in DOCKER-USER:`);
  for (const e of offen) fehler.push(`  ${e.name}: ${e.hostIp}:${e.hostPort} -> ${e.containerPort}`);
  fehler.push('Fix A (empfohlen): Ports in der Compose-Datei auf 127.0.0.1 binden (z. B. "127.0.0.1:3081:3081").');
  fehler.push('Fix B: iptables -I DOCKER-USER -i eth0 -j DROP   (sperrt Internet->Container, Traefik bleibt ueber 127.0.0.1 erreichbar).');
}

const bericht = { stand: new Date().toISOString(), oeffentlich: expose.length, erlaubt, sperre_vorhanden: hatSperre, offen: offen.map((e) => `${e.name}:${e.hostPort}`), fehler };
try { mkdirSync('evidence', { recursive: true }); writeFileSync('evidence/exposure.json', JSON.stringify(bericht, null, 2) + '\n'); } catch { /* optional */ }

console.log(`  Exposition: ${expose.length} oeffentlich veroeffentlichte Container-Ports, DOCKER-USER-Sperre=${hatSperre}, ungeschuetzt=${offen.length}`);
if (fehler.length) { for (const f of fehler) console.error('  ' + f); console.error('exposure-check: FAIL'); process.exit(1); }
console.log('exposure-check: bestanden; Evidenz evidence/exposure.json');
