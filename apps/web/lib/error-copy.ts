import type {Locale} from './i18n';

/** Texte der Störungsseiten (app/error.tsx, app/global-error.tsx). Gleicher Schlüsselsatz in allen vier Sprachen. */
export const errorCopy:Record<Locale,{kicker:string;title:string;lead:string;retry:string;contact:string}>={
 de:{kicker:'Störung',title:'Diese Seite konnte gerade nicht geladen werden.',lead:'Das liegt an uns, nicht an Ihnen. Versuchen Sie es erneut. Wenn es dabei bleibt, erreichen Sie uns über die Kontaktseite oder per E-Mail:',retry:'Erneut versuchen',contact:'Kontakt aufnehmen'},
 nl:{kicker:'Storing',title:'Deze pagina kon nu niet worden geladen.',lead:'Dat ligt aan ons, niet aan u. Probeer het opnieuw. Blijft het zo, dan bereikt u ons via de contactpagina of per e-mail:',retry:'Opnieuw proberen',contact:'Contact opnemen'},
 fr:{kicker:'Incident',title:'Cette page n’a pas pu être chargée.',lead:'Cela vient de nous, pas de vous. Réessayez. Si le problème persiste, contactez-nous via la page de contact ou par e-mail :',retry:'Réessayer',contact:'Prendre contact'},
 en:{kicker:'Error',title:'This page could not be loaded just now.',lead:'This is on our side, not yours. Please try again. If it persists, reach us through the contact page or by email:',retry:'Try again',contact:'Get in touch'},
};

export const isErrorLocale=(value:string|null|undefined):value is Locale=>value==='de'||value==='nl'||value==='fr'||value==='en';
