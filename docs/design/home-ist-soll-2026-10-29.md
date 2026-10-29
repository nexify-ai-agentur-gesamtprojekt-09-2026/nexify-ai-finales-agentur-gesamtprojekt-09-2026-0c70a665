# NeXify Home – ehrlicher IST/SOLL-Abgleich

Stand: laufende Überarbeitung am 29.10.2026. **Keine Gesamtfreigabe.**

## Quellen und Bewertungsregel

1. Aktuelle ausdrückliche Nutzerangaben haben Vorrang: CI unverändert; alle drei Figuren groß; natürlicher Einlauf, Bewegung und Lachen; drei echte Home-Filme; keine Standbilder als Filmersatz; neuer großflächiger Hintergrund; Stimmen überarbeiten; rechter Chat bleibt; verfeinerte Übergänge und geringe räumliche Videowölbung.
2. „NEXIFY AI · GESAMTDESIGNSYSTEM“, Nutzerfassung 29.10.2026, Abschnitte 0–15.
3. Originaldatei NeXify-Masterplan-v2-2026-10-29.md, direkt geladen unter `.local/NeXify-Masterplan-v2-2026-10-29.md`: PUB-home, Zeilen690–782, H00/S01/S02/S03/S04/F00 und drei Dialogpläne.
4. Zielbild-v2 ist Referenz, kein bereits erreichter Istzustand. Browser-Screenshots sind keine Normenzertifizierung.
5. Jüngste Materialvorgabe: simuliertes Licht von oben links,20pxBlur,10–15%helleMaterialauflage,1pxLichtkante,8pxRaster,48pxTouch, kontrollierte Komposita.
6. Bestätigtes Video-Gesamtbudget:10USD. Übersprungene Folgefrage erhöht dieses Limit nicht. Nicht erfüllbare Produktionsanteile bleiben offen; Soll und Drehplan werden deshalb nicht gekürzt.

**Status:** umgesetzt = Code/Artefakt vorhanden; geprüft = benannter tatsächlicher Test; teilweise = konkrete Restabweichung; fehlt = nicht vorhanden; ungeprüft = keine ausreichende aktuelle Untersuchung. Kein Status bedeutet pauschale Betriebs-, Rechts- oder Produktfreigabe.

## Home, Medien und Interaktion

