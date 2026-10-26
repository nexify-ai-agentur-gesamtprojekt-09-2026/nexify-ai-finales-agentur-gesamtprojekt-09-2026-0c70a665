# Zertifizierungsreife-Gutachten

**Lauf:** a9666976-c613-40a3-92aa-f1d182032925 · **Fall:** NXAI-GESAMT-2026-09-28 · **Stichtag:** 2026-09-28T19:59:35.873Z · **Scope-Hash:** sha256:766db4a17574eab5da73c50f526f4e37acb10808e8dcff20af0ef01af91f6b16 (70 Dateien) · **Rolle:** Agent 3 (zertifizierungsgutachten-de) · **Modus:** PHASENEMULATION · **Auftragsnummer:** UNVERIFIED (keine Registry bestätigt)
**Erstellt:** 2026-09-28T20:05:17.394Z · Dokumentnummer nach NEXIFYAI-CD-2026 (Typcode ZG) nicht vergeben – Registry nicht erreichbar.

**Vorstufen:** Gutachten 1 sha256:f44b255c93834dd754f83f50f151993484b94f63c15ff13d3217c32a7bfb0f99 · Plan 2 sha256:570a8ed9e3a509e8cd68481739522ba9490307586bc2a49ae66195d0b5ea4b4a. Dieses Dokument ist **kein Zertifikat** und keine Konformitätserklärung. Geplante Maßnahmen gelten als **nicht umgesetzt**.

## 1. Zertifizierungsgegenstand und Schemata
Gegenstand: NeXify-Gesamtlösung (Software, Betrieb, Dokumentation). Betrachtete Schemata und ihr Stand:
| Schema | Einschlägig? | Kriterienbasis (Bezeichnung, Ausgabe UNVERIFIED) | Urteil |
|---|---|---|---|
| Barrierefreiheit (BFSG / EN 301 549 / WCAG 2.2 AA) | ja, ab Go-Live für Verbraucherflächen (Shop, Nachbarschaft) | WCAG 2.2, EN 301 549 | **NOT_READY** – statische Kriterien erfüllt (B-10), Nutzertests fehlen (M-08) |
| Informationssicherheit (ISO/IEC 27001 oder BSI IT-Grundschutz) | optional, kundenseitig gefragt | ISO/IEC 27001:2022 | **NOT_ASSESSED** – kein Managementsystem, kein Nachweiszeitraum; Absicht nicht beschlossen (Pascal) |
| Datenschutz (DSGVO-Konformität, Art. 5, 13, 25, 28, 32) | ja | DSGVO | **NOT_READY** – Texte fehlen (B-07), AVV mit Supabase/Resend/Revolut/Langfuse nicht abgelegt |
| Lauterkeit (UWG, Omnibus-RL 2019/2161) | ja | UWG §§ 4a, 5, 5a; PAngV | **CONDITIONALLY_READY** – keine Dark Patterns gefunden (B-09); Bedingung: echte Preise (M-07) und Bewertungsherkunft beim Shop-Start |
| KI-Transparenz (KI-VO Art. 50) | ja | Verordnung (EU) 2024/1689 | **CONDITIONALLY_READY** – Kennzeichnung im Workspace vorhanden; Companion offen (M-12); Rechtsauslegung offen |
| Betriebsreife (internes Freigabe-Gate) | ja | Freigabe-Gate NeXifyAI (Vorschau, Health ≥ 60 s, Rollback) | **NOT_READY** – nichts gelaufen (B-03, B-04, B-06, B-12) |

## 2. Nachweismatrix (Auszug)
| Kriterium | Kontrollnachweis vorhanden | Lücke → Maßnahme |
|---|---|---|
| Tests automatisiert | Testdateien ja; Ausführung nur Browser | M-01 |
| Mandantentrennung | Migration 007, Prüfwerkzeug | M-03 (Ausführungsnachweis) |
| Geheimnisverwaltung | OpenBao im Skript | M-05 |
| Sicherung/Wiederherstellung | Runbook-Text | M-10 |
| Rechtstexte | gesperrte Abschnitte | M-06 |
| Barrierefreiheit | statischer Normlauf § 14 | M-08 |
| Lieferkette | Lizenzliste | M-09 |
| Menschliche Aufsicht KI | Regelwerk R-01…R-21, Freigaben | M-11 (Wirksamkeit) |

## 3. Nichtkonformitäten
Haupt: NK-1 Rechtstexte fehlen (B-07) · NK-2 kein Betriebsnachweis (B-06, B-12) · NK-3 Datenbank nie ausgeführt (B-04). Neben: NK-4 Doku-Zahlen inkonsistent (B-02) · NK-5 SBOM fehlt (B-11).

## 4. Unabhängigkeit und Grenzen
Alle drei Rollen wurden von derselben Instanz in Phasenemulation ausgeführt; es gab **keine** getrennten Fachinstanzen. Das mindert die Unabhängigkeit der Prüfung – ein externer Reviewer sollte Gutachten 1 gegenlesen, bevor Maßnahmen priorisiert werden. Normvolltexte lagen nicht vor.

## 5. Gesamturteil
**NOT_READY** für jede externe Zertifizierung und für den Live-Betrieb. Reifegrad: „spezifiziert und prototypisch konsistent“. Entscheidungsschranke zum nächsten Urteil (CONDITIONALLY_READY Betriebsreife): M-01, M-03, M-05, M-10 mit Nachweis. Kein Urteil dieser Kette deckt Reboot, Live-DNS oder Firewall-Änderungen.
