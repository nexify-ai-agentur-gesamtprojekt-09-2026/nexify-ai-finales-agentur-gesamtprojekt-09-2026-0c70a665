/** OAuth user verification: Rücksprung von Composio · GET. Hinter NEXIFY_SUITE_COMPOSIO. */
import { handleVerify } from '../../../../../lib/composio-routes.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return handleVerify(request);
}
