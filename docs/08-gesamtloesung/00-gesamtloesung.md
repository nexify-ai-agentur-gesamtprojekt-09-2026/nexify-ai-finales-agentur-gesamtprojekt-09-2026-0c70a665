# NeXify Plattform · Gesamtlösung · Leitentscheidung

**Stand 27.09.2026 · Fassung 1.0 · Eigentümer Pascal Courbois · Status: Entwurf zur Freigabe.** Diese Datei ist der oberste Plan für die Ablösung aller bisherigen Einzellösungen. Sie ersetzt keine Endabnahme.

## 1 · Zielbild in drei Sätzen

1. **Eine Plattform statt vieler Einzellösungen:** eine Anwendung mit einem Gateway (`api/openapi.yaml`), einem MCP-Server (`config/mcp-server.json`), einer Anmeldung, einem Designsystem und einer Datenquelle. Sie ersetzt Website, Shop, DSH, myADMIN, myADMIN v2, Portale, Workspace und Posteingang als getrennte Auslieferungen.
2. **Regeln sind Code:** Jede Aktion läuft vor der Ausführung durch `lib/regelwerk.js`. Ein Verstoß wird nicht gemeldet, sondern verhindert (fail-closed).
3. **Lernen ist ein geprüfter Kreislauf:** Jede Korrektur, Bewertung und jeder Fehler wird zu genau einer Lernform (`lib/lernschleife.js`). In den Betrieb kommt nur, was das Bewertungs-Gate besteht. Die Modellgewichte ändern sich nie live.

## 2 · Was die Recherche vorgibt (Stand September 2026)

| Thema | Bestpraxis | Folge für NeXify |
|---|---|---|
| Wann feinjustieren | Reihenfolge Prompt → RAG → Feinjustierung → Destillation. Feinjustierung prägt Form (Stil, Format, Ablehnungsmuster), nicht Fakten, die sich wöchentlich ändern. | Fakten nur über Wissen (LightRAG, AgentMemory). Adapter nur für Stil und Format, erst mit Messdaten. |
| Verfahren | Standard ist LoRA + SFT, QLoRA bei wenig Speicher, DPO für Präferenzen; RLHF und volles Feinjustieren sind Ausnahmen. | L5 = LoRA/QLoRA-SFT, dann DPO auf Pascals Korrekturen. GRPO nur bei prüfbarer Belohnung (Einordnung, Werkzeugaufruf). |
| „Lernen in Echtzeit“ | In der Praxis tragen Kontext, RAG, LoRA-Adapter im Takt und DPO/GRPO die Last; echte Echtzeit-Gradienten sind selten, weil Sicherheit, Prüfung und Rücknahme zu teuer sind. | Kein Live-Training. Takt monatlich oder bei Drift, immer über Gate und Canary. |
| Datenmenge | Für Stil und Format reichen oft 1.000–5.000 sorgfältig ausgewählte Beispiele; für Ton 500–2.000 kuratierte Beispiele schlagen oft 50.000 verrauschte. | `mindestPaare: 500` je Bereich, bevor ein Adapter trainiert wird. |
| Serving | vLLM kann mehrere LoRA-Adapter auf einem Basismodell bedienen, die Adapter werden je Anfrage gewechselt. | Ein Basismodell, ein Adapter je Bereich (Angebot, Support, Einordnung), `deploy/compose.yml` Profil `gpu`. |
| Agenten-Protokoll | MCP 2026-07-28: zustandsloser Protokollkern, keine Protokoll-Sitzung und kein `Mcp-Session-Id`-Header mehr; Roots, Sampling und Logging sind als veraltet markiert. | MCP-Server zustandslos; diese drei Funktionen werden nicht gebaut. |
| Beobachtung | OpenTelemetry GenAI: Span-Baum `invoke_agent` → `chat` → `execute_tool`, Tokenzahlen als `gen_ai.usage.*`; volle Prompt-Texte als Attribut gelten als Fehler, Inhalte gehören in filterbare Ereignisse. | Collector löscht Inhalte vor jedem Export (`deploy/otel-collector.yaml`). |

Quellen mit Datum stehen in § 9. Aussagen gelten für den Stichtag und sind vor der Umsetzung erneut zu prüfen.

## 3 · Modellarten: was wofür (Entscheidung nach Vorgabe)

Vorgaben aus `AGENT.md` § 0: EU-Betrieb, Open Source zuerst, keine erfundenen Zahlen, Geld nur über den Rechenkern, Pascal gibt frei.

