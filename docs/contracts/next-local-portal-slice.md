# Nächster lokaler Portal-Teilauftrag · PORTAL-LOCAL-READ-01

Status: begrenzt lokal implementiert; lokale Prüfung läuft, keine Liveabnahme. Owner: bestehender
Webwriter; Auth-/Membershippolicy beim zuständigen Systemowner. Kein zweiter Writer.
Die bestehenden zehn privaten Routen bleiben geschützt. Dieser Schnitt überträgt keine Credentials.

Ziel: ein schmaler interner Auftragsstatus unter dem bestehenden Ziel
`/intern/workspace`, gleiche Shell/Tokens/DE-NL, keine Ersatzplattform für die noch
nicht nachgewiesen importierten originalen AionUi-Module. Vorhandene gemeinsame
Remediationdatenbank und LocalControl verwenden, keine zweite Queue/Datenbank.

Geprüfte Nähte: `config/site-map.json`, `config/one-web-app.json`,
`apps/web/proxy.ts`, `apps/web/auth/policy.ts`, `tools/app_backend.py`,
`tools/local_control.py`, `tools/remediation_queue.py` und vorhandene Tests.
Aktuell liefern fehlende Authkonfiguration503,fehlende Anmeldung401 und verifizierter
Subject ohne Membership403. LocalAppBackend ist eine lokale Python-Grenze, kein
HTTP-/Provideradapter. Rollen operator/reviewer sind nicht stillschweigend mit
team/admin gleichzusetzen. Browser darf Session/Tenant/Rolle nicht konstruieren.

Konkreter erster lokaler Schnitt:
1. Bestehende Statusprojektion nebenwirkungsfrei extrahieren: `status()` ruft
   derzeit `sync_gaps()` auf und darf NICHT ungeprüft als GET-Readadapter dienen.
   Reconciliation bleibt gesonderte autorisierte Mutation im bestehenden Kern.
2. Schmale versionierte Statusantwort: Requestreferenz,fachlicher Zustand,
   Versuchszahl,Ergebnishash,Child-/Parent-Join,Ownerrolle,Blockgrund,nächster Schritt.
   Keine Rohdefinition,Checkpoints,Secrets,Kundendaten oder beliebige SQL-/Dateipfade.
3. Lokaler vertrauenswürdiger Session-Testadapter mit expliziten synthetischen
   Rollen-/Tenantzuordnungen. Keine solchen Fixtures im Produktionspfad. Ungebundene
   reale Identitäts-/Membershipauflösung liefert weiter fail-closed.
4. UI-Komponente im bestehenden Modulkontext mit Loading/Empty/Error/Blocked,
   DE/NL,Tastatur und explizit lokalem Belegumfang. Integrationstest-Harness innerhalb
   der vorhandenen App, keine neue öffentliche Demo und kein Fake-Produktivportal.

Abnahme des lokalen Schnitts: Browser→typisierter lokaler Adapter→dieselbe persistente
Datenbank→Antwort; Request aus fremdem Tenant/Projekt404,unberechtigt401/403,fehlende
Binding503,abgelaufene/revozierte Identität abgewiesen. Kein Datenbank-/Event-/Lease-
Delta durch Reads,keine unbekannte Operation,kein Client-Tenantwechsel als Autorität.
Reload/Navigationswechsel/Parallelreads/Parent-Join und blockierte Kinder testen;
Ergebnis-/Reviewreceipt bleibt erhalten. Separate Sol-Prüfung und REA am exaktenHash.

Vorbereitend lokal ausführbar: Extraktion/DTO/Fixturetests/Shared-Komponente unter
unveränderten Sperren. Für Liveübernahme fehlen autoritative Issuer→Subject→Tenant→
Projekt→Rollenbindung,Revocation,fachliche Rollenbrücke und tatsächlicher Runtime-
APIvertrag; dafür keine neuen Keys,Rechte oder Serveränderungen aus diesem Plan.
Original-Workspace-/Lizenz-/Downloadanforderungen bleiben eigenständige offene
Umfangspunkte. Ein Statuspanel erfüllt diese nicht automatisch.


