# Quellenzuordnung: NeX2fly-Produktseite

Stand: 26.10.2026. Öffentliche Route `/produkte/nex2fly`, ID `nex2fly`, im kanonischen N1-Repository. Dies ist eine ergänzende Produkt- und Einstiegsseite im aktuellen Seitenmodell, keine behauptete vollständige Rekonstruktion einer ursprünglichen NeX2fly-Anwendung.

## Fachliche Zuordnung

Die ausdrückliche aktuelle Nutzerentscheidung bezeichnet die NeX2fly Suite und verlangt öffentliche Kundenregistrierung, 24 Stunden kostenlose Suite-Nutzung, separat finanzierte LLM-Nutzung über BYOK oder einmaliges Testguthaben von 500 Cent und Bestandserhalt beim späteren Wechsel. `config/selfservice-policy.json` konkretisiert Start, Dauer, Finanzierung und Identitätskontinuität. Die öffentliche Seite erklärt diese Entscheidung; sie behauptet keine aktivierte Registrierung, nutzbaren Schlüssel oder erfolgte Zahlung.

Die erhaltene N2-Übergabe beschreibt **one** als Antworten, Beratung und Entwürfe sowie **one+** als begrenzte Werkzeugausführung mit nachvollziehbaren Schritten und Freigaben. API und Terminal sind Zugangsformen. Diese Begriffe werden weder umbenannt noch als automatisch vollständig in NeX2fly implementiert ausgegeben. Agenturaufträge bleiben eigenständige Vereinbarungen; TEILEKLAR bleibt eigener Handelskontext.

## Tatsächlich gelesene Originale

- `reference/handoff-n2/dokumentation/01-produkt-und-marke.md`: Produktidee, one/one+-Unterschied, Zielgruppen, Entwurfscharakter der Tarife.
- `reference/handoff-n2/dokumentation/02-informationsarchitektur-und-journeys.md`: öffentlicher Produktbaum, Konto/Portale, technischer API-/Terminalweg und erkennbare Demo-/Fehler-/Sperrzustände.
- `reference/handoff-n2/dokumentation/12-api-technisches-datenblatt.md`: API-Zweck, Kostenstellen, Schlüssel, Budget und Verbrauchsjournal als Entwurf.
- `reference/handoff-n2/prototypen/NeXify AI one.dc.html`: vollständiger sichtbarer Originaltext aus dem HTML gelesen; Vergleich one/one+, Web/API/Terminal, vorbereitete Arbeitsabläufe und ausdrücklich unechte Bestellstrecke.
- `reference/handoff-n2/prototypen/NeXify API.dc.html`: vollständiger sichtbarer Originaltext gelesen; technischer Zugang, Budget/Schlüssel, Journal und Prototyp-Zahlungen.
- `config/rebuild-source-map.json`: Quelleninventar, aktuelle Selfservice-Entscheidung, externe Zugriffsbeschränkungen und passende N2-Quellzuordnungen gelesen. N2-one ist `source_id=153a14405bf4`, N2-API `source_id=8e561857df53`. Beide Originale bleiben unverändert erhalten; ihre Einheiten werden durch diese ergänzende Seite nicht pauschal als portiert oder abgenommen markiert.

Die externe NeX2fly-URL ist im vorhandenen Rebuild-Nachweis mit HTTP 403 und ohne gelesenen Anwendungscode verzeichnet. Hier wurde kein Zugriff umgangen und kein fremder Anwendungscode vorgetäuscht. In den gelesenen N2-Originalen wurde keine eigenständige NeX2fly-Produktseite nachgewiesen. Die `prototype_page_ids` verweisen deshalb ausschließlich auf die tatsächlich gelesenen N2-Originale one und API als fachliche Ableitungsquellen. Das Feld behauptet keine ursprüngliche NeX2fly-HTML-Seite; `derivation_kind` kennzeichnet die ergänzende aktuelle Nutzerentscheidung. Die übrige Herkunft liegt in der aktuellen Selfservice-Policy und den genannten fachlichen Produktquellen.

## Übernahme und Abgrenzung

