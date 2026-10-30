# Apple-HIG-Review: NeXify Web-Chat und Bedienung

## Zusammenfassung

Der Apple Design Skill ist als versionierte Reviewquelle eingebunden, nicht als Browserbibliothek oder Apple-Oberfläche. Die NeXify-DNA bleibt erhalten: CI-Schriften, Graphit/Lime, kontrollierte Materialtiefe, 8px-Raster und eine ruhige Bühne. Kernauftrag des Chats: Anliegen aufnehmen, Antworten lesbar zeigen und den nächsten Schritt erreichbar halten.

Gesamtstand dieses Teilpakets: **Skill eingebunden, Chat-Browserlayout und Medienbedienung gezielt geprüft**. Vier Fenstergrößen (320×568, 390×844, 844×390, 1280×720) bestehen jeweils in Chromium und WebKit. Keine globale Safari-Geräte-, WCAG-, Rechts- oder Produktionsfreigabe; die alte Evidence-Regressionssuite ist weiterhin rot.

## Herkunft und Integrität

- Quelle: https://github.com/dickwu/apple-design-skill
- Commit: `ff4ebddf0488598723a82bfdce1afb04de0b1c44`
- Tree: `b5f0f99c6bc7d9d9388933f6aeafba843ebfbe7b`
- SHA-256 des unveränderten `git archive HEAD`: `fd3679dc057674be6336dfa5cac4e4b7d02c97046ade31731fe40616c7422935`
- Lokale Kopie: `.design-rules/apple-design/`; Agent-Einstieg in `/AGENTS.md`.
- Keine npm/npx-Installation, kein Submodule mit unklarer Checkout-Abhängigkeit, keine ausgeführten Upstream-Skripte, keine Runtime-/Netzwerkintegration.
- Originaldateien einschließlich Quellenhinweisen unverändert. Das Repository beansprucht keine Apple-Zugehörigkeit; Apple-Texte gehören Apple, nicht NeXify. Upstream enthält im README Herkunft/As-is-Hinweise, keine daraus abgeleitete neue Lizenzbehauptung.

## Tatsächlich gelesen

`SKILL.md`, Upstream-`AGENTS.md`, `references/cross-platform.md` sowie die zehn HIG-Seiten `accessibility`, `layout`, `typography`, `color`, `designing-for-ios`, `designing-for-macos`, `virtual-keyboards`, `text-fields`, `materials`, `motion` vollständig gelesen. Die übrigen Referenzen sind lokal vorhanden, nicht als vollständig geprüft deklariert. Ein Refresh der Apple-Seiten wurde nicht ausgeführt; Versionsquelle ist der gepinnte Upstream-Stand.

## Kritische Befunde und Umsetzung

### Chatproportionen / verfügbares Fenster
- **Was:** Vorher Chromium 1280×720: Verlauf ca. 94px, Eingabezone ca. 443px. Bei 844×390 lag Senden bei y≈685 außerhalb des Fensters. Quelle: `test_reports/chat_viewport_before.json`; mobile durch Debugöffnung erzwungene Zeilen sind keine Nutzerpfad-Abnahme.
- **Warum:** `layout.md › Visual hierarchy`: „Use progressive disclosure to make layouts cleaner and easier to interact with.“ `layout.md › Adaptability`: „Determine layout based on size classes, not device type or orientation.“
- **Fix:** Composer-Hinweise in ein natives Disclosure, Verlauf `flex:1 1 0%` und `min-height:0`, Eingabezone begrenzt scrollbar; derselbe Funktionsumfang bleibt erreichbar. Ziel bei 1280×720: Verlauf≥360px, Eingabezone≤260px.

### Tastatur / sichere sichtbare Höhe
- **Was:** Starre Viewport-/Inhaltshöhen passen nicht zuverlässig zu Browserleisten und virtueller Tastatur.
- **Warum:** `virtual-keyboards.md › Mobile (iOS, iPadOS)`: „keep important parts of your interface visible while the virtual keyboard is onscreen“. `layout.md › Guides and safe areas`: Bedienelemente dürfen nicht von Systemoberflächen verdeckt sein.
- **Fix:** Webübersetzung mit `visualViewport`-Messung, CSS-Variablen für Höhe/Offset, Safe-Area-Inset, `100dvh`-Fallback. Native Pinch-Vergrößerung bleibt unbeeinträchtigt; keine UA-spezifischen Geräteannahmen. Virtuelle Tastatur auf echtem iOS-Gerät bleibt gesonderter Nachweis.

