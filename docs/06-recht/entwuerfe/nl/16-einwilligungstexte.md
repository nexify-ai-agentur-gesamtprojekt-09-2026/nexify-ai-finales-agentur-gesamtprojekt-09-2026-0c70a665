# Toestemmings- en informatieteksten (formuleringen voor formulieren, kassa en footer)
Status: ENTWURF zur Abnahme · Fassung 1.0-entwurf · Stand 15.11.2026 · Sprache: nl
Gilt für: Formulare und Oberflächen der Agenturseite (nexifyai.de) und des Shops TEILEKLAR (künftig teileklar.shop): Newsletter, Kontakt, Werkstattanfrage/Terminwunsch, Fehlerdiagnose, Endgerätespeicher, Kasse, Footer; Unternehmer und Verbraucher; DE, AT, NL, BE, LU
Führende Fassung: de für Nutzer in DE/AT, nl für Nutzer in NL/BE (Vorschlag, `[[OFFEN]]`, siehe Dokument 07); fr/en: Übersetzung, nicht muttersprachlich geprüft
Hinweis: Keine Rechtsberatung. Anwaltliche Prüfung (DE und NL) vor Veröffentlichung empfohlen.

---

## Hoe dit document te lezen

Elk onderdeel bevat eerst de **formulering** zoals die in de interface moet staan (ingesprongen), daarna kort de **duiding**: toestemming of alleen informatie, rechtsgrond, voorwaarden voor gebruik. Teksten die een toestand beschrijven die nog niet in de code bestaat, zijn gemarkeerd als **gewenste toestand** en mogen pas live gaan samen met de functie.

Gemeenschappelijke regels voor elke toestemming: vakjes zijn nooit vooraf aangevinkt; toestemming wordt nooit gekoppeld aan een andere verklaring (bestelling, voorwaarden, aanvraag); intrekken is even eenvoudig als geven; de formulering wordt met een versienummer opgeslagen.

---

## (a) Aanmelding voor de nieuwsbrief met dubbele opt-in  — gewenste toestand (schakelaar staat nu uit)

### a.1 Tekst bij het aanmeldformulier

Veld: e-mailadres (verplicht). Geen andere verplichte velden.

> ☐ Ja, ik wil de nieuwsbrief van `[[NeXify AI | TEILEKLAR]]` per e-mail ontvangen. Hij bevat `[[OFFEN: Inhalte, z. B. „nieuws over onze diensten en aanbiedingen“ / „aanbiedingen en tips rond auto-onderdelen“]]` en verschijnt `[[OFFEN: Häufigkeit, z. B. „ten hoogste twee keer per maand“]]`.
>
> Uw aanmelding is pas definitief wanneer u op de link in onze bevestigingsmail klikt. U kunt zich op elk moment afmelden – via de afmeldlink in elke nieuwsbrief of per e-mail aan `[[contactadres volgens het colofon]]`. Informatie over de verwerking van uw gegevens: privacyverklaring.

Knop: **Aanmelden voor de nieuwsbrief**

Melding na het versturen:

> Bijna klaar: wij hebben u een e-mail gestuurd. Klik op de link in die e-mail om uw aanmelding te bevestigen. Zonder bevestiging ontvangt u geen nieuwsbrief.

### a.2 Bevestigingsmail (kerntekst; zonder reclame, zonder afbeeldingen, zonder aanbiedingen)

> **Onderwerp:** Bevestig uw aanmelding voor de nieuwsbrief
>
> Goedendag,
>
> voor dit e-mailadres is de nieuwsbrief van `[[NeXify AI | TEILEKLAR]]` aangevraagd. Bevestig uw aanmelding:
>
> **[Aanmelding bevestigen]**
>
> Met de bevestiging geeft u toestemming dat wij u de nieuwsbrief per e-mail sturen (`[[inhoud en frequentie zoals in het formulier]]`). U kunt zich op elk moment afmelden via de afmeldlink in elke nieuwsbrief.
>
> Heeft u de nieuwsbrief niet aangevraagd? Dan hoeft u niets te doen. Zonder bevestiging sturen wij u geen nieuwsbrief en verwijderen wij de aanmelding na `[[OFFEN: Frist für nie bestätigte Anmeldungen]]`.
>
> Wilt u op dit adres helemaal geen bevestigingsmails meer ontvangen? **[Dit adres blokkeren]**
>
> `[[Aanbieder volgens het colofon: naam, adres, e-mail]]` · Privacyverklaring: `[[link]]`

