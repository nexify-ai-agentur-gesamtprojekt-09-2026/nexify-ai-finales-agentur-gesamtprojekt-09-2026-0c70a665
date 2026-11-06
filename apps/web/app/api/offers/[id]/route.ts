/**
 * NeXify Live-Chat · GET /api/offers/{id}
 * Liefert ein individuelles Angebot samt Positionen. 503 ohne Supabase, 404 unbekannt.
 */
import { getOffer } from '../../../../lib/chat-store';
import { supabaseConfigured } from '../../../../lib/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!supabaseConfigured()) {
    return Response.json({ error: 'offer_store_not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F-]{10,80}$/.test(id)) {
    return Response.json({ error: 'invalid_offer_id' }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  }
  let offer;
  try {
    offer = await getOffer(id);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'offer_lookup_failed' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!offer) {
    return Response.json({ error: 'offer_not_found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(offer, { headers: { 'Cache-Control': 'no-store' } });
}
