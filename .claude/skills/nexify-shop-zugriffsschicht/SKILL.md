---
name: nexify-shop-zugriffsschicht
description: Den Datenzugriff von apps/shop-api Bereich für Bereich hinter eine Zugriffsschicht (shop/store) legen, als Vorbereitung der Umstellung auf PostgreSQL nach D-013, bei unverändertem Verhalten und mit drei Belegen je Bereich. Verwenden bei jeder Arbeit am Speicherzugriff des Shops, bei Aufträgen wie „nächsten Bereich umstellen", „Kasse hinter die Schicht", „PostgreSQL-Umsetzung anbinden" und bevor in apps/shop-api eine neue Datenbankabfrage geschrieben wird.
---

# Zugriffsschicht des Shops (D-013)

`DECISIONS.md` D-013: Zielbild der Datenhaltung ist die eigene Supabase-Instanz (PostgreSQL mit RLS), auch für den Shop. Der Weg dorthin beginnt ohne Datenbankwechsel: Der Fachcode spricht nur noch über eine schmale Schicht, die heute MongoDB bedient. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Stand und Kennzeichnung (14.11.2026)

`apps/shop-api/shop/store/` gibt es auf `main` noch **nicht**. Dieser Skill beschreibt das Muster des Zweigs `claude/shop-zugriffsschicht` (offener Entwurfs-PR). Vor der Arbeit prüfen, was gilt:

```bash
git fetch origin claude/shop-zugriffsschicht
git ls-tree --name-only origin/main apps/shop-api/shop/store/
git ls-tree --name-only origin/claude/shop-zugriffsschicht apps/shop-api/shop/store/
git show origin/claude/shop-zugriffsschicht:apps/shop-api/shop/store/__init__.py
```

Liefert die zweite Zeile Dateien, ist die Schicht gemergt; dann diesen Abschnitt im selben Commit berichtigen. Solange sie nur im Zweig liegt, wird dort weitergearbeitet (ein Verantwortlicher je Zweig, `nexify-zweig-und-pr`), nicht parallel neu begonnen.

Umgestellt im Zweig: Katalog (lesend), Warenkorb, Konten und Sitzungen, Werkstattverzeichnis, Kontaktanfragen, Postausgang. Noch direkt an `db`: `checkout_api.py`, `admin_api.py`, `fulfillment.py`, `bigbuy_selection.py`, `nexify_api.py`, `main.py`.

## Muster

- **Fachcode spricht nur über die Schicht.** Ein umgestelltes Modul importiert `store` und aus `.db` höchstens `now_iso`. Abfragesprache, Treiberfehler, Transaktionen und Größenprüfungen bleiben in `shop/store/`.
- **Je Bereich ein Speicher**, eine Datei, eine Klasse (`MongoCatalogStore`, `MongoCartStore`, …), in `store/__init__.py` einmal an `db` gebunden.
- **Fehlerklassen ohne Text** in `store/errors.py`: `RevisionStale`, `AlreadyExists`, `ArchiveTooLarge`, `StoredDataInvalid`, `StoreUnavailable`. Sie tragen weder Treibertext noch Verbindungsdaten; die Schicht wirft mit `from None`. Was der Besucher liest, entscheidet weiter der Fachcode.
- **Verhalten unverändert.** Dieselben Abfragen, dieselben Rückgaben, dieselben Statuscodes und Wortlaute. Entscheidungen (Zustandsfolgen, Grenzen, Wiederholungen, Zeitpunkte) bleiben im Fachcode; die Schicht entscheidet und versendet nichts.
- **Treiber Motor, auch in Tests.** `shop/db.py` bindet Motor (`apps/shop-api/requirements.in`). Der Stellvertreter im Test hat die Aufrufformen von Motor, nicht die von pymongos eigenem asynchronem Client (dort ist `aggregate()` eine Koroutine, bei Motor ein Cursor).

## Schritte je Bereich

1. Alle Zugriffe des Bereichs auf `db` zählen und auflisten (`git grep -n "db\." -- apps/shop-api/shop/<modul>.py`); `bash tools/graph.sh affected "<Funktion>"` zeigt abhängige Tests (`nexify-graph`).
2. Vergleichslauf alt vorbereiten: Rückgaben und Endzustand des bisherigen Codes über eine feste Schrittfolge aufzeichnen, bevor etwas geändert wird.
3. Speicher in `shop/store/<bereich>.py` anlegen, Methoden nach fachlicher Absicht benennen, in `store/__init__.py` binden.
4. Fachmodul umstellen: nur Aufrufe ersetzen, keine Logik verschieben.
5. Vertragsaussagen in `apps/shop-api/tests/test_store_contract.py` ergänzen: eine Vertragsklasse je Bereich, die nur die Schnittstelle und einen `seed`-Haken nutzt, gebunden an `InMemoryBinding` und `DisposableMongoBinding`. Eine spätere PostgreSQL-Umsetzung bekommt eine weitere Bindung und ändert keine Aussage.
6. Bestehende Tests, die `db` in geladene Funktionen einsetzen, auf die echte Speicherklasse umstellen; jede Aussage bleibt wörtlich erhalten.
7. Drei Belege erheben (unten), dann ein Commit je Bereich mit den Zahlen in der Nachricht.

## Belege je Bereich

