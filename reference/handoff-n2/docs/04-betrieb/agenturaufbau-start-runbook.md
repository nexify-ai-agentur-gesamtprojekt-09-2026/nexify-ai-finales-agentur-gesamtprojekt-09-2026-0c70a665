# NeXify AI Agenturaufbau · Start-Runbook

**Stand 27.09.2026 · Beschluss Pascal: Aufbau gestartet.**
Dieses Runbook führt vom Beschluss zur gesteuerten Produktion. Es wird **auf den Servern ausgeführt** (Frankfurt/Düsseldorf, GitLab, n8n, DSH). Aus dieser Design-Umgebung heraus ist kein Server-, DNS- oder Repo-Zugriff möglich.

---

## 0 · Was der Beschluss abdeckt und was nicht

| Abgedeckt durch „Aufbau gestartet“ | Braucht zusätzlich eine eigene Zeile im Chat |
|---|---|
| Reihenfolge, Agentenbesetzung, Arbeitspakete | **Live-DNS** `vorschau.nexifyai.cloud` anlegen |
| Bau auf der Vorschau-Stufe | jede weitere Live-DNS-Änderung, Firewall komplett, Reboot |
| Tests, Nachweise, Gutachten | **Endabnahme je Stufe** (vor jedem Live-Schritt) |
| Entwürfe in allen Kanälen | Companion darf **selbst** senden (je Kanal) |

Wortlaut für die Einzelfreigabe (bitte genau so in den Chat):
`FREIGABE LIVE-DNS vorschau.nexifyai.cloud → Frankfurt, noindex, Zugangsschutz. Pascal, <Datum Uhrzeit>`

---

## 1 · Agentenbesetzung (aus dem Agentenkonzept)

| Agent | Rolle | Abläufe | Modellstufe | Budget/Tag | Modus Start |
|---|---|---|---|---|---|
| A01 Director | Plan, Zustand, Verteilung, Companion-Kern | alle | 2 | 3,00 € | Supervised |
| A02 Eingang | Einordnen, Tags | W01 | 0 lokal | 0,50 € | Autopilot |
| A03 Angebot | Entwurf aus Vorlage + Rechenkern | W02, W03 | 1 | 1,00 € | Supervised |
| A04 Umsetzung | Lieferung, Code, Seiten | W04 | 2 | 5,00 € | Supervised |
| A05 Prüfer | unabhängige Prüfung, E3, Review | W04, alle Gates | 2 | 2,00 € | Autopilot |
| A06 Abrechnung | Journal, Rechnung, Mahnung | W06, W07, W11 | 0 + Rechenkern | 0,30 € | Supervised |
| A07 Support Kunde | Berater Website/Portal | W05, W09 | 1 | 1,00 € | Supervised |
| A08 Support Werkstatt | Partnerportal, Gutscheine | W08, W10 | 1 | 0,50 € | Supervised |
| A09 Wächter | Außen-/Innenwächter, Vorfall | W13 | 0 | 0,20 € | Autopilot |
| A10 Optimierer | Messen, Vorschlag, Fragentest | W14, W15 | 1 | 0,50 € | Manuell |

Regeln: A05 prüft nie eigene Arbeit. Jeder Agent hat Abschaltung (`#stopp`). Budget = harter Stopp. Datenschutz-Abläufe W12 immer Manuell.

---

## 2 · Phasen

| Phase | Inhalt | Ausführende | Gate | Ergebnis |
|---|---|---|---|---|
| P0 | ZK-Claim, Vorschau-Stufe (nach Einzelfreigabe) | Pascal / DSH | Einzelfreigabe | Vorschau erreichbar, Health-Endpunkt |
| P1 | GitLab-Repo `nexifyai-dev/agentur`, Rechenkern + Tests, CI mit `resource_group` | A04, A05 | E3 Rechenkern inkl. Rollback | Pipeline grün |
| P2 | Auth, Rollen, RLS (6 Gruppen) | A04, A05 | E3 inkl. Mandanten-Negativtest | Anmeldung auf Vorschau |
| P3 | Buchungskern, Abrechnung, Rechnung | A04, A06, A05 | E3 + Idempotenz-Test | Testrechnung |
| P4 | Director, Agenten-/Skill-Register, Tag-Router | A01, A04 | E3 `#stopp` wirkt | myADMIN mit echten Daten |
| P5 | Portale anbinden (Kunde, Partner, Nachbarschaft) | A04, A07, A08 | E3 je Portal | Portale auf Vorschau |
| P6 | Companion: Website-Berater, dann Mail-Entwürfe, dann WhatsApp | A01, A07 | Kennzeichnung Art. 50 geprüft | Kanäle auf Vorschau |
| P7 | W01–W15 in n8n, Wächter, Sicherung + Restore-Test | A09, A04 | Restore ausgeführt | Kreislauf läuft |
| P8 | Gutachten, Endabnahme, Live je Stufe | A05, Pascal | Endabnahme | Produktion |
| P9 | Hypercare 14 Tage, danach W15 Optimierung | A09, A10 | – | Dauerbetrieb |

„Fertigstellung bei zeitgleicher Liveschaltung“: Jede Phase geht **einzeln** live, sobald ihr Gate grün ist. Kein Gesamt-Big-Bang.

---

## 3 · Nachweis-Zeile je Live-Schritt (ZK-Log)

```
[<ISO-UTC>] FREIGABE-NACHWEIS <Phase> | Vorschau: PASS/FAIL | Health 60s: PASS/FAIL (n Abrufe, Cache-Buster ja)
  | E3: Positiv/Negativ/Grenzwert/Rollback | Rollback ausgefuehrt: ja/nein
  | Gutachten: <Nr> | Endabnahme: erteilt <Zeitstempel>
```

## 4 · Rollback je Phase

Auslöser: Health < 60 s stabil, Fehlerquote > 2 %, Geldbetrag abweichend, Mandanten-Leck. Handgriff: vorherigen Container-Tag deployen, Migration rückwärts, Tag-Router `#stopp` global. Ausführend: Pascal oder A09 (nur `#stopp`).

## 5 · Offen vor P1

- E1–E5 (siehe Umsetzungsplan).
- LightRAG-Mandantentrennung (eigene Instanz je Kunde empfohlen).
- Tagesbudget gesamt (Vorschlag oben: 14,50 €/Tag).
- Kanäle, in denen der Companion selbst senden darf.
