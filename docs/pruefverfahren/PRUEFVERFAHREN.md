# Prüfverfahren & Endabnahme — TEILEKLAR Shop (Muster)

**Stand:** 2026-11-01 · **Prüfling (Release-Commit-Reihe):** `409dd3c → 09afc9d → 429d05d → 65bfaec` · **Umgebung:** Node 22.23.4 (Toolchain), Playwright/Chromium (lokal), Python 3 (unittest).
**Charakter:** Technisches Abnahme- und Verifikationsverfahren. **Keine Zertifizierung, kein Rechtsgutachten.** Es gelten `config/standards-applicability.json` (`evidence_policy`, `release_gate`, `edition_limitations`).

> Hinweis Geltungsbereich: Der Shop ist ein **Muster-Shop** (Gates E1/E3/E4 geschlossen). Es werden keine echten Bestellungen, Lieferungen oder Zahlungen ausgelöst; Preise sind Beispielwerte „zur Freigabe". Reale Katalog-/Zahlungsanbindung (BigBuy, Revolut) bleibt bis zur ausdrücklichen Freigabe gesperrt.

---

## 1. Zweck und abgeleitete Logik

Dieses Verfahren weist nach, dass die neu gebauten Funktionen (Produktdetail, Werkstattsuche nach PLZ, Muster-Kasse, Werkstatt-Netto-Konto, Reifenrechner-Erweiterung, Batterie-Berater-Erweiterung) gegen **offizielle, anerkannte Normen, Werte und Richtlinien** geprüft wurden. Jede Prüfung ist auf eine Norm/Anforderung und eine **ausführbare bzw. inspizierbare Evidenz** zurückführbar (Grundsatz des `release_gate`: kein impliziter Pass durch bloße Dateiexistenz).

Die fachlichen Rechen-/Entscheidungslogiken sind in `docs/pruefverfahren/verify-logik.py` deterministisch nachgebildet und werden dort gegen offizielle Sollwerte geprüft (24 Prüfpunkte, 0 Fehler).

---

## 2. Normregister (Bezugsquellen)

### 2.1 Registrierte Normen (aus `config/standards-applicability.json`, öffentlich belegt)

| ID (Register) | Norm | Anwendung im Prüfling |
|---|---|---|
| `DIN-DOC` | **DIN 5008** (2020-03 + Korr. 1:2020-07) | Zahl-, Währungs-, Prozent-, Datumsformat |
| `ISO-HCD` | **DIN EN ISO 9241-210** (2020-03) | menschzentrierter Gestaltungsprozess, Quelltreue |
| `ISO-USABILITY` | **DIN EN ISO 9241-11** (2018-11) | Gebrauchstauglichkeit (Aufgabe/Kontext) |
| `WCAG` | **WCAG 2.2 Stufe AA** (W3C REC 2024-12-12) | Barrierefreiheit Web |
| `EN-ICT` | **EN 301 549** (V3.2.1, DIN 2022-06) | IKT-Barrierefreiheit (Mapping zu WCAG) |
| `BFSG` | **BFSG/BFSGV + EAA (RL (EU) 2019/882)** | Barrierefreiheitsrecht ab 2025-06-28 |
| `GDPR` | **DSGVO Art. 25/32** | Datenminimierung, Sicherheit |
| `ISO-QMS` | **ISO 9001** | Qualitäts-/Korrekturmaßnahmen |
| `ISO-ISMS` | **ISO/IEC 27001:2022** | Secret-Handling, Produktionsschutz |
| `AI-TRANSPARENCY` | **EU AI Act Art. 50/113** | KI-/Synthetik-Transparenz |

### 2.2 Abgeleitete Fach-/Rechtsnormen (eigenes Applicability-Mapping, Edition nicht unabhängig zertifiziert)

