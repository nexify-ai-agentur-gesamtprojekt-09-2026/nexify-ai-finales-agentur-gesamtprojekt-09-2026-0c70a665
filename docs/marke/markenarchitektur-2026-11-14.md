# Markenarchitektur NeXify AI FACTORY

Stand: 14.11.2026 · Status: Arbeitsfassung. Entscheidung der Projektleitung vom 14.11.2026, vom Inhaber zu bestätigen (`DECISIONS.md` D-011 bis D-014).

Diese Datei beschreibt die Marke in Worten. Die maschinenlesbare Regel steht in `config/brand-names.json`; `tools/check_brand_names.py` meldet Abweichungen. Die Texte dazu liegen unter `docs/texte/2026-11-14/`.

Grundsatz für alles, was hier steht: nur Belegtes. Keine Preise, Zahlen, Kunden, Referenzen, Garantien oder Lieferzeiten. Wo etwas fehlt, steht es als offen.

---

## 1. Aufbau

```
Dach        NeXify AI FACTORY                 das Unternehmen, ohne Rechtsformzusatz
            NeXify AI                         Dachmarke und Kurzform
            Chat it. Automate it.             Claim
│
├─ Bereiche
│   ├─ Agentur        Marke & Web · Systeme & KI · Wachstum & Kampagnen
│   │                 Projektpakete: Markenstart · KI im Betrieb · Wachstum
│   │                 Betreuung nach der Übergabe: NeXify Care
│   ├─ Produkte       siehe unten
│   └─ Eigene Marke   TEILEKLAR – Teile und Werkstatt, eigener Auftritt
│
├─ Produkte
│   ├─ NeX & AIFly ORACLE Suite       der eigene Arbeitsbereich für Kunden
│   ├─ NeX Agentic                    der ausführende Agent
│   ├─ NeXify AI Intelligence         die eigene KI-Kette als Produktbegriff
│   └─ NeXify API                     die Schnittstelle für eigene Anwendungen
│
├─ Figuren
│   ├─ Pascal                         der Mensch. Inhaber, Gastgeber, Ansprechpartner
│   ├─ NeX                            der Tukan
│   └─ AIFly ORACLE with NeXify AI Intelligence by NeXify
│                                     das KI-System, das im Chat antwortet
│
└─ Technikbegriffe (nur intern)
    Brain · Skills · MCP · Cognee · Prüfwerkzeuge · Mandant · Gate
```

### Was jede Ebene leistet

| Ebene | Aufgabe | Belegt durch |
|---|---|---|
| Dach | Absender. Steht für das Unternehmen und für Pascal als Person dahinter. | `config/site-map.json` (`display_name`), `DECISIONS.md` D-011 |
| Bereich Agentur | Individuelle Projektarbeit in drei Leistungsfeldern, persönlich begleitet. | `config/site-map.json` (Seiten `services`, `scope`), `config/public-interface-copy.json` (`packages`) |
| Bereich Produkte | Eigene Werkzeuge. Jedes hat eine eigene Aufgabe und einen eigenen Zugang. | `config/home-concept-copy.json` (`products`) |
| Eigene Marke TEILEKLAR | Eigener Auftritt für Fahrzeugteile und Werkstattanfragen. Kein Produkt von NeXify AI mit gemeinsamem Konto. | `docs/01-konzept/NeXifyAI-CI-Schema.md`, `AGENTS.md` (getrennte Anwendungskontexte) |
| Figuren | Geben dem Auftritt Gesichter. Pascal bleibt unverfremdet. | `AGENTS.md` (Führungsentscheidung 04.11.2026) |
| Technikbegriffe | Arbeitssprache des Projekts. Erscheinen nicht in Kundentexten. | `DECISIONS.md` D-014 |

### Was offen ist

| Frage | Entscheidet | Vorlage |
|---|---|---|
| Endform des vollen Namens; Kürzungsregel für Seitentitel, Schaltflächen, Alt-Texte | Inhaber | EV-04 |
| Rechtsform des Unternehmens | Inhaber | EV-05 |
| Bedeutung von „NeXify AI Intelligence“ in einem Satz | Inhaber | EV-14 |
| Verhältnis der „NeX & AIFly ORACLE Suite“ zur bisherigen „NeX2fly Suite“; Verbleib von one/one+ | Inhaber | EV-20 |
| Markenrecherche zu den Namen | Inhaber, Fachberatung | EV-19 |
| Aussprache der Namen | Inhaber | – |

