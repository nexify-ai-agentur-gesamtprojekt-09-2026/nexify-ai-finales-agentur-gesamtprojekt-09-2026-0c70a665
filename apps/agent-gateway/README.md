# Lokaler Visitor-Gateway

Dieses eigenständige Entwicklungsfundament stellt echte lokale Besucheraktionen bereit. Es ist keine bestehende Factory-`/v1`-API, keine PostgreSQL-RLS-/SSO-Implementierung und kein produktiv freigegebener Internetdienst. Es verwendet ausschließlich die Python-Standardbibliothek und eine eigene SQLite-Datei außerhalb der Referenzen.

```sh
python3 apps/agent-gateway/server.py \
  --database /workspace/.onboarding/native-chat-preview/visitors.sqlite \
  --port 3003 --web-origin http://127.0.0.1:3004
```

`--seed-local-planning-proposals` legt ausdrücklich **lokale Planungsvorschläge** für Werktage an. Diese sind keine nachgewiesenen freien Kalenderzeiten von Pascal oder anderen Personen. Ohne diese explizite Vorschauoption werden keine freien Termine behauptet. Eine Anfrage hält den ausgewählten lokalen Vorschlag atomar fest; `confirmed=false` bleibt sichtbar. Es wird kein externes Kalenderereignis erzeugt.

| Operation | Nachgewiesene lokale Funktion |
|---|---|
| `GET /api/session` | anonyme cookiegebundene Sitzung, CSRF-Nachweis und eigener Verlauf |
| `POST /api/chat` | strukturierte Auswahl der Angebots-, Termin- und Marketingwege; kein vorgetäuschter LLM-Aufruf |
| `POST /api/quotes` | gespeicherter nicht verbindlicher Angebotsentwurf |
| `GET /api/quotes/{id}/pdf` | echte PDF-Datei mit Entwurfs-/Preisfreigabekennzeichnung, nur für den Eigentümer |
| `POST /api/quotes/{id}/send` | nach konkreter Empfängerbestätigung eine idempotente Versandabsicht, weiterhin `pending_provider`, `sent=false` |
| `GET /api/slots` und `POST /api/bookings` | eigene lokale Vorplanung, atomare Vergabe, wiederholbarer Anfragebeleg |
| `POST /api/marketing` | persistiertes strukturiertes Briefing, keine KI-/Publikationsbehauptung |

Writes erfordern aktuelle Sitzung, exakt zugelassene Host-/Originbindung, sitzungsgebundenen CSRF-Header und `Idempotency-Key`. Gleicher Schlüssel mit anderem Inhalt erzeugt 409; fremde Dokumente erzeugen 404. Unbekannte mitgelieferte Credentials werden nicht zum Gastzugriff heruntergestuft. Es gibt keine frei aufrufbare Shell-/Provider-/MCP-Ausführungsbrücke. Die öffentliche Seitenkonfiguration liefert keine Rechte.

Die lokale Cookieverbindung ist ausdrücklich HTTP/Loopback. Die Produktivintegration benötigt TLS/Secure-Cookies, eigene Auth-/Mandantenbindung, angemessene Missbrauchs- und Ratenbegrenzung, echte Kalender-/Mailadapter, Audit/Retention/Export und nachgewiesene Backup-/Restoregrenzen. Das technische Ablaufen der anonymen Sitzung nach einem Tag ist keine beschlossene Aufbewahrungsfrist der Inhalte. Es werden keine geschäftlichen Aufbewahrungsfristen erfunden und keine bestehenden Daten gelöscht.

```sh
python3 -m unittest discover -s tests -p test_native_chat.py -q
```

Die Tests verwenden eigene temporäre Datenbanken und tatsächliche lokale HTTP-Verbindungen, einschließlich Cookie/CSRF/Origin, Eigentümergegenprobe, Replay/Payloadkonflikt, konkurrierender Slotvergabe, persistierter Historie und realer PDF-Struktur. Kein Test sendet Nachrichten oder kontaktiert Zahlungs-/Modell-/Kalenderanbieter.
