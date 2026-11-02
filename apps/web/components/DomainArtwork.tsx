import registry from '../../../config/editorial-art.json';
import direction from '../../../config/scene-direction.json';
import AtelierFilm from './AtelierFilm';
import cast from '../../../config/presenter-artwork.json';
import type {Locale} from '../lib/i18n';
function scene(pageId:string){const page=direction.pages.find(p=>p.page_id===pageId);return page?.mode==='cinematic'?registry.assets.find(a=>a.id===page.family):undefined;}
export function hasDomainArtwork(pageId:string){return !!scene(pageId);}
/** Scene families explain their subject; they are editorial examples, not live transactions. */
export default function DomainArtwork({pageId,locale,compact=false}:{pageId:string;locale:Locale;compact?:boolean;priority?:boolean}){
 const asset=scene(pageId);if(!asset)return null;
 return <figure className={'domain-artwork'+(compact?' domain-artwork-small':'')} data-artwork={asset.id}>
  <AtelierFilm key={pageId+":"+locale} asset={{...asset.film,title:asset.alt[locale],playOnce:true}} locale={locale}/>
  <div className="domain-artwork-cast" aria-hidden="true">
   <img className="domain-cast-nex" src={cast.images.nex.src} alt="" width={cast.images.nex.width} height={cast.images.nex.height} loading="lazy" decoding="async"/>
   <img className="domain-cast-pascal" src="/media/atelier/presenters/pascal-walking-cutout-20261102.png" alt="" width="1024" height="1536" loading="lazy" decoding="async"/>
   <img className="domain-cast-oracle" src={cast.images.aifly.src} alt="" width={cast.images.aifly.width} height={cast.images.aifly.height} loading="lazy" decoding="async"/>
  </div>
 </figure>;
}
