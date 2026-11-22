# Funktionsliste Suite und Werkstattservice: nutzbar, Hülle, fehlt

Stand: 14.11.2026, Repository `origin/main` auf `2b8da63`. Reine Analyse. Kein Produktcode, keine Konfiguration und kein Seitentext geändert, kein Formular abgeschickt, kein Konto angelegt, `/api/chat` nicht aufgerufen.

Bezug: Register der offenen Arbeiten vom 14.11.2026, Eintrag OA-039; Paket J-2 und S2 aus `docs/04-betrieb/werkstattservice-und-suite-ist-soll-2026-11-14.md`. Anlass: Der Inhaber Pascal Courbois hat am 14.11.2026 die Fertigstellung der eigenen Seiten samt Shop, Werkstatt und Suite zur Priorität erklärt (Angabe der koordinierenden Sitzung; in diesem Repository liegt dazu kein weiterer Beleg).

Kennzeichnung: **IST** = heute gelesen oder gemessen · **SOLL** = gültige Entscheidung oder führender Plan · **ANNAHME** = Bewertung dieser Analyse · **OFFEN** = fehlt oder nicht belegt.

Einordnung (ANNAHME, Maßstab dieser Liste):

- **nutzbar**: Ein Besucher kann die Funktion in der Produktion heute durchlaufen, und eine Messung belegt das.
- **Hülle**: Die Oberfläche ist ausgeliefert (Seite, Formular, Schalter), die Funktion dahinter antwortet nicht oder ist in der Auslieferung nicht vorhanden.
- **fehlt**: Es gibt keine Oberfläche, über die ein Besucher die Funktion erreichen könnte. Liegt ein Kern im Repository, steht das in der Zeile.

Nicht eingeordnet werden Aussagen über die Agenturleistung (Beratung, Angebot, Umsetzung durch Menschen) und Aussagen, die eine Funktion ausdrücklich verneinen. Letztere stehen in Abschnitt 4.

## 1. Ergebnis in fünf Sätzen

1. **IST:** Von 38 Funktionsaussagen der geprüften Seiten ist keine als nutzbar belegt; 22 sind Hülle, 16 fehlen.
2. **IST:** Die Ursache für 15 der 22 Hüllen ist dieselbe: Der Shop-Dienst antwortet in der Produktion auf jede Anfrage mit 503, und daran hängen Registrierung, Anmeldung, Kontakt- und Partnerformular, Werkstattsuche und Sortiment.
3. **IST:** Die Suite ist als Produktseite mit Testversprechen ausgeliefert, aber es gibt keinen Arbeitsbereich: Hinter `/portal/kunde` liegt eine Hülle, die Schnittstelle `/api/portal/*` antwortet mit 404, und der Kern für die Testphase (`apps/selfservice/domain.py`) hat weder Route noch Oberfläche.
4. **IST:** Der Werkstattservice sagt bei Terminen und Gutscheinen offen „noch nicht“, verspricht aber auf `/teileklar/partner-werden` ein Partnerportal mit sechs Funktionen, von denen keine gebaut ist.
5. **ANNAHME:** Am wirksamsten sind in dieser Reihenfolge die Bindung des Shop-Dienstes (Entscheidung und Zugang beim Inhaber), die Anpassung der Suite- und Partnertexte an den heutigen Stand und danach der Bau des Kundenbereichs.

## 2. Messung

IST, gemessen am 14.11.2026 zwischen 20:23:43 und 20:28:16 UTC gegen `https://nexifyai.de`, nur `GET`, mit `curl` und mit einem Browser (Playwright, alle Anfragen außer `GET` und alle Anfragen an `/api/chat` und `/api/agent-chat` blockiert). Auslieferungskennung in den Fehlerseiten: `dpl_EGxxPfv9xxuyBQ3EU8UXF6DyGdZX`.

Lokaler Produktions-Build am Commit `2b8da63`: `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm --filter @nexify/web build` (Exit 0), `next start -p 3311`. Der Hauptinhalt (`<main>`) aller zwölf verglichenen Seiten ist lokal und in der Produktion zeilengleich (0 abweichende Zeilen je Seite). Belegt ist damit nur, dass diese Seitenausgaben übereinstimmen. Welcher Commit in der Produktion läuft, ist nicht gemessen (keine Auslieferungs-Metadaten gelesen); Schlüsse vom lokalen Code auf das Verhalten der Produktion sind deshalb als ANNAHME gekennzeichnet.

| Seite | Produktion | Lokal | Robots-Kopfzeile |
|---|---|---|---|
| `/` | 200 | 200 | `noindex, nofollow` |
| `/produkte/nex2fly` | 200 | 200 | `noindex, nofollow` |
| `/registrieren` | 200 | 200 | `noindex, nofollow` |
| `/anmelden` | 200 | 200 | `noindex, nofollow` |
| `/preise` | **404** | **404** | – |
| `/preise-ablauf` | 200 | 200 | `noindex, nofollow` |
| `/leistungen` | 200 | 200 | `noindex, nofollow` |
| `/teileklar` | 200 | 200 | `noindex, nofollow` |
| `/teileklar/werkstatt` | 200 | 200 | `noindex, nofollow` |
| `/teileklar/termine` | 200 | 200 | `noindex, nofollow` |
| `/teileklar/partner-werden` | 200 | 200 | `noindex, nofollow` |
| `/teileklar/gutscheine` | 200 | 200 | `noindex, nofollow` |
| `/portal/kunde`, `/teileklar/partnerportal`, `/teileklar/konto` | 200 (Hülle) | 200 (`/portal/kunde`) | `noindex, nofollow` |
| `/passwort-vergessen` | 200 | nicht gemessen | nicht gemessen |

Die im Auftrag genannte Adresse `/preise` gibt es nicht. Die Preisseite heißt `/preise-ablauf` (`config/site-map.json:1571`, `pages[pricing]`); sie ist hier geprüft. `/teileklar/werkstatt` trägt inzwischen `noindex, nofollow`; der Befund „`index, follow`“ aus dem IST/SOLL-Dokument von 18:42 UTC ist damit überholt.

