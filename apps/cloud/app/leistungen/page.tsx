import type { Metadata } from "next";
import Image from "next/image";
import SceneStage from "@/components/SceneStage";
import OffersAccordion from "@/components/OffersAccordion";

export const metadata: Metadata = { title: "Leistungen" };

export default function LeistungenPage() {
  return (
    <>
      <section id="top" style={{ paddingTop: 24 }}>
        <div className="sec-head">
          <p className="eyebrow">Leistungen</p>
          <h2>Der passende Weg für Ihr Vorhaben</h2>
          <p className="lead">
            Website und Marke, Systeme und KI, Sichtbarkeit und Kampagne. Jeder Bereich ist ein
            eigener, klar beschriebener Baustein. Wählen Sie den Einstieg, der zu Ihrem Vorhaben passt –
            bei Unsicherheit ordnen wir gemeinsam ein.
          </p>
        </div>
        <SceneStage scene="choice" />
      </section>

      <section id="leistungen-detail">
        <div className="sec-head">
          <p className="eyebrow">Umfang & Inhalte</p>
          <h2>Was in jedem Bereich steckt</h2>
        </div>
        <OffersAccordion />
      </section>

      <section>
        <figure className="hero-figure" style={{ margin: 0, aspectRatio: "16 / 8" }}>
          <Image src="/media/leistungen-detail.png" alt="NeXify Atelier – Gestaltung, Muster und Umsetzung" fill sizes="100vw" style={{ objectFit: "cover" }} />
        </figure>
      </section>
    </>
  );
}
