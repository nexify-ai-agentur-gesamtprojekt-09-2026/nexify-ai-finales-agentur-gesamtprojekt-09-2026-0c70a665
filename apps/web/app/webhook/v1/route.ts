/**
 * Öffentlicher Webhook-Pfad /webhook/v1 (so bei Composio eingetragen). Er nutzt dieselbe Route wie
 * /api/webhook/v1; die Logik steht nur einmal in lib/composio-webhook.ts. Standardmäßig aus (NEXIFY_SUITE_COMPOSIO).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { POST, GET, PUT, PATCH, DELETE } from '../../api/webhook/v1/route.ts';
