# Umsetzungsplan: Pascal, NeX und AIFly als durchgängige Seitenbegleitung

Stand 26.10.2026. Ziel ist die eigene NeXify-/TEILEKLAR-Gesamtlösung, keine
Sammlung fremder Videowidgets. Die beigefügte YAOTI-Gedankenhilfe ist unter
`docs/research/inputs` unverändert und gehasht erhalten. Ihre historischen und
anbieterbezogenen Aussagen sind keine automatisch bestätigten Produktfakten.

## Entscheidung aus den Quellen und REA-Befunden

Die vorhandene native React-Oberfläche bleibt die Grundlage. Sie verbindet
Seitenwissen, nächste Handlung und die drei Sprecher über dieselben Nutzerwege.
Für die heute benötigte Textführung und Clipwiedergabe wird keine zusätzliche
Avatarplattform oder Tourbibliothek benötigt. Kein konkurrierendes Dashboard,
kein fremdes iframe und keine automatische Mikrofonaufnahme werden eingebaut.

Die öffentliche Herstellerrecherche prüfte sieben Optionen und acht Paketarchive.
Driver.js1.10.2 und React Joyride3.2.0 sind MIT-Kandidaten für spätere Hervorhebungen;
Joyride nennt React19 ausdrücklich. Shepherd15.3.0 ist für diesen kommerziellen
Einsatz nicht die voreingestellte Wahl, da die Anbieterbedingungen eine
kommerzielle Lizenz verlangen. Video.js10.2.0 verwendet für einen tatsächlichen
Reactplayer das gesonderte Paket `@videojs/react`. LiveAvatar, D-ID und ElevenLabs
Livegespräche sind optionale spätere Providerverträge, kein Ersatz für die
bestehenden Runway-/ElevenLabs-Aufnahmen. Quellen und Grenzen:
[Technische Auswahl](../research/presenter-options.md).

REA6.8.0 wurde tatsächlich per STDIO verwendet. Die lokale Homepage zeigt im
aktuellen passiven Ausschnitt 352 DOM- und273 Accessibility-Knoten, neun
Rundgangoptionen und vorbereitete Videokarten. Driver.js wurde als inerte
JavaScriptquelle mit8314AST-Knoten analysiert; der semantische Graph bleibt bei
3000Knoten partiell. Die Analyse des eigenen404122Byte-Bundles erreichte das
15Sekunden-Quellbudget. Das ist ein Limit, kein positiver Sicherheitsnachweis.
Eine REA-Websuchfunktion war nicht vorhanden; die öffentliche Browserinspektion
wurde verweigert. Offizielle Internetrecherche und tatsächliche lokale
REA-Messungen sind getrennte Belege, keine behauptete erfolgreiche REA-Websuche.
[Messbericht](../research/presenter-rea.md) und maschinenlesbare Evidenz stehen bereit.

## Bereits gebaut und lokal geprüft

- 35 öffentliche Seiten mit47 thematischen Erklärmodulen; zwölf Kernseiten mit
  zwei unterschiedlichen Sprechern und Links-/Rechts-Wechsel. Vorhandene
  Abschnitte, Aktionen und Inhalte wurden nicht entfernt.
- Neun bestehende Nutzerwege als freiwillige Textbegleitung mit Einstieg,
  Zurück/Weiter, Pausieren und nachvollziehbarem Ende. Alle neun wurden im
  echten lokalen Browser durchlaufen, einschließlich Shop und Werkstatt.
- Auswahl und Aktivierung werden nur als funktionale Tabpräferenz gespeichert;
  keine Rollen, Mandantenzugehörigkeit, Mikrofonfreigabe oder Einwilligung
  zwischen Domains wird daraus abgeleitet. Kein automatischer Seitenwechsel.
- Alle Medien sind noch `asset_pending`. Es gibt keine vorgetäuschten Playknöpfe.
  Text, Kontakt und Folgeseiten bleiben nutzbar. Keine generierte Hörprobe oder
  noch fehlende Videofassung wird als veröffentlicht angezeigt.
- Öffentlicher Buildfilter mit geprüften Quellenpfaden und SHA256, Entfernung
  interner Felder und privaten Seiten. Neue Quellen oder geänderte Quellbytes
  müssen im versionierten Inventar bewusst nachgeführt werden.

## Nächste Umsetzungsschritte und Abnahme

