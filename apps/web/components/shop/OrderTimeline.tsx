import type { Order } from "./api";
import { dateTime } from "./api";

export const NEXT_STEPS = [
  "Wir prüfen Ihre Bestellung und geben sie an den Lieferanten weiter.",
  "Der Versand erfolgt durch den Lieferanten. Sobald das Paket unterwegs ist, erhalten Sie eine E-Mail mit Sendungsnummer.",
  "Sie können den Vertrag innerhalb von 14 Tagen ohne Angabe von Gründen widerrufen (Widerrufsbelehrung und Muster-Widerrufsformular unter Rechtliches).",
];

export function OrderTimeline({ order }: { order: Order }) {
  if (!order.timeline) return null;
  return <ol className="tk-timeline" aria-label="Bestellstatus" data-testid="order-timeline">
    {order.timeline.map(step => <li key={step.id} className={step.reached ? "is-reached" : ""} aria-current={step.reached && !order.timeline!.some((s, i) => i > order.timeline!.indexOf(step) && s.reached) ? "step" : undefined} data-testid={"timeline-" + step.id} data-reached={step.reached}>
      <span className="tk-timeline-dot" aria-hidden="true" /><span className="tk-timeline-label">{step.label}</span>{step.at && <small>{dateTime(step.at)}</small>}
      {step.id === "versendet" && step.reached && order.tracking_number && <small data-testid="order-tracking">Sendungsnummer {order.tracking_number}{order.carrier ? ` (${order.carrier})` : ""}</small>}
      {!step.reached && <span className="visually-hidden">noch nicht erreicht</span>}
    </li>)}
  </ol>;
}

export function NextSteps() {
  return <section className="tk-next" aria-labelledby="next-title" data-testid="order-next-steps"><h3 id="next-title">Was passiert als Nächstes</h3><ol>{NEXT_STEPS.map(s => <li key={s}>{s}</li>)}</ol></section>;
}
