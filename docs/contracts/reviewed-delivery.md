# Geprüften Branch als Draft liefern

`tools/reviewed_delivery.py` ist ein kleiner argv-basierter GitHub-Ablauf mit
lokalem Checkpoint. Standard ist eine lesende Planung; nur `execute=True` bzw.
`--execute` erlaubt normalen Branch-Push und Draft-PR-Erstellung. Implementierung
und Tests führen keine echten GitHub-/GitLab-Writes aus. Aktuell nachgewiesene
Remoteaktionen des Rootauftrags sind davon getrennte Belege.

Festes Repository:
`nexifyai-dev/nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`.
Ziel ist ausschließlich `refs/heads/integration/...`; PR-Base ausschließlich
`main`. Kein Main-Push, Merge, Forcepush, Delete, Release, Promote, Deployment,
GitLab-MR oder Mirror. Es werden keine fremden Syncskripte ausgeführt.

## Eingangsvertrag und Vorbedingungen

`deliver(request, workspace=…, state_directory=…, execute=False,
retry_reconciled=False, commands=None)` nimmt exakt:

- `schema_version:1`, `branch`, vollständige 40stellige `head` und `base_sha`.
- `title`, `body`: begrenzte inerte PR-Texte; über kanonisches JSON an `gh api
  --input <Datei>`, keine Shellinterpolation oder `-F`-Dateimagie.
- `review`: exakt `{head,base_sha,status:"passed",reviewer,artifact_sha256,artifact_path}`.
- `gates`: je ein Eintrag `{name,head,status:"passed",artifact_sha256,artifact_path}` für
  `check`, `test`, `e2e`, `check-arch`.
- `required_ci`: explizite Liste 1–20 erwarteter CI-Kontextnamen.

Jede `artifact_path` ist ein expliziter relativer Pfad unter dem Workspace,
z.B. `.local/reviewed-delivery-evidence/review.json`. Absolutpfade, `..`,
Credential-/Privatpfade und Links werden verweigert. Die tatsächlichen regulären
Dateibytes werden mit NOFOLLOW/Linkzahl 1 gelesen (höchstens 8192 Bytes), gegen den
Raw-SHA256 geprüft und als begrenztes JSON validiert. Diese Prüfung wiederholt
sich vor jedem Write zusammen mit der lokalen Head-/Cleanlinessprüfung.

Reviewdatei enthält exakt
`{schema_version:1,kind:"review",head,base_sha,status:"passed",reviewer}`.
Eine Gatedatei enthält exakt
`{schema_version:1,kind:"gate",head,base_sha,status:"passed",name}`.
Inhalt und Request müssen in Head, Base, Status, Name/Reviewer übereinstimmen.
Fehlend, verändert, unavailable oder nicht passed blockiert vor Commands.
Das Modul prüft damit echte lokale Belegbytes und deren Scope; es führt keine
beliebigen Gatebefehle aus. Die externe Identität/Unabhängigkeit des genannten
Reviewers und die fachliche Wahrheit seiner Aussage können lokale JSON-Dateien
allein nicht beweisen. Der autorisierte Reviewcontroller bleibt dafür zuständig;
ein Hash oder eine Datei ist keine zusätzliche Writefreigabe.

Vor einem Write prüft der Ablauf sauberen Worktree einschließlich untracked
Dateien, exakten HEAD, aktuellen eigenen integration-Branch, gültiges Gitref und
Base als Headvorfahr. Keine Änderung ohne Differenz zum Base. Ein bereits in
main enthaltener alter Head wird dadurch kein neuer PR. Der extern ausgeführte
MergePR41 wird weder dem Ablauf zugeschrieben noch durch einen Doppel-PR ersetzt.

`origin` muss bereits explizit auf genau den kanonischen HTTPS-GitHub-Pfad
zeigen, für Fetch und Push jeweils genau eine URL. Kein automatisches Remote-
Anlegen und keine geratene URL. Fehlender origin blockiert
`github_origin_unbound`; ein autorisierter Owner kann die lokale Konfiguration
separat korrigieren. URL-Rewrites sowie origin-Mirror-/Transport-/Pushoption-
Overrides blockieren. Vorhandene Projekt-/REA-Hooks und signierte
Pushkonfiguration bleiben erhalten; ein blockierender Hook wird nicht
abgeschaltet. Zusätzliche Followtags werden unterbunden. Normale bestehende
Git-/gh-Authentifizierung wird benutzt,
keine Credentialdateisuche und keine Ausgabe von Tokens oder stderr.

