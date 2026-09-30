# ÜBERGABE – NeXify-Gesamtlösung, Stand 28.09.2026

**Dieses Paket ersetzt alle früheren Stände, Pakete und Einzeldateien.** Es gilt ausschließlich, was in `MANIFEST.md` als *aktuell* geführt ist. Ältere Fassungen im Paket sind nur zum Vergleich enthalten und werden nicht installiert.

## 1. Was geliefert ist
- **Oberflächen:** 44 Design-Komponenten, davon 33 aktuell (siehe MANIFEST). Kundenwege neu: `Kundenwege.dc.html` (Registrierung · Angebotsannahme · Erstbesuch mit Onboarding).
- **Fachkerne:** 22 Kerne in `lib/`, alle an Abläufe angeschlossen, **385/385 Prüffälle grün** (Leitstand → Kerne).
- **API-Vertrag:** `api/openapi.yaml` 1.1.0, 36 Pfade; jede `data-api-endpoint`-Angabe aller Oberflächen ist darin spezifiziert (0 Lücken).
- **Datenbank:** Migrationen 001–007 mit Mandantentrennung (RLS erzwungen, Rechte für `nx_app`).
- **Installation:** `install.sh` (`--parallel` Standard, `--frisch`, `--nur-pruefen`), Paket-Bände 00–10 vollständig (Band 09 als Entscheidungsvorlage).
- **CI-Schranken:** Abhängigkeiten, Code-Regeln, Mandantenprüfung, Regelwerk, Normprüfung.

## 1a. Nachtrag: NeXify AI API Prepaid
Produktseite mit Rechner, Konsole mit Revolut-Aufladung, Rechtsseiten (Entwurf), `lib/prepaid.js` 18/18, Migration 008, API 1.2.0. Details: `docs/03-backend/api-prepaid-umsetzung.md`.

## 1b. Systemweites Review 28.09.2026
QA-2026-09-28-01: 1 Critical, 5 Important behoben, 5 Minor notiert – `docs/04-betrieb/pruefprotokoll-code-review-2026-09-28.md`. Prüffälle 385/385.

## 2. In dieser Runde korrigiert
- **Seitenfolge:** „Annehmen“ im Kundenportal war ein Ein-Klick-Statuswechsel ohne Prüfung → führt jetzt über `Kundenwege.dc.html?weg=ang` (Fassung, § 14 BGB, Zeichnungsbefugnis, AGB, Idempotenz). Registrierung → Bestätigung → Erstbesuch ist durchgängig verbunden.
- **API nach Design-Prinzipien:** Pfade als Substantive im Plural (`/crosssell/orders`, `/partner/vouchers/orders`), Aktionen als Unterressource, einheitliches Fehlerformat, Versionierung im Pfad (`/v1`).
- **Aufzählungsschutz:** `/auth/register` antwortet immer 202 (vorher 409 bei bestehender Adresse).
- **Neu spezifiziert:** `/auth/verify`, `/auth/verify/resend`, `/auth/invitations/{token}/accept`, `/offers/{id}`, `/offers/{id}/decline`, `/offers/{id}/forward`, `/onboarding`, `/onboarding/{schritt}`, `/partner/profile`, `/crosssell/orders`, `/customer/appointments/{id}/status`.
- **Modellanfrage:** `KiAntwort` trägt jetzt `art` (Pflicht), `modus` (nur intern), `traceId`; `stufe` optional.
- **Rollen vereinheitlicht:** `kunde | partner | nachbarschaft | affiliate` in Vertrag und Kern.
- **Verlinkung:** alle internen Links aufgelöst (4 Verdachtsfälle geprüft – Dateien vorhanden).

## 3. Was ausdrücklich NICHT garantiert ist
Eine Garantie „fix und fertig in Betrieb“ kann ich nicht geben, weil Folgendes nie gelaufen ist:
1. **Kein Lauf unter Node, auf dem Server oder gegen echte Postgres, Modelle, Resend.** Alle 371 Prüffälle liefen im Browser.
2. **Gateway und Worker sind nicht gebaut** (Backend-Auftrag B6–B10). Die Oberflächen sind Prototypen mit spezifizierten Endpunkten, keine angeschlossene Anwendung.
3. **OpenAPI nicht mit Spectral validiert** (Werkzeug hier nicht verfügbar) – erster Schritt nach dem Entpacken.
4. **Rechtstexte, DNS, Preise, Freigaben** liegen bei dir (Hartsperren).
Go-Live-Abschlusstest: **nicht Go-Live-fähig**, Details `docs/handoffs/kundenwege/spezifikationspruefung.md`.

## 4. Erste Schritte nach dem Entpacken
1. `npx @stoplight/spectral-cli lint api/openapi.yaml`
2. `node tools/abhaengigkeiten.js && node tools/code-regeln.js && node tools/mandanten-pruefung.js`
3. `sudo ./install.sh --nur-pruefen` auf dem Zielserver – ändert nichts.
4. Migrationen gegen leere Postgres 16 + pgvector; Prüffall „Mandant A liest B nicht“.
5. Danach Backend-Auftrag B6 nach `docs/08-gesamtloesung/01-backend-auftrag.md`.

## 5. Offene Entscheidungen (nur du)
S1-Prompt 2.0.0 · ADR-0005/0007/0008 · Grundfreigabe Selbstheilung · Vertretung · Resend-DNS · Rechtstexte · USt je Position bei Mischangeboten.

## 6. Einstieg
`AGENT.md` → `docs/handoffs/2026-09-28-gesamtstand.md` → `docs/paket/00-hauptdokument.md`.
