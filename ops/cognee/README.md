# ops/cognee · Adapter für das Gedächtnis „Brain“ (Cognee)

Stand 14.11.2026. Standard ist **aus**. Dieser Ordner belegt gebauten und gegen eine Attrappe
geprüften Code, keinen laufenden Dienst und keine Aufnahme. Führend für IST, Entwurf,
Einspielschritte und offene Entscheidungen ist
`docs/04-betrieb/cognee-integration-2026-11-14.md`; Werte und Freigaben stehen in
`config/integrations/cognee.json`.

| Datei | Zweck |
|---|---|
| `cognee_client.py` | Client: Zustand, Datensatzliste, Suche, Aufnahme eines Dokuments, Graphbau. Prüft Schalter, Freigabe, Host, Mandant, Datensatz und Geheimnis-Muster, bevor etwas gesendet wird. |
| `aufnahme.py` | Werkzeug: `plan` (ohne Netz), `senden`, `zustand`. |
| `.env.example` | Variablennamen ohne Werte. |

```bash
python3 ops/cognee/aufnahme.py plan          # was würde aufgenommen, ohne Netz
python3 -m unittest tests.test_cognee_adapter
```

Der Adapter löscht nichts, legt keine Mandanten, Rollen oder Schlüssel an und ruft selbst kein
Modell auf. Kundendaten nimmt er nicht an: zugelassen ist nur der Mandant `nexify-agentur`.
Das ältere `tools/cognee.mjs` (liest Zugangsdaten aus einem Container, kein Schalter, kein
Mandant) bleibt als Historie unverändert und wird nicht weiterverwendet.
