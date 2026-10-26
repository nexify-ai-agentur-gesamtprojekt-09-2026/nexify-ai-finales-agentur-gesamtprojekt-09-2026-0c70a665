# Stufe 1 · Technisches Gutachten · Workspace-, Langlauf- und Posteingangskerne

**Lauf** `42426a46-0b05-47d6-a174-e1ea2494dfae` · **Rolle** agent1 (Phasenemulation) · **Status** ENTWURF · **Stichtag der Belege** 27.09.2026, 21:22:28 UTC
**Fall** `NX-WS-KERNE-2026-09` (lokale Kennung; offizielle Dokumentnummer **UNVERIFIED**, keine Registry erreichbar) · **Auftrag** `UNVERIFIED` (Autopilot ohne Nutzertext, Fall aus Projektstand rekonstruiert)

## 1 · Auftrag, Rolle, Grenzen

| Punkt | Festlegung |
|---|---|
| Zweck | Technische Prüfung der seit dem letzten Lauf (`NX-MYADMIN-V2`, Stichtag 26.09.2026 23:27 UTC) neu hinzugekommenen Kerne und ihrer Konfiguration. Diese Teile hat kein früherer Lauf geprüft. |
| Adressat | Pascal Courbois (Eigentümer, Endabnahme) |
| Art | internes technisches Prüfgutachten, **kein** Sachverständigen- oder Gerichtsgutachten, keine Rechtsberatung |
| Prüfer | KI-gestützte Prüfung im Gestaltungsprojekt. Keine Bestellung, keine Akkreditierung. **Nicht unabhängig**: dieselbe Instanz führt alle drei Stufen aus (siehe Einschränkungen). |
| Aussageklassen | **T** Tatsache (im Projekt belegt) · **R** reproduziert (Prüffall ausgeführt, Ergebnis protokolliert) · **B** fachliche Bewertung · **J** Rechtsfrage, nur abgegrenzt |

### Gegenstand (Scope)

| Datei | SHA-256 (Stichtag) | Zeichen |
|---|---|---|
| `lib/langlauf.js` | `9b011b29…d8d4e7` | 11.986 |
| `lib/posteingang.js` | `ed1e56fc…a572f634` | 8.231 |
| `tests/langlauf.test.js` | `4017da1c…beff0` | 444 |
| `tests/posteingang.test.js` | `c37fa922…7665e2` | 5.571 |
| `config/llm-verbindungen.json` | `2ce8566b…af01b` | 2.060 |
| `config/langlauf.json` | `bd64c2e0…49fa79` | 1.776 |
| `config/integrationen.json` | `4a879cf3…43b65` | 4.984 |
| `docs/03-backend/langlauf-orchestrierung.md` | `8e54c653…4792d` | 3.480 |
| `docs/02-frontend/webui-librechat.md` | `c353afa0…766ac2` | 3.952 |
| `NeXify Workspace.dc.html` | `bd5edc78…a8eef` | 115.423 |
| `NeXify Posteingang.dc.html` | `2918ba44…87e72` | 27.207 |

Vollständige Hashes in `laufakte.json`. Kontextquellen (nur gelesen, nicht Gegenstand): `AGENT.md`, `docs/04-betrieb/freigabe-gate-status.md`, beide früheren Laufakten. Umfangs-Hash über alle 15 Dateien: `sha256:30332e28…a760860c`.

### Bewusst nicht geprüft (mit Grund)

| Bereich | Grund | Status |
|---|---|---|
| `lib/rechenkern.js`, `lib/tagrouter.js`, myADMIN v2 | im Lauf `NX-MYADMIN-V2` geprüft; unverändert seitdem nicht neu bewertet | OUT_OF_SCOPE_JUSTIFIED |
| Agentur-Seite v10, Shop, Portale | im Lauf `NXAI-DESIGN-2026-09` geprüft | OUT_OF_SCOPE_JUSTIFIED |
| 9router, OpenBao, Resend, IMAP, LightRAG live | kein Netz- und Serverzugriff aus dieser Umgebung | BLOCKED |
| Darstellung, Tastaturbedienung, Kontrast von Workspace und Posteingang | Lauf auf Kernlogik begrenzt; Sichtprüfung braucht eigene Runde | IN_SCOPE_OPEN |
| Ausführung unter Node/Vitest | kein Node in dieser Umgebung; Prüffälle stattdessen im Browser-Sandkasten mit denselben Modulen ausgeführt | IN_SCOPE_OPEN |
| LibreChat-Lizenzpflichten | kein Quellcode übernommen (Nachbau); wird erst bei einem Fork relevant | OUT_OF_SCOPE_JUSTIFIED |
| Last, Leistung, Transportsicherheit, Sicherung/Wiederherstellung | kein laufender Dienst vorhanden | NOT_APPLICABLE_JUSTIFIED (bis Dienst existiert) |