| Kürzel | Grundlage | Anwendung |
|---|---|---|
| **PAngV** | Preisangabenverordnung (DE) | Gesamtpreis, Grundpreis, USt.-/Versandhinweis |
| **BGB §312j Abs. 3** | „Button-Lösung" | Beschriftung „Zahlungspflichtig bestellen" |
| **BGB §312g/§355** | Widerrufsrecht 14 Tage | Widerrufsbelehrung in der Kasse |
| **RL 2006/112/EG + OSS** | EU-Mehrwertsteuersystem | USt. lieferlandabhängig, Reverse-Charge B2B |
| **ISO 4000-1 / ETRTO** | Reifen-/Felgengeometrie, Lastindex | Reifenrechner (Abrollumfang, Felgenbreite, LI) |
| **EN 50342-1/-2** | Starterbatterien, Typklassen/Maße | AGM/EFB/SLI, Einbaumaß L2–L5, Pollage 0/1 |
| **KBA HSN/TSN (FZV)** | Schlüsselnummern | Fahrzeug-/Fitment-Zuordnung |
| **ISO 9241-110** | Interaktionsprinzipien (Dialoggestaltung) | UI/UX-Interaktion |
| **ISO 9241-112 / -125** | Darstellung/visuelle Information | Layout, Informationsdarstellung |
| **DIN 1450** | Leserlichkeit von Schriften | Typografie, Umbruch langer Kennungen |
| **ISO/IEC 25010** | Produktqualitätsmodell | Funktionalität, Wartbarkeit, Kompatibilität, Zuverlässigkeit, Sicherheit |

---

## 3. Prüfumgebung und Reproduktion

```bash
# Normaudit (DIN 5008, WCAG 2.2 AA, EN 301 549, ISO) + Health-Selbsttest
make check                 # Erwartung: 0 Fehler / 0 Warnungen; Selbsttest 10/10

# Deterministische Testsuite + Build-Integrität (Hash)
make test                  # Erwartung: 620 Tests OK

# Fachliche Logik-Prüfung (Rechen-/Entscheidungslogik gegen Sollwerte)
python3 docs/pruefverfahren/verify-logik.py      # Erwartung: 24/24, Exit 0

# Frontend/UI/UX/Design/Technik-Prüfung (statisch, deterministisch)
python3 docs/pruefverfahren/verify-frontend.py   # Erwartung: 22/22, Exit 0

# Browser-Evidenz (echter Lauf, deterministisch, Hash-gebunden)
#   text-spacing (Reflow/Zoom 200 %), critical (A11y/Fokus), legal-footer (Vite+Next)
#   via Toolchain-Node + lokalem Playwright (apps/site/tests/browser-*.mjs)
```

---

## 4. Prüfmatrix (RTM) — Prüffälle, Normbezug, Logik, Nachweis

Legende Ergebnis: **✓ bestanden**. Nachweisquelle = ausgeführter Automatismus + Dateiort.

### Gruppe A — DIN 5008 Formatierung (`DIN-DOC`)

| PF | Prüfgegenstand | Abgeleitete Logik | Sollwert | Methode/Eingabe | Nachweis | Erg. |
|---|---|---|---|---|---|---|
| A1 | Währung | Komma-Dezimal, Punkt-Tausender, geschütztes Leerzeichen + € | `49,90 €` (4990 ct) | `Intl.NumberFormat('de-DE', EUR)` / verify-logik | `verify-logik.py` PF-A1; `ds-audit` | ✓ |
| A2 | Tausender | `1.234,56 €` | 123456 ct | verify-logik | PF-A2 | ✓ |
| A3 | Prozent | Zahl + Leerzeichen + % | `19 %` | verify-logik | PF-A3 | ✓ |
| A4 | Dezimalprozent | `0,38 %` | Reifenabweichung | verify-logik | PF-A4 | ✓ |

### Gruppe B — Barrierefreiheit (`WCAG`, `EN-ICT`, `BFSG`)

| PF | WCAG-Kriterium / Anf. | Umsetzung im Prüfling | Methode | Nachweis | Erg. |
|---|---|---|---|---|---|
| B1 | 1.4.3/1.4.11 Kontrast (A11Y-01) | Design-Tokens, Lime/Cyan auf Canvas | `ds-audit` Kontrastregeln | `make check` 0/0 | ✓ |
| B2 | 2.1.1/2.4.3/2.4.7 Tastatur & Fokus (A11Y-02) | Fokus-sichtbar (`:focus-visible`), logische Ordnung | browser-critical (echter Lauf) | `critical-browser-fresh.json` | ✓ |
| B3 | 1.4.10/1.4.4 Reflow & Zoom 200 % (A11Y-03) | kein H-Overflow bei 390/1280 px, Textabstände | browser-text-spacing, 117 Checks | `text-spacing.json` (0 issues) | ✓ |
| B4 | 2.5.8 Zielgröße (A11Y-04) | Mengenwahl/Buttons/Radios ≥ 44–48 px | `ds-audit` + CSS-Tokens | `make check` | ✓ |
| B5 | 3.3.1/3.3.2/3.3.3/3.3.7 Formulare (A11Y-05) | `label`, `fieldset/legend`, `autocomplete`, Fehlertext mit `role=alert` | browser-critical | `critical-browser-fresh.json` | ✓ |
| B6 | 4.1.3 Statusmeldungen (A11Y-06) | `aria-live`, `role=status`; kein Falsch-Erfolg (Muster-Hinweis) | browser-critical + E2E | E2E Abschnitt 5 | ✓ |
| B7 | 3.3.4 Kaufprozess-Fehlervermeidung (A11Y-08) | Prüfen-Schritt + Korrektur vor Bestellung | E2E Kassenstrecke | E2E | ✓ |

