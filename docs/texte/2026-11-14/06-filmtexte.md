# 06 · Filmtexte

Stand: 14.11.2026 · Entwurf · Basis: `DECISIONS.md` D-012 (Sie, auch im Film), D-011 (voller Name).

Ausgangspunkt sind die Sprechertexte in `config/home-film-scripts.json` (Quelle dort: Masterplan §8.7). Sie duzen durchgehend und nennen das KI-System „AI Fly Oracle“. Diese Vorlage überträgt sie in die Sie-Form und setzt den vollen Namen. Am Inhalt ändert sie nichts, außer dort, wo es vermerkt ist.

Deutsch ist die gesprochene Fassung. Niederländisch, Französisch und Englisch sind als Untertitel angelegt; gesprochene Fassungen brauchen ein Ausspracheblatt und eine Freigabe je Stimme (`LUECKEN.md` L-18).

Zur Länge: Der volle Name des KI-Systems braucht gesprochen mehrere Sekunden. Er fällt deshalb je Film genau einmal, bei der Vorstellung. Danach spricht das KI-System in der Ich-Form.

---

## Hero-Film

### `film.hero`
Zweck: Begrüßung durch Pascal im Hero der Startseite. **Der deutsche Text ist vom Inhaber festgelegt und wird nicht verändert.** · Richtwert: 161 Zeichen, fest · Quelle: Auftrag 14.11.2026 („Hero ist fest“); `AGENTS.md` (Hero liefert die Videoaufnahme, Pascal unverfremdet). Der Satz enthält den Anspruch „in höchster Qualität und zu einem fairen Preis“; Pascal spricht ihn als seinen Anspruch aus (`LUECKEN.md` L-01).

Sprecher: Pascal.

| | Text |
|---|---|
| DE | Guten Tag, ich bin Pascal. Wir bauen Websites, Shops und KI-Lösungen in höchster Qualität und zu einem fairen Preis. Erzählen Sie mir, woran Sie gerade arbeiten. |
| NL (Untertitel) | Goedendag, ik ben Pascal. Wij bouwen websites, webshops en AI-oplossingen van de hoogste kwaliteit en voor een eerlijke prijs. Vertel me waar u op dit moment aan werkt. |
| FR (Untertitel) | Bonjour, je suis Pascal. Nous concevons des sites web, des boutiques en ligne et des solutions d’IA de la plus haute qualité, à un prix juste. Dites-moi sur quoi vous travaillez en ce moment. |
| EN (Untertitel) | Hello, I’m Pascal. We build websites, shops and AI solutions to the highest quality and at a fair price. Tell me what you are working on right now. |

Hinweis: Der bisherige Begrüßungsfilm (`FILM-home-welcome`) ließ zusätzlich NeX und das KI-System sprechen. Mit dem festgelegten Hero-Text spricht im Hero nur Pascal. Ob die Begrüßung zu dritt an anderer Stelle bleibt, ist offen (`LUECKEN.md` L-18).

### `film.captions`
Zweck: Einblendungen zum Sprecher und Abbinder · Richtwert: ≤ 50 Zeichen · Quelle: D-011; `config/brand-names.json`

| Kennung | DE · NL · FR · EN |
|---|---|
| `film.captions.pascal` | Pascal Courbois · NeXify AI FACTORY |
| `film.captions.nex` | NeX |
| `film.captions.system` | AIFly ORACLE with NeXify AI Intelligence by NeXify |
| `film.captions.claim` | Chat it. Automate it. |

---

## Film „Ihr Vorhaben“

Entspricht `FILM-home-project` (Abschnitt S01, 45 bis 55 Sekunden laut Quelle).

### `film.project`
Zweck: nimmt die Scheu vor dem ersten Schritt. Erst das Vorhaben, dann die Technik · Richtwert: je Zeile ≤ 260 Zeichen · Quelle: `config/home-film-scripts.json` (`FILM-home-project`). Geändert: Sie-Form; NeX und das KI-System stellen sich vor, weil die Begrüßung zu dritt im Hero entfällt.

