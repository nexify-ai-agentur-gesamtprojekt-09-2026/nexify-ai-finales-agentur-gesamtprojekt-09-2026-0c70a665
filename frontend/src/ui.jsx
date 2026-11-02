import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight, ChevronDown, Menu, X, Play, Pause, Volume2, VolumeX, Captions, ShoppingCart } from 'lucide-react';
import { api, newKey } from './api.js';
import { useAuth } from './auth.jsx';

export const Arrow = () => <ArrowRight size={18} aria-hidden="true" />;
export const Go = ({ to, children, className = 'link', ...p }) => to?.startsWith('#') ? <a href={to} className={className} {...p}>{children}</a> : <Link to={to} className={className} {...p}>{children}</Link>;

export function Crumbs({ items }) {
  return <nav className="crumbs" aria-label="Brotkrumen"><Link to="/">Start</Link>{items.map(([l, to], i) => <React.Fragment key={l}><span aria-hidden="true">/</span>{to && i < items.length - 1 ? <Link to={to}>{l}</Link> : <span aria-current="page">{l}</span>}</React.Fragment>)}</nav>;
}

export function PageHero({ kicker, title, lead, image, alt = '', crumbs, children }) {
  return <section className="page-hero"><div className="wrap">
    {crumbs && <Crumbs items={crumbs} />}
    <div className="page-hero-grid">
      <div><span className="kicker"><i />{kicker}</span><h1 data-testid="page-title">{title}</h1>{lead && <p className="lead">{lead}</p>}{children}</div>
      {image && <figure className="page-art" style={{ margin: 0 }}><img src={image} alt={alt} width="1400" height="1050" loading="eager" /></figure>}
    </div></div></section>;
}

export function CtaBand({ title = 'Was braucht Ihr Vorhaben?', text = 'Beschreiben Sie Ziel und Ausgangslage. Pascal meldet sich persönlich mit dem nächsten Schritt.', cta = { label: 'Projekt beschreiben', to: '/projektbriefing' }, alt }) {
  return <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><div className="cta-band">
    <div><h2 style={{ fontSize: 'clamp(24px,2.4vw,34px)' }}>{title}</h2><p style={{ marginTop: 10, maxWidth: '56ch' }}>{text}</p></div>
    <div className="hero-actions"><Go to={cta.to} className="btn btn-primary" data-testid="cta-primary">{cta.label}<Arrow /></Go>{alt && <Go to={alt.to} className="btn btn-ghost">{alt.label}</Go>}</div>
  </div></div></section>;
}

const MENU = [
  ['Leistungen', [['Leistungsübersicht', '/leistungen'], ['Marke & Positionierung', '/leistungen/marke'], ['Websites & Landingpages', '/leistungen/websites'], ['Automatisierung', '/leistungen/automatisierung'], ['KI & Agenten', '/leistungen/ki-agenten'], ['Marketing & Kampagnen', '/leistungen/marketing'], ['SEO & Sichtbarkeit', '/leistungen/seo'], ['Betreuung · Care', '/care']]],
  ['Produkte', [['Produktübersicht', '/produkte'], ['NeX2fly Suite', '/produkte/nex2fly'], ['NeX Agentic AI', '/produkte/one'], ['AIFly ORACLE', '/produkte/oracle'], ['NeXify API', '/produkte/api'], ['Skills-Katalog', '/skills'], ['Verbindungen', '/verbindungen']]],
  ['Zusammenarbeit', [['Projektablauf', '/zusammenarbeit'], ['Pakete, Preise & Optionen', '/preise'], ['Unternehmen & Pascal', '/unternehmen'], ['Referenzen', '/referenzen'], ['Projektbriefing', '/projektbriefing'], ['Terminwunsch', '/termin'], ['Hilfe & Status', '/hilfe']]],
];

