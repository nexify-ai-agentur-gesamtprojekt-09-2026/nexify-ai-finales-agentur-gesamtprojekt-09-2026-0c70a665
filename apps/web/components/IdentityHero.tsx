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
// The edited portrait montage is not a speaking or lip-synchronised performance.

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 const headings={de:['Gute Websites','beginnen','bei Ihnen.'],nl:['Goede websites','beginnen','bij u.'],fr:['Un bon site','commence','par vous.'],en:['Good websites','start','with you.']};
 const subtitles={de:'Ihr Unternehmen verdient einen Auftritt, der wirkt.',nl:'Uw onderneming verdient een uitstraling die werkt.',fr:'Votre entreprise mérite une présence qui fait la différence.',en:'Your business deserves a presence that makes an impact.'};
 const cinematic=ownerCinemaPreview&&!_video;
 return <section className={"identity-hero"+(cinematic?" identity-hero-cinema":"")} aria-labelledby="home-headline" data-testid="identity-hero" data-media-state={_video?"verified-public-film":cinematic?"owner-private-edited-video":"editorial-still"} data-identity-layout="graphite-atelier">
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
    {_video?<PresenterVideo video={_video} locale={_video.locale} hero/>:cinematic?<AtelierFilm asset={{...welcome.film,title:t.scene}} locale={locale} hero/>:<figure className="identity-cast" role="img" aria-label={t.scene} data-testid="hero-trio-stage">
     <img className="cast-pascal" src={artwork.images.pascal.src} alt="" width={artwork.images.pascal.width} height={artwork.images.pascal.height} loading="eager" fetchPriority="high" decoding="async"/>
     <img className="cast-nex" src={artwork.images.nex.src} alt="" width={artwork.images.nex.width} height={artwork.images.nex.height} loading="eager" decoding="async"/>
     <img className="cast-oracle" src={artwork.images.aifly.src} alt="" width={artwork.images.aifly.width} height={artwork.images.aifly.height} loading="eager" decoding="async"/>
    </figure>}
   </div>
  </div>
 </section>;
}
