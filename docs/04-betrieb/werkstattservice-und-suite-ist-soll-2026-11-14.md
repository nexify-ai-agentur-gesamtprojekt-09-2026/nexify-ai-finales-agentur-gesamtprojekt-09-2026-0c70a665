# Werkstattservice und Suite: IST gegen SOLL (Paket J)

Stand: 14.11.2026, Repository `origin/main` auf `2906f58`. Reine Analyse. Kein Produktcode, keine Konfiguration geändert, kein Formular abgeschickt, kein Pull Request verändert.

Bezug: Register der offenen Arbeiten vom 14.11.2026, Einträge OA-083, OA-085, OA-039.

Kennzeichnung: **SOLL** = gültige Entscheidung oder führender Plan · **IST** = heute gelesen oder gemessen · **HISTORIE** = überholt · **ANNAHME** = Bewertung dieser Analyse · **OFFEN** = fehlt oder nicht belegt.

Aufwandsklassen: S bis ein Tag · M mehrere Tage · L ein bis zwei Wochen · XL mehr. Die Klassen sind ANNAHME.

## 1. Ergebnis in Kürze

1. **IST: Der Werkstattservice ist als Seiten ausgeliefert, aber keine Funktion ist nutzbar.** Alle sieben Seiten antworten mit 200; die Werkstattsuche, das Anfrageformular und der Shop-Dienst dahinter antworten mit 503. Eine Terminbuchung ist nicht gebaut; die Seite sagt das offen.
2. **IST: Von zehn geschützten Seiten des Seitenplans hat eine einen eigenen Inhalt** (`/intern/workspace`, drei Flächen). Die übrigen neun liefern dieselbe Hülle „Geschützter Bereich“. Hinter keiner liegt ein Konto mit Daten.
3. **IST: Bis zum ersten zahlenden Suite-Kunden fehlen vor allem Entscheidungen, nicht Code.** Das Fundament liegt in PR 118 (offen), die Composio-Anbindung in PR 123 (offen, baut auf 118 auf). Beide nennen dieselben offenen Inhaberentscheidungen: Stufen und Preise, Zahlungsanbieter, Kundenkreis, Rechtstexte, Produktionsdatenbank.

## 2. Messung der Website

IST, gemessen mit `curl` gegen `https://nexifyai.de` am 14.11.2026, 18:42:40 bis 18:42:52 UTC (Seiten) und 18:43 bis 18:50 UTC (Schnittstellen). Nur `GET`. Kein Formular abgeschickt. Zwischen 18:43 und 18:50 UTC wechselte die Auslieferungskennung in den Fehlerseiten (`dpl_9qNs…` zu `dpl_B3uQ…`); es gab also währenddessen eine neue Auslieferung.

Die Wortfolge „in Vorbereitung“ kommt auf keiner der gemessenen Seiten vor (0 Treffer je Seite). Die Seiten verwenden stattdessen „noch nicht“.

