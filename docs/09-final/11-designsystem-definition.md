# 11 · Designsystem-Definition (Graphit & Lime, Fassung 2.0)

**Verbindlich für alle Bildschirmflächen.** Maschinenlesbar: `config/design-tokens.json` (Werte) und `config/design-rules.json` (Prüfregeln). Prüfung: `tools/ds-audit.js`. Ergebnis: `docs/09-final/12-abweichungsbericht.md`. Referenzimplementierung: `NeXifyAI Cloud v12.dc.html`; lebendes Regelwerk: `NeXify Designsystem.dc.html`.

Jede Regel hat eine ID (DS-x-nn). Im Code verweist der Konformitätsvermerk am Dateikopf (`<!-- NX-DS 2.0 … -->`) auf diese IDs.

## §1 Geltung und Dateiarten
| Art | Beispiele | Palette |
|---|---|---|
| bildschirm | alle Seiten und Bausteine | Graphit & Lime |
| papier | Broschüren, Folien, Dokumente, Visitenkarte | Papier-Variante (§7) |
| e-mail | E-Mail-HTML | Papier-Variante |
| legacy | Cloud v10/v11, NX 2026 Website | nicht Teil des Systems |

## §2 Farbe (DS-C-01 … DS-C-05)
Bildschirm: Graphit `#1B1E1D` `#1E2220` `#242826` `#2A2E2C` `#262A28` `#303634` · Linien `#363A38` `#4A4F4C` · Text `#FFFFFF` `#E3E6E3` `#BCC1BD` `#9CA29E` · Marke Lime `#D7FA50` (Verlauf `#EEFF9A`→`#BFE83C`) · Zustände Türkis `#6FE3CF`, Amber `#FFC24A`, Rot `#FF8A7A` · Licht Violett `#A78BFA` (nur Lichtflecken).
Abgeleitete Töne (nur für Verläufe und Glühen) stehen in `farbe.abgeleitet`. Veraltete Werte sind zu migrieren (`farbe.veraltet_migrieren`, z. B. `#3E4240 → #363A38`, `#FFA43A → #FFC24A`).
Text auf Lime ist immer `#111312` (DS-C-03). Papier-Vorschau-Fenster innerhalb von Bildschirmseiten (E-Mail, Rechnung, Suchergebnis) sind zulässig und werden als Info geführt (DS-C-05).

### Akzeptierte Identity-Szene · 28.10.2026

Die helle gemeinsame Hero-Bühne ist eine begrenzte Bildzwischenlösung nach der
angenommenen Identity-HTML-Version1 (SHA256
`87cce3dcfee53bc6573efe1ae81e76bdf80f81542f5e746448a96ed087057e0c`).
`color.identityScene` bindet ausschließlich deren Wand-/Bodenfarben, Tinte,
gedämpften Text, Akzent, Schatten, Papierkarten und Rand. Die übrige App bleibt
Graphit & Lime. CSS/SVG verwenden ausschließlich die generierten Tokens;
keine Figur erhält Farbfilter, Neugenerierung, andere Pose oder Beschnitt.
Gemeinsame proportionale Bühne auf Desktop, Text über Figuren bei schmalem
Container. Keine globale Themeänderung und kein Video-/Funktionsnachweis.

