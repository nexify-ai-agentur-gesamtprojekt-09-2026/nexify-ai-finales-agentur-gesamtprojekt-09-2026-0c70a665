/** Connect-Link (Hosted Authentication) für den angemeldeten Suite-Nutzer · POST. Hinter NEXIFY_SUITE_COMPOSIO. */
import { handleConnect } from '../../../../../lib/composio-routes.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleConnect(request);
}
