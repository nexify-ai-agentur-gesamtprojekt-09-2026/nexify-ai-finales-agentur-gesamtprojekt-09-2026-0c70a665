# V3 Revision 2 · P26.1 · Lokale Projektunterlagen

01.11.2026 · expliziter Startauftrag von Pascal, keine Scheduler-/Workeraktivierung.
Kanonische Basis: conflict_011126_0014@8fc8a3ba5ebeb72c6361a86b0bd9ebc118008859.
Planbaseline: NeXify – integrierter Gesamtplan v3 Revision 2,
Library libfile_90f7e11290f88191b9ad96c7cd8e62b1,
SHA-256 ee0c1e56457716022353f9d66c4b3e0baf49baad261a85e12544afdb5c956cfd.

## Sprintvertrag und Wirkung

Ziel: Dateien lokal bewusst auswählen, prüfen, einem benannten Projekt und Zweck
zuordnen und eine nachvollziehbare Dateiliste herunterladen. Ein Writer: diese
Codex-Sitzung, Arbeitszweig work/v3r2-p26-local-files. F-009 bleibt active;
unabhängiges Review und echte Browser-/Gesamtabnahme stehen aus.

P26 ist dadurch teilweise implementiert, nicht insgesamt abgeschlossen. P25,
Serverupload, persistente Projekte/Dateien, Originaldateiversionen auf dem Server,
Kundenrechte, Connector-Consent und Brain bleiben eigene nächste Schritte.
Es entsteht keine neue Datenbank, kein Tenantclaim, kein Versand und kein Worker.
Rückweg: den isolierten Commit nicht übernehmen oder gezielt revertieren; keine
Geschäftsdaten sind zu migrieren oder zurückzubuchen.

## Fachliche Kette und Quellen

REQ-P26-01: Revision-2-Aufbaukarte „Dateien/Projektübergabe“ → Projektbezeichnung
und Zweck → native Dateiauswahl → Prüfung → sichtbare Metadaten → expliziter Export.
REQ-P26-02: Original/Version/Hash → SHA-256 der unveränderten Bytes → identischer
Inhalt wird abgewiesen; gleicher Name mit anderem Inhalt bleibt ein Konflikt,
bis ausdrücklich eine zusätzliche Fassung gewählt wird. Beide Hashes bleiben
erhalten; additional_version_of bindet den Zusammenhang im Export.
REQ-P26-03: Statuswahrheit → vorbereitet ist weder hochgeladen noch autorisiert,
indexiert oder in einen Chat aufgenommen. Export enthält nur Metadaten.
REQ-P06-01: dieselbe Komponente im öffentlichen Assistenten und internen
Arbeitsplatz. DE/NL/FR/EN und vorhandene semantische CI-Tokens; keine neue Palette.
P15-Kundencenter erhält noch keinen ungeprüften Projekt- oder Speicheradapter.

Verbindliche Ergänzungen: docs/masterplan/NeXify-Masterplan-v2-2026-10-29.md,
config/source-boundaries.json, config/change-impact-policy.json, AGENTS.md und
skills/nexify-governed-delivery/SKILL.md. Fünf eigene Skillquellen verifiziert;
keine Originalskilländerung. Die allgemeine LLM-Konfiguration wurde geprüft,
aber für diese Funktion werden keinerlei Modellaufrufe verwendet.

## Verhalten und Grenzen

- Unterstützt: PNG/JPEG/WebP, PDF, UTF-8-TXT/Markdown/JSON. DOCX und weitere
  Formate benötigen einen eigenen geprüften Parser-/Previewvertrag.
- Maximal zehn Dateien, zehn MiB pro Datei und 25 MiB zusammen. Die gesamte
  Größenprüfung läuft vor dem Lesen. Namen, MIME und Signatur/UTF-8/JSON werden
  geprüft. Dies ist keine Malware-, PDF-Aktivinhalt- oder Bilddecoderfreigabe.
- Keine Ausführung oder HTML-Vorschau von Dokumentinhalten, kein iframe,
  keine automatischen Cloud-/Chat-/Indexaufrufe, keine Browserpersistenz.
- Abbruch und Unmount verwerfen spätere Ergebnisse aus einer alten Prüfung.
  Auswahl verwerfen löscht nur die flüchtigen Metadaten, keine Originaldateien.
