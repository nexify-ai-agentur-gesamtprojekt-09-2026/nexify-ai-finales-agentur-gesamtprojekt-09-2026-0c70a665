> Historical placement note: the owner's 28 October 19:47 correction supersedes the full-Hero placement below. The original reference and component are preserved, but the current regular Hero and two lower illustrations follow section-media-placement.md.

# Identity-Hero V1 · lokaler Integrationsschnitt

Basis `d92ee1b2bb4dcdfda9ac5fbd1978e8a2f53615f8`; abgeschlossener Mailteil bleibt
unverändert. Ein Webwriter, keine Mail-/Paperclip-/Serveränderung, kein Push oder
Rollout. Gestalterische Quelle ist die bereits lokal materialisierte private
Identity-HTML-Version1, SHA256
`87cce3dcfee53bc6573efe1ae81e76bdf80f81542f5e746448a96ed087057e0c`.
Die darin historischen Vorbehalte zur Designabnahme werden nicht als aktuelle
Nutzerentscheidung ausgegeben: Parent hat die ausdrückliche Annahme am28.10.
für die Bildzwischenlösung bis zu fertigen Videos übermittelt. Das erteilt keine
Produktions-/Providerfreigabe. Original-HTML unverändert außerhalb des Repos.

`IdentityHero` setzt die Komposition als gemeinsame React-Komponente um, kein
iframe, srcdoc, eigenständiger HTML-Import oder zweite App. Desktoppositionen,
Figurenmaßstab, gemeinsame Boden-/Wandbühne, Aufgabenpapier und Verbindungslinie
folgen der Referenz. Bei schmalem Inhaltscontainer stehen Text und Figuren
untereinander. Die reale Shell-/Geist-/Sprachintegration stapelt bis700px Inhaltsbreite
(statt650px im privaten Proof): die unabhängige Prüfung reproduzierte bei656px
eine kleine Text-/NeX-Überlappung. Beide Seiten der korrigierten Grenze werden
zusätzlich geprüft;320/390 und die1120px-Referenzkomposition bleiben erhalten.
Die Desktopbühne reserviert nun einen mit Textgröße wachsenden unteren Freiraum.
Bei200% Textvergrößerung wächst die Höhe mit, statt Text in die Figuren oder aus
dem versteckten Rand zu drücken; die normale1.6-Komposition bleibt als bevorzugte
Mindesthöhe erhalten. Mittlere Container dürfen schon ohne Zoom höher wachsen;
diese Anpassung ist keine behauptete Pixelidentität zur privaten Studie. Mobile bleibt Text über Figuren im normalen Fluss.
Die drei Original-PNGs aus `config/interim-scene-images.json`
bleiben bytegleich; kein Filter, Farbwechsel, neuer Körper, Gesicht, Beschnitt
oder generatives Asset. Die vorhandene `PresenterScene` wird wiederverwendet.

Schrift, Abstände, Radien, Shell und Navigation bleiben im vorhandenen Token-
System. Die referenzierten Bühnenfarben ergänzen ausschließlich die zentrale
Tokenfamilie `color.identityScene`; keine bestehenden Tokenwerte werden verändert.
Fließtext auf der Bühne nutzt die vorhandene Szenentinte statt des gedämpften
Tons, damit er auch am Wand-/Bodenübergang ausreichend kontrastiert. Der kurze
Kicker bleibt auf der hellen Wand gedämpft. Die technischen Bild-/Identitätsnotizen aus dem privaten Proof sind keine
öffentliche Produktbeschreibung. Lokalisierte Storytexte behalten die Bedeutung
Verstehen → bewusst entscheiden → geordnet weiterarbeiten; die vorhandene
Unternehmensbeschreibung und Anfrageaktionen bleiben verfügbar. DE/NL/FR nutzen
dieselbe Komponente. Produktmarken werden nicht umbenannt.

Nur der bisherige Bildfallback des Home-Heros wird ersetzt. Ein tatsächlich
freigegebenes lokales Video behält den vorhandenen `isPublicVideo`-/Playerpfad;
offene Assets werden nicht zu Videos umetikettiert. Die49 redaktionellen Bildslots
anderer Module bleiben in diesem Schnitt unverändert. Keine Playbuttons oder
Audio-/Bewegungsversprechen für die statische Bühne. Hinweis auf ausstehende
Videos bleibt sichtbar; dekorative Storyobjekte sind für Assistenztechnik verborgen.

Lokale Prüfung: gleiche unveränderte PNG-Hashes über echte HTTP-Antworten,
proportionale vollständige Figuren, kein Text-/Figurenüberlappen, keine Überläufe,
320/390/Desktop, alle drei Sprachen, Seitenleiste offen/geschlossen, Reduced Motion,
Fokus/Anfrageaktionen und keine externen Requests oder Laufzeitfehler. Vite und
Next getrennt prüfen, keine Produktionsabnahme aus lokalen Screenshots. Die private
Referenz wurde technisch bereits separat gerendert; Integration ist keine
Behauptung pixelidentischer Gesamtscreenshots, da echte Shell, Schrift und
Produkttexte erhalten bleiben.

Reproduktion mit vorhandenen Node22-/pnpm-/Playwright-Werkzeugen:
`node packages/tokens/build-tokens.mjs`, `pnpm typecheck`,
`pnpm --filter @nexify/site build`,
`node apps/site/tests/browser-identity-hero.mjs`; nach Next-Build derselbe Test mit
`IDENTITY_RENDERER=next`. Bestehende quellgebundene Prüfbelege nach tatsächlichen
Läufen aktualisieren, niemals nur einen alten Bericht umhashen. REA analysiert
die konkreten JS/TS-Quellen mit vollständigem Evidence-Read-back; Sol prüft das
abgegrenzte Delta unabhängig. Kein Zertifizierungs-/Live-/Mail-/Videoabschluss.

Rückweg: erhaltenen Basiscommit d92ee1b auschecken oder den einzelnen Hero-Commit
reversieren. Keine Datenmigration oder Löschung; Mailcode und dessen Belege bleiben
erhalten. Die Paperclip-Postfach-Triage läuft laut Parent extern, ist kein
Schreibauftrag dieses lokalen Grafikschritts und wird weder gestartet noch verändert.
