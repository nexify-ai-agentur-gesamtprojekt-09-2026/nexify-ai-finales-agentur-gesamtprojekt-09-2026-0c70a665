# AGENTS.md · NeXify AI Gesamtlösung (Handoff an Codex)

Stand 2026-09-29 · Fassung 1.0 · Freigabe der Entscheidungen E1/E3/E4/E5/E6/E12 steht aus (siehe `docs/09-final/08-recht-und-compliance.md`).

## Auftrag
Baue aus den HTML-Referenzen in `prototypen/` (`*.dc.html`) das Produkt. **Die Referenzen sind Design und Verhalten, kein Produktionscode.** Nicht kopieren, nachbauen. Sprache der Oberfläche: Deutsch (Quelle), Niederländisch und Französisch für Kopf/Fuß und Markt-Seiten.

## Lesereihenfolge
1. `docs/09-final/00-INDEX.md` → `01` Produkt → `11` Designsystem-Definition → `03`/`04` Design und Frontend → `05` Technik → `14` Gesamtsystem/Portale → `06` Brain → `08` Recht → `15` Umsetzungsplan.
2. `config/design-tokens.json` (Werte), `config/design-rules.json` (Regeln), `config/fakten.json` und `config/api-prepaid.json` (Zahlen), `config/brain/*.json` (Agenten, Tools, Pipeline, Wissen).

## Verbindliche Regeln
- **Tokens:** Nur Werte aus `design-tokens.json`. Neue Farbe/Radius/Fläche zuerst dort und in `docs/09-final/11-…` eintragen.
- **Zahlen und Texte mit Preisbezug** nur aus `config/fakten.json`/`api-prepaid.json`. Nie neu erfinden. Ungeklärte Tarife bleiben „zur Freigabe“.
- **Prüfung vor Übergabe:** `node tools/ds-audit-cli.js` (Design, SEO-Basis, i18n-Parität, Barrierefreiheit-Heuristik). Ziel: 0 Fehler, 0 Warnungen außerhalb dokumentierter Ausnahmen (`config/abweichungen.json`).
- **Barrierefreiheit:** WCAG 2.2 AA, Ziele ≥ 44 px, sichtbarer Fokus (2 px Lime), Reduced-Motion.
- **i18n:** de/nl/fr, identischer Schlüsselsatz; Zahlenformat folgt der Textsprache; Preise/Steuer/Rechtstexte folgen dem Markt.
- **Recht:** Texte sind Entwurf 0.9. Nichts als Rechtsberatung ausgeben; Button-Lösung (§ 312j BGB), KI-Kennzeichnung (Art. 50 KI-VO), Widerruf 14 Tage (B2C).
- **Sicherheit:** Mandantentrennung per RLS, Idempotenz auf allen Buchungen, Geheimnisse nie im Code, Hartsperren im Gateway (`config/brain/agents.json`).
- **Ehrlich bleiben:** Referenzen, Logos, Zitate, Messwerte werden nicht erfunden. Beispiele sind gekennzeichnet.

## Stack-Empfehlung
Next.js/React + TypeScript · PostgreSQL (Frankfurt) mit Row-Level-Security · OpenAI-kompatibles Gateway (`api.nexifyai.cloud/v1`) · Revolut Merchant API (Sandbox → Produktion getrennt) · selbst gehostete Schriften (Geist, Geist Mono). Details `docs/09-final/05-technische-spezifikation.md`.

## Phasen (Abnahme je Phase mit Nachweis)
Siehe `docs/09-final/15-umsetzungsplan-codex.md`: P0 Fundament → P1 Marke/Bausteine → P2 Öffentliche Seiten → P3 Konto/Portale → P4 API/Ledger → P5 Shop → P6 Workspace/Brain → P7 Recht/SEO/Betrieb.

## Repository-Vorschlag
```
apps/web            Next.js (öffentlich + Portale)
apps/gateway        API-Gateway (Auth, Ledger, Router)
packages/tokens     aus config/design-tokens.json generiert
packages/ui         Komponenten (Header, Footer, Karte, Well, Button, …)
packages/i18n       de/nl/fr Wörterbücher
packages/rules      design-rules + ds-audit
infra/              OpenTofu, CI
docs/               übernommen aus docs/09-final
```

## Nicht tun
Keine Abrechnung/Rechnungslauf vor Entscheidung E1/E3/E4. Kein Livegang ohne Freigabe-Gate (`docs/09-final/07`, Abschnitt Gate). Keine automatische Übersetzung von Rechtstexten. Keine Änderung an Preisen ohne Freigabe von Pascal Courbois.

## Kontakt
Pascal Courbois · mail@nexifyai.cloud (Firmendaten in `docs/09-final/08` bitte bestätigen lassen).
