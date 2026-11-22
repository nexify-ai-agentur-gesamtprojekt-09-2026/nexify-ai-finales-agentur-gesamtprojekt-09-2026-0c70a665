## Stand 14.11.2026, ca. 22:00 UTC · Abend III: Skills, Kontoverknüpfung im Shop-Dienst, robots-Meta, Belege Runde 3

Führt den Abschnitt von ca. 20:40 UTC direkt darunter fort; jener bleibt als Stand von `500c52d` stehen. Kennzeichnung wie dort (SOLL, IST, „laut PR“, Notiz, OFFEN). Entscheidungen stehen nur in `DECISIONS.md`; neu ist dort keine. Quelle der PR-Angaben: `git log origin/main` bis `48f5072` und `gh api …/pulls/<n>` (Abruf 14.11.2026, 21:47 UTC). Alle drei Merges durch `nexifyai-dev`, Merge-Zeiten laut GitHub in UTC.

### Gemergt seit `500c52d` (PR 188), je Punkt SOLL, IST, OFFEN

**PR 194 `2396553` (20:59) · Lehren des Abends in die bestehenden Skills.**
- IST: Nur Dokumente unter `.claude/skills/` (neun Dateien, kein neuer Skill). `nexify-zweig-und-pr` nennt jetzt die Vorher-Messung an `origin/main` im Wegwerf-Worktree nach beiden `generate-public-data`-Aufrufen, „Kein `git stash`“, das Zurücklesen von Entwurf und Auto-Merge nach dem Anlegen eines PR, Schritt 9 nach dem Squash-Merge und in „Bekannte Lage“ Actions-Budget, Codex-Kontingent und verwaiste Vercel-Projekte. OA-170 damit ERLEDIGT.
- OFFEN: Was dort als „Bericht vom 14.11.2026, nicht nachgemessen“ steht, bleibt Notiz.

**PR 196 `d4f2032` (21:26) · Shop-Dienst: Google-Anmeldung verweigert statt mit unbestätigtem Passwortkonto zusammenzuführen.**
- IST Befund (`docs/04-betrieb/konto-verknuepfung-befund-2026-11-14.md`): `google_session` suchte das Konto nur über die E-Mail-Adresse und startete eine Sitzung, während Passwort und Sitzungen des Bestandskontos weiter galten (Übernahme eines vorab registrierten Kontos); eine Google-Sitzung mit der Adresse eines Admin-Kontos erhielt die Admin-Rolle ohne Passwort. Heute hinter dem 503-Gate des Shop-Dienstes.
- IST Behebung (`apps/shop-api/shop/accounts_api.py`): unbestätigtes Passwortkonto 409 `account_exists_unverified`, jede Rolle außer `customer` 403 `google_login_not_allowed`; Zurücksetzen des Passworts bestätigt die Adresse und widerruft aktive API-Schlüssel des Kontos. Laut PR: `tests/test_shop_account_linking.py` mit 10 Tests, vor der Änderung 4 von 5 der ersten Tests rot; unabhängige Prüfung durch einen zweiten Agenten, Nacharbeit im selben PR. Im eigenen Lauf dieser Nachführung (ohne `.venv`) lädt das Testmodul nicht (fehlendes Python-Paket), ist hier also nicht ausgeführt.
- OFFEN: Registrierung mit fremder Adresse bleibt möglich (OA-171); Vermittler `GOOGLE_SESSION_URL` ohne Anwendungskennung und ohne Merkmal „Adresse bestätigt“, dazu Admin per Google und Bestandskonten (Inhaber, OA-172); Versand der Mail zum Zurücksetzen nicht belegt, ohne ihn bleiben Passwortkonten bei 409 stehen (OA-173); Teammitglieder-Einträge überleben das Zurücksetzen (OA-174).

**PR 198 `48f5072` (21:45) · robots-Meta nach der Indexierungsregel (OA-164), Ausfallkarten, Schaufenster-Kachel, Google-Ablehnungsmeldung; Belege neu erhoben.**
- IST am Repository: Das Meta-Tag auf `/agb`, `/avv`, `/widerruf`, `/teileklar/kategorien` und `/teileklar/werkstatt` kommt aus derselben Entscheidung wie die Kopfzeile (`apps/web/auth/page-robots.ts`, neben `indexing.ts`, weil `apps/web/lib` an den Resize-Beleg gebunden ist); die drei Rechtsseiten ändern nur ihre Metadaten, nicht den Rechtstext. Ausfallkarten von Warenkorb und Kasse ohne Trennpunkt auf eigener Zeile; Name der Schaufenster-Kachel auf zwei Zeilen begrenzt; `AuthForms.tsx` zeigt für 409 und 403 aus PR 196 je eine eigene Meldung (`components/shop/google-login-message.ts`). Neu erhoben am Commit `68f84c0`: Text-Resize-Beleg (laut PR 129 Prüfungen, 43 Routen, 0 Befunde, 175 Quellen), Katalog- und Shop-Beleg (laut PR bestanden, 7 und 13 Prüfungen); vorige Fassungen unter `superseded/`. Nachweise: `docs/04-betrieb/indexierung-freigabe-2026-11-14.md`, Abschnitt 11; `docs/09-final/pin-rebase-2026-11-14.md`, Abschnitt 12. OA-164 damit ERLEDIGT.
- IST Auslieferung: Commit-Status an `48f5072` für `…-ut7r` und `…-s4k5` „success“ (`gh api …/commits/48f5072/status`, 21:47 UTC). Die Live-Nachmessung (`tools/live-check.mjs`, `tools/gleichmacher.mjs`, `curl` auf die Domains) läuft laut Auftrag der koordinierenden Sitzung getrennt; ihr Ergebnis liegt dieser Nachführung nicht vor und wird hier nicht behauptet.
- OFFEN: Meta-Tag der Katalogseiten folgt nur dem Hauptschalter `NEXIFY_INDEXING` (OA-175); Observability-Belege `browser-exceptions-next.json` und `-vite.json` neu abweichend, Neulauf scheitert an einer fehlenden Erwartung des Harness zum heutigen Chat, `tools/check_browser_evidence.py` weiter rot (OA-176); Beleglauf mit Playwright 1.63.0 statt der festgelegten 1.65.0 (OA-177); die drei Belege tragen kein eigenes Commit-Feld, `68f84c0` steht nur im Commit-Text und in `pin-rebase` (eigene Prüfung 21:47 UTC; OA-178). Die hreflang-Frage der TEILEKLAR-Seiten aus OA-164 ist nicht Teil der Erledigung.

### Betriebslage

- **GitHub Actions startet keine Jobs (IST, Abruf 21:47 UTC).** Die Läufe auf `48f5072` (CI mit sieben Jobs, Chat owner schema fixture, Slack) enden um 21:45 UTC nach 2 bis 3 Sekunden mit „failure“; Anmerkung am Job: „The job was not started because an Actions budget is preventing further use.“ Unverändert OA-022, Inhaber.
- **Codex-Review (IST, Kommentare von `chatgpt-codex-connector[bot]` an PR 198).** Review-Kontingent erschöpft, Sicherheitsprüfung startet mangels Guthaben nicht. Unverändert OA-146, Inhaber.
- **Verwaiste Vercel-Projekte (IST, Kommentare von `vercel[bot]` an PR 198).** `web`, `web-2kby`, `site`, `site-gjp7`, `site-k23m` melden weiter Fehler beim Bau. Unverändert OA-023.
- **Shop-Dienst, Website in Produktion:** in dieser Nachführung nicht gemessen; letzte eigene Messung 20:33 UTC (Abschnitt darunter).
- **Zweite Sitzung.** Die Entwürfe 186, 187, 189, 190, 192, 193, 195 und 197 sind offen und gehören einem anderen Owner; sie werden hier nur geführt, nicht bewertet.

### Prüfstand und Umfang dieser Nachführung

Prüfstand `main` `48f5072` lokal (IST, 14.11.2026, ca. 21:50 UTC, Python 3.13, ohne `.venv`, ohne `node_modules`, erzeugte Seitendaten beider Anwendungen vorhanden): `python3 -m unittest discover -s tests` 844 Tests, 40 Failures, 7 Errors (davon 4 Ladefehler fehlender Python-Pakete, neu darunter `test_shop_account_linking` aus PR 196), 19 Skips, 47 rote Namen. Mit dieser Nachführung, die nur Dokumente ändert, dieselben 47 Namen, kein neuer, keiner weggefallen (Namensvergleich im selben Arbeitsbaum vor und nach der Änderung). `python3 tools/verify_requirements_reconciliation.py` 41 Zeilen „Stale implementation source“, vorher und nachher gleich. `make governance-check`, `make check` und `node tools/ds-audit-cli.js` (0 Fehler, 0 Warnungen) mit Exit 0. Nicht gemessen: `tools/live-check.mjs` und `tools/gleichmacher.mjs` gegen die Produktion.

Diese Nachführung (Zweig `claude/stand-2200`) ändert nur Dokumente: diesen Abschnitt und „Offene Arbeiten“ in `PROGRESS.md`; in `docs/09-final/offene-arbeiten-2026-11-14.md` Abschnitt 9, zwei Zustände in Überschriften (OA-164, OA-170) und fünf Stand-Zeilen. `DECISIONS.md` und `AGENTS.md` sind unverändert: Keine neue Entscheidung, der Stand-Absatz in `AGENTS.md` behauptet nichts, was PR 194 bis 198 widerlegen. Keine Prüfsumme und kein Beleg angefasst.

## Stand 14.11.2026, ca. 20:40 UTC · Abend II: Anfrageweg, Indexierungsregel, AI Gateway gesperrt, Testumgebung, Lösungsregister, Stilreste

Führt den Abschnitt von ca. 18:45 UTC direkt darunter fort; jener bleibt als Stand von `2906f58` stehen, zwei dort überholte Sätze sind an Ort und Stelle als überholt markiert. Kennzeichnung: SOLL = gültige Vorgabe mit Quelle; IST = am Repository oder durch eigenen Abruf dieser Nachführung belegt, mit Quelle und Zeit; „laut PR“ = im Commit oder in der PR-Beschreibung genannt, hier nicht wiederholt; Notiz = Quelle genannt, hier nicht nachprüfbar; OFFEN = fehlt oder nicht belegt. Entscheidungen stehen nur in `DECISIONS.md`; neu ist dort keine. Quelle der PR-Angaben: `git log origin/main` bis `500c52d` und `gh api …/pulls/<n>` (Abruf 14.11.2026, 20:33 bis 20:36 UTC). Alle Merges durch `nexifyai-dev`, Merge-Zeiten laut GitHub in UTC.

### Gemergt seit `2906f58` (PR 175), je Punkt SOLL, IST, OFFEN

**PR 176 `5f0a411` (18:48) · Nachführung der führenden Dokumente.**
- IST: Abschnitt von ca. 18:45 UTC, D-021 und D-022 als Vorschlag, Arbeitsliste `docs/09-final/offene-arbeiten-2026-11-14.md`.
- OFFEN: D-021 und D-022 tragen weiter den Vermerk „Vorschlag“; eine ausdrückliche Bestätigung des Inhabers ist im Repository nicht belegt (Stand-Zeile an beiden Einträgen).

**PR 177 `5ad9d5c` (18:49) · Mailing vorbereiten, ohne Versand (Paket E).**
- SOLL: Wunsch des Inhabers, ab 15.11.2026 Kundenmailings über Resend zu versenden (Quelle: Commit-Text; D-017 und § 7 UWG gelten).
- IST: Nur Dokumente: `docs/04-betrieb/mailversand-zustand-2026-11-14.md` (Messprotokoll), `docs/05-marketing/mailing/` mit Voraussetzungen je Empfängergruppe, Aufwärmplan, Entscheidungsvorlage und vier Vorlagenentwürfen in Deutsch mit Platzhaltern. Laut PR: 0 Einwilligungen, 0 geprüfte Bestandskunden, 1 Kontakt ohne Nachweis; `nexifyai.cloud` bei Resend verifiziert, `nexifyai.de` „failed“. Nichts versendet, in Resend und DNS nichts geändert.
- OFFEN: Rechtsgrundlage je Empfängergruppe (Inhaber, OA-001); Anmelde-, Abmelde- und Sperrweg liegt nur als Entwurf in PR 186 vor; Fassungen in NL, FR, EN fehlen (OA-105).

**PR 178 `530173d` (18:56) · IST gegen SOLL für Bot-Team, Routinen, Werkstattservice und Suite (Pakete H, I, J).**
- IST: Drei Dokumente unter `docs/04-betrieb/` (`bot-team-ist-soll-…`, `routinen-ist-soll-…`, `werkstattservice-und-suite-ist-soll-2026-11-14.md`). Kein Produktcode, keine Konfiguration geändert. Laut PR: 9 Profile, 44 Rollen, 17 Fachfähigkeiten, kein Agent läuft; 18 geplante Routinen; `config/skills-register.json` bewusst unverändert (gültig gebunden).
- OFFEN: Die Dokumente sind Analysen; aus ihnen sind Umsetzungspakete geschnitten (J-1 bis J-7), gebaut ist davon nur J-5 (PR 181). Bestätigung der Tabellen durch den Inhaber steht aus (OA-039, OA-134).

**PR 179 `a8a5d66` (19:07) · Testumgebung herstellbar (Paket B).**
- IST: `make test-env` baut `.venv` wie der CI-Job (Python 3.12, nur Pakete mit Prüfsumme), `make test-py` lässt die Suite darin laufen; `chat-route-errors.test.mjs` prüft JSON und SSE Feld für Feld; `pnpm-workspace.yaml` lehnt die Installationsskripte von `esbuild` und `workerd` ab. Bericht: `docs/09-final/testumgebung-und-abhaengigkeiten-2026-11-14.md`. Laut PR: 882 statt 823 Tests in `.venv`, 200 Läufe des Chat-Fehlertests in Folge grün. Ursache der Audit-Meldung `inventory_status: blocked` ist benannt (Abschnitt 7 des Berichts): Sie bestand schon am 30.10.2026 und ist berechtigt.
- OFFEN (Inhaber): Pillow 12.3.0 gegen 13.0.0 und die leeren Prüfsummen in `skills-lock.json` (Abschnitte 2 und 3 des Berichts, OA-053). OFFEN (Fabrik): inhaltliche Durchsicht der 23 Dateien für das KI-Durchsetzungsregister (OA-167).

**PR 180 `0333c16` (19:14) · Lösungsregister.**
- SOLL: Auftrag des Inhabers vom 14.11.2026 laut Commit-Text: Was genutzt wird und welche Zugänge es gibt, soll nicht mehr verloren gehen.
- IST: `config/loesungsregister.json` ohne Geheimniswerte, lesbare Fassung `docs/04-betrieb/loesungsregister.md`, Prüfung `tools/check_loesungsregister.py` in `make governance-check`, Skill `.claude/skills/nexify-loesungsregister`, dazu `docs/04-betrieb/aufraeumplan-2026-11-14.md` mit Sperrvermerk (kein Volume-Prune: Cognee-Daten). Eigener Lauf 20:36 UTC: 58 Lösungen, 48 Zugänge, lesbare Fassung stimmt überein; 17 Zugänge sind als „Erneuerung fällig“ geführt, 15 als offengelegt.
- OFFEN (Inhaber): die 17 Erneuerungen und die als Frage geführten Rollen im Register (OA-169).

**PR 181 `81b0ae9` (19:17) · Anfrageformular meldet die Abweisung ehrlich (Paket J-5).**
- SOLL: Eine Anfrage über die Website erreicht den Inhaber (Zielbild; `AGENTS.md`, Führungsentscheidung 10.11.2026, Umsatz zuerst).
- IST Befund: Über die Formulare auf `/kontakt`, `/teileklar/termine`, `/teileklar/gutscheine` und `/teileklar/partner-werden` kommt keine Anfrage an. `POST /api/requests` geht an den Shop-Dienst und wird am Laufzeit-Gate abgewiesen; gespeichert und versendet wird nichts. Eigener Abruf 20:33 UTC: `GET https://nexifyai.de/api/requests` 503 `runtime_binding_unavailable`, `payment_mode_unbound`. Befund-Dokument: `docs/04-betrieb/anfrageweg-befund-2026-11-14.md`.
- IST Heilung: Das Formular erkennt die Abweisung, sagt in vier Sprachen, dass nichts gesendet und nichts gespeichert wurde, nennt die Kontaktadresse und übergibt die Angaben per `mailto`. Der Schutzmechanismus des Shop-Dienstes ist unverändert. Laut PR: 6 Tests, Browserlauf gegen den lokalen Build.
- OFFEN (Inhaber): eigener Empfänger für Agentur-Anfragen in `apps/web` oder Bindung des Shop-Dienstes (OA-163). OFFEN, nicht geprüft: Zustellung an `mail@nexifyai.cloud`; das Postfach ist bis dahin der einzige schriftliche Weg (OA-092).

**PR 183 `202ca8f` (19:29) · Cloudflare AI Gateway als zweiter Chat-Weg, ausgeschaltet und gesperrt.**
- SOLL: `config/llm-policy.json` nennt als Zielweg nur den 9router; Modell und Reasoning nach `CLAUDE.md`.
- IST: Zweiter Weg in `apps/web/app/api/chat/llm-gateway.ts`, greift nur mit `CHAT_LLM_ROUTE=cloudflare-ai-gateway` und ist im Code gesperrt (`POLICY_PERMITS_CLOUDFLARE_GATEWAY = false`, Zeile 48; ein Test vergleicht die Sperre mit der Policy-Datei). Ohne die Variable bleibt alles beim 9router. Betriebsnotiz: `docs/04-betrieb/cloudflare-ai-gateway-2026-11-14.md`. Kein Modellaufruf, keine Änderung im Cloudflare-Konto.
- OFFEN (Inhaber): Freigabe braucht einen D-Eintrag und die Änderung von `config/llm-policy.json` (Wortlautvorschlag in Abschnitt 8 der Notiz, nicht eingetragen; OA-165). Achtung laut Notiz: Das Setzen von `CHAT_LLM_ROUTE` schaltet heute den Chat für alle Besucher ab. Ein Cloudflare-API-Token und das Geheimnis eines Access-Dienst-Tokens standen im Klartext im Chat und sind zu erneuern (Abschnitt 7 der Notiz, OA-166).

**PR 182 `08b0456` (19:35) · Indexierungsregel durchgesetzt, Freigabe bleibt beim Inhaber.**
- SOLL: Die Website bleibt gesperrt, bis der Inhaber die Veröffentlichung freigibt (`NEXIFY_INDEXING=enabled` in Vercel Production; TEILEKLAR zusätzlich nur mit `NEXIFY_INDEXING_TEILEKLAR`). Vorlage: `docs/04-betrieb/indexierung-freigabe-2026-11-14.md`.
- IST: Regel in `apps/web/auth/indexing.ts`; `apps/web/proxy.ts` setzt für jede Seite, die sie nicht erfüllt, `X-Robots-Tag: noindex, nofollow`; die Sitemap führt TEILEKLAR erst mit dem Shop-Schalter. Eigene Messung 20:33 UTC (`curl`): `/`, `/kontakt`, `/leistungen`, `/agb`, `/avv`, `/widerruf`, `/teileklar/kategorien`, `/teileklar/werkstatt` auf `nexifyai.de` sowie die Startseiten von `www.nexifyai.de`, `nexifyai.cloud` und `www.nexifyai.cloud` antworten mit 200 und tragen die Kopfzeile; `sitemap.xml` nennt 28 Adressen, keine mit `/teileklar`. Das ist eine Stichprobe von 11 Abrufen, nicht alle Seiten. Laut PR: zwei Belege durch Browserlauf neu erhoben, drei Pins nachgezogen.
- OFFEN: Das robots-Meta-Tag auf `/agb`, `/avv`, `/widerruf`, `/teileklar/kategorien` und `/teileklar/werkstatt` steht weiter auf `index, follow` (eigene Messung 20:33 UTC); es gilt die strengere Kopfzeile, die Seitendateien sind an Belege gebunden (OA-164). OFFEN (Inhaber): Freigabe selbst, Rechtsform und Impressum, Rolle von Apex, `www` und `.cloud` (OA-031, OA-009).

**PR 185 `2b8da63` (19:52) · Resize-Beleg nach PR 181 neu erhoben.**
- IST: PR 181 hatte drei Quellen der Resize-Bindung verändert; dadurch waren auf `main` zwei Tests in `tests/test_resize_source_binding.py` wieder rot. Neuer Lauf von `apps/site/tests/browser-text-spacing.mjs` am festen Commit `81b0ae9` (laut PR 129 Prüfungen, 43 Routen, 0 Befunde); Nachtrag in `docs/09-final/pin-rebase-2026-11-14.md`, Abschnitt 11.
- Lehre (IST, dort festgehalten): Die Vorher-Messung des Namensvergleichs läuft erst nach `node apps/site/scripts/generate-public-data.mjs`; ohne erzeugte Seitendaten scheitern beide Tests schon am fehlenden Bestand, und ein neuer Fehlschlag bleibt unsichtbar. Notiz aus dem Auftrag der koordinierenden Sitzung, im Repository nicht festgehalten: kein `git stash` zwischen Worktrees (der Stapel ist allen Worktrees gemeinsam).
- OFFEN: Beide Lehren stehen noch nicht im Skill `nexify-zweig-und-pr` (OA-170).

**PR 188 `500c52d` (20:31) · Stilreste und Gleichmacher (Paket D, OA-037, OA-052).**
- IST: 21 wirkungslose Deklarationen in `Storefront.css` und `HomeMaster.css` entfernt, 46 Literale in `shop.css` und `Storefront.css` durch Tokens gleichen Werts ersetzt; der Gleichmacher misst jetzt Karten, die TEILEKLAR-Kopfleiste, die Schalterliste im Abschlussbereich und den Chat-Hinweis. Drei Belege durch Browserlauf neu erhoben. Laut PR: Gleichmacher lokal 44 Seiten, 31.497 Vergleiche, 0 Abweichungen; gegen `nexifyai.de` 31.553 Vergleiche, 0 Abweichungen; `tools/live-check.mjs` lokal 329 Prüfungen, 2 Befunde (Shop-Dienst).
- OFFEN (Inhaber): Die Abschnittsleiste auf `/kontakt` und `/leistungen` läuft beim Blättern sichtbar unter der Glas-Kopfleiste durch; laut PR nur gemessen, nicht behoben, weil die Abhilfe einen Baustein der Startseite ändert (OA-168). OFFEN: Warenkorb, Kasse und Produktseite sind laut PR lokal nicht gerendert (kein Shop-Dienst).

### Betriebsbefunde des Abends

- **GitHub Actions startet keine Jobs (IST, Abruf 20:34 UTC).** Die jüngsten Läufe auf `main` (`500c52d`: CI, Chat owner schema fixture, Slack, Copilot Code Review) und auf den Zweigen enden nach 3 bis 5 Sekunden mit „failure“, ohne einen Schritt auszuführen. GitHub nennt die Ursache selbst als Anmerkung am Lauf: „The job was not started because an Actions budget is preventing further use.“ Damit ist die Ursache ein Ausgabenlimit für Actions im Abrechnungskonto. OFFEN (Inhaber): Budget und Abrechnungseinstellungen prüfen (OA-022). Bis dahin gibt es kein automatisches Gate vor `main`; es zählt die lokale Prüfung.
- **Auto-Merge (IST, Abruf 20:35 UTC).** 26 Pull Requests offen; bei 22 ist Auto-Merge eingeschaltet, darunter PR 184 (Cloudflare-Umzug). Sobald Actions wieder Jobs startet und die Prüfungen bestehen, gehen diese Stände ohne weitere Abnahme nach `main` (OA-027).
- **Codex-Review (IST, Kommentare des Dienstes an PR 185, 186 und 188).** „You have reached your Codex usage limits for code reviews“; die Sicherheitsprüfung startet nicht, weil das zahlende Konto kein Guthaben hat. OFFEN (Inhaber, OA-146).
- **Fünf Vercel-Projekte ohne Repository (IST, Kommentare von `vercel[bot]` an PR 185, 186 und 188).** `web`, `web-2kby`, `site`, `site-gjp7` und `site-k23m` melden bei jedem Push „The provided GitHub repository can't be found“. Die Auslieferung von `500c52d` über `…-ut7r` und `…-s4k5` ist laut Commit-Status erfolgreich. OFFEN (Inhaber): Projekte trennen oder löschen (OA-023).
- **Shop-Dienst (IST, 20:33 UTC).** `/api/shop/status` antwortet weiter mit 503 `runtime_binding_unavailable`, `database_binding_missing_or_unsuitable`.
- **Zweite Koordinations-Sitzung.** IST: PR 186 (Einwilligungsweg Mailing, Entwurf, alles hinter dem Schalter `NEXIFY_MAILING_CONSENT`, Standard aus, nicht gemergt, Kopf `b1fd6db`) stammt aus einer anderen Sitzung als diese Nachführung (Kennung in der PR-Beschreibung). Notiz, Quelle: Auftrag der koordinierenden Sitzung, hier nicht nachprüfbar: Jene Sitzung übernimmt die Pakete J-1, J-2, J-3, J-4, J-6 und J-7; Studienkolleg, Belege und Pins, Stil, Cloudflare-Umzug und führende Dokumente bleiben bei der ersten Sitzung. Abweichung zur Notiz (IST): PR 187 (J-1, Terminlogik als Spezifikation, Entwurf) und PR 189 (unabhängige Prüfung von PR 118, Entwurf) tragen jeweils eine weitere, dritte und vierte Sitzungskennung. Notiz laut Beschreibung von PR 187: Der Inhaber hat am 14.11.2026 die Fertigstellung von Shop und Werkstattservice zur Priorität erklärt; im Repository nicht als Entscheidung eingetragen.
- **Cloudflare-Umzug (D-021).** IST: Die Vorbereitung liegt als PR 184 vor (Zweig `claude/cloudflare-umzug`, Kopf `1c43325`, nicht gemergt, kein Entwurf, Auto-Merge eingeschaltet). Nichts ist umgeschaltet.
- **Kundenprojekt Studienkolleg Aachen.** Nur Verweis; seit dem Abschnitt von 18:45 UTC liegt dieser Nachführung nichts Neues vor. Einzelheiten nur im Kundenrepository.

### Prüfstand und Umfang dieser Nachführung

Prüfstand `main` `500c52d` lokal (IST, 14.11.2026, ca. 20:40 UTC, Python 3.13, ohne `.venv`, ohne `node_modules`, erzeugte Seitendaten vorhanden): `python3 -m unittest discover -s tests` 843 Tests, 40 Failures, 6 Errors (davon 3 Ladefehler fehlender Python-Pakete), 19 Skips, 46 rote Namen; mit dieser Nachführung, die nur Dokumente ändert, dieselben 46 Namen, kein neuer (Namensvergleich gegen einen Wegwerf-Arbeitsbaum auf `500c52d`). `python3 tools/verify_requirements_reconciliation.py` 41 Zeilen „Stale implementation source“, vorher und nachher gleich. Nicht neu gemessen: `tools/live-check.mjs` und `tools/gleichmacher.mjs` gegen die Produktion (letzte Messung laut PR 188).

Diese Nachführung (Zweig `claude/stand-abend`) ändert nur Dokumente: diesen Abschnitt und „Offene Arbeiten“ in `PROGRESS.md`, zwei Überholt-Vermerke im Abschnitt von 18:45 UTC; je eine Stand-Zeile an D-021 und D-022 in `DECISIONS.md`; Abschnitt 8 und Stand-Zeilen in `docs/09-final/offene-arbeiten-2026-11-14.md`. `AGENTS.md` ist unverändert: Der Stand-Absatz behauptet nichts Falsches (Vercel liefert aus, Cloudflare in Prüfung, Indexierung aus); die dort genannte Fehlerkennung des Shop-Dienstes ist eine datierte Messung von 10:37 UTC. Keine Prüfsumme und kein Beleg wurden angefasst; `PROGRESS.md`, `DECISIONS.md` und `AGENTS.md` wichen schon vorher von ihren Bindungen ab, die Arbeitsliste ist nicht gebunden.

## Stand 14.11.2026, ca. 18:45 UTC · Abend: Kopfleiste, Chat auf dem iPhone, Belege, Befunde, Cloudflare in Prüfung

