# CI-Schema NeXify AI — verbindlich (v4, hell-dunkel mit Leuchtverläufen)

**Dokument-ID:** CI-002 · **Stand:** 25.09.2026 · **Status:** gültig für alle NeXify-AI-Flächen · ersetzt die Farb- und Schriftangaben in `Designsystem.md` (hell) für NeXify AI. **TEILEKLAR** behält bis zur Entscheidung des Betreibers sein helles System (Papier/Graphit, siehe `CLAUDE.md`).
**Gilt zusammen mit:** `NeXifyAI-CI-und-Logo.md` (Charakterfamilie, bleibt gültig) · `NeXify-Marketingkonzept.md` (Botschaft) · `seitenplan-gesamt.md` (Flächen).
**Referenzimplementierung:** `NeXifyAI Cloud v3.dc.html`, `NX-Header.dc.html`, `NX-Footer.dc.html`.

---

## 1. Markenkern

| Ebene | Inhalt |
|---|---|
| **Wofür wir stehen** | Automatisierung, die im Betrieb läuft und an einer Zahl gemessen wird. |
| **Versprechen** | Kennzahl statt Versprechen. Fester Tagessatz. Code, Daten und Zugänge gehören dem Kunden. |
| **Beweis** | TEILEKLAR — der eigene Shop, live prüfbar. |
| **Haltung** | Ingenieurhaft, ruhig, direkt. Wir sagen, wenn sich ein Projekt nicht lohnt. |
| **Claim** | *chat it. Automate it.* (klein geschrieben „chat“, Großbuchstabe „Automate“ — bewusst) |
| **Kernsatz Website** | Ihr Unternehmen. Auf Autopilot. |

## 2. Name und Schreibweise

| Richtig | Falsch |
|---|---|
| **NeXify AI** (Marke, Agentur, Berater) | Nexify AI · NeXifyAI (nur in Dateinamen/Domains) · NEXIFY |
| **NeXify AI by NeXify** (Rechtsträger im Impressum) | NeXify GmbH |
| **KI** im Fließtext | AI im deutschen Fließtext (Ausnahme: Markenname) |
| **TEILEKLAR** (Versalien) | Teileklar · TeileKlar |
| nexifyai.cloud · teileklar.shop (klein) | NeXifyAI.cloud |

## 3. Logo und Signet

- **Lockup:** Signet (20 px im Kopf, 24 px im Fuß) + Wortmarke „NeXify AI“, Geist 700, Laufweite −0,03 em, Abstand 12 px.
- **Schutzzone:** Höhe des Signets rundum. Mindestgröße Signet 16 px digital, 8 mm Druck.
- **Auf dunklem Grund:** Wortmarke `#F4F5F2`, Signet im Original. Auf Lime-Grund: Wortmarke `#0A0C0D`.
- **Signet-Bewegung:** nur bei echtem Systemzustand (hört zu, arbeitet, erledigt). Im Kopf- und Fußbereich **ruhend** — keine Daueranimation.
- **Verboten:** Signet neu zeichnen, verzerren, mit Verlauf/Schatten/Leuchten versehen, auf unruhigen Fotos ohne Fläche.

## 4. Farbe

**Grundregel:** eine Fläche (Tiefschwarz), zwei Ebenen darüber, ein Akzent (Lime). Amber nur für „offen“. Keine Verläufe, kein Leuchten.

