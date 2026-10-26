# Zertifizierungsreife · myADMIN v2

**Urteil: NOT_READY.** Kein externes Zertifikat, keine Zertifizierungsstelle, kein Schema gewählt.

## Scope
myADMIN v2 (Oberfläche), lib/rechenkern.js, lib/tagrouter.js. Ausgeschlossen: Backend (existiert nicht), Portale, Live-Betrieb.

## Kriterien (intern, Freigabe-Gate)
| Kriterium | Ergebnis | Beleg |
|---|---|---|
| Stufe 1 Vorschau | NONCONFORMING | B-08 |
| Stufe 2 Health 60 s | NOT_ASSESSED | kein Dienst |
| Stufe 3 E3 Rechenlogik | PARTIALLY_CONFORMING | B-01, B-02 (Browser, kein Rollback-Test) |
| Stufe 3 E3 Oberfläche | NOT_ASSESSED | B-04 |
| Stufe 4 Rollback | NOT_ASSESSED | kein Deployment |
| Stufe 5 Endabnahme | offen | Pascal |

## Abweichungen
| ID | Klasse | Kriterium | Frist |
|---|---|---|---|
| A-01 | MAJOR | Vorschau-Stufe fehlt | nach Einzelfreigabe |
| A-02 | MAJOR | kein Backend, keine Rechte | AP-03–AP-06 |
| A-03 | MINOR | Oberfläche nach Korrektur nicht visuell geprüft | M-01 |
| A-04 | OBSERVATION | Kostenannahmen statt Messung | M-05 |

Unabhängige Prüfung: nicht erfolgt (Phasenemulation, dieselbe Instanz). Keine Norm als VERIFIED bewertet.
