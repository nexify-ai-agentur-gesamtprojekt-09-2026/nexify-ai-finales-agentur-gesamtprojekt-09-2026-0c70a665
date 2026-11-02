"use client";
import type {Locale} from "../lib/i18n";
import "./PageMediaBand.css";

// Hero scene for key content pages: the APPROVED trio stills (Pascal, NeX, AIFly ORACLE) shown COMPLETE
// via object-fit:contain beside the hero copy — responsive two-column like Home, no crop, no text over
// the figures, no new illustration, no generative edit. Uses the released Zielbild single-figure assets
// (correct identity: green AIFly ORACLE with hat + monocle), NOT the legacy hero-trio.png composite that
// still carried the old grey spherical AI Fly figure. Originals unchanged.
const FIGURES = {
  nex: "/media/presenters/zielbild-nex-walk.png",
  pascal: "/media/presenters/zielbild-pascal-walk.png",
  oracle: "/media/presenters/zielbild-aifly-float.png",
} as const;

const alt: Record<string, Record<Locale, string>> = {
  "apps-portals": {
    de: "Pascal, NeX und AIFly ORACLE vor der NeXify-Markenbühne",
    nl: "Pascal, NeX en AIFly ORACLE voor het NeXify-merkpodium",
    fr: "Pascal, NeX et AIFly ORACLE devant la scène de marque NeXify",
    en:"Pascal, NeX and AIFly ORACLE in front of the NeXify brand stage",
  },
  "tk-home": {
    de: "Pascal, NeX und AIFly ORACLE begleiten den TEILEKLAR-Einstieg",
    nl: "Pascal, NeX en AIFly ORACLE begeleiden de TEILEKLAR-ingang",
    fr: "Pascal, NeX et AIFly ORACLE accompagnent l’accès TEILEKLAR",
    en:"Pascal, NeX and AIFly ORACLE accompany the TEILEKLAR entry",
  },
};

export default function PageMediaBand({pageId, context, locale}: {pageId: string; context: string; locale: Locale}) {
  const label = alt[pageId];
  if (!label) return null;
  const themeClass = context === "teileklar" ? "band-teileklar" : "band-nexify";
  return (
    <div className={"page-media-scene " + themeClass} data-testid={"page-media-band-" + pageId}>
      <div className="scene-figure-row">
        <img className="scene-figure scene-figure-nex" src={FIGURES.nex} alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <img className="scene-figure scene-figure-pascal" src={FIGURES.pascal} alt={label[locale]} loading="lazy" decoding="async" />
        <img className="scene-figure scene-figure-oracle" src={FIGURES.oracle} alt="" aria-hidden="true" loading="lazy" decoding="async" />
      </div>
    </div>
  );
}