| Token | Hex | Verwendung | Kontrast auf `#0A0C0D` |
|---|---|---|---|
| `bg` | `#202321` | Seitenfläche | — |
| `surface-1` | `#252827` | Karten, Abschnitte im Wechsel | — |
| `surface-2` | `#2B2F2D` | hervorgehobene Karte, Eingaben, Dialog | — |
| `surface-3` | `#2E3230` | Hover-Fläche | — |
| `line` | `#303432` | Abschnittstrenner | — |
| `line-strong` | `#383C3A` | Kartenrahmen, Raster | — |
| `line-control` | `#4A4F4C` | Rahmen von Schaltflächen und Eingaben | — |
| `text` | `#FFFFFF` | Überschriften, Fließtext stark | 17,9 : 1 |
| `text-2` | `#E3E6E3` | Fließtext | 12,5 : 1 |
| `text-3` | `#BCC1BD` | Metadaten, Beschriftungen | 8,4 : 1 |
| `text-4` | `#9CA29E` | nur Fußnoten ≥ 12 px, Platzhalter | 5,3 : 1 |
| **`lime`** | `#D7FA50` | Hauptaktion, aktiver Zustand, Akzentwort | 15,0 : 1 |
| `lime-hover` | `#E4FF7A` | Hover der Hauptaktion | — |
| `on-lime` | `#111312` | Schrift auf Lime | 15,0 : 1 |
| `lime-tint` | `rgba(200,240,75,.1)` | aktive Kapsel, Auswahl | — |
| `amber` | `#FFA43A` | „eine Frage offen“, Zahlung fällig | 7,4 : 1 |
| `amber-text` | `#F4C58F` | Text auf Amber-Tönung | — |
| `red` | `#FF6B57` | blockiert, Fehler | 5,3 : 1 |

**Verboten auf dunklem Grund:** jede Fläche mit Luminanz über 0,45 außer Lime; Text unter `#7E878B`; Lime als Fläche unter Fließtext.

### Charakterfamilie auf dunklem Grund (ergänzt `NeXifyAI-CI-und-Logo.md` § 4)

| Charakter | Form | Badge-Grund | Textfarbe dunkel |
|---|---|---|---|
| NeXify AI · Vertrieb | Kreis | `rgba(200,240,75,.12)` | `#C8F04B` |
| NeXify Support | Sechseck | `rgba(240,184,75,.14)` | `#F0B84B` |
| NeXify Research | abgerundetes Quadrat | `rgba(122,140,255,.14)` | `#9AA8FF` |
| TEILEKLAR-Berater | Raute | `rgba(200,240,75,.12)` | `#C8F04B` |

### Verläufe und Leuchtflächen (v4, 26.09.2026)
- Kopfbereich: drei weiche Radialschimmer – Lime `rgba(215,250,80,.20)`, Türkis `rgba(64,210,190,.16)`, Violett `rgba(140,120,255,.12)`.
- Akzentwort in Überschriften: Verlauf `#D7FA50 → #F6FF8A → #6FE3CF`.
- Hervorgehobene Karten: 1-px-Verlaufsrahmen Lime → Türkis → Violett, farbiger Schein darunter.
- Abschnitte im Wechsel: ein Schimmer je Abschnitt, Farbe rotiert Lime/Türkis/Violett.
- Hauptaktion: Glanzverlauf `#E4FF7A → #D7FA50`, Schein `rgba(215,250,80,.55)`.
- Kontraste auf `#202321`: Text 16,1 · Text-2 12,9 · Text-3 8,9 · Text-4 6,2 · Lime 13,7 · Tinte auf Lime 15,7.

## 5. Schrift

| Familie | Schnitte | Einsatz |
|---|---|---|
| **Geist** | 400 · 500 · 600 · 700 | alles Lesbare |
| **Geist Mono** | 400 · 500 · 600 | Kicker, Preise, Kennzahlen, Status, Code, Fußnoten |

```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

| Stufe | Größe | Gewicht | Laufweite | Zeilenhöhe |
|---|---|---|---|---|
| Display (Hero) | clamp(44 px, 6,4 vw, 88 px) | 600 | −0,045 em | 1,0 |
| H1 Unterseite | clamp(40, 5,4 vw, 72) | 600 | −0,045 em | 1,0 |
| H2 | clamp(32, 4 vw, 52) | 600 | −0,04 em | 1,05 |
| H3 | 20–32 | 600 | −0,02 bis −0,03 em | 1,15–1,2 |
| Lead | 18–19 | 400 | 0 | 1,55 |
| Fließtext | 15–17 | 400 | 0 | 1,55–1,65 |
| Kicker (Mono) | 13 | 400 | 0 | — · **Lime**, normale Schreibung, **keine Versalien** |
| Meta (Mono) | 12–13 | 400 | 0 | — |

**Nie:** Gewicht 800/900, Versalien mit weiter Laufweite, Schrift unter 12 px, eine dritte Familie.

## 6. Raster, Form, Tiefe

- 4-px-Raster. Container `min(1280px, calc(100% − 48px))`, Lesetexte 760 px, Rechtstexte 760 px.
- Sektionsabstand `clamp(72px, 8vw, 112px)`; jede Sektion endet mit `1px #1E2326`.
- **Radien:** 4 px Kapseln/Tags · 6 px Schaltflächen/Eingaben · 8 px kleine Panels · 12 px Karten/Dialoge. Keine größeren Radien, keine Pillen.
- **Kartenraster:** Karten ohne Abstand, getrennt durch 1-px-Linien (`gap:1px` auf `#262B2E`).
- **Tiefe:** keine Schatten auf Karten. Nur schwebende Elemente (Berater, Dialog): `0 40px 80px -32px rgba(0,0,0,.8)`.
- **Hintergrundraster:** 64-px-Linienraster `#14181A` mit Maske nur in Hero, Seitenkopf und Abschluss-Aufruf.
- **Klickflächen ≥ 44 px**, Hauptaktion 52 px.

