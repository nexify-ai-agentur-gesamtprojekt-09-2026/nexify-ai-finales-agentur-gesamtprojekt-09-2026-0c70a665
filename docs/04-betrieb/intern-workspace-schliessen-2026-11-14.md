# `/intern/workspace` schließen (14.11.2026)

Quelle des Befunds: `docs/04-betrieb/werkstattservice-und-suite-ist-soll-2026-11-14.md`, Abschnitte 4.1 und 4.2,
Paket J-8. Diese Notiz beschreibt die Änderung, den Schalter und was offen bleibt. Sie ist keine Abnahme und kein
Nachweis für die Produktion: gemessen ist der lokale Build, ausgeliefert wird erst nach einem Merge durch den Inhaber
oder die koordinierende Sitzung.

## 1. IST vor der Änderung (gemessen 14.11.2026, 20:10 bis 20:20 UTC, ohne Anmeldung, nur lesend)

| Adresse | Status | `<title>` | Kopfzeilen | Inhalt |
|---|---|---|---|---|
| lokal `/intern/workspace` (Build von `main`, `2b8da63`) | 200 | keiner | `private, no-store`, `noindex, nofollow` | drei Flächen: Arbeitsplatz, Mail-Arbeitsplatz, Unterlagen |
| lokal `/intern/posteingang` | 200 | „Geschützter Bereich“ | `private, no-store`, `noindex, nofollow` | Hülle `portal-access-state` |
| `https://nexifyai.de/intern/workspace` | 200 | keiner | `private, no-cache, no-store, max-age=0, must-revalidate`, `noindex, nofollow` | drei Flächen |
| `https://nexifyai.de/intern/posteingang` | 200 | „Geschützter Bereich“ | wie oben | Hülle |

Die Flächen enthielten keine privaten Daten (die Schnittstellen dahinter antworten ohne Anmeldung mit 401), aber die
Rollen `team` und `admin` aus `config/site-map.json` wurden für die Seite nicht geprüft.

## 2. Woran eine Anmeldung heute erkannt wird

Gar nicht, soweit es `apps/web` betrifft (IST):

- `apps/web/proxy.ts` antwortet für geschützte Pfade unter `/api/` mit 401 und setzt für geschützte Seiten nur
  Kopfzeilen (`private, no-store`, `Vary`, `noindex, nofollow`). Eine Sitzung prüft er nicht.
- `apps/web/app/[...slug]/page.tsx` liefert für die neun übrigen geschützten Seiten den Baustein `PortalWorkspace`
  und gibt ihm nur mit, ob ein Cookie namens `tk_session` vorhanden ist. Das ist kein Nachweis: Der Baustein fragt
  damit lediglich `/api/auth/me` des Shop-Dienstes, und erst dessen Antwort entscheidet über Daten und Rolle.
- Eine serverseitige Sitzungs- und Mitgliedschaftsprüfung in `apps/web` fehlt (Lücke G19 im führenden Register,
  `config/acceptance-coverage.json`; Paket S5 im Quelldokument).

Es gibt deshalb keine Bedingung, unter der `/intern/workspace` die Flächen „nur für team und admin“ ausliefern könnte.

## 3. Was geändert ist

- `apps/web/app/intern/workspace/page.tsx` liefert jetzt dieselbe Hülle wie die übrigen geschützten Seiten
  (`PortalWorkspace`, gleiche Übergabe wie in `app/[...slug]/page.tsx`) und trägt den Titel „Geschützter Bereich“.
- Die drei Flächen stehen hinter dem Schalter `NEXIFY_INTERN_WORKSPACE_FLAECHEN` (`apps/web/auth/internal-workspace.ts`).
  Standard ist aus. Nur der genaue Wert `enabled` schaltet ein. Mit `VERCEL_ENV=production` bleibt der Schalter
  wirkungslos.
- `apps/web/proxy.ts` ist unverändert; die Kopfzeilen kamen schon vorher von dort.
- Nichts ist gelöscht: Die drei Bausteine und die Schnittstellen unter `/api/internal/workspace` bleiben.

Der Schalter ist **keine Zugriffsprüfung**. Ist er an, bekommt jeder Aufrufer die Flächen. Er ist für die lokale
Entwicklung und für Browser-Prüfungen gedacht. In der Vercel-Produktion lässt er sich durch einen Umgebungswert nicht
einschalten; die Flächen dort wieder auszuliefern braucht eine Codeänderung, sinnvoll erst zusammen mit der
Sitzungsprüfung aus Paket S5.

