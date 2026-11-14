# ADR-0007 · Cognee als zentraler Wissensspeicher im Selbstbetrieb hinter eigenem Adapter

**Status:** vorgeschlagen (Host offen, EV-02) · **Datum:** 14.11.2026 · **Umkehrbarkeit:** hoch für die Wahl des Dienstes (der Adapter bleibt), mittel für den Bestand (Neuaufbau aus den Quellen)

Entscheidung der Projektleitung vom 14.11.2026, Bestätigung Inhaber offen (`DECISIONS.md` D-017).
Ersetzt im widersprechenden Umfang die Vorschläge ADR-0004 (Cognee nur episodisch) und ADR-0006
(Vektorspeicher); beide bleiben als Abwägung erhalten.

## 1 · Kontext

| Faktor | Befund |
|---|---|
| Vorgabe | Wissen wird zentral geführt, auch aus Gesprächen (Auftrag des Inhabers, 14.11.2026) |
| Vorhanden | LightRAG, AgentMemory und ein Cognee-Container als Altbestand; Betriebsort und Sicherungsstand nicht belegt. Kein gemeinsamer Mandantenfilter über die Dienste |
| Risiko | Ein Server des Altbestands läuft aus; der Bestand ist ungesichert (`docs/konzept/2026-11-14/00-gesamtkonzept.md`, R-09) |
| Pflichten | Mandantentrennung, Datenminimierung, Speicherbegrenzung (DSGVO); Modellbindung nach `config/llm-policy.json`; keine eigenmächtigen Abos oder Anbieterkonten |
| Eigenschaft von Cognee | Trenngrenze ist der Datensatz, nicht der Tenant; die Trennung greift nur bei eingeschalteter Zugriffskontrolle. Standardwerte zeigen auf einen fremden Modellanbieter, sobald ein Schlüssel gesetzt ist (`docs/konzept/2026-11-14/04-agenten-wissen.md`, Abschnitt 3.1) |
| Frühere Abwägung | ADR-0004 hat „ein Speicher für alles“ verworfen. Der Entscheidungskern daraus (Mandant Pflicht, Quellrang, Löschfrist) bleibt gültig |

## 2 · Optionen

| | A · Cognee selbst betrieben, hinter eigenem Adapter | B · Cognee als Cloud-Dienst | C · bisherige Dienste nebeneinander weiterführen |
|---|---|---|---|
| Pro | Datenstandort wählbar; Modell und Einbettung frei einstellbar; kein neuer Vertrag für den Dienst; Regeln an einer prüfbaren Stelle | kein eigener Betrieb | kein Aufbau |
| Contra | eigener Betrieb mit Sicherung und Updates; Kapazität des Hosts nicht gemessen | Datenstandort nicht dokumentiert; Modell des Dienstes nicht policy-konform; neues Abo und neuer Auftragsverarbeiter | drei Dienste ohne gemeinsamen Mandantenfilter; widerspricht der Vorgabe |

## 3 · Entscheidung

**A**, mit diesen Bedingungen:

1. **Adapter zuerst.** Ein schmaler Wissensport (`merken`, `abrufen`, `vergessen`, `exportieren`, `zustand`) steht vor Cognee. Aufrufstellen sprechen den Port an, nie Cognee direkt. Eine Implementierung im Arbeitsspeicher dient Tests und Entwicklung.
2. **Mandant als Pflichtfeld.** Ohne serverseitig geprüften Mandanten kein Aufruf. Ein Mandant aus dem Anfragetext wird ignoriert. Ein Datensatz je Mandant und Wissensklasse; die Zugriffskontrolle bleibt eingeschaltet, und ein Startprüfer verweigert den Betrieb, wenn sie aus ist.
3. **Modellaufrufe nur über den eigenen Router** und nur mit dem Modell nach `config/llm-policy.json`. Der Dienst startet nicht, wenn Anbieter oder Endpunkt vom Soll abweichen.
4. **Einbettungen lokal.** Kein fremder Einbettungsdienst.
5. **Quelle der Wahrheit bleibt die Datenbank der Anwendung.** Der Bestand in Cognee ist abgeleitet und aus den Quellen neu aufbaubar. Cognee ist nie der einzige Ort eines Gesprächs.
6. **Altbestand wird gesichert und archiviert, nicht gelöscht.** Reihenfolge: Inventar (nur lesen) → Sicherung mit Wiederherstellungsprobe → Zuordnung → neuer Stand getrennt vom alten Container → Schattenbetrieb → Probelauf mit dem eigenen Mandanten → Umstellung je Aufrufstelle → Altsystem schreibgeschützt.
7. **Treffer sind Daten, keine Anweisungen.** Sie kommen mit Herkunft zurück und ändern weder Rechte noch Werkzeugwahl.

**Bewusst nicht jetzt:** Wahl des Hosts; Wahl des Vektor- und Graphspeichers (gehört in den Probebetrieb); Aufnahme von Chat-Inhalten (braucht Rechtsgrundlage, Einwilligungsstand und Löschfristen, EV-09); Übernahme der Aufgaben und Leases des Altbestands (gehören in das führende Aufgabenregister, nicht in den Wissensspeicher).

## 4 · Folgen

- Sofort baubar ohne Host: Wissensport mit Vertragstests (Paket W1-16 in `docs/konzept/2026-11-14/00-gesamtkonzept.md`).
- Erst nach EV-02: Inventar, Sicherung, Probebetrieb, `CogneeAdapter`, Schattenbetrieb, Umstellung.
- Abnahmetests: Mandant A liest und schreibt B nicht; Zugriffskontrolle aus → kein Start; fremder Modell- oder Einbettungsendpunkt → kein Start; Schreiben, Rücklesen, Inhaltsvergleich; gleicher Eintrag zweimal → ein Eintrag; Löschen einer Person mit leerer Gegenabfrage und Protokoll; Ausfall von Cognee → Antwort ohne Gedächtnis, kein Abbruch; Einlesen stoppt an der Kostengrenze.
- Rückweg: Der Port bleibt, die Implementierung wird je Aufrufstelle zurückgeschaltet; das Altsystem bleibt bis zum Abschluss lesbar.
- Offen: Host und Kapazität (EV-02); Ressourcenbedarf für den erwarteten Umfang; Verhalten der strukturierten Ausgabe mit dem Policy-Modell; Löschkette einschließlich Rohdateien und Sicherungen; Auftragsverarbeitung und Verarbeitungsort für Router und Modellanbieter (EV-07).
- Ehrlich: Nichts davon ist gebaut oder gemessen. Dieser Eintrag beschreibt eine Richtung, keinen Betriebszustand.
