"use client";
import {type ReactNode} from 'react';
import {useUI} from './Workspace';
import {SiteLink} from './Router';
import {ActionButton} from './ActionControl';
import type {PublicPage} from '../lib/page-types';
import type {PublicVideo} from './PresenterVideo';
import IdentityHero from './IdentityHero';
import copy from '../../../config/home-concept-copy.json';
import {brandImages,pageImage,imageAlt,srcSetFor} from '../lib/brand-media';
import './HomeConcept.css';
import HomeEffects from './HomeEffects';

// Home previews and their detail pages share one verified image assignment.
const galleryArt=[brandImages.design,brandImages.automation,brandImages.logistics];
const productArt=['nex2fly','one','api','tk-home'].map(id=>pageImage(id)!);
const galleries=['/leistungen/websites','/leistungen/agenten-automatisierung','/teileklar'];
const services=['/leistungen/websites','/leistungen/agenten-automatisierung','/loesungen'];
const products=['/produkte/nex2fly','/produkte/one','/produkte/api','/teileklar'];
const projectRates={
 de:{eyebrow:'Klare Kalkulationsbasis',value:'Individuell',unit:'nach vereinbartem Umfang',note:'Konzept, Text, Design und technische Umsetzung werden nach dem vereinbarten Umfang geplant. Externe Kosten weisen wir separat aus.'},
 nl:{eyebrow:'Duidelijke calculatiebasis',value:'Op maat',unit:'volgens afgesproken omvang',note:'Concept, tekst, ontwerp en technische uitvoering worden gepland op basis van de afgesproken omvang. Externe kosten worden apart vermeld.'},
 fr:{eyebrow:'Une base de calcul claire',value:'Sur mesure',unit:'selon le périmètre convenu',note:'Concept, contenus, design et réalisation technique sont planifiés selon le périmètre convenu. Les frais externes sont indiqués séparément.'},
 en:{eyebrow:'A clear pricing basis',value:'Tailored',unit:'to the agreed scope',note:'Concept, copy, design and technical delivery are planned around the agreed scope. External costs are shown separately.'}
} as const;
function DetailArrow({direction='right'}:{direction?:'right'|'out'|'down'}){
 const path=direction==='out'?'M5 19 19 5M5 5h14v14':direction==='down'?'M12 4v16M5 13l7 7 7-7':'M4 12h16M13 5l7 7-7 7';
 return <svg className="hc-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path}/></svg>;
}

