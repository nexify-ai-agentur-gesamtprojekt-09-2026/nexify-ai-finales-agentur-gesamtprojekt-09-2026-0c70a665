# Lokaler Visitor-Gateway

Dieses eigenständige Entwicklungsfundament stellt echte lokale Besucheraktionen bereit. Es ist keine bestehende Factory-`/v1`-API, keine PostgreSQL-RLS-/SSO-Implementierung und kein produktiv freigegebener Internetdienst. Es verwendet ausschließlich die Python-Standardbibliothek und eine eigene SQLite-Datei außerhalb der Referenzen.

```sh
python3 apps/agent-gateway/server.py \
  --database /workspace/.onboarding/native-chat-preview/visitors.sqlite \
  --port 3003 --web-origin http://127.0.0.1:3004
```

`--seed-local-planning-proposals` legt ausdrücklich **lokale Planungsvorschläge** für Werktage an. Diese sind keine nachgewiesenen freien Kalenderzeiten von Pascal oder anderen Personen. Ohne diese explizite Vorschauoption werden keine freien Termine behauptet. Eine Anfrage hält den ausgewählten lokalen Vorschlag atomar fest; `confirmed=false` bleibt sichtbar. Es wird kein externes Kalenderereignis erzeugt.

| Operation | Nachgewiesene lokale Funktion |
|---|---|
| `GET /api/session` | anonyme cookiegebundene Sitzung, CSRF-Nachweis und eigener Verlauf |
| `POST /api/chat` | strukturierte Auswahl der Angebots-, Termin- und Marketingwege; kein vorgetäuschter LLM-Aufruf |
| `POST /api/quotes` | gespeicherter nicht verbindlicher Angebotsentwurf |
| `GET /api/quotes/{id}/pdf` | echte PDF-Datei mit Entwurfs-/Preisfreigabekennzeichnung, nur für den Eigentümer |
| `POST /api/quotes/{id}/send` | nach konkreter Empfängerbestätigung eine idempotente Versandabsicht, weiterhin `pending_provider`, `sent=false` |
| `GET /api/slots` und `POST /api/bookings` | eigene lokale Vorplanung, atomare Vergabe, wiederholbarer Anfragebeleg |
| `POST /api/marketing` | persistiertes strukturiertes Briefing, keine KI-/Publikationsbehauptung |

Writes erfordern aktuelle Sitzung, exakt zugelassene Host-/Originbindung, sitzungsgebundenen CSRF-Header und `Idempotency-Key`. Gleicher Schlüssel mit anderem Inhalt erzeugt 409; fremde Dokumente erzeugen 404. Unbekannte mitgelieferte Credentials werden nicht zum Gastzugriff heruntergestuft. Es gibt keine frei aufrufbare Shell-/Provider-/MCP-Ausführungsbrücke. Die öffentliche Seitenkonfiguration liefert keine Rechte.

Die lokale Cookieverbindung ist ausdrücklich HTTP/Loopback. Die Produktivintegration benötigt TLS/Secure-Cookies, eigene Auth-/Mandantenbindung, angemessene Missbrauchs- und Ratenbegrenzung, echte Kalender-/Mailadapter, Audit/Retention/Export und nachgewiesene Backup-/Restoregrenzen. Das technische Ablaufen der anonymen Sitzung nach einem Tag ist keine beschlossene Aufbewahrungsfrist der Inhalte. Es werden keine geschäftlichen Aufbewahrungsfristen erfunden und keine bestehenden Daten gelöscht.

```sh
python3 -m unittest discover -s tests -p test_native_chat.py -q
```

Die Tests verwenden eigene temporäre Datenbanken und tatsächliche lokale HTTP-Verbindungen, einschließlich Cookie/CSRF/Origin, Eigentümergegenprobe, Replay/Payloadkonflikt, konkurrierender Slotvergabe, persistierter Historie und realer PDF-Struktur. Kein Test sendet Nachrichten oder kontaktiert Zahlungs-/Modell-/Kalenderanbieter.

## BigBuy: begrenzter GET-Baustein (nicht aktiviert)

`bigbuy_get.py` stellt ausdrücklich aufzurufende Serverfunktionen bereit, keinen
HTTP-Route, Scheduler, Produktivkatalog oder aktivierten Shop. `config_from_env`
liest aus einer ausdrücklich übergebenen Serverkonfiguration ausschließlich die
Namen `BIGBUY_API_ENV` (`sandbox` oder `production`) und `BIGBUY_API_KEY`. Es
werden keine Clientvariablen oder Fallbackanbieter verwendet; keine Belegung wird
hier behauptet. `read_page` erlaubt nur eine ausgewählte Products-, Variations-
oder Stock-GET-Seite am festen BigBuy-Host; es benötigt explizite Grenzen,
einen vertrauenswürdigen Transport, eine atomare gemeinsame Quotenreservierung
und einen contentadressierten Speicher mit unveränderlichem Put und Readback.
Der Standardtransport lehnt Redirects ab. 401/403, 409, 429 und Timeout stoppen
ohne automatischen Retry. Empfangene Bytes werden vor Staging mit SHA-256 gebunden
und rückgelesen. Zusätzlich bindet ein separat gespeicherter und rückgelesener
Abrufbeleg Umgebung, Scope, Ressource, Seite, lokalen UTC-Zeitpunkt und Rohhash;
`stage_saved` prüft die Belege, verbietet gemischte Umgebungen und verwendet
die älteste Abrufzeit. Hashbindung ist keine Signatur oder Lieferanten-
Authentifizierung: Der vertrauenswürdige Aufrufer und der Zugriffsschutz des
persistenten Speichers bleiben Voraussetzung. `stage_saved` reicht diese Bytes an den bestehenden
Offline-Stagingvertrag `tools.bigbuy_batch.stage_raw_streams` weiter; dessen
Commit muss am Ziel tatsächlich vorhanden sein. Fake-Speicher und Fake-Quota in
Tests belegen nur den Vertrag, keine persistente Implementierung oder globales
Kontingent. Injected Transports sind vertrauenswürdige Serverabhängigkeiten und
müssen Redirects selbst verhindern; eine nachträgliche URL-Prüfung kann sonst
keine vorherige Credentialweitergabe rückgängig machen.

