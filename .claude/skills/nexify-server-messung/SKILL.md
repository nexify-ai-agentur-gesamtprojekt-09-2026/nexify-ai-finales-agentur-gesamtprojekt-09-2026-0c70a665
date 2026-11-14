---
name: nexify-server-messung
description: Einen NeXify-Server nur lesend vermessen, wenn es keine Shell gibt – über die Hostinger-API und einmalige Mess-Container (Plattenbelegung, große Ordner, Container, Routen, Dateifundstellen). Verwenden bei „Platte voll", „was läuft auf dem Server", „wo liegt die Konfiguration", vor jeder Server-Bereinigung und immer dann, wenn eine Cloud-Sitzung keinen SSH-Zugang hat.
---

# Server nur lesend vermessen (ohne Shell)

`AGENTS.md`, `CLAUDE.md` und D-016 (`DECISIONS.md`) gelten unverändert. Dieser Skill misst; er ändert und löscht nichts. Aufräumen ist ein eigener Schritt mit Freigabe und Rückweg und gehört in eine Sitzung mit Shell.

## Wann es geht und wann nicht

- **Geht:** Server, auf denen der Docker Manager von Hostinger verfügbar ist. Am 14.11.2026 war das srv1941843.
- **Geht nicht:** Server, deren Betriebssystem der Docker Manager nicht unterstützt (Antwort `[VPS:2044]`). Am 14.11.2026 war das srv1243952. Dort bleiben nur die Metriken der API.
- **Voraussetzung:** Der API-Schlüssel ist als Netzwerk-Geheimnis für `developers.hostinger.com` in der Umgebung hinterlegt. Er wird vom Proxy eingesetzt; nie selbst einen Authorization-Kopf schreiben, nie nach dem Wert fragen.

## Schritt 1: Bestand über die API (reine Lesezugriffe)

Basis `https://developers.hostinger.com/api/vps/v1`:

| Zweck | Pfad |
|---|---|
| Server, Zustand, Adressen | `/virtual-machines` |
| Firewall-Regeln | `/firewall/<gruppe>` |
| Compose-Projekte und Container | `/virtual-machines/<id>/docker` |
| Compose-Inhalt eines Projekts | `/virtual-machines/<id>/docker/<projekt>` |
| Protokoll eines Projekts | `/virtual-machines/<id>/docker/<projekt>/logs` |
| Auslastung | `/virtual-machines/<id>/metrics?date_from=…&date_to=…` |
| Backups, Snapshot | `/virtual-machines/<id>/backups`, `/snapshot` |
| Hinterlegte SSH-Schlüssel | `/public-keys` |

Compose-Inhalte und Protokolle können Geheimnisse enthalten. Vor jeder Ausgabe maskieren: alles hinter Namen mit `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `AUTH`, `DSN`, `URI`, `URL`, und in Adressen den Teil zwischen `://` und `@`. Nie eine Compose-Datei ungeprüft ins Repository legen.

Die Metrik `disk_space` der API ist ungenauer als eine Messung im Container: Am 14.11.2026 nannte sie 94 %, `df` im Container 97 %.

## Schritt 2: Mess-Container

Ein eigenes Compose-Projekt je Messung, per `POST /virtual-machines/<id>/docker` mit `{"project_name": "...", "content": "<compose>"}`:

- Image `docker:27-cli` (bringt `df`, `du`, `grep`, `sed` und den Docker-Client mit).
- `restart: "no"`, damit der Container nach dem Lauf beendet bleibt.
- Wurzel nur lesend einhängen: `- /:/host:ro`. Docker-Socket nur, wenn `docker system df` oder `docker ps` gebraucht wird, und dann ebenfalls `:ro`.
- Befehle als `sh -c` mit Abschnittsmarken (`echo '### name'`) und am Ende `echo '### ENDE'`. In Compose muss `$` als `$$` geschrieben werden.
- Projektname mit Datum, zum Beispiel `nx-messung-20261114`, damit die Hinterlassenschaft erkennbar ist.

Ergebnis über `GET …/docker/<projekt>/logs` abholen; die Zeilen stehen im Feld `line`. `du` über hunderte Gigabyte braucht Minuten: in Abständen von 40 bis 50 Sekunden abfragen, bis `### ENDE` erscheint.

Bewährte Reihenfolge: erst `df -h /host` und `docker system df`, dann `du -xs` auf die oberste Ebene der üblichen Orte (`/var/lib/docker/*`, `/var/lib/containerd`, `/opt/*`, `/root/*`, `/home/*`, `/var/log`), dann je Lauf eine Ebene tiefer in die größten Treffer. Versteckte Ordner eigens mitnehmen (`.[a-zA-Z0-9]*`); am 14.11.2026 lagen 77 GiB in einem versteckten Ordner, den die erste Messung nicht zeigte.

## Stolpersteine

- **Die Schutzschicht vor der API lehnt manche Aufträge ab** (HTTP 403 mit einer Cloudflare-Seite statt JSON). Ausgelöst haben das am 14.11.2026 Aufträge mit `wget`, `netstat`, `network_mode: host` oder Pfaden unter `/etc/`. Abhilfe: diese Bestandteile weglassen und die Frage anders stellen, zum Beispiel Routen aus der Traefik-Datei lesen statt Ports abzufragen. Nicht mit Verschleierung umgehen.
- **Erreichbarkeit von außen nicht aus dem Cloud-Container schließen.** Direkte Verbindungen auf beliebige Ports scheitern dort unabhängig vom Server. Belastbar sind nur HTTPS-Abrufe über den Proxy und die Firewall-Regeln der API.
- **Suche nach Zugangsdaten:** nur Dateipfad und Host ausgeben. Muster für Adressen: `sed -E 's#(schema://)([^@/]*@)?([^/?]*).*#\1***@\3#'`.
- **Nichts schreiben.** Kein Einhängen ohne `:ro`, kein `prune`, kein `rm`. Löschbefehle blockiert die Sitzung ohnehin; nicht über einen Container umgehen.

## Danach

1. Ergebnis in `docs/04-betrieb/server-befund-<datum>.md` eintragen (Vorlage: `server-befund-2026-11-14.md`): Tabelle Ort, Größe, Einordnung; Folgen für die Arbeitsliste.
2. Die beendeten Mess-Projekte dort unter „Hinterlassen von der Messung" aufführen. Entfernen darf sie der Inhaber oder eine Sitzung mit Shell.
3. Vor Eingriffen, die auf dieser Messung beruhen: Snapshot anlegen (`POST …/snapshot`). Er läuft nach 24 Stunden ab.
