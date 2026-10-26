# TEILEKLAR — Authentifizierung, Autorisierung und Rollen

**Version 1.0 · Stand 31.08.2026**
Verbindliche Spezifikation. Ergänzt `docs/03-backend/backend-und-datenbank.md` (Datenmodell, API, Sicherheit) und `docs/04-betrieb/betriebslogik-und-prozesse.md` (Rollen im Alltag).

---

## 1. Grundsätze

1. **Kein Konto für den Kauf.** Bestellen ist als Gast möglich. Ein Konto bringt Vorteile (Garage, Bestellhistorie, Unterlagen), ist aber niemals Voraussetzung.
2. **Kein Passwort, wenn es ohne geht.** Standard ist der E-Mail-Einmallink (Magic Link). Passwörter existieren nur für Partner- und Verwaltungskonten, dort mit zweitem Faktor.
3. **Rollen entscheiden, nicht Vermutungen.** Jede API-Anfrage wird gegen eine explizite Rollen- und Besitzprüfung geführt. Kein „wer den Link hat, darf".
4. **B2B erst nach Prüfung.** Nettopreise, Zahlungsziel und Mehrbenutzerrechte werden erst nach bestätigter Unternehmens- und USt-IdNr.-Prüfung freigeschaltet (Rechtsmodell: B2C und B2B mit getrennten Abläufen).
5. **Sicherheitsrelevante Freigaben bleiben menschlich.** KLARA berät, gibt aber keine Passung frei und ändert keine Rollen.

---

## 2. Kontoarten

| Konto | Anmeldung | Zweiter Faktor | Zweck |
|---|---|---|---|
| **Gast** | keine | — | Bestellen ohne Konto; Zugriff auf die eigene Bestellung über signierten Link mit Ablauf |
| **Privatkonto** | E-Mail-Einmallink | optional (TOTP) | Garage, Bestellhistorie, Rechnungen, Einwilligungen |
| **Geschäftskonto (Pro)** | E-Mail + Passwort | **Pflicht** (TOTP) | Nettopreise, Zahlungsziel, mehrere Benutzer, Freigabegrenzen |
| **Werkstattpartner** | E-Mail + Passwort | **Pflicht** (TOTP) | Aufträge annehmen, Termine bestätigen, Rückmeldung geben |
| **Redaktion** | E-Mail + Passwort | **Pflicht** | Artikel- und Ratgeberfreigabe, Statusänderungen |
| **Verwaltung (Admin)** | E-Mail + Passwort | **Pflicht** (TOTP + Wiederherstellungscodes) | Rollen, Märkte, Rechtstexte, Sperrungen |

---

## 3. Anmeldeverfahren

### 3.1 E-Mail-Einmallink (Privatkonto)

```
POST /auth/magic-link      { email }                 → 202 (immer, ohne Auskunft über Existenz)
GET  /auth/callback?token=…                          → Sitzung, Weiterleitung
```

- Token: 32 Byte Zufall, **nur als Hash** gespeichert (`sha256`), Gültigkeit **10 Minuten**, **einmalige** Verwendung, gebunden an E-Mail und Markt.
- Ratenbegrenzung: 3 Anfragen je E-Mail und 10 je IP pro Stunde.
- Antwort immer identisch — keine Aussage darüber, ob die Adresse existiert (Schutz vor Kontoaufzählung).
- Nach Einlösung: Sitzung wird erzeugt, Token wird als verbraucht markiert.

### 3.2 Passwort (Partner, Redaktion, Verwaltung)

- Hashverfahren **Argon2id** (`memory 64 MiB`, `iterations 3`, `parallelism 4`); kein bcrypt für neue Konten.
- Mindestlänge 12 Zeichen, Abgleich gegen eine Liste bekannter geleakter Passwörter, keine erzwungene Rotation ohne Anlass.
- Fehlversuche: nach 5 Fehlschlägen exponentielle Verzögerung, nach 10 Sperre für 15 Minuten, Benachrichtigung an die Kontoadresse.
- Zweiter Faktor **TOTP** (RFC 6238, 30 s, 6 Ziffern), acht einmalige Wiederherstellungscodes bei Einrichtung.

### 3.3 Sitzungen

