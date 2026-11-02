import assets from '../../../config/presenter-artwork.json';
import type {Locale} from '../lib/i18n';
export type SceneSpeaker=keyof typeof assets.images;
const names={pascal:'Pascal',nex:'NeX',aifly:'AIFly ORACLE'};
/** Unchanged supplied references, not a product screenshot or simulated video. */
export default function PresenterScene({speaker,title,locale,hero=false}:{speaker:SceneSpeaker;title:string;locale:Locale;hero?:boolean}){
 void locale;
 const image=assets.images[speaker];
 return <figure className={'presenter-scene scene-'+speaker+(hero?' scene-hero':'')} data-scene-speaker={speaker} data-media-status="decorative-scene">
  <img src={image.src} width={image.width} height={image.height} alt={`${names[speaker]} – ${title}`} loading={hero?'eager':'lazy'} decoding="async"/>
  <figcaption>{names[speaker]}</figcaption>
 </figure>;
}
