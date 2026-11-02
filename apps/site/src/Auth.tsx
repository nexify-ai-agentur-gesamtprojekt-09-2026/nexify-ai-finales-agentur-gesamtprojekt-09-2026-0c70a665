import {SiteLink} from "../../web/components/Router";
import {useUI} from "../../web/components/Workspace";

// Suite access is agreed separately from TEILEKLAR shop authentication.
// This static adapter offers the actual contact route and never mints rights.
const copy={
 de:{disclaimer:"Für diesen Zugang werden Berechtigungen gesondert vereinbart: keine automatische Adminrolle und kein pauschaler Zugriff auf Mandanten- oder Geschäftsdaten.",note:"Ihr NeX2fly-Zugang wird mit der NeXify AI FACTORY B.V. abgestimmt.",contact:"Zugang mit der FACTORY klären"},
 nl:{disclaimer:"Rechten voor deze toegang worden afzonderlijk afgesproken; er is geen automatische beheerdersrol of algemene toegang tot bedrijfsgegevens.",note:"Uw NeX2fly-toegang stemt u af met NeXify AI FACTORY B.V.",contact:"Toegang met de FACTORY afstemmen"},
 fr:{disclaimer:"Les droits sont convenus séparément ; aucun rôle d’administration ni accès général aux données des entreprises n’est attribué automatiquement.",note:"Votre accès NeX2fly est défini avec NeXify AI FACTORY B.V.",contact:"Définir votre accès avec la FACTORY"},
 en:{disclaimer:"Permissions are agreed separately; access grants no automatic admin role or general access to tenant or business data.",note:"Arrange your NeX2fly access with NeXify AI FACTORY B.V.",contact:"Arrange access with the FACTORY"}
};
type Mode="login"|"signup";
export function AuthenticationPanel(_props:{mode:Mode;hashMode?:boolean}){
 const {locale}=useUI();const text=copy[locale];
 return <div className="auth-fallback editorial-note" role="status" data-testid="site-auth-panel">
  <span className="auth-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></span>
  <div className="auth-panel-copy">
  <strong>{text.note}</strong>
  <p><SiteLink data-testid="site-auth-link" href="/kontakt">{text.contact}</SiteLink></p>
  <p>{text.disclaimer}</p>
  </div>
 </div>;
}

export function AccountControl(){
 const {locale}=useUI();
 const label={de:"Kundenbereich",nl:"Klantenzone",fr:"Espace client",en:"Customer area"}[locale];
 return <SiteLink className="account-control account-link" href="/anmelden">{label}</SiteLink>;
}
