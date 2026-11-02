import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Crumbs } from './ui.jsx';

const F = ({ children }) => <span className="freigabe">[FREIGABE: {children}]</span>;
const STAND = 'Entwurfsfassung, Stand 02.11.2026 – vor Veröffentlichung fachkundig juristisch zu prüfen.';

const DOCS = {
  impressum: ['Impressum', <>
    <p>Angaben laut NeXify-Stammdaten (config/fakten.json, Stand 28.09.2026). Die Verifizierung von Rechtsform, Sitz und Register ist vor Go-live offen.</p>
    <h2>Anbieter</h2><p>NeXify AI (by NeXify), Inhaber Pascal Courbois<br />Eenmanszaak nach niederländischem Recht<br />Graaf van Loonstraat 1E, 5921 JA Venlo, Niederlande</p>
    <p>KvK 90483944<br />E-Mail: <a href="mailto:mail@nexifyai.cloud">mail@nexifyai.cloud</a></p><p>Umsatzsteuer-ID: <F>vorhandene USt-ID</F></p>
    <h2>Verantwortlich für den Inhalt</h2><p>Pascal Courbois, Anschrift wie oben.</p>
    <h2>TEILEKLAR</h2><p>TEILEKLAR wird von NeXify betrieben. Verkäuferidentität für den Shop: <F>Verkäufer, falls abweichend</F></p></>],
  datenschutz: ['Datenschutzhinweise', <>
    <h2>Verantwortlicher</h2><p>Verantwortlich ist <F>rechtlicher Betreiber, Anschrift, Datenschutzkontakt</F>. Datenschutzbeauftragter, soweit bestellt: <F>Name</F>.</p>
    <h2>Zwecke und Grundlagen</h2>
    <table className="t"><thead><tr><th>Verarbeitung</th><th>Daten / Zweck</th><th>Grundlage & Dauer</th></tr></thead><tbody>
      <tr><td>Websitebetrieb</td><td>IP-Adresse, Zeitpunkt, technische Abrufdaten; Auslieferung, Angriffsabwehr</td><td>Art. 6 Abs. 1 lit. f DSGVO; Logfrist <F>Frist</F></td></tr>
      <tr><td>Anfragen und Support</td><td>Kontakt-, Nachrichten- und Vorgangsdaten; Beantwortung</td><td>lit. b bzw. lit. f; Frist <F>Frist</F></td></tr>
      <tr><td>Konto und Abrechnung</td><td>Identität, Rollen, Bestell- und Verbrauchsdaten</td><td>lit. b; gesetzliche Nachweise lit. c <F>Norm, Frist</F></td></tr>
      <tr><td>Arbeitsbereich & KI</td><td>Eingaben, Dateien, Ergebnisse; beauftragte Funktion</td><td>je Produkt; bei Auftragsverarbeitung AVV <F>Fristen</F></td></tr>
      <tr><td>Shop & Zahlung</td><td>Bestell-, Liefer- und Zahlungsstatusdaten (Revolut)</td><td>lit. b, lit. c <F>Fristen</F></td></tr>
      <tr><td>Optionale Analyse/Marketing</td><td>derzeit nicht eingesetzt</td><td>nur nach Einwilligung</td></tr></tbody></table>
    <h2>Empfänger</h2><p>Hosting, Authentifizierung (Google-Anmeldung über Emergent), KI-Inferenz (Anthropic Claude über den Emergent-Router), Zahlungsabwicklung (Revolut), Katalog (BigBuy), E-Mail-Versand (Resend, falls eingerichtet). Transfergrundlagen: <F>je Anbieter</F>.</p>
    <h2>Ihre Rechte</h2><p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Widerruf von Einwilligungen und Beschwerde bei einer Aufsichtsbehörde.</p></>],
  agb: ['AGB für Geschäftskunden (Entwurf)', <>
    <p>Diese Bedingungen gelten ausschließlich gegenüber Unternehmern (§ 14 BGB). Verbraucher schließen Verträge nur auf Grundlage gesonderter Verbraucherbedingungen. TEILEKLAR hat eigene Shopbedingungen.</p>
    {[['§ 1 Anbieter, Geltung, Vertragsschluss', <>Vertragspartner ist <F>vollständiger rechtlicher Name, Rechtsform, Anschrift, Vertretung, Register, Kontakt</F>.</>], ['§ 2 Leistungen', 'Geschuldet sind die im Angebot bezeichneten Leistungen; Softwarezugang und Kontingente ergeben sich aus der Leistungsanlage.'], ['§ 3 Mitwirkung und Berechtigungen', 'Zugriffe werden auf erforderliche Zwecke begrenzt.'], ['§ 4 Änderungen', 'Kostenpflichtige Erweiterungen erst nach Zustimmung.'], ['§ 5 Vergütung', <>Es gelten die vereinbarten Preise <F>Währung, Nettopreise, USt, Zahlungsziel, Abrechnungsperiode</F>.</>], ['§ 6 Rechte', 'Nutzungsrechte und Übergabe individueller Ergebnisse regelt die Leistungsanlage.'], ['§ 7 KI-Agenten', 'KI-Ausgaben können unzutreffend sein und sind vor folgenreicher Verwendung zu prüfen.'], ['§ 8 Betrieb und Support', <>Ohne Betriebsanlage kein konkretes SLA <F>Betriebszeiten, Reaktionszeiten</F>.</>], ['§ 9 Vertraulichkeit und Datenschutz', 'Bei Auftragsverarbeitung wird vorab ein Vertrag nach Art. 28 DSGVO geschlossen.'], ['§ 10 Mängel und Haftung', 'Es gelten die gesetzlichen Regelungen.'], ['§ 11 Laufzeit und Datenübergabe', <>Laufzeit und Kündigung <F>Tarif/Einzelvertrag</F>; Export vor Vertragsende.</>], ['§ 12 Schlussbestimmungen', 'Rechtswahl und Gerichtsstand bleiben bis zur Betreiber- und Zielmarktprüfung offen.']].map(([h, t]) => <React.Fragment key={h}><h2>{h}</h2><p>{t}</p></React.Fragment>)}</>],
  cookies: ['Cookies & Einstellungen', <>
    <p>Diese Website setzt derzeit ausschließlich technisch notwendige Speicherungen ein. Es gibt keine Analyse- oder Marketing-Cookies, daher ist keine Einwilligung erforderlich.</p>
    <table className="t"><thead><tr><th>Name</th><th>Zweck</th><th>Dauer</th></tr></thead><tbody><tr><td>tk_session</td><td>Anmeldung (httpOnly)</td><td>14 Tage</td></tr><tr><td>tk_guest</td><td>Gastwarenkorb TEILEKLAR</td><td>30 Tage</td></tr><tr><td>sessionStorage nx_form_*</td><td>Formulareingaben bis zum Absenden behalten</td><td>Sitzung</td></tr><tr><td>localStorage nx_draft_id</td><td>Briefing-Entwurf wiederfinden</td><td>bis Absenden</td></tr></tbody></table></>],
  'ki-hinweise': ['KI-Hinweise', <><p>„Sie interagieren mit einem KI-System. Antworten können Fehler enthalten. Prüfen Sie wichtige Angaben.“</p><p>KI wird eingesetzt im Chat des Arbeitsbereichs und im TEILEKLAR-Teileberater (Modell: Anthropic Claude). Die KI führt keine Aktionen aus, versendet nichts und schließt keine Verträge. Passungsaussagen zu Fahrzeugteilen sind nicht geprüft. Die Figuren NeX und AIFly ORACLE sowie die Glasbilder sind KI-gestützt erzeugte Illustrationen.</p></>],
  barrierefreiheit: ['Barrierefreiheit', <><p>Ziel: Bedienung per Tastatur, sichtbarer Fokus, ausreichende Kontraste, Untertitel und Transkript für Filme, reduzierte Bewegung bei entsprechender Systemeinstellung, verständliche Formularfehler.</p><p>Anwendungsbereich BFSG und ggf. Kleinstunternehmensausnahme: <F>Prüfung dokumentieren</F>. Barrieren melden Sie bitte über das Kontaktformular.</p></>],
  versand: ['Versand & Zahlung (TEILEKLAR)', <><p>Lieferländer: Deutschland, Österreich, Niederlande, Belgien, Luxemburg. Versandkosten werden im Warenkorb vor der Bestellung serverseitig berechnet und angezeigt.</p><p>Zahlung über die Bezahlseite von Revolut (Karte und weitere dort angebotene Methoden). Lieferzeiten: <F>verbindliche Lieferzeitangabe je Artikel</F> – es werden keine Lieferfristen erfunden.</p></>],
  widerruf: ['Widerrufsbelehrung (TEILEKLAR)', <><p>Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Belehrung und Muster-Widerrufsformular: <F>produkt- und abschlusswegbezogene Fassung</F>. Die elektronische Widerrufsfunktion ist bei Freigabe des B2C-Vertriebs umzusetzen.</p><p>Bis dahin erreichen Sie uns für Widerruf und Retoure über den <Link to="/teileklar/support">TEILEKLAR Support</Link> (Zweck „Widerruf / Retoure“).</p></>],
  'shop-agb': ['Shopbedingungen TEILEKLAR (Entwurf)', <><p>Verkäufer, Vertragsschluss, Preise inkl. USt, Lieferung, Gewährleistung und Widerruf: <F>eigenständige TEILEKLAR-Verkäuferbedingungen</F>. Die NeXify B2B-AGB gelten für den Shop nicht.</p><p>Bestellschaltfläche: „Zahlungspflichtig bestellen“. Die Annahme der Bedingungen wird nicht vorbelegt.</p></>],
};

export function Legal({ shop }) {
  const { doc } = useParams();
  const d = DOCS[doc];
  if (!d) return <main className="wrap" style={{ padding: '80px 0' }}><h1>Dokument nicht gefunden</h1><p style={{ marginTop: 12 }}><Link to="/">Zur Startseite</Link></p></main>;
  return <main data-testid={`legal-${doc}`}><div className="wrap"><Crumbs items={[[shop ? 'TEILEKLAR' : 'Rechtliches', shop ? '/teileklar' : null], [d[0]]]} />
    <article className="prose" style={{ padding: '30px 0 60px' }}><span className="kicker"><i />Rechtliches</span><h1 style={{ fontSize: 'clamp(30px,3.4vw,46px)', margin: '14px 0' }}>{d[0]}</h1><p className="muted">{STAND}</p>{d[1]}</article></div></main>;
}
