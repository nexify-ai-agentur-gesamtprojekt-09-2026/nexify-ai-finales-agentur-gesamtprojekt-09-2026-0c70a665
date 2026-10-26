import handler from "../../../../../api/agent-runtime-status";
export const runtime="nodejs";
export async function POST(request:Request){return handler.fetch(request);}
