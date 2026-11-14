"use client";
import { useState } from "react";
import {ActionButton} from '../ActionControl';
import {HcArrow} from '../HcArrow';
import { SiteLink } from "../Router";
import "./shop.css";

const CATS = [
  { id: "brakes", label: "Bremsen", points: ["Scheibendurchmesser und -dicke in mm", "Belüftet oder voll (nicht austauschbar)", "Vorderachse oder Hinterachse", "Motorcode bei leistungsstarken Varianten"], pitfall: "Ein passender Scheibendurchmesser reicht nicht: Bei stärkeren Motoren ist oft eine größere Bremsanlage verbaut." },
  { id: "battery", label: "Batterie", points: ["Kapazität in Ah und Kälteprüfstrom in A", "Start-Stopp-Ausführung (EFB/AGM) oder konventionell", "Gehäusemaß und Polanordnung", "Halterung passend zum Fahrzeug"], pitfall: "Eine Batterie mit passender Kapazität, aber falscher Technologie, kann die Start-Stopp-Funktion deaktivieren oder vorzeitig altern." },
  { id: "lighting", label: "Beleuchtung", points: ["Lampentyp und Sockel, z. B. H7 oder LED-Modul", "Rechts- oder Linksverkehr-Ausführung beim Scheinwerfer", "Blink- und Bremslicht-Kombination", "Steuergerät-Kompatibilität bei Nachrüstung"], pitfall: "Nicht jede LED-Nachrüstung ist für die Serien-Elektronik freigegeben." },
  { id: "filters", label: "Filter", points: ["Filtertyp: Luft, Öl, Innenraum oder Kraftstoff", "Aktivkohle oder Partikelfilter beim Innenraumfilter", "Exakte Maße: Länge × Breite × Höhe", "Einbauposition am Fahrzeug"], pitfall: "Zwei Filter mit gleichen Außenmaßen können unterschiedliche Dichtflächen haben. Ohne OE-Nummer bleibt ein Risiko." },
  { id: "suspension", label: "Fahrwerk", points: ["Federrate und Bauform: Schraubenfeder oder Luftfederung", "Vorder- oder Hinterachse", "Tieferlegung ja oder nein", "Teilegutachten bei Sportfahrwerken"], pitfall: "Ein Fahrwerksteil ohne Teilegutachten kann die Betriebserlaubnis erlöschen lassen." },
  { id: "tires", label: "Reifen", points: ["Reifengröße: Breite, Höhe, Zoll", "Lastindex und Geschwindigkeitsindex", "Saison: Sommer, Winter oder Ganzjahr", "Herstellerfreigabe bei bestimmten Modellen"], pitfall: "Ein Reifen mit passender Größe, aber zu niedrigem Lastindex, ist keine zulässige Ausrüstung." },
];

export default function FitmentChecklist() {
  const [catId, setCatId] = useState(""), [hsn, setHsn] = useState(""), [tsn, setTsn] = useState(""), [vehicle, setVehicle] = useState(""), [summary, setSummary] = useState(false);
  const cat = CATS.find(c => c.id === catId);
  const vehicleText = vehicle.trim() || [hsn.trim(), tsn.trim()].filter(Boolean).join(" · ") || "Ihr Fahrzeug";
  return <section className="tk-form" aria-labelledby="fit-title" data-testid="fitment-checklist">
    <h2 id="fit-title">Passung prüfen: Worauf es ankommt</h2>
    <p className="tk-meta">Ein Artikelname belegt keine Passung. Wählen Sie eine Kategorie und sehen Sie, welche Angaben entscheiden. Eine automatische Passungsprüfung gegen einen Fahrzeugkatalog gibt es noch nicht.</p>
    <div className="tk-actions" role="group" aria-label="Kategorie wählen">{CATS.map(c => <ActionButton key={c.id} variant={c.id === catId ? "primary" : "secondary"} className={c.id === catId ? "hc-finish-primary" : "hc-text-link"} aria-pressed={c.id === catId} onClick={() => { setCatId(c.id); setSummary(false); }} data-testid={`fit-cat-${c.id}`}>{c.label}</ActionButton>)}</div>
    {cat && <><h3>Diese Angaben entscheiden bei {cat.label}</h3><ul className="tk-checklist" data-testid="fit-points">{cat.points.map(p => <li key={p}>{p}</li>)}</ul><p className="tk-notice" data-testid="fit-pitfall"><strong>Häufigster Irrtum:</strong> {cat.pitfall}</p>
      <div className="tk-form-grid">
        <label className="tk-field">HSN (Feld 2.1)<input value={hsn} maxLength={4} inputMode="numeric" pattern="[0-9]{4}" onChange={e => setHsn(e.target.value.replace(/\D/g, ""))} data-testid="fit-hsn" /></label>
        <label className="tk-field">TSN (Feld 2.2)<input value={tsn} maxLength={3} onChange={e => setTsn(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} data-testid="fit-tsn" /></label>
        <label className="tk-field is-wide">oder Modell, Motor, Baujahr<input value={vehicle} maxLength={120} placeholder="z. B. VW Golf VII 1.6 TDI, 2015" onChange={e => setVehicle(e.target.value)} data-testid="fit-vehicle" /></label>
      </div>
      <div className="tk-actions"><ActionButton variant="primary" className="hc-finish-primary" onClick={() => setSummary(true)} data-testid="fit-summary-button">Zusammenfassung erstellen</ActionButton></div>
      {summary && <div className="tk-notice" role="status" data-testid="fit-summary"><strong>{cat.label} für {vehicleText}</strong><p>Keine Passungsprüfung. Fragen Sie beim Kauf oder in der Werkstatt nach:</p><ul className="tk-checklist">{cat.points.map(p => <li key={p}>{p}</li>)}</ul></div>}</>}
    <div className="tk-actions"><SiteLink href="/teileklar/suche" className="hc-text-link" data-testid="fit-search-link">Teilesuche öffnen<HcArrow/></SiteLink><SiteLink href="/teileklar/werkstatt" className="hc-text-link" data-testid="fit-workshop-link">Werkstatt in der Nähe suchen<HcArrow/></SiteLink></div>
  </section>;
}
