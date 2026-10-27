/** Read-only probe: can this deployment obtain a Vercel Connect token for PostHog? */
import { getToken } from '@vercel/connect';

const CONNECTOR = 'posthog/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665';
const HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return Response.json({ error: 'get_required' }, { status: 405, headers: { ...HEADERS, Allow: 'GET' } });
  }
  try {
    const token = await getToken(CONNECTOR, { subject: { type: 'app' } });
    // Only report whether a token was issued. Never return the token.
    return Response.json({ connect: 'ok', token_issued: typeof token === 'string' && token.length > 0 }, { headers: HEADERS });
  } catch (error) {
    const code = error instanceof Error ? error.name : 'unknown';
    return Response.json({ connect: 'error', code }, { status: 503, headers: HEADERS });
  }
}

export default { fetch: handler };
