"use client";
import { useEffect, useState } from "react";
import { SiteLink } from "../Router";
import { api } from "./api";

type Category = { id: number; name: string; count: number; root: boolean };

export default function CategoryList({ compact = false }: { compact?: boolean }) {
  const [rows, setRows] = useState<Category[] | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => { api<{ categories: Category[] }>("/api/shop/categories").then(data => setRows(data.categories)).catch(() => setFailed(true)); }, []);
  if (failed) return <p role="alert" className="tk-alert">Die Kategorien konnten nicht geladen werden.</p>;
  if (!rows) return <p role="status">Kategorien werden geladen …</p>;
  if (!rows.length) return <div className="tk-empty" data-testid="categories-empty"><h2>Noch keine Kategorien</h2><p>Der Katalog wird gerade aufgebaut.</p></div>;
  return <ul className={"tk-categories" + (compact ? " is-compact" : "")} data-testid="category-list">{rows.map(c => <li key={c.id}>
    <SiteLink href={"/teileklar/kategorie/" + c.id} data-testid={"category-link-" + c.id}><strong>{c.name}</strong><span>{c.count} Artikel</span></SiteLink></li>)}</ul>;
}
