import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import siteMap from "../../config/site-map.json";
import productionConfig from "../../config/clerk-production.json";
import { canonicalPath, clerkConfiguration, privateDecision, privateRoute } from "./auth/policy";

const privateJson=(body:object,options:{status:number})=>NextResponse.json(body,{...options,headers:{'Cache-Control':'private, no-store','Vary':'Cookie, Authorization'}});
const internalReadPaths = ['/api/internal/workspace'];
const protectedPaths = siteMap.pages.filter(page => page.access.visibility !== "public" || page.access.auth_required).map(page => page.path).concat(internalReadPaths);
const clerk = clerkMiddleware(async (auth, request) => {
  const path = canonicalPath(request.nextUrl.pathname);
  if (path && privateRoute(path, protectedPaths)) {
    const { userId } = await auth();
    if (privateDecision(true, userId) === "sign_in") {
      return privateJson({ error: "authentication_required", sign_in_path: "/anmelden" }, { status: 401 });
    }
    return privateJson({ error: "membership_required", message: "Konto verifiziert. Eine geprüfte Mandanten-, Seiten- und Rollenfreigabe fehlt." }, { status: 403 });
  }
  return NextResponse.next();
}, { authorizedParties: productionConfig.auth.authorized_parties });
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const path = canonicalPath(request.nextUrl.pathname);
  if (!path) return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  const protectedRoute = privateRoute(path, protectedPaths);
  const authRoute = privateRoute(path, ["/anmelden", "/registrieren"]);
  if (!protectedRoute && !authRoute) return NextResponse.next();
  if (!clerkConfiguration(process.env).ready) {
    if (protectedRoute) return privateJson({ error: "authentication_unavailable" }, { status: 503 });
    return NextResponse.next();
  }
  return clerk(request, event);
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
