/** Trigger des angemeldeten Suite-Nutzers anlegen (POST) und auflisten (GET). Hinter NEXIFY_SUITE_COMPOSIO. */
import { handleTriggerCreate, handleTriggerList } from '../../../../../lib/composio-trigger-routes.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleTriggerCreate(request);
}
export async function GET(request: Request): Promise<Response> {
  return handleTriggerList(request);
}
