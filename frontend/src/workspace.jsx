import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, FolderKanban, FileText, ReceiptText, KeyRound, Users, LogOut, Plus, Trash2, ShieldCheck, Send, Loader2 } from 'lucide-react';
import { api, stream, dt, euro } from './api.js';
import { useAuth, startGoogle } from './auth.jsx';

const AI_NOTICE = 'Sie interagieren mit einem KI-System. Antworten können Fehler enthalten. Prüfen Sie wichtige Angaben.';

/* ---------------- Login / Register ---------------- */
export function Login() {
  const { user, login, register, google } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const hash = window.location.hash || '';
    const hp = new URLSearchParams(hash.replace(/^#/, ''));
    const sid = hp.get('session_id') || new URLSearchParams(window.location.search).get('session_id');
    if (sid) {
      setGoogleBusy(true);
      google(sid).then(() => {
        const next = sessionStorage.getItem('nx_after_login') || '/arbeitsbereich';
        sessionStorage.removeItem('nx_after_login');
        window.history.replaceState({}, '', '/anmelden');
        nav(next, { replace: true });
      }).catch(() => { setGoogleBusy(false); setErr('Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.'); });
    }
  }, []);

  useEffect(() => { if (user && !googleBusy) nav('/arbeitsbereich', { replace: true }); }, [user]);

  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (mode === 'login') await login(f.email, f.password);
      else await register(f.name, f.email, f.password);
      nav('/arbeitsbereich', { replace: true });
    } catch (ex) {
      setErr(ex.detail?.message || (mode === 'login' ? 'E-Mail oder Passwort stimmen nicht.' : 'Registrierung nicht möglich. Passwort mind. 10 Zeichen.'));
    } finally { setBusy(false); }
  };

  if (googleBusy) return <main className="wrap" style={{ padding: '120px 0', textAlign: 'center' }} data-testid="google-finishing"><Loader2 className="spin" size={32} style={{ color: 'var(--lime)' }} /><p style={{ marginTop: 16 }}>Google-Anmeldung wird abgeschlossen …</p></main>;

  return <main data-testid="page-anmelden"><div className="wrap" style={{ maxWidth: 520, padding: '60px 0 90px' }}>
    <span className="kicker"><i />Arbeitsbereich</span>
    <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', margin: '14px 0 8px' }}>{mode === 'login' ? 'Anmelden' : 'Konto erstellen'}</h1>
    <p style={{ marginBottom: 24 }}>Zugang zum NeXify Arbeitsbereich mit KI-Chat, Projekten und Angeboten.</p>
    <div className="glass card form" style={{ display: 'grid', gap: 16 }}>
      <button className="btn btn-ghost" onClick={() => { sessionStorage.setItem('nx_after_login', '/arbeitsbereich'); startGoogle('/arbeitsbereich'); }} data-testid="google-login" style={{ width: '100%' }}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" width="18" height="18" style={{ background: '#fff', borderRadius: 3, padding: 1 }} />Mit Google anmelden
      </button>
      <div className="or-sep"><span>oder mit E-Mail</span></div>
      <form onSubmit={submit} className="form" noValidate>
        {mode === 'register' && <label className="field">Name<input value={f.name} onChange={set('name')} autoComplete="name" data-testid="auth-name" /></label>}
        <label className="field">E-Mail<input type="email" value={f.email} onChange={set('email')} autoComplete="email" data-testid="auth-email" required /></label>
        <label className="field">Passwort{mode === 'register' && ' (mind. 10 Zeichen)'}<input type="password" value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} data-testid="auth-password" required /></label>
        {err && <div className="notice err" role="alert" data-testid="auth-error">{err}</div>}
        <button className="btn btn-primary" disabled={busy} data-testid="auth-submit">{busy ? <><span className="spinner" />Bitte warten …</> : (mode === 'login' ? 'Anmelden' : 'Konto erstellen')}</button>
      </form>
      <p className="muted" style={{ textAlign: 'center' }}>
        {mode === 'login' ? <>Noch kein Konto? <button className="link-btn" onClick={() => { setMode('register'); setErr(''); }} data-testid="switch-register">Jetzt registrieren</button></>
          : <>Bereits registriert? <button className="link-btn" onClick={() => { setMode('login'); setErr(''); }} data-testid="switch-login">Anmelden</button></>}
      </p>
    </div>
  </div></main>;
}

