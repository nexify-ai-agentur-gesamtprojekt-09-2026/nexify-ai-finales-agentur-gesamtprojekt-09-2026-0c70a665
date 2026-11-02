# Home · Detailpass und Videowiedergabe · 02.11.2026

Autorisierung: Pascal bestätigt die Home als richtige Richtung und beauftragt
Detailverfeinerung; währenddessen meldet er ein hängendes Video. Scope bleibt
dieselbe eigentümerprivate Sites-Ausgabe. Basis 24aa8b0.

Konkreter Fehler: Nach manuellem Start setzte der bisherige Pointerhandler
`manual=true`. Der Sichtbarkeitsbeobachter pausierte beim Herausscrollen, konnte
beim Zurückscrollen wegen dieses Flags aber nicht mehr starten. Die neue
Benutzerabsicht unterscheidet ausdrücklich gewähltes Pausieren von temporärem
Sichtbarkeitspausieren. Letzteres kann wiederaufnehmen, ersteres bleibt pausiert.
Ein neu gestarteter anderer Film kann weiterhin die Wiedergabe stoppen.

Ladepausen erhalten einen sichtbaren Status. Der bestehende stumme 10s-Film
spielt weiterhin einmal ab, zeigt am Ende jedoch „Erneut abspielen“ samt
passender Aktion. Native 1920×1080-H264-Datei, Tonstatus und Montage bleiben
unverändert. Kein neuer Sprecherfilm und keine Endlosschleife. Metadaten werden
für den Hero vorgeladen. Ein gescheiterter Film kann manuell neu geladen werden.

Gestaltung: Home-Lesetext 15px, Detailtext 14px, saubere SVG-Aktionspfeile,
abgestimmte Fokus-/Hoverzustände, feine Materialkante und Abschnittstrenner,
ruhige Zahlenausrichtung. Mobile Videosteuerung 48×48px im Bild; keine zusätzliche
schwarze Leiste. Wettbewerbs-Einstiegspreise tragen nun ausdrücklich „ab“ bzw.
die entsprechende Übersetzung. Keine Preisänderung.

Geprüft: Vite-/TypeScript-Build, 118 Site-Tests und make check grün. Tatsächliches
lokales Browserplayback bis zum natürlichen Ende, Wiederstart, manuelle Pause,
Scroll-Pause/Wiederaufnahme sowie künstlich verzögerte lokale Medienantwort mit
Ladeanzeige und anschließend echtem Decoding. Bericht und reproduzierbarer Test:
`home-playback-polish-2026-11-02.json` und
`apps/site/tests/browser-atelier-playback.mjs`. Fünf Layoutbreiten 320–1440px,
Seitenleiste, vier Sprachen, Tastatur und Budgetrechner erneut bestanden;
`home-detail-qa-2026-11-02.json`. Keine JavaScript-Seitenfehler im Browserlauf.

Die gesamte historische Python-Suite bleibt mit 697 Tests, 59 Failures,
10 Errors, 11 Skips rot, wie der zuvor geprüfte Ausgangsstand. Keine alten
Gesamtnachweise nachträglich umgeschrieben. Bekannte Node-/pnpm- und
Bundlegrößenwarnungen bleiben. Kein physischer Safari-/Geräte-/Tonbeleg und
keine neue Backend- oder Gesamtplattformabnahme.
