# Seitenkommunikation unterhalb der Hero-Bereiche

Stand: 26.10.2026. Quelle und vollständige DE/NL/FR-Skriptentwürfe: [`config/page-explainers.json`](../../config/page-explainers.json). Diese Ergänzung definiert Texte und Platzierung, keine fertig erzeugten Videos oder vollständige Inhaltsabnahme der Prototypen.

## Ziel und Kommunikationslogik

Jede der 35 öffentlichen Routen erhält eine thematisch passende Erklärung: Was zeigt die Seite, welche Möglichkeiten werden eingeordnet und welcher konkrete nächste Schritt passt dazu? Zwölf zentrale Seiten erhalten zwei unterschiedliche Perspektiven, die übrigen eine. Insgesamt entstehen 47 kurze Module. Bestehende Hero-, Inhalts-, Rechts- und Folgesektionen bleiben erhalten. Eine Erklärung oder ein Chat ersetzt diese Inhalte nicht.

Die deutsche Ansprache bleibt Sie. NL/FR haben dieselben Inhaltsschlüssel und verwenden u/vous. Orientierungstexte zu Rechtsseiten sind übersetzt; die zugrunde liegenden Rechtstexte werden dadurch weder übersetzt noch geändert. Es werden keine Preise, Rabatte, Bestände, Lieferzusagen, Leistungskennzahlen, Kundenreferenzen oder bestätigten Integrationen hinzugefügt.

## Rollen und Dramaturgie

| Sprecher-ID | Anzeige | Aufgabe | Grenze |
|---|---|---|---|
| `pascal` | Pascal | Projektklärung, Verantwortung, persönliche Orientierung und Vertrauen | Keine unbelegten Erfahrungs-/Erfolgsaussagen; kein Vertragsabschluss oder Adminrecht durch ein Video |
| `nex` | NeX | Umsetzung, nachvollziehbare Prozesse, Schnittstellen und Statusunterschiede | Als KI-Assistent kennzeichnen; geplante Abläufe nicht als ausgeführt darstellen |
| `aifly` | AIFly | Wissen, Begriffe, Auswahlhilfe und nächste Schritte | Als KI-Assistent kennzeichnen; keine technische Passungszusage oder Rechtsberatung |

Nicht jede Seite benötigt alle drei Stimmen. Auf den zwölf Doppelseiten ergänzt eine zweite Stimme die erste ohne Wiederholung. Die Medienseite wechselt dort von links nach rechts. Einzelmodule wechseln im kuratierten Seitenlauf ihre Position; auf schmalen Ansichten muss die logische Lesereihenfolge erhalten bleiben. Das ist eine Layoutvorgabe, kein Nachweis ihrer bereits getesteten Darstellung.

## Besondere Nutzerwege

- Agentur: Ziel verstehen → passende Leistung → Umfang und Abhängigkeiten → konkrete Anfrage. Angebotsentwurf, Versand und Vertragsfreigabe bleiben getrennte Zustände.
- Automatisierung und Portale: Aufgabe → Datenquellen, Rollen und Freigaben → überprüfbarer Ablauf. Eine sichtbare Oberfläche belegt keine serverseitige Funktion.
- TEILEKLAR: Fahrzeug und Passung → vorbereitete Suche und Kategorien → Produktinformationen → Warenkorb und Kassenstatus. Kein Modul erfindet einen Artikel, Preis oder eine Kaufmöglichkeit.
- Werkstatt: Partneranfrage → freigegebene Profilangaben → Terminwunsch. Weder Partnerschaft, verfügbare Kapazität noch Buchung werden behauptet.
- Recht und Datenschutz: sachliche Orientierung → unmittelbar erreichbare Originalinformationen oder Kontakt. Keine erzwungene Werbedramaturgie und kein Ersatz der Rechtsinformationen.
- Anmeldung und Registrierung: Identität → getrennte Site-/Mandanten-/Rollenprüfung. Kein automatischer Projekt-, Partner- oder Adminstatus.