### Gruppe C — E-Commerce-Recht (PAngV, BGB)

| PF | Anforderung | Umsetzung | Nachweis | Erg. |
|---|---|---|---|---|
| C1 | PAngV Gesamtpreis + USt.-Hinweis | Preis inkl. USt., Versand separat, Hinweistext | `ShopOverview`/`ShopCheckout` Preis-/USt.-Hinweis | ✓ |
| C2 | PAngV Grundpreis | z. B. Kühlmittel `… €/l` | `teileklar-shop-data` `base` | ✓ |
| C3 | BGB §312j Button-Lösung | Beschriftung „Zahlungspflichtig bestellen" | `ShopCheckout` `shop-checkout-place` | ✓ |
| C4 | BGB §312g/§355 Widerruf 14 Tage | Widerrufsbelehrung + Pflicht-Checkbox | `ShopCheckout` `shop-terms` | ✓ |

### Gruppe D — USt./OSS-Logik (RL 2006/112/EG; abgeleitet aus `lib/rechenkern.js`)

| PF | Logik | Sollwert | Nachweis | Erg. |
|---|---|---|---|---|
| D1 | Netto = brutto ÷ 1,19 | 4990 → 4193 ct | verify-logik PF-D1 | ✓ |
| D2 | USt.-Anteil = brutto − brutto÷1,19 | 7239 → 1156 ct | PF-D2 | ✓ |
| D3 | NL-BTW 21 % | 449,00 € → 94,29 € | PF-D3 | ✓ |
| D4 | DE B2B + USt-IdNr. → Reverse-Charge 0 % | `reverse_charge_0` | PF-D4 | ✓ |
| D5 | DE B2C/ohne USt-ID → OSS, nicht automatisch | `oss_klaerung` | PF-D5 | ✓ |
| D6 | NL → 21 % | `btw_21` | PF-D6 | ✓ |

### Gruppe E — Fitment-Logik (KBA HSN/TSN)

| PF | Regel | Sollwert | Nachweis | Erg. |
|---|---|---|---|---|
| E1 | Ohne Fahrzeug nie „passt" | `maybe` | verify-logik PF-E1 | ✓ |
| E2 | HSN in Freigabeliste → „passt" | `fits` | PF-E2 | ✓ |
| E3 | HSN in Ausschlussliste → „passt nicht" (+ Reason-Code) | `nofit` | PF-E3 | ✓ |
| E4 | Unbekannt → „prüfen" | `maybe` | PF-E4 | ✓ |

### Gruppe F — Reifenrechner (ISO 4000-1 / ETRTO)

| PF | Formel/Wert | Sollwert | Nachweis | Erg. |
|---|---|---|---|---|
| F1 | Ø = Felge·25,4 + 2·(Breite·Querschnitt/100); 205/55 R16 | 631,9 mm | verify-logik PF-F1 | ✓ |
| F2 | 225/45 R17 | 634,3 mm | PF-F2 | ✓ |
| F3 | Zul. Felgenbreite = [Breite·0,7/25,4 … Breite·0,9/25,4] (½″) | 6,0–8,0″ (225 mm) | PF-F3 | ✓ |
| F4/F5 | Abweichung ≤ ±3 % (Orientierung) | +0,38 % / `True` | PF-F4/F5 | ✓ |
| F6 | Lastindex→Tragfähigkeit (ETRTO) | LI 94 → 670 kg | PF-F6 | ✓ |

### Gruppe G — Batterie-Berater (EN 50342)

