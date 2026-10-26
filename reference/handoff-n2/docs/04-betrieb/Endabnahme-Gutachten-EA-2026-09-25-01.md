# Endabnahme-Gutachten Design-Prototyp NeXify AI (v3, dunkel)

**Gutachten-Nr.:** EA-2026-09-25-01 · **Erstellt:** 25.09.2026 · **Prüfer:** Design-Sitzung (Claude) · **Endabnahme:** **offen — Pascal Courbois**
**Grundlage:** Skill `freigabe-gate-live-betrieb` (Stufen 1–5, Evidenzklassen E0–E3) · `NeXifyAI-CI-Schema.md` (CI-002) · Claim-Truth-Gate (AgentMemory, 25.09.2026 01:05) · AGENTS.md A-31
**Prüfgegenstand:** 15 Flächen dieses Design-Projekts — `NeXifyAI Cloud v3`, `NX-Header`, `NX-Footer`, `Anmeldung`, `Kundenportal`, `Partnerportal`, `Nachbarschaftskunden-Portal`, `Konto`, `Start`, `Architektur`, `NeXify-AI-Companion`, `Partner-werden`, `Werkstatt-Partnerseite`, `NeXifyAI-Wissenshub-Artikel`, `NeXifyAI-Local-SEO-Muster`.
**Nicht Prüfgegenstand:** TEILEKLAR-Shop und Werkzeuge (heller Stand, Entscheidung offen), Druckstücke, E-Mails, Backend, Live-Server.

---

## 1. Ergebnis in einem Satz

**Designabnahme (Gestalt, Kontrast, Schrift, Aussagen): bestanden nach Nachbesserung. Live-Freigabe: nicht ausführbar** — dieser Prüfgegenstand ist ein Prototyp ohne Vorschau-Stufe und ohne Deployment; die Gate-Stufen 1 und 2 können deshalb nicht bestanden werden.

## 2. Gate-Stufen (binär)

| Stufe | Ergebnis | Begründung |
|---|---|---|
| 1 · Vorschau als Gatekeeper | **FAIL** | Keine Vorschau-Stufe vorhanden (`vorschau.nexifyai.cloud` löst laut Skill-Messung vom 08.09. nicht auf; aktueller Stand von hier nicht messbar). Einrichtung braucht Pascals DNS-Einzelfreigabe. |
| 2 · Health 60 s | **FAIL** | nicht anwendbar ohne Bereitstellung; gilt als unbelegt |
| 3 · Evidenz | **E2** für Design | automatisierte Positivprüfung über alle 15 Flächen (§ 3) + Sichtprüfung durch unabhängigen Prüfer je Fläche im Verlauf; Negativ-/Grenzfälle teilweise (§ 4). E3 nicht erreicht: kein Rollback ausgeführt. |
| 4 · Rollback-Plan | **PASS (Plan)** / Rollback nicht ausgeführt | Jede Datei hat Versionsstände im Projekt; `NeXifyAI Cloud.dc.html` (hell) bleibt unverändert als Rückfallfassung. Rückweg: Verweise auf „NeXifyAI Cloud.dc.html“ zurückstellen, Vorversion je Datei wiederherstellen. Dauer < 10 min, kein Serverzugriff nötig. |
| 5 · Gutachten + Endabnahme | Gutachten **liegt vor** · Endabnahme **offen** | nicht delegierbar |

## 3. Automatisierte Prüfung (alle 15 Flächen, nach Nachbesserung)

| Kriterium (CI-002 § 11) | Vorher | Nachher | Ergebnis |
|---|---|---|---|
| Helle Flächen (Luminanz > 0,45, außer Lime) | 18 (behoben 25.09.) | 0 | **PASS** |
| Alte Schriften (Archivo, IBM Plex Mono) | 5 | 0 | **PASS** |
| Schrift unter 12 px | 52 | 0 | **PASS** |
| Gewicht 800/900 | 0 | 0 | **PASS** |
| Radien über 12 px (ohne Kreis-Elemente 99 px) | 158 | 0 | **PASS** |
| Versalien-Beschriftungen mit Sperrung | 12 | 0 (Sprachkürzel DE/NL/FR ausgenommen) | **PASS** |
| Kartenschatten im alten Stil | 0 | 0 | **PASS** |
| Texttokens Kontrast auf `#0A0C0D` | — | 17,9 / 12,5 / 8,4 / 5,3 : 1 | **PASS** (≥ 4,5) |
| Konsolenfehler | — | 0 auf allen zuletzt geprüften Flächen | **PASS** |

## 4. Einzelbefunde aus der unabhängigen Prüfung (Verlauf dieser Sitzung)

