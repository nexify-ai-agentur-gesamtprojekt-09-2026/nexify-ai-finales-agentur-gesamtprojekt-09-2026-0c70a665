// TEILEKLAR Produktseite: Texte nach dem Konzept "Jedes Teil mit Passungsangabe".
// Ehrlichkeitsregel (SOLL-IST-Beleg): Keine erfundene Passung, kein erfundener Bestand,
// keine erfundenen Preise. Fehlt eine Fahrzeugzuordnung, steht das sichtbar da – mit Prüfweg.
export type StoryLocale = "de" | "nl" | "fr" | "en";
export type GuideKind = "brakes" | "battery" | "lighting" | "filters" | "suspension" | "tires" | "generic";

export type Guide = { name: string; plain: string; points: string[]; pitfall: string; install: string[] };

export function guideKind(text: string): GuideKind {
  // Wortgrenzen bewusst: „Klebeband“, „Zierstreifen“ oder „Lichtmaschine“ sind keine Reifen bzw. Leuchten.
  const s = text.toLowerCase();
  // Bremsleuchte, Bremslicht(schalter), brake light, feu stop, remlicht sind Beleuchtung, keine Bremsteile.
  if (/bremsleucht|bremslicht|brake ?light|stop ?light|feu (de )?stop|remlicht|remlamp/.test(s)) return "lighting";
  if (/brems|brake|frein|\brem(schijf|schijven|blok|blokken|klauw)/.test(s)) return "brakes";
  if (/batter|\bakku|\baccu/.test(s)) return "battery";
  if (/lampe|\blamp\b|glühlampe|scheinwerfer|leuchte|leucht(?!turm)|\blicht(?!maschine)|\bheadlight|\blight\b|\bphare|\bampoule|koplamp/.test(s)) return "lighting";
  if (/filter|filtre/.test(s)) return "filters";
  if (/stoßdämpfer|stossdämpfer|fahrwerk|federbein|schraubenfeder|\bsuspension|amortisseur|schokdemper/.test(s)) return "suspension";
  if (/(?<![a-zäöü])reifen|winterreifen|sommerreifen|ganzjahresreifen|allwetterreifen|\btires?\b|\btyres?\b|\bpneus?\b|\bbanden?\b|\bwinterbanden\b/.test(s)) return "tires";
  return "generic";
}

type Copy = {
  trust: string[];
  fitEyebrow: string; fitTitle: string; fitStatus: string; fitLead: string;
  stepsTitle: string; steps: [string, string][];
  vehicleLabel: string; vehicleNone: string; sourceLabel: string; sourceBody: string;
  ctaFit: string; ctaWorkshop: string;
  plainEyebrow: string; plainTitle: (n: string) => string; pointsTitle: string; pitfallLabel: string;
  installEyebrow: string; installTitle: string; installBefore: string; installAfter: string; installBeforeList: string[]; installAfterList: string[]; installNote: string;
  alsoEyebrow: string; alsoTitle: string; alsoBody: string; includedTitle: string; includedBody: string;
  shipEyebrow: string; shipTitle: string; shipCards: [string, string][]; legal: string;
  faqEyebrow: string; faqTitle: string; faq: [string, string][];
  toolsEyebrow: string; toolsTitle: string; tools: [string, string, string][];
  guides: Record<GuideKind, Guide>;
  check: Checklist;
};

/** Texte der Passungs-Checkliste (FitmentChecklist.tsx); Kategorien, Punkte und Irrtümer kommen aus guides. */
export type Checklist = {
  title: string; lead: string; catGroup: string; decides: (cat: string) => string; pitfall: string;
  hsn: string; tsn: string; model: string; modelPlaceholder: string; summaryButton: string;
  yourVehicle: string; summaryTitle: (cat: string, vehicle: string) => string; summaryLead: string; search: string; workshop: string;
};

