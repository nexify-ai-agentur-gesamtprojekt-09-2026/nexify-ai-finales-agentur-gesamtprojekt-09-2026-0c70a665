# C4 · Ablauf einer Modellanfrage

**Stand 28.09.2026 · Zielgruppe:** Technik · **Quelle:** lib/anfrage-pipeline.js (11/11)

```mermaid
C4Dynamic
  title Ablauf einer Modellanfrage
  Person(n, "Nutzer", "stellt eine Frage")
  Container(gw, "Gateway", "Fastify", "Anfrage-Pipeline")
  ContainerDb(db, "Postgres", "RLS", "Gedächtnis, Wissen")
  Container_Ext(r, "9router", "Modell", "Antwort")
  Container(lf, "Langfuse", "Traces", "Ablauf")
  Rel(n, gw, "1 stellt Frage", "HTTPS")
  Rel(gw, gw, "2 prüft Regeln, Eingabe, Modus")
  Rel(gw, db, "3 ruft Gedächtnis und Wissen ab (Mandant zuerst)", "SQL")
  Rel(gw, r, "4 sendet S1–S6 mit Cache-Grenzen", "HTTPS")
  Rel(gw, gw, "5 prüft Belege und Ausgaberegeln")
  Rel(gw, n, "6 liefert Antwort mit Quellen und KI-Hinweis", "SSE")
  Rel(gw, lf, "7 meldet Trace mit Modus und Kosten", "HTTPS")
```

Sonderwege: nichts Relevantes → ehrliche Antwort ohne Modell · Injektion von Kundenseite → abgewiesen · Modell aus → »wird nachgeholt«.
