import registry from '../../../config/editorial-art.json';
import direction from '../../../config/scene-direction.json';
import type {Locale} from '../lib/i18n';

// Per brand concept: no videos. Content scenes use the approved Higgsfield stills
// (one per subject family) with a champagne glass edge.
const familyImage:Record<string,string>={
 web:'/media/higgsfield/hf-03-loft-studio.webp',
 workspace:'/media/higgsfield/hf-01-meeting-table.webp',
 automotive:'/media/higgsfield/hf-07.webp',
};
const labels={de:{example:'Szene aus dem NeXify Atelier',web:['Inhalt','Struktur','Responsive Darstellung'],workspace:['Anliegen','Ordnen','Nächster Schritt'],automotive:['Fahrzeug','Bauteil','Passung klären']},nl:{example:'Scène uit het NeXify-atelier',web:['Inhoud','Structuur','Responsive weergave'],workspace:['Vraag','Ordenen','Volgende stap'],automotive:['Voertuig','Onderdeel','Geschiktheid bepalen']},fr:{example:'Scène de l’atelier NeXify',web:['Contenu','Structure','Affichage adaptatif'],workspace:['Besoin','Organiser','Prochaine étape'],automotive:['Véhicule','Pièce','Vérifier la compatibilité']},en:{example:'Scene from the NeXify atelier',web:['Content','Structure','Responsive layout'],workspace:['Request','Organize','Next step'],automotive:['Vehicle','Part','Clarify fitment']}};
function scene(pageId:string){const page=direction.pages.find(p=>p.page_id===pageId);return page?.mode==='cinematic'?registry.assets.find(a=>a.id===page.family):undefined;}
export function hasDomainArtwork(pageId:string){return !!scene(pageId);}
/** Scene families explain their subject; they are editorial examples, not live transactions. */
export default function DomainArtwork({pageId,locale,compact=false}:{pageId:string;locale:Locale;compact?:boolean;priority?:boolean}){
 const asset=scene(pageId);if(!asset)return null;
 const t=labels[locale],steps=t[asset.id as 'web'|'workspace'|'automotive'];
 const src=familyImage[asset.id]||familyImage.web;
 return <figure className={'domain-artwork'+(compact?' domain-artwork-small':'')} data-artwork={asset.id}>
  <div className="domain-artwork-photo"><img src={src} alt={asset.alt[locale]} width={2000} height={1250} loading="lazy" decoding="async"/></div>
  <ol className="scene-storyline" aria-label={t.example}>{steps.map((step,i)=><li key={step}><span aria-hidden="true">0{i+1}</span>{step}</li>)}</ol>
  {!compact&&<figcaption>{t.example}</figcaption>}
 </figure>;
}
