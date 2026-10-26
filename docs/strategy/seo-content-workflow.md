# Recherche und Messung vor SEO-Inhalten

Der lokale Katalog ist das Fundament für recherchierte Themen und Ortskandidaten. Er erzeugt keine Website, veröffentlicht nichts und weist keine tatsächliche Geschäftstätigkeit in einem Land oder Ort nach. Die Länderliste DE, AT, CH, NL und BE ist der genannte Untersuchungsraum. Ein Eintrag in diesem Katalog ist keine geprüfte Marktfreigabe.

`config/seo-workflow.json` hält Ablauf, Zuständigkeiten und Grenzen fest. Das bestehende Betriebsmodell und seine Freigaben gelten weiter. Die Small-Business-Zuordnung wurde geprüft; `smb-router` und `seo-ai-visibility` sowie die zuvor geladene Inhaltsstrategie dienen als Arbeitsanleitung. Daraus wurden keine Unternehmensfakten, Suchvolumina oder installierten Connectoren abgeleitet.

## Was jetzt implementiert ist

`tools/seo_catalog.py` verwendet ausschließlich die Python-Standardbibliothek und lokales SQLite. Der Standardpfad ist `.local/seo/catalog.sqlite3`. Zulässig sind ausschließlich `.sqlite3`-Dateien unter der `.local`-Struktur des aktuellen Repository-Arbeitsverzeichnisses. Symlinks und Pfadfluchten werden abgelehnt; die Datenbankdatei erhält Berechtigungen `0600`. Die lokalen Dateien überstehen Neustarts des CLI-Prozesses. Ein Erhalt nach Austausch der gesamten Cloud-Umgebung oder ein produktives Backup wird dadurch nicht zugesichert.

Geografische Quellen, Orte, Aliasse und Seitenentwürfe sind ein öffentlicher Sachkatalog ohne Kundendaten. Keywordmessungen sind durch `tenant` und `project` getrennt; jede Import-, Report- und Planoperation verlangt beide Kennungen. Die CLI ist für vertrauenswürdige lokale Betreiber bestimmt. Die Kennungen sind keine Authentifizierung und ersetzen keinen geschützten Mehrkunden-API-Dienst oder serverseitig geprüfte Mitgliedschaft. `scan` zeigt keine Keyworddaten anderer Scopes.

Es wurde mit dieser Änderung kein echter Ortsdump und keine geschäftliche Keywordmessung importiert. Testdaten sind ausschließlich synthetische Fixtures in temporären Datenbanken. Es gibt weder einen angeschlossenen Google-Ads-Account noch einen belegten accountfreien Anbieter präziser monatlicher Suchzahlen.

## Ortsdaten importieren

GeoNames-Länderdumps sind eine mögliche offene Quelle für Ortskandidaten. Sie stehen laut Quellenvertrag unter CC BY 4.0; die tatsächliche Quelle, Lizenz und Version sind für jede Eingabedatei zu prüfen. GeoNames ist **kein vollständiges amtliches Register aller rechtlich anerkannten Städte oder Gemeinden**. Eine Aussage „alle Städte“ setzt die zusätzliche Prüfung geeigneter amtlicher Landes-/Regionalregister, ihrer Definitionen, Aktualität und Lizenz voraus. Der Importer nimmt diese Prüfung nicht vor.

Die lokale UTF-8-Datei muss die standardmäßigen 19 tabulatorgetrennten GeoNames-Felder enthalten, auch wenn Felder leer sind:

1. geonameid
2. name
3. asciiname
4. alternatenames, durch Komma getrennt
5. latitude
6. longitude
7. feature class
8. feature code
9. country code
10. cc2
11. admin1 code
12. admin2 code
13. admin3 code
14. admin4 code
15. population
16. elevation
17. dem
18. timezone
19. modification date

Beispiel eines lokalen Importaufrufs nach separat autorisiertem Bezug einer Originaldatei:

