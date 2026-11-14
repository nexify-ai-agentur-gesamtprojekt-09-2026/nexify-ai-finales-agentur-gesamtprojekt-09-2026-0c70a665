"use client";
import type {Locale} from '../lib/i18n';
import {offlineCopy} from '../lib/offline-copy';
import {HeroStage} from './IdentityHero';
import {ActionButton,ActionLink} from './ActionControl';
import './HomeConcept.css';
import './PageConcept.css';

/**
 * Offline-Seite aus den Bausteinen der Startseite (HeroStage, ActionButton, ActionLink). Ohne Film und ohne Bild:
 * sie muss vollständig aus dem Speicher des Workers aufgebaut werden können (pwa/worker.js).
 * „Erneut versuchen" lädt die angefragte Adresse neu; der Worker liefert diese Seite unter der ursprünglichen Adresse aus.
 */
export default function OfflineNotice({locale}:{locale:Locale}){
 const t=offlineCopy[locale];
 return <div className="home-concept page-concept layout-document" data-testid="offline-page">
  <HeroStage headingId="offline-title" testIds={{headline:'offline-title',body:'offline-body'}} title={t.title} body={t.body}
   lead={<span className="hc-kicker">NeXify AI<span aria-hidden="true"> / </span>{t.kicker}</span>}
   actions={<>
    <ActionButton variant="primary" className="identity-primary-link" onClick={()=>window.location.reload()} data-testid="offline-retry"><span>{t.retry}</span><span aria-hidden="true" className="identity-primary-arrow">→</span></ActionButton>
    <ActionLink variant="secondary" className="identity-secondary-link" href="/" data-testid="offline-home">{t.home}</ActionLink>
   </>}/>
 </div>;
}
