# 04 · Konto

Stand: 14.11.2026 · Entwurf · Basis: `DECISIONS.md` D-007 (eigene Konten), D-012 (Sie), D-014 (kein Jargon).

Was belegt ist, laut Code und Entscheidung: Konto mit E-Mail-Adresse und Passwort; das Passwort hat mindestens 10 Zeichen und wird nicht im Klartext gespeichert; Sperre nach 5 Fehlversuchen in 15 Minuten; Fehlertext „E-Mail oder Passwort ist falsch“; Link zum Zurücksetzen 60 Minuten gültig und nur einmal verwendbar, danach sind alle Geräte abgemeldet (`DECISIONS.md` D-007; `apps/web/components/shop/AuthForms.tsx`; `docs/konzept/2026-11-14/03-suite-saas.md`, Abschnitt 1.1 und 1.2). Die E-Mail-Bestätigung verlangt `config/selfservice-policy.json`; sie wird gerade gebaut und ist noch nicht ausgeliefert. Die Texte dafür liegen hier bereit.

Zahlen in dieser Datei stammen aus diesen Quellen. `{{gueltigkeit}}` steht dort, wo die Dauer noch nicht feststeht.

---

## Bühne: Was Ihr Zugang umfasst

Die Bühne steht neben den Formularen für Registrieren und Anmelden. Sie nennt nur, was belegt ist. Eine Liste der Funktionen fehlt, weil keine freigegeben ist (`LUECKEN.md` L-07).

### `account.stage.title`
Zweck: Überschrift der Bühne · Richtwert: ≤ 30 Zeichen · Quelle: Auftrag 14.11.2026

| | Text |
|---|---|
| DE | Was Ihr Zugang umfasst |
| NL | Wat uw toegang omvat |
| FR | Ce que comprend votre accès |
| EN | What your access includes |

### `account.stage.points`
Zweck: vier belegte Aussagen, jede mit Titel und einem Satz · Richtwert: Titel ≤ 35, Text ≤ 150 Zeichen · Quelle: siehe Spalte

| Kennung | DE | NL | FR | EN | Quelle |
|---|---|---|---|---|---|
| `account.stage.point.1.title` | Ein Konto, Ihr Bereich | Eén account, uw omgeving | Un compte, votre espace | One account, your area | `config/site-map.json` Seite `login` |
| `account.stage.point.1.body` | Nach der Anmeldung öffnet sich Ihr Kundenbereich. Ein Konto allein gibt keinen Zugriff auf Bereiche anderer Kunden oder auf die Verwaltung. | Na het inloggen opent uw klantomgeving. Een account alleen geeft geen toegang tot omgevingen van andere klanten of tot het beheer. | Après connexion, votre espace client s’ouvre. Un compte ne donne à lui seul accès ni aux espaces d’autres clients ni à l’administration. | After you sign in, your customer area opens. An account on its own gives no access to other customers’ areas or to administration. | `AuthForms.tsx` (Weiterleitung), Seite `login`. Vor Verwendung gegen den Stand der Trennung prüfen (`00-gesamtkonzept.md`, R-06). |
| `account.stage.point.2.title` | Ihr Passwort bleibt bei Ihnen | Uw wachtwoord blijft van u | Votre mot de passe reste le vôtre | Your password stays yours | D-007 |
| `account.stage.point.2.body` | Wir speichern Ihr Passwort nicht im Klartext und fragen nie per E-Mail oder im Chat danach. | We slaan uw wachtwoord niet als leesbare tekst op en vragen er nooit naar per e-mail of in de chat. | Nous n’enregistrons pas votre mot de passe en clair et ne vous le demandons jamais par e-mail ni dans le chat. | We do not store your password in plain text and never ask for it by email or in the chat. | D-007 (bcrypt); `02-chat.md` `chat.hint` |
| `account.stage.point.3.title` | Die Suite testen, wenn Sie so weit sind | De suite testen wanneer u er klaar voor bent | Tester la suite quand vous êtes prêt | Try the suite when you are ready | Seite `signup`; `config/selfservice-policy.json` |
| `account.stage.point.3.body` | Der Test der NeX & AIFly ORACLE Suite läuft einmalig 24 Stunden. Er beginnt erst, wenn Sie ihn starten; ein erneutes Anmelden verlängert ihn nicht. | De test van de NeX & AIFly ORACLE Suite loopt eenmalig 24 uur. Hij begint pas wanneer u hem start; opnieuw inloggen verlengt hem niet. | L’essai de la NeX & AIFly ORACLE Suite dure 24 heures, une seule fois. Il ne commence que lorsque vous le lancez ; une nouvelle connexion ne le prolonge pas. | The trial of the NeX & AIFly ORACLE Suite runs once, for 24 hours. It only begins when you start it; signing in again does not extend it. | Seiten `signup`, `login` |
| `account.stage.point.4.title` | Fragen klärt Pascal | Vragen beantwoordt Pascal | Pascal répond à vos questions | Pascal answers your questions | Seite `login` |
| `account.stage.point.4.body` | Wenn etwas an Ihrem Zugang nicht stimmt, schreiben Sie an mail@nexifyai.cloud. Nennen Sie den Bereich und die Meldung, die Sie sehen. | Klopt er iets niet aan uw toegang, schrijf dan naar mail@nexifyai.cloud. Vermeld de omgeving en de melding die u ziet. | Si quelque chose ne va pas avec votre accès, écrivez à mail@nexifyai.cloud. Indiquez l’espace concerné et le message affiché. | If something is wrong with your access, write to mail@nexifyai.cloud. Tell us the area and the message you see. | Seite `login` („Zugangsfragen persönlich lösen“) |

