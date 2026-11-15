# Prozesse der Agentur und vorbereitete Automatisierungen · 15.11.2026

Auftrag: Inhaber Pascal Courbois, 15.11.2026, sinngemäß: „Bei uns müssen ja auch die ganzen Prozesse noch automatisiert werden. Auch das lass parallel laufen.“ Übermittelt durch die koordinierende Sitzung. Umfang: Abläufe von NeXify AI einschließlich TEILEKLAR.shop erfassen, Automatisierungen bauen und einstellen, **ausgeschaltet** übergeben.

Stand: `origin/main` auf `9c9c806`, Zweig `claude/prozess-automatisierung`.

**Zustand: gebaut, getestet, ausgeschaltet. Kein Zeitplan ist angelegt, nichts wurde versendet, kein Server wurde berührt, kein Modell wurde aufgerufen.**

Kennzeichnung: **SOLL** = gültige Entscheidung oder führender Plan · **IST** = im Repository gelesen oder in einem genannten Dokument gemessen · **ANNAHME** = Bewertung dieses Dokuments · **OFFEN** = fehlt oder nicht belegt. Dieses Dokument ändert keine Regel und kein führendes Dokument; `PROGRESS.md`, `DECISIONS.md` und die Arbeitsliste führt die koordinierende Sitzung.

## 1. Kurzfassung

1. **Erfasst:** 17 Abläufe der Agentur (Abschnitt 3). Davon läuft heute keiner belegt automatisch. Fünf sind teilweise gebaut, aber in Produktion ohne Wirkung, weil der Shop-Dienst nicht gebunden ist (503) oder ein Zustellweg fehlt.
2. **Gebaut, alle aus:** vier Automatisierungen in `ops/automatisierung/`, ohne neuen Dienst und ohne Modellaufruf:
   - **A1 Tagesbericht** an den Inhaber, ein Bericht je Tag.
   - **A2 Außenwächter**, prüft die Erreichbarkeit der eigenen Adressen, ein Alarm je Störung.
   - **A3 Anfrage-Nachverfolgung**, aus jeder Anfrage wird ein Vorgang mit Antwortfrist und interner Erinnerung.
   - **A4 Fristen und Zugänge**, Wiedervorlage für datierte Fristen und für Zugänge, deren Erneuerung fällig ist.
3. **Einschalten** heißt je Automatisierung: einen Wert in `config/prozess-automatisierung.json` auf `true` setzen, eine Umgebungsvariable auf `ein` setzen, einen Zeitplan anlegen (Abschnitt 6). Jede lässt sich vorher mit Testdaten probelaufen, ohne Schalter und ohne Netz.
4. **Ehrliche Grenze:** Ohne dauerhaft laufenden Ort (Server-Zeitgeber oder Hermes-Cron) läuft nichts davon rund um die Uhr. In einer geplanten Claude-Aufgabe mit frischer Sitzung trägt nur der Tagesbericht, und auch der nur in verkürzter Form (Abschnitt 7).
5. **Nicht gebaut, sondern vorgeschlagen:** der eigene Empfänger für Anfragen in `apps/web` (Master-Audit L14), weil er das gebundene Formular und die laufende Arbeit an den Seiten berührt (Abschnitt 8).
6. **Beim Inhaber:** sieben Entscheidungen (Abschnitt 9).

## 2. Grundlagen

Gelesen und angewendet: `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md` (D-013, D-014, D-016, D-017, D-019, D-021), `config/loesungsregister.json`, `config/operating-model.json` (Abläufe OM-01 bis OM-15, Rhythmus), `config/automation.json`, `docs/04-betrieb/routinen-ist-soll-2026-11-14.md` (Routinen R1 bis R18, Zeitpläne), `docs/04-betrieb/betriebslogik-und-prozesse.md`, `docs/04-betrieb/anfrageweg-befund-2026-11-14.md`, `docs/04-betrieb/mailversand-zustand-2026-11-14.md`, `docs/04-betrieb/werkstattservice-und-suite-ist-soll-2026-11-14.md`. Von anderen Zweigen nur gelesen: Master-Audit (`claude/master-audit`, `docs/09-final/master-audit-2026-11-15.md`, Lückenplan L0 bis L24), Zielkunden-Recherche (`claude/zielkunden-recherche`, Bausteine `LIB-NX-*` und `LIB-TK-*`), Einwilligungsweg (PR 186), Hermes-Arbeitsbereich (PR 193), Terminlogik (PR 195), Cognee (PR 197). Deren Code ist hier nicht geändert und nicht übernommen.

Rollen, wie sie heute belegt sind:

| Rolle | SOLL | IST |
|---|---|---|
| Inhaber | gibt Ziele, Design und Freigaben (D-014, D-017) | einzige Person mit Zugang zu Konten, Zahlungen, DNS, Servern |
| AIFly ORACLE | koordiniert (D-014) | geplante Rolle; kein eigener laufender Prozess belegt. Koordiniert wird durch offene Claude-Sitzungen |
| Hermes / NeX | Orchestrierungs-Laufzeit, NeX führt aus (D-019) | Container läuft auf dem Server (Lösungsregister: „läuft belegt“); Funktionsnachweis und Modellschlüssel fehlen (Master-Audit L21), kein Auftrag ist je durch Hermes gelaufen |
| Fachagenten | arbeiten je Auftrag in eigenem Zweig | Claude-Sitzungen; aktiv nur, solange eine Sitzung offen ist (Master-Audit L20) |

