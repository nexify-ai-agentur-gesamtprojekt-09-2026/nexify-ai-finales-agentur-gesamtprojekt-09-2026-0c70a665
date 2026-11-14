# TK-12 · Weiterleitungsplan TEILEKLAR (Altstand → neue App)

Stand: 14.11.2026 · **Entwurf, nicht aktiviert.** Kein Eintrag in `vercel.json`, keine DNS-Änderung, keine Weiterleitung eingerichtet.
Gehört zu `docs/konzept/MIGRATIONSPLAN.md` (TK-12; Aktivierung TK-30). Kennzeichnung: **IST** · **SOLL** · **ANNAHME** · **OFFEN**.

## 1. Grundlage

- **IST** Abruf `https://teileklar.shop/sitemap.xml` am 14.11.2026 (ein Abruf, lesend): 17 Adressen, alle mit `lastmod` 2026-09-28. Es wurde keine einzelne Seite des Altstands abgerufen.
- **IST** Neue App auf `main` (`origin/main` `0080377`): Seiten unter `apps/web/app/teileklar/`: `/teileklar`, `shop`, `kategorien`, `kategorie/[id]`, `produkt/[id]`, `suche`, `warenkorb`, `kasse`, `bestellungen`, `bestellung/[id]`, `werkstatt`, `werkstatt/[id]`, `admin`. Weitere Pfade stehen in `config/site-map.json` (`/teileklar/batterie-berater`, `fahrzeug-und-passung`, `gutscheine`, `konto`, `nachbarschaft`, `partner-werden`, `partnerportal`, `rechtliches`, `reifenrechner`, `termine`) und werden über `apps/web/app/[...slug]/page.tsx` bedient. Ob jede dieser Seiten mehr als eine Hülle zeigt, ist nicht geprüft (OFFEN; FK 2.2 führt Konto und Partnerportal als Hüllen).
- **IST** Der Canonical des neuen Shops zeigt auf `https://www.nexifyai.de/teileklar…` (`apps/web/lib/page-seo.ts:6`, nach FK Z. 352).
- **IST** Die Shop-API antwortet laut Betriebsnotiz auf `claude/teileklar-backend` bisher mit 503; der Katalog war zuletzt leer (FK Z. 414). Weiterleitungen auf Seiten, die nichts anbieten, sind daher nicht vor TK-31/TK-32 sinnvoll.
- **OFFEN** Welche Variante gilt: Entscheidung Inhaber (FK Entscheidungen Nr. 20, 23; EV-01, EV-06). Aktivierung braucht außerdem Zugang zu DNS und Cloudflare (TK-30).

## 2. Die zwei Varianten

- **Variante A: TEILEKLAR bleibt auf `teileklar.shop`.** Die neue App wird unter dieser Domain ausgeliefert (TK-41: eigene Adresse, Sitzungsgrenze Stufe 2). **ANNAHME**: Der Präfix `/teileklar` entfällt auf dieser Domain per Umschreibung, sodass gleiche Pfade gleich bleiben. Weiterleitungen sind nur dort nötig, wo sich Pfad oder Funktion ändern. Vorteil: Adressen und Verlinkungen bleiben erhalten. Nachteil: eigene Domain, Cookie- und Datentrennung (TK-41) vor dem Start nötig.
- **Variante B: Bereich unter der NeXify-Domain.** Alle Adressen von `teileklar.shop` leiten dauerhaft (301) auf `https://www.nexifyai.de/teileklar/…`. Das entspricht dem heutigen Code. Nachteil: Trennung der Marken bleibt Beschriftung (FK W-06, W-34); Sitzung `tk_session` gilt dort für mehrere Bereiche (TK-04).

## 3. Zuordnung je Adresse

Statuscodes sind **SOLL-Vorschläge**. „Passt“ = gleicher Pfad bleibt gültig. Spalte „Neue Seite“: IST nur, wenn in der Seitenkarte oder als Route belegt.

