# Jev / Jeff-Gate — Read-only Migrations-/Lage-Analyse (2026-10-31)

**Nur Analyse/Doku. Keine neue Routerinstallation, kein Parallelrouter, keine Gate-Abschwächung,
keine Provideraufrufe, keine Schlüssel gelesen/kopiert. Nichts ausgeführt.**

## Ist-Stand (belegt)
- CI: `.gitlab-ci.yml` Stages `[pruefen, jeff]`. Job `jeff-gate` (Stage `jeff`) ruft
  `tools/jeff-gate.py --was … --risiko … --rollback …`. Folgejobs via `needs: ["jeff-gate"]`.
- `tools/jeff-gate.py`: direkter HTTP-Call an das NeXify-Orakel (Jev) **ohne** `nx-jeff`-Abhängigkeit.
  - ENV: `NX_ORAKEL_ENDPOINT`, `NX_ORAKEL_MODEL` (Default `openrouter/typesafe/jev-1.13`), `NX_ORAKEL_KEY`.
  - Exit: 0=go, 1=rueckfrage/no_go, 2=Eingabefehler, 3=Orakel nicht erreichbar (fehlt Endpoint/Key → `rueckfrage`, Exit 3).
  - Fragt strukturiert: `entscheidung` (go/no_go/rueckfrage), `risiko` (score 0–10); `--max-risiko` Default 6.0.
- Runtime (vom Betreiber belegt): 9Router Proxy **v0.5.95**; Systemone/OpenRouter mit **Jev 1.13** aktiv.
  Ein synthetischer nativer Lauf `/v1/systemone` am 31.10.2026 00:06:50 UTC war erfolgreich:
  Provider **TypeSafe**, Modell `typesafe/jev-1.13-20260917`, 290 Input-/23 Outputtokens,
  angezeigte Kosten ~0,00001218 USD. **Kein** Dauerbetriebs-/Orchestrierungsnachweis.
- Abgrenzung: Fork **0.5.18** (geprüft) und Upstream **0.5.104** sind **nicht** mit diesem Runtime-Stand gleichzusetzen.

## Bewertung
- Das Gate ist bereits lane-agnostisch: es spricht einen OpenAI-kompatiblen Endpoint über
  `NX_ORAKEL_*` an. Die vorhandene Systemone/OpenRouter-Lane (Jev 1.13) ist damit **ohne Code-/Routeränderung** nutzbar.
- Modellkennung: Gate-Default `openrouter/typesafe/jev-1.13` vs. synthetischer Lauf
  `typesafe/jev-1.13-20260917`. **Datumsscharfe** Kennung existiert → Konsistenz klären.

## Vorschlag (kompatibel, minimal, read-only vorbereitet — NICHT ausgeführt)
1. **Vorhandene Lane wiederverwenden**: `NX_ORAKEL_ENDPOINT` auf die bestehende Systemone/OpenRouter-
   Route setzen (9Router v0.5.95). Kein zweiter/paralleler Router, keine Neuinstallation.
2. **Modell-ID pinnen**: `NX_ORAKEL_MODEL` einheitlich auf die tatsächlich bediente Kennung
   (z. B. `openrouter/typesafe/jev-1.13` bzw. die datumsscharfe `…-20260917`) — Abgleich mit Betreiber,
   keine Auswahl „ins Blaue".
3. **Gate unverändert streng**: `--max-risiko`, Exit-Semantik und `needs`-Kette **nicht** lockern.
   Fehlender Endpoint/Key bleibt `rueckfrage`/Exit 3 (fail-safe).
4. **Keine Schlüssel im Repo/Handoff**; `NX_ORAKEL_KEY` ausschließlich als CI-Secret.
5. **Offen/Abnahme**: Dauerbetrieb/Orchestrierung ist unbelegt (nur 1 synthetischer Lauf) → bleibt
   explizite Betreiber-Abnahme, nicht als „fertig migriert" darstellen.

## Nächster read-only Schritt (optional, nach Freigabe)
- 1 synthetischer Gate-Trockenlauf gegen die bestehende Lane dokumentieren (ohne echte Deploy-Wirkung),
  Modell-ID/Exit bestätigen. Kein Parallelrouter, keine Installation, keine Kosten über die Lane hinaus.