Eine geplante Rolle ist kein aktiver Agent. Wo unten „Hermes“ als Ausführender steht, ist das SOLL.

## 3. Prozesslandkarte

Stand heute: **händisch** = ein Mensch oder eine offene Sitzung tut es · **teilweise** = Code vorhanden, in Produktion ohne belegte Wirkung · **fehlt** = weder Code noch Ablauf · **automatisch** = läuft ohne Zutun und ist belegt (kommt nicht vor).

Systemzustand in Klammern nach `config/loesungsregister.json`, Stand 14.11.2026.

| Nr. | Ablauf | Auslöser | Schritte | Rollen | Systeme | Daten | Stand heute | Fundstelle | Vorbereitet |
|---|---|---|---|---|---|---|---|---|---|
| P01 | Anfrage / Lead | Formular auf `/kontakt`, `/teileklar/termine`, `/teileklar/gutscheine`, `/teileklar/partner-werden`; E-Mail | Eingang, Vorgangsnummer, interne Benachrichtigung, Antwort | Inhaber antwortet | Shop-Dienst auf Vercel (läuft belegt, antwortet 503), MongoDB (läuft unbelegt), Resend (läuft belegt), HubSpot (Rolle unklar) | Name, Adresse, Anliegen | **teilweise**: Empfänger gebaut (`requests_api.py`), in Produktion 503; es bleibt der Verweis auf das Postfach. Eine Anfrage aus einem Browser ist für 07.–14.11. nicht verzeichnet | `anfrageweg-befund-2026-11-14.md`; Master-Audit L13, L14 | **A3** (Nachverfolgung); Empfänger als Vorschlag, Abschnitt 8 |
| P02 | Erstgespräch / Termin | Wunsch des Interessenten | Termin finden, bestätigen, erinnern | Inhaber | Google Workspace (läuft belegt, Rolle unklar) | Kontaktdaten, Zeit | **händisch**; ein Buchungsweg für die Agentur ist im Repository nicht belegt (OFFEN) | – | A3 führt die Art `erstgespraech`; mehr nicht |
| P03 | Angebot / Audit | Anfrage oder Chat | Anforderungsprofil, Angebot, Annahme | Inhaber gibt frei; Agent bereitet vor | Supabase-Schema `chat` (Instanz läuft unbelegt) | Angebot, Preise | **teilweise**: Routen `api/offers/[id]` und `…/order`, Migration `0001_chat_offers_orders.sql`; Preise und Rechtstexte nur durch den Inhaber (D-017) | `apps/web/app/api/offers/`; D-013; Zielkunden-Recherche LIB-NX-01 | nichts; Preisfreigabe offen |
| P04 | Auftrag und Projektlieferung | Angenommenes Angebot | Zweig, Umsetzung, Prüfung, Entwurfs-PR, Merge, Auslieferung | Fachagenten bauen, koordinierende Sitzung mergt, Inhaber nimmt ab | GitHub (läuft belegt), GitHub Actions (defekt), Vercel (läuft belegt) | Code, Belege | **händisch mit festen Regeln** (`nexify-zweig-und-pr`); CI startet nicht (Master-Audit L7) | `.claude/skills/`; `routinen-ist-soll` R12 | nichts; hängt am Inhaber (L7) |
| P05 | Abnahme | Lieferung | Prüfkette, Abnahmeprotokoll | Inhaber, Kunde | Repository | Belege | **händisch** | `docs/07-abnahme/` | nichts |
| P06 | Rechnung und Zahlungseingang (Agentur) | Monatsschnitt, Tagessatz, Fälligkeit | Rechnung, Zahlungsabgleich, Mahnung nach 14 Tagen | Inhaber | Buchhaltung nicht verbunden; Revolut (läuft unbelegt) | Beträge, Kundendaten | **fehlt** (nur beschrieben) | `routinen-ist-soll` R6, R15 | nichts: Geld und Kundenversand sind nicht freigegeben; **A4** kann Fälligkeiten als Termine führen |
| P07 | Tagesbericht an Kunden | Arbeitstag in einem Projekt nach Tagessatz | Bericht bis 20:00 | Projektleitung, Inhaber | Resend | Leistungen je Kunde | **fehlt**, in den Vertragsgrundlagen zugesagt | `routinen-ist-soll` R3 (`agb.json:70`) | nichts: Versand an Kunden; Kundendaten gehören ins Kundenrepository |
| P08 | Support / Care | Meldung eines Kunden | Annahme, Antwort, Lösung | Inhaber | Postfach; Sentry (läuft unbelegt) | Kundendaten | **händisch**; Umfang und Preis des Care-Pakets offen | Zielkunden-Recherche LIB-NX-07 | **A2** liefert die Grundlage „Ausfall bemerken“ |
| P09 | Einwilligung und Mailing | Anmeldung auf der Website | Anmeldung, Bestätigungsmail, Nachweis, Abmeldung, Kampagne | Inhaber gibt Wortlaute frei | Resend (läuft belegt), Supabase (läuft unbelegt) | Adresse, Einwilligung | **fehlt** auf `main`; als Entwurf gebaut hinter Schalter (PR 186); 0 Einwilligungen | Master-Audit L15; `mailversand-zustand-2026-11-14.md` | nichts Eigenes: PR 186 ist der Weg, hier nur Verweis |
| P10 | Shop: Bestellung, Zahlung, Versand | Kauf im Shop | Warenkorb, Kasse, Revolut, Weitergabe an Lieferant, Sendungsverfolgung, Mails | Inhaber | Shop-Dienst (503), MongoDB, Revolut, BigBuy (defekt) | Bestellung, Adresse, Zahlung | **teilweise**: Kasse, Zahlungs-Webhook, Lieferantenauftrag, Postausgang mit Wiederholungsschutz sind gebaut; Produktion ohne Funktion | `apps/shop-api/shop/checkout_api.py`, `fulfillment.py`, `mailer.py`; Master-Audit L13, L22 | nichts: hängt an Bindung des Dienstes und an D-013 |
| P11 | Shop: Sortiment, Lieferantenabgleich, Retoure | Import, Feed-Fehler, Rücksendung | Import, Preisfreigabe, Abgleich, Retoure | Inhaber gibt Preise frei | BigBuy (defekt), Shop-Dienst | Katalog, Preise | **teilweise**: Import und Preisfreigabe gebaut (`admin_api.py`, `bigbuy_import.py`); **Retoure fehlt** im Code | `betriebslogik-und-prozesse.md` (Zielbild, „kein laufender Betrieb“) | nichts |
| P12 | Werkstatt-Partner und Werkstatttermin | Suche, Terminwunsch, Bewerbung als Partner | Suche, Anfrage, Bestätigung durch die Werkstatt | Werkstatt entscheidet | Shop-Dienst | Fahrzeug, Kontakt | **teilweise**: Verzeichnis und Anfrage ohne Zustandsfolge (`workshops_api.py`); Terminlogik als Entwurf (PR 195) | `werkstattservice-und-suite-ist-soll-2026-11-14.md`; LIB-TK-03, LIB-TK-04 | A3 führt die Arten `werkstatt-termin` und `partner-werden` |
| P13 | Tagesbericht an den Inhaber (08:00) | Zeitplan | Stand erheben, zustellen | Wächter (SOLL) | geplante Claude-Aufgabe | Git, Prüfzahlen | **händisch/sitzungsgebunden**: als Schritt des Regelbetriebs konfiguriert, Zustellung nie belegt | `routinen-ist-soll` R2 | **A1** |
| P14 | Überwachung und Alarm | Zeitplan; Ausfall | prüfen, melden | Wächter (SOLL) | `tools/live-check.mjs`; `monitoring` auf dem Server (läuft belegt, Inhalt ungeprüft); Sentry (läuft unbelegt) | Statuscodes | **teilweise**: alle 4 Stunden in einer offenen Sitzung, kein Alarm dazwischen | `routinen-ist-soll` R1, R10; Master-Audit L20 | **A2** |
| P15 | Sicherung und Wiederherstellung | täglich; wöchentlicher Rückspieltest | sichern, zurückspielen, prüfen | Wächter (SOLL) | Hostinger-Backups (4 je Server belegt), Cloudflare R2 (läuft belegt) | Datenbestände | **teilweise**: Backups des Anbieters; eigene Sicherung und Rückspieltest nicht belegt | `routinen-ist-soll` R8, R9; Master-Audit L0, L1 | nichts: Servereingriff (D-016); **A4** kann Ablauftermine führen |
| P16 | Zugänge und Fristen | Zugang offengelegt, Erneuerung fällig, Vertrag oder Sicherung läuft ab | widerrufen, erneuern, Register nachführen | nur der Inhaber | Lösungsregister | Bezeichnungen, keine Werte | **händisch**: 17 Zugänge im Register als fällig oder offengelegt geführt (gezählt am 15.11.2026 mit `fristen.faellige_zugaenge`) | `docs/04-betrieb/loesungsregister.md` | **A4** |
| P17 | Wissenspflege und Stand halten | Merge, Entscheidung | führende Dokumente, Wissensgraph, Gedächtnis | koordinierende Sitzung | Graphify (läuft belegt), Cognee (defekt, Entwurf PR 197) | Dokumente | **händisch** (`nexify-stand-halten`, `make graph`) | `routinen-ist-soll` R11, R13 | nichts: führende Dokumente gehören der koordinierenden Sitzung |

