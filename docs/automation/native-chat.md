# Native Agenten-Seitenleiste und Besucheraktionen

Der Nutzer beauftragt einen fest in die eigene Website integrierten NeX Agentic AIFly-Chat, der auf allen beabsichtigten öffentlichen Seiten verfügbar ist. Das rechte ChatGPT-Fenster dient als Referenz für die Seitenaufteilung; umgesetzt wird eine eigenständige NeXify-Oberfläche mit den vorhandenen Graphit-/Lime-Tokens, Originalmarkenquellen und lokalen Schriften.

`apps/web` ist die neue Next.js-/TypeScript-Anwendung. Gemeinsames Layout, clientseitige Navigation, responsives Panel und lokalisierte Inhalte beziehen sich auf die ausdrückliche Informationsarchitektur in `config/site-map.json`. Die 93 HTML-Dateien bleiben Herkunfts-/Verhaltensreferenzen und werden weder als Produktionscode kopiert noch pauschal öffentlich ausgerollt. TEILEKLAR und die Agentur erhalten getrennte Seitenkontexte; geschützte Bereiche werden vor öffentlicher Navigation und Clientprops ausgefiltert.

`apps/agent-gateway` liefert ein isoliertes lokales Funktionsfundament mit eigener SQLite-Datei: anonyme Sitzung, strukturierter Gesprächsverlauf, Angebotsentwurf und echtes PDF, atomare lokale Terminanfrage, strukturierter Marketingentwurf und persistierte Versandabsicht. Der Browser besitzt keine Providercredentials; eine Backendantwort bestimmt den sichtbaren Status. Unbekannte Credentials, fremde Origin, falscher CSRF-Nachweis, fremdes Dokument und wiederholter Schlüssel mit anderer Nutzlast werden vor der Wirkung abgewiesen.

## Stand der Besucherwege

| Weg | Bereits ausführbar | Noch nicht nachgewiesen |
|---|---|---|
| Angebot | Vorhaben erfassen, Umfang festhalten, PDF-Entwurf herunterladen | rechtsverbindlich freigegebene Preise/Steuer-/Betreiberfassung und tatsächlicher Versand |
| E-Mail | konkreten Empfänger bestätigen, Versandabsicht atomar vormerken | produktive Mail-/Composio-Verbindung, Zustellung und Bounce-/Replay-/Abusegrenzen |
| Termin | explizit eingerichteten lokalen Vorschlag auswählen, konkurrierende Doppelvergabe verhindern, Anfrage speichern | externe Verfügbarkeit, Kalenderereignis, persönliche Bestätigung und Synchronisation |
| Marketing | Ziel/Zielgruppe erfassen, strukturiertes Briefing speichern | generatives Modell, alle Small-Business-Connectoraktionen und Veröffentlichung |
| Gespräch | strukturierte Aktion auswählen, Verlauf über Seitenwechsel und Reload erhalten | freier produktiver KI-Dialog mit Budget-, Wissens-, Rechte- und Missbrauchsgrenzen |

Diese Grenzen werden in der Oberfläche nicht als erfolgreiche externe Aktion dargestellt. `pending_provider` bedeutet nicht versendet; `requested_local_planning` bedeutet nicht extern bestätigt. Der Nutzerauftrag umfasst die weitere reale Verbindung dieser Funktionen, nicht das Vortäuschen solcher Ergebnisse.

## Prüfung und Wiederaufnahme

15 eigene HTTP-/SQLite-Prüfungen sind in `tests/test_native_chat.py` definiert. Der zusätzliche Browserlauf liegt als wiederholbare lokale Fixture unter `/workspace/.onboarding/native_chat_browser.py`; Ergebnisse und Screenshots werden dort außerhalb des Checkouts abgelegt. Der Browser prüft tatsächlichen PDF-Download, sichtbare Pendingzustände, konkrete Zeitauswahl, persistierte Marketingbriefings, Clientnavigation, alle konfigurierten öffentlichen Routen, Sprachwechsel, Mobilbreite und unbehandelte Fehler. Nach Änderung der Informationsarchitektur muss dieser Routenlauf erneuert werden.

Keine Gesamt-/Produktivabnahme folgt aus diesen lokalen Tests. Dieses Besucherfundament und die Factory-Zielverträge gehören zur Agenturentwicklung. Affilinet ist dagegen ein gesondertes, pausiertes Kundenprojekt: keine Agenturkomponente, keine SSO-/Datenmigration und keine Abhängigkeit dieses Besuchersystems. Gezielte Wiederverwendung brauchbarer Komponenten bleibt mit Herkunft, Anpassung und Tests möglich.
