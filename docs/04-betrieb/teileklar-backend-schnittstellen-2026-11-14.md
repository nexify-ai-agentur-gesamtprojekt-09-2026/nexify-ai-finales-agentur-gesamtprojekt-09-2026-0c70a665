# TEILEKLAR Backend: Produktsperre, Katalog, Werkstattverzeichnis · 14.11.2026

Stand: Zweig `claude/teileklar-backend` (Entwurf, nicht ausgeliefert). Gilt für `apps/shop-api`.
Kennzeichnung: **IST** = im Code belegt und durch Tests mit Ersatz-Datenspeicher geprüft · **OFFEN** = nicht geprüft oder
braucht eine Entscheidung. Geprüft wurde nur gegen einen Speicher im Arbeitsspeicher, nie gegen MongoDB oder Lieferanten.

## 1. TK-11 Pflichtangaben und Veröffentlichungssperre

### Regel (IST)
Ein Produkt ist nur öffentlich (Liste, Detail, Warenkorb, Kasse), wenn **alle** drei Bedingungen gelten:

1. `active` ist `true`;
2. `release.status` ist `released` (gespeichert, vom Shop-Prozess gesetzt, nie vom Import);
3. die Pflichtangaben sind beim Lesen **noch** vorhanden (eine gespeicherte Freigabe überlebt kein später geleertes Feld).

Unvollständige Produkte bleiben gespeichert. Sie bekommen je fehlendem Feld einen Sperrgrund:

| Code | Feld im Datenmodell | Geprüft |
|---|---|---|
| `title_missing` | `name` | nicht leer, mindestens 2 Zeichen, nicht nur SKU / Lieferanten-ID / Zahl (der Import setzt sonst die SKU als Titel ein) |
| `description_missing` | `description` | nach Entfernen von Markup mindestens 20 Zeichen (Arbeitswert, keine Rechtsgrenze) |
| `price_missing` | `purchase_cents` | ganze Zahl größer 0 |
| `tax_rate_missing` | `SHOP_VAT_PERCENT` (Shop-weit) | endliche Zahl 0 bis 100 |
| `image_missing` | `images` | mindestens ein Bild, das die Lieferanten-Original-Regel besteht (`catalog_api.supplier_image`) |
| `manufacturer_missing` | `details.manufacturer` oder `details.brand` | Name, nicht nur eine Nummer (die Lieferanten-Schnittstelle kann eine Hersteller-ID senden) |
| `delivery_time_missing` | `delivery_time` = `{min_days, max_days}` | ganze Tage, `0 <= min <= max <= 90` |
| `stock_status_unknown` | `stock` | ganze Zahl 0 bis 2^53-1; 0 ist ein bekannter Status, „unbekannt“ nicht |

Im Warenkorb behält ein unbekannter Bestand seine bisherige, genauere Antwort (`stock_unavailable`); alle anderen Sperrgründe
machen ein Produkt dort zu „nicht gefunden“ bzw. zu einer Änderung `unavailable`.

**Von Fachberatung zu bestätigen (offener Punkt E12 in `docs/09-final/08-recht-und-compliance.md`):** ob diese Liste rechtlich
vollständig ist. Nicht im Datenmodell, daher nicht geprüft: Herstelleranschrift, verantwortliche Person in der EU (GPSR),
Energie-/Batteriekennzeichnung, Materialangaben, Grundpreis. Die Antwort des Betreiber-Lesewegs trägt diesen Hinweis (`legal_note`).

**OFFEN – Quelle der Lieferzeit.** Der Import liefert keine Lieferzeit; deshalb ist jedes importierte Produkt mit
`delivery_time_missing` gesperrt, bis jemand die Zeit einträgt. Der Betreiber kann sie je Produkt setzen (unten). Woher sie
dauerhaft kommen soll (Lieferanten-Bearbeitungstage, feste Regel je Lager, manuell), ist eine Entscheidung des Inhabers.

