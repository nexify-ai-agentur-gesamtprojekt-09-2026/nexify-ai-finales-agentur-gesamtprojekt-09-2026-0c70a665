# plan.md — NeXify AI „Gesamtbeschreibung“ Umsetzung (aktualisiert · **Frontend‑Only** · **Startseiten‑Master** · DE)

> Leitregel: **Nur was nachweisbar getestet ist, gilt als ACCEPTED.**
> Geschlossener Regelkreis: _Ändern → Build/Run → Frontend‑Nachtest (ein Browser‑Kontext) → Evidence (Screenshots + Console‑Log) → Statusupdate_.
>
> **HARTE SCOPE‑GRENZE:** ausschließlich **Frontend‑Arbeiten**. **Kein** Backend‑Umbau, keine neuen Integrationen, keine Backend‑Tests.
>
> Medienregel (Marketing/Corporate): **nur** die 17 freigegebenen Higgsfield‑Stills (statisch), **keine** Stock‑Medien.
> Shop‑Ausnahme (freigegeben): **Originalfotos der angebotenen Artikel** sind im TEILEKLAR.shop erlaubt.
>
> **Startseiten‑Master:** Die bestehende Startseite ist die **einzige** Layout‑Referenz. Keine zweite Stilwelt.

---

## 1) Objectives

### O1 — Ergebnisqualität statt „Rohbau“ (P0)
- Alle Seiten wirken **fertig** (keine „Rohbau“-Flächen, keine zufälligen Raster/Abstände).
- Kein Mock‑Charakter: **keine** erfundenen Projekte, Kennzahlen, Kunden, Lieferzusagen, Verfügbarkeiten.
- Header → Body → Footer: durchgehend **im Rhythmus der Startseite** (Typo, Spacing, Material, CTA‑Logik).
- **Null Toleranz für Console Errors**: Hydration‑Warnings/Errors und Module‑Not‑Found werden vollständig eliminiert.

### O2 — Startseiten‑Master strikt durchziehen (P0, neu konkretisiert)
- Innenseiten werden **nicht** mehr über Override‑Stapel „zurechtgebogen“.
- Stattdessen: **ein einziges gemeinsames Klassensystem** (Startseiten‑Klassen) für
  - Container‑Breiten, Seitenränder, Abschnittsrhythmus
  - Headline‑Typo, Kicker‑Ton, CTA‑Stil
  - Bildrahmen/Atelier‑Materialität (Champagne‑Edge)

### O3 — Bildzuordnung & Medienkonzept korrekt (P0)
- Brand‑Seiten: **exklusiv** die 17 Higgsfield‑Stills über `/app/apps/web/lib/brand-media.ts`.
- **Keine Presenter‑Cutouts** / Zielbild‑Figuren / sonstige Medien auf Brand‑Innenseiten.
- TEILEKLAR.shop: **echte Produktfotos** aus Lieferantendaten sind erlaubt und bleiben.

### O4 — TEILEKLAR.shop im selben System (P0)
- Shop ist **kein Fremdkörper**: gleiche Container/Typo/Materialität wie Startseite.
- Schaufenster/Katalog/PDP/Warenkorb/Checkout: kaufmännisch klar (Preis inkl. MwSt., Zustände, CTAs), ohne Demo‑Werte.

### O5 — Portale/Protected Pages: „Shell“ im Master‑System (P1)
- Portale wirken wie Teil der Website (Startseiten‑System), ohne Data‑Leak.
- Gate/Shell: session‑abhängig, Backend bleibt Autorität.

### O6 — ISO/DIN/WCAG‑Basics (P1, nach Layout‑Fix)
- Kontrast, Focus‑States, Tastatur‑Navigation, ARIA Labels, `lang` konsistent.
- Keine rein optischen Fixes, die Accessibility verschlechtern.

---

## 2) Implementation Steps

### Phase 1 — Frontend‑Only Freeze & Konsolidierung (P0) **IN PROGRESS**
1) **Backend einfrieren**
   - Keine Backend‑Änderungen, keine externen Trigger.

