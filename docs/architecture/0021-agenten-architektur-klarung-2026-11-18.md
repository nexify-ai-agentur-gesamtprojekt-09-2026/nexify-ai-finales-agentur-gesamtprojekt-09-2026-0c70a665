# Agenten-Architektur: Klärung für die vorhandene Laufzeit

Stand **18.11.2026** · Zweig `NEX-581-ai-agents-architect` · Basis `9c9c806`.
Dieses Dokument klärt den Geltungsbereich der Agenten-Architektur und gleicht drei
Quellen ab: den Skill `ai-agents-architect`, die Vorgabe § 12a.2 in
`docs/codex/AUFTRAG-Codex-Gesamtloesung.md` und den tatsächlich vorhandenen Code.
Es ändert keinen Produktcode, keine Konfiguration, keinen Schlüssel und keinen
Beleg. Es entscheidet nichts, was dem Inhaber oder einem ADR gehört.

Kennzeichnung: **SOLL** = gültige Vorgabe mit Quelle · **IST** = am genannten
Commit gelesen oder gemessen · **TEILWEISE** = vorhanden, aber nicht vollständig
nach § 12a.2 · **OFFEN** = fehlt oder nicht belegt · **ANNAHME** = Bewertung
dieses Dokuments, nicht vom Inhaber bestätigt.

## 1. Ergebnis in Kürze

1. **IST: Es gibt zwei getrennte Laufzeiten, nicht eine.** Der öffentliche
   Website-Chat ist ein einzelner, eng begrenzter Agent mit genau einem lesenden
   Werkzeug (`packages/agent-runtime/model-agent.ts`). Das geplante Agentur-Team
   aus neun Profilen und 44 Rollen ist dagegen nur beschrieben; kein Profil hat
   einen Ausführenden (`docs/04-betrieb/bot-team-ist-soll-2026-11-14.md:17`).
   Beide werden im Alltag „Agenten“ genannt. Diese Vermischung ist die
   eigentliche Unklarheit, die dieses Dokument auflöst.
2. **IST: Die Skill-Muster sind für den öffentlichen Agenten erfüllt oder bewusst
   nicht verwendet.** Der Lauf ist auf zwei Schritte begrenzt, hat `maxRetries: 0`,
   ein einziges Werkzeug und ein festes Tokenlimit. ReAct ohne Limit, Werkzeug-
   Überladung und Multi-Agent ohne Begründung kommen nicht vor.
3. **TEILWEISE: Die Vorgabe § 12a.2 ist für den öffentlichen Agenten nur zum Teil
   erfüllt.** Es fehlen Werkzeug-Beispiel, Seiteneffekt-Klasse und Nutzungszählung
   im Werkzeugregister, das strukturierte Fehlerformat `{code, meldung,
   wiederholbar}`, Budget-Reservierung und eine sichtbare Trace-ID. Für einen
   lesenden Chat ohne Außenwirkung ist das vertretbar; für eine Live-Schaltung
   mit Kosten und Kennzeichnungspflicht ist es eine Lücke.
4. **IST: Die Live-Schaltung ist fail-closed.** Der Handler antwortet bei
   aktivierter Freigabe mit `503 managed_live_chat_unavailable`
   (`api/agent-chat.ts:138-139`); der Router-Zusammenbau wirft
   `managed_live_chat_router_binding_pending`
   (`packages/agent-runtime/managed-live-chat.ts:84-87`). Es gibt keinen
   Modellaufruf im Betrieb.
5. **OFFEN: Eine Entscheidung zum Geltungsbereich.** Ob § 12a.2 auf den
   öffentlichen Website-Chat angewendet wird oder nur auf die geplante
   Team-Laufzeit, ist nicht entschieden. Dieses Dokument schlägt die Trennung vor
   (Abschnitt 6), entscheidet sie aber nicht.

## 2. Zwei Laufzeiten, klar getrennt

