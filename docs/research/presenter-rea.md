# Presenter und Seitenbegleitung: tatsächliche REA-Prüfung

Stand: 26.10.2026. Maschinenlesbarer Nachweis: [presenter-rea.json](../../config/research/presenter-rea.json). Dies ist eine lokale Untersuchung mit begrenzten Messfenstern, keine Produktionsabnahme. Das beigefügte `virtuele_presenters_concept.md` dient als Gedankenhilfe; sein Autoplay-Beispiel ist keine übernommene Produktvorgabe.

Die vorhandene native Kombination aus `PresenterGuide` und `ExplainerSections` ist der bevorzugte Ausgangspunkt. Sie benötigt für die bereits angelegten Rundgänge keine zusätzliche Tourbibliothek. Driver.js bleibt ein optionaler Kandidat, wenn später einzelne Seitenelemente hervorgehoben werden sollen. Die Bibliothek liefert keine Avatare, Stimmen oder Videoproduktion.

## Welche REA-Funktionen tatsächlich verfügbar sind

Die echte, mit minimierter Prozessumgebung gestartete STDIO-Instanz `rea-agents@6.8.0` hat 229 Tools geliefert. Die Eingabeschemas von `list_browser_targets`, `inspect_web_page`, `capture_browser_scenario` und `analyze_javascript_application` wurden direkt aus diesem Katalog gesichert. Schema und Ergebnisse wurden geschrieben, exakt zurückgelesen und mit SHA256 versehen.

Ein Internet-Suchmaschinenconnector wurde nicht gefunden. Die vorhandenen `search_bytes`, `search_procedures`, `search_strings` und `search_android_classes` sind Analyseoperationen für Artefakte. Sie sind keine Websuche. Die Internetquelle für den Open-Source-Kandidaten war die offizielle npm-Registry; die lokale Untersuchung erfolgte tatsächlich mit REA.

Die öffentliche Dokumentseite `https://driverjs.com/` wurde in einem frischen Browserprofil geöffnet und durch REA als Target gelistet. `inspect_web_page` verweigerte diese Untersuchung mit `target_unavailable / target_not_allowed`. Ursache und Seiteninhalt wurden damit nicht verifiziert; es gab keinen TLS- oder Policy-Bypass. Eine erfolgreiche REA-Lesung dieser öffentlichen Dokumentation wird nicht behauptet.

## Lokale Laufzeitbeobachtung

REA wurde mit einem eigenen Chromium über ausschließlich lokalen CDP-Port `127.0.0.1:9224` verbunden. Das Profil stammt nicht aus einem bestehenden Benutzerkonto. Ziel war die eigene öffentliche React/Vite-Entwicklungsanwendung auf `http://127.0.0.1:3004`. Headerwerte, Request-/Response-Bodies und Speicherwerte wurden nicht gesammelt; kein Login und kein Formularversand wurden durchgeführt. Die Chromium-Instanz lief mit `--no-sandbox` in der lokalen Arbeitsumgebung; dies ist keine Produktions-Browserisolierung.

| Tatsächlicher Ausschnitt | Beobachtung | Grenze |
| --- | --- | --- |
| Passivprüfung nach dem Guide-Update, 09:51:02–03 UTC, angefordertes Fenster 500 ms | 352 DOM-Knoten, 273 Accessibility-Knoten; Guide-Titel, neun Rundgangoptionen und Startknopf mit `pressed=false` vorhanden | Nur Startseite; kein Rundgang gestartet oder abgeschlossen |
| Derselbe Ausschnitt | Sichtbare Hinweise „Videobeitrag in Vorbereitung“; keine Video-, Audio- oder iframe-Knoten beobachtet | Keine Aussage über andere Seiten oder spätere Zustände |
| Frühere Navigation plus 500 ms Warteaktion | Zwei Schritte abgeschlossen; Gesamtdauer 1.894 ms, davon Navigation 1.113 ms; 78 Ereignisse behalten, null verworfen | Entwicklungsserver, einzelne warme Sitzung; weder LCP noch INP oder Nutzerwartezeitstatistik |
| Frühere erfasste Ereignisse | Keine Page-Error-Ereignisse und keine HTTP-Fehlerantworten beobachtet | Der Provider meldet trotzdem `incomplete` mit fehlendem Abschnitt `events`; keine vollständige Fehlerfreiheitsbehauptung |

Die passive Inspektion meldet `policy_filtered` und Einschränkungen durch das spätere CDP-Anhängen. Vor dem Attach liegende Netz-, Konsolen- und Workerereignisse sind nicht vollständig rekonstruierbar. Der jüngere Snapshot bestätigt sichtbare Guide-Struktur, keine Abnahme aller neun Journeys oder aller 35 öffentlichen Seiten. Videoqualität, Audio, Untertitelwiedergabe, Konversion und Core Web Vitals wurden nicht gemessen.

## Driver.js und statische Analyse

