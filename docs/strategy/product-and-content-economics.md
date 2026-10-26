# Produktkommunikation und Wirtschaftlichkeit · Arbeitsgrundlage

Stand 26.10.2026. Diese Vorlage verbindet Produktentwicklung, Gestaltung, Marketing und finanzielle Kontrolle aus den vorhandenen NeXify-Quellen. Sie ändert keine Preise, erstellt keine Umsatzprognose und veröffentlicht keine Kampagne. Unternehmenskennzahlen, Marktanteile, Renditen und Kundenreferenzen werden nicht aus Beispielen abgeleitet.

Maßgeblich sind der aktuelle Nutzerauftrag, `AGENTS.md` und `config/source-boundaries.json`. Agentur, eigene Web-/App-/KI-Produkte sowie TEILEKLAR und die Werkstatt-/Partnerbereiche gehören zum vorgesehenen Agentursystem. Affilinet Portal Aachen bleibt ein gesondertes pausiertes Kundenprojekt: keine Agentur-Lieferabhängigkeit, kein gemeinsames Kundenkonto und kein zu übernehmender Geschäfts- oder Chatbestand.

## Angewandte Arbeitsvorgaben und Quellen

Die Small-Business-Bibliothek wurde mit `python3 tools/automation/small_business.py verify` geprüft. Router und die passenden Originalanleitungen wurden mit `load … --references` geladen:

| Anleitung | Konkret angewandt |
|---|---|
| `smb-router` | Bestehenden Projektkontext nutzen; passende Arbeit auswählen und fehlende Connectoren als fehlend führen, ohne neues pauschales Onboarding. |
| `content-strategy` | Kundenziel, Produkt und nächste Handlung verbinden. Ohne echte Absatz-/Margendaten keine vermeintliche Bestseller-, Saison- oder ROI-Rangliste erstellen. |
| `proposal-builder` | Paketumfang und Ausschlüsse konkret beschreiben; Raten aus bestätigten eigenen Quellen, ungeklärte Positionen offen. Interne Risiken und Kosten bleiben von kundenseitigen Angeboten getrennt. |
| `cash-flow-snapshot` | Fehlende Eingangswerte sind unbekannt, nicht null. Ohne belegten Anfangsbestand, Forderungen, Verbindlichkeiten und Zahlungstermine keine verfügbare Liquidität oder Finanzierungsreichweite behaupten. |

Herkunft: `anthropics/knowledge-work-plugins`, Small Business `1.35.1`, Commit `33d3dea41a341b341d4f5da2e8801ae0c89be2b8`. Exakte Anleitungspfade und SHA256 stehen in `config/knowledge-source-access.json`. Die gemeinsamen Regeln zu Tenant-/Quellenbindung, untrusted Inhalt, persönlichen Daten, Währung und fehlenden Daten gelten mit. NeXify-Design-Tokens und aktuelle Produktgrenzen bleiben verbindlich; fremde Beispielpalette und Beispielzahlen werden nicht übernommen. Es wurden keine Geschäfts-Connectoren aufgerufen und keine echten Finanz-Workflows ausgeführt.

Produktquellen: `config/fakten.json`, `config/api-prepaid.json`, `config/agenten-paket.json`, `docs/09-final/01-produkt-und-marke.md`, `11-teileklar-datenblatt.md`, `14-gesamtsystem-und-portale.md` sowie die neu abgeleiteten Verträge unter `docs/contracts/`. Ältere Textstände bleiben Herkunft und Zielbeschreibung; sie sind kein Beleg für heute angeschlossene Provider oder laufenden Verkauf.

## Kommunikationsmatrix

Deutschland ist der im Nutzerauftrag bestimmte Hauptmarkt; das ist ein Ziel der Ausrichtung, kein gemessener Besucheranteil. Öffentliche Texte sprechen einheitlich Deutsch und siezen. NL-/FR-Schlüssel und marktabhängige rechtliche Angaben bleiben gesondert zu pflegen.

