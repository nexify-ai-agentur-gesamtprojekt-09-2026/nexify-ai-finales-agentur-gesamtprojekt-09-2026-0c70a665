# Seiten-Logik-Audit (Phase 1b, REQ-117..124)

Stand: 31.10.2026. Maßstab sind die Prototypen in `prototypen/`. Sie legen Funktion, Zustände, Formulare, Validierungen und Berechnungen fest; sichtbare Text-Anweisungen gelten als Bauanweisung, nicht als Kundentext. Das neue Design (`packages/tokens`, `apps/web`) bleibt die visuelle Quelle.

Erzeugt mit `python3 tools/build_seiten_logik_audit.py`. Die Rohdaten liefert `tools/prototype_audit_extract.py`: TODO(BACKEND), `data-api-endpoint`, Formulare/Felder, Logikmethoden aus den `text/x-dc`-Skripten, Zustände und Handoff-Texte. Die Status sind in `tools/build_seiten_logik_audit.py` (FILE_DEFAULT, RULES) begründet und geprüft.

Status: `implemented` = im neuen Build vorhanden und im Preview geprüft · `wrong` = vorhanden, aber falsch (wird korrigiert) · `missing` = fehlt · `out-of-phase` = gehört in eine spätere Phase, dort ehrlicher Platzhalter oder geschlossene Route.

Phasen: 1 Shop/Auth/Werkstattsuche · 1b Seitenlogik + Textkonzept · 2 Shop-Ausbau (Fahrzeug/Passung, Mails, Rechnungen, Stadtseiten) · 3 Portale · 4 myADMIN/Leitstand · 5 NeX2fly/one/API · 6 Arbeitsplatzdienste · 7 Medien/Material · 8 Go-Live.

## Zusammenfassung

{{SUMMARY}}

Alle als `wrong` gefundenen Punkte sind korrigiert (siehe unten); deshalb enthält die Einzeltabelle keinen offenen `wrong`-Eintrag mehr. `missing` mit Phase 1b betrifft fast nur Seitentexte; sie werden mit dem Gesamt-Textkonzept neu geschrieben.

## Korrigierte Fehler (vorher `wrong`)

| Fund | Korrektur | Prüfung |
|---|---|---|
| `/teileklar/kategorie`, `/teileklar/produkt` (ohne ID), `/teileklar/suche` u. a. zeigten das alte `ShopPanel`, das tote Endpunkte (`/api/shop/catalog`, `/api/shop/cart/checkout-draft`) aufrief | Alte Shop-Platte entfernt; diese Seiten zeigen jetzt den Shop-Einstieg (Suche, Kategorien, Links) auf die echten Routen | Preview: keine 404-Aufrufe mehr |
| `/teileklar/partner-werden`: Formular hing am alten Gateway (`/api/partner/requests`), im Preview nicht erreichbar; es gab nie eine Bestätigung | Partneranfrage über `POST /api/requests` (kind=partner) mit Validierung, Speicherung und Vorgangsnummer | Test `test_contact_and_partner_requests` |
| `/kontakt`: Prototyp verlangt `POST /v1/requests` mit Vorgangsnummer; neuer Build hatte nur den Assistenten (offline) | `ContactRequestForm` mit Pflichtfeldern, Einwilligung, Serverprüfung, Ratenlimit, Vorgangsnummer; Mail an Admin, sobald Resend gesetzt ist | Test und Preview |
| `/teileklar/fahrzeug-und-passung`: nur Text, keine der drei Prototyp-Funktionen | Passungs-Checkliste und Reifenrechner (Prototyp-Formel) umgesetzt; Batterie-Berater als ehrlicher Platzhalter | Preview |
| `/teileklar/termine`, `/teileklar/gutscheine`: Text beschrieb Funktionen, die es nicht gibt | Kurzer Hinweis „folgt in Kürze“ und Weg zur Werkstattsuche | Preview |
| Workspace-Willkommenstext versprach „Online-Bestellungen derzeit nicht möglich“, obwohl der Shop läuft | Satz entfernt | Preview |
| Plattform-Umbenennung hatte Quell-IDs (ChatGPT-messageId) in Verträgen und im Masterplan überschrieben | Auf den committeten Stand zurückgesetzt | `git diff` leer |

## Proaktive Verbesserungen

| Änderung | Begründung |
|---|---|
| Admin-Endpunkte: anonym 401 statt 403 | Fehlende Anmeldung und fehlende Rolle müssen unterscheidbar sein |
| Registrierung: gleichzeitige Doppelanmeldung ergibt 409 statt 500 | Konsistente Fehlermeldung bei Race Condition |
| Passwort-Reset und Kontaktanfrage: Mailfehler werden gespeichert, die Antwort bleibt neutral | Kein 500er, keine Kontenaufzählung, kein vorgetäuschter Versand |
| Doppelte Fehlermeldung bei bereits registrierter E-Mail entfernt | Eine Meldung am Feld genügt |
| Formulare: `noValidate` + eigene, verständliche Feldfehler mit `aria-invalid` | Barrierefreiheit und einheitliche Meldungen |
| Reifenrechner: Ergebnis in `aria-live`, Auswahllisten mit 44 px Mindesthöhe | Screenreader und Touch |
| Next.js im Preview im Produktionsmodus | Dev-HMR-WebSocket brach im Preview ab und verzögerte die Hydration |
| Link-Crawl aller öffentlichen Routen: 0 kaputte interne Links | JRN-116 |

## Nachtrag: Rechter Chat (REQ-125..134)

| Anweisung | Status | Phase | Umsetzung |
|---|---|---|---|
| Angedockte Spalte im Layout-Grid unter dem Header, kein Overlay (Desktop) | implemented | 1b | `.workspace-shell` mit Grid-Spalte `--layout-panel-width` |
| Live-Ziehen 320 px bis 50 % Viewport | implemented | 1b | `ChatResizeHandle` (Pointer Capture), Klemmung bei Fenstergrößenwechsel |
| Tastatur: Pfeiltasten in 16-px-Schritten, `role=separator`, `aria-valuenow`; Home/End = Minimum/Maximum, Enter/Doppelklick = Standard | implemented | 1b | Preview-Messung: 403 → 720 → 672 px, Reload behält 672, Doppelklick → Standard |
| Seite fließt per Container Queries mit | implemented | 1b | Header wechselt auf Menü, Shop-Grid/Formulare passen sich an, `scrollWidth` = Viewport |
| Einklappen gibt Breite frei, sichtbarer Öffnen-Button, Zustand pro Session | implemented | 1b | `nx-chat-open` / `nx-chat-width` in sessionStorage |
| Zu schmal: eine Hauptansicht, Chat als Drawer (Tastatur, Safe Area) | implemented | 1b | bestehender Drawer ≤ 820 px, Griff dort ausgeblendet |
| Begrenzte Lesespalte, Composer bündig | implemented | 1b | `max-width: 72ch` für Kopf, Verlauf und Composer |
| Gleiches Verhalten im internen Workspace-Arbeitsbereich | out-of-phase | 6 | interner Workspace ist geschlossen (Phase 6) |
