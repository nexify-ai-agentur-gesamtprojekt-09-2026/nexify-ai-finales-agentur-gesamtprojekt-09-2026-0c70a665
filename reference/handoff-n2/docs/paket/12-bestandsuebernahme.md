# Band 12 · Übernahme der bisherigen Lösung („reinpatchen“)

> Stand 28.09.2026 · verbindlich für jede Änderung · Abweichung = Fehler, nicht Ermessen.

## 1 Grundsatz
Die bisherige Lösung läuft weiter, bis die neue denselben Zweck **nachweislich** erfüllt. Nichts wird aus dem Gedächtnis nachgebaut: Jede Übernahme beginnt mit dem Lesen des echten Bestands. Löschen oder Abschalten erst nach Sicherung, Probelauf und Bestätigung durch Pascal (R-13).

## 2 Bekannter Bestand, der in diesem Paket fehlt
Quelle: `uploads/Die NeXify Blaupause .md`, `docs/03-backend/nexifyai-api-abrechnungskonzept.md`, Skill `gutachten-kette-ablageort`. **Vollständig ist erst das Inventar aus Schritt 3.1.**

| Nr. | Bestand | Ort | Ziel im neuen System | Art | Bekannter Konflikt |
|---|---|---|---|---|---|
| U-01 | Core-API `/v1/ledger` | FRA | `lib/prepaid.js` + `api_journal` (Migration 008) | Adapter, dann ablösen | zwei Journale – nur eines darf führend sein |
| U-02 | Core-API `/v1/revolut` | FRA | Webhook `/v1/payments/revolut/webhook`, Worker | ablösen | Signaturprüfung und Order-Abruf nach neuem Kern |
| U-03 | `scripts/nexifyai-margin-prepaid.py` | Repo/FRA | `lib/prepaid.js preis()`, `lib/rechenkern.js` | ersetzen | rechnet **Marge ÷ 0,55**, neues System **Aufschlag × 1,45** → Entscheidung E1 zuerst |
| U-04 | Business-Portal mit Preisrechner | FRA | `NeXify API.dc.html` #preise | ersetzen | gleiche Preistabelle, gleiche Formel |
| U-05 | AgentMemory | FRA | `lib/gedaechtnis.js` (ADR-0004) | anbinden (Adapter) | Mandantenfeld nachrüsten |
| U-06 | LightRAG | FRA | `lib/rag.js` Stichwort + Bedeutung | anbinden | Fundstellenformat angleichen |
| U-07 | 9Router | FRA | einzige Tür zu Modellen | behalten | Cache-Markierungen weiterreichen – ungeprüft |
| U-08 | DeepSeek Harness (Agenten-Zentrale), Gutachten-Hilfsdateien | FRA `/opt/nexifyai/dsh-home/skills/` | Gutachtenkette, `lib/langlauf.js` | anbinden | Laufakten-Format |
| U-09 | Hermes | FRA | Zweck im Inventar klären | offen | – |
| U-10 | n8n | FRA | Ereignisse `docs/generiert/dienste.md` | behalten, nur über Gateway-Hooks | Webhooks signieren (HMAC) |
| U-11 | GitLab, CI | FRA | `.gitlab-ci.yml` dieses Pakets | behalten | Pipeline-Schritte ergänzen |
| U-12 | Agentur-Website | FRA | `NeXifyAI Cloud v10.dc.html` | ersetzen nach Abnahme | Rechtstexte, Tracking |
| U-13 | WireGuard-Hub | FRA | unverändert | behalten | Hartsperre Netz |
| U-14 | teileklar.shop (Backend, Nginx, Postgres) | DUS | `TEILEKLAR Shop.dc.html`, Migrationen 001–007 | parallel, dann ablösen | Datenübernahme Kunden/Bestellungen mit `mandant_id` TEILEKLAR |
| U-15 | Traefik, cloudflared | DUS | Band 03 | behalten | – |
| U-16 | Studienkolleg-Server (2×) | Kunde | **nicht anfassen** – fremdes Konto | – | nur über vereinbarte Schnittstelle |

## 3 Vorgehen je Bestandteil (Muster)
1. **Inventar, nur lesend:** Version, Konfiguration, Endpunkte, Datenbestand, Abhängigkeiten, Nutzer. Ergebnis in `docs/12-bestand/U-xx.md`.
2. **Zuordnung:** Jede Funktion des Bestands → Kern, Endpunkt oder Seite des neuen Systems. Fehlt ein Ziel: neuer Prüffall zuerst, dann Kern erweitern (Band 11 § 2, P3).
3. **Paritätstest:** gleiche Eingaben an Bestand und neu, Ergebnisse vergleichen (Beträge centgenau, Texte inhaltlich). Abweichung = Befund, nicht Rundung.
4. **Adapter:** Bestand ruft neue Kerne oder umgekehrt – nie beide schreibend auf dieselben Daten.
5. **Parallelbetrieb:** `install.sh --parallel` (Projekt `nexify-neu`, Ports 18080/18090), mindestens 7 Tage, Abgleich täglich.
6. **Umschalten:** nach Paritätstest ohne Befund und Freigabe Pascal; Rückweg dokumentiert und geübt.
7. **Abschalten:** 30 Tage nach Umschalten, nach Sicherung und Bestätigung (R-13).

## 4 Reihenfolge
U-03 → U-04 (erst E1 entscheiden) · U-01 → U-02 (Geld zuerst, weil jeder Fehler Kunden trifft) · U-05, U-06, U-08 (Wissen) · U-12, U-14 (Flächen) · Rest nach Inventar.
