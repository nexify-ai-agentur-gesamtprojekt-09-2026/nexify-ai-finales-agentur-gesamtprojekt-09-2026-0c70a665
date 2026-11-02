import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Search, Minus, Plus, Trash2, ShieldCheck, Send, Loader2, Truck, Wrench, LifeBuoy, Handshake, Package, CheckCircle2 } from 'lucide-react';
import { api, euro, dt, stream, newKey } from './api.js';
import { useAuth } from './auth.jsx';
import { useCartCount } from './ui.jsx';
import { InboundForm } from './ui.jsx';

const AI_NOTICE = 'Sie interagieren mit einem KI-System. Antworten können Fehler enthalten. Prüfen Sie wichtige Angaben.';

async function setCartItem(product_id, quantity) {
  const r = await api('/shop/cart/items', { method: 'POST', body: { product_id, quantity } });
  window.dispatchEvent(new Event('cart:changed'));
  return r;
}

/* ---------------- Layout ---------------- */
export function TkLayout() {
  const count = useCartCount();
  const { user } = useAuth();
  const loc = useLocation();
  const link = ({ isActive }) => 'tk-navlink' + (isActive ? ' active' : '');
  return <div data-testid="tk-layout">
    <header className="tk-header"><div className="wrap">
      <Link to="/teileklar" className="tk-brand" data-testid="tk-home-link"><span className="tk-logo">TK</span><span>TEILEKLAR</span></Link>
      <nav className="tk-nav" aria-label="TEILEKLAR Navigation">
        <NavLink to="/teileklar/katalog" className={link} data-testid="tk-nav-katalog">Katalog</NavLink>
        <NavLink to="/teileklar/werkstaetten" className={link} data-testid="tk-nav-werkstaetten">Werkstätten</NavLink>
        <NavLink to="/teileklar/partner" className={link}>Partner</NavLink>
        <NavLink to="/teileklar/support" className={link}>Support</NavLink>
      </nav>
      <div className="tk-actions">
        <Link to="/" className="tk-back hide-m">NeXify</Link>
        {user && <Link to="/teileklar/bestellungen" className="tk-navlink hide-m" data-testid="tk-nav-orders">Bestellungen</Link>}
        <Link to="/teileklar/warenkorb" className="tk-cart" data-testid="tk-cart-link" aria-label={`Warenkorb (${count})`}>
          <ShoppingCart size={20} />{count > 0 && <span className="tk-cart-badge" data-testid="cart-count">{count}</span>}
        </Link>
      </div>
    </div></header>
    <main key={loc.pathname}><Outlet /></main>
    <footer className="tk-footer"><div className="wrap">
      <div className="tk-foot-grid">
        <div><span className="tk-logo">TK</span><p style={{ marginTop: 12, maxWidth: '34ch', fontSize: 14 }}>TEILEKLAR – Auto- und Motorradteile mit Werkstattsuche. Ein eigenständiger Shop, betrieben von NeXify.</p></div>
        <div><h4>Shop</h4><Link to="/teileklar/katalog">Katalog</Link><Link to="/teileklar/werkstaetten">Werkstätten</Link><Link to="/teileklar/support">Support</Link></div>
        <div><h4>Rechtliches</h4><Link to="/teileklar/rechtliches/shop-agb">Shopbedingungen</Link><Link to="/teileklar/rechtliches/widerruf">Widerruf</Link><Link to="/teileklar/rechtliches/versand">Versand & Zahlung</Link><Link to="/teileklar/rechtliches/datenschutz">Datenschutz</Link></div>
      </div>
      <div className="tk-foot-bottom"><span>© 2026 TEILEKLAR · betrieben von NeXify AI</span><span>Zahlung über Revolut · Entwurfsfassung</span></div>
    </div></footer>
  </div>;
}

