# TK-10 · Sichtung PR 67: Übernahmeliste

Stand: 14.11.2026 · Entwurf der Projektleitung · Gehört zu `docs/konzept/MIGRATIONSPLAN.md` (Paket TK-10).
Kennzeichnung: **IST** = geprüft, mit Fundstelle · **SOLL** = Vorschlag · **ANNAHME** = nicht belegt · **OFFEN** = zu klären.
Nichts hieraus ist übernommen oder zusammengeführt. PR 67 bleibt unverändert und offen.

## 1. Gegenstand und Methode

- **IST** PR 67, Zweig `claude/youthful-sagan-bzmkkr`, Spitze `4ea4a69` (`git ls-remote origin refs/pull/67/head`). Der Zweig wurde über `git fetch origin` gelesen, kein Spiegel nötig.
- **IST** Gemeinsamer Vorfahr mit `main`: `2f872a7`. `main` steht heute auf `0080377`. PR 67 hat 72 Commits (04.11. und 05.11.2026) und 195 geänderte Dateien (+27 643 / −3 741) gegenüber dem Vorfahren.
- **IST** `git merge-tree --write-tree origin/main origin/claude/youthful-sagan-bzmkkr`: **63 Konflikte** (59 Inhalt, 4 geändert/gelöscht) in `.gitignore`, `AGENTS.md`, `DECISIONS.md`, `PROGRESS.md`, `api/agent-chat.ts`, `apps/shop-api/shop/{accounts,cart,catalog,checkout}_api.py`, `main.py`, `apps/site/*`, 25 Dateien unter `apps/web/` (CSS, Startseite, Shop-Komponenten), `config/{acceptance-coverage,design-tokens,page-explainers,…}.json`, `apps/web/public/sitemap.xml`. Ein Zusammenführen des Ganzen ist nicht vertretbar.
- **IST** Auch gegen die Entwurfszweige: PR 67 gegen `claude/teileklar-backend` 65 Konflikte, gegen `claude/atelier-fehlerbehebung` 65, gegen die übrigen 63. Zusätzlich kollidieren `apps/shop-api/vercel_app.py` und `vercel.json` mit `claude/teileklar-backend`.
- **IST** Die Dateiliste (195 Einträge) liegt mit Status und „auf `main` vorhanden ja/nein“ im Scratchpad der Arbeit. Von 195 Dateien sind 74 neu (auf `main` nicht vorhanden), 4 geändert, aber auf `main` nicht mehr vorhanden (`DomainArtwork.tsx`, `PresenterEditorial.css`, `PublicContentLayout.css`, `public/sitemap.xml`), 117 geändert und auf `main` vorhanden.
- **ANNAHME** Die Gruppenzuordnung der Commits folgt Commit-Titel und berührten Pfaden, nicht einer Zeile-für-Zeile-Lesung. Gelesen wurden: das Shopkonzept (Überschriften und Sortiment-Abschnitt), die Diffs der Shop-API-Dateien, `TrustBar.tsx`, `VehicleBar.tsx`, `quotes_api.py` (Kopf), die Änderungen an `AGENTS.md` und `DECISIONS.md`.

## 2. Vorrangige Abhängigkeit: Sortimentsfrage

- **IST** Das Shopkonzept (`docs/shop/onlineshop-konzept-2026-11-04.md` im PR-Zweig, Abschnitt 0, Z. 19–40) hält fest: Der Lieferant BigBuy liefert im freigegebenen Teilbaum Universalzubehör, **keine** fahrzeugspezifischen Ersatzteile mit Typschlüssel-Passung. Vorschlag: „Eignung statt Pseudo-Passung“.
- **IST** Im führenden Konzept ist das offen (FK W-16, Entscheidung Nr. 18; `FUEHRENDES-KONZEPT.md` Z. 218–220, 457, 553).
- **SOLL** Alles, was Passung oder Fahrzeugbezug behauptet oder vorbereitet (Fahrzeugleiste, Garage, Passungsprüfung, Fahrzeugfilter), wird erst nach der Sortimentsentscheidung übernommen. Alles, was für beide Sortimente gilt (Produktpflichtfelder, Test der Preisfreigabe, Mailgrenze, Warenkorb-Sicherheit), kann vorher übernommen werden.
- **IST** Passung bleibt im Code „nicht geprüft“ (`catalog_api.py`, `fitment_status: "not_checked"`).

