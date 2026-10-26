# Handbuch — Kopf, Fuß und die Anmeldeschicht

**Für jede neue Fläche verbindlich.** Werte: `design/tokens.json`. Schichten: `ARCHITEKTUR.md`. Betreibervorgabe: `CLAUDE.md` — steht über allem.

Vier Bausteine, je eine Definition:

| Baustein | Datei | Eingebunden in |
|---|---|---|
| Kopf | `NX-Header.dc.html` | 16 Bildschirmflächen |
| Fuß | `NX-Footer.dc.html` | 15 Bildschirmflächen |
| Vor der Anmeldung | `Anmeldung.dc.html` | 10 Bildschirme in einer Datei |
| Nach der Anmeldung | `Konto.dc.html` | 8 Bereiche in einer Datei |

---

## 1 · Der Kopf

### Warum zwei Ebenen

**Ebene 1 — Graphit, scrollt weg.** Markenwahl (NeXify AI ↔ TEILEKLAR), Portale, Markt und Sprache. Das ist Systemnavigation, keine Seitennavigation — sie muss nicht mitfahren.

**Ebene 2 — Papier, sticky.** Lockup, Kontextlabel, Hauptnavigation, Kontozustand, eine Aktion. Das ist die Ebene, die beim Scrollen gebraucht wird.

### Was vorher falsch war

Vor dieser Überarbeitung gab es **neun handgebaute Plattformleisten und acht verschiedene Sticky-Header** — 64, 68 und 74 px Höhe, 8, 12 und 20 px Blur, `#E2E4E0` neben `#E0E2DC`, z-index 20 neben 40. Dazu vier belegbare Fehler:

