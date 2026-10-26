// NeXifyAI Programmatic-SEO-Schranke · prüft einen Satz generierter Seiten VOR der Veröffentlichung
// Einzigartiger Wert je Seite, keine Kannibalisierung, eindeutige Titel/Beschreibungen, Unterordner-URLs, Hub-and-Spoke ohne Waisen,
// dünne Seiten → noindex, Zahlen nur mit Beleg (R-08), hreflang vollständig. Reine Funktionen.
export class SeoFehler extends Error { constructor(code, msg) { super(msg); this.name = "SeoFehler"; this.code = code; } }
const woerter = (t) => new Set(String(t).toLowerCase().match(/[a-zäöüß0-9]{3,}/g) || []);
const jaccard = (a, b) => { const A = woerter(a), B = woerter(b); let s = 0; for (const x of A) if (B.has(x)) s++; return A.size + B.size ? s / (A.size + B.size - s) : 1; };

// Vergleich ohne die austauschbaren Werte der Seite (Slug, Datenwerte, Keyword) – sonst gelten reine Namenswechsel als »einzigartig«
const ohneEigenes = (s) => { const weg = woerter([s.url, s.keyword, ...Object.values(s.daten || {})].join(" ")); return [...woerter(s.text)].filter((w) => !weg.has(w)).join(" "); };
// seite = { url, titel, beschreibung, keyword, text, daten:{feld:wert}, belege:{feld:quelle}, zahlen:[{wert,beleg?}], hub?, links:[url], sprache, alternativen:{sprache:url} }
export function pruefen(seiten, opt = {}) {
  const min = opt.mindestEigeneFelder ?? 3, maxAehnlich = opt.maxAehnlichkeit ?? 0.6, host = opt.host;
  const befunde = [], ergebnis = [];
  const titel = new Map(), beschr = new Map(), kw = new Map();
  for (const s of seiten) {
    const f = [];
    if (host && !new RegExp("^https://" + host.replace(/\./g, "\\.") + "/[a-z0-9-]+/").test(s.url)) f.push("URL nicht als Unterordner der Hauptdomain");
    if (!/^[a-z0-9/:.\-]+$/.test(s.url)) f.push("URL mit Großbuchstaben, Umlauten oder Leerzeichen");
    const eigene = Object.entries(s.daten || {}).filter(([k, v]) => v != null && v !== "" && s.belege && s.belege[k]).length;
    const ohneBeleg = (s.zahlen || []).filter((z) => !z.beleg).map((z) => z.wert);
    if (ohneBeleg.length) f.push("Zahl ohne Beleg: " + ohneBeleg.join(", "));
    if (!s.titel || s.titel.length > 60) f.push("Titel fehlt oder > 60 Zeichen");
    if (!s.beschreibung || s.beschreibung.length < 70 || s.beschreibung.length > 160) f.push("Beschreibung nicht 70–160 Zeichen");
    for (const [m, k, name] of [[titel, s.titel, "Titel"], [beschr, s.beschreibung, "Beschreibung"], [kw, (s.keyword || "").toLowerCase(), "Keyword"]]) { if (m.has(k)) f.push(name + " doppelt mit " + m.get(k)); else m.set(k, s.url); }
    if (s.sprache && s.alternativen) for (const [spr, u] of Object.entries(s.alternativen)) { const g = seiten.find((x) => x.url === u); if (!g || !g.alternativen || g.alternativen[s.sprache] !== s.url) f.push("hreflang " + spr + " nicht wechselseitig"); }
    ergebnis.push({ url: s.url, eigeneFelder: eigene, fehler: f });
  }
  // Ähnlichkeit: Text nach Entfernen der eigenen Datenwerte gegen die anderen Seiten
  for (let i = 0; i < seiten.length; i++) {
    let max = 0, mit = null;
    for (let j = 0; j < seiten.length; j++) if (i !== j) { const a = jaccard(ohneEigenes(seiten[i]), ohneEigenes(seiten[j])); if (a > max) { max = a; mit = seiten[j].url; } }
    const e = ergebnis[i]; e.aehnlichkeit = Math.round(max * 100) / 100;
    e.index = e.eigeneFelder >= min && max <= maxAehnlich && !e.fehler.length;
    e.robots = e.index ? "index,follow" : "noindex,follow";
    if (e.eigeneFelder < min) e.fehler.push("nur " + e.eigeneFelder + " belegte eigene Datenfelder (Soll ≥ " + min + ")");
    if (max > maxAehnlich) e.fehler.push("zu ähnlich zu " + mit + " (" + Math.round(max * 100) + " %)");
  }
  // Hub-and-Spoke: jede Seite von ihrem Hub verlinkt, Hub existiert, keine Waisen
  const urls = new Set(seiten.map((s) => s.url)), eingehend = new Map([...urls].map((u) => [u, 0]));
  for (const s of seiten) for (const l of s.links || []) if (eingehend.has(l)) eingehend.set(l, eingehend.get(l) + 1);
  for (const s of seiten) { const e = ergebnis.find((x) => x.url === s.url); if (s.hub && !urls.has(s.hub)) e.fehler.push("Hub fehlt: " + s.hub); if (!eingehend.get(s.url) && !s.istHub) e.fehler.push("verwaist (keine eingehenden Links)"); }
  const sitemap = ergebnis.filter((e) => e.index).map((e) => e.url);
  for (const e of ergebnis) if (e.fehler.length) befunde.push({ url: e.url, fehler: e.fehler });
  const hart = befunde.filter((b) => b.fehler.some((x) => /Zahl ohne Beleg|doppelt|hreflang|Unterordner|Großbuchstaben|Hub fehlt/.test(x)));
  return { freigabe: hart.length === 0, seiten: ergebnis, sitemap, befunde, harteFehler: hart.length, indexiert: sitemap.length, noindex: ergebnis.length - sitemap.length };
}