## Implementierter begrenzter Schnitt

`LocalControl.status_snapshot()` liest in einer SQLite-mode=ro-Transaktion einen
konsistenten Snapshot. Der historische CLI-Status behält seine explizite
Gap-Synchronisierung; Backend-Statusreads verwenden diese Mutation nicht mehr.
`workspace_status()` projiziert nur Referenzen, Zustände, Versuche, Ergebnishash,
Ownerrolle, Ursache, nächste Aktion und lokalen Parent-Join. Keine Rohdefinition,
Checkpoints, Actorwerte oder Dateipfade. Keine neue Datenbank oder Fehlerqueue.

`LocalAppBackend.workspace_response()` ist der transportneutrale GET-Vertrag;
Session kommt ausschließlich von einem vertrauenswürdigen serverseitigen Resolver.
Jeder Aufruf prüft den aktuellen Vertragsfingerprint, Rolle, Tenant, Projekt,
Ablauf und Widerruf. Unberechtigte/ausgelaufene Identität401,fehlende Rolle403,
fremder Scope/nicht vorhanden404,unbekannte Queryfelder400,Mutation405.
Antworten private,no-store. Die Tests verwenden ausschließlich isolierte lokale
Sessionzuordnungen, nicht produktive Provideridentitäten.

`/intern/workspace` verwendet die gemeinsame Shell und WorkspaceStatusPanel mit
DE/NL und denselben Tokens. `/api/internal/workspace` ist zusätzlich in der
bestehenden Proxy-Schutzgrenze. Die reale Next-GET-Route bleibt503 ohne konfigurierte
Backendbindung; der Proxy verlangt weiterhin verifizierte Identität UND Membership.
Keine Aktivierung über Browserclaims, ENV-URL, Fixturecookie oder lokale Rolle.
Die Browser-HTTP-Fixture liegt nur unter apps/site/tests/fixtures und ist kein
Produktionsadapter oder Providerabnahmebeleg.

Die zentrale Übersicht enthält Gegenstand,Zweck,Status,Ownerrolle,Risiko,
Kostenobergrenze,Gültigkeit,Quellenhash und nächste Aktion. Gegenwärtige echte
Datenquelle sind ausschließlich bestehende technische Ergebnisprüfungen aus
control_jobs/control_reviews. Ein lokaler Prüfnachweis erlaubt keine Zahlung,
Schlüsselübernahme,Publikation oder Geschäftsausführung. Kostenobergrenzen bleiben
null/nicht festgelegt, statt aus SDK-/Joblimits Geldfreigaben zu erfinden.
Geschäftliche Freigaben sind explizit not_connected; keine UI-Freigabetoggles.

## Unveränderte technische Gates

PR46-Basis38f6c654→e2e90e0:686947Bytes Unified-Diff,5490Bytes Pfadmetadaten,
136Dateien. config/automation.json erlaubt64000Bytes pro Diff/Metadatenleseschritt;
tools/automation/ai_review.py::git_bytes bricht ab Überschreitung vor dem Modell ab.
Keine künstliche Dateiauswahl,Limiterhöhung oder automatische Wiederholung.

apps/web/auth/policy.ts::clerkConfiguration bindet Livepflicht an NODE_ENVproduction
oder APP_ENVproduction; VERCEL_ENVpreview wird nicht ausgewertet. Daher ist der
vorhandene Testschlüsselpaartransfer noch kein nutzbarer Previewlogin. Ein möglicher
separater Fix müsste eine autoritative Previewumgebung explizit behandeln und
Production/Test-Verwechslungen sowie unbekannte/konfligierende Umgebung weiterhin
ablehnen. Die Membership-/Tenantgrenze bleibt zusätzlich erforderlich. Dieser
Schnitt ändert den Guard nicht und liest/kopiert keine Schlüssel.