| Schnittstelle (`GET`) | Produktion | Antwort |
|---|---|---|
| `/api/health`, `/api/shop/status`, `/api/shop/products`, `/api/shop/categories`, `/api/shop/cart` | 503 | `runtime_binding_unavailable`, Grund `database_binding_missing_or_unsuitable` |
| `/api/workshops/search?q=Venlo` | 503 | derselbe Grund |
| `/api/auth/me` | 503 | derselbe Grund |
| `/api/auth/register`, `/api/auth/login`, `/api/requests` | 503 | `runtime_binding_unavailable`, Grund `payment_mode_unbound` |
| `/api/portal/overview`, `/api/portal/subscription`, `/api/oracle/providers` | 404 | Fehlerseite der Web-App |
| `/api/partner/requests`, `/api/suite/composio/verify` | 404 | Fehlerseite der Web-App |
| `/api/internal/workspace/status` | 401 | `authentication_required` |
| `/api/chat`, `/api/agent-chat`, `/api/agent-runtime-status` | 405 | Route vorhanden, `GET` nicht erlaubt; nicht weiter geprüft |

Was der Code dazu sagt (IST):

- `apps/shop-api/vercel_app.py:268-269`: Solange die Zahlungsart nicht gesetzt ist, weist der Dienst **jede** Anfrage ab, die kein freigestelltes Lesen ist, also auch jedes `POST` an `/api/auth/*` und `/api/requests`. Dazu kommt die fehlende Datenbankbindung (`vercel_app.py:92-108`).
- `apps/shop-api/vercel_app.py:53-54` und `:216-217`: Der Vercel-Einstieg lädt sieben Module und besitzt fünf Pfadpräfixe. `nexify_api.py` (Kundenbereich `/api/portal/*`, Betreiberbereich `/api/operator/*`, `/api/oracle/*`) ist nicht darunter. `vercel.json:68-128` leitet diese Pfade auch nicht an den Shop-Dienst. **Folge:** Selbst mit gebundener Datenbank bleibt der Kundenbereich ohne Daten.
- ANNAHME aus dem Code, nicht gemessen: Ein abgeschicktes Formular erhält dieselbe 503-Antwort. Das Kontaktformular zeigt dann den Text aus `apps/web/lib/contact-copy.ts:3` („… zurzeit nicht erreichbar. Ihre Anfrage wurde nicht gesendet und nicht gespeichert …“) und einen E-Mail-Verweis (`apps/web/components/ContactRequestForm.tsx:54`, `apps/web/lib/contact-outcome.mjs:15-19`). Das Kontoformular zeigt „Die Aktion ist fehlgeschlagen. Bitte versuchen Sie es erneut.“ (`apps/web/components/shop/AuthForms.tsx:61`).

Browser, Produktion (IST): `/teileklar` zeigt „Sortiment momentan nicht erreichbar“ und „Das Sortiment konnte nicht geladen werden.“; `/teileklar/werkstatt?q=Venlo&umkreis=25` zeigt „Die Suche konnte nicht ausgeführt werden.“; `/portal/kunde` zeigt „Ihr persönlicher Arbeitsbereich. Melden Sie sich an …“.

Tests am Commit `2b8da63` (IST, lokal): `python3 -m unittest discover -s tests -p test_selfservice_domain.py` 16 Tests OK; `-p test_suite_trial.py` 7 Tests OK; `-p test_selfservice_decisions.py` 2 Tests OK. Sie belegen den Kern der Testphase gegen eine lokale SQLite-Datei, keinen Dienst und keine Oberfläche.

## 3. Tabelle je Seite

Fundstellen ohne Dateiangabe meinen `config/site-map.json`. „Bindung“ steht für: Shop-Dienst in der Produktion an Datenbank und Zahlungsart binden (W1 aus dem IST/SOLL-Dokument, OA-029/OA-084; Zugang und Entscheidung beim Inhaber). Aufwandsklassen wie dort (S, M, L, XL), ANNAHME.