/* ---------------- Home with AI advisor ---------------- */
export function TkHome() {
  const [products, setProducts] = useState(null);
  useEffect(() => { api('/shop/products?page_size=6').then(r => setProducts(r.items)).catch(() => setProducts([])); }, []);
  const cats = [['Bremsen', 'Bremsscheiben, Beläge & Sättel'], ['Motor & Öl', 'Filter, Öle & Zündung'], ['Fahrwerk', 'Stoßdämpfer & Federn'], ['Elektrik', 'Batterien, Sensoren & Licht'], ['Karosserie', 'Spiegel, Scheiben & Anbau'], ['Zubehör', 'Pflege, Werkzeug & Motorrad']];
  return <div data-testid="tk-home">
    <section className="tk-hero"><div className="wrap tk-hero-grid">
      <div>
        <span className="kicker"><i />TEILEKLAR · Teile & Werkstätten</span>
        <h1 style={{ marginTop: 16 }}>Das richtige Teil – <span className="accent">klar gefunden.</span></h1>
        <p className="hero-sub">Auto- und Motorradteile aus dem BigBuy-Katalog, mit KI-Teileberater und Werkstattsuche.</p>
        <div className="hero-actions" style={{ marginTop: 24 }}><Link to="/teileklar/katalog" className="btn btn-primary" data-testid="tk-hero-catalog">Katalog durchsuchen<ArrowRight size={18} /></Link><Link to="/teileklar/werkstaetten" className="btn btn-ghost">Werkstatt finden</Link></div>
      </div>
      <Advisor />
    </div></section>

    <section className="section" style={{ paddingTop: 20 }}><div className="wrap">
      <div className="section-head"><h2>Kategorien</h2><p>Finden Sie Teile nach Bereich. Der vollständige Katalog mit Suche ist jederzeit erreichbar.</p></div>
      <div className="grid-3">{cats.map(([t, d]) => <Link key={t} to={`/teileklar/katalog?q=${encodeURIComponent(t)}`} className="glass card tk-cat" data-testid="tk-category"><Wrench size={22} style={{ color: 'var(--lime)' }} /><h3 style={{ marginTop: 12 }}>{t}<ArrowRight size={16} /></h3><p>{d}</p></Link>)}</div>
    </div></section>

    <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="section-head"><h2>Aus dem Katalog</h2><p>Eine Auswahl aktueller Artikel. Preise erscheinen, sobald sie freigegeben sind.</p></div>
      {products === null ? <div className="grid-3">{[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 320 }} />)}</div>
        : products.length ? <div className="grid-3">{products.map(p => <ProductCard key={p.id} p={p} />)}</div>
          : <div className="notice info" data-testid="tk-home-empty">Der Katalog wird gerade eingerichtet. Sobald der BigBuy-Import läuft, erscheinen hier echte Artikel.</div>}
    </div></section>
  </div>;
}

function Advisor() {
  const [sid, setSid] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState([]);
  const box = useRef(null);
  useEffect(() => { box.current?.scrollTo(0, box.current.scrollHeight); }, [msgs]);
  const send = async e => {
    e.preventDefault(); const text = input.trim(); if (!text || busy) return;
    setInput(''); setBusy(true);
    setMsgs(m => [...m, { role: 'user', text }, { role: 'assistant', text: '', streaming: true }]);
    try {
      await stream('/ai/advisor', { session_id: sid, message: text }, ev => {
        if (ev.type === 'meta') { setSid(ev.session_id); setHits(ev.products || []); }
        else if (ev.type === 'delta') setMsgs(m => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + ev.text }; return c; });
        else if (ev.type === 'error') setMsgs(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: ev.message, error: true }; return c; });
      });
      setMsgs(m => { const c = [...m]; if (c.length) c[c.length - 1] = { ...c[c.length - 1], streaming: false }; return c; });
    } catch { setMsgs(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: 'Der Teileberater ist gerade nicht erreichbar. Bitte nutzen Sie die Teileanfrage.', error: true }; return c; }); }
    finally { setBusy(false); }
  };
  return <div className="glass card advisor" data-testid="tk-advisor">
    <div className="ai-notice"><ShieldCheck size={15} />KI-Teileberater</div>
    <div className="advisor-msgs" ref={box}>
      {!msgs.length && <div className="chat-empty" style={{ padding: '20px 10px' }}><p>Beschreiben Sie Ihr Fahrzeug und das gesuchte Teil – der Berater schlägt passende Artikel aus dem Katalog vor.</p></div>}
      {msgs.map((m, i) => <div key={i} className={'bubble ' + m.role + (m.error ? ' err' : '')}>{m.text || (m.streaming ? <span className="typing"><i /><i /><i /></span> : '')}</div>)}
      {hits.length > 0 && <div className="advisor-hits">{hits.map(h => <Link key={h.id} to={`/teileklar/produkt/${h.id}`} className="advisor-hit" data-testid="advisor-hit">{h.name}</Link>)}</div>}
    </div>
    <form className="chat-input" onSubmit={send}>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="z. B. Bremsbeläge vorne Golf 7 …" data-testid="advisor-input" />
      <button className="btn btn-primary" disabled={busy || !input.trim()} data-testid="advisor-send">{busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}</button>
    </form>
  </div>;
}

