# 02 · Onlineshop TEILEKLAR, Werkstatt-Service und Werkstatt-Partner — Bestandsaufnahme

Stand: 14.11.2026 · reine Lesearbeit, keine Änderung am Repository, kein Build, kein Server, kein Commit.
Repository: `/home/user/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`, Zweig `claude/atelier-fehlerbehebung`, HEAD `a4d927e` („zwischenstand … ungeprueft, nicht mergen"). Im selben Verzeichnis arbeiten andere Agenten; Dateistände können sich seit dem Lesen geändert haben.
Live-Proben: 14.11.2026, nur lesende HTTP-GET-Abrufe (keine Formulare abgeschickt, keine Bestellung, keine Anmeldung).
`.env`-Dateien und Zugangsdaten wurden nicht geöffnet.

**Kennzeichnung in diesem Dokument**

| Marke | Bedeutung |
|---|---|
| **IST** | im Code, in einer Datei oder per Abruf am 14.11.2026 belegt (Quelle steht dabei) |
| **SOLL** | Vorgabe des Inhabers (Auftrag vom 14.11.2026 oder ältere dokumentierte Inhaberentscheidung) |
| **LÜCKE** | Abstand zwischen IST und SOLL |
| **ANNAHME** | eigene Schlussfolgerung, nicht belegt, vor Umsetzung zu bestätigen |

Es werden keine Preise, Provisionen, Partnerzahlen oder Zusagen neu gesetzt. Wo Zahlen stehen, sind sie Zitate aus einer genannten Quelle.

---

## 0 · Das Wichtigste vorab

1. **IST:** Der Shop und die Werkstattsuche sind als Code vorhanden (`apps/web` + `apps/shop-api`), die Seiten werden ausgeliefert, **aber die Shop-API antwortet live mit 503**. Damit funktionieren live weder Katalog, Warenkorb, Kasse, Werkstattsuche noch das Partner-Anfrageformular.
2. **IST:** Für Werkstatt-Partner gibt es genau eine Seite (`/teileklar/partner-werden`) mit Ablauftext und einem Anfrageformular. Alles danach (Prüfung, Freischaltung, Partnerrolle, Partnerseite, Portal, Auftragszuordnung, Abrechnung) existiert nur als Prototyp oder Konzepttext.
3. **IST:** Die Aussage „kostenfrei" steht nur in den Prototypen und ist dort mit einer Erfolgsgebühr verbunden. Der Masterplan erklärt genau diese Zahlen für „historisch" und nicht bindend. In `config/fakten.json` gibt es keinen Partner-Fakt. Auf der aktuellen Seite steht dazu nichts.
4. **IST, dringend:** Auf `teileklar.shop` liegt ein alter Prototyp-Stand vom 14.10.2026, öffentlich und indexierbar. Dort stehen die nicht freigegebenen Partnerkonditionen („0 €", „19,90 €") im Klartext.
5. **IST:** Die Mandantentrennung NeXify ↔ TEILEKLAR ist im laufenden Code nicht umgesetzt: eine Adresse, ein Sitzungs-Cookie, eine Datenbank, eine gemeinsame Anfragetabelle.
6. **IST:** Der Begriff „Direktpartner" kommt im Repository nicht vor. Er muss definiert werden, bevor Logik gebaut wird.

---

## 1 · IST: Was existiert wirklich

### 1.1 Anwendungen unter `apps/`

| App | Zweck laut Quelle | Stand |
|---|---|---|
| `apps/web` | Next.js-Oberfläche: NeXify-Seiten, `/teileklar/*`, Portal-Hüllen, Chat/Angebot-API | **wird ausgeliefert** (Vercel-Dienst `frontend`, `vercel.json:9-27`) |
| `apps/shop-api` | FastAPI „TEILEKLAR Shop API": Konten, Katalog, Warenkorb, Kasse, Werkstätten, Admin, Anfragen (`shop/main.py:54`) | **wird ausgeliefert, antwortet 503** (Vercel-Dienst `shop`, `vercel.json:28-43`) |
| `apps/agent-gateway` | lokaler Besucher-Gateway (SQLite), enthält `partner.py` mit Partneranfragen je Tenant | **nur lokal**, laut eigenem README „kein produktiv freigegebener Internetdienst" (`apps/agent-gateway/README.md:3`) |
| `apps/site` | älterer Vite/React-Auftritt | nicht Teil der Vercel-Auslieferung (`vercel.json` baut nur `apps/web` und `apps/shop-api`) |
| `apps/cloud` | eigenständige Next-15-Seite „NeXify AI FACTORY" | kein Shop-/Werkstattbezug, nicht im pnpm-Workspace (`pnpm-workspace.yaml`) |
| `apps/selfservice` | Python-Domänenmodul Selfservice | kein Shop-/Werkstattbezug, kein Adapter (`apps/selfservice/domain.py:1-11`) |

### 1.2 Seiten und Routen

Statusklassen: **A** = Code vorhanden und Seite live abrufbar · **B** = Code vorhanden, aber tot oder ohne Wirkung · **C** = nur Text/Hülle · **D** = nur Konzept/Prototyp.

| Seite | Route | Quelle im Code | Klasse | Befund |
|---|---|---|---|---|
| TEILEKLAR-Start | `/teileklar` | `apps/web/app/teileklar/page.tsx` | A | Seite 200; Katalogdaten kommen aus der API → live leer/Fehler |
| Shop, Suche, Kategorien, Produkt | `/teileklar/shop`, `/suche`, `/kategorien`, `/kategorie/[id]`, `/produkt/[id]` | `apps/web/app/teileklar/*`, `components/shop/*` | A (Seite) / B (Funktion live) | Oberfläche vorhanden; `/api/shop/*` live 503 |
| Warenkorb, Kasse, Bestellung(en) | `/teileklar/warenkorb`, `/kasse`, `/bestellung/[id]`, `/bestellungen` | `components/shop/CartView.tsx`, `Checkout.tsx`, `OrderConfirmation.tsx`, `OrderList.tsx` | A (Seite) / B (Funktion live) | wie oben |
| Shop-Verwaltung | `/teileklar/admin` | `components/shop/AdminShop.tsx`, `AdminOrders.tsx` | A (Seite) / B (Funktion live) | Preise, Import, Bestellungen, Mail-Ausgang; **keine** Werkstatt- oder Partnerverwaltung |
| Werkstattsuche | `/teileklar/werkstatt` | `app/teileklar/werkstatt/page.tsx`, `components/shop/WorkshopFinder.tsx` | A (Seite) / B (Funktion live) | Suche nach PLZ/Ort über `/api/workshops/search`; live 503 |
| Werkstatt-Detail | `/teileklar/werkstatt/[id]` | `components/shop/WorkshopDetail.tsx` | A (Seite) / B (Funktion live) | zeigt jeden Betrieb als „Verzeichnisbetrieb", Hinweis „kein bestätigter TEILEKLAR-Partner" (Zeile 50); Anfrageformular |
| Partner werden | `/teileklar/partner-werden` | `components/shop/PartnerJourney.tsx` + `ContactRequestForm kind="partner"` (`components/PublicExperience.tsx:39`) | A (Seite) / B (Formular live) | drei Ablaufschritte, sechs Portal-Kacheln, Formular → `POST /api/requests`; live 503; `noindex` |
| Termine | `/teileklar/termine` | `components/shop/PhaseNotice.tsx` | C | Hinweis „Online-Terminbuchung noch nicht verfügbar" + allgemeines Kontaktformular |
| Gutscheine | `/teileklar/gutscheine` | `PhaseNotice.tsx` | C | Hinweis „Gutscheine noch nicht verfügbar" |
| Fahrzeug und Passung, Reifenrechner | `/teileklar/fahrzeug-und-passung`, `/reifenrechner` | `FitmentChecklist.tsx`, `TyreCalculator.tsx` | A | Checkliste und Rechner im Browser; Batterie-Berater nur Hinweis |
| Rechtliches TEILEKLAR | `/teileklar/rechtliches` | `components/shop/TeileklarLegal.tsx`, `config/teileklar-legal.json` | A | enthält nur **AGB** und **Widerruf**; kein Partnervertrag, kein AVV |
| Kundenkonto | `/teileklar/konto` | Portal-Hülle (`app/[...slug]/page.tsx:13`) | C | Hülle ohne Daten |
| Partnerportal | `/teileklar/partnerportal` | Portal-Hülle `components/PortalWorkspace.tsx:16,25` | C | Hülle mit Hinweistext; **keine Partnerfunktion, keine Partnerrolle** |
| Nachbarschaftskunden | `/teileklar/nachbarschaft` | Portal-Hülle | C | Hülle |
| Werkstatt-Partnerseite (eigene Seite je Partner) | — | nur `prototypen/Werkstatt-Partnerseite.dc.html` | D | in `apps/web` nicht vorhanden |
| Stadt-/Standortseiten | — | nur Konzept (Masterplan §30.3) und Prototyp | D | keine Route |
| Zweites Partnerformular | — | `components/PartnerRequestForm.tsx` | B (tot) | wird nirgends eingebunden (Suche 14.11.: kein Import); spricht den nur lokalen Gateway `/api/partner/requests` an |
| Standortliste aus dem Prototyp | — | `components/WorkshopDirectory.tsx` | B (vermutlich tot) | wird nur gerendert, wenn die Werkstattseite über den Sammelpfad läuft; die Route hat aber eine eigene Seite. Nicht im Browser geprüft (ANNAHME) |

Live-Probe 14.11.2026 gegen `https://nexify-ai-finales-agentur-gesamtpro-one.vercel.app`:

| Abruf | Antwort |
|---|---|
| `/teileklar`, `/teileklar/shop`, `/teileklar/werkstatt`, `/teileklar/partner-werden`, `/teileklar/partnerportal` | 200, HTML |
| `/api/health`, `/api/workshops/search?q=Aachen` | **503** `runtime_binding_unavailable`, Grund `project_binding_unverified` |
| `/api/shop/catalog/status` | **503**, Grund `payment_mode_unbound` |

ANNAHME zur Ursache: `apps/shop-api/vercel_app.py:23` verlangt fest die Projekt-ID `prj_Po7jlB7srMP6sxyMvf5zIwzXzNyh` (Prüfung Zeile 63–64). `AGENTS.md:7-11` nennt seit 13.11.2026 ein anderes Produktionsprojekt (`…-0c70a665-ut7r`, Team `nexify-projekte`). Passt die ID nicht, bleibt die API auch mit gesetzten Zugängen geschlossen. Die tatsächliche ID des neuen Projekts wurde nicht gelesen.

### 1.3 Schnittstellen (Shop-API)

| Bereich | Endpunkte | Datei | Auf Vercel eingebunden |
|---|---|---|---|
| Konten | `/api/auth/register`, `login`, `logout`, `me`, `forgot-password`, `reset-password`, `google/session` | `shop/accounts_api.py` | ja (`vercel.json:76`, `vercel_app.py:46-47`) |
| Katalog | `/api/shop/catalog/status`, `categories`, `products`, `products/{id}` | `shop/catalog_api.py` | ja |
| Warenkorb | `/api/shop/cart`, `items`, `confirm-changes` | `shop/cart_api.py` | ja |
| Kasse/Bestellung | `checkout/validate-address`, `shipping-options`, `quote`, `orders`, `orders/{id}`, `webhooks/revolut` | `shop/checkout_api.py` | ja |
| Werkstätten | `GET /api/workshops/search`, `GET /api/workshops/{id}`, `POST /api/workshops/{id}/requests` | `shop/workshops_api.py` | ja |
| Anfragen | `POST /api/requests` (Arten: `contact`, `partner`, `project`, `demo`, `integration`, `workshop_partner`, `booking`) | `shop/requests_api.py:26` | ja |
| Admin | Einstellungen, Preisfreigabe, Import, Bestellstatus, Tracking, Mail-Ausgang | `shop/admin_api.py` | ja |
| NeXify-Portal/Betreiber | `/api/portal/*`, `/api/operator/*` (Anfragen-Pipeline, Projekte, Angebote, Rechnungen, Tickets) | `shop/nexify_api.py` | **nein** (nicht in `vercel_app.py:47`, nicht in `vercel.json`-Rewrites) → nur im lokalen Start `shop/main.py:68` |
| Partneranfragen (alt) | `/api/partner/requests` | `apps/agent-gateway/partner.py` | **nein**, nur lokal |

Daneben in `apps/web` (NeXify, nicht TEILEKLAR): `/api/chat`, `/api/offers/[id]`, `/api/offers/[id]/order` — Chat → Angebot → Bestellung → Rechnung → Mail, Speicher Supabase-Schema `chat` (`GO-LIVE.md` §1, §4). Kein Bezug zu Werkstatt oder Shop.

### 1.4 Datenmodelle

**IST (laufender Code, MongoDB — `DECISIONS.md` D-006):** Sammlungen laut `apps/shop-api/vercel_app.py:27-31`: `products, categories, imports, source_manifests, carts, orders, webhook_events, workshops, workshop_requests, users, sessions, login_failures, password_resets, settings, revolut_webhooks, outbox, requests, price_releases`.

| Objekt | Felder / Verhalten | Quelle |
|---|---|---|
| `workshops` | aus `prototypen/assets/workshops.json` importiert; Felder `id, name, street, zip, city, region, tel, web, hours, lat, lon, market`; `directory_entry: true` | `shop/workshops_api.py:16,27-43` |
| Partnerstatus | jede Ausgabe setzt fest `kind_label: "Verzeichnisbetrieb", partner: False` — es gibt **kein** Feld und keinen Weg, einen Betrieb zum Partner zu machen | `shop/workshops_api.py:46-48` |
| `workshop_requests` | Anfrage eines Kunden an einen Betrieb: Name, E-Mail, Telefon, Fahrzeug, Nachricht, Einwilligung, Status „Anfrage gesendet – noch kein Termin" | `shop/workshops_api.py:99-124` |
| `requests` | Anfragen aller Arten, auch Partneranfragen und NeXify-Kontaktanfragen; Vorgangsnummer `NX-…`, `stage: "lead"`, Idempotenzschlüssel | `shop/requests_api.py:57-100` |
| `users` | Rollen nur `customer` und `admin` | `shop/accounts_api.py:41,129`, `DECISIONS.md` D-007 |

Größe des Verzeichnisses: in der Datei liegen **579 Einträge** in 7 Marktblöcken (gezählt 14.11.2026). Die Konzepte nennen andere Zahlen: 6.875 Betriebe/1.104 Orte (`docs/01-konzept/teileklar-shop.md:29,49`), 598 Betriebe im Pilot (`docs/01-konzept/gesamtprojektplan.md:162,181`), Zielmenge 7.120 als „historischer Beschaffungsauftrag, kein nachgewiesener Datensatz- oder Partnerbestand" (Masterplan `docs/masterplan/NeXify-Masterplan-v2-2026-10-29.md:4372`). → **Keine dieser Zahlen ist eine Partnerzahl.**

**Nicht vorhanden (LÜCKE):** Partnerantrag mit Prüfstatus, Partnerprofil, Konditionsfassung, Vertragsannahme, Zuordnung Nutzer ↔ Betrieb, Termin, Gutschein, Abrechnungsposition, Benachrichtigung an den Betrieb.

**Nur Konzept:** `config/mandanten.json` (Stand 28.09.2026) beschreibt ein Postgres-Modell mit `mandant_id` und Zeilenschutz, darin `workshop` und `workshop_job` als mandantenbezogene Tabellen. `db/foundation/001_foundation.sql` enthält keine Werkstatt- oder Partnertabelle (Suche 14.11.). Der Shop nutzt dieses Modell nicht.

### 1.5 Bestell- und Zahlungswege

| Weg | IST | Quelle |
|---|---|---|
| Shop-Kauf | Warenkorb → Preisangebot serverseitig → `POST /api/shop/orders` (Bedingungen müssen akzeptiert sein, Idempotenz) → Revolut-Bestellung mit Bezahlseite → signierter Webhook → Status „bezahlt" → Bestätigungsmail → Weitergabe an BigBuy | `shop/checkout_api.py:139-201,266-290`, `shop/fulfillment.py`, `shop/bigbuy_order.py` |
| Zahlungsanbieter | Revolut Merchant; Betrieb „live" im Preview laut Inhabervorgabe, kein Sandbox-Schlüssel | `DECISIONS.md` D-008 |
| Lieferant | BigBuy; Stand 31.10.2026: Produktion antwortete „401 Invalid Token", Katalog blieb leer | `DECISIONS.md` D-008 |
| Steuer | **ein** Steuersatz aus der Umgebung (`SHOP_VAT_PERCENT`) für alle Lieferländer DE, AT, NL, BE, LU | `shop/config.py:14`, `shop/checkout_api.py:19` |
| Geschäftskunden | kein eigener Ablauf; Adresse hat weder Firma noch USt-IdNr. | `shop/checkout_api.py:24-32` |
| Partner-Abrechnung | nicht vorhanden | — |
| NeXify-Angebot/Bestellung | eigener Weg über Chat, nur als API, kein Bestellknopf in der Oberfläche | `GO-LIVE.md` §7 |
| Live | alle Shop-Wege 503 (siehe 1.2) | Probe 14.11.2026 |

### 1.6 Domains und Auslieferung

| Adresse | IST 14.11.2026 (GET) | Einordnung |
|---|---|---|
| `nexify-ai-finales-agentur-gesamtpro-one.vercel.app` | Seiten 200, API 503 | laut `AGENTS.md:7-11` die Produktion (Entscheidung 13.11.2026) |
| `www.nexifyai.de/teileklar/partner-werden` | 200, Kopfzeilen `server: cloudflare` und `x-vercel-id`, gleiche Größe wie die Vercel-Seite | weicht vom Befund 13.11. ab (dort: `.de` zeigt nicht auf Vercel, `docs/04-betrieb/befund-2026-11-13.md` Abschnitt 4). Wer umgestellt hat, ist nicht belegt |
| `www.nexifyai.cloud/teileklar` | 404 | anderer Stand (laut Befund 13.11. ChatGPT-Sites) |
| `teileklar.shop` | 200, `last-modified: 14.10.2026`, `x-robots-tag: index, follow`, Titel „Autoteile online kaufen …" | **alter statischer Prototyp-Stand** über Cloudflare, nicht aus diesem Repository-Stand gebaut |
| `teileklar.shop/partner-werden`, `/Partnerportal.dc.html`, `/Werkstatt-Partnerseite.dc.html` | je 200 | Prototypseiten öffentlich, mit „0 €" und „19,90 €" im Text |
| `teileklar.shop/werkstatt` | 404 | — |

Im Code ist TEILEKLAR an die NeXify-Adresse gebunden: `PUBLIC_ORIGIN='https://www.nexifyai.de'` (`apps/web/lib/page-seo.ts:6`), Canonical `https://www.nexifyai.de/teileklar` (`apps/web/app/teileklar/page.tsx:2`). `config/site-map.json` führt `teileklar.shop` nur als „requested_production_domain", Status „user_requested_not_dns_deployment_evidence". Alle TEILEKLAR-Seiten stehen dort auf `implementation_status: planned`, `transactions: not_enabled`, `indexability: noindex,nofollow`.

### 1.7 Mandantengrenze — technisch

**SOLL (Inhaber, Auftrag 14.11.2026):** TEILEKLAR.shop bleibt eigene Shop-Marke mit sicherer Fach-/Mandantentrennung zu NeXify (DSGVO); gemeinsame Komponenten und Tokens sind erlaubt. Dazu `AGENTS.md:174`: „Unterschiedliche Domains, Rollen oder Mandanten nicht durch einen gemeinsamen Cookie oder Clientclaim gleichsetzen."

| Ebene | IST | Quelle | Bewertung |
|---|---|---|---|
| Projekt/Deployment | ein Vercel-Projekt, zwei Dienste, eine Adresse; TEILEKLAR ist ein Unterpfad | `vercel.json` | keine Trennung |
| Domain | Shop läuft unter der NeXify-Adresse; `teileklar.shop` zeigt auf einen Altstand | 1.6 | keine Trennung, zwei widersprüchliche Auftritte |
| Sitzung | ein Cookie `tk_session`, Pfad `/`, gilt für die ganze Adresse; dieselbe Sitzung öffnet die Hülle für Kundenkonto, Partnerportal und `/intern/*` | `shop/accounts_api.py:19,71`, `apps/web/app/[...slug]/page.tsx:13` | genau der Fall, den `AGENTS.md:174` ausschließt |
| Rollen | nur `customer`, `admin`; kein Mandantenfeld am Nutzer | `shop/accounts_api.py:41,129` | keine Partner- oder Mandantenbindung |
| Datenbank | eine MongoDB, ein Namensraum (`nexify_teileklar_shop_v1` geplant) | `vercel_app.py:25`, `DECISIONS.md` D-006 | gemeinsame Ablage |
| Anfragen | NeXify-Kontaktanfragen und TEILEKLAR-Partneranfragen in **einer** Sammlung `requests`, Vorgangsnummer `NX-…`, interne Mail mit Marke „NeXify AI" | `shop/requests_api.py:26,84`, `shop/mail_templates.py:109-112` | fachliche Vermischung |
| NeXify-Betrieb | im lokalen Start liegen Angebote, Rechnungen, Projekte, Tickets, API-Schlüssel der Agentur in derselben Datenbank wie Shop-Bestellungen | `shop/main.py:68`, `shop/nexify_api.py` | Vermischung; auf Vercel derzeit nicht eingebunden |
| NeXify-Chat/Angebot | eigenes Supabase-Schema `chat` | `GO-LIVE.md` §4 | getrennt |
| Mail | ein Absender (`RESEND_FROM`) für beide Marken | `shop/mailer.py:27-31` | keine Trennung |
| Betreiberangabe | Verkäufer laut `config/fakten.json` (`teileklar.verkaeufer`): „NeXify AI (by NeXify), Inhaber Pascal Courbois, Eenmanszaak …, mail@nexifyai.cloud"; Rechtstexte nennen „TEILEKLAR, Graaf van Loonstraat 1E", `mail@teileklar.shop` (`config/teileklar-legal.json`); `config/site-map.json` → `operator_context`: „NeXify AI FACTORY", `legal_register_evidence_status: not_verified_for_BV` | genannt | Betreiberidentität widersprüchlich |
| Zielmodell | Postgres mit `mandant_id` und Zeilenschutz | `config/mandanten.json` | nur Konzept |

**LÜCKE:** Die geforderte Trennung ist heute Beschriftung, keine Technik.

---

## 2 · Das dokumentierte Konzept der „Standard-Landingpages"

### 2.1 Wo es steht

Einen Abschnitt mit genau diesem Titel gibt es nicht (Suche nach „Standard-Landingpage", „Standardseite", „Landingpage" am 14.11.2026). Der Begriff „Landingpage" hat in den Quellen zwei Bedeutungen:

- **Bedeutung 1 — Seite je Partnerbetrieb:** „Landingpage automatisch aus Ihrem Profil erzeugt" (`prototypen/i18n/partnerportal.de.json`, Eintrag 10), „Profil ausfüllen … Daraus entsteht Ihre Landingpage – Sie geben sie frei, bevor sie online geht" (`prototypen/i18n/partner-werden.de.json`, Eintrag 19), Prototyp `Werkstatt-Partnerseite.dc.html`. Im Masterplan: „Die Partnerseite wird aus Profildaten erstellt, vom berechtigten Partner freigegeben und erst danach veröffentlicht" (`docs/masterplan/NeXify-Masterplan-v2-2026-10-29.md:4388`).
- **Bedeutung 2 — feste öffentliche Einstiegsseiten** für Werkstätten und Kunden: `docs/01-konzept/seitenplan-gesamt.md:82-83` (B11 „Werkstatt finden + Werkstatt-Partnerseite", B12 „Partner werden (Werkstatt)"), `docs/SOLL-Beschreibung.md:28,46,56,131-132,156,161`, `docs/09-final/14-gesamtsystem-und-portale.md:9-10`, Masterplan §12.2 (`:3149-3155`), §30.3–30.4 (`:4384-4398`), Seitenbrief `PUB-tk-partner` (`:2707-2760`).

ANNAHME: Der Inhaber meint beide. Vor dem Bau bestätigen lassen.

### 2.2 Seite → Quelle → Status → Lücke

| # | Verlangte Seite | Quelle | Status 14.11.2026 | Lücke |
|---|---|---|---|---|
| 1 | **Partner werden (Werkstatt)** — Nutzen, Konditionen, Ablauf, Anfrage | `SOLL-Beschreibung.md:156`; Seitenbrief `PUB-tk-partner` (Masterplan `:2707-2760`): Abschnitte „Dein Betrieb und deine Leistungen", „Was für eine Zusammenarbeit wichtig ist", „Wie die Aufnahme abläuft", „Partneranfrage vorbereiten" | Seite vorhanden (`/teileklar/partner-werden`), `noindex`; Ablauf in 3 Schritten, Portal-Vorschau, Formular | keine Aussage zu Kosten; Formular live 503; Knopf „Partnerzugang" führt auf die allgemeine Anmeldung ohne Partnerrolle (`PartnerJourney.tsx:31`); keine FAQ; kein Link auf Partnerbedingungen |
| 2 | **Werkstatt finden** — Suche nach PLZ/Ort, Verzeichnis und Partner klar getrennt | `seitenplan-gesamt.md:82`; Masterplan §30.3 | Seite vorhanden (`/teileklar/werkstatt`), als indexierbar markiert (`app/teileklar/werkstatt/page.tsx:5`) | Suche live 503; nur Verzeichnisbetriebe, kein Partner darstellbar |
| 3 | **Werkstatt-Detail** (Verzeichnisbetrieb) mit Anfrage | Masterplan §11.4 Zeile „Werkstatt/Termin" (`:3119`) | vorhanden (`/teileklar/werkstatt/[id]`) | Anfrage wird gespeichert, erreicht den Betrieb aber nicht (siehe 4.2) |
| 4 | **Werkstatt-Partnerseite** — eigene Seite je Partner aus dem Profil, vom Partner freigegeben | `seitenplan-gesamt.md:82`, `SOLL-Beschreibung.md:56`; Masterplan §12.2, §30.3 | **fehlt** in `apps/web`; nur Prototyp (und Altstand auf `teileklar.shop`) | Datenmodell Profil, Freigabe, Veröffentlichung, Vorlage, Route |
| 5 | **Partnerportal** — Profil/Landingpage, Termine, Gutscheine, Abrechnung | `seitenplan-gesamt.md:175-177`, `SOLL-Beschreibung.md:161` | Hülle ohne Funktion | alles; laut Seitenplan fehlten schon im Prototyp: Partnervertrag digital annehmen, Auszahlungsdaten/Gutschriften, Qualitätsrückmeldung, Mitarbeiterzugänge |
| 6 | **Registrierung mit Rolle Werkstatt** | `seitenplan-gesamt.md:143` (C2), `SOLL-Beschreibung.md:132` | `/registrieren` legt nur `customer` an | Rollenwahl, Prüfschritt |
| 7 | **Termine** (Kunde ↔ Werkstatt) | Masterplan §12.2, E-RC02/E-RC03 (`:4471-4479`) | Textseite + Hinweis „noch nicht verfügbar" | gesamter Terminprozess |
| 8 | **Gutscheine / Nachbarschaftskunden** | Masterplan §12.3; `SOLL-Beschreibung.md:135` | Textseite + Hinweis; Portal-Hülle | gesamter Prozess |
| 9 | **Stadt-/Standortseiten** („Home > Standorte > Bundesland > Stadt") mit Suche zum nächsten bestätigten Partner | Masterplan §30.3 (`:4384-4390`); `gesamtprojektplan.md:72` | **fehlt** | Route, Stadt-/Betriebszuordnung, belegte Partnerzahl |
| 10 | **Partnerbedingungen** (Partnervereinbarung, AVV) als Rechtsseite | `seitenplan-gesamt.md:122`; `09-final/14-gesamtsystem-und-portale.md:52` (Entwurf 0.9, Freigabe E12) | `/teileklar/rechtliches` hat nur AGB und Widerruf | Text, Fassung, Freigabe |
| 11 | **Partner-Unterlagen** (Broschüre, Folien, Partnerhandbuch) | `seitenplan-gesamt.md:231`; `14-gesamtsystem…:12` | nur Prototypen | Inhalte mit freigegebenen Konditionen |
| 12 | **Shop-Seiten** (Start, Suche, Produkt, Warenkorb, Kasse, Rechtliches) | Masterplan §11 | Oberfläche vorhanden | Laufzeit (503), Katalog, Betreiberangaben |

---

## 3 · „Kostenfrei für Werkstattbetreiber"

### 3.1 SOLL laut Inhaber

Auftrag 14.11.2026: „Werkstattbetreiber müssen hier direkt erkennen, dass sie unseren Service kostenfrei beanspruchen können."

### 3.2 Wo die Aussage heute belegt ist

| Fundstelle | Wortlaut (Zitat) | Rang der Quelle |
|---|---|---|
| `prototypen/i18n/partner-werden.de.json`, Einträge 7, 10–15 | „keine Fixkosten. Sie zahlen erst, wenn ein zugeführter Kunde tatsächlich bei Ihnen war." · „0 €" „Aufnahmegebühr, Grundgebühr und Kosten für Ihre Landingpage." · „19,90 €" „zzgl. MwSt. je Monat und tatsächlich wahrgenommenem Neukunden." · „7 Tage" Widerspruchsfrist | Prototyp = Referenz, kein Produktionsinhalt (`DECISIONS.md` D-001) |
| ebenda, Eintrag 27 | „Eine eigene, suchmaschinenoptimierte Partnerseite – kostenfrei, solange Sie Partner sind." | Prototyp |
| ebenda, Eintrag 33 | „Mindestlaufzeit je zugeführtem Kunden (Vorschlag: 12 Monate) und Mahnwesen sind noch nicht endgültig entschieden" | Prototyp, ausdrücklich offen |
| `prototypen/i18n/partnerportal.de.json`, Einträge 7, 9, 47 | „Kostenfreie Landingpage …" · „Erfolgsbasiert: 19,90 € nur je zugeführtem Kunden" · „Rechnungen entstehen automatisch am 20., zahlbar innerhalb von 7 Tagen mit 2 % Skonto." | Prototyp |
| `prototypen/i18n/partner-broschuere.de.json`, Einträge 33–39 | „Kostenfrei, ohne Grundgebühr" · „Vermittlungsgebühr je Auftrag" · „Monatlich kündbar" · „Konkrete Sätze … besprechen wir im persönlichen Gespräch." | Prototyp |
| `prototypen/Rechtliches.dc.html:85`, Abschnitt `partner`, „Entwurf 0.9 · 29.09.2026" | „Vergütung: 19,90 € zzgl. MwSt. je zugeführtem und wahrgenommenem Nachbarschaftskunden und Monat … Die Einrichtung (Landingpage, Gutscheinmotive) wird nach Aufwand zum Tagessatz von 449 € netto angeboten." | Prototyp-Rechtsentwurf |
| `teileklar.shop/partner-werden` (live, 14.11.2026) | dieselben Texte „0 €", „19,90 €", „kostenfrei, solange Sie Partner sind" | **öffentlich, indexierbar**, Altstand |

### 3.3 Was dagegen steht

| Fundstelle | Aussage |
|---|---|
| Masterplan §12.5 (`:3183`) | „Historische 7-/14-/30-/90-Tage-Regeln, Mindestauflagen, 10-Prozent-Provisionen, **19,90-EUR-Partnergebühren und Skonto sind keine aktuelle universelle Policy**. Sie müssen je Produkt/Konditionsfassung geklärt werden." |
| Masterplan §12.2 (`:3155`) | „Historische Siebentages-, Abrechnungs-, Skonto-, Mindestlaufzeit- und Gebührenwerte benötigen aktuelle Konditionsbindung, bevor sie produktiv gelten." |
| Masterplan, Seitenbrief `PUB-tk-partner` (`:2709`, Gate-Absatz `:2759`) | Seitenzweck: „Qualifizierte Werkstattpartneranfrage ohne automatische Freischaltung, Vertrags- oder Erlösversprechen." · „Historische Partnerpreise/Provisionen nicht in Kundenfilm übernehmen." |
| `AGENTS.md` (Verbindliche Regeln, MUST) | Zahlen mit Preisbezug nur aus `config/fakten.json`/`config/api-prepaid.json`; keine Preisänderung ohne Freigabe des Inhabers |
| `config/fakten.json` | enthält **keinen** Partner-, Werkstatt- oder Gebührenfakt (geprüft 14.11.; nur `teileklar.verkaeufer`, `teileklar.lieferlaender`) |
| aktuelle Seite `/teileklar/partner-werden` | „Anfragen, Zusagen, Konditionen und Abrechnung werden vor dem ersten Auftrag gemeinsam festgelegt." (`PartnerJourney.tsx:7`) — keine Kostenaussage |
| `docs/01-konzept/nexifyai-organisationshandbuch.md:65,145` | Kriterien der Werkstatt-Freischaltung offen (E-Offen-1) |

**Ergebnis IST:** „Kostenfrei" ist als Geschäftsmodell **nicht freigegeben belegt**. Belegt ist ein älteres Prototyp-Modell „Einstieg und Seite kostenfrei, Zahlung je wahrgenommenem Kunden", das der Masterplan ausdrücklich als ungeklärt führt. Zusätzlich widersprechen sich die Prototypen selbst:

- Landingpage „0 €" (Partner werden) ↔ „Einrichtung … nach Aufwand zum Tagessatz" (Rechtsentwurf 0.9).
- Datenschutzrolle: „NeXifyAI verarbeitet sie als Auftragsverarbeiter nach Art. 28 DSGVO" (`partner-werden.de.json`, Eintrag 51) ↔ „gemeinsam mit NeXify AI verantwortlich" (Rechtsentwurf 0.9).
- Vergütung „je Monat und Neukunde" ↔ „Vermittlungsgebühr je Auftrag" (Broschüre).

**LÜCKE:** Der neue Auftrag „kostenfrei" ist deutlicher als alle Quellen. Offen ist, ob er die Erfolgsgebühr aufhebt oder nur den Einstieg meint.

### 3.4 Wo die Aussage stehen müsste (sobald geklärt)

1. `config/fakten.json` — neue Fakten mit Quelle und Datum (einzige erlaubte Quelle für Preisaussagen).
2. Eine versionierte Konditionsfassung für Partner (Masterplan §12.5 verlangt „Konditionsfassung" am Partnerprofil).
3. `/teileklar/partner-werden` — im Kopfbereich, in der Ablaufstrecke und in der FAQ.
4. Partnervereinbarung und AVV unter `/teileklar/rechtliches` (heute nur AGB und Widerruf).
5. Bestätigungsmail an die Werkstatt, Partner-Broschüre, Texte des Assistenten (dessen Preisliste ist laut `GO-LIVE.md` leer, „weil es keinen freigegebenen Preiskatalog gibt").
6. Werkstatt-Partnerseite (heutiger Prototyp-Satz „kostenfrei für Partnerbetriebe").

### 3.5 Was vorher geklärt sein muss (nur benannt, keine Empfehlung zur Höhe)

| Frage | Warum |
|---|---|
| Was genau ist „unser Service"? (Verzeichniseintrag, eigene Partnerseite, Portal, Vermittlung von Anfragen, Gutscheindruck, Einrichtung) | sonst ist „kostenfrei" nicht prüfbar |
| Gilt kostenfrei vollständig oder nur für Aufnahme/Grundgebühr/Seite? Gibt es eine Erfolgs- oder Vermittlungsgebühr? | Kernwiderspruch der Quellen |
| Wer zahlt dann? (Teileverkauf, Endkunde, spätere Zusatzleistungen der Agentur, niemand) | Geschäftsmodell; im Repository nicht beantwortet |
| Befristung und Bedingungen („solange Sie Partner sind", Mindestlaufzeit, Kündigung, Änderungsvorbehalt) | Werbeaussage muss mit dem Vertrag übereinstimmen |
| Aufnahmekriterien und wer freischaltet | E-Offen-1 |
| Vertragspartner auf Betreiberseite (Eenmanszaak oder B.V.) und anwendbares Recht | Betreiberangaben widersprüchlich (1.7) |
| Datenschutzrolle (Auftragsverarbeitung oder gemeinsame Verantwortung) | Prototypen widersprechen sich |
| Abgrenzung zum Handelsvertreter, Haftung für die Werkstattleistung | im Prototyp behauptet, rechtlich nicht geprüft |
| Rechtstexte (Partnervereinbarung, AVV) und anwaltliche Prüfung | alle Texte „Entwurf 0.9", Freigabe E12 offen (`docs/09-final/08-recht-und-compliance.md:28`) |

---

## 4 · Direktpartner-Logik

### 4.1 Was „gewonnener Direktpartner" laut Quellen heißt

**IST:** Das Wort „Direktpartner" kommt im Repository nicht vor (Suche 14.11.2026 über alle Text- und Codedateien). In Mem und Notion gab es dazu ebenfalls keinen Treffer (siehe Abschnitt 8).

Die Quellen kennen stattdessen drei getrennte Zustände (Masterplan `:4372`): „**Verzeichnisbetrieb, bestätigter Kooperationspartner und veröffentlichte Partnerseite** sind getrennte Zustände." Dazu `docs/contracts/completion-goal-2026-11-01.md:134` (P13): „Verzeichnisbetrieb bleibt ohne Vertrag Nichtpartner." Und `docs/operating-model/NEXIFY-GESAMTSYSTEM.md:53` (D11): „Partneraufnahme oder Provisionsanspruch entsteht nicht durch bloße Anmeldung."

Mögliche Bedeutungen (ANNAHME, eine davon muss der Inhaber bestätigen):

| Lesart | Bedeutung | Folge für die Logik |
|---|---|---|
| A | Werkstatt, die eine Vereinbarung mit TEILEKLAR bestätigt hat — im Gegensatz zum bloßen Verzeichnisbetrieb | Statuswechsel Verzeichnis → Partner, Badge, eigene Seite, Zustellung von Anfragen |
| B | Partner, der direkt gewonnen wurde — im Gegensatz zu einem über Affiliate, Kette oder Agentur zugeführten Partner | zusätzliches Feld „Herkunft/Zuordnung", relevant für Provisionen Dritter |
| C | Werkstatt, die zugleich direkter NeXify-Kunde wird (im Prototyp: „Leistungen direkt beauftragen", „Direktkunden") | Übergabe an den Agentur-Vertrieb, zwei Mandanten berührt |

Dieses Dokument arbeitet unten mit **Lesart A** und führt B als optionales Feld.

### 4.2 Bausteine: vorhanden / fehlt

| Baustein | IST | Quelle | Status |
|---|---|---|---|
| Seite „Partner werden" | vorhanden, ohne Kostenaussage | `PartnerJourney.tsx`, `PublicExperience.tsx:39` | vorhanden, unvollständig |
| Anfrage/Anmeldung als Partner | Formular → `POST /api/requests`, Art `partner`, Pflichtfeld Firma, Einwilligung, Idempotenz, Vorgangsnummer, Ratenbegrenzung | `ContactRequestForm.tsx:11-27`, `shop/requests_api.py:57-100` | Code vorhanden, live 503 |
| Interne Benachrichtigung über die Anfrage | Mail an interne Adresse, Betreff „Partneranfrage …" | `shop/requests_api.py:30-35`, `shop/mail_templates.py:109-112` | Code vorhanden, hängt an Mail-Zugang |
| Bearbeitung der Anfrage (Stufen) | Betreiber-Pipeline mit Stufen | `shop/nexify_api.py:532-553` | Code vorhanden, **auf Vercel nicht eingebunden**; liegt im NeXify-Teil, nicht bei TEILEKLAR |
| Prüfung des Betriebs (Nachweise, Kriterien) | — | Kriterien offen (E-Offen-1) | fehlt, Entscheidung nötig |
| Vertrags-/Konditionsannahme | — | Masterplan §12.5 verlangt Konditionsfassung | fehlt, Entscheidung nötig |
| Partnerstatus am Betrieb | fest `partner: False` | `shop/workshops_api.py:48` | fehlt |
| Partnerkonto/Rolle | nur `customer`/`admin` | `shop/accounts_api.py:41` | fehlt |
| Zuordnung Nutzer ↔ Betrieb | — | — | fehlt |
| Partnerprofil und eigene Seite | — | nur Prototyp | fehlt |
| Portal | Hülle | `PortalWorkspace.tsx` | fehlt |
| Zuordnung Werkstatt ↔ Kunde ↔ Auftrag | `workshop_requests` verbindet Anfrage und Betrieb über `workshop_id`; **kein** Bezug zu Bestellung, Teil oder Kundenkonto | `shop/workshops_api.py:120` | Ansatz vorhanden, unvollständig |
| Zustellung der Kundenanfrage an die Werkstatt | **findet nicht statt**: es geht nur eine Empfangsmail an den Kunden; der Betrieb und die interne Stelle werden nicht informiert; keine Admin-Ansicht | `shop/workshops_api.py:122-124`; Suche nach `workshop_requests` ergibt nur diese Datei | fehlt — siehe Risiko R-3 |
| Termin, Annahme/Ablehnung, „wahrgenommen", Widerspruch | — | Masterplan E-RC02 (`:4471-4474`), E-RC03 (`:4476-4479`) | fehlt |
| Vergütung/Abrechnung | — | — | fehlt, Entscheidung nötig (hängt an 3.5) |
| Benachrichtigungen (Partner, Kunde) | Mail-Ausgang mit Wiederholung und Zustellstatus ist als Baustein da | `shop/mailer.py` | Baustein vorhanden, Partnerereignisse fehlen |
| Alt-Baustein Partneranfragen je Tenant | SQLite-Tabelle `partner_requests` mit Tenant, Rollenprüfung, MFA-Pflicht für Schreiben | `apps/agent-gateway/partner.py` | nur lokal, nicht verdrahtet; als Vorlage für Zugriffsregeln brauchbar |

### 4.3 Vorschlag: durchgängiger Ablauf

Zustände des Partnerprofils nach Masterplan §12.5 (`:3177`): `draft / submitted / in_review / approved / published / suspended`; „Freigabe ist nicht Veröffentlichung."

| Nr. | Schritt | Was geschieht | Status | Was fehlt / Entscheidung |
|---|---|---|---|---|
| 1 | Besucher findet den Einstieg | Suche, Verzeichniseintrag, Stadtseite, Ansprache | **fehlt teilweise** | Seite ist `noindex`; Stadtseiten fehlen; Indexierung braucht gültiges Impressum (Befund 13.11., E-C) |
| 2 | Landingpage „Partner werden" | Nutzen, Ablauf, Kostenaussage, FAQ, Link auf Bedingungen | **vorhanden, unvollständig** | Kostenaussage: **Entscheidung nötig** (3.5) |
| 3 | Anfrage absenden | Betrieb, Ansprechpartner, Kontakt, Leistungen, Einzugsgebiet, Einwilligung | **vorhanden** (Code), live nicht erreichbar | Laufzeit der Shop-API; Felder Leistungen/Standort fehlen im Formular |
| 4 | Eingangsbestätigung an die Werkstatt | Mail mit Vorgangsnummer, ohne Zusage | **fehlt** (Bestätigung nur auf der Seite) | Mailvorlage, TEILEKLAR-Absender |
| 5 | Interne Benachrichtigung und Vorgang | Vorgang im TEILEKLAR-Postfach, Zuständiger | **teilweise** (Mail vorhanden, Pipeline nur im NeXify-Teil und nicht auf Vercel) | eigener TEILEKLAR-Vorgang statt gemeinsamer Tabelle |
| 6 | Abgleich mit dem Verzeichnis | Anfrage einem vorhandenen Betrieb (`TKW-…`) zuordnen oder neu anlegen; Dubletten | **fehlt** | Regeln aus `docs/06-auftraege/werkstatt-verzeichnis.md` §6 |
| 7 | Prüfung | Identität, Vertretungsbefugnis, Gewerbenachweis, Adresse, Leistungen | **fehlt** | **Entscheidung nötig:** Kriterien (E-Offen-1), wer prüft |
| 8 | Bedingungen bestätigen | Werkstatt nimmt die geltende Konditionsfassung und den AVV an; Version und Zeitpunkt werden gespeichert | **fehlt** | **Entscheidung nötig:** Inhalt, Laufzeit, Rechtstext |
| 9 | Freischaltung | Status `approved`; Partnerkonto mit Rolle, Bindung an genau diesen Betrieb | **fehlt** | Rolle `partner`, Zuordnung, zweiter Faktor für Schreibzugriffe (so in `config/site-map.json` für das Portal verlangt) |
| 10 | Profil und Partnerseite | Partner pflegt Profil, sieht Vorschau, gibt frei → Status `published`; erst dann Partner-Kennzeichen in Suche und Detail | **fehlt** | Vorlage der Standardseite, Medienrechte |
| 11 | Kunde stellt Anfrage | aus Suche, Partnerseite oder nach dem Teilekauf, mit Fahrzeug und Teil | **teilweise** (Formular vorhanden, ohne Bezug zu Bestellung) | Verknüpfung Bestellung ↔ Anfrage; nur der gewählte Betrieb erhält die Daten |
| 12 | Zustellung an den Partner | Portal-Eingang und Mail; Status „zugestellt" getrennt von „gespeichert" | **fehlt** | Zustellweg; Verhalten bei Nichtpartnern klären (R-3) |
| 13 | Annahme, Termin, Durchführung | annehmen/ablehnen/verschieben; „wahrgenommen" durch Partner, Widerspruch durch Kunde | **fehlt** | Terminmodell nach E-RC02/E-RC03 |
| 14 | Abrechnung | nur falls es eine Gebühr gibt: Position aus bestätigtem Ereignis, Beleg, Zahlung | **fehlt** | **Entscheidung nötig** (3.5); bei vollständig kostenfrei entfällt der Schritt, dann genügt eine Auswertung |
| 15 | Laufender Betrieb | Profiländerung mit erneuter Freigabe, Sperren, Kündigung, Löschung, Auskunft | **fehlt** | Fristen, Zuständigkeit |

---

## 5 · Abhängigkeiten und Risiken

### 5.1 Abhängigkeiten

| Zu | Abhängigkeit | Stand |
|---|---|---|
| Suite / Portale | Partnerportal und Kundenkonto teilen heute Sitzung und Hülle mit den NeXify-Portalen und `/intern/*` (1.7) | Trennung nötig, bevor Partnerdaten ins Portal kommen |
| Chat (AIFly ORACLE) | Assistent darf keine Preise nennen, die nicht freigegeben sind; Liste leer (`GO-LIVE.md`). Kontextwechsel NeXify ↔ TEILEKLAR setzt die lokale Instanz zurück (`docs/09-final/auftragsregister-2026-11-08.md:279`) | „kostenfrei" im Chat erst nach Eintrag in `config/fakten.json` |
| CRM / ERP | Einzige Vorgangsführung ist die Anfragen-Pipeline in `nexify_api.py`, nicht auf Vercel eingebunden. Ein angebundenes CRM ist im Repository nicht belegt | Partnervorgänge brauchen einen Ort; nicht geprüft, ob HubSpot o. Ä. genutzt wird |
| Zahlungsanbieter | Revolut Merchant für den Shop; für Partnerabrechnung kein Weg | nur nötig, falls Gebühr |
| E-Mail | Resend über gemeinsamen Absender; Vorlagen für Bestellung, Konto, Werkstattanfrage (Kunde), interne Anfrage | Partner-Mails und TEILEKLAR-Absender fehlen |
| Lieferant | BigBuy-Zugang zuletzt abgelehnt (D-008, 31.10.2026) | ohne Katalog kein Weg „Teil gekauft → Einbau anfragen" |
| Betreiberangaben | Impressum ohne bestätigte Anbieterangaben (`AGENTS.md:16-19`, Befund 13.11. E-C) | blockiert Indexierung und jeden Vertragsschluss |
| Führendes Register | P12 Stadt/Werkstatt, P13 Partner, P14 Termin/Gutschein (`completion-goal-2026-11-01.md:133-135`), Lücke G21 offen (`:175`), OF-08 „Partner-Status, Werkstattprofil" offen (`auftragsregister-2026-11-08.md:224`) | Pakete aus Abschnitt 6 dort zuordnen, kein zweites Register |

### 5.2 Risiken

| Nr. | Risiko | Beleg | Art |
|---|---|---|---|
| R-1 | **Nicht freigegebene Konditionen sind öffentlich**: `teileklar.shop/partner-werden` nennt „0 €" und „19,90 €", indexierbar | Probe 14.11.2026 | Preisangabe, Irreführung, Bindungswirkung möglich |
| R-2 | **Keine Mandantentrennung** (eine Adresse, ein Cookie, eine Datenbank, gemeinsame Anfragen) | 1.7 | DSGVO, Vorgabe des Inhabers |
| R-3 | **Werkstattanfrage erreicht den Betrieb nicht**; dem Kunden wird gesagt „Ein Termin entsteht erst, wenn die Werkstatt ihn bestätigt" | `WorkshopDetail.tsx` (Erfolgstext), `workshops_api.py:120-124` | Irreführung; personenbezogene Daten werden ohne Bearbeitung gespeichert |
| R-4 | **Verzeichnisbetriebe ohne Zustimmung** werden mit Kontaktdaten gezeigt und sind „anfragbar" | `workshops_api.py:27-43`; Quelle der Daten laut `werkstatt-verzeichnis.md` §11 mit Zweckbindung und Sperrliste — Sperrliste im Code nicht vorhanden | Datenschutz, Wettbewerbsrecht |
| R-5 | **Verbraucher- und Geschäftskundenrecht nicht getrennt**: Konzept verlangt getrennte Abläufe (`teileklar-shop.md:56`), Code kennt nur einen | `checkout_api.py:24-32` | Widerruf, Preisdarstellung netto/brutto |
| R-6 | **Ein Steuersatz für fünf Lieferländer** | `shop/config.py:14` | Steuer |
| R-7 | **Rechtstexte unvollständig und ungeprüft**: nur AGB und Widerruf, aus dem Prototyp übernommen; AGB nennen die Schweiz, geliefert wird laut `config/fakten.json` nicht dorthin | `config/teileklar-legal.json`, `fakten.json` | Verbraucherrecht |
| R-8 | **Betreiberidentität widersprüchlich** (Eenmanszaak ↔ „FACTORY"/B.V. unbestätigt; zwei Mailadressen) | 1.7 | Impressum, Vertragspartner |
| R-9 | **Haftung**: TEILEKLAR ist laut Inhaberentscheidung 31.08.2026 Verkäufer, nicht Vermittler (`teileklar-shop.md:56`, `gesamtprojektplan.md:105`); bei der Werkstattleistung soll es umgekehrt nur Vermittler sein (Prototyp-FAQ) | genannt | Abgrenzung muss im Vertrag stehen |
| R-10 | **Live-Zahlung ohne Sandbox** | `DECISIONS.md` D-008 | Betriebsrisiko beim Einschalten der API |
| R-11 | **Zwei Auftritte derselben Marke** (`teileklar.shop` alt, `nexifyai.de/teileklar` neu, Canonical auf NeXify) | 1.6 | Marke, Suchmaschinen, widersprüchliche Aussagen |
| R-12 | **Zahlen im Umlauf, die keine Partnerzahlen sind** (579 / 598 / 6.875 / 7.120) | 1.4 | Gefahr falscher Werbeaussagen |

---

## 6 · Umsetzungspakete

Die Pakete sind Vorschläge zur Einordnung unter P12/P13/P14, G21 und OF-08 im bestehenden Register — kein neues Register. „Sofort baubar" heißt: ohne Entscheidung des Inhabers, innerhalb des Repositorys, ohne Zugangsdaten.

| Paket | Ziel | Betroffene Bereiche | Sofort baubar? | Nicht ohne Inhaber | Testidee | Rückweg |
|---|---|---|---|---|---|---|
| **W-01 Altstand `teileklar.shop` entschärfen** | keine nicht freigegebenen Konditionen mehr öffentlich | Cloudflare-Auslieferung von `teileklar.shop` (außerhalb des Repositorys) | nein | Zugriff und Entscheidung: abschalten, auf neutrale Seite leiten oder `noindex` | Abruf der drei Prototyp-Adressen liefert keine Preisangaben mehr | alten Stand wieder ausliefern |
| **W-02 Shop-API erreichbar machen** | `/api/*` antwortet statt 503 | `apps/shop-api/vercel_app.py:23,63` (feste Projekt-ID), Umgebungsvariablen des Vercel-Projekts | teilweise: Projekt-ID-Bindung konfigurierbar machen und testen | Zugänge (Datenbank, Zahlungsmodus, Mail), Entscheidung Zahlungsmodus | vorhandene `apps/shop-api/tests/test_vercel_adapter.py` erweitern; danach `GET /api/health` = 200 | Commit zurücknehmen; ohne Zugänge bleibt 503 |
| **W-03 Werkstattanfrage ehrlich machen** | Kunde erhält eine wahre Aussage; Anfrage landet bei jemandem | `shop/workshops_api.py`, `shop/mail_templates.py`, `components/shop/WorkshopDetail.tsx`, `shop/admin_api.py` (Liste) | ja: interne Benachrichtigung, Admin-Liste, Text „wird von TEILEKLAR an den Betrieb weitergegeben/geprüft" je nach tatsächlichem Weg | ob Anfragen an Nichtpartner überhaupt angenommen werden sollen | Test: Anfrage erzeugt internen Mail-Auftrag und erscheint in der Admin-Liste; Text nennt keinen nicht vorhandenen Schritt | Commit zurücknehmen |
| **W-04 Landingpage „Partner werden" ausbauen** | Seite nach Seitenbrief `PUB-tk-partner`: Nutzen, Ablauf in vier Schritten, FAQ, zusätzliche Formularfelder (Leistungen, Ort, Einzugsgebiet) | `components/shop/PartnerJourney.tsx`, `ContactRequestForm.tsx`, `config/site-map.json` (Seite `tk-partner`), `shop/requests_api.py` | ja, **ohne** Kostenaussage; Kostenzeile technisch vorbereiten: wird nur gezeigt, wenn ein Fakt in `config/fakten.json` existiert | Wortlaut „kostenfrei" und Bedingungen (3.5) | Komponententest: ohne Fakt keine Kostenzeile, mit Fakt genau der Faktentext; Formularprüfung | Commit zurücknehmen |
| **W-05 Anfragen nach Marke trennen** | TEILEKLAR-Partneranfragen und NeXify-Kontaktanfragen getrennt führen | `shop/requests_api.py`, `shop/mail_templates.py`, `shop/nexify_api.py` | ja: Pflichtfeld Marke/Mandant, eigene Vorgangsnummer und Mail-Marke für TEILEKLAR, Filter in der Pipeline | eigene Datenbank oder nur Feldtrennung; eigener Mailabsender | Test: Partneranfrage erscheint nicht in der NeXify-Ansicht und umgekehrt | Feld ignorieren; Daten bleiben erhalten |
| **W-06 Partnerantrag und Statusmodell** | Antrag mit Zuständen `submitted → in_review → approved/abgelehnt`, Abgleich mit Verzeichnis-ID, Prüfprotokoll | neu: `shop/partners_api.py`; `shop/db.py` (Indizes), `shop/admin_api.py`, `components/shop/AdminShop.tsx` | ja (Datenmodell, Admin-Prüfung, Tests) | Prüfkriterien (E-Offen-1) als Inhalt | Tests: erlaubte und verbotene Zustandswechsel, Doppelantrag, fremder Betrieb | Sammlung bleibt ungenutzt; Commit zurücknehmen |
| **W-07 Konditionsfassung und Annahmeprotokoll** | versionierte Bedingungen; Annahme mit Version, Zeit, Person, Vertretungserklärung | `shop/partners_api.py`, `config/teileklar-legal.json`, `components/shop/TeileklarLegal.tsx` | teilweise: Technik ja | Text der Partnervereinbarung, AVV, Laufzeit, anwaltliche Prüfung | Test: Annahme nur der aktuell gültigen Fassung; alte Fassung wird abgewiesen | Fassung zurückziehen; Annahmen bleiben als Beleg |
| **W-08 Partnerrolle und Betriebsbindung** | Rolle `partner`, Nutzer gehört zu genau einem Betrieb; Zugriff nur auf eigene Daten | `shop/accounts_api.py`, `shop/auth.py`, `apps/web/proxy.ts`, `apps/web/auth/policy.ts` | ja, nach W-06 | zweiter Faktor (Pflicht laut `config/site-map.json`), wer Zugänge vergibt | Tests: Partner A liest B nicht; Kunde hat keinen Partnerzugriff; abgelaufene Sitzung | Rolle entziehen; Commit zurücknehmen |
| **W-09 Sitzungsgrenze NeXify ↔ TEILEKLAR** | getrennte Sitzung je Marke/Adresse | `shop/accounts_api.py:71`, `apps/web/app/[...slug]/page.tsx:13`, `apps/web/lib/page-seo.ts:6`, `vercel.json` | teilweise: Cookie auf Pfad begrenzen, Portal-Hülle nach Marke trennen | eigene Domain `teileklar.shop` für den neuen Stand (DNS), eigenes Projekt oder gemeinsames | Test: TEILEKLAR-Sitzung öffnet keine NeXify- oder internen Bereiche | Cookie-Einstellung zurücksetzen |
| **W-10 Standard-Partnerseite** | Seite je Partner aus dem Profil, Vorschau, Freigabe durch Partner, Veröffentlichung getrennt; Partner-Kennzeichen nur bei `published` | `components/shop/WorkshopDetail.tsx`, `shop/workshops_api.py:46-48`, neue Profilfelder | ja, nach W-06/W-08 (Vorlage, Zustände) | Pflichtinhalte der Seite, Bildrechte, Kostenzeile | Tests: Nichtpartner ohne Kennzeichen; zurückgezogenes Profil verschwindet; Vorschau nur für den Partner | Veröffentlichung zurücknehmen (Status), Commit zurücknehmen |
| **W-11 Portal Stufe 1** | Partner sieht eigene Anfragen, nimmt an oder lehnt ab; Kunde und Partner sehen denselben Stand | `components/PortalWorkspace.tsx`, `shop/workshops_api.py`, `shop/mailer.py` | ja, nach W-08 | Fristen, Texte der Benachrichtigungen | Tests: Zustellstatus getrennt von Speicherung; Wiederholung erzeugt keine Doppelmail | Portalansicht ausblenden |
| **W-12 Kauf ↔ Einbauanfrage verknüpfen** | Anfrage trägt Bestellung, Teil und Fahrzeug | `components/shop/OrderConfirmation.tsx`, `shop/workshops_api.py` | ja, technisch; wirksam erst mit laufendem Katalog | Lieferantenzugang | Test: nur eigene Bestellung verknüpfbar | Feld optional lassen |
| **W-13 Termin und Abrechnung** | Terminzustände und, falls gewollt, Abrechnungsposition nach E-RC02 | neu | nein | Gebühr ja/nein, Fristen, Zahlungsweg | Fälle aus E-RC02: Nichterscheinen, Widerspruch, doppelter Lauf | — |
| **W-14 Stadtseiten** | Stadt → Partner → Anfrage und zurück | neu | nein (braucht bestätigte Partner und Zuordnung) | Start-Regionen, Zählregel | Fälle aus Masterplan §30.6 | — |
| **W-15 Shop-Recht und Betreiber** | Betreiberangaben, Rechtstexte je Kundentyp, Steuersatz je Land | `config/fakten.json`, `config/teileklar-legal.json`, `shop/config.py`, `shop/checkout_api.py` | nein | Betreiberdaten, Rechts- und Steuerprüfung | — | — |

Reihenfolge-Vorschlag: W-01 → W-02 → W-03 → W-04/W-05 (parallel) → W-06 → W-07/W-08 → W-09 → W-10 → W-11 → W-12 → W-13/W-14. W-15 läuft neben allem und blockiert den öffentlichen Verkauf.

---

## 7 · Zusammenfassung für die Geschäftsführung (15 Zeilen)

1. Shop und Werkstattsuche sind programmiert, live aber nicht nutzbar: Die Shop-Schnittstelle antwortet mit 503 (gemessen 14.11.2026).
2. Für Werkstätten gibt es heute nur die Seite „Partner werden" mit Anfrageformular; alles danach (Prüfung, Freischaltung, Partnerseite, Portal, Abrechnung) ist nur Prototyp oder Konzept.
3. „Kostenfrei" ist nicht freigegeben belegt. Es steht nur in alten Prototypen, dort zusammen mit einer Erfolgsgebühr; der Masterplan führt diese Zahlen als historisch und ungeklärt.
4. **Sofort handeln:** `teileklar.shop` zeigt öffentlich und indexierbar einen Altstand vom 14.10.2026 mit „0 €" und „19,90 €". Entscheidung 1: abschalten, umleiten oder sperren.
5. Entscheidung 2: Was heißt „kostenfrei" genau — welcher Leistungsumfang, vollständig oder nur Einstieg, mit oder ohne Erfolgsgebühr, wer zahlt, welche Laufzeit?
6. Entscheidung 3: Was ist ein „Direktpartner"? Der Begriff steht in keiner Quelle. Vorschlag: Werkstatt mit bestätigter Vereinbarung, im Unterschied zum Verzeichnisbetrieb.
7. Entscheidung 4: Kriterien und Zuständigkeit für die Freischaltung einer Werkstatt (seit dem Organisationshandbuch offen).
8. Entscheidung 5: Betreiber und Vertragspartner von TEILEKLAR (Einzelunternehmen oder B.V.), dazu Partnervereinbarung, Datenschutzvertrag und anwaltliche Prüfung.
9. Entscheidung 6: Trennung von NeXify — eigene Adresse `teileklar.shop` für den neuen Stand, eigene Sitzung, eigene Datenhaltung. Heute: eine Adresse, ein Cookie, eine Datenbank, eine gemeinsame Anfragetabelle.
10. Entscheidung 7: Dürfen Kunden Betriebe anfragen, die keine Partner sind? Heute wird die Anfrage gespeichert, der Betrieb erfährt aber nichts davon.
11. Entscheidung 8: Zugänge für die Shop-Schnittstelle (Datenbank, Zahlungsmodus, Mail, Lieferant) und ob Zahlungen zuerst im Testmodus laufen.
12. Ohne Entscheidung baubar: ehrliche Werkstattanfrage mit interner Benachrichtigung, Ausbau der Partner-Landingpage ohne Preisangabe, Trennung der Anfragen nach Marke, Partnerantrag mit Prüfstatus, Partnerrolle, Vorlage der Standard-Partnerseite.
13. Nicht ohne Entscheidung baubar: jede Kostenaussage, Vertragsannahme, Abrechnung, Stadtseiten mit Partnerzahlen, Verkauf an Endkunden.
14. Zahlen wie 579, 598, 6.875 oder 7.120 Werkstätten sind Verzeichnisdaten oder Ziele, keine Partner. Bestätigte Partner sind im Repository nicht belegt.
15. Rechtliche Lücken im Shop: nur ein Ablauf für Verbraucher und Geschäftskunden, ein Steuersatz für fünf Länder, nur AGB und Widerruf als Rechtstexte, Betreiberangaben widersprüchlich.

## 8 · Was nicht geprüft werden konnte

- **Zugänge und Laufzeit:** `.env`, Vercel-Einstellungen und -Variablen, DNS-Einträge, Inhalt der Datenbank (ob dort echte Anfragen, Bestellungen oder Partner liegen). Die Ursache des 503 ist deshalb nur als Annahme benannt.
- **Schreibende Wege:** kein Formular abgeschickt, keine Registrierung, keine Bestellung, keine Mail. Ob das Formular auf `teileklar.shop` irgendwohin sendet, ist offen.
- **Browserdarstellung:** nur Rohabruf; ob Platzhalter auf `teileklar.shop` im Browser ersetzt werden und ob `WorkshopDirectory.tsx` irgendwo sichtbar wird, wurde nicht im Browser geprüft.
- **Tests:** `make check`, `make test` und die Shop-Tests wurden nicht ausgeführt (kein Build, kein Server laut Auftrag). `python3 tools/project_skills.py verify` lief: `verified_project_skill_sources`, 5 Skills. `tools/context_executor.py` lieferte für diese Aufgabe keine Quellenauswahl.
- **Nicht vollständig gelesen:** `PROGRESS.md` (127 KB), `reference/handoff-n2` (107 Dateien), `docs/handoff-2026-10-31`, `docs/02-umsetzung`, `docs/05-marketing`, `evidence/`, die Prototyp-HTML-Dateien im Volltext (gelesen wurden die Textauszüge unter `prototypen/i18n`).
- **Wissensquellen per MCP (14.11.2026):** Mem durchsucht („TEILEKLAR Werkstatt Partner kostenfrei", „Werkstatt Direktpartner Onlineshop Landingpage Konzept") — kein Treffer zu TEILEKLAR, Werkstattpartnern oder Konditionen; gefunden wurden nur allgemeine Notizen („NeXify AI FACTORY — Steuerungswiki & Umsetzungsplan", Stand 07.–09.11.2026, ohne Shop-/Partnerinhalt) und ältere Notizen aus 03/2026 zu einem anderen Projekt. Notion durchsucht — ein Treffer ohne Shop-Bezug („Agentur-Wissensmanagement — Bestandsaufnahme und Betriebsstruktur", 09.11.2026), nicht geöffnet. HubSpot, Linear, Google Drive, Slack und Gmail wurden nicht durchsucht.
- **Rechtliche Bewertung:** Die Risiken sind benannt, nicht rechtlich geprüft.
- **Fremde Arbeitsstände:** Andere Agenten arbeiten im selben Verzeichnis; nicht eingecheckte Änderungen anderer wurden nicht bewertet.
