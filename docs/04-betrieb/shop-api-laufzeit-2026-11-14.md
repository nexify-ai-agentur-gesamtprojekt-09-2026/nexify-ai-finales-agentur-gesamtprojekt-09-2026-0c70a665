# Shop-API auf Vercel: was gesetzt sein muss, damit sie antwortet · 14.11.2026

Stand: Zweig `claude/teileklar-backend` (Entwurf, nicht ausgeliefert). Betrifft den Vercel-Dienst `shop`
(`apps/shop-api/vercel_app.py`). Diese Notiz nennt nur **Namen** von Variablen, nie Werte.
Kennzeichnung: **IST** = gemessen oder im Code belegt · **OFFEN** = nur in Vercel bzw. in der Datenbank prüfbar.

## 1. Befund: warum die Schnittstelle 503 liefert

Messung 14.11.2026, 03:59 UTC, lesende Abrufe gegen `https://nexify-ai-finales-agentur-gesamtpro-one.vercel.app`:

| Abruf | Antwort | Grund laut Antwort |
|---|---|---|
| `GET /api/health` | 503 | `project_binding_unverified` |
| `GET /api/shop/status` | 503 | `project_binding_unverified` |
| `GET /api/workshops/search?q=Aachen` | 503 | `project_binding_unverified` |
| `GET /api/shop/orders` | 503 | `payment_mode_unbound` |

Daraus folgen zwei belegte Ursachen (IST):

1. **Projektbindung.** Der Einstieg verlangte fest `VERCEL_PROJECT_ID == prj_Po7jl…` (bisher Zeile 23 und 63).
   `AGENTS.md` nennt seit 13.11.2026 als Produktion das Projekt `…-0c70a665-ut7r` im Team `nexify-projekte`.
   Dessen Kennung ist eine andere, oder die Variable ist dort gar nicht sichtbar. Solange diese Prüfung scheitert,
   bleibt jede Route geschlossen – unabhängig davon, ob Datenbank, Zahlung oder Mail eingerichtet sind.
2. **Zahlungsmodus.** `REVOLUT_MODE` ist im laufenden Projekt nicht `live` oder `sandbox` (sonst käme für
   `/api/shop/orders` der Grund aus 1). Bisher schloss das auch Anmeldung, Registrierung und Anfragen.

OFFEN, weil erst hinter 1 sichtbar: ob Datenbankadresse, Namensraum, öffentliche Adresse und Steuersatz gesetzt
sind und ob der Namensraum in der Datenbank mit dem erwarteten Schema angelegt ist (Abschnitt 4, Schritt 5).

## 2. Was im Code geändert wurde

- **Zulassungsliste statt fester Kennung.** `SHOP_API_ALLOWED_PROJECT_IDS` nennt ausdrücklich die Projekte, die
  diesen Datenbestand bedienen dürfen (Komma-getrennt, höchstens 5, Form `prj_…`, kein Platzhalter). Nicht
  gesetzt: nur das ursprüngliche Projekt – das Verhalten wie bisher. Fehlerhafte Liste: geschlossen
  (`project_allowlist_invalid`). Ist die Liste gesetzt, gilt nur sie.
- **Kennung im Datenbankschema bleibt.** Die Markierung in den Sammlungen (`SCHEMA_MARKER`) enthält weiter die
  ursprüngliche Projektkennung. Sie beschreibt den Datenbestand, nicht das ausliefernde Projekt; ein angelegter
  Namensraum passt also auch nach dem Projektwechsel.
- **Teilbetrieb.** Ohne Zahlungsmodus sind nur noch zahlungsabhängige Wege geschlossen: `/api/shop/checkout/*`,
  `/api/shop/orders*`, `/api/shop/webhooks/*`, `/api/admin/*` (Shop-Verwaltung). Offen bleiben Konten, Katalog,
  Warenkorb, Werkstattsuche, Anfragen. Ein nicht eingeordneter Pfad gilt als zahlungsabhängig. Fehlende
  Mail-Zugänge schließen nichts (Mails bleiben im Ausgang).
  Nicht entkoppelt, mit Grund: Datenbank, öffentliche Adresse (Herkunftsprüfung aller Schreibwege, Links in Mails)
  und Steuersatz (Preisanzeige im Katalog) bleiben Voraussetzung für alles.
- **Diagnose.** Protokollzeile je Ursache einmal pro Prozess:
  `shop_runtime_unavailable reason=<Code> variables=<NAMEN>` und je eingeschränkter Fähigkeit
  `shop_runtime_degraded capability=… reason=… variables=<NAMEN>`. Interner Weg `GET /api/health/runtime`:
  existiert nur (sonst 404), wenn `SHOP_DIAGNOSTICS_TOKEN` (mindestens 32 Zeichen) gesetzt ist und im Kopf
  `X-Shop-Diagnostics-Token` mitgesendet wird; liefert alle offenen Voraussetzungen auf einmal, je Variable nur
  „set"/„missing".

## 3. Variablen im Vercel-Projekt (Produktion) – nur Namen

Projekt: das Produktionsprojekt laut `AGENTS.md` (`…-0c70a665-ut7r`, Team `nexify-projekte`), Umgebung „Production".