### Import (IST)
Der Import füllt keine Lücke und gibt nie frei: er schreibt `release = {status: "blocked", blocked_reasons: [...], checked_by: "import"}`.
Sieht er keine Lücke, steht dort `["not_evaluated"]`, weil er Steuersatz und strenge Bildregel nicht beurteilen kann. Ein
erneuter Import setzt eine frühere Freigabe wieder auf `blocked`, bis neu bewertet wird (sicher statt bequem). Der vom Betreiber
gesetzte `delivery_time` bleibt dabei erhalten. (Der Import selbst ist weiterhin durch `tenant_publication_contract_unverified`
gesperrt; daran ändert dieser Stand nichts.)

### Betreiber-Wege (alle nur mit Betreiberrolle, sonst 401/403)
Teil der Verwaltung unter `/api/admin/*`: ohne Zahlungsmodus (`REVOLUT_MODE`) antworten sie im Teilbetrieb mit 503.

| Weg | Wirkung |
|---|---|
| `GET /api/admin/products/release?status=blocked&reason=<code>&page=&page_size=` | `status`: `all`, `released`, `blocked`, `not_evaluated` (Standard `blocked`); `page_size` höchstens 100. Antwort: `items[]` (`id`, `sku`, `name`, `active`, `release`, `stored_reasons`, `blocked_reasons[] {code, field, label}` frisch berechnet, `public`, `stale`, `delivery_time`), `total`, `summary {released, blocked, not_evaluated, by_reason}`, `legal_note`, `rules_version`. `stale: true` = gespeicherter Zustand weicht vom heutigen ab |
| `GET /api/admin/products/{id}/release` | ein Produkt wie oben |
| `POST /api/admin/products/release/reevaluate` `{apply: false, limit: 5000}` | bewertet gespeicherte Produkte neu. **Standard Probelauf** (`applied: false`, schreibt nichts). Mit `apply: true` wird nur der Block `release` geschrieben, nur wo er sich ändert (wiederholbar). Löscht, deaktiviert und füllt nichts. Läuft nie von selbst |
| `PUT /api/admin/products/{id}/delivery-time` `{min_days, max_days}` | trägt die Lieferzeit ein (`source: operator`, `set_by`, `set_at`) und bewertet dieses Produkt neu |

### Passungsstatus (IST)
`fitment_status` ist `verified` nur, wenn das Produkt `fitment_status: "verified"` **und** `fitment_evidence {source, checked_at}`
trägt; dann zusätzlich `fitment_source`. Sonst immer `not_checked` mit `fitment_verified: false`. Das gilt in Liste und Detail.
Heute trägt kein Produkt einen solchen Beleg: überall `not_checked`.

### Öffentliche Felder, neu
In jedem Eintrag von Liste und Detail: `delivery_days {min, max}` (oder `null`), `fitment_status`, `fitment_verified`,
`fitment_source`. Sperrgründe erscheinen öffentlich nie.

## 2. TK-13 Katalog (Backend-Teil)

`GET /api/shop/products` (nur freigegebene Produkte). Alle Eingaben werden geprüft; ungültig = 422 mit dem Feldnamen.

| Parameter | Regel |
|---|---|
| `q` | höchstens 120 Zeichen; Name (enthält), SKU (Anfang), EAN (genau) |
| `category` | ganze Zahl ≥ 1 (eine Kategorie-ID, auch Oberkategorie) |
| `brand` | wiederholbar (`brand=A&brand=B`, ODER-verknüpft), höchstens 10, je höchstens 80 Zeichen, nicht leer; Treffer **genau** (Groß-/Kleinschreibung wie in der Facette), kein Muster |
| `price_min_cents`, `price_max_cents` | ganze Zahl 0 bis 10 000 000, **Verkaufspreis brutto in Cent**, beide Grenzen eingeschlossen; min ≤ max |
| `availability` | `in_stock` (Bestand > 0) oder `out_of_stock` (Bestand 0). Der frühere Parameter `in_stock=true` gilt weiter |
| `sort` | `relevance` (Standard), `availability`, `price_asc`, `price_desc`, `name`, `newest` |
| `page`, `page_size` | `page` 1 bis 10 000, `page_size` 1 bis 60 (Standard 24) |

