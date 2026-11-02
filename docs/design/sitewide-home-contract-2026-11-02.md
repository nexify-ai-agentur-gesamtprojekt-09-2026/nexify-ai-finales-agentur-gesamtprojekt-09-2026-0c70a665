# NeXify AI · verbindliche Seitengestaltung

Stand: 02.11.2026. Referenz ist die freigegebene Home der eigentümerprivaten Sites-Ausgabe. Diese Vorgabe gilt für alle öffentlichen NeXify- und TEILEKLAR-Seiten der Anwendung; TEILEKLAR behält Namen, Produktinhalt und eigene fachliche Wege. Änderungen an Recht, Preisen, Zahlungsfunktionen oder externen Diensten ergeben sich daraus nicht.

## Gestalterische These

Ein persönlicher, hochwertiger Auftritt für Unternehmen, der Gestaltung, digitale Abläufe und Marketing als eine zusammenhängende Leistung erklärt. Der Besucher erkennt zuerst sein Thema und den nächsten sinnvollen Schritt. Tiefe entsteht aus einer warmen Lichtquelle, Materialkante und Abstand, nicht aus einer Ansammlung von Glaseffekten, Trennstrichen oder Standardkarten.

Die Home ist die visuelle Quelle. Eine Folgeseite darf ihr Thema anders erzählen, aber weder eine zweite Farbwelt noch eine andere Typografie-, Radius-, Schatten- oder Navigationslogik erfinden.

## Unveränderliche Grundlagen

Alle visuellen Werte kommen aus `config/design-tokens.json` und `packages/tokens/tokens.css`. Bei neuen Werten erst die Tokenquelle und diese Vorgabe fortschreiben. Die verwendeten Rollen:

| Rolle | Token | Zweck |
| --- | --- | --- |
| Grund | `atelier.canvas` #111212 | Eine durchgehende dunkle Bühne |
| Lesefläche | `atelier.surface` #191B1C | Opaque Fläche für Formulare und notwendige Karten |
| Anhebung | `atelier.raised` #242728 | Nur für Steuerelemente und deutliche Zustände |
| Primärtext | `atelier.ink` #F3F0EA | Überschriften und Handlungen |
| Sekundärtext | `atelier.platinum` #BDC5C9 | Fließtext und Erläuterungen |
| Wärme | `atelier.champagne` #C4B394 | Licht, Verlauf und dezente Orientierung |
| Marke | `marke.lime` | Signet, Fokus und eine führende Aktion |

Schrift: Plus Jakarta Sans für Überschriften; Inter für Lesetext und Bedienung. Der globale Überschriftenverlauf `gradient.atelierHeading` gilt für H1 bis H4, mit normaler Schriftfarbe bei erhöhtem Kontrast. Die Home nutzt `type.heroSize`, Folgeseiten `type.heroCompact`; das Motiv bleibt auf beiden Seitenformen dominant. Eine Seite erhält keine zusätzliche Display-Schrift. Fließtext bleibt in einer gut lesbaren Zeilenlänge; größere Monitore vergrößern die Gesamtkomposition, nicht einzelne Absätze ins Unendliche.

Die Breite folgt der Home: `layout.homeWideMax = (verfügbarer Websitebereich + 1440px) / 2`. Bei großen Ansichten werden die Innenränder über `layout.homeWidePadding` reduziert. Header, Hero, Lesebereich, Folgeangebote und Footer liegen auf derselben Achse. Keine Fläche endet mit einer sichtbaren harten Kante, wenn sie nur einen Lichtwechsel darstellen soll.

## Seitenrhythmus

1. Header und Brotkrumen geben Orientierung, ohne den Hero zu übertönen.
2. Hero: kleine Themenangabe, H1 aus drei bewusst gesetzten Textzeilen, eine eigenständige Unterzeile, danach der erklärende Textblock und höchstens zwei Einstiegshandlungen. Die Abstände staffeln Nähe: Titel und Unterzeile eng, Erklärung mit eigenem Abstand, Handlung nach einem weiteren Atemraum. Film oder Illustration stehen rechts und sind größer als nachfolgende Motivkacheln. Auf schmalen Ansichten stehen Text und Film untereinander. Die deutschen Zeilen und Unterzeilen der Folgeseiten liegen in `apps/web/lib/public-hero-copy.ts`; Seitentitel bleiben als Metadaten und Brotkrumen erhalten.
3. Eine kurze, horizontale Bereichsorientierung folgt dem Hero. Sie ist kein zusätzlicher Kasten und wiederholt keine ganze Sitemap.
4. Inhaltsabschnitte folgen der Home-Logik: Überschrift und Erklärung bilden auf breiten Ansichten eine ruhige editoriale Zeile; auf schmalen Ansichten werden sie gestapelt. Thematisch zusammengehörige Texte stehen nah; neue Themen erhalten mehr Abstand. Inhalt schlägt Dekoration.
5. Verwandte Wege und Abschluss erhalten eine klare Aufgabe und konkrete Linktexte. Der Footer bietet den persönlichen Einstieg, Navigation, direkte Pflichtlinks und Einstellungen mit sichtbaren Außenabständen.

Abstandsleiter: `space.4` (16px) zwischen eng verbundenen Textelementen, `space.5` (24px) zwischen Aussage und Erläuterung, `space.6` (32px) vor Handlungen oder zwischen Karteninhalt und nächster Gruppe, `space.7`/`space.8` (48/64px) zwischen eigenständigen Seitenthemen. Diese Rollen gelten konsistent; gleichförmige 24px-Lücken zwischen allen Elementen sind kein System.

## Material, Bild und Bewegung

