// Bestpraxis-Kopf je Seite: Titel, Beschreibung, Open Graph, Themenfarbe, Seitenhelfer, reduzierte Bewegung, Fokus.
const NX_META = {
 'NeXifyAI Cloud v8.dc.html': ['NeXify AI – KI-Automatisierung, die im Betrieb läuft', 'KI-Agenten, Websites, Shops und Automatisierungen zum festen Tagessatz von 449 € netto. Kennzahl statt Versprechen. Venlo, NL – nur B2B.', 'on'],
 'Start.dc.html': ['NeXify AI × TEILEKLAR – Übersicht aller Oberflächen', 'Einstieg in alle Oberflächen von NeXify AI und TEILEKLAR: Agentur, Shop, Portale, Werkzeuge und Dokumentation.', 'on'],
 'Partner-werden.dc.html': ['Partner werden – NeXify AI', 'Für Agenturen und Freelancer: Web-, Shop- und KI-Umsetzung als White-Label zum festen Tagessatz.', 'on'],
 'Werkstatt-Partnerseite.dc.html': ['Werkstatt-Partner – TEILEKLAR', 'Werkstätten erhalten Aufträge mit Fahrzeug- und Teiledaten von TEILEKLAR-Kunden.', 'on'],
 'NeXifyAI-Local-SEO-Muster.dc.html': ['KI-Automatisierung vor Ort – NeXify AI', 'KI-Agenten und Automatisierung für Betriebe in Ihrer Region – fester Tagessatz, persönliche Verantwortung.', 'on'],
 'NeXifyAI-Wissenshub-Artikel.dc.html': ['Wissenshub – NeXify AI', 'Praxiswissen zu KI-Automatisierung: Kosten, Dauer und wann sich ein Agent lohnt.', 'on'],
 'Batterie-Berater.dc.html': ['Batterie-Berater – TEILEKLAR', 'Die passende Autobatterie in drei Schritten – mit belegter Passung für dein Fahrzeug.', 'on'],
 'Fitment-Checker.dc.html': ['Passt das Teil? Fitment-Checker – TEILEKLAR', 'Prüfe in Sekunden, ob ein Autoteil zu deinem Fahrzeug passt.', 'on'],
 'Reifenrechner.dc.html': ['Reifenrechner – TEILEKLAR', 'Reifengrößen vergleichen: Abrollumfang, Tachoabweichung und Freigabe auf einen Blick.', 'on'],
 'Architektur.dc.html': ['Systemarchitektur – NeXify AI', 'Schichten, Prüfschicht und Schuldbuch der NeXify-Plattform.', 'on'],
 'Anmeldung.dc.html': ['Anmelden – NeXify AI', 'Anmeldung zu Kundenportal, Partnerportal und Konto.', 'off'],
 'Konto.dc.html': ['Mein Konto – TEILEKLAR', 'Garage, Bestellungen, Rechnungen und Datenrechte.', 'off'],
 'Kundenportal.dc.html': ['Kundenportal – NeXify AI', 'Angebote, Projekte, Abnahmen und Rechnungen.', 'off'],
 'Partnerportal.dc.html': ['Partnerportal – TEILEKLAR', 'Profil, Gutscheine, Termine und Abrechnung für Werkstatt-Partner.', 'off'],
 'Nachbarschaftskunden-Portal.dc.html': ['Gutschein einlösen – TEILEKLAR', 'Nachbarschaftskunden: Gutschein, Termin und Belege.', 'off'],
 'NeXify-AI-Companion.dc.html': ['NeXify AI Companion – Zustände', 'Die elf Zustände des KI-Beraters.', 'off'],
 'TEILEKLAR Shop.dc.html': [null, null, 'on']
};
function bestpraxis(f, s) {
  const [title, desc, reveal] = NX_META[f];
  const CSS_REDUCE = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; } }';
  const CSS_FOCUS = 'button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid #C8F04B; outline-offset: 2px; }';
  const hs = s.indexOf('<helmet>'); if (hs < 0) return s;
  const he = s.indexOf('</helmet>', hs); let helm = s.slice(hs, he); const add = [];
  if (title && !/<title>/.test(helm)) add.push(`<title>${title}</title>`);
  if (desc && !/name="description"/.test(helm)) add.push(`<meta name="description" content="${desc}" />`);
  if (title && !/og:title/.test(helm)) add.push(`<meta property="og:title" content="${title}" />`, `<meta property="og:description" content="${desc}" />`, '<meta property="og:type" content="website" />', '<meta property="og:locale" content="de_DE" />');
  if (!/name="theme-color"/.test(helm)) add.push('<meta name="theme-color" content="#1F1F1C" />');
  if (!/nx-page\.js/.test(helm)) add.push(`<script src="nx-page.js" data-reveal="${reveal}" data-max="${f.startsWith('TEILEKLAR') ? 80 : 160}"></script>`);
  const css = [];
  if (!/prefers-reduced-motion/.test(helm)) css.push(CSS_REDUCE);
  if (!/focus-visible/.test(helm)) css.push(CSS_FOCUS);
  if (css.length) { if (/<style>/.test(helm)) helm = helm.replace('<style>', '<style>\n  ' + css.join('\n  ')); else add.push('<style>\n  ' + css.join('\n  ') + '\n</style>'); }
  helm = helm.replace('<helmet>', '<helmet>\n' + add.join('\n'));
  s = s.slice(0, hs) + helm + s.slice(he);
  if (f.startsWith('NeXifyAI Cloud v8')) s = s.replace(/\n    try \{\n      const reduce = window\.matchMedia[\s\S]*?\n    \} catch \(e\) \{\}/, '');
  return s;
}
