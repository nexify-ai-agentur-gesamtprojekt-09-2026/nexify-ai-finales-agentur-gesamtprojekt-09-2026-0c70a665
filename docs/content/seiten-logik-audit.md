# Seiten-Logik-Audit (Phase 1b, REQ-117..124)

Stand: 31.10.2026. Maßstab sind die Prototypen in `prototypen/`. Sie legen Funktion, Zustände, Formulare, Validierungen und Berechnungen fest; sichtbare Text-Anweisungen gelten als Bauanweisung, nicht als Kundentext. Das neue Design (`packages/tokens`, `apps/web`) bleibt die visuelle Quelle.

Erzeugt mit `python3 tools/build_seiten_logik_audit.py`. Die Rohdaten liefert `tools/prototype_audit_extract.py`: TODO(BACKEND), `data-api-endpoint`, Formulare/Felder, Logikmethoden aus den `text/x-dc`-Skripten, Zustände und Handoff-Texte. Die Status sind in `tools/build_seiten_logik_audit.py` (FILE_DEFAULT, RULES) begründet und geprüft.

Status: `implemented` = im neuen Build vorhanden und im Preview geprüft · `wrong` = vorhanden, aber falsch (wird korrigiert) · `missing` = fehlt · `out-of-phase` = gehört in eine spätere Phase, dort ehrlicher Platzhalter oder geschlossene Route.

Phasen: 1 Shop/Auth/Werkstattsuche · 1b Seitenlogik + Textkonzept · 2 Shop-Ausbau (Fahrzeug/Passung, Mails, Rechnungen, Stadtseiten) · 3 Portale · 4 myADMIN/Leitstand · 5 NeX2fly/one/API · 6 Arbeitsplatzdienste · 7 Medien/Material · 8 Go-Live.

## Zusammenfassung

- implemented: 66
- wrong: 0
- missing: 39
- out-of-phase: 202

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

## Prototypen im Einzelnen

### API-Rechtliches.dc.html

- Route(n): /produkte/api (public)
- Gesamtstatus: implemented · Zielphase 1b · Rechtstexte API auf /produkte/api und /vertragsgrundlagen

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Zustände | bestätigt, gespeichert | implemented | 1 | Lade-, Leer-, Fehlerzustände in Shop/Werkstattsuche/Auth |
| Text | NeXify AI API – Nutzungs- und Prepaid-Bedingungen | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Entwurf vom 28.09.2026 – nicht in Kraft. Vor Veröffentlichung anwaltlich (NL und DE) und steuerlich prüfen und durch Pascal Courbois freigeben. Ergänzt die allgemeinen AGB von NeXify AI; bei Widerspruch gehen diese Bedin | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Angestrebt sind 99,5 % im Kalendermonat ohne angekündigte Wartung. Ausfälle vorgelagerter Modellanbieter leitet NeXify, wo möglich, auf gleichwertige Stufen um; für Tokenkosten fehlgeschlagener Anfragen wird nichts berec | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Der Kunde hält API-Schlüssel geheim und widerruft sie bei Verdacht auf Missbrauch sofort in der Konsole. Anfragen mit einem nicht widerrufenen Schlüssel gelten als Anfragen des Kunden. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Untersagt sind rechtswidrige Inhalte, Umgehung von Sicherheitsfiltern, Einsatz für nach Art. 5 KI-Verordnung verbotene Praktiken sowie das Weiterverkaufen des Zugangs ohne Vereinbarung. Für eigene Hochrisiko-Anwendungen  | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Das Guthaben ist eine Vorauszahlung auf Leistungen von NeXify. Es ist nicht übertragbar, nicht verzinst und nur für die API von NeXify einlösbar. Es ist kein E-Geld. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Affiliate-Portal.dc.html

- Route(n): /portal/affiliate (private)
- Gesamtstatus: out-of-phase · Zielphase 3 · Affiliate-Portal bleibt geschlossen

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 1 Formular(e); Felder: select, z. B. herbst-artikel | out-of-phase | 3 | Affiliate-Portal bleibt geschlossen |
| Logik | say | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |

### Anmeldung.dc.html

- Route(n): /anmelden (public), /registrieren (public)
- Gesamtstatus: implemented · Zielphase 1 · /anmelden, /registrieren (eigene Konten, D-007)

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: input, rolle | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Logik | starteLicht | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | lauf | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | grainTile | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | zeichne | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |

### Batterie-Berater.dc.html

