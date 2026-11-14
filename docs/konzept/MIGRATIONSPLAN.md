# Migrationsplan zum führenden Konzept

Stand: 14.11.2026 · Fassung 1.0 · Status: Arbeitsfassung der Projektleitung, Bestätigung Inhaber offen (`DECISIONS.md` D-019).
Gehört zu `docs/konzept/FUEHRENDES-KONZEPT.md` (im Folgenden **FK**). Kürzel und Marken wie dort.

## 0. Was dieser Plan ist

- Eine **Sicht** auf das führende Aufgabenregister (`config/acceptance-coverage.json`, P01–P26). Er ist keine zweite Aufgabenverwaltung (`AGENTS.md` Z. 30–32). Vor dem Bau wird jedes Paket dort unter der passenden Auftragsbindung nachgetragen (TEILEKLAR: P12, P13, P14, OF-08; Zuordnung im Einzelnen OFFEN).
- Quelle der Pakete: die Listen „noch nicht migriert“ (RA C.4) und „beschrieben, nicht gebaut“ (RA D) sowie die Pakete W1-01 bis W1-23 aus K1114 Abschnitt 5.2. Wo ein Paket einem W1-Paket entspricht, steht es dabei.
- Aufwandsangaben fehlen bewusst. Die Schätzungen in RA C.4 sind grobe Annahmen ohne Messung.

**Regeln für jedes Paket** (SOLL [S] `AGENTS.md`; ANNAHME K1114 Abschnitt 7.2):
1. Ein Schreiber je Schreibbereich. Wer außerhalb seines Bereichs etwas braucht, liefert eine Anforderung.
2. Alles Neue hinter einem Schalter, Vorgabe aus. Kein Gate wird abgeschaltet.
3. Keine Beträge, keine Konditionen, keine Rechtstexte, keine Zugangsdaten im Code oder in Dokumenten.
4. Nichts löschen. Jedes Paket nennt seinen Rückweg.
5. „Gebaut“ ist nicht „live“. Live erst nach Abnahme durch den Inhaber.
6. Vor Abschluss: `make check` und `make test` (`AGENTS.md` Z. 235). `make test` ist auf `main` rot (FK W-57); der Ausgangswert wird vor dem ersten Paket gemessen (BE-04).

**Blocker-Arten:** **Inhaber** = Inhaberentscheidung · **Zugang** = Zugangsdaten, Konto oder Systemzugriff, den nur der Inhaber geben kann · **Recht** = Rechts- oder Steuerprüfung · **keiner**.

---

## 1. Sofort baubar

Ohne Inhaberentscheidung, ohne Zugänge, ohne Rechtsprüfung. Reihenfolge innerhalb der Gruppe = Vorschlag.

