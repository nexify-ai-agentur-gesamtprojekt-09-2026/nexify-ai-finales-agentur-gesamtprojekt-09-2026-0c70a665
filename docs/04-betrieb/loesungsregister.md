# Lösungs- und Zugangsregister · Stand 2026-11-14

<!-- Erzeugt aus config/loesungsregister.json mit `python3 tools/check_loesungsregister.py --write-md`. Nicht von Hand ändern: die Prüfung vergleicht diese Datei mit der Quelle. -->

Lösungs- und Zugangsregister der NeXify AI Agentur: für jede Lösung, die wir nutzen, steht hier, was sie ist, wofür wir sie nutzen, wo sie läuft, welche Zugänge es gibt und mit welchen Tags man sie findet. Agenten lesen dieses Register, bevor sie einen neuen Dienst vorschlagen. Zustände sind mit Datum belegt oder als unbelegt gekennzeichnet; das Register ersetzt keine Messung und keine Entscheidung in DECISIONS.md.

**Dieses Register enthält keinen Geheimniswert.** Werte liegen ausschließlich hier:

- Netzwerk-Geheimnisse der Claude-Umgebung (je Host; vom Inhaber über das sichere Formular hinterlegt, für die Sitzung nicht lesbar)
- Vercel-Projektvariablen (Laufzeit von `apps/web` und `apps/shop-api`)
- Cloudflare-Dashboard (Token-Werte sind dort nur bei der Erstellung sichtbar)
- GitHub-Actions-Secrets (nur innerhalb der Workflows)
- Umgebungsdateien auf den Servern (zum Beispiel `/root/.hermes/.env`), nie im Repository
- Passwortmanager des Inhabers

Vorgehen, Pflege und Umgang mit Schlüsseln aus dem Chat: `.claude/skills/nexify-loesungsregister/SKILL.md`. Prüfung: `python3 tools/check_loesungsregister.py` (Teil von `make governance-check`).

## Zählung

| Zustand | Anzahl |
|---|---|
| läuft belegt | 29 |
| läuft unbelegt | 19 |
| defekt | 6 |
| geplant | 1 |
| stillgelegt | 1 |
| nicht verfolgt | 2 |
| **gesamt** | **58** |

| Rolle im Plan | Anzahl |
|---|---|
| tragend | 21 |
| doppelt | 8 |
| abzulösen | 2 |
| unklar | 27 |

## Übersicht

| Kennung | Lösung | Kategorie | Zustand | Rolle im Plan | Entscheidung | Tags |
|---|---|---|---|---|---|---|
| `vercel` | Vercel | Hosting | läuft belegt | tragend | keine (Führungsentscheidung des Inhabers vom 13.11.2026 in AGENTS.md) | `hosting` `auslieferung` `web` `vorschau` `produktion` |
| `cloudflare-konto` | Cloudflare-Konto „NeXify AI Agentur“ | Plattform-Konto | läuft belegt | tragend | keine | `cloudflare` `konto` `plattform` `zugang` `dns` |
| `cloudflare-r2` | Cloudflare R2 (unser S3-kompatibler Objektspeicher) | Objektspeicher | läuft belegt | tragend | keine (Vorgabe des Inhabers vom 14.11.2026: R2 stets als eigene Lösung im Gesamtsystem führen) | `speicher` `s3` `objektspeicher` `archiv` `backup` `r2` `cloudflare` `dateien` |
| `cloudflare-workers` | Cloudflare Workers (möglicher Ersatz für Vercel) | Hosting | geplant | unklar | keine (AGENTS.md vom 13.11.2026 sagt „nicht verfolgt“; der Wunsch des Inhabers vom 14.11.2026 ist noch nicht als Entscheidung festgehalten) | `hosting` `auslieferung` `cloudflare` `workers` `umzug` |
| `cloudflare-ai-gateway` | Cloudflare AI Gateway `default` | LLM-Zugang | läuft unbelegt | unklar | keine | `llm-gateway` `llm-router` `cloudflare` `modellweg` `protokollierung` |
| `cloudflare-mcp-portal` | Cloudflare MCP-Portal | Agenten-Werkzeuge | läuft unbelegt | unklar | keine | `mcp` `werkzeuge` `cloudflare` `portal` `agenten` |
| `cloudflare-mcp-server` | MCP-Server-Eintrag `nexify-ai-mcp-server-cf` | Agenten-Werkzeuge | defekt | unklar | keine | `mcp` `cloudflare` `werkzeuge` `eigener-server` |
| `cloudflare-access` | Cloudflare Access und Tunnel | Netz und Zugangsschutz | läuft unbelegt | unklar | keine | `zugangsschutz` `tunnel` `cloudflare` `access` `netz` |
| `cloudflare-dns` | Cloudflare DNS und Zonen | Netz und Zugangsschutz | läuft unbelegt | tragend | keine | `dns` `domains` `zonen` `cloudflare` `netz` |
| `hostinger-srv1941843` | Hostinger-Server srv1941843 | Server | läuft belegt | tragend | D-016 | `server` `vps` `hosting` `hostinger` `docker` `infrastruktur` |
| `hostinger-srv1243952` | Hostinger-Server srv1243952 | Server | läuft unbelegt | unklar | D-016 | `server` `vps` `hostinger` `infrastruktur` `unbekannter-bestand` |
| `traefik` | Traefik (Reverse-Proxy) | Netz und Zugangsschutz | läuft belegt | tragend | D-016 | `reverse-proxy` `tls` `routen` `netz` `server` |
| `hermes` | Hermes (Orchestrierungs-Laufzeit) | Orchestrierung | läuft belegt | tragend | D-019 | `orchestrierung` `agenten` `laufzeit` `hermes` |
| `hermes-webui` | Hermes WebUI | Arbeitsplatz-Oberfläche | läuft belegt | unklar | D-019 | `arbeitsplatz` `oberflaeche` `hermes` `chat` |
| `paperclip` | Paperclip | Orchestrierung | nicht verfolgt | doppelt | D-019 | `orchestrierung` `agenten` `historie` `speicherfresser` |
| `openrouter-deepseek` | OpenRouter mit DeepSeek v4.1 flash 1017 | LLM-Zugang | läuft unbelegt | tragend | D-019 (Modellregel selbst: `config/llm-policy.json`, Nutzerweisung) | `llm` `modell` `deepseek` `openrouter` `llm-anbieter` |
| `9router` | 9router (eigener LLM-Router) | LLM-Zugang | läuft belegt | unklar | D-009 (dort für die Produktaufbereitung genannt; kein eigener Entscheid zum Modellweg) | `llm-router` `llm-gateway` `modellweg` `router` `server` |
| `cognee-server` | Cognee, Server-Instanz `cognee-x532` | Gedächtnis und Wissen | defekt | tragend | keine (in `config/gedaechtnis.json` als episodischer Speicher festgelegt) | `gedaechtnis` `wissen` `graph-rag` `episodisch` `cognee` `brain` |
| `cognee-plugin-lokal` | Cognee-Plugin in Claude Code (lokale Instanz) | Gedächtnis und Wissen | defekt | unklar | keine | `gedaechtnis` `plugin` `claude-code` `cognee` `fluechtig` |
| `lightrag` | LightRAG | Gedächtnis und Wissen | läuft belegt | abzulösen | keine (in `config/gedaechtnis.json` als semantischer Speicher festgelegt) | `gedaechtnis` `wissen` `graph-rag` `semantisch` `dokumente` |
| `agentmemory` | agentmemory | Gedächtnis und Wissen | läuft belegt | abzulösen | keine (in `config/gedaechtnis.json` als prozeduraler Speicher festgelegt) | `gedaechtnis` `prozedural` `agenten` `systemd` |
| `kb-gateway` | kb-gateway | Gedächtnis und Wissen | läuft unbelegt | unklar | keine | `gedaechtnis` `gateway` `wissen` `server` |
| `graphify` | Graphify (Wissensgraph des Codes) | Gedächtnis und Wissen | läuft belegt | tragend | D-018 | `wissensgraph` `code` `graph` `einarbeitung` `wissen` |
| `mem` | Mem (Notizen des Inhabers) | Gedächtnis und Wissen | läuft belegt | doppelt | keine | `notizen` `gedaechtnis` `wissen` `zweite-fundstelle` `inhaber` |
| `notion` | Notion | Gedächtnis und Wissen | läuft belegt | unklar | keine | `notizen` `wissen` `dokumente` `wiki` |
| `librechat` | LibreChat | Arbeitsplatz-Oberfläche | defekt | doppelt | keine | `arbeitsplatz` `oberflaeche` `chat` `server` |
| `aionui` | AionUi | Arbeitsplatz-Oberfläche | läuft belegt | doppelt | keine | `arbeitsplatz` `oberflaeche` `chat` `server` `speicherfresser` |
| `dify` | Dify | Arbeitsplatz-Oberfläche | stillgelegt | doppelt | keine | `arbeitsplatz` `oberflaeche` `agenten-baukasten` `server` |
| `lobehub` | LobeHub | Arbeitsplatz-Oberfläche | läuft unbelegt | doppelt | keine | `arbeitsplatz` `oberflaeche` `chat` `abo` |
| `supabase` | Supabase (eigene, selbst gehostete Instanz) | Datenhaltung | läuft unbelegt | tragend | D-013 | `datenbank` `postgres` `rls` `datenhaltung` `mandanten` |
| `mongodb` | MongoDB (Shop-Speicher, IST) | Datenhaltung | läuft unbelegt | doppelt | D-006, D-013 | `datenbank` `shop` `mongodb` `datenhaltung` `teileklar` |
| `upstash` | Upstash | Datenhaltung | läuft unbelegt | unklar | keine | `datenbank` `redis` `zwischenspeicher` `abo` |
| `convex` | Convex (selbst gehostet) | Datenhaltung | läuft belegt | unklar | keine | `datenbank` `backend` `server` |
| `openbao` | OpenBao | Geheimnisspeicher | läuft belegt | unklar | keine | `geheimnisspeicher` `geheimnisse` `tresor` `server` |
| `composio-for-you` | Composio For You | Integrationen | läuft belegt | tragend | keine | `integrationen` `apps` `mcp` `werkzeuge` `inhaber` |
| `composio-platform` | Composio Platform | Integrationen | läuft unbelegt | tragend | keine | `integrationen` `apps` `suite` `webhook` `kunde-verbindet` |
| `resend` | Resend | Mail | läuft belegt | tragend | D-007 | `mail` `versand` `transaktionsmail` `passwort-reset` |
| `revolut` | Revolut Merchant API | Zahlung | läuft unbelegt | tragend | D-008 | `zahlung` `kasse` `shop` `webhook` |
| `bigbuy` | BigBuy | Sortiment | defekt | tragend | D-008 | `sortiment` `grosshandel` `shop` `teileklar` `import` |
| `hubspot` | HubSpot | CRM | läuft belegt | unklar | keine | `crm` `vertrieb` `kontakte` `leads` |
| `sentry` | Sentry | Überwachung | läuft unbelegt | tragend | keine | `fehler` `ueberwachung` `monitoring` `web` |
| `posthog` | PostHog | Überwachung | läuft unbelegt | unklar | keine | `analyse` `nutzung` `web` `monitoring` |
| `monitoring` | Prometheus, Grafana, Alertmanager (`monitoring-dus`) | Überwachung | läuft belegt | tragend | keine | `ueberwachung` `monitoring` `metriken` `alarm` `server` |
| `github` | GitHub | Code | läuft belegt | tragend | keine (Nutzerbestimmung vom 26.10.2026 in AGENTS.md) | `code` `repository` `quellverwaltung` `pull-requests` |
| `github-actions` | GitHub Actions | Code | defekt | tragend | keine | `ci` `automatisierung` `pruefung` `code` |
| `gitlab` | GitLab (selbst gehostet, mit Runner) | Code | läuft belegt | unklar | keine (AGENTS.md: nachgelagerte Spiegelung, keine zweite Schreibquelle) | `code` `ci` `spiegel` `server` `speicherfresser` |
| `n8n` | n8n | Automatisierung | läuft unbelegt | unklar | keine | `automatisierung` `workflows` `integrationen` |
| `searxng` | SearXNG | Agenten-Werkzeuge | läuft belegt | unklar | keine | `suche` `websuche` `agenten` `server` |
| `bookstack` | BookStack (Wiki) | Gedächtnis und Wissen | läuft belegt | unklar | keine | `wiki` `dokumentation` `wissen` `server` |
| `bisheng` | Bisheng (`dsh-enterprise`) | Agenten-Plattform | läuft belegt | unklar | keine | `agenten-plattform` `llm-anwendung` `server` `speicherfresser` |
| `gowa` | GoWA (WhatsApp-Anbindung) | Kommunikation | läuft belegt | unklar | keine | `whatsapp` `nachrichten` `kanal` `server` |
| `clerk` | Clerk | Anmeldung | nicht verfolgt | doppelt | D-007 | `anmeldung` `konten` `historie` `auth` |
| `emergent` | Emergent (Google-Anmeldung) | Anmeldung | läuft unbelegt | unklar | D-007 | `anmeldung` `google` `auth` `konten` |
| `linear` | Linear | Aufgabenverwaltung | läuft belegt | unklar | keine | `aufgaben` `tickets` `planung` |
| `slack` | Slack | Kommunikation | läuft unbelegt | unklar | keine | `nachrichten` `kanal` `team` `benachrichtigung` |
| `google-workspace` | Google Workspace (Gmail, Kalender, Drive) | Mail | läuft belegt | unklar | keine | `mail` `kalender` `dateien` `postfach` `inhaber` |
| `postiz` | Postiz | Marketing | läuft unbelegt | unklar | keine | `social-media` `planung` `marketing` |
| `claude-umgebung` | Claude-Code-Umgebung (Cloud-Sitzungen) | Arbeitsumgebung | läuft belegt | tragend | keine | `agenten` `arbeitsumgebung` `geheimnisspeicher` `netzwerk-geheimnisse` `plugins` |

