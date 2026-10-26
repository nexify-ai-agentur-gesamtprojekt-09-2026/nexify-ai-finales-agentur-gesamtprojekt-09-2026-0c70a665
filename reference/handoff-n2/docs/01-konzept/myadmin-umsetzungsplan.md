# myADMIN · Technischer Umsetzungsplan · Stand 27.09.2026

Grundlage: `myadmin-gesamtplan.md`, `docs/03-backend/backend-architektur.md`, `lib/rechenkern.js` (18/18), `lib/tagrouter.js` (12/12). Methodik: Umsetzungsplan-Skill (Arbeitspakete mit Befundbezug, Abnahme, Rollback), KI-Council, Design-Dialog, MCP-Server-Leitfaden.

**Ausführungsmodus: PHASENEMULATION.** In dieser Umgebung laufen keine getrennten Unteragenten. Council und Design-Dialog sind nacheinander in getrennten Durchgängen verfasst, **nicht** von unabhängigen Instanzen. Eine echte Vier-Augen-Prüfung ist das nicht.

---

## 1 · KI-Council (Kurzprotokoll)

**Entscheidung:** In welcher Reihenfolge wird myADMIN mit Agenten, Skills, Tags und Selbstverbesserung technisch gebaut?

**Optionen:** A alles parallel · B Fundament zuerst (Repo, Vorschau, Auth, Buchung), Agenten danach · C Agenten zuerst als Demo, Fundament danach.

| Berater | Kernsatz |
|---|---|
| Kritiker | Option C ist der teuerste Fehler: Agenten ohne Buchungskern und Rechte buchen Geld ohne Beleg. |
| Grundlagen-Denker | Die eigentliche Frage ist nicht „welche Agenten“, sondern „wo liegt der Zustand“. Ohne Director-Zustand in Postgres ist jeder Agent ein Einmalskript. |
| Chancen-Sucher | Der Tag-Router plus MCP-Werkzeuge ist das Produkt, das sich an Werkstätten und API-Kunden weiterverkaufen lässt. |
| Außenseiter | Unklar für Dritte: was „ein paar Cent“ heißt. Ohne Messung ist es ein Werbesatz. |
| Umsetzer | Montag: GitLab-Repo, Rechenkern + Tag-Router + Tests rein, CI grün. Alles andere wartet auf die DNS-Freigabe. |

**Gegenprüfung (anonym, emuliert):** stärkstes Argument Kritiker · größter blinder Fleck Chancen-Sucher (Verkauf vor Betrieb) · von allen übersehen: **Affiliate-Provision braucht dieselbe Idempotenz wie Buchungen.**

**Verdikt: Option B.** Fundament zuerst, Agenten als dünne Arbeiter über MCP-Werkzeuge danach, Selbstverbesserung zuletzt.
- *Positiv:* Geld und Rechte sind vor dem ersten Agenten belegt. *Negativ:* A verteilt Risiko ohne Belege, C erzeugt Demo-Ware.
- *Sicherungsebene:* Autopilot bleibt aus, bis Wächter + Kostenmessung laufen; Rückfall ist Modus „Manuell“.
- *Rollback:* jede Stufe hinter Feature-Flag, abschaltbar in myADMIN.
- *Widerlegung:* Wenn Kosten je Vorgang nach 30 Tagen Messung > 0,50 € im Median liegen, ist das Kontextmodell falsch.
- *Erster Schritt:* AP-01.

---

## 2 · Design-Dialog (Ergebnis)

| Frage | Festlegung |
|---|---|
| Wer nutzt myADMIN? | nur Pascal, Desktop zuerst, Tablet lesbar |
| Kernaufgabe am Morgen | Lage in 10 Sekunden: Gate, Alarme, Kosten gestern, offene Entscheidungen |
| Dichte | hoch, Tabellen statt Karten ab Bereich 3 |
| Farben | CD-Beschluss 26.09.: Grund #242826, Lime #D7FA50, Status-Rot #FF6B57, Gelb #FFC24A |
| Neue Bereiche | Agenten · Skills · Prompts & Kontext · Trigger & Tags · Optimierung · Partner · Affiliates |
| Nicht bauen | Chat-Oberfläche in myADMIN (Chat bleibt im Companion) |

---

## 3 · MCP-Werkzeugschicht (Agenten-Schnittstelle)

Ein MCP-Server `nexifyai-mcp` (TypeScript, Streamable HTTP, zustandslos) ist die **einzige** Tür der Agenten zu Daten und Aktionen. Die Rechte des Agenten ergeben sich aus der Werkzeugliste.

