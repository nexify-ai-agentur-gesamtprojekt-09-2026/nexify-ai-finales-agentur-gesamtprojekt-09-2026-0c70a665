# Kunden-Suite: technisches Fundament · 14.11.2026

Stand: Zweig `claude/epic-hopper-7d3duf`, Entwurfs-Pull-Request. Nichts davon ist ausgeliefert oder aktiviert.
Gebaut wurde nur, was ohne Geschäftsentscheidung des Inhabers baubar ist. Es gibt keinen Preis, keinen
Stufennamen, kein Limit und keinen Anbieter in diesem Code. „Getestet" heißt hier: lokal bzw. in der Prüfkette
gegen Attrappen – nicht „läuft in Produktion".

## 1. Was gebaut wurde

| # | Baustein | Ort | Nachweis |
|---|---|---|---|
| 1 | Besitzprüfung in der Portal-API | `apps/shop-api/shop/nexify_api.py` | `tests/test_portal_ownership.py` |
| 2 | Mandantenmodell mit erzwungener RLS | `db/foundation/002_suite_tenancy.sql` (+ `.down.sql`) | `db/foundation/verify_002.sql`, `run_checks.sh` |
| 3 | Abrechnungs- und Freischaltungskern | `apps/suite/subscription.py`, `billing.py`, `selfservice_bridge.py`, `config/suite-plans.json` | `tests/test_suite_billing.py` |
| 4 | E-Mail-Bestätigung | `apps/shop-api/shop/verification_api.py` | `tests/test_email_verification.py` |
| 5 | Eigenes LLM des Kunden: Sicherheitsgerüst | `apps/suite/byo.py` | `tests/test_suite_byo.py` |

### 1.1 Besitzprüfung (Sicherheit)

- Gesprächsverlauf (`GET /api/oracle/history/{id}`) und Fortsetzen (`POST /api/oracle/chat`) verlangen den
  Besitzer: angemeldete Gespräche gehören dem Konto, anonyme einem httpOnly-Cookie (`nx_oracle_owner`, nur als
  SHA-256 gespeichert, Sammlung `oracle_sessions`). Fremd oder unbekannt: einheitlich 404.
- Altgespräche ohne Besitzeintrag: nur lesbar, wenn genau ein Konto als Verfasser gespeichert ist; rein anonyme
  Altgespräche sind für niemanden mehr abrufbar (Betreiberansicht bleibt).
- Kontaktanfragen werden einem Konto nur noch dann über die E-Mail-Adresse zugeordnet, wenn die Adresse
  bestätigt ist (`email_verified`). Vorher reichte eine Registrierung mit fremder Adresse.
- Angebotsentscheidung: Mandant und Zustand „sent" sind Bedingung des Schreibvorgangs.
- Statischer Test: jede Route unter `/api/portal` ruft `need_user`, jede unter `/api/operator` `need_admin`.

### 1.2 Mandantenmodell

```
Konto (account, nur externe Kennung)
  └─ Mitgliedschaft (membership: owner | member | billing | viewer, aktiv/inaktiv)
       └─ Organisation = Mandant (organisation: active | locked)
            ├─ conversation      Gespräche
            ├─ subscription      ein Abonnement je Organisation
            ├─ entitlement       abgeleitete Berechtigungen
            ├─ llm_binding       Tresor-Verweis oder verwaltete Route
            └─ audit_event       nur anfügen
billing_event                    Journal eingehender Zahlungsereignisse (nicht für die Anwendungsrolle)
```

- `ENABLE` + `FORCE ROW LEVEL SECURITY` auf allen neun Tabellen. Zugriff nur, wenn `app.mandant_id` gesetzt ist
  **und** das Konto aus `app.account_id` dort eine aktive Mitgliedschaft hat. Eine Abfrage ohne Filter oder mit
  fremder Kennung liefert und ändert nichts außerhalb der eigenen Organisation.
- Rollen der Datenbank: `nx_suite_app` (Anfragen angemeldeter Konten), `nx_suite_billing` (Ereignisverarbeitung;
  schreibt Abonnement/Berechtigung nur in der einen Organisation im Kontext), `nx_suite_owner` (Schema, kein Login).
