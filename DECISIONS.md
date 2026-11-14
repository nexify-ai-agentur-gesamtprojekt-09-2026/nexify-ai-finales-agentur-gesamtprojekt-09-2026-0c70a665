# DECISIONS — NeXify AI Gesamtlösung

## D-001 — Prototypen sind Referenz, nicht Produktionscode
- **Entscheidung:** `prototypen/*.dc.html` werden nachgebaut, nicht kopiert; das Manifest (`sha256sum -c`) bleibt unverändert.
- **Grund:** Design/Verhalten als Vorlage, aber kein Produktionscode (Auftrag in `AGENTS.md`).

## D-002 — Werte nur aus der Konfiguration
- **Entscheidung:** Designwerte aus `config/design-tokens.json`, Zahlen mit Preisbezug aus `config/fakten.json`/`config/api-prepaid.json`.
- **Grund:** Eine Quelle der Wahrheit; erfundene Zahlen/Preise sind unzulässig.

## D-003 — Mindestaufladung 10 € (Inhabervorgabe 29.09.2026)
- **Entscheidung:** `config/api-prepaid.json` `aufladung.minCent = 1000` ist maßgeblich; die Doku wurde angeglichen, E3 gilt als entschieden.
- **Grund:** Widerspruch zwischen Doku (50 €) und Inhabervorgabe (10 €) wurde durch den Faktenabgleich aufgedeckt.

## D-004 — Faktenabgleich nur mit passendem Layout
- **Entscheidung:** `tools/inhaltsabgleich.js` wird erst wieder in `make check` verdrahtet, wenn das erwartete Layout (api/, lib/, Prototypen im Root) hergestellt oder das Tool entfernt ist.
- **Grund:** Ein Prüfwerkzeug, das im Repo nicht laufen kann, darf keinen grünen Schein erzeugen; fehlende Quellen werden als Befund ausgegeben statt zu crashen.

## D-005 — Shop-API als eigener FastAPI-Dienst (`apps/shop-api`)
- **Entscheidung:** Katalog, Warenkorb, Checkout, Werkstätten, Admin und Konten laufen in `apps/shop-api` (FastAPI, async, OpenAPI unter `/api/openapi.json`); `backend/server.py` und `frontend/` sind nur dünne Supervisor-Hüllen, die echte Oberfläche bleibt `apps/web`.
- **Grund:** Der bestehende stdlib-Gateway (`apps/agent-gateway`) ist bewusst auf lokale Origins beschränkt; ein separater Dienst hält diese Grenze intakt und liefert Validierung/OpenAPI.

## D-006 — MongoDB als Shop-Speicher
- **Entscheidung:** Produkte, Preise, Warenkörbe, Bestellungen, Zahlungsereignisse, Werkstätten, Nutzer und Sitzungen liegen in MongoDB (`MONGO_URL`/`DB_NAME` aus der Umgebung). Preise/Summen werden ausschließlich serverseitig berechnet.
- **Grund:** Vorgegebene Laufzeitumgebung; Clientpreise werden ignoriert.

## D-007 — Clerk ersetzt durch eigene Konten + Emergent Google Auth
- **Entscheidung:** Eigene Konten (bcrypt, serverseitige Sitzung im httpOnly-/Secure-Cookie `tk_session`, Registrierung, Login, Logout, Reset per Resend, Sperre nach 5 Fehlversuchen in 15 Minuten, Fehlertext „E-Mail oder Passwort ist falsch“) plus „Mit Google anmelden“ über Emergent-managed Google Auth, per E-Mail mit demselben Nutzer verknüpft. Rollen (`customer`, `admin`) stehen im eigenen Nutzerdatensatz; Gast-Warenkorb wird beim Login zusammengeführt. `@clerk/*` ist aus `apps/web` und `apps/site` entfernt; `LocaleAwareClerk.tsx` und `auth/public-provider.ts` bleiben nur als SDK-freie Hüllen für bestehende Inventare. `PREVIEW_TEST_AUTH` entfällt.
- **Grund:** Inhabervorgabe 31.10.2026; Clerk-Secret war nicht verfügbar, Clerk-Schlüssel dürfen nicht mehr erforderlich sein.
- **Folge:** Gespeicherte Browser-Nachweise, die an Clerk-/UI-Quellhashes gebunden sind, sind absichtlich ungültig (fail-closed) und müssen neu erzeugt werden.

