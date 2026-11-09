# Auftragsregister und Betriebsstand · 08.11.2026

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
| OF-09 | BigBuy-Produktivzugang, Revolut live/Webhook, Resend-Domain, MongoDB-Zugang | Inhaber | Zugänge liefern; Zahlungen nur je Aktion freigegeben |
| OF-10 | Landingpages/Stadtseiten und Baukasten-Showcase | Content / Art Direction | Suchbegriffe und Wettbewerb real erheben |
| OF-11 | Browser-Nachweise (30 Skripte in `apps/site/tests/browser-*.mjs`) und Hash-Pins in `config/acceptance-coverage.json` / Abgleich: 35 Hash-Tests plus ca. 20 Nachweis-Tests rot (Stand 09.11.2026, lokal 42 Failures / 17 Errors). Ursache: Neugestaltung 02.11., D-007 (Clerk entfernt), Commit `5222298`. Zwei Fehlererfassungs-Nachweise sind real neu erhoben (`784ea8a`), alle anderen nicht erneuerbar, weil Selektoren/Dateien nicht mehr existieren | Test-Owner / Pascal Courbois | Skripte auf die neue Oberfläche und `apps/web/components/shop/` umschreiben, dann laufen lassen, dann Nachweis und Hash übernehmen. Pascal entscheidet, ob gelöschte Dateien aus den Registerzeilen entfernt werden. Hashes nie blind überschreiben |
| OF-12 | Sprachwahl im SPA: `nexify-locale` wird in `Workspace.tsx` nur geschrieben, seit `5222298` nicht mehr gelesen; die Sprache kommt serverseitig aus `?lang=` (`proxy.ts`). Ob die Sprache bewusst nicht mehr gemerkt wird, ist nicht entschieden. Ein Lesen im Client würde Server- und Clientsprache auseinanderlaufen lassen (gemischtsprachige Seiten) | Frontend / Pascal Courbois | Produktentscheidung: Sprache per Cookie im Proxy merken oder bewusst nur URL-gesteuert lassen; bis dahin nicht per `localStorage` nachrüsten |
| OF-13 | PR 76 überschreitet `max_diff_bytes` 64000 (Diff 256075 B). Schnitt in ca. 5 thematische PRs: Web 101591, Config 59255, Tools/Docs 51353, Shop 17875 | Release | Erst nach OF-11 schneiden; Limit nicht anheben |
| OF-14 | Produktion .de zeigt noch die alte Seite. **Ursache belegt (09.11.2026, lesend über den Vercel-Connector):** Hoster ist Vercel, Team `nexify-projekte`, Projekt `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`; `nexifyai.de`, `www.nexifyai.de`, `nexifyai.cloud` hängen daran; Produktions-Deployments kommen nur aus dem Branch `main` (zuletzt Commit `6c4f9ee`, Status READY). Der Qualitätszweig ist nicht in `main`, PR 76 ist ein Entwurf. Rollout = Merge nach `main` (löst Auto-Deploy aus), Rückweg = Vercel „Rollback“ auf das vorherige Deployment. SSH-Zugang und Claude-Browser (Remote Control) nicht eingerichtet | Pascal Courbois (Freigabe) | Merge von PR 76 erst nach OF-11/OF-13 und ausdrücklicher Freigabe; nichts wird ohne Freigabe nach `main` oder in die Produktion gebracht. SSH nur falls nötig: eigener Benutzer ohne Root, private Schlüssel bleiben bei Pascal |

## 4. Betrieb (nicht belegt)

24/7-Betrieb, Scheduler, Worker, Backup/Restore, Monitoring, Kostenkontrolle und der tägliche Bericht um 08:00
Europe/Amsterdam sind **nicht nachgewiesen**. Ein Bericht darf erst als „zugestellt“ gelten, wenn Kanal und Empfänger
benannt und die Zustellung verifiziert sind. Bis dahin steht der Stand in `PROGRESS.md` und in diesem Register.