## 2 · Methode

1. Quelltexte vollständig gelesen, Hashes berechnet.
2. Mitgelieferte Prüffälle ausgeführt: Module per `import()` geladen, `FAELLE` aus `lib/langlauf.js` und `tests/posteingang.test.js` unverändert ausgewertet.
3. Eigene Gegenproben (X01–X06, Y01–Y08) an Stellen, an denen Code und Konfiguration/Doku auseinanderlaufen können. Jede Gegenprobe ist unten mit Eingabe und Ist-Ergebnis festgehalten und wiederholbar.
4. Oberflächen nur per Mustersuche auf Kernanbindung, Speicher und KI-Hinweis gesichtet.

**Evidenzstufe:** E2 (automatisiert, wiederholbar) für alle R-Befunde. Keine Stufe E3: kein Rollback ausgeführt, keine Produktivumgebung.

## 3 · Ergebnis der mitgelieferten Prüffälle

| Suite | Ergebnis | Aussage |
|---|---|---|
| `lib/langlauf.js` FAELLE LL01–LL19 | **19/19 bestanden** | bestätigt die Angabe in `config/langlauf.json` |
| `tests/posteingang.test.js` | **20/20 bestanden** | bestätigt den Kern im vorgesehenen Umfang |

Bestanden heißt: der Code tut, was diese Fälle prüfen. **Keiner** der Befunde in Abschnitt 4 wird von diesen Fällen erfasst.

## 4 · Befundregister

### 4.1 Langlauf-Kern (`lib/langlauf.js`)

| ID | Befund | Beleg (Eingabe → Ist) | Kl. | Risiko | Schwere |
|---|---|---|---|---|---|
| **WK-01** | Ein Schemafehler versetzt den Lauf in `wartet`, `bereit()` gibt den Schritt trotzdem frei, `starte()` startet ihn ohne Menschen neu. `config/llm-verbindungen.json` sagt ausdrücklich: nicht wiederholen bei `schema`. | X01: `scheitere(…,"schema")` → `bereit()` = `wissen,recherche`; `starte()` → Lauf `laeuft`, Versuch 2 | R | Kosten für sinnlose Wiederholung; Menschen-Schranke umgangen | hoch |
| **WK-02** | Ein durch Budget pausierter Lauf kommt nicht mehr weiter: `fortsetzen()` verlangt „Budget erhöhen“, eine Funktion dafür gibt es nicht. | X02: Budget 5 ct, Kosten 6 ct → `pausiert`; `fortsetzen` → `E_BUDGET`; `budgetErhoehen` nicht exportiert | R | Lauf verloren oder Datenbank wird von Hand geändert | mittel |
| **WK-03** | Wird das Budget im letzten Schritt überschritten, überschreibt `wartet` die Pause. Nach Freigabe ist der Lauf `fertig`, obwohl über Budget. | X06: Budget 40 ct, Verbrauch 90 ct → `wartet` | R | Budgetgrenze im letzten Schritt unwirksam | mittel |
| **WK-04** | Der Lease wird nirgends geprüft. `starte`, `erledige`, `scheitere` arbeiten, egal wer den Lease hält. Es gibt kein Freigeben des Lease. | X03: Lease `director-a`, `starte()` ohne Besitzerangabe → `laeuft` | R | zwei Director am selben Lauf, doppelte Arbeit/Kosten; Schutz hängt allein an der noch nicht gebauten optimistischen Sperre | hoch (für Mehrprozessbetrieb) |
| **WK-05** | Die 72-h-Grenze wird nur erkannt (`zeitUeberschritten`), nicht durchgesetzt. | X04: `starte()` 100 h nach Anlage → `laeuft`, `zeitUeberschritten` = true | R | Läufe über die zugesagte Grenze | mittel |
| **WK-06** | Eine lange Zusammenfassung sprengt das Kontextfenster; `zusammenfassungMaxTokens` (1.500) wird nicht erzwungen. | X05: Grenze 1.000, Zusammenfassung 4.000 Zeichen → `genutzt` = 1.200 | R | Modellaufruf scheitert oder schneidet ab | mittel |
| WK-07 | Tokenzahl = Zeichen ÷ 4. Das ist eine Schätzung, kein Tokenizer; Abweichung je Modell unbekannt. | Code Z. 105 | T/B | Grenzwerte ungenau | niedrig |
| WK-08 | `wartezeitMs` streut nur, wenn der Aufrufer `zufall` übergibt; Standard 0,5 = keine Streuung. | Code Z. 98 | T/B | gleichzeitige Wiederholungen vieler Läufe | niedrig |

