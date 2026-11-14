/**
 * Indexierungsregel der öffentlichen Website (Entscheidungsvorlage: docs/04-betrieb/indexierung-freigabe-2026-11-14.md).
 *
 * Standard ist GESPERRT. Eine Seite darf nur dann in Suchmaschinen erscheinen, wenn ALLE Bedingungen gelten:
 *  1. der ausdrückliche Schalter NEXIFY_INDEXING=enabled ist gesetzt (Freigabe des Inhabers),
 *  2. die Auslieferung ist die Produktion (VERCEL_ENV fehlt oder ist "production"; Vorschauen nie),
 *  3. jeder vom Aufruf genannte Host ist eine freigegebene Produktionsdomain (nie *.vercel.app, *.workers.dev, localhost),
 *  4. der Pfad steht auf der Liste der indexierbaren Seiten (alles Unbekannte bleibt gesperrt),
 *  5. für /teileklar zusätzlich NEXIFY_INDEXING_TEILEKLAR=enabled (der Shop-Dienst antwortet in Produktion mit 503).
 *
 * Die Regel wird in proxy.ts als Kopfzeile `X-Robots-Tag: noindex, nofollow` durchgesetzt. Suchmaschinen wenden die
 * strengste Angabe an; ein `index` im Meta-Tag einer Seite hebt die Kopfzeile nicht auf. Dieses Modul hat bewusst
 * keine Importe, damit es der Proxy, die Sitemap und die Node-Tests gleich verwenden.
 *
 * Das Meta-Tag der Seiten mit eigener Route (/agb, /avv, /widerruf, /teileklar/kategorien, /teileklar/werkstatt) folgt
 * derselben Entscheidung: auth/page-robots.ts ruft indexingDecision mit denselben Eingaben wie der Proxy auf und
 * übersetzt das Ergebnis mit robotsDirective (OA-164). Die Katalogseiten aus lib/page-seo.ts (pageMetadata) folgen im
 * Meta-Tag weiter nur dem Schalter NEXIFY_INDEXING; Host, Produktion und der TEILEKLAR-Schalter greifen dort allein
 * über die Kopfzeile.
 */
export type IndexingEnvironment = Record<string, string | undefined>;

export const INDEXING_SWITCH = 'NEXIFY_INDEXING';
export const TEILEKLAR_INDEXING_SWITCH = 'NEXIFY_INDEXING_TEILEKLAR';
export const NOINDEX_HEADER_VALUE = 'noindex, nofollow';

/** Freigegebene Produktionsdomains. Eine weitere Domain kommt nur durch eine Änderung hier (mit Test) dazu. */
export const APPROVED_INDEX_HOSTS: readonly string[] = ['nexifyai.de', 'www.nexifyai.de', 'nexifyai.cloud', 'www.nexifyai.cloud'];

/**
 * Öffentliche Katalogseiten, die unabhängig vom Schalter gesperrt bleiben: Anmeldung, Registrierung, Suche, Warenkorb, Kasse
 * und die beiden Parameter-Routen ohne Kennung. Dieselbe Liste schließt apps/web/app/sitemap.ts aus (Test hält beide gleich).
 */
export const NEVER_INDEXED_PAGE_IDS: readonly string[] = ['login', 'signup', 'tk-cart', 'tk-checkout', 'tk-product', 'tk-category', 'tk-search'];

/** Eigene Rechtsseiten außerhalb des Katalogs (seit 14.11.2026 eigene Routen, in der Sitemap geführt). */
export const LEGAL_ROUTE_PATHS: readonly string[] = ['/agb', '/avv', '/widerruf'];

/** Artikel- und Kategorieseiten des Shops: genau ein Segment hinter dem Präfix, kein Schrägstrich, keine Steuerzeichen. */
const TEILEKLAR_DETAIL = /^\/teileklar\/(?:produkt|kategorie)\/[^/\s]+$/;

type CatalogPage = { id: string; path: string; access: { visibility: string; auth_required: boolean } };
type Catalog = { public_allowlist: readonly string[]; pages: readonly CatalogPage[] };

/** Pfade, die nach einer Freigabe indexierbar sind: öffentliche, zugelassene Katalogseiten ohne die Ausnahmen, plus Rechtsseiten. */
export function indexablePaths(catalog: Catalog): string[] {
  const allowed = new Set(catalog.public_allowlist);
  return [
    ...catalog.pages
      .filter(page => allowed.has(page.id) && page.access.visibility === 'public' && page.access.auth_required === false && !NEVER_INDEXED_PAGE_IDS.includes(page.id))
      .map(page => page.path),
    ...LEGAL_ROUTE_PATHS,
  ];
}

export const indexingSwitchOn = (env: IndexingEnvironment): boolean => env[INDEXING_SWITCH] === 'enabled';
export const teileklarIndexingOn = (env: IndexingEnvironment): boolean => indexingSwitchOn(env) && env[TEILEKLAR_INDEXING_SWITCH] === 'enabled';
export const isTeileklarPath = (path: string): boolean => path === '/teileklar' || path.startsWith('/teileklar/');

/** Host ohne Port, klein geschrieben, ohne abschließenden Punkt. Ungültiges ergibt die leere Zeichenkette. */
export function normalizeHost(value: string): string {
  const host = value.trim().toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[')) return ''; // IPv6-Literal ist nie eine freigegebene Domain
  const withoutPort = host.replace(/:\d+$/, '');
  return /^[a-z0-9.-]+$/.test(withoutPort) ? withoutPort.replace(/\.$/, '') : '';
}

/** Alle im Aufruf genannten Hosts (Host und X-Forwarded-Host, auch als Kommaliste) einzeln. */
export function requestHosts(...headerValues: (string | null | undefined)[]): string[] {
  return headerValues.flatMap(value => (value ?? '').split(',')).map(part => part.trim()).filter(Boolean);
}

export type IndexingDecision = { index: boolean; reason: 'allowed' | 'switch_off' | 'not_production' | 'host_not_approved' | 'path_not_indexable' | 'teileklar_switch_off' };

/**
 * Entscheidung für einen Seitenaufruf. `paths` ist das Ergebnis von indexablePaths(); `hosts` sind die Rohwerte aus dem Aufruf.
 * Fehlt der Host oder ist auch nur einer nicht freigegeben, bleibt die Seite gesperrt (fail closed).
 */
export function indexingDecision(input: { path: string; hosts: readonly string[]; env: IndexingEnvironment; paths: readonly string[] }): IndexingDecision {
  const { path, hosts, env, paths } = input;
  if (!indexingSwitchOn(env)) return { index: false, reason: 'switch_off' };
  if (env.VERCEL_ENV !== undefined && env.VERCEL_ENV !== 'production') return { index: false, reason: 'not_production' };
  const named = hosts.map(normalizeHost);
  if (named.length === 0 || !named.every(host => APPROVED_INDEX_HOSTS.includes(host))) return { index: false, reason: 'host_not_approved' };
  if (!paths.includes(path) && !TEILEKLAR_DETAIL.test(path)) return { index: false, reason: 'path_not_indexable' };
  if (isTeileklarPath(path) && !teileklarIndexingOn(env)) return { index: false, reason: 'teileklar_switch_off' };
  return { index: true, reason: 'allowed' };
}

/** Meta-Angabe einer Seite, abgeleitet aus derselben Entscheidung wie die Kopfzeile: gesperrt heißt `noindex, nofollow` (NOINDEX_HEADER_VALUE). */
export type RobotsDirective = { index: boolean; follow: boolean };
export const robotsDirective = (decision: IndexingDecision): RobotsDirective => (decision.index ? { index: true, follow: true } : { index: false, follow: false });
