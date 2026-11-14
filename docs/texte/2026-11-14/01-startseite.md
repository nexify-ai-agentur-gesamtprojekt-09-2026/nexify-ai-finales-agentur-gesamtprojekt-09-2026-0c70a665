# 01 · Startseite

Stand: 14.11.2026 · Entwurf · Basis: `DECISIONS.md` D-013 („Ein Gespräch. Ein Projekt, das passt.“).

Reihenfolge wie ausgeliefert (`apps/web/components/IdentityHero.tsx`, `HomeContent.tsx`, `SiteFooter.tsx`): Navigation, Hero, Sprungmarken, Einstieg, drei Bilder, Leistungen, Zusammenarbeit, Produktwelt, Kosten und Umfang, Abschluss, Fuß.

Hinweis zur Reihenfolge: Die Sprungmarken nennen im Bestand „Budget“ vor „Produktwelt“, die Abschnitte stehen umgekehrt. Diese Vorlage folgt den Abschnitten.

---

## Navigation

### `home.nav.items`
Zweck: Hauptnavigation, ein Wort je Ziel · Richtwert: ≤ 14 Zeichen je Eintrag · Quelle: `apps/web/components/SiteNavigation.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.nav.services` | Leistungen | Diensten | Prestations | Services |
| `home.nav.products` | Produkte | Producten | Produits | Products |
| `home.nav.method` | Arbeitsweise | Werkwijze | Notre méthode | How we work |
| `home.nav.contact` | Kontakt | Contact | Contact | Contact |
| `home.nav.teileklar` | TEILEKLAR | TEILEKLAR | TEILEKLAR | TEILEKLAR |
| `home.nav.account` | Ihr Konto | Uw account | Votre compte | Your account |
| `home.nav.language` | Sprache | Taal | Langue | Language |

### `home.nav.cta`
Zweck: die eine Handlung in der Kopfzeile; öffnet den Chat · Richtwert: ≤ 20 Zeichen · Quelle: `IdentityHero.tsx` (`primaryCta`)

| | Text |
|---|---|
| DE | Vorhaben schildern |
| NL | Uw plan beschrijven |
| FR | Décrire votre projet |
| EN | Describe your project |

### `home.nav.aria`
Zweck: Beschriftungen für Bildschirmleser und das Menü auf kleinen Bildschirmen · Richtwert: ≤ 20 Zeichen · Quelle: `SiteNavigation.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.nav.aria.main` | Hauptnavigation | Hoofdnavigatie | Navigation principale | Main navigation |
| `home.nav.aria.open` | Menü | Menu | Menu | Menu |
| `home.nav.aria.close` | Menü schließen | Menu sluiten | Fermer le menu | Close menu |
| `home.nav.aria.home` | Zur Startseite | Naar de startpagina | Retour à l’accueil | Back to home |

---

## Hero

### `home.hero.title`
Zweck: Kernsatz der Marke · Richtwert: ≤ 40 Zeichen, drei Zeilen setzbar · Quelle: `IdentityHero.tsx` (`headings`), `config/site-map.json` Seite `home`; D-013

| | Text |
|---|---|
| DE | Ein Gespräch. Ein Projekt, das passt. |
| NL | Eén gesprek. Een project dat past. |
| FR | Une conversation. Un projet qui vous ressemble. |
| EN | One conversation. A project that fits. |

### `home.hero.sub`
Zweck: sagt, was gebaut wird, und woraus · Richtwert: ≤ 85 Zeichen · Quelle: `IdentityHero.tsx` (`subtitles`); D-013

| | Text |
|---|---|
| DE | Websites, Apps, Shops und KI – aus dem, was Ihr Unternehmen wirklich braucht. |
| NL | Websites, apps, webshops en AI – vanuit wat uw bedrijf echt nodig heeft. |
| FR | Sites web, applications, boutiques en ligne et IA – à partir de ce dont votre entreprise a réellement besoin. |
| EN | Websites, apps, shops and AI – built from what your business actually needs. |

### `home.hero.body`
Zweck: Anspruch des Inhabers und persönliche Begleitung · Richtwert: ≤ 150 Zeichen · Quelle: `IdentityHero.tsx` (`bodies`); Kernaussage des Inhabers (Entscheidung PL, D-013). Der Superlativ ist nicht belegt und als Anspruch formuliert – siehe `LUECKEN.md` L-01.

| | Text |
|---|---|
| DE | Höchste Qualität zu einem fairen Preis – das ist unser Anspruch. Pascal begleitet Ihr Projekt persönlich, vom ersten Gespräch bis zur Übergabe. |
| NL | Topkwaliteit voor een eerlijke prijs – dat is onze maatstaf. Pascal begeleidt uw project persoonlijk, van het eerste gesprek tot de oplevering. |
| FR | La plus haute qualité à un prix juste : c’est notre exigence. Pascal accompagne personnellement votre projet, du premier échange à la livraison. |
| EN | The highest quality at a fair price – that is the standard we set ourselves. Pascal guides your project personally, from the first conversation to handover. |

### `home.hero.body.belegt`
Zweck: Ausweichfassung ohne Superlativ, falls der Inhaber den Anspruch nicht als geschriebene Aussage führen will (EV-18) · Richtwert: ≤ 150 Zeichen · Quelle: `config/home-concept-copy.json` (`processBody`, `budgetTitle`)

| | Text |
|---|---|
| DE | Pascal begleitet Ihr Projekt persönlich, vom ersten Gespräch bis zur Übergabe. Und Sie wissen vor dem Start, was enthalten ist. |
| NL | Pascal begeleidt uw project persoonlijk, van het eerste gesprek tot de oplevering. En u weet vooraf wat inbegrepen is. |
| FR | Pascal accompagne personnellement votre projet, du premier échange à la livraison. Et vous savez, avant de commencer, ce qui est inclus. |
| EN | Pascal guides your project personally, from the first conversation to handover. And you know what is included before work begins. |

