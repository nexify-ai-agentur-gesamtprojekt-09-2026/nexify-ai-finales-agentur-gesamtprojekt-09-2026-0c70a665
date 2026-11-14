# 05 · TEILEKLAR: Werkstatt und Partner

Stand: 14.11.2026 · Entwurf · Basis: `DECISIONS.md` D-011 (TEILEKLAR eigenständig, Versalien), D-012 (Sie), D-014 (kein Jargon).

**Keine Kostenaussage.** Was für Werkstätten kostenfrei ist, hat der Inhaber noch nicht festgelegt (EV-13). Diese Vorlage enthält deshalb weder „kostenfrei“ noch eine Gebühr, Provision oder Frist. Die Kostenzeile ist als Lücke geführt (`LUECKEN.md` L-13) und erscheint erst, wenn ein Fakt in `config/fakten.json` steht.

**Was heute wirklich geschieht** (Stand der Quellen, `docs/konzept/2026-11-14/02-shop-werkstatt.md`, Abschnitte 2.2 und 4.2):

- Partneranfrage einer Werkstatt: Die Angaben werden gespeichert und zur Prüfung vorgemerkt. Es entsteht keine Aufnahme, kein Zugang und keine Vereinbarung.
- Werkstattanfrage eines Kunden: Die Anfrage wird gespeichert, der Kunde erhält eine Eingangsmail. **Der Betrieb wird heute nicht benachrichtigt.** Im Verzeichnis stehen Betriebe ohne Vereinbarung mit TEILEKLAR; bestätigte Partner gibt es noch nicht.
- Ein Partnerbereich mit Funktionen besteht noch nicht.

Die Texte sagen genau das und nicht mehr. Wo ein Text einen künftigen Schritt beschreibt, steht dabei, ab wann er verwendet werden darf.

---

## Partner-Landingpage

Seite `/teileklar/partner-werden`. Aufbau: Kopf, Nutzen, Ablauf in vier Schritten, Fragen und Antworten, Formular.

