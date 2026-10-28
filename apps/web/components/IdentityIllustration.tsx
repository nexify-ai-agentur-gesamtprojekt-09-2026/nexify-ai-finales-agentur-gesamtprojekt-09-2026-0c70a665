import images from '../../../config/interim-scene-images.json';
import type {Locale} from '../lib/i18n';
import './IdentityIllustration.css';
export type IllustrationVariant='hero'|'project'|'orientation';
const names={pascal:'Pascal',nex:'NeX',aifly:'AI Fly Oracle'};
const labels={
 de:{hero:'Pascal, NeX und AI Fly Oracle – gemeinsam für dein Vorhaben',project:'Pascal im Mittelpunkt mit NeX und AI Fly Oracle – dein Vorhaben klären',orientation:'AI Fly Oracle mit Pascal und NeX – deinen Einstieg finden'},
 nl:{hero:'Pascal, NeX en AI Fly Oracle – samen voor jouw plan',project:'Pascal centraal met NeX en AI Fly Oracle – jouw plan verduidelijken',orientation:'AI Fly Oracle met Pascal en NeX – jouw startpunt vinden'},
 fr:{hero:'Pascal, NeX et AI Fly Oracle – ensemble pour ton projet',project:'Pascal au centre avec NeX et AI Fly Oracle – préciser ton projet',orientation:'AI Fly Oracle avec Pascal et NeX – trouver ton point de départ'}
};
/** Native illustration only: original transparent bytes, no screenshot, fake UI or video. */
export default function IdentityIllustration({variant,locale}:{variant:IllustrationVariant;locale:Locale}){
 return <div className={'identity-illustration illustration-'+variant} role="img" aria-label={labels[locale][variant]} data-identity-illustration={variant}>
  <div className={"illustration-surface"+(variant==='hero'?' home-interim-scenes':'')} aria-hidden="true">
   <div className="illustration-horizon"/><div className="illustration-ground"/>
   <span className="illustration-shadow shadow-pascal"/><span className="illustration-shadow shadow-nex"/><span className="illustration-shadow shadow-aifly"/>
   <svg className="illustration-path" viewBox="0 0 400 330" preserveAspectRatio="none"><path d={variant==='orientation'?'M55 278 C130 303 196 257 245 229 C289 206 328 218 360 242':'M30 278 C94 257 160 300 227 277 C279 257 314 243 367 252'}/></svg>
   <span className="illustration-paper paper-one"/><span className="illustration-paper paper-two"/><span className="illustration-paper paper-three"/>
   {(['pascal','nex','aifly'] as const).map(persona=>{const image=images.images[persona];return <img key={persona} className={'illustration-persona persona-'+persona} data-persona={persona} data-persona-name={names[persona]} src={image.src} width={image.width} height={image.height} alt="" loading={variant==='hero'?'eager':'lazy'} decoding="async"/>;})}
  </div>
 </div>;
}
