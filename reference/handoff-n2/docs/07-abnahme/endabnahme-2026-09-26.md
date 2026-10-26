# Endabnahme NeXify AI Website v3 (Text, Gestaltung, Recht)

**Datum:** 26.09.2026 · **Prüfgegenstand:** `NeXifyAI Cloud v3.dc.html`, `NX-Header.dc.html`, `NX-Footer.dc.html`, 15 umgestellte Portal- und Anmeldeflächen · **Maßstab:** `NeXifyAI-CI-Schema.md` (CI-002), `NeXify-Marketingkonzept.md` (MKT-002), AGENTS.md A-31, Freigabe-Gate (binär, belegt)

**Wissensstand:** AgentMemory (ZK) wurde zweimal abgefragt (25.09. und 26.09.), beide Male mit HTTP 504. Grundlage sind deshalb die Treffer vom 25.09. und die Projektdokumente. LightRAG war nicht erreichbar.

---

## Ergebnis

| Bereich | Urteil |
|---|---|
| Text und Tonalität | **bestanden** (nach 24 Korrekturen, siehe unten) |
| Gestaltung nach CI-002 | **bestanden** (Kontraste nachgerechnet, keine hellen Restflächen) |
| Recht / Livegang | **nicht bestanden: 4 Blocker**, die nur der Betreiber lösen kann |

**Freigabe für den Livegang: NEIN.** Nach der Entscheidung zu B1–B4 wird erneut abgenommen.

---

## Blocker (Livegang)

| # | Befund | Grundlage | Erforderlich |
|---|---|---|---|
| B1 | Drei Kundenstimmen ohne hinterlegten Nachweis. Zitat 1 („mehr Anfragen als unser gesamtes Team … rund um die Uhr“) ist eine Leistungsbehauptung. | § 5 UWG, UGP-RL Anh. I Nr. 23b | schriftliche Freigabe mit Nachweis je Zitat oder Ersatz durch anonyme Fallkarten. Zitate werden nicht umformuliert, das wäre Verfälschung. |
| B2 | AGENTS.md „niemals sagen, dass du KI bist“ widerspricht dem KI-Hinweis auf der Website | Art. 50 KI-VO | Regel für Website und Chat aufheben |
| B3 | Vorgabe „Prepaid über Revolut“ widerspricht AGB § 4 (Tagesrechnung, Zahlung bis 09:00 Uhr am Folgetag) | Vertragsklarheit | Zahlungsmodell festlegen, danach AGB § 4 anpassen |
| B4 | Datenschutz § 12 nennt „Dependabot, CodeQL“ (GitHub-Werkzeuge), der Betrieb läuft laut Wissensstand auf GitLab | Art. 13 DSGVO (Richtigkeit) | tatsächlich eingesetzte Scanner eintragen |

## Auflagen (vor oder mit dem Pilotbetrieb)

1. Datenschutz: Drittlandübermittlung nach China (DeepSeek) ist nur allgemein benannt; Garantien konkret nennen.
2. „DE/NL“ nur für die Beratung versprechen, solange keine niederländische Website existiert (bereits umformuliert).
3. Kontaktformular: Die Datenschutzerklärung beschreibt ein Formular, die Seite hat noch keines (Seitenplan A9).
4. Porträtfoto fehlt auf „Über uns“.

---

## Korrekturen als Texter (26.09.2026)

| Stelle | vorher | nachher | Regel |
|---|---|---|---|
| Landingpages | „führt und konvertiert“ | „führt und zur Anfrage bringt“ | kein Marketing-Jargon |
| Onlineshops | „Ihr Geschäftsmodell tut es“ | „sondern Ihr Geschäftsmodell“ | Anglizismus |
| Weitere Leistungen | „KI-Laufzeitbausteine: Modell-Routing, Agentengedächtnis, semantische Wissenssuche“ | „das passende Modell je Aufgabe, ein Gedächtnis für Ihre Agenten, die Suche im eigenen Firmenwissen“ | kein internes Vokabular |
| Über uns | „Vertrieb auf Konzernniveau“ | „Vertrieb in Konzernstrukturen“ | kein Superlativ |
| Über uns | „kein Blackbox-Versprechen“ | „kein Versprechen aus der Blackbox“ | Lesbarkeit |
| Datenschutz § 6 | „ist ein Large Language Model“ | „ein KI-Berater auf Basis eines großen Sprachmodells“ | Richtigkeit, Deutsch |
| Datenschutz § 3, § 9 | TTDSG (4×) | TDDDG | Gesetz seit 14.05.2024 umbenannt |
| AGB § 4 | „je angefangenem, vollständigem Arbeitstag“ | „je vollständigem Arbeitstag“ | Widerspruch in sich |
| Impressum | „MEZ“ | „MEZ/MESZ“ | Einheitlichkeit mit Kontakt |
| alle Flächen | Geviertstrich „—“ (72×) und Halbgeviertstrich gemischt | einheitlich Halbgeviertstrich „–“ mit Leerzeichen | DIN 5008, CI-002 § 9 |

Die Korrekturen vom 25.09. (9 Stellen) stehen in `docs_dev/findings.md`.

## Gestaltung, geprüft

| Kriterium CI-002 § 11 | Ergebnis | Beleg |
|---|---|---|
| nur Farbwerte aus § 4, keine hellen Flächen | ✓ | Suche nach Farben mit Luminanz > 0,45 über 15 Flächen, 0 Treffer außer Lime |
| Textkontrast ≥ 4,5 : 1 | ✓ | #F4F5F2 17,9 · #C9CFD2 12,5 · #A3ABAF 8,4 · #7E878B 5,3 · Lime 15,0 |
| nur Geist / Geist Mono | ✓ | Kopfbereich legt die Schrift selbst fest |
| Menü bei schmaler Breite | ✓ | Menü-Schaltfläche unter 1080 px |
| KI-Hinweis beim Berater | ✓ | Art.-50-Hinweis vor der ersten Antwort |
| Klickflächen ≥ 44 px | ✓ | Schaltflächen 44–52 px |


**B3 · Stand 28.09.2026:** aufgelöst durch Trennung – Projekte: Tagesabrechnung nach AGB § 4; NeXify AI API: ausschließlich Prepaid nach den API-Bedingungen, AGB § 4 verweist vorrangig darauf. Freigabe der Texte durch Pascal offen.
