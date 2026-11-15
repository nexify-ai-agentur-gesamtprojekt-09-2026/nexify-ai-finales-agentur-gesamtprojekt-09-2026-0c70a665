# Shop-Datenschicht: Vorbereitung der Umstellung von MongoDB auf Supabase/PostgreSQL · 15.11.2026

Status: **vorbereitet, getestet, ausgeschaltet.** Nichts ist live geschaltet, keine Umgebungsvariable
gesetzt, keine Instanz angelegt, keine Produktivdaten gelesen oder geschrieben. Der Shop arbeitet
unverändert mit MongoDB (IST nach `DECISIONS.md` D-006/D-013). Zweig `claude/shop-supabase-migration`,
Entwurfs-PR; kein Merge, kein Auto-Merge.

Einordnung: D-013 (Zielbild Supabase, auch für den Shop), D-016 (Eingriffe nur mit Freigabe und
Rückweg), D-017 (Grenzen bleiben). Dieses Dokument ändert keine dieser Entscheidungen und kein
Leitdokument.

## 1. Kurzfassung

| Arbeitspaket | Stand | Beleg |
|---|---|---|
| 1 Bestandsaufnahme | fertig | Abschnitt 2 |
| 2 Zielschema mit RLS | fertig, lokal eingespielt (zweimal hintereinander, wiederholbar) | `apps/shop-api/supabase/migrations/0001_shop_schema.sql`, `0002_shop_rls.sql` |
| 3 Zugriffsschicht für PostgreSQL neben MongoDB | fertig für die neun Bereiche der Schicht; Schalter `SHOP_STORE_BACKEND`, Standard `mongodb` | `apps/shop-api/shop/store/pg/`, `shop/store/__init__.py` |
| 4 Datenumzug | fertig, nur gegen synthetische Daten gelaufen | `apps/shop-api/transfer_mongo_to_postgres.py` |
| 5 Tests | fertig; Zahlen in Abschnitt 6 | `apps/shop-api/tests/` |
| 6 Umschaltplan | Dokument, Abschnitt 7 | – |

Was vor einem Umschalten **zwingend fehlt**, steht in Abschnitt 8. Die wichtigsten drei: Es gibt
keinen belegten Zugang zu einer Supabase-Instanz; der Katalog-Import (BigBuy) und die
Projektbindung des Vercel-Einstiegs sprechen weiter nur MongoDB; und nichts hier ist je gegen
ein echtes MongoDB oder eine echte Supabase-Instanz gelaufen.

## 2. Bestandsaufnahme: Wo `apps/shop-api` MongoDB benutzt

Grundlage ist der Zweig `claude/shop-zugriffsschicht` (Zugriffsschicht `shop/store`, offener Entwurf),
der in diesen Zweig eingeholt wurde. Der Fachcode spricht dort für neun Bereiche nur noch über die
Schicht; die Abfragen selbst stehen in `shop/store/*.py`. Zeilenangaben am Stand dieses Zweigs.

### 2.1 Sammlungen hinter der Zugriffsschicht (für PostgreSQL umgesetzt)

| Sammlung | Zweck | Schreib-/Lesestellen im Fachcode (über `store.…`) | Besonderheiten |
|---|---|---|---|
| `products` | Katalog (BigBuy-Sortiment) | lesen: `catalog_api.py:58–84`, `cart_api.py:141,199`, `pricing.py:30`, `admin_api.py:49`; schreiben: nur Import (2.2) | Suche über regulären Ausdruck (Name enthält, Artikelnummer beginnt, EAN gleich), Sortierung mit „fehlt zuerst“, Zählung je Kategorie über `$unwind`/`$group`; offene Feldmenge je Produkt |
| `categories` | Kategorien | lesen: `catalog_api.py`; schreiben: nur Import | Kennung ist eine ganze Zahl |
| `imports` | Importläufe | lesen: `catalog_api.py`, `admin_api.py:52`; schreiben: nur Import | – |
| `settings` | `shop` (Aufschlag als Text, Versandpauschale in Cent, Preisfreigabe), `bigbuy_publication` | lesen: `pricing.py:30`; schreiben: `admin_api.py:34,42` | verschachtelte Freigabe; Anlegen-oder-Ändern |
| `price_releases` | Freigabeprotokoll | `admin_api.py:43` | wächst nur |
| `carts` | Warenkorb je Eigentümer | `cart_api.py:27–227`, `checkout_api.py:226` | Vergleichen-und-Setzen über `revision`; Zusammenführung Gast → Konto in einer **Transaktion** (Replica Set); verschachtelte Positionen und Zusammenführungsbelege; Größenprüfung gegen die 16-MB-Dokumentgrenze |
| `users` | Konten (nur Hashes) | `accounts_api.py:44–212` | eindeutig: `email`, `user_id`; offene Feldmenge |
| `sessions` | Sitzungen (Hash des Tokens) | `accounts_api.py` | Zeitpunkte als Datum; **TTL-Index** |
| `login_failures` | Fehlversuche | `accounts_api.py` | **TTL-Index** über das Sperrfenster |
| `password_resets` | Rücksetz-Token (Hash) | `accounts_api.py` | einmaliges Einlösen (bedingte Änderung); **TTL-Index** |
| `api_keys` | Schlüssel der Kundenschnittstelle | Sperren beim Rücksetzen: `accounts_api.py:188`; sonst `nexify_api.py` (2.2) | – |
| `orders` | Bestellungen | `checkout_api.py:111–277`, `fulfillment.py:25–68`, `admin_api.py:92–134` | eindeutig: (Eigentümer, Idempotenzschlüssel); alle Zustandswechsel als bedingte Einzeländerung (bezahlt genau einmal, Übergabe an den Lieferanten genau einmal, versendet nie rückwärts); verschachtelte Positionen und Adresse; Beträge in Cent |
| `webhook_events` | Ereignisse des Zahlungsanbieters | `checkout_api.py:265,274` | eindeutig je Inhaltsschlüssel; wächst nur |
| `revolut_webhooks` | Webhook-Anmeldung je Betriebsart | `revolut.py:48,59`, `admin_api.py:25` | enthält das Signaturgeheimnis des Anbieters |
| `outbox` | Postausgang | `mailer.py:39–128`, `admin_api.py:93,140` | Zustandsautomat mit Besitzer (`claim_id`); Abgleichsläufe über viele Dokumente; Schlüsselsuche per regulärem Ausdruck |
| `requests` | Kontaktanfragen | `requests_api.py:79–117` | Kennung aus Idempotenzschlüssel; Zeitfenster über Textvergleich von ISO-Zeitpunkten |
| `workshops` | Werkstattverzeichnis | `workshops_api.py:27–119` | Koordinaten optional („verortet“ = Feld vorhanden); Präfixsuche |
| `workshop_requests` | Werkstattanfragen | `workshops_api.py` | – |

Volltextindizes (`$text`) benutzt der Shop nicht. Transaktionen gibt es an zwei Stellen: die
Warenkorb-Zusammenführung (`store/carts.py`) und die Veröffentlichung eines Imports
(`bigbuy_import.py:291`).

### 2.2 Stellen, die noch direkt MongoDB ansprechen (NICHT umgesetzt)

