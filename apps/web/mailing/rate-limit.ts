/**
 * Mengenbegrenzung der Anmelde-, Bestätigungs- und Abmelderouten je Absender.
 *
 * Kopie des Verfahrens aus lib/chat-rate-limit.ts mit eigenen Fenstern und eigenem Zähler, damit der Chat und
 * die Anmeldung einander nicht ausbremsen. Der Absenderschlüssel (`clientKey`) wird von dort wiederverwendet.
 *
 * Grenze dieser Lösung (ehrlich, wie beim Chat): Der Zähler liegt im Arbeitsspeicher einer Funktionsinstanz.
 * Er bremst einzelne Absender, ist aber kein verlässlicher Schutz gegen verteilte Aufrufe. Die harte Grenze
 * gegen unerwünschte Bestätigungsmails liegt in der Datenbank: höchstens `bestaetigungsmails_je_anmeldung`
 * Mails je unbestätigter Anmeldung (mailing/consent.ts).
 */

export type RateWindow = { ms: number; max: number };
export type RateVerdict = { allowed: boolean; retryAfterSeconds: number };
export type RateLimiter = { check(key: string, now?: number): RateVerdict; reset(): void };

const MAX_KEYS = 5000;

export function createRateLimiter(windows: readonly RateWindow[]): RateLimiter {
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
