// FILE: apps/web/app/agb/page.tsx
// CREATED: 14.11.2026 08:42 (Europe/Berlin) — B-059: /agb war auf beiden Artefakten 404.
// Quelle des Textes: kanonisch apps/website/lib/legal/de.ts (legalDe.agb), unveraendert als JSON uebernommen.
// Dedizierte Route statt [...slug], weil die Seite nicht im generierten public-site.json steht.
import type {Metadata} from 'next';
import Link from 'next/link';
import {HcArrow} from '../../components/HcArrow';
import '../../components/HomeConcept.css';
import '../../components/PageConcept.css';
import agb from '../../lib/legal/agb.json';
import {PUBLIC_ORIGIN} from '../../lib/page-seo';
import {pageRobots} from '../../auth/page-robots';

type Subsection = {id?: string; heading: string; paragraphs?: string[]; bullets?: string[]};
type Section = Subsection & {subsections?: Subsection[]};

const doc = agb as {slug: string; title: string; intro: string; updated: string; sections: Section[]};

// Meta `robots` folgt derselben Regel wie die Kopfzeile X-Robots-Tag (auth/indexing.ts über auth/page-robots.ts), OA-164.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${doc.title} · NeXify AI`,
    description: doc.intro.slice(0, 180),
    alternates: {canonical: PUBLIC_ORIGIN+'/agb'},
    robots: await pageRobots('/agb'),
  };
}

function Blocks({node}: {node: Subsection}) {
  return (
    <>
      {node.paragraphs?.map(text => <p key={text}>{text}</p>)}
      {node.bullets?.length ? <ul>{node.bullets.map(text => <li key={text}>{text}</li>)}</ul> : null}
    </>
  );
}

export default function AgbPage() {
  return (
    <div className="home-concept page-concept layout-document" data-testid="public-page-agb">
      <section className="hc-container" aria-labelledby="agb-title">
        <header className="pc-hero is-text-only">
          <div className="pc-hero-copy">
            <span className="hc-kicker">NEXIFY AI<span aria-hidden="true"> / </span>Rechtliches</span>
            <h1 id="agb-title">{doc.title}</h1>
            <p className="pc-hero-lead">{doc.intro}</p>
            <p className="pc-hero-lead">Stand: {doc.updated}</p>
          </div>
        </header>
        <article>
          {doc.sections.map(section => (
            <section key={section.id ?? section.heading} id={section.id}>
              <h2>{section.heading}</h2>
              <Blocks node={section} />
              {section.subsections?.map(sub => (
                <div key={sub.id ?? sub.heading} id={sub.id}>
                  <h3>{sub.heading}</h3>
                  <Blocks node={sub} />
                </div>
              ))}
            </section>
          ))}
        </article>
        <footer className="pc-hero-actions">
          <Link className="hc-text-link is-primary" href="/impressum">Impressum<HcArrow/></Link>
          <Link className="hc-text-link" href="/datenschutz">Datenschutz<HcArrow/></Link>
          <Link className="hc-text-link" href="/kontakt">Kontakt aufnehmen<HcArrow/></Link>
        </footer>
      </section>
    </div>
  );
}
