# Composio-Anbindung der Suite · 14.11.2026

Stand: Zweig `claude/suite-composio` (Basis `claude/epic-hopper-7d3duf`), Entwurf. Nichts ist ausgeliefert oder aktiviert.
Der Schalter ist standardmäßig **aus**. Diese Notiz enthält keine Werte, nur Namen.

## Zweck

Suite-Nutzer verbinden externe Konten (z. B. Postfach, Kalender) über Composio „Hosted Authentication". Composio meldet
Verbindungsstatus und Trigger per Webhook (V3) an die Suite zurück. Jede Verbindung gehört genau einem Suite-Nutzer
und einem Mandanten; Mandant und Nutzer stammen nie aus Anfrage-Parametern oder Webhook-Inhalt.

## Ablauf

1. Der angemeldete Suite-Nutzer ruft `POST /api/suite/composio/connect` mit `{"auth_config_id": "..."}` auf (nur erlaubte
   Kennungen aus `config/integrations/composio.json`, `erlaubte_auth_config_ids`; leer = alles verweigert).
   Die Route erzeugt über Composio (`POST /connected_accounts/link`) einen Connect-Link und legt die Verbindung als
   `pending` an Nutzer und Mandant gebunden ab. Antwort: `redirect_url`.
2. Der Nutzer autorisiert beim Anbieter. Composio führt den Browser zu `GET /api/suite/composio/verify?connected_account_id=...`
   (OAuth user verification). Die Route prüft die Suite-Sitzung, vergleicht die Kontokennung mit der gemerkten Verbindung
   (gleicher Nutzer, gleicher Mandant), ruft dann `complete_auth` bei Composio auf und antwortet mit dem angemeldeten
   Suite-Nutzer. Fremde oder unbekannte Kennungen: einheitlich 403.
3. Composio aktiviert die Verbindung und sendet `composio.connected_account.activated` (bzw. `.expired`) an den Webhook.
   `composio.trigger.message` und `composio.trigger.disabled` werden mandantengebunden abgelegt und an die Übergabestelle gereicht (siehe Trigger-Schicht).

## Webhook