Führt den Abschnitt von ca. 14:25 UTC direkt darunter fort; jener bleibt als Stand von `e0c7e38`/`9cb98c4` stehen. Kennzeichnung: IST = am Repository oder durch eigenen Abruf dieser Nachführung belegt, mit Quelle und Zeit; Notiz = Quelle genannt, hier nicht nachgeprüft; OFFEN = fehlt oder nicht belegt. Entscheidungen stehen nur in `DECISIONS.md` (neu als Vorschlag: D-021, D-022). Quelle der PR-Angaben: `git log origin/main` bis `2906f58` und die PR-Beschreibungen 168 bis 175 (Abruf 14.11.2026, ca. 18:35 UTC); die dort genannten Messungen sind hier nicht wiederholt.

Gemergt seit `ec6b6e4` (IST, Merge-Zeiten laut GitHub in UTC):
- PR 168 `1997ddc` (16:44): Das Verfahren, einen Server ohne Shell nur lesend zu vermessen, ist ein Skill (`.claude/skills/nexify-server-messung`), und der Hermes-Test vergleicht die Skills mit dem Index statt mit einer festen Zahl. Nachweis laut PR: `tests.test_hermes_config` 19 Tests bestanden, `make check` 0.
- PR 169 `aceb6a7` (16:51): D-019 steht jetzt auch in Konfiguration und Prüfer (`config/automation.json`, `config/integrations/nexify-team-runtime-candidate.json`, `tools/check_team_runtime_candidate.py`); Hermes ist gewählt, nicht aktiviert, Paperclip als abgelöst gekennzeichnet. Nachweis laut PR: 48 Tests bestanden, Prüfer meldet `configuration_consistent_not_runtime_ready`. Zwei Browser-Belege unter `evidence/observability-integration-2026-10-28/` binden seither veraltete Bytes.
- PR 170 `919eb8a` (17:01): Die Chat-Eingabe überdeckt auf dem iPhone den Verlauf nicht mehr (Inhaberbefund); die Fußhöhe wird auch gemessen, solange das Gespräch eingeklappt ist. Nachweis laut PR: lokaler Produktions-Build in Chromium mit iPhone-Profilen, iPhone 14 Fuß 159 px statt 0 px. Nicht in echtem Safari gemessen.
- PR 171 `b50d0c6` (17:11): Die Glasleiste der Kopfzeile schließt beim Blättern rechts mit 12 px statt 24 px am Projektschalter ab (D-022). Nachweis laut PR: gemessen bei 820 bis 1920 px, Gleichmacher ohne Befund.
- PR 172 `31ccd6c` (17:14): Der Hinweis unter der Chat-Eingabe steht in der kleinsten Schriftstufe, 12 px statt 13 px (Inhaberbefund). Nachweis laut PR: lokaler Produktions-Build, Desktop 1440 und iPhone 14.
- PR 173 `a2917d2` (17:44): Im Abschlussbereich stehen ab zwei Schaltern alle Schalter als eine Spalte gleicher Breite (Inhaberbefund). Nachweis laut PR: 5 Seiten in 8 Fällen, 40 Messungen ohne Befund; Gleichmacher 44 Seiten, 14.034 Vergleiche, 0 Abweichungen. Nur Chromium.
- PR 174 `29f0691` (17:55): Das Prüfskript `browser-public-experience.mjs` prüft die Filme am Baustein `AtelierFilm` (64 statt 47 Prüfungen), zwei Belege sind neu erhoben, elf Pins nachgezogen. Nachweis laut PR: Python-Suite von 49 Failures und 9 Errors auf 39 und 6, kein neuer roter Test; 28 Pins bleiben veraltet (`docs/09-final/pin-rebase-2026-11-14.md` Abschnitt 10).
- PR 175 `2906f58` (18:31): Die Kopfleisten-Regel der Live-Prüfung folgt PR 171 (`tools/kopfleiste-regel.mjs`), und Live-Prüfung wie Gleichmacher messen erst nach dem Ende laufender Übergänge. Nachweis laut PR: `tools/live-check.mjs` gegen `https://nexifyai.de` 329 Prüfungen, 2 Befunde (beide Shop-Dienst 503); `tools/gleichmacher.mjs` zweimal je 44 Seiten, 14.090 Vergleiche, 0 Abweichungen.

Ohne Pull Request direkt auf `main` (IST, `git log origin/main`): `4f097ef` (14:24 UTC), der Merge `051c113` (15:42 UTC) und `9f8ab46` (15:43 UTC), Autor und Committer `nexifyai-dev`. Sie bringen `/agb`, `/avv` und `/widerruf` als Seiten samt `apps/web/lib/legal/*.json`, die Sitemap-Einträge dazu und im Chat-Hinweis in vier Sprachen den Satz „Sie sprechen hier mit einem KI-Assistenten (NeX Agentic AIFly); Antworten können Fehler enthalten.“ OFFEN: Eine Freigabe des Inhabers für diese Rechtstexte ist im Repository nicht belegt (D-017), und der Chat-Satz weicht vom Umfang der Entfernung in D-010 ab. Diese Nachführung hat daran nichts geändert; die Einordnung liegt beim Inhaber.

Befunde des Abends:
- Chat-Meldung „Der Chat ist im Moment nicht erreichbar“ (vom Inhaber um 17:28 UTC gemeldet): Notiz, Quelle: koordinierende Sitzung und Register OA-023. Die Meldung kam vom Schwesterprojekt `…-s4k5` bei Vercel, das `main` ohne Umgebungsvariablen baut und dessen Chat mit 503 antwortet. `nexifyai.de` war nicht betroffen. Hier nicht nachgemessen (kein Chat-Aufruf, weil er einen bezahlten Modellaufruf auslöst).
- Indexierung (IST, `curl`, 14.11.2026, 18:41 UTC): `nexifyai.de`, `www.nexifyai.de` und `nexifyai.cloud` antworten mit 200 von Vercel und tragen `<meta name="robots" content="noindex, nofollow">`. Die Klärung läuft auf dem lokalen Zweig `claude/indexierung`; er lag um 18:40 UTC nicht auf `origin` (IST, `git ls-remote`). Überholt, Stand 20:40 UTC: Der Zweig ist mit PR 182 (`08b0456`, 19:35 UTC) gemergt; die Regel wird seither im Proxy durchgesetzt (Abschnitt darüber). Das Einschalten bleibt eine Freigabe des Inhabers.
- Vercel-Zahlung: Notiz, Quelle: Standortbestimmung der koordinierenden Sitzung. Laut Mail vom 14.11.2026, 01:37 UTC, ist eine Zahlung über 300,05 $ für das Team `nexify-projekte` fehlgeschlagen. Produktion wird heute nur über Vercel ausgeliefert. Nur der Inhaber kann das klären.
- Hermes-Oberfläche: Sie ist über `unternehmensbot.eu` öffentlich erreichbar, geschützt nur durch die eigene Anmeldung. Das widerspricht D-019 Folge 4; Folge 5 (Docker-Socket entfernen) ist offen. Quelle: `docs/04-betrieb/server-befund-2026-11-14.md`; hier nicht neu gemessen. Die Korrektur braucht eine Shell und die Freigabe nach D-016.
- Auto-Merge-Vorfall: Notiz laut Register OA-027: Am 14.11. um 16:18 UTC wurden sieben Pull Requests (150, 147, 163, 135, 115, 74, 48) auf „bereit“ und Auto-Merge gestellt; die Frage an den Inhaber, wer das war und ob es bleiben soll, ist unbeantwortet. IST (Abruf `gh api …/pulls?state=open`, 18:42 UTC): 22 Pull Requests offen, keiner mehr als Entwurf geführt, bei 21 ist Auto-Merge eingeschaltet (durch `nexifyai-dev`), nur bei PR 105 nicht. Gemergt ist davon nichts, weil GitHub Actions keine Jobs startet. Läuft Actions wieder an, gehen ungeprüfte Stände von selbst nach `main`.
- Kundenprojekt Studienkolleg Aachen (nur Verweis, keine Kundendaten in diesem Repository; Notiz, Quelle: koordinierende Sitzung): Paket 2 ist unabhängig geprüft, die Nacharbeit läuft; die Vorbereitung für Cloudflare liegt dort als PR 21 vor. Einzelheiten nur im Kundenrepository.
- Cloudflare (D-021): Auftrag des Inhabers von 17:42 UTC, den Umzug „wenn möglich“ durchzuführen. Der Zweig `claude/cloudflare-umzug` (`65a6577`, auf `origin`, nicht gemergt) trägt Bericht und Vorbereitung. Überholt, Stand 20:40 UTC: Der Zweig liegt als PR 184 vor (Kopf `1c43325`, nicht gemergt). Notiz aus dem Bericht dort: Rechenzeit lokal 46 bis 56 ms je Seite gegen 10 ms im kostenlosen Tarif; drei Messversuche auf Cloudflare kamen nicht zustande. Nichts ist umgeschaltet.

Prüfstand `main` `2906f58` lokal vor dieser Nachführung (IST, 14.11.2026, ca. 18:38 UTC): `python3 -m unittest discover -s tests` 823 Tests, 40 Failures, 8 Errors, 19 Skips im frischen Arbeitsbaum ohne `node_modules`; mit installierten Node-Paketen und erzeugten Seitendaten 39 Failures, 6 Errors (gemessen ca. 18:50 UTC mit dieser Nachführung, die nur Dokumente ändert; Namensvergleich ohne neuen Eintrag). `python3 tools/verify_requirements_reconciliation.py` 24 Meldungen „Stale implementation source“, vorher und nachher gleich. Nicht neu gemessen: `tools/live-check.mjs` und `tools/gleichmacher.mjs` gegen die Produktion (letzte Messung laut PR 175).

Widersprüche aus der Standortbestimmung, geprüft und nicht bereinigt: `config/automation.json` führt Composio als `user_selected_not_verified` mit Zweck „Headless Toolverbindungen und ElevenLabs“, `config/integrations/composio.json` führt die Anbindung der Web-App als `gebaut_hinter_schalter_standardmaessig_aus`. Das ist nicht eindeutig ein Dokumentfehler: Die beiden Einträge können zwei verschiedene Composio-Produkte meinen, und die Liste in `automation.json` kennt keinen Statuswert für „gebaut“. Die Datei ist außerdem in Browser-Belegen gebunden. Deshalb nicht geändert; steht unter „Braucht den Inhaber“.

Diese Nachführung (Zweig `claude/paket-a-stand`) ändert nur Dokumente: `DECISIONS.md` D-021 und D-022 als Vorschlag; diesen Abschnitt und „Offene Arbeiten“ in `PROGRESS.md`; in `AGENTS.md` einen Stand-Absatz zur Führungsentscheidung vom 13.11.2026 (Cloudflare); neu `docs/09-final/offene-arbeiten-2026-11-14.md`. Keine Prüfsumme und kein Beleg wurden angefasst; `PROGRESS.md` und `AGENTS.md` wichen schon vorher von ihren Bindungen ab.

## Stand 14.11.2026, ca. 14:25 UTC · Mobil und PWA, Hermes, Server-Messung, Shop-Bindung, Studienkolleg

Führt den Abschnitt von ca. 11:25 UTC direkt darunter fort. Quelle, wo nicht anders genannt: `git log origin/main` bis `e0c7e38` und Messungen der koordinierenden Sitzung am 14.11.2026.

Gemergt seit `5f1160a` (IST): PR 155 Arbeitsweisen-Skills (acht Skills und Index unter `.claude/skills/`), PR 156 und PR 161 Server-Befund mit Messung (`docs/04-betrieb/server-befund-2026-11-14.md`), PR 157 Hermes-Konfiguration (`ops/hermes/`), PR 158 Entscheidungen D-019 und D-020, PR 160 Seitenbefunde, PR 159 Mobil, PWA, Anmelden/Registrieren und erweiterter Gleichmacher. Von anderen Sitzungen: PR 162, 164, 165.

Produktion nexifyai.de nach Auslieferung von `e0c7e38` (IST, gemessen ca. 14:15 UTC): `tools/gleichmacher.mjs` 44 Seiten, 14.048 Vergleiche, 0 Abweichungen. `tools/live-check.mjs` 329 Prüfungen, 7 Befunde: 2 Shop-Dienst, 5 PWA. Die PWA-Befunde bestehen, weil der Build ohne `NEXIFY_PUBLIC_INSTALLATION` lief; die Variable ist seit ca. 14:20 UTC im Vercel-Projekt `…-ut7r` für die Produktion gesetzt. Nachmessung nach Auslieferung von `9cb98c4` (ca. 14:36 UTC): `tools/live-check.mjs` 329 Prüfungen, 2 Befunde (nur Shop-Dienst); `tools/gleichmacher.mjs` 44 Seiten, 14.062 Vergleiche, 0 Abweichungen; `/public-install-worker.js` antwortet mit 200 als Skript, `/manifest.webmanifest` ist gefüllt. Berichtigung: Eine frühere Fassung dieses Abschnitts nannte die Uhrzeiten rund eine halbe Stunde zu spät. Nicht belegt: Verhalten auf echtem iOS Safari.

Shop (IST): `SHOP_ALLOWED_PROJECT_IDS` ist auf Anweisung des Inhabers im Projekt `…-ut7r` gesetzt. Der Dienst antwortet seither mit 503 `database_binding_missing_or_unsuitable` statt `project_binding_unverified`. OFFEN: `MONGODB_URI` fehlt im Projekt; im alten Projekt ist der Produktionswert als „Sensitive“ gespeichert und nicht auslesbar. Auf srv1941843 wurde keine Umgebungsdatei mit der Adresse und kein MongoDB-Container gefunden; srv1243952 ist ohne Shell nicht einsehbar. PR 150 (Zugriffsschicht) und PR 147 (Zielschema) bleiben Entwürfe.

Server (IST, siehe Server-Befund): srv1941843 zu 97 % belegt, 10,2 GB frei; 77,3 GiB liegen in `.paperclip-runtime/runs`. Hermes läuft dort als Container und ist über `unternehmensbot.eu` öffentlich erreichbar, geschützt nur durch seine eigene Anmeldung. Snapshots beider Server vom 14.11., 11:47 UTC, Ablauf 15.11., 11:47 UTC. Am Server wurde nichts gelöscht oder geändert; es stehen acht beendete Mess-Projekte `nx-messung*-20261114`. OFFEN: Aufräumen und Einspielen der Hermes-Konfiguration brauchen eine Sitzung mit Shell.

Kundenprojekt Studienkolleg Aachen (IST laut Rückmeldungen der Kundensitzungen, hier nicht nachgeprüft; Einzelheiten nur im Kundenrepository): PR 18 Medien, PR 10 Gestaltung und PR 15 Inhalte warten auf Abnahme des Inhabers; eine Sitzung arbeitet an Backend und Flows auf Grundlage der Projektunterlagen vom 30.10.2026.

Gestaltung: Der Inhaber lässt die Feinoptimierung in Lovable laufen. Dafür besteht der Zweig `lovable/feinoptimierung` (Stand `e0c7e38`). Ergebnisse von dort gehen nicht direkt nach `main`, sondern durch Gleichmacher, Live-Prüfung und die Gates (D-012).

Veraltete Pins (Stand 14.11.2026, Zweig `claude/pins-nach-159` auf `078bc31`, Quelle und Einzelheiten: `docs/09-final/pin-rebase-2026-11-14.md` Abschnitt 10): Nach PR 159 sind elf Pins mit Browserlauf oder grünem Test nachgezogen, darunter `public-experience.test.mjs`, `PublicInstallation.tsx` und `generate-public-data.mjs`; `browser-public-experience.mjs` prüft die Filme jetzt am Baustein `AtelierFilm` statt an `scene-video`. OFFEN: 28 Pins im Register sind veraltet, darunter `docs/09-final/11-designsystem-definition.md`, `config/design-tokens.json`, `packages/tokens/tokens.*` und `config/page-explainers.json`; sie werden nur mit Browserlauf, passendem grünem Test oder Freigabe des Inhabers erneuert.

## Stand 14.11.2026, ca. 11:25 UTC · Wissensgraph, offene Entwürfe, Sichtung der Pull Requests, Regelbetrieb

Auftrag des Inhabers Pascal Courbois vom 14.11.2026: Jeder Agent soll den aktuellen Stand kennen. Dieser Abschnitt führt den Abschnitt „Stand 14.11.2026 · Angleichung an die Startseite“ direkt darunter fort; jener bleibt als Stand von `70b923e` (10:18 UTC) stehen. Kennzeichnung: IST = hier am Repository oder durch eigenen Abruf nachgeprüft, mit Quelle und Zeit; Notiz = „Quelle: koordinierende Sitzung, 14.11.2026“, hier nicht nachgeprüft; OFFEN = fehlt oder nicht belegt. Entscheidungen stehen nur in `DECISIONS.md` (neu: D-018).

Gemergt seit `70b923e` (IST, `git log origin/main`, Stand `5d4a187`, abgerufen 14.11.2026, 11:20 UTC): PR 146 `57972f8` (10:41 UTC) Composio-Ereignisse dauerhaft im Schema `composio`, Migration `apps/web/supabase/migrations/0004_composio.sql`, Betriebsschritte in `GO-LIVE.md` Abschnitt 6a; PR 148 `8998719` (10:49 UTC) Nachführung der führenden Dokumente und Skill `.claude/skills/nexify-stand-halten`; PR 149 `2d1eb69` (10:50 UTC) Absende- und Konto-Schalter der Formulare aus dem Baustein der Startseite, Gleichmacher erweitert; PR 151 `fb053a9` (11:02 UTC) Wissensgraph mit Graphify: `tools/graph.sh`, `make graph`, `.graphifyignore`, `.graphifyrc`, Skill `.claude/skills/nexify-graph`, Ausgabe `graphify-out/` unversioniert (`.gitignore`), laut Skill nur lokaler Code-Lauf ohne Konto beim Cloud-Dienst; PR 100 `5d4a187` (11:09 UTC) Lockfile `pnpm-lock.yaml`, Paket `glob`.

Offene Pull Requests (IST, `gh api repos/…/pulls?state=open`, 14.11.2026, 11:24 UTC): 24 offen, alle als Entwurf geführt außer PR 126. Nummern: 152, 150, 147, 135, 126, 125, 124, 123, 122, 121, 120, 119, 118, 115, 107, 105, 94, 75, 74, 73, 67, 65, 60, 48.

Offene Entwürfe mit Stand (Zustand „Entwurf“ und Zweig IST aus demselben Abruf; Inhaltsangaben Notiz, Quelle: koordinierende Sitzung, 14.11.2026):
- PR 147, Zweig `claude/shop-supabase`: Shop-Schema für die eigene Supabase-Instanz (D-013). Zwei Review-Befunde behoben: Ein fehlendes Lieferland wird abgelehnt; der Dienst darf die Schemaversion lesen. 105 Prüfungen lokal bestanden. Wartet auf die Entscheidung zum Verbindungsweg.
- PR 150, Zweig `claude/shop-zugriffsschicht`: Zugriffsschicht des Shop-Dienstes. Umgestellt sind Katalog, Warenkorb, Konten, Werkstätten und Anfragen, 59 von 139 Aufrufen. Speicher bleibt MongoDB (D-006 als IST). Kasse, Admin und Import sind offen.
- PR 152, Zweig `claude/belege-neupruefung`: Browser-Belege neu geprüft. Python-Suite laut Agentenbericht von 143 auf 47 rote Tests. Vier Seitenbefunde sind offen; dafür ist ein Zweig `claude/seitenbefunde` in Arbeit, der um 11:24 UTC nicht auf `origin` lag (IST, `git branch -r`).

Sichtung der offenen Pull Requests (Notiz, Quelle: koordinierende Sitzung, 14.11.2026; die Einordnung ist hier nicht nachgeprüft, geschlossen wurde nichts):
- Mergebar: 94 (noch Entwurf) und 107 (laut Abruf 11:24 UTC ebenfalls noch Entwurf).
- Überholt: 135, 126, 105, 75, 74, 73, 67, 65, 60, 48. Nicht geschlossen; das Schließen entscheidet der Inhaber.
- Entscheidung nötig: 118, 122, 123, 124, 121, 120, 125, 119, 115.
- Kernaussagen: PR 122 behebt den 503 des Shop-Dienstes nicht und verwendet `SHOP_API_ALLOWED_PROJECT_IDS`; `main` verwendet `SHOP_ALLOWED_PROJECT_IDS` (Variablennamen IST, `git grep` auf `origin/claude/teileklar-backend` und `main`, `apps/shop-api`). PR 118 ändert die Google-Anmeldung ohne Schalter.

Regelbetrieb (Notiz, Quelle: koordinierende Sitzung, 14.11.2026): Die geplante Aufgabe in der Umgebung „Agentur Repo“ konnte das Repository nicht klonen; ihr Lauf um 10:47 UTC blieb ohne Live-Prüfung. Sie ist deaktiviert. Der Ersatz feuert in die koordinierende Sitzung; erster Lauf 14:47 UTC, noch nicht belegt. Endet diese Sitzung, endet der Regelbetrieb. OFFEN: ein Regelbetrieb, der ohne offene Sitzung läuft.

Nebenbefund (IST Fundstelle, Verhalten Notiz): `apps/web/auth/tests/chat-route-errors.test.mjs` Zeile 58 prüft, dass die Ausgabe kein „429“ enthält; die Ausgabe trägt eine zufällige Kennung, die diese Ziffernfolge enthalten kann. Der Test ist damit wacklig. Nicht behoben.

Kundenprojekte (nur Verweis, keine Kundendaten in diesem Repository; Notiz, Quelle: koordinierende Sitzung, 14.11.2026): Studienkolleg Aachen wird in eigener Sitzung und eigenem Repository bearbeitet. JS Reinigung Wesel: Quellcode nicht auffindbar, offen beim Inhaber.

Prüfstand `main` `5d4a187` lokal vor dieser Nachführung (IST, 14.11.2026, 11:22 UTC): `python3 -m unittest discover -s tests` 780 Tests, 135 Failures, 12 Errors, 19 Skips; `python3 tools/verify_requirements_reconciliation.py` Exit 1 mit 55 Meldungen „Stale implementation source“. Nicht neu gemessen: `tools/live-check.mjs` und `tools/gleichmacher.mjs` gegen die Produktion (letzte Messung 10:37 bis 10:43 UTC, Abschnitt darunter); `make graph`.

Diese Nachführung (Zweig `claude/stand-1125`) ändert nur Dokumente: `DECISIONS.md` D-018; diesen Abschnitt und „Offene Arbeiten“ in `PROGRESS.md`; in `AGENTS.md` Verweis auf D-018, den Wissensgraphen, Kundenprojekte und diesen Stand; in `GO-LIVE.md` die Standzeile (Migration `0004`). Keine Prüfsumme und kein Beleg wurden angefasst. `PROGRESS.md` und `AGENTS.md` wichen schon vorher von ihren Bindungen ab (`source_sha256` im Register, Meldung „Stale implementation source: PROGRESS.md“); die Bindungen bleiben Sache der Neuprüfung (PR 152).

## Stand 14.11.2026 · Angleichung an die Startseite, Live-Prüfung, Inhaberentscheidungen D-012 bis D-017

Kennzeichnung in diesem Abschnitt: IST = durch Lauf, Commit oder Messung belegt; OFFEN = fehlt oder nicht belegt. Die Entscheidungen selbst stehen nur in `DECISIONS.md` (D-011 bis D-017), Betriebsschritte nur in `GO-LIVE.md`.

Gemergt am 14.11.2026 auf `main` (IST, `git log origin/main`, Stand `70b923e`): PR 133 `6def15d` Hero-Baustein `HeroStage` für alle Seiten; PR 132 `a2427c0` Galerie-Filme abspielbar, richtiges Bild, KI-Hinweis im Footer (Verweis auf `/ki-hinweise`); PR 134 `b3d485d` Umbenennung „NeX AIFly Suite“ (D-011); PR 129 `bd16d96` und PR 141 `2fe46bb` Tests prüfen den Markennamen statt einer Rechtsform; PR 130 `a0dad93` Kopfleiste auf breiten Schirmen; PR 136 `e389839` nur der Hero-Film startet von selbst, Galerie-Filme auf Klick, Abstand der Kopfleiste; PR 137 `8513028` `tools/live-check.mjs`; PR 140 `e3a5129` Shop-Dienst in der Live-Prüfung; PR 139 `9895fd7` TEILEKLAR-Hero über `HeroStage`; PR 138 `276e6e0` Composio-Skill `.claude/skills/composio`; PR 142 `ae85910` `tools/gleichmacher.mjs` und Skill `.claude/skills/nexify-klon-fabrik`; PR 143 `2d1fe47` Composio-Webhook-Empfang `/webhook/v1` mit Schalter `NEXIFY_COMPOSIO_WEBHOOK`; PR 144 `10a4a8e` TEILEKLAR-Abschnitte, Überschriften und Schalter aus den Bausteinen der Startseite; PR 145 `70b923e` Gleichmacher misst mit geschlossener Chat-Scheibe, drei Bausteine mehr.

Messungen gegen die Produktion (IST, 14.11.2026, 10:37 bis 10:43 UTC, nur lesend): `nexifyai.de`, `www.nexifyai.de`, `nexifyai.cloud` und `www.nexifyai.cloud` antworten mit 200, `server: Vercel`. `node tools/live-check.mjs`: 323 Prüfungen, 2 Befunde, beide Shop-Dienst (`/api/shop/status` und `/api/shop/products` 503 `project_binding_unverified`). `node tools/gleichmacher.mjs`: 44 Seiten, 9.240 Vergleiche bei 390 und 1440 px, 0 Abweichungen. Startseite trägt `noindex, nofollow`. `POST /webhook/v1` ohne Signatur: 401 auf beiden Domains. Der Hinweis „Domains zeigen nicht auf Vercel“ in `AGENTS.md` und `docs/04-betrieb/befund-2026-11-13.md` Abschnitt 4 ist damit überholt; `AGENTS.md` ist nachgeführt, der Befund vom 13.11. bleibt als Historie unverändert.

Prüfstand `main` `70b923e` lokal (IST, 14.11.2026): `make check` 10/10; `node tools/ds-audit-cli.js` 0 Fehler, 0 Warnungen; `python3 -m unittest discover -s tests` 779 Tests, 134 Failures, 14 Errors, 16 Skips; `python3 tools/verify_requirements_reconciliation.py` Exit 1 mit 54 Meldungen „Stale implementation source“ (35 verschiedene Dateien). In `config/acceptance-coverage.json` weichen 42 von 362 Einträgen in `source_sha256` vom Dateiinhalt ab. Die Neuprüfung der Belege und Prüfsummen läuft getrennt auf `claude/belege-neupruefung`.

Diese Nachführung (Zweig `claude/stand-halten`) ändert nur Dokumente und einen Registereintrag: `DECISIONS.md` D-012 bis D-017 und Vermerk an D-006; `AGENTS.md` Nachtrag zu Domains und Projekt, Verweis auf die Entscheidungen, zwei Pflichtprüfungen, Verweis auf die Skills; `GO-LIVE.md` Standzeile; Konflikt `DATA-STORE-001` im Register; Skill `.claude/skills/nexify-stand-halten`. Keine Prüfsumme und kein Beleg wurden angefasst. Folge: `PROGRESS.md` ist im Register an `source_sha256` und an REC-SERVICES-RELEASE-01 gebunden und weicht durch diesen Abschnitt neu ab (43 statt 42 Abweichungen; Python-Tests 135 statt 134 Failures, einzig neu `test_recorded_source_hashes_match_actual_bytes` für `PROGRESS.md`; Abgleich 55 statt 54 Meldungen); `AGENTS.md` wich schon vorher ab. Beides gehört in die laufende Neuprüfung.

OFFEN, nicht belegt (aus den Sitzungsnotizen vom 14.11.2026 übernommen, hier nicht nachgeprüft): Zuordnung der Domains zum Projekt `prj_lKQEWQ…` über die Vercel-Schnittstelle (Abruf von hier 403; die Zuordnung steht in `docs/deployment/environment-variables.md` Abschnitt 6); 503 `database_metadata_unavailable` im früheren Projekt `prj_Po7jl…`; signierter Composio-Webhook 200; GitHub Actions startet kontoweit keine Jobs (zuletzt belegt am 13.11.2026 im Befund, Abschnitt 10); Zahl und Zustand der offenen Pull Requests. Live-Wirkung der Shop-Zulassungsliste: unverändert offen, siehe nächster Abschnitt.

## Offene Arbeiten · Stand 14.11.2026, ca. 22:00 UTC