### 1.1 TEILEKLAR (zuerst)

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **TK-01** | Projektbindung der Shop-API konfigurierbar statt fester Kennung; Liste der fehlenden Laufzeitvariablen, nur Namen (W1-04) | `apps/shop-api/vercel_app.py`, `apps/shop-api/tests/test_vercel_adapter.py` | PR 118 zuerst zusammenführen oder Bereich abstimmen (PR 118 ändert `apps/shop-api/shop/*`) | keiner | Bindung kommt aus der Umgebung; ohne Zugänge bleibt die API geschlossen (503); Variablenliste ohne Werte | Adaptertest: passende und abweichende Bindung | Commit zurücknehmen |
| **TK-02** | Werkstattanfrage wahrheitsgemäß: interne Benachrichtigung, Liste im Betreiberbereich, Bestätigungstext ohne nicht vorhandenen Schritt (W1-09) | `apps/shop-api/shop/workshops_api.py`, `admin_api.py`, neu `mail_templates_teileklar.py`, `apps/web/components/shop/WorkshopDetail.tsx` | – | keiner. Die Zustellung an Nichtpartner bleibt aus (Inhaber, EV-13) | Anfrage erzeugt einen internen Mail-Auftrag und erscheint in der Liste; der Text nennt nur, was geschieht | Test der Anfrage mit Attrappe für den Mail-Ausgang | Commit zurücknehmen |
| **TK-03** | Anfragen nach Marke trennen: Pflichtfeld Marke, eigene Vorgangsnummer und Mail-Marke für TEILEKLAR (W1-11) | `apps/shop-api/shop/requests_api.py`, `mail_templates_teileklar.py`; Filter in `nexify_api.py` als Zuarbeit an den Suite-Schreiber | TK-02 | keiner | Partneranfrage erscheint nicht in der NeXify-Ansicht und umgekehrt | Negativtest beider Richtungen | Feld ignorieren; Daten bleiben |
| **TK-04** | Sitzungsgrenze NeXify ↔ TEILEKLAR, Stufe 1: getrennte Sitzung je Marke; Hülle nach Marke getrennt (W1-06) | `apps/shop-api/shop/accounts_api.py` (Cookie), `apps/web/proxy.ts`, `apps/web/app/[...slug]/page.tsx` (Zuarbeit an den Web-Schreiber) | PR 118 (ändert `accounts_api.py`) | keiner. Stufe 2 mit eigener Adresse: TK-41 | Eine TEILEKLAR-Sitzung öffnet keine NeXify- oder internen Bereiche und umgekehrt; bestehende Anmeldung bleibt nutzbar | Negativtest je Richtung; abgelaufene Sitzung | Cookie-Einstellung zurück |
| **TK-05** | Seite „Partner werden“ ohne Kostenaussage: Nutzen, Ablauf in vier Schritten, Fragen und Antworten, Felder Leistungen, Ort, Einzugsgebiet. Eine Kostenzeile erscheint nur, wenn ein Fakt in `config/fakten.json` steht (W1-10) | `apps/web/components/shop/PartnerJourney.tsx`, `ContactRequestForm.tsx`, `apps/shop-api/shop/requests_api.py`; Seitentext über den Text-Schreiber | TK-02 | keiner | Ohne Fakt keine Kostenzeile; mit Fakt genau der Faktentext | Komponententest beider Fälle; Formularprüfung | Commit zurücknehmen |
| **TK-06** | Partnerantrag mit Statusmodell und Annahmeprotokoll: eingereicht → in Prüfung → angenommen oder abgelehnt; Abgleich mit der Verzeichnis-Kennung; Technik für eine versionierte Konditionsfassung ohne Text (W1-12) | neu `apps/shop-api/shop/partners_api.py`, `shop/db.py` (Indizes), `admin_api.py`, `apps/web/components/shop/AdminShop.tsx` | TK-03 | keiner. Text der Konditionen: Inhaber und Recht (TK-33) | Nur erlaubte Zustandswechsel; Doppelantrag und fremder Betrieb abgewiesen; Annahme nur der gültigen Fassung | Zustandstests | Sammlung ungenutzt; Commit zurück |
| **TK-07** | Rolle `partner`, gebunden an genau einen Betrieb; Zugriff nur auf eigene Daten (W1-13) | `apps/shop-api/shop/accounts_api.py`, `auth.py`, `apps/web/proxy.ts`, `apps/web/auth/policy.ts` | TK-04, TK-06 | keiner | Partner A liest B nicht; Kunde ohne Partnerzugriff | Negativtests | Rolle entziehen; Commit zurück |
| **TK-08** | Partnerseite als Vorlage mit Zuständen: Seite aus dem Profil, Vorschau, Freigabe durch den Partner, Veröffentlichung getrennt; Kennzeichen nur bei „veröffentlicht“ (W1-14) | `apps/web/components/shop/WorkshopDetail.tsx`, `apps/shop-api/shop/workshops_api.py`, neue Profilfelder | TK-06, TK-07 | keiner | Nichtpartner ohne Kennzeichen; zurückgezogenes Profil verschwindet; Vorschau nur für den Partner | Zustandstests; Sichtprüfung 390 und 1440 px | Status zurück; Commit zurück |
| **TK-09** | Partnerportal Stufe 1 und Verknüpfung Kauf ↔ Einbauanfrage: Partner sieht eigene Anfragen, nimmt an oder lehnt ab; die Anfrage trägt Bestellung und Teil (W1-15) | `apps/shop-api/shop/workshops_api.py`, `apps/web/components/shop/OrderConfirmation.tsx`; Portalansicht über den Web-Schreiber | TK-07, TK-08 | keiner | Zustellstatus getrennt von Speicherung; keine Doppelmail; nur eigene Bestellung verknüpfbar | Ablauftest mit Attrappe | Ansicht ausblenden; Feld optional |
| **TK-10** | Sichtung von PR 67: Übernahmeliste je Commit-Gruppe (Shopkonzept, Vertrauensleiste, Fahrzeugleiste, Produktfelder, Tests) mit Urteil übernehmen, anpassen oder Historie | nur neue Datei unter `docs/konzept/` | Lesezugriff auf den Zweig von PR 67 | keiner | Jede der 72 Commits ist einer Gruppe und einem Urteil zugeordnet; Konflikte mit `main` benannt | Gegenlesen durch die Projektleitung | Datei entfernen |
| **TK-11** | Produktpflichtfelder und Veröffentlichungssperre: Hersteller, Sicherheitshinweise, Inhalt und Einheit, Lieferzeit, Entsorgungsklasse, strukturierte Eignung. Ein Artikel ohne Pflichtangaben wird nicht veröffentlicht (SK67 §4.3) | `apps/shop-api/shop/catalog_api.py`, `bigbuy_import.py`, `shop/db.py`, Tests | TK-10 | keiner. Welche Angaben rechtlich Pflicht sind: Recht (TK-34) – bis dahin gilt die strengere Liste | Unvollständiger Artikel erscheint in keiner öffentlichen Antwort; Passung bleibt „nicht geprüft“, solange kein Datensatz sie belegt | Importtest mit Testdaten | Schalter aus; Felder optional |
| **TK-12** | Weiterleitungsplan alt → neu als Entwurf: die 17 Adressen des Altstands mit Zieladresse, in zwei Varianten (eigene Adresse `teileklar.shop` oder Unterpfad). Nicht aktiviert | nur neue Datei unter `docs/konzept/`; kein Eintrag in `vercel.json` | – | keiner für den Entwurf. Aktivierung: TK-30 | Jede der 17 Adressen hat in jeder Variante ein Ziel oder den Vermerk „entfällt“; Altpfade mit 404 sind aufgeführt | Abgleich mit der Sitemap des Altstands (RA C.1) | Datei entfernen |
| **TK-13** | Katalog: Filter, Facetten und Sortierung im API-Vertrag und in der Oberfläche | `apps/shop-api/shop/catalog_api.py`, `apps/web/components/shop/CatalogView.tsx`, `CategoryList.tsx` | TK-11 (Felder) | keiner | Filter wirken serverseitig; leere Treffermenge zeigt einen ehrlichen Leerzustand | API-Tests mit Testdaten; Sichtprüfung | Parameter ignorieren |
| **TK-14** | Kundenkonto als echte Fläche statt Hülle: Bestellungen, Daten, Abmelden. Ohne Garage | `apps/web/app/teileklar/konto/*`, `apps/web/components/shop/*` (neu), Zuarbeit zu `[...slug]/page.tsx` | TK-04 | keiner | Angemeldeter Kunde sieht nur eigene Bestellungen; ohne Anmeldung Umleitung | Negativtest; Sichtprüfung | Route zurück auf die Hülle |
| **TK-15** | Bestellansicht ohne Konto über einen signierten Link; Sendungsstatus darin | `apps/shop-api/shop/checkout_api.py` oder neu `order_links.py`, `apps/web/app/teileklar/bestellung/*`, `mail_templates.py` (Zuarbeit) | – | keiner. Gastkauf selbst: Recht (TK-34) | Link gilt nur für eine Bestellung, läuft ab, ist nicht erratbar | Tests: abgelaufen, verändert, fremd | Schalter aus |
| **TK-16** | Werkstattverzeichnis bereinigen: Dubletten erkennen (579 Einträge, 489 eindeutige Kennungen), Sperrlisten-Mechanik, Herkunft je Eintrag | `apps/shop-api/shop/workshops_api.py`, `shop/db.py`, Tests. `prototypen/assets/workshops.json` bleibt unverändert (D-001) | – | keiner. Vollbestand: Zugang (TK-36). Zulässigkeit der Anzeige: Recht | Jede Kennung einmal; gesperrter Betrieb erscheint nicht und ist nicht anfragbar | Importtest; Sperrtest | Sperrliste leeren; Import wiederholen |

