# 0013 – Portable React-Ausgabe und Vorschau

Der Nutzer verlangt eine wiederverwendbare React-Oberfläche mit Vercel als
Hauptbetrieb und einem synchronen Backup auf der bisherigen ChatGPT-Oberfläche.
Die öffentliche Ausgabe wird deshalb mit React/Vite unter `apps/site` gebaut.
Next.js erlaubt ebenfalls React-Komponentenwiederverwendung; es wird hier wegen
der gewünschten portablen Ausgabe als aktiver Hauptbuild abgelöst, nicht wegen
einer technischen Unvereinbarkeit mit React.

Die vorhandenen Komponenten, Übersetzungen und Tokens werden gemeinsam genutzt;
Navigation erhält einen kleinen Routeradapter. Next-spezifische APIs bleiben in
der erhaltenen Bridge. Eine gesonderte Datenprojektion nimmt ausschließlich die
35 freigegebenen öffentlichen Seiten auf; private Seitenmetadaten, Konfiguration
und Secrets gehören nicht in die statische Ausgabe. Die 10 privaten Zielbereiche
werden dadurch nicht öffentlich implementiert oder freigeschaltet.

Keine unverifizierte Client-Session als Portalautorisierung behandeln. Die
Clerk-Integration bleibt zunächst in der Next-Referenz, während die portable
Vorschau fehlende Anmeldung klar kennzeichnet. Ein eigener API-/OAuth-Dienst
bleibt unabhängig vom Frontend notwendig. Die bestehende lokale Besucher-API
kann in der Entwicklung verwendet werden; das ist keine produktive externe API.

Alle 93 Prototypquellen bleiben bytegenau erhalten. `0012-preview-coverage.md`
und `config/preview-coverage.json` erfassen die vollständige Inhaltsabnahme als
offen. Gemeinsame Komponenten und ein vereinheitlichter Seitenplan sind kein
Beleg, dass alle Quellfunktionen bereits umgesetzt wurden.

Release- und Hostinggrenzen: `docs/deployment/react-backup.md` und
`config/deployment-topology.json`. Eine lokal laufende Vorschau und eine
interaktive HTML-Datei sind getrennt von einer öffentlich erreichbaren
Vercel-Vorschau und einem tatsächlich synchronen ChatGPT-Deployment auszuweisen.