## 4. NACHHER (lokaler Build mit der Änderung, ohne Anmeldung)

| Adresse | Status | `<title>` | Kopfzeilen | Inhalt |
|---|---|---|---|---|
| `/intern/workspace` | 200 | „Geschützter Bereich“ | `private, no-store`, `noindex, nofollow` | Hülle, keine der drei Flächen |
| `/intern/workspace` mit Cookie `tk_session=x` | 200 | „Geschützter Bereich“ | wie oben | keine der drei Flächen |
| `/intern/posteingang` | 200 | „Geschützter Bereich“ | wie oben | Hülle |
| `/api/internal/workspace/status` | 401 | | | unverändert |

Der Abschnitt der Hülle ist in beiden Seiten bis auf den Rückkehrpfad im Anmelde-Link gleich (Prüfsummenvergleich).

## 5. Prüfung

Test `apps/web/auth/tests/internal-workspace.test.mjs` (läuft in `pnpm --filter @nexify/web test:auth`):

- Schalter: Standard aus, nur `enabled` an, in der Vercel-Produktion aus.
- Quelltext der Seite: Die Flächen stehen an genau einer Stelle hinter dem Schalter; kein Cookie, keine Kopfzeile und
  kein Parameter entscheidet darüber.
- Auslieferung am gebauten Stand, drei Starts desselben Builds: ohne Schalter keine Fläche, dafür Hülle, Titel,
  `no-store` und `noindex` wie `/intern/posteingang` (Negativprobe, auch mit beliebigem Cookie und mit Parametern);
  mit Schalter alle drei Flächen (Positivprobe, belegt, dass die Kennzeichen treffen); mit Schalter und
  `VERCEL_ENV=production` wieder nur die Hülle.

Die drei Auslieferungsproben brauchen einen Build unter `apps/web/.next`. Fehlt er, werden sie als übersprungen
gemeldet und nicht als bestanden; dann ist die Auslieferung nicht belegt.

## 6. Folgen für gebundene Quellen

`apps/web/app/intern/workspace/page.tsx` ist hash-gebunden. Durch die Änderung weichen diese bis dahin gültigen
Bindungen neu ab (alter Pin `73e9716b…1cfb`, heutige Bytes `e673b6e3…7e19`). Nichts davon ist nachgezogen:

| Ort | Folge |
|---|---|
| `config/acceptance-coverage.json`, `source_sha256` | `test_recorded_source_hashes_match_actual_bytes` rot für diese Quelle |
| `evidence/consent-ui-2026-10-28/next-public.json` | `test_current_consent_pass_is_bound_to_UI_source` rot (`stale_next_consent_source`) |
| `evidence/workspace-read-2026-10-28/browser-workspace-read.json` | `test_workspace_proof_rejects_drift_missing_negatives_and_mutating_reads` rot (`workspace_stale_source`) |
| `evidence/observability-integration-2026-10-28/browser-exceptions-next.json`, `…-vite.json` | Bindung veraltet; die zugehörigen Tests waren schon vorher rot |
| `docs/reviews/v3r2-file-intake/report.json` | Bindung veraltet |

Schon vorher veraltet und davon unberührt: `evidence/mail-workspace-2026-10-28/browser.json`.

Das Erneuern ist eine eigene Arbeit nach `.claude/skills/nexify-belege-und-pins/SKILL.md` (Browserlauf am festen
Commit), nicht Teil dieser Änderung.

## 7. Offen

| Punkt | Wer |
|---|---|
| Merge und Auslieferung; danach Live-Prüfung von `https://nexifyai.de/intern/workspace` | Inhaber oder koordinierende Sitzung |
| Belege und Register-Pin für `page.tsx` neu erheben (Abschnitt 6) | koordinierende Sitzung, eigener PR |
| Sitzungs- und Mitgliedschaftsprüfung in `apps/web` (G19, Paket S5); erst danach können die Flächen für `team` und `admin` geöffnet werden | Inhaber entscheidet Reihenfolge, Agent setzt um |
| Die neun anderen geschützten Seiten übergeben das Vorhandensein des Cookies `tk_session` an die Hülle; das ist unverändert und hier nur übernommen | mit G19 zu klären |
| Die Skriptdateien der drei Bausteine liegen weiter als statische Dateien im Build; sie enthalten keine Daten | kein Handlungsbedarf belegt |

Rückweg: den Commit zurücknehmen; es gibt keine Datenänderung.
