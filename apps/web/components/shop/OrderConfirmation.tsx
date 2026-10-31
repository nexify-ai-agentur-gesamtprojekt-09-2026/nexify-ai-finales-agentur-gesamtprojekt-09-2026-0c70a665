"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, dateTime, money, notifyCart, STATUS_LABEL, type Cart, type Order } from "./api";
import { NextSteps, OrderTimeline } from "./OrderTimeline";

export default function OrderConfirmation({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null), [missing, setMissing] = useState(false), [tries, setTries] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    api<Order>("/api/shop/orders/" + encodeURIComponent(id)).then(data => {
      setOrder(data);
      if (data.status === "bezahlt") { sessionStorage.removeItem("tk-order-key"); api<Cart>("/api/shop/cart").then(c => notifyCart(c.count)).catch(() => undefined); }
      if (data.status === "zahlung_offen" && tries < 10) timer = setTimeout(() => setTries(t => t + 1), 3000);
    }).catch(() => setMissing(true));
    return () => clearTimeout(timer);
  }, [id, tries]);
  if (missing) return <div className="tk-empty" data-testid="order-missing"><h2>Bestellung nicht gefunden</h2><p>Diese Bestellung existiert nicht oder gehört nicht zu Ihrem Konto.</p></div>;
  if (!order) return <p role="status">Bestellung wird geladen …</p>;
  const paid = order.status === "bezahlt", pending = order.status === "zahlung_offen" && tries < 10;
  return <div className="tk-confirmation" data-testid="order-confirmation" data-status={order.status}>
    {paid && <div className="tk-success" role="status"><h2 data-testid="order-paid-title">Vielen Dank – Ihre Zahlung ist eingegangen</h2><p>Ihre Bestellung ist verbindlich und bezahlt. Eine Bestätigung kommt per E-Mail an {order.address?.email}.</p></div>}
    {paid && <OrderTimeline order={order} />}
    {paid && <NextSteps />}
    {pending && <p role="status" data-testid="order-pending">Die Zahlung wird bei Revolut geprüft …</p>}
    {!paid && !pending && <div role="alert" className="tk-alert" data-testid="order-not-completed"><h2>Zahlung nicht abgeschlossen</h2><p>Es wurde keine Zahlung verbucht. Ihr Warenkorb bleibt erhalten.</p>
      <div className="tk-actions"><SiteLink href="/teileklar/warenkorb" className="content-action-link" data-testid="order-back-to-cart">Zum Warenkorb</SiteLink>{order.status === "zahlung_offen" && order.checkout_url && <a className="content-action-link" href={order.checkout_url} data-testid="order-retry-payment">Zahlung fortsetzen</a>}</div></div>}
    <dl className="tk-facts"><dt>Bestellnummer</dt><dd data-testid="order-number">{order.number}</dd><dt>Status</dt><dd data-testid="order-status">{STATUS_LABEL[order.fulfilment || order.status] || order.status}</dd><dt>Bestellt am</dt><dd>{dateTime(order.created_at)}</dd>{order.paid_at && <><dt>Bezahlt am</dt><dd>{dateTime(order.paid_at)}</dd></>}</dl>
    <ul className="tk-review-lines" data-testid="order-lines">{order.lines.map(line => <li key={line.product_id}><span>{line.quantity} × {line.name} <small>(SKU {line.sku})</small></span><span>{money(line.line_cents)}</span></li>)}</ul>
    <dl className="tk-totals"><dt>Zwischensumme</dt><dd>{money(order.subtotal_cents)}</dd><dt>Versand</dt><dd>{money(order.shipping_cents)}</dd><dt className="is-total">Gesamt</dt><dd className="is-total" data-testid="order-total">{money(order.total_cents)}</dd><dt>enthaltene MwSt. ({order.vat_percent} %)</dt><dd>{money(order.vat_included_cents)}</dd></dl>
    <SiteLink href="/teileklar/bestellungen" className="content-action-link">Alle Bestellungen</SiteLink>
  </div>;
}
