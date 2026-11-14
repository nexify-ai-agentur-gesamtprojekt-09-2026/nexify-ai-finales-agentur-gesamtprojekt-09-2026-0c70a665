/**
 * Schalter für die drei internen Arbeitsflächen unter /intern/workspace
 * (Betriebsnotiz: docs/04-betrieb/intern-workspace-schliessen-2026-11-14.md).
 *
 * Standard ist AUS. `apps/web` kann heute keine Sitzung und keine Mitgliedschaft serverseitig prüfen (Lücke G19 im
 * führenden Register). Solange das so ist, gibt es keine Bedingung, unter der die Seite die Flächen „nur für team/admin“
 * ausliefern könnte. Der Schalter ist deshalb KEINE Zugriffsprüfung: ist er an, bekommt jeder Aufrufer die Flächen.
 * Er dient nur der lokalen Entwicklung und den Browser-Prüfungen.
 *
 * In der Vercel-Produktion (VERCEL_ENV=production) bleibt er wirkungslos. Die Flächen dort wieder auszuliefern braucht
 * eine Codeänderung mit Prüfung, kein Umgebungswert genügt. Dieses Modul hat bewusst keine Importe, damit es die Seite
 * und die Node-Tests gleich verwenden.
 */
export type InternalWorkspaceEnvironment = Record<string, string | undefined>;

export const INTERNAL_WORKSPACE_SWITCH = 'NEXIFY_INTERN_WORKSPACE_FLAECHEN';

/** Nur der genaue Wert `enabled` schaltet ein; alles andere (fehlend, leer, `1`, `true`, andere Schreibweise) bleibt aus. */
export function internalWorkspaceSurfacesOn(env: InternalWorkspaceEnvironment): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  return env[INTERNAL_WORKSPACE_SWITCH] === 'enabled';
}
