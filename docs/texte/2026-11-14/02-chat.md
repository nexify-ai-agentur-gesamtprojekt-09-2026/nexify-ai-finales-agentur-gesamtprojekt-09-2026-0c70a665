# 02 · Chat

Stand: 14.11.2026 · Entwurf · Basis: `DECISIONS.md` D-011 (voller Name), D-012 (Sie), D-014 (kein Jargon).

Gilt für den öffentlichen Chat auf den Seiten von NeXify AI (`apps/web/components/PublicOrientationChat.tsx`). Die Variante für TEILEKLAR ist nicht Teil dieser Vorlage.

Was der Chat nachweislich tut, laut Code: Er führt ein Gespräch, schlägt passende Seiten vor und erstellt auf Wunsch ein Briefing, das der Besucher in das Kontaktformular übernimmt (`apps/web/lib/chat-contract.ts`, `project-brief-transfer`). Er bucht nichts, sendet nichts von selbst und schließt keinen Vertrag. Ob er in der Produktion mit einem Modell antwortet, ist nicht nachgewiesen (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, Abschnitt 2.3 A). Die Texte versprechen deshalb nur, was der Code tut.

---

## Kopf

### `chat.header.name`
Zweck: voller Name im Kopf, auf zwei Zeilen setzbar. Ein Name, zwei Zeilen – keine Kürzung · Richtwert: Zeile 1: 12 Zeichen, Zeile 2: 37 Zeichen, fest · Quelle: D-011; `config/brand-names.json` (`zeilenumbruch`)

| Zeile | DE · NL · FR · EN |
|---|---|
| 1 | AIFly ORACLE |
| 2 | with NeXify AI Intelligence by NeXify |

Für Bildschirmleser steht der Name in einem Stück: „AIFly ORACLE with NeXify AI Intelligence by NeXify“.

### `chat.header.sub`
Zweck: sagt in drei Wörtern, wozu das Gespräch dient · Richtwert: ≤ 40 Zeichen · Quelle: `config/assistant-interface-copy.json` (`subtitle`)

| | Text |
|---|---|
| DE | Ihr Vorhaben · NeXify AI FACTORY |
| NL | Uw plan · NeXify AI FACTORY |
| FR | Votre projet · NeXify AI FACTORY |
| EN | Your project · NeXify AI FACTORY |

