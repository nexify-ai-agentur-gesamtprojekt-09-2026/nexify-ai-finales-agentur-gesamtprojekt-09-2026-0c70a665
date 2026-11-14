"use client";
import interfaceCopy from "../../../config/public-interface-copy.json";
const copy=interfaceCopy.hero;
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import type {PublicVideo} from './PresenterVideo';
import type {ReactNode} from 'react';
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

/**
 * Heldenbuehne der Startseite als Baustein fuer alle Seiten (Inhaberentscheidung 14.11.2026: die Startseite ist der Master,
 * Bestehendes wird wiederverwendet statt nachgebaut). Struktur, Klassen und damit saemtliche Stile von .identity-hero gelten
 * unveraendert fuer jede Seite, die diese Buehne nutzt.
 */
export function HeroStage({headingId,title,lead,subtitle,body,actions,media,testIds,attributes}:{headingId:string;title:ReactNode;lead?:ReactNode;subtitle?:ReactNode;body?:ReactNode;actions?:ReactNode;media?:ReactNode;testIds?:{root?:string;grid?:string;copy?:string;headline?:string;body?:string;media?:string};attributes?:Record<string,string>}){
 return <section className={"identity-hero"+(media?"":" is-text-only")} aria-labelledby={headingId} data-testid={testIds?.root} {...attributes}>
  <div className="identity-scene" data-testid={testIds?.grid}>
   <div className="identity-copy" data-testid={testIds?.copy}>
    {lead}
    <h1 id={headingId} data-testid={testIds?.headline}>{title}</h1>
    {subtitle!==undefined&&<p className="identity-subtitle">{subtitle}</p>}
    {body!==undefined&&<p className="identity-body" data-testid={testIds?.body}>{body}</p>}
    {actions&&<div className="identity-links">{actions}</div>}
   </div>
   {media&&<div className="identity-media" data-testid={testIds?.media}>{media}</div>}
  </div>
 </section>;
}

export default function IdentityHero({locale,page,video:_video}:{locale:Locale;page:PublicPage;video?:PublicVideo}){
 const t=copy[locale];
 void page;
 return <HeroStage headingId="home-headline" testIds={{root:"identity-hero",grid:"hero-grid",copy:"hero-copy",headline:"hero-headline",body:"hero-description",media:"hero-media"}}
  attributes={{"data-media-state":"editorial-video","data-identity-layout":"graphite-atelier"}}
  title={headings[locale].map((line,index)=><span key={line} className={index===headings[locale].length-1?"identity-title-accent":undefined}>{line}{index<headings[locale].length-1?' ':''}</span>)}
  subtitle={subtitles[locale]} body={bodies[locale]}
  actions={<ActionButton variant="primary" className="identity-primary-link" onClick={()=>window.dispatchEvent(new Event('nexify-open-orientation'))} aria-controls="aifly-panel" data-testid="hero-project-link"><span>{primaryCta[locale]}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionButton>}
  media={<figure className="identity-hero-photo" data-testid="hero-photo">
     <AtelierFilm hero locale={locale} asset={{src:'/media/scenes/eingangshalle-20261114.mp4',poster:brandImages.entrance.src,posterAlt:imageAlt(brandImages.entrance,locale),width:1280,height:720,title:t.scene,captions:'/media/scenes/eingangshalle-20261114.vtt',transcript:'Guten Tag, ich bin Pascal. Wir bauen Websites, Shops und KI-Lösungen in höchster Qualität und zu einem fairen Preis. Erzählen Sie mir, woran Sie gerade arbeiten.',hasAudio:true,autoplayWithAudio:true,playOnce:true}}/>
    </figure>}/>;
}
