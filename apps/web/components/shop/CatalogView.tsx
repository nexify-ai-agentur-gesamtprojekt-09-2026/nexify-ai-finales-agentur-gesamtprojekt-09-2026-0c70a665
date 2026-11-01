"use client";
import { useEffect, useState } from "react";
import { SiteLink, useSiteNavigate } from "../Router";
import { api, type Product } from "./api";
import { ProductCard } from "./ProductCard";

type Result = { items: Product[]; total: number; page: number; pages: number };

export function SearchBar({ initial = "", base = "/teileklar/suche" }: { initial?: string; base?: string }) {
  const navigate = useSiteNavigate(); const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return <form role="search" className="tk-search" onSubmit={event => { event.preventDefault(); navigate(base + (value.trim() ? "?q=" + encodeURIComponent(value.trim()) : "")); }} data-testid="shop-search-form">
    <label htmlFor="tk-search-input">Artikel suchen (Name, SKU oder EAN)</label>
    <div className="tk-search-row"><input id="tk-search-input" type="search" value={value} maxLength={120} onChange={event => setValue(event.target.value)} data-testid="shop-search-input" />
      <button className="primary-button" type="submit" data-testid="shop-search-submit">Suchen</button></div>
  </form>;
}

export default function CatalogView({ q = "", category, page = 1, base }: { q?: string; category?: number; page?: number; base: string }) {
  const [result, setResult] = useState<Result | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    setResult(null); setFailed(false);
    const params = new URLSearchParams({ q, page: String(page) }); if (category !== undefined) params.set("category", String(category));
    api<Result>("/api/shop/products?" + params).then(setResult).catch(() => setFailed(true));
  }, [q, category, page]);
  const link = (target: number) => base + "?" + new URLSearchParams({ ...(q ? { q } : {}), seite: String(target) });
  if (failed) return <p role="alert" className="tk-alert" data-testid="catalog-error">Der Katalog konnte nicht geladen werden. Bitte versuchen Sie es erneut.</p>;
  if (!result) return <p role="status" data-testid="catalog-loading">Artikel werden geladen …</p>;
  if (!result.total) return <div className="tk-empty" data-testid="catalog-empty"><h2>{q ? "Keine Artikel gefunden" : "Noch keine Artikel im Katalog"}</h2>
    <p>{q ? <>Zu „{q}“ wurde kein Artikel gefunden. Prüfen Sie die Schreibweise oder suchen Sie nach SKU bzw. EAN.</> : "Der Katalog wird gerade aufgebaut. Bitte schauen Sie später wieder vorbei."}</p>
    {q && <SiteLink href={base} className="content-action-link" data-testid="search-reset">Suche zurücksetzen</SiteLink>}</div>;
  return <div data-testid="catalog-results">
    <p className="tk-count" role="status" data-testid="catalog-count">{result.total} Artikel{q ? <> zu „{q}“</> : null} · Seite {result.page} von {result.pages}</p>
    <ul className="tk-grid">{result.items.map(product => <ProductCard key={product.id} product={product} />)}</ul>
    {result.pages > 1 && <nav className="tk-pagination" aria-label="Seiten" data-testid="pagination">
      {result.page > 1 ? <SiteLink href={link(result.page - 1)} data-testid="pagination-prev">← Zurück</SiteLink> : <span aria-hidden="true" />}
      <span>Seite {result.page} / {result.pages}</span>
      {result.page < result.pages ? <SiteLink href={link(result.page + 1)} data-testid="pagination-next">Weiter →</SiteLink> : <span aria-hidden="true" />}
    </nav>}
  </div>;
}
