"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import type {PublicVideo} from './PresenterVideo';
import {ActionButton} from './ActionControl';
import {brandImages,imageAlt} from '../lib/brand-media';
import AtelierFilm from './AtelierFilm';
import './IdentityHero.css';

// The approved brand photograph remains the poster and playback fallback.

const headings:Record<Locale,string[]>={
 de:['Ein Gespräch.','Ein Projekt,','das passt.'],
 nl:['Eén gesprek.','Een project','dat past.'],
 fr:['Une conversation.','Un projet','qui vous ressemble.'],
 en:['One conversation.','A project','that fits.'],
};
const subtitles:Record<Locale,string>={
 de:'Websites, Apps, Shops und KI – aus dem, was Ihr Unternehmen wirklich braucht.',
 nl:'Websites, apps, shops en AI – vanuit wat uw bedrijf echt nodig heeft.',
 fr:'Sites, applications, boutiques et IA – selon les besoins réels de votre entreprise.',
 en:'Websites, apps, shops and AI – shaped around what your business actually needs.',
};
const bodies:Record<Locale,string>={
 de:'Höchste Qualität zu einem fairen Preis. Pascal begleitet Ihr Projekt persönlich, vom ersten Gespräch bis zur Übergabe.',
 nl:'Topkwaliteit voor een eerlijke prijs. Pascal begeleidt uw project persoonlijk, van het eerste gesprek tot de oplevering.',
 fr:'La plus haute qualité à un prix juste. Pascal accompagne personnellement votre projet, du premier échange à la remise.',
 en:'The highest quality at a fair price. Pascal guides your project personally, from the first conversation to handover.',
};
const primaryCta:Record<Locale,string>={de:'Vorhaben schildern',nl:'Uw plan beschrijven',fr:'Décrire votre projet',en:'Describe your project'};

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 void page;
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state="editorial-video" data-identity-layout="graphite-atelier">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline">{headings[locale].map((line,index)=><span key={line} className={index===headings[locale].length-1?"identity-title-accent":undefined}>{line}{index<headings[locale].length-1?' ':''}</span>)}</h1>
    <p className="identity-subtitle">{subtitles[locale]}</p>
    <p className="identity-body" data-testid="hero-description">{bodies[locale]}</p>
    <div className="identity-links">
     <ActionButton variant="primary" className="identity-primary-link" onClick={()=>window.dispatchEvent(new Event('nexify-open-orientation'))} aria-controls="aifly-panel" data-testid="hero-project-link"><span>{primaryCta[locale]}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionButton>
    </div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    <figure className="identity-hero-photo" data-testid="hero-photo">
     <AtelierFilm hero locale={locale} asset={{src:'/media/scenes/eingangshalle-20261114.mp4',poster:brandImages.entrance.src,posterAlt:imageAlt(brandImages.entrance,locale),width:1280,height:720,title:t.scene,captions:'/media/scenes/eingangshalle-20261114.vtt',transcript:'Guten Tag, ich bin Pascal. Wir bauen Websites, Shops und KI-Lösungen in höchster Qualität und zu einem fairen Preis. Erzählen Sie mir, woran Sie gerade arbeiten.',hasAudio:true,autoplayWithAudio:true,playOnce:true}}/>
    </figure>
   </div>
  </div>
 </section>;
}