| Laufzeit | Zweck | Beleg | Zustand |
|---|---|---|---|
| **Öffentlicher Chat** | Lesende Orientierung auf freigegebenen öffentlichen Seiten; keine Buchung, kein Versand, keine Konten | `api/agent-chat.ts`, `packages/agent-runtime/*.ts` | Code vorhanden, offline geprüft, Live-Pfad **aus** |
| **Agentur-Team** | Neun Profile (companion, baumeister, pruefer, recherche, triage, angebot, wissen, orchestrator, waechter) und 44 Fachrollen | `config/integrations/nexify-team-runtime-candidate.json`, `config/brain/agents.json` | **nur beschrieben**; `activation` durchgehend `false`; Hermes `function_proof: false` |

Der öffentliche Chat ist **kein** Profil des Team-Katalogs. `companion` ist als
Rolle beschrieben, aber der Website-Chat ist heute ein einzelner Modellaufruf mit
einem Werkzeug, nicht die Umsetzung des Profils. Ein Rollenname ist kein laufender
Agent (SOLL, `docs/09-final/master-goal-anhang-growth-product-factory-2026-11-09.md:20`).

Für die Team-Laufzeit gilt D-019: Hermes ist die Orchestrierungs-Laufzeit, mit
DeepSeek betrieben, **noch nicht aktiviert** (`DECISIONS.md:141-148`). Die
Zuordnung weiterer Profile zu Hermes ist offen. Der öffentliche Chat läuft nicht
in Hermes und wird durch dieses Dokument nicht dorthin verschoben.

## 3. Abgleich mit den Mustern des Skills

| Skill-Muster | IST im öffentlichen Chat | Bewertung |
|---|---|---|
| **ReAct-Schleife** (Reason–Act–Observe, mit Iterationslimit) | `ToolLoopAgent` mit `stopWhen: isStepCount(MAX_AGENT_STEPS)` (`model-agent.ts:135`); `MAX_AGENT_STEPS = 2` (`:12`); `maxRetries: 0` (`:134`) | **Erfüllt**, strenger als die Vorgabe „Standard 10“ aus § 12a.2 |
| **Plan-and-Execute** (Planen, Ausführen, Neuplanen) | Nicht vorhanden. Der Agent liest höchstens einen Seitentext und antwortet. | **Bewusst nicht verwendet.** Für eine lesende Ein-Schritt-Aufgabe wäre eine Planungsschicht zusätzliche Angriffsfläche. Ein Einsatz bräuchte einen eigenen Anlass. |
| **Werkzeugregister** (Schema, Beispiel, Auswahl, Zählung) | Genau ein Werkzeug `publicPageInfo` (`model-agent.ts:137-143`); striktes Eingabeschema `pageInput` (`:75-78`); Beschreibung vorhanden (`:139`); Auswahl fest, nicht dynamisch | **TEILWEISE**: Beispiel, Seiteneffekt-Klasse und Nutzungszählung fehlen (siehe Abschnitt 5) |

Der Skill nennt drei Anti-Muster. Für den öffentlichen Chat gilt:

- **Unbegrenzte Autonomie:** nicht vorhanden (zwei Schritte, keine Wiederholung,
  60-Sekunden-Frist und 1-MiB-Grenze im Transport, `nine-router-model.ts:13-14`).
- **Werkzeug-Überladung:** nicht vorhanden (ein Werkzeug).
- **Gedächtnis-Hortung:** nicht vorhanden (kein Speicher im öffentlichen Chat).

## 4. Abgleich mit den Sharp Edges des Skills