## D-008 — Revolut live im Preview, BigBuy-Import blockiert
- **Entscheidung:** `REVOLUT_MODE=live` (Inhabervorgabe; kein Sandbox-Schlüssel). Webhook-Signatur und Idempotenz werden mit Test-Signaturmaterial und gemocktem Status-Readback getestet; es gibt keine Fake-Zahlung. Umschalten: `REVOLUT_MODE=sandbox` + `REVOLUT_MERCHANT_SECRET_KEY_SANDBOX`.
- **Grund/Blocker:** BigBuy-Produktion antwortet trotz freigegebener IP `34.170.12.145` mit `401 Invalid Token`; Sandbox-Host aus dem Pod nicht erreichbar. Der Katalog bleibt leer, bis ein gültiger Schlüssel vorliegt; der Import ist fertig verdrahtet (Admin → Import).

## D-009 — Produktaufbereitung (F-22, Umsetzung Phase 2): eigener Anwendungsfall `product_enrichment`
- **Entscheidung (Nutzeranweisung 31.10.2026):** Produkttexte werden über den eigenen Router (`9router`, `ROUTER_URL`/`ROUTER_KEY`, OpenAI-kompatibel) mit `ds/deepseek-v4-pro` bei `reasoning_effort: high` aufbereitet. Das ersetzt für diesen Anwendungsfall die allgemeine Vorgabe `deepseek/deepseek-v4.1-flash-1017`, die für alle übrigen Bereiche unverändert gilt. Es gibt keinen stillen Fallback: Ist das Modell nicht verfügbar, schlägt der Lauf mit Fehler fehl. Festgehalten in `config/llm-policy.json#use_cases.product_enrichment` und `config/llm-verbindungen.json#anwendungsfaelle.product_enrichment` und geprüft durch `tools/check_llm_policy.py`.
- **Bilder:** Keine generative Bearbeitung, weil Produkt und Lieferumfang unverändert bleiben müssen. Die Aufbereitung ist deterministisch (Pillow: Format, Weißraum, Schärfe, WebP; wo nötig lokale Freistellung). Das Original bleibt erhalten, und die aufbereitete Version wird mit Herkunft im Objektspeicher abgelegt, nicht als Base64 in Mongo.


## USER-LUXURY-20261101 · Material- und Medienrichtung

Pascal verlangt eine weniger militaristische, luxuriöse Gestaltung mit edlen Metallen und gezieltem Glas. Gemeinsame visuelle Schicht für Vite und Next, mehr Raum, zurückhaltendes Lime, Kontohinweis im Inhaltsraster und optionales Assistenzdock. Drei fachlich zugeordnete Editorial-Stills ersetzen keinen Katalog-/Funktionalitätsbeleg. Home veröffentlicht keine ungeprüften Review-/Ambientperformances mehr; Originaldateien bleiben erhalten. Reale Lippen-/Gestenfilme benötigen echte passende Quellen und separate Abnahme. REA6.8.0 lokal isoliert wiederhergestellt und MCP-discovered, Analyse jedoch an Host-Prozessprüfung blockiert; keine globale Registrierung/HTTP-Exposition oder Rechteänderung. Kein Gesamtfreigabeentscheid.

## D-010 — Öffentlicher Chat: KI-geführt, sichtbare KI-Kennzeichnung im Chat entfernt (13.11.2026)

- **Entscheidung (Inhaber Pascal Courbois, 13.11.2026):** Der öffentliche Chat wird KI-geführt statt
  modellfrei betrieben. Sichtbare KI-Kennzeichnungen werden aus der Chat-Oberfläche entfernt
  (Entscheidung „A und B“). Die Namen „AIFly ORACLE“ und „NeX Agentic AI“ bleiben.
