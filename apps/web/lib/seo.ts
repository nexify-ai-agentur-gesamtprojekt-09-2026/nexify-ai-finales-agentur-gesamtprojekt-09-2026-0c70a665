/**
 * Kanonische SEO-Basis für die öffentlichen Seiten.
 *
 * KONFLIKT (bewusst nicht still aufgeloest, 08.11.2026):
 *  - Gesamtbeschreibung §6 nennt "Canonical auf nexifyai.cloud", §4 fuehrt .cloud als Hauptdomain.
 *  - Repo-Contract-Test apps/site/tests/seo-sitemap.test.mjs fordert "https://www.nexifyai.de".
 *  - Messung 08.11.2026: https://nexifyai.cloud -> HTTP 308 (kein Live-Content),
 *    https://www.nexifyai.de -> HTTP 200 (Live-SEO-/Shop-Laufzeit); deployment-topology.json
 *    fuehrt fuer .cloud `live_deployment_verified: false`.
 * Entscheidung dieser Umsetzung: Canonical folgt der VERIFIZIERT live ausgelieferten Domain
 * (www.nexifyai.de). Die Domainrolle .cloud vs .de bleibt offene Entscheidung (Baseline E-04/AB-11).
 *
 * Bewusst EINE Konstante: kein verstreutes Hardcodieren von Hosts. Ändert sich
 * die Domainrolle, wird sie hier geändert und in robots.txt/sitemap.xml
 * nachgezogen. Ein Sprachpfad (hreflang) existiert nicht, weil die Sprache
 * clientseitig umgeschaltet wird — siehe Abweichungsregister D-SEO-04.
 */
export const CANONICAL_BASE = "https://www.nexifyai.de";
export const SITE_NAME = "NeXify AI";

/** Kanonische URL für einen öffentlichen Pfad (normalisiert, ohne Doppel-Slash). */
export function canonicalUrl(path: string): string {
  const clean = "/" + String(path || "/").split("#")[0].split("?")[0].replace(/^\/+/, "");
  return clean === "/" ? CANONICAL_BASE + "/" : CANONICAL_BASE + clean.replace(/\/+$/, "");
}

/**
 * Minimales, wahrheitsgemäßes Organisations-Markup (§6: strukturierte Daten als
 * ProfessionalService). Es werden NUR belegte Angaben ausgegeben: Name, URL,
 * Logo, Kurzbeschreibung. Keine Adresse, keine Rechtsform, keine Bewertung —
 * Rechtsform und Registerangaben sind laut §18.2 offen (Ebene D).
 */
export function organizationJsonLd(description: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE_NAME,
    url: CANONICAL_BASE + "/",
    logo: CANONICAL_BASE + "/signet.svg",
    description,
  } as const;
}

/** Next-Metadata fuer dedizierte Routen: Title, Description, Canonical in einem Schritt. */
export function pageMetadata(path: string, title: string, description: string) {
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(path) },
  };
}
