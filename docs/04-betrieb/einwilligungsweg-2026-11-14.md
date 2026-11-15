# Einwilligungsweg für Werbemails · Betriebsnotiz · 14.11.2026

Register: OA-003 (Anmeldeweg mit Bestätigungsmail und Nachweis), OA-098 (Anmelde-Angebot auf der Website). Paket F aus `PROGRESS.md`, „Offene Arbeiten“.

**Zustand: gebaut hinter Schalter, Standard AUS. Nichts ist eingeschaltet, nichts wurde versendet, keine Migration ist eingespielt.** Diese Notiz ist keine Rechtsberatung. Sie beschreibt, was der Code tut und was vor dem Einschalten vorliegen muss.

**Stand dieser Fassung:** nach drei unabhängigen Prüfungen von Pull Request 186 (Prüfberichte vom 14.11.2026 zu den Commits `b1fd6db`, `d0a083d` und `6b27c4c`). Die erste Fassung dieser Notiz war an vier Stellen falsch, die zweite Prüfung fand elf weitere Punkte, die dritte zwei niedrige Restbefunde; Abschnitt 7 nennt, was sich jeweils geändert hat.

Warum es das gibt: Am 14.11.2026 hat das Resend-Konto 1 Kontakt ohne Nachweis, 0 Abmeldethemen und 0 Kampagnen (Messung 20:09 UTC, `get-usage`, `list-topics`, `list-broadcasts`; unverändert gegenüber `mailversand-zustand-2026-11-14.md`). Ohne Anmeldeweg bleibt die Liste der Empfänger mit belegter Einwilligung bei null (`docs/05-marketing/mailing/voraussetzungen-vor-dem-ersten-versand.md`, Abschnitt 0). Dieser Weg ist die technische Voraussetzung dafür, dass sie wachsen kann.

## 1. Was gebaut ist

| Baustein | Ort |
|---|---|
| Anmeldung, Bestätigung, Abmeldung (Handler, Schalter, Bereitschaftsprüfung) | `apps/web/mailing/consent.ts` |
| Speicher (Supabase über PostgREST; Test-Speicher) | `apps/web/mailing/consent-store.ts` |
| Mengenbegrenzung je Absender, getrennt für Anmeldung und Bestätigung | `apps/web/mailing/rate-limit.ts` |
| Routen | `apps/web/app/api/mailing/{subscribe,confirm,unsubscribe}/route.ts` |
| Schema `mailing` (sechs Tabellen, RLS, Sperren) | `apps/web/supabase/migrations/0005_mailing_consent.sql` |
| Freigaben, Festlegungen und Grenzen des Inhabers | `config/integrations/mailing-consent.json` |
| Tests | `apps/web/auth/tests/mailing-consent.test.mjs`, `mailing-consent-store.test.mjs`, `apps/web/supabase/tests/mailing_consent.sql`, `mailing_consent_postgrest.mjs` |

Wiederverwendet statt neu gebaut: der PostgREST-Client `lib/supabase-rest.ts`, der Mailversand `lib/mailing.ts` (unverändert), der Absenderschlüssel aus `lib/chat-rate-limit.ts`; Aufbau von Speicher, Fehlercodes, Migration und Tests nach dem Muster der Composio-Ablage (`lib/composio-store.ts`, `0004_composio.sql`).

Nicht gebaut: das Anmeldeformular, die Bestätigungsseite und die Abmeldeseite (Oberfläche, entsteht nach `nexify-klon-fabrik`), der Kampagnenversand (OA-106), der Empfang der Resend-Ereignisse für Rückläufer und Beschwerden (Voraussetzung S-2), der Abgleich bestätigter Kontakte in ein Resend-Segment.

## 2. Ablauf

