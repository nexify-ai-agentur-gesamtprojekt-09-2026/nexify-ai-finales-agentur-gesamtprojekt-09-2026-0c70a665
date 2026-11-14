"use client";
import type {Locale} from "../lib/i18n";
import type {ContactChannel} from "../lib/page-types";
import {SiteLink} from "./Router";

const copy={
  "de": {
    "feature": "Ihr direkter Weg zu NeXify",
    "chat": "Ihre Anfrage bleibt bei Ihnen",
    "featureBody": "Die Projektfunktion ist in dieser Ansicht noch nicht verbunden. Senden Sie Ihr Anliegen an NeXify AI FACTORY per E-Mail; Ziel, Umfang und die passende Zusammenarbeit klären wir persönlich.",
    "chatBody": "Die Website-Beratung konnte nicht geladen werden. Leistungen und Angebote bleiben zugänglich. NeXify AI FACTORY erreichen Sie über die Kontaktseite oder per E-Mail.",
    "contact": "NeXify kontaktieren",
    "reload": "Beratung neu laden"
  },
  "nl": {
    "feature": "Uw directe weg naar NeXify",
    "chat": "Uw aanvraag blijft bij u",
    "featureBody": "De projectfunctie is in deze weergave nog niet verbonden. Stuur uw vraag per e-mail naar NeXify AI FACTORY; doel, omvang en passende samenwerking bespreken we persoonlijk.",
    "chatBody": "Het websiteadvies kon niet worden geladen. Diensten en aanbod blijven toegankelijk. U bereikt NeXify AI FACTORY via de contactpagina of per e-mail.",
    "contact": "Contact met NeXify",
    "reload": "Advies opnieuw laden"
  },
  "fr": {
    "feature": "Votre accès direct à NeXify",
    "chat": "Votre demande reste entre vos mains",
    "featureBody": "La fonction projet n’est pas encore connectée dans cette vue. Adressez votre demande par e-mail à NeXify AI FACTORY ; nous définirons personnellement l’objectif, le périmètre et la collaboration adaptée.",
    "chatBody": "Le conseil sur le site n’a pas pu être chargé. Les prestations et les offres restent accessibles. Contactez NeXify AI FACTORY via la page de contact ou par e-mail.",
    "contact": "Contacter NeXify",
    "reload": "Recharger le conseil"
  },
  "en": {
    "feature": "Your direct route to NeXify",
    "chat": "Your request stays in your hands",
    "featureBody": "The project function is not yet connected in this view. Email your request to NeXify AI FACTORY; we will discuss your goal, scope and suitable collaboration personally.",
    "chatBody": "Website guidance could not be loaded. Services and offers remain accessible. Reach NeXify AI FACTORY through the contact page or by email.",
    "contact": "Contact NeXify",
    "reload": "Reload guidance"
  }
};
export default function PublicRequestFallback({locale,contact,kind="feature"}:{locale:Locale;contact?:ContactChannel;kind?:"feature"|"chat"}){
 const t=copy[locale];
 return <div className="request-fallback editorial-note" role="status"><h3>{t[kind]}</h3><p>{kind==="chat"?t.chatBody:t.featureBody}</p>{contact&&<p><a className="download-link" href={"mailto:"+contact.address}>{contact.label[locale]} · {contact.address}</a></p>}<p><SiteLink href="/kontakt">{t.contact}</SiteLink></p>{kind==="chat"&&<button type="button" className="outline-button" onClick={()=>window.location.reload()}>{t.reload}</button>}</div>;
}