- Projektbezeichnung ist ein lokales Label, keine bestätigte Projekt-ID und
  kein Berechtigungsbeleg. Serverseitige Übergabe verlangt echte Session,
  Membership, Projektbindung, Speicherrechte und exakten Inhaltsreadback.

## Ausgeführte Prüfungen

1. Acht Node-Verhaltenstests: echte Bytehashes, MIME-/Namens-/Formatnegative,
   Binärtext/JSON, Dubletten/Fassungskonflikt, Größenbudgets vor Lesen,
   Abbruch vor/während Lesen, fehlender Projektzweck und Inhaltslänge.
2. Strenger TypeScript-5.9.3-Check der neuen Komponente und Prüflogik: bestanden.
3. Isolierter Vite-8.3.5-Build der Originalkomponente: bestanden. Die übliche
   Clientdirektivenwarnung des separaten Bibliotheksbundles ist dokumentiert;
   kein vollständiger Next-/Vite-Anwendungsbuild daraus abgeleitet.
4. Zehn jsdom-27.0.1-Interaktionsprüfungen: vier Sprachen, Auswahl,
   Dublettenanzeige, Konflikt/Bestätigung, expliziter Metadatenexport und Verwerfen.
   DOM-Simulation, ausdrücklich kein echter Browser. Probequelle im Nachweisordner.
5. REA MCP 6.8.0: 229 Tools frisch entdeckt; Eingangsschemas vor Aufruf validiert;
   ausschließlich die TS-5.9.3-kompilierte eigene Prüflogik statisch analysiert.
   Vollständiges Evidenceobjekt aus get_evidence_bundle exakt verglichen.
   Endhash und Evidence-ID stehen in report.json. Kein Zielcode ausgeführt.

Der erste vollständige Readback mit einem Filter wurde von REA abgewiesen:
Filter sind nur bei summary erlaubt, obwohl das publizierte JSON-Schema diese
Kombination nicht ausschließt. Der Fehler wurde bewahrt, Argumente nach dem
konkreten Vertragsbefund korrigiert und der vollständige kanonische Bundleinhalt
verglichen. Kein Prozessbesitzschutz umgangen und kein Fehler als Erfolg gezählt.

Echte Browserprüfung blockiert: der verbundene Browser ist hier nicht verfügbar;
der Cloudbrowser meldet beim lokalen Testserver ERR_CONNECTION_REFUSED. Kein
alternativer Browser-/Netzwerkbypass. Mobile Geometrie, Zoom, Screenreader,
vollständige Einbettung und unabhängiges Review bleiben offen.

Die GitHub-Quelle wurde dateiweise in einer isolierten Teilkopie geprüft.
make check && make test des vollständigen kanonischen Repositories sind hier
nicht bestätigt: der Audit-Einstieg fehlt in dieser Teilkopie. Das ist kein
behaupteter Codefehler und kein grüner Gesamtbuild. Separat bestand der frisch
geladene, unveränderte Sites-V37-Quellstand seine eigene check/test-Kette
(251 Python- und 298 Node-Tests); dies wird nicht auf diesen Kandidaten übertragen.
Node lokal 24.22.1 statt der vorgesehenen vollständigen Projekttoolchain 22.23.4.

## Veröffentlichung und Übergabe

Eigener Arbeitszweig; main und conflict_011126_0014 bleiben erhalten. Seine
Vercel-Autoauslieferung wird allein für diesen neuen Zweignamen über
git.deploymentEnabled=false unterbunden; alle bisherigen Branchregeln,
Services, Header und Rewrites bleiben identisch. Der Checkpoint trägt [skip ci],
um keinen ungeprüften zusätzlichen Actions-/Providerlauf auszulösen.
Bestehende Workflows, Zeitpläne, Freigaben und öffentliche Domains unverändert.

Nächster ausführbarer Schritt: diesen Kandidaten in einem vollständigen,
authentifizierten Checkout mit der gepinnten Toolchain bauen, reale Browserfälle
und unabhängiges Review an genau diese Quellen binden. Danach P26.2:
tenantgebundener Upload-/Versionsadapter im vorhandenen Projektsystem, mit
Rechteprüfung, Quarantäne, exaktem Readback, Wiederaufnahme und Rückweg.
P25 benötigt weiterhin den gewählten und für Sites erlaubten Besucher-Connector.
Keine Betreiberkonten als Besucherkonten wiederverwenden.
