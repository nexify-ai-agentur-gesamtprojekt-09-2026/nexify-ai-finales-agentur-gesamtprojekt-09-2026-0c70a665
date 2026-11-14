# Einwilligungsweg für Werbemails · Betriebsnotiz · 14.11.2026

Register: OA-003 (Anmeldeweg mit Bestätigungsmail und Nachweis), OA-098 (Anmelde-Angebot auf der Website). Paket F aus `PROGRESS.md`, „Offene Arbeiten“.

**Zustand: gebaut hinter Schalter, Standard AUS. Nichts ist eingeschaltet, nichts wurde versendet, keine Migration ist eingespielt.** Diese Notiz ist keine Rechtsberatung. Sie beschreibt, was der Code tut und was vor dem Einschalten vorliegen muss.

**Stand dieser Fassung:** nach der unabhängigen Prüfung von Pull Request 186 (Prüfbericht vom 14.11.2026, 20:28 UTC, zu Commit `b1fd6db`). Die erste Fassung dieser Notiz war an vier Stellen falsch; Abschnitt 7 nennt sie und was sich geändert hat.

Warum es das gibt: Am 14.11.2026 hat das Resend-Konto 1 Kontakt ohne Nachweis, 0 Abmeldethemen und 0 Kampagnen (Messung 20:09 UTC, `get-usage`, `list-topics`, `list-broadcasts`; unverändert gegenüber `mailversand-zustand-2026-11-14.md`). Ohne Anmeldeweg bleibt die Liste der Empfänger mit belegter Einwilligung bei null (`docs/05-marketing/mailing/voraussetzungen-vor-dem-ersten-versand.md`, Abschnitt 0). Dieser Weg ist die technische Voraussetzung dafür, dass sie wachsen kann.

## 1. Was gebaut ist

| Baustein | Ort |
|---|---|
| Anmeldung, Bestätigung, Abmeldung (Handler, Schalter, Bereitschaftsprüfung) | `apps/web/mailing/consent.ts` |
| Speicher (Supabase über PostgREST; Test-Speicher) | `apps/web/mailing/consent-store.ts` |
| Mengenbegrenzung je Absender, getrennt für Anmeldung und Bestätigung | `apps/web/mailing/rate-limit.ts` |
| Routen | `apps/web/app/api/mailing/{subscribe,confirm,unsubscribe}/route.ts` |
| Schema `mailing` (vier Tabellen, RLS, Sperren) | `apps/web/supabase/migrations/0005_mailing_consent.sql` |
| Freigaben, Festlegungen und Grenzen des Inhabers | `config/integrations/mailing-consent.json` |
| Tests | `apps/web/auth/tests/mailing-consent.test.mjs`, `mailing-consent-store.test.mjs`, `apps/web/supabase/tests/mailing_consent.sql`, `mailing_consent_postgrest.mjs` |

Wiederverwendet statt neu gebaut: der PostgREST-Client `lib/supabase-rest.ts`, der Mailversand `lib/mailing.ts` (unverändert), der Absenderschlüssel aus `lib/chat-rate-limit.ts`; Aufbau von Speicher, Fehlercodes, Migration und Tests nach dem Muster der Composio-Ablage (`lib/composio-store.ts`, `0004_composio.sql`).

Nicht gebaut: das Anmeldeformular, die Bestätigungsseite und die Abmeldeseite (Oberfläche, entsteht nach `nexify-klon-fabrik`), der Kampagnenversand (OA-106), der Empfang der Resend-Ereignisse für Rückläufer und Beschwerden (Voraussetzung S-2), der Abgleich bestätigter Kontakte in ein Resend-Segment.

## 2. Ablauf

