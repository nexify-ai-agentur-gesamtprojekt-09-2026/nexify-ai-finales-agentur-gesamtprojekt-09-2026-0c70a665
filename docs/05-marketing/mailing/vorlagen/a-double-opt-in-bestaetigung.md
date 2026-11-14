# Vorlage (a): Bestätigung der Anmeldung (Double-Opt-in)

Status: Entwurf, nicht freigegeben. Empfänger: wer seine Adresse im Anmeldeformular eingetragen hat. Versand: einmal je Anmeldung, sofort. **Diese Mail enthält keine Werbung:** keine Leistungsbeschreibung, kein Angebot, kein Link außer Bestätigung, Impressum und Datenschutz. Platzhalter: `README.md`.

Kein Abmeldelink: Ohne Klick entsteht kein Bezug. Der Satz dazu steht im Text.

## Betreff

Bitte bestätigen Sie Ihre Anmeldung bei NeXify AI

## Vorschautext

Ein Klick genügt. Ohne Bestätigung erhalten Sie keine weiteren Mails.

## Text

{{ANREDE}},

am {{ANMELDEDATUM}} wurde diese E-Mail-Adresse auf {{ANMELDEQUELLE}} für Informationen von NeXify AI angemeldet.

Bitte bestätigen Sie, dass die Anmeldung von Ihnen stammt:

[Anmeldung bestätigen]({{BESTAETIGUNGSLINK}})

Erst mit diesem Klick ist Ihre Anmeldung wirksam.

Haben Sie sich nicht angemeldet, müssen Sie nichts tun. Ohne Bestätigung erhalten Sie keine weiteren Mails von uns, und die Anmeldung wird gelöscht.

Womit Sie nach der Bestätigung einverstanden sind:

> [EINWILLIGUNGSTEXT – derselbe Wortlaut wie im Anmeldeformular, mit Absender, Inhalt der Mails, {{VERSANDRHYTHMUS}} und Hinweis auf den jederzeitigen Widerruf. Wortlaut durch Inhaber und Rechtsberatung; hier bewusst nicht vorformuliert.]

Wie wir mit Ihren Daten umgehen, steht hier: {{LINK_DATENSCHUTZ}}

Freundliche Grüße
Pascal Courbois
NeXify AI

## Pflichtfuß

```
NeXify AI
Chat it. Automate it.

{{IMPRESSUM_NAME_UND_INHABER}} · {{IMPRESSUM_RECHTSFORM}}
{{IMPRESSUM_ANSCHRIFT}}
E-Mail: {{IMPRESSUM_KONTAKT_EMAIL}} · Telefon: {{IMPRESSUM_TELEFON}}
{{IMPRESSUM_REGISTER}} · USt-IdNr.: {{IMPRESSUM_UST_ID}}
Impressum: {{LINK_IMPRESSUM}} · Datenschutz: {{LINK_DATENSCHUTZ}}
```

## Abmeldelink

Entfällt in dieser Mail (noch kein Bezug). Stattdessen der Satz „Haben Sie sich nicht angemeldet, müssen Sie nichts tun.“

## Offen vor Einsatz

- Wortlaut der Einwilligung (identisch in Formular und Mail), freigegeben.
- Frist, nach der unbestätigte Anmeldungen gelöscht werden; sie gehört dann als Zahl in den Text.
- Ob die Markenzeile im Fuß einer werbefreien Bestätigungsmail stehen soll oder dort entfällt – Rechtsberatung.
- Abschnitt zu Direktwerbung in `/datenschutz` (Register OA-004).
