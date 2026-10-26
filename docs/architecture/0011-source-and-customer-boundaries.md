# Projektgrenzen und gezielte Wiederverwendung

Status: verbindliche Nutzerkorrektur vom 26.10.2026. Maschinenlesbare Zuordnung: `config/source-boundaries.json`.

Affilinet Portal Aachen ist ein **gesondertes, pausiertes Kundenprojekt**. Es gehört weder zur NeXify-Agentur noch zu TEILEKLAR. Sein Backend, Frontend, Datenmodell, Branding und seine CI sind keine Agenturmodule. Seine Tests sind keine Nachweise für Agenturfunktionen. Eine gemeinsame Anmeldung, Datenmigration, Zahlungskette oder Produktabhängigkeit wird nicht daraus abgeleitet.

## Korrigierte Quellführung

Der irrtümliche Import unter `apps/portal` wurde aus dem aktuellen Agenturzweig entfernt. Auch die importierte Kundenprojekthistorie ist kein Vorfahr des korrigierten Zweigs. Dafür wurde ein neuer Entwicklungszweig vor dem Import angelegt; alle acht noch nicht abgeschlossenen Agenturdateien wurden vorab gesichert und unverändert mitgenommen. Keine Historie wurde umgeschrieben, kein Force-Push ausgeführt und kein Ausgangsrepository gelöscht.

Der frühere Importzweig bleibt ausschließlich lokal als gesicherter verworfener Arbeitsstand erhalten. Er darf nicht als Agenturzweig veröffentlicht oder zurückgemergt werden. Ein verifiziertes vollständiges Bundle und die gesicherten Agenturänderungen liegen unter `/workspace/.onboarding/customer-separation/`. Das eigenständige Kundenrepository bleibt unverändert und pausiert.

N1 ist die kanonische Agenturquelle. N2 unter `reference/handoff-n2` bleibt gekennzeichnete historische Design-/Dokumentationsreferenz. Seine Ablage aktiviert keine Anwendung, alte Pipeline oder Betriebsanweisung. Alle weiteren Repositories werden ebenfalls zuerst zugeordnet; gleicher Eigentümer, ähnliche Namen oder vergleichbare Funktionen beweisen keine fachliche Zusammengehörigkeit.

## Fertiges gezielt nutzen

Für eine brauchbare Komponente werden Quelle, Commit und konkrete Dateien, Zweck, Zielpfade, Nutzungs-/Lizenzgrundlage, Anpassungen und relevante Tests festgehalten. Beispiele sind allgemeine UI-Bausteine, Transaktions- oder Idempotenzmuster und Testhilfen. Kundendaten, Secrets, Mandanten, Produktpreise, Rollen, Branding oder projektspezifische Konfiguration werden nicht übernommen.

Die bestehende Freigabe zur sinnvollen Codewiederverwendung gilt. Es braucht keine zusätzliche pauschale Rückfrage für jede reversible technische Übernahme. Eine vollständige Anwendung oder deren Historie wird dadurch nicht zum Agenturprodukt. In diesem Korrekturschnitt wurde keine Kundenkomponente neu übernommen; `adopted_customer_components` ist daher leer.

## Prüfgrenze

`python3 tools/check_source_boundaries.py` prüft die Quellenklassifikation, das Fehlen des Kundenbaums und der bekannten Kunden-Commitköpfe in der aktuellen Historie sowie die Unabhängigkeit des Agenturvertrags. Bestehende Agentur- und TEILEKLAR-Portalseiten bleiben davon unberührt: gleiche Begriffe sind keine Affilinet-Integration.
