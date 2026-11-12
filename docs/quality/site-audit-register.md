# Site-Audit-Register (09.11.2026)

Je Seite IST gegen SOLL, nur aus Messungen (`tools/site_audit_register.py`, Desktop 1440 px mit Pixeldichte 2, Mobil 390 px mit Pixeldichte 3, Chromium über den Agent-Proxy). Rohdaten: `evidence/site-audit-2026-11-09/`. `ok` heißt: gemessen und im SOLL. Was nicht gemessen wurde, steht unten ausdrücklich.

**Zwei Stände:** *Produktion* = `www.nexifyai.de` (Deployment `dpl_35Vacwi3rZhskCzYBWfamveJFQK1`, Commit `6c4f9ee`, vor Redesign) und *main* = Instanz `nexify-ai-finales-agentur-gesamtpro-one.vercel.app` (aktueller `main`).

**SOLL-Quellen:** Web-Vitals-Schwelle „gut“ (LCP ≤ 2500 ms, CLS ≤ 0,1); genau eine H1, passendes `lang`, `alt` vorhanden, kein horizontaler Überlauf; Canonical = eigene URL, hreflang im `<head>`; Indexierung ist bis zur Veröffentlichungsfreigabe bewusst aus (kein Befund); Retina-Schärfe = Dateibreite ≥ 85 % von Darstellungsbreite × Pixeldichte; Higgsfield-Inszenierungen mit Kennzeichnung.

## main (aktueller Stand)
Gemessen 2026-11-09T13:03:00+00:00, 36 Seiten.

Seiten mit Abweichung je Bereich: bilder 25, seo 34

Leere `alt`-Texte (dekorativ, siehe Bildprüfung): oracle-lossless.webp

| Seite | Layout | A11y | Funktion | SEO | Leistung (LCP ms/CLS/KB) | Bilder | Sprachen |
|---|---|---|---|---|---|---|---|
| `/` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1100/0/986 KB · M 796/0/722 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1252/0/591 KB · M 1504/0/547 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/websites` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 844/0/399 KB · M 520/0/362 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/agenten-automatisierung` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 904/0/405 KB · M 848/0/368 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/apps-portale` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 784/0/417 KB · M 1016/0/374 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungsumfang` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1468/0/543 KB · M 964/0/518 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/loesungen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1076/0/592 KB · M 940/0/553 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/preise-ablauf` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1824/0.0251/535 KB · M 1460/0/504 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/wissen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1784/0/587 KB · M 984/0/547 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/wissen/projekt-vorbereiten` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 744/0/427 KB · M 760/0/375 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/unternehmen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 736/0/562 KB · M 496/0/529 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | Firmenname, sprachneutral (kein Befund) |
| `/kontakt` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 996/0/405 KB · M 760/0/365 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/nex2fly` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 948/0/417 KB · M 896/0/374 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/one` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 536/0.0251/411 KB · M 1088/0/372 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/api` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 672/0/424 KB · M 560/0/376 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/aifly-oracle` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 804/0.0251/405 KB · M 544/0/364 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/nex-agentic-aifly` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 632/0.0251/405 KB · M 612/0/368 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/skills-mcp` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 588/0.0251/424 KB · M 592/0/376 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/portale` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 376/0/405 KB · M 848/0/365 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/impressum` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1112/0/105 KB · M 604/0/105 KB | ok | ok |
| `/datenschutz` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 992/0/105 KB · M 704/0/105 KB | ok | ok |
| `/vertragsgrundlagen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 756/0/105 KB · M 588/0/105 KB | ok | ok |
| `/ki-hinweise` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 664/0/105 KB · M 804/0/105 KB | ok | ok |
| `/barrierefreiheit` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 468/0/105 KB · M 1096/0/105 KB | ok | ok |
| `/cookies` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 680/0.0176/105 KB · M 728/0/105 KB | ok | ok |
| `/teileklar` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/categories 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/status 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/products 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | noindex (gewollt bis Freigabe) | D 640/0/105 KB · M 624/0/105 KB | ok | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/kategorien` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/categories 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt | D 812/0/105 KB · M 920/0/105 KB | ok | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/fahrzeug-und-passung` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 980/0/424 KB · M 600/0/376 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/termine` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1372/0/427 KB · M 424/0/375 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/gutscheine` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 992/0/381 KB · M 908/0/350 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/partner-werden` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 916/0/405 KB · M 884/0/368 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/werkstatt` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt | D 616/0/105 KB · M 796/0/105 KB | ok | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/rechtliches` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 592/0/105 KB · M 496/0/105 KB | ok | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/shop` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/categories 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/status 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | noindex (gewollt bis Freigabe) | D 892/0.017/105 KB · M 792/0/105 KB | ok | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/reifenrechner` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 620/0/311 KB · M 416/0/311 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |
| `/teileklar/batterie-berater` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 696/0/311 KB · M 1080/0/311 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | nur Deutsch, lang=de korrekt gesetzt (kein Befund; sichtbarer Hinweis für NL/EN/FR offen, siehe unten) |

