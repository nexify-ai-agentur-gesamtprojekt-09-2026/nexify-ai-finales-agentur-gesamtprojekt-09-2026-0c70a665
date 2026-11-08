import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum & Datenschutz" };

export default function ImpressumPage() {
  return (
    <section id="top" style={{ paddingTop: 24 }}>
      <div className="prose">
        <p className="eyebrow">Rechtliches</p>
        <h2 id="impressum" style={{ scrollMarginTop: 90 }}>Impressum</h2>
        <p>Angaben gemäß den geltenden Informationspflichten.</p>
        <p>
          <strong>NeXify AI FACTORY B.V.</strong><br />
          Handelsname: NeXify AI – Chat it. Automate it.<br />
          Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande
        </p>
        <p>
          Inhaber / vertretungsberechtigt: Pascal Courbois<br />
          KvK-Nummer: 90483944 (KvK Roermond)<br />
          USt-IdNr. / BTW: NL865786276B01
        </p>
        <p>Kontakt über das Anfrageformular auf der Seite „Kontakt".</p>
        <h3>Verantwortlich für den Inhalt</h3>
        <p>Pascal Courbois, Anschrift wie oben.</p>
        <h3>Haftung für Inhalte und Links</h3>
        <p>
          Die Inhalte dieser Seiten wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit
          und Aktualität der Inhalte wird keine Gewähr übernommen. Für Inhalte externer Links sind
          ausschließlich deren Betreiber verantwortlich.
        </p>

        <h2 id="datenschutz" style={{ scrollMarginTop: 90 }}>Datenschutz</h2>
        <p>
          Der Schutz Ihrer Daten ist uns wichtig. Die Verarbeitung personenbezogener Daten erfolgt im
          Rahmen der DSGVO. Verantwortlicher ist NeXify AI FACTORY B.V. (Anschrift siehe Impressum).
        </p>
        <h3>Anfrageformular</h3>
        <p>
          Wenn Sie uns über das Formular kontaktieren, verarbeiten wir die von Ihnen angegebenen Daten
          (Name, E-Mail, optional Unternehmen, Nachricht) ausschließlich zur Bearbeitung Ihrer Anfrage.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO. Die Daten werden gelöscht, sobald sie
          für den Zweck nicht mehr erforderlich sind.
        </p>
        <h3>KI-Assistent (Oracle)</h3>
        <p>
          Der Assistent dient der ersten Einordnung Ihres Vorhabens. Eingaben werden zur Beantwortung
          verarbeitet. Geben Sie keine vertraulichen Zugangsdaten ein.
        </p>
        <h3>Ihre Rechte</h3>
        <ul>
          <li>Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung</li>
          <li>Widerspruch gegen die Verarbeitung und Datenübertragbarkeit</li>
          <li>Beschwerde bei einer Aufsichtsbehörde</li>
        </ul>

        <h2 id="vertrag" style={{ scrollMarginTop: 90 }}>Vertragsgrundlagen</h2>
        <p>
          Leistungen werden auf Basis eines festen Tagessatzes (449 € netto je Projekttag) erbracht. Der
          verbindliche Umfang wird vor Projektstart schriftlich vereinbart; externe Kosten (Hosting,
          Software, KI-Nutzung, Medien- und Werbebudget) werden separat ausgewiesen.
        </p>

        <h2 id="a11y" style={{ scrollMarginTop: 90 }}>Barrierefreiheit</h2>
        <p>
          Wir gestalten diese Seiten nach den Grundsätzen der WCAG 2.2 (Zielniveau AA): ausreichende
          Kontraste, Tastaturbedienbarkeit, klare Struktur und reduzierte Bewegung bei entsprechender
          Systemeinstellung. Hinweise zu Barrieren nehmen wir über das Kontaktformular entgegen.
        </p>
      </div>
    </section>
  );
}