### 1.2 Suite und API

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **SU-01** | Portal-API anschließen und härten, ohne Aktivierung: Module und Pfade aufnehmen; Beträge aus dem Code nehmen; eine Variablenfamilie für den Router (W1-05) | `apps/shop-api/vercel_app.py`, Wurzel-`vercel.json`, `apps/shop-api/shop/nexify_api.py` | PR 118, TK-01 | keiner | Ohne Anmeldung 401; fremde Sitzungskennung 404; kein Betrag in irgendeiner Antwort | API-Tests | Rewrites und Modul entfernen |
| **SU-02** | Kunden-Chat der Suite gegen einen Stellvertreter: hinter Anmeldung und Berechtigung, Bindung an Konto und Mandant, Verbrauchszählung je Mandant (W1-07) | neue Route `apps/web/app/api/suite/chat/*` | SU-01 | keiner | Ohne Berechtigung 403; Verlauf mandantengetrennt; bei Fehler kein Ersatzmodell | Negativtest mit drei Mandanten | Schalter aus; öffentlicher Chat unberührt |
| **SU-03** | Beleg- und Rechnungsmodell als Entwurf: Datenmodell, Nummernkreis-Logik, PDF mit Kennzeichnung „Entwurf“, Storno als Gegenbeleg (W1-22) | neue Tabellen neben dem Abrechnungskern (`db/foundation/`), Zuarbeit zu `apps/web/lib/invoice.ts` | PR 118 | keiner. Pflichtangaben und Steuer: Recht | Summen in Cent; fortlaufende Nummern bei Wiederholung; Storno löscht nichts | Modelltests | Entwürfe verwerfen |
| **SU-04** | MCP-Vermittler gegen eine Attrappe: Freigabeliste je Mandant, Bestätigung vor schreibenden Aktionen, Aufrufprotokoll (W1-23) | neuer Baustein unter `apps/suite/` | SU-02 | keiner. Anbindung an Composio: Inhaber und Recht (SU-13) | Mandant A nutzt keine Verbindung von B; nicht freigegebenes Werkzeug abgelehnt | Negativtests | Schalter aus |
| **SU-05** | Dashboard-Gerüst: Reiter Abo, Verbrauch, Modell, Verbindungen, Chat mit ehrlichen Leerzuständen (W1-08) | `apps/web/components/PortalWorkspace.tsx` und CSS | Design-Durchgang des Web-Schreibers (Zweig `claude/atelier-fehlerbehebung`); SU-01 | keiner | Kein Betrag im HTML; Tastaturbedienung; vier Sprachen | `node tools/ds-audit-cli.js`; Sichtprüfung 390 und 1440 px | Schalter aus |
| **AP-01** | API: Verbrauchszählung und Guthabenbuch als Mechanik gegen eine Attrappe, ohne Beträge und ohne Aufladung | neuer Baustein unter `apps/suite/` oder `apps/shop-api/shop/`; Tests | SU-01 | keiner. Aufschlag, Aufladung, Steuer: Inhaber und Recht (AP-10) | Jede Buchung idempotent; Guthaben nie negativ; Werte nur aus `config/api-prepaid.json` | Buchungstests mit Wiederholung | Schalter aus |