1. **Anmeldung** `POST /api/mailing/subscribe` mit `{ email, lang, consent: true, consent_version, source }`. Gespeichert wird eine unbestätigte Zeile mit Zeitpunkt, Quelle, Fassung und SHA-256 des gezeigten Einwilligungstexts. Es geht eine Bestätigungsmail hinaus. Die Antwort ist für jede angenommene Adresse dieselbe (`202 confirmation_pending`), ob neu, schon bestätigt, abgemeldet, gesperrt oder über einer Grenze.
2. **Bestätigung** `POST /api/mailing/confirm` mit `{ token }`. Der Link in der Mail führt auf die Bestätigungsseite und trägt das Kennzeichen hinter dem `#`; es erreicht den Server erst, wenn die Seite es per POST sendet. Ein bloßer Abruf des Links, etwa durch einen Mailprüfer, bestätigt nichts. Erst danach gilt die Zeile als Einwilligung (`confirmed`, mit Zeitpunkt). Die Bestätigung prüft dieselben Freigaben wie die Anmeldung (fehlt eine: `503`) und bestätigt keine Adresse, die auf der Sperrliste steht.
3. **Sperrlink in der Bestätigungsmail.** Jede Bestätigungsmail trägt neben dem Bestätigungslink einen zweiten Link (`{{SPERRLINK}}`). Er führt auf die Abmeldeseite und trägt das Abmeldekennzeichen hinter dem `#`; die Seite sendet es per POST an `/api/mailing/unsubscribe?t=…`. Wer eine Mail bekommt, die ein Dritter ausgelöst hat, sperrt damit seine Adresse, ohne je zu bestätigen. Das Kennzeichen hängt an der Prüfsumme der Adresse, nicht an der Anmeldung (Tabelle `unsubscribe_tokens`): Es bleibt über jeden Verfall hinweg dasselbe, und **der Sperrlink einer alten Mail wirkt auch dann noch, wenn die Anmeldung längst verfallen und gelöscht ist.** Der Speicher gibt das Kennzeichen nur an einer Stelle heraus (`issueUnsubscribeToken` in `consent-store.ts`); es steht in keiner Antwort und in keinem Protokoll des Dienstes.
4. **Abmeldung und Sperre** `POST /api/mailing/unsubscribe?t=<Kennzeichen>`. Erfüllt die Abmeldung mit einem Klick nach RFC 8058 (kein Konto, kein Origin nötig). Reihenfolge in der Datenbank: erst Eintrag auf der Sperrliste, dann die Anmeldung. Eine **bestätigte** Anmeldung wird abgemeldet und bleibt als Nachweis stehen. Eine **nie bestätigte** Anmeldung wird gelöscht: Auf der Sperrliste steht nur die Prüfsumme, die Adresse einer Person, die nie eingewilligt hat, bleibt nicht gespeichert. Wirkt sofort, ist wiederholbar und **hängt nicht am Schalter**.
5. **Aufräumen.** Verfallene unbestätigte Anmeldungen (samt Adresse) und Einträge der Mailzählung, die für keine Grenze mehr zählen, werden bei jedem Aufruf der Anmelde- und der Abmelderoute gelöscht, auch bei ausgeschaltetem Schalter und fehlenden Freigaben, außerdem bei jeder Bestätigung, solange der Schalter an ist; insgesamt höchstens einmal je Minute und Funktionsinstanz. Ohne jeden Aufruf läuft es nicht; ein Zeitplan ist nicht gebaut (Abschnitt 6).

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
| 9 | Grenzen bestätigt, vor allem die Tagesgrenze passend zum Kontingent des Versandkontos. Sie stehen an zwei Stellen, es gilt je Grenze der strengere Wert: in der Konfiguration und in der Tabelle `mailing.settings`, die nur der Besitzer der Datenbank ändert | Inhaber | `grenzen`; `update mailing.settings set …` | Vorschlagswerte an beiden Stellen (Abschnitt 4) |
| 10 | `NEXIFY_MAILING_CONSENT=on` | Inhaber | Vercel-Projekt | aus |

**Freigabe und Wortlaut gehören zusammen.** Eine Freigabe nennt unter `sha256` je Sprache die Prüfsumme des freigegebenen Texts: für die Einwilligung die SHA-256 des Texts, für die Bestätigungsmail die SHA-256 von Betreff, Zeilenumbruch, Text (`consentTextDigest`, `confirmationMailDigest` in `consent.ts`). Wird ein Text danach geändert, auch um ein Zeichen, passt die Prüfsumme nicht mehr und die Prüfung meldet `consent_text_approval_mismatch` beziehungsweise `confirmation_mail_approval_mismatch`: Der Weg arbeitet erst wieder mit einer neuen Freigabe. Das gilt für jede Sprache, in der ein Text eingetragen ist.

Ein Platzhalter, der in der Bestätigungsmail stehen bleibt (`{{…}}` oder `[GROSSBUCHSTABEN …`), zählt als Lücke: Eine Mail mit unausgefülltem Feld geht nicht hinaus. Dasselbe gilt für den Einwilligungstext (`consent_text_placeholder_unresolved`): Er wird wörtlich in die Mail gesetzt, ein Platzhalter darin bliebe sichtbar stehen. Ein Text ohne Freigabe zählt nicht als vorhanden. Eine Grenze, die fehlt oder keine ganze Zahl in ihrem Bereich ist, zählt als Lücke (`limits_invalid`) und schaltet nicht etwa den Schutz ab.

Reihenfolge beim Einschalten: 6 → 7 → 1 bis 5 und 9 (als geprüfter Merge) → 8 → Rauchtest mit einer **eigenen** Adresse (anmelden, Mail prüfen, bestätigen, abmelden, erneut anmelden: keine Mail; zweite eigene Adresse anmelden und über den Sperrlink sperren) → 10 bleibt bis dahin aus und wird erst für den Rauchtest gesetzt.

