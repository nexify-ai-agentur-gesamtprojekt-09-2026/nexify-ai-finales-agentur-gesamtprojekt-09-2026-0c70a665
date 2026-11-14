# Chat-Daten: Migrationsentwurf 0004 · 14.11.2026

**Status: Entwurf. Nicht eingespielt, nicht freigegeben.** Dieses Dokument ist keine Rechtsberatung. Rechtsgrundlage, Fristen und Einwilligungstext entscheidet der Inhaber bzw. die Rechtsberatung.

## Worum es geht

IST (Quelle: `apps/web/supabase/migrations/0001`–`0003`, gelesen am 14.11.2026): Chat-Verläufe liegen im Schema `chat` ohne Mandantenspalte, ohne Löschfrist und ohne Kennzeichen für Rechtsgrundlage oder Einwilligung. Zugriff hat nur der Server.

SOLL: Chat-Inhalte sollen künftig in den zentralen Wissensspeicher aufgenommen werden dürfen. Dafür braucht jedes Gespräch einen Mandanten, eine festgestellte Rechtsgrundlage, eine Löschfrist und eine ausdrückliche Freigabe.

Der Entwurf schafft nur diese Datenbasis. Er nimmt nichts in den Wissensspeicher auf und ändert keine Route der Anwendung.

## Dateien

| Datei | Inhalt |
|---|---|
| `apps/web/supabase/migrations/0004_entwurf_chat_mandant_einwilligung_loeschfrist.sql` | Entwurf der Migration |
| `apps/web/supabase/rollback/0004_entwurf_chat_mandant_einwilligung_loeschfrist.down.sql` | Rückweg |
| `apps/web/supabase/tests/entwurf_0004_mandant_einwilligung_loeschfrist.sql` | Prüfung der Regeln, Rechte, des Löschlaufs, der Auskunft und des Rückwegs |
| `apps/web/supabase/tests/entwurf_0004_freigabeschutz.sql` | Prüfung, dass der Entwurf ohne Freigabe abbricht |
| `apps/web/supabase/tests/entwurf_0004_wegwerf_cluster.sh` | Führt alle Prüfungen in einem Wegwerf-Cluster aus |

Zwei Schutzmaßnahmen gegen versehentliches Einspielen: Die Migration bricht ab, solange die Sitzung die Freigabe nicht ausdrücklich setzt. Der Rückweg liegt bewusst außerhalb von `migrations/`, damit ihn kein Werkzeug als nächste Migration ausführt.

## Datenfluss

1. **Gespräch entsteht.** Der Server legt es an. Mandant, Rechtsgrundlage und Freigabe sind leer bzw. „nein“. Eine Frist wird nur gesetzt, wenn ein Standardwert festgelegt ist. Im Entwurf ist er leer.
2. **Mandant.** Der Server ordnet das Gespräch einem Mandanten zu (`chat.assign_conversation_mandant`). Die Zuordnung ist danach unveränderlich und wird protokolliert. Altgespräche bleiben ohne Mandant, bis sie einzeln nachgezogen werden. Ohne Mandant sieht sie kein Mandant.
3. **Rechtsgrundlage und Einwilligung.** Der Server vermerkt die Rechtsgrundlage mit Zeitpunkt. Eine Einwilligung wird je Zweck (Chat-Verarbeitung, Wissensspeicher) mit Zeitpunkt und Textfassung gespeichert. Textfassungen sind nur anfügbar, nicht änderbar.
4. **Freigabe für den Wissensspeicher.** Standard ist „nein“. Die Freigabe verlangt Mandant, Rechtsgrundlage und vorhandenen Inhalt. Stützt sich das Gespräch auf Einwilligung, muss eine nicht widerrufene Einwilligung für den Wissensspeicher vorliegen. Der Wissensspeicher darf später nur die Sicht `chat.chat_knowledge_candidates` lesen.
5. **Widerruf.** Der Widerruf nimmt die Freigabe sofort zurück. Was bereits im Wissensspeicher liegt, muss dort entfernt werden. Diesen Weg gibt es noch nicht (offen).
6. **Auskunft.** `chat.export_visitor_data` liefert alle Gespräche eines Besuchers, `chat.export_mandant_data` alle Gespräche eines Mandanten, jeweils mit Nachrichten, Einwilligungen, Angeboten und Bestellungen. Interne Systemnachrichten und der Sitzungsschlüssel werden nicht ausgegeben.
7. **Löschlauf.** `chat.run_retention_erasure` löscht die Nachrichten aller Gespräche, deren Frist abgelaufen ist, und entfernt den Besucherbezug. Standard ist ein Probelauf, der nur zählt. Das Protokoll enthält ausschließlich Zähler und Zeiten. Gespräche ohne Frist oder mit Löschsperre bleiben unberührt.
8. **Was stehen bleibt.** Die Gesprächszeile wird archiviert, nicht gelöscht, weil Angebote und Bestellungen daran hängen. Angebote, Bestellungen und Einwilligungsnachweise löscht der Lauf nicht.

