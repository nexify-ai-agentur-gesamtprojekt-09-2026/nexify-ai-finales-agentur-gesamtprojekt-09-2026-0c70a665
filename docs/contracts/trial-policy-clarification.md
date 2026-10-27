# Trial-Policy und bekannte Zielzuordnungen

Dokumentpräzisierung zum geprüften Entscheidungsdelta c09204c. Keine Änderung
an apps/selfservice/domain.py, Funding, Preisen, Auth oder externen Systemen.

## Was bereits feststeht

Quelle docs/operating-model/NEXIFY-GESAMTSYSTEM.md:
- Zeile44: D02 = Produkt und Finanzen, verantwortlich für Umfang, Kosten-/Preisfassung und Funding.
- Zeile48: D06 = Entwicklung, KI und Integrationen, verantwortlich für technische Verträge und isolierte Umsetzung.
- Zeile72: 24 Stunden kostenlose Suite-Nutzung, kostenpflichtiger LLM-Verbrauch nicht enthalten.
- Zeile74: verifizierte E-Mail, aktivierter eigener Workspace und ausdrücklich authentifizierter Start; einmaliges serverseitiges Zeitfenster.
- Zeile78: „Die eigene Suite-Zeit darf genutzt werden, bevor eine Fundingoption gewählt wurde; ohne solche Option wird keine kostenpflichtige LLM-Anfrage gestellt.“
- Zeile82: kein kostenloses durch NeXify finanziertes LLM-Guthaben.

config/selfservice-policy.json Zeilen24–35 bestätigt Dauer, genau diese drei
Startbedingungen, Atomizität und Idempotenz. Zeilen8–9 und43–45 trennen Suitezeit
und fehlendes Gratis-Modellguthaben. apps/selfservice/domain.py Zeile360 verlangt
dagegen _funding vor Trialstart. Die neue lokale Charakterisierung belegt diese
Abweichung; sie legitimiert sie nicht.

## Tatsächliche Entscheidung statt erneuter Grundsatzfreigabe

Für diesen Punkt besteht **kein neuer fachlicher Nutzerentscheidungsbedarf**.
Die Frage „Soll Suitezeit vor Funding beginnen?“ ist bereits beantwortet.
Nächster Schritt ist eine quellentreue technische Korrektur mit Negativtests
gegen unfinanzierte Modellnutzung, nicht eine neue Preis-/Leistungszusage.
Eine zusätzliche Nutzerentscheidung wäre nur bei einer ausdrücklich gewünschten
Änderung dieser bestehenden Policy nötig. Eine solche Änderung ist nicht beantragt.

Kurze operative Frage an die Auftragssteuerung:
„Wird als nächster lokaler Teilauftrag die bestätigte start_trial-Abweichung
korrigiert, bei unverändert strikter Fundingprüfung vor jeder Modellnutzung?“
Das ist eine Priorisierungs-/Umsetzungsfrage; keine fehlende fachliche Freigabe.
Dieses Paket verändert das Verhalten noch nicht. Reale Provider-/Releasegates
bleiben unabhängig davon offen.

## MASTER-02: bekannte Evidenz, keine aktuelle Neulesung

Quelle evidence/one-app-2026-10-27/deployment-parent-report.json; Parentbericht
empfangen2026-10-27T05:10:15.483610Z. Genauer Beobachtungszeitpunkt ist dort null;
kein heutiger erneuter Providerabruf und keine unabhängige Reproduktion hier.

| Bekannte Zuordnung | Letzter übergebener Stand |
| --- | --- |
| nexifyai.de | READY, Preview target=null, factory/agency-separated-2026-10-26, Commit66866298b3eb4054371b0e2a1e1f618f1bc8ca73, dpl_3KcSgJUsdNbsJjiWvR74Xf95SdFA |
| Standard-Production-Alias desselben Projekts | READY, main, Commit07833fb3f8166a3f8534f52bb1c1843c49f40919, dpl_XXZBR56U9Nwx9Nj6MDR5GER5v4ZG |
| Beobachteter Build | Vite8.3.5, Node22.x; pnpm install --frozen-lockfile --ignore-scripts; generate-public-data.mjs, tsc --noEmit, vite build; dist/index.html plus Assets |
| Geschwister aufa19cd503 | site/site-gjp7/web-2kby READY; site-k23m/web ERROR mit fehlendem dist |

Unbekannt bleiben die aktuell konfigurierten rootDirectory/buildCommand/
outputDirectory/productionBranch-Felder und die verbindliche gewünschte finale
Domain-/Runtimezuordnung. Beobachteter Buildlog ist kein vollständiger
Projectsettings-Beleg. Historische topology-Werte ersetzen diese Felder nicht.
Die vorhandenen tatsächlichen Zuordnungen sind bekannt; sie beweisen weder
gewünschten Zielzustand noch Abnahme des neu integrierten Kandidaten.