export function Header() {
  const [open, setOpen] = useState(null), [mobile, setMobile] = useState(false), loc = useLocation(), { user } = useAuth();
  useEffect(() => { setOpen(null); setMobile(false); }, [loc.pathname]);
  useEffect(() => { const esc = e => e.key === 'Escape' && (setOpen(null), setMobile(false)); window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, []);
  return <header className="site-header"><div className="wrap" style={{ position: 'relative' }}>
    <Link to="/" className="brand" data-testid="brand-home"><img src="/media/brand/nexify-ai-signet.svg" alt="" /><span className="brand-text">NeXify AI<small>Chat it. Automate it.</small></span></Link>
    <nav className="nav" aria-label="Hauptnavigation" onMouseLeave={() => setOpen(null)}>
      {MENU.map(([label, items]) => <div key={label}>
        <button aria-expanded={open === label} onClick={() => setOpen(open === label ? null : label)} onMouseEnter={() => setOpen(label)} data-testid={`nav-${label}`}>{label}<ChevronDown size={15} /></button>
        {open === label && <div className="mega" role="menu"><div><h4>{label}</h4>{items.slice(0, Math.ceil(items.length / 2)).map(([l, to]) => <Link key={to} to={to}>{l}<Arrow /></Link>)}</div><div><h4>&nbsp;</h4>{items.slice(Math.ceil(items.length / 2)).map(([l, to]) => <Link key={to} to={to}>{l}<Arrow /></Link>)}</div>
          <div className="glass card" style={{ borderRadius: 20 }}><h4>Ihr nächster Schritt</h4><p style={{ fontSize: 14 }}>Ihr Projekt verdient einen klaren Rahmen.</p><Link to="/projektbriefing" className="btn btn-primary btn-sm" style={{ marginTop: 16, display: 'inline-flex', color: '#1a1d0c' }}>Projekt beschreiben</Link></div></div>}
      </div>)}
      <NavLink to="/teileklar" data-testid="nav-teileklar">TEILEKLAR</NavLink>
      <NavLink to="/kontakt" data-testid="nav-kontakt">Kontakt</NavLink>
    </nav>
    <div className="header-actions">
      <span className="lang-pill" aria-hidden="true">DE<ChevronDown size={13} /></span>
      <Link to={user ? '/arbeitsbereich' : '/anmelden'} className="btn btn-ghost btn-sm hide-m" data-testid="nav-account">{user ? 'Arbeitsbereich' : 'Anmelden'}</Link>
      <Link to="/projektbriefing" className="btn btn-primary btn-sm hide-m" data-testid="nav-briefing"><span className="cta-dot" aria-hidden="true" />Projektgespräch anfragen</Link>
      <button className="burger" aria-label={mobile ? 'Menü schließen' : 'Menü'} aria-expanded={mobile} onClick={() => setMobile(!mobile)} data-testid="mobile-menu">{mobile ? <X /> : <Menu />}</button>
    </div>
  </div>
    {mobile && <div className="mobile-panel">{MENU.map(([label, items]) => <div key={label}><h4>{label}</h4>{items.map(([l, to]) => <Link key={to} to={to}>{l}</Link>)}</div>)}<h4>Mehr</h4><Link to="/teileklar">TEILEKLAR Shop</Link><Link to="/kontakt">Kontakt</Link><Link to={user ? '/arbeitsbereich' : '/anmelden'}>{user ? 'Arbeitsbereich' : 'Anmelden / Registrieren'}</Link></div>}
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="wrap">
    <div className="footer-grid">
      <div><Link to="/" className="brand"><img src="/media/brand/nexify-ai-signet.svg" alt="" />NeXify AI</Link><p style={{ marginTop: 14, fontSize: 14, maxWidth: '34ch' }}>Marke, Websites, Systeme und Wachstum – persönlich begleitet von Pascal Courbois.</p></div>
      <div><h4>Leistungen</h4><Link to="/leistungen">Übersicht</Link><Link to="/leistungen/websites">Websites</Link><Link to="/leistungen/automatisierung">Automatisierung</Link><Link to="/leistungen/marketing">Marketing</Link><Link to="/care">Care</Link></div>
      <div><h4>Produkte</h4><Link to="/produkte/nex2fly">NeX2fly Suite</Link><Link to="/produkte/one">NeX Agentic AI</Link><Link to="/produkte/oracle">AIFly ORACLE</Link><Link to="/produkte/api">NeXify API</Link><Link to="/teileklar">TEILEKLAR</Link></div>
      <div><h4>Kontakt</h4><Link to="/kontakt">Kontakt</Link><Link to="/projektbriefing">Projektbriefing</Link><Link to="/termin">Terminwunsch</Link><Link to="/hilfe">Hilfe & Status</Link></div>
      <div><h4>Rechtliches</h4><Link to="/rechtliches/impressum">Impressum</Link><Link to="/rechtliches/datenschutz">Datenschutz</Link><Link to="/rechtliches/agb">AGB (B2B)</Link><Link to="/rechtliches/cookies">Cookies</Link><Link to="/rechtliches/ki-hinweise">KI-Hinweise</Link><Link to="/rechtliches/barrierefreiheit">Barrierefreiheit</Link></div>
    </div>
    <div className="footer-bottom"><span>© 2026 NeXify AI · Inhaber Pascal Courbois</span><span>Entwurfsfassung – rechtliche Texte vor Go-live fachlich zu prüfen.</span></div>
  </div></footer>;
}

export function HeroFilm({ src, poster, captions, transcript, title }) {
  const ref = useRef(null), box = useRef(null);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true), [cc, setCc] = useState(true), [vol, setVol] = useState(.8), [p, setP] = useState(0), [state, setState] = useState('bereit');
  useEffect(() => {
    const v = ref.current; if (!v) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio < .35) v.pause(); else if (!reduce && !v.ended && !v.dataset.user) v.play().catch(() => {}); }, { threshold: [0, .35] });
    io.observe(box.current); return () => io.disconnect();
  }, []);
  const ccMode = on => { const t = ref.current?.textTracks; if (t) for (let i = 0; i < t.length; i++) t[i].mode = on ? 'showing' : 'hidden'; };
  const play = async withSound => {
    const v = ref.current; v.dataset.user = '1';
    if (withSound) { v.muted = false; v.volume = vol || .8; setMuted(false); if (v.ended || v.currentTime > 0.5 && muted) v.currentTime = 0; }
    try { await v.play(); } catch { setState('fehler'); }
  };
  return <div className="screen-wrap" ref={box} data-testid="hero-media">
    <div className="screen"><div className="screen-inner">
      <video ref={ref} src={src} poster={poster} muted={muted} playsInline preload="metadata" aria-label={title} data-testid="hero-video"
        onPlay={() => { setPlaying(true); setState('läuft'); }} onPause={() => setPlaying(false)} onWaiting={() => setState('lädt')} onPlaying={() => setState('läuft')}
        onEnded={() => { setPlaying(false); setState('beendet'); setP(1); }} onError={() => setState('fehler')} onLoadedMetadata={() => ccMode(cc)}
        onTimeUpdate={e => { const v = e.currentTarget; if (v.duration) setP(v.currentTime / v.duration); }}>
        {captions && <track kind="captions" src={captions} srcLang="de" label="Deutsch" default />}
      </video>
      <div className="screen-glare" />
      {state === 'lädt' && <span className="film-status" role="status">Video lädt …</span>}
      {state === 'fehler' && <span className="film-status" role="status">Der Film ist gerade nicht verfügbar. Der Text steht im Transkript.</span>}
      <div className="film-controls">
        <button onClick={() => playing ? (ref.current.dataset.user = '1', ref.current.pause()) : play(false)} aria-label={playing ? 'Film pausieren' : state === 'beendet' ? 'Erneut abspielen' : 'Film abspielen'} data-testid="film-play">{playing ? <Pause size={16} /> : <Play size={16} />}<span className="lbl">{playing ? 'Pause' : state === 'beendet' ? 'Erneut' : 'Abspielen'}</span></button>
        <button onClick={() => muted ? play(true) : (ref.current.muted = true, setMuted(true))} aria-label={muted ? 'Mit Ton abspielen' : 'Ton aus'} data-testid="film-sound">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}<span className="lbl">{muted ? 'Mit Ton' : 'Ton aus'}</span></button>
        <button aria-pressed={cc} onClick={() => { setCc(!cc); ccMode(!cc); }} aria-label="Untertitel" data-testid="film-cc"><Captions size={16} /><span className="lbl">Untertitel</span></button>
        <label><span className="visually-hidden">Lautstärke</span><input type="range" min="0" max="1" step=".05" value={vol} onChange={e => { const n = +e.target.value; setVol(n); ref.current.volume = n; ref.current.muted = n === 0; setMuted(n === 0); }} aria-label="Lautstärke" data-testid="film-volume" /></label>
      </div>
      <div className="film-progress" aria-hidden="true"><span style={{ transform: `scaleX(${p})` }} /></div>
    </div><span className="screen-led" /></div>
    <div className="screen-stand" /><div className="screen-foot" />
    {transcript && <details className="transcript"><summary>Gesprochener Text (Transkript)</summary><p>{transcript}</p></details>}
  </div>;
}

