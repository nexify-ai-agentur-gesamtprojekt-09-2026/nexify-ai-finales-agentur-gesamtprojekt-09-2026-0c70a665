# Neuprüfung der Browser-Belege und Pin-Rebase 14.11.2026

Stand: Zweig `claude/belege-neupruefung`, Basis `origin/main` `ae85910`. Dieses Dokument trennt, was heute gelaufen ist (Abschnitte 1 bis 4), von dem, was daraus geschlossen wird (Abschnitte 5 und 6). Ein Pin belegt nur unveränderte Bytes seit einem bestandenen Lauf oder Test, keine Abnahme der Anforderung. `tools/_update_register_shas.py` wurde nicht benutzt.

## 1. Rahmen der Läufe

- Fester Commit für alle zwölf Läufe: `88fa345` (Harness-Nachführung). Davor frisch gebaut: `pnpm --filter @nexify/site build:standalone`, `pnpm --filter @nexify/site build`, `pnpm --filter @nexify/web build`, alle Exit 0.
- Node v22.23.4, Chromium 153.0.8010.12, Playwright **1.63.0** aus `/opt/node22/lib/node_modules/playwright`. Das Repository legt 1.65.0 fest (`.github/evidence-runner/package.json`); diese Version war in der Umgebung nicht vorhanden.
- Protokoll je Lauf mit Abbruchstelle: `evidence/neupruefung-2026-11-14/run-manifest.json`.
- `browser-consent-ui` startet `next dev` und schreibt `apps/web/next-env.d.ts` um; die Datei wurde danach mit `git checkout` zurückgesetzt.

## 2. Ergebnis je Harness

| Harness | geändert | Begründung mit Beleg | Lauf am 14.11. | Beleg übernommen |
|---|---|---|---|---|
| `browser-shop.mjs` | nein | – | bestanden (13 Checks) | ja |
| `browser-catalog.mjs` | nein | – | bestanden (7 Checks) | ja |
| `browser-workspace-read.mjs` | nein | – | bestanden (4 Checks, 20 Negativsitzungen) | ja |
| `browser-consent-ui.mjs` | nein | – | bestanden (18 Checks) | ja |
| `browser-critical.mjs` | nein (nur das Build-Skript davor) | `build-standalone.mjs` erwartete `/signet.svg`; seit `32616db` (PR 127) liegt die Datei im Archiv, die Figur ist `/brand/nexify-figur.png` (`Logo.tsx`). Skript bettet jetzt die Figur und die neu geladenen Schriften Inter und Jakarta ein. | **nicht bestanden.** Fünf Schritte bestanden, darunter der Standalone-Schritt. Abbruch bei `sdk_guided_preview_works_when_visitor_session_is_404`: Der Chat sendet seit `812abdd` (PR 116, D-010) an `/api/chat`, nicht mehr an `/api/agent-chat`. | nein |
| `browser-text-spacing.mjs` | ja | Der Hero-Film trägt seit `32616db` eine Untertitelspur. `<track>` und `<source>` in Medienelementen haben keinen berechneten Stil und können keinen Text darstellen; nur diese leeren Elemente werden ausgenommen und gezählt. Jedes andere Element muss weiter messbar sein und verdoppeln. | **nicht bestanden.** Verdopplung auf allen 43 Routen in Ordnung (19 367 Elemente, 1 ausgenommene Spur). 27 Befunde „Überlauf bei 200 % Schrift“, siehe Befund 1. | nein |
| `browser-identity-hero.mjs` (vite und next) | ja | Umbruchregel mit zusätzlichem `gap` (`f173054`, PR 92): gebunden bleiben Schwelle, Selektor und Einspaltigkeit. Hero-Film und Vorschaubild nach `0ea229c` (PR 104, Zusage des Inhabers vom 13.11.) und `32616db`; der Film zusätzlich gegen die Prüfsumme in `docs/design/scene-videos-2026-11-13.md`. Eine Haupthandlung statt zwei Links (`f173054`, `205b2c2` PR 114): Zielgröße, Tastatur und erreichtes Ziel werden weiter geprüft. Drei Filmschalter einschließlich Untertitel (`32616db`). Untertitelspur wie oben ausgenommen. | **nicht bestanden**, beide Renderer: „200% hero horizontal overflow“, siehe Befund 2. | nein |
| `browser-public-experience.mjs` | ja | Name des Assistenten aus `Logo.tsx` (`ORACLE_NAME`, `32616db`), beide Zeilen exakt und gegen die Quelle gebunden. Statt „kein Video“ gilt nach `0ea229c`, `32616db` und `e389839` (PR 136): Jedes Video zeigt auf eine vom Inhaber gelieferte Szene mit der protokollierten Prüfsumme, und nur der Hero-Film der Startseite startet von selbst. | **nicht bestanden.** 25 Routen bestanden, Abbruch auf `/anmelden`: Dokumenttitel, siehe Befund 3. | nein |
| `browser-public-fallbacks.mjs` | nein | Schutzziel entfiele teilweise ersatzlos, siehe offene Entscheidung 2. | **nicht bestanden** (erster Fall: Aktion öffnet das Orientierungsgespräch, keine `.action-card`). | nein |
| `browser-exception-capture.mjs` (vite und next) | nein | Schutzziel „Fehlergrenze des Chats“ entfiele ersatzlos, siehe offene Entscheidung 3. | **nicht bestanden**, beide Oberflächen, in Schritt 4. | nein |

Zusammen: 4 von 12 Läufen bestanden, 8 nicht. Die vier nachgeführten Skripte prüfen dieselben Schutzziele am heutigen Stand; drei davon melden jetzt echte Befunde der Seite, die vorher hinter der überholten Erwartung verborgen waren.

Ergänzende Diagnose (nicht eingecheckt, nur zur Einordnung): Mit einer Kopie der beiden Skripte, in der allein die jeweils scheiternde Prüfung nur protokolliert statt abbricht, laufen `browser-public-experience` (70 Routen, 10 private Hüllen) und `browser-identity-hero` (33 Ansichten, beide Renderer) bis zum Ende durch. Die Nachführung ist damit vollständig; offen sind nur die Befunde.

## 3. Übernommene Belege

Verfahren wie am 09.11.: alte Fassung unverändert nach `superseded/` (`*.pre-neupruefung-2026-11-14.json`), neue an den Belegpfad, nichts gelöscht.

| Beleg | Prüfer danach |
|---|---|
| `evidence/shop-ui-mock-2026-11-09/browser-shop.json` | `check_shop_ui_mock_evidence`: besteht |
| `evidence/shop-ui-mock-2026-11-09/browser-catalog.json` | `check_catalog_ui_mock_evidence`: besteht |
| `evidence/workspace-read-2026-10-28/browser-workspace-read.json` | `check_workspace_read`: besteht |
| `evidence/consent-ui-2026-10-28/browser-consent-ui.json` | eigener Teil gültig (Quellen aktuell, 18 Checks). `check_consent_ui` als Ganzes scheitert weiter am zweiten Beleg `next-public.json` (Public-Experience-Lauf nicht bestanden). |

`python3 tools/check_browser_evidence.py` besteht als Ganzes nicht: Der erste Abschnitt (Critical-Beleg) scheitert, danach bricht das Werkzeug ab. `python3 tools/check_text_resize_evidence.py` besteht nicht (Text-Spacing-Lauf nicht bestanden).

