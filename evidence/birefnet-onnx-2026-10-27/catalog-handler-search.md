# Lokale Suche nach Kataloghandler und BigBuy-Pagination

27.10.2026; rein lesende technische Recherche im bestehenden Owner. Ergebnis:
**Der tatsächliche Upstreamhandler für `https://teileklar.shop/api/shop/products`
und eine ausführbare historische BigBuy-Import-/Fortsetzungslogik wurden in den
unten exakt bezeichneten lokalen Quellen nicht gefunden.** Das ist eine begrenzte
lokale Abwesenheitsfeststellung, keine Behauptung, es gebe den produktiven Handler
nirgendwo. Kein Pagingparameter und keine Vollständigkeits-Endbedingung werden
aus dem bekannten `page=2`-Duplikat geraten.

## Tatsächlich gefundene lokale Implementierung

Alle folgenden Ownerquellen sind in Commit
`da25e75dc48846c0cef4faba7e7b5f340d1481de` enthalten:

| Quelle | Beleg und technische Bedeutung |
| --- | --- |
| `tools/catalog_snapshot.py:16` | Feste Upstream-URL `/api/shop/products`; ausschließlich Client, kein Handler. |
| `tools/catalog_snapshot.py:28` | `fetch_snapshot(maximum_rows, maximum_bytes, timeout_seconds, opener=None)`; explizite Eingangsbudgets. |
| `tools/catalog_snapshot.py:33` | Genau ein GET mit `?limit=<maximum_rows>`. Kein `page`, `offset`, `cursor` oder Folgerequest. |
| `tools/catalog_snapshot.py:38` | HTTP200 und JSON-Medientyp erforderlich. |
| `tools/catalog_snapshot.py:42` | Schleife liest nur denselben HTTP-Responsebody in begrenzten Chunks; `not chunk` beendet das Lesen dieses einen Bodys. Das ist keine Pagination-Endbedingung. |
| `tools/catalog_snapshot.py:56` | 401/403 stoppen; 429 und sonstige Fehler ohne automatischen Retry. |
| `tools/catalog_snapshot.py:70` | Antwortschema exakt `{items: list, total: int}`, `len(items) <= maximum_rows` und `total >= len(items)`. Kein `next`, Token oder Responseheader für Fortsetzung ausgewertet. |
| `tools/catalog_snapshot.py:79` | Manifest immer `pagination_status=partial_unverified_continuation`; `reported_total` ist gemeldet, keine ausgelesene Gesamtmenge. |
| `apps/agent-gateway/server.py:341` | Tatsächlicher lokaler GET-Handler ist **`/api/shop/catalog`**, nicht `/api/shop/products`. Akzeptiert nur `q`, `category`, `locale`, jeweils einmal; unbekannte Queryfelder werden mit422 abgewiesen. |
| `apps/agent-gateway/server.py:348` | Delegiert ausschließlich an gebundenes `shop.catalog(...)`; ohne Shop503. Kein unmittelbarer Supplierabruf. |
| `apps/agent-gateway/catalog.py:134` | ReadOnlyCatalog filtert ausschließlich bereits vorhandene Snapshotzeilen. |
| `apps/agent-gateway/catalog.py:145` | Antwort bleibt `partial=true`, `page_parameter=not_verified`; führt `reported_total`, `snapshot_rows`, `matching_snapshot_rows`. |
| `tools/bigbuy_batch.py:59` | Fünf lokale Inputfeeds: products/information/images/stock/taxonomies. |
| `tools/bigbuy_batch.py:62` | Reine Funktion `prepare(...)` über Callerbytes; keine HTTP-/Importloop-/Pagingimplementierung. |
| `tools/bigbuy_batch.py:66` | Explizit keine Vollständigkeitsbehauptung und keine Remote-Löschentscheidung. |
| `docs/contracts/readonly-catalog.md:46` | Bereits dokumentierter Parent-Lesetest: `page=2` ergab dieselben IDs wie page1. Hier nicht erneut angefragt. |
| `docs/contracts/readonly-catalog.md:50` | Vollständige Fortsetzung/Sync weiterhin unbewiesen; keine Löschableitung. |

Der ähnlich benannte Factoryvertrag `/v1/shop/products` ist eine andere
spezifizierte Naht (`tools/verify_factory_contract.py:29`,
`docs/contracts/factory.openapi.json:6922`). Seine `next_cursor`-Schemas beweisen
keinen Cursorvertrag für den vorhandenen öffentlichen `/api/shop/products`-
Endpunkt und wurden nicht als solchen übernommen.

## Vorhandene BigBuy-Dokumentationsauszüge

`evidence/bigbuy-batch-2026-10-27/source-contract.json` ist ein bereits lokal
vorliegender technischer Auszug, kein bei dieser Recherche heruntergeladenes
Dokument. Er bindet ursprüngliche öffentliche Spezifikation API1.0.0,
497418Bytes, SHA256
`0ac03f05a542d801544a7afeef496d234eb439885b642b77e5d71b80f20e4d91`.

