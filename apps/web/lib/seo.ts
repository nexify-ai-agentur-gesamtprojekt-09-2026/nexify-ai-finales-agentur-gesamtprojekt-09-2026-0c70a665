/**
 * Kanonische SEO-Basis für die öffentlichen Seiten.
 *
 * Quelle: NeXify AI – Gesamtbeschreibung 08.11.2026 §6 („Canonical auf
 * nexifyai.cloud") und §4 (nexifyai.cloud = Hauptdomain, nexifyai.de =
 * SEO-/Shop-Laufzeit). Zusätzlich bestätigt durch config/deployment-topology.json
 * (`primary.domain = nexifyai.cloud`).
 *
 * Bewusst EINE Konstante: kein verstreutes Hardcodieren von Hosts. Ändert sich
 * die Domainrolle, wird sie hier geändert und in robots.txt/sitemap.xml
 * nachgezogen. Ein Sprachpfad (hreflang) existiert nicht, weil die Sprache
 * clientseitig umgeschaltet wird — siehe Abweichungsregister D-SEO-04.
 */
export const CANONICAL_BASE = "https://nexifyai.cloud";
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
