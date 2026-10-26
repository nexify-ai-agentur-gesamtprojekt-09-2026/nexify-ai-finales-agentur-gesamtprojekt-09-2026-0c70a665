# Go-Live-Abschlusstest · Befundregister · Umsetzungsplan

**NEXIFYAI-QA-2026-09 (Nummer vor Vergabe in der Dokumentnummern-Registry prüfen) · Fassung 0.9 · 27.09.2026 · Status: ENTWURF**
Gegenstand: Gestaltungs-Prototypen dieses Projekts (Agentur-Seite `NeXifyAI Cloud v10`, `TEILEKLAR Shop`, Portale, Anmeldung, Werkzeuge, Rechtstexte in v10) sowie Abrechnungskonzept und Rechenkern.
Verfahren: Skills `go-live-abschlusstest`, `technisches-gutachten-de` (Befundlogik), `gutachten-umsetzungsplan-de` (Dispositionen, Arbeitspakete, Gates).

---

## 0. Ergebnis vorab

**Go-Live-Freigabe: NEIN.** Die Flächen sind gestalterisch weit fortgeschritten, aber es sind **Prototypen im Design-Werkzeug, keine Produktivumgebung**. Die Punkte 2 (Infrastruktur), 3 (Last/Security), 6 (Rollback) und 7 (Hypercare) der Go-Live-Prüfliste sind hier **nicht prüfbar** und müssen auf dem echten System (nexifyai.cloud, VPS Frankfurt) erfolgen. Zusätzlich bestehen **5 P0-Befunde**, die unabhängig von der Technik eine Veröffentlichung verhindern.

## 1. Auftrag, Rolle, Grenzen

| Punkt | Festlegung |
|---|---|
| Art | internes Prüfprotokoll mit Befundregister, kein Sachverständigengutachten |
| Prüfer | KI-gestützte Prüfung im Design-Projekt; **keine** Bestellung, Akkreditierung oder rechtliche Prüfung. Fachliche Freigabe durch Pascal Courbois erforderlich |
| Stichtag | 27.09.2026 |
| Beweisbasis | Dateien dieses Projekts, Laufzeitprüfungen (Überlappung, Kontrast, Konsole), automatische Prüfer-Durchläufe, AgentMemory-Einträge 24.–26.09.2026 |
| Nicht geprüft | Live-Server, DNS/TLS, Backups, Last, Penetration, echte Zahlungen, E-Mail-Zustellung, Rechtstexte durch Fachanwalt |

Aussageklassen: **T** Tatsache (im Projekt belegt) · **F** Fremdangabe (AgentMemory) · **B** fachliche Bewertung · **R** Rechtsfrage (nur abgegrenzt).

## 2. Befundregister

| ID | Bereich | Befund | Klasse | Prio | Disposition |
|---|---|---|---|---|---|
| **GL-01** | Recht/UWG | Kundenstimmen auf der Agentur-Seite ohne dokumentierte Freigabe und ohne Nachweis | T/R | **P0** | BEHEBEN |
| **GL-02** | Recht/KI-VO | Interne Agentenregel „nie sagen, dass KI“ widerspricht Art. 50 KI-VO und der eigenen KI-Hinweise-Seite | F/R | **P0** | BEHEBEN |
| **GL-03** | Recht/Vertrag | Vorgabe „Prepaid, keine Leistung ohne Guthaben“ widerspricht AGB § 4 (Tagesrechnung, Zahlung am Folgetag) | T/F | **P0** | BLOCKIERT (Entscheidung) |
| **GL-04** | Finanzen | Margenformel uneinheitlich: Vorgabe 27.09. EK × 1,45; Skript/Business-Portal EK ÷ 0,55 (E1) | T/F | **P0** | BLOCKIERT (Entscheidung) |
| **GL-05** | Recht/DSGVO | Datenschutzerklärung nennt Prüf-/KI-Dienstleister, deren Einsatz und Verträge nicht belegt sind; Cookie-Einstellungen im Fuß ohne Dialog | T/R | **P0** | WEITER_UNTERSUCHEN |
| GL-06 | Inhalt/UWG | Beispielwerte „4 Min., vorher 26 Std.“ und Tagesberichte sind gekennzeichnet, aber nicht gemessen | T | P1 | BEHEBEN (echte Werte) |
| GL-07 | Inhalt/UWG | „Deutsch und Niederländisch“ wird angeboten; NL-Fassung der Website fehlt | T | P1 | BEHEBEN oder Aussage auf Beratung begrenzen |
| GL-08 | Seiten | Erstgespräch buchen, Angebot anfragen, Guthaben, Abnahme, Tickets fehlen als Fläche (Seitenplan A10, A11, D3, D5, D8) | T | P1 | BEHEBEN |
| GL-09 | Technik | Shop: zwei leere Konsolenfehler beim Laden, Ursache ungeklärt | T | P1 | WEITER_UNTERSUCHEN |
| GL-10 | Portale | Portale zeigen Beispieldaten; keine Anbindung an `/v1/…` | T | P1 | BEHEBEN (Anbindung) |
| GL-11 | Marke | Wortmarken-PNG mit altem X; Druckstücke mit altem Lime `#C8F04B` statt CD-2026 | T | P2 | BEHEBEN |
| GL-12 | Barrierefreiheit | Norm-Prüfung bestanden (Kontraste ≥ 4,86 : 1, Fokus, Zielgrößen, reduzierte Bewegung, 0 Überlappungen in v10). Portale und Shop nur automatisch normiert, nicht einzeln angesehen | T/B | P2 | VERIFY |
| GL-13 | SEO/Betrieb | `robots.txt`, `sitemap.xml`, `hreflang`, `security.txt`, 404/500/Wartungsseiten fehlen | T | P1 | BEHEBEN |
| GL-14 | Abrechnung | Rechenkern `tools/nexify-preis.js`: 19/19 Tests grün, kein Code-Review in GitLab | T | P2 | VERIFY |
| GL-15 | Bestand | Zwischenversionen v3–v9 und Arbeitsdateien liegen im Projekt; Verwechslungsgefahr | T | P3 | AKZEPTIEREN bis Übergabe, dann archivieren |
| GL-16 | Wissen | LightRAG nicht abfragbar (NX-GR-019); AgentMemory zeitweise 504 | F | P2 | MONITORING |