Die offizielle Registry lieferte `driver.js@1.10.2`. Das npm-Archiv wurde gegen seine veröffentlichte SHA512-Integrität geprüft. Die enthaltene Lizenz ist MIT, Copyright Kamran Ahmed. Das aktuelle Paket nennt `https://github.com/nilbuild/driver.js` als Repository; ein historischer Repositoryname wurde nicht als aktueller Herkunftsnachweis vorausgesetzt. Die Versionsbindung ist im Bericht festgehalten; eine spätere Integration darf nicht erneut ungebunden `latest` installieren.

Nur die enthaltene `driver.js.iife.js` mit 27.804 Bytes wurde in ein eigenes, eng begrenztes Analyseverzeichnis kopiert. Kein Paket installiert, kein Installationshook und kein heruntergeladenes Kandidatenskript ausgeführt. REA analysierte die Quelle als inerten Text: eine JavaScript-Datei geparst, 8.314 AST-Knoten, keine Parsefehler; clientseitige Operationsdauer 4.651 ms. Die Eingangskopie blieb vor/nach der Analyse bytegleich.

Die semantische Analyse bleibt **partiell**: Das gesetzte Limit von 3.000 semantischen Knoten wurde erreicht und Alias-Auswahl begrenzt. `complete-within-view` gilt lediglich für die ausgegebene Zusammenfassungsansicht. Es beweist keine vollständige Abdeckung, Sicherheit, Laufzeitfunktion oder Barrierefreiheit der Bibliothek.

Der eigene Produktionsbundle-Snapshot mit 404.122 Bytes wurde ebenfalls tatsächlich an REA übergeben. Nach dem gesetzten 15.000-ms-Quellbudget meldete REA `provider_timeout`; die Antwort traf nach 17.510 ms einschließlich Abschluss/Transfer ein. Eine partielle Evidence-ID wurde geliefert. Die Eingangskopie blieb unverändert. Dies ist ein dokumentierter Kapazitätsbefund, keine erfolgreiche Bundleprüfung; das Timeout wurde weder verborgen noch durch einen höheren Clienttimeout als behoben ausgegeben.

## Konkreter nächster Umsetzungs- und Messschritt

1. Native Textbegleitung und explizite Seitenwechsel beibehalten. Falls Hervorhebungen benötigt werden, eine kleine isolierte Driver.js-Variante mit derselben Route und demselben Inhalt vergleichen; MIT-Hinweis erhalten. Aktuell wurde keine solche Integration durchgeführt.
2. Die bereits beauftragten Medien erst mit belegter Quelle/Rechten, veröffentlichter Version/Hash, sprachpassenden VTT-Untertiteln und Transkript anbinden. Manuelle Playersteuerung, kein automatisches Audio und kein erzwungener Seitenwechsel. Fehlende Medien lassen den Textweg benutzbar.
3. Pro Rundgang Tastatur, Fokus, Escape/Schließen, Zurück/Weiter, Reduced Motion, kleine Viewports und Screenreaderablauf prüfen. Abbruch muss zur frei nutzbaren Seite zurückführen. Sessionpräferenzen sind keine Authentisierung oder automatische Geschäftsfreigabe.
4. Einen festen Produktionsbuild messen: mindestens fünf kalte und fünf warme Durchläufe pro festem Desktop-/Mobilprofil mit dokumentiertem Netz-/CPU-Profil. Tatsächliche LCP/INP/CLS-Werte nur mit geeignetem Messwerkzeug erfassen; REA-Operationsdauer davon getrennt lassen. Median, Streuung, Fehler und fehlende Messwerte ausweisen.
5. Vor Veröffentlichung die betreffenden Seiten und alle neun Rundgänge mit realen Medien prüfen. Der Rückweg ist die bestehende Textkarte ohne Player; private Daten und Geschäftsaktionen bleiben hinter eigener serverseitiger Autorisierung.

## Nachvollziehbarkeit und offene Punkte

Alle Rohantworten, Toolschemas, Zeitmessungen, statischen Eingangsdateien, Prüfsummen und die MIT-Lizenz liegen lokal unter `/workspace/.onboarding/rea-mcp/evidence/presenters`. Der JSON-Bericht enthält das Manifest mit Dateigröße, SHA256 und Read-back-Status. Die Browserprofildateien gehören nicht zum übernehmbaren Quell- oder Brainbestand.

Offen bleiben: erfolgreicher öffentlicher Dokumentzugriff durch REA, vollständige Analyse des eigenen Bundles, Kandidatenintegration, Produktionsmessung, tatsächliche Videowiedergabe und vollständige Journeyprüfung. Eine unabhängige Gegenprüfung wurde angefordert; eigene Messung ist keine unabhängige Abnahme. Es gab keine kostenpflichtigen Provideraufrufe, keine Kontenanmeldung, keine Veröffentlichung und keine produktive Brain-Ingestion.