### `home.hero.cta`
Zweck: Haupthandlung; öffnet den Chat · Richtwert: ≤ 20 Zeichen · Quelle: `IdentityHero.tsx` (`primaryCta`)

| | Text |
|---|---|
| DE | Vorhaben schildern |
| NL | Uw plan beschrijven |
| FR | Décrire votre projet |
| EN | Describe your project |

### `home.hero.cta.secondary`
Zweck: zweite Handlung für Besucher, die erst lesen wollen · Richtwert: ≤ 20 Zeichen · Quelle: `config/public-interface-copy.json` (`hero.services`)

| | Text |
|---|---|
| DE | Leistungen ansehen |
| NL | Diensten bekijken |
| FR | Voir les prestations |
| EN | View services |

### `home.hero.film`
Zweck: Bedienung und Bildbeschreibung des Hero-Films · Richtwert: ≤ 60 Zeichen · Quelle: `config/public-interface-copy.json` (`hero.scene`, `hero.start`); `AGENTS.md` (Hero liefert die Videoaufnahme, Pascal unverfremdet). Sprechtext: `06-filmtexte.md`.

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.hero.film.play` | Film abspielen | Film afspelen | Lire le film | Play film |
| `home.hero.film.pause` | Film anhalten | Film pauzeren | Mettre le film en pause | Pause film |
| `home.hero.film.alt` | Pascal Courbois im Atelier | Pascal Courbois in het atelier | Pascal Courbois dans l’atelier | Pascal Courbois in the studio |
| `home.hero.film.fallback` | Der Film ist gerade nicht verfügbar. | De film is nu niet beschikbaar. | Le film n’est pas disponible pour le moment. | The film is not available right now. |

---

## Sprungmarken

### `home.anchors`
Zweck: führt zu den vier Abschnitten · Richtwert: ≤ 16 Zeichen je Eintrag · Quelle: `config/home-concept-copy.json` (`anchor`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.anchors.services` | Leistungen | Diensten | Prestations | Services |
| `home.anchors.process` | Zusammenarbeit | Samenwerking | Collaboration | Working together |
| `home.anchors.products` | Produktwelt | Producten | Produits | Products |
| `home.anchors.budget` | Kosten und Umfang | Kosten en omvang | Coûts et périmètre | Cost and scope |

---

## Einstieg

### `home.intro.kicker`
Zweck: Vorzeile · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`introKicker`)

| | Text |
|---|---|
| DE | Hier fängt die Arbeit an |
| NL | Hier begint het werk |
| FR | Ici commence le travail |
| EN | This is where the work begins |

### `home.intro.title`
Zweck: holt den Besucher bei seinem Problem ab · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`introTitle`)

| | Text |
|---|---|
| DE | Wo hakt es gerade? |
| NL | Waar loopt het nu vast? |
| FR | Qu’est-ce qui coince aujourd’hui ? |
| EN | Where does it get stuck? |

### `home.intro.body`
Zweck: zwei Beispiele aus dem Alltag, dann die Einladung · Richtwert: ≤ 170 Zeichen · Quelle: `config/home-concept-copy.json` (`introBody`)

| | Text |
|---|---|
| DE | Eine Website, die Ihr Angebot nicht erklärt. Ein Vorgang, der jeden Tag Zeit kostet. Zeigen Sie uns die Stelle. Dort fangen wir an. |
| NL | Een website die uw aanbod niet uitlegt. Een handeling die elke dag tijd kost. Laat ons zien waar het wringt. Daar beginnen we. |
| FR | Un site qui n’explique pas votre offre. Une tâche qui prend du temps chaque jour. Montrez-nous l’endroit où cela bloque. C’est là que nous commençons. |
| EN | A website that does not explain what you offer. A task that takes time every single day. Show us where it gets stuck. That is where we start. |

---

## Drei Bilder

Jede Karte: Umfeld (Vorzeile) · Titel · Text · Ziel · Verweis. Quelle für alle: `config/home-concept-copy.json` (`galleryContexts`, `galleryTitles`, `galleryBodies`, `galleryValues`, `galleryLinks`).

### `home.gallery.1` – Marke und Website
Zweck: erstes Leistungsfeld an einem Bild zeigen · Richtwert: Titel ≤ 35, Text ≤ 170, Ziel ≤ 70 Zeichen

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.gallery.1.context` | Marke & Dienstleistung | Merk & dienstverlening | Marque et services | Brand & services |
| `home.gallery.1.title` | Ihr Angebot, auf den Punkt. | Uw aanbod, helder verwoord. | Votre offre, sans détour. | Your offer, clearly told. |
| `home.gallery.1.body` | Wir ordnen Leistungen, Sprache und Gestaltung, bis Ihre Website Ihr Unternehmen verständlich zeigt und den Weg zur Anfrage öffnet. | We ordenen diensten, taal en vormgeving tot uw website uw bedrijf begrijpelijk toont en de weg naar een aanvraag opent. | Nous mettons en ordre vos prestations, vos mots et votre image, jusqu’à ce que votre site présente clairement votre entreprise et ouvre la voie à une demande. | We put your services, language and design in order until your website shows your business clearly and opens the way to an enquiry. |
| `home.gallery.1.goal` | Ziel: Gespräche mit den Kunden, die zu Ihnen passen. | Doel: gesprekken met de klanten die bij u passen. | Objectif : des échanges avec les clients qui vous correspondent. | Goal: conversations with the customers who suit you. |
| `home.gallery.1.link` | Websites & Markenauftritt | Websites & merkuitstraling | Sites web et image de marque | Websites & brand presence |

### `home.gallery.2` – Abläufe und KI
Zweck: zweites Leistungsfeld an einem Bild zeigen · Richtwert: wie oben

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.gallery.2.context` | Fertigung & Handwerk | Productie & ambacht | Production et artisanat | Manufacturing & trades |
| `home.gallery.2.title` | Mehr Zeit für die Arbeit, die zählt. | Meer tijd voor het werk dat telt. | Plus de temps pour l’essentiel. | More time for the work that matters. |
| `home.gallery.2.body` | Wir sehen uns mit Ihnen einen wiederkehrenden Vorgang an und prüfen, wo Daten, Freigaben und KI Ihrem Team Arbeit abnehmen können. | Samen met u bekijken we een terugkerende handeling en gaan we na waar gegevens, goedkeuringen en AI uw team werk uit handen kunnen nemen. | Nous examinons avec vous une tâche récurrente et vérifions où les données, les validations et l’IA peuvent soulager votre équipe. | Together we look at one recurring task and check where data, approvals and AI can take work off your team. |
| `home.gallery.2.goal` | Ziel: weniger Doppelarbeit und ein Ablauf, auf den Sie sich verlassen können. | Doel: minder dubbel werk en een proces waarop u kunt rekenen. | Objectif : moins de doubles saisies et un déroulement sur lequel vous pouvez compter. | Goal: less duplicated work and a process you can rely on. |
| `home.gallery.2.link` | KI im Arbeitsablauf | AI in het werkproces | L’IA dans vos processus | AI in your workflow |