| Sharp Edge | Schwere | IST | Beleg | Bewertung |
|---|---|---|---|---|
| Agentenschleife ohne Iterationslimit | kritisch | Auf zwei Schritte begrenzt; dritter Schritt läuft nie | `model-agent.ts:135`; Test `packages/agent-runtime/tests/model-agent.test.mjs:102-109` | **Erfüllt** |
| Unklare oder unvollständige Werkzeugbeschreibung | hoch | Beschreibung vorhanden, aber ohne Beispiel und ohne Seiteneffekt-Klasse | `model-agent.ts:130,139` | **TEILWEISE** |
| Werkzeugfehler erreichen den Agenten nicht | hoch | Fehler werden als `tool-error`-Teil zurückgegeben, nicht verschluckt | Test `model-agent.test.mjs:80-90` | **Erfüllt** für den SDK-Pfad; das strukturierte Format aus § 12a.2 fehlt |
| Alles im Agentengedächtnis speichern | mittel | Kein Gedächtnis im öffentlichen Chat | `model-agent.ts` insgesamt | **Erfüllt** durch Nichtvorhandensein |
| Agent hat zu viele Werkzeuge | mittel | Ein Werkzeug | `model-agent.ts:137-143` | **Erfüllt** |
| Mehrere Agenten ohne Notwendigkeit | mittel | Kein Multi-Agent im öffentlichen Chat; Team-Laufzeit nicht aktiv | `config/integrations/nexify-team-runtime-candidate.json:8-13` | **Erfüllt**; ein späterer Multi-Agent-Einsatz braucht ein ADR (§ 12a.2) |
| Agenteninterna nicht protokolliert oder nachvollziehbar | mittel | Telemetrie bewusst aus (`model-agent.ts:136`); keine Trace-ID im Antwortkopf | `api/agent-chat.ts:17` setzt nur `x-nexify-agent-mode` | **OFFEN** gegenüber § 12a.2 „Trace-ID sichtbar“ |
| Zerbrechliches Parsen der Agentenausgabe | mittel | Werkzeugeingabe strikt über Zod; Antwort ist freier Text für den Chat, keine Aktion | `model-agent.ts:75-78,98-106` | **Erfüllt** für den Chat; für spätere Aktionen wäre eine Schemaantwort nötig |

## 5. Abgleich mit § 12a.2 (Vorgabe)

| Baustein aus § 12a.2 | IST im öffentlichen Chat | Bewertung |
|---|---|---|
| Ein Orchestrator je Vorgang; Regelwerk vor Prompt | Kein Orchestrator; ein Agent je Anfrage | **Nicht anwendbar** auf den öffentlichen Chat; für die Team-Laufzeit OFFEN |
| Arbeitsweise über `lib/modi.js` | Nicht vorhanden | **Nicht anwendbar** (keine mehrstufigen Vorgänge) |
| Zuordnung über `lib/tagrouter.js` | Nicht vorhanden | **Nicht anwendbar** |
| ReAct nur mit Iterationslimit | Zwei Schritte, fest | **Erfüllt** |
| Multi-Agent nur begründet (ADR) | Keiner | **Erfüllt** |
| Werkzeugregister mit Schema, Beschreibung, Beispiel, Seiteneffekt-Klasse, Regelwerk-Aktion; kuratierte Auswahl; Nutzung gezählt | Schema und Beschreibung vorhanden; Beispiel, Seiteneffekt-Klasse, Regelwerk-Aktion und Zählung fehlen | **TEILWEISE** |
| Werkzeugfehler strukturiert `{ code, meldung, wiederholbar }`; nach 3 gleichen Fehlern Mensch | SDK liefert `tool-error`; kein strukturiertes Format; die 3er-Regel ist bei zwei Schritten gegenstandslos | **TEILWEISE** |
| Ausgabe nur schemageprüft; nie Freitext parsen | Chat-Antwort ist freier Text; es werden keine Aktionen daraus abgeleitet | **Erfüllt im jetzigen Umfang**; für Aktionen OFFEN |
| Budget: Reservierung vor Aufruf, Abbuchung danach | Nur Tokenobergrenze `MAX_OUTPUT_TOKENS = 2048` (`model-agent.ts:13`); kein Cent-Budget, keine Reservierung; Live-Pfad aus | **OFFEN**, durch das geschlossene Gate abgesichert |
| Mensch im Ablauf bei schreiben/extern | Keine schreibenden oder externen Werkzeuge; Hartsperren in `config/brain/agents.json:4-11` | **Erfüllt** durch Nichtvorhandensein |
| Kennzeichnung (EU AI Act Art. 50), Trace-ID sichtbar | Antwortkopf `x-nexify-agent-mode: public_guided_preview` (`api/agent-chat.ts:17`); keine Trace-ID | **TEILWEISE** |
| Computer Use nur nach R-21 in Sandbox | Nicht vorhanden | **Nicht anwendbar** |

