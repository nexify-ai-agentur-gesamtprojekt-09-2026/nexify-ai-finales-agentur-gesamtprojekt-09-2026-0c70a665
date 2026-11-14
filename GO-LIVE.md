# GO-LIVE — Chat → Angebot → Bestellung → Rechnung → Mail

Knappe Betriebsanleitung für das Backend des Flusses
**Chat (LLM) → individuelles Angebot → verbindliche Bestellung → Auftrag → XRechnung → Resend-Mail**,
inklusive Supabase-Persistenz. Kein echter Deploy enthalten — nur die Reihenfolge und die
Entscheidungen/Keys, die zum Live-Gang nötig sind.

Stand 14.11.2026: Zielbild aller Datenhaltung ist nach D-013 (`DECISIONS.md`) die eigene, selbst gehostete
Supabase-Instanz, auch für den Shop. Abschnitt 4 nennt eine Migration; auf `main` liegen inzwischen `0001` bis
`0003` unter `apps/web/supabase/migrations/`. Produktion ist das Vercel-Projekt `…-ut7r` (`AGENTS.md`); „Clerk“
in Abschnitt 5 ist seit D-007 Historie.

Stand der Verifikation (lokal, `@nexify/factory`):
`pnpm --filter @nexify/web typecheck` ✓ · `pnpm typecheck:agent` ✓ ·
`pnpm test:agent` ✓ (36/36) · `pnpm --filter @nexify/web build` ✓ · `node tools/rechnung.mjs …` ✓.

---

## 1) Welche App ist das Frontend? → Empfehlung: `apps/web`

Begründung: Der gesamte Fluss lebt in **`apps/web`** (Next.js 16 App Router) als serverseitige
API-Routen:

- `apps/web/app/api/chat/route.ts` — LLM-Chat (SSE), erzeugt aus dem Modelltext ein Angebot.
- `apps/web/app/api/offers/[id]/route.ts` — Angebot lesen.
- `apps/web/app/api/offers/[id]/order/route.ts` — verbindliche Bestellung + Fulfilment (Rechnung + Mail).

`apps/site` ist ein **statischer Vite/React-Build ohne Server-Routen**; er kann diese Endpunkte nicht
hosten (er proxyt `/api` nur an Gateway/Shop). Daher ist `apps/web` das Deploy-Ziel für Frontend **und**
Backend dieses Flusses. Die Root-`vercel.json` verdrahtet `apps/web` bereits als Service `frontend`
(Next.js, Region `fra1`).

## 2) Deploy-Target → Vercel

- Framework: `nextjs`, Root `apps/web`.
- Build: `pnpm --filter @nexify/web build` · Install: `pnpm install --frozen-lockfile --ignore-scripts`.
- Node: `>=22.23.4 <23` (siehe `.nvmrc` / `engines`).
- Function-Region: `fra1` (EU). `/api/chat` hat `maxDuration = 60` (im Routen-Code gesetzt).

## 3) LLM / Router + Modell

- Provider: 9router (OpenAI-kompatibel), Streaming an — Quelle: `config/llm-policy.json`.
- Modell (Default): `deepseek/deepseek-v4.1-flash-1017`, `reasoning_effort: high`.
- Kein stiller Fallback: ohne `ROUTER_URL` + `ROUTER_KEY` → `/api/chat` = HTTP 503.

## 4) Migration(en)

Genau **eine** Migration für den Fluss:

- `apps/web/supabase/migrations/0001_chat_offers_orders.sql`
  Legt Schema `chat` an: `chat_conversations`, `chat_messages`, `chat_offers`, `chat_offer_items`,
  `chat_orders` (inkl. Bestellnummern-Sequenz `NX-YYYY-######`), `chat_order_events`.
  RLS ist deny-by-default; der Server schreibt mit Service-Role.

Anwenden (durch Pascal, bewusst — NICHT automatisch gegen die Live-DB):
```bash
psql "$DATABASE_URL" -f apps/web/supabase/migrations/0001_chat_offers_orders.sql
```
Danach in der PostgREST-/Supabase-Konfiguration das Schema freigeben:
```
PGRST_DB_SCHEMAS="public,chat"
```
(DB-Neustart/Reload nötig, damit `chat` über REST erreichbar ist.)

## 5) Reihenfolge der Schritte

1. **DB vorbereiten:** Migration `0001_chat_offers_orders.sql` einspielen, `PGRST_DB_SCHEMAS="public,chat"`
   setzen, PostgREST neu laden.