OFFEN und deshalb nicht in der Karte: Personal und Lohn, Einkauf, Affiliate (OM-10), Steuern. Dazu gibt es im Repository nur Rollenbeschreibungen ohne Ablauf.

## 4. Vorhandene Zeitpläne (keine Doppelung)

IST laut `routinen-ist-soll-2026-11-14.md`, Abruf 14.11.2026 ca. 18:37 UTC. **In dieser Arbeit nicht neu abgerufen**; vor dem Anlegen eines Zeitplans ist die Liste neu zu lesen (Einschaltliste, Schritt 1).

| Zeitgeber | Zustand | Bedeutung für diese Automatisierungen |
|---|---|---|
| „NeXify Regelbetrieb in der Hauptsitzung“, alle 4 Stunden | aktiv, an eine offene Sitzung gebunden | enthält die Live-Prüfung und als Schritt 6 den Tagesbericht um 07:47. **Wird A1 eingeschaltet, muss Schritt 6 dort entfallen**, sonst gibt es zwei Berichte |
| ältere geplante Aufgaben (Nachtlauf, stündliche Ziel-Automatik, Relay-Abfrage, Regelbetrieb in eigener Umgebung) | abgeschaltet | Historie, nicht wieder einschalten |
| GitHub Actions `ci.yml`, werktags 05:17 UTC | konfiguriert, läuft nicht (L7) | kein Laufort für Automatisierungen |
| Vercel Cron | keiner eingerichtet | geprüft im Test: keine `crons` in `vercel.json` |
| Zeitgeber auf dem Server (Factory-Intake) | nur in einem Dokument beschrieben, heute nicht belegt | vor dem Einspielen eigener Zeitgeber am Server nachsehen |
| Hermes-Cron | nicht eingerichtet | Laufort erst nach Funktionsnachweis |