| Stelle | Was sie tut | Folge für ein Umschalten |
|---|---|---|
| `bigbuy_import.py:224–309` | Katalog-Import: Kategorien, Massenänderung der Produkte in einer Transaktion, Quellnachweise (`source_manifests`), Importläufe, Zähler in `settings` | Ohne Umsetzung bliebe der Katalog nach dem Umschalten eingefroren (kein Bestand, keine Preise, keine neuen Produkte). **Zwingend vorher.** |
| `bigbuy_selection.py:22–86` | additive Auswahl, Bildquellen | wie oben |
| `admin_api.py:60` | reicht `db` an den Import durch | folgt dem Import |
| `vercel_app.py`, `namespace_operator.py` | Projektbindung und Namespace-Prüfung des Vercel-Einstiegs gegen MongoDB (Quelle des heutigen 503) | Der Einstieg verlangt weiter eine MongoDB-Bindung, auch wenn die Schicht auf PostgreSQL steht. Laut Skill und Auftrag hier nicht angefasst. **Zwingend vorher**, mit Entscheidung des Inhabers. |
| `main.py:74–75` und Start (`ensure_indexes`, Werkstatt-Erstbefüllung) | lokaler Dienst (nicht der Vercel-Einstieg) | nachrangig; lokal bleibt MongoDB nötig |
| `nexify_api.py` (84 Zugriffe; Portal der Suite: Tickets, Angebote, Rechnungen, Projekte, Schlüssel …) | gehört nicht zum Shop-Einstieg auf Vercel (`MODULES` in `vercel_app.py` nennt es nicht) | eigener Auftrag (Suite), nicht Teil dieser Vorbereitung |
| `db.py` | bindet den Motor-Client beim Laden; `config.py` verlangt `MONGO_URL`, `DB_NAME` | Auch mit `SHOP_STORE_BACKEND=postgres` müssen diese Variablen heute gesetzt sein. |

## 3. Zielschema

Dateien: `apps/shop-api/supabase/migrations/0001_shop_schema.sql` (Tabellen, Schlüssel, Indizes,
Zeitstempel) und `0002_shop_rls.sql` (Rollen, Rechte, RLS). Eigenes Schema `shop`, 19 Tabellen.
Beide Dateien sind wiederholbar (zweimal hintereinander eingespielt, ohne Fehler).

### 3.1 Form: Dokumentzeile mit abgeleiteten Spalten

Vorgabe war: Antworten der API bytegleich (gleiche Felder, gleiche Reihenfolge). Die Dokumente des
Shops haben eine offene Feldmenge (ein Produkt trägt alles, was der Lieferant liefert; eine
Bestellung alles, was die Kasse hineinschreibt), unterscheiden „Feld fehlt“ von „Feld ist null“,
und die API baut ihre Antworten aus der Feldfolge dieser Dokumente. Eine vollständig aufgelöste
Tabellenform kann das nicht verlustfrei wiedergeben. Deshalb:

- Jede Zeile hat `id` (die bisherige `_id`), `doc` (das Dokument ohne `_id`, Typ **`json`**, nicht
  `jsonb`: nur `json` bewahrt Feldfolge und Schreibweise) und `seq` (Ablagefolge; MongoDB liefert
  Listen ohne Sortierung in dieser Folge).
- Alles, wonach gesucht, sortiert oder was erzwungen wird, ist eine **aus `doc` abgeleitete Spalte**
  (`generated always … stored`). Es gibt je Zeile genau eine Wahrheit; abgeleitete Spalten können
  nicht von ihr abweichen. Darauf liegen Indizes, Eindeutigkeit und Prüfregeln.
- **Geldbeträge sind ganze Cent**, und die Datenbank erzwingt es: `purchase_cents`,
  `subtotal_cents`, `shipping_cents`, `total_cents` sind `bigint ≥ 0`; ein Betrag wie `19.95`,
  ein Betrag als Text oder ein negativer Betrag wird abgewiesen (Funktion `shop.j_whole`).
  `paid_transitions` darf nur 0 oder 1 sein: „bezahlt genau einmal“ ist damit auch eine Regel
  der Datenbank.
- Eindeutigkeit wie bisher: Warenkorb je Eigentümer, Konto je E-Mail und `user_id`, Bestellung
  je (Eigentümer, Idempotenzschlüssel), Zahlungsereignis je Inhaltsschlüssel, Schlüssel-Hash.
  `unique nulls not distinct` bildet nach, dass MongoDB ein fehlendes Feld wie null behandelt.
- Textspalten für Vergleich und Sortierung tragen die Sortierung `"C"` (byteweise wie MongoDB).

### 3.2 Bewusste Abweichungen vom Dokumentmodell

| Abweichung | Begründung |
|---|---|
| `sessions`, `login_failures`, `password_resets`, `webhook_events` sind vollständig typisierte Tabellen ohne `doc` | Ihre Form legt die Zugriffsschicht selbst fest (feste Felder); echte Zeitpunkte (`timestamptz`) statt Text; nichts davon wird als Dokument an die API durchgereicht. Der Umzug bricht ab, wenn ein Altdokument ein unerwartetes Feld trägt. |
| Zeitpunkte auf Millisekunden gekürzt, Rückgabe als UTC ohne Zeitzone | So speichert und liefert MongoDB sie; der Fachcode rechnet damit. |
| Kein TTL: `shop.purge_expired(jetzt, Sperrfenster)` statt TTL-Indizes | PostgreSQL löscht nicht von selbst. Die API prüft den Ablauf ohnehin selbst; die Funktion hält nur die Tabellen klein. **Ein Zeitplan dafür ist nicht eingerichtet.** |
| Bedingte Änderungen sperren die Zeile (`select … for update`), prüfen die Bedingung, schreiben | ersetzt `find_one_and_update`; von mehreren gleichzeitigen Aufrufen gewinnt genau einer (getestet mit acht gleichzeitigen „bezahlt“). |
| Warenkorb-Zusammenführung in einer Transaktion mit festem Lesestand (`repeatable read`), bei Konflikt erneuter Aufruf (höchstens fünfmal) | entspricht `with_transaction` mit Snapshot; kein Replica Set nötig. |
| Die 16-MB-Grenze eines Warenkorbs bleibt als Schutzgrenze bestehen | PostgreSQL hätte sie nicht; gleiche Fehlerklassen, gleiche Wirkung für den Fachcode. |
| `products.bigbuy_id` eindeutig, aber mehrere Zeilen ohne `bigbuy_id` erlaubt | MongoDB erlaubt nur eine; hier gelockert, weil die gemeinsame Vertragssuite Produkte ohne dieses Feld anlegt. Echte Produkte tragen es immer. |
| Groß-/Kleinschreibung der Suche über ICU (`und-x-icu`) | unabhängig von der Spracheinstellung der Datenbank; die Migration bricht ab, wenn ICU fehlt. Bei rund 3700 Produkten ohne eigenen Suchindex; ein Trigramm-Index wäre der nächste Schritt bei Wachstum. |
| `jsonb` nur für `category_ids` (abgeleitet, mit GIN-Index) | einzige Stelle, an der „Liste enthält Wert“ gesucht wird. |

Eine spätere Normalisierung (zum Beispiel Bestellpositionen als eigene Tabelle) ist möglich, sobald
die Rückkehr zu MongoDB nicht mehr offengehalten werden muss. Sie ist nicht Teil dieser Vorbereitung,
weil sie die Bytegleichheit aufgeben würde.

### 3.3 Rollen, Rechte, RLS

- **Standard: alles gesperrt.** `PUBLIC`, `anon` und `authenticated` haben kein Recht am Schema und
  keine Policy. Der Shop wird nie direkt aus dem Browser gelesen; `shop` gehört nicht in
  `PGRST_DB_SCHEMAS`. Im Schema liegen Einkaufspreise, Konten und das Signaturgeheimnis des
  Zahlungsanbieters.
