import registry from '../../../config/editorial-art.json';
import direction from '../../../config/scene-direction.json';
import AtelierFilm from './AtelierFilm';
import type {Locale} from '../lib/i18n';
const labels={de:{example:'Filmische Illustration',web:['Inhalt','Struktur','Responsive Darstellung'],workspace:['Anliegen','Ordnen','Nächster Schritt'],automotive:['Fahrzeug','Bauteil','Passung klären']},nl:{example:'Filmische illustratie',web:['Inhoud','Structuur','Responsive weergave'],workspace:['Vraag','Ordenen','Volgende stap'],automotive:['Voertuig','Onderdeel','Geschiktheid bepalen']},fr:{example:'Illustration filmée',web:['Contenu','Structure','Affichage adaptatif'],workspace:['Besoin','Organiser','Prochaine étape'],automotive:['Véhicule','Pièce','Vérifier la compatibilité']},en:{example:'Cinematic illustration',web:['Content','Structure','Responsive layout'],workspace:['Request','Organize','Next step'],automotive:['Vehicle','Part','Clarify fitment']}};
function scene(pageId:string){const page=direction.pages.find(p=>p.page_id===pageId);return page?.mode==='cinematic'?registry.assets.find(a=>a.id===page.family):undefined;}
export function hasDomainArtwork(pageId:string){return !!scene(pageId);}
/** Scene families explain their subject; they are editorial examples, not live transactions. */
export default function DomainArtwork({pageId,locale,compact=false}:{pageId:string;locale:Locale;compact?:boolean;priority?:boolean}){
 const asset=scene(pageId);if(!asset)return null;
 const t=labels[locale];
 return <figure className={'domain-artwork'+(compact?' domain-artwork-small':'')} data-artwork={asset.id}>
  <AtelierFilm key={pageId+":"+locale} asset={{...asset.film,title:asset.alt[locale],playOnce:true}} locale={locale}/>
  {!compact&&<figcaption>{t.example}</figcaption>}
 </figure>;
}
