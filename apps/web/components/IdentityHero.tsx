"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import type {PublicVideo} from './PresenterVideo';
import {ActionLink} from './ActionControl';
import {brandImages} from '../lib/brand-media';
import AtelierFilm from './AtelierFilm';
import './IdentityHero.css';

// The approved brand photograph remains the poster and playback fallback.

const headings:Record<Locale,string[]>={
 de:['Ein Anspruch.','Ein zusammenhängender','Auftritt.'],
 nl:['Eén aanspraak.','Eén samenhangende','uitstraling.'],
 fr:['Une exigence.','Une présence','cohérente.'],
 en:['One standard.','One coherent','presence.'],
};
const subtitles:Record<Locale,string>={
 de:'Marke, Website, Systeme und KI – aus einem Konzept, von einem Ansprechpartner.',
 nl:'Merk, website, systemen en AI – vanuit één concept, met één aanspreekpunt.',
 fr:'Marque, site, systèmes et IA – à partir d’un concept, avec un seul interlocuteur.',
 en:'Brand, website, systems and AI – from one concept, with one point of contact.',
};
const bodies:Record<Locale,string>={
 de:'Pascal Courbois entwickelt mit Ihnen Sprache, Design und digitale Abläufe als ein zusammenhängendes System – persönlich geführt, hochwertig umgesetzt und transparent ab 449 € netto je Projekttag.',
 nl:'Pascal Courbois ontwikkelt met u taal, design en digitale processen als één samenhangend systeem – persoonlijk begeleid, hoogwaardig uitgevoerd en transparant vanaf € 449 netto per projectdag.',
 fr:'Pascal Courbois développe avec vous le langage, le design et les processus numériques comme un système cohérent – suivi personnel, exécution haut de gamme et transparence à partir de 449 € HT par journée de projet.',
 en:'Pascal Courbois develops your language, design and digital workflows as one coherent system – personally led, crafted to a high standard and transparent from €449 net per project day.',
};
const primaryCta:Record<Locale,string>={de:'Vorhaben beschreiben',nl:'Uw plan beschrijven',fr:'Décrire votre projet',en:'Describe your project'};
const secondaryCta:Record<Locale,string>={de:'Leistungen ansehen',nl:'Diensten bekijken',fr:'Voir les prestations',en:'View services'};

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 void page;
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state="editorial-video" data-identity-layout="graphite-atelier">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline">{headings[locale].map((line,index)=><span key={line} className={index>1?"identity-title-accent":index===1?'identity-title-long':undefined}>{line}{index<headings[locale].length-1?' ':''}</span>)}</h1>
    <p className="identity-subtitle">{subtitles[locale]}</p>
    <p className="identity-body" data-testid="hero-description">{bodies[locale]}</p>
    <div className="identity-links">
     <ActionLink variant="primary" className="identity-primary-link" href="/kontakt" data-testid="hero-project-link"><span>{primaryCta[locale]}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink>
     <ActionLink variant="secondary" className="identity-secondary-link" href="/leistungen" data-testid="hero-services-link">{secondaryCta[locale]}</ActionLink>
    </div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    <figure className="identity-hero-photo" aria-label={t.scene} data-testid="hero-photo">
     <AtelierFilm hero locale={locale} asset={{src:'/media/home-review/pascal-studio-scene-original-20261109.mp4',poster:brandImages.home.src,width:1280,height:720,title:t.scene,hasAudio:true,autoplayWithAudio:true,playOnce:true}}/>
     <figcaption className="identity-hero-video-note">{locale==='de'?'KI-generierte Markenszene':locale==='nl'?'AI-gegenereerde merkscène':locale==='fr'?'Scène de marque générée par IA':'AI-generated brand scene'}</figcaption>
    </figure>
   </div>
  </div>
 </section>;
}