/* ---------------- Workspace shell + context ---------------- */
const WsCtx = createContext(null);
export const useWs = () => useContext(WsCtx);

export function WsLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const [data, setData] = useState(undefined);
  const [wsId, setWsId] = useState(() => localStorage.getItem('nx_ws') || '');

  const reload = () => api('/workspace/me').then(d => {
    setData(d);
    if (d.workspaces.length && !d.workspaces.some(w => w.workspace_id === wsId)) { setWsId(d.workspaces[0].workspace_id); localStorage.setItem('nx_ws', d.workspaces[0].workspace_id); }
  }).catch(() => setData({ error: true }));
  useEffect(() => { if (user) reload(); }, [user]);

  if (user === undefined) return <main className="wrap" style={{ padding: '120px 0', textAlign: 'center' }}><Loader2 className="spin" size={30} style={{ color: 'var(--lime)' }} /></main>;
  if (user === null) return <Navigate to="/anmelden" replace />;
  if (data === undefined) return <main className="wrap" style={{ padding: '120px 0', textAlign: 'center' }}><Loader2 className="spin" size={30} style={{ color: 'var(--lime)' }} /></main>;
  if (data.error) return <main className="wrap" style={{ padding: '100px 0' }}><div className="notice err">Arbeitsbereich konnte nicht geladen werden. <button className="link-btn" onClick={reload}>Erneut versuchen</button></div></main>;

  if (!data.workspaces.length) return <Onboarding onCreated={id => { setWsId(id); localStorage.setItem('nx_ws', id); reload(); }} />;

  const current = data.workspaces.find(w => w.workspace_id === wsId) || data.workspaces[0];
  const nav = [
    ['', 'Übersicht', LayoutDashboard], ['chat', 'KI-Chat', MessageSquare], ['projekte', 'Projekte', FolderKanban],
    ['dokumente', 'Dokumente', FileText], ['angebote', 'Angebote', ReceiptText], ['api-schluessel', 'API-Schlüssel', KeyRound], ['team', 'Team', Users],
  ];
  return <WsCtx.Provider value={{ wsId: current.workspace_id, ws: current, user: data.user, reload }}>
    <div className="ws-shell">
      <aside className="ws-side" data-testid="ws-sidebar">
        <Link to="/" className="brand" style={{ padding: '4px 8px 16px' }}><img src="/media/brand/nexify-ai-signet.svg" alt="" width="28" height="28" />Arbeitsbereich</Link>
        {data.workspaces.length > 1 && <select className="ws-select" value={current.workspace_id} onChange={e => { setWsId(e.target.value); localStorage.setItem('nx_ws', e.target.value); }} data-testid="ws-switch">
          {data.workspaces.map(w => <option key={w.workspace_id} value={w.workspace_id}>{w.name}</option>)}
        </select>}
        <div className="ws-wsname"><strong>{current.name}</strong><span className="chip">{current.kind === 'business' ? 'Business' : 'Privat'}</span></div>
        <nav className="ws-nav">{nav.map(([to, label, Icon]) =>
          <NavLink key={to} to={'/arbeitsbereich' + (to ? '/' + to : '')} end={to === ''} className={({ isActive }) => 'ws-link' + (isActive ? ' active' : '')} data-testid={`ws-nav-${to || 'home'}`}><Icon size={18} />{label}</NavLink>)}
        </nav>
        <div className="ws-side-foot">
          <span className="muted" style={{ fontSize: 13 }}>{data.user.email}</span>
          <button className="ws-link" onClick={logout} data-testid="ws-logout"><LogOut size={18} />Abmelden</button>
        </div>
      </aside>
      <main className="ws-main" key={loc.pathname}><Outlet /></main>
    </div>
  </WsCtx.Provider>;
}

