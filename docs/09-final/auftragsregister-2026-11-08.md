# Auftragsregister und Betriebsstand · 08.11.2026

## Fortschreibung 09.11.2026 · Unified Master-GOAL

Dieses Dokument bleibt das führende Aufgabenregister. Der folgende maschinenlesbare Block gehört zum selben Register; `ops/goal/STATE.json` enthält nur Laufzeitdaten des lokalen Fortsetzungsdienstes. Die private Sites-Version 6 (`2da8af1eed20bf57e56e0d34ccbdb3d31f9aa706`) zeigt den Hero-Film im oberen Bereich und den rechts integrierten Chat. Die Creative-Factory-Korrektur wird für die nächste private Version umgesetzt. Build, Typecheck, Design-Audit und gezielte Browserprüfungen bestanden lokal. Die öffentliche Freigabe, formale Identitäts-/Audio-/Untertitelprüfung und Gesamtprodukt-Abnahme sind offen. Rückweg ist die private Sites-Version 4.

Die frühere `run.html` wurde als Gestaltungsreferenz, nicht als Laufzeitquelle verwendet. Das lokale Quellverzeichnis `/Users/gast/Documents/nexify-site-source-20261109` ist eine entpackte GitHub-Quelle ohne `.git`; Änderungen werden auf dem Draft-Branch `design/chat-orientation-2026-11-09` (PR 92) abgeglichen. Der Site-Auslieferungscheckout liegt separat unter `site-publish`. Ein lokaler Runner darf den Site-Auslieferungscheckout und fremde Mandanten nicht eigenständig schreiben.

### Designkorrektur · Creative Factory Excellence (09.11.2026)

Verbindliche Quelle: `docs/09-final/creative-factory-excellence-2026-11-09.md`, SHA-256 `7ed0599a46459fc4fd24af8d7a0f8e9c9f0a2530252e0a40982440509fd23c2f` (bytegleich zur angelieferten Datei). Vorrang für eine moderne AI-Factory-Ästhetik vor der konservativen Champagner-Interpretation; funktionale und Medienfreigaben bleiben bestehen. Die erste farbbetonte lokale Studie wurde vom Auftraggeber verworfen und nie veröffentlicht. Das neu abgeleitete Erlebnisziel ist in `docs/design/nexify-creative-experience-2026-11-09.md` festgehalten. Es umfasst die räumliche Startbühne und den realen Weg vom Oracle-Gespräch zur Anfrage.

### SUB-GOAL 10 · Growth & Product Factory (09.11.2026)

Verbindliche Quelle: `docs/09-final/master-goal-anhang-growth-product-factory-2026-11-09.md`, SHA-256 `91253ed01fd24648ec96edbf74c6777ec232707fbd0a6db354b005339f14a2c5` (bytegleich zur angelieferten Datei). Die bestehende Aufgabenwahrheit und Skill-Registry bleiben führend. Der öffentliche Chat kann derzeit ein bearbeitbares Briefing erzeugen und zum Kontaktformular führen; eine geprüfte durchgehende Strategie-/Options-/Preview-/Angebots-/CRM-Kette ist noch offen. ORACLE-/NeX-Runtime und Fachrollen sind als Zielbild zu prüfen, nicht als aktiv zu behaupten.

### SUB-GOAL 11 · Leadership, PMO und Agent Workforce (09.11.2026)

Verbindliche Quelle: `docs/09-final/master-goal-anhang-leadership-pmo-2026-11-09.md`, SHA-256 `ac483833f1478ec9efa6434d081070e2c8700f8fc4cc2b4471ca334bfe12e432` (bytegleich zur angelieferten Markdown-Datei). Sie erweitert dasselbe Master-GOAL; Site, Chat und Arbeitsplatz behalten Vorrang. Der aktuelle Chat erzeugt nur eine lokale Orientierung und ein Briefing. Eine persistente Kundenfall- und Worker-Orchestrierung sowie ein geprüfter Chat-zu-Lieferung-Pilot sind noch offen.

