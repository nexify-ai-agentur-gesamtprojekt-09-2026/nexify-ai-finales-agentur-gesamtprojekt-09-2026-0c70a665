# Einwilligungsweg für Werbemails · Betriebsnotiz · 14.11.2026

Register: OA-003 (Anmeldeweg mit Bestätigungsmail und Nachweis), OA-098 (Anmelde-Angebot auf der Website). Paket F aus `PROGRESS.md`, „Offene Arbeiten“.

**Zustand: gebaut hinter Schalter, Standard AUS. Nichts ist eingeschaltet, nichts wurde versendet, keine Migration ist eingespielt.** Diese Notiz ist keine Rechtsberatung. Sie beschreibt, was der Code tut und was vor dem Einschalten vorliegen muss.

Warum es das gibt: Am 14.11.2026 hat das Resend-Konto 1 Kontakt ohne Nachweis, 0 Abmeldethemen und 0 Kampagnen (Messung 20:09 UTC, `get-usage`, `list-topics`, `list-broadcasts`; unverändert gegenüber `mailversand-zustand-2026-11-14.md`). Ohne Anmeldeweg bleibt die Liste der Empfänger mit belegter Einwilligung bei null (`docs/05-marketing/mailing/voraussetzungen-vor-dem-ersten-versand.md`, Abschnitt 0). Dieser Weg ist die technische Voraussetzung dafür, dass sie wachsen kann.

## 1. Was gebaut ist

| Baustein | Ort |
|---|---|
| Anmeldung, Bestätigung, Abmeldung (Handler, Schalter, Bereitschaftsprüfung) | `apps/web/mailing/consent.ts` |
| Speicher (Supabase über PostgREST; Test-Speicher) | `apps/web/mailing/consent-store.ts` |
| Mengenbegrenzung je Absender | `apps/web/mailing/rate-limit.ts` |
| Routen | `apps/web/app/api/mailing/{subscribe,confirm,unsubscribe}/route.ts` |
| Schema `mailing` (drei Tabellen, RLS, Sperren) | `apps/web/supabase/migrations/0005_mailing_consent.sql` |
| Freigaben und Festlegungen des Inhabers | `config/integrations/mailing-consent.json` |
| Tests | `apps/web/auth/tests/mailing-consent.test.mjs`, `mailing-consent-store.test.mjs`, `apps/web/supabase/tests/mailing_consent.sql` |

Wiederverwendet statt neu gebaut: der PostgREST-Client `lib/supabase-rest.ts`, der Mailversand `lib/mailing.ts` (unverändert), der Absenderschlüssel aus `lib/chat-rate-limit.ts`; Aufbau von Speicher, Fehlercodes, Migration und Tests nach dem Muster der Composio-Ablage (`lib/composio-store.ts`, `0004_composio.sql`).

Nicht gebaut: das Anmeldeformular, die Bestätigungsseite und die Abmeldeseite (Oberfläche, entsteht nach `nexify-klon-fabrik`), der Kampagnenversand (OA-106), der Empfang der Resend-Ereignisse für Rückläufer und Beschwerden (Voraussetzung S-2), der Abgleich bestätigter Kontakte in ein Resend-Segment.

## 2. Ablauf

1. **Anmeldung** `POST /api/mailing/subscribe` mit `{ email, lang, consent: true, consent_version, source }`. Gespeichert wird eine unbestätigte Zeile mit Zeitpunkt, Quelle, Fassung und SHA-256 des gezeigten Einwilligungstexts. Es geht genau eine Bestätigungsmail hinaus. Die Antwort ist für jede angenommene Adresse dieselbe (`202 confirmation_pending`), ob neu, schon bestätigt, abgemeldet oder gesperrt.
2. **Bestätigung** `POST /api/mailing/confirm` mit `{ token }`. Der Link in der Mail führt auf die Bestätigungsseite und trägt das Kennzeichen hinter dem `#`; es erreicht den Server erst, wenn die Seite es per POST sendet. Ein bloßer Abruf des Links, etwa durch einen Mailprüfer, bestätigt nichts. Erst danach gilt die Zeile als Einwilligung (`confirmed`, mit Zeitpunkt).
3. **Abmeldung** `POST /api/mailing/unsubscribe?t=<Kennzeichen>`. Erfüllt die Abmeldung mit einem Klick nach RFC 8058 (kein Konto, kein Origin nötig). Reihenfolge in der Datenbank: erst Eintrag auf der Sperrliste, dann der Zustand. Wirkt sofort, ist wiederholbar und **hängt nicht am Schalter**: Wer einmal eine Mail bekommen hat, kann sich auch abmelden, wenn die Anmeldung später abgeschaltet ist.

