---
name: nexify-auslieferung-pruefen
description: Eine öffentlich erreichbare Auslieferung (Vercel-Projekt, Vorschau-Adresse, Domain) nur über Statuscodes darauf prüfen, ob sie mehr ausliefert als die gebaute Seite, etwa ein ganzes Repository, Sicherungen oder Backend-Quelltext. Verwenden nach jedem neuen oder geänderten Hosting-Projekt, nach Änderungen an Wurzelverzeichnis oder Ausgabeordner, bei jeder neuen Domain, im Tagesbericht und bei Verdacht wie „liegt da das Repository offen", „ist .git erreichbar" oder „warum ist diese Datei abrufbar".
---

# Auslieferung prüfen

Anlass (14.11.2026): Ein Hosting-Projekt lieferte ein ganzes Repository aus, weil es das Wurzelverzeichnis statt der gebauten Ausgabe veröffentlichte. Die Prüfung stellt fest, **ob** etwas erreichbar ist, nicht **was** darin steht. `AGENTS.md` und `CLAUDE.md` gelten unverändert.

## Regeln

- **Nur Statuscodes, nur Teilabruf.** Jeder Abruf fordert ein einziges Byte an und verwirft es. Keine Inhalte öffnen, speichern, zitieren oder in Berichte kopieren, auch nicht zur „Bestätigung“.
- **Nur eigene oder beauftragte Adressen.** Fremde Seiten nach `nexify-kundenprojekt`.
- **Wenige Abrufe.** Die Liste unten einmal je Adresse, nacheinander, keine Wortlisten, kein Durchprobieren von Verzeichnissen.
- **Ohne Namen.** Im Monorepo stehen weder Kundennamen noch Adressen oder Einzelheiten eines Kundenvorfalls; höchstens ein Verweis (`AGENTS.md`, „Inhaberentscheidungen · 14.11.2026“).

## Pfadliste

| Gruppe | Pfade |
|---|---|
| Versionsverwaltung | `/.git/HEAD`, `/.git/config`, `/.gitignore` |
| Dateien der Repository-Wurzel | `/package.json`, `/pnpm-lock.yaml`, `/Makefile`, `/AGENTS.md`, `/CLAUDE.md`, `/README.md`, `/PROGRESS.md`, `/DECISIONS.md`, `/GO-LIVE.md` |
| Umgebungen | `/.env`, `/.env.local`, `/.env.production` |
| Verzeichnisse | `/backups/`, `/backend/`, `/config/`, `/docs/`, `/tools/`, `/tests/`, `/apps/`, `/evidence/` |

Die Liste an das geprüfte Projekt anpassen: die tatsächlichen Wurzeldateien und Ordnernamen des jeweiligen Repositorys eintragen (`git ls-tree --name-only HEAD`).

## Schritte

1. Adresse und Uhrzeit in UTC festhalten. Zuerst die Gegenprobe, damit ein allgemeiner 200 für unbekannte Pfade nicht als Treffer zählt:

   ```bash
   B=https://<adresse>
   curl -s -r 0-0 -o /dev/null -w "%{http_code}\n" "$B/"
   curl -s -r 0-0 -o /dev/null -w "%{http_code}\n" "$B/gibt-es-nicht-$(date +%s)"
   ```

2. Pfadliste abrufen:

   ```bash
   for p in /.git/HEAD /.git/config /.gitignore /package.json /pnpm-lock.yaml /Makefile /AGENTS.md /CLAUDE.md /README.md /PROGRESS.md /DECISIONS.md /GO-LIVE.md /.env /.env.local /.env.production /backups/ /backend/ /config/ /docs/ /tools/ /tests/ /apps/ /evidence/; do
     printf '%s %s\n' "$(curl -s -r 0-0 -o /dev/null -w '%{http_code}' "$B$p")" "$p"
   done
   ```

3. Auswerten:

   | Antwort | Bedeutung |
   |---|---|
   | `404`, `403`, `401` | nicht ausgeliefert oder geschützt |
   | `200` oder `206` | **Treffer**, sofern die Gegenprobe aus Schritt 1 für einen erfundenen Pfad nicht ebenfalls 200 liefert |
   | `301`, `302`, `307`, `308` | Ziel einmal mit demselben Teilabruf prüfen, nicht weiter folgen |
   | `200` auch für den erfundenen Pfad | die Seite beantwortet alles mit 200; dann ist der Statuscode allein kein Beleg, als OFFEN melden |

4. Bericht: Adresse, Uhrzeit, Tabelle Pfad und Statuscode, Zahl der Treffer. Keine Inhalte.

## Bei Treffer

1. **Sofort an den Inhaber**, mit Adresse, Uhrzeit, Pfadliste und Statuscodes. Nicht erst weitersuchen.
2. **Schutz einschalten ist zulässig**, weil umkehrbar: Zugriffsschutz des Hosting-Projekts aktivieren (bei Vercel der Bereitstellungsschutz des Projekts) oder die betroffene Auslieferung pausieren. Was eingeschaltet wurde und wie es zurückgenommen wird, in denselben Bericht.
3. **Löschen und Rotieren entscheidet der Inhaber.** Kein Projekt, keine Bereitstellung, kein Repository und keine Sicherung löschen; keine Zugangsdaten eigenmächtig erneuern (`DECISIONS.md` D-016, D-017). Vorschlagen ja, ausführen nein. War `/.git/` oder eine Umgebungsdatei erreichbar, gelten die darin möglichen Zugangsdaten als offengelegt, bis der Inhaber entschieden hat; das im Bericht so benennen, ohne nachzusehen.
4. Ursache benennen, soweit ohne Inhaltsabruf erkennbar (Wurzelverzeichnis, Ausgabeordner, statische Auslieferung des Checkouts), und nach der Korrektur die Liste erneut abrufen.
5. Betrifft der Treffer ein Kundenprojekt: Einzelheiten nur in dessen Repository und Sitzung (`nexify-kundenprojekt`); hier steht höchstens „Vorfall gemeldet, siehe Kundenprojekt“.

## Grenzen

- Kein Öffnen der Treffer, kein Klonen über `/.git/`, kein Herunterladen von Sicherungen.
- Keine Portscans, keine Anmeldeversuche, keine Lastprüfung.
- Diese Prüfung ersetzt weder `node tools/live-check.mjs` (Funktion der Seite) noch `node tools/exposure-check.mjs` (veröffentlichte Docker-Ports auf einem Server). Die Nachprüfung nach einem Merge, einschließlich der Frage, ob ein Formular seinen Empfänger erreicht, steht in `nexify-klon-fabrik`, „Nach dem Merge: Live-Nachprüfung“.
- Ein Lauf ohne Treffer belegt nur die geprüften Pfade zum geprüften Zeitpunkt.

## Was als Beleg gilt

Die Tabelle Pfad und Statuscode mit Adresse und Uhrzeit in UTC, einschließlich der Gegenprobe. Nach einer Korrektur derselbe Lauf mit `404` oder `401`/`403` auf allen Pfaden. Inhalte sind nie Teil des Belegs.
