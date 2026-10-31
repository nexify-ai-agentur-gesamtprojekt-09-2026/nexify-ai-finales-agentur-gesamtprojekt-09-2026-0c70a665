# NEX-COPY-20261031-17 — Manifest + Restliste (Stand 2026-10-31, Charge 3 Ende)

Lokal, **kein Push/Publish**, **keine Secrets**. BTW + Backend/BigBuy bleiben offen (keine erfundenen Freigaben).

## Manifestierte Commits (vollständige 40-stellige SHAs)
- `73523b6b6060993eba6bd84b7f1cc62b27d7db45` — TEILEKLAR Panel (Workspace.tsx) auf Sie-Form + Breadcrumb (Charge 3)
- `a6e1de170b0f4141cb785c25ecee4cd3d33efb72` — TEILEKLAR Related-Cards + page-explainers-Satz (Charge 2)
- `52e0bf98f5f824b36ca9a1837aedb9819a6bbf84` — Impressum (echte Eenmanszaak) + TEILEKLAR Hero/Chat/Footer (Charge 1)
- Basis EN/Touch: `94fde9a592bd99799df99cbbe5ffd436622aa2fd` (Touch 48px), `0aaa8f51eb4145b8069bbc9b2a521d5c66a8b516` (EN)
- Patchbündel: `docs/handoff-2026-10-31/patches-copy/0001..0008-*.patch` (git am, geheimnisfrei verifiziert) sowie EN/Touch unter `patches/`.

## Geänderte Kunden-Routen (verifiziert via frischem apps/site-Adapter-Readback)
- `/impressum`: Fake-„FACTORY B.V." → echte Eenmanszaak (KvK 90483944, Venlo/NL); BTW OFFEN (keine Nummer erfunden).
- `/teileklar`: Hero (Sie), Footer „TEILEKLAR — Na KLAR!", Related-Cards (keine „in Kürze"/„wirklich passt"),
  page-explainers (keine „freigegeben angeschlossen"), Chat-Panel (Workspace.tsx) Sie-Form, Breadcrumb „Sie sind hier".
- Negativtests (frischer Render): „Katalog in Kürze"/„wirklich passt"/„freigegeben angeschlossen"/Du-Panel = alle entfernt.

## RESTLISTE (geschuldet; Texte bereits vom Besteller geliefert — NICHT neu erfinden)
Alle VOR einer EINZIGEN gemeinsamen Test-/Preview-Kaskade bündeln; Metadaten/`status`/`_review_notes` NIE rendern.

1. **AIFly-/Pascal-Karten (TEILEKLAR)** in `config/site-map.json` (Persona-Module ~Z. 3890 ff.):
   - AIFly H2 „Welches Ersatzteil benötigen Sie?" + gelieferter Text + CTA „Fahrzeugangaben zusammenstellen".
   - Pascal H2 „Als Werkstatt mit TEILEKLAR zusammenarbeiten" + gelieferter Text + CTA „Werkstatt vorstellen".
2. **Related „Partner" + „Kategorien"** (TEILEKLAR) in `config/site-map.json` — gelieferte Texte (Teil/Passung sind bereits gesetzt).
3. **Footerintro TEILEKLAR**: „Ersatzteile, Fahrzeugfragen und Werkstattkontakte. Beschreiben Sie, was Sie benötigen." CTA „Anliegen beschreiben" (Quelle lokalisieren: SiteFooter/site-map).
4. **i18n.ts Brandline/Status** (`apps/web/lib/i18n.ts:3`, mir zugewiesen): „Projektklärung · dein nächster Schritt." + „Womit möchtest du starten?" → für TEILEKLAR Sie/eigene Marke; Verbindungslabel ohne Runtimebeleg nur „KI-Assistent", nicht „verbunden" (nur Label, keine Verbindungslogik).
5. **Sechs Serviceseiten** (JSON vom Besteller geliefert, nur h1/intro/sections/cta einsetzen, Sprachvarianten konsistent):
   `/leistungen`, `/leistungen/websites`, `/leistungen/agenten-automatisierung`, `/leistungen/apps-portale`, `/preise-ablauf`, `/kontakt`.
   - `/preise-ablauf`: belegte Preisliste NICHT pauschal entfernen; keine Gratisberatung/Festpreise/Fristen zusagen.
   - `/kontakt`: Mail-Link `mail@nexifyai.cloud`; keine Antwortfrist/Versandbestätigung ohne Nachweis; Chatstatus nicht „verbunden".
   - Produktseiten `/produkte/nex2fly|one|api` bleiben GETRENNT (kein Consulting-Ersatz), warten auf Produktmatrix.

## Hash-Guard-Hinweis
`config/site-map.json` + `config/page-explainers.json` sind approved-Explainer-Quellen → nach Änderung
`config/presenter-sources.json`-Hash refreshen (mit dokumentiertem Quell-/Sprachen-Diff), **Guard unverändert scharf**
(absichtlich falscher Hash muss weiter scheitern). Immer den **apps/site-Preview-Adapter** mitprüfen, nicht nur Next.

## Kosten/Transparenz
Ich habe KEINEN technischen Budgetschutz und KEINEN Zugriff auf den Live-Credit-Zähler. Letzter gemeldeter Stand 78,21;
diese Charge hat zusätzlich verbraucht (genaue Zahl mir nicht einsehbar). Keine Nachkäufe/neuen Dienste.