Ein weiches, warmes Umgebungslicht verbindet die Seiten. Filmkanten verwenden `radius.homeMedia` oder `radius.atelier`, eine feine Lichtkante und `shadow.atelierDepth`. Das Bild selbst bleibt vollständig sichtbar; keine Schrift über Gesichtern oder Produktmotiven. Keine zweite dicke Umrandung, kein kühler Neonstreifen und kein großflächiger Glasblock hinter Lesetext. Inhaltstragende Flächen sind deckend; Glas ist für schwebende Navigation und Steuerung reserviert.

Unnötige nummerierte Bildunterschriften, Transkripte im Sichtfeld und dekorative 1px-Trenner entfallen. Notwendige Filmsteuerung bleibt zugänglich. Autoplay und Ton folgen den tatsächlichen Browser- und Nutzerentscheidungen; eine vorhandene Mediendatei wird nicht als neuer synchroner Sprecherfilm ausgegeben. Lade-, Fehler-, Pause- und Wiederstartzustand müssen wahr sein. `prefers-reduced-motion`, erhöhte Kontraste und reduzierte Transparenz behalten eine brauchbare Darstellung.

## Seitentypen

| Typ | Schwerpunkt |
| --- | --- |
| Leistungen und Produkte | Zwei Spalten mit passendem Motiv, verständliche Leistung und konkret benannter nächster Schritt |
| Preise und Ablauf | Klarer Kostenbegriff, keine erfundenen Tarife oder Mitbewerberzahlen als NeXify-Preis |
| Wissen, Unternehmen, Kontakt | Aussage vor Navigation; persönlicher Kontext und Anfrageweg statt zusätzlicher Werbekästen |
| Recht, Zugang | Ruhigere Lesebreite, eindeutige Überschriften und Bedienung; fachliche Texte nicht gestalterisch verkürzen |
| TEILEKLAR und Werkstatt | Dieselbe Raum-, Schrift- und Materiallogik; Passung, Artikelstatus, Anbieter und Prozesszustand müssen fachlich eindeutig bleiben |

TEILEKLAR erhält in der Hauptnavigation eigene Wege für Teilesuche, Kategorien, Fahrzeug und Passung, Werkstatt, Partner und Warenkorb. Weitere Servicebereiche stehen in einer klar benannten Ergänzung. Der allgemeine NeXify-Produktpunkt ersetzt diese Shop-Navigation nicht.

## Text, Auffindbarkeit und Wahrheit

Jede Seite beantwortet sichtbar: Für wen ist sie? Was verändert sich konkret? Was ist der nächste Schritt? Titel, Untertitel, Teaser, CTA und Metadaten dürfen sich nicht widersprechen. Klar verständliche Leistungsbegriffe gehen vor internen Produktnamen. SEO, GEO und lokaler Bezug entstehen aus passenden Seiteninhalten, strukturierter Hierarchie, spezifischen Metadaten und belegten Unternehmens- beziehungsweise Standortfakten. Keine erfundenen Referenzen, Garantien, Orte, Öffnungszeiten, Preise oder Nutzerzahlen. Die eigentümerprivate Vorschau bleibt bis zu einer gesonderten Freigabe `noindex`; Sichtbarkeit kann hier nur vorbereitet, nicht als Suchergebnis belegt werden.

Der Chat zeigt nur erreichte Zustände. Er darf kein versandtes Angebot, bestätigte Buchung oder echte KI-Beratung behaupten, solange die jeweilige Funktion nicht nachweislich aktiv ist. Eingabe und Antwortbereich bleiben beim Scrollen stabil; Hinweise zu möglichen Fehlern bleiben verständlich und sichtbar.

Die Antwortgeschichte scrollt innerhalb des Panels; die Eingabe verschiebt weder beim Eintreffen einer Antwort noch durch Fokuswechsel die Seite. Eigene Nachrichten liegen auf der dunklen Bühne, Antworten auf einer leicht angehobenen Fläche, zugehörige Wege als ruhige Karten innerhalb der Antwort. Es gibt einen klaren Start, keine technische Vorrede in jeder Antwort und keine großflächige Leere durch falsch gekoppelte Flexbereiche.

## Frühere Fehler, die nicht zurückkehren dürfen

- Große Monitore: gequetschte 1440px-Bühne und zu breite Leerränder.
- Hero: kleinerer Film als die nachfolgenden Bilder, zu schwache Bühne, unruhige Kanten oder Text über dem Motiv.
- Tablet: zwei enge Spalten mit umbrechenden Aktionen.
- Typografie: wechselnde Überschriftenstile, uniformer Textabstand, kurze Floskeln ohne konkreten Nutzen.
- Bildwelten: mehrere konkurrierende Glas-/Kartenstile, harte Abschnittskanten, Nummernstreifen ohne Informationswert.
- Footer und Einstellungen: fehlende seitliche Außenabstände oder technische Hinweise als ungestaltete Vollbreitenzeilen.
- Chat: bewegtes Eingabefeld, unlesbare Antwortfläche, behauptete Angebote, Termine oder Modellfunktionen.
- Film: Hänger, stiller oder nicht synchroner Ton, austauschbare Stimme und sichtbares Sprechertext-Duplikat.

## Abnahme jeder Folgeseite

Prüfen bei 390, 768, 1100, 1440 und mindestens 2709px: kein horizontaler Überlauf, keine Text-/Bildüberlagerung, gleiches Raster wie die Home, ausreichende Kontraste und Fokusmarken, sinnvolle Linkziele, funktionierende Form-/Disclosure-/Filmzustände. Für jede öffentliche Route H1, Metadaten, Kanonical und Bildverhalten kontrollieren. Build und Design-Audit sind Pflicht; historische Repository-Fehler werden getrennt und ehrlich ausgewiesen.