Melding na het klikken op de bevestigingslink:

> Dank u wel. Uw aanmelding is bevestigd.

### a.3 Afmeldinformatie in elke nieuwsbrief (voettekst)

> U ontvangt deze e-mail omdat u zich op `[[datum van de bevestiging]]` heeft aangemeld voor de nieuwsbrief van `[[NeXify AI | TEILEKLAR]]`. **[Afmelden]** – één klik is genoeg, inloggen is niet nodig.
> `[[Aanbieder volgens het colofon: naam, adres, e-mail]]`

Melding na het afmelden:

> U bent afgemeld. Wij sturen u geen nieuwsbrief meer.

### a.4 Duiding

- **Toestemming** voor reclame per e-mail: artikel 11.7 lid 1 Telecommunicatiewet (geldt ook tegenover ondernemers); voor ontvangers in Duitsland daarnaast § 7 lid 2 nr. 2 UWG; voor de gegevensverwerking artikel 6 lid 1 onder a en artikel 7 AVG. De uitzondering voor bestaande klanten (artikel 11.7 lid 4 Tw, § 7 lid 3 UWG) wordt niet gebruikt.
- De **dubbele opt-in** dient als bewijs dat de houder van het adres toestemming heeft gegeven. De bevestigingsmail blijft vrij van reclame.
- **Bewijs – wat wordt vastgelegd:** e-mailadres, taal, bron van de aanmelding (formulier/pagina), versie en SHA-256-controlegetal van de getoonde toestemmingstekst, tijdstippen van aanmelding, bevestiging en afmelding. **Niet** vastgelegd worden het IP-adres en browserkenmerken. Nooit bevestigde aanmeldingen worden verwijderd. De blokkeerlijst bevat alleen het SHA-256-controlegetal van het adres.
- **Afmelden:** link in elke nieuwsbrief en daarnaast afmelden met één klik via de kopregels van de e-mail (RFC 8058); elke nieuwsbrief vermeldt de werkelijke afzender en een geldig adres voor afmelding (artikel 11.7 lid 7 Tw).
- **Bewaartermijn van het bewijs:** `[[OFFEN: Frist. Anhaltspunkt: Die ACM nennt den Nachweis der Einwilligung „tot 5 jaar na verzending“.]]`
- **Leeftijd:** de nieuwsbrief is niet bestemd voor personen jonger dan 16 jaar (artikel 5 UAVG).

---

## (b) Contact- en aanvraagformulier – informatie in plaats van toestemming

### b.1 Informatietekst onder het formulier (geen vakje)

> Wij gebruiken uw gegevens (naam, e-mailadres, onderneming, uw vraag) om uw aanvraag te beantwoorden en – als u dat wilt – een offerte voor te bereiden. Vul geen wachtwoorden, betaalgegevens of vertrouwelijke documenten in. Hoe lang wij aanvragen bewaren en welke rechten u heeft, staat in de privacyverklaring.

Knop: **Aanvraag versturen**

Melding na het versturen:

> Dank u wel. Wij hebben uw aanvraag ontvangen. Deze bevestiging is nog geen offerte en geen aanvaarding van een opdracht.

### b.2 Duiding en motivering

- **Geen toestemming.** De verwerking is noodzakelijk om op verzoek van de betrokkene stappen te nemen vóór het sluiten van een overeenkomst (artikel 6 lid 1 onder b AVG) en, bij algemene vragen zonder verband met een overeenkomst, voor het gerechtvaardigd belang bij de beantwoording (artikel 6 lid 1 onder f AVG). Een extra gevraagde “toestemming” zou de verkeerde grondslag zijn: zij zou vrij intrekbaar moeten zijn, terwijl de aanvraag zonder de gegevens niet kan worden behandeld, en zij vervangt de informatieplicht van artikel 13 AVG niet. Nodig is daarom **informatie** met een verwijzing naar de privacyverklaring.
- **Wijziging ten opzichte van nu:** het formulier heeft een verplicht veld “toestemming”. Voorstel: vakje verwijderen, informatietekst plaatsen.
- **Geen reclame op basis van de aanvraag:** het adres uit het contactformulier wordt niet voor de nieuwsbrief gebruikt. Wie de nieuwsbrief wil, meldt zich afzonderlijk aan volgens (a).

