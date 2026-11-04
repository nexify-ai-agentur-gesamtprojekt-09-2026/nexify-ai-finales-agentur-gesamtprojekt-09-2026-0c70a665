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

## D-RUFLO-20261104 — Ruflo als versionierte Agenten-Orchestrierung
- **Entscheidung (Nutzer 04.11.2026):** Ruflo wird fest im Repository integriert. Version 3.71.1 ist gepinnt; npm-Integrity und Tarball-Hash stehen in `config/integrations/ruflo.json`. Die Integration wurde in einem Wegwerf-Worktree geprüft.
- **Abweichungen vom Upstream-`init`:** Der MCP-Server ist gepinnt statt `@latest`. Es gibt keine pauschalen Auto-Freigaben. Folgendes ist nicht aktiviert: globale Home-Änderung, Anmeldung, skills.sh, Mod-Plugins und Cloud-MCP.
- **Grenzen:** Ruflo hat keine eigenen LLM-Schlüssel, die Modellbindung aus `config/llm-policy.json` bleibt unverändert. Ruflo erteilt keine Freigaben und lockert keine Gates. Details stehen in `docs/automation/ruflo.md`.

## D-010 — Shop-/Katalognachweis an die Live-Strecke `apps/shop-api` gebunden (04.11.2026)
- **Entscheidung:** Der Browser-Nachweisvertrag für Shop und Katalog (`tools/check_browser_evidence.py`, `check_shop_evidence`/`check_catalog_evidence`) prüft nicht mehr die seit 5f08936 nicht eingebundene `ShopPanel.tsx`-/`apps/agent-gateway`-Strecke (`evidence/shop-http-2026-10-27/`, `evidence/catalog-image-batch-2026-10-27/browser-catalog.json`). Er prüft jetzt die eingebundene Strecke `shop/PublicShopContent` → `/api/shop/*` → `apps/shop-api/vercel_app.create_app` (Produktionsadapter, echte Router). Nachweis: `evidence/shop-api-2026-11-04/browser-{catalog,shop}.json`, erzeugt von `apps/site/tests/browser-shop-api.mjs` mit `apps/site/tests/fixtures/shop_api_fixture.py`.
- **Gleich strenge Bindung:** exakte Quellhashes (Adapter, Router, Client, Texte, Skript, Fixture), Pflichtprüfungen, tatsächlich beobachtete HTTP-Grenzen (auch 503 „nicht eingerichtet“, 502 „Verbindung fehlgeschlagen“, 409, 403, verlorene Antwort), keine externen Requests, keine Bestellung/Zahlung/Mail (Browser blockiert `/api/shop/orders`, Fixture verweigert Provider-/Mailaufrufe), Negativtests für Manipulation, Veraltung und fehlende Prüfungen.
- **Ersetzt im Lauf:** MongoDB durch mongomock-motor mit gekennzeichneten synthetischen Artikeln; die Atlas-Schema-/Validator-Metadatenprüfung wird im Speicher akzeptiert (mongomock kennt keine Validatoren; abgedeckt durch `apps/shop-api/tests/test_vercel_adapter.py`). Kein Produktions-, Lieferanten-, Preis- oder Rechtsnachweis.
- **Mitbehobene Produktfehler:** (1) Katalog und Kategorien unterscheiden „nicht eingerichtet“ (JSON-503 mit Konfigurationsgrund) von „Verbindung fehlgeschlagen“ (alles andere, inkl. `database_metadata_unavailable`). (2) „In den Warenkorb“ rechnet nicht mehr im Browser `vorhanden + Menge`, sondern sendet `mode: "add"` mit `Idempotency-Key`; der Server addiert auf seinem aktuellen Stand (optimistische Revision am Warenkorbdokument, begrenztes Replay-Fenster `applied_keys`). Eine Wiederholung nach verlorener Antwort fügt nichts doppelt hinzu. `mode` fehlt = bisherige absolute Menge (rückwärtskompatibel). (3) Ein wohlgeformtes, aber vom Dienst nie ausgegebenes Gastcookie wird nicht als Eigentümer übernommen; ein Schreibzugriff erhält eine neue Server-ID. Keine neue Collection/kein neuer Index; der Namespacevertrag des Adapters bleibt unverändert.
- **Bewusst unverändert:** Lieferantenbilder bleiben direkte `https://cdnbigbuy.com/images/`-Quellen (bestehender CSP-/Integritätsvertrag verbietet einen Bildproxy); im Nachweislauf werden sie vor dem Netz blockiert und der lokale Platzhalter geprüft. `ShopPanel.tsx`/`.css` bleiben, solange kritische, Fallback- und Abnahmeregister-Nachweise sie binden.