### `chat.header.controls`
Zweck: Bedienung des Fensters · Richtwert: ≤ 25 Zeichen · Quelle: `config/assistant-interface-copy.json` (`open`, `close`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.header.open` | Vorhaben schildern | Uw plan beschrijven | Décrire votre projet | Describe your project |
| `chat.header.close` | Gespräch einklappen | Gesprek inklappen | Réduire la conversation | Minimise conversation |

---

## Begrüßung

### `chat.greeting`
Zweck: Vorstellung mit vollem Namen. Der Besucher weiß, mit wem er spricht · Richtwert: ≤ 120 Zeichen · Quelle: D-011; `apps/web/lib/chat-guidance.ts` (Identität, wahrheitsgemäße Auskunft). Die Selbstbezeichnung als KI-System steht im Code; ob sie in der Begrüßung sichtbar bleibt, hängt an EV-08 (`LUECKEN.md` L-05).

| | Text |
|---|---|
| DE | Guten Tag. Ich bin AIFly ORACLE with NeXify AI Intelligence by NeXify, das KI-System von NeXify AI. |
| NL | Goedendag. Ik ben AIFly ORACLE with NeXify AI Intelligence by NeXify, het AI-systeem van NeXify AI. |
| FR | Bonjour. Je suis AIFly ORACLE with NeXify AI Intelligence by NeXify, le système d’IA de NeXify AI. |
| EN | Hello. I am AIFly ORACLE with NeXify AI Intelligence by NeXify, the AI system of NeXify AI. |

### `chat.intro`
Zweck: Einleitung. Sagt, was das Gespräch leistet und wohin es führt · Richtwert: ≤ 230 Zeichen · Quelle: `PublicOrientationChat.tsx` (`copy.de.intro`); Briefing-Übergabe laut `chat-contract.ts`

| | Text |
|---|---|
| DE | Erzählen Sie mir von Ihrem Unternehmen und von dem, was Sie vorhaben. Ich helfe Ihnen, die passende Leistung zu finden. Wenn Sie möchten, fasse ich Ihr Anliegen als Briefing für Ihr Gespräch mit Pascal zusammen. |
| NL | Vertel me over uw bedrijf en over wat u van plan bent. Ik help u de passende dienst te vinden. Als u wilt, vat ik uw vraag samen in een briefing voor uw gesprek met Pascal. |
| FR | Parlez-moi de votre entreprise et de ce que vous envisagez. Je vous aide à trouver la prestation adaptée. Si vous le souhaitez, je résume votre demande dans un briefing pour votre échange avec Pascal. |
| EN | Tell me about your business and what you have in mind. I will help you find the right service. If you like, I will sum up your request as a brief for your conversation with Pascal. |

### `chat.question`
Zweck: Überschrift über dem leeren Gespräch · Richtwert: ≤ 25 Zeichen · Quelle: `PublicOrientationChat.tsx` (`copy.de.title`)

| | Text |
|---|---|
| DE | Was planen Sie? |
| NL | Wat bent u van plan? |
| FR | Quel est votre projet ? |
| EN | What are you planning? |

---

## Drei Einstiege

Jeder Einstieg: Beschriftung · Sachzeile · Text, der in das Eingabefeld gesetzt wird. Quelle: `PublicOrientationChat.tsx` (`starters.de.nexify`); Leistungsfelder aus `config/site-map.json` (Seite `services`).

Richtwert: Beschriftung ≤ 25, Sachzeile ≤ 45, Vorgabe ≤ 70 Zeichen.

### `chat.starter.1`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.starter.1.label` | Marke & Website | Merk & website | Marque et site web | Brand & website |
| `chat.starter.1.fact` | Auftritt, Texte und Gestaltung | Uitstraling, teksten en vormgeving | Image, textes et design | Presence, copy and design |
| `chat.starter.1.prefill` | Ich möchte meinen Markenauftritt und meine Website entwickeln: | Ik wil mijn merkuitstraling en website ontwikkelen: | Je souhaite développer ma marque et mon site web : | I would like to develop my brand and website: |

### `chat.starter.2`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.starter.2.label` | Abläufe & KI | Processen & AI | Processus et IA | Processes & AI |
| `chat.starter.2.fact` | Ein Vorgang, der jeden Tag Zeit kostet | Een handeling die elke dag tijd kost | Une tâche qui prend du temps chaque jour | A task that takes time every day |
| `chat.starter.2.prefill` | Diesen Ablauf möchte ich einfacher machen: | Dit proces wil ik eenvoudiger maken: | Je souhaite simplifier ce processus : | I would like to simplify this process: |

### `chat.starter.3`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.starter.3.label` | Sichtbarkeit & Kampagne | Zichtbaarheid & campagne | Visibilité et campagne | Visibility & campaign |
| `chat.starter.3.fact` | Gefunden werden, wo Ihre Kunden suchen | Gevonden worden waar uw klanten zoeken | Être trouvé là où vos clients cherchent | Be found where your customers look |
| `chat.starter.3.prefill` | Diese Kunden möchte ich erreichen: | Deze klanten wil ik bereiken: | Je souhaite atteindre ces clients : | I would like to reach these customers: |

---

## Der Weg in drei Schritten

### `chat.path`
Zweck: zeigt, was im Gespräch geschieht und dass der Besucher über das Senden entscheidet · Richtwert: Titel ≤ 30, Text ≤ 90 Zeichen · Quelle: Ablauf laut `PublicOrientationChat.tsx` (`brief`, `saveOracleBrief`) und `ContactRequestForm.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.path.title` | So läuft das Gespräch | Zo verloopt het gesprek | Comment se déroule l’échange | How the conversation works |
| `chat.path.1.title` | Sie schildern Ihr Vorhaben. | U beschrijft uw plan. | Vous décrivez votre projet. | You describe your project. |
| `chat.path.1.body` | Ein paar Sätze genügen. Unterlagen brauchen Sie dafür nicht. | Een paar zinnen volstaan. Documenten heeft u daarvoor niet nodig. | Quelques phrases suffisent. Aucun document n’est nécessaire. | A few sentences are enough. You do not need any documents. |
| `chat.path.2.title` | Ich frage nach und ordne. | Ik vraag door en breng orde aan. | Je pose des questions et je mets en ordre. | I ask questions and put things in order. |
| `chat.path.2.body` | Ziel, Ausgangslage und offene Fragen stehen am Ende in einem Briefing. | Doel, uitgangssituatie en open vragen staan aan het eind in een briefing. | Objectif, situation de départ et questions ouvertes figurent à la fin dans un briefing. | Goal, starting point and open questions end up in one brief. |
| `chat.path.3.title` | Sie senden das Briefing an Pascal. | U stuurt de briefing naar Pascal. | Vous envoyez le briefing à Pascal. | You send the brief to Pascal. |
| `chat.path.3.body` | Erst dann erhält Pascal es. Vorher lesen und ändern Sie es. | Pas dan ontvangt Pascal de briefing. Eerst leest en wijzigt u hem. | Ce n’est qu’alors que Pascal le reçoit. Vous le relisez et le modifiez avant. | Only then does Pascal receive it. You read and edit it first. |

---

## Eingabe

### `chat.input`
Zweck: Feld, Platzhalter, Schaltflächen · Richtwert: Platzhalter ≤ 55, Schaltfläche ≤ 20 Zeichen · Quelle: `PublicOrientationChat.tsx` (`label`, `placeholder`, `send`, `stop`, `counter`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.input.label` | Ihr Vorhaben | Uw plan | Votre projet | Your project |
| `chat.input.placeholder` | Zum Beispiel: Ich möchte meine Website erneuern … | Bijvoorbeeld: ik wil mijn website vernieuwen … | Par exemple : je souhaite refaire mon site … | For example: I would like to renew my website … |
| `chat.input.reply` | Ihre Antwort … | Uw antwoord … | Votre réponse … | Your reply … |
| `chat.input.send` | Nachricht senden | Bericht versturen | Envoyer le message | Send message |
| `chat.input.stop` | Antwort anhalten | Antwoord onderbreken | Interrompre la réponse | Stop reply |
| `chat.input.counter` | {{anzahl}} von {{max}} Zeichen | {{anzahl}} van {{max}} tekens | {{anzahl}} sur {{max}} caractères | {{anzahl}} of {{max}} characters |

### `chat.hint`
Zweck: Hinweiszeile unter dem Feld. Sachlich, mit Verweis auf die Datenschutzseite · Richtwert: ≤ 70 Zeichen · Quelle: `PublicOrientationChat.tsx` (`privacy`, `ComposerNote`); D-010

| | Text |
|---|---|
| DE | Bitte geben Sie keine Passwörter oder Zahlungsdaten ein. Datenschutz |
| NL | Voer geen wachtwoorden of betaalgegevens in. Privacy |
| FR | Merci de ne saisir ni mot de passe ni données de paiement. Confidentialité |
| EN | Please do not enter passwords or payment details. Privacy |

Das letzte Wort ist der Verweis auf die Datenschutzseite.

### `chat.keys`
Zweck: Tastaturhinweis für Bildschirmleser · Richtwert: ≤ 90 Zeichen · Quelle: `PublicOrientationChat.tsx` (`keys`)

| | Text |
|---|---|
| DE | Die Eingabetaste sendet. Umschalt- und Eingabetaste beginnen eine neue Zeile. |
| NL | Enter verstuurt. Shift en Enter beginnen een nieuwe regel. |
| FR | Entrée envoie. Maj et Entrée commencent une nouvelle ligne. |
| EN | Enter sends. Shift and Enter start a new line. |

---

## Zustände

### `chat.loading`
Zweck: Ladezustand, während die Antwort entsteht. Ohne Namen, damit keine Kurzform nötig wird · Richtwert: ≤ 35 Zeichen · Quelle: `PublicOrientationChat.tsx` (`thinking`, `waiting`); D-011

| | Text |
|---|---|
| DE | Die Antwort wird geschrieben … |
| NL | Het antwoord wordt geschreven … |
| FR | La réponse est en cours de rédaction … |
| EN | Writing the reply … |

### `chat.stopped`
Zweck: Bestätigung nach „Antwort anhalten“ · Richtwert: ≤ 25 Zeichen · Quelle: `PublicOrientationChat.tsx` (`stopped`)

| | Text |
|---|---|
| DE | Antwort angehalten. |
| NL | Antwoord onderbroken. |
| FR | Réponse interrompue. |
| EN | Reply stopped. |

### `chat.speaker`
Zweck: Sprecherzeile über jeder Nachricht · Richtwert: fest · Quelle: `PublicOrientationChat.tsx` (`you`, `assistant`); D-011. Über den Antworten steht der volle Name. Passt er dort nicht, bleibt die Zeile ohne Namen; die Kürzungsregel ist offen (`LUECKEN.md` L-03).

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.speaker.you` | Sie | U | Vous | You |
| `chat.speaker.system` | AIFly ORACLE with NeXify AI Intelligence by NeXify | AIFly ORACLE with NeXify AI Intelligence by NeXify | AIFly ORACLE with NeXify AI Intelligence by NeXify | AIFly ORACLE with NeXify AI Intelligence by NeXify |

---

## Fehler

Drei Fälle, drei Texte. Jeder sagt, was geschehen ist, was mit der Nachricht ist und was der Besucher tun kann.

### `chat.error.retry`
Zweck: Fehler, bei dem ein neuer Versuch helfen kann · Richtwert: ≤ 130 Zeichen · Quelle: `PublicOrientationChat.tsx` (`failed`, `retry`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.error.retry.text` | Die Antwort konnte gerade nicht geladen werden. Ihre Nachricht ist noch da. Bitte versuchen Sie es noch einmal. | Het antwoord kon nu niet worden geladen. Uw bericht staat er nog. Probeer het alstublieft opnieuw. | La réponse n’a pas pu être chargée. Votre message est toujours là. Merci de réessayer. | The reply could not be loaded just now. Your message is still here. Please try again. |
| `chat.error.retry.action` | Erneut versuchen | Opnieuw proberen | Réessayer | Try again |

### `chat.error.final`
Zweck: Fehler, bei dem ein neuer Versuch nicht hilft. Führt zum Kontakt · Richtwert: ≤ 160 Zeichen · Quelle: `PublicOrientationChat.tsx` (`error`, `contact`); Kontaktadresse D-011

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.error.final.text` | Diese Nachricht konnte nicht verarbeitet werden. Ein neuer Versuch hilft hier nicht. Ihre Eingabe bleibt stehen. Schreiben Sie Pascal bitte direkt. | Dit bericht kon niet worden verwerkt. Opnieuw proberen helpt hier niet. Uw invoer blijft staan. Schrijf Pascal alstublieft rechtstreeks. | Ce message n’a pas pu être traité. Une nouvelle tentative n’y changera rien. Votre saisie est conservée. Merci d’écrire directement à Pascal. | This message could not be processed. Trying again will not help here. Your text is kept. Please write to Pascal directly. |
| `chat.error.final.action` | Pascal schreiben | Pascal schrijven | Écrire à Pascal | Write to Pascal |
| `chat.error.final.address` | mail@nexifyai.cloud | mail@nexifyai.cloud | mail@nexifyai.cloud | mail@nexifyai.cloud |

### `chat.error.limit`
Zweck: Limit erreicht, mit Wartezeit. `{{wartezeit}}` füllt die Anwendung aus der Serverantwort, etwa „1 Minute“ · Richtwert: ≤ 140 Zeichen · Quelle: `PublicOrientationChat.tsx` (`limited`); `apps/web/lib/chat-client.ts` (`retryAfterSeconds`)

| | Text |
|---|---|
| DE | Gerade gehen sehr viele Nachrichten ein. Bitte versuchen Sie es in {{wartezeit}} noch einmal. Ihre Nachricht bleibt so lange stehen. |
| NL | Er komen nu erg veel berichten binnen. Probeer het over {{wartezeit}} opnieuw. Uw bericht blijft zolang staan. |
| FR | De très nombreux messages arrivent en ce moment. Merci de réessayer dans {{wartezeit}}. Votre message est conservé d’ici là. |
| EN | A lot of messages are coming in right now. Please try again in {{wartezeit}}. Your message will stay here until then. |

### `chat.error.length`
Zweck: Nachricht zu lang · Richtwert: ≤ 90 Zeichen · Quelle: Zeichenzähler in `PublicOrientationChat.tsx` (`counter`)

| | Text |
|---|---|
| DE | Ihre Nachricht ist zu lang. Bitte kürzen Sie sie auf höchstens {{max}} Zeichen. |
| NL | Uw bericht is te lang. Kort het in tot hoogstens {{max}} tekens. |
| FR | Votre message est trop long. Merci de le réduire à {{max}} caractères au maximum. |
| EN | Your message is too long. Please shorten it to no more than {{max}} characters. |

---

## Rückfall: Gespräch gerade nicht erreichbar

Ersetzt die bisherige Zeile „Orientierung anhand der Website · ohne Live-KI“ und die Texte „Website-Beratung ohne Live-KI“ (`PublicOrientationChat.tsx`, `apps/web/lib/static-orientation.ts`, `packages/agent-runtime/public-orientation.ts`). Eine ruhige Aussage, eine klare Handlung.

### `chat.fallback.title`
Zweck: sagt den Zustand in einem Satz · Richtwert: ≤ 45 Zeichen · Quelle: `PublicOrientationChat.tsx` (`unavailable`); D-014

| | Text |
|---|---|
| DE | Das Gespräch ist gerade nicht erreichbar. |
| NL | Het gesprek is nu niet bereikbaar. |
| FR | La conversation n’est pas disponible pour le moment. |
| EN | The conversation is not available right now. |

### `chat.fallback.body`
Zweck: beruhigt und führt zum Kontakt. Keine Zusage zur Antwortzeit · Richtwert: ≤ 150 Zeichen · Quelle: `PublicOrientationChat.tsx` (`unavailable`); `static-orientation.ts` (die Eingabe bleibt erhalten)

| | Text |
|---|---|
| DE | Ihre Nachricht ist noch da. Schreiben Sie Pascal direkt – am einfachsten mit dem, was Sie schon geschrieben haben. |
| NL | Uw bericht staat er nog. Schrijf Pascal rechtstreeks – het eenvoudigst met wat u al heeft geschreven. |
| FR | Votre message est toujours là. Écrivez directement à Pascal – le plus simple est de reprendre ce que vous avez déjà rédigé. |
| EN | Your message is still here. Write to Pascal directly – the easiest way is to use what you have already written. |

### `chat.fallback.actions`
Zweck: Haupthandlung zum Kontakt, daneben der neue Versuch · Richtwert: ≤ 35 Zeichen · Quelle: `PublicOrientationChat.tsx` (`contact`, `retry`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.fallback.primary` | Mit dieser Nachricht an Pascal schreiben | Met dit bericht aan Pascal schrijven | Écrire à Pascal avec ce message | Write to Pascal with this message |
| `chat.fallback.secondary` | Erneut versuchen | Opnieuw proberen | Réessayer | Try again |

### `chat.fallback.pages`
Zweck: Vorzeile, falls im Rückfall passende Seiten angezeigt werden · Richtwert: ≤ 45 Zeichen · Quelle: `static-orientation.ts` (Seitenvorschläge aus den Inhalten der Website)

| | Text |
|---|---|
| DE | Diese Seiten passen zu Ihrer Frage: |
| NL | Deze pagina’s passen bij uw vraag: |
| FR | Ces pages correspondent à votre question : |
| EN | These pages match your question: |

---

## Neues Gespräch

### `chat.restart`
Zweck: beginnt von vorn · Richtwert: Schaltfläche ≤ 20, Rückfrage ≤ 90 Zeichen · Quelle: `PublicOrientationChat.tsx` (`restart`). Ob die Anwendung eine Rückfrage zeigt, ist im Code nicht belegt; der Text ist für diesen Fall vorbereitet.

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.restart.action` | Neues Gespräch | Nieuw gesprek | Nouvelle conversation | New conversation |
| `chat.restart.confirm` | Neues Gespräch beginnen? Der bisherige Verlauf wird hier ausgeblendet. | Nieuw gesprek beginnen? Het gesprek tot nu toe wordt hier verborgen. | Commencer une nouvelle conversation ? L’échange actuel ne sera plus affiché ici. | Start a new conversation? The current one will no longer be shown here. |
| `chat.restart.yes` | Neu beginnen | Opnieuw beginnen | Recommencer | Start again |
| `chat.restart.no` | Weiter im Gespräch | Verder met dit gesprek | Poursuivre la conversation | Stay in this conversation |

---

## Briefing-Entwurf

### `chat.brief.action`
Zweck: Schaltfläche und der Satz, der dafür in das Gespräch gesetzt wird · Richtwert: ≤ 70 Zeichen · Quelle: `PublicOrientationChat.tsx` (`brief`, `briefRequest`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.brief.button` | Briefing erstellen | Briefing maken | Créer le briefing | Create brief |
| `chat.brief.request` | Bitte fassen Sie mein Vorhaben jetzt als Briefing zusammen. | Vat mijn plan nu alstublieft samen in een briefing. | Merci de résumer maintenant mon projet sous forme de briefing. | Please sum up my project as a brief now. |

### `chat.brief.card`
Zweck: Karte mit dem Entwurf. Stellt klar: Es ist ein Entwurf, und der Besucher sendet ihn selbst · Richtwert: Titel ≤ 30, Text ≤ 170 Zeichen · Quelle: `apps/web/lib/chat-contract.ts` (`BriefingDTO`: bearbeitbarer Klartext für das Kontaktformular, höchstens 4.000 Zeichen)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.brief.card.title` | Ihr Briefing – Entwurf | Uw briefing – concept | Votre briefing – projet | Your brief – draft |
| `chat.brief.card.body` | Bitte lesen Sie den Entwurf und ergänzen Sie, was fehlt. Er geht erst an Pascal, wenn Sie ihn im Kontaktformular senden. | Lees het concept en vul aan wat ontbreekt. Het gaat pas naar Pascal wanneer u het via het contactformulier verstuurt. | Merci de relire ce projet et de compléter ce qui manque. Il ne parvient à Pascal que lorsque vous l’envoyez depuis le formulaire de contact. | Please read the draft and add what is missing. It only reaches Pascal once you send it through the contact form. |
| `chat.brief.card.primary` | Briefing ins Kontaktformular übernehmen | Briefing naar het contactformulier overnemen | Reprendre le briefing dans le formulaire de contact | Take the brief to the contact form |
| `chat.brief.card.secondary` | Weiter im Gespräch | Verder met dit gesprek | Poursuivre la conversation | Stay in this conversation |
| `chat.brief.card.limit` | Das Briefing fasst höchstens 4.000 Zeichen. | De briefing bevat hoogstens 4.000 tekens. | Le briefing compte 4 000 caractères au maximum. | The brief holds up to 4,000 characters. |

### `chat.brief.sections`
Zweck: Zwischenüberschriften im Briefing · Richtwert: ≤ 25 Zeichen · Quelle: Gesprächsführung in `apps/web/lib/chat-guidance.ts` (Ziel, Ausgangslage, offene Fragen); die genauen Felder legt die Umsetzung anhand von `BriefingDataDTO` fest

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `chat.brief.sections.company` | Ihr Unternehmen | Uw bedrijf | Votre entreprise | Your business |
| `chat.brief.sections.project` | Ihr Vorhaben | Uw plan | Votre projet | Your project |
| `chat.brief.sections.goal` | Ziel | Doel | Objectif | Goal |
| `chat.brief.sections.start` | Ausgangslage | Uitgangssituatie | Situation de départ | Starting point |
| `chat.brief.sections.open` | Offene Fragen | Open vragen | Questions ouvertes | Open questions |

---

## KI-Kennzeichnung

Stand der Entscheidung: `DECISIONS.md` D-010 hat sichtbare KI-Kennzeichnungen aus dem öffentlichen Chat entfernt; `AGENTS.md` verlangt sie weiter; die Frage ist je Kanal offen (EV-08). Diese Bausteine liegen bereit, damit sie ohne neue Textarbeit eingesetzt werden können. Ob und wo sie erscheinen, entscheidet der Inhaber nach rechtlicher Prüfung (`LUECKEN.md` L-05).

### `chat.ai.notice`
Zweck: sachliche Kennzeichnung. Sagt, dass ein KI-Modell antwortet und dass Angaben zu prüfen sind · Richtwert: ≤ 110 Zeichen · Quelle: `AGENTS.md` („KI-Kennzeichnung“); `chat-guidance.ts` (wahrheitsgemäße Auskunft)

| | Text |
|---|---|
| DE | Hier antwortet ein KI-Modell. Bitte prüfen Sie Angaben, bevor Sie sie verwenden. |
| NL | Hier antwoordt een AI-model. Controleer gegevens voordat u ze gebruikt. |
| FR | Un modèle d’IA vous répond ici. Merci de vérifier les informations avant de les utiliser. |
| EN | An AI model is replying here. Please check any information before you rely on it. |

### `chat.ai.data`
Zweck: Hinweis zum Datenweg. **Rechtlich zu prüfen.** Der Empfänger wird nicht benannt; `{{datenempfaenger}}` ist ein Platzhalter, den erst die geprüfte Fassung füllt · Richtwert: ≤ 120 Zeichen · Quelle: D-010 (Besuchernachrichten gehen an Router und Modell); der Bestand nennt einen Empfänger, der dem tatsächlichen Datenweg nicht entspricht (`config/assistant-interface-copy.json`, `chatgptNote`) – siehe `LUECKEN.md` L-06

| | Text |
|---|---|
| DE | Ihre Nachrichten werden zur Beantwortung an {{datenempfaenger}} übermittelt. Mehr dazu unter Datenschutz. |
| NL | Uw berichten worden voor de beantwoording doorgegeven aan {{datenempfaenger}}. Meer hierover onder Privacy. |
| FR | Vos messages sont transmis à {{datenempfaenger}} pour y répondre. Pour en savoir plus : Confidentialité. |
| EN | Your messages are passed to {{datenempfaenger}} so that they can be answered. More under Privacy. |

### `chat.ai.self`
Zweck: Antwort auf die Frage „Spreche ich mit einem Menschen?“ · Richtwert: ≤ 200 Zeichen · Quelle: `chat-guidance.ts` (das System gibt sich nicht als Mensch aus); D-010 („Was bewusst bleibt“)

| | Text |
|---|---|
| DE | Nein. Ich bin ein KI-System und kein Mensch. Ich helfe Ihnen, Ihr Vorhaben zu ordnen. Entscheidungen, Angebote und Zusagen kommen von Pascal Courbois. |
| NL | Nee. Ik ben een AI-systeem en geen mens. Ik help u uw plan te ordenen. Beslissingen, offertes en toezeggingen komen van Pascal Courbois. |
| FR | Non. Je suis un système d’IA et non une personne. Je vous aide à structurer votre projet. Les décisions, les offres et les engagements viennent de Pascal Courbois. |
| EN | No. I am an AI system, not a person. I help you put your project in order. Decisions, proposals and commitments come from Pascal Courbois. |

### `chat.ai.limits`
Zweck: sagt, was das Gespräch nicht tut · Richtwert: ≤ 110 Zeichen · Quelle: `config/site-map.json` Seite `aifly-oracle` („schließt keine Verträge, bucht keine Termine und löst keine Zahlungen aus“)

| | Text |
|---|---|
| DE | In diesem Gespräch wird nichts gebucht, bestellt oder vertraglich vereinbart. |
| NL | In dit gesprek wordt niets geboekt, besteld of contractueel vastgelegd. |
| FR | Rien n’est réservé, commandé ni convenu par contrat dans cette conversation. |
| EN | Nothing is booked, ordered or contractually agreed in this conversation. |

---

## Fuß des Chats

### `chat.footer.claim`
Zweck: Claim · Richtwert: fest · Quelle: `config/assistant-interface-copy.json` (`footer`); D-011

| | Text |
|---|---|
| DE · NL · FR · EN | Chat it. Automate it. |