- RLS ist auf jeder Tabelle eingeschaltet **und erzwungen** (`force`). Wer ein Tabellenrecht hätte,
  aber keine Policy, liest null Zeilen und schreibt keine (getestet). Die Migration bricht ab, wenn
  eine Tabelle des Schemas ohne Regel bliebe.
- **Eine gezielte Freigabe:** die Gruppenrolle `shop_api` (ohne Anmeldung) mit einer Policy je
  Tabelle und nur den nötigen Rechten. Bestellungen, Postausgang, Konten und Katalog kann sie nicht
  löschen; Zahlungsereignisse, Freigabeprotokoll, Quellnachweise und Werkstattanfragen wachsen nur
  (weder ändern noch löschen). Löschen darf sie nur Sitzungen, Fehlversuche und Rücksetz-Token.
- Die **Anmelderolle mit Kennwort legt der Inhaber an** und gibt ihr `shop_api`. Kein Kennwort in
  einer Datei, keins im Repository. Die Verbindungsadresse steht nur serverseitig
  (`SHOP_POSTGRES_DSN`).
- **Mandanten:** Der Shop ist ein Mandant (TEILEKLAR). Die Trennung zu Chat, Suite und
  Kundenprojekten ist das eigene Schema; `shop_api` hat außerhalb keine Rechte (getestet gegen ein
  fremdes Schema). Welche Bestellung welcher Käufer sehen darf, prüft weiter die Shop-API
  (eigene Sitzungen nach D-007, kein Supabase-Auth); eine Policy je Käufer gäbe es erst mit einer
  Identität, die die Datenbank kennt.

## 4. Zugriffsschicht für PostgreSQL

`apps/shop-api/shop/store/pg/`: je Bereich eine Klasse mit derselben Schnittstelle wie die
MongoDB-Klasse (`PgCatalogStore`, `PgCartStore`, `PgAccountStore`, `PgWorkshopStore`,
`PgRequestStore`, `PgOutboxStore`, `PgOrderStore`, `PgPaymentStore`, `PgSettingsStore`), dazu
`base.py` (Verbindungsvorrat, Dokumentform, bedingtes Ändern). Dieselben Fehlerklassen ohne Text
(`RevisionStale`, `AlreadyExists`, `ArchiveTooLarge`, `StoredDataInvalid`, `StoreUnavailable`);
Treibertext und Verbindungsdaten verlassen die Schicht nicht (getestet), auch nicht über das
Protokoll des Verbindungsvorrats.

**Schalter:** `SHOP_STORE_BACKEND`. Fehlt die Variable oder steht dort `mongodb`, wird der
PostgreSQL-Code nicht einmal geladen und nichts ändert sich. `postgres` verlangt
`SHOP_POSTGRES_DSN`. Jeder andere Wert ist ein Fehler beim Start, kein stiller Rückfall.

**Feldfolge:** Geänderte Felder behalten ihren Platz, neue kommen in alphabetischer Folge ans Ende,
`_id` steht vorn. So verarbeitet MongoDB ab Version 5.0 Änderungen laut Dokumentation. Welche
Version in Produktion läuft, ist **nicht belegt**; bei einer älteren Version könnte die Folge neu
hinzugefügter Felder abweichen (nur die Folge, nicht der Inhalt).

**Am Fachcode geändert:** nichts außer der Auflösung eines Merge-Konflikts in `accounts_api.py`
zwischen `main` (PR 196: bestätigte Adresse nach dem Rücksetzen, Sperre alter Schlüssel,
Ablehnung der Google-Anmeldung) und der Zugriffsschicht. Dafür hat die Schicht zwei neue Methoden
(`set_password_hash_verified`, `revoke_api_keys_of`), in beiden Umsetzungen.

**Abhängigkeit:** Der Treiber `psycopg` (mit Verbindungsvorrat) steht **nicht** in den gesperrten
Abhängigkeiten des Shops (`apps/shop-api/requirements.txt`); die Auslieferung bleibt dadurch
unverändert. Vor einem Umschalten muss er mit Prüfsummen aufgenommen werden (Abschnitt 8).

## 5. Datenumzug

`apps/shop-api/transfer_mongo_to_postgres.py`, drei Betriebsarten:

- `--source-report`: liest nur die Quelle, zählt, bildet Prüfsummen und prüft, ob sich jedes
  Dokument verlustfrei ablegen lässt. Braucht kein Ziel.
- `--dry-run`: führt alles in einer Transaktion aus, vergleicht und **verwirft** am Ende.
- `--apply`: schreibt nur fest, wenn jede Sammlung in Zahl und Prüfsumme mit der Quelle übereinstimmt.

Eigenschaften (alle getestet, Abschnitt 6):

- Liest die Quelle nur über `find`; das Skript enthält keinen Schreibaufruf an MongoDB.
- Eigene Variablennamen (`TRANSFER_SOURCE_MONGO_URL`, `TRANSFER_SOURCE_DB_NAME`,
  `TRANSFER_TARGET_POSTGRES_DSN`), damit kein Lauf versehentlich die Bindung des Dienstes nimmt.
- Eine Transaktion für den ganzen Lauf; bei jeder Abweichung Abbruch mit Rückgabewert 2, nichts
  bleibt im Ziel. Die Meldung nennt Sammlung, Zahlen und höchstens fünf Kennungen, nie Inhalte.
- Wiederholbar: Ein zweiter Lauf schreibt keine Zeile neu; geänderte und neue Quelldokumente sind
  die einzigen geschriebenen Zeilen. Im Ziel wird nie gelöscht; eine Zeile nur im Ziel ist eine
  Abweichung.
- Prüfsumme je Sammlung: sha256 über die sha256 aller Dokumente in Kennungsfolge, in der Form, in
  der die Zugriffsschicht sie zurückgibt (also einschließlich Feldfolge).
- Bricht vor dem ersten Schreiben ab bei: Betrag, der keine ganze Zahl ist; unerwartetem Feld in
  einer typisierten Tabelle; Kennung unbekannter Art; Wert, den JSON nicht tragen kann.

Übertragen werden die 18 Sammlungen des Shops (`COLLECTIONS` in `vercel_app.py`) und `api_keys`.
**Nicht** übertragen: die übrigen Sammlungen des Portals (`nexify_api.py`).

## 6. Tests und Zahlen

Alle Daten sind synthetisch (`example.invalid`, erfundene Kennungen). PostgreSQL-Tests laufen nur
mit ausdrücklicher Bestätigung gegen Loopback (`NEXIFY_POSTGRES_DISPOSABLE_CONFIRMED=yes`,
`NEXIFY_TEST_POSTGRES_DSN`), je Test in einer eigenen Wegwerf-Datenbank aus den echten Migrationen
und über eine Anmeldung, die nur die Dienstrolle hält (Rechte und Policies sind also mitgetestet).
Ohne Bestätigung werden sie übersprungen, nicht als grün gezählt.

### 6.1 Shop-Suite (`apps/shop-api/tests`)

| Lauf | Tests | bestanden | übersprungen | rot |
|---|---|---|---|---|
| mit lokalem PostgreSQL 16.15 und Treiber (Python 3.13) | 295 | 219 | 76 | 0 |
| ohne Bestätigung, ohne Treiber (Umgebung aus `make test-env`, Python 3.12) | 288 | 115 | 173 | 0 |

Die 76 übersprungenen im ersten Lauf brauchen ein echtes MongoDB-Replica-Set: 65 Vertragsaussagen,
1 Vergleichslauf, 10 Aussagen von `test_cart_merge_replica_contract.py` (vorbestehend).

