# Anfrageweg: Befund und Heilung · 14.11.2026

Paket J-5 aus `werkstattservice-und-suite-ist-soll-2026-11-14.md`. Gemessen am 14.11.2026 gegen 19:00 UTC, `main` bei `530173d`. Es wurde keine echte Anfrage abgeschickt.

## Befund

**Über die Formulare kommt heute keine Anfrage an.** Betroffen sind `/kontakt`, `/teileklar/termine`, `/teileklar/gutscheine` und `/teileklar/partner-werden`; alle vier verwenden `apps/web/components/ContactRequestForm.tsx` und senden an `POST /api/requests`.

| Schritt | Fundstelle | Ergebnis |
|---|---|---|
| Weiterleitung | `vercel.json`, Rewrite `/api/requests/:path*` an den Dienst `shop` | geht an `apps/shop-api` |
| Laufzeit-Gate | `apps/shop-api/vercel_app.py`, `runtime_gate` | weist ab, bevor `shop/requests_api.py:create_request` läuft |
| Produktion, `POST` mit `{}` | `https://nexifyai.de/api/requests` | 503, `{"detail":{"error":"runtime_binding_unavailable","reason":"payment_mode_unbound"},"available":false}` |
| Produktion, `POST` mit ungültigem JSON | wie oben | 503, gleicher Körper |
| Produktion, `GET` | wie oben | 503, gleicher Körper |

Das Gate prüft zuerst `REVOLUT_MODE` und danach die Bindung (Projekt, `MONGO_URL` oder `MONGODB_URI`, `DB_NAME`, `PREVIEW_PUBLIC_ORIGIN`, `SHOP_VAT_PERCENT`). Für alle schreibenden Methoden auf `/api/requests` gibt es keine Ausnahme. Der Empfänger braucht die Datenbank: er speichert die Anfrage und legt die Benachrichtigung in denselben Speicher. In Production sind laut Vercel nur diese Variablen gesetzt: `ROUTER_URL`, `ROUTER_KEY`, `COMPOSIO_*`, `BIGBUY_*`, `NEXIFY_COMPOSIO_WEBHOOK`, `SHOP_ALLOWED_PROJECT_IDS`, `NEXIFY_PUBLIC_INSTALLATION`.

Einen zweiten, vom Shop unabhängigen Weg gibt es nicht. `apps/web/lib/mailing.ts` kann über Resend versenden, braucht aber `RESEND_API_KEY` und `RESEND_FROM`; beide fehlen in Production. Deshalb wurde kein Versandweg gebaut, der dort stumm scheitern würde.

Vercel Observability, `vercel.request.count` für `/api/requests`, 07.11. bis 14.11.2026: 4 `POST` und 6 `GET`, alle 503. Zwei der `POST` stammen aus dieser Messung, die beiden anderen von den Klienten `Bun/1.4.2` und `node`, also von Werkzeugen. Eine Anfrage aus einem Browser ist in diesem Zeitraum nicht verzeichnet.

## Was der Besucher sah

Keine falsche Erfolgsmeldung: Erfolg zeigt das Formular nur bei bestätigter Vorgangsnummer. Bei der Abweisung erschien aber der Text für den ungewissen Ausgang („Ihre Anfrage kann bereits eingegangen sein“), dazu ein kleiner Verweis „Direkt per E-Mail kontaktieren“ ohne sichtbare Adresse. Das war für diesen Fall falsch, denn es wurde nichts gespeichert.

## Heilung

- `apps/web/lib/contact-outcome.mjs`: `requestNotStored` erkennt die Abweisung vor jeder Verarbeitung (503 `runtime_binding_unavailable`, 403 `origin_rejected`). Alles andere bleibt ungewiss und behält den bisherigen Text.
- Bei Abweisung sagt das Formular in vier Sprachen, dass nichts gesendet und nichts gespeichert wurde, nennt die Adresse aus dem Seitenplan (`config/site-map.json`, Kontaktseite) und gibt einen E-Mail-Verweis aus, der Name, E-Mail, Unternehmen und Anliegen in das E-Mail-Programm übernimmt. Die Eingaben bleiben im Formular. Der verworfene Versuch blockiert keine geänderte Anfrage.
- Der Schutzmechanismus des Shop-Dienstes ist unverändert. Kein neuer Versand, keine neue Variable.

Prüfung: `apps/web/auth/tests/contact-outcome.test.mjs` (6 Tests), Browserlauf gegen den lokalen Produktions-Build mit abgefangener Anfrage (503, 201, HTML statt JSON) auf den drei Seiten bei 1440 und 390 px.

## Offen beim Inhaber

1. **Sofort ohne Technik:** Prüfen, dass das Postfach `mail@nexifyai.cloud` Post annimmt und gelesen wird. Es ist bis auf Weiteres der einzige Weg für schriftliche Anfragen.
2. **Formular wieder in Betrieb**, eine von zwei Möglichkeiten:
   - Shop-Dienst binden: `REVOLUT_MODE`, `MONGO_URL` oder `MONGODB_URI`, `DB_NAME`, `PREVIEW_PUBLIC_ORIGIN`, `SHOP_VAT_PERCENT` und für die Benachrichtigung die Mail-Einstellungen des Dienstes (`RESEND_API_KEY`, `RESEND_FROM`, `MAIL_INTERNAL_TO`). Das steht im Widerspruch zum Zielbild D-013 und ist eine Entscheidung.
   - Agentur-Anfragen vom Shop lösen: eigener Empfänger in `apps/web`, der über Resend an das Postfach sendet. Dafür `RESEND_API_KEY` und `RESEND_FROM` in Production setzen und die Absenderdomain bei Resend bestätigen; zu entscheiden ist außerdem, ob ohne Speicherung gesendet werden darf (Einwilligungstext nennt „gespeichert“).

## Nicht geprüft

- Zustellung an `mail@nexifyai.cloud` (kein Versand in dieser Arbeit).
- Eine gültige Anfrage gegen die Produktion.
- `apps/site/tests/browser-contact-outcomes-20261112.mjs` wurde nicht ausgeführt und nicht geändert.