### 3.1 `/produkte/nex2fly` · „NeX AIFly Suite“

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| S1 | „Gespräche, Aufgaben, Dokumente und Projektwissen an einem Ort – in Ihrem eigenen Bereich.“ | `:2425` `pages[nex2fly].summary`, `:2441` `sections[nex2fly-customer-1].body` | `/portal/kunde` (`apps/web/components/PortalWorkspace.tsx`), `/api/portal/*` (`apps/shop-api/shop/nexify_api.py:187` ff.) | `/portal/kunde` 200 Hülle; `/api/portal/overview` 404; Menü der Hülle kennt Anfragen, Projekte, Angebote, Dokumente, Rechnungen, Support, Profil (`PortalWorkspace.tsx:9`), keine Aufgaben, kein Projektwissen | Hülle | Entscheidung des Inhabers (Umfang der ersten Suite-Stufe), dann bauen (XL, S9); bis dahin Text anpassen: `pages[nex2fly].summary`, `sections[nex2fly-customer-1].body` |
| S2 | „Lernen Sie die Suite in einem Test über 24 Stunden kennen.“ / „Der Test dauert 24 Stunden und beginnt erst, wenn Sie ihn nach der Aktivierung selbst starten.“ | `:2425`, `:2493` `sections[nex2fly-customer-3].body` | Kern `apps/selfservice/domain.py:350` (`start_trial`); Richtlinie `config/selfservice-policy.json` (`trial.duration_seconds` 86400) | Kern-Tests 16 + 7 OK; keine Route, keine Oberfläche; `/api/auth/register` 503 | fehlt (Kern im Repository) | bauen (L bis XL: Route, Speicheradapter, Oberfläche; S6, S10) oder Text anpassen: `pages[nex2fly].summary`, `sections[nex2fly-customer-3]` |
| S3 | „Aus einem Gespräch wird eine Aufgabe, aus der Aufgabe ein Ergebnis, das Sie weiterverwenden können.“ | `:2467` `sections[nex2fly-customer-2].body` | kein Baustein gefunden (Suche nach Aufgabe, task, Projektwissen, knowledge in `PortalWorkspace.tsx` und `nexify_api.py`: 0 Treffer) | – | fehlt | Entscheidung des Inhabers; bauen (XL) oder Text anpassen: `sections[nex2fly-customer-2].body` |
| S4 | „Sie legen fest, welche Quellen die KI nutzt und wer in Ihrem Bereich mitarbeitet.“ / „Sie bestimmen, welche Personen bei Ihnen mitarbeiten.“ | `:2467`, `:2519` `sections[nex2fly-customer-4].body` | `nexify_api.py:448` (`POST /api/portal/team`), `:386` (`PUT /api/portal/agent`) | nicht im Vercel-Einstieg, 404; keine Oberfläche dafür in `PortalWorkspace.tsx` | fehlt (Routen im Repository) | bauen (L, nach S5) oder Text anpassen: `sections[nex2fly-customer-2]`, `sections[nex2fly-customer-4]` |
| S5 | „Einige Werkzeuge – etwa der Versand per E-Mail oder die Anbindung eines Kalenders – werden je Zugang eingeschaltet. Was für Sie bereitsteht, zeigt Ihr Arbeitsbereich.“ | `:2467` | Composio-Anbindung `apps/web/lib/composio.ts:24` (Schalter aus), PR 123 (offen) | `/api/suite/composio/verify` 404; keine Oberfläche | fehlt | bauen (M, S11) oder Text anpassen: `sections[nex2fly-customer-2].body`; auch `apps/web/lib/page-faq.ts:21` („Welche Werkzeuge bereitstehen, zeigt Ihr Arbeitsbereich.“) |
| S6 | „Die Nutzung von KI-Modellen hat ein eigenes Budget. Welche Modelle und Kosten für Ihren Zugang gelten, sehen Sie, bevor Sie sie nutzen.“ | `:2493` | Kern `domain.py:390` (`reserve`), `:468` (`settle`) | keine Route, keine Oberfläche; `config/selfservice-policy.json`: `paid_suite_price_status` = `product_finance_decision_required_no_price_invented` | fehlt (Kern im Repository) | Entscheidung des Inhabers (Stufen und Preise, S1), dann bauen (M, S14) |
| S7 | „Ihr Zugang gilt für Ihren Arbeitsbereich. Er gibt keinen Zugriff auf Projekte anderer Kunden oder auf die Agentur.“ | `:2519` | Sitzungs- und Mitgliedschaftsprüfung (Lücke G19, `config/acceptance-coverage.json:4595`); `apps/web/proxy.ts` | geschützte Seiten liefern eine Hülle ohne Daten; geschützte `/api/`-Pfade 401; ein Arbeitsbereich, an dem die Trennung messbar wäre, existiert nicht | Hülle | bauen (L, S5); Text bleibt richtig, sobald es den Bereich gibt |
| S8 | „Ein Konto allein öffnet noch keinen Arbeitsbereich: Er wird nach Ihrer Bestätigung aktiviert.“ | `:2519` | Kern `domain.py:256` (`activate_workspace`); ausgelieferte Registrierung `apps/shop-api/shop/accounts_api.py:118` | Die ausgelieferte Registrierung kennt weder E-Mail-Bestätigung noch Aktivierung: Sie legt das Konto an und beginnt sofort eine Sitzung (`accounts_api.py:118-136`) | fehlt (Kern im Repository) | bauen (M, S7) oder Text anpassen: `sections[nex2fly-customer-4].body`; `page-faq.ts:21` („Ein Konto allein aktiviert noch keinen Produktzugang …“) |
| S9 | „Beschreiben Sie Ihr Vorhaben über das Kontaktformular. … Sie erhalten eine Vorgangsnummer; die Anfrage ist noch keine Beauftragung.“ | `apps/web/lib/page-faq.ts:28` (auf jeder Seite mit dem Block „Acht Fragen“) | `ContactRequestForm.tsx:48` → `POST /api/requests` (`apps/shop-api/shop/requests_api.py:58`) | `GET /api/requests` 503 `payment_mode_unbound`; Versand nicht geprüft; laut Code dieselbe Abweisung für `POST` | Hülle | Bindung (L); Kernweg für Anfragen |

Nicht eingeordnet: „Die Suite ist ein eigenes Produkt. Einen Agenturauftrag brauchen Sie dafür nicht.“ (Produktaussage ohne Funktion). „… die Tarife stehen noch zur Freigabe.“ (`page-faq.ts:27`) stimmt mit `config/selfservice-policy.json` überein; eine Freigabe von Suite-Tarifen ist nicht belegt.

### 3.2 `/registrieren`

Die Seite rendert nur das Kontoformular (`apps/web/app/registrieren/[[...sign-up]]/page.tsx`, `AuthForms`). Die beiden Abschnitte aus dem Seitenplan (`sections[signup-customer-1]`, `sections[signup-customer-2]`) stehen **nicht** im sichtbaren Text der Seite (0 Treffer), aber im eingebetteten Seitenkatalog jeder der zwölf abgerufenen Seiten (je 1 Treffer im HTML). Sichtbar aus dem Seitenplan sind Titel und Zusammenfassung: als Browsertitel, Meta-Beschreibung, Navigationseintrag „NeX AIFly Suite. In Ruhe testen.“ und als Karte auf `/produkte/nex2fly`.

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| R1 | „Erstellen Sie Ihr Konto und lernen Sie Ihren eigenen KI-Arbeitsbereich kennen.“ / Schalter „Konto erstellen“ / „Ihr Zugang zu persönlichen Vorgängen, Unterlagen und Shop-Bestellungen.“ | `:4625` `pages[signup].summary`, `:4687` `metadata.description`; `AuthForms.tsx:77`, `:84` | `AuthForms.tsx:55` → `POST /api/auth/register` (`accounts_api.py:118`); danach `/portal/kunde` (`AuthForms.tsx:37`) | `GET /api/auth/register` 503; Versand nicht geprüft; Ziel `/portal/kunde` ist Hülle, `/api/portal/overview` 404 | Hülle | Bindung (L), danach `/api/portal/*` ausliefern, aber erst nach den Voraussetzungen aus F3; bis dahin Text anpassen: `pages[signup].title`, `.summary`, `.metadata` |
| R2 | Schalter „Mit Google anmelden“ | `AuthForms.tsx:24-28`, `:85` | Weiterleitung an `auth.emergentagent.com` (`AuthForms.tsx:26`), dann `POST /api/auth/google/session` (`accounts_api.py:197`) | Zielroute im Shop-Dienst 503 (Abweisung vor jeder Route); der fremde Anmeldedienst wurde nicht aufgerufen | Hülle | Entscheidung des Inhabers: Ist dieser Dritte als Anmeldedienst gewollt und in den Datenschutzangaben geführt? (OFFEN, hier nicht geprüft); sonst Schalter ausblenden (S, Produktcode) |
| R3 | „Der einmalige Test beginnt nach bestätigter E-Mail und aktiviertem Arbeitsbereich – und erst auf Ihre ausdrückliche Wahl. Er läuft 24 Stunden. Weitere Anmeldungen setzen die Frist nicht zurück.“ | `:4641` `sections[signup-customer-1].body` (nicht sichtbar, im Seitenkatalog ausgeliefert) | Kern `domain.py:230` (`register`), `:256`, `:350`; Richtlinie `config/selfservice-policy.json` (`registration.email_verification_required` true) | ausgelieferte Registrierung ohne E-Mail-Bestätigung (`accounts_api.py:118-136`); Kern ohne Route | fehlt (Kern im Repository) | bauen (M bis L, S7 und S10) oder Text anpassen: `sections[signup-customer-1]` |
| R4 | „Im Test ist kein kostenloses Modellguthaben enthalten. Sie nutzen einen eigenen Anbieterschlüssel oder einmalig 5 EUR bezahltes Testguthaben. Einen Tarif wählen Sie danach gesondert; am Testende wird nichts automatisch abgebucht.“ | `:4667` `sections[signup-customer-2].body` (nicht sichtbar, im Seitenkatalog ausgeliefert) | Kern `domain.py:274` (`bind_byok`), `:297` (`begin_trial_topup`), `:317`; Zahlungsadapter | Kern ohne Route; kein Zahlungsadapter für die Suite; kein Tresor für Anbieterschlüssel | fehlt (Kern im Repository) | Entscheidung des Inhabers (siehe Hinweis unten), dann bauen (XL, S8) |

