"use client";
import {useState} from "react";
import type {Locale} from "./../lib/i18n";
import "./TeileklarTools.css";

const copy = {
  de: {kicker: "Reifenrechner", title: "Reifengrößen vergleichen", intro: "Geben Sie Ihre aktuelle Größe und eine Wunschgröße ein. Der Rechner vergleicht Abrollumfang, zeigt die zulässige Felgenbreite und die Tragfähigkeit aus dem Lastindex. Zur Orientierung – ersetzt keine technische Freigabe.", current: "Aktuelle Größe", alt: "Wunschgröße", width: "Breite (mm)", ratio: "Querschnitt (%)", rim: "Felge (Zoll)", li: "Lastindex (LI)", diameter: "Durchmesser", circ: "Abrollumfang", deviation: "Abweichung", rimWidth: "Zulässige Felgenbreite", load: "Tragfähigkeit je Reifen", ok: "Innerhalb ±3 % – üblicher Orientierungsrahmen", warn: "Über ±3 % – Tacho/Freigängigkeit prüfen lassen", liInvalid: "Lastindex außerhalb der Tabelle (70–110).", note: "Zulässigkeit, Freigängigkeit, Tachoabweichung und zulässiger Lastindex hängen von Ihrem Fahrzeug ab (COC/Zulassung). Lassen Sie die Größe vor dem Kauf fachlich bestätigen.", inch: "Zoll"},
  nl: {kicker: "Bandencalculator", title: "Bandenmaten vergelijken", intro: "Voer uw huidige maat en een gewenste maat in. De calculator vergelijkt de rolomtrek, toont de toegestane velgbreedte en het draagvermogen uit de belastingsindex. Ter oriëntatie – vervangt geen technische vrijgave.", current: "Huidige maat", alt: "Gewenste maat", width: "Breedte (mm)", ratio: "Hoogte (%)", rim: "Velg (inch)", li: "Belastingsindex (LI)", diameter: "Diameter", circ: "Rolomtrek", deviation: "Afwijking", rimWidth: "Toegestane velgbreedte", load: "Draagvermogen per band", ok: "Binnen ±3 % – gebruikelijk kader", warn: "Boven ±3 % – teller/vrijloop laten controleren", liInvalid: "Belastingsindex buiten de tabel (70–110).", note: "Toelaatbaarheid, vrijloop, tellerafwijking en toegestane belastingsindex hangen af van uw voertuig. Laat de maat vóór aankoop vakkundig bevestigen.", inch: "inch"},
  fr: {kicker: "Calculateur de pneus", title: "Comparer les dimensions", intro: "Saisissez votre dimension actuelle et une dimension souhaitée. Le calculateur compare la circonférence, indique la largeur de jante admissible et la charge d’après l’indice de charge. À titre indicatif – ne remplace pas une homologation.", current: "Dimension actuelle", alt: "Dimension souhaitée", width: "Largeur (mm)", ratio: "Hauteur (%)", rim: "Jante (pouces)", li: "Indice de charge (LI)", diameter: "Diamètre", circ: "Circonférence", deviation: "Écart", rimWidth: "Largeur de jante admissible", load: "Charge par pneu", ok: "Dans ±3 % – cadre d’orientation usuel", warn: "Au-delà de ±3 % – faire vérifier compteur/dégagement", liInvalid: "Indice de charge hors table (70–110).", note: "L’admissibilité, le dégagement, l’écart compteur et l’indice de charge admissible dépendent de votre véhicule. Faites confirmer la dimension avant l’achat.", inch: "pouces"},
  en: {kicker: "Tyre calculator", title: "Compare tyre sizes", intro: "Enter your current size and a target size. It compares rolling circumference, shows the allowed rim width and the load capacity from the load index. For orientation only – not a technical approval.", current: "Current size", alt: "Target size", width: "Width (mm)", ratio: "Aspect (%)", rim: "Rim (inch)", li: "Load index (LI)", diameter: "Diameter", circ: "Circumference", deviation: "Deviation", rimWidth: "Allowed rim width", load: "Load capacity per tyre", ok: "Within ±3 % – common orientation range", warn: "Above ±3 % – have speedo/clearance checked", liInvalid: "Load index outside table (70–110).", note: "Approval, clearance, speedo deviation and allowed load index depend on your vehicle. Have the size professionally confirmed before purchase.", inch: "inch"},
};

// Abbreviated ETRTO load-index table (kg) for common passenger-car values.
const LOAD_INDEX: Record<number, number> = {
  70: 335, 71: 345, 72: 355, 73: 365, 74: 375, 75: 387, 76: 400, 77: 412, 78: 425, 79: 437,
  80: 450, 81: 462, 82: 475, 83: 487, 84: 500, 85: 515, 86: 530, 87: 545, 88: 560, 89: 580,
  90: 600, 91: 615, 92: 630, 93: 650, 94: 670, 95: 690, 96: 710, 97: 730, 98: 750, 99: 775,
  100: 800, 101: 825, 102: 850, 103: 875, 104: 900, 105: 925, 106: 950, 107: 975, 108: 1000, 109: 1030, 110: 1060,
};