---

## 2. Namensregel in Worten

1. **Ein Name, eine Schreibweise.** Jeder Name wird genau so geschrieben wie in `config/brand-names.json`. Namen werden nicht übersetzt, nicht gebeugt und nicht getrennt.

2. **Das KI-System trägt immer den vollen Namen:** „AIFly ORACLE with NeXify AI Intelligence by NeXify“. Es gibt keine Kurzform. Im Chat-Kopf darf der Name auf zwei Zeilen stehen – nach „AIFly ORACLE“ –, das ist Satz und keine Kürzung.

3. **Wiederholungen löst das beschreibende Wort.** Wer den Namen in einem Absatz schon genannt hat, schreibt danach „das KI-System“. Eine Abkürzung des Namens gibt es nicht. Wo der volle Name nicht passt – in einem Seitentitel oder auf einer Schaltfläche –, steht bis zur Entscheidung des Inhabers das beschreibende Wort oder gar kein Name. Diese Kürzungsregel ist offen (EV-04).

4. **Das Unternehmen heißt „NeXify AI FACTORY“.** Ohne Rechtsform. Als Kurzform dient „NeXify AI“, im Fließtext nach der ersten Nennung auch „NeXify“.

5. **Der Claim steht vollständig:** „Chat it. Automate it.“ Englisch in allen Sprachen, zwei Sätze, zwei Punkte, kein Ausrufezeichen. Er steht für sich und wird nicht in einen Satz eingebaut.

6. **Produkte heißen wie Produkte, Figuren wie Figuren.** „NeX“ allein ist der Tukan. Das Produkt heißt „NeX Agentic“. Die Suite heißt „NeX & AIFly ORACLE Suite“; nach der ersten Nennung darf „die Suite“ stehen.

7. **TEILEKLAR steht in Versalien** und ist eine eigene Marke. Im Auftritt von NeXify AI wird sie als „eigene Marke“ vorgestellt, nicht als Produkt.

8. **Eine Kontaktadresse:** mail@nexifyai.cloud.

9. **Nicht verwendet werden:** „Oracle AIFly by NeXify“, „ORACEL“, „Orakel“, „Oracle“ oder „AIFly“ allein, „AI Fly“, „NeX Agentic AI“, „NeX Agentic AIFly“, „NeXifyAI“, „NeXify AI Intelligenz“, „Teileklar“. Die vollständige Liste mit Begründung steht in `config/brand-names.json`.

10. **Technikbegriffe bleiben intern.** In Kundentexten stehen weder Arbeitsbegriffe des Projekts noch der Name eines Lieferanten oder eines Modellanbieters, solange das nicht entschieden ist.

---

## 3. Tonalität

Die Stimme ist die eines Gastgebers, der sein Handwerk kennt: ruhig, genau, zugewandt. Sieben Regeln.

### 3.1 Wir sagen „Sie“

Durchgehend, in jedem Kanal, auch im Film und in der Stimme der Figuren. Niederländisch „u“, Französisch „vous“, Englisch neutral und professionell.

- Richtig: „Erzählen Sie mir, woran Sie gerade arbeiten.“
- Falsch: „Erzähl uns kurz, was du verändern möchtest.“

### 3.2 Ein Gedanke je Satz

Kurze Hauptsätze. Das Verb steht früh. Wer einen Nebensatz braucht, prüft zuerst, ob zwei Sätze genügen.

- Richtig: „Pascal begleitet Ihr Projekt. Vom ersten Gespräch bis zur Übergabe.“
- Falsch: „Im Rahmen unserer ganzheitlichen Projektbegleitung stellen wir sicher, dass Sie über alle Phasen hinweg einen festen Ansprechpartner haben, der Ihr Vorhaben kennt.“

### 3.3 Konkret statt allgemein

Wir nennen die Sache beim Namen: die Website, den Vorgang, das Teil. Ein Beispiel aus dem Alltag ersetzt jedes Adjektiv.

- Richtig: „Eine Website, die Ihr Angebot nicht erklärt. Ein Vorgang, der jeden Tag Zeit kostet.“
- Falsch: „Wir entwickeln innovative digitale Lösungen für Ihren Erfolg.“