| Adresse | Status | Titel | Robots-Angabe | Sichtbarer Inhalt |
|---|---|---|---|---|
| `/teileklar/werkstatt` | 200 | „Eine Werkstatt in Ihrer Nähe. · TEILEKLAR.shop“ | `index, follow` | Suchfeld PLZ oder Ort, Umkreis 10/25/50/100 km; Hinweis „Verzeichnisbetriebe, nicht … TEILEKLAR-Partner“ |
| `/teileklar/termine` | 200 | „Termin? Direkt bei der Werkstatt. · TEILEKLAR.shop“ | `noindex, nofollow` | „Online-Terminbuchung gibt es bei TEILEKLAR noch nicht.“ Dazu ein Anfrageformular (Name, E-Mail, Unternehmen, Anliegen, Einwilligung) |
| `/teileklar/partner-werden` | 200 | „Werkstatt? Werden Sie Partner. · TEILEKLAR.shop“ | `noindex, nofollow` | Ablauf in drei Schritten, Beschreibung des Partnerportals, Anfrageformular |
| `/teileklar/gutscheine` | 200 | „Gutscheine gibt es noch nicht. · TEILEKLAR.shop“ | `noindex, nofollow` | Hinweis, dass Gutscheine nicht gekauft oder eingelöst werden können |
| `/teileklar/rechtliches` | 200 | „TEILEKLAR. Bedingungen mit eindeutiger Zuordnung. · TEILEKLAR.shop“ | `noindex, nofollow` | Übersicht; Freigabe der Unterlagen steht laut Seitenplan aus |
| `/teileklar/partnerportal` | 200 | „Geschützter Bereich“ | `noindex, nofollow` | Hülle: „Ihr persönlicher Arbeitsbereich. Melden Sie sich an …“ |
| `/teileklar/nachbarschaft` | 200 | „Geschützter Bereich“ | `noindex, nofollow` | dieselbe Hülle |
| `/teileklar/konto` | 200 | „Geschützter Bereich“ | `noindex, nofollow` | dieselbe Hülle |
| `/portal/kunde`, `/portal/api`, `/portal/affiliate` | 200 | „Geschützter Bereich“ | `noindex, nofollow` | dieselbe Hülle |
| `/intern/posteingang`, `/intern/leitstand`, `/intern/verwaltung` | 200 | „Geschützter Bereich“ | `noindex, nofollow` | dieselbe Hülle |
| `/intern/workspace` | 200 | kein `<title>` in der Antwort | `noindex, nofollow` | drei Flächen ohne Anmeldung sichtbar, siehe Abschnitt 4.2 |
| `/produkte/nex2fly` | 200 | „NeX AIFly Suite. Ihr KI-Arbeitsbereich. · NeXify AI“ | `noindex, nofollow` | Produktseite |
| `/anmelden`, `/registrieren` | 200 | „Anmelden und weiterarbeiten.“ / „NeX AIFly Suite. In Ruhe testen.“ | `noindex, follow` | Anmelde- und Registrierseite |
| `/` (Vergleich) | 200 | „Ein Gespräch. Ein Projekt, das passt. · NeXify AI“ | `noindex, nofollow` | Startseite |

| Schnittstelle | Status | Antwort |
|---|---|---|
| `/api/shop/status` | 503 | `runtime_binding_unavailable`, Grund `database_binding_missing_or_unsuitable` |
| `/api/shop/products` | 503 | derselbe Grund |
| `/api/workshops/search?q=Venlo` | 503 | derselbe Grund |
| `/api/requests` | 503 | `runtime_binding_unavailable`, Grund `payment_mode_unbound` |
| `/api/partner/requests/mine`, `/api/partner/requests/receipt` | 404 | Fehlerseite der Web-App; die Route gibt es in der Auslieferung nicht |
| `/api/internal/workspace/status`, `/api/internal/workspace/mail` | 401 | `authentication_required` |

Auffällig (IST, OFFEN zur Klärung):

- `/teileklar/werkstatt` trägt `index, follow`, während die Startseite `noindex, nofollow` trägt und die Suche dahinter mit 503 antwortet.
- Die Formulare auf `/teileklar/termine` und `/teileklar/partner-werden` sind das allgemeine Anfrageformular (`data-testid="contact-form"`); es sendet an `/api/requests` (`apps/web/components/ContactRequestForm.tsx:47`), und diese Adresse geht an den Shop-Dienst (`vercel.json:68` ff.). `GET` dort ergibt 503. Ob ein abgeschicktes Formular ankommt, wurde **nicht geprüft** (kein Versand in dieser Arbeit). Dasselbe Formular steht auf `/kontakt`.
- Das eigene Partnerformular `apps/web/components/PartnerRequestForm.tsx` sendet an `/api/partner/requests`; diese Route liegt nur in `apps/agent-gateway/server.py:440-457` und antwortet in der Auslieferung mit 404. Auf der ausgelieferten Seite ist dieses Formular nicht eingebunden.

## 3. Werkstattservice

### 3.1 Was geplant ist (SOLL und HISTORIE)

