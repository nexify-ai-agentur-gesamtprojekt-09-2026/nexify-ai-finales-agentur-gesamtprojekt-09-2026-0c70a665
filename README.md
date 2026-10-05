# DSH Enterprise — Deployment und Release-Gates

Dieses Repository haelt das Server-Deployment fuer BISHENG Enterprise mit
DSH-Gateway, die Modellroute ueber den lokalen 9Router und die Release-Gates
des Agentur-Standards.

## Inhalt

| Pfad | Zweck |
|---|---|
| install-dsh-enterprise.sh | Hersteller-Installer (unveraendert) |
| SOLL-STAND.md | Architektur, Zugaenge, Nachweise, offene Punkte |
| ci/stack-check.sh | Statische und Live-Pruefungen des Stacks |
| ci/check_release.py | Release-Validator (42 Anforderungen, G0-G5) |
| ci/requirements.json | Anforderungskatalog |
| ci/make-evidence.py | Erzeugt das Nachweisgeruest |
| .gitlab-ci.yml | Pipeline: validate, verify, release |

Nicht versioniert: prod (Laufzeitdaten, Zugangsdaten) und release.

## Pipeline

- validate:static — Syntax, JSON, Compose-Konfiguration, Geheimnis-Scan.
- validate:release-gate-not-vacuous — beweist, dass der Validator einen
  unvollstaendigen Nachweis ablehnt.
- verify:live — manuell; prueft Gateway, Enterprise-API, Harness-UI und die
  Host-Fence des Harness gegen den laufenden Server.
- release:gate — nur auf Tags; verlangt release/evidence.json und laeuft
  den Validator mit RELEASE_COMMIT aus der Pipeline.

## Release-Nachweis

Nachweisgeruest mit ci/make-evidence.py erzeugen, je Anforderung status,
owner und evidence_paths fuellen, Vier-Augen-Abnahmen fuer technical, domain,
privacy_legal und operations eintragen, dann mit RELEASE_COMMIT auf den
Commit den Validator ausfuehren.

## GitLab

Remote: http://127.0.0.1:8922/nexifyai_group/nexify-ai-finales-agentur-gesamtprojekt.git

Auf diesem Host liegt kein GitLab-Token und GitLab ist nach aussen nur ueber
IPv6 erreichbar; der Push braucht einen Token oder eine IPv4-Route.