Rückweg: `NEXIFY_MAILING_CONSENT` löschen und neu ausliefern. Anmeldung und Bestätigung antworten dann sofort wieder mit `503`; bestehende Nachweise und die Sperrliste bleiben, Abmeldungen und Sperrlinks wirken weiter, und verfallene Anmeldungen werden weiter abgeräumt, sobald eine der Routen aufgerufen wird.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/web/supabase/migrations/0005_mailing_consent.sql
# PGRST_DB_SCHEMAS="public,chat,composio,mailing"
```

Die Migration ist eine einzige Transaktion (`begin … commit` in der Datei). Scheitert eine Anweisung, entsteht nichts, auch ohne `ON_ERROR_STOP`; ein erneuter Lauf gegen eine Instanz in Betrieb hat kein Fenster ohne Sperren und überschreibt die Obergrenzen in `mailing.settings` nicht. `--single-transaction` ist deshalb nicht nötig und sollte nicht zusätzlich gesetzt werden. Sie verlangt eine Datenbank in UTF8.

## 4. Daten und Schutz

| Tabelle (`mailing.`) | Inhalt | Regeln in der Datenbank |
|---|---|---|
| `subscriptions` | Adresse, Sprache, Zustand, Quelle, Fassung und Prüfsumme des Wortlauts, Zeitpunkte, Frist, Prüfsummen der Bestätigungskennzeichen | Eine Zeile entsteht nur unbestätigt. Adresse, Sprache, Quelle, Fassung, Prüfsumme des Wortlauts, Zeitpunkt der Anfrage und Frist ändern sich in keinem Zustand mehr. Die Prüfsumme der Adresse muss zur Adresse passen; die Adresse steht ohne Rand, Steuer- und unsichtbare Zeichen und ohne ASCII-Großbuchstaben da. Zustand läuft nur vorwärts (unbestätigt → bestätigt → abgemeldet); bestätigt wird nur innerhalb der Frist und nie eine gesperrte Adresse; eine bestätigte Zeile ändert sich nur noch durch die Abmeldung, eine abgemeldete gar nicht; gelöscht werden nur unbestätigte Zeilen, und nur, wenn ihre Frist nach der Uhr der Datenbank abgelaufen ist oder ihre Adresse auf der Sperrliste steht. Abgemeldet werden kann nur, was bestätigt war |
| `suppressions` | SHA-256 der Adresse, Grund, Zeitpunkt | der Dienst darf nur lesen und anfügen |
| `unsubscribe_tokens` | SHA-256 der Adresse, Abmeldekennzeichen, Zeitpunkt | eines je Prüfsumme; der Dienst darf nur lesen und anfügen, ein Kennzeichen wird nie ersetzt; keine Adresse |
| `consent_events` | Verlauf je Prüfsumme (angefragt, erneut gesendet, bestätigt, abgemeldet) | der Dienst darf nur lesen und anfügen; weder Adresse noch Kennzeichen |
| `confirmation_mails` | je Versandversuch einer Bestätigungsmail: SHA-256 der Adresse, Zeitpunkt, Zustand (`reserved`, `sent`, `failed`), die Grenzen, die tatsächlich galten | Die Datenbank zählt unter einer Sperre und lässt eine Zeile nur entstehen, solange die Grenzen es erlauben. Ein Eintrag wird genau einmal abgeschlossen. Gelöscht wird er erst, wenn er nach der Uhr der Datenbank für keine Grenze mehr zählt. Weder Adresse noch Kennzeichen |
| `settings` | Obergrenzen der Zählung, genau eine Zeile | der Dienst kann nur lesen; ändern kann nur der Besitzer der Datenbank |

**Uhr und Grenzen gehören der Datenbank.** Zeitpunkt der Anfrage, der Bestätigung, der Abmeldung, der Sperre und jedes Zähleintrags setzt die Datenbank mit ihrer eigenen Uhr; was der Dienst dafür mitschickt, wird überschrieben (von der Anfrage bleibt nur die Dauer der Frist). Für jede Grenze der Mailzählung gilt der strengere Wert aus dem, was der Dienst aus seiner Konfiguration mitschickt, und `mailing.settings`. Ein fehlerhaft konfigurierter oder fehlerhafter Dienst kann die Grenzen so nicht anheben und keine Zeit vor- oder zurückdatieren.

**Sperre und Bestätigung derselben Adresse laufen nacheinander** (gemeinsame Sperre je Prüfsumme): Eine Sperre, die gerade eingetragen wird, ist für eine gleichzeitige Bestätigung sichtbar, bevor diese entscheidet. Trägt sich die Sperre erst *nach* einer abgeschlossenen Bestätigung ein (zum Beispiel ein späterer Rückläufer), steht die Zeile auf `confirmed` und zugleich auf der Sperrliste. **Der spätere Kampagnenversand muss deshalb bei jedem Versand die Sperrliste prüfen, nicht nur den Zustand.**

Diese Regeln binden den Dienst (Rolle `service_role`). Der Besitzer der Tabellen und ein Superuser können Trigger abschalten und Tabellen leeren (`TRUNCATE`); das ist Betrieb der Instanz und keine Lücke des Dienstes, gehört aber in die Zugriffsregelung der Instanz. `service_role` hat kein `TRUNCATE`.

- Row-Level-Security ist auf allen sechs Tabellen an, ohne Richtlinie. `anon` und `authenticated` haben weder Tabellenrechte noch `USAGE` auf dem Schema; PostgREST 12.2.3 liefert es für `service_role` trotzdem aus (geprüft, Abschnitt 5).
- Kein Rückfall auf den Arbeitsspeicher: Ohne Supabase gibt es keinen Speicher und die Routen antworten mit `503`. Ein Nachweis, der einen Neustart nicht übersteht, ist keiner.
- Im Protokoll stehen nur Kennwörter und feste Codes, nie Adresse, Prüfsumme, Kennzeichen oder Datenbanktext.
- Steuerzeichen (C0, DEL, C1) und unsichtbare oder umstellende Zeichen (zum Beispiel U+200B, U+202E) in der Adresse werden abgelehnt, im Handler und in der Datenbank. Kleinschreibung: Der Dienst schreibt die Adresse klein; die Datenbank erzwingt das nur für ASCII-Buchstaben (für andere Schriften hinge das Ergebnis von der Sortierung der Instanz ab).

**Grenzen für Bestätigungsmails** (`grenzen` in `config/integrations/mailing-consent.json` und `mailing.settings`; gezählt in `confirmation_mails`, unabhängig davon, ob die Anmeldung noch besteht). Alle Werte sind Vorschläge:

| Grenze | Wert heute | Bedeutung |
|---|---|---|
| `bestaetigungsmails_je_adresse` in `bestaetigungsmails_fenster_stunden` | 3 in 168 Stunden | je Adress-Prüfsumme; überlebt den Verfall der Anmeldung. Das Fenster gleitet |
| `bestaetigungsmails_je_tag` | 50 in 24 Stunden | insgesamt, über alle Adressen. Schützt das gemeinsam genutzte Resend-Konto, über das auch Kontakt- und Shop-Mails laufen. Das Kontingent des Kontos kennt der Inhaber; ist die Grenze erreicht, steht `mailing_consent_daily_limit_reached` im Protokoll und neue Anmeldungen bekommen bis zum Ablauf keine Mail (Antwort weiter `202`) |
| `versandversuche_je_adresse`, `versandversuche_je_tag` | 9 im Fenster, 150 in 24 Stunden | Versuche einschließlich der gescheiterten. Die Anmeldung antwortet auf einen gescheiterten Versand mit `502`. Nur ein sicher nicht erfolgter Versand (Versand nicht eingerichtet) oder ein Abbruch vor der Übergabe zählt nicht als Mail, wohl aber als Versuch. Jeder andere Fehlschlag zählt als Mail: Der Anbieter kann sie angenommen haben, bevor die Antwort verloren ging; der Eintrag bleibt offen (`reserved`) und das Kennzeichen gültig. Ist der Versanddienst gestört, enden die Übergaben also nach der Grenze je Adresse |
| `anfragen_je_minute`, `_stunde`, `_tag` | 3, 6, 12 je Absender | Bremse der Anmeldung je Absender und Funktionsinstanz. **Pflicht:** `anfragen_je_tag` mal 4 höchstens `bestaetigungsmails_je_tag`, sonst arbeitet der Weg nicht (`limits_invalid`). Ein einzelner Absender kann so höchstens ein Viertel der Tagesgrenze auslösen |
| `bestaetigungen_je_minute`, `_stunde` | 10, 60 je Absender | Bremse der Bestätigung, getrennt von der Anmeldung |

Bricht die Funktion zwischen Eintrag und Versand ab, bleibt der Eintrag `reserved` und zählt mit (im Zweifel eine Mail weniger, nie eine mehr).

**Mengenbegrenzung je Absender ist eine Bremse, kein verlässlicher Schutz.** Browser-Aufrufe nur von der eigenen Seite; Aufrufe ohne `Origin` (etwa von der Kommandozeile) sind zugelassen. Der Zähler liegt im Arbeitsspeicher einer Funktionsinstanz und beginnt mit jeder neuen Instanz von vorn. Der Absender ist der erste Eintrag von `x-forwarded-for`. Auf Vercel setzt die Plattform diese Kopfzeile selbst; hinter einem anderen Vorschaltdienst, der sie nur ergänzt, kann der Aufrufer sie frei wählen und die Bremse umgehen. Verbindlich sind deshalb die Grenzen in der Datenbank, die an keiner Kopfzeile hängen.

**Fenster zwischen Sperrprüfung und Versand.** Die Anmeldung prüft die Sperrliste zweimal: am Anfang und unmittelbar vor dem Versand. Trägt sich eine Sperre erst während des Aufrufs an den Versanddienst ein, geht diese eine Mail noch hinaus. Schließen ließe sich das nur, wenn der Versand selbst aus der Datenbank heraus ausgelöst würde; das ist nicht gebaut. Bei der Bestätigung verweigert die Datenbank den Wechsel selbst, wenn die Adresse gesperrt ist.

## 5. Geprüft

Lokal am 14.11.2026, kein CI-Lauf (GitHub Actions startet kontoweit keine Jobs). Zahlen und Commit: Pull Request 186, Abschnitt „Prüfung“.

- `node --test apps/web/auth/tests/mailing-consent.test.mjs apps/web/auth/tests/mailing-consent-store.test.mjs`: Handler gegen den Test-Speicher, Speicher gegen einen PostgREST-Nachbau. Darunter Positiv- und Negativprobe aus Voraussetzung A-8 (bestätigt wird bestätigt; unbestätigt, abgelaufen, abgemeldet und gesperrt erhalten nichts) und gleichzeitige Aufrufe. Das Abmeldekennzeichen lesen die Tests aus der Mail, nicht aus der Zählfolge.
- `apps/web/supabase/tests/mailing_consent.sql` gegen ein lokales Wegwerf-PostgreSQL 16 (UTF8): Migration zweimal angewendet, je geschlossener Lücke eine Gegenprobe. 44 absichtlich geschwächte Fassungen der Migration scheitern jeweils am Test.
- `apps/web/supabase/tests/mailing_consent_postgrest.mjs`: Speicher und Handler gegen ein **echtes PostgREST 12.2.3** vor demselben Wegwerf-PostgreSQL 16.15, über `lib/supabase-rest.ts` wie im Betrieb. Enthält gleichzeitige Aufrufe gegen die echte Datenbank (von 24 gleichzeitigen Einträgen zur selben Adresse entstehen genau 3, von 30 Adressen genau die Tagesgrenze, von 5 gleichzeitigen Bestätigungen gewinnt eine), eine Sperre und eine Bestätigung über zwei Verbindungen, die Migration gegen eine Datenbank in LATIN1 ohne `ON_ERROR_STOP` und einen mittendrin abgebrochenen Lauf, und die Probe, dass das Schema ohne `USAGE` für `anon` und `authenticated` für `service_role` erreichbar bleibt.
- 51 gezielte Veränderungen an Handler, Speicher und Begrenzer (unter anderem: Mengenbegrenzung der Bestätigung entfernt, Link im HTML unmaskiert, `x-forwarded-host` ignoriert, Abmeldekennzeichen je Anmeldung statt je Adresse, Aufräumen nur bei eingeschaltetem Schalter) lassen jeweils mindestens einen Test scheitern.
- Routen gegen den lokalen Produktions-Build: siehe Pull Request.

## 6. Nicht belegt und offen

- **Kein Lauf gegen die Supabase-Instanz.** Geprüft ist gegen ein echtes PostgREST 12.2.3 und ein echtes PostgreSQL 16 in einer Wegwerf-Umgebung, ohne das vorgeschaltete Gateway der Instanz (hier durch einen Durchreicher für `/rest/v1/` ersetzt) und ohne deren PostgREST-Version zu kennen. Der Rauchtest aus Abschnitt 3 steht aus.
- **Kein echter Mailversand.** Der Versand lief nur gegen einen Stellvertreter.
- **Rechtliche Einordnung fehlt** (keine Rechtsberatung): Zulässigkeit der Bestätigungsmail (Hinweis zu A-3/A-4), Aufbewahrungs- und Löschfristen für Nachweise und Sperrliste (N-5), Recht je Zielland (R-1).
- **Datenschutz und Nachweis: technische Feststellungen beider Prüfungen, hier nicht entschieden.** Sie gehören zur Entscheidung des Inhabers mit Rechtsberatung.

  *Gespeichert je Anmeldung:* Adresse, Sprache, Quelle, Fassung, SHA-256 des Wortlauts, Zeitpunkte von Anfrage, Frist, Bestätigung und Abmeldung; dazu der Verlauf je Prüfsumme.

  *Was für einen Nachweis fehlt:*
  1. Der Wortlaut selbst liegt nur in der Konfiguration und ihrer Git-Historie; gespeichert sind Fassung und Prüfsumme. Voraussetzung A-5 nennt „Wortlaut und Fassung“.
  2. Fassung oder Prüfsumme der versandten Bestätigungsmail wird nicht gespeichert.
  3. Die Kennung des Versanddienstes wird verworfen; ein Beleg, dass die Mail an diese Adresse übergeben wurde, fehlt.
  4. Es ist nicht festgehalten, welcher von bis zu 8 Links bestätigt wurde.
  5. Der Verlauf (`consent_events`) ist eine Nebenspur: Ein Schreibfehler dort wird nur protokolliert. Sein Ereigniszeitpunkt stammt von der Uhr der Funktion; daneben steht jetzt der Eingangszeitpunkt nach der Uhr der Datenbank. Die Zeitpunkte der Anmeldung selbst setzt die Datenbank.
  6. IP-Adresse und Browserkennung fehlen bewusst.
  7. Ein Lösch- oder Auskunftsweg für den Dienst fehlt; beides geht nur als Besitzer der Datenbank von Hand.
  8. Eine Freigabe ist ein frei eintragbarer Datensatz; die Prüfsumme bindet den Text, nicht die Person, die freigegeben hat.

  *Was länger gehalten wird, als ein Zweck es trägt, oder ohne Frist:*
  1. Verfallene unbestätigte Zeilen samt Adresse, solange keine der drei Routen aufgerufen wird. Das Aufräumen hängt nicht mehr am Schalter, aber weiter an einem Aufruf; es gibt keinen Zeitplan.
  2. Die Prüfsumme der Adresse im Verlauf (`consent_events`), unbefristet, auch nach Verfall einer nie bestätigten Anmeldung, und ohne geheimen Zusatz, also für bekannte Adressen durch Ausprobieren rückführbar. Der Dienst kann dort nicht löschen.
  3. Das Abmeldekennzeichen je Prüfsumme (`unsubscribe_tokens`), unbefristet. Das ist der Preis dafür, dass ein Sperrlink den Verfall überlebt; der Dienst kann dort nicht löschen.
  4. Sperrliste und abgemeldete Zeilen (mit Adresse) ohne Frist.
  5. Die Mailzählung hält die Prüfsumme, bis ihr Fenster abgelaufen ist und ein Aufräumlauf kommt.

  *Kennzeichen und Prüfsummen in Zugriffsprotokollen:* Das Abmeldekennzeichen steht in der Adresse des Abmeldeaufrufs (`?t=…`, von RFC 8058 so verlangt) und damit im Zugriffsprotokoll der Plattform; Kennzeichen, deren Prüfsummen und die Prüfsumme der Adresse stehen in den Abfrageadressen an PostgREST und damit in den Protokollen von Gateway und Datenbank. Im Protokoll des Dienstes selbst stehen sie nicht. Nicht geprüft ist, ob im Resend-Konto Klick-Verfolgung aktiv ist; sie würde Links umschreiben und die Kennzeichen hinter `#` an Resend geben.

  *Für die Seiten, die noch gebaut werden:* Bestätigungs- und Abmeldeseite dürfen das Kennzeichen erst nach einem Klick senden. Senden sie es beim Laden, bestätigen oder sperren Mailprüfer, die Skripte ausführen.
