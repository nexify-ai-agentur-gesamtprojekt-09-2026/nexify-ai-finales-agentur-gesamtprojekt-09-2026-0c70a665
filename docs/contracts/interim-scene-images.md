# Bildzwischenlösung vor den Filmen

Direkte Nutzerentscheidung vom28.10.2026: zuerst vorhandene passende Szenenbilder,
anschließend Deployment-Codeprüfungen. Keine neue Mediengenerierung.

Die49Erklärslots auf36öffentlichenSeiten bleiben ihren Sprechern zugeordnet:
12Pascal,16NeX,21AI Fly Oracle. Gemeinsame `PresenterScene` in Vite/Next,
Kontext aus dem bestehenden Modultitel, Bildhinweis statt Wiedergabeversprechen,
lokalisierte Alttexte, contain und zentrale Tokens. Bei später tatsächlich
freigegebenem Video greift weiterhin die bestehende geprüfte Videoverzweigung.
Video-/Voice-/Providerfreigaben werden durch Bilder nicht erteilt.

Originale tatsächlich lokal materialisiert und angesehen; keine Pixeländerung:
- Pascal: Library `libfile_91e0f4ecdae48191a432ac1f55b7cac3`,1024×1536RGBA,
  SHA256 `6dd038343fe607eecbb50b68474c27d8f600d3343c20b6d6930d0e7f5e6e0b04`.
- NeX: Library `libfile_b3155f3741648191a3784fb436d8ca02`,1254×1254RGBA,
  SHA256 `121a804ca2647ad162cfc39a45e68d2682fdc57e09532b56b85038893e5d576d`.
- AI Fly Oracle: bestätigtes Original512×512RGBA,
  SHA256 `9f705e5b1d1ef8b1024175617c5a18a63fd907eeef6049f9a328a073330f2f66`.

Hashprüfung beim Generieren; fehlende/abweichende Dateien stoppen den Build.
Der Hero enthält dieselben drei Einzelreferenzen, keine alte Orb-Grafik.
Standalone erhält dieselben Bytes als Daten-URLs ohne CSPänderung. Alte Dateien
und Quellen bleiben für Rückkehr erhalten.

`browser-scene-images.mjs` prüft optimiertes Vite-HTML:36Routen×DE/NL×320/1280px,
HTTP-Bytehashes, Sprecher-/Titelzuordnung, tatsächliches Decoding, kein horizontaler
Überlauf, kein Video/Audio/Playbutton. Screenshots sind interne QA; keine Uploads.
Gemeinsamer Next-Build und geschlossene Portalpfade werden separat geprüft.
Das ist eine lokale Bildabnahme im begrenzten Umfang, keine Live-/Videoabnahme
oder qualifizierte Assistenztechnikprüfung.