<!-- nexify-goal-tasks-json:start -->
```json
{
  "schema_version": 1,
  "goal_version": "2026-11-09-unified-master",
  "source_attachment": "/Users/gast/.codex/attachments/c417bef0-bf02-4f7e-beea-3fcdf44300c8/pasted-text-1.txt",
  "tasks": [
    {
      "id": "NX-UM-001",
      "sub_goal": "00",
      "title": "Quellbindung und private Site-Version 5 nachweisen",
      "priority": 1,
      "status": "REVIEW",
      "owner": "Pascal Courbois / Frontend",
      "writer": "Codex Hauptlauf",
      "scope": "GitHub Draft PR 92, private Sites-Version 5, Hero und Oracle-Chat",
      "paths": [
        "apps/web/components/IdentityHero.tsx",
        "apps/web/components/AtelierFilm.tsx",
        "apps/web/components/Workspace.tsx"
      ],
      "dependencies": [],
      "acceptance": "Remote-Commit, Browserbild, mobile Bedienung, Audio-Fallback und unabhängige Prüfung",
      "evidence": "Sites-Version 5, Commit 49f84db097544e96fcf54ca8a8b2d5d58838cd7a; lokale Browser-Screenshots /tmp/nexify-final-1440-4s.png und /tmp/nexify-final-390.png",
      "rollback": "Private Sites-Version 4 wiederherstellen; Originale erhalten",
      "next": "Unabhängige Prüfung und offene Medienfreigaben erfassen"
    },
    {
      "id": "NX-UM-002",
      "sub_goal": "01",
      "title": "Lokalen begrenzten Codex-Fortsetzungsdienst prüfen",
      "priority": 2,
      "status": "REVIEW",
      "owner": "Pascal Courbois / Betrieb",
      "writer": "Codex Hauptlauf",
      "scope": "Bestehendes Register, lokaler Runner und macOS LaunchAgent",
      "paths": [
        "docs/09-final/auftragsregister-2026-11-08.md",
        "tools/goal-runner.mjs",
        "ops/goal/STATE.json"
      ],
      "dependencies": [
        "NX-UM-001"
      ],
      "acceptance": "Lock, Begrenzung, Fehler- und Wiederaufnahmetest; echter nichtinteraktiver CLI-Start; LaunchAgent-Readback",
      "evidence": "Codex CLI 0.167.0; read-only exec und resume erfolgreich; Runner-Selbsttest Lock/Selection; echter CLI-Lauf NX-UM-003 mit Host-Build und Browserprüfungen; LaunchAgent com.nexify.codex-unified-goal geladen, kickstart rc=0 und SKIP no_ready_task",
      "rollback": "LaunchAgent deaktivieren; Runner und Protokolle versioniert behalten",
      "next": "Unabhängige Prüfung des Runners und dauerhafter Folgeläufe; nach Freigabe DONE"
    },
    {
      "id": "NX-UM-003",
      "sub_goal": "02-04",
      "title": "Videobedienung aus Pascals Gesichtsfeld lösen und Glas-Hero responsiv verfeinern",
      "priority": 3,
      "status": "REVIEW",
      "owner": "Pascal Courbois / Art Direction",
      "writer": "Lokaler Codex-Fortsetzungslauf",
      "scope": "Konkreter Live-Befund: bei 1265 px liegen Video-Controls über Pascals Gesicht. CSS-Korrektur in bestehendem Hero/Filmrahmen, 320/375/768/1024/1265/1440 px prüfen.",
      "paths": [
        "apps/web/components/AtelierFilm.css",
        "apps/web/components/IdentityHero.css",
        "apps/web/components/HomeConcept.css",
        "apps/web/components/WorkspaceRebuild.css"
      ],
      "dependencies": [],
      "acceptance": "Bedienelemente bleiben sichtbar und per Touch erreichbar, verdecken das Gesicht nicht, Build/Typecheck und Browser-Screenshots ohne Überlauf",
      "evidence": "CLI-Sitzung 01a1c24f-acfb-7d90-9d42-5ab70edda7a2; apps/web/components/AtelierFilm.css geändert; Host build:standalone, goal-capture before/after, browser-identity-hero und browser-video-hero alle rc=0; ops/goal/LOGS/runner-events.jsonl",
      "rollback": "Geänderte Dateien aus dem GitHub Draft-Branch vor dem Paket wiederherstellen",
      "next": "Unabhängige Sichtprüfung der Vorher-/Nachher-Bilder; danach CSS verfeinern und erneut testen",
      "require_source_change": true
    },
    {
      "id": "NX-UM-004",
      "sub_goal": "05-09",
      "title": "Seiten, Medien, Chat-Backend und Auslieferung paketweise vervollständigen",
      "priority": 4,
      "status": "TODO",
      "owner": "Fachowner je Paket",
      "writer": "Je Paket genau ein benannter Writer",
      "scope": "43 erfasste öffentliche Seiten, Video-Slot-Plan, echte Anfrage- und Backend-Wege",
      "paths": [
        "config/site-map.json",
        "docs/design/premium-video-slot-plan-2026-11-09.json"
      ],
      "dependencies": [
        "NX-UM-003"
      ],
      "acceptance": "Je Paket E2E-Test, unabhängiger Review, Quell- und Ziel-Readback",
      "evidence": "Offen; vorhandene Registerpunkte OF-01 bis OF-14 gelten weiter",
      "rollback": "Je Paket vorab festhalten",
      "next": "Nach NX-UM-003 in kleine fachliche Pakete aufteilen"
    },
    {
      "id": "NX-UM-010",
      "sub_goal": "10",
      "title": "Factory-Fachrollen auf vorhandene Skills und Werkzeuge abbilden",
      "priority": 4,
      "status": "BLOCKED",
      "owner": "Pascal Courbois / ORACLE-Rolle zu verifizieren",
      "writer": "Lokaler Codex-Fortsetzungslauf",
      "scope": "17 Fachfähigkeiten des Anhangs A gegen tatsächlich erreichbare Skills, Agenten, Tools und Workflows prüfen; nur geprüfte IST-Zuordnungen im bestehenden Skill-Register ergänzen; keine Installation oder Aktivitätsbehauptung",
      "paths": [
        "config/skills-register.json"
      ],
      "dependencies": [],
      "acceptance": "Für jede Rolle IST/FEHLT/UNGEPRÜFT mit exakter Fundstelle, Scope, Owner und Testgrenze; valides JSON; unabhängiges Review",
      "evidence": "Anhang A SHA-256 91253ed01fd24648ec96edbf74c6777ec232707fbd0a6db354b005339f14a2c5; bestehendes config/skills-register.json",
      "rollback": "Vorhash der Registry sichern; Änderung auf Draft-Branch rücknehmbar",
      "next": "Keine geforderte Quelländerung; kein Erfolg behaupten",
      "require_source_change": true
    },
    {
      "id": "NX-UM-011",
      "sub_goal": "02-04,06,10",
      "title": "Creative Experience: gemeinsame Startbühne und Oracle-Kundenweg",
      "priority": 1,
      "status": "RUNNING",
      "owner": "Pascal Courbois / Creative Direction",
      "writer": "Codex Hauptlauf",
      "scope": "Von Pascals tatsächlichem Zielbild abgeleitete räumliche Bühne, originale Startszene, integrierter Oracle-Arbeitsbereich und echter Briefing-zu-Anfrage-Weg. Verworfenes Cyan-Konzept nicht deployen.",
      "paths": [
        "docs/design/nexify-creative-experience-2026-11-09.md",
        "apps/web/components/IdentityHero.tsx",
        "apps/web/components/IdentityHero.css",
        "apps/web/components/HomeConcept.css",
        "apps/web/components/PublicOrientationChat.tsx",
        "apps/web/components/PublicOrientationChat.css",
        "apps/web/components/ContactRequestForm.tsx"
      ],
      "dependencies": [],
      "acceptance": "Build, Lint, Typecheck, Browser-Screenshots 320 bis 1440 px, Chat-Interaktion, Reduced Motion, unabhängiger Review, private Site-Readback",
      "evidence": "Design-Referenz-Lock und Nutzerfeedback; Soll-Design docs/design/nexify-soll-design-2026-11-10.md; lokale Builds mit Lint/Designaudit und vollständigen Typechecks bestanden; Browserprüfungen 320–1920 px, Oracle-Briefing und Videosteuerung bestanden; unabhängige Gegenprüfung PASS ausschließlich für private Designvorschau; Sites-Version 8, Commit 58c0b7d06b723374eb24adb876780166a590a225, Deployment appgdep_6af26100b0f08191805f515bab16a5bb succeeded, owner-only. GitHub-Draft-PR 92 am geprüften Head 9fd5bb87d019d0a5bb3b7fee13e9c9860e205fa2; CI: next-web, react-site, postgres-isolation und openapi-schema erfolgreich, repository fehlgeschlagen wegen älterer Quellen- und Browser-Evidenzbindungen. Live-Oracle, formale Medienprüfung und öffentliche Abnahme offen.",
      "rollback": "Private Sites-Version 6 und GitHub Draft-Branch-Commit 6f48d7e00954fd954ee22cd76d4f47dc284b34e9 wiederherstellen; Originalmedien erhalten",
      "next": "Textvergrößerungsmessung evidence/resize-2026-11-10/text-spacing.json: 43 öffentliche Routen, 129 Prüfungen, keine Überläufe oder erfassten Laufzeitfehler. Neuer lokaler Browsernachweis evidence/browser-critical-2026-11-10/critical-browser.json: fünf Ansichtsbreiten, Navigation und SDK-Orientierung mit isoliertem Testhandler bestanden; sieben Bindungstests bestanden. Historische Berichte erhalten. Weitere Quellenbindungen und Consent-/Fallback-Nachweise erneuern; Backend-zu-Anfrage-Ende-zu-Ende-Test und formale Medienprüfung abschließen; erst danach öffentliche Freigabe prüfen",
      "require_source_change": true
    },
    {
      "id": "NX-UM-110",
      "sub_goal": "11",
      "title": "Leadership-/PMO-/Worker-Bestand und erster Fall-Pilot",
      "priority": 2,
      "status": "RUNNING",
      "owner": "Pascal Courbois / ORACLE-Rolle zu verifizieren",
      "writer": "Codex Hauptlauf",
      "scope": "Bestehende Agenten-, Skill- und Tool-Instanzen, Rollenrechte, Runner und Gesprächszustände inventarisieren; kleinsten nachweisbaren Pilot auf bestehendem Register und autorisierter Runtime aufbauen; keine Scheinagenten oder externen Callback-Versprechen",
      "paths": [
        "docs/09-final/master-goal-anhang-leadership-pmo-2026-11-09.md",
        "docs/09-final/auftragsregister-2026-11-08.md",
        "tools/goal-runner.mjs"
      ],
      "dependencies": [
        "NX-UM-010"
      ],
      "acceptance": "Exakte Instanz-/Owner-/Tenant-Matrix; Skill-/Tool-Tests; ein realer Fall von Chat zu geplantem, ausgeführtem und unabhängig geprüftem Artefakt; Restart/Duplicate/Recovery nachgewiesen",
      "evidence": "Anhang SHA-256 ac483833f1478ec9efa6434d081070e2c8700f8fc4cc2b4471ca334bfe12e432; aktuelle Agent-/Runner-Bestandsprüfung läuft; noch kein Pilot-Nachweis",
      "rollback": "Bestehende Auftrags- und Runner-Dateien vor Änderung sichern; einzelne Pilotdaten versioniert rücknehmbar, nichts löschen",
      "next": "Verifizierte Bestandsmatrix und sichere Pilot-Schnittstelle festlegen, anschließend implementieren und testen",
      "require_source_change": true
    }
  ],
  "sub_goal_10_reference": "docs/09-final/master-goal-anhang-growth-product-factory-2026-11-09.md"
}
```
<!-- nexify-goal-tasks-json:end -->

