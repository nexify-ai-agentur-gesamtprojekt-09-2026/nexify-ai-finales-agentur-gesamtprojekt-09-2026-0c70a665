"use client";
import {useEffect} from 'react';
import {HcArrow} from '../components/HcArrow';
import {SiteLink} from '../components/Router';
import {useUI} from '../components/Workspace';
import {captureBoundaryException} from '../observability/exceptions.mjs';
import {errorCopy} from '../lib/error-copy';
import '../components/HomeConcept.css';
import '../components/PageConcept.css';

/**
 * Störung beim Aufbau einer Seite. Kopfleiste, Fußbereich und Gespräch bleiben stehen (Wurzel-Layout);
 * nur der Inhalt wird ersetzt. Gleiche Bausteine wie die Seite „nicht gefunden".
 * Fehlertext und Kennung werden nicht angezeigt.
 */
export default function PageError({error,retry}:{error:unknown;retry:()=>void}){
 const {locale}=useUI(),t=errorCopy[locale];
 useEffect(()=>{if(error instanceof Error)captureBoundaryException(error);},[error]);
 return <div className="home-concept page-concept layout-document" data-testid="public-page-error">
  <section className="hc-container" aria-labelledby="page-error-title">
   <header className="pc-hero is-text-only">
    <div className="pc-hero-copy" role="alert">
     <span className="hc-kicker">NeXify AI FACTORY<span aria-hidden="true"> / </span>{t.kicker}</span>
     <h1 id="page-error-title">{t.title}</h1>
     <p className="pc-hero-lead">{t.lead} <a href="mailto:mail@nexifyai.cloud">mail@nexifyai.cloud</a></p>
     <div className="pc-hero-actions">
      <button type="button" className="hc-text-link is-primary" data-testid="page-error-retry" onClick={()=>retry()}>{t.retry}</button>
      <SiteLink className="hc-text-link" href="/kontakt" data-testid="page-error-contact">{t.contact}<HcArrow/></SiteLink>
     </div>
    </div>
   </header>
  </section>
 </div>;
}
