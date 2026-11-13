/**
 * Einfache Mengenbegrenzung des öffentlichen Chats je Absender.
 *
 * Grenze dieser Lösung (ehrlich): Der Zähler liegt im Arbeitsspeicher einer Funktionsinstanz.
 * Auf Vercel laufen mehrere Instanzen und sie werden neu gestartet; die Begrenzung bremst
 * einzelne Absender, ist aber kein Kostendeckel. Ein verbindliches Ausgabenlimit gehört an den
 * Router (Schlüssel mit Budget) und ist dort vom Inhaber zu setzen.
 *
 * Der Absender wird nur als kurzlebiger Schlüssel im Speicher gehalten und nie protokolliert.
 */

const WINDOWS: readonly { ms: number; max: number }[] = [
  { ms: 60_000, max: 8 },
  { ms: 3_600_000, max: 60 },
];
const MAX_KEYS = 5000;
const hits = new Map<string, number[]>();

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || request.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

export function chatRateLimit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
  const longest = WINDOWS[WINDOWS.length - 1].ms;
  const recent = (hits.get(key) ?? []).filter((time) => now - time < longest);
  for (const window of WINDOWS) {
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
}

/** Nur für Tests. */
export function resetChatRateLimit(): void {
  hits.clear();
}
