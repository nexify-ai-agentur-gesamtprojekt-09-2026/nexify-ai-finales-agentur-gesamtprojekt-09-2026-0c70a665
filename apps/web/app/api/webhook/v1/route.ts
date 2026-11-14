/**
 * Composio-Webhook (V3) · POST /webhook/v1 bzw. /api/webhook/v1
 * Standardmäßig AUS (NEXIFY_SUITE_COMPOSIO): dann 503 composio_not_configured, nichts wird verarbeitet.
 * Der bei Composio eingetragene Pfad /webhook/v1 liegt in app/webhook/v1/route.ts und nutzt diese Handler.
 * Logik: lib/composio-webhook.ts.
 */
import { handleComposioWebhook, webhookMethodNotAllowed } from '../../../../lib/composio-webhook.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleComposioWebhook(request);
}

export async function GET(): Promise<Response> {
  return webhookMethodNotAllowed();
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
