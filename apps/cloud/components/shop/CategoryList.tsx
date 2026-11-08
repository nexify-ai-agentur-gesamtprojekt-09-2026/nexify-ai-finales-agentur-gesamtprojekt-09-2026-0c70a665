"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { useShopCopy } from "./ProductCard";
import { api } from "./api";

type Category = { id: number; name: string; count: number; root: boolean };

export default function CategoryList({ compact = false }: { compact?: boolean }) {
  const { t, number } = useShopCopy();
  const [rows, setRows] = useState<Category[] | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let current = true;
    api<{ categories: Category[] }>("/api/shop/categories", { signal: controller.signal }).then(data => {
      if (!Array.isArray(data.categories)) throw new Error("invalid_categories_response");
      if (current) setRows(data.categories);
    }).catch(() => { if (current && !controller.signal.aborted) setFailed(true); });
    return () => { current = false; controller.abort(); };
  }, []);
  if (failed) return <p role="alert" className="tk-alert">{t("categoriesError")}</p>;
  if (!rows) return <p role="status">{t("categoriesLoading")}</p>;
  if (!rows.length) return <div className="tk-empty" data-testid="categories-empty"><h2>{t("categoriesMissing")}</h2><p>{t("categoriesMissingBody")}</p></div>;
  return <ul className={"tk-categories" + (compact ? " is-compact" : "")} data-testid="category-list">{rows.map(c => <li key={c.id}>
    <SiteLink href={"/teileklar/kategorie/" + c.id} data-testid={"category-link-" + c.id}><strong>{c.name}</strong><span>{t("resultCount", { count: number(c.count) })}</span></SiteLink></li>)}</ul>;
}