| Bereich | Kundenziel | Paketumfang, aus Quellen abgeleitet | Abgrenzung | Nächster Schritt | Backendabhängigkeit | Finanzielle Freigabe |
|---|---|---|---|---|---|---|
| **Agentur** | Einen konkreten wiederkehrenden Geschäftsablauf verständlich verbessern lassen. | Bestandsaufnahme/Audit, benannter Pilot, vereinbarte Umsetzung und überprüfbare Übergabe; optional gesonderter Betrieb. | Entwicklungsleistung und laufender Betrieb getrennt ausweisen. Kein pauschales Ergebnis-, Umsatz- oder Einsparversprechen. | Anliegen aufnehmen → Ausgangsprozess und Zielzustand beschreiben → Angebotsentwurf mit offenen Annahmen. | Anfragen, tenantgebundene Angebote/Projekte, Versions-/Abnahmebelege, Dokumente und tatsächlich nachgewiesener Versand. | Aktueller eigener Satz, Umfang, Anzahl Entwicklungstage, Fremdleistungen, Steuer-/Vertragsidentität und Abnahmebedingungen. Kein Rechnungslauf aus einer bloßen Anfrage. |
| **Web** | Einen passenden und bedienbaren Webauftritt mit klarer Kontakt- oder Produktstrecke erhalten. | Eigene Marke, Seiten-/Inhaltsstruktur, responsives Design, nachvollziehbare Kontaktstrecke und überprüfte Verlinkung; konkret vereinbarte Integrationen. | Bilder/Clips, zusätzliche Sprachen, laufende Redaktion, Hosting und rechtliche Endprüfung einzeln zuordnen. Ein lokaler Release ist noch kein verbundenes oder veröffentlichtes System. | Passende Beispielstrecke zeigen → Seiten, Zielgruppen, Inhalte und vorhandene Assets binden → konkretes Umsetzungspaket festhalten. | Versionierter Build/Release, Formularpersistenz, CSRF-/Spamgrenzen, bestätigte Zustellung und zugeordneter Veröffentlichungs-/Rollbackpfad. | Entwicklung und optionale Betriebskosten getrennt; Medien-/Hosting-/Providerkosten sichtbar. Keine neue Preisposition aus einer alten Musterseite übernehmen. |
| **App / Portal** | Einen eigenen Kunden-, Partner- oder internen Arbeitsablauf zuverlässig bearbeiten. | Webbasierte Oberflächen für vereinbarte Rollen und Vorgänge, Dokumente/Status, klare Übergaben; wiederverwendbare eigene Komponenten. | Gemeinsame Gestaltung macht Domains, Rollen und Mandanten nicht identisch. Native Store-App, vollständiges SSO, Rechnungswesen oder allgemeine Adminrechte sind gesonderter Umfang. | Nutzerrolle und konkreten Vorgang wählen → erlaubten Erfolg und Gegenfälle definieren → einen vollständigen Ablauf nachweisen. | Echte Account-/Session-/Tenantbindung, Objektbesitz, RLS beziehungsweise geprüfte Datenbankbrücke, Idempotenz und Audit. Eine lokale Besuchersitzung ist kein Kunden-SSO. | Rollen-/Datenumfang, Migration, Betrieb, Speicher und Abnahme vereinbaren. Keine pauschale Übernahme eines Kundenportals oder dessen Datenbestands. |
| **KI / NeX Agentic AIFly** | Informationen verständlich nutzen, Entwürfe vorbereiten und klar begrenzte Arbeitsschritte unterstützen. | Kontextbezogene eigene Seitenleiste, freigegebenes Wissen, Entwürfe und tatsächlich angeschlossene typisierte Werkzeuge mit Status-/Quellenbelegen. Die historischen Stufen one/one+ sind Produktquellen, keine zusätzliche aktuelle Tarifentscheidung. | KI-Antwort, Entwurf, angeforderte Aktion und extern bestätigtes Ergebnis unterscheiden. Keine beliebige Shell-/Providerbrücke oder unbeschränkte Autonomie aus einem Chattext. | Anliegen im passenden Seiten-/Projektkontext aufnehmen → erreichbare Funktion zeigen → fehlenden Zugriff oder notwendige konkrete Freigabe benennen. | Modell-/Providervertrag, Scope-/Budget-/Tenantprüfung, sicherer Tooladapter, dauerhafte Aktionsbelege und exaktes Read-back. Öffentlicher Companion braucht den dokumentierten eigenen BFF. | Zugangsgebühr, Verbrauch, Projekt-KI-Kosten und Medienkosten eindeutig voneinander trennen; aktuelle Preisversion und Leistungsgrenzen binden. Keine doppelte Abo-/Prepaidbelastung aus uneindeutigen Quellen ableiten. |
| **TEILEKLAR** | Ein geeignetes Fahrzeugteil anhand nachvollziehbarer Passgenauigkeit finden und den Bestellstatus verstehen. | Fahrzeugwahl, Teile-/Kompatibilitätssuche, Warenkorb/Kasse, eigene Konto-/Belegstrecken und bestätigte Liefer-/Retoureninformationen gemäß tatsächlichem Katalog. | Ein Musterkatalog ist kein Lagerbestand. „Passt“ setzt belastbaren Fitment-Treffer voraus; sonst „prüfen“. Keine Liefer- oder Preiszusage aus Demonstrationsdaten. | Fahrzeug/Teil bestimmen → Datenlage und Kompatibilität zeigen → nur auf echten freigegebenen Bestands-/Preiswerten bestellen. | Katalog-/Fitmentlizenz und Aktualität, Bestands-/Preisfeed, Markt-/Steuermatrix, Zahlungsabgleich, Versand und kontofreier zulässiger Retouren-/Widerrufsweg. | Verkaufspreis, Brutto-/Nettodarstellung je Kundentyp und Markt, Beschaffung, Versand, Zahlungsgebühr, Retouren und Steuer müssen gedeckt sein. Keine neue Marge oder Rabattregel erfinden. |
| **Werkstatt / Partner** | Passende Kundenanfragen, Einbau-/Servicetermine und Partnerabläufe nachvollziehbar koordinieren. | Werkstattdarstellung, konkrete Anfrage/Terminplanung, eigene Partner-/Kundenansichten und vereinbarte Gutschein-/Abrechnungsbelege. | Ein angefragter Termin ist kein extern bestätigter Termin oder wahrgenommener Kundenkontakt. Provision, Partnervertrag und Werkstattleistung bleiben eigene verbindliche Vereinbarungen. | Werkstatt/Leistungsort wählen → Anfrage mit Quelle binden → verfügbare Zeiten und Bestätigung prüfen → nachvollziehbar übergeben. | Autorisierter Standort-/Partnerkontext, echte Kalenderverfügbarkeit, Bestätigung, Gutscheinzustand, Status-/Abrechnungsnachweis. | Entgelt, Provisionsauslöser, Storno-/Nichtwahrnehmungsfall und Steuer gesondert bestätigen. Keine Vergütung aus einem historischen Rechtsentwurf automatisch aktivieren. |

