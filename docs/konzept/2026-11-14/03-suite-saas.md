# 03 · Suite & SaaS-Architektur – Bestandsaufnahme und Vorschlag

Stand: 14.11.2026 · Nur-Lese-Analyse · Repository `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`, HEAD `a4d927e` (14.11.2026 02:47 UTC, Commit-Titel „zwischenstand … ungeprueft, nicht mergen"). Der Arbeitsbaum enthielt während der Analyse nicht eingecheckte Änderungen anderer Agenten (u. a. `apps/web/app/api/chat/route.ts`); gelesen wurde der Arbeitsbaum.

Kennzeichnung in diesem Dokument:

- **IST belegt** – im Repository gelesen, mit Fundstelle. „Belegt" heißt: Code/Konfiguration vorhanden. Es heißt nicht „läuft in Produktion", außer es steht ausdrücklich dabei.
- **SOLL laut Inhaber** – aus dem Auftragstext vom Inhaber oder aus Inhabervorgaben im Repository.
- **Lücke** – Differenz zwischen IST und SOLL.
- **Annahme** – nicht belegt; Vorschlag oder allgemeines Fachwissen, vor Verwendung zu prüfen.

Keine Preise, Pakete, Limits oder Anbieterverträge wurden erfunden. Wo das Repository Zahlen enthält, sind sie als Fundstelle zitiert und als Entwurf markiert.

---

## 0. Kurzantworten auf die drei Leitfragen

**Welche Auth-Lösung ist aktiv?**
Eigene Konten in `apps/shop-api` (FastAPI + MongoDB): E-Mail/Passwort mit bcrypt, serverseitige Sitzung im Cookie `tk_session` (httpOnly, Secure, SameSite=Lax, 14 Tage), Passwort-Reset per Resend, Sperre nach 5 Fehlversuchen in 15 Minuten, dazu „Mit Google anmelden" über Emergent-managed Google Auth (`apps/shop-api/shop/accounts_api.py:1–211`; Entscheidung `DECISIONS.md` D-007, Inhabervorgabe 31.10.2026).
Clerk ist aus `apps/web` entfernt (kein `@clerk/*` in `apps/web/package.json`); übrig sind SDK-freie Hüllen und Konfigurationsreste: `apps/web/auth/policy.ts:33–43`, `apps/web/auth/public-provider.ts`, `apps/web/components/LocaleAwareClerk.tsx`, `config/clerk-production.json`, `config/clerk-dns.json`, CSP-Eintrag `clerk.nexifyai.de` in `vercel.json` (Kopfzeilenblock).
Supabase wird nicht für Anmeldung genutzt, sondern nur serverseitig per Service-Role für die Ablage des öffentlichen Chats (`apps/web/lib/supabase-rest.ts:8–24`, Migrationen `apps/web/supabase/migrations/0001–0003`).
Produktionsstand: Laut `AGENTS.md:16–20` (13.11.2026) antwortet die Shop-API im Vercel-Projekt mit 503, weil Laufzeit-Zugänge fehlen. Damit funktionieren Registrierung und Anmeldung in der Produktion derzeit nicht. Nicht selbst gemessen.

**Gibt es einen Zahlungsanbieter im Code?**
Ja, genau einen: Revolut Merchant API – aber nur für Einmalzahlungen im TEILEKLAR-Shop (`apps/shop-api/shop/revolut.py:1–81`, Webhook `apps/shop-api/shop/checkout_api.py:266`, Betriebsart `apps/shop-api/shop/config.py` `revolut_mode()`; `DECISIONS.md` D-008). Für Abonnements der Suite gibt es keinen Zahlungscode. Stripe, Mollie, Paddle, PayPal, GoCardless kommen in keinem Anwendungscode vor (Treffer nur in Rechtstext-Prototypen, Recherchedateien und Build-Artefakten).

**Kommen „Composio" und „Jeff AI" vor?**
- *Composio*: nur als Konfigurations-/Regel-Eintrag, kein Anwendungscode. `config/integrationen.json:95–101` (Status „prüfen", Hinweis „US-Anbieter: nur ohne personenbezogene Kundendaten oder mit AVV/SCC"), `config/regelwerk.json:155–159` (`drittland: true`, `avvScc: false`, „Entscheidung E-B offen"), `config/automation.json:85` („user_selected_not_verified"), `config/integrations/clerk-mcp.json` (Composio-MCP `connect.composio.dev/mcp` mit Clerk als Aussteller: Status „blocked_existing_server_control_not_available"). In `PROGRESS.md:881–889` wird Composio als Weg zu ElevenLabs genannt.
- *Jeff*: vorhanden als internes Entscheidungs-Orakel `nx-jeff` (Modell `typesafe/jev-1.13`, „Kein Chat, nur choice/score/noul", `docs/jeff-integration.md:3`) und als CI-Freigabeprüfung (`docs/JEFF-INTEGRATION.md`, `tools/jeff-gate.py`, `.gitlab-ci.yml`). Als Baustein einer Kunden-KI-Kette kommt Jeff nicht vor. Die Suite-Policy führt eine zweite Komponente unter dem Namen „JavAI" als ungeklärt und verbietet die Gleichsetzung mit Jev/Jeff (`config/selfservice-policy.json:62–65`, `config/research/byok-adapters.json:2447–2456`). `docs/09-final/mastervorgabe-2026-10-29.md:160`: „Jeff/jev ist nicht ChatGPT-Oracle."
- Die Schreibweise „ORACEL" kommt im Repository nicht vor; durchgängig steht „AIFly ORACLE" (`DECISIONS.md` D-010). Offen, siehe Abschnitt 7.

---

## 1. IST je Baustein des Workflows

Statusskala: **A** läuft belegt · **B** Code vorhanden, aber nicht verbunden · **C** nur Konzept/Policy · **D** fehlt.

| # | Baustein | Status | Kurzbefund |
|---|---|---|---|
| 1 | Registrierung | B | Code vollständig, in Produktion laut `AGENTS.md` 503; E-Mail-Bestätigung fehlt |
| 2 | Anmeldung/Sitzung | B | Code vollständig, gleicher Produktionsvorbehalt |
| 3 | Abo/Preismodell | C (+ Entwurf im Code) | Tarifstufen mit Beträgen als ungeprüfter Entwurf hartkodiert; Policy sagt „kein Preis" |
| 4 | Bezahlung (Abo) | D | Kein Abo-Zahlungscode; Revolut nur für Shop-Einmalzahlung |
| 5 | Freischaltung/Rollen | B/C | Rollen `customer`/`admin`; keine Berechtigung aus Zahlung; Domänenmodell nur lokal |
| 6 | Kundenbereich/Dashboard | B | Oberfläche und API vorhanden; API im Vercel-Adapter nicht geladen und nicht geroutet |
| 7 | Chat für angemeldete Kunden | B | Zwei Chat-Pfade; keiner ist ein mandantengebundener Kundenchat in Produktion |
| 8 | Composio-MCP | C | Nur Konfiguration und Regel; Datenschutzentscheidung offen |
| 9 | Eigenes LLM (BYO) | C (+ lokales Domänenmodell) | Policy und Recherche; kein Tresor, kein Adapter, keine Oberfläche |
| 10 | „NeXify AI Intelligenz" | B | Ein Modell über 9router im öffentlichen Chat; keine Kette, kein Jeff, keine Stützmodelle |
| 11 | Mandantentrennung | B/C | Drei verschiedene Modelle nebeneinander; keines deckt die Suite in Produktion ab |
| 12 | Rechnungen/Belege | B | Manuelle Rechnung als HTML im Portal; XRechnung-Gerüst unvollständig |
| 13 | Kündigung | B (nur Anfrage) | Setzt Status „kuendigung_angefragt"; keine Wirkung auf Zahlung oder Zugang |
| 14 | Support | B | Ticket-API mit Mail an intern; hängt am selben nicht verbundenen Portal |

### 1.1 Registrierung

- **IST belegt:** `POST /api/auth/register` legt Konto mit Rolle `customer` an, startet sofort eine Sitzung und stellt eine Willkommensmail in die Warteschlange (`apps/shop-api/shop/accounts_api.py:118–136`). Passwort mindestens 10 Zeichen (`:123`). Oberfläche `apps/web/app/registrieren/[[...sign-up]]/page.tsx` → `apps/web/components/shop/AuthForms.tsx` (Formular, Google-Schaltfläche, Fehlertexte). Weiterleitung nach Erfolg auf `/portal/kunde`, Admins auf `/intern/leitstand` (`AuthForms.tsx:25`). Root-`vercel.json:76` leitet `/api/auth/*` an den Dienst `shop`.
- **IST belegt (Widerspruch):** Die Suite-Policy verlangt `email_verification_required: true` (`config/selfservice-policy.json:20`). Der Code prüft keine E-Mail-Bestätigung; das Konto ist sofort angemeldet.
- **IST belegt (Inhalt):** Die Seite `/registrieren` beschreibt in `config/site-map.json` (Eintrag `signup`) einen einmaligen 24-Stunden-Test „nach bestätigter E-Mail und aktiviertem Arbeitsbereich". `config/site-map.json` führt zugleich `customer_portal_entry.functional_login: false`.
- **SOLL laut Inhaber:** „Normale Registrierung".
- **Lücke:** E-Mail-Bestätigung (Double-Opt-in für das Konto), Firmenangaben für B2B (Firma, USt-IdNr. – Felder existieren erst im Profil, `nexify_api.py:420–425`), Zustimmung zu AGB/AVV mit Versionsnachweis, Wiederaufnahme eines unterbrochenen Onboardings (Mastervorgabe §9.1). Google-Anmeldung hängt an fremden Hosts `auth.emergentagent.com` und `demobackend.emergentagent.com` (`accounts_api.py:24`, `AuthForms.tsx:16`) – für einen zahlenden Dienst ist diese Abhängigkeit zu klären.
- **Annahme:** „Normale Registrierung" meint E-Mail + Passwort mit Bestätigungslink; Google-Anmeldung optional.

### 1.2 Anmeldung und Sitzung

- **IST belegt:** Login, Logout, `/me`, Passwort vergessen/zurücksetzen (60 Minuten gültig, einmalig, alle Sitzungen werden beim Reset gelöscht), Sperre nach Fehlversuchen (`accounts_api.py:139–194`). Sitzungstoken wird nur als SHA-256-Wert gespeichert (`:36–37`, `:67–72`). Schreibzugriffe werden auf die eigene Herkunft begrenzt (`apps/shop-api/shop/main.py:56–65`). `apps/web/proxy.ts` sperrt private API-Pfade mit 401 und liefert private Seiten nur als datenlose Hülle mit `no-store`/`noindex`; ein Cookie allein gibt keinen Datenzugriff (`proxy.ts`, Kommentar und Zeilen 7–13 der Datei).
- **Lücke:** Keine Mehrfaktor-Anmeldung, keine Sitzungs-/Geräteübersicht, kein CSRF-Token (nur Herkunftsprüfung + SameSite), Fehlversuchssperre je E-Mail statt zusätzlich je Absender. Der Zielvertrag `docs/contracts/factory-api-auth.md` (Status „proposed_target_not_runtime") beschreibt mehr, ist aber nicht umgesetzt.
- **Produktionsvorbehalt:** siehe Abschnitt 0 (503 laut `AGENTS.md`).

### 1.3 Abo und Preismodell

- **IST belegt (Entwurf im Code):** `apps/shop-api/shop/nexify_api.py:28` enthält `PLANS` mit fünf Stufen und Beträgen (Test 0, Starter 49, Pro 149, Business 399, Enterprise individuell). Dieselben Beträge stehen im Systemprompt des Portal-Chats mit dem Zusatz „Tarifentwurf, noch NICHT freigegeben" (`nexify_api.py:37`). `GET /api/portal/subscription` liefert sie mit `"draft": true` (`:400–406`).
- **IST belegt (Gegenquellen):** `config/selfservice-policy.json:138–139`: `paid_suite_plan_id: null`, `paid_suite_price_status: "product_finance_decision_required_no_price_invented"`. `config/api-prepaid.json:92–101` nennt ein anderes Abo („one" 9,99 / „onePlus" 19,99) in einer Datei mit Status „Entwurf – Preise … legt nur Pascal fest". `apps/web/lib/chat-guidance.ts` führt laut `GO-LIVE.md:93` eine leere Liste freigegebener Preise. `PROGRESS.md` (Abschnitt 08.11.2026) führt „NeX2fly-Tarife" als offen.
- **IST belegt (Regel):** `AGENTS.md` „Nicht tun": „Keine Änderung an Preisen ohne Freigabe von Pascal Courbois"; `DECISIONS.md` D-002: Zahlen mit Preisbezug nur aus `config/fakten.json`/`config/api-prepaid.json`.
- **SOLL laut Inhaber:** „Abo-Preismodell".
- **Lücke:** Es gibt kein freigegebenes Preismodell. Drei Quellen widersprechen sich (Code-Entwurf, Prepaid-Entwurf, Policy „kein Preis"). Die Beträge in `nexify_api.py` verstoßen formal gegen D-002, weil sie nicht aus der Konfiguration kommen.
- **Annahme:** keine. Preise legt der Inhaber fest (Abschnitt 3.2).

### 1.4 Bezahlung

- **IST belegt:** Revolut-Baustein für den Shop: Bestellung mit Idempotenzschlüssel (`revolut.py`, `create_order`), Signaturprüfung HMAC-SHA256 mit 5 Minuten Toleranz (`verify_signature`), Webhook-Registrierung, Rücklesen des Bestellstatus (`checkout_api.py:211–241`, `:266`). `DECISIONS.md` D-008: `REVOLUT_MODE=live` im Preview, Tests mit Test-Signaturmaterial, „keine Fake-Zahlung". `GO-LIVE.md:149–150`: „Revolut-Zahlung: nur im separaten Prepaid-/API-Billing geplant … Zahlungs-Worker noch nicht gebaut."
- **IST belegt (Policy):** `config/api-prepaid.json` beschreibt Prepaid-Aufladung über Revolut (Gutschrift erst nach Rücklesen mit `state=completed`), Auto-Aufladung nur mit gespeicherter Zahlungsmethode und ausdrücklicher Zustimmung. `config/selfservice-policy.json` (`trial_topup`) beschreibt die Bindung eines Zahlungsbelegs an Konto, Mandant, Zweck, Betrag und Währung sowie Replay-Schutz.
- **SOLL laut Inhaber:** „Bezahlung" als Teil des Abo-Ablaufs.
- **Lücke:** Kein wiederkehrender Einzug, keine gespeicherte Zahlungsmethode, kein Mahn-/Wiederholungslauf, kein Kundenportal für Zahlungsdaten, keine Abo-Webhooks. `PUT /api/portal/subscription` speichert nur einen Wunsch (`status: "angefragt"`, `nexify_api.py:409–417`) – ohne Zahlung.
- **Feste Grenze:** Kein Anbieterkonto, kein Abo, kein Kauf ohne Inhaberentscheidung.

### 1.5 Freischaltung und Rollen

- **IST belegt:** Rollen `customer` und `admin` im Nutzerdatensatz (`accounts_api.py:41`, `auth.py` `require_admin`). Admin-Konten werden aus Umgebungsvariablen `ADMIN_EMAIL`/`ADMIN_PASSWORD` gesät (`accounts_api.py:54–64`). Teammitglieder können mit Rollen `mitarbeit|freigabe|lesen` eingetragen werden (`nexify_api.py:443–454`) – ohne Einladungsmail, ohne eigene Anmeldung, ohne Wirkung auf Rechte.
- **IST belegt (Domänenmodell):** `apps/selfservice/domain.py` (527 Zeilen) modelliert Registrierung, Arbeitsbereich, 24-Stunden-Test, BYOK-Bindung, Guthaben-Reservierung, Abrechnung und Umstellung auf einen bezahlten Tarif mit serverseitigen Nachweisen („Attestation"). Kopfkommentar Zeilen 1–11: „not an authentication, payment or LLM adapter". Speicher ist SQLite. Tests: `tests/test_suite_trial.py` (7), `tests/test_selfservice_domain.py` (16), `tests/test_selfservice_decisions.py` (2). `docs/contracts/suite-trial-local.md`: „Reale Adapter … bleiben offen."
- **IST belegt (Policy):** `apps/web/auth/policy.ts:65–70` – eine geprüfte Identität allein ergibt `membership_required`, keine Rechte.
- **SOLL laut Inhaber:** „Freischaltung" nach Bezahlung; danach „direkter Zugriff auf den Chat, die Composio Dev MCP-Anbindungen und sein Dashboard".
- **Lücke:** Es gibt keine Berechtigungstabelle („wer darf was bis wann"), die aus einem Zahlungsereignis entsteht. Das Domänenmodell ist an keine HTTP-Route angeschlossen. Der Weg „bezahlt → freigeschaltet" existiert nicht.

### 1.6 Kundenbereich und Dashboard

- **IST belegt (Oberfläche):** `apps/web/components/PortalWorkspace.tsx` mit Reitern Übersicht, Anfragen, Projekte, Angebote, Dokumente, Rechnungen, Support, Profil; Zustände für Laden, Fehler, „nicht angemeldet", „kein Zugriff". Eingebunden über `apps/web/app/[...slug]/page.tsx` für geschützte Pfade aus `config/site-map.json` (`/portal/kunde`, `/portal/api`, `/portal/affiliate`, `/intern/*`).
- **IST belegt (API):** `apps/shop-api/shop/nexify_api.py:182–476`: Übersicht, Anfragen, Angebote mit Kundenentscheidung, Projekte, Dokumente, Rechnungen, Tickets, API-Schlüssel (nur Hash gespeichert, Klartext einmalig bei Erzeugung, höchstens fünf aktive, `:331–357`), Agentenkonfiguration (`:379–392`), Abo-Wunsch, Profil, Team, Datenschutzanfrage (`:468–476`). Betreiberseite `:478–798`.
- **IST belegt (nicht verbunden):** Der Vercel-Einstieg `apps/shop-api/vercel_app.py:46–47` lädt `nexify_api` nicht (`MODULES` enthält es nicht; `PREFIXES` kennt weder `/api/portal` noch `/api/operator` noch `/api/oracle`). Root-`vercel.json:70–118` leitet diese Pfade auch nicht an den Dienst `shop`. In der Vercel-Auslieferung erreicht das Dashboard seine Daten daher nicht.
- **Lücke zum SOLL:** Im Dashboard fehlen: Abo-Status mit Zahlungsstand, Verbrauch, LLM-Einstellung (eigenes LLM oder NeXify), Composio-Verbindungen, Kunden-Chat. Reiter für Abo/API-Schlüssel/Agent sind in der API vorhanden, aber nicht im Menü von `PortalWorkspace.tsx` (Zeile 8 der Datei).

### 1.7 Chat für angemeldete Kunden

- **IST belegt (öffentlicher Chat, `apps/web`):** `POST /api/chat` mit echtem Modellaufruf über den 9router, Leitplanken, Rate-Limit je Absender, Ablage in Supabase (`apps/web/app/api/chat/route.ts`, `apps/web/lib/chat-llm.ts`, `chat-guidance.ts`, `chat-store.ts`; `GO-LIVE.md` Abschnitte 3–6). Besitznachweis der Unterhaltung über einen Sitzungs-Digest (`supabase/migrations/0002`, `0003`). Kein Bezug zu Konto oder Mandant. `GO-LIVE.md:146–148`: „Echter Router ungeprüft" für Gesprächsführung.
- **IST belegt (Portal-Chat, `apps/shop-api`):** `POST /api/oracle/chat` (`nexify_api.py:150–179`) mit Tageslimit je Sitzung, speichert `user_id` falls angemeldet. Nicht im Vercel-Adapter geladen (siehe 1.6).
- **IST belegt (Befunde im Portal-Chat-Code):**
  - `GET /api/oracle/history/{session_id}` gibt den Verlauf ohne Besitz- oder Anmeldeprüfung heraus (`nexify_api.py:122–125`). Wer die Sitzungskennung kennt, liest mit. Vor einer Aktivierung zu schließen.
  - Der Aufruf sendet die Policy-Kennung `deepseek/deepseek-v4.1-flash-1017` an den Router (`:97`, `:130`). Laut `apps/web/lib/chat-llm.ts:20–23` lehnt der 9router genau diese Kennung mit HTTP 400 ab (gemessen 13.11.2026) und führt das Modell als `openrouter/deepseek-v4.1-flash`. *Annahme (abgeleitet, nicht gemessen):* Der Portal-Chat würde gegen denselben Router scheitern.
  - Zwei Namensfamilien für dieselbe Verbindung: `ROUTER_URL`/`ROUTER_KEY` (apps/web) und `NINEROUTER_BASE_URL`/`NINEROUTER_API_KEY` (shop-api, `:104`).
- **SOLL laut Inhaber:** Nach dem Login direkter Zugriff auf den Chat.
- **Lücke:** Kein Chat, der an Konto, Mandant, Berechtigung, LLM-Wahl und Verbrauchszählung gebunden ist. Der Agentenbaukasten aus Mastervorgabe §9.3 (Werkzeuge, Budget, Langläufe) ist nicht umgesetzt; `PUT /api/portal/agent` speichert nur eine Konfiguration mit Status „konfiguriert – Aktivierung nach Freigabe" (`:386–392`).

### 1.8 Composio-MCP-Anbindung

- **IST belegt:** siehe Abschnitt 0. Zusätzlich: `config/mcp-server.json` beschreibt einen *eigenen* MCP-Server `https://mcp.nexifyai.cloud` (zustandslos, OAuth 2.1) mit internen Werkzeugen – als Zielkonfiguration, Stand 27.09.2026. `config/integrations/clerk-mcp.json`: Die Composio-Ressource nennt Composio selbst als Autorisierungsserver, nicht `clerk.nexifyai.de`; „resource_host_control_verified: false".
- **IST belegt (Regel):** Der Regelwerk-Prüffall RW18 sperrt „Personenbezug an Drittland ohne AVV/SCC" am Beispiel Composio (`prototypen/lib/regelwerk.js:158`).
- **SOLL laut Inhaber:** Kunde erhält nach Login Zugriff auf „die Composio Dev MCP-Anbindungen".
- **Lücke:** Kein Composio-Konto-/Projektbezug im Repository, kein Verbindungsfluss je Mandant, keine Werkzeug-Freigabeliste, kein Protokoll der Werkzeugaufrufe, keine Datenschutzgrundlage (AVV/SCC „false"). Die Clerk-Aussteller-Idee ist mit der Clerk-Entfernung (D-007) gegenstandslos.
- **Hinweis:** In dieser Analyse-Sitzung ist ein Composio-MCP-Werkzeugsatz angebunden. Das ist die Arbeitsumgebung des Agenten und kein Beleg für eine Kundenanbindung im Produkt. Nicht benutzt.

### 1.9 Eigenes LLM anbinden (BYO)

- **IST belegt (Policy):** `config/selfservice-policy.json:46–58`: Abrechnung beim eigenen Anbieterkonto des Kunden; Speicherung als „server_side_encrypted_vault_reference"; kein Klartext im Browser, in Protokollen, URLs oder Antworten; serverseitige Prüfung von Anbieter, Mandant und erlaubtem Modell; kein Rückfall auf NeXify-Guthaben bei fehlendem oder erschöpftem Schlüssel. `config/llm-policy.json` (`customer_byok`): getrennte ausdrückliche Wahl, kein stiller Rückfall auf firmenbezahlte Kontingente.
- **IST belegt (Recherche):** `config/research/byok-adapters.json` / `docs/research/byok-adapters.md` (26.10.2026): Status „read_only_reuse_research_not_installed_or_connected", `suite_provider_implementations: 0`, kein Schlüssel live geprüft.
- **IST belegt (Domäne):** `apps/selfservice/domain.py:73–82` nimmt nur undurchsichtige Tresor-Verweise `vaultref:<32 hex>` an; `bind_byok` (`:274`), `revoke_byok` (`:495`). Kein Tresor-Adapter.
- **IST belegt (Tresor):** Konfigurationen verweisen auf OpenBao (`config/api-prepaid.json` `schluessel: "openbao:…"`, `config/langfuse.json`). Im Anwendungscode gibt es keine Verschlüsselungs- oder Tresoranbindung (Suche nach encrypt/kms/vault/aes in `apps/shop-api/shop`, `apps/web/lib`, `apps/web/app`: kein Treffer).
- **SOLL laut Inhaber:** „Der Kunde bindet entweder sein eigenes LLM an, oder er nutzt unsere NeXify AI Intelligenz."
- **Lücke:** Tresor, Schlüsselprüfung, Anbieter-Adapter, Oberfläche, Widerruf, Protokoll-Schwärzung – alles offen.

### 1.10 „NeXify AI Intelligenz" (Kette, Router)

- **IST belegt:** Ein Modell, ein Router. `config/llm-policy.json`: exakt `deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`, kein stiller Ersatz, keine automatische Hochstufung. `config/llm-verbindungen.json`: drei „Stufen" (Triage, Verarbeitung, Prüfung), alle mit demselben Modell, alle `aktiv: false`; `runtime_status: "not_verified_connected"`. Ausnahme nur für Produkttexte: `ds/deepseek-v4-pro` (`DECISIONS.md` D-009).
- **IST belegt (Abweichung auf der Leitung):** Der Router bietet den datierten Stand `-1017` nicht an; gesendet wird `openrouter/deepseek-v4.1-flash`, „vom Inhaber am 13.11.2026 geprüft und freigegeben" (`apps/web/lib/chat-llm.ts:20–23`). Die Projektregel „exakt … 1017" ist damit auf der Leitung nicht wörtlich erfüllt.
- **IST belegt (Zielroute, nicht aktiv):** `config/llm-policy.json` `provider_route_target_2026_11_10`: nur über 9router, Reihenfolge OpenRouter → DeepSeek-API, „target_not_activated".
- **IST belegt (weitere Bausteine):** `packages/agent-runtime/managed-live-chat.ts` – vorbereitete, standardmäßig geschlossene Montage. `config/langfuse.json` – Beobachtung als Zielkonfiguration, „Versionen UNVERIFIED".
- **SOLL laut Inhaber:** „meisterhaft feinabgestimmte, extrem kosteneffiziente KI-Kette (basierend auf DeepSeek-LLMs, Jeff AI und stützenden Modellen)".
- **Lücke:**
  1. Eine Kette aus mehreren Modellen existiert nicht. Vorhanden ist ein einzelner Modellaufruf mit Leitplanken.
  2. „Jeff AI" ist kein Chat-Modell und nicht Teil eines Kundenpfads (Abschnitt 0). Ob der Inhaber mit „Jeff AI" das Orakel `jev-1.13`, die offene Komponente „JavAI" oder etwas Drittes meint, ist ungeklärt.
  3. „Stützende Modelle" widersprechen der geltenden Regel „keine andere Modellfamilie" (`AGENTS.md:357 ff.`, `CLAUDE.md`). Eine Kette mit weiteren Modellen braucht eine ausdrückliche Erweiterung der Policy durch den Inhaber je Anwendungsfall – so wie bei D-009 geschehen.
  4. „Feinabgestimmt": Kein Fine-Tuning im Repository. `docs/09-final/08-recht-und-compliance.md:32` (L2): „‚trainiert' erst nach Live-Gang der Feinabstimmung; bis dahin ‚eingerichtet auf'".

### 1.11 Mandantentrennung (Datenmodell, RLS)

- **IST belegt – drei Modelle nebeneinander:**
  1. *MongoDB-Portal* (`nexify_api.py:1–6`): „every portal document carries tenant_id == user_id". Trennung nur durch Filter im Anwendungscode (`mine()`, `:183–184`). Kein Organisationsbegriff: ein Mandant = ein Nutzerkonto. Kein Datenbankschutz gegen einen vergessenen Filter. Betreiber-Endpunkte lesen mandantenübergreifend (z. B. `:694–697`).
  2. *PostgreSQL-Fundament* (`db/foundation/001_foundation.sql:43–135`): `tenant`, `actor`, `membership`, `project` mit `FORCE ROW LEVEL SECURITY`, `USING` + `WITH CHECK`, Sitzungswert `app.mandant_id`. Prüfskripte `db/foundation/test.sh`, `verify.sql`; GitHub-Workflow `ci.yml` (Job „postgres-isolation" laut Betriebsbefund). Nur vier Tabellen, an keine Anwendung angeschlossen. Zielbild `config/mandanten.json` und `docs/adr/0008-mandantentrennung-gemeinsames-schema.md` (Stand 28.09.2026).
  3. *Supabase-Chat* (`apps/web/supabase/migrations/0001:131–141`): RLS eingeschaltet ohne Richtlinien (alles gesperrt), Zugriff nur über Service-Role vom Server. Trennung je Besuchersitzung, nicht je Mandant.
- **SOLL laut Inhaber:** strikte Mandantentrennung (DSGVO).
- **Lücke:** Für die Suite gibt es in keinem der drei Modelle ein durchgängiges Mandantenmodell mit Organisation, Mitgliedschaft und datenbankseitiger Durchsetzung. `config/acceptance-coverage.json` führt MASTER-04 („Rollen/Tenants … nicht durchgängig abgenommen") und MASTER-12 („Reale Identity/Vault/Payment/Modell/Usage … nicht abgenommen") als offen.

### 1.12 Rechnungen und Belege

- **IST belegt:** Betreiber legt Rechnungen manuell an (`nexify_api.py:700–723`, Nummernkreis `NEXIFY-<Jahr>-<5-stellig>`, USt-Satz als Eingabe mit Vorgabe 19); Status „paid" wird manuell gesetzt (`:729–736`). Kunde lädt die Rechnung als HTML-Datei (`:266–285`). Anbieterangaben stehen fest im Code (`:269`). Im öffentlichen Bestellfluss: `apps/web/lib/invoice.ts`, `tools/rechnung.mjs` mit minimalem UBL-Gerüst „ohne `cac:TaxTotal`" (`GO-LIVE.md:134–136`).
- **IST belegt (Policy):** `config/api-prepaid.json` `rechnung`/`steuer`: Nummernkreis `NX-API-…`, Archiv 10 Jahre GoBD / 7 Jahre NL, „NL 21 %, EU-B2B mit gültiger USt-IdNr. Reverse Charge"; E4 „Steuerberatung bestätigt" in der Datei, in `docs/09-final/08-recht-und-compliance.md:25` aber weiter als offen geführt.
- **Lücke:** Keine automatische Abo-Rechnung je Abrechnungszeitraum, keine USt-IdNr.-Prüfung, kein Reverse-Charge-Vermerk, kein unveränderliches Archiv (L10 „GoBD-Archiv-Werkzeug" offen), keine Gutschrift/Storno-Logik, HTML statt PDF/E-Rechnung. Mastervorgabe §9.3: „keine HTML-Datei als angeblich echtes PDF".
- **Widerspruch zur Rechtsform:** Repository-Quellen nennen „Eenmanszaak" mit KvK 90483944 (`config/fakten.json`, `docs/09-final/08…:15`). Der Betriebsbefund vom 13.11.2026 zitiert ein ausgeliefertes Impressum mit Angaben „der B.V. … noch zu bestätigen" (`docs/04-betrieb/befund-2026-11-13.md` Abschnitt 4). Vor jeder Rechnung zu klären.

### 1.13 Kündigung

- **IST belegt:** `PUT /api/portal/subscription` mit `action: "cancel"` setzt `status: "kuendigung_angefragt"` und schreibt einen Audit-Eintrag (`nexify_api.py:409–417`). Keine Frist, keine Bestätigung, keine Wirkung.
- **IST belegt (Vorgabe):** Mastervorgabe §9.2: keine automatische Abbuchung aus dem Ende des Tests; abgelaufener Zugang führt zu ehrlichem Zustand mit Exportweg, keine Löschdrohung. `config/selfservice-policy.json` (`conversion`): Daten, Einstellungen, Schlüsselverweise bleiben erhalten.
- **Lücke:** Kündigungsweg mit Wirkungstermin, Bestätigungsmail, Zugang bis Laufzeitende, Datenexport, Sperre statt Löschung („nichts löschen" ist Inhabergrenze), Rücklauf zum Zahlungsanbieter.

### 1.14 Support

- **IST belegt:** Tickets anlegen und beantworten, Mail an `MAIL_INTERNAL_TO` mit Antwortadresse des Kunden (`nexify_api.py:298–325`), Betreiberantwort (`:770–782`), Audit. Öffentlicher Kontaktweg `apps/web/components/ContactRequestForm.tsx` → `/api/requests` (`apps/shop-api/shop/requests_api.py`, idempotent, 5 je Stunde).
- **Lücke:** Hängt am nicht verbundenen Portal (1.6). Keine Reaktionszeiten, keine Statusseite, kein Störungsweg für Zahlungsprobleme. Zusagen zu Reaktionszeiten wären rechtsbindend und sind Inhaberentscheidung.

### 1.15 Übergreifend: Auslieferung

- **IST belegt:** Führungsentscheidung 13.11.2026: Auslieferung ausschließlich über Vercel, Projekt baut `apps/web` und `apps/shop-api` (`AGENTS.md:5–14`). Offen laut `AGENTS.md:16–20`: Domains zeigen nicht auf das Projekt, Shop-API 503, Indexierung aus, Impressum ohne bestätigte Anbieterangaben. `docs/04-betrieb/befund-2026-11-13.md`: drei getrennte Auftritte, GitHub Actions starten nicht, `main` hat fehlschlagende Tests.
- **Folge:** Ein zahlender Dienst braucht zuerst eine eindeutige Produktionsadresse, eine laufende Konten-API und eine arbeitende Prüfkette.

---

## 2. Zielarchitektur (Vorschlag)

Alles in diesem Abschnitt ist **Vorschlag/Annahme**, abgeleitet aus den Vorgaben im Repository (`config/selfservice-policy.json`, `config/mandanten.json`, `config/llm-policy.json`, Mastervorgabe §9) und den Inhabergrenzen. Anbieter sind bewusst als Platzhalter geführt.

### 2.1 Komponenten und Datenflüsse

```
 Browser (Kunde)                                         Betreiber (Pascal)
      |                                                         |
      v                                                         v
+---------------------------- apps/web (Next.js, Vercel fra1) ----------------------------+
|  Öffentlich: Seiten, Preise*, Rechtstexte*      Geschützt: /portal/* , /intern/*        |
|  /registrieren  /anmelden                       Dashboard · Chat · Verbindungen ·       |
|                                                 LLM-Einstellung · Abo · Rechnungen      |
+----------------+-----------------------------------------+------------------------------+
                 | Cookie-Sitzung (httpOnly)               | nur eigene Herkunft
                 v                                         v
+------------------------------- Suite-API (ein Dienst) ----------------------------------+
|  [Konten]  Registrierung, E-Mail-Bestätigung, Login, Reset, Sitzungen                   |
|  [Mandant] Organisation, Mitgliedschaft, Rolle  -> setzt app.mandant_id je Transaktion  |
|  [Berechtigung] entitlement(mandant, tarif, status, gültig_bis)  <- einzige Quelle      |
|                 für "darf Chat / Werkzeuge / Dashboard nutzen"                          |
|  [Abrechnung]  Checkout anlegen · Webhook-Eingang · Ereignisjournal · Abgleichlauf      |
|  [Chat]        Unterhaltungen, Nachrichten, Verbrauch je Mandant                        |
|  [LLM-Router]  Wahl je Mandant:  (a) NeXify AI Intelligenz   (b) eigenes LLM            |
|  [Werkzeuge]   MCP-Vermittler: erlaubte Werkzeuge je Mandant, Freigabe, Protokoll       |
|  [Audit]       wer, was, wann, Mandant – ohne Inhalte und ohne Geheimnisse              |
+----+-------------+---------------+----------------+----------------+--------------------+
     |             |               |                |                |
     v             v               v                v                v
 PostgreSQL     Tresor         Zahlungs-        NeXify-Router    Kunden-LLM-Anbieter
 (EU, RLS       (Schlüssel     anbieter*        (9router ->      (Adresse + Schlüssel
  FORCE)        der Kunden,    Checkout,         Policy-Modell)   des Kunden)
                Webhook-       Abo, Belege)                        
                Geheimnisse)        |                             MCP-Anbieter* (Composio)
                                    +--> signierter Webhook --->  je Mandant eigene
                                         an Suite-API             Verbindung/Kennung

 Mail (Resend) · Fehler (Sentry) · Protokolle (Vercel) · Verbrauch/Traces (Langfuse*, optional)
 * = Entscheidung des Inhabers offen
```

Begründung für „ein Dienst": Heute liegen Konten in MongoDB (`apps/shop-api`), Chat-Ablage in Supabase/PostgreSQL (`apps/web`), das Mandantenfundament in PostgreSQL (`db/foundation`) und das Berechtigungsmodell in SQLite (`apps/selfservice`). Für die Suite sollte es eine führende Datenhaltung mit datenbankseitiger Trennung geben. `config/mandanten.json` und ADR-0008 legen PostgreSQL mit RLS bereits fest. Ob die bestehenden Konten aus MongoDB übernommen oder dort belassen und nur referenziert werden, ist eine technische Entscheidung mit Migrationsfolgen (Paket P2).

### 2.2 Mandantengrenzen

| Ebene | Regel |
|---|---|
| Datenmodell | Jede Suite-Tabelle trägt `mandant_id`; `ENABLE` + `FORCE ROW LEVEL SECURITY`, `USING` und `WITH CHECK` (Muster aus `db/foundation/001_foundation.sql:104–135`). |
| Anfrage | Server leitet den Mandanten aus Sitzung + Mitgliedschaft ab, nie aus einem Feld der Anfrage; `set_config('app.mandant_id', …, true)` je Transaktion (`config/mandanten.json` „gateway"). |
| Rollen der Datenbank | Anwendung ohne Umgehungsrecht; Migration getrennt; Auswertung über alle Mandanten mit eigener Anmeldung (`config/mandanten.json` „rollen"). |
| Hintergrundläufe | Mandant steht in jeder Auftragsnutzlast; ohne Mandant wird abgewiesen. |
| Dateien, Cache, Suche, Export, Telemetrie | tragen dieselbe Bindung (`docs/contracts/factory-api-auth.md` §2). |
| Betreiberzugriff | nur über eigene Betreiber-Endpunkte, mit Grund und Audit-Eintrag. |
| Nachweis | Testdaten mit mindestens drei Mandanten; Prüffall „A liest B nicht, A schreibt nicht in B" in der Prüfkette (`config/mandanten.json` „tests"). |
| Löschen | Sperren und Kennzeichnen statt Löschen; Buchungsbelege bleiben gesperrt erhalten. Endgültiges Löschen nur auf ausdrückliche Inhaberanweisung. |

### 2.3 Wo Schlüssel liegen

| Geheimnis | Ablage | Regeln |
|---|---|---|
| BYO-LLM-Schlüssel des Kunden | Tresor; in der Datenbank nur ein undurchsichtiger Verweis (`vaultref:…`, wie `apps/selfservice/domain.py:73–77`), dazu Anbieter, erlaubte Modelle, letzte vier Zeichen zur Wiedererkennung, Prüfzeitpunkt. | Eingabe nur über HTTPS-POST in ein Feld ohne Autovervollständigung; Schlüssel wird einmal entgegengenommen und nie wieder ausgegeben. Verschlüsselung mit Schlüssel je Mandant (Umschlagverfahren), Hauptschlüssel außerhalb der Datenbank. Entschlüsselung nur im Speicher des Aufrufs. Kein Schlüssel in Protokoll, Fehlertext, URL, Antwort, Trace, Sicherung im Klartext. Protokollfilter schwärzt bekannte Schlüsselmuster zusätzlich. Widerruf sofort wirksam; Drehung = neuer Verweis. Bei ungültigem oder erschöpftem Schlüssel Fehler an den Kunden, kein Rückfall auf NeXify-Kontingent (`config/selfservice-policy.json:57`). |
| NeXify-Router-Schlüssel | Umgebungsvariable des Dienstes (`ROUTER_URL`, `ROUTER_KEY`), nur Server. | Ausgabenlimit am Schlüssel selbst (`GO-LIVE.md:142–145`). Eine Namensfamilie statt zwei. |
| Zahlungsanbieter: API-Schlüssel, Webhook-Geheimnis | Umgebungsvariable bzw. Tresor. | Test- und Live-Schlüssel getrennt; Wechsel nur durch Inhaber. |
| MCP-/Composio-Zugang | Plattformschlüssel beim Dienst; Verbindungen der Kunden liegen beim MCP-Anbieter und werden über eine Kennung je Mandant adressiert. | Mandant A darf nie die Kennung von Mandant B verwenden; Zuordnung serverseitig. |
| Sitzungstoken, API-Schlüssel der Kunden | nur als Hash (heute schon so: `accounts_api.py:36`, `nexify_api.py:342`). | unverändert. |

Tresor-Wahl ist offen: Im Repository ist OpenBao genannt, aber nicht angebunden. Auf Vercel wäre ein gehosteter Schlüsseldienst oder ein eigener Tresor mit Netzzugang nötig. **Annahme**, zu entscheiden in P5.

### 2.4 Rollen

| Rolle | Darf |
|---|---|
| Inhaber des Mandanten | Abo abschließen/kündigen, Zahlungsdaten, Mitglieder einladen, LLM-Wahl, Schlüssel hinterlegen/widerrufen, Verbindungen anlegen, Export |
| Mitglied | Chat, freigegebene Werkzeuge, eigene Unterhaltungen |
| Abrechnung (optional) | Rechnungen sehen, Zahlungsdaten ändern |
| Nur lesen (optional) | Dashboard ansehen |
| Betreiber/Support (NeXify) | Mandantenliste, Abo-Status, Tickets; Inhalte nur mit Grund und Audit |
| Dienstkonto | Webhook-Verarbeitung, Abgleichlauf; kein Menschenzugang |

Rollen sind additiv je Mandant, keine globale Stufenleiter (`docs/contracts/factory-api-auth.md` §2). Ein neues Konto erhält nie automatisch Betreiberrechte (`config/selfservice-policy.json:14–19`).

### 2.5 Abrechnungsereignisse → Freischaltung

```
Kunde wählt Tarif -> Suite-API legt Checkout beim Anbieter an
                     (Idempotenzschlüssel = mandant + tarif + Versuch)
Anbieter           -> Webhook an /api/billing/webhook
  1. Signatur + Zeitfenster prüfen (Muster: revolut.py verify_signature)
  2. Ereignis-ID in billing_event eintragen (eindeutig) -> schon vorhanden? dann 200, fertig
  3. Zustand beim Anbieter rücklesen (nicht dem Ereignisinhalt allein vertrauen)
  4. In EINER Transaktion: subscription fortschreiben + entitlement setzen + Audit
  5. Mail "Zugang aktiv" in die Ausgangswarteschlange
Abgleichlauf (zeitgesteuert): alle Abos mit Anbieter vergleichen, Abweichungen melden
```

| Ereignis (fachlich) | Wirkung auf `entitlement` |
|---|---|
| Erstzahlung bestätigt | aktiv, gültig bis Periodenende |
| Verlängerung bezahlt | gültig bis neues Periodenende |
| Zahlung fehlgeschlagen | Kulanzfrist* beginnt, Hinweis im Dashboard und per Mail |
| Kulanzfrist abgelaufen | gesperrt für neue Arbeit; Lesen, Export und Rechnungen bleiben |
| Kündigung eingegangen | aktiv bis Laufzeitende, danach gesperrt |
| Erstattung/Rückbuchung | gesperrt, Fall an Betreiber |
| Tarifwechsel | neues Recht ab Wirksamkeit* |

\* Dauer und Regeln legt der Inhaber fest (Abschnitt 3.2).

Grundsätze, alle aus bestehenden Vorgaben: Eine Markierung vom Browser („bezahlt") ist kein Beleg (`config/selfservice-policy.json` `client_paid_flag_is_proof: false`). Gutschrift bzw. Freischaltung erst nach Rücklesen (`config/api-prepaid.json` „regel"). Idempotenz auf allen Buchungen (`AGENTS.md` „Sicherheit"). Bei unklarem Ausgang erst abgleichen, nicht blind wiederholen (`config/llm-verbindungen.json` „wiederholung").

### 2.6 Fehler- und Wiederholungswege

| Störung | Verhalten |
|---|---|
| Webhook kommt doppelt oder in falscher Reihenfolge | Ereignis-ID eindeutig; Zustand wird rückgelesen, nicht aus der Reihenfolge abgeleitet |
| Webhook kommt gar nicht | Abgleichlauf findet die Abweichung; Kunde sieht „Zahlung wird geprüft", nicht „fehlgeschlagen" |
| Eigener Dienst antwortet dem Anbieter mit Fehler | Anbieter wiederholt; Verarbeitung ist idempotent |
| Zahlung ok, Freischaltung schlägt fehl | gleiche Transaktion → kein halber Zustand; Ereignis bleibt „unverarbeitet" und wird erneut versucht; Alarm |
| NeXify-Router nicht erreichbar | Fehler an den Kunden mit festem Code, Ursache nur im Protokoll (Muster `GO-LIVE.md` „Störungsdiagnose"); kein Ersatzmodell |
| Kunden-LLM lehnt ab (401/429) | klare Meldung „Ihr Anbieter meldet …"; kein Rückfall auf NeXify |
| MCP-Werkzeug läuft in Zeitüberschreitung | Ergebnis „unbekannt"; schreibende Aktion nicht automatisch wiederholen |
| Mailversand scheitert | Ausgangswarteschlange mit Wiederholung (vorhanden: `apps/shop-api/shop/mailer.py`, `admin_api.py:142–165`) |

### 2.7 Monitoring

- Technisch: Fehler (Sentry ist eingebunden: `apps/web/package.json`, `packages/observability/sentry-server.ts`), Antwortzeiten, 5xx-Quote je Route.
- Fachlich: Registrierungen, bestätigte E-Mails, begonnene/abgeschlossene Checkouts, unverarbeitete Abrechnungsereignisse (Ziel: 0), Abweichungen im Abgleichlauf, aktive/gesperrte Mandanten.
- KI: Aufrufe, Tokens, Kosten je Mandant und Tag aus dem tatsächlichen Verbrauch („aus dem Rechenkern-Journal, nie geschätzt", `config/kennzahlen.json`), Fehlerursachen des Routers, ausgelöste Leitplanken (nur Kennwörter, kein Inhalt).
- Sicherheit: fehlgeschlagene Anmeldungen, Zugriffe über Mandantengrenzen (müssen 0 sein), Tresorzugriffe.
- Alarmwege und Empfänger legt der Inhaber fest. Protokolle enthalten keine Nachrichteninhalte, keine Schlüssel, keine Zahlungsdaten.

---

## 3. Entscheidungsvorlagen (keine Entscheidung getroffen)

### 3.1 Zahlungsanbieter

Die folgende Übersicht ist **Annahme/allgemeines Fachwissen** und nicht im Repository belegt (Ausnahme: Zeile Revolut). Gebühren sind bewusst nur qualitativ beschrieben. Vor einer Entscheidung sind die aktuellen Preis- und Vertragsseiten der Anbieter zu lesen und mit Datum abzulegen.

| Option | Eignung EU/NL/DE | SEPA-Lastschrift | Abo-Funktionen | Steuer/Rechnung | Gebührenstruktur (qualitativ) | Aufwand | Anmerkung |
|---|---|---|---|---|---|---|---|
| **Revolut Merchant** (bereits im Code) | Konto vorhanden laut D-008; EU-Anbieter (`config/fakten.json`: „Revolut Bank UAB") | zu prüfen | Wiederkehrende Abbuchung nur über gespeicherte Zahlungsmethode, Abo-Logik selbst zu bauen (`config/api-prepaid.json` „autoAufladung") | selbst zu bauen | je Transaktion | hoch (Abo-Logik, Mahnwesen, Rechnungen selbst) | geringster Anbieterwechsel; größter Eigenbau |
| **Mollie** | Sitz NL, in NL/DE/BE verbreitet | ja | Abo-Schnittstelle vorhanden, Mahnlogik teils selbst | Rechnungen selbst | je Transaktion, je Zahlart verschieden, keine Grundgebühr (zu prüfen) | mittel | iDEAL und SEPA aus einer Hand |
| **Stripe (Billing)** | EU-Niederlassung, breit dokumentiert | ja | Abo, Testphase, Tarifwechsel, Mahnlauf, Kundenportal | Steuerberechnung und Rechnungen als Zusatzmodule | je Transaktion plus Zuschläge für Zusatzmodule (zu prüfen) | niedrig bis mittel | meiste Fertigbausteine; US-Konzern → Datenschutzprüfung |
| **Paddle / Lemon Squeezy** (Wiederverkäufer-Modell) | verkauft im eigenen Namen an den Kunden | je Anbieter zu prüfen | Abo inklusive | Anbieter führt die Umsatzsteuer ab und stellt die Rechnung | höherer Anteil je Transaktion (zu prüfen) | niedrig | NeXify ist dann nicht Rechnungssteller gegenüber dem Kunden; passt das zum B2B-Auftritt und zu AGB/AVV? |
| **GoCardless** | Spezialist für Lastschrift | ja (Schwerpunkt) | wiederkehrende Einzüge | selbst | je Transaktion (zu prüfen) | mittel | keine Karten |
| **Rechnung/Überweisung manuell** (heute möglich) | – | – | manuell | manuelle Rechnung vorhanden (`nexify_api.py:700`) | keine Anbietergebühr | sehr niedrig | kein Selbstbedienungs-Abo; als Startlösung für wenige Kunden denkbar |

Was der Inhaber festlegen muss: Anbieter; Zahlarten (Karte, SEPA-Lastschrift, iDEAL); ob NeXify selbst Rechnungssteller bleibt; wer das Anbieterkonto eröffnet und die Identitätsprüfung macht; Test- und Live-Betrieb getrennt (D-008 hat im Shop „live im Preview" festgelegt – für Abos erneut zu entscheiden).

### 3.2 Abo-Modell – vom Inhaber festzulegen

1. **Stufen:** Anzahl, Namen, Inhalt je Stufe (Chat-Umfang, Anzahl Verbindungen, Mitglieder, Support). Drei widersprüchliche Entwürfe im Repository (Abschnitt 1.3) – welcher gilt, oder ein neuer?
2. **Preise:** netto je Monat/Jahr, Währung, Preisänderungsklausel. Bis zur Freigabe zeigt die Oberfläche keine Beträge.
3. **Verhältnis Abo ↔ KI-Verbrauch:** Ist NeXify AI Intelligenz im Abo enthalten (mit Kontingent), oder wird Verbrauch getrennt als Prepaid abgerechnet (`config/api-prepaid.json`, Aufschlag E1)? Bei BYO: gleicher Abo-Preis oder eigener Tarif?
4. **Testphase:** Bestehende Vorgabe: einmalig 24 Stunden, kein kostenloses Modellguthaben, optional 5 € Testguthaben (`config/selfservice-policy.json`). Bleibt das, oder ersetzt das neue Abo-Modell diese Regel?
5. **Laufzeit und Verlängerung:** monatlich/jährlich, automatische Verlängerung, Abrechnungsstichtag.
6. **Kündigung:** Frist, Wirkungstermin, Weg (im Dashboard), Zugang bis Laufzeitende, Datenexport, Aufbewahrung nach Ende.
7. **Zahlungsausfall:** Kulanzfrist, Zahl der Einzugsversuche, Sperrregel.
8. **Erstattung:** ja/nein, anteilig, Regel.
9. **Kundenkreis:** ausschließlich Unternehmen? Wenn ja: wie wird das bei der Registrierung abgefragt und belegt? Wenn Verbraucher zugelassen werden, greifen Widerruf, Button-Lösung und Kündigungsbutton.
10. **Steuer:** Verkäufer sitzt in NL. Laut `config/api-prepaid.json` „NL 21 %, EU-B2B mit gültiger USt-IdNr. Reverse Charge" – Prüfung der USt-IdNr. (VIES) nötig; Behandlung von Kunden ohne USt-IdNr., aus Drittländern und von öffentlichen Einrichtungen (E4) durch Steuerberatung zu bestätigen. Rechtsform (Eenmanszaak oder B.V.) vorher klären.
11. **Rechnung:** Rechnungssteller, Nummernkreis, Format (PDF, E-Rechnung für DE-B2B), Archiv.

### 3.3 Composio – zu klären

| Thema | Frage |
|---|---|
| Konto | Auf wen läuft das Composio-Konto? Welcher Tarif ist aktiv? Gibt es ein Konto für das Produkt getrennt von der internen Nutzung? (Im Repository nicht belegt.) |
| Kosten | Abrechnung je Aufruf, je Verbindung oder pauschal? Wer trägt sie – im Abo enthalten oder nach Verbrauch? Obergrenze je Mandant? (Keine Zahl im Repository.) |
| Weitergabe | Erlauben die Nutzungsbedingungen, die Anbindungen eigenen zahlenden Kunden bereitzustellen (Weiterverkauf/Einbettung)? Was bedeutet „Dev" im Auftragstext – ein Entwicklertarif? Ist der für Kundenbetrieb zugelassen? |
| Mandantentrennung | Wie werden Verbindungen je Kunde getrennt (eigene Kennung je Mandant)? Wer kann sie widerrufen? |
| Datenschutz | `config/regelwerk.json:155–159`: Drittland ja, AVV/SCC nein, „Entscheidung E-B offen". Vor Kundenbetrieb nötig: AVV mit Composio, Standardvertragsklauseln oder Angemessenheitsgrundlage, Liste der Unterauftragsverarbeiter, Speicherort, Löschfristen. Composio wird Unterauftragsverarbeiter von NeXify und muss in der eigenen AVV stehen. |
| Zugriffsumfang | Welche Werkzeuge sind für Kunden freigegeben? Schreibende Aktionen (Mail senden, Kalender ändern) nur nach Bestätigung des Nutzers? |
| Ausfall | Was sieht der Kunde, wenn Composio nicht erreichbar ist? |
| Alternative | Eigener MCP-Server ist als Ziel beschrieben (`config/mcp-server.json`); Composio für Kunden, eigener Server intern, oder beides? |

### 3.4 Eigenes LLM oder NeXify-Kette – Gegenüberstellung

| Punkt | Eigenes LLM des Kunden (BYO) | NeXify AI Intelligenz |
|---|---|---|
| Vertrag mit dem Modellanbieter | Kunde | NeXify (über Router/OpenRouter/DeepSeek) |
| Kosten der Modellnutzung | Kunde direkt beim Anbieter | NeXify; Weitergabe laut Preismodell |
| Datenfluss | Kunde → NeXify-Dienst → Anbieter des Kunden | Kunde → NeXify-Dienst → 9router → OpenRouter → Modellanbieter |
| Rolle NeXify (DSGVO) – *Annahme, rechtlich zu prüfen* | Auftragsverarbeiter für die Plattform; der Modellanbieter ist vom Kunden gewählt. Ob er trotzdem als Unterauftragsverarbeiter zu führen ist, hängt von der Vertragsgestaltung ab. | Auftragsverarbeiter; Router, OpenRouter und Modellanbieter sind Unterauftragsverarbeiter und gehören in die AVV-Liste. |
| Drittland | abhängig von der Wahl des Kunden | DeepSeek ist ein chinesischer Anbieter; über OpenRouter können je Route unterschiedliche Rechenzentren bedient werden. `config/llm-verbindungen.json`: „provider_processing_region: route_specific_not_inferred_from_router_location". Vor Kundenbetrieb: tatsächliche Route, Speicherort, Aufbewahrung beim Anbieter und Rechtsgrundlage für die Übermittlung belegen. |
| Haftung für Antwortqualität | Modell liegt beim Kunden; NeXify haftet für Plattform und Leitplanken | NeXify verantwortet die gesamte Kette |
| Verfügbarkeit | abhängig vom Anbieter des Kunden | abhängig von Router und Anbieter; kein Ersatzmodell laut Policy |
| Schlüsselrisiko | NeXify verwahrt fremde Schlüssel → Tresor, Haftungsklausel, Meldeweg bei Vorfall | nur eigene Schlüssel |
| Technischer Aufwand | Tresor, Adapter je Anbieter, Prüfung, Fehlerbilder | Verbrauchszählung, Kostendeckel, Routennachweis |
| Offene Inhaberfragen | Welche Anbieter zuerst? (Ziel „70+" ist laut `config/selfservice-policy.json` ein Wunschwert, 0 umgesetzt.) Darf der Kunde eine beliebige OpenAI-kompatible Adresse eintragen? | Was genau ist die „Kette"? Welche Rolle hat „Jeff AI"? Welche „stützenden Modelle"? Erweiterung der Modellregel nötig. |

---

## 4. Rechts- und Compliance-Bausteine (nur benannt und verortet, keine Rechtsberatung)

| Baustein | Für zahlenden B2B-SaaS | Stand im Repository |
|---|---|---|
| Impressum / Anbieterangaben | nötig | Seite `/impressum` in `config/site-map.json`; Anbieterangaben „bitte bestätigen" (`docs/09-final/08…:15`), Rechtsform unbestätigt (`PROGRESS.md` 08.11.), `AGENTS.md:18–20` „keine bestätigten Anbieterangaben". **Offen.** |
| AGB / Nutzungsbedingungen für die Suite | nötig | `/vertragsgrundlagen` beschreibt Agenturaufträge; „Vertragsunterlagen bleiben … Entwürfe". Textmatrix nennt „Nutzungsbedingungen (Prepaid)" nur im Prototyp (`docs/09-final/08…:9`). Abo-Bedingungen (Laufzeit, Verlängerung, Kündigung, Preisänderung, Verfügbarkeit, Haftung): **fehlen.** |
| AVV (Art. 28 DSGVO) mit TOM und Liste der Unterauftragsverarbeiter | nötig, sobald Kunden personenbezogene Daten eingeben | Nur als Zeile in der Textmatrix („AVV/TOM/UAV-Liste") und in Konzeptdokumenten. Kein ausgearbeiteter Text, kein Abschlussweg im Produkt. **Fehlt.** |
| Datenschutzhinweise | nötig | `/datenschutz` vorhanden (Entwurf 0.9). Laut D-010 muss die Seite die Verarbeitung von Chatnachrichten noch abdecken. Für die Suite zusätzlich: Konten, Zahlung, Modellanbieter, MCP-Anbieter. **Zu ergänzen.** |
| Verzeichnis der Verarbeitungstätigkeiten, Löschkonzept | nötig | `config/mandanten.json` („loeschen", „export") als Regel; kein Verzeichnis gefunden. **Fehlt/nicht gefunden.** |
| Betroffenenrechte | nötig | Anfrageweg vorhanden (`nexify_api.py:468–476`), Bearbeitung manuell; Portal nicht verbunden. |
| Widerruf | nur falls Verbraucher | Shop-Texte vorhanden (`prototypen/assets/legal/*.json`, Schlüssel `widerruf`). Für die Suite hängt es an Entscheidung 3.2 Nr. 9. |
| Button-Lösung / Kündigungsbutton | nur falls Verbraucher | in `AGENTS.md` „Recht" als Regel genannt; für Abo-Checkout nicht umgesetzt (kein Checkout). |
| Preisangaben | nötig; netto/brutto klar, Laufzeit, Verlängerung | Keine freigegebenen Preise; `/preise-ablauf` beschreibt Kostenarten ohne Beträge. |
| Rechnungspflichtangaben, Reverse-Charge-Vermerk, Archiv | nötig | Abschnitt 1.12; E4, L10 offen. |
| EU-KI-Verordnung, Transparenz (Art. 50) | nötig | `/ki-hinweise` vorhanden, sagt aber noch „ohne Live-KI-Modell" (`config/site-map.json`, Eintrag `ai-notice`) – laut D-010 vor Livegang anzupassen. Sichtbare Kennzeichnung im öffentlichen Chat wurde am 13.11.2026 auf Inhaberentscheidung entfernt, Risiko benannt (D-010). Für den Kunden-Chat der Suite neu zu entscheiden. `AGENTS.md` und `config/llm-verbindungen.json` („kennzeichnung") verlangen die Kennzeichnung weiterhin – ungelöster Widerspruch. |
| EU-KI-Verordnung, KI-Kompetenz (Art. 4), Hochrisiko-Abgrenzung | zu prüfen | E6 offen (`docs/09-final/08…:27`); zulässige Nutzung als Dokument in der Textmatrix genannt, Text nicht gefunden. |
| Zulässige Nutzung (Acceptable Use) | sinnvoll, bei BYO und Werkzeugen besonders | nur in Textmatrix benannt. **Fehlt.** |
| Barrierefreiheit | Erklärung vorhanden | `/barrierefreiheit`. |
| Cookies/Einwilligung | vorhanden | `/cookies`, `apps/web/components/DiagnosticConsent.tsx`. |
| Anwaltliche Endprüfung | Pflicht vor Live laut eigener Regel | E12 offen (`docs/09-final/08…:3`, `:28`). |

---

## 5. Werbeaussagen im Auftragstext

Aussagen: „meisterhaft feinabgestimmt", „extrem kosteneffizient", „überragende Ergebnisse", „absolute Flexibilität", „geschlossene Premium-Gesamtlösung".

**Belege im Repository: keine.**
- Kein Kostenvergleich, keine Messreihe, kein Bewertungsdatensatz mit Ergebnissen. `config/api-prepaid.json`: Einkaufspreise der Modelle `null`, „ungeprüft". `config/kennzahlen.json`: Zielwerte sind „STARTANNAHMEN …, keine Zusagen"; KI-Kosten „nie geschätzt", Monatsschätzung „nur mit belegten Preisen". `config/acceptance-coverage.json` MASTER-17: „Vergleichbare echte Ziel-/Lastmessung und autorisierte quantitative Akzeptanzgrenzen fehlen."
- Kein Fine-Tuning (Abschnitt 1.10).
- Die Kette selbst existiert nicht (ein Modell).
- Die eigenen Regeln stehen dagegen: `docs/09-final/08-recht-und-compliance.md:31` (L1) „‚Um ein Vielfaches günstiger' nur mit datiertem Preisvergleich"; `:32` (L2) „‚trainiert' erst nach Live-Gang der Feinabstimmung"; `AGENTS.md` „Ehrlich bleiben: … Messwerte werden nicht erfunden"; Mastervorgabe §3 „Marketing/Content: keine ungeprüften Claims"; `:18` nennt § 5 UWG (Irreführung).

**Was nötig wäre, um die Aussagen belegt zu treffen:**

| Aussage | Nötiger Beleg |
|---|---|
| „kosteneffizient" | Datierter Preisvergleich: tatsächliche Kosten je 1 Mio. Tokens bzw. je typischer Aufgabe über die NeXify-Route gegen benannte Vergleichsmodelle, gleiche Aufgaben, Quelle und Datum der Preislisten, Wiederholung bei Preisänderung. Dazu gemessener Verbrauch aus dem eigenen Journal. Der Zusatz „extrem" ist ein Superlativ und braucht einen entsprechend deutlichen, belegten Abstand. |
| „überragende Ergebnisse" | Fester Aufgabensatz aus dem Zielgebiet (im Repository angelegt: `config/fragensatz.json` als „goldener Satz", in `config/langfuse.json` referenziert), Bewertungsregeln, Vergleich gegen benannte Alternativen, Ergebnisse mit Datum und Modellstand. Sonst nur als nicht überprüfbare Anpreisung formulierbar – rechtliche Einordnung durch den Anwalt. |
| „feinabgestimmt" | Entweder tatsächliches Fine-Tuning mit Nachweis, oder Formulierung, die das Tatsächliche beschreibt (abgestimmte Vorgaben, Leitplanken, Routenwahl). Regel L2: bis dahin „eingerichtet auf". |
| „Kette aus DeepSeek, Jeff AI und stützenden Modellen" | Die Kette muss existieren und beschrieben sein (welches Modell wofür), Jeff-Rolle geklärt, Modellregel erweitert. |
| „absolute Flexibilität" | Liste der tatsächlich unterstützten Anbieter für BYO; „absolut" ist bei 0 umgesetzten Adaptern nicht haltbar. |
| „geschlossen" | Zu klären, was gemeint ist (alles aus einer Hand?). Mit Composio, OpenRouter, Modell- und Zahlungsanbieter sind mehrere Dritte beteiligt; die Datenschutzhinweise müssen sie nennen. |

Bis Belege vorliegen: Texte in der Oberfläche beschreiben nur, was nachweislich vorhanden ist. Formulierung und Freigabe liegen beim Inhaber.

---

## 6. Umsetzungspakete (klein, in Reihenfolge)

Legende: **Sofort** = ohne Inhaberentscheidung und ohne fremden Zugang baubar · **Blockiert** = braucht Entscheidung, Konto oder Rechtstext. Alle neuen Oberflächen und Routen hinter einem Schalter (Vorschlag `NEXIFY_SUITE=off` als Vorgabe), damit die bestehende Seite unverändert bleibt.

| Nr. | Ziel | Bereiche/Dateien | Abhängig von | Sofort baubar | Blockiert durch | Testidee | Rückweg |
|---|---|---|---|---|---|---|---|
| **P0** | Grundlage klären: eine Produktionsadresse, Konten-API antwortet, Prüfkette läuft | `vercel.json`, Vercel-Projekt, `apps/shop-api/vercel_app.py`, GitHub Actions | – | Diagnose und Liste der fehlenden Laufzeitvariablen (nur Namen) | Inhaber: DNS, Laufzeit-Zugänge, Actions-Abrechnung (`befund-2026-11-13.md` E-C bis E-F) | `GET /api/health` 200; Registrierung + Login gegen Vorschau | keine Codeänderung nötig |
| **P1** | Namen und Begriffe festlegen | `config/site-map.json`, `config/public-interface-copy.json`, `config/i18n.json` | Inhaber | Übersicht aller Fundstellen von „NeX2fly Suite", „AIFly ORACLE", „NeX Agentic AIFly", „NeX & Oracle" | Schreibweise ORACEL/ORACLE; Verhältnis neuer Suite-Name zu „NeX2fly Suite" | Textsuche: nur eine Schreibweise | Git-Revert |
| **P2** | Mandantenmodell der Suite: Organisation, Mitgliedschaft, Rolle, Berechtigung | neue Migrationen neben `db/foundation/001_foundation.sql`; Entwurf aus `apps/selfservice/domain.py` übernehmen | P0 (für Einsatz), Entscheidung Datenhaltung | Schema, RLS-Richtlinien, Isolationstests lokal (Postgres im Container wie `db/foundation/test.sh`) | Wahl der Produktionsdatenbank (Supabase/Postgres wo?) | drei Mandanten; A liest/schreibt B nicht; ohne `app.mandant_id` kein Zugriff | Migration ist additiv; nicht angewendet = wirkungslos |
| **P3** | Registrierung vervollständigen: E-Mail-Bestätigung, Firmenangaben, Zustimmungsnachweis (Version + Zeit) | `apps/shop-api/shop/accounts_api.py`, `mail_templates.py`, `apps/web/components/shop/AuthForms.tsx` | P0 | Bestätigungslink (einmalig, befristet), Zustand „unbestätigt" ohne Suite-Rechte, Formularfelder, Tests | Rechtstexte, denen zugestimmt wird (AGB/AVV) | abgelaufener/benutzter Link; Konto ohne Bestätigung erhält keine Berechtigung; Antwort verrät nicht, ob Konto existiert | Schalter; bestehende Konten bleiben gültig |
| **P4** | Dashboard-Gerüst im Markendesign | `apps/web/components/PortalWorkspace.tsx` (+ CSS), `config/design-tokens.json`, `packages/tokens` | – | Reiter Abo, Verbrauch, LLM-Einstellung, Verbindungen, Chat als Oberflächen mit ehrlichen Leerzuständen („noch nicht verfügbar"); 4 Sprachen; Tastatur, 48-px-Ziele | Beträge und Tarifnamen (bleiben leer) | `node tools/ds-audit-cli.js`; Seitenprüfung 390/1440 px; kein Betrag im HTML | Schalter aus |
| **P5** | Portal-API anschließen und härten | `apps/shop-api/vercel_app.py` (`MODULES`, `PREFIXES`), Root-`vercel.json` (Rewrites), `nexify_api.py` | P0, P2 | Routen aufnehmen; Besitzprüfung für `/api/oracle/history`; Preise aus `PLANS` entfernen bzw. aus Konfiguration lesen; eine Variablenfamilie für den Router; Router-Modellname angleichen | – (reine Technik); Aktivierung in Produktion: Inhaber | fremde Sitzungskennung → 404; Portal ohne Anmeldung → 401; kein Betrag in der Antwort, solange nicht freigegeben | Rewrite-Zeilen und Modul wieder entfernen |
| **P6** | Kunden-Chat hinter Anmeldung und Berechtigung | `apps/web/app/api/chat/route.ts` als Vorlage, neue Route `/api/suite/chat`, `apps/web/lib/chat-*.ts` | P2, P5 | Bindung an Konto/Mandant, Verbrauchszählung je Mandant, Limit je Mandant, Ablage mit `mandant_id`; Tests mit Stellvertreter-Endpunkt | Kennzeichnungsfrage (Art. 50) für den Kunden-Chat; Kostendeckel am Router-Schlüssel | ohne Berechtigung 403; Verlauf mandantengetrennt; kein Ersatzmodell bei Fehler | Schalter aus; öffentlicher Chat unberührt |
| **P7** | Abrechnungskern anbieterneutral | neue Tabellen `subscription`, `billing_event`, `invoice`; Webhook-Route; Abgleichlauf; Muster aus `revolut.py`, `checkout_api.py` | P2 | Ereignisjournal mit eindeutiger Ereignis-ID, Zustandsübergänge, Berechtigung in derselben Transaktion, Abgleichlauf; alles gegen einen Test-Anbieter (Attrappe) | Anbieter, Konto, Schlüssel, Preise, Tarife | doppeltes Ereignis → eine Wirkung; falsche Signatur → 400; verdrehte Reihenfolge; Zahlung ok + Fehler danach → kein halber Zustand | Schalter; Tabellen bleiben leer |
| **P8** | Anbieter-Adapter und Checkout | Adapter-Modul, Checkout-Seite, Tarifseite | P7, Entscheidung 3.1 + 3.2 | – | **vollständig blockiert**: Anbieterkonto, Preise, AGB, Preisangaben | Ende-zu-Ende im Testmodus des Anbieters; Livezahlung nur durch Inhaber | Adapter abschalten; bestehende Abos nicht anfassen |
| **P9** | Rechnungen und Belege | `apps/web/lib/invoice.ts`, `tools/rechnung.mjs`, `nexify_api.py` (Rechnungs-HTML) | P7, Steuerentscheidung | Datenmodell, Nummernkreis-Logik, PDF-Erzeugung als Entwurf mit Kennzeichnung „Entwurf" | Steuerbehandlung (E4), Rechtsform, Pflichtangaben, Archivwerkzeug (L10) | Summen in Cent; fortlaufende Nummern ohne Lücke bei Wiederholung; Storno erzeugt Gegenbeleg, löscht nichts | Entwürfe verwerfen; keine echte Rechnung ohne Freigabe |
| **P10** | Eigenes LLM (BYO) | neuer Tresor-Adapter, `bind_byok`/`revoke_byok` aus `apps/selfservice/domain.py`, Einstellungsseite | P2, P6 | Schnittstelle des Tresors, Schlüsselannahme ohne Rückgabe, Schwärzung in Protokollen, Adapter für OpenAI-kompatible Adressen gegen Stellvertreter | Tresor-Wahl und -Zugang; Liste zugelassener Anbieter; Haftungsklausel/AVV | Schlüssel taucht in keinem Protokoll, keiner Antwort, keiner Sicherung im Klartext auf (automatische Suche nach Testschlüssel); widerrufener Schlüssel sperrt sofort; kein Rückfall auf NeXify | Funktion abschalten; Verweise bleiben, Schlüssel im Tresor widerrufbar |
| **P11** | NeXify AI Intelligenz als wählbare Option | `config/llm-policy.json`, `config/llm-verbindungen.json`, Router-Auswahl in der Chat-Route | P6 | Auswahl „NeXify"/„eigenes LLM" je Mandant mit einem Modell (heutiger Stand) | Definition der Kette, Rolle von Jeff, Erweiterung der Modellregel, Routen-/Datenschutznachweis, Verbrauchspreis | `tools/check_llm_policy.py`; gesendete Anfrage entspricht der Policy; abweichendes Modell → Fehler | Policy-Datei zurücksetzen |
| **P12** | Composio-/MCP-Anbindung je Mandant | neuer Vermittler-Baustein, Verbindungsseite | P2, P6, Entscheidung 3.3 | Vermittler-Schnittstelle, Freigabeliste je Mandant, Bestätigung vor schreibenden Aktionen, Aufrufprotokoll – gegen Attrappe | Composio-Konto/Tarif, Nutzungsrecht für Kunden, AVV/SCC (E-B) | Mandant A kann Verbindung von B nicht nutzen; nicht freigegebenes Werkzeug → abgelehnt; Zeitüberschreitung → keine automatische Wiederholung | Schalter aus; Verbindungen beim Anbieter widerrufen |
| **P13** | Kündigung, Sperre, Export | Portal, Abrechnungskern | P7, P8 | Zustände und Oberflächen, Export der eigenen Daten, Sperre statt Löschung | Fristen, Aufbewahrung, Texte | Kündigung → Zugang bis Laufzeitende; danach Lesen/Export möglich, neue Arbeit gesperrt; nichts gelöscht | Zustand zurücksetzen |
| **P14** | Rechtstexte einbinden, Monitoring, Betriebsanleitung | `config/site-map.json` (Rechtsseiten), Sentry, Alarmregeln, Erweiterung `GO-LIVE.md` | alle | Platzhalterstruktur, Versionsfeld für Zustimmungen, Alarmregeln, Störungstabelle | Texte vom Anwalt (E12), Empfänger der Alarme | jede Zustimmung trägt Version; Probealarm kommt an | Texte versioniert; alte Version bleibt abrufbar |
| **P15** | Belege für Werbeaussagen | `config/fragensatz.json`, Auswertung, Preisvergleich | P6, P11 | Messaufbau, Aufgabensatz, Auswerteskript | bezahlte Modellaufrufe (Budgetfreigabe), Vergleichsmodelle | Ergebnisse datiert und reproduzierbar | – |

Empfohlene Reihenfolge: P0 → P1 → (P2, P4 parallel) → P3 → P5 → P6 → P7 → [Entscheidungen] → P8 → P9 → P13 → P10 → P11 → P12 → P14 → P15.
Ohne jede Entscheidung sofort baubar: P2 (lokal), P4, P5 (ohne Aktivierung), P7 (gegen Attrappe), Teile von P3, P6, P10, P12.

---

## 7. Zusammenfassung für die Geschäftsführung (15 Zeilen)

1. Der gewünschte Ablauf „Registrieren → Abo → Bezahlen → Freischalten → Chat, Composio, Dashboard" existiert heute nicht durchgängig; vorhanden sind einzelne Teile, die nicht miteinander verbunden sind.
2. Anmeldung: eigene Konten (E-Mail/Passwort, Google über Emergent) in `apps/shop-api`; Clerk ist entfernt, Supabase dient nur der Chat-Ablage. In der Produktion antwortet diese API laut `AGENTS.md` (13.11.2026) mit 503.
3. Registrierung funktioniert im Code, aber ohne E-Mail-Bestätigung – das widerspricht der eigenen Suite-Policy.
4. Abo/Preise: kein freigegebenes Modell. Im Code stehen Entwurfsbeträge (49/149/399), in einer Konfiguration andere (9,99/19,99), die Policy sagt „kein Preis erfunden". Das muss der Inhaber auflösen.
5. Bezahlung: nur Revolut für Einmalkäufe im TEILEKLAR-Shop. Für Abos gibt es keinen Code und keinen Anbieter.
6. Freischaltung: kein Mechanismus, der aus einer Zahlung eine Berechtigung macht. Ein gut getestetes Domänenmodell liegt lokal vor (`apps/selfservice`), ist aber nirgends angeschlossen.
7. Dashboard: Oberfläche und API sind geschrieben; die API wird im Vercel-Einstieg nicht geladen und nicht geroutet. Abo, LLM-Wahl, Verbindungen und Chat fehlen im Menü.
8. Chat: Der öffentliche Chat läuft über ein Modell mit Leitplanken. Einen Chat für angemeldete, zahlende Kunden mit Mandantenbindung und Verbrauchszählung gibt es nicht. Im vorhandenen Portal-Chat-Code ist der Verlauf ohne Besitzprüfung abrufbar – vor Aktivierung schließen.
9. Composio: nur Konfigurationseinträge; als US-Anbieter ohne AVV/SCC geführt, Entscheidung offen. Keine Kundenanbindung.
10. Eigenes LLM: Regeln sind sauber beschrieben (Tresor, kein Klartext, kein Rückfall), umgesetzt ist nichts; kein Tresor angebunden.
11. „NeXify AI Intelligenz": heute ein einzelnes DeepSeek-Modell über den 9router – keine Kette. „Jeff" ist ein internes Freigabe-Orakel ohne Chatfunktion; als Kettenbaustein ungeklärt. Weitere Modelle widersprechen der geltenden Modellregel und brauchen eine ausdrückliche Erweiterung.
12. Mandantentrennung: drei verschiedene Ansätze nebeneinander (MongoDB-Filter, PostgreSQL-RLS-Fundament, Supabase je Sitzung). Für die Suite ist ein einheitliches Modell mit datenbankseitiger Trennung nötig; das Fundament dafür liegt vor.
13. Recht: AGB für das Abo, AVV mit Unterauftragsverarbeitern, bestätigte Anbieterangaben und anwaltliche Prüfung fehlen. Die KI-Hinweisseite ist inhaltlich überholt.
14. Werbeaussagen („extrem kosteneffizient", „überragend", „feinabgestimmt"): im Repository ohne jeden Beleg; die eigenen Regeln verlangen datierte Vergleiche, bevor so geworben wird.
15. Sofort baubar ohne Entscheidung: Mandantenschema mit Tests, Dashboard-Gerüst im Markendesign, Anschluss und Härtung der Portal-API, anbieterneutraler Abrechnungskern gegen eine Attrappe. Alles mit Geld, Verträgen oder Anbietern wartet auf den Inhaber.

### Offene Entscheidungen, priorisiert

| Prio | Entscheidung | Blockiert |
|---|---|---|
| 1 | Produktionsadresse, Laufzeit-Zugänge der Konten-API, Prüfkette (aus Betriebsbefund 13.11.) | alles |
| 2 | Rechtsform und Anbieterangaben (Eenmanszaak oder B.V.) | Impressum, Rechnung, Verträge |
| 3 | Kundenkreis: nur Unternehmen oder auch Verbraucher | Rechtstexte, Checkout |
| 4 | Abo-Modell: Stufen, Preise, Testphase, Laufzeit, Kündigung; Verhältnis zu KI-Verbrauch | P8, P9, P13 |
| 5 | Zahlungsanbieter und wer das Konto eröffnet | P8 |
| 6 | Steuerbehandlung durch Steuerberatung (Reverse Charge, Rechnungssteller) | P9 |
| 7 | Was ist die „NeXify AI Intelligenz" genau: Modelle, Rolle von „Jeff AI"/„JavAI", Erweiterung der Modellregel; Datenweg und Drittland | P11, AVV |
| 8 | Composio: Konto, Tarif, Nutzungsrecht für Kunden, AVV/SCC (E-B) | P12 |
| 9 | BYO: Tresor, zugelassene Anbieter, Haftung | P10 |
| 10 | Schreibweise „ORACEL" oder „ORACLE"; Verhältnis des neuen Suite-Namens zu „NeX2fly Suite" | P1, alle Texte |
| 11 | KI-Kennzeichnung im Kunden-Chat (Art. 50) – Widerspruch zwischen D-010 und `AGENTS.md` | P6 |
| 12 | Rechtstexte (AGB, AVV, Datenschutz, zulässige Nutzung) beauftragen | Livegang |
| 13 | Freigabe der Werbeaussagen bzw. Budget für Messungen | Marketing |

### Nicht geprüft

- Keine Laufzeitprüfung: kein Build, kein Server, kein Test ausgeführt (Auftrag: nur lesen). Aussagen zur Produktion stammen aus `AGENTS.md` und `docs/04-betrieb/befund-2026-11-13.md`, nicht aus eigener Messung.
- Keine `.env`-Dateien geöffnet; Variablennamen nur aus dem Code. Ob Werte in Vercel gesetzt sind, ist unbekannt.
- Git-Historie, andere Zweige und offene Pull Requests (u. a. 94, 95) nicht gelesen. Der Arbeitsbaum war während der Analyse in Bewegung.
- `apps/site` (Vite) und `apps/cloud` nur oberflächlich; `apps/agent-gateway` nur README und Routenliste. `reference/`, `prototypen/` und `evidence/` nicht systematisch.
- `PROGRESS.md` (127 KB), `config/operating-model.json`, `config/acceptance-coverage.json` nur in Ausschnitten.
- Anbieterseitige Tatsachen (Composio-Tarife und -Bedingungen, Gebühren der Zahlungsanbieter, DeepSeek-/OpenRouter-Datenverarbeitung, 9router-Konfiguration) nicht recherchiert; Abschnitt 3.1 ist als Annahme markiert.
- Composio-, Clerk-, Vercel- und Supabase-Konten nicht abgefragt.
- Rechtliche Bewertung: keine. Abschnitt 4 benennt und verortet nur.

### Ergänzende Wissensquellen (eigene Quelle, nicht Repository)

- **Mem** (zwei Suchen, 14.11.2026): Treffer sind fast ausschließlich Master- und Systemnotizen aus März 2026 (z. B. „NeXifyAI – Gesamtprojekt-Masterdatei", „NeXifyAI Plattform-Masterplan (V1.0)"). Kein Treffer mit Bezug zu Suite-Abo, Preismodell, Zahlungsanbieter oder Composio-Kundenanbindung. Notizen nicht geöffnet; älter als die Repository-Entscheidungen und daher nicht führend.
- **Notion** (eine Suche): eine einschlägige Seite „Agentur-Wissensmanagement — Bestandsaufnahme und Betriebsstruktur" (09.11.2026, ungeprüft markiert), verweist auf Pull Requests dieses Repositorys. Nicht im Volltext gelesen.
- **Nebenbefund Sicherheit:** Die Mem-Trefferliste zeigt zwei Notizen, deren Titel bzw. Vorschau auf im Klartext abgelegte Zugangsdaten hindeuten (März 2026). Nicht geöffnet, Werte hier nicht wiedergegeben. Das widerspricht der Inhabergrenze „Secrets nie im Klartext". Empfehlung: Inhaber prüft, ob die Zugänge noch gültig sind, dreht sie gegebenenfalls und verlegt sie in einen Tresor.
