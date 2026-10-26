// NeXifyAI Langfuse-Abbildung · macht aus der Spur der Anfrage-Pipeline einen Langfuse-Trace (selbst gehostet, EU)
// Datenschutz: Inhalte nur für Mandant »nexify« (intern) und nur bereinigt; Kundenmandanten nur Metadaten. Nie Geheimnisse.
// Aufnahme über die öffentliche Ingestion-API (/api/public/ingestion) oder OTLP (/api/public/otel) – Adapter im Worker.
import { bereinigen, fingerabdruck } from "./lernschleife.js";

export class LfFehler extends Error { constructor(code, msg) { super(msg); this.name = "LfFehler"; this.code = code; } }
const GEHEIM = /(sk-[A-Za-z0-9_-]{20,}|nx_(live|test)_[A-Za-z0-9]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(passwor[dt]|secret|api[_-]?key)\s*[:=]\s*\S{8,})/gi;
export const maskieren = (t) => bereinigen(String(t ?? "")).replace(GEHEIM, "[GEHEIMNIS]");

// k = { traceId, mandant, nutzer, sitzung, agent, promptName, promptVersion, frage, jetzt, dauerMs, modell }
export function traceAus(ergebnis, k) {
  if (!k.traceId || !k.mandant) throw new LfFehler("E_ID", "traceId und mandant sind Pflicht");
  const intern = k.mandant === "nexify";
  const inhalt = (t) => (intern ? maskieren(t) : undefined);
  const nutzer = intern ? k.nutzer : "u-" + fingerabdruck(k.mandant + "|" + k.nutzer); // Kunden pseudonym
  const t0 = k.jetzt - (k.dauerMs || 0);
  const trace = { id: k.traceId, name: k.agent || "anfrage", timestamp: new Date(t0).toISOString(), userId: nutzer, sessionId: k.sitzung, tags: [k.mandant, ergebnis.art, ...(ergebnis.modus ? ["modus:" + ergebnis.modus] : [])], metadata: { mandant: k.mandant, prompt: k.promptName + "@" + k.promptVersion, belege: (ergebnis.belege || []).length, strittig: (ergebnis.strittig || []).length }, input: inhalt(k.frage), output: inhalt(ergebnis.text) };
  const schritte = (ergebnis.spur || []).map((s, i) => ({ id: k.traceId + "-" + i, traceId: k.traceId, type: s[0] === "beleg" || s[0] === "gedaechtnis" || s[0] === "abruf" ? "SPAN" : "EVENT", name: s[0], metadata: { werte: s.slice(1) }, level: s[0] === "beleg" && s[1] === false ? "WARNING" : "DEFAULT" }));
  const u = ergebnis.usage || {};
  const generation = ergebnis.art === "keine_info" ? null : { id: k.traceId + "-gen", traceId: k.traceId, type: "GENERATION", name: "modell", model: k.modell, promptName: k.promptName, promptVersion: k.promptVersion, usageDetails: { input: u.input_tokens || 0, output: u.output_tokens || 0, cache_read: u.cache_read_input_tokens || 0, cache_write: u.cache_creation_input_tokens || 0 }, costDetails: ergebnis.kostenCent != null ? { total: ergebnis.kostenCent / 100 } : undefined, input: undefined, output: inhalt(ergebnis.text) };
  return { trace, beobachtungen: generation ? [...schritte, generation] : schritte };
}

// Bewertung aus dem Workspace (▲/▼) oder aus der Belegprüfung → Langfuse-Score und zugleich Lernsignal
export function bewertung(traceId, quelle, wert, grund) {
  if (![-1, 1, 0].includes(wert)) throw new LfFehler("E_WERT", "Wert -1, 0 oder 1");
  const score = { traceId, name: quelle === "nutzer" ? "nutzer-feedback" : quelle, value: wert, dataType: "NUMERIC", comment: grund ? maskieren(grund) : undefined };
  const lernsignal = quelle === "nutzer" && wert !== 0 ? { id: "lf-" + traceId, art: "bewertung", bereich: "workspace", wert, muster: grund || "ohne Grund" } : null;
  return { score, lernsignal };
}

// ---------- Prüffälle ----------
const E = { art: "antwort", text: "Einlösen im Partnerportal [F1]. Rückfragen an max@firma.de", belege: ["F1"], spur: [["regel.vor", "erlaubt"], ["abruf", "frage", 2, 1], ["beleg", true, ""]], usage: { input_tokens: 900, output_tokens: 40, cache_read_input_tokens: 800 }, kostenCent: 1 };
const K = (x = {}) => ({ traceId: "t1", mandant: "nexify", nutzer: "pascal", sitzung: "c1", agent: "nexi", promptName: "s1-master-orchestrator", promptVersion: "1.0.0", frage: "Wie löse ich ein? api_key = 'abcd1234efgh'", jetzt: 1790000000000, dauerMs: 1200, modell: "nexify-auto", ...x });
export const FAELLE = [
  { id: "LF01", art: "Negativ", t: "E-Mail im Output wird maskiert", f: () => traceAus(E, K()).trace.output.includes("[EMAIL]"), soll: true },
  { id: "LF02", art: "Negativ", t: "Geheimnis in der Frage wird maskiert", f: () => traceAus(E, K()).trace.input.includes("[GEHEIMNIS]"), soll: true },
  { id: "LF03", art: "Negativ", t: "Kundenmandant: keine Inhalte, Nutzer pseudonym", f: () => { const t = traceAus(E, K({ mandant: "kunde-a", nutzer: "erika" })).trace; return (t.input === undefined) + "/" + (t.output === undefined) + "/" + t.userId.startsWith("u-"); }, soll: "true/true/true" },
  { id: "LF04", art: "Positiv", t: "Cache-Tokens und Kosten landen in der Generation", f: () => { const g = traceAus(E, K()).beobachtungen.find((b) => b.type === "GENERATION"); return g.usageDetails.cache_read + "/" + g.costDetails.total; }, soll: "800/0.01" },
  { id: "LF05", art: "Positiv", t: "Prompt-Version verknüpft (Langfuse Prompt-Management)", f: () => traceAus(E, K()).trace.metadata.prompt, soll: "s1-master-orchestrator@1.0.0" },
  { id: "LF06", art: "Positiv", t: "Gescheiterte Belegprüfung wird als WARNING markiert", f: () => traceAus({ ...E, spur: [["beleg", false, "erfundene Fundstelle"]] }, K()).beobachtungen[0].level, soll: "WARNING" },
  { id: "LF07", art: "Grenzwert", t: "Ohne Modellaufruf keine Generation", f: () => traceAus({ art: "keine_info", text: "x", spur: [["abruf", "frage", 0, 0]] }, K()).beobachtungen.some((b) => b.type === "GENERATION"), soll: false },
  { id: "LF08", art: "Positiv", t: "Daumen runter = Score und Lernsignal", f: () => { const r = bewertung("t1", "nutzer", -1, "Quelle fehlt"); return r.score.name + "/" + r.lernsignal.art; }, soll: "nutzer-feedback/bewertung" },
  { id: "LF09", art: "Negativ", t: "Ohne Mandant kein Trace", f: () => traceAus(E, K({ mandant: undefined })), fehler: "E_ID" },
];