| Pfad im Auszug | Lokale Zeile | Bekannte Parameter |
| --- | ---: | --- |
| `/rest/catalog/products.{format}` | 12 | `page` Integer, `pageSize` Integer, jeweils Beschreibung „Default0“; optional `parentTaxonomy`. |
| `/rest/catalog/productsinformation.{format}` | 50 | `page`/`pageSize` **Strings** laut genau diesem Auszug; optional `isoCode` (Default es), `parentTaxonomy`. |
| `/rest/catalog/productsimages.{format}` | 97 | `page`/`pageSize` **Strings** laut genau diesem Auszug; optional `parentTaxonomy`. |
| `/rest/catalog/productsstockbyhandlingdays.{format}` | 135 | `page`/`pageSize` Integer; optional `parentTaxonomy`. |
| `/rest/catalog/taxonomies.{format}` | 173 | `isoCode`, `firstLevel`; kein `page`/`pageSize` in diesem Auszug. |

Der Auszug enthält ausgewählte Row-Schemas, aber **keine Responses-/Header-/
Fortsetzungs-/Endbedingungsdefinition**. „Default0“ belegt weder Indexbasis,
limit0-Semantik, Ende bei leerer/kurzer Liste noch stabile Sortierung. Diese
BigBuy-REST-Parameter dürfen außerdem nicht auf einen anders implementierten
TEILEKLAR-Proxy übertragen werden. Kein neuer Adapter, kein Remoteaufruf und
kein Vollimport wurden ausgeführt.

## Exakt geprüfte lokale Repositories und Refs

`git worktree list --porcelain` des Owners nennt ausschließlich:

- `/workspace/nexify-one-app`, `integration/one-web-app-2026-10-27`,
  `e69a6891692ad148578766e3b142f91612ba43c8`.
- `/workspace/nexify-current-integration`, `integration/current-main-2026-10-27`,
  `da25e75dc48846c0cef4faba7e7b5f340d1481de`.

Zusätzlich wurde die vorhandene autorisierte Agencykopie
`/workspace/nexify-kanonisch`, main
`80e84693883713af383eb471c94a68ee55972534`, geprüft. Ihr eigenes Worktreeinventar
enthält nur diesen Worktree. Repository ist nicht shallow; die main-Historie
enthält149Commits. Technische Pfade `apps`, `tools`, `scripts`, `api`, `lib`, `src`,
`packages`, `server.mjs`, `docs`, `dokumentation` wurden nach Endpoint- und
BigBuybezeichnern durchsucht; zusätzlich nach allgemeinen `products`-/`shop/`-
Bezeichnern in Code, damit zusammengesetzte Routen nicht allein wegen fehlendem
Endpointliteral übersehen werden. Prototypen wurden nur als historische
technische Referenzen nach exakt diesen Endpoint-/BigBuybezeichnern durchsucht,
nicht als Handler übernommen.

Kanonischmain hat lediglich einen statischen Vorschau-Webserver
`server.mjs:43`/`:65`; keine Supplierroute. `apps/web/lib/catalog.ts:8`/`:12`
ist ein Seitenkatalog aus `config/site-map.json`, kein Produktfeed.
`docs/01-konzept/teileklar-shop.md:48`/`:49` nennt Backend spezifiziert und
Katalog-/Bestands-/Preisanbindung mit ausstehendem Lieferantenvertrag; diese
historischen Statusaussagen sind keine aktuelle Produktionsabnahme.

Zusätzliche Ref-Treeprüfung per `git grep -l -I -E` nach
`/api/shop/products|api\.bigbuy\.eu|BIGBUY|bigbuy|BigBuy`, beschränkt auf technische
Code-/Markdown-/JSON-Dateien, ergab:

