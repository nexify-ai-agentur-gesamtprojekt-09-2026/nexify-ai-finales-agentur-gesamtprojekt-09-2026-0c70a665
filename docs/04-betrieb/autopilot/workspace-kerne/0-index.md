# Gutachtenkette · Gesamtindex · NX-WS-KERNE-2026-09

**Lauf** `42426a46-0b05-47d6-a174-e1ea2494dfae` · **Endstatus `PARTIAL_BLOCKED`** · **Modus** `AUSFUEHRUNGSMODUS: PHASENEMULATION` · Abschluss 27.09.2026, 21:26:50 UTC

**Warum dieser Fall:** Der Autopilot wurde ohne Nutzertext gestartet. Beide früheren Läufe (`NXAI-DESIGN-2026-09`, `NX-MYADMIN-V2`) sind im Endzustand und wurden nicht neu ausgeführt. Nach ihrem Stichtag (26.09.2026, 23:27 UTC) sind ungeprüfte Kerne dazugekommen: Langlauf, Posteingang, LLM- und Integrationskonfiguration, Workspace, Posteingang-Oberfläche. Diese Teile sind der Gegenstand.

## 1 · Artefakte

| # | Artefakt | SHA-256 | Status |
|---|---|---|---|
| 1 | [`1-gutachten.md`](1-gutachten.md) — technisches Gutachten | `d5613582…9f03a62e` | PARTIAL |
| 2 | [`2-umsetzungsplan.md`](2-umsetzungsplan.md) — Umsetzungsplan | `16991c95…d17e65a8` | PARTIAL |
| 3 | [`3-zertifizierungsreife.md`](3-zertifizierungsreife.md) — Bereitschaftsgutachten | `52a1d65c…7c0b04b9` | PARTIAL · Urteil `NOT_READY` |
| 4 | [`laufakte.json`](laufakte.json) — Laufakte, drei Übergaben, Validierung, Gegenprüfung, Umsetzung | – | maschinenlesbar |
| 5 | [`4-umsetzungsnachweis.md`](4-umsetzungsnachweis.md) — Umsetzung M-01…M-18, rot → grün, Nachbewertung | `74d50b70…37ef1815` | 18 umgesetzt · 4 offen · 2 blockiert |

> **Nachtrag 27.09.2026, 21:41 UTC:** Umsetzung nach Auftrag im Chat. Prüffälle Langlauf 32/32, Posteingang 31/31 (vorher 20/32 und 22/31 rot). Urteil weiterhin `NOT_READY`, nur noch 2 Major (C-03, C-09), beide hängen an B-01. Die Stufen 1–3 bleiben unverändert als Stand vor der Umsetzung.

Umfangs-Hash der Eingaben: `sha256:30332e2837012041acdb3f81e689e1796caa55174a3d043d6fb71594a760860c` (15 Dateien, in allen drei Übergaben identisch).

## 2 · Gegenprüfung nach Stufe 3 (automatisch)

| Prüfung | Ergebnis |
|---|---|
| Fall, Stichtag, Umfangs-Hash in allen Übergaben gleich | ja |
| Befunde ohne Maßnahme | 0 von 24 |
| Befunde ohne Bewertung in Stufe 3 | 0 von 24 |
| Maßnahmen ohne Bewertung in Stufe 3 | 0 von 23 |
| Neue Befund-IDs in Stufe 2 oder 3 (= unbestätigte Tatsachen) | 0 |
| Geplante Maßnahme als umgesetzt gewertet | nein |

## 3 · Rückverfolgbarkeit (tragende Kette)

| Befund | Beleg | Risiko | Maßnahme | Prüffall | Kriterium |
|---|---|---|---|---|---|
| WK-09 KI-Prüfung wirkungslos | Y01 | KI-Mail ohne Hinweis | M-02 (+E-A), M-16 | PE21, PE22 | C-01 · NK-01 Major |
| WK-10 Fremde Fallnummer → „hoch“ | Y03 | Fehlzuordnung, Auto-Antwort | M-03 | PE23, PE24 | C-06 · NK-04 Major |
| WK-04 Lease nicht erzwungen | X03 | zwei Director | M-07 | LL24–26 | C-04 · NK-03 Major |
| WK-02/03/19 Budget, Preise | X02, X06, Konfig | Kosten ohne Grenze | M-05, M-06, M-21 | LL21–23, Health | C-03 · NK-02 Major |
| WK-18/19 Integrationen unbelegt | Dateivergleich | Planung auf Soll-Stand | M-14, M-21 | Health-Protokoll | C-09 · NK-05 Major |
| WK-01 Schema-Wiederholung | X01 | Menschen-Schranke umgangen | M-04 | LL20 | C-02 · NK-06 |
| WK-05/06 Zeit, Kontext | X04, X05 | Überlauf | M-08, M-09 | LL27, LL28 | C-05 · NK-07 |
| WK-13/15 Backscatter, Sperre | Y05, Y08 | Missbrauch, Fehlsperre | M-11, M-12 | PE26, PE27 | C-07 · NK-08 |
| WK-12/17 Absturz, fail-open | Y04, Code | Stillstand, Scheinerfolg | M-10, M-13 | PE25, Sichtprobe | C-08 · NK-09 |
| WK-23/24 Tests, Doku | Suite, Doku | Rückfall | M-01, M-17 | alle neuen | C-12 · NK-10 |
| WK-20 Composio | Konfig | Drittland | M-22 | Entscheidung | C-11 offen (J) |
| WK-22 Browser-Speicher | Code | Löschfrist | M-23 | Entscheidung | C-13 Beobachtung |
| WK-07, 08, 11, 14, 16, 21 | siehe Stufe 1 | niedrig–mittel | M-20, M-19, M-15, M-18, M-16 | siehe Plan | zugeordnet, keine NK |

