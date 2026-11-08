"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import type {PublicVideo} from './PresenterVideo';
import {ActionLink} from './ActionControl';
import './IdentityHero.css';

// Hero uses a single Higgsfield studio photograph (Pascal with NeX and AIFly ORACLE)
// as the editorial still. No video is used on the hero.

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 const headings={de:['Gute Websites','beginnen','bei Ihnen.'],nl:['Goede websites','beginnen','bij u.'],fr:['Un bon site','commence','par vous.'],en:['Good websites','start','with you.']};
 const subtitles={de:'Ihr Unternehmen verdient einen Auftritt, der wirkt.',nl:'Uw onderneming verdient een uitstraling die werkt.',fr:'Votre entreprise mérite une présence qui fait la différence.',en:'Your business deserves a presence that makes an impact.'};
 return <section className="identity-hero" aria-labelledby="home-headline" data-testid="identity-hero" data-media-state="editorial-still" data-identity-layout="graphite-atelier">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline">{headings[locale].map((line,index)=><span key={line} className={index>0?"identity-title-accent":undefined}>{line}</span>)}</h1>
    <p className="identity-subtitle">{subtitles[locale]}</p>
    <p className="identity-body" data-testid="hero-description">{page.localizedSummary[locale]}</p>
    <div className="identity-links">
     <ActionLink variant="text" className="identity-primary-link" href="/leistungsumfang" data-testid="hero-project-link"><span>{t.cta}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink>
     <ActionLink variant="quiet" className="identity-secondary-link" href="/leistungen" data-testid="hero-services-link">{t.services}</ActionLink>
    </div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    <figure className="identity-hero-photo" role="img" aria-label={t.scene} data-testid="hero-photo">
     <img src="/media/higgsfield/hf-02-lobby-walk.webp" alt="Pascal mit NeX und AIFly ORACLE im NeXify Atelier" width={2000} height={1080} loading="eager" fetchPriority="high" decoding="async"/>
    </figure>
   </div>
  </div>
 </section>;
}
