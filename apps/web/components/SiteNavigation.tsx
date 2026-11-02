"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {SiteLink} from './Router';
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import {ActionButton} from './ActionControl';

const copy={
 de:{nav:'Hauptnavigation',menu:'Menü',close:'Menü schließen',services:'Leistungen',products:'Produkte',knowledge:'Arbeitsweise',contact:'Kontakt',intro:'Marke, Systeme und Wachstum — verbunden durch die FACTORY.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Projekt & Wachstum',hint:'Ihr Projekt verdient einen klaren Rahmen.',talk:'Projektumfang festlegen',overview:'Leistungen der FACTORY',account:'Ihr Konto'},
 nl:{nav:'Hoofdnavigatie',menu:'Menu',close:'Menu sluiten',services:'Diensten',products:'Producten',knowledge:'Werkwijze',contact:'Contact',intro:'De passende ingang voor uw project.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Uw vertrekpunt',hint:'Wilt u uw behoefte verder bepalen?',talk:'Uw project bespreken',overview:'Diensten van de FACTORY',account:'Uw account'},
 fr:{nav:'Navigation principale',menu:'Menu',close:'Fermer le menu',services:'Services',products:'Produits',knowledge:'Méthode',contact:'Contact',intro:'Le bon point de départ pour votre projet.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Votre point de départ',hint:'Souhaitez-vous préciser votre besoin ?',talk:'Parler du projet',overview:'Les services de la FACTORY',account:'Votre compte'},
 en:{"nav": "Main navigation", "menu": "Menu", "close": "Close menu", "services": "Services", "products": "Products", "knowledge": "Approach", "contact": "Contact", "intro": "The right entry point for your project.", "ai": "NeXify AI", "shop": "TEILEKLAR", "start": "Your starting point", "hint": "Would you like to narrow down your needs?", "talk": "Discuss your project", "overview": "FACTORY services", "account": "Your account"}
};
const productNames:Record<string,Partial<Record<Locale,string>>>={
 nex2fly:{de:'NeX2fly Suite',nl:'NeX2fly Suite',fr:'NeX2fly Suite',en:'NeX2fly Suite'},one:{de:'NeX Agentic AI',nl:'NeX Agentic AI',fr:'NeX Agentic AI',en:'NeX Agentic AI'},api:{de:'API & Integrationen',nl:'API & integraties',fr:'API et intégrations',en:'API & integrations'},
 'tk-home':{de:'TEILEKLAR entdecken',nl:'TEILEKLAR ontdekken',fr:'Découvrir TEILEKLAR',en:'Explore TEILEKLAR'},'tk-workshop':{de:'Werkstattprofile',nl:'Werkplaatsprofielen',fr:'Profils d’ateliers',en:'Workshop profiles'},'tk-partner':{de:'Werkstattpartner werden',nl:'Werkplaatspartner worden',fr:'Devenir atelier partenaire',en:'Become a workshop partner'},
 pricing:{de:'Preise & Ablauf',nl:'Prijzen & aanpak',fr:'Tarifs et étapes',en:'Pricing & process'},scope:{de:'Projektstart',nl:'Een project starten',fr:'Démarrer un projet',en:'Starting a project'},'knowledge-start':{de:'Projekt vorbereiten',nl:'Uw project voorbereiden',fr:'Préparer votre projet',en:'Prepare your project'}
};
const shopCopy:Record<Locale,{search:string;categories:string;fitment:string;workshop:string;partner:string;cart:string;more:string;service:string;back:string}>={
 de:{search:'Teilesuche',categories:'Kategorien',fitment:'Fahrzeug & Passung',workshop:'Werkstatt',partner:'Partner werden',cart:'Warenkorb',more:'Weitere Angebote',service:'Service & Shop',back:'NeXify AI'},
 nl:{search:'Onderdelen zoeken',categories:'Categorieën',fitment:'Voertuig & passing',workshop:'Werkplaats',partner:'Partner worden',cart:'Winkelwagen',more:'Meer aanbod',service:'Service & shop',back:'NeXify AI'},
 fr:{search:'Recherche de pièces',categories:'Catégories',fitment:'Véhicule & compatibilité',workshop:'Atelier',partner:'Devenir partenaire',cart:'Panier',more:'Autres offres',service:'Service & boutique',back:'NeXify AI'},
 en:{search:'Find parts',categories:'Categories',fitment:'Vehicle & fitment',workshop:'Workshops',partner:'Become a partner',cart:'Cart',more:'More options',service:'Service & shop',back:'NeXify AI'}
};
export default function SiteNavigation({pages,site,locale,pathname}:{pages:PublicPage[];site:string;locale:Locale;pathname:string}){
 const t=copy[locale],uid=useId();
 const desktop=useRef<HTMLDetailsElement>(null),mobile=useRef<HTMLDetailsElement>(null);
 const [opened,setOpened]=useState({desktop:false,mobile:false});
 const page=(id:string)=>pages.find(p=>p.id===id);
 const groups=[{id:'ai',title:t.ai,ids:['nex2fly','one','api']},{id:'shop',title:t.shop,ids:['tk-home','tk-workshop','tk-partner']},{id:'start',title:t.start,ids:['solutions','pricing','scope','knowledge-start']}];
 const label=(p:PublicPage)=>productNames[p.id]?.[locale]||p.localizedTitle[locale];
 const active=(p:PublicPage)=>pathname===p.path?'page' as const:undefined;
 const close=(focus=false)=>{[desktop,mobile].forEach(ref=>{if(ref.current?.open){ref.current.open=false;if(focus)ref.current.querySelector('summary')?.focus();}});};
 useEffect(()=>{close();},[pathname,locale]);
 useEffect(()=>{
  if(!opened.desktop&&!opened.mobile)return;
  const outside=(event:PointerEvent)=>{[desktop,mobile].forEach(ref=>{if(ref.current?.open&&!ref.current.contains(event.target as Node))ref.current.open=false;});};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();close(true);}};
  const resize=()=>close();
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);window.addEventListener('resize',resize);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);window.removeEventListener('resize',resize);};
 },[opened.desktop,opened.mobile]);
 const links=(ids:string[],prefix:string)=>ids.flatMap(id=>{const p=page(id);return p?[<SiteLink key={id} href={p.path} aria-current={active(p)} data-testid={`${prefix}-${id}`} onClick={()=>close()}><span>{label(p)}</span><span aria-hidden="true">→</span></SiteLink>]:[];});
 const primary=(prefix:string)=>['services','knowledge','contact'].flatMap(id=>{const p=page(id);return p&&p.navigationContexts.includes(site)?[<SiteLink key={id} href={p.path} aria-current={active(p)} data-testid={`${prefix}-${id}`} onClick={()=>close()}>{t[id as 'services'|'knowledge'|'contact']}</SiteLink>]:[];});
 const main=primary('desktop-navigation-link');
 const shop=shopCopy[locale];
 const shopLink=(id:string,label:string,prefix:string)=>{const target=page(id);return target?<SiteLink key={id} href={target.path} aria-current={active(target)} data-testid={`${prefix}-${id}`} onClick={()=>close()}>{label}</SiteLink>:null;};
 const shopMain=[['tk-search',shop.search],['tk-categories',shop.categories],['tk-fitment',shop.fitment],['tk-workshop',shop.workshop],['tk-partner',shop.partner],['tk-cart',shop.cart]] as const;
 if(site==='teileklar')return <>
  <nav className="main-navigation shop-main-navigation" aria-label={t.nav} data-testid="desktop-navigation">
   {shopMain.map(([id,name])=>shopLink(id,name,'desktop-navigation-link'))}
   <details className="product-navigation" ref={desktop} onToggle={e=>{const open=e.currentTarget.open;setOpened(v=>({...v,desktop:open}));}}><summary aria-expanded={opened.desktop} aria-controls={`${uid}-shop-more`}>{shop.more}<span className="navigation-chevron" aria-hidden="true">⌄</span></summary><div className="product-navigation-menu shop-navigation-menu" id={`${uid}-shop-more`}><div className="megamenu-group"><h2>{shop.service}</h2>{links(['tk-shop','tk-appointments','tk-vouchers','tk-reifenrechner','tk-batterie','tk-legal'],'desktop-shop-more-link')}</div><SiteLink href="/" onClick={()=>close()}>{shop.back}<span aria-hidden="true">→</span></SiteLink></div></details>
  </nav>
  <details className="mobile-navigation" ref={mobile} data-testid="mobile-navigation" onToggle={e=>{const open=e.currentTarget.open;setOpened(v=>({...v,mobile:open}));}}><summary aria-label={t.menu} aria-expanded={opened.mobile} aria-controls={`${uid}-mobile`} data-testid="mobile-navigation-toggle"><span className="mobile-menu-mark" aria-hidden="true"><i/><i/></span></summary><nav className="mobile-navigation-panel" id={`${uid}-mobile`} aria-label={t.nav} data-testid="mobile-navigation-panel"><div className="megamenu-group"><h2>TEILEKLAR</h2>{shopMain.map(([id,name])=>shopLink(id,name,'mobile-navigation-link'))}</div><div className="megamenu-group"><h2>{shop.service}</h2>{links(['tk-shop','tk-appointments','tk-vouchers','tk-reifenrechner','tk-batterie','tk-legal'],'mobile-shop-link')}</div><div className="megamenu-group"><h2>{t.account}</h2>{links(['login','signup'],'mobile-account-link')}<SiteLink href="/" onClick={()=>close()}>{shop.back}<span aria-hidden="true">→</span></SiteLink></div><ActionButton variant="quiet" data-testid="mobile-navigation-close" onClick={()=>close(true)}>{t.close}</ActionButton></nav></details>
 </>;
 return <>
  <nav className="main-navigation" aria-label={t.nav} data-testid="desktop-navigation">
   {main[0]}
   <details className="product-navigation" ref={desktop} onToggle={e=>{const open=e.currentTarget.open;setOpened(v=>({...v,desktop:open}));}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false;}}>
    <summary aria-expanded={opened.desktop} aria-controls={`${uid}-products`} data-testid="desktop-products-megamenu-toggle">{t.products}<span className="navigation-chevron" aria-hidden="true">⌄</span></summary>
    <div className="product-navigation-menu" id={`${uid}-products`} data-testid="desktop-products-megamenu-panel">
     <div className="megamenu-heading"><p data-testid="megamenu-intro">{t.intro}</p>{page('services')&&<SiteLink href={page('services')!.path} data-testid="megamenu-overview" onClick={()=>close()}>{t.overview}<span aria-hidden="true">→</span></SiteLink>}</div>
     <div className="megamenu-columns">{groups.map(group=><div key={group.id} className="megamenu-group" data-testid={`megamenu-group-${group.id}`}><h2>{group.title}</h2>{links(group.ids,'desktop-products-megamenu-link')}</div>)}</div>
     <div className="megamenu-bottom"><span data-testid="megamenu-help">{t.hint}</span><SiteLink href="/leistungsumfang" data-testid="megamenu-project-link" onClick={()=>close()}>{t.talk}<span aria-hidden="true">→</span></SiteLink></div>
    </div>
   </details>
   {main.slice(1)}
  </nav>
  <details className="mobile-navigation" ref={mobile} data-testid="mobile-navigation" onToggle={e=>{const open=e.currentTarget.open;setOpened(v=>({...v,mobile:open}));}}>
   <summary aria-label={t.menu} aria-expanded={opened.mobile} aria-controls={`${uid}-mobile`} data-testid="mobile-navigation-toggle"><span className="mobile-menu-mark" aria-hidden="true"><i/><i/></span></summary>
   <nav className="mobile-navigation-panel" id={`${uid}-mobile`} aria-label={t.nav} data-testid="mobile-navigation-panel">
    <div className="mobile-primary-links">{primary('mobile-navigation-link')}</div>
    {groups.map(group=><div className="megamenu-group" key={group.id}><h2>{group.title}</h2>{links(group.ids,'mobile-products-link')}</div>)}
    <div className="megamenu-group"><h2>{t.account}</h2>{links(['login','signup'],'mobile-account-link')}</div>
    <ActionButton variant="quiet" data-testid="mobile-navigation-close" onClick={()=>close(true)}>{t.close}</ActionButton>
   </nav>
  </details>
 </>;
}