Mandanten lesen nur Eigenes: Angemeldete Nutzer sehen Gespräche und Nachrichten ihres Mandanten, ohne Systemnachrichten, Sitzungsschlüssel, Besucherbezug und Modellangabe. Schreiben und alle Funktionen bleiben beim Server. Nicht angemeldete Besucher erhalten weiterhin nichts.

## Offen (Entscheidung nötig)

| Nr. | Punkt | Wer |
|---|---|---|
| O1 | Rechtsgrundlage für die Chat-Verarbeitung und, getrennt davon, für die Aufnahme in den Wissensspeicher | Inhaber + Recht |
| O2 | Löschfristen: Standardwert, Fristbeginn für Altgespräche, abweichende Fristen je Mandant | Inhaber + Recht |
| O3 | Wortlaut der Einwilligung je Sprache und Zweck; wo und wann sie eingeholt wird | Inhaber + Recht |
| O4 | Anpassung der Datenschutzerklärung (Zwecke, Speicherdauer, Wissensspeicher, Empfänger) | Inhaber + Recht |
| O5 | Folgen des Widerrufs: nur Freigabe zurück oder sofortige Löschung | Recht |
| O6 | Personenbezug in Angeboten und Bestellungen (Titel, Zusammenfassung, Kundendaten): Aufbewahrungspflicht gegen Löschpflicht | Recht + Steuerberatung |
| O7 | Mandantenstamm: In welcher Datenbank liegt die Mandantentabelle? Der Entwurf hat deshalb keinen Fremdschlüssel | Technik |
| O8 | Wer setzt `app.mandant_id`? Der Lesezugriff für Mandanten ist nur sicher, wenn ausschließlich der Server diesen Wert aus einer geprüften Anmeldung setzt. Bis zum Nachweis den Lesezugriff nicht freigeben | Technik |
| O9 | Entfernen bereits aufgenommener Inhalte aus dem Wissensspeicher bei Widerruf, Löschung oder Fristablauf | Technik |
| O10 | Wer startet den Löschlauf regelmäßig, wer prüft das Protokoll? Ein Zeitplan existiert nicht | Betrieb |
| O11 | Version der Ziel-Datenbank. Der Entwurf verlangt PostgreSQL 15 oder neuer | Betrieb |
| O12 | Auftragsverarbeitung und Verzeichnis der Verarbeitungstätigkeiten für den Wissensspeicher | Recht |

## Reihenfolge der Einführung

1. O1 bis O6 entscheiden und schriftlich festhalten.
2. Datenschutzerklärung und Einwilligungstexte freigeben; Textfassungen eintragen.
3. O7, O8 und O11 technisch klären und nachweisen.
4. Sicherung der Ziel-Datenbank erstellen und die Wiederherstellung prüfen.
5. Alle Tests unten gegen eine Kopie der Ziel-Datenbank ausführen.
6. Migration in einer Transaktion einspielen. Der Standardwert der Frist bleibt zunächst leer.
7. Anwendung anbinden: Mandant, Rechtsgrundlage und Einwilligung beim Anlegen setzen.
8. Altbestand je Gespräch nachziehen oder nach Entscheidung löschen.
9. Standardfrist setzen. Löschlauf zuerst als Probelauf, Zähler prüfen, dann scharf.
10. Erst danach den Wissensspeicher anbinden, zusammen mit dem Entfernen (O9).

## Tests vor dem Einspielen

- `bash apps/web/supabase/tests/entwurf_0004_wegwerf_cluster.sh` läuft vollständig durch.
- Dieselben Prüfungen gegen eine Kopie der echten Ziel-Datenbank mit ihren echten Rollen.
- Zugriff über die echte Schnittstelle (PostgREST) mit echten Anmeldungen zweier Mandanten: jeder sieht nur Eigenes; ohne Anmeldung nichts.
- Nachweis zu O8: Ein Nutzer kann `app.mandant_id` nicht selbst setzen.
- Probelauf des Löschlaufs auf einer Kopie mit echten Mengen: Zähler stimmen, Laufzeit vertretbar.
- Auskunft für einen Besucher und einen Mandanten auf Vollständigkeit prüfen.
- Rückweg auf der Kopie: verweigert mit vorhandenen Nachweisen, läuft nach Sicherung und Bestätigung durch.
- Wiederherstellung aus der Sicherung nach dem Einspielen prüfen.

## Prüfstand am 14.11.2026

Geprüft: Syntax, Datenregeln, Rechte, Löschlauf, Auskunft und Rückweg in einem lokalen Wegwerf-Cluster (PostgreSQL 16) mit nachgebildeten Rollen `anon`, `authenticated`, `service_role`. Die bestehende Prüfung zu 0001–0003 läuft weiter durch. Zwei absichtlich fehlerhafte Kopien (offene Leseregel, Löschen ohne Gesprächsbezug) fielen wie erwartet durch.

Nicht geprüft: echte Supabase-Instanz, PostgREST, echte Anmeldung, Verhalten mit echten Datenmengen, gleichzeitige Zugriffe, Einspielen über die Supabase-Werkzeuge.