1. **Anmeldung** `POST /api/mailing/subscribe` mit `{ email, lang, consent: true, consent_version, source }`. Gespeichert wird eine unbestätigte Zeile mit Zeitpunkt, Quelle, Fassung und SHA-256 des gezeigten Einwilligungstexts. Es geht eine Bestätigungsmail hinaus. Die Antwort ist für jede angenommene Adresse dieselbe (`202 confirmation_pending`), ob neu, schon bestätigt, abgemeldet, gesperrt oder über einer Grenze.
2. **Bestätigung** `POST /api/mailing/confirm` mit `{ token }`. Der Link in der Mail führt auf die Bestätigungsseite und trägt das Kennzeichen hinter dem `#`; es erreicht den Server erst, wenn die Seite es per POST sendet. Ein bloßer Abruf des Links, etwa durch einen Mailprüfer, bestätigt nichts. Erst danach gilt die Zeile als Einwilligung (`confirmed`, mit Zeitpunkt). Die Bestätigung prüft dieselben Freigaben wie die Anmeldung (fehlt eine: `503`) und bestätigt keine Adresse, die auf der Sperrliste steht.
3. **Sperrlink in der Bestätigungsmail.** Jede Bestätigungsmail trägt neben dem Bestätigungslink einen zweiten Link (`{{SPERRLINK}}`). Er führt auf die Abmeldeseite und trägt das Abmeldekennzeichen hinter dem `#`; die Seite sendet es per POST an `/api/mailing/unsubscribe?t=…`. Wer eine Mail bekommt, die ein Dritter ausgelöst hat, sperrt damit seine Adresse, ohne je zu bestätigen. Der Speicher gibt das Abmeldekennzeichen nur an dieser einen Stelle heraus (`addConfirmToken` in `consent-store.ts`); es steht in keiner Antwort und in keinem Protokoll des Dienstes.
4. **Abmeldung** `POST /api/mailing/unsubscribe?t=<Kennzeichen>`. Erfüllt die Abmeldung mit einem Klick nach RFC 8058 (kein Konto, kein Origin nötig). Reihenfolge in der Datenbank: erst Eintrag auf der Sperrliste, dann der Zustand. Wirkt sofort, ist wiederholbar und **hängt nicht am Schalter**: Wer einmal eine Mail bekommen hat, kann sich auch abmelden, wenn die Anmeldung später abgeschaltet ist.

Eine gesperrte Adresse (Abmeldung, Widerspruch, harter Rückläufer, Beschwerde, von Hand) bekommt keine Mail mehr, auch keine Bestätigungsmail, und wird nicht bestätigt.

**Weitere Anfrage zur selben Adresse, solange die erste offen ist.** Sie ändert die offene Anmeldung nicht, gleich von wem sie kommt: Sprache, Quelle, Zeitpunkt, Fassung und Frist bleiben die der ersten Anfrage, und deren Link bleibt gültig. Die weitere Anfrage löst nur eine weitere Mail mit einem zusätzlichen Link aus, in der Sprache der ersten Anfrage. Folgen, die der Inhaber kennen sollte:

- Fragt ein Dritter eine Adresse zuerst an, und meldet sich der Berechtigte danach selbst an, trägt der Nachweis bis zum Verfall Sprache und Quelle der ersten Anfrage. Bestätigt wird in beiden Fällen der Wortlaut, der in der Mail steht.
- Ist der freigegebene Wortlaut oder seine Fassung inzwischen ein anderer, gibt es zur offenen Anmeldung keine weitere Mail. Sie verfällt zur Frist; danach entsteht sie mit der neuen Fassung neu.
- Je offener Anmeldung sind höchstens 8 Bestätigungslinks zugleich gültig; alle verfallen zur selben Frist und sind mit der Bestätigung oder Abmeldung verbraucht.

## 3. Was vor dem Einschalten vorliegen muss

Anmeldung und Bestätigung antworten mit `503`, solange einer dieser Punkte fehlt. Im Protokoll steht dann `{"event":"mailing_consent_not_ready","gaps":[…]}` mit den Kennwörtern der Lücken.

