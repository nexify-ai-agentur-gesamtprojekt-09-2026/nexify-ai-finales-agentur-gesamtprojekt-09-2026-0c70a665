"use client";
import type {Locale} from "../lib/i18n";
import "./PageMediaBand.css";

// Hero scene for key content pages: the APPROVED trio still (Pascal, NeX, AI Fly Oracle) shown COMPLETE
// via object-fit:contain beside the hero copy — responsive two-column like Home, no crop, no text over
// the figures, no new illustration, no generative edit. Reuses the existing Zielbild asset only.
const HERO_TRIO = "/media/presenters/hero-trio.png";

const alt: Record<string, Record<Locale, string>> = {
  "apps-portals": {
    de: "Pascal, NeX und AI Fly Oracle vor der NeXify-Markenbühne",
    nl: "Pascal, NeX en AI Fly Oracle voor het NeXify-merkpodium",
    fr: "Pascal, NeX et AI Fly Oracle devant la scène de marque NeXify",
  },
  "tk-home": {
    de: "Pascal, NeX und AI Fly Oracle begleiten den TEILEKLAR-Einstieg",
    nl: "Pascal, NeX en AI Fly Oracle begeleiden de TEILEKLAR-ingang",
    fr: "Pascal, NeX et AI Fly Oracle accompagnent l’accès TEILEKLAR",
  },
};

export default function PageMediaBand({pageId, context, locale}: {pageId: string; context: string; locale: Locale}) {
  const label = alt[pageId];
  if (!label) return null;
  const themeClass = context === "teileklar" ? "band-teileklar" : "band-nexify";
  return (
    <div className={"page-media-scene " + themeClass} data-testid={"page-media-band-" + pageId}>
      <img className="scene-figure" src={HERO_TRIO} alt={label[locale]} loading="lazy" decoding="async" width={1536} height={1024} />
    </div>
  );
}
