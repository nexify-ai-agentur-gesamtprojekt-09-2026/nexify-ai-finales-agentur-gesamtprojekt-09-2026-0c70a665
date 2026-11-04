"use client";
import { useEffect, useState } from "react";
import { useShopCopy } from "./ProductCard";
import "./shop.css";

// Dauerhafte Fahrzeugauswahl am Kopf jeder TEILEKLAR-Fläche (deutscher Shop-Standard: Fahrzeug zuerst).
// Speichert die Wahl pro Besucher in localStorage und meldet sie per Event, damit Suche und Passung sie lesen.
// Keine automatische Katalogfilterung gegen einen Fahrzeugkatalog — das bleibt bis zur echten Sortimentquelle offen.
export const VEHICLE_KEY = "tk.vehicle";
export const VEHICLE_EVENT = "tk:vehicle";

export type Vehicle = { hsn?: string; tsn?: string; manual?: string };

export function vehicleLabel(v: Vehicle | null): string {
  if (!v) return "";
  if (v.manual?.trim()) return v.manual.trim();
  return [v.hsn?.trim(), v.tsn?.trim()].filter(Boolean).join(" · ");
}

function read(): Vehicle | null {
  try { const raw = localStorage.getItem(VEHICLE_KEY); if (!raw) return null; const v = JSON.parse(raw) as Vehicle; return vehicleLabel(v) ? v : null; }
  catch { return null; }
}

export default function VehicleBar() {
  const { t } = useShopCopy();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [open, setOpen] = useState(false);
  const [hsn, setHsn] = useState("");
  const [tsn, setTsn] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => { const v = read(); setVehicle(v); if (v) { setHsn(v.hsn || ""); setTsn(v.tsn || ""); setManual(v.manual || ""); } setOpen(!v); }, []);

  const store = (v: Vehicle | null) => {
    setVehicle(v);
    try { if (v) localStorage.setItem(VEHICLE_KEY, JSON.stringify(v)); else localStorage.removeItem(VEHICLE_KEY); } catch { /* per-viewer only */ }
    window.dispatchEvent(new CustomEvent(VEHICLE_EVENT, { detail: v }));
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const v: Vehicle = { hsn: hsn.trim(), tsn: tsn.trim(), manual: manual.trim() };
    if (!vehicleLabel(v)) return;
    store(v); setOpen(false);
  };

  const label = vehicleLabel(vehicle);
  return <section className="tk-vehicle-bar" aria-labelledby="tk-vehicle-title" data-testid="vehicle-bar">
    <div className="tk-vehicle-head">
      <span className="eyebrow" id="tk-vehicle-title">{t("vehicleLabel")}</span>
      <p className="tk-vehicle-current" data-testid="vehicle-current">{label || t("vehicleNone")}</p>
      <button type="button" className="outline-button" aria-expanded={open} data-testid="vehicle-toggle" onClick={() => setOpen(o => !o)}>{vehicle ? t("vehicleChange") : t("vehicleChoose")}</button>
    </div>
    {open && <form className="tk-vehicle-form" onSubmit={save} data-testid="vehicle-form">
      <div className="tk-form-grid">
        <label className="tk-field">{t("vehicleHsn")}<input value={hsn} maxLength={4} inputMode="numeric" pattern="[0-9]{4}" onChange={e => setHsn(e.target.value.replace(/\D/g, ""))} data-testid="vehicle-hsn" /></label>
        <label className="tk-field">{t("vehicleTsn")}<input value={tsn} maxLength={3} onChange={e => setTsn(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} data-testid="vehicle-tsn" /></label>
        <label className="tk-field is-wide">{t("vehicleManual")}<input value={manual} maxLength={120} placeholder="z. B. VW Golf VII 1.6 TDI, 2015" onChange={e => setManual(e.target.value)} data-testid="vehicle-manual" /></label>
      </div>
      <p className="tk-meta">{t("vehicleHint")}</p>
      <div className="tk-actions">
        <button type="submit" className="primary-button" data-testid="vehicle-save">{t("vehicleSave")}</button>
        {vehicle && <button type="button" className="outline-button" data-testid="vehicle-clear" onClick={() => { setHsn(""); setTsn(""); setManual(""); store(null); setOpen(true); }}>{t("vehicleClear")}</button>}
      </div>
    </form>}
  </section>;
}