| Merkmal | Wert |
|---|---|
| Zugriffstoken | JWT, **15 Minuten**, `RS256`, Claims: `sub`, `role`, `market`, `org?`, `jti` |
| Erneuerungstoken | opaque, **30 Tage**, rotierend, in der Datenbank gehasht |
| Übertragung | Cookie `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Wiederverwendung | erkanntes wiederverwendetes Erneuerungstoken **beendet die gesamte Sitzungsfamilie** und benachrichtigt den Kontoinhaber |
| Abmeldung | löscht Erneuerungstoken serverseitig; `jti` landet auf der Sperrliste bis zum Ablauf |
| Gerätebindung | Sitzung speichert IP-Netz und Gerätekennung; Wechsel erzwingt Neuanmeldung bei Partner-, Redaktions- und Verwaltungskonten |

### 3.4 Gastzugang zur Bestellung

```
GET /orders/{id}?t=<signatur>
```
Signatur `HMAC-SHA256` über `order_id + email + exp`, Gültigkeit **30 Tage**, nur lesend, kein Zugriff auf andere Bestellungen. Kein Rechteausbau möglich.

---

## 4. Rollen und Rechte

```
gast          → eigene Bestellung lesen (signierter Link)
kunde         → eigene Garage, Bestellungen, Einwilligungen, Datenrechte
pro_mitglied  → wie kunde + Nettopreise, Bestellung im Rahmen des Limits
pro_freigeber → wie pro_mitglied + Freigabe von Bestellungen über Limit
werkstatt     → zugewiesene Aufträge lesen/annehmen/terminieren, Rückmeldung
redaktion     → Artikel/Ratgeber: Entwurf, Prüfung, Freigabe, Sperrung
admin         → Rollen, Märkte, Rechtstexte, Sperrungen, Datenexport
```

**Durchsetzung:** Rollenprüfung **und** Besitzprüfung. Beispiel Bestellung lesen:

```
erlaubt, wenn:
  order.customer_id == session.sub                        (Kunde)
  ODER order.org_id == session.org  UND rolle ∈ {pro_*}   (Geschäftskonto)
  ODER order.id ∈ zugewiesene Aufträge UND rolle=werkstatt
  ODER rolle=admin (mit Protokolleintrag)
sonst 404 (nicht 403 — keine Existenzauskunft)
```

Jede Rollenänderung und jeder Admin-Zugriff auf Kundendaten wird in `audit_log` mit Akteur, Ziel, Grund und Zeitstempel geschrieben. Protokoll ist nicht löschbar, Aufbewahrung 12 Monate.

---

## 5. Geschäftskonto-Prüfung (B2B-Gate)

1. Antrag mit Firmenname, Anschrift, USt-IdNr., Ansprechpartner.
2. Automatische Formatprüfung der USt-IdNr. je Land; Abgleich gegen das EU-Bestätigungsverfahren (VIES) mit Protokollierung von Datum und Ergebnis.
3. Bis zur Bestätigung gilt das Konto als Privatkonto (Bruttopreise, kein Zahlungsziel).
4. Bei Bestätigung: Rolle `pro_mitglied`, Zahlungsziel und Limit nach Bonitätsentscheid, Reverse-Charge-Kennzeichnung je Markt.
5. Ablehnung wird begründet und protokolliert; erneuter Antrag jederzeit möglich.

---

## 6. Datenschutz und Nutzerrechte

| Recht | Umsetzung | Frist |
|---|---|---|
| Auskunft | Selbstbedienung im Konto: Export als JSON und PDF | sofort |
| Berichtigung | im Konto änderbar; Rechnungsdaten nur mit Beleg | sofort |
| Löschung | Konto löschen im Konto; Bestellungen werden pseudonymisiert (Aufbewahrungspflicht) | 30 Tage |
| Datenübertragbarkeit | derselbe JSON-Export | sofort |
| Widerspruch/Einwilligung | Einwilligungen einzeln widerrufbar, Wirkung sofort | sofort |

Einwilligungen werden versioniert gespeichert (`consent` mit Zweck, Fassung, Zeitpunkt, Quelle) — nachweisbar, wer wann wozu zugestimmt hat.

---

## 7. Was der Nutzer sieht

- **Anmelden:** ein Feld (E-Mail), ein Knopf, ein Hinweis „Wir schicken dir einen Link — kein Passwort nötig."
- **Fehlerfall:** nie „Konto existiert nicht", sondern „Wenn diese Adresse bei uns liegt, ist der Link unterwegs."
- **Sitzungsende:** stille Erneuerung; erst wenn das nicht mehr geht, freundlicher Hinweis mit Rückkehr an dieselbe Stelle.
- **Zweiter Faktor:** nur dort, wo er Pflicht ist, mit Erklärung, warum.

Alle Texte in de/nl/fr nach den Sprachregeln in `docs/01-konzept/designsystem.md` §6.

---

## 8. Abnahmekriterien

1. Gastbestellung ohne Konto vollständig durchführbar.
2. Einmallink: 10 Minuten Gültigkeit, einmalige Verwendung, identische Antwort für existierende und unbekannte Adressen — automatisiert geprüft.
3. Erneuerungstoken-Wiederverwendung beendet nachweislich die Sitzungsfamilie.
4. Rollenmatrix in Abschnitt 4 durch Integrationstests abgedeckt: je Rolle ein erlaubter und ein verbotener Zugriff.
5. Kein Endpunkt gibt 403 statt 404 bei fremden Objekten.
6. Argon2id-Parameter und TOTP-Pflicht je Rolle im Code als Konfiguration nachweisbar.
7. `audit_log` enthält jeden Admin-Zugriff auf Kundendaten.
8. Löschlauf pseudonymisiert korrekt und lässt die Buchhaltung vollständig.
