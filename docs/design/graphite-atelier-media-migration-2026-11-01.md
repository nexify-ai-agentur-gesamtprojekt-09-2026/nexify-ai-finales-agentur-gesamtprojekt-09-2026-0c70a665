# NeXify · Graphite Atelier und Medienmigration

Arbeitsstand 01.11.2026 · Entscheidung USER-LUXURY-20261101 · private Site `appgprj_6ae7ad63df2081918a843f996caf9422`

Die neue Richtung ist ruhiger Luxus: warmes Graphit, satiniertes Platin, Champagnerkanten und gezieltes Rauchglas. Das grüne X bleibt der Markenanker. Diese Ausführung liefert eine konkrete visuelle Überarbeitung und eine geprüfte Medien-/REA-Vorbereitung. Sie ist keine technische Gesamtfreigabe der Agenturplattform und kein Nachweis fertiger synchronisierter Figurenfilme.

## Konkrete Änderungen

- Der markierte Kontohinweis sitzt jetzt in einem begrenzten Inhaltsbereich mit eigenen Innen- und Außenabständen. Beim tatsächlich geprüften Desktopzustand: 960 px Breite, x=194 px, 32 px Innenabstand. Die Konto-Funktion bleibt eine Verfügbarkeitserklärung; der bekannte Selbstlink ist keine neu angeschlossene Registrierung.
- Die Assistenz öffnet sich auf Wunsch als abgerundetes, begrenztes Dock. Ein 48-px-Einklapppfeil ersetzt das isolierte Text-„×“. Er besitzt ein lokalisiertes zugängliches Label. Escape, mobile Dialogbegrenzung und Rückkehr des Fokus zum sichtbaren Öffner bleiben erhalten. Die Entscheidung innerhalb des Besuchs wird weiter berücksichtigt.
- Opake Leseflächen, weniger Mono-/Großbuchstabenetiketten und weniger grüne Lichtbahnen. Glas ist auf funktionale Flächen konzentriert. Es gibt Rückfälle für reduzierte Transparenz, höhere Kontraste und Forced Colors; Reduced Motion bleibt berücksichtigt.
- Gemeinsame Materialquelle für Vite und Next. Neue Werte zuerst in `config/design-tokens.json`, anschließend generiert nach `packages/tokens`. Die bisherigen Tokenwerte wurden erhalten; neue Atelierrollen ergänzen sie. Umsetzung: `LuxuryMaterials.css`.
- Drei neue, visuell geprüfte Editorial-Motive. Sie sind Konzeptbilder ohne Personen, keine realen Produktangebote, Kundenreferenzen oder fertigen Produktoberflächen. 17 öffentliche Fachrouten haben eine explizite Zuordnung; zusätzlich nutzt die Startseite die Motive. Rechts-/Kontoseiten erhalten keine unpassende Produktdekoration.
- Die Home-Ansichten veröffentlichen keine ungeprüften Review-/Ambientperformances mehr. Ruhige Bilder und die unveränderten vorhandenen Figuren treten an ihre Stelle. Keine fingierten Film-Playbuttons. Vorhandene Dateien und der bisherige Playercode bleiben erhalten.
- Der kleine Oracle am Assistenzöffner verwendet die vorhandene glatte Zielbildfassung mit Hut/Monokel. Keine neue Identität und keine Gesichtsbearbeitung von Pascal.

## Materialsystem und Bildzuordnung

| Rolle | Wert | Verwendung |
|---|---|---|
| Canvas | `#111212` | Warmes Graphit |
| Surface | `#191B1C` | Opake Lesefläche |
| Raised | `#242728` | Erhöhte Fläche |
| Ink | `#F3F0EA` | Haupttext |
| Platinum | `#BDC5C9` | Sekundärtext und Metalllicht |
| Champagne | `#C4B394` | Kleine warme Akzente |
| Lime | `#C0EE38` | Bestehendes X und gezielte Hauptaktionen |