- **Offene Entscheidungen aus der zweiten Prüfung, jeweils mit der Vorgabe, die der Code heute trifft:**
  1. **Ein Absender gegen alle (B2).** Vorgabe: `anfragen_je_tag` 12 bei einer Tagesgrenze von 50, die Regel „mal 4“ ist Pflicht. Das hält einen einzelnen Absender bei einem Viertel der Tagesgrenze, solange die Bremse greift. Sie greift nicht verlässlich (siehe oben: je Instanz, Kopfzeile außerhalb von Vercel wählbar), und vier Absender oder ein Aufrufer mit wechselnder Adresse schöpfen die Tagesgrenze weiter aus; echte Anmeldungen bekommen dann bis zum Ablauf `202` ohne Mail, und vom gemeinsamen Konto gehen bis zu 50 unverlangte Bestätigungsmails je Tag an fremde Adressen. Alternativen: (a) ein Schutz vor dem Formular, etwa eine Aufgabe für den Browser (zusätzlicher Dienst, Datenschutzprüfung); (b) dauerhafte Zählung je Absender in der Datenbank (verlangt eine Prüfsumme der IP-Adresse, die bisher bewusst nicht gespeichert wird); (c) eine höhere Tagesgrenze mit eigenem Versandkonto für Bestätigungsmails. Ohne eine davon bleibt das Risiko bestehen.
  2. **Schreibvarianten derselben Adresse (dritte Prüfung, N-A1).** Die Grenze je Adresse hängt an der Prüfsumme der Adresse; jede angenommene Schreibweise hätte eine eigene. Vorgabe: Es gibt je Adresse genau eine angenommene Schreibweise. Abgelehnt werden ein Punkt am Anfang oder Ende und zwei Punkte hintereinander (vor und nach dem `@`), ein abschließender Punkt oder Doppelpunkt, ein Bindestrich am Rand eines Domainteils, Zeichen, die nicht dargestellt werden (Füllzeichen wie U+3164 und U+115F, Variantenwähler wie U+FE0F, nicht vergebene Zeichen); zusammengesetzte und zerlegte Unicode-Form zählen als dieselbe Adresse (NFC). Handler und Datenbank prüfen beides. Nicht zusammengefasst sind Varianten, die nur einzelne Anbieter gleich zustellen: Punkte im lokalen Teil (bei manchen Anbietern ohne Bedeutung), Zusatzadressen mit `+`, Groß- und Kleinschreibung jenseits von ASCII in der Datenbank, und gleich aussehende Buchstaben verschiedener Schriften. Über sie gehen weiter mehrere Mails an ein Postfach, bis zur Tagesgrenze. Alternative: je Anbieter zusammenfassen (verändert, was als „dieselbe Adresse“ gilt, und kann zwei verschiedene Personen zu einer machen).
  3. **Drei Anfragen sperren eine Adresse für sieben Tage aus.** Die Grenze je Adresse schützt das Postfach, lässt aber einen Dritten die drei Mails verbrauchen; der Berechtigte bekommt dann bis zu 168 Stunden keine eigene Bestätigungsmail (er kann einen der drei zugestellten Links nutzen). 
  4. **Klartext nach der Sperre (B3).** Vorgabe: Die Sperre einer nie bestätigten Adresse löscht die Zeile; es bleibt die Prüfsumme auf der Sperrliste. Alternative: die Zeile als Beleg für den Vorgang behalten. Dann bliebe die Adresse einer Person gespeichert, die nie eingewilligt hat.
  5. **Sperrlink ohne Zeile (B1).** Vorgabe: Kennzeichen je Prüfsumme in der Datenbank, unbefristet. Alternative: ein unterschriebenes Kennzeichen ohne Tabelle. Das hielte nichts vor, verlangt aber ein neues Geheimnis im Betrieb, und ein Wechsel des Geheimnisses machte alle alten Sperrlinks wirkungslos.
  6. **Aufräumen nach Zeitplan (B4).** Vorgabe: bei jedem Aufruf, höchstens einmal je Minute. Alternative: ein Zeitplan in der Datenbank oder auf der Plattform, damit auch ohne Aufrufe gelöscht wird.
  7. **Speicherung von Mailfassung und Versandkennung** (Nachweis, oben Punkte 2 und 3): nicht gebaut.
  8. **Fehlschlag ohne klaren Ausgang (automatische Durchsicht vom 15.11.2026).** Meldet der Versand einen Fehler, kann der Anbieter die Mail trotzdem angenommen haben. Vorgabe: Ein solcher Fehlschlag zählt als Mail, das Kennzeichen bleibt gültig. Folge: Drei gescheiterte Übergaben sperren die Adresse für das Fenster (168 Stunden) aus, auch wenn keine Mail ankam; eine eindeutige Ablehnung des Anbieters (etwa wegen einer unzustellbaren Adresse) zählt ebenso, weil `lib/mailing.ts` sie nicht von einem Verbindungsabbruch unterscheidbar meldet. Alternative: eine Kennung je Versand, die der Anbieter für doppelte Übergaben auswertet (Idempotenz), oder eine eindeutige Rückmeldung „abgelehnt“; beides verlangt eine Änderung an `lib/mailing.ts`, die außerhalb dieses Auftrags liegt.
  9. **Domain in zwei Schreibweisen.** Eine Domain mit Sonderzeichen lässt sich in Buchstaben (`bücher.example`) und in ASCII-Schreibweise (`xn--bcher-kva.example`) schreiben; beide werden angenommen und gelten als verschiedene Adressen mit je eigener Grenze. Das bestand schon vorher für alle Domainteile vor der Endung und gilt jetzt auch für die Endung (`xn--p1ai`). Alternative: die Domain vor der Prüfsumme in die ASCII-Schreibweise überführen; dann stünde die Adresse in dieser Form im Nachweis.