/* Generic inbound form: persistence-confirmed success, idempotent retry, timeout recovery. */
export function InboundForm({ kind = 'contact', purposes, extra, messageLabel = 'Ihr Vorhaben', submitLabel = 'Anfrage senden', details = {}, brand = 'nexify', id = 'formular' }) {
  const store = `nx_form_${kind}`;
  const [f, setF] = useState(() => { try { return JSON.parse(sessionStorage.getItem(store)) || {}; } catch { return {}; } });
  const [errors, setErrors] = useState({}), [state, setState] = useState('initial'), [result, setResult] = useState(null), [msg, setMsg] = useState('');
  const key = useRef(sessionStorage.getItem(store + '_key') || newKey());
  useEffect(() => { sessionStorage.setItem(store, JSON.stringify(f)); sessionStorage.setItem(store + '_key', key.current); }, [f]);
  const set = k => e => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const submit = async e => {
    e.preventDefault(); setState('lädt'); setErrors({}); setMsg('');
    try {
      const r = await api('/requests', { method: 'POST', headers: { 'Idempotency-Key': key.current }, body: { kind, name: f.name || '', email: f.email || '', company: f.company || '', phone: f.phone || '', purpose: f.purpose || '', message: f.message || '', consent: !!f.consent, marketing_opt_in: !!f.marketing, details: { ...details, ...Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('x_'))) }, page_path: location.pathname } });
      setResult(r); setState('erfolgreich'); sessionStorage.removeItem(store); sessionStorage.removeItem(store + '_key'); key.current = newKey(); setF({});
    } catch (err) {
      if (err.status === 422) { setErrors(err.detail.fields || {}); setState('validierung'); }
      else if (err.status === 0) { setState('unbekannt'); setMsg('Die Verbindung wurde unterbrochen. Wir wissen noch nicht, ob Ihre Anfrage gespeichert wurde.'); }
      else { setState('fehler'); setMsg(err.message); }
    }
  };
  const check = async () => { setState('lädt'); try { const r = await api('/requests/status', { headers: { 'Idempotency-Key': key.current } }); if (r.stored) { setResult(r); setState('erfolgreich'); sessionStorage.removeItem(store); setF({}); } else { setState('initial'); setMsg('Nicht gespeichert. Sie können dieselbe Anfrage jetzt erneut senden – es entsteht keine Dublette.'); } } catch { setState('unbekannt'); setMsg('Weiterhin keine Verbindung. Ihre Eingaben bleiben erhalten.'); } };
  const E = k => errors[k] && <span className="err" role="alert">{{ required: 'Bitte ausfüllen.', invalid: 'Bitte prüfen Sie das Format.', too_short: 'Bitte etwas ausführlicher (mind. 10 Zeichen).' }[errors[k]] || 'Bitte prüfen.'}</span>;
  if (state === 'erfolgreich') return <div className="notice ok" id={id} data-testid="form-success" role="status"><strong>Gespeichert. Ihre Vorgangskennung: <span style={{ fontFamily: 'var(--mono)' }} data-testid="request-number">{result.number}</span></strong><p style={{ marginTop: 8 }}>Ihre Angaben sind bei {brand === 'teileklar' ? 'TEILEKLAR' : 'NeXify'} eingegangen. Nächster Schritt: persönliche Erstsichtung. Bitte bewahren Sie die Kennung für Rückfragen auf.</p><button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => { setState('initial'); setResult(null); }}>Weitere Anfrage</button></div>;
  return <form className="form glass card" id={id} onSubmit={submit} noValidate data-testid={`form-${kind}`}>
    {purposes && <label className="field">Zweck<select value={f.purpose || ''} onChange={set('purpose')} data-testid="field-purpose"><option value="">Bitte wählen</option>{purposes.map(p => <option key={p}>{p}</option>)}</select></label>}
    <div className="row"><label className={'field' + (errors.name ? ' invalid' : '')}>Name *<input value={f.name || ''} onChange={set('name')} autoComplete="name" data-testid="field-name" />{E('name')}</label>
      <label className={'field' + (errors.email ? ' invalid' : '')}>E-Mail *<input type="email" value={f.email || ''} onChange={set('email')} autoComplete="email" data-testid="field-email" />{E('email')}</label></div>
    <div className="row"><label className={'field' + (errors.company ? ' invalid' : '')}>Unternehmen{kind === 'partner' ? ' *' : ''}<input value={f.company || ''} onChange={set('company')} autoComplete="organization" data-testid="field-company" />{E('company')}</label>
      <label className="field">Telefon (optional)<input value={f.phone || ''} onChange={set('phone')} autoComplete="tel" data-testid="field-phone" /></label></div>
    {extra && extra(f, set, errors)}
    <label className={'field' + (errors.message ? ' invalid' : '')}>{messageLabel} *<textarea value={f.message || ''} onChange={set('message')} data-testid="field-message" />{E('message')}</label>
    <label className="check"><input type="checkbox" checked={!!f.consent} onChange={set('consent')} data-testid="field-consent" /><span>Ich habe die <a href="/rechtliches/datenschutz" target="_blank">Datenschutzhinweise</a> gelesen. Meine Angaben werden zur Bearbeitung dieser Anfrage gespeichert. *{E('consent')}</span></label>
    <label className="check"><input type="checkbox" checked={!!f.marketing} onChange={set('marketing')} data-testid="field-marketing" /><span>Freiwillig: Ich möchte gelegentlich Neuigkeiten per E-Mail erhalten (jederzeit widerrufbar).</span></label>
    {msg && <div className={'notice ' + (state === 'unbekannt' ? 'info' : 'err')} role="alert" data-testid="form-message">{msg}{state === 'unbekannt' && <div style={{ marginTop: 10 }}><button type="button" className="btn btn-ghost btn-sm" onClick={check} data-testid="form-check">Status abgleichen</button></div>}</div>}
    <div><button className="btn btn-primary" disabled={state === 'lädt'} data-testid="form-submit">{state === 'lädt' ? <><span className="spinner" />Wird gespeichert …</> : submitLabel}</button></div>
    <p className="muted">Eine Vorgangskennung erhalten Sie erst, wenn Ihre Anfrage dauerhaft gespeichert ist.</p>
  </form>;
}

export function useCartCount() {
  const [n, setN] = useState(0);
  useEffect(() => { const load = () => api('/shop/cart').then(c => setN(c.count)).catch(() => {}); load(); window.addEventListener('cart:changed', load); return () => window.removeEventListener('cart:changed', load); }, []);
  return n;
}
export const CartIcon = ShoppingCart;