| ID | Verbindliches SOLL | Ehrlicher IST / Delta | Umsetzung / Nachweis / nächster Schritt |
|---|---|---|---|
| H01 | H00→S01→S02→S03→S04→F00 vollständig | Struktur und Kundentexte vorhanden; Bildfilme nicht vollständig | `HomeContent.tsx`, `HomeJourney.css`; Testreport8 bestätigt sechs Abschnitte |
| H02 | Echte Spalten: Text links, großes Video rechts | CSS-Grid1:1.618; alter Film im Preview noch zu klein komponiert | `IdentityHero.css`; Browser-critical misst Layoutcontain, nicht Figurenqualität |
| H03 | Chat bleibt rechts | Desktop rechts, maximal440px; mobil einklappbar | `WorkspaceRebuild.css`; Tests7/8/9 prüfen nur beschriebene Auflösungen |
| H04 | Alle drei Charaktere laufen/schweben groß ein | Neuer45s-Bildmaster erzeugt; bisheriger öffentlicher Film erfüllt Qualität nicht | `.local/home-hero-revision/`; Einlauf/Lachen/Identität in tatsächlicher Wiedergabe prüfen |
| H05 | Pascal unverfremdet | Originaldatei unverändert; Referenzbindung in neuen Jobs; keine Personenähnlichkeitsfreigabe | Original-SHA in `references.json`; Gesicht über gesamten Film vergleichen |
| H06 | AIFly gleiche Identität, keine Felloberfläche, kein erfundener Mund | Original hat Stofftextur. Neuer Generator erfand zeitweise Mund; lokal retuschiert, Material geglättet | Original bleibt erhalten; Retuschebericht und Vorher/Nachher; endgültige Oberflächenabnahme offen |
| H07 | Ganze Körper/Füße, ausreichend Bewegungsraum | Neue Frames enthalten ganze Figuren; Verlauf noch abschließend zu prüfen | Neue Filmframes; CSScontain allein beweist nicht Bildinhalt |
| H08 | Natürliches Lachen und lebendige Reaktionen | Bewegung im neuen Bildmaster sichtbar; Natürlichkeit/Lachen noch keine Freigabe | Nicht mit Standbildanimation oder technischem HTTP200 gleichsetzen |
| H09 | Großflächiger zusammenhängender räumlicher Hintergrund | Zentrale Canvas/Lichttokens; alter Previewfilm hat noch sichtbaren eigenen Hintergrund | Neue Bildspur vorbereiten; Großansicht bis4K noch vollständig prüfen |
| H10 | Leichte räumliche Videowölbung, keine scharfe Playerbox | Geringe Perspektive/elliptische Krümmung implementiert, keine Rahmenlinie/Masken | `IdentityHero.css`; neue Bildspur in dieser Darstellung abnehmen |
| H11 | H00 Begrüßung42–45s, Originaldialog | Neue Tonfassung43.46s; neueBildspur45.125s; LipSync/Nachschnitt laufen separat | Keine Veröffentlichung als final vor erfolgreichem Export und Prüfung |
| H12 | S01 eigener Film45–55s | **Bildfilm fehlt**, eigener Slot zeigt Zwischenkomposition | Tonfassung45.94s und Originaldialog vorhanden; Budget/Filmproduktion offen |
| H13 | S02 eigener Film45–55s | **Bildfilm fehlt**, eigener Slot zeigt Zwischenkomposition | Tonfassung49.37s und Originaldialog vorhanden; Budget/Filmproduktion offen |
| H14 | Drei passende, konsistente ElevenLabs-Stimmen |12neueAudioantworten überElevenLabs/v4; **Stimmenästhetik nicht abgenommen** | Providerherkunft und Dauer belegt; Nutzerkritik ist nicht durch Herkunft widerlegt |
| H15 | Präzise Synchronität | Pascal-LipSyncaufträge getrennt; NeX-Schnabel nur zeitlich angelegte Animation, noch keine Phonemprüfung | Augen/Hover fürAIFly, keinen Mund ergänzen; Zeitachsen mit Originaltext prüfen |
| H16 | Kein kurzer stummer Test statt Erklärfilm |5s-Probe wird nicht als finaler Film eingesetzt | Probe ausschließlich privat im Produktionsordner |
| H17 | Play/Pause, Ton, Captions, Timeline, Transkript | Implementiert; Mute setzt Position nicht zurück; kein Zwangsloop | Reports7/8 und direkte Browserprüfung; finaleExports erneut prüfen |
| H18 | ReducedMotion und stabile Medienflächen | Autoplayunterdrückung und festeSeitenverhältnisse implementiert | NeuefinaleMedia-Quellen noch erneut testen; keineLight-Transparenzfreigabe |
| H19 | Sanfte Abschnittsdifferenzierung | AuslaufendeLichtlinie und schwachesLichtfeld ohne flächigenHardCut implementiert | `HomeJourney.css`/Materialtokens; aktuelleDarstellung noch finalvermessen |
| H20 | Texte und Verhalten harmonisch | Originaldialoge/Intro/Sprecherpausen strukturiert; UI nicht mit beliebigen Timern animiert | Bilder/Zeigegesten/CTAs müssen noch am finalen Schnitt abgeglichen werden |
| H21 | Handlungsfähige Home-CTAs | Projektumfang, Leistungen, drei Einstiege, Produkte, Kontakt und Gesprächsanfrage vorhanden | Quote/BookingFallback18Fälle echt geprüft; kein externer Kalender erfunden |
| H22 | Keine internen Anweisungen als Werbung | Neu angelegterGovernanceblock entfernt; Zielbild-Badge entfernt | ÖffentlicheCopy nach PUB-home; keine unbelegten Garantien hinzugefügt |
| H23 | Kurze gute Chatüberschrift ohne schlechteUmbrüche | „Worum geht’s?“ pluskonkreterEinleitung umgesetzt | Vorher „Dein Vorhaben beginnt hier.“ entfernt; Screenshot und Textresize nachführen |
| H24 | Sicherer wiederaufnehmbarer Chat/Briefingfluss | BestehendeDatenbindungen erhalten; Bedingungen/Fehlerfälle lokal geprüft | LiveGPT/VorlesenundalleBriefingvarianten nochEnde-zu-Endezuprüfen |

## Designsystem: alle Abschnitte der Nutzerdefinition