| Ziel | Konkrete Übernahme |
| --- | --- |
| `nex2fly/produktwahl` | Suite-Einstieg aus aktuellem Auftrag; one/one+/API-Funktionstrennung aus N2-Originalen. Keine bestätigte Gleichsetzung der historischen Anwendungen. |
| `nex2fly/registrierung-teststart` | Öffentliche Kundenregistrierung; bestätigte E-Mail, aktivierter eigener Arbeitsbereich, ausdrücklicher Start; einmalige 24 Stunden; keine internen Verwaltungsrechte. |
| `nex2fly/llm-finanzierung` | Keine kostenlosen LLM-Credits; BYOK auf eigene Anbieterrechnung oder einmalig bezahlte 500 Cent; Verfügbarkeit ausdrücklich vorausgesetzt. |
| `nex2fly/nach-dem-test` | Kein automatischer Tarifwechsel oder Einzug; bestehende Identität, Mandant, Einstellungen, Schlüsselverknüpfungen, Dokumente, Verlauf und Guthaben bleiben erhalten. |
| `nex2fly/naechster-schritt` | Öffentliche Navigationswege zu Registrierungsinformation, Anmeldung, one/one+, API und Kontakt. Keine Zahlung und kein Konto werden durch die Seite ausgelöst. |
| `solutions` | Produktübersicht nennt NeX2fly, one/one+, API, Agenturleistung und eigenständigen TEILEKLAR-Kontext. |
| `one/produkt-einordnung`, `api/produkt-einordnung` | Ergänzte Erklärung der jeweiligen Produktaufgabe und öffentlicher Rückweg zur Suite-Einstiegsseite; bestehende Abschnitte erhalten. |
| `page-explainers` | Zwei zusätzliche textbasierte Erklärmodule mit eindeutig zugeordnetem AIFly-/NeX-Sprecher. Skriptentwürfe, keine behaupteten Clips; Medien-/Untertitel-/Transkriptfelder bleiben leer und `asset_pending`. |
| `nex2fly-trial` | Explizite öffentliche Orientierung: solutions → nex2fly → signup → login. Keine automatische Navigation oder Berechtigungsvergabe. |

Historische Mindestaufladungen, Beispielpreise, Umsatz-/Erfolgsversprechen, Steuerbeispiele, rechtliche Betreiberangaben, Hosting-/SSO-Garantien und globale Vertragszusagen werden nicht aus den Originalen übernommen. Das neue 500-Cent-Testangebot ändert das reguläre Prepaid-Minimum nicht. Interne Modell-/Providerlücken stehen in Policy und Betriebsmodell und werden nicht zu Implementierungsdetails im Besuchertext.

DE, NL und FR enthalten denselben fachlichen Umfang. Alle Aktionsziele sind ausdrücklich öffentliche bestehende Seiten. `public_allowlist` wird um `nex2fly` ergänzt; geschützte Portale und Workspace bleiben unberührt. Vercel bleibt das akzeptierte Live-Ziel; ChatGPT-Backupverfügbarkeit ist keine zusätzliche Freigabebedingung dieser Seite. Veröffentlicht, authentifiziert oder abgerechnet wurde mit dieser Konfigurationsänderung nichts.

## Quellensnapshot

Hashes dokumentieren den beim Schreiben gelesenen Stand; spätere autorisierte Änderungen erfordern Quellenreview, keine automatische Aussage über einen Fehler.

| Quelle | SHA-256 |
| --- | --- |
| `reference/handoff-n2/dokumentation/01-produkt-und-marke.md` | `d968e03fbce08660758d0833318054d4f8a9255c82686143eabb67fe81a16523` |
| `reference/handoff-n2/dokumentation/02-informationsarchitektur-und-journeys.md` | `2baeb53192a6f98ace40e3fdd72a0625186ad672c02573414a628d4c0b9c5dcb` |
| `reference/handoff-n2/dokumentation/12-api-technisches-datenblatt.md` | `de084cc83921d32d2b5aa7edcf65905c5f52e7efded85f266b5f9bd152941838` |
| `reference/handoff-n2/prototypen/NeXify AI one.dc.html` | `749a214abc9f5e8899d31eb647f467b10a0a59c9b6882773f57f9a3398e87184` |
| `reference/handoff-n2/prototypen/NeXify API.dc.html` | `efce0ae42d778190bd2466aee83b8e96e692592b441aa816e8140850e85dc8fb` |
| `config/selfservice-policy.json` | `355ccc200852e6e14087aa55a5dc10ed94e42f1a3222d9818086db393bcbf2ab` |
| `config/rebuild-source-map.json` | `e8a43626855540b65ed1589b460d4395fb14e18ca849ebb1039b58ccb15ea61f` |