function diameterMm(w: number, r: number, rim: number) {return rim * 25.4 + 2 * (w * r / 100);}
function rimRangeInch(width: number): [number, number] {
  const toHalf = (n: number) => Math.round(n * 2) / 2;
  return [toHalf(width * 0.7 / 25.4), toHalf(width * 0.9 / 25.4)];
}

type Size = {w: number; r: number; rim: number; li: number};

export default function TyreCalculator({locale}: {locale: Locale}) {
  const t = copy[locale];
  const [a, setA] = useState<Size>({w: 205, r: 55, rim: 16, li: 91});
  const [b, setB] = useState<Size>({w: 225, r: 45, rim: 17, li: 94});
  const valid = (s: Size) => s.w >= 100 && s.w <= 400 && s.r >= 20 && s.r <= 90 && s.rim >= 10 && s.rim <= 24;
  const dA = diameterMm(a.w, a.r, a.rim), dB = diameterMm(b.w, b.r, b.rim);
  const okA = valid(a), okB = valid(b);
  const dev = okA && okB && dA > 0 ? ((dB - dA) / dA) * 100 : 0;
  const within = Math.abs(dev) <= 3;
  const fmt = (n: number) => n.toLocaleString(locale === "en" ? "en-GB" : locale, {maximumFractionDigits: 1});
  const rangeB = rimRangeInch(b.w);
  const loadB = LOAD_INDEX[b.li];

  const field = (s: Size, set: (v: Size) => void, prefix: string) => (
    <div className="tk-fieldrow">
      <div className="tk-field"><label htmlFor={prefix + "-w"}>{t.width}</label><input id={prefix + "-w"} data-testid={prefix + "-width"} type="number" inputMode="numeric" min={100} max={400} value={s.w} onChange={e => set({...s, w: Number(e.target.value)})} /></div>
      <div className="tk-field"><label htmlFor={prefix + "-r"}>{t.ratio}</label><input id={prefix + "-r"} data-testid={prefix + "-ratio"} type="number" inputMode="numeric" min={20} max={90} value={s.r} onChange={e => set({...s, r: Number(e.target.value)})} /></div>
      <div className="tk-field"><label htmlFor={prefix + "-rim"}>{t.rim}</label><input id={prefix + "-rim"} data-testid={prefix + "-rim"} type="number" inputMode="numeric" min={10} max={24} value={s.rim} onChange={e => set({...s, rim: Number(e.target.value)})} /></div>
      <div className="tk-field"><label htmlFor={prefix + "-li"}>{t.li}</label><input id={prefix + "-li"} data-testid={prefix + "-li"} type="number" inputMode="numeric" min={70} max={110} value={s.li} onChange={e => set({...s, li: Number(e.target.value)})} /></div>
    </div>
  );

  return (
    <section className="tk-tool" aria-labelledby="tyre-calc-title" data-testid="tyre-calculator">
      <div className="tk-tool-head"><span className="content-kicker">{t.kicker}</span><h2 id="tyre-calc-title">{t.title}</h2><p>{t.intro}</p></div>
      <div className="tk-form">
        <div><p className="tk-subhead">{t.current}</p>{field(a, setA, "tyre-a")}</div>
        <div><p className="tk-subhead">{t.alt}</p>{field(b, setB, "tyre-b")}</div>
        <dl className="tk-result" data-testid="tyre-result" aria-live="polite">
          <div className="tk-result-row"><dt>{t.diameter} ({t.current})</dt><dd data-testid="tyre-dia-a">{okA ? fmt(dA) + " mm" : "–"}</dd></div>
          <div className="tk-result-row"><dt>{t.diameter} ({t.alt})</dt><dd data-testid="tyre-dia-b">{okB ? fmt(dB) + " mm" : "–"}</dd></div>
          <div className="tk-result-row"><dt>{t.circ} ({t.alt})</dt><dd>{okB ? fmt(Math.PI * dB) + " mm" : "–"}</dd></div>
          <div className="tk-result-row"><dt>{t.deviation}</dt><dd data-testid="tyre-deviation">{okA && okB ? (dev > 0 ? "+" : "") + fmt(dev) + " %" : "–"}</dd></div>
          <div className="tk-result-row"><dt>{t.rimWidth} ({t.alt})</dt><dd data-testid="tyre-rimwidth">{okB ? `${fmt(rangeB[0])}–${fmt(rangeB[1])} ${t.inch}` : "–"}</dd></div>
          <div className="tk-result-row"><dt>{t.load} ({t.alt})</dt><dd data-testid="tyre-load">{loadB ? `${loadB} kg (LI ${b.li})` : t.liInvalid}</dd></div>
          {okA && okB && <span className={"tk-badge " + (within ? "is-ok" : "is-warn")} data-testid="tyre-verdict">{within ? t.ok : t.warn}</span>}
        </dl>
        <p className="tk-note">{t.note}</p>
      </div>
    </section>
  );
}
