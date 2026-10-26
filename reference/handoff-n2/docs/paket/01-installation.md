# Band 01 · Installation in einem Befehl

**Stand 28.09.2026 · Entwurf · Werkzeug:** `install.sh` im Wurzelverzeichnis · **Darunter:** `playbooks/site.yml`, `deploy/compose.yml`

## 1 · Kurz

```bash
git clone <repo> nexify && cd nexify
sudo ./install.sh --nur-pruefen   # ändert nichts, zeigt alle Befunde
sudo ./install.sh                 # parallel zum Altbestand (Standard)
sudo ./install.sh --frisch        # frischer Server
```

Es werden **drei Werte** abgefragt: Domain, E-Mail für Zertifikate und Alarme, Modell-Router-Schlüssel. Die Region ist fest `eu-central`. Alle drei lassen sich auch als Umgebungsvariablen übergeben (`NX_DOMAIN`, `NX_EMAIL`, `NX_ROUTER_KEY`), dann fragt das Skript nicht.

## 2 · Zwei Wege

| | Parallel (Standard) | Frisch |
|---|---|---|
| Wann | bestehender Hostinger-VPS Frankfurt, Altbestand läuft weiter | zweiter Server, danach Umzug |
| Projektname | `nexify-neu` | `nexify` |
| Ports (nur 127.0.0.1) | 18080 API · 18090 MCP | 8080 · 8090 |
| Altbestand | wird erfasst (`/var/lib/nexify/altbestand-JJJJMMTT.txt`), **nie** gestoppt oder geändert | – |
| Danach | Umstellung und Bereinigung nach Band 05 (`playbooks/90-bereinigung.yml`) | Daten übernehmen, alten Server nach Frist bereinigen |

## 3 · Ablauf

| Schritt | Was passiert | Bei Fehler |
|---|---|---|
| 1 Vorprüfung | Root, Betriebssystem, 4 Kerne, 8 GB RAM, 40 GB frei, Ports frei, Docker und Ansible vorhanden (sonst Installation aus offiziellen Quellen) | Abbruch mit Ursache und Abhilfe; nichts geändert |
| 2 Drei Werte | Format geprüft (Domain, E-Mail, Schlüssel ≥ 20 Zeichen); Schlüssel wird nicht angezeigt | erneute Eingabe |
| 3 OpenBao | vorhandenes unter `NX_OPENBAO_URL` nutzen; sonst Container `openbao` nur an 127.0.0.1, Initialisierung mit 3 Teilen / 2 zum Entsiegeln, Tresor `nexify/` | Abbruch; Container bleibt zur Diagnose |
| 4 Router-Schlüssel | nach `nexify/router` in OpenBao, Variable danach gelöscht | Abbruch |
| 5 Inventar | `/var/lib/nexify/inventar.yml` aus den Werten | – |
| 6 Probelauf | `ansible-playbook … --check --diff --tags vorpruefung,basis` | Abbruch, Protokoll nennen |
| 7 Bestätigung | Eingabe des Wortes `installieren` | Abbruch ohne Änderung |
| 8 Installation | Playbook-Stufen vorpruefung · basis · daten (mit Sicherung vor Migration) · kerne · beobachtung · doku | Playbook stoppt an der Stufe |
| 9 Nachweis | Health 13 Abrufe in 60 s mit Cache-Buster; alle `200` | Abbruch mit Log-Befehl |

Protokoll jedes Laufs: `/var/log/nexify/install-<Zeit>.log`.

## 4 · Nach der Installation – drei Handgriffe

1. **OpenBao-Init-Datei** (`/var/lib/nexify/openbao/INIT-SOFORT-OFFLINE-SICHERN.json`, nur wenn neu eingerichtet): zwei der drei Teile getrennt offline sichern, Root-Token nach Anlage eines Betriebs-Tokens widerrufen, Datei löschen.
2. **DNS für die Vorschau:** nicht im Skript (R-02). Karte im Entscheidungs-Postfach mit Wortlaut `FREIGABE LIVE-DNS <domain> … Pascal, TT.MM.JJJJ HH:MM`.
3. **Bericht prüfen:** `docs/generiert/installationsbericht-<datum>.md`.

## 5 · Was nie passiert

Kein Reboot · keine DNS-Änderung · keine vollständige Firewall-Änderung · kein Stoppen fremder Container · kein Geheimnis auf der Platte außer der OpenBao-Init-Datei (Hinweis rot im Lauf).

## 6 · Offen in diesem Band

- Projektname und Ports sind durchgereicht: `install.sh` → Inventar → `env.j2` (`NX_PROJEKT`, `NX_PORT_API`, `NX_PORT_MCP`) → `compose.yml` und Health-Abrufe in `site.yml`.
- `install.sh` ist nicht auf einem echten Server gelaufen (keine Umgebung hier).
- PDF-Fassung folgt, wenn Band 01 freigegeben ist.
