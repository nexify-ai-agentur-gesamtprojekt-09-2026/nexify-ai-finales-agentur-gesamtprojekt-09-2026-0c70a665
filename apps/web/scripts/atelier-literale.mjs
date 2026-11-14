#!/usr/bin/env node
// Nachweis: Welche Masse stehen in components/AtelierSystem.css noch als Zahl statt als Token?
// Gezaehlt werden px/ms/s-Werte in Deklarationen ausserhalb von Variablendefinitionen (--name:...).
// Nicht gezaehlt: 0, Haarlinien und Kantenwerte bis 3.5px (Lichtkante, Fokusring), Werte in var()/Media-/Container-Bedingungen.
// Aufruf: node scripts/atelier-literale.mjs [--liste]   · Ausgabe je Abschnitt; kein Gate, nur Zahl.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const datei=fileURLToPath(new URL('../components/AtelierSystem.css',import.meta.url));
const text=readFileSync(datei,'utf8').replace(/\/\*[\s\S]*?\*\//g,m=>/=====/.test(m)?m:'');
const liste=process.argv.includes('--liste');
const teile=text.split(/\/\* =====+\s*/).map(t=>{const [kopf,...rest]=t.split('*/');return {name:(rest.length?kopf:'Anfang').replace(/=+/g,'').trim().split('\n')[0].slice(0,70),css:rest.length?rest.join('*/'):kopf};});
let gesamt=0,gesamtDekl=0;const zeilen=[];
for(const teil of teile){
  let n=0,dekl=0;const funde=new Map();
  for(const block of teil.css.matchAll(/\{([^{}]*)\}/g)){
    for(const d of block[1].split(';')){
      const i=d.indexOf(':');if(i<0)continue;const eigenschaft=d.slice(0,i).trim(),wert=d.slice(i+1);
      if(eigenschaft.startsWith('--')||!wert.trim())continue;dekl++;
      const ohneVar=wert.replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g,'');
      for(const m of ohneVar.matchAll(/(?<![\w.#-])(\d*\.?\d+)(px|ms|s|rem)\b/g)){
        const zahl=parseFloat(m[1]);if(zahl===0||(m[2]==='px'&&zahl<=3.5))continue;
        n++;const k=eigenschaft+': '+m[0];funde.set(k,(funde.get(k)||0)+1);
      }
    }
  }
  gesamt+=n;gesamtDekl+=dekl;zeilen.push([teil.name,dekl,n,funde]);
}
for(const [name,dekl,n,funde] of zeilen){
  if(!dekl)continue;console.log(String(n).padStart(5)+' / '+String(dekl).padStart(5)+'  '+name);
  if(liste)for(const [k,c] of [...funde].sort((a,b)=>b[1]-a[1]).slice(0,12))console.log('          '+c+'x '+k);
}
console.log('-----\n'+String(gesamt).padStart(5)+' / '+String(gesamtDekl).padStart(5)+'  Zahlenwerte / Deklarationen gesamt');