| Baustein | Plan | Fundstelle | Einordnung |
|---|---|---|---|
| Wertversprechen | Kunde bringt das geprüfte Teil, die Werkstatt bekommt den Auftrag mit Fahrzeug, Prüfergebnis und Teiledaten | `docs/01-konzept/gesamtprojektplan.md:121` | SOLL |
| Phase „Partnernetz“ | Verzeichnis, Erstansprache, Partnervertrag, Auftragsübergabe, Terminlogik; Ziel 25 aktive Partner, Weg von der Anfrage zum Termin gemessen | `gesamtprojektplan.md:134` | SOLL |
| Werkstattverzeichnis | Auftrag vom 31.08.2026: DE 4.000, AT 800, NL 900, BE 700, CH 600, LU 120 Betriebe; Pflichtfelder, mindestens drei Quellen je Markt, Quellenprotokoll, Sperrliste | `docs/06-auftraege/werkstatt-verzeichnis.md:10-19`, `:25-35`, `:176` | SOLL |
| Erstansprache | Liste „Top 200 je Land“ mit vorgeschlagenem Kanal und Sprache | `werkstatt-verzeichnis.md:194`; `gesamtprojektplan.md:221` | SOLL; ohne Einwilligung keine E-Mail (Register OA-086) |
| Werkstatt-Aufnahme | Registrierung → Prüfung Gewerbe → Profil → Partnerseite → Gutscheine; Freischaltung durch den Inhaber | `docs/01-konzept/myadmin-gesamtplan.md:63`; `docs/01-konzept/nexifyai-organisationshandbuch.md:65` | SOLL |
| Termin | Buchung → Slot sperren → Bestätigung → Erinnerung → Durchführung → Bestätigung; die Werkstatt entscheidet | `myadmin-gesamtplan.md:64` | SOLL |
| Abnahmepakete | P12 Stadt/Werkstatt, P13 Partner, P14 Termin/Gutschein | `config/acceptance-coverage.json:4075`, `:4095`, `:4115` | SOLL, keines abgenommen |
| Seiten | `/teileklar/werkstatt`, `/termine`, `/partner-werden`, `/gutscheine` öffentlich; `/partnerportal`, `/nachbarschaft`, `/konto` geschützt; alle `implementation_status: planned`, `backend: not_connected` | `config/site-map.json:6518`, `:6036`, `:6354`, `:6190`, `:7635`, `:7726`, `:7544` | SOLL |
| Datenstand „598 Betriebe aus dem Pilot, 6 Märkte, im Shop eingebaut“ | | `gesamtprojektplan.md:162`, `:181` | HISTORIE, nicht nachgemessen |
| Datenstand „6.875 Betriebe, 1.104 Orte, eingebunden“ | | `docs/01-konzept/teileklar-shop.md:30`, `:45` | HISTORIE, widerspricht der Zeile darüber |

### 3.2 Was existiert (IST)

| Baustein | Im Repository | In der Auslieferung | Zustand |
|---|---|---|---|
| Werkstattsuche (Seite) | `apps/web/app/teileklar/werkstatt/page.tsx`, `components/shop/WorkshopFinder.tsx` | 200, Suchfeld sichtbar | Hülle; Suche antwortet mit 503 |
| Werkstatt-Detailseite | `apps/web/app/teileklar/werkstatt/[id]/page.tsx`, `WorkshopDetail.tsx`, `WorkshopMap.tsx` | nicht gemessen (braucht eine Kennung aus der Datenbank) | nicht belegt |
| Suche, Detail, Anfrage an eine Werkstatt (Dienst) | `apps/shop-api/shop/workshops_api.py:69`, `:86`, `:103` | 503 | gebaut, nicht nutzbar |
| Anfrage an eine Werkstatt | speichert die Anfrage und stellt dem Anfragenden eine Eingangsbestätigung in die Warteschlange (`workshops_api.py:103-127`) | 503 | gebaut; **die Werkstatt selbst wird nicht benachrichtigt** (kein Versand an den Betrieb im gelesenen Abschnitt) |
| Allgemeine Anfrage | `apps/shop-api/shop/requests_api.py:58` | 503 | gebaut, nicht nutzbar |
| Terminbuchung | nichts; Hinweis in `apps/web/components/shop/PhaseNotice.tsx:8` | Seite sagt „noch nicht“ | fehlt |
| Partnerportal, Nachbarschaft, Konto | nur Einträge im Seitenplan | Hülle | fehlt |
| Gutscheine | nichts; Hinweis in `PhaseNotice.tsx:8` | Seite sagt „noch nicht“ | fehlt |
| Partnervertrag, Konditionen | nichts im Repository | – | fehlt (Register OA-086) |
| Rechtstexte Werkstattservice | `config/site-map.json:6671`: „vollständige Freigabe steht aus“ | Übersichtsseite | fehlt |
| Werkstattdaten in der laufenden Datenbank | nicht lesbar | 503 | OFFEN (Register OA-084) |

