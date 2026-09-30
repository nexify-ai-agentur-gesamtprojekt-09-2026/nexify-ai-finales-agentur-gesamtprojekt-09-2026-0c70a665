# Freigabe-Nachweis · NeXifyAI Website (Entwürfe v10/v11) · 27.09.2026

Grundlage: Skill `freigabe-gate-live-betrieb`, Gutachten `autopilot/zertifizierungsreife-2026-09-27.md` (Urteil PARTIAL_BLOCKED), Go-Live-Abschlusstest `go-live-abschlusstest-2026-09-27.md`.

```
[2026-09-27TxxZ] FREIGABE-NACHWEIS NeXifyAI-Website v10 | Vorschau: FAIL (vorschau.nexifyai.cloud existiert nicht, Stand Skill 08.09.; neu messen) | Health 60s: FAIL (nicht durchführbar, 0 Abrufe, Cache-Buster nein)
  | E3: FAIL (Positiv: E1 Screenshot / Negativ: fehlt / Grenzwert: teilweise, Layout 390–1440 px / Rollback: fehlt) | Rollback ausgefuehrt: nein
  | Gutachten: autopilot/zertifizierungsreife-2026-09-27 (Platzhalter-Nr.) | Endabnahme: offen
```

Zeitstempel bewusst offen: in dieser Umgebung kein `date -u`; beim Eintrag ins ZK-Log unmittelbar erheben.

## Stufen

| Stufe | Status | Fehlt | Wer |
|---|---|---|---|
| 1 Vorschau | FAIL | Hostname, Ursprung, noindex, Zugangsschutz, Health-Endpunkt, Deploy-Weg — Live-DNS-Maßnahme, braucht Einzelfreigabe | Pascal |
| 2 Health ≥ 60 s | nicht prüfbar | läuft erst auf Stufe 1 | Betrieb |
| 3 E3 | FAIL | Negativfälle (Formulare, Kostenrechner, Berater leer/Sonderzeichen), Rollback-Probe | Entwicklung |
| 4 Rollback-Plan | fehlt | Auslöser, Handgriffe, Dauer, Berechtigter; Serverzugriff nötig? | Entwicklung |
| 5 Gutachten + Endabnahme | Gutachten liegt vor, NOT_READY in 3 Kriterien | Befunde P0 (Kundenstimmen, KI-Kennzeichnung, Zahlungsregel, Margenformel E1, Datenschutzerklärung) | Pascal / Recht |

## Entscheidung

**Auftrag nicht ausführbar** für einen Livegang. Die Entwürfe dürfen weiter gestaltet werden; nichts davon gilt als DONE.

Erster Schritt: Einzelfreigabe für die Vorschau-Stufe und Entscheidung E1 (Margenformel).