function ProductCard({ p }) {
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  const add = async () => {
    setBusy(true); setNote('');
    try { await setCartItem(p.id, 1); setNote('In den Warenkorb gelegt.'); }
    catch (ex) { setNote(ex.detail?.error === 'price_not_released' ? 'Preis noch nicht freigegeben.' : ex.detail?.message || 'Nicht verfügbar.'); }
    finally { setBusy(false); }
  };
  return <div className="glass card product-card" data-testid="product-card">
    <Link to={`/teileklar/produkt/${p.id}`} className="product-img">{p.image ? <img src={p.image} alt={p.name} loading="lazy" /> : <div className="product-noimg"><Package size={34} /></div>}</Link>
    <Link to={`/teileklar/produkt/${p.id}`} className="product-name" data-testid="product-name">{p.name}</Link>
    <div className="product-meta"><span className="muted">{p.sku ? 'Art. ' + p.sku : ''}</span>{p.in_stock === false && <span className="chip warn">Nicht auf Lager</span>}</div>
    <div className="product-foot">
      <span className="price" data-testid="product-price">{p.price_status === 'released' ? euro(p.price_cents) : 'Preis offen'}</span>
      <button className="btn btn-primary btn-sm" onClick={add} disabled={busy || p.price_status !== 'released'} data-testid="product-add">{busy ? <Loader2 className="spin" size={15} /> : <><Plus size={15} />Warenkorb</>}</button>
    </div>
    {note && <p className="muted" style={{ marginTop: 8, fontSize: 13 }} data-testid="product-note">{note}</p>}
  </div>;
}

/* ---------------- Catalog ---------------- */
export function TkCatalog() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [cat, setCat] = useState(sp.get('category') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  useEffect(() => { api('/shop/categories').then(r => setCats(r.categories || [])).catch(() => {}); }, []);
  useEffect(() => {
    setData(null);
    const t = setTimeout(() => api(`/shop/products?q=${encodeURIComponent(q)}&page=${page}${cat ? '&category=' + cat : ''}&page_size=24`).then(setData).catch(() => setData({ items: [], total: 0, pages: 1 })), 250);
    return () => clearTimeout(t);
  }, [q, cat, page]);
  useEffect(() => { const n = {}; if (q) n.q = q; if (cat) n.category = cat; setSp(n, { replace: true }); setPage(1); }, [q, cat]);

  return <div data-testid="tk-catalog"><div className="wrap" style={{ padding: '40px 0 80px' }}>
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)' }}>Katalog</h1>
    <div className="tk-filters glass card" style={{ marginTop: 20 }}>
      <label className="field tk-search"><Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Teil, Artikelnummer oder EAN suchen" data-testid="catalog-search" /></label>
      <select className="tk-catselect" value={cat} onChange={e => setCat(e.target.value)} data-testid="catalog-category"><option value="">Alle Kategorien</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}</select>
    </div>
    {data && <p className="muted" style={{ margin: '18px 0' }} data-testid="catalog-count">{data.total} Artikel</p>}
    {!data ? <div className="grid-3" style={{ marginTop: 20 }}>{[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 320 }} />)}</div>
      : !data.items.length ? <div className="notice info" data-testid="catalog-empty">Keine Artikel gefunden. Der Katalog wird über den BigBuy-Import befüllt.</div>
        : <>
          <div className="grid-3">{data.items.map(p => <ProductCard key={p.id} p={p} />)}</div>
          {data.pages > 1 && <div className="tk-pager" data-testid="catalog-pager">
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Zurück</button>
            <span>Seite {data.page} / {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Weiter</button>
          </div>}
        </>}
  </div></div>;
}