| Schritt | Vorhandenes wiederverwenden und konkrete Arbeit | Nachweis vor Weitergabe |
|---|---|---|
| 1. Inhaltsabgleich vervollständigen |93Originalquellen,47Sprecherentwürfe und69noch nicht direkt zugeordnete Quellen gegeneinander prüfen. Skripte pro Geschäftsfall mit Kundenziel, tatsächlich enthaltenem Umfang und nächstem Schritt zusammenführen. |Jede Quelle und jeder relevante Zustand zugeordnet; keine ausgelassenen Portal-/Shop-/Werkstattfunktionen. Direkte Referenz allein bleibt unzureichend. |
| 2. Tatsächlichen Medienbestand lesen |Über den nachweislich verbundenen Runway-/Composio-/ElevenLabs-Zugang vorhandene Clips, Sprachfassungen und freigegebene Hörproben inventarisieren. Quelle, Person/Charakter, Rechte, Dauer, Sprache, Version und Hash binden. |Echte API-/Tooloperation, passender Account/Tenant, persistierte Assetmetadaten und exaktes Read-back. In dieser Sitzung fehlt der Providerzugang weiterhin. |
| 3. Nur fehlende Fassungen produzieren |Vorhandene geeignete Assets zuerst nutzen. NeX: `Lbm7qDmJUxIxpWx9qhZO`; Pascal und AIFly jeweils `feTHtWuEJFLTOWyoreyy`, wie vom Nutzer vorgegeben. Entwurf, Ausgabe und veröffentlichte Fassung trennen. |Belegte Job-ID, Verbrauch, Eingabe-/Ausgabehash und tatsächlicher Abschluss; unklaren Jobstatus vor Retry abgleichen. Keine ungeprüfte Stimme als akzeptiert ausgeben. |
| 4. Medien aufbereiten |Eigenes Hosting, passende VTT-Untertitel und Transkript. Transparente WebM-/gegebenenfalls HEVC-Varianten anhand wirklicher Dateien testen; gewöhnliches Video/Poster als Rückweg. Ein einzelnes Format ist kein universeller Browsernachweis. |Chromium/Firefox und reales iOS/Safari, manuelle Wiedergabe, Pause/Schließen, Tastatur, Fokus, Reduced Motion und fehlender Clip. Aktuell wurde kein echtes Presenter-Video abgespielt. |
| 5. Begleitung mit Fachzuständen verbinden |Bestehende Angebots-/PDF-/Outbox-/Termin-/Marketingverträge und später Shop/Fitment/Retouren/Partnerfunktionen anbinden. Die Sprecher erklären denselben tatsächlichen Zustand wie die Seite und AIFly. |Mandant/Rolle serverseitig, Idempotenz, Wiederholung, Abbruch und Negativfälle. PDF ist nicht Versand; Anfrage nicht Bestätigung; Warenkorb nicht bezahlte Bestellung. |
| 6. Optionalen Spotlightvergleich durchführen |Nur wenn die native Führung nicht reicht: genau Driver.js oder Joyride isoliert mit eigener Oberfläche, denselben Inhalten und denselben Routen erproben; Lizenzhinweise erhalten. |Vergleichbares Buildvolumen, Geräte-/Kaltstartbedingungen, Fokus-/Mobiltests und Nutzen aus echter Beobachtung. REA analysiert gezielt die geänderten Module statt nochmals den ganzen Bundle im selben Budget. |
| 7. Optional einen Livepilot ergänzen |Ein Anbieter, enger serverseitiger Session-/Quota-Vertrag, eigene UI und ausdrücklich nutzerinitiierter Start. Für LiveAvatar das dokumentierte offene Mikrofonstandardverhalten explizit deaktivieren. |Echte SDK-/API-Bindung, End-to-End-Abbruch und Wiederverbindung, bekannte Laufzeit-/Kostenlimits, sichere Secrets, Datennutzung/Region und Textfallback. Keine öffentliche Operatorberechtigung. |
| 8. Ein Release auf Haupt- und Backupziel prüfen |Vercel bleibt primär; portable Reactdateien aus demselben geprüften ZIP/Manifest übernehmen. Die bestehende.cloudSeite bis Fertigstellung bewahren. |Commit und alle Assethashes an beiden wirklichen Zielen zurücklesen, API-Ausfall und Rückweg prüfen. Die ChatGPT-Deploymentfähigkeit und ein öffentlicher Previewzugang sind hier noch nicht nachgewiesen. |

## Wirtschaft, Kommunikation und Wissensgrundlage

Die [Produkt-/Kostenmatrix](product-and-content-economics.md) verbindet sechs
Bereiche mit Kundenziel, Umfang, Abgrenzung, Backendabhängigkeiten und Freigaben.
Kosten bleiben an tatsächliche Kontingente, Länge, Sprachvarianten, Nutzung und
Rechte gebunden. Keine erfundenen Anbieterbeträge, Umsatz- oder ROI-Versprechen;
bestehende ungeklärte Prepaid-/Abo-/Vertragsfragen bleiben offen.

[Seitenkommunikation](page-communication.md) und `config/page-explainers.json`
führen die Sprecherentwürfe; `config/presenter-system.json` führt Nutzerwege und
unveränderte Stimmreferenzen. Die KI-Sprecher sind als solche gekennzeichnet.
Es wird keine WCAG-/DIN-/ISO-Zertifizierung aus einer Bibliothek oder einem
passiven Snapshot abgeleitet.

Andere ChatGPT-Chats sind hier nicht über eine Kontohistorien-API zugänglich.
Die geprüften lokalen Codex-/Claude-Historyquellen fehlen oder sind nicht lesbar;
verweigerter Zugriff bedeutet unbekannten Inhalt. Es wurde kein vollständiges
Chatarchiv importiert. Die tatsächlich verfügbaren Projektdateien und das neue
Konzept sind berücksichtigt; weitere Exporte können später nach Projekt/Tenant,
Quelle, Hash, Datenklasse und Redigierung aufgenommen werden. Ein pausiertes
Kundenprojekt wird auch durch Gesprächsimporte nicht zum Agenturmodul.