- Kein `DELETE`-Recht für Anwendungsrollen. Gesperrt/deaktiviert/widerrufen statt gelöscht.
- Keine personenbezogenen Daten, keine Schlüssel, keine Beträge im Schema.
- **Grenze der Aussage:** RLS schützt vor vergessenen Filtern und falschen Mandantenkennungen im Anwendungscode.
  Den Kontext setzt der Server aus der Sitzung; ein Server, der ein fremdes Konto in den Kontext setzt, liegt
  außerhalb dieser Sicherung (das Fundament 001 bindet zusätzlich an den Datenbank-Login – für Web-Anfragen mit
  Verbindungspool nicht übertragbar).
- Vorwärts: `002_suite_tenancy.sql` (wiederholbar). Rückweg: `002_suite_tenancy.down.sql` – verweigert, solange
  eine Suite-Tabelle Daten enthält; dann zuerst exportieren und ausdrücklich entscheiden.
- Prüfen: CI `bash db/foundation/test.sh` (Job `postgres-isolation`), lokal ohne Docker
  `bash db/foundation/test_local.sh` (Wegwerf-Cluster, nur Unix-Socket).

### 1.3 Abrechnungs- und Freischaltungskern

Zustandsdiagramm (reine Funktion `transition`, jede Kombination ist entschieden):

```
none ──trial_started──▶ trialing ──payment_succeeded──▶ active ◀──payment_succeeded── past_due
  └────────payment_succeeded────────────────────────────▶ │  ──payment_failed──────────▶ │
                                                          │                              │
trialing | active | past_due ──cancellation_requested──▶ canceled (Zugang bis Periodenende)
trialing | active | past_due | canceled ──period_ended──▶ ended ──payment_succeeded──▶ active
active | past_due | canceled ──payment_reversed─────────▶ ended (sofort, Fall an Betreiber)
```

Abgewiesen mit festem Code u. a.: zweite Testphase, nicht freigegebene oder unbekannte Stufe, Zahlung nach
Kündigung (`payment_after_cancellation_needs_review`), Stufenwechsel ohne eigenen Ablauf, Periodenende vor Ablauf.

Verarbeitung eines eingehenden Ereignisses (`EventProcessor.receive`):

1. Signatur über den Port prüfen – sonst abgewiesen, nichts gespeichert.
2. Anbieter-Port übersetzt in ein neutrales Ereignis – sonst abgewiesen.
3. Journal mit eindeutigem Paar (Anbieter, Ereigniskennung): Wiederholung = eine Wirkung; gleiche Kennung mit
   anderem Inhalt = 409.
4. Rücklesen beim Anbieter (`confirm`): dem zugestellten Inhalt allein wird nicht geglaubt.
5. Eine Transaktion: Abonnement + Berechtigungen + Audit + Journalstatus. Fehler danach = alles zurück.

- Falsche Reihenfolge: ein Ereignis, das älter ist als das zuletzt angewandte, wird als `ignored_stale` vermerkt.
- Wiederholung: höchstens 5 Versuche (`process_open`), danach Fehlerablage (`dead`). Nicht verarbeitbare
  Ereignisse gehen sofort in die Fehlerablage. Eine Rückholung aus der Fehlerablage ist nicht gebaut.
- Kein Webhook angekommen: `reconcile` fragt den Anbieter-Port; „unbekannt" bleibt unverändert.
- Berechtigungen: `derive_entitlements` ist die einzige Quelle für `chat`, `dashboard`, `connections`. Unbekannter
  Zustand, nicht freigegebene Stufe, fehlendes oder abgelaufenes Periodenende ⇒ nicht gewährt.
- Protokoll/Journal: nur Kennungen, feste Codes, Digest des normalisierten Ereignisses. Kein Nutzlasttext.
- Anschluss an `apps/selfservice/domain.py`: Die Domäne bleibt Eigentümerin von Registrierung, einmaliger
  Testphase (Dauer aus `config/selfservice-policy.json`) und Umstellungsbeleg. Eine bestätigte Erstzahlung löst
  über `SelfServiceActivation` genau eine `convert`-Buchung aus; lehnt die Domäne ab, wird die Zahlungswirkung
  zurückgerollt und das Ereignis erneut versucht.

### 1.4 E-Mail-Bestätigung

- Token: zufällig, einmalig, 60 Minuten (wie Passwort-Reset), nur als SHA-256 gespeichert; neuer Link entwertet
  ältere; bestätigt nur die Adresse, an die er ging.