Führendes Register der Aufträge aus dieser Arbeitslinie (Zweig `claude/loving-albattani-4jp12a`, PR 76). Quelle für Soll:
Gesamtbeschreibung 08.11.2026, Dauerauftrag „/GOAL“ (Pascal Courbois), `AGENTS.md`. Belegt ist nur, was in der Spalte
„Nachweis“ steht. Statuskette: PLANNED → CREATED → LOCALLY_TESTED → INTEGRATED → LIVE_VERIFIED → ACCEPTED.
**Kein Eintrag ist ACCEPTED**: Abnahme setzt unabhängige Prüfung voraus (READY ist keine Abnahme).

## 1. Mandat und Grenzen (aus dem Dauerauftrag)

- Eigenständige Planung und Ausführung im Umfang bestehender, gültiger Rechte; ein Writer je Scope.
- Nichts löschen (nur wiederherstellbar archivieren); keine Zahlungen, Vertragszusagen, Rechteerweiterungen, Secret-Transfers,
  keine Umgehung von Freigaben oder Sicherheitsgates.
- Nichts erfinden: Referenzen, Preise, Rechtstexte, Messwerte nur belegt oder mit Freigabe des Inhabers.
- Chat ist keine dauerhafte Runtime. 24/7-Betrieb, Scheduler, Backup, Monitoring und tägliche Berichte gelten erst mit Nachweis.