| Beleg | Inhalt |
|---|---|
| **Vertragstests** | Zahl der Aussagen, alle grün; an das Wegwerf-Replica-Set gebunden, dort ohne Bestätigung übersprungen. Die Zahl der übersprungenen nennen. |
| **Gegenprobe** | Gezielt Fehler in die Speicherklasse einbauen und zählen, wie viele die Tests erkennen. Die ehrliche Zahl berichten, auch wenn sie nicht 100 % ist; für jede unerkannte Stelle eine Prüfzeile ergänzen und danach erneut zählen. Die eingebauten Fehler werden nicht eingecheckt. |
| **Vergleichslauf alt gegen neu** | Dieselbe Schrittfolge gegen alten und neuen Code: Rückgaben byteidentisch, gleicher Endzustand, gleiche Aufrufe nach außen. Schritte und Zahlen nennen. |

Befehle (die Abhängigkeiten des Shops sind gesperrt in `apps/shop-api/requirements.txt`; ohne `pymongo` und `motor` lädt der Test nicht):

```bash
python -m pip install --only-binary=:all: --require-hashes --requirement apps/shop-api/requirements.txt
python3 -m unittest discover -s apps/shop-api/tests -p 'test_store_contract.py'
python3 -m unittest discover -s apps/shop-api/tests
```

Die Installation gehört in eine eigene virtuelle Umgebung, nicht in die gemeinsame. Dazu die Gates aus `nexify-zweig-und-pr`, Schritt 5; mehrere Tests unter `tests/` laden Shop-Quelltext direkt (`tests/test_shop_recovery_contract_20261031.py`, `tests/test_contact_recovery.py`, `tests/test_cart_stock_integrity.py`).

Lauf gegen eine echte MongoDB nur gegen ein ausdrücklich bestätigtes Wegwerf-Replica-Set auf der eigenen Maschine (`NEXIFY_MONGO_DISPOSABLE_CONFIRMED=yes`, `NEXIFY_TEST_MONGO_URI` nur Loopback, ohne Zugangsdaten). Nie gegen eine Datenbank mit echten Daten.

## PostgreSQL-Umsetzung (Zweig `claude/shop-supabase-migration`, Stand 15.11.2026)

Vorbereitet und ausgeschaltet; Stand, Schema-Begründung und Umschaltplan: `docs/04-betrieb/shop-supabase-migration-2026-11-15.md`. Solange der Zweig nicht gemergt ist, gilt dasselbe wie oben: dort weiterarbeiten, nicht neu beginnen.

- **Zweite Umsetzung je Bereich** in `shop/store/pg/` (`PgCatalogStore`, …), gewählt über `SHOP_STORE_BACKEND` (`mongodb` ist Standard; `postgres` verlangt `SHOP_POSTGRES_DSN`). Eine neue Methode der Schicht braucht immer beide Umsetzungen und eine Vertragsaussage.
- **Schema** in `apps/shop-api/supabase/migrations/`. Die Zeile trägt das Dokument als `json` (Feldfolge bleibt), gesucht und erzwungen wird über daraus abgeleitete Spalten. Eine neue Abfrage auf ein Feld heißt: abgeleitete Spalte in einer neuen Migrationsdatei, nicht `doc ->> …` im Fachcode.
- **Bindung** `DisposablePostgresBinding` in `test_store_contract.py`; dazu `test_store_parity.py` (Vergleichslauf MongoDB gegen PostgreSQL als Text, also mit Feldfolge), `test_postgres_rls.py`, `test_postgres_transfer.py`. Sie laufen nur mit `NEXIFY_POSTGRES_DISPOSABLE_CONFIRMED=yes` und `NEXIFY_TEST_POSTGRES_DSN` (nur Loopback) und brauchen `psycopg[binary,pool]`, das bewusst nicht in `requirements.txt` steht.
- **Gegenprobe mit Rücksetzen.** Ein Lauf, der Fehler in Quelldateien einbaut, muss bei Abbruch zurücksetzen (Signal abfangen) und danach `git diff --stat -- apps/shop-api/shop/store` leer zeigen. Am 15.11.2026 blieb nach einem Abbruch am Zeitlimit ein eingebauter Fehler in `pg/outbox.py` stehen und fiel nur durch diese Prüfung auf. Während ein solcher Lauf läuft, kein `git add -A`.

## Grenzen

- **Kasse nur vollständig in einem Zug.** `checkout_api.py` (Bestellung, Bestand, Zahlung, Idempotenz) wird nicht halb umgestellt. Entweder der ganze Bereich mit allen drei Belegen in einem PR, oder gar nicht.
- **Nichts an Projektbindung, Preis-, Steuer- und Zahlungslogik.** `vercel_app.py`, `namespace_operator.py`, die Prüfung hinter `project_binding_unverified`, `pricing.py` (über den Austausch des Lesezugriffs hinaus), `revolut.py`, Webhook-Signatur und Idempotenzschlüssel bleiben unberührt.
- Kein Datenbankwechsel, kein Schema, keine Datenübernahme in diesem Skill. Zielschema und Umstellungsplan sind eine eigene Arbeit; Umstellung der Produktion und jeder Eingriff in die bestehende MongoDB brauchen die Freigabe des Inhabers (D-013, D-016).
- Keine Zugangsdaten lesen, ausgeben oder in Tests eintragen. Keine Kundendaten in Testdaten.

## Was als Beleg gilt

Die drei Belege mit Zahlen am genannten Commit, dazu der Namensvergleich der Python-Fehlschläge. „Verhalten unverändert“ ohne Vergleichslauf ist eine Behauptung. Ein grüner Lauf gegen den Stellvertreter belegt die Annahmen des Stellvertreters, nicht das Verhalten von MongoDB; das steht so im PR.