| PF | Entscheidung | Sollwert | Nachweis | Erg. |
|---|---|---|---|---|
| G1 | Start-Stopp + hohe Last → AGM | `AGM` | verify-logik PF-G1 | ✓ |
| G2 | Start-Stopp ohne Rekuperation → EFB | `EFB` | PF-G2 | ✓ |
| G3 | ohne Start-Stopp → SLI (Nassbatterie) | `SLI` | PF-G3 | ✓ |
| G4 | unbekannt → Typ offen (Klärung über Fzg-Daten) | `""` | PF-G4 | ✓ |
| G5 | Einbaumaß L2–L5 + Pollage 0/1 müssen zur ausgebauten Batterie passen | Hinweistext vorhanden | `BatteryAdvisor` `mustMatch` | ✓ |

### Gruppe H — Governance / CI-Evidenz (`ISO-QMS`, `ISO-ISMS`)

| PF | Kontrolle | Nachweis | Erg. |
|---|---|---|---|
| H1 | Deterministische Testsuite | `make test` = 620 OK | ✓ |
| H2 | Normaudit + Health | `make check` = 0/0, Selbsttest 10/10 | ✓ |
| H3 | Browser-Evidenz legitim per echtem Lauf regeneriert (keine bloße Hashersetzung) | text-spacing/critical/legal-footer Läufe | ✓ |
| H4 | Keine Secrets/keine Live-Zahlung/kein Push ohne Freigabe (ISMS-02) | Muster-Gates, lokaler Commit | ✓ |

---

### Gruppe I — UI/UX-Interaktionsprinzipien (`ISO 9241-110`, `ISO-HCD`, `ISO-USABILITY`)

| PF | Prinzip (ISO 9241-110) | Umsetzung im Prüfling | Nachweis | Erg. |
|---|---|---|---|---|
| I1 | Aufgabenangemessenheit | Fitment-first: erst Fahrzeug, dann Teil, dann Kauf | `verify-frontend` UI-X1; E2E | ✓ |
| I2 | Selbstbeschreibungsfähigkeit | sichtbarer Fahrzeug-/Passungsstatus, `aria-live` | UI-X1 | ✓ |
| I3 | Erwartungskonformität | persistente Garage (Kontext bleibt erhalten) | UI-X4 | ✓ |
| I4 | Fehlertoleranz | „passt nicht" sperrt Kauf + nennt Grund; Kasse-Prüfschritt | UI-X2; PF-B7 | ✓ |
| I5 | Steuerbarkeit | Mengen-Stepper, Entfernen, Zurück-Navigation je Schritt | UI-X3 | ✓ |
| I6 | Lernförderlichkeit | konsistente Muster/Badges, Hinweistexte | ds-audit; Review | ✓ |
| I7 | Gebrauchstauglichkeit (9241-11): Kontext/Aufgabe real geprüft | E2E-Vollprozess ausgeführt | Abschnitt 6 | ✓ |

### Gruppe J — Design & Layout (`DIN-DOC`, `DIN 1450`, `ISO 9241-112/125`, `WCAG`)

| PF | Prüfgegenstand | Sollwert | Nachweis | Erg. |
|---|---|---|---|---|
| J1 | Design-Tokens statt Hardcodes | keine rohen Hex-Farben in TSX/CSS | `verify-frontend` UI-J1 | ✓ |
| J2 | Farb-/Abstands-Token-System | `var(--color-…)`, `var(--space-…)` | UI-J2 | ✓ |
| J3 | Radius-/Typografie-Tokens | `var(--radius-…)`, `var(--font-…)` | UI-J3 | ✓ |
| J4 | Responsive/Reflow-Layout | fluide Grids (auto-fit/minmax/min(100%)) | UI-J4; text-spacing | ✓ |
| J5 | Gradient-Policy | keine unzulässigen Vollflächen-Verläufe | UI-J5 | ✓ |
| J6 | Leserlichkeit (DIN 1450) | lange Kennungen (OE/EAN) umbrechbar | UI-J6 | ✓ |
| J7 | Darstellung visueller Information (9241-112/125) | Hierarchie/Badges/Abstände konsistent | ds-audit 0/0 | ✓ |

### Gruppe K — Technik & Softwarequalität (`ISO/IEC 25010`, `ISO-QMS`)