2. **Env setzen** (Vercel-Projekt `frontend` / lokal `apps/web/.env.local`), siehe `apps/web/.env.example`:
   - Pflicht Chat: `ROUTER_URL`, `ROUTER_KEY` (optional `CHAT_MODEL_ID`). `ROUTER_URL` muss aus dem Internet
     erreichbar sein und auf die OpenAI-kompatible Basis zeigen (in der Regel mit `/v1`).
   - Pflicht Angebot/Bestellung/Persistenz: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
   - Mail: `RESEND_API_KEY`, `RESEND_FROM` (bzw. `RESEND_FROM_ADDRESS`).
   - Optional: `ORDER_DISPATCH_URL`/`_TOKEN`, Clerk, Sentry/PostHog.
3. **Deploy** auf Vercel (Build-Command s. o.).
4. **Rauchtest** gegen die Deployment-URL:
   - `POST /api/chat` mit `{ "message": "...", "stream": false }` → Antwort + ggf. `offer`.
   - `GET /api/offers/{id}` → Angebot.
   - `POST /api/offers/{id}/order` mit `{ "accept_binding": true, "customer": { "name": "...", "email": "..." } }`
     → `201` mit `invoice_number` und `invoice_mailed`.
   - Prüfen: Zeilen in `chat.*`, Audit-Ereignisse in `chat_order_events`, Mail-Eingang.

## 6) Degradations-Verhalten (ehrlich)