### 1.3 Betrieb, Regeln, Marke

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **BE-03** | Indexierungs-Schalter aus PR 94 übernehmen, Vorgabe aus | `apps/web/app/robots.ts`, `sitemap.ts`, `apps/web/lib/page-seo.ts` | Sichtung PR 94 | keiner. Einschalten: Inhaber (FK Entscheidung Nr. 24) | Mit Vorgabe bleibt jede Seite `noindex`; der Schalter wirkt an einer Stelle | Test beider Stellungen | Commit zurücknehmen |
| **BE-04** | Prüfkette messen und Fehlerliste erheben: `make check`, `make test` auf `main`; je Fehler Ursache und Zuordnung | Bericht unter `docs/04-betrieb/`; Korrekturen je Fehler im Bereich des zuständigen Schreibers | – | keiner | Datierter Messwert; jeder Fehler hat Ursache, Besitzer, nächsten Schritt; kein Test wird abgeschaltet | der Lauf selbst | – |
| **BE-06** | Reste von Clerk aus der Auslieferung nehmen (CSP in `vercel.json` nennt noch die Clerk-Adresse) | Wurzel-`vercel.json` | Abstimmung mit SU-01 (gleiche Datei) | keiner | CSP enthält nur genutzte Quellen; Seiten laden unverändert | Abruf der Kopfzeilen in der Vorschau | Commit zurücknehmen |
| **BE-07** | Konfiguration an den Stand 13.11.2026 angleichen (`config/one-web-app.json`, `config/deployment-topology.json`, `config/integrations/vercel-agent-setup.json`) | die genannten Dateien | Prüfung auf Hash-Bindung vor jeder Änderung | keiner, sofern keine Bindung besteht; sonst Pin im selben Commit mit Begründung nachziehen | Dateien nennen `apps/web` auf Vercel; Prüfwerkzeuge bleiben grün | `make check` | Commit zurücknehmen |
| **RE-01** | Doppelte Dokumentnummern auflösen: ADR Cognee erhält die nächste freie Nummer; Architektur 0020 aus PR 67 ebenso (FK W-39) | `docs/adr/`, `docs/architecture/`, Verweise in `DECISIONS.md`, `docs/konzept/2026-11-14/README.md` (hash-gebunden: nur Verweis im FK ändern) | vor dem Zusammenführen von PR 119 | keiner | Keine Nummer doppelt; alle Verweise zeigen auf die neue Nummer | Suche nach der alten Nummer | Umbenennung zurück |
| **MK-06** | Komponenten-Übersicht (Baukasten) als interne Seite, `noindex` | `apps/web/app/intern/*` oder `packages/ui` | Design-Durchgang | keiner | Jede Komponente mit Zuständen; Werte nur aus Tokens | `node tools/ds-audit-cli.js` | Route entfernen |
| **MK-07** | Prüfbericht NL, FR, EN: Vollständigkeit, Anrede, Namen nach `config/brand-names.json` | Bericht unter `docs/texte/` | – | keiner. Muttersprachliche Abnahme: Inhaber | Jede Abweichung mit Datei und Zeile | `tools/check_brand_names.py`; i18n-Parität | – |

Ebenfalls sofort baubar, in Abschnitt 2.4 geführt: **REA-01** (Entscheidungsvorlage, nur Dokument) und der Teil von **REA-03** ohne echte Belege (Schema, Schwärzung, Tests nach PR 121).

### 1.4 Bereits gebaut, nur auf Zweig – zusammenführen statt neu bauen

| Paket aus K1114 | Wo | Stand |
|---|---|---|
| W1-01 Entscheidungen, W1-02 Namensregel und Prüfer, W1-03 Textvorlage | PR 119 | Dateien vorhanden (IST, dieser Zweig) |
| W0-b Suite-Fundament | PR 118 | Dateiliste per REST; Inhalt nicht geprüft |
| W1-16 Wissensport, W1-17 Laufzeitkern, W1-18 Policy-Prüfer und Schnittstellenvertrag, W1-20 Skill-Bestand | PR 121 | Dateiliste per REST; Inhalt nicht geprüft |
| W1-19 Chat-Daten-Migrationsentwurf, W1-21 Messaufbau | PR 120 | Dateiliste per REST; Inhalt nicht geprüft |

---

## 2. Blockiert

