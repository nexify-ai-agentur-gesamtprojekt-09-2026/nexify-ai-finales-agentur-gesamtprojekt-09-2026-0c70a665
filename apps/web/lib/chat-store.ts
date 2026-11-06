/**
 * Server-only Domänen-Store für Chat → Angebot → Bestellung.
 * Baut auf supabase-rest.ts (PostgREST, Schema "chat") und dem Client-Vertrag auf.
 * Alle Schreibzugriffe laufen serverseitig mit Service-Role (RLS umgangen).
 */
import type { OfferDTO, OfferItemDTO, OrderCustomer, OrderDTO, ChatLocale } from './chat-contract';
import { offerTotalCents } from './chat-contract';
import { sbInsert, sbSelect, sbUpdate, supabaseConfigured } from './supabase-rest';

type Row = Record<string, unknown>;

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function intOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v);
  if (typeof v === 'string' && /^-?\d+$/.test(v)) return parseInt(v, 10);
  return null;
}

/** Modell-Rohtext nach einem eingebetteten Angebots-Entwurf durchsuchen. */
export interface OfferDraft {
  title: string;
  summary: string;
  currency: string;
  valid_until: string | null;
  items: OfferItemDTO[];
}

/**
 * Erwartetes Format im Assistententext (ein Block):
 * ```offer
 * { "title": "...", "summary": "...", "currency": "EUR", "valid_until": "2026-12-31",
 *   "items": [ { "description": "...", "quantity": 1, "unit_cents": 44900 } ] }
 * ```
 */
export function parseOfferDraft(text: string): OfferDraft | null {
  const fence = /```offer(?:-json)?\s*([\s\S]*?)```/i.exec(text);
  if (!fence) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fence[1].trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  const rawItems = Array.isArray(o.items) ? o.items : [];
  const items: OfferItemDTO[] = [];
  rawItems.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const r = raw as Record<string, unknown>;
    const description = str(r.description).slice(0, 2000);
    if (!description) return;
    const quantity = intOrNull(r.quantity) ?? 1;
    const unit_cents = intOrNull(r.unit_cents);
    items.push({
      position: idx + 1,
      description,
      quantity: quantity > 0 ? quantity : 1,
      unit_cents,
      line_cents: unit_cents === null ? null : unit_cents * (quantity > 0 ? quantity : 1),
    });
  });
  if (items.length === 0) return null;
  return {
    title: str(o.title, 'Individuelles Angebot').slice(0, 300),
    summary: str(o.summary).slice(0, 4000),
    currency: str(o.currency, 'EUR').slice(0, 8),
    valid_until: typeof o.valid_until === 'string' ? o.valid_until.slice(0, 10) : null,
    items,
  };
}

/** Strip des Angebots-Blocks aus dem sichtbaren Text (Block wird strukturiert ausgeliefert). */
export function stripOfferFence(text: string): string {
  return text.replace(/```offer(?:-json)?\s*[\s\S]*?```/i, '').trim();
}

export async function ensureConversation(
  conversationId: string | undefined,
  meta: { locale?: ChatLocale; pagePath?: string },
): Promise<string> {
  if (!supabaseConfigured()) {
    // Kein DB-Zwang: stabile Pseudo-ID, damit der Client eine Konversation führen kann.
    return conversationId ?? `local-${crypto.randomUUID()}`;
  }
  if (conversationId && !conversationId.startsWith('local-')) {
    const found = await sbSelect<Row>(`chat_conversations?id=eq.${encodeURIComponent(conversationId)}&select=id`);
    if (found.length > 0) return conversationId;
  }
  const inserted = await sbInsert<Row>('chat_conversations', {
    locale: meta.locale ?? 'de',
    page_path: meta.pagePath ?? '/',
    status: 'open',
  });
  return str(inserted[0]?.id);
}

export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  model: string | null,
): Promise<void> {
  if (!supabaseConfigured() || conversationId.startsWith('local-')) return;
  await sbInsert('chat_messages', { conversation_id: conversationId, role, content, model });
}

