import Link from "next/link";
import Image from "next/image";
import SceneStage from "@/components/SceneStage";
import OffersAccordion from "@/components/OffersAccordion";
import { BOARD, PRODUCTS, STEPS, DAY_RATE } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="hero" id="top" style={{ paddingTop: 24 }}>
        <div className="hero-grid">
          <div style={{ animation: "hcRise .9s .05s both" }}>
            <p className="eyebrow">NeXify AI FACTORY · Agentur</p>
            <h1 style={{ marginTop: 16 }}>
              Ein Anspruch.<br /><span className="thin">Ein zusammenhängender</span> Auftritt.
            </h1>
            <p className="lead">
              Marke und Web, Systeme und KI, Sichtbarkeit und Wachstum – als ein System für Ihr
              Unternehmen. NeXify AI verbindet Markenstrategie, Gestaltung und Technik zu einem
              Vorhaben. Pascal Courbois begleitet es persönlich – kalkuliert ab {DAY_RATE} netto je
              Projekttag.
            </p>
            <div className="hero-cta">
              <Link href="/kontakt" className="btn btn-primary">Vorhaben beschreiben →</Link>
              <Link href="/leistungen" className="btn btn-ghost">Leistungen ansehen</Link>
            </div>
            <nav className="onpage" aria-label="Auf dieser Seite">
              <span className="eyebrow" style={{ width: "100%" }}>Auf dieser Seite</span>
              <Link href="#vorhaben">Ihr Vorhaben</Link>
              <Link href="/leistungen">Der passende Weg</Link>
              <Link href="/arbeitsweise">Arbeitsweise</Link>
              <Link href="/budget">Budget</Link>
              <Link href="/produkte">Produkte</Link>
            </nav>
          </div>
          <figure className="hero-figure" style={{ margin: 0 }}>
            <Image
              src="/media/hero-plate.png"
              alt="NeXify AI FACTORY – Pascal Courbois mit NeX und Oracle"
              fill
              priority
              sizes="(max-width: 1080px) 100vw, 60vw"
              style={{ objectFit: "cover" }}
            />
            <figcaption className="hero-badge"><i aria-hidden /> Live · Oracle bereit</figcaption>
          </figure>
        </div>
      </section>

      {/* VORHABEN */}
      <section id="vorhaben">
        <div className="sec-head">
          <p className="eyebrow">01 · Ihr Vorhaben zuerst</p>
          <h2>So entsteht Ihr Projekt</h2>
          <p className="lead">
            Bevor wir über Technik sprechen, schauen wir auf Ihr Vorhaben. Oracle, NeX und Pascal
            ordnen Ziel, Alltag und offene Fragen – Zugangsdaten brauchen Sie dafür nicht.
          </p>
        </div>
        <SceneStage scene="project" />
        <div className="grid grid-3" style={{ marginTop: 24 }}>
          {BOARD.map((b) => (
            <div className="card" key={b.k}>
              <p className="eyebrow" style={{ color: b.color }}>{b.k}</p>
              <p className="lead" style={{ marginTop: 10 }}>{b.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LEISTUNGEN */}
      <section id="leistungen">
        <div className="sec-head">
          <p className="eyebrow">02 · Der passende Weg</p>
          <h2>Drei klare Leistungsbereiche</h2>
          <p className="lead">
            Jeder Bereich ist ein eigener, nachvollziehbarer Baustein. Wir beginnen bewusst mit einem –
            erst wenn er zuverlässig läuft, planen wir den nächsten.
          </p>
        </div>
        <OffersAccordion />
      </section>

      {/* PRODUKTE */}
      <section id="produkte">
        <div className="sec-head">
          <p className="eyebrow">03 · Produktwelt</p>
          <h2>Produkte & Arbeitsbereiche</h2>
        </div>
        <div className="grid grid-2">
          {PRODUCTS.map((p) => (
            <div className="card tile" key={p.title}>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
              <Link href={p.href} className="tlink">{p.action} →</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ARBEITSWEISE preview */}
      <section id="arbeitsweise">
        <div className="sec-head">
          <p className="eyebrow">04 · Zusammenarbeit</p>
          <h2>So arbeiten wir zusammen</h2>
        </div>
        <div className="grid grid-4">
          {STEPS.map((s) => (
            <div className="card tile" key={s.num}>
              <p className="eyebrow">{s.num}</p>
              <h3 style={{ marginTop: 10 }}>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/kontakt" className="btn btn-primary">Projektgespräch anfragen →</Link>
        </div>
      </section>
    </>
  );
}