Rechnerischer Volltonkontrast auf Surface: Ink 15,20:1; Platinum 9,87:1; Champagne 8,41:1; Muted 8,96:1. Kleinster geprüfter Wert dieser vier Textfarben gegen Canvas/Surface/Raised: 7,32:1. Das sind Tokenpaarberechnungen, keine vollständige WCAG-Abnahme und keine Messung jeder zusammengesetzten Glasfläche.

| Motiv | Fachlicher Zweck | Technischer Bestand |
|---|---|---|
| Rauchglas-Layoutstudie | Websitegestaltung und Projektumfang | `web-glass-20261101.webp`, 1536×1024, 80.450 Bytes, 3 Fachrouten |
| Verbundene Glas-/Dokumentebenen | Automatisierung, Suite, Portale, Wissen/API | `workspace-glass-20261101.webp`, 1536×1024, 187.268 Bytes, 8 Fachrouten |
| Metallteile im Werkstattatelier | TEILEKLAR, Fahrzeugpassung und Werkstattkontext | `automotive-metal-20261101.webp`, 1536×1024, 191.156 Bytes, 6 Fachrouten |

Alle drei Dateihashes stimmen mit `config/editorial-art.json` überein. Erstellung mit der integrierten Bildgenerierung; Ausgangs-PNGs erhalten, WebP-Ausgaben für die Site. Bildauftrag: präzise fachliche Stillleben aus Rauchglas, Platin und Champagnermetall; ruhiges Studiolicht, minimale Lime-Akzente, keine Personen/Logos/Neon-/Militärmotive oder fingierte Produktoberflächen. Website: gravierte Layoutebenen. Arbeitsplatz: geordnete Dokumentebenen mit einer verbindenden Brücke. TEILEKLAR: Bremsscheibe, Riemen und Werkzeug als gekennzeichnetes Editorial-Konzept.

## Echte Lippen- und Gestenperformances

REA ist ein Analysewerkzeug. Es ersetzt weder Performanceaufnahme noch Medienproduktion oder Identitätsabnahme. Die bisher vorhandenen stummen Home-Loops koppeln höchstens einen Wiedergabezustand; sie sind keine geprüfte Phonem-/Lippenperformance. Der vorhandene Runway-Hero steht weiterhin auf `produced_pending_owner_review`. Die Medienregistry enthält keine final freigegebenen Bereichsfilme.

Als konkreter vorhandener Produktionspfad wurde Runway Act-Two anhand offizieller Dokumentation geprüft: Charakterbild plus tatsächliches Performancevideo. Gestensteuerung ist für Charakterbilder vorgesehen; bei Charaktervideos bleibt deren Körperbewegung maßgeblich. Einzelne Darbietungen von 3–30 Sekunden sind der dokumentierte Rahmen. Eine fertige Tonspur allein liefert keine natürliche Körperperformance.

Die API beschreibt `POST /v1/character_performance`, Modell `act_two` und API-Version `2024-11-06`. Der hier exponierte Runway-Connector führt `act_two` in seinem `generate_video`-Modellvertrag jedoch nicht. Eine dokumentierte Hersteller-API ist daher noch keine aufrufbare Integration dieser Sitzung. Kein Modellname, Workflowgraph, Credential oder Webhook wurde erfunden. Für andere Anbieter ließ sich in der begrenzten Recherche kein ausreichend belastbarer aktueller offizieller Vergleich herstellen; es wird keine vollständige Markt-/Bestanbieterprüfung behauptet.

Dokumentierter API-Richtpreis zum Prüfzeitpunkt: 5 Credits/Sekunde, 0,01 USD/Credit. Beispiel: ein 10-s-Take ungefähr 0,50 USD; drei Einzelrollen mit je zwei 10-s-Versuchen ungefähr 3 USD reine Generierung vor Steuern und weiteren Produktionsschritten. Dies ist keine Budgetfreigabe, kein Kontostand und kein Gesamtprojektangebot. Kein kostenpflichtiger Runway-Aufruf wurde ausgeführt.