- Route(n): /teileklar/fahrzeug-und-passung (public)
- Gesamtstatus: missing · Zielphase 2 · Platzhalter auf /teileklar/fahrzeug-und-passung; Kapazitätstabellen brauchen technische Quellenprüfung

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Logik | num | missing | 2 | Platzhalter PhaseNotice tk-battery |
| Logik | opt | missing | 2 | Platzhalter PhaseNotice tk-battery |

### E-Mail-Marketing-Newsletter.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Marketingmaterial

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### E-Mail-Transaktional-Angebot.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 2 · Transaktionsmails (Resend) Phase 2

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Zustände | gesendet | out-of-phase | 2 | Transaktionsmails (Resend) Phase 2 |

### Fitment-Checker.dc.html

- Route(n): /teileklar/produkt (public), /teileklar/fahrzeug-und-passung (public)
- Gesamtstatus: implemented · Zielphase 1b · FitmentChecklist auf /teileklar/fahrzeug-und-passung

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: BGT | implemented | 1b | FitmentChecklist auf /teileklar/fahrzeug-und-passung |

### Geschaeftsdokumente-Vorlagen.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | Umsetzung wird tagesweise abgerechnet und ist jederzeit ohne Verpflichtung pausierbar. Dieses Angebot ist freibleibend und gültig bis zum genannten Datum. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | NeXify Care ist ein optionales, monatlich kündbares Betreuungsabo. Die erste Abrechnung erfolgt nach Vertragsbeginn. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Investoren-PowerPoint.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | Vier Phasen bis zur Skalierung. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Konto.dc.html

- Route(n): /teileklar/konto (private)
- Gesamtstatus: out-of-phase · Zielphase 3 · Kontobereich; Bestellübersicht bereits /teileklar/bestellungen

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### Kundenbroschuere.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### Kundenportal.dc.html

- Route(n): /leistungen/apps-portale (public), /leistungsumfang (public), /anmelden (public), /registrieren (public), /portal/kunde (private)
- Gesamtstatus: out-of-phase · Zielphase 3 · Kundenportal /portal/kunde bleibt geschlossen (401/403)

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| TODO(BACKEND) | TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | implemented | 1 | /api/auth/login, /api/auth/register |
| data-api-endpoint | auth/login | implemented | 1 | /api/auth/login, /api/auth/register |
| data-api-endpoint | offers/{id}/pdf | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | offers/{id}/change-request | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | offers/{id}/decline | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | offers/{id}/accept | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | billing/invoices/{id}/pdf | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | billing/invoices/{id}/pay | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | crosssell/orders | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | documents/{id} | out-of-phase | 3 | Portal-Endpunkte |
| Formular | 2 Formular(e); Felder: name@firma.de, textarea, •••••••• | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | setView | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | doLogin | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | doLogout | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | dokument | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | toast | implemented | 1 | Statusmeldungen (aria-live) |
| Logik | dlOffer | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | dlInvoice | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | openDialog | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | submitDialog | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | acceptOffer | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Logik | payInvoice | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Text | Projektphase jederzeit nachvollziehbar | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Text | <!-- TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | implemented | 1 | /api/auth/login, /api/auth/register |
| Text | Willkommen zurück, {{ firmenname }}. Ihr Pilot-Paket ist in Phase „{{ aktuellePhaseLabel }}" – und ein neues Angebot wartet auf Ihre Entscheidung. | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Text | Phase {{ aktuellePhaseNum }} von 4 | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |
| Text | Auditierbarer Status – jede Phase mit Zeitstempel bei Übergang. | out-of-phase | 3 | Kundenportal /portal/kunde bleibt geschlossen (401/403) |

### Kundenwege.dc.html

- Route(n): /leistungsumfang (public), /wissen/projekt-vorbereiten (public)
- Gesamtstatus: out-of-phase · Zielphase 6 · Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b)

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 2 Formular(e); Felder: input | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | jetzt | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | konto | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | angebot | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | versuch | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | setReg | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | setAng | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | setOb | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | obStart | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Logik | obSchritt | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Zustände | fehler | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |
| Text | Ein Konto, drei Rollen. Wählen Sie, womit Sie beginnen – weitere Rollen lassen sich später ergänzen. | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Text | Kostenpflichtig beauftragen | out-of-phase | 6 | Bedarfsaufnahme/CRM-Wege; öffentliche Seiten nur Text (1b) |

