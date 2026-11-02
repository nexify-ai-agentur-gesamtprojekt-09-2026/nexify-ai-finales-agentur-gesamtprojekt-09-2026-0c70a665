# Plan: NeXify / TEILEKLAR – Core-first POC → V1 Build → Integrations → Polish

## 1) Objectives
- Website & Produktwelt so umsetzen, wie im Repo pro Seite beschrieben, aber im **aktuellen NeXify-Design** (verfeinert: Tiefe, Licht, Schatten, Glas, Radien, Background glow) – keine Rückkehr zum alten Layout.
- **TEILEKLAR als eigenständiger Shop** (Schaufenster → Produkt → Warenkorb → Checkout → Bestellung), klar getrennt von NeX/Agentur-Narrativ.
- **Core-Integrationen** stabil: LLM-Chat (Workspace + Teileberater), BigBuy-Katalogimport, Revolut Checkout + Webhook.
- Medien: Home-Hero rechts im „Screen“ mit funktionierendem Video (Ton/Untertitel/Play/Pause), darunter **3 statische Glasbilder** mit richtigen Motiven.

## 2) Implementation Steps

### Phase 1 — POC (Core in Isolation, erst fixen dann weiter)
**User Stories**
1. Als Besucher will ich im Browser einen KI-Chat testen können (Frage → Antwort), damit klar ist, dass echte KI läuft.
2. Als Nutzer will ich eine Bildgenerierung per Prompt ausführen und eine PNG-Datei bekommen, damit wir die neuen Glas-Motive erzeugen können.
3. Als Shop-Betreiber will ich einen BigBuy-Importlauf starten und sehen, dass Produkte in DB landen.
4. Als Käufer will ich einen Test-Checkout erzeugen und eine Checkout-URL erhalten.
5. Als Betreiber will ich sehen, dass ein Webhook-Call (Signaturprüfung) sauber verarbeitet wird.

**Steps**
- Websearch/Best Practices (gezielt, kurz):
  - Revolut Merchant Webhooks: Signatur-Verify, Replay-Protection, Idempotency.
  - BigBuy Import (API vs FTP) Handling: Rate limits, paging, retry.
- POC Scripts (isoliert, keine UI-Abhängigkeit):
  1. `poc_llm_chat.py`: emergentintegrations LlmChat (Claude Sonnet 5.5 empfohlen) → stream response.
  2. `poc_nano_banana_images.py`: Gemini image model → generiert 1 PNG; optional edit mit Referenzbildern.
  3. `poc_bigbuy_import.py`: Shop-API import pipeline (API/FTP) gegen echte Keys → Produktcount + Stichprobe.
  4. `poc_revolut_order.py`: Revolut `create_order` → checkout_url valid, redirect_url korrekt.
  5. `poc_revolut_webhook.py`: simulated webhook payload + signature verify path (mit stored secret) → 204/401.
- Exit Gate Phase 1: alle 5 POCs laufen in dieser Umgebung stabil (mind. 2x reproduzierbar), sonst nicht Phase 2 starten.

### Phase 2 — V1 App Development (MVP ohne harte Abhängigkeit auf Auth)
**User Stories**
1. Als Besucher sehe ich eine fertige Home mit Video im Screen (nicht übergroß) und kann ohne Ton verstehen, worum es geht.
2. Als Besucher kann ich im TEILEKLAR-Shop Produkte suchen, ein Produkt öffnen und in den Warenkorb legen.
3. Als Gast kann ich im Warenkorb Mengen ändern und verliere den Warenkorb nicht beim Refresh.
4. Als Käufer kann ich Checkout starten und werde zu Revolut weitergeleitet.
5. Als Besucher kann ich eine Kontaktanfrage senden und bekomme erst nach Speicherung eine Vorgangsnummer.

**Steps**
- Repo-Setup konsolidieren:
  - `/app/backend`: FastAPI + MongoDB (reuse `apps/shop-api/shop`), saubere `.env`-Loads.
  - `/app/frontend`: React/Vite (neues UI), API base URL env, Copy/Media aus Repo übernehmen.
- Navigation/Pages (V1 Fokus):
  - NeXify: 01 Home, 02 Leistungen, 14 Kontakt, 17 Produktübersicht.
  - TEILEKLAR: 35 Einstieg, 36 Suche/Katalog, 36 Produktdetail, 37 Warenkorb, 37 Checkout/Bestellung.
  - 39 Legal Shell + 404 (Platzhaltertexte, aber echte Routen).