### `account.stage.functions`
LÜCKE: braucht Entscheidung „Was ist heute tatsächlich nutzbar?“ (B01 Abschnitt 4.1 Nr. 11) und EV-11. Kein Punkt zu Chat, Übersicht, Anbindungen oder Abo. Siehe `LUECKEN.md` L-07.

### `account.stage.terms`
LÜCKE: braucht Entscheidung EV-07 (Vertragsgrundlagen, Datenschutz) und EV-10 (Kundenkreis). Die Zeile „Mit der Registrierung stimmen Sie … zu“ lässt sich erst schreiben, wenn die Texte existieren, denen zugestimmt wird. Siehe `LUECKEN.md` L-12.

---

## Registrieren

### `account.signup.head`
Zweck: Überschrift und Unterzeile der Seite · Richtwert: Titel ≤ 25, Unterzeile ≤ 110 Zeichen · Quelle: `AuthForms.tsx` (`TITLES`); Seite `signup`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.signup.title` | Konto erstellen | Account aanmaken | Créer un compte | Create account |
| `account.signup.sub` | Sie brauchen eine E-Mail-Adresse und ein Passwort. Danach bestätigen Sie Ihre Adresse über einen Link. | U heeft een e-mailadres en een wachtwoord nodig. Daarna bevestigt u uw adres via een link. | Il vous faut une adresse e-mail et un mot de passe. Vous confirmez ensuite votre adresse par un lien. | You need an email address and a password. You then confirm your address through a link. |

### `account.signup.fields`
Zweck: Feldbeschriftungen und Hilfen · Richtwert: Beschriftung ≤ 20, Hilfe ≤ 60 Zeichen · Quelle: `AuthForms.tsx` (Felder Name, E-Mail, Passwort; Mindestlänge 10)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.signup.fields.name` | Ihr Name | Uw naam | Votre nom | Your name |
| `account.signup.fields.email` | E-Mail-Adresse | E-mailadres | Adresse e-mail | Email address |
| `account.signup.fields.password` | Passwort | Wachtwoord | Mot de passe | Password |
| `account.signup.fields.password.help` | Mindestens 10 Zeichen. | Minstens 10 tekens. | 10 caractères au minimum. | At least 10 characters. |
| `account.signup.fields.password.show` | Passwort anzeigen | Wachtwoord tonen | Afficher le mot de passe | Show password |
| `account.signup.fields.password.hide` | Passwort verbergen | Wachtwoord verbergen | Masquer le mot de passe | Hide password |

