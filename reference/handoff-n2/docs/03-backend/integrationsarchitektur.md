# Integrationsarchitektur und Team-Lernen

**Stand 27.09.2026 · Fassung 1.0.** Verbindet alle Dienste, Kerne und Oberflächen zu einem System. Maschinenlesbare Quelle: `config/integrationen.json`. Generierte Verzeichnisse: `docs/generiert/`.

## 1 · Muster

1. **Ein Gateway.** WebUI, Portale und myADMIN sprechen nur mit `api.nexifyai.cloud` (REST) und `mcp.nexifyai.cloud` (MCP, streamable HTTP, zustandslos). Kein Browser-Aufruf direkt an Supabase-Service-Rolle, Resend, 9router oder Composio.
2. **Ein Adapter je Dienst.** Austausch eines Dienstes ändert einen Adapter, keine Oberfläche.
3. **Ereignisbus statt Punkt-zu-Punkt.** Jede Änderung erzeugt ein signiertes, idempotentes Ereignis (`mail.eingang`, `auftrag.angenommen`, …). Folgeschritte hängen sich an; tote Ereignisse sind in myADMIN sichtbar.
4. **Kerne entscheiden, Modelle schlagen vor.** Rechenkern (Geld), Tag-Router (Ablauf), Langlauf (Zustand), Posteingang (Mail) sind deterministisch und getestet. KI liefert Entwürfe.
5. **Supabase ist die Quelle der Wahrheit.** Wissen (LightRAG, Cognee, agentmemory) ist abgeleitet und jederzeit neu aufbaubar.

## 2 · Schichten

| Schicht | Dienste | Aufgabe |
|---|---|---|
| Netz | Traefik, Cloudflare | TLS, Routing, WAF, Zero Trust für Admin |
| Daten | Supabase | CRM, Aufträge, Journal, Auth, RLS, Storage |
| KI | 9router, Headroom | Modelle Stufe 0–2, Kontextverdichtung |
| Wissen | LightRAG, Cognee, agentmemory | Fundstellen, Beziehungen, Lessons Learned |
| Automatik | Director/Langlauf, Dify, Composio | Abläufe, sichtbare Workflows, Werkzeuge |
| Kommunikation | Resend, Posteingang | Versand, Eingang, Zustellqualität |
| Betrieb | Monitoring, GitLab, OpenBao | Überwachung, CI/Doku, Geheimnisse |
| Oberfläche | WebUI, myADMIN, 4 Portale | Menschen |

## 3 · E-Mail: eine Adresse

- **Eingang:** alles an `mail@nexifyai.cloud`. Weitere Adressen werden weitergeleitet und im Kern als Hinweis markiert.
- **Verarbeitung** (`lib/posteingang.js`, 18/18 Tests): Spam-Wert aus SPF/DKIM/DMARC, Mustern, Phishing-Merkmalen, Sperrliste → Quarantäne/Blockieren · Kategorie (12) · Zuordnung Kunde/Person/Fall/Projekt nach Belastbarkeit (Nummer > Adresse > Domain; Freemail nie als Kunde) · Priorität und Frist (4/24/72 h) · Antwortmodus.
- **Automatisch beantwortet** wird nur: Eingangsbestätigung für unbekannte Anfragen, FAQ an sicher zugeordnete Werkstätten. **Nie automatisch:** Recht, Rechnung, Auftrag. Alles andere als Entwurf zur Freigabe.
- **Ausgang:** `from` und `reply_to` immer `mail@nexifyai.cloud`, KI-Mails mit Kennzeichnung – geprüft vor jedem Versand (`ausgehendPruefen`).
- **Zustellqualität** aus Resend-Webhooks: Ampel (Bounce > 4 % oder Beschwerde > 0,1 % = rot → Kampagnen stoppen).
- **Gedächtnis:** jede zugeordnete Mail → Cognee (Beziehungen) + CRM-Verlauf.

## 4 · Automatische Dokumentation

`tools/doku-generator.js` läuft in GitLab-CI bei jeder Änderung unter `config/` und schlägt aktualisierte Dokumente per Merge Request vor: Dienste- und Hook-Verzeichnis, MCP-Werkzeuge, Betriebshandbuch-Kurzfassung. Pflichtenheft je Auftrag entsteht aus dem Anforderungsprofil (Langlauf K3) beim Ereignis `auftrag.angenommen`. Nachweise des Freigabe-Gates schreiben sich ins Betriebshandbuch.

## 5 · Team-Lernen

| Quelle | Wird zu | Ablage |
|---|---|---|
| Befund aus Review/Gate/Verifier | Regel im Prüfkatalog oder Test | `tests/`, `tools/design-norm.js` |
| Vorfall | Nachbericht + Maßnahme + Wirksamkeitsprüfung | `learning-captures/` |
| Korrektur eines KI-Entwurfs durch Pascal | Beispiel im Fragensatz, Don't im Stimmprofil | agentmemory |
| Wiederholte Handarbeit | Automatisierungs-Kandidat | myADMIN → Optimierung |
| Falsch zugeordnete Mail | Zuordnungsregel oder Domain im CRM | CRM, `lib/posteingang.js` |

**Bereits gelernt in diesem Projekt (Auszug):** Layout bricht bei schmalem Hauptbereich zwischen offener Seitenleiste und Seitenfeld → Überlagerung ab < 1.200 px · Knöpfe in scrollenden Leisten sind unerreichbar → Steuerelemente nie in `overflow`-Container · Status nie nur per Farbe → immer Text dazu · Ein grüner Validator bei leerer Eingabe ist kein Nachweis → Substanzprüfung in allen Kernen.

## 6 · Portale

| Portal | Datei | Gruppe |
|---|---|---|
| Kundenportal | `Kundenportal.dc.html` | NeXify-Kunden, API-Kunden |
| Partnerportal | `Partnerportal.dc.html` | Werkstätten |
| Nachbarschaftsportal | `Nachbarschaftskunden-Portal.dc.html` | Endkunden |
| Affiliate-Portal | `Affiliate-Portal.dc.html` (neu) | Affiliates |
| Konto / Anmeldung | `Konto.dc.html`, `Anmeldung.dc.html` | alle |
| WebUI | `NeXify Workspace.dc.html` | Pascal, Team |
| Posteingang | `NeXify Posteingang.dc.html` (neu) | Pascal |
| Admin | `myADMIN.dc.html` | Pascal |

## 7 · Offen

- Adressen, Schlüssel, Modellnamen für Gateway, 9router, Resend, IMAP (Werte Pascal/Betrieb).
- Composio: nur ohne personenbezogene Kundendaten oder mit AVV/SCC (US-Anbieter).
- Cognee, Dify, Headroom: Status „prüfen“ – laufen sie bereits? Health-Endpunkte bestätigen.
- Provisionssatz Affiliate (E-Offen-2).