function Onboarding({ onCreated }) {
  const [kind, setKind] = useState('private');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const create = async () => {
    if (name.trim().length < 2) return setErr('Bitte einen Namen (mind. 2 Zeichen) angeben.');
    setBusy(true); setErr('');
    try { const ws = await api('/workspace', { method: 'POST', body: { kind, name: name.trim() } }); onCreated(ws.workspace_id); }
    catch (ex) { setErr(ex.detail?.message || 'Konnte nicht angelegt werden.'); setBusy(false); }
  };
  return <main className="wrap" style={{ maxWidth: 680, padding: '70px 0' }} data-testid="ws-onboarding">
    <span className="kicker"><i />Erster Schritt</span>
    <h1 style={{ fontSize: 'clamp(28px,3.2vw,42px)', margin: '14px 0 10px' }}>Arbeitsbereich anlegen</h1>
    <p style={{ marginBottom: 26 }}>Wählen Sie, ob Sie persönlich oder mit einem Team arbeiten. Sie können das später ergänzen.</p>
    <div className="grid-2" style={{ marginBottom: 22 }}>
      {[['private', 'Privat', 'Für Sie allein – ein persönlicher Bereich für Chat, Projekte und Dokumente.'], ['business', 'Business', 'Mit Team, Rollen und Einladungen. Ideal für Unternehmen.']].map(([k, t, d]) =>
        <button key={k} className={'glass card choose' + (kind === k ? ' sel' : '')} onClick={() => setKind(k)} data-testid={`ws-kind-${k}`}><h3>{t}</h3><p style={{ marginTop: 8 }}>{d}</p></button>)}
    </div>
    <div className="glass card form">
      <label className="field">Name des Arbeitsbereichs<input value={name} onChange={e => setName(e.target.value)} placeholder={kind === 'business' ? 'z. B. Musterfirma GmbH' : 'z. B. Mein Bereich'} data-testid="ws-name" /></label>
      {err && <div className="notice err">{err}</div>}
      <button className="btn btn-primary" onClick={create} disabled={busy} data-testid="ws-create">{busy ? <><span className="spinner" />Wird angelegt …</> : 'Arbeitsbereich erstellen'}</button>
    </div>
  </main>;
}

function Head({ title, sub, action }) {
  return <div className="ws-head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>{action}</div>;
}

/* ---------------- Dashboard ---------------- */
export function Dashboard() {
  const { wsId, ws } = useWs();
  const [d, setD] = useState(null);
  useEffect(() => { setD(null); api(`/workspace/${wsId}/dashboard`).then(setD).catch(() => setD({ error: true })); }, [wsId]);
  if (!d) return <Skeleton />;
  if (d.error) return <div className="notice err">Übersicht nicht verfügbar.</div>;
  const stats = [['Projekte', d.projects], ['Offene Aufgaben', d.open_tasks], ['Dokumente', d.documents], ['Angebote', d.offers]];
  return <div data-testid="ws-dashboard">
    <Head title={`Willkommen, ${ws.name}`} sub="Ihr persönlicher Überblick über Projekte, Aufgaben und KI-Nutzung." />
    <div className="grid-4 stat-row">{stats.map(([l, v]) => <div key={l} className="glass card stat"><span className="stat-v">{v}</span><span className="stat-l">{l}</span></div>)}</div>
    <div className="grid-2" style={{ marginTop: 24, alignItems: 'start' }}>
      <div className="glass card"><h3>Letzte Projekte</h3>{d.recent_projects?.length ? <ul className="plain">{d.recent_projects.map(p => <li key={p.project_id}><Link to="/arbeitsbereich/projekte">{p.title}</Link><span className="muted">{dt(p.created_at)}</span></li>)}</ul> : <p className="muted" style={{ marginTop: 10 }}>Noch keine Projekte. <Link to="/arbeitsbereich/projekte">Projekt anlegen</Link></p>}</div>
      <div className="glass card"><h3>KI-Nutzung (Schätzung)</h3><p className="muted" style={{ marginTop: 8 }}>{d.usage.requests} Anfragen · ca. {d.usage.est_input_tokens + d.usage.est_output_tokens} Tokens</p><p className="muted" style={{ marginTop: 6, fontSize: 13 }}>{d.usage.basis}</p><Link to="/arbeitsbereich/chat" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Zum KI-Chat</Link></div>
    </div>
  </div>;
}