Ein Paket wird erst als verkaufsfähige Leistung beschrieben, wenn Umfang, tatsächliche Fähigkeit, Lieferung, Betrieb und Verantwortlichkeit zusammenpassen. Bis dahin sind „Entwurf“, „Vorschau“, „lokal geprüft“, „angefragt“ oder „Verbindung fehlt“ die zutreffenden Zustände.

## Finanzquellen und Entscheidungspunkte

Diese Werte werden ausschließlich als **bereits vorhandener Quellenstand** festgehalten; weder Preislisten noch Vertrags-/Steuertexte werden hier geändert:

- `config/fakten.json`, `projekt.tagessatz_eur`: **EUR 449**. Der Produkttext ordnet den Satz Entwicklungstagen im Aufbau zu; laufender Betrieb ist ein eigener Leistungsbereich. Keine pauschale Berechnung dieses Satzes für Betriebsmonate.
- `config/api-prepaid.json`, `aufladung`: Mindestaufladung **1.000 Cent**, Höchstaufladung **500.000 Cent**. Die älteren Produkttexte mit anderer Mindestaufladung haben keinen Vorrang vor dieser Konfiguration.
- Die API-Konfiguration trägt weiterhin den globalen Status **Entwurf**, enthält zugleich den Hinweis **„E1 festgelegt … Verkauf = EK × 1.45“**. Der dokumentierte Projekt-KI-Aufschlag und API-Aufschlag beschreiben zudem unterschiedliche Produkte. Diese Vorlage löst deren Freigabe-/Harmonisierungsfrage nicht und wendet keinen Aufschlag eigenständig auf neue Leistungen an.
- Monatsbeträge für one/one+ stehen in historischen Paket-/API-Konfigurationen; Produkttexte sprechen zugleich von Prepaid und Tarifen zur Freigabe. Vor Kundenkommunikation müssen Zugang, Verbrauch, enthaltene Leistung, Zusatzverbrauch und Kündigung zusammenhängend geklärt sein. Ein Vorhandensein von Feldern ist keine neue vertriebliche Freigabe.
- Unbekannte Modelleinkaufspreise, Revolut-API-Version, tatsächliche Anbietergebühren, Betreiber-/Steueridentität und einzelne Rechts-/Aufbewahrungsangaben bleiben offene Voraussetzungen. Ein in der CI konfiguriertes technisches Kostenlimit ist weder Verkaufspreis noch tatsächliche Ausgabe.

