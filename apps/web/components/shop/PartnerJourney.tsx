"use client";
import { SiteLink } from "../Router";
import {ActionLink} from '../ActionControl';
import {HcArrow} from '../HcArrow';
import "./shop.css";

const STEPS = [
  ["01", "Betrieb vorstellen", "Leistungen, Standort, Ansprechpartner und Kapazitäten ergeben ein belastbares Werkstattprofil."],
  ["02", "Zusammenarbeit vereinbaren", "Anfragen, Zusagen, Konditionen und Abrechnung werden vor dem ersten Auftrag gemeinsam festgelegt."],
  ["03", "Aufträge vollständig erhalten", "Fahrzeug, geprüftes Teil, Kontaktdaten und offene Fragen kommen gebündelt in der Partnerfläche an."],
] as const;

const PORTAL = [
  ["Termine", "Anfragen annehmen, verschieben oder ablehnen – mit Fahrzeug und Anliegen an einer Stelle."],
  ["Gutscheine", "Bestellungen und Einlösungen nachvollziehen, ohne Listen oder parallele Nachrichten."],
  ["Profil & Landingpage", "Leistungen, Öffnungszeiten und Ansprechpartner pflegen; daraus entsteht der öffentliche Werkstattauftritt."],
  ["Abrechnung", "Vereinbarte Leistungen und fällige Abrechnungen transparent im Blick behalten."],
  ["Dokumente", "Partnerunterlagen, Vereinbarungen und freigegebene Vorlagen zentral abrufen."],
  ["Zusatzleistungen", "Weitere Leistungen gezielt beauftragen, sobald Umfang und Preis bestätigt sind."],
] as const;

export default function PartnerJourney() {
  return <div className="tk-partner-journey" data-testid="partner-journey">
    <section className="tk-partner-intro">
      <span className="hc-kicker">TEILEKLAR Werkstattnetz</span>
      <h2>Der Kunde bringt das geprüfte Teil. Sie bekommen den passenden Auftrag.</h2>
      <p>TEILEKLAR verbindet Teilekauf und Einbau. Werkstätten erhalten verständlich vorbereitete Anfragen, statt Fahrzeugdaten, Teilenummern und Rückfragen selbst zusammensuchen zu müssen.</p>
    </section>
    <ol className="tk-partner-steps">{STEPS.map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
    <section className="tk-portal-preview">
      <div><span className="hc-kicker">Geschütztes Partnerportal</span><h2>Ein Arbeitsplatz für den Werkstattalltag.</h2><p>Das Portal ist nach Anmeldung und bestätigter Partnerschaft erreichbar. Öffentliche Besucher sehen keine Betriebs-, Kunden- oder Abrechnungsdaten.</p></div>
      <div className="tk-portal-grid">{PORTAL.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="tk-actions"><ActionLink variant="primary" className="hc-finish-primary" href="/anmelden">Partnerzugang</ActionLink><SiteLink className="hc-text-link" href="/teileklar/werkstatt">Werkstätten finden<HcArrow/></SiteLink></div>
    </section>
  </div>;
}