/* ---------------- Product detail ---------------- */
export function TkProduct() {
  const { id } = useParams();
  const [p, setP] = useState(undefined);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false); const [note, setNote] = useState('');
  useEffect(() => { setP(undefined); api('/shop/products/' + id).then(setP).catch(() => setP(null)); }, [id]);
  if (p === undefined) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 380 }} /></div>;
  if (p === null) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice err">Artikel nicht gefunden. <Link to="/teileklar/katalog">Zum Katalog</Link></div></div>;
  const add = async () => {
    setBusy(true); setNote('');
    try { await setCartItem(p.id, qty); setNote('ok'); }
    catch (ex) { setNote(ex.detail?.error === 'price_not_released' ? 'Preis noch nicht freigegeben.' : ex.detail?.error === 'insufficient_stock' ? 'Nicht genug auf Lager.' : ex.detail?.message || 'Nicht verfügbar.'); }
    finally { setBusy(false); }
  };
  return <div className="wrap" style={{ padding: '30px 0 80px' }} data-testid="tk-product">
    <nav className="crumbs"><Link to="/teileklar">TEILEKLAR</Link><span>/</span><Link to="/teileklar/katalog">Katalog</Link><span>/</span><span aria-current="page">{p.name}</span></nav>
    <div className="product-detail">
      <div className="product-gallery glass">{p.image ? <img src={p.image} alt={p.name} data-testid="product-detail-img" /> : <div className="product-noimg lg"><Package size={60} /></div>}</div>
      <div>
        <h1 style={{ fontSize: 'clamp(24px,2.6vw,36px)' }} data-testid="product-detail-name">{p.name}</h1>
        <div className="chips" style={{ marginTop: 12 }}>{p.sku && <span className="chip">Art. {p.sku}</span>}{p.category_name && <span className="chip">{p.category_name}</span>}<span className="chip">Quelle: BigBuy</span></div>
        <p className="price lg" style={{ marginTop: 20 }} data-testid="product-detail-price">{p.price_status === 'released' ? euro(p.price_cents) : 'Preis noch nicht freigegeben'}</p>
        {p.price_status === 'released' && <p className="muted">inkl. {p.vat_percent}% MwSt.</p>}
        <div className="notice info" style={{ marginTop: 16, fontSize: 14 }}>Fahrzeugpassung ist im Katalog nicht geprüft. Bei Unsicherheit nutzen Sie den Teileberater oder eine Werkstatt.</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Weniger" data-testid="qty-minus"><Minus size={16} /></button><span data-testid="qty-value">{qty}</span><button onClick={() => setQty(Math.min(20, qty + 1))} aria-label="Mehr" data-testid="qty-plus"><Plus size={16} /></button></div>
          <button className="btn btn-primary" onClick={add} disabled={busy || p.price_status !== 'released'} data-testid="product-detail-add">{busy ? <><span className="spinner" />…</> : <><ShoppingCart size={18} />In den Warenkorb</>}</button>
        </div>
        {note === 'ok' ? <div className="notice ok" style={{ marginTop: 14 }} data-testid="product-added">Zum Warenkorb hinzugefügt. <Link to="/teileklar/warenkorb">Zum Warenkorb</Link></div> : note && <div className="notice err" style={{ marginTop: 14 }} data-testid="product-added-err">{note}</div>}
        {p.description && <div className="prose" style={{ marginTop: 28 }}><h2 style={{ fontSize: 20 }}>Beschreibung</h2><p>{p.description}</p></div>}
      </div>
    </div>
  </div>;
}

/* ---------------- Cart ---------------- */
export function TkCart() {
  const [cart, setCart] = useState(null);
  const load = () => api('/shop/cart').then(setCart).catch(() => setCart({ lines: [], count: 0 }));
  useEffect(load, []);
  const update = async (pid, quantity) => { const r = await setCartItem(pid, quantity); setCart(r); };
  const confirm = async () => { const r = await api('/shop/cart/confirm-changes', { method: 'POST' }); setCart(r); window.dispatchEvent(new Event('cart:changed')); };
  if (!cart) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 300 }} /></div>;
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-cart">
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)' }}>Warenkorb</h1>
    {!cart.lines.length ? <div className="notice info" style={{ marginTop: 24 }} data-testid="cart-empty">Ihr Warenkorb ist leer. <Link to="/teileklar/katalog">Zum Katalog</Link></div>
      : <div className="cart-grid" style={{ marginTop: 24 }}>
        <div className="cart-lines">
          {cart.changes?.length > 0 && <div className="notice err" style={{ marginBottom: 16 }} data-testid="cart-changes"><strong>Änderungen festgestellt:</strong><ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>{cart.changes.map((c, i) => <li key={i}>{c.name}: {c.kind === 'price' ? `Preis ${euro(c.old)} → ${euro(c.new)}` : c.kind === 'stock' ? `nur ${c.new} verfügbar` : 'nicht mehr verfügbar'}</li>)}</ul><button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={confirm} data-testid="cart-confirm">Änderungen übernehmen</button></div>}
          {cart.lines.map(l => <div key={l.product_id} className="glass card cart-line" data-testid="cart-line">
            <div className="cart-line-img">{l.image ? <img src={l.image} alt="" /> : <Package size={28} />}</div>
            <div style={{ flex: 1, minWidth: 0 }}><Link to={`/teileklar/produkt/${l.product_id}`} className="product-name">{l.name}</Link><p className="muted" style={{ fontSize: 13 }}>{euro(l.unit_cents)} / Stück</p></div>
            <div className="qty"><button onClick={() => update(l.product_id, Math.max(0, l.quantity - 1))} aria-label="Weniger"><Minus size={14} /></button><span data-testid="cart-qty">{l.quantity}</span><button onClick={() => update(l.product_id, l.quantity + 1)} aria-label="Mehr"><Plus size={14} /></button></div>
            <span className="price" style={{ minWidth: 90, textAlign: 'right' }}>{euro(l.line_cents)}</span>
            <button className="icon-btn" onClick={() => update(l.product_id, 0)} aria-label="Entfernen" data-testid="cart-remove"><Trash2 size={16} /></button>
          </div>)}
        </div>
        <aside className="glass card cart-summary">
          <h3>Zusammenfassung</h3>
          <div className="sum-row"><span>Zwischensumme</span><span>{euro(cart.subtotal_cents)}</span></div>
          <div className="sum-row"><span>Versand</span><span>{cart.shipping_cents ? euro(cart.shipping_cents) : 'wird berechnet'}</span></div>
          <div className="sum-row total"><span>Gesamt</span><span data-testid="cart-total">{euro(cart.total_cents)}</span></div>
          <p className="muted" style={{ fontSize: 13 }}>inkl. {cart.vat_percent}% MwSt. ({euro(cart.vat_included_cents)})</p>
          <Link to="/teileklar/kasse" className={'btn btn-primary' + (cart.changes?.length ? ' disabled-link' : '')} style={{ width: '100%', marginTop: 14 }} data-testid="cart-checkout" onClick={e => cart.changes?.length && e.preventDefault()}>Zur Kasse<ArrowRight size={18} /></Link>
        </aside>
      </div>}
  </div>;
}