| Lokales Repo | Ref | Commit | Ergebnis |
| --- | --- | --- | --- |
| `/workspace/nexify-current-integration` | `refs/heads/integration/current-main-2026-10-27` | `da25e75dc48846c0cef4faba7e7b5f340d1481de` | Treffer ausschließlich aktueller Offline-/Snapshotcode und zugehörige technische Verträge |
| `/workspace/nexify-current-integration` | `refs/heads/integration/one-web-app-2026-10-27` | `e69a6891692ad148578766e3b142f91612ba43c8` | keine Treffer |
| `/workspace/nexify-current-integration` | `refs/heads/integration/reviewed-v11-followup-20261027-8975ba4` | `8975ba4a07a23c5cc961f735efc3111883b8ddad` | Treffer ausschließlich aktueller Offline-/Snapshotcode und zugehörige technische Verträge |
| `/workspace/nexify-kanonisch` | `refs/heads/main` | `80e84693883713af383eb471c94a68ee55972534` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/codex/automatiere` | `627285cd1be141b14264d53ce737e857aea29c61` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/codex/frage-nexify-jeff-fuer-naechsten-task` | `4af0d5a3d53e9883572ffde7fa69de08a6652bb1` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/codex/starte-automatiere` | `740759c2141a1c0f47c39e98b81a97b39fda4074` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/dsh-enterprise-deployment` | `f08b2a5bb0ba3e1a61877e2827def7d2e3db6bb0` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/main` | `07833fb3f8166a3f8534f52bb1c1843c49f40919` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/mirror-sync` | `de8fb2817bba583360311903aa8d3bb97a356171` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/myadmin-p0-cockpit` | `b4c5211eb0b50496076b8dacd87d50fbb121a2b3` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/nexifyai-dev-live-seitenfehler-beheben` | `d48f96bdcef4cbb17fe27e8bd3547160fdb5bf34` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/nexifyai-dev-vollstaendiger-bug-audit` | `be8bd7d4e49323c79737222b4e35ee793d03e3a5` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/v0/finalize-cloud-home` | `0a93d031300db25144ba06c4faaf0449f385f29c` | keine Treffer |
| `/workspace/nexify-kanonisch` | `refs/remotes/origin/v0/ist-zustand-laden-d81e1c43` | `0c415db0de0804193601b8d1e4491caaec61c31e` | keine Treffer |

Kanonischmain wurde zusätzlich mit `git log main -G` für dieselben Bezeichner in
technischen Quellen einschließlich entfernten Dateiversionen geprüft: keine
Treffer über die149vorhandenen main-Commits. Owner-HEAD-Historie enthält nur die
bereits beschriebenen Offline-/Snapshot-/Shopnahtänderungen
`65a8e8bf2b0a383110f5dfddc681809a46c5447a`,
`69ed580cb62b99b771a4c073122030a106c9639f`,
`26f9128cfb846bc7fad85d43bb182ed01d2102d1`,
`da25e75dc48846c0cef4faba7e7b5f340d1481de`.

`git cat-file -e <id>^{commit}` findet die erwähnten historischen Importerstände
`4a2cc3a` und `73f7eb7` **in keinem der drei lokalen Repositories** (je exit128).
Sie können hier daher weder gelesen noch hinsichtlich Pagination bestätigt
werden. Nicht gesucht wurde in neu geklonten oder Remotequellen.

Explizit ausgeschlossen: alle `factory/*`-Refs, insbesondere die verworfene
Monorepo-Autonomie; A1-/Kundenportalpfade und `reference/handoff-n2`; rein
optimierende `perf/*`-Refs, `origin/HEAD` als Alias und Owner-local-control-Ref
wurden nicht als zusätzliche Produktquellen behauptet. Kein Kundenimport,
kein Checkout/Reset/Fetch/Clone, keine Server-/MCP-/Remoteaktion. `.env`,
Credentials, `.ssh`, `.codex`, private Notes und DB-Dateien wurden nicht gelesen.

## Bindung der direkt gelesenen Ownerdateien

- `tools/catalog_snapshot.py`: `f3adad6d639ad2b8e1128350d73d8dfbf3e8c442535d25facb1f6f6d3dff12db`
- `apps/agent-gateway/catalog.py`: `22d3f7faac91e471a137d8c2427ec0fbc8e9749f8400b4b150c57633259c7cfa`
- `apps/agent-gateway/server.py`: `a676defdf7dcdee6d299afa30b3ab19a59d317ce154583c4ba058d9177a33166`
- `tools/bigbuy_batch.py`: `0e790b975c018218dcee4d06891475a9bfc3267393bd04e852b5e2360f944647`
- `docs/contracts/readonly-catalog.md`: `8d07e3e37a3031d0597717170929f0e3738f395bc3d6186c25abe36410810188`
- `docs/contracts/bigbuy-batch.md`: `21ac93ced78511c403690bb13ed9f7f27f1b9da44208042071a9592687dd9f32`
- `evidence/bigbuy-batch-2026-10-27/source-contract.json`: `4258bb43a18398403b4d10c272fed42ee520a6f7e99149adfd622766c93c5285`

## Konkreter nächster Eingang

Für einen vollständigen laufenden Katalog ist der tatsächlich deployte
`/api/shop/products`-Handler samt exaktem Repository/Commit oder dessen
verbindlicher Fortsetzungsvertrag weiterhin erforderlich. Erst daraus konkrete
Parameternamen, Grenzen, Sortierung, Total-/Nextsemantik, Fehler und sichere
Endbedingung implementieren und Duplikat-/Wiederanlauffälle testen. Bis dahin
bleibt der bestehende Ein-Response-Snapshot ausdrücklich partiell. Der parallel
gebaute lokale Bildadapter ändert daran nichts.