GitHub-User muss `nexifyai-dev`, Repoidentity exakt, Defaultbranch main und
Pushpermission bestätigt sein. `git ls-remote` muss remote-main genau auf den
reviewten Basecommit zeigen. Fehlt der Branch, ist nur ein normaler neuer
Branchpush möglich; ein vorhandener anderer Head muss lokal vorhanden und
nachweislich Vorfahr des reviewten Heads sein. Kein automatisches Fetch.

## Idempotenter Draft und Überschneidungen

Vor Push und vor PR-Erstellung wird die bestehende Branch-PR-Historie mit
`state=all`, exaktem Owner:Branch und Base main gelesen. Ein merged PR ist
terminal `already_merged`, ohne weiteren Push/Neuerstellung. Ein ungemergt
closed PR oder mehrere historische Branch-PRs blockieren statt still einen
Ersatz anzulegen. Ein anderer Autor, Fork oder nondraft PR wird nicht verändert.

Ein vorhandener eigener Draft kann mit einem neuen reviewten Head normal
fortgeschrieben werden: sein Head muss vor dem Push mit dem beobachteten
Remote-Branch übereinstimmen und der Update ein FF sein. Nach Push muss genau
dieser Draft den neuen exakten Head tragen. Titel/Body eines bestehenden Drafts
werden nicht automatisch geändert. Ein neuer Draft erhält `draft:true` und
`maintainer_can_modify:false`; niemals Auto-Merge.

Alle anderen offenen main-PRs werden inklusive Dateilisten gelesen. Jede
Überschneidung mit dem lokalen Base→Head-Dateisatz blockiert, auch bei anderem
Branch desselben Autors. Rename-Vorherpfade sind enthalten. HTTP-Listen verwenden
explizit `page`/`per_page=100`, höchstens 400 Zeilen je Liste; eine volle letzte
Seite wird weiter abgefragt, Grenz-/Teil-/Schemafehler blockieren. Kein
`gh api --slurp`, das lokal in gh 2.46 nicht verfügbar ist. Insgesamt höchstens
120 Commands, je 30 Sekunden und 1 MiB kombinierte stdout/stderr; JSON ist begrenzt
und verwirft doppelte Keys sowie nichtendliche Zahlen.

GitHub bietet hier keinen atomaren Lock über main, fremde PRs und Branchrefs.
Preflight und Readbacks sind begrenzte Momentaufnahmen; ein späterer anderer
Writer kann sie ändern. Die finale Draftprüfung wiederholt main-/Branch-/PR-
Readback. Der normale Gitpush erhält die serverseitige FF-Prüfung; es gibt keine
Force-/Leaseumgehung oder Behauptung einer globalen Transaktion.

## Checkpoint und unklarer Ausgang

Das private `state_directory` liegt außerhalb des zu liefernden Trees oder in
explizit ignorierter lokaler Ablage; sein Elternverzeichnis muss existieren.
Ein OS-Lock serialisiert diesen Ablauf. Checkpointname bindet den gesamten
Requesthash. Schema hält nur je `push` und `pr` die Zustände
`not_started → pending → verified`; kein Scheduler und keine zweite Jobqueue.
Dateien werden mit exklusiven temporären Namen, fsync und atomarer Ersetzung
geschrieben. Reads verlangen reguläre Dateien ohne Symlink/Hardlink. Manuelle
Manipulation wird nicht zur Remoteerfolgsquelle: jeder Restart liest echte
Remotezustände erneut.

`pending` wird **vor** der jeweiligen Wirkung dauerhaft geschrieben. Nach Push
wird der Remote-Head gelesen; nach Draft-POST erneut die Branch-PR-Historie.
Ein verlorener Commandresponse kann nur durch diesen Readback als erfolgreich
aufgelöst werden. Ist die Wirkung nicht bestätigt, bleibt der Checkpoint pending.
Ein neuer automatischer Write folgt daraus nicht. Erst ein erneut erfolgreicher
Lesedurchlauf und ausdrückliches `retry_reconciled=True` / `--retry-reconciled`
erlauben pro Aufruf einen weiteren Versuch. Lesefehler gelten niemals als
bestätigte Abwesenheit. Eine zwischenzeitlich sichtbare Wirkung wird übernommen,
ohne erneut zu schreiben.

