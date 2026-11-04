"use client";
import { useState } from "react";
import "./shop.css";

const WIDTHS = [155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315];
const RATIOS = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80];
const RIMS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const CHECKS = [
  "Die Größe muss in der Zulassungsbescheinigung Teil I (Feld 15) oder im CoC stehen. Sonst sind Teilegutachten und Eintragung nötig.",
  "Der Tragfähigkeitsindex (LI) darf nie unter dem Wert der Fahrzeugpapiere liegen.",
  "Der Geschwindigkeitsindex muss zur bauartbedingten Höchstgeschwindigkeit passen.",
  "Die Felgenbreite muss zur Reifenbreite passen.",
  "Bei geändertem Durchmesser die Freigängigkeit bei vollem Lenkeinschlag und voller Beladung prüfen.",
  "RDKS-Sensoren müssen nach dem Wechsel neu angelernt werden.",
];
type Size = { w: number; r: number; d: number };
const diameter = (s: Size) => s.d * 25.4 + 2 * (s.w * s.r / 100);
const fmt = (v: number, digits = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function SizePicker({ label, value, onChange, id }: { label: string; value: Size; onChange: (s: Size) => void; id: string }) {
  const select = (key: keyof Size, options: number[], name: string) => <label className="tk-field">{name}
    <select value={value[key]} onChange={e => onChange({ ...value, [key]: Number(e.target.value) })} data-testid={`tyre-${id}-${key}`}>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></label>;
  return <fieldset className="tk-form-grid tk-tyre-size"><legend>{label}: {value.w}/{value.r} R{value.d}</legend>{select("w", WIDTHS, "Breite")}{select("r", RATIOS, "Höhe (%)")}{select("d", RIMS, "Zoll")}</fieldset>;
}

export default function TyreCalculator() {
  const [a, setA] = useState<Size>({ w: 205, r: 55, d: 16 }), [b, setB] = useState<Size>({ w: 225, r: 45, d: 17 });
  const dA = diameter(a), dB = diameter(b), dev = (dB - dA) / dA * 100, abs = Math.abs(dev);
  const level = abs <= 1.5 ? "ok" : abs <= 2.5 ? "warn" : "bad";
  const verdict = { ok: "Abweichung unter 1,5 %: unkritisch", warn: "Abweichung 1,5 bis 2,5 %: grenzwertig, nur mit Eintragung oder Teilegutachten", bad: "Abweichung über 2,5 %: zu groß, vor der Montage prüfen lassen" }[level];
  return <section className="tk-form" aria-labelledby="tyre-title" data-testid="tyre-calculator">
    <h2 id="tyre-title">Reifenrechner</h2>
    <p className="tk-meta">Vergleicht Durchmesser, Abrollumfang und Tachoabweichung zweier Reifengrößen. Das Ergebnis ersetzt keine Prüfung der Fahrzeugpapiere.</p>
    <SizePicker id="current" label="Aktuelle Größe" value={a} onChange={setA} />
    <SizePicker id="planned" label="Geplante Größe" value={b} onChange={setB} />
    <dl className="tk-tyre-results" aria-live="polite">
      <div><dt>Durchmesser</dt><dd data-testid="tyre-diameter">{fmt(dA, 1)}&nbsp;mm → {fmt(dB, 1)}&nbsp;mm</dd></div>
      <div><dt>Abrollumfang</dt><dd data-testid="tyre-circumference">{fmt(Math.PI * dA)}&nbsp;mm → {fmt(Math.PI * dB)}&nbsp;mm</dd></div>
      <div><dt>Abweichung</dt><dd data-testid="tyre-deviation">{dev >= 0 ? "+" : "−"}{fmt(abs, 2)}&nbsp;%</dd></div>
      <div><dt>Bodenfreiheit</dt><dd data-testid="tyre-clearance">{dB >= dA ? "+" : "−"}{fmt(Math.abs(dB - dA) / 2, 1)}&nbsp;mm</dd></div>
      <div><dt>Tacho zeigt 100 km/h, tatsächlich</dt><dd data-testid="tyre-speedo">{fmt(100 * dB / dA, 1)}&nbsp;km/h</dd></div>
    </dl>
    <p className={`tk-tyre-verdict is-${level}`} role="status" data-testid="tyre-verdict">{verdict}</p>
    <h3>Vor der Montage prüfen</h3>
    <ul className="tk-checklist">{CHECKS.map(c => <li key={c}>{c}</li>)}</ul>
  </section>;
}
