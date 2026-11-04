"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, dateTime, notifyCart, STATUS_LABEL, type Cart, type Order } from "./api";
import { NextSteps, OrderTimeline } from "./OrderTimeline";
import { useShopCopy } from "./ProductCard";

export default function OrderConfirmation({ id }: { id: string }) {
  const { t, money, number } = useShopCopy();
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
  if (missing) return <div className="tk-empty" data-testid="order-missing"><h2>{t("orderMissing")}</h2><p>{t("orderMissingBody")}</p><SiteLink href="/teileklar/bestellungen" className="content-action-link">{t("allOrders")}</SiteLink></div>;
  if (!order) return <p role="status">{t("orderLoading")}</p>;
  const paid = order.status === "bezahlt", pending = order.status === "zahlung_offen" && tries < 10;
  const rate = Number(order.vat_percent);
  // Only states the server reports: the success copy appears for a confirmed payment, the timeline shows reached steps only.
  return <div className="tk-confirmation" data-testid="order-confirmation" data-status={order.status}>
    {paid && <div className="tk-success" role="status"><h2 data-testid="order-paid-title">{t("orderThanks")}</h2>
      <p data-testid="order-paid-body">{order.address?.email ? t("orderThanksBody", { number: order.number, email: order.address.email }) : t("orderThanksBodyNoMail", { number: order.number })}</p></div>}
    {paid && <OrderTimeline order={order} />}
    {paid && <NextSteps />}
    {pending && <p role="status" data-testid="order-pending">{t("orderPending")}</p>}
    {!paid && !pending && <div role="alert" className="tk-alert" data-testid="order-not-completed"><h2>{t("orderNotCompleted")}</h2><p>{t("orderNotCompletedBody")}</p>
      <div className="tk-actions"><SiteLink href="/teileklar/warenkorb" className="content-action-link" data-testid="order-back-to-cart">{t("goCart")}</SiteLink>{order.status === "zahlung_offen" && order.checkout_url && <a className="content-action-link" href={order.checkout_url} data-testid="order-retry-payment">{t("orderRetryPayment")}</a>}</div></div>}
    <dl className="tk-facts"><dt>{t("orderNumber")}</dt><dd data-testid="order-number">{order.number}</dd><dt>{t("orderStatus")}</dt><dd data-testid="order-status">{STATUS_LABEL[order.fulfilment || order.status] || order.status}</dd><dt>{t("orderedAt")}</dt><dd>{dateTime(order.created_at)}</dd>{order.paid_at && <><dt>{t("paidAt")}</dt><dd>{dateTime(order.paid_at)}</dd></>}</dl>
    <ul className="tk-review-lines" data-testid="order-lines">{order.lines.map(line => <li key={line.product_id}><span>{number(line.quantity)} × {line.name} <small>({t("sku")} {line.sku})</small></span><span>{money(line.line_cents)}</span></li>)}</ul>
    <dl className="tk-totals"><dt>{t("subtotal")}</dt><dd>{money(order.subtotal_cents)}</dd><dt>{t("shippingCost")}</dt><dd>{money(order.shipping_cents)}</dd><dt className="is-total">{t("totalInclVat")}</dt><dd className="is-total" data-testid="order-total">{money(order.total_cents)}</dd><dt>{order.vat_percent && Number.isFinite(rate) ? t("vatIncludedRate", { rate: number(rate) }) : t("vatIncluded")}</dt><dd>{money(order.vat_included_cents)}</dd></dl>
    {paid && <section className="tk-side-path" aria-labelledby="order-workshop-title" data-testid="order-workshop-path"><h3 id="order-workshop-title">{t("orderWorkshopTitle")}</h3><p>{t("orderWorkshopBody")}</p><SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid="order-workshop-link">{t("findWorkshop")}</SiteLink></section>}
    <SiteLink href="/teileklar/bestellungen" className="content-action-link">{t("allOrders")}</SiteLink>
  </div>;
}
