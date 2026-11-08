"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import PresenterVideo,{type PublicVideo} from './PresenterVideo';
import AtelierFilm from './AtelierFilm';
import welcome from '../../../config/hero-film.json';
declare const __NEXIFY_OWNER_CINEMA_PREVIEW__:boolean;
const ownerCinemaPreview=typeof __NEXIFY_OWNER_CINEMA_PREVIEW__!=='undefined'&&__NEXIFY_OWNER_CINEMA_PREVIEW__;
import {ActionLink} from './ActionControl';
import artwork from '../../../config/presenter-artwork.json';
import './IdentityHero.css';

// Current company copy and owner-private editorial cinema.
// Native performance is edited with its corresponding audio; director acceptance remains separate.

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 const headings={de:['Ein Anspruch.','Ein zusammen\u00ADhängender','Auftritt.'],nl:['Eén aanspraak.','Eén samen\u00ADhangende','uitstraling.'],fr:['Une exigence.','Une présence','cohérente.'],en:['One standard.','One coherent','presence.']};
 const subtitles={de:'Marke und Web, Systeme und KI, Sichtbarkeit und Wachstum – als ein System für Ihr Unternehmen.',nl:'Merk en web, systemen en AI, zichtbaarheid en groei – als één systeem voor uw onderneming.',fr:'Marque et web, systèmes et IA, visibilité et croissance – un seul système pour votre entreprise.',en:'Brand and web, systems and AI, visibility and growth – as one system for your business.'};
 const actions={de:['Vorhaben beschreiben','So entsteht Ihr Projekt'],nl:['Plan beschrijven','Zo ontstaat uw project'],fr:['Décrire le projet','Comment naît votre projet'],en:['Describe your project','How your project takes shape']};
 const cinematic=(ownerCinemaPreview||welcome.production_accepted===true)&&!_video;
 return <section className={"identity-hero"+(cinematic?" identity-hero-cinema":"")} aria-labelledby="home-headline" data-testid="identity-hero" data-media-state={_video?"verified-public-film":cinematic?"owner-private-edited-video":"editorial-still"} data-identity-layout="graphite-atelier">
  <div className="identity-scene" data-testid="hero-grid">
   <div className="identity-copy" data-testid="hero-copy">
    <h1 id="home-headline" data-testid="hero-headline">{headings[locale].map((line,index)=><span key={line} className={index>0?"identity-title-accent":undefined}>{line}</span>)}</h1>
    <p className="identity-subtitle">{subtitles[locale]}</p>
    <p className="identity-body" data-testid="hero-description">{page.localizedSummary[locale]}</p>
    <div className="identity-links">
     <ActionLink variant="text" className="identity-primary-link" href="/leistungsumfang" data-testid="hero-project-link"><span>{actions[locale][0]}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionLink>
     <ActionLink variant="quiet" className="identity-secondary-link" href="#vorhaben" data-testid="hero-services-link">{actions[locale][1]}</ActionLink>
    </div>
   </div>
   <div className="identity-media" data-testid="hero-media">
    {_video?<PresenterVideo video={_video} locale={_video.locale} hero/>:cinematic?<AtelierFilm asset={{...welcome.film,title:t.scene}} locale={locale} hero/>:<figure className="identity-cast" role="img" aria-label={t.scene} data-testid="hero-trio-stage">
     <img className="cast-pascal" src={artwork.images.pascal.variants[1].src} srcSet={artwork.images.pascal.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes="(max-width: 900px) 66vw, 380px" alt="" width={artwork.images.pascal.width} height={artwork.images.pascal.height} loading="eager" fetchPriority="high" decoding="async"/>
     <img className="cast-nex" src={artwork.images.nex.variants[1].src} srcSet={artwork.images.nex.variants.map(v=>`${v.src} ${v.width}w`).join(', ')} sizes="(max-width: 900px) 46vw, 336px" alt="" width={artwork.images.nex.width} height={artwork.images.nex.height} loading="eager" decoding="async"/>
     <img className="cast-oracle" src={artwork.images.aifly.src} alt="" width={artwork.images.aifly.width} height={artwork.images.aifly.height} loading="eager" decoding="async"/>
    </figure>}
   </div>
  </div>
 </section>;
}
