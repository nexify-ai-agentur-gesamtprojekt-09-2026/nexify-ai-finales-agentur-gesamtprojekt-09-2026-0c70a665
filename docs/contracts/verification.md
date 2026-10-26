# Prüfnachweis · F-006 · 26.10.2026

Geprüfter Gegenstand ist der **vorgeschlagene API-/Auth-Vertrag aus den Referenzseiten**. Die Prüfung ist keine abgenommene Runtime, kein SSO-Nachweis und kein gestarteter Medienauftrag.

## Umfang

- 93 HTML-Dateien: 47 N1 und 46 N2; alle gegen getrackte HTML-Pfade und aktuelle SHA256 geprüft. 1.434 statisch beobachtete Aktionen, 60 Formulare, 68 API-Marker. Importierte/dynamisch erzeugte JavaScript-Funktionen sind dadurch nicht vollständig ausgeführt oder fachlich abgenommen.
- 63 aus Seitenzwecken abgeleitete Capabilities, 97 Zielpfade, 102 Operationen und 107 Schemas. Alle 102 Operationen sind mit dem lesbaren Operationsregister abgeglichen. Reine Referenznavigation und Designsysteme erhalten keinen erfundenen Runtimeendpunkt.
- Exakte Nutzerzuordnung für NeX/AIFly/Nutzer in `hero-media.json` und drei noch nicht eingereichten Skript-/Szenenentwürfen. Null Providerjobs, null generierte Audio-/Videodateien, keine Veröffentlichung.

## Verfahren und Belege

`make verify-feature F=F-006` führt drei geordnete Layer aus: Audit/JSON, Quellen-/Policyvalidator mit Vertragsgegenproben, Repository-E2E und Architekturregeln. Featurestatus wird ausschließlich durch den Harness aufgezeichnet. Die abschließenden tatsächlichen Ausgaben liegen außerhalb des Checkouts in `/workspace/.onboarding/N1-contract-feature.log` und `N1-contract-final-check.log`.

17 Vertragsprüfungen umfassen die unveränderte Ausgangsdatei sowie negative Änderungen: unerwartet öffentliche Fachoperation, CSRF allein, Browserwrite ohne CSRF, Gastcapability für Projektwrites, umbenannte/transportgeänderte Credentials, API-Key außerhalb der Inferenzgrenze, fehlende Tenant-/Deny-Policy, fehlender Replayvertrag, Quellenhashdrift, ausgelassene neue HTML-Datei, Pfad-/Symlinkausbruch, verwaiste Referenz und gefälschte Abdeckung. Die medienbezogenen Proben verwenden die tatsächlichen Muster aller vier Artefaktschemas.

Zusätzlich `openapi-spec-validator==0.7.2`, isoliert mit den in `requirements-contract.txt` gebundenen Abhängigkeiten: `factory.openapi.json: OK`. Das Schemawerkzeug ist keine neue Anwendungslaufzeit. Log: `/workspace/.onboarding/N1-contract-formal.log`.

## Getrennte Gegenprüfung und korrigierte Findings

Seitenkatalog und API-Vertrag wurden getrennt erstellt. Ein weiterer Prüfer untersuchte Auth-/Scope-/Gast-/RLS-Grenzen und den Vertragsvalidator; ein anderer prüfte die Medienbindungen und Artefaktschemas. Zentrale Steuerung implementierte den Validator und koordinierte die Korrekturen. Diese Rollenprüfungen ersetzen weder das konfigurierte Live-Reviewergate noch eine Betreiberabnahme.

1. CSRF allein, privilegierte Gastcapability und umbenannte Inferenzcredentials konnten den ersten Validator passieren. Jetzt sind exakt geprüfte Credentialfamilien, Transport und Kombinationen gebunden; alle drei Angriffe werden abgewiesen.
2. Quellenasset/Hash waren unabhängig optional; Rechtebelege durften leer sein. Gegenseitige Schemaabhängigkeit und nichtleere Belege ergänzt. Fehlender Quellclip bleibt für autorisierte Neuerstellung nach Bestandsabgleich zulässig.
3. Das öffentliche Medienobjekt konnte die zugesagten Playerartefakte nicht ausliefern. Version, eigene Rendition-/Poster-/Caption-/Transkriptreferenzen und Hashbindungen ergänzt; Voice-ID-/Providergeheimnisse bleiben ausgeschlossen.
4. Der erste relative Medienpfad erlaubte WHATWG-Normalisierung zu einer fremden Origin über Backslashes/Steuerzeichen. Alle vier Artefaktschemas begrenzen nun auf das eigene `/media/`-Namespace mit ASCII-Segmenten. Unabhängig mit JSON-Schema und ECMAScript/WHATWG geprüft: regulärer eigener Pfad gültig, Fremdhost-/Backslash-/Kontrollzeichen-/Traversal-/Prozentkodierungsfälle ungültig. Permanente Gegenproben unter ARCH-005.
5. Nicht belegte Seitenabläufe wurden ausdrücklich abgegrenzt: anonymer Cookiebanner bleibt lokal ohne Login; öffentlicher Companion braucht eigenen BFF; nutzloser API-Key-Usagescope entfernt; anfängliche MFA-Challenge ist kein privilegierter Access-Token. Gastretouren/Widerruf ohne Konto und die Pool-/DB-Identitätsbrücke bleiben konkrete Launchblocker.

Nachkontrollen melden keine weiteren blockierenden Befunde **für diesen vorgeschlagenen Vertragsschnitt**. Daraus folgt keine Freigabe der noch fehlenden Laufzeit oder eines Gastverkaufs.

## Arbeitsbewertung nach Evaluator-Rubric

Technische Arbeitsbewertung der zentralen Steuerung, keine unabhängige Produktabnahme: Korrektheit A für den begrenzten Vertragsschnitt und dessen ehrliche Statusführung; Architekturtreue A; Testabdeckung B (statischer Vertrag mit Negativproben, Runtime ausdrücklich offen); Verifikationsevidenz A durch Harness-/Schema-/Quellenbelege. Für die Gesamtplattform ist daraus keine Note oder Fertigstellung ableitbar.