- `POST /api/auth/verify-email` · `POST /api/auth/verify-email/resend` (angemeldet; Mindestabstand 60 s,
  höchstens 3 je Stunde – technische Vorgaben).
- Versand: Port `VerificationMailer`. Im Repository gibt es einen Versandweg (Outbox + Resend,
  `apps/shop-api/shop/mailer.py`); der Adapter nutzt ihn, aber nur mit eigenem Absender `NEXIFY_MAIL_FROM`.
  Ohne diesen wird nichts gesendet, damit keine NeXify-Post unter dem TEILEKLAR-Absender hinausgeht.
- Text: kurz, sachlich, „NeXify AI FACTORY", Kontakt mail@nexifyai.cloud, keine Zusagen.

### 1.5 Eigenes LLM (BYO)

- Gespeichert wird nur `vaultref:<32 hex>`. Schlüssel gehen in `SecretValue` verpackt direkt an den Tresor-Port.
- Wahl „eigener Schlüssel" oder „verwaltete Route" ist ausdrücklich je Organisation; es gibt keine Vorgabe.
- Fehlender, widerrufener, abgelehnter oder nicht erreichbarer Schlüssel ⇒ Fehler für den Kunden. Der Code hat
  keinen Zweig von dort zur verwalteten Route (kein stiller Rückfall auf NeXify-Kontingent).
- Anbieter nur von einer Freigabeliste; ausgeliefert ist sie leer.

## 2. Schalter (alle standardmäßig AUS)

| Schalter | Wirkung bei exakt `on` |
|---|---|
| `NEXIFY_SUITE` | Hauptschalter; ohne ihn wirkt kein Teilschalter |
| `NEXIFY_SUITE_EMAIL_VERIFICATION` | Bestätigungslink bei Registrierung, beide Routen aktiv (sonst 404) |
| `NEXIFY_SUITE_BILLING`, `NEXIFY_SUITE_BYO_LLM` | definiert in `apps/suite/flags.py`; noch an keine Route angeschlossen |
| `NEXIFY_MAIL_FROM` | Absender für NeXify-Konto-Mails; leer ⇒ kein Versand |

Nicht hinter einem Schalter, weil Sicherheitskorrektur: Abschnitt 1.1. Migration 002 wirkt erst, wenn sie
jemand anwendet. `config/suite-plans.json` gibt nichts frei.

## 3. Ports und Attrappen

| Port | Datei | Attrappe (nur Tests) | Echte Anbindung |
|---|---|---|---|
| `PaymentProvider` (parse, confirm, read_back) | `apps/suite/billing.py` | `FixtureProvider` | keine |
| `SignatureVerifier` | `apps/suite/billing.py` | `FixtureSignature` (HMAC, Zeitfenster) | keine |
| `ActivationSink` | `apps/suite/billing.py` | – | `SelfServiceActivation` (lokale Domäne) |
| Speicher des Kerns | `SqliteBillingStore` | derselbe (lokal) | PostgreSQL-Adapter fehlt |
| `VerificationMailer` | `verification_api.py` | Test-Erfassung | `OutboxVerificationMailer` (Resend-Outbox) |
| `Vault` | `apps/suite/byo.py` | `FixtureVault` | keine |

## 4. Bewusst NICHT gebaut

- Kein Zahlungsanbieter-Adapter, kein Checkout, keine Preis-/Tarifseite, keine Rechnung.
- Keine HTTP-Route für Zahlungsereignisse und kein PostgreSQL-Speicheradapter (braucht Datenbank- und
  Anbieterentscheidung); `handle_webhook` ist die rahmenneutrale Vorstufe.
- Kein Anbieteradapter und kein Modellaufruf für BYO, kein echter Tresor, keine Oberfläche.
- Keine Anbindung der Suite-Tabellen an die bestehenden MongoDB-Konten (Datenübernahme ist eigene Entscheidung).
- Keine Aufnahme von Portal- oder Bestätigungsrouten in den Vercel-Einstieg (`apps/shop-api/vercel_app.py`
  prüft die Sammlungen exakt; `email_verifications`/`oracle_sessions` müssten dort und im Namensraum ergänzt werden).
- Keine Seite für den Bestätigungslink (`/konto/email-bestaetigen`) – `apps/web` wurde nicht berührt.
- Keine Composio-/MCP-Anbindung, kein Kunden-Chat, keine Kündigungs- oder Exportoberfläche.
- Die Preisentwürfe im Bestand (`nexify_api.py` `PLANS` und Systemprompt; `config/api-prepaid.json`) wurden
  weder verwendet noch vereinheitlicht noch entfernt.

