/**
 * NeXify Live-Chat · POST /api/offers/{id}/order
 * Wandelt ein Angebot in eine VERBINDLICHE Bestellung um (Positionen eingefroren),
 * setzt das Angebot auf "ordered" und reicht die Bestellung optional an ein externes
 * Fulfilment weiter (ORDER_DISPATCH_URL per ENV, nicht erfunden).
 * 503 ohne Supabase. Erfordert accept_binding:true + valide Kundendaten.
 */
import type { OrderCustomer, OrderRequest } from '../../../../../lib/chat-contract';
import { createOrderFromOffer } from '../../../../../lib/chat-store';
import { fulfilOrder } from '../../../../../lib/fulfilment';
import { supabaseConfigured } from '../../../../../lib/supabase-rest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function bad(error: string, status: number): Response {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCustomer(raw: unknown): OrderCustomer | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  const name = typeof c.name === 'string' ? c.name.trim() : '';
  const email = typeof c.email === 'string' ? c.email.trim() : '';
  if (name.length < 2 || name.length > 200) return null;
  if (!EMAIL.test(email) || email.length > 320) return null;
  const out: OrderCustomer = { name, email };
  if (typeof c.company === 'string' && c.company.trim()) out.company = c.company.trim().slice(0, 200);
  if (typeof c.phone === 'string' && c.phone.trim()) out.phone = c.phone.trim().slice(0, 60);
  if (typeof c.note === 'string' && c.note.trim()) out.note = c.note.trim().slice(0, 4000);
  return out;
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!supabaseConfigured()) return bad('order_store_not_configured', 503);

  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F-]{10,80}$/.test(id)) return bad('invalid_offer_id', 422);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad('invalid_json', 400);
  }
  const req = (body ?? {}) as Partial<OrderRequest>;
  if (req.accept_binding !== true) return bad('binding_acceptance_required', 422);
  const customer = validateCustomer(req.customer);
  if (!customer) return bad('invalid_customer', 422);

  try {
    const order = await createOrderFromOffer(id, customer);
    // Bestehende Rechnungs-/Mailing-Logik anstoßen (best-effort, kippt die Bestellung nie).
    const fulfilment = await fulfilOrder(order);
    order.invoice_number = fulfilment.invoiceNumber;
    order.invoice_mailed = fulfilment.mailed;
    return Response.json(order, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'order_failed';
    const status = msg === 'offer_not_found' ? 404 : msg.startsWith('offer_') ? 409 : 502;
    return bad(msg, status);
  }
}
