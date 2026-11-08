/**
 * Öffentliches Deployment ohne Besucher-Sitzung.
 *
 * Wiederhergestellt am 08.11.2026 (Hermes) nach dem Vorbild der am 02.11.2026
 * gelöschten Datei `api/session.ts` (Commit 7606c85) — gleiche Entscheidung,
 * unverändert: In der öffentlichen Auslieferung gibt es keine Besuchersitzung.
 * Die Route antwortet deshalb 204 (No Content), damit Clients nicht weiter
 * gegen ein 404 laufen. Sie liefert bewusst KEINE erfundenen Fähigkeiten,
 * keinen CSRF-Token und keinen Verlauf — ohne echte Sitzung gibt es nichts
 * zu berichten (Hartregel: keine fiktiven Livefunktionen).
 */
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } as const;

const noContent = () => new Response(null, { status: 204, headers: HEADERS });
const notAllowed = () => new Response(null, { status: 405, headers: { ...HEADERS, Allow: 'GET, HEAD' } });

export const GET = noContent;
export const HEAD = noContent;
export const POST = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
