import { organizationJsonLd } from "../lib/seo";

/** Strukturierte Daten fuer dedizierte Routen (nur belegte Felder, siehe lib/seo.ts). */
export default function SeoJsonLd({ description }: { description: string }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(description)) }}
    />
  );
}