### `account.signup.actions`
Zweck: Schaltflächen und Verweis zur Anmeldung · Richtwert: ≤ 35 Zeichen · Quelle: `AuthForms.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.signup.submit` | Konto erstellen | Account aanmaken | Créer un compte | Create account |
| `account.signup.busy` | Konto wird erstellt … | Account wordt aangemaakt … | Création du compte … | Creating account … |
| `account.signup.login` | Sie haben schon ein Konto? Anmelden | Heeft u al een account? Inloggen | Vous avez déjà un compte ? Se connecter | Already have an account? Sign in |

### `account.signup.google`
Zweck: Anmeldung über Google · Richtwert: ≤ 25 Zeichen · Quelle: `AuthForms.tsx` (`GoogleButton`). Der Weg hängt an einem fremden Dienst, dessen Verbleib offen ist (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, R-19); der Text steht für den Fall, dass er bleibt.

| | Text |
|---|---|
| DE | Mit Google anmelden |
| NL | Inloggen met Google |
| FR | Se connecter avec Google |
| EN | Sign in with Google |

### `account.signup.done`
Zweck: Bestätigung nach dem Absenden. Derselbe Text, ob die Adresse neu ist oder schon ein Konto hat – die Seite verrät das nicht · Richtwert: Titel ≤ 35, Text ≤ 200 Zeichen · Quelle: `docs/konzept/2026-11-14/03-suite-saas.md` (Paket P3: „Antwort verrät nicht, ob Konto existiert“)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.signup.done.title` | Bitte sehen Sie in Ihr Postfach. | Kijk alstublieft in uw inbox. | Merci de consulter votre boîte de réception. | Please check your inbox. |
| `account.signup.done.body` | Wir haben eine E-Mail an {{email}} geschickt. Mit dem Link darin bestätigen Sie Ihre Adresse. Gibt es zu dieser Adresse schon ein Konto, steht in der E-Mail, wie Sie sich anmelden. | We hebben een e-mail gestuurd naar {{email}}. Met de link daarin bevestigt u uw adres. Bestaat er voor dit adres al een account, dan staat in de e-mail hoe u inlogt. | Nous avons envoyé un e-mail à {{email}}. Le lien qu’il contient vous permet de confirmer votre adresse. S’il existe déjà un compte pour cette adresse, l’e-mail vous indique comment vous connecter. | We have sent an email to {{email}}. Use the link in it to confirm your address. If an account already exists for this address, the email tells you how to sign in. |

---

## Anmelden

### `account.login.head`
Zweck: Überschrift und Unterzeile · Richtwert: Titel ≤ 20, Unterzeile ≤ 90 Zeichen · Quelle: `AuthForms.tsx` (`TITLES`); Seite `login`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.login.title` | Anmelden | Inloggen | Se connecter | Sign in |
| `account.login.sub` | Mit Ihrer E-Mail-Adresse und Ihrem Passwort kommen Sie in Ihren Bereich. | Met uw e-mailadres en wachtwoord komt u in uw omgeving. | Votre adresse e-mail et votre mot de passe vous donnent accès à votre espace. | Your email address and password take you to your area. |