### 3.3 Was bis zum ersten buchbaren Termin fehlt

„Buchbar“ heißt hier: Ein Kunde sendet einen Terminwunsch an eine Partnerwerkstatt, die Werkstatt bestätigt oder lehnt ab, der Kunde erhält die Antwort (Abnahme aus Register OA-085).

| Nr. | Baustein | Hängt ab von | Aufwand | Wer | Akzeptanzkriterium |
|---|---|---|---|---|---|
| W1 | Shop-Dienst in der Auslieferung an eine Datenbank binden | Inhaberentscheidung zur Datenbank (D-013), Variablen im Vercel-Projekt | L | nur Inhaber (Variablen, Zugang); danach Agent | `/api/shop/status` antwortet mit 200; `/api/workshops/search?q=Venlo` liefert eine Liste |
| W2 | Werkstattdaten belegen: Zahl der Betriebe je Land aus der laufenden Datenbank, Quellenprotokoll, Sperrliste | W1 | M | Agent nach Zugang | Zahl je Land gelesen und mit Datum dokumentiert; der Widerspruch 598 gegen 6.875 ist aufgelöst |
| W3 | Partnervertrag und Konditionen (Kosten für die Werkstatt, Abrechnung, Kündigung, Haftung) | – | L | nur Inhaber | unterschriftsreifer Vertrag; Kostenaussage für Werkstätten festgelegt |
| W4 | Terminlogik spezifizieren: Zustände (Wunsch, bestätigt, abgelehnt, verschoben, abgesagt, erledigt), Fristen, wer wen wann benachrichtigt, was ohne Antwort der Werkstatt geschieht | – | M | Agent sofort | Zustandsdiagramm und Testfälle je Zustand; vom Inhaber bestätigt |
| W5 | Benachrichtigung der Werkstatt bei einer Anfrage (heute nur Eingangsbestätigung an den Kunden) | W3 (Einwilligung der Werkstatt als Partner), Absenderadresse | M | Agent sofort (Code hinter Schalter); Versand nach Freigabe | Test: Anfrage erzeugt genau eine Nachricht an den Partnerbetrieb und keine an Nicht-Partner |
| W6 | Terminbuchung bauen: Schnittstelle, Seite `/teileklar/termine`, Bestätigen und Ablehnen durch die Werkstatt, Antwort an den Kunden | W4; Betrieb nach W1 | L | Agent sofort (Code und Tests), Betrieb nach W1 | Tests je Zustand grün; ein Durchlauf Wunsch → Bestätigung → Antwort gegen eine Testdatenbank belegt |
| W7 | Partnerportal mit echter Anmeldung und Rolle „partner“ | S5 aus Abschnitt 4.4 (Sitzungs- und Mitgliedschaftsprüfung) | L | Agent sofort (Code), Betrieb nach W1 | erlaubter und verbotener Fall je Rolle getestet (Abnahme P13) |
| W8 | Aufnahme neuer Partner: Formular, Prüfung des Gewerbes, Freischaltung durch den Inhaber | W1, W3 | M | Agent sofort (Code); Freischaltung nur Inhaber | ein Testbetrieb durchläuft Antrag → Prüfung → Freischaltung; nichts wird ohne Freischaltung sichtbar |
| W9 | Rechtstexte für den Werkstattservice (Rolle von TEILEKLAR bei der Vermittlung, Weitergabe der Anfragedaten an die Werkstatt, Stornierung) | W3 | M | nur Inhaber | freigegebene Texte; `tk-legal` trägt keinen Vorbehalt mehr |
| W10 | Partner gewinnen ohne E-Mail-Erstansprache (Formular, Telefon) | W2, W3 | L | nur Inhaber | erster unterzeichneter Partner in der Datenbank |
| W11 | Seitentexte nachziehen, wenn die Buchung steht (vier Sprachen, Hinweis entfernen) | W6 | S | Agent sofort | `config/site-map.json` und `PhaseNotice.tsx` ohne „noch nicht“ für Termine; Gleichmacher und Live-Prüfung ohne Befund |

