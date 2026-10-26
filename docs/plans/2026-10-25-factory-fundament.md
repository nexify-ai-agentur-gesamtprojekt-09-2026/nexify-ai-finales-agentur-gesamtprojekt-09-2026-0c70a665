# Sprint-Contract: Factory-Fundament

## Auftrag und Ziel

Nutzerfreigabe vom 25.10.2026: sofortige Gesamtfertigstellung als aktives Ziel.
Der wiederverwendbare Gesamtauftrag und seine offenen Abhaengigkeiten stehen in
`/workspace/.onboarding/FACTORY-AUFTRAG.json` und im dortigen Gesamtkonzept.

Dieses Inkrement stellt die belastbare Entwicklungsbasis her: funktionsfaehiger
Audit, unveraendertes Referenzmanifest, sichere lokale Vorschau, isolierte
Gesundheitspruefung und anschliessend ein neuer lokaler PostgreSQL/RLS-Baustein.
Der DB-Baustein ist keine Wiederherstellung der fehlenden historischen Migrationen
und keine abschliessende Freigabe der vorgeschlagenen Produktivarchitektur.

## Nachweis und Rollen

- Umsetzung: Hauptagent, Audit-/Preview-/Datenfundament als abgegrenzte Teilauftraege.
- Ergaenzende Umsetzung: getrennte Agenten fuer Bestandsportal und Inventar.
- Gegenpruefung und Tiefenpruefung: getrennte lesende Rollen pro Aenderung.
- Nachweise: `make check && make test`, `make check-arch`, `make clean-check`;
  reale HTTP- und separate echte DB-Pruefungen fuer den jeweiligen Umfang.
- Neues Feature F-005 (lokales Daten-/Mandantenfundament) wurde ausschliesslich
  ueber `make verify-feature F=F-005` nach echten DB-Gegenproben technisch als
  passing protokolliert. Dies ist keine Produktiv- oder Betreiberabnahme.
  Bestehende Baseline-Pruefungen F-001 bis F-004 werden separat verifiziert.

## Grenzen und Rueckweg

Keine produktiven DNS-/Firewall-/Zahlungs-/Loeschaktionen. Preise und Rechtstexte
bleiben unveraendert. Kein Commit/Merge auf main ohne vorgesehenes Reviewer-Gate.
Die Produktionsfreigabe, B.V.-Identitaet und Fachentscheidungen bleiben gesonderte
Nachweise. Lokale Container verwenden isolierte Entwicklungs-/Testdaten.

Rueckweg: lokale Aenderungen bleiben auf einem Entwicklungsbranch pruefbar;
manifestgeschuetzte Referenz kann ueber ihren Originalblob verifiziert werden.
Datenfundament nur in neuer lokaler Datenbank pruefen; keine fremden Schemata
oder Bestandsdaten durch Setup-/Testkommandos loeschen.

## Abbruch und Wiederaufnahme

Bei fehlenden externen Voraussetzungen unabhaengige Arbeit fortsetzen und genaue
Blocker sichern. Keine Endlosschleife oder kuenstliche Aktivitaet als Fortschritt
ausgeben. Eine laufende Sitzung ist kein garantierter Hintergrundscheduler.

## Verifikationsprotokoll

Der Harness zeichnet active -> passing erst nach erfolgreichen, nichtleeren
Prueflayern auf. Jeder Layer laeuft in eigener Bash mit errexit/pipefail und
isoliertem Arbeitsverzeichnis. Verifier halten einen gemeinsamen exklusiven
flock bis zum Nachweis-Write; andere Werkzeuge, die feature_list.json schreiben,
muessen dieses Lockprotokoll ebenfalls beachten. Ein externer Editor, der den
advisory Lock ignoriert, ist damit nicht universell per Dateisystem-CAS gesperrt.
Vor dem atomaren Rename wird die gelesene Dateifassung nochmals verglichen.
Geaenderte Definitionen oder gescheiterte Layer erhalten keinen neuen Nachweis.
Die echten Subprozessfixtures pruefen auch Fehlerketten, Pipelines, cd-Layer,
leere Definitionen und konkurrierende Verifier. Der Harness kann fuer beliebige
Shellbefehle keine fachliche Mindestzahl von Assertions erkennen; die jeweiligen
Fachrunner muessen ihre tatsaechlich ausgefuehrten Pruefungen selbst belegen.