Hinweis zu R4 (IST, keine Bewertung): Der Betrag „5 EUR“ steht in `config/selfservice-policy.json` (`trial_topup.amount_cent` 500, Herkunft dort: „explicit_user_instruction_relayed_in_current_task“, Stand der Richtlinie 26.10.2026). In `config/fakten.json` und `config/api-prepaid.json`, den nach `AGENTS.md` einzigen Quellen für Angaben mit Preisbezug, kommt er nicht vor (0 Treffer). Dieselbe Richtlinie nennt als Voraussetzung eine freigegebene Preis-, Steuer- und Rechnungsfassung und führt den Befund `SS-LEGAL-PAYMENTS` als offen. Eine Freigabe dieser Preisangabe für die Veröffentlichung ist damit **nicht belegt**.

### 3.3 `/anmelden`

Auch hier rendert die Seite nur das Formular; die Abschnitte `sections[login-customer-1]` und `sections[login-customer-2]` sind nicht sichtbar, aber im Seitenkatalog ausgeliefert.

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| A1 | „Melden Sie sich an, um in Ihren Bereich zu gelangen: Projekt, NeX AIFly Suite oder Partnerbereich.“ / Schalter „Anmelden“ | `:4467` `pages[login].summary`, `:4529`; `AuthForms.tsx:84` | `AuthForms.tsx:54` → `POST /api/auth/login` (`accounts_api.py:139`); Ziel `/portal/kunde` oder `/intern/leitstand` (`AuthForms.tsx:37`) | `GET /api/auth/login` 503; `/api/portal/overview` 404; keiner der drei genannten Bereiche hat Daten | Hülle | Bindung (L); danach S13 und S5; bis dahin Text anpassen: `pages[login].summary`, `.metadata.description` |
| A2 | „Passwort vergessen?“ / „Link anfordern“ | `AuthForms.tsx:89`, `:84` | `AuthForms.tsx:56` → `POST /api/auth/forgot-password` (`accounts_api.py:170`) | `/passwort-vergessen` 200; Dienst weist jede nicht lesende Anfrage mit 503 ab (`vercel_app.py:268-269`); Versand nicht geprüft | Hülle | Bindung (L) |
| A3 | „Nach der Anmeldung sehen Sie, was zu Ihrem Zugang gehört. Bereiche anderer Kunden und Partner bleiben für Sie geschlossen – und Ihrer für andere.“ | `:4483` `sections[login-customer-1].body` (nicht sichtbar) | wie S7 | wie S7 | Hülle | bauen (L, S5) |
| A4 | „Eine neue Anmeldung startet oder verlängert keinen laufenden Suite-Test.“ | `:4509` `sections[login-customer-2].body` (nicht sichtbar) | wie S2 | Es gibt keinen Suite-Test, der laufen könnte | fehlt (Kern im Repository) | wie S2 |

### 3.4 `/preise-ablauf` (im Auftrag als `/preise` genannt)

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| P1 | „Beschreiben Sie Ihr Vorhaben über das Kontaktformular. … Sie erhalten eine Vorgangsnummer …“ | `apps/web/lib/page-faq.ts:28` | wie S9 | wie S9 | Hülle | Bindung (L) |

Die übrigen Aussagen der Seite beschreiben das Vorgehen der Agentur (Angebot vor dem Start, drei Kostenarten) und nennen keine Software-Funktion. Sie enthalten keine Zahl. Die Schalter „Angebot anfragen“ und „Terminwunsch nennen“ (`pages[pricing].next_actions[2]`, `[3]`, Typ `chat`) öffnen das Gespräch mit dem KI-Assistenten; ob es antwortet, wurde nicht gemessen (Abschnitt 7). Die Karte zur Suite wiederholt S2.

### 3.5 `/leistungen`

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| L1 | „Beschreiben Sie Ihr Vorhaben über das Kontaktformular. … Sie erhalten eine Vorgangsnummer …“ | `apps/web/lib/page-faq.ts:28` | wie S9 | wie S9 | Hülle | Bindung (L) |

„Wir bauen Apps, Portale und Schnittstellen …“ (`:587`) und die drei Pakete sind Agenturleistungen und hier nicht eingeordnet.

### 3.6 Startseite `/`

Quelle ist `config/home-concept-copy.json`.

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| H1 | „NeX AIFly Suite – Ihr eigener Arbeitsbereich für Gespräche, Aufgaben, Dokumente und Projektwissen.“ | `home-concept-copy.json:121` (`de.products[0][1]`) | wie S1 | wie S1 | Hülle | wie S1; Schlüssel `products[0][1]` in allen vier Sprachen |
| H2 | „TEILEKLAR zeigt als eigene Produktwelt, wie Fahrzeug, Teil, Passung und Werkstatt in einem verständlichen Anfrageweg zusammenkommen.“ | `home-concept-copy.json:20` (`de.galleryBodies[2]`) | Sortiment, Werkstattsuche, Anfrage an eine Werkstatt (`apps/shop-api/shop/catalog_api.py`, `workshops_api.py`) | `/api/shop/products` 503, `/api/workshops/search` 503 | Hülle | Bindung (L) |

