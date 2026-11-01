"use client";
import {useState} from "react";
import {SiteLink} from "./Router";
import type {PublicPage} from "./../lib/page-types";
import type {Locale} from "./../lib/i18n";
import "./TeileklarTools.css";

const copy = {
  de: {kicker: "Batterie-Berater", title: "Passende Starterbatterie einordnen", intro: "Beantworten Sie einige Fragen – wir ordnen Typ, Einbaumaß und Pollage ein. Die genaue Passung bestätigen wir anhand Ihrer Fahrzeugdaten.", q1: "Hat Ihr Fahrzeug Start-Stopp-Automatik?", q2: "Umfangreiche Ausstattung (z. B. Rekuperation, viele Verbraucher)?", size: "Einbaumaß (Gehäuse)", pole: "Pollage (Pluspol)", yes: "Ja", no: "Nein", unknown: "Weiß nicht", sizeUnknown: "Unbekannt", poleUnknown: "Unbekannt", poleRight: "0 – Pluspol rechts", poleLeft: "1 – Pluspol links", result: "Empfehlung", agm: "AGM-Batterie", efb: "EFB-Batterie", flooded: "Konventionelle Nassbatterie (SLI)", agmWhy: "Start-Stopp mit hoher Last benötigt in der Regel AGM.", efbWhy: "Start-Stopp ohne Rekuperation ist meist mit EFB abgedeckt.", floodedWhy: "Ohne Start-Stopp genügt üblicherweise eine konventionelle Batterie.", unknownWhy: "Ohne Angabe zur Start-Stopp-Technik bleibt der Typ offen – wir klären ihn über Ihre Fahrzeugdaten.", sizeLine: "Einbaumaß", poleLine: "Pollage", mustMatch: "Einbaumaß und Pollage müssen mit Ihrer ausgebauten Batterie übereinstimmen – sonst passt die Befestigung oder die Verkabelung nicht.", note: "Bauform, Kapazität und Kaltstartstrom sowie eine eventuelle Anlernung hängen vom Fahrzeug ab. Eine Rückrüstung auf einen schwächeren Typ ist nicht empfohlen.", fitment: "Fahrzeug und Passung", appointment: "Werkstatttermin für den Einbau"},
  nl: {kicker: "Accu-adviseur", title: "De juiste startaccu bepalen", intro: "Beantwoord enkele vragen – wij bepalen type, inbouwmaat en polligging. De exacte pasvorm bevestigen we aan de hand van uw voertuiggegevens.", q1: "Heeft uw voertuig start-stop?", q2: "Uitgebreide uitrusting (bijv. recuperatie, veel verbruikers)?", size: "Inbouwmaat (behuizing)", pole: "Polligging (pluspool)", yes: "Ja", no: "Nee", unknown: "Weet niet", sizeUnknown: "Onbekend", poleUnknown: "Onbekend", poleRight: "0 – pluspool rechts", poleLeft: "1 – pluspool links", result: "Advies", agm: "AGM-accu", efb: "EFB-accu", flooded: "Conventionele natte accu (SLI)", agmWhy: "Start-stop met hoge belasting vraagt meestal AGM.", efbWhy: "Start-stop zonder recuperatie is meestal met EFB gedekt.", floodedWhy: "Zonder start-stop volstaat doorgaans een conventionele accu.", unknownWhy: "Zonder info over start-stop blijft het type open – we bepalen het via uw voertuiggegevens.", sizeLine: "Inbouwmaat", poleLine: "Polligging", mustMatch: "Inbouwmaat en polligging moeten overeenkomen met uw uitgebouwde accu, anders past de bevestiging of bekabeling niet.", note: "Bouwvorm, capaciteit en koudstartstroom en een eventuele aanleerstap hangen af van het voertuig. Terugzetten naar een zwakker type is niet aangeraden.", fitment: "Voertuig en pasvorm", appointment: "Werkplaatsafspraak voor montage"},
  fr: {kicker: "Conseiller batterie", title: "Identifier la bonne batterie", intro: "Répondez à quelques questions – nous identifions le type, la dimension et la polarité. La compatibilité exacte est confirmée d’après les données de votre véhicule.", q1: "Votre véhicule a-t-il le start-stop ?", q2: "Équipement important (récupération, nombreux consommateurs) ?", size: "Dimension (boîtier)", pole: "Polarité (borne +)", yes: "Oui", no: "Non", unknown: "Je ne sais pas", sizeUnknown: "Inconnue", poleUnknown: "Inconnue", poleRight: "0 – borne + à droite", poleLeft: "1 – borne + à gauche", result: "Recommandation", agm: "Batterie AGM", efb: "Batterie EFB", flooded: "Batterie conventionnelle (SLI)", agmWhy: "Le start-stop à forte charge exige généralement une AGM.", efbWhy: "Le start-stop sans récupération est le plus souvent couvert par une EFB.", floodedWhy: "Sans start-stop, une batterie conventionnelle suffit généralement.", unknownWhy: "Sans info sur le start-stop, le type reste ouvert – nous le précisons via votre véhicule.", sizeLine: "Dimension", poleLine: "Polarité", mustMatch: "La dimension et la polarité doivent correspondre à votre batterie déposée, sinon la fixation ou le câblage ne convient pas.", note: "Forme, capacité et courant de démarrage à froid, ainsi qu’un éventuel apprentissage, dépendent du véhicule. Revenir à un type plus faible n’est pas recommandé.", fitment: "Véhicule et compatibilité", appointment: "Rendez-vous atelier pour le montage"},
  en: {kicker: "Battery advisor", title: "Identify the right battery", intro: "Answer a few questions – we classify type, case size and pole layout. We confirm the exact fit from your vehicle data.", q1: "Does your vehicle have start-stop?", q2: "Extensive equipment (e.g. recuperation, many consumers)?", size: "Case size", pole: "Pole layout (positive)", yes: "Yes", no: "No", unknown: "Not sure", sizeUnknown: "Unknown", poleUnknown: "Unknown", poleRight: "0 – positive on right", poleLeft: "1 – positive on left", result: "Recommendation", agm: "AGM battery", efb: "EFB battery", flooded: "Conventional flooded battery (SLI)", agmWhy: "Start-stop with high load usually requires AGM.", efbWhy: "Start-stop without recuperation is usually covered by EFB.", floodedWhy: "Without start-stop a conventional battery is usually enough.", unknownWhy: "Without start-stop info the type stays open – we clarify it from your vehicle data.", sizeLine: "Case size", poleLine: "Pole layout", mustMatch: "Case size and pole layout must match your removed battery, otherwise the mounting or wiring will not fit.", note: "Form factor, capacity and cold cranking current, plus any relearning, depend on the vehicle. Downgrading to a weaker type is not recommended.", fitment: "Vehicle and fit", appointment: "Workshop appointment for installation"},
};

