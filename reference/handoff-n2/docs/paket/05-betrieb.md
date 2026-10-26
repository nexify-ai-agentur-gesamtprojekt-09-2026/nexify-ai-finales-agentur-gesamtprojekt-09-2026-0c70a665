# Band 05 · Betriebshandbuch

**Stand 28.09.2026 · Entwurf · Aufbau nach DIN EN IEC 82079-1** (Gebrauchsanleitungen): Identifikation → Sicherheit → Zweck und Zielgruppe → Beschreibung → Betrieb → Störungen → Wartung → Außerbetriebnahme. Normvolltext lag nicht vor; übernommen ist die Gliederung, keine Abschnittsinhalte der Norm.

## 1 · Identifikation

| Feld | Wert |
|---|---|
| Produkt | NeXify Plattform (Gateway, MCP, Worker, Datenbank, Tresor, Beobachtung) |
| Version | Git-Commit im Health-Abruf `/v1/health` (`commit`) |
| Betreiber | NeXify AI · Pascal Courbois |
| Ort | VPS Frankfurt (+FRA), Region eu-central |
| Installationsweg | `install.sh` (Band 01) |

## 2 · Sicherheitshinweise (gelten immer)

1. **Hartsperren nur von Hand und nur mit Einzelfreigabe:** Reboot, Live-DNS, vollständige Firewall-Änderung (Regel R-02). Kein Skript und kein Agent führt sie aus.
2. **Geheimnisse nur in OpenBao.** Nie in Chat, Ticket, Log, Repository (R-07). Verdacht auf Offenlegung = Schlüssel sofort tauschen.
3. **Geld nur über den Rechenkern**, Storno nur als Gegenbuchung (R-04).
4. **`#stopp`** im Workspace hält alle Agenten an (nur Lesen bleibt). Wirkt sofort, Aufheben nur durch Pascal.
5. **Datenschutzvorfall:** Meldung an die Aufsicht unverzüglich, möglichst binnen 72 h nach Kenntnis (Art. 33 DSGVO).

## 3 · Zweck und Zielgruppe

Die Plattform führt die Agentur: Anfragen, Angebote, Aufträge, Rechnungen, Support, Portale, Agenten. **Zielgruppe dieses Bandes:** Pascal und Claude Code als ausführender Agent. Vorausgesetzt: Linux-Grundkenntnisse, Zugang zum Server per SSH-Schlüssel.

## 4 · Beschreibung

Siehe Band 04 (Container, Kerne, Ablauf einer Modellanfrage). Einstieg für Menschen: Workspace (Chat, Befehlsleiste) und Leitstand (Entscheidungen, Regel-, Projekt-, Normprüfung, Lernen, Kerne).

## 5 · Betrieb

| Wann | Was | Wie | Nachweis |
|---|---|---|---|
| täglich, automatisch | Außenwächter (stündlich, anderer Träger), Innenwächter, Herzschlag der Selbstheilung ≤ 5 min | Playbook-Stufe 50 | Alarm an E-Mail aus `install.sh` |
| täglich 03:00 | `lib/nachtlauf.js`: Karten ablaufen, Gedächtnis vergessen, RAG-Delta, Kennzahlen, Cache-Quote, Schuld Top 5 | Worker | Bericht mit Befunden, Löschgrund je Eintrag |
| täglich 19:30 | Tagesbericht: Stufe-1-Aktionen, neue Befunde, offene Entscheidungen | Worker → Postfach | eine Nachricht, nur neue Sachverhalte |
| wöchentlich | Normprüfung aller Flächen (1440 / 1024 / 390 px), Regelprüfung | Leitstand | Befunde als Lernsignal |
| monatlich | Kennzahlen (DORA, Kosten je Vorgang), Schuldbuch Top 5, goldener Fragensatz | Leitstand | Bericht |
| jede Änderung | CI: Tests, Regelwerk, Abhängigkeiten, Designsystem, API-Vertrag | GitLab | Pipeline grün |
| jede Freigabe | Karte im Entscheidungs-Postfach: Beleg, Ergebnis, Rückweg; ausgeführt genau einmal | Leitstand | Protokoll `entscheidungen` |

