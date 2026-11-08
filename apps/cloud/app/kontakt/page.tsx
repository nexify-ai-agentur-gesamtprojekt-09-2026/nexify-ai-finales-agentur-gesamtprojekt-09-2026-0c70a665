import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = { title: "Kontakt" };

export default function KontaktPage() {
  return (
    <section id="top" style={{ paddingTop: 24 }}>
      <div className="sec-head">
        <p className="eyebrow">Kontakt</p>
        <h2>Lassen Sie uns über Ihr Vorhaben sprechen.</h2>
        <p className="lead">
          Beschreiben Sie in einem Satz, was einfacher werden soll. Sie erhalten eine erste Einordnung,
          den passenden Weg und ein individuelles Angebot – persönlich von Pascal.
        </p>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start", gap: 28 }}>
        <div className="card">
          <ContactForm />
        </div>
        <div className="card">
          <h3>NeXify AI FACTORY B.V.</h3>
          <p className="lead" style={{ marginTop: 12 }}>
            Graaf van Loonstraat 1E<br />5921 JA Venlo<br />Niederlande
          </p>
          <p className="lead" style={{ marginTop: 16 }}>
            Inhaber: Pascal Courbois<br />
            KvK 90483944 · BTW NL865786276B01
          </p>
          <p className="eyebrow" style={{ marginTop: 20 }}>Arbeitssprachen</p>
          <p className="lead" style={{ marginTop: 8 }}>Deutsch · Nederlands · Français</p>
          <p className="eyebrow" style={{ marginTop: 20 }}>Abrechnung</p>
          <p className="lead" style={{ marginTop: 8 }}>Fester Tagessatz 449 € netto · Umfang vor Start vereinbart.</p>
        </div>
      </div>
    </section>
  );
}
