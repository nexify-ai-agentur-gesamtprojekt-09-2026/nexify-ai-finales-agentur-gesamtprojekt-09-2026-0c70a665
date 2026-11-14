# GO-LIVE — Chat → Angebot → Bestellung → Rechnung → Mail

Knappe Betriebsanleitung für das Backend des Flusses
**Chat (LLM) → individuelles Angebot → verbindliche Bestellung → Auftrag → XRechnung → Resend-Mail**,
inklusive Supabase-Persistenz. Kein echter Deploy enthalten — nur die Reihenfolge und die
Entscheidungen/Keys, die zum Live-Gang nötig sind.

Stand 14.11.2026: Zielbild aller Datenhaltung ist nach D-013 (`DECISIONS.md`) die eigene, selbst gehostete
Supabase-Instanz, auch für den Shop. Abschnitt 4 nennt eine Migration; auf `main` liegen inzwischen `0001` bis
`0004` unter `apps/web/supabase/migrations/` (`0004_composio.sql` seit PR 146, Abschnitt 6a). Produktion ist das Vercel-Projekt `…-ut7r` (`AGENTS.md`); „Clerk“
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

Die Composio-Ablage hat eine eigene Migration (`0004_composio.sql`, Schema `composio`) und ist vom
Chat-Fluss unabhängig; siehe Abschnitt 6a. Mit ihr lautet die Zeile `PGRST_DB_SCHEMAS="public,chat,composio"`.

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

## 6a) Composio-Webhook: dauerhafte Ablage (Stand 14.11.2026)

Der Empfänger (`POST /webhook/v1` und `/api/webhook/v1`, `apps/web/lib/composio-webhook.ts`) legt
Verbindungen, Trigger, beanspruchte Ereignis-Kennungen und Ereignis-Zusammenfassungen auf der eigenen,
selbst gehosteten Supabase-Instanz ab (`createSupabaseComposioStore()` in `apps/web/lib/composio-store.ts`,
über denselben PostgREST-Client wie der Chat). Der Speicher wird automatisch gewählt, sobald
`SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` gesetzt sind; sonst bleibt es beim Arbeitsspeicher einer
Funktionsinstanz, der auf Vercel nichts dauerhaft hält.

**Reihenfolge (wichtig):** Sind die Supabase-Variablen im Vercel-Projekt schon gesetzt (der Chat braucht
dieselben), nutzt diese Fassung die Datenbank sofort nach dem Ausliefern. Schritte 1 und 2 müssen dann
**vorher** erledigt sein, sonst antwortet der Webhook auf jedes gültige, behandelte Ereignis mit 500.

1. Migration einspielen (durch Pascal, bewusst, nicht automatisch):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/web/supabase/migrations/0004_composio.sql
   ```
   Sie ist unabhängig von `0001` bis `0003` und darf mehrfach laufen.
2. Schema über PostgREST freigeben und PostgREST neu laden:
   ```
   PGRST_DB_SCHEMAS="public,chat,composio"
   ```
3. Variablen (Vercel-Projekt, serverseitig): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (vorhanden),
   `NEXIFY_COMPOSIO_WEBHOOK=on`, `COMPOSIO_WEBHOOK_SECRET`. Optional `SUPABASE_TIMEOUT_MS`.
   Neue Variablen braucht die Ablage nicht.
4. Ausliefern, dann Rauchtest: Im Composio-Dashboard ein Test-Ereignis senden. Erwartet wird `200`;
   in `composio.event_claims` steht danach die Kennung der Zustellung. Dieselbe Zustellung erneut
   senden ergibt `200` mit `{"status":"duplicate"}`.

| Tabelle (`composio.`) | Inhalt | Schlüssel |
| --- | --- | --- |
| `connections` | Verbindung mit Mandant, Nutzer, Auth-Config, Status | `connected_account_id`; Index `(tenant_id, user_id)` |
| `triggers` | angelegte Trigger | `(tenant_id, user_id, trigger_id)` |
| `event_claims` | beanspruchte Ereignis-Kennungen (Idempotenz) | `event_id` |
| `events` | Ereignis: Typ, Mandant, Nutzer, Zeitpunkt, Trigger-Slug, Trigger-Kennung | `id`; eindeutig `event_id`; Index `(tenant_id, user_id, received_at)` |

- **Zugriff:** Row-Level-Security ist auf allen vier Tabellen an, ohne Richtlinie. `anon` und
  `authenticated` haben keine Tabellenrechte; gelesen und geschrieben wird nur serverseitig mit Service-Role.
- **Idempotenz:** `claimEvent` ist ein einzelnes `INSERT ... ON CONFLICT (event_id) DO NOTHING` mit Rückgabe
  der Zeile. Von gleichzeitigen Zustellungen derselben Kennung gewinnt genau eine; die übrigen werden mit
  `200 duplicate` quittiert. Scheitert die Verarbeitung, wird die Kennung wieder freigegeben.
- **Mandantentrennung:** Mandant und Nutzer sind Pflichtspalten. Sie kommen aus der Verbindung, die die
  Suite angelegt hat, nie aus dem Ereignis. Eine Verbindung kann den Besitzer nicht wechseln (Trigger in der Datenbank).
- **Datensparsamkeit:** Vom Inhalt eines Ereignisses wird nichts gespeichert, nur Trigger-Slug und Trigger-Kennung.
- **Störung:** Ist die Datenbank nicht erreichbar oder zu langsam, antwortet der Webhook mit `500`
  (`storage_unavailable` beim Beanspruchen, `processing_failed` danach) und Composio stellt erneut zu.
  Im Protokoll steht eine Zeile `{"event":"composio_webhook_store_failed","step":"claim","code":"composio_store_timeout"}`
  (Codes: `composio_store_timeout`, `composio_store_failed`, `composio_store_not_configured`), ohne Adresse,
  Schlüssel, Datenbanktext oder Kennungen.

Bekannte Grenzen:

- Es gibt keine automatische Löschung. `composio.events` und `composio.event_claims` wachsen, bis eine
  Aufbewahrungsfrist festgelegt und ein Löschlauf eingerichtet ist (Entscheidung Pascal). Gelesen werden je
  Mandant und Nutzer höchstens die jüngsten 200 Ereignisse.
- Bricht die Funktion zwischen Beanspruchen und Verarbeiten hart ab (Absturz, Zeitgrenze der Plattform),
  bleibt die Kennung beansprucht und eine Wiederzustellung gilt als Duplikat. Abhilfe von Hand:
  `delete from composio.event_claims where event_id = '<webhook-id>';`
- Schlägt schon das Beanspruchen fehl, gibt der Empfänger die Kennung vorsorglich frei, damit die
  Wiederzustellung nicht als Duplikat verloren geht. Läuft in genau diesem Moment eine zweite Zustellung
  derselben Kennung, kann das Ereignis zweimal verarbeitet werden; die Schreibvorgänge sind dafür wiederholbar
  (Status setzen, Ereignis je Kennung nur einmal).

Geprüft: `apps/web/auth/tests/composio-supabase-store.test.mjs` (ohne Netz, Fake-PostgREST) und
`apps/web/supabase/tests/composio_store.sql` (gegen ein lokales Wegwerf-PostgreSQL 16). Gegen die echte
Supabase-Instanz und gegen ein echtes PostgREST ist nichts gelaufen; der Rauchtest in Schritt 4 steht aus.

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