const de: Copy = {
  trust: ["Daten mit Quelle und Stand", "Passung offen ausgewiesen", "Gesetzliches Widerrufsrecht für Verbraucher", "Werkstätten in der Nähe finden"],
  fitEyebrow: "Passt das zu meinem Auto?", fitTitle: "Passungskasten", fitStatus: "Noch nicht geprüft",
  fitLead: "Bei TEILEKLAR gilt: Zu jedem Teil gehört eine Passungsangabe. Für diesen Artikel liegt noch keine geprüfte Fahrzeugzuordnung vor – deshalb behaupten wir keine. Sicher passend heißt hier: belegt, nicht angenommen.",
  stepsTitle: "So klären Sie die Passung in drei Schritten",
  steps: [["Fahrzeug festlegen", "HSN und TSN stehen im Fahrzeugschein, Felder 2.1 und 2.2. Mit Modell, Motor und Baujahr wird die Auswahl eindeutig."], ["Nummern vergleichen", "Vergleichen Sie Artikelnummer und EAN mit der Nummer des Teils, das Sie ersetzen. Stimmen Maße und Herstellernummer überein, ist das ein starkes Indiz."], ["Fachleute bestätigen lassen", "Im Zweifel bestätigt eine Werkstatt oder der Hersteller die Zuordnung, bevor Sie bestellen oder einbauen."]],
  vehicleLabel: "Geprüft für", vehicleNone: "Noch kein Fahrzeug gewählt – ohne Fahrzeug können wir nicht sagen, ob es passt.", sourceLabel: "Quelle der Angaben", sourceBody: "Lieferantendatensatz, Stand {date}. Eine Fahrzeugzuordnung ist darin nicht enthalten.",
  ctaFit: "Fahrzeug & Passung prüfen", ctaWorkshop: "Werkstatt für den Einbau finden",
  plainEyebrow: "In Klartext", plainTitle: n => "Worauf es bei „" + n + "“ ankommt", pointsTitle: "Diese Angaben entscheiden", pitfallLabel: "Häufigster Irrtum",
  installEyebrow: "Einbau & Prüfpunkte", installTitle: "Was vor und nach dem Einbau zählt", installBefore: "Vor dem Einbau", installAfter: "Nach dem Einbau",
  installBeforeList: ["Altteil und neue Ware nebeneinanderlegen: Form, Maße, Anschlüsse", "Herstellernummer auf dem Altteil mit unserer Artikelnummer abgleichen", "Verpackung und Teil auf Transportschäden prüfen"],
  installAfterList: ["Sitz, Befestigung und Anschlüsse kontrollieren", "Probefahrt oder Funktionsprüfung nach Herstellerangabe", "Bei Auffälligkeiten nicht weiterfahren und Werkstatt fragen"],
  installNote: "Sicherheitsrelevante Teile sollte eine Fachwerkstatt einbauen. Wir zeigen Ihnen den Weg dorthin.",
  alsoEyebrow: "Zusätzlich benötigt?", alsoTitle: "Halter, Schrauben, Sensoren – vorher klären, nicht nach dem Kauf",
  alsoBody: "Zu diesem Artikel liegt keine geprüfte Zubehörliste vor. Viele Teile brauchen zusätzliche Kleinteile, die zum Fahrzeug gehören und nicht beiliegen. Fragen Sie vor der Bestellung nach – die Antwort kommt vor dem Kauf, nicht danach.",
  includedTitle: "Lieferumfang", includedBody: "Maßgeblich ist die Beschreibung des Lieferanten. Was dort nicht genannt wird, ist nicht zugesagt.",
  shipEyebrow: "Versand, Zahlung, Rückgabe", shipTitle: "Kosten und Rechte vor der Bestellung",
  shipCards: [["Versand", "Lieferzeit und Versandkosten sehen Sie vor der Zahlung im Warenkorb."], ["Preis", "Ein Preis erscheint erst nach Freigabe – dann als Endpreis mit ausgewiesener Mehrwertsteuer; Versand kommt separat dazu."], ["Rückgabe", "Verbraucher haben ein gesetzliches Widerrufsrecht. Die Kaufbedingungen von TEILEKLAR sind noch nicht freigegeben; der Stand steht unter Rechtliches."]],
  legal: "Rechtliches und Widerruf lesen",
  faqEyebrow: "Fragen zu diesem Teil", faqTitle: "Kurz beantwortet",
  faq: [["Passt dieses Teil zu meinem Fahrzeug?", "Das können wir für diesen Artikel noch nicht bestätigen, weil keine geprüfte Fahrzeugzuordnung vorliegt. Mit HSN/TSN und der Nummer Ihres Altteils lässt es sich klären."], ["Wo finde ich HSN und TSN?", "Im Fahrzeugschein (Zulassungsbescheinigung Teil I): HSN in Feld 2.1, TSN in Feld 2.2."], ["Kann ich das Teil einbauen lassen?", "Die Werkstattsuche zeigt Betriebe aus einem öffentlichen Verzeichnis in Ihrer Nähe. Das sind keine bestätigten TEILEKLAR-Partner: Termin und Einbau vereinbaren Sie direkt mit dem Betrieb, zum Beispiel per Telefon oder über seine Website."], ["Was heißt „Quelle und Stand“?", "Jede Angabe nennt, woher sie kommt und wie aktuell sie ist. Fehlt etwas, steht das offen dort."]],
  toolsEyebrow: "Weiter prüfen", toolsTitle: "Passende Werkzeuge",
  tools: [["Fahrzeug & Passung", "Entscheidende Angaben je Teileart und Fragenliste für Händler oder Werkstatt.", "/teileklar/fahrzeug-und-passung"], ["Teilesuche", "Nach Teil, Teilenummer oder Kategorie suchen.", "/teileklar/suche"], ["Werkstatt", "Verzeichnisbetriebe in Ihrer Nähe finden und direkt kontaktieren.", "/teileklar/werkstatt"]],
  check: {
    title: "Passung prüfen: Worauf es ankommt",
    lead: "Ein Artikelname belegt keine Passung. Wählen Sie eine Kategorie und sehen Sie, welche Angaben entscheiden. Eine automatische Passungsprüfung gegen einen Fahrzeugkatalog gibt es noch nicht.",
    catGroup: "Kategorie wählen", decides: cat => `Diese Angaben entscheiden bei ${cat}`, pitfall: "Häufigster Irrtum:",
    hsn: "HSN (Feld 2.1)", tsn: "TSN (Feld 2.2)", model: "oder Modell, Motor, Baujahr", modelPlaceholder: "z. B. VW Golf VII 1.6 TDI, 2015",
    summaryButton: "Zusammenfassung erstellen", yourVehicle: "Ihr Fahrzeug", summaryTitle: (cat, vehicle) => `${cat} für ${vehicle}`,
    summaryLead: "Keine Passungsprüfung. Fragen Sie beim Kauf oder in der Werkstatt nach:", search: "Teilesuche öffnen", workshop: "Werkstatt in der Nähe suchen",
  },
  guides: {
    brakes: { name: "Bremsen", plain: "Bremsscheiben und Beläge wandeln Bewegung in Wärme um. Maße, Belüftung und Achse müssen exakt stimmen – sonst bremst das Auto schlechter oder gar nicht sicher.", points: ["Scheibendurchmesser und -dicke in mm", "Belüftet oder voll (nicht austauschbar)", "Vorder- oder Hinterachse", "Motorcode bei leistungsstarken Varianten"], pitfall: "Ein passender Durchmesser reicht nicht: Bei stärkeren Motoren ist oft eine andere Scheibe verbaut.", install: [] },
    battery: { name: "Batterie", plain: "Die Batterie startet den Motor und versorgt die Bordelektronik. Kapazität, Technologie und Bauform müssen zum Fahrzeug passen.", points: ["Kapazität in Ah und Kälteprüfstrom in A", "Start-Stopp-Ausführung (EFB/AGM) oder konventionell", "Gehäusemaß und Polanordnung", "Halterung passend zum Fahrzeug"], pitfall: "Gleiche Kapazität, falsche Technologie: In Start-Stopp-Fahrzeugen hält eine einfache Batterie oft nicht lange.", install: [] },
    lighting: { name: "Beleuchtung", plain: "Licht ist Sicherheit und Pflicht. Sockel, Leistung und Zulassung müssen zum Fahrzeug passen.", points: ["Lampentyp und Sockel, z. B. H7 oder LED-Modul", "Rechts- oder Linksverkehr-Ausführung beim Scheinwerfer", "Blink- und Bremslicht-Kombination", "Steuergerät-Kompatibilität bei Nachrüstung"], pitfall: "Nicht jede LED-Nachrüstung ist für die Serienleuchte zugelassen.", install: [] },
    filters: { name: "Filter", plain: "Filter schützen Motor und Innenraum. Außenmaße allein sagen wenig – entscheidend sind Typ, Filtermedium und Einbauort.", points: ["Filtertyp: Luft, Öl, Innenraum oder Kraftstoff", "Aktivkohle oder Partikelfilter beim Innenraumfilter", "Exakte Maße: Länge × Breite × Höhe", "Einbauposition am Fahrzeug"], pitfall: "Gleiche Außenmaße, andere Dichtung: Das macht den Unterschied zwischen dicht und undicht.", install: [] },
    suspension: { name: "Fahrwerk", plain: "Das Fahrwerk bestimmt Fahrkomfort und Straßenlage. Bauform, Achse und Zulassung müssen stimmen.", points: ["Federrate und Bauform: Schraubenfeder oder Luftfederung", "Vorder- oder Hinterachse", "Tieferlegung ja oder nein", "Teilegutachten bei Sportfahrwerken"], pitfall: "Ein Fahrwerksteil ohne Teilegutachten kann die Betriebserlaubnis erlöschen lassen.", install: [] },
    tires: { name: "Reifen", plain: "Reifen sind der einzige Kontakt zur Straße. Größe, Last- und Geschwindigkeitsindex müssen den Fahrzeugpapieren entsprechen.", points: ["Reifengröße: Breite, Höhe, Zoll", "Lastindex und Geschwindigkeitsindex", "Saison: Sommer, Winter oder Ganzjahr", "Herstellerfreigabe bei bestimmten Modellen"], pitfall: "Passende Größe, aber zu niedriger Lastindex: Das ist keine zulässige Bereifung.", install: [] },
    generic: { name: "Ersatzteil", plain: "Ein Ersatzteil passt nicht, weil es ähnlich aussieht, sondern weil Nummer, Maße und Ausführung zum Fahrzeug stimmen.", points: ["Fahrzeug, Motor und Baujahr", "Herstellernummer und Maße des vorhandenen Teils", "Einbauposition (vorn/hinten, links/rechts)", "Einbau und Prüfung durch eine fachkundige Werkstatt"], pitfall: "Ein Artikelname belegt keine Passung – Nummern und Maße schon.", install: [] },
  },
};