| Befund | Belegt durch | Behoben durch |
|---|---|---|
| Leiste zentriert | Nutzer verbringen 69 % mehr Zeit auf der linken Bildschirmhälfte (NN/g, „Horizontal Attention Leans Left", 2024) | Marke, Portale und Navigation **linksbündig**; nur Markt/Sprache und Konto rechts |
| Dünner Streifen ganz oben | Banner Blindness (Benway & Lane 1998; NN/g fortlaufend) — bannerartige Zonen werden übersprungen | Ebene 1 trägt keine kritische Aktion; die Hauptaktion sitzt in Ebene 2 neben dem Kontozustand |
| `padding:3px 10px` ≈ 17 px hohe Links | Fitts's Law; WCAG 2.2 SC 2.5.8 | jedes Element `min-height:44px` |
| Kein Skip-Link auf 22 Flächen | WCAG 2.4.1 A | erster fokussierbarer Knoten ist „Direkt zum Inhalt", sichtbar bei Fokus |

Zusätzlich: `scroll-padding-top: 124px` auf `:root`, damit die sticky Ebene 2 keinen fokussierten oder angesprungenen Knoten verdeckt (**WCAG 2.2 SC 2.4.11**).

### Einbinden

```html
<dc-import name="NX-Header"
  marke="cloud" nav="cloud" active="leistungen" kontext="Agentur"
  cta="beratung" variante="voll"
  angemeldet="{{ jaAngemeldet }}" rolle="unternehmen" initialen="EM"
  lang="{{ lang }}" market="{{ markt }}" on-market="{{ pickMarket }}"
  hint-size="100%,124px"></dc-import>
```

| Prop | Werte | Bedeutung |
|---|---|---|
| `marke` | `cloud` · `shop` | bestimmt Lockup (Signet oder Lime-Quadrat) und aktive Marke in Ebene 1 |
| `variante` | `voll` · `leiste` | `leiste` rendert **nur Ebene 1** — für Flächen mit eigenem Fachkopf (Shop-Fahrzeugleiste, Portal-Kopf, Werkzeugkopf) |
| `nav` | `cloud` · `shop` · `werkzeug` · `portal` · `partner` · `intern` | wählt den Navigationssatz |
| `active` | Linkschlüssel | markiert den aktuellen Punkt mit `aria-current="page"` |
| `kontext` | Freitext | Mono-Label neben dem Lockup („Kundenportal", „Klarwissen") |
| `cta` | `beratung` · `teile` · `termin` · `partner` · `keine` | Hauptaktion; `keine` lässt sie weg (Portale, Systemflächen) |
| `ctaHref` | Pfad | überschreibt das Ziel der Hauptaktion |
| `angemeldet` | `true` · `false` | schaltet zwischen Anmelde-Schaltfläche und Konto-Kapsel |
| `rolle` | `unternehmen` · `werkstatt` · `autofahrer` · `intern` | Rollenlabel in der Konto-Kapsel |
| `market` / `lang` / `on-market` | wie beim Fuß | ohne `on-market` verwaltet der Kopf die Wahl selbst und merkt sie in `localStorage` (`nx-market`) |

**Regel:** `variante="leiste"` wo die Fläche einen eigenen Fachkopf hat, `variante="voll"` sonst. Zwei Lockups übereinander sind ein Fehler.

**Nicht eingebunden** sind `Visitenkarte-Pascal-Courbois.dc.html` und `Geschaeftsdokumente-Vorlagen.dc.html` — Druckstücke haben keinen Navigationskopf. Das ist Absicht, kein Rückstand.

---

## 2 · Der Fuß

`NX-Footer.dc.html` bleibt die einzige Fußdefinition: Marken-Lockup, fünf Linkspalten über beide Marken, sieben Märkte mit Steuersatz und aktivem Zustand, i18n de/nl/fr, Betreiberzeile, B2B-Hinweis.

**Markt- und Sprachwahl teilen sich Kopf und Fuß denselben Speicher** (`localStorage`-Schlüssel `nx-market`). Wer eine Fläche baut, hat zwei Möglichkeiten:

- **Die Fläche steuert:** `market`, `lang` und `on-market` an *beide* Bausteine geben. Dann hält die Fläche den Zustand und beide bleiben synchron.
- **Die Fläche steuert nicht:** `on-market` weglassen. Beide Bausteine verwalten sich selbst und lesen denselben Speicher.

Eine Mischform — Kopf gesteuert, Fuß nicht — läuft auseinander und ist ein Fehler.

---

## 3 · Vor der Anmeldung · `Anmeldung.dc.html`

Zehn Bildschirme in einer Datei, umschaltbar über die Leiste am Kopf der Fläche:

`anmelden` · `rolle` · `registrieren` · `einwilligung` · `bestaetigen` · `zwei-faktor` · `passwort-vergessen` · `passwort-neu` · `gesperrt` · `einladung`

### Aufbau

Zwei Spalten, `flex 1 1 400px` links und `1 1 520px` rechts — bei schmaler Breite bricht die Bühne über das Formular. Links die **Studiobühne**, rechts das **Formular**. Nie umgekehrt: das Formular gehört auf die Seite, auf der der Blick nach dem Lesen der Bühne landet.

### Die Studiobühne

Der Licht-Kern ist die von der Blaupause verlangte Referenz (Säule 3: „echte Licht-Effekte statt Standard-Radial-Glow"): vier wandernde Lichtzentren auf `<canvas>`, weiche Radialüberblendung im `lighter`-Modus, Vignette, feines Grain aus einer 72-px-Kachel. Dazu das etablierte 80-px-Spaltenraster und eine Innenkante aus `inset`-Schatten.

Gesteuert über den Tweak `lichtkern`:

| Wert | Verhalten |
|---|---|
| `bewegt` | `requestAnimationFrame`, wandernde Zentren — Vorgabe |
| `ruhig` | ein einziges Standbild, kein Timer |
| `aus` | flaches Graphit, kein Kanvasinhalt |

`prefers-reduced-motion: reduce` erzwingt **immer** `ruhig`, unabhängig vom Tweak. Der Kanvas trägt `aria-hidden="true"` und rechnet mit `devicePixelRatio`, gedeckelt auf 2.

Auf der Bühne liegt die **Kontokarte** als 3D-Objekt: `perspective:1000px` am Elternknoten, `transform-style:preserve-3d`, Inhalt auf `translateZ(24px)`, Bodenschatten auf `translateZ(-40px)`. Zeigerbewegung kippt sie um maximal 9° / 13° und verschiebt den Glanzkern; ohne Zeiger steht sie auf `rotateX(4deg) rotateY(-9deg)`. Beim Verlassen fährt sie in `.32s` zurück, während des Zeigens folgt sie in `.1s linear`.

### Das Formular — nach DIN EN ISO 9241-143

- **einspaltig**, Beschriftung über dem Feld, nie daneben
- **Pflichtangabe in Worten** („Pflichtangabe", „Freiwillig") — nicht nur als Sternchen
- **Hinweistext dauerhaft** unter dem Feld, verknüpft über `aria-describedby`; nie als Platzhalter, der beim Tippen verschwindet
- **Gruppen in `fieldset` mit `legend`** (Rollenwahl, Einwilligungen)
- **Fehlerbündel oben** mit `role="alert"`, zusätzlich zur Feldmarkierung
- **`autocomplete` an jedem Feld** (`email`, `current-password`, `new-password`, `one-time-code`) — WCAG 1.3.5

### Was in dieser Schicht ausdrücklich nicht vorkommt

| Nicht vorhanden | Grund |
|---|---|
| Wiederholungsfeld für das Passwort | WCAG 2.2 SC 3.3.7 — keine doppelte Eingabe |
| Bilderrätsel, Rechenaufgabe, Gedächtnisabfrage | WCAG 2.2 SC 3.3.8 — kein Test kognitiver Funktionen als Zugangshürde |
| Verbot des Einfügens | ebenda — Passwortmanager müssen funktionieren |
| Erzwungene Zeichenklassen, Zwangswechsel nach Kalender | BSI TR-02102-1, NIST SP 800-63B — Länge statt Zeichensalat |
| Voreingestellte Einwilligungshäkchen | DSGVO Art. 4 Nr. 11, Art. 7 Abs. 2 |
| Auskunft, ob zu einer Adresse ein Konto besteht | ISO/IEC 27001 A.5.17, OWASP ASVS 2.5 — sonst sind Kundenlisten auslesbar |
| Dauerhafte Kontosperre nach Fehlversuchen | ISO/IEC 27001 A.8.5 — Zeitsperre mit sichtbarer Restzeit und offenem Ausweg |

### Passwortstärke

Vier Segmente, gestuft nach **Länge**: unter 12 rot, ab 12 amber, ab 16 grün, ab 20 grün. Kein Punktesystem über Zeichenklassen. Der Text daneben nennt die Zeichenzahl im Klartext und liegt in `aria-live="polite"`.

---

## 4 · Nach der Anmeldung · `Konto.dc.html`

Acht Bereiche, links ausgerichtete Bereichsnavigation (`max-width:296px`), rechts der Inhalt:

`uebersicht` · `profil` · `sicherheit` · `sitzungen` · `benachrichtigungen` · `rollen` · `datenrechte` · `abmelden`

### Zeilenmuster

Jeder Bereich ist eine Liste gleich gebauter Zeilen: **Bezeichnung · Zustandskapsel · Wert · Aktion oder Schalter.** Werte mit Datum, Betrag, Nummer oder Maß laufen automatisch in IBM Plex Mono — die Erkennung sitzt in `renderVals()`, nicht in der Vorlage.

Der Schalter ist ein echtes `role="switch"` mit `aria-checked`, 52 × 32 px, Knopf 22 px — bedienbar, nicht nur anklickbar.

### Was die Bereiche belegen

| Bereich | Kern |
|---|---|
| Übersicht | drei offene Vorgänge mit Frist, nicht eine Willkommensfloskel |
| Profil | Anschrift nach DIN 5008 („Heidestraße 17 · 51147 Köln"), USt-IdNr. mit Prüfzustand |
| Sicherheit | Leak-Abgleich statt Zwangswechsel, Wiederherstellungscodes einzeln erneuerbar, Passkey als Empfehlung |
| Sitzungen | jede Sitzung einzeln beendbar; die nicht erkannte trägt **Klartext neben dem roten Punkt** (WCAG 1.4.1) |
| Benachrichtigungen | Werbung und Vertragsmeldungen getrennt; vertragliche sind als „Immer an" gekennzeichnet, nicht als Einwilligung getarnt |
| Rollen | Rollenwechsel ohne zweite Registrierung |
| Meine Daten | Art. 15 · 16 · 17 · 20 · 21 als vier Schaltflächen, **Aufbewahrungspflicht vor der Löschung genannt** (§ 147 AO, § 257 HGB) |
| Abmelden | dieses Gerät, überall, Konto löschen — in dieser Reihenfolge, Löschung als `risk` markiert |

---

## 5 · Normregister

Was in beiden Flächen als „Prüfvermerk" einblendbar ist, vollständig:

### Gestaltung und Bedienung
- **DIN EN ISO 9241-110:2020** — Dialoggrundsätze; hier tragend: Selbstbeschreibungsfähigkeit, Steuerbarkeit, Erwartungskonformität, Robustheit gegen Nutzungsfehler
- **DIN EN ISO 9241-125** — visuelle Informationsdarstellung (Kontrast, Größe)
- **DIN EN ISO 9241-143** — Formulardialoge (Beschriftung, Gruppierung, Pflichtfeldkennzeichnung, Fehlerbehandlung)
- **DIN 1450** — Leserlichkeit; Mindestgröße 10,5 px, ausnahmslos
- **DIN 5008** — Zahlen-, Datums-, Zeit- und Anschriftenformate

### Barrierefreiheit
- **WCAG 2.2 AA**, **EN 301 549**, **BITV 2.0**
- Neu in 2.2 und hier einschlägig: **2.4.11** Fokus nicht verdeckt · **2.5.7** Alternative zum Ziehen · **2.5.8** Zielgröße · **3.3.7** keine doppelte Eingabe · **3.3.8** barrierefreie Authentifizierung
- Weiter: **1.3.1** Info und Beziehungen · **1.3.5** Eingabezweck · **1.4.1** nicht nur Farbe · **2.2.1** Zeitgrenzen · **2.4.1** Blöcke überspringen · **3.3.1/3.3.2** Fehler und Anleitungen

### Sicherheit
- **ISO/IEC 27001** A.5.17 (Authentisierungsinformationen), A.8.5 (sichere Authentisierung)
- **BSI TR-02102-1**, **NIST SP 800-63B** — Passwortregeln
- **OWASP ASVS** 2.2 (Sperrmechanik), 2.5 (Wiederherstellung ohne Kontoauskunft)

### Recht
- **DSGVO** Art. 5 Abs. 1 c · 7 · 12 · 13 · 15 · 16 · 17 · 20 · 21 · 25
- **§ 25 TDDDG** · **§ 7 Abs. 2 Nr. 2 UWG** · **§ 312j BGB** · **PAngV**
- **§ 147 AO**, **§ 257 HGB** — Aufbewahrungsfristen, vor der Löschung zu nennen
- **ISO/IEC 42001**, **EU AI Act Art. 50** — der Companion tritt als KI erkennbar auf, nie als Mensch

---

## 6 · Offene Punkte

- **`Konto.dc.html` liegt nur auf Deutsch vor.** Kopf und Fuß sind dreisprachig, die acht Kontobereiche noch nicht; der Sprachwechsler fällt dort auf Deutsch zurück. Das verstößt gegen `CLAUDE.md` („de/nl/fr durchgängig") und ist der nächste Arbeitsschritt, keine Entscheidung.
- **Der Prüfvermerk ist deutsch** in beiden Flächen. Bewusst: er ist Fachdokumentation für Betreiber und Prüfer, kein Nutzertext — die niederländische und französische Fassung verweisen ausdrücklich auf dieses Handbuch.
- **Ein-/Ausgänge sind Vorschau.** Kein `POST`, kein Token, keine Sitzungslogik — die Anschlusspunkte trägt `docs/01-konzept/prototyp-oberflaechen.md`.
- **Passkey** ist als Empfehlung sichtbar, aber nicht implementiert (WebAuthn ist Backend-Arbeit).