```bash
python3 tools/seo_catalog.py scan
python3 tools/seo_catalog.py import-cities \
  --input /workspace/inputs/DE.tsv --country DE \
  --source https://download.geonames.org/export/dump/DE.zip \
  --license 'CC BY 4.0' --version '<actual-source-version>'
python3 tools/seo_catalog.py scan
```

Die CLI lädt nichts herunter und entpackt keine Archive. Die Eingabe ist eine bereits lokal vorliegende `.tsv`-Datei, kein URL- oder ZIP-Argument. Der Import prüft 19 Felder und verarbeitet ausschließlich das gewählte Kandidatenland sowie Featureklasse `P` mit den expliziten Codes `PPL`, `PPLA`, `PPLA2`, `PPLA3`, `PPLA4`, `PPLA5`, `PPLC`, `PPLF`, `PPLG`, `PPLL`, `PPLR`, `PPLS`, `PPLX`. Historische, aufgegebene und zerstörte Orte (`PPLH`, `PPLQ`, `PPLW`) werden nicht übernommen. Andere Länder und nicht ausgewählte Featurecodes werden übersprungen. Untergeordnete Siedlungs- und Ortsteilcodes sind ausdrücklich Kandidaten; der Literalstatus bleibt `populated_place_not_verified_official_city`.

Koordinaten werden auf endliche geografische Grenzen geprüft. Das ist keine amtliche Ländergrenzen- oder Gemeindestatusprüfung. Die Identität ist Land plus GeoNames-ID; die kanonische Form enthält Land, lesbaren Namen und ID. Gleichnamige Orte bleiben getrennt, Aliasse erzeugen keine zusätzlichen Seiten. Bereits vergebene Slugs werden bei späterer Namensänderung nicht still neu vergeben. Quellenreferenz, Lizenz, Version und SHA-256 werden gespeichert. Die Quellenprüfung und sämtliche Ortsänderungen laufen gemeinsam unter einer SQLite-Schreibreservierung (`BEGIN IMMEDIATE`). Konkurrenzimporte können dieselbe Quellenversion dadurch nicht mit unterschiedlichen Bytes übernehmen. Identische bereits vollständig importierte Versionen sind reine Readbacks (`source_already_imported_readback`): Sie verändern weder Anzahl noch aktuelle Ortsdaten, auch wenn zwischenzeitlich eine andere Version importiert wurde. Im Readback bezeichnet `included_records` die gespeicherten eindeutigen Ortsverknüpfungen; `skipped_records` ist ohne neu ausgeführte Verarbeitung `null`. Andere Bytes oder Lizenz unter derselben Quelle/Land/Version werden abgelehnt. Neue Versionen bleiben separat nachvollziehbar. Ein neuer Dump löscht keine früheren Orte automatisch.

Jeder übernommene Ort erhält genau einen eigenen `landing_page_draft` mit `draft`, `noindex,nofollow`, `published=false`, `service_coverage_verified=false` und ohne Büroanschrift. Das ist ein Recherchebrief mit offenen Nachweisen und noch kein generierter Seitentext. Das CLI bietet keine Möglichkeit, diese Schutzwerte zu aktivieren. Eine lokale spätere Briefredaktion müsste zuerst tatsächliche Leistungserbringung und eigenständigen Nutzen für Besucher belegen. Austauschbare Stadt-Keyword-Kopien, erfundene Standorte und massenhaft veröffentlichte Doorways sind kein Ergebnis dieses Imports.

## Keywordmessungen importieren

Die UTF-8-CSV-Datei benötigt die Kopfspalten:

```text
keyword,country,language,period,monthly_volume,source,source_observed_at,metric_quality
```

Optionale Spalten:

```text
cluster,keyword_role,main_keyword,intent,evidence
```

`country` ist eines der Kandidatenländer. `language` ist ein expliziter Sprachcode wie `de`, `nl` oder `fr`; Varianten wie `de-at` sind möglich. `period` ist genau ein Monat als `YYYY-MM`. `source_observed_at` ist ein nicht zukünftiger ISO-8601-Zeitstempel mit Zeitzone. Für `measured_estimate` muss der ganze Messmonat vor dem Beobachtungszeitpunkt abgeschlossen sein. Das ist keine Behauptung, dass bereits für jeden vergangenen Monat Daten verfügbar sind.

