import {discoveryOrigin,mcpEnabled,protectedResourceDocument} from "../../../lib/mcp-server";
// RFC 9728. Nur sichtbar, wenn der Schalter NEXIFY_MCP an ist; sonst 404 (nichts wird beworben).
// Ehrlich: kein authorization_servers-Eintrag, denn es gibt keinen OAuth-Autorisierungsserver.
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 if(!mcpEnabled(process.env))return new Response(JSON.stringify({error:"not_found"}),{status:404,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 return new Response(JSON.stringify(protectedResourceDocument(discoveryOrigin(request,process.env))),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=300"}});
}