### `tk.partner.head`
Zweck: Überschrift und Einstieg. Spricht die Werkstatt an, nicht den Autofahrer · Richtwert: Titel ≤ 60, Text ≤ 260 Zeichen · Quelle: `apps/web/components/shop/PartnerJourney.tsx` (Einstieg); `config/site-map.json` Seite `tk-partner`; `docs/konzept/2026-11-14/01-marke-marketing.md`, Abschnitt 4.4 Nr. 3

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.head.kicker` | Für Werkstätten | Voor werkplaatsen | Pour les ateliers | For workshops |
| `tk.partner.head.title` | Anfragen, mit denen Sie arbeiten können. | Aanvragen waarmee u aan de slag kunt. | Des demandes sur lesquelles vous pouvez travailler. | Enquiries you can work with. |
| `tk.partner.head.body` | Bei TEILEKLAR beginnt jede Anfrage beim konkreten Fahrzeug. Kundinnen und Kunden nennen Fahrzeug, gesuchtes Teil und gewünschte Arbeit, bevor sie sich an einen Betrieb wenden. Stellen Sie uns Ihren Betrieb vor. | Bij TEILEKLAR begint elke aanvraag bij het concrete voertuig. Klanten noemen voertuig, gezocht onderdeel en gewenste werkzaamheden voordat ze zich tot een bedrijf wenden. Stel uw bedrijf aan ons voor. | Chez TEILEKLAR, chaque demande part du véhicule concerné. Les clients indiquent le véhicule, la pièce recherchée et l’intervention souhaitée avant de s’adresser à un atelier. Présentez-nous le vôtre. | With TEILEKLAR every enquiry starts with the specific vehicle. Customers name the vehicle, the part they need and the work they want before they approach a workshop. Tell us about yours. |
| `tk.partner.head.cta` | Betrieb vorstellen | Bedrijf voorstellen | Présenter mon atelier | Introduce your workshop |

### `tk.partner.state`
Zweck: der eine klare Hinweis auf den Stand. Steht einmal, direkt unter dem Kopf · Richtwert: ≤ 200 Zeichen · Quelle: `02-shop-werkstatt.md`, Abschnitt 4.2 (kein Partnerstatus, kein Partnerbereich); `config/site-map.json` Seite `tk-partner` („Ihre Interessenbekundung eröffnet das Gespräch und ersetzt keine Partnervereinbarung“)

| | Text |
|---|---|
| DE | TEILEKLAR nimmt zurzeit Interessenbekundungen von Werkstätten entgegen. Ihre Anfrage eröffnet das Gespräch. Eine Partnerschaft entsteht erst mit einer Vereinbarung, die Sie vorher lesen. |
| NL | TEILEKLAR neemt op dit moment blijken van belangstelling van werkplaatsen in ontvangst. Uw aanvraag opent het gesprek. Een partnerschap ontstaat pas met een overeenkomst die u vooraf leest. |
| FR | TEILEKLAR recueille actuellement les manifestations d’intérêt des ateliers. Votre demande ouvre l’échange. Un partenariat ne naît qu’avec un accord que vous lisez au préalable. |
| EN | TEILEKLAR is currently taking expressions of interest from workshops. Your enquiry opens the conversation. A partnership only comes about with an agreement you read beforehand. |

### `tk.partner.benefits`
Zweck: Nutzen aus Belegtem. Vier Punkte, jeder mit Titel und einem Satz · Richtwert: Titel ≤ 45, Text ≤ 170 Zeichen · Quelle: siehe Spalte. Die Punkte beschreiben, wie die Zusammenarbeit angelegt ist; sie nennen keine Auftragszahlen, Konditionen oder Fristen.

| Kennung | DE | NL | FR | EN | Quelle |
|---|---|---|---|---|---|
| `tk.partner.benefit.1.title` | Die Anfrage beginnt beim Fahrzeug | De aanvraag begint bij het voertuig | La demande part du véhicule | The enquiry starts with the vehicle | Seite `tk-home` |
| `tk.partner.benefit.1.body` | Fahrzeug, Teil und gewünschte Arbeit stehen in der Anfrage. Sie müssen sie nicht erst am Telefon zusammensuchen. | Voertuig, onderdeel en gewenste werkzaamheden staan in de aanvraag. U hoeft ze niet eerst telefonisch bij elkaar te zoeken. | Véhicule, pièce et intervention souhaitée figurent dans la demande. Vous n’avez pas à les reconstituer au téléphone. | Vehicle, part and the work wanted are in the enquiry. You do not have to piece them together on the phone first. | `PartnerJourney.tsx` (Einstieg) |
| `tk.partner.benefit.2.title` | Umfang, Preis und Termin bestätigen Sie | Omvang, prijs en afspraak bevestigt u | Vous confirmez le périmètre, le prix et le rendez-vous | You confirm scope, price and appointment | Seite `tk-workshop` |
| `tk.partner.benefit.2.body` | Eine Anfrage ist kein Auftrag. Ob Sie die Arbeit annehmen, was sie kostet und wann sie stattfindet, entscheiden allein Sie. | Een aanvraag is geen opdracht. Of u het werk aanneemt, wat het kost en wanneer het plaatsvindt, bepaalt u alleen. | Une demande n’est pas une commande. Vous seul décidez d’accepter l’intervention, de son prix et de sa date. | An enquiry is not a job. Whether you take the work, what it costs and when it happens is yours alone to decide. | Seite `tk-workshop` („Kapazität, Leistungsumfang und Preis werden vom Betrieb bestätigt“) |
| `tk.partner.benefit.3.title` | Ihr Profil zeigt, was Sie anbieten | Uw profiel laat zien wat u aanbiedt | Votre profil montre ce que vous proposez | Your profile shows what you offer | Seite `tk-partner` |
| `tk.partner.benefit.3.body` | Leistungen, Standort und Ansprechpartner machen Ihren Betrieb für Kunden einordbar. Was öffentlich erscheint, geben Sie selbst frei. | Diensten, locatie en contactpersoon maken uw bedrijf voor klanten herkenbaar. Wat openbaar verschijnt, geeft u zelf vrij. | Prestations, adresse et interlocuteur permettent aux clients de situer votre atelier. Vous validez vous-même ce qui est publié. | Services, location and contact person help customers place your workshop. You approve what appears in public yourself. | Seite `tk-partner`; `02-shop-werkstatt.md`, Abschnitt 4.3 („Freigabe ist nicht Veröffentlichung“) |
| `tk.partner.benefit.4.title` | Erst die Vereinbarung, dann die Zusammenarbeit | Eerst de overeenkomst, dan de samenwerking | D’abord l’accord, ensuite la collaboration | First the agreement, then the work | Seite `tk-partner` |
| `tk.partner.benefit.4.body` | Anfragewege, Bestätigungen, Konditionen und Abrechnung stimmen wir mit Ihnen ab, bevor die Zusammenarbeit beginnt. | Aanvraagroutes, bevestigingen, voorwaarden en afrekening stemmen we met u af voordat de samenwerking begint. | Circuits de demande, confirmations, conditions et facturation sont convenus avec vous avant le début de la collaboration. | How enquiries reach you, confirmations, terms and billing are agreed with you before any work together begins. | Seite `tk-partner` („werden vor einer Zusammenarbeit abgestimmt“) |

### `tk.partner.cost`
LÜCKE: braucht Entscheidung EV-13 (was für Werkstätten kostenfrei ist, mit oder ohne Gebühr, was ein Direktpartner ist). Kein Baustein. Siehe `LUECKEN.md` L-13.

### `tk.partner.steps`
Zweck: Ablauf in vier Schritten. Schritt 1 gilt heute; die Schritte 2 bis 4 beschreiben den vorgesehenen Weg und dürfen erst erscheinen, wenn Prüfung, Vereinbarung und Aufnahme eingerichtet sind (Pakete W1-12 bis W1-14) · Richtwert: Titel ≤ 35, Text ≤ 170 Zeichen · Quelle: `PartnerJourney.tsx` (`STEPS`); `02-shop-werkstatt.md`, Abschnitt 4.3

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.steps.title` | So läuft die Aufnahme ab | Zo verloopt de opname | Comment se déroule l’admission | How joining works |
| `tk.partner.step.1.title` | Sie stellen Ihren Betrieb vor. | U stelt uw bedrijf voor. | Vous présentez votre atelier. | You introduce your workshop. |
| `tk.partner.step.1.body` | Leistungen, Ort, Einzugsgebiet und Ansprechpartner genügen für den Anfang. Ihre Angaben werden gespeichert und zur Prüfung vorgemerkt. | Diensten, plaats, werkgebied en contactpersoon volstaan om te beginnen. Uw gegevens worden opgeslagen en voor beoordeling genoteerd. | Prestations, lieu, zone d’intervention et interlocuteur suffisent pour commencer. Vos informations sont enregistrées et mises en attente d’examen. | Services, location, catchment area and contact person are enough to begin. Your details are saved and noted for review. |
| `tk.partner.step.2.title` | Wir prüfen und sprechen mit Ihnen. | We beoordelen en spreken met u. | Nous examinons et échangeons avec vous. | We review and talk to you. |
| `tk.partner.step.2.body` | Wir sehen uns Ihre Angaben an und klären offene Fragen im Gespräch. | We bekijken uw gegevens en bespreken open vragen met u. | Nous étudions vos informations et clarifions les points ouverts lors d’un échange. | We look at your details and settle open questions in conversation. |
| `tk.partner.step.3.title` | Wir vereinbaren die Zusammenarbeit. | We leggen de samenwerking vast. | Nous convenons de la collaboration. | We agree how we work together. |
| `tk.partner.step.3.body` | Sie erhalten die Bedingungen schriftlich und entscheiden in Ruhe. Ohne Ihre Zustimmung gilt nichts. | U ontvangt de voorwaarden schriftelijk en beslist in alle rust. Zonder uw instemming geldt er niets. | Vous recevez les conditions par écrit et décidez sans hâte. Rien ne s’applique sans votre accord. | You receive the terms in writing and decide in your own time. Nothing applies without your consent. |
| `tk.partner.step.4.title` | Sie geben Ihr Profil frei. | U geeft uw profiel vrij. | Vous validez votre profil. | You approve your profile. |
| `tk.partner.step.4.body` | Erst wenn Sie Ihr Profil freigeben, erscheint Ihr Betrieb öffentlich als Partner von TEILEKLAR. | Pas wanneer u uw profiel vrijgeeft, verschijnt uw bedrijf openbaar als partner van TEILEKLAR. | Ce n’est qu’après votre validation que votre atelier apparaît publiquement comme partenaire de TEILEKLAR. | Only once you approve your profile does your workshop appear in public as a TEILEKLAR partner. |

