/**
 * TEILEKLAR auf eigener Domain (Auftrag des Inhabers vom 15.11.2026; Plan und Umschaltschritte:
 * docs/04-betrieb/shop-eigene-domain-2026-11-15.md).
 *
 * Eine App, zwei Adressräume. Der Shop liegt in der App weiter unter /teileklar; auf teileklar.shop zeigt er sich ohne
 * diesen Präfix. Dieses Modul entscheidet je Aufruf nur über Adressen: durchlassen, intern umschreiben oder weiterleiten.
 * Es ändert keine Seite, kein Stylesheet und keinen Text.
 *
 * Standard ist AUS. Ohne NEXIFY_SHOP_HOST=enabled ist jede Entscheidung „durchlassen" und jede Adresse wie bisher.
 * Mit Schalter gilt:
 *  - teileklar.shop ist die eine kanonische Shop-Adresse; www.teileklar.shop leitet dauerhaft dorthin.
 *  - Auf teileklar.shop wird ein Pfad P als /teileklar + P ausgeliefert (teileklar.shop/shop = /teileklar/shop).
 *    Was es dort nicht gibt, endet im 404 der App. /api bleibt erreichbar, die Kontoseiten ebenfalls (Sitzungs-Cookies
 *    gelten je Host, die Anmeldung muss deshalb auf demselben Host liegen wie der Shop).
 *  - Bekannte Agenturseiten leiten von teileklar.shop auf die Agentur-Domain; /teileklar/… leitet auf beiden Seiten
 *    auf die Adresse ohne Präfix unter teileklar.shop.
 *  - Nur freigegebene Produktionsdomains leiten um. Vorschauen (*.vercel.app), localhost und gemischte Host-Angaben
 *    bleiben beim bisherigen Verhalten.
 *
 * Liegt neben indexing.ts und nicht unter lib/ (lib/ ist als Verzeichnis an den Text-Resize-Beleg gebunden). Reine
 * Funktionen ohne Laufzeitabhängigkeit: Proxy, Sitemap, Router-Brücke und die Node-Tests verwenden dieselbe Regel.
 */
import {
  APPROVED_INDEX_HOSTS, SHOP_CANONICAL_HOST, isTeileklarPath, normalizeHost, shopHostOn, type IndexingEnvironment,
} from './indexing.ts';

export const SHOP_WWW_HOST = 'www.' + SHOP_CANONICAL_HOST;
export const SHOP_HOSTS: readonly string[] = [SHOP_CANONICAL_HOST, SHOP_WWW_HOST];
export const SHOP_ORIGIN = 'https://' + SHOP_CANONICAL_HOST;
/** Kanonische Adresse der Agenturseiten; identisch mit PUBLIC_ORIGIN in lib/page-seo.ts (Test hält beide gleich). */
export const AGENCY_ORIGIN = 'https://www.nexifyai.de';
export const SHOP_PREFIX = '/teileklar';
/** Kopfzeile, mit der der Proxy dem Layout sagt, dass der Aufruf über die Shop-Domain kam. Der Proxy setzt oder entfernt sie immer selbst. */
export const SHOP_HOST_HEADER = 'x-nexify-shop-host';

/**
 * Seiten, die auf der Shop-Domain unverändert (ohne Präfix) erreichbar bleiben: die Kontoseiten. Der Shop verlinkt sie,
 * und die Sitzung der Shop-API ist ein Cookie des jeweiligen Hosts. /login und /signup sind die alten Adressen dazu
 * (next.config.ts leitet sie auf /anmelden und /registrieren). /sitemap.xml liefert je Host die eigene Liste.
 */
export const SHOP_SHARED_PATHS: readonly string[] = ['/anmelden', '/registrieren', '/passwort-vergessen', '/passwort-zuruecksetzen', '/login', '/signup', '/sitemap.xml'];

/**
 * Feste Ziele nach der Anmeldung (components/shop/AuthForms.tsx: Kunde nach /portal/kunde, Verwaltung nach /intern/leitstand).
 * Beide Bereiche gehören zur Agentur-Domain; die dortige Sitzung ist eine andere als die auf der Shop-Domain. Wer sich im Shop
 * anmeldet, landet deshalb bei den Entsprechungen des Shops. Vorläufig (307), bis der Inhaber das Ziel bestätigt.
 */
export const SHOP_LANDING_TARGETS: Readonly<Record<string, string>> = { '/portal/kunde': '/bestellungen', '/intern/leitstand': '/admin' };

const under = (path: string, prefixes: readonly string[]): boolean => prefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));
const isAppInternal = (path: string): boolean => under(path, ['/api', '/_next']);
export const isShopSharedPath = (path: string): boolean => under(path, SHOP_SHARED_PATHS);

/** /teileklar → /, /teileklar/x → /x. Nur für Pfade unter dem Präfix aufrufen. */
export const stripShopPrefix = (path: string): string => path.slice(SHOP_PREFIX.length) || '/';
/** Pfad, wie ihn die Shop-Domain zeigt → Pfad, unter dem die App die Seite führt. */
export const shopInternalPath = (path: string): string => (isAppInternal(path) || isShopSharedPath(path) || isTeileklarPath(path) ? path : path === '/' ? SHOP_PREFIX : SHOP_PREFIX + path);