| Gruppe | Datei | Zahl | Aussage |
|---|---|---|---|
| Vertragstests, gemeinsame Suite | `test_store_contract.py` | 65 Aussagen je Bindung | dieselben Aussagen gegen die MongoDB-Umsetzung (über den Stellvertreter: 65 grün, plus 2 MongoDB-Besonderheiten) und gegen PostgreSQL (65 grün). Keine Aussage wurde für PostgreSQL geändert; hinzugekommen ist eine für die beiden neuen Methoden. |
| PostgreSQL-Besonderheiten | `test_store_contract.py` (`PostgresSpecifics`) | 9 | zwei Zusammenführungen, die beide den Kontokorb anlegen, enden ohne Fehler und ohne zweiten Korb; das Zeichen U+0000 wird abgewiesen, der gleichlautende Text gespeichert; doppeltes Befüllen des Verzeichnisses ohne Treibertext; Millisekunden wie bisher; Schutzgrenze und nicht ablegbare Daten; Beträge, die keine ganzen Cent sind, erreichen die Tabelle nie; Aufräumen nur auf Aufruf; zwei wartende Zustandswechsel haben einen Gewinner; zwei gleichzeitige Zusammenführungen übernehmen die Positionen genau einmal |
| Vergleichslauf alt gegen neu | `test_store_parity.py` | 157 Schritte | eine feste Schrittfolge über alle neun Bereiche gegen beide Umsetzungen; jede Rückgabe als Text verglichen (gleiche Felder, gleiche Folge), erzeugte Kennungen maskiert: 157 von 157 gleich |
| RLS und Rechte | `test_postgres_rls.py` | 8 | jede Tabelle mit erzwungener RLS und genau einer Policy; Anmeldung ohne Rechte erreicht nichts; `anon`/`authenticated` erreichen nichts; Tabellenrecht ohne Policy sieht null Zeilen und schreibt keine; Dienstrolle löscht keine Geschäftsdaten und ändert weder Schema noch Policies noch fremde Schemas; die Datenbank weist falsche Beträge ab; Treibertext verlässt die Schicht nicht |
| Katalog-Erstbefüllung | `test_catalog_transfer.py` | 17 | je 8 Aussagen gegen Ziel MongoDB (Stellvertreter) und Ziel PostgreSQL, 1 zur Befehlszeile; Abschnitt 12 |
| Datenumzug | `test_postgres_transfer.py` | 11 | ein geschlossenes Ziel wird nie wieder beschrieben; | Trockenlauf lässt das Ziel leer; Zahl und Prüfsumme gleich für alle 19 Sammlungen; zweiter Lauf schreibt keine Zeile (Zeilenversionen unverändert); nur geänderte und neue Dokumente werden geschrieben; Zeile nur im Ziel und geändertes Zahlungsereignis führen zum Abbruch ohne Festschreiben; acht Arten nicht verlustfrei übertragbarer Dokumente brechen ab; Quelle wird nur über `find` gelesen (einmal je Sammlung und Lauf); Protokoll ohne Inhalte; beide Umsetzungen antworten nach dem Umzug gleich (24 Abrufe als Text) |
| Schalter | `test_store_backend_switch.py` | 4 | ohne Variable MongoDB und der PostgreSQL-Code wird nicht geladen; `postgres` bindet alle Bereiche ohne Verbindungsaufbau; fehlende Adresse und jeder andere Wert stoppen den Start, ohne die Adresse zu nennen |

### 6.2 Gegenprobe (gezielt eingebaute Fehler in `shop/store/pg/`, nicht eingecheckt)

85 Fehler eingebaut (vertauschte Vergleiche, entfernte Bedingungen, falsche Sortierung, entfernte
Sperre, entfernte Transaktionssicherung). Erster Durchgang: **78 erkannt, 7 nicht.** Von den 7:

- 3 echte Lücken, je mit neuer Prüfzeile geschlossen und erneut gezählt (jetzt erkannt): entfernte
  Zeilensperre bei bedingten Änderungen; Sperren bereits gesperrter Schlüssel; fehlender
  Zeilenanfang im Muster der Bestellmails.
- 4 wirkungsgleich: Zwei fängt die Datenbank selbst ab (doppelter Warenkorb über die
  Eindeutigkeit, `NaN` über den JSON-Typ), zwei waren doppelte Bedingungen (eine davon ist
  entfernt, die andere steht zusätzlich in der Abfrage).

Zweiter Durchgang: **81 von 85 erkannt**, die übrigen 4 sind die wirkungsgleichen. Während des
ersten Laufs brach das Werkzeug am Zeitlimit ab und ließ einen eingebauten Fehler in
`pg/outbox.py` stehen; er wurde über `git diff` gefunden und zurückgesetzt, der Lauf danach mit
Rücksetzen bei Abbruch wiederholt. Am Ende zeigte `git diff` nur beabsichtigte Änderungen, die
Suite war grün.

Nach der Gegenprobe kamen die Änderungen aus der unabhängigen Prüfung hinzu (6.4); für sie wurde die
Gegenprobe nicht wiederholt. Für die Katalog-Erstbefüllung: 10 Fehler eingebaut, 9 erkannt, 1 wirkungsgleich.

### 6.3 Gates

Lokal gelaufen am Stand dieses Zweigs; ein CI-Lauf liegt nicht vor (Actions startet in diesem
Repository derzeit keine Jobs, siehe Skill `nexify-zweig-und-pr`, „Bekannte Lage“).

| Gate | Ergebnis |
|---|---|
| `python3 tools/project_skills.py verify` | bestanden (5 Skills) |
| `make check` | Rückgabewert 0 |
| `python3 tools/check_loesungsregister.py` | Rückgabewert 0 (58 Lösungen, 48 Zugänge) |
| `make check-arch` | Rückgabewert 2, **wie auf `main`** (Ausgabe zeilengleich mit `origin/main` 9c9c806; vorbestehend, nicht von diesem Zweig) |
| `make test-env` | Rückgabewert 0 (Python 3.12.3, pymongo 4.19.0) |
| Python-Suite `tests/` (852 Tests) | 50 rot, **namensgleich mit `origin/main` 9c9c806** (vorbestehend: veraltete Pins und Belege); neu: keine, behoben: keine. Gemessen in derselben Umgebung vor und nach, beide Seiten ohne erzeugte Seitendaten. |
| `pnpm --filter @nexify/web test:auth` | 138 von 138 in zwei aufeinanderfolgenden Läufen. Zwei frühere Läufe waren rot: der erste, weil die erzeugten Seitendaten noch fehlten (Reihenfolge des Laufs), der zweite wegen eines Wettlaufs im Vite-Zwischenspeicher (`ENOTEMPTY … node_modules/.vite/deps`). `apps/web` ist in diesem Zweig nicht berührt. |
| `pnpm typecheck` | Rückgabewert 0 |
| `pnpm build`, `make build` | Rückgabewert 0 |

**Was die Zahlen belegen und was nicht:** Die MongoDB-Seite des Vergleichs ist der Stellvertreter
des Treibers aus der Vertragssuite, kein echtes MongoDB (in dieser Umgebung gibt es weder `mongod`
noch Docker). Ein grüner Lauf belegt die Annahmen des Stellvertreters. Die Bindung an ein echtes
Wegwerf-Replica-Set ist vorhanden (Vertragssuite und Vergleichslauf) und wird übersprungen, bis
jemand sie auf einer Maschine mit MongoDB ausführt. Das Ziel war ein lokales PostgreSQL 16, keine
Supabase-Instanz.

### 6.4 Unabhängige Prüfung und automatische Durchsicht

