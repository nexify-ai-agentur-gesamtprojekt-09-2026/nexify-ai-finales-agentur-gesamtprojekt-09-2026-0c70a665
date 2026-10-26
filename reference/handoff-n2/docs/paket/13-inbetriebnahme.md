# Band 13 · Integration und Inbetriebnahme

> Stand 28.09.2026 · verbindlich für jede Änderung · Abweichung = Fehler, nicht Ermessen.

## Stufen – keine Stufe beginnt, bevor die vorige abgenommen ist
| Stufe | Inhalt | Werkzeug | Abnahme | Wer |
|---|---|---|---|---|
| I0 | Repository anlegen, Paket einspielen, ersetzte Fassungen nach `versions/` (nach Freigabe) | GitLab | CI läuft | Claude Code |
| I1 | Prüfplan Band 11 § 2 unter Node, Spectral, Statik | CI | alle grün, 0 neue Befunde | Claude Code |
| I2 | Migrationen 001–008 gegen leere Postgres 16, Mandant A ↛ B | Testdatenbank | 0 fremde Zeilen | Claude Code |
| I3 | Gateway und Worker bauen (Backend-Auftrag B1–B14) | `docs/08-gesamtloesung/01-backend-auftrag.md` | je Schritt Gate | Claude Code, Review je MR |
| I4 | `sudo ./install.sh --nur-pruefen` auf FRA | Server | Bericht ohne Blocker | Pascal startet |
| I5 | `--parallel` neben dem Bestand | Server | Health 13/13 in 60 s | Pascal bestätigt „installieren“ |
| I6 | Sandbox-Integrationen: Revolut, Resend, 9router | Worker | E3, E5 aus Band 11 § 4 | Claude Code |
| I7 | Bestandsübernahme nach Band 12 | Paritätstests | je U-xx ohne Befund | Claude Code, Freigabe Pascal |
| I8 | Selbstheilung Schatten → Vorschlag | `config/runbooks.json` | ≥ 7 Tage, ≥ 5 Auslösungen je Ablauf | automatisch |
| I9 | Go-Live-Abschlusstest, Freigabe-Gate | Skill `freigabe-gate-live-betrieb` | PASS mit Zeitstempel | **nur Pascal** |
| I10 | Umschalten, 30 Tage Beobachtung, Bestand abschalten | Band 12 § 3.6–3.7 | Bericht | Pascal |

## Arbeitsvorgaben, die in jeder Stufe gelten
1. `AGENT.md` lesen, dann `MANIFEST.md` – nur „aktuell“ ist gültig.
2. Hartsperren: kein Reboot, keine DNS-Änderung, keine vollständige Firewall-Änderung, keine fremden Container stoppen (R-02).
3. Preise, Rechtstexte, Endabnahme, Prompt-Versionen, ADRs: nur Pascal (R-01, R-09).
4. Geheimnisse nur aus OpenBao (R-07); nie im Repo, nie im Log.
5. Jede Tabelle mit Mandant und erzwungener RLS (ADR-0008).
6. Kein Fix ohne Grundursache und Prüffall (Skill `systematisches-debugging-grundursachenanalyse`).
7. Review je MR durch zweiten Prüfer mit echten SHAs (Skill `code-review-anfordern-subagent`).
8. Fehlende Hilfsdateien oder Validatoren = NICHT DURCHGEFÜHRT, nie PASS (Skill `gutachten-kette-ablageort`).
9. Offene Frage, die kein Band beantwortet = Fehler im Paket → `00-hauptdokument.md` „Offene Fragen“, nicht raten.
