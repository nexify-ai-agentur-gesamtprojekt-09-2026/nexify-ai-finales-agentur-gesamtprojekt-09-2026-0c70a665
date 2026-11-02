import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

/* NeXify page catalog used for local, bounded guidance (no live AI). */
const NX_PAGES = [
  { id: 'websites', path: '/leistungen/websites', title: 'Websites & Landingpages', summary: 'Auftritt, Struktur und Inhalte als klare Website und Landingpages.' },
  { id: 'marke', path: '/leistungen/marke', title: 'Marke & Positionierung', summary: 'Positionierung, Gestaltung, Logo und Botschaft für einen hochwertigen Markenauftritt.' },
  { id: 'services', path: '/leistungen', title: 'Leistungsübersicht', summary: 'Alle Leistungen von Marke über Website bis Betreuung im Überblick.' },
  { id: 'automation', path: '/leistungen/automatisierung', title: 'Automatisierung', summary: 'Wiederkehrende Abläufe klar begrenzt automatisieren – mit Prüfschritten.' },
  { id: 'ki', path: '/leistungen/ki-agenten', title: 'KI & Agenten', summary: 'KI im Betrieb mit Datenquellen, Zugängen, Prüfschritten und Betreuung.' },
  { id: 'marketing', path: '/leistungen/marketing', title: 'Marketing & Kampagnen', summary: 'Zielgruppe, Ads, Inhalte und passende Landingpages mit abgestimmtem Budget.' },
  { id: 'pricing', path: '/preise', title: 'Pakete, Preise & Optionen', summary: 'Budgetrahmen, Pakete und Optionen vor dem Start.' },
  { id: 'contact', path: '/kontakt', title: 'Kontakt', summary: 'Persönliche Projektklärung mit Pascal Courbois.' },
  { id: 'nex2fly', path: '/produkte/nex2fly', title: 'NeX2fly Suite', summary: 'Produkt-Suite, um selbst mit KI zu arbeiten.' },
  { id: 'one', path: '/produkte/one', title: 'NeX Agentic AI', summary: 'Agentisches KI-Produkt mit eigenem Zugang.' },
  { id: 'api', path: '/produkte/api', title: 'NeXify API', summary: 'Programmatischer Zugang für Integrationen.' },
  { id: 'tk-home', path: '/teileklar', title: 'TEILEKLAR', summary: 'Eigenständiger Bereich für Teile- und Werkstattanliegen.' },
  { id: 'tk-search', path: '/teileklar/katalog', title: 'Teilekatalog', summary: 'Auto- und Motorradteile suchen; Passung ist damit nicht bestätigt.' },
  { id: 'tk-workshop', path: '/teileklar/werkstaetten', title: 'Werkstattsuche', summary: 'Partnerwerkstatt für die Montage finden.' },
];
const COPY = {
  heading: 'NeXify AI FACTORY B.V. · Website-Beratung ohne Live-KI.',
  brand: 'Marke & Web bündelt Positionierung, Gestaltung und Website. Der Einstieg „Markenstart" wird passend zu Ziel und Budget vereinbart.',
  systems: 'Systeme & KI beginnt mit einem klar begrenzten Ablauf. Für KI im Betrieb werden Datenquellen, Zugänge, Prüfschritte und Betreuung im Leistungsumfang festgelegt.',
  growth: 'Wachstum & Kampagnen verbindet Zielgruppe, Ads, Inhalte und passende Landingpages. Budget, Messung und Veröffentlichung werden vor dem Start abgestimmt und freigegeben.',
  general: 'NeXify verbindet Marke & Web, Systeme & KI und Wachstum & Kampagnen. Die folgenden Leistungswege helfen Ihnen, den passenden Einstieg und Umfang zu bestimmen.',
  product: 'NeX2fly, NeX Agentic AI und die API haben eigene Aufgaben und Zugänge. Maßgeblich sind die Informationen des jeweiligen Produktbereichs.',
  tk: 'TEILEKLAR ist der eigenständige Bereich für Teile- und Werkstattanliegen. Für eine passende Anfrage sind Fahrzeugdaten, gesuchtes Teil und gewünschte Arbeit relevant; eine Fahrzeugpassung oder Verfügbarkeit ist damit noch nicht bestätigt.',
  limits: 'Diese Einordnung entsteht lokal aus den öffentlichen Inhalten dieser Website. Es wird keine Anfrage versendet, nichts gebucht oder gekauft und kein Konto verändert. Für eine persönliche Abstimmung nutzen Sie die Kontaktseite.',
};
const tokenize = s => new Set((s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9äöüß]{2,}/g)) || []);
const BRAND = ['marke', 'markenstart', 'markenauftritt', 'brand', 'branding', 'website', 'websites', 'web', 'design', 'logo', 'landingpage', 'landingpages', 'auftritt'];
const GROWTH = ['ads', 'marketing', 'werbung', 'kampagne', 'kampagnen', 'wachstum', 'growth', 'reichweite', 'kunden'];
const SYSTEMS = ['ki', 'ai', 'automatisierung', 'automatisieren', 'automation', 'system', 'systeme', 'workflow', 'ablauf', 'prozess', 'abläufe'];
const VEHICLE = ['fahrzeug', 'ersatzteil', 'teilenummer', 'werkstatt', 'reifen', 'batterie', 'bremse', 'bremsen', 'motor', 'auto', 'motorrad', 'teil', 'teile'];
const hasAny = (t, w) => w.some(x => t.has(x));