## 6. Offene Entscheidungen (nicht von diesem Dokument entschieden)

1. **Geltungsbereich von § 12a.2.** Gilt die Vorgabe für den öffentlichen Chat,
   für die Team-Laufzeit oder für beide mit unterschiedlichen Stufen? Vorschlag
   (ANNAHME): § 12a.2 gilt vollständig für die Team-Laufzeit; für den öffentlichen
   Chat gilt eine engere Stufe „lesend, ein Werkzeug, zwei Schritte“, deren
   Abweichungen in Abschnitt 5 benannt sind. **Eigentümer:** Inhaber; Ablage in
   `DECISIONS.md`.
2. **Trace-ID und Kennzeichnung.** Wie wird die Trace-ID sichtbar, ohne
   Telemetrie mit Eingabe-/Ausgabedaten zu aktivieren? Die heutige Antwort
   (Telemetrie aus, nur ein Modus-Kopf) erfüllt § 12a.2 nicht. **Eigentümer:**
   Technikleitung mit Datenschutz; eigene Entscheidung.
3. **Budget und Reservierung.** Vor einer Live-Schaltung braucht es einen
   dauerhaften Speicher für Reservierung, Abrechnung und unklare Ausgänge
   (`docs/architecture/0015-vercel-agent-runtime.md`, Abschnitt „Kosten und
   Zustand“). **Eigentümer:** Inhaber (Konto, Preis, Limit).
4. **Werkzeugregister-Metadaten.** Wenn ein zweites Werkzeug hinzukommt, müssen
   Beispiel, Seiteneffekt-Klasse und Zählung standardisiert werden. **Eigentümer:**
   Technikleitung; Vorschlag als ADR, bevor das zweite Werkzeug entsteht.
5. **Team-Laufzeit.** Die Zuordnung weiterer Profile zu Hermes ist nach D-019
   offen und setzt den Funktionsnachweis sowie die Entfernung des Docker-Sockets
   voraus. **Eigentümer:** Inhaber.

## 7. Abnahmekriterien für eine spätere Live-Schaltung

Diese Kriterien sind messbar und gelten zusätzlich zu den vorhandenen Gates. Sie
sind heute **nicht** erfüllt; der Live-Pfad ist aus.

1. **Kein Aufruf ohne Freigabe:** Ohne Freigabe, Budgetbindung und gültige
   Serverkonfiguration ist die Zahl der Provider-Aufrufe **0**.
2. **Schrittgrenze:** Ein Lauf endet nach höchstens `MAX_AGENT_STEPS` Schritten;
   ein weiterer Modellaufruf findet nicht statt.
3. **Wiederholungsgrenze:** `maxRetries: 0` und `streamRetries: 0` bleiben
   wirksam; ein 5xx erzeugt genau einen Versuch.
4. **Werkzeugumfang:** Genau die freigegebenen Werkzeuge sind gebunden; ein
   zusätzliches Werkzeug ist ohne Schema, Beschreibung und Seiteneffekt-Klasse
   nicht erreichbar.
5. **Fehlerformat:** Ein Werkzeugfehler erreicht den Agenten strukturiert mit
   `code`, `meldung` und `wiederholbar`; nach drei gleichen Fehlern wartet der
   Lauf auf einen Menschen.
