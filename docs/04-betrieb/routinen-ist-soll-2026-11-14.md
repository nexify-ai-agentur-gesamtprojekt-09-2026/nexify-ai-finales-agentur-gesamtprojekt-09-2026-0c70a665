# Routinen und Dauerbetrieb: IST gegen SOLL (Paket I)

Stand: 14.11.2026, Repository `origin/main` auf `2906f58`. Reine Analyse. Es wurde keine geplante Aufgabe angelegt, geändert, ausgelöst oder gelöscht.

Bezug: Register der offenen Arbeiten vom 14.11.2026, Einträge OA-150, OA-156, OA-158.

Kennzeichnung: **SOLL** = gültige Entscheidung oder führender Plan · **IST** = heute gelesen oder gemessen · **HISTORIE** = überholt · **ANNAHME** = Bewertung dieser Analyse · **OFFEN** = fehlt oder nicht belegt.

## 1. Ergebnis in Kürze

1. **IST: Genau eine wiederkehrende Aufgabe ist aktiv**, der „NeXify Regelbetrieb in der Hauptsitzung“ (`CRON_TZ=Europe/Amsterdam 47 3,7,11,15,19,23 * * *`). Sie feuert in eine offene Claude-Sitzung. Endet die Sitzung, endet der Regelbetrieb. Das ist kein dauerhafter Betrieb (so auch `PROGRESS.md:38`).
2. **IST: Der Tagesbericht an den Inhaber ist nie als zugestellt belegt.** Er steht als Schritt 6 im Auftragstext des Regelbetriebs für den Lauf um 07:47; diese Fassung besteht seit 14.11.2026, 10:51 UTC und hat noch keinen 07:47-Lauf erlebt. Das Auftragsregister führt den Bericht um 08:00 Europe/Amsterdam als „nicht nachgewiesen“ (`docs/09-final/auftragsregister-2026-11-08.md:265-267`).
3. **IST: Die Vertragsgrundlagen sagen Kunden einen täglichen Bericht bis 20:00 Uhr zu** (`apps/web/lib/legal/agb.json:70`, § 4.1). Dafür gibt es keine Routine, keinen Auslöser und keinen Zustellweg. Das ist eine zweite, vom Inhaberbericht getrennte Pflicht, sobald ein Kundenprojekt nach Tagessatz läuft.

## 2. Tatsächlicher Stand der geplanten Aufgaben

IST, Abruf über `list_triggers` am 14.11.2026, ca. 18:37 UTC (nur gelesen). Acht Einträge, keine weiteren Seiten.

