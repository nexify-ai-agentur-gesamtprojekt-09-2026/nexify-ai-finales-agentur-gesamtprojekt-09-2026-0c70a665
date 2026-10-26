# NeXify Workspace · Web-UI auf Basis LibreChat

**Stand 27.09.2026.** Quelle: `danny-avila/LibreChat` (MIT, gelesen am 27.09.2026, Commit `d297530`). Oberfläche im Projekt: `NeXify Workspace.dc.html` (klickbarer Nachbau im NeXify-Designsystem, keine Kopie des Quellcodes).

## Warum LibreChat

- MIT-Lizenz, selbst hostbar (Docker), EU-Betrieb möglich.
- Spricht jeden OpenAI-kompatiblen Endpunkt → 9router passt ohne Umbau.
- Agenten, Dateien, Suche, RAG, Mehrbenutzer, Rollen, SSO bereits vorhanden.
- Eigene Oberfläche lässt sich über Konfiguration + Theme anpassen; tiefe Änderungen als Fork.

## Übernommene Struktur (aus `client/src/components/Chat/ChatView.tsx`, `Landing.tsx`)

| LibreChat | NeXify Workspace |
|---|---|
| Seitenleiste: Neuer Chat, Suche, Verlauf nach Tagen | gleich, dazu Agentenliste mit Tag |
| Kopf: Modellwahl | Modellwahl = 9router-Stufen (Automatisch, lokal, günstig, stark) mit Preis je Antwort |
| Landing: Symbol, Begrüßung, Beschreibung | Signet, „Guten Tag, Pascal.“, Beschreibung des gewählten Agenten |
| Conversation Starters | vier NeXify-Einstiege, zwei davon mit Tag |
| ChatForm: Eingabe, Anhang, Senden | gleich, dazu Tag-Chips und Kostenhinweis |
| Footer-Hinweis | KI-Kennzeichnung Art. 50 KI-VO, EU-Hinweis, Datenschutz |

## Produktivbetrieb

1. **Fork** `nexifyai-dev/workspace` im eigenen GitLab, Upstream als zweite Remote, monatlich zusammenführen.
2. **Docker** auf VPS Frankfurt (`deploy-compose.yml` aus Upstream), MongoDB + Meilisearch + RAG-API; Redis nur, wenn Mehrinstanz nötig (sonst weglassen).
3. **Hostname** `workspace.nexifyai.cloud` — Live-DNS = Hartsperre, Einzelfreigabe Pascal.
4. **Anmeldung** über dasselbe Konto wie myADMIN/Portale (OIDC), Rollen: Pascal (Admin), Team, Kunde (nur eigene Agenten).
5. **Modelle** nur über 9router (`librechat.yaml`, unten). Keine direkten Fremdschlüssel in LibreChat.
6. **Theme**: Farben/Schrift aus `design/tokens.json` in `client/src/style.css` (CSS-Variablen `--surface-*`, `--text-*`, `--border-*`) gesetzt; Geist + Geist Mono selbst gehostet; Logo/Favicon ersetzt; `customWelcome` gesetzt.
7. **Sprachen** DE, NL, EN, FR über LibreChat-Locales; Standard `de`.
8. **Freigabe-Gate** wie jede Fläche: Vorschau → 60 s Health → E3 → Rollback → Endabnahme.

### `librechat.yaml` (Auszug, Schlüssel nur aus OpenBao)

```yaml
version: 1.2.1
cache: true
interface:
  customWelcome: "Guten Tag, {{user.name}}."
  privacyPolicy: { externalUrl: "https://nexifyai.cloud/datenschutz", openNewTab: true }
  termsOfService: { externalUrl: "https://nexifyai.cloud/agb", openNewTab: true }
  footer: "Antworten werden mit KI erstellt (Art. 50 KI-VO). Daten bleiben in der EU."
endpoints:
  custom:
    - name: "NeXify"
      apiKey: "${NEXIFY_ROUTER_KEY}"
      baseURL: "https://router.intern.nexifyai.cloud/v1"
      models:
        default: ["nexify-auto", "nexify-lokal", "nexify-guenstig", "nexify-stark"]
        fetch: false
      titleConvo: true
      titleModel: "nexify-lokal"
      modelDisplayLabel: "NeXify"
modelSpecs:
  enforce: true
  list:
    - { name: "auto", label: "Automatisch", preset: { endpoint: "NeXify", model: "nexify-auto" }, default: true }
    - { name: "lokal", label: "NeXify lokal", preset: { endpoint: "NeXify", model: "nexify-lokal" } }
```

Werte (Version, Felder) vor dem Einsatz gegen `librechat.example.yaml` des aktuellen Upstream-Stands prüfen.

## Systemrolle S1 im Betrieb

Der Agent »NeXify AI« nutzt die feste Systemschicht `config/prompts/s1-master-orchestrator-1.0.0.md` (Register `config/prompts.json`). In LibreChat als eigener `modelSpecs`-Eintrag, der Text wird beim Deploy aus der Datei eingesetzt, nie von Hand kopiert:

```yaml
modelSpecs:
  list:
    - name: "orchestrator"
      label: "NeXify AI"
      default: true
      preset:
        endpoint: "NeXify"
        model: "nexify-auto"
        promptPrefix: "<<Inhalt von config/prompts/s1-master-orchestrator-1.0.0.md>>"
```

Feldnamen vor dem Einsatz gegen `librechat.example.yaml` des aktuellen Upstream-Stands prüfen. Neue Fassung = neue Datei mit neuer Version, alte bleibt unverändert.

## Anbindung an NeXify

- **Tags** (`#angebot`, `#review` …) → 9router liest Tag, Tag-Router (`lib/tagrouter.js`) wählt Ablauf/Agent.
- **Kosten** je Antwort → Rechenkern-Journal (Kostenstelle = Nutzer/Kunde), sichtbar in myADMIN.
- **Wissen** → LightRAG als RAG-Quelle, Fundstellen in der Antwort.
- **Companion (Nexi)** ist derselbe Agent wie auf der Website und in Mails.

## Offen

- Fork oder nur Konfiguration (Empfehlung: Konfiguration + Theme, Fork erst bei echtem Bedarf).
- Kunden im Workspace: ja/nein, und mit welchen Agenten.
- Speicherdauer der Chats (Löschfrist).
