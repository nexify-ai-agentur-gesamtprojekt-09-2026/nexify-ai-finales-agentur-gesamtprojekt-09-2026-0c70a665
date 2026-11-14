# Textvorlage 14.11.2026 – vier Sprachen

Status: Entwurf zur Umsetzung. Entscheidung der Projektleitung vom 14.11.2026, vom Inhaber zu bestätigen (`DECISIONS.md` D-011 bis D-014). Kein Text aus diesem Ordner ist ausgeliefert; bestehende Seiten und Konfigurationsdateien sind unverändert.

## Dateien

| Datei | Bereich |
|---|---|
| `01-startseite.md` | Navigation, Hero, alle Abschnitte der Startseite in der bestehenden Reihenfolge, Fuß |
| `02-chat.md` | Chat: Kopf, Begrüßung, Einstiege, Zustände, Fehler, Rückfall, Briefing, KI-Kennzeichnung |
| `03-produkte.md` | Kurz- und Langfassung je Produkt |
| `04-konto.md` | Registrieren, Anmelden, E-Mail-Bestätigung, Passwort vergessen |
| `05-teileklar-werkstatt.md` | Partner-Landingpage, Werkstattanfrage, Status des Partnerantrags |
| `06-filmtexte.md` | Filmtexte in Sie-Form |
| `07-social-email.md` | Drei Beiträge für LinkedIn und eine Vorstellungs-Mail als Tonalitätsmuster |
| `LUECKEN.md` | Bausteine, die mangels Beleg nicht geschrieben wurden, mit der nötigen Entscheidung |

## Aufbau eines Bausteins

Jeder Baustein hat eine stabile Kennung (`bereich.abschnitt.element`), einen Zweck, einen Zeichenrichtwert und eine Quelle. Die Kennung bleibt, auch wenn sich der Wortlaut ändert; die Umsetzung ordnet sie dem jeweiligen Schlüssel der Konfiguration zu.

- **Zweck:** was der Text an dieser Stelle leisten soll.
- **Richtwert:** Länge in Zeichen einschließlich Leerzeichen, gemessen an der deutschen Fassung. Niederländisch und Französisch laufen etwas länger; die Gestaltung muss das tragen.
- **Quelle:** die Datei, aus der die Aussage stammt. Steht dort „Entscheidung PL“, ist die Entscheidung der Projektleitung vom 14.11.2026 gemeint.

Deutsch führt. Niederländisch, Französisch und Englisch sind eigenständige Fassungen mit derselben Aussage, nicht Wort für Wort übertragen.

## Regeln, die für alle Dateien gelten

- Anrede: „Sie“, „u“, „vous“; Englisch neutral und professionell.
- Namen nach `config/brand-names.json`. Das KI-System trägt immer den vollen Namen; es gibt keine Kurzform. Wo er zu lang ist, steht „das KI-System“.
- Keine Preise, Zahlen, Kunden, Referenzen, Garantien, Leistungsversprechen, Lieferzeiten. Keine Kostenaussage. Keine Aussage zur Leistung der KI. Keine Rechtsform.
- Zahlen stehen nur, wo eine Quelle im Repository sie nennt; die Quelle steht am Baustein.
- Kein interner Jargon.
- Typografie: deutsche Anführungszeichen („ “), Halbgeviertstrich mit Leerzeichen, geschütztes Leerzeichen zwischen Zahl und Einheit. Französisch mit « » und geschütztem Leerzeichen vor Doppelpunkt und Fragezeichen. Die geschützten Leerzeichen stehen als Zeichen U+00A0 in den Dateien.
- Platzhalter stehen in doppelten geschweiften Klammern, etwa `{{vorname}}`. Sie werden von der Anwendung gefüllt.
- `LÜCKE:` kennzeichnet einen Baustein, der mangels Beleg nicht geschrieben wurde. Er steht mit der nötigen Entscheidung in `LUECKEN.md`.

## Ein Wortlaut je Schritt

Für denselben Schritt gibt es im Bestand viele Formulierungen. Diese Vorlage verwendet je Schritt genau eine.

| Schritt | DE | NL | FR | EN |
|---|---|---|---|---|
| Erster Schritt, öffnet den Chat | Vorhaben schildern | Uw plan beschrijven | Décrire votre projet | Describe your project |
| Kontakt zu Pascal | Pascal schreiben | Pascal schrijven | Écrire à Pascal | Write to Pascal |
| Zu den Leistungen | Leistungen ansehen | Diensten bekijken | Voir les prestations | View services |
| Noch einmal versuchen | Erneut versuchen | Opnieuw proberen | Réessayer | Try again |
| Anfrage absenden | Anfrage senden | Aanvraag versturen | Envoyer la demande | Send enquiry |
| Konto anlegen | Konto erstellen | Account aanmaken | Créer un compte | Create account |
| Anmelden | Anmelden | Inloggen | Se connecter | Sign in |
