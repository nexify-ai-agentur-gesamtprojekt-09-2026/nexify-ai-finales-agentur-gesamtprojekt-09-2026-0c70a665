// Posteingang-Kern · mail@nexifyai.cloud ist die einzige Adresse.
// Deterministisch: Spam-Bewertung, Kategorie, Zuordnung (Kunde/Fall/Projekt/Person), Priorität, Antwortmodus.
// KI (9router) darf nur VORSCHLAGEN; dieser Kern entscheidet, was automatisch passieren darf.

export const KATEGORIEN = ["anfrage", "auftrag", "support", "rechnung", "werkstatt", "affiliate", "bewerbung", "recht", "system", "newsletter", "spam", "sonstiges"];
// Fester Kennzeichnungssatz für KI-erstellte Mails (Art. 50 KI-VO). Wortlaut = Vorschlag, Entscheidung E-A bei Pascal.
export const KI_HINWEIS = "Diese Nachricht wurde mit KI erstellt.";
const AUTH_FAIL = (a) => !!a && (a.spf === "fail" || a.dkim === "fail" || a.dmarc === "fail");

const SPAM_WORTE = [/viagra|casino|crypto ?(bonus|airdrop)|seo ?(ranking|backlinks) guaranteed|you have won|lottery|bitcoin wallet/i, /click here to (claim|verify)|urgent(ly)? verify your account|account (suspended|locked).{0,20}click/i];
const PHISHING_DOMAINS = [/-secure-login\./i, /\.(zip|mov)$/i, /paypa1|micr0soft|amaz0n/i];
const REGELN = [
  ["recht", /(abmahnung|datenschutz(anfrage)?|auskunft nach art\.? ?15|dsgvo|widerruf|anwalt|kündigung)/i, 1],
  ["rechnung", /(rechnung|zahlung|mahnung|gutschrift|invoice|factuur|überweisung|lastschrift)/i, 2],
  ["auftrag", /(auftrag|angebot (angenommen|bestätigt)|annahme|beauftrag)/i, 2],
  ["werkstatt", /(gutschein|partnerportal|partner-?werkstatt|nachbarschaftskunde|termin (bestätigen|verschieben|absagen))/i, 3],
  ["affiliate", /(affiliate|provision|partnerlink|empfehlungslink)/i, 3],
  ["support", /(fehler|funktioniert nicht|bug|problem|störung|ausfall|hilfe|support|login geht nicht)/i, 2],
  ["anfrage", /(anfrage|interesse|was kostet|preis|kosten|angebot|erstgespräch|beratung|website|automatisier|ki-agent|chatbot)/i, 2.5],
  ["bewerbung", /(bewerbung|lebenslauf|stelle|praktikum)/i, 4],
  ["newsletter", /(newsletter|unsubscribe|abmelden|list-unsubscribe)/i, 5],
  ["system", /(no-?reply|mailer-daemon|postmaster|resend|bounce|delivery status|dmarc|cloudflare|gitlab|supabase)/i, 5]
];

export function domainVon(adresse) {
  const m = String(adresse || "").toLowerCase().match(/@([a-z0-9.-]+)>?\s*$/);
  return m ? m[1] : "";
}

