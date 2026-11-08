"use client";
import { useEffect, useId, useState } from "react";
import { SiteLink, useSiteNavigate } from "../Router";
import { api, type Product } from "./api";
import { ProductCard, useShopCopy } from "./ProductCard";

type Result = { items: Product[]; total: number; page: number; pages: number };

export function SearchBar({ initial = "", base = "/teileklar/suche" }: { initial?: string; base?: string }) {
  const { t } = useShopCopy();
  const navigate = useSiteNavigate(); const inputId = useId(); const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  return <form role="search" className="tk-search" onSubmit={event => { event.preventDefault(); navigate(base + (value.trim() ? "?q=" + encodeURIComponent(value.trim()) : "")); }} data-testid="shop-search-form">
    <label htmlFor={inputId}>{t("searchLabel")}</label>
    <div className="tk-search-row"><input id={inputId} type="search" value={value} maxLength={120} onChange={event => setValue(event.target.value)} data-testid="shop-search-input" />
      <button className="primary-button" type="submit" data-testid="shop-search-submit">{t("search")}</button></div>
  </form>;
}

export default function CatalogView({ q = "", category, page = 1, base }: { q?: string; category?: number; page?: number; base: string }) {
  const { t, number } = useShopCopy();
  const [result, setResult] = useState<Result | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    setResult(null); setFailed(false);
    const params = new URLSearchParams({ q, page: String(page) }); if (category !== undefined) params.set("category", String(category));
    const controller = new AbortController(); let current = true;
    api<Result>("/api/shop/products?" + params, { signal: controller.signal }).then(data => {
      if (!Array.isArray(data.items) || !Number.isSafeInteger(data.total) || data.total < 0 || !Number.isSafeInteger(data.page) || data.page < 1 || !Number.isSafeInteger(data.pages) || data.pages < 0) throw new Error("invalid_catalog_response");
      if (current) setResult(data);
    }).catch(() => { if (current && !controller.signal.aborted) setFailed(true); });
    return () => { current = false; controller.abort(); };
  }, [q, category, page]);
  const link = (target: number) => base + "?" + new URLSearchParams({ ...(q ? { q } : {}), seite: String(target) });
  if (failed) return <p role="alert" className="tk-alert" data-testid="catalog-error">{t("catalogError")}</p>;
  if (!result) return <p role="status" data-testid="catalog-loading">{t("catalogLoading")}</p>;
  if (!result.total) return <div className="tk-empty" data-testid="catalog-empty"><h2>{q ? t("noResults") : t("noItems")}</h2>
    <p>{q ? t("noResultsBody", { query: q }) : t("noItemsBody")}</p>
    {q && <SiteLink href={base} className="content-action-link" data-testid="search-reset">{t("resetSearch")}</SiteLink>}</div>;
  return <div data-testid="catalog-results">
    <p className="tk-count" role="status" data-testid="catalog-count">{t("resultCount", { count: number(result.total) })}{q ? t("querySuffix", { query: q }) : null} · {t("pageOf", { page: number(result.page), pages: number(result.pages) })}</p>
    <ul className="tk-grid">{result.items.map(product => <ProductCard key={product.id} product={product} />)}</ul>
    {result.pages > 1 && <nav className="tk-pagination" aria-label={t("pages")} data-testid="pagination">
      {result.page > 1 ? <SiteLink href={link(result.page - 1)} data-testid="pagination-prev">{t("previous")}</SiteLink> : <span aria-hidden="true" />}
      <span>{t("pageOf", { page: number(result.page), pages: number(result.pages) })}</span>
      {result.page < result.pages ? <SiteLink href={link(result.page + 1)} data-testid="pagination-next">{t("next")}</SiteLink> : <span aria-hidden="true" />}
    </nav>}
  </div>;
}
