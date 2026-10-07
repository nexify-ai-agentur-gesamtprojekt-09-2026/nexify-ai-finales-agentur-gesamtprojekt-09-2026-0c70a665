#!/usr/bin/env node
// Gesundheits-/Selbstheilungs-Check: vorschau DNS + Services.
// Repariert vorschau-A-Record (DUS, DNS-only) automatisch (korrigiert 29.09.2026:
// alter CNAME->Tunnel f0f2b101 war tot; richtiger Zielzustand = A 179.198.195.91).
import { readFileSync, writeFileSync, statfsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const CF = 'https://api.cloudflare.com/client/v4';
function cfEnv() {
  const env = {};
  for (const line of readFileSync('/opt/backups/frankfurt/etc/nexifyai/hermes.env', 'utf8').split('\n')) {
    const l = line.trim();
    if (l && !l.startsWith('#') && l.includes('=')) { const [k, v] = l.split('=', 2); env[k] = v.trim().replace(/^["']|["']$/g, ''); }
  }
  return env;
}
const env = cfEnv();
const DNS_TOKEN = env.CLOUDFLARE_DNS_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
const DUS_IP = '179.198.195.91';

async function cf(path, opts = {}) {
  const r = await fetch(CF + path, { headers: { 'Authorization': 'Bearer ' + DNS_TOKEN, 'Content-Type': 'application/json' }, method: opts.method || 'GET', body: opts.body });
  return r.json();
}

const out = { zeit: new Date().toISOString(), cname: 'ok', services: {}, selbstheilung: [] };

// 1) DNS vorschau prüfen + ggf. reparieren (Soll: A -> DUS_IP, DNS-only)
const zones = await cf('/zones?name=nexifyai.cloud');
const zone = (zones.result || [{}])[0].id;
const recs = await cf(`/zones/${zone}/dns_records?name=vorschau.nexifyai.cloud`);
const richtig = (recs.result || []).find(x => x.type === 'A' && x.content === DUS_IP);
if (!richtig) {
  for (const x of (recs.result || [])) if (x.id) await cf(`/zones/${zone}/dns_records/${x.id}`, { method: 'DELETE' });
  await cf(`/zones/${zone}/dns_records`, { method: 'POST', body: JSON.stringify({ type: 'A', name: 'vorschau.nexifyai.cloud', content: DUS_IP, proxied: false, ttl: 1 }) });
  out.cname = 'repariert';
  out.selbstheilung.push('vorschau A-Record neu gesetzt (DUS, DNS-only)');
}

// Host-Port dynamisch aus Docker lesen (Compose vergibt einen dynamischen Port; 33018 war der letzte beobachtete).
function cogneeUrl() {
  try {
    const out = execFileSync('docker', ['inspect', 'cognee-x532-cognee-1'], { encoding: 'utf8' });
    const p = JSON.parse(out)[0]?.NetworkSettings?.Ports?.['8000/tcp'];
    if (p && p[0]?.HostPort) return `http://127.0.0.1:${p[0].HostPort}/health`;
  } catch {}
  return 'http://127.0.0.1:33018/health';
}
// 2) Services prüfen
const checks = [
  ['nexify-app', 'http://127.0.0.1:8907/health'],
  ['agentmemory', 'http://127.0.0.1:3111/agentmemory/livez'],
  ['lightrag', 'http://127.0.0.1:9621/health'],
  ['cognee', cogneeUrl()],
  ['orchestrierung', 'http://127.0.0.1:8908/health'],
  ['ainex-studio', 'http://127.0.0.1:3400/health'],
  ['nexi2fyi-api', 'http://127.0.0.1:8080/health'],
  ['openbao', 'http://127.0.0.1:8200/v1/sys/health'],
  ['ai-router', 'http://127.0.0.1:20128/api/health'],
  ['scanner', 'http://127.0.0.1:3211/healthz'],
  ['nexify-gesamt', 'http://127.0.0.1:4173/health'],
  ['myadmin-cockpit', 'http://127.0.0.1:8300/myadmin/health'],
  ['nexify-produkt', 'http://127.0.0.1:8910/health'],
  ['nexify-payments', 'http://127.0.0.1:8909/health'],
  ['mailbridge', 'http://127.0.0.1:8791/health'],
  ['dsh-market-web', 'http://127.0.0.1:3086/healthz'],
  ['codex-ttyd', 'http://127.0.0.1:7681/'],
  // MCP-Server ohne /health: Liveness ueber den HTTP-Status (400 = erreichbar).
  ['nexify-browser-mcp', 'http://192.168.0.1:8931/', 400],
  // DSH-Harness: Login-Gate aktiv -> 401 bedeutet erreichbar.
  ['dsh-harness', 'http://127.0.0.1:3085/', 401],
  ['nexifyai-core-api', 'http://127.0.0.1:8002/health'],
  ['nexify-vorschau', 'http://127.0.0.1:8091/'],
  // Dienste ohne HTTP-Endpunkt: Liveness ueber systemd (systemd:<unit>).
  ['unit:cloudflared', 'systemd:cloudflared'],
  ['unit:nexify-watcher', 'systemd:nexify-watcher'],
  ['unit:nexify-webhook-inbox', 'systemd:nexify-webhook-inbox'],
  ['unit:whatsapp-webhook', 'systemd:whatsapp-webhook'],
  ['unit:codex-mcp', 'systemd:codex-mcp'],
  ['unit:netdata', 'systemd:netdata'],
  ['unit:monarx-agent', 'systemd:monarx-agent'],
  ['unit:ttyd', 'systemd:ttyd'],
  ['unit:nexifyai-docker-events', 'systemd:nexifyai-docker-events'],
  ['unit:ollama-docker-forward', 'systemd:ollama-docker-forward'],
  // DSH-Enterprise-Stack (Modell-Gateway/Desktop-Login) + Plattform-Container.
  ['dsh-enterprise-frontend', 'http://127.0.0.1:3002/health'],
  ['librechat', 'http://127.0.0.1:3081/health'],
  ['admin-panel', 'http://127.0.0.1:3001/health'],
  ['convex-backend', 'http://127.0.0.1:4310/'],
  ['searxng', 'http://127.0.0.1:8888/healthz'],
  ['blackbox', 'http://127.0.0.1:9115/health'],
  ['prometheus', 'http://127.0.0.1:9190/'],
  ['gitlab', 'http://127.0.0.1:8922/', 302],
  ['dify-web', 'http://127.0.0.1:32769/'],
  // Container ohne HTTP-Endpunkt: Liveness ueber docker (docker:<name>).
  ['docker:deploy-db', 'docker:deploy-db-1'],
  ['docker:myadmin-pg', 'docker:myadmin-pg'],
  ['docker:dsh-gateway', 'docker:dsh-enterprise-gateway-1'],
  ['docker:dsh-backend', 'docker:dsh-enterprise-backend-1'],
  ['docker:dsh-worker', 'docker:dsh-enterprise-backend_worker-1'],
  ['docker:dsh-mysql', 'docker:dsh-enterprise-mysql-1'],
  ['docker:dsh-redis', 'docker:dsh-enterprise-redis-1'],
  ['docker:dsh-minio', 'docker:dsh-enterprise-minio-1'],
  ['docker:dsh-etcd', 'docker:dsh-enterprise-etcd-1'],
  ['docker:dsh-milvus', 'docker:dsh-enterprise-milvus-1'],
  ['docker:dsh-elasticsearch', 'docker:dsh-enterprise-elasticsearch-1'],
  ['docker:dsh-openfga', 'docker:dsh-enterprise-openfga-1'],
  ['docker:gitlab-runner', 'docker:gitlab-runner'],
  ['docker:nexify-lokal-gateway', 'docker:nexify-lokal-gateway-1'],
  ['docker:nexify-lokal-app', 'docker:nexify-lokal-app-1'],
  ['docker:nexify-lokal-web', 'docker:nexify-lokal-web-1'],
  ['docker:nexify-lokal-worker', 'docker:nexify-lokal-worker-1'],
  ['docker:nexify-lokal-mcp', 'docker:nexify-lokal-mcp-1'],
  ['docker:nexify-lokal-otel', 'docker:nexify-lokal-otel-1'],
  ['docker:rag-api', 'docker:rag_api'],
  // Infra-Komponenten (Ingress/Monitoring/Storage) — Liveness ueber docker.
  ['docker:traefik-juib', 'docker:traefik-juib-traefik-1'],
  ['docker:grafana', 'docker:watch-grafana'],
  ['docker:node-exporter', 'docker:watch-node-exporter'],
  ['docker:alertmanager', 'docker:watch-alertmanager'],
  ['docker:vectordb', 'docker:vectordb'],
  // Staging-Umgebung (Bereich A, TEST-A002) + myadmin-Shell.
  ['deploy-staging-api', 'http://127.0.0.1:8180/health'],
  ['docker:deploy-staging-db', 'docker:deploy-staging-db-1'],
  ['docker:deploy-staging-scanner', 'docker:deploy-staging-scanner-1'],
  ['docker:myadmin-shell', 'docker:myadmin-shell'],
];
if (process.env.GESUNDHEIT_ERZWINGE_FEHLER) checks.push(['selbsttest-ausfall', 'http://127.0.0.1:1/health']);
// Anti-Bypass (Master-Direktive §8): stilles Entfernen von Checks wird als Ausfall gewertet.
const MIN_BASIS_CHECKS = Number(process.env.GESUNDHEIT_MIN_CHECKS || 60);
if (checks.length < MIN_BASIS_CHECKS) checks.push(['monitor-untergrenze', 'bypass:zu wenige Checks=' + checks.length]);
// Fehlgeschlagene systemd-Units sind ein Ausfall, auch wenn der HTTP-Port antwortet.
// Selbstausschluss: die eigene Monitor-Unit darf sich nicht selbst als Ausfall zaehlen
// (sonst perpetuiert sich ein einzelner Fehlschlag: Monitor rot -> Unit failed -> Monitor rot).
const SELBST_UNITS = new Set(['nexify-gesundheit.service']);
try {
  const roh = execFileSync('systemctl', ['list-units', '--state=failed', '--no-legend', '--plain'], { encoding: 'utf8' });
  for (const z of roh.split('\n').map((s) => s.trim()).filter(Boolean)) {
    const unit = z.split(/\s+/)[0];
    if (unit && unit.endsWith('.service') && !SELBST_UNITS.has(unit)) checks.push([`unit-fehler:${unit}`, 'systemd-fehler:' + unit]);
  }
} catch { /* systemctl nicht verfuegbar */ }
// Crash-Loop: Zuwachs im Beobachtungsfenster statt kumulativem Zaehler.
// Ein alter Zaehlerstand (z. B. nach Wartung oder Speicherdruck) ist kein Crashloop;
// alarmiert wird nur, was zwischen zwei Laeufen (5 Minuten) neu hinzukommt.
const MAX_NEUSTARTS = Number(process.env.GESUNDHEIT_MAX_NEUSTARTS || 2);
const RESTART_STATE = process.env.GESUNDHEIT_RESTART_STATE || '/var/lib/nexify-gesundheit-restarts.json';
let vorher = {};
try { vorher = JSON.parse(readFileSync(RESTART_STATE, 'utf8')); } catch { /* erster Lauf */ }
const jetzt = {};
try {
  for (const id of execFileSync('docker', ['ps', '-q'], { encoding: 'utf8' }).split('\n').filter(Boolean)) {
    const info = JSON.parse(execFileSync('docker', ['inspect', id], { encoding: 'utf8' }))[0];
    const name = String(info.Name).replace(/^\//, '');
    const neu = Number(info?.RestartCount || 0);
    jetzt[name] = neu;
    const alt = Number.isFinite(vorher[name]) ? Number(vorher[name]) : neu;
    const zuwachs = neu - alt;
    if (zuwachs > MAX_NEUSTARTS) checks.push([`neustart:${name}`, 'crashloop:+' + zuwachs]);
  }
  writeFileSync(RESTART_STATE, JSON.stringify(jetzt));
} catch { /* docker nicht verfuegbar */ }
// Ressourcenpruefungen: 200 = innerhalb der Grenzen, 0 = Ausfall.
try {
  const fsInfo = statfsSync('/');
  const belegt = 100 - (fsInfo.bavail / fsInfo.blocks) * 100;
  checks.push(['ressource:disk', 'ressource:disk:' + (belegt > DISK_MAX_PROZENT ? 'rot' : 'ok')]);
  out.disk_prozent = Math.round(belegt * 10) / 10;
} catch { /* statfs nicht verfuegbar */ }
try {
  const frei = (os.freemem() / os.totalmem()) * 100;
  checks.push(['ressource:speicher', 'ressource:speicher:' + (frei < SPEICHER_MIN_PROZENT ? 'rot' : 'ok')]);
  out.speicher_frei_prozent = Math.round(frei * 10) / 10;
} catch { /* os nicht verfuegbar */ }
try {
  const last = os.loadavg()[0];
  const grenze = os.cpus().length * LAST_FAKTOR;
  checks.push(['ressource:last', 'ressource:last:' + (last > grenze ? 'rot' : 'ok')]);
  out.last1 = Math.round(last * 100) / 100;
} catch { /* os nicht verfuegbar */ }
const erwartet = {};
for (const [n, u, e = 200] of checks) {
  erwartet[n] = e;
  // systemd-basierte Liveness: aktiv -> 200, sonst 0.
  if (String(u).startsWith('systemd:')) {
    try { const aktiv = execFileSync('systemctl', ['is-active', String(u).slice(8)], { encoding: 'utf8' }).trim() === 'active'; out.services[n] = aktiv ? 200 : 0; }
    catch { out.services[n] = 0; }
    continue;
  }
  // Container-Liveness: laufend + (falls vorhanden) Health=healthy.
  if (String(u).startsWith('docker:')) {
    try {
      const info = JSON.parse(execFileSync('docker', ['inspect', String(u).slice(7)], { encoding: 'utf8' }))[0];
      const laeuft = info?.State?.Running === true;
      const health = info?.State?.Health?.Status;
      out.services[n] = laeuft && (!health || health === 'healthy') ? 200 : 0;
    } catch { out.services[n] = 0; }
    continue;
  }
  if (String(u).startsWith('systemd-fehler:')) { out.services[n] = 0; continue; }
  if (String(u).startsWith('crashloop:')) { out.services[n] = 0; continue; }
  // Ressourcenpruefung: die Entscheidung steckt im Praefix (:ok / :rot).
  if (String(u).startsWith('ressource:')) { out.services[n] = String(u).endsWith(':ok') ? 200 : 0; continue; }
  // Erwartete 3xx werden ohne Folgen des Redirects geprueft (das Weiterleitungsziel kann
  // unerreichbar sein); 2xx werden normal gefolgt.
  const optionen = { signal: AbortSignal.timeout(5000), ...(e >= 300 && e < 400 ? { redirect: 'manual' } : {}) };
  try { const r = await fetch(u, optionen); out.services[n] = r.status; }
  catch { out.services[n] = 0; }
}

// 3) Alarm: Ausfaelle sichtbar machen (Exit-Code + Alarmzeile + Statusdatei).
const ausfaelle = Object.entries(out.services).filter(([n, st]) => st !== (erwartet[n] ?? 200));
out.ausfaelle = ausfaelle.map(([n, st]) => n + '=' + st);
const STATUS_DATEI = process.env.GESUNDHEIT_STATUS || '/var/log/nexify-gesundheit-status.json';
try { writeFileSync(STATUS_DATEI, JSON.stringify(out, null, 2) + '\n'); } catch {}
console.log(JSON.stringify(out, null, 2));
if (ausfaelle.length) {
  for (const [n, st] of ausfaelle) console.error('ALARM: Dienst ' + n + ' nicht erreichbar (Status ' + st + ')');
  process.exitCode = 1;
}
try {
  await fetch('http://127.0.0.1:3111/agentmemory/remember', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: `Gesundheit: cname=${out.cname}, services=${JSON.stringify(out.services)}`, concepts: ['gesundheit', 'selbstheilung', 'dns'] }) });
} catch {}
