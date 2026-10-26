# NeXify/Jeff (nx-jeff) — Einsatzorte und Möglichkeiten

Orakel: typesafe/jev-1.13, Endpunkt aus /etc/nexifyai/kanon/modelle.env. Kein Chat, nur choice/score/noul.

## Fähigkeiten
- nx-jeff frage --state JSON --choice key instr "opt:desc"... → Auswahl + Wahrscheinlichkeiten
- nx-jeff frage --score key instr "0..10" → Risiko/Score
- nx-jeff frage --noul key instr → freie Antwort
- nx-jeff pruefe-aenderung --was --risiko --rollback [--kontext --max-risiko] → go/no-go/rueckfrage + Risiko + Reversibilität
- nx-jeff health → Erreichbarkeit (Exit 0/3)

## Einsatzorte
1. Codex-Hooks: session_start (Zielklärung), user_prompt_submit (Einordnung), post_tool_use (Prüfung), session_end (Abnahme).
2. Doku-Automatisierung: tools/docs-aktualisieren.mjs → Jeff go/no-go-Gate (bereits eingebaut).
3. CI-Gates: nx-jeff health + pruefe-aenderung vor Deploy/Freigabe.
4. Orchestrator /opt/ai-stack/orchestrator: cto.py/owner.py als Entscheidungsorakel.
5. Design-/Token-Änderungen: pruefe-aenderung vor Änderung an design-tokens.json/design-rules.json.
6. Deploy/Onlinegang: pruefe-aenderung als Freigabe-Gate.
7. Memory: Entscheidungen + Audit-Trail in agentmemory (mem:) und LightRAG.

## Konvention
- Exit 0 = Antwort, 2 = Eingabefehler, 3 = Orakel nicht erreichbar → konservativ handeln, nie "Jeff hat zugestimmt" ohne Antwort.
- pruefe-aenderung antwortet nur bei Konfidenz >= 0.6 mit "go", sonst "rueckfrage".