| Aufgabe | Lösungsart | Warum nicht anders |
|---|---|---|
| Geld, Steuer, Fristen, Zustände, Zuordnung per Nummer, Spam-Grundregeln, Regeln | **deterministischer Code** (`lib/*.js`) | muss prüfbar, wiederholbar und rechtssicher sein; ein Modell darf hier nur vorschlagen |
| Absicht, Kategorie, Tag erkennen | **kleiner Encoder-Transformer** (mehrsprachig, feinjustiert, ONNX auf CPU) | schnell, billig, genug für Einordnung; ein großes Sprachmodell wäre teurer ohne Mehrwert |
| Suche im Wissen | **Einbettungsmodell** (Encoder) + LightRAG | Fundstellen statt Gedächtnis im Modell |
| Entwürfe, Antworten, Zusammenfassungen | **Decoder-Transformer** über 9router: Stufe 0 eigenes Modell mit LoRA-Adapter, Stufe 1 günstig, Stufe 2 stark | Stufen nach Unsicherheit und Kosten, Rückfall automatisch |
| Prognosen auf Tabellen (Auslastung, Nachfrage) | **klassisches ML** (Gradient Boosting) mit naivem Vergleichswert | Transformer bringt bei kleinen Tabellen keinen belegten Vorteil |
| Drift | **Statistik** (KS-Test) | besteht in `ml-betrieb-eigene-modelle.md` |

**Grundsatz: deterministisch vor Modell.** Wo eine Regel reicht, entscheidet die Regel. Das Modell liefert Vorschläge, die Regel entscheidet (Muster aus `lib/posteingang.js`).

## 4 · Module: Muss · Soll · Kann

| Modul | Stufe | Stand im Projekt | Nächster Schritt |
|---|---|---|---|
| Regelwerk-Kern `lib/regelwerk.js` | **Muss** | gebaut, 30/30 Prüffälle, findet echte Fehler im Projekt (§ 7) | im Gateway und im Director vor jedem Seiteneffekt aufrufen (B3) |
| Lernschleife `lib/lernschleife.js` | **Muss** | gebaut, 20/20 | Signale aus Posteingang, Workspace, CI anbinden (B9) |
| Langlauf `lib/langlauf.js` | **Muss** | 32/32 | hinter Postgres (B6) |
| Rechenkern, Tag-Router, Posteingang | **Muss** | 18/18 · 12/12 · 31/31 | als Dienste (B4, B5, B7) |
| Bewertungs-Gate mit Fragensatz | **Muss** | Logik gebaut; Fragensatz fehlt | Pascal wählt 30 Fälle je Vorgangsart |
| OTel GenAI + Wächter + zweite Ebene | **Muss** | Collector-Konfiguration fertig | B10 |
| Automatische Doku | **Muss** | Generator läuft, erzeugt jetzt auch das Regelverzeichnis | CI-Job `doku` |
| MCP-Server (zustandslos) | **Soll** | Konfiguration fertig | B8 |
| LoRA-Adapter Stufe 0 + DPO | **Soll** | Verfahren, Gate, Canary gebaut | erst ab 500 Paaren je Bereich und GPU-Entscheidung |
| Skill-Destillation aus Verläufen (L3) | **Soll** | Ableitung gebaut (Schwelle 2) | Skill-Entwürfe im Workspace zur Freigabe zeigen |
| GRPO für Einordnung | **Kann** | – | nur wenn der Encoder den Fragensatz nicht erreicht |
| Cognee, Dify, Composio | **Kann** | Status `unbelegt` | Composio erst nach Entscheidung E-B |

## 5 · Mehr Stabilität, Autonomie und Einfachheit – zusätzliche Lösungen