## Zugänge mit fälliger Erneuerung

| Lösung | Bezeichnung | Art | Ablageort des Werts | offengelegt | Hinweis |
|---|---|---|---|---|---|
| `cloudflare-konto` | tiny-shadow-c5a6 | Konto-API-Token mit R2-S3-Zugangsdaten | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `cloudflare-konto` | jolly-wildflower-3e52 | Konto-API-Token mit R2-S3-Zugangsdaten | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `cloudflare-konto` | NeXify AI CF Auth. Token | Benutzer-API-Token | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `cloudflare-konto` | Cloudflare-Token der Claude-Umgebung für api.cloudflare.com | API-Token als Netzwerk-Geheimnis | Netzwerk-Geheimnisse der Claude-Umgebung (Host api.cloudflare.com) | ja | Genau ein Token ist hinterlegt; welches der oben genannten es ist, ist nicht feststellbar. Der Cloudflare-Umzugsbericht vom 14.11.2026 vermerkt, dass das damals hinterlegte Token als ungültig abgelehnt wurde. Nach der Erneuerung den neuen Wert über das sichere Formular hinterlegen. |
| `cloudflare-r2` | R2-S3-Zugangsdaten zu tiny-shadow-c5a6 | S3-Zugangskennung und S3-Geheimschlüssel | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `cloudflare-r2` | R2-S3-Zugangsdaten zu jolly-wildflower-3e52 | S3-Zugangskennung und S3-Geheimschlüssel | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `cloudflare-access` | Access-Dienst-Token | Dienst-Token (Kennung und Geheimnis) | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| `hostinger-srv1941843` | 15 SSH-Schlüssel im Hostinger-Konto | SSH-Schlüssel (öffentliche Teile im Konto) | Hostinger-Konto; private Teile auf den Geräten ihrer Besitzer | nein | Sichtung durch den Inhaber fällig: darunter `ignore-this`, `temp-check` und mehrere als vorübergehend bezeichnete Schlüssel (`docs/04-betrieb/server-befund-2026-11-14.md:31`). Laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014, steht in Mem eine Notiz „SSH Keys“ vom März 2026. |
| `composio-for-you` | Composio-For-You-Schlüssel | API-Schlüssel | Passwortmanager des Inhabers und Verbindungsverwaltung von claude.ai | ja | Stand laut `PROGRESS.md:85`: Schlüssel standen im Gespräch; Erneuerung nicht belegt (D-017). |
| `composio-platform` | COMPOSIO_API_KEY, COMPOSIO_AUTH_TOKEN, COMPOSIO_WEBHOOK_SECRET | API-Schlüssel, Zugangstoken, Signaturschlüssel | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | ja | Composio-Schlüssel standen laut PROGRESS.md im Gespräch; welcher der Schlüssel betroffen ist, ist nicht belegt – deshalb alle erneuern. |
| `bigbuy` | BigBuy-API-Schlüssel | API-Schlüssel | Passwortmanager des Inhabers; Zielablage Vercel-Projektvariablen | ja | Stand im Gespräch (`PROGRESS.md:85`); Erneuerung nicht belegt. |
| `github` | Zwei ältere GitHub-Tokens | persönliche Zugangstoken | stehen laut Befund im Klartext in Mem-Notizen vom März 2026 | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: beim Anbieter widerrufen und die Notizen bereinigen (nur Inhaber). Die Werte wurden für dieses Register nicht gelesen. |
| `n8n` | n8n-Schlüssel | API-Schlüssel | steht laut Befund im Klartext in einer Mem-Notiz vom März 2026 | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: widerrufen und Notiz bereinigen (nur Inhaber). Der Wert wurde nicht gelesen. |
| `linear` | Alter Anthropic-API-Schlüssel (Ticket NEX-71) | API-Schlüssel | Ort des Werts nicht belegt; das Ticket führt ihn als weiterhin aktiv | nein | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: beim Anbieter widerrufen und Ticket mit Beleg schließen (nur Inhaber). |
| `slack` | Slack-Webhook-Adresse | eingehender Webhook | steht laut Befund offen im Steuerungswiki in Mem | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: Webhook widerrufen und neu anlegen (nur Inhaber). Die Adresse wurde nicht gelesen. |
| `postiz` | Postiz-API- und MCP-Zugangsdaten | API-Schlüssel | stehen laut Befund im Klartext in einer Mem-Notiz vom März 2026 | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: widerrufen und Notiz bereinigen (nur Inhaber). Die Werte wurden nicht gelesen. |
| `claude-umgebung` | Netzwerk-Geheimnis für api.cloudflare.com | API-Token | Netzwerk-Geheimnisse der Claude-Umgebung | ja | siehe cloudflare-konto |

## Offene Fragen an den Inhaber

- `cloudflare-workers` (Cloudflare Workers (möglicher Ersatz für Vercel)): Soll der Umzug von Vercel zu Cloudflare als neue Entscheidung in DECISIONS.md festgehalten werden, obwohl er im heutigen Zuschnitt voraussichtlich den bezahlten Workers-Tarif braucht?
- `cloudflare-ai-gateway` (Cloudflare AI Gateway `default`): Soll das Cloudflare AI Gateway der Modellweg werden (statt 9router oder direktem OpenRouter-Zugang), und wer weist nach, dass die Modellregel aus `config/llm-policy.json` dort eingehalten wird?
- `cloudflare-mcp-portal` (Cloudflare MCP-Portal): Welche MCP-Server sollen über das Portal erreichbar sein, und wer darf sich daran anmelden?
- `cloudflare-mcp-server` (MCP-Server-Eintrag `nexify-ai-mcp-server-cf`): Unter welcher Adresse soll der eigene MCP-Server laufen (Vorschlag: `mcp.nexifyai.cloud`), und welcher Code steht dahinter (der Entwurf aus PR 124)?
- `cloudflare-access` (Cloudflare Access und Tunnel): Sollen die Hermes-Oberfläche und andere interne Oberflächen hinter Cloudflare Access oder einen Tunnel gelegt werden, um D-019 Folge 4 (nicht öffentlich) zu erfüllen?
- `hostinger-srv1243952` (Hostinger-Server srv1243952): Was läuft auf srv1243952, liegt dort die Shop-Datenbank, und wird der Server weiter gebraucht?
- `hermes-webui` (Hermes WebUI): Soll Hermes WebUI der Arbeitsplatz des Inhabers werden (Vorschlag: als neue Entscheidung festhalten), und wird die Oberfläche vorher vom öffentlichen Netz genommen?
- `9router` (9router (eigener LLM-Router)): Soll 9router die einzige Tür zu den Modellen sein, oder gehen die Aufrufe direkt an OpenRouter (oder über das Cloudflare AI Gateway)? Der Compose-Kommentar nennt 9router als abgelöst, die Modellregel als Ziel.
- `cognee-plugin-lokal` (Cognee-Plugin in Claude Code (lokale Instanz)): Soll das Plugin nach der Wiederherstellung auf die dauerhafte Server-Instanz zeigen oder abgeschaltet werden (Entscheidung 8 im Aufräumplan)?
- `kb-gateway` (kb-gateway): Wird das kb-gateway noch aufgerufen, und soll es nach der Ablösung als einziger Eingang vor Cognee bleiben oder entfallen?
- `notion` (Notion): Welche Rolle hat Notion neben dem Repository und Mem: weiter pflegen, nur lesen oder auslaufen lassen?
- `upstash` (Upstash): Wird Upstash noch gebraucht, und wofür? Falls nein: Abo kündigen (nur Inhaber).
- `convex` (Convex (selbst gehostet)): Wofür läuft Convex, und kann es stillgelegt werden?
- `openbao` (OpenBao): Soll OpenBao der Geheimnisspeicher für die Dienste auf den Servern werden, und was liegt heute darin?
- `hubspot` (HubSpot): Soll HubSpot das CRM der Agentur werden, oder liegen Leads künftig in der eigenen Supabase-Instanz?
- `posthog` (PostHog): Wird PostHog genutzt und ausgewertet, und ist die Einwilligung der Besucher dafür geregelt?
- `gitlab` (GitLab (selbst gehostet, mit Runner)): Wird die GitLab-Spiegelung noch gebraucht? Falls ja: Prometheus-Aufbewahrung begrenzen; falls nein: archivieren und stilllegen.
- `n8n` (n8n): Gibt es noch eine n8n-Instanz, und wird sie gebraucht? Unabhängig davon ist der Schlüssel aus der Mem-Notiz zu widerrufen.
- `searxng` (SearXNG): Suchen die Agenten tatsächlich über SearXNG? Falls ja behalten, sonst Stilllege-Kandidat.
- `bookstack` (BookStack (Wiki)): Wird das Wiki genutzt, oder ist die Dokumentation im Repository führend und das Wiki kann archiviert werden?
- `bisheng` (Bisheng (`dsh-enterprise`)): Wofür läuft Bisheng, gehört es zu einem Kundenprojekt, und kann es stillgelegt werden?
- `gowa` (GoWA (WhatsApp-Anbindung)): Soll WhatsApp ein Kanal werden? D-019 Folge 6 verlangt für jeden Kanal an Dritte eine eigene Freigabe.
- `emergent` (Emergent (Google-Anmeldung)): Bleibt die Google-Anmeldung über Emergent, oder wird sie mit dem Umzug der Konten auf Supabase (D-013) ersetzt?
- `linear` (Linear): Soll Linear weiter gepflegt werden? Führend sind `PROGRESS.md` und das Register in `config/acceptance-coverage.json`; `AGENTS.md` verbietet eine zweite Aufgabenverwaltung.
- `slack` (Slack): Soll Slack der Kanal für Meldungen der Agenten an den Inhaber werden? Hermes hat derzeit keinen aktiven Kanal.
- `google-workspace` (Google Workspace (Gmail, Kalender, Drive)): Welches Postfach ist führend für Kundenkorrespondenz: Google Workspace oder das Hostinger-Postfach?
- `postiz` (Postiz): Wird Postiz genutzt? Unabhängig davon sind die Zugangsdaten aus der Mem-Notiz zu widerrufen.

## Lösungen im Einzelnen

### Vercel · `vercel`

- **Tags:** `hosting` `auslieferung` `web` `vorschau` `produktion`
- **Kategorie:** Hosting
- **Zweck:** Liefert `apps/web` und `apps/shop-api` aus `main` aus; einziger Auslieferungsweg der Produktion.
- **Ort:** Vercel, Team `nexify-projekte`, Projekt `…-ut7r` (`prj_lKQEWQKzjqq4Ifvmwy6dh1XCIgVR`); Domains nexifyai.de und nexifyai.cloud
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `AGENTS.md:8` (Führungsentscheidung 13.11.2026) und `AGENTS.md:23` (Messung 14.11.2026, 10:37–10:43 UTC: vier Domains antworten mit 200 von Vercel). Laut Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository) ist eine Zahlung über 300,05 USD am 14.11.2026 fehlgeschlagen; nicht nachgeprüft.
- **Entscheidung:** keine (Führungsentscheidung des Inhabers vom 13.11.2026 in AGENTS.md)
- **Rolle im Plan:** tragend (Der Inhaber wünscht seit 14.11.2026 den Umzug zu Cloudflare; bis zu einer neuen Entscheidung in DECISIONS.md bleibt Vercel führend. Fünf verwaiste Projekte und ein Schwesterprojekt sind Stilllege-Kandidaten.)
- **Wann nutzen:** Bei jeder Auslieferung, Vorschau, Domain-Zuordnung oder Laufzeitvariable von `apps/web` und `apps/shop-api`.
- **Nicht nutzen für:** Dauerhafte Datenhaltung, Hintergrunddienste und alles, was auf den eigenen Servern läuft.
- **Abhängigkeiten:** `github`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Vercel-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | Team nexify-projekte; genauer Umfang nicht belegt | nicht belegt | nein | nein | – |
| Laufzeitvariablen des Projekts …-ut7r | Sammlung von Geheimnissen (Namen in docs/deployment/environment-variables.md) | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | je Variable verschieden | nicht belegt | nein | nein | – |

