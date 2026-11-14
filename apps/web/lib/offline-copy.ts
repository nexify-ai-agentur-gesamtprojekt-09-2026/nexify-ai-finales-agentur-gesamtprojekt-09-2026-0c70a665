import type {Locale} from './i18n';

/** Texte der Offline-Seite (app/offline/page.tsx). Gleicher Schlüsselsatz in allen vier Sprachen. */
export const offlineCopy:Record<Locale,{kicker:string;title:string;body:string;retry:string;home:string}>={
 de:{kicker:'Offline',title:'Keine Verbindung',body:'Die Seite ist gerade nicht erreichbar. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',retry:'Erneut versuchen',home:'Zur Startseite'},
 nl:{kicker:'Offline',title:'Geen verbinding',body:'De pagina is momenteel niet bereikbaar. Controleer uw internetverbinding en probeer het opnieuw.',retry:'Opnieuw proberen',home:'Naar de startpagina'},
 fr:{kicker:'Hors ligne',title:'Pas de connexion',body:'Cette page est momentanément inaccessible. Vérifiez votre connexion Internet et réessayez.',retry:'Réessayer',home:'Vers la page d’accueil'},
 en:{kicker:'Offline',title:'No connection',body:'This page is currently unavailable. Check your internet connection and try again.',retry:'Try again',home:'Back to the home page'},
};