2) **Fehlerursache adressieren: Override‑Stapel entfernen**
   - Befund: Innenseiten wirkten wie „Mischmasch“ durch Layering:
     `PublicContentLayout.css` → `LuxuryMaterials.css` (.content-layout) → `HomeMaster.css`.
   - Ziel: **ein** Startseiten‑System, **keine** konkurrierenden Layout‑Engines.

**Exit‑Kriterium:** Ein konsistentes Stylesystem ohne konkurrierende Layout‑Stacks.

---

### Phase 2 — Hydration/Console‑Fehler auf 0 (P0) **IN PROGRESS (teilweise umgesetzt)**
1) **Root Hydration Diff begrenzen**
   - `suppressHydrationWarning` **nur** auf `<html>` und `<body>`.

2) **Deterministische Client‑States**
   - Locale/Client‑States ohne SSR/CSR Divergenz.

3) **Build‑Fehler eliminieren**
   - Beispiel‑Befund (zu fixen falls erneut auftaucht): Import auf nicht existente CSS (z.B. `DomainArtwork.css`).

**Exit‑Kriterium:** 0 Hydration‑Warnings/Errors, 0 Module‑Not‑Found, 0 Runtime‑Errors in Standard‑Browserprofil.

---

### Phase 3 — Startseite als Maßstab finalisieren (P0) **IN PROGRESS**
1) **Startseite bleibt Master**
   - Keine Änderungen, die Home‑Rhythmus brechen.

2) **Typo/Spacing als Referenz einfrieren**
   - Startseiten‑Tokens & HomeConcept‑Klassensystem als Quelle.

**Exit‑Kriterium:** Startseite ist „final“ und dient als objektiver Maßstab für alle anderen Seiten.

---

### Phase 4 — Public Pages: „von Grund auf neu“ im Startseiten‑Klassensystem (P0) **IN PROGRESS (neu)**
**Kernentscheidung:** `PublicContent.tsx` wird **komplett neu** geschrieben und nutzt **ausschließlich** Startseiten‑Klassen.

1) **Neue Seiten‑Komponente: PageConcept (Startseiten‑Derivat)**
   - `PublicContent.tsx` ersetzt `.content-layout` durch Startseiten‑System:
     `.home-concept`, `.hc-container`, `.hc-kicker`, `.hc-intro`, `.hc-gallery`, `.hc-service-layout`, `.hc-service-detail`, `.hc-process`, `.hc-finish`, `.hc-text-link`, `.hc-arrow`.
   - Layout‑Elemente (Brotkrume, Hero, Sections, Related, Next) werden **Startseiten‑artig** komponiert (kein anderes Grid).

2) **Einzige neue CSS‑Datei: `PageConcept.css`**
   - Nur für seiten‑spezifische Zusätze, die Home nicht besitzt:
     - Brotkrumen‑Stil (Startseiten‑ruhig)
     - Hero‑Varianten (mit/ohne Bild)
     - Supplements (Formular/Shop‑Einbettungen) im Atelier‑Material
   - Keine zweite Designwelt.

3) **Bestehende Module auf hc‑Klassen umstellen**
   - `ExplainerSections`, `PageShowcase`, `PageQuestions`, `PresenterGuide`:
     - Optik/Spacing/Typo über Startseiten‑Klassen.
     - **Entfernen** von Presenter‑Cutouts/Videos auf Innenseiten.

4) **Bildlogik: nur 17 Higgsfield‑Stills**
   - `DomainArtwork`/Showcase nur `brand-media.ts`.
   - Keine Presenter‑Assets, keine Legacy‑Composites.

5) **Alt‑CSS entfernen (oder vollständig entkoppeln)**
   - Entfernen/Stilllegen:
     - `PublicContentLayout.css`
     - `PresenterEditorial.css`
     - `PageQuestions.css`
     - `.content-layout` Regeln in `LuxuryMaterials.css`
     - Public‑Teil in `HomeMaster.css` (nur noch notwendige, nicht‑konkurrierende Regeln)