Eine zweite, rein lesende Sitzung hat jede Methode der PostgreSQL-Speicher gegen ihr MongoDB-Gegenstück
gelesen. Ohne Befund: Bedingungen (null/fehlend), Rückgaben, Feldfolge, Sortierung, Paginierung,
Sperren, SQL-Injektion, Wiederholbarkeit der Migrationen, „Quelle wird nie beschrieben“, „kein
Festschreiben bei Abweichung“. Befunde und was daraus wurde:

| Befund | Stand |
|---|---|
| Rollen-Hinweis mit `noinherit`: Die Anmelderolle hätte die Rechte von `shop_api` nicht nutzen können (auch von der automatischen Durchsicht am PR gemeldet) | behoben (Hinweis berichtigt; die Tests nutzen eine erbende Anmeldung) |
| `order_mails` las je Bestellung alle Bestellmails samt Inhalt (auch automatische Durchsicht) | behoben (Vorauswahl nach der Kennung in der Abfrage) |
| Verbindungsbündler im Transaktionsmodus: Startparameter (`search_path`) und vorbereitete Anweisungen | behoben: alle Tabellen mit Schema benannt, keine Startparameter, keine vorbereiteten Anweisungen; Zeitgrenzen an der Rolle |
| Zwei gleichzeitige Zusammenführungen, die beide den Kontokorb anlegen: 409 statt stiller Wiederholung wie in MongoDB | behoben und getestet |
| Wiederholter Umzug nach dem Umschalten überschreibt neuere Daten im Ziel | behoben: Ziel wird mit einer Marke geschlossen, jeder weitere Lauf bricht ab (getestet); Plan Schritt 8 und 9 angepasst |
| Treiberfehler roh aus `add_many`; Sperrkonflikt außerhalb einer Transaktion | behoben und getestet |
| NUL-Prüfung wies auch den gewöhnlichen Text `\u0000` ab | behoben und getestet; das Zeichen U+0000 selbst bleibt abgewiesen (PostgreSQL kann es nicht führen, MongoDB schon) |
| Der Schalter stellt nur die neun Bereiche um; Portal, lokaler Dienst und Import bleiben auf MongoDB | bleibt, Abschnitt 8 Punkt 10 ergänzt |
| Prüfsumme vergleicht verschachtelte `ObjectId` als Text | bleibt, im Skript benannt |
| Reihenfolge von `order_mails`: MongoDB könnte nach Schlüssel statt nach Ablage liefern | offen, nur gegen echtes MongoDB klärbar (Abschnitt 8 Punkt 6) |

## 7. Umschaltplan (nur Plan; nichts davon ist ausgeführt)

Wer: **I** = Inhaber, **A** = Agent. Aufwand ist eine Schätzung reiner Arbeitszeit ohne Wartezeiten.

| # | Schritt | Wer | Prüfkriterium | Rückweg | Aufwand |
|---|---|---|---|---|---|
| 0 | Offene Entscheidungen aus Abschnitt 9 treffen | I | schriftlich in `DECISIONS.md` (koordinierende Sitzung) | – | 0,5 h |
| 1 | Instanz und Zugang: Adresse der Supabase-Instanz benennen (heute nicht belegt, Lückenplan L19), Anmelderolle für den Shop anlegen und ihr `shop_api` geben, Sicherung der Instanz mit Wiederherstellungsprobe belegen | I (Zugang, Kennwort); A (Prüfliste) | Anmeldung mit der neuen Rolle gelingt; eine Sicherung wurde testweise zurückgespielt | Rolle wieder entziehen | 1–2 h |
| 2 | Fehlende Bausteine aus Abschnitt 8 bauen und prüfen (Import, Projektbindung, Treiber mit Prüfsummen, Zeitplan fürs Aufräumen, Lauf gegen echtes MongoDB) | A; Entscheidung zur Projektbindung: I | alle Belege je Baustein wie im Skill `nexify-shop-zugriffsschicht` | Zweig nicht mergen | 3–5 Tage |
| 3 | Schema einspielen (`0001`, `0002`) in die Instanz | I startet oder gibt frei; A liefert Befehl und liest zurück | 19 Tabellen, RLS erzwungen auf allen, genau eine Policy je Tabelle; die RLS-Tests laufen gegen die Instanz mit einer Testanmeldung ohne Rechte rot-frei | `drop schema shop cascade` (Schema ist leer) | 0,5 h |
| 4 | Lesender MongoDB-Zugang für den Umzug | I | Anmeldung kann lesen und nicht schreiben | Zugang löschen | 0,5 h |
| 5 | `--source-report` gegen die Produktionsdaten | A, nach Freigabe I | Zahl je Sammlung plausibel (heute 3720 Produkte laut altem Dienst); kein Abbruch; jede gemeldete Unverträglichkeit ist geklärt | nichts geschrieben | 0,5 h |
| 6 | Trockenlauf `--dry-run` | A | alle Sammlungen `match: true`; Ziel danach leer | nichts geschrieben | 0,5 h |
| 7 | Erster Umzug `--apply` (Shop läuft weiter auf MongoDB) | A, nach Freigabe I | Zahl und Prüfsumme je Sammlung gleich; Protokoll abgelegt | `truncate` der Shop-Tabellen durch den Eigentümer des Schemas | 0,5 h |
| 8 | Parallelbetrieb mit Vergleich: zweite Auslieferung (Vorschau, nicht die Kundendomain) mit `SHOP_STORE_BACKEND=postgres`, **nur lesend** gegen das Ziel des Umzugs (Katalog, Suche, Produkt, Kategorien) im Vergleich zum laufenden Dienst; Umzug täglich wiederholen. Schreibwege (Kasse im Sandbox-Modus: Bestellung, Zahlung, Bestätigungsmail im Postausgang) in einer **eigenen** Datenbank mit demselben Schema, weil ein wiederholter Umzug geänderte Zeilen im Ziel überschreibt | I setzt die Variablen in der Vorschau; A vergleicht | Antworten bytegleich für eine feste Liste von Abrufen; wiederholter Umzug schreibt nur geänderte Zeilen; Kasse einmal vollständig durchlaufen | Vorschau abschalten | 1–2 Tage Beobachtung |
| 9 | Umschalten: Wartungsfenster; Schreibzugriffe auf den alten Stand anhalten; letzter Umzug `--apply`; **Ziel schließen** (Zeile `transfer_closed` in `shop.settings`, danach bricht jeder weitere Umzug ab); Variablen in Produktion setzen; neu ausliefern | I (Variablen, Freigabe); A (Umzug, Prüfung) | Prüfsummen gleich; Gesundheitsabfrage, Katalog, Warenkorb, Anmeldung, eine Sandbox-Bestellung; keine 5xx im Protokoll | Schritt 10 | 1–2 h |
| 10 | Rückweg auf MongoDB | I (Variable), A | `SHOP_STORE_BACKEND` entfernen oder auf `mongodb` setzen und neu ausliefern; der Shop liest wieder MongoDB | – | 15 min |
| 11 | Nachlauf: Aufräumzeitplan aktiv, Sicherung der Shop-Tabellen im Sicherungsplan, MongoDB mindestens 30 Tage unverändert behalten, dann Entscheidung über Stilllegung (D-016) | I entscheidet; A bereitet vor | Wiederherstellungsprobe der Shop-Tabellen belegt | – | 0,5 Tag |