| Lösung | Wirkung | Umsetzung |
|---|---|---|
| **Fail-closed überall** | Ausfall sieht nie aus wie Erfolg | Regelwerk sperrt Unbekanntes; Posteingang ohne Kern ordnet nichts ein |
| **Ein Fehler, ein Prüffall** | derselbe Fehler kommt nicht wieder | Lernform L4, CI-Job `tests`, Muster aus dem Gutachten NX-WS-KERNE (21 rote Fälle vor dem Fix) |
| **Regelprüfung in CI** | Verstöße erreichen nie die Vorschau | `tools/regel-pruefung.js` |
| **Vertrag zuerst** | Oberflächen und Backend können getrennt gebaut werden | `api/openapi.yaml`, Lint in CI, Contract-Tests in B2 |
| **Autonomie mit Schranken** | Agenten arbeiten ohne Warten und stoppen nur an echten Grenzen | Regelwerk-Entscheidung `mensch` statt Fehler: Entwurf entsteht, Pascal gibt frei |
| **Selbstprüfung** | das System findet eigene Fehler | Wächter + `pruefeDateien()` täglich gegen den Live-Stand; Befund → Signal → Prüffall |
| **Eine Oberfläche für Pascal** | eine Stelle für Entscheidungen | Leitstand (`NeXify Leitstand.dc.html`): offene Freigaben, Regelverstöße, Lernkandidaten |
| **Soll/Ist getrennt** | keine Planung auf unbelegtem Stand | `soll` + `belegt_am` in `config/integrationen.json`, Regel R-15 |

## 6 · Ablösung aller bisherigen Lösungen

**Vorgabe:** Nach bestandenem Gate der Plattform werden die folgenden Auslieferungen abgeschaltet und vom Server entfernt (`playbooks/90-bereinigung.yml`). Die Design Components im Projekt bleiben als **Oberflächenvorlage** für die Umsetzung erhalten; sie sind keine Produktivsoftware.

| Bisher | Wird zu (Modul der Plattform) | Vorlage im Projekt | Abschaltung |
|---|---|---|---|
| Agentur-Website (Live-Stand, v1–v9) | `web/agentur` | `NeXifyAI Cloud v10.dc.html` | nach Umleitung, Live-DNS = Einzelfreigabe |
| TEILEKLAR-Shop (Live-Stand) | `web/shop` | `TEILEKLAR Shop.dc.html` | nach Parallelbetrieb 14 Tage ohne Befund |
| DSH (Altstapel) | entfällt; Aufgaben in Gateway + Worker | – | nach Inventar und Sicherung |
| myADMIN, myADMIN v2 | `app/leitstand` + `app/verwaltung` | `myADMIN v2.dc.html`, `NeXify Leitstand.dc.html` | nach Gate |
| Portale (Kunde, Partner, Nachbarschaft, Affiliate) | `app/portal` mit Rollen | `Kundenportal`, `Partnerportal`, `Nachbarschaftskunden-Portal`, `Affiliate-Portal` | nach Gate je Rolle |
| Workspace, Posteingang | `app/workspace`, `app/posteingang` | gleichnamige DC | nach Gate |
| Werkzeuge (Fitment, Reifen, Batterie) | `web/werkzeuge` | gleichnamige DC | mit Shop |

Parallelbetrieb je Modul bis zur Endabnahme; Rückweg = Umleitung zurück auf den Altstand (Rollback), deshalb wird erst nach Ablauf der Frist bereinigt.

## 7 · Was dieser Durchgang schon bewiesen hat

Das Regelwerk lief gegen 17 Projektdateien und fand zwei echte Fehler, die kein bisheriger Test fand:
- `Kundenportal.dc.html`: `{{ !loggedIn }}` ist ein Ausdruck im Template-Loch und wird nie aufgelöst – nach dem Abmelden erschien die Anmeldung nicht. **Behoben** (`loggedOut`).
- `NeXify Posteingang.dc.html`: KI-Entwürfe ohne Art.-50-Hinweis in der Oberfläche. **Behoben.**

## 8 · Offen bei Pascal

E-A Wortlaut KI-Hinweis · E-B Composio · Fragensatz (30 Fälle je Vorgangsart) · Einwilligungsregel für Trainingsdaten · GPU-Knoten · Löschfrist Chats · Einzelfreigabe Live-DNS Vorschau · Health- und Preisnachweis 9router (B-01).

## 9 · Quellen (abgerufen 27.09.2026)

- MCP-Spezifikation 2026-07-28 und Changelog – modelcontextprotocol.io, blog.modelcontextprotocol.io (28.07.2026)
- OpenTelemetry-Blog „GenAI Observability“ (14.05.2026); Uptrace „OpenTelemetry for AI Systems“ (02.04.2026)
- bigdataboutique „Fine-Tuning LLMs in 2026: When RAG Isn't Enough“ (10.05.2026); futureagi.com Fine-Tuning-Übersichten (14.05.2026)
- vLLM-Dokumentation „LoRA Adapters“ (18.05.2026); vLLM-Blog Multi-LoRA (26.02.2026)

Anbieterblogs sind Fachquellen, keine Normen; Zahlen daraus sind Richtwerte und werden durch eigene Messung ersetzt.