Nicht geprüft: „NeXify API – KI-Funktionen von NeXify in Ihrer eigenen Anwendung, genutzt über ein Guthaben.“ (`:131`, `de.products[2][1]`); die Seite `/produkte/api` liegt außerhalb des Umfangs. Die Schalter „Vorhaben schildern“ öffnen das Gespräch mit dem KI-Assistenten (nicht gemessen).

### 3.7 `/teileklar`

Die Seite rendert das Schaufenster (`apps/web/components/shop/Storefront.tsx`), nicht die Abschnitte des Seitenplans.

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| T1 | „Vom praktischen Zubehör bis zur Pflege: Entdecken Sie unser Sortiment. Mit Originalfotos, nachvollziehbaren Preisen und klaren Produktangaben.“ / „Artikel im Schaufenster“ | `Storefront.tsx:21`; `:4784` `pages[tk-home].summary` | `apps/shop-api/shop/catalog_api.py:58-90` | `/api/shop/status`, `/products`, `/categories` 503; Browser: „Sortiment momentan nicht erreichbar“, „Das Sortiment konnte nicht geladen werden.“ | Hülle | Bindung (L) |
| T2 | „Sichere Zahlungsseite · Bezahlung über Revolut“ / „So bestellen Sie: … Bestellung bestätigen und sicher bezahlen“ | `Storefront.tsx:25`, `:28` | `cart_api.py`, `checkout_api.py:139`, `revolut.py` | `/api/shop/cart` 503; Zahlungsart in der Produktion nicht gesetzt (Grund `payment_mode_unbound`) | Hülle | Bindung (L) und Entscheidung des Inhabers zur Zahlungsart; ob die Zahlungs- und Kaufaussagen freigegeben sind, ist nicht belegt (`/teileklar/rechtliches`: „vollständige Freigabe steht aus“) |

### 3.8 `/teileklar/werkstatt`

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| W1 | „Suchen Sie nach PLZ oder Ort. Die Liste zeigt Betriebe aus einem Werkstattverzeichnis, sortiert nach Entfernung (Luftlinie).“ / Schalter „Werkstätten suchen“ | `apps/web/app/teileklar/werkstatt/page.tsx:8`; `:6527` `pages[tk-workshop].summary` | `WorkshopFinder.tsx:18` → `GET /api/workshops/search` (`workshops_api.py:69`) | 503; Browser mit `?q=Venlo&umkreis=25`: „Die Suche konnte nicht ausgeführt werden.“ | Hülle | Bindung (L); danach Werkstattdaten belegen (M, W2) |
| W2 | Navigationseintrag „Werkstattprofile“ | `apps/web/components/SiteNavigation.tsx:17` | `apps/web/app/teileklar/werkstatt/[id]/page.tsx`, `workshops_api.py:86` | ohne Suchergebnis ist kein Profil erreichbar; Dienst 503 | Hülle | Bindung (L) |

Zutreffend und unverändert zu lassen: „Es handelt sich um Verzeichnisbetriebe, nicht um TEILEKLAR-Partner.“ (`WorkshopFinder.tsx:32`).

### 3.9 `/teileklar/termine`

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| TE1 | „Sie finden eine Werkstatt in Ihrer Nähe und vereinbaren den Termin direkt …“ / Schalter „Werkstatt finden“ | `:6045` `pages[tk-appointments].summary` | wie W1 | wie W1 | Hülle | Bindung (L) |
| TE2 | „… oder nennen uns Ihren Wunsch.“ / Formular „Anfrage senden“ | `:6045`; `ContactRequestForm.tsx` | wie S9 | wie S9 | Hülle | Bindung (L) |

Der Hinweisbaustein `apps/web/components/shop/PhaseNotice.tsx` ist auf der Seite nicht ausgeliefert (im Browser kein Element `phase-notice-*`); die Absage steht in Titel und Zusammenfassung.

### 3.10 `/teileklar/partner-werden`

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| PW1 | „Stellen Sie Ihren Betrieb vor – wir besprechen, wie eine Zusammenarbeit aussieht.“ / Formular „Als Partnerwerkstatt anfragen“ | `:6363` `pages[tk-partner].summary`; `ContactRequestForm.tsx:62` | wie S9 (`kind: partner`) | wie S9 | Hülle | Bindung (L) |
| PW2 | „Der Kunde bringt das geprüfte Teil. Sie bekommen den passenden Auftrag. … Werkstätten erhalten verständlich vorbereitete Anfragen …“ | `apps/web/components/shop/PartnerJourney.tsx:26` | `workshops_api.py:103` (Anfrage an eine Werkstatt) | Dienst 503; die Route speichert die Anfrage und bestätigt nur dem Anfragenden, die Werkstatt wird nicht benachrichtigt (`workshops_api.py:120-127`) | Hülle | bauen (M, W5) und Text anpassen: `PartnerJourney.tsx:26` (Text steht in der Komponente, nicht im Seitenplan) |
| PW3 | „Aufträge vollständig erhalten – Fahrzeug, geprüftes Teil, Kontaktdaten und offene Fragen kommen gebündelt in der Partnerfläche an.“ | `PartnerJourney.tsx:10` | Partnerfläche; nichts gebaut | – | fehlt | bauen (L, W7) oder Text anpassen |
| PW4 | „Geschütztes Partnerportal – Ein Arbeitsplatz für den Werkstattalltag. Das Portal ist nach Anmeldung und bestätigter Partnerschaft erreichbar.“ / Schalter „Partnerzugang“ | `PartnerJourney.tsx:31` | `/teileklar/partnerportal`; Rolle „partner“ | 200, allgemeine Hülle „Melden Sie sich an …“; im Shop-Dienst gibt es keine Rolle „partner“ (nur die Anfrageart, `requests_api.py:67`) | Hülle | bauen (L, W7) oder Text anpassen |
| PW5 | „Termine – Anfragen annehmen, verschieben oder ablehnen – mit Fahrzeug und Anliegen an einer Stelle.“ | `PartnerJourney.tsx:14` | nichts gebaut | – | fehlt | bauen (L, W6) oder Text anpassen |
| PW6 | „Gutscheine – Bestellungen und Einlösungen nachvollziehen, ohne Listen oder parallele Nachrichten.“ | `PartnerJourney.tsx:15` | nichts gebaut | widerspricht `/teileklar/gutscheine` („Gutscheine gibt es noch nicht.“) | fehlt | Text anpassen |
| PW7 | „Profil & Landingpage – Leistungen, Öffnungszeiten und Ansprechpartner pflegen; daraus entsteht der öffentliche Werkstattauftritt.“ | `PartnerJourney.tsx:16` | nichts gebaut | – | fehlt | bauen (L, W8) oder Text anpassen |
| PW8 | „Abrechnung – Vereinbarte Leistungen und fällige Abrechnungen transparent im Blick behalten.“ | `PartnerJourney.tsx:17` | nichts gebaut; Partnervertrag fehlt (OA-086) | – | fehlt | Entscheidung des Inhabers (W3), bis dahin Text anpassen |
| PW9 | „Dokumente – Partnerunterlagen, Vereinbarungen und freigegebene Vorlagen zentral abrufen.“ | `PartnerJourney.tsx:18` | nichts gebaut | – | fehlt | Text anpassen |
| PW10 | „Zusatzleistungen – Weitere Leistungen gezielt beauftragen, sobald Umfang und Preis bestätigt sind.“ | `PartnerJourney.tsx:19` | nichts gebaut | – | fehlt | Text anpassen |

