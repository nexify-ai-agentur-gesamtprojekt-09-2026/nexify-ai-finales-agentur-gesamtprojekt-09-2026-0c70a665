"use client";
import type {Locale} from "../lib/i18n";
import type {ContactChannel} from "../lib/page-types";
import {SiteLink} from "./Router";

const copy={
 de:{feature:"Direkter Kontakt",chat:"Orientierung momentan nicht verfügbar",featureBody:"Diese Funktion ist hier noch nicht verbunden. Besprich dein Vorhaben stattdessen per E-Mail mit uns.",chatBody:"Die Gesprächsansicht konnte nicht geladen werden. Die öffentlichen Seiten bleiben nutzbar. Du erreichst uns auch per E-Mail.",contact:"Kontaktseite öffnen",reload:"Seite neu laden"},
 nl:{feature:"Rechtstreeks contact",chat:"Oriëntatie momenteel niet beschikbaar",featureBody:"Deze functie is hier nog niet verbonden. Bespreek je plan in plaats daarvan per e-mail met ons.",chatBody:"De gespreksweergave kon niet worden geladen. De openbare pagina’s blijven beschikbaar. Je kunt ons ook e-mailen.",contact:"Contactpagina openen",reload:"Pagina opnieuw laden"},
 fr:{feature:"Contact direct",chat:"Orientation momentanément indisponible",featureBody:"Cette fonction n’est pas encore connectée ici. Écrivez-nous plutôt par e-mail pour discuter de votre projet.",chatBody:"La conversation n’a pas pu être chargée. Les pages publiques restent disponibles. Vous pouvez aussi nous écrire par e-mail.",contact:"Ouvrir la page de contact",reload:"Recharger la page"}
};
export default function PublicRequestFallback({locale,contact,kind="feature"}:{locale:Locale;contact?:ContactChannel;kind?:"feature"|"chat"}){
 const t=copy[locale];
 return <div className="request-fallback editorial-note" role="status"><h3>{t[kind]}</h3><p>{kind==="chat"?t.chatBody:t.featureBody}</p>{contact&&<p><a className="download-link" href={"mailto:"+contact.address}>{contact.label[locale]} · {contact.address}</a></p>}<p><SiteLink href="/kontakt">{t.contact}</SiteLink></p>{kind==="chat"&&<button type="button" className="outline-button" onClick={()=>window.location.reload()}>{t.reload}</button>}</div>;
}