const nl: Copy = {
  trust: ["Gegevens met bron en datum", "Geschiktheid open vermeld", "Wettelijk herroepingsrecht voor consumenten", "Werkplaatsen in de buurt vinden"],
  fitEyebrow: "Past dit op mijn auto?", fitTitle: "Passingskader", fitStatus: "Nog niet gecontroleerd",
  fitLead: "Bij TEILEKLAR hoort bij elk onderdeel een passingsaanduiding. Voor dit artikel is nog geen gecontroleerde voertuigkoppeling beschikbaar – daarom beweren we er geen. Passend betekent hier: aangetoond, niet aangenomen.",
  stepsTitle: "Zo controleert u de pasvorm in drie stappen",
  steps: [["Voertuig bepalen", "HSN en TSN staan in het kentekenbewijs. Met model, motor en bouwjaar wordt de keuze eenduidig."], ["Nummers vergelijken", "Vergelijk artikelnummer en EAN met het nummer van het onderdeel dat u vervangt. Komen maten en fabrikantnummer overeen, dan is dat een sterke aanwijzing."], ["Laten bevestigen", "Laat een werkplaats of de fabrikant de koppeling bevestigen voordat u bestelt of monteert."]],
  vehicleLabel: "Gecontroleerd voor", vehicleNone: "Nog geen voertuig gekozen – zonder voertuig kunnen we niet zeggen of het past.", sourceLabel: "Bron van de gegevens", sourceBody: "Leveranciersgegevens, stand {date}. Een voertuigkoppeling zit daar niet in.",
  ctaFit: "Voertuig & passing controleren", ctaWorkshop: "Werkplaats voor montage zoeken",
  plainEyebrow: "In gewone taal", plainTitle: n => "Waar het bij „" + n + "” op aankomt", pointsTitle: "Deze gegevens beslissen", pitfallLabel: "Meest gemaakte fout",
  installEyebrow: "Montage & controlepunten", installTitle: "Wat vóór en na de montage telt", installBefore: "Voor de montage", installAfter: "Na de montage",
  installBeforeList: ["Oud onderdeel en nieuwe artikel naast elkaar leggen: vorm, maten, aansluitingen", "Fabrikantnummer op het oude onderdeel vergelijken met ons artikelnummer", "Verpakking en onderdeel op transportschade controleren"],
  installAfterList: ["Zitting, bevestiging en aansluitingen controleren", "Proefrit of functiecontrole volgens fabrikant", "Bij afwijkingen niet doorrijden en een werkplaats vragen"],
  installNote: "Veiligheidsrelevante onderdelen laat u beter door een vakwerkplaats monteren. Wij wijzen u de weg.",
  alsoEyebrow: "Nog iets nodig?", alsoTitle: "Houders, bouten, sensoren – vooraf duidelijk, niet na de koop",
  alsoBody: "Voor dit artikel is geen gecontroleerde accessoirelijst beschikbaar. Veel onderdelen vragen kleine extra delen die bij het voertuig horen en niet meegeleverd worden. Vraag het vóór het bestellen.",
  includedTitle: "Inhoud van de levering", includedBody: "Bepalend is de beschrijving van de leverancier. Wat daar niet staat, is niet toegezegd.",
  shipEyebrow: "Verzending, betaling, retour", shipTitle: "Kosten en rechten vóór de bestelling",
  shipCards: [["Verzending", "Levertijd en verzendkosten ziet u vóór de betaling in het mandje."], ["Prijs", "Een prijs verschijnt pas na vrijgave – dan als eindprijs met btw; verzending komt erbij."], ["Retour", "Consumenten hebben een wettelijk herroepingsrecht. De koopvoorwaarden van TEILEKLAR zijn nog niet vrijgegeven; de stand staat onder Juridisch."]],
  legal: "Juridisch en herroeping lezen",
  faqEyebrow: "Vragen over dit onderdeel", faqTitle: "Kort beantwoord",
  faq: [["Past dit onderdeel op mijn voertuig?", "Dat kunnen we voor dit artikel nog niet bevestigen, omdat er geen gecontroleerde voertuigkoppeling is. Met HSN/TSN en het nummer van uw oude onderdeel is het op te lossen."], ["Waar vind ik HSN en TSN?", "In het Duitse kentekenbewijs (Zulassungsbescheinigung Teil I): HSN in veld 2.1, TSN in veld 2.2."], ["Kan ik het laten monteren?", "De werkplaatszoeker toont bedrijven uit een openbaar register in uw buurt. Dit zijn geen bevestigde TEILEKLAR-partners: afspraak en montage regelt u rechtstreeks met het bedrijf, bijvoorbeeld telefonisch of via de website."], ["Wat betekent „bron en datum”?", "Elke vermelding noemt de herkomst en de actualiteit. Ontbreekt iets, dan staat dat er open bij."]],
  toolsEyebrow: "Verder controleren", toolsTitle: "Passende hulpmiddelen",
  tools: [["Voertuig & passing", "Beslissende gegevens per onderdeelsoort en vragenlijst voor handel of werkplaats.", "/teileklar/fahrzeug-und-passung"], ["Onderdelen zoeken", "Zoeken op onderdeel, nummer of categorie.", "/teileklar/suche"], ["Werkplaats", "Bedrijven uit het register in de buurt vinden en direct contacteren.", "/teileklar/werkstatt"]],
  check: {
    title: "Passing controleren: waar het om gaat",
    lead: "Een artikelnaam bewijst geen passing. Kies een categorie en zie welke gegevens beslissen. Een automatische controle tegen een voertuigcatalogus is er nog niet.",
    catGroup: "Categorie kiezen", decides: cat => `Deze gegevens beslissen bij ${cat}`, pitfall: "Meest gemaakte fout:",
    hsn: "HSN (Duits kentekenbewijs, veld 2.1)", tsn: "TSN (Duits kentekenbewijs, veld 2.2)", model: "of model, motor, bouwjaar", modelPlaceholder: "bijv. VW Golf VII 1.6 TDI, 2015",
    summaryButton: "Samenvatting maken", yourVehicle: "uw voertuig", summaryTitle: (cat, vehicle) => `${cat} voor ${vehicle}`,
    summaryLead: "Geen passingscontrole. Vraag bij aankoop of in de werkplaats naar:", search: "Onderdelen zoeken", workshop: "Werkplaats in de buurt zoeken",
  },
  guides: {
    brakes: { name: "Remmen", plain: "Remschijven en blokken zetten beweging om in warmte. Maten, ventilatie en as moeten exact kloppen, anders remt de auto slechter.", points: ["Schijfdiameter en dikte in mm", "Geventileerd of massief", "Voor- of achteras", "Motorcode bij sterkere varianten"], pitfall: "Een passende diameter is niet genoeg: bij sterkere motoren zit vaak een andere schijf.", install: [] },
    battery: { name: "Accu", plain: "De accu start de motor en voedt de boordelektronica. Capaciteit, techniek en afmeting moeten bij het voertuig passen.", points: ["Capaciteit in Ah en koudstartstroom in A", "Start-stop (EFB/AGM) of conventioneel", "Afmeting en poolopstelling", "Houder passend bij het voertuig"], pitfall: "Zelfde capaciteit, verkeerde techniek: in start-stopauto’s gaat een gewone accu vaak snel stuk.", install: [] },
    lighting: { name: "Verlichting", plain: "Licht is veiligheid en plicht. Fitting, vermogen en goedkeuring moeten kloppen.", points: ["Lamptype en fitting, bijv. H7 of LED-module", "Uitvoering voor links- of rechtsverkeer", "Knipper- en remlichtcombinatie", "Compatibiliteit met stuurapparaat bij ombouw"], pitfall: "Niet elke LED-ombouw is goedgekeurd voor de standaard koplamp.", install: [] },
    filters: { name: "Filters", plain: "Filters beschermen motor en interieur. Buitenmaten zeggen weinig – type, filtermedium en inbouwplek tellen.", points: ["Type: lucht, olie, interieur of brandstof", "Koolstof of deeltjesfilter bij interieurfilter", "Exacte maten: lengte × breedte × hoogte", "Inbouwpositie"], pitfall: "Dezelfde buitenmaten, andere afdichting: het verschil tussen dicht en lek.", install: [] },
    suspension: { name: "Onderstel", plain: "Het onderstel bepaalt comfort en wegligging. Uitvoering, as en goedkeuring moeten kloppen.", points: ["Veerstijfheid en uitvoering", "Voor- of achteras", "Verlaging ja of nee", "Onderdelengoedkeuring bij sportonderstel"], pitfall: "Een onderstelonderdeel zonder goedkeuring kan de toelating laten vervallen.", install: [] },
    tires: { name: "Banden", plain: "Banden zijn het enige contact met de weg. Maat, last- en snelheidsindex moeten kloppen met de papieren.", points: ["Bandmaat: breedte, hoogte, inch", "Last- en snelheidsindex", "Seizoen: zomer, winter of all-season", "Fabrikantgoedkeuring bij bepaalde modellen"], pitfall: "Juiste maat maar te lage loadindex: dat is geen toegestane band.", install: [] },
    generic: { name: "Onderdeel", plain: "Een onderdeel past niet omdat het er hetzelfde uitziet, maar omdat nummer, maten en uitvoering kloppen.", points: ["Voertuig, motor en bouwjaar", "Fabrikantnummer en maten van het oude onderdeel", "Inbouwpositie (voor/achter, links/rechts)", "Montage en controle door een vakwerkplaats"], pitfall: "Een artikelnaam bewijst geen passing – nummers en maten wel.", install: [] },
  },
};