function guide(question, forced) {
  const t = tokenize(question || '');
  let topic = forced || 'general';
  if (!forced) {
    if (question && hasAny(t, VEHICLE) && !hasAny(t, [...BRAND, ...GROWTH, ...SYSTEMS])) topic = 'tk';
    else if (hasAny(t, ['nex2fly', 'suite', 'api', 'agentic', 'oracle'])) topic = 'product';
    else if (hasAny(t, GROWTH)) topic = 'growth';
    else if (hasAny(t, SYSTEMS)) topic = 'systems';
    else if (hasAny(t, BRAND)) topic = 'brand';
  }
  const preferred = {
    brand: ['websites', 'marke', 'services'], systems: ['automation', 'ki', 'services'], growth: ['marketing', 'pricing', 'contact'],
    product: ['nex2fly', 'one', 'api'], tk: ['tk-home', 'tk-search', 'tk-workshop'], general: ['websites', 'automation', 'marketing'],
  }[topic];
  const site = topic === 'tk' ? 'tk' : 'nx';
  const pool = NX_PAGES.filter(p => (site === 'tk') === p.id.startsWith('tk-'));
  const ranked = pool.map(p => ({ p, s: [...tokenize(p.title + ' ' + p.summary)].filter(w => t.has(w)).length })).filter(e => e.s > 0).sort((a, b) => b.s - a.s).map(e => e.p);
  const picks = [...preferred.map(id => NX_PAGES.find(p => p.id === id)), ...ranked].filter(Boolean);
  const cards = [...new Map(picks.map(p => [p.path, p])).values()].slice(0, 3);
  return { text: [COPY.heading, COPY[topic], COPY.limits].join('\n\n'), cards };
}

const CHIPS = [['Marke & Web', 'brand'], ['Systeme & KI', 'systems'], ['Ads & Marketing', 'growth']];

export function OrientationChat() {
  const loc = useLocation();
  const isDesktop = typeof window !== 'undefined' && window.innerWidth > 1024;
  const [open, setOpen] = useState(isDesktop);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const ta = useRef(null);

  useEffect(() => { const esc = e => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, []);
  const workspace = loc.pathname.startsWith('/arbeitsbereich');
  useEffect(() => {
    const docked = open && !workspace && window.innerWidth > 1024;
    document.body.classList.toggle('orac-open', docked);
    return () => document.body.classList.remove('orac-open');
  }, [open, workspace, loc.pathname]);
  if (workspace) return null;

  const run = (forced) => { setResult(guide(input, forced)); requestAnimationFrame(() => document.getElementById('pk-result')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })); };

  return <>
    {!open && <button className="reopen-chat" onClick={() => { setOpen(true); requestAnimationFrame(() => ta.current?.focus()); }} data-testid="orientation-open" aria-expanded="false" aria-controls="aifly-panel">
      <span className="reopen-dot" />Projektklärung
    </button>}
    <aside id="aifly-panel" className="aifly-panel" aria-label="Projektklärung" hidden={!open} data-testid="orientation-panel">
      <div className="pk-top">
        <div className="pk-ident">
          <span className="pk-crumb">NeXify AI <span aria-hidden="true">/</span> FACTORY B.V.</span>
          <span className="pk-sub">NeX Agentic AI · AIFly ORACLE</span>
        </div>
        <button className="pk-close" onClick={() => setOpen(false)} aria-label="Projektklärung schließen" data-testid="orientation-close">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="pk-body">
        <span className="pk-contact"><span className="pk-contact-dot" />Persönliche Anfrage per Kontakt</span>
        <span className="pk-eyebrow">Website-Beratung · ohne Live-KI</span>
        <h2 className="pk-title">Ihr Projekt. Unser Einstieg.</h2>
        <p className="pk-lead">NeXify AI FACTORY B.V. verbindet Marke, digitale Systeme und Wachstum. Wählen Sie Ihren Schwerpunkt: ein neuer Auftritt, ein KI-gestützter Ablauf oder Ads und Marketing. Hier finden Sie die passenden Leistungen und den Weg zur persönlichen Projektklärung.</p>

        <div className="pk-chips" role="group" aria-label="Schwerpunkt wählen">
          {CHIPS.map(([label, key]) => <button key={key} type="button" className="pk-chip" onClick={() => run(key)} data-testid="orientation-starter">{label}<span aria-hidden="true">→</span></button>)}
        </div>

        {result && <div className="pk-result" id="pk-result" role="region" aria-label="Einordnung" data-testid="orientation-result">
          {result.text.split('\n\n').map((p, i) => <p key={i} className={i === result.text.split('\n\n').length - 1 ? 'pk-result-note' : ''}>{p}</p>)}
          {result.cards.length > 0 && <div className="pk-result-cards">{result.cards.map(c => <Link key={c.path} to={c.path} className="pk-card-link" onClick={() => isDesktop || setOpen(false)} data-testid="orientation-card"><strong>{c.title}</strong><span>{c.summary}</span></Link>)}</div>}
        </div>}

        <div className="pk-composer">
          <label className="pk-composer-label" htmlFor="pk-input">Was möchten Sie mit NeXify erreichen?</label>
          <textarea ref={ta} id="pk-input" rows={3} maxLength={1000} value={input} onChange={e => setInput(e.target.value)} placeholder="Ziel, Unternehmen und gewünschten Umfang beschreiben …" data-testid="orientation-input"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }} />
          <button className="pk-einordnen" onClick={() => run()} disabled={!input.trim()} data-testid="orientation-send">Anliegen einordnen</button>
        </div>

        <p className="pk-fineprint">Der Verlauf bleibt für diesen Besuch im Browser. Keine Buchung, kein Versand und kein verbindliches Angebot. Bitte keine Zugangsdaten oder vertraulichen Kundendaten eingeben.</p>
        <Link to="/projektbriefing" className="pk-prep" onClick={() => isDesktop || setOpen(false)}>Zur Projektvorbereitung<span aria-hidden="true">→</span></Link>
      </div>
    </aside>
  </>;
}
