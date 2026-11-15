import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {hostKind,requestHosts,shopHostOn,shopRobotsDisallow,SHOP_ORIGIN} from '../auth/shop-host';
// Die bisherige Datei, unverändert: Sie gilt ohne Schalter für jeden Host und mit Schalter für alle Hosts außer der Shop-Domain.
const AGENCY={rules:{userAgent:'*',allow:'/',disallow:['/api/','/intern/','/portal/','/teileklar/kasse','/teileklar/warenkorb','/teileklar/bestellung/','/teileklar/bestellungen','/teileklar/konto','/teileklar/partnerportal','/teileklar/nachbarschaft']},sitemap:'https://www.nexifyai.de/sitemap.xml'};
// Eigene Shop-Domain (auth/shop-host.ts, Standard AUS): Nur mit NEXIFY_SHOP_HOST und nur auf der Shop-Domain nennt die Datei dieselbe Sperrliste ohne
// /teileklar und die Sitemap der Shop-Domain. Ohne Schalter liest die Funktion keine Kopfzeilen und bleibt beim Build erzeugt.
export default async function robots():Promise<MetadataRoute.Robots>{
 if(shopHostOn(process.env)&&hostKind(requestHosts((await headers()).get('host'),(await headers()).get('x-forwarded-host')))==='shop')return{rules:{userAgent:'*',allow:'/',disallow:shopRobotsDisallow(AGENCY.rules.disallow)},sitemap:SHOP_ORIGIN+'/sitemap.xml'};
 return AGENCY;
}