/* ---------------- Chat (SSE, real AI) ---------------- */
export function Chat() {
  const { wsId } = useWs();
  const [convs, setConvs] = useState([]);
  const [cid, setCid] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [mode, setMode] = useState('frage');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef(null);
  const loadConvs = () => api(`/ai/conversations?workspace_id=${wsId}`).then(r => setConvs(r.items || [])).catch(() => {});
  useEffect(() => { loadConvs(); setCid(null); setMsgs([]); }, [wsId]);
  useEffect(() => { scroll.current?.scrollTo(0, scroll.current.scrollHeight); }, [msgs]);

  const openConv = async id => {
    setCid(id);
    const r = await api(`/ai/conversations/${id}?workspace_id=${wsId}`);
    setMsgs(r.messages.map(m => ({ role: m.role, text: m.text, error: m.error })));
  };
  const newConv = () => { setCid(null); setMsgs([]); };

  const send = async e => {
    e.preventDefault();
    const text = input.trim(); if (!text || busy) return;
    setInput(''); setBusy(true);
    setMsgs(m => [...m, { role: 'user', text }, { role: 'assistant', text: '', streaming: true }]);
    let newCid = cid;
    try {
      await stream('/ai/chat', { workspace_id: wsId, conversation_id: cid, mode, message: text }, ev => {
        if (ev.type === 'meta') newCid = ev.conversation_id;
        else if (ev.type === 'delta') setMsgs(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + ev.text }; return c; });
        else if (ev.type === 'error') setMsgs(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: ev.message, error: true }; return c; });
      });
      setMsgs(m => { const c = [...m]; if (c.length) c[c.length - 1] = { ...c[c.length - 1], streaming: false }; return c; });
      if (newCid && newCid !== cid) { setCid(newCid); loadConvs(); } else loadConvs();
    } catch (ex) {
      setMsgs(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: 'Die KI ist gerade nicht erreichbar. Bitte später erneut senden.', error: true }; return c; });
    } finally { setBusy(false); }
  };

  return <div className="chat-wrap" data-testid="ws-chat">
    <div className="chat-list">
      <button className="btn btn-primary btn-sm" onClick={newConv} data-testid="chat-new" style={{ width: '100%' }}><Plus size={16} />Neue Unterhaltung</button>
      <div className="chat-conv-list">{convs.map(c => <button key={c.conversation_id} className={'chat-conv' + (c.conversation_id === cid ? ' sel' : '')} onClick={() => openConv(c.conversation_id)} data-testid="chat-conv">{c.title || 'Unterhaltung'}</button>)}
        {!convs.length && <p className="muted" style={{ fontSize: 13, padding: '12px 4px' }}>Noch keine Unterhaltungen.</p>}</div>
    </div>
    <div className="chat-main glass card">
      <div className="ai-notice" data-testid="ai-notice"><ShieldCheck size={15} />{AI_NOTICE}</div>
      <div className="chat-msgs" ref={scroll}>
        {!msgs.length && <div className="chat-empty"><MessageSquare size={30} style={{ color: 'var(--lime)' }} /><p>Stellen Sie NeX eine Frage – zu Ihrem Projekt, Ihren Dokumenten oder einem Arbeitsauftrag.</p></div>}
        {msgs.map((m, i) => <div key={i} className={'bubble ' + m.role + (m.error ? ' err' : '')} data-testid={`chat-${m.role}`}>{m.text || (m.streaming ? <span className="typing"><i /><i /><i /></span> : '')}</div>)}
      </div>
      <form className="chat-input" onSubmit={send}>
        <select value={mode} onChange={e => setMode(e.target.value)} data-testid="chat-mode"><option value="frage">Frage</option><option value="quellen">Aus Dokumenten</option><option value="auftrag">Arbeitsauftrag</option></select>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Nachricht an NeX …" data-testid="chat-text" />
        <button className="btn btn-primary" disabled={busy || !input.trim()} data-testid="chat-send">{busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
      </form>
    </div>
  </div>;
}

