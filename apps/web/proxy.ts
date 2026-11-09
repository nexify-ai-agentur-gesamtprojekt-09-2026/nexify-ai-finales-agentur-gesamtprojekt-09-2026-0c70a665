import { NextResponse, type NextRequest } from "next/server";
import siteMap from "../../config/site-map.json";
import { canonicalPath, privateRoute } from "./auth/policy";

// Clerk removed (DECISIONS D-007): sessions are issued by the shop API (/api/auth). Private portal pages stay closed here.
const privateJson=(body:object,options:{status:number})=>NextResponse.json(body,{...options,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
const protectedPaths = siteMap.pages.filter(page => page.access.visibility !== "public" || page.access.auth_required).map(page => page.path).concat(['/api/internal/workspace']);
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
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
