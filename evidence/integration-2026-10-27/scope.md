# Lokaler Integrationsbeleg · 27.10.2026

Eigener Checkout /workspace/nexify-integration; lokaler Zweig
integration/consolidated-2026-10-27; Ausgangscommit
 a19cd5035d3809dedda94050486026ac0186662e aus dem autorisierten lokalen
nexify-kanonisch-Objektbestand. Keine Remotes im eigenen Clone.
Ursprüngliche Checkouts unverändert, keine zusätzlichen Repo-Worker beobachtet.

Regressionen zunächst am Ausgangscode ausgeführt: Selfservice drei unerwartet
zugelassene Bindungsänderungen und noch fehlende Snapshotspalte; SEO zwei
fehlgeschlagene Parallelitätsgegenproben. selfservice-before.txt und seo-before.txt
halten diese erwarteten roten Testläufe fest. Nach Korrektur bestehen 15
Selfservice-, 10 SEO- und 5 Workflow-Tests. Synthetische Identitäten und temporäre
SQLite-Datenbanken; keine echten Zahlungen oder Kundendaten. Der Legacytest
entfernt die Snapshotspalte ausschließlich aus seiner temporären Testdatenbank
und prüft ihre additive Wiederherstellung sowie Ausführungssperre und Storno.

Die erweiterten Klassen laufen auch über unittest discovery in make test.
Kein UI-Code geändert; vorhandene Design-Tokens, DE/NL/FR-Schlüsselsätze und
Tenant-/Rollenprüfungen bleiben Prüfgegenstand der vorhandenen Gates.
Keine Normzertifizierung oder vollständige fachliche Produktabnahme behauptet.

Offene Wirkungen und Zuständigkeiten:
- Brain: WRITE/INDEX/EXACT_READ_BACK/CONTENT_COMPARE nicht ausgeführt.
  Tatsächliche Projekt-/Tenant-/Zielbindung und funktionierender autorisierter
  Connector fehlen hier. Parent meldete list_projects-Fehler; nicht lokal erneut
  geprüft. Zuständig: Projektowner für Zielbindung, Integrationsoperator für Beleg.
- Spiegelrichtung: widersprüchliche historische Vorgaben nicht extern geprüft.
  Keine Mirror-Konfiguration geändert. Zuständig: Projektowner mit aktuellem
  GitHub/GitLab-Readback vor jedem späteren Remote-Schreibauftrag.
- Small-Business: lokales verify meldet Source unavailable: LICENSE, actions_executed=0.
  Gepinnter Katalog 1.35.1/33d3dea41a341b341d4f5da2e8801ae0c89be2b8 ist vorhanden,
  Quellcache nicht vollständig zugänglich. Kein belegter installierter Skillcount.
  Hinweis des Parent auf README mit 15 Grundlagen + 15 Workflows + Router ist
  ein separater Versionsabgleich, kein hier geprüfter Bestand. Lokaler Operator
  benötigt den passenden autorisierten Quellcache vor load smb-router.
- Produktabnahme: unabhängige Gegenprüfung, echte fachliche Liveabläufe,
  Produktions-Restore/Rollback und tatsächliche Runtimebindungen bleiben offen.
  Kein Deployment, Push, Merge, Dienststopp oder externe Kostenänderung ausgeführt.
  Bestehende notwendige Dienste einschließlich Slack bleiben unangetastet.
- Konsolidierter Masterauftrag des Parent: noch nicht als Quelle eingegangen.
  Externe Dokumentationsseite hier nicht geprüft; kein Ausfall daraus abgeleitet.

Bewertung dieser lokalen Lieferung nach evaluator-rubric: Korrektheit A für
reproduzierte lokale Fehlerpfade, Architekturtreue B, Testabdeckung B,
Evidenz B. Selbstprüfung, keine unabhängige Produktionsabnahme.
