import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../apps/web/components/shop/product-story-copy.ts', import.meta.url),'utf8');
const fn=src.slice(src.indexOf('export function guideKind'),src.indexOf('type Copy')).replace('export function guideKind(text: string): GuideKind','function guideKind(text)');
const guideKind=eval('('+fn+')');
const cases=[['Klebeband schwarz 19 mm',"generic"],['Isolierband rot','generic'],['Dichtungsband','generic'],['Zierstreifen Chrom','generic'],['Lichtmaschine 14V','generic'],['Winterreifen 205/55 R16','tires'],['Reifen Sommer','tires'],['Ganzjahresreifen','tires'],['Banden zomer','tires'],['Bremsscheibe vorn','brakes'],['Starterbatterie 70Ah','battery'],['LED Scheinwerfer','lighting'],['Rückleuchte links','lighting'],['Ölfilter','filters'],['Stoßdämpfer hinten','suspension'],['Schalthebelknopf OMP','generic'],['Bremsleuchte LED','lighting'],['Bremslichtschalter','lighting'],['Bremslichtlampe P21W','lighting'],['Bremsbelag hinten','brakes'],['Remlicht','lighting']];
let bad=0;for(const [t,e] of cases){const g=guideKind(t);if(g!==e){bad++;console.log('FALSCH',t,'→',g,'erwartet',e)}}
console.log(bad?`${bad} Fehler`:'alle '+cases.length+' Fälle korrekt');process.exit(bad?1:0);
