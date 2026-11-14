// Bewusst KEIN Metadaten-Dokument: Dieser Server betreibt keinen OAuth-Autorisierungsserver und verspricht keinen Token-Endpunkt.
// Zugang = Schalter NEXIFY_MCP + Kopf-Schluessel MCP_ACCESS_TOKEN. Ein OAuth-Weg braucht einen eigenen IdP (getrennte Sicherheitsentscheidung).
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 return new Response(JSON.stringify({error:"no_authorization_server",auth:"flag+header",oauth:false}),{status:404,headers:{"Content-Type":"application/json","Cache-Control":"public, max-age=300"}});
}