### `account.login.actions`
Zweck: Schaltflächen und Verweise · Richtwert: ≤ 35 Zeichen · Quelle: `AuthForms.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.login.submit` | Anmelden | Inloggen | Se connecter | Sign in |
| `account.login.busy` | Sie werden angemeldet … | U wordt ingelogd … | Connexion en cours … | Signing you in … |
| `account.login.forgot` | Passwort vergessen? | Wachtwoord vergeten? | Mot de passe oublié ? | Forgotten your password? |
| `account.login.signup` | Noch kein Konto? Konto erstellen | Nog geen account? Account aanmaken | Pas encore de compte ? Créer un compte | No account yet? Create account |
| `account.login.logout` | Abmelden | Uitloggen | Se déconnecter | Sign out |

---

## E-Mail-Bestätigung

### `account.verify.page`
Zweck: die Seite, auf der der Link landet – drei Zustände · Richtwert: Titel ≤ 40, Text ≤ 160 Zeichen · Quelle: `config/selfservice-policy.json` (`email_verification_required`); `docs/konzept/2026-11-14/03-suite-saas.md` (Paket P3: Link einmalig und befristet)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.verify.ok.title` | Ihre Adresse ist bestätigt. | Uw adres is bevestigd. | Votre adresse est confirmée. | Your address is confirmed. |
| `account.verify.ok.body` | Vielen Dank. Sie können sich jetzt anmelden. | Dank u. U kunt nu inloggen. | Merci. Vous pouvez maintenant vous connecter. | Thank you. You can sign in now. |
| `account.verify.ok.action` | Anmelden | Inloggen | Se connecter | Sign in |
| `account.verify.expired.title` | Dieser Link ist abgelaufen. | Deze link is verlopen. | Ce lien a expiré. | This link has expired. |
| `account.verify.expired.body` | Aus Sicherheitsgründen gilt er nur begrenzte Zeit. Fordern Sie einen neuen an; er kommt an dieselbe Adresse. | Om veiligheidsredenen is hij maar beperkte tijd geldig. Vraag een nieuwe aan; die komt op hetzelfde adres. | Par sécurité, il n’est valable qu’un temps limité. Demandez-en un nouveau ; il sera envoyé à la même adresse. | For security it is only valid for a limited time. Request a new one; it will be sent to the same address. |
| `account.verify.expired.action` | Neuen Link senden | Nieuwe link sturen | Envoyer un nouveau lien | Send a new link |
| `account.verify.used.title` | Dieser Link wurde schon verwendet. | Deze link is al gebruikt. | Ce lien a déjà été utilisé. | This link has already been used. |
| `account.verify.used.body` | Ist Ihre Adresse bestätigt, können Sie sich anmelden. Wenn nicht, fordern Sie einen neuen Link an. | Is uw adres bevestigd, dan kunt u inloggen. Zo niet, vraag dan een nieuwe link aan. | Si votre adresse est confirmée, vous pouvez vous connecter. Sinon, demandez un nouveau lien. | If your address is confirmed, you can sign in. If not, request a new link. |
| `account.verify.pending.title` | Bitte bestätigen Sie zuerst Ihre Adresse. | Bevestig eerst uw adres. | Merci de confirmer d’abord votre adresse. | Please confirm your address first. |
| `account.verify.pending.body` | Wir haben Ihnen dafür eine E-Mail geschickt. Ist sie nicht angekommen, sehen Sie bitte im Spam-Ordner nach oder fordern Sie einen neuen Link an. | We hebben u daarvoor een e-mail gestuurd. Is die niet aangekomen, kijk dan in uw spammap of vraag een nieuwe link aan. | Nous vous avons envoyé un e-mail à cet effet. S’il n’est pas arrivé, vérifiez votre dossier de courrier indésirable ou demandez un nouveau lien. | We have sent you an email for this. If it has not arrived, please check your spam folder or request a new link. |

### `account.verify.mail`
Zweck: Mailtext zur Bestätigung. Kurz, ein Link, ein Hinweis für den Fall, dass die Anmeldung nicht vom Empfänger stammt · Richtwert: Betreff ≤ 50, Vorschau ≤ 90, Text ≤ 500 Zeichen · Quelle: wie oben; Absender und Kontakt nach D-011. Pflichtangaben der Signatur fehlen, bis der Rechtsträger feststeht (`LUECKEN.md` L-04).

**DE**

> **Betreff:** Bitte bestätigen Sie Ihre E-Mail-Adresse
> **Vorschau:** Ein Klick, dann ist Ihr Konto bei NeXify AI eingerichtet.
>
> Guten Tag {{name}},
>
> Sie haben ein Konto bei NeXify AI angelegt. Bitte bestätigen Sie, dass diese E-Mail-Adresse Ihnen gehört:
>
> [E-Mail-Adresse bestätigen]
>
> Der Link gilt {{gueltigkeit}} und lässt sich einmal verwenden. Falls die Schaltfläche nicht reagiert, kopieren Sie diese Adresse in Ihren Browser: {{link}}
>
> Sie haben kein Konto angelegt? Dann müssen Sie nichts tun. Ohne Bestätigung bleibt das Konto ungenutzt.
>
> Freundliche Grüße
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**NL**

> **Onderwerp:** Bevestig alstublieft uw e-mailadres
> **Voorvertoning:** Eén klik, dan is uw account bij NeXify AI ingericht.
>
> Goedendag {{name}},
>
> U heeft een account bij NeXify AI aangemaakt. Bevestig alstublieft dat dit e-mailadres van u is:
>
> [E-mailadres bevestigen]
>
> De link is {{gueltigkeit}} geldig en kan één keer worden gebruikt. Reageert de knop niet, kopieer dan dit adres naar uw browser: {{link}}
>
> Heeft u geen account aangemaakt? Dan hoeft u niets te doen. Zonder bevestiging blijft het account ongebruikt.
>
> Met vriendelijke groet
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**FR**

> **Objet :** Merci de confirmer votre adresse e-mail
> **Aperçu :** Un clic, et votre compte NeXify AI est en place.
>
> Bonjour {{name}},
>
> Vous avez créé un compte chez NeXify AI. Merci de confirmer que cette adresse e-mail est bien la vôtre :
>
> [Confirmer l’adresse e-mail]
>
> Le lien est valable {{gueltigkeit}} et ne peut être utilisé qu’une fois. Si le bouton ne réagit pas, copiez cette adresse dans votre navigateur : {{link}}
>
> Vous n’avez pas créé de compte ? Vous n’avez alors rien à faire. Sans confirmation, le compte reste inutilisé.
>
> Bien cordialement
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**EN**

> **Subject:** Please confirm your email address
> **Preview:** One click and your NeXify AI account is set up.
>
> Hello {{name}},
>
> You have created an account with NeXify AI. Please confirm that this email address is yours:
>
> [Confirm email address]
>
> The link is valid for {{gueltigkeit}} and can be used once. If the button does not respond, copy this address into your browser: {{link}}
>
> You did not create an account? Then there is nothing you need to do. Without confirmation the account remains unused.
>
> Kind regards
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

### `account.verify.mail.existing`
Zweck: Mailtext, wenn zu der Adresse schon ein Konto besteht. Ersetzt die Fehlermeldung „bereits registriert“ auf der Seite · Richtwert: wie oben · Quelle: wie `account.signup.done`

**DE**

> **Betreff:** Zu dieser Adresse gibt es schon ein Konto
>
> Guten Tag,
>
> gerade wurde versucht, mit dieser E-Mail-Adresse ein Konto bei NeXify AI anzulegen. Es gibt bereits eines. Sie können sich damit anmelden; wenn Sie das Passwort nicht mehr wissen, legen Sie über „Passwort vergessen“ ein neues fest.
>
> Sie waren das nicht? Dann müssen Sie nichts tun. An Ihrem Konto wurde nichts geändert.
>
> Freundliche Grüße
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**NL**

> **Onderwerp:** Voor dit adres bestaat al een account
>
> Goedendag,
>
> zojuist is geprobeerd met dit e-mailadres een account bij NeXify AI aan te maken. Er bestaat er al een. U kunt daarmee inloggen; weet u het wachtwoord niet meer, stel dan via ‘Wachtwoord vergeten’ een nieuw in.
>
> Was u dat niet? Dan hoeft u niets te doen. Aan uw account is niets gewijzigd.
>
> Met vriendelijke groet
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**FR**

> **Objet :** Un compte existe déjà pour cette adresse
>
> Bonjour,
>
> une tentative de création de compte NeXify AI vient d’être faite avec cette adresse e-mail. Il en existe déjà un. Vous pouvez vous y connecter ; si vous ne connaissez plus le mot de passe, définissez-en un nouveau via « Mot de passe oublié ».
>
> Ce n’était pas vous ? Vous n’avez alors rien à faire. Rien n’a été modifié sur votre compte.
>
> Bien cordialement
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**EN**

> **Subject:** An account already exists for this address
>
> Hello,
>
> someone has just tried to create a NeXify AI account with this email address. One already exists. You can sign in with it; if you no longer know the password, set a new one through “Forgotten your password?”.
>
> That was not you? Then there is nothing you need to do. Nothing on your account has changed.
>
> Kind regards
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

---

## Passwort vergessen

### `account.reset.request`
Zweck: Seite, auf der der Link angefordert wird · Richtwert: Titel ≤ 25, Text ≤ 170 Zeichen · Quelle: `AuthForms.tsx` (`forgot`); 60 Minuten und einmalige Verwendung aus `docs/konzept/2026-11-14/03-suite-saas.md`, Abschnitt 1.2

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.reset.title` | Passwort vergessen | Wachtwoord vergeten | Mot de passe oublié | Forgotten password |
| `account.reset.sub` | Nennen Sie Ihre E-Mail-Adresse. Wir schicken Ihnen einen Link, mit dem Sie ein neues Passwort festlegen. | Vul uw e-mailadres in. We sturen u een link waarmee u een nieuw wachtwoord instelt. | Indiquez votre adresse e-mail. Nous vous envoyons un lien pour définir un nouveau mot de passe. | Enter your email address. We will send you a link to set a new password. |
| `account.reset.submit` | Link senden | Link sturen | Envoyer le lien | Send link |
| `account.reset.sent.title` | Bitte sehen Sie in Ihr Postfach. | Kijk alstublieft in uw inbox. | Merci de consulter votre boîte de réception. | Please check your inbox. |
| `account.reset.sent.body` | Gibt es zu dieser Adresse ein Konto, ist die E-Mail unterwegs. Der Link gilt 60 Minuten und lässt sich einmal verwenden. | Bestaat er voor dit adres een account, dan is de e-mail onderweg. De link is 60 minuten geldig en kan één keer worden gebruikt. | S’il existe un compte pour cette adresse, l’e-mail est en route. Le lien est valable 60 minutes et ne peut être utilisé qu’une fois. | If an account exists for this address, the email is on its way. The link is valid for 60 minutes and can be used once. |
| `account.reset.back` | Zurück zur Anmeldung | Terug naar inloggen | Retour à la connexion | Back to sign in |