| Quelle | SOLL | IST / Abnahmegrenze |
|---|---|---|
|0Geltung | AktuelleVorgabevorrangig, keineerfundenenDetails | Hierdokumentiert; ältereGuidelines wurdenpräzisiert, keineglobaleAbnahme |
|1Markenarchitektur | NeXifyAI, Slogan, OriginalLogo, TEILEKLARunterscheidbar | Bestandbewahrt. Betreiber-/Rechtsformquellen wurdenhier nichtvollständiggeprüft |
|2Gestaltungsprinzip | Graphite, ruhig,räumlich,persönlich; keineTemplate-/Neonüberladung | Kontinuitäthergestellt; Qualität des gesamtenMedienbestands bleibt offen |
|3Tokens | #080A0F/#C0EE38/#38BDF8,8px,48px, zentraleWerte | KanonischeTokens gesetzt. HistorischeCSS enthält noch4px/10px/12px/18px-Werte; daher keinabsolutlückenloses8px-Rasterbehauptet |
|3LightTheme | Bewusst gestalteteshellesTheme | **Ungeprüft/nichtfertig**, vollständigePalette vomNutzeralsOffenpunktbenannt |
|4Typografie/Sprache | Inter/Jakarta, konsistenteDE/NL-Texte, keineerfundenenPreise | Fonts lokal, Homeübersetzt; weitereNL/Formulare enthalten nochgemischteje/u-Ansprache. Gesamtlokalisierungnichtfreigegeben |
|5Layout | GemeinsamesFullWidthRaster, keinOverflow, scrollbareMobileNavigation | Home undTeilmatrixgeprüft; 320px/200%/4K-Neulauf nochabschließendnötig |
|6Komponenten | BestehendeKomponenten, eindeutigeAktionen,echteZustände | BestehendeNative-/HeadlessArchitektur erhalten; nichtpauschalalleZuständealler46Seitengeprüft |
|7Figuren | Pascal/NeX/AIFly konsistent, ohnePlüsch, ohneAlterung | Originaleunverändert; neueVideoqualität/Materialretuscheweiteroffen |
|8Hero/Medien | DreiEigenfilme,freieEinbettung,volleFiguren,echteBewegung | EinneuerH00MasterinBearbeitung,zweiBildfilmefehlen; keineGesamtfreigabe |
|9ÖffentlicherChat | Rechts,bedienbar,kontextuell,keineFakeAktionen | RechteAnordnung/Detailsumgesetzt; LiveIntegrationstestsnichtvollständig |
|10Arbeitsplatz | GeschützteszusammenhängendesWorkspace/Artefaktsystem | **In dieserHomeIterationnichtvollständiggeprüft**; keineMigrationallerprivatenFlowsbehauptet |
|11TEILEKLAR | EchteDaten,Varianten,Cart,Checkoutstatus,isolierteDaten |4Katalog- und13ShopBrowserfälle mit**SYNTHETISCHEN TESTDATEN**neugelaufen; keinNachweisrealerBestellung/Zahlung |
|12Recht/Vertrauen | AuffindbareRechtsinfos, keineerfundenenFreigaben | Footer216ViteAnsichten/12Interaktionenneugeprüft; rechtlicheVollständigkeit/Anwalt/Next-Referenzstandoffen |
|13SEO/Leistung/A11y | Routen/Metadaten,stabileMedien,320px/200%,Tastatur | Teiltests; Initialbundle~764kBminifiedBuildwarnungnochvorhanden. KeineWCAG/BFSG/ISO/DIN-Zertifizierung |
|14Abnahmevertrag | Anforderung→Komponente→API→Handlung→Ergebnis→Beleg | DieserAbgleichergänztbestehendesRegister; lokaleTests/Preview/Produktionnichtvermischen |
|15OffeneDetails | KeineerfundenenFinalreferenzen/LightPalette/Betreiber-/Preisquellen | Offenpunkte bleibenoffen; technischeAbleitungen werden nicht alsNutzerfreigabedeklariert |
|Materialergänzung |45°simuliert,20pxBlur,10–15%Maske,1pxKante | Tokens20px/10%/1px,gleichepositiveSchattenX/Y-Vektoren; keinephysikalischeLichtsimulationbehauptet |
|Kompositaergänzung | hyphens:auto,word-breaknormal,Notfallumbruch | zentraleRegelnimplementiert; tatsächlicheTextresize-Matrixnochfrischzumessen |

## Integrationen und tatsächliche Grenzen

- **ElevenLabs:** echteTonproduktion dokumentiert; keineStimmklone, keinezusätzlicheOverage. KünstlerischeFreigabeweiteroffen.
- **Emergent/Kling:**5sProbe +3×15sneueH00-Segmente erzeugt. GeschätzteBildkosten7USDgesamt, einschließlichProbe. DreiLipSyncs separatreserviert, Budgetledger maximal10USD. DasistkeineAnbieterrechnung.
- **Resend:** Empfängerfrageübersprungen; **kein echterTestversand ausgeführt**. Nicht an einegerateneAdresse senden.
- **ChatGPT-Zusatzoption:** Schalter undBestandsintegrationvorhanden; aktuellkeineneuenEnd-to-End-Erfolgbehaupten.
- **Standards/Recht:** PrüfzielistnichtZertifikat. KeinegarantierteConversion-/Rechtssicherheitsbehauptung.

## Regressionen: nachweisbare Verbesserung, noch keine grüne Gesamtsuite

- Pillow12.3.0 ist in`.venv` vorhanden. SystemPython/Pillow13 war die falscheTestumgebung, nichtGrundfüreinAbschwächenderVersionsprüfung.
- Neu wirklichgelaufen: Katalog4Fälle, Shop13Fälle, kritischerBrowser8Fälle, öffentlicheFallbacks18Fälle, ViteFooter216Ansichten/12Interaktionen. LokaleTestfixtures sindkeineLiveProviderfreigabe.
- AlteSHA-Wertewerdennichtblindangepasst. ErneuteCode-/Textänderungenmachen betroffeneSourceBindings erneutveraltet.
- `make test` ist **noch rot**: aktuelleQuellenbindung, Next-Consent/Next-Footer, Textresize undAcceptance-Register müssen noch korrektregeneriertwerden.
- DieHomeist daher **noch nicht vollmigriert/final/betriebsfreigegeben**.
