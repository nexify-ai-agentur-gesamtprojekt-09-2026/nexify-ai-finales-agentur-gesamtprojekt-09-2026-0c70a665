# Aktualität paralleler Keywordimporte

`import_keywords` beginnt innerhalb seines SQLite-Transaktionskontexts mit
`BEGIN IMMEDIATE`. Somit werden Aktualitätsprüfung, Gleichstandsprüfung und
sämtliche Zeilenänderungen unter derselben exklusiven Schreibreservierung
serialisiert. Ein älterer Beobachtungszeitpunkt überschreibt keinen neueren;
widersprüchliche identische Zeitpunkte benötigen Review. Fehler rollen den
vollständigen Import zurück, die Verbindung bleibt anschließend nutzbar.

Prüfung: `python3 -m unittest discover -s tests -p test_seo_catalog.py -q`.
10 lokale Tests, einschließlich kontrolliertem Zwei-Writer-Rennen und
fehlerhafter zweiter CSV-Zeile. Das Rennen schlägt vor der Korrektur reproduzierbar
fehl. Große Importe halten die Schreibreservierung entsprechend länger;
Locktimeouts sind Fehler, kein Teilerfolg. Keine öffentliche SEO-Publikation.
