import {headers} from 'next/headers';
import siteMap from '../../../config/site-map.json';
import {indexablePaths,indexingDecision,requestHosts,robotsDirective,type RobotsDirective} from '../auth/indexing';
// Meta-Tag `robots` aus derselben Regel wie die Kopfzeile X-Robots-Tag (auth/indexing.ts, durchgesetzt in proxy.ts): gleicher Pfad,
// gleiche Hosts (Host und X-Forwarded-Host des Aufrufs), gleiche Umgebung, gleiche Katalogliste. Die Seiten werden je Aufruf
// gerendert (das Layout liest Kopfzeilen und Cookies), deshalb ist der Host hier bekannt. Nur auf dem Server verwendbar.
const indexable = indexablePaths(siteMap);
export async function pageRobots(path:string):Promise<RobotsDirective>{
 const request=await headers();
 return robotsDirective(indexingDecision({path,hosts:requestHosts(request.get('host'),request.get('x-forwarded-host')),env:process.env,paths:indexable}));
}
