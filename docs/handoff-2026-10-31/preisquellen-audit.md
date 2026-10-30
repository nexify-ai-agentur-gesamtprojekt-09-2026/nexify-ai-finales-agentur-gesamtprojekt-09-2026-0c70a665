# Handoff 2026-10-31 — Preisquellen-Audit & Live-KI-Nachweisbedarf

Stand: 2026-10-31. Autor: Fortsetzungs-Agent (Emergent, einziger Writer, lokal im Preview).
Zweck: getrennte Dokumentation von (A) freigegebenen Preis-/Leistungsquellen und (B) dem
konkreten Nachweisbedarf für echten KI-Livebetrieb. Keine Secretwerte. Kein Publish/Deploy.

Dies ist ein Nachweis-/Statusdokument, **kein** neues Auftragsregister und **kein** Beleg
bereits abgeschlossener Umsetzung.

---

## A. Preis-/Leistungsquellen — Freigabestatus (für bearbeitbare Angebotsentwürfe)

Ergebnis: **Es existiert kein freigegebener Agentur-Preiskatalog.** Angebotsentwürfe bleiben
daher **preisfrei** (Umfang, Annahmen, Referenz; „Preise zur Freigabe"), bis Pascal Preise
freigibt. Keine erfundenen Preise (AGENTS.md / `source-boundaries`).

| Quelle | Inhalt | Version / `gueltigAb` | Freigabestatus |
| --- | --- | --- | --- |
| `config/api-prepaid.json` | Prepaid-/Token-Aufschlagstabelle (API-Verbrauch), E1-Formel | `version: 2026-09-28-entwurf`, `gueltigAb: null` | **Entwurf** — EK-Werte `null`/`ungeprueft:true`; „Preise, Formel (E1) und Grenzen legt nur Pascal fest (R-09)" |
| `docs/architecture/service-content-source.md` | Fachliche Leistungsinhalte für `services/websites/automation/apps-portals/scope/solutions/pricing` | 2026-10-26 | Inhalt freigegeben, aber **ausdrücklich ohne Preise**: „keine historischen Tagessätze, Paketpreise, Mindestaufladungen, Aufschläge, Rabatte" |
| `config/page-explainers.json` (`pricing/*`) | Pricing-Seitentexte | — | **Preisfrei**: trennt Aufbau/Betrieb/Modellkosten, „ohne historische Tarife erneut zu veröffentlichen" |
| `config/selfservice-policy.json` | Suite-Testregeln (BYOK / 5-EUR-Testaufladung) | — | Nur **Suite-Testguthaben** („5 EUR / 500 Cent"), explizit „erst bei Verfügbarkeit freigegeben" — **kein** Agenturprojektpreis |

Fazit: Deterministische Preis­kalkulation ist derzeit **nicht** möglich ohne erfundene Zahlen.
Angebotsentwürfe werden strukturiert (Vorhaben/Umfang/Annahmen/Referenz), versioniert und klar
als unverbindlicher Entwurf gekennzeichnet.

---

## B. Nachweisbedarf für echten KI-Livebetrieb (ohne Secretwerte)

### Exakter Preview-Backendservice (Ist-Stand)
- Preview served ausschließlich den **statischen `apps/site` (Vite)**-Build über
  `frontend/preview-server.mjs`; `/api/*` wird über den lokalen Adapter `backend/server.py`
  an das Repo-Gateway `apps/agent-gateway/server.py` (Loopback `:3003`) weitergereicht.
- Die **Next.js-App `apps/web`** (die die echte `/api/agent-chat`-Route + `PublicOrientationChat`
  enthält) läuft **nicht** im Preview: Supervisor-Service `nexify-next-review` = **STOPPED**.
- Folge: Der echte Live-KI-Pfad ist in dieser Preview **physisch nicht erreichbar**; er lebt in
  der Next.js-/Vercel-Laufzeit.

### Benötigte Variablen (nur Namen, Bindungsstatus)
| Zweck | Variablenname(n) | Gesetzt im Secret-Store? |
| --- | --- | --- |
| Managed 9router (Pascal-Priorität) | `NINEROUTER_URL`, `ROUTER_KEY` (bzw. `ROUTER_URL` in `config/llm-verbindungen.json`) | **NEIN** |
| Live-Aktivierungsflag (neu, serverseitig) | `NEXIFY_LIVE_CHAT` (muss exakt `enabled` sein) | **NEIN** (gewollt) |
| Direkt-OpenRouter (alte Datei; durch Pascal depriorisiert) | `OPENROUTER_API_KEY` | **NEIN** |
| Vercel AI Gateway (OIDC-Probe) | `AI_GATEWAY_API_KEY`, `NEXIFY_AI_GATEWAY_CREDITS_PROBE` | **NEIN** |
| Portal-Auth / Tenant | `CLERK_SECRET_KEY` | **NEIN** (nur `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` gesetzt) |
| **Kein Fallback erlaubt** | `OPENAI_API_KEY`, `EMERGENT_LLM_KEY` | gesetzt, aber **nur** Python-Gateway ChatGPT-Testoption — **nicht** als Live-Route verwenden |

### Ziel-Secret-Speicher (wohin eine fehlende Verbindung gehört)
- Serverseitiger, vertrauenswürdiger Hosting-Secret-Store laut `config/ai-migration-policy.json`
  (`known_owned_execution_environments`): **Vercel-Agency-Projekt-Env** oder
  **Hostinger-Agency-VPS-Env**. Niemals `NEXT_PUBLIC_`, niemals im Browserbundle/Log.
- Zusätzlich erforderlich: **autorisierte Kostenfreigabe/Budgetgrenze** (`config/llm-policy.json`
  → `cost_and_access`: „Modellkonfiguration erteilt keine Ausgabenfreigabe").

### Aktueller Vorbereitungsstand (dieser Auftrag)
- Neues, **fail-closed** Modul `packages/agent-runtime/managed-live-chat.ts` verdrahtet den echten,
  policy-gepinnten Router-Adapter (`model-agent.ts`, DeepSeek `deepseek/deepseek-v4.1-flash-1017`,
  reasoning `high`, strict) wieder — **ohne** Bypass, **ohne** OPENAI/EMERGENT-Fallback.
- `api/agent-chat.ts` ruft `managedLiveChatGate(...)`: solange `NEXIFY_LIVE_CHAT`/9router-Config
  fehlen, bleibt das Verhalten **byte-identisch** zur deterministischen Orientierung.
- **Offener, freigabepflichtiger Punkt:** Der geprüfte Adapter ist fest an den OpenRouter-Endpunkt
  gepinnt. Das Routing über den **9router** ist eine **separat autorisierte** Adapter-Bindung; bis zu
  Pascals konkreter Instanz-/Budget-/Secretfreigabe bleibt der Pfad fail-closed
  (`managed_live_chat_router_binding_pending`).