### NX-Footer.dc.html

- Route(n): ohne Route
- Gesamtstatus: implemented · Zielphase 1b · SiteFooter; Texte im Textkonzept

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: dynamisch | implemented | 1b | SiteFooter; Texte im Textkonzept |
| Logik | ewLaden | implemented | 1b | SiteFooter; Texte im Textkonzept |
| Logik | ewEntscheiden | implemented | 1b | SiteFooter; Texte im Textkonzept |

### NX-Header.dc.html

- Route(n): ohne Route
- Gesamtstatus: implemented · Zielphase 1b · SiteNavigation; Beschriftungen im Textkonzept

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### NX-Intern.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 6 · intern

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### Nachbarschaftskunden-Portal.dc.html

- Route(n): /teileklar/termine (public), /teileklar/gutscheine (public), /teileklar/nachbarschaft (private)
- Gesamtstatus: out-of-phase · Zielphase 3 · Nachbarschaftsportal bleibt geschlossen

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| TODO(BACKEND) | TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| TODO(BACKEND) | TODO(BACKEND): POST auth/register (Rolle=nachbarschaftskunde) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| TODO(BACKEND) | TODO(BACKEND): POST customer/vouchers/redeem – Code eindeutig, Ablauf 90 Tage, einmalige Einlösung --> | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | auth/login | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| data-api-endpoint | auth/register | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| data-api-endpoint | customer/appointments/{id}/status | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | customer/vouchers/redeem | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | customer/appointments | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | documents/{id} | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | crosssell/orders | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | account/data-rights | missing | 2 | Datenexport/Löschung für Shop-Konten |
| Formular | 3 Formular(e); Felder: Erika Mustermann, NXK-7734, input, name@beispiel.de, z. B. NXK-7734, •••••••• | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Logik | setView | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | setAuthTab | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | doLogin | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | doLogout | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | setApptStatus | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | handleEinloesen | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | bookAppt | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Logik | dl | out-of-phase | 3 | Nachbarschaftsportal bleibt geschlossen |
| Text | <!-- TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Text | <!-- TODO(BACKEND): POST auth/register (Rolle=nachbarschaftskunde) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Text | <!-- TODO(BACKEND): POST customer/vouchers/redeem – Code eindeutig, Ablauf 90 Tage, einmalige Einlösung --> | out-of-phase | 3 | Portal-Endpunkte |

### NeXify AI one.dc.html

- Route(n): /leistungen/agenten-automatisierung (public), /loesungen (public), /produkte/nex2fly (public), /produkte/one (public)
- Gesamtstatus: out-of-phase · Zielphase 5 · Produktfunktionen one/one+; Seitentext Phase 1b

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 1 Formular(e); Felder: input | out-of-phase | 5 | Produktfunktionen one/one+; Seitentext Phase 1b |
| Logik | obSet | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | obRC | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | obBrutto | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | obEur | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | feldStarten | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | heroTerminal | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | start | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | weiter | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | entscheide | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Zustände | fehler | out-of-phase | 5 | Produktfunktionen one/one+; Seitentext Phase 1b |
| Text | NeXify AI one und one+ – Unternehmens-KI per Web, API und Terminal | out-of-phase | 5 | Produktfunktionen one/one+; Seitentext Phase 1b |
| Text | Web · API · Terminal – ein Konto, ein Guthaben | out-of-phase | 5 | Produktfunktionen one/one+; Seitentext Phase 1b |
| Text | Demo · vorbereiteter Ablauf | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | Web-Chat, API und Terminal-Chat | out-of-phase | 5 | Produktfunktionen one/one+; Seitentext Phase 1b |
| Text | 05 · Bestellstrecke als Demo | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | Diese Strecke ist eine Demo: Es wird nichts abgebucht, es entsteht kein Vertrag und der Schlüssel am Ende funktioniert nicht. Sie sehen, was im Betrieb passiert und welche Belege Sie bekommen. | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | DEMO · GUTHABEN GEBUCHT · {{ oBeleg }} | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | Schlüssel (wird nur einmal angezeigt – Demo, ungültig): {{ oKey }} $ nexify login --key nx_demo_… $ nexify cost → Guthaben {{ oNetto }} · reicht bei 0,50 €/Auftrag für ca. {{ oAuftraege }} Aufträge | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |

### NeXify API.dc.html