- Pfade: `/webhook/v1` (`apps/web/app/webhook/v1/route.ts`) und `/api/webhook/v1`; beide nutzen dieselben Handler.
- Signatur (Composio-Doku „Receiving events", `docs.composio.dev/docs/webhook-verification`): HMAC-SHA256 über
  `{webhook-id}.{webhook-timestamp}.{roher Body}`, Schlüssel `COMPOSIO_WEBHOOK_SECRET`, Base64; Header `webhook-signature`
  (Teil nach dem ersten Komma), `webhook-id`, `webhook-timestamp`; Zeitfenster 300 s. Ungültig oder ohne Secret: 401.
- Idempotenz: je `webhook-id` höchstens einmal; bei Verarbeitungsfehler wird die Kennung freigegeben (Wiederzustellung).
- Schalter aus: 503 `composio_not_configured`. GET (und andere Methoden): 405.

## Umgebungsvariablen (nur in der Laufzeitumgebung setzen, nie im Repository)

| Name | Geheim | Zweck |
|---|---|---|
| `NEXIFY_SUITE` | nein | Hauptschalter der Suite (`on`) |
| `NEXIFY_SUITE_COMPOSIO` | nein | Schalter dieser Anbindung (nur exakt `on` schaltet ein; Standard aus) |
| `COMPOSIO_API_KEY` | ja | REST-Aufrufe (`x-api-key`) |
| `COMPOSIO_AUTH_TOKEN` | ja | reserviert, vom Code derzeit nicht gelesen |
| `COMPOSIO_WEBHOOK_SECRET` | ja | Webhook-Signaturprüfung |
| `COMPOSIO_PROJECT_ID` | nein | Projekt (Standard aus der Konfiguration) |
| `COMPOSIO_ORG_ID` | nein | reserviert |

Zusätzlich für die Sitzungsprüfung: `SHOP_API_BASE_URL` (wie im Shop-Code). Nicht geheime Kennungen stehen in
`config/integrations/composio.json`.

## Live-Pfad

`https://nexifyai.cloud/webhook/v1` ist erst nach dem Merge nach `main` und einer Auslieferung erreichbar. Entscheidung des
Inhabers: `nexifyai.cloud` wird als Domain der Vercel-App bedient. Die fünf `COMPOSIO_*`-Variablen sind laut Inhaber in
Vercel (production und preview) gesetzt; der Code liest sie nur über `process.env`. Der Schalter bleibt aus.

Test-Nutzer: Die Composio-Vorschau nutzt Test-Kennungen der Form `pg-test-...`. Im Code ist keine Nutzerkennung fest
verdrahtet; die Composio-Nutzerkennung ist immer die Suite-Nutzer-ID der Sitzung (Test verhindert `pg-test-` im Quelltext).

SDK: `@composio/core` wird bewusst nicht verwendet (siehe PR-Beschreibung): Der Connect-Fluss braucht nur zwei REST-Aufrufe,
und der Webhook-Empfänger bleibt ohnehin reine HMAC-Prüfung.

## Trigger-Schicht (Stand 14.11.2026, Entwurf, hinter demselben Schalter)

Fluss:

1. `POST /api/suite/composio/triggers` mit `{"slug": "...", "trigger_config": {...}, "connected_account_id": "..."?}`.
   Nur angemeldet (sonst 401), Schalter aus = 503, gleiche Herkunftsprüfung wie beim Connect-Link. Der Slug muss in
   `erlaubte_trigger_slugs` (`config/integrations/composio.json`) stehen; **leer bis Inhaberfreigabe**, also 422
   `trigger_slug_not_allowed`. Eine angegebene `connected_account_id` muss dem Sitzungs-Nutzer und -Mandanten gehören (sonst 403).
   Ablauf: `getTriggerType(slug)` (`GET /triggers_types/{slug}`, fail-closed) und `createTrigger(userId, slug, config)`
   (`POST /trigger_instances/{slug}/upsert`); `userId` ist immer die Suite-Sitzungs-Nutzer-ID. Der angelegte Trigger wird
   mandantengebunden gemerkt.
2. `GET /api/suite/composio/triggers` listet die Trigger des angemeldeten Nutzers aus dem eigenen Speicher (Composio-Listen-Endpunkt nicht verwendet, siehe Annahmen).
3. Composio sendet `composio.trigger.message` / `composio.trigger.disabled` an den Webhook (Signatur und Idempotenz unverändert).
   Der Webhook legt das Ereignis mandantengebunden ab und ruft danach genau einmal je neuem Ereignis den `AgentEreignisPort` auf.
4. `GET /api/suite/composio/events?limit=&offset=` liefert die abgelegten Ereignisse des angemeldeten Nutzers (neueste zuerst,
   `limit` höchstens 100, Standard 50). Mandant und Nutzer stammen nie aus Query oder Headern.

**Reversible Zielentscheidung:** Trigger-Ereignisse landen im mandantengebundenen Ereignisspeicher und sind über die angemeldete
Lese-Schnittstelle abrufbar. Zusätzlich gibt es die Übergabestelle `apps/web/lib/composio-agent-port.ts` (Interface
`AgentEreignisPort`, Standard: No-Op ohne Protokollierung). Dort wird später `packages/agent_core` (NeX Agentic) angebunden,
indem eine Implementierung per `setAgentPort` gesetzt wird. Heute ist **nichts** an einen laufenden Kern verdrahtet; ein
Fehler der Übergabestelle lässt die Webhook-Antwort bei 200 und das Ereignis abgelegt. Kein hartes Ziel: Konsument austauschbar.

Annahmen zur Composio-REST (Quelle: `docs.composio.dev/docs/setting-up-triggers/creating-triggers`, abgerufen 14.11.2026):
Pfade `triggers_types/{slug}` (Schema im Feld `config`) und `trigger_instances/{slug}/upsert` (Body `user_id`, `trigger_config`,
optional `connected_account_id`) stehen dort. **Nicht belegt:** Name des Antwortfelds mit der Trigger-Kennung (angenommen
`trigger_id`) und ein Listen-Endpunkt; deshalb listet die Suite aus dem eigenen Speicher. Vor dem Einschalten gegen die Referenz prüfen.

Zusätzliche offene Punkte: Trigger- und Ereignisspeicher teilen die Grenze des Arbeitsspeichers (Punkt 1 oben);
`erlaubte_trigger_slugs` befüllt allein der Inhaber.

## Offene Punkte (Owner: Inhaber/Betrieb, vor dem Einschalten)

1. Echter Speicher: Der Standardspeicher liegt im Arbeitsspeicher einer Instanz (`apps/web/lib/composio-store.ts`);
   Idempotenz und Status sind damit nicht verlässlich. Datenbank-Implementierung mit Mandanten-RLS nötig.
2. Mandant: bis zur Anbindung der Organisations-Mitgliedschaft gilt `konto:<user_id>` als Mandant (`suite-session.ts`).
3. `erlaubte_auth_config_ids` befüllen (Freigabe durch den Inhaber).
4. Annahmen gegen die Composio-Referenz prüfen: Antwortfeld `connected_account_id` des Link-Endpunkts, Pfad und Body von
   `complete_auth`, Header `x-project-id`, Aufrufform des Verifier-URL. Die Seite zur Nutzerprüfung war nicht abrufbar;
   diese Teile stehen isoliert in `apps/web/lib/composio.ts` und `composio-routes.ts`.
5. Webhook im Composio-Dashboard erst nach Auslieferung und Einschalten auf den Live-Pfad zeigen lassen.

## Prüfen

`cd apps/web && node --test auth/tests/composio.test.mjs` (ohne Netz, nur Dummywerte) und `npm run typecheck`.