### `tk.partner.faq`
Zweck: Fragen und Antworten. Nur Fragen, die sich aus Belegtem beantworten lassen · Richtwert: Frage ≤ 60, Antwort ≤ 220 Zeichen · Quelle: Seiten `tk-partner`, `tk-workshop`; `02-shop-werkstatt.md`, Abschnitt 4.2

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.faq.1.q` | Bin ich nach der Anfrage schon Partner? | Ben ik na de aanvraag al partner? | Suis-je partenaire dès l’envoi de ma demande ? | Am I a partner once I have sent the enquiry? |
| `tk.partner.faq.1.a` | Nein. Ihre Anfrage ist eine Interessenbekundung. Partner werden Sie erst mit einer Vereinbarung, der Sie zugestimmt haben. | Nee. Uw aanvraag is een blijk van belangstelling. Partner wordt u pas met een overeenkomst waarmee u heeft ingestemd. | Non. Votre demande est une manifestation d’intérêt. Vous ne devenez partenaire qu’avec un accord que vous avez approuvé. | No. Your enquiry is an expression of interest. You only become a partner with an agreement you have consented to. |
| `tk.partner.faq.2.q` | Mein Betrieb steht schon im Verzeichnis. Was heißt das? | Mijn bedrijf staat al in het overzicht. Wat betekent dat? | Mon atelier figure déjà dans l’annuaire. Qu’est-ce que cela signifie ? | My workshop is already in the directory. What does that mean? |
| `tk.partner.faq.2.a` | Das Verzeichnis nennt Betriebe mit ihren öffentlichen Kontaktdaten. Ein Eintrag ist keine Partnerschaft und keine Vereinbarung mit TEILEKLAR. | Het overzicht noemt bedrijven met hun openbare contactgegevens. Een vermelding is geen partnerschap en geen overeenkomst met TEILEKLAR. | L’annuaire recense des ateliers avec leurs coordonnées publiques. Une fiche n’est ni un partenariat ni un accord avec TEILEKLAR. | The directory lists workshops with their public contact details. A listing is neither a partnership nor an agreement with TEILEKLAR. |
| `tk.partner.faq.3.q` | Wer legt Preis und Termin fest? | Wie bepaalt prijs en afspraak? | Qui fixe le prix et le rendez-vous ? | Who sets the price and the appointment? |
| `tk.partner.faq.3.a` | Sie. TEILEKLAR bestätigt weder Ihren Preis noch Ihren Termin. Eine Anfrage wird erst zum Auftrag, wenn Sie sie annehmen. | U. TEILEKLAR bevestigt uw prijs noch uw afspraak. Een aanvraag wordt pas een opdracht wanneer u haar aanneemt. | Vous. TEILEKLAR ne confirme ni votre prix ni votre rendez-vous. Une demande ne devient une commande que si vous l’acceptez. | You do. TEILEKLAR confirms neither your price nor your appointment. An enquiry only becomes a job once you accept it. |
| `tk.partner.faq.4.q` | Was geschieht mit meinen Angaben? | Wat gebeurt er met mijn gegevens? | Que deviennent mes informations ? | What happens to my details? |
| `tk.partner.faq.4.a` | Wir speichern sie, um Ihre Anfrage zu bearbeiten. Öffentlich erscheint davon nichts, solange Sie kein Profil freigegeben haben. | We slaan ze op om uw aanvraag te behandelen. Daarvan verschijnt niets openbaar zolang u geen profiel heeft vrijgegeven. | Nous les enregistrons pour traiter votre demande. Rien n’en est publié tant que vous n’avez pas validé de profil. | We store them to handle your enquiry. None of it appears in public until you have approved a profile. |

### `tk.partner.faq.cost`
LÜCKE: Die Frage „Was kostet die Partnerschaft?“ braucht Entscheidung EV-13. Bis dahin steht sie nicht in der Liste; eine ausweichende Antwort wäre schlechter als keine. Siehe `LUECKEN.md` L-13.

### `tk.partner.faq.criteria`
LÜCKE: Die Frage „Wonach wird geprüft?“ braucht die Prüfkriterien (EV-13, E-Offen-1). Siehe `LUECKEN.md` L-14.

### `tk.partner.form`
Zweck: Formular „Betrieb vorstellen“ · Richtwert: Beschriftung ≤ 30, Hilfe ≤ 80 Zeichen · Quelle: `apps/web/components/PartnerRequestForm.tsx`; zusätzliche Felder Leistungen, Ort, Einzugsgebiet aus Paket W1-10

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.form.title` | Betrieb vorstellen | Bedrijf voorstellen | Présenter mon atelier | Introduce your workshop |
| `tk.partner.form.company` | Name des Betriebs | Naam van het bedrijf | Nom de l’atelier | Workshop name |
| `tk.partner.form.contact` | Ansprechpartner | Contactpersoon | Interlocuteur | Contact person |
| `tk.partner.form.email` | E-Mail-Adresse | E-mailadres | Adresse e-mail | Email address |
| `tk.partner.form.place` | Ort | Plaats | Localité | Town |
| `tk.partner.form.area` | Einzugsgebiet | Werkgebied | Zone d’intervention | Catchment area |
| `tk.partner.form.area.help` | Zum Beispiel Orte oder ein Umkreis, in dem Ihre Kunden wohnen. | Bijvoorbeeld plaatsen of een straal waarbinnen uw klanten wonen. | Par exemple des localités ou un rayon où vivent vos clients. | For example towns, or a radius your customers live in. |
| `tk.partner.form.services` | Leistungen | Diensten | Prestations | Services |
| `tk.partner.form.services.help` | Was Sie anbieten, in Stichworten. | Wat u aanbiedt, in trefwoorden. | Ce que vous proposez, en quelques mots. | What you offer, in a few words. |
| `tk.partner.form.message` | Was möchten Sie uns noch sagen? | Wat wilt u ons nog laten weten? | Que souhaitez-vous ajouter ? | Anything else you would like to tell us? |
| `tk.partner.form.consent` | Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Anfrage gespeichert werden. | Ik ga ermee akkoord dat mijn gegevens worden opgeslagen om deze aanvraag te behandelen. | J’accepte que mes informations soient enregistrées pour le traitement de cette demande. | I agree that my details are stored in order to handle this enquiry. |
| `tk.partner.form.submit` | Anfrage senden | Aanvraag versturen | Envoyer la demande | Send enquiry |
| `tk.partner.form.busy` | Anfrage wird gespeichert … | Aanvraag wordt opgeslagen … | Enregistrement de la demande … | Saving your enquiry … |