### `home.gallery.3` – TEILEKLAR
Zweck: die eigene Marke als Arbeitsprobe vorstellen · Richtwert: wie oben

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.gallery.3.context` | Automotive & Logistik | Automotive & logistiek | Automobile et logistique | Automotive & logistics |
| `home.gallery.3.title` | Das richtige Teil. Der richtige Weg. | Het juiste onderdeel. De juiste route. | La bonne pièce. Le bon parcours. | The right part. The right route. |
| `home.gallery.3.body` | TEILEKLAR ist unsere eigene Marke. Sie zeigt, wie Fahrzeug, Teil, Passung und Werkstatt in einer verständlichen Anfrage zusammenkommen. | TEILEKLAR is ons eigen merk. Het laat zien hoe voertuig, onderdeel, pasvorm en werkplaats samenkomen in één begrijpelijke aanvraag. | TEILEKLAR est notre propre marque. Elle montre comment véhicule, pièce, compatibilité et atelier se rejoignent dans une demande claire. | TEILEKLAR is our own brand. It shows how vehicle, part, fitment and workshop come together in one clear enquiry. |
| `home.gallery.3.goal` | Ziel: Klarheit vor der nächsten Teile- oder Werkstattfrage. | Doel: duidelijkheid vóór de volgende vraag over onderdelen of werkplaats. | Objectif : y voir clair avant la prochaine question de pièce ou d’atelier. | Goal: clarity before the next parts or workshop question. |
| `home.gallery.3.link` | TEILEKLAR entdecken | TEILEKLAR ontdekken | Découvrir TEILEKLAR | Explore TEILEKLAR |

### `home.gallery.alt`
Zweck: Bildbeschreibungen mit vollem Namen · Richtwert: ≤ 140 Zeichen · Quelle: `config/home-concept-copy.json` (`galleryAlts`); Namensregel D-011. Die Länge folgt aus „Immer der volle Name“; eine Kürzungsregel für Alt-Texte ist offen (`LUECKEN.md` L-03).

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.gallery.1.alt` | Pascal im Atelier mit NeX und AIFly ORACLE with NeXify AI Intelligence by NeXify bei der Arbeit an Marke und Website | Pascal in het atelier met NeX en AIFly ORACLE with NeXify AI Intelligence by NeXify, aan het werk aan merk en website | Pascal dans l’atelier avec NeX et AIFly ORACLE with NeXify AI Intelligence by NeXify, au travail sur la marque et le site | Pascal in the studio with NeX and AIFly ORACLE with NeXify AI Intelligence by NeXify, working on brand and website |
| `home.gallery.2.alt` | Pascal mit NeX und AIFly ORACLE with NeXify AI Intelligence by NeXify in der Produktion | Pascal met NeX en AIFly ORACLE with NeXify AI Intelligence by NeXify in de productie | Pascal avec NeX et AIFly ORACLE with NeXify AI Intelligence by NeXify en production | Pascal with NeX and AIFly ORACLE with NeXify AI Intelligence by NeXify in production |
| `home.gallery.3.alt` | Pascal mit NeX und AIFly ORACLE with NeXify AI Intelligence by NeXify in der Logistik | Pascal met NeX en AIFly ORACLE with NeXify AI Intelligence by NeXify in de logistiek | Pascal avec NeX et AIFly ORACLE with NeXify AI Intelligence by NeXify en logistique | Pascal with NeX and AIFly ORACLE with NeXify AI Intelligence by NeXify in logistics |

---

## Leistungen

### `home.services.kicker`
Zweck: Vorzeile · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`serviceKicker`)

| | Text |
|---|---|
| DE | Was wir für Sie tun |
| NL | Wat we voor u doen |
| FR | Ce que nous faisons pour vous |
| EN | What we do for you |

### `home.services.title`
Zweck: Abschnittskopf · Richtwert: ≤ 40 Zeichen · Quelle: `config/home-concept-copy.json` (`serviceTitle`)

| | Text |
|---|---|
| DE | Was können wir für Sie bauen? |
| NL | Wat kunnen we voor u bouwen? |
| FR | Que pouvons-nous construire pour vous ? |
| EN | What can we build for you? |

### `home.services.body`
Zweck: sagt, wo die Arbeit beginnt · Richtwert: ≤ 130 Zeichen · Quelle: `config/home-concept-copy.json` (`serviceBody`)

| | Text |
|---|---|
| DE | Markenauftritt, vernetzte Abläufe oder Kampagne: Wir beginnen bei einer konkreten Aufgabe in Ihrem Unternehmen. |
| NL | Merkuitstraling, gekoppelde processen of een campagne: we beginnen bij één concrete opgave in uw bedrijf. |
| FR | Image de marque, processus connectés ou campagne : nous partons d’une tâche concrète dans votre entreprise. |
| EN | Brand presence, connected processes or a campaign: we start with one concrete task in your business. |

