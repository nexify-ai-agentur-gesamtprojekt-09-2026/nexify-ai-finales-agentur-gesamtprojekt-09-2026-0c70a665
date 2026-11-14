import {headers} from 'next/headers';
import siteMap from '../../../config/site-map.json';
import {indexablePaths,indexingDecision,requestHosts,robotsDirective,type RobotsDirective} from './indexing';
// Meta-Tag `robots` aus derselben Regel wie die Kopfzeile X-Robots-Tag (auth/indexing.ts, durchgesetzt in proxy.ts): gleicher Pfad,
// gleiche Hosts (Host und X-Forwarded-Host des Aufrufs), gleiche Umgebung, gleiche Katalogliste (OA-164). Die Seiten werden je
// Aufruf gerendert (app/layout.tsx liest Kopfzeilen und Cookies, der Build führt sie als dynamisch), deshalb ist der Host hier
// bekannt. Nur auf dem Server verwendbar. Liegt neben indexing.ts und nicht unter lib/, weil lib/ als Verzeichnis an den
// Text-Resize-Beleg gebunden ist.
const indexable = indexablePaths(siteMap);
export async function pageRobots(path:string):Promise<RobotsDirective>{
 const request=await headers();
 return robotsDirective(indexingDecision({path,hosts:requestHosts(request.get('host'),request.get('x-forwarded-host')),env:process.env,paths:indexable}));
}