Kein Befund wurde als „kein Mangel“ ohne Prüfung eingestuft. Nicht prüfbare Punkte stehen in Abschnitt 4.

## 3. Arbeitspakete

| AP | Typ | Befunde | Zielzustand | Verantwortlich | Abnahme |
|---|---|---|---|---|---|
| AP-01 | SAFE | GL-01 | Stimmen ohne Freigabe entfernt oder durch freigegebene ersetzt | NeXify | Freigabebeleg je Zitat |
| AP-02 | DESIGN | GL-02 | AGENTS.md für Kundenkanäle angepasst: KI wird gekennzeichnet | Pascal | geänderte Regel + Stichprobe 5 Gespräche |
| AP-03 | DESIGN | GL-03, GL-04 | eine Zahlungs- und Margenregel; AGB § 4, Skript, Portal, Rechenkern einheitlich | Pascal → NeXify | 3 Beispielrechnungen identisch in allen Systemen |
| AP-04 | INVESTIGATE | GL-05 | Liste tatsächlich genutzter Dienste mit AVV; Datenschutz angepasst; Cookie-Dialog | NeXify + Rechtsberatung | Abgleich Dienstliste ↔ Datenschutz ↔ Netzwerkmitschnitt |
| AP-05 | IMPLEMENT | GL-06, GL-07 | gemessene Kennzahl aus einem Projekt oder Karte entfernt; NL-Aussage korrekt | NeXify | Messprotokoll |
| AP-06 | IMPLEMENT | GL-08, GL-10 | fehlende Flächen gebaut und an Core-API angebunden | NeXify | E2E je Nutzerweg inkl. Fehlerfälle |
| AP-07 | INVESTIGATE | GL-09 | Ursache der Konsolenfehler bekannt und behoben | NeXify | 0 Fehler in 3 Browsern |
| AP-08 | IMPLEMENT | GL-13 | technische SEO- und Systemseiten live | NeXify | Crawler-Lauf ohne 404 |
| AP-09 | IMPLEMENT | GL-11 | Marke in Bild- und Druckdateien nach CD-Beschluss 26.09. | NeXify | Sichtprüfung PDF erste Seite |
| AP-10 | VERIFY | GL-12, GL-14 | Portale/Shop einzeln geprüft; Rechenkern-Review im MR | NeXify | Prüfprotokoll, MR-Freigabe |
| AP-11 | VERIFY | Abschnitt 4 | Go-Live-Prüfliste auf Produktivsystem vollständig | NeXify + Pascal | unterschriebenes Protokoll |
| AP-12 | HANDOVER | alle | Übergabe, Hypercare 7 Tage, Learning-Eintrag | NeXify | Hypercare-Bericht |

Reihenfolge: AP-01 → AP-02/03/04 (parallel, Entscheidungen) → AP-05/07/08/09 → AP-06 → AP-10 → AP-11 → AP-12.

## 4. Go-Live-Prüfliste · Stand

| Block | Stand | Beleg |
|---|---|---|
| 1 Fachliche Abnahme (UAT) | offen | kein Stakeholder-Sign-off |
| 2 Technik/Infrastruktur (TLS, DNS, Prod-Credentials, Backup + Restore, Monitoring) | **nicht prüfbar hier** | – |
| 3 Last, Security, Performance | teilweise: Barrierefreiheit v10 geprüft; Last/Security nicht prüfbar | Design-Norm.md |
| 4 Content/SEO/Tracking | offen (GL-06, GL-13) | – |
| 5 Recht/Compliance | offen (GL-01 bis GL-05) | – |
| 6 Rollback | **nicht prüfbar hier** | – |
| 7 Hypercare | nicht begonnen | – |
| 8 Rollen/Zugänge | Anmeldeflächen gestaltet, Logins nicht echt testbar | – |
| 9 Dokumentation | teilweise: CI-Schema, Design-Norm, Seitenplan, Abrechnungskonzept, dieses Protokoll | docs/ |

## 5. Gates

| Gate | Bedingung | Stand |
|---|---|---|
| G0 Auftrag | Umfang und Rollen bestätigt | erfüllt durch dieses Dokument, Bestätigung Pascal offen |
| G1 Baseline | Stand v10 + Shop gesichert | erfüllt (Versionen im Projekt) |
| G2 Design | E1, Zahlungsregel, KI-Regel entschieden | **offen** |
| G3 Ready | Produktivsystem bereit | offen |
| G4 Verified | AP-10/11 bestanden | offen |
| G5 Accepted | Sign-off, Hypercare, Learning | offen |

## 6. Entscheidungen für Pascal

1. **E1** Margenformel (GL-04). 2. Zahlungsregel und AGB § 4 (GL-03). 3. KI-Kennzeichnung in AGENTS.md (GL-02). 4. Freigegebene Kundenstimmen liefern oder Abschnitt streichen (GL-01). 5. Rechtsberatung für Datenschutz, AGB, KI-VO beauftragen (GL-05, Studienkolleg).

*Ein vollständig ausgefülltes Register belegt, dass nichts unbehandelt bleibt — nicht, dass etwas erledigt ist.*