### `home.services.cta`
Zweck: Handlung im Abschnitt; derselbe Wortlaut wie im Hero · Richtwert: ≤ 20 Zeichen · Quelle: `config/home-concept-copy.json` (`offerCta`), vereinheitlicht

| | Text |
|---|---|
| DE | Vorhaben schildern |
| NL | Uw plan beschrijven |
| FR | Décrire votre projet |
| EN | Describe your project |

### `home.services.offer.1` – Marke, Text und Website
Zweck: Leistungskarte · Richtwert: Name ≤ 30, Leitsatz ≤ 90, Punkt ≤ 90, Hinweis ≤ 120 Zeichen · Quelle: `config/home-concept-copy.json` (`offers[0]`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.services.offer.1.name` | Marke, Text & Website | Merk, tekst & website | Marque, textes et site web | Brand, copy & website |
| `home.services.offer.1.lead` | Ein Auftritt, der nach Ihrem Unternehmen aussieht und sich auch so liest. | Een uitstraling die eruitziet als uw bedrijf en ook zo leest. | Une présence qui ressemble à votre entreprise et qui se lit comme elle. | A presence that looks like your business and reads like it too. |
| `home.services.offer.1.point.1` | Positionierung, Seitenstruktur und klare Texte für Ihr Angebot | Positionering, paginastructuur en heldere teksten voor uw aanbod | Positionnement, structure des pages et textes clairs pour votre offre | Positioning, page structure and clear copy for your offer |
| `home.services.offer.1.point.2` | Art Direction und Webdesign, eigens für Ihr Unternehmen entworfen | Art direction en webdesign, speciaal voor uw bedrijf ontworpen | Direction artistique et design web conçus pour votre entreprise | Art direction and web design, created for your business |
| `home.services.offer.1.point.3` | Umsetzung für jede Bildschirmgröße, ein klarer Weg zur Anfrage, persönliche Übergabe | Uitvoering voor elk schermformaat, een duidelijke weg naar de aanvraag, persoonlijke oplevering | Réalisation pour toutes les tailles d’écran, un chemin clair vers la demande, une remise en main propre | Built for every screen size, a clear path to the enquiry, a personal handover |
| `home.services.offer.1.note` | Für Neugründung oder Relaunch. Umfang, Sprachen und Funktionen vereinbaren wir vor dem Start. | Voor een nieuwe start of een relaunch. Omvang, talen en functies spreken we vooraf af. | Pour une création ou une refonte. Périmètre, langues et fonctions sont convenus avant de commencer. | For a new venture or a relaunch. Scope, languages and features are agreed before work begins. |

### `home.services.offer.2` – Systeme und Automatisierung
Zweck: Leistungskarte · Richtwert: wie oben · Quelle: `config/home-concept-copy.json` (`offers[1]`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.services.offer.2.name` | Systeme & Automatisierung | Systemen & automatisering | Systèmes et automatisation | Systems & automation |
| `home.services.offer.2.lead` | Weniger Routine, mehr Überblick. Ihre Arbeitsweise bleibt Ihre. | Minder routine, meer overzicht. Uw manier van werken blijft de uwe. | Moins de routine, plus de visibilité. Votre façon de travailler reste la vôtre. | Less routine, more overview. Your way of working stays yours. |
| `home.services.offer.2.point.1` | Einen wiederkehrenden Ablauf vollständig verstehen | Eén terugkerend proces volledig begrijpen | Comprendre entièrement un processus récurrent | Understand one recurring process in full |
| `home.services.offer.2.point.2` | Vorhandene Systeme, Daten und Freigaben gezielt verbinden | Bestaande systemen, gegevens en goedkeuringen gericht koppelen | Relier de façon ciblée les systèmes, données et validations existants | Connect existing systems, data and approvals where it counts |
| `home.services.offer.2.point.3` | Fehlerfälle prüfen, Zuständigkeiten klären, Bedienung dokumentieren | Foutsituaties testen, verantwoordelijkheden vastleggen, bediening documenteren | Tester les cas d’erreur, clarifier les responsabilités, documenter l’utilisation | Test the failure cases, settle responsibilities, document how it is used |
| `home.services.offer.2.note` | Wir beginnen bewusst mit einem Ablauf. Erst wenn er zuverlässig läuft, planen wir den nächsten. | We beginnen bewust met één proces. Pas als dat betrouwbaar loopt, plannen we het volgende. | Nous commençons volontairement par un seul processus. Ce n’est qu’une fois celui-ci fiable que nous planifions le suivant. | We deliberately start with one process. Only when it runs reliably do we plan the next. |

### `home.services.offer.3` – Sichtbarkeit und Kampagne
Zweck: Leistungskarte · Richtwert: wie oben · Quelle: `config/home-concept-copy.json` (`offers[2]`); „ein bestimmter Erfolg wird nicht zugesagt“ aus `config/site-map.json` Seite `solutions`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.services.offer.3.name` | Sichtbarkeit & Kampagne | Zichtbaarheid & campagne | Visibilité et campagne | Visibility & campaign |
| `home.services.offer.3.lead` | Gefunden und verstanden werden – mit einem guten Anlass für die Anfrage. | Gevonden en begrepen worden – met een goede aanleiding voor een aanvraag. | Être trouvé et compris, avec une bonne raison de vous contacter. | Be found and understood – with a good reason to get in touch. |
| `home.services.offer.3.point.1` | Angebot, Zielgruppe und Suchanliegen genau herausarbeiten | Aanbod, doelgroep en zoekvraag nauwkeurig uitwerken | Définir précisément l’offre, la cible et l’intention de recherche | Work out the offer, the audience and what they search for |
| `home.services.offer.3.point.2` | Landingpage, Inhalte und Werbemittel aus einem Konzept entwickeln | Landingspagina, content en advertenties vanuit één concept ontwikkelen | Concevoir page d’atterrissage, contenus et supports à partir d’un même concept | Develop landing page, content and ads from one concept |
| `home.services.offer.3.point.3` | Suchmaschinen, KI-Suche, lokale Einträge und Auswertung aufeinander abstimmen | Zoekmachines, AI-zoeken, lokale vermeldingen en analyse op elkaar afstemmen | Accorder moteurs de recherche, recherche par IA, fiches locales et mesure | Align search engines, AI search, local listings and measurement |
| `home.services.offer.3.note` | Werbebudget, Plattformkosten und Betreuung weisen wir getrennt aus. Einen bestimmten Erfolg sagen wir nicht zu. | Advertentiebudget, platformkosten en begeleiding vermelden we apart. Een bepaald resultaat zeggen we niet toe. | Budget publicitaire, frais de plateforme et accompagnement sont indiqués séparément. Nous ne promettons pas de résultat déterminé. | Ad budget, platform costs and ongoing support are listed separately. We do not promise a particular result. |

### `home.services.link`
Zweck: Verweis je Karte auf die Leistungsseite · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`serviceLink`)

| | Text |
|---|---|
| DE | Leistung und Umfang ansehen |
| NL | Dienst en omvang bekijken |
| FR | Voir la prestation et son périmètre |
| EN | View service and scope |

---

## Zusammenarbeit

### `home.process.kicker`
Zweck: Vorzeile · Richtwert: ≤ 20 Zeichen · Quelle: `config/home-concept-copy.json` (`processKicker`)

| | Text |
|---|---|
| DE | Zusammenarbeit |
| NL | Samenwerking |
| FR | Collaboration |
| EN | Working together |

### `home.process.title`
Zweck: macht die persönliche Begleitung zum Abschnittskopf · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`processTitle`)

| | Text |
|---|---|
| DE | Mit Pascal am Tisch. |
| NL | Met Pascal aan tafel. |
| FR | À la même table que Pascal. |
| EN | At the table with Pascal. |

### `home.process.body`
Zweck: was der Kunde während des Projekts sieht · Richtwert: ≤ 200 Zeichen · Quelle: `config/home-concept-copy.json` (`processBody`)

| | Text |
|---|---|
| DE | Pascal begleitet Ihr Projekt vom ersten Gespräch bis zur Übergabe. Sie sehen früh, welche Richtung entsteht, was enthalten ist und welche Entscheidung als Nächstes ansteht. |
| NL | Pascal begeleidt uw project van het eerste gesprek tot de oplevering. U ziet vroeg welke richting ontstaat, wat inbegrepen is en welke beslissing als volgende aan de orde is. |
| FR | Pascal accompagne votre projet du premier échange à la livraison. Vous voyez tôt la direction qui se dessine, ce qui est inclus et la prochaine décision à prendre. |
| EN | Pascal guides your project from the first conversation to handover. You see early which direction is taking shape, what is included and which decision comes next. |

### `home.process.steps`
Zweck: der Weg in vier Schritten · Richtwert: Titel ≤ 50, Text ≤ 150 Zeichen · Quelle: `config/home-concept-copy.json` (`steps`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.process.step.1.title` | Wir verstehen, was Sie erreichen möchten. | We begrijpen wat u wilt bereiken. | Nous comprenons ce que vous voulez atteindre. | We understand what you want to achieve. |
| `home.process.step.1.body` | Wir sprechen über Ihr Angebot, Ihre Kunden, die bisherige Lösung und den Maßstab, an dem das Ergebnis bestehen muss. | We spreken over uw aanbod, uw klanten, de huidige oplossing en de maatstaf waaraan het resultaat moet voldoen. | Nous parlons de votre offre, de vos clients, de la solution actuelle et du niveau auquel le résultat doit se mesurer. | We talk about your offer, your customers, the current setup and the standard the result has to meet. |
| `home.process.step.2.title` | Sie erhalten einen klaren Leistungsrahmen. | U krijgt een helder kader. | Vous recevez un cadre de prestations clair. | You receive a clear scope. |
| `home.process.step.2.body` | Leistungen, Ihre Mitwirkung, Termine, sinnvolle Optionen und Kosten stehen verständlich und getrennt voneinander. | Diensten, uw inbreng, planning, zinvolle opties en kosten staan er begrijpelijk en gescheiden in. | Prestations, votre contribution, calendrier, options utiles et coûts y figurent clairement et séparément. | Services, your part, dates, sensible options and costs are set out clearly and separately. |
| `home.process.step.3.title` | Konzept, Text und Design entstehen gemeinsam. | Concept, tekst en ontwerp ontstaan samen. | Concept, textes et design se construisent ensemble. | Concept, copy and design take shape together. |
| `home.process.step.3.body` | An vereinbarten Punkten sehen Sie ein schlüssiges Gesamtbild und entscheiden, wie es weitergeht. | Op afgesproken momenten ziet u een samenhangend geheel en beslist u hoe het verdergaat. | Aux étapes convenues, vous voyez un ensemble cohérent et décidez de la suite. | At agreed points you see a coherent whole and decide how to proceed. |
| `home.process.step.4.title` | Wir prüfen, übergeben und bleiben erreichbar. | We testen, leveren op en blijven bereikbaar. | Nous vérifions, livrons et restons joignables. | We check, hand over and stay reachable. |
| `home.process.step.4.body` | Das vereinbarte Ergebnis wird geprüft und nachvollziehbar übergeben. Pflege und Weiterentwicklung können Sie passend ergänzen. | Het afgesproken resultaat wordt getest en navolgbaar opgeleverd. Onderhoud en doorontwikkeling kunt u naar wens toevoegen. | Le résultat convenu est vérifié et remis de façon documentée. Vous pouvez y ajouter maintenance et évolutions selon vos besoins. | The agreed result is checked and handed over with a clear record. You can add maintenance and further development as needed. |

---

## Produktwelt

### `home.products.kicker`
Zweck: Vorzeile · Richtwert: ≤ 25 Zeichen · Quelle: `config/home-concept-copy.json` (`productsKicker`)

| | Text |
|---|---|
| DE | Produkte von NeXify |
| NL | Producten van NeXify |
| FR | Les produits NeXify |
| EN | Products by NeXify |

### `home.products.title`
Zweck: Abschnittskopf · Richtwert: ≤ 45 Zeichen · Quelle: `config/home-concept-copy.json` (`productsTitle`)

| | Text |
|---|---|
| DE | Eigene Werkzeuge für konkrete Arbeit. |
| NL | Eigen tools voor concreet werk. |
| FR | Nos propres outils, pour un travail concret. |
| EN | Our own tools for real work. |

### `home.products.body`
Zweck: ordnet die Produkte ein, ohne Verfügbarkeit zu behaupten · Richtwert: ≤ 160 Zeichen · Quelle: `config/home-concept-copy.json` (`productsBody`), Namen nach D-011. Welche Funktionen heute nutzbar sind, ist je Produkt nicht belegt (`LUECKEN.md` L-07).

| | Text |
|---|---|
| DE | Jedes unserer Produkte hat eine eigene Aufgabe. Wir sagen Ihnen offen, welches zu Ihrem Vorhaben passt und was davon heute bereitsteht. |
| NL | Elk van onze producten heeft een eigen taak. We zeggen u eerlijk welk product bij uw plan past en wat daarvan nu beschikbaar is. |
| FR | Chacun de nos produits a une mission propre. Nous vous disons franchement lequel convient à votre projet et ce qui est disponible aujourd’hui. |
| EN | Each of our products has its own job. We tell you plainly which one suits your project and what is available today. |

### `home.products.cards`
Zweck: vier Karten in der bestehenden Reihenfolge · Richtwert: Text ≤ 120, Verweis ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`products`); Namen nach D-011. Ausführlicher: `03-produkte.md`.

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.products.card.1.name` | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite |
| `home.products.card.1.body` | Ihr eigener Arbeitsbereich für Gespräche, Aufgaben, Dokumente und Wissen. | Uw eigen werkomgeving voor gesprekken, taken, documenten en kennis. | Votre propre espace de travail pour vos échanges, tâches, documents et connaissances. | Your own workspace for conversations, tasks, documents and knowledge. |
| `home.products.card.1.link` | Die Suite kennenlernen | De suite leren kennen | Découvrir la suite | Get to know the suite |
| `home.products.card.2.name` | NeX Agentic | NeX Agentic | NeX Agentic | NeX Agentic |
| `home.products.card.2.body` | Übernimmt klar umrissene Aufgaben – mit den Werkzeugen, die dafür zugelassen sind. | Neemt duidelijk afgebakende taken over – met de tools die daarvoor zijn toegestaan. | Prend en charge des tâches bien délimitées, avec les outils autorisés pour cela. | Takes on clearly defined tasks – with the tools approved for them. |
| `home.products.card.2.link` | NeX Agentic ansehen | NeX Agentic bekijken | Voir NeX Agentic | View NeX Agentic |
| `home.products.card.3.name` | NeXify API | NeXify API | NeXify API | NeXify API |
| `home.products.card.3.body` | Bindet NeXify-Funktionen in Ihre eigene Anwendung ein. Umfang und Zugang klären wir für Ihre Verbindung. | Koppelt NeXify-functies aan uw eigen toepassing. Omvang en toegang stemmen we af voor uw koppeling. | Intègre les fonctions NeXify à votre propre application. Périmètre et accès sont définis pour votre connexion. | Brings NeXify functions into your own application. Scope and access are settled for your connection. |
| `home.products.card.3.link` | NeXify API ansehen | NeXify API bekijken | Voir NeXify API | View NeXify API |
| `home.products.card.4.name` | TEILEKLAR | TEILEKLAR | TEILEKLAR | TEILEKLAR |
| `home.products.card.4.body` | Unsere eigene Marke für Fahrzeugteile, Werkstätten und passende Anfragen. | Ons eigen merk voor voertuigonderdelen, werkplaatsen en passende aanvragen. | Notre propre marque pour les pièces automobiles, les ateliers et les demandes adaptées. | Our own brand for vehicle parts, workshops and well-matched enquiries. |
| `home.products.card.4.link` | TEILEKLAR entdecken | TEILEKLAR ontdekken | Découvrir TEILEKLAR | Explore TEILEKLAR |

---

## Kosten und Umfang

Der Abschnitt nennt keinen Betrag. Das Betragsfeld des Bestands (`hc-rate`) entfällt, bis ein Preis freigegeben ist (`LUECKEN.md` L-02).

### `home.budget.kicker`
Zweck: Vorzeile · Richtwert: ≤ 25 Zeichen · Quelle: `config/home-concept-copy.json` (`budgetKicker`)

| | Text |
|---|---|
| DE | Kosten und Umfang |
| NL | Kosten en omvang |
| FR | Coûts et périmètre |
| EN | Cost and scope |

### `home.budget.title`
Zweck: dritter Stützsatz der Marke · Richtwert: ≤ 50 Zeichen · Quelle: `config/home-concept-copy.json` (`budgetTitle`)

| | Text |
|---|---|
| DE | Sie wissen vor dem Start, was enthalten ist. |
| NL | U weet vooraf wat inbegrepen is. |
| FR | Vous savez, avant de commencer, ce qui est inclus. |
| EN | You know what is included before work begins. |

### `home.budget.body`
Zweck: erklärt den Weg zum Angebot, ohne Betrag und ohne Preisaussage · Richtwert: ≤ 170 Zeichen · Quelle: `config/home-concept-copy.json` (`budgetBody`, zweiter Satz); `config/site-map.json` Seite `pricing`

| | Text |
|---|---|
| DE | Vor dem Start erhalten Sie ein Angebot mit klar abgegrenztem Umfang. Sie entscheiden, was jetzt entsteht und was später folgt. |
| NL | Vóór de start ontvangt u een offerte met een duidelijk afgebakende omvang. U beslist wat nu ontstaat en wat later volgt. |
| FR | Avant de commencer, vous recevez une offre au périmètre clairement délimité. Vous décidez de ce qui se fait maintenant et de ce qui viendra plus tard. |
| EN | Before work begins you receive a proposal with a clearly defined scope. You decide what is built now and what follows later. |

### `home.budget.costs`
Zweck: die drei Kostenarten, getrennt · Richtwert: Titel ≤ 20, Text ≤ 130 Zeichen · Quelle: `config/home-concept-copy.json` (`costs`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.budget.cost.1.title` | Entwicklung | Ontwikkeling | Réalisation | Development |
| `home.budget.cost.1.body` | Konzept, Text, Design und technische Umsetzung sind im Angebot einem konkreten Ergebnis zugeordnet. | Concept, tekst, ontwerp en technische uitvoering zijn in de offerte aan een concreet resultaat gekoppeld. | Concept, textes, design et réalisation technique sont rattachés, dans l’offre, à un résultat précis. | Concept, copy, design and build are each tied to a concrete result in the proposal. |
| `home.budget.cost.2.title` | Betreuung danach | Begeleiding daarna | Accompagnement ensuite | Support afterwards |
| `home.budget.cost.2.body` | Pflege, Weiterentwicklung und persönliche Unterstützung vereinbaren wir als eigenen Baustein. | Onderhoud, doorontwikkeling en persoonlijke ondersteuning spreken we af als afzonderlijk onderdeel. | Maintenance, évolutions et assistance personnelle font l’objet d’un volet distinct. | Maintenance, further development and personal support are agreed as a separate part. |
| `home.budget.cost.3.title` | Externe Kosten | Externe kosten | Coûts externes | External costs |
| `home.budget.cost.3.body` | Hosting, Software, KI-Nutzung, Medien- und Werbebudget weisen wir offen aus. Sie stecken nicht im Projektpreis. | Hosting, software, AI-gebruik, media- en advertentiebudget vermelden we open. Ze zitten niet in de projectprijs. | Hébergement, logiciels, usage de l’IA, budget médias et publicité sont indiqués ouvertement. Ils ne sont pas noyés dans le prix du projet. | Hosting, software, AI usage, media and ad budget are shown openly. They are not folded into the project price. |