6. **Ausgabe:** Antworten mit Außenwirkung sind schemageprüft; Freitext wird nie
   als Aktion interpretiert.
7. **Kennzeichnung und Trace:** Jede Antwort trägt die KI-Kennzeichnung und eine
   Trace-ID; die Trace-ID ist ohne Rohinhalt von Eingabe und Ausgabe lesbar.
8. **Kosten:** Vor dem Aufruf ist ein Budget reserviert, nach dem Aufruf wird
   abgebucht; ein unklarer Ausgang bleibt als ungeklärt gespeichert und wird
   nicht als kostenlos behandelt.

## 8. Nicht geprüft und nicht behauptet

- Kein Modellaufruf, kein Providerkontakt, kein Schlüssel gelesen.
- Kein Live-Verhalten gemessen; die Aussagen zum Live-Pfad stammen aus dem
  gelesenen Code und den Tests.
- Die Team-Laufzeit wurde nicht gestartet und nicht vermessen; die Aussagen
  stammen aus Kandidat, Register und dem IST/SOLL-Bericht vom 14.11.2026.
- Die Prüfmatrix in Abschnitt 9 ist eine Momentaufnahme dieses Zweigs; sie
  ersetzt keine unabhängige Prüfung.

## 9. Prüfstand dieses Zweigs

Gemessen am 18.11.2026 auf `NEX-581-ai-agents-architect` (Basis `9c9c806`,
Node 24.22.2, `pnpm install --frozen-lockfile --ignore-scripts`, ohne `.venv`):

| Befehl | Ergebnis |
|---|---|
| `node --test packages/agent-runtime/tests/*.test.mjs` | 62 Tests, 62 bestanden, 0 fehlgeschlagen |
| `pnpm typecheck:agent` | Exit 0 |
| `make governance-check` | Exit 0; `check_ai_coverage` meldet `audit_partial` mit **11 bereits vor dieser Änderung abweichenden** registrierten Quellen, darunter `packages/agent-runtime/model-agent.ts` und `public-orientation.ts`. Keine davon wurde durch dieses Dokument verursacht; es ändert keinen Quelltext. |

Die 62 Tests belegen das Verhalten des öffentlichen Agenten, nicht die
Team-Laufzeit und nicht die Live-Schaltung. Die Abweichungen im
KI-Durchsetzungsregister sind vorbestehend und werden hier nicht nachgezogen
(kein Beleg, kein Pin-Refresh).

## 10. Quellen

- Skill `ai-agents-architect` (Muster ReAct, Plan-and-Execute, Werkzeugregister;
  Anti-Muster; Sharp Edges).
- `docs/codex/AUFTRAG-Codex-Gesamtloesung.md:317` (Grundsatz „Autonom, aber
  steuerbar“) und `:339-360` (§ 12a.2).
- `packages/agent-runtime/model-agent.ts:5,11-13,75-78,98-106,125,130,134-143`.
- `packages/agent-runtime/nine-router-model.ts:10-14,30-65,144,197`.
- `packages/agent-runtime/managed-live-chat.ts:76-87`.
- `packages/agent-runtime/public-orientation.ts` (deterministische Orientierung).
- `api/agent-chat.ts:17,133-139`.
- `config/llm-policy.json` (Modell, Reasoning, Routing, Kosten- und
  Zugriffsgrenzen).
- `config/brain/agents.json:4-11` (Hartsperren).
- `config/integrations/nexify-team-runtime-candidate.json:8-13` (keine
  Aktivierung).
- `DECISIONS.md:141-148` (D-019).
- `docs/04-betrieb/bot-team-ist-soll-2026-11-14.md:17` (kein Profil läuft).
- `docs/architecture/0015-vercel-agent-runtime.md` (Kosten, Auth, Tests).
