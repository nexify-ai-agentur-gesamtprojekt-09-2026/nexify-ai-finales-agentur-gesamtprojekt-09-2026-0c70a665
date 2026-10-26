# Installation, Bereinigung, automatische Dokumentation

**Stand 27.09.2026.** Anleitung für Pascal oder DSH auf dem Server. Alle Befehle sind zuerst als Probelauf (`--check --diff`) auszuführen.

## 1 · Dateien

| Datei | Zweck |
|---|---|
| `playbooks/inventar.example.yml` | Vorlage Inventar → Kopie `playbooks/inventar.yml` |
| `playbooks/site.yml` | Stufen 00 Vorprüfung · 10 Basis · 20 Daten · 30 Kerne · 40 KI · 50 Beobachtung · 95 Doku |
| `playbooks/90-bereinigung.yml` | Entfernen der Altbestände nach Umstellung |
| `playbooks/vorlagen/env.j2` | Umgebungsdatei, nur OpenBao-Pfade |
| `deploy/compose.yml` | Laufzeitstapel mit Profilen `kern`, `gpu`, `beobachtung` |
| `deploy/otel-collector.yaml` | Beobachtung, entfernt Inhalte vor dem Export |
| `.gitlab-ci.yml` | Schranken: Tests, Regelwerk, Designsystem, API-Vertrag, Bauen, Vorschau, Doku |
| `api/openapi.yaml` · `config/*.json` | Vertrag und Konfiguration |

## 2 · Reihenfolge

```bash
cp playbooks/inventar.example.yml playbooks/inventar.yml          # Werte eintragen, keine Geheimnisse
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --check --diff
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags vorpruefung     # Inventar der Container wird gesichert
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags basis
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags daten           # pg_dump + Prüfung vor jeder Migration
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags kerne -e NX_VERSION=<commit>
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags beobachtung
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags ki              # erst mit Router-Werten (B-01)
ansible-playbook -i playbooks/inventar.yml playbooks/site.yml --tags doku
```

Jede Stufe endet mit einer Prüfung. Schlägt sie fehl, stoppt der Lauf. **Nicht enthalten:** Reboot, Live-DNS, vollständige Firewall – nur von Hand nach Einzelfreigabe.

## 3 · Server-Bereinigung

Erst nach Umstellung (B13) und Ablauf des Parallelbetriebs.

1. Inventar aus Stufe 00 prüfen, `nx_bereinigung_inventar` im Inventar eintragen (Name, Pfade, Compose-Projekt).
2. Sicherung wiederherstellen und prüfen (Testwiederherstellung auf eine leere Datenbank) → `nx_sicherung_geprueft: true`.
3. Probelauf: `ansible-playbook -i playbooks/inventar.yml playbooks/90-bereinigung.yml --check --diff -e nx_gate_nachweis=<Nachweis-Zeile>`
4. Pascal bestätigt mit dem Wortlaut `BEREINIGUNG <host> Pascal, TT.MM.JJJJ HH:MM`.
5. Ausführen mit `-e nx_bestaetigung="…"`. Ergebnis: Archiv je Altobjekt mit SHA-256, Bericht `bericht.json`, Health 13/13.
6. Alte DNS-Einträge entfernt Pascal von Hand (Einzelfreigabe).

Was nie entfernt wird: Volumes, Sicherungen, Archive, OpenBao, das ZK-Log.

## 4 · Automatische Dokumentation und Berichte

| Was | Quelle | Wann | Ablage |
|---|---|---|---|
| Dienste- und Hook-Verzeichnis, MCP-Werkzeuge, Betriebshandbuch-Kurzfassung, Regelverzeichnis | `config/*.json` | jede Änderung unter `config/`, `api/`, `lib/` (CI-Job `doku`) | `docs/generiert/` per Merge Request |
| Installationsbericht | Playbook-Lauf | jeder Lauf mit `--tags doku` | `docs/generiert/installationsbericht-<datum>.md` |
| Bereinigungsbericht | `90-bereinigung.yml` | jeder Lauf | Archivverzeichnis auf dem Server |
| Regelentscheidungen | Gateway, MCP, Director | jede Entscheidung | ZK-Log, Ereignis `regel.entscheidung` |
| Lernkandidaten, Watch-List | Lernschleife | täglich | Leitstand, `learning-captures/` |
| Freigabe-Nachweise | Gate | je Phase | `docs/04-betrieb/freigabe-gate-status.md` |
