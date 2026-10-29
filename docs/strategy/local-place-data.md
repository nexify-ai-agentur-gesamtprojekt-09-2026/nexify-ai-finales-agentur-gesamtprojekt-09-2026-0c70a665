# Lokaler Ortsdatenbestand

Am 26.10.2026 wurden die fünf GeoNames-Länderdumps tatsächlich heruntergeladen,
per SHA256 gebunden und mit `tools/seo_catalog.py import-cities` in
`.local/seo/catalog.sqlite3` aufgenommen. Das ist eine lokale Arbeitsdatenbank,
keine Produktionsmigration oder Veröffentlichung. Quellen, Lizenz, Hashes und
Importzahlen stehen in `config/research/local-place-import-evidence.json`.

136.883 Datensätze sind gefilterte besiedelte Orte/Ortsteile aus DE, AT, CH, NL
und BE, nicht 136.883 amtliche Städte und kein Nachweis unserer Geschäftsabdeckung.
Jeder lokale Seiteneintrag ist Entwurf, noindex und hat unbestätigte Abdeckung.
Es wurden keine Keywordmessungen importiert und keine Ortsseiten veröffentlicht.

GeoNames: https://www.geonames.org/ — CC BY 4.0:
https://creativecommons.org/licenses/by/4.0/. Die Auswahl besiedelter Orte und
lokale Entwurfsdatensätze sind abgeleitete Verarbeitung durch NeXify. Bei einer
späteren Übernahme diese Attribution erhalten; amtliche Quellen und Änderungen
gesondert kennzeichnen. Rohdumps und SQLite werden nicht ins Frontend gebündelt.

Zur Wiederholung einen entsprechenden öffentlichen Länderdump herunterladen,
Hash gegen den Beleg prüfen und den expliziten Länder-/Quellen-/Lizenz-/Versions-
vertrag des Importers verwenden. Aktuelle Dumps können von den gebundenen
Snapshots abweichen: dann neue Version erfassen, keinen alten Hash überschreiben.
Vor Textproduktion gilt weiterhin die vergleichbare Keyword-Messkohorte; vor
Indexierung zusätzlich reale Leistung/Abdeckung, eigenständiger Ortsnutzen,
fachlicher Review und technische SEO-Abnahme. Keine massenweisen austauschbaren
Ortsseiten als Ersatz für diese Voraussetzungen.