### Cloudflare-Konto „NeXify AI Agentur“ · `cloudflare-konto`

- **Tags:** `cloudflare` `konto` `plattform` `zugang` `dns`
- **Kategorie:** Plattform-Konto
- **Zweck:** Gemeinsames Konto für R2, Workers, AI Gateway, MCP-Portal, Access und die Zonen; hier hängen die Konto-Tokens.
- **Ort:** Cloudflare-Konto „NeXify AI Agentur“, Konto-ID `a112f895c19e0d65f6f64b3e89f747f8`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Messung 14.11.2026: der Cloudflare-Konnektor der Claude-Umgebung listet in diesem Konto den R2-Bucket (nur lesend). Konto-Name und Konto-ID: Angabe des Inhabers vom 14.11.2026.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Träger für R2 und die Zonen; ob Cloudflare auch Hosting wird, ist eine eigene offene Entscheidung (siehe cloudflare-workers).)
- **Wann nutzen:** Bevor ein Cloudflare-Dienst eingerichtet oder ein Cloudflare-Zugang gebraucht wird: erst hier nachsehen, welcher Token wofür existiert.
- **Nicht nutzen für:** Als Ablage für Token-Werte; die Werte stehen nie hier.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| tiny-shadow-c5a6 | Konto-API-Token mit R2-S3-Zugangsdaten | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | Konto-Token; genauer Rechteumfang nicht belegt | 2026-11-14 | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| jolly-wildflower-3e52 | Konto-API-Token mit R2-S3-Zugangsdaten | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | Konto-Token; genauer Rechteumfang nicht belegt | 2026-11-14 | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| NeXify AI CF Auth. Token | Benutzer-API-Token | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | Benutzer-Token; Rechteumfang nicht belegt | nicht belegt | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| Cloudflare-Token der Claude-Umgebung für api.cloudflare.com | API-Token als Netzwerk-Geheimnis | Netzwerk-Geheimnisse der Claude-Umgebung (Host api.cloudflare.com) | nicht belegt | 2026-11-14 | ja | ja | Genau ein Token ist hinterlegt; welches der oben genannten es ist, ist nicht feststellbar. Der Cloudflare-Umzugsbericht vom 14.11.2026 vermerkt, dass das damals hinterlegte Token als ungültig abgelehnt wurde. Nach der Erneuerung den neuen Wert über das sichere Formular hinterlegen. |
| Cloudflare-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP, vom Anbieter als veraltet markiert) | Verbindungsverwaltung von claude.ai | liest mindestens die R2-Bucket-Liste; weiterer Umfang nicht geprüft | nicht belegt | nein | nein | – |

### Cloudflare R2 (unser S3-kompatibler Objektspeicher) · `cloudflare-r2`

- **Tags:** `speicher` `s3` `objektspeicher` `archiv` `backup` `r2` `cloudflare` `dateien`
- **Kategorie:** Objektspeicher
- **Zweck:** S3-kompatibler Objektspeicher der Agentur für Archive, Sicherungen und große Dateien außerhalb der Server.
- **Ort:** Endpunkt `https://a112f895c19e0d65f6f64b3e89f747f8.r2.cloudflarestorage.com`, Bucket `nexify-agentur-pucket`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Messung 14.11.2026 über den Cloudflare-Konnektor (nur lesend): Bucket `nexify-agentur-pucket` vorhanden, angelegt am 15.10.2026. Schreibzugriff, Inhalt und Lebenszyklus-Regel sind nicht geprüft. Einordnung als Archivziel: `docs/04-betrieb/aufraeumplan-2026-11-14.md:313`.
- **Entscheidung:** keine (Vorgabe des Inhabers vom 14.11.2026: R2 stets als eigene Lösung im Gesamtsystem führen)
- **Rolle im Plan:** tragend (Empfohlenes Archivziel für Paperclip-Läufe, Sicherungen und die Cognee-Volumes; die Freigabe als Archivziel (Kosten rund 1–2 USD je Monat) ist Entscheidung 2 im Aufräumplan und noch offen.)
- **Wann nutzen:** Immer, wenn Dateien, Archive, Sicherungen, Exporte oder Medien dauerhaft und außerhalb der vollen Server abgelegt werden sollen („wo speichern wir das“).
- **Nicht nutzen für:** Kundendaten ohne geklärte Rechtsgrundlage und ohne Verschlüsselung vor dem Hochladen; Datenbank-Ersatz; Geheimnisse.
- **Abhängigkeiten:** `cloudflare-konto`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| R2-S3-Zugangsdaten zu tiny-shadow-c5a6 | S3-Zugangskennung und S3-Geheimschlüssel | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | R2 des Kontos; Begrenzung auf einen Bucket nicht belegt | 2026-11-14 | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| R2-S3-Zugangsdaten zu jolly-wildflower-3e52 | S3-Zugangskennung und S3-Geheimschlüssel | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | R2 des Kontos; Begrenzung auf einen Bucket nicht belegt | 2026-11-14 | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |
| Eigener Schlüssel nur für den Archiv-Bucket | S3-Zugangsdaten (noch anzulegen) | noch nicht angelegt; Ziel: Geheimnisspeicher des ausführenden Servers | nur Bucket nexify-agentur-pucket, Lesen und Schreiben von Objekten | noch nicht erstellt | nein | nein | Empfehlung aus dem Aufräumplan, Abschnitt 7.1: ein auf diesen Bucket begrenzter Schlüssel statt eines Konto-Tokens. |

### Cloudflare Workers (möglicher Ersatz für Vercel) · `cloudflare-workers`

- **Tags:** `hosting` `auslieferung` `cloudflare` `workers` `umzug`
- **Kategorie:** Hosting
- **Zweck:** Möglicher künftiger Auslieferungsweg für `apps/web`; vorbereitet und lokal gemessen, nicht umgeschaltet.
- **Ort:** Cloudflare-Konto „NeXify AI Agentur“, Konto-ID `a112f895c19e0d65f6f64b3e89f747f8`; Vorbereitung in `apps/web/wrangler.jsonc` und auf dem Zweig `claude/cloudflare-umzug`
- **Zustand:** geplant (Stand 2026-11-14). Beleg: `AGENTS.md:11` (Stand 13.11.2026: als Hosting nicht verfolgt). Der Umzugsbericht vom 14.11.2026 (Datei cloudflare-umzug-2026-11-14 unter docs/04-betrieb) liegt nur auf dem Zweig `claude/cloudflare-umzug`, nicht auf `main`: lokal gemessen, auf Cloudflare nichts ausgeliefert, kein DNS-Eintrag geändert.
- **Entscheidung:** keine (AGENTS.md vom 13.11.2026 sagt „nicht verfolgt“; der Wunsch des Inhabers vom 14.11.2026 ist noch nicht als Entscheidung festgehalten)
- **Rolle im Plan:** unklar → Frage: Soll der Umzug von Vercel zu Cloudflare als neue Entscheidung in DECISIONS.md festgehalten werden, obwohl er im heutigen Zuschnitt voraussichtlich den bezahlten Workers-Tarif braucht? (Laut Umzugsbericht lagen die Seiten lokal bei 46–56 ms Rechenzeit gegen 10 ms im kostenlosen Tarif; die Shop-API zieht nicht mit um.)
- **Wann nutzen:** Wenn über den Auslieferungsweg, Hosting-Kosten oder den Umzug von Vercel gesprochen wird.
- **Nicht nutzen für:** Produktive Auslieferung, solange keine Entscheidung vorliegt; DNS- oder Domain-Änderungen ohne Freigabe.
- **Abhängigkeiten:** `cloudflare-konto`, `vercel`
- **Zugänge:** keine erfasst

### Cloudflare AI Gateway `default` · `cloudflare-ai-gateway`

- **Tags:** `llm-gateway` `llm-router` `cloudflare` `modellweg` `protokollierung`
- **Kategorie:** LLM-Zugang
- **Zweck:** OpenAI-kompatibles Gateway vor Modellanbietern mit Protokollierung und Begrenzung an einer Stelle.
- **Ort:** Gateway `default`, Adresse `https://gateway.nexifyai.cloud/compat/chat/completions`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Angabe des Inhabers im Gespräch am 14.11.2026, nicht nachgemessen. Kein Aufruf ausgeführt; ob dort `deepseek/deepseek-v4.1-flash-1017` mit Reasoning `high` ohne Ersatzmodell ankommt, ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll das Cloudflare AI Gateway der Modellweg werden (statt 9router oder direktem OpenRouter-Zugang), und wer weist nach, dass die Modellregel aus `config/llm-policy.json` dort eingehalten wird?
- **Wann nutzen:** Wenn ein Modellaufruf zentral protokolliert, begrenzt oder zwischengespeichert werden soll und die Frage nach dem Modellweg gestellt wird.
- **Nicht nutzen für:** Verwaltete LLM-Aufrufe, solange Modellkennung, Reasoning und fehlender Ersatz dort nicht nachgewiesen sind (`config/llm-policy.json`).
- **Abhängigkeiten:** `cloudflare-konto`, `openrouter-deepseek`
- **Zugänge:** keine erfasst

### Cloudflare MCP-Portal · `cloudflare-mcp-portal`

- **Tags:** `mcp` `werkzeuge` `cloudflare` `portal` `agenten`
- **Kategorie:** Agenten-Werkzeuge
- **Zweck:** Ein gemeinsamer MCP-Eingang, über den Agenten freigegebene MCP-Server erreichen.
- **Ort:** `https://mcp-cf-portal.nexifyai.cloud/mcp`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Angabe des Inhabers im Gespräch am 14.11.2026, nicht nachgemessen. Erreichbarkeit, Anmeldung und angebundene Server sind nicht gemessen.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Welche MCP-Server sollen über das Portal erreichbar sein, und wer darf sich daran anmelden?
- **Wann nutzen:** Wenn ein Agent ein Werkzeug über MCP braucht und gefragt wird, wo unsere MCP-Server gebündelt sind.
- **Nicht nutzen für:** Kundendaten oder Werkzeuge mit Schreibwirkung, solange Anmeldung und Freigabeliste nicht belegt sind.
- **Abhängigkeiten:** `cloudflare-konto`, `cloudflare-access`
- **Zugänge:** keine erfasst

### MCP-Server-Eintrag `nexify-ai-mcp-server-cf` · `cloudflare-mcp-server`

- **Tags:** `mcp` `cloudflare` `werkzeuge` `eigener-server`
- **Kategorie:** Agenten-Werkzeuge
- **Zweck:** Eigener MCP-Server der Agentur, der über das Portal angeboten werden soll.
- **Ort:** Eintrag `nexify-ai-mcp-server-cf` im Cloudflare-Konto; eingetragener Endpunkt `mcp.nexifai.cloud`
- **Zustand:** defekt (Stand 2026-11-14). Beleg: Angabe des Inhabers vom 14.11.2026: Der eingetragene Endpunkt enthält einen Tippfehler (`nexifai` statt `nexifyai`), und die Domain ist noch nicht angelegt. Nicht nachgemessen.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Unter welcher Adresse soll der eigene MCP-Server laufen (Vorschlag: `mcp.nexifyai.cloud`), und welcher Code steht dahinter (der Entwurf aus PR 124)?
- **Wann nutzen:** Wenn der eigene MCP-Server der Agentur eingerichtet, korrigiert oder angebunden werden soll.
- **Nicht nutzen für:** Jede produktive Nutzung, bis Adresse, Domain und Anmeldung stimmen.
- **Abhängigkeiten:** `cloudflare-mcp-portal`
- **Zugänge:** keine erfasst

### Cloudflare Access und Tunnel · `cloudflare-access`

