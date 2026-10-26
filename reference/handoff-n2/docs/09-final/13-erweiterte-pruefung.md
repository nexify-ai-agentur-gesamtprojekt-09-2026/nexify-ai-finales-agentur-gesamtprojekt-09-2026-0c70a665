# 13 · Erweiterte Prüfung: SEO, Technik, Logik, Portale, Mobil (Stand 2026-09-29)

Ergänzt `12-abweichungsbericht.md` (Design/i18n) um die Bereiche SEO, Technik/Performance, Betriebs- und Seitenlogik, Portale und Mobil. Prüfart: statische Quelltextprüfung und Durchsicht; **nicht** gerendert und **nicht** im Browser durchgeklickt.

## 1 · Behoben in dieser Runde
| Bereich | Befund | Maßnahme |
|---|---|---|
| Technik | Beim Vereinheitlichen der Schatten war an ~200 Stellen ein Platzhalter (`$1`) im Quelltext gelandet und hatte Schatten/Kopfteile entfernt | Alle Stellen wiederhergestellt (Karten-, Button-, Kleinkarten-Schatten); Rest-Zählung 0 (ein legitimes `$1` in einer Telefon-Formatierung bleibt) |
| Technik | Doppelte Köpfe (eigener Kopf zusätzlich zum gemeinsamen) in Kundenportal, Batterie-Berater, Fitment-Checker, Reifenrechner | Eigene Köpfe entfernt; einzige Marke/Menü = NX-Header |
| Design/Kontrast | Textlinks in `#4A5C10` (dunkles Papier-Lime) auf dunklem Grund, Kontrast unter 2 : 1; Hover-Rahmen `#14191C` (fast schwarz auf Graphit) | Links `#D7FA50`, Hover `#D7FA50`, `accent-color` Lime |
| Design | Schatten in Karten/Buttons durch späteres `box-shadow:none` überschrieben | Überschreibungen entfernt |
| SEO | Portale, Konto, Anmeldung, Kundenwege, Workspace, Leitstand, Posteingang, Designsystem ohne `robots` | `noindex,nofollow` gesetzt |
| SEO | Rechtliches stand auf `noindex` (Impressum/Datenschutz müssen auffindbar sein) | `index,follow` + strukturierte Daten (WebPage) |
| SEO | Fehlende Meta-Beschreibungen (8 Seiten) | ergänzt |
| SEO | API-Seite ohne Open Graph und strukturierte Daten | og:* und `WebAPI`-JSON-LD ergänzt |
| Portal | Kundenportal: keine Rechnungs-Downloads, keine Angebotsablehnung, keine Anpassungsanfrage | PDF laden (Angebot, Rechnung), Ablehnen mit Dialog (Grund optional), Anpassung anfragen (Pflichtbeschreibung ≥ 12 Zeichen), Status „Abgelehnt“ / „Anpassung angefragt“, Bestätigung per Hinweis |
| Portal | Partnerportal/Nachbarschaftskunden-Portal: Dokument-Listen ohne funktionierenden Download; Partnerportal ohne Gutschrift | Download in Dokumenten, Belegen und Partner-Rechnungen; Gutschrift G-2026-08-PB-014 als Dokument |
| Mobil | Keine responsiven Regeln in 24 von 30 Seiten | Gemeinsamer Mobilblock (`#nx-mobil`) in 28 Seiten: Überschriften, Innenabstände, Zweispalter → einspaltig, Eingabefelder 16 px (kein iOS-Zoom), Tabellen/Code verkleinert |
| UX | Anmeldung: Bildschirmwähler dominierte die Seite; H1 bis 96 px in 520-px-Karte; 4-px-Radien | Wähler als Aufklapper „Bildschirm wechseln (Prototyp)“; H1 30–48 px; Radien 14–20 px; Schritt-Chips als Pillen |

## 2 · Offen (nach Priorität)
1. **Browser-Prüfung** der geänderten Seiten bei 320/768/1440 px – heute nur Ladeprüfung ohne Konsolenfehler.
2. **App-Shells** (Workspace, myADMIN, Leitstand, Posteingang): Seitenleisten mit fester Breite sind auf 320 px nicht behandelt; braucht eine echte Mobilnavigation (Menüknopf, Drawer).
3. **Workspace-Logik** inhaltlich nicht geprüft (Aufgaben, Freigaben, Rechte). Als eigener Prüfauftrag anlegen.
4. **Angebots- und Bestelllogik:** Kundenportal-Annahme führt in `Kundenwege` (Button-Lösung geprüft im Shop, nicht in `Kundenwege`); Preisrechnung des Angebots-Generators und Cent-Rundung nicht getestet.
5. **HTML-Mails und Geschäftsdokumente:** Vorlagen sind vorhanden; Prüfung auf Client-Kompatibilität (Outlook), Pflichtangaben (§ 14 UStG, § 35a GmbHG falls Rechtsform) und Preisstände steht aus.
6. **SEO:** `canonical` und `hreflang` fehlen, weil die endgültige URL-Struktur nicht festgelegt ist; `sitemap.xml`/`robots.txt` sind Backend-Aufgabe. Je Ansicht steht genau ein sichtbares `<h1>` (bedingt gerendert) – Kundenwege 14, TEILEKLAR 19 zählen die Ansichten, nicht gleichzeitige Überschriften; im Browser bestätigen.
7. **Performance:** Es gibt keine Fotos (nur SVG-Signet und gekennzeichnete Bildplätze), daher kein Lazy-Loading nötig. TEILEKLAR Shop ist 635 KB Quelltext in einer Datei; im Produkt in Module und Daten trennen. Google-Fonts-Einbindung durch selbst gehostete Schriften ersetzen (DSGVO, Ladezeit).
8. **Rechtsseiten:** Texte sind Entwurf 0.9; Abgleich mit den tatsächlichen Leistungen (one/one+, API-Prepaid, Shop, Werkstatt-Partner, Affiliate) und anwaltliche Prüfung stehen aus (E12).
9. **Dokumentation intern/öffentlich:** `docs/09-final` deckt intern ab; öffentliche Dokumentation ist die API-Seite (Reiter „Dokumentation“). Handbücher pro Portal fehlen.
10. **Übersetzung:** 22 Bildschirmseiten nur Deutsch (DS-I-05).

## 3 · Nächster Schritt
Browser-Durchlauf aller Nutzerwege (Angebot annehmen/ablehnen/anpassen, Rechnung laden, Shop-Kasse, Registrierung) bei drei Breiten, dann App-Shell-Mobilnavigation, dann Workspace-Prüfung.
