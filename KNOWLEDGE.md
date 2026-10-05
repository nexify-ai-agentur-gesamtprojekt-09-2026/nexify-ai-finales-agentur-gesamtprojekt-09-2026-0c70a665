# Gesammeltes Wissen: DeepSeek Harness und BISHENG DSH Enterprise

Alles hier ist aus den im Abschnitt Quellen genannten Primaerquellen gelesen,
nicht aus Erinnerung. Wo Wissen nur teilweise vorliegt, steht das ausdruecklich.

## 1. Harness-Komposition

- Traeger ist Cordis: alles ist ein Plugin (Modelladapter, Tools, Session-Log,
  Agent-Loop). Es gibt keinen privilegierten Kern; Erweiterung heisst Plugin
  daneben mounten, Registrierungen sind Effects, die beim Entladen zuruecklaufen.
- Ein laufendes `dsh` ist ein bei Boot komponierter Plugin-Baum aus geordneten
  Layern. Reihenfolge: Bundles des Profils in Listenreihenfolge, dann
  `$DSH_HOME/profiles/<name>/cordis.patch.yml`, dann `$DSH_HOME/cordis.patch.yml`,
  dann `--patch`-Overlays.
- Ein Patch zielt per `id` auf eine Zeile und ersetzt deren komplette Config,
  oder fuegt Zeilen ein (`- insert: [...]`).
- Profile: `web`, `headless`, `sdk`, `sdk-minimal`, `acp` werden mitgeliefert;
  `desktop` ist fuer die Electron-App reserviert und per CLI gesperrt.
- Profilverzeichnis: `package.json` mit `dsh.profile.bundles` (Reihenfolge) und
  `cordis.patch.yml`. Bundle: beliebiges npm-Paket mit `dsh.bundle.patch`.
- `--dump-default-config` (ohne Nutzerlayer) und `--dump-config` (komponiert)
  zeigen den Baum, ohne ihn zu starten.

## 2. CLI

| Kommando | Zweck |
|---|---|
| `dsh <name>` / `dsh --profile <name>` | Profil booten |
| `dsh web` | Web-Profil (Standardport 3080, bind 127.0.0.1) |
| `dsh headless "job"` | eine frische Session, Antwort, Exit |
| `dsh --profile sdk` | SDK-Server ueber JSON-RPC auf stdio |
| `dsh plugin --profile <name> <pnpm-args>` | Pluginverwaltung im Profilverzeichnis |

Das aufrufende Verzeichnis ist die Standard-Workspace-Wurzel.

## 3. Web-Deployment hinter einem Proxy

- Standardbind ist Loopback; der Proxy besitzt die externe Seite (Host, TLS,
  Prefix-Strip).
- Der Proxy muss den browserseitigen `Host` unveraendert weiterreichen,
  Upgrades durchlassen und Cookie-Scope anpassen.
- `--trusted-host` erweitert die Authority-Fence; `--public-url` ist nur
  Anzeige und gewaehrt keine Trust. Fremde Hosts erhalten 403.
- Die Start-URL traegt ein Prozess-Token; der Tausch setzt ein signiertes
  Session-Cookie. Ohne Token antwortet die Oberflaeche mit 401.

## 4. Credentials

Aufloesung von stark nach schwach: geerbte Prozessumgebung (gewinnt) →
`$DSH_HOME/.credentials.yaml` → `<cwd>/.env` → `$DSH_HOME/.env`.
Das Dokument muss `0600` sein; alles andere wird abgelehnt.

## 5. Modellkonfiguration (pi-ai)

```yaml
- id: llm-pi-ai
  config:
    providers:
      <route>:
        apiKeyEnv: <ENV-NAME>
        api: openai-completions   # oder openai-responses, anthropic-messages
        baseURL: <http(s)://host/v1>
        models:
          - id: <modell-id>
            input: [text, image]
```

`agent-default-model` setzt `provider` und `model` fuer neue Sessions.
Ein Gateway mit zwei Protokollen braucht zwei Provider-Routen.

## 6. Enterprise-Seite (BISHENG + Gateway)

- Compose-Projekt `dsh-enterprise`, Frontend auf 3002, Gateway intern 8080.
- Seats liegen in `bisheng_gateway.gt_dsh_seat` und entstehen ueber die
  Modellfreigabe (`assign_batch`), nicht ueber einen eigenen Befehl. Ohne Seat
  meldet die App „You have not been assigned a DSH seat".
- Geraetefluss: `POST /api/dsh/authorizations` (client_id `dsh-desktop`,
  redirect_uri `http://127.0.0.1:<port>/dsh/callback`, PKCE S256, state,
  device_name, client_version) → Browser `/desktop-login?auth_id=...` →
  `POST /api/v1/dsh/authorize` mit Platform-Session und `Origin` der Plattform
  (sonst 403 „Invalid browser origin") → `POST /api/dsh/token` mit
  `grant_type`, `identity_ticket`, `auth_id`, `code_verifier`.
- Admin-API unter `/api/v1/dsh/admin/*`: settings, users, seat reassign/revoke,
  Modell- und Subjekt-Policies, Sessions, Audit.
- Enterprise-Plugin-Markt: aktiv, sobald `BISHENG_DSH_MARKET_SIGNING_KEY` als
  Ed25519-Privatschluessel (PEM, `\n` escapt) gesetzt ist; danach liefert
  `/api/v1/dsh/market/capabilities` `enabled: true` samt Public Key.
  Katalog lebt unter `/api/v1/dsh/market/catalog`, Upload max. 512 MiB.

## 7. Quellen

- `deepseek-ai/deepseek-harness` Repo: `README.md`, `docs/architecture.md`,
  `apps/cli/README.md`, `docs/user/guide/*.md`, `docs/user/develop/basic/*.md`,
  `packages/bundle/web-app/README.md`, `docs/config-catalog.md`.
- Installer und Doku: `https://dshdesktop.com/zh/enterprise/deployment/`
  und `https://dshdesktop.com/assets/install-dsh-enterprise.sh`.
- Laufzeit: Backend-Quellen im Container (`/app/bisheng/dsh*`), Gateway-JAR
  (`/gateway.jar`, ausgewertet per `strings`, kein `javap` verfuegbar).
- Marktverzeichnis: GitHub-Topic `dsh-plugin`, npm-Registry.

## 8. Wissensluecken

- Das Feishu-Wiki `dataelem.feishu.cn/wiki/ZxW6wZyAJicX4WkG0NqcWsbynde` ist
  eine JS-Anwendung; ohne Anmeldung liest der Renderer nur den Kopfbereich
  (Titel „快速入门 / BISHENG新鲜事"). Volltext ist so nicht belegbar.
- Das Gateway liegt nur als Jar vor; Verhalten wurde ueber HTTP-Antworten und
  Klassennamen-Strings belegt, nicht ueber Quelltext.