- **Tags:** `zugangsschutz` `tunnel` `cloudflare` `access` `netz`
- **Kategorie:** Netz und Zugangsschutz
- **Zweck:** Schützt interne Oberflächen mit Anmeldung vor dem Dienst und kann Dienste ohne offenen Port erreichbar machen.
- **Ort:** Cloudflare-Konto „NeXify AI Agentur“, Konto-ID `a112f895c19e0d65f6f64b3e89f747f8`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Angabe des Inhabers im Gespräch am 14.11.2026, nicht nachgemessen: ein Access-Dienst-Token wurde angelegt. Welche Anwendung es schützt und ob ein Tunnel besteht, ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Sollen die Hermes-Oberfläche und andere interne Oberflächen hinter Cloudflare Access oder einen Tunnel gelegt werden, um D-019 Folge 4 (nicht öffentlich) zu erfüllen? (D-019 nennt bisher SSH-Tunnel oder WireGuard als Weg.)
- **Wann nutzen:** Wenn eine interne Oberfläche vom öffentlichen Netz genommen oder ein Dienst ohne offenen Port erreichbar gemacht werden soll.
- **Nicht nutzen für:** Als Ersatz für die Mandantentrennung einer Anwendung; Access schützt den Eingang, nicht die Daten.
- **Abhängigkeiten:** `cloudflare-konto`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Access-Dienst-Token | Dienst-Token (Kennung und Geheimnis) | Cloudflare-Dashboard (dort nur bei der Erstellung sichtbar) und Passwortmanager des Inhabers | nicht belegt (welche Access-Anwendung) | nicht belegt | ja | ja | im Chat offengelegt am 14.11.2026 – Erneuerung empfohlen; der Wert liegt dem Register nicht vor |

### Cloudflare DNS und Zonen · `cloudflare-dns`

- **Tags:** `dns` `domains` `zonen` `cloudflare` `netz`
- **Kategorie:** Netz und Zugangsschutz
- **Zweck:** Verwaltet die Domains und DNS-Einträge der Agentur.
- **Ort:** Cloudflare-Konto „NeXify AI Agentur“, Konto-ID `a112f895c19e0d65f6f64b3e89f747f8`; Zonen laut Inhaber dort geführt (genannt: nexifyai.cloud mit den Namen gateway und mcp-cf-portal)
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Angabe des Inhabers vom 14.11.2026 („wir haben dort die Domains“), zitiert im Umzugsbericht auf dem Zweig `claude/cloudflare-umzug`. Die Zonenliste wurde nicht abgerufen.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Jede DNS-Änderung ist eine Hartsperre für Agenten (`config/brain/agents.json`) und braucht die Freigabe des Inhabers.)
- **Wann nutzen:** Wenn eine Domain, Subdomain oder ein DNS-Eintrag gebraucht oder geprüft wird.
- **Nicht nutzen für:** Änderungen durch Agenten ohne Freigabe; DNS-Änderungen sind gesperrt.
- **Abhängigkeiten:** `cloudflare-konto`
- **Zugänge:** keine erfasst

### Hostinger-Server srv1941843 · `hostinger-srv1941843`

- **Tags:** `server` `vps` `hosting` `hostinger` `docker` `infrastruktur`
- **Kategorie:** Server
- **Zweck:** Hauptserver für die selbst betriebenen Dienste (Traefik, Hermes, Gedächtnis-Systeme, GitLab, Überwachung).
- **Ort:** Hostinger KVM 8, Ubuntu 24.04, Adresse 179.198.195.91; 20 Compose-Projekte
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/server-befund-2026-11-14.md:12` (Hostinger-API, 14.11.2026): 97 % belegt, 10,2 GB frei. Dienste je Projekt: `docs/04-betrieb/aufraeumplan-2026-11-14.md:161`.
- **Entscheidung:** D-016
- **Rolle im Plan:** tragend (Platte fast voll; Aufräumen nur je Schritt mit Freigabe und Rückweg (D-016).)
- **Wann nutzen:** Wenn ein selbst betriebener Dienst gebraucht wird oder die Frage lautet, was auf dem Server läuft und wie voll er ist.
- **Nicht nutzen für:** Neue dauerhafte Dienste, solange die Platte zu 97 % belegt ist; Sicherungen auf derselben Platte.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Hostinger-API-Schlüssel der Claude-Umgebung | API-Schlüssel als Netzwerk-Geheimnis | Netzwerk-Geheimnisse der Claude-Umgebung (Host developers.hostinger.com) | Hostinger-Konto; genutzt lesend, Snapshot und einmalige Mess-Container | nicht belegt | nein | nein | – |
| 15 SSH-Schlüssel im Hostinger-Konto | SSH-Schlüssel (öffentliche Teile im Konto) | Hostinger-Konto; private Teile auf den Geräten ihrer Besitzer | Root-Zugang, soweit in authorized_keys eingetragen (nicht belegt) | verschieden | nein | ja | Sichtung durch den Inhaber fällig: darunter `ignore-this`, `temp-check` und mehrere als vorübergehend bezeichnete Schlüssel (`docs/04-betrieb/server-befund-2026-11-14.md:31`). Laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014, steht in Mem eine Notiz „SSH Keys“ vom März 2026. |

### Hostinger-Server srv1243952 · `hostinger-srv1243952`

- **Tags:** `server` `vps` `hostinger` `infrastruktur` `unbekannter-bestand`
- **Kategorie:** Server
- **Zweck:** Zweiter Server; welche Dienste dort laufen, ist nicht erhoben (vermutet wird die Shop-Datenbank).
- **Ort:** Hostinger KVM 8, Ubuntu 26.04, Adresse 72.62.152.47
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/server-befund-2026-11-14.md:16`: nur Metriken (Platte rund 86 %, Arbeitsspeicher 20,7–22,8 GB), Dienste über die API nicht lesbar. `docs/04-betrieb/aufraeumplan-2026-11-14.md:336`.
- **Entscheidung:** D-016
- **Rolle im Plan:** unklar → Frage: Was läuft auf srv1243952, liegt dort die Shop-Datenbank, und wird der Server weiter gebraucht?
- **Wann nutzen:** Wenn eine Datenbank oder ein Dienst auf srv1941843 nicht zu finden ist und geklärt werden muss, wo er läuft.
- **Nicht nutzen für:** Als Archivziel (selbst zu voll) und für Eingriffe ohne Shell-Sitzung und Freigabe.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Hostinger-API-Schlüssel der Claude-Umgebung | API-Schlüssel als Netzwerk-Geheimnis | Netzwerk-Geheimnisse der Claude-Umgebung (Host developers.hostinger.com) | wie bei srv1941843; Docker Manager hier nicht verfügbar | nicht belegt | nein | nein | – |

### Traefik (Reverse-Proxy) · `traefik`

- **Tags:** `reverse-proxy` `tls` `routen` `netz` `server`
- **Kategorie:** Netz und Zugangsschutz
- **Zweck:** Nimmt Anfragen für die Dienste auf srv1941843 an, terminiert TLS und leitet nach Domain weiter.
- **Ort:** srv1941843, Compose-Projekt `traefik-juib`; Routen in `/docker/traefik-juib/dynamic.yml`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:167` (Hostinger-API und Mess-Container, 14.11.2026).
- **Entscheidung:** D-016
- **Rolle im Plan:** tragend (Nie destruktiv anfassen (D-016); das Image steht auf `latest` und soll auf einen festen Digest.)
- **Wann nutzen:** Wenn ein Dienst auf dem Server unter einer Domain erreichbar sein oder vom Netz genommen werden soll.
- **Nicht nutzen für:** Änderungen ohne Sicherung der Datei und Freigabe des Inhabers.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### Hermes (Orchestrierungs-Laufzeit) · `hermes`

- **Tags:** `orchestrierung` `agenten` `laufzeit` `hermes`
- **Kategorie:** Orchestrierung
- **Zweck:** Laufzeit, in der die Rollen NeX (führt aus) und AIFly ORACLE (koordiniert) arbeiten.
- **Ort:** srv1941843, Compose-Projekt `docker-hermes`, Container `hermes`; Konfiguration im Repository unter `ops/hermes/`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `DECISIONS.md:146`. Der Container läuft; die Konfiguration aus `ops/hermes/` ist auf dem Server nicht eingespielt, ein echter Modellaufruf ist nicht belegt (`docs/04-betrieb/server-befund-2026-11-14.md:28`).
- **Entscheidung:** D-019
- **Rolle im Plan:** tragend (Funktionsnachweis steht aus; der Docker-Socket im Container ist als Risiko zu führen (D-019 Folge 5).)
- **Wann nutzen:** Wenn eine Aufgabe von Agenten dauerhaft, wiederkehrend oder koordiniert ausgeführt werden soll.
- **Nicht nutzen für:** Kundenkonten und Mandantentrennung; Nachrichten an Dritte ohne eigene Freigabe (D-019 Folge 6).
- **Abhängigkeiten:** `hostinger-srv1941843`, `openrouter-deepseek`, `traefik`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| OPENROUTER_API_KEY für Hermes (mit Ausgabenlimit) | API-Schlüssel | `/root/.hermes/.env` auf srv1941843 (Vorlage `ops/hermes/home/.env.example`) | nur Modellaufrufe, mit Ausgabenlimit | noch nicht eingetragen | nein | nein | Trägt der Inhaber ein; ohne ihn gibt es keinen bezahlten Funktionsnachweis (D-019). |

### Hermes WebUI · `hermes-webui`

- **Tags:** `arbeitsplatz` `oberflaeche` `hermes` `chat`
- **Kategorie:** Arbeitsplatz-Oberfläche
- **Zweck:** Web-Oberfläche zu Hermes; vorgeschlagen als Arbeitsplatz des Inhabers.
- **Ort:** srv1941843, Port 8788, über Traefik unter `unternehmensbot.eu` öffentlich erreichbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/server-befund-2026-11-14.md:75` (Messung 14.11.2026): öffentlich erreichbar, nur durch die Hermes-eigene Anmeldung geschützt; das widerspricht D-019 Folge 4.
- **Entscheidung:** D-019
- **Rolle im Plan:** unklar → Frage: Soll Hermes WebUI der Arbeitsplatz des Inhabers werden (Vorschlag: als neue Entscheidung festhalten), und wird die Oberfläche vorher vom öffentlichen Netz genommen?
- **Wann nutzen:** Wenn der Inhaber selbst mit den Agenten arbeiten will und nach seiner Arbeitsoberfläche gefragt wird.
- **Nicht nutzen für:** Die Suite für Kunden: keine Kundenkonten, keine Mandantentrennung.
- **Abhängigkeiten:** `hermes`, `traefik`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Anmeldung der Hermes-Oberfläche | Passwort | Passwortmanager des Inhabers | voller Zugriff auf Hermes samt Terminal und Docker-Socket | nicht belegt | nein | nein | Kein Wert im Chat belegt. Solange die Oberfläche öffentlich erreichbar ist, ist dieses Passwort der einzige Schutz. |

### Paperclip · `paperclip`

- **Tags:** `orchestrierung` `agenten` `historie` `speicherfresser`
- **Kategorie:** Orchestrierung
- **Zweck:** Frühere Orchestrierung der Agenten; durch Hermes ersetzt.
- **Ort:** srv1941843, `/home/mypad/workspace/.paperclip-runtime` (kein laufender Prozess)
- **Zustand:** nicht verfolgt (Stand 2026-11-14). Beleg: `DECISIONS.md:112`; `docs/04-betrieb/aufraeumplan-2026-11-14.md:42`: 77,3 GiB Lauf-Verzeichnisse, kein Prozess.
- **Entscheidung:** D-019
- **Rolle im Plan:** doppelt → bleibt: Hermes (D-019) (Die Läufe (77,3 GiB) erst archivieren und probeweise zurückholen, dann nach Freigabe löschen.)
- **Wann nutzen:** Nur, wenn alte Läufe oder Agentenanweisungen aus der Zeit vor dem 14.11.2026 gesucht werden.
- **Nicht nutzen für:** Neue Aufgaben; Paperclip wird nicht weiterverfolgt.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### OpenRouter mit DeepSeek v4.1 flash 1017 · `openrouter-deepseek`

