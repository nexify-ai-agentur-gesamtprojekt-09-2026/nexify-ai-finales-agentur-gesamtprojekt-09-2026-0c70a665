# Offene-Punkte-Register · Stand 2026-11-08

Konsolidierung aller offenen Punkte aus dieser Sitzung, PROGRESS.md, AGENTS.md und
den Supervisor-Aufträgen. Status je Punkt: OFFEN / IN ARBEIT / LOCALLY_TESTED /
LIVE_VERIFIED / BLOCKIERT. Eigene Prüfung ersetzt keinen unabhängigen Review.

## Hauptauftrag: Canvas → alle Seiten → fertige App auf .de

- **Leistungen (`/leistungen`, page.id=services)** — LOCALLY_TESTED.
  Bespoke React-Komponente `ServicesContent` + `Services.css`, eingehängt in
  `PublicExperience`. Canvas-Higgsfield-Hero (`hero-plate`+`hero-pascal` →
  `apps/web/public/media/canvas/`). Nachweis: Dev-Build rendert, tsc 0 Fehler,
  Desktop+Mobil-Screenshot. Commit `f96a62c`. LIVE_VERIFIED: OFFEN (noch nicht .de).
- **14 weitere Canvas-Seiten** (Startseite, Produkte, NeX2Fly/ORACLE, Arbeitsweise,
  Budget, Kontakt, Komponenten, Impressum, Operator Dashboard, AIFly, Studienkolleg-
  Strang …) — OFFEN. Muster = ServicesContent.
- **Interaktivität** (Szenen-Player, Oracle-Chat-Aside, Accordion) — OFFEN
  (Leistungen bisher als statische Karten).
- **Restliche Canvas-Bilder ins Repo holen** — OFFEN (bisher nur hero-plate/pascal).
- **.de-Deploy** — OFFEN. Leitplanken/Fakten:
  - `.de` (nexifyai.de) ist an Branch `factory/agency-separated-2026-10-26` gepinnt
    (Quelle: config/integrations/vercel-agent-setup.json, preview_domain_verified).
  - Dieser Branch hat **nur de/nl/fr** und `/leistungen` nur Sektion `ueberblick`
    → Struktur sauber migrieren, **nicht blind überschreiben**; kein Force-Push.
  - Abnahme erst nach Deploy per Live-Preview-Screenshot (Desktop+Mobil); Build-grün
    allein zählt nicht.

## Oracle-Chat (Supervisor-Auftrag 3 — Vorrang)

- **Chat ist nicht „fehlend".** Ein globaler **NeX Agentic AIFly / ORACLE**-Chat
  liegt in `apps/web/components/Workspace.tsx` (Shell um jede öffentliche Seite):
  Launcher `data-testid=chat-launcher` (unten rechts), Desktop = angedocktes,
  breiten­verstellbares Panel `aifly-panel`, Mobil (≤820px) = Vollbild-`dialog`
  mit Backdrop/Fokusfalle/Escape. Backend ehrlich **zero-model**: `/api/session`,
  `/api/chat` (Intent-Router), Kontakt/Termin-Fallback `PublicRequestFallback`;
  ChatGPT-Pfad nur kapazitäts-gated auf der Startseite.
- **Abnahme-Gate gebaut (LOCALLY_TESTED).** `apps/web/e2e/` (Playwright 1.63):
  prüft jede `shared_chat_required`-Route (39) auf sichtbaren Chat-Einstieg in
  Desktop 1440 + Mobil 390; Routen aus Config abgeleitet. Lokal gegen `next dev`
  **80/80 grün**. Script `test:e2e`. Commit `2d750b7`.
- **OFFEN (Auftrag-3-Lücken):** (1) Datenschutz derzeit passiver Hinweis statt
  Vor-Eingabe-Consent-Gate mit getrennten Einwilligungen (Verlauf/Kontakt) +
  Zahlungs-/ID-Filter — Consent-Text ist rechtlich (nur Entwurf, Pascal). (2)
  Token-Abgleich Panel vs. Graphite/gedämpftes-Lime-Kanon (Konflikt a). (3)
  Oracle-Figur Hut+Monokel-Prüfung (`OracleCompanion.tsx`).

## Werkstatt / SEO (Supervisor-Auftrag 1, Teile A–D)

- **C) Werkstattdaten via OSM Overpass** — **BLOCKIERT (Netzwerk)**.
  Overpass main (overpass-api.de) → `Connection reset by peer`; Mirror
  (overpass.kumi.systems) → Timeout. Nominatim (nominatim.openstreetmap.org) → HTTP 200,
  ersetzt aber keine Bulk-POI-Abfrage. Umgebung ist `unrestricted` → Block liegt am
  Proxy-Egress oder an Overpass selbst, nicht an einer Allowlist.
  Keine Erfindung von Daten, kein Scraping anderer Portale. **Needs:** Overpass-Egress
  klären oder Werkstattdaten extern bereitstellen.
- **A) Stadtseiten `/werkstatt/{slug}` + Übersicht** — BAUBAR als Template/Scaffolding,
  aber ohne Daten bleiben Stadtseiten `noindex` (Regel: ≥2 belegte stadtspezifische
  Sätze, sonst noindex). Brand/Rolle: Werkstatt gehört zu **TEILEKLAR**
  (`/teileklar/werkstatt` existiert bereits); `/werkstatt/{slug}` vs. `/teileklar/...`
  → Domain/Rolle vor Bau aus Config bestätigen.
