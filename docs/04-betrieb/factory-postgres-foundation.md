# Lokales PostgreSQL-Fundament: Identität, Mitgliedschaft und Mandantentrennung

`db/foundation/001_foundation.sql` ist eine **neue lokale Entwicklungskomponente**.
Sie rekonstruiert keine fehlenden historischen Migrationen und erklärt die
vorgeschlagenen Produktions-ADRs nicht für freigegeben. Affilinet bleibt separat
auf MongoDB; es findet keine Geschäftsdatenmigration statt.

## Geltungsbereich und Tabellen

Die isolierte Datenbank `nx_foundation` im Container `onboarding-postgres` läuft
mit PostgreSQL 17; der lokale TCP-Port ist `127.0.0.1:5433`. Das geprüfte Image ist
`postgres@sha256:858bb5e98eed02eb8cafbcdc007f9a65d1b613972028944a8ec2133ccaf80d27`.
Die Installation benötigt den administrativen Datenbankzugang. Passwörter gehören
nicht in SQL-Dateien, Befehlsargumente, Nachweise oder diese Dokumentation.

Das neue Schema `nx_foundation` enthält:

- `tenant`: Mandantenwurzel mit UUID und Namen.
- `actor`: administrativ gepflegte Zuordnung einer UUID zu einem authentifizierten
  Datenbank-Prinzipal (`session_user`), einschließlich Aktivierungsstatus.
- `membership`: aktive Mitgliedschaft eines Akteurs bei einem Mandanten, mit
  `reader` oder `editor` als minimaler Berechtigungsstufe.
- `project`: kleinster kohärenter Geschäftsdatensatz mit Mandant, UUID, Name und
  unveränderlichem Ersteller. Der Primärschlüssel ist `(tenant_id, id)`.
- `schema_migration`: einmaliger Versionsnachweis für Migration 1.

Die Rollen `nx_app` und `nx_foundation_owner` sind `NOLOGIN`, `NOSUPERUSER` und
`NOBYPASSRLS`, ohne Rechte zum Anlegen von Rollen oder Datenbanken. Eine vorhandene
gleichnamige Rolle mit gefährlichen Rechten oder Rollenmitgliedschaften führt zu
einem Fehler statt einer stillen Umkonfiguration. Das Schema gehört der separaten
Owner-Rolle. Die Anwendung darf deren Identitäts- und Mitgliedschaftstabellen
weder lesen noch verändern und darf keine Rollenmitgliedschaften provisionieren.

## Tatsächlicher Autorisierungsvertrag

Jede Geschäftsoperation benötigt **beide** transaktionslokalen Kontexte:

```sql
BEGIN;
SELECT set_config('app.actor_id', $1, true);
SELECT set_config('app.mandant_id', $2, true);
-- Parametrisierte fachliche Abfragen folgen in derselben Transaktion.
COMMIT; -- bei Fehlern ROLLBACK
```

Das ist ein Vertragsbeispiel für einen späteren Client, keine unmittelbar in psql
ausführbare Anweisung mit erfundenen Benutzerdaten. Der Mandantenkontext allein
gewährt keine Rechte. `current_actor()` verlangt zusätzlich, dass die Akteur-UUID
zur aktiven administrativen Zuordnung von **session_user** passt. Ein Client kann
daher mit einem fremden Akteur- und Mandantenwert keine fremde Identität annehmen.
`SET ROLE nx_app` ändert `session_user` nicht. Eine aktive Mitgliedschaft sowie
die passende Leseberechtigung oder Schreibberechtigung bleiben erforderlich.

`tenant`, `membership` und `project` haben `ENABLE ROW LEVEL SECURITY` **und**
`FORCE ROW LEVEL SECURITY`. Die Projekt-Policies schützen Sichtbarkeit und
Schreiben getrennt, einschließlich `WITH CHECK` für neue Mandantenwerte und
Ersteller. Nur `tenant_id` und `name` sind für die Anwendung aktualisierbar;
der Ersteller kann nach dem Anlegen nicht umgeschrieben werden. Fehlender,
falscher oder ungültig formatierter Kontext liefert keinen Datenzugriff.

