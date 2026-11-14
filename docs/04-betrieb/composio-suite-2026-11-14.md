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
   `composio.trigger.message` und `composio.trigger.disabled` werden mandantengebunden abgelegt (Gerüst).

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
