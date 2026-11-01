"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

export default function CategoryTitle({ id }: { id: number }) {
  const [name, setName] = useState("");
  useEffect(() => { api<{ categories: { id: number; name: string }[] }>("/api/shop/categories").then(d => setName(d.categories.find(c => c.id === id)?.name || "")).catch(() => undefined); }, [id]);
  return name ? <h2 className="tk-category-name" data-testid="category-name">{name}</h2> : null;
}