Dieser Zweig legt keinen Zeitgeber an. Die Definitionen liegen als Dateien in `ops/automatisierung/definitionen/` und stehen dort, wo nichts sie von selbst ausführt (ein Test prüft das).

## 5. Reihenfolge und Begründung

Maßstab sind die Prioritäten des Inhabers: Risiko → verkaufsfähiger Auftritt und Arbeitsplatz → echte Kundenwege, Leads, Umsatz → Kundenprojekte → Betrieb. Gewählt wurde, was die größte Wirkung hat **und** ohne neuen Dienst, ohne Livegang und ohne Versand an Dritte vorbereitet werden kann.

| Rang | Automatisierung | Priorität | Warum an dieser Stelle |
|---|---|---|---|
| 1 | **A2 Außenwächter** | Risiko | Fällt die Website aus, erfährt es heute bis zu vier Stunden niemand, und nur, wenn eine Sitzung offen ist (L20). Ein Auftritt, der unbemerkt ausfällt, ist nicht verkaufsfähig |
| 2 | **A4 Fristen und Zugänge** | Risiko | 17 Zugänge stehen als fällig oder offengelegt im Register; der Ablauf des Server-Snapshots (L0) war eine Frist, die niemand automatisch im Blick hatte |
| 3 | **A1 Tagesbericht** | Arbeitsplatz | vom Inhaber seit dem 08.11. verlangt, nie als zugestellt belegt; bündelt die Lage der anderen drei an einer Stelle |
| 4 | **A3 Anfrage-Nachverfolgung** | Leads, Umsatz | Eine Anfrage, die drei Tage liegt, ist ein verlorener Auftrag. Wirkt erst, wenn Anfragen irgendwo gespeichert ankommen (L13/L14); deshalb Rang 4 trotz Umsatzbezug |

Bewusst nicht gewählt: P06 (Geld), P07 und P09 (Versand an Dritte; P09 ist mit PR 186 schon gebaut), P10/P11 (hängen an der Bindung des Shop-Dienstes und an D-013), P15 (Servereingriff), P17 (führende Dokumente).

## 6. Die vier Automatisierungen

Gemeinsam für alle (`ops/automatisierung/kern.py`, `zustellung.py`):

- **Schalter:** wirkt nur, wenn `aktiv: true` in `config/prozess-automatisierung.json` **und** die Umgebungsvariable genau `ein` ist **und** `NEXIFY_AUTO_NOTAUS` leer ist. Aus heißt: kein Abruf, keine Mail, keine Datei, nicht einmal der Zustandsordner wird angelegt.
- **Idempotenz:** jede Wirkung hat einen Schlüssel; derselbe Schlüssel führt höchstens einmal zum Erfolg (SQLite, Primärschlüssel; gleichzeitige Läufe entscheidet die Datenbank).
- **Begrenzte Wiederholung:** höchstens 3 Versuche je Wirkung, mit wachsender Pause; abgebrochene Läufe zählen mit. Danach endgültig fehlgeschlagen, kein weiterer Versuch.
- **Fehlerweg:** endgültige Fehlschläge stehen in `fehler.jsonl` und im Tagesbericht, Abschnitt 6. Die Befehlszeile endet dann mit Exit 1.
- **Protokoll:** `protokoll.jsonl`, eine Zeile je Entscheidung; ohne Namen, Adressen, Schlüssel.
- **Kostenbremse:** Obergrenze der Wirkungen je Automatisierung und Tag; für Mails zusätzlich eine gemeinsame Tagesgrenze (12), weil das Versandkonto mit den Transaktionsmails und einem Kundenprojekt geteilt ist. Eine fehlende oder unsinnige Grenze schaltet die Automatisierung ab, nicht den Schutz. Modellaufrufe: 0.
- **Zustellung:** `datei` (Meldung im Zustandsordner unter `ausgang/`) und `resend_intern` (Textmail an genau eine interne Adresse aus einer Variable; eigener Schalter, Standard aus). Ein Empfänger ist kein Parameter der Automatisierungen; an Kunden oder Dritte kann dieser Code nicht senden.
- **Modell:** vorbereitet ist nur die Bindung (`deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`, keine Ersatzmodelle, `aufrufe_erlaubt: false`). Kein Modul enthält einen Modellaufruf; eine abweichende Bindung lässt die Konfiguration nicht laden.