Zutreffend: „Partner wird Ihr Betrieb mit einer Vereinbarung, nicht schon durch einen Eintrag im Verzeichnis.“ und „Wie Anfragen ankommen, wie Sie zusagen und was abgerechnet wird, legen wir vor dem ersten Auftrag gemeinsam fest.“ (`:6403`). Der zweite Satz steht im Widerspruch zu PW3 bis PW10, die den Ablauf als vorhanden beschreiben.

### 3.11 `/teileklar/gutscheine`

| Nr. | Aussage (wörtlich) | Fundstelle | Müsste erfüllen | Messung | Einordnung | Empfohlene Folge |
|---|---|---|---|---|---|---|
| G1 | „Wenn Sie eine Frage zu einem Gutschein haben, schreiben Sie uns.“ / Formular „Anfrage senden“ | `:6199` `pages[tk-vouchers].summary`; `ContactRequestForm.tsx` | wie S9 | wie S9 | Hülle | Bindung (L) |

## 4. Zählung

| Seite | nutzbar | Hülle | fehlt |
|---|---|---|---|
| `/produkte/nex2fly` | 0 | 3 | 6 |
| `/registrieren` | 0 | 2 | 2 |
| `/anmelden` | 0 | 3 | 1 |
| `/preise-ablauf` | 0 | 1 | 0 |
| `/leistungen` | 0 | 1 | 0 |
| `/` | 0 | 2 | 0 |
| `/teileklar` | 0 | 2 | 0 |
| `/teileklar/werkstatt` | 0 | 2 | 0 |
| `/teileklar/termine` | 0 | 2 | 0 |
| `/teileklar/partner-werden` | 0 | 3 | 7 |
| `/teileklar/gutscheine` | 0 | 1 | 0 |
| **Summe (38)** | **0** | **22** | **16** |

Dazu, nicht in der Summe:

- **Zwei Aussagen verneinen eine Funktion und stimmen** (IST): „Online-Terminbuchung gibt es bei TEILEKLAR noch nicht.“ (`:6045`) und „Bei TEILEKLAR können Sie zurzeit keine Gutscheine kaufen oder einlösen.“ (`:6199`). Für beides gibt es keinen Code.
- **Eine Funktion ist nicht gemessen:** das Gespräch mit dem KI-Assistenten (Abschnitt 7).
- Mehrere Zeilen meinen dieselbe Funktion (S9, P1, L1, TE2, PW1, G1 sind ein Anfrageweg; S1 und H1 ein Arbeitsbereich). Gezählt ist je Aussage und Seite, weil jede Stelle einzeln angepasst werden müsste. Nach Funktionen gezählt sind es 10 Hüllen (Anfrageweg, Registrierung, Anmeldung, Google-Anmeldung, Passwort-Rücksetzung, Kundenbereich, Trennung der Bereiche, Sortiment und Bestellung, Werkstattsuche mit Profil und Anfrage, Partnerportal-Zugang) und 14 fehlende Funktionen (Testphase, Aufgaben, Quellen und Mitarbeitende, Werkzeuge, Modellbudget, Bestätigung und Aktivierung, Anbieterschlüssel und Testguthaben, Auftragseingang der Partnerfläche, sechs Portalfunktionen).

Von den 22 Hüllen hängen 15 unmittelbar an der Bindung des Shop-Dienstes (ANNAHME aus dem Code; belegt ist es erst nach der Bindung, und ein funktionierender Mailversand ist je Aussage gesondert nachzuweisen). Sieben bleiben auch danach Hülle: S1 und H1 (kein Suite-Arbeitsbereich), S7 und A3 (keine Sitzungs- und Mitgliedschaftsprüfung), PW4 (keine Rolle „partner“), PW2 (die Werkstatt wird nicht benachrichtigt) und T2 (die Bezahlung braucht zusätzlich den Händlerschlüssel und einen eingerichteten Webhook bei Revolut, `apps/shop-api/shop/revolut.py:25-28`, `:46-58`; nutzbar erst nach einem freigegebenen Sandbox-Durchlauf mit zurückgelesenem Webhook). R1 und A1 führen nach der Bindung zwar zu einem Konto, aber in einen Kundenbereich ohne Daten, solange `/api/portal/*` nicht ausgeliefert wird.

## 5. Aussagen, die heute nicht stimmen, nach Schwere

Schwere ist ANNAHME: zuerst, was ein Besucher als Zusage versteht und sofort ausprobieren kann.