- **B) SEO** (JSON-LD BreadcrumbList/FAQPage/ItemList, AutoRepair ohne Bewertungen,
  sitemap.xml, robots /werkstatt/) — BAUBAR zusammen mit A.
- **D) Preisrecherche (interne Doku, Fremdangaben mit Quelle+Stand)** — BAUBAR,
  NICHT als NeXify-Preise. Werte siehe Anhang unten.

## Marketing / Content / Conversion (Supervisor-Auftrag 2)

- **Positionierung/Angebotshierarchie/Pflichtfragen/Primär-CTA je Seite** — OFFEN
  (in den Seiten-Nachbau integrieren). Positionierung: „Erst das Vorhaben, dann die
  Technik. Ein Ansprechpartner. Ein Konzept. Ein klarer Preis."
- **Ratgeber-Content** (KI-Kosten; Kfz-Stundensatz) mit Fremdquellen+Stand — BAUBAR.
- **Conversion**: Kontaktformular vorhanden (`ContactRequestForm`); Terminbuchung +
  Newsletter (Double-Opt-in) — OFFEN; kein Kalt-Outreach/keine automatischen Mails.
- **Wettbewerbsanalyse Top-10** (bisher 6; 4 weitere, nur Primärseiten, mit Datum) — OFFEN.
- **10 SEO-Keywords mit Suchvolumen** — **OFFEN/BLOCKIERT**: kein Keyword-Tool/Search-
  Console-Zugang in dieser Sitzung; nichts schätzen.
- **Prüfpunkte**: Hero-Video Ton/Lippensync/Autoplay, Mobile-Menü-Scrolling, KI-Chat,
  PWA, Live-Chat, Sprach-Parität (.de-Branch nur de/nl/fr; main de/nl/fr/en — klären),
  Higgsfield-Medienbindung (`page-media-registry.json` pending, **owner-gated/Pascal**) — zu prüfen.
- **Vertriebsmaterial** (Broschüre, HTML-Mail, Signatur, vCard) — nur Entwurf;
  **Kontaktdaten (Telefon, Geschäfts-E-Mail) fehlen → von Pascal.**
- **Seitenaudit-Register** (Brand, UX, WCAG 2.2 AA, SEO, Performance, Datenschutz) — anzulegen.

## Benötigte Freigaben / Eingaben von Pascal (Blocker)

1. Overpass-Egress freischalten ODER Werkstattdaten extern liefern (OSM blockiert).
2. Keyword-Tool/Search-Console-Zugang (sonst Suchvolumen OFFEN).
3. Kontaktdaten (Telefon, Geschäfts-E-Mail) für Vertriebsmaterial.
4. Higgsfield-Medienbindung-Freigabe (`page-media-registry.json` pending).
5. Rechtstexte- und Preis-Livegang-Freigabe (Rechtsseiten bleiben Entwurf).
6. .de-Struktur-Migration bestätigen (de/nl/fr + `ueberblick` sauber überführen).

## CI-Status PR #75 (Leitplanke 4: vorbestehend vs. verursacht)

- **Nicht durch diese Änderung verursacht:** `apps/site` tsc = **0 Fehler** inkl. neuer
  Dateien; Dev-Build rendert; `node tools/ds-audit-cli.js` 0/0; apps/site-Tests
  112/118 mit **baseline-identischen** 6 Fehlern (lokaler Stash-Vergleich).
- **Vorbestehendes rotes Gesamt-Gate** (PROGRESS.md: Vollkette ~697 Tests, ~79
  Failures; `make clean-check`/`make check-arch` rot) → erklärt react-site/next-web/
  repository/review.
- **Infra, nicht Code:** `Workers Builds` (Cloudflare) „Script name too long (>54)";
  `Vercel – site-gjp7` „Deployment blocked" (Entitlement). Repo-weit, nicht diese PR.
- Gates werden **nicht abgesenkt**; keine Tests deaktiviert.

## Anhang · Preis-Fremdangaben (Stand 08.11.2026, NICHT als NeXify-Preise)

- KI-Beratung Tagessatz Freelancer: ab ~800 €, Durchschnitt ~1.800 €.
- IT-Beratung: 1.065–1.498 €/Tag (CIO.de / Metrics 03/2026).
- Pilotprojekt: 5.000–25.000 € (tech-now.io, 03.10.2026).
- Kfz-Stundenverrechnungssatz Ø 2024: 202 € (Mechanik/Elektrik/Karosserie),
  220 € (Lack); +7,5 % in 2025 (GDV/DEKRA via autohaus.de, 06.10.2025 / 02.11.2026).
- Freigegebener NeXify-Tagessatz 449 € (`config/fakten.json#projekt.tagessatz_eur`)
  liegt unter diesen Marktwerten — nur als interner Fakt, nicht als Marktvergleich öffentlich.
  Auf Stadtseiten nur bundesweiter Ø mit Jahr+Quelle, keine stadtspezifischen Preise.