Die Qualitätsklassen sind:

| Klasse | Import | Finales Top-Ten-Ranking |
| --- | --- | --- |
| `measured_estimate` | Nichtnegative ganze Monatszahl oder leeres Feld; geschätzte Quellmessung, keine exakte Zählung | Nur mit tatsächlicher Zahl und vollständiger Vergleichsgruppe |
| `range` | Originalbereich wie `100-1000` wird als Rohwert erhalten, nicht zur Punktschätzung umgerechnet | Gesperrt |
| `unavailable` | Volumenfeld bleibt leer | Gesperrt |

Ein fehlendes Volumen bleibt SQL `NULL`; es wird niemals als null Suchanfragen interpretiert. Eine tatsächlich berichtete `0` ist davon unterscheidbar. Google-Ads-Metriken sind näherungsweise Messwerte; auch einzelne historische Monatswerte dürfen nicht als exakte Suchanzahl verkauft werden. Zugang, Länder-/Sprach-/Suchnetzwerkseinstellungen, Zeitraum und Exportdefinition sind im Herkunftsnachweis zu prüfen. Durchschnittswerte über mehrere Monate dürfen nicht durch bloßes Umbenennen als Messung eines konkreten Monats importiert werden. Die CLI kann die Wahrheit einer externen Exportbehauptung nicht selbst bestätigen.

`keyword_role` ist `main`, `secondary` oder `unassigned`. Nebenkeywords benötigen `main_keyword`; diese Beziehung muss im selben Messkohort zu einem Hauptkeyword auflösbar sein. `cluster` und `intent` müssen vor der Strategie konkret bestimmt werden. Nicht ausgefüllte Werte bleiben offen beziehungsweise `unclassified`; es werden keine Nebenbegriffe oder Absichten erfunden. Ein Quellenverweis kann in `evidence` auf den separaten geprüften Messbeleg zeigen.

```bash
python3 tools/seo_catalog.py import-keywords \
  --input /workspace/inputs/keywords.csv --tenant nexify --project agency-content
python3 tools/seo_catalog.py report --tenant nexify --project agency-content
python3 tools/seo_catalog.py plan \
  --tenant nexify --project agency-content --country DE --language de \
  --period 2026-09 --source '<same-public-measurement-source-id>'
```

Die Monats- und Quellenwerte im Befehl sind Formatbeispiele, kein Nachweis verfügbarer Messdaten. Die Messquellenkennung muss eine gleichartige Exportdefinition einschließlich relevanter Einstellungen bezeichnen; bloß dieselbe Anbieter-Homepage reicht bei abweichenden Messmethoden nicht aus. Für andere Länder, Sprachen oder Methoden wird separat geplant. Ein Markt mit überwiegend deutschen Interessenten wird nicht mit niederländischen oder weltweiten Werten vermischt.

Identität und Eindeutigkeit eines Messdatensatzes enthalten Tenant, Projekt, normalisierten Begriff, Land, Sprache, Monat und Quelle. Identischer Import ist stabil. Eine neuere Beobachtung kann den Messstand mit ihrem Eingangshash aktualisieren; eine ältere darf ihn nicht überschreiben. Widersprüchliche Werte mit identischem Zeitpunkt werden zurückgewiesen und müssen fachlich geklärt werden. Wiederholbare Ausgaben sind nach stabilen IDs sortiert.

Quellen dürfen keine Zugangsdaten enthalten. Bei HTTP(S)-Referenzen werden Benutzername/Passwort, sämtliche Queryparameter und Fragmente vor Speicherung und Ausgabe entfernt; bekannte Schlüsselpräfixe im Pfad werden redigiert. Das ist keine vollständige Geheimniserkennung für beliebige Texte. Öffentliche, schlüsselfreie Quellenkennungen verwenden und keine vertraulichen oder Kundendaten enthaltenden Exporte einlesen. Fehlerausgaben wiederholen weder Eingabezeilen noch URLs oder Geheimnisse.