- Ohne LLM-Env: `/api/chat` = 503 (gewollt, kein Fake-Modell).
- Ohne Supabase: Chat läuft mit `persisted:false`; Offer/Order-Endpunkte = 503.
- Ohne Resend: Bestellung bleibt gültig, Mail wird sauber übersprungen (`mailSkipped:true`), Audit-Ereignis `mail_skipped`.
- Rechnung nur, wenn `total_cents` feststeht (sonst „folgt nach Umfangsklärung").

### Gesprächsführung und Leitplanken (Stand 13.11.2026)

Quelle: `apps/web/lib/chat-guidance.ts`, Version `oracle-public-guide/1.0.0` (steht im `start`-Ereignis
und in der JSON-Antwort als `guidance`). Tests: `apps/web/auth/tests/chat-guidance.test.mjs`,
`chat-route-guidance.test.mjs`, `chat-client.test.mjs`.

| Leitplanke | Wie durchgesetzt |
| --- | --- |
| Keine Preise ohne Freigabe | Serverseitig: Ein Satz mit einem Geldbetrag, der weder in `APPROVED_PRICE_FACTS` steht noch vom Besucher genannt wurde, wird vor der Auslieferung durch einen festen Hinweis ersetzt. Die Liste ist leer, weil es keinen freigegebenen Preiskatalog gibt. Einträge dürfen nur aus `config/fakten.json`/`config/api-prepaid.json` stammen (Test). |
| Gibt sich nicht als Mensch aus | Serverseitig: Eine solche Aussage wird durch die wahre Angabe ersetzt. Zusätzlich Vorgabe an das Modell, auf Nachfrage wahrheitsgemäß zu antworten. |
| Briefing statt Rohdaten | Serverseitig: Datenblöcke werden aus dem Text gelöst, das Briefing begrenzt, auf bekannte Leistungen gefiltert und als eigenes Ereignis `briefing` gesendet. |
| Angebotsentwurf ohne Preis | Serverseitig: `unit_cents` wird immer auf `null` gesetzt. |
| Verlauf nur als Kontext | Serverseitig: höchstens 16 Beiträge / 12.000 Zeichen, nur `user`/`assistant`, keine Steuerzeichen. |
| Keine Referenzen, Zusagen, Rechtsberatung; eine Frage je Antwort | Nur Vorgabe an das Modell. Wirkt, soweit das Modell ihr folgt; nicht technisch erzwungen. |

Ausgelöste Leitplanken stehen als `{"event":"chat_guardrail",...}` im Protokoll (nur Kennwörter und Anzahl).
Fehlen `ROUTER_URL`/`ROUTER_KEY`, antwortet die Route mit 503 und die Oberfläche wechselt sichtbar auf die
Orientierung anhand der Website mit direktem Kontaktweg.

### Störungsdiagnose `/api/chat` (Stand 13.11.2026)

Der Besucher sieht bei jeder Störung nur den festen Code `chat_llm_failed`. Die Ursache steht als
eine JSON-Zeile im Laufzeitprotokoll der Funktion (Vercel → Projekt → Logs, Suche `chat_failure`):

```json
{"event":"chat_failure","route":"/api/chat","stage":"llm","stream":true,"elapsed_ms":7,"cause":"upstream_http","status":401,"upstream_content_type":"json"}
```

| `cause` | Bedeutung | Nächster Schritt |
| --- | --- | --- |
| `not_configured` | `ROUTER_URL`/`ROUTER_KEY` fehlen | Variablen im Vercel-Projekt setzen, neu ausliefern. Hinweis: Fehlen beide schon beim Eingang, antwortet die Route sofort mit HTTP 503 `chat_llm_not_configured` und schreibt **keine** `chat_failure`-Zeile |
| `model_policy` | `CHAT_MODEL_ID` weicht vom Policy-Modell ab | Variable entfernen oder exakt auf das Policy-Modell setzen |
| `invalid_endpoint` | Adresse ist keine gültige http(s)-URL | `ROUTER_URL` prüfen (vollständig, mit `https://`) |
| `network` + `network_code` | Verbindung kommt nicht zustande (`ENOTFOUND` = Name unbekannt, `ECONNREFUSED` = Port zu, `UND_ERR_CONNECT_TIMEOUT` = nicht erreichbar, Zertifikatscodes = TLS) | Router muss aus dem Internet erreichbar sein, nicht nur im eigenen Netz |
| `timeout` | keine vollständige Antwort innerhalb von 50 s | Router-Last und Modellverfügbarkeit prüfen |
| `upstream_http` + `status` | Router antwortet mit Fehler (`400` Anfrage abgelehnt – z. B. Modellname dem Router unbekannt, so gemessen am 13.11.2026 und mit #106 behoben; `401`/`403` Schlüssel; `404` Pfad – meist fehlt `/v1`; `429` Limit/Guthaben; `5xx` Router/Modell) | je nach Status |
| `invalid_response` | Status 200, aber kein Chat-Format (z. B. HTML-Seite des Routers) | `ROUTER_URL` zeigt nicht auf die OpenAI-kompatible Schnittstelle |
| `upstream_stream_error` | Router meldet einen Fehler innerhalb der Antwort | Modellname/Guthaben im Router prüfen |
| `empty_response` / `token_budget` | kein Antworttext / Limit durch Denk-Tokens aufgebraucht | Modell- und Limit-Einstellung im Router prüfen |
| `stream_interrupted` | Verbindung riss während der Antwort ab | Router-Stabilität, Proxy-Zeitlimits |
| `client_abort` | Besucher hat abgebrochen | keine Störung |

`stage: "persistence"` bedeutet: Die Antwort kam, aber das Speichern in Supabase schlug fehl
(`step` nennt den Schritt). Die Zeile enthält nie Adresse, Schlüssel, Antworttext des Routers,
Nutzertext oder Konversations-ID. Geprüft mit `apps/web/auth/tests/chat-llm.test.mjs` und
`chat-route-errors.test.mjs`; der echte Router wurde dabei nicht aufgerufen.

## 7) Offene Punkte vor dem Live-Gang (Entscheidungen durch Pascal)

- **XRechnung-Umfang:** `tools/rechnung.mjs` erzeugt ein minimales UBL-2.1-Gerüst **ohne** `cac:TaxTotal`
  (0 % USt, keine Verkäufer-USt-IdNr./Zahlungsbedingungen). Für eine EN16931-/fiskalisch vollständige
  Rechnung muss der XML-Umfang erweitert und steuerlich/rechtlich freigegeben werden.
- **UI-Anbindung (Stand 13.11.2026):** Die öffentliche Chat-Oberfläche (`PublicOrientationChat`) führt das
  Gespräch jetzt über `/api/chat` und endet in einem bearbeitbaren Briefing, das der Besucher selbst über das
  Kontaktformular absendet. Ein UI-Button „verbindlich bestellen" ist weiterhin **nicht** verdrahtet; der
  Angebots-/Bestellweg bleibt reine API. `/api/agent-chat` bleibt unverändert bestehen, wird von der
  Oberfläche aber nicht mehr aufgerufen.
- **Kostendeckel:** Jede Besuchernachricht löst einen bezahlten Modellaufruf aus. Die Route begrenzt je
  Absender (8 je Minute, 60 je Stunde, **je Funktionsinstanz**) und nimmt Browser-Aufrufe nur von der eigenen
  Seite an. Das ist ein Missbrauchsschutz, kein Budget. Ein verbindliches Ausgabenlimit muss am Router-Schlüssel
  gesetzt werden (`config/llm-policy.json` → `request_limits_and_authorized_funding_required`).
- **Echter Router ungeprüft:** Gesprächsführung, Leitplanken und Oberfläche sind gegen einen lokalen
  Stellvertreter-Endpunkt geprüft. Ob das Policy-Modell der Vorgabe folgt (eine Frage je Antwort, Briefing-Block
  im verlangten Format), ist erst mit dem echten Router prüfbar.
- **Revolut-Zahlung:** nur im separaten Prepaid-/API-Billing geplant (`config/api-prepaid.json`),
  nicht Teil dieses Flusses; Zahlungs-Worker noch nicht gebaut.
