"use client";
import { useEffect, useRef } from "react";
import type { Workshop } from "./api";

type Leaflet = { map: (el: HTMLElement, o?: object) => LMap; tileLayer: (url: string, o: object) => { addTo: (m: LMap) => void }; marker: (p: [number, number]) => { addTo: (m: LMap) => { bindPopup: (t: string) => void } }; latLngBounds: (p: [number, number][]) => unknown; layerGroup: () => LGroup };
type LMap = { fitBounds: (b: unknown, o?: object) => void; setView: (p: [number, number], z: number) => void; remove: () => void };
type LGroup = { addTo: (m: LMap) => LGroup; clearLayers: () => void };
declare global { interface Window { L?: Leaflet } }

let loader: Promise<Leaflet> | null = null;
function loadLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  loader ||= new Promise((resolve, reject) => {
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; document.head.appendChild(css);
    const script = document.createElement("script"); script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"; script.async = true;
    script.onload = () => window.L ? resolve(window.L) : reject(new Error("leaflet")); script.onerror = reject; document.head.appendChild(script);
  });
  return loader;
}
const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export default function WorkshopMap({ items, center }: { items: Workshop[]; center?: { lat: number; lon: number } | null }) {
  const host = useRef<HTMLDivElement>(null), map = useRef<LMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(L => {
      if (cancelled || !host.current) return;
      map.current?.remove();
      const m = L.map(host.current, { scrollWheelZoom: false }); map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap-Mitwirkende" }).addTo(m);
      const points = items.filter(w => typeof w.lat === "number" && typeof w.lon === "number");
      points.forEach(w => L.marker([w.lat!, w.lon!]).addTo(m).bindPopup(`<strong>${escape(w.name)}</strong><br>${escape([w.street, w.zip, w.city].filter(Boolean).join(", "))}`));
      if (points.length) m.fitBounds(L.latLngBounds(points.map(w => [w.lat!, w.lon!])), { padding: [24, 24], maxZoom: 13 });
      else if (center) m.setView([center.lat, center.lon], 11);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [items, center]);
  useEffect(() => () => map.current?.remove(), []);
  return <div ref={host} className="tk-map" role="img" aria-label="Karte der Suchergebnisse. Die gleichen Einträge stehen in der Liste daneben." data-testid="workshop-map" />;
}
