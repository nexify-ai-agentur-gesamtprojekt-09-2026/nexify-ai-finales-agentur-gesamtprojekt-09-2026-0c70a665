// Gemeinsamer Monitorkern: keine DNS-, Speicher- oder Hostaktionen beim Import.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

export async function pruefeVorschauDNS({ lesen, zoneName, recordName, expectedIP }) {
  // Nur eine Leseschnittstelle: Abweichung erzeugt einen Befund, keine Reparatur.
  try {
    const zones = await lesen('/zones?name=' + encodeURIComponent(zoneName));
    if (zones.success !== true) return { cname: 'unbekannt', fehler: true };
    const zone = zones.result?.find(item => item.name === zoneName)?.id;
    if (!zone) return { cname: 'unbekannt', fehler: true };
    const records = await lesen(`/zones/${encodeURIComponent(zone)}/dns_records?name=${encodeURIComponent(recordName)}`);
    if (records.success !== true || !Array.isArray(records.result)) return { cname: 'unbekannt', fehler: true };
    const resolution = records.result.filter(item => item.name === recordName && ['A', 'AAAA', 'CNAME'].includes(item.type));
    const correct = resolution.length > 0 && resolution.every(item => item.type === 'A' && item.content === expectedIP && item.proxied === false);
    return { cname: correct ? 'ok' : 'abweichung', fehler: !correct };
  } catch {
    return { cname: 'unbekannt', fehler: true };
  }
}

export async function pruefeDienste(checks, {
  minimum = 60, fetchImpl = fetch, execImpl = execFileSync,
  versuche = 3, timeoutMs = 5000,
  warten = () => new Promise(resolve => setTimeout(resolve, 1500)),
} = {}) {
  if (!Number.isInteger(minimum) || minimum < 1) throw new Error('Ungueltige Check-Untergrenze');
  if (!Number.isInteger(versuche) || versuche < 1) throw new Error('Ungueltige Anzahl Versuche');
  const services = new Map(), erwartet = new Map();
  for (const [name, ziel, status = 200] of checks) {
    if (typeof name !== 'string' || !name.trim() || typeof ziel !== 'string' || !ziel.trim()) throw new Error('Ungueltiger Check');
    if (services.has(name)) throw new Error('Doppelter Checkname: ' + name);
    if (!Number.isInteger(status) || status < 100 || status > 599 || (!/^https?:\/\//.test(ziel) && status !== 200)) throw new Error('Ungueltiger Erwartungsstatus');
    erwartet.set(name, status);
    let st = 0;
    if (ziel.startsWith('systemd:')) {
      try { st = execImpl('systemctl', ['is-active', ziel.slice(8)], { encoding: 'utf8' }).trim() === 'active' ? 200 : 0; } catch {}
    } else if (ziel.startsWith('docker:')) {
      try {
        const info = JSON.parse(execImpl('docker', ['inspect', ziel.slice(7)], { encoding: 'utf8' }))[0];
        const health = info?.State?.Health?.Status;
        st = info?.State?.Running === true && (!health || health === 'healthy') ? 200 : 0;
      } catch {}
    } else if (ziel.startsWith('ressource:')) {
      st = ziel.endsWith(':ok') ? 200 : 0;
    } else if (/^https?:\/\//.test(ziel)) {
      for (let v = 0; v < versuche; v++) {
        try {
          const response = await fetchImpl(ziel, { signal: AbortSignal.timeout(timeoutMs), ...(status >= 300 && status < 400 ? { redirect: 'manual' } : {}) });
          st = response.status;
          await response.body?.cancel();
          break;
        } catch { st = 0; if (v + 1 < versuche) await warten(); }
      }
    }
    // Unbekannte, crashloop- und systemd-fehler-Ziele bleiben rot.
    services.set(name, st);
  }
  if (checks.length < minimum) {
    services.set('monitor-untergrenze', 0);
    erwartet.set('monitor-untergrenze', 200);
  }
  const ausfaelle = [...services].filter(([n, st]) => st !== erwartet.get(n)).map(([n, st]) => n + '=' + st);
  return { services: Object.fromEntries(services), ausfaelle, exitCode: ausfaelle.length ? 1 : 0 };
}

export function schreibeStatus(datei, bericht, writeImpl = writeFileSync) {
  writeImpl(datei, JSON.stringify(bericht, null, 2) + '\n');
}

// Explizite, anpassbare Betriebsgrenzen statt verschluckter ReferenceErrors.
export function ressourcenGrenzen(env = process.env) {
  for (const name of ['GESUNDHEIT_DISK_MAX_PROZENT', 'GESUNDHEIT_SPEICHER_MIN_PROZENT', 'GESUNDHEIT_LAST_FAKTOR']) {
    if (env[name] !== undefined && (typeof env[name] !== 'string' || !env[name].trim())) throw new Error('Ungueltige Ressourcengrenzen');
  }
  const grenzen = {
    diskMaxProzent: Number(env.GESUNDHEIT_DISK_MAX_PROZENT ?? 90),
    speicherMinProzent: Number(env.GESUNDHEIT_SPEICHER_MIN_PROZENT ?? 5),
    lastFaktor: Number(env.GESUNDHEIT_LAST_FAKTOR ?? 2),
  };
  if (!Number.isFinite(grenzen.diskMaxProzent) || grenzen.diskMaxProzent <= 0 || grenzen.diskMaxProzent > 100 ||
      !Number.isFinite(grenzen.speicherMinProzent) || grenzen.speicherMinProzent < 0 || grenzen.speicherMinProzent >= 100 ||
      !Number.isFinite(grenzen.lastFaktor) || grenzen.lastFaktor <= 0) throw new Error('Ungueltige Ressourcengrenzen');
  return grenzen;
}
