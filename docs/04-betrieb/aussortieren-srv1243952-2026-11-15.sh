#!/usr/bin/env bash
# Aussortieren auf srv1243952 · 15.11.2026
#
# Regel des Inhabers: "alles, was älter ist wie 30 Tage und nicht verbaut ist, kann weg".
# Ohne Schalter wird NUR gemessen und aufgelistet (Trockenlauf). Entfernt wird erst mit --ausfuehren.
#
#   bash aussortieren-srv1243952-2026-11-15.sh                 # Trockenlauf: messen, Kandidaten zeigen
#   bash aussortieren-srv1243952-2026-11-15.sh --ausfuehren    # Kandidaten der Klassen A und B entfernen
#   bash aussortieren-srv1243952-2026-11-15.sh --ausfuehren --nur A   # nur Klasse A (Caches, Scanner-Reste)
#
# Klassen
#   A  Abgeleitetes, jederzeit neu erzeugbar (Scanner-Zwischenspeicher, Paket-Caches, Build-Cache),
#      unabhängig vom Alter, sofern kein laufender Prozess darin arbeitet.
#   B  Älter als 30 Tage UND nicht verbaut. "Nicht verbaut" heißt hier, alles muss zutreffen:
#      keine Datei darin jünger als 30 Tage · kein Einhängepunkt · von keinem Container eingebunden ·
#      von keinem Prozess benutzt · in keiner Compose-Datei, keinem Timer, keinem cron-Eintrag und
#      keiner Dienstkonfiguration als Pfad genannt · bei Sicherungsdateien bleibt der neueste Stand je Art.
#   D  Nie anfassen: Datenbanken, Docker-Volumes, vsk-mongodb, Traefik und Zertifikate, Infisical,
#      GitLab, SSH-Schlüssel, Auslagerungsdateien, Systemverzeichnisse, alles unter 30 Tagen.
#      Was auf ein Schutzwort passt oder verbaut ist, erscheint als GESCHUETZT bzw. UNKLAR und bleibt liegen.
#
# Das Skript ruft nie auf: docker volume prune, docker system prune, docker image prune -a,
# systemctl, Neustarts, Updates. Es liest keine Zugangsdaten und gibt keine Dateiinhalte aus.
# Bei jeder Änderung an der Containerliste während des Laufs bricht es ab.

set -u
export LC_ALL=C

ALTER_TAGE=30
MIN_MB=50                       # kleinere Posten werden nicht aufgeführt
AUSFUEHREN=0
NUR=""
W="${AUSSORTIEREN_WURZEL:-}"    # nur für die Probe in einem Testbaum; auf dem Server leer lassen

while [ $# -gt 0 ]; do
  case "$1" in
    --ausfuehren) AUSFUEHREN=1 ;;
    --nur) shift; NUR="${1:-}" ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "Unbekannter Schalter: $1" >&2; exit 2 ;;
  esac
  shift
done
case "$NUR" in ""|A|B) ;; *) echo "--nur erwartet A oder B" >&2; exit 2 ;; esac

if [ -z "$W" ] && [ "$(id -u)" != "0" ]; then echo "Bitte als root ausführen." >&2; exit 2; fi
HAT_DOCKER=0; command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1 && HAT_DOCKER=1
if [ -z "$W" ] && [ "$HAT_DOCKER" = 0 ]; then echo "docker nicht erreichbar – Abbruch, weil die Einbindungen nicht prüfbar sind." >&2; exit 2; fi

STEMPEL="$(date -u +%Y%m%dT%H%M%SZ)"
AUS="${W}/root/aussortieren-20261115/$STEMPEL"
mkdir -p "$AUS" || exit 2
PROTOKOLL="$AUS/protokoll.tsv"
LISTE="$AUS/kandidaten.tsv"
: > "$LISTE"
printf 'utc\tklasse\tpfad\tgroesse_mb\tjuengste_aenderung\tfrei_vorher_b\tfrei_nachher_b\tergebnis\n' > "$PROTOKOLL"

sag() { printf '%s\n' "$*" | tee -a "$AUS/lauf.txt"; }
frei_b() { df -B1 --output=avail "${W:-/}" | tail -1 | tr -d ' '; }
ps_bild() { [ "$HAT_DOCKER" = 1 ] && docker ps -a --format '{{.Names}}|{{.State}}' | sort; }

