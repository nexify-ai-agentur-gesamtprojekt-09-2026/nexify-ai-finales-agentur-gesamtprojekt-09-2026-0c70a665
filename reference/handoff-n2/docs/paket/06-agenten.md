# Band 06 · Agenten-Handbuch: Rollen, Lernen, Selbstoptimierung

> Stand 28.09.2026 · Entwurf · Quelle ist bindend, dieser Band fasst zusammen und verweist. Widerspruch = Fehler im Paket (in 00 unter „Offene Fragen“ eintragen).

## 1 Rollen
Orchestrator (S1 `config/prompts/s1-master-orchestrator-*.md`; aktiv 1.0.0, 2.0.0 zur Freigabe) und Fach-Agenten je Phase (`00-hauptdokument.md` Phasenpipeline). Arbeitsweise je Anfrage aus `lib/modi.js`.

## 2 Grenzen (gelten vor jedem Prompt)
Hartsperren R-02 (Reboot, DNS, Firewall), Freigaben R-01/R-09 (Preise, Recht, Endabnahme), R-13 (Löschen erst nach Sicherung und Bestätigung), R-21 (Bildschirmsteuerung nur ohne API und in der Sandbox).

## 3 Lernen
| Stufe | Kern | Gate |
|---|---|---|
| Signal (Korrektur, ▼, Fehler, Belegprüfung) | `lernschleife` | – |
| Lernform L1 Regel · L2 Wissen · L3 Prompt · L4 Prüffall · L5 Adapter | `lernschleife` | Fragensatz `config/fragensatz.json` |
| Ausrollen | Canary 5 → 25 → 100 % | Rücknahme mit einem Klick |
| Adapter-Training | nur LoRA/QLoRA, eine GPU (ADR-0005) | Freigabe Pascal |

## 4 Selbstheilung
Runbooks `config/runbooks.json`, Kern `selbstheilung`: Schatten → Vorschlag (≥ 7 Tage, ≥ 5 Auslösungen) → Selbst (nur Stufe 1, nach Grundfreigabe). Schleifensperre 3/h.

## 5 Gedächtnis
Vier Arten (ADR-0004), Mandant zuerst, Fristen im Nachtlauf.