## §3 Typografie (DS-T-01)
Nur Geist (Text) und Geist Mono (Kicker, Zahlen, IDs, Zeiten). Größen und Zeilenhöhen siehe Designsystem-Seite. Enge Zeilenhöhe der großen Titel (`typografie … zeileEng`, in CSS `--as-z-eng`): 1,12 statt 1,05 seit 14.11.2026 (Inhaberbefund: Überschriften „ein bisschen weiter auseinander"); Hero-Titel, Abschluss-Titel, Konto-Titel und der Titel im Gespräch folgen diesem einen Wert. Papier: IBM Plex Mono aus der Druckvorlage ist als Ausnahme zugelassen.

## §4 Raum und Radien (DS-R-01)
4-px-Takt; Container `min(1280px, 100% − 48px)`. Radien: 4 Mini · 8 kleine Steuerung · 10 Button/Eingabe · 12 kleine Karte · 14 Grafik-Fenster/Well · 16 Karte · 18 Leit-Rahmen · 20 Leitkarte · Pille (≥ 999) · Kreis (50 %).

## §5 Flächen, Tiefe, Licht (DS-S-01, DS-S-02)
- **Karte** (ab Radius 12): Verlauf `#303634 → #262A28`, Rahmen 8 % Weiß, Lichtkante oben, Schlagschatten.
- **Well:** `#1E2220` mit Innenschatten.
- **Primärbutton:** Verlauf `#EEFF9A → #D7FA50 → #BFE83C`, Glanzkante, Lime-Schein, Text `#111312`; höchstens einer je Ansicht.
- **Seitengrund:** drei Lichtflecken (Lime, Türkis, Violett) auf `#242826`.

## §6 Bausteine (DS-B-01 … DS-B-03)
Jede Bildschirmseite nutzt `NX-Header` (voll, mit Hauptmenü *NeXify AI one · Demos · Shop · Preise · API*; kein `variante="leiste"`) und `NX-Footer`. Ausnahmen: Anwendungs-Shells (Workspace, myADMIN, Leitstand, Posteingang) und die Designsystem-Referenzseite ohne Fuß.

## §7 Papier-Variante (DS-C-02)
Tinte `#14191C`, Papier `#F2F3EF`, Cover `#0E1315`, Grau `#646769`, Lime als Fläche/Linie `#C8F04B` (nie als Schrift auf Weiß). Weitere Töne: `farbe.papier`.

## §8 Barrierefreiheit (DS-A-01 … DS-A-04)
`<title>` je Seite; Bilder mit `alt` (dekorativ: leer); kein `outline:none` ohne Ersatz; Fokus 2 px Lime; Bedienziele ≥ 44 px; Kontrast Text ≥ 4,5 : 1; Reduced-Motion schaltet Animationen ab.

## §9 Internationalisierung (DS-I-01 … DS-I-05)
- **Sprachen:** de (Quelle), nl, fr. **Märkte:** de-DE, de-AT, de-CH, nl-NL, nl-BE, fr-BE, fr-LU (Zuordnung in `i18n.maerkte`).
- **Bausteine:** `NX-Header` und `NX-Footer` führen alle Texte in drei Sprachen mit identischem Schlüsselsatz (DS-I-04, automatisch geprüft).
- **Seiten:** `<html lang>` gesetzt (DS-I-01); `lang` und `market` werden explizit an Kopf und Fuß übergeben (DS-I-02).
- **Formate:** Zahl, Währung, Datum folgen der **Textsprache** der Seite. `'de-DE'` fest verdrahtet ist deshalb korrekt, solange die Seite nur Deutsch ist (Info DS-I-03); bei Übersetzung zentral aus der Sprache ableiten. Beispiele: de `1.234,56 €` · nl `€ 1.234,56` · fr `1 234,56 €`.
- **Markt statt Sprache:** Preise, Steuersatz, Versandregeln und Rechtstexte folgen dem gewählten Markt (`localStorage 'nx-market'`).
- **Neue Texte:** zuerst deutsch, dann nl/fr im selben Wörterbuch; nie Sprachmix in einem Satz; Rechtstexte je Markt vom Recht freigeben lassen, nicht maschinell übersetzen.
- **Seitentext nur Deutsch** (DS-I-05) ist ein Übersetzungsauftrag, kein Fehler.

## §10 Prüfen und Pflegen
1. `tools/ds-audit.js` liest alle Dateien, wendet `config/design-rules.json` an und erzeugt den Bericht.
2. Ausnahmen stehen in `design-rules.json → ausnahmen` mit Begründung; ohne Eintrag gilt eine Abweichung als offen.
3. Neue Farbe, neuer Radius oder neue Fläche: zuerst in `design-tokens.json` und diese Definition, dann in den Code.


## Materialfortschreibung · 01.11.2026

Die aktuelle Nutzerentscheidung `USER-LUXURY-20261101` ergänzt diese historische Definition um Graphite Atelier: warmes Graphit, Platin, Champagner und gezieltes Glas an funktionalen Flächen. Primärquelle bleibt `config/design-tokens.json` (`color.atelier`, `radius.atelier`, `gradient.atelier*`, `shadow.atelier`); generierte Ausgabe in `packages/tokens`. Lime und das grüne X bleiben Markenanker. Inhaltstext liegt auf opaken Flächen; reduzierte Transparenz, höhere Kontraste und Reduced Motion haben eigene CSS-Rückfälle. Kein Norm-/Geräte-/Gesamtfreigabeclaim. Umsetzung und Medien-/REA-Grenzen: `docs/design/graphite-atelier-media-migration-2026-11-01.md`.


## Atelier-Farbherkunft · 02.11.2026

Die bisherigen Farbwerte von AtelierFilm und LuxuryMaterials liegen nun zentral unter color.atelier in config/design-tokens.json. 13 fehlende Werte wurden exakt übernommen, sechs bestehende Tokens wiederverwendet. Alle137 bisherigen Tokenwerte bleiben unverändert; aufgelöste CSS-Werte sind zur Vorfassung identisch. tokens.css/json/ts werden gemeinsam generiert. Dies ist eine Herkunftskorrektur, keine neue Marken- oder WCAG-Abnahme.

### Begrenzte TV-Fläche · 02.11.2026

Die aktuelle Nutzerkorrektur begrenzt ausschließlich den großen Hero-Film: `layout.filmMax = 1120px`, mittig mit Seitenabständen und vollständiger 16:9-Darstellung. Texte stehen außerhalb des Bildes; Rahmen und Licht verwenden die vorhandenen Atelier-Materialtokens. Bei offenem Desktop-Chat trennt `space.5 = 24px` die Seitenfläche vom unverändert breiten Assistenzdock. Mobile behält die bestehende Dialogdarstellung. Keine neue Szene oder Sprecherproduktion und keine Gesamtfreigabe.

## Home · räumliche Medienkante · 02.11.2026

Autorisierter Home-Review nach dem eingefügten Gesamtkonzept. `radius.homeMedia`
(36px), `shadow.homeMedia` und `gradient.homeMediaRim` ergänzen die vorhandenen
Atelier-Tokens. Die Farbe kommt aus bestehenden Platin-/Champagnerrollen, ohne
neue Markenpalette. Die begrenzte 16:9-Heroöffnung bleibt unverzerrt (contain),
mit schmalem Licht oben und dunkler Unterkante statt breitem Rahmen. Desktop-
Split 43/57; unter 760 CSS-px verfügbarer Inhaltsbreite gestapelt. Nachfolgende
Glasmotive sind statische Illustrationen; Leseflächen bleiben opak. Auf schmalen
Ansichten sind sie bewusst kleiner als die Heroöffnung. Bedienelemente 48px,
Fokus Lime, Reduced Motion und Contrast-Fallback erhalten.

### Home-Feinschliff · 02.11.2026

`typeHome.detail` (14px), `typeHome.reading` (15px) und
`gradient.homeDivider` ergänzen die bestehende Skala gezielt für Home.
Kleine Lesetexte werden größer, Aktionspfeile sind einheitliche dekorative SVGs,
Hover und Tastaturfokus teilen denselben Hinweis. Die Medienkante nutzt den
bereits vorhandenen `gradient.homeMediaRim`; keine neue Farbe. Auf schmalem
Hero bleibt die 48px-Videosteuerung als kompakte Schaltfläche im Bild, statt
unterhalb eine zusätzliche dunkle Fläche zu erzeugen. Reduced Motion bleibt
wirksam. Diese Details ändern nicht die freigegebene Home-Komposition.

### Große Bildschirme · direkte Nutzerkorrektur 02.11.2026

Die erste Verbreiterung auf2160px wurde durch die präzisere Nutzeranweisung
„je die Hälfte des aktuellen Leerraums“ ersetzt. `layout.homeWideMax` ist jetzt
`calc((100% + var(--layout-home-base-max)) / 2)` bei1440px Baseline. Große
Inhaltsflächen verwenden zusätzlich halbierte Innenränder. Damit halbiert sich
der ursprüngliche seitliche Leerraum auch mit geöffneter Seitenleiste. Ab 1400px Hero-Inhaltsbreite erhält die
Medienseite etwa 61 Prozent; native 16:9-Darstellung, bestehende Medienobergrenze
und kompakte Umbrüche bleiben. Home-Detail-/Lesetexte wachsen von 14/15px bis
16/18px über die tatsächliche Containerbreite. Prüfung explizit in 2761×1280 CSS-px,
mit und ohne Assistentenpanel; Unterseiten und Chatbreite bleiben separat.

### Home-Verfeinerung · 02.11.2026
Ein gemeinsamer Überschriftenverlauf `gradient.atelierHeading` verbindet Ink,
Champagne und Platinum. Er gilt für H1–H4, ohne Animation; hoher Kontrast und
Forced Colors erhalten einfarbige Schrift. Navigation, Angebote und Footer
verwenden dieselben Atelier-Materialien. Installations- und Diagnosebereich
liegen in einer gemeinsamen Footer-Innenfläche mit seitlichem und unterem Abstand.
Licht: `atelierAmbient` bildet drei weiche, seitenweite Lichtfelder; `atelierReflection`
zeichnet randgebundene Reflexe an Bildflächen; `atelierDepth` kombiniert einen
kurzen Kontaktschatten mit weicher räumlicher Tiefe. Keine laufenden Lichtanimationen.
