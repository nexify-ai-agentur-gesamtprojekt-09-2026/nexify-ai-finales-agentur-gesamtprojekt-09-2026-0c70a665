"use client";
import {useUI} from './Workspace';
import {SiteLink} from './Router';
import type {PublicPage} from '../lib/page-types';
import './Services.css';

type Loc = 'de' | 'nl' | 'fr' | 'en';

const HERO: Record<Loc, {eyebrow: string; h1: string; sub: string; lead: string; cta: string; cta2: string; badge: string; detailEyebrow: string}> = {
  de: {
    eyebrow: 'Leistungen',
    h1: 'Drei Wege. Ein zusammenhängender Auftritt.',
    sub: 'Marke & Web, Systeme & KI, Sichtbarkeit & Wachstum – als ein System für Ihr Unternehmen.',
    lead: 'Wählen Sie den passenden Weg – persönlich begleitet von Pascal Courbois, ab 449 € netto je Projekttag.',
    cta: 'Vorhaben beschreiben',
    cta2: 'Die Wege im Detail',
    badge: 'Live · Oracle bereit',
    detailEyebrow: 'Im Detail',
  },
  nl: {
    eyebrow: 'Diensten',
    h1: 'Drie wegen. Eén samenhangende presentatie.',
    sub: 'Merk & web, systemen & AI, zichtbaarheid & groei – als één systeem voor uw onderneming.',
    lead: 'Kies de passende weg – persoonlijk begeleid door Pascal Courbois, vanaf 449 € netto per projectdag.',
    cta: 'Plan beschrijven',
    cta2: 'De wegen in detail',
    badge: 'Live · Oracle gereed',
    detailEyebrow: 'In detail',
  },
  fr: {
    eyebrow: 'Prestations',
    h1: 'Trois voies. Une présence cohérente.',
    sub: 'Marque & web, systèmes & IA, visibilité & croissance – comme un seul système pour votre entreprise.',
    lead: 'Choisissez la voie adaptée – accompagnement personnel de Pascal Courbois, à partir de 449 € net par jour de projet.',
    cta: 'Décrire votre projet',
    cta2: 'Les voies en détail',
    badge: 'En direct · Oracle prêt',
    detailEyebrow: 'En détail',
  },
  en: {
    eyebrow: 'Services',
    h1: 'Three paths. One coherent presence.',
    sub: 'Brand & web, systems & AI, visibility & growth – as one system for your business.',
    lead: 'Choose the right path – personally guided by Pascal Courbois, from €449 net per project day.',
    cta: 'Describe your plan',
    cta2: 'The paths in detail',
    badge: 'Live · Oracle ready',
    detailEyebrow: 'In detail',
  },
};

export default function ServicesContent({page}: {page: PublicPage}) {
  const {locale} = useUI() as {locale: Loc};
  const t = HERO[locale] || HERO.de;
  const sections = page.sections;

  return (
    <div className="svc">
      <section className="svc-hero" aria-labelledby="svc-headline">
        <div className="svc-hero__col">
          <span className="svc-eyebrow">{t.eyebrow}</span>
          <h1 id="svc-headline" className="svc-h1">{t.h1}</h1>
          <p className="svc-sub">{t.sub}</p>
          <p className="svc-lead">{t.lead}</p>
          <div className="svc-ctarow">
            <SiteLink href="/kontakt" className="svc-cta">{t.cta}<span aria-hidden="true">→</span></SiteLink>
            <a href="#svc-detail" className="svc-cta svc-cta--ghost">{t.cta2}</a>
          </div>
        </div>
        <div className="svc-figwrap">
          <div className="svc-figwrap__glow" aria-hidden="true" />
          <figure className="svc-fig" role="img" aria-label="Pascal tritt aus dem NeXify Glasatelier hervor – mit NeX und Oracle">
            <div className="svc-fig__clip" aria-hidden="true">
              <img className="svc-fig__plate" src="/media/canvas/hero-plate.png" width={2592} height={1536} alt="NeXify AI Factory – Glasatelier mit NeX und Oracle" />
              <div className="svc-fig__shade" />
              <div className="svc-fig__sheen" />
            </div>
            <div className="svc-fig__edge" aria-hidden="true" />
            <img className="svc-fig__pascal" src="/media/canvas/hero-pascal.png" width={546} height={1465} alt="" aria-hidden="true" />
            <span className="svc-fig__badge" aria-hidden="true"><span className="svc-fig__dot" />{t.badge}</span>
          </figure>
        </div>
      </section>

      <section className="svc-detail" id="svc-detail" aria-label={t.detailEyebrow}>
        <div className="svc-head">
          <span className="svc-head__eyebrow">{t.detailEyebrow}</span>
        </div>
        {sections.map((s) => (
          <article className="svc-card" key={s.id}>
            <strong className="svc-card__title">{s.heading[locale]}</strong>
            <span className="svc-card__body">{s.body[locale]}</span>
          </article>
        ))}
      </section>
    </div>
  );
}
