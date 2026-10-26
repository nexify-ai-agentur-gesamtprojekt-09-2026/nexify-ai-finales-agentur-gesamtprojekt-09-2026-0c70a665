# Jeff-Hook — Registrierung in Codex

Hook-Skript `hooks/jeff-hook.mjs` läuft (getestet), `hooks/hooks.json` definiert
die Lifecycle-Ereignisse (SessionStart, UserPromptSubmit, Stop, SessionEnd,
TaskCompleted). Advisory: immer Exit 0, kein Blocken, Ausgabe als Kontext.

## In Codex aktivieren

1. Plugin anlegen (z. B. `~/.codex/plugins/jeff/`) mit `hooks/hooks.json` + Skript.
2. Registrieren/vertrauen in `~/.codex/config.toml` unter `[hooks.state]`
   (analog `composio@composio:hooks/hooks.json:session_start:0:0` → `trusted_hash`).
3. Host neu starten (Hooks werden beim Start gelesen).

## Betrieb

- Orakel nicht erreichbar → Hook gibt Hinweis aus, Exit 0, Arbeit geht weiter
  (konservativ, kein „Jeff hat zugestimmt“ ohne Antwort).
- Review-Ereignisse (Stop/SessionEnd/TaskCompleted) melden go/rueckfrage/stopp.
