# Agentur-Steuerung aus der Web-UI · selbstheilend, erweiterbar · Design

**Datum 28.09.2026 · Status: ENTWURF – abschnittsweise Bestätigung offen · Verfahren: Ideenfindung/Spezifikationsdialog.** Noch keine Zeile Code für dieses Thema. Umsetzungsplanung erst nach Freigabe.

## 0 · Kontext-Scan (was es schon gibt)

| Baustein | Stand | Lücke für „Agentur aus der Web-UI führen“ |
|---|---|---|
| `NeXify Workspace.dc.html` | Chat nach LibreChat, Agenten, Skills, Läufe | kein Ort für Entscheidungen, keine Befehlsleiste |
| `myADMIN v2.dc.html` | 19 Bereiche, Beispieldaten | zweite Oberfläche neben dem Workspace – doppelte Navigation |
| `NeXify Leitstand.dc.html` | Regelprüfung, Projektprüfung, Lernen, Kerne | zeigt, entscheidet aber nichts |
| `NeXify Posteingang.dc.html` | Einordnung, Entwürfe | Freigabe je Mail, nicht gesammelt |
| `lib/regelwerk.js` | Entscheidung erlaubt / mensch / gesperrt | „mensch“ endet heute im Nichts: keine Warteschlange |
| `lib/langlauf.js` | Checkpoint, Lease, `wartet` | kein Weg, „wartet“ sichtbar und beantwortbar zu machen |
| Wächter, Runbooks | nur beschrieben (`freigabe-gate-status.md`) | keine Selbstheilung, kein Probelaufmodus |

**Widerspruch im Bestand:** Workspace und myADMIN wollen beide „die Zentrale“ sein. Das Design muss das auflösen.

## 1 · Was die Recherche vorgibt (Stand September 2026)

- **Freigaben asynchron und dauerhaft:** Der Agent sichert seinen Stand an einem Checkpoint, die Anfrage kommt mit Ablaufzeit in eine Warteschlange und wird erst nach der Antwort am Checkpoint fortgesetzt. Übliche Werte: 7 Tage für normale, 24 Stunden für sensible Vorgänge. Den Idempotenz-Schlüssel vor der Unterbrechung erzeugen und einen Hash der vorgeschlagenen Aktion speichern.
- **Freigabemüdigkeit ist eine Sicherheitslücke:** Wer alles bestätigen muss, klickt reflexhaft – dann zählt auch die wichtige Freigabe nicht mehr. Daher Risikostufen.
- **Vorschlagen, dann ausführen:** Eine Freigabe nach dem Seiteneffekt ist keine Freigabe, sondern Vorfalldokumentation.
- **Jede Freigabekarte zeigt Beleg, erwartetes Ergebnis und Nachteil, falls falsch.** Jede Ablehnung soll dem Agenten beibringen, was er nächstes Mal anders macht.
- **Keine Freigabe per E-Mail-Link:** Die Entscheidung fällt angemeldet; ein Ein-Klick-Link ohne Anmeldung ist eine Angriffsfläche.
- **Selbstheilung als geschlossener Kreis:** erkennen, einordnen, Ursache finden, planen, freigeben, beheben, prüfen, lernen. Bekannte Fehler laufen über feste Regeln, Sprachmodelle nur, wo die Ursache Kontext braucht.
- **Neue Runbooks zuerst im Schattenmodus:** Sie laufen parallel mit und protokollieren nur, was sie getan hätten.
- **Stufen:** selbst beheben (Neustart, Rollback) → vorschlagen und freigeben lassen → Bereitschaft alarmieren. Eine Sperre gegen Neustart-Schleifen ist Pflicht, bevor irgendetwas automatisch behoben wird.
- **Regeln im Code, nicht im Prompt:** Die Schranke muss beim Ausführen greifen und als versionierter Code vorliegen.

Quellen: digitalapplied.com (07.06.2026), stackai.com (03.03.2026), getclaw.sh (04.05.2026), agentdraft.io (08/2026), arXiv 2608.01955, zylos.ai (30.03.2026), novaaiops.com (29.05.2026), neuralwired.com (31.03.2026). Fachquellen, keine Normen; Richtwerte werden durch eigene Messung ersetzt.

## 2 · Drei Ansätze

