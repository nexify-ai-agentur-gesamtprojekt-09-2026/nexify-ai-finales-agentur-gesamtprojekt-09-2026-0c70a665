# Fehlerdiagnose-Auswahl innerhalb der bestehenden App

Basis b4ae9bc; neuer lokaler Folgestand, keine Veröffentlichung. Im Bestand gab es
Datenschutz-/Cookie-Verweise, aber keine Consentoberfläche. `DiagnosticConsent`
ergänzt deshalb genau den gemeinsamen SiteFooter von Vite/Next, keine zweite App.
Native Details, gleiche Outlinebuttons für Zulassen/Ablehnen, DE/NL/FR-Texte,
Tastatur/Fokus und mindestens44px. Der bestehende feste Chatlauncher überdeckte
bei320px den neuen Datenschutzlink: lokal reproduziert, durch begrenzte Clearance
und Scroll-Margin korrigiert. Keine Design-/Markenänderung.

Erfasst werden nur nach bewusster Auswahl die im vorhandenen Controller minimierten
Exceptiondaten. Informationen nennen Zweck,PostHog,technische Daten und unvermeidbare
Netzwerkdaten. Keine zusätzliche Pageview-,Marketing-,Replay- oder Identifikation.
Dieser Text ist Implementierung, keine rechtliche Zertifizierung oder Freigabe.
Die bestehenden Rechtstexte bleiben unverändert; zuständiger Produkt-/Datenschutz-
Owner muss Erklärung/Anbieter-/Verarbeitungsgrundlage vor Liveaktivierung abnehmen.

Zentraler Zustand pro Dokument, reaktiv via subscribe/useSyncExternalStore mit
stabilem SSR-Snapshot. Default unset/aus; Ablehnung bleibt änderbar und schränkt
Seitenfunktionen nicht ein. Zustimmung bedeutet nicht automatisch technische
Verfügbarkeit oder bestätigten Empfang. Fehlende Konfiguration und Ladefehler
haben eigene Zustände. Bei initialisiertem SDK ist die Diagnose aktiv, aber ein
Empfang wird nicht behauptet. Keine aktiven Health-/Testevents aus der Oberfläche.

Auswahl wird nicht gespeichert. SPA-Navigation und Sprachwechsel erhalten sie;
Reload setzt sie auf aus. Widerruf nach Zustimmung ist endgültig für das Dokument,
auch wenn SDK-Laden noch läuft oder Konfiguration fehlt. Ein spät geladener SDK-
Import darf danach nicht initialisieren. Schon vorhandenes Fetchsignal bleibt
abortiert; erneute Aktivierung/alteRetries/Unload bleiben blockiert. Erst echtes
Neuladen stellt einen frischen, zunächst ausgeschalteten Controller her.

Tests:18 lokale UI-Fälle320/390/1280×DE/NL×konfiguriert/fehlenderProvider/SDK-Ladefehler.
Gleichwertige Auswahl,Keyboard,Datenschutznavigation,SPA-Zustand,Reload,fehlende
Persistenz,Erreichbarkeit und Widerruf. Tatsächliches gepinntes SDK wird zusätzlich
in Vite und Next über die Oberfläche aktiviert/widerrufen; alle Ingestionrequests
werden lokal abgefangen. Keine externen Ereignisse,Secretkonfiguration oder
Produktionsänderung. Echte Provider-/Rechts-/Releaseabnahme bleibt separat.

Zusätzlicher belegter Sprachfehler: deaktivierte Next-Anmelde-/Registrierungshinweise
waren trotz NL-Auswahl deutsch. Die Hinweise folgen jetzt derselben UI-Sprache.
Die zuvor fest deutsche Providerlokalisierung folgt ebenfalls der Shellsprache,
ohne Children/Sessionzustand neu zu mounten. Server-Readyguard und Membership-
Sperren bleiben unverändert. Öffentliche Providerprops werden weiterhin zuerst
serverseitig aufgelöst und explizit übergeben; keine Secrets. Diese Anpassung
wurde gegen die gepinnten Clerk7.9.20/shared4.41.1-Defaults geprüft, einschließlich
bestehender AutoProxysemantik,ohne Hosting-/Proxykonfiguration zu ändern. Provider-
Double und synthetische Konfigurationsregressionen sind kein echter Sign-in-Test.
