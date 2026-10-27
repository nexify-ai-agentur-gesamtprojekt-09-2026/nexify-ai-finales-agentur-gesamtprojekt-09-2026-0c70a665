## Aktuelle Quellenabgrenzung nach Originalfund

Direkt vom Parent gelesener Nutzertext25.10. verwirft alte Stimmen einschließlich
der Nutzerstimme. Der bisherige Vertrag behauptet eine neuere explizite Zuordnung
vom26.10., enthält aber keinen Originalchat-Locator. Daher ist die folgende
Castingtabelle nur historische Referenz, keine aktuelle Empfehlung oder Freigabe.
source_reconciliation in Medienvertrag, Plan und Presenterregister blockiert
Freigabe/Generierung bis zum Originalabgleich. IDs werden zur Provenienz erhalten;
keine bestehende Stimme gilt dadurch als geeignet. Kein bezahlter Lauf gestartet.
Die aktuellen Originalvorgaben verlangen echte Bewegung, sauberen Ton nach
Nutzeraktivierung, freie Charaktere ohne Bildschirmrahmen, passenden Hintergrund,
finalen AIFly-Charakter und integrierte Sprach-/zugängliche Ton-/Pausekontrolle.
Das13Sekunden-Trio-WebM ist nur ein noch zu prüfendes Reviewasset, nicht abgenommen.

# Hero-Videos und ElevenLabs über Composio

Stand 26.10.2026. Dies ist der abgeleitete Integrationsvertrag; keine behauptete aktive Medienpipeline. Die Nutzerergänzung nimmt Hero-Videos mit dem Nutzer und zwei weiteren Beteiligten in den Auftrag auf. Die anschließende Nutzerzuordnung benennt NeX, AIFly und den Nutzer. Assets und konkrete Seitenzuordnung werden weiterhin aus Quellen gebunden. Die drei Slots in `hero-media.json` bewahren diese Zuordnung.

## Quellen und Abweichung zur bisherigen Referenz

`prototypen/NeXifyAI Cloud v12.dc.html` enthält einen Hero mit Arbeitsfluss-Demonstration. `dokumentation/startseite-v12-gesamtkonzept.md` beschreibt ausdrücklich ein reagierendes Canvas statt einer Videoschleife. Die neue Nutzeranweisung ergänzt diese Quelle um Personen-/Vorstellungsvideos. Bestehende Demonstration, Markenwerte und Hauptaktion bleiben bei der späteren Umsetzung anhand der Seitenbestimmung nutzbar. Die Referenzdateien werden dafür nicht verändert.

Die getrackten Dateien von N1/N2 enthalten aktuell keine MP4-, WebM-, MOV- oder Audiodateien für diesen Auftrag. Eine Personendatei oder ein vorhandenes Bild wird nicht zu einer Video-/Stimmfreigabe umgedeutet. Verknüpfungen werden über stabile Seiten-IDs des `prototype-pages.json` und überprüfte Medienobjekte hergestellt. Leere `page_bindings` bedeuten noch keine vorgenommene Hero-Zuordnung.

## Funktionaler Ablauf

1. Eine berechtigte Person legt im eigenen Tenant/Projekt einen Medienentwurf an und bindet Quellasset, Hash, Sprache, Teilnehmer und beabsichtigte Verwendung.
2. Das Gateway prüft Rechte und Datenverarbeitung. Bestehende Videos einbinden, eine neue Erzählstimme erzeugen und Audio/Video montieren bleiben unterschiedliche Operationen. Keine bestehende Aufnahme erlaubt automatisch eine Stimmkopie.
3. Der Server bindet erst nach Prüfung des tatsächlich verfügbaren Composio-Aktionsschemas Konto, Aktionsversion und gegebenenfalls Voice-ID. Im Browser erscheinen keine Providergeheimnisse und kein fremdes Dashboard. Es gibt keine beliebige `execute`-Brücke.
4. Ein dauerhafter Auftrag erfasst Providerreferenz und Zustellstatus. Ein Timeout mit unbekanntem Ausgang führt zur Abklärung, bevor eine weitere kostenpflichtige Generierung erfolgt. Idempotenz bindet Tenant, Operation und Nutzlast-Hash.
5. Ein fertiges Medium wird gespeichert und exakt mit Tenant, ID, Version und Hash zurückgelesen. Erst danach beginnt die Sichtprüfung. Freigabe und Veröffentlichung sind getrennte Aktionen, an genau dieselbe Medienversion gebunden.
6. Öffentlich ausgeliefert wird ausschließlich die freigegebene Fassung mit Poster, Untertiteln/Transkript und zugänglichen Bedienelementen. Kein Tonautoplay. Die Seite bleibt ohne Video bedienbar; reduzierte Bewegung und Datensparwunsch werden berücksichtigt. DE/NL/FR werden je Fassung explizit geführt.

