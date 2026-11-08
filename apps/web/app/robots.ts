import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',allow:'/',disallow:['/api/','/intern/','/portal/','/teileklar/kasse','/teileklar/warenkorb','/teileklar/bestellung/','/teileklar/bestellungen','/teileklar/konto','/teileklar/partnerportal','/teileklar/nachbarschaft']},sitemap:'https://www.nexifyai.de/sitemap.xml'};}