Die Einwilligungszeile ist aus dem Bestand übernommen (`WorkshopDetail.tsx`); ihr Wortlaut ist rechtlich zu prüfen (EV-07).

### `tk.partner.sent`
Zweck: Bestätigung nach dem Absenden. Sagt, was geschehen ist und was nicht · Richtwert: Titel ≤ 40, Text ≤ 260 Zeichen · Quelle: `PartnerRequestForm.tsx` („gespeichert und zur Prüfung vorgemerkt“, „keine Empfangs-, Zustell- oder Freigabebestätigung“)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.sent.title` | Ihre Anfrage ist gespeichert. | Uw aanvraag is opgeslagen. | Votre demande est enregistrée. | Your enquiry has been saved. |
| `tk.partner.sent.body` | Vorgang {{vorgang}}. Ihre Angaben sind zur Prüfung vorgemerkt. Das ist noch keine Aufnahme und keine Vereinbarung; ein Zugang wird damit nicht eingerichtet. Wenn Sie vorab etwas klären möchten, schreiben Sie an mail@nexifyai.cloud und nennen Sie den Vorgang. | Dossier {{vorgang}}. Uw gegevens zijn voor beoordeling genoteerd. Dit is nog geen opname en geen overeenkomst; er wordt hiermee geen toegang ingericht. Wilt u vooraf iets afstemmen, schrijf dan naar mail@nexifyai.cloud en vermeld het dossier. | Dossier {{vorgang}}. Vos informations sont en attente d’examen. Il ne s’agit ni d’une admission ni d’un accord ; aucun accès n’est créé à ce stade. Pour clarifier un point au préalable, écrivez à mail@nexifyai.cloud en indiquant le dossier. | Reference {{vorgang}}. Your details are noted for review. This is not yet an admission or an agreement, and no access is set up by it. If you would like to clarify something first, write to mail@nexifyai.cloud and quote the reference. |

### `tk.partner.sent.followup`
Zweck: Zusatzsatz zur Rückmeldung. **Erst verwenden, wenn die interne Benachrichtigung eingerichtet und geprüft ist** (Pakete W1-09 und W1-11); vorher wäre er eine Zusage ohne Weg dahinter · Richtwert: ≤ 110 Zeichen · Quelle: `02-shop-werkstatt.md`, Paket W-03

| | Text |
|---|---|
| DE | Sobald wir Ihre Angaben geprüft haben, schreiben wir Ihnen an {{email}}. |
| NL | Zodra we uw gegevens hebben beoordeeld, schrijven we u op {{email}}. |
| FR | Dès que nous aurons examiné vos informations, nous vous écrirons à {{email}}. |
| EN | As soon as we have reviewed your details, we will write to you at {{email}}. |

### `tk.partner.error`
Zweck: Fehler im Formular · Richtwert: ≤ 200 Zeichen · Quelle: `PartnerRequestForm.tsx` (`error`, `unknown`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.partner.error.failed` | Ihre Anfrage wurde nicht gespeichert. Bitte prüfen Sie Ihre Angaben und senden Sie sie erneut. | Uw aanvraag is niet opgeslagen. Controleer uw gegevens en verstuur ze opnieuw. | Votre demande n’a pas été enregistrée. Merci de vérifier vos informations et de les renvoyer. | Your enquiry was not saved. Please check your details and send them again. |
| `tk.partner.error.unknown` | Wir können gerade nicht sagen, ob Ihre Anfrage gespeichert wurde. Bitte prüfen Sie den Stand, bevor Sie sie erneut senden. Doppelt angelegt wird dabei nichts. | We kunnen nu niet zeggen of uw aanvraag is opgeslagen. Controleer de status voordat u haar opnieuw verstuurt. Er wordt daarbij niets dubbel aangemaakt. | Nous ne pouvons pas dire pour l’instant si votre demande a été enregistrée. Merci de vérifier son état avant de la renvoyer. Rien ne sera créé en double. | We cannot tell right now whether your enquiry was saved. Please check its status before sending it again. Nothing will be created twice. |
| `tk.partner.error.check` | Stand prüfen | Status controleren | Vérifier l’état | Check status |
| `tk.partner.error.unavailable` | Das Formular ist gerade nicht erreichbar. Ihre Eingaben sind noch da. Bitte versuchen Sie es später erneut oder schreiben Sie an mail@nexifyai.cloud. | Het formulier is nu niet bereikbaar. Uw invoer staat er nog. Probeer het later opnieuw of schrijf naar mail@nexifyai.cloud. | Le formulaire n’est pas disponible pour le moment. Votre saisie est toujours là. Merci de réessayer plus tard ou d’écrire à mail@nexifyai.cloud. | The form is not available right now. What you entered is still here. Please try again later or write to mail@nexifyai.cloud. |