## 4 · Register

**Widersprüche** (nicht geglättet)

| ID | Inhalt | Eigentümer | Auflösung | Blockiert |
|---|---|---|---|---|
| W-01 | `integrationen.json` „vorhanden“ ↔ `AGENT.md` § 6 „nicht geprüft“ | Pascal/Betrieb | M-14, M-21 | C-09 |
| W-02 | Doku-Garantie 72 h / ein Director ↔ Code | Entwicklung | M-07, M-08, M-17 | nein |
| W-03 | Konfiguration „nicht bei schema“ ↔ Code | Entwicklung | M-04 | nein |
| W-04 | Workspace führt diesen Skill als „veraltet“, er wird aber genutzt | Pascal | Skillstatus festlegen | nein |

**Sperren**

| ID | Fehlt | Kleinstes Beweismittel | Abnahmekriterium |
|---|---|---|---|
| B-01 | Verbindung und Preise 9router | Health-Protokoll je Stufe (13 Abrufe, Cache-Buster) + Preisliste mit Quelle und Datum | alle 13 Abrufe `200`; Preise in `llm-verbindungen.json` statt `${…}` |
| B-02 | Drittland Composio | schriftliche Entscheidung E-B oder Rechtsprüfung | Eintrag im Entscheidungsprotokoll |
| B-03 | Unabhängigkeit | Zweitprüfung durch eine andere Person oder Instanz | gegengezeichnete Befundliste |

**Lücken:** L-01 Live-Health (BLOCKED) · L-02 Sicht- und Barrierefreiheitsprüfung Workspace/Posteingang (IN_SCOPE_OPEN) · L-03 Node/Vitest-Lauf (IN_SCOPE_OPEN) · L-04 Normvolltexte (BLOCKED).
**Annahmen:** A-01 Browser = Node für I/O-freie Module · A-02 Aufwandsspannen grob · A-03 10 % Toleranz Tokenschätzung.
**Restrisiko bis zur Umsetzung:** Workspace und Posteingang dürfen nicht an echte Postfächer oder Modelle angeschlossen werden. Die Prototypen selbst sind ohne Außenwirkung.

## 5 · Einbettung

- Kein Produktivsystem, keine Oberfläche und kein Code wurde geändert. Nur dieser Ordner ist neu.
- Kein zentrales Koordinationslog und keine zweite Sicherungsebene erreichbar → Claim und Sicherung **nicht eingetragen** (Einschränkung, kein PASS).
- Das Urteil `NOT_READY` ist Sachgrundlage für das Freigabe-Gate, **keine Freigabe**. Endabnahme durch Pascal und die Hartsperren bleiben unberührt.
- Visuelle Prüfung der Markdown-Ausgaben: nicht als PDF gerendert; offen.

## 6 · Kurzfazit und nächster zulässiger Schritt

Die Kerne tun, was ihre eigenen 39 Prüffälle verlangen. 14 wiederholbare Gegenproben zeigen aber Lücken genau an den Regeln, die das Projekt für verbindlich erklärt: KI-Kennzeichnung, Mensch entscheidet, Budget, ein Director je Lauf. Urteil `NOT_READY`, Endstatus `PARTIAL_BLOCKED`.

~~Nächster Schritt: Ausführungsauftrag für M-01~~ — erledigt, siehe Stufe 4.

**Nächster Schritt jetzt:** Beweismittel **B-01** (Health-Protokoll 9router je Stufe, 13 Abrufe, plus Preise mit Quelle) und Entscheidung **E-A** (Wortlaut KI-Hinweis). Beides liegt bei Pascal/Betrieb; im Projekt ist nichts mehr ohne diese Eingaben umsetzbar.


## Nachtrag 28.09.2026 · Hilfsdateien der Gutachtenkette (Skill `gutachten-kette-ablageort`)
Die Hilfsdateien (`references/`, `scripts/`, `assets/`) der vier Gutachten-Skills liegen nur auf dem Wirt Frankfurt unter `/opt/nexifyai/dsh-home/skills/<skill>/`. **In diesem Lauf waren sie nicht erreichbar** (kein Server- oder SSH-Zugang in der Entwurfsumgebung).
- Alle Prüfschritte, die einen Validator, ein Skript oder eine Vorlage aus diesen Ordnern voraussetzen, gelten als **NICHT DURCHGEFÜHRT** – nicht als PASS. Das betrifft insbesondere die Schema- und Hash-Prüfung der Übergabeverträge zwischen den Stufen und die Paket-Tests (105/105 auf dem Wirt, hier nicht wiederholt).
- Inhalte aus diesen Dateien wurden **nicht aus dem Gedächtnis nachgebaut**; verwendet wurde nur, was in den SKILL.md selbst steht.
- Nachholen: Lauf durch die Agenten-Zentrale (`system.nexifyai.cloud`, Dienst `deepseek-harness`) oder per SSH auf dem Wirt, Stufen strikt nacheinander.