| Paket | Owner | Voraussetzung / Arbeit | Abnahme und Rückweg |
|---|---|---|---|
| Identitätsmaster | Grafik/Brand | Hochauflösender aktueller Pascal-, NeX- und glatter Oracle-Master, Herkunft und zulässige Varianten | Originalidentität unverändert; kein Alterungs-/Gesichtsdrift. Originale erhalten. |
| Stimme und Darbietung | Grafik/Brand, Pascal für eigene Aufnahme | Tatsächlich freigegebene saubere Stimme; einzelne Takes mit sichtbarem Gesicht/Händen, ohne Schnitte, passende Startpose | Stimme erkennbar; natürliche Betonung und Gestik. Keine fremde Stimme als Pascal ausgeben. |
| Figurenregie | Grafik/Brand | Pascal: Mund und Hände; NeX: Schnabel/Flügel ohne menschliche Zähne; Oracle: Blick/Haltung ohne erfundenen Mund | Gleiche Charakterbibel, konsistentes Material, keine neue Morphologie. |
| Produktionsadapter | Backend/Portale | Tatsächlicher Providervertrag, bestehende sichere Credentialbindung, konkretes Creditbudget, Task-ID und begrenztes Polling | Timeouts und unklare Ausgänge zuerst abgleichen; kein blindes erneutes Bezahlen. Kein Browsersecret. |
| Schnitt und Webausgabe | UX/Frontend | Finale Tonspur als Zeitbasis, Sprecher-/Gestencues, Poster, Untertitel/Transkript; bei freier Figur echter Alphakanal | MP4/WebM statt großer GIFs; ruhiger Posterfallback, erreichbare Pause und Reduced Motion. |
| Freigabe | Qualität, Grafik/Brand | Anfang/Mitte/Ende und Sprecherwechsel tatsächlich ansehen/anhören; Seek, Pause, Replay und Mobil/Desktop prüfen | Identität, Lippen/Schnabel, Hände, Blick und Audio gemeinsam prüfen. Exakte Datei-/Skript-/Stimmhashes vor Veröffentlichung; Rückweg zum geprüften Still. |

Der erste sinnvoll abnehmbare Produktionsumfang ist ein kurzer einzelner Gastgeber-Take mit vorhandener fachlicher Aussage. Danach NeX und Oracle getrennt prüfen, erst anschließend Mehrfigurenkomposition und Sprachfassungen. Kein gleichzeitiger ungeprüfter Austausch aller 52 Erklärslots. Die vollständige Bereichsabdeckung bleibt geschuldet und offen.

## REA: gefunden, wiederhergestellt, tatsächliche Grenze

Identität: **Reverse Engineer Anything**, Repository `morluto/rea`, npm `rea-agents`, MCP-Name `io.github.morluto/rea`. Release 6.8.0, Tagcommit `160d821ac9a0310afcb8d1fc427862dd6508add5`. Zusätzlich frisch gelesener upstream-main `d3ab0faf52a02ff5a618f3ed7beb608b78752abd`; gleiche Versionsnummer bedeutet keinen identischen Quellstand. MIT-Lizenz, Fremdwerkzeuge und Zielsoftware behalten eigene Rechte.

Isolierte Wiederherstellung in dieser Arbeitsumgebung: Registryintegrität mit dem bestehenden Nachweis identisch; 2.398 Paketdateien bytegleich mit dem SHA512-geprüften Archiv. Lifecycle-Skripte und optionale Pakete deaktiviert. Keine globale Clientregistrierung, kein HTTP-Listener, keine Sicherheitsänderung und keine Secretübertragung. Tatsächliches MCP-initialize: REA 6.8.0, Protokoll 2025-11-25. Vollständige Pagination: 229 Tools, 6 Prompts.

Die enge eigene Fixture-Probe stoppt bereits bei `binary_session`: `capability_unavailable / unsupported_provider`, Provider `process-ownership`; `ps` meldet `fatal library error, lookup self`. `retryable:false`. Der Server wurde sauber beendet. Die Fixture wurde nicht analysiert oder ausgeführt; es gibt keine erfolgreiche Analyse-Evidence-ID. Kein Prozessprüfungs-Bypass oder Shim wurde eingesetzt. Exakter persistierter Bericht: `docs/research/rea-restoration-2026-11-01.json`.

