# Katalog-Übernahme teileklar.shop → nexifyai.de · 16.11.2026

Zweig `claude/katalog-uebernahme`, ausgehend von `claude/shop-supabase-migration` (578363e, PR #208).
Ziel: Der Shop-Bereich auf nexifyai.de zeigt statt 0 Produkten den Katalog des bisherigen Shops – mit Bild und Preis.
Ziel-Datenbank ist die **bestehende MongoDB** der neuen Fassung, Namensraum `nexify_teileklar_shop_v1`. Der Supabase-Umzug
bleibt unberührt. Alle Belege liegen unter `docs/04-betrieb/belege/katalog-uebernahme-2026-11-16/`.

## 1. Ergebnis in fünf Sätzen

1. Der Übertragungsweg über die öffentliche Schnittstelle ist fertig, getestet und lokal gegen einen **produktionsgleichen
   Namensraum** (gleiche Validatoren, gleiche Indizes, Prüfung von `vercel_app.check_metadata` besteht vorher und nachher)
   vollständig gelaufen: 3713 Artikel, 7 Kategorien, Prüfsummen Quelle = Ziel, zweiter Lauf schreibt nichts.
2. **Gegen die Produktionsdatenbank ist nichts gelaufen.** Dafür fehlt der Zugang; den liest und setzt diese Sitzung nicht
   (Abschnitt 7: was der Inhaber tun muss, 4 Handlungen).
3. **Die Quelle ist schlechter als angenommen:** Von 3720 Artikeln sind 7 Schauartikel mit Platzhalterbild, und von den
   übrigen 3713 haben nur **273 ein Bild, das tatsächlich lädt** (2932 Bildadressen antworten 404, 405 sind 0-Byte-Dateien –
   auch im alten Shop). Übernommen werden alle 3713 unverändert, **sichtbar geschaltet nur die 273 mit ladendem Bild**.
   Keine leeren Bildkacheln.
4. Das Abnahmekriterium „mindestens 3720 Artikel“ ist damit **nicht erfüllbar, ohne Platzhalter oder kaputte Bilder zu
   zeigen**. Erfüllt sind: Kategorienliste nicht leer (6 sichtbare Kategorien), kein sichtbarer Artikel ohne Bild, kein Artikel
   ohne Preis in den Daten, Stichprobe 20/20 Feld für Feld gleich.
5. **Preise erscheinen auf nexifyai.de erst, wenn eine kleine Code-Änderung auf `main` ist** (Produktion wird von `main`
   gebaut, dieser Zweig ist es nicht). Ohne sie zeigt der Shop nach dem Datenlauf 273 Artikel mit Bild und dem Hinweis
   „Verkaufspreis noch nicht verfügbar“. Fertiger, gegen `main` getesteter Patch: `belege/…/main-preisanzeige.patch`.

## 2. Gemessene Fakten zur Quelle (16.11.2026, 01:05–01:35 UTC)

| Messung | Ergebnis | Beleg |
|---|---|---|
| Blättern | `page` wird **ignoriert** (jede Seite = Seite 1); `offset` wirkt; `limit` höchstens 500; Reihenfolge nach Name, bei gleichen Namen nicht stabil. Der erste Lauf mit `page=N` brach korrekt ab („Kennung doppelt geliefert“). Die Angabe „Seite 37 liefert 100 Artikel“ stimmt – es sind dieselben 100 wie auf Seite 1. | `00-blaettern-messung.txt`, `01-trockenlauf-live-abbruch.jsonl` |
| Vollständigkeit | Fenster 500 Artikel, Schritt 400 (Überlappung 100): **3720 verschiedene Kennungen in einem Durchgang**, 10 Abrufe, 1,5 s Pause | `02-…`, `final/1-trocken.jsonl` |
| Zusammensetzung | 3713 Artikel `source: BigBuy`, `status: catalog`; **7 Schauartikel** „TEILEKLAR Select“ (`airfilter`, `brake`, `brake-pads-front`, `brake-rear`, `exhaust`, `oil`, `shock`) mit Bild aus `assets/…` (z. B. `assets/part-placeholder.png`), Bestand 0 | Protokoll `skipped_placeholders` |
| Preis | jedes Feld `value` > 0; 13 Preisangaben in abweichender Schreibweise (`.71 €`, `1,048.70 €`, `19,90 €`), Betrag stimmt jeweils mit `value` überein | Tests `test_price_spellings…` |
| Bild | 3604 verschiedene Adressen unter `https://cdnbigbuy.com/images/`. **267 laden** (JPEG, Länge > 0), **2932 = 404**, **405 = 0 Byte**. Der Bild-Proxy des alten Shops leitet bei 404 nur per 302 auf dieselbe tote Adresse um. Zweimal gemessen (GET mit Range 01:12–01:21 UTC; HEAD in jedem Lauf), gleiches Ergebnis. | `08-bildpruefung-cdnbigbuy.json`, Schritt `images` in jedem Protokoll |
| Bestand | nur 17 Artikel mit Bestand > 0 (14 davon mit ladendem Bild) | Snapshot |
| Datenalter | `created_at` aller Artikel 11.10.2026; `/api/shop/status` zeigt dieses Datum als `last_import_at` | Bericht |

## 3. Was gebaut wurde

| Datei | Zweck |
|---|---|
| `apps/shop-api/transfer_public_catalog.py` | Liest die öffentliche Schnittstelle (nur GET, ohne Anmeldung, Pause, begrenzte Wiederholung), bildet ab, prüft jede Bildadresse beim Lieferanten, schreibt über die Transaktions- und Prüfsummenlogik von `transfer_catalog.py`. Trockenlauf ist Standard. Teilläufe (`--limit`) und Läufe aus einer Datei (`--from-snapshot`) sind **nur gegen eine Probedatenbank** zugelassen; der Namensraum wird nie teilweise beschrieben. |
| `apps/shop-api/transfer_catalog.py` | Erweitert, nicht gelockert: Vertragsprüfung und Produktprüfung je Übernahmeart (`profile`); Probelauf-Schalter; Sammelschreiben in Blöcken zu 500 statt Einzelschreiben (hält die Transaktion gegen eine entfernte Datenbank unter der 60-s-Grenze). Verhalten für die BigBuy-Erstbefüllung unverändert (alle bisherigen Tests grün). |
| `apps/shop-api/contracts/katalog-uebernahme-teileklar-2026-11-16.json` | Vertragsdatei nach den Regeln in `check_contract` (Abschnitt 5) |
| `apps/shop-api/shop/catalog_api.py` | Anzeige: Listenpreis nur bei Artikeln dieser Übernahme (Marke `approved_by_transfer_contract` **und** Herkunft `teileklar_public_catalog`); sonst bleibt die Preisfreigabe-Regel unverändert. Neues Feld `orderable`. |
| `apps/shop-api/shop/cart_api.py` | Warenkorb weist Artikel ohne Einkaufspreis ab (`409 product_not_orderable`); vorher wäre der Preisweg mit `KeyError` gescheitert. |
| `apps/shop-api/shop/store/catalog.py`, `store/pg/catalog.py` | Listenfelder um `list_price_cents`, `list_price_status`, `source`; Preissortierung berücksichtigt Listenpreis (nur MongoDB). |
| `.github/workflows/katalog-uebernahme.yml` | Produktivlauf: nur in GitHub-Umgebung `katalog-produktion`, Trockenlauf → Lauf → Abnahme an nexifyai.de → Belege als Artefakt |
| `apps/shop-api/tools_accept_public_catalog.py` | Abnahme an der öffentlichen Seite (nur lesend) |
| `apps/shop-api/tools_check_catalog_api.py`, `tools_local_namespace_probe.py` | Lokale Prüfwerkzeuge (verweigern alles außer 127.0.0.1) |
| `apps/shop-api/tests/test_public_catalog_transfer.py` | 19 Tests: Lesen, Abbildung, Bildprüfung, Vertrag, Schreiben, Befehlszeile, Anzeige |

**Abbildung (nichts erfunden):** `_id` = Kennung der Quelle; `bigbuy_id` = dieselbe BigBuy-Artikelnummer als Text (der
Namensraum verlangt einen eindeutigen, lückenlosen Index auf `bigbuy_id`; ohne Wert scheitert ab dem zweiten Artikel jeder
Lauf mit `DuplicateKeyError 11000` – lokal nachgestellt; die numerische BigBuy-Kennung liefert die Quelle nicht);
`list_price_cents` = `value` × 100 (nur wenn exakt und gleich der Preisangabe); `images` = die im Bildpfad kodierte
Lieferantenadresse; `details` = `specs` als Bezeichnung → Wert; `imported_at` = `created_at`; **der vollständige
Quelldatensatz bleibt unverändert unter `legacy`**. `active` = Bild lädt beim Lauf; `buyable` = false; kein `purchase_cents`.

## 4. Bilder (Aufgabe 4)

- **Bildstrecke:** Der neue Shop hat **keinen** Bild-Proxy wie `/api/shop/image`. Er zeigt Lieferantenbilder direkt, nur von
  `https://cdnbigbuy.com/images/…` (`supplier_image` in `catalog_api.py`, gleiche Regel im Frontend `api.ts`); die
  Inhaltsrichtlinie in `vercel.json` erlaubt `img-src https://cdnbigbuy.com/images/`. Die Übernahme dekodiert deshalb den
  `src`-Parameter und speichert die Lieferantenadresse; jede gespeicherte Adresse besteht `supplier_image`.
- **Laden die Bilder?** Für 267 Adressen ja (HTTP 200, `image/jpeg`, JPEG-Signatur `ffd8ffe0/e1`, mit Referer nexifyai.de).
  Für 3337 nein – unabhängig vom neuen Shop, auch der alte zeigt dort nichts.
- **Folge:** Sichtbar sind nur die 273 Artikel mit ladendem Bild. Die übrigen 3440 liegen unverändert und unsichtbar im
  Namensraum und werden ohne neuen Lauf nicht sichtbar. Wird ein Bild beim Lieferanten repariert, macht der nächste
  Lauf den Artikel sichtbar.
- **Nicht geprüft:** echte Darstellung im Browser auf nexifyai.de (geht erst nach dem Produktivlauf); ob BigBuy die
  fehlenden Bilder unter anderer Adresse führt (bräuchte die BigBuy-Schnittstelle = Vertrag/Zugang, ausdrücklich nicht Teil
  dieses Wegs; Adressen raten wäre erfinden).

## 5. Importsperre und Vertragsdatei (Aufgabe 2)

`require_publication_contract()` in `shop/bigbuy_import.py` ist **unverändert** und sperrt weiter jeden BigBuy-Import; dieser
Weg benutzt den BigBuy-Import nicht. Erfüllt wird die Vertragsprüfung der Übernahme (`check_contract` in
`transfer_catalog.py`), jetzt mit eigener Übernahmeart `catalog_public_api_transfer`. Pflichtwerte: Geltungsbereich, Mandant
`teileklar`, Quelladresse, Ziel-Namensraum, `list_prices_approved: true` (als Wahrheitswert), Mindestzahl; Pflichttexte:
Datenrecht, Preisherkunft, Freigebender, Zeitpunkt. Unbekannte Felder brechen ab. Ohne passende Datei wird nicht einmal die
Quelle gelesen (getestet). Prüfsumme und Verweise stehen im Lauf-Eintrag `imports`. Die Mindestzahl ist **3713**, nicht 3720
(Abschnitt 2, Schauartikel).

Grenze wie zuvor: Das Skript prüft, dass der Nachweis vollständig benannt ist, nicht, dass er stimmt. Der Eintrag
`approved_by` gibt die über die koordinierende Sitzung übermittelte Freigabe wieder; bestätigt wird sie erst, wenn der
Inhaber den Produktivlauf in GitHub freigibt (Abschnitt 7).

## 6. Läufe, Tests, Abnahmeprüfung (Aufgaben 3 und 5)

Lokale MongoDB 8.0.4 als Ein-Knoten-Replikat (Transaktionen), Quelle immer die **lebende** Schnittstelle, außer wo „Datei“ steht.

| Lauf | Ergebnis | Beleg |
|---|---|---|
| Probe 20 Artikel, trocken | 20/20, Prüfsummen gleich, nichts geschrieben | `03-probe20-trocken.jsonl` |
| Probe 20 Artikel, echt (Probedatenbank) | 20 geschrieben, Stichprobe Feld für Feld 20/20 | `04-probe20-echt.jsonl`, `04-probe20-echt-bericht.json` |
| Probe 20, Wiederholung | 0 geschrieben, 20 unverändert | `05-probe20-wiederholung.jsonl` |
| Voll, produktionsgleicher Namensraum, trocken | 3713 / 7, Prüfsummen gleich, 273 sichtbar, Stichprobe 40/40 | `final/1-trocken.jsonl` |
| Voll, echt | 3713 / 7 geschrieben, Prüfsummen gleich, 273 sichtbar, Stichprobe 40/40 | `final/2-echt.jsonl`, `final/2-echt-bericht.json` |
| Voll, Wiederholung | 0 geschrieben, alles unverändert | `final/3-wiederholung.jsonl` |
| Namensraum-Prüfung der App vorher/nachher | `ok` / `ok` | `final/ns-before.txt`, `final/ns-after.txt` |
| Shop-Schnittstelle lokal (Katalog- und Warenkorb-Router des Dienstes auf dieser Datenbank) | 273 gelistet, 0 ohne Preis/Bild, Detail 20/20, Warenkorb 409 | `final/api-check.json`, `final/abnahme-lokal.json` |
| Frühere Läufe ohne Bildprüfung bzw. ohne `bigbuy_id` (überholt, nur zur Nachvollziehbarkeit) | 3713 sichtbar – dabei 3440 mit totem Bild; im Produktivnamensraum wäre der Lauf am Index gescheitert | `06-…`, `07-…` |

**Stichprobe Feld für Feld:** Je Artikel werden alle 23–24 Felder des Quelldatensatzes mit `legacy` im Ziel verglichen und
die abgeleiteten Felder (Name, Preis in Cent, Bild, Bestand, Kategorie) neu berechnet und verglichen; 20 gleichmäßig verteilt
über alle Artikel und 20 über die sichtbaren. Zusätzlich über die Detailseite der Shop-Schnittstelle (Name, Preis, Bild,
Bestand, Artikelnummer, EAN, Kategoriename).

**Tests:** `apps/shop-api/tests` 307 Tests, 0 rot, 173 übersprungen (brauchen lokales PostgreSQL; hier keins – Vorarbeit:
295/219/76 mit PostgreSQL). Gegenprobe: zwei Fehler absichtlich eingebaut (Herkunftsprüfung der Preisanzeige entfernt;
Widerspruchsprüfung beim Lesen entfernt) – beide von den neuen Tests erkannt, danach zurückgesetzt.
`tests/test_product_presentation_integrity.py`: 3 von 4 grün; der vierte braucht `apps/web/node_modules` (hier nicht
installiert) und ist ohne meine Änderung genauso rot. CI am Zweig: Jobs laufen; rot sind `next-web test:auth` und
`repository` – ausschließlich mit Dateien, die dieser Zweig nicht berührt (veraltete Prüfsummen u. a. in `apps/site`,
`apps/web`, Bildstapel-Tests).

### 6a. Endstand der Läufe im produktionsgleichen Namensraum

Lokale MongoDB 8.0.4, Namensraum `nexify_teileklar_shop_v1` mit Validator-Marke und genau den Indizes aus
`vercel_app.INDEXES` (u. a. `bigbuy_id` eindeutig), angelegt mit `tools_local_namespace_probe.py`. Quelle: lebende Schnittstelle.

| Schritt (UTC) | Ergebnis |
|---|---|
| Namensraumprüfung der App vorher | `ok`, 0 Produkte (`ns-before.txt`) |
| 01:28 Trockenlauf | Bilder 3604: 267 laden, 3337 nicht; 7 Platzhalter ausgelassen; Kategorien 7 = 7, Produkte 3713 = 3713, Prüfsumme `208e035b…` beidseitig; 273 sichtbar; Stichprobe 40/40; nichts geschrieben |
| 01:33 echter Lauf | 3713 + 7 eingefügt, Prüfsummen gleich, Lauf-Eintrag `catalog-public-transfer-2ce8366c…` mit Vertragsprüfsumme; 273 sichtbar; Stichprobe 40/40 |
| 01:37 Wiederholung | 0 eingefügt, 0 geändert, 3713 + 7 unverändert; gleicher Lauf-Eintrag |
| Namensraumprüfung der App nachher | `ok`, 3713 Produkte, 273 sichtbar (`ns-after.txt`) – die App würde den Namensraum nach dem Lauf weiter bedienen |
| Shop-Schnittstelle (Router des Dienstes, ASGI) | `/status` 273; 6 Kategorien; 273 gelistet, 0 ohne Preis, 0 ohne Bild; Detail-Stichprobe 20/20 (Name, Preis, Bild, Bestand, Artikelnummer, EAN, Kategorie); Warenkorb-Hinzufügen eines übernommenen Artikels → 409 (`api-check.json`) |
| Abnahmewerkzeug über HTTP (uvicorn, dieselben Router) mit `--expect-prices` | Fehlerliste leer, Stichprobe 20/20 (`abnahme-lokal.json`) |

### 6b. Abnahmeprüfung

| Kriterium | Ergebnis |
|---|---|
| mindestens 3720 Artikel | **nicht erfüllt.** 3720 in der Quelle; 7 davon Platzhalter → 3713 übernommen; davon **273 sichtbar** (nur diese haben ein ladendes Bild). |
| Stichprobe 20 identisch zur Quelle | erfüllt lokal: 20/20 über alle, 20/20 über die sichtbaren (alle Quellfelder), 20/20 über die Detailseite inkl. Preis. An nexifyai.de prüft das der Workflow nach dem Produktivlauf (ohne Preis, solange der Patch nicht auf `main` ist). |
| Kategorienliste nicht leer | erfüllt: 7 Kategorien im Namensraum, 6 mit sichtbaren Artikeln |
| keine Artikel ohne Preis oder Bild | erfüllt für alle sichtbaren Artikel (Bild lädt nachweislich, Preis vorhanden). Preis **wird auf nexifyai.de erst angezeigt**, wenn der Patch auf `main` ist. |

## 7. Was der Inhaber tun muss (Aufgabe 6)

Diese Sitzung liest, setzt und sieht keine Zugangsdaten. Die App selbst kann den Lauf nicht ausführen: Der Vercel-Einstieg
ist bewusst ohne Import- und Schreibwege gebaut (`vercel_app.py`: „No seeds, migrations…“), die Funktion endet nach 30 s,
und ein Verwaltungskonto gibt es im Namensraum nicht. Der Lauf findet deshalb in GitHub Actions statt, in einer Umgebung,
die nur der Inhaber freigeben kann.

1. **Umgebung absichern** – GitHub, Repository `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` → *Settings* →
   *Environments* → `katalog-produktion` anklicken (GitHub hat sie beim ersten Lauf um 01:36 UTC **ohne** Schutz angelegt) →
   bei *Deployment protection rules* „Required reviewers“ anhaken und das eigene Konto eintragen → *Save protection rules*.
   Ohne diesen Schritt würde Schritt 4 sofort und ohne Rückfrage schreiben.
2. **Zugang hinterlegen** – in derselben Umgebung → *Environment secrets* → *Add environment secret* → Name genau
   `CATALOG_TARGET_MONGO_URL`, Wert = derselbe Wert wie die Variable `MONGODB_URI` im Vercel-Projekt hinter nexifyai.de
   (Vercel → Projekt → *Settings* → *Environment Variables* → `MONGODB_URI`, Umgebung *Production*). Ist sie dort als
   „Sensitive“ nicht lesbar: den Verbindungstext desselben Clusters und Benutzers aus MongoDB Atlas (*Database* → *Connect*
   → *Drivers*). Der Wert wird nirgends sonst eingetragen, nicht im Chat, nicht im Repository.
3. **Netzzugang prüfen** – MongoDB Atlas → *Network Access*: Steht dort `0.0.0.0/0` (üblich bei der Vercel-Anbindung), ist
   nichts zu tun. Stehen nur feste Adressen, kommen GitHub-Runner nicht hinein; dann den Lauf stattdessen vom eigenen
   Rechner starten (Abschnitt 7a) – keine Freigabe weiter öffnen.
4. **Lauf auslösen und freigeben** – **Gesperrt seit 02:05 UTC (Produktions-Gate, Kommentar am PR #214).** Lauf #2
   **nicht** erneut starten: Er stammt aus dem alten Workflow-Stand mit Auslöser auf dem Feature-Zweig. Der Workflow startet
   jetzt nur noch manuell (*Actions* → „Katalog-Übernahme teileklar.shop“ → *Run workflow*) und der Job nur auf `main`.
   Voraussetzung ist also, dass der geprüfte Stand auf `main` ist, mit APPROVED-Review und grüner CI. Danach *Run workflow*
   auf `main` → bei „Waiting“ *Review deployments* → `katalog-produktion` → *Approve and deploy*. Dauer rund 15 Minuten.
   Grün heißt: geschrieben **und** an nexifyai.de abgenommen (mindestens 273 sichtbar, alle mit Bild, Stichprobe 20/20).
   Offen laut Gate: vorgelagerter Staging-/Smoke-Lauf und ein ausführbarer Rückweg (Abschnitt 10).

**Damit auch Preise erscheinen (eigene Entscheidung, unabhängig von 1–4):** Den Patch
`docs/04-betrieb/belege/katalog-uebernahme-2026-11-16/main-preisanzeige.patch` (2 Dateien, +20/−5, nur `apps/shop-api`) auf
einem neuen Zweig von `main` anwenden und per PR nach `main` mergen; Vercel baut Produktion von `main`. Diese Sitzung darf
nicht nach `main` und auf keinen anderen Zweig pushen – das kann die koordinierende Sitzung oder der Inhaber. Gegen `main`
geprüft: gleiche Fehlermenge der Python-Suite mit und ohne Patch (45, alle vorbestehend); Funktionsprobe zeigt Listenpreis
4,17 € für einen übernommenen Artikel und unverändert 15,47 € für ein BigBuy-Produkt mit Freigabe.

**Zu bestätigen (keine Handlung, aber Entscheidung):** dass nur Artikel mit ladendem Bild sichtbar werden (273 statt 3713)
und die 7 Schauartikel nicht übernommen werden. Wer alle 3713 sichtbar will, nimmt bewusst 3440 leere Bildkacheln in Kauf;
das ist nicht eingebaut.

### 7a. Ersatzweg vom eigenen Rechner

Voraussetzung: Python 3.12, Vercel-Anmeldung, Netz zur Datenbank. Im Repository auf `claude/katalog-uebernahme`:
`vercel env pull .env.katalog --environment=production` (holt `MONGODB_URI` in eine lokale Datei, die nicht eingecheckt
wird), dann `pip install --require-hashes -r apps/shop-api/requirements.txt` und
`set -a; . ./.env.katalog; set +a; CATALOG_TARGET_MONGO_URL="$MONGODB_URI" CATALOG_TARGET_DB_NAME=nexify_teileklar_shop_v1 python apps/shop-api/transfer_public_catalog.py --log lauf.jsonl`
(Trockenlauf), danach derselbe Befehl mit `--apply --publication-contract apps/shop-api/contracts/katalog-uebernahme-teileklar-2026-11-16.json`.
Danach `.env.katalog` löschen. Ist `MONGODB_URI` als „Sensitive“ markiert, liefert `vercel env pull` keinen Wert; dann nur der Weg über GitHub.

## 8. Was ausdrücklich nicht geprüft ist

- Kein Lauf gegen die Produktionsdatenbank, kein Blick hinein. Ob dort heute schon Dokumente in `products`/`categories` liegen,
  ist nur über die öffentliche Seite gemessen (`/api/shop/status`: 0 Produkte, 01:30 UTC). Liegen dort Produkte mit gleicher
  Kennung, werden sie ersetzt; andere bleiben unberührt (es wird nie gelöscht).
- MongoDB-Version und Zeitgrenzen der Produktion (lokal 8.0.4; Sammelschreiben gegen die 60-s-Transaktionsgrenze ist nur lokal gemessen: 3713 Artikel in rund 2 s).
- Ob GitHub-Runner die Produktionsdatenbank erreichen (Atlas-Netzfreigabe, Abschnitt 7 Schritt 3).
- Darstellung im echten Browser auf nexifyai.de, mobil und Desktop; `tools/gleichmacher.mjs` und `tools/live-check.mjs`
  sind nicht gelaufen (kein Produktivstand mit Daten).
- Ob der Warenkorb im Frontend die Ablehnung verständlich anzeigt: Das Frontend ist bewusst unverändert (sonst verfallen die
  gebundenen Browserbelege); bei den 14 sichtbaren Artikeln mit Bestand erscheint beim Klick auf „In den Warenkorb“ die
  allgemeine Fehlermeldung. Bestellt werden kann nichts.
- Preissortierung mit PostgreSQL-Speicher (nur MongoDB angepasst; PostgreSQL ist nicht aktiv).
- `make check`, `make clean-check`, `make check-arch` nicht gelaufen (nur Shop-Suite und gezielte Tests).
- Rechtlich: Datenrecht an Texten und Bildern der Quelle ist im Vertrag nur benannt (eigener Shop, dort schon öffentlich).

## 9. Risiken und Folgearbeiten

| Punkt | Folge | Nächster Schritt |
|---|---|---|
| 92 % der Bilder fehlen beim Lieferanten | Katalog klein (273) | Bildquelle klären (BigBuy-Zugang oder eigene Bilder); danach neuer Lauf |
| `bigbuy_id` als Text | Ein späterer BigBuy-Import (Zahlen-Kennungen) legt dieselben Artikel ein zweites Mal an; der Supabase-Umzug erwartet hier eine Zahl (`shop.j_int`) | Vor BigBuy-Import oder Supabase-Umzug: Abgleich über `sku`, übernommene Artikel dann ersetzen |
| Daten vom 11.10.2026, kein Abgleich | Preise und Bestand veralten | Abgleich erst mit BigBuy-Zugang (OA-071) oder erneuter Lauf |
| Listenpreis ≠ freigegebener Verkaufspreis | Anzeige ja, Bestellung nein | Preisfreigabe im neuen Namensraum (Verwaltungskonto fehlt, PR #208 Abschnitt 12) |

## 10. Produktions-Gate (Kommentar am PR #214, 16.11.2026 02:05 UTC)

Befund: Der Workflow startete bei jedem Push auf `claude/katalog-uebernahme`, und die Umgebung `katalog-produktion` war
ohne Schutzregeln angelegt. Sobald ein Geheimnis hinterlegt ist, hätte ein Push die Produktion ohne Freigabe verändern können.
Der Befund ist berechtigt.

Umgesetzt (dieser Zweig): Push-Auslöser entfernt. Start nur manuell (`workflow_dispatch`), und der Job läuft nur, wenn
`github.ref == refs/heads/main`. Ein Feature-Zweig kann den schreibenden Pfad damit nicht mehr erreichen.

Noch offen, als Vorschlag (nicht gebaut):
- **Staging-/Smoke-Lauf vorab:** derselbe Workflow mit einem zweiten Ziel `nexify_teileklar_shop_staging` (eigene Umgebung
  und eigenes Geheimnis) und einer Abnahme gegen eine Vorschau-Adresse. Der Produktionsjob hängt per `needs:` daran.
- **Ausführbarer Rückweg:** `transfer_public_catalog.py --withdraw` setzt bei allen Dokumenten mit
  `source = teileklar_public_catalog` `active: false`. Es löscht nichts, protokolliert und wird mit eigenem Vertragsnachweis
  ausgelöst. Getestet würde er im Staging-Ziel.
- **Technisch erzwungene Freigabe:** „Required reviewers“ in `katalog-produktion` (Inhaber, Schritt 1). Die Sitzung kann das
  nicht selbst setzen.

Folge für den Termin am 16.11., 11:00: Bis diese Punkte erfüllt, geprüft und auf `main` sind, gibt es **keinen** Produktivlauf.
Der Shop auf nexifyai.de bleibt bis dahin bei 0 Produkten.