## Medien, Untertitel und Textalternative

Alle Module stehen auf `script_draft`. `media.src`, `media.captions` und `media.transcript` sind `null`; der Medienstatus ist `asset_pending`. Runway ist die vorgesehene Quelle echter Assets, jedoch wurde in diesem Arbeitspaket kein Clip erzeugt oder als vorhanden registriert. Keine Platzhalter-URL und kein fremdes Video werden als fertiges Ergebnis ausgegeben.

Die lokalisierten Titel, Fließtexte und nächsten Schritte sind bereits lesbar. Sie sind noch kein wortgetreues Transkript eines existierenden Clips. Nach tatsächlicher Produktion sind je Sprache passende Untertitel und Transkripte anzulegen und gegen die Audiospur zu prüfen. Erst anschließend dürfen echte Medienpfade und ein veröffentlichter Status eingetragen werden. Externe Medienanfragen oder Autoplay vor einer erforderlichen Einwilligung sind nicht vorgesehen. Auf Rechts- und Authseiten dienen mögliche Medien ausschließlich der sachlichen Orientierung.

## Vollständiger Seitenplan

| Seiten-ID | Sprecherfolge | Medienseite | Erklärthemen | Öffentliche Folgeseiten |
|---|---|---|---|---|
| `home` | Pascal → AIFly | left → right | Ihr Vorhaben zuerst / So finden Sie Ihren Einstieg | `services`, `scope` |
| `services` | NeX → Pascal | left → right | Welche Leistung gehört zu welchem Ziel? / Was für Ihre Auswahl wichtig ist | `scope`, `contact` |
| `websites` | NeX → Pascal | left → right | Vom Seitenziel zum nächsten Schritt / Inhalte und Verantwortung früh klären | `scope`, `contact` |
| `automation` | NeX → AIFly | left → right | Wiederkehrende Arbeit nachvollziehbar planen / Einen Ablauf in überschaubare Schritte zerlegen | `scope`, `knowledge-start` |
| `apps-portals` | NeX → Pascal | left → right | Oberfläche und Berechtigung zusammen denken / Übergaben zwischen Menschen und Systemen klären | `scope`, `contact` |
| `scope` | Pascal → NeX | left → right | Was vor einem Projektstart geklärt wird / Abhängigkeiten gehören zum Umfang | `contact`, `contact` |
| `solutions` | AIFly | left | Agenturleistung oder eigener Produktkontext? | `tk-home` |
| `pricing` | Pascal | right | Umfang vor einer verbindlichen Preisentscheidung | `scope` |
| `knowledge` | AIFly | left | Wissen als Vorbereitung für Entscheidungen | `knowledge-start` |
| `knowledge-start` | AIFly | right | Was Sie für die erste Anfrage sammeln können | `scope` |
| `company` | Pascal | left | Persönliche Klärung statt unbelegter Versprechen | `imprint` |
| `contact` | Pascal | right | Mit einem klaren Anliegen ins Gespräch | `scope` |
| `one` | NeX | left | Produktziel und Aktivierung unterscheiden | `api` |
| `api` | NeX | right | Technischen Bedarf vor dem Zugang klären | `contact` |
| `imprint` | AIFly | left | Anbieterangaben gezielt finden | `contact` |
| `privacy` | AIFly | right | Datenverwendung nachvollziehen | `cookies` |
| `terms` | AIFly | left | Entwurf und verbindliche Grundlage unterscheiden | `contact` |
| `ai-notice` | AIFly | right | KI-Ausgabe und bestätigten Vorgang trennen | `contact` |
| `accessibility` | AIFly | left | Hürden bei der Nutzung melden | `contact` |
| `cookies` | AIFly | right | Optionale Verarbeitung bewusst einordnen | `privacy` |
| `login` | NeX | left | Anmeldung ist nur der erste Zugangsschritt | `contact` |
| `signup` | NeX | right | Ein Konto begründet keine Verwaltungsrechte | `login` |
| `tk-home` | AIFly → Pascal | left → right | Fahrzeug, Teil und Werkstatt sinnvoll verbinden / Der Werkstattweg ist eine eigene Anfrage | `tk-fitment`, `tk-partner` |
| `tk-search` | AIFly | right | Eine Teilesuche mit den richtigen Angaben starten | `tk-fitment` |
| `tk-categories` | AIFly | left | Vom Sortiment zur passenden Kategorie | `tk-category` |
| `tk-category` | NeX | right | Welche Angaben eine Kategorie braucht | `tk-product` |
| `tk-product` | NeX → AIFly | left → right | Produktinformationen vor einer Auswahl prüfen / Bei fehlenden Angaben zurück zur Orientierung | `tk-fitment`, `tk-search` |
| `tk-cart` | NeX → AIFly | left → right | Auswahl und Bestellung sind verschiedene Schritte / Eine Auswahl bleibt überprüfbar | `tk-checkout`, `tk-search` |
| `tk-checkout` | NeX → Pascal | left → right | Warum hier noch kein Kauf abgeschlossen wird / Rückfragen vor einer Kaufentscheidung klären | `tk-legal`, `contact` |
| `tk-fitment` | AIFly | right | Passung braucht nachvollziehbare Fahrzeugdaten | `tk-search` |
| `tk-appointments` | Pascal | left | Ein Terminwunsch ist noch keine Reservierung | `tk-workshop` |
| `tk-vouchers` | AIFly | right | Gutscheininformation und eingelöstes Guthaben trennen | `tk-legal` |
| `tk-partner` | Pascal → NeX | left → right | Eine Werkstattpartnerschaft gezielt anfragen / Profil und geschützten Zugang getrennt behandeln | `tk-workshop`, `login` |
| `tk-workshop` | NeX → AIFly | left → right | Ein Werkstattprofil braucht freigegebene Angaben / Vom Anliegen zum Terminwunsch | `tk-appointments`, `tk-appointments` |
| `tk-legal` | AIFly | left | Rechtliche Informationen im Shopkontext finden | `imprint` |

