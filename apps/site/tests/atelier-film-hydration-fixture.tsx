import React, {useState} from 'react';
import {hydrateRoot} from 'react-dom/client';
import AtelierFilm from '../../web/components/AtelierFilm';
import type {Locale} from '../../web/lib/i18n';

const images={bad:{src:'/media/higgsfield/hf-04-studio-desk-1920.webp',alt:'Still: fixture A'},good:{src:'/media/higgsfield/hf-03-loft-studio-1920.webp',alt:'Still: fixture B'}};
export function FilmFixture({locale,noStill}:{locale:Locale;noStill:boolean}){
 const [still,setStill]=useState(noStill?undefined:images.bad);
 const asset={src:'/test-film.mp4',poster:'/media/higgsfield/hf-02-lobby-walk-1920.webp',posterAlt:'Poster: Pascal, NeX, ORACLE',still,width:1280,height:720,title:'Film: Pascal',hasAudio:true};
 return <><AtelierFilm asset={asset} locale={locale} hero/><button onClick={()=>setStill(images.good)}>Switch to fixture B</button><button onClick={()=>setStill(images.bad)}>Switch to fixture A</button></>;
}
if(typeof window!=='undefined'){
 const params=new URLSearchParams(location.search);
 hydrateRoot(document.getElementById('root')!, <FilmFixture locale={(params.get('lang')||'de') as Locale} noStill={params.has('nostill')}/>);
}