### 4.2 Posteingang-Kern (`lib/posteingang.js`)

| ID | Befund | Beleg (Eingabe → Ist) | Kl. | Risiko | Schwere |
|---|---|---|---|---|---|
| **WK-09** | Die Prüfung der KI-Kennzeichnung ist wirkungslos: `/KI/i` trifft jedes Wort mit „ki“. | Y01: `ki:true`, Text „Anbei die **Ski**zze …“ → `ok: true` | R / J | KI-Mails ohne Hinweis gehen als geprüft durch. Rechtliche Tragweite (Art. 50 KI-VO) ist **J**, nicht hier bewertet. | hoch |
| **WK-10** | Eine Fallnummer im Text reicht für „Sicherheit hoch“, auch von fremdem Absender. Mit Werkstatt-Wörtern folgt `auto-faq`. | Y03: `fremd@gmail.com`, „Gutschein einlösen AU-2026-0142“ → Kunde K-001, `hoch`, `auto-faq` | R | Mail wird dem falschen Kunden zugeordnet; Agenten-Entwürfe mit Fallkontext an Fremde | hoch |
| WK-11 | Newsletter mit „Datenschutz“ in der Fußzeile landen als `recht` mit Priorität hoch. | Y02 → `recht`, `hoch`, `entwurf` | R | Alarmmüdigkeit, echte Rechtsmails gehen unter | mittel |
| WK-12 | Ungültiges Datum bricht die Verarbeitung mit `RangeError` ab. | Y04: `date:"gestern"` → `RangeError: Invalid time value` | R | eine Mail kann den Eingangsdurchlauf anhalten | mittel |
| WK-13 | SPF-Fehler allein (30 Punkte) bleibt unter der Spamgrenze; eine Anfrage bekommt eine automatische Bestätigung an die möglicherweise gefälschte Adresse. | Y05 → Score 30, `auto-bestaetigung` | R | Rückstreuung (Backscatter), Ruf der Absenderdomain | mittel |
| WK-14 | Die Absenderadresse fließt in die Kategorie: jede Mail von `support@…` wird `support`. | Y06 → `support` statt `anfrage` | R | falsche Priorität | niedrig |
| WK-15 | Sperrliste per Teilstring: `boese.de` sperrt auch `nichtboese.de` (Score 100, `blockieren`). | Y08 | R | legitime Mails lautlos blockiert | mittel |
| WK-16 | Zustellrate über 100 % möglich, weil der Nenner bei 0 Versandereignissen auf 1 gesetzt wird. Die Ampelschwellen haben keine Quellenangabe. | Y07: 2× `delivered` → Rate 2 | R / T | irreführende Kennzahl | niedrig |

### 4.3 Oberflächen, Konfiguration, Dokumentation

| ID | Befund | Beleg | Kl. | Risiko | Schwere |
|---|---|---|---|---|---|
| WK-17 | `NeXify Posteingang` fällt offen aus: lädt der Kern nicht, gelten alle ausgehenden Mails als geprüft (`{ ok: true }`) und alle Mails, auch Spam, erscheinen in den Ordnern. | `NeXify Posteingang.dc.html` Z. 145–146, 196 | T | Fehlerbild sieht aus wie Erfolg | mittel |
| WK-18 | `config/integrationen.json` führt 9router, LightRAG, AgentMemory, Monitoring u. a. als „vorhanden“ – ohne Health-Beleg und Datum. `AGENT.md` § 6 sagt „nicht geprüft“, `docs_dev/task_plan.md` „LightRAG nicht erreichbar“. | Dateivergleich | T | Planung auf unbelegtem Ist-Stand | mittel |
| WK-19 | Modellnamen, Router-URL, Schlüssel und Preise je Stufe stehen als Platzhalter. Kosten je Antwort sind daher nicht berechenbar. | `config/llm-verbindungen.json` | T | Budget- und Journalbuchung ohne Grundlage | hoch (für das Gate) |
| WK-20 | Composio (US-Anbieter) ist als Adapter vorgesehen; Bedingung „nur mit AVV/SCC“ steht im Hinweis, eine Entscheidung ist nicht dokumentiert. | `config/integrationen.json` | T / J | Drittlandtransfer personenbezogener Daten | mittel |
| WK-21 | Der KI-Hinweis im Workspace ist vorhanden, aber sprachlich falsch: „Antworten erstellt KI (Art. 50 KI-VO)“ (ebenso im `librechat.yaml`-Auszug). | Workspace Z. 233; `webui-librechat.md` | T | Hinweis wirkt unfertig | niedrig |
| WK-22 | Workspace speichert Verlauf, Gedächtnis und Läufe im Browser (`localStorage`, Präfix `nxws.`). Für den Prototyp angemessen; Löschfrist für den Betrieb offen. | Workspace Z. 434–435, 521–523 | T | Verwechslung Prototyp/Produktivspeicher | niedrig |
| WK-23 | Keine der Gegenproben X01–X06, Y01–Y08 ist als Prüffall vorhanden; kein CI-Lauf, kein Repository. | Abschnitt 3 | T | Fehler kehren unbemerkt zurück | mittel |
| WK-24 | `langlauf-orchestrierung.md` führt „Kein endloser Lauf (72 h)“ und „Nur ein Director je Lauf“ als **im Kern geprüfte Garantie**. Geprüft ist nur das Erkennen bzw. die Lease-Funktion für sich (WK-04, WK-05). | Doku ↔ Code | T | überzeichnete Zusage | mittel |