## 5. Entscheidungen des Inhabers, die es braucht

| Thema | Offene Frage | Blockiert |
|---|---|---|
| Stufen/Preise | Anzahl, Namen, Inhalte, Beträge; welcher der widersprüchlichen Entwürfe gilt; Umfang der Testphase; Kulanzfrist bei Zahlungsausfall; was nach Ende lesbar bleibt | Freigabe in `config/suite-plans.json`, jede Berechtigung |
| Zahlungsanbieter | welcher, wer eröffnet das Konto, Zahlarten, Test/Live getrennt | Adapter, Webhook-Route |
| Kundenkreis | nur Unternehmen oder auch Verbraucher (Widerruf, Button-Lösung, Kündigungsweg) | Registrierung, Checkout, Rechtstexte |
| Steuer | Behandlung durch Steuerberatung (Reverse Charge, USt-IdNr.-Prüfung), Rechtsform | Rechnung |
| Versandanbieter | Resend auch für NeXify-Konto-Mails? Absenderadresse und -domain (`NEXIFY_MAIL_FROM`) | Aktivierung der E-Mail-Bestätigung |
| Tresor | welcher Dienst, wo betrieben, wer hat Zugriff | BYO |
| Zugelassene LLM-Anbieter | Liste für BYO, Haftung für fremde Schlüssel | BYO |
| Composio | Konto, Tarif, Nutzungsrecht für Kunden, AVV/SCC | Verbindungen |
| Rechtstexte | AGB der Suite, AVV, Datenschutz, zulässige Nutzung; anwaltliche Prüfung | Livegang |
| Produktionsdatenbank | wo läuft PostgreSQL für die Suite; Übernahme der Konten | Anwendung der Migration 002 |

## 6. Weitere Befunde (nicht behoben, nur gemeldet)

1. **Kontoübernahme vor Bestätigung:** `POST /api/auth/google/session` verknüpft ein Google-Profil mit einem
   bestehenden, nie bestätigten Passwortkonto gleicher Adresse. Wer vorher mit fremder Adresse registriert hat,
   behält sein Passwort und damit Zugang. Vorschlag: bei Verknüpfung eines unbestätigten Passwortkontos Passwort
   und Sitzungen verwerfen. Nicht geändert, weil es bestehendes Anmeldeverhalten verändert.
2. `GET /api/operator/overview` greift auf `providers()[2]` zu; die Liste hat einen Eintrag ⇒ Laufzeitfehler.
3. Tageslimit des Portal-Chats zählt je Gesprächskennung; ein neues Gespräch umgeht es. Kein Limit je Absender.
4. `DELETE /api/portal/team/{id}` löscht endgültig (Inhabergrenze „nichts unwiderruflich löschen").
5. Portal-Chat sendet die Policy-Kennung des Modells; laut `apps/web/lib/chat-llm.ts` lehnt der Router sie ab
   (aus der Bestandsaufnahme übernommen, nicht gemessen).
6. `main` hat unabhängig von dieser Arbeit fehlschlagende Prüfungen (`make test`, `make check-arch`):
   Quell-Hash-Drift in Browserbelegen und im Anforderungsregister. Ein Vergleichslauf gegen `origin/main` zeigt
   dieselben Fehler; dieser Zweig fügt keine hinzu. `PROGRESS.md` wurde deshalb nicht fortgeschrieben: die Datei
   ist im Anforderungsregister per Hash gebunden, und Hashes werden nicht ohne den zugehörigen Prüflauf erneuert.

## 7. Prüfstand dieses Zweigs

- Neue Tests: 50 (Portal-Besitz 8, Abrechnungskern 24, E-Mail-Bestätigung 8, BYO 10); mit den gepinnten
  Abhängigkeiten aus `apps/shop-api/requirements.in` alle grün, ohne sie 37 grün und 13 übersprungen.
- Datenbank: `bash db/foundation/test_local.sh` grün auf lokalem PostgreSQL 16 (Migration 001 und 002 je zweimal,
  Isolationsbeweis, Rückweg mit Datenschutzriegel, erneut vorwärts). Nicht ausgeführt: `db/foundation/test.sh`
  im CI-Container (anderes Abbild, per Digest gepinnt).
- `make check` grün.