### 3.4 Einmal sagen, was es gibt. Einmal sagen, was noch nicht.

Ein Vorbehalt gehört an eine Stelle, klar und ohne Umschweife. Danach steht, was der Leser tun kann.

- Richtig: „Online bestellen können Sie bei TEILEKLAR zurzeit nicht. Ihre Anfrage zu Fahrzeug und Teil nehmen wir entgegen.“
- Falsch: „Eine Produktbeschreibung ersetzt keine bestätigte Freischaltung oder technische Prüfung.“

### 3.5 Nichts versprechen, was nicht belegt ist

Keine Zahl ohne Quelle. Kein Superlativ ohne Beleg. Keine Garantie, keine Lieferzeit, kein Erfolg. Wir beschreiben, was wir tun und was vereinbart wird.

- Richtig: „Sie wissen vor dem Start, was enthalten ist.“
- Falsch: „Garantiert mehr Anfragen – schon nach wenigen Wochen.“

### 3.6 Ein Mensch spricht

Pascal ist genannt, wo er handelt. „Ich“ im Film und in der Mail, „wir“ für die Arbeit, nie ein anonymes Team. Das KI-System sagt, dass es ein KI-System ist.

- Richtig: „Pascal meldet sich persönlich bei Ihnen.“ – aber nur dort, wo es stimmt.
- Falsch: „Unser Expertenteam steht Ihnen jederzeit zur Verfügung.“

### 3.7 Ruhig bleiben

Keine Ausrufezeichen. Kein Werbejargon. Keine Aufzählung aus drei Schlagwörtern, die gut klingt und nichts sagt. Keine internen Begriffe. Auch ein Fehler wird in einem ruhigen Satz gemeldet, mit einem klaren nächsten Schritt.

- Richtig: „Das Gespräch ist gerade nicht erreichbar. Schreiben Sie Pascal direkt.“
- Falsch: „Orientierung anhand der Website · ohne Live-KI“

### Schreibweise

Deutsche Anführungszeichen („ “). Halbgeviertstrich mit Leerzeichen als Gedankenstrich ( – ). Geschütztes Leerzeichen zwischen Zahl und Einheit. Keine Unterstreichungen und keine Pfeilzeichen als Gestaltung im Text.

---

## 4. Botschaftshierarchie

### Kernsatz

> **Ein Gespräch. Ein Projekt, das passt.**

Unterzeile: „Websites, Apps, Shops und KI – aus dem, was Ihr Unternehmen wirklich braucht.“

Der Kernsatz ist die ausgelieferte Überschrift der Startseite (`apps/web/components/IdentityHero.tsx`, `config/site-map.json` Seite `home`) und Basis nach `DECISIONS.md` D-013. Er verspricht kein Ergebnis. Er beschreibt den Weg: erst zuhören, dann bauen.

### Drei Stützsätze

| Nr. | Stützsatz | Womit er belegt ist | Was als Beleg noch fehlt |
|---|---|---|---|
| 1 | **Wir beginnen bei Ihrer Aufgabe.** Marke und Website, Abläufe und KI, Kampagnen: Wir bauen, was Ihr Unternehmen braucht, und beginnen mit einer konkreten Stelle. | Drei Leistungsfelder und drei Projektpakete (`config/site-map.json` Seiten `services`, `scope`; `config/public-interface-copy.json` `packages`). „Wir beginnen bewusst mit einem Ablauf.“ (`config/home-concept-copy.json`, `offers`). | Ein gezeigtes Beispiel: der eigene Auftritt oder ein freigegebener Fall. |
| 2 | **Pascal begleitet Sie persönlich.** Vom ersten Gespräch bis zur Übergabe haben Sie einen Ansprechpartner. | `config/home-concept-copy.json` (`processTitle`, `processBody`); `config/site-map.json` Seite `company`; Hero der Startseite. | Porträt mit Freigabe; Angaben zur Person und zum Unternehmen. |
| 3 | **Sie wissen vor dem Start, was enthalten ist.** Entwicklung, Betreuung danach und externe Kosten stehen getrennt im Angebot. | `config/home-concept-copy.json` (`budgetTitle`, `costs`); `config/site-map.json` Seite `pricing`. | Mindestens eine freigegebene Preisangabe (EV-11). |