Die engen `SECURITY DEFINER`-Funktionen nutzen einen festen Suchpfad und vollständig
qualifizierte Tabellen. Die Anwendung erhält keine allgemeinen Verwaltungsrechte.
Auch der Tabellenbesitzer bleibt durch FORCE RLS eingeschränkt; der administrative
Testzugang als Superuser ist davon ausdrücklich getrennt.

**Grenze:** Dies ist ein lokaler Vertrag mit Datenbank-Prinzipalbindung, noch keine
Webanmeldung. Es gibt keine JWT-Prüfung, Gateway-Sitzung, Provisionierungs-API oder
gemeinsame Verbindungspool-Integration. Ein produktiver Shared-Pool kann nicht
einfach beliebige Nutzer über eine gemeinsame `nx_app`-Anmeldung impersonieren:
`nx_app` ist nicht loginfähig und besitzt keine Akteurzuordnung. Die spätere
Abbildung authentifizierter Gateway-Sitzungen auf vertrauenswürdigen DB-Kontext
braucht eine eigene Architekturentscheidung und Gegenprüfungen. Datenbank-
Superuser und Infrastrukturadministratoren gehören zur vertrauenswürdigen Grenze.

## Anwenden und gegen die echte Datenbank prüfen

Aus dem Repository-Stamm:

```bash
bash db/foundation/test.sh onboarding-postgres nx_foundation
```

Der Runner akzeptiert ausschließlich diesen isolierten Container und diese
Datenbank. Er verwendet den verwalteten Docker-Socket, `psql -X` und
`ON_ERROR_STOP=1`; Fehler bleiben ein fehlgeschlagener Prozessstatus. Er wendet
Migration 1 zweimal an und führt anschließend `verify.sql` aus. Die Migration
läuft atomar mit einer transaktionalen Anwendungssperre. Sie verändert keine
anderen Schemas, löscht keine Geschäftsdaten und erzeugt bei Wiederholung keinen
zweiten Versionsdatensatz. Künftige Schemaänderungen benötigen eine neue Version;
dies ist kein beliebiger Schema-Drift-Reparaturmechanismus.

Die realen Datenbankprüfungen verwenden drei Mandanten und drei gesonderte
Nicht-Owner-Prinzipale. Der administrative Test setzt `SESSION AUTHORIZATION`,
damit sowohl `current_user` als auch `session_user` den jeweiligen Akteur darstellen.
Dadurch werden SQL-Autorisierung und RLS geprüft; eine Netzwerk-/Passwortanmeldung
wird damit nicht geprüft. Alle Testrollen, Daten und Hilfsfunktionen werden am
Ende zurückgerollt, auch bei einem Abbruch durch einen SQL-Fehler.

Geprüfte Fälle umfassen: legitimes Lesen und Schreiben; Lesen, Einfügen,
Aktualisieren und Löschen über Mandantengrenzen; Mandantenwechsel per UPDATE;
gefälschter Ersteller; fehlender und ungültiger Kontext; gefälschter Akteur trotz
`SET ROLE`; Leser ohne Schreibrecht; gesperrter Akteur und entzogene Mitgliedschaft;
FORCE RLS für den Owner; Rollback eines Schreibvorgangs; Bereinigung beider
transaktionslokaler Kontexte nach ROLLBACK und COMMIT auf derselben Verbindung.

Nicht abgedeckt sind Zahlung/Ledger, Agentenläufe, Dokument- und Vektorspeicherung,
bestehende Geschäftstabellen, Wiederherstellung nach Datenbankverlust sowie
produktionsfähige Session-/Pool-Autorisierung. Eine erfolgreiche lokale Prüfung
ist kein Nachweis der vollständigen Factory, eines Deployments oder einer
Produktionsfreigabe.