Sortierung (alle enden auf der Produkt-ID, gleiche Werte vertauschen zwischen Seiten nie):
`relevance` und `availability` = Bestand absteigend, Name (**keine** Volltext-Gewichtung); `price_*` = Einkaufspreis (gleiche Reihenfolge wie
der Verkaufspreis), dann Name; `name`; `newest` = `first_imported_at` absteigend, dann `imported_at`.
Preisfilter und Preissortierung brauchen freigegebene Preise, sonst 409 `price_not_released`.

Seitenfenster: `page * page_size` darf 10 000 nicht überschreiten, sonst 422 `page_out_of_range` (`max_window_items`).

### Antwort
```
{
  "items": [ …wie bisher, plus delivery_days, fitment_* … ],
  "total": 6, "page": 1, "page_size": 24, "pages": 1, "q": "", "category": null, "sort": "relevance",
  "applied": { "q": "", "category": null, "brands": ["Alpha"], "price_min_cents": 1000, "price_max_cents": null, "availability": "in_stock" },
  "facets": {
    "categories":   [ {"id": 9, "name": "Bremsen", "root": false, "count": 3}, … ],     // höchstens 50, nach Anzahl
    "brands":       [ {"value": "Alpha", "count": 3}, … ],                              // höchstens 50, nach Anzahl, dann Name
    "availability": { "in_stock": 4, "out_of_stock": 2 },
    "price":        { "min_cents": 1547, "max_cents": 7735, "currency": "EUR" }          // null, wenn Preise nicht freigegeben
  },
  "limits": { "max_page_size": 60, "max_window_items": 10000, "window_limited": false }
}
```
Facetten zählen jede Dimension mit allen **anderen** Filtern, aber ohne den eigenen (so lässt sich eine Marke ab- und umwählen).
Zahlen stammen aus dem gespeicherten Freigabezustand; eine Zeile, deren Pflichtangaben inzwischen fehlen, wird aus der Seite
weggelassen (die Seite kann dann kürzer sein, bis neu bewertet wurde).

Bestehende Wege bleiben: `GET /api/shop/status` und `GET /api/shop/categories` zählen nur freigegebene Produkte;
`GET /api/shop/products/{id}` antwortet für nicht freigegebene Produkte mit 404 `product_not_found`.

**OFFEN – Index.** Für die Filter wären Indizes auf `release.status` und `release.brand` sinnvoll. `db.ensure_indexes` und die
Pflichtliste des Vercel-Einstiegs (`INDEXES`) wurden bewusst nicht geändert (ein neuer Pflichtindex würde den Einstieg schließen).
Nicht gegen eine echte Datenbank gemessen.

## 3. TK-16 Werkstattverzeichnis bereinigen

### Dublettenerkennung (IST, nur als Werkzeug)
`shop.workshop_directory.dedupe(db)` nach dem Muster von `shop.brands.backfill(db)`. **Standard ist der Probelauf**: er meldet
und schreibt nichts. `dedupe(db, apply=True)` setzt an den Kopien `duplicate_of` (Kennung des behaltenen Betriebs),
`duplicate_rule` und `duplicate_marked_at`; sonst ändert sich kein Feld, nichts wird gelöscht. Ein zweiter Lauf ändert nichts.
Das Werkzeug ist nirgends eingehängt (weder Start noch Anfragewege noch Betreiber-Route); ein Betreiber ruft es bewusst auf.
`unmark(db, id)` nimmt eine Markierung zurück (ebenfalls Probelauf, `apply=True` schreibt).

Regel: im selben Markt sind zwei Einträge Dubletten, wenn der normalisierte **Name** und die normalisierte **Straße** gleich sind und
die **PLZ** gleich ist (fehlt eine PLZ: dann der Ort). Normalisierung: Groß-/Kleinschreibung, Umlaute (ä = ae), Akzente, „&“ = „und“,
Satzzeichen, Rechtsformen (GmbH, e.K., B.V. …), „Straße / Str. / Strasse / straat“. Gleicher Name und gleiche PLZ mit anderer oder fehlender Straße
(Filialen einer Kette) wird **nur gemeldet** (`possible_groups`), nie markiert. Namen unter 3 Zeichen nehmen nicht teil.
Behalten wird: Partner, dann der vollständigere Eintrag, dann der mit Position, dann die kleinste Kennung. Stehen zwei Partner in einer
Gruppe, wird nichts markiert (`needs_review`).
Antwort: `examined`, `groups`, `would_mark`, `marked`, `needs_review`, `possible_groups`, `applied`, `remaining_possible`, `details[]`
(`keep`, `duplicates`, `rule`, `name`, höchstens 100), `possible_details[]`.