| | **A · Eine Oberfläche, drei Eingänge** (empfohlen) | B · Leitstand zuerst | C · Nur Chat |
|---|---|---|---|
| Idee | Workspace wird die einzige Hülle: **Chat** für Aufträge, **Befehlsleiste** (⌘K) für Sprünge und Aktionen, **Entscheidungen** als eigenes Postfach. myADMIN und Leitstand werden Bereiche darin. | Leitstand als Startseite mit Kacheln und Warteschlange; Chat als Seitenfeld. | Alles über Sprache; Entscheidungen erscheinen als Karten im Gespräch. |
| Stärke | ein Ort, kurze Wege, Entscheidungen gesammelt statt verstreut | guter Überblick für Zahlen | am wenigsten Oberfläche |
| Schwäche | größter Umbau des Workspace | zwei Welten bleiben (Kacheln vs. Chat) | Entscheidungen gehen im Verlauf unter, schlecht prüfbar, Freigabemüdigkeit |
| Passt zu | Regelwerk (`mensch` → Postfach), Langlauf (`wartet` → Postfach), Posteingang (Entwürfe → Postfach) | Regelwerk ja, Langlauf nur halb | widerspricht „Entscheidung angemeldet, nachvollziehbar“ |

**Empfehlung A**, weil sie den Widerspruch Workspace ↔ myADMIN auflöst und jede Stelle, an der heute „wartet auf Pascal“ steht, an genau einen Ort führt.

> **Entschieden 28.09.2026 (Pascal): Ansatz A.**

## 3 · Entwurf (unter Vorbehalt der Entscheidung in § 2)

### 3.1 Architektur (Abschnitt 1 · vorgelegt 28.09.2026, Bestätigung offen)

**Eine Hülle, drei Eingänge, ein Ausgang.**

```
┌ Seitenleiste ─────────────┐┌ Hauptfläche ────────────────────────────┐
│ Entscheidungen  (3)      ││ Chat · oder · Bereich (Kunden, Aufträge, …)  │
│ Chats                    ││                                               │
│ Bereiche (aus myADMIN)   ││                                               │
│ Betrieb (aus Leitstand)  ││                                               │
└──────────────────────────┘└──────────────────────────────────────────────┘
              ⌘K Befehlsleiste über allem: springen · suchen · ausführen
```

- **Eingang Chat:** Aufträge in Sprache, wie heute im Workspace. Tags (`#angebot`) über den Tag-Router.
- **Eingang Befehlsleiste:** Sprung zu jedem Bereich, Kunden, Fall, Lauf; Aktionen mit Namen („Lauf pausieren“, „Runbook im Schattenmodus starten“). Jede Aktion läuft vor Ausführung durch `pruefe()` – die Leiste ist kein Hintereingang.
- **Eingang Bereiche:** die 19 myADMIN-Bereiche und die 5 Leitstand-Ansichten als Seiten in derselben Hülle, eine Navigation.
- **Ausgang Entscheidungen:** alles, was auf Pascal wartet, aus fünf Quellen (Regelwerk `mensch`, Langlauf `wartet`, Posteingang-Entwürfe Stufe 2, Selbstheilung „vorschlagen“, Lernkandidaten). Eine Karte je Vorgang, sortiert nach Ablauf, Zähler in der Seitenleiste.

**Kerne:** neu `lib/entscheidungen.js` (Karten, Ablauf, Hash, einmalige Ausführung) und `lib/selbstheilung.js` (Runbook-Kreis). Bestehende Kerne bleiben unverändert und liefern nur Karten zu.

**Dateien:** `NeXify Workspace.dc.html` wird die Hülle; `myADMIN v2.dc.html` und `NeXify Leitstand.dc.html` bleiben als Vorlagen erhalten, ihre Inhalte ziehen in Bereiche um. Kein neuer Dateiname, keine zweite Zentrale.

> **Bestätigt 28.09.2026 (Pascal): Startansicht = Entscheidungen.** Chat einen Klick bzw. ⌘K entfernt.

### 3.2 Risikostufen (Abschnitt 2 · vorgelegt 28.09.2026, Bestätigung offen)

Die Stufe entscheidet, **ob** eine Karte entsteht. Sie wird aus der Aktion berechnet, nicht vom Agenten gewählt.

| Stufe | Kriterium (erstes zutreffendes gilt, von oben) | Karte | Ablauf | Beispiele |
|---|---|---|---|---|
| **3 Hartsperre** | Regel R-01, R-02 | ja, mit Einzelfreigabe-Wortlaut | 24 h | Reboot, Live-DNS, Firewall, Endabnahme |
| **2 heikel** | nach außen **oder** Geld **oder** Zugang/Rechte **oder** Recht/Preis **oder** Regelwerk `mensch` | ja | 7 Tage; sensibel (Geld > 500 €, Recht, Zugang) 24 h | Mail an Kunden, Angebot, Rabatt, Budget erhöhen, neue Regel, Adapter 100 % |
| **1 umkehrbar** | intern **und** rückgängig machbar **und** unter Tagesbudget | nein – Protokoll + Tagesbericht 19:30 | – | Zuordnung, Entwurf, Dienst-Neustart, Runbook im Schattenmodus |
| **0 lesen** | ohne Seiteneffekt | nein | – | Suche, Bericht, Prüfung |

