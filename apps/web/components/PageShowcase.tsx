'use client';
import {SiteLink} from './Router';
import {useUI} from './Workspace';
import {pageImage,imageAlt} from '../lib/brand-media';
import type {PublicPage} from '../lib/page-types';
import {HcArrow} from './HcArrow';
// Preview gallery of the Startseite (hc-gallery): approved Higgsfield stills only.
const collections:Record<string,string[]>={services:['websites','automation','apps-portals'],scope:['websites','automation','apps-portals'],company:['services','knowledge','contact'],knowledge:['knowledge-start','services','contact'],pricing:['scope','services','contact'],solutions:['nex2fly','one','api']};
export const PageShowcase=({page,pages}:{page:PublicPage;pages:PublicPage[]})=>{
 const{locale}=useUI();const ids=collections[page.id];if(!ids)return null;
 const text={de:['Ihr nächster Schritt','Der passende Einstieg.','Wählen Sie den Bereich, der zu Ihrem Vorhaben passt. Umfang, Ablauf und nächste Schritte finden Sie auf der jeweiligen Seite.','Mehr erfahren'],nl:['Uw volgende stap','Een passend begin.','Kies het gebied dat past bij uw project. De bijbehorende pagina geeft scope, werkwijze en volgende stappen.','Meer informatie'],fr:['Votre prochaine étape','Le bon point de départ.','Choisissez le domaine adapté à votre projet. La page correspondante présente périmètre, déroulement et prochaines étapes.','En savoir plus'],en:['Your next step','The right place to start.','Choose the area that fits your project. Each page explains the scope, process and next steps.','Explore']}[locale];
 const items=ids.map(id=>pages.find(p=>p.id===id)).filter((item):item is PublicPage=>Boolean(item&&pageImage(item.id)));
 if(!items.length)return null;
 return <section className="hc-section hc-container hc-product-story" aria-labelledby="page-showcase-title" data-testid="page-showcase">
  <header className="hc-section-heading"><div><span className="hc-kicker">{text[0]}</span><h2 id="page-showcase-title">{text[1]}</h2></div><p>{text[2]}</p></header>
  <nav className="hc-gallery" aria-label={text[1]}>{items.map(item=>{const image=pageImage(item.id)!;return <SiteLink className="hc-gallery-card" key={item.id} href={item.path} data-testid={'showcase-link-'+item.id}><figure className="hc-art"><img src={image.src} alt={imageAlt(image,locale)} width={2000} height={1125} loading="lazy" decoding="async"/></figure><h3>{item.localizedTitle[locale]}<HcArrow direction="out"/></h3><p>{item.localizedSummary[locale]}</p><span className="hc-text-link">{text[3]}<HcArrow/></span></SiteLink>;})}</nav>
 </section>;
};