1. **Suite-Test über 24 Stunden** (S2, R3, A4): „Lernen Sie die Suite in einem Test über 24 Stunden kennen.“ Fundstellen `config/site-map.json:2425`, `:2493`, `:4625`, `:4641`. Es gibt keinen Test, den man starten könnte; die Aussage steht auf der Produktseite, im Titel und in der Beschreibung von `/registrieren`, in der Navigation und auf Karten anderer Seiten.
2. **Konto erstellen und anmelden** (R1, A1, A2, R2): „Erstellen Sie Ihr Konto …“, „Melden Sie sich an, um in Ihren Bereich zu gelangen: Projekt, NeX AIFly Suite oder Partnerbereich.“ Fundstellen `:4625`, `:4467`, `apps/web/components/shop/AuthForms.tsx:77-85`. Beide Formulare sind ausgeliefert, der Dienst dahinter antwortet mit 503; keiner der drei genannten Bereiche existiert mit Daten.
3. **Anfrage mit Vorgangsnummer** (S9, P1, L1, TE2, PW1, G1): „Sie erhalten eine Vorgangsnummer“. Fundstelle `apps/web/lib/page-faq.ts:28`. Der Anfragedienst antwortet mit 503. Das Formular sagt das im Fehlerfall offen und bietet E-Mail an, aber die Zusage steht auf jeder Seite mit dem Fragenblock. Ob ein Versand ankommt, ist nicht gemessen (OFFEN).
4. **Partnerportal mit sechs Funktionen** (PW3 bis PW10): „Ein Arbeitsplatz für den Werkstattalltag. Das Portal ist nach Anmeldung und bestätigter Partnerschaft erreichbar.“ Fundstelle `apps/web/components/shop/PartnerJourney.tsx:10-31`. Nichts davon ist gebaut; PW6 widerspricht der eigenen Gutscheinseite.
5. **Arbeitsbereich der Suite** (S1, H1, S3, S4, S5): „Gespräche, Aufgaben, Dokumente und Projektwissen an einem Ort – in Ihrem eigenen Bereich.“ Fundstellen `config/site-map.json:2425`, `:2441`, `:2467`, `config/home-concept-copy.json:121`. Es gibt eine Hülle mit Anmeldehinweis, keine Aufgaben, kein Projektwissen, keine Werkzeuge.
6. **Werkstattsuche** (W1, W2, TE1): „Die Liste zeigt Betriebe aus einem Werkstattverzeichnis, sortiert nach Entfernung.“ Fundstellen `:6527`, `apps/web/app/teileklar/werkstatt/page.tsx:8`. Die Suche endet mit „Die Suche konnte nicht ausgeführt werden.“
7. **Sortiment und Bezahlung** (T1, T2): „Entdecken Sie unser Sortiment.“, „Bezahlung über Revolut“. Fundstellen `apps/web/components/shop/Storefront.tsx:21`, `:25`. Die Seite zeigt den Ausfall selbst an.
8. **E-Mail-Bestätigung, Aktivierung, eigener Anbieterschlüssel, Testguthaben, Modellbudget** (S6, S8, R4): Fundstellen `:2493`, `:2519`, `:4667`. Kern im Repository, keine Route. R4 nennt zusätzlich einen Betrag, dessen Freigabe zur Veröffentlichung nicht belegt ist.
9. **Werkstatt bekommt den Auftrag** (PW2): `PartnerJourney.tsx:26`. Auch im Code wird die Werkstatt nicht benachrichtigt.

## 6. Die drei wirksamsten Folgeaufträge

**F1 · Shop-Dienst in der Produktion binden (Entscheidung und Zugang: Inhaber; Ausführung danach: Agent).** Betrifft 15 der 22 Hüllen; nutzbar ist jede erst nach eigenem Nachweis. Umfang ist allein das Ende der 503-Abweisung. Betroffen: keine Datei (Variablen im Vercel-Projekt, Datenbank nach D-013, Zahlungsart). Die Auslieferung von `/api/portal/*` gehört **nicht** hierher, sondern zu F3 und dessen Voraussetzungen. Die Bezahlung (T2) ist ein eigener, gesperrter Schritt: Händlerschlüssel und Webhook bei Revolut, Nachweis durch einen vom Inhaber freigegebenen Sandbox-Durchlauf. Fertig, wenn `/api/shop/status`, `/api/workshops/search?q=Venlo` und `/api/auth/me` (ohne Sitzung 401) nicht mehr 503 liefern und eine vom Inhaber freigegebene Testanfrage eine Vorgangsnummer erhält (Paket J-5). OFFEN: Der Dienst verlangt heute MongoDB (`vercel_app.py:199-202`), das Zielbild ist PostgreSQL (D-013); welche Datenbank für die Zwischenzeit gilt, entscheidet der Inhaber.

**F2 · Texte an den heutigen Stand anpassen (Agent sofort, Freigabe: Inhaber), nach `nexify-seitentexte`.** Behebt die Punkte 1, 4, 5 und 8 aus Abschnitt 5 ohne neuen Code. Betroffen: `config/site-map.json` (`pages[nex2fly]`: `summary`, `metadata.description`, `sections[nex2fly-customer-1..4]`; `pages[signup]`: `title`, `summary`, `metadata`, `sections[signup-customer-1..2]`; `pages[login]`: `summary`, `metadata.description`, `sections[login-customer-2]`), `config/home-concept-copy.json` (`products[0][1]`), `apps/web/lib/page-faq.ts:21` und `:28`, jeweils in vier Sprachen; dazu `apps/web/components/shop/PartnerJourney.tsx:8-31` (Text in der Komponente, deshalb Produktcode und zusätzlich `nexify-klon-fabrik`). `config/site-map.json` ist mehrfach gebunden (`nexify-belege-und-pins`). Vorher zu entscheiden (Inhaber): Soll die Suite bis zum Bau als „in Vorbereitung, Anfrage möglich“ auftreten, und bleibt der Betrag aus R4 im ausgelieferten Seitenkatalog? Dieser Auftrag formuliert die Texte; dieses Dokument tut das ausdrücklich nicht.

