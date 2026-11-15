# Markenzeichen-Sicherung · Normstand und Rückweg

**Stand 14.11.2026 · Repo-Nachweis.** Diese Sicherung macht den sichtbaren
Design-Normstand nachvollziehbar und beschreibt den Rückweg, falls das Design
versehentlich driftet. Sie ist reiner Repository-Nachweis — **kein**
Server-Backup (D-016). Sie verändert kein Gate und misst nichts neu; sie hält
nur fest, was heute gilt, und nennt die Wahrheit, auf die zurückzustellen ist.

## Was gesichert ist

Der Normstand ist der heutige, committete Zustand der sichtbaren Designdateien.
Die maßgeblichen Belege:

| Beleg | Rolle |
|---|---|
| `config/design-tokens.json` | einziger Wertespeicher für Farbe, Typo, Raum, Radius, Tiefe, Glas, Bewegung |
| `packages/tokens/{tokens.css,tokens.json,tokens.ts}` | daraus abgeleitete Token-Ausgaben; `build-tokens.mjs` erzeugt sie |
| alle `*.css` unter `apps/web/app/` (inkl. `masterplan-tokens.css`, `globals.css`, `measurement-system.css`) und `apps/web/components/**` rekursiv (inkl. `shop/shop.css`, `shop/Storefront.css`) | das sichtbare Material der öffentlichen Seite und des Shops |
| `apps/web/components/{IdentityHero,HomeContent,AtelierFilm,ActionControl,SiteNavigation,SiteFooter,Workspace}.tsx` und `apps/web/components/shop/CommerceHeader.tsx` | die Bausteine, die der Gleichmacher misst (NeXify-Kopf/Fuß/Hero und die Shop-Kopfleiste) |
| `tools/gleichmacher.mjs`, `tools/kopfleiste-regel.mjs` | der Laufzeit-Wächter und seine Kopfleisten-Regel |
| `config/text-resize-sources.json` | die byte-genaue Bindung der Designverzeichnisse |

Die genauen Prüfsummen (sha256) dieser 48 Dateien stehen in der Schwesterdatei
`docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256`. Diese Datei ist das
Normstand-Manifest und zugleich die additive, nur lesende Prüfung „Design
unverändert gegen den gepinnten Stand".

