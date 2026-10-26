# Sprint-Contract · API/Auth aus den Prototypen

Ziel: Den nächsten API-/Auth-Schnitt aus sämtlichen getrackten HTML-Referenzen der beiden NeXify-Repositories und deren Seitenbestimmungen ableiten und maschinell auf Quellenabdeckung und Zugriffsgrenzen prüfen.

Feature: F-006, WIP=1. Nutzeranweisung vom 26.10.2026: API/Auth-Vertrag aus Repository-Prototypen ableiten; ElevenLabs via Composio für die Hero-Videos berücksichtigen.

Rollen: zentrale Steuerung/Validator; ergänzende Umsetzung Seitenkatalog; Umsetzung Vertrag; unabhängige Gegenprüfung; vertiefte Medien-/Quellenprüfung. Arbeitszeit dieses Pakets begrenzt auf einen überprüfbaren lokalen Vertragsschnitt, keine unbegrenzte Agentenlaufzusage. Keine kostenpflichtigen Provideraktionen. Bei fehlender Toolanbindung keine erfundenen Aufrufe oder unbegrenzten Retries.

Erfolg: vollständiges, hashgebundenes HTML-Inventar; Seitenbestimmung und beobachtete Aktionen von abgeleiteten API-Entscheidungen getrennt; OpenAPI mit Auth/Tenant/Scopes und dokumentierten Annahmen; typisierter Hero-Medienauftrag; unabhängige Gegenprüfung; negative Validatorproben. Alle Operationen bleiben explizit Zielvertrag, bis Runtimeimplementierung nachgewiesen ist.

Layer 1: JSON-/Python-Syntax und `make check`. Layer 2: Vertragsprüfung und gezielte Negativtests sowie `make test`. Layer 3: `make e2e`, Architekturprüfung und Quellen-/Manifestintegrität. Featurepromotion ausschließlich über `make verify-feature F=F-006`.

Grenzen: Keine Preis-/Rechtsänderung, kein Providerupload, keine Sprachkopie, kein Livegang, kein Main-Merge. Die neue Nutzerentscheidung beseitigt die Rückfrage nach einer zusätzlichen Suite-Quelle für die Vertragsableitung. Sie belegt keine bestehende gemeinsame Auth-Runtime. Provideranbindung und konkrete Medienzuordnung werden separat als beobachtet, gemeldet oder offen geführt.

Abbruchbedingung: fehlgeschlagene Prüfungen zuerst korrigieren; bei Kontextgrenze aktuellen Arbeitsstand und nächste Schritte sichern.
