// Reference frontend uses the same public, zero-model Request/Response handler.
import handler from "../../../../../api/agent-chat";
export const runtime="nodejs";
export async function POST(request:Request){return handler.fetch(request);}