/* ---------------- Checkout ---------------- */
const COUNTRIES = [['DE', 'Deutschland'], ['AT', 'Österreich'], ['NL', 'Niederlande'], ['BE', 'Belgien'], ['LU', 'Luxemburg']];
export function TkCheckout() {
  const nav = useNavigate();
  const [cart, setCart] = useState(null);
  const [quote, setQuote] = useState(null);
  const [a, setA] = useState({ first_name: '', last_name: '', street: '', zip: '', city: '', country: 'DE', email: '', phone: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const key = useRef(newKey());
  useEffect(() => {
    api('/shop/cart').then(c => { setCart(c); if (c.lines.length) api('/shop/checkout/quote', { method: 'POST' }).then(setQuote).catch(ex => setMsg(ex.detail?.message || 'Preis noch nicht freigegeben.')); });
  }, []);
  const set = k => e => setA({ ...a, [k]: e.target.value });
  const place = async e => {
    e.preventDefault(); setBusy(true); setErrors({}); setMsg('');
    if (!terms) { setBusy(false); setMsg('Bitte bestätigen Sie die Shopbedingungen.'); return; }
    try {
      const r = await api('/shop/orders', { method: 'POST', headers: { 'Idempotency-Key': key.current }, body: { address: a, shipping_method: 'standard', accept_terms: terms, quote_hash: quote?.quote_hash || '' } });
      if (r.checkout_url) window.location.href = r.checkout_url;
      else nav('/teileklar/bestellung/' + r.order_id);
    } catch (ex) {
      if (ex.status === 422 && ex.detail?.fields) { setErrors(ex.detail.fields); setMsg('Bitte prüfen Sie die markierten Felder.'); }
      else if (ex.detail?.error === 'changes_pending') { setMsg('Der Warenkorb hat sich geändert. Bitte prüfen Sie den Warenkorb erneut.'); if (ex.detail.quote) setQuote(ex.detail.quote); }
      else setMsg(ex.detail?.message || 'Bestellung konnte nicht abgeschlossen werden.');
      setBusy(false);
    }
  };
  if (!cart) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 400 }} /></div>;
  if (!cart.lines.length) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice info">Ihr Warenkorb ist leer. <Link to="/teileklar/katalog">Zum Katalog</Link></div></div>;
  const E = k => errors[k] && <span className="err" role="alert">{errors[k] === 'required' ? 'Bitte ausfüllen.' : errors[k] === 'invalid' ? 'Bitte prüfen.' : 'Bitte prüfen.'}</span>;
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-checkout">
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)' }}>Kasse</h1>
    <div className="cart-grid" style={{ marginTop: 24 }}>
      <form className="glass card form" onSubmit={place} noValidate>
        <h3>Lieferadresse</h3>
        <div className="row"><label className={'field' + (errors.first_name ? ' invalid' : '')}>Vorname *<input value={a.first_name} onChange={set('first_name')} data-testid="co-first" />{E('first_name')}</label><label className={'field' + (errors.last_name ? ' invalid' : '')}>Nachname *<input value={a.last_name} onChange={set('last_name')} data-testid="co-last" />{E('last_name')}</label></div>
        <label className={'field' + (errors.street ? ' invalid' : '')}>Straße & Nr. *<input value={a.street} onChange={set('street')} data-testid="co-street" />{E('street')}</label>
        <div className="row"><label className={'field' + (errors.zip ? ' invalid' : '')}>PLZ *<input value={a.zip} onChange={set('zip')} data-testid="co-zip" />{E('zip')}</label><label className={'field' + (errors.city ? ' invalid' : '')}>Ort *<input value={a.city} onChange={set('city')} data-testid="co-city" />{E('city')}</label></div>
        <div className="row"><label className="field">Land<select value={a.country} onChange={set('country')} data-testid="co-country">{COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label className={'field' + (errors.email ? ' invalid' : '')}>E-Mail *<input type="email" value={a.email} onChange={set('email')} data-testid="co-email" />{E('email')}</label></div>
        <label className="field">Telefon (optional)<input value={a.phone} onChange={set('phone')} /></label>
        <label className="check"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} data-testid="co-terms" /><span>Ich akzeptiere die <Link to="/teileklar/rechtliches/shop-agb" target="_blank">Shopbedingungen</Link> und die <Link to="/teileklar/rechtliches/widerruf" target="_blank">Widerrufsbelehrung</Link>. *</span></label>
        {msg && <div className="notice err" data-testid="co-msg">{msg}</div>}
        <button className="btn btn-primary" disabled={busy || !quote} data-testid="co-submit">{busy ? <><span className="spinner" />Weiterleitung zu Revolut …</> : 'Zahlungspflichtig bestellen'}</button>
        <p className="muted">Die Zahlung erfolgt sicher über die Bezahlseite von Revolut.</p>
      </form>
      <aside className="glass card cart-summary">
        <h3>Ihre Bestellung</h3>
        {cart.lines.map(l => <div key={l.product_id} className="sum-row"><span style={{ maxWidth: '60%' }}>{l.quantity}× {l.name}</span><span>{euro(l.line_cents)}</span></div>)}
        <div className="sum-row"><span>Versand</span><span>{euro(cart.shipping_cents)}</span></div>
        <div className="sum-row total"><span>Gesamt</span><span data-testid="co-total">{euro(cart.total_cents)}</span></div>
        <p className="muted" style={{ fontSize: 13 }}>inkl. {cart.vat_percent}% MwSt.</p>
      </aside>
    </div>
  </div>;
}