## 3. Urteile je Baustein

Urteile: **übernehmen** (auf Basis `main` neu anwenden, ggf. als Cherry-pick mit Konfliktlösung) · **anpassen** (Idee übernehmen, Umsetzung an heutigen Stand anpassen) · **Historie** (nicht übernehmen, bleibt als Quelle).
Die Spalte „Auf `main`“ prüft Pfad und Stichworte in `origin/main` (IST, `git grep` und `git cat-file`).

### 3.1 Shopkonzept und Konzeptdokumente

| Baustein | Was es ist | Auf `main` | Urteil | Grund / Abhängigkeit |
|---|---|---|---|---|
| `docs/shop/onlineshop-konzept-2026-11-04.md` (443 Z.; Commits `58d7f1b`, `e375287`, `740eddb`) | Gesamtkonzept TEILEKLAR im NeXify-Auftritt, Sortiment, Seitenstruktur, Texte, Rechts-Checkliste | nein | **übernehmen** als Dokument, mit Kopfzeile „Quelle, Entscheidung offen“ | Ist bereits Quelle des FK (SK67). Kein Code, keine Konflikte. Sortimentsteil bleibt bis Entscheidung Nr. 18 Annahme |
| `docs/shop/teileklar-vs-de-shop-2026-11-04.md` (51 Z.) | Vergleich mit deutschen Shop-Konventionen | nein | **übernehmen** als Dokument | Dokument; Behauptungen zu Wettbewerbern nicht geprüft (OFFEN) |
| `docs/architecture/0020-system-design-go-live.md` (114 Z.; `712b17e`, `94749fe`) | Systementwurf Go-live NeXify und TEILEKLAR | nein, aber Nummer 0020 auf `main` durch ADR Cognee belegt (FK W-39) | **Historie**; Inhalt auf Überholung gegenüber Führungsentscheidung 13.11. (Vercel) prüfen | Doppelte Nummer; Entwurf stammt vom 04.11., vor der Führungsentscheidung. Bei Übernahme neue Nummer (RE-01) |
| `docs/quality/test-strategy-2026-11-04.md`, `docs/quality/norm-gates-2026-11-04.md` | Teststrategie, Normtore | nein | **anpassen** | Nur lesen und mit der heutigen Prüfkette abgleichen (siehe `docs/04-betrieb/pruefkette-main-2026-11-14.md`) |
| `docs/gesamt-fertigstellungsplan-20261105.md`, `docs/regelkreis-setup-report-20261105.md`, `docs/automation/plugin-management-gesamtnachweis-20261105.md` | Pläne und Nachweise vom 05.11. | nein | **Historie** | Durch führendes Konzept und Migrationsplan abgelöst; D-018 hat den Regelkreis pausiert |

### 3.2 Shop-Oberfläche