- **Herkunft des Belegs:** Die Entscheidung wurde dieser Arbeitssitzung über die koordinierende Sitzung
  übermittelt. In diesem Repository liegt kein weiterer Beleg vor. Der Merge des zugehörigen Pull Requests
  durch den Inhaber gilt als Bestätigung; bis dahin ist die Entfernung nicht wirksam.
- **Benanntes Risiko (keine Rechtsberatung):** Art. 50 Abs. 1 der EU-KI-Verordnung (VO (EU) 2024/1689,
  anwendbar seit 02.08.2026) verlangt, dass Personen, die direkt mit einem KI-System interagieren, darüber
  informiert werden, sofern das nicht aus den Umständen offensichtlich ist. Ohne sichtbare Kennzeichnung im
  Chat stützt sich die Erkennbarkeit auf den Produktnamen und die Seite `/ki-hinweise`. Ob das genügt, ist
  rechtlich nicht geprüft. Der Inhaber hat die Entscheidung nach ausdrücklichem Hinweis auf dieses Risiko
  getroffen und trägt es.
- **Umfang der Entfernung:** In `apps/web/components/PublicOrientationChat.tsx` entfällt die Zeile
  „NeX Agentic AIFly kann Fehler machen.“ (de/nl/fr/en). An ihrer Stelle steht ein sachlicher Eingabehinweis
  mit Verweis auf die Datenschutzseite. Außerdem sendet `/api/chat` die Modellkennung nicht mehr an den
  Browser (bisher im `start`-Ereignis und in der JSON-Antwort); in der Ablage der Nachricht bleibt sie.
  Sonst wurde nichts entfernt.
- **Was bewusst bleibt:** (1) Der Assistent gibt sich nicht als Mensch aus: Die Vorgabe verlangt auf Nachfrage
  eine wahrheitsgemäße Antwort, und eine Aussage, ein Mensch zu sein, wird serverseitig durch die wahre Angabe
  ersetzt (`apps/web/lib/chat-guidance.ts`, Tests in `apps/web/auth/tests/chat-guidance.test.mjs`).
  (2) Datenschutz- und Rechtsseiten einschließlich `/ki-hinweise` sind unverändert. (3) Der Hinweis
  „ohne Live-KI“ erscheint weiter, wenn der Chat ohne Modellanbindung auf die Orientierung anhand der Website
  zurückfällt; er beschreibt dann den tatsächlichen Zustand.
- **Offener Abgleich:** `AGENTS.md` (Abschnitt „Verbindliche Regeln“) und `config/llm-verbindungen.json`
  (`kennzeichnung`) nennen die KI-Kennzeichnung nach Art. 50 weiterhin als Vorgabe. Diese Entscheidung ändert
  sie nicht; der Inhaber entscheidet, ob sie angepasst werden. Außerhalb des Chats (z. B. „KI-Assistent“ in
  `ExplainerSections.tsx`, verborgener Statustext in `Workspace.tsx`) wurde nichts geändert.
- **Folgen für andere Texte:** Mit dem KI-geführten Chat werden Besuchernachrichten an den Router und das
  Modell übermittelt und, falls Supabase eingerichtet ist, gespeichert. Die Aussage „arbeitet derzeit ohne Live-KI-Modell“
  auf `/ki-hinweise` und `/produkte/aifly-oracle` (`config/site-map.json`) trifft dann nicht mehr zu, und
  `/datenschutz` muss die Verarbeitung der Chatnachrichten abdecken. Beides ist vor dem Livegang vom Inhaber
  zu prüfen und anzupassen; diese Seiten wurden hier nicht verändert.
- **Rückweg:** Revert des Commits „chat: sichtbare KI-Kennzeichnung im Chat entfernen“ stellt die Zeile
  wieder her; die übrigen Chat-Pakete sind davon unabhängig.