Der nächste REA-Schritt gehört Infrastruktur/Netz: auf einer dafür geprüften Laufzeit die Prozessvoraussetzung herstellen, isolierten stdio-Start wiederholen und genau eine autorisierte öffentliche Fixture analysieren. Danach Evidence-ID und Inhalt exakt zurücklesen. Erst dann die eigene Mediensteuerung quellengebunden untersuchen. Keine öffentliche Freigabe des optionalen unverschlüsselten HTTP-Listeners; sein dokumentierter Vertrag enthält keine Clientauthentifizierung und teilt eine aktive Zielsitzung. Die isolierte lokale Wiederherstellung ist keine dauerhaft aktive Factory-Migration.

## Verifikation und verbleibende Grenzen

Produktionsbuild und Site-Typecheck bestanden, ebenso 81 Site-Tests und fünf vorhandene Hero-/Originalasset-Vertragsprüfungen. `make check` meldet im begrenzten Referenzprototypen-Audit null Fehler/null Warnungen. Die vollständige Pythonkette bleibt rot: 685 Tests, 40 Failures, neun Errors, 14 Skips. Zusätzliche Quelldrift wird sichtbar gehalten; alte Nachweis-Hashes wurden nicht zur Freigabe umgeschrieben. Node24 statt projektvertraglichem Node22 sowie ein großer JS-Chunk bleiben dokumentierte Buildwarnungen. Der vorhandene Hero-Quellvertrag wurde an die neue Nutzerentscheidung angepasst: Home-Stills dürfen keine ungeprüften Performances oder fingierten Playbackkontrollen veröffentlichen. Originalasset- und Playerprüfungen bleiben erhalten. Historische Browser-/Quellhashnachweise werden nicht automatisch neu gestempelt.

Tatsächlich im Desktopbrowser geprüft: Authkartenabstand, Öffnen und Einklappen des Docks, Fokus zurück am Öffner, geladenes Website-Motiv und Bereichsverlinkungen. Die spätere Wiederholungsprüfung des zuletzt umgebauten Home-Hero wurde durch eine URL-Policygrenze der Browserumgebung verhindert. Sie wurde nicht umgangen. Daher keine abschließende Browser-, Mobil-/Safari-, Tastatur-/Zoom- oder Glaswirkungsabnahme des endgültigen Releases. Quellreviews von Grafik/Brand und Qualität fanden keine neuen konkreten Blocker; sie ersetzen diese Laufzeitprüfung nicht.

Bekannte Gesamtgrenzen bleiben bestehen: Fachbackend/Registrierung, Warenkorb-Merge, Tenanttrennung, echte Mail-/Kaufwege und vollständige Plattformabnahme sind durch die visuelle Überarbeitung nicht erledigt. Die komplette Pythonkette ist weiterhin rot. Private Site-Veröffentlichung und fachliche Gesamtfreigabe bleiben getrennt.

Rückweg: vorherige private Sites-Version über Versionshistorie wieder bereitstellen; kein DNS-/Vercel-/Datenbankwechsel. Originalmedien und Originalfiguren sind erhalten. REA ist nur isoliert installiert und läuft nicht dauerhaft. Der bisherige führende Gesamtplan wird mit dieser aktuellen Entscheidung ergänzt, seine Vorfassung bleibt unverändert erhalten.

## Primärquellen

- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/layout
- https://docs.dev.runwayml.com/api/
- https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two
- https://docs.dev.runwayml.com/guides/pricing/
- https://github.com/morluto/rea/tree/160d821ac9a0310afcb8d1fc427862dd6508add5
- https://github.com/morluto/rea/blob/d3ab0faf52a02ff5a618f3ed7beb608b78752abd/docs/mcp-contracts.md
- https://registry.npmjs.org/rea-agents/6.8.0


## Aktuelle Verfeinerung: große Trio-Präsenz und feinere Lichtkante

Die anschließende ausdrückliche Nutzerkorrektur erhält das Chatinterface und seine Rundungen. Nur die innenliegende Lichtkante und der obere Übergang werden verfeinert. Der Seitenheader erhält eine auslaufende statt einer harten Kante; die Chatkopf-Fläche bleibt transparent innerhalb derselben Rundung. Bedienung, Fokusführung, Öffnen/Schließen und mobile Fullscreen-/Safe-Area-Logik sind unverändert. Die Bereichsbilder erhalten dieselbe feine Materialkante.