## 7. Bausteine

| Baustein | Regel |
|---|---|
| Hauptaktion | Lime, Schrift `#0A0C0D` 600, Radius 6, rechts ein Mono-Pfeil „→“ |
| Zweitaktion | Rahmen `#33393C`, Schrift `#F4F5F2`, Hover-Rahmen Lime |
| Aktiver Menüpunkt | 1-px-Linie Lime unter dem Wort, Schrift weiß |
| Auswahl/Segment | aktives Segment Lime mit dunkler Schrift, sonst Rahmen `#33393C` |
| Status-Tag | Rahmen in Statusfarbe 40 %, Punkt 6 px eckig, Mono 12 px |
| Nummerierung | Mono 44–64 px, erste/aktive Nummer Lime, übrige `#6B7478` (4,1 : 1 — nur für Großschrift ab 24 px zulässig) |
| Terminal-Karte | Kopfzeile mit drei Punkten `#262B2E`, Mono 14 px, `$` Lime, `?` Amber, `✓` Lime |
| Zitat | große Schrift 500, Anführungszeichen in Lime |

## 8. Bildsprache

- Keine Stockfotos von Menschen am Laptop, keine Roboter, keine Gehirne, keine Neonkreise.
- Echte Oberflächen (Portal, Shop, Terminal-Ablauf) als Beweis. Porträt Pascal: ruhig, natürliches Licht, neutraler Grund.
- Grafiken nur mit Datenquelle (A-31).

## 9. Sprache

| Regel | Beispiel falsch | Beispiel richtig |
|---|---|---|
| Kurz, Hauptsatz vorn | „Wir ermöglichen Ihnen eine ganzheitliche…“ | „Wir bauen den Agenten. Sie messen das Ergebnis.“ |
| Zahl statt Adjektiv | „blitzschnell“ | „in 1 bis 3 Arbeitstagen“ |
| Kein Superlativ ohne Beleg | „modernste“, „um ein Vielfaches“ | „moderne“, „deutlich“ + Beleg |
| Kein internes Vokabular | „Cron-Wächter“, „Mehrsitzzugriff“, „L3-Evidenz“ | „automatische Wächter“, „mehrere Nutzer“, „geprüfter Durchlauf“ |
| KI wird gekennzeichnet | „unser Assistent“ ohne Hinweis | „NeXify AI — automatisierte Beratung durch KI“ |
| Siezen (NeXify AI), Duzen (TEILEKLAR) | gemischt | konsequent je Marke |
| Überschriften mit Punkt als Rhythmus | „Drei Prinzipien – keine Ausnahmen!“ | „Drei Prinzipien. Keine Ausnahmen.“ |
| Deutsche Anführungszeichen, Halbgeviertstrich mit Leerzeichen | "…", - | „…“, – |

## 10. Anwendungen

| Medium | Grund | Status |
|---|---|---|
| Website, Portale, Anmeldung | dunkel | umgesetzt (15 Flächen) |
| E-Mails | **hell** (Mailprogramme stellen Dunkelmodus uneinheitlich dar) | Lime nur als Schaltfläche |
| Geschäftsdokumente (Angebot, Rechnung) | **hell**, DIN 5008 | Entscheidung Pascal offen |
| Broschüren, Präsentationen | offen | Entscheidung Pascal offen |
| Social-Media-Vorlagen | dunkel, Raster-Motiv, eine Kernaussage | offen |
| Visitenkarte | dunkel | nachziehen |