Kein zweites Register: Führend bleiben P01–P26 und die Hauptfälle MASTER-01 bis MASTER-18 in `config/acceptance-coverage.json` (`whole_system_accepted: false`). Das Register ist ausdrücklich keine Ausführungsliste und hat für die folgenden Arbeiten kein Feld. Dieser Abschnitt wird bei jeder Nachführung ersetzt, nicht fortgeschrieben.

Die einzelnen offenen Arbeiten stehen in der Arbeitsliste `docs/09-final/offene-arbeiten-2026-11-14.md` (OA-001 bis OA-162 zum Stand `29f0691`, Abschnitt 8 mit OA-163 bis OA-170 zum Stand `500c52d`, Abschnitt 9 mit OA-171 bis OA-178 zum Stand `48f5072`; Abschnitt 10 mit OA-179 vom 16.11.2026, Zweig `claude/brain-mcp-auth`, PR 215, noch nicht gemergt). Sie dient der Vergabe und ersetzt kein führendes Register; die Angaben der Einträge OA-001 bis OA-162 sind hier nicht einzeln nachgeprüft. Weicht sie von diesem Abschnitt ab, gilt dieser Abschnitt.

Zählung der Arbeitsliste nach dieser Nachführung (179 Einträge; Herleitung in Abschnitten 9.2 und 10.1 der Liste):

| Zustand | 20:40 UTC | 22:00 UTC | 16.11.2026 |
|---|---|---|---|
| OFFEN | 46 | 49 | 49 |
| TEILWEISE | 13 | 13 | 13 |
| BLOCKIERT | 37 | 38 | 38 |
| ENTSCHEIDUNG NÖTIG | 58 | 60 | 61 |
| HISTORIE-überholt | 8 | 8 | 8 |
| ERLEDIGT | 8 | 10 | 10 |

Erledigt seit 20:40 UTC: OA-170 (PR 194 `2396553`), OA-164 (PR 198 `48f5072`). Neu: OA-171 bis OA-174 (Reste aus PR 196), OA-175 bis OA-178 (Reste aus PR 198). Neu am 16.11.2026: OA-179 (brain als MCP-Server mit Browser-Anmeldung, Priorität 1, ENTSCHEIDUNG NÖTIG; PR 215, nicht gemergt).

Offene Pull Requests (IST, `gh api …/pulls?state=open` und GitHub-MCP `list_pull_requests`, 14.11.2026, 21:47 UTC): 31 offen. Gegenüber 20:35 UTC (26 offen) neu: 190, 192, 193, 195, 197; gemergt seither nur neue Nummern (194, 196, 198). Auto-Merge eingeschaltet: 21, nicht bei 184, 105 und den acht Entwürfen.

| PR | Titel (gekürzt) | Entwurf | Auto-Merge |
|---|---|---|---|
| 197 | brain: Cognee aufnehmen, Adapter hinter Schalter | ja | aus |
| 195 | werkstatt: Terminbuchung Stufe 1 hinter Schalter | ja | aus |
| 193 | hermes: Arbeitsbereich des Inhabers vorbereiten | ja | aus |
| 192 | sicherheit: /intern/workspace ohne Anmeldung nur Hülle | ja | aus |
| 190 | suite: Funktionsliste nutzbar/Hülle/fehlt (OA-039) | ja | aus |
| 189 | review: unabhängige Prüfung von PR 118 | ja | aus |
| 187 | werkstatt: Terminlogik als Spezifikation (J-1) | ja | aus |
| 186 | mailing: Einwilligungsweg hinter Schalter (Paket F) | ja | aus |
| 184 | hosting: Cloudflare-Umzug vorbereiten und belegen | nein | aus |
| 163 | Entscheidung: Eingangsgrenze des Chats | nein | an |
| 150 | shop: Zugriffsschicht Katalog und Warenkorb | nein | an |
| 147 | shop: Zielschema PostgreSQL mit RLS | nein | an |
| 135 | NeX AIFly Suite: Produktseite /produkte/aifly-suite | nein | an |
| 126 | chat: Ursache von chat_llm_failed protokollieren | nein | an |
| 125 | Skill nexify-design-system | nein | an |
| 124 | Entwurf: NeXify-MCP-Server | nein | an |
| 123 | suite: Composio-Anbindung hinter Schalter | nein | an |
| 122 | Shop-API: 503-Ursache, Werkstattanfrage, Partnerantrag | nein | an |
| 121 | Entwurf: Python-Agentenkern und Wissensport | nein | an |
| 120 | Entwurf: Führungs-Skill, Chat-Daten, Messplan | nein | an |
| 119 | Marke und Texte: Namensregel, Markenarchitektur | nein | an |
| 118 | Kunden-Suite: Fundament im Backend | nein | an |
| 115 | chat: Neuaufbau (Paket 5) | nein | an |
| 105 | chat: Ursache von chat_llm_failed (Paket 1) | nein | aus |
| 75 | feat(leistungen): Ablauf- und Investitionssektion | nein | an |
| 74 | docs(mcp): NEXIFY-MASTER-MCP-001 Phase 0/1 | nein | an |
| 73 | feat(home): Startseite neu aufgebaut | nein | an |
| 67 | Funktionsfähiger Gesamtstand | nein | an |
| 65 | Warenkorb und Mailbudget absichern | nein | an |
| 60 | Editorial boilerplate, BigBuy-Katalog | nein | an |
| 48 | Sentry Core types im Vercel-Funktionscompiler | nein | an |

- PR 184 (Cloudflare-Umzug, D-021): wartet auf den Inhaber (Kostenweg, Token mit Worker-Recht; OA-028). IST: Auto-Merge ist dort nicht mehr eingeschaltet (20:35 UTC noch an); wer es abgeschaltet hat, ist hier nicht belegt.
- 186, 187, 189, 190, 192, 193, 195, 197: Entwürfe einer zweiten Sitzung, offen, anderer Owner; hier nicht bewertet.

Kann die Fabrik (innerhalb D-017, ohne neue Freigabe; je Paket ein Schreiber und ein eigener Zweig):
- A · Führende Dokumente nachführen (OA-060): fortgeführt mit dieser Nachführung.
- B · Tests: Durchsicht für das KI-Durchsetzungsregister (OA-167) offen.
- C · Belege und Pins, ein Schreiber (OA-056, OA-034): zuletzt mit PR 198 neu erhoben. Offen: Katalogseiten-Meta (OA-175), Commit-Feld der Belege (OA-178), Lauf mit Playwright 1.65.0 (OA-177, hängt am Runner in Actions), Observability-Belege nach Entscheidung (OA-176).
- Shop-Konten vor dem Binden des Dienstes: Bestätigung der Adresse bei der Registrierung (OA-171), Teammitglieder beim Zurücksetzen (OA-174).
- E · Mailing ohne Versand: OA-106 offen. F · Einwilligungsweg: Entwurf PR 186, anderer Owner.
- G · Lead-Plan und Wettbewerb (OA-095, OA-100): offen.
- H, I, J · Folgepakete J-1 bis J-7: J-5 gebaut (PR 181); J-1 und weitere als Entwürfe der zweiten Sitzung (187, 195).
- K · Shop-Zugriffsschicht, PR 150 (OA-076): offen.
- M · Nur lesende Messungen (OA-021, OA-132): offen. Live-Nachmessung nach PR 198: läuft getrennt, Ergebnis hier nicht belegt.

Braucht den Inhaber (vollständige Liste: Arbeitsliste Abschnitte 6, 8 und 9; hier das Dringende):
- GitHub Actions: Budget und Abrechnungseinstellungen prüfen (OA-022, unverändert 21:47 UTC). Vorher Auto-Merge an 21 offenen Pull Requests bestätigen oder abschalten (OA-027); über die übrigen PRs entscheiden (OA-051).
- Codex-Kontingent (OA-146); fünf Vercel-Projekte ohne Repository trennen (OA-023).
- Anfrageweg: Über die Formulare kommt keine Anfrage an; Empfänger wählen (OA-163, OA-092). Daran hängt auch der Versand der Mail zum Zurücksetzen (OA-173).
- Neu · Google-Anmeldung im Shop-Dienst: eigene OAuth-Anwendung statt Vermittler, Admin per Google ja oder nein, Bestandskonten vor dem Binden prüfen (OA-172; `docs/04-betrieb/konto-verknuepfung-befund-2026-11-14.md`, Abschnitt 4).
- Neu · Erwartung des Observability-Harness zum heutigen Chat (OA-176; `pin-rebase-2026-11-14.md`, Abschnitt 6, Entscheidung 3).
- Offengelegte Cloudflare-Geheimnisse erneuern (OA-166) und die 17 fälligen Erneuerungen (OA-169).
- Cloudflare AI Gateway freigeben oder gesperrt lassen (OA-165). Cloudflare-Umzug: Kostenweg und Token (D-021, OA-028, PR 184).
- Pillow 12.3.0 oder 13.0.0; leere Prüfsummen in `skills-lock.json` (OA-053). Kopfleisten-Glas auf `/kontakt` und `/leistungen` (OA-168).
- Vercel-Zahlung über 300,05 $ klären (Notiz vom 14.11.2026, 01:37 UTC).
- D-021 und D-022 ausdrücklich bestätigen (beide stehen als Vorschlag auf `main`).
- Rechtsseiten `/agb`, `/avv`, `/widerruf` und der KI-Satz im Chat: Freigabe bestätigen oder zurücknehmen (D-010, D-017).
- Hermes-Oberfläche aus dem öffentlichen Netz, Docker-Socket entfernen (D-019, OA-015, OA-016, OA-018); kein Volume-Prune.
- Datenschutzrechtliche Bewertung im Kundenprojekt (OA-026, fristgebunden; nur Verweis).
- Indexierung einschalten und Rolle von Apex, `www`, `.cloud` (OA-031); hängt an Rechtsform und Impressum (OA-009).
- Mailing: Grundlage je Empfängergruppe vor jedem Werbeversand (OA-001, OA-002, OA-005, OA-006).
- Architektur Suite und Arbeitsplatz (OA-044, OA-040); Cognee statt AgentMemory und LightRAG (OA-144); Composio-Status.
- Modellkennung im Chat (OA-048), Ausgabenlimit am Router-Schlüssel (OA-025).
- Supabase-Instanz und Bindung des Shop-Dienstes (D-013, OA-029, OA-067, OA-069). Regelbetrieb ohne offene Sitzung (OA-151).
- Welches Register führt (OA-061, Widerspruch nicht aufgelöst). Entscheidungen E1, E3, E4, E5, E6, E12; Livegang der Kasse.

Next Steps: Ergebnis der Live-Nachmessung zu PR 198 nachtragen, sobald es vorliegt; Actions-Budget und Auto-Merge klären; Anfrageweg entscheiden (OA-163); Google-Anbindung entscheiden (OA-172); nach jedem Merge diesen Abschnitt ersetzen.

## Shop-Projektbindung als Zulassungsliste · 14.11.2026
Die feste Prüfung `VERCEL_PROJECT_ID == prj_Po7jl…` in `apps/shop-api/vercel_app.py` und `namespace_operator.py` ist eine optionale, nicht geheime Liste `SHOP_ALLOWED_PROJECT_IDS` (kommagetrennt, Leerzeichen toleriert) mit einer gemeinsamen Funktion `project_binding_verified`. Nicht gesetzt, leer oder nur Leerzeichen/Kommas gilt als nicht konfiguriert und ergibt exakt das bisherige Projekt, nie „offen“. Eine gesetzte Liste ersetzt den Standard. Diagnosecode weiter `project_binding_unverified`, ohne ID oder Liste in Antwort, Ausnahme oder Log. `PROJECT_ID`, Namespace-Marker und Plan-Digest bleiben an `prj_Po7jl…` gebunden. Doku: `docs/deployment/environment-variables.md` Abschnitt 6 (Nachträge in den beiden Release-Dokumenten vom 31.10.).
Prüfstand lokal, da GitHub Actions seit 13.11. 22:25 Uhr ausfällt: `apps/shop-api/tests` Adapter 21/21 (vorher 13), Operator 16/16 (vorher 11); Standardverhalten ohne Variable per Vorher/Nachher-Schnappschuss byteidentisch (7 Umgebungen, 503-Wortlaut, Plan-Digest, Marker); 12 gezielt eingebaute Fehler (Mutationstest) wurden alle von Tests erkannt. `make check` grün. `make test` bleibt rot wie auf `main` (779 Tests, 132 Failures, 14 Errors; dieselben 36 Tests vor und nach der Änderung). Register-Hashes nur der 7 geänderten Dateien nachgezogen; die 39 vorbestehend driftenden Einträge in `config/acceptance-coverage.json` sind unverändert und nicht Teil dieser Änderung.
Nicht belegt: Live-Wirkung. Die Variable ist in keinem Vercel-Projekt gesetzt, bis dahin antwortet `ut7r` unverändert mit 503. Laut Auftrag liegen Datenbank und Variablen auf `prj_Po7jl…`; für `ut7r` fehlen sie damit weiter, ihre Übertragung ist ausdrücklich nicht Teil der Änderung. Welches Projekt kanonisch wird und wo die Produktionsdatenbank läuft, entscheidet der Inhaber.

## Laufzeit-Qualitätsprüfung mit Playwright für Python · 08./09.11.2026
`tools/page_quality_audit.py` (Playwright für Python, Chromium) prüft alle 43 öffentlichen Seiten in 1440 und 390 px sowie in NL/FR/EN: Titel/Beschreibung/Canonical/robots/JSON-LD, eine H1, Bilder (alt, Verzerrung), Überlauf, Bedienziele ≥ 44 px, sichtbarer Fokus, Reduced-Motion, Token-Verstöße (Reinweiß, grelles Lime), Schriften, Konsole/Netz, interne Links und den Textkontrast per Pixelmessung (Text ausgeblendet, gerenderter Hintergrund abgetastet). Aufruf siehe Kopf der Datei; `tools/page_quality_report.py` fasst Läufe zusammen.
Behoben: Shop-Navigation überlagerte sich bei 390 px (Einträge schrumpften); Brotkrume bricht um statt zu scrollen, Ziele ≥ 44 px; Bedienziele in Shop-Aktionsleisten, Einwilligungs-Checkboxen, Related-Links; Beschreibungen auf ≤ 160 Zeichen begrenzt (nur Meta, Seitentext unverändert); JSON-LD für Kategorien und Werkstattsuche; `lang` im Shop bleibt `de`, weil der Shop keine NL/FR/EN-Texte hat (WCAG 3.1.1).
Nachtrag: Fehlerzustand der Vitrine (`/teileklar`) brach bei 390 px buchstabenweise um (Text in einer Spalte von drei); behoben, Prüfregel „Text bricht buchstabenweise um“ ergänzt. Textkontrast inkl. Verlaufstext (Pixelmessung) und EN-Lauf nach der `proxy.ts`-Änderung ausgewertet: ohne Befund. Zwölf weitere Unterseiten mobil gesichtet.
Ergebnis lokal: 0 Fehler, 0 Warnungen auf 86 Seitenläufen; Hinweise nur für die lokal nicht gestartete Shop-API. Nicht belegt: Prüfung gegen die produktive `.de`-Auslieferung und mit echten Shop-Daten, Screenreader-Test, Kontrast von Verlaufstext (Logo, Überschriften mit Verlauf).


# Aktuell · Abgleich Gesamtbeschreibung 08.11.2026 gegen `.de`-Ausgabe

Abgleich Seitenkatalog §16 gegen die gebaute `apps/web`-Ausgabe: `docs/09-final/gesamtbeschreibung-2026-11-08-abgleich.md`. Alle 39 bisherigen öffentlichen Routen liefern 200 (je eine H1, `lang=de`). Behoben: fehlende Canonical/Description/Robots auf `/anmelden`, `/registrieren`, `/teileklar/suche|kategorien|warenkorb|kasse|werkstatt`; Impressum um Registerangaben (Registerstelle Roermond, KvK, BTW) ergänzt, Rechtsform bleibt ausdrücklich unbestätigt; horizontaler Überlauf der Brotkrumen bei 390 px; veralteter Sitemap-Test auf die Next-Routen umgestellt. Neu: `/produkte/nex-agentic-aifly`, `/produkte/aifly-oracle`, `/produkte/skills-mcp`, `/portale` (43 öffentliche / 53 Routen; Registries, Zähltests und Quellinventar konsistent nachgezogen).

Prüfstand: `make check` 0 Fehler/0 Warnungen; `tsc --noEmit` sauber; Site-Tests 124 bestanden, 2 vorbestehende Fehler (`Unmocked import ./Storefront.css`, Komponente existiert nicht mehr); `tests.test_site_map` grün. `make test` bleibt rot (697 Tests, 37 Failures / 24 Errors): die 8 zusätzlichen Subtest-Fehler sind historische Hash-Pins in `config/acceptance-coverage.json` für absichtlich geänderte Dateien; sie werden nicht umgebunden, sondern vom unabhängigen Review neu erhoben.

Entscheidungen nach Bestpraxis (08.11.2026, Auftrag „entscheide nach Bestpraxis“): (1) PR nicht geteilt: die Arbeit ist an die Branch `claude/loving-albattani-4jp12a` gebunden, ein zweiter Branch bräuchte ausdrückliche Erlaubnis; das KI-Review-Gate (`max_diff_bytes` 64000) bleibt unverändert und blockiert diesen 88-KB-Diff weiter. (2) Auth-Tests an den tatsächlichen Vertrag gebunden: `proxy.ts` sperrt private APIs fail-closed (401), liefert private Seiten nur als datenlose Shell mit `no-store`/`noindex` und vertraut keinem Cookie (neu geprüft); der Oracle-Test erwartet die Markenschreibweise „AIFly ORACLE“. (3) CI: `react-site` erzeugt die öffentlichen Daten vor den Tests; der Storefront-Testharness ignoriert Stylesheets und prüft die Katalogabfrage statt des Kategorieaufrufs; `CatalogView` verwirft Antworten abgebrochener Abfragen. (4) Bildmotive folgen bereits der Zielseite (`lib/brand-media.ts`); behoben wurde der Rahmen (`cover` statt `contain`). Prüfstand danach: Site-Tests 126/126, Auth-Tests 19/19, `tsc` sauber; `make test` bleibt wegen der historischen Hash-Pins rot.

Offen (Owner siehe Abgleichsdokument): Rechtsform/Impressum final, Landing-/Stadtseiten (Suchbegriffe und Wettbewerbsanalyse nicht belegt), Komponenten-Showcase, Canonical-Domain `.cloud` vs `.de`, NeX2fly-Tarife, Hero-Video/Higgsfield-Guthaben, NL/FR/EN-Prüfung, Kontaktformular→Resend gegen echte Dienste, Gesamtabnahme. Keine Zahlung, kein Guthaben-Aufladen, keine DNS-/Datenänderung.

---

# Aktuell · führende Sites-Vorschau und nativer Hero · 04.11.2026

Führend ist ausdrücklich `appgprj_6ae7ad63df2081918a843f996caf9422` / nexify-ai-factory-20261101. Ausgangscommit 0bbce305fb7e11233a7824d5b509e8f9e49e5ea7; diese Revision bleibt im vorhandenen Auftrag P01–P26. Details: docs/contracts/migration-2026-11-04.md und docs/production/hero-requirements-2026-11-04.md. Keine DNS-, Datenbank- oder produktive Fachruntimeumstellung.

Auslieferungsumfang: echter nativer Hero als 25,17 s redaktioneller Schnitt mit gemeinsamem Ton/Bild, echtem Alpha, Original-Oracle-Compositing, acht Untertitelabschnitten und sichtbarem Transkript. Bedienelemente liegen unter dem Film; Tonstart, Pause, Lautstärke 0/Neustart und Untertitel im Browser geprüft. Endmaster −16,14 LUFS / −2,17 dBTP; Sprachbereich LRA 2,30 LU. Drei Glasbilder darunter bleiben. CTA-Kontrast und Forced-Colors-Fallbacks verbessert; zwei unzutreffende Textformulierungen korrigiert.

Die Vorschau ist keine vollständige Regieabnahme: kontinuierliche 30 s, natürlicher NeX-Gang, Oracle-Performance statt Originalebene, Keykanten sowie menschliches Hören/Identitäts-/Phonem- und Geräteabnahme offen. production_accepted/lip_sync bleiben false. Reviewdateien liegen außerhalb von Next-Public, werden nur mit NEXIFY_OWNER_CINEMA_PREVIEW=1 paketiert und nur für die bestätigte eigentümerprivate Sites-Audience ausgeliefert; das Flag ist keine Authentifizierung. Native Sites-Veröffentlichungsbelege sind für den Auslieferungsstatus maßgeblich.

Verifikation: offizieller Build, Default-Ausschluss und sechs identische Assethashes im privaten Paket; 118 Site-Tests und make check bestanden. Sechs CSS-Breiten 320–1920 plus DE/NL/FR/EN bei 320 ohne horizontalen Überlauf, Video und Toolbar enthalten. Unabhängiger Quell-/Medien-/Governance-Review. Gesamtgate weiterhin rot: 697 Tests, 79 Failures / 52 Errors / 14 Skips; historische Nachweise, fehlendes httpx/Pillow-/Toolchainabgleich offen. Node 24.22.1 / pnpm 11.25.0 weicht von deklarierter 22.23.4 / 12.15.0 ab. Keine Gesamtmigration-/Commerce-/Rechts-/Live-KI-Abnahme.

Cart-Recovery als versionierter Kandidatenpatch mit 34 neuen Offlinefällen und 14 bestehenden Recoveryfällen erhalten; aus aktiver Runtime genommen. Unabhängiger Review fand ungelöste Mengenlimit-/Checkout-/Clientrevisiongrenzen; kein stiller Commerce-Livegang. Higgsfield: drei begrenzte Aufträge, 645 Credits; bestätigter Rest 145. Originale und frühere Fassungen erhalten.

Nächste Schritte: ursprüngliche Regie- und menschliche Ton-/Identitätsabnahme schließen; echte Tenant-/Session-/API-/Store-, Worker-, Restore- und Releaseketten gemäß bestehendem Register herstellen. Keine Änderung von Gates oder nachträgliche Umdeutung alter QA-Belege.

---

## Erhaltene Vorstände

# Aktuell · FACTORY-Markenausgabe · 02.11.2026

Eigentümerprivate Sites-Fassung: vollständige neue Unternehmenssprache auf 39 öffentlichen Seiten, 81 Sektionen und DE/NL/FR/EN; Metadaten und 52 Textmodule folgen denselben Quellen. Drei Agenturfelder, klar gefasste Projektpakete und getrennte Produktwelten. NeX2fly-Zugang verweist zur FACTORY, kein behaupteter TEILEKLAR-Kontoverbund. AIFly ORACLE einheitlich benannt. Statische Website-Beratung nutzt nur die übergebene öffentliche Seitenprojektion; kein Modell, keine Serveranfrage, keine Geschäftsausführung.

Gestaltung: Text links, begrenzter randloser 16:9-TV rechts, warme Glas-/Metallvideos wiederhergestellt. Drei Fachfilme in 3:2 und eine 10s-Heromontage mit KI-freigestellter Ableitung des ersten Gehporträts. Originale erhalten; verworfene Atelierfamilie separat archiviert. Stumme Montage ist kein natürlicher Geh-/Sprechfilm und kein Lippensynchronitätsnachweis. Echte 30s-Performance ist am Runway-Guthabenlimit blockiert; keine Aufladung oder Ersatzgeneration durchgeführt. Alle 52 Performance-Module bleiben pending/not_approved.

Messung: acht gleichursprüngliche Browser-CSS-Viewports mit 320,390,820,821,1024,1348,1903,2560px, kein horizontaler Überlauf. Desktop-Chatabstand24px auch bei Tastatur-Min-/Maxbreite; kompakter Hero stapelt. Lokaler Marketingdialog liefert geprüfte Seitenkarten. Unabhängiger Quell-/Marken-/Mediendelta-Review; tatsächliche Browserprüfungen sind enger als ein Geräte-/Screenreader-/WCAG-Gesamtnachweis.

Prüfstand: offizieller Sites-Build, TS/Lint und 118 Site-Tests bestanden (einschließlich 12 fachlicher Tests der lokalen Beratung). 7 SDK/Serverchat-Tests, 33 Offline-BigBuy-Integritätsfälle, 10 Sitemap-, 7 Assistant-Copy- und 5 Hero-Vertragsprüfungen bestanden. Vier MP4s mit ffprobe und vollständiger Dekodierung geprüft. make check bestanden. Vollkette729Tests:57Failures/9Errors/14Skips; make clean-check bleibt deshalb rot. Historische Quell-/Browser-/Reconciliation-Nachweise werden nicht blind umgebunden. Node24.22.1/pnpm11.25.0 weicht weiterhin von deklarierter Toolchain ab. Keine Gesamtplattform-/Rechts-/Providerfreigabe.

Next Steps: private Version aus exakt gebautem Quellcommit bereitstellen und nativen Deploymentstatus prüfen; echten Sprecherfilm erst nach aufgehobenem Dienstlimit produzieren; veraltete Systemnachweise fachlich neu erheben. Rechtsregister-/Katalog-/Live-KI-/Zahlungs-/Kalender-/Mandantennachweise bleiben eigenständige offene Auditpunkte.

---

## Historische Arbeitsstände

# Aktuell · Inhalte und Katalogintegrität · 02.11.2026

32 redaktionelle Seiten / vier Sprachen und67 Fachabschnitte neu gefasst; sieben Rechtsseiten unverändert und weiterhin offen. Home/Hero/Erklärmodule sind auf gemeinsame Seiteninhalte gebunden. Vite-Katalog/Suche/Detailansichten, Sprachtexte, Bildfehler und unbekannter Bestand korrigiert; HTML-API-Fallbacks gelten als Fehler. BigBuy wird nur nach vollständiger Validierung atomar veröffentlicht. Keine realen Imports/DB-/Zahlungs-/DNSänderungen.

Kanonischer Draft-PR60: 77d80462944ed2320ad563cd1140036b95bf21ba, basiert auf main ad4bbf69243b7d489594a8c2d20d7cf838dcf14c. Main ist unverändert; seine bestehenden Medien-/Authkomponenten wurden in den angepassten Varianten erhalten. Interner Volltext-Prüfdatensatz ist nicht Teil des PR. Sites bleibt eine getrennte eigentümerprivate Arbeitsausgabe.

Prüfung:102 Site-Tests,80 gezielte BigBuy-Checks, Site-Build und make check bestanden. Vollkette729 Tests:54 Failures/9 Errors/11 Skips; verbleibende gebundene Nachweise sind veraltet. make check-arch ist rot. Keine Gesamtabnahme. Gemessene Hosttoolchain Node24.22.1/pnpm11.25.0 weicht vom deklarierten22.23.4/12.15.0 ab. Details/Quellen/Owner/nächste Nachweise: docs/research/content-product-blueprint-2026-11-02.md.

Next Steps: Runtimeowner bestätigt Store-/Namespacebindung und stellt nach kontrolliertem Preflight den echten Katalog wieder her; Katalogowner verifiziert aktuellen Providervertrag und vollständige Daten; Medienowner prüft echte Artikelbilder; QA erneuert die tatsächlich betroffenen Browserbelege. Betreiber-, Rechts- und Preisfakten bleiben unentschieden, bis belegt. Interner Wiederprüfungspunkt03.11.2026,12:00UTC, keine Kunden-SLA/Automation.

---

## Erhaltene Vorstände

# Lokales Setup, GitHub und Vercel-Preview · 28.10.2026

Current State: lokale Toolchain mit Node22.23.4 und pnpm12.15.0 über
`npm exec` eingerichtet; Workspace nach `pnpm-lock.yaml` mit
`--frozen-lockfile --ignore-scripts` installiert. `.venv` enthält ausschließlich
Pillow12.3.0 und NumPy2.3.5 aus den SHA-gepinnten Linux/Python3.12-Wheels;
`.venv/` ist jetzt ignoriert. Lokaler Stack läuft auf Loopback 3003/3004/3005;
Vite liefert 200, Startseite im Browser geladen, keine Browserkonsolenfehler.
Site-Build und `make check && make test` bestanden; 482 Python-Tests. Der
Produktionsbuild meldet weiterhin einen >500-kB-Chunk als nichtblockierende
Performancewarnung.