Im Hero ersetzt die große bisherige Trio-Grafik die Website-Art plus kleine Figurenreihe: `media/home-loops/welcome-loop.jpg`,1920×1080,unveränderte Originalbytes. Eigene Bildklasse mit16:9 und `object-fit:contain` vermeidet den3:2-/Cover-Beschnitt der Editorialbilder. Pascal,NeX und Oracle stehen wieder gemeinsam im Mittelpunkt. Keine generative Gesichtsbearbeitung,kein neues Alter,keine neuen Posen oder Figuren. Das Bild bleibt ein Still; dieser Schritt erteilt keine zusätzliche Lippen-/Gesten-/Stimmfreigabe. Historische kleine Signaturdarstellung ist damit überholt,die übrige Materialrichtung und Fachmotive bleiben bestehen.

Desktop-Readback dieser Verfeinerung: Viewport1348px,Herografik748,83×421,20px,Originalbreite1920px,contain und kein horizontaler Überlauf. Dockradius28px,Minimierer48×48px,Chatkopf transparent. Deutsche Darstellung,Einklappen/Escape und Fokus-Rückkehr zum Öffner geprüft. Build/Typecheck,81Site-Tests und5Hero-Vertragsprüfungen bestanden. Vollkette unverändert685Tests/40Failures/9Errors/14Skips. Unabhängiger enger Quellreview ohne neuen konkreten Blocker. Mobil/Safari und echte Filmproduktion bleiben getrennte offene Nachweise.


## Gesamtteam-Feinschliff · 02.11.2026

Vier getrennte Fachreviews und die zentrale Umsetzung haben die Bildbrüche eingegrenzt: das alte grün-schwarze JPEG-Studio neben dem warmen Atelier, doppelte Rahmung, wiederholte Fachmotive und unterschiedliche Oracle-Materialfassungen. Die neue Komposition stellt die Originalfiguren frei auf die gemeinsame warme Seitenfläche. Pascal und NeX verwenden die vorhandenen hochauflösenden Einzelbilder; Oracle dieselbe glatte Quelle wie der Companion. Es wurden keine Gesichter, Altersmerkmale, Kleidungsstücke oder Farben verändert und keine neue Pose generiert. Frühere JPEG- und PNG-Quellen bleiben erhalten.

Die drei WebP-Derivate haben dieselben Abmessungen, denselben Alphakanal und exakt dieselben sichtbaren RGBA-Pixel wie die gebundenen PNG-Quellen. Mehrere Prüfer haben dies unabhängig verglichen. Ausschließlich unsichtbare RGB-Werte vollständig transparenter Pixel können durch die Kodierung normalisiert sein. Zusammen umfassen die Derivate 1.136.162 Bytes. Das ist weniger als die verwendeten PNG-Quellen, aber mehr als das frühere 104-kB-JPEG. Die freie Komposition hat diesen bewussten Ladevolumentausch; eine pauschale Geschwindigkeits- oder LCP-Garantie wird daraus nicht abgeleitet.

Alle 52 Erklärmodule bleiben mit ihren Texten und Handlungswegen erhalten. Hero, Erklärstills und Companion nutzen eine gemeinsame Figurenregistry. Die 24 Oracle-Erklärslots verwenden damit keine flauschige Altfigur mehr. Bildkarten und zusätzliche äußere Metallrahmen sind entfernt. Auf der Startseite erscheint jedes Fachmotiv genau einmal. Stationen und Leistungslinks ersetzen zwei wiederholte Bilder. Die acht Fachroutenzuordnungen sind auf passende Einstiege begrenzt. Kein Bild gilt als Software-, Produkt- oder Passungsbeleg.