## Von Messung zur Seite

1. **Recherche:** D04 sammelt belastbare Quellen, tatsächliches Angebot, Kundennutzen und Fragen je Markt/Sprache.
2. **Messung:** D04 mit D02 prüft Originalbelege, Qualitätsklasse und Vergleichbarkeit. Ein finales Top-Ten-Ergebnis verlangt mindestens zehn explizite Hauptkeywords im gleichen Tenant/Projekt/Land/Sprach-/Monats-/Quellkohort. Fehlende Zahlen, Bereiche, `unavailable`, ungeklärte Cluster/Intents oder nicht auflösbare Nebenbeziehungen blockieren das Ergebnis.
3. **Intent und Cluster:** Hauptbegriffe und zugehörige Nebenbegriffe werden auf konkrete Informations-, Vergleichs- oder Kontaktziele zugeordnet. Die Rangfolge allein ersetzt diese Entscheidung nicht.
4. **Strategie:** D02 und D04 prüfen die gemessenen zehn stärksten Hauptbegriffe gegen Angebot, Nachweis und tatsächliche Marktabdeckung. `measurement_ready_for_strategy_review` heißt ausschließlich bereit für diesen Review.
5. **Seitenbrief:** D04 und der fachliche Owner legen Zweck, Inhalte, eigenständigen lokalen Nutzen, Quellen und nächstes Ziel fest. Ein Ortsdatensatz erzeugt noch keinen Grund für eine öffentlich indexierte Landingpage.
6. **Text:** Erst nach freigegebenem Brief entstehen kundenverständliche Inhalte mit belegten Aussagen und identischem fachlichem Umfang der benötigten Sprachen. Preis-/Rechtsentscheidungen bleiben bei ihrer bisherigen Autorität.
7. **Qualität:** D07 prüft Quellen, Fakten, Sprache, nützliche Unterscheidbarkeit, Verlinkung und die übrigen bestehenden Qualitätsnachweise.
8. **Veröffentlichung:** Nur der autorisierte Releaseprozess mit seinen vorhandenen konkreten Freigaben veröffentlicht. Das Katalogtool hat weder Publish- noch Credential-/Deploymentfunktionen; seine Planantwort enthält stets `copy_generation_authorized=false` und `publication_authorized=false`.

GEO im Sinn von Generative Engine Optimization ist von geografischer Ortsrecherche zu unterscheiden. Es bleibt ein späterer, gesonderter Arbeitsschritt im Betriebsmodell. Diese Änderung startet weder eine Kampagne noch eine GEO-Optimierung und verspricht keine Rankings, Trafficzahlen, Zitate oder fehlerfreie Ergebnisse.

## Prüfung und Quellenstand

Acht gezielte Tests decken stabile Replays und Neustart, gleichnamige Orte und private Drafts, ungültige Koordinaten und atomaren Rollback, unveränderliche Quellenversionen und sichere Pfade, Tenant-/Projekttrennung, URL-Redaktion, NULL gegenüber echter Null, ungeeignete Metriken, vergleichbare Top-Ten-Auswahl und widersprüchliche Beobachtungen/Nebenbeziehungen sowie zwei echte konkurrierende SQLite-Verbindungen und historischen Quellen-Replay ohne Zurückrollen aktueller Ortsdaten ab:

```bash
python3 -m unittest tests/test_seo_catalog.py
```

Offizielle Recherchequellen für die fachliche Prüfung sind `https://www.geonames.org/export/`, `https://download.geonames.org/export/dump/readme.txt` und `https://developers.google.com/google-ads/api/docs/keyword-planning/generate-historical-metrics`. Die parallel durchgeführte Quellenrecherche wird getrennt nachgewiesen; diese technische Dokumentation behauptet keinen authentifizierten Abruf von Keywordvolumina. Ein vollständiges amtliches Städteverzeichnis für die fünf Länder und zehn echte gemessene Hauptkeywords mit Nebenbegriffen bleiben ohne die zugehörigen Originaldaten kontrolliert offen.