- **Tags:** `llm` `modell` `deepseek` `openrouter` `llm-anbieter`
- **Kategorie:** LLM-Zugang
- **Zweck:** Einziger zulässiger Modellanbieter und einziges Modell für alle verwalteten LLM-Aufrufe.
- **Ort:** OpenRouter, Modell `deepseek/deepseek-v4.1-flash-1017`, Reasoning `high`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `AGENTS.md:408`. Die Regel ist belegt; ein echter Aufruf mit dieser Kennung im Providerrequest ist für Hermes und für den öffentlichen Chat nicht belegt (`PROGRESS.md:93`).
- **Entscheidung:** D-019 (Modellregel selbst: `config/llm-policy.json`, Nutzerweisung)
- **Rolle im Plan:** tragend (Kein stilles Ersatzmodell, kein anderes Reasoning.)
- **Wann nutzen:** Bei jedem verwalteten LLM-Aufruf: Chat, Agenten, Recherche, Zusammenfassung, CI-Review.
- **Nicht nutzen für:** Andere Modelle oder Anbieter als Ausweichweg; Kundenschlüssel (BYOK) laufen getrennt.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| OPENROUTER_API_KEY (CI-Review) | API-Schlüssel | GitHub-Actions-Secrets des Repositorys | Modellaufrufe; Kostenobergrenze je Lauf in `config/automation.json` | nicht belegt | nein | nein | – |
| OPENROUTER_API_KEY für Hermes | API-Schlüssel | `/root/.hermes/.env` auf srv1941843 | nur Modellaufrufe, mit Ausgabenlimit | noch nicht eingetragen | nein | nein | siehe hermes |

### 9router (eigener LLM-Router) · `9router`

- **Tags:** `llm-router` `llm-gateway` `modellweg` `router` `server`
- **Kategorie:** LLM-Zugang
- **Zweck:** Eigener OpenAI-kompatibler Router vor den Modellanbietern; Ziel laut Modellregel, aber nicht aktiviert.
- **Ort:** srv1941843, Compose-Projekt `stack`; lokale Adresse der Gedächtnis-Dienste `172.27.0.1:20129` (was dahinter antwortet, ist nicht belegt)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:169`: Container läuft, laut Compose-Kommentar „abgelöst 03.10.“. `config/llm-policy.json` führt „nur über 9router“ als Ziel mit Status nicht aktiviert.
- **Entscheidung:** D-009 (dort für die Produktaufbereitung genannt; kein eigener Entscheid zum Modellweg)
- **Rolle im Plan:** unklar → Frage: Soll 9router die einzige Tür zu den Modellen sein, oder gehen die Aufrufe direkt an OpenRouter (oder über das Cloudflare AI Gateway)? Der Compose-Kommentar nennt 9router als abgelöst, die Modellregel als Ziel.
- **Wann nutzen:** Wenn nach dem Modellweg, nach `ROUTER_URL`/`ROUTER_KEY` oder nach einem gemeinsamen Zugang für mehrere Dienste gefragt wird.
- **Nicht nutzen für:** Als Nachweis der Modellregel: die Kennung mit Endung 1017 im Providerrequest ist dort nicht belegt.
- **Abhängigkeiten:** `hostinger-srv1941843`, `openrouter-deepseek`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| ROUTER_URL und ROUTER_KEY | Adresse und API-Schlüssel des Routers | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | Modellaufrufe über den Router | nicht belegt | nein | nein | Für die Agenten nicht übergeben (Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-145). |

### Cognee, Server-Instanz `cognee-x532` · `cognee-server`

- **Tags:** `gedaechtnis` `wissen` `graph-rag` `episodisch` `cognee` `brain`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Gedächtnis „Brain“ der Agentur: Graph und Vektoren über Dokumente und Sitzungen, mit Mandanten und Rechten je Datensatz.
- **Ort:** srv1941843, Compose-Projekt `/docker/cognee-x532`, Adresse `brain.nexifyai.cloud`
- **Zustand:** defekt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:55`: Der Dienst `cognee` hat keinen Container und kein Image; `/docs` und `/health` antworten mit 404. Die Daten liegen in zwei Volumes, die Docker als ungenutzt führt (`docs/04-betrieb/aufraeumplan-2026-11-14.md:63`).
- **Entscheidung:** keine (in `config/gedaechtnis.json` als episodischer Speicher festgelegt)
- **Rolle im Plan:** tragend (Erst wiederherstellen und sichern, dann stufenweise die anderen Systeme ablösen; Entscheidung 1 im Aufräumplan ist offen. KEIN Volume-Prune auf dem Server.)
- **Wann nutzen:** Wenn Wissen über Sitzungen hinweg gespeichert oder abgefragt werden soll – aber erst, nachdem die Instanz wiederhergestellt ist.
- **Nicht nutzen für:** Verlässliche Abfragen heute (Dienst läuft nicht); Kundendaten ohne eigenen Datensatz und Rechte-Test.
- **Abhängigkeiten:** `hostinger-srv1941843`, `traefik`, `9router`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Basic-Auth vor `brain.nexifyai.cloud/mcp` | Benutzername und Passwort | nicht belegt (vermutlich Traefik-Konfiguration auf srv1941843) | Zugang zum Cognee-MCP | nicht belegt | nein | nein | – |

### Cognee-Plugin in Claude Code (lokale Instanz) · `cognee-plugin-lokal`

- **Tags:** `gedaechtnis` `plugin` `claude-code` `cognee` `fluechtig`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Sitzungsgedächtnis für Claude Code; läuft als eigene lokale Cognee-Instanz im Sitzungs-Container.
- **Ort:** Claude-Code-Sitzung, `http://localhost:8011`, Daten unter `~/.cognee` im flüchtigen Container
- **Zustand:** defekt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:71`: keine Verbindung zu `cognee-x532`; der Graph wird nie gebaut (fehlendes Modul), und der Speicher überlebt die Sitzung nicht.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll das Plugin nach der Wiederherstellung auf die dauerhafte Server-Instanz zeigen oder abgeschaltet werden (Entscheidung 8 im Aufräumplan)?
- **Wann nutzen:** Nicht nutzen, bis es auf eine dauerhafte Instanz zeigt; bis dahin gelten Repository und Register als Gedächtnis.
- **Nicht nutzen für:** Alles, was eine Sitzung überdauern soll: der Speicher ist flüchtig und liefert keine Treffer.
- **Abhängigkeiten:** `cognee-server`
- **Zugänge:** keine erfasst

### LightRAG · `lightrag`

- **Tags:** `gedaechtnis` `wissen` `graph-rag` `semantisch` `dokumente`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Graph-RAG über die Dokumente der Agentur (semantischer Speicher).
- **Ort:** srv1941843, Compose-Projekt `stack` (`/opt/ai-stack/stack`), Container `lightrag-local` und `lightrag-db`, Port 9621
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:82`: läuft; die Datenbank lief wegen der vollen Platte in einer Absturzschleife (4 Neustarts). Der Port ist an alle Adressen gebunden.
- **Entscheidung:** keine (in `config/gedaechtnis.json` als semantischer Speicher festgelegt)
- **Rolle im Plan:** abzulösen (Ablösung durch Cognee erst nach bestandenem Probelauf (100 Dokumente, 20 feste Fragen) und Freigabe; bis dahin nur lesend weiterbetreiben. Entscheidung 1 im Aufräumplan ist offen.)
- **Wann nutzen:** Wenn heute in den vorhandenen Dokumenten der Agentur gesucht werden muss und Cognee noch nicht wiederhergestellt ist.
- **Nicht nutzen für:** Neue Anbindungen oder neue Datenbestände; Kundendaten (Mandantentrennung nur über Workspaces).
- **Abhängigkeiten:** `hostinger-srv1941843`, `9router`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Zugang zur LightRAG-API | kein Zugangsschutz belegt | kein Geheimnis belegt | offen, falls von außen erreichbar | nicht belegt | nein | nein | Laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-021, lief LightRAG nach einem Befund vom 09.10.2026 ohne Anmeldung; von außen nicht nachgemessen. |

### agentmemory · `agentmemory`

- **Tags:** `gedaechtnis` `prozedural` `agenten` `systemd`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Lokaler Speicherdienst für Agenten (prozeduraler Speicher).
- **Ort:** srv1941843, systemd-Dienst `agentmemory.service`, Daten unter `/root/.agentmemory`, Port 3111
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:99`: Prozess lief bei der Messung seit 6 Minuten; ob er regelmäßig neu startet, ist nicht belegt.
- **Entscheidung:** keine (in `config/gedaechtnis.json` als prozeduraler Speicher festgelegt)
- **Rolle im Plan:** abzulösen (Als Erstes ablösen (33 MB Daten, Export vorhanden), nachdem Cognee wiederhergestellt ist; Entscheidung 1 im Aufräumplan ist offen.)
- **Wann nutzen:** Nur für bestehende Aufrufer, bis sie umgestellt sind.
- **Nicht nutzen für:** Neue Anbindungen.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### kb-gateway · `kb-gateway`

- **Tags:** `gedaechtnis` `gateway` `wissen` `server`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Gateway vor LightRAG, agentmemory und Cognee: ein Eingang für Wissensabfragen.
- **Ort:** srv1941843, `/opt/ai-stack/kb-gateway/gateway.py` mit `gateway.env`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:116`: als Datei gefunden; ob ein Prozess läuft und wer es aufruft, ist nicht gemessen.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wird das kb-gateway noch aufgerufen, und soll es nach der Ablösung als einziger Eingang vor Cognee bleiben oder entfallen?
- **Wann nutzen:** Wenn geklärt werden muss, über welchen Eingang Dienste auf das Wissen zugreifen.
- **Nicht nutzen für:** Neue Anbindungen, bis die Rolle geklärt ist.
- **Abhängigkeiten:** `lightrag`, `agentmemory`, `cognee-server`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| `gateway.env` | Umgebungsdatei mit Zugangsdaten (Inhalt nicht gelesen) | `/opt/ai-stack/kb-gateway/gateway.env` auf srv1941843 | nicht belegt | nicht belegt | nein | nein | – |

### Graphify (Wissensgraph des Codes) · `graphify`

- **Tags:** `wissensgraph` `code` `graph` `einarbeitung` `wissen`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Wissensgraph je Repository: zeigt, wo etwas verwendet wird und was wovon abhängt.
- **Ort:** lokal im Repository: `tools/graph.sh`, `make graph`, Ausgabe `graphify-out/` (unversioniert)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `DECISIONS.md:137`: in diesem Repository eingerichtet, lokaler Lauf ohne Modell und ohne Konto.
- **Entscheidung:** D-018
- **Rolle im Plan:** tragend (Je Projekt ein eigener Graph; ein Cloud-Konto ist eine eigene Inhaberentscheidung.)
- **Wann nutzen:** Vor dem Einzellesen vieler Dateien und vor jeder Änderung an einem gemeinsam genutzten Baustein.
- **Nicht nutzen für:** Als Prüfung oder Gate; Graphen verschiedener Projekte werden nicht zusammengeführt.
- **Abhängigkeiten:** keine
- **Zugänge:** keine erfasst

### Mem (Notizen des Inhabers) · `mem`

- **Tags:** `notizen` `gedaechtnis` `wissen` `zweite-fundstelle` `inhaber`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Notizablage des Inhabers; dient als zweite, vom Repository unabhängige Fundstelle für Zeiger.
- **Ort:** Mem-Konto des Inhabers, über den Mem-Konnektor der Claude-Umgebung erreichbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Abruf am 14.11.2026 durch die Sitzung, die das Register der offenen Arbeiten erstellt hat (60 von 105 Notizen nach Titel gesichtet). Befund OA-014 dort: Notizen vom März 2026 zeigen Schlüssel und Token im Klartext.
- **Entscheidung:** keine
- **Rolle im Plan:** doppelt → bleibt: das Repository (DECISIONS.md, PROGRESS.md, dieses Register) als führende Quelle; Mem nur als Zeiger ohne Geheimnisse (Befund OA-014 ist ein offenes Sicherheitsrisiko: Klartext-Zugangsdaten in alten Notizen entfernen und die Schlüssel widerrufen (nur Inhaber).)
- **Wann nutzen:** Wenn eine Aussage des Inhabers oder ein Zeiger auch außerhalb des Repositorys auffindbar sein soll.
- **Nicht nutzen für:** Geheimniswerte, Zugangsdaten und Kundendaten; als führende Quelle für Entscheidungen.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Mem-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | Lesen und Schreiben von Notizen | nicht belegt | nein | nein | – |

### Notion · `notion`

