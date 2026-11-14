// Regel der Kopfleiste beim Blättern (tools/kopfleiste-regel.mjs). Inhaberbefund 14.11.2026, PR 171.
// Die Messwerte sind die der Produktion vom 14.11.2026; die Gegenproben zeigen, dass die Regel in beide Richtungen greift.
import assert from 'node:assert/strict';
import test from 'node:test';
import {kopfleisteUrteil,ruhigMessen} from '../tools/kopfleiste-regel.mjs';

const breit={links:24,rechts:12,oben:6,unten:6};
test('Stand nach PR 171 besteht auf jeder Breite',()=>{
 for(const w of [768,1120,1440,1835])assert.equal(kopfleisteUrteil(w,breit).ok,true,String(w));
 assert.equal(kopfleisteUrteil(1120,{...breit,links:23.99,rechts:11.99}).ok,true);
 assert.equal(kopfleisteUrteil(390,{links:12,rechts:12,oben:8,unten:8}).ok,true);
 assert.equal(kopfleisteUrteil(360,{links:12,rechts:10.66,oben:8,unten:8}).ok,true);
});
test('Rückfall auf 24 px rechts fällt auf (vor PR 171 bestand das)',()=>{
 const u=kopfleisteUrteil(1440,{...breit,rechts:24});assert.equal(u.ok,false);assert.match(u.gruende.join(),/rechts 24 px, Soll 12 px/);
 assert.equal(kopfleisteUrteil(1440,{...breit,rechts:20}).ok,false);
 assert.equal(kopfleisteUrteil(390,{links:12,rechts:24,oben:8,unten:8}).ok,false);
});
test('Toleranz ist ±1 px und nicht weiter',()=>{
 assert.equal(kopfleisteUrteil(1440,{...breit,rechts:13}).ok,true);assert.equal(kopfleisteUrteil(1440,{...breit,rechts:11}).ok,true);
 assert.equal(kopfleisteUrteil(1440,{...breit,rechts:13.01}).ok,false);assert.equal(kopfleisteUrteil(1440,{...breit,rechts:10.99}).ok,false);
});
test('Zwischenwerte eines laufenden Übergangs bestehen nicht',()=>{
 for(const rechts of [39.11,20.18,15.19])assert.equal(kopfleisteUrteil(1440,{...breit,rechts}).ok,false,String(rechts));
});
test('links gilt die bisherige Untergrenze weiter',()=>{
 assert.equal(kopfleisteUrteil(1440,{...breit,links:19.9}).ok,false);assert.equal(kopfleisteUrteil(1440,{...breit,links:32}).ok,true);
 assert.equal(kopfleisteUrteil(360,{links:7.9,rechts:12,oben:8,unten:8}).ok,false);
 assert.equal(kopfleisteUrteil(360,{links:12,rechts:7.9,oben:8,unten:8}).ok,false);
});
test('Inhalt ragt nirgends aus dem Glas',()=>{
 assert.equal(kopfleisteUrteil(1440,{...breit,oben:-1}).ok,false);assert.equal(kopfleisteUrteil(1440,{...breit,unten:-0.5}).ok,false);
 assert.equal(kopfleisteUrteil(768,{...breit,rechts:-7}).ok,false);
});
test('unvollständige Messung besteht nicht',()=>{
 assert.equal(kopfleisteUrteil(1440,null).ok,false);assert.equal(kopfleisteUrteil(1440,{links:24,rechts:NaN,oben:6,unten:6}).ok,false);
});
test('ruhigMessen wartet das Ende des Übergangs ab und meldet Unruhe',async()=>{
 const seite=werte=>{let i=0;return {evaluate:async()=>werte[Math.min(i++,werte.length-1)],waitForTimeout:async()=>{}};};
 const lauf=[{rechts:39.11,laufend:1},{rechts:15.19,laufend:1},{rechts:12,laufend:1},{rechts:12,laufend:0},{rechts:12,laufend:0}];
 const r=await ruhigMessen(seite(lauf),()=>{},{bereit:m=>m.laufend===0});
 assert.deepEqual([r.ruhig,r.wert.rechts,r.messungen],[true,12,5]);
 // Zwei gleiche Werte reichen nicht, solange ein Übergang läuft; ohne Ruhe in der Frist gibt es kein gültiges Ergebnis.
 const nie=await ruhigMessen(seite([{rechts:39.11,laufend:1}]),()=>{},{bereit:m=>m.laufend===0,frist:0});
 assert.equal(nie.ruhig,false);
 const leer=await ruhigMessen(seite([null]),()=>{},{frist:0});assert.equal(leer.ruhig,false);
});