## D-011 — Produktname „NeX AIFly Suite“ ersetzt „NeX2fly“; Betriebsmodell AI FACTORY (14.11.2026)
- **Entscheidung (Inhaber Pascal Courbois, 14.11.2026):** Der sichtbare Produktname ist überall „NeX AIFly Suite“; „NeX2fly“/„NeX2fly Suite“ ist historisch. Das Team besteht aus Pascal (Ideen, Design, Basis) und den Agenten NeX und AIFly; alles Weitere erarbeitet das Agententeam der AI FACTORY, orchestriert über Paperclip (voll zu konfigurieren und zu migrieren, Status: geplant, `config/automation.json` `user_selected_not_verified`).
- **Umfang:** Sichtbare Texte in `config/` (site-map, Oberflächen-, Startseiten-, Erklär-, Medien-, Presenter-Texte) und `apps/` in de/nl/fr/en. Interne IDs, Test-IDs und die Adresse `/produkte/nex2fly` bleiben unverändert, damit Links, Nachweise und Routen stabil bleiben; Nutzer, die „NeX2fly“ eingeben, landen in der Orientierung weiterhin auf der Suite-Seite. Historische Abgleich- und Quellinventare (`content-reconciliation-*`, `policy-source-inventory`, `rebuild-source-map`, `research/`, `integrations/`) bleiben als Historie unverändert.
- **Folge:** Die im Anforderungsabgleich festgehaltenen Quell-Prüfsummen von `apps/site/src/Auth.tsx` und `config/presenter-system.json` sind dadurch veraltet und werden – wie die bestehenden 40 Abweichungen dieser Art – erst mit einer echten Neuprüfung erneuert, nicht nebenbei. Die Freigabeliste `config/presenter-sources.json` wurde nur für `config/site-map.json` aktualisiert, nachdem geprüft war, dass sich die Datei gegenüber dem freigegebenen `main`-Stand ausschließlich durch die Namensersetzung unterscheidet (vorgesehener Ablauf „intentional source changes require reviewed inventory refresh“).

## D-012 — Shop und übrige Datenhaltung auf der eigenen Supabase-Instanz (PostgreSQL) (14.11.2026)
- **Entscheidung (Inhaber Pascal Courbois, 14.11.2026):** Der TEILEKLAR-Shop und alle übrige Datenhaltung werden auf der selbst gehosteten Supabase-Instanz (OSS, PostgreSQL) gebaut. Das löst D-006 (MongoDB als Shop-Speicher) ab, sobald die Umstellung abgenommen ist; bis dahin bleibt der Code unverändert auf MongoDB.
- **Herkunft des Belegs:** Die Entscheidung wurde dieser Arbeitssitzung über die koordinierende Sitzung übermittelt. In diesem Repository liegt kein weiterer Beleg vor.
- **Grund:** Die Shop-API antwortet in der Produktion mit 503 (Projektbindung im ausliefernden Projekt, nicht antwortende MongoDB im früheren); die verbindliche Regel „Mandantentrennung per RLS“ (`AGENTS.md`) ist mit MongoDB nicht erfüllt.
- **Stand:** Zielschema `db/shop/001_shop.sql` mit Prüfungen (`db/shop/verify.sql`, `db/shop/test.sh`) und Umstellungsplan `docs/deployment/shop-auf-supabase-2026-11-14.md`. Nichts davon ist auf einer echten Instanz angewendet; der Dienstcode ist nicht umgestellt.
- **Was bewusst bleibt:** Die Projektbindung (`SHOP_ALLOWED_PROJECT_IDS`), der Namespace-Marker und der Namespace-Operator bleiben in Kraft, bis der Inhaber den im Plan beschriebenen Ersatz freigibt. Preise, Steuersatz und Rechtstexte sind nicht berührt.
- **Offen beim Inhaber:** Verbindungsweg (direkte PostgreSQL-Verbindung oder PostgREST), Anwenden der Migrationen, Rolle und Mandant, Schlüssel in Vercel, Abnahme der Zahlung. Liste im Plan, Abschnitt 5.
