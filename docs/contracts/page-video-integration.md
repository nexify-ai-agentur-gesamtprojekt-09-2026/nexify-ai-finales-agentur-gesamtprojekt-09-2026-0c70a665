# Seitenvideos in der bestehenden Headless-App

Dies ist eine vorbereitete lokale Einbindung, keine fertige Videoproduktion.
Die maßgebliche Anwendung bleibt `apps/site` mit den gemeinsam genutzten
Komponenten unter `apps/web/components`. Die Next-Ausgabe bleibt Referenz;
ein zusätzliches Portal oder eine zweite Oberfläche wurde nicht erzeugt.

## Datenweg

`config/page-media-registry.json` ist die technische Quelle der 46-Routen-Matrix.
`public-video-assets.mjs` prüft spätere Renditions, Budgets, Scope und
versionsgebundene Belegbytes. `generate-public-data.mjs` übernimmt ausschließlich
die geprüften öffentlichen `byPage`- und `byModule`-Projektionen in `public-site.json`; technische
Coverage bleibt separat in der ignorierten Buildablage. Voice-IDs, Providerdaten,
private Freigaben und die zehn geschützten Routen werden nicht zum Client exportiert.

Die Startseite erhält ihren eigenen Film in der bestehenden freien Hero-Bühne.
Andere öffentliche Seiten erhalten ihren optionalen Kontextfilm getrennt von den
49 einzelnen Erklärmodulen. Jedes Modul erhält ausschließlich seinen eigenen
geprüften Film; Route, Nachbarmodul und andere Sprache dienen nicht als Ersatz. Seitenabschnitte und individuelle Texte bleiben erhalten.
Ein Legacyfeld `published` genügt nicht: die Explainerprojektion verlangt eine
passende geprüfte Locale-/Dateibindung. Es gibt keinen automatischen generischen
Film und keinen stillen Wechsel zur deutschen Tonspur bei NL/FR.

Der gemeinsame `PresenterVideo` benutzt ausschließlich geprüfte eigene Pfade.
Er startet manuell, bietet Pause, Ton, Untertitel und ein Plaintexttranskript.
Vorladen ist deaktiviert; `object-fit: contain` erhält das vollständige Bild.
Heroausgabe bekommt keinen fremden Playerrahmen. Sprach-/Assetwechsel und Unmount
pausieren die Wiedergabe, ebenso eine neu aktivierte Reduced-Motion-Präferenz.
Ein zweiter Film pausiert den ersten. Abgelehntes `play()` zeigt einen lokalen
Fehler und erhält das Transkript; es wird kein Audiostart versprochen.

Die Steuerung folgt der dokumentierten
[HTMLMediaElement-Promise](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)
und den [WAI-Medienhinweisen](https://www.w3.org/WAI/media/av/).
Das ist keine WCAG-Zertifizierung. Echte Synchronität, Audiodeskription soweit
anwendbar, Aussprache, Sicht-/Hörqualität und qualifizierte Assistenztechniktests
benötigen die tatsächlich produzierten Filme.

## Tatsächlicher Medienstand

36 öffentliche Seiten und 49 einzelne Module haben null freigegebene Filme.
108 optionale Seitenintro-Sprachplätze und 147 Modul-Sprachplätze sind offen.
Ein Seitenintro schließt keine Modulabnahme. Master1.3 RQ-029/RQ-038 und
TST-19/TST-24 sind damit technisch zugeordnet, nicht fachlich abgenommen.
Die sieben Vorproduktionsfilme mit 21 Szenen sind Text-/Untertitelentwürfe, keine
Medienbytes. Die zwei historischen inneren Castinghash-Abweichungen wurden in Libraryversion1
ausschließlich durch Manifestkorrektur behoben; alle33Inhaltsdateien sind bytegleich. Angefragte Hörproben und Stimmen sind
nicht freigegeben. Finaler AIFly-Charakter und geeignete tatsächliche Filmexports
fehlen. Der bekannte Reviewclip und das abgelehnte Orb-/Augenbild können nicht
bloß durch neue Statuswerte oder Belegdateien zu finalen Assets werden.

Das bestehende statische Hero bleibt die bekannte Entwurfsbaseline, keine
abgenommene Figurenreferenz und kein neues Videoposter. Es wurde kein neuer
Charakter erzeugt oder eine verworfene Figur in finale Videos übernommen.

`docs/contracts/page-video-coverage.md` ist die abgeleitete Route-/Film-/Szenen-/
Asset-/Voice-/Abnahmematrix. Fehlende Eingänge haben den autorisierten
Medien-/Casting-/Releaseowner; geschützte Auslieferung zusätzlich den Auth-/
Tenantowner. Ein Handoff schließt diese Punkte nicht.

## Tests und Grenzen

Node-Regressionsfälle verwenden synthetische Dateien und gehashte Testreceipts;
sie belegen Byte-/Scope-/Pfadgrenzen, keine echte Codec-, Stimm- oder Rechtsprüfung.
Der isolierte Browserentry unter `tests/fixtures` testet tatsächliche React-/
Tastatur-/Locale-/Lifecycle-/Geometrieabläufe mit einem Medienelementdouble.
Er gehört nicht zur Produktionsausgabe. Alle 36 öffentlichen Routen wurden
zusätzlich mit dem tatsächlichen aktuellen öffentlichen Builddatenstand besucht.
Null freigegebene Videos bleiben null, ohne Mockfilm oder privaten Portalinhalt.

Es wurden keine Medienprovider aufgerufen, keine Stimmen geklont und keine
Produktionsmedien erzeugt. Die vorhandene Node-22-Toolchain wird direkt benutzt;
das globale Node-24/pnpm-11-CLI versuchte vor der Korrektur seiner Auswahl einen
Installlauf, der mit SQLitefehler abbrach. Eine erfolgreiche lokale Installation
wurde nicht behauptet. Kein neuer Zugang oder Server-/DNS-/Authwechsel.

REA ist anwendbar, aber der dokumentierte lokale 6.8.0-Einstieg fehlt in dieser
Umgebung und eine passende native Analyseoperation ist nicht verfügbar. Das ist
`blocked_not_reviewed`, kein erfolgreicher oder bedeutungsloser Scheinscan.
Die unabhängige Sol-Codeprüfung und Browserbelege ersetzen diesen Nachweis nicht.

Rückweg: Das lokale UI-Delta lässt sich im eigenen Reviewcheckout auf Basis
`14929ebec897f6006d0a971660325a1e4cae7641` zurücknehmen. Vorhandene Registrybindungen
bleiben bis zu einer echten Freigabe null; es wurde kein privater/öffentlicher
Medienbestand migriert oder gelöscht. Externe Rücknahme bleibt eine getrennte
Releaseaktion mit aktuellem Ziel-/Versionsnachweis.
