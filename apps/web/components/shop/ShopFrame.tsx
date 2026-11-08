'use client';
import type {ReactNode} from 'react';
import {SiteLink} from '../Router';
import './shop.css';
import './Storefront.css';
import '../HomeConcept.css';
import '../PageConcept.css';
import '../HomeMaster.css';
/** Shop runtime pages (catalogue, search, cart, checkout, workshops) share the Startseite frame:
 *  hc-container widths, the page hero vocabulary and the Atelier material for embedded panels. */
export default function ShopFrame({title,children,testId,crumbs=[],intro,kicker,brand='TEILEKLAR',home=['/teileklar','TEILEKLAR.shop']}:{title:string;children:ReactNode;testId:string;crumbs?:[string,string][];intro?:string;kicker?:string;brand?:string;home?:[string,string]}){
 return <div className="home-concept page-concept tk-shop" data-testid={testId}>
  <section className="hc-container" aria-labelledby={testId+'-title'}>
   <header className="pc-hero is-text-only">
    <div className="pc-hero-copy">
     <nav className="pc-breadcrumb" aria-label="Brotkrumennavigation"><ol><li><SiteLink href={home[0]} data-testid={testId+'-home'}>{home[1]}</SiteLink><span aria-hidden="true">/</span></li>{crumbs.map(([href,label],i)=><li key={href}><SiteLink href={href} data-testid={testId+'-crumb-'+i}>{label}</SiteLink><span aria-hidden="true">/</span></li>)}<li><span aria-current="page">{title}</span></li></ol></nav>
     <span className="hc-kicker">{brand}<span aria-hidden="true"> / </span>{kicker||'Shop'}</span>
     <h1 id={testId+'-title'} data-testid={testId+'-title'}>{title}</h1>
     {intro&&<p className="pc-hero-lead">{intro}</p>}
    </div>
   </header>
  </section>
  <section className="hc-container pc-supplement tk-shop-body">{children}</section>
 </div>;
}
