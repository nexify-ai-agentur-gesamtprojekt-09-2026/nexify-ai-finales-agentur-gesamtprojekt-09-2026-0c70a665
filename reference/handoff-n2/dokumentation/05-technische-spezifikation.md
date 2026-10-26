# 05 · Technische Spezifikation

Bezug: `docs/adr/0001…0008`, `docs/03-backend/*`, `config/*.json`. Dieses Dokument fasst den **Soll** zusammen; Abweichungen zu ADRs entscheidet Pascal.

## 1. Architektur (modularer Monolith, ADR-0001)
```
Browser / Terminal (nexify) / Kunden-Software
        │  HTTPS
   api.nexifyai.cloud  ── Gateway (Auth, Rate-Limit, Budget-Prüfung, Journal)
        │
        ├─ Kern (Domäne): Konten · Rollen · Angebote · Projekte · Abnahme · Rechnungen · Tickets
        ├─ Shop-Modul: Katalog · Warenkorb · Bestellung · Steuer · Versand   (generisch, mandantenfähig)
        ├─ Ledger: Guthaben · Buchungen (doppelt, unveränderlich) · Revolut-Webhooks
        ├─ KI-Router (9Router :20128): Stufe 0 lokal · 1 günstig · 2 stark · Werkzeugschicht (MCP)
        ├─ Wissen: Postgres + Vektor · RAG · Ingest-Pipeline
        └─ Nachtlauf / Wächter / Selbstheilung
   Daten: PostgreSQL (Frankfurt), Zeilenebenen-Sicherheit je Mandant (ADR-0008) · Objektspeicher versioniert · Geheimnisse OpenBao · Traces Langfuse
```

## 2. Öffentliche API (v1)
| Pfad | Zweck | Auth |
|---|---|---|
| `POST /v1/requests` | Kontaktanfrage/Erstgespräch → Posteingang, Vorgangsnummer | keine (Rate-Limit, Honeypot-frei) |
| `POST /v1/chat/completions` · `/v1/messages` · `/v1/embeddings` | OpenAI-kompatibel, Modelle `nexify-one`, `nexify-one+` | Schlüssel `nx_live_…` je Kostenstelle |
| `POST /v1/estimate` | Preisschätzung vor großen Läufen | Schlüssel |
| `GET /v1/ledger` · `POST /v1/topups` | Guthaben, Aufladung (Revolut Order) | Konto |
| `POST /v1/payments/revolut/webhook` | Zahlungsereignisse | HMAC-Signatur (`v1.` + Zeitstempel + Rohkörper, Toleranz 5 min) |
| `GET/POST /v1/offers`, `POST /v1/offers/{id}/accept` | Angebote (Button-Lösung, Zeitstempel, Fassung) | Konto |
| `GET /v1/projects`, `/reports`, `POST /v1/acceptance` | Projekte, Tagesberichte, Abnahme L1–L3 | Konto |
| `POST /v1/shop/orders` | Bestellung, `Idempotency-Key` Pflicht | Gast/Konto |
| `GET /v1/account/data-rights` | Export/Löschung (DSGVO) | Konto |
Fehlerformat: `{ "fehler": { "code", "text_de", "feld?" } }`; Text immer verständlich, nie Stacktrace.

## 3. Datenmodell (Auszug, Beträge in Cent)
`tenant(id,name,markt)` · `account(id,email,2fa,rollen[])` · `membership(account,tenant,rolle)` · `offer(id,tenant,positionen[],netto,ust,gueltig_bis,status,akzeptiert_am,fassung)` · `project(id,offer,phase,tage)` · `daily_report(project,datum,text,kosten_cent,pruefstand)` · `acceptance(project,stufe L1|L2|L3,beleg,frist)` · `invoice(nr NX-…,tenant,positionen,ust_satz,vermerk,pdf_hash)` · `ledger_entry(id,tenant,typ,betrag_cent,request_id UNIQUE,preisversion)` · `price_table(version,gueltig_ab,modelle{ek_ein,ek_aus},aufschlag)` · `usage_log(request_id UNIQUE,kostenstelle,modell,token_in,token_out,ek,vk)` · Shop: `category`, `product(id,tenant,sku,name,marke,preis_cent,ust_klasse,lieferzeit,bestand)`, `variant`, `order(id,tenant,status,summen)`, `order_line`, `return_request` · `consent(account,zweck,fassung,zeit,widerruf)` · `journal(zeit,akteur,aktion,ziel,ergebnis)`.
Regeln: jede Tabelle mit `tenant_id` + RLS; `request_id` und `merchant_order_ext_ref` eindeutig (Idempotenz); keine Rundung je Anfrage auf Cent – intern 6 Nachkommastellen, Rechnung je Position auf Cent.

## 4. Abrechnung (Prepaid)
`VK = EK × (1 + Aufschlag)` (E1: 45 % oder 38 %; Variante A „auf EK“ vs. B „÷0,55“ – **muss vor Bau entschieden werden**). EK in USD × EZB-Kurs vom 1. Arbeitstag des Monats. Schwellen 50 %/80 % Warnung, 100 % weicher Stopp (kritische Schlüssel laufen weiter) oder harter Stopp; kein Abbruch mitten in der Antwort. Aufladung → Anzahlungsrechnung; Monatsverbrauch → Verbrauchsnachweis (E4 Steuerberatung). Steuer: NL 21 %; EU-B2B mit VIES-geprüfter USt-IdNr. Reverse Charge; Drittland nicht steuerbar. Gutschrift erst nach `GET /orders/{id}` = completed mit passendem `merchant_order_ext_ref`, Betrag, Währung.

## 5. Shop-Logik
Bestand reservieren bei Bestellung, buchen bei Zahlung; USt. nach Lieferland (OSS), Preise im Katalog brutto für B2C, netto für B2B; Widerruf 14 Tage (B2C); Rücksendung aus dem Konto; jede Statusänderung löst E-Mail-Vorlage aus; Gutscheine mit Laufzeit/Einlösungszähler; Kompatibilitätsprüfung im Berater aus Attributen.

## 6. Sicherheit
Mandantentrennung (RLS), 2. Faktor für Rollen mit Schreibrechten, Geheimnisse nur im Tresor, Zugänge nie im Code, Rate-Limits, Idempotenz, unveränderliches Ledger, Journal jeder folgenreichen Aktion, Hartsperren (Reboot, DNS, Firewall nie ohne Freigabe) im Gateway technisch, nicht nur im Prompt, AVV/TOM, Backups mit Restore-Nachweis, Wächter mit Gegentest (`waechter-bauen`).

## 7. Freigabe-Gate vor Live (`freigabe-gate-live-betrieb`)
Vorschau grün → Health ≥ 60 s stabil → E3-Gegentests (Negativfall, Grenzwert, Rollback) → Rollback-Plan → binärer PASS mit Zeitstempel → Endabnahme.

## 8. Umgebungen
`vorschau` (mit Kundenregeln, ohne echte Kunden) · `produktion`. Revolut Sandbox vs. Produktion getrennt. Konfiguration nur aus `config/*.json` + Tresor.
