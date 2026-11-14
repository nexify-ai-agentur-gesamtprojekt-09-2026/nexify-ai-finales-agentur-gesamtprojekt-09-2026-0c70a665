# Vorlage (b): Willkommen nach der Bestätigung

Status: Entwurf, nicht freigegeben. Empfänger: wer den Bestätigungslink geklickt hat. Versand: einmal, direkt nach der Bestätigung. Platzhalter: `README.md`.

## Betreff

Ihre Anmeldung bei NeXify AI ist bestätigt

## Vorschautext

Was Sie von uns erhalten, und wie Sie sich jederzeit abmelden.

## Text

{{ANREDE}},

vielen Dank. Ihre Anmeldung ist bestätigt.

**Was Sie von uns erhalten**

Wir schreiben Ihnen {{VERSANDRHYTHMUS}} zu den Themen, mit denen wir arbeiten: Websites, Shops, Portale und KI-Abläufe für Unternehmen. Jede Mail hat ein Thema und einen nächsten Schritt.

**Wer schreibt**

NeXify AI ist die Agentur von Pascal Courbois in Venlo. Pascal gibt Idee, Gestaltung und Richtung vor; die KI-Agenten NeX und AIFly ORACLE arbeiten aus.

**Wenn Sie schon ein Vorhaben haben**

Ein paar Sätze genügen: Was bietet Ihr Unternehmen an, wen wollen Sie erreichen, und was soll sich ändern?

[Vorhaben schildern](https://nexifyai.de/kontakt)

**Ihr Widerspruchsrecht**

Sie können dem Erhalt dieser Mails jederzeit widersprechen und Ihre Einwilligung widerrufen. Dafür entstehen keine anderen Kosten als die der Übermittlung nach den Basistarifen. Ein Klick genügt: [Abmelden]({{ABMELDELINK}}). Sie können uns auch einfach auf diese Mail antworten.

Freundliche Grüße
Pascal Courbois
NeXify AI

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

`{{ABMELDELINK}}` im Text (Abschnitt „Ihr Widerspruchsrecht“) und im Fuß. Dazu die Kopfzeilen `List-Unsubscribe` und `List-Unsubscribe-Post: List-Unsubscribe=One-Click`.

## Belege der Aussagen

| Aussage | Quelle |
|---|---|
| Websites, Shops, Portale und KI-Abläufe für Unternehmen | `config/site-map.json`, Seite `home`, Zusammenfassung |
| Agentur von Pascal Courbois in Venlo; Pascal gibt Idee, Gestaltung und Richtung vor; NeX und AIFly ORACLE arbeiten aus | Seite `company`, Zusammenfassung |
| „Was bietet Ihr Unternehmen an, wen wollen Sie erreichen, und was soll sich ändern?“ | Seite `contact`, Abschnitt „Das genügt für den Anfang“ |
| Schalter „Vorhaben schildern“ | Gesamtkonzept, Abschnitt 5, „Ein Wortlaut je Schritt“ |

## Offen vor Einsatz

- `{{VERSANDRHYTHMUS}}`: Entscheidung des Inhabers; muss zum Einwilligungstext passen.
- Zieladresse des Schalters: `nexifyai.de` oder `nexifyai.cloud` (das Impressum nennt `.cloud` als Webadresse).
- Wortlaut des Widerspruchshinweises – Rechtsberatung.
