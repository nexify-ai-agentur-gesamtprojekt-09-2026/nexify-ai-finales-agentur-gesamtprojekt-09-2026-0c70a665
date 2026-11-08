import assets from '../../../config/presenter-artwork.json';
import type {Locale} from '../lib/i18n';
export type SceneSpeaker=keyof typeof assets.images;
const names={pascal:'Pascal',nex:'NeX',aifly:'AIFly ORACLE'};
/** Unchanged supplied references, not a product screenshot or simulated video. */
export default function PresenterScene({speaker,title,locale,hero=false}:{speaker:SceneSpeaker;title:string;locale:Locale;hero?:boolean}){
 void locale;
 const image=assets.images[speaker];
 // 08.11.2026: srcSet wurde per String-Ersetzung auf "-768.webp" gebaut. Fuer aifly existierte
 // diese Datei nie (nur 194 px Original) -> 404 mit 302 KB HTML-Fehlerseite pro Aufruf.
 // Jetzt kommen die Kandidaten aus config/presenter-artwork.json (echte Dateien, echte Breiten).
 const variants=(image.variants||[]) as {src:string;width:number}[];
 const srcSet=variants.length?variants.map(v=>`${v.src} ${v.width}w`).join(', '):undefined;
 return <figure className={'presenter-scene scene-'+speaker+(hero?' scene-hero':'')} data-scene-speaker={speaker} data-media-status="decorative-scene">
  <img src={variants.length?variants[variants.length-1].src:image.src} srcSet={srcSet} sizes="(max-width: 640px) 220px, 320px" width={image.width} height={image.height} alt={`${names[speaker]} – ${title}`} loading={hero?'eager':'lazy'} decoding="async"/>
  <figcaption>{names[speaker]}</figcaption>
 </figure>;
}