// ---------- Prüffälle ----------
const H = "teileklar.de";
const S = (id, x = {}) => ({ url: `https://${H}/fahrzeug/${id}/`, titel: "Passende Teile für " + id, beschreibung: "Geprüfte Bremsen, Filter und Reifen für " + id + " mit Einbaulage, Maßen und Lieferzeit aus eigenem Bestand.", keyword: "teile " + id, text: "Für den " + id + " führen wir " + id.length + " geprüfte Teile. Einbaulage vorne " + id + ", Bremsscheibe " + id + " mm.", daten: { hsnTsn: id, teile: 12, bremse: "280 mm", reifen: "205/55 R16" }, belege: { hsnTsn: "KBA", teile: "Bestand", bremse: "TecDoc", reifen: "COC" }, links: [`https://${H}/fahrzeug/`], hub: `https://${H}/fahrzeug/`, ...x });
const HUB = { url: `https://${H}/fahrzeug/`, istHub: true, titel: "Teile nach Fahrzeug", beschreibung: "Alle Fahrzeuge mit geprüften Teilen: nach Hersteller, Modell und HSN/TSN geordnet, mit Einbaudaten und Lieferzeit.", keyword: "teile nach fahrzeug", text: "Übersicht aller Fahrzeuge.", daten: { a: 1, b: 2, c: 3 }, belege: { a: "x", b: "x", c: "x" }, links: [`https://${H}/fahrzeug/vw-golf-7-0603-bgu/`, `https://${H}/fahrzeug/opel-astra-k-0035-bmb/`] };
export const FAELLE = [
  { id: "PS01", art: "Positiv", t: "Zwei echte Fahrzeugseiten mit Hub werden freigegeben", f: () => { const r = pruefen([HUB, S("vw-golf-7-0603-bgu", { text: "Golf VII mit Frontantrieb: Bremsscheibe vorne 312 mm belüftet, Ölfilter Patrone, 9 Teile sofort lieferbar ab Lager Köln." }), S("opel-astra-k-0035-bmb", { text: "Astra K Kombi: Bremsbeläge hinten mit Verschleißkontakt, Luftfilter Flachfilter, Reifendruck 2,5 bar laut Türholm." })], { host: H }); return r.freigabe + "/" + r.indexiert; }, soll: "true/3" },
  { id: "PS02", art: "Negativ", t: "Nur Name getauscht → zu ähnlich, noindex", f: () => { const r = pruefen([HUB, S("vw-golf-7-0603-bgu"), S("opel-astra-k-0035-bmb")], { host: H }); return r.seiten[1].robots; }, soll: "noindex,follow" },
  { id: "PS03", art: "Negativ", t: "Zahl ohne Beleg blockiert die Freigabe (R-08)", f: () => pruefen([HUB, S("vw-golf-7-0603-bgu", { zahlen: [{ wert: "98 % zufriedene Kunden" }] })], { host: H }).freigabe, soll: false },
  { id: "PS04", art: "Negativ", t: "Gleiches Keyword zweimal = Kannibalisierung", f: () => pruefen([HUB, S("a-1", { keyword: "bremse golf" }), S("b-2", { keyword: "bremse golf", titel: "x2" })], { host: H }).befunde.some((b) => b.fehler.some((x) => x.startsWith("Keyword doppelt"))), soll: true },
  { id: "PS05", art: "Negativ", t: "Subdomain statt Unterordner wird abgewiesen", f: () => pruefen([{ ...S("x-1"), url: "https://golf.teileklar.de/x/" }], { host: H }).seiten[0].fehler[0], soll: "URL nicht als Unterordner der Hauptdomain" },
  { id: "PS06", art: "Grenzwert", t: "Zu wenig belegte Daten → noindex statt Veröffentlichung als dünne Seite", f: () => pruefen([HUB, S("vw-golf-7-0603-bgu", { belege: { hsnTsn: "KBA" } })], { host: H }).seiten[1].robots, soll: "noindex,follow" },
  { id: "PS07", art: "Negativ", t: "Seite ohne eingehenden Link ist verwaist", f: () => pruefen([S("x-9", { url: `https://${H}/fahrzeug/x-9/` })], { host: H }).seiten[0].fehler.includes("verwaist (keine eingehenden Links)"), soll: true },
  { id: "PS08", art: "Negativ", t: "Einseitiges hreflang wird gemeldet", f: () => pruefen([HUB, S("vw-golf-7-0603-bgu", { sprache: "de", alternativen: { nl: `https://${H}/nl/voertuig/vw-golf-7/` } }), { ...S("nl-1"), url: `https://${H}/nl/voertuig/vw-golf-7/`, keyword: "onderdelen golf", titel: "Onderdelen Golf", sprache: "nl", alternativen: {} }], { host: H }).freigabe, soll: false },
];
