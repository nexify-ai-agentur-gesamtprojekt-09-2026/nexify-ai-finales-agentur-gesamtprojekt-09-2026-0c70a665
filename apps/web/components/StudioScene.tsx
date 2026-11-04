"use client";
import {useState} from "react";
import studio from "../../../config/studio-scenes.json";
import type {Locale} from "../lib/i18n";
import type {PublicPage} from "../lib/page-types";
import DomainArtwork,{hasDomainArtwork} from "./DomainArtwork";
import "./StudioScene.css";

// One continuous series (owner decision 04.11.2026): every agency page is a shot from the same studio
// light as the home hero, cast only with the approved zielbild-v2 figures. No decoration added.
type Who="pascal"|"nex"|"oracle";
type Cast={who:Who;pose:string;x:number;h:number;z:number;flip:boolean};
type Scene={light:"champagne"|"lime"|"cool";cast:Cast[]};
const scenes=studio.pages as Record<string,Scene>;
const assets=studio.assets as Record<Who,Record<string,string>>;
const film={de:["Film ansehen","Zur Szene"],nl:["Film bekijken","Terug naar de scène"],fr:["Voir le film","Retour à la scène"],en:["Watch the film","Back to the scene"]} as const;

export function hasStudioScene(pageId:string){return pageId in scenes;}

export default function StudioScene({page,locale}:{page:PublicPage;locale:Locale}){
 const scene=scenes[page.id];const [showFilm,setShowFilm]=useState(false);
 if(!scene)return null;
 const label=studio.labels[locale];
 const names=[...new Set(scene.cast.map(c=>label[c.who]))].join(", ");
 const description=`${names} ${label.studio}. ${label.topic}: ${page.localizedTitle[locale]}`;
 const canPlay=hasDomainArtwork(page.id);
 if(showFilm&&canPlay)return <div className="studio-film"><DomainArtwork pageId={page.id} locale={locale}/><button type="button" className="studio-toggle" onClick={()=>setShowFilm(false)}>{film[locale][1]}</button></div>;
 return <figure className={"studio-scene light-"+scene.light} data-studio-scene={page.id}>
  <div className="studio-stage" role="img" aria-label={description}>
   <span className="studio-beam" aria-hidden="true"/>
   <span className="studio-floor" aria-hidden="true"/>
   {scene.cast.map((c,i)=><span key={i} className={"studio-actor who-"+c.who+(c.flip?" is-flipped":"")} style={{left:c.x+"%",height:c.h+"%",zIndex:c.z}} aria-hidden="true">
    <img src={assets[c.who][c.pose]} alt="" decoding="async" loading={i===0?"eager":"lazy"}/>
    <img className="studio-reflection" src={assets[c.who][c.pose]} alt="" decoding="async" loading="lazy"/>
   </span>)}
  </div>
  {canPlay&&<button type="button" className="studio-toggle" onClick={()=>setShowFilm(true)}><span aria-hidden="true">▶</span> {film[locale][0]}</button>}
 </figure>;
}
