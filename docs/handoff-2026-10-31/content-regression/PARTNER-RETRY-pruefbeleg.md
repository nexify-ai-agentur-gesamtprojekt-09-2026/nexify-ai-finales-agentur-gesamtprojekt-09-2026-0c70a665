# NEX-TYPOGRAPHY-20261030-06 — Partner-Retry Prüfbeleg (Receipt-Vertrag)

Status: **`make test` = 583 OK**. Nur Frontend geändert; **Backend reserviert/unverändert** (`api/**`, `apps/agent-gateway/**`, Backend-Tests). Vertrag des lokal geprüften Backends `a4a21f387ef3952a6ce0c7b5f254ec4e75935ee1`.

## Datei
`apps/web/components/PartnerRequestForm.tsx` (Frontend).

## Umgesetzter Vertrag
- **Eingefrorener Payload + Schlüssel:** Idempotency-Key wird einmal pro **unveränderter Eingabe** erzeugt (Signatur aus company/contact/email/message/locale) und für Retries beibehalten. Neue Eingabe → neuer Schlüssel.
- **POST `/api/partner/requests`** mit `Idempotency-Key` + `X-CSRF-Token`:
  - Erfolg (`status==='pending_review' && stored===true && received===false`) → „gespeichert, nicht zugestellt".
  - **409** (neuer Payload mit gleichem Schlüssel) → Fehlerzustand, **kein** neuer Schlüssel, kein stilles Duplikat.
  - Nicht-OK sonst → unbekannter Ausgang (siehe unten).
- **Unbekannter Ausgang** (`catch`: 503/Netzfehler/Sitzungsverlust/ambige Antwort): ruft **`GET /api/partner/requests/receipt?tenant=<tenant>`** mit **gleicher Sitzung + gleichem Idempotency-Key** auf:
  - **200** → exakter Beleg vorhanden (nur gespeichert, keine Zustellung) → Zustand „ok" mit Referenz aus dem Beleg.
  - **404** → kann einem noch laufenden POST vorausgehen → **kein** neuer Schlüssel, Zustand bleibt offen/retry-fähig mit demselben Schlüssel.
  - **409/503/Netz** → Schlüssel + Payload bleiben eingefroren; Zustand „error", erneuter Versuch sendet identischen Schlüssel.
- **Kein Raten über `/mine`**: Die frühere unsichere Heuristik (letzte Anfrage in `/mine`) wurde entfernt; Beleg kommt ausschließlich aus dem exakten Receipt-Endpoint.

## Warum keine Duplikate
Ein Retry nach unbekanntem Ausgang sendet **denselben** Schlüssel + Payload; das idempotente Backend erkennt dies. Vor einem erneuten POST wird der exakte Beleg geprüft; bei 404 wird nicht fälschlich neu geschlüsselt.

## Prüfung
- Typcheck/Bundle: `esbuild` der Komponente fehlerfrei (exit 0).
- `make test` = 583 OK (keine Regression; Backend-Vertragstests liegen im reservierten Backend).
- Hinweis: Live-End-to-End gegen das Backend `a4a21f…` erfolgt getrennt im reservierten Backend-Scope (offene echte Integration).
