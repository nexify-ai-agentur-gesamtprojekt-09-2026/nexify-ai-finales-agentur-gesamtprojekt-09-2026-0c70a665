// Befunde cubic (PR #219): data_as_of ist ein reiner Kalendertag. Kein UTC-Versatz (Vortag westlich von UTC),
// kein Absturz bei ungültigem Wert. Die Funktion wird aus WorkshopDetail.tsx gelesen und hier ausgeführt.
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../apps/web/components/shop/WorkshopDetail.tsx', import.meta.url),'utf8');
const start=src.indexOf('export function asOfDate');
if(start<0){console.log('asOfDate fehlt');process.exit(1);}
const body=src.slice(start,src.indexOf('\n}\n',start)+2).replace('export function asOfDate(value: string): string','function asOfDate(value)');
const asOfDate=eval('('+body+')');
const cases=[['2026-11-17','17.11.2026'],['2026-01-01','01.01.2026'],['17.11.2026','17.11.2026'],['kaputt','kaputt'],['2026-13-45','2026-13-45'],['2026-02-30','2026-02-30']];
let bad=0;for(const [v,e] of cases){const g=asOfDate(v);if(g!==e){bad++;console.log('FALSCH',v,'→',g,'erwartet',e)}}
console.log(bad?`${bad} Fehler`:'alle '+cases.length+' Fälle korrekt');process.exit(bad?1:0);
