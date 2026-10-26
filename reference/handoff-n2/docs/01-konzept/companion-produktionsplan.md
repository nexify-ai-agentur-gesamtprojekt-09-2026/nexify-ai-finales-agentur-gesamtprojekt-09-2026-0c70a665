# Companion überall · Frontend-Backend-Vereinigung · Produktionsplan

**Stand 27.09.2026 · Plan mit Nachweisstatus. Nichts davon ist in Produktion.**
Grundlage: `myadmin-gesamtplan.md`, `backend-architektur.md`, `nexifyai-api-abrechnungskonzept.md`, `go-live-abschlusstest-2026-09-27.md`, `autopilot/laufakte.json`, `lib/rechenkern.js` (18/18 Tests).

---

## 0 · Freigabe-Gate: „In Produktion stellen“ ist heute nicht ausführbar

| Stufe | Status | Was fehlt |
|---|---|---|
| 1 Vorschau | **FAIL** | `vorschau.nexifyai.cloud` existiert nicht, braucht Live-DNS → Einzelfreigabe Pascal |
| 2 Health 60 s | **FAIL** | kein laufendes Backend, nichts zu messen |
| 3 E3 | **teilweise** | nur Rechenkern (Positiv, Negativ, Grenzwert). Kein Rollback-Test, keine E2E über Portale |
| 4 Rollback-Plan | **Plan vorhanden**, nicht ausgeführt | – |
| 5 Gutachten + Endabnahme | Gutachten PARTIAL_BLOCKED, Endabnahme **offen** | Entscheidungen E1–E5 |

Erster Schritt: Einzelfreigabe Vorschau-Stufe + Entscheidungen E1–E5. Ohne sie bleibt jeder Schritt unten auf Stufe „gebaut, nicht live“.

---

## 1 · Der Companion (ein Assistent, überall derselbe)

**Ein Kern, viele Kanäle.** Der Companion ist kein Chatfenster, sondern der Director aus dem Gesamtplan mit einer Identität, einem Gedächtnis und festen Regeln. Jeder Kanal ist nur ein Ein- und Ausgang.

| Kanal | Eingang | Ausgang | Mensch vor Außenwirkung |
|---|---|---|---|
| Website / Portale | Berater-Widget | Antwort, Termin, Angebotsentwurf | Angebot: Pascal |
| myADMIN | Befehlszeile, Tags | Aufgaben, Entwürfe, Berichte | – |
| Mail (mail@nexifyai.cloud) | Hostinger Mail API, Tag im Betreff | **Entwurf**, kein Versand ohne Freigabe | ja, immer |
| WhatsApp | Meta Cloud API (B-06) | Antwort mit KI-Kennzeichnung | ab Stufe „heikel“ |
| Telefon / Call-Raum | Mitschrift | Zusammenfassung, Aufgaben | – |
| Video | Mitschrift nach Upload | Zusammenfassung, Kapitel | – |
| Kalender | Einladungen | Vorbereitung, Nachbereitung | – |
| Dokumente | neue Datei in Ablage | Einordnung, Kurzfassung | – |

**Regeln, die in jedem Kanal gleich gelten:**
- KI-Kennzeichnung beim Erstkontakt (Art. 50 KI-VO).
- Keine Preise im Chat, keine Rechtsberatung, kein Versand in Pascals Namen ohne Freigabe.
- Kundendaten strikt getrennt. LightRAG hat heute **keinen** Mandanten-Workspace → bis zur Entscheidung keine Kundendaten ins gemeinsame Wissen (G6/M).
- Ton: Stimmprofil aus Pascals gesendeten Texten, sobald eingerichtet (Antwort „später mit E-Mail/Slack“).
- „Außerhalb meiner Chats“ heißt: Der Companion liest und entwirft. Er schickt nichts selbst ab, bevor die Regel für diesen Kanal freigegeben ist.

**Gedächtnis:** AgentMemory = Ereignisse und Beschlüsse. LightRAG = Wissen mit Fundstelle. Jede Antwort nennt, woher eine Tatsache stammt.

---

## 2 · Die 15 Abläufe, die sich gegenseitig mit Daten versorgen

Jeder Ablauf schreibt sein Ergebnis in denselben Ereignis-Speicher. Der nächste Ablauf liest von dort, nicht aus einem Chat. So entsteht der Kreislauf „sammeln → nutzen → verbessern“.

