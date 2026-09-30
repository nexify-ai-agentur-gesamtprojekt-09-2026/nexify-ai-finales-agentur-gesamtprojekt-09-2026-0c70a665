# Zertifizierungsreife-Gutachten · Gutachten-Autopilot

**Lauf-ID:** c275bc07-b41e-491c-95f5-48f77404a1a2 · **Stichtag:** 2026-09-26T22:31:56.672Z · **AUSFUEHRUNGSMODUS: PHASENEMULATION** (keine Subagenten verfügbar; drei Phasen nacheinander in getrennten Arbeitsschritten, Vorstufen nicht umgedeutet)
**Endstatus: PARTIAL_BLOCKED** · Offizielle Dokumentnummer: UNVERIFIED

## 1. Quellen

| Quelle | Status | SHA-256 |
|---|---|---|
| NeXifyAI Cloud v10.dc.html | CURRENT_VERIFIED (Projektdatei) | sha256:8b2b959b32c73f956a6e7bbd6765669fed72ef39336d969d59d910fc793849d6 |
| nexifyai-api-abrechnungskonzept.md | CURRENT_VERIFIED | sha256:8a6050e75c4c11d476d964eedce4315cdf18929756fbfed9401a3dbcbaee1aec |
| go-live-abschlusstest-2026-09-27.md (Befunde GL-01…16, AP-01…12) | CURRENT_VERIFIED | sha256:918c1c74b6b0079c6cf8fbb837f5c69c0d4e315c86f5b0aab542bcdbed73b3a6 |
| Produktivsystem nexifyai.cloud, VPS FRA/DUS, 9Router | BLOCKED_BY_FRESHNESS (kein Zugriff aus dieser Umgebung) | – |
| AgentMemory 24.–26.09.2026 | UNVERIFIED (Fremdangabe, zeitweise 504) | – |
| Normvolltexte (WCAG 2.2, EN 301 549, DIN EN ISO 9241-110/-125, KI-VO, DSGVO) | UNVERIFIED für Abschnittsinhalte; nur Bezeichnungen verwendet | – |

## 2. Phase 1 · Technisches Gutachten → Übergabe PARTIAL
Basis: Befundregister GL-01 bis GL-16 im Go-Live-Protokoll. Eingeschränkt, weil Produktivsystem, Server, Backups und Rechtsprüfung nicht erreichbar sind. Auswirkung: alle Infrastruktur-, Sicherheits- und Rechtsbefunde bleiben auf Prototyp-Ebene; keine Aussage über den Live-Betrieb.
**Nicht geprüft (begründet):** Last, Penetration, TLS/DNS, Restore, E-Mail-Zustellung, Zahlungsfluss — kein Zugriff. Rechtliche Wirksamkeit von AGB/Datenschutz — keine Rechtsberatung.

## 3. Phase 2 · Umsetzungsplan → Übergabe PARTIAL
Basis: AP-01 bis AP-12. Jeder Befund GL-01…16 hat eine Disposition; jedes ausführende Paket ein Abnahmekriterium. **Lücken:** Aufwandsspannen, Rollback je Paket und Dauern fehlen; drei Pakete hängen an Entscheidungen (E1, Zahlungsregel, KI-Regel). Keine Tatsachen ergänzt.

## 4. Phase 3 · Zertifizierungsreife

| Kriterienbasis (beabsichtigt) | Urteil | Tragende Lücke |
|---|---|---|
| Barrierefreiheit WCAG 2.2 AA / EN 301 549 (Agentur-Seite v10) | **CONDITIONALLY_READY** | Laufzeitprüfung nur v10 und nur Desktop/909 px; Portale und Shop nicht einzeln geprüft; kein Test mit assistiver Technik |
| DSGVO-Konformität Website | **NOT_READY** | GL-05 Dienstliste, Cookie-Dialog, AVV-Nachweise |
| KI-VO Art. 50 Transparenz | **NOT_READY** | GL-02 widersprüchliche interne Regel |
| KI-VO Hochrisiko (Prüfungsauswertung Studienkolleg) | **NOT_ASSESSED** | Rechtliche Einstufung fehlt |
| ISO/IEC 27001 (Betrieb) | **NOT_ASSESSED** | kein ISMS-Nachweis, kein Zugriff auf Betrieb |
| Abrechnung / GoBD | **NOT_READY** | GL-03, GL-04, Archivkonzept NX-GR-011 |

Kein Urteil ist ein Zertifikat. Eine externe Zertifizierung liegt nicht vor.

## 5. Gegenprüfung
- Fall, Stichtag und Hashes stimmen in allen drei Phasen überein.
- Kein geplantes Paket wurde als umgesetzt gewertet.
- **Widerspruch W-01:** Margenformel (×1,45 vs. ÷0,55) — Eigentümer Pascal, blockiert Abrechnungsbereitschaft.
- **Widerspruch W-02:** Prepaid vs. AGB § 4 — Eigentümer Pascal.
- **Widerspruch W-03:** KI-Kennzeichnung vs. AGENTS.md — Eigentümer Pascal.

## 6. Rückverfolgbarkeit (Kurzform)
Quelle → Befund: v10/Konzept → GL-01…16 · Befund → Maßnahme: GL-xx → AP-01…12 (vollständig) · Maßnahme → Nachweis: je AP Abnahmespalte · Kriterium → Lücke: Tabelle 4. Verwaiste Befunde: keine.

## 7. Nächster zulässiger Schritt
Kleinstes fehlendes Beweismittel: **Ihre schriftliche Entscheidung E1** (Margenformel) mit Datum. Zweck: löst W-01 und entsperrt AP-03. Abnahme: drei Beispielrechnungen liefern in Rechenkern, Skript und Portal dasselbe Ergebnis.


## Nachtrag 28.09.2026 · Hilfsdateien der Gutachtenkette (Skill `gutachten-kette-ablageort`)
Die Hilfsdateien (`references/`, `scripts/`, `assets/`) der vier Gutachten-Skills liegen nur auf dem Wirt Frankfurt unter `/opt/nexifyai/dsh-home/skills/<skill>/`. **In diesem Lauf waren sie nicht erreichbar** (kein Server- oder SSH-Zugang in der Entwurfsumgebung).
- Alle Prüfschritte, die einen Validator, ein Skript oder eine Vorlage aus diesen Ordnern voraussetzen, gelten als **NICHT DURCHGEFÜHRT** – nicht als PASS. Das betrifft insbesondere die Schema- und Hash-Prüfung der Übergabeverträge zwischen den Stufen und die Paket-Tests (105/105 auf dem Wirt, hier nicht wiederholt).
- Inhalte aus diesen Dateien wurden **nicht aus dem Gedächtnis nachgebaut**; verwendet wurde nur, was in den SKILL.md selbst steht.
- Nachholen: Lauf durch die Agenten-Zentrale (`system.nexifyai.cloud`, Dienst `deepseek-harness`) oder per SSH auf dem Wirt, Stufen strikt nacheinander.
