# Die Oberflächen — was welche Fläche macht

**Zwei Marken, eine Plattform.** NeXify AI ist die KI-Agentur und der Operator-Kern; TEILEKLAR ist die Flaggschiff-Commerce-Marke darunter. Dieses Projekt liefert den vollständigen Front-End-Prototyp beider Seiten — ohne Live-Backend, mit klar markierten Anschlusspunkten.

Auftragsgrundlage: `uploads/Uebergabeauftrag_Claude_Design.md` + `uploads/SOLL-GESAMTKONZEPT-4ec6b0ca.md` + `uploads/Die NeXify Blaupause (1).md`. Schichtenregeln: `ARCHITEKTUR.md`. Gestaltungsregeln: `designsystem.md`.

---

## Einstieg

**[Start.dc.html](../../Start.dc.html)** ist die Eingangstür: Übergabekette in fünf Schritten, alle Oberflächen nach Rolle gefiltert (Unternehmen · Autofahrer · Werkstatt · Intern), Fundament-Übersicht, gemeinsamer Footer mit Länderwahl. Von dort ist jede Datei in höchstens einem Klick erreichbar.

**[Architektur.dc.html](../../Architektur.dc.html)** zeigt dasselbe System von innen: die vier Schichten, ihre Quellen, die Prüfschicht und das Schuldbuch mit aktuellen Zahlen.

**[NX-Footer.dc.html](../../NX-Footer.dc.html)** ist die **einzige** Footer-Definition. 14 Bildschirm-Oberflächen binden sie per `dc-import` ein — Marken-Lockup, fünf Linkspalten über beide Marken, die sieben Länder mit Steuersatz und aktivem Zustand, i18n de/nl/fr, Betreiberzeile, B2B-Hinweis. Footer-Änderungen passieren dort und nirgendwo sonst. **Weil `dc-import` ein Geschwisterelement einbindet, liegen alle Flächen flach im Wurzelverzeichnis** — siehe `ARCHITEKTUR.md`, L2.

## Die beiden Auftritte

| Auftritt | Datei | Inhalt |
|---|---|---|
| **NeXify AI Cloud** (nexifyai.cloud) | `NeXifyAI Cloud.dc.html` | Hero, Leistungsportfolio, Preise/Rechner (Umsetzung, KI-ROI, Checkliste, BAFA-Hinweis), Referenzen, Prozess, Über uns, Recht |
| **TEILEKLAR Shop** (teileklar.shop) | `TEILEKLAR Shop.dc.html` | Katalog, Fahrzeugauswahl, Garage, Teiledetail, Kasse, Werkstattnetz, Rechtstexte in sieben Ländern — Details in `teileklar-shop.md` |

## Die drei Portale

| Portal | Datei | Für |
|---|---|---|
| Kundenportal | `Kundenportal.dc.html` | NeXify-AI-Direktkunden: Angebote, Projektphase, Rechnungen, Leistungen |
| Partnerportal | `Partnerportal.dc.html` | Werkstattpartner: Profil/Landingpage, Gutscheine, Termine, Abrechnung, Nutzen-Rechner |
| Nachbarschaftskunden-Portal | `Nachbarschaftskunden-Portal.dc.html` | Gutschein-Einlöser: Konto, Termin (inkl. 7-Tage-Widerspruchsfrist), Belege |

Alle drei teilen Token-System und Companion-Gestalt. Ein echter gemeinsamer Konto-Unterbau (bcrypt/JWT, eine Kontoart mit drei Rollen) ist Backend-Arbeit — im Frontend als ein durchgängiges Login-Muster vorgezeichnet.

## Gewinnung, Inhalt, Werkzeuge

| Zweck | Datei |
|---|---|
| Werkstattprogramm erklärt | `Partner-werden.dc.html` |
| Muster-Partnerseite einer Werkstatt | `Werkstatt-Partnerseite.dc.html` |
| Local-SEO-Musterseite (Stadt/Branche) | `NeXifyAI-Local-SEO-Muster.dc.html` |
| Wissenshub-Artikel-Vorlage | `NeXifyAI-Wissenshub-Artikel.dc.html` |
| Passungs-Prüfung (HSN/TSN) | `Fitment-Checker.dc.html` |
| Reifenrechner | `Reifenrechner.dc.html` |
| Batterie-Berater | `Batterie-Berater.dc.html` |

Die drei Werkzeuge sind dreisprachig (de/nl/fr), setzen das `lang`-Attribut je Auswahl, verlinken sich gegenseitig und sind aus dem Bereich **Klarwissen** des Shops erreichbar.

## Marke, Papier, Vertrieb

| Zweck | Datei |
|---|---|
| Companion-Signet, 11 Zustände, State-Contract | `NeXify-AI-Companion.dc.html` |
| Digitale Visitenkarte (QR, .vcf-Download) | `Visitenkarte-Pascal-Courbois.dc.html` |
| Angebot/Rechnung — NeXify AI + TEILEKLAR | `Geschaeftsdokumente-Vorlagen.dc.html` |
| Endkunden-Broschüre (7 Seiten) | `Kundenbroschuere.dc.html` |
| Werkstatt-Erstansprache (5 Seiten) | `Partner-Broschuere.dc.html` |
| Investorengespräch (10 Folien) | `Investoren-PowerPoint.dc.html` |
| Werkstattpartner-Gespräch (10 Folien) | `Partner-PowerPoint Werkstatt.dc.html` |
| E-Mail: Angebot/Kontoeinladung | `E-Mail-Transaktional-Angebot.html` |
| E-Mail: Newsletter (mit Abmeldelink) | `E-Mail-Marketing-Newsletter.html` |

E-Mail-Vorlagen sind bewusst **kein** Design Component: Tabellenlayout, Inline-CSS, kein JavaScript, keine Web-Fonts — das einzige Format, das in echten E-Mail-Clients übersteht.

## Anschlusspunkte fürs Backend

Jede Stelle mit späterer echter API trägt `data-api-endpoint="…"` und/oder einen `TODO(BACKEND):`-Kommentar im Quelltext — u. a. `auth/login`, `auth/register`, `partner/profile`, `partner/vouchers/order`, `partner/appointments/status`, `customer/vouchers/redeem`, `customer/appointments/create`, `billing/pay`, `offers/accept`, `crosssell/order`, `documents/download`, `account/data-rights`.

## Was bewusst offen bleibt

- Social-Media-Profile/Links
- GoBD-Archivierungslösung für automatisierte Rechnungen
- Endgültige Preis-/Laufzeitdetails des Nachbarschaftskunden-Programms (Kleinunternehmerregelung, Mahnwesen, Kündigungsfolgen)
- Companion Director / Continuous Goal Loop — reine Backend-/Orchestrierungslogik für system.nexifyai.cloud, ausdrücklich kein Bestandteil dieses Front-End-Prototyps
- Dark-Theme-Umschaltung — Werte stehen im Kontrakt, keine Fläche schaltet um

Die physische Geschäftsadresse ist seit 04.09.2026 final bestätigt (Graaf van Loonstraat 1E, 5921 JA Venlo) und in Footer und Impressum aller Oberflächen produktiv.