## Produktion (alter Stand)
Gemessen 2026-11-09T13:01:32+00:00, 32 Seiten.

Seiten mit Abweichung je Bereich: bilder 21, seo 30, sprachen 4

Leere `alt`-Texte (dekorativ, siehe Bildprüfung): oracle-lossless.webp, signet.svg

| Seite | Layout | A11y | Funktion | SEO | Leistung (LCP ms/CLS/KB) | Bilder | Sprachen |
|---|---|---|---|---|---|---|---|
| `/` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 800/0/819 KB · M 976/0/556 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 169 Z. | D 816/0/424 KB · M 552/0/380 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/websites` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1208/0/232 KB · M 696/0/195 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/agenten-automatisierung` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 776/0/238 KB · M 732/0/201 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungen/apps-portale` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1132/0/250 KB · M 604/0/207 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/leistungsumfang` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1256/0/376 KB · M 752/0/351 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/loesungen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 161 Z. | D 1296/0/425 KB · M 848/0/386 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/preise-ablauf` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 808/0/368 KB · M 1068/0/337 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/wissen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 170 Z. | D 1140/0/421 KB · M 1112/0/380 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/wissen/projekt-vorbereiten` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe) | D 1592/0/260 KB · M 780/0/208 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/unternehmen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 177 Z. | D 944/0/395 KB · M 776/0/362 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | Firmenname, sprachneutral (kein Befund) |
| `/kontakt` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 166 Z. | D 804/0/238 KB · M 616/0/199 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/nex2fly` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 175 Z. | D 1440/0/250 KB · M 1924/0/207 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/one` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 172 Z. | D 1504/0/245 KB · M 624/0/206 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/produkte/api` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 174 Z. | D 1464/0/257 KB · M 776/0/209 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/impressum` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 217 Z. | D 808/0/105 KB · M 504/0/105 KB | ok | ok |
| `/datenschutz` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 232 Z. | D 1132/0/105 KB · M 764/0/105 KB | ok | ok |
| `/vertragsgrundlagen` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 207 Z. | D 1600/0/105 KB · M 696/0/105 KB | ok | ok |
| `/ki-hinweise` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 222 Z. | D 968/0/105 KB · M 476/0/105 KB | ok | ok |
| `/barrierefreiheit` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 193 Z. | D 732/0/105 KB · M 560/0/105 KB | ok | ok |
| `/cookies` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 208 Z. | D 1172/0.0172/105 KB · M 424/0/105 KB | ok | ok |
| `/teileklar` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | noindex (gewollt bis Freigabe) | D 712/0/105 KB · M 524/0/105 KB | ok | Titel/H1 wie DE: nl, en, fr |
| `/teileklar/kategorien` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus) | Canonical fehlt; hreflang fehlt; noindex (gewollt bis Freigabe) | D 780/0/105 KB · M 504/0/105 KB | ok | Titel/H1 wie DE: nl, en, fr |
| `/teileklar/fahrzeug-und-passung` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 179 Z. | D 804/0/257 KB · M 536/0/209 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/teileklar/termine` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 171 Z. | D 756/0/260 KB · M 604/0/208 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/teileklar/gutscheine` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 172 Z. | D 740/0/215 KB · M 704/0/183 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/teileklar/partner-werden` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 202 Z. | D 828/0/238 KB · M 496/0/202 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/teileklar/werkstatt` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | Canonical fehlt; hreflang fehlt; noindex (gewollt bis Freigabe) | D 848/0/105 KB · M 620/0/105 KB | ok | Titel/H1 wie DE: nl, en, fr |
| `/teileklar/rechtliches` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 198 Z. | D 716/0/105 KB · M 728/0/105 KB | ok | ok |
| `/teileklar/shop` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback); /api/shop/products 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | noindex (gewollt bis Freigabe) | D 952/0/105 KB · M 928/0/105 KB | ok | Titel/H1 wie DE: nl, en, fr |
| `/teileklar/reifenrechner` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 180 Z. | D 1028/0/144 KB · M 600/0/144 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |
| `/teileklar/batterie-berater` | ok | ok | /api/session 404 (OF-07, bekannt: Orientierungsmodus); /api/shop/cart 503 (OF-08, bekannt: Shop-API nicht deployt, Offline-Fallback) | hreflang fehlt; noindex (gewollt bis Freigabe); Beschreibung 182 Z. | D 1056/0/144 KB · M 748/0/144 KB | Higgsfield ohne Kennzeichnung: hf-17-cutout-1920.webp; ohne srcset: hf-17-cutout-1920.webp | ok |

## axe-core (WCAG 2.2 AA)

axe-core 4.10.2, Regeln wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, 36 Seiten × Desktop/Mobil auf `https://nexify-ai-finales-agentur-gesamtpro-one.vercel.app`, gemessen 2026-11-12T16:02:32+00:00. **Verstöße: 0**, Messfehler: 0.