**Gegen Freigabemüdigkeit:**
- Eine Karte je Vorgang, nicht je Schritt. Ein Langlauf mit fünf Schritten fragt einmal am Ende.
- Gleichartige Karten lassen sich **gemeinsam** freigeben (z. B. 6 Eingangsbestätigungen) – nur in Stufe 2, nie in Stufe 3.
- Jede Karte zeigt: was passiert, Beleg (Fundstelle, Prüfergebnis), erwartetes Ergebnis, **was bei Fehler passiert und wie es zurückgeht**.
- Drei Antworten: **Freigeben** · **Ändern und freigeben** (Änderung wird Lernsignal `korrektur`) · **Ablehnen mit Grund** (Grund wird Lernsignal `hinweis`).

**Stufe 1 wächst nur mit Beleg:** Ein Vorgang darf von 2 auf 1 sinken, wenn über 30 Tage mindestens 50 Karten mit einer Änderungs- und Ablehnungsquote unter 2 % vorliegen – als Vorschlag (Karte Stufe 2), nie automatisch. Die Werte sind Startannahmen und werden nach den ersten Messungen neu gesetzt.

**Ablauf ohne Antwort:** Karte verfällt als *abgelehnt*, der Lauf wartet weiter bzw. endet sichtbar. Nichts wird nach Fristablauf still ausgeführt.

> **Bestätigt 28.09.2026 (Pascal): Sammelfreigabe in Stufe 2** für gleichartige Karten (gleiche Quelle, gleicher Aktionstyp, gleiche Vorlage); jede Karte bleibt einzeln sichtbar und abwählbar. Stufe 3 nie sammelbar.

### 3.3 Selbstheilung (Abschnitt 3 · vorgelegt 28.09.2026, Bestätigung offen)

**Kreis:** erkennen → einordnen → Ursache → planen → Stufe prüfen → beheben → nachprüfen → lernen. Jeder Schritt schreibt ein Ereignis; ein Durchlauf ist ein Langlauf mit eigenem Lease.

**Runbook = Datensatz, kein freier Text:**
| Feld | Inhalt |
|---|---|
| `ausloeser` | Signal eines Wächters, z. B. `health.rot{dienst=gateway}` 3× in 90 s |
| `diagnose` | feste Abfragen (Logs, Metriken, Status), **nie vom Modell erzeugt** |
| `massnahme` | eine Aktion aus dem Regelwerk-Katalog (`AKTIONEN`), z. B. Dienst neu starten, Version zurück, Warteschlange leeren |
| `pruefung` | Erfolgsbedingung, z. B. 13 Health-Abrufe `200` |
| `ruecknahme` | Gegenmaßnahme, wird bei gescheiterter Prüfung ausgeführt |
| `stufe` | aus § 3.2 berechnet |
| `modus` | `schatten` → `vorschlag` → `selbst` |

**Drei Modi, nur vorwärts mit Beleg:**
1. **Schatten** (Start für jedes neue Runbook): läuft mit, führt nichts aus, protokolliert „würde tun“. Mindestens 7 Tage und 5 Auslösungen.
2. **Vorschlag:** erzeugt eine Karte Stufe 2 mit Diagnose, Maßnahme und Rücknahme.
3. **Selbst:** nur für Stufe-1-Maßnahmen, nachdem 10 Vorschläge ohne Ablehnung freigegeben wurden. Aufstieg selbst ist eine Karte.

**Sicherungen:**
- **Schleifensperre:** höchstens 3 Ausführungen je Runbook und Stunde; danach Modus zurück auf *Vorschlag* und Alarm an die Meldestelle.
- **Unbekanntes Muster:** kein Runbook passt → das Modell darf eine Ursache *vorschlagen* (mit Fundstellen), aber keine Maßnahme auslösen; es entsteht eine Karte „neues Runbook?“.
- **Zweite Ebene:** ein Außenwächter auf anderem Träger prüft, ob die Selbstheilung selbst lebt (Herzschlag ≤ 5 min).
- **Hartsperren nie:** Reboot, DNS, Firewall sind keine Maßnahmen im Katalog der Selbstheilung.

**Lernen:** jede Ausführung ist ein Signal; gescheiterte Prüfung = `fehler` → Prüffall (L4); abgelehnter Vorschlag = `hinweis` → Regelvorschlag (L1).