/* ---------------- Projects ---------------- */
export function Projects() {
  const { wsId } = useWs();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', goal: '', scope: '' });
  const load = () => api(`/workspace/${wsId}/projects`).then(r => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { setItems(null); load(); }, [wsId]);
  const create = async () => { if (f.title.trim().length < 2) return; await api(`/workspace/${wsId}/projects`, { method: 'POST', body: f }); setF({ title: '', goal: '', scope: '' }); setOpen(false); load(); };
  const del = async id => { await api(`/workspace/${wsId}/projects/${id}`, { method: 'DELETE' }); load(); };
  return <div data-testid="ws-projects">
    <Head title="Projekte" sub="Vorhaben mit Ziel, Umfang und Aufgaben." action={<button className="btn btn-primary" onClick={() => setOpen(!open)} data-testid="project-new"><Plus size={18} />Neues Projekt</button>} />
    {open && <div className="glass card form" style={{ marginBottom: 20 }}>
      <label className="field">Titel<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="project-title" /></label>
      <label className="field">Ziel<textarea value={f.goal} onChange={e => setF({ ...f, goal: e.target.value })} /></label>
      <label className="field">Umfang<textarea value={f.scope} onChange={e => setF({ ...f, scope: e.target.value })} /></label>
      <button className="btn btn-primary" onClick={create} data-testid="project-save">Speichern</button>
    </div>}
    {!items ? <Skeleton /> : !items.length ? <Empty text="Noch keine Projekte angelegt." /> :
      <div className="grid-2">{items.map(p => <div key={p.project_id} className="glass card" data-testid="project-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h3>{p.title}</h3><button className="icon-btn" onClick={() => del(p.project_id)} aria-label="Löschen" data-testid="project-del"><Trash2 size={16} /></button></div>
        {p.goal && <p style={{ marginTop: 8 }}>{p.goal}</p>}
        <div className="chips" style={{ marginTop: 12 }}><span className="chip">{p.tasks?.length || 0} Aufgaben</span><span className="chip ok">{p.status}</span></div>
      </div>)}</div>}
  </div>;
}

/* ---------------- Documents ---------------- */
export function Documents() {
  const { wsId } = useWs();
  const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const load = () => api(`/workspace/${wsId}/documents`).then(r => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { setItems(null); load(); }, [wsId]);
  const upload = async e => {
    const file = e.target.files?.[0]; if (!file) return; setErr('');
    const fd = new FormData(); fd.append('file', file); fd.append('purpose', '');
    try { await api(`/workspace/${wsId}/documents`, { method: 'POST', form: fd }); load(); }
    catch (ex) { setErr(ex.detail?.message || 'Upload fehlgeschlagen.'); }
    if (fileRef.current) fileRef.current.value = '';
  };
  const del = async id => { await api(`/workspace/${wsId}/documents/${id}`, { method: 'DELETE' }); load(); };
  return <div data-testid="ws-documents">
    <Head title="Dokumente" sub="Dateien für Ihren Arbeitsbereich. Text-Dateien (.txt, .md, .csv, .json) kann die KI als Quelle nutzen." action={<><input ref={fileRef} type="file" hidden onChange={upload} data-testid="doc-file" /><button className="btn btn-primary" onClick={() => fileRef.current?.click()} data-testid="doc-upload"><Plus size={18} />Hochladen</button></>} />
    {err && <div className="notice err" style={{ marginBottom: 16 }}>{err}</div>}
    {!items ? <Skeleton /> : !items.length ? <Empty text="Noch keine Dokumente hochgeladen." /> :
      <div className="glass card" style={{ padding: 0, overflow: 'hidden' }}><table className="t"><thead><tr><th>Name</th><th>Status</th><th>Größe</th><th>Version</th><th></th></tr></thead><tbody>
        {items.map(d => <tr key={d.document_id} data-testid="doc-row"><td>{d.name}</td><td><span className={'chip ' + (d.state === 'als_kontext_nutzbar' ? 'ok' : '')}>{d.state === 'als_kontext_nutzbar' ? 'KI-Quelle' : 'Hochgeladen'}</span></td><td>{Math.round(d.size / 1024)} KB</td><td>v{d.version}</td><td><button className="icon-btn" onClick={() => del(d.document_id)} aria-label="Löschen"><Trash2 size={16} /></button></td></tr>)}
      </tbody></table></div>}
  </div>;
}