Die Read-Frist wird beim Abruf und zwischen Reads geprüft, ist aber keine harte
Betriebssystem-Prozessfrist für DNS, Transport oder benutzerdefinierte Adapter.
Der bestehende Shop-Snapshot besitzt ein anderes Datenformat; es ist kein direkter
Anschluss oder freigegebener Handelskatalog. Vor dem ersten echten Read-only-Test:
Tarif/API-Anspruch und Sandbox-/Produktionsscope bestätigen; serverseitigen
Secret-Store und Operatorrolle binden; echten zentralen Quoten- und sicheren,
verifizierten persistenten Speicher bereitstellen; enges Abrufbudget sowie
Daten-/Bildrechte und Datenschutz klären. Produktrechte, Passung, Frische,
Preise und Kauf bleiben ungeprüft, kein Checkout, Order oder Payment.

## Lokaler BigBuy-Katalogpfad (Fixture / private Kontrolle)

`bigbuy_local.py` bindet den GET-Baustein und die Stagingprojektion an die
bestehende `shop.catalog`-Schnittstelle des lokalen Gateway. Der explizit erzeugte
`LocalStagedCatalog` liefert nur SKU und gegebenenfalls EAN; Titel aus SKU sind
Kennungen, keine Produktbeschreibungen. Quelle, Bestand, Währung, Preis, Steuer,
Rechte und Passung bleiben unbestätigt. `saleEnabled`, Checkout und Order bleiben
false; es gibt keine freigegebenen Produkt-IDs. Die Route benötigt eine explizit
serverseitig übergebene Zugriffsfähigkeit via `X-Local-Catalog-Access`; fehlende
oder falsche Fähigkeit sowie fremde Origin werden mit 403 abgewiesen. Der Server
verweigert Nicht-Loopback und gesetzte öffentliche Origin. Der Aufrufer muss eine
kryptografisch zufällige Fähigkeit wählen und vertraulich halten. Loopback und
Dateimodus allein sind keine Isolation gegen andere Prozesse derselben UID oder
unabhängige lokale Proxies. Keine automatische Aktivierung im Standardstart.
Das vorhandene Frontend hat keine sichere Anbindung für diesen Kontrollzugriff;
seine bestehenden Texte zu Sprache und unbekannten Daten müssen vor einer echten
Oberflächenintegration separat geprüft werden.

`LocalBigBuyStore` initialisiert Tabellen nur auf ausdrücklichen Aufruf in einer
besitzerprivaten `nexify-bigbuy-isolated-*`-Testablage direkt unter dem lokalen
Tempverzeichnis und ausschließlich für `sandbox`; es ist kein Produktionsschema
und läuft nicht automatisch. Rohbytes werden nach Hash, Kontoalias und Umgebung
begrenzt gespeichert und beim Lesen erneut geprüft. Maximal 1.000 Artefakte und
16 MiB insgesamt; bestehende gleiche Bytes werden wiederverwendet. Dateien und
unmittelbare Eltern sind besitzerprivat, Links und unsichere Modi werden abgelehnt;
dies ist keine gegen gleichberechtigte lokale Prozesse gehärtete Secret-Ablage.
Quota-Claims verwenden eine SQLite-Transaktion, sind bei gemeinsamem Store pro
Alias/Umgebung/Ressource innerhalb eines Stundenfensters atomar und konservativ
auf 10 begrenzt. Aliase müssen vorher eindeutig dem tatsächlichen Providerkonto
zugeordnet sein; andere Datenbanken, andere Aliase oder Systeme werden nicht
koordiniert. Kein Auto-Retry und kein Kontingentnachweis des Anbieters.

Vor einem einzelnen echten privaten Sandbox-GET: tatsächlichen API-Anspruch und
Operator-/Kontoalias bestätigen, den bestehenden Schlüssel ausschließlich im
Serverkontext binden (`BIGBUY_API_ENV`, `BIGBUY_API_KEY`), zulässigen Abruf und
engen Budget-/Datenscope festlegen sowie sichere Aufbewahrung und Zugriff für die
konkrete Umgebung festlegen. Die Test-Tempablage ist nicht als dauerhafte oder
produktive Speicherlösung freigegeben. Ein GET begründet weder öffentliche
Daten-, Bild- oder Kaufrechte noch Bestands-, Preis- oder Fitmentfreigaben.
