# NeXify Gesamt-Fertigstellungsplan + Verständnis-Nachweis (05.11.2026)

**Zweck.** Nutzerziel „Auftragserfüllung / Gesamtfertigstellung, vorgaben-gesteuert, Langlauf". Dieses Dokument ist der
geforderte **Verständnis-Nachweis** und **Plan**: es kartiert den tatsächlichen Register-Stand (`config/acceptance-coverage.json`,
`requirements_reconciliation`), klassifiziert jede offene Arbeit nach **Blocker-Klasse** und benennt, was ich autonom im
Regelkreis abarbeite (Betriebsmodus D-FACTORY-20261105) gegenüber dem, was Owner-, Server- oder Provider-Zuarbeit braucht.

**Ehrliche Reichweite (Governance).** „Gesamtfertigstellung" bis zur Abnahme ist aus dieser verwalteten Cloud-Session
**nicht allein erreichbar**: die Abnahme (P01–P26 `not_accepted`) ist ein Owner-Gate, und viele Voraussetzungen liegen auf
VPS/Runtime, bei externen Providern oder bei Owner-Entscheidungen. Kein `state` wird ohne reale Evidenz auf „accepted"
gesetzt; keine behauptete Chat-/VPS-/LightRAG-Gesamterinnerung. Belastbare Historie = versionierter Repo-Zustand.

## 1 · Register-Stand (gemessen, nicht geschätzt)
- **P01–P26** (Fachdomänen: Auftrag/CRM, Design, Seiten, Medien, Suitezugang, Arbeitsplatz, API/Kosten, Produktdaten,
  Passung, Kauf, Lieferung, Stadt/Werkstatt, Partner, Termin/Gutschein, Portale, Auth, Mail, Finance, Wissen, Steuerung,
  Skills, Marketing, Betrieb, Release/Recht/QS, Besucher-Plugins, Übergabe): **alle `not_accepted`**. Abnahme ist Owner-Gate.
- **G01–G30** (konkrete Lücken): gemischt `open` / `decision_*` / `*_evidence_required` / einige implementiert.
- **PR35–PR40-Review-Fixes**: `local_fixed_verified` (lokal behoben, nachgewiesen).

## 2 · Klassifikation der offenen Arbeit nach Blocker

### A — Autonom jetzt ausführbar (ich, im Regelkreis, mit Evidenz)
| Item | Inhalt | Nächster Schritt |
|---|---|---|
| D-DESIGN Stufe 3b | Champagner-Akzent-Adoption (Signatur) | Folgescheiben: Display-Verlauf H1, Tabellenkopf, Stat-Zahlen, Chip-Variante — je Scheibe Evidenz-regen |
| GAP-TOKENBASE | kanonische Basis-Tokens (`design-tokens.json`/`tokens.css`) warm angleichen | eigene deliberate Leg, volle Evidenz-Neuerhebung (identity-hero, one-app, shop-ref, observability) |
| G13 | historische Browsernachweise ≠ aktuelle Quellen | stale Evidenz je Bereich neu erheben, Register binden |
| G30 / G20 (Teil) | Produkt-/Editionstext-Widersprüche (ohne Preis-Neuerfindung) | Copy an `fakten.json` prüfen; Preiswerte bleiben Owner |

### B — Owner-Entscheidung / Upload / Freigabe nötig (verfolgt, blockiert nur die Teilwirkung)
| Item | Braucht vom Owner |
|---|---|
| Stufe 4 Bildserie (#11/#15, P04) | **echte Fotos** (Chat-Upload); generierte Gesichter untersagt, ~41 Medien unzureichend |
| TEILEKLAR Katalog (#12, P08–P11) | **BigBuy-Schlüssel** (D-008); Sortiment = BigBuy-Zubehör interim (entschieden) |
| Impressum/Datenschutz Design | **`.dc.html` in den Chat hochladen** (Share-Link 403); Rechtstexte = Entwurf 0.9, Pascal-Freigabe |
| G05 / G20 Preise, Editionen, B.V.-Identität | Preis-/Rechts-/Identitätsfreigabe (`fakten.json`, Pascal) |
| G27 | GitHub/GitLab Source-of-Truth-Richtung |
| `review`-Gate / Cloudflare-Worker / Vercel | API-Key-Secret setzen · Worker-Name ≤54 Zeichen · autorisierte Vercel-CLI-Session |
| P01–P26 Abnahme | Owner-Abnahme je Phase mit Nachweis |

### C — Server/Runtime/Provider (aus dieser Cloud-Session nicht erreichbar; GAP-REMOTE)
| Item | Grund |
|---|---|
| G01, G18, G28, G29 | Fach-APIs/Outbox-Recovery/Monitoring/Scheduler = echte Runtime/VPS |
| G22 (Tannet), G25 (REA) | externe Provider-/Mandantenverträge nicht exponiert |
| G23 | nativer Regelkreis-Runtime (Oracle/Hermes/AgentMemory) nicht erreichbar |
| G08 | echte Lippen-/Sprechperformance = Higgsfield-Produktion im Guthaben, Owner |
| G26 | Node-Laufzeit 24 vs. Vertrag 22 = Umgebung |

## 3 · Autonomer Langlauf-Backlog (Reihenfolge, je Zyklus Gate-grün + Evidenz)
1. **Stufe 3b Folgescheiben** — restliche editoriale Champagner-Akzente faithful übernehmen.
2. **GAP-TOKENBASE** — kanonische Basis-Tokens warm (deliberate Leg, großer Evidenz-Umfang).
3. **G13 Evidenz-Hygiene** — stale historische Nachweise je Bereich neu erheben.
4. **G30/G20 Copy-Konsistenz** — Produkt-/Editionstext an `fakten.json`, ohne Preis-Neuerfindung.
5. Vorbereitende Struktur für B-Items, sodass Owner-Zulieferung (Fotos, BigBuy-Schlüssel, Legal-Upload) sofort einrastet.

## 4 · Owner-Aktionsliste (entsperrt B/C-Items)
1. Echte Fotos für die Bildserie hochladen. 2. BigBuy-Schlüssel setzen. 3. Impressum/Datenschutz-`.dc.html` hochladen.
4. Preis-/Rechts-/Editionsfreigabe. 5. `review`-API-Key-Secret, Cloudflare-Worker-Name, Vercel-CLI-Session.
6. GitHub/GitLab-SoT-Richtung. 7. P01–P26 schrittweise abnehmen (je Phase mit Nachweis).

**Betriebsmodus.** Ich arbeite A + den Langlauf-Backlog autonom ab (Clock-in → Quellen → atomar → nur autorisierter Scope →
reale Evidenz → Gaps mit Owner → ehrliche Übergabe), halte alle Gates grün und pushe je Scheibe auf PR #67. B/C bleiben als
fällige Abhängigkeiten geführt; eine Sperre fällt nur durch bestandene Prüfung des realen Stands, nie durch Zeitablauf.
