# TEILEKLAR — Betriebsbuch

**Dokument-ID:** OPS-LOG-001
**Zweck:** Laufender, ehrlicher Statusnachweis — was tatsächlich lebt, was Design/Vorlage ist, was fehlt. Wird bei jeder betriebsrelevanten Änderung fortgeschrieben, nicht neu geschrieben.
**Unterschied zu `betriebslogik-und-prozesse.md`:** Jenes Dokument beschreibt die **Ziel**-Logik (wie Zustände funktionieren sollen). Dieses Dokument beschreibt den **Ist**-Zustand (was heute läuft).

---

## 1. Systemübersicht — Repo vs. Live

Dieses Projekt ist eine **Design-/Frontend-Werkstatt**: Die `.dc.html`-Dateien hier sind lauffähiges Frontend (HTML/CSS/JS, React-Runtime über `support.js`), aber dieses Projekt selbst hostet nichts dauerhaft und besitzt keinen Zugriff auf den Produktivserver, DNS oder Secrets von `teileklar.shop` bzw. `nexifyai.cloud`.

| Domain | Was dort läuft | Quelle |
|---|---|---|
| `teileklar.shop` | Produktivdeployment (Server/VPS, außerhalb dieses Projekts) | vermutlich Export/Sync dieses Repos — Deployment-Pipeline hier nicht einsehbar |
| `nexifyai.cloud` | Agentur-Website, Produktivdeployment | dito |
| dieses Projekt | Design-/Baustand beider Seiten, Tools, Dokumente | Quelle der Wahrheit für Design & Copy |

**Prüfhinweis 03.09.2026:** Ein automatisierter Abruf von `https://teileklar.shop/` lieferte reinen Text mit unaufgelösten `{{ platzhalter }}`. Das ist erwartbar für einen Abruf **ohne** JavaScript-Ausführung (diese Architektur rendert Inhalte erst nach dem Laden der React-Runtime im Browser) — kein Beleg für einen echten Defekt beim Live-Besuch. Es ersetzt aber keine echte Browser-Prüfung. **Offen:** Live-Seite in einem echten Browser (Desktop + Mobil) durchklicken und hier den Befund nachtragen.

---

## 2. Betriebsstatus je Baustein

| Baustein | Status | Anmerkung |
|---|---|---|
| Shop-Frontend (`TEILEKLAR Shop.dc.html`) | **Design fertig** | 7 Marktversionen, KI-Berater-UI, Warenkorb, Konto-UI — alles clientseitige Simulation mit Beispieldaten |
| NeXify-AI-Signet | **Integriert** | Echtes Visual-Pack-v1.1-Asset ersetzt frühere Canvas-Attrappe, Zustände idle/listening/working an echten Chat-State gekoppelt |
| Werkstattverzeichnis | **Design fertig, Daten statisch** | 6.875 Betriebe als JSON, keine Live-Aktualisierung |
| KI-Berater-Dialoge | **Simuliert** | Feste Antwortbäume im Frontend, keine echte LLM-Anbindung, kein Server |
| Backend/API | **Nicht gebaut** | Kein Server-Code in diesem Projekt |
| Datenbank | **Nicht gebaut** | Keine Persistenz — Warenkorb/Konto nur `localStorage`/Session |
| Auth (Login/Registrierung) | **UI-Attrappe** | Formulare vorhanden, keine echte Authentifizierung, keine Passwort-Speicherung |
| Zahlungs-Gateway | **Nicht angebunden** | Checkout zeigt Demo-Hinweis, kein echter Zahlungsfluss |
| E-Mail-Versand (Bestellbestätigung, Kontaktformular) | **Nicht angebunden** | Templates/Texte vorhanden, kein Versanddienst verbunden |
| Rechtstexte (Impressum, Datenschutz, AGB, …) | **Ausgearbeitet, ungeprüft** | Alle Sprachversionen als Arbeitsfassung — **fachanwaltliche Prüfung steht aus** |
| Monitoring/Alerting | **Nicht vorhanden** | Kein echtes System — „24/7"-Aussagen im UI sind Zielwerte, keine gemessenen SLAs |
| Betriebsbuch (dieses Dokument) | **Neu angelegt 03.09.2026** | Ab jetzt bei jeder betriebsrelevanten Änderung fortschreiben |

---

## 3. Bekannte Lücken (konsolidiert, Stand 03.09.2026)

Diese Liste ist die Fortführung der wiederholt genannten Restlücken aus vorherigen Sessions — hier an einer Stelle gepflegt statt in jeder Antwort neu aufgezählt:

1. **Backend & Datenbank** — spezifiziert, nicht implementiert. Kein Zugriff auf realen Server aus diesem Projekt heraus.
2. **Auth-Lösung** — konzeptionell (JWT), nicht implementiert.
3. **Zahlungs-Gateway** — nicht angebunden.
4. **E-Mail-Versand** — nicht angebunden.
5. **Live-Werkstatt-/Herstellerdaten** — statischer Datenstand, keine Aktualisierungspipeline.
6. **Rechtstexte** — brauchen fachanwaltliche Freigabe vor Livegang (mehrfach in `docs/06-auftraege/` und den Rechtstexten selbst als `OFFENE-PUNKTE` markiert).
7. **Monitoring/SLA-Messung** — nicht vorhanden; UI-Aussagen dazu sind Zielwerte.
8. **DSH (`system.nexify.cloud`) NeXify-AI-Integration** — laut Visual-Pack-Doku Zielstruktur, Repository/Pfade nicht geprüft.
9. **Reale Browser-Prüfung von `teileklar.shop`** — noch nicht durchgeführt (siehe §1).

**Diese Lücken sind Infrastruktur-/Rechts-/Betriebsarbeit, keine Design-Lücken** — sie brauchen Server-Zugriff, Verträge mit Zahlungs-/Mail-Anbietern und anwaltliche Prüfung, nicht weitere Frontend-Iteration. Design- und Dokumentationsarbeit dazu ist so weit vorbereitet, wie ohne diese Zugänge möglich.

---

## 4. Änderungsprotokoll

| Datum | Änderung | Von |
|---|---|---|
| 03.09.2026 | Betriebsbuch angelegt; Statusaufnahme aller Bausteine; Live-Abruf-Befund zu `teileklar.shop` dokumentiert | Design-Session |
| 03.09.2026 | NeXify-AI-Signet (Visual Pack v1.1) in `NeXifyAI Cloud.dc.html` und `TEILEKLAR Shop.dc.html` integriert, Canvas-Attrappe entfernt | Design-Session |
| 03.09.2026 | `NeXifyAI Cloud.dc.html` aus Live-Inhalten von nexifyai.cloud neu aufgebaut, Rechtstexte ergänzt | Design-Session |

*(Neue Zeilen oben nicht einfügen — chronologisch anhängen, ältester Eintrag bleibt oben.)*

---

## 5. Nächste Schritte (Priorität)

1. `teileklar.shop` und `nexifyai.cloud` in einem echten Browser prüfen (Desktop + Mobil) — Befund in §1 nachtragen.
2. Entscheiden, wer Backend/DB/Auth/Payment umsetzt (eigenes Dev-Team, externe Vergabe) — das ist außerhalb dessen, was in diesem Design-Projekt gebaut werden kann.
3. Rechtstexte an Fachanwalt geben, bevor irgendein Markt echten Verkauf startet.
4. Sobald ein echtes Backend existiert: dieses Betriebsbuch um Abschnitt „Deployment-Pipeline" und „Incident-Historie" erweitern.