**Exit‑Kriterium:** Jede Public‑Seite wirkt wie „Startseite → Folgeseite“ (pixel‑rhythmisch), ohne Mischmasch.

---

### Phase 5 — TEILEKLAR.shop: auf PageConcept/Startseiten‑System umstellen (P0) **PLANNED → IN PROGRESS nach Phase 4**
1) **ShopFrame/Storefront in hc‑Container & Atelier‑Material**
   - Shop‑Header/Frames nutzen `hc-container` und Startseiten‑Spacing.

2) **Schaufenster → Katalog → PDP → Warenkorb → Checkout**
   - Zustände (Loading/Empty/Error) visuell im System.
   - Kaufmännische Klarheit: Preis inkl. MwSt., Hinweise, CTAs.
   - Keine Payment‑Klicks (Frontend‑Only).

**Exit‑Kriterium:** TEILEKLAR wirkt wie echter DE‑Shop **und** wie Teil von NeXify.

---

### Phase 6 — Auth‑Seiten & Portale im selben Rahmen (P1) **PLANNED**
1) **Auth (Anmelden/Registrieren/Passwort) im Startseiten‑System**
   - Kein Fremdstyling.

2) **PortalWorkspace UI**
   - Gate/Shell/Records im Startseiten‑Rhythmus.
   - Fokus‑ und Tastaturführung sauber.

**Exit‑Kriterium:** Portale sind „intern/privat“, aber optisch konsequent und nicht roh.

---

### Phase 7 — ISO/DIN/WCAG Check (P1) **NOT STARTED**
- Kontrastprüfung (Text, CTA, Inputs)
- Keyboard‑Navigation (Skip‑Link, Nav, Accordions)
- ARIA Labels / Landmarks
- `lang`/Locale konsistent

**Exit‑Kriterium:** Keine offensichtlichen WCAG‑Regressions durch das Rebuild.

---

## 3) Next Actions (immediate)

1) **P0: Phase 4 starten/abschließen**
   - `PublicContent.tsx` komplett auf Startseiten‑Klassensystem rebuilden.
   - `PageConcept.css` als einzige neue Seiten‑CSS.

2) **P0: Presenter‑Medien auf Innenseiten entfernen**
   - Cutouts/Videos raus, Higgsfield‑Stills rein (über Registry).

3) **P0: Alt‑CSS deaktivieren/entfernen**
   - Keine konkurrierenden Layout‑Regeln mehr im Bundle.

4) **P0: Screenshot‑Nachtests**
   - Desktop 1920: `/`, `/leistungen/websites`, `/kontakt`, `/unternehmen`, `/wissen`, `/produkte/nex2fly`.
   - TEILEKLAR: `/teileklar`, `/teileklar/shop`, `/teileklar/produkt/*`, `/teileklar/warenkorb`, `/teileklar/kasse`.
   - Portal Shell: `/portal/kunde`, `/intern/leitstand`.

5) **P1: Danach TEILEKLAR & Portale angleichen**
   - ShopFrame/Storefront + Auth + Portal im gleichen Layout‑Rahmen.

---

## 4) Success Criteria

- **Keine Rohbauwirkung:** Jede Seite wirkt fertig, nicht wie zusammengestückelte Komponenten.
- **Startseiten‑Master:** Alle Seiten sind visuell eindeutig „aus der Startseite abgeleitet“ (Container, Typo, Rhythmus).
- **Bilder:** Brand‑Pages nutzen **nur** die 17 Higgsfield‑Stills (visuell geprüft); TEILEKLAR nutzt echte Produktbilder.
- **Console:** **0** Hydration‑Errors/Warnungen, **0** Build/Module‑Fehler.
- **TEILEKLAR:** Schaufenster → Katalog → PDP → Warenkorb → Checkout ist kaufmännisch klar, stabil, im Brand.
- **Portale:** Shell/Gate konsistent, keine Data‑Leaks, UX im selben System.
- **Accessibility:** Fokus/Keyboard/ARIA/`lang` ohne Regression.
- **Evidence:** Screenshots + Frontend‑Testreport (nur Frontend; keine Live‑Mails/Orders/Payments).