---

## Werkstattanfrage eines Kunden

Seite `/teileklar/werkstatt/{{id}}`. Der Kunde fragt bei einem Betrieb aus dem Verzeichnis an.

Der Bestand sagt nach dem Absenden: „Ein Termin entsteht erst, wenn die Werkstatt ihn bestätigt.“ Das legt nahe, die Werkstatt habe die Anfrage erhalten. Das trifft heute nicht zu (`02-shop-werkstatt.md`, R-3). Die folgenden Texte machen keine Zusage, die es nicht gibt.

### `tk.request.before`
Zweck: Hinweis über dem Formular. Klärt vorab, was eine Anfrage ist · Richtwert: ≤ 230 Zeichen · Quelle: Seite `tk-workshop` („Ein Kontakt ist noch kein Termin“; Verzeichnisangaben sind keine Partnerschaft)

| | Text |
|---|---|
| DE | {{werkstatt}} ist ein Betrieb aus unserem Verzeichnis und kein Vertragspartner von TEILEKLAR. Ihre Anfrage ist noch kein Termin. Umfang, Preis und Termin bestätigt allein der Betrieb. |
| NL | {{werkstatt}} is een bedrijf uit ons overzicht en geen contractpartner van TEILEKLAR. Uw aanvraag is nog geen afspraak. Omvang, prijs en afspraak bevestigt alleen het bedrijf. |
| FR | {{werkstatt}} est un atelier de notre annuaire et non un partenaire contractuel de TEILEKLAR. Votre demande n’est pas encore un rendez-vous. Seul l’atelier confirme le périmètre, le prix et la date. |
| EN | {{werkstatt}} is a workshop from our directory, not a contractual partner of TEILEKLAR. Your enquiry is not yet an appointment. Scope, price and date are confirmed by the workshop alone. |