GitHub: `origin` zeigt auf das kanonische Repository; `gh` authentifiziert als
`nexifyai-dev`, letzte gelistete CI-/Triage-Läufe erfolgreich. Deployment-API
Read ist für diese Integration mit HTTP403 nicht freigegeben.

Vercel: lokale CLI65.2.0 sagt `Logged out`; weder Projektverknüpfung noch
Deployment oder Einstellung geändert. Die dokumentierte `.de`-Domain und die
historische `vercel.app`-Vorschau waren aus diesem Container nicht per DNS
auflösbar. Daher kein aktueller Projekt-/Deployment-Read-back und keine neue
Preview-Abnahme. Registrierung des externen Blocks in der lokalen
Remediation-Queue wurde von deren Policy mit
`local_remediation_operation_rejected`/`approval_granted=false` abgewiesen;
kein Gate umgangen und kein Queueeintrag behauptet.

Next Steps: Owner D06 stellt eine autorisierte Vercel-CLI-Sitzung bereit und
liest Projekt-ID/Scope, Preview-Deployment sowie Branch-Zuordnung erneut zurück;
danach ausschließlich den genehmigten Previewpfad prüfen. Technischer
Follow-up-Zeitpunkt: 2026-10-28 16:45 UTC (keine Kunden-SLA). Quellen:
`config/integrations/vercel-agent-setup.json`, `vercel.json`,
`config/remediation-policy.json`.

## IDENTITY-HERO-01 · akzeptierte V1-Komposition · 28.10.2026

- Basis d92ee1b; bestehender Mailstand unverändert erhalten. Gemeinsamer React-Hero statt privatem HTML/iframe: akzeptierte Originalfiguren bytegleich, zentrale zusätzliche Bühnenfarben ohne Änderungen vorhandener Tokenwerte, DE/NL/FR, Unternehmensbeschreibung und Anfrageaktionen erhalten. Bilder bleiben ausdrücklich Zwischenlösung, kein Video-/Providerabschluss.
- Unabhängige Sol-Prüfung reproduzierte zwei echte Layoutprobleme: enger Desktop-Zwischenbereich und200%Textvergrößerung. Früheres Stapeln bis700px sowie intrinsisch wachsende Desktopbühne korrigieren Überlappung/Beschnitt. Normale große Desktopproportion bleibt erhalten, mittlere Container dürfen höher wachsen. Geschlossener Assistent in normalem Fluss statt über Storytext.
- Vite/Next jeweils24 normale/Grenzansichten plus15 echte200%-Fälle (DE/NL/FR320/390/Desktop,Seitenleiste,Grenze), ursprüngliche PNG-HTTP-Hashes, Tastatur/Anfragewege/Navigation und0externe Requests/Laufzeitfehler. Unabhängige39Grenz-/Zoomfälle zusätzlich geprüft. Öffentliche Regressionen und Abschlussgates im lokalen endgültigen Übergabebeleg, keine Behauptung einer vollständigen Assistenztechnik-/Produktionsabnahme.
- Next Steps: finalen lokalen Releasekandidaten nach Prüf-/REA-/Reviewbeleg an Releaseowner übergeben; Push/CI/Deployment/Domain sind in diesem Schnitt nicht ausgeführt. Reale Videos, übrige Medienabnahmen und fachliche öffentliche Releasegates bleiben eigenständig offen. Keine Mail-/Paperclip-/Server-/Secret-/DNSänderung und kein erneuter Library-Upload.

## MAIL-LOCAL-01 · Mail-Arbeitsplatz · 28.10.2026

- Basis c58ad90 bleibt erhalten; derselbe Webwriter, disjunkte Kern-/UI-Umsetzung und unabhängige Sol-Gegenprüfung. Keine Pushes, externen Uploads, CI, Provideraufrufe oder Produktionsänderungen.
- Gemeinsame geschützte Workplace-Komponente: getrennte Gmail-/Hostinger-Konten, sichere Text-/Anhangmetadaten, Reply/Reply-all/Forward, getrennte Signaturen, persistente vorbereitete Entwürfe mit wieder lesbarem Inhalt, lokale Read-/Task-/Archiv-Undo-Zustände. Bestehende Session-/Rollenprüfung und dieselbe Datenbank, kein SMTP-/Legacy-Mailpfad.
- Echte Next-Mailroute bleibt503 hinter unveränderter Auth-/Membershipgrenze; keine Fakeverbindung oder Versandanzeige. Fehlende App-Connector-/Mailbox-/Transportbindung, Dispatchzustände und Provider-Reconciliation bleiben offen. Der separat gemeldete Hostingerwebhook ist disabled, kein Handler im Checkout; keine Reaktivierung oder DNSänderung.
- Fokussierte lokale Unit-/Browser-/Typprüfungen und Nachprüfung der korrigierten Sol-Findings am endgültigen Stand; exakte Resultate im lokalen Übergabebeleg. Full- und Browserbelege sind synthetische Tests, keine privaten Providerdaten oder reale Zustellabnahme.
- Next Steps: Mail-/Identity-/Runtimeowner verifiziert bestehende Konto-/Mailboxrechte und tatsächlichen API-/Webhooktransport; vor Dispatch unknown-outcome-Abgleich und begrenzte Provider-Retries. Akzeptierte Identity-V1-Herogestaltung als gesonderter nächster Codeauftrag, unveränderte Originalassets, noch kein Rollout.

## Rechtsfußzeile · FR-Nachweisergänzung nach 689e140 · 28.10.2026

- Beide CIs an689e140 abgeschlossen erfolgreich. CodeRabbit am selben SHA terminal; künftige automatische Reviews laut dessen Kommentar pausiert, nicht durch uns umgestellt. Cubic4402490598 bestätigt eine Abdeckungslücke: vorhandene FR-Texte waren nur statisch geprüft, kein belegter Laufzeitfehler.
- Gebündelte Test-/Nachweisergänzung ohne Produkt-/Rechts-/Grafikänderung: Vite und Next jeweils216 Ansichten (36Routen,DE/NL/FR,320/1280) und12 echte Interaktionen. Exakte lokalisierte Linktexte, Vorbehalte, Kontextziele, native Klappbereiche, Tastatur, Zurück/Reload und ausbleibende externe Requests tatsächlich messen.
- Bestehenden Nachweisverifier um vollständige FR-Matrix, Rendereridentität, direkte Quellbindung und Kontextprojektion ergänzen; negative Regressionen gegen fehlende FR-Fälle, veraltete Messquellen und falsche Shoprechtsziele. Die zuvor geforderten Hashbindungen bleiben vollständig.
- Consent-/Auth-/Resize-Belege behalten ihren eigenen engeren Testumfang. Keine vollständige FR-Provider-/Rechts-/Assistenztechnik-Abnahme und keine gestalterische Freigabe der verworfenen Szenen. Kein Main-/Produktions-/DNS-/Credentialeingriff, keine Threadauflösung oder zusätzliche Providerkosten.

## Rechtsfußzeile · Reviewkorrekturen nach 3b19982 · 28.10.2026

- Cubic-Review5684839133 am exakten3b199825 selbst gelesen. Bestätigt: neue Direktnavigation braucht aktiven TEILEKLAR-Rechtskontext; drei neue Test-/Belegdateien fehlten im zentralen Hashregister. Beides im bestehenden Footer-/Nachweisumfang korrigieren und erneut prüfen.
- TEILEKLAR verwendet die eigene vorhandene Route /teileklar/rechtliches und benennt fehlende freigegebene Shop-Rechtstexte. NeXify behält /impressum und /datenschutz. Diagnose-Consent bleibt unverändert; keine Betreiber-/Vertragsdaten erfunden.
- Vollständige aktuelle Hashbindung aller referenzierten sicheren Implementierungsdateien im Verifier erzwingen; nur der rekursive Registerselbsthash bleibt ausgeschlossen. Fehlende/veraltete Bindungen erhalten Negativregressionen, kein bloßer Nachtrag dreier erwarteter Werte.
- Locatorvorwurf nicht reproduziert: .footer-legal kapselt seinen einen Klappbereich; Alle Seiten liegt außerhalb. Zusätzliche echte Count-/Kontextprüfungen sichern diese Grenze, keine blinde Selektoränderung. Gespeicherte Belege erst nach realen Wiederholungsläufen erneuern.
- Szenenbilder weiterhin ausdrücklich gestalterisch abgelehnt; keine neuen Medien in diesem Delta. Vollständige Rechts-/Lizenzinhalte und unabhängige reale Releaseabnahme bleiben offen. Keine Threadauflösung, Main-/Produktionspromotion, DNS-/Credentialaktion oder Löschung.

## Rechtsfußzeile · lokales Delta nach d98c106 · 28.10.2026

- Derselbe Footer für Vite/Next: ständig sichtbare echte Links zu Impressum/Datenschutz, zusätzlicher nativer Klappbereich mit Fokus, aria-expanded und DE/NL/FR-Texten. Bestehende Gruppen, Consent und Fachhinweise bleiben erhalten.
- Lokal optimierte Vite- und Next-Ausgabe jeweils 144 Footeransichten und 8 Tastatur-/Direktlink-/Zurück-/Reloadfälle ohne externe Requests oder Laufzeitfehler. Sourcebindung: evidence/legal-footer-2026-10-28/. Consent-, Resize- und kritische Browserbelege nach Quelländerung tatsächlich neu ausführen; keine bloße Hashersetzung.
- Nicht vollständig: keine öffentliche Lizenzroute/-inventur und nur notice-only Rechtsseiten. Daher kein erfundener Link und keine Zusage vollständiger Pflichtangaben. Der gewünschte endgültige Verweistext bleibt von tatsächlichen geprüften Dokumentinhalten abhängig; aktuelle UI benennt Prüfung/Freigabe. REC-LEGAL-FOOTER-01 hält Owner, nächsten Schritt und Abschlusskriterium fest.
- Keine Rechtsgarantie, Produktivabnahme, Main-Merge, DNS-, Credential- oder Löschaktion. Push erst nach finalen Gates/Review und aktuellem Kosten-/Writerabgleich, höchstens ein konsolidierter Lauf.

# Freigegebene CSP-Meldewegkorrektur · lokaler Prüfstand vor PR46-Übertragung

Rückweg3cad2ad bleibt auf preservation/reviewed-scenes-3cad2ad-20261028 erhalten.
Neue ausdrücklich bestätigteFreigabe28.10.13:48UTC:direktenCSP-Meldeweg entfernen,
ALLESchutzregeln erhalten;geprüftenStandPR46 und maximal5USD zusätzlicheActions.
Nurreport-uri/report-to undReport-ToHeaderentfernt;9Schutzdirektiven sowieandere
Header/Configwerteidentisch. DreiFokustests undechterlokalerProduktionsbrowser
bestätigenweiterblockierteFremdskripte/-bilderbei0externenRequests. Abschließende
Gates/SHAbindung/ReviewundRemoteergebniswerdengetrenntgeführt. KeineDNS-/Konto-/
Credential-/RepoLösch-/MainMerge-/ProductionPromote-/Uploadaktion freigegeben.
HistorischeAutoren bleiben erhalten;neueArbeit nutztverifiziertesnexifyai-dev.
NextMap-Finalassetzuordnung sowieechteProvider-/Tenant-/Releaseabnahmen offen.

# Bildzwischenlösung und öffentliche Build-Konfiguration · ab 702e670

NeuestePriorität: Bilder zuerst.49Slots/36öffentlicheRouten mit12Pascal-,16NeX-
und21AIFly-Referenzen; echte unveränderteOriginale angesehen/hashgebunden.
HeroohnealteOrb; keinPlayversprechen, Filmfreigabenweiteroffen. Aktueller
DE/NL/Mobil/Desktopnachweis und unabhängiger Bildreview werden zum Endcommit
gebunden. RootTypeScript/Build-/Lintchecks ergänzt; SentryTS2353 lokal NICHT
reproduziert, daher keinVercelheilungsnachweis. Autor-/ClerkDNS-/CSP-/Livegates
bleibenoffen. KeinPush/CI/Deployment/Upload/ENV-/Credential-/DNS-/Serverwrite.

Sauberer Ausgangscommit702e670 vorhanden. Kanonische Vite-Root-/Outputkonfiguration
korrekt; Next-API-Rewriteverdacht nicht bestätigt, keine Routingänderung.
Bestätigter Offlinefehler: Companion-Original fehlte in der Inline-Liste und
dekodierte im frischen Standalone-Browser mit0Pixeln. Liste korrigiert, Original
unverändert;10Buildertests und tatsächliches512×512-Decoding grün. Keine CSPänderung.
PostHog: bestehender SDK-Test jetzt zusätzlich gegen optimierte Vite-Ausgabe;
Next ebenfalls echterProduktionsbuild. Je8Checks/4lokal abgefangeneSendeversuche,
synthetischeRelease, keine externenEvents; keinDashboard-/Symbolicationnachweis.
REA, unabhängige Delta-Gegenprüfung und Gesamtgates werden exakt zum Endcommit
geführt. KeinPush/CI/Deployment/Upload/ENV-/Server-/Credential-/Domainwrite.
GesamtstatusweiterREQUEST_CHANGES, CSPfreigabe und echteAuslieferung offen.

# Sentry-Stichprobe: gezieltes lokales Delta nach Vollreview

Ausgangspunkt e058ac3527c1348a1eaa086143135c74b7553cf5 bleibt erhalten.
C-P2-SENTRY-COUNT: Das manuelle Hilfsskript meldet eine begrenzte, ausdrücklich
unvollständige Issue-Stichprobe statt einer falschen Gesamtzahl. Null Treffer
beweisen keine Fehlerfreiheit; Source/Projekt/Abrufzeit und Timelineparameter sind
explizit, synthetische Health-Events und Browserexceptions bleiben unklassifiziert.
Keine externen Requests, Rohdaten, Server-/Secret-/CSPänderungen oder Auslieferung.
Lokale Fixtures und Delta-Gegenprüfung werden an einen eigenen Endcommit gebunden;
das Vollreview für e058 bleibt unverändert und wird nicht auf neue Hashes umgedeutet.
C-P1-CSP bleibt gesperrt/offen; Gesamtstatus REQUEST_CHANGES.

# Vorhandener Katalog und lokaler Produktbild-Batch

Current State: v11/8975ba4 unverändert auf eigenemRemotezweig gesichert.
Draft-PR-Anlegen wurde automatisch abgelehnt; Root hat die direkteFreigabe
angefragt. Kein Retry oder alternativerVeröffentlichungsweg. OrdinaryPush-CI
40542261401: React/Next/OpenAPI/PostgreSQL grün, Repository fehlgeschlagen:
ignored.generated/public-site.json wurde nicht erzeugt. Fehler im sauberen
8975-Auszug reproduziert, bestehenderGenerator davor macht denselben gebundenen
Resizecheck grün. Aktueller CI-Workflow lokal entsprechend korrigiert und
Pillow12.3.0 für Bildtests per offiziellercp312LinuxWheel-SHA gepinnt.
V11Preview BLOCKED lautParent16:46Z; Produktionsstand219f244 bleibt getrennt.

In Progress: vorhandeneAPI meldet3720; 20erStichprobe und tatsächlicher2erAbruf
sind keineVollabnahme. NativeReadOnly-Snapshotanbindung in vorhandenerHeadless-
Shell: Quellhash/Abrufzeit, strikteEuro-Haupteinheitenprüfung, SKU/EAN, stock0,
DE-QuellenkennzeichnungauchinNL/FR, immerpartiellePagination. Es gibt keine
aktuelleSupplier-Freshness-/Kauf-/Passungsfreigabe.13Adapter/HTTPtests grün,
4synthetische+4tatsächliche2SKU-Browser/HTTP/Datei-Fälle amfinalenCode bestanden.
Authentifizierte403-Negative haltenCart/Order/Paymentauchdirektserverseitigzu.

ParallelerB-Batch liefert tatsächlicheRGBA-/Weiß-/CIfarb-Derivate für vorhandene
belegteAlphaoriginale;30isolierteTests inklusiveCrash/Restart/CAS/Link-/Replay-
Metadatennegatives grün. KeineSegmentierung. Zwei echte1200x1200RGBOriginale
wurdenprivatbytegleichbehalten und mangelsZuordnung/Lizenz/Farbraum quarantiniert;
Replaygleich, keine echtenDerivateoderBildanzeige. SolbefundeHardlinkclobber,
rehashteEffektfreigabe undASnapshot-/Parentlink-/EOFDeadline geschlossen.
Keine Rohbilder/Katalogexporte imRepo; technischeMetadaten getrennt vonTests.

Nachweis:431Python-/31Node-Tests,check/test/e2e/arch/clean,TS/Produktions-/
Standalonebuild grün.13Cart-/4synthetische-/4tatsächlicheKatalogfälle und
108frischeResizechecks samtRuntimefehlererfassung bestanden; injizierter
Runtimefehler wurdemitExit1abgewiesen. GetrennteViteCaches jeBrowserlauf.
Sol45Fokustests/A+BFindingsnachprüfung grün; finalerHashreadback folgt.
FinaleDomainnexifyai.cloud lautParent16:32/17:10ZHTTP404, nichtabgenommen;
keinDNS-/Hostingwechsel. AnderesRepo/übersprungeneBackendprüfung istseparat.

Next Steps: finalerSolCommit-/Paketreadback; Paket mitgleicherLibraryidentitätversionsgesichert ersetzen. Weitere
Remoteaktionen wartenaufdiekonkreteFreigabe. Noch benötigt: Fortsetzungs-/Sync-
undSupplier-/Preis-/Passungsbelege, Bildzuordnung/Rechte, verifiziertesModel-/
Gewichts-/Konvertierungs-/Lizenz-/Hostpaket fürRGBFreistellung, Audiofreigabe.
DieCLI-Stufen sind ausführbar, aberkein neuerDaemon/Controllerjob automatisch
registriert; keine produktiveKunden-/Provider-/Gesamtabnahme daraus abgeleitet.

# PR39: strikter Medien-Skriptvertrag

Current State: PaketVersion10/26f9128 in derselbenLibrary gesichert; vorherige
CI-/BigBuy-/Cart-/Resizekorrekturen bleiben unverändert. Noch offene bestätigte
PR39-4388404318-Abweichung separat geschlossen: numerischerVergleichstext42
wurde vorher akzeptiert; jetzt müssenVergleichs-/Hero-Skriptmappings exakt
DE/NL/FR mitnichtleerenStrings enthalten. UngültigeContainer führenzumFehler,
keine stillschweigendeStringkonvertierung.22Fokustests grün inklusive96Wert-
und20Containergegenproben. Kein Stimme-/Skriptinhalt-/Asset-/Preiswechsel,
keineGenerierung oderFreigabe ausdemValidator abgeleitet.

Nachweis: unabhängigeSolprüfung wiederholte22Vertragstests/CLI ohneFinding.
387Python-Tests,check/test/e2e/arch/clean grün;UI/Assets unverändert,
beideBrowser-Evidenzcheckerweitergrün.

Next Steps: exakterCommit-/Hashreadback;
versionsgesichert dasselbePaket aufVersion11fortschreiben. EchteBigBuy-/Medien-
undProvider-/Assistenztechnikgates bleibenoffen; keineweitereRemoteauslieferung.

# PR40: lokale Folgekorrekturen und tatsächlicher Deploymentstand

Current State: BigBuy-Vorstufe65a8e8b auf lokalem CI-Fix3e92663 gesichert.
Remote main219f244 vom27.10.15:25:02Z hat denselben Gitbaum wie geprüfter69ed580;
Vercel dpl_7cJkhVUzjZjxhZzxbtaQwFbeeq1V ist production READY. Dies waren
fremde Merge-/Deployaktionen, keine eigene Produktionserlaubnis oder fachliche
Abnahme. Der alte69Preview-Autorzugriffsblocker wurde nicht durch uns umgangen.

In Progress: bestätigter Cartablauf-/Creation-Keyfehler mit realem Browserlauf
reproduziert. Erfolgreiche Keys werden nicht für neueCarts recycelt; ungewisse
Createausgänge behaltenKey und benötigenReadback. AutoritativesGET410/cart_expired
öffnet nachRücklesung nur den bewusstenNeustart; unbekannteFehler bleiben gesperrt.
13 lokale Browser/API/SQLite-Fälle bestanden inklusive4neuerExpirykreise.
Resizeprüfer akzeptierte zuvor36ungebundeneRouten; jetzt UI/CSS, beidegeladene
Schriften, Tokens, Datensnapshot, Lockfile und Messskript vor/nachgebunden.
UnabhängigerSolbefund ergänzte Globals/Fonts unddirektesGET410; nachgebessert,
frische108Messungen/36Routen und25unabhängig ausgeführteFokustests grün. Registerpin nachRenderer warveraltet;
neuerTest prüft sämtlicheDateipins, abschließenderRefresh nachRendering.
Keine echte Bestellung, Zahlung, Providerfreischaltung oder externeMutation.

Nachweis:385Python-/31Node-Tests,check/test/e2e/arch/clean,Typecheck,
Produktions- undStandalonebuild grün.13Shopfälle,108Resizeprüfungen,
frischerCritical-/SSE-Browserlauf und4echteProduktionsassets ohneTestartikelmarker.
Alle130bisherigenRegisterpins unabhängig bestätigt; kein offenesCodefinding.

Next Steps: finalerCommit-/Hashreadback durchSol;
versionsgesichertesPaket. CI-Fix bleibtlokal, nochkeinRemoteCI-Erfolg behauptet.
BigBuy-Bildmodell/Rohdatenzugriff/Kommerz-/Fitment-/Publikationsgates offen;
keine Vorstufe wird alsvollständigerShop oderfertigeBildproduktion ausgegeben.

# BigBuy: begrenzte lokale Rohdatenaufbereitung

Current State: 3e92663 enthält den unabhängig geprüften CI-Setupfix, noch nicht
gepusht. Fremde Remoteaktion: PR40 wurde durch nexifyai-dev am27.10.15:25:02Z
zusammengeführt; main219f244 hat exakt denselben Gitbaum wie69ed580. Dies ist
kein von uns ausgeführter Merge und keine Produktionsabnahme. Weitere eigene
Remotewrites pausieren bis Writerabgleich. Kanonischer Vercel-Preview69ed580:
dpl_DPsitJWgNzJrTjL5TnbwjxvTFKmT BLOCKED, Git-Autorzugriff fehlt; keine Umgehung.

Current Local Delta: BigBuy ist die vom Nutzer gewählte Quelle. Neuer reiner lokaler
Batchschritt validiert explizit begrenzte Feedbytes, vorhandene Taxonomieauswahl,
SKU-/DE-Bindung und EAN-Strings; erstellt faktengebundene Textentwürfe sowie alle
Bildslots mit separaten Stagehashes. Stockänderung invalidiert keine Text-/Bildstage.
Keine Queue, kein Provideraufruf, kein Modell, keine Veröffentlichung, keine Löschung,
kein Verkaufs-/Fitmentversprechen. Quellenpreise werden nicht als Verkaufspreise
übernommen. Tests sind isolierte synthetische Daten, kein vorhandener Lieferbestand.
Historische Importercommits4a2cc3a/73f7eb7 und übergebene Produktionspfade fehlen
in dieser Umgebung; dokumentiert statt als angeschlossenen Adapter behauptet.
Small-Business-Quellprüfung stoppt mit Source unavailable: LICENSE; kein Skill
blind geladen. Projekt-Skills fünf Quellen geprüft; Kontextselektor begrenzt gelesen.

Nachweis:9 fokussierte Tests unabhängig durch Sol wiederholt;382 Python-Tests,
make check/test/e2e/check-arch bestanden. Stagekonfiguration bindet Tenant/Projekt.
Separat direkt gelesen: Productionalias steht inzwischen auf READY
dpl_7cJkhVUzjZjxhZzxbtaQwFbeeq1V/main219f244. Kein eigener Promote,
keine reale Funktions-/Providerabnahme daraus abgeleitet.

Next Steps: Remote-Writer-/CI-Fix-Abgleich; bestehende lokale Steuerung
erst nach nachgewiesenen Rohdaten-/Rechte-/Taxonomieeingängen anbinden. Bildprozess
braucht gepinnte lizenzierte Gewichte/Konvertierung/Hashes und Ressourcenbenchmark.
Draft bleibt unpublizierbar, bis einzelne QA-/Kommerz-/Fitmentgates nachgewiesen sind.

# PR40: exakter Upload und reproduzierter CI-Setupfehler

Current State:69ed580 unverändert auf eigenem Remotezweig
integration/reviewed-one-app-shop-20261027-69ed580, DraftPR40. Main bleibt2a552ed.
Push-CI40529125816: React/Next/OpenAPI/PostgreSQL grün; Repository scheitert an
ARCH009/019, weil Vite für den parserbasierten Standalone-Test nicht installiert
ist. Sauberer lokaler Zweifachnachweis: ohne Abhängigkeiten ERR_MODULE_NOT_FOUND,
mit den bestehenden gesperrten Abhängigkeiten grün. CI-Repositoryjob installiert
jetzt dieselben gepinnten Node22.23.4-/pnpm12.15.0-Workspaceabhängigkeiten wie die
bestehenden Buildjobs; keine Prüfausnahme oder neue Abhängigkeit eingeführt.
Next Steps: Änderung unabhängig prüfen, normales Fast-forward auf denselben
Integrationsbranch und CI am neuen exakten SHA prüfen. Vercel-Preview ist wegen
fehlendem Projektzugriff des Git-Autors NeXify-Automate BLOCKED; keine Identitäts-,
Mitgliedschafts-, Hosting- oder Abrechnungsänderung zur Umgehung.
BigBuy ist laut jüngster Nutzerentscheidung die gewählte Produktquelle. Dessen
inkrementelle Batchintegration folgt nach diesem CI-Schritt mit tatsächlichen
Taxonomie-/Zugriffsverträgen; keine echte Bestellung als notwendiger Test.

# Lokale Shop-HTTP-/UI-Anbindung

Current State: b08a7fc / PaketVersion8 als geprüfter Rückweg erhalten. Bestehender
HTTP-Server und TEILEKLAR-Shell verbinden nun Suche/Kategorien/Warenkorb und
persistent gesperrten Checkout-Entwurf. Sechs reale HTTP- und neun reale lokale
Browser/API/SQLite-Fälle inklusive DE/NL/FR, Cookiegrenzen, verlorener Antwort,
Readback, Reload und Backendprozess-Neustart bestanden. Nur isolierte Testfixtures;
normale Laufzeit hat keinen freigegebenen Katalog und keine Testartikel. Sol-Befund
zur404-Reconciliation behoben;373Tests und Gesamtgates bestanden.
Metadatenregression verhindert rekursive Register-Selbsthashes.
Auth7/Shell8/Node31 und Build grün. Neue Designwahl main2a552ed integriert;
Sourcevergleich bewahrt nur bestehende funktionale A11y-/Sprachkorrekturen.
Abschließender Quellen-/Commitfreeze wird gebunden.
DATA-001/ECO-001 aus Parentauszug zugeordnet; conditional-Kaufkonflikt offen.
Keine echten Artikel-/Preis-/Bestands-/Fitmentdaten, Orders, Zahlungen oder
Providerfreigaben erfunden. Neue native MCP-Leseevidenz bestätigt nexify-2→
srv1941843 authentifiziert, writable_verified false; keine Serverreparatur.
Next Steps: exakten Stand prüfen/sichern, danach bestätigten Medien-Skripttypfehler
separat korrigieren und unabhängige Seiten-/Portalteile fortsetzen. Keine parallele
Mediengenerierung; Root koordiniert reale Assets/Casting. Kein Astra.
Details: docs/contracts/local-shop-http.md.

# Lokale Shop-Warenkorbvorbereitung

Current State: geprüfter und ausgelieferter Quellen-/Medienstand a66a509 bleibt
als PaketVersion7 erhalten. Neuer begrenzter Warenkorbkern nutzt bestehende
visitor.Store objects/receipts, keine zweite Datenbank/Queue. Sechzehn synthetische
Regressionen bestanden, einschließlich Prozessabbruch vor Commit und Restart.
Keine HTTP-/UI-Anbindung, keine Artikel-/Preis-/Steueraktivierung, kein Checkout,
keine Zahlung oder Produktionssitzung. Sol-Review fand einen browserbekannten CSRF-Signierschlüssel; durch separaten
serverinternen Schlüssel korrigiert. Zweiter Befund zum Schlüsselverlust durch
gebundene Schlüsselgeneration korrigiert; beide separat Sol-nachgeprüft.
check/test/e2e/check-arch/clean-check mit362Pythonfällen bestanden;
abschließende Commitbindung folgt. Kein Gesamtshop-/Produktionsabschluss.
Next Steps: Findings beheben/nachprüfen, Gesamtgates, dann lokale sichere
Testadapter-/UI-Anbindung; autoritativer Shop-/Tenant-/Katalogstand bleibt nötig.
Server-/Brainarbeit liegt exklusiv beim getrennten Server-Codex; keine Hook-,
DNS-, Auth-, Server- oder Domainänderung durch diesen lokalen Schritt.
Details: docs/contracts/local-shop-cart.md.