Gemeinsamer Rückweg, in dieser Reihenfolge wirksam: `NEXIFY_AUTO_NOTAUS=1` setzen (sofort, alle) · Variable der Automatisierung leeren · `aktiv` auf `false` · Zeitplan abschalten. Der Zustandsordner bleibt liegen; gelöscht wird nichts.

Gemeinsamer Probelauf (ohne Schalter, ohne Netz, schreibt nur in den genannten Ordner):

```bash
python3 ops/automatisierung/cli.py status
python3 ops/automatisierung/cli.py probe waechter     --ausgabe /tmp/probe --eingabe ops/automatisierung/beispiele/waechter-antworten.json   # zweimal ausführen
python3 ops/automatisierung/cli.py probe anfragen     --ausgabe /tmp/probe --eingabe ops/automatisierung/beispiele/anfragen-ereignisse.json
python3 ops/automatisierung/cli.py probe fristen      --ausgabe /tmp/probe
python3 ops/automatisierung/cli.py probe tagesbericht --ausgabe /tmp/probe --eingabe ops/automatisierung/beispiele/tagesbericht-merges.json
```

Ergebnis: Meldungen als Dateien unter `/tmp/probe/ausgang/<kennung>/`.

### A1 · Tagesbericht an den Inhaber

| | |
|---|---|
| Auslöser | Zeitplan täglich 07:47 Europe/Amsterdam |
| Inhalt | Merges auf `main` (24 Stunden), offene Pull Requests (nur wenn eine Liste übergeben wird), Lage des Wächters, offene und überfällige Anfragen, fällige Zugänge und Fristen, fehlgeschlagene Automatisierungen, Schalterstände. Was keine Quelle hat, steht als „nicht erhoben“, nicht als Null. Höchstens 60 Zeilen |
| Idempotenz | ein Bericht je Kalendertag nach Europe/Amsterdam; ein zweiter Auslöser erhebt nicht einmal neu |
| Akzeptanz | (1) aus = keine Wirkung; (2) mehrere Auslöser am Tag = ein Bericht, eine Mail; (3) Tageswechsel nach Ortszeit; (4) fehlende Quellen sichtbar; (5) Lage und Fehler der anderen Automatisierungen erscheinen |
| Test | `TagesberichtTests` (5), `SchalterAusTests` |
| Risiko | gering. Der Bericht ist nur so vollständig wie der Zustandsordner am Laufort (Abschnitt 7). Kosten werden nicht erhoben, weil keine Kostenquelle angebunden ist |
| Läuft nachweislich, wenn | an zwei aufeinanderfolgenden Tagen ein Bericht mit allen acht Abschnitten vorliegt und der Inhaber den Empfang bestätigt (Kriterium aus `auftragsregister-2026-11-08.md`) |

Einschaltliste: (1) vorhandene Zeitpläne lesen; im bestehenden Regelbetrieb den Schritt „Tagesbericht“ entfernen lassen. (2) Probelauf. (3) `aktiv: true` beim Eintrag `tagesbericht`. (4) Am Laufort `NEXIFY_AUTO_TAGESBERICHT=ein`. (5) Zeitplan nach `definitionen/geplante-aufgaben.json` oder `definitionen/systemd/` anlegen. (6) Für Mail zusätzlich: `zustellung.resend_intern.aktiv: true`, `NEXIFY_AUTO_MAIL_INTERN=ein`, `NEXIFY_AUTO_INTERN_AN`, `RESEND_FROM`, `RESEND_API_KEY` am Laufort.

### A2 · Außenwächter

| | |
|---|---|
| Auslöser | Zeitplan stündlich |
| Was er tut | ruft vier feste https-Adressen ab und liest nur den Statuscode: Startseite und Kontaktseite von `nexifyai.de`, Startseite von `nexifyai.cloud`, dazu den Anfrage-Endpunkt des Shop-Dienstes. Der Endpunkt ist als bekannter Befund markiert (503 nach L13/L14): Er erscheint im Tagesbericht, löst aber keinen Alarm aus |
| Idempotenz | ein Fehlversuch ist ein Verdacht; ab zwei aufeinanderfolgenden Fehlversuchen eine Störung. Je Ziel und Störungsbeginn ein Alarm, je beendeter Störung eine Entwarnung |
| Akzeptanz | (1) aus = kein Abruf; (2) dieselbe Störung meldet über beliebig viele Läufe einmal; (3) Zeitüberschreitung und Netzfehler gelten als „keine Antwort“ und brechen den Lauf nicht ab; (4) bekannter Befund ohne Alarm; (5) höchstens 8 Meldungen je Tag |
| Test | `WaechterTests` (5) |
| Risiko | Läuft der Wächter auf dem Server, den er mitüberwacht, bleibt er beim Ausfall dieses Servers stumm; die überwachten Adressen liegen bei Vercel, also außerhalb. Er prüft nur „antwortet“, nicht den Inhalt; `tools/live-check.mjs` und `tools/gleichmacher.mjs` bleiben nötig. Erreicht die Tagesgrenze eine Alarmflut, entfallen weitere Alarme dieses Tages (sie stehen im Protokoll und im Tagesbericht) |
| Läuft nachweislich, wenn | 24 Läufe in 24 Stunden im Protokoll stehen und ein absichtlich falsch gesetztes Testziel nach zwei Läufen genau einen Alarm und nach der Korrektur genau eine Entwarnung ausgelöst hat |