### 4.4 Positiv belegt (kein Mangel, geprüft)

- Reihenfolge der Pipeline, leeres Ergebnis kein Abschluss, Fehlerklasse Pflicht, doppelter Abschluss bucht nicht doppelt, nur Pascal gibt frei (LL02–LL09, LL04/05).
- Rechnung, Recht und Auftrag werden nie automatisch beantwortet; Absender und Antwortadresse werden erzwungen (Posteingang-Tests).
- Keine echten Zugangsdaten in den Konfigurationsdateien, nur `${…}`-Verweise.
- MCP-Werkzeuge ohne zerstörende Aktionen; schreibende Werkzeuge erzeugen laut Konfiguration nur Entwürfe (nur Konfiguration gelesen, kein Server).
- KI-Hinweis im Workspace sichtbar unter der Eingabe und je Antwort (`· KI ·` in der Metazeile).

## 5 · Lücken, Annahmen, Widersprüche

| ID | Art | Inhalt | Wirkung |
|---|---|---|---|
| L-01 | Lücke | Live-Health 9router, LightRAG, Resend, IMAP | blockiert Aussage „Verbindung funktioniert“ |
| L-02 | Lücke | Sicht- und Barrierefreiheitsprüfung Workspace, Posteingang | offen, blockiert nichts in Stufe 2 |
| L-03 | Lücke | Node/Vitest-Lauf | Ergebnis im Browser gleichwertig für reine Funktionen (Annahme A-01) |
| L-04 | Lücke | Normvolltexte | keine Abschnittsinhalte zitiert |
| A-01 | Annahme | Die Module sind frei von I/O; Ausführung im Browser ergibt dieselben Ergebnisse wie Node. Begründung: keine Node-APIs im Code. | reversibel, beim ersten CI-Lauf bestätigen |
| W-01 | Widerspruch | Integrationen „vorhanden“ ↔ AGENT.md „nicht geprüft“ (WK-18) | Eigentümer Pascal/Betrieb |
| W-02 | Widerspruch | Doku-Garantie 72 h/Lease ↔ Code (WK-24) | Eigentümer Entwicklung |
| W-03 | Widerspruch | Konfiguration „nicht bei schema“ ↔ Code (WK-01) | Eigentümer Entwicklung |

## 6 · Einschränkungen

- **Phasenemulation**: keine getrennten Subagenten verfügbar; die drei Stufen laufen nacheinander in derselben Instanz. Unabhängigkeit ist dadurch **nicht** gegeben.
- `orchestrate_state.py` nicht verfügbar; Vertrag von Hand eingehalten.
- Kein zentrales Koordinationslog und keine zweite Sicherungsebene erreichbar; Claim und Sicherung nicht eingetragen.
- Normbezüge nur aus dem Projektregister (`normenregister-verifiziert.md`, N-08), in diesem Lauf nicht live neu verifiziert.

## 7 · Übergabe an Stufe 2

Status **PARTIAL**: alle tragenden Befunde sind belegt; blockiert sind nur Aussagen, die Live-Zugriff brauchen (L-01). **Auswirkung auf Plan:** Maßnahmen zu WK-19 und WK-20 können nur als Beschaffungs- bzw. Entscheidungsmaßnahme geplant werden. **Auswirkung auf Zertifizierungsreife:** Kriterien zu Verbindungen und Drittland bleiben ohne Nachweis.