| Aufgabe | Kennung | Takt | Ziel | Aktiv | Letzter Lauf | Nächster Lauf |
|---|---|---|---|---|---|---|
| NeXify Regelbetrieb in der Hauptsitzung | `trig_01GvGW…ckXn` | `CRON_TZ=Europe/Amsterdam 47 3,7,11,15,19,23 * * *` | offene koordinierende Sitzung | **ja** | 14.11. 14:48:09 UTC, Status „SUCCEEDED“ | 14.11. 18:47 UTC |
| Erinnerung Kundensitzungen (einmalig) | `trig_01NZjC…GnT` | einmalig 14.11. 19:03 UTC | koordinierende Sitzung | ja | – | 19:03 UTC |
| Erinnerung „PR #21 nachsehen“ (einmalig) | `trig_015Dgu…1w2` | einmalig 14.11. 19:08 UTC | andere Sitzung | ja | – | 19:08 UTC |
| Erinnerung „Re-check PR #135“ (einmalig) | `trig_01Woj5…uKN` | einmalig 14.11. 21:25 UTC | andere Sitzung | ja | – | 21:25 UTC |
| NeXify AI Regelbetrieb, Live-Prüfung und Tagesbericht | `trig_019oe1…Jfa` | wie oben | **frische Sitzung je Lauf**, Push an | nein (seit 14.11. 10:51 UTC) | 14.11. 10:47:48 UTC, „SUCCEEDED“ | – |
| NeXify Regelkreis (Nachtlauf) | `trig_015UwQ…tMk` | `CRON_TZ=Europe/Amsterdam 7 1-7 * * *` | frische Sitzung je Lauf, 20 Konnektoren | nein (seit 14.11. 03:04 UTC) | 14.11. 02:07 UTC | – |
| Ziel-Automatik (Regelkreis + PR #74), stündlich | `trig_01G9Xx…rFw` | `16 * * * *` | andere Sitzung | nein (seit 07.11. 21:18 UTC) | 07.11. 21:16 UTC | – |
| Relay-Posteingang prüfen (ORACLE) 9/24 | `trig_01FHKL…RoP` | einmalig, Kette alle 5 Minuten | Sitzung, an ein MacBook gebunden | nein (seit 12.11.) | – | – |

Was die Angaben bedeuten und was nicht:

- „SUCCEEDED“ bei einer Aufgabe, die eine bestehende Sitzung weckt, belegt nur die Zustellung des Weckrufs, nicht das Ergebnis des Laufs (Werkzeugbeschreibung von `list_triggers`). Ob der Lauf um 14:48 UTC die Live-Prüfung zu Ende geführt hat, ist hier **nicht belegt**; `PROGRESS.md:77` führt denselben Punkt offen.
- Die aktive Fassung ist seit 10:51 UTC angelegt und hat bis zum Abruf genau einmal gefeuert.
- Der frühere Regelbetrieb mit frischer Sitzung meldete um 10:47 UTC „SUCCEEDED“ nach 38 Sekunden; laut `PROGRESS.md:38` konnte seine Umgebung das Repository nicht klonen und blieb ohne Live-Prüfung. „SUCCEEDED“ heißt dort also nicht „geprüft“.

Weitere konfigurierte Zeitgeber im Repository (IST):

- `.github/workflows/ci.yml:7-8`: `cron: '17 5 * * 1-5'` (werktags 05:17 UTC). GitHub Actions startet kontoweit keine Jobs (`PROGRESS.md:83`; zuletzt belegt `docs/04-betrieb/befund-2026-11-13.md:160` ff.). Der Zeitplan ist konfiguriert und läuft nicht.
- Keine `crons` in einer `vercel.json`, keine Zeitauslöser in `apps/web/wrangler.jsonc` (Suche am Commit `2906f58`).
- `ops/` enthält nur `ops/hermes/` und `ops/goal/STATE.json`; keine Timer- oder Cron-Dateien.

## 3. Alle geplanten Routinen

Zustand: **läuft** nur mit Beleg eines Laufs; **konfiguriert** = Auslöser vorhanden, Lauf nicht belegt; **nur beschrieben** = steht in einem Dokument.

| Nr. | Routine | Zweck | Takt (SOLL) | Ausführender (SOLL) | Eingabe → Ausgabe | Zustellweg (SOLL) | Heutiger Zustand | Fundstelle |
|---|---|---|---|---|---|---|---|---|
| R1 | Regelbetrieb: Live-Prüfung und Gleichmacher | Erreichbarkeit und Gleichheit der Seiten gegen die Startseite prüfen, kleine Befunde als Entwurfs-PR heilen | alle 4 Stunden | Wächter | `tools/live-check.mjs`, `tools/gleichmacher.mjs` gegen `https://nexifyai.de` → Zahlen, ggf. Entwurfs-PR | Meldung in der Sitzung | **läuft sitzungsgebunden**: 1 zugestellter Weckruf (14:48 UTC), Ergebnis nicht belegt | Abschnitt 2; `PROGRESS.md:38` |
| R2 | Tagesbericht an den Inhaber | Merges, offene PRs, offene Punkte, Kosten | täglich 08:00 Europe/Amsterdam | Wächter | Git-Verlauf, PR-Liste, Prüfzahlen → Bericht, höchstens 15 Zeilen | Kanal und Empfänger benannt, Zustellung verifiziert | **konfiguriert** als Schritt 6 von R1 (07:47), kein Lauf dieser Fassung belegt; Zustellweg OFFEN | `auftragsregister-2026-11-08.md:265-267` |
| R3 | Tagesbericht an Kunden | Leistungsnachweis je Arbeitstag, Grundlage der Tagesabrechnung | Erstellung 19:30, Versand bis 20:00 | Projektleitung, Stichprobe Inhaber | Zeiten, Ergebnisse, offene Punkte → PDF per E-Mail und/oder Kundenportal | E-Mail an den Auftraggeber | **nur beschrieben**; rechtlich zugesagt | `apps/web/lib/legal/agb.json:70`; `docs/01-konzept/myadmin-gesamtplan.md:60`; `docs/01-konzept/companion-produktionsplan.md:58` (W05) |
| R4 | Tagesrhythmus Betrieb | Posteingang und nächtliche Ausnahmen; unbestätigte Zahlungen und Anfragen bei Anbietern; fehlgeschlagene Läufe und Budgetwächter; Abweichungen bei Katalog, Passung, Bestellung, Termin | täglich | Abteilungen D08, D09, D10 | Protokolle, Postfach, Bestellungen → Ausnahmeliste | intern | **nur beschrieben**; `runtime_schedule_created_by_this_definition: false` | `config/operating-model.json:2283-2304` |
| R5 | Wochenrhythmus | Pipeline und geplante Arbeit; Passung, Retouren, Partnerqualität; Quellen- und Rechteabweichung; Wiederherstellungs- und Negativtest | wöchentlich | D01, D03, D07, D08 | wie R4 → Wochenliste | intern | **nur beschrieben** | wie R4 |
| R6 | Monatsrhythmus | Abstimmung und Rechnungsunterlagen; Produktkosten und freigegebene Preise; Zugänge, Aufbewahrung, Anbieterbedingungen; Managemententscheidung | monatlich | D01, D02, D12 | Buchungen, Verträge → Entscheidungsvorlage | intern | **nur beschrieben**; Buchhaltung nicht verbunden (Register OA-159) | wie R4 |
| R7 | TEILEKLAR-Berichte | täglich Katalogimport, Feed-Fehler, hängende Bestellungen; wöchentlich Retourengründe, Passungsfehler; monatlich Quellenaktualität, Preis- und Margenprüfung, Partnerqualität | täglich, wöchentlich, monatlich | D10, D11 | Shop-Daten → Berichte | intern | **nur beschrieben**; Shop-Dienst antwortet mit 503 (gemessen 14.11. 18:42 UTC) | `docs/04-betrieb/betriebslogik-und-prozesse.md:137-139` |
| R8 | Sicherung | Datensicherung des Servers und der Datenbanken | täglich 02:00 | Wächter | Datenbestände → Sicherungsdatei | Meldung bei Fehler | **teilweise belegt, nicht als Routine**: Hostinger führt je Server 4 Backups, neuestes 13.11. 16:45/16:49 UTC; eigene 02:00-Sicherung nicht belegt | `docs/01-konzept/myadmin-gesamtplan.md:146`; `docs/04-betrieb/server-befund-2026-11-14.md:14` |
| R9 | Wiederherstellungstest | Sicherung zurückspielen und prüfen | wöchentlich | Wächter | Sicherung → Prüfprotokoll | intern | **nur beschrieben** | `docs/01-konzept/nexifyai-organisationshandbuch.md:102` |
| R10 | Außenwächter, Überwachung mit Alarm | Ausfall von Website, Shop-Dienst, Server und Fehlererfassung binnen Minuten melden | stündlich; Alarm sofort | Wächter | Erreichbarkeit, Fehlerzahlen → Alarm | Meldung an den Inhaber | **teilweise**: nur R1 alle 4 Stunden; kein Alarm dazwischen. `monitoring-dus` läuft auf dem Server, Inhalt ungeprüft | `myadmin-gesamtplan.md:146`; `server-befund-2026-11-14.md:20` und `:80`; Register OA-156 |
| R11 | Stand halten | `PROGRESS.md`, `DECISIONS.md` nach Merges und Entscheidungen nachführen | je Lauf von R1 | koordinierende Sitzung | Git-Verlauf → Entwurfs-PR | PR | **konfiguriert** als Schritt 5 von R1 | Auftragstext der Aufgabe, Abschnitt 2 |
| R12 | Durchgängige Prüfung (CI) | Tests und Gates je Änderung und werktags | werktags 05:17 UTC | GitHub Actions | Repository → Prüfergebnis | PR-Status | **konfiguriert, läuft nicht** | `.github/workflows/ci.yml:7-8`; `PROGRESS.md:83` |
| R13 | Wissensgraph aktuell halten | Graph nach Änderungen neu bauen | nicht festgelegt | Agent | Repository → `graphify-out/` | keiner | **nur beschrieben**; Einzellauf gemessen (49 s, 12.322 Knoten, siehe `bot-team-ist-soll-2026-11-14.md` Abschnitt 6) | `DECISIONS.md:133-139` |
| R14 | Monatlich Modell-Update und Skill-Aktualität | Modellkennung und Skills gegen den Stand prüfen | monatlich | Wächter | Katalog, Skills → Bericht | intern | **nur beschrieben** | `myadmin-gesamtplan.md:146` |
| R15 | Abrechnung und Mahnung | Rechnung zum Monatsschnitt oder Tagessatz; Mahnung 14 Tage nach Fälligkeit | monatlich; je Fälligkeit | Rechenkern, ab Stufe 2 Inhaber | Journal → Rechnung, Erinnerung | E-Mail an Kunden | **nur beschrieben** | `myadmin-gesamtplan.md:61-62` |
| R16 | Kennzahlenbericht | Stufe-1-Aktionen und neue Befunde täglich; Kennzahlen, Risiken monatlich | täglich 19:30; monatlich | Wächter | Ereignisse → Bericht im Leitstand | Leitstand | **nur beschrieben**; Leitstand ist eine Hülle (`/intern/leitstand`) | `config/kennzahlen.json:15` |
| R17 | Optimieren | Kosten und Erfolg aller Abläufe messen, Vorschlag mit Test | wöchentlich | Agent | Kosten, Ergebnisse → Vorschlag | intern | **nur beschrieben** | `companion-produktionsplan.md:68` (W15) |
| R18 | Factory-Intake | GitLab-Aufgaben mit Kennzeichen einlesen und ausführen | alle 10 Minuten (systemd-Timer auf `srv1941843`) | Server | GitLab-Issues → Ergebnis | GitLab | **NOTIZ, heute nicht belegt**: Dokument beschreibt Dienst und Timer; kein Lesezugriff auf den Server | `docs/04-betrieb/factory-betrieb.md:3-9` |

Widersprüche im SOLL (OFFEN, braucht eine Entscheidung):

- Uhrzeit des Tagesberichts: 08:00 an den Inhaber (`auftragsregister-2026-11-08.md:265`), 19:30/20:00 an Kunden (`agb.json:70`, `myadmin-gesamtplan.md:60`), 19:30 intern (`config/kennzahlen.json:15`; Frage dazu offen in `docs/plans/2026-09-28-agentur-steuerung-design.md:162`). Das sind drei verschiedene Berichte; dieses Dokument trennt sie als R2, R3, R16.
- Orchestrierung der Abläufe: `companion-produktionsplan.md` nennt „n8n (bestehend)“; gültig ist Hermes (D-019). n8n kommt in keinem führenden Dokument vor (Standortbestimmung vom 14.11.2026, Abschnitt 5).
- Intervalle unter einer Stunde verlangen laut `AGENTS.md:195-196` einen „verifiziert laufenden externen Hostinger-Scheduler“. Keiner ist belegt (Register OA-157).

## 4. HISTORIE (OA-158)

Diese Automationen sind überholt oder abgeschaltet und begründen keinen Auftrag:

| Automation | Stand | Beleg |
|---|---|---|
| Lokaler Codex-Fortsetzungsdienst auf dem Mac (LaunchAgent `com.nexify.codex-unified-goal`) | Im Auftragsregister beschrieben; heutiger Lauf nicht belegt | `auftragsregister-2026-11-08.md:51-67`; Laufzeitdaten nur in `ops/goal/STATE.json` |
| Ziel-Automatik, stündlich | abgeschaltet seit 07.11.2026 21:18 UTC | Abschnitt 2 |
| Nachtlauf „Regelkreis“ | abgeschaltet seit 14.11.2026 03:04 UTC; baute Seiten in ein Artefakt, nicht ins Repository | Abschnitt 2 |
| Relay-Abfrage (ORACLE), Kette alle 5 Minuten | abgeschaltet seit 12.11.2026 | Abschnitt 2 |
| Regelbetrieb in eigener Umgebung „Agentur Repo“ | abgeschaltet seit 14.11.2026 10:51 UTC; Umgebung konnte nicht klonen | Abschnitt 2; `PROGRESS.md:38` |
| Wissen einsammeln alle 45 Minuten nach LightRAG (W14) | Plan vom Herbst; Wissensspeicher für das Produkt ist nicht entschieden | `companion-produktionsplan.md:67` (W14) |

## 5. Wo jede Routine dauerhaft laufen sollte

Bewertung der fünf Orte (ANNAHME, mit den belegten Einschränkungen):

| Ort | Heute nutzbar | Einschränkung (IST) |
|---|---|---|
| GitHub Actions | nein | kontoweit kein Jobstart; Abrechnung oder Kontoeinstellung kann nur der Inhaber prüfen (`befund-2026-11-13.md:160` ff.) |
| Geplante Claude-Aufgabe, frische Sitzung je Lauf | ja, mit Vorbehalt | Die frühere Umgebung konnte das Repository nicht klonen. Der aktive Auftragstext sieht für diesen Fall `add_repo` vor; ob das in einer frischen Sitzung trägt, ist **nicht belegt**. Mindesttakt eine Stunde. Eigene Zustellung per Push, auf Wunsch per E-Mail |
| Hermes-Cron | nein | kein Funktionsnachweis, 0 von 7 Schritten ausgeführt; der Gateway liefe für Cron (`ops/hermes/README.md:140`) |
| Server-Cron oder systemd-Timer | nein | keine Shell; Platte von `srv1941843` zu 97 % belegt (`server-befund-2026-11-14.md:12`); jeder Eingriff braucht Freigabe (D-016) |
| Vercel Cron | technisch möglich, heute nicht eingerichtet | bräuchte Produktcode (eine Route) und eine Variable für den Zustellweg; Vercel-Variablen setzt nur der Inhaber |
| Cloudflare Cron | nein | Cloudflare wird als Hosting nicht verfolgt (`AGENTS.md:11-13`) |

Zuordnung je Routine (ANNAHME):

| Routine | Zielort | Zustellweg | Kleinster Schritt heute, ohne neue Zugänge |
|---|---|---|---|
| R1 Regelbetrieb | geplante Claude-Aufgabe mit frischer Sitzung; später GitHub Actions für die reinen Prüfskripte | Push bei Befund | Die koordinierende Sitzung legt eine zweite Aufgabe mit frischer Sitzung an und lässt sie zwei Läufe neben der sitzungsgebundenen laufen; erst nach zwei belegten Läufen die alte abschalten (Abnahme aus Register OA-151) |
| R2 Tagesbericht Inhaber | geplante Claude-Aufgabe mit frischer Sitzung | Push; E-Mail an den Inhaber, wenn er es wünscht | Auftragstext aus Abschnitt 6 verwenden; nach Freigabe des Inhabers anlegen |
| R3 Tagesbericht Kunden | zunächst von Hand durch den Inhaber; später Hermes-Cron je Kundenprojekt | E-Mail über Resend mit eigenem Absender | Vorlage und Pflichtinhalte aus § 4.1 als Dokument festhalten (Paket I-3); kein Versand ohne Freigabe |
| R4–R6 Betriebsrhythmus | Bestandteil des Tagesberichts (R2) als Abschnitte „täglich“, montags „wöchentlich“, am Monatsersten „monatlich“ | wie R2 | In den Auftragstext aufgenommen (Abschnitt 6, Punkt 7) |
| R7 TEILEKLAR-Berichte | Hermes-Cron oder Vercel Cron nach Datenbankanschluss | intern | keiner; hängt am Shop-Dienst (503) |
| R8, R9 Sicherung, Wiederherstellung | Server-Cron | Meldung an den Inhaber bei Fehler | Im Tagesbericht das Datum des neuesten Hostinger-Backups nennen, soweit lesbar |
| R10 Überwachung mit Alarm | externer Wächter außerhalb des eigenen Servers (Sentry-Monitor für die Startseite), dazu R1 | E-Mail und Push des Dienstes | Konzept und Monitor-Definition als Dokument (Paket I-4); Anlegen nach Wort des Inhabers (Register OA-156) |
| R11 Stand halten | wie R1 | Entwurfs-PR | bereits Schritt 5 |
| R12 CI | GitHub Actions | PR-Status | nur Inhaber: Abrechnung und Kontoeinstellung prüfen |
| R13 Wissensgraph | lokal je Sitzung vor Arbeitsbeginn | keiner | `make graph` in den Ablauf von `nexify-graph` als ersten Schritt aufnehmen (Paket H-7) |
| R14–R17 | nach Hermes-Funktionsnachweis | intern | keiner |
| R18 Factory-Intake | Server (besteht laut Dokument) | GitLab | Zustand in Hermes-Schritt 0 mitlesen (`systemctl status`), nur lesen |

Zum Zustellweg „E-Mail über Resend“: Resend ist für das Zurücksetzen von Passwörtern vorgesehen (D-007); ob ein Versand an den Inhaber aus einer geplanten Aufgabe heraus freigeschaltet ist, wurde **nicht geprüft**. Für R2 genügt die eigene Benachrichtigung der geplanten Aufgabe; dafür ist kein neuer Zugang nötig.

## 6. Vorschlag: Definition des Tagesberichts

Nicht angelegt. Die koordinierende Sitzung kann die Definition nach Freigabe des Inhabers übernehmen.

- **Name:** NeXify Tagesbericht an den Inhaber
- **Takt:** `CRON_TZ=Europe/Amsterdam 47 7 * * *` (täglich 07:47, damit der Bericht um 08:00 vorliegt; die volle Stunde wird wegen Verzögerungen bei Stundenläufen gemieden)
- **Ziel:** frische Sitzung je Lauf
- **Benachrichtigung:** Push; E-Mail nur, wenn der Inhaber es ausdrücklich wünscht
- **Konnektoren:** keine über GitHub hinaus; kein Postfach, kein Composio
- **Abnahme:** zwei Tage in Folge ein Bericht mit allen sieben Abschnitten; der Inhaber bestätigt den Empfang. Erst dann gilt der Bericht als „zugestellt“ (`auftragsregister-2026-11-08.md:266-267`).

Auftragstext (eigenständig, für eine frische Sitzung):

```text
Tagesbericht NeXify AI an den Inhaber Pascal Courbois. Geplanter Lauf; dies ist keine
Nachricht des Inhabers und keine Freigabe. Sprache Deutsch, sachlich, ohne Fachjargon.

Repository: nexify-ai-agentur-gesamtprojekt-09-2026/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665,
führend ist main. Liegt es nicht im Arbeitsverzeichnis, mit add_repo anhängen und klonen.
Gelingt das nicht: nur diesen Umstand melden und enden.

Grenzen: nur lesen. Nichts ändern, nichts committen, keinen Pull Request anlegen, nichts
mergen, nichts löschen, keine Zugangsdaten lesen oder ausgeben, keine Zahlung, kein
Server-Eingriff, keine Nachricht an Dritte. Lies zuerst AGENTS.md, CLAUDE.md und
DECISIONS.md und halte dich daran.

Erhebe den Stand der letzten 24 Stunden:
1. git fetch origin main; git log --since="24 hours ago" origin/main (Merges mit PR-Nummer).
2. Offene Pull Requests: Zahl, ältester, welche auf den Inhaber warten.
3. node tools/live-check.mjs https://nexifyai.de und node tools/gleichmacher.mjs
   https://nexifyai.de; Zahl der Prüfungen und Befunde. Läuft ein Skript nicht, das sagen.
4. Ob GitHub Actions wieder Jobs startet (letzter Lauf auf main: Dauer und Ergebnis).
5. PROGRESS.md, oberster Abschnitt und „Braucht den Inhaber“; DECISIONS.md, neue Einträge.

Schreibe den Bericht mit genau diesen sieben Abschnitten, zusammen höchstens 25 Zeilen:
1. Ergebnisse: was seit gestern fertig wurde, je Punkt mit PR-Nummer oder Commit.
2. Owner: wer an welcher offenen Arbeit sitzt (Zweig oder PR), und was niemandem gehört.
3. Tatsächliche Kosten: nur Beträge mit Quelle und Datum. Ohne Beleg schreibe
   „nicht gemessen“ und nenne, welche Quelle fehlt. Keine Schätzung.
4. Risiken: höchstens drei, das dringendste zuerst, mit Fundstelle.
5. Blocker: was auf den Inhaber wartet, je Punkt die konkrete Handlung.
6. Nächste Schritte: höchstens fünf, je mit Owner.
7. Rhythmus: täglich die Prüfzahlen aus Schritt 3 und der Zustand des Shop-Dienstes
   (/api/shop/status, nur Statuscode und Grund). Montags zusätzlich: offene Pull Requests
   älter als sieben Tage. Am Monatsersten zusätzlich: Liste der Punkte, die eine
   Monatsentscheidung brauchen (Preise, Zugänge, Anbieterbedingungen).

Regeln für den Text: Jede Aussage mit Fundstelle (Datei:Zeile, PR-Nummer oder gemessene
Adresse mit Uhrzeit in UTC). Trenne ausdrücklich, was gemessen ist und was aus Dokumenten
übernommen wurde. Bezeichne nichts als „läuft“, was nicht in diesem Lauf gemessen wurde.
Wenn ein Schritt nicht lief, sag das im ersten Satz. Ist die Startseite nicht mit 200
erreichbar, steht das als erste Zeile vor allem anderen.
```

Bemerkungen zum Vorschlag:

- „Tatsächliche Kosten“ wird mit dem heutigen Stand fast immer „nicht gemessen“ lauten: Es gibt keine belegte Kostenquelle im Repository (LLM-Kosten: keine Messung, Standortbestimmung Abschnitt 7). Das ist gewollt; der Bericht soll die Lücke täglich zeigen, statt sie zu füllen.
- Der Bericht liest den Shop-Dienst nur über den Statuscode. Der bekannte 503 wird in einer Zeile wiederholt, nicht ausgebreitet.
- Sobald R2 belegt läuft, entfällt Schritt 6 im Auftragstext des Regelbetriebs (R1); sonst käme der Bericht doppelt. Das ist eine Änderung an einer bestehenden Aufgabe und gehört der koordinierenden Sitzung.

## 7. Als Nächstes vergebbar

Die Pakete überschneiden sich nicht in den Dateien. I-1 und I-2 ändern keine Datei im Repository.

| Paket | Inhalt | Betroffene Dateien | Aufwand | Wer | Fertig, wenn |
|---|---|---|---|---|---|
| I-1 | Tagesbericht aus Abschnitt 6 als geplante Aufgabe mit frischer Sitzung anlegen | keine Datei; geplante Aufgabe | S | koordinierende Sitzung nach Freigabe des Inhabers | zwei Berichte an zwei Tagen, Empfang vom Inhaber bestätigt |
| I-2 | Regelbetrieb in frischer Sitzung neben dem sitzungsgebundenen betreiben und belegen; danach den alten abschalten | keine Datei; geplante Aufgabe | S | koordinierende Sitzung; Zugriff der Umgebung auf das Repository ggf. nur Inhaber | zwei aufeinanderfolgende Läufe mit Zahlen beider Prüfungen |
| I-3 | Kunden-Tagesbericht nach § 4.1: Pflichtinhalte, Vorlage, Ablauf von Hand bis zur Automatisierung, ohne die Rechtstexte zu ändern | neu: `docs/04-betrieb/kunden-tagesbericht-ablauf.md` | S | Agent sofort | Vorlage deckt jeden in § 4.1 genannten Inhalt; Abweichungen zwischen AGB und Plan (19:30/20:00) benannt |
| I-4 | Überwachung mit Alarm: Konzept und Monitor-Definition für Startseite und `/api/shop/status`, Prüfweg für den Alarm | neu: `docs/04-betrieb/ueberwachung-alarm-konzept.md` | M | Agent sofort (Konzept); Anlegen nach Wort des Inhabers | Dokument nennt Dienst, Takt, Empfänger, Testfall „Startseite fällt aus → Meldung binnen Minuten“ |
| I-5 | Betriebsrhythmus aus `config/operating-model.json` als prüfbare Checklisten (täglich, wöchentlich, monatlich) mit Quelle je Punkt | neu: `docs/04-betrieb/betriebsrhythmus-checklisten.md` | S | Agent sofort | jede der 12 Zeilen aus `operating_rhythm` hat Eingabe, Ausgabe, Owner-Abteilung und Beleg |
| I-6 | GitHub Actions: Ursache des kontoweiten Ausfalls klären | keine Datei | S | nur Inhaber | ein Job auf `main` läuft länger als wenige Sekunden und endet mit Ergebnis |
| I-7 | Sicherungen: Bestand lesen (Hostinger-Backups, `/opt/backups`, Factory-Timer) und Wiederherstellungstest planen | neu: `docs/04-betrieb/sicherung-ist-<Datum>.md` | M | Agent nach Zugang: Shell (nur lesen) | Liste der Sicherungen mit Datum und Größe; ein Wiederherstellungstest beschrieben, nicht ausgeführt |

## 8. Nicht geprüft

- Ergebnis des Laufs vom 14.11.2026, 14:48 UTC (nur der Weckruf ist belegt) und des Laufs um 18:47 UTC (nach dem Abruf).
- Ob eine frische Sitzung das Repository über `add_repo` erreicht.
- Ob Resend für Berichte an den Inhaber freigeschaltet ist; ob Push-Meldungen beim Inhaber ankommen.
- Zustand von `monitoring-dus`, des Factory-Timers und eigener Sicherungen auf dem Server (keine Shell).
- Sentry: ob dort bereits ein Monitor für die Startseite besteht.
- `docs/01-konzept/companion-produktionsplan.md` und `docs/04-betrieb/Betriebsbuch.md` wurden nur an den Fundstellen zu Takten gelesen, nicht vollständig.
- `docs/AUTOMATIK-VOLLAUTOMATIK.md` und `docs/automation/` wurden nur nach Taktangaben durchsucht (kein Treffer), nicht gelesen. Weitere Routinen können dort oder in älteren Konzeptdokumenten stehen.
