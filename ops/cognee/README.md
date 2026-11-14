# ops/cognee · Adapter für das Gedächtnis „Brain“ (Cognee)

Stand 14.11.2026. Standard ist **aus**. Dieser Ordner belegt gebauten und gegen eine Attrappe
geprüften Code, keinen laufenden Dienst und keine Aufnahme. Führend für IST, Entwurf,
Einspielschritte und offene Entscheidungen ist
`docs/04-betrieb/cognee-integration-2026-11-14.md`; Werte und Freigaben stehen in
`config/integrations/cognee.json`.

| Datei | Zweck |
|---|---|
| `cognee_client.py` | Client: Zustand, Datensatzliste, Suche, Aufnahme eines Dokuments, Graphbau. Prüft Schalter, Rolle, Freigaben (auch für lesende Aufrufe), Host, Mandant, Datensatz, Positivliste und Geheimnis-Muster, bevor etwas gesendet wird. |
| `geheimnis_filter.py` | Musterabgleich auf Geheimniswerte mit Normalisierung. Ein Musterabgleich, kein Schutz: den Schutz trägt die Positivliste der Quellen. |
| `aufnahme.py` | Werkzeug: `plan` (ohne Netz), `senden`, `zustand`. Verfolgt keine symbolischen Verknüpfungen. |
| `.env.example` | Variablennamen ohne Werte. |

```bash
python3 ops/cognee/aufnahme.py plan          # was würde aufgenommen, ohne Netz
python3 -m unittest tests.test_cognee_adapter
```

Der Adapter löscht nichts, legt keine Mandanten, Rollen oder Schlüssel an und ruft selbst kein
Modell auf. Kundendaten nimmt er nicht an: zugelassen ist nur der Mandant `nexify-agentur`.
Das ältere `tools/cognee.mjs` (liest Zugangsdaten aus einem Container, kein Schalter, kein
Mandant) bleibt als Historie unverändert und wird nicht weiterverwendet.
