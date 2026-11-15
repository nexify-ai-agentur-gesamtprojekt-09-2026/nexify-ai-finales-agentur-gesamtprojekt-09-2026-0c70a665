import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {shopHostOn,requestHosts} from '../auth/indexing';
import {hostKind,shopRobotsDisallow,SHOP_ORIGIN} from '../auth/shop-host';
const disallow=['/api/','/intern/','/portal/','/teileklar/kasse','/teileklar/warenkorb','/teileklar/bestellung/','/teileklar/bestellungen','/teileklar/konto','/teileklar/partnerportal','/teileklar/nachbarschaft'];
// Eigene Shop-Domain (auth/shop-host.ts, Standard AUS): Nur mit NEXIFY_SHOP_HOST und nur auf der Shop-Domain nennt die Datei die Sperrliste ohne
// /teileklar und die Sitemap der Shop-Domain. Ohne Schalter liest die Funktion keine Kopfzeilen und liefert dieselbe Datei wie bisher.
export default async function robots():Promise<MetadataRoute.Robots>{
 if(shopHostOn(process.env)&&hostKind(requestHosts((await headers()).get('host'),(await headers()).get('x-forwarded-host')))==='shop')return{rules:{userAgent:'*',allow:'/',disallow:shopRobotsDisallow(disallow)},sitemap:SHOP_ORIGIN+'/sitemap.xml'};
 return{rules:{userAgent:'*',allow:'/',disallow},sitemap:'https://www.nexifyai.de/sitemap.xml'};
}