/* ---------------- Order readback ---------------- */
export function TkOrder() {
  const { id } = useParams();
  const [o, setO] = useState(undefined);
  const load = () => api('/shop/orders/' + id).then(setO).catch(() => setO(null));
  useEffect(() => { setO(undefined); load(); }, [id]);
  if (o === undefined) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 300 }} /></div>;
  if (o === null) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice err">Bestellung nicht gefunden.</div></div>;
  const paid = o.status === 'bezahlt';
  return <div className="wrap" style={{ padding: '40px 0 80px', maxWidth: 820 }} data-testid="tk-order">
    <div className={'notice ' + (paid ? 'ok' : o.status === 'zahlung_nicht_abgeschlossen' ? 'err' : 'info')} data-testid="order-status">
      <strong>{paid ? <><CheckCircle2 size={18} style={{ verticalAlign: 'middle' }} /> Zahlung erhalten – vielen Dank!</> : o.status === 'zahlung_offen' ? 'Zahlung noch offen.' : 'Zahlung nicht abgeschlossen.'}</strong>
      <p style={{ marginTop: 6 }}>Bestellnummer: <span style={{ fontFamily: 'var(--mono)' }} data-testid="order-number">{o.number}</span></p>
      {!paid && o.checkout_url && <a href={o.checkout_url} className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>Zahlung fortsetzen</a>}
      {!paid && <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, marginLeft: 8 }} onClick={load} data-testid="order-refresh">Status aktualisieren</button>}
    </div>
    <div className="order-timeline" data-testid="order-timeline">{o.timeline?.map(t => <div key={t.id} className={'tl-step' + (t.reached ? ' done' : '')}><span className="tl-dot" />{t.label}{t.at && <span className="muted">{dt(t.at)}</span>}</div>)}</div>
    <div className="glass card" style={{ marginTop: 24 }}>
      <h3>Positionen</h3>
      {o.lines?.map(l => <div key={l.product_id} className="sum-row"><span>{l.quantity}× {l.name}</span><span>{euro(l.line_cents)}</span></div>)}
      <div className="sum-row"><span>Versand</span><span>{euro(o.shipping_cents)}</span></div>
      <div className="sum-row total"><span>Gesamt</span><span>{euro(o.total_cents)}</span></div>
    </div>
  </div>;
}

