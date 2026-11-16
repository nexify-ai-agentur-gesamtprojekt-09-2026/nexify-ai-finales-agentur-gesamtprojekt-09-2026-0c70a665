/**
 * Abmeldung mit einem Klick (RFC 8058) · POST /api/mailing/unsubscribe
 * Logik und Schalter: mailing/consent.ts. Betrieb: docs/04-betrieb/einwilligungsweg-2026-11-14.md.
 */
import { handleUnsubscribe, mailingMethodNotAllowed } from '../../../../mailing/consent.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return handleUnsubscribe(request);
}

export async function GET(): Promise<Response> {
  return mailingMethodNotAllowed();
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
