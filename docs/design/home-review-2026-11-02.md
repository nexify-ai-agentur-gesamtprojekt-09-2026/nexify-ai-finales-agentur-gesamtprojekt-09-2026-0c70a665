# Home-Review · 02.11.2026

REQ-HOME-20261102. Owner: aktueller Home-Implementierungswriter; kommerzieller
Entscheider: Pascal. Scope: die verlinkte eigentümerprivate Sites-Ausgabe,
ausschließlich Home und abgeleitete Material-/Textquellen. Unterseiten,
Backenddienste, Zahlungen und öffentliche Domains gehören nicht zu dieser Änderung.

Quellen: eingefügtes „NeXify Gesamtkonzept“, besonders Home, §6 Preiskalkulation
und §2 Gestaltung; exakter Anhangshash und Bildherkunft in der JSON-Nachbardatei.
Bestehender Hero bleibt dieselbe stumme Montage, kein neu produzierter Sprecherfilm.

STEP-01: Zweispaltige Komposition mit begrenzter nativer Videoöffnung,
räumlich gerundeter Lichtkante. Originalfigurdateien unverändert. STEP-02:
drei statische, neu generierte Fachillustrationen anhand NeX-/Oracle-Referenzen;
keine Videotags/Playbuttons darunter. STEP-03: neue DE/NL/FR/EN-Inhalte für
Leistungseinstiege, konkrete Zusammenarbeit, Kostenarten, Produkte und Kontakt.
STEP-04: Eingaben eines ausdrücklich hypothetischen Rechenbeispiels; Rechnung
mit Umsatzmarge, keine neue Ratecard. Wettbewerberpreise sind verlinkte
Einstiegsbeispiele mit unterschiedlichen Umfängen, keine Marktstatistik.

Der veröffentlichte Beispielpreis ist 1.925 EUR netto:
24 h × angenommene 45 EUR Kosten/h + 120 EUR Fremdleistungen + 200 EUR
Gemeinkosten + 140 EUR Reserve = 1.540 EUR Vollkosten. Geteilt durch
(1 − 20 % Umsatzmarge) = 1.925 EUR. Diese Werte sind keine bestätigten realen
Kosten, freigegebenen Tarife oder Gewinnprognosen. Steuer wird nicht pauschal
berechnet. Keine Kauf-/Zahlungsfunktion und keine Angebotsübermittlung.

Wirkung: nur Seitenrendering und statische Assets. Keine Backendmigration,
kein Job-/Tenant-/Cookie-/Authentifizierungswechsel, kein Versand. Rückkehr:
v10 / Ausgangscommit d988be8a799f440484a58acb2b49f4ee8f693ba6 erneut bereitstellen.
Vor Push Remote-HEAD kontrollieren, bei fremdem Fortschritt abgleichen.

Apple-Design-Skill: lokale gepinnte SKILL.md gelesen; relevante Grundlagen
layout/accessibility/typography/color, designing-for-macos, materials,
liquid-glass, motion und cross-platform berücksichtigt. Web-CSS/HTML, keine
Apple-Zertifizierung. Raumtiefe liegt in Illustrationen und Medienkante,
kein Backdrop-Glass hinter Fließtext. Physischer Safari-/iPhone-Test fehlt.

Verifikation: siehe home-browser-qa-2026-11-02.json. Vite-/TypeScript-Build grün,
118 Site-Tests grün, make check grün. Volle Python-Prüfung und unveränderter
Ausgangsstand jeweils 697 Tests, 59 Failures, 10 Errors, 11 Skips; veraltete
Evidenzhashes und fehlendes pymongo verhindern eine grüne Gesamtkette. Im
geänderten Stand fällt zusätzlich der eingefrorene alte config/fakten-Hash auf;
keine historische Browserabnahme oder Hashliste wurde auf einen nicht neu
abgenommenen Gesamtstand umgeschrieben. Das ist keine vollständige Systemabnahme.
Host: Node24.19.0/pnpm11.25.0 statt deklarierter Node22/pnpm12; bestehende
Bundlegrößenwarnung bleibt. Sites-Hilfsskripte fehlen im Executor; direkter
Git-Zugriff mit kurzlebiger Credential über verdecktes stdin und natives
Archiv-/Publikationswerkzeug übernehmen die gleiche Quellen-/Artefaktbindung.