### Textvergrößerung / Bedienelemente
- **Was:** Der REA-Bericht zeigte abgeschnittenes Senden bei 32px Text; weitere Transcript-/Diagnose-Controls waren 44px hoch.
- **Warum:** `typography.md › Supporting Dynamic Type`: „Make sure your app’s layout adapts to all font sizes.“ `accessibility.md › Mobility`: „Offer sufficiently sized controls.“
- **Fix:** Keine feste Buttonhöhe; natürliche Zeilenhöhe, Umbruch, 48px-NeXify-Mindestziel und erreichbare interne Scrollbereiche. 32px-Test ist eine Textsimulation, nicht als nativer Safari-Zoom auszugeben.

## Verbesserungen / Material und Bewegung

- **High:** Systempräferenzen prüfen. `accessibility.md › Cognitive`: „Be cautious with fast-moving and blinking animations.“ `motion.md › Best practices`: „Make motion optional.“ Vorhandene Reduced-Motion-Zweige beibehalten und Resize nicht animieren.
- **Medium:** `materials.md › Liquid Glass`: „Use Liquid Glass effects sparingly.“ Die Weboberfläche verwendet vorhandene, ruhige NeXify-Materialtokens; kein gestapeltes Apple-Liquid-Glass-Imitat. Für reduzierte Transparenz und mehr Kontrast werden opake vorhandene Markenflächen verwendet.
- **Messregel:** Textkontrast aus tatsächlichen Tokens berechnen (WCAG-Webgrenzen, nicht Apple-pt mit CSS-px gleichsetzen); keine Kontrastbewertung aus JPEG-Schätzung.

## Was erhalten bleibt

- NeXify-CI und lokale Schriften; kein SF-Font-Import oder Rebranding.
- Native Web-Disclosure, verständliche Beschriftungen, sichtbarer Fokus, Medien mit Start/Pause/Transkript.
- Unterscheidung Projektplanung / tatsächlich verfügbare Live-KI; kein Modellaufruf oder Versand allein durch die Skillinstallation.
- Keine Änderungen an Rechtsfakten, Preisen, externen Zugängen oder Videobudget.

## Prüfgrenzen

WebKit/Playwright ist eine Engineprüfung, keine vollständige macOS-/iOS-Safari-Abnahme. Der vorherige WebKit-Absturz wurde im Browser-Prozesslog auf den fehlenden GStreamer-Baustein `autoaudiosink` eingegrenzt. Nach Installation des Testcontainer-Pakets `gstreamer1.0-plugins-good` bestehen alle vier WebKit-Fälle. Die vorherige CSP-Hypothese war **nicht bestätigt**; CSP wurde nicht abgeschwächt. Reale iOS-Bildschirmtastatur und nativer Gerätezoom bleiben ungetestet.

Nachmessung (`test_reports/chat_fit_smoke.json`): acht von acht Browserfällen bestanden; bei 1280×720 ca. 418px Verlauf und 237px Composer; bei 320×568 liegt der Sender vollständig innerhalb 568px. Eine ausdrücklich injizierte 32px-Textsimulation in Chromium passt ohne Beschneiden; Entwürfe bleiben nach Schließen/Öffnen erhalten. Skill-Integrität umfasst **135 Originaldateien einschließlich `.github/FUNDING.yml`** und 124 HIG-Seiten (`tests/test_apple_design_skill.py`). Der erste Manifestentwurf ließ die Funding-Datei aus; der Abgleich wurde nach bytegenauer Prüfung gegen den gepinnten Upstream ergänzt, nicht die Datei entfernt.

Medienbedienung: 28 Range-/HTTP-Prüfungen für die Preview bestanden. Die lokale Preview-Auslieferung unterstützt jetzt GET-Bytebereiche (206/416) und HEAD; die Medienbytes sind unverändert. Reproduzierbare Helferfunktion: `apps/site/scripts/media-byte-range.mjs`. Der Adapter in `frontend/preview-server.mjs` ist umgebungslokal und **kein Nachweis einer Produktionsänderung**. Alle drei Schlussgrafiken wurden über den wirklichen Zeitregler erreicht und visuell geprüft, nicht durch manuelles Setzen interner Zustände.

Alte Evidence-Dateien oder fehlerhafte frühere PASS-Bewertungen sind keine Bestätigung des neuen Builds. Die Gesamt-Regressionssuite bleibt durch veraltete Quellen-/Nachweisbindungen blockiert; keine historischen Abnahmen wurden als aktuell umetikettiert. Installation bedeutet nicht globale Registrierung in allen externen Agentenclients; dieser Checkout wird über `AGENTS.md` angebunden.
