# Gestalterische Bestandsaufnahme und Abweichungsliste · 13.11.2026

Auftrag des Inhabers Pascal Courbois (13.11.2026): Design und Layout grundlegend erhalten,
auf jeder Seite hochwertig ausführen (3D, 2D, Glas, Tiefe laut Dokumentation), im Kopfbereich
jeder Seite ein passendes Video, sonst bleibt das Bild.

**Status: nur Bestandsaufnahme. An der Website wurde nichts geändert.**

## Wie geprüft wurde

- Stand `main` @ `0ea229c`, `pnpm build` in `apps/web` erfolgreich, `next start` lokal.
- Alle 36 Adressen aus `/sitemap.xml`, je 1440 × 900 und 390 × 844 (Chromium, Playwright):
  Bild der ersten Ansicht und der ganzen Seite, dazu Messwerte aus dem gerenderten Dokument
  (Überlauf, Bedienziele unter 44 px, Schriftgrößen, Radien, `backdrop-filter`, 3D-Transformationen).
- Gesichtet: alle 72 ersten Ansichten als Übersichtsbögen; ganze Seite nur für Startseite und
  `/leistungen/agenten-automatisierung` (1440 px).
- **Nicht geprüft:** Safari, Firefox, echte Geräte, NL/FR/EN, Tastaturbedienung, Kontrastmessung,
  Reduced Motion, Zwischenbreiten (320–1265 px), Abspielen der Videos, `make check`, Python-Tests.
- Lokal antworten `/api/session` und `/api/shop/*` mit 404 (keine Laufzeit-Zugänge). Leere
  Shop-Flächen sind deshalb kein Gestaltungsbefund.

## A. Dokumentierte Gestaltungsmittel (SOLL)

| Mittel | Vorgabe | Quelle |
|---|---|---|
| Material | Graphite trägt alles; Silber und sparsame Reflexe; Lime nur Marke und Handlung | `nexify-creative-experience-2026-11-09.md`, Tokens `color.atelier.*` |
| Glas | 20 px Blur, 10 % weiße Auflage, 1 px Highlight; Glas erklärt Ebenen, dekoriert nicht | `design_guidelines.md` (Materialvorgabe), Token `material.*`, `gradient.atelierGlass` |
| Tiefe / Licht | Lichteinfall 45° von oben links, gerichtete plus Umgebungsschatten; Hairlines vor Schatten in Navigation und Fuß | `design_guidelines.md` §11.2, Token `material.shadow`, `shadow.atelier*` |
| 3D | Film mit leichter Drehung und Perspektive | Token `material.filmTurn` (−0,5°), `filmPerspective` (1800 px), `filmCurvature` |
| 2D-Kulisse | subtile Spotlights und Light-Ribbons, keine Neon-Glows | `design_guidelines.md` §3.2, Token `gradient.atelier*`, `material.sectionGlow` |
| Bewegung | Bewegung ist Zustand; 180 ms Feedback; Reduced Motion schaltet alles ab | Token `motion.*` |
| Typografie | Plus Jakarta Sans (Display), Inter (Text), Geist Mono; H1 `clamp(40px, 4.4cqi, 64px)`, kompakt mindestens 36 px | Token `font.*`, `typeHero.*` |
| Maße | 8-px-Raster, Bedienziele 48 px, Radien 8/10/12/16/20/Pille | Token `target.min`, `radius.*` |
| Seitenfamilien | Leistungen: asymmetrische Medienkompositionen; Produkte: echte Oberflächen; TEILEKLAR: eigene Marke | `nexify-creative-experience-2026-11-09.md` |

Widersprüche in den Quellen (OFFEN, nicht eigenmächtig aufgelöst):

1. `docs/09-final/creative-factory-excellence-2026-11-09.md` ist im Repository **nicht vorhanden**
   (wird nur zitiert).
2. `design_home_master.md` und `design_page_families.md` sagen „keine Videos“. Die Entscheidung
   vom 13.11.2026 (Video auf jeder Seite) ist neuer und gilt; die beiden Dateien sind insoweit Historie.
3. `config/design-rules.json` (Stand 29.09.) nennt Geist und Lime `#D7FA50`; die Tokens
   (01.11./10.11.) nennen Inter, Plus Jakarta Sans und `#A8C76A`. Gerendert wird nach Tokens.

## B. Abweichungen (IST gegen SOLL)

### Seitenübergreifend