# ---------------------------------------------------------------- 1 · Messen (ändert nichts)
sag "== 1 · Ausgangslage $(date -u +%FT%TZ) · Modus: $([ $AUSFUEHREN = 1 ] && echo AUSFUEHREN || echo Trockenlauf)"
df -h "${W:-/}" | tee "$AUS/01-df.txt"
if [ "$HAT_DOCKER" = 1 ]; then
  ps_bild > "$AUS/02-ps-vorher.txt"
  sag "Container: $(wc -l < "$AUS/02-ps-vorher.txt") (Zustände: $(cut -d'|' -f2 "$AUS/02-ps-vorher.txt" | sort | uniq -c | tr '\n' ' '))"
  docker system df | tee "$AUS/03-system-df.txt"
fi
for u in https://teileklar.shop/ https://unternehmensbot.eu/; do
  printf '%s %s\n' "$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$u" 2>/dev/null)" "$u"
done | tee "$AUS/04-seiten-vorher.txt"

sag ""
sag "== 2 · Größte Verzeichnisse (GiB)"
du -xs --block-size=1M "${W}"/* "${W}"/opt/* "${W}"/opt/nexifyai/* "${W}"/opt/backups/* "${W}"/var/* "${W}"/var/lib/* \
   "${W}"/root/* "${W}"/root/.[a-zA-Z0-9]* "${W}"/home/* "${W}"/home/*/* "${W}"/home/*/.[a-zA-Z0-9]* 2>/dev/null \
  | sort -n | tail -45 | awk '{printf "%8.1f  %s\n", $1/1024, $2}' | tee "$AUS/10-du.txt"

sag ""
sag "== 3 · In den letzten 24 Stunden geschrieben (Ursache des Anstiegs)"
sag "-- größte Dateien (MiB · Zeit · Pfad)"
find "${W:-/}" -xdev -type f -mmin -1440 -size +100M -printf '%s\t%TF %TH:%TM\t%p\n' 2>/dev/null \
  | sort -n | tail -40 | awk -F'\t' '{printf "%9.0f  %s  %s\n", $1/1048576, $2, $3}' | tee "$AUS/11-neu-24h-dateien.txt"
sag "-- Summe je Verzeichnis (GiB, drei Ebenen)"
find "${W:-/}" -xdev -type f -mmin -1440 -printf '%s\t%p\n' 2>/dev/null \
  | awk -F'\t' '{n=split($2,a,"/"); k=""; for(i=2;i<=4&&i<n;i++) k=k"/"a[i]; s[k]+=$1} END{for(k in s) if(s[k]>104857600) printf "%8.1f  %s\n", s[k]/1073741824, k}' \
  | sort -n | tail -25 | tee "$AUS/12-neu-24h-verzeichnisse.txt"

# ---------------------------------------------------------------- 2 · Belege für "verbaut" sammeln
EINB="$AUS/einbindungen.txt"; PROZ="$AUS/prozesse.txt"; KONF="$AUS/konfigdateien.txt"
: > "$EINB"; : > "$PROZ"; : > "$KONF"
if [ "$HAT_DOCKER" = 1 ]; then
  docker ps -aq | while read -r c; do
    docker inspect --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}{{index .Config.Labels "com.docker.compose.project.working_dir"}}{{"\n"}}{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$c" 2>/dev/null
  done | tr ',' '\n' | grep '^/' | sort -u > "$EINB"
fi
for p in /proc/[0-9]*; do
  readlink "$p/cwd" 2>/dev/null; readlink "$p/exe" 2>/dev/null
  tr '\0' '\n' < "$p/cmdline" 2>/dev/null
  find "$p/fd" -maxdepth 1 -type l -exec readlink {} \; 2>/dev/null
done | grep '^/' | sort -u > "$PROZ"
{
  find "${W}/opt" "${W}/root" "${W}/home" "${W}/srv" "${W}/workspace" -xdev -maxdepth 6 -type f \
       \( -name '*compose*.y*ml' -o -name '*.service' -o -name '*.timer' -o -name 'crontab*' \) -size -2M 2>/dev/null
  find /etc/systemd /etc/cron* /etc/logrotate.d /etc/fstab /etc/docker /usr/local/lib/systemd /var/spool/cron \
       -xdev -type f -size -2M 2>/dev/null
} | sort -u > "$KONF"
sag ""
sag "Belege gesammelt: $(wc -l < "$EINB") Einbindungen, $(wc -l < "$PROZ") Prozesspfade, $(wc -l < "$KONF") Konfigurationsdateien"

SCHUTZ='mongo|vsk|traefik|letsencrypt|acme|certbot|/certs?(/|$)|/ssl(/|$)|infisical|gitlab|postgres|pgdata|lightrag-pg|[-_/]pg([-_/]|$)|mysql|mariadb|redis|qdrant|neo4j|cognee|/volumes?(/|$)|/\.ssh|/\.gnupg|secret|vault|swap|/var/lib/|/etc/|/usr/|/boot|/proc|/sys|/dev/'

geschuetzt() { printf '%s' "${1#"$W"}" | grep -Eiq "$SCHUTZ"; }

# verbaut <pfad> : gibt den Grund aus und liefert 0, wenn der Pfad in Gebrauch ist
verbaut() {
  local p="$1" q="$1" t
  if awk -v p="$q" '$2==p || index($2,p"/")==1 {f=1} END{exit !f}' /proc/mounts; then echo "Einhängepunkt"; return 0; fi
  t=$(awk -v p="$q" '$0==p || index($0,p"/")==1 || index(p,$0"/")==1 {print; exit}' "$EINB")
  [ -n "$t" ] && { echo "Container-Einbindung $t"; return 0; }
  t=$(awk -v p="$q" '$0==p || index($0,p"/")==1 {print; exit}' "$PROZ")
  [ -n "$t" ] && { echo "Prozess benutzt $t"; return 0; }
  t=$(tr '\n' '\0' < "$KONF" | xargs -0 -r grep -lIF -- "$q" 2>/dev/null | head -1)
  [ -n "$t" ] && { echo "genannt in $t"; return 0; }
  return 1
}

juengste() { find "$1" -xdev -printf '%TF\n' 2>/dev/null | sort | tail -1; }
hat_junges() { [ -n "$(find "$1" -xdev -mtime "-$ALTER_TAGE" -print -quit 2>/dev/null)" ]; }
mb() { du -xs --block-size=1M "$1" 2>/dev/null | cut -f1; }

ist_sicherungsort() { case "${1#"$W"}" in /opt/backups/*|/var/backups/*|/root/backups/*|/opt/nexifyai/backups/*|/opt/nexifyai/offsite/*) return 0 ;; esac; return 1; }
# hat_juengeren_stand <verzeichnis> : gibt es daneben einen Eintrag gleicher Art (Name ohne Ziffern), der neuer ist?
hat_juengeren_stand() {
  local p="$1" art x
  art=$(basename "$p" | sed 's/[0-9][0-9]*/#/g')
  for x in "$(dirname "$p")"/*; do
    [ "$x" = "$p" ] && continue
    [ "$(basename "$x" | sed 's/[0-9][0-9]*/#/g')" = "$art" ] && [ "$x" -nt "$p" ] && return 0
  done
  return 1
}