### 2.1 TEILEKLAR

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker (Art) | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **TK-30** | Altstand `teileklar.shop` ablösen: sichern, sperren oder umleiten nach TK-12 | außerhalb des Repositorys (DNS, Cloudflare); `vercel.json` für Weiterleitungen | TK-12 | **Inhaber** (EV-01) · **Zugang** (DNS, Cloudflare) | Keine nicht freigegebene Kondition öffentlich; jede der 17 Adressen antwortet wie geplant; Altdateien gesichert | Abruf jeder Adresse | Umleitung aufheben |
| **TK-31** | Shop-API live: Laufzeit-Zugänge setzen, Zahlung zuerst im Testmodus | Vercel-Projekt (Einstellungen), kein Code | TK-01 | **Zugang** · **Inhaber** (EV-06, FK W-43) | `/api/health` antwortet 200; Testbestellung im Testmodus durchgängig | Ende-zu-Ende-Durchlauf | Zugänge entfernen; API schließt wieder |
| **TK-32** | Katalog füllen | Import über den Betreiberbereich | TK-11, TK-31 | **Zugang** (Lieferant) · **Inhaber** (Sortiment, FK W-16; Guthaben) | Nur vollständige Artikel öffentlich; Preisfreigabe-Sperre greift | Import mit Stichprobe | Veröffentlichung zurücknehmen |
| **TK-33** | „Kostenfrei“, Direktpartner, Konditionsfassung mit Text, Prüfkriterien | `config/fakten.json` (nur nach Freigabe), Texte, TK-05, TK-06 | TK-05, TK-06 | **Inhaber** (EV-13) · **Recht** | Kostenaussage steht als Fakt und in der Konditionsfassung; Seite zeigt genau diesen Text | Faktenabgleich | Fakt entfernen; Zeile verschwindet |
| **TK-34** | Rechtstexte TEILEKLAR: Impressum, Datenschutz, Versand und Zahlung, Rückgabe, Widerruf, Pflichtangaben je Artikel; Trennung Verbraucher und Unternehmen; Steuersatz je Lieferland; Gastkauf | `config/teileklar-legal.json`, `apps/web/components/shop/TeileklarLegal.tsx`, `checkout_api.py` | – | **Recht** · **Inhaber** (EV-05, EV-07) | Texte geprüft und freigegeben; Fassung und Datum protokolliert | Sichtprüfung; Fassungsprotokoll | vorige Fassung |
| **TK-35** | Rückgabe, Widerruf, Mangel, Fehlpassung als Vorgang mit Erstattung | neu `apps/shop-api/shop/returns_api.py`, Seiten unter `apps/web/app/teileklar/` | TK-34 | **Recht** · **Zugang** (Erstattungsweg beim Zahlungsanbieter) | Vorgang nachvollziehbar vom Antrag bis zur Erstattung; idempotent | Ablauftest mit Attrappe | Schalter aus |
| **TK-36** | Werkstattverzeichnis im vollen Umfang mit Quellen | `apps/shop-api/shop/workshops_api.py`, Datenablage | TK-16 | **Zugang** (Ablageort des Vollbestands OFFEN) · **Recht** (Datenschutz) | Jeder Eintrag mit Quelle; keine Dublette | Import- und Sperrtest | Import zurück auf den Stand aus TK-16 |
| **TK-37** | Fahrzeugauswahl, Garage, Passungsprüfung; Fahrzeugleiste aus PR 67 | `apps/shop-api/shop/` (Fahrzeugmodell), `apps/web/components/shop/VehicleBar.tsx` | TK-10 | **Inhaber** (Sortiment, FK W-16) · **Recht** und **Zugang** (Passungsdaten, Lizenz) | Passung nur, wo ein Datensatz sie belegt | Tests mit Testfahrzeugen | Schalter aus |
| **TK-38** | Hilfe, Fragen und Antworten, Ratgeber, Berater | Seiten unter `apps/web/app/teileklar/`, `config/site-map.json` (Text-Schreiber) | TK-33, TK-34 | **Inhaber** (Inhalte, Sortiment) | Jede Aussage hat einen Fakt oder fehlt | Faktenabgleich | Seiten ausblenden |
| **TK-39** | Batterie-Berater und Eignungs-Werkzeug mit Katalogbezug | `apps/web/components/shop/` | TK-32 | **Zugang** (Katalog) | Empfehlung nur aus Katalogdaten | Tests mit Testkatalog | Hinweis „noch nicht verfügbar“ zurück |
| **TK-40** | Termine, Gutscheine, Nachbarschaftsportal | `apps/shop-api/shop/`, Portalflächen | TK-09, TK-33 | **Inhaber** (EV-13) · **Recht** | je Funktion eigener Abnahmefall | Ablauftests | Schalter aus |
| **TK-41** | Eigene Adresse für den neuen Shop; Sitzungsgrenze Stufe 2; eigene Datenhaltung oder Pflichtfeld Marke überall | `apps/web/lib/page-seo.ts`, `apps/web/proxy.ts`, `vercel.json`, `apps/shop-api/shop/db.py` | TK-04, TK-30 | **Inhaber** (FK Entscheidungen Nr. 20, 23) · **Zugang** (DNS) | Canonical auf der eigenen Adresse; kein gemeinsames Cookie; Negativtest mit drei Mandanten | Abruf; Negativtests | Adresse zurück auf den Unterpfad |
| **TK-42** | Stadt- und Regionsseiten mit strukturierten Daten je Betrieb | `apps/web/app/teileklar/`, `config/site-map.json` | TK-08, TK-33 | **Inhaber** (bestätigte Partner, Indexierung) | Seite nur für veröffentlichte Partner | Sichtprüfung; Schema-Prüfung | Seiten ausblenden |
| **TK-43** | Weitere Lieferländer und Sprachen; Zahlarten je Markt | `checkout_api.py`, `config/shop-interface-copy.json`, `apps/web/proxy.ts` | TK-34 | **Recht** (Steuer, Verbraucherrecht je Land) · **Inhaber** (FK W-13) | je Land freigegebene Texte und Sätze | Ablauftest je Land | Land aus der Liste nehmen |
| **TK-44** | Betreiberbereich erweitern: Werkstatt-, Partner- und Katalogpflege; Affiliate-Portal | `apps/web/components/shop/AdminShop.tsx`, `admin_api.py` | TK-06, TK-32 | **Inhaber** (Affiliate: Konditionen) | je Funktion eigener Abnahmefall | Rechtetests | Schalter aus |
| **TK-45** | Bewertungen; Rückrufe und Produktsicherheit; Pfand und Altöl; Vertriebsunterlagen | neu je Funktion | TK-32, TK-34 | **Recht** · **Inhaber** | je Funktion eigener Abnahmefall | – | Schalter aus |
| **TK-46** | Alt-Bilder und Herstellerlogos übernehmen | `apps/web/public/` | Sortimentsentscheidung | **Inhaber** (FK W-16) · **Recht** (Nutzungsrechte) | nur Dateien mit belegtem Nutzungsrecht | – | Dateien entfernen |
| **TK-47** | Vertrauensleiste, Versandfortschritt, Lieferzeit in der Oberfläche (aus PR 67) | `apps/web/components/shop/TrustBar.tsx` und weitere | TK-10, TK-11 | **Inhaber** (freigegebene Werte für Versand und Schwelle) · **Recht** (Aussagen) | Ohne freigegebenen Wert erscheint nichts | Komponententest beider Fälle | Schalter aus |