Es liegt für diese Arbeit keine aktuelle vollständige Buchhaltung, Absatzhistorie, freigegebene Pipelinebewertung oder belegte Liquidität vor. Daher keine Finanzierungsreichweite, Umsatzprognose, Kundengewinnungskosten, Rendite oder sortierte „profitabelste Produkte“ berechnen. Die Kommunikationsmatrix ist eine qualitative Produkt-/Liefergrundlage, keine aus echten Verkäufen abgeleitete Erfolgsrangliste.

## Kostenmodell für Clips, Stimmen und Content

Vorhandene passende Runway-Clips zuerst inventarisieren und wiederverwenden; fehlende Clips sind im Nutzerauftrag zur Erstellung freigegeben. Wiederverwendung bedeutet keine Kostenfreiheit: Rechteprüfung, Sichtung, Schnitt, Vertonung, Untertitel, Varianten und Auslieferung können weiter Aufwand erzeugen.

Für jede Fassung werden die notwendigen Inputs mit ihrer tatsächlichen Quelle und Preisversion geführt:

| Kostenblock | Benötigte Eingaben | Freigabe-/Nachweisgrenze |
|---|---|---|
| Redaktion und Konzeption | Freigegebenes Produktziel, Skript-/Storyboardfassung, Seiten-/Sprachzuordnung, interner Aufwand. | Keine neuen Produktbehauptungen, Kundenstimmen oder Preise im Skript ergänzen. |
| Vorhandenes Video | Asset-ID/Hash, Rechte, erlaubte Nutzung, Qualitätszustand, nötige Bearbeitung. | Gleiche Aufnahme nicht erneut generieren, wenn eine geeignete Fassung vorhanden ist. |
| Neuerstellung | Gewählter tatsächlicher Runway-Modell-/Aktionsvertrag, verbrauchte Einheit, geltende Preisinformation, Referenzmedium und erlaubtes Generierungsbudget. | Kein Modellname, Anbieterpreis oder kostenpflichtiger Job aus einer bloßen Toolbeschreibung erfinden; unbekannten Jobausgang vor erneutem Auftrag abgleichen. |
| Stimme / Audio | ElevenLabs-Voicebindung, Skript-/Sprachfassung, tatsächliche Abrechnungseinheit, Lizenz und Providerkonto. | NeX, AIFly und Nutzer exakt wie `docs/contracts/hero-media.json` zuordnen. Eine vorhandene Voice-ID ist keine neue Stimmkopie oder generierte Datei. |
| Montage und Zugänglichkeit | Schnitt-/Synchronisationsaufwand, Poster, Untertitel, Transkript, benötigte Ausspielvarianten und Sichtprüfung. | Nur geprüfte Ausgabefassung verwenden; Untertitel/Transkript müssen zum tatsächlichen gesprochenen Text passen. |
| Auslieferung und Betrieb | Tatsächliche Speicher-/CDN-/Transfer-/Monitoringtarife, Zeitraum und Nutzung. | Ein lokales ZIP ist kein Live-Upload, Backup im fremden Konto oder automatisch synchronisiertes ChatGPT-Projekt. |
| Korrektur und Risiko | Genehmigte zusätzliche Versuche, tatsächliche Fehlerbelege, Erstattungen, doppelte Aufträge, Währungs-/Steuerbehandlung. | Keine unbegrenzte Retry-Reserve oder pauschale Marge unterstellen; identische Vorgänge nicht zweimal als Ausgabe zählen. |

