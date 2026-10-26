# Clerk-DNS für nexifyai.de

Lesender Snapshot vom **26.10.2026**; genaue UTC-Zeitpunkte, URLs, HTTP-Codes,
DNS-Antworten und SHA-256 stehen in [`config/clerk-dns.json`](../../config/clerk-dns.json).
Die fünf Sollziele stammen ausdrücklich vom Nutzer. Sie sind keine geratenen
Werte und wurden hier nicht zusätzlich im angemeldeten Clerk-Dashboard geprüft.

## Ergebnis

Google Public DNS und Cloudflare DNS lieferten bei allen fünf CNAME-Abfragen
HTTP **200**, aber DNS-Status **3 / NXDOMAIN**. Daher fehlen die Einträge zum
Beobachtungszeitpunkt in beiden öffentlichen Resolveransichten.
HTTP-Erreichbarkeit des Resolvers bedeutet nicht, dass der DNS-Eintrag existiert.
**Fehlend: alle fünf CNAMEs. Vorhanden mit falschem Ziel: keiner beobachtet.**

| Typ | Name innerhalb der Zone nexifyai.de | Exaktes gewünschtes Ziel | Beobachtet |
|---|---|---|---|
| CNAME | `accounts` | `accounts.clerk.services` | fehlt |
| CNAME | `clerk` | `frontend-api.clerk.services` | fehlt |
| CNAME | `clk._domainkey` | `dkim1.9vt6e46tlcwh.clerk.services` | fehlt |
| CNAME | `clk2._domainkey` | `dkim2.9vt6e46tlcwh.clerk.services` | fehlt |
| CNAME | `clkmail` | `mail.9vt6e46tlcwh.clerk.services` | fehlt |

Beide Resolver und die öffentliche DENIC-RDAP-Antwort nennen
`ns1.dns-parking.com` und `ns2.dns-parking.com` als Nameserver. Die SOA nennt
zusätzlich `dns.hostinger.com`. Das deutet auf den DNS-Hostingkontext hin,
beweist jedoch weder einen Registrar noch einen angemeldeten Panelzugriff.
DENIC-RDAP antwortet HTTP 200 und Domainstatus `active`, gibt aber keine
Registrar-Entity aus (`entities: []`). **Der Registrar bleibt hier unbekannt.**
Der ebenfalls erfolgreich gelesene IANA-RDAP-Bootstrap enthält keine `.de`-
Servicezuordnung; er liefert keinen zusätzlichen Registrar-Nachweis.

Unter `_dmarc.nexifyai.de` besteht bereits genau eine übereinstimmend beobachtete
TXT-Policy: **`v=DMARC1; p=none`**, TTL 3600. Die Resolver verwenden unterschiedliche
TXT-Darstellungsanführungszeichen; der Inhalt ist gleich. Das ist eine bestehende
DMARC-Policy ohne angeforderte Quarantäne-/Reject-Verschärfung. Hier ist keine
DMARC-Änderung vorgesehen, und es darf kein zweiter DMARC-Record ergänzt werden.

## Manuelle Umsetzung mit echtem DNS-Zugriff

1. Die DNS-Zone **nexifyai.de** im tatsächlich zuständigen DNS-Panel öffnen.
   Vor einer Änderung alle bestehenden Einträge sichern; Registry, Registrar,
   DNS-Hoster und Website-Hoster nicht miteinander gleichsetzen.
2. In der richtigen Clerk-Produktionsinstanz die fünf Name-/Typ-/Zielpaare unter
   **Domains** mit obiger Nutzerangabe abgleichen. Eine Abweichung ausdrücklich
   auflösen, statt einen fremden Instanzwert zu übernehmen.
3. Die fünf CNAMEs anlegen. Bei relativem Namensfeld nur die zweite Tabellenspalte
   eintragen; ergänzt das Panel die Zone nicht selbst, den vollständigen Namen
   verwenden, beispielsweise `clk._domainkey.nexifyai.de`. Keine doppelte Zone
   anhängen. Ziel jeweils exakt wie in der Tabelle, ohne URL-Schema oder Pfad.
   TTL auf der vorhandenen zulässigen Panelvorgabe belassen, sofern kein konkreter
   Änderungsgrund besteht.
4. Falls am jeweiligen Namen ein widersprechender Eintrag sichtbar wird,
   zunächst seine Herkunft und Verwendung prüfen. Keine vorhandenen MX-,
   SPF-, DKIM-, Verifikations- oder DMARC-Einträge pauschal entfernen. Den oben
   belegten DMARC-Record beibehalten. Falls das verwendete Panel überhaupt
   Proxying anbietet, Clerk-CNAMEs als **DNS only** führen.
5. Nach Speicherung erneut beide öffentlichen Resolver abfragen. Die bisherigen
   negativen Antworten enthalten SOA-Negativ-TTL 600; DNS-Caches können daher
   zunächst noch den alten Stand zeigen. Erst zwei erfolgreiche, genau passende
   Antworten als `exact` erfassen. Fehler oder widersprüchliche Antworten bleiben
   `unknown`; ein vorhandenes anderes Ziel ist `wrong`.
6. Danach die Clerk-Dashboardprüfung und dort angebotene Zertifikatsbereitstellung
   abschließen. HTTPS und die tatsächliche Anmeldung gesondert prüfen. Ein
   passender DNS-Eintrag allein beweist keine funktionsfähige Produktionsanmeldung.

Es wurden **16 öffentliche HTTPS-GETs mit HTTP 200** ausgeführt: je zwei Resolver
für fünf CNAMEs, Nameserver und DMARC, außerdem DENIC-RDAP und IANA-Bootstrap.
Dies sind rekursive Resolverbeobachtungen; es fand keine direkte Abfrage eines
autoritativen DNS-Servers statt. Alle 16 Response-Hashes wurden gegen die lokal
gehaltenen öffentlichen Rohantworten geprüft. Kein DNS-Schreibzugriff, keine
Benutzeranlage, kein Secret und keine bezahlte API-Anfrage wurden verwendet.

## Benötigter Zugang für eine automatische Änderung

Hier ist kein DNS-Connector verbunden und kein schreibberechtigter Zugang
nachgewiesen. Der DNS-Hosterhinweis passt zu Hostinger; zunächst dort die Zone
im tatsächlich zuständigen Konto bestätigen. Für eine direkte Bearbeitung den
Hostinger-MCP-Connector `https://mcp.hostinger.com` im Connectorbereich verbinden
und für das Konto mit Zugriff auf `nexifyai.de` autorisieren. Alternativ einen
auf diese DNS-Zone begrenzten API-Zugang im sicheren Umgebungs-/Secret-Speicher
bereitstellen. Keine Schlüssel im Chat senden. Anschließend zunächst Zone und
bestehende Mail-/Verifikationseinträge lesen und sichern, nur die fünf freigegebenen
CNAMEs setzen und den tatsächlichen Stand zurücklesen. Ein bloßer Nameserver-
Hinweis oder ein nicht gebundener API-Variablenname ist kein Schreibzugriff.