Eine gesperrte Adresse (Abmeldung, Widerspruch, harter Rückläufer, Beschwerde, von Hand) bekommt keine Mail mehr, auch keine Bestätigungsmail.

## 3. Was vor dem Einschalten vorliegen muss

Die Anmeldung antwortet mit `503`, solange einer dieser Punkte fehlt. Im Protokoll steht dann `{"event":"mailing_consent_not_ready","gaps":[…]}` mit den Kennwörtern der Lücken.

| Nr. | Voraussetzung | Wer | Wo | Heute |
|---|---|---|---|---|
| 1 | Wortlaut der Einwilligung je Sprache, mit Fassung und Freigabe (Name, Datum, Beleg) | Inhaber mit Rechtsberatung | `config/integrations/mailing-consent.json` → `einwilligung` | fehlt (A-2) |
| 2 | Wortlaut der Bestätigungsmail je Sprache mit `{{BESTAETIGUNGSLINK}}`, Freigabe | Inhaber | dieselbe Datei → `bestaetigungsmail` | fehlt; Entwurf `docs/05-marketing/mailing/vorlagen/a-double-opt-in-bestaetigung.md` |
| 3 | Frist, nach der unbestätigte Anmeldungen verfallen (Stunden, höchstens 336) | Inhaber | `bestaetigungsfrist_stunden` | fehlt (A-6) |
| 4 | Bestätigungsseite und Abmeldeseite gebaut, Pfade eingetragen | Agent (Oberfläche) | `seiten` | fehlt |
| 5 | Zulässige Quellen (Formulare), zum Beispiel `preise/checkliste` | Agent mit Inhaber | `quellen` | fehlt |
| 6 | Migration `0005` eingespielt, `PGRST_DB_SCHEMAS` um `mailing` ergänzt, PostgREST neu geladen | Inhaber | Supabase-Instanz | fehlt (OA-029) |
| 7 | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM` | Inhaber | Vercel-Projekt, serverseitig | hier nicht geprüft |
| 8 | `MAILING_PUBLIC_BASE_URL` (nur `https`, nur Ursprung, zum Beispiel die Adresse der Website) | Inhaber | Vercel-Projekt | fehlt |
| 9 | `NEXIFY_MAILING_CONSENT=on` | Inhaber | Vercel-Projekt | aus |

Ein Platzhalter, der in der Bestätigungsmail stehen bleibt (`{{…}}` oder `[GROSSBUCHSTABEN …`), zählt als Lücke: Eine Mail mit unausgefülltem Feld geht nicht hinaus. Ein Text ohne Freigabe zählt nicht als vorhanden.

Reihenfolge beim Einschalten: 6 → 7 → 1 bis 5 (als geprüfter Merge) → 8 → Rauchtest mit einer **eigenen** Adresse (anmelden, Mail prüfen, bestätigen, abmelden, erneut anmelden: keine Mail) → 9 bleibt bis dahin aus und wird erst für den Rauchtest gesetzt.

Rückweg: `NEXIFY_MAILING_CONSENT` löschen und neu ausliefern. Die Anmeldung antwortet dann sofort wieder mit `503`; bestehende Nachweise und die Sperrliste bleiben, Abmeldungen wirken weiter.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f apps/web/supabase/migrations/0005_mailing_consent.sql
# PGRST_DB_SCHEMAS="public,chat,composio,mailing"
```

## 4. Daten und Schutz

| Tabelle (`mailing.`) | Inhalt | Regeln in der Datenbank |
|---|---|---|
| `subscriptions` | Adresse, Sprache, Zustand, Quelle, Fassung und Prüfsumme des Wortlauts, Zeitpunkte, Prüfsumme des Bestätigungskennzeichens, Abmeldekennzeichen | Zustand läuft nur vorwärts; eine Abmeldung ist endgültig; ein bestätigter Nachweis ist unveränderlich; gelöscht werden nur unbestätigte Zeilen |
| `suppressions` | SHA-256 der Adresse, Grund, Zeitpunkt | der Dienst darf nur lesen und anfügen |
| `consent_events` | Verlauf je Prüfsumme (angefragt, erneut gesendet, bestätigt, abgemeldet) | der Dienst darf nur lesen und anfügen; weder Adresse noch Kennzeichen |

- Row-Level-Security ist auf allen drei Tabellen an, ohne Richtlinie. `anon` und `authenticated` haben keine Tabellenrechte.
- Kein Rückfall auf den Arbeitsspeicher: Ohne Supabase gibt es keinen Speicher und die Routen antworten mit `503`. Ein Nachweis, der einen Neustart nicht übersteht, ist keiner.
- Im Protokoll stehen nur Kennwörter und feste Codes, nie Adresse, Prüfsumme, Kennzeichen oder Datenbanktext.
- Missbrauchsschutz: Browser-Aufrufe nur von der eigenen Seite, 3 Anfragen je Minute und 10 je Stunde je Absender (je Funktionsinstanz, also kein verlässlicher Schutz gegen verteilte Aufrufe), und in der Datenbank höchstens 3 Bestätigungsmails je unbestätigter Anmeldung.

## 5. Geprüft

Lokal am 14.11.2026, kein CI-Lauf (GitHub Actions startet kontoweit keine Jobs):

- `node --test apps/web/auth/tests/mailing-consent.test.mjs apps/web/auth/tests/mailing-consent-store.test.mjs`: 31 Tests, 31 bestanden. Darunter Positiv- und Negativprobe aus Voraussetzung A-8 (bestätigt wird bestätigt; unbestätigt, abgelaufen, abgemeldet und gesperrt erhalten nichts).
- `apps/web/supabase/tests/mailing_consent.sql` gegen ein lokales Wegwerf-PostgreSQL 16: Exit 0, Migration zweimal angewendet. Acht absichtlich geschwächte Fassungen der Migration (Löschsperre entfernt, Sperrliste löschbar, Verlauf änderbar, Abmeldung umkehrbar, Nachweis änderbar, RLS aus, `anon` darf lesen, Kennzeichen nach Bestätigung erlaubt) scheitern jeweils am Test.
- Routen gegen den lokalen Produktions-Build: siehe Pull Request, Abschnitt „Prüfung“.

## 6. Nicht belegt und offen

- **Kein Lauf gegen ein echtes PostgREST und keiner gegen die Supabase-Instanz.** Der Speicher ist gegen einen Nachbau geprüft, die Migration gegen ein echtes PostgreSQL; die Verbindung beider über PostgREST ist ungeprüft (das Programm war in der Arbeitsumgebung nicht beziehbar). Der Rauchtest aus Abschnitt 3 steht aus.
- **Kein echter Mailversand.** Der Versand lief nur gegen einen Stellvertreter.
- **Rechtliche Einordnung fehlt** (keine Rechtsberatung): Zulässigkeit der Bestätigungsmail (Hinweis zu A-3/A-4), Aufbewahrungs- und Löschfristen für Nachweise und Sperrliste (N-5), Recht je Zielland (R-1).
- **Entscheidungen des Inhabers, die der Code heute so trifft und die er ändern kann:**
  1. Die Adresse bleibt nach einer Abmeldung in `subscriptions` stehen (als Nachweis, dass frühere Mails zulässig waren), bis Fristen festgelegt sind. Gesendet wird an sie nicht mehr.
  2. Eine abgemeldete Adresse kann sich über das Formular nicht erneut anmelden; die Sperre hebt nur der Inhaber auf. Ob eine neue ausdrückliche Einwilligung die Sperre automatisch aufheben soll, ist offen.
  3. Die IP-Adresse wird nicht gespeichert, auch nicht als Prüfsumme. `config/versand.json` nennt einen „IP-Hash“ als Teil des Nachweises; Voraussetzung A-5 verlangt ihn nicht. Gewählt ist die sparsamere Fassung.
  4. Die Sperrliste hält die SHA-256-Prüfsumme der Adresse ohne geheimen Zusatz. So bleibt sie ohne Schlüssel prüfbar und übersteht einen Anbieterwechsel; bekannte Adressen lassen sich dagegen aber durch Ausprobieren wiedererkennen.
- **Zeitverhalten:** Die Antwort ist für bekannte und unbekannte Adressen gleich, die Dauer nicht (mit Mailversand dauert sie länger). Wer misst, kann daraus schließen, ob eine Mail gesendet wurde.
- **Bestätigungsmail und Sperrliste hängen noch nicht an den Resend-Ereignissen.** Ein harter Rückläufer oder eine Beschwerde trägt sich erst ein, wenn der Empfang der Ereignisse gebaut ist (S-2). Bis dahin kein Kampagnenversand.
- `docs/deployment/environment-variables.md` ist nicht nachgeführt (gebundene Datei); die neuen Variablen stehen in `apps/web/.env.example` und hier.

Diese Datei wird nicht fortgeschrieben; ein neuer Stand bekommt eine neue Datei mit neuem Datum.
