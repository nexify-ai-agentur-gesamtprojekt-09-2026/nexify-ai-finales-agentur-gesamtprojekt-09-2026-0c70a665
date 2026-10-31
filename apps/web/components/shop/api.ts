"use client";
export type ApiError = { status: number; error: string; fields?: Record<string, string>; body?: Record<string, unknown> };
export type Product = { id: string; name: string; sku: string; ean: string; image: string | null; stock: number; in_stock: boolean; price_cents: number; currency: string; category_id?: number };
export type ProductDetail = Product & { images: string[]; description: string; details: Record<string, string | number>; fitment_status: string; source: string; imported_at: string; category_name?: string; bigbuy_id: number; vat_percent: string };
export type Line = { product_id: string; name: string; sku: string; ean: string; image: string | null; quantity: number; unit_cents: number; line_cents: number; stock: number };
export type Change = { product_id: string; kind: "price" | "stock" | "unavailable"; name?: string; old?: number; new?: number };
export type Cart = { lines: Line[]; changes: Change[]; subtotal_cents: number; shipping_cents: number; total_cents: number; vat_included_cents: number; vat_percent?: string; currency: string; count: number; quote_hash?: string };
export type TimelineStep = { id: string; label: string; reached: boolean; at?: string | null };
export type Order = { id: string; number: string; status: string; timeline?: TimelineStep[]; fulfilment?: string | null; tracking_number?: string; carrier?: string; lines: Line[]; subtotal_cents: number; shipping_cents: number; total_cents: number; vat_included_cents: number; vat_percent: string; currency: string; created_at: string; paid_at?: string; checkout_url?: string; payment_state?: string; address: Record<string, string> };
export type Workshop = { id: string; name: string; street?: string; zip?: string; city?: string; region?: string; tel?: string; web?: string; hours?: string; lat?: number; lon?: number; distance_km?: number; kind_label: string };

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data && typeof data.detail === "object" ? data.detail : data) || {};
    throw { status: response.status, error: detail.error || "request_failed", fields: detail.fields, body: detail } as ApiError;
  }
  return data as T;
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
export const money = (cents: number) => euro.format(cents / 100);
export const dateTime = (iso?: string) => iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "–";
export const STATUS_LABEL: Record<string, string> = { bezahlt: "Bezahlt", zahlung_offen: "Zahlung offen", zahlung_nicht_abgeschlossen: "Zahlung nicht abgeschlossen", in_bearbeitung: "In Bearbeitung", versendet: "Versendet", zugestellt: "Zugestellt" };
export const CART_EVENT = "teileklar-cart-changed";
export const notifyCart = (count: number) => window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: count }));
