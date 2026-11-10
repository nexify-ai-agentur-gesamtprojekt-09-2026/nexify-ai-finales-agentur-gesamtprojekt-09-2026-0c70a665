# NeXify AI · Creative Experience

Stand: 09.11.2026 · Owner: Pascal Courbois / Creative Direction · Umsetzung: Codex Hauptlauf · Status: in Arbeit

## Das eigentliche Ziel

Ein Besucher soll NeXify als menschlich geführte, kreative Produktionsumgebung erleben. Er sieht Pascal, versteht an konkreten Beispielen, was entstehen kann, und macht aus seinem Vorhaben mit Oracle sofort einen nächsten brauchbaren Schritt. Die Website ist der Eingang in diese Zusammenarbeit, nicht eine Sammlung schön gestalteter Leistungsseiten.

**Erlebnisversprechen:** „Erzählen Sie, was Sie vorhaben. Gemeinsam machen wir daraus etwas, das funktioniert.“ Dieses Versprechen ist erst erfüllt, wenn Gespräch, bearbeitbares Briefing und echte Anfrage zusammenhängen. Der Auftritt darf keine Live-KI oder fertige Lieferung behaupten, wenn nur eine lokale Orientierung verfügbar ist.

## Quellen und Entscheidungen

- Aktuelle Nutzerkorrektur `docs/09-final/creative-factory-excellence-2026-11-09.md`: Modern AI Factory, branchenübergreifende Ergebnisse, Oracle als Produkt, weniger konservative Champagner-Dominanz.
- Referenz-Lock `NEXIFY_CODEX_DESIGNREFERENZ_ADDENDUM.md` und lokale `run.html` unter dem angelieferten UI/UX-Ordner: durchgehende Graphite-Bühne, großformatige Personenszene, rechts eingebetteter Oracle-Bereich. Die gespeicherte Datei enthält plattformspezifische Laufzeit und ist keine Funktionsquelle.
- Nutzerentscheidungen in diesem Auftrag: zweites Originalvideo als Startseitenszene oben; erstes Originalvideo für späteren passenden Slot. Hochwertige Bilder bleiben Poster und Fallback. Das Design soll lockerer wirken; aufgesetzte Effekte und zu viele Schmuckelemente sind abgelehnt. Audio-Autoplay wird versucht und bei Browsersperre über eine sichtbare Tonaktivierung angeboten.
- Aktueller privater Site-Stand v6 und Browserbilder: Film sitzt zu klein und zu tief; der Chat wirkt wie eine abgetrennte Kartenspalte. Der nachfolgende lokale Cyan-Entwurf wurde ausdrücklich verworfen und nicht ausgeliefert.

## Vor jeder weiteren Designentscheidung: Tatsachenfragen

| Frage | Beobachtung mit Quelle | Prüfung / Konsequenz |
|---|---|---|
| Was ist Pascals wiederholter Einwand? | Nutzerkorrekturen vom 09./10.11.: zu konservativ, dann zu aufgesetzt; neuer lokaler Entwurf ebenfalls nicht jung, nicht ganzheitlich genug. | Keine weitere isolierte Farb- oder Kartenschicht als Lösung ausgeben. Erst gemeinsame Raumkomposition, echte Szene und funktionierenden Kundenweg testen. |
| Welcher Teil der `run.html` war richtig? | Lokale Exportdatei `Nexify UI_UX Design Optimization_files/run.html` und Screenshot `/tmp/nexify-run-reference-1440.png`: großer menschlicher Medienanker, linke Ansprache, rechts Oracle in einem Graphite-Raum. | Diese Raumbeziehung prüfen; Script/Live-Behauptungen des Exports nicht übernehmen. |
| Was ist am aktuellen Stand tatsächlich funktional? | Private Site v6 ist statisch; Chat zeigt lokale Website-Orientierung. Lokaler Browsertest beweist Briefing-Übergang ins Formular, nicht erfolgreiche Anfrage in der privaten Site. | Status im Chat ehrlich halten; kein „Live-KI“, keine bestätigte Einsendung ohne API. |
| Hat das zweite Originalvideo seinen Platz und sichere Bedienung? | Gewähltes Studio-Original steht oben; Foto ist Poster/Fallback. `browser-video-controls-20261109.mjs` fand bei 1265 px eine überdeckte Lautstärkesteuerung im neuen Layout. | Fix am tatsächlichen Layout erneut testen; Medium nicht allein anhand eines Screenshots freigeben. |
| Was vermittelt die Bildwelt unter dem Hero? | `brand-media.ts` ordnet drei vorhandene Motive zu, aber ältere drei gleiche Karten erzählten Branchenbedarf nur allgemein. | Szenen als illustrative Beispiele mit Ausgangslage → möglichem Weg → Zielnutzen und passenden Routen prüfen; keine Kundenfallbehauptung. |
| Kann Oracle als aktueller Agent Rückfragen für diesen Auftrag beantworten? | In den verfügbaren Connector-Werkzeugen gibt es keine verifizierte direkte Oracle-Gesprächsoperation; öffentliches `/api/agent-chat` ist regelbasiert. | Ungeklärte Fachfragen aus aktuellen Primärquellen und Pascal-Entscheidungen klären; keine Oracle-Antwort simulieren. Die echte Agentenbindung ist Aufgabe von SUB-GOAL 11. |

Der ältere Brain-Eintrag `DESIGN_VORGABE.md` vom 21.06.2026 beschreibt Orange als Akzent für einen damaligen Vercel-Preview. Er ist historisch und wird durch die jüngsten direkten Graphite-/Lime-Entscheidungen nicht als aktuelle Farbfreigabe verwendet. Die Mem-Notiz „Steuerungswiki“ vom 07.11.2026 bestätigt die Priorität wirtschaftlich nutzbarer Agenturleistungen und die Trennung von Plan und Live-Zustand.