- **Entscheidungen des Inhabers, die der Code heute so trifft und die er ändern kann:**
  1. Die Adresse bleibt nach einer Abmeldung in `subscriptions` stehen (als Nachweis, dass frühere Mails zulässig waren), bis Fristen festgelegt sind. Gesendet wird an sie nicht mehr.
  2. Eine abgemeldete Adresse kann sich über das Formular nicht erneut anmelden; die Sperre hebt nur der Inhaber auf. Ob eine neue ausdrückliche Einwilligung die Sperre automatisch aufheben soll, ist offen. Das gilt auch für eine Adresse, die ein Empfänger über den Sperrlink gesperrt hat.
  3. Die IP-Adresse wird nicht gespeichert, auch nicht als Prüfsumme. `config/versand.json` nennt einen „IP-Hash“ als Teil des Nachweises; Voraussetzung A-5 verlangt ihn nicht. Gewählt ist die sparsamere Fassung.
  4. Die Sperrliste hält die SHA-256-Prüfsumme der Adresse ohne geheimen Zusatz. So bleibt sie ohne Schlüssel prüfbar und übersteht einen Anbieterwechsel; bekannte Adressen lassen sich dagegen aber durch Ausprobieren wiedererkennen.
  5. Die Werte unter `grenzen` und in `mailing.settings` (3 Mails je Adresse in 168 Stunden, 50 Bestätigungsmails je Tag, 9 und 150 Versuche, Mengen je Absender) sind Vorschläge.
  6. Bei einer weiteren Anfrage zu einer offenen Anmeldung gelten Sprache und Quelle der ersten Anfrage (Abschnitt 2).