- **Tags:** `notizen` `wissen` `dokumente` `wiki`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Dokumente und Bestandsaufnahmen der Agentur außerhalb des Repositorys.
- **Ort:** Notion-Arbeitsbereich des Inhabers, über den Notion-Konnektor erreichbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Abruf am 14.11.2026 laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository): Seite „Agentur-Wissensmanagement — Bestandsaufnahme und Betriebsstruktur“ (Abgleich 09.11.2026). Laut Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository) blieben Suchen zu Suite und Composio ohne Treffer.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Welche Rolle hat Notion neben dem Repository und Mem: weiter pflegen, nur lesen oder auslaufen lassen?
- **Wann nutzen:** Wenn ein älterer Befund oder eine Bestandsaufnahme gesucht wird, die nicht im Repository steht.
- **Nicht nutzen für:** Führende Entscheidungen, Stände und Zugänge; Geheimniswerte.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Notion-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | nicht belegt | nicht belegt | nein | nein | – |

### LibreChat · `librechat`

- **Tags:** `arbeitsplatz` `oberflaeche` `chat` `server`
- **Kategorie:** Arbeitsplatz-Oberfläche
- **Zweck:** Chat-Oberfläche mit Anbindung an die Gedächtnis-Systeme.
- **Ort:** srv1941843, Compose-Projekt `librechat`, Konfiguration `/opt/nexifyai/librechat/librechat.yaml`
- **Zustand:** defekt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:171`: vier Nebendienste laufen, kein Hauptcontainer in der Liste; laut Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository) antwortet die Oberfläche mit 530.
- **Entscheidung:** keine
- **Rolle im Plan:** doppelt → bleibt: Hermes WebUI für den Inhaber und `apps/web` für Kunden (Vorschlag der Standortbestimmung; Abschalten nur nach Freigabe des Inhabers)
- **Wann nutzen:** Nur, wenn alte Unterhaltungen oder die dortige Anbindung der Gedächtnis-Systeme nachgesehen werden müssen.
- **Nicht nutzen für:** Neue Arbeit; die Oberfläche antwortet nicht.
- **Abhängigkeiten:** `hostinger-srv1941843`, `lightrag`, `agentmemory`, `cognee-server`
- **Zugänge:** keine erfasst

### AionUi · `aionui`

- **Tags:** `arbeitsplatz` `oberflaeche` `chat` `server` `speicherfresser`
- **Kategorie:** Arbeitsplatz-Oberfläche
- **Zweck:** Arbeitsoberfläche für Agenten; ursprünglicher Wunsch vom 14.10.2026.
- **Ort:** srv1941843, Container `aionui` außerhalb der Compose-Projekte, Daten unter `/opt/aionui-data`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:46`: Container läuft, rund 25 GiB; Zweck unklar.
- **Entscheidung:** keine
- **Rolle im Plan:** doppelt → bleibt: Hermes WebUI für den Inhaber und `apps/web` für Kunden (Vorschlag der Standortbestimmung; Abschalten nur nach Freigabe des Inhabers) (Mit rund 25 GiB einer der größten Stilllege-Kandidaten.)
- **Wann nutzen:** Nur zur Sichtung vorhandener Daten vor einer Stilllegung.
- **Nicht nutzen für:** Neue Arbeit.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### Dify · `dify`

- **Tags:** `arbeitsplatz` `oberflaeche` `agenten-baukasten` `server`
- **Kategorie:** Arbeitsplatz-Oberfläche
- **Zweck:** Baukasten für Agenten und Abläufe, gedacht für agenten.nexifyai.cloud.
- **Ort:** srv1941843, Compose-Projekt `dify-dqiq` ohne Container
- **Zustand:** stillgelegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:184`: nur die Compose-Datei und 0,4 GiB Sicherung, kein Container.
- **Entscheidung:** keine
- **Rolle im Plan:** doppelt → bleibt: Hermes WebUI für den Inhaber und `apps/web` für Kunden (Vorschlag der Standortbestimmung; Abschalten nur nach Freigabe des Inhabers) (Compose-Datei archivieren, dann Projekt-Eintrag entfernen (nur Inhaber).)
- **Wann nutzen:** Nicht nutzen; nur als Fundstelle der dokumentierten Korrekturen in der Compose-Datei.
- **Nicht nutzen für:** Neue Arbeit.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### LobeHub · `lobehub`

- **Tags:** `arbeitsplatz` `oberflaeche` `chat` `abo`
- **Kategorie:** Arbeitsplatz-Oberfläche
- **Zweck:** Gehostete Chat-Oberfläche im Abonnement.
- **Ort:** LobeHub-Konto des Inhabers (Abo „Ultimate“)
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository): das Abo verlängert sich am 19.11.2026. Nutzung nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** doppelt → bleibt: Hermes WebUI für den Inhaber und `apps/web` für Kunden (Vorschlag der Standortbestimmung; Abschalten nur nach Freigabe des Inhabers) (Vor dem 19.11.2026 entscheiden, ob das Abo verlängert wird (Kosten; nur Inhaber).)
- **Wann nutzen:** Nur, wenn der Inhaber ausdrücklich dort arbeiten will.
- **Nicht nutzen für:** Agentenarbeit mit Repository-Zugriff und Kundendaten.
- **Abhängigkeiten:** keine
- **Zugänge:** keine erfasst

### Supabase (eigene, selbst gehostete Instanz) · `supabase`

- **Tags:** `datenbank` `postgres` `rls` `datenhaltung` `mandanten`
- **Kategorie:** Datenhaltung
- **Zweck:** Zielbild für sämtliche Datenhaltung: PostgreSQL mit Row-Level-Security, auch für den Shop.
- **Ort:** eigene, selbst gehostete Instanz; Adresse im Repository nicht belegt. Migrationen unter `apps/web/supabase/migrations/`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `DECISIONS.md:105`; `PROGRESS.md:81`.
- **Entscheidung:** D-013
- **Rolle im Plan:** tragend (Adresse, Zugang und Freigabe für Migration und Umschaltung liegen beim Inhaber.)
- **Wann nutzen:** Bei jeder neuen Tabelle, jedem neuen Datenbestand und jeder Frage „wo speichern wir strukturierte Daten“.
- **Nicht nutzen für:** Große Dateien und Archive (dafür R2); Geheimnisse.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| SUPABASE_URL | Adresse (nicht geheim) | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | kein Zugriffsrecht, nur die Adresse | nicht belegt | nein | nein | – |
| SUPABASE_SERVICE_ROLE_KEY | Dienstschlüssel mit vollen Rechten | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | umgeht RLS; nur serverseitig | nicht belegt | nein | nein | – |

### MongoDB (Shop-Speicher, IST) · `mongodb`

- **Tags:** `datenbank` `shop` `mongodb` `datenhaltung` `teileklar`
- **Kategorie:** Datenhaltung
- **Zweck:** Heutiger Speicher von `apps/shop-api` (Produkte, Warenkörbe, Bestellungen, Konten).
- **Ort:** Ort der Produktionsdatenbank nicht belegt (vermutet auf srv1243952)
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `PROGRESS.md:9`: Der Shop-Dienst antwortet mit 503, `MONGODB_URI` fehlt im Projekt; auf srv1941843 wurde kein MongoDB-Container gefunden.
- **Entscheidung:** D-006, D-013
- **Rolle im Plan:** doppelt → bleibt: Supabase (D-013) (MongoDB bleibt IST, bis der Shop migriert ist; `vsk-mongodb` wird nie destruktiv angefasst (D-016).)
- **Wann nutzen:** Nur für den bestehenden Shop-Dienst, bis die Zugriffsschicht auf PostgreSQL umgestellt ist.
- **Nicht nutzen für:** Neue Datenbestände.
- **Abhängigkeiten:** `supabase`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| MONGODB_URI | Verbindungsadresse mit Zugangsdaten | Vercel-Projektvariablen des alten Projekts (als „Sensitive“ gespeichert, nicht auslesbar); im Projekt …-ut7r fehlt sie | Lesen und Schreiben der Shop-Datenbank | nicht belegt | nein | nein | – |

### Upstash · `upstash`

- **Tags:** `datenbank` `redis` `zwischenspeicher` `abo`
- **Kategorie:** Datenhaltung
- **Zweck:** Gehosteter Redis und verwandte Dienste; Nutzung im Plan nicht genannt.
- **Ort:** Upstash-Konto des Inhabers
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository): Zahlung über 82,05 USD scheitert seit dem 07.11.2026 wiederholt; kein Beleg für eine Nutzung.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wird Upstash noch gebraucht, und wofür? Falls nein: Abo kündigen (nur Inhaber).
- **Wann nutzen:** Nur nach geklärter Rolle; bis dahin nichts Neues darauf bauen.
- **Nicht nutzen für:** Neue Abhängigkeiten.
- **Abhängigkeiten:** keine
- **Zugänge:** keine erfasst

### Convex (selbst gehostet) · `convex`

- **Tags:** `datenbank` `backend` `server`
- **Kategorie:** Datenhaltung
- **Zweck:** Selbst gehostetes Convex-Backend mit Dashboard; Zweck nicht belegt.
- **Ort:** srv1941843, Compose-Projekt `convex-selfhosted`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:178`: läuft, Image `latest`.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wofür läuft Convex, und kann es stillgelegt werden?
- **Wann nutzen:** Nur nach geklärter Rolle.
- **Nicht nutzen für:** Neue Datenbestände (Zielbild ist Supabase, D-013).
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### OpenBao · `openbao`