| Nr. | Befund | Beleg | Gewicht |
|---|---|---|---|
| G1 | H1 mit Verlaufsfüllung schneidet Unterlängen ab (g, p, y) | `scrollHeight` > Höhe: 73/70,5 px (`/leistungen/websites`, 1440), 105/100,8 px (`/teileklar`); sichtbar in allen Übersichtsbögen | hoch, klein zu beheben |
| G2 | H1 auf allen Inhaltsseiten 32,7 px bei 1440 px (Startseite 37 px); Token-Minimum 36 bzw. 40 px | Messwert `h1size` | hoch |
| G3 | Kopfbild klein: 462 × 260 px in 1440 px Breite (Startseite 537 × 302). Vorgabe: „großformatige Personenszene“ | Messwert `firstMedia` | hoch |
| G4 | Kein 3D: auf keiner Seite eine Perspektive oder 3D-Transformation, obwohl `material.film*` definiert ist | Messwert `t3d` = 0 auf 72/72 | mittel |
| G5 | Glas kaum vorhanden: 2 Elemente mit `backdrop-filter` je Inhaltsseite, 1 je TEILEKLAR-Seite, 5 auf der Startseite | Messwert `glass` | mittel |
| G6 | Mobil liegt das Kopfbild unter der ersten Ansicht (Oberkante bei 660–755 px von 844). Ein Video dort wäre beim Öffnen nicht sichtbar | Messwert `firstMedia y` | hoch für das Videoziel |
| G7 | Mobil überdeckt der schwebende Oracle-Knopf das rechte Ende der Haupt-Schaltflächen | Übersichtsbogen 390 px, u. a. `/teileklar/termine`, `/wissen` | mittel |
| G8 | Themen im Oracle-Bereich („Marke & Web“ …) sind unterstrichene Textlinks mit unruhigem Umbruch, kein Chip | erste Ansicht 1440 px, alle NeXify-Seiten | mittel |
| G9 | Brotkrumen zeigen oft nur „Startseite“ ohne aktuelle Seite; bei TEILEKLAR mobil „Startseite /“ und der Titel in eigener Zeile | Übersichtsbögen | niedrig |
| G10 | Unter dem Kopf folgen auf Inhaltsseiten nur Textblöcke und gleichförmige Karten, keine weitere Medienkomposition | ganze Seite `/leistungen/agenten-automatisierung` | mittel |
| G11 | Ankreuzfelder 24 × 24 px (unter 44 px) | `/kontakt`, `/teileklar/gutscheine`, `/teileklar/termine`, `/teileklar/partner-werden` | mittel |

Kein horizontaler Überlauf auf 72/72 Ansichten. Schriften: nur Inter, Plus Jakarta Sans, Geist Mono.

### Je Seite

| Seite(n) | Kopf heute | Auffälligkeit |
|---|---|---|
| `/` | Video Eingangshalle, 537 × 302 | Film klein im Verhältnis zur Bühne; im Text nur ein Textlink, keine Haupt-Schaltfläche |
| `/leistungen` | Bild hf-03 | G1–G3, kein Video vorhanden |
| `/leistungen/agenten-automatisierung`, `/apps-portale`, `/websites` | Bild + Video | G1–G3, G6; Kennzeichnung und Abspielknopf liegen als zwei dunkle Pillen auf dem Bild |
| `/produkte/nex-agentic-aifly` | Bild + Video | wie oben |
| `/produkte/nex2fly`, `/one`, `/api`, `/skills-mcp`, `/aifly-oracle` | Bild | G1–G3; keine echten Oberflächen (Vorgabe Produktfamilie) – es liegen keine vor, nichts erfinden |
| `/portale`, `/kontakt` | Bild hf-09 | G1–G3 |
| `/loesungen`, `/preise-ablauf`, `/leistungsumfang`, `/unternehmen`, `/wissen`, `/wissen/projekt-vorbereiten` | Bild | G1–G3 |
| `/teileklar` | **kein Bild, kein Video** | rechte Hälfte leer („Sortiment momentan nicht erreichbar“, lokal ohne Shop-Daten); Haupt-Schaltfläche silbern statt Lime |
| `/teileklar/fahrzeug-und-passung`, `/gutscheine`, `/termine`, `/partner-werden` | Bild 719 × 405 | G1; größeres Bild als bei NeXify, wirkt stimmiger |
| `/teileklar/batterie-berater`, `/reifenrechner`, `/werkstatt`, `/kategorien`, `/shop`, `/rechtliches` | ohne Bild | G1; Werkzeug- und Listenseiten, Bild nicht zwingend |
| `/impressum`, `/datenschutz`, `/cookies`, `/ki-hinweise`, `/barrierefreiheit`, `/vertragsgrundlagen` | ohne Bild | G1, G2; ruhig und lesbar, kein Video vorgesehen |

## C. Vorschlag Videozuordnung (noch nicht eingebaut, Szenen noch nicht gegen die Bilder abgespielt)

Regel aus `brand-media.ts`: Ein Video kommt nur dorthin, wo es dieselbe Szene zeigt wie das Kopfbild.

| Video | bereits auf | zusätzlich vorgeschlagen | Kopfbild dort |
|---|---|---|---|
| `eingangshalle` | Startseite | `/kontakt`, `/portale` | hf-09 Eingang |
| `fertigung` | `automation`, `nex-agentic` | `/teileklar/partner-werden` | hf-07 Fertigung |
| `tablet-foyer` | `apps-portals` | `/produkte/nex2fly` | hf-11 Tablet |
| `bemusterung` | `websites` | – | hf-14 |
| `logistik` | – | `/teileklar` (braucht dort erst einen Bildplatz) | hf-08 Förderanlage |

Ohne passendes Video, Bild bleibt: `/leistungen`, `/loesungen`, `/preise-ablauf`, `/leistungsumfang`,
`/unternehmen`, `/wissen`, `/wissen/projekt-vorbereiten`, `/produkte/one`, `/api`, `/skills-mcp`,
`/aifly-oracle`, übrige TEILEKLAR-Seiten, Rechtsseiten.

## D. Vorgeschlagene Pakete

1. **Startseite und Leistungen:** G1, G2, G3, G6, Kennzeichnung und Abspielknopf als eine Glasleiste, G4 am Film (Token `material.film*`).
2. **Produkte und Portale:** dieselbe Kopfbühne, Videos laut C, G8.
3. **TEILEKLAR:** Bildplatz mit Lagerhallen-Video auf der Startseite, G7, G9.
4. **Rechtsseiten:** nur G1, G2, G11; Texte unverändert.

Nachweise der Sitzung (Bilder, Messwerte) lagen im Arbeitsordner der Sitzung und sind nicht im Repository.
