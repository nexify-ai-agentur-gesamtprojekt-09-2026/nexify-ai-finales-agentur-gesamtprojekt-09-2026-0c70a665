/**
 * Anmeldung mit Bestätigungsmail (Double-Opt-in) · POST /api/mailing/subscribe
 * Logik und Schalter: mailing/consent.ts. Betrieb: docs/04-betrieb/einwilligungsweg-2026-11-14.md.
 */
import { handleSubscribe, mailingMethodNotAllowed } from '../../../../mailing/consent.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleSubscribe(request);
}

export async function GET(): Promise<Response> {
  return mailingMethodNotAllowed();
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
