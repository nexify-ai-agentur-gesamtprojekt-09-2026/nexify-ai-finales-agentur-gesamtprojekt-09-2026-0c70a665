# Dienste- und Verbindungsverzeichnis

> Automatisch erzeugt am 2026-09-29 aus `config/`. Nicht von Hand ändern – Quelle ändern.

| Dienst | Schicht | Rolle | Prüfung | Status | Soll | Belegt am |
|---|---|---|---|---|---|---|
| traefik | Netz | Eingangs-Proxy, TLS, Routing je Subdomain | GET /ping | unbelegt | vorhanden | – |
| cloudflare | Netz | DNS, WAF, Cache, Zero Trust für Admin-Flächen | API /zones | unbelegt | vorhanden | – |
| supabase | Daten | Postgres, Auth, RLS, Storage, Realtime – Quelle der Wahrheit für CRM, Aufträge, Journal | GET /rest/v1/ (anon) | unbelegt | vorhanden | – |
| 9router | KI | einzige Tür zu Modellen, Stufen 0–2, Rückfall | GET /health | unbelegt | vorhanden | – |
| headroom | KI | Kontext-Verdichtung vor dem Modellaufruf (spart Tokens) | GET /health | prüfen | – | – |
| lightrag | Wissen | Wissensgraph + Vektorsuche über Dokumente, Antworten mit Fundstellen | GET /health | unbelegt | vorhanden | – |
| cognee | Wissen | Gedächtnis aus Chats/Mails zu Wissensgraph verdichten (Personen, Fälle, Entscheidungen) | GET /health | prüfen | – | – |
| agentmemory | Wissen | Arbeitsgedächtnis der Agenten (Beobachtungen, Lessons Learned) | MCP search | unbelegt | vorhanden | – |
| dify | Automatik | Workflow-Editor für einfache, sichtbare Automationen (nur über Gateway-Hooks) | GET /health | prüfen | – | – |
| composio | Automatik | Werkzeug-Anbindungen zu Drittdiensten (Kalender, Drive …) für Agenten, nur freigegebene Aktionen | GET /api/v1/apps | prüfen | – | – |
| resend | Kommunikation | Versand ausgehender Mails, Webhooks für Zustellung | GET /domains | unbelegt | vorhanden | – |
| revolut | Zahlung | Zahlungen: API-Aufladung (Revolut Pay, Karte), Webhooks für Order-Status | Sandbox: POST /api/orders | unbelegt | vorhanden | – |
| posteingang | Kommunikation | Eingang mail@nexifyai.cloud (IMAP/Weiterleitung) → lib/posteingang.js | letzter Abruf < 5 min | neu | – | – |
| librechat | Oberfläche | Vorbild der WebUI; kein eigener Betrieb, Muster übernommen | – | Referenz | – | – |
| myadmin-shell | Oberfläche | Admin-Oberfläche (myADMIN.dc.html) | – | unbelegt | vorhanden | – |
| monitoring | Betrieb | Uptime, Metriken, Alarme (Wächter + zweite Ebene) | Heartbeat | unbelegt | vorhanden | – |
| gitlab | Betrieb | Code, CI, Merge Requests, Doku-Pipeline | GET /api/v4/version | unbelegt | vorhanden | – |
| openbao | Sicherheit | Geheimnisse | GET /v1/sys/health | unbelegt | vorhanden | – |
| langfuse | undefined | undefined | – | soll | Profil langfuse in deploy/compose.yml, config/langfuse.json | – |

Status 'vorhanden' nur mit datiertem Health-Protokoll (belegt_am, ISO-8601 UTC). Bis dahin 'unbelegt'; der Sollzustand steht in 'soll'. Quelle: Gutachten NX-WS-KERNE-2026-09, WK-18.

## Ereignisse (Hooks)

| Ereignis | Quelle | Folgeschritte |
|---|---|---|
| `mail.eingang` | posteingang | posteingang.verarbeiten → crm.zuordnen → cognee.merken → agent.entwurf? |
| `mail.gesendet|zugestellt|bounce|beschwerde` | resend | zustell.qualitaet → alarm bei rot |
| `anfrage.neu` | website|posteingang|chat | crm.lead → langlauf.start(K3) |
| `auftrag.angenommen` | kundenportal | rechenkern.buchen → projekt.anlegen → doku.pflichtenheft |
| `lauf.schritt.fertig` | director | agentmemory.beobachtung → doku.aktualisieren |
| `gate.nachweis` | freigabe-gate | zk-log → doku.betriebshandbuch |
| `vorfall.neu` | monitoring | meldestelle → lessons.learned |
| `affiliate.klick|abschluss` | website | affiliate.zuordnen → rechenkern.provision |
| `zahlung.revolut` | revolut | prepaid.zahlungVerbuchen → beleg.anzahlungsrechnung → versand.mail |

**Regeln:** HMAC-SHA256 signiert · Idempotenz-Schlüssel je Ereignis · Timeout 10 s, 3 Versuche, exponentielles Backoff · tote Ereignisse in Warteschlange, sichtbar in myADMIN → Betrieb
