import { NextResponse, type NextRequest } from "next/server";
import siteMap from "../../config/site-map.json";
import { canonicalPath, privateRoute } from "./auth/policy";
import { indexablePaths, indexingDecision, requestHosts, NOINDEX_HEADER_VALUE } from "./auth/indexing";

// Clerk removed (DECISIONS D-007): sessions are issued by the shop API (/api/auth). Private portal pages stay closed here.
const privateJson=(body:object,options:{status:number})=>NextResponse.json(body,{...options,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
const protectedPaths = siteMap.pages.filter(page => page.access.visibility !== "public" || page.access.auth_required).map(page => page.path).concat(['/api/internal/workspace']);
// Indexierung ist standardmäßig gesperrt; Regel und Freigabe: auth/indexing.ts, docs/04-betrieb/indexierung-freigabe-2026-11-14.md.
const indexable = indexablePaths(siteMap);
export default function proxy(request: NextRequest) {
  const path = canonicalPath(request.nextUrl.pathname);
  if (!path) return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  if (privateRoute(path, protectedPaths) && path.startsWith('/api/')) {
    return privateJson({error:'authentication_required'}, {status:401});
  }
  // Private page shells contain no private data. Existing API sessions enforce all
  // customer/admin permissions; an unverified cookie never grants data access here.
  const requestHeaders=new Headers(request.headers);
  const language=request.nextUrl.searchParams.get('lang');
  // Der TEILEKLAR-Shop (/teileklar) ist ein deutschsprachiger Markt und hat keine NL/FR/EN-Texte; `lang` des Dokuments muss zum
  // tatsächlichen Text passen (WCAG 3.1.1), sonst läse ein Screenreader deutschen Text mit niederländischer Aussprache.
  const germanOnly=path==='/teileklar'||path.startsWith('/teileklar/');
  requestHeaders.set('x-nexify-locale',!germanOnly&&language&&['de','nl','fr','en'].includes(language)?language:'de');
  const response=NextResponse.next({request:{headers:requestHeaders}});
  if(privateRoute(path,protectedPaths)){response.headers.set('Cache-Control','private, no-store');response.headers.set('Vary','Cookie, Authorization');response.headers.set('X-Robots-Tag','noindex, nofollow');}
  // Öffentliche Seiten: gesperrt, solange nicht Schalter, Produktion, freigegebener Host und indexierbarer Pfad zusammenkommen.
  // Die Sitemap selbst ist keine Seite und bleibt ohne Kopfzeile.
  else if(path!=='/sitemap.xml'&&!indexingDecision({path,hosts:requestHosts(request.headers.get('host'),request.headers.get('x-forwarded-host')),env:process.env,paths:indexable}).index)response.headers.set('X-Robots-Tag',NOINDEX_HEADER_VALUE);
  return response;
}
// Statische Dateien brauchen weder Sprach- noch Zugriffslogik und laufen nicht durch den Proxy: die Ordner aus
// public/ (media, fonts, glass) und Dateien direkt an der Wurzel mit Bild-, Schrift- oder Textendung. Kein geschützter
// Pfad beginnt mit diesen Ordnern, und unterhalb anderer Ordner (/api, /intern, /portal, /teileklar) greift der Proxy
// unabhängig von der Endung weiter.
export const config = { matcher: ["/((?!_next/static|_next/image|media/|fonts/|glass/|[^/]+\\.(?:ico|png|jpg|jpeg|webp|avif|gif|svg|txt|webmanifest|woff2?)$).*)"] };