Einschaltliste: (1) vorhandene Zeitgeber am Laufort lesen. (2) Probelauf zweimal. (3) `aktiv: true` beim Eintrag `waechter`. (4) `NEXIFY_AUTO_WAECHTER=ein` und `NEXIFY_AUTO_ZUSTAND` auf einen dauerhaften Ordner. (5) Zeitplan stündlich. (6) Mail wie bei A1. Ist der Shop-Dienst gebunden, `nur_bericht` beim vierten Ziel entfernen.

### A3 · Anfrage-Nachverfolgung

| | |
|---|---|
| Auslöser | Ereignis `anfrage.eingegangen` vom Empfänger der Anfrage (heute als Ereignisdatei), dazu ein Zeitplan werktags stündlich für die Fristen |
| Was sie tut | legt je Anfragekennung einen Vorgang an, zählt Werktage (Montag bis Freitag, ohne Feiertage) und erinnert intern nach 1 und nach 3 Werktagen ohne Antwort. `anfrage.beantwortet` beendet den Vorgang |
| Was sie nicht tut | Sie empfängt keine Anfrage und antwortet niemandem. Gespeichert werden nur Kennung, Art, Eingangszeit und Zustand. Ein Ereignis mit weiteren Feldern (Name, Adresse, Text) wird abgelehnt, nicht gekürzt übernommen |
| Idempotenz | ein Vorgang je Kennung; je Vorgang und Stufe eine Erinnerung; nach der letzten Stufe keine weitere |
| Akzeptanz | (1) aus = nichts gespeichert; (2) doppeltes Ereignis = ein Vorgang, eine Erinnerung je Stufe; (3) beantwortet = keine Erinnerung mehr; (4) Wochenende zählt nicht; (5) personenbezogene oder fehlerhafte Ereignisse abgelehnt und in keiner Datei zu finden |
| Test | `AnfragenTests` (5) |
| Risiko | Wirkt nur, wenn ein Empfänger Ereignisse liefert. Solange der Shop-Dienst 503 antwortet und Anfragen nur im Postfach ankommen, gibt es keine Ereignisse. Die Antwortfrist von 1 Werktag stammt aus dem Zielbild der Betriebslogik und ist ein Vorschlag |
| Läuft nachweislich, wenn | eine Testanfrage über den gewählten Empfänger als Vorgang erscheint, nach Fristablauf genau eine Erinnerung kommt und nach „beantwortet“ keine mehr |

Einschaltliste: (1) Entscheidung 9.2 (welcher Empfänger). (2) Der Empfänger schreibt je Anfrage eine Ereigniszeile ohne personenbezogene Felder; im Shop-Dienst ist die passende Stelle `requests_api.py` (`record_notification`), das ist dort noch nicht gebaut. (3) Probelauf. (4) `aktiv: true`, `NEXIFY_AUTO_ANFRAGEN=ein`, dauerhafter Zustandsordner. (5) Zeitplan. Antwortgerüst für den Inhaber: `vorlagen/antwort-entwurf.md` (Entwurf, nichts wird versendet).

### A4 · Fristen und Zugänge

| | |
|---|---|
| Auslöser | Zeitplan täglich, vor dem Tagesbericht |
| Was sie tut | (a) liest aus dem Lösungsregister die Zugänge, die als offengelegt oder zur Erneuerung fällig geführt sind, und meldet die Liste einmal je Kalenderwoche, nur mit Bezeichnung; (b) führt datierte Fristen aus der Liste `termine` in der Konfiguration: Vorwarnung 7 Tage vorher, am Fälligkeitstag, danach einmal je Woche |
| Idempotenz | je Eintrag und Stufe eine Meldung |
| Akzeptanz | (1) aus = nichts gelesen; (2) jede Stufe einmal; (3) nur fällige Zugänge, nur Bezeichnungen; (4) ungültiger Termin wird abgelehnt und protokolliert, nicht geraten |
| Test | `FristenTests` (4) |
| Risiko | gering. Die Liste `termine` ist leer; sie wirkt nur, wenn jemand Fristen einträgt (Format: `{"id": "…", "titel": "…", "faellig": "JJJJ-MM-TT", "quelle": "…"}`). Die Meldung ersetzt nicht das Widerrufen eines Schlüssels |
| Läuft nachweislich, wenn | ein Testtermin mit Fälligkeit in drei Tagen genau eine Vorwarnung und am Tag selbst genau eine Meldung erzeugt hat |