Symbolischer interner Kalkulationsrahmen, **keine bereits berechneten Beträge**:

`Direkte Contentkosten = belegte Redaktion + Rechte/Assets + tatsächlich verwendete Videoerstellung + Audio + Montage/Zugänglichkeit + Auslieferung + genehmigte Korrekturen`.

`Projektdeckungsbeitrag = freigegebener Nettoerlös − zugeordnete direkte Projekt-/Providerkosten − tatsächlich anfallende Zahlungs-/Liefer-/Retourenkosten`.

Ein Wert wird erst berechnet, wenn Währung, Zeitraum, Mengen, Preis-/Vertragsfassung und Zuordnung vollständig sind. Bereits bestehende Credits oder Abos werden nicht doppelt belastet; neue Providerkäufe oder Tarifwechsel sind kein Nebeneffekt dieser Vorlage. Verkaufspreise und Steuern folgen ihrem eigenen freigegebenen Vertrag und werden nicht aus der internen Kostenformel automatisch veröffentlicht.

Der Produktionsnachweis je Fassung verbindet Tenant/Projekt, Seite, Quelle, Teilnehmer, Sprache, Skriptversion, Job-/Idempotenzreferenz, tatsächliche Nutzung/Kosten, Asset-ID/Hash und Sichtfreigabe. Erst Persistenz und exakter Read-back mit passendem Tenant, ID, Version und Inhalt erlauben den Status „geliefert“. Die konkrete Veröffentlichungsfassung bleibt von einer generierten Kandidatenfassung getrennt.

## Gestaltung und überprüfbare Kommunikation

Jeder Produktabschnitt beantwortet dieselben Fragen in derselben Reihenfolge: Anliegen des Kunden, konkret enthaltene Leistung, sichtbarer Beleg, Preis-/Leistungsgrenze und ein passender nächster Schritt. Die Reihenfolge bleibt zwischen Website, App und eigener KI-Seitenleiste konsistent; Texte passen sich dem jeweiligen Produkt- und Rollenbereich an.

- Überschrift, Kurztext, Bild/Clip und Hauptaktion beziehen sich auf denselben Geschäftsfall. Ein Werkstattkontakt führt in die Werkstattstrecke; ein Agenturangebot in den Agenturkontext.
- Eigene Design-Tokens, verfügbare Markenassets, sichtbarer Fokus, Tastaturbedienung, lesbare Formulare und reduzierte Bewegung gelten auch für Marketingflächen. Keine Übernahme der fremden Small-Business-Beispielpalette.
- Bewegung und Ton lassen die nächste Handlung erreichbar. Videos benötigen Poster, passende Textalternative und Bedienung; ein fehlender Clip blockiert keine Kontakt- oder Produktinformation.
- Öffentlich nur belegte Zustände nennen. „PDF erstellt“ ersetzt keinen Mailversand; „Termin angefragt“ ersetzt keine externe Bestätigung; „Entwurf gespeichert“ ersetzt keine Veröffentlichung.
- Keine erfundenen Referenzen, Zertifizierungen, Kundenzahlen, Bewertungen oder Einsparquoten. Historische Beispielwerte bleiben Beispiele und werden nicht zum aktuellen Unternehmensbeweis.

