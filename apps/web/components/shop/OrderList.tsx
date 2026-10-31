"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api, dateTime, money, STATUS_LABEL, type ApiError } from "./api";

type Row = { id: string; number: string; status: string; total_cents: number; created_at: string; items: number };

export default function OrderList() {
  const [rows, setRows] = useState<Row[] | null>(null), [state, setState] = useState<"ok" | "login" | "error">("ok");
  useEffect(() => { api<{ orders: Row[] }>("/api/shop/orders").then(data => setRows(data.orders)).catch((e: ApiError) => setState(e.status === 401 ? "login" : "error")); }, []);
  if (state === "login") return <div className="tk-empty" data-testid="orders-login-required"><h2>Bitte melden Sie sich an</h2><p>Ihre Bestellungen sehen Sie nach der Anmeldung in Ihrem Kundenkonto.</p><SiteLink href="/anmelden" className="content-action-link">Anmelden</SiteLink></div>;
  if (state === "error") return <p role="alert" className="tk-alert">Die Bestellungen konnten nicht geladen werden.</p>;
  if (!rows) return <p role="status">Bestellungen werden geladen …</p>;
  if (!rows.length) return <div className="tk-empty" data-testid="orders-empty"><h2>Noch keine Bestellungen</h2><SiteLink href="/teileklar/shop" className="content-action-link">Zum Shop</SiteLink></div>;
  return <table className="tk-table" data-testid="orders-table"><caption className="visually-hidden">Ihre Bestellungen</caption>
    <thead><tr><th scope="col">Bestellnummer</th><th scope="col">Datum</th><th scope="col">Artikel</th><th scope="col">Gesamt</th><th scope="col">Status</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} data-testid={"order-row-" + row.id}><td><SiteLink href={"/teileklar/bestellung/" + row.id}>{row.number}</SiteLink></td><td>{dateTime(row.created_at)}</td><td>{row.items}</td><td>{money(row.total_cents)}</td><td data-testid={"order-row-status-" + row.id}>{STATUS_LABEL[row.status] || row.status}</td></tr>)}</tbody></table>;
}