- Home Media:
  - Hero-Film: zunächst vorhandenes Asset (`hero-glass-eleven…`) über bestehende Player-Logik (Play/Pause/Mute/Captions).
  - 3 Glasbilder: zunächst vorhandenes Triptych als Placeholder; Motive in Phase 3 ersetzen.
- Shop Core:
  - Product listing/detail via `/api/shop/products` + `/api/shop/products/{id}`.
  - Cart API via `/api/shop/cart` (guest cookie), fix: kein Warenkorbverlust, keine destruktiven GETs.
  - Checkout quote/order via `/api/shop/checkout/quote` + `/api/shop/orders` (Idempotency-Key).
- One end-to-end test round (UI): Home → TEILEKLAR search → add to cart → checkout redirect → order page readback.

### Phase 3 — Add Features + Integrations (Auth, Admin, Katalog, Motive)
**User Stories**
1. Als Admin kann ich BigBuy Import anstoßen (API/FTP) und den Status sehen.
2. Als Admin kann ich Preise freigeben (Markup, Shipping) und sehe “price released” Status.
3. Als Nutzer kann ich mich via Google oder E-Mail/Passwort anmelden, ohne dass Gast-Warenkorb verloren geht.
4. Als Nutzer kann ich im Workspace-Chat echte KI Antworten bekommen inkl. KI-Hinweis.
5. Als TEILEKLAR-Besucher sehe ich die 3 Glasbilder mit korrekten Motiven (Web / Systeme / Teileklar).

**Steps**
- Secrets & Environment (über Secrets-Card, keine Keys im Chat):
  - BigBuy: `BIGBUY_API_KEY_PRODUCTION` (und ggf. FTP creds wenn gewählt).
  - Revolut: `REVOLUT_MERCHANT_SECRET_KEY_PRODUCTION`, `REVOLUT_API_VERSION`, `REVOLUT_MODE`.
  - Mail: `RESEND_API_KEY`, `RESEND_FROM`, `MAIL_INTERNAL_TO`.
  - LLM: `EMERGENT_LLM_KEY` (oder eigenes Key) + Modellentscheidung.
- BigBuy:
  - Import UI (Admin) + Status; DB Indizes; Rate-limit safe retries.
- Revolut:
  - ensure webhook register path + admin action; webhook endpoint hardening (replay/idempotency logs).
- Auth:
  - Enable both flows (existing accounts_api): Google session + email/pw; UI wiring; cart merge tested.
- Nano Banana Motifs:
  - Generate 3 static glass images using reference assets (original characters) + strict prompt; save in `public/media/...`.
  - Replace Home triptych crops to match required motifs; remove any “video/play” cues.

### Phase 4 — Polish, Hardening, Full Page Rollout
**User Stories**
1. Als Besucher kann ich alle Kernseiten ohne tote Links navigieren.
2. Als Nutzer erlebe ich klare Lade-/Leer-/Fehlerzustände (keine falschen Erfolgsmeldungen).
3. Als Käufer kann ich Bestellstatus sehen und bekomme zuverlässige Bestätigungsmails.
4. Als Betreiber kann ich Logs/Status sehen ohne Secrets-Leaks.
5. Als Nutzer mit Reduced Motion kann ich die Seite vollständig nutzen.

**Steps**
- Rollout restlicher Seiten aus 39er-Katalog als Content-first Templates.
- Design pass: Tokens, Typo, Glas/Depth, responsive + sidebar widths, a11y.
- Comprehensive testing: regression for cart merge, idempotency, checkout, contact recovery, playback.

## 3) Next Actions (immediately)
1. Repo in /app konsolidieren (clean tree) und minimal runnable backend/frontend herstellen.
2. Phase-1 POC Scripts anlegen und ausführen (LLM, Image, BigBuy, Revolut Order/Webhook).
3. Nach POC-Gate: V1 UI (Home + TEILEKLAR core) bauen und E2E testen.
4. Secrets-Card vorbereiten für BigBuy/Revolut/Resend/LLM sobald Phase 3 startet.

## 4) Success Criteria
- POC: Alle Integrationen (LLM streaming, Image gen, BigBuy import, Revolut checkout + webhook verify) funktionieren reproduzierbar.
- V1: Home zeigt Video korrekt (Controls, no oversize) + TEILEKLAR Shop Flow läuft (search → cart → checkout redirect).
- Keine falschen Produkt-/Preis-/Verfügbarkeitsversprechen: Preisstatus “released/not released” wird eingehalten.
- Warenkorbverlustpfad ist gefixt (guest merge sicher, keine destruktiven GETs).
- KI-Hinweis sichtbar in Chat/Teileberater; Logs enthalten keine Secrets.