### 2.2 Suite, API, Agentur

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker (Art) | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **SU-10** | Stufenseite, Checkout, wiederkehrender Einzug, echte Rechnungen, Kündigung, Sperre, Export | `apps/suite/*`, `apps/web/app/portal/*` | PR 118, SU-03 | **Inhaber** (EV-10, EV-11, EV-12; Preisblatt) · **Recht** · **Zugang** (Konto beim Zahlungsanbieter) | Durchlauf Registrierung bis Kündigung belegt | Ende-zu-Ende im Testmodus | Schalter aus |
| **SU-11** | Zustimmung zu AGB und AVV mit Fassung und Zeit | `apps/suite/*`, Registrierung | PR 118 | **Recht** (Texte) | Zustimmung mit Fassung protokolliert | Test: neue Fassung verlangt neue Zustimmung | vorige Fassung |
| **SU-12** | Eigenes Modell des Kunden vollständig: Tresor, Schlüsselannahme, Adapter | `apps/suite/byo.py` | PR 118 | **Inhaber** (Tresor-Wahl) | Schlüssel nie im Klartext; kein Rückfall auf NeXify-Kontingent | Negativtests | Schalter aus |
| **SU-13** | Anbindungen je Mandant über den Vermittler | `apps/suite/` | SU-04 | **Inhaber** (EV-17) · **Recht** (Datenschutzvertrag) | wie SU-04, mit echtem Dienst | Negativtests | Schalter aus |
| **SU-14** | Portal aktivieren | Vercel-Einstellungen | SU-01, TK-31 | **Zugang** · **Inhaber** | Anmeldung und Portal in Produktion nutzbar | Ende-zu-Ende | Schalter aus |
| **AP-10** | API: Aufladung, Zahlungs-Worker, Entwicklerdokumentation | `apps/suite/` oder eigener Dienst; `config/api-prepaid.json` nur nach Freigabe | AP-01 | **Inhaber** (Aufschlag, FK W-27) · **Recht** (Steuer auf Guthaben) | Aufladung idempotent; Beleg je Aufladung | Tests mit Testmodus | Schalter aus |
| **AG-01** | Angebotsweg vollenden: Bestellknopf, Supabase-Migration, vollständige Rechnung | `apps/web/app/api/*`, Chat-Oberfläche, `apps/web/supabase/migrations/` | – | **Recht** (verbindliche Bestellung, Rechnungsangaben) · **Inhaber** (Preise, Rechtsträger) | Durchlauf Chat bis Rechnung belegt | Ende-zu-Ende in der Vorschau | Schalter aus |
| **AG-02** | Terminwunsch mit Kalender verbinden | `apps/web/app/api/*` | – | **Zugang** (Kalender) | Terminwunsch erzeugt einen Eintrag mit Bestätigung | Ablauftest | Schalter aus |
| **AG-03** | Anfrageeingang wiederherstellen | – | TK-31 | **Zugang** | Testanfrage mit Zustellnachweis | Zustelltest | – |
| **AG-04** | Rechtsseiten NeXify: Datenschutz, Vertragsgrundlagen, Cookies, AVV, KI-Hinweise | `config/site-map.json` (Text-Schreiber) | – | **Recht** · **Inhaber** (EV-05, EV-07, EV-08) | geprüfte Fassung veröffentlicht | Sichtprüfung | vorige Fassung |

### 2.3 Agentenkern, Wissen, Betrieb, Marke

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker (Art) | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **KW-10** | Inventar der Altdienste (nur lesen) und Sicherung mit Wiederherstellungsprobe | außerhalb des Repositorys; Bericht unter `docs/04-betrieb/` | – | **Zugang** · **Inhaber** (EV-02) | Sicherung an zweitem Ort, Hash-Vergleich nach Wiederherstellung | Wiederherstellungsprobe | – (nur lesen) |
| **KW-11** | Cognee-Probebetrieb getrennt vom Altbestand; Adapter; Schattenbetrieb; Umstellung der 13 Aufrufstellen; Altbestand schreibgeschützt archivieren | `packages/knowledge/`, `tools/` | PR 121, KW-10 | **Inhaber** (Host, EV-02) · **Zugang** | Mandant Pflicht; A sieht B nicht; Rücklesen stimmt; Altbestand unverändert | Vertragstests gegen den echten Dienst | Aufrufstellen zurück auf den Altdienst |
| **KW-12** | Betrieb des Python-Agentenkerns | Host außerhalb von Vercel | PR 121, KW-11 | **Inhaber** (Host; Geldgrenzen, EV-16) · **Zugang** | Lauf mit Schritt-, Zeit- und Geldgrenze; Freigabepunkte halten an | Probelauf mit Attrappe, dann begrenzt echt | Dienst stoppen |
| **KW-13** | Ablösung der bisherigen Python-Agenten-Lösung | – | KW-12 | **Inhaber** (Quellort, EV-16) · **Zugang** | Ablöseliste je Funktion | – | Altlösung bleibt bis zur Abnahme |
| **KW-14** | Eignungstest der Skills mit dem Modell der Policy; Sub-Agenten-Probe | `tools/automation/` | PR 121 | **Inhaber** (Budget, EV-15) | je Skill Ergebnis mit Datum | Messlauf | – |
| **KW-15** | Chat-Daten-Migration einspielen; Chats ins Wissen | `apps/web/supabase/migrations/` | PR 120 | **Recht** · **Inhaber** (EV-09) | Mandant, Einwilligung, Löschfrist wirken | Tests aus PR 120 gegen eine Testdatenbank | Rollback-Datei aus PR 120 |
| **BE-10** | Tagesbericht mit echtem Inhalt; Sicherung und Überwachung mit Alarm | außerhalb des Repositorys; `tools/` | BE-04 | **Zugang** (Repository-Zugriff des Laufs, Alarmwege) · **Inhaber** (Empfänger) | Bericht mit Messwerten; Alarm erreicht den Empfänger | Probealarm | Lauf pausieren |
| **BE-11** | Zugangsdaten erneuern (FK Entscheidung Nr. 3); abgeschaltete Freigabeprüfung wieder einschalten (FK W-42) | außerhalb des Repositorys | – | **Inhaber** · **Zugang** | Alte Schlüssel ungültig; Prüfung wieder aktiv | Stichprobe durch den Inhaber | – |
| **MK-10** | Textumsetzung aus der Vorlage in vier Sprachen; Umbenennung nach Namensregel | `config/site-map.json`, `config/*-copy.json`, `config/home-film-scripts.json` | PR 119, Design-Durchgang | **Inhaber** (EV-04, EV-20; Abnahme der Texte) | Namensprüfer ohne Fund; Faktenabgleich; Parität | `tools/check_brand_names.py`, `make check` | Commit zurücknehmen |
| **MK-11** | Kanäle: Profiltexte, Redaktionsplan, Signatur, Messung | `docs/texte/`, Analyse-Einstellungen | MK-10 | **Inhaber** · **Recht** (Einwilligung für die Messung) | je Kanal freigegebener Text | – | – |
| **MK-12** | Landing-, Branchen-, Stadtseiten, Wissenshub | `config/site-map.json`, `apps/web/app/` | MK-10, BE-03 | **Inhaber** (Inhalte, Indexierung) | jede Aussage mit Fakt | Faktenabgleich | Seiten ausblenden |
| **RE-10** | Führendes Register festlegen; überholte Abschnitte in `AGENTS.md` als Historie markieren; Historie-Kopfzeilen in hash-gebundenen Dateien nachziehen (FK 11.4) | `AGENTS.md`, betroffene Dateien, Pins in `config/` | – | **Inhaber** (FK Entscheidung Nr. 31) | Pin im selben Commit mit Begründung; Prüfwerkzeuge grün | `python3 tools/project_skills.py verify`, `make check` | Commit zurücknehmen |