/* ---------------- Orders list ---------------- */
export function TkOrders() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  useEffect(() => { if (user) api('/shop/orders').then(setData).catch(() => setData({ orders: [] })); }, [user]);
  if (user === null) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice info">Bitte <Link to="/anmelden">anmelden</Link>, um Ihre Bestellungen zu sehen.</div></div>;
  if (!data) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 240 }} /></div>;
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-orders">
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)' }}>Meine Bestellungen</h1>
    {!data.orders.length ? <div className="notice info" style={{ marginTop: 20 }}>Noch keine Bestellungen.</div>
      : <div className="glass card" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}><table className="t"><thead><tr><th>Nummer</th><th>Datum</th><th>Artikel</th><th>Summe</th><th>Status</th></tr></thead><tbody>
        {data.orders.map(o => <tr key={o.id} data-testid="order-row"><td><Link to={`/teileklar/bestellung/${o.id}`} style={{ fontFamily: 'var(--mono)' }}>{o.number}</Link></td><td>{dt(o.created_at)}</td><td>{o.items}</td><td>{euro(o.total_cents)}</td><td><span className={'chip ' + (o.status === 'bezahlt' ? 'ok' : 'warn')}>{o.status}</span></td></tr>)}
      </tbody></table></div>}
  </div>;
}

/* ---------------- Workshops ---------------- */
export function TkWorkshops() {
  const [q, setQ] = useState(''); const [zip, setZip] = useState('');
  const [data, setData] = useState(null);
  useEffect(() => { const t = setTimeout(() => api(`/workshops/search?q=${encodeURIComponent(q)}&zip=${encodeURIComponent(zip)}`).then(setData).catch(() => setData({ items: [] })), 250); return () => clearTimeout(t); }, [q, zip]);
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-workshops">
    <span className="kicker"><i />Werkstattsuche</span>
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)', marginTop: 12 }}>Werkstatt finden</h1>
    <p style={{ marginTop: 10, maxWidth: '60ch' }}>Suchen Sie eine Partnerwerkstatt in Ihrer Nähe. Die Montage vereinbaren Sie direkt mit der Werkstatt.</p>
    <div className="tk-filters glass card" style={{ marginTop: 20 }}>
      <label className="field tk-search"><Search size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, Ort oder Leistung" data-testid="ws-search" /></label>
      <input className="tk-catselect" value={zip} onChange={e => setZip(e.target.value)} placeholder="PLZ" style={{ maxWidth: 140 }} data-testid="ws-zip" />
    </div>
    {!data ? <div className="grid-3" style={{ marginTop: 20 }}>{[0, 1, 2].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}</div>
      : !data.items.length ? <div className="notice info" style={{ marginTop: 20 }} data-testid="ws-empty">Keine Werkstätten gefunden.</div>
        : <div className="grid-3" style={{ marginTop: 20 }}>{data.items.map(w => <div key={w.workshop_id || w.id} className="glass card" data-testid="workshop-card"><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Wrench size={20} style={{ color: 'var(--lime)' }} /><h3>{w.name}</h3></div><p className="muted" style={{ marginTop: 8 }}>{[w.zip, w.city].filter(Boolean).join(' ')}</p>{w.services && <div className="chips" style={{ marginTop: 10 }}>{(Array.isArray(w.services) ? w.services : []).slice(0, 3).map(s => <span key={s} className="chip">{s}</span>)}</div>}</div>)}</div>}
  </div>;
}

/* ---------------- Partner / Support ---------------- */
export function TkPartner() {
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-partner">
    <span className="kicker"><i />Partner werden</span>
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)', marginTop: 12 }}>Werkstatt- und Händlerpartner</h1>
    <p style={{ marginTop: 10, maxWidth: '60ch' }}>Sie betreiben eine Werkstatt oder einen Handel und möchten mit TEILEKLAR zusammenarbeiten? Beschreiben Sie Ihr Angebot – wir melden uns persönlich.</p>
    <div style={{ maxWidth: 720, marginTop: 24 }}><InboundForm kind="partner" brand="teileklar" messageLabel="Ihr Angebot / Ihre Anfrage" submitLabel="Partneranfrage senden" purposes={['Werkstattpartnerschaft', 'Händlerpartnerschaft', 'Sonstiges']} /></div>
  </div>;
}