| PF | 25010-Merkmal | Prüfung | Nachweis | Erg. |
|---|---|---|---|---|
| K1 | Funktionale Eignung | stabile Test-Hooks (`data-testid`) für Kernfluss | `verify-frontend` UI-K3 | ✓ |
| K2 | Kompatibilität/Internationalisierung | i18n de/nl/fr/en in allen Komponenten | UI-K1 | ✓ |
| K3 | Wartbarkeit | Daten/Logik von UI getrennt (`teileklar-shop-data`) | UI-K2 | ✓ |
| K4 | Zuverlässigkeit | API/Netz fail-closed (Fehlerzustand statt Absturz) | UI-K4 | ✓ |
| K5 | Sicherheit (`ISMS`) | Muster-Kennzeichnung, kein Live-Zahlungsaufruf, kein Secret im Code | UI-K5 | ✓ |
| K6 | Benutzbarkeit/Portabilität | keine Emoji-Icons, Rendering fehlerfrei in echtem Browser | UI-K6; exception-capture | ✓ |
| K7 | Leistungseffizienz | deterministischer Vite-/Next-Build, kein H-Overflow, keine Runtime-Fehler | text-spacing/critical/legal-footer Läufe | ✓ |

---

## 5. End-to-End-Nachweis (Playwright, echter Browser)

Vollständiger Prozess ohne Runtime-Fehler verifiziert:
`Shop gerendert → Netto-Umschaltung (49,90 € → 41,93 €) → Fahrzeug (BMW 3er F30) → Produktdetail (Fitment-Liste 3 Einträge) → Warenkorb → Werkstattsuche PLZ (Zustand aufgelöst) → Kasse Adresse→Versand→Zahlung→Prüfen (Summe 72,39 €) → „Zahlungspflichtig bestellen" → Muster-Bestätigung (TK-MUSTER-…)`; Reifenrechner (6–8″, 670 kg LI 94); Batterie (EFB, L2, Pollage). **Fehler: 0.**

---

## 6. Release-Gate-Nachweis (`release_gate` aus standards-applicability.json)

| Feld | Eintrag |
|---|---|
| `release_commit_and_artifact_hash` | Feature-Commits `409dd3c/09afc9d/429d05d/65bfaec`; Artefakt-Hashes: `ShopOverview.tsx` 81296a2d…, `ShopCheckout.tsx` d9814cc0…, `teileklar-shop-data.ts` 2455a6a7…, `site-map.json` 16f97e84…, `acceptance-coverage.json` 91cf7e59… |
| `applicable_scope_and_edition` | Muster-Shop DE (Primärmarkt), Editionen gem. `edition_limitations` nicht unabhängig zertifiziert |
| `implementation_reference` | `apps/web/components/{ShopOverview,ShopCheckout,ShopWorkshopFinder,TyreCalculator,BatteryAdvisor}.tsx`, `teileklar-shop-data.ts`, `TeileklarTools.css`; `config/site-map.json` |
| `test_method_and_inputs` | `make test`, `make check`, `verify-logik.py`, `browser-*.mjs` (echter Browser), Playwright-E2E |
| `execution_time_and_environment` | 2026-11-01Z, Node 22.23.4, Chromium (lokal), Python 3 |
| `actual_result_and_failures` | `make test` 620 OK; `make check` 0/0, Selbsttest 10/10; `verify-logik` 24/24; `verify-frontend` 22/22; E2E 0 Fehler; ds-audit 0/0 |
| `evidence_location_and_hash` | `evidence/one-app-2026-10-27/text-spacing.json` (02c92ea7…), `critical-browser-fresh.json` (8c673654…), `evidence/legal-footer-2026-10-28/{browser,next-browser}.json` (46dd1899…/525697…) |
| `reviewer_and_owner` | Erbringende Instanz: Build-Agent; **inhaltliche Owner-Freigabe (Pascal Courbois) ausstehend** für kommerzielle/Live-Gates |
| `resolved_blocking_findings` | keine offenen blockierenden Befunde im Prüfumfang |

---

## 7. Editions-Limitierungen & Vorbehalte (`evidence_policy`)

- Keine Zertifizierung, kein Rechtsgutachten; bezahlte Volltext-Normen nicht beschafft; ISO-Publikationslebenszyklus nicht unabhängig geprüft (ISO-Zugriff 403) — **exakte anwendbare Edition vor Konformitätsaussage bestätigen**.
- Quelltreue Gestaltung ist von Normkonformität getrennt zu bewerten.
- Konformitätsaussage erfordert vollständigen Geltungsbereich + Evidenz + Owner-Review je konkretem Release.
- **Offene Gates:** Reale Preise/Bestellungen/Zahlungen (Revolut), Live-BigBuy-Katalog und bindende Rechtstexte erst nach ausdrücklicher Freigabe durch den Owner.