# Wiederaufnahme: Quellen- und Medienvertrag

Current State: geprüfte Version6 auf079057f erhalten; laufendes Delta schließt
zwei unabhängige Reviewbefunde: widersprüchliche Stimmenfreigabe in der
API-Dokumentation und fehlender CLI-Check der Presenter-Konfiguration. Historische
Voice-IDs bleiben unbestätigt; keine Generierung, Veröffentlichung oder Kosten.
Quellenregister im bestehenden acceptance-coverage erweitert, Ansicht generiert
und Herkunft/Owner/Referenzen mit negativen Tests gesichert. Tatsächliche interne
Routen sind geplante Ziele ohne verbundenes Backend; kein fertiger Arbeitsplatz.
Referenzvideo materialisiert und Bild/Alpha/Audiopegel geprüft; kein verlässliches
Hörurteil, keine Assetabnahme. Kein Astra. check/test/e2e/check-arch/clean-check
bestanden,346 Pythonfälle. Fokussierter Medienfix separat Sol-geprüft; abschließende
Registerprüfung noch laufend. Kein vollständiger Produkt- oder Liveabschluss.
Next Steps: abschließende Sol-Prüfung des exakten Deltas, Master1.2-Originaldateien
abgleichen und bestätigte Seiten-/Shop-/Portal-/Arbeitsplatzlücken fortsetzen.
Veröffentlichung beauftragt; tatsächliche Auth-/Tenant-/Provider-/Restoregates
bleiben erforderlich. Kein Server-/DNS-Cutover und keine neue Zugangseinrichtung.

# Lokale Konsolidierung des aktuellen Main

Current State: eigener Worktree integration/current-main-2026-10-27 integriert
geprüften Kandidaten2c24073 mit Main2a552ed auf gemeinsamem Vorfahr a19cd503.
Vier Konflikte quellentreu aufgelöst; Headerkonto-Zugang bleibt route-lokal,
Auth-/Locale-/Fehlergrenzen und alle bisherigen Backendkorrekturen erhalten.
337 bestehende plus2 Main-Regressionen,31Nodefälle und gemeinsameBrowserprüfungen
bestanden. Next Steps: exakten Mergehash unabhängig prüfen. Reale Provider-/Runtime-/Restore-/Accessibilityabnahme weiterhin offen.
Keine Remoteveröffentlichung oder neue Kosten. Kein Astra eingesetzt.
Details: docs/contracts/current-main-integration.md.

# Suite-Trialregel lokal korrigiert

Current State: auf245e96e start_trial ohne Funding; bestehende Aktivierungsprüfung
vor Replay, einmaliger86400Sekundenstart. Keine Credits, Preise, Authrechte oder
externen Adapter geändert. _funding/reserve/claim_execution quellenidentisch.
Sieben fokussierte Regressionen plus bestehende Domain-/Restoretests und unabhängige
Gegenprüfung. MASTER12-TRIAL-01 lokal fortgeschrieben, Gesamtfall weiterhin offen.
Next Steps: reale Adapter-/Identity-/Tenant-/Release-/Restoreabnahme nachweisen;
kein Handoff oder lokales Testergebnis aktiviert Produktion.
Details: docs/contracts/suite-trial-local.md.

# Quellenpräzisierung für PaketVersion4 · lokal

Current State: geprüftes Entscheidungsdelta c09204c wird mit PaketVersion3
zusammengeführt. Neue Dokumentpräzisierung: Suitebeginn vor Funding ist bereits
verbindlich beschrieben; keine neue fachliche Nutzerentscheidung nötig.
D06 korrigiert künftig die technische Abweichung, D02 prüft Kostenumfang.
In diesem Schritt keine Verhaltens-, Preis-, Auth- oder Provideränderung.
Bekannte Vercel-Zuordnungen mit Parentberichtstand erhalten; nur fehlende
Settings und gewünschte endgültige Zuordnung bleiben unbestätigt.
Next Steps: quellentreuer lokaler Trial-Fix als gesonderter Auftrag; reale
Adapter-/Tenant-/Release-/Restoreabnahmen bleiben offen.

# Entscheidungskreis nach PaketVersion3 · lokal

Current State: Grundlage c8c865f unverändert als ausgeliefertes PaketVersion3.
13 offene Abnahmefälle mit Quellen, Ownerbereich, nächster Aktion und präzisem
Abschlusskriterium im vorhandenen Register ergänzt. MASTER12 enthält einen
lokal bestätigten Suite-/Funding-Regelkonflikt; keine Geschäftslogik geändert.
Neue Charakterisierung und synthetischer SQLite-Backup/Restore getestet.
Kontrast nur auf berechenbaren deckenden Flächen ausgewertet; komplexe Flächen
und qualifizierte Assistenztechnik bleiben offen.
Next Steps: Entscheidung zu MASTER12-TRIAL-01 und autoritative externe Belege
entsprechend docs/contracts/acceptance-decisions.md. Kein Handoff schließt Fälle.
Keine neue Provider-/Domain-/Runtimeaktion, keine aktualisierte Libraryversion.

# Lokales Abdeckungsdelta · 27.10.2026

Current State: auf Basis0cf8545 generische NL/FR-Beschriftungen und kleine
Linkflächen korrigiert, Marken erhalten.72 Routen-/Sprachfälle,1724 reale
Linkaktivierungen,36 mobile Accessibilityfälle und108 Textabstands-/Textgrößen-
Geometriefälle mit tatsächlich gemessener Textverdopplung bestanden. Der
unabhängig gefundene Root-Font-Scheinnachweis und echte Resizeüberläufe wurden
korrigiert; Header/Wörter umbrechbar, Select/N-Symbol schriftrelativ. Öffentliche Installation nur im expliziten
public-pwa-Build, netzabhängig ohne Cache/Replay;9 lokale Browserchecks bestanden.
328 Python- und30 Node-Tests; unabhängige kritische UI-/SDK-/PWA-Nachprüfung.

Next Steps: qualifizierte visuelle/Assistenztechnikprüfung MASTER-09 bleibt
konkret offen. Vier lokale Teilnachweise schließen keine Produktivabnahme;
12 externe Masterblocker unverändert. Kein Deploy/Auth-/Provider-Enablement.
Nachweise: docs/contracts/acceptance-coverage.md und public-installation.md.

# Historischer One-Web-App Integrationskandidat · lokal

Current State: neuer isolierter Zweig integration/one-web-app-2026-10-27,
Controller fd01d53 + PR36-Folgepatch58ea5b3, gemeinsamer Vorfahr6686629.
Konflikte quellentreu aufgelöst, gemeinsame Workspace-/Auth-/Buildkonfiguration
und lokaler Backendrollenvertrag integriert. Neue kombinierte Regressionen
belegen Shell/Navigation/Locale, synthetische Auth, Rollen-/Tenantnegatives,
Context-Parent-Join, Replay und Crash/Restart. Alle Remotezustände unverändert.

Unabhängige Gegenprüfung fand gecachten Rollenvertrag; Hashprüfung pro Dispatch
und Widerrufsregression korrigieren dies. Abschließende Nachprüfung am neuen Hash.
Next Steps: bereinigtes Paket und versionsgebundene Gegenprüfung sichern;
echte Provider-/Tenant-/Domain-/Restoreabnahme bleibt getrennt offen. Kein
Produktivabschluss, kein Daemon und keine öffentliche Controllerroute aktiviert.
Details: docs/contracts/one-web-app-integration.md und evidence/one-app-2026-10-27.

## Historische Teilpaketstände

# PR36 begrenzter lokaler Folgepatch · 27.10.2026

Current State: eigener Zweig integration/pr36-acceptance-2026-10-27 auf
66866298b3eb4054371b0e2a1e1f618f1bc8ca73, keine Remote-Schreibaktionen.
PR35 und main nicht zusammengeführt. Standalone-, lazy Auth-, Signout- und
Locale-Fälle reproduziert/korrigiert; Node-Untergrenze22.23.4 wiederhergestellt.
24 Node-Tests, sieben synthetische Browserfälle, echter Offlinebuild unter
Node22.23.4; unabhängiges Review samt behobenem P2-Importgraphbefund.
Details: docs/contracts/pr36-local-acceptance.md; evidence/pr36-2026-10-27.

Next Steps: getrennten sicheren lokalen Orchestrierungskern auf PR35-Folgeversion
bauen; vorhandene Queue/Context/Brainbausteine verwenden. PR36-Restbefunde,
echte Auth-/Tenant-/Domain-/Produktionsabnahme und Bundlegröße bleiben offen.
Keine Aktivierung, echte Anmeldung, Gebühren, Serveränderungen oder Deployment.


# Isolierte Integration · 27.10.2026

Current State: eigener lokaler Checkout `/workspace/nexify-integration`, Zweig
`integration/consolidated-2026-10-27`, Ausgangscommit
`a19cd5035d3809dedda94050486026ac0186662e`. Keine Remotes im Clone;
ursprüngliche Checkouts unverändert. Keine Pushes, Merges oder Deployments.

PR35-Reviewfälle lokal reproduziert und korrigiert: Kauf-/Reservierungsbindung
an Händler, Route und Bedingungen; atomare Aktualitätsprüfung paralleler
Keywordimporte. Additive Migration sperrt Altreservierungen ohne Snapshot nur
für neue Ausführung; Storno und Reconciliation bleiben erhalten.
WorkflowRecord ergänzt vorhandene Governance/Queue, keine zweite Datenbank:
10 Aufgaben, Quellenhashes, Owner, Abhängigkeiten, getrennte Evidenzstufen und
Rollback; neue Prüfregeln ARCH-015 bis ARCH-018. F-007 bleibt einziges aktives
Feature, keine Änderung auf passing und keine Runtimefreigabe.

Unabhängige Unteragentenprüfung fand zusätzlich einen reproduzierten Race beim
parallelen Start alter Selfservice-Datenbanken. Separat korrigiert: Schema-Read
und ALTERs nach executescript unter BEGIN IMMEDIATE; neuer Parallelstarttest
vorher rot, danach grün. Fachliche Bindungsregeln und SEO-Fix unverändert.
Die erneute unabhängige Gegenprüfung schloss den P2-Befund; auch acht parallele
Legacy-Starts bestanden. Beleg: evidence/integration-2026-10-27/independent-review.md.
Governance, PR36 und Produktionsadapter waren nicht Gegenstand dieses Reviews.

Prüfstatus: make check (0 Fehler/0 Warnungen), make test (291 Pythonfälle),
make e2e (291 Pythonfälle und Manifest/Config-Integrität) und make check-arch
bestanden. Belege unter `evidence/integration-2026-10-27/`. E2E ist hier die
bestehende lokale Repositoryprüfkette, kein externer End-to-End-/Produktionslauf.
Keine UI-Änderung oder neue Browserprüfung. Kein universeller Fehlerfreiheitsnachweis.

Next Steps: unabhängige Gegenprüfung des lokalen Diffs; Parent-Masterauftrag
als geprüfte Projektquelle ergänzen. Danach konkreten autorisierten Betriebs-
anschluss getrennt behandeln. Brain-Ziel/Tenant und WRITE→INDEX→EXACT READ-BACK
→CONTENT COMPARE fehlen; Mirror-Richtung extern ungeprüft; Small-Business
verify blockiert mit `Source unavailable: LICENSE` (0 Aktionen, keine bestätigte
installierte Skillzahl). Produktions-Restore, Liveabläufe und Abnahme offen.
Keine laufenden Dienste einschließlich Slack und keine externen Kosten verändert.

Zusätzlicher Abnahmescope: PR36 mit 16 gemeldeten offenen Reviews sowie
Backupfehler nexifyai-dify-sicherung auf srv1941843 um 03:40:36 UTC.
Beides nur als Parentmeldung dokumentiert, nicht selbst reproduziert.
Branch-Owner-Abgleich beziehungsweise Backup-/Exit-/Restorebeleg erforderlich;
keine PR36- oder Serveränderung ausgeführt. Details und Zuständigkeiten:
`docs/contracts/additional-acceptance-scope.md`.

---

# Gemeinsame KI-Governance und Kapazitätsplanung · 26.10.2026

## Anmelde-/Abmeldezugang und MCP-Antwortintegrität · 27.10.2026

F-007 ist über den vorgeschriebenen dreischichtigen Prüfpfad lokal technisch
bestanden. MCP-Discovery verweigert doppelte JSON-Schlüssel und `NaN` in JSON/SSE.

F-008 ergänzt in der React-Site einen sprachabhängigen Anmeldezugang und bei
geladener Clerk-Sitzung den vorhandenen Konto-/Abmeldeknopf. Der deaktivierte
Zustand bleibt ehrlich und fragt keine Passwörter ab. Die neue Kopfzeile wurde
lokal auf Desktop/Mobil, 44-Pixel-Zielgröße, DE/NL/FR, Routen, Tastatur und
Offlineausgabe geprüft. Authentifizierung erteilt weiterhin keine Membership.

Der geprüfte Stand liegt auf
`factory/goal-completion-gated-2026-10-27`. Der Anwendungsstand aus Commit
`3f19561` wurde ohne Force-Push auf den wiederhergestellten Main aufgesetzt.
GitHub-CI-Lauf `40497507088` hat Repository, React-Site, Next-Web,
OpenAPI und PostgreSQL-Isolation vollständig bestanden. Das kanonische
Vercel-Projekt meldet für denselben Commit `Deployment has completed`; der
bekannte Preview-Host antwortet außerhalb der Vercel-Sitzung erwartungsgemäß
mit dem Zugangsschutz (HTTP 302 zu Vercel SSO). Zwei zusätzlich mit demselben
Repository verbundene Altprojekte (`web`, `site-k23m`) schlagen unabhängig
davon in ihrer eigenen Vercel-Konfiguration fehl und sind zu bereinigen.

Der Preview-Erfolg ist keine Produktionsfreigabe. Ein gleichzeitig durch einen
anderen Prozess zusammengeführter PR wurde mit Commit `839c8f2` nachvollziehbar
zurückgenommen; der Main-Dateibaum entspricht wieder exakt dem vorherigen Stand
`e541462`, Main-CI und kanonisches Vercel-Deployment des Rückwegs sind grün.
Produktivdomain und DNS wurden nicht umgestellt. Das Freigabe-Gate bleibt
geschlossen, bis echte Clerk-Anmeldung samt vereinbarter starker
Authentisierung, Membership-/Tenant-
Trennung, Providerverbindungen, wiederholter Health-Lauf, ausgeführter Rollback
und die Endabnahme mit tatsächlichen Laufzeitnachweisen bestanden sind.

Medienarbeit 27.10.2026: Die vorhandenen Voice-Referenzen sind Rollen und
Seitentexten zugeordnet. DE/NL/FR-Heroentwürfe, Rollenprofile, ein identischer
Hörvergleichstext und Abnahmekriterien stehen in
`docs/contracts/hero-production-plan.json`. NeX bleibt vorläufig auf seiner
Referenz; Pascals Referenz braucht persönliche Rechte- und Hörprüfung; AIFly
soll aus den vorhandenen Provider-Assets eine eigene, klar unterscheidbare
Stimme erhalten. Die aktuelle Toolregistry exponiert weder Runway- noch
ElevenLabs-Aktionen, deshalb wurden keine Provider-Assets gelesen, keine Jobs
gestartet und keine Medien veröffentlicht.

Arbeitszweig: `factory/goal-completion-gated-2026-10-27`, Basis `839c8f2`.
Neueste Nutzerpriorität: bestehende Modelle/CLI-/Kundenarbeit erhalten; Ersatz
parallel bauen und prüfen, pro Laufzeit mit Canary/Übergabe/Rollback umstellen.
Keine aktive Migration, Produktionsbelegung oder globale Modellsperre durchgeführt.
17 zwischenzeitlich neue Legacy-Einschränkungen vor Veröffentlichung zurückgenommen;
Altpfade sind ausdrücklich unmigriert/audit, nicht fälschlich abgesichert.

## MCP-Discovery: eindeutige Antworten · 27.10.2026

F-007: Lesende Discovery weist JSON und SSE mit doppelten Objektschlüsseln
oder nichtstandardisierten Zahlen ab. Lokale HTTP-Gegenproben sind Teil der
Automationsprüfung. Keine Toolausführung oder Provideraktivierung; die Änderung
wird auf dem vom Vercel-Previewcommit `a19cd50` abgeleiteten Arbeitszweig geprüft.

52 KI-bezogene Quellen registriert; aktueller begrenzter Scan168Dateien/30Kandidaten.
Auditmodus meldet Lücken/Drift, stoppt keine laufende Arbeit. Neue interne
Modell-/CI-Adapter prüfen exaktDeepSeekV4.1Flash1017/high und finale Requests.
Hostmodelle von ChatGPT/Codex/Claude werden dadurch nicht umgeschaltet.
AGENTS/CLAUDE/Copilot weisen auf gemeinsame Regeln und relevante eigene Skills.
Fünf eigene Skillkopien projektlokal installiert und exakt rückgelesen:
Delivery1.0.2,Integration1.0.1,übrige1.0.0; keine globale Pluginregistrierung.

Kontextauswahl führt sechs Kernquellen einschließlich Wirkungsprüfung immer mit.
232Projekt-Markdown-Dateien lokal mit Originalhashen rückgelesen.
Der Markdown-Stager trennt Herkunft/Mandant/Fassungen/Chunks/Readback;
FIFO/Hardlink/Secret-/Versions-/Löschungsgegenproben nach Review behoben.
LightRAG/ca9000MD/vierServer nicht verifiziert oder eingespielt.
Behebungsqueue tatsächlich15Aufträge:8lokal aktuell geprüft abgeschlossen,
7externe/Migrationsvoraussetzungen zugewiesen; kein Worker/Scheduler aktiviert.

Offlinekapazitätsplaner rechnet gemessene CPU/RAM/Storage/IO/Netzprofile,
Lastbereiche und externe Tokenkosten; unbekannte Profile/Raten bleiben unbekannt.
14Fälle plus unabhängige Gegenrechnung grün. Lokaler Ressourcenprobe beschreibt
nur diese Codex-Cloudumgebung, keine VPS; Produktionshostinventar weiterhin leer.
Keine produktive Last, kein Serverlimit oder Loadbalancer geändert.

SEO-Katalog tatsächlich136883GeoNames-Orts-/Ortsteil-Kandidaten(DE/AT/CH/NL/BE)
in lokaler SQLite aufgenommen, sämtliche Entwürfe/noindex/Abdeckung unbestätigt.
Kein amtliches Vollständigkeitsversprechen, keine Keywordmessung, keine Ortsseite
veröffentlicht. Lizenz/Quellhashes: config/research/local-place-import-evidence.json.

AI7/React4-Streamingorientierung im Vercel-Frontend samt realen Browsergegenproben
und passender Next-Referenz gebaut. Explizit textgeführter Zwischenmodus, noch
kein Live-LLM-Chat. Internes ToolLoopAgent-Prototyping verwendet echte SDK-Mocks;
keine Modellkosten ausgelöst. Readonly-Creditsprobe nur für diesen Vercel-
Previewzweig konfiguriert, Ergebnis nach Deployment rücklesen.

Lokaler Gesamtstand:283Pythonfälle,26SDK- und18Site-Tests grün;
Site/Standalone/Nextbuilds, API-/App-Typechecks, Audit, E2E und14Architekturregeln
bestanden. Sauberzustandsprüfung und kanonisches Vercel-Preview bestanden.
Browser:36öffentliche/10privateRouten,49Erklärmodule,SDK404Fallback/Streams/
Negativkontext/Sprachen/Mobilfokus,Offline/Hashrouting; kein Produktionsnachweis.
Bundle561KB/gzip158KB bleibt Leistungsfinding, keine Normzertifizierung.

Nächster Betriebsanschluss: autorisierte tatsächliche Server-/Brain-Messung und
Wissensadapter, gebundene Workloadprofile/Lastszenarien, finanzierter und
authentifizierter Livechat, reale Auth/Suite/Mail/Kalender/Shop/Medienadapter;
danach einzelne geprüfte Cutovers. Marketing/Mailings/Social erst bei Bereitschaft,
GEO nach SEO-Grundlage. F-007 bleibt aktiv; .cloud/Affilinet/Main unverändert.

---

# Ausarbeitung des angenommenen Grundentwurfs · 26.10.2026

Der Nutzer akzeptiert den vorherigen Stand ausschließlich als Anfang und
beauftragt die weitere Ausarbeitung. Vercel ist ausdrücklich die verbindliche
Live-Vorschau; ChatGPT-Bilddarstellung/Backupsync blockieren diese nicht.

Umgesetzt: ungecroppte Herofiguren (auch bei2464/2560/3440px), vier direkte
Bereichseinstiege, native Produktnavigation und geordneter Footer. Acht passende
Folgeseitentypen mit echten Breadcrumbs, Abschnittsnavigation und Folgeaktionen.
Eigene NeX2fly-Produktseite, 21 zusätzliche originalbasierte Abschnitte auf sieben
Leistungs-/Entscheidungsseiten. Jetzt46Routen/36öffentlich/10geschützt und49
vollständig erhaltene Erklärmodule. Keine veröffentlichten Presenter-Videos.

Agentenbereich: aktuelle öffentliche Seite und tatsächliche Angebotsvorschau/
Detailansicht; Verfügbarkeit aus streng geprüften Serverflags. Lokaler Gateway
liefert Capabilityvertrag und bindet Chatkontext vor dem Idempotenzhash an die
öffentliche Allowlist. Keine Rechte aus Clientkontext, keine Liveproviderbehauptung.

Unabhängige Prüfung fand einen Hashrouter-Skiplinkfehler; korrigiert und per
Tastatur nachgeprüft. Zentrale Sichtprüfung fand veraltete CSS-Selektoren für
Folgeseiten-Erklärmodule; korrigiert, Desktop-/Mobilgutter nachgemessen.

Prüfungen:152Pythonfälle,18Site-Contracts, React-/Standalone- und Next-Build,
Typen, Audit, Architektur und E2E grün. Browser:36öffentlicheRouten mit gesamtem
Textbestand,10privategesperrt,49Textmodule,PDF/Entwurfsansichten,Pendingoutbox,
Marketingvorlage,öffentlicherChatkontext,Menü/Footer,DE/NL/FR,Mobil/Offline,
Sprunglink/Abschnittsfokus und fünf Desktopbreiten. Keine Gesamt-, Produktiv-
oder Normzertifizierung. Bundle559,62KB/gzip157,15KB bleibt Leistungsfinding.

Quellen: docs/architecture/nex2fly-page-source.md und service-content-source.md.
Prüfumfang: docs/design/detail-expansion-contract.md; unabhängiger Bericht:
docs/quality/detail-expansion-review.md. F007 bleibt aktiv; bestehende
Main-/Releasegates bleiben unverändert. .cloud/Affilinet unverändert.

Nächste Arbeiten: weitere Originalinhalte und fehlende produktive Auth-/Suite-/
Provider-/Versand-/Kalender-/Medien-/Shopanbindungen mit getrennten Rechten und
Betriebsnachweisen umsetzen; Performancebudget auflösen. Marketing/Mailings/
Social erst nach Systemfertigstellung; GEO nach SEO-Grundlage und Vermarktung.

---

# Rekonstruktion nach verworfener Vorschau · 26.10.2026

Aktiver Zweig: `factory/source-faithful-rebuild-2026-10-26`. Der vorherige
Oberflächenstand ist ausdrücklich vom Nutzer verworfen; historische grüne
Technikprüfungen weiter unten sind keine Designabnahme. Archivzweig und Bundle
bewahren ihn. Änderungen von `origin/main` bis 07833fb sind integriert.

Die neuere Nutzergrafik ist eine Gestaltungsreferenz ohne vorhandenen Codeexport.
Neue React-Startseite mit offener Bühne, transparentem Figurenentwurf und
redaktionellen Folgeabschnitten gebaut. Große leere Videokästen entfernt;
Erklärtexte, Folgeaktionen und Rundgänge erhalten. Agentenwege sind offline
anschaubar; Schreibaktionen bleiben an den lokalen Gatewaystatus gebunden.
Keine vorgetäuschten Versand-/Kalender-/CRM-/Modellzustände.

Neue Unterlagen: Quellenrekonstruktion (93 Original-/Referenz-HTML-Dateien plus
1 verworfener Implementierungseintrag), Standards-Anforderungsmatrix,
Gesamtbetriebsmodell und Selfservice-Policy. Das Betriebsmodell ordnet
12 Abteilungen und 15 Workflowketten zu; es behauptet keinen laufenden
24/7-Agentenbetrieb. Siehe `docs/operating-model/NEXIFY-GESAMTSYSTEM.md`.

Öffentliche Registrierung als Produktregel korrigiert: 24h Suite, BYOK oder
bestätigtes 500-Cent-Testguthaben, keine geschenkten LLM-Credits und
bestandserhaltende Konvertierung. Reguläres Prepaid-Minimum unverändert.
Privater SQLite-Domainkern mit 13 gezielten Tests; unabhängige Prüfung fand
zwei Fehler, beide behoben und erneut geprüft. Echte Clerk-/Vault-/Payment-/
Provideradapter und serverberechnete Payload-/Kostenbindung bleiben offen.
Kein produktiver Login, keine Zahlung und kein kostenpflichtiger Modellaufruf.

Die .de ist weiterhin dem vorherigen Entwicklungszweig zugeordnet; keine
neue Designabnahme oder Domainumstellung erfolgt. .cloud unverändert.
Affilinet Portal Aachen bleibt unangetastetes, separates Kundenprojekt.

Prüf- und Abnahmekriterien: `docs/design/rebuild-acceptance.md`;
unabhängiges Review: `docs/quality/rebuild-independent-review.md`.
F007 und bestehende Main-/Releasegates bleiben unverändert.

Aktuelle Nutzerpriorität: erst Gesamtsystem fertigstellen; Marketing/Mailings und
alle eigenen Social-Kanäle danach aktivieren. Vollständige SEO-Basis bleibt offen;
GEO erst auf geprüfter SEO-Basis und laufender Vermarktung. Als geordneter Backlog
in `config/operating-model.json` erfasst, keine aktuelle Kampagnenaktivierung.

Geprüft: 146 Pythonfälle, 16 Site-Contracts, Site-Build/Standalone, Next-Typecheck,
make check/test/e2e/check-arch/clean-check. Lokaler Browser: 35 öffentliche Routen,
47 erhaltene Erklärmodule, 10 private Ansichten gesperrt, PDF/Outboxpending/
Marketingvorlage, DE/NL/FR, mobile Dialogführung und Offlinevorschau.
Keine gestalterische Nutzerabnahme oder Produktiv-/DIN-/ISO-Zertifizierung.

---

# Historische Vorschau- und Auth-Einrichtung · 26.10.2026

Der damalige Bericht bestätigte nexifyai.de am READY-Previewdeployment
`dpl_5YEzN7oMMpBFjNUWvBrLmQgdxeLm`, Commit `409db50`, über authentifizierte
API und CLI. Vercel-Ausgabepfad und Autorzuordnung wurden damals korrigiert;
fünf eigene CI-Jobs waren grün. Keine eigene Main-/Produktivpromotion und keine
Änderung an der bestehenden .cloud-Seite wurden gemeldet.

Das zusätzliche Projekt `site` hatte Root-/Outputfehler. Eine Korrektur mit
Read-back wurde historisch gemeldet, ohne Löschung oder Domainübernahme. Die
heutige Zuordnung ist separat in `deployment-parent-report.json` festgehalten;
diese historischen Aussagen belegen keine aktuellen Projekteinstellungen.

Die damalige CLI-Einrichtung verwendete Version 65.2.0 und das kanonische Projekt.
Vite, Node 22.x, Repositoryroot, pnpm-Workspacebuild und apps/site/dist wurden
historisch als korrigierte Werte berichtet. Die aktuelle Projektantwort liefert
Root-, Build-, Output- und Produktionsbrancheinstellung jedoch nicht. .de blieb
an den Entwicklungszweig gebunden, .cloud unverändert. Keine Gateumgehung oder
Umschreibung früherer Git-Autoren wurde vorgenommen.