### `home.budget.rate`
LÜCKE: braucht Entscheidung EV-11 (welcher Preis öffentlich stehen darf). Bis dahin kein Baustein. Siehe `LUECKEN.md` L-02.

### `home.budget.link`
Zweck: Verweis auf die Seite „Preise & Ablauf“ · Richtwert: ≤ 35 Zeichen · Quelle: `config/home-concept-copy.json` (`budgetLink`)

| | Text |
|---|---|
| DE | Mehr zu Kosten und Ablauf |
| NL | Meer over kosten en aanpak |
| FR | En savoir plus sur les coûts et le déroulement |
| EN | More on cost and process |

---

## Abschluss

### `home.finish.kicker`
Zweck: Einladung in einem Satz · Richtwert: ≤ 20 Zeichen · Quelle: `config/home-concept-copy.json` (`finishKicker`)

| | Text |
|---|---|
| DE | Kommen Sie rein. |
| NL | Kom binnen. |
| FR | Entrez. |
| EN | Come on in. |

### `home.finish.title`
Zweck: die Frage, mit der das Gespräch beginnt · Richtwert: ≤ 30 Zeichen · Quelle: `config/home-concept-copy.json` (`finishTitle`); deckt sich mit dem Schlusssatz des Hero-Films

| | Text |
|---|---|
| DE | Woran arbeiten Sie gerade? |
| NL | Waar werkt u nu aan? |
| FR | Sur quoi travaillez-vous en ce moment ? |
| EN | What are you working on right now? |

