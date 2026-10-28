> Current scope addition: the final original also appears in explicitly declared still illustrations. The existing request-state chat behavior below is unchanged; see section-media-placement.md for the canonical identity/logo audit and placement. No video/sprite delivery is inferred.

# AI Fly Oracle · Chat-Companion

Begrenztes UI-Delta auf Basis5828c14,27.10.2026. Keine neue Backendfähigkeit.

Die gemeinsame Workspace-Shell verwendet dasselbe OracleCompanion in Vite
und Next: im Chatkopf sowie im beschrifteten Wiederöffnen-Button. Nur die
Assistenzbezeichnung, deren Begrüßung und deren Nachrichtenabsender heißen
AI Fly Oracle. Produkt-, Rollen-, Seiten- und Videonamen werden nicht global
ersetzt. Die bestehenden Hinweise auf textgeführte Vorschau ohne Live-KI gelten.

## Original und Darstellung

Das ausdrücklich bestätigte Benutzeroriginal wird unverändert ausgeliefert:
512×512 RGBA,217874Bytes,SHA256
`9f705e5b1d1ef8b1024175617c5a18a63fd907eeef6049f9a328a073330f2f66`.
Herkunft und Chatumfang stehen in config/companion-avatar.json. Die öffentliche
URL enthält einen Hashpräfix; Librarymetadaten werden nicht an den Client
gebündelt. Kein Neu-Rendern, keine generative Änderung und kein Video-Keyframe.

Das Bild ist neben bereits benannter Überschrift/Steuerung dekorativ:
aria-hidden,leerer Alttext,kein zusätzlicher Fokus und keine Live-Region.
Object-fit contain erhält die vollständige Figur. Der vorhandene Layoutplatz
bleibt erhalten;keine Text-/Buttonüberdeckung oder eigene Oberfläche.

## Bewegung und Status

Eine180ms-Transformtransition neigt die Figur beim tatsächlichen lokalen
Arbeits-/Übertragungsstatus geringfügig. Kein Timer und keine Schleifenanimation.
Die öffentliche SDK-Orientierung meldet submitted/streaming an die gemeinsame
Shell;Cleanup,Abschluss und Fehler setzen den Zustand zurück. Andere
Entwurfswerkzeuge verwenden ihren bestehenden Requeststatus. Das ist weder
Provider-Health noch eine Live-KI-Zusage. Reduced-Motion unterbindet sowohl
Transformation als auch Transition,auch während einer Anfrage.

## Prüfung und Abnahmegrenzen

Der fokussierte Browserfall verwendet ausschließlich eine gehaltene synthetische
Anfrage:working→503→idle mit erhaltener Eingabe.320/390/1280Pixel jeweils mit
und ohne Reduced-Motion,Originalhash nach HTTP-Lesen,Geometrie,Tastatur und
Browser-Accessibility-Snapshot werden geprüft. Der zuerst beobachtete
Reduced-Motion-Spezifitätsfehler ist durch eine gleich spezifische Regel behoben.
Screenshots bleiben ausschließlich in lokaler interner QA,ohne Library-/Provider-
Upload. Accessibility-Snapshot ist keine qualifizierte Assistenztechnik-Abnahme.

Die Figur ist ein CSS-bewegter Chat-Companion,kein fertiger animierter Film.
Hero,vorhandene Videos,Stimmenfreigabe,Runway-Budget,Clerk-Credentials,
Mandantenrechte und Produktionskonfiguration bleiben außerhalb dieses Deltas.
Rückweg:den isolierten UI-Commit revertieren;keine Datenmigration oder externe
Mutation erforderlich. REA/Review müssen den exakten Quellstand benennen.
# Standalone-Konfigurationsdelta 28.10.2026

Der ursprüngliche Companion war in der Standalone-Einbettungsliste nicht enthalten.
Ein frischer Offline-Build reproduzierte `naturalWidth:0`. Der Builder bettet nun
dieselben unveränderten Originalbytes als PNG-Daten-URL ein; keine CSP-Änderung.
Regressionen prüfen Bytegleichheit, fehlende Quelldatei und tatsächliches
512×512-Decoding im Datei-Browser. Diese lokale Offline-Korrektur liefert weder
ein Video noch eine Produktionsauslieferung.
