# Ausarbeitung des Grundentwurfs · 26.10.2026

Feature: F-007 (bestehende aktive Auslieferung; kein zusätzlicher Passingstatus).
Ziel: Den nur als Anfang angenommenen Entwurf in eine differenzierte öffentliche
Seitenstruktur mit überprüfbaren Folgewegen überführen.

Erfolgskriterien:

- Die drei Herofiguren werden auf schmalen und sehr breiten Bildschirmen
  vollständig eingepasst; Kopf und Füße bleiben sichtbar.
- Öffentliche Produkte, Leistungen, NeX2fly, Shop und Werkstatt sind direkt
  erreichbar; Navigations-, Brotkrumen- und Footerziele existieren tatsächlich.
- Bestehende Inhalte, Erklärmodule und Aktionen bleiben erhalten. Fachlich neue
  Abschnitte beziehen sich auf gelesene Originalquellen und aktuelle Nutzerregeln.
- Acht Seitenarten bekommen passende Leserführung; Texte bleiben auswählbar,
  Abschnitte per Tastatur erreichbar und die Offline-Hashnavigation funktioniert.
- Der Agentenbereich benennt die aktuelle öffentliche Seite, zeigt reale
  Angebotsdaten und unterscheidet lokale Werkzeuge von Live-Modell/Versand/Kalender.
- Neue Kontextdaten erweitern keine Rechte. Private/unbekannte Pfade, fremde
  Visitoren, CSRF-Verstöße und Payload-/Replaykonflikte werden abgewiesen.

Prüfkette: Typen/Build und Make-Audit, gezielte Contracts und negative
Gatewayfälle, lokale Browserprüfung Desktop/Mobil/Sprachen, unabhängige Prüfung,
Repository-E2E und Quellenintegrität. Die Prüfung ist keine DIN-/ISO-Zertifizierung
und keine Komplettabnahme noch fehlender Produktivadapter.

Vercel ist nach Nutzerbestätigung der aktuelle Live-Veröffentlichungsweg.
ChatGPT-Rendering und Backup-Synchronisierung blockieren diesen Weg nicht.
Marketingkampagnen, Mailings, Socialaktivierung und GEO werden nicht vorgezogen.
