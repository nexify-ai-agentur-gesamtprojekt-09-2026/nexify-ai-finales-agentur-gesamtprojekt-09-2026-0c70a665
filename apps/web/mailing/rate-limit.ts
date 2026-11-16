/**
 * Mengenbegrenzung der Anmelde- und der Bestätigungsroute je Absender. Jede der beiden Routen hat ihren eigenen
 * Zähler und ihre eigenen Fenster (`grenzen.anfragen_*` und `grenzen.bestaetigungen_*`). Die Abmelderoute hat
 * bewusst keine: Postfachanbieter senden die Abmeldung mit einem Klick von gemeinsamen Adressen aus.
 *
 * Verfahren wie in lib/chat-rate-limit.ts, mit eigenen Zählern, damit der Chat und die Anmeldung einander nicht
 * ausbremsen. Der Absenderschlüssel (`clientKey`) wird von dort wiederverwendet.
 *
 * Grenzen dieser Lösung (ehrlich, wie beim Chat):
 *  - Der Zähler liegt im Arbeitsspeicher einer Funktionsinstanz. Er bremst einzelne Absender, ist aber kein
 *    verlässlicher Schutz gegen verteilte Aufrufe und beginnt mit jeder neuen Instanz von vorn.
 *  - Der Absenderschlüssel ist der erste Eintrag von `x-forwarded-for`, sonst `x-real-ip`. Auf Vercel setzt die
 *    Plattform diese Kopfzeile selbst und übernimmt keinen Wert des Aufrufers. Hinter jedem anderen Vorschaltdienst,
 *    der die Kopfzeile nur ergänzt, kann der Aufrufer den Schlüssel frei wählen und die Begrenzung umgehen. Fehlen
 *    beide Kopfzeilen, teilen sich alle Aufrufer den Schlüssel "unknown".
 * Darum ist diese Begrenzung nur eine Bremse. Die verbindliche Grenze gegen unerwünschte Bestätigungsmails liegt
 * in der Datenbank und hängt an keiner Kopfzeile: je Adress-Prüfsumme in einem Zeitfenster und insgesamt je Tag
 * (Tabelle mailing.confirmation_mails, Migration 0005; Werte unter `grenzen` in config/integrations/mailing-consent.json).
 */

export type RateWindow = { ms: number; max: number };
export type RateVerdict = { allowed: boolean; retryAfterSeconds: number };
export type RateLimiter = { check(key: string, now?: number): RateVerdict; reset(): void };

const MAX_KEYS = 5000;

export function createRateLimiter(windows: readonly RateWindow[]): RateLimiter {
  // Ein Fenster mit 0, NaN oder gebrochener Angabe würde nie begrenzen (jeder Vergleich mit NaN ist falsch).
  const valid = (value: number) => Number.isInteger(value) && value >= 1;
  if (windows.length === 0 || !windows.every((window) => valid(window.ms) && valid(window.max))) throw new Error('invalid_rate_window');
  const hits = new Map<string, number[]>();
  const longest = Math.max(...windows.map((window) => window.ms));
  return {
    check(key, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < longest);
      for (const window of windows) {
        const inWindow = recent.filter((time) => now - time < window.ms);
        if (inWindow.length >= window.max) {
          hits.set(key, recent);
          return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((inWindow[0] + window.ms - now) / 1000)) };
        }
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > MAX_KEYS) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}
