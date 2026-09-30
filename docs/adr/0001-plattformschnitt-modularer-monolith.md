# ADR-0001 · Plattformschnitt: modularer Monolith

**Status:** vorgeschlagen · **Datum:** 28.09.2026 · **Entscheider:** Pascal Courbois · **Verfahren:** Architektur-Entscheidungsrahmen (Kontext → Abwägung → Muster → Dokumentation) · **Umkehrbarkeit:** mittel (Prozesse lassen sich später herauslösen, weil der Vertrag schon getrennt ist)

## 1 · Kontext

| Faktor | Befund | Quelle |
|---|---|---|
| Einordnung | wachsendes Produkt mit Compliance-Pflichten (DSGVO, KI-VO Art. 50, GoBD), kein MVP mehr, kein Konzern | `AGENT.md` § 0, Normenregister |
| Team | 1 Inhaber + Agenten; keine eigene Betriebsmannschaft | `AGENT.md` |
| Betrieb | ein VPS Frankfurt, Cloudflare davor, GitLab selbst gehostet | `integrationen.json`, `INBETRIEBNAHME.md` |
| Last | nicht gemessen; keine Zahl behaupten | – |
| Konsistenz | Geld, Freigaben, Läufe brauchen Transaktionen und genau-einmal | `backend-architektur.md` § 4 |
| Vorhandenes | 6 reine Kerne (`lib/*.js`, 150+ Prüffälle), Vertrag `api/openapi.yaml`, Stapel `deploy/compose.yml` | Projekt |

## 2 · Optionen

| | A · Modularer Monolith (3 Prozesse, 1 Repo, 1 Datenbank) | B · Microservices je Fachbereich | C · Low-Code (n8n/Dify als Rückgrat) |
|---|---|---|---|
| Pro | eine Transaktion über Buchung + Freigabe; ein Deploy; Kerne 1:1 geteilt; von einer Person betreibbar | unabhängige Skalierung und Releases | schnell sichtbar, wenig Code |
| Contra | Grenzen müssen per Modulregel gehalten werden | verteilte Transaktionen, Saga, Netzfehler zwischen Diensten, Betrieb übersteigt die Teamgröße (Conway) | Geld und Regeln in Low-Code sind schwer testbar; widerspricht „Buchung nie in n8n“ |
| Risiko | Monolith wächst unkontrolliert | verteilter Monolith | Regelumgehung, fehlende Prüffälle |

Einfachste Alternative „nichts tun“ (Prototypen weiter nutzen) scheidet aus: kein Backend, kein Gate bestehbar.

## 3 · Entscheidung

**A · Modularer Monolith.** Prozesse `gateway`, `worker`, `mcp` aus einem Monorepo, gemeinsame Kerne aus `packages/kerne`, eine Postgres-Datenbank mit RLS. n8n bleibt für Benachrichtigungen (kein Geld, keine Regeln).

**Modulregeln (Schutz gegen den wachsenden Monolithen):** Module sprechen nur über ihre öffentliche Schnittstelle; kein Modul schreibt in fremde Tabellen; jede Seitenwirkung läuft durch `lib/regelwerk.js`. Prüfung in CI (Abhängigkeitsregel, z. B. dependency-cruiser).

## 4 · Folgen

- Positiv: B0–B14 im Backend-Auftrag bleiben gültig; ein Rollback = eine Version zurück.
- Negativ: Skalierung nur vertikal bzw. durch mehrere Worker; reicht bis zur ersten gemessenen Grenze.
- Wiedervorlage: wenn ein Modul nachweislich andere Last- oder Release-Takte braucht (Messung, nicht Vermutung).

## 5 · Prüfliste

- [x] Anforderungen und Grenzen benannt · [x] drei Optionen mit Gegenposition · [x] einfachere Alternative geprüft · [x] passt zur Teamgröße · [ ] Freigabe Pascal
