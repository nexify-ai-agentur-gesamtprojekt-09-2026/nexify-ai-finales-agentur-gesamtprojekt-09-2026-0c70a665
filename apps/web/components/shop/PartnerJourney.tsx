"use client";
import { SiteLink } from "../Router";
import {ActionLink} from '../ActionControl';
import {HcArrow} from '../HcArrow';
import "./shop.css";

const STEPS = [
  ["01", "Betrieb vorstellen", "Leistungen, Standort, Ansprechpartner und Kapazitäten ergeben ein belastbares Werkstattprofil."],
  ["02", "Zusammenarbeit vereinbaren", "Anfragen, Zusagen, Konditionen und Abrechnung werden vor dem ersten Auftrag gemeinsam festgelegt."],
  ["03", "Aufträge vollständig erhalten", "Fahrzeug, geprüftes Teil, Kontaktdaten und offene Fragen sollen gebündelt bei Ihnen ankommen. Die Partnerfläche dafür ist noch nicht gebaut; bis dahin legen wir den Weg gemeinsam fest."],
] as const;

const PORTAL = [
  ["Termine", "Anfragen annehmen, verschieben oder ablehnen – mit Fahrzeug und Anliegen an einer Stelle."],
  ["Gutscheine", "Gutscheine gibt es bei TEILEKLAR noch nicht. Sobald es sie gibt, sollen Bestellungen und Einlösungen hier nachvollziehbar sein."],
  ["Profil & Landingpage", "Leistungen, Öffnungszeiten und Ansprechpartner pflegen; daraus entsteht der öffentliche Werkstattauftritt."],
  ["Abrechnung", "Vereinbarte Leistungen und fällige Abrechnungen transparent im Blick behalten."],
  ["Dokumente", "Partnerunterlagen, Vereinbarungen und freigegebene Vorlagen zentral abrufen."],
  ["Zusatzleistungen", "Weitere Leistungen gezielt beauftragen, sobald Umfang und Preis bestätigt sind."],
] as const;

export default function PartnerJourney() {
  return <div className="tk-partner-journey" data-testid="partner-journey">
    <section className="tk-partner-intro">
      <span className="hc-kicker">TEILEKLAR Werkstattnetz</span>
      <h2>Das Ziel: Der Kunde bringt das geprüfte Teil. Sie bekommen den passenden Auftrag.</h2>
      <p>TEILEKLAR soll Teilekauf und Einbau verbinden. Werkstätten sollen verständlich vorbereitete Anfragen erhalten, statt Fahrzeugdaten, Teilenummern und Rückfragen selbst zusammensuchen zu müssen. Die Weitergabe von Anfragen an Werkstätten ist noch im Aufbau.</p>
    </section>
    <ol className="tk-partner-steps">{STEPS.map(([number, title, body]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{body}</p></li>)}</ol>
    <section className="tk-portal-preview">
      <div><span className="hc-kicker">Partnerportal in Vorbereitung</span><h2>Geplant: ein Arbeitsplatz für den Werkstattalltag.</h2><p>Das Portal ist noch nicht gebaut. Die folgenden Bereiche sind vorgesehen; keiner davon ist heute nutzbar. Öffentliche Besucher sollen keine Betriebs-, Kunden- oder Abrechnungsdaten sehen.</p></div>
      <div className="tk-portal-grid">{PORTAL.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className="tk-actions"><ActionLink variant="primary" className="hc-finish-primary" href="/anmelden">Partnerzugang</ActionLink><SiteLink className="hc-text-link" href="/teileklar/werkstatt">Werkstätten finden<HcArrow/></SiteLink></div>
    </section>
  </div>;
}
