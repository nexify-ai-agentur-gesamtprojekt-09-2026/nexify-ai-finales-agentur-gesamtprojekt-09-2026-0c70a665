"use client";
import { SiteLink } from "../Router";
import {useUI} from '../Workspace';
import "./shop.css";

const NOTICES = {
 de:{'tk-appointments':{title:'Online-Terminbuchung noch nicht verfügbar',text:'Termine werden noch nicht online gebucht. Suchen Sie eine Werkstatt in Ihrer Nähe und vereinbaren Sie den Termin direkt.'},'tk-vouchers':{title:'Gutscheine noch nicht verfügbar',text:'Gutscheine können noch nicht gekauft oder eingelöst werden.'},'tk-battery':{title:'Batterie-Berater noch nicht verfügbar',text:'Die Passungsprüfung oben zeigt, welche Batterie-Angaben entscheiden.'},link:'Werkstatt in der Nähe suchen'},
 nl:{'tk-appointments':{title:'Online afspraken maken is nog niet beschikbaar',text:'Afspraken worden nog niet online geboekt. Zoek een werkplaats in uw buurt en maak rechtstreeks een afspraak.'},'tk-vouchers':{title:'Cadeaubonnen zijn nog niet beschikbaar',text:'Cadeaubonnen kunnen nog niet worden gekocht of ingewisseld.'},'tk-battery':{title:'De accuadviseur is nog niet beschikbaar',text:'De pasvormcontrole hierboven toont welke accugegevens van belang zijn.'},link:'Zoek een werkplaats in de buurt'},
 fr:{'tk-appointments':{title:'La réservation en ligne n’est pas encore disponible',text:'Les rendez-vous ne sont pas encore réservés en ligne. Trouvez un atelier près de chez vous et contactez-le directement.'},'tk-vouchers':{title:'Les bons ne sont pas encore disponibles',text:'Les bons ne peuvent pas encore être achetés ni utilisés.'},'tk-battery':{title:'Le conseiller batterie n’est pas encore disponible',text:'Le contrôle de compatibilité ci-dessus indique les caractéristiques de batterie importantes.'},link:'Trouver un atelier à proximité'},
 en:{'tk-appointments':{title:'Online appointment booking is not yet available',text:'Appointments are not booked online yet. Find a workshop near you and arrange an appointment directly.'},'tk-vouchers':{title:'Vouchers are not yet available',text:'Vouchers cannot yet be purchased or redeemed.'},'tk-battery':{title:'The battery adviser is not yet available',text:'The compatibility check above shows which battery details matter.'},link:'Find a nearby workshop'}
};

export default function PhaseNotice({ id }: { id: string }) {
  const {locale}=useUI();const copy=NOTICES[locale];
  if(id!=='tk-appointments'&&id!=='tk-vouchers'&&id!=='tk-battery')return null;
  const notice = copy[id];
  return <section className="tk-notice" role="note" data-testid={`phase-notice-${id}`}>
    <strong>{notice.title}</strong><p>{notice.text}</p>
    {id !== "tk-battery" && <SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid={`phase-notice-${id}-link`}>{copy.link}</SiteLink>}
  </section>;
}
