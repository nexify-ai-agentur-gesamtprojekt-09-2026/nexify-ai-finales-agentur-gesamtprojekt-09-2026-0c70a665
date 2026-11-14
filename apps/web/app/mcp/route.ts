import {handleMcpRequest} from "../../lib/mcp-server";
// Entwurf: Zugang nur mit Schalter NEXIFY_MCP und Kopf-Schluessel MCP_ACCESS_TOKEN (siehe lib/mcp-server.ts).
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request){return handleMcpRequest(request);}
// GET/DELETE/... laufen ebenfalls durch den Handler: Schalter aus -> 503, sonst 405 (kein GET-Stream, keine Sitzungen).
export async function GET(request:Request){return handleMcpRequest(request);}
export async function DELETE(request:Request){return handleMcpRequest(request);}
export async function PUT(request:Request){return handleMcpRequest(request);}
export async function PATCH(request:Request){return handleMcpRequest(request);}