### `tk.request.sent`
Zweck: Bestätigung auf der Seite – **Fassung für den heutigen Stand**. Sagt offen, dass der Betrieb die Anfrage nicht von TEILEKLAR erhalten hat, und nennt die Handlung, die wirklich zum Termin führt · Richtwert: Titel ≤ 45, Text ≤ 300 Zeichen · Quelle: `WorkshopDetail.tsx` (Erfolgstext); `02-shop-werkstatt.md`, Abschnitt 4.2 und R-3

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.request.sent.title` | Ihre Anfrage ist bei TEILEKLAR gespeichert. | Uw aanvraag is bij TEILEKLAR opgeslagen. | Votre demande est enregistrée chez TEILEKLAR. | Your enquiry has been saved with TEILEKLAR. |
| `tk.request.sent.body` | Vorgang {{vorgang}}. An {{werkstatt}} ist sie damit noch nicht übermittelt, und ein Termin ist nicht vereinbart. Wenn Sie einen Termin brauchen, wenden Sie sich bitte direkt an den Betrieb; die Kontaktdaten stehen auf dieser Seite. | Dossier {{vorgang}}. Daarmee is ze nog niet aan {{werkstatt}} doorgegeven, en er is geen afspraak gemaakt. Heeft u een afspraak nodig, neem dan rechtstreeks contact op met het bedrijf; de contactgegevens staan op deze pagina. | Dossier {{vorgang}}. Elle n’est pas encore transmise à {{werkstatt}} et aucun rendez-vous n’est fixé. Si vous avez besoin d’un rendez-vous, adressez-vous directement à l’atelier ; ses coordonnées figurent sur cette page. | Reference {{vorgang}}. It has not yet been passed to {{werkstatt}}, and no appointment has been made. If you need an appointment, please contact the workshop directly; its contact details are on this page. |

### `tk.request.sent.forwarded`
Zweck: Bestätigung auf der Seite – **Fassung für den Stand nach Paket W1-09**. Erst verwenden, wenn TEILEKLAR die Anfrage nachweislich prüft und weitergibt · Richtwert: wie oben · Quelle: `02-shop-werkstatt.md`, Paket W-03 („wird von TEILEKLAR an den Betrieb weitergegeben/geprüft je nach tatsächlichem Weg“)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.request.sent.forwarded.title` | Ihre Anfrage ist bei TEILEKLAR eingegangen. | Uw aanvraag is bij TEILEKLAR binnengekomen. | Votre demande est bien arrivée chez TEILEKLAR. | TEILEKLAR has received your enquiry. |
| `tk.request.sent.forwarded.body` | Vorgang {{vorgang}}. Wir prüfen Ihre Angaben und geben die Anfrage an {{werkstatt}} weiter. Ein Termin ist das noch nicht: Ob und wann der Betrieb die Arbeit übernimmt, bestätigt er selbst. | Dossier {{vorgang}}. We controleren uw gegevens en geven de aanvraag door aan {{werkstatt}}. Een afspraak is dit nog niet: of en wanneer het bedrijf het werk aanneemt, bevestigt het zelf. | Dossier {{vorgang}}. Nous vérifions vos informations et transmettons la demande à {{werkstatt}}. Ce n’est pas encore un rendez-vous : l’atelier confirme lui-même s’il prend en charge l’intervention et à quelle date. | Reference {{vorgang}}. We check your details and pass the enquiry on to {{werkstatt}}. This is not yet an appointment: whether and when the workshop takes on the work is for the workshop to confirm. |