### 3.1a Architektur (Entwurf vor Entscheidung)
Ein neuer Kern `lib/entscheidungen.js` (Warteschlange) und ein Kern `lib/selbstheilung.js` (Runbook-Kreis), beide als reine Funktionen wie die bestehenden Kerne. Eingänge in die Warteschlange: Regelwerk `mensch`, Langlauf `wartet`, Posteingang `entwurf`, Selbstheilung „vorschlagen“, Lernkandidaten (L1, L3, 100 %). Ausgang: Entscheidung mit angemeldeter Identität → Hash-Prüfung → Ausführung genau einmal → Ergebnis ins Log → Ablehnungsgrund als Lernsignal.

### 3.2 Risikostufen (bestimmen, ob gefragt wird)
| Stufe | Beispiel | Verhalten |
|---|---|---|
| 0 lesen | Suche, Bericht | läuft, keine Karte |
| 1 umkehrbar, intern, günstig | Zuordnung, Entwurf, Neustart eines Dienstes | läuft, Eintrag im Protokoll, gesammelt im Tagesbericht |
| 2 nach außen, Geld, Zugang, Rechtliches | Mail an Kunden, Angebot, Rabatt, Budget | **eine Karte je Vorgang**, 7 Tage (sensibel: 24 h) |
| 3 Hartsperre | Reboot, Live-DNS, Firewall, Endabnahme | Karte + Einzelfreigabe-Wortlaut, 24 h |

Stufe 1 schrumpft, sobald die Korrekturrate eines Vorgangs messbar niedrig ist – nie ohne Messung.

### 3.3 Selbstheilung
Kreis in acht Schritten. Jedes Runbook hat: Auslöser (Wächter-Signal), Diagnose-Abfrage (fest hinterlegt, nicht vom Modell erzeugt), Maßnahme, Prüfung, Rücknahme, Risikostufe. Neue Runbooks laufen **7 Tage im Schattenmodus**. Sperre gegen Schleifen: höchstens 3 Ausführungen je Runbook und Stunde, danach Stufe 2 und Alarm.

### 3.4 Erweitern und Verwalten
Neue Agenten, Skills, Runbooks, Regeln entstehen in der Web-UI als **Entwurf einer Konfigurationsänderung** (Merge Request), nie als direkte Änderung am Betrieb. Nach Freigabe (Karte Stufe 2) greift die Pipeline mit Tests und Regelprüfung.

### 3.5 Fehlerbehandlung
Warteschlange nicht erreichbar → Aktion gesperrt. Ablaufzeit überschritten → abgelehnt, nicht stillschweigend ausgeführt. Aktion zwischen Vorschlag und Freigabe geändert (Hash ungleich) → neue Karte.

### 3.6 Testkonzept
Wie bei den bestehenden Kernen: Prüffälle in der Datei, rot zuerst. Pflicht u. a.: doppelte Freigabe führt einmal aus · abgelaufene Karte wird nie ausgeführt · Agent kann nicht freigeben · Schattenmodus führt nie aus · vierte Ausführung je Stunde wird gesperrt · geänderte Aktion verlangt neue Freigabe.

### 3.7 Bewusst weggelassen (YAGNI)
Freigabe per Mail, Slack oder Messenger · eigene Mobil-App · frei konfigurierbare Kachel-Dashboards · Sprachmodell erzeugt Diagnose-Abfragen selbst.

## 3a · Umsetzungsstand 28.09.2026

- `lib/entscheidungen.js` gebaut (20/20): Stufen aus der Aktion, Pflichtfelder Beleg/Ergebnis/Rückweg, Frist 7 Tage bzw. 24 h, gleiche Aktion = eine Karte, nur Pascal entscheidet, Ablehnung nur mit Grund (→ Lernsignal), Hartsperre nur mit Wortlaut, Ausführung genau einmal und nur mit freigegebenem Hash, Sammelfreigabe nur Stufe 2 und gleiche Gruppe.
- Oberfläche vorläufig im Leitstand (Reiter »Entscheidungen«, Startreiter); Workspace verlinkt dorthin. Einzug in die Workspace-Hülle als Startansicht folgt mit B11.
- Selbstheilung (§ 3.3): Frage zum Selbst-Modus unbeantwortet → vorläufig **nur Schatten und Vorschlag**, kein Selbst-Modus, bis Pascal entscheidet.

## 4 · Offene Punkte für den Dialog

1. Ansatz A, B oder C (§ 2) – **zuerst**
2. Standard-Ablaufzeiten 7 Tage / 24 h übernehmen?
3. Soll der Tagesbericht (Stufe 1) um 19:30 bleiben?
4. Dauer des Schattenmodus je Runbook