export function TkSupport() {
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-support">
    <span className="kicker"><i />Support</span>
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)', marginTop: 12 }}>TEILEKLAR Support</h1>
    <p style={{ marginTop: 10, maxWidth: '60ch' }}>Fragen zu Bestellungen, Widerruf, Retoure oder Teileanfrage. Nach dem Absenden erhalten Sie eine Vorgangskennung.</p>
    <div style={{ maxWidth: 720, marginTop: 24 }}><InboundForm kind="support" brand="teileklar" messageLabel="Ihr Anliegen" submitLabel="Anfrage senden" purposes={['Bestellung / Lieferung', 'Widerruf / Retoure', 'Teileanfrage (Passung)', 'Reklamation', 'Sonstiges']} /></div>
  </div>;
}

/* ---------------- Admin ---------------- */
export function TkAdmin() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [imp, setImp] = useState(null);
  const [orders, setOrders] = useState(null);
  const [msg, setMsg] = useState(''); const [forbidden, setForbidden] = useState(false);
  const load = () => {
    api('/admin/settings').then(setSettings).catch(ex => { if (ex.status === 401 || ex.status === 403) setForbidden(true); });
    api('/admin/import').then(setImp).catch(() => {});
    api('/admin/orders').then(r => setOrders(r.orders || r)).catch(() => {});
  };
  useEffect(() => { if (user) load(); }, [user]);
  if (user === null) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice info">Bitte <Link to="/anmelden">anmelden</Link>.</div></div>;
  if (forbidden) return <div className="wrap" style={{ padding: '80px 0' }}><div className="notice err" data-testid="admin-forbidden">Dieser Bereich ist nur für Administratoren.</div></div>;
  const saveSettings = async (patch) => { const r = await api('/admin/settings', { method: 'PUT', body: { ...settings, ...patch } }); setSettings(r); setMsg('Einstellungen gespeichert.'); };
  const release = async () => { await api('/admin/price-release', { method: 'POST', body: { released: !settings.price_released } }); setMsg('Preisfreigabe aktualisiert.'); load(); };
  const runImport = async () => { setMsg('Import gestartet …'); try { await api('/admin/import', { method: 'POST', body: {} }); setTimeout(load, 1500); } catch (ex) { setMsg(ex.detail?.message || 'Import nicht möglich (Zugangsdaten?).'); } };
  if (!settings) return <div className="wrap" style={{ padding: '60px 0' }}><div className="skeleton" style={{ height: 240 }} /></div>;
  return <div className="wrap" style={{ padding: '40px 0 80px' }} data-testid="tk-admin">
    <h1 style={{ fontSize: 'clamp(28px,3vw,40px)' }}>TEILEKLAR Verwaltung</h1>
    {msg && <div className="notice info" style={{ marginTop: 16 }} data-testid="admin-msg">{msg}</div>}
    <div className="grid-2" style={{ marginTop: 24, alignItems: 'start' }}>
      <div className="glass card form">
        <h3>Preise & Versand</h3>
        <label className="field">Aufschlag (%)<input type="number" defaultValue={settings.markup_percent} onBlur={e => saveSettings({ markup_percent: Number(e.target.value) })} data-testid="admin-markup" /></label>
        <label className="field">Versandkosten (Cent)<input type="number" defaultValue={settings.shipping_cents} onBlur={e => saveSettings({ shipping_cents: Number(e.target.value) })} data-testid="admin-shipping" /></label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}><span>Preisfreigabe: {settings.price_released ? <span className="chip ok">freigegeben</span> : <span className="chip warn">nicht freigegeben</span>}</span><button className="btn btn-ghost btn-sm" onClick={release} data-testid="admin-release">{settings.price_released ? 'Sperren' : 'Freigeben'}</button></div>
      </div>
      <div className="glass card">
        <h3>BigBuy-Import</h3>
        <p className="muted" style={{ marginTop: 8 }}>Letzter Lauf: {imp?.last?.finished_at ? dt(imp.last.finished_at) : imp?.finished_at ? dt(imp.finished_at) : 'noch keiner'}</p>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={runImport} data-testid="admin-import"><Truck size={18} />Import starten</button>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>Benötigt gültige BigBuy-Zugangsdaten in der Umgebung.</p>
      </div>
    </div>
    <div className="glass card" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px' }}><h3>Bestellungen</h3></div>
      {orders?.length ? <table className="t"><thead><tr><th>Nummer</th><th>Datum</th><th>Summe</th><th>Status</th></tr></thead><tbody>{orders.map(o => <tr key={o.id || o._id}><td style={{ fontFamily: 'var(--mono)' }}>{o.number}</td><td>{dt(o.created_at)}</td><td>{euro(o.total_cents)}</td><td><span className="chip">{o.status}</span></td></tr>)}</tbody></table> : <p className="muted" style={{ padding: '0 24px 20px' }}>Noch keine Bestellungen.</p>}
    </div>
  </div>;
}
