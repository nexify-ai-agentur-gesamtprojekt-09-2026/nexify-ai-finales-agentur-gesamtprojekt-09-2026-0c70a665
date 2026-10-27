# Gemeinsame öffentliche Seiten in Next und Vite

Delta auf Basis 682d06f, 27.10.2026. Keine Produktionsfreigabe.

Beide Renderer verwenden `PublicExperience` und dieselbe durch
`generate-public-data.mjs` geprüfte öffentliche Projektion. Die 36 öffentlichen
Routen erhalten die bestehende Shell, Tokens, Navigation, Guide, 49 Erklärmodule
und die geprüften Videozuordnungen. Sechs Shoprouten binden das vorhandene
ShopPanel ein. Fehlende oder nicht freigegebene Filme bleiben nicht abspielbar.
Keine Medienproduktion und keine Freigabe werden dadurch ersetzt.

Next erzeugt diese Daten vor dev/build/typecheck. Der Routenkatalog benötigt
keine zur Laufzeit geratene Repositorydatei mehr. Browserzugriffe im ShopPanel
sind gegen serverseitiges Rendern abgesichert. Der öffentliche Next-Seitentitel
wird einmal aus der ausgewählten Inhaltssprache gerendert; die Vite-Ausgabe
behält ihren bestehenden Titelmechanismus.

## Installation und Offlinegrenze

Standardmäßig sind Manifest, Worker und Registrierung deaktiviert. Nur ein
lokaler Build mit `NEXIFY_PUBLIC_INSTALLATION=public-pwa` erzeugt die aktivierte
Next-Projektion. Manifest und Worker stammen aus derselben Quelle wie Vite;
Farben aus zentralen Tokens. Der Worker hat weder Fetch-Interception noch
CacheStorage, Hintergrundsync, Push, erzwungene Aktivierung oder Wiederholung
von Mutationen. Private/API/Auth-Antworten werden nicht offline gespeichert.
Ein erfolgreicher lokaler Opt-in-Test aktiviert keine Produktionsinstallation.

## Funktions- und Schutzgrenzen

Die zehn geschützten Routen und ihre serverseitigen Auth-/Membershipentscheidungen
bleiben unverändert. Ohne korrekte Providerkonfiguration wird 503 geliefert;
eine bestätigte Identität allein erteilt weiterhin keine Mandanten-/Rollenrechte.
Die geschützten Inhaltsmodule sind noch keine produktiven Portale.

Der Produktions-Geschäftsadapter fehlt weiterhin: die neue UI richtet weder
`/api/session` noch Warenkorb-, Fach- oder Tenant-APIs ein. Ein HTTP404 oder
nicht konfigurierter Katalog erzeugt keine Beispielartikel und keine Kaufbarkeit.
Clerk-Übertragung, kanonische Projektumschaltung, Team-/Domainänderung und
Providerfreigabe sind nicht Bestandteil dieses Deltas.

## Lokale Prüfung und Rückweg

`node apps/web/scripts/generate-public-data.mjs`, anschließend im Verzeichnis
`apps/web`: `node node_modules/next/dist/bin/next build`.
`node --test apps/web/auth/tests/*.test.mjs` prüft unter anderem den deaktivierten
Standard, explizites PWA-Opt-in und die öffentliche Allowlist trotz versehentlich
allowgelisteter privater IDs. `browser-public-experience.mjs` prüft den echten
lokalen Next-Produktionsbuild; synthetische Provideridentitäten werden nicht als
echte Anmeldung ausgegeben. Vorhandene Vite-, Warenkorb-/Katalog- und
Resizebelege werden nach Änderungen tatsächlich neu gemessen und quellgebunden.

Rückweg ist das Verwerfen/Revertieren dieses isolierten Branchdeltas. Kein
Main-Merge, Promote, Domainwechsel, Credentialtransfer oder Serverwrite wird
hier ausgelöst. Für einen Vergleichsbuild im kanonischen Vercel-Projekt müssen
Konfigurationsisolation und bestehende Team-/Autorrechte separat bewiesen sein.
