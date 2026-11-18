/**
 * Zustand der Gesprächsscheibe, den der Server für den ersten Bildaufbau aus Cookies liest
 * (app/layout.tsx). Ohne Browser-Schnittstellen, damit Server und Oberfläche dieselben Grenzen nutzen.
 */
export const CHAT_MIN = 270; // Standardbreite seit 2026-11-18 um 25 % schmaler (clamp(270px,21.75vw,324px)); Ziehen darf nicht darunter fallen.
export const CHAT_MAX = 1220;

/** Zustand im ersten Bildaufbau: offen, eingeklappt oder – ohne gespeicherte Wahl – nach Fensterbreite. */
export type InitialChat = 'auto' | 'open' | 'closed';

export function initialChatFromCookie(value: string | undefined): InitialChat {
  return value === '1' ? 'open' : value === '0' ? 'closed' : 'auto';
}

/** Breite aus dem Cookie: nur ganze Zahlen im zulässigen Bereich, sonst die Standardbreite (null). */
export function chatWidthFromCookie(value: string | undefined): number | null {
  if (!value || !/^\d{3,4}$/.test(value)) return null;
  const width = Number(value);
  return width >= CHAT_MIN && width <= CHAT_MAX ? width : null;
}