Die React-Clerk-UI 6.18.1 wurde mit lazy SDK, explizitem Flag, validiertem Public
Key und festem Redirect vorbereitet. Datei-/Standalonevorschau bleibt ohne Auth;
keine automatische Admin-/Tenantfreigabe. Das öffentliche Aktivierungsflag blieb
false. DNS-/Issuerprüfung und reale Providerabnahme waren nicht abgeschlossen.
Vorhandene Servercredentials wurden erhalten; Secretwerte wurden nicht gelesen.

Die damaligen Testzahlen (16 Site-, 133 Pythonfälle sowie lokale Browserprüfungen)
sind historische Teilbelege. Neun offizielle Skillkopien waren nur im damaligen
Checkout installiert; saubere Checkouts müssen ihre Verfügbarkeit separat prüfen.
Globale Plugin-/MCP-Installation war im verwalteten Clientprofil blockiert. Keine
Produktions-, Live-Login-, Visitor-API- oder Backup-Synchronisationsabnahme daraus
ableiten. Cloudflare-Namensgrenzen blieben ein separater historischer Blocker.

---

# Durchgängige Seitenbegleitung · 26.10.2026

React-Begleitung nun9geführteNutzerwege+47Erklärmoduleauf35öffentlichenSeiten,
inklusiveShop/Werkstatt;12Kernseitenlinks/rechtsmitunterschiedlichenSprechern.
Alle9Journeys+NeuladepräferenzimBrowserlokalgeprüft;keineAutonavigation/Mikrofon/
Tonaufnahme. SessionpräferenzgewährtkeineRechte;10privateAnsichtenbleibenunverfügbar.
AlleVideoassetspending,0veröffentlichteClips;keineFakePlaybuttons.
VorhandeneInhalteunverändert,93Originalquellenweitererhalten69Backlogoffen.
AktuelleinteraktiveDatei /workspace/preview/nexify-preview.html.

YAOTI-Konzeptuseruploadgelesen/gehasht,keineAutoplay-Beispielinstruktionübernommen.
REA6.8wirklichperSTDIO:229Tools,HomepageGuideSnapshot,DriverMITQuellepartiell
analysiert;404KBBundle15sTimeoutundöffentlicheREAInspektionverweigertoffengehalten.
7Lösungsoptionen/8Paketarchiveoffiziellrecherchiert;nativeBegleitungbevorzugt,
Driver/Joyrideoptional,LiveanbieterkeinZwang. Researchunabhängiggeprüft22Hashes.
Plan docs/strategy/presenter-implementation-plan.md;Produkt-/Finanzmatrixund
Wissenszugriffsmatrixergänzt. KeinAllchatsAPI/Chatlogimport/Kundenvermischung.

React12Tests,neuerBuild/Standalone/Nextreferenzbuildgrün;Browsertests35Seiten,
47Module,9Journeys,PDFentwurf/Outboxpending/Marketingdraft,DE/NL/FR,mobilgrün.
E2E-/Architektur-/CleanAbschlusslog .onboarding/react-preview/presenters-final-*.
Quellehashgateconfig/presenter-sources.json11Quellenfixiert;unbekanntevorLesen
abgewiesen. KeineProduktivabnahme,F007bleibtaktiv. RemoteDeploymentlesenGH403;
keineautomatischeVercel-/ChatGPTLiveSynchronitätbehaupten.

---

# Portable React-Vorschau, DNS und MCP-Abgrenzung · 26.10.2026

Aktiver Hauptfrontendbuild: apps/site React19.3.1/Vite8.3.5; vorhandene UI,
Texte und Tokens geteilt, Next-/Clerk-Referenz unter apps/web erhalten.
Vercel-Rootconfig und CI für portablen Reactbuild vorbereitet; keinRemoteDeploy.
Live lokal3004+VisitorAPI3003; keine öffentlichePortfreigabe/Vercelverbindung.
ÖffnungsfähigeStandaloneHTML unter /workspace/preview/nexify-preview.html.
Browsernachweise:35öffentlicheRouten,10privateAnsichtenunverfügbar,
ChatentwurfbleibtbeimNavigieren, echterEntwurfsPDFdownload,Outboxpendingnichtgesendet,
Marketingvorlagenichtveröffentlicht,DE/NL/FR,mobil,Standalonebilder+Hashnavigation.
Siehe .onboarding/react-preview/browser-results.json außerhalbdesRepos.
React7Tests,Auth6Tests,Python133Tests,Typecheck/Reactbuild/Nextreferenzbuild,
Designaudit0/0,Architektur,E2EundCleanState bestanden.

93/93Prototypquellenhasheserhalten,24direktreferenziert69expliziterBacklog;
keinevollständigeInhalts-/Backendabnahme. docs/architecture/0012-preview-coverage.md.
DNS:alle5benutzerdefiniertenClerkCNAMEsfehlen,keinefalschenZielebeobachtet,
bestehendesDMARCp=noneerhalten. KeinDNSwrite/Serversecret/Useranlage.
MCP:ComposioresourcezeigtComposioissuer,keineeigeneKontrolle/Serverquellenvorhanden;
ClerkSollconfignichtveröffentlicht,keineLiveOAuth-/Tooltestsbehauptet.
BackupChatGPTDeployschnittstelleweiteroffen;ArchivintegritätistkeineLiveSynchronität.
F007bleibtaktiv,keineMain-/Produktivfreigabe;AffilinetbleibtseparaterKunde.

---

# Domainklärung · 26.10.2026

Nutzer bestätigt Vercel als Hosting, nexifyai.cloud als spätere Hauptdomain und
nexifyai.de als Vorschau. Bestehende ChatGPT-Seite auf.cloud bis Fertigstellung
bewahren, kein vorzeitiger DNS-Wechsel. Clerk authorizedParties exakt auf beide
HTTPS-Origins begrenzt. Gelieferter öffentlicher RSA2048-PEM gespeichert/geprüft,
Issuer/JWKS-Bindung noch offen und nicht als statischerJWTkey aktiviert.
RemoteDomainbindung, Primary/Satellite, Secret, CNAMEs und LiveAuth bleiben offen.

---

# Clerk-Produktionsvorbereitung · 26.10.2026

Aktiver Zweig: `factory/agency-separated-2026-10-26`. Lokale Implementierung,
keine Produktionsfreigabe. Geprüft:124Python-,5Auth-Tests,Typecheck/Build,
Designaudit0Fehler/0Warnungen,Architektur und Clean-State grün; unabhängige
Auth-Gegenprüfung inklusive fehlerhafterPublicKeys abgeschlossen. Clerk SDK7.9.20, deutsche UI4.24.1, Anmelden und
Registrieren, geschlossene Schutzschicht ohne automatische Geschäftsrechte.
45 Routen:35öffentlich/10geschützt. PublicKey lokal ignoriert und im Cloud-Draft10;
Serversecret nur angefordert, nicht gebunden. Domain/Hosting und genaue Clerk-CNAMEs
bleiben offen; DNS-SichtungNXDOMAIN für clerk.nexifyai.de. Keine Benutzer-/DNS-/
Deploymentmutation. Vollständiger Stand: docs/deployment/clerk-setup.md und
config/clerk-production.json. F007 bleibt aktiv; Affilinet bleibt separates
pausiertes Kundenprojekt. Frühere Fortschrittsabschnitte sind historische Nachweise.

---

# Korrigierte Projektgrenze · 26.10.2026

- Nutzerklärung: Affilinet Aachen ist ein gesondertes, pausiertes Kundenprojekt. Der frühere Import und die Einordnung als Agenturmodul waren falsch und sind verworfen.
- Aktueller Entwicklungszweig: `factory/agency-separated-2026-10-26`, von vor dem Kundenimport abgezweigt. Kundenbaum `apps/portal` und bekannte Kunden-Commitköpfe sind ausgeschlossen; acht offene Agenturdateien wurden unverändert erhalten. Der alte Importzweig bleibt ausschließlich lokal gesichert, nicht veröffentlichen oder zurückmergen.
- Die historische N2-Designreferenz bleibt unter `reference/handoff-n2` getrennt gekennzeichnet. Sie aktiviert keine Anwendung oder alte Pipeline. Original-Kundenrepository unverändert und pausiert.
- Quellenklassifikation und selektive Wiederverwendung: `config/source-boundaries.json`. Keine Kunden-/Agentur-SSO, Datenmigration oder Produktabhängigkeit ableiten. Kundenprojekttests zählen nicht als Agenturabnahme.

## Next Steps

1. Nur die eigenen Agentur-/TEILEKLAR-/Web-/Gateway-Aufgaben fortführen. Keine Affilinet-Übernahme oder automatische Kundenprojekt-Einrichtung.
2. Brauchbare Komponenten aus allen autorisierten Quellen gezielt bewerten und mit Quelle/Commit, Zweck, Anpassung und Tests übernehmen.
3. Offene CI-/Frontend-/Integrationsprüfungen des Agentursystems fortsetzen; technische Erreichbarkeit, Live-Anbindung und Gesamtfertigstellung weiterhin getrennt ausweisen.

---

## Überholter Integrationsplan (durch diese Projektgrenze korrigiert)

# Aktueller Integrationsauftrag · 26.10.2026

F-007 ist aktiv: kanonisches gemeinsames Repository, Next.js/TypeScript-Webshell mit nativer AIFly-Seitenleiste, vollständige DE-/TEILEKLAR-Seitenarchitektur, isolierte REA-Instanz, Small-Business-Bibliothek und GitHub/GitLab-Automatisierung. Der nächste lokale Zwischencommit sichert die geprüfte Implementierung vor dem herkunftsgebundenen Import der anderen beiden Quellstände. Keine Main-/Produktivfreigabe und noch kein gesamthaft fertiges Unternehmen.

- Offizieller OpenRouter-Katalog bestätigt `deepseek/deepseek-v4.1-flash-1017`, reasoning high. Adapter erzwingt Modell-/SHA-/Schema-/Budgetbindung; kein Paidcall ohne echte Credentialbindung, keine Ausführung von Modelltext. Legacy-Merge-vor-Review-CLIs sind hart stillgelegt.
- Zusätzliche REA6.8.0-Installation unter `.onboarding/rea-mcp`, gewünschter Alias `rea-mcp`:229Tools/6Prompts erfasst. Eigener Rechenkern statisch analysiert und buche-Trace/Evidence-Readback geprüft. Hostregistrierung und VPS-Verbindung getrennt behandeln.
- Small Business offiziell gepinnt installiert:44Skills/35deklarierteMCPRegistrierungen/216Hashdateien. Lesender Loader und nativeFunktionsmatrix, kein Cowork-/Connector-/Scheduler-Go.
- Neue IA:44Routen,34öffentlich/10geschützt; NeXify/TEILEKLAR/Portale/Intern getrennt, Deutschland90Prozent als Ziel. NextBuild mit dieser IA bestanden; abschließender neuer Browserlauf nach Import noch ausstehend.
- Native Besucherverläufe lokal echt geprüft:PDFdraft, idempotente Outbox `pending_provider`, lokale Terminanfrage, Marketingstrukturvorlage. Kein behaupteter Versand, Livekalender oder freier Modellchat.16HTTP-/Storagegegenproben; frühereBrowserprobe mit15altenReferenzrouten ist kein aktueller34Routenbeleg.
- Aktuelle erforderliche Checkpointprüfung `make check && make test && make clean-check` grün; formale neueGitHubWorkflows mit gepinntemActionlint1.7.7 geprüft. A1-CI getrennt mit76Backendtests/0Skips+4DOM/CIbuild lokal verifiziert und als Importquelle gesichert.

## Next Steps

1. Portalquelle inklusive Historie nach `apps/portal`, zweitenHandoff nach `reference/handoff-n2` übernehmen; Originalrepos und vollständigeBundles bewahren. Quellenverträge auf Monorepopfade umstellen und Herkunftsbelege prüfen.
2. PNPMWorkspace frisch/frozen installieren und Next-Typecheck/Build + abschließendeBrowserjourneys über34öffentlicheRouten ausführen.
3. LokaleGitLab-CI-Containerausführung, AI-/MCP-/Mirror-/Legacy-/Skillgegenproben und formalesWorkflowlint abschließen. Jeff-/Produktivgates erhalten, konkreteRemoteGitHubrechte prüfen.
4. GetrennteBackend-/UI-/Integrationsgegenprüfung abschließen. ExterneProvider, VPS/Composio/Paperclip/Brain/Runway/ElevenLabs-Verbindungen erst nach echtemProtokoll- und Readbacknachweis als verbunden melden.

---

## Vorheriger API/Auth-Checkpoint

# Aktueller Vertragsschnitt · 26.10.2026

- Nutzerentscheidung: API/Auth aus den vollständigen Repository-Prototypen und Seitenbestimmungen ableiten; die frühere Suite-Quellenrückfrage ist erledigt.
- F-006: vorgeschlagener Vertrag in `docs/contracts/`, 93 HTML-Seiten (47 N1, 46 N2), 63 abgeleitete Capabilities, 97 Pfade/102 Operationen/107 Schemas. Keine aktive API-/Auth-Runtime daraus ableiten.
- Stimmen exakt gebunden: NeX `Lbm7qDmJUxIxpWx9qhZO`; AIFly und Nutzer beide `feTHtWuEJFLTOWyoreyy`. Runway als Videoquelle, Erstellung fehlender Clips beauftragt; ElevenLabs via Composio für Sprachfunktionen. Drei Skript-/Szenenentwürfe, null Providerjobs.
- Quellen-/Policyvalidator und 17 Vertragsprüfungen einschließlich unabhängiger Gegenproben; formale OpenAPI-3.1-Prüfung erfolgreich. F-006 nach allen drei Harness-Layern passing; `make check && make test`, E2E/Architektur und Clean-Check erfolgreich. 42 Python- und zehn Node-Tests; formale OpenAPI-Prüfung grün. Details im Vertragsprüfvermerk.
- Gegenprüfung getrennt von Autoren: Auth/Pool-/Scope-/Gastgrenzen sowie Medien-/Browserpfadnormalisierung geprüft; Findings korrigiert. Prototypen und Manifest unverändert.
- Noch offene Launchblocker: native Gateway-/Auth-/Shared-Pool-Runtime, öffentlicher Companion-BFF, kontofreier verifizierter Gastretouren-/Widerrufsweg, reale Runway-/ElevenLabs-Toolbindung und Medienassets. Die Anbieter sind in dieser Sitzung weder per Tool noch CLI oder erwarteter Credentialbindung exponiert; die Nutzerangabe zur externen Verfügbarkeit bleibt erhalten.

## Next Steps

1. Den geprüften Zielvertrag in einem eigenen nativen Gateway-/Auth-Inkrement implementieren; Rollen, Session/Issuer und DB-Principal-Bridge mit echten HTTP-/DB-Negativtests verbinden.
2. Die tatsächliche Runway-/Composio-/ElevenLabs-Anbindung lesen, Bestand abgleichen, dann fehlende Clips im bereits autorisierten Umfang erzeugen; keine pauschale Erstellungsrückfrage wiederholen.
3. Vor Gastverkauf den dokumentierten kontofreien Retouren-/Widerrufsweg und vor öffentlicher Live-KI den engen BFF-Vertrag liefern.
4. Gesamtauftrag, Prüfnachweise und Checkpoints unter `/workspace/.onboarding/FACTORY-*` fortschreiben; kein Main-Merge oder Produktiv-Go aus diesem Vertrag ableiten.

---

## Vorheriger Fundament-Checkpoint

# Aktueller Factory-Auftrag · 25.10.2026

- Nutzer hat die sofortige Umsetzung der Gesamtfertigstellung freigegeben; Ziel bleibt aktiv.
- Entwicklungsbranch: `factory/foundation-2026-10-25`. Kein Merge oder Commit auf `main`.
- Nachgewiesen: Audit wieder ESM-kompatibel (0 Fehler/0 Warnungen), Originalblob der geschuetzten Prototyp-Uebersicht restauriert, Manifest unveraendert. Navigation bleibt separat erhalten.
- Lokale Gesundheitspruefung verwendet denselben Kern wie der Live-Runner, ohne Produktions-DNS/Hostaktionen; zehn Tests inkl. Negativfaellen bestanden. DNS-Diagnose im Live-Runner ist nun ausschliesslich lesend, Befunde statt automatischer Reparatur.
- Vorschau gehaertet (Loopback, Freigabeliste, kodierte Pfade und Symlinkziele); sieben HTTP-Regressionstests bestanden und unabhaengig geprueft.
- `make check`, `make test`, `make check-arch`, `make clean-check` bestanden nach den Baseline-Reparaturen; abschliessende Protokolle liegen unter `/workspace/.onboarding/N1-*.log`.
- F-005 wurde ausschliesslich ueber `make verify-feature F=F-005` nach 36 echten PostgreSQL-Pruefaussagen technisch auf passing gesetzt. Drei Mandanten/DB-Principals, RLS, Kontextwechsel und Rollback bestanden; keine Gateway-/Shared-Pool-/Produktivabnahme und keine Wiederherstellung fehlender historischer Migrationen.
- Parallel im separaten Affilinet-Repository: Frontend gebaut/lokal geprueft; offizieller Stripe-Adapter, strikte Webhooksignaturen und Backend/Auth-E2E lokal geprueft. Transaktionale Abschluss-/Replayabsicherung, Wallet-/Retentionsgrenzen und Checkout-Identitaet wurden umgesetzt und getrennt geprueft; aktuelle Zahlen im Umsetzungsstand.
- Gesamtplanung, Auftragszustand und aktuelles vollstaendiges Quelleninventar: `/workspace/.onboarding/FACTORY-*`.

## Next Steps

1. DB-Gegenproben wurden ausgefuehrt und unabhaengig geprueft; als naechsten Schnitt die Gateway-Identitaet und den Shared-Pool-Vertrag festlegen, bevor eine Anbindung als fertig gilt.
2. Tests, Setup-/Startanweisungen und Wiederaufnahmezustand auf den tatsaechlichen neuen Stand bringen.
3. Lokale Checkpoints auf Entwicklungsbranches sichern; vorgesehenes Live-Reviewergate und Produktivabnahme nicht vortaeuschen.
4. Detailvertraege fuer Gateway/Auth/Queue/Brain ausarbeiten und innerhalb freigegebener Grenzen implementieren.

## Offene Voraussetzungen der Gesamtlieferung

B.V.-Identitaet/Vertretung und Vertragszuordnung, kommerzielle/steuerliche Widersprueche, finaler Brain-/Bestandsintegrationsvertrag sowie externe Betreiber-/Reviewerzugriffe sind weiterhin nicht belegt. Keine Preise/Rechtstexte oder produktiven Rechte aus dem lokalen Fortschritt ableiten.

---

## Historischer Stand (vor aktueller Cloud-Einrichtung)

# PROGRESS — NeXify AI Gesamtlösung (Design-Handoff)

## Current State
- Last commit: `11994bf` (branch `main`).
- Verification: `make check` (ds-audit) **0 Fehler/0 Warnungen**, `make test` (Audit + 10 Python-Tests + Manifest/Config) **OK**, `make check-arch` OK, `make clean-check` OK.
- Harness: `make audit` (Ziel 73/73). VCR: `make vcr`.

## In Progress
- Agent-Harness nachgezogen: AGENTS.md-Router (Verification/Constraints/State/Zustandsmaschine/DoD/Arch-Grenzen/Observability/Clock-in-out), feature_list.json, PROGRESS.md, DECISIONS.md, init.sh, Makefile, .harness/, .claude/, scripts/, templates/, docs/quality-document.md, prototypen/lib/ARCHITECTURE.md, requirements.txt.

## Offene Punkte (bekannt, bewertet)
- `tools/inhaltsabgleich.js` (Fakten-Konsistenz) erwartet das Herkunfts-Layout (api/openapi.yaml, lib/, Prototypen im Root) und ist in diesem Repo **nicht lauffähig**; der Absturz wurde entschärft (fehlende Quelle = Befund statt Crash). Bewusst **nicht** in `make check` verdrahtet. Vor Reaktivierung: Layout angleichen oder Tool entfernen (mit Freigabe).
- `config/fakten.json` referenziert teils ältere Prototyp-Namen (z. B. `NeXifyAI Cloud v10.dc.html`; vorhanden ist v12) → 18 DATEI-Befunde. Inhaltsprüfung/Freigabe offen.
- Behoben: Widerspruch Mindestaufladung — `docs/03-backend/api-prepaid-umsetzung.md` nannte 50 €, die Inhabervorgabe (29.09.2026) ist 10 € (`config/api-prepaid.json`); Doku angeglichen, E3 als entschieden markiert.
- Behoben (2026-10-11): `nexify-watcher.service` löste einen **selbstauslösenden Endlos-Loop** aus — `tools/watcher.mjs` überwacht `config/`, `prototypen/`, `docs/`, die ausgelöste Pipeline (`docs-aktualisieren.mjs`/`wissen-speisen.mjs`) schreibt in genau diese Bäume → Dauer-Regeneration (~0.9 Orakel-Aufrufe/s, 4h28m CPU, Tree dauerhaft schmutzig). Fix: Self-Write-Guard in `tools/watcher.mjs` (ignoriert `docs/STAND.md`, `docs/generiert/**`, `prototypen/MANIFEST.sha256`); `make check` rc0. Commit `11994bf`.

## Offene Punkte (bekannt, bewertet)
- **Netz-Exposition — BEHOBEN (2026-10-05):** 19 veröffentlichte Container-Ports waren über `0.0.0.0`
  erreichbar, weil Docker die ufw-Regeln über die Kette `DOCKER-USER` umgeht. Fix umgesetzt:
  `iptables`/`ip6tables -I DOCKER-USER -i eth0 -j DROP`, persistent über
  `docker-user-hardening.service` (idempotent, enabled). `node tools/exposure-check.mjs` **PASS**
  (ungeschützt 0); öffentliche Traefik-Endpunkte und lokale Zugriffe unverändert. Details/Rollback:
  `docs/EXPOSITION.md`.

## Next Steps
- Fakten-Referenzen in `config/fakten.json` auf die real vorhandenen Prototyp-Dateien (v12) prüfen und nachziehen; danach `tools/inhaltsabgleich.js` wieder verdrahten.
- Freigabe-Entscheidungen E1/E4/E5/E6/E12 einholen (siehe `docs/09-final/08-recht-und-compliance.md`) und in DECISIONS.md nachtragen.
- `prototypen/lib/ARCHITECTURE.md` und `docs/quality-document.md` fortschreiben.

## Blockers
- Freigaben des Inhabers (Preise/Recht) stehen aus; keine Änderung an Preisen/Rechtstexten ohne Freigabe.

## Externes Review und Wiederaufnahme

Das aktuelle `tools/jeff-gate.py` wurde ohne externe Aktion geprueft: Exit 3,
`NX_ORAKEL_ENDPOINT/NX_ORAKEL_KEY fehlt`. Dies ist kein go und keine automatische
Freigabe. Code kann auf Entwicklungsbranches geprueft/gesichert werden, main
bleibt vom vorgesehenen Gate abhaengig. Die NeX2Fly-Suite liefert aktuell einen
Proxy-CONNECT-403; gezielte Domainfreigabe ist im Umgebungsentwurf gespeichert,
kein Umgehen der Netzrichtlinie und keine bestaetigte Suite-API-Verbindung.

Der Gesamtauftrag bleibt aktiv. Ein gespeicherter Auftrag garantiert keinen
unbegrenzten Hintergrundlauf; bei Wiederaufnahme zuerst die aktuellen
`FACTORY-AUFTRAG.json` und `FACTORY-UMSETZUNGSSTAND.md` lesen und fortsetzen.

## 2026-10-27 — isolierter lokaler Steuerungspfad

Auf Basis b44e448 entstand `integration/local-control-2026-10-27`: unveränderliche
Auftragsrevisionen, getrennte Start-/Abschlussabhängigkeiten, drei fest registrierte
lokale Prüffähigkeiten, persistente Ergebnisse/Checkpoints, SQLite-Lease/Fencing,
begrenzte Wiederaufnahme und explizite lokale Abnahme. Vorhandene RemediationQueue
ist der einzige Fehlerkanal. Details, Semantik-Diff, Ein-Web-App-Matrix und Rollback:
`docs/automation/local-control.md`. Tests/Review: `evidence/local-control-2026-10-27`.
PR35 und PR36 bleiben getrennte Stände; keine Remote-/Providerintegration oder
Produktionsabnahme, kein Daemon und kein zusätzliches Frontend aktiviert.

### Lesender Deployment-Nachtrag
Parent-abgeschlossener Abgleich ergänzt: .de66866298, Standardproduktion07833fb3,
fünf Geschwistera19cd503 mit dreiREADY/zweiERROR(missing dist). Vite/Node22 und
Deploymentprozess belegt; konfigurierte Root/Build/Output/productionBranch fehlen.
Details und unbekannte Felder im versionierten Deployment-Parentbericht. Nur
Dokument-/Evidenzdelta; getesteter Anwendungscode und externe Zustände unverändert.

### Geschlossener lokaler Kreis
Controllerstatus ergänzt konkrete Followups und persistierte Closed-Loop-Receipts.
Verwaiste/blockierte/übergebene Jobs schließen nicht; Parent-Join bleibt geprüft.
Externe Abnahme-/Brain-/Restorekreise bleiben offen mit zuständiger Rolle,
unbekannter Executorzuweisung, nächstem erlaubten Schritt und Voraussetzungen.

### Begrenzter Abdeckungsabgleich
Frische lesende GitHubprüfung: PR35 a19cd503 mit zwei, PR36 66866298 mit16
weiterhin offenen Reviewthreads. Einzelzuordnung und Quellenhashes stehen in
config/acceptance-coverage.json, lesbar in docs/contracts/acceptance-coverage.md.
Vier zusätzliche Dokument-/Voraussetzungsfehler lokal korrigiert; keine
Remote-Threadauflösung. Von18 Masterfällen sind1 lokal begrenzt geprüft,
5 mit lokalen Prüf-/Scope-Lücken und12 extern blockiert. Kein Gesamtfall ist
als produktiv abgenommen markiert. Bestehende Queue und Freigabegates unverändert.

## 2026-10-27 — fester lokaler BiRefNet-ONNX-Pfad nach v12

Auf Basis `da25e75` ist ein fester General-BiRefNet-Adapter mit tatsächlichem
CPU-Sessionaufruf, Tensor-/Maskenlogik und Quellen-/Lizenz-/Hash-/Shapeprüfung
implementiert und an den vorhandenen Batchworker gebunden. Batch v2 erhält
Originale, Quarantäne, Replay und v1-Rollback. Keine zweite Plattform.
Die Tests verwenden kontrollierte Graph-/Sessiondoubles, keine echte Inferenz.
Gepinnte offizielle Quellen und präzise Export-/Runtime-/Ressourcengrenzen:
`config/integrations/birefnet-onnx.json`, `docs/contracts/birefnet-onnx.md`.
Native Runtime und geprüfter General-ONNX-Export fehlen; kein Download, keine
Installation, keine echten Produktderivate oder Veröffentlichung ausgeführt.
Der tatsächliche Kataloghandler wurde in den ausdrücklich geprüften lokalen
Quellen nicht gefunden; Fortsetzung bleibt unbestätigt. Evidenz und Restschritte:
`evidence/birefnet-onnx-2026-10-27`. Gesamtshop/Livebetrieb bleiben offen.

### Geprüfte GitHub-Zustellung und Wiederaufnahme

Der feste `tools/reviewed_delivery.py` verbindet vorhandenes git/gh mit
quellengebundenen lokalen Review-/Gatebelegen, normalem eigenen Branchpush,
idempotentem Draft und CI-/Remote-Readback. Normale Projekt-/REA-Hooks bleiben
aktiv. 21 Commanddouble-Fälle prüfen auch unklare Ausgänge und finale Zustands-
wechsel; ein unabhängiges P2-Finding zu verfrühtem Erfolg wurde korrigiert.
Reale Rootzustellung: PR42 angelegt, danach extern vom Kontoinhaber mit391fce0
gemergt (27897541). Root hat nicht gemergt. Die späteren CI-Fixes wurden auf
f799bb3 im normalen Pushlauf40556996922 in allen5Jobs grün bestätigt; neuer
Folgebranch erforderlich, weil42 diese Nachträge nicht enthält. GitLab ist
serverlokal gemeldet, aktuelle Projekt-/Transportbindung bleibt unbestätigt.
Details und Grenzen: `docs/contracts/reviewed-delivery.md`. Kein Mainpush,
Forcepush, Promote, Domain-/Server-/Rechtewechsel durch diesen Auftrag.

