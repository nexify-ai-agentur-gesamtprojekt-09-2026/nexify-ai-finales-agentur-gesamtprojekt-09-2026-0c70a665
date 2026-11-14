> **HISTORIE – abgelöst durch docs/konzept/FUEHRENDES-KONZEPT.md (14.11.2026)**

# NeXify AI — SOLL-Zielbild & Auditregister

Version: 1.0.0 · Stand: 08.11.2026 · Owner: Pascal Courbois · Delegiert an: Projektleitung (Build-Agent)
Quellen: NeXify AI Gesamtbeschreibung (Abschnitte 1–18), Designsystem „Graphite" (tokens.css/json),
17 freigegebene Higgsfield-Bilder, bisherige Sessionentscheidungen.

Grundregel (Statuskette, Abschnitt 13): Nur was nachweisbar getestet und unabhängig geprüft ist, gilt als
`ACCEPTED`. Alles andere bleibt offen (`PLANNED/CREATED/LOCALLY_TESTED/INTEGRATED/LIVE_VERIFIED/...`).

---

## 1. Verbindliches SOLL (konsolidiert)

### 1.1 Marke & Identität
- Marke NeXify AI; Claim „Chat it. Automate it."; Inhaber Pascal Courbois; Tagessatz 449 € netto.
- Haltung: hochwertig, ruhig, präzise, seriös — nie kitschig, nie wie ein KI-Template.
- Rechtsform OFFEN (Eenmanszaak KvK 90483944 vs. B.V.) — extern nicht ungeprüft nennen.

