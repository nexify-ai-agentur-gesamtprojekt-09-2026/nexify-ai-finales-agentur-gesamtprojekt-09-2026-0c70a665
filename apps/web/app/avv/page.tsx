// FILE: apps/web/app/avv/page.tsx
// CREATED: 14.11.2026 11:47 (Europe/Berlin) — B-059: /avv war auf der eigenen Linie 404.
// Quelle des Textes: kanonisch apps/website/lib/legal/de.ts (legalDe.avv), unveraendert als JSON uebernommen.
// Dedizierte Route statt [...slug], weil die Seite nicht im generierten public-site.json steht.
import type {Metadata} from 'next';
import Link from 'next/link';
import {HcArrow} from '../../components/HcArrow';
import '../../components/HomeConcept.css';
import '../../components/PageConcept.css';
import avv from '../../lib/legal/avv.json';
import {PUBLIC_ORIGIN} from '../../lib/page-seo';

type Subsection = {id?: string; heading: string; paragraphs?: string[]; bullets?: string[]};
type Section = Subsection & {subsections?: Subsection[]};
type Related = {label: string; href: string};

const doc = avv as {slug: string; title: string; intro: string; updated: string; related?: Related[]; sections: Section[]};

export const metadata: Metadata = {
  title: `${doc.title} · NeXify AI`,
  description: doc.intro.slice(0, 180),
  alternates: {canonical: PUBLIC_ORIGIN+'/avv'},
  robots: {index: true, follow: true},
};

function Blocks({node}: {node: Subsection}) {
  return (
    <>
      {node.paragraphs?.map(text => <p key={text}>{text}</p>)}
      {node.bullets?.length ? <ul>{node.bullets.map(text => <li key={text}>{text}</li>)}</ul> : null}
    </>
  );
}

export default function AvvPage() {
  return (
    <div className="home-concept page-concept layout-document" data-testid="public-page-avv">
      <section className="hc-container" aria-labelledby="avv-title">
        <header className="pc-hero is-text-only">
          <div className="pc-hero-copy">
            <span className="hc-kicker">NEXIFY AI<span aria-hidden="true"> / </span>Rechtliches</span>
            <h1 id="avv-title">{doc.title}</h1>
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
          {(doc.related ?? []).map(link => (
            <Link key={link.href} className="hc-text-link" href={link.href}>{link.label}<HcArrow/></Link>
          ))}
        </footer>
      </section>
    </div>
  );
}