---

## (c) Garageaanvraag en afspraakverzoek – doorgifte aan de gekozen garage  — gewenste toestand (de garage krijgt nu nog geen bericht)

### c.1 Tekst bij het formulier

> **Zo verloopt uw aanvraag:** wij sturen uw gegevens door aan **`[[naam van de gekozen garage, plaats]]`**, zodat de garage u kan antwoorden. Doorgegeven worden: naam, e-mailadres, telefoonnummer (indien ingevuld), gegevens over het voertuig (indien ingevuld), uw vraag `[[bij een afspraakverzoek aanvullend: „en uw gewenste periode“]]`.
>
> De garage is een zelfstandig bedrijf en is zelf verantwoordelijk voor de omgang met uw gegevens. TEILEKLAR is geen contractpartij bij de garagedienst; alleen de garage bevestigt het tijdstip, de omvang en de prijs. `[[bij een afspraakverzoek aanvullend: „Uw afspraakverzoek is nog geen bevestigde afspraak. Reageert de garage niet, dan is dat geen toezegging.“]]`
>
> ☐ Ik wil dat mijn gegevens voor dit doel aan de genoemde garage worden doorgegeven. (verplicht)
>
> Informatie over de verwerking van uw gegevens: privacyverklaring.

Knop: **Aanvraag naar de garage versturen** / **Afspraakverzoek versturen**

Melding na het versturen:

> Uw aanvraag is doorgestuurd aan `[[garage]]`. U ontvangt een bevestiging per e-mail. De garage neemt rechtstreeks contact met u op.

### c.2 Duiding

- De doorgifte aan de gekozen garage is de kern van wat de gebruiker vraagt. De rechtsgrond is daarom in de eerste plaats artikel 6 lid 1 onder b AVG (stappen op verzoek van de betrokkene vóór een overeenkomst met de garage). Het vakje is een **uitdrukkelijke bevestiging van de opdracht tot doorgifte**; het maakt de doorgifte transparant en aantoonbaar. Of het daarnaast als toestemming volgens artikel 6 lid 1 onder a AVG wordt behandeld, is nog open (zie de punten voor de juridische toetsing in de Duitse versie). In beide gevallen wordt de versie van de formulering opgeslagen.
- Er vindt geen doorgifte aan andere garages plaats. Geen gebruik voor reclame.
- De garage is zelfstandig verwerkingsverantwoordelijke; de verplichtingen van de garage staan in de partnervoorwaarden (document 14).
- **Voorwaarde:** de garage krijgt daadwerkelijk bericht. Dat gebeurt nu niet; zolang mag de tekst niet live gaan.

---

## (d) Foutdiagnose (PostHog, EU) – alleen na toestemming

### d.1 Tekst in het venster “Instellingen foutdiagnose”

> **Foutrapporten versturen?**
> Als u toestemming geeft, stuurt deze website bij een technische fout een foutrapport naar onze dienstverlener PostHog (servers in de EU). Het rapport bevat `[[OFFEN: Datenfelder bestätigen, z. B. foutmelding, betreffende pagina, tijdstip, type browser en apparaat]]`. Uw sessie wordt niet opgenomen en er wordt hiervoor niets blijvend in uw browser opgeslagen.
> Uw keuze geldt totdat u de pagina opnieuw laadt of sluit. U kunt haar daarvóór op elk moment hier wijzigen. Zonder toestemming worden geen foutrapporten verstuurd; de website werkt precies hetzelfde.
> Meer informatie: privacyverklaring.

Knoppen (gelijk vormgegeven): **Foutrapporten toestaan** · **Niet toestaan**

Link in de footer: **Instellingen foutdiagnose**

### d.2 Duiding