## 11. Prüfliste vor Freigabe (jede neue Fläche)

1. Nur Tokens aus § 4, keine helle Fläche außer Lime.
2. Kontrast Text ≥ 4,5 : 1 (gemessen), Fokus sichtbar (2 px Lime).
3. Nur Geist/Geist Mono, kein Gewicht über 700, keine Versalien-Kicker.
4. Radien ≤ 12 px, keine Schatten auf Karten.
5. Jede Werbeaussage belegt (Quelle, Datum) oder entfernt.
6. KI-Hinweis, wo der Berater spricht.
7. Klickflächen ≥ 44 px, Umbruch ohne Abschneiden bei 360 px Breite.


---

## v7 · Verbindliche Werte nach Referenz (Click UI, ClickHouse) · 26.09.2026

Quelle: Repository ClickHouse/click-ui @537131f, `src/theme/styles/tokens-dark.css`. Diese Werte ersetzen alle Farb-, Schrift- und Radiusangaben oben.

| Token | Wert | Click-UI-Quelle |
|---|---|---|
| Fläche Standard / Karte | `#1F1F1C` | global-color-background-default, card-primary-background |
| Fläche gedämpft | `#282828` | global-color-background-muted |
| Rahmen | `#323232` · stark `#414141` | global-color-stroke-default / -intense |
| Text | `#FFFFFF` · gedämpft `#B3B6BD` · deaktiviert `#808080` | global-color-text-* |
| Akzent / Link | `#FAFF69` · Hover `#FEFFC2` | global-color-accent-default, text-link-* |
| Hauptaktion | Grund `#FAFF69`, Schrift `#1F1F1C` | button-basic-primary |
| Gefahr / Warnung (Text) | `#FFBABA` / `#FFB88F` | text-danger / text-warning |
| Radius Schaltfläche, Karte | 4 px | button-radii-all, card-primary-radii-all |
| Schrift | Inter (Fließtext), Inconsolata (Mono) | typography-font-families-regular / -mono |

Display-Schrift der Referenz ist „Basier Square“ (kommerziell lizenziert). Sie ist nicht eingebunden; Überschriften nutzen Inter. Für eine Lizenz entscheidet der Betreiber.


## Wortmarke · 26.09.2026
„NeXify AI“: das **X** steht immer in CI-Lime. Auf dunklem Grund `#D7FA50`, auf hellem Papier `#8AB51C` (dunkle Stufe des Signet-Verlaufs, damit das X sichtbar bleibt). Übrige Buchstaben in Textfarbe. Logos sind von den WCAG-Kontrastregeln ausgenommen (1.4.3).


## Beschluss 26.09.2026 · Bildschirmergänzung zu NEXIFYAI-CD-2026 (Weg B)

Beschlossen durch Pascal Courbois. Ergänzt die Akte, ersetzt sie nicht.

| Bereich | Druck / PDF (unverändert CD-2026) | Bildschirm (Website, Portale, Shop, Artifacts) |
|---|---|---|
| Schrift | Helvetica / Helvetica-Bold | Geist, Geist Mono (Kennzahlen, Metadaten) |
| Grund | `#0B1016` | `#242826`, Flächen `#2A2E2C` / `#303432` |
| Akzent | Neon `#9CFF3A` | Lime `#D7FA50`, Hover `#E4FF7A` |
| Wortmarke | X in Neon | X in Lime `#D7FA50` (auf Papier `#8AB51C`) |
| Nebenfarben | – | Türkis `#6FE3CF`, Violett `#9B8CFF` nur in Verläufen/Grafik, nie bedeutungstragend |
| Claim | „Chat it. Automate it.“ | ebenso, im Fußbereich jeder Fläche |

Kontraste (WCAG 2.2, gerechnet): alle Text/Grund-Paare ≥ 4,86 : 1. Governance: neue Farben nur per Antrag mit Nachweis, dass keine bestehende Rolle passt. Quelle der Messwerte: `docs/01-konzept/CD-Abgleich-NEXIFYAI-CD-2026.md`.
