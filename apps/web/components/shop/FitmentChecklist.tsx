"use client";
import { useState } from "react";
import {ActionButton} from '../ActionControl';
import {HcArrow} from '../HcArrow';
import { SiteLink } from "../Router";
import "./shop.css";
import { useShopCopy } from "./ProductCard";
import { STORY, type StoryLocale } from "./product-story-copy";

const CAT_IDS = ["brakes", "battery", "lighting", "filters", "suspension", "tires"] as const;

export default function FitmentChecklist() {
  const [catId, setCatId] = useState(""), [hsn, setHsn] = useState(""), [tsn, setTsn] = useState(""), [vehicle, setVehicle] = useState(""), [summary, setSummary] = useState(false);
  const { locale } = useShopCopy();
  const story = STORY[(locale as StoryLocale) in STORY ? (locale as StoryLocale) : "de"];
  const c = story.check;
  const cats = CAT_IDS.map(id => ({ id, label: story.guides[id].name, points: story.guides[id].points, pitfall: story.guides[id].pitfall }));
  const cat = cats.find(item => item.id === catId);
  const vehicleText = vehicle.trim() || [hsn.trim(), tsn.trim()].filter(Boolean).join(" · ") || c.yourVehicle;
  return <section className="tk-form" aria-labelledby="fit-title" data-testid="fitment-checklist">
    <h2 id="fit-title">{c.title}</h2>
    <ul className="tk-story-trust">{story.trust.map(item => <li key={item}>{item}</li>)}</ul>
    <h3>{story.stepsTitle}</h3>
    <ol className="tk-story-steps" data-testid="fit-steps">{story.steps.map(([title, body], index) => <li key={title}><span className="tk-story-num" aria-hidden="true">{index + 1}</span><div><strong>{title}</strong><p>{body}</p></div></li>)}</ol>
    <p className="tk-meta">{c.lead}</p>
    <div className="tk-actions" role="group" aria-label={c.catGroup}>{cats.map(item => <ActionButton key={item.id} variant={item.id === catId ? "primary" : "secondary"} className={item.id === catId ? "hc-finish-primary" : "hc-text-link"} aria-pressed={item.id === catId} onClick={() => { setCatId(item.id); setSummary(false); }} data-testid={`fit-cat-${item.id}`}>{item.label}</ActionButton>)}</div>
    {cat && <><h3>{c.decides(cat.label)}</h3><ul className="tk-checklist" data-testid="fit-points">{cat.points.map(p => <li key={p}>{p}</li>)}</ul><p className="tk-notice" data-testid="fit-pitfall"><strong>{c.pitfall}</strong> {cat.pitfall}</p>
      <div className="tk-form-grid">
        <label className="tk-field">{c.hsn}<input value={hsn} maxLength={4} inputMode="numeric" pattern="[0-9]{4}" onChange={e => setHsn(e.target.value.replace(/\D/g, ""))} data-testid="fit-hsn" /></label>
        <label className="tk-field">{c.tsn}<input value={tsn} maxLength={3} onChange={e => setTsn(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""))} data-testid="fit-tsn" /></label>
        <label className="tk-field is-wide">{c.model}<input value={vehicle} maxLength={120} placeholder={c.modelPlaceholder} onChange={e => setVehicle(e.target.value)} data-testid="fit-vehicle" /></label>
      </div>
      <div className="tk-actions"><ActionButton variant="primary" className="hc-finish-primary" onClick={() => setSummary(true)} data-testid="fit-summary-button">{c.summaryButton}</ActionButton></div>
      {summary && <div className="tk-notice" role="status" data-testid="fit-summary"><strong>{c.summaryTitle(cat.label, vehicleText)}</strong><p>{c.summaryLead}</p><ul className="tk-checklist">{cat.points.map(p => <li key={p}>{p}</li>)}</ul></div>}</>}
    <div className="tk-actions"><SiteLink href="/teileklar/suche" className="hc-text-link" data-testid="fit-search-link">{c.search}<HcArrow/></SiteLink><SiteLink href="/teileklar/werkstatt" className="hc-text-link" data-testid="fit-workshop-link">{c.workshop}<HcArrow/></SiteLink></div>
  </section>;
}