- Route(n): /preise-ablauf (public), /produkte/nex2fly (public), /produkte/api (public), /portal/api (private)
- Gesamtstatus: out-of-phase · Zielphase 5 · API-Konsole/Prepaid; Seitentext Phase 1b

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: input, z. B. kundenservice | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Logik | melde | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Logik | webhook | out-of-phase | 5 | Bestell-/Konsolenstrecke one/API |
| Zustände | bestätigt, fehler, gespeichert | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | NeXify AI API – Prepaid, EU-Hosting, eine Rechnung | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | NeXify AI API · Prepaid · EU-Hosting Frankfurt | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Jeder Anbieter hat eigene Preise, eine eigene Abrechnung und eigene Datenschutzfragen. Was eine Abteilung verbraucht hat, zeigt sich erst am Monatsende. Bei der NeXify AI API steht jede Anfrage mit ihren Kosten in Cent i | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Vor jeder Anfrage reservieren wir die Höchstkosten. Reicht das Guthaben oder das Budget der Kostenstelle nicht, weisen wir die Anfrage ab, bevor etwas berechnet wird. Jede Antwort nennt die tatsächlichen Kosten in Cent u | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Budget je Kostenstelle, harte Grenze bei leerem Guthaben | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Sie sprechen ein API-kompatibles Protokoll. Dahinter entscheidet das Gateway, welches Modell antwortet, prüft Budget und Rechte und schreibt jede Anfrage in ein unveränderliches Journal. | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Jede Antwort trägt Kennzeichnung und Kosten. Pflichtheader: | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |
| Text | Preis je Anfrage = Einkaufspreis des Modells × {{ formelText }}. Keine Rundung je Anfrage – auf Cent gerundet wird erst je Rechnungsposition. Sinkt der Einkaufspreis, sinkt Ihr Preis mit. | out-of-phase | 5 | API-Konsole/Prepaid; Seitentext Phase 1b |

### NeXify Designsystem.dc.html

- Route(n): ohne Route
- Gesamtstatus: implemented · Zielphase 1 · packages/tokens + config/design-tokens.json

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: input | implemented | 1 | packages/tokens + config/design-tokens.json |
| Zustände | fehler | implemented | 1 | Lade-, Leer-, Fehlerzustände in Shop/Werkstattsuche/Auth |
| Text | Erfolg · Vorgang NX-ANF-2026-00412 angelegt. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Bewegung bedeutet Zustand. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### NeXify Leitstand.dc.html

- Route(n): /intern/leitstand (internal)
- Gesamtstatus: out-of-phase · Zielphase 4 · intern

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: FREIGABE LIVE-DNS … Pascal, TT.MM.JJJJ HH:MM, Grund bei Ablehnung (wird Lernsignal) | out-of-phase | 4 | intern |
| Logik | normAlle | out-of-phase | 4 | intern |
| Logik | pfStart | out-of-phase | 4 | intern |
| Logik | pfTun | out-of-phase | 4 | intern |
| Logik | say | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | kerne | out-of-phase | 4 | intern |
| Logik | scan | out-of-phase | 4 | intern |
| Logik | signal | out-of-phase | 4 | intern |
| Logik | canary | out-of-phase | 4 | intern |
| Zustände | gespeichert, leer | out-of-phase | 4 | intern |

### NeXify Posteingang.dc.html

- Route(n): /intern/posteingang (internal)
- Gesamtstatus: out-of-phase · Zielphase 4 · intern; Anfragen werden bereits in db.requests gespeichert

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: Absender, Betreff, Kunde, Fall …, Antwortentwurf | out-of-phase | 4 | intern; Anfragen werden bereits in db.requests gespeichert |
| Logik | say | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |

### NeXify Shop.dc.html

