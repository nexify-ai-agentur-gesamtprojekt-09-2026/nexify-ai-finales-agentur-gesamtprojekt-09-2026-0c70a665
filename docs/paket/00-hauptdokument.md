# NeXify Plattform · Hauptdokument

**Für:** Claude Code (und jede Person, die die Plattform aufbaut, betreibt oder prüft) · **Stand:** 28.09.2026 · **Fassung:** 0.1 (in Arbeit) · **Eigentümer:** Pascal Courbois

## So liest du dieses Paket

1. Lies dieses Hauptdokument ganz. Es sagt, was gebaut wird, in welcher Reihenfolge und welche Regeln nie gebrochen werden.
2. Arbeite dann **genau einen Band** ab, in der Reihenfolge der Tabelle unten. Jeder Band ist in sich vollständig und verweist nur nach unten (auf Dateien) oder auf frühere Bände.
3. Findest du eine Frage, die kein Band beantwortet, ist das ein **Fehler im Paket**: Lege ein Lernsignal `fehler` an (`lib/lernschleife.js`) und schreibe die Frage in § 5 dieses Dokuments. Rate nicht.

## 1 · Was gebaut wird

Eine Plattform, die alle bisherigen Einzellösungen (Websites, Shop, DSH, myADMIN, Portale) ablöst: ein Gateway (`api/openapi.yaml`), ein MCP-Server, ein Worker, eine Datenbank, ein Designsystem. Jede Aktion läuft vor der Ausführung durch das Regelwerk (`lib/regelwerk.js`). Agenten schlagen vor, Pascal entscheidet im Entscheidungs-Postfach (`lib/entscheidungen.js`). Grundlage: `docs/08-gesamtloesung/00-gesamtloesung.md`, ADR 0001–0004.

## 2 · Unverbrüchliche Regeln

Maßgeblich ist `AGENT.md` § 0; maschinell durchgesetzt in `config/regelwerk.json` (R-00 bis R-19). Kurzfassung: Endabnahme nur Pascal · Reboot, Live-DNS, vollständige Firewall nur mit Einzelfreigabe · Live nur mit Gate-Nachweis · Geld nur über den Rechenkern · KI-Inhalte gekennzeichnet · Daten in der EU · keine Geheimnisse außerhalb OpenBao · keine erfundenen Zahlen.

## 3 · Bände

| Nr. | Band | Datei | Status |
|---|---|---|---|
| 01 | Installation in einem Befehl | `01-installation.md` + `install.sh` | **Entwurf 28.09.2026** |
| 02 | Gesamtspezifikation Plattform (Backend) | `02-plattform.md` | **Entwurf 28.09.2026** |
| 03 | Technische Datenblätter je Dienst | `03-datenblaetter.md` | **Entwurf 28.09.2026** |
| 04 | Architektur-Zeichnungen (C4, Kennzeichnung nach DIN EN ISO 81346) | `04-architektur.md` + `tools/abhaengigkeiten.js` | **Entwurf 28.09.2026** |
| 05 | Betriebshandbuch (Gliederung nach DIN EN IEC 82079-1) | `05-betrieb.md` + `config/runbooks.json` | **Entwurf 28.09.2026** |
| 06 | Agenten-Handbuch: Rollen, Lernen, Selbstoptimierung | `06-agenten.md` | **Entwurf 28.09.2026** |
| 07 | KI-Wiki: Aufbau und Pflege | `07-wiki.md` | **Entwurf 28.09.2026** |
| 08 | Spezifikation Workspace-Startansicht | `08-workspace.md` | **Entwurf 28.09.2026** |
| 09 | Entscheidung CD-2026 auf Bildschirmflächen | `09-cd-2026.md` | **Entscheidungsvorlage 28.09.2026** – bis Entscheidung gilt der Ursprung |
| 11 | Prüfplan für alle Logiken und Seiten | `11-pruefplan-logik-und-seiten.md` | **verbindlich 28.09.2026** |
| 12 | Übernahme der bisherigen Lösung | `12-bestandsuebernahme.md` | **verbindlich 28.09.2026** |
| 13 | Integration und Inbetriebnahme | `13-inbetriebnahme.md` | **verbindlich 28.09.2026** |
| 10 | Prüf- und Abnahmeplan | `10-pruefung.md` | **Entwurf 28.09.2026** |

Ausgabe: Markdown im Repository (für Claude Code) und PDF nach CD-2026 (für Menschen), inhaltsgleich.

## 4 · Annahmen (von Claude entschieden, von Pascal überschreibbar)

| ID | Annahme | Grund | Wo wirksam |
|---|---|---|---|
| A-01 | Betriebssystem Debian 12 oder Ubuntu 24.04 LTS | langfristig gepflegt, Docker offiziell unterstützt | `install.sh` § 1 |
| A-02 | Mindestens 4 CPU-Kerne, 8 GB RAM, 40 GB frei | Gateway, Worker, MCP, Postgres, OTel parallel; ohne GPU | `install.sh` § 1 |
| A-03 | Erste Domain `vorschau.nexifyai.cloud`, noindex | Vorschau-Stufe des Gates | Band 01 |
| A-04 | Kein GPU-Knoten zum Start; Stufe 0 des Routers läuft extern bis zur Entscheidung | keine Messdaten für eigenes Modell (< 500 Paare) | Inventar `nx_gpu: false` |
| A-05 | Parallelbetrieb auf dem bestehenden Server mit Projekt `nexify-neu`, Ports 18080/18090 | Altbestand bleibt unberührt | `install.sh --parallel` |
| A-06 | OpenBao 3 Teile, 2 zum Entsiegeln | Ein-Personen-Betrieb: Verlust eines Teils ist verkraftbar | `install.sh` § 3 |
| A-07 | Zahlungsanbieter ist nicht Teil der Installation | wird erst in Band 02 (Buchungskern B5) angebunden | – |

## 5 · Offene Fragen aus Lesertests

(leer)

## 6 · Phasen und Rollen (Skill phasenpipeline-mit-agentenrollen)

| Phase | Band / Kern | Rolle des Agenten | Schranke |
|---|---|---|---|
| 1 Anforderung | Band 08, Fragensatz | erkunden, nur lesen | – |
| 2 Architektur | Band 04, ADR | Optionen mit Gegenposition | ADR-Prüfliste |
| 3 Entwicklung | Band 02 (B0–B14) | ein Agent je Schritt | Tests rot → grün, Regelprüfung |
| 4 Prüfung | Band 10 | getrennte Prüfer: Vorgabe, Code, Sicherheit | kritisch/hoch blockiert |
| 5 Rollout-Vorbereitung | Band 01, Freigabe-Gate | Checkliste, **keine Ausführung** | Karte im Postfach; Hartsperren nur mit Einzelfreigabe |
| 6 Betrieb | Band 05, Nachtlauf, Selbstheilung | Wächter auswerten | Runbooks im Schatten → Vorschlag |

Nicht übernommen: Arbeiten ohne Berechtigungsprüfung, »nie fragen«, automatische Freigaben nach Konfidenzwerten.
