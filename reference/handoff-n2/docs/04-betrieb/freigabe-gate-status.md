# Freigabe-Gate · Status je Phase · 27.09.2026

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
