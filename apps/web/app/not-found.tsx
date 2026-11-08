import Link from 'next/link';
import {HcArrow} from '../components/HcArrow';
import '../components/HomeConcept.css';
import '../components/PageConcept.css';

/** Brand 404 in the Startseite vocabulary. Server component: no locale context, German-first copy. */
export default function NotFound(){
 return <div className="home-concept page-concept layout-document" data-testid="public-page-not-found">
  <section className="hc-container" aria-labelledby="not-found-title">
   <header className="pc-hero is-text-only">
    <div className="pc-hero-copy">
     <span className="hc-kicker">NEXIFY AI<span aria-hidden="true"> / </span>Seite nicht gefunden</span>
     <h1 id="not-found-title">Diese Seite gibt es nicht mehr oder noch nicht.</h1>
     <p className="pc-hero-lead">Die Adresse hat sich geändert oder wurde falsch eingegeben. Über die Startseite erreichen Sie Leistungen, Produkte, TEILEKLAR und den Kontakt.</p>
     <div className="pc-hero-actions">
      <Link className="hc-text-link is-primary" href="/" data-testid="not-found-home">Zur Startseite<HcArrow/></Link>
      <Link className="hc-text-link" href="/kontakt" data-testid="not-found-contact">Kontakt aufnehmen<HcArrow/></Link>
     </div>
    </div>
   </header>
  </section>
 </div>;
}
