# plan.md — NeXify AI „Gesamtbeschreibung“ Umsetzung

## 1) Objectives
- **Startseite exzellent**: Premium-Graphite-Look + stimmige Higgsfield-Bildwelt (nur die 17 freigegebenen Bilder), keine Videos.
- **Konzept-Nachweise liefern**: konkret benannte Soll-Details aus der Gesamtbeschreibung auf der Startseite/Öffentlichkeit nachweisen (z. B. /login → /anmelden).
- **Stimme & Inhalt**: durchgehend „Sie“, ruhig, präzise, mit Leitbegriffen und Strukturmotiven („Ein X. Ein Y.“, „Erst das Vorhaben, dann die Technik“).
- **Qualitätskette**: nach jeder Änderung kompilieren + visuell prüfen (Screenshots), nichts als „fertig“ markieren ohne Beleg.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) 
*(POC erforderlich, weil Kernflow externe Integrationen/Runtime umfasst: Chat/Portale/Auth/Email; für diese Phase: minimaler Nachweis-Fix + visuelle QA Pipeline.)*
1. **Startseiten-QA-Pipeline**
   - Script/Checkliste: Desktop (1600px), Tablet, Mobile; Reduced Motion; Fokus-Ring; Kontrast.
   - Screenshot-basierte Evidenz je Sektion: Hero, Intro, Galerie, Leistungen, Sichtbarkeit, Zusammenarbeit, Produktwelt, Budget, Abschluss, Footer.
2. **Konzept-Nachweis-Link-Fix POC**
   - Minimal: Route/Redirect für `/login` und `/signup` → `/anmelden` und `/registrieren`.
   - Verifizieren: direkte Navigation + keine 404, keine falschen Verweise in Komponenten.

**User stories (Phase 1)**
1. Als Besucher möchte ich die Startseite ohne visuelle Brüche auf Desktop/Mobile sehen.
2. Als Besucher möchte ich, dass jede Startseiten-Sektion erkennbar zusammengehört (ein System, kein Template).
3. Als Besucher möchte ich, dass ein Klick auf Login/Signup mich immer zu Anmelden/Registrieren bringt.
4. Als Besucher möchte ich beim Tabben einen klaren, schönen Fokus sehen.
5. Als Besucher möchte ich keine Videos/Play-Fakes sehen, sondern echte, hochwertige Bilder.

### Phase 2 — V1 App Development (Startseite exzellent)
1. **Startseite: visuelle Komplett-QA + Feinschliff**
   - Grid/Spacing auf 8px Raster prüfen, typografische Hierarchie (Plus Jakarta / Inter / Geist Mono).
   - Lime nur als Funktionssignal (Primary CTA, Fokus, Live-Punkt).
   - Header als „Rahmen“ des Hero-Medienbereichs (Glasleiste, keine zusätzliche Rahmenlinie am Bild).
2. **Produktwelt-Sektion aufwerten (Higgsfield + Champagne-Glaskante)**
   - Pro Produktkarte ein passendes Higgsfield-Foto (aus den 17), keine Wiederholung.
   - Einheitliches „Bildmodul“ mit Champagne-Glaskante (nicht am Hero-Spiegel), konsistente Aspect Ratios.
3. **Vorhaben-Story (unter Hero) bildgestützt statt Video**
   - Unter Hero: hochwertige Glasbilder (Higgsfield) statt angenommener Videos.
   - Texte eng an Bildmotive koppeln: Vorhaben → Struktur → Umsetzung → Betrieb.
4. **Footer/Navigation Text-Polish**
   - Alle Labels/CTAs in Markenstimme: „Projektgespräch anfragen“/„Vorhaben beschreiben“ konsistent.
5. **End-to-End Test (V1)**
   - Run testing agent: Startseite, Navigation, Anchor-Scroll, Mobile Menu, Link-Checks.

**User stories (Phase 2)**
1. Als Interessent möchte ich im Hero in 10 Sekunden verstehen, was NeXify für mich löst.
2. Als Interessent möchte ich an den Bildern sehen, dass hier echte Arbeit/Produktion gemeint ist.
3. Als Interessent möchte ich pro Bereich (Marke/Web, Systeme/KI, TEILEKLAR) sofort den nächsten Schritt finden.
4. Als Interessent möchte ich im Produktwelt-Bereich die vier Angebote klar auseinanderhalten können.
5. Als Interessent möchte ich eine klare, ruhige Preislogik (449 €/Tag) ohne Paket-„Nebel“ erkennen.

### Phase 3 — Adding More Features (Konzept-Nachweise erweitern)
1. **Link- und Seitenkatalog-Audit (öffentlich)**
   - Broken/legacy Links entfernen/redirecten, Sitemap/Navigation konsistent.
2. **KI-Transparenzseite („KI-Hinweise“) befüllen (Minimal-v1)**
   - Ehrliche Hinweise: Fehler möglich; Modelle/Provider; Datenschutz-Hinweise (ohne erfundene Liveclaims).
3. **Kontaktpfad (Copy  UX) auf Startseite**
   - Klarer Kontakt-CTA, erwartete Antwortzeit/Prozess (ohne Versprechen).
4. **E2E Test (Phase 3)**
   - testing agent: Startseite + Kontaktpfad + KI-Hinweise + Redirects.

**User stories (Phase 3)**
1. Als Besucher möchte ich keine leeren Seiten finden (z. B. KI-Hinweise).
2. Als Besucher möchte ich ehrlich sehen, was Oracle kann und was nicht.
3. Als Besucher möchte ich in jedem Abschnitt einen konkreten nächsten Schritt.
4. Als Besucher möchte ich, dass alle Links konsistent sind und nicht ins Leere führen.
5. Als Besucher möchte ich rechtssichere Transparenz statt Marketing-Übertreibung.

### Phase 4+ — Weitere Seiten nach Auditkette (später)
- Leistungs-Detailseiten, Produktseiten/Tarife, TEILEKLAR.shop, Portale, Rechtstexte, SEO/PWA, Mehrsprachigkeit.
- Jede Seite: IST/SOLL Audit, Screenshot-Evidenz, Regressionstest, unabhängiger Review.

## 3) Next Actions (immediate)
1. Implementiere Redirects `/login` + `/signup` → `/anmelden` + `/registrieren` und entferne Hardlinks (z. B. PartnerJourney.tsx).
2. Wechsle Produktwelt-Bereich auf 4 unterschiedliche Higgsfield-Bilder + konsistentes „Champagne-Glaskante“-Bildmodul.
3. Erstelle Screenshot-Evidenz (Hero + jede Sektion) und fixiere 3–5 visuelle Mängel (Spacing, Kontrast, Hover).
4. Run testing agent (1 Runde) und dokumentiere Findings.

## 4) Success Criteria
- Startseite wirkt **Premium/Graphite**, ohne generische Assets, ohne Videos, mit den 17 Higgsfield-Bildern.
- Alle Startseiten-Sektionen sind konsistent (Grid/Typo/Material), Lime nur als Signal.
- `/login` und `/signup` führen zuverlässig zu `/anmelden` und `/registrieren`; keine 404/Dead Links.
- Produktwelt zeigt 4 klare Angebote mit passenden Bildern + Champagne-Glaskante.
- Nachweis erbracht: Kompilierung ok + Screenshots + testing-agent Report ohne kritische Regressionen.
