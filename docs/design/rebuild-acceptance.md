# Rekonstruktion nach verworfenem Stand · 26.10.2026

## Auftrag und Nichtkonformität

Der Nutzer hat die bisherige Oberfläche ausdrücklich verworfen. Die neuere
Konzeptgrafik ist eine visuelle Idee, kein exportierbares Produkt. Ihre Umsetzung
darf deshalb nicht vom Vorliegen eines Codeexports abhängig gemacht werden.
Die Originalprototypen bleiben die fachlichen und historischen Quellen; neue
Nutzerentscheidungen haben Vorrang. `config/rebuild-source-map.json` bewahrt die
Zuordnung, ersetzt aber keine vollständige fachliche Portierung.

Der verworfene Stand wich mit einer beschnittenen Portraitkarte, großen leeren
Videoflächen, wiederholten Einstiegstexten und wenig differenzierten Folgeseiten
von der Erwartung ab. Ein bestandener Prototypen-Audit hat die tatsächliche
React-Oberfläche und deren gestalterische Abnahme nicht nachgewiesen. Diese
Verwechslung ist die zu korrigierende Prüflücke.

## Konkrete Abnahme

| Gegenstand | Umsetzung / Nachweis | Zuständigkeit / Grenze |
| --- | --- | --- |
| Hero | Offene Bühne, lesbare Typografie, drei Begleiter, erkennbare zwei nächste Schritte; Desktop und Mobil im Browser prüfen | Frontend; Nutzerabnahme offen |
| Medien | Keine großen Leerflächen für nicht vorhandene Clips. Video erst mit tatsächlicher Datei und Untertiteln | Medienproduktion; Figurenbild ist neu erzeugter Entwurf, kein fertiger Film |
| Inhalt | Vorhandene Sektionen und Erklärtexte erhalten; Quelle und Ziel pro Prototyp nachverfolgen | Produktredaktion; statische Inventarisierung ist keine vollständige Umsetzung |
| Agentenbereich | Status nur aus Verbindung und tatsächlichen Ergebnissen; Auswahl darf auch offline erkundet werden, Mutationen bleiben gesperrt | Backend/Frontend; kein vorgetäuschter Live-Agent |
| Identität | AIFly Oracle ist laut Konzeptgrafik die Kugelfigur; unbestätigte Figurennamen oder Partnerbeziehungen nicht erfinden | Marke; Bestätigung weiterer Zuordnungen offen |
| Zugänglichkeit | Tastatur/Fokus, mobile Dialogführung, mindestens 44px Bedienziele, Reduced Motion, kein horizontaler Überlauf | Qualität; Browserprüfung zusätzlich zum bestehenden Prototypenaudit |
| Selfservice | Offene Registrierung als Produktregel, 24h Suite, BYOK oder bestätigtes 5-Euro-Testguthaben, Bestand bei Konvertierung erhalten | Produkt/Finanzen/Sicherheit; echte Clerk-/Vault-/Zahlungsadapter noch offen |
| Normen | Anforderungen mit Geltungsbereich, Quelle, Nachweis und Restlücke in `config/standards-applicability.json` führen | Qualitätsverantwortung; keine Zertifizierung oder pauschale Konformität behaupten |
| Veröffentlichung | Getrennte Rekonstruktionsvorschau; verworfenen Stand nicht als abgenommen kennzeichnen | Release; keine automatische neue Bindung der .de oder Umstellung der .cloud |

## Herkunft des neuen Figurenentwurfs

`apps/web/public/media/presenters/hero-trio.png` wurde am 26.10.2026 mit dem
Bildwerkzeug aus der vom Nutzer bereitgestellten Konzeptgrafik als transparenter
Figurenentwurf erzeugt. Das Ausgangsbild ist keine behauptete vorhandene
Video-/Runwaydatei. Die Ausgabe wurde als RGBA-Datei mit 1536×1024 Pixeln geprüft.
SHA256: `76969135f5eee86871a7da2ea09829786f9366ce34cd8bdac9432b6e0c4a9bc4`.
Die Datei wird in die lokale HTML-Vorschau eingebettet, damit deren Nutzung nicht
von der offenbar fehlerhaften Bildanzeige im Chat abhängt. Ähnlichkeit und
Markenwirkung bleiben Gegenstand der visuellen Prüfung.

## Selfservice vor echter Providerfreigabe

Der neue SQLite-Domainkern ist eine lokale Implementierung, kein produktiver
Clerk-/Zahlungs-/Vaultdienst. Ein Liveadapter muss den Kostenhöchstbetrag serverseitig
aus der konkreten Anfrage berechnen und Anfrage, Modell, Tarifversion und
Providerlimits daran binden. Ein bloß übergebener Maximalbetrag und ein später
abgewiesenes Settlement verhindern noch keine bereits entstandenen Providerkosten.
Diese Adapterprüfung ist Voraussetzung vor kostenpflichtigem Dispatch.

## Prüfreihenfolge

1. Syntax, Typen und bestehende Quell-/Privatheitsgrenzen.
2. Verhaltensprüfungen einschließlich negativer Auth-/Tenant-/Replayfälle.
3. Browserprüfung der tatsächlich gebauten Oberfläche auf Desktop und Mobil.
4. Unabhängige Gegenprüfung; Findings beheben und gezielt erneut prüfen.
5. Nutzerseitige gestalterische Abnahme und unveränderte Releasegates.

Archivzweig `archive/rejected-ui-2026-10-26` erhält den verworfenen Stand.
Der Rekonstruktionszweig ist `factory/source-faithful-rebuild-2026-10-26`.


## Technische Prüfungen dieses Zwischenstands

146 Pythonprüfungen (einschließlich 13 neuer Domainfälle), 16 Site-Contracts,
React-Build/Standalone und Next-Typecheck bestanden. `make check`, `make test`,
`make check-arch` und `make e2e` sind grün. Der bestehende Designaudit prüft
historische Prototypen; er wird ausdrücklich nicht als visueller React-Nachweis
verwendet. Der neue Browsernachweis wird getrennt erfasst.

Der Build meldet einen 500-KB-Chunkhinweis (Entry 500,42 KB, gzip 138,72 KB).
Das ist ein offenes Leistungsbudget vor Produktionsabnahme; Warnschwelle wurde
nicht angehoben. Die HTML-Einzeldatei ist eine Offlinevorschau, kein aktiver
Ersatz für die noch unverbundenen Serverdienste.