- **Zeitverhalten:** Die Antwort ist für bekannte und unbekannte Adressen gleich, die Dauer nicht (mit Mailversand dauert sie länger). Wer misst, kann daraus schließen, ob eine Mail gesendet wurde.
- **Bestätigungsmail und Sperrliste hängen noch nicht an den Resend-Ereignissen.** Ein harter Rückläufer oder eine Beschwerde trägt sich erst ein, wenn der Empfang der Ereignisse gebaut ist (S-2). Bis dahin kein Kampagnenversand.
- `docs/deployment/environment-variables.md` ist nicht nachgeführt (gebundene Datei); die neuen Variablen stehen in `apps/web/.env.example` und hier.

## 7. Berichtigungen gegenüber der ersten Fassung dieser Notiz

| Stelle | Stand der ersten Fassung | Tatsächlich damals | Jetzt |
|---|---|---|---|
| Abschnitt 2, Punkt 3 | Abmeldung über das Kennzeichen möglich | Das Abmeldekennzeichen erreichte nie einen Empfänger; niemand konnte die Abmeldung auslösen | Sperrlink in jeder Bestätigungsmail, Pflicht in der Bereitschaftsprüfung |
| Abschnitt 3, Nr. 4 | Bestätigungsseite und Abmeldeseite seien Voraussetzung | Geprüft wurde nur der Pfad der Bestätigungsseite; eine Freigabe war nicht an den Wortlaut gebunden | Beide Pfade Pflicht; Freigabe an die SHA-256 des Wortlauts je Sprache gebunden |
| Abschnitt 4 | „in der Datenbank höchstens 3 Bestätigungsmails je unbestätigter Anmeldung“ | Die Zählung begann nach jedem Verfall neu, es gab keine Gesamtgrenze, und ein gescheiterter Versand verbrauchte die Zählung | Zählung je Adress-Prüfsumme über ein Zeitfenster, unabhängig von der Anmeldung; Tagesgrenze; Fehlschläge zählen nicht |
| Abschnitt 4 | „ein bestätigter Nachweis ist unveränderlich“ | Eine Zeile ließ sich direkt als bestätigt einfügen, beim Bestätigen im selben Schritt umschreiben, und mehrere Spalten bestätigter und abgemeldeter Zeilen waren änderbar | Regeln aus der Tabelle in Abschnitt 4, je Lücke eine Gegenprobe im SQL-Test |

