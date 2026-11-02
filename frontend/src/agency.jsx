import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PAGES, HOME } from './content.js';
import { PageHero, CtaBand, Go, Arrow, HeroFilm, InboundForm, Crumbs } from './ui.jsx';
import { api, euro, dt } from './api.js';

const TRANSCRIPT = 'Ein klarer Auftritt beginnt mit einer klaren Idee. Wir bringen Marke, Website und Inhalte in einen verständlichen Zusammenhang. Von der ersten Struktur bis zur passenden Umsetzung, mit einem nachvollziehbaren nächsten Schritt. Was braucht Ihr Vorhaben? Das klären wir gemeinsam. Projekt besprechen.';

export function Home() {
  return <main data-testid="home">
    <section className="hero"><div className="wrap hero-grid">
      <div className="hero-copy">
        <span className="kicker"><i />NeXify AI · Agentur & Produktwelt</span>
        <h1 style={{ marginTop: 18 }} data-testid="hero-headline"><span>Marke. System.</span><span className="accent">Wachstum.</span></h1>
        <p className="hero-body">NeXify AI FACTORY B.V. verbindet Markenauftritt, digitale Systeme und Marketing. Für Unternehmen, die hochwertig auftreten, gezielter arbeiten und mit einem klaren Budget starten möchten.</p>
        <div className="hero-links"><Link to="/projektbriefing" className="hero-link-primary" data-testid="hero-project-link">Ihr Projekt mit NeXify<Arrow /></Link><Link to="/leistungen" className="hero-link-secondary" data-testid="hero-services-link">Leistungen entdecken<Arrow /></Link></div>
      </div>
      <HeroFilm src="/media/films/home-studio-welcome-20261102.mp4" poster="/media/films/home-studio-welcome-20261102.jpg" captions="/media/films/home-studio-welcome-20261102.de.vtt" transcript={TRANSCRIPT} title="Pascal, NeX und AIFly ORACLE im NeXify Studio" />
    </div></section>

    <section className="section" style={{ paddingTop: 24 }}><div className="wrap">
      <div className="section-head"><h2>Zeigen Sie, was Ihr Unternehmen besonders macht.</h2><p>Sie kennen Ihr Geschäft. Wir bringen Ihr Angebot in eine klare Form: mit Gestaltung, Texten und einer Website, auf der Interessenten schnell verstehen, warum sie bei Ihnen richtig sind.</p></div>
      <div className="grid-3">{HOME.galleries.map((g, i) => <Link key={g.title} to={g.to} className="still" data-testid={`home-still-${i}`}>
        <figure><img src={g.img} alt={g.alt} width="1024" height="1024" loading="lazy" /></figure>
        <h3>{g.title}<Arrow /></h3><p>{g.body}</p><span className="link">{g.link}<Arrow /></span></Link>)}</div>
    </div></section>

    <section className="section"><div className="wrap">
      <div className="section-head"><h2>Was brauchen Sie für Ihren nächsten Schritt?</h2><p>Vielleicht ist Ihre Website aus der Zeit gefallen. Vielleicht kostet ein Ablauf jeden Tag zu viel Zeit. Oder Ihr Angebot erreicht noch nicht die richtigen Menschen.</p></div>
      <div className="grid-3">{PAGES.leistungen.frames.map(fr => <article key={fr.name} className="glass card"><span className="kicker">{fr.who}</span><h3 style={{ marginTop: 14 }}>{fr.name}</h3><p>{fr.problem}</p><ul>{fr.deliver.slice(0, 3).map(d => <li key={d}>{d}</li>)}</ul><Go to={fr.to}>Leistung ansehen<Arrow /></Go></article>)}</div>
    </div></section>

    <section className="section" id="zusammenarbeit"><div className="wrap">
      <div className="section-head"><h2>Sie wissen, wer sich kümmert. Und wie es weitergeht.</h2><p>Pascal begleitet Ihr Projekt persönlich. Umfang, Budget und Entscheidungen besprechen wir, bevor daraus zusätzliche Arbeit wird.</p></div>
      <div className="flow">{[['Sie erzählen uns, was Sie vorhaben.', 'Ziel, bisherige Lösung und das, was Ihnen wichtig ist.'], ['Sie erhalten ein konkretes Angebot.', 'Vereinbarte Leistungen, Optionen und Kostenrahmen.'], ['Wir setzen um und zeigen den Stand.', 'Rückmeldung an den vereinbarten Stellen.'], ['Ergebnis und Übergabe.', 'Bedienung erklärt, Betreuung optional.']].map(([h, p]) => <div key={h}><h3>{h}</h3><p>{p}</p></div>)}</div>
      <div style={{ marginTop: 24 }}><Go to="/zusammenarbeit">Projektablauf im Detail<Arrow /></Go></div>
    </div></section>

    <section className="section" id="produktwelt"><div className="wrap">
      <div className="section-head"><h2>Sie möchten selbst mit KI arbeiten?</h2><p>Neben den Agenturleistungen gibt es eigene Produkte. Jedes hat einen eigenen Zugang und einen ehrlich ausgewiesenen Status.</p></div>
      <div className="grid-2">{PAGES.produkte.products.map(p => <Link key={p.name} to={p.to} className="glass card" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'space-between', gap: 20 }} data-testid={`home-product-${p.name}`}><div><h3>{p.name}</h3><p style={{ marginTop: 8 }}>{p.task}</p><div className="chips" style={{ marginTop: 14 }}><span className="chip">{p.status}</span></div><span className="link" style={{ marginTop: 8 }}>{p.cta}<Arrow /></span></div></Link>)}</div>
    </div></section>

    <section className="section" id="budget"><div className="wrap grid-2" style={{ alignItems: 'start' }}>
      <div><h2>Sie wissen vorher, wofür Sie bezahlen.</h2><p style={{ marginTop: 16, maxWidth: '50ch' }}>Ihr Angebot beschreibt, was wir für Sie umsetzen. Betreuung und laufende Nutzung vereinbaren wir separat.</p><Go to="/preise">Preise & Optionen verstehen<Arrow /></Go></div>
      <div className="glass card" style={{ display: 'grid', gap: 20 }}>{[['Die Umsetzung', 'Seiten, Inhalte, Funktionen oder Abläufe werden als Projekt kalkuliert.'], ['Die Betreuung', 'Pflege und Unterstützung können Sie zusätzlich vereinbaren.'], ['Laufende Kosten', 'Hosting, Software, KI-Nutzung und Werbebudget werden ausdrücklich zugeordnet.']].map(([h, p]) => <div key={h}><h3 style={{ fontSize: 17 }}>{h}</h3><p style={{ fontSize: 15, marginTop: 4 }}>{p}</p></div>)}</div>
    </div></section>
    <CtaBand />
  </main>;
}