- **Tags:** `geheimnisspeicher` `geheimnisse` `tresor` `server`
- **Kategorie:** Geheimnisspeicher
- **Zweck:** Selbst gehosteter Tresor für Geheimnisse; könnte der zentrale Geheimnisspeicher der Server werden.
- **Ort:** srv1941843, Container `nexify-openbao` außerhalb der Compose-Projekte
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:189`: Container läuft; Inhalt, Entsiegelung und Nutzer nicht geprüft.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll OpenBao der Geheimnisspeicher für die Dienste auf den Servern werden, und was liegt heute darin?
- **Wann nutzen:** Wenn gefragt wird, wo Geheimnisse der Server-Dienste künftig zentral liegen sollen.
- **Nicht nutzen für:** Als belegter Ablageort, solange Inhalt und Zugriff nicht geprüft sind.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### Composio For You · `composio-for-you`

- **Tags:** `integrationen` `apps` `mcp` `werkzeuge` `inhaber`
- **Kategorie:** Integrationen
- **Zweck:** Verbindet die eigenen Konten des Inhabers (Mail, Kalender, GitHub und weitere) mit seinem Agenten.
- **Ort:** Composio-Konto des Inhabers; in den Claude-Sitzungen per MCP in Betrieb
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository): 41 verbundene Apps laut Werkzeugbeschreibung, GitHub-Verbindung am 14.11.2026 lesend geprüft. In dieser Sitzung sind die Composio-Werkzeuge vorhanden.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Für den Inhaber selbst; nicht für Kundenkonten. Die Liste der Verbindungen auf das Nötige kürzen.)
- **Wann nutzen:** Wenn der Agent im Namen des Inhabers in einer seiner Apps lesen oder handeln soll.
- **Nicht nutzen für:** Kundenkonten und Mandanten; der Helfer `invoke_llm` der Sandbox (widerspricht der Modellregel).
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Composio-For-You-Schlüssel | API-Schlüssel | Passwortmanager des Inhabers und Verbindungsverwaltung von claude.ai | alle verbundenen Apps des Inhabers | nicht belegt | ja | ja | Stand laut `PROGRESS.md:85`: Schlüssel standen im Gespräch; Erneuerung nicht belegt (D-017). |

### Composio Platform · `composio-platform`

- **Tags:** `integrationen` `apps` `suite` `webhook` `kunde-verbindet`
- **Kategorie:** Integrationen
- **Zweck:** Lässt Kunden der Suite ihre eigenen Konten verbinden; Ereignisse kommen per Webhook in die Web-App.
- **Ort:** Composio-Projekt (Kennungen in `config/integrations/composio.json`); Webhook in `apps/web`
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `config/integrations/composio.json:4`: gebaut hinter Schalter; Freigabelisten leer, Migration `0004` nicht eingespielt. Ob der Webhook in Produktion je ein signiertes Ereignis quittiert hat, ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Für die Suite vorgesehen; hängt an Supabase und an den Entwürfen PR 118 und 123.)
- **Wann nutzen:** Wenn Kunden der Suite fremde Apps verbinden sollen.
- **Nicht nutzen für:** Die eigenen Konten des Inhabers (dafür For You); Werkzeugaufrufe, solange die Freigabeliste leer ist.
- **Abhängigkeiten:** `supabase`, `vercel`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| COMPOSIO_API_KEY, COMPOSIO_AUTH_TOKEN, COMPOSIO_WEBHOOK_SECRET | API-Schlüssel, Zugangstoken, Signaturschlüssel | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | Composio-Projekt der Suite | nicht belegt | ja | ja | Composio-Schlüssel standen laut PROGRESS.md im Gespräch; welcher der Schlüssel betroffen ist, ist nicht belegt – deshalb alle erneuern. |

### Resend · `resend`

- **Tags:** `mail` `versand` `transaktionsmail` `passwort-reset`
- **Kategorie:** Mail
- **Zweck:** Versendet Transaktionsmails: Anfragebestätigungen, interne Benachrichtigungen, Passwort-Reset.
- **Ort:** Resend-Konto; Absender `angebot@nexifyai.cloud`, Domain nexifyai.cloud verifiziert (eu-west-1)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `config/integrations/resend.json:19` (Versand mit Zustellbeleg am 29.10.2026). Laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository) am 14.11.2026: 50.000 Mails Kontingent, 0 verbraucht; nexifyai.de als Absenderdomain „failed“.
- **Entscheidung:** D-007
- **Rolle im Plan:** tragend (Im selben Konto liegen Domains eines Kundenprojekts; der Absender ist auf nexifyai.cloud begrenzt.)
- **Wann nutzen:** Wenn die Anwendung eine Mail an Kunden oder an die interne Adresse senden soll.
- **Nicht nutzen für:** Kaltansprache und gekaufte Listen (rechtlich und laut Anbieter unzulässig); Absender fremder Domains.
- **Abhängigkeiten:** `vercel`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| RESEND_API_KEY | API-Schlüssel | Vercel-Projektvariablen (Projekt …-ut7r, Team nexify-projekte) | Versand; Begrenzung auf eine Domain nicht belegt | nicht belegt | nein | nein | – |
| Resend-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | Kontoverwaltung einschließlich Schlüsselerstellung | nicht belegt | nein | nein | – |

### Revolut Merchant API · `revolut`

- **Tags:** `zahlung` `kasse` `shop` `webhook`
- **Kategorie:** Zahlung
- **Zweck:** Zahlungsabwicklung für Shop und Prepaid-Guthaben.
- **Ort:** Revolut-Händlerkonto; `REVOLUT_MODE=live` in der Vorschau
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `DECISIONS.md:33`: live in der Vorschau ohne Fake-Zahlung; der Shop-Dienst antwortet in Produktion mit 503, eine echte Zahlung ist nicht belegt.
- **Entscheidung:** D-008
- **Rolle im Plan:** tragend (Livegang der Kasse nur über das Freigabe-Gate; keine Zahlung durch Agenten (D-017).)
- **Wann nutzen:** Wenn eine Zahlung, ein Zahlungs-Webhook oder der Status einer Buchung umgesetzt oder geprüft wird.
- **Nicht nutzen für:** Zahlungen auslösen oder Preise ändern ohne Freigabe; Tests mit echten Zahlungen.
- **Abhängigkeiten:** `vercel`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| REVOLUT_MERCHANT_SECRET_KEY und Webhook-Signaturschlüssel | Händlerschlüssel und Signaturschlüssel | Vercel-Projektvariablen (im Projekt …-ut7r nicht belegt) | Zahlungen des Händlerkontos | nicht belegt | nein | nein | – |

### BigBuy · `bigbuy`

- **Tags:** `sortiment` `grosshandel` `shop` `teileklar` `import`
- **Kategorie:** Sortiment
- **Zweck:** Großhandelsquelle für das Sortiment von TEILEKLAR.
- **Ort:** BigBuy-API
- **Zustand:** defekt (Stand 2026-11-14). Beleg: `DECISIONS.md:33`: Import blockiert (laut Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository) Antwort 401).
- **Entscheidung:** D-008
- **Rolle im Plan:** tragend (Nötig für TEILEKLAR, aber blockiert, bis ein gültiger Schlüssel vorliegt.)
- **Wann nutzen:** Wenn Produkte, Bestände oder Preise für TEILEKLAR importiert werden sollen.
- **Nicht nutzen für:** Preisangaben ohne `config/fakten.json`; Import ohne gültigen Zugang.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| BigBuy-API-Schlüssel | API-Schlüssel | Passwortmanager des Inhabers; Zielablage Vercel-Projektvariablen | Katalog und Bestellungen | nicht belegt | ja | ja | Stand im Gespräch (`PROGRESS.md:85`); Erneuerung nicht belegt. |

### HubSpot · `hubspot`

- **Tags:** `crm` `vertrieb` `kontakte` `leads`
- **Kategorie:** CRM
- **Zweck:** CRM für Kontakte, Firmen und Geschäfte.
- **Ort:** HubSpot-Konto, über Composio und den HubSpot-Konnektor verbunden
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Abruf am 14.11.2026 laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository) (nur Zählung): 2 Beispielkontakte, 1 Beispielfirma, 0 Geschäfte. In keinem führenden Dokument genannt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll HubSpot das CRM der Agentur werden, oder liegen Leads künftig in der eigenen Supabase-Instanz?
- **Wann nutzen:** Wenn gefragt wird, wo Leads und Kundenkontakte geführt werden.
- **Nicht nutzen für:** Kontaktdaten ohne Rechtsgrundlage; Werbeversand ohne Einwilligung.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| HubSpot-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | nicht belegt | nicht belegt | nein | nein | – |

### Sentry · `sentry`

- **Tags:** `fehler` `ueberwachung` `monitoring` `web`
- **Kategorie:** Überwachung
- **Zweck:** Sammelt Fehler aus Browser und Server der Web-Anwendungen.
- **Ort:** Sentry-Konto, über den Sentry-Konnektor erreichbar
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository): Wochenbericht vom 14.11.2026 mit 3.900 Fehlerereignissen. In `GO-LIVE.md` als optional geführt; von dieser Sitzung nicht abgerufen.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Die 3.900 Ereignisse sind nicht ausgewertet.)
- **Wann nutzen:** Wenn ein Fehler in Produktion untersucht oder eine Auslieferung nachbeobachtet wird.
- **Nicht nutzen für:** Als Abnahme: keine Fehlermeldung ist kein Funktionsnachweis.
- **Abhängigkeiten:** `vercel`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Sentry-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | nicht belegt | nicht belegt | nein | nein | – |

### PostHog · `posthog`

- **Tags:** `analyse` `nutzung` `web` `monitoring`
- **Kategorie:** Überwachung
- **Zweck:** Produktanalyse der Web-Anwendungen.
- **Ort:** PostHog-Projekt; Paket `posthog-js` in beiden Apps
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `GO-LIVE.md:77`: als optional geführt; ob Ereignisse ankommen, ist nicht geprüft.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wird PostHog genutzt und ausgewertet, und ist die Einwilligung der Besucher dafür geregelt?
- **Wann nutzen:** Wenn Nutzungszahlen der Website gebraucht werden.
- **Nicht nutzen für:** Zahlen ohne geprüfte Einwilligung und ohne Messung als Beleg ausgeben.
- **Abhängigkeiten:** `vercel`
- **Zugänge:** keine erfasst

### Prometheus, Grafana, Alertmanager (`monitoring-dus`) · `monitoring`

- **Tags:** `ueberwachung` `monitoring` `metriken` `alarm` `server`
- **Kategorie:** Überwachung
- **Zweck:** Überwacht die Dienste auf dem Server und alarmiert.
- **Ort:** srv1941843, Compose-Projekt `monitoring-dus`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:176`. Der Ausfall von Cognee blieb rund zwei Wochen unbemerkt; die Überwachung prüft dort nur den MCP.
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Überwachung um eine Prüfung der Cognee-API ergänzen (Aufräumplan Schritt 3.4).)
- **Wann nutzen:** Wenn ein Dienst auf dem Server überwacht oder ein Ausfall nachvollzogen werden soll.
- **Nicht nutzen für:** Als Abrechnungsgrundlage; Monitoring ist kein Ledger (`AGENTS.md`).
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### GitHub · `github`

- **Tags:** `code` `repository` `quellverwaltung` `pull-requests`
- **Kategorie:** Code
- **Zweck:** Kanonische Quelle des Codes; `main` ist führend.
- **Ort:** Repository `nexify-ai-finales-agentur-gesamtprojekt-09-2026-0c70a665`; `AGENTS.md` und `config/automation.json` nennen den Besitzer `nexifyai-dev`, der Abruf dieser Sitzung lief über die Organisation `nexify-ai-agentur-gesamtprojekt-09-2026` (welcher Name aktuell gilt, ist nicht geprüft)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `AGENTS.md:213`; Abruf und Push dieser Sitzung am 14.11.2026.
- **Entscheidung:** keine (Nutzerbestimmung vom 26.10.2026 in AGENTS.md)
- **Rolle im Plan:** tragend
- **Wann nutzen:** Bei jeder Änderung an Code, Konfiguration oder Dokumenten: eigener Zweig, Entwurfs-PR.
- **Nicht nutzen für:** Kundendaten und Geheimnisse; direkte Pushes auf `main`.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| GitHub-Verbindung der Claude-Umgebung | App-Verbindung | Verbindungsverwaltung von claude.ai | Lesen und Pushen in freigegebene Repositories | nicht belegt | nein | nein | – |
| Zwei ältere GitHub-Tokens | persönliche Zugangstoken | stehen laut Befund im Klartext in Mem-Notizen vom März 2026 | nicht belegt | März 2026 oder früher | ja | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: beim Anbieter widerrufen und die Notizen bereinigen (nur Inhaber). Die Werte wurden für dieses Register nicht gelesen. |

### GitHub Actions · `github-actions`

- **Tags:** `ci` `automatisierung` `pruefung` `code`
- **Kategorie:** Code
- **Zweck:** Führt Prüfungen und das KI-Review bei Push und Pull Request aus.
- **Ort:** GitHub-Konto `nexifyai-dev`, Workflows unter `.github/workflows/`
- **Zustand:** defekt (Stand 2026-11-14). Beleg: `PROGRESS.md:83` (zuletzt belegt am 13.11.2026).
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Solange Actions nicht startet, sind die lokal ausgeführten Gates der einzige Nachweis.)
- **Wann nutzen:** Wenn eine Prüfung automatisch bei jedem Push laufen soll.
- **Nicht nutzen für:** Als Nachweis, solange keine Jobs starten.
- **Abhängigkeiten:** `github`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Actions-Secrets des Repositorys | Sammlung von Geheimnissen (darunter OPENROUTER_API_KEY) | GitHub-Actions-Secrets | nur innerhalb der Workflows | nicht belegt | nein | nein | – |

### GitLab (selbst gehostet, mit Runner) · `gitlab`

- **Tags:** `code` `ci` `spiegel` `server` `speicherfresser`
- **Kategorie:** Code
- **Zweck:** Nachgelagerte CI und Spiegelung des GitHub-Repositorys.
- **Ort:** srv1941843, Compose-Projekt `gitlab`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:175`: läuft, 34 GiB (davon 20,6 GiB Prometheus-Messdaten).
- **Entscheidung:** keine (AGENTS.md: nachgelagerte Spiegelung, keine zweite Schreibquelle)
- **Rolle im Plan:** unklar → Frage: Wird die GitLab-Spiegelung noch gebraucht? Falls ja: Prometheus-Aufbewahrung begrenzen; falls nein: archivieren und stilllegen.
- **Wann nutzen:** Nur, wenn eine CI-Ausführung auf eigener Hardware gebraucht wird.
- **Nicht nutzen für:** Als zweite Schreibquelle für Code.
- **Abhängigkeiten:** `hostinger-srv1941843`, `github`
- **Zugänge:** keine erfasst

### n8n · `n8n`

- **Tags:** `automatisierung` `workflows` `integrationen`
- **Kategorie:** Automatisierung
- **Zweck:** Workflow-Automatisierung; in keinem führenden Dokument genannt.
- **Ort:** nicht belegt (weder Adresse noch Server)
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Standortbestimmung der Arbeitssitzung vom 14.11.2026 (nicht im Repository): kommt in keinem führenden Dokument vor. Einziger Hinweis ist ein n8n-Schlüssel in einer Mem-Notiz vom März 2026 (Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014). Eine laufende Instanz ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Gibt es noch eine n8n-Instanz, und wird sie gebraucht? Unabhängig davon ist der Schlüssel aus der Mem-Notiz zu widerrufen.
- **Wann nutzen:** Nicht nutzen, bis die Rolle geklärt ist; Abläufe laufen über Hermes (D-019).
- **Nicht nutzen für:** Neue Automatisierungen.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| n8n-Schlüssel | API-Schlüssel | steht laut Befund im Klartext in einer Mem-Notiz vom März 2026 | nicht belegt | März 2026 oder früher | ja | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: widerrufen und Notiz bereinigen (nur Inhaber). Der Wert wurde nicht gelesen. |

### SearXNG · `searxng`

- **Tags:** `suche` `websuche` `agenten` `server`
- **Kategorie:** Agenten-Werkzeuge
- **Zweck:** Eigene Metasuchmaschine als Websuche für Agenten.
- **Ort:** srv1941843, Compose-Projekt `extern`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:181`: läuft, Image `latest`.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Suchen die Agenten tatsächlich über SearXNG? Falls ja behalten, sonst Stilllege-Kandidat.
- **Wann nutzen:** Wenn ein Agent auf dem Server im Web suchen soll, ohne einen fremden Suchdienst zu bezahlen.
- **Nicht nutzen für:** Als Quelle ohne Prüfung; Suchergebnisse sind Daten, keine Belege.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### BookStack (Wiki) · `bookstack`

