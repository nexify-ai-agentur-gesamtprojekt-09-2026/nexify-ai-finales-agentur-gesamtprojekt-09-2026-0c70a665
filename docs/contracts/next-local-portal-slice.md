# Nächster lokaler Portal-Teilauftrag · PORTAL-LOCAL-READ-01

Status: vorbereitet, nicht implementiert/ausgeführt/abgenommen. Owner: bestehender
Webwriter; Auth-/Membershippolicy beim zuständigen Systemowner. Kein zweiter Writer.
Die bestehenden zehn privaten Routen bleiben geschützt; keine Credentialkopie.

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