### 2.4 REA (Analyse- und Belegwerkzeug, FK Abschnitt 3.5)

Status aller Pakete: geplant. REA ist in dieser Arbeit nicht installiert und nicht geprüft. Grenzen aus FK 3.5 gelten für jedes Paket: nur eigene oder ausdrücklich freigegebene Ziele, Mandant an jedem Beleg, keine Zugangsdaten in Dateien, Anweisungen aus fremden Texten werden nicht befolgt.

| ID | Ziel | Schreibbereich | Abhängigkeiten | Blocker (Art) | Abnahmekriterien | Test | Rückweg |
|---|---|---|---|---|---|---|---|
| **REA-01** | Entscheidungsvorlage zur Einführung: Nutzen, Kosten (auch Hopper als Kauf), Alternativen, Risiken, erlaubte Ziele, Rückweg (`rea uninstall`); Abgleich mit dem Stand in `docs/automation/rea-mcp.md` (FK W-58) | nur neue Datei unter `docs/konzept/` | – | **keiner** für die Vorlage – sofort schreibbar. Die Entscheidung selbst: **Inhaber** (FK Nr. 35–37) | Jede Angabe zu REA mit Quelle und Abrufdatum; Kosten nur als Zitat; keine Empfehlung zu einem Kauf ohne Beleg | Gegenlesen durch die Projektleitung | Datei entfernen |
| **REA-02** | Probeinstallation in einer abgeschotteten Umgebung; Prüfung mit `rea doctor`; nur freie Provider | abgeschottete Umgebung außerhalb des Arbeitsbaums; Bericht unter `docs/automation/`. Keine Änderung an der Agenten-Konfiguration des Projekts | REA-01 | **Inhaber** (Freigabe; die Einrichtung schreibt in die Client-Registrierung) | Version, Hash des Pakets, Ausgabe von `rea doctor` belegt; Sicherung der vorherigen Konfiguration vorhanden; kein HTTP-Betrieb nach außen | `rea doctor`; Rückbau-Probe | `rea uninstall`; Sicherung zurückspielen |
| **REA-03** | Evidence-Format und Ablage: Schema für Belege, Pflichtfeld Mandant, Schwärzung von Zugangsdaten vor der Ablage, Ablage über den Wissensport; Verweis vom Aufgabenregister auf den Beleg | `packages/knowledge/` (Zuarbeit an den Schreiber von PR 121), neu Schema unter `docs/contracts/`, Tests | PR 121. Die Schema- und Schwärzungslogik ist gegen Beispieldaten ohne REA baubar | **keiner** für Schema, Schwärzung und Tests – sofort baubar nach PR 121. Ablage echter Belege: REA-02 | Beleg ohne Mandant wird abgewiesen; Mandant A liest B nicht; Testdatei mit Zugangsdaten wird geschwärzt oder abgewiesen | Vertragstests mit Beispieldaten | Paket entfernen |
| **REA-04** | Erster Anwendungsfall: Bestandsaufnahme des alten Auftritts `teileklar.shop` – Routen, Verhalten, Abhängigkeiten als Beleg. Nur lesend, eigene Adresse. Ergebnis fließt in TK-12 und TK-30 | Bericht und Belege; keine Änderung am Altstand | REA-02, REA-03 | **Inhaber** (erlaubte Ziele, FK Nr. 37) · **Recht**, falls Mitschnitte Kundendaten enthalten | Jede der 17 Adressen belegt; keine Anmeldung, kein Formular, keine Schreibzugriffe; Belege geschwärzt und mit Mandant TEILEKLAR abgelegt | Abgleich mit der Sitemap des Altstands | Belege archivieren; nichts am Ziel verändert |
| **REA-05** | Kundenweg-Tests aus HAR-Aufzeichnungen: wiederholbare Ende-zu-Ende-Umgebungen für die Wege A bis E (FK 2.2), zuerst gegen die Vorschau | Testablage im Repository (Ort mit der Prüfkette abstimmen); Aufzeichnungen nur geschwärzt | REA-02, REA-03; je Weg ein lauffähiger Stand (zum Beispiel TK-31) | **Inhaber** (Einführung) · **Recht**, sobald echte Kundendaten in Aufzeichnungen vorkommen können | Aufzeichnung enthält keine Zugangsdaten und keine echten Kundendaten; Lauf ist wiederholbar und liefert dasselbe Ergebnis | zweimaliger Lauf mit Vergleich | Umgebungen und Aufzeichnungen entfernen |

---

## 3. Abhängigkeiten in Kürze