Zweite Prüfung (zu `d0a083d`), alle Punkte nachgestellt:

| Befund | Stand davor | Jetzt |
|---|---|---|
| B1 | Der Sperrlink starb mit dem Verfall der Anmeldung; ein Dritter konnte danach wieder Mails auslösen | Kennzeichen je Adress-Prüfsumme, unabhängig von der Anmeldung |
| B2 | Ein Absender (10 je Stunde) schöpfte die Tagesgrenze (50) in gut vier Stunden aus | Grenze je Absender und Tag, Pflicht höchstens ein Viertel der Tagesgrenze; Rest als offene Entscheidung in Abschnitt 6 |
| B3 | Wer sich über den Sperrlink sperrte, blieb dauerhaft im Klartext gespeichert | Die nie bestätigte Zeile wird gelöscht; es bleibt die Prüfsumme auf der Sperrliste |
| B4 | Aufräumen nur bei eingeschaltetem Schalter und vollständigen Freigaben | Auf allen Routen, unabhängig vom Schalter; weiter ohne Zeitplan |
| B5, B10 | Der UTF8-Zwang wirkte nur mit `ON_ERROR_STOP`; ein erneuter Lauf hatte Fenster ohne Sperren | Die Migration ist eine Transaktion |
| B6 | Eine noch nicht abgeschlossene Sperre wurde von der Bestätigung übersehen | Gemeinsame Sperre je Prüfsumme; Hinweis für den Kampagnenweg in Abschnitt 4 |
| B7 | Zählung und Bestätigung vertrauten Uhr und Grenzwerten des Aufrufers | Uhr der Datenbank; strengerer Wert aus Aufrufer und `mailing.settings` |
| B8 | U+200B und U+202E angenommen; Großschreibung in der Datenbank möglich; Kommentar der Migration behauptete Kleinschreibung | Abgelehnt im Handler und in der Datenbank (Großbuchstaben: ASCII); Kommentar berichtigt |
| B9 | Platzhalter im Einwilligungstext blieben ungeprüft | Zählt als Lücke |
| B11 | Fehlschläge gingen unbegrenzt an den Versanddienst | Grenzen für Versuche je Adresse und je Tag |

