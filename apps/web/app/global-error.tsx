"use client";
import {useEffect,useState} from 'react';
import tokens from '../../../packages/tokens/tokens.json';
import {errorCopy,isErrorLocale} from '../lib/error-copy';
import type {Locale} from '../lib/i18n';

/**
 * Störung im Wurzel-Layout selbst: Diese Seite ersetzt das ganze Dokument und erhält weder die
 * Stylesheets noch den Sprach- und Themenzustand des Layouts. Sie trägt deshalb ihre Gestaltung
 * selbst – ausschließlich mit Werten aus packages/tokens – und liest Sprache und Thema im Browser
 * aus Adresse und Cookie. Ohne Skript erscheint sie deutsch und dunkel (der Standard der Website).
 */
export default function GlobalError({retry}:{error:unknown;retry:()=>void}){
 const [locale,setLocale]=useState<Locale>('de'),[light,setLight]=useState(false);
 useEffect(()=>{
  const requested=new URLSearchParams(window.location.search).get('lang');
  if(isErrorLocale(requested))setLocale(requested);
  setLight(/(?:^|;\s*)nx-theme=light(?:;|$)/.test(document.cookie));
 },[]);
 const t=errorCopy[locale];
 const ground=light?tokens['color-hell-grund']:tokens['color-dunkel-grund'];
 const ink=light?tokens['color-hell-schrift']:tokens['color-text-primaer'];
 const quiet=light?tokens['color-hell-schriftNeben']:tokens['color-text-sekundaer'];
 const action=light?tokens['color-hell-limeHandlung']:tokens['color-marke-lime'];
 const onAction=light?tokens['color-hell-licht']:tokens['color-dunkel-grund'];
 const control={display:'inline-flex',alignItems:'center',justifyContent:'center',minHeight:tokens['target-min'],padding:'0 24px',borderRadius:tokens['radius-pille'],font:'inherit',fontWeight:500,textDecoration:'none',cursor:'pointer'} as const;
 const contactHref=locale==='de'?'/kontakt':`/kontakt?lang=${locale}`;
 return <html lang={locale} style={{colorScheme:light?'light':'dark'}}>
  <body style={{margin:0,minHeight:'100vh',display:'grid',placeItems:'center',background:ground,color:ink,fontFamily:tokens['font-text'],fontSize:16,lineHeight:1.55}}>
   <main role="alert" data-testid="global-error" style={{boxSizing:'border-box',width:'100%',maxWidth:720,padding:'48px 24px'}}>
    <p style={{margin:'0 0 16px',fontSize:13,letterSpacing:'.08em',textTransform:'uppercase',color:quiet}}>NeXify AI FACTORY / {t.kicker}</p>
    <h1 style={{margin:'0 0 16px',fontFamily:tokens['font-display'],fontSize:'clamp(28px,5vw,40px)',lineHeight:1.2,fontWeight:500}}>{t.title}</h1>
    <p style={{margin:'0 0 32px',color:quiet}}>{t.lead} <a href="mailto:mail@nexifyai.cloud" style={{color:ink}}>mail@nexifyai.cloud</a></p>
    <div style={{display:'flex',flexWrap:'wrap',gap:12}}>
     <button type="button" data-testid="global-error-retry" onClick={()=>retry()} style={{...control,border:0,background:action,color:onAction}}>{t.retry}</button>
     <a href={contactHref} data-testid="global-error-contact" style={{...control,border:`1px solid ${quiet}`,color:ink}}>{t.contact}</a>
    </div>
   </main>
  </body>
 </html>;
}