`pushed=true` bedeutet hier einen in diesem Aufruf versuchten und rückgelesenen
Push; `pushed=null` bedeutet nach Writeversuch unbestätigten Ausgang. Bei schon
vorhandenem exaktem Remotehead bleibt `pushed=false`, `branch_verified=true`.
`push_attempted`/`pr_create_attempted` benennen tatsächliche Commandversuche.
`state=draft_verified` und `final_readback_verified=true` entstehen erst nach
allen abschließenden main-/Branch-/PR-Readbacks. Scheitert eine dieser Prüfungen,
lautet das Ergebnis `state=blocked`, `final_readback_verified=false`, CLI-Exit2;
bereits bestätigte Push-/PR-Fakten bleiben als Teilabschluss sichtbar.
`merged=false` besagt, dass dieses Modul keinen Merge ausführt; ein historisch
merged PR wird separat durch `state=already_merged` angezeigt. Keine automatische
Remote-Rücknahme: bei Teilabschluss bleiben Branch/Draft erhalten; der Caller
prüft und nimmt am Checkpoint wieder auf.

## CI und GitLab

CI-Abfrage ist ausschließlich an den exakten Requesthead gebunden: Checkruns
plus Combined Commit Status. Alle verlangten Kontexte müssen eindeutig und
abgeschlossen success sein. Doppelte irrelevante optionale Kontexte (etwa
Paperclip aus push/pull_request) ändern das Coreergebnis nicht. Ein doppelter
verlangter Kontext bleibt mehrdeutig/unavailable; es wird kein älterer Erfolg
über einen anderen/neuen Fehler gezogen. Leer, unbekannt, fehlend, skipped, neutral, falscher
SHA, Teilpagination, Provider-/Authfehler sind `unavailable`; niemals passed.
Pending und failed bleiben getrennt. Ein erfolgreich erstellter Draft kann
`ci.status=unavailable|pending|failed` tragen; das ist keine Mergefreigabe und
ändert weder Branchprotection noch Anbieterstatus.

GitLabreport ist ausdrücklich `{status:"unbound",mirror_performed:false,
mr_created:false}`. Nutzerpräzisierung: GitLab ist serverlokal; eine Cloud-
Loopbackadresse ist keine Serverzuordnung. Ohne konkret autorisierte aktuelle
Remoteidentity gibt es keine Verbindung, URLkonstruktion, Signup, SSH, MR oder
Spiegelung. Kanonisch bleibt GitHub, späterer GitLabdownstream ausschließlich FF.
Historisches project42/localhost8922-Syncskript ist ein anderer Repositorypfad
und wird wegen abweichender Zuordnung sowie Force-/Credentiallogik nicht benutzt.

## Lokale Bedienung und Beleg

```sh
python3 -m tools.reviewed_delivery --input <reviewter-request.json> \
  --workspace <sauberer-isolierter-worktree> --state-directory <private-ablage>
# Erst bei konkreter vorhandener Writefreigabe zusätzlich: --execute
# Nur nach geprüftem unklarem Ausgang zusätzlich: --retry-reconciled
python3 -m unittest discover -s tests -p test_reviewed_delivery.py -v
```

Nur Pythonstandardbibliothek, vorhandenes git und gh. Wiederverwendet wurde die
vorhandene geprüfte Directory-FD-Grenze aus `tools/project_skills.py`; vorhandene
`tools/site_release.py` und `tools/automation/mirror.py` wurden fachlich geprüft,
aber ihre Archive-/Mirrorwirkungen nicht als PR-Ablauf umgedeutet. 21 gezielte Commanddouble-Tests prüfen positive/negative/restart-Fälle,
Belegbytes/Scope/Linkgrenzen, erhaltene Hooks und optionale CI-Duplikate; dies
ist keine echte GitHubzustellung.

Technische Primärquellen, am 27.10.2026 gelesen:
[GitHub Pull Requests](https://docs.github.com/en/rest/pulls/pulls),
[Check Runs](https://docs.github.com/en/rest/checks/runs),
[Commit Status](https://docs.github.com/en/rest/commits/statuses).
Lokal gelesen: gh 2.46 `gh api --help` und `git push -h`. Die Implementierung
verwendet explizite APIversion 2026-03-10 und argv; keine Shellstrings.
