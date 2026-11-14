/** Mandantengebunden abgelegte Trigger-Ereignisse des angemeldeten Nutzers · GET. Hinter NEXIFY_SUITE_COMPOSIO. */
import { handleEventsList } from '../../../../../lib/composio-trigger-routes.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return handleEventsList(request);
}