| Nr. | Altadresse | Neue Seite in der App | Variante A (eigene Domain) | Variante B (unter NeXify-Domain) | Anmerkung |
|---|---|---|---|---|---|
| 1 | `/` | `/teileklar` (Route, IST) | `/` bedient die neue Startseite, keine Weiterleitung | 301 → `/teileklar` | |
| 2 | `/shop` | `/teileklar/shop` (Route, IST) | `/shop`, keine Weiterleitung | 301 → `/teileklar/shop` | Katalog heute leer (TK-32) |
| 3 | `/de/` | keine Marktversion (IST: nur Deutschland zuerst, FK W-13) | 301 → `/` | 301 → `/teileklar` | Deutschland ist Hauptmarkt (14.11.) |
| 4 | `/at/` | keine Marktversion | **OFFEN**: bis Marktfreigabe 302 → `/` | 302 → `/teileklar` | AT, NL, BE, LU sind Lieferländer (IST, `fakten.json`), eine Marktversion der Seiten gibt es nicht. Steuer und Recht je Land erst nach Prüfung (TK-43) |
| 5 | `/ch/` | keine Marktversion | wie 4 | wie 4 | IST: Schweiz gehört nicht zu den fünf Lieferländern (`config/fakten.json`, Fakt `teileklar.lieferlaender`: DE, AT, NL, BE, LU; Quelle `checkout_api.py` `COUNTRIES`) |
| 6 | `/nl/` | keine Marktversion | wie 4 | wie 4 | |
| 7 | `/be-nl/` | keine Marktversion | wie 4 | wie 4 | |
| 8 | `/be-fr/` | keine Marktversion | wie 4 | wie 4 | |
| 9 | `/lu/` | keine Marktversion | wie 4 | wie 4 | |
| 10 | `/kundenportal` | `/teileklar/konto` (Seitenkarte, Hülle) | 301 → `/konto` | 301 → `/teileklar/konto` | Funktion TK-14; bis dahin Hülle |
| 11 | `/partnerportal` | `/teileklar/partnerportal` (Seitenkarte, Hülle) | `/partnerportal`, keine Weiterleitung | 301 → `/teileklar/partnerportal` | Portal TK-07 bis TK-09; Zugang nur mit Rolle `partner` |
| 12 | `/partner-werden` | `/teileklar/partner-werden` (Seitenkarte) | `/partner-werden`, keine Weiterleitung | 301 → `/teileklar/partner-werden` | Kostenaussage nur mit Fakt (TK-05, TK-33) |
| 13 | `/nachbarschaft` | `/teileklar/nachbarschaft` (Seitenkarte) | `/nachbarschaft`, keine Weiterleitung | 301 → `/teileklar/nachbarschaft` | Funktion TK-40 (Inhaber, Recht) |
| 14 | `/werkstatt-partner` | **OFFEN**: Zielseite nicht belegt | 301 → `/partner-werden` (ANNAHME) | 301 → `/teileklar/partner-werden` (ANNAHME) | Inhalt der Altseite nicht gelesen. Alternative: `/teileklar/werkstatt` (Verzeichnis). Entscheidung nach Lektüre der Altseite (REA-04 oder Handabruf) |
| 15 | `/fitment-checker` | `/teileklar/fahrzeug-und-passung` (Seitenkarte) | 301 → `/fahrzeug-und-passung` | 301 → `/teileklar/fahrzeug-und-passung` | Funktion TK-37 hängt an Sortiment (FK W-16). Bis zur Entscheidung keine Passungsaussage; ggf. Hinweis „noch nicht verfügbar“ statt Weiterleitung |
| 16 | `/reifenrechner` | `/teileklar/reifenrechner` (Seitenkarte; Komponente `TyreCalculator.tsx` vorhanden) | `/reifenrechner`, keine Weiterleitung | 301 → `/teileklar/reifenrechner` | Funktion nicht geprüft |
| 17 | `/batterie-berater` | `/teileklar/batterie-berater` (Seitenkarte) | `/batterie-berater`, keine Weiterleitung | 301 → `/teileklar/batterie-berater` | Empfehlung nur aus Katalog (TK-39) |

Zusammenfassung: 17 Adressen; in Variante A brauchen 7 (Nr. 3–9) und zusätzlich 10, 14, 15 eine Weiterleitung, die übrigen 7 bleiben gleich. In Variante B brauchen alle 17 eine Weiterleitung.

## 4. Altpfade mit 404 und nicht gelistete Pfade

- **OFFEN** Der Plan (TK-12, RA C.1) verlangt, Altpfade, die heute mit 404 antworten, aufzuführen. In diesem Entwurf wurden keine Einzelabrufe gemacht; die Liste ist daher nur die Sitemap. Pfade, die nicht in der Sitemap stehen (Rechtsseiten, Produkt- und Kategorienseiten, Hilfe, Ratgeber, Warenkorb, Kasse), sind **nicht erfasst**. Vorschlag: REA-04 (Bestandsaufnahme lesend, nur eigene Adresse, Freigabe Inhaber, FK Nr. 37) oder ein einmaliger Handabruf der 17 Adressen mit Statuscode.
- **SOLL** Für alles Übrige unter der Altdomain: ein einheitlicher Rückfall auf die Startseite (Variante A) bzw. 410/404 mit Verweis (Variante B); Entscheidung mit Aktivierung.

## 5. Voraussetzungen für die Aktivierung (nicht erfüllt)

1. Entscheidung Variante A oder B (Inhaber).
2. Zugang zu DNS und Cloudflare (Zugang; TK-30).
3. Sicherung des Altstands vor jeder Änderung (TK-30: „Altdateien gesichert“).
4. Prüfung, dass der Altstand keine nicht freigegebenen Konditionen mehr öffentlich zeigt (FK; TK-30 Abnahmekriterium).
5. Für Variante A: TK-41 (eigene Adresse, Sitzungsgrenze Stufe 2, Pflichtfeld Marke).
6. Die Zielseiten müssen antworten (TK-31 Shop-API live; sonst Weiterleitung auf Leerseite).
7. Ausführung später in `vercel.json` oder am DNS-Anbieter; Rückweg: Umleitung aufheben (TK-30).

## 6. Was nicht geprüft wurde

- Nur die Sitemap wurde abgerufen (1 von höchstens 5 Abrufen). Keine Einzelseite, kein Statuscode, kein Weiterleitungsverhalten des Altstands, keine Seitenfunktion.
- Ob die Seiten in der Seitenkarte der neuen App mehr als Hüllen zeigen, ist nicht geprüft.
- Zielvorschlag zu `/werkstatt-partner` ist eine Annahme.
- Keine Rechts- oder Suchmaschinenprüfung (Canonical, hreflang der Marktversionen).
