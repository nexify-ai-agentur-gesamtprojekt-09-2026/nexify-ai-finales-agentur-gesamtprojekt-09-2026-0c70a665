/**
 * Ausgang einer Anfrage über das Kontaktformular einordnen.
 * Die Adresse ist der E-Mail-Kanal der Kontaktseite in config/site-map.json;
 * apps/web/auth/tests/contact-outcome.test.mjs hält beide gleich.
 */
export const CONTACT_ADDRESS = 'mail@nexifyai.cloud';

/**
 * Wahr nur, wenn der Dienst die Anfrage abgewiesen hat, bevor ein Empfänger lief:
 * das Laufzeit-Gate des Shop-Dienstes (apps/shop-api/vercel_app.py, `unavailable`)
 * und die Herkunftsprüfung antworten, ohne zu speichern oder zu versenden.
 * Jeder andere Fehler (Zeitüberschreitung, Netz, HTML statt JSON, 5xx aus dem
 * Empfänger) bleibt ungewiss: die Anfrage kann gespeichert sein.
 */
export function requestNotStored(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.status === 503 && error.error === 'runtime_binding_unavailable') return true;
  return error.status === 403 && error.error === 'origin_rejected';
}

/** mailto-Verweis, der die Angaben des Formulars in das E-Mail-Programm übernimmt. */
export function contactMailHref(subject, lines) {
  const body = lines.filter(([, value]) => String(value || '').trim())
    .map(([label, value]) => (label ? label + ': ' : '') + String(value).trim().slice(0, 1500)).join('\n');
  return 'mailto:' + CONTACT_ADDRESS + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}