/* ---------------- Offers ---------------- */
export function Offers() {
  const { wsId } = useWs();
  const [items, setItems] = useState(null); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: '', customer: '' });
  const load = () => api(`/workspace/${wsId}/offers`).then(r => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { setItems(null); load(); }, [wsId]);
  const create = async () => { if (f.title.trim().length < 2) return; await api(`/workspace/${wsId}/offers`, { method: 'POST', body: { ...f, positions: [], tax_percent: null } }); setF({ title: '', customer: '' }); setOpen(false); load(); };
  return <div data-testid="ws-offers">
    <Head title="Angebote" sub="Versionierte Angebote mit nachvollziehbaren Positionen." action={<button className="btn btn-primary" onClick={() => setOpen(!open)} data-testid="offer-new"><Plus size={18} />Neues Angebot</button>} />
    {open && <div className="glass card form" style={{ marginBottom: 20 }}>
      <label className="field">Titel<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} data-testid="offer-title" /></label>
      <label className="field">Kunde (optional)<input value={f.customer} onChange={e => setF({ ...f, customer: e.target.value })} /></label>
      <button className="btn btn-primary" onClick={create} data-testid="offer-save">Entwurf anlegen</button>
    </div>}
    {!items ? <Skeleton /> : !items.length ? <Empty text="Noch keine Angebote." /> :
      <div className="grid-2">{items.map(o => { const v = o.versions[o.versions.length - 1]; return <div key={o.offer_id} className="glass card" data-testid="offer-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><h3>{o.title}</h3><span className="chip">{o.status}</span></div>
        {o.customer && <p className="muted" style={{ marginTop: 6 }}>{o.customer}</p>}
        <p style={{ marginTop: 10 }}>Netto: {v.totals.net_cents ? euro(v.totals.net_cents) : 'offen'} · {v.totals.open_positions} offene Positionen</p>
      </div>; })}</div>}
  </div>;
}

