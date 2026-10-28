import assets from '../../../config/interim-scene-images.json';
import type {Locale} from '../lib/i18n';
export type SceneSpeaker=keyof typeof assets.images;
const names={pascal:'Pascal',nex:'NeX',aifly:'AI Fly Oracle'};
const copy={de:'Bildszene · Video folgt',nl:'Beeldscène · video volgt',fr:'Illustration · vidéo à venir'};
/** Unchanged supplied references, not a product screenshot or simulated video. */
export default function PresenterScene({speaker,title,locale,hero=false}:{speaker:SceneSpeaker;title:string;locale:Locale;hero?:boolean}){
 const image=assets.images[speaker];
 return <figure className={'presenter-scene scene-'+speaker+(hero?' scene-hero':'')} data-scene-speaker={speaker}>
  <img src={image.src} width={image.width} height={image.height} alt={`${names[speaker]} – ${title}`} loading={hero?'eager':'lazy'} decoding="async"/>
  <figcaption>{hero?names[speaker]:copy[locale]}</figcaption>
 </figure>;
}