**F3 · Kundenbereich der Suite als erste nutzbare Stufe (Agent, hinter Schalter; Entscheidungen S1 beim Inhaber).** Macht aus S1, S7, R1 und A1 eine nutzbare Funktion. Betroffen: `apps/web/components/PortalWorkspace.tsx`, `apps/web/app/[...slug]/page.tsx`, `apps/web/proxy.ts`, `apps/web/auth/policy.ts` (Sitzungs- und Mitgliedschaftsprüfung, Lücke G19), `apps/shop-api/shop/nexify_api.py`; für die Testphase ein HTTP-Zugang zu `apps/selfservice/domain.py` samt Speicheradapter. Hängt an PR 118 (OA-040) und an F1. Voraussetzungen, bevor `/api/portal/*` ausgeliefert wird (IST aus dem Code am Stand `2b8da63`): (a) Die Registrierung beginnt ohne E-Mail-Bestätigung eine Sitzung, und `nexify_api.py:203-206` liefert Anfragen allein anhand der E-Mail-Adresse aus; wer sich mit einer fremden, noch nicht registrierten Adresse anmeldet, könnte deren Anfragen lesen. Erst E-Mail-Bestätigung (S7), dann Portal. (b) `nexify_api.py:28` trägt einen Tarifentwurf als feste Werte, den `/api/portal/subscription` ausgeben würde; eine Freigabe ist nicht belegt, die Route bleibt gesperrt oder liest aus der freigegebenen Preisquelle. (c) Die Portalrouten schreiben in Sammlungen, die `vercel_app.py:36-40` (`COLLECTIONS`) nicht kennt; `check_metadata` (`vercel_app.py:136-142`) meldet dann `namespace_schema_unbound` und der ganze Dienst antwortet wieder mit 503. Schema, Indizes und Adaptertests je Sammlung gehören in den Plan. (d) Mandantentrennung verlangt nach `AGENTS.md` („Sicherheit: Mandantentrennung per RLS“) RLS in der Datenbank; Rollenprüfungen in der Anwendung über MongoDB genügen dafür nicht. S7 gilt erst als nutzbar mit PostgreSQL-Speicherweg, RLS-Regeln und Negativtests über Mandantengrenzen. Umfang XL; erster Schnitt (ANNAHME): Anmeldung führt in einen Bereich, der die eigenen Anfragen zeigt, erlaubter und verbotener Fall je Rolle getestet.

Nicht unter den drei, aber klein und eigenständig: Entscheidung zum Schalter „Mit Google anmelden“ (R2) und Benachrichtigung der Werkstatt hinter Schalter (PW2, Paket J-6).

## 7. Nicht geprüft

- **Kein Formular abgeschickt, kein Konto angelegt.** Dass `POST` an `/api/requests`, `/api/auth/register`, `/api/auth/login` und `/api/auth/forgot-password` mit 503 endet, folgt aus dem Code (`vercel_app.py:268-269`) und der Messung per `GET`, ist aber nicht gemessen.
- **Das Gespräch mit dem KI-Assistenten:** `/api/chat` nicht aufgerufen (jeder Aufruf kostet einen bezahlten Modellaufruf). `/api/agent-chat` ist laut Code eine modellfreie Vorschau (`apps/web/app/api/agent-chat/route.ts:1`) und wurde ebenfalls nicht aufgerufen, weil der Auftrag nur `GET` erlaubte; eine spätere Funktionsprüfung dieser Route ist ohne Modellkosten möglich. Gemessen ist bei beiden nur, dass die Routen existieren (405 auf `GET`). Alle Schalter vom Typ `chat` („Vorhaben schildern“, „Angebot anfragen“, „Terminwunsch nennen“, „Frage stellen“) sind deshalb weder als nutzbar noch als Hülle gezählt.
- **Sprachfassungen nl, fr, en:** nicht vollständig geprüft. Stichprobe am Seitenplan: Die Abschnitte von `nex2fly`, `signup` und `login` tragen in allen vier Sprachen dieselben Kernangaben (24 Stunden in `nex2fly-customer-3` und `signup-customer-1`, der Betrag in `signup-customer-2`); eine inhaltliche Abweichung fiel nicht auf. Abweichend von der Vier-Sprachen-Regel: Das Kontoformular (`AuthForms.tsx`), `PartnerJourney.tsx`, `Storefront.tsx` und `WorkshopFinder.tsx` tragen nur deutschen Text in der Komponente; alle `/teileklar`-Seiten werden bewusst nur deutsch ausgeliefert (`apps/web/proxy.ts`), obwohl der Seitenplan dort vier Sprachen führt.
- **Der fremde Anmeldedienst** hinter „Mit Google anmelden“ (`auth.emergentagent.com`): nicht aufgerufen; ob er erreichbar, gewollt und in den Datenschutzangaben geführt ist, ist OFFEN.
- **Angemeldeter Zustand** von `/portal/kunde`, `/teileklar/partnerportal` und `/intern/*`: nur ohne Anmeldung gemessen.
- **Inhalt der Datenbank** (Werkstattdaten, Sortiment, Anfragen): kein Zugang, Dienst 503.
- **Zustellung von E-Mails** (Willkommen, Eingangsbestätigung, Passwort-Link): nicht geprüft.
- **Preise und Rechtstexte:** nicht bewertet. Festgestellt ist nur, wo eine Freigabe nicht belegt ist (Hinweis zu R4, T2).
- **Seiten außerhalb des Umfangs**, auf die die geprüften Seiten verweisen: `/produkte/api`, `/produkte/one`, `/portale`, `/kontakt`, `/leistungsumfang`, `/teileklar/fahrzeug-und-passung` (nur Status 200 gemessen), `/teileklar/rechtliches`, `/teileklar/shop` (nur der Ausfalltext im Browser).
- **PR 118 und PR 123:** nicht gelesen; Aussagen dazu stammen aus dem IST/SOLL-Dokument vom selben Tag.
- **Bestätigung durch den Inhaber** (Abnahmebedingung von OA-039) steht aus; diese Liste ist der Vorschlag dafür.

## 8. Nachtrag 22.11.2026

Berichtigt nach den Befunden der automatischen Reviews am PR 190 (Codex, Copilot), jeder am Code nachgeprüft: Die Aussage zum ausgelieferten Commit ist auf die verglichenen Seitenausgaben begrenzt (Abschnitt 2). T2 zählt nicht mehr zu den Hüllen, die an der Bindung allein hängen (15 statt 16, Abschnitte 1, 4, 6). F1 endet beim Entfernen der 503-Abweisung; die Auslieferung des Portals steht mit vier Voraussetzungen unter F3. `/api/agent-chat` ist getrennt von `/api/chat` beschrieben (Abschnitt 7). Die Zählung 0 / 22 / 16 und alle Messwerte vom 14.11.2026 sind unverändert; es wurde nicht neu gemessen. Zeilennummern gelten für den Stand `2b8da63`; `main` ist seither weitergelaufen.
