# Aktueller Runtimeabgleich und nächster Integrationsschritt

Frische lesende Vercel-/GitHub-Evidenz: takeover-runtime-read.json, mit eigenem
UTC-Auslesezeitpunkt. Keine Remoteänderung. Lokaler geprüfter Kandidat bleibt
2c24073a373f02ffe6024ba2bb503cf2e02df9f5 / LibraryVersion5.

Der Standard-Production-Alias zeigt jetzt auf READY/production
2a552ed6319c21332d7c2957d3d757b99c187910 (main, MergePR39), Deployment
 dpl_4V5wejxZKiij1ZbniFkD5vCwUxLg. Die frühere Production-Zuordnung07833fb3
ist historisch, nicht mehr als aktueller Aliasstand zu verwenden.
nexifyai.de bleibt READY/Preview auf66866298b3eb4054371b0e2a1e1f618f1bc8ca73,
factory/agency-separated-2026-10-26, dpl_3KcSgJUsdNbsJjiWvR74Xf95SdFA.

Die aktuelle Projectantwort bestätigt Vite/Node22.x, liefert aber weiterhin keine
rootDirectory/buildCommand/outputDirectory/productionBranch-Felder. Die fehlenden
Felder werden weder aus historischen Settings noch aus Branchmetadaten ergänzt.
Gewünschte endgültige Domainzuordnung und reale Produktabnahme bleiben offen.

Die exakte GitHub-Datei apps/selfservice/domain.py auf main2a552ed enthält weiterhin
_funding in start_trial und nicht die lokalen Managed-Kaufsnapshot-/Start-Race-
Korrekturen des geprüften Pakets. tools/local_control.py und
config/acceptance-coverage.json antworten an diesem exakten Ref mit404.
Das belegt diese Quellpfade; es beweist keine aktive Ausführung eines Python-
Geschäftsbackends im Vite-Deployment und keine generelle Abwesenheit anderer
Controllerimplementierungen.

Die gelesene Domainquelle wurde vor dem lokalen Gegenversuch gegen die vom
Connector zurückgegebene Git-Blob-SHA1 geprüft. Ein vorhandener isolierter
Suite-Regressionstest scheitert mit genau explicit_validated_funding_required,
wenn er diese Remotequelle statt der lokalen Quelle lädt. Diese erwartete
Quellabweichung ist kein fehlgeschlagener Test des lokalen Kandidaten. Dieselben
sieben fokussierten lokalen Tests bestehen weiterhin. Keine echten Identitäten,
Zahlungen, Provideraufrufe oder Kundendaten wurden verwendet.

## Geschlossener nächster Schritt

Ownerbereich: D06 Entwicklung/Integration mit D07 unabhängiger Prüfung und
Releaseowner. Nötig ist ein separater lokaler Integrationskandidat auf dem
vollständigen aktuellen Main-Stand mit dokumentierter Übernahme der bereits
geprüften Fixes; anschließend gemeinsame Regressionen und unabhängige Abnahme.
Der öffentliche Git-Lesepfad war ohne neue Zugangsdaten erfolgreich. Der komplette
Main-Commitgraph ist nun lokal vorhanden; gemeinsamer Vorfahr ist a19cd503.
Die probeweise Dreiwegeintegration meldet vier Konfliktdateien: Auth.tsx,
main.tsx, auth.test.mjs und detail-browser-evidence.json. Diese müssen quellentreu
aufgelöst und insbesondere Auth-/Browser-/Evidenzprüfungen frisch ausgeführt werden.
Ein neuer lokaler Integrationsworktree erhält den bereits ausgelieferten Kandidaten.
Die Diagnose allein behauptet noch keinen bestandenen Integrationsbuild.

Danach bleiben die einzeln beschriebenen Identity-/Tenant-/Adapter-/Brain-/Restore-
und qualifizierten Accessibility-Gates erforderlich. Vorhandene Verbote für
Remote-Push, Deployment, Alias-/Sicherheitsänderungen und neue Kosten gelten
weiterhin. Ein bloßer lokaler oder dokumentarischer Abschluss ersetzt diese
Betriebsabnahmen nicht. Astra wurde für diesen Abgleich nicht eingesetzt.

Die bisherige LibraryVersion5 bleibt unverändert und bezeichnet ihren lokalen
Quellstand. Dieser neue Bericht ist ein lesendes Evidenzdelta, keine neue
Implementierungs- oder Produktionsfreigabe.