**Grenze des Rückwegs (wichtig):** Schritt 10 ist verlustfrei nur, solange nach dem Umschalten
nichts geschrieben wurde. Bestellungen, Konten und Zahlungsereignisse, die danach in PostgreSQL
entstehen, fehlen in MongoDB. Ein Rücktransport PostgreSQL → MongoDB ist **nicht gebaut**. Vor
Schritt 9 muss entschieden sein, ob er gebaut wird oder ob der Rückweg nur für ein kurzes Fenster
nach dem Umschalten gilt (Abschnitt 9).

Die Variablen für Schritt 8 und 9 (setzt ausschließlich der Inhaber; hier nur Namen, keine Werte):
`SHOP_STORE_BACKEND=postgres`, `SHOP_POSTGRES_DSN` (geheim, nur serverseitig). `MONGO_URL`/`DB_NAME`
bleiben gesetzt, solange Abschnitt 8 Punkt 2 und 3 offen sind und für den Rückweg.

## 8. Was vor einem Umschalten zwingend fehlt

1. **Zugang zur Supabase-Instanz.** Adresse und Zugang sind im Repository nicht belegt (D-013
   „Offen“, Lückenplan L19). Ohne sie ist nichts hiervon gegen das Ziel prüfbar. Owner: Inhaber.
2. **Katalog-Import für PostgreSQL.** `bigbuy_import.py` und `bigbuy_selection.py` hinter die
   Schicht legen (ein Bereich „Import“ mit allen drei Belegen des Skills) und für PostgreSQL
   umsetzen, einschließlich der Veröffentlichung in einer Transaktion. Schätzung 1,5–2 Tage.
   Unabhängig davon ist der Import heute blockiert (BigBuy antwortet 401, D-008).
3. **Projektbindung des Vercel-Einstiegs.** `vercel_app.py`/`namespace_operator.py` prüfen die
   Bindung gegen MongoDB. Für PostgreSQL braucht es eine gleichwertige Prüfung (wem gehört die
   Datenbank, ist es das freigegebene Projekt). Das berührt den Mandantenschutz und ist deshalb
   eine Entscheidung des Inhabers, dann 1–1,5 Tage.
4. **Treiber in die gesperrten Abhängigkeiten.** `psycopg` mit Verbindungsvorrat in
   `apps/shop-api/requirements.in` und mit Prüfsummen in `requirements.txt`; Größe und Kaltstart
   der Vercel-Funktion nachmessen. 0,5 Tag.
5. **Verbindungsweg von Vercel zur Instanz.** Serverlose Funktionen öffnen viele kurze
   Verbindungen; nötig ist der Verbindungsbündler der Instanz (bei Supabase: Supavisor) oder eine
   feste Obergrenze. Ob die selbst gehostete Instanz von Vercel aus erreichbar ist (Netz, TLS),
   ist nicht belegt. Messung nötig.
6. **Lauf gegen echtes MongoDB** (klärt auch, in welcher Reihenfolge MongoDB die Mails einer
   Bestellung liefert; die Vertragssuite nimmt die Ablagefolge an). Vertragssuite und Vergleichslauf gegen ein Wegwerf-Replica-Set
   (Bindung vorhanden, hier übersprungen) und der Umzug gegen eine Kopie echter Daten
   (`--source-report`, dann `--dry-run`). Erst das zeigt, ob Altdaten die strengeren Regeln
   erfüllen (ganze Cent, feste Form der Sitzungen).
7. **MongoDB-Version in Produktion.** Für die Feldfolge neu hinzugefügter Felder (Abschnitt 4).
8. **Zeitplan für `shop.purge_expired`** (zum Beispiel `pg_cron` auf der Instanz) und
   **Sicherung mit Wiederherstellungsnachweis** für das Schema `shop`.
9. **Unabhängige Prüfung** dieses Zweigs durch eine zweite Sitzung (Skill `nexify-zweig-und-pr`,
   Schritt 7); hier hat nur der Verfasser geprüft. Dazu Merge der Grundlage
   `claude/shop-zugriffsschicht`, auf der dieser Zweig aufbaut.
10. **Lokaler Dienst und Portal** (`main.py`, `nexify_api.py`) bleiben auf MongoDB; für den
    Vercel-Einstieg des Shops nicht nötig, für das vollständige Zielbild D-013 schon. Wo beides
    zusammen liefe, wären die Folgen: Schlüssel der Kundenschnittstelle legt das Portal in MongoDB an
    und prüft sie dort, das Sperren beim Rücksetzen des Passworts träfe aber PostgreSQL; die
    Gesundheitsabfrage des lokalen Dienstes meldete Zahlen aus MongoDB. Der Schalter ist deshalb nur
    für den Vercel-Einstieg gedacht, solange das Portal nicht umgestellt ist.

## 9. Offene Entscheidungen des Inhabers

| # | Frage | Empfehlung |
|---|---|---|
| E1 | Welche Supabase-Instanz (Adresse), und darf der Shop dort ein eigenes Schema `shop` mit eigener Anmelderolle bekommen? | ja, eigenes Schema und eigene Rolle; nicht die Dienstrolle der Instanz verwenden |
| E2 | Projektbindung für PostgreSQL neu bauen (Abschnitt 8 Punkt 3)? | ja, gleichwertig zur heutigen Prüfung; ohne sie kein Umschalten |
| E3 | Rückweg: Rücktransport PostgreSQL → MongoDB bauen (rund 1,5 Tage), oder Rückweg nur im Wartungsfenster? | nur im Wartungsfenster, dafür Schritt 8 gründlich; der Rücktransport wäre Code, der nach der Stilllegung von MongoDB wegfällt |
| E4 | Reihenfolge gegenüber dem kurzfristigen Betrieb: erst der Shop auf der bestehenden Datenbank (getrennt entschieden), dann die Umstellung? | ja, wie entschieden; die Umstellung blockiert den kurzfristigen Betrieb nicht |
| E5 | Wie lange bleibt MongoDB nach dem Umschalten unverändert stehen? | mindestens 30 Tage, Stilllegung eigene Entscheidung nach D-016 |

## 10. Nachvollziehen

```bash
python -m venv /tmp/shop-venv
/tmp/shop-venv/bin/pip install --only-binary=:all: --require-hashes -r apps/shop-api/requirements.txt
/tmp/shop-venv/bin/pip install --only-binary=:all: "psycopg[binary,pool]"      # nur für die PostgreSQL-Tests
# lokales Wegwerf-PostgreSQL (15 oder neuer, mit ICU), Rolle mit dem Recht, Datenbanken und Rollen anzulegen
export NEXIFY_POSTGRES_DISPOSABLE_CONFIRMED=yes
export NEXIFY_TEST_POSTGRES_DSN='postgresql://<rolle>:<testkennwort>@127.0.0.1:5432/postgres'
cd apps/shop-api && /tmp/shop-venv/bin/python -m unittest discover -s tests
```

## 11. Hinweise für die koordinierende Sitzung

- **Grundlage.** Dieser Zweig enthält die Commits von `claude/shop-zugriffsschicht` (PR 150) und
  löst dessen Konflikt mit `main` in `accounts_api.py`. Sinnvolle Reihenfolge: PR 150 prüfen und
  mergen, dann diesen Zweig auf `main` einholen; der Unterschied schrumpft dann auf die
  PostgreSQL-Vorbereitung.
- **Commit-Nachrichten.** Die ersten vier eigenen Commits dieses Zweigs enden mit zwei
  Werkzeugzeilen (Mitautor und Sitzungsverweis), die der Auftrag untersagt. Das ist ein Fehler des
  Verfassers. Er ist nicht durch Umschreiben der Historie behoben, weil die Regeln des Repositories
  Force-Push ausschließen; spätere Commits sind ohne diese Zeilen. Beim Squash-Merge bitte eine
  Nachricht ohne sie verwenden.
