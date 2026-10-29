# Lokale Konsolidierung mit aktuellem Main

Ausgangspunkte: geprüfter Kandidat2c24073 (PaketVersion5), lesendes Evidenzdelta
e69a689 und der tatsächlich gelesene Main2a552ed6319c21332d7c2957d3d757b99c187910.
Gemeinsamer Vorfahr a19cd503. Neuer eigener Worktree/Zweig
integration/current-main-2026-10-27; frühere lokale Lieferung bleibt als Rückweg.
Keine Remoteänderung oder Veröffentlichung.

Vier Konflikte wurden inhaltlich aufgelöst: Auth.tsx, main.tsx, auth.test.mjs
und Browser-Evidenz. Der neue AccountControl-Slot aus Main bleibt erhalten und
führt zum bestehenden lokalisierten route-lokalen Konto-/An-/Abmeldeweg.
Die öffentliche Shell erhält keinen globalen SDK-/Suspense-Lebenszyklus.
Vorher unabhängig geprüfte ErrorBoundary, DE/NL/FR, Logout-Fehlerzustände und
unveränderte Entwürfe bleiben erhalten. Der Header behauptet keinen bekannten
Sitzungsstatus und enthält keinen sitzungsabhängigen UserButton. Eine reale
Session-/Tenantintegration ist dadurch nicht nachgewiesen oder aktiviert.

Mains strengere MCP-Discovery-/Factory-Verträge, native Kontonavigation,
ESM-Deklaration und Quellenanforderungen für Browserbelege werden übernommen.
Die zusätzliche Browserprüfung aktiviert den Headerlink und beide Authrouten
bei deaktivierter Auth. Alle kritischen UI-/SDK-Nachweise werden tatsächlich
neu ausgeführt; alte JSON-Hashes ersetzen keinen Browserlauf.

Selfservice-Trial, Merchant-/Reservierungsbindung, SEO-Atomizität und lokaler
persistenter Controller bleiben Bestandteil des integrierten Kandidaten.
Funding-/Tenant-/Providergrenzen werden durch Main-Übernahme nicht gelockert.
Bestehende Feature-Pass-Einträge aus Main bleiben zeitgebundene lokale Nachweise;
kein Feld wird als Produktions-/Gesamtabnahme interpretiert.

Die frische Runtime-Lesung zeigt weiterhin zwei unterschiedliche veröffentlichte
Stände: nexifyai.de Preview66866298 und Standard-Production-Alias main2a552ed.
Der lokal zusammengeführte Kandidat ist keiner dieser Deployments. Gewünschte
finale Domainzuordnung, reale Auth/Adapter-/Brain-/Restoreabnahme, qualifizierte
Accessibility und reale Zielmessungen bleiben nach acceptance-decisions.md offen.

Unabhängige Prüfung dieses Integrationsschritts erfolgt durch GPT-6.1 Sol gemäß
Nutzerkostenvorgabe; Astra wurde nicht eingesetzt. Ein zweiter Agent ersetzt
keine qualifizierte menschliche oder andere Modellgewichte verlangende Freigabe.

Rückweg vor Veröffentlichung: bestehenden Worktree/PaketVersion5 behalten und
neuen Integrationskandidaten isoliert verwerfen oder in anderem lokalen Zweig
prüfen. Keine Datenmigration, Domain-/Alias-/Sicherheitsänderung oder externer
Schreibübergang erfolgte. Kein freigegebener Geschäftsabschluss wird aus einem
lokalen Merge oder einer Übergabe abgeleitet.
