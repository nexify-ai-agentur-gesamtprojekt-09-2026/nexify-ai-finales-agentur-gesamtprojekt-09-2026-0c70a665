import assets from '../../../config/presenter-artwork.json';
import type {Locale} from '../lib/i18n';
export type SceneSpeaker=keyof typeof assets.images;
const names={pascal:'Pascal',nex:'NeX',aifly:'AIFly ORACLE'};
/** Unchanged supplied references, not a product screenshot or simulated video. */
export default function PresenterScene({speaker,title,locale,hero=false}:{speaker:SceneSpeaker;title:string;locale:Locale;hero?:boolean}){
 void locale;
 const image=assets.images[speaker];
 return <figure className={'presenter-scene scene-'+speaker+(hero?' scene-hero':'')} data-scene-speaker={speaker} data-media-status="decorative-scene">
  <img src={image.src} srcSet={`${image.src.replace("-lossless.webp","-768.webp")} 768w, ${image.src} ${image.width}w`} sizes="(max-width: 640px) 220px, 320px" width={image.width} height={image.height} alt={`${names[speaker]} – ${title}`} loading={hero?'eager':'lazy'} decoding="async"/>
  <figcaption>{names[speaker]}</figcaption>
 </figure>;
}