const fr: Copy = {
  trust: ["Données avec source et date", "Compatibilité affichée ouvertement", "Droit de rétractation légal des consommateurs", "Trouver un atelier proche"],
  fitEyebrow: "Est-ce compatible avec ma voiture ?", fitTitle: "Encadré compatibilité", fitStatus: "Pas encore vérifié",
  fitLead: "Chez TEILEKLAR, chaque pièce porte une indication de compatibilité. Pour cet article, aucune affectation à un véhicule n’est vérifiée – nous n’en affirmons donc aucune. Compatible signifie ici : prouvé, pas supposé.",
  stepsTitle: "Vérifier la compatibilité en trois étapes",
  steps: [["Définir le véhicule", "Les codes HSN et TSN figurent sur la carte grise allemande. Avec modèle, moteur et année, le choix devient univoque."], ["Comparer les références", "Comparez la référence et l’EAN avec la pièce à remplacer. Dimensions et référence constructeur identiques sont un bon indice."], ["Faire confirmer", "En cas de doute, un atelier ou le constructeur confirme l’affectation avant la commande ou le montage."]],
  vehicleLabel: "Vérifié pour", vehicleNone: "Aucun véhicule choisi – sans véhicule, nous ne pouvons pas dire si cela convient.", sourceLabel: "Source des données", sourceBody: "Fiche fournisseur, état au {date}. Aucune affectation à un véhicule n’y figure.",
  ctaFit: "Vérifier véhicule et compatibilité", ctaWorkshop: "Trouver un atelier pour le montage",
  plainEyebrow: "En clair", plainTitle: n => "Ce qui compte pour « " + n + " »", pointsTitle: "Ces données décident", pitfallLabel: "Erreur la plus fréquente",
  installEyebrow: "Montage et contrôles", installTitle: "Ce qui compte avant et après le montage", installBefore: "Avant le montage", installAfter: "Après le montage",
  installBeforeList: ["Poser ancienne et nouvelle pièce côte à côte : forme, dimensions, raccords", "Comparer la référence constructeur avec notre référence", "Vérifier l’emballage et la pièce après le transport"],
  installAfterList: ["Contrôler assise, fixation et raccords", "Essai ou contrôle de fonctionnement selon le constructeur", "En cas d’anomalie, ne pas rouler et demander à un atelier"],
  installNote: "Les pièces de sécurité devraient être montées par un atelier spécialisé. Nous vous indiquons le chemin.",
  alsoEyebrow: "Autre chose nécessaire ?", alsoTitle: "Supports, vis, capteurs – à clarifier avant, pas après l’achat",
  alsoBody: "Pour cet article, aucune liste d’accessoires vérifiée n’est disponible. Beaucoup de pièces demandent de petits éléments liés au véhicule et non fournis. Posez la question avant de commander.",
  includedTitle: "Contenu de la livraison", includedBody: "La description du fournisseur fait foi. Ce qui n’y figure pas n’est pas promis.",
  shipEyebrow: "Livraison, paiement, retour", shipTitle: "Coûts et droits avant la commande",
  shipCards: [["Livraison", "Délai et frais de livraison s’affichent dans le panier avant le paiement."], ["Prix", "Un prix n’apparaît qu’après validation – alors en prix final avec TVA ; la livraison s’ajoute."], ["Retour", "Les consommateurs disposent d’un droit de rétractation légal. Les conditions de vente de TEILEKLAR ne sont pas encore validées ; l’état figure sous Mentions légales."]],
  legal: "Lire mentions légales et rétractation",
  faqEyebrow: "Questions sur cette pièce", faqTitle: "Réponses courtes",
  faq: [["Cette pièce convient-elle à mon véhicule ?", "Nous ne pouvons pas encore le confirmer, faute d’affectation vérifiée. Avec HSN/TSN et la référence de l’ancienne pièce, on peut le clarifier."], ["Où trouver HSN et TSN ?", "Sur la carte grise allemande : HSN champ 2.1, TSN champ 2.2."], ["Puis-je la faire monter ?", "La recherche d’atelier affiche des garages d’un annuaire public près de chez vous. Ce ne sont pas des partenaires TEILEKLAR confirmés : rendez-vous et montage se convenient directement avec le garage, par téléphone ou via son site."], ["Que signifie « source et date » ?", "Chaque indication nomme son origine et son actualité. S’il manque quelque chose, c’est écrit."]],
  toolsEyebrow: "Continuer à vérifier", toolsTitle: "Outils utiles",
  tools: [["Véhicule et compatibilité", "Données décisives par type de pièce et liste de questions pour le vendeur ou l’atelier.", "/teileklar/fahrzeug-und-passung"], ["Recherche de pièces", "Chercher par pièce, référence ou catégorie.", "/teileklar/suche"], ["Atelier", "Trouver des garages de l’annuaire près de chez vous et les contacter directement.", "/teileklar/werkstatt"]],
  check: {
    title: "Vérifier la compatibilité : ce qui compte",
    lead: "Le nom d’un article ne prouve pas la compatibilité. Choisissez une catégorie et voyez quelles données décident. Il n’existe pas encore de vérification automatique dans un catalogue de véhicules.",
    catGroup: "Choisir une catégorie", decides: cat => `Ces données décident pour : ${cat}`, pitfall: "Erreur la plus fréquente :",
    hsn: "HSN (carte grise allemande, champ 2.1)", tsn: "TSN (carte grise allemande, champ 2.2)", model: "ou modèle, moteur, année", modelPlaceholder: "p. ex. VW Golf VII 1.6 TDI, 2015",
    summaryButton: "Créer un récapitulatif", yourVehicle: "votre véhicule", summaryTitle: (cat, vehicle) => `${cat} pour ${vehicle}`,
    summaryLead: "Aucune vérification de compatibilité. Demandez à l’achat ou à l’atelier :", search: "Ouvrir la recherche de pièces", workshop: "Trouver un atelier proche",
  },
  guides: {
    brakes: { name: "Freins", plain: "Disques et plaquettes transforment le mouvement en chaleur. Dimensions, ventilation et essieu doivent être exacts.", points: ["Diamètre et épaisseur du disque en mm", "Ventilé ou plein", "Essieu avant ou arrière", "Code moteur pour variantes puissantes"], pitfall: "Un diamètre identique ne suffit pas : les moteurs plus puissants ont souvent un autre disque.", install: [] },
    battery: { name: "Batterie", plain: "La batterie démarre le moteur et alimente l’électronique. Capacité, technologie et format doivent convenir.", points: ["Capacité en Ah et courant de démarrage à froid en A", "Start-stop (EFB/AGM) ou conventionnelle", "Dimensions et position des bornes", "Support adapté au véhicule"], pitfall: "Même capacité, mauvaise technologie : en start-stop, une batterie simple vieillit vite.", install: [] },
    lighting: { name: "Éclairage", plain: "L’éclairage, c’est la sécurité et une obligation. Culot, puissance et homologation doivent convenir.", points: ["Type de lampe et culot, p. ex. H7 ou module LED", "Version circulation à droite ou à gauche", "Combinaison clignotant et feu stop", "Compatibilité calculateur en cas d’adaptation"], pitfall: "Toutes les conversions LED ne sont pas homologuées pour le phare d’origine.", install: [] },
    filters: { name: "Filtres", plain: "Les filtres protègent moteur et habitacle. Les dimensions extérieures ne suffisent pas : type, média et emplacement comptent.", points: ["Type : air, huile, habitacle ou carburant", "Charbon actif ou filtre à particules", "Dimensions exactes : longueur × largeur × hauteur", "Position de montage"], pitfall: "Mêmes dimensions, autre joint : c’est la différence entre étanche et fuite.", install: [] },
    suspension: { name: "Suspension", plain: "La suspension détermine confort et tenue de route. Forme, essieu et homologation doivent convenir.", points: ["Raideur et forme du ressort", "Essieu avant ou arrière", "Abaissement oui ou non", "Rapport de contrôle pour suspensions sport"], pitfall: "Une pièce sans rapport de contrôle peut faire perdre l’homologation.", install: [] },
    tires: { name: "Pneus", plain: "Les pneus sont le seul contact avec la route. Dimension, indices de charge et de vitesse doivent suivre les papiers.", points: ["Dimension : largeur, hauteur, pouces", "Indice de charge et de vitesse", "Saison : été, hiver ou toutes saisons", "Homologation constructeur pour certains modèles"], pitfall: "Bonne dimension mais indice de charge trop faible : ce n’est pas un pneu autorisé.", install: [] },
    generic: { name: "Pièce détachée", plain: "Une pièce ne convient pas parce qu’elle y ressemble, mais parce que référence, dimensions et version correspondent.", points: ["Véhicule, moteur et année", "Référence et dimensions de l’ancienne pièce", "Position de montage (avant/arrière, gauche/droite)", "Montage et contrôle par un atelier qualifié"], pitfall: "Un nom d’article ne prouve rien – les références et dimensions, si.", install: [] },
  },
};