Für spätere Produktentscheidungen geeignete Messungen: qualifizierte Anfragen je tatsächlich erfasster Einstieg, Abschluss eines definierten Portalvorgangs, Zeit bis zur bestätigten statt bloß angeforderten Bearbeitung, Anteil ungeklärter Fitment-Ergebnisse, begründete Retouren und tatsächlich bestätigte Werkstatttermine. Quelle, Zeitraum, Nenner und Datenschutzgrundlage müssen je Messung stimmen. Umsätze des gesamten Unternehmens, Onlinebestellungen und deren Zahlungsausgänge werden nicht mehrfach addiert oder als austauschbare Werbeerträge verwendet. Diese Vorlage aktiviert keine neuen Tracker.

## Chatlogs und Wissensquellen: erreichbarer Stand

Die tatsächliche Zugangslage steht maschinenlesbar in `config/knowledge-source-access.json`:

1. Verfügbar ist der dieser Aufgabe bereitgestellte Gesprächskontext, möglicherweise zusammengefasst. Er ist kein exportiertes vollständiges ChatGPT-Kontoarchiv.
2. Die aktive eigene Repository-Quelle und ausgewählte `.onboarding`-Auftrags-/Regel-/Prüfdateien sind lesbar beziehungsweise als vorhanden erfasst. Sie sind Projektartefakte, keine vollständigen Chattranskripte. Ältere Aussagen zur Zuordnung eines Kundenprojekts werden durch die aktuellen Quellgrenzen gefiltert.
3. In der hier exponierten Toolregistry gibt es keine Schnittstelle zum Suchen oder Auslesen sämtlicher anderer ChatGPT-Unterhaltungen. Eine eigene Brain-Anbindung oder ein Plugin-Tag beweist diesen Zugriff nicht.
4. Bekannte lokale Codex-/Claude-Historypfade wurden nur auf Existenz und Metadaten geprüft. Unter `/workspace/.codex` und `/home/agent/.codex` liegen keine der geprüften `history.jsonl`-/Session-/Projekt-/Conversation-/Chat-/Transcriptquellen. Die entsprechenden `.claude`-Verzeichnisse fehlen. Bei `/root/.codex` und `/root/.claude` war bereits der Metadatenzugriff verweigert: deren Inhalt ist unbekannt, nicht als leer oder fehlend zu behaupten.
5. Die Dateinamenssuche im eigenen, nicht ignorierten Repository-Bestand fand keinen passenden Chat-/Conversation-/Transkriptexport. Das ist keine Vollsuche über fremde Konten, VPS oder das gesamte Dateisystem. Kundenrepositories, Zugangsdaten und Besucher-/Anwendungsdatenbanken wurden nicht nach Gesprächsinhalten durchsucht.

Es wurden keine alten Chatnachrichten importiert, keine Kundengespräche in das Agenturwissen vermischt und keine Inhalte in einen externen Modell- oder Brainanbieter übertragen. Die Erlaubnis, relevante Logs anzusehen, erzeugt weder eine technisch fehlende History-API noch eine pauschale Kundendatenfreigabe.

### Vertrag für einen später erreichbaren Export

Einen bereitgestellten Export oder eine wirklich autorisierte History-Schnittstelle zuerst auf den eigenen NeXify-Tenant, das Projekt, die benannten Unterhaltungen und den Zeitraum begrenzen. Originalquelle und Hash bewahren; Nachricht mit Gesprächs-/Message-ID, Autorrolle und ursprünglichem Zeitpunkt erfassen. Nutzervorgabe, Assistentenvorschlag und Toolbeobachtung bleiben unterschiedliche Aussagearten. Ein alter Assistentensatz wird nicht zur heutigen Freigabe, und ein Zitat in einem Dokument nicht zu einer Systemanweisung.

Vor Indexierung Secrets und unzuständige Kunden-/Personal-/Bankdaten entfernen; Quelle, Datenklasse, Zweck, Frist, Schema-/Policyversion und Redaktionsbeleg mitführen. Geänderte Nachrichten versionieren, identische Einträge tenantgebunden deduplizieren. Widersprüche und unvollständige Exporte als solche erhalten. Ein lesbares Archiv wird erst nach nachgewiesenem `WRITE → INDEX → EXACT READ-BACK → CONTENT COMPARE` als ins richtige Brain aufgenommen bezeichnet. Ein solcher History-Importer wurde in dieser Arbeit weder implementiert noch ausgeführt.