### `home.finish.body`
Zweck: senkt die Schwelle; der Kunde behält die Entscheidung · Richtwert: ≤ 190 Zeichen · Quelle: `config/home-concept-copy.json` (`finishBody`)

| | Text |
|---|---|
| DE | Eine Website, ein Shop oder ein Ablauf, der jeden Tag Zeit kostet: Ein paar Sätze genügen für den Anfang. Ob daraus eine persönliche Anfrage wird, entscheiden Sie. |
| NL | Een website, een webshop of een proces dat elke dag tijd kost: een paar zinnen volstaan om te beginnen. Of daar een persoonlijke aanvraag uit voortkomt, bepaalt u. |
| FR | Un site, une boutique en ligne ou un processus qui prend du temps chaque jour : quelques phrases suffisent pour commencer. C’est vous qui décidez s’il en naît une demande personnelle. |
| EN | A website, a shop or a process that takes time every day: a few sentences are enough to begin. Whether it becomes a personal enquiry is up to you. |

### `home.finish.cta`
Zweck: Haupthandlung; öffnet den Chat · Richtwert: ≤ 20 Zeichen · Quelle: `config/home-concept-copy.json` (`finishCta`)

| | Text |
|---|---|
| DE | Vorhaben schildern |
| NL | Uw plan beschrijven |
| FR | Décrire votre projet |
| EN | Describe your project |