type YN = "" | "yes" | "no" | "unknown";

const SIZES = ["L2 (242×175×190 mm)", "L3 (278×175×190 mm)", "L4 (315×175×190 mm)", "L5 (353×175×190 mm)"];

export default function BatteryAdvisor({locale, pages}: {locale: Locale; pages: PublicPage[]}) {
  const t = copy[locale];
  const [ss, setSs] = useState<YN>("");
  const [eq, setEq] = useState<YN>("no");
  const [size, setSize] = useState("");
  const [pole, setPole] = useState("");
  const path = (id: string, fb: string) => pages.find(p => p.id === id)?.path || fb;
  let rec = "", why = "";
  if (ss === "unknown") {rec = ""; why = t.unknownWhy;}
  else if (ss === "yes") {if (eq === "yes") {rec = t.agm; why = t.agmWhy;} else {rec = t.efb; why = t.efbWhy;}}
  else if (ss === "no") {rec = t.flooded; why = t.floodedWhy;}
  const yn: {v: YN; l: string}[] = [{v: "yes", l: t.yes}, {v: "no", l: t.no}, {v: "unknown", l: t.unknown}];
  const sizeLabel = size || t.sizeUnknown;
  const poleLabel = pole === "right" ? t.poleRight : pole === "left" ? t.poleLeft : t.poleUnknown;

  return (
    <section className="tk-tool" aria-labelledby="battery-advisor-title" data-testid="battery-advisor">
      <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="battery-advisor-title">{t.title}</h2><p>{t.intro}</p></div>
      <div className="tk-form">
        <div className="tk-fieldrow">
          <div className="tk-field"><label htmlFor="battery-ss">{t.q1}</label><select id="battery-ss" data-testid="battery-startstop" value={ss} onChange={e => setSs(e.target.value as YN)}><option value="" disabled>–</option>{yn.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
          <div className="tk-field"><label htmlFor="battery-eq">{t.q2}</label><select id="battery-eq" data-testid="battery-equipment" value={eq} onChange={e => setEq(e.target.value as YN)}><option value="yes">{t.yes}</option><option value="no">{t.no}</option></select></div>
        </div>
        <div className="tk-fieldrow">
          <div className="tk-field"><label htmlFor="battery-size">{t.size}</label><select id="battery-size" data-testid="battery-size" value={size} onChange={e => setSize(e.target.value)}><option value="">{t.sizeUnknown}</option>{SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="tk-field"><label htmlFor="battery-pole">{t.pole}</label><select id="battery-pole" data-testid="battery-pole" value={pole} onChange={e => setPole(e.target.value)}><option value="">{t.poleUnknown}</option><option value="right">{t.poleRight}</option><option value="left">{t.poleLeft}</option></select></div>
        </div>
        {(rec || why) && (
          <div className="tk-result" data-testid="battery-result" aria-live="polite">
            <p className="tk-subhead">{t.result}</p>
            {rec && <p className="tk-recommend" data-testid="battery-recommendation">{rec}</p>}
            <div className="tk-result-row"><dt>{t.sizeLine}</dt><dd data-testid="battery-size-out">{sizeLabel}</dd></div>
            <div className="tk-result-row"><dt>{t.poleLine}</dt><dd data-testid="battery-pole-out">{poleLabel}</dd></div>
            <p className="tk-note">{why}</p>
            <p className="tk-note">{t.mustMatch}</p>
          </div>
        )}
        <p className="tk-note">{t.note}</p>
        <div className="tk-actions">
          <SiteLink className="tk-link" href={path("tk-fitment", "/teileklar/fahrzeug-und-passung")} data-testid="battery-link-fitment">{t.fitment}<span aria-hidden="true">→</span></SiteLink>
          <SiteLink className="tk-link" href={path("tk-appointments", "/teileklar/termine")} data-testid="battery-link-appointment">{t.appointment}<span aria-hidden="true">→</span></SiteLink>
        </div>
      </div>
    </section>
  );
}