Kürzester Weg zum ersten Termin: W3 und W1 (beide beim Inhaber) → W4 → W6 und W5 → W9 → W10. W4 und der Code von W6 können sofort beginnen und warten dann auf W1.

## 4. Suite und Portal

### 4.1 Die geschützten Routen laut Seitenplan

IST: `config/site-map.json` führt **zehn** nicht öffentliche Seiten, sechs mit `visibility: private` und vier mit `visibility: internal`; alle `implementation_status: planned`, `content_kind: protected_target`, `backend: not_connected`. Die im Auftrag genannte Zahl acht ließ sich am Commit `2906f58` nicht nachvollziehen; ohne die drei TEILEKLAR-Seiten sind es sieben.

| Seite | Pfad | Rollen | Fundstelle | Auslieferung |
|---|---|---|---|---|
| Kundenbereich | `/portal/kunde` | customer | `site-map.json:7269` | Hülle |
| API-Bereich | `/portal/api` | customer, team, admin | `:7360` | Hülle |
| Partnerbereich (Affiliate) | `/portal/affiliate` | affiliate | `:7453` | Hülle |
| Kundenkonto und Fahrzeug | `/teileklar/konto` | customer | `:7544` | Hülle |
| Werkstatt- und Partnerportal | `/teileklar/partnerportal` | partner | `:7635` | Hülle |
| Nachbarschaftskunden | `/teileklar/nachbarschaft` | customer | `:7726` | Hülle |
| Interner Workspace | `/intern/workspace` | team, admin | `:7817` | eigene Seite, drei Flächen |
| Interner Posteingang | `/intern/posteingang` | team, admin | `:7909` | Hülle |
| Interner Leitstand | `/intern/leitstand` | team, admin | `:8001` | Hülle |
| Interne Verwaltung | `/intern/verwaltung` | admin | `:8093` | Hülle |

Schutz heute (IST, `apps/web/proxy.ts:7-23`): Für geschützte Pfade unter `/api/` antwortet der Vorfilter mit 401. Geschützte Seiten werden ausgeliefert, als Hülle ohne private Daten, mit `no-store` und `noindex`. Eine echte Sitzungs- und Mitgliedschaftsprüfung fehlt (`config/acceptance-coverage.json:4593`, Lücke G19: „keine echte Session-/Membershipintegration“).

### 4.2 Was `/intern/workspace` heute kann

IST aus `apps/web/app/intern/workspace/page.tsx` (vier Zeilen, drei Bausteine) und der Messung:

| Fläche | Was sie zeigt | Was sie nicht kann |
|---|---|---|
| Arbeitsplatz · Aufträge und Freigaben (`WorkspaceStatusPanel`) | Eingabefeld „Auftragsreferenz“, Schaltfläche „Status anzeigen“; Hinweis „Lesende Übersicht“ | Die Schnittstelle dahinter antwortet ohne Anmeldung mit 401; ein Abruf mit Anmeldung ist nicht belegt |
| Mail-Arbeitsplatz (`MailWorkspacePanel`) | „Lokaler Mailbestand und vorbereitete Antworten“ | Text der Seite selbst: „Provider-Verbindung und Versand sind noch nicht angebunden.“ |
| Unterlagen vorbereiten (`ProjectFilesPanel`) | Dateien auswählen, Prüfung auf dem Gerät, Liste mit Namen und Prüfsummen | Kein Hochladen; „Eine Projektberechtigung oder sichere Serverübernahme ist damit nicht bestätigt.“ |

Die Seite ist ohne Anmeldung mit 200 erreichbar und zeigt diese drei Flächen. Sie enthält keine privaten Daten; die Rollen `team` und `admin` aus dem Seitenplan werden für die Seite selbst nicht geprüft. Das ist ein Befund für die koordinierende Sitzung, kein Auftrag dieses Dokuments.

