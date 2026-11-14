# Mailvorlagen: Entwürfe · 14.11.2026

Status: **Entwurf, nicht freigegeben, nicht bei Resend angelegt, nicht versendet.** Jeder Text braucht vor dem ersten Einsatz die Freigabe des Inhabers (`../voraussetzungen-vor-dem-ersten-versand.md`, N-4). Die rechtlich tragenden Sätze (Einwilligung, Widerspruchshinweis, Pflichtfuß) sind Vorschläge und gehören vor dem Einsatz zur Rechtsberatung.

| Datei | Zweck | Empfänger | Art |
|---|---|---|---|
| `a-double-opt-in-bestaetigung.md` | Anmeldung bestätigen lassen | wer sich im Formular angemeldet hat, vor der Bestätigung | Einzelmail, **ohne Werbung** |
| `b-willkommen.md` | Bestätigung quittieren, Erwartung klären | bestätigte Empfänger, einmalig direkt nach dem Klick | Einzelmail |
| `c-erste-informationsmail.md` | erste inhaltliche Mail | nur bestätigte Empfänger (Gruppe A) | Kampagne |
| `d-bestandskunden.md` | Hinweis auf eine ähnliche eigene Leistung | **nur** vom Inhaber einzeln nach § 7 Abs. 3 UWG geprüfte Bestandskunden (Gruppe B) | Einzelmail |

Sprache: Deutsch, Sie-Form. Fassungen in Niederländisch, Französisch und Englisch fehlen (Register OA-105) und entstehen erst nach Freigabe der deutschen Texte; Rechtstexte werden nicht automatisch übersetzt (`AGENTS.md`).

## Regeln für alle Vorlagen

- Ton nach `docs/05-marketing/gesamtkonzept-2026-11-14.md`, Abschnitt 5: ein Gedanke je Satz, konkret, keine Superlative, keine Ausrufezeichen, kein Werbejargon.
- Inhaltlich steht nur, was auf nexifyai.de steht (`config/site-map.json`, `config/home-concept-copy.json`). Keine Preise, keine Referenzen, keine Kennzahlen, keine Antwort- oder Lieferzeiten, keine Aussage zu Kosten oder Geschwindigkeit der KI.
- Markenzeile „Chat it. Automate it.“ steht im Fuß als Zeile unter dem Namen.
- Jede Mail hat eine Klartextfassung mit demselben Inhalt.
- Der Betreff nennt Absender oder Anlass und verschleiert den Zweck nicht (§ 6 Abs. 2 DDG).

## Platzhalter

Werte werden **nicht** in die Vorlagen geschrieben. Quelle der Anbieterangaben ist die Impressumsseite: `config/site-map.json`, Seite `imprint` (`/impressum`), Abschnitte „Diensteanbieter“, „Kontakt“ und „Registerangaben“. Solange Rechtsform und Anbieterangaben nicht widerspruchsfrei belegt sind (Register OA-009), wird keine Vorlage verwendet.

| Platzhalter | Bedeutung | Quelle |
|---|---|---|
| `{{ANREDE}}` | „Guten Tag Frau/Herr …“ oder „Guten Tag“ | Angabe des Empfängers; ohne Namen die neutrale Form |
| `{{BESTAETIGUNGSLINK}}` | einmaliger Link, der die Anmeldung bestätigt | Anmeldeweg (noch nicht gebaut) |
| `{{ABMELDELINK}}` | Link, der ohne Anmeldung und mit einem Klick abmeldet | Abmeldeweg; bei Kampagnen über Resend dessen eigener Platzhalter (Name laut Resend-Editor, hier nicht geprüft) |
| `{{EINSTELLUNGEN_LINK}}` | Auswahl der Themen | Resend-Themen (noch keine angelegt) |
| `{{IMPRESSUM_NAME_UND_INHABER}}` | Anbieter und Inhaber | Impressum, „Diensteanbieter“ |
| `{{IMPRESSUM_ANSCHRIFT}}` | ladungsfähige Anschrift | Impressum, „Diensteanbieter“ |
| `{{IMPRESSUM_RECHTSFORM}}` | Rechtsform | Impressum, „Diensteanbieter“ – offen, OA-009 |
| `{{IMPRESSUM_KONTAKT_EMAIL}}` | E-Mail-Adresse für Kontakt und Widerspruch | Impressum, „Kontakt“ – siehe Frage F-3 der Entscheidungsvorlage |
| `{{IMPRESSUM_TELEFON}}` | Telefon | Impressum, „Kontakt“ |
| `{{IMPRESSUM_REGISTER}}` | Register und Registernummer | Impressum, „Registerangaben“ |
| `{{IMPRESSUM_UST_ID}}` | Umsatzsteuer-Identifikationsnummer | Impressum, „Registerangaben“ |
| `{{LINK_IMPRESSUM}}` | Adresse der Impressumsseite | `/impressum` |
| `{{LINK_DATENSCHUTZ}}` | Adresse der Datenschutzinformation | `/datenschutz` – Abschnitt zu Direktwerbung fehlt noch (OA-004) |
| `{{ANMELDEDATUM}}`, `{{ANMELDEQUELLE}}` | Zeitpunkt und Formular der Anmeldung | Einwilligungsnachweis |
| `{{VERSANDRHYTHMUS}}` | wie oft Mails kommen | Entscheidung des Inhabers |
| `{{GEKAUFTE_LEISTUNG}}`, `{{AUFTRAGSDATUM}}` | Bezug zum Auftrag des Bestandskunden | Prüfliste des Inhabers nach § 7 Abs. 3 UWG |

## Pflichtfuß (in jeder Vorlage wiederholt)

```
NeXify AI
Chat it. Automate it.

{{IMPRESSUM_NAME_UND_INHABER}} · {{IMPRESSUM_RECHTSFORM}}
{{IMPRESSUM_ANSCHRIFT}}
E-Mail: {{IMPRESSUM_KONTAKT_EMAIL}} · Telefon: {{IMPRESSUM_TELEFON}}
{{IMPRESSUM_REGISTER}} · USt-IdNr.: {{IMPRESSUM_UST_ID}}
Impressum: {{LINK_IMPRESSUM}} · Datenschutz: {{LINK_DATENSCHUTZ}}
```

Der Fuß wird aus einer einzigen Quelle befüllt, damit Impressum und Mail nie auseinanderlaufen.