- **Nicht geändert, aber nachzuführen** (Leitdokumente und gebundene Dateien gehören der
  koordinierenden Sitzung): `docs/deployment/environment-variables.md`, Abschnitt 6, um
  `SHOP_STORE_BACKEND` und `SHOP_POSTGRES_DSN`; `config/loesungsregister.json`, Eintrag `supabase`,
  um den Ort der Shop-Migrationen; `DECISIONS.md` D-013 „Offen“ (Schema mit RLS und Plan für die
  Datenübernahme liegen jetzt als Entwurf vor); `PROGRESS.md`.
- **Geändert außerhalb von `apps/shop-api`:** nur `.claude/skills/nexify-shop-zugriffsschicht/SKILL.md`
  (Abschnitt zur PostgreSQL-Umsetzung und die Lehre aus der abgebrochenen Gegenprobe) und dieses
  Dokument.

## 12. Katalog-Erstbefüllung (Erweiterung des Auftrags, 15.11.2026)

### 12.1 Was heute live ist und was fehlt

Messwerte der koordinierenden Sitzung von 11:52 UTC, **hier nicht nachgemessen** (diese Sitzung greift
auf keine Produktivdaten zu):

| Stelle | Stand |
|---|---|
| Neue Fassung (Vercel-Projekt hinter nexifyai.de) | an die Shop-Datenbank gebunden; `/api/shop/status` 200 mit `products: 0`, `last_import_at: null`; `/api/shop/products` 200 mit `total: 0`; `/api/shop/categories` 200, leer. Der Namensraum `nexify_teileklar_shop_v1` ist erreichbar und leer. |
| Alter Dienst (teileklar.shop) | liefert 3720 Produkte; Ort vermutlich srv1941843, Datenbankname unbekannt |

Am Code dieses Zweigs nachgeprüft:

- Der Importweg `POST /api/admin/import` endet immer mit `tenant_publication_contract_unverified`
  (`shop/bigbuy_import.py:235–243` und `:304`); die Sperre greift vor Anbieter- und Datenbankzugriff.
- Ein API-Import schriebe Produkte ohne `active` (`:254`), also unsichtbar; nur der FTP-Import
  (`bigbuy_ftp.py:187`) und die Auswahl setzen `active: True`.
- Der Import läuft als Aufgabe im Prozess (`:312–314`), nicht wiederaufnehmbar; die Funktion auf Vercel
  endet nach höchstens 30 s (`vercel.json`).
- `seed_accounts` läuft nur im lokalen Dienst (`main.py:42`), nicht unter `vercel_app.py`. Im neuen
  Namensraum gibt es damit vermutlich kein Verwaltungskonto, also auch niemanden, der Preise freigibt.
- Die Schutzregeln des Namensraums verlangen je Sammlung nur „Dokument ist ein Objekt“ mit der
  Namensraum-Marke (`vercel_app.py:143–155`). Sie lassen eine Übernahme zu; **keine Änderung nötig**.
- Zum Anzeigen braucht die neue Fassung je Produkt zwingend `_id`, `name`, `active: true`; zum Rechnen
  `purchase_cents` als ganze Zahl; für den späteren Import `source: "bigbuy"` und eine eindeutige
  `bigbuy_id` (eindeutiger Index). Der Einkaufspreis steht in keiner öffentlichen Antwort
  (`catalog_api.py:34–55`): Aus der öffentlichen Schnittstelle des alten Dienstes lässt sich der
  Katalog deshalb **nicht** übernehmen, nur aus dessen Datenbank.

### 12.2 Entscheidungsvorlage

| | Weg 1: Bestand übernehmen | Weg 2: Import freischalten |
|---|---|---|
| Was | Produkte und Kategorien einmalig, unverändert, aus der Datenbank des alten Dienstes in den neuen Namensraum; gebaut als `apps/shop-api/transfer_catalog.py` | Sperre durch einen belegten Veröffentlichungsvertrag ersetzen, Import außerhalb der 30-Sekunden-Grenze, Verwaltungskonto anlegen |
| Voraussetzungen | lesender Zugang zur alten Datenbank (Ort und Name sind noch unbekannt); schreibender Zugang zum neuen Namensraum; **Freigabe des Inhabers**, weil das die Sperre aus D-008/OA-071 in der Wirkung umgeht | vom Inhaber: gültiger BigBuy-Produktivzugang (heute 401), Lieferantenvertrag und Guthaben (Zahlung, nur Inhaber), Beleg des Mandanten- und Veröffentlichungsvertrags, Lizenz der Katalogdaten (OA-072) |
| Aufwand | Skript fertig; Lauf rund 1 h nach Zugang | Import hinter die Schicht und als wiederaufnehmbarer Lauf über die Befehlszeile: 2–3 Tage; dazu die Nachweise des Inhabers (nicht schätzbar) |
| Risiko | Daten sind so alt wie der letzte Import des alten Dienstes; Preis und Bestand veralten ohne laufenden Abgleich; Veröffentlichung ohne belegten Vertrag; die angenommene Dokumentform kann von der echten abweichen (das Skript bricht dann vor dem Schreiben ab und nennt die Gründe) | keiner für den Bestand; dauert, bis die Nachweise vorliegen |
| Rückweg | Im Ziel wird nichts gelöscht. Rückweg ist: Produkte unveröffentlicht setzen oder den Namensraum leeren; beides ist ein Eingriff in die Produktionsdatenbank und braucht die Freigabe des Inhabers (D-016) | Sperre wieder einsetzen |
| Danach offen | Preise bleiben „nicht freigegeben“ (die Freigabe wird bewusst nicht übernommen), bis ein Verwaltungskonto existiert und der Inhaber freigibt; ohne Weg 2 kein Abgleich | – |

Empfehlung: Weg 1 als Überbrückung nur, wenn der Inhaber die Veröffentlichung ausdrücklich freigibt und
die Daten des alten Dienstes als aktuell genug ansieht; Weg 2 bleibt in jedem Fall nötig, weil sonst
nichts den Katalog aktuell hält. Beide Wege brauchen ein Verwaltungskonto im neuen Namensraum; dafür
fehlt ein Weg unter `vercel_app.py` (kleinste Lösung: ein einmaliger Befehlszeilenlauf von
`seed_accounts` mit den Variablen des Inhabers; nicht gebaut).

### 12.3 Das Übertragungsskript

`apps/shop-api/transfer_catalog.py`; Ziel wahlweise MongoDB (heute) oder PostgreSQL (später), gleiche
Regeln, gleiche Tests gegen beide Ziele.

- **Trockenlauf ist der Standard.** Festschreiben nur mit `--apply --publication-contract <Datei>`
  (Abschnitt 12.4); Prüfsumme und Verweise der Datei stehen danach im Lauf-Eintrag (`imports`) des Ziels.
  Ohne sie Rückgabewert 3. Jeder Lauf schreibt ein Protokoll (`--log`, Pflicht).
- Übernimmt nur `products` und `categories`, unverändert. Nicht: Einstellungen, Preisfreigabe,
  Bestellungen, Konten, Warenkörbe.
- Prüft jedes Produkt auf das, was die neue Fassung braucht; bei Verstößen Abbruch mit Zahl je Grund,
  ohne Inhalte, vor dem ersten Schreiben.
- Eine Transaktion; Zahl und Prüfsumme je Sammlung; ein Produkt nur im Ziel ist eine Abweichung;
  zweiter Lauf schreibt nichts. Die Quelle wird nur über `find` gelesen.
