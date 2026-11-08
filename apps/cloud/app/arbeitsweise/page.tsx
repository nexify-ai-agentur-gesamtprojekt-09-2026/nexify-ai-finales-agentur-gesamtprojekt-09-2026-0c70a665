import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { STEPS } from "@/lib/content";

export const metadata: Metadata = { title: "Arbeitsweise" };

export default function ArbeitsweisePage() {
  return (
    <>
      <section id="top" style={{ paddingTop: 24 }}>
        <div className="sec-head">
          <p className="eyebrow">Zusammenarbeit</p>
          <h2>So arbeiten wir zusammen</h2>
          <p className="lead">
            Vier klare Schritte, ein Ansprechpartner. Sie behalten in jeder Phase die Entscheidung –
            wir sorgen für einen nachvollziehbaren Weg vom ersten Satz bis zur Übergabe.
          </p>
        </div>
        <div className="grid grid-2">
          {STEPS.map((s) => (
            <div className="card tile" key={s.num}>
              <p className="eyebrow">{s.num}</p>
              <h3 style={{ marginTop: 10 }}>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <figure className="hero-figure" style={{ margin: 0, aspectRatio: "16 / 8" }}>
          <Image src="/media/zusammenarbeit.png" alt="Pascal Courbois in der gemeinsamen Projektarbeit" fill sizes="100vw" style={{ objectFit: "cover" }} />
        </figure>
      </section>

      <section>
        <div className="card card-accent" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(24px,4vw,38px)" }}>Bereit für den ersten Schritt?</h2>
          <p className="lead" style={{ margin: "14px auto 24px" }}>
            Beschreiben Sie Ihr Vorhaben in einem Satz. Den passenden Umfang klären wir gemeinsam.
          </p>
          <Link href="/kontakt" className="btn btn-primary">Projektgespräch anfragen →</Link>
        </div>
      </section>
    </>
  );
}