| Werkzeug | readOnly | destructive | idempotent | Rolle |
|---|---|---|---|---|
| `nx_auftrag_lesen` | ja | nein | ja | alle |
| `nx_auftrag_anlegen` | nein | nein | ja (Schlüssel) | director |
| `nx_auftrag_status` | nein | nein | ja | director, umsetzung |
| `nx_preis_berechnen` | ja | nein | ja | angebot, abrechnung |
| `nx_buchen` | nein | nein | ja (Schlüssel) | abrechnung |
| `nx_stornieren` | nein | ja | ja | abrechnung · **Mensch** |
| `nx_wissen_suchen` | ja | nein | ja | alle (LightRAG, Fundstelle) |
| `nx_tag_routen` | ja | nein | ja | director |
| `nx_termin_status` | nein | nein | ja | support-werkstatt |
| `nx_gutschein_einloesen` | nein | nein | ja | support-kunden |
| `nx_nachweis_schreiben` | nein | nein | ja | pruefer |
| `nx_agent_pausieren` | nein | nein | ja | director, waechter |

Eingaben mit Zod, Ausgaben mit `outputSchema`, Fehler mit nächstem Schritt. Kein Werkzeug für DNS, Firewall, Reboot. Prüfung: MCP Inspector + 10 Evaluationsfragen (nur lesend).

---

## 4 · Arbeitspakete

| ID | Typ | Inhalt | abhängig von | Abnahme | Rollback |
|---|---|---|---|---|---|
| AP-01 | IMPLEMENT | GitLab-Repo, `lib/`, `tests/`, Vitest, CI | – | CI grün, 30/30 | Repo archivieren |
| AP-02 | DESIGN | Entscheidungen E1–E5 schriftlich | – | Betriebsbuch-Eintrag mit Datum | – |
| AP-03 | IMPLEMENT | Vorschau-Stufe (**Einzelfreigabe DNS**) | AP-01 | Health 60 s, noindex, Zugangsschutz | DNS-Eintrag entfernen |
| AP-04 | IMPLEMENT | Auth, Rollen, RLS (6 Gruppen) | AP-03 | Negativtest: fremder Mandant 403 | Migration rückwärts |
| AP-05 | IMPLEMENT | Buchungskern, Idempotenz-Tabelle, Storno | AP-04, E1 | 18 Fälle gegen DB + doppelter Webhook | Feature-Flag |
| AP-06 | IMPLEMENT | Director-Zustand (Postgres), Auftragsmodell | AP-04 | Wiederaufnahme nach Abbruch | Feature-Flag |
| AP-07 | IMPLEMENT | `nexifyai-mcp` mit 12 Werkzeugen | AP-05, AP-06 | Inspector + 10 Evaluationen | Server abschalten |
| AP-08 | IMPLEMENT | Agenten-/Skill-Register, Tag-Router serverseitig | AP-07 | 12/12 + Hartsperren-Test | Modus Manuell |
| AP-09 | IMPLEMENT | Kontextschichten S1–S6, Kostenmessung je Vorgang | AP-08 | Kosten sichtbar im Cockpit | Cache aus |
| AP-10 | IMPLEMENT | Portale an 18 Endpunkte | AP-05 | Contract-Tests grün | Flag je Portal |
| AP-11 | DESIGN+IMPLEMENT | Affiliate-Bereich, Provision idempotent | AP-05, Pascal-Regeln | doppelte Zahlung → eine Provision | Flag |
| AP-12 | IMPLEMENT | Wächter + unabhängige Sicherungsebene | AP-03 | absichtlich defekter Dienst wird gemeldet | – |
| AP-13 | IMPLEMENT | Optimierer (nur S3–S5, Fragentest) | AP-09 + 30 Tage Daten | schlechte Variante wird abgelehnt | Optimierer aus |
| AP-14 | VERIFY | Gutachtenkette + Endabnahme | alle | Pascal | – |

**In dieser Sitzung erledigt:** AP-01 vorbereitet (Rechenkern 18/18, Tag-Router 12/12, beide unter Vitest). Alles andere offen.

---

## 5 · Aktualisiert

- `lib/tagrouter.js`, `tests/tagrouter.test.js` neu.
- `myADMIN.dc.html`: Tests-Bereich führt beide Suiten, neuer Bereich „Umsetzung“ mit AP-01–AP-14.
- `README.md`: Stand ergänzt.

## 6 · Nicht verwendet

Netzwerk-Testlabor (nur isolierte Umgebung, erst mit AP-12 für Wächter-Gegentest sinnvoll) · Anschreiben-Generator (kein Bezug) · Speicherimport (kein Export eingefügt).