Der Assetverifier prüft Quell- und Derivathashes sowie Registrymaße gegen die tatsächlichen PNG-Quelldimensionen; auch positive falsche Maße wie 9999 werden abgewiesen. Der Standaloneexport bettet referenzierte neue WebP-Bilder unter der bestehenden Datenbild-CSP ein und verweigert unvollständige Ausgaben. Vier neue Verifier-/Exporttests decken diese Änderungen ab. Insgesamt bestehen 85 Site-Tests und fünf Hero-Vertragsprüfungen, außerdem Build und Typecheck. Die Pythonvollkette bleibt mit 685 Tests, 43 Failures, neun Errors und 14 Skips rot. Historische Nachweise werden nicht automatisch neu freigegeben.

Browserprüfung: Desktop mit 1348 Pixeln sowie gleichursprüngliche iframe-CSS-Viewports mit 320, 390 und 820 Pixeln Breite. Die vollständigen Kompositionen wurden visuell geprüft; es gibt keine seitlichen Überläufe. Der Dialog bei 390 × 844 Pixeln hat die richtige Viewportgröße, Dialogsemantik und einen 48 × 48 Pixel großen Minimierer. Nach dem Schließen kehrt der Fokus zurück. Die Sprecherquellen wurden auf Leistungs- und Automatisierungsseiten nachgeprüft; Oracle wird dort mit 180 Pixeln aus der 194-Pixel-Quelle dargestellt. Dies ist keine physische iPhone-/Safari-, Screenreader- oder 200-Prozent-Zoom-Abnahme. Das interne Viewportreview liegt außerhalb des ausgelieferten Builds. Chat-JavaScript und bestätigte Bedienung bleiben unverändert.

Die vier Fachrollen Grafik/Brand, UX/Qualität, Inhalts-/Identitätsabgleich und technische Medienprüfung haben keine weiteren konkreten Blocker in ihrem begrenzten Abschlussreview gefunden. Gesamtplattformstatus und echte Lippen-/Gestenfilmproduktion bleiben offen.


## Verbindliche aktuelle Fortschreibung · FACTORY-Fassung 02.11.2026

Die historischen Zwischenstände oben sind kein Nachweis für diese neue Ausgabe. Maßgeblich ist `factory-brand-revision-2026-11-02.md`: neue Unternehmenssprache auf 39 öffentlichen Seiten in vier Sprachen, 81 Sektionen, getrennte Produktwelten und Projektpakete Markenstart, KI im Betrieb und Wachstum. Der Chat ordnet Websiteinhalte deterministisch ein und führt zu vorhandenen Seiten; keine Live-KI oder Geschäftsausführung.

Der Hero zeigt wieder Text links und einen großen, begrenzten Bildschirm rechts. Ab höchstens 900px verfügbarem Hero-Container wird gestapelt. Kein Bildschirmrahmen; 28px Rundung, dezente Lichtkante und Schattentiefe. Statt der früheren neutralen Studios sind die ersten warmen Glas-/Metallfilme gebunden: drei 1296×864-Filme mit 5,041667s Vorwärtsbewegung und eine 1920×1080-Montage mit 10s, alle ohne Ton. Das erste Gehfoto des Nutzers ist als KI-freigestellte Ableitung in die Montage eingebaut, nicht als unveränderte Gesichtspixel oder natürliche Geh-/Sprechperformance zugesichert. Originale und vorherige Filmfassungen bleiben erhalten. Die verworfene Elementfamilie ist separat archiviert.

Lime-Akzent folgt der vorgegebenen CI mit #C8F04B; warme Champagner- und Platinreflexe setzen Materialakzente auf Graphit. Unaufdringliches Licht, transparente funktionale Chatfläche und matte Leseflächen folgen denselben Tokens. Pausieren, Tastaturbedienung, Reduced Motion, Save Data und die mobile Platzierung der Wiedergabekontrolle sind berücksichtigt. Der Desktopabstand zum Chat beträgt 24px.

Der tatsächliche 30s-Begrüßungsfilm mit synchronem deutschem Ton bleibt wegen des gemeldeten Runway-Guthabenlimits blockiert. Die stille Montage erfüllt diesen Auftragsteil nicht. Die 52 Sprecher-/Performance-Module bleiben pending/not_approved; keine erneute Datierung historischer Abnahmen, kein Vollsystem-/WCAG-/Rechtsfreigabeanspruch.