Einschaltliste: (1) Probelauf. (2) Bekannte Fristen eintragen lassen (Vorschlag: Ablauf von Sicherungen, Vertrags- und Tarifenden, Zahlungsfristen). (3) `aktiv: true`, `NEXIFY_AUTO_FRISTEN=ein`, dauerhafter Zustandsordner. (4) Zeitplan.

## 7. Was ohne dauerhaften Laufort nicht rund um die Uhr läuft

Ein Schalter und eine Datei im Repository sind kein laufender Prozess. Drei der vier Automatisierungen brauchen einen Ordner, der zwischen den Läufen erhalten bleibt (Buch der Wirkungen, Störungszustand, Vorgänge).

| Laufort | Tagesbericht | Wächter, Anfragen, Fristen | Stand |
|---|---|---|---|
| geplante Claude-Aufgabe, frische Sitzung je Lauf | ja, verkürzt: Git und Lösungsregister; die übrigen Abschnitte „nicht erhoben“. „Einmal je Tag“ sichert dann nur der Zeitplan | **nein**: ohne dauerhaften Ordner käme derselbe Alarm bei jedem Lauf, und die Schwelle von zwei Fehlversuchen griffe nie | einzige Möglichkeit ohne Server; Mindesttakt eine Stunde; ob eine frische Sitzung das Repository zuverlässig bekommt, ist nach `routinen-ist-soll` nicht belegt |
| geplante Claude-Aufgabe in eine offene Sitzung | ja, solange die Sitzung lebt | ja, solange die Sitzung und ihr Ordner leben | kein Dauerbetrieb (L20) |
| Zeitgeber auf dem Server (`definitionen/systemd/`) | ja | ja | Vorlagen liegen vor; Einspielen braucht die Freigabe je Schritt (D-016), eine Shell und Platz auf der Platte (97 % belegt, L2) |
| Hermes-Cron | ja | ja | erst nach dem Funktionsnachweis von Hermes; die Cron-Schreibweise von Hermes ist hier nicht geprüft, deshalb liegt dafür keine Datei vor |
| GitHub Actions | – | – | startet keine Jobs (L7) und hätte ebenfalls keinen dauerhaften Ordner |

Folge: **Heute läuft keine der vier Automatisierungen rund um die Uhr, auch nicht nach dem Umlegen der Schalter.** Der kürzeste belegbare Weg zu einem Dauerbetrieb ist ein Zeitgeber auf einem Server, den der Inhaber freigibt.

## 8. Vorschläge, nicht gebaut

1. **Eigener Empfänger für Anfragen in `apps/web` (L14).** Der wirksamste Schritt für Leads. Nicht gebaut, weil er drei Dinge verlangt, die außerhalb dieses Auftrags liegen: das Formular `ContactRequestForm.tsx` umzustellen (liegt im gebundenen Verzeichnis `apps/web/components`, verlangt einen neuen Resize-Beleg), die Weiterleitung in `vercel.json` zu ändern (Wirkung in Produktion) und eine Entscheidung, ob ohne Speicherung gesendet werden darf (der Einwilligungstext nennt „gespeichert“). Vorschlag: Empfänger nach dem Muster von PR 186 (`apps/web/mailing/`, ungebundener Ort, Schalter, Supabase-Ablage, Versand an das interne Postfach über `lib/mailing.ts`), vergeben an genau einen Zweig, der auch den Beleg neu erhebt. A3 ist so gebaut, dass dieser Empfänger nur eine Ereigniszeile je Anfrage schreiben muss.
2. **Bestätigungsmail an den Anfragenden.** Versand an echte Empfänger; im Shop-Dienst als Postausgang vorhanden (`mailer.py`), wirkt mit der Bindung des Dienstes. Kein zweiter Weg.
3. **Kunden-Tagesbericht (P07), Rechnung und Mahnung (P06).** Brauchen Kundendaten, Preise und Versand an Dritte. Kundendaten gehören nicht in dieses Repository.
4. **Shop-Berichte (hängende Bestellungen, Feed-Fehler).** Sinnvoll als fünfte Automatisierung im selben Kern, sobald der Shop-Dienst Daten liefert; heute antwortet er 503.
5. **Sicherung und Rückspieltest (P15).** Servereingriff; bis dahin kann A4 die Ablauftermine führen.
6. **Überwachung zusätzlich von außen.** Für einen Wächter, der auch beim Ausfall des eigenen Servers meldet, ist ein Dienst außerhalb nötig (im Register: Sentry, „läuft unbelegt“). Das wäre eine Einrichtung im Konto des Inhabers.

## 9. Offene Entscheidungen des Inhabers

