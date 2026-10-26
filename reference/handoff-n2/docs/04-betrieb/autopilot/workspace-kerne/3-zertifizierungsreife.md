# Stufe 3 · Zertifizierungs- und Konformitätsbereitschaft · Workspace-, Langlauf- und Posteingangskerne

**Lauf** `42426a46-0b05-47d6-a174-e1ea2494dfae` · **Rolle** agent3 (Phasenemulation) · **Grundlagen** Stufe 1 `1-gutachten.md` und Stufe 2 `2-umsetzungsplan.md` (Hashes in `laufakte.json`) · **Status** ENTWURF

> **Das ist kein Zertifikat.** Es ist eine interne Einschätzung, wie weit der Gegenstand von einer externen Prüfung entfernt ist. Keine akkreditierte oder benannte Stelle war beteiligt. Geplante Maßnahmen aus Stufe 2 werden **nicht** als umgesetzt gewertet.

## 1 · Gegenstand, Kriterienbasis, Grenzen

| Punkt | Festlegung |
|---|---|
| Gegenstand | Orchestrierungskern für lange Agentenläufe, E-Mail-Eingangs- und Ausgangsprüfung, deren Konfiguration und die zwei Oberflächen Workspace und Posteingang (Prototypen) |
| Beabsichtigtes Schema | **nicht festgelegt** (`commission_id` UNVERIFIED). Daher keine Schema-Konformität, sondern Bereitschaft gegen die unten genannte Kriterienbasis. |
| Kriterienbasis | (a) verbindliche Projektregeln `AGENT.md` § 0; (b) Freigabe-Gate-Stufen `freigabe-gate-status.md`; (c) KI-VO Art. 50 laut Projektregister N-08 (**in diesem Lauf nicht live neu verifiziert**, Volltext nicht zitiert); (d) DSGVO laut N-10 (Rechtsprüfung offen). ISO/IEC 27001 und 42001 werden **nicht** als Kriterien genutzt: Volltext nicht eingesehen, Schema nicht beauftragt. |
| Ausschlüsse | wie Stufe 1 § 1 (Rechenkern, Tagrouter, Website, Shop, Portale, Live-Dienste) |
| Unabhängigkeit | **nicht gegeben**: dieselbe Instanz hat Gutachten und Plan erstellt. Für jede externe Verwendung ist eine unabhängige Zweitprüfung nötig. |
| Nachweisstichtag | 27.09.2026, 21:22:28 UTC |

## 2 · Nachweismatrix

| Kriterium | Anforderung | Bestehender Nachweis | Lücke → Maßnahme | Bewertung |
|---|---|---|---|---|
| **C-01** KI-Kennzeichnung | Jede Fläche/Mail mit KI-Inhalt ist als KI erkennbar (AGENT § 0.5; N-08) | Workspace: Hinweis sichtbar (Stufe 1 § 4.4). Ausgangsprüfung vorhanden, aber wirkungslos (WK-09); Wortlaut fehlerhaft (WK-21) | M-02, M-16; Entscheidung E-A; GL-02 aus Lauf 1 offen | **Major** |
| **C-02** Mensch entscheidet | Nur Pascal gibt frei; Schemafehler nicht automatisch wiederholen | LL04/LL05 grün. Umgehung bei Schemafehler reproduziert (WK-01) | M-04 | **Minor** |
| **C-03** Kostenkontrolle | Budget wirkt immer; Kosten je Anfrage berechenbar | LL10 grün. Letzter Schritt umgeht Budget (WK-03); Pause ohne Ausweg (WK-02); Preise Platzhalter (WK-19) | M-05, M-06, M-21 | **Major** |
| **C-04** Exklusivität und Idempotenz | ein Director je Lauf; Wiederholung ohne Doppelbuchung | Idempotenz belegt (LL09). Lease nicht erzwungen (WK-04), DB-Sperre nicht gebaut | M-07 + Backend 6a | **Major** (für Mehrprozessbetrieb) |
| **C-05** Begrenzte Laufzeit und Kontext | 72 h, Kontextfenster eingehalten | nur erkannt (WK-05); Überlauf möglich (WK-06) | M-08, M-09 | **Minor** |
| **C-06** Richtige Zuordnung personenbezogener Mails | keine Zuordnung zu einem Kunden ohne tragfähigen Beleg | Freemail-Schutz grün. Fallnummer von Fremden → „hoch“ + Auto-Antwort (WK-10) | M-03 | **Major** |
| **C-07** Missbrauchsschutz E-Mail | keine Antworten an gefälschte Absender; keine Fehlsperren | Spam/DMARC-Fälle grün. Backscatter (WK-13), Teilstring-Sperre (WK-15) | M-11, M-12 | **Minor** |
| **C-08** Robustheit, sicheres Ausfallverhalten | fehlerhafte Eingabe hält nichts an; Ausfall sieht nicht aus wie Erfolg | Negativfall „ohne id“ grün. Datum bricht ab (WK-12), UI fällt offen aus (WK-17) | M-10, M-13 | **Minor** |
| **C-09** Belegter Ist-Stand der Verbindungen | jeder als vorhanden geführte Dienst hat ein datiertes Health-Protokoll | keiner (WK-18, L-01) | M-14, M-21 | **Major** |
| **C-10** Freigabe-Gate | Vorschau, 60 s Health, E3, Rollback, Endabnahme | Vorschau fehlt laut Messung vom 08.09.2026 (**HISTORICAL**, hier nicht neu messbar); E3 für diese Kerne nicht vorhanden | außerhalb dieses Plans: AGENT § 4 Schritte 2, 6, 6a | **NOT_ASSESSED** (nicht prüfbar) |
| **C-11** Drittland und Lieferanten | kein Transfer personenbezogener Daten ohne AVV/SCC und Bewertung | Bedingung nur als Hinweis (WK-20) | M-22, Rechtsberatung | **offen (J)** |
| **C-12** Regressionsschutz und Dokumentenlenkung | jeder gefundene Fehler hat einen Prüffall; Doku entspricht Code | 39/39 bestehende Fälle grün; 0 von 14 Gegenproben als Prüffall (WK-23); Doku überzeichnet (WK-24) | M-01, M-17 | **Minor** |
| **C-13** Speicher und Löschung | Löschfrist festgelegt | Prototyp im Browser (WK-22); Frist offen | M-23 | **Beobachtung** |

