'use client';
import type {PublicPage} from '../lib/page-types';
import {pageFaq} from '../lib/page-faq';
import {useUI} from './Workspace';
import {SiteLink} from './Router';
import {HcArrow,HcDisclosureIcon} from './HcArrow';
// Questions in the service accordion of the Startseite (hc-service-layout / hc-service-detail).
export const PageQuestions=({page}:{page:PublicPage})=>{
 const {locale}=useUI(); const rows=pageFaq(page,locale); if(!rows.length)return null;
 const text={de:['Klarheit vor dem ersten Schritt.','Acht Fragen zu Ihrem Vorhaben','Vorhaben beschreiben','Die Antworten beschreiben Umfang, Ablauf und Grenzen – damit Sie Ihr Vorhaben sicher einordnen können.'],nl:['Duidelijkheid vóór de eerste stap.','Acht vragen over uw project','Beschrijf uw project','De antwoorden beschrijven omvang, werkwijze en grenzen, zodat u uw project goed kunt inschatten.'],fr:['La clarté avant le premier pas.','Huit questions sur votre projet','Décrire votre projet','Les réponses décrivent le périmètre, le déroulement et les limites pour situer votre projet en confiance.'],en:['Clarity before the first step.','Eight questions about your project','Describe your project','The answers describe scope, process and limits so you can place your project with confidence.']}[locale];
 return <section className="hc-section hc-container hc-service-story" aria-labelledby="page-questions-title" data-testid="page-faq-accordion">
  <div className="hc-service-layout">
   <header className="hc-section-heading"><span className="hc-kicker" data-testid="page-faq-kicker">{text[1]}</span><h2 id="page-questions-title" data-testid="page-faq-title">{text[0]}</h2><p>{text[3]}</p><SiteLink href="/kontakt" className="hc-text-link" data-testid="page-faq-contact-link">{text[2]}<HcArrow/></SiteLink></header>
   <div className="hc-service-list">{rows.map((row,i)=><details className="hc-service-detail" key={i} open={i===0} data-testid={'page-faq-item-'+(i+1)}><summary data-testid={'page-faq-question-'+(i+1)}><span><strong className="hc-service-name">{row.question}</strong></span><HcDisclosureIcon/></summary><div className="hc-service-body"><p data-testid={'page-faq-answer-'+(i+1)}>{row.answer}</p></div></details>)}</div>
  </div>
 </section>;
};