| Zeile | Sprecher | DE | NL (Untertitel) | FR (Untertitel) | EN (Untertitel) |
|---|---|---|---|---|---|
| `film.project.1` | Pascal | Bevor wir über Technik sprechen, schauen wir auf Ihr Vorhaben. Was soll für Ihre Kunden oder Ihr Team einfacher werden? Eine fertige Lösung brauchen Sie dafür noch nicht. | Voordat we over techniek praten, kijken we naar uw plan. Wat moet er voor uw klanten of uw team eenvoudiger worden? Een kant-en-klare oplossing heeft u daarvoor nog niet nodig. | Avant de parler technique, regardons votre projet. Qu’est-ce qui doit devenir plus simple pour vos clients ou votre équipe ? Vous n’avez pas encore besoin d’une solution toute faite. | Before we talk about technology, let us look at your project. What should become easier for your customers or your team? You do not need a finished solution for that yet. |
| `film.project.2` | NeX | Ich bin NeX. Ein Beispiel aus Ihrem Alltag hilft: Wo beginnt die Arbeit, welche Informationen werden gebraucht, und was soll am Ende vorliegen? | Ik ben NeX. Een voorbeeld uit uw dagelijkse praktijk helpt: waar begint het werk, welke informatie is nodig en wat moet er aan het eind liggen? | Je suis NeX. Un exemple tiré de votre quotidien aide : où commence le travail, quelles informations faut-il, et que doit-on avoir à la fin ? | I am NeX. An example from your working day helps: where does the work begin, what information is needed, and what should be there at the end? |
| `film.project.3` | KI-System | Ich bin AIFly ORACLE with NeXify AI Intelligence by NeXify. Ich ordne Ihr Ziel, Ihre vorhandenen Systeme und die offenen Fragen. So wird sichtbar, welcher Schritt als Nächstes sinnvoll ist. Zugangsdaten brauchen Sie für diese erste Beschreibung nicht. | Ik ben AIFly ORACLE with NeXify AI Intelligence by NeXify. Ik orden uw doel, uw bestaande systemen en de open vragen. Zo wordt zichtbaar welke stap nu zinvol is. Inloggegevens heeft u voor deze eerste beschrijving niet nodig. | Je suis AIFly ORACLE with NeXify AI Intelligence by NeXify. Je mets en ordre votre objectif, vos systèmes existants et les questions ouvertes. On voit ainsi quelle étape a du sens ensuite. Aucun identifiant n’est nécessaire pour cette première description. | I am AIFly ORACLE with NeXify AI Intelligence by NeXify. I put your goal, your existing systems and the open questions in order. That shows which step makes sense next. You do not need any login details for this first description. |
| `film.project.4` | Pascal | Erzählen Sie uns kurz, was Sie verändern möchten. Den passenden Umfang klären wir gemeinsam. | Vertel ons kort wat u wilt veranderen. De passende omvang bepalen we samen. | Dites-nous en quelques mots ce que vous souhaitez changer. Nous définirons ensemble le périmètre adapté. | Tell us briefly what you would like to change. We will work out the right scope together. |

---

## Film „Ihr Einstieg“

Entspricht `FILM-home-choice` (Abschnitt S02, 45 bis 55 Sekunden laut Quelle).

### `film.choice`
Zweck: hilft, den passenden Bereich zu wählen · Richtwert: je Zeile ≤ 230 Zeichen · Quelle: `config/home-film-scripts.json` (`FILM-home-choice`). Geändert: nur die Anrede.