## Leitidee: Die offene Werkbank

Der digitale Auftritt fühlt sich an wie ein offener Arbeitsraum: Pascal zeigt, was möglich ist; der Besucher bringt sein Vorhaben ein; Oracle macht den ersten Schritt unmittelbar bearbeitbar. Die Wirkung kommt aus einer starken originalen Szene, Raum, Typografie und einem funktionierenden Gespräch. Zusätzliche Leuchteffekte, Etiketten und Karten würden diese Idee schwächen.

## Eine räumliche Bühne

1. **Mensch:** Pascal ist der visuelle Anker. Die originale Studioszene bildet die große Mitte der ersten Ansicht. Kurzer Text liegt links im dunklen Rand derselben Bühne, ohne Pascals Gesicht zu verdecken. Das Motiv behält seine Identität; keine neue Gesichtsvariante, kein künstlicher Playbutton.
2. **Vorhaben:** Links steht eine einfache, konkrete Aussage in natürlicher Sprache. Leistungen, Preise und Fachbegriffe folgen erst, wenn der Besucher verstanden hat, was NeXify für sein Unternehmen tun kann.
3. **Gespräch:** Oracle sitzt rechts als ruhige Arbeitsleiste desselben Raums, getrennt durch eine feine Linie. Keine fremde Widget-Optik, kein künstlicher Verfügbarkeitsstatus. Der Einstieg zeigt eine echte Frage, wenige sinnvolle Themen und sofort erreichbare Eingabe.
4. **Material:** Graphite trägt die gesamte Oberfläche. Silber und sparsame warme Reflexe geben physische Tiefe. Lime markiert Marke und Handlung. Die Bühne bleibt überwiegend neutral und dunkel; keine großflächige Cyan-/Beige-Wäsche. Glas erklärt Ebenen und Interaktion, es dekoriert sie nicht.
5. **Rhythmus:** Nach dem Hero folgen unterschiedliche, bildgetragene Szenen. Jede zeigt ein Problem, eine passende Lösung und den möglichen Nutzen. Industrie, Handel, Dienstleistung und weitere Branchen werden mit fachlich passenden vorhandenen Bildern gezeigt; unbelegte Kundenergebnisse und Fallstudien bleiben ausgeschlossen.

## Der Kundenweg

`Vorhaben nennen → Oracle ordnet ein → Fragen/fehlende Angaben erkennen → bearbeitbares Briefing → passende Optionen/Seiten → Anfrage mit übernommenem Briefing → bestätigter Eingang`.

Eine lokale Orientierung wird als solche kenntlich gemacht. Eine persönliche Angebotsanfrage wird ausschließlich durch das echte Kontaktformular ausgelöst; ein Klick im Chat sendet noch nichts. Bei Backend-Ausfall bleibt der Entwurf erhalten. Fachliche Optionen und Kosteneinordnung brauchen verifizierte Daten. Der Kunde kann jeden Schritt lesen, ändern und abbrechen.

## Seitenfamilien

- **Startseite:** ein Raum mit Mensch, Szene, Gespräch und drei klaren Wegen in reale Leistungen/Produkte.
- **Leistungen und Branchen:** wechselnde asymmetrische Medienkompositionen, konkrete Ausgangslage, Lösung und nächster Schritt.
- **Produkte und Suite:** echte Oberflächen und Funktionsgrenzen statt dekorativer Dashboards.
- **Wissen und Unternehmen:** redaktionell, lesbar, menschlich; Gestaltung im gemeinsamen Materialsystem.
- **Kontakt:** kurzer, überprüfbarer Übergang aus Oracle; Anfrage erst nach Einwilligung und bestätigter API-Antwort.
- **TEILEKLAR:** eigene Marke und Datenwege, gemeinsame technische und barrierefreie Komponenten.

## Abnahme pro Paket

- Browserbilder 320, 375, 768, 1024, 1265 und 1440 px: Video oben, keine Text-/CTA-Überdeckung, Chat auf Desktop integriert und mobil zugänglich.
- Film: Originaldatei, freigegebenes Poster, sichtbare Tonbedienung, Fehler-Fallback, reduzierte Bewegung.
- Chat: Themenwahl, Freitext, Antwort, editierbares Briefing, Übergang ins Kontaktformular und Abbruch/Fehlerfall nachweisbar.
- Kontrast, Tastatur, Touch und Fokus sind praktisch geprüft; Inhalte und Preisangaben an Quellen gebunden.
- Build, vollständiger Typecheck, Lint, relevante Browser-/API-Tests, unabhängige Gegenprüfung und exakter privater Site-Readback vor einer Statusänderung auf ausgeliefert.

## Umsetzungspakete

1. Startbühne und Oracle-Einstieg gemeinsam überarbeiten; verworfene Farbstudie nicht übernehmen.
2. Briefing ohne Kopierhürde in die echte Anfrage übernehmen und den Weg Ende zu Ende testen.
3. Startseite mit vorhandenen Szenen zu konkreten Lösungspfaden umbauen.
4. Seitenfamilien nacheinander angleichen, einschließlich Mobile und Bild-/Video-Slot-Plan.
5. Backend, Angebot, Suite und Betrieb nur mit ihren eigenen fachlichen Freigaben und Nachweisen erweitern.

Diese Datei beschreibt das SOLL. Für jede Funktion gilt erst der konkrete Code-, Browser- und Zielnachweis als IST.