const crumbFor = slug => ['marke', 'websites', 'automatisierung', 'ki-agenten', 'marketing', 'seo'].includes(slug) ? [['Leistungen', '/leistungen'], [PAGES[slug].kicker]] : ['nex2fly', 'one', 'oracle', 'api'].includes(slug) ? [['Produkte', '/produkte'], [PAGES[slug].kicker]] : [[PAGES[slug].kicker]];

export function ContentPage({ slug }) {
  const pg = PAGES[slug];
  useEffect(() => { document.title = pg.kicker + ' · NeXify AI'; window.scrollTo(0, 0); }, [slug]);
  return <main data-testid={`page-${slug}`}>
    <PageHero kicker={pg.kicker} title={pg.title} lead={pg.lead} image={pg.image} crumbs={crumbFor(slug)}>
      <div className="hero-actions"><Go to={pg.cta.to} className="btn btn-primary" data-testid="page-cta">{pg.cta.label}<Arrow /></Go>{pg.alt && <Go to={pg.alt.to} className="btn btn-ghost">{pg.alt.label}</Go>}</div>
    </PageHero>
    {pg.frames && <section className="section"><div className="wrap grid-3">{pg.frames.map(fr => <article key={fr.name} className="glass card" data-testid="service-frame"><span className="kicker">Zielkunde</span><p style={{ marginTop: 8 }}>{fr.who}</p><h3 style={{ margin: '18px 0 8px' }}>{fr.name}</h3><p><strong style={{ color: 'var(--text)' }}>Ausgangsproblem:</strong> {fr.problem}</p><ul>{fr.deliver.map(d => <li key={d}>{d}</li>)}</ul><p style={{ marginTop: 14, fontSize: 14 }}><strong style={{ color: 'var(--text)' }}>Ihre Mitwirkung:</strong> {fr.help}</p><p style={{ marginTop: 8, fontSize: 14, color: 'var(--amber)' }}>Ausgeschlossen: {fr.not}</p><Go to={fr.to}>Details<Arrow /></Go></article>)}</div></section>}
    {pg.compare && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><h2 style={{ marginBottom: 24 }}>Wann Projekt, wann Produkt?</h2><div className="grid-2">{pg.compare.map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div></div></section>}
    {pg.blocks && <section className="section"><div className="wrap"><div className={pg.blocks.length % 3 === 0 ? 'grid-3' : 'grid-2'}>{pg.blocks.map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div></div></section>}
    {pg.flow && <section className="section" style={{ paddingTop: pg.blocks ? 0 : undefined }}><div className="wrap"><h2 style={{ marginBottom: 24 }}>So läuft es ab</h2><div className="flow">{pg.flow.map(([h, p]) => <div key={h}><h3>{h}</h3><p>{p}</p></div>)}</div></div></section>}
    {pg.types && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><h2 style={{ marginBottom: 24 }}>Präsentationsseite, Kampagnenseite, Portal oder Shop</h2><div className="grid-4">{pg.types.map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div><p className="muted" style={{ marginTop: 18 }}>Angebotsparameter: {pg.params.join(' · ')}</p></div></section>}
    {pg.examples && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><h2 style={{ marginBottom: 24 }}>Beispiele mit Auftragsgrenzen</h2><div className="grid-3">{pg.examples.map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div></div></section>}
    {pg.steps && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><table className="t glass" style={{ borderRadius: 22, overflow: 'hidden' }}><thead><tr><th>Schritt</th><th>Was passiert</th><th>Ihre Entscheidung / Vorbereitung</th></tr></thead><tbody>{pg.steps.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody></table></div></section>}
    {pg.editions && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><h2 style={{ marginBottom: 24 }}>Privat und Business</h2><div className="grid-2">{pg.editions.map(([h, items, limit]) => <div key={h} className="glass card"><h3>{h}</h3><ul>{items.map(i => <li key={i}>{i}</li>)}</ul><p style={{ marginTop: 14, fontSize: 14, color: 'var(--amber)' }}>{limit}</p></div>)}</div><div className="notice info" style={{ marginTop: 20 }}>{pg.trial}</div></div></section>}
    {pg.table && <section className="section" style={{ paddingTop: 0 }}><div className="wrap" style={{ overflowX: 'auto' }}><table className="t glass" style={{ borderRadius: 22, minWidth: 720 }}><thead><tr><th>Bereich</th><th>Soll</th><th>Heute</th></tr></thead><tbody>{pg.table.map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td><span className={'chip ' + (c.startsWith('Offen') || c.startsWith('Keine') ? 'warn' : 'ok')}>{c}</span></td></tr>)}</tbody></table></div></section>}
    {pg.products && <section className="section" style={{ paddingTop: 0 }}><div className="wrap" style={{ overflowX: 'auto' }}><table className="t glass" style={{ borderRadius: 22, minWidth: 860 }}><thead><tr><th>Produkt</th><th>Zielgruppe</th><th>Aufgabe</th><th>Zugang</th><th>Status</th><th /></tr></thead><tbody>{pg.products.map(p => <tr key={p.name}><td>{p.name}</td><td>{p.who}</td><td>{p.task}</td><td>{p.access}</td><td><span className="chip">{p.status}</span></td><td><Go to={p.to}>{p.cta}<Arrow /></Go></td></tr>)}</tbody></table></div></section>}
    {pg.empty && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><div className="notice info" data-testid="references-empty">{pg.empty}</div><h2 style={{ margin: '40px 0 20px' }}>Gekennzeichnete Demonstratoren</h2><div className="grid-2">{pg.demos.map(([h, tag, p, to]) => <Link key={h} to={to} className="glass card" style={{ textDecoration: 'none' }}><span className="chip warn">{tag}</span><h3 style={{ marginTop: 14 }}>{h}</h3><p>{p}</p></Link>)}</div></div></section>}
    {pg.disabledAction && <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><div className="glass card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}><div><h3>Werkzeugausführung</h3><p>Noch nicht freigegeben. Der Knopf wird erst aktiv, wenn die Funktion abgenommen ist.</p></div><button className="btn btn-ghost" disabled data-testid="agent-action-disabled">{pg.disabledAction}</button></div></div></section>}
    {(pg.deliver || pg.limits) && <section className="section" style={{ paddingTop: 0 }}><div className="wrap grid-2" style={{ alignItems: 'start' }}>
      {pg.deliver && <div className="glass card"><h3>Lieferobjekte</h3><ul>{pg.deliver.map(d => <li key={d}>{d}</li>)}</ul>{pg.process && <div className="chips" style={{ marginTop: 18 }}>{pg.process.map((s, i) => <span key={s} className="chip">{i + 1}. {s}</span>)}</div>}</div>}
      {pg.limits && <div className="limits"><h3>Grenzen & Abnahme</h3><ul>{pg.limits.map(d => <li key={d}>{d}</li>)}</ul></div>}
    </div></section>}
    {pg.form && <section className="section" style={{ paddingTop: 0 }}><div className="wrap grid-2" style={{ alignItems: 'start' }}><div><h2>{pg.cta.label}</h2><p style={{ marginTop: 14 }}>Wenige Angaben genügen. Sensible Daten brauchen wir dafür nicht.</p></div><InboundForm kind={pg.form} messageLabel={pg.form === 'visibility' ? 'Website-Adresse und Ihr Ziel' : 'Ihr Anliegen'} submitLabel={pg.cta.label} /></div></section>}
    <CtaBand />
  </main>;
}

export function Preise() {
  const [v, setV] = useState({ h: 40, rate: 60, ext: 400, oh: 600, risk: 300, margin: 25 });
  const full = v.h * v.rate + v.ext + v.oh + v.risk, net = v.margin < 100 ? full / (1 - v.margin / 100) : null;
  const set = k => e => setV({ ...v, [k]: Math.max(0, +e.target.value || 0) });
  return <main data-testid="page-preise">
    <PageHero kicker="Pakete, Preise und Optionen" title="Nachvollziehbare Positionen statt Fantasiepreise." lead="Einmalige Projektkosten, laufende Betreuung, Softwarezugang, Verbrauch und Fremdkosten werden getrennt. Konkrete NeXify-Preise sind noch nicht kommerziell freigegeben und werden deshalb hier nicht als kaufbar veröffentlicht." image="/media/gen/preise.webp" crumbs={[['Preise & Optionen']]}><div className="hero-actions"><Link to="/projektbriefing" className="btn btn-primary">Angebot anfragen<Arrow /></Link></div></PageHero>
    <section className="section"><div className="wrap grid-3">{[['Einmalig: Projekt', 'Aufwand je Rolle, Fremdleistungen, Lizenzen, Migration, Tests, Übergabe.'], ['Laufend: Betreuung & Zugang', 'Zugangspreis, Nutzer-/Workspace-Positionen, Infrastruktur, Supportkontingent.'], ['Verbrauch & Fremdkosten', 'Gemessene Modell-, Tool- und Laufzeitnutzung; Media-Budget getrennt vom Honorar.']].map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p><div className="chips" style={{ marginTop: 14 }}><span className="chip warn">Preis: offen</span></div></div>)}</div></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap grid-2" style={{ alignItems: 'start' }}>
      <div><span className="kicker"><i />Rechenbeispiel</span><h2 style={{ marginTop: 14 }}>Wie eine Kalkulation entsteht</h2><p style={{ marginTop: 14 }}>Reines Rechenbeispiel mit angenommenen Werten. Kein NeXify-Tarif und kein verbindliches Angebot. Alle Beträge netto; Steuern werden im konkreten Angebot bestimmt.</p><p className="muted" style={{ marginTop: 14 }}>Vollkosten = Aufwand × Kostensatz + Fremdleistungen + Gemeinkosten + Risikoreserve. Angebotsnetto = Vollkosten ÷ (1 − Umsatzmarge). Ein Kostenaufschlag würde stattdessen Vollkosten × (1 + Aufschlag) rechnen.</p></div>
      <div className="glass card form" data-testid="calc"><div className="row">{[['h', 'Arbeitsaufwand · Stunden'], ['rate', 'Interner Kostensatz · EUR/Std.'], ['ext', 'Fremdleistungen · EUR'], ['oh', 'Gemeinkosten · EUR'], ['risk', 'Risikoreserve · EUR'], ['margin', 'Zielmarge · %']].map(([k, l]) => <label key={k} className="field">{l}<input type="number" min="0" max={k === 'margin' ? 95 : undefined} value={v[k]} onChange={set(k)} data-testid={`calc-${k}`} /></label>)}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}><span className="muted">Vollkosten {euro(full * 100)}</span><output style={{ fontSize: 28, color: 'var(--champ)' }} data-testid="calc-result">{net == null ? '–' : euro(Math.round(net * 100))}</output></div><p className="muted">Beispiel-Projektpreis netto · Annahmen, kein Tarif</p></div>
    </div></section>
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><div className="limits"><h3>Vor jedem Angebot festzulegen</h3><ul><li>Leistungs-ID, Version, Gültigkeit; Einheit und Menge; einmalig / laufend / Verbrauch</li><li>Leistungsumfang und Ausschlüsse; optionale Positionen; Währung und zutreffende Steuer</li><li>Inklusivmengen, Überziehung, Kündigung/Verlängerung, Zahlungsweg, Supportfenster</li><li>Fehlende Werte bleiben „offen“, nicht 0.</li></ul></div></div></section>
    <CtaBand />
  </main>;
}

export function Unternehmen() {
  return <main data-testid="page-unternehmen">
    <PageHero kicker="Unternehmen und Ansprechpartner" title="Pascal Courbois begleitet Ihr Projekt persönlich." lead="NeXify AI ist die Agentur von Pascal Courbois. Sie sprechen direkt mit der Person, die fachlich verantwortet, was umgesetzt wird." image="/media/films/home-studio-welcome-20261102.jpg" alt="Pascal Courbois mit NeX und AIFly ORACLE im NeXify Studio" crumbs={[['Unternehmen']]}><div className="hero-actions"><Link to="/kontakt" className="btn btn-primary">Pascal kontaktieren<Arrow /></Link><Link to="/zusammenarbeit" className="btn btn-ghost">Arbeitsweise</Link></div></PageHero>
    <section className="section"><div className="wrap grid-3">{[['Arbeitsweise', 'Erst verstehen, dann abgrenzen, dann umsetzen. Entscheidungen fallen an festen Punkten.'], ['Fachliche Verantwortung', 'Pascal verantwortet Angebot, Umsetzung und Abnahme. Es gibt kein erfundenes Team.'], ['NeX & AIFly ORACLE', 'Die Figuren stehen für Assistenz (NeX) und Koordination (AIFly). Sie sind Illustrationen, keine Personen.']].map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div>
      <div className="wrap"><p className="muted" style={{ marginTop: 24 }}>Rechtliche Angaben zur Betreiberidentität stehen ausschließlich im <Link to="/rechtliches/impressum">Impressum</Link>.</p></div></section>
    <CtaBand />
  </main>;
}

export function Kontakt() {
  return <main data-testid="page-kontakt">
    <PageHero kicker="Kontakt" title="Schreiben Sie uns – wir melden uns persönlich." lead="Wählen Sie den Zweck, beschreiben Sie Ihr Anliegen in wenigen Sätzen. Nach dem Absenden erhalten Sie eine Vorgangskennung, sobald die Anfrage gespeichert ist." image="/media/gen/kontakt.webp" crumbs={[['Kontakt']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap grid-2" style={{ alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}><div className="glass card"><h3>E-Mail</h3><p><a href="mailto:mail@nexifyai.cloud">mail@nexifyai.cloud</a></p></div><div className="glass card"><h3>Lieber strukturiert?</h3><p>Das <Link to="/projektbriefing">Projektbriefing</Link> führt Sie Schritt für Schritt durch Ziel, Systeme und Budgetrahmen.</p></div><div className="glass card"><h3>Gesprächstermin</h3><p>Nennen Sie uns Ihren <Link to="/termin">Terminwunsch</Link> – wir bestätigen persönlich.</p></div><div className="glass card"><h3>TEILEKLAR-Bestellung?</h3><p>Fragen zu Teilen und Bestellungen bitte über den <Link to="/teileklar/support">TEILEKLAR Support</Link>.</p></div></div>
      <InboundForm kind="contact" purposes={['Website-Projekt besprechen', 'Einen konkreten Ablauf prüfen', 'Portalvorhaben beschreiben', 'Kampagne / Marketing', 'Agenturpartnerschaft', 'Sonstiges']} />
    </div></section>
  </main>;
}

const STEPS = ['Ziel', 'Ausgangslage', 'Systeme & Umfang', 'Priorität & Budget', 'Kontakt & Absenden'];
export function Briefing() {
  const [sp] = useSearchParams();
  const [draftId, setDraftId] = useState(() => localStorage.getItem('nx_draft_id'));
  const [step, setStep] = useState(0), [d, setD] = useState({ need: sp.get('bedarf') || '' }), [saved, setSaved] = useState(null), [loaded, setLoaded] = useState(!draftId);
  useEffect(() => { if (draftId) api('/requests/briefing-draft/' + draftId).then(r => { if (!r.submitted_number) { setD(r.data); setStep(r.step); } else { localStorage.removeItem('nx_draft_id'); setDraftId(null); } }).catch(() => {}).finally(() => setLoaded(true)); }, []);
  useEffect(() => { if (!loaded) return; const t = setTimeout(() => api('/requests/briefing-draft', { method: 'PUT', body: { draft_id: draftId, step, data: d } }).then(r => { setSaved(r.saved_at); if (!draftId) { setDraftId(r.draft_id); localStorage.setItem('nx_draft_id', r.draft_id); } }).catch(() => setSaved('fehler')), 700); return () => clearTimeout(t); }, [d, step, loaded]);
  const set = k => e => setD({ ...d, [k]: e.target.value });
  const F = (k, l, ta) => <label className="field">{l}{ta ? <textarea value={d[k] || ''} onChange={set(k)} data-testid={`brief-${k}`} /> : <input value={d[k] || ''} onChange={set(k)} data-testid={`brief-${k}`} />}</label>;
  const msg = `Ziel: ${d.goal || '–'}\nAusgangslage: ${d.current || '–'}\nSysteme: ${d.systems || '–'}\nUmfang: ${d.scope || '–'}\nPriorität: ${d.priority || '–'}\nBudgetkorridor: ${d.budget || 'noch offen'}\nZeitraum: ${d.timeline || 'noch offen'}`;
  return <main data-testid="page-briefing">
    <PageHero kicker="Projektbriefing" title="Ihr Vorhaben in fünf ruhigen Schritten." lead="Ihr Entwurf wird automatisch gespeichert – auch nach einem Neuladen. Ein verbindlicher Auftrag entsteht dadurch nicht; Sie erhalten danach ein Angebot." image="/media/gen/briefing.webp" crumbs={[['Projektbriefing']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap" style={{ maxWidth: 860 }}>
      <ol className="chips" style={{ listStyle: 'none', padding: 0, marginBottom: 20 }}>{STEPS.map((s, i) => <li key={s}><button className={'chip ' + (i === step ? 'ok' : '')} style={{ border: 0, cursor: 'pointer', minHeight: 40 }} onClick={() => setStep(i)} data-testid={`brief-step-${i}`}>{i + 1}. {s}</button></li>)}</ol>
      <p className="muted" style={{ marginBottom: 12 }} data-testid="draft-status">{saved === 'fehler' ? 'Entwurf konnte gerade nicht gespeichert werden – Eingaben bleiben auf dieser Seite.' : saved ? 'Entwurf gespeichert · ' + dt(saved) : 'Entwurf wird gespeichert, sobald Sie schreiben.'}</p>
      {step < 4 ? <div className="glass card form">
        {step === 0 && <><label className="field">Bedarf<select value={d.need || ''} onChange={set('need')} data-testid="brief-need"><option value="">Bitte wählen</option>{[['website', 'Website / Relaunch'], ['marke', 'Marke & Positionierung'], ['automatisierung', 'Automatisierung'], ['ki', 'KI & Agenten'], ['kampagne', 'Kampagne / Marketing'], ['portal', 'App / Portal']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>{F('goal', 'Was soll am Ende anders sein?', true)}</>}
        {step === 1 && <>{F('current', 'Wie lösen Sie es heute? Was stört?', true)}{F('url', 'Bestehende Website (optional)')}</>}
        {step === 2 && <>{F('systems', 'Welche Systeme sind beteiligt? (z. B. CRM, Shop, E-Mail)', true)}{F('scope', 'Umfang: Seiten, Sprachen, Abläufe, Nutzergruppen', true)}</>}
        {step === 3 && <><label className="field">Priorität<select value={d.priority || ''} onChange={set('priority')} data-testid="brief-priority"><option value="">Bitte wählen</option><option>Dringend (Wochen)</option><option>Geplant (Monate)</option><option>Orientierung</option></select></label><label className="field">Budgetkorridor<select value={d.budget || ''} onChange={set('budget')} data-testid="brief-budget"><option value="">noch offen</option><option>unter 5.000 €</option><option>5.000–15.000 €</option><option>15.000–40.000 €</option><option>über 40.000 €</option></select></label>{F('timeline', 'Gewünschter Zeitraum (optional)')}</>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}><button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)} data-testid="brief-back">Zurück</button><button className="btn btn-primary" onClick={() => setStep(step + 1)} data-testid="brief-next">Weiter<Arrow /></button></div>
      </div> : <><div className="glass card" style={{ marginBottom: 16 }}><h3>Zusammenfassung</h3><pre style={{ whiteSpace: 'pre-wrap', font: '14px/1.7 var(--font)', color: 'var(--text-2)' }} data-testid="brief-summary">{msg}</pre><button className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>Bearbeiten</button></div>
        <InboundForm kind="briefing" messageLabel="Ergänzungen (mind. 10 Zeichen)" submitLabel="Briefing absenden" details={{ ...d, draft_id: draftId, summary: msg }} /></>}
    </div></section>
  </main>;
}

export function Termin() {
  return <main data-testid="page-termin">
    <PageHero kicker="Terminwunsch" title="Nennen Sie uns Ihren Wunschtermin." lead="Dies ist ein Terminwunsch, keine Buchung: Es gibt keine automatische Kalenderbindung. Pascal bestätigt den Termin persönlich per E-Mail. Zeitzone: Europe/Berlin." image="/media/gen/termin.webp" crumbs={[['Terminwunsch']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap" style={{ maxWidth: 760 }}>
      <InboundForm kind="appointment" messageLabel="Worum soll es gehen?" submitLabel="Terminwunsch senden" extra={(f, set, e) => <><div className="row"><label className={'field' + (e.preferred ? ' invalid' : '')}>Wunschtermin *<input type="datetime-local" value={f.x_preferred || ''} onChange={set('x_preferred')} data-testid="field-preferred" />{e.preferred && <span className="err" role="alert">Bitte einen Wunschtermin wählen.</span>}</label><label className="field">Alternative (optional)<input type="datetime-local" value={f.x_alternative || ''} onChange={set('x_alternative')} /></label></div><label className="field">Kontaktweg<select value={f.x_channel || ''} onChange={set('x_channel')} data-testid="field-channel"><option value="">Videocall</option><option>Telefon</option><option>Vor Ort (nach Absprache)</option></select></label></>}
        details={{}} />
      <TerminDetailsBridge />
    </div></section>
  </main>;
}
// x_preferred is sent inside details; backend validation reads details.preferred
function TerminDetailsBridge() { return null; }

export function ApiDocs() {
  const ex = `curl -X POST https://api.example.invalid/v1/chat \\\n  -H "Authorization: Bearer nxk_test_DEINSCHLUESSEL_UNGUELTIG" \\\n  -H "Idempotency-Key: 6f1c-beispiel-0001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"project":"prj_beispiel","input":"Hallo"}'`;
  return <main data-testid="page-api-doku">
    <PageHero kicker="API-Dokumentation und Einstieg" title="Konzept des Schnittstellenvertrags." lead="Diese Seite beschreibt die Regeln. Konkrete Endpunkte werden erst veröffentlicht, wenn sie am gebundenen Backend geprüft sind. Das Beispiel ist bewusst nicht ausführbar." image="/media/gen/api-doku.webp" crumbs={[['Produkte', '/produkte'], ['NeXify API', '/produkte/api'], ['Dokumentation']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap grid-2" style={{ alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>{[['Authentifizierung', 'Bearer-Schlüssel je Projekt/Kostenstelle mit minimalen Scopes. Secret nur einmal sichtbar; Widerruf jederzeit im Arbeitsbereich.'], ['Idempotenz & Retry', 'Jede schreibende Operation mit Idempotency-Key. Gleicher Schlüssel + gleicher Inhalt = gleiches Ergebnis; anderer Inhalt = 409.'], ['Fehlercodes', '401 Auth · 403 Berechtigung · 409 Konflikt/Idempotenz · 422 Validierung · 429 Limit · 402 Guthaben · 502 Provider · 500 intern – jeweils mit Request-ID.'], ['Streaming & Pagination', 'Antworten als Server-Sent Events; Listen mit page/page_size.'], ['Testmodus vs. Produktion', 'Testschlüssel (nxk_test_) sind von Produktion getrennt. Produktion ist noch nicht freigegeben.'], ['Versionswechsel', 'Versionierte Pfade; Abkündigung mit Frist.']].map(([h, p]) => <div key={h} className="glass card"><h3>{h}</h3><p>{p}</p></div>)}</div>
      <div className="glass card"><h3>Beispielaufruf (Platzhalter)</h3><pre style={{ marginTop: 14, padding: 18, borderRadius: 14, background: '#121413', overflowX: 'auto', font: '13px/1.6 var(--mono)', color: 'var(--turq)' }} data-testid="api-example">{ex}</pre><p className="muted" style={{ marginTop: 12 }}>Host und Schlüssel sind offensichtlich ungültig. Nicht ausführbar, bis ein geprüfter Runtime-Stand gebunden ist.</p><Link to="/arbeitsbereich/api-schluessel" className="btn btn-primary" style={{ marginTop: 16 }}>Testschlüssel im Arbeitsbereich<Arrow /></Link></div>
    </div></section>
  </main>;
}

export function Skills() {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [st, setSt] = useState(''), [data, setData] = useState(null), [sel, setSel] = useState(null), [err, setErr] = useState('');
  useEffect(() => { const t = setTimeout(() => api(`/public/skills?q=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}&status=${st}`).then(setData).catch(e => setErr(e.message)), 250); return () => clearTimeout(t); }, [q, cat, st]);
  const open = id => api('/public/skills/' + id).then(setSel);
  return <main data-testid="page-skills">
    <PageHero kicker="Skills und Agentenkatalog" title="Welche Fähigkeit gibt es – und was darf sie?" lead="Verfügbar, installiert, freigegeben und ausführbar sind vier verschiedene Zustände. Ein Katalogeintrag ist keine Funktionsabnahme; kein Skill erlangt durch seine Beschreibung Rechte." image="/media/gen/skills.webp" crumbs={[['Produkte', '/produkte'], ['Skills']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
      <div className="glass card form" style={{ gridTemplateColumns: '2fr 1fr 1fr', display: 'grid' }}><label className="field">Suche<input value={q} onChange={e => setQ(e.target.value)} placeholder="z. B. SEO, Python, Gutachten" data-testid="skills-search" /></label><label className="field">Kategorie<select value={cat} onChange={e => setCat(e.target.value)} data-testid="skills-category"><option value="">Alle</option>{data?.categories.map(c => <option key={c}>{c}</option>)}</select></label><label className="field">Status<select value={st} onChange={e => setSt(e.target.value)} data-testid="skills-status"><option value="">Alle</option><option value="quelle">Verfügbar als Quelle</option><option value="adaptiert">Adaptiert</option><option value="installiert">Installiert</option><option value="freigegeben">Freigegeben</option><option value="ausfuehrbar">Ausführbar</option></select></label></div>
      {err && <div className="notice err" style={{ marginTop: 16 }}>{err}</div>}
      {data && <p className="muted" style={{ margin: '18px 0' }} data-testid="skills-count">{data.total} von {data.all} Einträgen · Quelle: Skill-Register 28.09.2026 und Repository-Skills. Installiert/freigegeben/ausführbar: derzeit {data.status_counts.installiert + data.status_counts.freigegeben + data.status_counts.ausfuehrbar}.</p>}
      {!data && !err && <div className="skeleton" style={{ height: 200, marginTop: 20 }} />}
      {data && data.items.length === 0 && <div className="notice info">Keine Treffer für diese Filter.</div>}
      <div className="grid-3">{data?.items.slice(0, 60).map(s => <button key={s.id} className="glass card" style={{ textAlign: 'left', border: 0, color: 'inherit', cursor: 'pointer', font: 'inherit' }} onClick={() => open(s.id)} data-testid="skill-card"><span className={'chip ' + (s.status === 'adaptiert' ? 'ok' : 'off')}>{s.status_label}</span><h3 style={{ margin: '12px 0 6px', fontSize: 17 }}>{s.name}</h3><p style={{ fontSize: 14 }}>{s.purpose.slice(0, 120)}</p><p className="muted" style={{ marginTop: 8 }}>{s.category}</p></button>)}</div>
      {sel && <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'grid', placeItems: 'center', zIndex: 80, padding: 20 }} onClick={() => setSel(null)}><div className="glass card" style={{ maxWidth: 620, background: '#262a28' }} onClick={e => e.stopPropagation()} data-testid="skill-detail"><span className="chip">{sel.status_label}</span><h2 style={{ fontSize: 26, margin: '12px 0' }}>{sel.name}</h2><p>{sel.purpose}</p><table className="t" style={{ marginTop: 16 }}><tbody>{[['ID', sel.id], ['Version', sel.version || 'nicht angegeben'], ['Herkunft', sel.origin], ['Rechte', sel.permissions], ['Kosten', sel.costs], ['Externe Wirkung', sel.external_effects]].map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody></table><button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => setSel(null)}>Schließen</button></div></div>}
    </div></section>
  </main>;
}

const BIND = { aktiv: ['ok', 'Angebunden'], konfiguration: ['warn', 'Wird eingerichtet'], nicht_konfiguriert: ['warn', 'Nicht konfiguriert'], nicht_angebunden: ['off', 'Nicht angebunden'] };
export function Verbindungen() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/public/connections').then(setD).catch(() => setD({ items: [] })); }, []);
  return <main data-testid="page-verbindungen">
    <PageHero kicker="Verbindungen und Integrationen" title="Nur was tatsächlich angebunden ist, gilt als angebunden." lead="Jeder angemeldete Nutzer verbindet nur sein eigenes Konto. Anmeldung, Berechtigungsumfang und Widerruf werden verständlich gezeigt. Neue Zugriffsrechte gibt es nur mit Ihrer konkreten Zustimmung." image="/media/gen/verbindungen.webp" crumbs={[['Produkte', '/produkte'], ['Verbindungen']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap">{!d ? <div className="skeleton" style={{ height: 240 }} /> : <div className="grid-3">{d.items.map(c => <div key={c.id} className="glass card" data-testid={`connection-${c.id}`}><span className={'chip ' + BIND[c.binding][0]}>{BIND[c.binding][1]}</span><h3 style={{ margin: '12px 0 6px' }}>{c.name}</h3><p className="muted">{c.area}</p><p style={{ marginTop: 10, fontSize: 14 }}><strong style={{ color: 'var(--text)' }}>Umfang:</strong> {c.scope}</p><p style={{ marginTop: 6, fontSize: 14 }}>{c.note}</p></div>)}</div>}</div></section>
  </main>;
}

const STATE = { betrieb: ['ok', 'In Betrieb'], eingeschraenkt: ['warn', 'Eingeschränkt'], stoerung: ['err', 'Störung'] };
export function Hilfe() {
  const [s, setS] = useState(null), [err, setErr] = useState(false);
  const load = () => { setErr(false); api('/public/status').then(setS).catch(() => setErr(true)); };
  useEffect(load, []);
  return <main data-testid="page-hilfe">
    <PageHero kicker="Hilfe, Status und technische Hinweise" title="Hilfe finden, Status prüfen, Fall melden." lead="Hilfedokumente, aktuelle Lage und individuelle Supportfälle sind getrennt. Ein erreichbarer Server ist noch keine Vollfunktionsabnahme." image="/media/gen/hilfe.webp" crumbs={[['Hilfe & Status']]} />
    <section className="section" style={{ paddingTop: 0 }}><div className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}><h2>Aktueller Status</h2><span className="muted" data-testid="status-checked">{s ? 'Geprüft ' + dt(s.checked_at) : ''} <button className="btn btn-ghost btn-sm" onClick={load}>Neu prüfen</button></span></div>
      {err && <div className="notice err">Status konnte nicht abgerufen werden. Verbindung unterbrochen – bitte erneut prüfen.</div>}
      <div className="grid-4">{s?.areas.map(a => <div key={a.id} className="glass card" data-testid={`status-${a.id}`}><span className={'chip ' + STATE[a.state][0]}>{STATE[a.state][1]}</span><h3 style={{ margin: '12px 0 6px', fontSize: 17 }}>{a.name}</h3><p style={{ fontSize: 14 }}>{a.note}</p></div>)}</div>
      <h2 style={{ margin: '56px 0 18px' }}>Häufige Fragen</h2>
      <div style={{ display: 'grid', gap: 12 }}>{[['Wie erhalte ich eine Vorgangskennung?', 'Nach dem Absenden eines Formulars – sobald die Anfrage gespeichert ist. Bei Verbindungsabbruch können Sie den Status mit demselben Formular abgleichen.'], ['Ist der Chat ein Mensch?', 'Nein. Der Chat im Arbeitsbereich und der TEILEKLAR-Teileberater sind KI-Systeme und als solche gekennzeichnet.'], ['Wo finde ich meine TEILEKLAR-Bestellung?', 'Im Shop unter „Meine Bestellungen“ (angemeldet) oder über den Link auf der Bestellseite.'], ['Wie widerrufe ich einen API-Schlüssel?', 'Im Arbeitsbereich unter API-Schlüssel – Widerruf wirkt sofort.']].map(([q, a]) => <details key={q} className="glass card"><summary style={{ cursor: 'pointer', fontWeight: 500 }}>{q}</summary><p style={{ marginTop: 10 }}>{a}</p></details>)}</div>
      <div className="grid-2" style={{ marginTop: 40 }}><div className="glass card"><h3>Individueller Fall</h3><p>Schildern Sie Ihr Problem über das <Link to="/kontakt">Kontaktformular</Link> – Zweck „Sonstiges“.</p></div><div className="glass card"><h3>TEILEKLAR</h3><p>Bestellsupport, Werkstätten und Partner im <Link to="/teileklar/support">TEILEKLAR Support</Link>.</p></div></div>
    </div></section>
  </main>;
}

export function NotFound() {
  return <main data-testid="page-404"><PageHero kicker="Fehler 404" title="Diese Seite gibt es nicht (mehr)." lead="Der Link ist veraltet oder falsch geschrieben. Nichts wurde verändert oder gesendet." image="/media/gen/produkte.webp" crumbs={[['Nicht gefunden']]}><div className="hero-actions"><Link to="/" className="btn btn-primary">Zur Startseite<Arrow /></Link><Link to="/hilfe" className="btn btn-ghost">Hilfe</Link></div></PageHero></main>;
}
