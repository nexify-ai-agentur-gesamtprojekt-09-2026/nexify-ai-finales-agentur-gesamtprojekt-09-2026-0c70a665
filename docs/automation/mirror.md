# Kanonischer GitHub-Stand → GitLab-Downstream

Die kanonische Quelle ist ausschließlich
`nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`
auf GitHub, Branch `main`. Der frühere N1-Einstieg spiegelte GitLab in ein
anderes GitHub-Ziel und las produktive Vault-/SSH-Dateien. Dieser Pfad ist
ersetzt. N2 wird nicht verändert oder als alternative Schreibquelle aktiviert.

`tools/sync-github-gitlab.sh` delegiert an `tools/automation/mirror.py`.
Ohne `NEXIFY_GITLAB_MIRROR_URL` endet der Aufruf geschlossen mit Exitstatus 3.
Es wird kein GitLab-Projekt, VPS, Port oder vorhandener Timer geraten.

```bash
# Ziel muss vom Betreiber konkret gebunden sein; keine Zugangsdaten in der URL.
export NEXIFY_GITLAB_MIRROR_URL=https://gitlab.example.invalid/group/repository.git
bash tools/sync-github-gitlab.sh            # Prüfplan, kein Push
bash tools/sync-github-gitlab.sh --apply    # expliziter Controller-Auftrag
```

Der Beispielhost ist ein Platzhalter, keine konfigurierte Verbindung. Produktiv
ist HTTPS erforderlich. Ausschließlich `--development` erlaubt zusätzlich ein
explizit gebundenes HTTP-Ziel auf `127.0.0.1`. Datei-/SSH-Transporte, URL-Userinfo,
Querytokens, Fragmente und URL-Rewrites werden abgewiesen. Die URL darf keine
Zugangsdaten enthalten. Normale, vom Betreiber konfigurierte Git-Credentialhelper
sind der Authentifizierungsvertrag; CI kann einen passenden Helper mit seinem
Vault verwenden. Der Runner sucht keine Credentialdateien und erzeugt keine
Tokens. Er entfernt geerbte `GIT_*`-Overrides einschließlich Trace- und
Konfigurationsinjektion, deaktiviert Terminalprompts und gibt weder Git-stderr
noch URLs aus. Helper-Konfiguration ist vertrauenswürdige Betreiberkonfiguration,
keine Eingabe aus Issues oder Modellantworten.

## Aktualisierungsvertrag

1. Origin-Identität des eigenen Checkouts muss exakt der kanonischen HTTPS-URL
   entsprechen; SSH-/andere Aliase sind kein automatisch akzeptierter Beleg.
2. Aktuelles GitHub-`main` über `ls-remote` erfassen. Ein temporäres Bare-Repo
   lädt genau diesen Branch und prüft den tatsächlichen Commit gegen den SHA.
   Lokaler Arbeitsstand, uncommittete Änderungen und noch nicht veröffentlichte
   lokale Commits sind keine Spiegelquelle.
3. Ziel-`main` erfassen, gegebenenfalls laden, SHA vergleichen und Vorfahrenbezug
   prüfen. Divergenz bleibt erhalten und blockiert. Fehlender Zielbranch wird
   nur bei `--apply` angelegt.
4. Ziel-HEAD unmittelbar vor dem möglichen Push erneut lesen. Jede bis dahin
   beobachtete Änderung blockiert. Standardmäßig wird nur der Prüfplan gemeldet.
5. Bei `--apply` einen normalen Git-Push des geprüften SHA ausschließlich nach
   `refs/heads/main` ausführen. Kein Force, Lease-Override, Löschen, Pruning,
   Tag-Mitnahme oder `--mirror`. Git benutzt beim Push die im Protokoll
   ausgehandelte alte Objekt-ID als CAS; gleichzeitige Änderungen während dieser
   Transaktion können nicht still überschrieben werden. Anschließend Ziel-SHA
   erneut lesen und exakt vergleichen.

Zwischen der separaten HEAD-Neulesung und der Ref-Aushandlung des Pushs bleibt
eine kleine Konkurrenzlücke: ein weiterer Writer könnte das Ziel auf einen
anderen Vorfahren des geprüften Quellstands vorziehen. Ein normaler Push darf
dann weiterhin fast-forwarden. Es wird daher **keine** durchgängige Lease an den
früheren `ls-remote`-SHA behauptet. Divergierende Fortschritte werden vom normalen
Git-Push abgewiesen; Fortschritte nach der Protokollaushandlung durch den alten
Ref-CAS. Für eine strengere transaktionsweite Bindung braucht der Betreiber
einen tatsächlich vorhandenen Serververtrag oder exklusiven Writer. Der Runner
wechselt dafür nicht auf Force-/Lease-Flags.

Unklarer Transport-/Pushausgang oder abweichender Readback ist `blocked`, kein
Erfolg. Vor erneutem Ausführen den aktuellen Remotezustand reconciliieren.
Ein `--apply`-Flag stellt selbst keine Freigabe für Veröffentlichung oder Deployment
dar. Der isolierte Bare-Pfad führt keine Quellen, Issues oder Commitinhalte aus;
Repositoryhooks sind deaktiviert. Die bestehende globale Git-/Credentialhelper-
Konfiguration muss vom Betreiber vertrauenswürdig kontrolliert werden.

## Lokale Nachweise und Rollback

```bash
python3 -m unittest discover -s tests -p test_automation_mirror.py -v
```

Die Tests arbeiten mit echten temporären lokalen Bare-Repositories. Nur der
Testadapter übersetzt die validierten HTTPS-Adressen auf diese Fixtures; der
Produktionsadapter akzeptiert keinen Dateitransport. Geprüft: Idempotenz, lokale
WIP-Isolation, Dry-run, exakter Fast-forward, Divergenz, geändertes Ziel vor Push,
fehlende Bindung, falsche Quellidentität, URL-/Credential-/Rewrite-Grenzen und
Erhalt fremder Branches bei Neuanlage von `main`.

Es wurde kein reales GitHub-/GitLab-Remote gepusht, kein bestehender VPS-Timer
umgestellt und kein automatischer Scheduler eingerichtet. Eine serverseitige
Branch-Protection oder eine lebende GitLab-Verbindung ist damit nicht bewiesen.
Rückweg: weitere Aufrufe stoppen und Bindung entfernen. Ein bereits erfolgter
Fast-forward wird nicht automatisch rückwärts gepusht; fachliche Korrekturen
laufen als neuer Commit über die kanonische Quelle.
