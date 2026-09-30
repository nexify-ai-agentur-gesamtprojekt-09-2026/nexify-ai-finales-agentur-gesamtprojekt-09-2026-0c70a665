// NeXifyAI Arbeitsweisen · erkennt je Anfrage den Modus und liefert einen festen, cachefähigen Prompt-Baustein (Schicht S3)
// Sechs Modi nach Skill verhaltensmodi-ki-arbeitsweisen. Ausliefern ersetzt nie das Freigabe-Gate (R-02/R-03).
export const MODI = {
  brainstorm: { titel: "Brainstorm", baustein: "Arbeitsweise Brainstorm: erst eine klärende Rückfrage, dann mindestens drei Optionen mit Vor- und Nachteilen; noch kein Code; am Ende fragen, welche Richtung passt." },
  umsetzen: { titel: "Umsetzen", baustein: "Arbeitsweise Umsetzen: knapp und direkt; erst Kontext lesen, dann vollständige Lösung mit Fehlerbehandlung; danach höchstens zwei Sätze Zusammenfassung; keine Tutorials." },
  fehlersuche: { titel: "Fehlersuche", baustein: "Arbeitsweise Fehlersuche: nach Fehlermeldung und Reproduktion fragen, wenn sie fehlen; Hypothese → Test → Beleg; Ausgabe in vier Zeilen Symptom · Ursache · Fix · Vorbeugung; nach drei erfolglosen Ansätzen eskalieren." },
  review: { titel: "Review", baustein: "Arbeitsweise Review: Befunde nach Schwere (kritisch, hoch, mittel, niedrig), je Befund das Warum und ein Beispiel; zum Schluss, was gut gelöst ist." },
  vermitteln: { titel: "Vermitteln", baustein: "Arbeitsweise Vermitteln: vom Einfachen zum Komplexen, eine Analogie, ein Beispiel, eine kleine Übung; Verständnis mit einer Frage prüfen." },
  ausliefern: { titel: "Ausliefern", baustein: "Arbeitsweise Ausliefern: Stabilität vor Funktionen; Checkliste Codequalität · Sicherheit · Leistung · Rückweg; keine Ausführung von Reboot, Live-DNS oder Firewall; Freigabe nur über das Freigabe-Gate." },
};
const MUSTER = [
  ["fehlersuche", /\b(funktioniert nicht|geht nicht|fehler|bug|kaputt|stürzt|absturz|error|exception|500|404|hängt)\b/i],
  ["ausliefern", /\b(bereitstell|release|live (gehen|schalten)|produktiv|deploy|go-live|ausroll)/i],
  ["review", /\b(prüf|review|audit|gegenles|bewerte|begutacht|check)/i],
  ["vermitteln", /\b(erklär|wie funktioniert|verstehe? nicht|was ist|was bedeutet|zeig mir wie|lerne?n)\b/i],
  ["brainstorm", /\b(ideen?|optionen|was wäre wenn|alternativen|brainstorm|wie könnten wir|ansätze)\b/i],
  ["umsetzen", /\b(baue?|erstell|ergänz|implementier|schreib|füg\w* hinzu|änder|setz\w* um|mach)/i],
];
// Vorrang: ausdrücklich gewählter Modus → #tag → Muster (Reihenfolge oben) → umsetzen
export function erkennen(anfrage, gewaehlt) {
  if (gewaehlt && MODI[gewaehlt]) return { modus: gewaehlt, quelle: "gewaehlt" };
  const t = String(anfrage || "");
  const tag = t.match(/#(brainstorm|umsetzen|fehlersuche|review|vermitteln|ausliefern)\b/i); if (tag) return { modus: tag[1].toLowerCase(), quelle: "tag" };
  const ausdruecklich = t.match(/\bim (brainstorm|umsetzen|fehlersuche|review|vermitteln|ausliefern)[- ]modus\b/i); if (ausdruecklich) return { modus: ausdruecklich[1].toLowerCase(), quelle: "ausdruecklich" };
  for (const [m, re] of MUSTER) if (re.test(t)) return { modus: m, quelle: "muster" };
  return { modus: "umsetzen", quelle: "standard" };
}
export const baustein = (m) => (MODI[m] || MODI.umsetzen).baustein;

// ---------- Prüffälle ----------
export const FAELLE = [
  { id: "MO01", art: "Positiv", t: "Fehlermeldung → Fehlersuche", f: () => erkennen("Das Terminformular funktioniert nicht, Fehler 500").modus, soll: "fehlersuche" },
  { id: "MO02", art: "Positiv", t: "Ideen → Brainstorm", f: () => erkennen("Welche Ideen hast du für die Startseite?").modus, soll: "brainstorm" },
  { id: "MO03", art: "Positiv", t: "Release → Ausliefern", f: () => erkennen("Wir wollen morgen live gehen").modus, soll: "ausliefern" },
  { id: "MO04", art: "Positiv", t: "Erklären → Vermitteln", f: () => erkennen("Erklär mir, wie die Rückfallkette funktioniert").modus, soll: "vermitteln" },
  { id: "MO05", art: "Grenzwert", t: "Fehler hat Vorrang vor Umsetzen", f: () => erkennen("Bau das Formular um, es stürzt ab").modus, soll: "fehlersuche" },
  { id: "MO06", art: "Positiv", t: "#tag schlägt Muster", f: () => erkennen("#review Bau das Formular um").modus, soll: "review" },
  { id: "MO07", art: "Positiv", t: "Gewählter Modus schlägt alles", f: () => erkennen("#review Fehler", "brainstorm").modus, soll: "brainstorm" },
  { id: "MO08", art: "Grenzwert", t: "Nichts erkannt → Umsetzen", f: () => erkennen("Angebot Weber").quelle, soll: "standard" },
  { id: "MO09", art: "Negativ", t: "Ausliefern-Baustein verbietet Hartsperren", f: () => /keine Ausführung von Reboot, Live-DNS oder Firewall/.test(baustein("ausliefern")), soll: true },
  { id: "MO10", art: "Positiv", t: "Bausteine sind fest (cachefähig: keine Datums- oder Platzhalter)", f: () => Object.values(MODI).every((m) => !/\{|\d{4}-\d{2}-\d{2}|heute/i.test(m.baustein)), soll: true },
];
