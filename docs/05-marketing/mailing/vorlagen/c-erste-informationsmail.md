# Vorlage (c): Erste Informationsmail an bestätigte Empfänger

Status: Entwurf, nicht freigegeben. Empfänger: **ausschließlich** Empfänger mit bestätigter Anmeldung (Gruppe A), nach Abgleich mit der Sperrliste. Versand: als Kampagne, frühestens wenn alle Punkte aus `../voraussetzungen-vor-dem-ersten-versand.md` erfüllt sind. Platzhalter: `README.md`.

Thema: das Briefing in fünf Fragen. Die Mail gibt den Inhalt der Seite `/wissen/projekt-vorbereiten` wieder und fügt nichts hinzu.

## Betreff

NeXify AI: Ihr Briefing in fünf Fragen

## Vorschautext

Sie brauchen kein fertiges Konzept. Fünf Antworten genügen für ein Angebot.

## Text

{{ANREDE}},

viele Vorhaben bleiben liegen, weil das Briefing fehlt. Sie brauchen dafür kein fertiges Konzept. Fünf Antworten genügen, damit aus Ihrer Idee ein Angebot werden kann.

**Die fünf Fragen**

1. Was bieten Sie an, und für wen?
2. Was soll sich ändern – mehr Anfragen, weniger Handarbeit, ein neuer Auftritt?
3. Was funktioniert heute gut, und wo springen Kunden ab?
4. Welche Unterlagen, Inhalte und Beispiele gibt es schon?
5. Welchen Rahmen haben Sie für Budget und Termin?

**Wenn Technik im Spiel ist**

Nennen Sie die Systeme, die Sie nutzen – Website, Shopsoftware, Schnittstellen – und die Personen, die mitentscheiden. Zugangsdaten gehören nicht in die Anfrage. Dafür vereinbaren wir einen sicheren Weg.

**Was danach passiert**

Wir klären offene Punkte und den passenden Umfang. Dann erhalten Sie ein Angebot mit Leistungen und Kosten. Entwicklung, Betreuung danach und externe Kosten stehen darin getrennt. Erst wenn Sie das Angebot annehmen, entsteht ein Auftrag.

[Vorhaben schildern](https://nexifyai.de/kontakt)

Die Seite dazu: [Ihr Briefing in fünf Fragen](https://nexifyai.de/wissen/projekt-vorbereiten)

Freundliche Grüße
Pascal Courbois
NeXify AI

Sie möchten diese Mails nicht mehr erhalten? Sie können jederzeit widersprechen, ohne dass andere Kosten als die der Übermittlung nach den Basistarifen entstehen: [Abmelden]({{ABMELDELINK}})

## Pflichtfuß

```
Sie erhalten diese Mail, weil Sie sich am {{ANMELDEDATUM}} auf {{ANMELDEQUELLE}} angemeldet und die Anmeldung bestätigt haben.
Abmelden: {{ABMELDELINK}} · Themen wählen: {{EINSTELLUNGEN_LINK}}

NeXify AI
Chat it. Automate it.

{{IMPRESSUM_NAME_UND_INHABER}} · {{IMPRESSUM_RECHTSFORM}}
{{IMPRESSUM_ANSCHRIFT}}
E-Mail: {{IMPRESSUM_KONTAKT_EMAIL}} · Telefon: {{IMPRESSUM_TELEFON}}
{{IMPRESSUM_REGISTER}} · USt-IdNr.: {{IMPRESSUM_UST_ID}}
Impressum: {{LINK_IMPRESSUM}} · Datenschutz: {{LINK_DATENSCHUTZ}}
```

## Abmeldelink

`{{ABMELDELINK}}` im Text und im Fuß; Kopfzeilen `List-Unsubscribe` und `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.

## Belege der Aussagen

| Aussage | Quelle |
|---|---|
| „Sie brauchen kein fertiges Konzept. Fünf Antworten genügen …“ und die fünf Fragen im Wortlaut | `config/site-map.json`, Seite `knowledge-start`, Zusammenfassung und Abschnitt „Die fünf Fragen“ |
| Systeme und mitentscheidende Personen nennen; Zugangsdaten nicht in die Anfrage; sicherer Weg | Seite `knowledge-start`, Abschnitt „Wenn Technik im Spiel ist“ |
| Offene Punkte klären, Angebot mit Leistungen und Kosten, Auftrag erst mit Annahme | Seite `contact`, Abschnitt „Was nach Ihrer Anfrage passiert“ |
| Entwicklung, Betreuung danach und externe Kosten getrennt | Seite `pricing`, Zusammenfassung |

Nicht belegt und deshalb zu streichen, falls der Inhaber ihn nicht bestätigt: der Einleitungssatz „viele Vorhaben bleiben liegen, weil das Briefing fehlt“. Er ist eine Beobachtung ohne Quelle im Repository.

## Offen vor Einsatz

- Zieladresse der Links (`nexifyai.de` oder `nexifyai.cloud`).
- Die Seiten sind auf „noindex“ gestellt; das hindert die Verlinkung aus einer Mail nicht, der Inhaber sollte es aber wissen.
- Klickmessung bleibt aus, bis die Einwilligungsfrage dazu geklärt ist.