- Der Lauf-Eintrag trägt als `finished_at` das Alter der Daten (jüngster Importzeitpunkt der Quelle),
  nicht den Zeitpunkt der Übernahme; `/api/shop/status` zeigt damit kein falsches Aktualitätsdatum.

**Annahme:** Die Dokumentform des alten Dienstes ist aus dem Code abgeleitet, der sie geschrieben hat
(`build_product`, FTP-Import), nicht aus dessen Daten oder öffentlichen Antworten gelesen. Stimmt sie
nicht, zeigt das der Trockenlauf.

### 12.4 Entscheidung E1 der koordinierenden Sitzung und der kürzeste zulässige Weg

Eingang 15.11.2026, 12:22 UTC, als Nachricht der koordinierenden Sitzung (dort gestützt auf die Vollmacht
des Inhabers; diese Sitzung kann die Vollmacht nicht selbst prüfen und gibt die Entscheidung so wieder):
Der Katalog des alten Shops wird in den neuen Namensraum übernommen. Bedingungen: Quelle nur lesend; die
Importsperre bleibt an und wird durch einen erfüllten Vertrag passiert, nicht umgangen; Abnahme =
mindestens 3720 Produkte und eine Stichprobe von 20 Artikeln (Titel, Preis, Bestand, Bild) gleich; jeder
Lauf wird protokolliert.

**Wie die Bedingungen im Skript abgebildet sind (gebaut und getestet, nichts ausgeführt):**

| Bedingung | Umsetzung | Grenze |
|---|---|---|
| Quelle nur lesend | einziger Zugriff ist `find`, getestet | zusätzlich einen Zugang ohne Schreibrecht verwenden |
| Sperre bleibt an, Vertrag wird erfüllt | `require_publication_contract()` ist **unverändert**. Die Übernahme schreibt nur mit `--publication-contract <Datei>`: Geltungsbereich `catalog_first_fill`, Mandant `teileklar`, Lieferant `bigbuy`, Verweis auf den Lieferantenvertrag, Verweis auf die Lizenz der Katalogdaten, Freigebender, Datum, Mindestzahl. Fehlt oder passt etwas nicht, wird nicht einmal die Quelle gelesen. Prüfsumme und Verweise stehen im Lauf-Eintrag des Ziels. | Die Übernahme läuft nicht durch die Funktion im Importcode, sondern prüft denselben Sachverhalt an eigener Stelle. Das Skript prüft, dass der Nachweis vollständig **benannt** ist, nicht, dass Vertrag und Lizenz tatsächlich bestehen. Ob das „passiert, nicht umgangen“ erfüllt, entscheidet, wer die Datei ausstellt. Der strenge Weg (die Sperre im Importcode durch eine echte Prüfung ersetzen) ist Weg 2 und länger. |
| mindestens 3720 Produkte | `--expect-min 3720`: Abbruch vor dem Schreiben, wenn die Quelle weniger trägt; die Zahl muss mit der im Vertrag übereinstimmen | – |
| Stichprobe 20 | der Bericht nennt 20 gleichmäßig verteilte Kennungen, für die das ganze Dokument in Quelle und Ziel gleich ist (Titel, Einkaufspreis, Bestand, Bilder); zusätzlich stimmt die Prüfsumme über **alle** Produkte | **Preis:** verglichen wird der Einkaufspreis. Der öffentliche Verkaufspreis entsteht aus Aufschlag und Preisfreigabe (`settings`), die bewusst nicht übernommen werden; im Ziel steht deshalb „Preis nicht freigegeben“, bis der Inhaber dort freigibt. Eine Stichprobe an der öffentlichen Seite kann beim Preis erst danach gleich sein. |
| jeder Lauf protokolliert | `--log` ist Pflicht (ohne startet kein Lauf); dazu der Lauf-Eintrag in `imports` | Ablageort des Protokolls legt der Ausführende fest |

**Kürzester zulässiger Weg, Reihenfolge (es fehlt nur noch der Lauf und was beim Inhaber liegt):**

1. Ort und Name der Datenbank des alten Dienstes klären (koordinierende Sitzung, lesend).
2. Variablen auf der ausführenden Maschine setzen (Inhaber; nicht im Chat, nicht im Repository):
   `CATALOG_SOURCE_MONGO_URL`, `CATALOG_SOURCE_DB_NAME`, `CATALOG_TARGET_KIND=mongodb`,
   `CATALOG_TARGET_MONGO_URL`, `CATALOG_TARGET_DB_NAME=nexify_teileklar_shop_v1`.
3. Trockenlauf: `python apps/shop-api/transfer_catalog.py --log <Datei> --expect-min 3720`. Erwartet:
   `match: true` für beide Sammlungen, 3720 oder mehr Produkte, Stichprobe 20 von 20. Bricht er ab, nennt
   er Grund und Zahl; dann ist die angenommene Dokumentform zu berichtigen, bevor irgendetwas geschrieben wird.
4. Vertragsdatei ausstellen (Inhaber oder in seinem Namen, nur Verweise).
5. Lauf: derselbe Befehl mit `--apply --publication-contract <Datei>`.
6. Abnahme: `/api/shop/status` zeigt mindestens 3720 Produkte; Stichprobe aus dem Protokoll; Sichtprüfung
   von 20 Artikeln an der öffentlichen Seite (Titel, Bestand, Bild; Preis nach Freigabe).

Die ausführende Maschine braucht `motor` aus den gesperrten Abhängigkeiten des Shops und Netz zu beiden
Datenbanken. Die Vercel-Funktion ist dafür nicht geeignet (30 Sekunden).

**Was beim Inhaber liegt (gesammelt):**

| # | Was | Wofür | Geheimnis? |
|---|---|---|---|
| 1 | Lesender Zugang zur Datenbank des alten Dienstes (Adresse, Name) | Quelle | ja, nur als Variable auf der ausführenden Maschine |
| 2 | Schreibender Zugang zum neuen Namensraum für diesen einen Lauf | Ziel | ja, ebenso |
| 3 | Vertragsdatei: Verweis auf den Lieferantenvertrag mit BigBuy, Verweis auf das Recht, die Katalogdaten zu veröffentlichen (OA-072), Name des Freigebenden, Datum, Mindestzahl 3720 | Bedingung „Vertrag erfüllt“ | nein, nur Verweise |
| 4 | Entscheidung zum Preis: Aufschlag und Preisfreigabe im neuen Namensraum neu setzen (empfohlen) oder die Einstellung des alten Dienstes ausdrücklich übernehmen lassen | ohne sie zeigt der Shop Produkte ohne Preis | nein |
| 5 | Verwaltungskonto im neuen Namensraum (`ADMIN_EMAIL`, `ADMIN_PASSWORD` als Variablen; ein Anlegeweg unter dem Vercel-Einstieg fehlt, Abschnitt 12.2) | Preisfreigabe und Verwaltung | ja |
| 6 | Wo der Lauf stattfindet (Maschine mit Netz zu beiden Datenbanken) | Ausführung | – |
| 7 | BigBuy-Produktivzugang, Guthaben | **nicht** für die Erstbefüllung, aber für jeden späteren Abgleich und für Bestellungen (OA-071); ohne ihn veralten Preis und Bestand | ja |

Nicht belegt bleibt: die tatsächliche Dokumentform der alten Datenbank (zeigt der Trockenlauf) und ob die
Bilder-Adressen der alten Daten von der neuen Fassung angenommen werden (`supplier_image` in
`catalog_api.py` lässt nur Adressen unter `https://cdnbigbuy.com/` zu; ein abgelehntes Bild erscheint als „nicht verfügbar“,
nicht als Fehler).