### 1.2 Design „Graphite"
- Graphit-Dunkel (#080A0F–#111212); Champagne (#C4B394) FÜHRENDER Akzent; Steel (#BDC5C9) Gegenpol.
- Lime (#C0EE38) NUR kleines Funktionssignal: Primär-CTA, Live-Punkt, Fokus, X im Logo. Kein grelles Lime.
- Typo: Plus Jakarta Sans (Headings), Inter (Body), Geist Mono (technisch). 8px-Raster.
- Material: Glas (blur ~20px), haptische Buttons, Champagne/Steel-Scrollbars.
- Bild-Baukastenregel: Champagne-Glaskante für ALLE Bilder AUSSER dem Hero-Spiegel.
- Keine Videos als Ersatz unter dem Hero; dezente Bewegung (Ken-Burns/Light-Sweep) statt Video.

### 1.3 Figuren & Bildwelt
- Pascal (Original), NeX (Tukan = Macher), AIFly ORACLE (grün, Hut+Monokel = Begleiter/Denker).
- NeX + ORACLE immer als Paar. Keine generischen Roboter, keine schwebenden grünen Kugeln.
- AUSSCHLIESSLICH die 17 freigegebenen Higgsfield-Bilder (`/public/media/higgsfield/hf-01…hf-17`).
  Keine Fremd-/Stockbilder, keine alten Platzhalter. Videos: verworfen („vergesse Videos").

### 1.4 Stimme & Inhalt
- „Sie", ruhig, konkret; kurze Sätze; ein Akzentsatz je Abschnitt.
- Leitbegriffe: Vorhaben · ein Ansprechpartner · aus einem Konzept · klarer Preis · auf Knopfdruck.
- Motive: „Ein X. Ein Y." / „Erst das Vorhaben, dann die Technik."
- Keine erfundenen Leistungen/Referenzen; nur belegte Verfügbarkeit.

### 1.5 Seiten & Funktionen (Abschnitt 16, Auszug Pflicht)
- Startseite: Hero (Text links, Medienbereich rechts), Vorhaben, Leistungen, Zusammenarbeit, Budget,
  Produktwelt, Chat (Oracle), Kontakt, Footer. Gemeinsamer Header/Footer.
- Auth: Clerk; Links /login → /anmelden, /signup → /registrieren.
- Rechtstexte: Impressum (Registergericht Roermond), Datenschutz, AGB. KI-Hinweise (EU AI Act).
- Pro Seite: eine H1, 8 Kundenfragen beantwortet, SEO (Title/Description/Canonical nexifyai.cloud/hreflang/
  strukturierte Daten ProfessionalService), WCAG 2.2 AA, PWA, Lade-/Leer-/Fehlerzustände, 404.
- TEILEKLAR.shop: eigenständige Marke (FastAPI/MongoDB/BigBuy/Revolut/Resend), /teileklar/admin.
- Portale: Kundenportal, Partnerportal/Werkstattwelt — strikt mandantengetrennt.

### 1.6 Technik
- Frontend Next.js (apps/web); Backend FastAPI+MongoDB (apps/shop-api). UUIDs, timezone-aware.
- Chat über 9router/LLM; Higgsfield Seedance 2.5 serverseitig (HF_KEY, nur Server).
- Mehrsprachig: DE führend; NL/FR/EN je Seite geprüft.

---

## 2. IST ↔ SOLL — Auditregister (öffentliche Startseite + Kernbefunde)

| # | Prüfgegenstand | SOLL | IST (08.11.) | Status | Beleg |
|---|----------------|------|--------------|--------|-------|
| A1 | Frontend erreichbar | läuft | Next.js Dev, GET / 200 | LIVE_VERIFIED | supervisor/log |
| A2 | Hero-Medien | Higgsfield-Foto, kein Video | hf-02 Foto, Video entfernt | LIVE_VERIFIED | Screenshot |
| A3 | Hero ohne Champagne-Kante | Hero-Spiegel ohne Champagne | umgesetzt | LIVE_VERIFIED | CSS/Screenshot |
| A4 | Galerie-/Produktbilder | Champagne-Glaskante | umgesetzt | LIVE_VERIFIED | Screenshot |
| A5 | Produktwelt-Bilder | 4 distinkte Higgsfield | umgesetzt (hf-06/09/03/05) | LIVE_VERIFIED | Screenshot |
| A6 | Bild-URLs | keine 404 | hf-04 404 → behoben | FIXED → zu TESTEN | testing_agent |
| A7 | /login, /signup | → /anmelden, /registrieren | 404 → 308 Redirect | FIXED → zu TESTEN | testing_agent |
| A8 | Öffentliche Routen (49) | alle erreichbar | alle 200 | LIVE_VERIFIED | curl-Sweep |
| A9 | KI-Hinweise | befüllt (EU AI Act) | Inhalt in 4 Sprachen vorhanden | INTEGRATED | site-map.json |
| A10 | HTML lang | de/nl/fr korrekt | lang="de" | INTEGRATED | curl |
| A11 | Hero-Texte | Markenstimme, 4 Sprachen | neu geschrieben | LIVE_VERIFIED | Screenshot |
| A12 | Abschluss-Bereich | hochwertig, freigestelltes Trio | hf-17 + Bodenlichtschein | LIVE_VERIFIED | Screenshot |
| A13 | Higgsfield Seedance 2.5 | serverseitig, lauffähig | Auth ok; Credits fehlen | BLOCKED (Konto-Credits) | run-log |

---

## 3. Offene Lücken / Abweichungen (priorisiert, geschlossene Regelkreise)

P1 (Konzept-Pflicht, hohe Sichtbarkeit)
- Weitere öffentliche Seiten (Leistungs-Detail, Produkte/Tarife) mit Higgsfield-Bildwelt + Markentext.
- SEO je Seite: Canonical nexifyai.cloud, hreflang, strukturierte Daten ProfessionalService — verifizieren.
- Bildwelt-Audit: evtl. verbliebene Alt-/Fremdbilder auf Unterseiten gegen die 17 Higgsfield-Bilder tauschen.

P2 (Funktion)
- Kontaktformular → Speicherung + Resend-Mail an mail@nexifyai.cloud (end-to-end testen).
- Oracle-Chat (9router/Claude/OpenAI) end-to-end testen und absichern.
- TEILEKLAR.shop: Produktdarstellung, Warenkorb/Checkout, BigBuy/Revolut/Resend, /teileklar/admin.

P3 (Konto/extern, eskaliert)
- Higgsfield-Credits aufladen (für Seedance/Bildproduktion).
- Rechtsform, Basisfarbe #080A0F vs. #0A0C10, Hero-Video, Logo-ZIP — Inhaberentscheidungen (Abschnitt 18).

---

## 4. Regelkreis-Protokoll (dieser Zyklus)
- Analysiert: Startseite + 49 Routen + Bild-URLs + Auth-Links.
- Implementiert: hf-04-Referenz, /login+/signup Redirects, Champagne-Glaskante, Produktbilder, Abschluss-Design.
- Nachweis offen: testing_agent-Report (A6, A7) — Pflicht vor „fixed".
- Nächster Zyklus: P1-Seiten + Kontakt/Resend end-to-end.