- **Toestemming:** artikel 6 lid 1 onder a AVG voor de doorgifte; voor zover daarbij informatie uit het apparaat wordt uitgelezen, artikel 11.7a lid 1 Telecommunicatiewet (voor Duitsland § 25 lid 1 TDDDG).
- De tekst beschrijft de huidige toestand: alleen foutrapporten, alleen na toestemming, host `eu.i.posthog.com`, geen blijvende opslag, geen sessie-opname, de keuze geldt tot het opnieuw laden.
- Weigeren moet even gemakkelijk zijn als toestaan; geen voorinstelling.

---

## (e) Toestemming voor niet-noodzakelijke opslag op het apparaat (banner)  — gewenste toestand, nu niet gebruiken

Op dit moment is er geen banner, omdat alleen noodzakelijke opslag plaatsvindt (aanmelding, winkelwagen voor gasten, weergave, chatvenster). De volgende tekst wordt **alleen** gebruikt zodra voor het eerst niet-noodzakelijke opslag of uitlezing wordt ingevoerd (bijvoorbeeld bereikmeting of marketing).

### e.1 Korte bannertekst

> **Uw keuze voor dit apparaat**
> Wij slaan op uw apparaat op wat nodig is om de website te laten werken (bijvoorbeeld aanmelding, winkelwagen, weergave). Daarvoor is geen toestemming nodig. Voor `[[OFFEN: Zwecke konkret nennen, z. B. „bereikmeting“]]` willen wij daarnaast informatie op uw apparaat opslaan of uitlezen – alleen als u toestemming geeft. U kunt uw keuze op elk moment wijzigen via “Cookie-instellingen” in de footer. Details: cookies en opslag op uw apparaat.

Knoppen (gelijk vormgegeven, op hetzelfde niveau): **Alleen noodzakelijk** · **Keuze maken** · **Alles toestaan**

### e.2 Melding vóór het laden van de garagekaart (voorstel, zolang de kaart bij derden wordt geladen)

> **Kaart laden?** De kaart wordt geladen van OpenStreetMap, de kaartsoftware van unpkg.com. Daarbij wordt uw IP-adres aan deze aanbieders doorgegeven. Zonder kaart ziet u de garages als lijst.
> **Kaart laden** · **Lijst tonen**

### e.3 Duiding

- Artikel 11.7a lid 1 en 3 Telecommunicatiewet; voor Duitsland § 25 lid 1 en 2 TDDDG; artikel 5 lid 3 Richtlijn 2002/58/EG. Noodzakelijke opslag vereist geen toestemming, maar wordt in document 03 toegelicht.
- e.2 betreft geen opslag op het apparaat, maar het ophalen van inhoud bij derden; de melding vervalt wanneer kaart en bibliotheek zelf worden gehost. `[[OFFEN: Entscheidung – selbst hosten oder Zwei-Klick-Hinweis]]`

---

## (f) Kassa: verplichte informatie bij de bestelknop

### f.1 Aan het begin van het bestelproces (winkelwagen of eerste stap van de kassa)

> Wij leveren in Nederland, België, Luxemburg, Duitsland en Oostenrijk. Betaling: kaart of Revolut Pay (via Revolut). `[[OFFEN: Zahlungsart mit mindestens 50 % Zahlung nach Lieferung für Verbraucher in NL ergänzen – siehe Offene Punkte in der deutschen Fassung]]`

### f.2 Laatste stap “Controleren” – direct boven de knop

Eerst, duidelijk en in het oog springend: het besteloverzicht met de voornaamste kenmerken van elk artikel, het aantal, de prijs per stuk, de verzendkosten, de **totaalprijs inclusief btw** en het land van levering. Daarna:

> Op uw bestelling zijn onze **algemene voorwaarden** [link] van toepassing. Als consument heeft u 14 dagen bedenktijd; de details staan in de **informatie over het herroepingsrecht** [link], waar u ook het modelformulier voor herroeping vindt. Informatie over de verwerking van uw gegevens: **privacyverklaring** [link].

Knop: **Bestelling met betalingsverplichting**

Onder de knop:

> Na het klikken wordt u voor de betaling doorgestuurd naar Revolut. De bestelbevestiging met de algemene voorwaarden en de informatie over het herroepingsrecht ontvangt u per e-mail.

