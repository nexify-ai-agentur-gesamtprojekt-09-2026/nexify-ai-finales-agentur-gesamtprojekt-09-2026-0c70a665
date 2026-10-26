# Technischer Umsetzungsplan · myADMIN + Backends · 27.09.2026

Grundlage: `docs/01-konzept/myadmin-gesamtplan.md`, `docs/03-backend/backend-architektur.md`, `lib/rechenkern.js` (18/18), Freigabe-Nachweis, Code-Review. Skills: ideen-zu-design-dialog, ki-council, workflow-automatisierung, tdd-orchestrierung, freigabe-gate-live-betrieb.

## 1 · Council-Verdikt: In welcher Reihenfolge wird gebaut?

**Einschränkung:** In dieser Umgebung lassen sich keine unabhängigen Agenten starten. Die fünf Blickwinkel und die Gegenprüfung sind von einer Instanz nacheinander formuliert (Phasenemulation). Anonymität und Unabhängigkeit sind damit **nicht gegeben**. Vor Umsetzung echten Lauf auf eigener Infrastruktur nachholen.

```
ENTSCHEIDUNG: Womit beginnt die Umsetzung von myADMIN + Backends?
OPTIONEN: A) Agenten/Director zuerst  B) Fundament zuerst (Repo, Vorschau, Auth, Buchung)  C) Portale zuerst (sichtbarer Nutzen)
KONTEXT: 0/18 Endpunkte, Rechenkern 18/18 grün, Vorschau-Stufe fehlt (UNBESTÄTIGT seit 08.09.), E1–E5 offen, Livegang gesperrt
EINSATZ: falsche Buchungen, doppelte Abbuchungen, Datenschutzverstoß, Wochen Nacharbeit
RANDBEDINGUNGEN: EU-Hosting, Endabnahme Pascal, Hartsperren, OSS-Vorrang
```

| Berater | Kernsatz |
|---|---|
| Kritiker | Agenten auf ungesicherter Buchung sind ein Geldautomat ohne Kasse — A ist das Risiko. |
| Grundlagen-Denker | Die eigentliche Frage ist nicht die Reihenfolge, sondern: Wo liegt der eine Zustand? Erst Datenmodell, dann alles. |
| Chancen-Sucher | C bringt sofort zahlende Werkstätten — Gutscheine und Termine sind der schnellste Umsatz. |
| Außenseiter | Ich sehe drei Portale, einen Shop und ein Admin, aber keinen laufenden Server. Was ist „fertig“? |
| Umsetzer | Montag: GitLab-Repo, Rechenkern rein, CI grün. Dienstag: Vorschau-Stufe. Ohne die ist alles andere Theater. |

**Gegenprüfung:** stärkstes Argument Umsetzer + Grundlagen-Denker (gleiche Richtung, konkret). Größter blinder Fleck: Chancen-Sucher (ignoriert fehlende Auth). Von allen übersehen: offene Entscheidung E1 blockiert die Abrechnung unabhängig von der Reihenfolge.

**Verdikt: B — Fundament zuerst**, Portale danach in der Reihenfolge Umsatz (Partner → Nachbarschaft → Kunde), Agenten zuletzt.
- **Warum nicht A:** Agenten brauchen Budget-Stopp und Buchung, die es noch nicht gibt.
- **Warum nicht C zuerst:** Portale ohne Auth/RLS wären ein Datenschutzvorfall.
- **Sicherungsebene:** bis Buchungskern belegt ist, laufen Rechnungen weiter manuell (bestehender Weg), Abschaltkriterium: 30 Tage fehlerfreies Parallel-Journal.
- **Rollback:** jede Phase hinter Feature-Schalter; Rücknahme = Schalter aus + Datenbank-Migration rückwärts (getestet).
- **Widerlegung:** Wenn Partner-Portal ohne Backend nachweislich Umsatz bringt (z. B. Gutscheinbestellung per Mail > 20/Monat), Portale vorziehen.
- **Erster Schritt:** GitLab-Repository `nexifyai/platform` anlegen, `lib/` und `tests/` übernehmen, CI mit Vitest.

