"use client";
import {useUI} from './Workspace';
import {SiteLink} from './Router';
const text={
 de:{loginTitle:'Anmeldung noch nicht verfügbar',loginBody:'Die sichere Kontoanbindung ist noch nicht vollständig eingerichtet. Öffentliche Inhalte und die Besucherberatung bleiben erreichbar.',signupTitle:'Registrierung noch nicht verfügbar',signupBody:'Die sichere Registrierung ist noch nicht vollständig eingerichtet. Es wurde kein Konto erstellt.',loginRights:'Die Anmeldung allein erteilt keine Rollen- oder Mandantenrechte.',signupRights:'Ein neues Konto erhält keine automatische Adminrolle und keine Mandantenfreigabe.',back:'Zur Startseite'},
 nl:{loginTitle:'Aanmelden nog niet beschikbaar',loginBody:'De beveiligde accountkoppeling is nog niet volledig ingesteld. Openbare inhoud en bezoekersadvies blijven bereikbaar.',signupTitle:'Registreren nog niet beschikbaar',signupBody:'De beveiligde registratie is nog niet volledig ingesteld. Er is geen account aangemaakt.',loginRights:'Aanmelden verleent op zichzelf geen rollen of tenantrechten.',signupRights:'Een nieuw account krijgt niet automatisch een beheerdersrol of tenanttoegang.',back:'Naar de startpagina'},
 fr:{loginTitle:'Connexion pas encore disponible',loginBody:'La connexion sécurisée aux comptes n’est pas encore entièrement configurée. Les contenus publics et le conseil aux visiteurs restent accessibles.',signupTitle:'Inscription pas encore disponible',signupBody:'L’inscription sécurisée n’est pas encore entièrement configurée. Aucun compte n’a été créé.',loginRights:'La connexion seule ne confère aucun rôle ni droit de locataire.',signupRights:'Un nouveau compte ne reçoit pas automatiquement de rôle administrateur ni d’accès à un locataire.',back:'Vers l’accueil'}
};
export default function AuthAvailabilityNotice({kind,ready}:{kind:'login'|'signup';ready:boolean}){
 const{locale}=useUI(),t=text[locale];
 return ready?<p className="auth-rights-notice">{kind==='login'?t.loginRights:t.signupRights}</p>:<div className="editorial-note auth-availability-notice"><h2>{kind==='login'?t.loginTitle:t.signupTitle}</h2><p>{kind==='login'?t.loginBody:t.signupBody}</p><SiteLink href="/" className="route-action">{t.back}</SiteLink></div>;
}
