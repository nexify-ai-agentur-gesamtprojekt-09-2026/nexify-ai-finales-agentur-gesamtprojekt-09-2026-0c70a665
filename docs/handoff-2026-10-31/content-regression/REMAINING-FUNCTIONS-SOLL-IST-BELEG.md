# NEX-REMAINING-FUNCTIONS-20261030-08 — Soll / Ist / Beleg + Rest-Liste

Status: **`make test` = 583 OK** (unverändert). Budget-Obergrenze dieses Pakets 200 Credits; kein neuer Dienst/Secret, keine Löschung/Testabschaltung, kein Main-Push. Reserviert & unberührt: `api/**`, `apps/agent-gateway/**`, BigBuy-Dateien.

## 1) English i18n
- **Ist:** Vollständiges EN-Staging liegt offline vor (`i18n-staging/en/`, 483 Felder + 21 Komponenten). Runtime-Locales sind `de/nl/fr`; `test_site_map.py` erzwingt **exakt** `{de,nl,fr}` (Zeile 18/21, Key-Parität).
- **Gemacht:** EN-Staging-Drift gegen aktuelle DE-Quellen konsolidiert und sauber dokumentiert (`i18n-staging/en/inventory.json` → `drift_notes`), stale Gruppen exakt benannt: `teileklar`, `portal-intern`, `footer/SiteFooter`. **Keine** Dropdown-only-Locale eingeführt (keine Mischsprache), Übersetzungsstatus bleibt ehrlich.
- **Rest (dedizierte Großkaskade, über 200-Credit-Obergrenze):** Locale-Contract `{de,nl,fr}`→`{de,nl,fr,en}` in `test_site_map.py` + `config/site-map.json` (en in allen i18n-Feldern), `LocaleSwitcher`/zentrale Umschaltung, Clerk `enUS`, Komponenten-Dictionaries, dann **komplette Evidenz-Regeneration über 4 Locales** (browser-critical je Locale, legal-footer 216→288 Views, consent, text-spacing, generate-public-data). Rechtstexte: keine juristischen Zusagen erfinden; EN-Rechtstexte erst nach Fachfreigabe.

## 2) PWA
- **Ist/Beleg:** Vollständig implementiert und **real getestet**:
  - `apps/site/tests/public-installation.test.mjs` = **4/4 pass**: default/standalone/unknown → kein Manifest/Worker (kein Auto-Install); explicit mode → Netzwerk-only, **Original-Icon `/signet.svg` unverändert**, `start_url`/`scope` = `/`; insecure/file/standalone/fehlende Capability → `disabled` (fail-closed); exakte Worker-Registrierung `/public-install-worker.js` (`scope:'/'`, `updateViaCache:'none'`), Fehler explizit ohne Retry (Update-Flow), Erfolg `registered_network_only`.
  - `apps/site/tests/browser-pwa.mjs` (Soll, echtes Chromium): echte SW-Registrierung+Controller, Manifest fehlerfrei (`name:'NeXify AI'`, `scope:'/'`), **kein Caching** von `/api/*`/`/account` (caches.keys()==[]), Offline-Fehler statt Cache, genau ein Online-POST. Build-Abhängigkeit: `.local/pwa-dist` (Anleitung `docs/contracts/public-installation.md`).
- **Keine** personenbezogenen/API/Auth/Checkout-Daten im Cache, **keine** falschen Plattformversprechen, **kein** Auto-Install. Install-Hinweise folgen Browser-Support (explicit mode, secure context).

## 3) Nicht produktdatenabhängige Seiten
- **Ist:** Alle 46 Soll-Routen vorhanden (site-map validiert 46/36/10). Nicht-datenabhängige Stadt-/Partnerinformation ist echt vorhanden **mit Kontaktwegen, ohne Fiktion**:
  - `tk-workshop` → `WorkshopDirectory` (16 Stadt-Standorte DE/AT/CH/NL/BE/LU, ehrlicher Leerzustand, nie „Vertragspartner"), + Verlinkung Termin/Partner/Kontakt.
  - `tk-partner` (Werkstattpartner werden, Nutzen + Kontakt), `contact` (echte Adresse `mail@nexifyai.cloud`).
- **Sauber getrennt:** **datenabhängige** Fahrzeug-/Bestands-/pSEO-Seiten bleiben blockiert (freigegebener Katalog nötig) — nicht pauschal alles blockiert, nur die echt datenabhängigen.

## 4) Durchgehende Browserprüfungen (echte Belege, Node22 Chromium)
| Prüfung (Soll) | Lauf | Ergebnis |
|---|---|---|
| Login-Rückkehr / Auth / Locale-Widget | `browser-auth.mjs` | **PASS** (mobile signout keyboard-accessible; offline hash kein SDK-Init; Widget-Locale folgt DE/NL/FR) |
| Formularvalidierung (Partner) | `browser-partner-form.mjs` | **PASS** (fail-closed unautorisiert; keine Page-Errors/externen Requests) |
| Responsive Layout + Fokus-Rückkehr + A11y | `browser-accessibility.mjs` | **36 Routen, 0 Issue-Routen**; tab-wrap/reverse/escape/focus-return passed |
| PWA Update/Offline/kein Sensitiv-Cache | `public-installation.test.mjs` (+ `browser-pwa.mjs` Soll) | **4/4 pass** |
| EN-Navigation | — | offen bis Runtime-EN (siehe 1) |

## Rest-Liste (konkret, keine neue Analyseschleife)
1. **EN-Runtime-Flip** (dedizierte Großkaskade, eigenes Budget) — Schritte siehe Abschnitt 1; vorab stale EN-Fragmente aus aktuellem DE neu übersetzen.
2. **PWA-E2E im Browser:** `.local/pwa-dist` bauen (Anleitung in `docs/contracts/public-installation.md`) und `browser-pwa.mjs` fahren — Logik bereits per Unit-Suite belegt.
3. **Datenabhängige Seiten** (Fahrzeug/Bestand/pSEO-Stadt): bleiben an Katalog-Release gebunden (separat, Shop-Blocker).