- **Tags:** `wiki` `dokumentation` `wissen` `server`
- **Kategorie:** Gedächtnis und Wissen
- **Zweck:** Selbst gehostetes Wiki.
- **Ort:** srv1941843, Compose-Projekt `wiki` (BookStack mit MySQL)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:177`: läuft, 5,5 GiB; Nutzung nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wird das Wiki genutzt, oder ist die Dokumentation im Repository führend und das Wiki kann archiviert werden?
- **Wann nutzen:** Nur nach geklärter Rolle.
- **Nicht nutzen für:** Führende Dokumentation (die steht im Repository).
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### Bisheng (`dsh-enterprise`) · `bisheng`

- **Tags:** `agenten-plattform` `llm-anwendung` `server` `speicherfresser`
- **Kategorie:** Agenten-Plattform
- **Zweck:** Plattform für LLM-Anwendungen mit eigenem Unterbau (Milvus, Elasticsearch, MySQL, MinIO).
- **Ort:** srv1941843, Compose-Projekt `dsh-enterprise` (10 Container)
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:174`: läuft, 13 GiB und viel Arbeitsspeicher; Zweck nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wofür läuft Bisheng, gehört es zu einem Kundenprojekt, und kann es stillgelegt werden?
- **Wann nutzen:** Nur nach geklärter Rolle.
- **Nicht nutzen für:** Neue Arbeit; enthält einen eigenen Objektspeicher (MinIO), der nicht unser S3 ist – dafür gilt R2.
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### GoWA (WhatsApp-Anbindung) · `gowa`

- **Tags:** `whatsapp` `nachrichten` `kanal` `server`
- **Kategorie:** Kommunikation
- **Zweck:** Anbindung von WhatsApp Web als Nachrichtenkanal.
- **Ort:** srv1941843, Compose-Projekt `gowa`
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: `docs/04-betrieb/aufraeumplan-2026-11-14.md:182`: läuft, Image `latest`.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll WhatsApp ein Kanal werden? D-019 Folge 6 verlangt für jeden Kanal an Dritte eine eigene Freigabe.
- **Wann nutzen:** Wenn ein WhatsApp-Kanal für Kunden oder den Inhaber eingerichtet werden soll – erst nach Freigabe.
- **Nicht nutzen für:** Nachrichten an Dritte ohne Freigabe (Hartsperre).
- **Abhängigkeiten:** `hostinger-srv1941843`
- **Zugänge:** keine erfasst

### Clerk · `clerk`

- **Tags:** `anmeldung` `konten` `historie` `auth`
- **Kategorie:** Anmeldung
- **Zweck:** Früherer Anmeldedienst; durch eigene Konten ersetzt.
- **Ort:** Clerk-Konto; Reste in `apps/web` als Referenz und in `config/integrations/clerk-mcp.json`
- **Zustand:** nicht verfolgt (Stand 2026-11-14). Beleg: `DECISIONS.md:28`.
- **Entscheidung:** D-007
- **Rolle im Plan:** doppelt → bleibt: eigene Konten (D-007)
- **Wann nutzen:** Nicht nutzen; nur zum Verständnis der älteren Referenz in `apps/web`.
- **Nicht nutzen für:** Neue Anmeldewege.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Clerk-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | Verwaltung der Clerk-Anwendungen | nicht belegt | nein | nein | Verbindung kann getrennt werden, da Clerk nicht verfolgt wird. |

### Emergent (Google-Anmeldung) · `emergent`

- **Tags:** `anmeldung` `google` `auth` `konten`
- **Kategorie:** Anmeldung
- **Zweck:** Stellt „Mit Google anmelden“ für die eigenen Konten bereit.
- **Ort:** Emergent-verwaltete Google-Anmeldung
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: `DECISIONS.md:28`; ein Funktionsnachweis in Produktion liegt nicht vor.
- **Entscheidung:** D-007
- **Rolle im Plan:** unklar → Frage: Bleibt die Google-Anmeldung über Emergent, oder wird sie mit dem Umzug der Konten auf Supabase (D-013) ersetzt?
- **Wann nutzen:** Wenn die Google-Anmeldung der eigenen Konten betroffen ist.
- **Nicht nutzen für:** Als Ablage von Kontodaten.
- **Abhängigkeiten:** keine
- **Zugänge:** keine erfasst

### Linear · `linear`

- **Tags:** `aufgaben` `tickets` `planung`
- **Kategorie:** Aufgabenverwaltung
- **Zweck:** Ticketsystem, Team „Nexifyai“.
- **Ort:** Linear-Arbeitsbereich, über den Linear-Konnektor erreichbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Abruf am 14.11.2026 laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository) (erste 50 Tickets). Dort führt NEX-71 einen alten Anthropic-Schlüssel als weiterhin aktiv.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll Linear weiter gepflegt werden? Führend sind `PROGRESS.md` und das Register in `config/acceptance-coverage.json`; `AGENTS.md` verbietet eine zweite Aufgabenverwaltung.
- **Wann nutzen:** Wenn ein älteres Ticket nachgesehen werden muss.
- **Nicht nutzen für:** Als führendes Aufgabenregister.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Linear-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | nicht belegt | nicht belegt | nein | nein | – |
| Alter Anthropic-API-Schlüssel (Ticket NEX-71) | API-Schlüssel | Ort des Werts nicht belegt; das Ticket führt ihn als weiterhin aktiv | nicht belegt | vor dem 05.09.2026 | nein | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: beim Anbieter widerrufen und Ticket mit Beleg schließen (nur Inhaber). |

### Slack · `slack`

- **Tags:** `nachrichten` `kanal` `team` `benachrichtigung`
- **Kategorie:** Kommunikation
- **Zweck:** Nachrichtenkanal; der Regelkreis mit ORACLE darüber ist pausiert.
- **Ort:** Slack-Arbeitsbereich, über den Slack-Konnektor erreichbar
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository): der Slack-Regelkreis mit ORACLE ist pausiert; Slack wurde dort nicht ausgewertet. In dieser Sitzung nicht abgerufen.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Soll Slack der Kanal für Meldungen der Agenten an den Inhaber werden? Hermes hat derzeit keinen aktiven Kanal.
- **Wann nutzen:** Wenn Agenten den Inhaber benachrichtigen sollen und ein Kanal gesucht wird.
- **Nicht nutzen für:** Nachrichten an Dritte ohne Freigabe; Geheimnisse in Nachrichten.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Slack-Konnektor der Claude-Umgebung | OAuth-Verbindung (MCP) | Verbindungsverwaltung von claude.ai | nicht belegt | nicht belegt | nein | nein | – |
| Slack-Webhook-Adresse | eingehender Webhook | steht laut Befund offen im Steuerungswiki in Mem | Schreiben in einen Kanal | nicht belegt | ja | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: Webhook widerrufen und neu anlegen (nur Inhaber). Die Adresse wurde nicht gelesen. |

### Google Workspace (Gmail, Kalender, Drive) · `google-workspace`

- **Tags:** `mail` `kalender` `dateien` `postfach` `inhaber`
- **Kategorie:** Mail
- **Zweck:** Postfach, Kalender und Dateien des Inhabers.
- **Ort:** Google-Konto des Inhabers, über die Gmail-, Kalender- und Drive-Konnektoren erreichbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Gmail-Abruf am 14.11.2026 laut Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository) (Betreffzeilen und Vorschau). Ob die Adresse `mail@nexifyai.cloud` bei Google oder bei Hostinger liegt, ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Welches Postfach ist führend für Kundenkorrespondenz: Google Workspace oder das Hostinger-Postfach?
- **Wann nutzen:** Wenn eine Mail des Inhabers gesucht, ein Termin geprüft oder eine Datei aus Drive gebraucht wird.
- **Nicht nutzen für:** Versand im Namen des Inhabers ohne seine Bestätigung; Werbeversand.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Gmail-, Kalender- und Drive-Konnektoren der Claude-Umgebung | OAuth-Verbindungen (MCP) | Verbindungsverwaltung von claude.ai | Lesen; Senden und Ändern je nach Konnektor | nicht belegt | nein | nein | Der Drive-Konnektor verlangt in dieser Sitzung eine erneute Anmeldung. |

### Postiz · `postiz`

- **Tags:** `social-media` `planung` `marketing`
- **Kategorie:** Marketing
- **Zweck:** Planung und Veröffentlichung von Beiträgen in sozialen Netzen; Nutzung nicht belegt.
- **Ort:** nicht belegt
- **Zustand:** läuft unbelegt (Stand 2026-11-14). Beleg: Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: in Mem steht eine Notiz „Postiz API & MCP Credentials“ vom März 2026 mit Zugangsdaten im Klartext. Eine laufende Nutzung ist nicht belegt.
- **Entscheidung:** keine
- **Rolle im Plan:** unklar → Frage: Wird Postiz genutzt? Unabhängig davon sind die Zugangsdaten aus der Mem-Notiz zu widerrufen.
- **Wann nutzen:** Nur nach geklärter Rolle.
- **Nicht nutzen für:** Veröffentlichungen ohne Freigabe.
- **Abhängigkeiten:** keine

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Postiz-API- und MCP-Zugangsdaten | API-Schlüssel | stehen laut Befund im Klartext in einer Mem-Notiz vom März 2026 | nicht belegt | März 2026 oder früher | ja | ja | Register der offenen Arbeiten vom 14.11.2026 (Arbeitsstand, nicht im Repository), OA-014: widerrufen und Notiz bereinigen (nur Inhaber). Die Werte wurden nicht gelesen. |

### Claude-Code-Umgebung (Cloud-Sitzungen) · `claude-umgebung`

- **Tags:** `agenten` `arbeitsumgebung` `geheimnisspeicher` `netzwerk-geheimnisse` `plugins`
- **Kategorie:** Arbeitsumgebung
- **Zweck:** Arbeitsumgebung der Cloud-Sitzungen mit Netzwerk-Geheimnissen je Host und den verbundenen Konnektoren.
- **Ort:** claude.ai, Umgebung der Sitzungen; Geheimnisse werden vom Netz-Proxy je Host eingesetzt und sind für die Sitzung nicht lesbar
- **Zustand:** läuft belegt (Stand 2026-11-14). Beleg: Diese Sitzung am 14.11.2026. Bestand der Plugins: `docs/04-betrieb/aufraeumplan-2026-11-14.md:197` (393 Plugins, zwölf Gedächtnis-Plugins, Hooks kürzen Werkzeug-Ausgaben).
- **Entscheidung:** keine
- **Rolle im Plan:** tragend (Plugins auf rund 45 kürzen (nur Inhaber); Hooks, die Ausgaben kürzen, sind ein Risiko für Belege.)
- **Wann nutzen:** Wenn ein Agent einen Schlüssel für einen Dienst braucht: der Inhaber hinterlegt ihn hier über das sichere Formular, nie im Chat.
- **Nicht nutzen für:** Geheimnisse, die im Container selbst gebraucht werden (Datenbank-Passwörter, SSH-Schlüssel): die deckt der Proxy nicht ab.
- **Abhängigkeiten:** `cloudflare-konto`, `hostinger-srv1941843`

| Zugang (Bezeichnung) | Art | Ablageort des Werts | Rechteumfang | erstellt | offengelegt | Erneuerung fällig | Hinweis |
|---|---|---|---|---|---|---|---|
| Netzwerk-Geheimnis für api.cloudflare.com | API-Token | Netzwerk-Geheimnisse der Claude-Umgebung | nicht belegt | 2026-11-14 | ja | ja | siehe cloudflare-konto |
| Netzwerk-Geheimnis für developers.hostinger.com | API-Schlüssel | Netzwerk-Geheimnisse der Claude-Umgebung | Hostinger-Konto | nicht belegt | nein | nein | – |
