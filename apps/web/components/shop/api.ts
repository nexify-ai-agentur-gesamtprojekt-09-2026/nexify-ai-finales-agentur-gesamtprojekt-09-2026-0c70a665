"use client";
export type ApiError = { status: number; error: string; fields?: Record<string, string>; body?: Record<string, unknown> };
export type Product = { id: string; name: string; sku: string; ean: string; image: string | null; image_status?: "supplier_original" | "unavailable"; stock: number | null; in_stock: boolean | null; stock_status?: "reported" | "unknown"; price_cents: number | null; price_status?: "released" | "not_released"; currency: string; category_id?: number };
export type ProductDetail = Product & { images: string[]; description: string; details: Record<string, string | number>; fitment_status: string; source: string; imported_at: string; category_name?: string; bigbuy_id: number; vat_percent: string };
export type Line = { product_id: string; name: string; sku: string; ean: string; image: string | null; quantity: number; unit_cents: number; line_cents: number; stock: number };
export type Change = { product_id: string; kind: "price" | "stock" | "unavailable"; name?: string; old?: number; new?: number };
export type Cart = { lines: Line[]; changes: Change[]; subtotal_cents: number; shipping_cents: number; total_cents: number; vat_included_cents: number; vat_percent?: string; currency: string; count: number; quote_hash?: string };
export type TimelineStep = { id: string; label: string; reached: boolean; at?: string | null };
export type Order = { id: string; number: string; status: string; timeline?: TimelineStep[]; fulfilment?: string | null; tracking_number?: string; carrier?: string; lines: Line[]; subtotal_cents: number; shipping_cents: number; total_cents: number; vat_included_cents: number; vat_percent: string; currency: string; created_at: string; paid_at?: string; checkout_url?: string; payment_state?: string; address: Record<string, string> };
export type Workshop = { id: string; name: string; street?: string; zip?: string; city?: string; region?: string; tel?: string; web?: string; hours?: string; lat?: number; lon?: number; distance_km?: number; kind_label: string };

// Deliberately excludes drafts, local generated assets and arbitrary image proxies.
// Keep this exact host/path contract aligned with catalog_api.supplier_image.
export function supplierImageSource(value: string | null | undefined): string | null {
  if (!value || value.length > 2048 || /[\s\x00-\x1f\x7f\\]/.test(value)) return null;
  if (!/^https:\/\/cdnbigbuy\.com\/images\/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(value)) return null;
  if (!value.startsWith("https://cdnbigbuy.com/")) return null;
  const path = value.slice("https://cdnbigbuy.com".length);
  return path.split("/").some(part => part === "." || part === "..") ? null : value;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const response = await fetch(path, { cache: "no-store", credentials: "same-origin", ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body });
  if (response.status === 204 && response.ok) return null as T;
  // Static-host SPA fallbacks can answer an API path with HTTP 200 + HTML.
  // That is an unavailable service, never a successful empty catalogue.
  const contentType = response.headers.get("content-type") || "";
  if (!/^application\/(?:[\w.-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
    throw { status: response.status, error: "invalid_json_response" } as ApiError;
  }
  let data;
  try { data = await response.json(); }
  catch { throw { status: response.status, error: "invalid_json_response" } as ApiError; }
  if (!data || typeof data !== "object") throw { status: response.status, error: "invalid_json_response" } as ApiError;
  if (!response.ok) {
    const detail = (data && typeof data.detail === "object" ? data.detail : data) || {};
    throw { status: response.status, error: detail.error || "request_failed", fields: detail.fields, body: detail } as ApiError;
  }
  return data as T;
}

// Fixed configuration codes of apps/shop-api/vercel_app.py (runtime_binding_unavailable.reason).
// database_metadata_unavailable is deliberately absent: a configured but unreachable
// database is a connection failure, not a missing setup.
const UNCONFIGURED_REASONS = new Set(["project_binding_unverified", "database_binding_missing_or_unsuitable", "database_configuration_conflict",
  "database_namespace_conflict", "database_namespace_unapproved", "public_origin_unbound", "tax_configuration_unbound", "payment_mode_unbound",
  "namespace_schema_unbound", "required_index_unverified"]);

/** "unconfigured" only for an explicit JSON 503 setup answer; everything else (network, HTML, 5xx) is "unavailable". */
export function catalogFailure(error: unknown): "unconfigured" | "unavailable" {
  const failure = error as Partial<ApiError> | null;
  if (!failure || typeof failure !== "object" || failure.status !== 503) return "unavailable";
  if (failure.error === "catalog_not_configured") return "unconfigured";
  const reason = failure.body?.reason;
  return failure.error === "runtime_binding_unavailable" && typeof reason === "string" && UNCONFIGURED_REASONS.has(reason) ? "unconfigured" : "unavailable";
}

/** One key per add-to-cart intent; reused only to retry the same intent after an unknown outcome. */
export function cartIntentKey() {
  return "add:" + crypto.randomUUID();
}

const euro = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
export const money = (cents: number) => euro.format(cents / 100);
export const dateTime = (iso?: string) => iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "–";
export const STATUS_LABEL: Record<string, string> = { bezahlt: "Bezahlt", zahlung_offen: "Zahlung offen", zahlung_nicht_abgeschlossen: "Zahlung nicht abgeschlossen", in_bearbeitung: "In Bearbeitung", versendet: "Versendet", zugestellt: "Zugestellt" };
export const CART_EVENT = "teileklar-cart-changed";
export const notifyCart = (count: number) => window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: count }));