# pruefe <klasse> <pfad> : schreibt eine Zeile in die Kandidatenliste
pruefe() {
  local kl="$1" p="$2" g j grund urteil
  [ -e "$p" ] || return 0
  [ -L "$p" ] && return 0
  g=$(mb "$p"); [ "${g:-0}" -lt "$MIN_MB" ] && return 0
  j=$(juengste "$p")
  if geschuetzt "$p"; then urteil="GESCHUETZT"; grund="Klasse D (Schutzwort)"
  elif grund=$(verbaut "$p"); then urteil="UNKLAR"
  elif [ "$kl" = B ] && hat_junges "$p"; then urteil="BLEIBT"; grund="jünger als $ALTER_TAGE Tage"
  elif [ "$kl" = B ] && [ -d "$p" ] && ist_sicherungsort "$p" && ! hat_juengeren_stand "$p"; then
    urteil="UNKLAR"; grund="Sicherung ohne jüngeren Stand derselben Art – Inhaber entscheidet"
  else urteil="KANDIDAT"; grund="nicht verbaut$([ "$kl" = B ] && echo ", älter als $ALTER_TAGE Tage")"
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$urteil" "$kl" "$g" "$j" "$p" "$grund" >> "$LISTE"
}

sag ""
sag "== 4 · Kandidaten prüfen (dauert einige Minuten)"