| Variable | Zweck | Fehlt sie |
|---|---|---|
| `VERCEL_PROJECT_ID` | von Vercel gesetzt, wenn „System Environment Variables" freigegeben sind | alles 503 |
| `SHOP_API_ALLOWED_PROJECT_IDS` | Kennung genau dieses Projekts (Projekteinstellungen → „Project ID") | alles 503, solange das Projekt nicht das ursprüngliche ist |
| `MONGODB_URI` (oder `MONGO_URL`, nicht beide verschieden) | Datenbank | alles 503 |
| `DB_NAME` | muss `nexify_teileklar_shop_v1` sein (oder im Pfad der Adresse stehen) | alles 503 |
| `PREVIEW_PUBLIC_ORIGIN` | öffentliche Adresse der Seite, `https://…` ohne Pfad | alles 503 |
| `SHOP_VAT_PERCENT` | Steuersatz als Zahl | alles 503 |
| `REVOLUT_MODE` | `live` oder `sandbox` | nur Kasse/Bestellungen/Verwaltung 503 |
| `REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION` bzw. `…_SANDBOX` | passend zum Modus | Zahlung schlägt beim Anbieter fehl |
| `RESEND_API_KEY`, `RESEND_FROM` (oder `RESEND_FROM_ADDRESS`) | Mailversand unter TEILEKLAR-Absender | Mails bleiben im Ausgang |
| `MAIL_INTERNAL_TO` | Empfänger interner Benachrichtigungen | keine Betreiber-Benachrichtigung |
| `NEXIFY_MAIL_FROM` | Absender für NeXify-Post | NeXify-Anfragen gehen intern weiter unter dem Standardabsender |
| `BIGBUY_API_KEY_PRODUCTION` (oder `BIGBUY_API_KEY`) | Katalogimport, Bestellweitergabe | kein Import |
| `SHOP_DIAGNOSTICS_TOKEN` | schaltet den internen Diagnoseweg frei | Diagnoseweg antwortet 404 |

Schalter, alle Standard AUS (nur der genaue Wert zählt):

| Schalter | Wert | Wirkung |
|---|---|---|
| `TEILEKLAR_PARTNER_APPLICATIONS` | `on` | Partnerantrag (`/api/partner-applications`, `/api/admin/partner-applications`); braucht zusätzlich die Sammlung `partner_applications` (Abschnitt 5) |
| `TEILEKLAR_OPERATOR_INBOX` | `on` | Betreiber-Liste der Werkstattanfragen und TEILEKLAR-Anfragen (`/api/admin/teileklar/*`) |
| `TEILEKLAR_NONPARTNER_REQUESTS` | `abweisen` oder `an_teileklar` | Anfragen an Betriebe ohne Partnerschaft abweisen bzw. als Einbauwunsch an TEILEKLAR führen; sonst wie bisher annehmen |

## 4. Reihenfolge

1. In Vercel prüfen, welches Projekt die Adresse ausliefert, und dessen „Project ID" ablesen.
2. Dort setzen: `SHOP_API_ALLOWED_PROJECT_IDS` (diese Kennung), Datenbank, `DB_NAME`, `PREVIEW_PUBLIC_ORIGIN`,
   `SHOP_VAT_PERCENT`. Prüfen, dass die Systemvariablen freigegeben sind.
3. Neu ausliefern (Variablen wirken erst im nächsten Deployment).
4. `GET /api/health` aufrufen. Antwort 200 = Konfiguration und Datenbankschema passen.
5. Antwort 503 mit `namespace_schema_unbound`, `required_index_unverified` oder `database_metadata_unavailable`:
   Der Namensraum ist nicht (passend) angelegt oder nicht erreichbar. Prüfen nur lesend mit
   `python3 apps/shop-api/namespace_operator.py preflight` in einer Umgebung mit denselben Variablen. Anlegen
   (`init`) nur auf leerem Namensraum und nur mit bestätigtem Plan-Hash; siehe
   `docs/deployment/shop-namespace-operator-2026-10-31.md`. Kein automatischer Lauf.
6. Erst danach `REVOLUT_MODE` und Zahlungsschlüssel, dann Mail. Vorher sind Katalog, Konten, Werkstattsuche und
   Anfragen bereits nutzbar.

## 5. Prüfaufrufe

```
curl -s https://<adresse>/api/health
curl -s "https://<adresse>/api/workshops/search?q=Aachen"
curl -s -H "X-Shop-Diagnostics-Token: <wert aus Vercel, nicht protokollieren>" https://<adresse>/api/health/runtime
```

Sammlung für den Partnerantrag ergänzen (nur wenn der Schalter eingeschaltet werden soll, bewusst und einzeln):

```
python3 apps/shop-api/namespace_operator.py extend-plan --collection partner_applications
python3 apps/shop-api/namespace_operator.py extend --collection partner_applications --confirm-plan-sha256 <hash aus extend-plan>
```

Ohne diese Sammlung antwortet bei eingeschaltetem Schalter nur der Partnerantrag mit 503
(`feature_schema_unbound`); alles andere läuft weiter.

Altbestand der Anfragen nach Marke kennzeichnen (fügt nur Felder hinzu, löscht nichts, läuft nie von selbst):
`shop.brands.backfill(db)` liefert die Zählung ohne zu schreiben, `backfill(db, apply=True)` schreibt.

## 6. Bekannte Grenzen

- Der Laufzeit-Einstieg legt keine Sammlungen an. Schreibt eine eingeschaltete Funktion in eine Sammlung, die
  nicht zum Schema gehört, entsteht sie in MongoDB von selbst – ohne Markierung – und der Einstieg schließt danach
  alles (`namespace_schema_unbound`). Das betrifft heute die E-Mail-Bestätigung (`email_verifications`), falls
  deren Schalter im Vercel-Projekt eingeschaltet würden. Diese Schalter dort nicht setzen, bevor die Sammlung wie
  `partner_applications` als optionale Sammlung aufgenommen ist.
- Ob `shop/partner_policy.json` im Vercel-Bündel liegt, wurde nicht mit dem Vercel-Werkzeug geprüft
  (`apps/shop-api/tests/verify_vercel_bundle.cjs` braucht eine lokale Vercel-Installation). Fehlt die Datei,
  antwortet nur der Partnerantrag mit 503 (`partner_policy_unavailable`).
