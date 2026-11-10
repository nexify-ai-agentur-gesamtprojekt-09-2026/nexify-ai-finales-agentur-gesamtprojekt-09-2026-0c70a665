# NeXify AI · Soll-Design 2026-11-10

Status: verbindliche Gestaltungsrichtung, Umsetzung und Abnahme getrennt. Owner: Pascal Courbois / Art Direction. Technischer Writer: Codex.

## Entscheidung: das offene Studio

NeXify zeigt ein echtes Arbeitsgespräch. Pascal und die originale Szene sind der Anker; Oracle gehört als Gesprächsfläche rechts zum selben Raum. Die Grundanordnung bleibt. Jeder Abschnitt soll eine konkrete geschäftliche Frage beantworten und zu einem tatsächlich möglichen nächsten Schritt führen. Ein Bild oder Video führt, Text erklärt nur das Nötige.

Graphite bildet eine durchgehende Bühne. Metallreflexe sind neutral silbern. Gold und beige Schimmer entfallen. Glas zeigt Tiefe und Bedienbarkeit an wenigen Stellen; es ist kein Schmuckrahmen um jedes Element. Lime kennzeichnet Marke, Fokus und Handlung. Keine flächigen Leuchteffekte, Kartengitter oder generischen KI-Versprechen.

**Die drei gehören zusammen:** Pascal steht für persönliche Verantwortung, NeX für das aktive Mitdenken und Oracle für das Gespräch und die Koordination. In der prägenden Startszene erscheinen sie als ein Team. Auf Fachseiten darf eine einzelne Figur die jeweilige Aufgabe führen; die visuelle Identität, Größenordnung und Beziehung zum Team bleiben konsistent. Die aktuelle Farbstimmung orientiert sich an Oracle und dem gemeinsamen Lime; eine ältere Grün-Orange-Logovariante wird erst nach Fund und Prüfung der Originalquelle übernommen, nicht nachgebaut.

## Was die Korrekturen ausgelöst hat

| Rückmeldung | Tatsächlicher Befund | Soll |
|---|---|---|
| „Zu viel“, „aufgesetzt“, „nicht jung“ | Frühere Farb-/Glasstudien und viele gleichgewichtige Komponenten nahmen der Szene den Fokus. | Weniger Ebenen, größere Originalszene, kürzere Sprache, großzügige aber kontrollierte Abstände. |
| „Leergutautomat“ im Chat | Vor erster Eingabe standen Frage, drei große Themen, Prozessschritte, Formularkasten und „Nächster Schritt“ gleichzeitig. | Eine Frage, offene Schreibfläche, höchstens drei leise Vorschläge; weitere Schritte erst nach einer Antwort. |
| Gesicht beachten | `config/presenter-artwork.json` belegt Pascals `pascal-lossless.webp` als unveränderte sichtbare Pixel des Original-PNG. Für `hf-17-cutout` liegt dieser Identitätsbeleg nicht vor. | Pascal nur aus dem belegten Master oder gesondert abgenommenem Originalmaterial; keine neue Alters-/Gesichtsvariante. `hf-17` aus dem Finale entfernt. |
| Schluss wirkt wie KI-Block | Zentrierter Allgemeintext, doppelte CTA, großes Poster und Leerstrecke zum Footer. | Offene, typografische Schwelle zum Footer; konkrete Einladung, eine CTA, kein identitätsungeprüftes Gruppenposter. |
| Größen stimmen nicht | Browsermessung: Hero-Medium +43 px bei 1920 über den Container; Galeriebild 3 bei 768 nur 386 px statt 699; Detailseiten zeigen ersten Nutzen erst um y≈1500. | Medien bleiben in ihrem Abschnitt; einspaltige Bilder volle Breite; auf Detailseiten erster konkreter Nutzen innerhalb eines Viewports. |
| Goldkante unter Video | Film und seine Einfassung sind gewünscht; die schwarze Bedienleiste mit warmem Fortschrittsstrich ist abgelehnt. | Video/Einfassung behalten; Bedienleiste in Graphite integrieren, neutrale Kante und Lime-Fortschritt. |
| Generische KI-Sprache | Wiederholte „Vielleicht“- und „passende Lösung“-Formeln auf der Startseite. | Kurze Aussagen über konkrete Situationen, Arbeit und Nutzen; keine erfundenen Ergebnisse oder Kundenzitate. |

## Seitenregeln

1. **Startseite:** Eine dominante Originalszene oben. Text links im ruhigen Bildrand, Pascal frei sichtbar. Oracle rechts integriert. Die drei bestehenden hochwertigen Szenen darunter erzählen unterschiedliche Ausgangslagen, keine behaupteten Kundenfälle.
2. **Oracle:** Zuerst fragen und zuhören. Die Eingabe ist die Hauptbedienung, keine Kachel im Kachelkasten. Themen sind optionale Satzanfänge. Nach der ersten Antwort erscheinen Einordnung, passende Wege und ein editierbares Briefing. Die Übernahme ins Formular geschieht bewusst; ein abgesendeter Kontakt wird erst nach echter Backend-Bestätigung behauptet. Die statische Sites-Version sagt sichtbar, dass sie keine Live-KI ist.
3. **Detailseiten:** Intro, passendes Bild und erster konkreter Nutzen bilden einen kompakten Einstieg. Dasselbe Motiv darf nicht unmittelbar auf Start- und Detailseite als identischer Hauptauftritt wiederholt werden. Bildausschnitt und Maßstab folgen der Aussage des Abschnitts.
4. **Schluss und Footer:** Keine zusätzliche Posterwand. Der Abschluss führt mit einer konkreten Frage und einer Oracle-Handlung in den Footer über. Navigation und Recht bleiben eindeutig dem jeweiligen Marken-/Tenant-Kontext zugeordnet.
5. **Medien:** Gewählte Studio-MP4 oben; vorhandenes Foto als Poster und Fallback. Erstes weiteres Video bleibt im Slot-Plan. Identität, Sprache, Ton, Untertitel und mobile Darstellung werden pro Datei vor öffentlicher Veröffentlichung geprüft. Bilder bleiben bis dahin vollwertig.

## Messbare Abnahme

- Browserbilder bei 320, 375, 768, 1024, 1265, 1415 und 1920 px: kein Überlauf; Film innerhalb Hero; mobile Galerie in voller Breite; Footer ohne Leerstrecke.
- Oracle: erste Ansicht ohne Prozessleiste oder zweiten Handlungsblock; Themenwahl, Freitext, Fokus, Briefing, Formularübergabe, Speicherfehler und Tenant-Trennung funktionieren.
- Video: Einfassung erhalten; Bedienung inkl. Ton, Lautstärke, stummem Autoplay-Fallback und Reduced Motion bedienbar. Kein goldener Streifen unter dem Bild.
- Jede Gesichtsdarstellung gegen belegte Quelle und Freigabestatus prüfen. Eine Dateiexistenz oder Bildgröße ist kein Identitätsnachweis.
- Build, vollständiger Typecheck, echter Lint, passende Browser- und API-Prüfungen, unabhängiger Design-/Fachcheck und Readback am Ziel vor Status „ausgeliefert“.

## Wahrheitsgrenze

Die lokale Sites-Ausgabe ist statisch. Der gegenwärtige öffentliche Oracle-Chat ordnet Inhalte aus der Website ein und erzeugt ein bearbeitbares Briefing; er führt keinen Live-Agenten aus. Ein Kontakt kann erst auf einem tatsächlich verbundenen Backend mit bestätigter Vorgangsnummer als eingegangen gelten. Dieses Sollbild ist keine Behauptung, dass diese Produktionskette bereits abgenommen ist.