## Quellen und wiederverwendbare Regeln

Jedes Modul verweist auf vorhandene fachliche Quellen sowie die IA. Die Formulierungen sind redaktionelle Entwürfe daraus, keine Ausführungsergebnisse und keine zusätzliche Preis- oder Rechtsfreigabe. Das Small-Business-Paket wurde mit `verify` hashgeprüft; `smb-router --references` und `content-strategy --references` wurden geladen. Die Marketing-Strategy-Anleitung wurde ergänzend gelesen. Da keine Umsatz-/Transaktionsdaten vorliegen und keine Umsatzanalyse beauftragt ist, werden keine Bestseller, Margen, Marktkennzahlen oder Kampagnenerfolge behauptet. Die Anwendung bleibt auf klare Seitenaussagen, Zielgruppenorientierung und passende Nutzerwege begrenzt.

Das bestehende Register `config/preview-coverage.json` bleibt unverändert: 93 Quellen, 24 direkt referenzierte Quellen-IDs, 69 Quellen ohne direkte Routenzuordnung. Alle 93 erhaltenen Quelldateien stimmen weiterhin mit ihren registrierten SHA-256 überein. Neue Erklärtexte akzeptieren keine offenen Originalinhalte automatisch und löschen keine Backlogposition.

## Prüfung und Freigabegrenzen

Gezielt geprüft: exakt alle 35 öffentlichen Seiten, 47 eindeutige Modul-IDs, DE/NL/FR-Parität, bekannte Sprecher, Alternation und unterschiedliche Sprecher auf Doppelseiten, ausschließlich öffentliche bekannte Folgeziele, vorhandene Quelldateien, alle Medienfelder offen und Erhaltung der 93 Quellenhashes. UI-Darstellung, Einwilligungsdurchsetzung, tatsächlich erzeugte Assets und die spätere Untertitelqualität benötigen eigene Laufzeitnachweise. Die Texte enthalten keine Produktiv- oder Rechtsfreigabe.