## Verbindungsstand

ElevenLabs über Composio ist vom Nutzer als erreichbar gemeldet. Die aktuelle Toolregistry bietet in dieser Sitzung keine Composio-/ElevenLabs-Operationen; auch `command -v composio` liefert keine CLI. Der Runtimebericht enthält keine gebundenen Credentials oder Fähigkeiten für diesen Dienst. Das beweist nicht, dass die Verbindung im Nutzerkonto fehlt. Es reicht hier noch nicht für einen technischen Verbindungs- oder Generierungsnachweis. Es wurden keine Dateien übertragen, keine Stimme kopiert, kein Providerjob ausgelöst und kein Video veröffentlicht.

`config/regelwerk.json`, R-06, und `docs/03-backend/integrationsarchitektur.md` führen eine bestehende personenbezogene Drittlandgrenze für Composio. Der aktuelle Verarbeitungsvertrag muss vor Übertragung personenbeziehbarer Medien verifiziert werden; die technische Erreichbarkeit allein ersetzt diesen Nachweis nicht. Die Umsetzung des lokalen Vertrags und der Seite wird dadurch nicht angehalten.

Nächster ausführbarer Integrationsschritt: über eine tatsächlich exponierte Verbindung das Aktionsschema und erlaubte Lesefunktionen prüfen, konkrete vorhandene Medienobjekte zuordnen und anschließend den serverseitigen Adapter gegen diesen Vertrag implementieren. Bis dahin bleibt `provider_contract_verified=false`.

## Explizite Stimmzuordnung des Nutzers

| Auftritt | ElevenLabs Voice-ID | Nachweis |
|---|---|---|
| NeX | `Lbm7qDmJUxIxpWx9qhZO` | Nutzerangabe 26.10.2026; technisch noch nicht gelesen |
| AIFly | `feTHtWuEJFLTOWyoreyy` | Nutzerangabe 26.10.2026; technisch noch nicht gelesen |
| Nutzer | `feTHtWuEJFLTOWyoreyy` | Nutzerangabe 26.10.2026; technisch noch nicht gelesen |

AIFly und der Nutzer teilen gemäß genauer Nutzervorgabe dieselbe ID. Es erfolgt keine automatische Korrektur, keine Ersetzung und keine neue Stimmkopie. Die IDs sind Konfigurationsreferenzen, keine API-Geheimnisse. Sie belegen weder Zugriff des aktuellen Providerkontos noch eine erzeugte Audiodatei. Die konkrete erlaubte Stimmenverwendung wird mit der jeweiligen Aktion und dem vorhandenen Providerrecht geprüft.

## Zuordnungsmatrix für vorhandene Voice-Referenzen · 27.10.2026

Bestand dieser Prüfung: Im Repository wurden in den üblichen Audio- und
Videoformaten keine entsprechenden Dateien gefunden; die Assets-Verzeichnisse
enthalten unter anderem Bilder, aber keine Hörproben. Die folgenden IDs sind
vorhandene **Referenzen**, keine lokal geprüften Voice-Assets. Die Zuordnung ist
inhaltlich anhand der Sprecherrollen und Textentwürfe vorgeschlagen; Klang,
Aussprache, tatsächliche Sprachunterstützung, Kontozugriff und Nutzungsrechte
sind nicht geprüft. Quellen sind `hero-production-plan.json`,
`config/presenter-system.json` und `config/page-explainers.json`.