## 4. Nachgezogene Pins (17)

Je Belegart: 4 durch einen heute bestandenen Browserlauf, 12 durch einen heute grünen Test, der die Datei liest oder ausführt, 1 durch einen geprüften Diff ohne Anforderungsinhalt.

| Datei | alter Pin | neuer Pin | Belegart | Beleg |
|---|---|---|---|---|
| `apps/web/components/SiteFooter.tsx` | `56a189a3feea…` | `841a2c0dacd2…` | Browserlauf heute | browser-consent-ui.mjs, 14.11.2026, 18 Checks, bestanden; Beleg evidence/consent-ui-2026-10-28/browser-consent-ui.json bindet die aktuellen Bytes |
| `apps/web/proxy.ts` | `b3981c470e22…` | `c5acf79c8795…` | Browserlauf heute | browser-workspace-read.mjs, 14.11.2026, 4 Checks und 20 Negativsitzungen, bestanden; Beleg evidence/workspace-read-2026-10-28/browser-workspace-read.json bindet die aktuellen Bytes |
| `evidence/consent-ui-2026-10-28/browser-consent-ui.json` | `526072b3bf9d…` | `211fdb1a68e5…` | Browserlauf heute | heute neu erhobener Consent-UI-Lauf (18 Checks, bestanden); alte Fassung in superseded/ |
| `evidence/workspace-read-2026-10-28/browser-workspace-read.json` | `c974a0a1e593…` | `8f6e1bdc142d…` | Browserlauf heute | heute neu erhobener Workspace-Read-Lauf (4 Checks, bestanden); alte Fassung in superseded/ |
| `apps/site/scripts/build-standalone.mjs` | `4cbd29d0f417…` | `4111301d0d2f…` | grüner Test heute | node --test apps/site/tests/standalone.test.mjs: 12 von 12 (führt das Skript aus); realer Standalone-Build Exit 0; Schritt keyboard_skip_link_preserves_standalone_product_hash_route des Critical-Laufs bestanden |
| `apps/site/tests/standalone.test.mjs` | `71db343e65de…` | `83d15f20906a…` | grüner Test heute | node --test in apps/site: 132 von 132, darin diese Datei 12 von 12 |
| `apps/site/tests/public-installation.test.mjs` | `5ba8acfc2a5a…` | `58d24504a122…` | grüner Test heute | node --test in apps/site: 132 von 132 |
| `apps/site/src/public-installation.mjs` | `b2e4c8753a71…` | `b9356fa2927b…` | grüner Test heute | von public-installation.test.mjs importiert und ausgeführt (Status registered_offline_notice geprüft); 132 von 132 |
| `apps/site/pwa/worker.js` | `2057580e9296…` | `e9c41e62481b…` | grüner Test heute | pwa-offline-worker.test.mjs und tests.test_public_surface_contract lesen und prüfen die Datei (nur install/fetch, kein Cache); beide grün |
| `apps/web/auth/tests/public-experience.test.mjs` | `bae306a95122…` | `d057cd534279…` | grüner Test heute | node --test apps/web/auth/tests/*.test.mjs: 68 von 68 |
| `tests/test_public_surface_contract.py` | `6b69cfde2ad8…` | `22e6a7da7cb7…` | grüner Test heute | unittest tests.test_public_surface_contract: OK |
| `tools/check_text_resize_evidence.py` | `b47f96459d18…` | `c3ab15236117…` | grüner Test heute | tests.test_public_surface_contract importiert und führt check_resize aus (OK); Diff seit Pin: 2 Zeilen, nur der Belegpfad als Konstante |
| `tests/test_identity_hero.py` | `976035c6fbd2…` | `8bc3926b3c25…` | grüner Test heute | unittest tests.test_identity_hero: OK |
| `config/page-explainers.json` | `5155527ac0ce…` | `16c308f422bf…` | grüner Test heute | public-video-assets.test.mjs liest die Datei (132 von 132 in apps/site); Inhaltsurteil REC-CONTENT-01 bleibt offen |
| `config/page-media-registry.json` | `f3fae02c19ba…` | `3613fbbb8c46…` | grüner Test heute | public-video-assets.test.mjs liest die Datei (132 von 132 in apps/site); Inhaltsurteil REC-MEDIA-01 bleibt offen |
| `apps/agent-gateway/server.py` | `3fa30a1d01d9…` | `31a2715e0dbe…` | grüner Test heute | unittest tests.test_native_chat und tests.test_gateway_integrations starten den Server und prüfen den Idempotency-Key (OK) |
| `package.json` | `106a40555352…` | `657b2ddf9b9a…` | geprüfter Diff | Diff seit Pin 281c5d4 geprüft: ein npm-Skript export:gesamtprojekt ergänzt (73ae263), sonst nichts; kein Anforderungsinhalt |


Zwei Pins (`build-standalone.mjs`, `standalone.test.mjs`) waren vor dieser Arbeit gültig und sind durch die Nachführung neu gesetzt.

## 5. Bewusst nicht nachgezogene Pins (30)

Vorher 42 veraltete Pins, nachher 30. Davon ist einer neu offen (`browser-public-experience.mjs`, heute geändert, Lauf nicht bestanden).

| Datei | Pin (unverändert) | heutige Bytes | Grund |
|---|---|---|---|
| `AGENTS.md` | `9e47cdb53b8a…` | `ce618eac3b21…` | Diff seit Pin (0421415) ist eine Führungsentscheidung des Inhabers (Auslieferung nur über Vercel). Das ist Anforderungsinhalt und kein reiner Verweis; kein Test prüft den Text. |
| `apps/site/src/Auth.tsx` | `7c95609969ff…` | `3158116c240a…` | D-011: nur mit einem bestandenen Lauf, der die Datei heute bindet. Der Critical-Lauf bindet sie und ist nicht bestanden. |
| `apps/site/tests/browser-pwa.mjs` | `229eef780923…` | `4b8cf39e9711…` | Harness war nicht Teil der zwölf Läufe; kein heutiger Lauf. |
| `apps/site/tests/browser-text-spacing.mjs` | `bfa4ae535778…` | `2410bd6af797…` | Harness heute nachgeführt, Lauf nicht bestanden (27 Befunde bei 200 % Schrift). |
| `apps/web/components/HomeContent.tsx` | `adf9b8495833…` | `a68ae947c71f…` | Gebunden nur von nicht bestandenen Läufen (Critical, Identity-Hero, Text-Spacing). tests.test_identity_hero prüft lediglich, was nicht enthalten ist; das trägt keinen Pin. |
| `apps/web/components/Workspace.tsx` | `b1160ea73b58…` | `fc5001eaa2f3…` | Gebunden nur von nicht bestandenen Läufen (Critical, Public-Fallbacks, Text-Spacing). |
| `apps/web/components/WorkspaceRebuild.css` | `591308b86d91…` | `94676651dc31…` | Gebunden nur von nicht bestandenen Läufen (Critical, Identity-Hero, Text-Spacing). |
| `config/design-tokens.json` | `1482e2fa0e40…` | `4c53dbb24c48…` | Gestaltungswerte (478 neue Zeilen seit Pin). Alle Browserläufe, die die Datei binden, sind heute nicht bestanden. Die grünen Tests belegen nur, dass die erzeugten Dateien zur Quelle passen. |
| `config/presenter-system.json` | `971f562fff93…` | `ef50e53f523c…` | D-011: nur mit einem bestandenen Lauf, der die Datei heute bindet. Keiner der vier bestandenen Läufe bindet sie. |
| `config/site-map.json` | `6fbbbf4a5365…` | `3a4e4f4c8cfe…` | Seit Pin Produktname (b3d485d), Rechtsform (b403cf2) und Inhalte (f173054) geändert. Gebunden vom nicht bestandenen Critical-Lauf; die grünen Tests prüfen Struktur, nicht diese Inhalte. |
| `skills-lock.json` | `6ee354fd704b…` | `00ba9ea69b9a…` | Diff seit Pin (276e6e0): neue Fähigkeit eingetragen und bei neun Einträgen die Prüfsumme geleert. Das ist kein Diff ohne Inhalt, siehe Befund 5. |
| `tests/test_resize_source_binding.py` | `20bbdf26a7ca…` | `4c9f3d648cc8…` | Test ist rot, weil der Text-Spacing-Beleg fehlt. |
| `requirements-image.txt` | `4d76d84ff2a0…` | `261c2981ef43…` | Diff seit Pin (268fee9): Pillow 12.3.0 auf 13.0.0. Kein Test bindet die Datei; mit 13.0.0 scheitern 59 Tests, siehe Befund 4. |
| `apps/web/auth/tests/browser-public-experience.mjs` | `17cfd1c25cdc…` | `e47ea46cbdec…` | Harness heute nachgeführt, Lauf nicht bestanden (Titel auf /anmelden und /registrieren). Dieser Pin war vorher gültig und ist durch die Nachführung neu offen. |
| `apps/web/package.json` | `868230c51557…` | `96eba9a2e9f9…` | Diff seit Pin (fb17a0d): Cloudflare-Skripte und zwei neue Entwicklungsabhängigkeiten. Abhängigkeitswechsel ohne Prüfung der Herkunft; zudem vom nicht bestandenen Ausnahme-Lauf gebunden. |
| `apps/web/app/layout.tsx` | `4dacaac6a22c…` | `9145770986ae…` | Gebunden vom nicht bestandenen Public-Experience-Lauf. |
| `apps/web/app/anmelden/[[...sign-in]]/page.tsx` | `ae015545eb91…` | `5ec6891c8e77…` | Trägt den heute gemeldeten Fehler (Titel fest deutsch); gebunden vom nicht bestandenen Public-Experience-Lauf. |
| `apps/web/app/registrieren/[[...sign-up]]/page.tsx` | `ed41b40219ce…` | `31f2799aa370…` | wie die Anmeldeseite. |
| `apps/web/components/OracleCompanion.tsx` | `945f8b24097f…` | `a7df5b002b3e…` | Gebunden nur vom nicht bestandenen Critical-Lauf. |
| `apps/web/components/PublicOrientationChat.tsx` | `8ce9cb97ace8…` | `9b93ced471b0…` | Gebunden nur von nicht bestandenen Läufen (Critical, Ausnahmeerfassung); der Chat ist Gegenstand der offenen Entscheidung 1. |
| `apps/web/components/PublicRequestFallback.tsx` | `19c334e0ef95…` | `bca6e33f32e4…` | Diff seit Pin (b403cf2) entfernt die Rechtsform „B.V.“ aus dem Hinweistext (de, nl, fr, en); gebunden nur von nicht bestandenen Läufen (Critical, Public-Fallbacks). |
| `tools/check_browser_evidence.py` | `f6ec11afa854…` | `9bff179fac64…` | Der zugehörige Test tests.test_browser_evidence ist nicht vollständig grün (14 offene Fälle). |
| `apps/site/tests/browser-critical.mjs` | `0d333f2eb200…` | `0874617adc51…` | Lauf nicht bestanden (SDK-Chat-Prüfungen, offene Entscheidung 1). |
| `apps/web/components/IdentityHero.css` | `73037a5ff7d5…` | `3e99cd9c9232…` | wie IdentityHero.tsx. |
| `packages/tokens/tokens.json` | `5b9a4eb32842…` | `d216f3727bd6…` | Aus design-tokens.json erzeugt; bleibt zusammen mit der Quelle offen. |
| `apps/web/components/IdentityHero.tsx` | `36a88332e22e…` | `6fbfcfc52fe5…` | tests.test_identity_hero ist grün und liest die Datei, aber der zugehörige Browserlauf meldet heute einen Befund genau in diesem Baustein. Bewusst nicht über die schwächere Belegart gezogen. |
| `packages/tokens/tokens.ts` | `5294aa6ed39b…` | `d39dbab00922…` | Aus design-tokens.json erzeugt; bleibt zusammen mit der Quelle offen. |
| `apps/site/tests/browser-identity-hero.mjs` | `51ba02a106fe…` | `bba76d40f94b…` | Harness heute nachgeführt, Lauf nicht bestanden (Hero bei 200 % Schrift). |
| `packages/tokens/tokens.css` | `218355ed5fdd…` | `41037671e1e4…` | Aus design-tokens.json erzeugt; bleibt zusammen mit der Quelle offen. |
| `apps/shop-api/requirements.txt` | `15e850c9f224…` | `375cc4cefbf2…` | Diff seit Pin (454cd3e): dnspython 2.9.1 auf 2.9.2. Abhängigkeitswechsel ohne Test oder Prüfung der Herkunft. |

## 6. Befunde und offene Entscheidungen

### Befunde der Seite (gemeldet, nicht behoben)

1. **Überlauf bei 200 % Schrift, 1280 px, auf allen 27 NeXify-Seiten.** Gemessen im Text-Spacing-Lauf: Kopfleiste `.site-header` (909 px Platz, 964 px Inhalt), Gesprächsscheibe `.aifly-panel` (359 zu 558) und die Namenszeile `.nx-oracle-name.orientation-host-name` (199 zu 449); auf `/leistungen`, `/leistungsumfang` und `/loesungen` zusätzlich eine `h3`. Kein Überlauf des Dokuments, keine Laufzeitfehler. Die 16 TEILEKLAR-Seiten sind ohne Befund. Berührt WCAG 1.4.4.
2. **Hero der Startseite bei 200 % Schrift.** Der Lauf bricht beim ersten Zoom-Zustand ab (320 px, de). Im Diagnoselauf ist `scrollWidth` des Hero in allen 24 Zoom-Zuständen und beiden Renderern größer als `clientWidth` (zum Beispiel 365 zu 320 px). Ursache laut Diagnose ist das Lautstärkefeld des Films (`details.atelier-volume > div`, absolut positioniert). Im gemessenen Zustand ist das Feld geschlossen und unsichtbar; geöffnet reicht es bei 320 px über den Bildschirmrand (rechte Kante bei 376 px).
3. **Titel von `/anmelden` und `/registrieren` fest deutsch.** Seit `32616db` setzen beide Seiten den Titel fest auf „Anmelden · NeXify AI“ und „Konto erstellen · NeXify AI“, auch mit `?lang=nl`. Die Korrektur vom 09.11. (`4b17a64`, KS-015) ist damit rückgängig; der deutsche Titel weicht zudem vom Seitentitel in `config/site-map.json` ab.
4. **Pillow-Version widerspricht dem Werkzeug.** `requirements-image.txt` verlangt seit `268fee9` (PR 79) Pillow 13.0.0, `tools/product_image_batch.py` akzeptiert ausschließlich 12.3.0 (`unverified_pillow_version`). Mit 13.0.0 scheitern 59 Tests in `test_product_image_batch` und `test_birefnet_onnx`; mit 12.3.0 sind sie grün.
5. **`skills-lock.json` ohne Prüfsummen.** Seit `276e6e0` ist bei neun Einträgen `computedHash` leer.
6. **Installationsmanifest des Vite-Builds verweist auf `/signet.svg`.** Die Datei wird seit `32616db` nicht mehr ausgeliefert (`apps/site/pwa/plugin.mjs`); `public-installation.test.mjs` schreibt den Verweis fest.
7. **Standalone-Vorschau zeigt Markenbilder nicht.** Die Datei verweist auf 18 Bilder unter `/media/…`, die nicht eingebettet sind und unter der Richtlinie `img-src data:` nicht laden. Bestand schon vor dieser Arbeit; das Build-Skript bettet nur die Bilder aus `presenter-artwork.json` und `editorial-art.json` ein.

### Offene Entscheidungen für den Inhaber

1. **Chat-Prüfungen im Critical-Lauf.** Drei Prüfungen laufen gegen `api/agent-chat.ts` (Chat ohne Sitzung, Abweisung unbekannter und privater Seitenbezüge mit erhaltenem Entwurf, Mobilbedienung). Der Chat nutzt seit D-010 `/api/chat`; dort wird der Seitenbezug nur auf seine Form geprüft (`safePagePath` in `apps/web/lib/chat-guidance.ts`), ein unbekannter oder privater Pfad wird nicht mit 422 abgewiesen. Für die zweite Prüfung gibt es heute keinen gleichwertigen Prüfpunkt. Zu entscheiden: Welche Eigenschaften soll der Chat-Beleg künftig sichern, und gegen welche Quellen wird er gebunden (Prüfer und Tests nennen heute die alten)?
2. **Aktions-Fallback (`browser-public-fallbacks.mjs`).** Im ausgelieferten Next-Stand gibt es seit `32616db` keine Sitzungsabfrage mehr (`gateway` nur im Entwicklungsmodus); die Fälle „Sitzung nicht verfügbar“ und „Funktionen abgeschaltet“ sind dort nicht mehr unterscheidbar, und der dritte Fall (nachgeladener Chat-Teil schlägt fehl) existiert nicht mehr. Der Prüfer verlangt aber genau diese Matrix mit Sitzungsstatus 204, 200 und 404. Beobachtet: Jede Aktion öffnet das Orientierungsgespräch, es entsteht keine Ansicht ohne Funktion. Zu entscheiden: neue Matrix für den Beleg, oder Stilllegung mit Ersatzprüfung.
3. **Fehlergrenze des Chats (`browser-exception-capture.mjs`).** `DeferredChatBoundary` fängt weiter Fehler beim Rendern des Chats, der Auslöser „Chat-Teil lädt nicht“ ist mit dem festen Import entfallen. Zu entscheiden: Fehlergrenze behalten und mit einem anderen, kontrolliert auslösbaren Fehler belegen, oder Prüfung und Grenze gemeinsam aufgeben. Die übrigen sieben Prüfungen des Skripts (Einwilligung, Schwärzung, Widerruf) hängen am selben Lauf.
4. **Befund 2 einordnen:** Gilt das unsichtbare, geschlossene Lautstärkefeld als Überlauf (dann Stil korrigieren), oder soll die Messung nur sichtbare Elemente zählen?
5. **`AGENTS.md`:** Der Pin bindet noch die Fassung vor der Führungsentscheidung vom 13.11. Bitte bestätigen, dann kann er nachgezogen werden.
6. **Playwright:** Beleg mit der festgelegten Version 1.65.0 wiederholen, sobald sie in der Laufumgebung vorliegt?

## 7. Gates vorher und nachher

| Gate | vorher (`origin/main` `ae85910`) | nachher |
|---|---|---|
| `python3 -m unittest discover -s tests` | 839 Tests, 133 Failures, 9 Errors (97 `test_browser_evidence`, 43 `test_requirements_reconciliation`, 2 `test_resize_source_binding`) | 839 Tests, 41 Failures, 6 Errors (14, 31, 2) |
| `make check` | Exit 0 | Exit 0 |
| `node tools/ds-audit-cli.js` | 0 Fehler, 0 Warnungen | 0 Fehler, 0 Warnungen |
| `node tools/lint.mjs` | 0 Diagnosen | 0 Diagnosen |
| `cd apps/site && node --test` | 132 von 132 | 132 von 132 |
| `node --test apps/web/auth/tests/*.test.mjs` | nicht erhoben | 68 von 68 |

Die Python-Zahlen gelten mit Pillow 12.3.0 und numpy 2.3.5. Die gemeinsame Testumgebung wurde während der Arbeit von anderer Seite neu aufgebaut und enthielt danach weder Pillow noch numpy; die Nachher-Zahl stammt deshalb aus einer eigenen Umgebung mit denselben Paketen. Mit Pillow 13.0.0 aus `requirements-image.txt` kommen 59 Fehlschläge hinzu (Befund 4).

Was rot bleibt: 14 Fälle in `test_browser_evidence` (Critical-Beleg, Public-Fallbacks, Ausnahmeerfassung, Next-Teil der Consent-Kette), 30 veraltete Pins und die daraus folgende Ansicht in `test_requirements_reconciliation`, 2 Fälle in `test_resize_source_binding`.

`python3 tools/verify_requirements_reconciliation.py --render` meldet weiter 43 Zeilen „Stale implementation source“ und schreibt die Ansicht `docs/contracts/requirements-reconciliation.md` deshalb nicht neu (das Werkzeug rendert nur bei gültigem Register). Die Ansicht ist unverändert.

## 8. Nachtrag zweite Runde (14.11.2026, nach Merge von `main` `2d1eb69`)

`origin/main` wurde per Merge eingeholt (Commit `2647621`, ohne Konflikt). Vergleichsstand ist jetzt `main` `2d1eb69`.

### Belege und Pins auf dem zusammengeführten Stand

| Gegenstand | Feststellung | Maßnahme |
|---|---|---|
| `evidence/shop-ui-mock-2026-11-09/browser-shop.json`, `browser-catalog.json` | durch den Umbau der Shop-Komponenten (PR 144, PR 149) wieder veraltet (`CatalogView.tsx` und weitere) | beide Harnesses auf `2647621` neu gelaufen, beide bestanden (13 und 7 Checks); Belege übernommen, die Fassungen vom Vormittag liegen unter `superseded/*.pre-merge-main-2026-11-14.json`; `check_shop_ui_mock_evidence` und `check_catalog_ui_mock_evidence` bestehen |
| `browser-workspace-read.json`, `browser-consent-ui.json` | gebundene Quellen unverändert, Belege vom Vormittag (`88fa345`) gelten weiter | keine |
| 17 Pins aus Abschnitt 4 | alle weiterhin gültig | keine |
| `PROGRESS.md` | neu abweichend durch PR 148 | Pin `0f5dba1b114c…` auf `feb84890fe44…` nachgezogen. Belegart geprüfter Diff: 43 angefügte Zeilen, keine geänderte oder gelöschte; ausschließlich Standbericht und offene Arbeiten |

Die übrigen acht Läufe wurden in dieser Runde nicht wiederholt: An ihren Ursachen hat sich nichts geändert, weil die Seitenkorrekturen nicht eingecheckt werden konnten (siehe unten).

### Berichtigung zu Befund 2

Die Einordnung in Abschnitt 6 war falsch. Neu gemessen (Vite, Startseite, Chat geschlossen):

- Der Hero hat **bei jeder Schriftgröße** eine größere Scrollbreite als Breite (445 zu 390 px, 365 zu 320 px, 1642 zu 1440 px), auch bei 100 % und unabhängig vom Zustand des Lautstärkefelds.
- Ursache ist das Raumlicht hinter dem Film: `#atelier .home-concept .identity-hero .identity-scene::before` mit `inset:-18% -14% -22%` (`AtelierSystem.css`, seit `32616db`). Blendet man probeweise nur die Bühne aus, verschwindet der Überlauf; das Lautstärkefeld allein ändert nichts.
- Das geöffnete Lautstärkefeld liegt bei 320 px zwischen 32 und 232 px und damit im Bild, bei 100 % und bei 200 %. Die Angabe „rechte Kante bei 376 px“ gehörte zum geschlossenen, unsichtbaren Feld.
- Kein Überlauf des Dokuments; der Befund ist für Besucher nicht sichtbar. Er lässt aber den Identity-Hero-Lauf scheitern.

### Seitenkorrekturen: vorbereitet, nicht eingecheckt

Der Auftrag der zweiten Runde verlangt, die Befunde 1, 2, 3 und 6 an der Seite zu beheben. Der ursprüngliche Auftrag schloss Änderungen am Verhalten der Seite aus („Findest du einen echten Fehler der Seite, behebe ihn nicht“). Die Berechtigungsprüfung der Laufumgebung hat die Änderungen an App-Dateien deshalb zweimal abgelehnt. Die begonnenen Änderungen sind zurückgenommen; der Arbeitsstand enthält keine Änderung an `apps/web` oder `apps/site/pwa`. Es braucht die ausdrückliche Freigabe des Inhabers für diese Korrekturen.

Vorbereitet und gemessen, aber nicht eingecheckt:

| Befund | Vorschlag | Stand |
|---|---|---|
| 3 Titel `/anmelden`, `/registrieren` | den festen Titel entfernen, wieder nur `routeMetadata(...)` wie in `4b17a64`; Texte kommen dann sprachabhängig aus `config/site-map.json` | zwei Zeilen, nicht eingecheckt |
| 2 Hero-Scrollbreite | `#atelier .home-concept .identity-hero{overflow-x:clip}` direkt beim Raumlicht: seitlich gekappt, nach oben und unten unverändert; kein neuer Zahlenwert | eine Regel, nicht eingecheckt; Bildvergleich vorher/nachher steht aus |
| 1 Überlauf bei 200 % Schrift | nicht begonnen | offen |
| 6 Manifest-Verweis `/signet.svg` | auf `/brand/nexify-figur.png` (512 × 512, heute ausgeliefert) in `apps/site/pwa/plugin.mjs`, Test `public-installation.test.mjs` entsprechend | nicht begonnen |

Befunde 4 (Pillow), 5 (`skills-lock.json`) und 7 (Standalone-Vorschau) bleiben wie beschrieben dokumentiert.

`node tools/gleichmacher.mjs` und `node tools/live-check.mjs` wurden nicht ausgeführt, weil es keine Korrektur zu messen gab.

### Gates der zweiten Runde

| Gate | vorher (`main` `2d1eb69`) | nachher |
|---|---|---|
| `python3 -m unittest discover -s tests` | 839 Tests, 134 Failures, 9 Errors (97, 44, 2) | 839 Tests, 41 Failures, 6 Errors (14, 31, 2) |
| `make check` | nicht erhoben | Exit 0 |
| `node tools/ds-audit-cli.js` | nicht erhoben | 0 Fehler, 0 Warnungen |
| `node tools/lint.mjs` | nicht erhoben | 0 Diagnosen |
| `cd apps/site && node --test` | nicht erhoben | 132 von 132 |
| `node --test apps/web/auth/tests/*.test.mjs` | nicht erhoben | 89 von 89 |

Veraltete Pins: 43 auf `main`, 30 auf diesem Zweig (unverändert die Liste aus Abschnitt 5).

## 9. Nachtrag dritte Runde (14.11.2026, auf `main` `ba6606b`)

Anlass: PR 160 hat die Seitenbefunde 1 und 2 (Überlauf bei 200 % Schrift, Hero-Scrollbreite) behoben. Der Text-Spacing-Beleg wurde deshalb auf aktuellem `main` neu erhoben.

### Lauf

`node tests/browser-text-spacing.mjs` (Chromium, Vite-Entwicklungsserver, Berichtspfad außerhalb des Repositorys) endete mit Exit 0: `{"checks":129,"issues":[]}`. Der Bericht hat `completed: true`, `runtime_errors: []` und 43 Routen; seine Quellbindung stimmt mit `tools/check_text_resize_evidence.source_hashes(root)` überein (in Python gegengeprüft). Belegart: gemessener, quellgebundener Browserlauf.

Die Fassung vom 10.11. liegt unverändert unter `evidence/resize-2026-11-10/superseded/text-spacing.pre-neupruefung-2026-11-14b.json`; der neue Bericht steht unter `evidence/resize-2026-11-10/text-spacing.json`.

### Nachgezogene Pins (2)

| Datei | Pin alt | Pin neu | Belegart |
|---|---|---|---|
| `apps/site/tests/browser-text-spacing.mjs` | `bfa4ae535778…` | `2410bd6af797…` | bestandener Browserlauf, der die Datei bindet |
| `tests/test_resize_source_binding.py` | `20bbdf26a7ca…` | `4c9f3d648cc8…` | grüner Test heute (`tests.test_resize_source_binding`: OK; der Beleg liegt wieder vor) |

### Nicht erneuert

Die Läufe Identity-Hero und Public-Experience bestehen ebenfalls; ihre Belege und Pins wurden in dieser Runde **nicht** erneuert. Critical, Public-Fallbacks und Ausnahmeerfassung bleiben offen wegen Entscheidungen des Inhabers (Abschnitt 6, Entscheidungen 1 bis 3). Keine weiteren Pins, keine Seiten- oder Quelldateien geändert.

## 10. Nachtrag vierte Runde (14.11.2026, Zweig `claude/pins-nach-159`, nach PR 159, 160 und 169)

Anlass: Nach dem Merge von PR 159 (`e0c7e38`) waren Quell-Pins veraltet, und `apps/web/auth/tests/browser-public-experience.mjs` prüfte die Filme der Inhaltsseiten an der Klasse `.scene-video`, die seit PR 159 nicht mehr gerendert wird. `tools/_update_register_shas.py` wurde nicht benutzt; jeder Pin ist einzeln mit seiner Belegart gesetzt.

### Rahmen

- Fester Commit aller Läufe: `c566216` (Harness-Nachführung `7ebb3d9`, darauf Merge von `main` `aceb6a7`). Node v22.23.4, Playwright **1.65.0** mit Chromium 158.0.8127.18 (die in `.github/evidence-runner/package.json` festgelegte Version, für diese Runde in der Laufumgebung nachinstalliert).
- Build für Public-Experience: `node apps/site/scripts/generate-public-data.mjs`, `pnpm --filter @nexify/web build` ohne Installationsschalter (der Lauf verlangt in dieser Betriebsart 404 für Manifest und Worker). Build für PWA, Gleichmacher und Live-Prüfung: beide `generate-public-data.mjs` und `next build` mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa`.

### Harness `browser-public-experience.mjs`

Bis PR 159 galt für `SceneVideo`: `preload="none"` und kein geladenes Medium vor dem Klick. Die Bedingung hing an `.scene-video` und traf seit PR 159 auf kein Element mehr zu; der Lauf wäre bestanden, ohne sie zu prüfen. Jetzt, am Baustein `AtelierFilm`, ohne dass eine bestehende Prüfung entfällt:

- Jeder Film außer dem selbst startenden Hero-Film der Startseite muss ein `AtelierFilm` sein (sonst scheitert der Lauf, statt die Prüfung still zu überspringen), trägt `preload="none"`, hat `readyState` 0, und seine Bytes werden vor dem Klick nicht angefordert.
- Bedienleiste: mindestens ein Schalter, jeder sichtbar, benannt und bedienbar; die Bedienelemente des Browsers bleiben aus.
- Untertitel: Eine Spur gibt es nur zusammen mit ihrem Schalter, und sie wird als WebVTT ausgeliefert; der Hero-Film der Startseite behält seine Spur.
- Start nur auf Klick, je Seite mit Film einmal (de): Der Abspielschalter startet den Film, erst dann werden die Bytes angefordert; der Ton ist mit einem Klick auf den Tonschalter erreichbar; kein anderer Film läuft mit an.

Abweichung von der Inhaberentscheidung vom 13.11.2026 (`docs/design/scene-videos-2026-11-13.md`), durch PR 159 entstanden und hier nur festgehalten, nicht bewertet:

| 13.11.2026 mit `SceneVideo` | seit PR 159 mit `AtelierFilm` | im Lauf |
|---|---|---|
| Ein Knopf „Video mit Ton abspielen“ startet den Film **mit Ton** | Der Abspielschalter startet **stumm**; Ton über den zweiten Schalter „Film mit Ton starten“ | gemessen auf 7 Seiten: nach dem Abspielschalter stumm, nach dem Tonschalter mit Ton (`films[].click`); verlangt wird nur, dass der Ton mit einem Klick erreichbar ist |
| nach dem Start die Bedienelemente des Browsers | eigene Bedienleiste, `controls` aus | geprüft |
| keine Untertitel (bewusste Abweichung von WCAG 1.2.2) | unverändert keine Spur auf Inhalts-, Galerie- und Kontofilmen | festgehalten (`films[].captions`), nicht verlangt |

Der Installationsmodus desselben Skripts (`TEST_PUBLIC_INSTALLATION=enabled`) erwartet weiter den Worker ohne Cache aus `apps/site`; seit PR 159 liefert `apps/web` einen eigenen Worker mit begrenztem Cache. Dieser Modus wurde nicht geändert und nicht ausgeführt; den heutigen Worker prüft `browser-pwa-offline.mjs`. Ob der alte Modus stillgelegt oder umgeschrieben wird, ist offen.

### Läufe am 14.11.2026 auf `c566216`

| Lauf | Ergebnis | Beleg |
|---|---|---|
| `browser-public-experience.mjs` | bestanden: 70 Routen, 10 private Hüllen, 20 Filmzeilen, 7 Klickproben, 0 Fremdanfragen, 0 Seitenfehler | übernommen nach `evidence/consent-ui-2026-10-28/next-public.json`; alte Fassung unter `superseded/next-public.pre-pins-nach-159-2026-11-14.json`; `check_consent_ui` besteht |
| `browser-text-spacing.mjs` | bestanden: `{"checks":129,"issues":[]}`, 43 Routen | übernommen nach `evidence/resize-2026-11-10/text-spacing.json`; alte Fassung unter `superseded/text-spacing.pre-pins-nach-159-2026-11-14.json`; `check_text_resize_evidence.py` besteht. Durch die Merges von `main` (PR 170 bis 173) wieder veraltet und auf `078bc31` neu erhoben, siehe „Nacharbeit nach unabhängiger Prüfung“ |
| `browser-pwa-offline.mjs` (Build mit `public-pwa`) | bestanden, 10 Schritte | kein Belegpfad im Repository vorgesehen; Ergebnis nur hier |
| `tools/gleichmacher.mjs` (lokaler Build) | 44 Seiten, 14 034 Vergleiche, 0 Abweichungen | nur hier |
| `tools/live-check.mjs` (lokaler Build) | 329 Prüfungen, 2 Befunde: `/api/shop/status` und `/api/shop/products` antworten lokal mit 404, weil kein Shop-Dienst läuft; keine PWA-Befunde | nur hier |
| `browser-exception-capture.mjs`, vite und next | **nicht bestanden**, unverändert in Schritt 4 (`.request-fallback` erscheint nicht; `.workspace-chat-modes` fehlt) | nicht übernommen; offene Entscheidung 3 aus Abschnitt 6 |

### Nachgezogene Pins (11)

Stand nach der Nacharbeit (unten): Die erste Fassung dieser Runde zog 16 Pins nach; fünf davon sind zurückgenommen und stehen jetzt unter „Bewusst nicht nachgezogen“.

| Datei | alter Pin | neuer Pin | Belegart | Beleg |
|---|---|---|---|---|
| `apps/web/auth/tests/browser-public-experience.mjs` | `17cfd1c25cdc…` | `a2a87a07ee3f…` | Browserlauf | eigener Lauf bestanden, bindet die Datei |
| `apps/web/app/layout.tsx` | `4dacaac6a22c…` | `ec2b970e0336…` | Browserlauf | Public-Experience-Lauf bindet die Datei |
| `apps/web/app/anmelden/[[...sign-in]]/page.tsx` | `ae015545eb91…` | `96462bb0686e…` | Browserlauf | wie oben; der Titel je Sprache wird im Lauf geprüft (Befund 3 ist behoben) |
| `apps/web/app/registrieren/[[...sign-up]]/page.tsx` | `ed41b40219ce…` | `fe10ab376d72…` | Browserlauf | wie oben |
| `evidence/consent-ui-2026-10-28/next-public.json` | `5cbe162f0071…` | `98c7f0da8cce…` | Browserlauf | neu erhobener Beleg |
| `apps/web/components/PublicInstallation.tsx` | `45040906aa1f…` | `d8f6a143d98c…` | Browserlauf | Text-Spacing-Lauf bindet die Datei (zuletzt bestanden auf `078bc31`, Bytes unverändert); zusätzlich ausgeübt: mit Schalter Manifestverweis und Worker-Registrierung (`browser-pwa-offline`), ohne Schalter kein Verweis und 404 (Public-Experience) |
| `apps/web/auth/tests/public-experience.test.mjs` | `d057cd534279…` | `7a9168978792…` | grüner Test | `node --test auth/tests/*.test.mjs`: 105 von 105 |
| `apps/web/scripts/generate-public-data.mjs` | `dca037e16f2c…` | `6b2453410744…` | grüner Test | von `public-experience.test.mjs` (`prepareInstallation`) und `pwa-worker.test.mjs` (`stampWorker`, `workerVersion`) importiert und ausgeführt; beide Builds Exit 0 |
| `apps/site/pwa/plugin.mjs` | `185be72f2873…` | `9e95bc41449b…` | grüner Test | `public-installation.test.mjs` führt das Plugin aus und prüft genau die geänderte Eigenschaft (Icon `/brand/nexify-figur.png`, Datei vorhanden); `cd apps/site && node --test`: 132 von 132 |
| `apps/site/tests/public-installation.test.mjs` | `58d24504a122…` | `51497cae7a9c…` | grüner Test | 132 von 132 |
| `config/page-media-registry.json` | `3613fbbb8c46…` | `c6f740ca020d…` | grüner Test | wie in Abschnitt 4: `public-video-assets.test.mjs` liest die Datei (132 von 132); das Inhaltsurteil REC-MEDIA-01 bleibt offen |

### Bewusst nicht nachgezogen (28)

| Datei | Grund |
|---|---|
| `docs/09-final/11-designsystem-definition.md` (`e214973b693b…`, heute `e43b1a694c96…`) | Diff seit Pin: ein Satz, der einen Gestaltungswert festlegt (enge Zeilenhöhe 1,12 statt 1,05). Das ist Anforderungsinhalt; kein Harness bindet das Dokument, kein Test liest den Satz. Der Gleichmacher bestätigt nur, dass alle Seiten denselben Wert tragen, nicht den Wert |
| `apps/web/app/sitemap.ts` (`1b0316a5fae3…`, heute `cdeb7bcabf0a…`) | seit `9f8ab46` drei Rechtsrouten ergänzt; kein Lauf und kein Test dieser Runde liest die Sitemap |
| `apps/web/components/HomeContent.tsx`, `IdentityHero.tsx`, `IdentityHero.css`, `WorkspaceRebuild.css`, `apps/site/tests/browser-identity-hero.mjs` | vom Text-Spacing-Lauf gebunden, aber der eigentlich zuständige Identity-Hero-Lauf wurde in dieser Runde nicht erhoben; die schwächere Bindung ersetzt ihn nicht |
| `apps/web/components/Workspace.tsx`, `PublicOrientationChat.tsx`, `OracleCompanion.tsx`, `PublicRequestFallback.tsx`, `apps/site/src/Auth.tsx`, `config/site-map.json`, `apps/site/tests/browser-critical.mjs`, `tools/check_browser_evidence.py` | hängen am Critical-, Fallback- oder Ausnahme-Lauf; offene Entscheidungen 1 bis 3 |
| `config/design-tokens.json` (`1482e2fa0e40…`, heute `0a7ab4ed0d4e…`), `packages/tokens/tokens.css` (`218355ed5fdd…`, heute `b15b16adbd33…`), `tokens.json` (`5b9a4eb32842…`, heute `4635c0bd8cc2…`), `tokens.ts` (`5294aa6ed39b…`, heute `8e10ae37b795…`) | zurückgenommen in der Nacharbeit. Der Text-Spacing-Lauf bindet die Dateien, aber auch `browser-identity-hero.mjs` und `browser-contrast-scope.mjs` binden sie, und beide sind in dieser Runde nicht gelaufen. Die Bindung an einen Lauf, der nur Textabstand und 200 % Textgröße misst, ersetzt die zuständigen Läufe nicht |
| `config/page-explainers.json` (`16c308f422bf…`, heute `967cccc90aba…`) | zurückgenommen in der Nacharbeit. `public-video-assets.test.mjs` prüft nur die Struktur der Datei, nicht die 185 seit dem Pin geänderten Textzeilen; ein grüner Test, der die geänderte Eigenschaft nicht prüft, trägt keinen Pin. REC-CONTENT-01 bleibt offen |
| `apps/site/tests/browser-pwa.mjs`, `config/presenter-system.json` | kein Lauf in dieser Runde |
| `PROGRESS.md`, `AGENTS.md` | führende Dokumente; `nexify-stand-halten` und offene Entscheidung 5 |
| `apps/web/package.json`, `apps/shop-api/requirements.txt`, `requirements-image.txt`, `skills-lock.json` | Abhängigkeitswechsel ohne geprüfte Herkunft, Befunde 4 und 5 |

### Belege der Ausnahmeerfassung nach PR 169

`evidence/observability-integration-2026-10-28/browser-exceptions-next.json` und `browser-exceptions-vite.json` binden unter `build_input_sha256` alle versionierten Dateien unter `config/` und damit auch `config/automation.json` (PR 169). Geprüft werden von `check_exception_evidence` nur die neun Quellen unter `source_sha256`; davon weichen `apps/web/package.json` und `pnpm-lock.yaml` schon seit vor dieser Runde ab. Beide Belege waren also bereits veraltet; PR 169 fügt keinen neuen roten Test hinzu (Namensvergleich `aceb6a7` gegen `1997ddc`: kein Unterschied in `test_browser_evidence`). `make check` und `make governance-check` enden mit Exit 0. Der Neulauf beider Oberflächen scheitert wie am Vormittag in Schritt 4; die Belege sind deshalb nicht erneuert, ihr Pin im Register zeigt unverändert auf die gespeicherten Bytes.

### Gates

| Gate | vorher | nachher (`c566216` mit dieser Runde) |
|---|---|---|
| `python3 -m unittest discover -s tests` | `aceb6a7`: 822 Tests, 49 Failures, 9 Errors (58 Namen). Berichtigung: Die erste Fassung nannte 50 Failures; gemessen sind 49 (nachgemessen in einem eigenen Worktree auf `aceb6a7`) | erste Fassung auf `c566216`: 822 Tests, 34 Failures, 6 Errors (40 Namen); neue Fehlschläge: keine; behoben: 18. Heutiger Stand: Tabelle in der Nacharbeit |
| davon | 14 `test_browser_evidence`, 39 `test_requirements_reconciliation`, 2 `test_resize_source_binding`, 3 Ladefehler (der Laufumgebung fehlen `fastapi`, `httpx`, `bson`) | 13, 24, 0, 3 |
| `make check`, `node tools/ds-audit-cli.js` | – | Exit 0; 0 Fehler, 0 Warnungen |
| `node tools/lint.mjs` | – | 0 Diagnosen |
| `cd apps/site && node --test` | – | 132 von 132 |
| `cd apps/web && node --test auth/tests/*.test.mjs` | – | 105 von 105 |

Veraltete Pins im Register: 38 vorher, 23 nach der ersten Fassung, 28 nach der Nacharbeit.

### Nacharbeit nach unabhängiger Prüfung (14.11.2026, `078bc31`)

Der unabhängige Prüfer hat drei Punkte beanstandet; sie sind hier behoben. `tools/_update_register_shas.py` wurde nicht benutzt.

Merge-Stände des Zweigs: `c566216` (mit `main` `aceb6a7`), Arbeitsstand `180866e`, danach `35acfa1` (Merge von `main` `31ccd6c`, PR 170 bis 172) und `078bc31` (Merge von `main` `a2917d2`, PR 173). PR 170 bis 173 ändern unter anderem `apps/web/components/AtelierSystem.css` und `PublicOrientationChat.tsx`; beide bindet der Text-Spacing-Beleg.

1. **Text-Spacing-Beleg neu erhoben.** Der Beleg vom Stand `c566216` band die alten Bytes von `AtelierSystem.css` und `PublicOrientationChat.tsx`; `test_current_report_has_exact_source_binding` und `test_css_script_new_source_and_uncompleted_report_fail_closed` waren dadurch wieder rot. Neuer Lauf von `apps/site/tests/browser-text-spacing.mjs` am festen Commit `078bc31` bei sauberem Arbeitsbaum: Node v22.23.4, Playwright 1.65.0 mit Chromium 158.0.8127.18, davor `node apps/site/scripts/generate-public-data.mjs` (43 Seiten) und `pnpm --filter @nexify/web build` (Exit 0). Der Harness startet seinen eigenen Vite-Server aus `apps/site`; den Next-Build liest er nicht. Ergebnis: bestanden, `{"checks":129,"issues":[]}`, 43 Routen, 173 gebundene Quellen, keine Laufzeitfehler. Übernommen nach `evidence/resize-2026-11-10/text-spacing.json`; die Fassung von `c566216` liegt unverändert unter `superseded/text-spacing.pre-pins-nach-159-merge-173-2026-11-14.json`. `python3 tools/check_text_resize_evidence.py` besteht (43 Routen).
2. **Fünf Pins zurückgenommen** auf den Wert von `aceb6a7`: `config/design-tokens.json`, `packages/tokens/tokens.css`, `tokens.json`, `tokens.ts`, `config/page-explainers.json`. Begründung in der Tabelle „Bewusst nicht nachgezogen“. `apps/web/components/PublicInstallation.tsx` bleibt nachgezogen: Der neue Text-Spacing-Lauf bindet die Datei und besteht.
3. **Vorher-Zahl berichtigt:** 49 Failures auf `aceb6a7`, nicht 50.

| Gate | `aceb6a7` | `078bc31` vor der Nacharbeit | `078bc31` mit der Nacharbeit |
|---|---|---|---|
| `python3 -m unittest discover -s tests` | 822 Tests, 49 Failures, 9 Errors (58 Namen) | 822 Tests, 34 Failures, 8 Errors (42 Namen) | 822 Tests, 39 Failures, 6 Errors (45 Namen) |
| davon `test_browser_evidence` / `test_requirements_reconciliation` / `test_resize_source_binding` / Ladefehler (`fastapi`, `httpx`, `bson`) | 14 / 39 / 2 / 3 | 13 / 24 / 2 / 3 | 13 / 29 / 0 / 3 |

Namensvergleich als Mengen: gegenüber `aceb6a7` kein neuer roter Test, 13 behoben. Gegenüber dem Stand vor der Nacharbeit sind die zwei Tests in `test_resize_source_binding` wieder grün; fünf Namen aus `test_recorded_source_hashes_match_actual_bytes` sind wieder rot, genau die fünf zurückgenommenen Pins. `make check`, `make governance-check`, `node tools/ds-audit-cli.js` und `node tools/lint.mjs` enden mit Exit 0; `cd apps/site && node --test` 132 von 132; `cd apps/web && node --test auth/tests/*.test.mjs` 105 von 105.

Nicht geprüft in der Nacharbeit: Public-Experience, PWA, Gleichmacher und Live-Prüfung wurden auf `078bc31` nicht wiederholt; `browser-identity-hero.mjs`, `browser-contrast-scope.mjs`, Critical und Ausnahmeerfassung sind weiter nicht gelaufen bzw. offen.

## 11. Nachtrag fünfte Runde (14.11.2026, Zweig `claude/anfrageweg-bindung`, nach PR 181)

PR 181 (`81b0ae9`, Kontaktformular meldet eine abgewiesene Anfrage ehrlich) hat drei Quellen der Resize-Bindung verändert, ohne den Beleg zu erneuern. `config/text-resize-sources.json` bindet die Verzeichnisse `apps/web/components` und `apps/web/lib` vollständig (Endungen `.tsx`, `.ts`, `.mjs`, `.css`, `.json`); `tools/check_text_resize_evidence.py`, `source_hashes` (Zeilen 25 bis 43) und der Vergleich in Zeile 50 verlangen die genaue Datei- und Byte-Menge.

| Datei | Abweichung durch PR 181 |
|---|---|
| `apps/web/components/ContactRequestForm.tsx` | Bytes geändert |
| `apps/web/lib/contact-copy.ts` | Bytes geändert |
| `apps/web/lib/contact-outcome.mjs` | neue Datei im gebundenen Verzeichnis |

Folge: `test_current_report_has_exact_source_binding` und `test_css_script_new_source_and_uncompleted_report_fail_closed` (`tests/test_resize_source_binding.py`) waren auf `main` wieder rot. Im Bericht zu PR 181 stand „kein neuer Name“; das war falsch. Die Vorher-Messung lief in einem Arbeitsbaum ohne `apps/site/.generated/public-site.json`, dort scheitern beide Tests schon am fehlenden Bestand, und der Unterschied blieb unsichtbar. Vor jeder Vorher-Messung gehört deshalb `node apps/site/scripts/generate-public-data.mjs` gelaufen.

Ein Verlegen von `contact-outcome.mjs` hätte nicht gereicht, weil auch die beiden geänderten Dateien gebunden sind. Deshalb neu erhoben:

- Lauf von `apps/site/tests/browser-text-spacing.mjs` am festen Commit `81b0ae9` bei sauberem Arbeitsbaum, Playwright 1.65.0, Chromium 158.0.8127.18: 129 Prüfungen, 43 Routen, 0 Befunde, keine Laufzeitfehler.
- Belegart: Browserlauf. Der Beleg bindet damit alle drei Dateien an ihren heutigen Stand.
- Vorige Fassung unverändert unter `evidence/resize-2026-11-10/superseded/text-spacing.pre-anfrageweg-2026-11-14.json`.

Python-Suite je Stand (Python 3.13.18, erzeugte Seitendaten vorhanden, ohne `.venv`), Namensvergleich. Die drei Vergleichsstände liefen in Wegwerf-Arbeitsbäumen ohne `node_modules`; dort ist zusätzlich `test_frontend_filters_images_and_shows_error_and_unknown_stock` (`test_product_presentation_integrity`) rot. Mit `node_modules` sind es je Stand ein Name weniger:

| Stand | rote Namen | davon `test_resize_source_binding` |
|---|---|---|
| `a8a5d66` | 46 | 0 |
| `0333c16` (PR 180) | 46 | 0 |
| `81b0ae9` (PR 181) | 48 | 2 |
| dieser Zweig (mit `node_modules`) | 45 | 0 |

Bewusst nicht nachgezogen: `apps/web/lib/contact-copy.ts` in `evidence/observability-integration-2026-10-28/browser-exceptions-next.json` und `browser-exceptions-vite.json`. Der zugehörige Lauf scheitert weiter in Schritt 4 (Abschnitt 10); `tools/check_browser_evidence.py` bleibt rot wie zuvor, erster Befund unverändert `apps/site/src/Auth.tsx`.
