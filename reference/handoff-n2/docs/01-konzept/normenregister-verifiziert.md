# Normen- und Rechtsregister · verifiziert

**Stand 27.09.2026 · erhoben per Websuche an Primär- und Fachquellen.** Ersetzt die Zeilen „prüfen“ in `nexifyai-organisationshandbuch.md` § 6. Keine Aussage über Konformität. Normvolltexte liegen nicht vor, daher keine Abschnittsinhalte außer öffentlich beschriebenen.

| ID | Regelwerk | Gültige Fassung | Status | Quelle | Folge für NeXify AI |
|---|---|---|---|---|---|
| N-01 | ISO 9001 | **ISO 9001:2026** (6. Ausgabe), veröffentlicht 16.09.2026 | CURRENT_VERIFIED | iso.org | QM-Rahmen direkt auf 2026 aufbauen, nicht auf 2015. Übergangsfrist für Zertifikate läuft, für uns irrelevant, da keins vorhanden. |
| N-02 | ISO/IEC 27001 | **ISO/IEC 27001:2022 + Amd 1:2024** (Klimawandel-Frage in 4.1/4.2) | CURRENT_VERIFIED | iso.org 88435 | Kontextanalyse muss „Klimawandel relevant? ja/nein + Begründung“ enthalten (auch im QM-Kontext sinnvoll). |
| N-03 | ISO/IEC 42001 | **ISO/IEC 42001:2023** (1. Ausgabe), keine Änderung, kein Nachfolger; EN ISO/IEC 42001 als europäische Übernahme | CURRENT_VERIFIED | iso.org 81230 | KI-Register und Aufsicht danach ausrichten. Kein harmonisierter Standard zur KI-VO → keine Vermutungswirkung. Zertifizierung nur durch akkreditierte Stelle, kostenpflichtig. |
| N-04 | ISO 9241-110 | **ISO 9241-110:2020** / DIN EN ISO 9241-110:2020-10 | CURRENT_VERIFIED | iso.org 75258, dinmedia.de | Sieben Interaktionsprinzipien als Prüfkriterium in Review (A5/A6). |
| N-05 | ISO 9241-210 | **ISO 9241-210:2019** / DIN EN ISO 9241-210:2020-03 | CURRENT_VERIFIED | iso.org 77520 | Menschzentrierter Ablauf = K3 Anforderungsprofil + K6 Umsetzung mit Nutzertest; Anhang B als Checkliste. |
| N-06 | WCAG | **WCAG 2.2** (W3C 10/2023; ISO/IEC 40500:2025) | CURRENT_VERIFIED | w3.org | Zielniveau AA für alle Oberflächen. |
| N-07 | EN 301 549 | **V4.1.1** veröffentlicht 02.09.2026 (WCAG 2.2, Anhang ZB zum EAA); **rechtlich maßgeblich bleibt V3.2.1 (WCAG 2.1)**, bis V4.1.1 im Amtsblatt zitiert ist | CURRENT_VERIFIED | AccessibleEU 07.09.2026, ETSI | Heute gegen WCAG 2.2 AA bauen: erfüllt V3.2.1 mit und ist zukunftsfest. |
| N-08 | KI-VO (EU) 2024/1689 + Digital Omnibus (VO (EU) 2026/1744, in Kraft 27.07.2026) | Art. 50 gilt **seit 02.08.2026**, unverändert; Art. 50(2) maschinenlesbare Kennzeichnung für Bestandssysteme ab **02.12.2026**; Hochrisiko Anhang III ab 02.12.2027 | CURRENT_VERIFIED (Fachquellen, Amtsblatt-Text nicht selbst gelesen) | Goodwin, Morgan Lewis, Usercentrics | Chat-Hinweis „Sie sprechen mit KI“ ist Pflicht **jetzt**. KI-erzeugte Texte/Bilder: menschliche Redaktion vor Veröffentlichung (Ausnahme Art. 50(4)) + Markierung bis 02.12.2026. Bußgeld bis 15 Mio. € / 3 %. |
| N-09 | BFSG / EAA | gilt seit 28.06.2025 | CURRENT_VERIFIED | – | Kleinstunternehmen-Ausnahme für Dienstleistungen prüfen und dokumentieren; Kundenshops (TEILEKLAR) sind Verbraucher-E-Commerce → i. d. R. erfasst. |
| N-10 | DSGVO, BDSG, UAVG (NL) | geltend | Rechtsprüfung offen | – | AVV-Vorlage, Löschfristen, Art. 33 (72 h). |
| N-11 | GoBD, UStG, NL-BTW | geltend | Steuerberatung offen | – | Journal unveränderbar, Storno nur als Gegenbuchung – passt zum Rechenkern. |

## Zusammenhänge (direkt und indirekt)

1. **Ein Managementsystem statt drei.** ISO 9001, 27001 und 42001 teilen dieselbe Grundstruktur (Kontext, Führung, Planung, Unterstützung, Betrieb, Bewertung, Verbesserung). Folge: **ein** integriertes Handbuch, **ein** Risikoregister, **ein** Auditplan, **eine** Managementbewertung – mit drei Blickwinkeln (Qualität, Sicherheit, KI). Spart grob die Hälfte der Doku.
2. **KI-VO Art. 50 ist die einzige harte, schon geltende Pflicht in dieser Liste.** Alles andere ist freiwilliger Rahmen oder betrifft uns erst später. Priorität von AP-09 (KI-Register, Kennzeichnung) steigt deshalb von P1 auf **P0**.
3. **42001 bringt keine Vermutungswirkung für die KI-VO.** Nutzen liegt im belegbaren Governance-Nachweis gegenüber Kunden (Studienkolleg Aachen, Werkstätten), nicht in Rechtssicherheit.
4. **WCAG 2.2 AA heute = zwei Fliegen.** Erfüllt die heute maßgebliche V3.2.1 und nimmt V4.1.1 vorweg. Die sechs neuen Kriterien (u. a. Mindestzielgröße, Fokus nicht verdeckt, barrierearme Anmeldung) decken sich mit unseren Design-Normen (44 px Ziele, Fokusrahmen) – Prüfung automatisierbar über `tools/design-norm.js`.
5. **9241-210 und Langlauf passen zusammen.** Der Langlauf (Sammler → Analyst → Architekt) ist die Analysephase der menschzentrierten Gestaltung; es fehlt nur ein **Nutzertest** vor Abnahme – ergänzt als Pflichtschritt in K7.
6. **Klimawandel-Frage (27001 Amd 1)** kostet einen Satz in der Kontextanalyse; ohne ihn wäre ein späteres Audit sofort eine Abweichung.

## Offene Prüfungen

- Amtsblatt-Text der VO (EU) 2026/1744 selbst lesen (bisher Fachquellen).
- BFSG-Ausnahme für NeXify AI als Dienstleister schriftlich festhalten.
- DSGVO/UAVG und Steuern: extern.