### `tk.request.mail`
Zweck: Eingangsmail an den Kunden – Fassung für den heutigen Stand · Richtwert: Betreff ≤ 60, Text ≤ 550 Zeichen · Quelle: `apps/shop-api/shop/mail_templates.py` (Werkstattanfrage: „Anfrage gesendet – noch kein Termin“, „Verzeichnisbetrieb, kein TEILEKLAR-Vertragspartner“); R-3. Signatur ohne Verkäuferangabe, bis EV-05 entschieden ist.

**DE**

> **Betreff:** Ihre Werkstattanfrage {{vorgang}} – gespeichert, noch kein Termin
>
> Guten Tag {{name}},
>
> wir haben Ihre Anfrage zu {{werkstatt}} gespeichert. Ihre Angaben finden Sie unten.
>
> Zwei Dinge sollten Sie wissen: {{werkstatt}} ist ein Betrieb aus unserem Verzeichnis und kein Vertragspartner von TEILEKLAR. Und die Anfrage ist dem Betrieb von uns noch nicht übermittelt worden; ein Termin ist nicht vereinbart.
>
> Wenn Sie einen Termin brauchen, wenden Sie sich bitte direkt an den Betrieb. Umfang, Preis und Termin bestätigt allein er.
>
> {{angaben}}
>
> Freundliche Grüße
> TEILEKLAR

**NL**

> **Onderwerp:** Uw werkplaatsaanvraag {{vorgang}} – opgeslagen, nog geen afspraak
>
> Goedendag {{name}},
>
> we hebben uw aanvraag voor {{werkstatt}} opgeslagen. Uw gegevens vindt u hieronder.
>
> Twee dingen moet u weten: {{werkstatt}} is een bedrijf uit ons overzicht en geen contractpartner van TEILEKLAR. En de aanvraag is door ons nog niet aan het bedrijf doorgegeven; er is geen afspraak gemaakt.
>
> Heeft u een afspraak nodig, neem dan rechtstreeks contact op met het bedrijf. Omvang, prijs en afspraak bevestigt alleen het bedrijf.
>
> {{angaben}}
>
> Met vriendelijke groet
> TEILEKLAR

**FR**

> **Objet :** Votre demande d’atelier {{vorgang}} – enregistrée, pas encore de rendez-vous
>
> Bonjour {{name}},
>
> nous avons enregistré votre demande concernant {{werkstatt}}. Vous trouverez vos informations ci-dessous.
>
> Deux points à connaître : {{werkstatt}} est un atelier de notre annuaire et non un partenaire contractuel de TEILEKLAR. Et nous n’avons pas encore transmis la demande à l’atelier ; aucun rendez-vous n’est fixé.
>
> Si vous avez besoin d’un rendez-vous, adressez-vous directement à l’atelier. Lui seul confirme le périmètre, le prix et la date.
>
> {{angaben}}
>
> Bien cordialement
> TEILEKLAR

**EN**

> **Subject:** Your workshop enquiry {{vorgang}} – saved, no appointment yet
>
> Hello {{name}},
>
> we have saved your enquiry about {{werkstatt}}. Your details are below.
>
> Two things you should know: {{werkstatt}} is a workshop from our directory, not a contractual partner of TEILEKLAR. And we have not yet passed the enquiry on to the workshop; no appointment has been made.
>
> If you need an appointment, please contact the workshop directly. Scope, price and date are confirmed by the workshop alone.
>
> {{angaben}}
>
> Kind regards
> TEILEKLAR

### `tk.request.error`
Zweck: Fehler beim Speichern · Richtwert: ≤ 130 Zeichen · Quelle: `WorkshopDetail.tsx` (`failed`)

| | Text |
|---|---|
| DE | Ihre Anfrage konnte nicht gespeichert werden. Ihre Eingaben sind noch da. Bitte versuchen Sie es erneut. |
| NL | Uw aanvraag kon niet worden opgeslagen. Uw invoer staat er nog. Probeer het opnieuw. |
| FR | Votre demande n’a pas pu être enregistrée. Votre saisie est toujours là. Merci de réessayer. |
| EN | Your enquiry could not be saved. What you entered is still here. Please try again. |

---

## Status des Partnerantrags

Vier Zustände, wie sie das Statusmodell vorsieht (`submitted`, `in_review`, `approved`, abgelehnt; `02-shop-werkstatt.md`, Paket W-06). Für Kunden heißen sie „Eingegangen“, „In Prüfung“, „Aufgenommen“ und „Nicht aufgenommen“ – das Wort „Freischaltung“ bleibt intern (D-014).

Die Texte nennen keine Frist und kein Kriterium; beides ist nicht festgelegt (`LUECKEN.md` L-14). Sie dürfen erst erscheinen, wenn das Statusmodell gebaut ist.

