import { NextResponse, type NextRequest } from "next/server";
import siteMap from "../../config/site-map.json";
import { canonicalPath, privateRoute } from "./auth/policy";

// Clerk removed (DECISIONS D-007): sessions are issued by the shop API (/api/auth). Private portal pages stay closed here.
const privateJson=(body:object,options:{status:number})=>NextResponse.json(body,{...options,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
const protectedPaths = siteMap.pages.filter(page => page.access.visibility !== "public" || page.access.auth_required).map(page => page.path).concat(['/api/internal/workspace']);
export default function proxy(request: NextRequest) {
  const path = canonicalPath(request.nextUrl.pathname);
  if (!path) return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  if (privateRoute(path, protectedPaths)) {
    if (!request.cookies.get("tk_session")) return privateJson({ error: "authentication_required", sign_in_path: "/anmelden" }, { status: 401 });
    return privateJson({ error: "membership_required", message: "Konto verifiziert. Eine geprüfte Mandanten-, Seiten- und Rollenfreigabe fehlt." }, { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
