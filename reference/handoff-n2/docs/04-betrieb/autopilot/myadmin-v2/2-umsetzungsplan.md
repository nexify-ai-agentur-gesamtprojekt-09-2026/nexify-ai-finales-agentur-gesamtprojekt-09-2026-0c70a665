# Umsetzungsplan · myADMIN v2

Quelle: Gutachten 2d046599-19d9-4d46-81ae-6d6f3ded61d3 (SHA siehe Laufakte).

| ID | Befund | Typ | Maßnahme | Rolle | Prio | Aufwand | Abnahme | Nachweis | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| M-01 | B-04 | VERIFY | Visuelle Prüfung aller 16 Bereiche + ⌘K nach Korrektur | Pascal/Prüfer | P1 | 0,5 h | jeder Bereich zeigt genau eine Sektion, Agenten-Tabelle 10 Zeilen | Screenshots je Bereich | v1 weiter nutzen |
| M-02 | B-03 | IMPLEMENT | Statische Prüfung (doppelte Konstanten/Tabs/Blöcke) als Test in tests/ | Umsetzung | P2 | 1 h | Test schlägt bei absichtlich doppeltem Tab fehl | Vitest-Lauf | Test entfernen |
| M-03 | B-07 | IMPLEMENT | AP-01 bis AP-06 laut Umsetzungsplan | Umsetzung | P1 | ROM 15–25 Tage | siehe AP-Abnahmen | Freigabe-Nachweis je AP | Feature-Flags |
| M-04 | B-08 | DESIGN | Einzelfreigabe Vorschau-Stufe einholen | Pascal | P0 | – | schriftliche Freigabe mit Datum | Chat-Freigabe | – |
| M-05 | B-05 | INVESTIGATE | Kosten je Vorgang messen (AP-09) statt annehmen | Umsetzung | P2 | 2 Tage | 30 Tage Median je Vorgangsart | Cockpit-Export | Annahmen-Hinweis bleibt |
| M-06 | B-10 | DESIGN | Entscheidungen E1–E5 und §11 treffen | Pascal | P0 | 1–2 h | Betriebsbuch-Eintrag je Entscheidung | Betriebsbuch | – |
| M-07 | B-09 | DESIGN | KI-Kennzeichnung für Agenten mit Außenwirkung festlegen (vor AP-10) | Pascal + Recht | P1 | 1 h | Text + Stelle je Portal | Rechtsprüfung | – |

## Dispositionen
| Befund | Disposition |
|---|---|
| B-01 | KEINE_MASSNAHME – bestanden (Entscheider: Prüfer) |
| B-02 | KEINE_MASSNAHME – bestanden (Entscheider: Prüfer) |
| B-03 | BEHEBEN → M-02 (Regressionsschutz) |
| B-04 | WEITER_UNTERSUCHEN → M-01 |
| B-05 | WEITER_UNTERSUCHEN → M-05 |
| B-06 | AKZEPTIEREN – Kennzeichnung ausreichend bis echte Daten (Entscheider: Pascal, bis AP-10) |
| B-07 | BEHEBEN → M-03 |
| B-08 | BLOCKIERT → M-04 |
| B-09 | WEITER_UNTERSUCHEN → M-07 |
| B-10 | BLOCKIERT → M-06 |

Dieser Plan ist keine Ausführungsfreigabe.
