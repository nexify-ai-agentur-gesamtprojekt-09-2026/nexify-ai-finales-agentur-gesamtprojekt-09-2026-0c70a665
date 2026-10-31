"use client";
import { SiteLink } from "../Router";
import "./shop.css";

const NOTICES: Record<string, { title: string; text: string }> = {
  "tk-appointments": { title: "Online-Terminbuchung folgt in Kürze", text: "Termine werden noch nicht online gebucht. Suchen Sie eine Werkstatt in Ihrer Nähe und vereinbaren Sie den Termin direkt." },
  "tk-vouchers": { title: "Gutscheine folgen in Kürze", text: "Gutscheine können noch nicht gekauft oder eingelöst werden." },
  "tk-battery": { title: "Batterie-Berater folgt in Kürze", text: "Bis dahin zeigt die Passungsprüfung oben, welche Batterie-Angaben entscheiden." },
};

export default function PhaseNotice({ id }: { id: string }) {
  const notice = NOTICES[id];
  return <section className="tk-notice" role="note" data-testid={`phase-notice-${id}`}>
    <strong>{notice.title}</strong><p>{notice.text}</p>
    {id !== "tk-battery" && <SiteLink href="/teileklar/werkstatt" className="content-action-link" data-testid={`phase-notice-${id}-link`}>Werkstatt in der Nähe suchen</SiteLink>}
  </section>;
}
