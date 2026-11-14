# D-019 Folge 5: Docker-Socket aus dem Hermes-Container nehmen

Stand 14.11.2026. Vorlage, nichts davon ist ausgeführt. Freigabe des Inhabers je Schritt (D-016).

## IST (Hostinger-API, nur lesend, 14.11.2026 20:29 UTC)

Die Compose-Datei des Projekts `docker-hermes` auf srv1941843 enthält unter `services.hermes.volumes` die Zeile

```yaml
      - /var/run/docker.sock:/var/run/docker.sock
```

dazu `network_mode: host` und `HOME=/root`. Wer im Container Befehle ausführt, kann über den Socket jeden Container starten und damit den Host übernehmen.

## Genaue Änderung

Genau diese eine Zeile entfällt. Sonst ändert sich an der Datei nichts.

```bash
cd <Verzeichnis des Projekts docker-hermes>          # über `docker compose ls` feststellen
cp -p docker-compose.yml docker-compose.yml.vorher-socket
grep -n 'docker.sock' docker-compose.yml               # erwartet: genau eine Zeile
sed -i '\#- /var/run/docker.sock:/var/run/docker.sock#d' docker-compose.yml
diff docker-compose.yml.vorher-socket docker-compose.yml   # erwartet: genau eine entfernte Zeile
docker compose config >/dev/null && echo gueltig       # startet nichts
```

Wirksam wird es erst mit dem Neuerstellen des Containers (Schritt 5 der Anleitung in `../README.md`); ein `docker restart` genügt nicht, weil Volumes beim Erstellen festgelegt werden.

## Vorher prüfen

```bash
docker exec hermes sh -c 'command -v docker || echo "kein docker-Client im Container"'
grep -n 'backend' /root/.hermes/config.yaml            # `terminal.backend: docker` bräuchte den Socket
```

Die Fassung im Repository setzt `terminal.backend: local` und braucht den Socket nicht. Nutzt die vorgefundene Konfiguration ein Docker-Backend oder ruft ein Werkzeug (`rea`, eigene Skripte) `docker` auf, fällt diese Funktion weg; das ist dann vor dem Entfernen zu entscheiden.

## Prüfung danach

```bash
docker inspect hermes --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' | grep -c docker.sock   # erwartet: 0
docker exec hermes sh -c 'test -S /var/run/docker.sock && echo NOCH-DA || echo entfernt'           # erwartet: entfernt
```

## Rückweg

```bash
cp -p docker-compose.yml.vorher-socket docker-compose.yml
docker compose up -d hermes
```

## Was damit nicht erledigt ist

`network_mode: host` und Root im Container bleiben. Der Container erreicht weiter jeden Dienst, der auf dem Host an `127.0.0.1` lauscht, und schreibt als Root in die eingehängten Ordner (`/root/.hermes`, `/usr/local/lib/hermes-agent`). Ein eigener Dienstnutzer und ein eigenes Netz sind eine weitere Inhaberentscheidung (`../README.md`, „Offen“ Punkt 4).
