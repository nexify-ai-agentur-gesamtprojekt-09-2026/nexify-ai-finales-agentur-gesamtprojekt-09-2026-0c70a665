# Lokaler Selbsttest des Gesundheitsmonitors

`make check` darf keine Produktions-DNS-Aenderung, fremde Hostkonfiguration oder
Zustellung an einen Wissensdienst ausloesen. Deshalb prueft
`tools/gesundheit-selbsttest.sh` jetzt den gemeinsamen Monitorkern
`tools/gesundheit-kern.mjs` mit einem echten lokalen HTTP-Server und isolierten
Host-Probeantworten. Der Live-Runner `tools/gesundheit.mjs` verwendet denselben
Kern fuer Dienststatus und Ausfallentscheidung.

Die zehn Tests pruefen HTTP/Redirect/Ausfall, persistierten Status,
Check-Untergrenze, systemd-/Containerstatus, begrenzte Transportwiederholung,
fehlgeschlagene Statuspersistenz sowie Spezialnamen/ungueltige Erwartungswerte
und Ressourcengrenzen. Die Exit-Codes und Ausfalllisten werden tatsaechlich
ausgewertet. Das ist kein Test der produktiven DNS-/Host-/Alarmkette.

Der Live-Runner enthaelt weiterhin hostgebundene Proben und eine interne Wissensmeldung und wird
durch `make check` nicht gestartet. Vor einem gesondert autorisierten Einsatz
muessen Betreiberkontext, Cloudflare-/Hostzugriffe und Auswirkungen geprueft
werden. Ein gruener lokaler Selbsttest ersetzt keinen Live-Health-Nachweis.

Die bisher undefinierten Ressourcenschwellen sind nun explizit konfigurierbar:

| Variable | Standard | Bedeutung |
|---|---:|---|
| GESUNDHEIT_DISK_MAX_PROZENT | 90 | maximal belegter Plattenanteil |
| GESUNDHEIT_SPEICHER_MIN_PROZENT | 5 | minimal freier Speicheranteil |
| GESUNDHEIT_LAST_FAKTOR | 2 | Faktor fuer 1-Minuten-Last je CPU |

Leere, nicht numerische und unzulaessige Werte werden abgewiesen. Fehlende oder
ungueltige Ressourcenmessungen sind rot; Exceptions duerfen die Pruefung nicht
mehr unbemerkt entfernen. Ein fehlgeschlagener Statusdatei-Write liefert ebenfalls
einen Fehlerstatus. Diese Standardwerte sind lokale technische Betriebsgrenzen,
keine SLA-, Preis- oder Produktivfreigabe.

Die DNS-Diagnose des Live-Runners ist jetzt ausschliesslich lesend. Sie verlangt
Zone, exakten Recordnamen, A-Adresse und DNS-only-Modus; unbekannter Zugriff oder
Abweichung ergibt einen roten Monitorbefund. Der Monitor enthaelt keine DNS-
Schreibschnittstelle mehr. Die bisherige automatische Reparatur widersprach der
konkreten Live-DNS-Freigabepflicht; eine Korrektur gehoert in einen gesondert
freigegebenen Betriebsauftrag. Die historische Solladresse bleibt unveraendert
und muss vor produktiver Nutzung durch den Betreiber bestaetigt werden.