Von axe als „unvollständig“ gemeldet (kein Verstoß, braucht Prüfung durch Menschen):

| Regel | Seiten | Hinweis |
|---|---|---|
| aria-prohibited-attr | `/`, `/teileklar` | `aria-label` an Element ohne zulässige Rolle prüfen |
| color-contrast | `/`, `/barrierefreiheit`, `/cookies`, `/datenschutz` und 32 weitere | axe kann Kontrast über Verläufen und Bildern nicht entscheiden; die eigene Messung `tools/page_quality_audit.py` (Text-Kontrast ≥ 4,5, 0 FEHLER) bleibt die Quelle |
| link-in-text-block | `/teileklar` | Link im Fließtext nur durch Farbe unterscheidbar? Unterstreichung prüfen |
| video-caption | `/` | Video ohne Untertitel-Spur erkannt; nach ED-02 ist das Hero kein Video mehr, Fundstelle prüfen |

## Behoben in diesem PR (lokal gemessen, noch nicht auf Produktion)

| Befund | Behebung | Beleg |
|---|---|---|
| hreflang fehlte im `<head>` aller Seiten | `alternates.languages` aus `pageMetadata` ausgegeben, inklusive `x-default`, nur vollständig übersetzte Sprachen | lokaler Lauf: `x-default, de, nl, fr, en` auf `/`, `/leistungen`, `/leistungen/websites`; `tests/test_seo_metadata.py` |
| Freisteller `hf-17-cutout` ohne Kennzeichnung | alt-Text beginnt mit „Markeninszenierung:“; Wächtertest für alle Higgsfield-Bilder | `tests/test_seo_metadata.py` |
| Freisteller ohne `srcset` (nur 1920 px) | `srcset` 800/1280/1920 mit `sizes` auf den Seiten aus `PublicContent.tsx` | lokaler Lauf: `ohne_srcset` leer; Text-Spacing neu erhoben (129 Checks, 0 Befunde) |
| Indexierung nur durch Codeänderung freizugeben | Schalter `NEXIFY_INDEXING=enabled` (Standard aus), private Bereiche bleiben `noindex` | lokaler Lauf mit und ohne Variable, siehe `docs/quality/seo-domain-vorschlag-2026-11-09.md` |

## Offen, mit Grund

| Punkt | Grund | Nächste Aktion |
|---|---|---|
| Freisteller auf der Startseite ohne `srcset` und Titelkennzeichnung wie oben | `HomeContent.tsx` ist per Hash an fünf Browser-Nachweisketten gebunden; Änderung braucht vollständige Neuerhebung | gemeinsam mit dem nächsten Frontend-Paket ändern und Nachweise neu erheben |
| Oracle als alleiniges Symbol (`OracleCompanion`, 34 px, dekorativ, `aria-hidden`) neben dem Chat-Steuerelement | Vorgabe „Signet/Oracle-Präsentator nur als Paar NeX + Oracle“ ist im Repo nicht als Regel belegt | Design entscheidet: Paar zeigen oder Einzelsymbol erlauben |
| Produktion (`www.nexifyai.de`) zeigt den alten Stand `6c4f9ee` | Vercel-Neuverbindung, OF-14 | Pascal |
| Apex ohne Redirect, `.cloud` mit eigener indexierbarer Seite, Indexierung | Domain- und Veröffentlichungsfreigabe, OF-18 | Pascal |

## Nicht gemessen (kein Beleg, kein „ok“)

| Bereich | Stand | Nächste Aktion | Owner |
|---|---|---|---|
| Marke (Signet, Präsentatoren, Glas-/Champagner-Rand, Lichtreflex) | nur Bilddateien und Kennzeichnung gemessen, keine Sichtprüfung der Gestaltung | Sichtprüfung mit Screenshots Desktop/Mobil in separatem Schritt | Design |
| Inhalt (Kundenfragen, Leerformeln) | nur Sprachvergleich Titel/H1 gemessen | redaktionelle Prüfung je Seite | Redaktion |
| UX | nicht gemessen | Aufgabentests | UX |
| Lighthouse, INP | Lighthouse hier nicht installiert, INP braucht echte Interaktion (axe-core ist gemessen, siehe oben, nur auf `main`, nicht auf Produktion) | Lighthouse und INP-Messung in CI oder lokal ergänzen | QA |
| Sprache, TEILEKLAR | Shop ist nur Deutsch; `?lang=nl/en/fr` liefert deutschen Inhalt mit `lang=de` (ehrlich markiert). Ein sichtbarer Hinweis „nur auf Deutsch verfügbar“ für NL/EN/FR-Besucher ist nicht belegt | Redaktion/Design entscheiden, ob und wie der Hinweis erscheint | Redaktion |
| Datenschutz (externe Anfragen, Cookies) | nicht in dieser Messung erfasst; lokale Browser-Nachweise (0 externe Anfragen) liegen unter `evidence/` | externe Hosts je Seite in Messung aufnehmen | Datenschutz |