### 4.3 Was PR 118 und PR 123 liefern würden

Quelle: PR-Beschreibungen, gelesen am 14.11.2026. Beide offen, nicht gemergt. Die Aussagen sind die der PRs und hier **nicht nachgeprüft**.

**PR 118 „Kunden-Suite: technisches Fundament im Backend“** (Zweig `claude/epic-hopper-7d3duf`, 28 Dateien, +3.466/−25, 11 Commits; `apps/web` nicht berührt):

- Besitzprüfung in der Portal-Schnittstelle: Gesprächsverlauf nur für den Besitzer; Angebotsentscheidung an Mandant und Zustand gebunden.
- Mandantenmodell: Konto → Organisation → Mitgliedschaft und Rolle → Ressourcen, RLS erzwungen auf neun Tabellen, Rückweg vorhanden (`db/foundation/002_suite_tenancy.sql`).
- Abrechnungs- und Freischaltungskern: Zustände kein Abo → Testphase → aktiv → überfällig → gekündigt → beendet; Zahlungsanbieter nur als Schnittstelle mit Attrappe.
- E-Mail-Bestätigung mit einmaligem, befristetem Token; Versand über eine Schnittstelle.
- Sicherheitsgerüst für ein eigenes Modell des Kunden.
- Schalter `NEXIFY_SUITE`, `NEXIFY_SUITE_EMAIL_VERIFICATION`, standardmäßig aus.
- **Nicht hinter einem Schalter:** vier Sicherheitskorrekturen, darunter die Änderung an der Google-Anmeldung mit der Nebenwirkung, dass Bestandskonten bei der ersten Google-Anmeldung ihr Passwort verlieren (so auch `PROGRESS.md:36`).
- **Ausdrücklich nicht enthalten:** Zahlungsanbieter-Adapter, Checkout, Rechnungen, Route für Zahlungsereignisse, PostgreSQL-Speicheradapter, echter Tresor, Seite für den Bestätigungslink, Aufnahme der Portal- und Bestätigungsrouten in den Vercel-Einstieg.
- Prüfstand laut PR: 59 neue Tests; Datenbanktest lokal grün, im CI-Container nicht ausgeführt.

**PR 123 „suite: Composio-Anbindung hinter Schalter“** (Zweig `claude/suite-composio`, Basis ist der Zweig von PR 118, 17 Dateien, +1.310/−1):

- Verbinden-Link `POST /api/suite/composio/connect` und Nutzerprüfung `GET /api/suite/composio/verify`, nur für angemeldete Suite-Nutzer.
- Webhook-Empfang mit Signaturprüfung und Idempotenz. Teile davon liegen laut Standortbestimmung vom 14.11.2026 inzwischen über PR 143 und 146 auf `main`; welcher Teil von PR 123 damit überholt ist, wurde hier nicht abgeglichen.
- Offen laut PR: Speicher nur im Arbeitsspeicher, Mandant vorläufig `konto:<user_id>`, Freigabeliste der Apps leer (jede Verbindung wird abgelehnt), zwei Aufrufformen nicht aus der Doku belegt.

### 4.4 Was bis zum ersten zahlenden Suite-Kunden fehlt

SOLL-Rahmen: Abnahmepakete P05 Suitezugang, P06 Arbeitsplatz, P15 Portale, P16 Auth, P17 Mail (`config/acceptance-coverage.json:3935`, `:3955`, `:4135`, `:4155`, `:4175`); keines abgenommen. Datenhaltung auf der eigenen Supabase-Instanz (D-013, `DECISIONS.md:100`).

