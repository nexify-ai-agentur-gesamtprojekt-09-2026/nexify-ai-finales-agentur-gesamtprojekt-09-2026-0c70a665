// Kopfleiste beim Blättern: Messung, Ruhe-Abwarten und Regel. Gemeinsam für tools/live-check.mjs und tools/gleichmacher.mjs.
// Nur lesend. Die Regel ist eine reine Funktion (tests/kopfleiste-regel.test.mjs); gemessen wird im echten Browser.
//
// Regel (Inhaberbefund 14.11.2026, PR 171, Commit b50d0c6: „Lege den Header rechts an den Button an"):
//  rechts  Abstand letztes Bedienelement → Glaskante ist eine Soll-Angabe: 12 px (--as-s-3), Toleranz ±1 px für Subpixel.
//          Vorher galt eine Untergrenze (≥ 20 px). Als Soll fällt jetzt beides auf: ein Rückfall auf 24 px und ein Kleben am Rand.
//          Bis 640 px Breite hat PR 171 nichts geändert: das Glas steht dort ebenfalls 12 px neben dem Inhaltsrand, die Knöpfe
//          dürfen bei 360 px aber hineinreichen (gemessen 10,66 px). Dort gilt die bisherige Untergrenze 8 px weiter, begrenzt
//          nach oben durch dasselbe Soll (≤ 13 px).
//  links   unverändert: Logo klebt nicht am Rand (≥ 20 px, bis 640 px Breite ≥ 8 px).
//  Glas    kein sichtbares Bedienelement ragt aus dem Glas, weder seitlich noch oben oder unten.
// Der senkrechte Abstand wird gemessen und ausgegeben (oben/unten: kleinster Wert über alle Bedienelemente), ist aber über
// „ragt nicht heraus" hinaus keine Bedingung. Gemessen 14.11.2026 über 640 px: Glas per scaleY(.8334) 60 px hoch, Projektknopf
// 48 px, also je 6 px über und unter dem Knopf (Logo 2 px) – nicht 12 px, wie der Kommentar zu PR 171 annimmt.
export const KOPF_RECHTS_SOLL=12;
export const KOPF_TOLERANZ=1;
export const KOPF_SCHMAL_BIS=640;

export function kopfleisteUrteil(breite,m){
 const gruende=[];
 const zahl=x=>typeof x==='number'&&Number.isFinite(x);
 if(!m||!['links','rechts','oben','unten'].every(k=>zahl(m[k])))return {ok:false,gruende:['Messung unvollständig']};
 const schmal=breite<=KOPF_SCHMAL_BIS,minLinks=schmal?8:20;
 if(m.links<minLinks)gruende.push(`links ${m.links} px, verlangt mindestens ${minLinks} px`);
 if(schmal){
  if(m.rechts<8)gruende.push(`rechts ${m.rechts} px, verlangt mindestens 8 px`);
  if(m.rechts>KOPF_RECHTS_SOLL+KOPF_TOLERANZ)gruende.push(`rechts ${m.rechts} px, verlangt höchstens ${KOPF_RECHTS_SOLL+KOPF_TOLERANZ} px`);
 }else if(Math.abs(m.rechts-KOPF_RECHTS_SOLL)>KOPF_TOLERANZ)gruende.push(`rechts ${m.rechts} px, Soll ${KOPF_RECHTS_SOLL} px ±${KOPF_TOLERANZ} px`);
 for(const k of ['links','rechts','oben','unten'])if(m[k]<0)gruende.push(`Inhalt ragt ${k} ${-m[k]} px aus dem Glas`);
 return {ok:gruende.length===0,gruende};
}

// Läuft im Browser (page.evaluate). Glas = ::before der Kopfleiste samt seiner Transformation; Inhalt = jedes sichtbare
// Bedienelement. Geschlossene Menüs zählen nicht (checkVisibility), sonst misst man verborgene Menüeinträge.
// `laufend` zählt laufende Übergänge an der Leiste und ihren Kindern; solange einer läuft, ist die Messung nicht gültig.
export function kopfleisteMessen(){
 const h=document.querySelector('.site-header');if(!h)return null;
 const bf=getComputedStyle(h,'::before'),hb=h.getBoundingClientRect(),px=v=>parseFloat(v)||0;
 let l=hb.left+px(bf.left),r=hb.right-px(bf.right),o=hb.top+px(bf.top),u=hb.bottom-px(bf.bottom);
 if(bf.transform&&bf.transform!=='none'){const m=new DOMMatrixReadOnly(bf.transform),[ox,oy]=bf.transformOrigin.split(' ').map(px),x0=l+ox,y0=o+oy;
  const p=[[l,o],[r,o],[l,u],[r,u]].map(([x,y])=>[x0+m.a*(x-x0)+m.c*(y-y0)+m.e,y0+m.b*(x-x0)+m.d*(y-y0)+m.f]);
  l=Math.min(...p.map(q=>q[0]));r=Math.max(...p.map(q=>q[0]));o=Math.min(...p.map(q=>q[1]));u=Math.max(...p.map(q=>q[1]));}
 const sichtbar=[...h.querySelectorAll('a,button,summary,select')].filter(e=>{const q=e.getBoundingClientRect(),s=getComputedStyle(e);
  return q.width>0&&q.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&(typeof e.checkVisibility!=='function'||e.checkVisibility());}).map(e=>e.getBoundingClientRect());
 if(!sichtbar.length)return null;
 const f=x=>Math.round(x*100)/100;
 const laufend=document.getAnimations().filter(a=>a instanceof CSSTransition&&a.playState==='running'&&a.effect?.target&&h.contains(a.effect.target)).length;
 return {links:f(Math.min(...sichtbar.map(q=>q.left))-l),rechts:f(r-Math.max(...sichtbar.map(q=>q.right))),oben:f(Math.min(...sichtbar.map(q=>q.top))-o),unten:f(u-Math.max(...sichtbar.map(q=>q.bottom))),
  geblaettert:document.querySelector('#atelier')?.dataset.scrolled==='true',laufend};
}

// Misst erst, wenn die Seite ruht: `bereit(wert)` ist wahr (kein laufender Übergang, erwarteter Zustand erreicht) und zwei
// aufeinanderfolgende Messungen sind gleich. Die Kopfleiste wechselt ihren Innenabstand mit `transition:padding`/`inset`
// (0,32 s); eine feste Wartezeit misst auf einer langsamen Laufzeit mitten im Übergang. Kommt die Seite in der Frist nicht
// zur Ruhe, ist `ruhig` falsch und der Aufrufer meldet das als Befund – es wird kein Zwischenwert als Messung ausgegeben.
export async function ruhigMessen(page,messen,{arg,bereit=()=>true,abstand=120,frist=6000}={}){
 const ende=Date.now()+frist;let vorher,wert,messungen=0;
 for(;;){wert=await page.evaluate(messen,arg);messungen++;const jetzt=JSON.stringify(wert);
  if(wert!=null&&bereit(wert)&&jetzt===vorher)return {wert,ruhig:true,messungen};
  if(Date.now()>=ende)return {wert,ruhig:false,messungen};
  vorher=jetzt;await page.waitForTimeout(abstand);}
}