| Baustein | Was es ist | Auf `main` | Urteil | Grund / Abhängigkeit |
|---|---|---|---|---|
| `TrustBar.tsx` + Textschlüssel `trust*` in `config/shop-interface-copy.json` (`808e200`) | Vertrauensleiste. Der Code nennt nur Aussagen, die die Plattform belegen kann; kostenloser Versand oder Rückgabe sind ausdrücklich nicht enthalten | nein | **anpassen** (TK-47) | Aussagen (Widerruf, Zahlung, Kontakt, Werkstatt) brauchen Rechtsprüfung; Werte für Versand und Schwelle: Inhaber. Textdatei konfliktbehaftet |
| `VehicleBar.tsx` + `ProductCard`/`ShopFrame`-Anbindung (`22e12d7`, `3895bae`) | Dauerhafte Fahrzeugauswahl (HSN/TSN/frei) im Browser (localStorage), meldet Wahl per Ereignis; filtert ausdrücklich keinen Katalog | nein | **Historie** bis Entscheidung Nr. 18; danach **anpassen** (TK-37) | Setzt Fahrzeugsortiment voraus; bei Universalzubehör wäre die Leiste irreführend. Datenschutz der Fahrzeugdaten OFFEN |
| `ProductShowcase.tsx/.css`, `ShopHomeTeaser.tsx` (`6f419f7`, `cb93b03`, `cb18158`) | Packshot-Bühne und Teaser auf Startseite und Shop | nein | **anpassen**, nach Design-Durchgang | `main` hat seither die Startseiten-Fassung #112–#117 (Atelier-System). Bildrechte und Katalogbezug: TK-46 |
| Änderungen an `CartView`, `Checkout`, `ProductCard`, `ProductDetail`, `AddressStep`, `OrderConfirmation`, `CatalogView`, `CategoryList`, `api.ts`, `shop.css`, `PartnerJourney`, `WorkshopFinder`, `TyreCalculator` (`808e200`, `b4568b8`) | Überarbeitung der Shop-Komponenten (Anzeige der Produktfelder, Grundpreis, Lieferfenster, „In den Warenkorb“ mit `mode:"add"`) | ja, in älterer Fassung; 7 davon konfliktbehaftet (CartView, CatalogView, Checkout, ProductDetail, ShopFrame, api.ts, shop.css) | **anpassen** | Frontend ist mit TK-11/TK-13/TK-14 und `claude/atelier-fehlerbehebung` im selben Schreibbereich; pro Komponente neu auf `main` anwenden, nicht übernehmen als Ganzes |
| `StudioScene.tsx/.css`, `config/studio-scenes.json`, `apps/web/public/media/studio/*.webp`, Presenter-Bild `pascal-zielbild.webp` (`2666da4`, `a63c350`) | Bildserie mit Figuren für Agenturseiten | nein | **Historie** | Durch Szenen-Videos (#99, #103, #104) und Atelier-System auf `main` überholt; Figurenfreigabe (D-PORTRAIT) nicht gegengeprüft |

### 3.3 Shop-API (Backend)

| Baustein | Was es ist | Auf `main` | Urteil | Grund / Abhängigkeit |
|---|---|---|---|---|
| Produktpflichtfelder in `catalog_api.py` (`manufacturer`, `delivery_days_min/max`, `net_content`, `unit`, `suitability`, `safety_notes`, `disposal_class`, `scope_of_delivery`; Stichprobe der Diff gelesen) + `tests/test_product_fields.py` (`808e200`) | Felder werden nur durchgereicht, wenn wohlgeformt; sonst `None`/leer. Hinweis im Code: `details.manufacturer` von BigBuy ist eine Lieferantennummer, kein Name | nein (Stichwort `delivery_days_min` fehlt auf `main`) | **übernehmen** (TK-11), als Grundlage | Unabhängig vom Sortiment. Die **Veröffentlichungssperre** für unvollständige Artikel steht nicht in PR 67 (OFFEN, selbst zu bauen). Welche Angaben rechtlich Pflicht sind: Recht (TK-34) |
| Warenkorb: Idempotenz mit `Idempotency-Key`, `mode:"add"`, Revision `rev`, Merge mit Token, nur ausgegebene Gast-Kennungen (`cart_api.py`, `b4568b8`, `892c94e`; `checkout_api.py` +`$inc rev`) + `test_cart_idempotency.py`, `test_cart_merge_safety.py` | Behebt Doppelbuchung nach verlorener Antwort und Verlust beim Zusammenführen | nein (Stichwort `"rev"` fehlt) | **übernehmen** | Konflikt in `cart_api.py`, `checkout_api.py` zu lösen. Gegen `claude/teileklar-backend` (ändert `db.py`, `main.py`, `requests_api.py`) prüfen. Frontend muss `mode:"add"` senden: Abgleich mit `api.ts` |
| Mailer: atomare Tagesgrenze über `mail_quota`, `MAIL_DAILY_CAP=0` als volle Sperre (`mailer.py`, `4e5ce2e`, `14151dc`, `abbd744`, `cdaab78`) + `test_mailer_cap.py`; Sammlung `mail_quota` in `vercel_app.py` | Beseitigt Wettlauf bei der Tagesgrenze | nein | **übernehmen**, **vor** der Aktivierung der Shop-API | `vercel_app.py` ist auch Schreibbereich von TK-01 und hat auf `claude/teileklar-backend` neue Konflikte. Die Sammlung muss im Namensraum der Datenbank angelegt sein, sonst antwortet die API 503 (Hinweis im Code) |
| `accounts_api.py`: `email_verified` (false bei Registrierung) + Sicherheits-Negativtests (`0abc4cc`) | Registrierung vergibt nie Verifizierung oder Rolle | `email_verified` kommt auf `main` nur in Tests der Suite vor, nicht in `accounts_api.py` | **anpassen** | Überschneidung mit PR 118 (ändert `accounts_api.py`) und TK-04/TK-07; mit dem Konten-Schreiber abstimmen |
| `quotes_api.py` + `test_quotes_api.py` (`c65c5b1`, `e0fdb52`) + Rewrites in `vercel.json` | Angebotsentwurf für angemeldete Konten, in Sammlung `requests`, ohne Preise, PDF-Text, Mail über Outbox. Portiert aus `apps/agent-gateway` | nein | **anpassen** (Teil von AG-01) | Gehört zum Angebotsweg der Agentur, nicht zu TEILEKLAR. Rechts- und Preisfragen (AG-01). Konflikt in `main.py` und `vercel.json` |
| Tests: `test_pricing`, `test_price_release`, `test_order_status`, `test_admin_authz`, `test_accounts_security`, `test_workshops_api`, `requirements-test.txt` (`9192bb3`, `652b221`, `82dbf58`, `3e5f8f3`, `be23858`) | Nagelt Geldrechnung, Preisfreigabe-Sperre, Bestellstatus, Admin-Rechte, Werkstattsuche fest | nein (auf `main` nur 3 Tests unter `apps/shop-api/tests/`) | **übernehmen** | Ohne Konflikt, neue Dateien. Erst nach `make test`-Messung auf `main` einspielen, damit die Zahl der Fehler nicht vermischt wird |
| `tests/test_bigbuy_import_integrity.py`, `test_shop_recovery_contract_20261031.py` (Änderungen) | Anpassungen an die obigen Änderungen | ja | **anpassen** | Folgen den jeweiligen Backend-Paketen |

### 3.4 Prüfwerkzeuge, Belege, Konfiguration

| Baustein | Was es ist | Auf `main` | Urteil | Grund |
|---|---|---|---|---|
| `tools/css-norm.mjs`, `tests/css-norm.test.mjs`, `tools/regel-pruefung.js` und `regel-pruefung.ausnahmen.json` (`faf6803`, `0a1fe5c`) | Prüfung der Gestaltungsnorm | nein / geändert | **Historie** | An die damalige warme Palette gebunden; auf `main` gilt das Atelier-System |
| `tools/check_image_uniqueness_evidence.py`, `config/image-uniqueness-baseline.json`, Tests, Beleg (`f589326`, `266d6af`) | Einmaligkeit von Bildern als Prüftor | nein | **anpassen**, später | Idee gut (keine Doppelbilder), Basislinie veraltet |
| `tools/generate_sitemap.py`, `tests/test_public_sitemap.py`, `apps/web/public/sitemap.xml` (`3eee7ec`) | Sitemap aus der Seitenkarte | `apps/web/public/sitemap.xml` auf `main` nicht mehr vorhanden (Änderung/Löschung kollidiert); Generator nein | **Historie**, abgleichen mit BE-03 | BE-03 plant die Steuerung über `robots.ts`/`sitemap.ts` (Plan, nicht geprüft); Indexierung ist Inhaberentscheidung (Nr. 24) |
| `tools/check_browser_evidence.py` und ca. 25 `evidence/**`-Dateien (Beleg-Neuerzeugungen) | Browserbelege, an Quell-Hashes gebunden | ja | **Historie** | Die Belege sind auf `main` bereits veraltet (siehe Prüfkettenbericht). Neuerzeugung nur nach Browserlauf, nie durch Übernahme von Hashes |
| `config/acceptance-coverage.json` (+108/−75), `PROGRESS.md`, `DECISIONS.md`, `AGENTS.md`, `CLAUDE.md` | Register und Regelwerk | ja | **Historie** | `AGENTS.md` und `DECISIONS.md` sind führend auf `main`; Änderungen am Register nur über den Registerführer |
| `config/site-map.json` (+6 775/−1 663), `page-explainers.json`, `page-media-registry.json`, `shop-interface-copy.json` (+540) | Texte und Seitenkarte | ja | **Historie** (Seitenkarte), **anpassen** (`shop-interface-copy.json`: Texte der Produktfelder und Vertrauensleiste) | `main` hat die Seitenkarte durch #102 (Impressum) umgestellt; Neubau würde diese überschreiben |
| Designsystem: `docs/design/design-system-authoritative-20261105.md`, `authoritative-startseite-20261105/*`, `packages/tokens/*`, `config/design-tokens.json`, `masterplan-tokens.css`, `prototypen/*` (Palette) | „Maßgebliches Designsystem = hochgeladene NeXify_Startseite“ (D-DESIGN-20261105) | ja (konfliktbehaftet) | **Historie** | Durch das Atelier-System auf `main` (#112–#117, 13.–14.11.) überholt. Ob D-DESIGN-20261105 in `DECISIONS.md` auf `main` geführt oder ersetzt ist, wurde nicht geprüft (OFFEN) |
| Ruflo-Integration (`config/integrations/ruflo*.json`, `.claude/skills/*`, `.claude-flow/*`, `docs/automation/ruflo.md`; `64a195a`, `e375287`, `673dae5`, `4ea4a69`) | Gepinnte Agenten-Orchestrierung | nein | **nicht übernehmen** | Keine Verbindung zu TEILEKLAR; würde Agentenwerkzeuge ins Repository bringen, ohne Entscheidung zum Agentenkern (PR 121). Eigenes Thema, Inhaberentscheidung |
| `api/agent-chat.ts`, `packages/agent-runtime/*` (`a81303a`, `e0fdb52`) | Öffentlicher Chat gegen das Modell der Policy | ja | **Historie** | `main` hat den Chat seither mehrfach umgebaut (#106, #116) |
| `apps/site/*` (Tests, Fixtures) | Tests der älteren Vite-Auslieferung | ja | **Historie**, einzelne Tests prüfen | `apps/web` ist laut Führungsentscheidung 13.11. die Auslieferung |

## 4. Zusammenfassung der Übernahmeliste

**Zuerst, ohne Sortimentsentscheidung:**
1. Shopkonzept und Vergleich als Dokumente (kein Konflikt).
2. Neue Tests der Shop-API (Geld, Preisfreigabe, Bestellstatus, Admin-Rechte, Konten), nach der Messung auf `main`.
3. Warenkorb-Idempotenz und Merge-Sicherheit.
4. Mailer-Tagesgrenze mit `mail_quota` (im Zug von TK-01, nicht davor).
5. Produktpflichtfelder (TK-11), Veröffentlichungssperre neu bauen.

**Nach Inhaberentscheidung Nr. 18 (Sortiment):** Fahrzeugleiste und alles mit Passungsbezug (TK-37); Eignungsangaben in der Oberfläche.

**Nach Freigabe von Werten und Rechtsprüfung:** Vertrauensleiste (TK-47).

**Nicht übernehmen (Historie):** Designsystem-Wechsel vom 05.11., Studio-Szenen, Ruflo, Beleg-Neuerzeugungen, Registerstände, Seitenkarte als Ganzes, Sitemap-Generator, alte Vite-Tests.

## 5. Zuordnung der 72 Commits

| Gruppe | Commits | Urteil |
|---|---|---|
| Shopkonzept und Konzeptdokumente | `58d7f1b`, `e375287`, `740eddb`, `712b17e`, `94749fe`, `8f54a54`, `c21b780`, `f38ab41`, `84499a2`, `bb776c5`, `0d3fecf` | Dokumente übernehmen, Pläne und Protokolle Historie |
| Shop-Oberfläche | `808e200`, `6f419f7`, `cb93b03`, `cb18158`, `22e12d7`, `3895bae`, `be7fb40`, `1fba865`, `c76a883`, `81180f5` | anpassen / Historie (Fahrzeugleiste) |
| Shop-API: Warenkorb, Mailer, Konten, Tests | `b4568b8`, `892c94e`, `4e5ce2e`, `14151dc`, `abbd744`, `cdaab78`, `0abc4cc`, `9192bb3`, `652b221`, `82dbf58`, `3e5f8f3`, `be23858`, `afbc0d5`, `01fcc5b`, `7365446` | übernehmen (Tests, Warenkorb, Mailer), anpassen (Konten) |
| Angebotsentwurf | `c65c5b1`, `e0fdb52` | anpassen (AG-01) |
| Öffentlicher Chat | `a81303a` | Historie |
| Designsystem, Palette, Bildserie | `6792331`, `faf6803`, `ccc223f`, `5dbf659`, `8ff1550`, `5a4e5be`, `e5a0ad4`, `05ef1ef`, `4fc4929`, `6c92bce`, `2666da4`, `a63c350`, `d2c3722`, `0a1fe5c`, `c76a883` (Rand) | Historie |
| Beleg-Neuerzeugungen | `753686b`, `a07a5f5`, `1ef006f`, `7de8f91`, `745c2fc` | Historie |
| Prüftore (Bilder, Sitemap, Normen) | `f589326`, `266d6af`, `fe64a8f`, `3eee7ec` | anpassen später / Historie |
| Ruflo und Plugin-Verwaltung | `64a195a`, `e375287`(Teil), `673dae5`, `4ea4a69`, `513dc0f`, `f9c8641` | nicht übernehmen |
| Regelkreis-Berichte | `d218573`, `9147871`, `2de4270`, `709493d`, `41e7a12` | Historie |

(Doppelnennung bei `e375287` und `c76a883`: der Commit berührt zwei Bereiche. **ANNAHME**: Zuordnung nach überwiegendem Pfad; 72 Commits sind vollständig vergeben, eine Zeile-für-Zeile-Prüfung steht aus.)

## 6. Was nicht geprüft wurde

- Kein Commit wurde ausgeführt, getestet oder cherry-gepickt. Die Tests aus PR 67 wurden nicht gegen `main` gestartet.
- Die Zuordnung der Commits beruht auf Titeln und Pfaden, nicht auf vollständiger Lektüre.
- Ob die Behauptungen aus `teileklar-vs-de-shop` stimmen, ist nicht geprüft.
- Wechselwirkung der Übernahmen mit PR 118 und mit `claude/atelier-fehlerbehebung` ist nur über `merge-tree` bekannt, nicht inhaltlich geprüft.
- Eintrag in das Aufgabenregister (P12–P14, OF-08) steht aus.
