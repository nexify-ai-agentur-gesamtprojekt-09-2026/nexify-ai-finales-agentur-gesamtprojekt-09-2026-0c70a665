// NeXifyAI Versand · Zustellbarkeit: Nachricht bauen (multipart, Kopfzeilen), Sperrliste aus Bounces/Beschwerden, Wiederholung, Warmup, DNS-Soll
// Reine Funktionen. Versand selbst: Worker-Queue »versand« → Resend-API. Inhaltliche Prüfung vorher: lib/posteingang.js ausgehendPruefen().
export class VersandFehler extends Error { constructor(code, msg) { super(msg); this.name = "VersandFehler"; this.code = code; } }
const ABSENDER = "NeXify AI <mail@nexifyai.cloud>";

const htmlZuText = (h) => String(h).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();

// n = { an, betreff, html, text?, art: "transaktion"|"werbung", einwilligung?, abmeldeUrl?, idempotenz, vorlage, vorlageVersion }
export function nachricht(n, sperrliste = new Set()) {
  const an = String(n.an || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(an)) throw new VersandFehler("E_ADRESSE", "Empfänger ungültig");
  if (sperrliste.has(an)) throw new VersandFehler("E_GESPERRT", "Empfänger auf der Sperrliste (harter Bounce oder Beschwerde)");
  if (!n.idempotenz) throw new VersandFehler("E_IDEM", "Idempotenz-Schlüssel fehlt");
  if (!n.vorlage || !/^\d+\.\d+\.\d+$/.test(n.vorlageVersion || "")) throw new VersandFehler("E_VORLAGE", "Vorlage mit Version x.y.z Pflicht");
  if (!n.html) throw new VersandFehler("E_INHALT", "HTML fehlt");
  const bilder = (n.html.match(/<img\b/gi) || []).length, textLaenge = htmlZuText(n.html).length;
  if (bilder > 0 && textLaenge < 200 * bilder) throw new VersandFehler("E_BILDLASTIG", "Zu wenig Text je Bild (mind. 200 Zeichen je Bild)");
  const kopf = { "X-Entity-Ref-ID": n.idempotenz, "X-NX-Vorlage": n.vorlage + "@" + n.vorlageVersion };
  if (n.art === "werbung") {
    if (!n.einwilligung || !n.einwilligung.doppelOptIn || !n.einwilligung.zeit) throw new VersandFehler("E_EINWILLIGUNG", "Werbung nur mit bestätigter Einwilligung (Double-Opt-in, Zeitpunkt)");
    if (!/^https:\/\//.test(n.abmeldeUrl || "")) throw new VersandFehler("E_ABMELDEN", "Abmelde-Link (https) Pflicht");
    kopf["List-Unsubscribe"] = "<" + n.abmeldeUrl + ">, <mailto:abmelden@nexifyai.cloud?subject=abmelden>";
    kopf["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"; // RFC 8058
    if (!n.html.includes(n.abmeldeUrl)) throw new VersandFehler("E_ABMELDEN", "Abmelde-Link muss auch sichtbar im Text stehen");
  } else if (n.art !== "transaktion") throw new VersandFehler("E_ART", "art: transaktion | werbung");
  return { from: ABSENDER, reply_to: "mail@nexifyai.cloud", to: [an], subject: n.betreff, html: n.html, text: n.text || htmlZuText(n.html), headers: kopf, tags: [{ name: "vorlage", value: n.vorlage }, { name: "art", value: n.art }] };
}

// Ereignisse aus dem Resend-Webhook (Signatur prüft das Gateway) → Sperrliste und Lernsignale
export function ereignis(sperr, e) {
  const neu = new Set(sperr), adr = String((e.data && (e.data.to?.[0] || e.data.email)) || "").toLowerCase();
  let folge = "keine";
  if (e.type === "email.bounced" && (e.data.bounce?.type || "hard") !== "soft") { neu.add(adr); folge = "gesperrt (harter Bounce)"; }
  else if (e.type === "email.complained") { neu.add(adr); folge = "gesperrt (Beschwerde)"; }
  else if (e.type === "email.bounced") folge = "weich – nach 3 weichen Bounces in 30 Tagen sperren";
  return { sperrliste: neu, folge, adresse: adr };
}

// Wiederholung: vorübergehende Fehler mit Backoff, dauerhafte nie
export function wiederholen(fehler, versuch, opt = {}) {
  const max = opt.max ?? 5, basis = opt.basisMs ?? 60e3;
  const s = fehler.status;
  if ([400, 401, 403, 404, 422].includes(s)) return { nochmal: false, grund: "dauerhaft (" + s + ")" };
  if (versuch >= max) return { nochmal: false, grund: "höchstens " + max + " Versuche – Karte im Postfach" };
  const warten = s === 429 && fehler.retryAfterS ? fehler.retryAfterS * 1000 : Math.min(basis * 2 ** (versuch - 1), 3600e3);
  return { nochmal: true, wartenMs: warten };
}

// Warmup für neue Absender-Domain/Subdomain: Tageslimit steigt nur bei guten Werten
export function warmup(tag, kennzahlen = {}) {
  const plan = [50, 100, 200, 400, 800, 1500, 3000, 5000];
  const b = kennzahlen.bounceQuote ?? 0, k = kennzahlen.beschwerdeQuote ?? 0;
  if (b > 0.05 || k > 0.003) return { limit: plan[Math.max(0, Math.min(tag, plan.length) - 2)] ?? plan[0], halt: true, grund: "Bounce > 5 % oder Beschwerden > 0,3 % – Stufe zurück" };
  return { limit: plan[Math.min(tag, plan.length) - 1] ?? plan[plan.length - 1], halt: false };
}

// DNS-Soll prüfen (Werte aus Cloudflare-API), ohne selbst etwas zu ändern (DNS = Hartsperre R-02)
export function dnsPruefen(txt) {
  const bef = [], alle = (n) => (txt[n] || []).map(String);
  const spf = alle("nexifyai.cloud").filter((t) => t.startsWith("v=spf1"));
  if (spf.length !== 1) bef.push("SPF: genau ein v=spf1-Eintrag auf nexifyai.cloud nötig (gefunden " + spf.length + ")");
  else if (/\+all/.test(spf[0])) bef.push("SPF: +all erlaubt jedem das Senden");
  else if ((spf[0].match(/include:|a\b|mx\b|exists:|redirect=/g) || []).length > 10) bef.push("SPF: mehr als 10 DNS-Abfragen");
  const dmarc = alle("_dmarc.nexifyai.cloud").find((t) => t.startsWith("v=DMARC1"));
  if (!dmarc) bef.push("DMARC fehlt");
  else { if (!/rua=mailto:/.test(dmarc)) bef.push("DMARC ohne Berichtsadresse (rua)"); if (/p=none/.test(dmarc)) bef.push("DMARC p=none: nur Beobachtung – nach 4 Wochen sauberer Berichte auf quarantine"); }
  if (!Object.keys(txt).some((k) => /_domainkey\./.test(k) && alle(k).some((t) => /p=/.test(t)))) bef.push("DKIM: kein öffentlicher Schlüssel gefunden");
  return { ok: bef.filter((b) => !b.includes("nur Beobachtung")).length === 0, befunde: bef };
}

// ---------- Prüffälle ----------
const N = (x = {}) => ({ an: "Max.Weber@Beispiel.de", betreff: "Ihre Anfrage", html: "<p>Guten Tag, wir haben Ihre Anfrage erhalten und melden uns innerhalb eines Werktags mit einem Terminvorschlag.</p>", art: "transaktion", idempotenz: "m2-bestaetigung", vorlage: "eingangsbestaetigung", vorlageVersion: "1.0.0", ...x });
export const FAELLE = [
  { id: "VS01", art: "Positiv", t: "Klartext wird aus HTML erzeugt (multipart)", f: () => nachricht(N()).text.startsWith("Guten Tag"), soll: true },
  { id: "VS02", art: "Negativ", t: "Gesperrte Adresse wird nicht beschickt", f: () => nachricht(N(), new Set(["max.weber@beispiel.de"])), fehler: "E_GESPERRT" },
  { id: "VS03", art: "Negativ", t: "Werbung ohne Double-Opt-in verweigert", f: () => nachricht(N({ art: "werbung", abmeldeUrl: "https://nexifyai.cloud/abmelden?t=1" })), fehler: "E_EINWILLIGUNG" },
  { id: "VS04", art: "Positiv", t: "Werbung mit One-Click-Abmeldung (RFC 8058)", f: () => nachricht(N({ art: "werbung", einwilligung: { doppelOptIn: true, zeit: "2026-09-01T10:00Z" }, abmeldeUrl: "https://nexifyai.cloud/abmelden?t=1", html: N().html + '<p><a href="https://nexifyai.cloud/abmelden?t=1">Abmelden</a></p>' })).headers["List-Unsubscribe-Post"], soll: "List-Unsubscribe=One-Click" },
  { id: "VS05", art: "Negativ", t: "Nur-Bild-Mail wird abgewiesen", f: () => nachricht(N({ html: '<img src="x.png"><p>Hi</p>' })), fehler: "E_BILDLASTIG" },
  { id: "VS06", art: "Negativ", t: "Ohne Vorlagenversion kein Versand", f: () => nachricht(N({ vorlageVersion: "neu" })), fehler: "E_VORLAGE" },
  { id: "VS07", art: "Positiv", t: "Harter Bounce sperrt die Adresse", f: () => ereignis(new Set(), { type: "email.bounced", data: { to: ["a@b.de"], bounce: { type: "hard" } } }).sperrliste.has("a@b.de"), soll: true },
  { id: "VS08", art: "Positiv", t: "Beschwerde sperrt die Adresse", f: () => ereignis(new Set(), { type: "email.complained", data: { to: ["a@b.de"] } }).folge, soll: "gesperrt (Beschwerde)" },
  { id: "VS09", art: "Negativ", t: "422 wird nie wiederholt", f: () => wiederholen({ status: 422 }, 1).nochmal, soll: false },
  { id: "VS10", art: "Grenzwert", t: "429 wartet Retry-After", f: () => wiederholen({ status: 429, retryAfterS: 30 }, 2).wartenMs, soll: 30000 },
  { id: "VS11", art: "Positiv", t: "Warmup Tag 3 = 200/Tag", f: () => warmup(3).limit, soll: 200 },
  { id: "VS12", art: "Grenzwert", t: "Beschwerden über 0,3 % → Stufe zurück", f: () => { const w = warmup(4, { beschwerdeQuote: 0.004 }); return w.limit + "/" + w.halt; }, soll: "200/true" },
  { id: "VS13", art: "Negativ", t: "Zwei SPF-Einträge werden gemeldet", f: () => dnsPruefen({ "nexifyai.cloud": ["v=spf1 include:a ~all", "v=spf1 include:b ~all"] }).befunde[0].slice(0, 4), soll: "SPF:" },
  { id: "VS14", art: "Positiv", t: "Vollständiges DNS mit p=quarantine besteht", f: () => dnsPruefen({ "nexifyai.cloud": ["v=spf1 include:_spf.mail.hostinger.com ~all"], "_dmarc.nexifyai.cloud": ["v=DMARC1; p=quarantine; rua=mailto:dmarc@nexifyai.cloud"], "resend._domainkey.nexifyai.cloud": ["p=MIGf..."] }).ok, soll: true },
];
