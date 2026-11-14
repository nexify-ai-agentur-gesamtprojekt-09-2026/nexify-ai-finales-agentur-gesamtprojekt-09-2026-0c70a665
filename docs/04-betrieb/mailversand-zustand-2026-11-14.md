# Mailversand: gemessener Zustand · 14.11.2026

Zweck: Technischer Ausgangsstand für Kundenmailings über Resend (Register der offenen Arbeiten, OA-104 und OA-106). Reine Messung. Es wurde nichts versendet, kein Kontakt, keine Kampagne, kein Thema und kein DNS-Eintrag angelegt oder geändert.

Messzeit: 14.11.2026, 18:36 bis 18:45 UTC.

Messwege:

- Resend-Konto, nur lesend: `list-domains`, `get-domain` (zwei eigene Domains), `list-segments`, `list-topics`, `get-usage`, `list-templates`. Kontakte wurden nicht aufgelistet, Adressen nicht gelesen.
- DNS, nur lesend, über DNS-over-HTTPS bei zwei unabhängigen Auflösern (`dns.google/resolve` und `cloudflare-dns.com/dns-query`). `dig` ist in der Arbeitsumgebung nicht installiert. Beide Auflöser lieferten in jeder Abfrage dasselbe Ergebnis.
- Quelltext: Suche nach Resend-Aufrufen und Abmelde-Kopfzeilen in `apps/`, `packages/`, `config/` am Commit `2906f58`.

Was eine Messung hier nicht belegt: Zustellung im Posteingang, Reputation der Domain bei Postfachanbietern, Inhalt der bei Resend gespeicherten Vorlagen.

---

## 1. Resend-Konto

| Größe | Wert | Bedeutung für Kundenmailings |
|---|---|---|
| Mails im Monat | 0 von 50.000 gesendet | Das ist das Kontingent für Einzelversand über die Schnittstelle (Transaktionsmails). |
| Mails am Tag | 0, keine Tagesgrenze im Tarif | Die Grenze setzt nicht der Tarif, sondern Reputation und Richtlinie (siehe `docs/05-marketing/mailing/aufwaermplan.md`). |
| Kontakte | 1 von 1.000 | **Kampagnen („Broadcasts“) gehen an Kontakte. Das Konto fasst höchstens 1.000.** „50.000“ ist die Zahl der Mails, nicht die Zahl der Empfänger einer Kampagne. |
| Kampagnen (Broadcasts) | 0 | Es wurde noch keine Kampagne versendet. |
| Abmeldethemen (Topics) | 0 | Empfänger können heute nicht nach Thema wählen; es gibt nur „alles oder nichts“. |
| Segmente | 5: „General“ (06/2026), „Newsletter“, „Audit-Interessenten“, „Bestandskunden“, „Website-Leads“ (alle 14.08.2026) | Die Hüllen stammen aus einem früheren Stand. Bei 1 Kontakt im ganzen Konto sind sie praktisch leer. Ein Segmentname „Bestandskunden“ belegt keine Prüfung nach § 7 Abs. 3 UWG. |
| Vorlagen | 6, alle „published“, alle vom 14.08.2026: Newsletter, Audit-Bestätigung, Angebots-Follow-up, Welcome 1 bis 3 | Inhalt nicht gelesen und nicht geprüft. Sie sind älter als das Marketingkonzept vom 14.11.2026 und älter als die Entscheidung zum Produktnamen (D-011). Vor Verwendung prüfen oder ersetzen. |
| Absenderdomains | 4 von 10 | Eine zusätzliche Marketing-Subdomain hat Platz. |
| Anfragen je Sekunde | 10 | Für den Versand ohne Belang, solange die Mengen klein sind. |

Quelle der Einordnung „Mails“ gegen „Kontakte“: Resend-Dokumentation „Account Quotas and Limits“, <https://resend.com/docs/knowledge-base/account-quotas-and-limits>, Abruf 14.11.2026.

## 2. Absenderdomains bei Resend

| Domain | Status bei Resend | Region | Öffnungs-/Klickmessung | Einordnung |
|---|---|---|---|---|
| `nexifyai.cloud` | **verified** | eu-west-1 | an / an, Messdomain `angebot.nexifyai.cloud` | Trägt heute die Transaktionsmails der Website (`config/integrations/resend.json`). |
| `nexifyai.de` | **failed** | eu-west-1 | aus / aus | Am 09.11.2026 angelegt. Keiner der von Resend verlangten Einträge steht im DNS (Abschnitt 3). Von dieser Domain kann über Resend nicht gesendet werden. |
| Domain A eines Kundenprojekts | verified | eu-west-1 | aus / aus | Fremder Mandant. Name bewusst nicht genannt (`AGENTS.md`, Kundenprojekte). |
| Domain B eines Kundenprojekts | failed | eu-west-1 | aus / aus | Wie oben. |