## 6 · Störungen

Jede Zeile ist ein Runbook im Sinne der Selbstheilung (Design § 3.3): feste Diagnose, eine Maßnahme aus dem Katalog, Prüfung, Rücknahme. Startmodus aller Runbooks: **Schatten**.

| Auslöser | Diagnose (fest) | Maßnahme | Prüfung | Rücknahme | Stufe |
|---|---|---|---|---|---|
| Health ≠ 200, 3× in 90 s | `docker compose -p <projekt> ps` · Logs Gateway 5 min | Dienst `gateway` neu starten | Health 13/13 | – | 1 |
| Health bleibt rot nach Neustart | letzter Deploy-Commit, Fehlerquote | Version zurück (vorheriger Commit) | Health 13/13 | erneut vorwärts | 2 |
| Warteschlange > 500 Aufträge oder älter als 30 min | pg-boss-Statistik, Worker-Logs | Worker neu starten | Abbau in 10 min | – | 1 |
| Router-Stufe ungesund | `/health?stufe=0..2` | Rückfall auf nächste Stufe (`rueckfall()`) | Antwortquote | Stufe wieder zu | 1 |
| Cache-Trefferquote < 60 % bei ≥ 20 Aufrufen | `aufbauen()`-Befunde, Prompt-Version | keine automatische Maßnahme → Karte | – | – | 2 |
| Belegprüfung scheitert gehäuft (≥ 2 gleiche) | goldener Satz, Ursache aus `goldenerSatz()` | keine automatische Maßnahme → Prüffall (L4) | – | – | 2 |
| OpenBao versiegelt | `/v1/sys/health` | **keine** – Entsiegeln nur durch Pascal mit 2 von 3 Teilen | Health | – | 3 |
| Platte < 15 % frei | `df`, Docker-Images | `docker image prune -f` (nur dangling) | frei ≥ 20 % | – | 1 |
| Zertifikat < 14 Tage gültig | Traefik/Cloudflare | Erneuerung anstoßen | neues Ablaufdatum | – | 1 |
| Bounce-Quote > 5 % oder Beschwerden > 0,3 % | Resend-Ereignisse 24 h, `warmup()` | Versand drosseln (Stufe zurück), Werbung anhalten | Quote unter Grenze | Stufe wieder hoch | 2 |
| DNS-Befund (SPF/DKIM/DMARC) | `dnsPruefen()` | **keine** – DNS ist Hartsperre, Karte an Pascal | – | – | 3 |
| Datenschutzvorfall | Umfang, betroffene Mandanten | Agenten `#stopp`, Karte Stufe 3 | – | – | 3 |

**Schleifensperre:** höchstens 3 Ausführungen je Runbook und Stunde, danach zurück auf Vorschlag und Alarm.

## 7 · Wartung

| Takt | Arbeit |
|---|---|
| jede Woche | Sicherheitsupdates des Betriebssystems prüfen (Neustart = Hartsperre, nur nach Freigabe) |
| jeden Monat | Wiederherstellung einer Sicherung auf leere Datenbank testen; Ergebnis in `freigabe-gate-status.md` |
| jedes Quartal | Einbettungsmodell, Schwellen und Prompt-Versionen gegen den goldenen Satz messen |
| nach Wiedervorlage | Werte im Fragensatz aktualisieren (Basiszins 01.01./01.07., KI-VO 02.12.2026, E-Rechnung 01.01.2027) |

## 8 · Außerbetriebnahme und Bereinigung

`playbooks/90-bereinigung.yml` (Band 02 § B14): erst Probelauf, dann Bestätigung `BEREINIGUNG <host> Pascal, TT.MM.JJJJ HH:MM`. Nie gelöscht: Volumes, Sicherungen, Archive, OpenBao, ZK-Log. Aufbewahrung: Buchungsbelege 8 Jahre, Jahresabschlüsse 10 Jahre.

## 9 · Offen in diesem Band

- Kontaktkette bei Ausfall von Pascal (Vertretung) – Entscheidung Pascal.
- Selbst-Modus (ohne Rückfrage) bleibt aus, bis Pascal entscheidet (`config/runbooks.json` → `aufstieg.selbstFreigabe`).
