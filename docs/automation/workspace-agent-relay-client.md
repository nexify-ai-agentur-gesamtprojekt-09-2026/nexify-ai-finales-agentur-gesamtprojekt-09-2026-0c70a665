# AIFly ORACLE -> RELAY Transportclient

Status: offline implementiert und getestet. Kein Live-Trigger und keine Tokenbindung belegt.

`tools/workspace_agent_relay.py` ist ein enger Client fuer den bestehenden API-Kanal
`agtch_6af34278a84081919442f7c92455b232`. Er ist kein zweites Aufgabenregister: Das
Journal speichert nur Transportkorrelation und Nachweise; fachlicher Auftrag, Owner und
Writer bleiben im fuehrenden Register.

Sicherheitsvertrag:

- Token nur aus `WORKSPACE_AGENT_ACCESS_TOKEN`; nie CLI-Argument, Journal oder Fehlertext.
- Nur HTTPS zu `api.chatgpt.com:443`; keine Redirects. `conversation_url` nur auf
  `chatgpt.com` akzeptieren.
- Ein `event_id` ist zugleich `Idempotency-Key` und dauerhaft an exakt einen Auftrag
  gebunden. `conversation_key` bindet die Unterhaltung, nicht das Ereignis.
- Timeout oder unvollstaendige 202-Antwort wird `unclear` und nie blind erneut gesendet.
- Beta-Runstatus trennt `accepted`, `running`, `completed` und `failed`. `completed`
  ist ohne autorisiert zurueckgelesenes, korrelationspassendes Ergebnis nicht erledigt.
- Das Ergebnis wird nicht im Journal gespeichert; nur SHA-256, Bytezahl und Matchstatus.

Offline-Test:

```sh
python3 -m unittest discover -s tests -p test_workspace_agent_relay.py -v
```

Live-Handoff erst nach belegter Secretbindung und Kostenfreigabe:

```sh
export WORKSPACE_AGENT_ACCESS_TOKEN="$(SECRET_STORE_READBACK_COMMAND)"
python3 tools/workspace_agent_relay.py --journal EXISTING_EVIDENCE_PATH \
  --allowed-tenant nexifyai-platform prepare \
  --event-id ORACLE-RELAY-E2E-YYYYMMDD-01 \
  --tenant nexifyai-platform --purpose "Harmloser Korrelationstest" \
  --writer aifly-relay --writer-lease LEASE_ID --deadline ISO_8601 \
  --expected-result-location AUTHORISED_CHAT_OUTPUT \
  --conversation-key ORACLE_RELAY_CONVERSATION \
  --input "Bestaetige TEST_ID; keine Apps, Aenderungen oder Weiterleitungen."
python3 tools/workspace_agent_relay.py --journal EXISTING_EVIDENCE_PATH \
  --allowed-tenant nexifyai-platform send \
  --event-id ORACLE-RELAY-E2E-YYYYMMDD-01 \
  --writer aifly-relay --writer-lease LEASE_ID
```

Der Platzhalter `SECRET_STORE_READBACK_COMMAND` darf erst durch einen nachgewiesenen,
argv- und logfreien Injektionsweg ersetzt werden. Der Client erzeugt kein Token und
startet keinen Scheduler.