# Klasse A · Abgeleitetes
for p in "${W}"/tmp/trivy "${W}"/tmp/opsrules-* "${W}"/root/.npm/_cacache "${W}"/root/.npm/_npx "${W}"/root/.cache/* \
         "${W}"/root/.local/share/pnpm/store "${W}"/root/.pnpm-store "${W}"/root/.bun/install/cache \
         "${W}"/home/*/.npm/_cacache "${W}"/home/*/.npm/_npx "${W}"/home/*/.cache/* \
         "${W}"/home/*/.local/share/pnpm/store "${W}"/home/*/.bun/install/cache; do
  pruefe A "$p"
done

# Klasse B · Verzeichnisse: alte Klone, Arbeitskopien, Verify-Ordner, Archive
for p in "${W}"/opt/* "${W}"/opt/nexifyai/* "${W}"/opt/nexifyai/repos/* "${W}"/opt/backups/* \
         "${W}"/root/* "${W}"/home/*/* "${W}"/workspace/* "${W}"/Users/* "${W}"/var/backups/* "${W}"/var/tmp/* "${W}"/tmp/*; do
  case "$p" in
    "${W}"/opt/nexifyai|"${W}"/opt/backups|"${W}"/opt/nexifyai/repos|"${W}"/opt/nexifyai/backups|"${W}"/opt/nexifyai/offsite) continue ;;
    "${W}"/tmp/trivy|"${W}"/tmp/opsrules-*|"${W}"/root/aussortieren-20261115) continue ;;
  esac
  [ -d "$p" ] && pruefe B "$p"
done

# Klasse B · Sicherungsdateien: je Verzeichnis und Art (Dateiname ohne Ziffern) bleibt der neueste Stand
for d in "${W}"/opt/nexifyai/backups "${W}"/opt/nexifyai/offsite "${W}"/opt/backups "${W}"/root/backups "${W}"/var/backups; do
  [ -d "$d" ] || continue
  find "$d" -xdev -type f -size "+${MIN_MB}M" -printf '%T@\t%h\t%f\t%p\n' 2>/dev/null \
  | awk -F'\t' '{art=$3; gsub(/[0-9]+/,"#",art); k=$2"/"art; if(!(k in neu) || $1>neu[k]) {neu[k]=$1; np[k]=$4} z[NR]=$4; zk[NR]=k}
               END{for(i=1;i<=NR;i++) if(np[zk[i]]!=z[i]) print z[i]}' \
  | while IFS= read -r f; do
      # nur einzelne Dateien; liegt die Datei in einem Verzeichnis, das oben schon Kandidat ist, zählt sie dort
      grep -q "^KANDIDAT.*	$(dirname "$f")	" "$LISTE" 2>/dev/null && continue
      pruefe B "$f"
    done
done

sag ""
sag "== 5 · Ergebnis der Prüfung (MiB · jüngste Änderung · Pfad · Beleg)"
for u in KANDIDAT UNKLAR GESCHUETZT BLEIBT; do
  n=$(grep -c "^$u	" "$LISTE"); s=$(awk -F'\t' -v u="$u" '$1==u{s+=$3} END{printf "%.1f", s/1024}' "$LISTE")
  sag "-- $u: $n Posten, $s GiB"
  grep "^$u	" "$LISTE" | sort -t'	' -k3,3nr | head -60 | awk -F'\t' '{printf "  %s %8d  %s  %s  [%s]\n", $2, $3, $4, $5, $6}' | tee -a "$AUS/lauf.txt"
done

if [ "$HAT_DOCKER" = 1 ]; then
  sag ""
  sag "== 6 · Images ohne Container (nur Anzeige; einzeln entfernen mit: docker image rm <name> – nie prune -a)"
  docker ps -a --format '{{.Image}}' | sort -u > "$AUS/images-benutzt.txt"
  docker ps -aq | xargs -r docker inspect --format '{{.Image}}' 2>/dev/null | sort -u > "$AUS/image-ids-benutzt.txt"
  docker image ls --no-trunc --format '{{.ID}}|{{.Repository}}:{{.Tag}}|{{.Size}}|{{.CreatedAt}}' | while IFS='|' read -r id name size created; do
    grep -qxF "$id" "$AUS/image-ids-benutzt.txt" && continue
    printf '  %-70s %10s  %s\n' "$name" "$size" "${created%% *}"
  done | tee "$AUS/13-images-ohne-container.txt"
fi

if [ "$AUSFUEHREN" != 1 ]; then
  sag ""
  sag "Trockenlauf beendet. Es wurde nichts verändert. Ablage: $AUS"
  sag "Entfernen der Zeilen KANDIDAT: dasselbe Skript mit --ausfuehren (optional --nur A)."
  exit 0
fi

# ---------------------------------------------------------------- 3 · Ausführen
sag ""
sag "== 7 · Ausführen: nur Zeilen KANDIDAT$([ -n "$NUR" ] && echo ", nur Klasse $NUR")"
weg_mb=0
grep "^KANDIDAT	" "$LISTE" | sort -t'	' -k2,2 -k3,3nr > "$AUS/ausfuehren.tsv"
while IFS=$'\t' read -r _ kl g j p _; do
  [ -n "$NUR" ] && [ "$kl" != "$NUR" ] && continue
  # Schutzgeländer: absoluter Pfad, mindestens zwei Ebenen tief, kein Verweis, nicht geschützt
  q="${p#"$W"}"
  case "$q" in /*/*) ;; *) sag "ÜBERSPRUNGEN (Pfad zu kurz): $p"; continue ;; esac
  [ -L "$p" ] && { sag "ÜBERSPRUNGEN (Verweis): $p"; continue; }
  [ -e "$p" ] || continue
  geschuetzt "$p" && { sag "ÜBERSPRUNGEN (geschützt): $p"; continue; }
  # unmittelbar vor dem Entfernen noch einmal prüfen (Prozesse können inzwischen gestartet sein)
  for x in /proc/[0-9]*; do readlink "$x/cwd" 2>/dev/null; tr '\0' '\n' < "$x/cmdline" 2>/dev/null; done | grep '^/' | sort -u > "$PROZ"
  if grund=$(verbaut "$p"); then sag "ÜBERSPRUNGEN (jetzt verbaut: $grund): $p"; continue; fi
  if [ "$kl" = B ] && hat_junges "$p"; then sag "ÜBERSPRUNGEN (inzwischen geändert): $p"; continue; fi
  v=$(frei_b)
  if rm -rf --one-file-system -- "$p"; then erg="entfernt"; weg_mb=$((weg_mb + g)); else erg="FEHLER"; fi
  n=$(frei_b)
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "$kl" "$p" "$g" "$j" "$v" "$n" "$erg" >> "$PROTOKOLL"
  sag "$erg: $p (${g} MiB, frei $((v/1048576)) -> $((n/1048576)) MiB)"
  if [ "$HAT_DOCKER" = 1 ]; then
    ps_bild > "$AUS/02-ps-jetzt.txt"
    if ! diff -q "$AUS/02-ps-vorher.txt" "$AUS/02-ps-jetzt.txt" >/dev/null; then
      sag "ABBRUCH: Die Containerliste hat sich geändert. Unterschied:"
      diff "$AUS/02-ps-vorher.txt" "$AUS/02-ps-jetzt.txt" | tee -a "$AUS/lauf.txt"
      exit 3
    fi
  fi
  [ "$erg" = FEHLER ] && { sag "ABBRUCH nach Fehler."; exit 3; }
done < "$AUS/ausfuehren.tsv"

if [ "$HAT_DOCKER" = 1 ] && [ "$NUR" != B ]; then
  v=$(frei_b); docker builder prune -f 2>&1 | tail -1 | tee -a "$AUS/lauf.txt"; n=$(frei_b)
  printf '%s\tA\tdocker builder prune -f (ohne -a)\t-\t-\t%s\t%s\tausgeführt\n' "$(date -u +%FT%TZ)" "$v" "$n" >> "$PROTOKOLL"
fi

sag ""
sag "== 8 · Abschluss $(date -u +%FT%TZ)"
df -h "${W:-/}" | tee "$AUS/20-df-nachher.txt"
for u in https://teileklar.shop/ https://unternehmensbot.eu/; do
  printf '%s %s\n' "$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$u" 2>/dev/null)" "$u"
done | tee "$AUS/21-seiten-nachher.txt"
diff -q "$AUS/04-seiten-vorher.txt" "$AUS/21-seiten-nachher.txt" >/dev/null || sag "ACHTUNG: Die Seiten antworten anders als vorher – bitte prüfen."
sag "Entfernt: rund $((weg_mb/1024)) GiB. Protokoll: $PROTOKOLL"