Wirkung in der Anzeige: **Suche** lässt markierte Kopien weg (Gesamtzahl entsprechend). **Detail** einer Kopie bleibt erreichbar
(bestehende Links und Anfragen) und trägt `duplicate_of` mit der Kennung des Betriebs, der stattdessen zu zeigen ist.

### Sperrliste (IST)
Konfiguration `apps/shop-api/shop/workshop_blocklist.json` (Version 1, **ausgeliefert leer**; kein Eintrag wurde erfunden).
Ein Eintrag nennt den Betrieb entweder mit `id` oder mit `name` und `zip` (Schreibweise egal, damit auch ein neu importierter Eintrag mit anderer
Kennung erfasst wird) sowie `grund` und `datum`. Unbekannte Schlüssel, fehlende Begründung, mehr als 5000 Einträge oder ungültige Kennungen
lehnt das Laden ab. Änderungen gelten ab der nächsten Anfrage (Prüfung nach Änderungszeit), ohne Neustart.

Wirkung: ein gesperrter Betrieb fehlt in der **Suche** (auch in `unlocated`), das **Detail** und die **Anfrage** an ihn antworten
`404 workshop_not_found`; es wird nichts gespeichert. Der Eintrag bleibt in der Datenbank.
**Ist die Liste nicht lesbar oder ungültig, antworten Suche, Detail und Anfrage mit `503 workshop_blocklist_unavailable`**: lieber geschlossen
als jemanden zeigen, der nicht gezeigt werden will.

**OFFEN – Vercel-Bündel.** Ob `shop/workshop_blocklist.json` im Vercel-Bündel liegt, wurde nicht geprüft (wie bei `partner_policy.json`,
siehe `docs/04-betrieb/shop-api-laufzeit-2026-11-14.md`, Abschnitt 6). Fehlt die Datei dort, antwortet das gesamte Werkstattverzeichnis mit 503.
Vor Auslieferung mit `apps/shop-api/tests/verify_vercel_bundle.cjs` prüfen.
**OFFEN – Wer pflegt die Liste?** Wunsch eines Betriebs und Quelle gehören in `grund`; wer Einträge freigibt und wie ein Wunsch nachprüfbar
ankommt, ist nicht festgelegt.

## 4. Betrieb: Aufruf der Werkzeuge (nie automatisch)

```
# in einer Umgebung mit denselben Variablen wie die Shop-API, Probelauf zuerst
python3 - <<'PY'
import asyncio
from shop.db import db
from shop import workshop_directory
print(asyncio.run(workshop_directory.dedupe(db)))          # schreibt nichts
PY
```
Produkt-Neubewertung: `POST /api/admin/products/release/reevaluate` mit `{}` (Probelauf) bzw. `{"apply": true}`.

## 5. Nicht geprüft

- Alles gegen einen Speicher im Arbeitsspeicher; **keine** echte MongoDB (Aggregationen, Sortierung mit Kennung, Indexnutzung, Laufzeit bei großem Bestand).
- `tests/test_teileklar_shop_api.py` braucht eine echte Datenbank und wurde übersprungen; seine Beispielprodukte wurden an die Pflichtangaben
  angepasst, der Lauf selbst steht aus.
- Kein Lauf gegen Lieferanten-Schnittstellen; der Importer bleibt durch `tenant_publication_contract_unverified` gesperrt.
- Ob die Pflichtangaben rechtlich genügen (E12), ob die Lieferzeit-Quelle feststeht, ob die Sperrliste im Vercel-Bündel liegt.
