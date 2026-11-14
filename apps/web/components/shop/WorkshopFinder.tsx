"use client";
import { useEffect, useState } from "react";
import {ActionButton} from '../ActionControl';
import { SiteLink, useSiteNavigate } from "../Router";
import { api, type Workshop } from "./api";
import WorkshopMap from "./WorkshopMap";

type Result = { q: string; radius_km: number; center: { lat: number; lon: number; basis: string } | null; total: number; results: Workshop[]; unlocated: Workshop[] };
const RADII = [10, 25, 50, 100];

export default function WorkshopFinder({ q = "", radius = 25 }: { q?: string; radius?: number }) {
  const navigate = useSiteNavigate();
  const [term, setTerm] = useState(q), [r, setR] = useState(radius), [result, setResult] = useState<Result | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  useEffect(() => {
    setTerm(q); setR(radius);
    if (q.trim().length < 2) { setResult(null); return; }
    setLoading(true); setError("");
    api<Result>("/api/workshops/search?" + new URLSearchParams({ q, radius: String(radius) })).then(setResult).catch(() => setError("Die Suche konnte nicht ausgeführt werden.")).finally(() => setLoading(false));
  }, [q, radius]);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (term.trim().length < 2) { setError("Bitte geben Sie eine PLZ oder einen Ort ein (mindestens 2 Zeichen)."); return; }
    navigate("/teileklar/werkstatt?" + new URLSearchParams({ q: term.trim(), umkreis: String(r) }));
  }
  return <div className="tk-finder" data-testid="workshop-finder">
    <form role="search" className="tk-search tk-finder-form" onSubmit={submit} noValidate data-testid="workshop-search-form">
      <div className="tk-field"><label htmlFor="ws-q">PLZ oder Ort</label><input id="ws-q" value={term} maxLength={80} onChange={event => setTerm(event.target.value)} aria-invalid={Boolean(error) && !result} aria-describedby={error ? "ws-error" : undefined} data-testid="workshop-search-input" /></div>
      <div className="tk-field"><label htmlFor="ws-r">Umkreis</label><select id="ws-r" value={r} onChange={event => setR(Number(event.target.value))} data-testid="workshop-radius-select">{RADII.map(v => <option key={v} value={v}>{v} km</option>)}</select></div>
      <ActionButton variant="primary" className="hc-finish-primary" type="submit" data-testid="workshop-search-submit">Werkstätten suchen</ActionButton>
    </form>
    {error && <p id="ws-error" role="alert" className="tk-alert" data-testid="workshop-search-error">{error}</p>}
    <p className="tk-note">Alle Einträge stammen aus einem Werkstattverzeichnis. Es handelt sich um Verzeichnisbetriebe, nicht um TEILEKLAR-Partner. Entfernungen sind Luftlinie.</p>
    {loading && <p role="status">Werkstätten werden gesucht …</p>}
    {result && !loading && (result.total === 0 && !result.unlocated.length ? <div className="tk-empty" data-testid="workshop-no-results"><h2>Keine Werkstatt gefunden</h2><p>Für „{result.q}“ im Umkreis von {result.radius_km} km gibt es keinen Eintrag. Vergrößern Sie den Umkreis oder prüfen Sie PLZ bzw. Ort.</p></div>
      : <div className="tk-finder-results">
        <p role="status" className="tk-count" data-testid="workshop-result-count">{result.total} Werkstätten im Umkreis von {result.radius_km} km um „{result.q}“{result.center?.basis === "plz_bereich" ? " (Mittelpunkt aus dem PLZ-Bereich abgeleitet)" : ""}</p>
        <div className="tk-finder-layout"><WorkshopMap items={result.results} center={result.center} />
          <ol className="tk-ws-list" data-testid="workshop-result-list">{[...result.results, ...result.unlocated].map(w => <li key={w.id} data-testid={"workshop-result-" + w.id}>
            <SiteLink href={"/teileklar/werkstatt/" + w.id} data-testid={"workshop-link-" + w.id}><strong>{w.name}</strong></SiteLink>
            <span className="tk-meta">{[w.street, [w.zip, w.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</span>
            <span className="tk-ws-tags"><span className="tk-tag" data-testid="workshop-directory-label">{w.kind_label}</span><span data-testid="workshop-distance">{typeof w.distance_km === "number" ? `${w.distance_km.toLocaleString("de-DE")} km Luftlinie` : "Entfernung unbekannt"}</span></span>
          </li>)}</ol></div>
      </div>)}
  </div>;
}