export function spamBewertung(mail, sperrliste = []) {
  const von = String(mail.from || "").toLowerCase();
  const text = (mail.subject || "") + "\n" + (mail.text || "");
  const d = domainVon(von);
  const gruende = [];
  let score = 0;
  if (sperrliste.some((s) => { s = String(s || "").toLowerCase().trim(); if (!s) return false; return s.includes("@") ? von.replace(/^.*</, "").replace(/>.*$/, "").trim() === s : d === s || d.endsWith("." + s); })) { score += 100; gruende.push("gesperrt"); }
  if (mail.auth && mail.auth.spf === "fail") { score += 30; gruende.push("SPF fehlgeschlagen"); }
  if (mail.auth && mail.auth.dkim === "fail") { score += 30; gruende.push("DKIM fehlgeschlagen"); }
  if (mail.auth && mail.auth.dmarc === "fail") { score += 40; gruende.push("DMARC fehlgeschlagen"); }
  if (SPAM_WORTE.some((r) => r.test(text))) { score += 50; gruende.push("Spam-Muster"); }
  if (PHISHING_DOMAINS.some((r) => r.test(d)) || (mail.attachments || []).some((a) => PHISHING_DOMAINS[1].test(a))) { score += 60; gruende.push("Phishing-Merkmal"); }
  const links = (text.match(/https?:\/\//g) || []).length;
  if (links > 8) { score += 20; gruende.push("viele Links"); }
  if (!mail.subject || !String(mail.subject).trim()) { score += 10; gruende.push("kein Betreff"); }
  return { score: Math.min(score, 100), spam: score >= 60, gruende };
}

// Absender zählt nur für System-Mails; sonst bestimmen Betreff und Text die Kategorie.
// Newsletter: List-Unsubscribe-Kopf oder Abmeldelink im letzten Absatz – außer der Betreff selbst ist ein Rechtsanliegen.
export function kategorie(mail) {
  const betreff = String(mail.subject || ""), text = String(mail.text || "");
  const kopf = mail.headers || {};
  if (REGELN.find(([k]) => k === "system")[1].test(String(mail.from || ""))) return "system"; // nur Absender: »Problem mit Supabase« von Kunden bleibt Support
  const absaetze = text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const fuss = absaetze.length > 1 ? absaetze[absaetze.length - 1] : "";
  const listenMail = !!(kopf["list-unsubscribe"] || kopf["List-Unsubscribe"]) || /(abmelden|unsubscribe)/i.test(fuss);
  const rechtR = REGELN.find(([k]) => k === "recht")[1];
  if (listenMail && !rechtR.test(betreff)) return "newsletter";
  const t = betreff + "\n" + (listenMail ? absaetze.slice(0, -1).join("\n") : text);
  const treffer = REGELN.filter(([k, r]) => k !== "system" && r.test(t)).sort((a, b) => a[2] - b[2]);
  return treffer.length ? treffer[0][0] : "sonstiges";
}

// Zuordnung: Reihenfolge = Belastbarkeit. Nummer im Betreff > bekannte Adresse > Domain > nichts.
// Eine Nummer zählt nur »hoch«, wenn der Absender zum Kunden des Falls gehört (Person oder Kundendomain).
export function zuordnen(mail, crm) {
  const t = (mail.subject || "") + " " + (mail.text || "");
  const von = String(mail.from || "").toLowerCase().replace(/^.*</, "").replace(/>.*$/, "").trim();
  const d = domainVon(von);
  const nr = t.match(/\b(NX|AN|AU|RE|FA)-\d{4}-\d{3,5}\b/i);
  const erg = { kunde: null, person: null, fall: null, projekt: null, sicherheit: "keine", grund: "", absenderPasst: null };
  if (nr) {
    const f = (crm.faelle || []).find((x) => x.nr.toLowerCase() === nr[0].toLowerCase());
    if (f) {
      const k = (crm.kunden || []).find((x) => x.id === f.kunde) || {};
      const passt = (crm.personen || []).some((x) => x.kunde === f.kunde && x.email.toLowerCase() === von) || (k.domains || []).includes(d);
      Object.assign(erg, { fall: f.nr, projekt: f.projekt || null, kunde: f.kunde, sicherheit: passt ? "hoch" : "niedrig", grund: "Nummer im Betreff", absenderPasst: passt });
    }
  }
  const p = (crm.personen || []).find((x) => x.email.toLowerCase() === von);
  if (p) { erg.person = p.id; if (!erg.kunde) Object.assign(erg, { kunde: p.kunde, sicherheit: "hoch", grund: "bekannte Adresse" }); }
  if (!erg.kunde && d && !/^(gmail|googlemail|web|gmx|outlook|hotmail|icloud|yahoo|t-online|live)\./.test(d)) {
    const k = (crm.kunden || []).find((x) => (x.domains || []).includes(d));
    if (k) Object.assign(erg, { kunde: k.id, sicherheit: "mittel", grund: "Domain " + d });
  }
  if (!erg.fall && erg.kunde) {
    const offen = (crm.faelle || []).filter((x) => x.kunde === erg.kunde && x.status !== "geschlossen");
    if (offen.length === 1) { erg.fall = offen[0].nr; erg.projekt = offen[0].projekt || null; }
  }
  return erg;
}

const PRIO = { recht: "hoch", support: "hoch", rechnung: "mittel", auftrag: "hoch", anfrage: "mittel", werkstatt: "mittel", affiliate: "niedrig", bewerbung: "niedrig", system: "niedrig", newsletter: "niedrig", sonstiges: "mittel", spam: "niedrig" };
const FRIST_H = { hoch: 4, mittel: 24, niedrig: 72 };

// Antwortmodus: auto nur für eng begrenzte, risikofreie Fälle. Alles mit Geld, Recht, Zusage → Entwurf zur Freigabe.
// Keine Automatik an Absender mit fehlgeschlagener SPF/DKIM/DMARC-Prüfung (Rückstreuung).
export function antwortModus(kat, zu, spam, auth) {
  if (spam) return "keine";
  if (kat === "system" || kat === "newsletter") return "keine";
  if (kat === "recht" || kat === "rechnung" || kat === "auftrag") return "entwurf";
  if (AUTH_FAIL(auth)) return "entwurf";
  if (kat === "anfrage" && !zu.kunde) return "auto-bestaetigung";
  if (kat === "werkstatt" && zu.sicherheit === "hoch") return "auto-faq";
  return "entwurf";
}

export function verarbeiten(mail, crm = {}, opt = {}) {
  if (!mail || typeof mail !== "object") throw new Error("POSTEINGANG_UNGUELTIG: Mail fehlt");
  if (!mail.id) throw new Error("POSTEINGANG_UNGUELTIG: id fehlt");
  const an = String(mail.to || "mail@nexifyai.cloud").toLowerCase();
  const zielOk = an.includes("mail@nexifyai.cloud");
  const sp = spamBewertung(mail, opt.sperrliste || []);
  const kat = sp.spam ? "spam" : kategorie(mail);
  const zu = sp.spam ? { kunde: null, person: null, fall: null, projekt: null, sicherheit: "keine", grund: "" } : zuordnen(mail, crm);
  const prio = PRIO[kat];
  let eingang = new Date(mail.date || opt.jetzt || Date.now());
  const datumOk = !isNaN(eingang.getTime());
  if (!datumOk) eingang = new Date(opt.jetzt || Date.now());
  const sicher = zu.kunde && zu.sicherheit !== "niedrig";
  return {
    id: mail.id,
    kategorie: kat,
    spam: sp,
    zuordnung: zu,
    prioritaet: prio,
    faelligBis: new Date(eingang.getTime() + FRIST_H[prio] * 3600e3).toISOString(),
    antwort: antwortModus(kat, zu, sp.spam, mail.auth),
    aktion: sp.score >= 100 ? "blockieren" : sp.spam ? "quarantaene" : sicher ? "zuordnen" : "pruefen",
    hinweise: [...(zielOk ? [] : ["Empfänger ist nicht mail@nexifyai.cloud"]), ...(zu.sicherheit === "mittel" ? ["Zuordnung nur über Domain – bestätigen"] : []), ...(zu.sicherheit === "niedrig" ? ["Fallnummer von fremdem Absender – prüfen"] : []), ...(datumOk ? [] : ["Datum unlesbar – Eingangszeit verwendet"])]
  };
}

// Resend-Zustellqualität je Zeitraum
export function zustellQualitaet(events) {
  const z = { gesendet: 0, zugestellt: 0, bounce: 0, beschwerde: 0, verzoegert: 0 };
  for (const e of events || []) {
    if (e.type === "email.sent") z.gesendet++;
    else if (e.type === "email.delivered") z.zugestellt++;
    else if (e.type === "email.bounced") z.bounce++;
    else if (e.type === "email.complained") z.beschwerde++;
    else if (e.type === "email.delivery_delayed") z.verzoegert++;
  }
  const basis = Math.max(z.gesendet, z.zugestellt + z.bounce, 1);
  const bounceRate = z.bounce / basis, beschwerdeRate = z.beschwerde / basis;
  // Schwellen: Hausregel NeXify (nicht quellenbelegt), vor Livebetrieb gegen aktuelle Absenderrichtlinien der großen Postfachanbieter prüfen.
  const ampel = bounceRate > 0.04 || beschwerdeRate > 0.001 ? "rot" : bounceRate > 0.02 || beschwerdeRate > 0.0005 ? "gelb" : "gruen";
  return { ...z, zustellRate: z.zugestellt / basis, bounceRate, beschwerdeRate, ampel };
}

// Jede ausgehende Mail: Reply-To und Absender müssen auf die eine Adresse zeigen.
export function ausgehendPruefen(msg) {
  const f = [];
  if (!/mail@nexifyai\.cloud/i.test(msg.from || "")) f.push("Absender ist nicht mail@nexifyai.cloud");
  if (!/mail@nexifyai\.cloud/i.test(msg.reply_to || msg.replyTo || "")) f.push("Reply-To fehlt oder falsch");
  if (msg.ki && !String(msg.text || msg.html || "").includes(KI_HINWEIS)) f.push("KI-Kennzeichnung fehlt (KI-VO Art. 50)");
  return { ok: f.length === 0, fehler: f };
}
