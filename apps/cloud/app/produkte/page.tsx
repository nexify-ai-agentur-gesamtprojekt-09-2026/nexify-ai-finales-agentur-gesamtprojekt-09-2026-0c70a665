import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS } from "@/lib/content";

export const metadata: Metadata = { title: "Produkte" };

const ANCHORS = ["suite", "agentic", "api", "teileklar"];

export default function ProduktePage() {
  return (
    <section id="top" style={{ paddingTop: 24 }}>
      <div className="sec-head">
        <p className="eyebrow">Produktwelt</p>
        <h2>Produkte & Arbeitsbereiche</h2>
        <p className="lead">
          Rund um die Agenturleistung entsteht eine eigene Produktwelt: ein Arbeitsbereich, ein
          aufgabenbezogener Agent, eine API und ein eigenständiger Fahrzeugteile-Bereich.
        </p>
      </div>
      <div className="grid grid-2">
        {PRODUCTS.map((p, i) => (
          <div className="card tile" id={ANCHORS[i]} key={p.title} style={{ scrollMarginTop: 90 }}>
            <p className="eyebrow">{String(i + 1).padStart(2, "0")}</p>
            <h3 style={{ marginTop: 10 }}>{p.title}</h3>
            <p>{p.body}</p>
            <Link href={p.href} className="tlink">{p.action} →</Link>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 28 }}>
        <Link href="/kontakt" className="btn btn-primary">Produkt oder Vorhaben besprechen →</Link>
      </div>
    </section>
  );
}
