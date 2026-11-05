# NeXify Design-Norm 1.0

**Stand 26.09.2026 · verbindlich für alle Flächen (Agentur-Seite, Shop, Portale, Werkzeuge)**
Durchgesetzt über `tools/design-norm.js`. Kein Wert außerhalb dieser Skalen.

## Bezugsnormen
- **WCAG 2.2 AA / EN 301 549 / BFSG:** Text mindestens 4,5 : 1, große Schrift 3 : 1, Bedienfläche mindestens 44 × 44 px, sichtbarer Fokus.
- **DIN EN ISO 9241-110 / -112:** Konsistenz, Erwartungskonformität, Unterscheidbarkeit; gleiche Funktion = gleiche Gestalt.
- **DIN 5008:** nur für Schriftverkehr (E-Mails, Rechnungen, Angebote), nicht für die Website.

## Raster
8-pt-Raster mit Halb-/Feinschritten. Zulässig (maßgebliches Designsystem, D-DESIGN-20261105): 0 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 56 · 64 · 72 · 80 · 96 · 112 · 128 · 144 px. Feinschritte 6/10/14 stammen aus der Startseite.
Inhaltsbreite 1240 px, Seitenrand 24 px. Abschnittsabstand `clamp(88px,10vw,144px)`.

## Typografie (Geist / Geist Mono)
| Rolle | Größe | Zeilenhöhe | Laufweite |
|---|---|---|---|
| h1 Display | clamp(48px, 7,2vw, 96px) | 1 | −0,05 em |
| h2 Abschnitt | clamp(32px, 4,2vw, 56px) | 1,05 | −0,04 em |
| h3 / Kartentitel | clamp(24px, 2,4vw, 32px) oder 24 px | 1,15 | −0,02 em |
| Einleitung | 18–20 px | 1,55 | 0 |
| Fließtext | 16 px | 1,6 | 0 |
| Klein | 14 px | 1,5 | 0 |
| Kicker, Metadaten (Mono) | 12–14 px | 1,4 | 0, keine Versalien |

Zulässige Größen (maßgebliches Designsystem): 12 · 13 · 14 · 15 · 16 · 18 · 19 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64 · 72 · 80 · 96 px. Fließtext 15/1.65 ist der Startseiten-Standard. Mindestgröße bleibt 12 px: Kicker 11/12.5 px aus der Startseite sind ein offener Barrierefreiheits-Konflikt (Entscheid Pascal), kein zulässiger Wert.

## Radien
4 px Etikett · 8 px Bedienelement · 16 px Karte · 999 px Pille · 50 % Kreis. (17 px nur als Außenkante eines 1-px-Verlaufsrahmens um eine 16-px-Karte.)

## Farbe und Kontrast (gerechnet)
| Text | auf #242826 | auf #2A2E2C | auf #303432 | Einsatz |
|---|---|---|---|---|
| #FFFFFF | 14,9 | 13,8 | 12,6 | Überschriften |
| #E3E6E3 | 11,9 | 10,9 | 10,0 | Fließtext |
| #BCC1BD | 8,2 | 7,5 | 6,9 | Sekundärtext |
| #9CA29E | 5,7 | 5,3 | 4,9 | Metadaten (≥ 12 px) |
| #D7FA50 | 12,6 | 11,6 | 10,6 | Akzent, Kicker |
| #111312 auf #D7FA50 | 15,7 | | | Hauptaktion |

Alle Paare erfüllen AA, die meisten AAA.

## Bedienelemente
Hauptaktion 52 px hoch, Lime-Verlauf, Radius 8 px. Zweitaktion 52 px, Rahmen #4A4F4C. Kompakt 44 px. Fokus: 2 px #D7FA50, Abstand 2 px.

## Automatische Prüfung (`tools/norm-lint.js`) — Pflicht vor jeder Abgabe
| Regel | Norm |
|---|---|
| Keine doppelten oder leeren CSS-Eigenschaften, keine einheitenlosen Maße | CSS-Validität |
| Kein absolut gesetzter Inhalt in Karten, kein Versatz per `transform` in den nächsten Abschnitt | Überlappungsfreiheit (WCAG 1.4.10 Reflow) |
| Schaltflächen dürfen umbrechen (kein `nowrap`) | WCAG 1.4.10, 1.4.12 |
| Überschriften mit `overflow-wrap` und Silbentrennung (lange deutsche Komposita) | WCAG 1.4.10 |
| Fließtext höchstens 68 Zeichen breit | DIN EN ISO 9241-125 (Zeilenlänge) |
| Sichtbarer Fokus auf jedem Link und jeder Schaltfläche | WCAG 2.4.7, 2.4.11 |
| Zielgröße: Listenlinks ≥ 24 px, Bedienelemente ≥ 44 px | WCAG 2.5.8 (AA) / 2.5.5 (AAA) |
| `prefers-reduced-motion` schaltet Bewegung ab | WCAG 2.3.3, ISO 9241-171 |
| Seitensprache `lang="de"`, jedes Bild mit `alt` | WCAG 3.1.1, 1.1.1 |
| Schwebende Elemente verdecken keinen Text (Beratung als 56-px-Rundknopf) | WCAG 2.4.11 |
| Laufzeitprüfung: 0 Text-Überlappungen, 0 Überläufe, keine horizontale Scrollbreite | Abnahme |

## Prüfergebnis Agentur-Seite v10 (vorher → nachher)
Verschiedene Schriftgrößen 35 → 12 · Radien 12 → 7 · Abstandswerte 81 → 72 (Rest sind kombinierte Werte wie `0 24px`, alle auf Raster).
Laufzeitprüfung 26.09.2026: 0 Text-Überlappungen, 0 Überläufe. Einzige Verdeckung war der Beratungsknopf über dem Einstiegstext → behoben.

## Angewendet auf
Agentur-Seite v10, Kopf, Fuß, Anmeldung, Konto, Kunden-, Partner-, Nachbarschaftsportal, Start, Partner werden, Werkstatt-Partnerseite, Local-SEO, Wissenshub, Batterie-Berater, Fitment-Checker, Reifenrechner, Architektur, Companion, TEILEKLAR Shop (365 Schriftgrößen, 143 Abstände, 261 Radien, 64 Überschriften normiert).