## 2 · Phasen (je Phase: Tests zuerst, Freigabe-Nachweis am Ende)

| Phase | Inhalt | Abnahme (E3) | Abhängig von | Dauer (Schätzung) |
|---|---|---|---|---|
| P0 | Entscheidungen E1–E5, Einzelfreigabe Vorschau | schriftlich im Betriebsbuch | Pascal | – |
| P1 | Repo, CI, Rechenkern, Lint, Secrets-Scan | CI grün, Mutationsscore ≥ 80 % Rechenkern | – | 1 Tag |
| P2 | Vorschau-Stufe (Hostname, noindex, Zugangsschutz, Health) | 60 s Health mit Cache-Buster | P0 | 1 Tag |
| P3 | Datenmodell + Auth + RLS + Rollen (6 Gruppen) | Negativtest: fremder Mandant → 403 | P1 | 3 Tage |
| P4 | Buchungskern, Idempotenz-Tabelle, Journal, Storno | doppelter Webhook → 1 Buchung; Rollback-Probe | P3, E1 | 3 Tage |
| P5 | Partnerportal-Endpunkte (6) | Contract-Tests + E2E Vorschau | P3 | 3 Tage |
| P6 | Nachbarschaftsportal-Endpunkte (5), Gutschein-Einlösung | 90-Tage-Grenze, Doppeleinlösung 409 | P5 | 3 Tage |
| P7 | Kundenportal + API-Abrechnung (7) | Budget 100 % → Stopp ohne Abbruch laufender Anfrage | P4 | 4 Tage |
| P8 | Affiliate-Bereich (neu) | Zuordnung, Storno-Frist | P4, Regeln offen | 3 Tage |
| P9 | Director, Agenten-, Skill-, Tag-Register | `#stopp` pausiert alle Agenten eines Vorgangs | P4 | 5 Tage |
| P10 | Kontextschichten S1–S6, Kostenmessung | Cache-Quote und € je Vorgang im Cockpit | P9 | 3 Tage |
| P11 | Wächter, Vorfall, Sicherung + Wiederherstellungstest | Wächter schlägt bei künstlichem Ausfall an | P2 | 2 Tage |
| P12 | Optimierer | schlechtere Variante wird abgelehnt | P10 + 30 Tage Daten | 3 Tage |

Schätzungen sind Annahmen ohne Messbasis.

## 3 · Datenmodell (Kern)

`mandant` · `benutzer(rolle)` · `kunde` · `werkstatt` · `nachbarschaftskunde` · `affiliate` · `angebot` · `auftrag(status)` · `termin(status)` · `gutschein(code, ablauf, eingeloest_am)` · `kostenstelle(budget)` · `api_schluessel(hash)` · `buchung(idempotenz_schluessel UNIQUE, betrag, storno_von)` · `rechnung` · `agent(rolle, budget, modus)` · `skill(version, status)` · `tag_regel(tag, ziel)` · `ereignis(korrelations_id)`.
Jede Tabelle mit `mandant_id` und RLS-Policy; Geldbeträge als `numeric(12,2)`.

## 4 · Was in diesem Durchgang aktualisiert wurde

- `myADMIN.dc.html`: neue Bereiche **Agenten**, **Skills & Tags**, **Umsetzung** (Phasenplan mit Status).
- `README.md`, `docs/04-betrieb/status-3p-2026-09-27.md`: Verweis auf diesen Plan.

## 5 · Nicht autonom ausführbar

Repo anlegen, Vorschau-Stufe, Server, DNS, Zahlungsanbieter — außerhalb dieser Umgebung bzw. Hartsperre. Autonom fortgesetzt werden nur Entwürfe, Dokumente und der Rechenkern.
