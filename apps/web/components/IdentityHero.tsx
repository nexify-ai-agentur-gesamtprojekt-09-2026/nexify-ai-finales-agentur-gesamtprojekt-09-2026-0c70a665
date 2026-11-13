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
 de:'Pascal begleitet Ihr Projekt persönlich. Oracle hilft Ihnen, die Idee jetzt zu ordnen und den nächsten Schritt vorzubereiten.',
 nl:'Pascal begeleidt uw project persoonlijk. Oracle helpt u uw idee te ordenen en de volgende stap voor te bereiden.',
 fr:'Pascal accompagne personnellement votre projet. Oracle vous aide à structurer votre idée et à préparer la prochaine étape.',
 en:'Pascal guides your project personally. Oracle helps you shape your idea and prepare the next step.',
};
const primaryCta:Record<Locale,string>={de:'Mit Oracle beginnen',nl:'Begin met Oracle',fr:'Commencer avec Oracle',en:'Start with Oracle'};

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
     <AtelierFilm hero locale={locale} asset={{src:'/media/scenes/eingangshalle-20261113.mp4',poster:brandImages.entrance.src,posterAlt:imageAlt(brandImages.entrance,locale),width:1280,height:720,title:t.scene,hasAudio:true,autoplayWithAudio:true,playOnce:true}}/>
    </figure>
   </div>
  </div>
 </section>;
}