Richtwert: Bezeichnung ≤ 20, Titel ≤ 50, Text ≤ 260 Zeichen.

### `tk.application.submitted` – eingegangen

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.application.submitted.label` | Eingegangen | Ontvangen | Reçue | Received |
| `tk.application.submitted.title` | Ihr Antrag ist eingegangen. | Uw aanvraag is ontvangen. | Votre demande est bien reçue. | We have received your application. |
| `tk.application.submitted.body` | Vorgang {{vorgang}}. Ihre Angaben sind gespeichert und warten auf die Prüfung. Sie müssen jetzt nichts weiter tun. Eine Partnerschaft besteht damit noch nicht. | Dossier {{vorgang}}. Uw gegevens zijn opgeslagen en wachten op beoordeling. U hoeft nu niets meer te doen. Een partnerschap bestaat hiermee nog niet. | Dossier {{vorgang}}. Vos informations sont enregistrées et attendent leur examen. Vous n’avez rien d’autre à faire pour l’instant. Il n’y a pas encore de partenariat. | Reference {{vorgang}}. Your details are saved and waiting for review. There is nothing more you need to do for now. This does not yet make a partnership. |

### `tk.application.in_review` – in Prüfung

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.application.in_review.label` | In Prüfung | In beoordeling | En cours d’examen | Under review |
| `tk.application.in_review.title` | Wir prüfen Ihren Antrag. | We beoordelen uw aanvraag. | Nous examinons votre demande. | We are reviewing your application. |
| `tk.application.in_review.body` | Wir sehen uns Ihre Angaben an und gleichen sie mit dem Verzeichnis ab. Fehlt etwas, fragen wir bei Ihnen nach. Eine Partnerschaft besteht noch nicht. | We bekijken uw gegevens en vergelijken ze met het overzicht. Ontbreekt er iets, dan vragen we het bij u na. Een partnerschap bestaat nog niet. | Nous étudions vos informations et les rapprochons de l’annuaire. S’il manque quelque chose, nous revenons vers vous. Il n’y a pas encore de partenariat. | We are looking at your details and comparing them with the directory. If something is missing, we will ask you. There is no partnership yet. |

### `tk.application.approved` – freigeschaltet

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.application.approved.label` | Aufgenommen | Opgenomen | Admis | Admitted |
| `tk.application.approved.title` | Ihr Betrieb ist als Partner aufgenommen. | Uw bedrijf is als partner opgenomen. | Votre atelier est admis comme partenaire. | Your workshop has been admitted as a partner. |
| `tk.application.approved.body` | Sie können sich jetzt anmelden und Ihr Profil anlegen. Öffentlich erscheint Ihr Betrieb erst als Partner, wenn Sie das Profil selbst freigeben. | U kunt nu inloggen en uw profiel aanmaken. Uw bedrijf verschijnt pas openbaar als partner wanneer u het profiel zelf vrijgeeft. | Vous pouvez maintenant vous connecter et créer votre profil. Votre atelier n’apparaît publiquement comme partenaire qu’une fois le profil validé par vos soins. | You can now sign in and set up your profile. Your workshop only appears in public as a partner once you approve the profile yourself. |
| `tk.application.approved.action` | Profil anlegen | Profiel aanmaken | Créer le profil | Set up profile |

### `tk.application.rejected` – abgelehnt

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `tk.application.rejected.label` | Nicht aufgenommen | Niet opgenomen | Non admis | Not admitted |
| `tk.application.rejected.title` | Wir können Ihren Betrieb zurzeit nicht aufnehmen. | We kunnen uw bedrijf op dit moment niet opnemen. | Nous ne pouvons pas admettre votre atelier pour le moment. | We cannot admit your workshop at present. |
| `tk.application.rejected.body` | {{grund}} An einem bestehenden Eintrag im Verzeichnis ändert das nichts. Wenn Sie eine Frage dazu haben oder sich etwas geändert hat, schreiben Sie an mail@nexifyai.cloud und nennen Sie den Vorgang {{vorgang}}. | {{grund}} Aan een bestaande vermelding in het overzicht verandert dit niets. Heeft u hierover een vraag of is er iets gewijzigd, schrijf dan naar mail@nexifyai.cloud en vermeld dossier {{vorgang}}. | {{grund}} Cela ne change rien à une fiche existante dans l’annuaire. Pour toute question ou en cas de changement, écrivez à mail@nexifyai.cloud en indiquant le dossier {{vorgang}}. | {{grund}} This does not change an existing directory listing. If you have a question about it or something has changed, write to mail@nexifyai.cloud and quote reference {{vorgang}}. |

`{{grund}}` ist ein Satz, den die prüfende Person schreibt. Ein Katalog fester Gründe fehlt, weil die Kriterien nicht festgelegt sind (`LUECKEN.md` L-14).
