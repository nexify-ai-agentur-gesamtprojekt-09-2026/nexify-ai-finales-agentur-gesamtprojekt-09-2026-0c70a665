import type { Metadata } from "next";
import Link from "next/link";
import BudgetCalculator from "@/components/BudgetCalculator";
import { DAY_RATE } from "@/lib/content";

export const metadata: Metadata = { title: "Budget" };

const COSTS = [
  { title: "Alles, was wir entwickeln", body: "Konzept, Text, Design und technische Umsetzung werden im Angebot einem konkreten Ergebnis zugeordnet." },
  { title: "Alles, was danach bleibt", body: "Pflege, Weiterentwicklung und persönliche Unterstützung werden als eigener, nachvollziehbarer Baustein vereinbart." },
  { title: "Alles, was extern anfällt", body: "Hosting, Software, KI-Nutzung sowie Medien- und Werbebudget stehen als eigene Posten im Angebot." },
];

export default function BudgetPage() {
  return (
    <>
      <section id="top" style={{ paddingTop: 24 }}>
        <div className="sec-head">
          <p className="eyebrow">Budget mit nachvollziehbarer Grundlage</p>
          <h2>Hochwertige Arbeit zu einem Preis, den Sie vorher kennen.</h2>
          <p className="lead">
            Bei uns gibt es keine unklaren Agenturpakete. Wir rechnen mit einem festen Tagessatz. Vor
            dem Start erhalten Sie einen klar beschriebenen Umfang und entscheiden selbst, was jetzt
            umgesetzt wird und was später kommt.
          </p>
        </div>

        <div className="card rate-card card-accent">
          <p className="eyebrow">Klare Kalkulationsbasis</p>
          <p className="big">{DAY_RATE}<span>netto je Projekttag</span></p>
          <p className="lead" style={{ marginTop: 10 }}>
            Konzept, Text, Design und technische Umsetzung werden nach dem vereinbarten Umfang geplant.
            Externe Kosten weisen wir separat aus.
          </p>
        </div>

        <div className="grid grid-3" style={{ marginTop: 20 }}>
          {COSTS.map((c) => (
            <div className="card tile" key={c.title}>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="sec-head">
          <p className="eyebrow">Richtwert-Rechner</p>
          <h2>Grobe Orientierung in einer Minute</h2>
          <p className="lead">
            Spielen Sie Ihre Annahmen durch. Das Ergebnis ist ein unverbindlicher Richtwert – der
            verbindliche Preis steht im Angebot vor dem Start.
          </p>
        </div>
        <div className="card">
          <BudgetCalculator />
        </div>
        <div style={{ marginTop: 28 }}>
          <Link href="/kontakt" className="btn btn-primary">Verbindliches Angebot anfragen →</Link>
        </div>
      </section>
    </>
  );
}