Folge der gemeinsamen Kontoführung: Eine Sperre des Kontos wegen eines NeXify-Mailings träfe auch die Transaktionsmails der Website und den Mailversand des Kundenprojekts.

## 3. DNS: SPF, DKIM, DMARC

Namensserver beider Zonen: Cloudflare (`brynne` und `carmelo.ns.cloudflare.com`). Posteingang beider Domains: Hostinger (`mx1`/`mx2.hostinger.com`).

| Prüfpunkt | `nexifyai.cloud` | `nexifyai.de` |
|---|---|---|
| SPF auf der Hauptdomain (TXT) | **gesetzt:** `v=spf1 include:_spf.mail.hostinger.com include:amazonses.com ~all` | **gesetzt, aber ohne Resend:** `v=spf1 include:_spf.mail.hostinger.com ~all` |
| DKIM, Selektor laut Resend: `resend._domainkey` (TXT) | **gesetzt**, Schlüssel stimmt mit dem Resend-Eintrag überein | **fehlt** (Name existiert nicht) |
| Rücklaufpfad laut Resend: `send.<domain>` MX `feedback-smtp.eu-west-1.amazonses.com` | **im DNS nicht auffindbar** (Name vorhanden, kein MX-Eintrag) – siehe Befund B-1 | **fehlt** (Name existiert nicht) |
| Rücklaufpfad laut Resend: `send.<domain>` TXT `v=spf1 include:amazonses.com ~all` | **im DNS nicht auffindbar** (Name vorhanden, kein TXT-Eintrag) – siehe Befund B-1 | **fehlt** |
| Zusätzlicher Eintrag laut Resend: `rsend.<domain>` CNAME | von Resend für diese Domain nicht verlangt | **fehlt**; Resend führt ihn als „not_started“ |
| DMARC `_dmarc.<domain>` (TXT) | **gesetzt:** `v=DMARC1; p=quarantine; rua=mailto:…` (Berichtsadresse hier nicht wiedergegeben) | **gesetzt, schwächste Stufe:** `v=DMARC1; p=none`, ohne Berichtsadresse |
| Messdomain für Klicks | `angebot.nexifyai.cloud` CNAME auf Resend, gesetzt | keine |

### Befunde

- **B-1 · Rücklaufpfad von `nexifyai.cloud` stimmt nicht mit Resend überein.** Resend führt die beiden Einträge unter `send.nexifyai.cloud` (MX und SPF-TXT) als „verified“. Beide Auflöser fanden um 18:38 und 18:41 UTC unter diesem Namen weder MX noch TXT, CNAME oder A. Mögliche Erklärungen, hier nicht unterschieden: Die Einträge wurden nach der Verifizierung entfernt, oder Resend hat seinen Status seither nicht neu geprüft. Wirkung, solange es so bleibt: Die SPF-Prüfung der Absenderkennung im Umschlag kann nicht bestehen; DMARC hängt dann allein an DKIM. Für Einzelmails hat das bisher gereicht (`config/integrations/resend.json`, Abnahme 29.10.2026: „delivered“). Für Kampagnen ist das zu dünn. **Vor jeder Kampagne klären.** Zuständig: Inhaber (DNS-Zugang); nächste Aktion: die vier Einträge im Resend-Konto mit der Cloudflare-Zone vergleichen.
- **B-2 · `nexifyai.de` ist für Resend nicht eingerichtet.** DKIM, Rücklaufpfad und der zusätzliche CNAME fehlen vollständig. Das Register nannte als Ursache am 09.11.2026 die Parkserver des Registrars; heute liegt die Zone bei Cloudflare, die Einträge fehlen trotzdem.
- **B-3 · DMARC von `nexifyai.de` schützt nicht.** `p=none` ohne Berichtsadresse heißt: Es wird nichts abgewiesen und es kommen keine Berichte an. Als Startstufe ist `p=none` üblich, dann aber mit Berichtsadresse (Resend-Dokumentation zu DMARC).
- **B-4 · Die DMARC-Berichte von `nexifyai.cloud` gehen an ein Postfach außerhalb der eigenen Domains.** Ob dort jemand die Berichte auswertet, ist nicht belegt.
- **B-5 · Zwei SPF-Quellen auf `nexifyai.cloud`.** Der SPF-Eintrag der Hauptdomain erlaubt Hostinger und Amazon SES. Das ist zulässig, heißt aber: Die Hauptdomain trägt Postfach- und Versandreputation gemeinsam. Für Kampagnen spricht das für eine eigene Subdomain (`aufwaermplan.md`, Abschnitt 1).