function rowToOffer(offer: Row, items: Row[]): OfferDTO {
  const mapped: OfferItemDTO[] = items
    .map((it) => ({
      position: intOrNull(it.position) ?? 0,
      description: str(it.description),
      quantity: intOrNull(it.quantity) ?? 1,
      unit_cents: intOrNull(it.unit_cents),
      line_cents: intOrNull(it.line_cents),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    id: str(offer.id),
    conversationId: str(offer.conversation_id),
    status: (str(offer.status, 'proposed') as OfferDTO['status']),
    title: str(offer.title),
    summary: str(offer.summary),
    currency: str(offer.currency, 'EUR'),
    items: mapped,
    est_total_cents: intOrNull(offer.est_total_cents) ?? offerTotalCents(mapped),
    valid_until: typeof offer.valid_until === 'string' ? offer.valid_until : null,
    created_at: typeof offer.created_at === 'string' ? offer.created_at : undefined,
  };
}

/** Angebot aus einem Entwurf persistieren (Status "proposed"). null, wenn DB fehlt. */
export async function persistOffer(conversationId: string, draft: OfferDraft): Promise<OfferDTO | null> {
  if (!supabaseConfigured() || conversationId.startsWith('local-')) {
    // Ohne DB: in-memory-DTO zurückgeben, damit der Client das Angebot zeigen kann.
    const total = offerTotalCents(draft.items);
    return {
      id: `local-${crypto.randomUUID()}`,
      conversationId,
      status: 'proposed',
      title: draft.title,
      summary: draft.summary,
      currency: draft.currency,
      items: draft.items,
      est_total_cents: total,
      valid_until: draft.valid_until,
    };
  }
  const total = offerTotalCents(draft.items);
  const offerRows = await sbInsert<Row>('chat_offers', {
    conversation_id: conversationId,
    status: 'proposed',
    title: draft.title,
    summary: draft.summary,
    currency: draft.currency,
    est_total_cents: total,
    valid_until: draft.valid_until,
  });
  const offerId = str(offerRows[0]?.id);
  const itemRows = draft.items.map((it) => ({
    offer_id: offerId,
    position: it.position,
    description: it.description,
    quantity: it.quantity,
    unit_cents: it.unit_cents,
    line_cents: it.line_cents,
  }));
  const insertedItems = await sbInsert<Row>('chat_offer_items', itemRows);
  return rowToOffer(offerRows[0], insertedItems);
}

export async function getOffer(offerId: string): Promise<OfferDTO | null> {
  if (!supabaseConfigured()) return null;
  const offers = await sbSelect<Row>(`chat_offers?id=eq.${encodeURIComponent(offerId)}&select=*`);
  if (offers.length === 0) return null;
  const items = await sbSelect<Row>(`chat_offer_items?offer_id=eq.${encodeURIComponent(offerId)}&select=*`);
  return rowToOffer(offers[0], items);
}

export interface CreateOrderResult {
  order: OrderDTO;
}

/**
 * Verbindliche Bestellung aus einem Angebot erzeugen.
 * Friert die Positionen ein (Snapshot), setzt das Angebot auf "ordered".
 * Optionaler Außenversand an ORDER_DISPATCH_URL (per ENV, nicht erfunden).
 */
export async function createOrderFromOffer(
  offerId: string,
  customer: OrderCustomer,
): Promise<OrderDTO> {
  const offer = await getOffer(offerId);
  if (!offer) throw new Error('offer_not_found');
  if (offer.status === 'ordered') throw new Error('offer_already_ordered');
  if (offer.status === 'cancelled') throw new Error('offer_cancelled');

  const total = offerTotalCents(offer.items);

  const orderRows = await sbInsert<Row>('chat_orders', {
    offer_id: offer.id,
    conversation_id: offer.conversationId,
    status: 'placed',
    customer,
    items: offer.items,
    total_cents: total,
    currency: offer.currency,
    dispatched: false,
  });
  const orderRow = orderRows[0] ?? {};
  const orderId = str(orderRow.id);

  await sbUpdate(`chat_offers?id=eq.${encodeURIComponent(offer.id)}`, { status: 'ordered' });
  await sbInsert('chat_order_events', {
    order_id: orderId,
    kind: 'placed',
    payload: { customer_email: customer.email },
  });

  let dispatched = false;
  const dispatchUrl = process.env.ORDER_DISPATCH_URL;
  if (dispatchUrl) {
    try {
      const res = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.ORDER_DISPATCH_TOKEN ? { Authorization: `Bearer ${process.env.ORDER_DISPATCH_TOKEN}` } : {}),
        },
        body: JSON.stringify({ order_id: orderId, offer_id: offer.id, customer, items: offer.items, total_cents: total, currency: offer.currency }),
        cache: 'no-store',
      });
      dispatched = res.ok;
      await sbInsert('chat_order_events', {
        order_id: orderId,
        kind: res.ok ? 'dispatched' : 'dispatch_failed',
        payload: { status: res.status },
      });
      if (res.ok) await sbUpdate(`chat_orders?id=eq.${encodeURIComponent(orderId)}`, { status: 'dispatched', dispatched: true });
    } catch (e) {
      await sbInsert('chat_order_events', {
        order_id: orderId,
        kind: 'dispatch_failed',
        payload: { error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  return {
    id: orderId,
    number: str(orderRow.number, orderId),
    offerId: offer.id,
    conversationId: offer.conversationId,
    status: dispatched ? 'dispatched' : 'placed',
    customer,
    items: offer.items,
    total_cents: total,
    currency: offer.currency,
    dispatched,
    created_at: typeof orderRow.created_at === 'string' ? orderRow.created_at : undefined,
  };
}