/* ---------------- API Keys ---------------- */
export function ApiKeys() {
  const { wsId } = useWs();
  const [data, setData] = useState(null); const [name, setName] = useState(''); const [secret, setSecret] = useState(null); const [err, setErr] = useState('');
  const load = () => api(`/workspace/${wsId}/api-keys`).then(setData).catch(() => setErr('Nur Owner/Admin können Schlüssel verwalten.'));
  useEffect(() => { setData(null); setErr(''); load(); }, [wsId]);
  const create = async () => { if (name.trim().length < 2) return; try { const r = await api(`/workspace/${wsId}/api-keys`, { method: 'POST', body: { name: name.trim(), scopes: ['chat:read'] } }); setSecret(r.secret); setName(''); load(); } catch (ex) { setErr(ex.detail?.message || 'Fehler'); } };
  const revoke = async id => { await api(`/workspace/${wsId}/api-keys/${id}/revoke`, { method: 'POST' }); load(); };
  if (err && !data) return <div data-testid="ws-apikeys"><Head title="API-Schlüssel" /><div className="notice err">{err}</div></div>;
  return <div data-testid="ws-apikeys">
    <Head title="API-Schlüssel" sub="Testschlüssel für den Zugriff. Das Secret wird nur einmal angezeigt." />
    <div className="glass card form" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>Bezeichnung<input value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Testintegration" data-testid="key-name" /></label>
        <button className="btn btn-primary" onClick={create} data-testid="key-create"><Plus size={18} />Erstellen</button>
      </div>
      {secret && <div className="notice ok" data-testid="key-secret"><strong>Nur jetzt sichtbar:</strong> <code style={{ fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{secret}</code><button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setSecret(null)}>Verstanden</button></div>}
    </div>
    {!data ? <Skeleton /> : !data.items.length ? <Empty text="Noch keine Schlüssel erstellt." /> :
      <div className="glass card" style={{ padding: 0, overflow: 'hidden' }}><table className="t"><thead><tr><th>Name</th><th>Prefix</th><th>Status</th><th></th></tr></thead><tbody>
        {data.items.map(k => <tr key={k.key_id} data-testid="key-row"><td>{k.name}</td><td style={{ fontFamily: 'var(--mono)' }}>{k.prefix}…</td><td>{k.revoked_at ? <span className="chip err">Widerrufen</span> : <span className="chip ok">Aktiv</span>}</td><td>{!k.revoked_at && <button className="btn btn-ghost btn-sm" onClick={() => revoke(k.key_id)} data-testid="key-revoke">Widerrufen</button>}</td></tr>)}
      </tbody></table></div>}
  </div>;
}

/* ---------------- Team ---------------- */
export function Team() {
  const { wsId } = useWs();
  const [data, setData] = useState(null); const [email, setEmail] = useState(''); const [msg, setMsg] = useState('');
  const load = () => api(`/workspace/${wsId}/team`).then(setData).catch(() => setData({ error: true }));
  useEffect(() => { setData(null); setMsg(''); load(); }, [wsId]);
  const invite = async () => { setMsg(''); try { const r = await api(`/workspace/${wsId}/team`, { method: 'POST', body: { email, role: 'member' } }); setMsg(r.note); setEmail(''); load(); } catch (ex) { setMsg(ex.detail?.message || 'Einladung nicht möglich.'); } };
  if (!data) return <Skeleton />;
  if (data.error) return <div className="notice err">Team nicht verfügbar.</div>;
  return <div data-testid="ws-team">
    <Head title="Team" sub={data.kind === 'business' ? 'Mitglieder, Rollen und Einladungen.' : 'Persönliche Arbeitsbereiche haben kein Team.'} />
    {data.kind === 'business' && (data.my_role === 'owner' || data.my_role === 'admin') && <div className="glass card form" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <label className="field" style={{ flex: 1, minWidth: 240 }}>E-Mail einladen<input type="email" value={email} onChange={e => setEmail(e.target.value)} data-testid="team-email" /></label>
        <button className="btn btn-primary" onClick={invite} data-testid="team-invite"><Plus size={18} />Einladen</button>
      </div>
      {msg && <div className="notice info">{msg}</div>}
    </div>}
    <div className="glass card" style={{ padding: 0, overflow: 'hidden' }}><table className="t"><thead><tr><th>Name / E-Mail</th><th>Rolle</th><th>Status</th></tr></thead><tbody>
      {data.members.map(m => <tr key={m.email} data-testid="team-row"><td>{m.name || m.email}<br /><span className="muted">{m.email}</span></td><td><span className="chip">{m.role}</span></td><td>{m.status === 'aktiv' ? <span className="chip ok">Aktiv</span> : <span className="chip warn">Eingeladen</span>}</td></tr>)}
    </tbody></table></div>
  </div>;
}

/* ---------------- shared ---------------- */
function Skeleton() { return <div className="grid-2">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>; }
function Empty({ text }) { return <div className="notice info" data-testid="empty-state">{text}</div>; }