Beim Schreiben der Gegenproben gefunden und behoben: Ein fehlender Grenzwert wurde von der Datenbank still durch die Obergrenze ersetzt statt abgelehnt.

Dritte Prüfung (zu `6b27c4c`, Urteil „abnahmefähig als Entwurf hinter Schalter“), zwei niedrige Restbefunde, beide nachgestellt:

| Befund | Stand davor | Jetzt |
|---|---|---|
| N-A1 | Schreibvarianten derselben Adresse (abschließender Punkt, leere Domainteile, Punkt am Rand des lokalen Teils, Füllzeichen U+3164 und U+115F, U+FE0F) hatten eigene Prüfsummen und eigene Grenzen: 10 Mails statt 3 | Genau eine angenommene Schreibweise je Adresse, im Handler und in der Datenbank; Rest als offene Entscheidung in Abschnitt 6 |
| N-A2 | Der Löschtrigger der Anmeldungen prüfte nur den Zustand; ein Dienst mit vorgehender Uhr konnte eine noch gültige offene Anmeldung samt Link löschen | Gelöscht wird eine unbestätigte Zeile nur, wenn ihre Frist nach der Uhr der Datenbank abgelaufen ist oder ihre Adresse auf der Sperrliste steht; alles andere bleibt ohne Fehler stehen |

Automatische Durchsicht am 15.11.2026 (Vercel-Bot und Codex zu `d89d3fd`), sechs Hinweise, alle am Code bestätigt und behoben:

| Hinweis | Stand davor | Jetzt |
|---|---|---|
| Endung in ASCII-Schreibweise | Die Formprüfung aus N-A1 lehnte gültige Adressen mit Endungen wie `xn--p1ai` ab | Solche Endungen werden angenommen |
| Kennzeichen nach Speicherfehler | Scheiterte der Speicher, nachdem ein weiteres Kennzeichen eingetragen war, blieb es liegen; nach sieben Störungen gab es bis zum Verfall keine Mail mehr, bei gleicher Antwort `202` | Das Kennzeichen wird zurückgenommen |
| Frist bei der Bestätigung | Der Speicher filterte die Frist mit der Uhr des Dienstes: ging sie vor, galt eine gültige Anmeldung als abgelaufen; ging sie nach, meldete die Bestätigung eine Störung (`503`) statt eines abgelaufenen Kennzeichens | Über die Frist entscheidet allein die Datenbank; eine abgelaufene Anmeldung bleibt ohne Fehler unverändert, die Antwort ist `404` |
| Fehlschlag ohne klaren Ausgang | Jeder Fehlschlag gab die Mailzählung frei; kam die Mail trotzdem an, waren bis zu 9 statt 3 Mails je Adresse möglich | Nur ein sicher nicht erfolgter Versand gibt die Zählung frei (siehe Abschnitt 6, Punkt 8) |
| Betreff | Der Betreff wurde vor dem Versand beschnitten und von Platzhaltern befreit, die Freigabe band aber den unveränderten Text | Der Betreff geht unverändert hinaus; Leerraum am Rand oder ein Platzhalter im Betreff sperrt den Weg |
| Meldung zur Tagesgrenze | Lag die Obergrenze in `mailing.settings` unter dem Wert der Konfiguration, blieb die Meldung `mailing_consent_daily_limit_reached` aus, während die Datenbank schon keine Mail mehr zuließ | Die Meldung richtet sich nach dem strengeren der beiden Werte |

Weiter berichtigt (erste Prüfung): Die Bestätigung prüfte weder Sperrliste noch Freigaben; jede weitere Anfrage entwertete den vorigen Link und überschrieb Sprache, Quelle, Zeitpunkt und Fassung der offenen Zeile; Anmeldung und Bestätigung teilten einen Zähler; Steuerzeichen in der Adresse wurden angenommen.

Diese Datei wird nicht fortgeschrieben; ein neuer Stand bekommt eine neue Datei mit neuem Datum.