### Der Anspruch des Inhabers

„Luxus und höchste Qualität zum fairen Preis, persönlich begleitet von Pascal.“

Das ist die Haltung hinter allen drei Stützsätzen. Als Beleg trägt sie heute zweierlei: die Gestaltungsrichtung (`DECISIONS.md` USER-LUXURY-20261101, D-015) und die persönliche Begleitung. „Höchste Qualität“ und „fairer Preis“ sind im Repository nicht durch Vergleich oder Preis belegt (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, R-13). In den Vorlagen steht der Satz deshalb nur dort, wo Pascal ihn als seinen Anspruch ausspricht – im Hero und im Film. Ob er auch als Sachaussage im Fließtext stehen darf, entscheidet der Inhaber (EV-18).

### Was wir nicht als Beleg verwenden

Kundenstimmen, Referenzen, Kennzahlen, Auszeichnungen, Erfahrungszahlen aus älteren Konzepten, Vergleiche mit Wettbewerbern, Aussagen zur Leistung oder zu den Kosten der KI. Nichts davon ist belegt (`AGENTS.md`, „Ehrlich bleiben“).

---

## 5. Wortliste

### Sagen wir

| Wort oder Wendung | Wofür |
|---|---|
| Vorhaben, Projekt | das, was der Kunde vorhat |
| Gespräch | der Anfang jeder Zusammenarbeit |
| Vorhaben schildern | der eine Wortlaut für den ersten Schritt |
| Anfrage | was der Kunde absendet |
| Angebot | was der Kunde von Pascal erhält |
| Umfang | was enthalten ist |
| Übergabe | das Ende des Projekts |
| Betreuung danach | Pflege und Weiterentwicklung |
| externe Kosten | Hosting, Software, KI-Nutzung, Medien- und Werbebudget |
| Ablauf, Vorgang | statt „Prozess“ und „Workflow“ |
| Arbeitsbereich | die Suite aus Sicht des Kunden |
| Zugang, Konto | statt „Account“ |
| KI-System | das beschreibende Wort zum vollen Namen |
| eigene Marke | TEILEKLAR im Auftritt von NeXify AI |
| Werkstatt, Betrieb | der Partner bei TEILEKLAR |
| zurzeit, noch nicht | der eine klare Hinweis auf den Stand |
| Pascal, Pascal Courbois | immer mit Namen |

### Sagen wir nicht

| Wort oder Wendung | Warum nicht | Stattdessen |
|---|---|---|
| ohne Live-KI, Entwicklungsvorschau, Zielbild, Betriebsstand | interner Jargon | den Zustand in einem Satz beschreiben |
| Gate, Mandant, Tenant, Lease, Brain, Freischaltung | interner Jargon | Zugang, Arbeitsbereich, Prüfung |
| Orakel, Oracle, AIFly (allein) | keine Kurzform | der volle Name oder „das KI-System“ |
| kostenfrei, kostenlos, gratis | vom Inhaber nicht definiert | weglassen |
| garantiert, sicher, immer, sofort | Zusage ohne Beleg | beschreiben, was vereinbart wird |
| beste, führend, einzigartig, überragend | Superlativ ohne Beleg | weglassen |
| kosteneffizient, günstiger als | Kostenaussage ohne Beleg | weglassen |
| innovativ, ganzheitlich, maßgeschneidert, Lösungen | Werbejargon | die Sache nennen |
| Autopilot, vollautomatisch | verspricht mehr, als belegt ist | beschreiben, welcher Schritt übernommen wird |
| Expertenteam, wir als Team | es gibt einen Ansprechpartner | Pascal |
| Du, dein, euch | Anrede ist „Sie“ | Sie, Ihr |
| B.V., Eenmanszaak | Rechtsform ungeklärt | NeXify AI FACTORY |
| Name eines Lieferanten oder Modellanbieters | nicht entschieden, rechtlich zu prüfen | weglassen oder Platzhalter |
| Kunden vertrauen uns, bewährt, erfahren | Referenz ohne Beleg | weglassen |
| in wenigen Tagen, kurzfristig | Lieferzeit ohne Beleg | „Termine vereinbaren wir im Angebot“ |