| Nr. | Paket | Hängt ab von | Aufwand | Wer | Akzeptanzkriterium |
|---|---|---|---|---|---|
| S1 | Entscheidungen: Stufen und Preise mit Testumfang und Kulanzfrist, Zahlungsanbieter, Kundenkreis (Unternehmen oder auch Verbraucher), Steuer, Absender für E-Mails, Produktionsdatenbank | – | S | nur Inhaber | Einträge in `DECISIONS.md` mit Datum |
| S2 | Funktionsliste der Suite „nutzbar / Hülle / fehlt“ für die Produktseite (Register OA-039) | – | S | Agent sofort | Tabelle je Funktion mit Beleg, vom Inhaber bestätigt |
| S3 | PR 118 unabhängig prüfen und entscheiden; die Änderung an der Google-Anmeldung hinter einen Schalter legen oder bewusst freigeben | S1 (Datenbank) | L | Prüfung Agent sofort; Entscheidung nur Inhaber | PR gemergt oder geschlossen; Entscheidung dokumentiert |
| S4 | Supabase-Instanz: Zugang, Migration `002` (Mandanten) und `0004` (Composio-Ablage) einspielen | S1, S3 | M | Agent nach Zugang; Freigabe Inhaber | `verify_002.sql` besteht gegen die Instanz; Rückweg geprüft |
| S5 | Sitzungs- und Mitgliedschaftsprüfung in `apps/web` (Lücke G19): Token serverseitig prüfen, Mandant, Rolle und Objekt binden | S3 | L | Agent sofort | erlaubter und verbotener Fall je Rolle getestet; fremder Mandant erhält 404 |
| S6 | PostgreSQL-Speicheradapter für den Abrechnungs- und Freischaltungskern (in PR 118 nicht enthalten) | S3 | L | Agent sofort gegen lokale Datenbank; Betrieb nach S4 | Kern-Tests laufen gegen PostgreSQL statt Attrappe |
| S7 | E-Mail-Bestätigung durchgängig: Seite für den Link, Versand über Resend mit eigenem Absender | S1 (Absender), S3 | M | Agent sofort (Code); Absender nur Inhaber | Registrierung mit echter Adresse: Mail kommt an, Link bestätigt, zweiter Klick wird abgewiesen |
| S8 | Zahlung: Adapter für den gewählten Anbieter, Checkout, Route für Zahlungsereignisse, Rechnung | S1, S6 | XL | Agent nach Entscheidung; Live-Schaltung nur Inhaber | Testzahlung schaltet die Stufe frei; doppeltes Ereignis ändert nichts; Rechnung erzeugt |
| S9 | Oberfläche der Suite: `/portal/kunde` als Arbeitsbereich (Gespräch, Übersicht, Verbindungen) statt Hülle, aus vorhandenen Bausteinen | S5 | XL | Agent sofort (hinter Schalter) | Gleichmacher und Live-Prüfung ohne Befund; Verlauf bleibt nach Neuladen erhalten |
| S10 | Registrierung und 24-Stunden-Test durchgängig nachweisen (Register OA-041) | S4, S5, S7 | M | Agent nach Zugang | ein echtes Konto durchläuft Registrierung, Teststart, Ablauf; Serverzeit maßgeblich |
| S11 | Composio für Kunden: PR 123 gegen `main` abgleichen, Freigabeliste mit einer App, Ablage in der Datenbank | S3, S4; Entscheidung „welche App zuerst“ | M | Agent nach Entscheidung | ein Testnutzer verbindet eine App; fremder Nutzer kann sie nicht benutzen |
| S12 | Rechtstexte der Suite: Vertragsbedingungen, Auftragsverarbeitung, Datenschutz, bei Verbrauchern Widerruf | S1 | M | nur Inhaber | freigegebene Texte; Seiten ohne Vorbehalt |
| S13 | Aufnahme der Portal- und Bestätigungsrouten in den Vercel-Einstieg; Schalter in der Produktion setzen | S3 bis S10 | S | Code Agent; Variablen nur Inhaber | Routen antworten in der Auslieferung; Schalter dokumentiert |
| S14 | Kosten je Kunde messbar machen (Modellkosten je Konto, Limit je Stufe) | S6 | M | Agent sofort | Verbrauch je Konto wird gezählt; Limit greift im Test |

Abhängigkeiten in einem Satz: S1 öffnet alles; S3 ist das Nadelöhr für den Code; S4 ist das Nadelöhr für jeden echten Nachweis; S8 und S12 entscheiden, ob Geld fließen darf. Sofort beginnen können S2, die Prüfung zu S3 und die Vorarbeit zu S5 und S6.

## 5. Als Nächstes vergebbar

