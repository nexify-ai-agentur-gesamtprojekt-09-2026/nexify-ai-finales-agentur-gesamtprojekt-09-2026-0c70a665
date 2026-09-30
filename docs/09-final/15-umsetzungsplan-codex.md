# 15 · Umsetzungsplan (Handoff an Codex)

Jede Phase endet mit einem **Nachweis** (Test, Screenshot bei 320/768/1440 px, Prüfbericht). Ohne Nachweis keine nächste Phase.

| Phase | Inhalt | Abnahme |
|---|---|---|
| **P0 Fundament** | Repo, CI, Umgebungen (Vorschau/Produktion), Tresor, Datenbank + RLS, `packages/tokens` aus `design-tokens.json`, `packages/rules` (ds-audit) | CI grün; `node tools/ds-audit-cli.js` läuft in der CI; Tenant-Trennung mit Prüffall A/B |
| **P1 Marke & Bausteine** | `NX-Header` (Hauptmenü, Portale, Sprache/Markt, Konto), `NX-Footer` (Markt-Dialog, Einwilligung), Karte/Well/Button/Chip/Tab/Akkordeon/Dialog/Toast, Fokus, Reduced-Motion | Designsystem-Seite im Produkt = Referenz; DS-Audit 0 Fehler; Tastaturdurchlauf |
| **P2 Öffentliche Seiten** | Start, one/one+, API-Produkt/Doku/Preise, Wissenshub, Local-SEO-Vorlage, Partner-werden, Werkstatt-Partnerseite, Rechtliches | Lighthouse SEO/Best Practice ≥ 95; strukturierte Daten; canonical/hreflang/sitemap nach URL-Plan |
| **P3 Konto & Portale** | Anmeldung (Einmallink + 2FA), Rollen, Kundenportal (Angebot annehmen/ablehnen/anpassen, Rechnung PDF, Abnahme L1–L3, Tickets), Konto, Partnerportal, Nachbarschaftskunden, Affiliate | E2E-Journeys J1–J6 (`02`); Angebot-Automat wie `14 §3`; PDF/XRechnung |
| **P4 API & Ledger** | Gateway, Router, Kostenstellen, Ledger (Cent), Revolut-Webhook (HMAC), Preistabelle versioniert, Konsole | Sperrlogik-Tests; 7 Tage Abgleich usage ↔ Anbieter < 2 % (nach E1/E3/E4) |
| **P5 Shop** | Katalog-Modul, Suche/Filter, Kasse (Button-Lösung), Steuer OSS, Retoure, Berater, E-Mails | Bestellstrecke-E2E; Pflichtangaben je Warengruppe; BFSG-Prüfung |
| **P6 Workspace & Brain** | Workspace/Posteingang/Leitstand/myADMIN, Agenten, Tool-Register, Wissens-Pipeline, Nachtlauf, Tool-Orakel | Regressionstest Wissen ≥ 90 % Fundstellen; Freigabe-Klassen A/B/C technisch erzwungen |
| **P7 Recht, SEO, Betrieb** | anwaltlich freigegebene Texte je Markt, Cookie/Einwilligung, Statusseite, Backups + Restore-Test, Freigabe-Gate | Gate PASS mit Zeitstempel; Endabnahme |

## Entscheidungen, die vor P4 fallen müssen
E1 Aufschlag (auf EK ×1,45 oder ÷0,55; 38 vs. 45 %) · E3 Mindestaufladung · E4 Steuer Prepaid/Anzahlung · E5 Verfall/Rückzahlung · E6 Hochrisiko-Einsatz · E12 Rechtsprüfung. Firmendaten (Anschrift, KvK, USt-IdNr.) bestätigen.

## Prototyp → Produkt: bekannte Lücken
- Alle Portal-Aktionen laufen mit lokalem Zustand; Backend-Stellen sind mit `data-api-endpoint`/`TODO(BACKEND)` markiert.
- Dokumente sind HTML-Muster; produktiv PDF/A-3 mit XRechnung/ZUGFeRD.
- Mobil: nur statisch geprüft; App-Shells Leitstand/Posteingang ohne Overlay-Navigation.
- Übersetzungen: 22 Seiten nur Deutsch.
- `canonical`/`hreflang`/Sitemap erst nach URL-Plan; Schriften selbst hosten.
- TEILEKLAR Shop (~635 KB Einzeldatei) in Katalogdaten + Komponenten aufteilen.

## Abnahmekriterien Gesamtsystem
1. Ein Kopf, ein Fuß, ein Token-Satz auf allen Flächen (DS-Audit 0 Fehler).
2. Jede Zahl mit Preisbezug stammt aus `fakten.json` bzw. `api-prepaid.json` (CI-Abgleich `tools/inhaltsabgleich.js`).
3. Jede KI-Ausgabe ist gekennzeichnet; jede Buchung idempotent; jeder Vorgang im Journal.
4. Alle Nutzerwege (Angebot annehmen/ablehnen/anpassen, Rechnung laden, Bestellung, Registrierung, API-Aufladung) sind bei 320/768/1440 px bedienbar.
5. Rechtstexte je Markt freigegeben; Freigabe-Gate PASS.