| # | Fläche | Befund | Status |
|---|---|---|---|
| 1 | Agentur v3 | Skalenbalken schnitt Text ab | behoben, Balken ohne Text |
| 2 | NX-Header | Schrift fiel auf Times zurück; Menü lief unter 1080 px über | behoben (eigene Schrift, Menü-Schaltfläche) |
| 3 | Anmeldung | aktive Sprache Lime auf Weiß (1,2 : 1) | behoben |
| 4 | Portale | dunkle Karten fälschlich Lime; Kopf hell; „Abmelden“ unlesbar | behoben |
| 5 | Portale | helle Trennlinien `#E8E9E6` | behoben |
| 6 | Start | Fundament-Karten hell (1,05 : 1) | behoben |
| 7 | Header | Portal-Zugänge unklar | neu gegliedert: „Anmelden als · Kunde | Werkstatt | Gutschein“ |

## 5. Aussagenprüfung (Claim-Truth-Gate, § 5 UWG)

| Aussage | Gate-Status | Maßnahme |
|---|---|---|
| „24/7 Verfügbarkeit der Agenten“ (Hero-Kennzahl) | **gesperrt** | ersetzt durch „20:00 · Tagesbericht als Leistungsnachweis“ |
| „24/7 Erreichbarkeit“ (Laufband) | **gesperrt** | ersetzt durch „Tagesbericht“ |
| „1–3 Tage bis zur ersten Agenten-Version“ | **gesperrt** („max. 3 Tage“) | ersetzt durch „1 Tag · KI-/Prozess-Audit mit schriftlichem Ergebnis“ |
| „Sofort im Browser“ | gesperrt („sofort“) | „Direkt im Browser“ |
| „Modernste … um ein Vielfaches … Monate“ | Superlativ unbelegt | abgeschwächt |
| „449 € netto pro Arbeitstag“ | belegt (AGB § 4) | bleibt |
| **Kundenstimmen (3 Zitate)** | **unbelegt** — keine Freigabe/Nachweis im Projekt | **Blocker B-2** |
| „Auf Deutsch und Niederländisch“ (Beratung) | belegt (Über uns) | bleibt; Website selbst nur deutsch |

## 6. Blocker für die Live-Freigabe

| Nr. | Blocker | Eigentümer | Erster Schritt |
|---|---|---|---|
| B-1 | Vorschau-Stufe fehlt (Gate 1/2 unerfüllbar) | Pascal (DNS-Einzelfreigabe) + DevOps | Hostname, `noindex`, Zugangsschutz, Health-Endpunkt |
| B-2 | Kundenstimmen ohne Freigabe/Nachweis | Pascal | Freigabe je Zitat einholen oder durch anonyme Fallkarten ersetzen |
| B-3 | KI-Kennzeichnung widerspricht AGENTS.md („nie sagen, dass KI“) | Pascal | Regel für Website/Chat aufheben (Art. 50 KI-VO) |
| B-4 | Prepaid (Register) vs. Tagesrechnung (AGB § 4) | Pascal | eine Variante festlegen, AGB + Preisseite angleichen |
| B-5 | Porträtfoto fehlt (Über uns) | Pascal | Foto liefern |
| B-6 | Umsetzung in Produktivcode (Next.js/Svelte) steht aus | DevOps | Prototyp als Vorlage übergeben (Skill „Handoff“) |
| B-7 | TEILEKLAR, Werkzeuge, Druckstücke: Stil offen | Pascal | Entscheidung hell/dunkel |

## 7. Restrisiken

- Umwandlung der Portale erfolgte werkzeuggestützt; Sichtprüfung lag stichprobenartig vor (Kundenportal, Start, Anmeldung). Partnerportal, Nachbarschaftsportal, Konto, Architektur, Companion, Partner-werden, Werkstatt-Partnerseite, Wissenshub, Local-SEO nur automatisiert geprüft → **Restrisiko mittel** für Einzelzustände (Hover, aufgeklappte Bereiche, JS-berechnete Farben).
- AgentMemory-Suche zeitweise 504, LightRAG nicht erreichbar → Wissensstand auf Treffer dieser Sitzung beschränkt.

## 8. ZK-Log-Zeile

```
[2026-09-25T22:5xZ] FREIGABE-NACHWEIS Design-Prototyp NeXify AI v3 (15 Flächen) | Vorschau: FAIL (nicht vorhanden) | Health 60s: FAIL (keine Bereitstellung, Cache-Buster n/a)
  | E3: FAIL (Positiv PASS automatisiert / Negativ teilweise / Grenzwert teilweise 360–1440 px / Rollback nicht ausgefuehrt) | Rollback ausgefuehrt: nein
  | Gutachten: EA-2026-09-25-01 | Endabnahme: offen
```

Die Zeile ist in AgentMemory (`project=nexifyai`) als sitzungsübergreifender Kanal abgelegt; das zentrale ZK-Log ist aus dieser Designumgebung nicht beschreibbar.

## 9. Empfehlung

**Designseitig abnahmefähig.** Für den Live-Betrieb: Blocker B-1 bis B-4 zuerst, dann Übergabe an die Umsetzung (B-6), Bereitstellung auf der Vorschau, 60-s-Health, E3-Gegentest, danach Endabnahme durch Pascal.