### f.3 Duiding van het bestaande vakje – voorstel tot wijziging

**Nu:** één verplicht, niet vooraf aangevinkt vakje met de (Duitse) tekst “Ich habe die AGB und die Widerrufsbelehrung gelesen und akzeptiere sie.”; opgeslagen wordt `terms_accepted_at`.

**Duiding:**

1. **Algemene voorwaarden:** de koper moet vóór of bij het sluiten van de overeenkomst een redelijke mogelijkheid krijgen om er kennis van te nemen; langs elektronische weg zo dat hij ze kan opslaan en later kan raadplegen. Een vakje is niet voorgeschreven, maar is toegestaan.
2. **Informatie over het herroepingsrecht:** dit is wettelijke informatie van de verkoper, geen aanbod. De koper moet haar ontvangen, niet “accepteren”. De formulering “akzeptiere sie” is ongebruikelijk en kan de onjuiste indruk wekken dat de bedenktijd afhangt van instemming of daardoor verandert.
3. **“gelezen”:** een voorgeformuleerde verklaring dat iets is gelezen, bewijst de kennisneming niet en heeft geen zelfstandige juridische waarde.

**Voorstel (wijziging):** vakje verwijderen en de informatietekst f.2 direct boven de knop plaatsen. In plaats van `terms_accepted_at` worden het tijdstip van de bestelling en de getoonde versies van de algemene voorwaarden en van de informatie over het herroepingsrecht opgeslagen.

**Alternatief, als het vakje moet blijven** (verplicht, niet vooraf aangevinkt):

> ☐ Ik ga akkoord met de **algemene voorwaarden** [link].
>
> Informatie over uw bedenktijd: **informatie over het herroepingsrecht** [link].

### f.4 Duiding knop en verplichte informatie

- De knoptekst “Bestelling met betalingsverplichting” is de formulering die artikel 6:230v lid 3 BW uitdrukkelijk als ondubbelzinnig aanmerkt; in de Duitse interface “Zahlungspflichtig bestellen” (§ 312j lid 3 BGB). Op de knop staat niets anders. Een overeenkomst die in strijd met deze regel tot stand komt, is vernietigbaar.
- Direct vóór de bestelling, duidelijk en in het oog springend: voornaamste kenmerken, totaalprijs, verzendkosten en, indien van toepassing, de fabrieksgarantie van meer dan twee jaar met het EU-etiket (artikel 6:230v lid 2 BW; § 312j lid 2 BGB).
- Beperkingen van de levering en geaccepteerde betaalmiddelen uiterlijk aan het begin van het bestelproces (artikel 6:230v lid 4 BW; § 312j lid 1 BGB).
- De EU-kennisgeving over de wettelijke garantie is een vaste afbeelding van de Europese Commissie en wordt ongewijzigd als afbeelding opgenomen, niet in eigen woorden weergegeven (document 11).
- **Vooruitbetaling:** van consumenten in Nederland mag ten hoogste de helft van de koopprijs als vooruitbetaling worden verlangd (artikel 7:26 lid 2 BW); volgens de ACM moet er ten minste één betaalwijze zijn waarbij minimaal 50 % pas na levering wordt betaald. De huidige kassa biedt alleen volledige betaling vooraf – zie de open punten.

---

## (g) Footerregel over AI

Op elke pagina van de bureauwebsite en de webwinkel, zichtbaar in de footer (hoofdversie in document 08):

> Deze website bevat door AI gegenereerde inhoud en een AI-assistent. Meer informatie: AI-informatie.

“AI-informatie” is een link naar `/ki-hinweise`. Duitse versie: „Diese Website enthält KI-erzeugte Inhalte und einen KI-Assistenten. Mehr dazu: KI-Hinweise.“

Duiding: informatie, geen toestemming. De regel vervangt niet de melding in de chat uiterlijk bij de eerste interactie en niet de aanduiding bij door AI gegenereerde media (artikel 50 lid 1, 2 en 5 AI-verordening; document 08).

---

Werkgedeelten (wijzigingsoverzicht, open punten, punten voor de juridische toetsing): zie de Duitse versie `docs/06-recht/entwuerfe/de/16-einwilligungstexte.md`.