/** The approved brand scenes illustrate possible starting points, not completed client work. */
export default function HomeContent({home,video,moduleVideos,children,pages}:{home:PublicPage;pages?:PublicPage[];children?:ReactNode;video?:PublicVideo;moduleVideos?:Record<string,Partial<Record<PublicVideo['locale'],PublicVideo>>>}){
 const {locale}=useUI(),t=copy[locale];
 void moduleVideos;void children;void pages;
 return <div className="home-concept" data-testid="home-content">
  <HomeEffects/>
  <IdentityHero locale={locale} page={home} video={video}/>
  <nav className="hc-anchors hc-container" aria-label={t.introKicker}>{t.anchor.map((label,i)=><a key={label} href={['#leistungen','#zusammenarbeit','#budget','#produktwelt'][i]}>{label}<DetailArrow direction="down"/></a>)}</nav>
  <section className="hc-intro hc-container" aria-labelledby="hc-intro-title">
   <div><span className="hc-kicker">{t.introKicker}</span><h2 id="hc-intro-title">{t.introTitle}</h2></div><p>{t.introBody}</p>
  </section>
  <nav className="hc-gallery hc-container" aria-label={t.introTitle}>
   {t.galleryTitles.map((title,i)=><SiteLink className="hc-gallery-card" href={galleries[i]} key={title} data-testid={`home-still-${i}`}>
    <figure className={`hc-art hc-art-${i}`}><img src={galleryArt[i].src} srcSet={srcSetFor(galleryArt[i].src)} sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 33vw" width="2000" height="1125" alt={imageAlt(galleryArt[i],locale)} loading="lazy" decoding="async"/></figure>
    <span className="hc-scene-context">{t.galleryContexts[i]}</span><h3>{title}<DetailArrow direction="out"/></h3><p>{t.galleryBodies[i]}</p><small className="hc-scene-value">{t.galleryValues[i]}</small><span className="hc-text-link">{t.galleryLinks[i]}<DetailArrow/></span>
   </SiteLink>)}
  </nav>
  <section id="leistungen" className="hc-section hc-container hc-service-story" aria-labelledby="hc-services-title">
   <div className="hc-service-layout"><header className="hc-section-heading"><span className="hc-kicker">{t.serviceKicker}</span><h2 id="hc-services-title">{t.serviceTitle}</h2><p>{t.serviceBody}</p><SiteLink href="/kontakt" className="hc-text-link">{t.offerCta}<DetailArrow/></SiteLink><figure className="hc-plate hc-plate-services"><img src={brandImages.atelier.src} srcSet={srcSetFor(brandImages.atelier.src)} sizes="(max-width: 820px) 100vw, 40vw" width="2000" height="1125" alt={imageAlt(brandImages.atelier,locale)} loading="lazy" decoding="async"/></figure></header>
   <div className="hc-service-list">{t.offers.map(([title,lead,...rest],i)=><details className="hc-service-detail" key={title} open={i===0}>
    <summary><span><strong className="hc-service-name">{title}</strong><span className="hc-service-lead">{lead}</span></span><svg className="hc-disclosure-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14m-7-7v14"/></svg></summary>
    <div className="hc-service-body"><ul>{rest.slice(0,3).map(item=><li key={item}>{item}</li>)}</ul><p className="hc-caption">{rest[3]}</p><SiteLink href={services[i]} className="hc-text-link">{t.serviceLink}<DetailArrow/></SiteLink></div>
   </details>)}</div></div>
  </section>
  <section id="zusammenarbeit" className="hc-section hc-process hc-container" aria-labelledby="hc-process-title">
   <header className="hc-section-heading"><div><span className="hc-kicker">{t.processKicker}</span><h2 id="hc-process-title">{t.processTitle}</h2></div><p>{t.processBody}</p></header>
   <figure className="hc-plate hc-plate-process"><img src={brandImages.welcome.src} srcSet={srcSetFor(brandImages.welcome.src)} sizes="(max-width: 820px) 100vw, 80vw" width="2000" height="1125" alt={imageAlt(brandImages.welcome,locale)} loading="lazy" decoding="async"/></figure>
   <ol>{t.steps.map(([title,body])=><li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ol>
  </section>
  <section id="produktwelt" className="hc-section hc-container hc-product-story" aria-labelledby="hc-products-title">
   <header className="hc-section-heading"><div><span className="hc-kicker">{t.productsKicker}</span><h2 id="hc-products-title">{t.productsTitle}</h2></div><p>{t.productsBody}</p></header>
   <div className="hc-products">{t.products.map(([title,body,action],i)=><SiteLink className="hc-product" key={title} href={products[i]}><figure className="hc-product-art"><img src={productArt[i].src} srcSet={srcSetFor(productArt[i].src)} sizes="(max-width: 900px) 100vw, 50vw" width="2000" height="1125" alt={imageAlt(productArt[i],locale)} loading="lazy" decoding="async"/></figure><div><h3>{title}</h3><p>{body}</p><span className="hc-text-link">{action}<DetailArrow/></span></div></SiteLink>)}</div>
  </section>
  <section id="budget" className="hc-section hc-budget hc-container" aria-labelledby="hc-budget-title">
   <div className="hc-budget-story"><header className="hc-section-heading"><span className="hc-kicker">{t.budgetKicker}</span><h2 id="hc-budget-title">{t.budgetTitle}</h2><p>{t.budgetBody}</p><div className="hc-rate" aria-label={`${projectRates[locale].value} ${projectRates[locale].unit}`}><span>{projectRates[locale].eyebrow}</span><strong>{projectRates[locale].value}</strong><small>{projectRates[locale].unit}</small><p>{projectRates[locale].note}</p></div><SiteLink href="/preise-ablauf" className="hc-text-link">{t.budgetLink}<DetailArrow/></SiteLink></header>
   <div className="hc-costs">{t.costs.map(([title,body])=><div key={title}><h3>{title}</h3><p>{body}</p></div>)}</div></div>
  </section>
  <section className="hc-section hc-finish hc-container" aria-labelledby="hc-finish-title">
   <div className="hc-finish-heading"><span className="hc-kicker">{t.finishKicker}</span><h2 id="hc-finish-title">{t.finishTitle}</h2></div>
   <div className="hc-finish-next"><p>{t.finishBody}</p>
    <div className="hc-finish-actions"><ActionButton variant="primary" className="hc-finish-primary" onClick={()=>window.dispatchEvent(new Event('nexify-open-orientation'))} aria-controls="aifly-panel" data-testid="finish-project-action">{t.finishCta}<DetailArrow/></ActionButton></div><small>{t.finishNote}</small>
   </div>
  </section>
 </div>;
}