/** Kanonische öffentliche Adresse eines App-Pfads (für Canonical, hreflang, Sitemap, strukturierte Daten). Schalter aus: wie bisher. */
export function publicUrl(path: string, env: IndexingEnvironment): string {
  return shopHostOn(env) && isTeileklarPath(path) ? SHOP_ORIGIN + (path === SHOP_PREFIX ? '' : stripShopPrefix(path)) : AGENCY_ORIGIN + path;
}
/** Basis der Artikel- und Kategorieadressen (lib/shop-server.ts, SHOP_CANONICAL): Basis + '/produkt/<id>'. */
export const shopCanonicalBase = (env: IndexingEnvironment): string => (shopHostOn(env) ? SHOP_ORIGIN : AGENCY_ORIGIN + SHOP_PREFIX);

/**
 * Verweis innerhalb der Oberfläche, wie er auf der Shop-Domain stehen muss: Shop-Pfade ohne Präfix, Kontoseiten und /api
 * unverändert, alles Übrige (Agenturseiten) als vollständige Adresse der Agentur-Domain. Fremde und relative Verweise bleiben.
 */
export function shopPublicHref(href: string): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const cut = href.search(/[?#]/), path = cut < 0 ? href : href.slice(0, cut), rest = cut < 0 ? '' : href.slice(cut);
  if (isAppInternal(path) || isShopSharedPath(path)) return href;
  if (isTeileklarPath(path)) return stripShopPrefix(path) + rest;
  return AGENCY_ORIGIN + href;
}

export type HostKind = 'shop' | 'agency' | 'other';
/** Alle genannten Hosts müssen zur selben Gruppe gehören; fehlende, fremde oder gemischte Angaben sind „other" (keine Umleitung). */
export function hostKind(hosts: readonly string[]): HostKind {
  const named = hosts.map(normalizeHost);
  if (named.length === 0) return 'other';
  if (named.every(host => SHOP_HOSTS.includes(host))) return 'shop';
  if (named.every(host => APPROVED_INDEX_HOSTS.includes(host))) return 'agency';
  return 'other';
}

export type ShopHostDecision =
  | { action: 'pass'; shopHost: boolean; path: string }
  | { action: 'rewrite'; shopHost: true; path: string }
  | { action: 'redirect'; status: 307 | 308; location: string };

/**
 * Entscheidung für einen Aufruf. `path` ist der bereits normalisierte Pfad (auth/policy.ts, canonicalPath), `search` die
 * Abfrage mit führendem Fragezeichen oder leer, `agencyPaths` die bekannten Seiten der Agentur (Katalog ohne /teileklar,
 * Rechtsseiten). Ziele auf demselben Host sind Pfade, Ziele auf einem anderen Host vollständige Adressen.
 */
export function shopHostDecision(input: { hosts: readonly string[]; path: string; search: string; env: IndexingEnvironment; agencyPaths: readonly string[] }): ShopHostDecision {
  const { hosts, path, search, env, agencyPaths } = input;
  const pass: ShopHostDecision = { action: 'pass', shopHost: false, path };
  if (!shopHostOn(env)) return pass;
  const kind = hostKind(hosts);
  if (kind === 'other') return pass;
  const encoded = (value: string) => encodeURI(value) + search;
  if (kind === 'agency') return isTeileklarPath(path) ? { action: 'redirect', status: 308, location: SHOP_ORIGIN + encoded(stripShopPrefix(path)) } : pass;

  const onCanonicalHost = hosts.map(normalizeHost).every(host => host === SHOP_CANONICAL_HOST);
  const local = (target: string) => (onCanonicalHost ? '' : SHOP_ORIGIN) + encoded(target);
  let decision: ShopHostDecision;
  if (isAppInternal(path)) decision = { action: 'pass', shopHost: true, path };
  else if (isTeileklarPath(path)) decision = { action: 'redirect', status: 308, location: local(stripShopPrefix(path)) };
  else if (isShopSharedPath(path)) decision = { action: 'pass', shopHost: true, path };
  else if (Object.hasOwn(SHOP_LANDING_TARGETS, path)) decision = { action: 'redirect', status: 307, location: local(SHOP_LANDING_TARGETS[path]) };
  else if (path !== '/' && agencyPaths.includes(path)) decision = { action: 'redirect', status: 308, location: AGENCY_ORIGIN + encoded(path) };
  else decision = { action: 'rewrite', shopHost: true, path: shopInternalPath(path) };
  // www.teileklar.shop liefert nie selbst aus: ein Sprung auf die kanonische Adresse, bereits mit dem endgültigen Pfad.
  // /api ist ausgenommen (Aufrufe mit Inhalt werden nicht über einen zweiten Host geschickt, sie antworten direkt).
  if (!onCanonicalHost && decision.action !== 'redirect' && !isAppInternal(path)) return { action: 'redirect', status: 308, location: SHOP_ORIGIN + encoded(path) };
  return decision;
}

/** Bekannte Seiten der Agentur aus dem Seitenkatalog: alles außerhalb von /teileklar, dazu die Rechtsseiten mit eigener Route. */
export function agencyPagePaths(catalog: { pages: readonly { path: string }[] }, legalRoutes: readonly string[]): string[] {
  return [...catalog.pages.map(page => page.path).filter(path => !isTeileklarPath(path)), ...legalRoutes];
}

/** Sperrliste der robots.txt auf der Shop-Domain: dieselben Einträge wie bisher, ohne Präfix; Agenturbereiche entfallen. */
export function shopRobotsDisallow(agencyDisallow: readonly string[]): string[] {
  return agencyDisallow.flatMap(entry => {
    if (entry === '/api/') return [entry];
    const trailing = entry.endsWith('/'), path = trailing ? entry.slice(0, -1) : entry;
    return isTeileklarPath(path) ? [stripShopPrefix(path) + (trailing ? '/' : '')] : [];
  });
}