## 2. Aufträge

| ID | Ziel | Owner | Test / Nachweis | Rückweg | Status |
|---|---|---|---|---|---|
| AR-01 | Seitenkatalog §16 gegen `.de` abgleichen | Projektleitung | `gesamtbeschreibung-2026-11-08-abgleich.md`; 39 öffentliche Routen 200, je eine H1 | Commit zurücknehmen | LOCALLY_TESTED |
| AR-02 | SEO-Metadaten (Canonical, Description, noindex-Regeln) | Projektleitung | Commit `98f56a3`; Sitemap-Test | Commit zurücknehmen | LOCALLY_TESTED |
| AR-03 | Bilder füllen ihre Rahmen (cover statt contain) | Projektleitung | Commit `3b879de`; Sichtprüfung 1440 px | Commit zurücknehmen | LOCALLY_TESTED |
| AR-04 | Token- und Chatqualität; Chat fest an Modellvorgabe | Projektleitung | Commit `50f6917`; `chat-llm`-Tests | Commit zurücknehmen | LOCALLY_TESTED |
| AR-05 | Shop: Lieferstatus, Versandhinweis, Tracking-Abruf, Preisfreigabe | Backend | Commits `39a6974`, `b69c38a`; Python-Tests (ohne MongoDB) | Commit zurücknehmen | LOCALLY_TESTED |
| AR-06 | Startseite: Logo, Grünton, Elfenbein, Überschriften, Buttons | Art Direction | Commits `cf51a41`, `49241e7`, `4a2e76a`, `5b9fdd4`; Browsermessung + Sichtprüfung | Commit zurücknehmen | LOCALLY_TESTED |
| AR-07 | CI-Gleichstand lokal/CI (`test_contact_http`) | QA | Commit `769dfd6`; CI-Log `repository`: Test nicht mehr rot | Commit zurücknehmen | INTEGRATED (nur dieser Test) |
| AR-08 | Seite-für-Seite-Qualitätsabgleich | Art Direction / QA | Alle 43 öffentlichen Seiten mobil (390 px) und 42 von 43 auf Desktop (1440 px) einzeln gesichtet (nur `/teileklar/warenkorb` auf Desktop nur automatisch geprüft); Befund: Fehlerzustand der Vitrine brach buchstabenweise um, behoben. Automatisch (`tools/page_quality_audit.py`): 43 Seiten × 1440/390 px × DE/NL/FR/EN, 0 Fehler, 0 Warnungen lokal. Kein Screenreader-Test | Commit zurücknehmen | LOCALLY_TESTED |
| AR-09 | Shop-Texte NL/FR/EN | Content | Shop bleibt `lang=de` (proxy.ts), keine Übersetzungen belegt | – | OPEN |

## 3. Offene Punkte (Owner, nächste Aktion)