Festgehalten am Commit: siehe `git log` dieses Zweigs
(`claude/markenzeichen-library`) bzw. dem Merge-Commit auf `main`, der diese
Datei einführt. Der zugehörige Stand entspricht `origin/main` am 14.11.2026
(HEAD `9c9c806`, „stand: … (#199)").

## Die additive Nur-Lese-Prüfung (Design-Sperre festgezogen)

Ein Lauf bestätigt, dass keine der 48 Designdateien seit dem Einfrieren
verändert wurde:

```bash
sha256sum -c docs/01-konzept/markenzeichen-normstand-2026-11-14.sha256
```

- **Alle `OK`, Exit 0:** Das sichtbare Design ist unverändert gegen den
  gepinnten Normstand.
- **Eine Zeile `FAILED`:** An dieser Datei ist das Design gedriftet. Das ist ein
  Befund, keine Erlaubnis, das Manifest nachzuziehen. Weiter unten „Rückweg".

Diese Prüfung läuft als Ziel `check-markenzeichen` und ist **Vorbedingung von
`make check`** (`Makefile`). Sie ist deshalb kein bloß manuelles
Diagnosewerkzeug, sondern Teil jedes Laufs, der `make check` ausführt:

- **CI** (`.github/workflows/ci.yml`: `make check && make test && make check-arch`)
  — bei jeder Abweichung rot.
- **Manueller, opt-in Deploy-Workflow** (`.github/workflows/vercel-deploy.yml`:
  `make check && make test`) — nur per `workflow_dispatch` und nur bei gesetzter
  Repo-Variable; nicht der automatische Produktionsweg.

**Grenze (ehrlich):** Die **automatische Produktions-Auslieferung läuft über die
GitHub-Vercel-Integration** auf `main` und baut direkt
(`pnpm --filter @nexify/web build`) — **ohne** `make check`. Diese Sperre blockiert
den Vercel-Integrations-Build daher **nicht**; sie wirkt in CI und im manuellen
Deploy-Workflow. Eine Produktionssperre im Auslieferungsweg wäre eine
Serveränderung (D-016) und ist nicht Teil dieses additiven Nachweises.

Sie misst keine Werte neu und schwächt kein bestehendes Gate ab (auf dem heutigen
Stand meldet sie 48 Dateien `OK`, `make check` bleibt grün) und nutzt
`sha256sum -c --strict`, sodass auch fehlerhaft formatierte Manifestzeilen als
Fehler zählen. Sie ergänzt die bestehenden Wächter, ersetzt sie nicht:

1. `tools/gleichmacher.mjs` (Laufzeit, gegen die Startseite);
2. `config/text-resize-sources.json` + `tools/check_text_resize_evidence.py`
   (byte-genaue Belegbindung);
3. `config/acceptance-coverage.json` + `test_recorded_source_hashes_match_actual_bytes`
   (Register-Prüfsummen).

Das Manifest ist bewusst eine zusätzliche, leicht lesbare Konsolidierung dieser
Wahrheit an einem Ort — mit genau einem Standardwerkzeug prüfbar.

## Rückweg bei Design-Drift

Welcher Beleg ist die Wahrheit? **Der committete Normstand**, nicht das, was
gerade im Arbeitsbaum oder live steht. Vorgehen, wenn das Design versehentlich
driftet:

1. **Drift lokalisieren.** `sha256sum -c …normstand-2026-11-14.sha256` nennt die
   abweichende(n) Datei(en). Ergänzend `git status` und `git diff -- <datei>`.
2. **Ursache klären.** War die Änderung gewollt (Inhaberentscheidung mit neuem
   Normstand) oder ein Versehen/Regression?
3. **Versehen → zurückstellen.** Den committeten Normstand wiederherstellen:
   ```bash
   git checkout <normstand-commit> -- <abweichende-datei>
   ```
   Danach erneut `sha256sum -c` (alle `OK`), dann die bestehenden Wächter laufen
   lassen (`tools/gleichmacher.mjs` lokal gegen den Build, Belegprüfer). Der
   Normstand-Commit ist der, der diese Sicherung einführt (bzw. ein späterer, der
   das Manifest mit belegter Freigabe fortgeschrieben hat).
4. **Gewollte Änderung → eigener Weg.** Eine echte Designänderung ist **nicht**
   Gegenstand dieser Sperre. Sie braucht eine ausdrückliche Inhaberfreigabe,
   läuft über `.claude/skills/nexify-klon-fabrik` (Ursache beheben, gegen die
   Startseite messen) und erneuert die Belege über
   `.claude/skills/nexify-belege-und-pins` (Browserlauf am festen Commit). Erst
   danach wird dieses Manifest mit Begründung und neuem Commit fortgeschrieben —
   nie „nebenbei", nie um einen Befund verschwinden zu lassen.

## Grenzen

- Kein Server-Backup, keine Serveränderung (D-016). Nur Repository-Nachweis.
- Das Manifest wird nicht von Hand „passend" gemacht. Eine `FAILED`-Zeile ist ein
  Befund; sie wird behoben oder, bei gewollter Änderung, auf dem Weg oben belegt
  fortgeschrieben.
- Diese Sicherung erteilt keine Freigabe, lockert kein Gate und ändert keine
  Preise oder Rechtstexte (D-017).
- Vorbestehender Hinweis zur Vergleichsbasis: Auf `main` melden einige
  Register-/Browserbelegprüfungen bereits Drift (u. a.
  `test_recorded_source_hashes_match_actual_bytes` für mehrere Designquellen,
  `check_browser_evidence` für `apps/site/src/Auth.tsx`). Das ist der Stand von
  `main` und wird von dieser Sicherung weder verursacht noch geheilt; dieses
  Dokument fügt nur die zusätzliche, in sich grüne Manifestprüfung hinzu.