| Nr. | Entscheidung | Betrifft | Ohne sie |
|---|---|---|---|
| 9.1 | **Laufort:** Zeitgeber auf einem Server (welcher, mit Freigabe nach D-016), Hermes-Cron nach Funktionsnachweis, oder vorerst nur der Tagesbericht als geplante Claude-Aufgabe | alle | läuft nichts dauerhaft |
| 9.2 | **Anfrageweg:** Shop-Dienst binden oder eigener Empfänger in `apps/web` (Abschnitt 8.1; Master-Audit L13/L14) | A3 | hat A3 nichts zu tun |
| 9.3 | **Interne Adresse** für Meldungen und ob Mail gewünscht ist oder die Datei bzw. die Benachrichtigung der geplanten Aufgabe genügt | alle | bleibt nur die Datei |
| 9.4 | **Welche der vier** eingeschaltet werden, in welcher Reihenfolge (Vorschlag: A2, A4, A1, A3) | alle | bleibt alles aus |
| 9.5 | **Antwortfrist** für Anfragen (Vorschlag 1 Werktag, Erinnerung nach 1 und 3) | A3 | gelten die Vorschläge erst mit dem Einschalten |
| 9.6 | **Fristenliste:** welche Termine geführt werden sollen (Sicherungen, Verträge, Tarife, Zahlungsfristen) | A4 | meldet A4 nur Zugänge |
| 9.7 | **Tagesbericht im Regelbetrieb:** Schritt dort entfernen, sobald A1 läuft | A1 | gäbe es zwei Berichte |

Nicht Teil dieser Liste, aber Voraussetzung für mehr: Actions-Budget (L7), Modellschlüssel (L21), Supabase-Instanz (L19), Rechtsgrundlage für Mailings (L15).

## 10. Prüfungen

Gemessen am 15.11.2026 am Stand dieses Zweigs; Vergleichsbasis ist `origin/main` auf `9c9c806`, gemessen in derselben Umgebung nach `generate-public-data`. Geändert sind nur `config/` (zwei Dateien), `docs/04-betrieb/` (zwei Dateien), `ops/automatisierung/` und ein Test; keine Datei unter `apps/`, `packages/`, `tools/` oder `evidence/`, kein führendes Dokument.

| Prüfung | Ergebnis |
|---|---|
| `python3 -m unittest tests.test_prozess_automatisierung` | 46 Tests, alle bestanden: Schalter aus = keine Wirkung (6), doppelter Auslöser = eine Wirkung, begrenzte Wiederholung, Fehlerweg, Kostenbremse, Probelauf ohne Netz |
| Python-Suite gesamt | vorher 844 Tests, 46 rot (39 Fehlschläge, 7 Fehler); nachher 890 Tests, dieselben 46 Namen rot. **Kein neuer Fehlschlag** (Namensvergleich leer). Die 46 bestehen auf `main` (Pins und Belege, fehlende Pakete der Shop-Tests) |
| `make check` | bestanden |
| `node tools/ds-audit-cli.js` | bestanden |
| `make governance-check` (Modellvorgabe, Hermes-Konfiguration, Lösungsregister, Skills, KI-Abdeckung) | bestanden; Lösungsregister: 59 Lösungen, 49 Zugänge, lesbare Fassung stimmt überein |
| `make source-boundaries`, `make automation-check` | bestanden |
| `node tools/lint.mjs` | bestanden |
| `python3 tools/check_text_resize_evidence.py` (Resize-Belege) | bestanden, 43 Routen; kein gebundenes Verzeichnis berührt |
| `pnpm --filter @nexify/web test:auth` | 138 von 138 |
| `pnpm typecheck` | bestanden |
| `pnpm --filter @nexify/web build` | bestanden |
| `node tools/gleichmacher.mjs` gegen den lokalen Produktions-Build | 44 Seiten, 2 Breiten, 31.497 Vergleiche, **0 Abweichungen** |
| `make check-arch` | **nicht grün, unverändert gegenüber `main`:** ARCH-010, ARCH-027, ARCH-029 (veraltete Browserbelege und Quellenregister). Dieselben drei sind am unveränderten Stand von `origin/main` verletzt; keiner nennt eine Datei dieses Zweigs |
| `python3 tools/check_browser_evidence.py` | **nicht grün, unverändert gegenüber `main`:** `stale_source_sha256: apps/site/src/Auth.tsx`, eine Datei, die dieser Zweig nicht berührt |
| `node tools/live-check.mjs` gegen den lokalen Produktions-Build | 322 von 329 Prüfungen; die 7 Befunde betreffen den Shop-Dienst (2) und die PWA-Dateien (5), die der lokale Start von `apps/web` nicht ausliefert. Gegen die Produktion wurde nicht gemessen |

Nichts wurde abgeschaltet, übersprungen oder nachgezogen: kein Pin, kein Beleg, keine Prüfsumme.

## 11. Nicht geprüft

- Kein Lauf im Betrieb: Keine Automatisierung war eingeschaltet, kein Zeitplan hat ausgelöst.
- Der echte Versand über Resend. Geprüft ist die Anfrage, die der Code bilden würde, gegen eine Attrappe. Dass Resend den Kopf `Idempotency-Key` wie erwartet behandelt, ist aus der Dokumentation des Anbieters übernommen und vor dem Einschalten der Mail zu prüfen.
- Der echte Abruf der vier Adressen durch den Wächter (im Test und im Probelauf wird kein Netz benutzt).
- Die Zeitgeber-Vorlagen für den Server: geschrieben, nicht installiert, nicht mit `systemd-analyze` geprüft.
- Die heutige Liste der geplanten Aufgaben (Abschnitt 4 nennt den Stand vom 14.11.2026).
- Feiertage: Die Werktagszählung kennt nur Montag bis Freitag.
