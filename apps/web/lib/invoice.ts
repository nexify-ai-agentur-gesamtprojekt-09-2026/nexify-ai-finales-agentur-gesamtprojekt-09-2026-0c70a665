/**
 * Rechnungs-Glue: nutzt die BESTEHENDE XRechnung-Logik aus tools/rechnung.mjs
 * (UBL 2.1), keine Neuimplementierung. Server-only.
 */
import { xrechnung } from '../../../tools/rechnung.mjs';
import type { OrderDTO } from './chat-contract';

export interface GeneratedInvoice {
  nr: string;
  xml: string;
  betragEur: string;
}

/** XRechnung-XML für eine Bestellung erzeugen (Netto-Richtpreissumme aus dem Angebot). */
export function invoiceForOrder(order: OrderDTO): GeneratedInvoice | null {
  if (order.total_cents === null) return null; // kein Fixbetrag -> keine Rechnung
  const betragEur = (order.total_cents / 100).toFixed(2);
  const nr = `RG-${order.number}`;
  const xml = xrechnung({
    nr,
    kunde: order.customer.company || order.customer.name,
    betragEur,
    name: `NeXify Angebot ${order.offerId.slice(0, 8)}`,
    datum: order.created_at ?? new Date().toISOString(),
  });
  return { nr, xml, betragEur };
}