| ID | Punkt | Owner | Nächste Aktion |
|---|---|---|---|
| OF-01 | PR 76 zu groß für das Review-Gate (`diff_or_metadata_limit_exceeded`) | Inhaber | Erlaubnis für zweiten Branch bzw. PR-Split |
| OF-02 | Historische Hash-Pins (`test_recorded_source_hashes_match_actual_bytes`, `test_browser_evidence`, `test_resize_source_binding`) rot | unabhängiger Review | Nachweise mit echten Browser-Läufen neu erheben, nicht umbinden |
| OF-03 | Rechtsform (Eenmanszaak oder B.V.); Impressum-Titel nennt „B.V.“ mit Vorbehalt | Inhaber | Registerauszug liefern |
| OF-04 | Betrag auf „Preise & Ablauf“ (Tagessatz 449 € netto steht nur auf der Startseite) | Inhaber | Freigabe der Formulierung |
| OF-05 | Domain der Kontaktadresse `.cloud` vs. Hauptdomain `.de` | Inhaber | Entscheidung |
| OF-06 | Cloudflare Workers Builds: Skriptname über 54 Zeichen; Vercel `site-gjp7`: Deployment blockiert | Inhaber / Infra | Projekt bzw. Skript umbenennen, Vercel-Einstellung prüfen |
| OF-07 | `/api/session` hat in Produktion weder Route noch Rewrite | Backend | Route anlegen oder Orientierungsmodus als Soll festschreiben |
| OF-08 | Shop-Lücken: Kundenkonto, Partner-Status, Werkstattprofil, Wiederholung fehlgeschlagener BigBuy-Bestellungen, CI mit MongoDB | Backend | Pakete einzeln planen |
| OF-09 | BigBuy-Produktivzugang, Revolut live/Webhook, Resend-Domain, MongoDB-Zugang | Inhaber | Zugänge liefern; Zahlungen nur je Aktion freigegeben. **Stand 09.11.2026:** Resend-Domain `nexifyai.de` angelegt (nicht verifiziert); DNS-Zone liegt bei den Registrar-Parkservern `ns1/ns2.dns-parking.com`, nicht bei Vercel (Details und die vier Einträge in `config/integrationen.json`, Dienst `resend`) |
| OF-10 | Landingpages/Stadtseiten und Baukasten-Showcase | Content / Art Direction | Suchbegriffe und Wettbewerb real erheben |
| OF-11 | Browser-Nachweise (30 Skripte in `apps/site/tests/browser-*.mjs`) und Hash-Pins in `config/acceptance-coverage.json` / Abgleich: 35 Hash-Tests plus ca. 20 Nachweis-Tests rot (Stand 09.11.2026, lokal 42 Failures / 17 Errors). Ursache: Neugestaltung 02.11., D-007 (Clerk entfernt), Commit `5222298`. Zwei Fehlererfassungs-Nachweise sind real neu erhoben (`784ea8a`), alle anderen nicht erneuerbar, weil Selektoren/Dateien nicht mehr existieren | Test-Owner / Pascal Courbois | Skripte auf die neue Oberfläche und `apps/web/components/shop/` umschreiben, dann laufen lassen, dann Nachweis und Hash übernehmen. Pascal entscheidet, ob gelöschte Dateien aus den Registerzeilen entfernt werden. Hashes nie blind überschreiben. **Shop/Katalog (Punkt 3, 09.11.2026):** neue Prüffunktionen und Tests stehen, die Alt-Shop-Prüfer sind stillgelegt, siehe Abschnitt 3a |
| OF-12 | Sprachwahl im SPA: `nexify-locale` wird in `Workspace.tsx` nur geschrieben, seit `5222298` nicht mehr gelesen; die Sprache kommt serverseitig aus `?lang=` (`proxy.ts`). Ob die Sprache bewusst nicht mehr gemerkt wird, ist nicht entschieden. Ein Lesen im Client würde Server- und Clientsprache auseinanderlaufen lassen (gemischtsprachige Seiten) | Frontend / Pascal Courbois | Produktentscheidung: Sprache per Cookie im Proxy merken oder bewusst nur URL-gesteuert lassen; bis dahin nicht per `localStorage` nachrüsten |
| OF-13 | PR 76 überschreitet `max_diff_bytes` 64000 (Diff 256075 B). Schnitt in ca. 5 thematische PRs: Web 101591, Config 59255, Tools/Docs 51353, Shop 17875 | Release | Erst nach OF-11 schneiden; Limit nicht anheben. **Messung 09.11.2026:** Diff PR 76 gegen `main` = 1,30 MB; davon `evidence/` 824 KB (5 Dateien einzeln > 64 KB), Code 520 KB in 91 Dateien (Browser-Skripte 179 KB, Config 92 KB, Komponenten 70 KB, Tools 47 KB, Docs 36 KB, Tests 27 KB) ⇒ mindestens 9 Teil-PRs. **Wichtiger:** Im Log des Jobs `review` (PR 78) ist `OPENROUTER_API_KEY` leer – das Modell kann nicht aufgerufen werden; das Gate liefert dann nur `blocked_not_reviewed`. Ein Schnitt allein macht `review` daher nicht grün. Entscheidung Pascal Courbois: entweder das Secret `OPENROUTER_API_KEY` im Repo hinterlegen (Zugangsdaten gehören nicht in Chat/Repo, nur der Inhaber) oder PR 78/76 nach menschlicher Prüfung mit Inhaberrechten mergen |
| OF-14 | Produktion .de zeigt noch die alte Seite. **Ursache belegt (09.11.2026, lesend über den Vercel-Connector):** Hoster ist Vercel, Team `nexify-projekte`, Projekt `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`; `nexifyai.de`, `www.nexifyai.de`, `nexifyai.cloud` hängen daran; Produktions-Deployments kommen nur aus dem Branch `main` (zuletzt Commit `6c4f9ee`, Status READY). Der Qualitätszweig ist nicht in `main`, PR 76 ist ein Entwurf. Rollout = Merge nach `main` (löst Auto-Deploy aus), Rückweg = Vercel „Rollback“ auf das vorherige Deployment. SSH-Zugang und Claude-Browser (Remote Control) nicht eingerichtet | Pascal Courbois (Freigabe) | Merge von PR 76 erst nach OF-11/OF-13 und ausdrücklicher Freigabe; nichts wird ohne Freigabe nach `main` oder in die Produktion gebracht. SSH nur falls nötig: eigener Benutzer ohne Root, private Schlüssel bleiben bei Pascal. **Stand 09.11.2026 (Abend):** PR 78 (`5bf6827`) und PR 76 (`0272efe`) sind auf Freigabe des Inhabers („Merge mit Bypass freigegeben“) nach `main` gemergt (Squash). **Produktion NICHT aktualisiert:** Das Vercel-Projekt ist noch mit `nexifyai-dev/…` verbunden; das Repo liegt seit dem Umzug in `nexify-ai-agentur-gesamtprojekt-09-2026`. Seit 08.11. 23:41 UTC baut Vercel nichts mehr aus GitHub. Direkter Deploy per API scheitert unter beiden Org-Namen mit `incorrect_git_source_info` („repository can't be found“) ⇒ die Vercel-GitHub-App hat keinen Zugriff auf die neue Organisation. Live: `/portale` und `/produkte/aifly-oracle` 404, Startseite alter Stand (Deployment `dpl_35Vacwi…`, Commit `6c4f9ee`). **Nur Inhaber:** Vercel-GitHub-App für die Organisation installieren/freigeben und im Projekt unter Settings → Git neu verbinden. Danach: Deployment von `main` auslösen und live prüfen (`/portale`, `/produkte/*`, `/impressum`, `/anmelden`); Rückweg Vercel-Rollback auf `dpl_35Vacwi3rZhskCzYBWfamveJFQK1` |

## 3a. OF-11 Punkt 3: Prüfer für den neuen Shop, Stilllegung der Alt-Shop-Prüfer (09.11.2026)

Grundlage: ausdrückliche Freigabe von Pascal Courbois (Eigene Prüffunktionen samt Tests für den neuen Shop; Alt-Nachweise
stilllegen, archivieren, nicht löschen). Stand der Änderung: lokal, nicht committet.

| Was | Stand |
|---|---|
| Neue Prüffunktionen | `check_shop_ui_mock_evidence` und `check_catalog_ui_mock_evidence` in `tools/check_browser_evidence.py` (gemeinsamer Kern `_check_shop_ui_mock`). Sie binden `evidence/shop-ui-mock-2026-11-09/browser-shop.json` (13 Prüfungen, 19 gebundene Dateien) und `browser-catalog.json` (7 Prüfungen, 14 gebundene Dateien) |
| Strenge | Genauer Pfadsatz und SHA-256 aller gebundenen Dateien gegen die aktuellen Bytes (Drift = Fehler); alle Check-Namen vollständig, keine Dubletten; `passed`, `mock: true`, `production_data: false`, `server_code_executed: false` und Mock-Kennzeichnung Pflicht; `external_requests` und `page_errors` leer; keine echte Zahlung/Bestellung; Anfragen nur unter `/api/shop/` mit geschlossener Liste schreibender Pfade (Katalog: gar keine Schreibanfrage); erforderliche Statuscodes belegt; 390-px-Check benannt **und** die Messung (`width:390`, `scrollWidth<=innerWidth`) im hash-gebundenen Skript vorhanden; doppelte JSON-Schlüssel und Nicht-Zahlen werden abgelehnt |
| Tests | `ShopUiMockEvidenceTests`, `CatalogUiMockEvidenceTests` (aktueller Nachweis besteht; fehlender Check, `mock: false`, Quelldrift je gebundener Datei, externe Anfrage, Zahlungs-/Bestell-Flag, fremde Mutation, fehlende 390-px-Messung, fehlende Pflichtanfragen) und `RetiredAltShopGateTests` in `tests/test_browser_evidence.py` |
| Stillgelegt (nicht gelöscht) | `check_shop_evidence`, `check_catalog_evidence` samt Konstanten bleiben unverändert im Code, sind als „ALT-SHOP, STILLGELEGT“ markiert und werden von `main()` nicht mehr aufgerufen. `ShopEvidenceTests` und `CatalogBrowserEvidenceTests` sind mit `unittest.skip` und Begründung samt Verweis auf die neue Prüfung aus dem Lauf genommen |
| Alt-Nachweise | `evidence/shop-http-2026-10-27/browser-shop.json` und `evidence/catalog-image-batch-2026-10-27/browser-catalog.json` unverändert; ihre Registerzeilen in `config/acceptance-coverage.json` unverändert |
| Grenze | Der neue Nachweis belegt nur das Frontend gegen einen **gemockten** API-Vertrag (kein `apps/shop-api`-Servercode, keine MongoDB, kein BigBuy, kein Revolut, keine Produktivdaten). Er ersetzt weder einen Serverbeleg noch die Abnahme (Status LOCALLY_TESTED). Der Alt-Modus „Read-only-Snapshot mit 403“ entfällt im neuen Shop und ist nicht ersetzt |
| Rückweg | `@unittest.skip`-Zeilen entfernen und in `main()` die beiden Aufrufe wieder auf `check_shop_evidence` / `check_catalog_evidence` stellen; nichts wurde gelöscht |

Offen: (1) Die neuen Nachweisdateien sind noch nicht als eigene Zeilen in `config/acceptance-coverage.json` geführt; Pascal entscheidet gemeinsam mit der Frage, ob die Alt-Zeilen entfallen (OF-11). (2) `docs/contracts/local-shop-http.md` beschreibt weiterhin den Alt-Shop-Prüfer und ist nicht angepasst (Datei ist hash-gebunden). (3) `python3 tools/check_browser_evidence.py` bricht weiterhin schon im ersten Prüfer (`check_evidence`, veralteter Hash `apps/site/src/Auth.tsx`) ab; das gehört zu den übrigen OF-11-Gruppen.

### 3b. Stand OF-11 am 09.11.2026 (Abend) – OFFEN mit belegter Ursache

- **Laufzeit-Qualitätsprüfung (Playwright für Python):** alle 43 Seiten × de/nl/fr/en × 1440/390 px: 0 FEHLER, 0 WARNUNG (nur Hinweis „Shop-API lokal nicht erreichbar“). Bilder, die im parallelen Lauf als „nicht geladen“ erschienen, laden im Einzellauf (Lastartefakt, Dateien liefern HTTP 200).
- **Pin-Rebase:** 19 Pins nur mit Beleg neu gesetzt (`docs/09-final/pin-rebase-2026-11-09.md`). 22 Pins und 3 gelöschte Dateien bleiben OFFEN (Medienverträge, Presenter-System, Seiten-Shells `layout.tsx`/`page.tsx`/`[...slug]`, Anmelde-/Registrierseiten, `next.config.ts`, `shop-api/requirements.in`, PROGRESS.md, zwei Sitemap-/Video-Tests).
- **Consent-Gruppe (3 Tests):** `next-clerk-locale.json` prüft die seit D-007 entfernte Clerk-Locale-Brücke (`LocaleAwareClerk.tsx` ist ein nie gemounteter Stub); `next-public.json` (`apps/web/auth/tests/browser-public-experience.mjs`) braucht eine Neufassung: (1) Chat-Panel startet geschlossen (Klick auf „Schließen“ entfällt), (2) Companion nutzt `/media/atelier/presenters/oracle-lossless.webp` (194×193) statt eines 512-px-Avatars, (3) Panel-Überschrift lautet jetzt „NeX Agentic AIFly“ statt „AI Fly Oracle“ – **Namensentscheidung nötig** (AIFly ORACLE vs. NeX Agentic AIFly), (4) Zeilenzahl im Checker (78) ist auf 43 Seiten × 2 Sprachen = 86 anzuheben bzw. aus `site-map.json` abzuleiten. Entscheidung Pascal Courbois: Clerk-Brücke im Gate stilllegen (wie Alt-Shop) – Vorschlag, nicht umgesetzt.
  - **Entscheidung (09.11.2026, Freigabe Pascal):** Der Produktname gilt, wie er im Code steht: Chat-Panel „NeX Agentic AIFly“ mit Untertitel „NeXify AI“ (`Workspace.tsx`, `layout.tsx`, `PublicOrientationChat.tsx`); Tests folgen dem Produkt. Companion-Bild: `/media/atelier/presenters/oracle-lossless.webp`.
  - **Warum `browser-public-experience.mjs` nicht per Einzelfix erneuerbar ist:** Das Skript prüft den Vertrag vor D-007 (private Seiten ⇒ 503 `authentication_unavailable`, `.shop-panel`, `.editorial-guide`/`.editorial-module`, `data-identity-layout="zielbild-v2"` mit Live-Hero-Videos, `.home-product-links`). Heute: Private Seiten liefern eine Hülle ohne Daten (noindex, no-store; nur `/api/` ⇒ 401), der Hero ist ein Standbild, die Unterseiten nutzen `pc-*`/`hc-*`-Bausteine. Neufassung nötig, ohne die Fail-closed-Beweise für `/api/internal/workspace/*` (503) abzuschwächen; der Checker-Zähler 78 muss aus `site-map.json` abgeleitet werden (43 Seiten × 2 Sprachen = 86).
- **browser-video.json:** nicht erneuerbar (Produkt verwirft Video-Elemente bewusst, `ExplainerSections.tsx`).

## 4. Betrieb (nicht belegt)

24/7-Betrieb, Scheduler, Worker, Backup/Restore, Monitoring, Kostenkontrolle und der tägliche Bericht um 08:00
Europe/Amsterdam sind **nicht nachgewiesen**. Ein Bericht darf erst als „zugestellt“ gelten, wenn Kanal und Empfänger
benannt und die Zustellung verifiziert sind. Bis dahin steht der Stand in `PROGRESS.md` und in diesem Register.

## 5. Inhaberentscheidungen (Pascal, 2026-11-09)

Quelle: Aussagen des Inhabers in der laufenden Sitzung. Aktuelle Nutzerentscheidungen gelten vor älteren Entwürfen, innerhalb der unveränderten Schutzgrenzen des Mandats (nichts löschen, keine Secret-Transfers, keine Zahlungen, keine Sicherheitslockerung, keine Freigabeumgehung durch Dritte).

| ID | Entscheidung | Wirkung | Grenze |
|---|---|---|---|
| ED-01 | "Freigabe. Entscheide eigenständig. Merke es dir. Es gilt global." | Der Agent entscheidet Routinen und offene Einzelfragen selbst und setzt sie um; keine Rückfrage für bereits beauftragte, reversible Arbeit. Merges eigener, geprüfter PRs sind damit freigegeben (PR 80, 81 und Agent-PR 1 gemergt). | Gilt nicht für Secrets (Kopieren, Setzen, Ausgeben), Zahlungen, Vertragszusagen, Löschen, Rechteausweitung, das Öffnen geschlossener Zugänge (z. B. eve placeholderAuth) und das Abschalten von Gates. Diese bleiben beim Inhaber. |
| ED-02 | "Das Video ist nicht mehr aktuell." | Das Hero-Video aus AGENTS.md und docs/production/hero-requirements-2026-11-04.md ist überholt; das Standbild im Hero ist zulässig. `config/hero-film.json` und `browser-video.json` bleiben als Historie erhalten. | Alle übrigen visuellen Vorgaben (prototypen/, Designsystem v2.0) gelten weiter. |
| ED-03 | "Aendere auch die Domains" | Ziel: nexifyai.de und nexifyai.cloud liefern den aktuellen `main`. | Umsetzung nur ohne Secret-Kopie: Git-Verbindung des alten Vercel-Projekts neu auf das Repository der neuen Organisation (nur Inhaber, KS-008). Domains werden nicht auf ein Projekt ohne Umgebungsvariablen gezogen. |
| ED-04 | Clerk-Locale-Brücke (Entscheidung durch den Agenten nach ED-01) | Die Prüfung der Locale-Brücke (`LocaleAwareClerk.tsx`, Komponente entfernt) wird mit dem Neuentwurf von `next-public.json` stillgelegt, nicht gelöscht; die Consent-Oberfläche (DiagnosticConsent) und der Fail-closed-Nachweis bleiben bestehen. | Umsetzung gebündelt mit dem Neuentwurf der Route-Matrix (86 statt 78 Routen), weil beide Teile derselben Prüfung angehören. Bis dahin bleiben 3 Consent-Tests und 1 Error rot; kein Hashfälschen. |

### Fortschreibung 10.11.2026 · Hero, Mobil, Oracle, PWA und BigBuy

- **NX-UM-011, lokal in Prüfung:** Gewählter Triofilm `b7f30678` im Startseiten-Hero, vorheriger Studiofilm auf `/unternehmen`, jeweils mit bisherigem Bild als Poster; auf Desktop Text links und Film rechts. Originalhash und Medien-Slotplan liegen im GitHub-Entwurf. Identitäts-, Ton-, Lippen- und Untertitelprüfung sowie Freigabe stehen aus; keine neue Site-Version veröffentlicht.
- **Mobil, lokal geprüft:** `evidence/mobile-layout-2026-11-10/browser.json`: 43 öffentliche Routen × fünf Breiten, 720 Abschlussaktionen ≥44 × 44 px, Quell- und Screenshot-Hashes. Andere Schaltflächen, Überdeckungen und Bildbeschnitt bleiben gesondert offen. Der Oracle-Auslöser wird im Footer zugunsten eines Footer-Einstiegs ausgeblendet; dessen Erreichbarkeit tief im Footer ist ein offener UX-Punkt.
- **Oracle, lokal in Arbeit:** Gesprächsoberfläche und ein kontextbezogener Kosten-/Dauer-Folgefall verbessert; Kontextwechsel zwischen NeXify und TEILEKLAR setzt die lokale Instanz zurück. 9router ist serverseitig laufend beobachtet; aktueller Sites-Chat erreicht ihn nicht. Vorbereiteter Adapter ist nur per Fixture getestet; sichere Netzverbindung, Gesprächsbesitz, Tenant-, Kosten- und Laufzeitgrenzen sowie echtes Streaming bleiben offen.
- **PWA, lokal geprüft:** `evidence/pwa-offline-2026-11-10/browser-context.json`: Offline-Hinweis mit DE/NL/FR/EN bzw. TEILEKLAR, ohne Cache oder Wiederholung von API-Schreibvorgängen; echte Geräteinstallation und Deployment offen.
- **OF-08/OF-09, GitHub-Draft `f7ee9be08f72789be116a3f6390e90b8307dbe77`:** BigBuy-Import ist vor Anbieter- und Datenbankzugriff gesperrt, bis Tenant- und Veröffentlichungsvertrag belegt sind. 41 Import- und 3 Routentests mit Fakes sowie unabhängige Gegenprüfung bestanden. Produktivzugang, echte Mongo-Transaktionen, Auswahlimportfilter und Verkaufsgates bleiben offen; kein Liveimport ausgelöst.


## Fortschreibung 12.11.2026 · Sites-Fertigbau und Kontaktprüfung

- Scope: NeXify AI Gesamtprojekt, Sites-Projekt `appgprj_6af2144e2af881918282f28c4b57411a`, sichtbare Version 12 öffentlich. Keine Vermischung mit Kundenprojekten. Vorhandener Quell-PR #95; Writer dieses Scopes bleibt derselbe.
- Hero-Kandidat: Quellcommit `ab7430bf8e819180e411f1dc8b6e239098076005`; CI-Site-Build und zwei Browserprüfungen bestanden für den dortigen Build. Audioqualität, unabhängiger Review, Buildtransport und Prüfung auf Sites bleiben offen. Ein künftiger Neubau ist erneut zu testen und an seinen eigenen Hash zu binden.
- Buildtransport OFFEN: CI-Artefaktupload durch ausgeschöpftes GitHub-Artefaktkontingent fehlgeschlagen; Artefaktliste des geprüften Laufs leer. Hier kein authentifizierter GitHub-Checkout. Host-Checkout `/opt/nexifyai/repos/finalprojekt-1109` steht auf anderem Zweig und hat zwei lokale Änderungen; Vorhandensein des Kandidatencommits nicht bestätigt. Keine Änderung an diesem Checkout und keine Löschung.
- Kontaktweg OFFEN: Eine einmalige interne Testanfrage am 12.11.2026 auf der Sites-Kontaktseite endete mit unbestätigter Speicherung. Die Suche im verbundenen Postfach unmittelbar danach ergab keinen Treffer. Keine Wiederholung, da Seiteneffekt ungeklärt. Sites meldet keine Datenbankbindungen und keine Runtimevariablen; GET `/api/requests` liefert HTML statt eines belegten API-Vertrags. Historischer Resend-Test einer anderen Umgebung ist kein Zustellnachweis für diese Site.
- Datenschutz, Impressum und Vertragsgrundlagen bleiben laut aktueller Sites-Fassung unvollständig bzw. ungeprüft; keine neue rechtliche Aussage oder Freigabe abgeleitet. Login und Live-KI bleiben offen. Die öffentliche Zugriffseinstellung wurde nicht geändert.
- Nächste Schritte: autorisierten Transport des exakten Buildstands bereitstellen, Neubau und Browserprüfungen wiederholen, danach Sites-Veröffentlichung und 320-/Desktop-Readback. Kontakt-API, Empfänger und Persistenz anhand autorisierter Runtime identifizieren; erst nach Reconciliation des Testvorgangs einen erneuten klar gekennzeichneten Test mit Postfachnachweis durchführen. Rechtsgrundlagen anhand bestätigter Unternehmens- und Verarbeitungsdaten fachlich klären. Kosten: keine neue Verpflichtung.