Nur Dokumente und Prüfungen, die heute ohne neue Zugänge möglich sind. Die Pakete überschneiden sich nicht in den Dateien.

| Paket | Inhalt | Betroffene Dateien | Aufwand | Wer | Fertig, wenn |
|---|---|---|---|---|---|
| J-1 | Terminlogik spezifizieren (W4) | neu: `docs/03-backend/werkstatt-terminlogik.md` | M | Agent sofort | Zustandsdiagramm, Fristen, Benachrichtigungen, Testfälle je Zustand |
| J-2 | Funktionsliste der Suite „nutzbar / Hülle / fehlt“ (S2, OA-039) | neu: `docs/04-betrieb/suite-funktionsliste-2026-11.md` | S | Agent sofort | jede auf `/produkte/nex2fly` genannte Funktion hat Status und Beleg |
| J-3 | Unabhängige Prüfung von PR 118 (S3), nur lesend, mit Probe-Merge nach `nexify-pr-sichtung` | neu: `docs/reviews/pr-118-pruefung-2026-11.md` | L | Agent sofort | Befunde mit Datei und Zeile; Empfehlung mergen, nacharbeiten oder schließen |
| J-4 | Abgleich PR 123 gegen `main` (was ist durch PR 143 und 146 überholt) | neu: `docs/reviews/pr-123-abgleich-2026-11.md` | S | Agent sofort | Liste je Datei: schon auf `main`, noch nur im PR, widersprüchlich |
| J-5 | Anfrageweg prüfen: kommt eine Anfrage über `/kontakt`, `/teileklar/termine` und `/teileklar/partner-werden` an, solange der Shop-Dienst 503 liefert? Mit einer vom Inhaber freigegebenen Testanfrage | neu: `docs/04-betrieb/anfrageweg-befund-<Datum>.md` | S | Agent nach Freigabe einer Testanfrage | Statuscode und Rückmeldung je Formular dokumentiert; bei Ausfall Befund an den Inhaber am selben Tag |
| J-6 | Werkstattanfrage: Benachrichtigung des Partnerbetriebs hinter Schalter (W5) | `apps/shop-api/shop/workshops_api.py`, `apps/shop-api/shop/mail_templates.py`, Tests unter `apps/shop-api/tests/` | M | Agent sofort | Tests grün; ohne Schalter unverändertes Verhalten |
| J-7 | Sitzungs- und Mitgliedschaftsprüfung vorbereiten (S5): Entwurf der Prüfregeln je geschützter Seite aus dem Seitenplan | neu: `docs/architecture/portal-zugriffsregeln-2026-11.md` | M | Agent sofort | je Seite: Rolle, Mandantenbindung, erlaubter und verbotener Fall |
| J-8 | Indexierbarkeit und Titel: `/teileklar/werkstatt` (`index, follow`) und `/intern/workspace` (kein Titel, ohne Anmeldung sichtbar) klären | `apps/web/lib/page-seo.ts`, `apps/web/app/intern/workspace/page.tsx` | S | Agent sofort, nach Wort der koordinierenden Sitzung | Entscheidung dokumentiert; Live-Prüfung ohne neuen Befund |

J-6 und J-8 ändern Produktcode und brauchen die Gates aus `nexify-zweig-und-pr`. Alle anderen sind Dokumente.

## 6. Nicht geprüft

- Kein Formular wurde abgeschickt; ob Anfragen ankommen, ist offen (Paket J-5).
- Inhalt der Datenbank (Werkstattdaten, Anfragen): kein Zugang, Dienst antwortet mit 503.
- Der Code der Zweige von PR 118 und PR 123: nur die Beschreibungen gelesen, keine Dateien, keine Tests ausgeführt.
- `/intern/workspace` und die Portale mit Anmeldung: nur ohne Anmeldung gemessen.
- Sprachfassungen nl, fr, en der gemessenen Seiten.
- TEILEKLAR-Unterlagen außerhalb der genannten Fundstellen (`docs/09-final/11-teileklar-datenblatt.md` nur an den Trefferzeilen gelesen); `docs/09-final/14-gesamtsystem-und-portale.md` nicht gelesen.