- REA-01 → [Inhaber] → REA-02 → REA-04 → TK-12, TK-30 · PR 121 → REA-03 → REA-04, REA-05

- PR 118 → TK-01 → SU-01 → SU-02 → SU-04 · PR 118 → TK-04 → TK-07 · PR 118 → SU-03
- TK-02 → TK-03 → TK-06 → TK-07 → TK-08 → TK-09 · TK-02 → TK-05
- TK-10 → TK-11 → TK-13 · TK-10 → TK-37, TK-47
- TK-12 → [Inhaber, Zugang] → TK-30 → TK-41
- TK-01 → [Zugang] → TK-31 → TK-32 → TK-39, TK-44
- [Inhaber EV-13, Recht] → TK-33 → TK-38, TK-40, TK-42
- [Recht] → TK-34 → TK-35, TK-43
- PR 121 → [Zugang, Host] → KW-10 → KW-11 → KW-12 → KW-13

---

## 4. Reihenfolge für das Zusammenführen der PRs 67, 118, 119, 120, 121

Stand der PRs (IST, REST-Abfrage 14.11.2026): alle fünf offen, alle Entwurf, alle gegen `main`.

| Nr. | Zweig | Umfang | Berührt |
|---|---|---|---|
| 119 | `claude/marke-texte` | 21 Dateien zuzüglich dieses Konzepts | `DECISIONS.md`, `config/brand-names.json`, `docs/`, `tools/check_brand_names.py`, ein Test; kein App-Code |
| 121 | `claude/agentenkern` | 24 Dateien, 5 Commits | nur neue Pakete `packages/agent_core/`, `packages/knowledge/`, Tests, drei Dokumente |
| 118 | `claude/epic-hopper-7d3duf` | 28 Dateien, 11 Commits | App-Code: `apps/shop-api/shop/accounts_api.py`, `mailer.py`, `main.py`, `nexify_api.py`; neu `apps/suite/*`, `db/foundation/002_*`, `config/suite-plans.json` |
| 120 | `claude/regeln-daten` | 10 Dateien, 3 Commits | `skills/` (neuer Skill), Migrationsentwurf unter `apps/web/supabase/`, `config/messplan-werbeaussagen.json`, `tools/messauswertung.py` |
| 67 | `claude/youthful-sagan-bzmkkr` | 195 Dateien, 72 Commits, Stand 04.–05.11. | quer durch das Repository; älter als die Führungsentscheidung vom 13.11. |

**Vorschlag (ANNAHME, von der Projektleitung zu bestätigen; jedes Zusammenführen nur mit Freigabe des Inhabers):**

0. **Vorher:** Ausgangswert der Prüfkette auf `main` messen (BE-04). Reihenfolge mit dem Zweig `claude/atelier-fehlerbehebung` abstimmen: Er hat keinen PR, liegt 48 Commits vor `main` und ändert `apps/web`.
1. **PR 119 zuerst.** Nur Dokumente, Namensregel und ein meldender Prüfer. Kein Laufzeitrisiko. Die anderen PRs verweisen auf D-011 bis D-018 und auf K1114. Vorher: doppelte ADR-Nummer auflösen (RE-01).
2. **PR 121.** Nur neue Pakete, keine Überschneidung mit bestehenden Dateien. Baut auf der ADR Cognee aus PR 119 auf.
3. **PR 118.** Erster PR mit Änderungen am laufenden App-Code. Einzeln prüfen, weil Konten, Mail und Portal-API betroffen sind. Danach sind TK-01, TK-04, SU-01 und SU-03 baubar. Zu klären: `config/suite-plans.json` darf keine Beträge enthalten, die nicht freigegeben sind (nicht geprüft).
4. **PR 120.** Der Migrationsentwurf für Chat-Daten braucht das Format der Mandanten-Kennung aus PR 118 (K1114 W1-19). Der neue Skill liegt unter `skills/`; ob `config/project-skills.json` und `skills-lock.json` nachgezogen werden müssen, ist vor dem Zusammenführen zu prüfen (`python3 tools/project_skills.py verify`). Die Migration bleibt ein Entwurf und wird nicht eingespielt (KW-15).
5. **PR 67 nicht als Ganzes zusammenführen.** Erst sichten (TK-10), dann in kleinen Paketen übernehmen: Shopkonzept als Dokument, Produktpflichtfelder (TK-11), Vertrauensleiste (TK-47), Fahrzeugleiste (TK-37), Tests. Gründe: 72 Commits auf einem Stand vom 05.11., Bezug auf `apps/site` und auf die damalige Führungsentscheidung, doppelte Dokumentnummer 0020, Überschneidung mit dem Web-Schreiber. Der PR bleibt als Quelle erhalten und wird nicht geschlossen, bevor die Übernahmeliste abgearbeitet ist.

Nach jedem Schritt: `make check`, `make test`, Vergleich mit dem Ausgangswert, Eintrag im führenden Register.

---

## 5. Was nicht geprüft wurde

- Kein Paket wurde gebaut oder getestet. Schreibbereiche stammen aus K1114 Abschnitt 5 und aus RA; einzelne Dateinamen können sich auf `main` seit dem 14.11.2026 geändert haben.
- Inhalte der PRs 67, 118, 120, 121 wurden nicht gelesen (nur Dateilisten und, für PR 67, das Shopkonzept).
- Ob die Pakete aus PR 118, 120 und 121 die Abnahmekriterien aus K1114 erfüllen, ist nicht geprüft.
- Die Zuordnung der Pakete zu P01–P26 ist nicht vorgenommen.
- PR 94, PR 75, PR 115, PR 107 und der Zweig `claude/atelier-fehlerbehebung` sind nicht Teil der Reihenfolge und nur als Abhängigkeit genannt.
