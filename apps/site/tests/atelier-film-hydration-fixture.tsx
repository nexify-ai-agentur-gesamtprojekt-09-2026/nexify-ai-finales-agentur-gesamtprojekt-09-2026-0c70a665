import React from 'react';
import {hydrateRoot} from 'react-dom/client';
import AtelierFilm from '../../web/components/AtelierFilm';
import type {Locale} from '../../web/lib/i18n';

const locale = (new URLSearchParams(location.search).get('lang') || 'de') as Locale;
const asset = {src:'/test-film.mp4',poster:'/media/higgsfield/hf-02-lobby-walk-1920.webp',posterAlt:'Poster: Pascal, NeX, ORACLE',width:1280,height:720,title:'Film: Pascal',hasAudio:true};
hydrateRoot(document.getElementById('root')!, <AtelierFilm asset={asset} locale={locale} hero />);
