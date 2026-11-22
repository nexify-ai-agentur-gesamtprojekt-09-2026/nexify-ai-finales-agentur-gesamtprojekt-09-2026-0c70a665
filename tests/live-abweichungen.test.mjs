// Abweichungen der ausgelieferten Seite vom SOLL (Befund 17.11.2026, 23:50 Europe/Amsterdam, vor dem Vertriebsstart 18.11. 10:00).
// Die Tests lesen die LIVE-Auslieferung (LIVE_BASE, Standard https://nexifyai.de) und beschreiben das Soll.
// Rot = Abweichung belegt. Grün = Gegenprobe, dass die Prüfung nicht alles bemängelt.
// Aufruf: node --test tests/live-abweichungen.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const BASIS=(process.env.LIVE_BASE||'https://nexifyai.de').replace(/\/$/,'');
const speicher=new Map();

/* curl statt fetch: curl folgt der Proxy-Umgebung der Laufumgebung, node:fetch in Node 22 nicht.
   -L folgt Weiterleitungen (z. B. Standardhost → kanonischer Host); geprüft wird die letzte Antwort (Befund cubic, PR #219). */
function hole(pfad){
 if(speicher.has(pfad))return speicher.get(pfad);
 const roh=execFileSync('curl',['-s','-i','-L','--max-redirs','5','-m','25',BASIS+pfad],{encoding:'utf8',maxBuffer:32*1024*1024});
 const teile=roh.split('\r\n\r\n');
 while(teile.length>1&&/^HTTP\/[\d.]+ \d{3}/.test(teile[1]))teile.shift(); // Proxy-CONNECT und Weiterleitungen: nur der letzte Kopf zählt
 const kopf=teile.shift()||'';const body=teile.join('\r\n\r\n');
 const status=Number((kopf.match(/^HTTP\/[\d.]+ (\d{3})/)||[])[1]);
 const header={};for(const z of kopf.split('\r\n').slice(1)){const i=z.indexOf(':');if(i>0)header[z.slice(0,i).toLowerCase()]=z.slice(i+1).trim();}
 const antwort={status,header,body};speicher.set(pfad,antwort);return antwort;
}
const text=html=>html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
const meta=(html,schluessel)=>{const m=html.match(new RegExp(`<meta[^>]+(?:property|name)="${schluessel}"[^>]*content="([^"]*)"`,'i'))||html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${schluessel}"`,'i'));return m?m[1]:null;};

const OEFFENTLICH=['/','/impressum','/datenschutz','/cookies','/preise-ablauf','/produkte/one'];

/* ---------- Rot: belegte Abweichungen ---------- */

test('ROT · keine internen Prüfstatus-Sätze auf öffentlichen Seiten (Content-Verfassung: Arbeitsanweisungen nicht als Seitentext)',()=>{
 const verboten=['zur Prüfung und Freigabe','noch zur Prüfung','noch in Prüfung','ist noch in Prüfung','noch zur Freigabe','in dieser Kopie','noch nicht angeschlossen','bis zur gesonderten Endprüfung Entwürfe','Die ursprünglich übernommenen'];
 const funde=[];
 for(const pfad of OEFFENTLICH){const t=text(hole(pfad).body);for(const w of verboten)if(t.includes(w))funde.push(`${pfad}: „${w}“`);}
 assert.deepEqual(funde,[],'Interner Prüf- oder Übernahmestand steht als Seitentext im Netz');
});

test('ROT · Vorschau-Metadaten vollständig und auf eigener Domain (og:url, og:site_name, twitter:card, og:image)',()=>{
 const h=hole('/').body;const fehlt=[];
 for(const k of ['og:url','og:site_name','twitter:card'])if(!meta(h,k))fehlt.push(k);
 const bild=meta(h,'og:image');
 if(!bild)fehlt.push('og:image');
 else{const host=new URL(bild,BASIS+'/').hostname.replace(/^www\./,''),eigen=new URL(BASIS).hostname.replace(/^www\./,'');if(host!==eigen)fehlt.push(`og:image liegt nicht auf ${eigen}: ${host}`);}
 assert.deepEqual(fehlt,[]);
});

test('ROT · Organisation als strukturierte Daten (JSON-LD) auf der Startseite',()=>{
 const blocke=[...hole('/').body.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
 assert.ok(blocke.length>0,'kein JSON-LD-Block');
 assert.ok(blocke.some(b=>/"@type"\s*:\s*"(Organization|ProfessionalService|LocalBusiness)"/.test(b)),'kein Organization-Typ');
});

test('ROT · eine Adresse trägt überall genau einen sichtbaren Produktnamen (/produkte/one)',()=>{
 const h=hole('/').body;const namen=new Set();
 for(const m of h.matchAll(/<a\b[^>]*href="\/produkte\/one"[^>]*>([\s\S]*?)<\/a>/gi)){
  const kopf=m[1].match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i);const n=text(kopf?kopf[1]:m[1]).trim();
  if(n&&n.length<60)namen.add(n);
 }
 assert.equal(namen.size,1,`verschiedene Namen für /produkte/one: ${[...namen].join(' | ')}`);
});

test('ROT · Schutz vor Einbettung und Browser-Rechte per Header (frame-ancestors/X-Frame-Options, Permissions-Policy)',()=>{
 const k=hole('/').header;const fehlt=[];
 if(!k['x-frame-options']&&!/frame-ancestors/i.test(k['content-security-policy']||''))fehlt.push('X-Frame-Options oder CSP frame-ancestors');
 if(!k['permissions-policy'])fehlt.push('Permissions-Policy');
 if(!k['content-security-policy'])fehlt.push('Content-Security-Policy');
 assert.deepEqual(fehlt,[]);
});

/* ---------- Grün: Gegenproben (müssen bestehen, sonst misst der Test falsch) ---------- */

test('GRÜN · jede Adresse der Sitemap antwortet 200',()=>{
 const urls=[...hole('/sitemap.xml').body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]));
 const eigen=new URL(BASIS).hostname.replace(/^www\./,'');
 assert.deepEqual(urls.filter(u=>u.hostname.replace(/^www\./,'')!==eigen).map(u=>u.href),[],'Sitemap nennt fremde Hosts'); // www-Alias erlaubt (Befund cubic)
 const pfade=urls.map(u=>u.pathname+u.search);
 assert.ok(pfade.length>0,'Sitemap ohne Adressen');
 const schlecht=pfade.filter(u=>hole(u).status!==200).map(u=>`${u} → ${hole(u).status}`);
 assert.deepEqual(schlecht,[]);
});