| # | Ablauf | Liest | Schreibt | Auslöser |
|---|---|---|---|---|
| W01 | Eingang einordnen | Mail, Formular, Chat | Vorgang + Tag | jede Nachricht |
| W02 | Anfrage → Angebot | Vorgang, Preise | Angebotsentwurf | `#anfrage` |
| W03 | Angebot → Auftrag | Annahme | Auftrag, Termine | Annahme im Portal |
| W04 | Auftrag → Lieferung | Auftrag, Vorlagen | Ergebnis, Tests | Status „in Arbeit“ |
| W05 | Tagesbericht | Zeiten, Ergebnisse | Bericht an Kunde | 19:30 |
| W06 | Abrechnung | Journal (Rechenkern) | Rechnung | Monatsschnitt |
| W07 | Mahnung | offene Posten | Erinnerung | Fälligkeit + 14 T |
| W08 | Werkstatt aufnehmen | Registrierung | Partnerprofil, Seite | `#werkstatt` |
| W09 | Termin Nachbarschaftskunde | Kalender Werkstatt | Buchung, Erinnerung | Buchung |
| W10 | Gutschein | Bestellung, Einlösung | Code, Status | Bestellung |
| W11 | Affiliate-Provision | Zahlungen, Klicks | Gutschrift | Zahlungseingang |
| W12 | Datenrechte | Anfrage Art. 15–21 | Export / Löschnachweis | `#dsgvo` |
| W13 | Vorfall | Wächter | Einstufung, Bericht | Alarm |
| W14 | Wissen einsammeln | Dokumente, Mitschriften, Beschlüsse | LightRAG-Einträge mit Fundstelle | neue Datei, 45 Min |
| W15 | Optimieren | Kosten, Erfolg aller W | Vorschlag + Test | wöchentlich |

**Kreislauf:** W01–W13 erzeugen Daten → W14 macht daraus Wissen → alle W nutzen das Wissen → W15 misst und schlägt Verbesserungen vor → nur mit bestandenem Fragentest übernommen.

**Technik je Ablauf:** n8n (bestehend) als Orchestrierung, je Schritt Idempotenz-Schlüssel, Timeout, Backoff, Wiederaufnahme. Geld nur über den Rechenkern.

---

## 3 · Frontend-Backend-Vereinigung

| Frontend (fertig als Entwurf) | Backend-Endpunkt | Status |
|---|---|---|
| Agentur-Seite v10 | Kontakt, Berater, Termine | Vertrag beschrieben, nicht gebaut |
| TEILEKLAR Shop, Fitment, Batterie | Produktdaten, Suche | nicht gebaut |
| Anmeldung, Konto | Auth + Rollen + RLS | nicht gebaut |
| Kundenportal | Aufträge, Angebote, Rechnungen, API-Verbrauch | nicht gebaut |
| Partnerportal | Termine, Gutscheine, Profil | nicht gebaut |
| Nachbarschaftsportal | Buchung, Gutscheine, Datenrechte | nicht gebaut |
| myADMIN v2 | alle 19 Bereiche | Oberfläche geprüft (19/19, 0 Fehler), Daten simuliert |
| Rechenkern | Abrechnung | **gebaut, 18/18 Tests** |

**Reihenfolge:** Auth/RLS → Buchungskern → Kundenportal → Partner → Nachbarschaft → Shop → Companion-Kanäle (Website, dann Mail-Entwürfe, dann WhatsApp) → W14/W15.

Jede Stufe: Vorschau → 60 s Health → E3 → Rollback ausgeführt → Nachweis-Zeile → Endabnahme.

---

## 4 · Nutzererlebnis und Stil (Ist)

- Design-Norm, Tokens, CD-Fortschreibung (Lime `#D7FA50`, Grund `#242826`, Geist am Bildschirm, Helvetica im PDF) angewendet.
- myADMIN: 19 Bereiche, Umbruch-Raster, keine Überläufe bei 924 px (automatisch geprüft, Sichtprüfung läuft).
- Offen: Tastaturweg und Screenreader in den Portalen nicht geprüft. Kontrast Portale nicht vollständig nachgerechnet.

---

## 5 · Zertifizierungsstand (ehrlich)

| Bereich | Urteil |
|---|---|
| Rechenkern | E3 teilweise (Rollback fehlt) |
| Oberflächen | E2 (automatisierte Sichtmessung) |
| Backend | NOT_ASSESSED (nicht gebaut) |
| Companion | NOT_ASSESSED (nicht gebaut) |
| Gesamt | **NOT_READY** für Produktion |

---

## 6 · Von Pascal gebraucht

1. Einzelfreigabe: Vorschau-Stufe anlegen (Live-DNS).
2. Entscheidungen E1–E5.
3. Mandantentrennung LightRAG: eigene Instanz je Kunde oder keine Kundendaten.
4. Welche Kanäle darf der Companion selbst beantworten, ohne Freigabe? (Vorschlag: nur Website-Berater, nur Termin und Auskunft.)
5. Stimmprofil einrichten (Zugriff auf gesendete Mails).