| Nr. | Voraussetzung | Wer | Wo | Heute |
|---|---|---|---|---|
| 1 | Wortlaut der Einwilligung je Sprache, mit Fassung und Freigabe (Name, Datum, Beleg, SHA-256 des freigegebenen Texts je Sprache) | Inhaber mit Rechtsberatung | `config/integrations/mailing-consent.json` → `einwilligung` | fehlt (A-2) |
| 2 | Wortlaut der Bestätigungsmail je Sprache mit `{{BESTAETIGUNGSLINK}}` **und** `{{SPERRLINK}}`, Freigabe mit SHA-256 je Sprache | Inhaber | dieselbe Datei → `bestaetigungsmail` | fehlt; Entwurf `docs/05-marketing/mailing/vorlagen/a-double-opt-in-bestaetigung.md` (kennt den Sperrlink noch nicht) |
| 3 | Frist, nach der unbestätigte Anmeldungen verfallen (Stunden, höchstens 336) | Inhaber | `bestaetigungsfrist_stunden` | fehlt (A-6) |
| 4 | Bestätigungsseite **und** Abmeldeseite gebaut, beide Pfade eingetragen. Beide sind Pflicht; fehlt einer, meldet die Prüfung `confirmation_page_missing` beziehungsweise `unsubscribe_page_missing` | Agent (Oberfläche) | `seiten` | fehlt |
| 5 | Zulässige Quellen (Formulare), zum Beispiel `preise/checkliste` | Agent mit Inhaber | `quellen` | fehlt |
| 6 | Migration `0005` eingespielt (Datenbank in UTF8), `PGRST_DB_SCHEMAS` um `mailing` ergänzt, PostgREST neu geladen | Inhaber | Supabase-Instanz | fehlt (OA-029) |
| 7 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM` | Inhaber | Vercel-Projekt, serverseitig | hier nicht geprüft |
| 8 | `MAILING_PUBLIC_BASE_URL` (nur `https`, nur Ursprung, zum Beispiel die Adresse der Website) | Inhaber | Vercel-Projekt | fehlt |
| 9 | Grenzen bestätigt, vor allem die Tagesgrenze passend zum Kontingent des Versandkontos | Inhaber | `grenzen` | Vorschlagswerte eingetragen (Abschnitt 4) |
| 10 | `NEXIFY_MAILING_CONSENT=on` | Inhaber | Vercel-Projekt | aus |

**Freigabe und Wortlaut gehören zusammen.** Eine Freigabe nennt unter `sha256` je Sprache die Prüfsumme des freigegebenen Texts: für die Einwilligung die SHA-256 des Texts, für die Bestätigungsmail die SHA-256 von Betreff, Zeilenumbruch, Text (`consentTextDigest`, `confirmationMailDigest` in `consent.ts`). Wird ein Text danach geändert, auch um ein Zeichen, passt die Prüfsumme nicht mehr und die Prüfung meldet `consent_text_approval_mismatch` beziehungsweise `confirmation_mail_approval_mismatch`: Der Weg arbeitet erst wieder mit einer neuen Freigabe. Das gilt für jede Sprache, in der ein Text eingetragen ist.

Ein Platzhalter, der in der Bestätigungsmail stehen bleibt (`{{…}}` oder `[GROSSBUCHSTABEN …`), zählt als Lücke: Eine Mail mit unausgefülltem Feld geht nicht hinaus. Ein Text ohne Freigabe zählt nicht als vorhanden. Eine Grenze, die fehlt oder keine ganze Zahl in ihrem Bereich ist, zählt als Lücke (`limits_invalid`) und schaltet nicht etwa den Schutz ab.

Reihenfolge beim Einschalten: 6 → 7 → 1 bis 5 und 9 (als geprüfter Merge) → 8 → Rauchtest mit einer **eigenen** Adresse (anmelden, Mail prüfen, bestätigen, abmelden, erneut anmelden: keine Mail; zweite eigene Adresse anmelden und über den Sperrlink sperren) → 10 bleibt bis dahin aus und wird erst für den Rauchtest gesetzt.

Rückweg: `NEXIFY_MAILING_CONSENT` löschen und neu ausliefern. Anmeldung und Bestätigung antworten dann sofort wieder mit `503`; bestehende Nachweise und die Sperrliste bleiben, Abmeldungen wirken weiter.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/web/supabase/migrations/0005_mailing_consent.sql
# PGRST_DB_SCHEMAS="public,chat,composio,mailing"
```

## 4. Daten und Schutz

| Tabelle (`mailing.`) | Inhalt | Regeln in der Datenbank |
|---|---|---|
| `subscriptions` | Adresse, Sprache, Zustand, Quelle, Fassung und Prüfsumme des Wortlauts, Zeitpunkte, Frist, Prüfsummen der Bestätigungskennzeichen, Abmeldekennzeichen | Eine Zeile entsteht nur unbestätigt. Adresse, Sprache, Quelle, Fassung, Prüfsumme des Wortlauts, Zeitpunkt der Anfrage und Frist ändern sich in keinem Zustand mehr. Die Prüfsumme der Adresse muss zur Adresse passen. Zustand läuft nur vorwärts; bestätigt wird nur innerhalb der Frist und nie eine gesperrte Adresse; eine bestätigte Zeile ändert sich nur noch durch die Abmeldung, eine abgemeldete gar nicht; gelöscht werden nur unbestätigte Zeilen |
| `suppressions` | SHA-256 der Adresse, Grund, Zeitpunkt | der Dienst darf nur lesen und anfügen |
| `consent_events` | Verlauf je Prüfsumme (angefragt, erneut gesendet, bestätigt, abgemeldet) | der Dienst darf nur lesen und anfügen; weder Adresse noch Kennzeichen |
| `confirmation_mails` | je Bestätigungsmail: SHA-256 der Adresse, Zeitpunkt, Zustand (`reserved`, `sent`, `failed`), die Grenzen, unter denen sie zugelassen wurde | Die Datenbank zählt unter einer Sperre und lässt eine Zeile nur entstehen, solange die Grenzen es erlauben. Ein Eintrag wird genau einmal abgeschlossen. Gelöscht wird er erst, wenn er nach der Uhr der Datenbank für keine Grenze mehr zählt. Weder Adresse noch Kennzeichen |

Diese Regeln binden den Dienst (Rolle `service_role`). Der Besitzer der Tabellen und ein Superuser können Trigger abschalten und Tabellen leeren (`TRUNCATE`); das ist Betrieb der Instanz und keine Lücke des Dienstes, gehört aber in die Zugriffsregelung der Instanz. `service_role` hat kein `TRUNCATE`.

- Row-Level-Security ist auf allen vier Tabellen an, ohne Richtlinie. `anon` und `authenticated` haben weder Tabellenrechte noch `USAGE` auf dem Schema; PostgREST 12.2.3 liefert es für `service_role` trotzdem aus (geprüft, Abschnitt 5).
- Kein Rückfall auf den Arbeitsspeicher: Ohne Supabase gibt es keinen Speicher und die Routen antworten mit `503`. Ein Nachweis, der einen Neustart nicht übersteht, ist keiner.
- Im Protokoll stehen nur Kennwörter und feste Codes, nie Adresse, Prüfsumme, Kennzeichen oder Datenbanktext.
- Steuerzeichen in der Adresse (C0, DEL, C1) werden abgelehnt, im Handler und in der Datenbank.

**Grenzen für Bestätigungsmails** (`grenzen` in `config/integrations/mailing-consent.json`; gezählt in `confirmation_mails`, unabhängig davon, ob die Anmeldung noch besteht):

| Grenze | Wert heute | Bedeutung |
|---|---|---|
| `bestaetigungsmails_je_adresse` in `bestaetigungsmails_fenster_stunden` | 3 in 168 Stunden | je Adress-Prüfsumme; überlebt den Verfall der Anmeldung. Das Fenster gleitet: Es zählen die Mails der letzten 168 Stunden |
| `bestaetigungsmails_je_tag` | 50 in 24 Stunden | insgesamt, über alle Adressen. Schützt das gemeinsam genutzte Resend-Konto, über das auch Kontakt- und Shop-Mails laufen. **Vorschlagswert**: Das Kontingent des Kontos kennt der Inhaber; ist die Grenze erreicht, steht `mailing_consent_daily_limit_reached` im Protokoll und neue Anmeldungen bekommen bis zum Ablauf keine Mail (Antwort weiter `202`) |

Ein gescheiterter Versand verbraucht keine dieser Mails: Der Eintrag wird als `failed` abgeschlossen und zählt nicht; die Anmeldung antwortet mit `502`, ein neuer Versuch sendet erneut. Bricht die Funktion zwischen Eintrag und Versand ab, bleibt der Eintrag `reserved` und zählt mit (im Zweifel eine Mail weniger, nie eine mehr).

**Mengenbegrenzung je Absender** (Bremse, kein verlässlicher Schutz): Browser-Aufrufe nur von der eigenen Seite; Anmeldung 3 je Minute und 10 je Stunde, Bestätigung getrennt davon 10 je Minute und 60 je Stunde, jeweils je Absender und je Funktionsinstanz. Der Absender ist der erste Eintrag von `x-forwarded-for`. Auf Vercel setzt die Plattform diese Kopfzeile selbst; hinter einem anderen Vorschaltdienst, der sie nur ergänzt, kann der Aufrufer sie frei wählen und die Bremse umgehen. Verbindlich sind deshalb die Grenzen in der Datenbank, die an keiner Kopfzeile hängen.

**Fenster zwischen Sperrprüfung und Versand.** Die Anmeldung prüft die Sperrliste zweimal: am Anfang und unmittelbar vor dem Versand. Trägt sich eine Sperre erst während des Aufrufs an den Versanddienst ein, geht diese eine Mail noch hinaus. Schließen ließe sich das nur, wenn der Versand selbst aus der Datenbank heraus ausgelöst würde; das ist nicht gebaut. Bei der Bestätigung verweigert die Datenbank den Wechsel selbst, wenn die Adresse gesperrt ist.

## 5. Geprüft

Lokal am 14.11.2026, kein CI-Lauf (GitHub Actions startet kontoweit keine Jobs). Zahlen und Commit: Pull Request 186, Abschnitt „Prüfung“.

- `node --test apps/web/auth/tests/mailing-consent.test.mjs apps/web/auth/tests/mailing-consent-store.test.mjs`: Handler gegen den Test-Speicher, Speicher gegen einen PostgREST-Nachbau. Darunter Positiv- und Negativprobe aus Voraussetzung A-8 (bestätigt wird bestätigt; unbestätigt, abgelaufen, abgemeldet und gesperrt erhalten nichts) und gleichzeitige Aufrufe. Das Abmeldekennzeichen lesen die Tests aus der Mail, nicht aus der Zählfolge.
- `apps/web/supabase/tests/mailing_consent.sql` gegen ein lokales Wegwerf-PostgreSQL 16 (UTF8): Migration zweimal angewendet, je geschlossener Lücke eine Gegenprobe. 24 absichtlich geschwächte Fassungen der Migration scheitern jeweils am Test.
- `apps/web/supabase/tests/mailing_consent_postgrest.mjs`: Speicher und Handler gegen ein **echtes PostgREST 12.2.3** vor demselben Wegwerf-PostgreSQL 16.15, über `lib/supabase-rest.ts` wie im Betrieb. Enthält gleichzeitige Aufrufe gegen die echte Datenbank (von 24 gleichzeitigen Einträgen zur selben Adresse entstehen genau 3, von 30 Adressen genau die Tagesgrenze, von 5 gleichzeitigen Bestätigungen gewinnt eine) und die Probe, dass das Schema ohne `USAGE` für `anon` und `authenticated` für `service_role` erreichbar bleibt.
- 26 gezielte Veränderungen an Handler, Speicher und Begrenzer (unter anderem: Mengenbegrenzung der Bestätigung entfernt, Link im HTML unmaskiert, `x-forwarded-host` ignoriert) lassen jeweils mindestens einen Test scheitern.
- Routen gegen den lokalen Produktions-Build: siehe Pull Request.

## 6. Nicht belegt und offen

- **Kein Lauf gegen die Supabase-Instanz.** Geprüft ist gegen ein echtes PostgREST 12.2.3 und ein echtes PostgreSQL 16 in einer Wegwerf-Umgebung, ohne das vorgeschaltete Gateway der Instanz (hier durch einen Durchreicher für `/rest/v1/` ersetzt) und ohne deren PostgREST-Version zu kennen. Der Rauchtest aus Abschnitt 3 steht aus.
- **Kein echter Mailversand.** Der Versand lief nur gegen einen Stellvertreter.
- **Rechtliche Einordnung fehlt** (keine Rechtsberatung): Zulässigkeit der Bestätigungsmail (Hinweis zu A-3/A-4), Aufbewahrungs- und Löschfristen für Nachweise und Sperrliste (N-5), Recht je Zielland (R-1).
- **Datenschutz: Feststellungen der Prüfung, hier nicht entschieden.** Sie gehören zur Entscheidung des Inhabers mit Rechtsberatung:
  1. **Verfall löscht nur beim nächsten Anmeldeaufruf.** Eine unbestätigte Anmeldung wird nach der Frist wirkungslos, gelöscht wird sie aber erst, wenn irgendeine Anmeldung eintrifft. Es gibt keinen Zeitplan. Ohne Anmeldungen bleiben verfallene Zeilen samt Adresse liegen. Dasselbe gilt für die Einträge der Mailzählung.
  2. **`consent_events` behält die Prüfsumme der Adresse unbefristet**, auch nach Verfall einer nie bestätigten Anmeldung. Der Dienst kann dort nicht löschen. Die Mailzählung (`confirmation_mails`) hält die Prüfsumme, bis ihr Fenster abgelaufen ist und ein Aufräumlauf kommt.
  3. **Kennzeichen und Prüfsummen stehen in Zugriffsprotokollen.** Das Abmeldekennzeichen steht in der Adresse des Abmeldeaufrufs (`?t=…`, von RFC 8058 so verlangt) und damit im Zugriffsprotokoll der Plattform; Kennzeichen, deren Prüfsummen und die Prüfsumme der Adresse stehen in den Abfrageadressen an PostgREST und damit in den Protokollen von Gateway und Datenbank. Im Protokoll des Dienstes selbst stehen sie nicht.
  4. **Gespeichert sind Fassung und Prüfsumme des Wortlauts, nicht der Wortlaut.** Voraussetzung A-5 nennt „Wortlaut und Fassung“. Der Wortlaut zu einer Fassung steht nur in der Konfiguration und ihrer Git-Historie; ob das als Nachweis genügt oder der Wortlaut je Fassung in der Datenbank liegen muss, ist offen.
- **Entscheidungen des Inhabers, die der Code heute so trifft und die er ändern kann:**
  1. Die Adresse bleibt nach einer Abmeldung in `subscriptions` stehen (als Nachweis, dass frühere Mails zulässig waren), bis Fristen festgelegt sind. Gesendet wird an sie nicht mehr.
  2. Eine abgemeldete Adresse kann sich über das Formular nicht erneut anmelden; die Sperre hebt nur der Inhaber auf. Ob eine neue ausdrückliche Einwilligung die Sperre automatisch aufheben soll, ist offen. Das gilt auch für eine Adresse, die ein Empfänger über den Sperrlink gesperrt hat.
  3. Die IP-Adresse wird nicht gespeichert, auch nicht als Prüfsumme. `config/versand.json` nennt einen „IP-Hash“ als Teil des Nachweises; Voraussetzung A-5 verlangt ihn nicht. Gewählt ist die sparsamere Fassung.
  4. Die Sperrliste hält die SHA-256-Prüfsumme der Adresse ohne geheimen Zusatz. So bleibt sie ohne Schlüssel prüfbar und übersteht einen Anbieterwechsel; bekannte Adressen lassen sich dagegen aber durch Ausprobieren wiedererkennen.
  5. Die Werte unter `grenzen` (3 Mails je Adresse in 168 Stunden, 50 Bestätigungsmails je Tag, Mengen je Absender) sind Vorschläge.
  6. Bei einer weiteren Anfrage zu einer offenen Anmeldung gelten Sprache und Quelle der ersten Anfrage (Abschnitt 2).
- **Zeitverhalten:** Die Antwort ist für bekannte und unbekannte Adressen gleich, die Dauer nicht (mit Mailversand dauert sie länger). Wer misst, kann daraus schließen, ob eine Mail gesendet wurde.
- **Missbrauch der Tagesgrenze:** Wer viele verschiedene Adressen anfragt, kann die Tagesgrenze ausschöpfen; dann bekommen echte Anmeldungen bis zum Ablauf keine Bestätigungsmail. Die Grenze schützt das Versandkonto und fremde Postfächer, nicht die Verfügbarkeit der Anmeldung. Dagegen hilft nur ein Schutz vor dem Formular (zum Beispiel eine Aufgabe für den Browser), der nicht gebaut ist.
- **Bestätigungsmail und Sperrliste hängen noch nicht an den Resend-Ereignissen.** Ein harter Rückläufer oder eine Beschwerde trägt sich erst ein, wenn der Empfang der Ereignisse gebaut ist (S-2). Bis dahin kein Kampagnenversand.
- `docs/deployment/environment-variables.md` ist nicht nachgeführt (gebundene Datei); die neuen Variablen stehen in `apps/web/.env.example` und hier.

## 7. Berichtigungen gegenüber der ersten Fassung dieser Notiz

| Stelle | Stand der ersten Fassung | Tatsächlich damals | Jetzt |
|---|---|---|---|
| Abschnitt 2, Punkt 3 | Abmeldung über das Kennzeichen möglich | Das Abmeldekennzeichen erreichte nie einen Empfänger; niemand konnte die Abmeldung auslösen | Sperrlink in jeder Bestätigungsmail, Pflicht in der Bereitschaftsprüfung |
| Abschnitt 3, Nr. 4 | Bestätigungsseite und Abmeldeseite seien Voraussetzung | Geprüft wurde nur der Pfad der Bestätigungsseite; eine Freigabe war nicht an den Wortlaut gebunden | Beide Pfade Pflicht; Freigabe an die SHA-256 des Wortlauts je Sprache gebunden |
| Abschnitt 4 | „in der Datenbank höchstens 3 Bestätigungsmails je unbestätigter Anmeldung“ | Die Zählung begann nach jedem Verfall neu, es gab keine Gesamtgrenze, und ein gescheiterter Versand verbrauchte die Zählung | Zählung je Adress-Prüfsumme über ein Zeitfenster, unabhängig von der Anmeldung; Tagesgrenze; Fehlschläge zählen nicht |
| Abschnitt 4 | „ein bestätigter Nachweis ist unveränderlich“ | Eine Zeile ließ sich direkt als bestätigt einfügen, beim Bestätigen im selben Schritt umschreiben, und mehrere Spalten bestätigter und abgemeldeter Zeilen waren änderbar | Regeln aus der Tabelle in Abschnitt 4, je Lücke eine Gegenprobe im SQL-Test |

Weiter berichtigt: Die Bestätigung prüfte weder Sperrliste noch Freigaben; jede weitere Anfrage entwertete den vorigen Link und überschrieb Sprache, Quelle, Zeitpunkt und Fassung der offenen Zeile; Anmeldung und Bestätigung teilten einen Zähler; Steuerzeichen in der Adresse wurden angenommen.

Diese Datei wird nicht fortgeschrieben; ein neuer Stand bekommt eine neue Datei mit neuem Datum.