CI-Nachtrag: Der echte CLI-Pilot90b9f94 lieferte PR43 und identischer Replay
führte null weitere Writes aus. Gleichnamige Push-/PR-Kontexte erwiesen sich
als ungenaue CI-Quelle. Die Auswertung bindet deshalb den neuesten gewöhnlichen
Push des exakten Heads/Branches an Workflow, Run und aktuelle Attempt-Jobs;
neuere Fehler und Änderungen im Readback verdrängen alte Erfolge. 27 fokussierte
Commanddouble-Fälle sind vom tatsächlichen GitHub-/Providerbeleg getrennt.

PR43 wurde anschließend extern am27.10.um18:24:12UTC gemergt: mainad17a459,
übernommenerHead90b9f94. Kein Merge durch diesen CLI-Auftrag. Die jüngste
typisierte CI-Auswertung bleibt ein getrenntes lokal geprüftes Delta; nach
Koordinationsanweisung keine weitere automatische Folge-PR-Schleife. Reale
Modellinferenz, GitLabprojektbindung und Produktivabnahme bleiben offen.


### Seitenvideos: lokaler Modul- und Bedienpfad

Basis14929eb (extern gemergter PR44), eigener lokaler Videozweig. Die bestehende
Headless-Shell und Tokens bleiben erhalten. Registry bildet36öffentliche Seiten,
49einzelne Erklärmodule und10getrennte geschützte/interne Routen ab. Geprüfte
byPage/byModule-Projektionen exportieren weder private Freigaben noch Voice-IDs.
Modul-/Locale-/Receipt-/Dateihashbindung verhindert generischen Seitenfilm als
Ersatz für fremde Module. PresenterVideo startet manuell, erhält freie Hero-Bühne,
Ton/Pause, Untertitel, Transkript und Reduced-Motion/Lifecycle-Pause.

53Node-Tests, Typecheck, Normal-/Standalonebuild, unabhängige Sol-Quellprüfung,
Browser6Controllerfälle plus36öffentliche Routen bestanden. Medienelementdouble
ist kein tatsächlicher Film-/Tonnachweis. Frische Gesamt-/Geometriegates werden
im gleichen Paket quellengebunden aufgezeichnet. Tatsächlich0freigegebene Filme;
108optionale Seitenintro- und147Modul-Sprachplätze offen. Sieben Filme/21Szenen
sind Vorproduktion, zwei innere Castingmanifesthashes widersprechen den Bytes.
Keine Generierung, Providerkosten, Voiceclones oder Server-/Domainänderungen.

Master1.3 technischer Ausschnitt (RQ029/RQ038,TST19/TST24) tatsächlich gelesen,
188Quellen gezählt, kein Geschäfts-/Privatregister importiert. Finale AIFly-Figur,
Casting-/Kostenfreigabe, echte Locale-Filme, Rechte und Sicht-/Hörabnahme fehlen;
geschützte Auslieferung benötigt tatsächliche Auth-/Tenantbelege. REA-Einstieg
fehlt hier: blocked_not_reviewed. Kein Ersatzscan oder Live-/Gesamtabschluss.
Matrix, Eingänge und Rückweg: docs/contracts/page-video-coverage.md sowie
page-video-integration.md; technische Belege evidence/page-videos-2026-10-27.

Vorheriger CI-Abschnitt: PR44/4340547 gewöhnlicher Pushlauf40561206111 alle5Jobs
grün; danach extern18:37:38UTC nach14929eb gemergt. Kein eigener Mainmerge.
GitLab-Projekttransport bleibt ungebunden. Actions-Minuten knapp laut datierter
Anbietermeldung; keine unnötigen Wiederholungsläufe oder bezahlten Runner.

### Vorproduktionsmanifest technisch abgeglichen

Libraryquelle libfile_4c255bb88af48191a025daecac648997 versionsgeschützt0→1
korrigiert: SHA34cc18cacddb4e5d952dcd6b07b187d700e999b2acd00c5a41a2a4d212b23377.
Nur zwei Manifestdateien geändert;33Inhaltsdateien, Sprechertexte, Castingstatus
und all_audio_unheard bleiben bytegleich. Unabhängiger Sol-Bytevergleich ohne
Findings;33innere/34äußere Einträge korrekt. Historischer0-Befund bleibt erhalten.
Die Quellintegritätslücke ist geschlossen, keine Medien-/Stimmenfreigabe erteilt.
27gezielte Node-Regressionsfälle bestehen. PR45 beim lesenden Nachweis weiter
Draft85c8f17,0Reviewthreads/Reviews; keine Remote-Threads eigenmächtig gelöst.
Nachtziel28.10.05:00UTC: Medienbereitschaft, öffentliche Flows und geschützte
Portale getrennt prüfen. Fehlende Casting-/Figuren-/Filmbytes und tatsächlicher
Identity-/Runtime-/Releasevertrag erlauben keine100%-Fertigstellungszusage.


### Nachtabschluss: zwei konkrete lokale Flowlücken

PORTAL-LOCAL-01: nach21synthetischen Angeboten liefert die reale lokale Session
jetzt die jüngsten20chronologisch;neuesterPDF und fremdePDF/Send404 getestet.
PUBLIC-LOCAL-02: validierteDE/NL/FR-Auswahl bestimmt statische Marketingtexte;
Nutzerfakten,Replay,Persistenz und published/model_generated:false erhalten.
Vorher26Tests mit3Rotfehlern,danach26grün;separater Sol wiederholte26ohneFinding.
13Browser→API→SQLite-Shopfälle nach Serveränderung real erneut bestanden.
Kein Modellaufruf,Versand,Preisänderung oder neuer produktiver Auth-/APIanschluss.
Nachtfenster/Inputs/Owner im bestehenden Register und
docs/contracts/night-release-checkpoint.md;Frist05:00UTC ist Ziel,keineGarantie.


### Begrenzte Main-CI-/Gatewaygegenprüfung

Main38 / CI40573693739 meldete unsafe_database_sidecar im Mehrprozessclaim;
Queuecode identisch zu grünem4e. 50 lokale Wiederholungen bestanden bereits
vorher; physischer CI-Race nicht reproduziert. Eine deterministisch geprüfte
plausible Null-Link-Sidecarbedingung erhält genau ein neues lstat. Nur Abwesenheit
oder regulär/ein Link wird akzeptiert; MainDB, Symlink, Hardlink und FIFO bleiben
abgewiesen. 25 Queuefälle und50 weitere Mehrprozessläufe grün; Sol wiederholte25
und Claim ohne Finding. Keine SQLite-/Transaktions-Retrys, Locks, Timeouts oder
Sicherheitsrechte geändert. Originalursache bleibt unbewiesen; CI-Logredirect403
wurde nicht umgangen.

Gatewaybefund: Main38 hat keine Consumer der vier AIFLY-Variablen und keinen
ConnectionsHandler. Bestehender MCP primary srv1243952/0.1.8 frisch lesbar;
secondary srv1941843 Identität lesend bestätigt, keine Schreibprüfung. Die
Vercel-App ist dadurch nicht verbunden. Zehn private Routen sind konfiguriert
und aus public Vite ausgeschlossen; Next erhält die Membershipsperre.
Anonyme HEADs scheiterten hier mit ConnectionRefused, nicht als Websiteausfall
gewertet. Keine Secret-/Kundeninhalte gelesen, keine Serverreparatur.
Belege: evidence/gateway-binding-2026-10-27. Nachtplan20:12 mit beiden SHA
verifiziert, N0-N5 als Ergänzung gelesen, Master1.3 unverändert.
Kleinster sicherer nächster Verbindungsschritt: vorhandene native typisierte
Identity-/Healthreads nutzen; für Appintegration erst realen Handler/Commit,
Schema und Issuer/Actor→Tenant/Rolle/Widerrufsquelle binden. Keine SSH-Rootbrücke.


### Bestehendes Next-Projekt: konkreter Buildfix

web prj_BGwGfbTDrnwoZFOZVPoVO0SQ2Ab5 vollständig gelesen: Repo1397719293,
Rootapps/web, Frameworknextjs, Build/Install/Outputnull. Global nurNode24→22
geändert und rückgelesen; Rückweg24 gespeichert, Deploymentliste unverändert.
Fehlgeschlagener Main38-Build hatte abweichend Vite/@site/Outputapps/site/dist
übernommen. Neue apps/web/vercel.json bindet Next/@web/.next und sicheren
frozen-ignore-scripts-Install. Andere Projektroots sind nicht apps/web.
Next-Entwicklungsproxy bleibt auf development beschränkt; Produktion erhält
keinen ungültigen localhost3003-Proxy. Keine neue Fach-API dadurch behauptet.

Erster Turbopacklauf scheiterte an externen vorinstallierten node_modules-
Symlinks. Identische vorhandene Dependencies lokal physisch in diesen Checkout
kopiert, ohne Installation/Download oder breiteren Turbopackroot. Defaultbuild,
Webpack und Typecheck danach grün.8Auth/Deploymenttests und13echte lokale
NextHTTP-Prüfungen bestanden, darunter10geschützteRouten503 ohne Authkonfiguration.
Separate Sol-Prüfung ohne konkretes Finding; fehlgeschlagener Erstlog erhalten.
Clerkübernahme bleibt unfreigegeben und wurde nicht gelesen/kopiert. Keine
Domain-/Auth-/Team-/Firewall-/Billingänderung, kein Productionpromote.
Next-Hinweisseiten sind keine fertigen Portale. Es fehlen echte Module sowie
verifizierter Fach-API-/Issuer-/Membership-/Widerrufsvertrag. Belege und Rückweg:
evidence/next-build-2026-10-27. Normales Branchpreview separat nachweisen.


## Gemeinsame öffentliche Next-/Vite-Komposition · 27.10.2026

Auf Basis682d06f verwenden beide Renderer dieselbe geprüfte öffentliche
Datenprojektion und PublicExperience-Komposition:36Routen,49Erklärmodule,
Guide/Videozuordnungen und sechs bestehende Shop-Einstiege. Keine neuen Medien,
Testartikel oder Backendfähigkeiten als produktiv ausgegeben. ShopPanel ist
jetzt gegen serverseitige Browserzugriffe abgesichert. Next-Titel bleiben pro
Seite/Sprache eindeutig; die bestehenden Tokens und Komponenten gelten weiter.

Next-PWA wird nur durch einen ausdrücklich gewählten lokalen Build aktiviert;
Standardbuild liefert kein Manifest/Worker und registriert nichts. Aktivierter
Testbuild lieferte dieselbe Network-only-Workerquelle wie Vite, Registrierung
und leeren Cache. Danach deaktivierten Standard wiederhergestellt. Kein
Produktionswechsel oder Credentialtransfer.

Lokal bestanden:72Next-Routen-/Sprachfälle DE/NL,10geschützte503-Negative,
Navigation,0Runtimefehler/0externeRequests/0Mutationen;72Vite-Routen-/Sprachfälle
mit1724Vor/Zurück-Kanten und0Issues;108Resizefälle;13Warenkorb-/HTTP-/SQLite-
und4Katalogfälle.53Site- und10Next-Nodetests,Default-Next-,Vite- undStandalone-
Builds sowie487Pythonprüfungen bestanden. Aktuelle Nachweise ersetzen keine
reale Provider-,Membership-,Portal-,Medien- oder Produktionsabnahme.

Unabhängiges Sol-Vorreview ohne offenes Finding; finale Commitbindung und
REA-Analyse der neuen Quellen werden nach Quellsicherung separat geliefert.
Der bestehende REA-Prüfer wurde isoliert integritätsgeprüft geladen,ohne
persistente MCP-Registrierung; dieser Bootstrap ist keine Zertifizierung.
Vertrag und Rückweg:docs/contracts/next-public-parity.md.


## Bestätigtes Original als Chat-Companion · 27.10.2026

Auf Basis5828c14:gemeinsames OracleCompanion ersetzt die beiden N-Symbole im
Chatkopf/Wiederöffnen-Button. AI Fly Oracle ist nur die persönliche
Assistenzbezeichnung;Produkt-/Rollennamen bleiben erhalten. Exaktes vom Nutzer
bestätigtes Original512x512RGBA/217874Bytes/SHA9f705e5b...330f2f66 liegt unverändert
im öffentlichen Assetpfad. Kein neu generierter Charakter,Hero- oder Videoersatz.

Nur tatsächlicher Requeststatus löst eine180ms-Transformtransition aus,ohne
Schleife. Reduced-Motion unterbindet Neigung und Transition;initialer CSS-
Spezifitätsfehler reproduziert und behoben. Sechs gezielte Browserfälle
320/390/1280xmotion/reduce prüfen Originalhash nachHTTP,Dekoration,Keyboard,
Geometrie,Accessibility-Snapshot,working→503→idle und Eingabeerhalt. Screenshots
bleiben interne QA;keine qualifizierte Assistenztechnik-/Videoabnahme behauptet.

72Next-DE/NL- und72Vite-DE/NL-Fälle,1724History-Kanten,108Resize sowie13Shop-
und4Katalogprüfungen bestehen erneut.53Site- und11Next-Nodetests,Next-/Vite-
undStandalonebuilds grün. Auth/Membership,Provider-/Portalfunktionen und sämtliche
externen Grenzen unverändert. Abschließende Gesamtgates,REA-Quellanalyse und
unabhängige exakte Commitprüfung werden nach Quellsicherung separat geliefert.
Quelle und Grenzen:config/companion-avatar.json,docs/contracts/oracle-companion.md.


## Öffentliche Fehlerpfade · lokaler Nachtrag 27.10.2026

Drei belegte Fehler korrigiert: fehlende Anfragefähigkeiten führen zum bestehenden
E-Mail-Kontakt statt in ein deaktiviertes Formular; ein abgelehnter Lazy-Chat-Chunk
bleibt innerhalb einer lokalen Fehlergrenze; Suche/Kategorien/Produkt verwenden
Katalogzustände statt Warenkorbtexte. Keine Verkaufs- oder Providerfreigabe.
18 synthetische Browserfälle (DE/NL,320/390/1280,Session204/Fähigkeiten200/Chunkfehler)
bestehen einschließlich Tastatur,Rückweg,Schließen und Wiederöffnen.
72 Routen-/Sprachfälle je Next und Vite,1724 History-Kanten,108 Resize-,13 Shop-
und4 Katalogprüfungen sowie Next/Vite/Standalonebuilds erneut bestanden.

PostHog/Sentry: fremder Observability-Zweig696c0d2 liegt laut Parent bereits in
Production; Zuständigkeit und kontrollierte Zusammenführung offen. Keine eigene
SDK-Initialisierung,Credentialkopie oder CSP-Lockerung in diesem Nachtrag.
Neue Push-/CI-Läufe wegen ungeklärter Actions-Folgekosten pausiert; letzter
GitHub-Metadatenabruf401,kein Identitätswechsel. Lokal auf Basis a708a2d; kein
Produktionsfix behauptet. Finale lokale Gates,REA und unabhängiges Review werden
mit dem exakten Nachtragscommit im bereinigten Übergabemanifest verbunden.


## Rein lokale Observability-Konsolidierung · 28.10.2026

Neuer Integrationszweig verbindet Rückweg88f965b mit exakt696c0d2; fremder
Branch und Produktion unverändert. Neuere Shared-Shell/Avatar/Next- und drei
Frontendfehlerkorrekturen erhalten. Public-session204, kompatible Metadaten/CSP
und Server-Sentry übernommen; keine CSP-Lockerung, keine aktive Connect-Tokenprobe
oder zusätzliche Pageviewcalls. Ein gemeinsamer PostHog-Exceptioncontroller für
Vite/Next bleibt ohne explizites Consentmanager-Signal,Token,SHA und Environment
aus. Tatsächliche Consentoberfläche noch nicht verbunden.

Echtes gepinntes SDK lokal interceptet: jeVite/Next acht Prüffälle und vier
Wireversuche (drei positiveFehler,ein absichtlicher503),kein externesEvent.
UnhandledError/Rejection,Chat-Boundary,Redaction,Release,keinConsent-Verkehr und
keineSDKpersistenz geprüft. Review fand SDK-Retry-Consentlücke: dauerhaft
abortiertes Signal und endgültiger Widerruf bisNeuladen verhindern auch nach
unmittelbarererneuterEinwilligung alteRetries/Unload. Kein Signalwechsel,kein
Queuehack. Debugfalse und Releasekonflikt-Negativtest ergänzt,nachgeprüft.

Private Mapbuilds:Vite5/Next17Maps in eigener privater Ablage,0Mapsöffentlich;
kein Upload. Plugin-/Debug-ID-/CI-Secret-/Deobfuskationsbeleg und tatsächlich
ausgelieferte Releasebindung bleiben extern/offen. Details:docs/runbooks/sentry.md
unddocs/contracts/observability-local-integration.md. Lokale Gesamtgates,REA und
exakter unabhängiger Review werden dem finalen Integrationscommit zugeordnet.
Keine Pushes/CI/Uploads/externen Testevents/Deployment/Domain- oder Secretaktion.
Next steps: finalenlokalenStand prüfen/sichern;parentklärtWriterübergabe,
GitHub401,Actionskosten,Consent-/Release-/Uploadbindung undProduktionsfreigabe.


## Consent-Oberfläche und begrenzte Sprachkorrektur · 28.10.2026

Auf Basis b4ae9bc ergänzt eine gemeinsame Footerkomponente die bisher fehlende
Fehlerdiagnose-Auswahl. Standard aus, gleichwertige DE/NL/FR-Auswahl, Tastatur und
Mobilansicht, keine Persistenz. SPA-Navigation erhält die Entscheidung; Neuladen
startet aus. Widerruf auch während Laden oder ohne Konfiguration ist bis zum
Neuladen endgültig. Technische Nichtverfügbarkeit und SDK-Aktivierung sind getrennt;
Empfang wird nicht behauptet. 18 UI-Fälle bestanden. Der feste Chatlauncher
überdeckte bei 320px zunächst den Datenschutzlink; behoben und nachgeprüft.
Keine Erweiterung von Rechten, Rechtstexten oder Erfassungszwecken.

Next-Authhinweise waren bei NL noch deutsch und wurden lokalisiert. Die zuvor feste
Providerlokalisierung folgt jetzt der Shellsprache. Serveraufgelöste öffentliche
Props bleiben erhalten; keine Secrets. Review fand zunächst eine Build-/Runtime-
Abweichung durch Clientauflösung: korrigierte Whitelist erhält den Serververtrag.
Vier Locale-Fälle mit Providerdouble und zwei Konfigurationsregressionen bestanden;
echte Auth-/Tenantabnahme bleibt offen. Keine Provideraktivierung.

Öffentlicher Abgleich: evidence/consent-ui-2026-10-28/public-scope-check.json.
36 öffentliche Routen und 49 Erklärmodule bleiben ohne lokal freigegebene Filmbytes;
keine Mockmedien, Bestellungen oder Providerfunktionen als fertig bezeichnet.
Portal-Teilauftrag PORTAL-LOCAL-READ-01 ist im bestehenden Register vorbereitet,
nicht ausgeführt: zuerst Statusprojektion ohne Sync-Gaps-Schreibeffekt extrahieren,
gleiche Datenbank, keine zweite Queue. Vertrag: docs/contracts/next-local-portal-slice.md.
Next steps: Gesamtgates, REA und unabhängiges Review am exakten Endcommit; lokalen
Patch sichern. Keine Pushes, CI, Deployments, DNS, Uploads, Secretkonfiguration oder
externen Testevents.

## Begrenzter CI-Folgefix · 28.10.2026

CI push40613517772 und PR40613522911 am4fc8753 scheiterten vor Tests/Build an ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION. Beide Apps pinnen jetzt posthog-js1.438.24 mit offiziellen npm-Integritäten und vorhandenen kompatiblen älteren Transitiven; keine neue Age-Ausnahme. Lokaler Frozen-Install besteht. Actual-SDK-Tests werden mit frischem Next-Build und erneuter Vite-Optimierung ausgeführt, alle Ingestionrequests lokal abgefangen. Keine externen Testevents.

PR-Triage erhält ausschließlich einen 5-Minuten-Jobtimeout; Labels, Berechtigungen und Fehlersichtbarkeit bleiben erhalten. Bound-AI-Review40613520613 ist blocked_not_reviewed wegen diff_or_metadata_limit_exceeded, automatic_retry_allowed:false. Keine Limits gelockert, keine manuelle Wiederholung, kein Providerrequest aus diesem blockierten Lauf belegt. OpenRouterkosten sind getrennt von Actions zu behandeln.

Autorisierte Clerkübernahme ist abgeschlossen: ausschließlich zwei vorhandene Preview/Development-Werte nach web Preview, Metadatenreadback bestätigt, kein Wert im Repository oder Beleg. Vorhandene Schlüssel sind Testmodus; der bestehende Production-Buildguard akzeptiert diese auch im Preview nicht. Login-/Tenantfunktion bleibt deshalb offen, keine Productionregel gelockert. VercelPreview4fc8753 für canonical und web ist BLOCKED; keine Autorumschreibung oder Deploymentumgehung. Remote-Push/PR/CI im genehmigten10USD-Rahmen bis07:00UTC, keine Main-/Prod-/Domainänderung oder Libraryübertragung.

## Begrenzter Arbeitsplatz-Readschnitt · 28.10.2026

PORTAL-LOCAL-READ-01 auf e2e90e0: reine SQLite-status_snapshot ohne Gapmutation,
serverseitige Rollen-/Tenant-/Projekt-/Ablauf-/Widerrufsprüfung an der bestehenden
LocalAppBackend-Grenze, begrenzte DTOs und gemeinsame DE/NL-Status-/Freigabenansicht
unter /intern/workspace. Die interne API ist zusätzlich geschützt und ohne echte
Backend-/Membershipbindung weiterhin geschlossen. Keine Geschäftsfreigabe oder
Mutation durch die Ansicht. Technische Reviewreceipts sind vorhanden; Budgetwerte
bleiben unbekannt statt aus technischen Limits erfunden.

Fokustests und reale lokale Browser→HTTP→persistente Controllerfixture laufen mit
synthetischen Sessions; kein realer Providerzugriff. Review fand entweichende
DB-/Dateifehler und irreführenden aggregierten In-Bearbeitung-Status ohne Worker:
neutral503/no-store und tatsächliche Offenen-/Reviewzustände korrigiert und separat
nachgeprüft. Vier Browserfälle mit20negativen Sessions,108Resizechecks,502Python-,
62Site-,13Nexttests sowie alle vier lokalen Gesamtgates bestanden. ExakteCommit-
REA/Reviewbelege werden separat an den gesicherten Endhash gebunden. API-/Clerk-Membership und vollständiger Arbeitsplatz bleiben Livegates.
Kein Diff-Limit-/Previewguard-/Credential-/Server-/Domainwechsel.

## Preview-Guard und vollständiger PR-Review · 28.10.2026

Auf7ce5338 baut ein enger Sourcefix auf: matching Testschlüssel ausschließlich
bei serverseitig bestätigter echter VercelPreview trotz optimiertem NODE_ENVproduction.
Production/Live bleibt gültig; unbekannte,widersprüchliche,Development-/Test- und
Customtargetkonfigurationen initialisieren keinen Provider. Keine Schlüsselkopie,
keine neue Tenant-/Membershipfreigabe,kein Deployment oder Autorwechsel.
16Next-Auth/Deploymenttests grün, einschliesslich neuer Positiv-/Negativmatrix.
Gesamtgates/REA und vollständige unabhängige PR-Coverage ab realer PR-Basis folgen
am gesicherten Endhash. Bound-AI-Limit/Scanner/Binärgate bleiben unverändert;
keine zusätzlichen OpenRouter-Aufrufe oder ausgelassenen Dateien.


## Lokale Services-Releaseintegration · 31.10.2026

Basis66185f1; Backend93cb7f04 lokal unverändert gemergt (Merge27c2d65).
Neuer FastAPI-Einstieg ohne Seeds/Indizes/Subprozesse/Retrydaemon; genaue
Next-/Shop-Routingzuständigkeit und hashgepinntes Pythonmanifest. Fehlende
Projekt-/Namespace-/Schema-/Indexbindung sperrt sämtliche Routeraufrufe.
Unbekannter Zahlungsmodus sperrt zustandsändernde Wege und schreibende GETs;
explizite Katalog-/Werkstattlesewege sind separat geprüft. Keine Livebehauptung.

10 Adapter- und14 Backend-Recovery-Faketests bestanden. make check grün.
Vollsuite647 Tests:21 Failures/10 Errors/11 Skips; unveränderte Basis633 Tests:
20 Failures/10 Errors/11 Skips. Zusätzlich veralteter vercel.json-Hash im alten
Reconciliationregister; keine pauschale Neuhashung fremder UI-/Browserbelege.
REA6.8.0 inspiziert echtes kompiliertes Adapterbytecode mit vollständigem
Evidenzreadback; dies ist Inventarisierung, keine Python-Logik-/Produktionsabnahme.
Unabhängige Quellprüfung und behobene konkrete Befunde siehe
docs/reviews/services-integration-2026-10-31.json.

Next-/Vercel-Services-Build, Helper-Bundle, autorisierte Namespacevorbereitung,
Runtimekonfiguration und Provider-/Tenant-/E2E bleiben Releasegates. Keine
Frontendänderung, kein Push/Deploy, kein Produktionsstorezugriff. Vorherige
Frontend-/Shopbranches und letzte bestätigte Produktion unverändert erhalten.
Nächster Owner: Parent prüft Integrationstree und providerseitige Attribution,
Servicesfähigkeit/Compute sowie exakte Bindungen vor jeder Veröffentlichung.

Zusätzliche Abschlussgates: make check-arch rot (ARCH-009/010/019/024/027/029);
make clean-check rot an der Vollsuite. Kein pauschal grüner Release behauptet.


## Services-Buildfortsetzung · 31.10.2026

Tatsächlicher Next16.4.3-Produktionsbuild bestanden. VercelCLI65.2.0 prüft die
Konfiguration und erkennt Next plus FastAPI ohne Detektionsfehler. Ungültiges
runtime=python3.12 entfernt; .python-version pinnt3.12. Reales lokales Services-
Routing: /200; Shop ohne Bindung503; Next-Agentroute405. Keine Providerbehauptung.

@vercel/python28.0.1 baut ein gültiges Function-ZIP mit984Dateien. Elternpfad-
Include war nicht ZIP-fähig: neuer Buildschritt prepare_vercel.py kopiert genau
einen hashgepinnten kanonischen Helper unverändert nach vercel_support; kein
Helperlauf/Netzwerk/Seed. ZIP-Quellen bytegleich; keine Eltern-/absoluten Pfade.
11Adapter-/Packagingtests,14Recoverytests und69Nodechecks bestanden. Die
Architekturfehler009/019 waren fehlende lokale Pakete und sind mit installierter
Toolchain grün.010/024/027/029 bleiben wegen historisch veralteter Quellen-/
Browserbelege rot; gezielter ShopHTTP-Verhaltenstest selbst7/7grün. Basissuite
633Tests mit20Failures/10Errors/11Skips; eigene Provenienzabweichungen werden
nur für geänderte Release-/Fortschritts-/abgeleiteteDokudateien nachgebunden.
Finaler Vollsuite-/Architektur-/Clean-Stand im versionierten Integrationsreport.

Unabhängige Packaging-/Provenienzgegenprüfung ohne weitere konkrete Befunde.
Aktualisierte reale REA-Bytecode-Evidence mit vollständigem Readback im Report.
Freigegeben ist jetzt ein normaler Push auf den dedizierten Integrationsbranch;
kein Main/PR/Merge/Deploy durch diesen Writer. Tatsächlicher Remote-Readback
folgt im Abschluss. Parent übernimmt providerseitig attribuierten Releasecommit,
Plattformbuild und vorhandene Runtime-/Domain-/Storegates. Bildpipelinebranch
bleibt separat und ist nicht in den Shopadapter integriert.

