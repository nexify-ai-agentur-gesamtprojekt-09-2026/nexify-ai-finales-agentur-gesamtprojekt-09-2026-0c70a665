"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {SiteLink} from './Router';
import type {PublicPage} from '../lib/page-types';
import type {Locale} from '../lib/i18n';
import {ActionButton} from './ActionControl';

const copy={
 de:{nav:'Hauptnavigation',menu:'Menü',close:'Menü schließen',services:'Leistungen',products:'Produkte',knowledge:'Arbeitsweise',contact:'Kontakt',intro:'Der passende Zugang zu deinem Vorhaben.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Dein Einstieg',hint:'Noch nicht sicher, was du brauchst?',talk:'Vorhaben besprechen',overview:'Alle Produkte ansehen',account:'Dein Konto'},
 nl:{nav:'Hoofdnavigatie',menu:'Menu',close:'Menu sluiten',services:'Diensten',products:'Producten',knowledge:'Werkwijze',contact:'Contact',intro:'De juiste ingang voor jouw plan.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Jouw vertrekpunt',hint:'Nog niet zeker wat je nodig hebt?',talk:'Je plan bespreken',overview:'Alle producten bekijken',account:'Je account'},
 fr:{nav:'Navigation principale',menu:'Menu',close:'Fermer le menu',services:'Services',products:'Produits',knowledge:'Méthode',contact:'Contact',intro:'Le bon point de départ pour ton projet.',ai:'NeXify AI',shop:'TEILEKLAR',start:'Ton point de départ',hint:'Tu ne sais pas encore ce qu’il te faut ?',talk:'Parler du projet',overview:'Voir tous les produits',account:'Ton compte'}
};
const productNames:Record<string,Partial<Record<Locale,string>>>={
 nex2fly:{de:'NeX2fly Suite',nl:'NeX2fly Suite',fr:'NeX2fly Suite'},one:{de:'NeXify AI one / one+',nl:'NeXify AI one / one+',fr:'NeXify AI one / one+'},api:{de:'API & Integrationen',nl:'API & integraties',fr:'API et intégrations'},
 'tk-home':{de:'TEILEKLAR entdecken',nl:'TEILEKLAR ontdekken',fr:'Découvrir TEILEKLAR'},'tk-workshop':{de:'Werkstattprofile',nl:'Werkplaatsprofielen',fr:'Profils d’ateliers'},'tk-partner':{de:'Werkstattpartner werden',nl:'Werkplaatspartner worden',fr:'Devenir atelier partenaire'},
 pricing:{de:'Preise & Ablauf',nl:'Prijzen & aanpak',fr:'Tarifs et étapes'},scope:{de:'Projektstart',nl:'Een project starten',fr:'Démarrer un projet'},'knowledge-start':{de:'Projekt vorbereiten',nl:'Je project voorbereiden',fr:'Préparer ton projet'}
};
export default function SiteNavigation({pages,site,locale,pathname}:{pages:PublicPage[];site:string;locale:Locale;pathname:string}){
 const t=copy[locale],uid=useId();
 const desktop=useRef<HTMLDetailsElement>(null),mobile=useRef<HTMLDetailsElement>(null);
 const [opened,setOpened]=useState({desktop:false,mobile:false});
 const page=(id:string)=>pages.find(p=>p.id===id);
 const groups=[{id:'ai',title:t.ai,ids:['nex2fly','one','api']},{id:'shop',title:t.shop,ids:['tk-home','tk-workshop','tk-partner']},{id:'start',title:t.start,ids:['pricing','scope','knowledge-start']}];
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
 return <>
  <nav className="main-navigation" aria-label={t.nav} data-testid="desktop-navigation">
   {main[0]}
   <details className="product-navigation" ref={desktop} onToggle={e=>{const open=e.currentTarget.open;setOpened(v=>({...v,desktop:open}));}} onBlur={e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget as Node))e.currentTarget.open=false;}}>
    <summary aria-expanded={opened.desktop} aria-controls={`${uid}-products`} data-testid="desktop-products-megamenu-toggle">{t.products}<span className="navigation-chevron" aria-hidden="true">⌄</span></summary>
    <div className="product-navigation-menu" id={`${uid}-products`} data-testid="desktop-products-megamenu-panel">
     <div className="megamenu-heading"><p data-testid="megamenu-intro">{t.intro}</p>{page('solutions')&&<SiteLink href={page('solutions')!.path} data-testid="megamenu-overview" onClick={()=>close()}>{t.overview}<span aria-hidden="true">→</span></SiteLink>}</div>
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
