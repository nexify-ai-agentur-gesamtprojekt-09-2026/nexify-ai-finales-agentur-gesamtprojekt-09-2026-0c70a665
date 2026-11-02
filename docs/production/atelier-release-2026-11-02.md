# NeXify Atelier: echte Filmproduktion · 02.11.2026

Aktueller Nutzerauftrag: filmischer Einstieg mit den drei Markenfiguren, synchroner Sprache/Geste und eine gemeinsame edle Glas-/Metallwelt in den darunterliegenden Bereichen. Keine erneute allgemeine Produktionsfreigabe nötig (AGENTS.md).

Ergebnis: vier neu erzeugte echte Videos, keine CSS-Animation von Standbildern. Alle Ausgabedateien vollständig mit ffmpeg decodiert; Metadaten und SHA-256 in `atelier-film-verification-2026-11-02.json`.

| Film | Ausgabe | Ton | Verwendung |
|---|---|---|---|
| Willkommen | 1920×1080, 10,1 s, H.264/AAC | native generierte deutsche Sprache | neue private Eigentümer-Produktionsvorschau im Hero |
| Webgestaltung | 1280×720, 10,083333 s | keine Audiospur | Home, Leistungen, Websites |
| Arbeitsabläufe | 1280×720, 10,083333 s | keine Audiospur | Home, Automatisierung, Apps/Portale, NeX2fly |
| Fahrzeugteile | 1280×720, 10,083333 s | keine Audiospur | Home, TEILEKLAR, Werkstatt, Partner |

Die Bereichsfilme basieren auf den bestehenden projektspezifischen Atelier-Referenzen. Je 5,041667 s tatsächliche generierte Kamerabewegung, dann spiegelbildlicher zeitlicher Rücklauf für einen ruhigen, positionsgleichen Loop. Diese redaktionellen Illustrationen sind keine echten Produktangebote und keine gesprochenen Modulfilme.

Hero: neue integrierte Atelier-Startszene aus dem vorhandenen NeXify-Trio-Master; alle drei Figuren bleiben präsent. Pascal spricht und gestikuliert innerhalb derselben generierten Aufnahme; Audio und Bild werden als eine MP4 abgespielt. Oracle bleibt ohne Mund. Die Stimme ist synthetisch und kein bestätigter Pascal-Stimmklon. Kein unabhängiger ASR-/Phonem-Synchronitätsnachweis, keine Behauptung pixelidentischer Gesichter. VTT-Zeitfenster an tatsächlich gemessene Sprach-/Pausenfenster angepasst; Wortlaut bleibt Produktionsvorgabe, keine unabhängige Transkription.

## Grenzen der Veröffentlichung

Der kurze neue Hero ist nur für die bereits eigentümerprivate Site vorgesehen und benötigt den expliziten Buildschalter `NEXIFY_OWNER_CINEMA_PREVIEW=1`. Ohne ihn bleibt die unveränderte Originalfiguren-Darstellung; ein vorhandenes geprüftes PublicVideo hat Vorrang. Der öffentliche Sprecherfilmvertrag `public-video-assets.mjs` und dessen Freigabebelege bleiben unberührt. Es wurden keine fiktiven Freigabereceipts erstellt. Keine automatische Freigabe zum Wechsel der Audience; die private Publikationsoperation erzwingt Eigentümerzugriff.

Die ältere 42–45-s-Begrüßung mit drei Sprechern und die gesamte Seiten-/Modulfilmproduktion bleiben offen. Drei Bereichsfilme ersetzen diese nicht. Keine Übernahme privater Musik-/Liebeslied-Assets aus dem verbundenen Medienkonto.

## Bedienung und Qualität

Stummer Start nur bei sichtbarer Fläche, ohne Reduced Motion und ohne Save-Data. preload=none für außerhalb des Sichtbereichs liegende Filme. Ton erst nach bewusstem Start; dieser startet die Begrüßung am Anfang. Pause, Verlassen des Sichtbereichs, verstecktes Dokument und Unmount stoppen Wiedergabe. Eigener Media-Wrapper hält Steuerung bei aufgeklapptem Transkript am Bild. Auf schmalen Ansichten stehen Hero-Steuerungen unter dem Bild und verdecken keine Füße. Erwartete AbortError beim bewussten Pausieren werden nicht als Filmdefekt angezeigt.

Verifikation: 87 Site-Unit-Tests und 5 Hero-Vertragstests bestanden; vollständiger Site-Build inkl. TypeScript bestanden. Bekannt bleiben Host-Node 24 gegenüber deklarierter Node 22 sowie Bundlewarnung über 500 kB. Alte globale Python-Suite bleibt gemäß vorigem Bericht rot, keine neue globale Vollabnahme behauptet. Desktop und CSS-Viewport-Frames 320/390/820 geprüft: kein Horizontalüberlauf; Control-Oberkante entspricht auf schmalen Ansichten exakt Video-Unterkante. Kein physischer Safari-/iPhone-Nachweis. Hero-Wiedergabe tatsächlich loaded/readyState4, Ende10,1s; Tonstart setzte Zeit zurück und zeigte laufenden unmuted Zustand. Chat-Code unverändert.