Finaler Basisvergleich: Kandidat647Tests undBasis633Tests jeweils20Failures,
10Errors,11Skips; identische Fehler-/Errorfallnamen. Keine neue eigene Regression.
ARCH-010/024/027/029 und Clean-Gate bleiben ausdrücklich rot. Reproduzierbarer
Builderrunner mit CLI-/Builderversionsprüfung ist im Testverzeichnis enthalten.


## Neuer Namespace-Operator und reine Sitzungsauskunft · 31.10.2026

Ausgangspunkt Owner-Releasea4b74dc (Treeidentischb09). Neuer CLI-Operator ohne
öffentlicheRoute, Lifespan oder Standard-Buildhook: default Metadatenpreflight,
plan ohne ENV/DB, init nur nach exaktem Planhash und erneuter Leereprüfung.
Festes neues Namespace,18Collections/17Zusatzindizes, keine Geschäftsdokumente,
Seeds/Migration/Deletes/Resume. Mongo-same-options-create-No-op berücksichtigt:
per-run128-Bit-Descriptionclaim in source_manifests, exakter Readback, keine
anderen Claimformate freigegeben. Abbruch verlangt Readback, keine Write-Retries.
Realer Store/Init in diesem Teil NICHT aufgerufen. Operatorplan beschreibt den
gezielten einmaligen bestehenden Preview-Buildkontext ohne URIexport.

/api/auth/me als geprüfter reiner DB-Leseweg unabhängig vom Zahlungsmodus;
Session-/Userprüfung bleibt, ungültig/abgelaufen401, MetadataDrift503, kein
Providercall/Write/Moduswechsel. Andere Auth-/Payment-/Writepfade unverändert.
24isolierte Operator-/Adaptertests grün, einschließlich realer Mongo-No-op-
Semantik im Fake, Konkurrenz/Teilabbruch und redigierter Ausgabe. Offizieller
Pythonbuilder erstellt neues gültiges Paket; kein Frontend-, Fachbackend-,
Credential-, Domain-, Workflow- oder Standardvercel.json-Delta. Neue Quellen
und eigene Fortschritts-/Dokubelege gezielt gebunden; fremde UIhashes bleibenrot.
Vorheriger Servicesreport ist historischer b09/a4-Buildbeleg. Dieses Delta hat
eigenen Report docs/reviews/shop-namespace-operator-2026-10-31.json; keine
behauptete produktive Namespace-/Steuer-/Preis-/Versand-/Providerabnahme.


## Gesamtplan v3 Revision 2 · P26.1 · 01.11.2026

Expliziten Startauftrag umgesetzt als isolierter lokaler Datei-Kandidat; Basis
8fc8a3b, F-009 active. Gemeinsame Komponente in Assistent und internem Arbeitsplatz:
Projektlabel/Zweck, begrenzte Auswahl, Bytehash, Dubletten, ausdrückliche zusätzliche
Fassung, Metadatenexport, Abbruch/Verwerfen. Keine Upload-/Tenant-/Connector-/Brain-
oder Serverwirkung. Acht Verhaltenstests, strenge Typprüfung, isolierter Build und
zehn DOM-Simulationschecks bestanden; echte Browser-/Gesamt-/unabhängige Abnahme offen.
REA6.8.0-MCP statisch mit vollständigem exaktem Readback, keine Laufzeitabnahme.
Nachweis und nächste Schritte: docs/implementation/v3r2-p26-local-files.md,
docs/reviews/v3r2-file-intake/report.json. Eigener Zweig verhindert nur seine eigene
Autoauslieferung; keine Änderung vorhandener Workflows/Automationen, kein Main-
oder Releasewechsel. P26 bleibt Teilfortschritt, Gesamtprojekt nicht fertig.

Präzisierung desselben P26.1-Checkpoints: zusätzliches Vercel-Projekt web hat
d60ec797 trotz Rootregel automatisch als SSO-geschützte Preview gebaut, READY,
target null. Kein Customdomain-/Produktivwechsel. Nur für den neuen Zweig wird
dieselbe Sperre jetzt auch in apps/web/vercel.json geführt. Fertige Vorschau
nicht entfernt, keine Entfernungsmöglichkeit im verbundenen Werkzeugkatalog.
Beobachtung und Grenzen im selben Integrationsbericht nachgetragen.


## Gesamtplan v3 Revision 2 · Teamnachtrag · 01.11.2026

Die sieben Schritte der vollständig gelesenen Nutzervorlage auf die bestehenden
neun operativen Profile und den getrennten Katalog aus 44 Enterprise-Rollen/
44 Original-SMB-Skills angepasst. Kein neues Feature aktiviert; F-009 bleibt
der einzige aktive Featurestand. AGENTS.md des parallelen Codex nicht verändert.
Vier begrenzte Recherche-/Prüfaufträge ausgeführt, statischer Teamkandidat mit
17 Tests und gezielter unabhängiger Gegenprüfung; vier Auditlücken behoben.
Vorhandener LocalControl source.verify-Auftrag einmal ausgeführt und mit
unabhängigem Receipt zu verified_complete/local_only geschlossen. Das ist kein
Hermes-, Modell-, Servertenant- oder Brain-Ausführungsbeleg. REA6.8.0 schema-first:
Checker-Bytecode gemessen, vollständiges Evidence-Bundle exakt rückgelesen;
keine Runtimeabnahme. Details: docs/architecture/team-runtime-adaptation-20261101.md
und docs/reviews/agent-team-20261101/report.json.

Browser-Plugin tatsächlich versucht: originating browser context fehlt; native
Codex-Code-Review-Einstellung daher weiter ungeprüft. Hermes v0.22.5 an Commit
bf0203a794a07aac3ff764972ab9087baa4e4f4e gebunden, nicht installiert. Lokaler
[Berichtigung 14.11.2026: „nicht installiert“ galt nur für den damaligen Executor
und ist als Aussage über die Server überholt. Notiz, Quelle: koordinierende Sitzung
über die Hostinger-API, nur lesend, 14.11.2026 ca. 11:50 UTC, hier nicht
nachgeprüft: Auf `srv1941843` läuft seit acht Tagen der Container `hermes`
(Compose-Projekt `docker-hermes`, Home `/root/.hermes`). Version, Konfiguration
und Modell dort sind offen. Vorbereitung und offene Punkte: `ops/hermes/README.md`.]
Python3.12-Executor belegt keine unterstützte Hermes-Python3.14-Hostumgebung.
Aktueller Chat-Handler und 9router-Anschluss sind noch unverbunden.
make check scheitert im partiellen kanonischen Checkout am fehlenden ds-audit-cli;
make test wegen vorgelagerter Sperre nicht gestartet. Isolierte Tests ersetzen
die offene Gesamt-/E2E-/native Reviewabnahme nicht. Keine CI-/Provider-/
Public-/DNS-/Scheduleränderung, keine Drittmitteilungen oder Brainübernahme.


## Separate Sites-Ausgabe · 01.11.2026

Ausgangsquelle `ad4bbf69243b7d489594a8c2d20d7cf838dcf14c`; neues privates Sites-Projekt `appgprj_6ae7ad63df2081918a843f996caf9422`. Produktionsbuild, 77 Site-Tests, Designaudit und Datei-/Konfigurationsintegrität bestanden. Vollsuite und Architekturprüfung nicht grün; historische Quell-/Browsernachweise sowie Backendbetrieb bleiben offen. Keine bestehende Domain oder Runtime umgestellt. Umfang, Messwerte, Quellenübertragung und Owner für Restlücken: `docs/deployment/sites-2026-11-01.md`. Veröffentlichung wird über den nativen Sites-Deploymentstatus nachgewiesen; dieser lokale Eintrag behauptet noch keinen Erfolg.


## SOLL-/Abweichungsprüfung · 01.11.2026

Führender V3R2-Plan Library-v4 quellengebunden: alle 26 Pflichtpakete, 30 Befunde, keine Gesamtfreigabe. Kontakt-Recovery, vier Textsprachen, Mediensteuerung und PWA-Teilkorrekturen umgesetzt. Build/Typecheck, 81 Site-Tests, acht Recovery- und drei HTTP-Tests bestanden; Pythonvollkette 685/28 Failures/9 Errors/14 Skips bleibt rot. Begrenzter Browser- und unabhängiger Reviewnachweis: `docs/reviews/completion-goal-2026-11-01.json`; Fertigstellungspfad: `docs/contracts/completion-goal-2026-11-01.md`. Kein produktiver Backend-/Provider-/Kaufabschluss und keine öffentliche Domainumstellung.


## Graphite Atelier und Medien-/REA-Migration · 01.11.2026

Aktuelle Nutzerentscheidung USER-LUXURY-20261101: warme Graphit-/Metallmaterialien, gezieltes Glas, eingerückte Authcard, optionales Assistenzdock mit Einklapppfeil und drei Bereichsstills. Ungeprüfte Home-Reviewperformances nicht mehr veröffentlicht; Originalquellen erhalten. Build/Typecheck,81 Site- und5 Hero-Vertragsprüfungen bestanden; Vollkette685Tests/40Failures/9Errors/14Skips bleibt rot, keine historische Hashfreigabe erneuert. Desktopteilprüfung und unabhängiger Quell-/Bildreview vorhanden; letzte Browserwiederholung wegen URLpolicyblockiert, finale Mobil/Safari-/Glasabnahme offen. REA6.8.0 isoliert wiederhergestellt,MCP229Tools/6Prompts,Analyse an Prozessownership/ps blockiert. Keine globale Registrierung/HTTP-/Securityänderung oder bezahlte Videogenerierung. Dokumentation: `docs/design/graphite-atelier-media-migration-2026-11-01.md`; native private Veröffentlichung gesondert nachweisen.


## Hero- und Kantenverfeinerung · 01.11.2026

Aktuelle Nutzerkorrektur: Chatinterface beibehalten,nur innenliegende Kante/Licht verfeinern. Große ursprüngliche Trio-Grafik1920×1080bytegleich imHero wiederhergestellt,Miniaturenreihe entfernt,keinBeschnitt/keineGesichtsänderung. Desktop1348px: Bild748,83×421,20px,keinOverflow;Dock28pxRadius,Minimierer48×48px,Einklappen/EscapeFokuszurück. Build/Typecheck+81Site+5HeroTestsbestanden;Fullsuite685/40Failures/9Errors/14Skipsbleibtrot. Enger unabhängigerQuellreviewohneBlocker;Mobil/Safari/Filmabnahmeoffen. AktuellerReadback im bestehenden `docs/reviews/graphite-atelier-2026-11-01.json` unter `refinement`.


## Gesamtteam-Bildfeinschliff · 02.11.2026

Freie Originalfiguren auf gemeinsamer warmer Seitenfläche statt JPEG-Bildkasten; glatter Oracle in allen Erklärmodulen und im Companion vereinheitlicht. Die WebP-Derivate wurden unabhängig auf identische Alphakanäle und sichtbare RGBA-Pixel geprüft. Originaldateien bleiben erhalten. Home-Fachmotive erscheinen jeweils einmal; acht passende Routenzuordnungen, keine Text- oder CTA-Verluste. 85 Site-Tests, fünf Hero-Prüfungen, Build und Typecheck bestehen. Die Vollkette bleibt bei 685 Tests / 43 Failures / neun Errors / 14 Skips rot. Desktop und CSS-Viewports mit 320/390/820 Pixeln geprüft; Dialog und Fokusrückkehr bei 390 Pixeln korrekt. Keine physische Safari- oder Filmabnahme. Vier Fachreviews ohne weitere konkrete Blocker. Aktueller Nachweis im bestehenden Designbericht und Reviewrecord unter `whole_team_image_finish`.

## Begrenzter Fernseher und Chatabstand · 02.11.2026

Neueste Nutzerkorrektur: große TV-/Leinwandfläche mit freien Rändern statt Vollbreite; links am vorhandenen Chat Platz lassen. Ausschließlich die bestehende owner-private Cinema-Darstellung angepasst: Filmrahmen maximal1120px, Originalfilm weiterhin16:9/contain, Text darüber,24px Spaltenabstand bei offenem Desktopdock. Keine Medienbytes, Aussagen, Rechte oder Chatfunktionen verändert. Die konkrete historische „erste oder zweite Szene“ ist nicht eindeutig belegt; vorhandener Film bleibt erhalten.

Build inklusive Typecheck und Compilerprüfung sowie102Site-Tests bestanden. Browser1348px Inhaltsbreite: geschlossene Ansicht1120px Rahmen/1102×619,875px Bild; geöffneter Chat24px Abstand, Bild801,719×450,953px, kein horizontaler Overflow. Separate Browser-Iframe-Viewports390/820/1000px:16:9 contain, kein Overflow; nativer Transkriptmarker und48px Ziel bleiben erhalten. Wiedergabe/Pause, Transkriptöffnung und mobiles Escape-Schließen geprüft. Unabhängiger Quellreview: entfallenen Summary-Marker korrigiert; keine weitere statische Sperre. Keine physische Safari-/Geräteabnahme.

`make check` bestanden; `make test` bleibt rot:697Tests/54Failures/10Errors/14Skips, unter anderem veraltete Quellen-/Evidenzbindungen und fehlendesPython-httpx im Executor. `make clean-check` scheitert ebenfalls an der Pythonvollkette; übrige Sauberkeitsdimensionen melden keinen Fehler. Keine historischen Freigaben oder Prüfsummen zur Erzeugung eines grünen Status umgebunden. Buildhinweise: HostNode24/pnpm11 statt deklarierterNode22/pnpm12; bestehende großeJS-Chunks. Die Gesamtsystemabnahme bleibt offen. Next Steps: native private Sites-Veröffentlichung dieses eng begrenzten Patches und Live-Readback; keine Änderung der Audience oder anderer Laufzeiten.

## 02.11.2026 · Home nach eingefügtem Gesamtkonzept (private Sites-Ausgabe)

Nur Home neu aufgebaut; vorhandener Hero und Identitätsdateien erhalten,
begrenzter zweispaltiger Film, räumliche Rundungen, drei statische Fachbilder,
neue DE/NL/FR/EN-Inhalte und getrennte Produktwege. Preisbeispiel ausdrücklich
hypothetisch, keine neue Ratecard/Kaufaktivierung. Dokumentation und Belege:
`docs/design/home-review-2026-11-02.{md,json}` und
`docs/design/home-browser-qa-2026-11-02.json`.

Build/TypeScript und 118 Site-Tests grün; make check grün. Chromium: 320/390/
820/1280/1440 CSS-px ohne horizontalen Überlauf, Sidebar, Sprachen, echte
Tastaturnavigation, Rechner und manuelle Videowiedergabe geprüft. Kein
nativer Safari-/200%-Zoom-/Sprecherfilm-/Backendnachweis. Vollsuite und
Ausgangsstand jeweils 697 Tests mit 59 Failures/10 Errors/11 Skips; bekannte
Evidenzdrift und fehlendes pymongo bleiben offen. Keine alten Hashbelege
umgeschrieben. Veröffentlichung bleibt in derselben owner-private Sites-Ausgabe;
keine Änderung an öffentlichen Domains oder aktiven Diensten.

## 02.11.2026 · Home-Details und gemeldeter Videohänger

Detailpass auf der bestätigten Home, neuer Befund zum Scroll-/Wiedergabestatus
behoben. Explizite Pause bleibt erhalten; Scrollpause kann wiederaufnehmen.
Ladezustand, Fortschritt und „Erneut abspielen“ unterscheiden Laden/Ende von
Fehlern. Vollständiger natürlicher 10s-Decode, Restart und verzögerte Medienantwort
lokal im Browser getestet. Bestehende stumme Montage unverändert. Home-Typografie,
SVG-Pfeile, Lichtkante und mobile 48px-Steuerung verfeinert. Nachweise und Grenzen:
`docs/design/home-detail-polish-2026-11-02.md`. Build, 118 Site-Tests, make check
grün; historische Gesamtsuite bleibt rot. Keine neuen Tarife, Backendänderungen
oder öffentlichen Domainumstellungen.

## 02.11.2026 · Breite Home statt 1440px-Begrenzung

Direkte Nutzerkorrektur anhand 2761×1280px mit offener Seitenleiste: ganze Home
bis 2160px Inhaltscontainer, Film bis1120px, variable kleine Schrift bis16/18px.
In diesem Fenster: Website2297px, Home2160px, Film1119,97px. Weitere geprüfte
Breiten2560/1920/1440/820/390/320 ohne horizontalen Überlauf. Beleg:
`docs/design/home-wide-qa-2026-11-02.json`. Unterseiten/Chat behalten ihre Grenzen.

Neuer24s-Film explizit beauftragt; das eingefügte Agentur-Drehbuch ist konkret
in `docs/production/art-direction/home-film-24s-20261102.md` vorbereitet.
Runway-Zugang aktuell bestätigt,398Credits. Vorbereitete personenbezogene
Studioszene noch nicht an Runway übertragen: gezielte Rückfrage zur im alten
Produktionsprotokoll dokumentierten Uploadsperre ist offen. Keine bezahlte
Generation, Aufladung, Stimmklonung oder vermeintlich fertiger neuer Film.

## 02.11.2026 · Aktuell: breite Home, neuer Film, Redaktion und Footer

Die zwischenzeitlich offene Referenzübertragung wurde vom Nutzer ausdrücklich
freigegeben. Neuer nativer24s-Studiofilm mit deutscher Off-Stimme und passenden
Untertiteln eingebaut; kein Stimmklon, kein Creditkauf. Letzte Nutzerkorrekturen
(halbierter Leerraum, alle Home-Abschnitte breiter, neue Texte/Angebote statt
Standardkarten/Trenner/Rechner, kompletter Footer und vier Sidebar-Bereiche)
umgesetzt. Kanonischer aktueller Bericht:
`docs/design/home-final-review-2026-11-02.md`. Tests: Build/118Site-Tests/make check
grün; vollständige historische Python-Prüfung bleibt59Failures/10Errors/11Skips
bei697Tests. Browser- und Filmkontrollen mit aktuellen Quellen gebunden.
Nur bestehende private Sites-Ausgabe; keine öffentliche Domainumstellung.

## Home-Verfeinerung · 02.11.2026
Home: gemeinsame Atelier-Oberflächen und Überschriftenverlauf, SEO/GEO/lokale
Sichtbarkeit in DE/NL/FR/EN, Footer-Utilities eingerückt. Die bestehende Glasmontage
enthält jetzt die nachgewiesene ElevenLabs-Offstimme (keine Sprechperformance).
Browserprüfung: Wiedergabe mit unmuted=true, fortschreitender Zeit und dekodierten
Audiobytes; 2709/1440/390px ohne horizontalen Überlauf, Footer seitlich mindestens
24px und unten 48px. Site-Tests: 118 bestanden. Globaler Python-Testlauf: weiterhin
59 Fehlerfälle und 10 Errors wie im vorher dokumentierten Stand; keine globale
Abnahme. Die konkret gelobte frühere Schriftfassung bleibt nicht eindeutig zugeordnet.

## Home-Metadaten · 02.11.2026
Die owner-private Site hat Home-Titel, Beschreibung, Open Graph, Canonical und
strukturierte Angaben zu Organization, WebSite, WebPage sowie dem vorhandenen
Leistungsangebot. DE/NL-Metadaten wurden im Browser gelesen; 118 Site-Tests und
Build bestanden. Die Site bleibt privat und absichtlich `noindex,nofollow`;
öffentliches Ranking, GEO-Zitationen oder lokale Sichtbarkeit sind damit nicht
nachgewiesen. Eine öffentliche Freigabe braucht eigene Domain-/Rechts-/Inhaltsprüfung.
Die Home-Einleitung und der Sichtbarkeitseinstieg wurden in DE/NL/FR/EN auf
konkreten Kundennutzen überarbeitet; Build und 118 Site-Tests erneut bestanden.

## GOAL/LOOP-Fortsetzung · 02.11.2026

Der aktuelle Nutzerauftrag wurde als Revision 2 in das bestehende Completion-Goal
übernommen und im allein führenden Soll-Ist-Abgleich als
`REC-GOAL-LOOP-20261102` gebunden. Kein zweites Register angelegt. Gesamtstatus
bleibt offen; Build/Deployment/Seitenvorhandensein gelten nicht als Abnahme.
Aktueller Arbeitszweig `codex/sitewide-design-2026-11-02` auf `83b23c3`; private
Sites-Ausgabe bleibt Ausgangspunkt. Writer-Abstimmung für Licht, Schatten, Hero
und gemeinsame Designkomponenten ist angefragt; unabhängige Inventar-, Produkt-,
Daten-, Funktions- und Dokumentationsarbeit darf fortgesetzt werden.

Projekt-Skillquellen wurden verifiziert und der begrenzte Context-Executor hat
die aktuellen Kernpolicies ohne fehlende Quelle ausgewählt. Small-Business-
Verifikation bleibt für diesen Slice blockiert, weil die gepinnte Quelle
`LICENSE` im Checkout fehlt; keine SMB-Automation wurde ausgeführt. `make check`
ist grün. `make test` bleibt fail-closed bei 697 Tests / 63 Failures / 10 Errors /
11 Skips: bekannte historische Quellen-/Browserevidenzdrift sowie fehlendes
`pymongo`. Diese alten Hashbelege wurden nicht auf den neuen Stand umgeschrieben.

### P03 · Seitenbezogene SEO- und Social-Metadaten

Erster unabhängiger GOAL/LOOP-Slice auf Branch
`codex/sitewide-design-2026-11-02`: Die portable Site aktualisiert Titel,
Beschreibung, Robots, Canonical, Open Graph, Twitter und `WebPage`-JSON-LD jetzt
gemeinsam nach Direktaufruf, internem Routenwechsel und Sprachwechsel. Dynamische
TEILEKLAR-Detailpfade bleiben ohne belegten Datensatz auf ihrer Basisroute;
unbekannte Pfade werden nicht als eigene Canonical- oder `WebPage`-Seite
ausgegeben. Standalone-Dateien ohne HTTP-Origin bleiben funktionsfähig. Hero,
Licht, Schatten und gemeinsame
Designkomponenten blieben wegen der Writergrenze unverändert.

Nachweis: vier reine Metadaten-Vertragstests, 125 Site-Tests, Typecheck,
Produktionsbuild, LLM-Policy und `make check` bestanden. Reale lokale
Chromium-Prüfung für drei direkte Routen, DE/NL, dynamischen Produktpfad und
Fehlerroute bestand ohne externe Requests. Bericht:
`docs/reviews/sitewide-seo-metadata-2026-11-02.md`.

P03 und der Gesamtauftrag bleiben offen. Die private Vorschau bleibt bewusst
`noindex,nofollow`. Die Sitemap führt jetzt exakt alle 39 öffentlichen Routen;
die drei neueren TEILEKLAR-Wege sind ergänzt und mit drei Vertragstests gegen
fehlende, doppelte oder private Einträge gesichert. `www.nexifyai.de` bleibt die
dokumentierte Zieladresse, wurde aber nicht umgeschaltet oder als indexierbar
freigegeben. Domain, Indexierung und Zielhost-Readback bleiben ein gemeinsames
Veröffentlichungsgate. Der bestehende Matrixverifier bleibt fail-closed an bereits
dokumentierter historischer Hashdrift vieler Altbelege; nur die Dateien dieses
Slices wurden aktuell gebunden, fremde historische Hashes nicht pauschal
freigezeichnet.

Vollständiger `make test` auf diesem Slice: 697 Tests, 61 Fehler, 10 Errors,
11 Skips. Hauptursachen bleiben historische Browser-/Resize-/Registerbelege mit
abweichenden Quellhashes sowie das nicht installierte `pymongo`. Die alte
Exception-Evidenz verwirft zusätzlich den bewusst geänderten `main.tsx`-Stand;
der neue SEO-Browserlauf ist separat aktuell gebunden. Keine Altbelege wurden
auf den neuen Stand umetikettiert und keine Prüfung abgeschwächt.

## 2026-11-08 · Startseite: Logo, Grünton, Elfenbein, Überschriften, Hero-Buttons
- **Ursache Grünton:** `apps/web/app/masterplan-tokens.css` (Mastervorgabe 29.10.) überschrieb die ruhigen Lime-Werte aus
  `config/design-tokens.json` (Richtungswechsel 05.11.: „#C0EE38 war viel zu grell“) wieder mit dem grellen Lime. Overlay verweist
  jetzt auf die Tokenquelle; Glows/Verläufe über `color-mix` statt Rohwerte.
- **Neu in `config/design-tokens.json`:** `color.marke.limeSignal` (#C0EE38, nur das X im Logo) und `color.text.primaer` = Elfenbein
  #F3F0EA statt Reinweiß; `tokens.css/json/ts` neu erzeugt.
- **Logo:** Signet als Champagne/Steel-Maske (`/signet.svg` bleibt unverändert, Bytes sind in Inventaren gebunden), Wortmarke im
  Champagne/Steel-Verlauf, nur das X in CI-Lime; Forced-Colors-Fallback. Kopf und Fuß.
- **Überschriften:** Wortabstand gleicht die enge Laufweite (-.04em) aus (Wortlücken waren fast geschlossen).
- **Hero:** Primär-/Sekundär-CTA sind echte Pill-Buttons (waren Textlinks); Primär mit ruhigem Lime-Verlauf.
- **Ehrlich:** Vier weitere Teilprüfungen von `test_recorded_source_hashes_match_actual_bytes` (design-tokens.json, tokens.css/json/ts)
  sind rot, weil die historischen Nachweis-Pins die alten Token-Bytes festhalten – wie die übrigen ~40 Pins nicht umgebunden.
- **Unterseiten-Hero:** Aktionen (`.pc-hero-actions`) wie die Startseite als Pill-Buttons (Primär ruhiges Lime, Sekundär Linienpill).
- **Audit 38 öffentliche Seiten × 1440/390 px (Dev-Server):** je genau eine H1, kein horizontaler Überlauf, kein Reinweiß-Text,
  Lime nur am X im Logo. `/api/session` liefert im Dev-Betrieb 500 (Rewrite auf nicht laufendes Gateway :3003); der Chat fällt
  dokumentiert in den Orientierungsmodus. In Produktion hat `/api/session` weder Route noch Vercel-Rewrite – offen (Owner: Backend).
  Offen auf der Unternehmensseite: „NeXify AI FACTORY B.V.“ steht als Auftraggeber-Bezeichnung mit Vorbehalt; Rechtsform bleibt unbestätigt.
- **Review-Fund (Vercel-Agent) behoben:** Der Tracking-Abruf konnte eine bereits „zugestellt“ markierte Bestellung wieder auf „versendet“ setzen;
  Vorprüfung und Update schließen jetzt beide Endzustände aus (`fulfillment.py`), Test ergänzt.
- **Buttons einheitlich:** Aktionen sind Pills (999 px, Vorgabe „Pill-Form für Buttons und Chips“) statt 12-px-Rechtecken; die Absenden-/Primärschaltflächen der
  NeXify-Seiten (Kontaktformular, Portal-Tore) tragen wie die Hero-Aktion das ruhige Lime, TEILEKLAR bleibt Champagne.
  Offen: Kontakt-Adresse `mail@nexifyai.cloud` bleibt, bis die Hauptdomain (.de/.cloud) vom Inhaber bestätigt ist.
- **Sichtprüfung (1440 px, Dev-Server) Startseite, Leistungen, Kontakt, Preise & Ablauf, Impressum, NeX2fly, TEILEKLAR-Start:** gemeinsame Vorlage
  stimmig (Logo, Elfenbein, Champagne-Überschriften, Pill-Aktionen, Bilder füllen ihre Rahmen). Inhaltlich offen, nicht erfunden:
  „Preise & Ablauf“ nennt keinen konkreten Betrag (Tagessatz 449 € netto steht nur auf der Startseite) – Aufnahme braucht die Freigabe des Inhabers;
  Impressum-Titel nennt „B.V.“ mit Vorbehalt (Rechtsform unbestätigt); Kontaktadresse `.cloud` vs. Hauptdomain `.de`. Mobile (390 px) nur Startseite gesichtet.
- **CI-Log `repository` (99573db) ausgewertet:** Außer den bekannten historischen Hash-Pins (`test_recorded_source_hashes_match_actual_bytes` u. a.) scheiterten
  drei Tests in `tests/test_contact_http.py`, die lokal ohne FastAPI übersprungen werden, in CI aber laufen: die Prüfumgebung kannte `RequestReceipt`
  und `_requester` nicht. Behoben (Modellklasse übernommen, anonymer Requester eingesetzt); mit installiertem FastAPI lokal 3/3 grün.
