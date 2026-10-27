# Unabhängiges Review des lokalen Main-Merges

Datum: 2026-10-27. Scope: ausschließlich lokaler Worktree
`/workspace/nexify-current-integration`, Branch
`integration/current-main-2026-10-27`, während des noch nicht abgeschlossenen
Merges von HEAD `e69a6891692ad148578766e3b142f91612ba43c8`
mit `2a552ed6319c21332d7c2957d3d757b99c187910`.
Kein Review eines späteren finalen Commits und keine Gesamt-/Liveabnahme.

## Ergebnis

Keine konkreten Fehler in den geprüften Konfliktauflösungen oder den unten
genannten automatisch zusammengeführten Änderungen festgestellt.

`AccountControl` bietet einen lokalisierten Headerzugang nach `/anmelden`.
Der dortige route-lokale `AuthenticationPanel` verwendet tatsächlich
`useAuth().isLoaded` und `isSignedIn`; nur danach zeigt er den Anmeldestatus und
den eigenen `signOut`-Knopf. Ein Abmeldefehler bleibt sichtbar; der laufende
Versuch sperrt den Knopf. Die Oberfläche erfindet weder eine Sitzung noch Rollen.
Dieser Kompromiss erfüllt einen sicheren erreichbaren An-/Abmeldeweg. Er bietet
keinen sitzungsabhängigen Header-UserButton und belegt keine echte Clerk-Sitzung.

Die Konfliktauflösung hält Clerk lazy und route-lokal, erhält ErrorBoundary,
DE/NL/FR-Lokalisierung und platziert die bestehende Workspace-Hülle außerhalb
der Auth-Suspense-Grenze. Der optionale Workspace-Slot liegt innerhalb des
UI-Kontexts und behält den bisherigen Fallback für andere Aufrufer.

Die MCP-Änderung verwirft doppelte Schlüssel rekursiv sowie die Python-JSON-
Sonderkonstanten (einschließlich NaN) bei JSON und SSE; Parsefehler werden als
`invalid_response` abgebildet. Dies ist keine vollständige MCP-Schemavalidierung.
Die neue Medienplanprüfung bindet vorhandene Entwürfe an DE/NL/FR und einen
ausdrücklich noch nicht ausgeführten Casting-/Providerstand. Sie erteilt keine
Provider-/Publikationsfreigabe. Die Browser-Evidenzbindung erweitert den
Quellfingerprint um Auth, Main und Globals und verlangt den Header-Routentest.

## Eigenständig ausgeführte Prüfungen

- `python3 tools/project_skills.py verify`: 5 Projekt-Skillquellen verifiziert.
- Node 22.23.4: `node --test apps/site/tests/auth.test.mjs`: 5/5 bestanden.
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -p test_automation_mcp.py`: 9/9 bestanden, lokale synthetische HTTP-Gegenproben.
- Entsprechender Lauf für `test_factory_contract.py`: 18/18 bestanden.
- Entsprechender Lauf für `test_browser_evidence.py`: 6/6 bestanden.

Die Auth-Nodefälle sind Policy-/Quelltextprüfungen, keine echte SDK-Interaktion.
Browser- und Integrationsfixture-Quellen wurden gelesen; eigene Browserläufe,
Builds sowie make check/test/e2e wurden im vereinbarten Review-Scope nicht
parallel zum Hauptagenten gestartet. Dessen aktuelle vollständige Gates und
Browsernachläufe bleiben gesonderte Evidenz. Keine externen Provideraufrufe,
Remote-Schreibaktionen, Deployments, Authaktivierung oder Commits ausgeführt.
Einzige eigene Dateischreibaktion ist dieser lokale Reviewbericht.

## Bindung der geprüften zentralen Quellen (SHA-256)

```text
1b6239b65b9cb1bb6bb69e68f5318c8fb4fdb9f8165a7a763b11b6fa93968b41  apps/site/src/Auth.tsx
e2b5f22a13bb1f142f4e9812d8698d39dee0838d5adc43b4c318d5b40b506d4d  apps/site/src/main.tsx
a2f538718c4e41092fb2cb5d1845d453c8ec6e6edbb36f3072e7ddfb33b9c9cf  apps/site/tests/auth.test.mjs
dfaf02f69ce5cf3b2bc9f2d040fe3222131d44c3aa79c3fd7e555bb74841ffce  apps/web/components/Workspace.tsx
6858c3689018bd315b430f824ed5b8b341dbf2739e17a296f081246bfa36c659  tools/automation/mcp_probe.py
1cd22e60064f2a54c3a3bb9a8517bef4ddc4f8ceafee0e4a4baa453a93e59dad  tools/verify_factory_contract.py
4a2961109bb53604ab56aa19f116983efb049f7419a8ea50eb4200aa86accd0d  tools/check_browser_evidence.py
```

Keine blockierte Aktion. Die nicht vom Reviewer ausgeführten Gesamt-/Browser-
und Liveprüfungen sind ausdrücklich keine bestätigten Ergebnisse dieses Reviews.