## 3 · Nichtkonformitäten

| ID | Art | Kriterium | Befunde | Ursache (Bewertung) | Auflage |
|---|---|---|---|---|---|
| NK-01 | Major | C-01 | WK-09, WK-21 | Prüfung auf Teilwort statt auf festen Satz; Wortlaut nicht entschieden | M-02, M-16 nach E-A |
| NK-02 | Major | C-03 | WK-02, WK-03, WK-19 | Zustandsvorrang nicht festgelegt; Preise fehlen | M-05, M-06, M-21 |
| NK-03 | Major | C-04 | WK-04 | Lease als Datenfeld, nicht als Schranke | M-07 |
| NK-04 | Major | C-06 | WK-10 | Belastbarkeit der Nummer höher bewertet als die des Absenders | M-03 |
| NK-05 | Major | C-09 | WK-18, WK-19 | Soll-Stand als Ist-Stand eingetragen | M-14, M-21 |
| NK-06 | Minor | C-02 | WK-01 | `bereit()` ignoriert Laufzustand `wartet` | M-04 |
| NK-07 | Minor | C-05 | WK-05, WK-06 | Grenze nur als Abfrage umgesetzt | M-08, M-09 |
| NK-08 | Minor | C-07 | WK-13, WK-15 | Auto-Antwort ohne Authentizitätsbedingung; Teilstring-Vergleich | M-11, M-12 |
| NK-09 | Minor | C-08 | WK-12, WK-17 | fehlende Eingabeprüfung; Standardwert `ok` | M-10, M-13 |
| NK-10 | Minor | C-12 | WK-23, WK-24 | Tests nur für den geplanten Weg | M-01, M-17 |

Nicht als Nichtkonformität geführt, aber zugeordnet: WK-07 → M-20, WK-08 → M-19, WK-11/WK-14 → M-15, WK-16 → M-18, WK-20 → C-11, WK-22 → C-13.

## 4 · Reifegrad

| Bereich | Stand |
|---|---|
| Entwurf und Regeln | weitgehend dokumentiert; Regeln sind klar und prüfbar formuliert |
| Umsetzung der Regeln im Code | teilweise: der geplante Weg ist abgesichert, Grenzfälle nicht |
| Wirksamkeitsnachweis | nur E2 im Sandkasten; kein Betrieb, kein Nachweiszeitraum |
| Managementsystem, gelenkte Dokumente, internes Audit | nicht vorhanden bzw. nicht Gegenstand |

## 5 · Urteil

**`NOT_READY`** — 5 Major, 5 Minor, 1 Beobachtung, 1 Kriterium nicht prüfbar, 1 offen (Recht).

Weg zu `CONDITIONALLY_READY` (intern, nicht extern): NK-01, NK-03, NK-04 mit grünen Prüffällen geschlossen **und** NK-02/NK-05 mit Health- und Preisprotokoll belegt. Weg zu `READY_FOR_EXTERNAL_CERTIFICATION`: zusätzlich ein festgelegtes Schema, eine unabhängige Prüfung, ein Nachweiszeitraum im Betrieb und das bestandene Freigabe-Gate. **Keines dieser Urteile ist eine Freigabe für den Live-Betrieb**; Endabnahme und Hartsperren bleiben unberührt.

## 6 · Übergabe

Status **PARTIAL**: Bewertung vollständig für alle prüfbaren Kriterien. Blockierend: B-01 kein Health-/Preisnachweis (C-09, C-03), B-02 keine Rechtsprüfung Drittland (C-11), B-03 keine Unabhängigkeit.
