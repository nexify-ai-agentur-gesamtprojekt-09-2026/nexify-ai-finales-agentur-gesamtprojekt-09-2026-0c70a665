# Freigabe-Gate · Status je Phase · 27.09.2026

## Aktualisierung · 27.10.2026

**Urteil: Preview technisch bereit, Produktionsfreigabe weiterhin gesperrt.**

Der Stand `3f19561` auf `factory/goal-completion-2026-10-27` hat im GitHub-CI-
Lauf `40497507088` alle fünf Jobs bestanden. Das kanonische Vercel-Projekt
`nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665` meldet für denselben
Commit `Deployment has completed`. Der bekannte Preview-Host ist von außen
zugangsgeschützt und antwortet mit HTTP 302 zu Vercel SSO. Damit sind weder ein
anonymer Seiten-Readback noch der unten geforderte Health-Lauf belegt.

Die Hartsperre bleibt bestehen, bis mindestens folgende Nachweise am exakt zu
veröffentlichenden Commit mehrfach fehlerfrei vorliegen:

1. echte Anmeldung, Abmeldung und Wiederanmeldung mit vereinbarter starker
   Authentisierung sowie negative Rollen-, Membership- und Tenant-Gegenproben;
2. sämtliche vertraglich benötigten Provider-, Workspace-, Daten-, Mail-,
   Kalender-, Zahlungs- und Medienverbindungen mit Fehler- und Widerrufspfaden;
3. Preview-Readback, mindestens 60 Sekunden Health mit Cache-Buster, Belastungs-
   und Wiederanlaufprobe innerhalb der vereinbarten Grenzen;
4. tatsächlich ausgeführter und gemessener Rollback auf die letzte freigegebene
   Fassung;
5. bereinigte Vercel-Projektzuordnung: Die zusätzlichen Altprojekte `web` und
   `site-k23m` schlagen für denselben Commit in ihren eigenen Konfigurationen
   fehl und dürfen kein Freigabesignal liefern;
6. dokumentierte Endabnahme. Erst danach dürfen Main, Produktivdomain oder DNS
   umgestellt werden.

Der folgende historische Status bleibt als Herkunftsnachweis erhalten; seine
Messhinweise vom September ersetzen die aktuelle Aktualisierung nicht.

**Urteil: Auftrag „Liveschaltung“ nicht ausführbar.** Keine Phase besteht Stufe 1. Diese Tabelle ist die Nachweis-Vorlage; sie wird auf dem Server ausgefüllt, nicht hier.

**G5-Hinweis:** Die Aussage „Vorschau fehlt“ stammt aus der Messung vom 08.09.2026 und ist in dieser Umgebung nicht neu messbar (kein Netz-/DNS-Zugriff). Vor P0 neu messen: `dig +short vorschau.nexifyai.cloud` und `curl -sI "https://vorschau.nexifyai.cloud/health?cb=$(date +%s)"`.

## Stufen je Phase

| Phase | 1 Vorschau | 2 Health 60 s | 3 E3 (P/N/G/R) | 4 Rollback-Plan | 5 Gutachten | Endabnahme |
|---|---|---|---|---|---|---|
| P0 Vorschau-Stufe | FAIL (fehlt) | – | – | ja (DNS-Eintrag löschen) | – | Einzelfreigabe DNS offen |
| P1 Repo + Rechenkern | FAIL | FAIL | P ✓ N ✓ G ✓ **R ✗** | ja | offen | offen |
| P2 Auth/RLS | FAIL | FAIL | ✗ nicht gebaut | ja | offen | offen |
| P3 Buchungskern | FAIL | FAIL | ✗ | ja | offen | offen |
| P4 Director/Agenten | FAIL | FAIL | ✗ | ja (`#stopp`) | offen | offen |
| P5 Portale | FAIL | FAIL | ✗ | ja | offen | offen |
| P6 Companion | FAIL | FAIL | ✗ | ja | offen | offen |
| P7 Abläufe W01–W15 | FAIL | FAIL | ✗ | ja | offen | offen |
| P8/P9 Live, Hypercare | – | – | – | – | – | – |

Evidenz heute: Rechenkern **E2+** (automatisiert, Negativ und Grenzwert, Rollback fehlt) · myADMIN-Oberfläche **E2** (automatisierte Sichtmessung) · alles andere **E0**.

## Was fehlt, wer beschafft es, erster Schritt

| Fehlt | Wer | Erster Schritt |
|---|---|---|
| Einzelfreigabe Live-DNS Vorschau | Pascal | Freigabe-Zeile aus dem Runbook in den Chat |
| Vorschau-Stufe mit `noindex`, Zugangsschutz, `/health` | DSH / Pascal auf Frankfurt | nach Freigabe anlegen, Health 60 s messen (Protokoll unten) |
| Rollback-Test Rechenkern | A05 im Repo | Buchung → Storno → Saldo 0, als Test |
| E1–E5 | Pascal | Entscheidungsliste im Umsetzungsplan |
| Endabnahme je Phase | Pascal | nach grüner Nachweis-Zeile |

## Health-Protokoll (Vorlage, Stufe 2)

```
START=$(date -u +%FT%TZ); n=0
for i in $(seq 1 13); do
  code=$(curl -s -o /dev/null -w '%{http_code} %{time_total}' "https://vorschau.nexifyai.cloud/health?cb=$(date +%s%N)")
  echo "$(date -u +%T) $code"; n=$((n+1)); sleep 5
done
echo "Start $START · $n Abrufe · Cache-Buster ja"
```
PASS nur, wenn alle 13 Abrufe `200` liefern.

## Nachweis-Zeile (erst schreiben, wenn alle Felder belegt)

```
[<ISO-UTC>] FREIGABE-NACHWEIS <Phase> | Vorschau: PASS | Health 60s: PASS (13 Abrufe, Cache-Buster ja)
  | E3: PASS (Positiv/Negativ/Grenzwert/Rollback) | Rollback ausgefuehrt: ja
  | Gutachten: <Nr> | Endabnahme: erteilt <Zeitstempel>
```
Vor dem Schreiben Log-Größe prüfen (hart gedeckelt, lautlose Abweisung).

## Betriebsrhythmus nach Live

Stündlich Außenwächter (mit Cache-Buster) · täglich Innenwächter · wöchentlich Vollcheck. Bestehende Wächter (G6/I) weiterverwenden. Sicherungsebene je Wächter mit anderem Auslöser und Träger. Eine Meldestelle je Vorfall.