| Zeile | Sprecher | DE | NL (Untertitel) | FR (Untertitel) | EN (Untertitel) |
|---|---|---|---|---|---|
| `film.choice.1` | NeX | Möchten Sie Ihr Angebot im Internet verständlich zeigen? Dann ist der Website-Bereich ein guter Einstieg. Dort geht es um Inhalte, Gestaltung und den Weg zur Anfrage. | Wilt u uw aanbod online begrijpelijk laten zien? Dan is het onderdeel websites een goed begin. Daar gaat het om inhoud, vormgeving en de weg naar een aanvraag. | Vous souhaitez présenter clairement votre offre en ligne ? La partie consacrée aux sites web est alors un bon point de départ. Il y est question de contenus, de design et du chemin vers la demande. | Would you like to show your offer clearly online? Then the website section is a good place to start. It covers content, design and the path to an enquiry. |
| `film.choice.2` | Pascal | Wenn sich eine Aufgabe ständig wiederholt, schauen wir auf den Ablauf dahinter. Gemeinsam klären wir, welche Schritte sich verbinden lassen und wo Menschen entscheiden sollen. | Als een taak zich steeds herhaalt, kijken we naar het proces erachter. Samen bepalen we welke stappen te koppelen zijn en waar mensen moeten beslissen. | Lorsqu’une tâche se répète sans cesse, nous regardons le processus qui se trouve derrière. Nous voyons ensemble quelles étapes peuvent être reliées et où les personnes doivent décider. | When a task keeps repeating, we look at the process behind it. Together we work out which steps can be connected and where people should decide. |
| `film.choice.3` | KI-System | Geht es um Informationen und Zusammenarbeit, kann eine App oder ein Portal der passende Weg sein. Entscheidend ist, was Ihre Kunden oder Ihr Team dort tatsächlich erledigen sollen. | Gaat het om informatie en samenwerking, dan kan een app of een portaal de passende weg zijn. Bepalend is wat uw klanten of uw team daar werkelijk moeten kunnen doen. | S’il s’agit d’informations et de collaboration, une application ou un portail peut être la bonne voie. L’essentiel est ce que vos clients ou votre équipe doivent réellement y accomplir. | If it is about information and working together, an app or a portal may be the right route. What matters is what your customers or your team actually need to get done there. |
| `film.choice.4` | Pascal | Wählen Sie den Bereich, der zu Ihrem Vorhaben passt. Wenn Sie unsicher sind, helfen wir Ihnen beim Einordnen. | Kies het onderdeel dat bij uw plan past. Twijfelt u, dan helpen we u bij het bepalen. | Choisissez la partie qui correspond à votre projet. En cas de doute, nous vous aidons à vous orienter. | Choose the section that suits your project. If you are unsure, we will help you find your way. |

---

## Bedienung

### `film.controls`
Zweck: Beschriftungen der Filmsteuerung · Richtwert: ≤ 30 Zeichen · Quelle: `apps/web/components/HomeStudioScene.tsx` (`play`, `pause`, `fallback`)

| Kennung | DE | NL | FR | EN |
|---|---|---|---|---|
| `film.controls.play` | Film abspielen | Film afspelen | Lire le film | Play film |
| `film.controls.pause` | Film anhalten | Film pauzeren | Mettre le film en pause | Pause film |
| `film.controls.subtitles` | Untertitel | Ondertiteling | Sous-titres | Subtitles |
| `film.controls.transcript` | Text zum Film lesen | Tekst bij de film lezen | Lire le texte du film | Read the film text |
| `film.controls.fallback` | Der Film ist gerade nicht verfügbar. | De film is nu niet beschikbaar. | Le film n’est pas disponible pour le moment. | The film is not available right now. |

### `film.ai.notice`
Zweck: Kennzeichnung KI-gestützter Szenen · Richtwert: ≤ 60 Zeichen · Quelle: `HomeStudioScene.tsx` (`kicker`: „KI-generierte Szene“); `config/site-map.json` Seite `ai-notice` („Bildwelt enthält KI-gestützte Bearbeitungen“). Welche Szenen die Kennzeichnung tragen, legt die Produktion je Medium fest.

| | Text |
|---|---|
| DE | Diese Szene ist mit KI erzeugt. |
| NL | Deze scène is met AI gemaakt. |
| FR | Cette scène a été générée par IA. |
| EN | This scene was generated with AI. |