## 4. Versandcode im Repository

Drei Stellen rufen Resend auf, alle über `POST https://api.resend.com/emails` (Einzelversand):

| Datei | Zweck | `List-Unsubscribe` | `List-Unsubscribe-Post` | Begrenzung |
|---|---|---|---|---|
| `apps/web/lib/mailing.ts` (Zeile 49) | Mailversand der Web-Anwendung | **nein** – der Aufruf kennt kein Feld `headers` | **nein** | keine eigene |
| `apps/shop-api/shop/mailer.py` (Zeile 70) | Postausgang des Shop-Dienstes mit Wiederholungsschutz | **nein** | **nein** | `MAIL_DAILY_CAP` |
| `apps/agent-gateway/integrations.py` (Zeile 80) | Anfrage- und Terminbestätigungen, interne Benachrichtigung | **nein** | **nein** | laut `config/integrations/resend.json`: 10 Mails je Tag, 3 je Empfänger und 5 je Besucher in 24 Stunden; Absender nur von `nexifyai.cloud` |

Weitere Feststellungen:

- Die Suche nach `list-unsubscribe`, `unsubscribe` und „abmeld“ findet in `apps/` nur Schalter „Abmelden“ der Benutzerkonten. Eine Abmeldung von Mailings gibt es im Code nicht.
- Kein Aufruf der Kampagnen-, Kontakt- oder Themenschnittstelle von Resend. Es gibt im Code keinen Kampagnenweg, keine Anmeldung mit Bestätigungsmail, keine Einwilligungstabelle und keine Sperrliste.
- `config/versand.json` (Stand 28.09.2026) beschreibt als Soll „One-Click (RFC 8058) + sichtbarer Link“ und Double-Opt-in. Das ist ein Zielbild, kein gebauter Stand; die Datei kennzeichnet ihre DNS-Werte selbst als ungeprüft.
- **Widerspruch der Grenzwerte:** `config/versand.json` nennt als Grenze 0,3 % Beschwerden und 5 % Rückläufer und eine Aufwärmstufe bis 5.000 je Tag. Resend verlangt unter 0,08 % und unter 4 % (Richtlinie, Stand 13.10.2026). Maßgeblich ist der strengere Wert des Anbieters. Die Datei wurde hier nicht geändert (außerhalb des Auftrags); Nachführung als eigene Aufgabe.

Für Transaktionsmails verlangt Resend die Abmelde-Kopfzeilen nicht. Für Massenmails gilt laut Resend-Dokumentation: `List-Unsubscribe` mit einer Internetadresse, dazu `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, und die Adresse muss einen `POST` annehmen (RFC 8058). Quelle: <https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails>, Abruf 14.11.2026.

## 5. Was daraus folgt

| Voraussetzung für eine Kampagne | Zustand |
|---|---|
| Verifizierte Absenderdomain | vorhanden nur `nexifyai.cloud`; dort laufen die Transaktionsmails |
| Eigene Marketing-Subdomain | fehlt |
| SPF, DKIM, DMARC widerspruchsfrei | `nexifyai.cloud`: DKIM und DMARC ja, Rücklaufpfad ungeklärt (B-1). `nexifyai.de`: nein |
| Abmelde-Kopfzeilen | fehlen im Code; bei Kampagnen über die Resend-Oberfläche stellt Resend den Abmeldeweg über seinen Platzhalter bereit (Dokumentation „Handle unsubscribes“), im eigenen Code nicht |
| Abmeldethemen | 0 |
| Empfänger mit belegter Einwilligung | 0 belegt (1 Kontakt ohne Nachweis) |
| Kampagnenweg getrennt vom Transaktionsweg | fehlt |

DNS-Einträge setzt nur der Inhaber. Diese Datei ist ein Messprotokoll und wird nicht fortgeschrieben; eine neue Messung bekommt eine neue Datei mit neuem Datum.