- Route(n): /teileklar/kasse (public)
- Gesamtstatus: implemented · Zielphase 1 · Shop-Muster, umgesetzt als TEILEKLAR-Kasse

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| TODO(BACKEND) | TODO(BACKEND): POST /v1/shop/orders (Idempotency-Key), Zahlung via Zahlungsanbieter Merchant API, Webhook bestätigt | implemented | 1 | /api/shop/checkout mit Idempotency-Key, Revolut-Webhook |
| Formular | 3 Formular(e); Felder: Höchstpreis, Sortierung, gs, input, select, sh-q, versand, zahlung | implemented | 1 | Shop-Muster, umgesetzt als TEILEKLAR-Kasse |
| Logik | toast | implemented | 1 | Statusmeldungen (aria-live) |
| Logik | go | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | add | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | setQty | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | brutto | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | preis | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | summen | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | karte | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | liste | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Zustände | bestätigt, fehler, leer, lädt | implemented | 1 | Lade-, Leer-, Fehlerzustände in Shop/Werkstattsuche/Auth |
| Text | MUSTER-SHOP · DEMO – keine echte Lieferung, keine Zahlung · Produkte und Marken sind fiktiv | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | Nichts gefunden{{ leerZusatz }}. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Geschäftskunde: Preise netto. Mit gültiger USt-IdNr. eines anderen EU-Landes entfällt die Umsatzsteuer (Reverse Charge) – die Prüfung erfolgt im Betrieb über VIES. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Demo: Zahlung ablehnen lassen, um die Fehlermeldung zu sehen | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | BESTELLUNG EINGEGANGEN · {{ bestellNr }} · DEMO | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |

### NeXify Systemkarte.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 6 · intern

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### NeXify Workspace.dc.html

- Route(n): /leistungen/agenten-automatisierung (public), /intern/workspace (internal)
- Gesamtstatus: out-of-phase · Zielphase 6 · intern

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 1 Formular(e); Felder: Agent oder Modell suchen, Agenten suchen, Chat umbenennen, Chats durchsuchen, Nachricht bearbeiten, Skills suchen, input, textarea, z. B. Antworte knapp, in Stichpunkten. | out-of-phase | 6 | intern |
| Logik | zugangAnwenden | out-of-phase | 6 | intern |
| Logik | zweiSchritt | out-of-phase | 6 | intern |
| Logik | herunterladen | out-of-phase | 6 | intern |
| Logik | saveRuns | out-of-phase | 6 | intern |
| Logik | tickRuns | out-of-phase | 6 | intern |
| Logik | startRun | out-of-phase | 6 | intern |
| Logik | runAction | out-of-phase | 6 | intern |
| Logik | runView | out-of-phase | 6 | intern |
| Logik | say | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | setSettings | out-of-phase | 6 | intern |
| Logik | updConv | out-of-phase | 6 | intern |
| Logik | pickAgentFromText | out-of-phase | 6 | intern |
| Logik | stream | out-of-phase | 6 | intern |
| Logik | send | out-of-phase | 6 | intern |
| Logik | regenerate | out-of-phase | 6 | intern |
| Logik | stop | out-of-phase | 6 | intern |
| Logik | suggestionsFor | out-of-phase | 6 | intern |
| Zustände | gespeichert | out-of-phase | 6 | intern |