const en: Copy = {
  trust: ["Data with source and date", "Fitment shown openly", "Statutory right of withdrawal for consumers", "Find workshops nearby"],
  fitEyebrow: "Does it fit my car?", fitTitle: "Fitment box", fitStatus: "Not yet checked",
  fitLead: "At TEILEKLAR every part carries a fitment statement. For this item no verified vehicle match exists yet – so we claim none. Fits here means: proven, not assumed.",
  stepsTitle: "Clarify fitment in three steps",
  steps: [["Set the vehicle", "HSN and TSN are on the German registration document, fields 2.1 and 2.2. Model, engine and year make the choice exact."], ["Compare numbers", "Compare the article number and EAN with the part you are replacing. Matching dimensions and manufacturer number are a strong indication."], ["Have it confirmed", "When in doubt, a workshop or the manufacturer confirms the match before you order or fit."]],
  vehicleLabel: "Checked for", vehicleNone: "No vehicle chosen yet – without a vehicle we cannot say whether it fits.", sourceLabel: "Source of the data", sourceBody: "Supplier record, as of {date}. It contains no vehicle assignment.",
  ctaFit: "Check vehicle & fitment", ctaWorkshop: "Find a workshop for fitting",
  plainEyebrow: "In plain words", plainTitle: n => "What matters for “" + n + "”", pointsTitle: "These details decide", pitfallLabel: "Most common mistake",
  installEyebrow: "Fitting & checkpoints", installTitle: "What counts before and after fitting", installBefore: "Before fitting", installAfter: "After fitting",
  installBeforeList: ["Lay old and new part side by side: shape, dimensions, connections", "Compare the manufacturer number on the old part with our article number", "Check packaging and part for transport damage"],
  installAfterList: ["Check seating, fixing and connections", "Test drive or function check as per manufacturer", "If anything is off, do not drive on and ask a workshop"],
  installNote: "Safety-relevant parts should be fitted by a specialist workshop. We show you the way.",
  alsoEyebrow: "Anything else needed?", alsoTitle: "Brackets, bolts, sensors – clarify before, not after the purchase",
  alsoBody: "No verified accessory list exists for this item. Many parts need small extras that belong to the vehicle and are not included. Ask before ordering.",
  includedTitle: "What is delivered", includedBody: "The supplier’s description governs. What is not named there is not promised.",
  shipEyebrow: "Shipping, payment, returns", shipTitle: "Costs and rights before you order",
  shipCards: [["Shipping", "Delivery time and shipping costs show in the cart before payment."], ["Price", "A price appears only once released – then as a final price with VAT shown; shipping is added."], ["Returns", "Consumers have a statutory right of withdrawal. TEILEKLAR’s purchase terms are not yet released; the status is under Legal."]],
  legal: "Read legal and withdrawal terms",
  faqEyebrow: "Questions about this part", faqTitle: "Answered briefly",
  faq: [["Does this part fit my vehicle?", "We cannot confirm that for this item yet because no verified vehicle assignment exists. HSN/TSN and the number of your old part can settle it."], ["Where do I find HSN and TSN?", "On the German registration document (Part I): HSN in field 2.1, TSN in field 2.2."], ["Can I have it fitted?", "The workshop finder lists businesses from a public directory near you. They are not confirmed TEILEKLAR partners: arrange the appointment and fitting directly with the workshop, for example by phone or via its website."], ["What does “source and date” mean?", "Every statement names where it comes from and how current it is. If something is missing, it says so."]],
  toolsEyebrow: "Keep checking", toolsTitle: "Useful tools",
  tools: [["Vehicle & fitment", "Deciding details per part type and a question list for dealer or workshop.", "/teileklar/fahrzeug-und-passung"], ["Part search", "Search by part, part number or category.", "/teileklar/suche"], ["Workshop", "Find directory workshops near you and contact them directly.", "/teileklar/werkstatt"]],
  check: {
    title: "Checking fitment: what matters",
    lead: "A product name does not prove fitment. Choose a category to see which details decide. There is no automatic check against a vehicle catalogue yet.",
    catGroup: "Choose a category", decides: cat => `These details decide for ${cat}`, pitfall: "Most common mistake:",
    hsn: "HSN (German registration, field 2.1)", tsn: "TSN (German registration, field 2.2)", model: "or model, engine, year", modelPlaceholder: "e.g. VW Golf VII 1.6 TDI, 2015",
    summaryButton: "Create summary", yourVehicle: "your vehicle", summaryTitle: (cat, vehicle) => `${cat} for ${vehicle}`,
    summaryLead: "No fitment check. Ask when buying or at the workshop about:", search: "Open part search", workshop: "Find a workshop nearby",
  },
  guides: {
    brakes: { name: "Brakes", plain: "Discs and pads turn motion into heat. Dimensions, ventilation and axle must be exact, otherwise the car brakes worse.", points: ["Disc diameter and thickness in mm", "Vented or solid", "Front or rear axle", "Engine code for high-power variants"], pitfall: "A matching diameter is not enough: stronger engines often use a different disc.", install: [] },
    battery: { name: "Battery", plain: "The battery starts the engine and powers the electronics. Capacity, technology and size must suit the vehicle.", points: ["Capacity in Ah and cold-cranking current in A", "Start-stop (EFB/AGM) or conventional", "Case size and terminal layout", "Holder suited to the vehicle"], pitfall: "Same capacity, wrong technology: in start-stop cars a plain battery often fails early.", install: [] },
    lighting: { name: "Lighting", plain: "Lighting is safety and a legal duty. Socket, power and approval must suit the vehicle.", points: ["Lamp type and socket, e.g. H7 or LED module", "Right- or left-hand-traffic version", "Indicator and brake-light combination", "Control-unit compatibility for retrofits"], pitfall: "Not every LED retrofit is approved for the original headlight.", install: [] },
    filters: { name: "Filters", plain: "Filters protect engine and cabin. Outer size says little – type, medium and location matter.", points: ["Type: air, oil, cabin or fuel", "Activated carbon or particle filter for cabin", "Exact size: length × width × height", "Fitting position"], pitfall: "Same outer size, different seal: the difference between tight and leaking.", install: [] },
    suspension: { name: "Suspension", plain: "Suspension sets comfort and road holding. Design, axle and approval must be right.", points: ["Spring rate and design", "Front or rear axle", "Lowering yes or no", "Parts certificate for sport suspensions"], pitfall: "A suspension part without a certificate can void the vehicle’s approval.", install: [] },
    tires: { name: "Tyres", plain: "Tyres are the only contact with the road. Size, load and speed index must match the vehicle papers.", points: ["Tyre size: width, height, inch", "Load and speed index", "Season: summer, winter or all-season", "Manufacturer approval for certain models"], pitfall: "Right size but too low a load index: that is not a permitted tyre.", install: [] },
    generic: { name: "Spare part", plain: "A part does not fit because it looks similar, but because number, dimensions and version match the vehicle.", points: ["Vehicle, engine and year", "Manufacturer number and dimensions of the existing part", "Fitting position (front/rear, left/right)", "Fitting and inspection by a qualified workshop"], pitfall: "An article name proves no fitment – numbers and dimensions do.", install: [] },
  },
};

export const STORY: Record<StoryLocale, Copy> = { de, nl, fr, en };
