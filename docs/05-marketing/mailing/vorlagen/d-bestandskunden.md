# Vorlage (d): Mail an Bestandskunden

Status: Entwurf, nicht freigegeben. Platzhalter: `README.md`.

**Nur für Empfänger, die der Inhaber einzeln nach § 7 Abs. 3 UWG geprüft hat.** Die Mail darf an einen Kunden nur gehen, wenn für ihn alle vier Punkte belegt sind (`../voraussetzungen-vor-dem-ersten-versand.md`, B-1 bis B-4):

1. Adresse vom Kunden im Zusammenhang mit einem Auftrag erhalten (Auftrag oder Rechnung mit Datum).
2. Die Mail bewirbt eine eigene Leistung, die der gekauften ähnlich ist.
3. Der Kunde hat nicht widersprochen (Abgleich mit der Sperrliste).
4. Der Kunde wurde schon bei der Erhebung der Adresse klar auf sein Widerspruchsrecht hingewiesen (Beleg mit Datum) – und wird es in dieser Mail erneut.

Fehlt ein Punkt, wird die Mail nicht gesendet. Kein Versand als Kampagne an ein Segment; je Kunde eine Einzelmail, vom Inhaber ausgelöst. Der Bezug zum Auftrag steht in der Mail, damit der Empfänger die Herkunft erkennt.

Thema dieses Entwurfs: Betreuung nach der Übergabe (NeXify Care). Er passt nur für Kunden, deren Auftrag ein übergebenes Projekt war (Website, Shop, Portal). Für andere Aufträge braucht es einen anderen Text und eine eigene Prüfung der Ähnlichkeit.

## Betreff

NeXify AI: Betreuung für Ihr Projekt nach der Übergabe

## Vorschautext

Ein Hinweis zu Ihrem Auftrag vom {{AUFTRAGSDATUM}} – und wie Sie solchen Mails widersprechen.

## Text

{{ANREDE}},

Sie haben mit uns {{GEKAUFTE_LEISTUNG}} umgesetzt (Auftrag vom {{AUFTRAGSDATUM}}). Deshalb schreiben wir Ihnen heute zu einer Leistung, die daran anschließt.

**Betreuung nach der Übergabe**

Nach der Übergabe können Sie Betreuung und Weiterentwicklung mit NeXify Care ergänzen. NeXify Care ist ein eigener, vereinbarter Baustein: Pflege und Weiterentwicklung, wenn Sie sie wünschen.

Was enthalten ist, steht vor dem Start in einem Angebot. Entwicklung, Betreuung und externe Kosten wie Hosting oder Software sind darin getrennt ausgewiesen. Erst wenn Sie das Angebot annehmen, entsteht ein Auftrag.

Wenn das für Sie in Frage kommt, antworten Sie auf diese Mail oder schildern Sie kurz, was Sie brauchen:

[Vorhaben schildern](https://nexifyai.de/kontakt)

Pascal Courbois bleibt Ihr Ansprechpartner.

**Ihr Widerspruchsrecht**

Sie können der Verwendung Ihrer E-Mail-Adresse für Werbung jederzeit widersprechen, ohne dass hierfür andere als die Übermittlungskosten nach den Basistarifen entstehen. Ein Klick genügt: [Keine Hinweise dieser Art mehr erhalten]({{ABMELDELINK}}). Eine kurze Antwort auf diese Mail genügt ebenfalls.

Freundliche Grüße
Pascal Courbois
NeXify AI

## Pflichtfuß

```
Sie erhalten diese Mail als Kunde von NeXify AI (Auftrag vom {{AUFTRAGSDATUM}}).
Widerspruch und Abmeldung: {{ABMELDELINK}} oder Antwort an {{IMPRESSUM_KONTAKT_EMAIL}}

NeXify AI
Chat it. Automate it.

{{IMPRESSUM_NAME_UND_INHABER}} · {{IMPRESSUM_RECHTSFORM}}
{{IMPRESSUM_ANSCHRIFT}}
E-Mail: {{IMPRESSUM_KONTAKT_EMAIL}} · Telefon: {{IMPRESSUM_TELEFON}}
{{IMPRESSUM_REGISTER}} · USt-IdNr.: {{IMPRESSUM_UST_ID}}
Impressum: {{LINK_IMPRESSUM}} · Datenschutz: {{LINK_DATENSCHUTZ}}
```

## Abmeldelink

`{{ABMELDELINK}}` im Text (eigener Absatz „Ihr Widerspruchsrecht“, getrennt von den übrigen Informationen) und im Fuß. Der Widerspruch führt zur Sperrliste und gilt für jede künftige Werbemail, nicht nur für dieses Thema.

## Belege der Aussagen

| Aussage | Quelle |
|---|---|
| „Nach der Übergabe können Sie Betreuung und Weiterentwicklung mit NeXify Care ergänzen.“ | `config/site-map.json`, Seite `websites`, Abschnitt „Was dazukommen kann“ |
| NeXify Care als eigener, vereinbarter Baustein | Gesamtkonzept, Abschnitt 4, „Kernaussage je Produkt“ |
| „Pflege und Weiterentwicklung, wenn Sie sie wünschen“; externe Kosten wie Hosting und Software getrennt | Seite `pricing`, Abschnitt „Drei Kostenarten, klar getrennt“ |
| Angebot vor dem Start; Auftrag erst mit Annahme | Seiten `pricing` und `contact` |
| Pascal Courbois bleibt Ansprechpartner | Seite `company` |

Kein Preis: Der Preis von NeXify Care ist nicht öffentlich (Gesamtkonzept, Abschnitt 4 und O-1).

## Offen vor Einsatz

- Prüfliste je Kunde, vom Inhaber geführt und unterschrieben (Punkte 1 bis 4).
- Ob Betreuung nach der Übergabe gegenüber dem jeweiligen Auftrag als „ähnliche“ Leistung gilt – Rechtsberatung.
- Welches Recht für Kunden außerhalb Deutschlands gilt (Register OA-007).
- Ob diese Mail über das Resend-Konto oder aus dem eigenen Postfach des Inhabers geht (Entscheidungsvorlage, Weg ii).