| Voice-Referenz | Sprecherrolle | Sprache und geeignete vorhandene Texte | Bewertung und Alternative |
|---|---|---|---|
| `Lbm7qDmJUxIxpWx9qhZO` | NeX: Umsetzung und Prozess | Hero `hero-nex-de-001` und Seitenmodule `automation-explain-1`/`apps-portals-explain-1`. **DE/NL/FR-Heroentwürfe** stehen in `hero-production-plan.json`. | Vorläufig behalten; akustische Prüfung und Provider-Readback fehlen. |
| `feTHtWuEJFLTOWyoreyy` | AIFly: Orientierung und Wissen | Hero `hero-aifly-de-001` und Seitenmodule `home-explain-2`/`knowledge-explain-1`/`tk-search-explain-1`. **DE/NL/FR-Heroentwürfe** stehen in `hero-production-plan.json`. | Neu besetzen, wenn die vorhandenen Provider-Assets eine eigene passende Stimme enthalten. AIFly muss in gemeinsamen Wegen sofort von Pascal und NeX unterscheidbar sein. |
| `feTHtWuEJFLTOWyoreyy` | Pascal/Nutzer: persönliche Projektklärung und Vertrauen | Hero `hero-user-de-001` und Seitenmodule `home-explain-1`/`company-explain-1`/`contact-explain-1`. **DE/NL/FR-Heroentwürfe** stehen in `hero-production-plan.json`. | Vorläufig nur für Pascal behalten, wenn persönliche Verwendung, Klang und Rechte bestätigt sind. Keine Stimmkopie aus einem Bild oder einer bloßen ID ableiten. |

Die Sprachen DE/NL/FR beziehen sich auf vorhandene **Textfassungen**, nicht auf
nachgewiesene Sprachfähigkeiten der Stimmen oder fertige Aufnahmen. Die
Seitentexte sind Skriptentwürfe und keine Zusage tatsächlich laufender
Funktionen. Vor einer endgültigen Auswahl die beiden konkreten Stimmen je
Sprache anhören, Aussprache und Unterscheidbarkeit prüfen sowie die jeweilige
Verwendung und Rechte anhand des tatsächlichen Kontobestands bestätigen.
Die historische, jetzt ausgesetzte Castingentscheidung lautete: NeX vorläufig behalten,
Pascal nur nach persönlicher Rechte- und Hörprüfung behalten, AIFly bevorzugt
aus den vorhandenen Provider-Assets eigenständig neu besetzen. Eine konkrete
bessere AIFly-ID ist erst nach echtem Asset-Inventar und Hörvergleich belegbar.
Vergleichstexte, Rollenprofile und Abnahmekriterien stehen maschinenlesbar in
`hero-production-plan.json`.

## Runway: Bestand zuerst, Fehlendes erstellen

Der Nutzer benennt Runway als Quelle der Videos und beauftragt ausdrücklich die Erstellung fehlender Clips. Das ist Teil des Auftrags; eine weitere pauschale Erstellungsfreigabe ist nicht nötig. Der aktuelle Toolbestand enthält auch keine Runway-Operation und `command -v runway` liefert keine CLI. Provider-Asset-IDs, Modellversion, Kontozuordnung und generierte Dateien sind daher noch nicht technisch nachgewiesen. Die einzige Runway-Textfundstelle im Prototypbestand ist eine gleichnamige Reifenmarke und keine Medienintegration.

Ablauf: Runway-Bestand autorisiert lesen → vorhandene Medien an NeX/AIFly/Nutzer und Seiten binden → fehlende Varianten identifizieren → Skript-/Promptfassung und vorhandenes Generierungsbudget binden → nur fehlende Clips erzeugen → ElevenLabs-Audio gemäß exakter Voice-Zuordnung ergänzen → lokale Dateiprüfung, Untertitel, Wiedergabe und Sichtfreigabe → versionierte Veröffentlichung. Für Budget und Modelle gelten die tatsächliche Kontokonfiguration und das geprüfte Provider-Aktionsschema; es werden keine fiktiven Grenzen oder Modell-IDs erfunden. Ohne reale Verbindung werden keine Jobs als gestartet oder geliefert ausgewiesen.