### `home.finish.alternative`
Zweck: zweite Handlung · Richtwert: ≤ 20 Zeichen · Quelle: `config/home-concept-copy.json` (`finishAlternative`), vereinheitlicht

| | Text |
|---|---|
| DE | Leistungen ansehen |
| NL | Diensten bekijken |
| FR | Voir les prestations |
| EN | View services |

---

## Fuß

### `home.footer.invite`
Zweck: letzte Einladung über dem Fuß · Richtwert: Titel ≤ 50, Text ≤ 110 Zeichen · Quelle: `apps/web/components/SiteFooter.tsx` (`invitation`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.footer.invite.title` | Lassen Sie uns über Ihr Vorhaben sprechen. | Laten we over uw plan praten. | Parlons de votre projet. | Let us talk about your project. |
| `home.footer.invite.body` | Erzählen Sie, was Sie verändern möchten. Den nächsten Schritt klären wir gemeinsam. | Vertel wat u wilt veranderen. De volgende stap bepalen we samen. | Dites-nous ce que vous souhaitez changer. Nous définirons ensemble la prochaine étape. | Tell us what you would like to change. We will work out the next step together. |
| `home.footer.invite.cta` | Vorhaben schildern | Uw plan beschrijven | Décrire votre projet | Describe your project |

### `home.footer.intro`
Zweck: das Unternehmen in einem Satz · Richtwert: ≤ 170 Zeichen · Quelle: `SiteFooter.tsx` (`intro`); Kernsatz und Stützsätze aus `docs/marke/markenarchitektur-2026-11-14.md`

| | Text |
|---|---|
| DE | NeXify AI FACTORY baut Websites, Apps, Shops und KI für Unternehmen. Persönlich begleitet von Pascal Courbois, mit einem Umfang, den Sie vor dem Start kennen. |
| NL | NeXify AI FACTORY bouwt websites, apps, webshops en AI voor bedrijven. Persoonlijk begeleid door Pascal Courbois, met een omvang die u vooraf kent. |
| FR | NeXify AI FACTORY conçoit sites web, applications, boutiques en ligne et IA pour les entreprises. Avec l’accompagnement personnel de Pascal Courbois et un périmètre que vous connaissez avant de commencer. |
| EN | NeXify AI FACTORY builds websites, apps, shops and AI for businesses. Personally guided by Pascal Courbois, with a scope you know before work begins. |

### `home.footer.claim`
Zweck: Claim unter der Wortmarke · Richtwert: 21 Zeichen, fest · Quelle: `SiteFooter.tsx` (`claim`); D-011. In allen Sprachen englisch und unverändert.

| | Text |
|---|---|
| DE · NL · FR · EN | Chat it. Automate it. |

### `home.footer.columns`
Zweck: Spaltenköpfe · Richtwert: ≤ 20 Zeichen · Quelle: `SiteFooter.tsx`

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.footer.columns.services` | Leistungen | Diensten | Prestations | Services |
| `home.footer.columns.products` | Produkte | Producten | Produits | Products |
| `home.footer.columns.company` | Unternehmen | Bedrijf | Entreprise | Company |
| `home.footer.columns.legal` | Rechtliches | Juridisch | Informations légales | Legal |
| `home.footer.columns.account` | Konto | Account | Compte | Account |
| `home.footer.columns.language` | Sprache | Taal | Langue | Language |

### `home.footer.links`
Zweck: Verweise im Fuß · Richtwert: ≤ 30 Zeichen · Quelle: `config/public-interface-copy.json` (`footerLinks`); Produktnamen nach D-011

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `home.footer.links.websites` | Websites & Markenauftritt | Websites & merkuitstraling | Sites web et image de marque | Websites & brand presence |
| `home.footer.links.automation` | Automatisierung & KI | Automatisering & AI | Automatisation et IA | Automation & AI |
| `home.footer.links.apps` | Apps & Portale | Apps & portalen | Applications et portails | Apps & portals |
| `home.footer.links.campaigns` | Landingpages & Kampagnen | Landingspagina’s & campagnes | Pages d’atterrissage et campagnes | Landing pages & campaigns |
| `home.footer.links.pricing` | Kosten & Ablauf | Kosten & aanpak | Coûts et déroulement | Cost & process |
| `home.footer.links.suite` | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite | NeX & AIFly ORACLE Suite |
| `home.footer.links.agentic` | NeX Agentic | NeX Agentic | NeX Agentic | NeX Agentic |
| `home.footer.links.api` | NeXify API | NeXify API | NeXify API | NeXify API |
| `home.footer.links.teileklar` | TEILEKLAR | TEILEKLAR | TEILEKLAR | TEILEKLAR |
| `home.footer.links.company` | Über NeXify AI | Over NeXify AI | À propos de NeXify AI | About NeXify AI |
| `home.footer.links.contact` | Kontakt | Contact | Contact | Contact |
| `home.footer.links.login` | Anmelden | Inloggen | Se connecter | Sign in |
| `home.footer.links.signup` | Konto erstellen | Account aanmaken | Créer un compte | Create account |
| `home.footer.links.imprint` | Impressum | Bedrijfsgegevens | Mentions légales | Legal notice |
| `home.footer.links.privacy` | Datenschutz | Privacy | Confidentialité | Privacy |
| `home.footer.links.terms` | Vertragsgrundlagen | Voorwaarden | Conditions contractuelles | Terms |
| `home.footer.links.ai` | KI-Hinweise | AI-informatie | Informations sur l’IA | AI information |
| `home.footer.links.accessibility` | Barrierefreiheit | Toegankelijkheid | Accessibilité | Accessibility |
| `home.footer.links.cookies` | Datenschutzeinstellungen | Privacy-instellingen | Préférences de confidentialité | Privacy settings |

### `home.footer.contact`
Zweck: die eine Kontaktadresse · Richtwert: fest · Quelle: D-011

| | Text |
|---|---|
| DE · NL · FR · EN | mail@nexifyai.cloud |

### `home.footer.copyright`
Zweck: Urheberzeile ohne Rechtsform · Richtwert: ≤ 30 Zeichen · Quelle: D-011 (keine Rechtsform)

| | Text |
|---|---|
| DE · NL · FR · EN | © {{jahr}} NeXify AI FACTORY |

### `home.footer.legal.notice`
LÜCKE: braucht Entscheidung EV-05 (Rechtsträger) und EV-07 (Rechtstexte). Der Bestand meldet dort „Entwicklungsstand“ und „stehen noch zur Prüfung und Freigabe“. Ein wahrer, ruhiger Hinweis lässt sich erst schreiben, wenn feststeht, welche Angaben gelten. Siehe `LUECKEN.md` L-04.