### NeXify-AI-Companion.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 5 · Assistent läuft im Orientierungsmodus; Live-KI Phase 5

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: input | out-of-phase | 5 | Assistent läuft im Orientierungsmodus; Live-KI Phase 5 |
| Zustände | error, success | out-of-phase | 5 | Assistent läuft im Orientierungsmodus; Live-KI Phase 5 |
| Text | Status: {{ previewState }} | out-of-phase | 5 | Assistent läuft im Orientierungsmodus; Live-KI Phase 5 |
| Text | export type NexifyAiState = \| "idle" \| "thinking" \| "research" \| "browsing" \| "building" \| "orchestrating" \| "validating" \| "success" \| "warning" \| "error" \| "autopilot"; export type NexifyAiPresence = { state | out-of-phase | 5 | Assistent läuft im Orientierungsmodus; Live-KI Phase 5 |
| Text | Bei konkurrierenden Zuständen (Visual-Fallback – die reale Produkt-State-Machine hat immer Vorrang): | out-of-phase | 5 | Assistent läuft im Orientierungsmodus; Live-KI Phase 5 |

### NeXifyAI Cloud v12.dc.html

- Route(n): / (public), /leistungen (public), /leistungen/websites (public), /loesungen (public), /preise-ablauf (public), /unternehmen (public), /kontakt (public)
- Gesamtstatus: missing · Zielphase 1b · Öffentliche Agenturseiten; Texte im Gesamt-Textkonzept

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| TODO(BACKEND) | TODO(BACKEND): POST /v1/requests → Posteingang; Antwort liefert Vorgangsnummer | implemented | 1b | ContactRequestForm -> POST /api/requests, Vorgangsnummer |
| data-api-endpoint | POST /v1/requests | implemented | 1b | ContactRequestForm -> POST /api/requests, Vorgangsnummer |
| Formular | 3 Formular(e); Felder: chat-eingabe, input, select, textarea | missing | 1b | Öffentliche Agenturseiten; Texte im Gesamt-Textkonzept |
| Logik | feldStarten | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | d1Zeilen | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | setDemo2 | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | demoStarten | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | heroFluss | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | stationGrafik | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | tagesleiste | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | signet | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | phasenRail | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | bausteinGrafik | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | antworte | out-of-phase | 7 | Demo-Animation/Visual, kein Funktionsumfang |
| Logik | pruefeForm | implemented | 1b | ContactRequestForm -> POST /api/requests, Vorgangsnummer |
| Zustände | fehler, gespeichert | missing | 1b | Öffentliche Agenturseiten; Texte im Gesamt-Textkonzept |
| Text | Demo · vorbereiteter Ablauf | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Text | Alle vier laufen auf derselben Unternehmens-KI, mit einem Konto und einer Rechnung. Wählen Sie den Weg, der zu Ihrem Vorhaben passt – kombinieren lässt er sich später. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Die KI selbst, im Browser, per API und im Terminal (nexify). one antwortet, one+ arbeitet – mit Rückfrage. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Angebote annehmen, Projekte verfolgen | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Das Signet ist kein Dekor. Es zeigt den Zustand der Instanz: hört zu, arbeitet, hat ein Ergebnis, braucht Sie. Jeder Zustand steht zusätzlich als Text da, damit niemand raten muss. Jede Antwort ist als KI-Antwort gekennz | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Pflichtfelder sind markiert. Kein Newsletter, keine Weitergabe. Server in Frankfurt. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### NeXifyAI-Local-SEO-Muster.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | 449 € pro Arbeitstag, jederzeit ohne Verpflichtung pausierbar. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### NeXifyAI-Wissenshub-Artikel.dc.html

- Route(n): /wissen (public), /wissen/projekt-vorbereiten (public)
- Gesamtstatus: missing · Zielphase 1b · Wissensseiten; Artikeltexte im Gesamt-Textkonzept

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | Die beste Idee scheitert an fehlendem API-Zugang oder Daten, die nur in Köpfen existieren. Der Audit-Tag prüft das zuerst – vor jeder Preisaussage. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Ergebnis ist ein schriftliches Angebot mit Prioritäten und realistischem Tagesaufwand – kein Verkaufsgespräch, keine Verpflichtung. Passt der erste Schritt, folgt meist ein Pilot-Paket. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Partner-Broschuere.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### Partner-PowerPoint Werkstatt.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|

### Partner-werden.dc.html

- Route(n): /teileklar/partner-werden (public)
- Gesamtstatus: implemented · Zielphase 1b · Partneranfrage über /api/requests (kind=partner)

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | Nur wahrgenommene Termine werden berechnet. Zahlbar in 7 Tagen mit 2 % Skonto, danach zum vollen Betrag. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Sie sind kein Handelsvertreter: keine Exklusivität, keine Abschlussvollmacht, keine Vertriebspflicht. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Muss ich Teile über TEILEKLAR beziehen? | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Dann wird nichts berechnet. Abrechenbar ist nur ein Termin, den Sie als wahrgenommen markiert haben und dem der Kunde innerhalb von sieben Tagen nicht widersprochen hat. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Sie. Der Werkstattvertrag kommt ausschließlich zwischen Ihnen und dem Kunden zustande – NeXifyAI vermittelt, ist aber nicht Vertragspartner der Reparaturleistung. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Partnerportal.dc.html

- Route(n): /leistungen/apps-portale (public), /teileklar/gutscheine (public), /teileklar/partner-werden (public), /teileklar/partnerportal (private)
- Gesamtstatus: out-of-phase · Zielphase 3 · Partnerportal bleibt geschlossen

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| TODO(BACKEND) | TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| TODO(BACKEND) | TODO(BACKEND): POST auth/register (Partnerkonto, Rolle=partner) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| TODO(BACKEND) | TODO(BACKEND): POST partner/vouchers/order – Fulfillment über Print-on-Demand-API + Zahlungsanbieter --> | out-of-phase | 3 | Portal-Endpunkte |
| TODO(BACKEND) | TODO(BACKEND): PUT partner/profile – speist den Partnerseiten-Generator (Kapitel 04.2) --> | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | auth/login | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| data-api-endpoint | auth/register | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| data-api-endpoint | partner/appointments/{id}/status | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | partner/vouchers/orders | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | billing/invoices/{id}/pdf | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | billing/invoices/{id}/pay | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | partner/profile | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | crosssell/orders | out-of-phase | 3 | Portal-Endpunkte |
| data-api-endpoint | documents/{id} | out-of-phase | 3 | Portal-Endpunkte |
| Formular | 4 Formular(e); Felder: Autohaus Mustermann, input, select, textarea, werkstatt@beispiel.de, •••••••• | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Logik | eur | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | setView | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | setAuthTab | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | doLogin | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | doLogout | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | saveProfil | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | dl | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | addOrder | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | setApptStatus | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Logik | payInvoice | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Zustände | gespeichert | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Text | Erfolgsbasiert: 19,90 € nur je zugeführtem Kunden | out-of-phase | 3 | Partnerportal bleibt geschlossen |
| Text | <!-- TODO(BACKEND): POST auth/login (bcrypt/JWT, gemeinsamer Unterbau aller drei Portale) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Text | <!-- TODO(BACKEND): POST auth/register (Partnerkonto, Rolle=partner) --> | out-of-phase | 3 | Partner-/Nachbarschaftsrollen erst mit Portalen |
| Text | <!-- TODO(BACKEND): POST partner/vouchers/order – Fulfillment über Print-on-Demand-API + Zahlungsanbieter --> | out-of-phase | 3 | Portal-Endpunkte |
| Text | <!-- TODO(BACKEND): PUT partner/profile – speist den Partnerseiten-Generator (Kapitel 04.2) --> | out-of-phase | 3 | Portal-Endpunkte |
| Text | Kalkulationsbeispiel – zeigt Umsatz, keinen Gewinn. Vor Vertriebsargumentation mit echten Partnerzahlen validieren. | out-of-phase | 3 | Partnerportal bleibt geschlossen |

### Rechtliches.dc.html

- Route(n): /impressum (public), /datenschutz (public), /vertragsgrundlagen (public), /ki-hinweise (public), /barrierefreiheit (public), /cookies (public), /teileklar/rechtliches (public)
- Gesamtstatus: implemented · Zielphase 1b · Rechtsseiten vorhanden; Faktenabgleich im Textkonzept

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Text | Alle Pflichtangaben an einem Ort – Entwurf Fassung 0.9, anwaltliche Prüfung vor Live-Betrieb. Jeder Abschnitt nennt Fassung und Stand. Die API-Bedingungen stehen auf einer | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Reifenrechner.dc.html

- Route(n): /teileklar/fahrzeug-und-passung (public)
- Gesamtstatus: implemented · Zielphase 1b · TyreCalculator auf /teileklar/fahrzeug-und-passung

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: select | implemented | 1b | TyreCalculator auf /teileklar/fahrzeug-und-passung |
| Logik | num | implemented | 1b | TyreCalculator (gleiche Formel, Index-Hinweise) |
| Logik | dia | implemented | 1b | TyreCalculator (gleiche Formel, Index-Hinweise) |

### TEILEKLAR Shop.dc.html

- Route(n): /loesungen (public), /teileklar (public), /teileklar/suche (public), /teileklar/kategorien (public), /teileklar/kategorie (public), /teileklar/produkt (public), /teileklar/warenkorb (public), /teileklar/kasse (public), /teileklar/rechtliches (public)
- Gesamtstatus: implemented · Zielphase 1 · Shop-Routen /teileklar/*

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 4 Formular(e); Felder: Erika Mustermann, erika@beispiel.de, input, •••••••• | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Logik | setConsent | implemented | 1 | DiagnosticConsent |
| Logik | wipeLocal | missing | 2 | Datenexport/Löschung für Shop-Konten |
| Logik | exportData | missing | 2 | Datenexport/Löschung für Shop-Konten |
| Logik | coNext | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | notify | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | go | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | chip | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | label | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | prod | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | hoursText | implemented | 1 | /api/workshops/search, Radius, Karte |
| Logik | loadShops | implemented | 1 | /api/workshops/search, Radius, Karte |
| Logik | loadLegal | implemented | 1b | /teileklar/rechtliches |
| Logik | openLegal | implemented | 1b | /teileklar/rechtliches |
| Logik | slugifyCity | missing | 2 | Stadtseiten (Phase-2-Umfang) |
| Logik | standortBetriebe | implemented | 1 | /api/workshops/search, Radius, Karte |
| Logik | cityList | implemented | 1 | /api/workshops/search, Radius, Karte |
| Logik | openCity | missing | 2 | Stadtseiten (Phase-2-Umfang) |
| Logik | openProduct | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | guideLoc | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | openGuideAt | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | market | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | c | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | sym | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | symList | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | money | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Logik | advisor | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | vehicleObj | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | push | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | say | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | user | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | openChat | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | closeChat | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | adviseProduct | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | explainNeeds | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | chatAction | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Logik | chatSubmit | out-of-phase | 2 | KI-Berater und Fahrzeugbezug |
| Zustände | fehler | implemented | 1 | Lade-, Leer-, Fehlerzustände in Shop/Werkstattsuche/Auth |
| Text | Vier Angaben – passende Kapazität, Kälteprüfstrom und die Bauart, die bei Start-Stopp Pflicht ist. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Sendungsverfolgung und Rückgabe findest du direkt in der Bestellung. | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |
| Text | Produkt, Rechtsrahmen, Beratungslogik und Partnerbasis sind fertig gebaut – die Aufbauphase, die andere Jahre und siebenstellige Budgets kostet, ist abgeschlossen. Kapital fließt damit nicht in Entwicklung, sondern direk | missing | 1b | Inhalt im Gesamt-Textkonzept neu schreiben (Handoff-Text ist Anweisung, kein Kundentext) |

### Visitenkarte-Pascal-Courbois.dc.html

- Route(n): ohne Route
- Gesamtstatus: out-of-phase · Zielphase 7 · Vertriebsmaterial ohne Route

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Logik | buildVCard | out-of-phase | 7 | Vertriebsmaterial ohne Route |
| Logik | renderQr | out-of-phase | 7 | Vertriebsmaterial ohne Route |
| Logik | share | out-of-phase | 7 | Vertriebsmaterial ohne Route |
| Logik | setTimeout | out-of-phase | 7 | Vertriebsmaterial ohne Route |

### Werkstatt-Partnerseite.dc.html

- Route(n): /teileklar/termine (public), /teileklar/werkstatt (public)
- Gesamtstatus: implemented · Zielphase 1 · /teileklar/werkstatt, Detailansicht je Betrieb

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 0 Formular(e); Felder: dynamisch | implemented | 1 | /teileklar/werkstatt, Detailansicht je Betrieb |
| Logik | legalDocs | implemented | 1b | /teileklar/rechtliches |
| Logik | slug | implemented | 1b | /teileklar/rechtliches |

### myADMIN v2.dc.html

- Route(n): /leistungen/apps-portale (public), /intern/verwaltung (internal)
- Gesamtstatus: out-of-phase · Zielphase 4 · Phase 1: nur /teileklar/admin (Aufschlag, Import)

| Art | Anweisung | Status | Phase | Umsetzung / Begründung |
|---|---|---|---|---|
| Formular | 6 Formular(e); Felder: 0,00, DE123456789, Name, Tag oder Bereich, Titel oder Inhalt, Was soll entstehen?, Was wurde besprochen, was ist offen?, input, myadmin-palette-input, select, textarea, z. B. Absch | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | callBeginn | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | callEnde | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | spur | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | extra | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | studioGen | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | muster | implemented | 1 | Kein Demo-Hinweis nötig: echte Funktion bzw. ehrlicher Platzhalter |
| Logik | abt | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | crm | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | treffer | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | set | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Logik | preis | implemented | 1 | Katalog/Warenkorb/Kasse, serverseitige Summen |
| Zustände | gespeichert | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | : Es fehlt der End-to-End-Gegentest gegen ein laufendes Backend auf der Vorschau-Stufe. Dieselben Fälle laufen unter Vitest: | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | ), plus die API-Abrechnung. Vertrag und Architektur: | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | docs/03-backend/backend-architektur.md | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | „Bewährt“: mindestens 3× verwendet und höchstens jede fünfte Verwendung korrigiert. Jede Korrektur erhöht die Version. Später schlägt der Optimierer bewährte Bausteine als Kontextschicht S3 vor (AP-13). | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | Hilfsrechnung, keine Buchhaltung im Sinne der Aufbewahrungspflicht. Steuersätze und Reverse Charge mit Ihrer Steuerberatung abstimmen. Belegbilder, Bankabgleich und Export an die Steuerberatung folgen mit AP-22. | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
| Text | {{ kSelPhase }} · {{ kSelQuelle }} | out-of-phase | 4 | Phase 1: nur /teileklar/admin (Aufschlag, Import) |