test('GRÜN · Indexierbarkeit der Startseite folgt dem Freigabestand in config/site-map.json und ist kanonisch',()=>{
 // Befund cubic (PR #219): nicht pauschal „indexierbar“ fordern – das Indexierungs-Gate steht in der Konfiguration.
 const soll=JSON.parse(readFileSync(new URL('../config/site-map.json',import.meta.url),'utf8')).pages.find(p=>p.path==='/').metadata.indexability;
 const a=hole('/');const noindex=/noindex/i.test(a.header['x-robots-tag']||'')||/<meta[^>]+name="robots"[^>]*noindex/i.test(a.body);
 assert.equal(noindex,/noindex/.test(soll),`Soll laut Konfiguration: ${soll}`);
 const eigen=new URL(BASIS).hostname.replace(/^www\./,'').replace(/\./g,'\\.');
 assert.match(a.body,new RegExp(`<link rel="canonical" href="https://(?:www\\.)?${eigen}/"`)); // Standardhost leitet auf www weiter
 assert.match(a.body,/<html lang="de"/);
});

test('GRÜN · Navigation verweist auf keine toten Routen (/login, /signup)',()=>{
 assert.ok(!/href="\/(login|signup)"/.test(hole('/').body));
});

test('GRÜN · Markenname im Quelltext ist „NeXify AI" (X getrennt gefärbt, Text vollständig)',()=>{
 assert.match(hole('/').body,/Ne<span[^>]*>X<\/span>ify AI/);
});

test('GRÜN · Anbieterangaben im Impressum vollständig (Inhaber, Anschrift, KvK, USt-IdNr., Kontakt)',()=>{
 const t=text(hole('/impressum').body);
 for(const s of ['Pascal Courbois','Graaf van Loonstraat 1E','5921 JA Venlo','90483944','NL865786276B01','@','+31'])assert.ok(t.includes(s),s);
});