### `account.reset.new`
Zweck: Seite, auf der das neue Passwort festgelegt wird · Richtwert: Titel ≤ 30, Text ≤ 150 Zeichen · Quelle: `AuthForms.tsx` (`reset`); Abmeldung aller Geräte aus `03-suite-saas.md`, Abschnitt 1.2

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.reset.new.title` | Neues Passwort festlegen | Nieuw wachtwoord instellen | Définir un nouveau mot de passe | Set a new password |
| `account.reset.new.field` | Neues Passwort | Nieuw wachtwoord | Nouveau mot de passe | New password |
| `account.reset.new.help` | Mindestens 10 Zeichen. | Minstens 10 tekens. | 10 caractères au minimum. | At least 10 characters. |
| `account.reset.new.submit` | Passwort speichern | Wachtwoord opslaan | Enregistrer le mot de passe | Save password |
| `account.reset.new.done.title` | Ihr neues Passwort gilt. | Uw nieuwe wachtwoord is actief. | Votre nouveau mot de passe est actif. | Your new password is in place. |
| `account.reset.new.done.body` | Zu Ihrer Sicherheit haben wir Sie auf allen Geräten abgemeldet. Bitte melden Sie sich mit dem neuen Passwort an. | Voor uw veiligheid hebben we u op alle apparaten uitgelogd. Log in met het nieuwe wachtwoord. | Pour votre sécurité, nous vous avons déconnecté de tous vos appareils. Merci de vous connecter avec le nouveau mot de passe. | For your security we have signed you out on all devices. Please sign in with the new password. |

### `account.reset.mail`
Zweck: Mailtext mit dem Link · Richtwert: Betreff ≤ 50, Text ≤ 450 Zeichen · Quelle: wie oben

**DE**

> **Betreff:** Neues Passwort für Ihr Konto bei NeXify AI
>
> Guten Tag {{name}},
>
> Sie möchten ein neues Passwort festlegen. Das geht hier:
>
> [Neues Passwort festlegen]
>
> Der Link gilt 60 Minuten und lässt sich einmal verwenden. Danach sind Sie auf allen Geräten abgemeldet und melden sich mit dem neuen Passwort an.
>
> Sie haben das nicht angefordert? Dann müssen Sie nichts tun. Ihr bisheriges Passwort gilt weiter.
>
> Freundliche Grüße
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**NL**

> **Onderwerp:** Nieuw wachtwoord voor uw account bij NeXify AI
>
> Goedendag {{name}},
>
> U wilt een nieuw wachtwoord instellen. Dat kan hier:
>
> [Nieuw wachtwoord instellen]
>
> De link is 60 minuten geldig en kan één keer worden gebruikt. Daarna bent u op alle apparaten uitgelogd en logt u in met het nieuwe wachtwoord.
>
> Heeft u dit niet aangevraagd? Dan hoeft u niets te doen. Uw huidige wachtwoord blijft geldig.
>
> Met vriendelijke groet
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**FR**

> **Objet :** Nouveau mot de passe pour votre compte NeXify AI
>
> Bonjour {{name}},
>
> Vous souhaitez définir un nouveau mot de passe. C’est ici :
>
> [Définir un nouveau mot de passe]
>
> Le lien est valable 60 minutes et ne peut être utilisé qu’une fois. Vous serez ensuite déconnecté de tous vos appareils et vous vous connecterez avec le nouveau mot de passe.
>
> Vous n’êtes pas à l’origine de cette demande ? Vous n’avez alors rien à faire. Votre mot de passe actuel reste valable.
>
> Bien cordialement
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

**EN**

> **Subject:** New password for your NeXify AI account
>
> Hello {{name}},
>
> You would like to set a new password. You can do so here:
>
> [Set a new password]
>
> The link is valid for 60 minutes and can be used once. After that you will be signed out on all devices and sign in with the new password.
>
> You did not request this? Then there is nothing you need to do. Your current password remains valid.
>
> Kind regards
> Pascal Courbois
> NeXify AI FACTORY · mail@nexifyai.cloud

---

## Fehlermeldungen

Jede Meldung sagt, was nicht stimmt und was zu tun ist. Keine Meldung verrät, ob es zu einer Adresse ein Konto gibt.

### `account.error`
Zweck: Feld- und Formularfehler · Richtwert: ≤ 130 Zeichen · Quelle: `AuthForms.tsx` (`FIELD_MSG`); D-007 (Wortlaut „E-Mail oder Passwort ist falsch“, Sperre nach 5 Fehlversuchen in 15 Minuten)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `account.error.required` | Bitte füllen Sie dieses Feld aus. | Vul dit veld in. | Merci de remplir ce champ. | Please fill in this field. |
| `account.error.email` | Bitte geben Sie eine gültige E-Mail-Adresse ein. | Voer een geldig e-mailadres in. | Merci de saisir une adresse e-mail valide. | Please enter a valid email address. |
| `account.error.password.short` | Das Passwort braucht mindestens 10 Zeichen. | Het wachtwoord heeft minstens 10 tekens nodig. | Le mot de passe doit compter au moins 10 caractères. | The password needs at least 10 characters. |
| `account.error.credentials` | E-Mail oder Passwort ist falsch. | E-mailadres of wachtwoord is onjuist. | L’adresse e-mail ou le mot de passe est incorrect. | Email or password is incorrect. |
| `account.error.locked` | Nach mehreren Fehlversuchen ist die Anmeldung für 15 Minuten gesperrt. Danach können Sie es erneut versuchen oder ein neues Passwort festlegen. | Na meerdere mislukte pogingen is inloggen 15 minuten geblokkeerd. Daarna kunt u het opnieuw proberen of een nieuw wachtwoord instellen. | Après plusieurs tentatives infructueuses, la connexion est bloquée pendant 15 minutes. Vous pourrez ensuite réessayer ou définir un nouveau mot de passe. | After several failed attempts, sign-in is blocked for 15 minutes. After that you can try again or set a new password. |
| `account.error.link.expired` | Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an. | Deze link is verlopen. Vraag een nieuwe aan. | Ce lien a expiré. Merci d’en demander un nouveau. | This link has expired. Please request a new one. |
| `account.error.link.used` | Dieser Link wurde schon verwendet. Bitte fordern Sie einen neuen an. | Deze link is al gebruikt. Vraag een nieuwe aan. | Ce lien a déjà été utilisé. Merci d’en demander un nouveau. | This link has already been used. Please request a new one. |
| `account.error.google` | Die Anmeldung mit Google hat nicht geklappt. Bitte versuchen Sie es erneut oder melden Sie sich mit E-Mail und Passwort an. | Inloggen met Google is niet gelukt. Probeer het opnieuw of log in met e-mailadres en wachtwoord. | La connexion avec Google n’a pas abouti. Merci de réessayer ou de vous connecter avec votre adresse e-mail et votre mot de passe. | Signing in with Google did not work. Please try again or sign in with email and password. |
| `account.error.unavailable` | Die Anmeldung ist gerade nicht erreichbar. Ihre Eingaben sind nicht verloren. Bitte versuchen Sie es in ein paar Minuten erneut oder schreiben Sie an mail@nexifyai.cloud. | Inloggen is nu niet bereikbaar. Uw invoer is niet verloren. Probeer het over een paar minuten opnieuw of schrijf naar mail@nexifyai.cloud. | La connexion n’est pas disponible pour le moment. Votre saisie n’est pas perdue. Merci de réessayer dans quelques minutes ou d’écrire à mail@nexifyai.cloud. | Sign-in is not available right now. What you entered is not lost. Please try again in a few minutes or write to mail@nexifyai.cloud. |
| `account.error.generic` | Das hat nicht geklappt. Bitte versuchen Sie es erneut. Bleibt es dabei, schreiben Sie an mail@nexifyai.cloud. | Dat is niet gelukt. Probeer het opnieuw. Blijft het zo, schrijf dan naar mail@nexifyai.cloud. | Cela n’a pas fonctionné. Merci de réessayer. Si le problème persiste, écrivez à mail@nexifyai.cloud. | That did not work. Please try again. If it keeps happening, write to mail@nexifyai.cloud. |

Hinweis zur Umsetzung: Der Bestand zeigt bei der Registrierung „Diese E-Mail-Adresse ist bereits registriert“. Diese Meldung entfällt zugunsten von `account.signup.done` und `account.verify.mail.existing`.
