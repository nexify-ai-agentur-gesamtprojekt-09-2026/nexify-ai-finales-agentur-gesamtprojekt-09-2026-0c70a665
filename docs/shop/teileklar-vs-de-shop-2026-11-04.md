# TEILEKLAR gegen einen deutschen Autoteile-Onlineshop · 04.11.2026

Vergleich des tatsächlichen TEILEKLAR-Stands im Repo (`apps/web/components/shop`, `config/shop-interface-copy.json`)
mit den Konventionen großer deutscher Teileshops (kfzteile24, AUTODOC, autoteile24, Preisvergleich daparto).
Die Live-Vorschau `web-c7hfzpqo4-…vercel.app/teileklar` ließ sich nicht laden: die Domain liegt außerhalb der
erlaubten Netzdomänen dieses Containers (DNS blockiert). Grundlage ist daher der Quellstand, der die Live-Seite erzeugt.

## Recherche: so ist ein deutscher Teileshop aufgebaut
- **Fahrzeugauswahl zuerst, oben rechts, dauerhaft.** Zwei Wege: Hersteller/Modell/Motor als Dropdown **oder**
  HSN/TSN aus der Zulassungsbescheinigung Teil I (Feld 2.1/2.2). Hinweis, dass eine Vorauswahl keine Passgarantie ist.
  Das gewählte Fahrzeug bleibt sichtbar und filtert den gesamten Katalog.
- **Teilesuche** prominent neben der Fahrzeugauswahl, mit Autovervollständigung und OE-Nummern-Suche.
- **Große Kategoriekacheln** (Bremsen, Filter, Öl, Zündung, Fahrwerk …) direkt auf der Startseite.
- **Preisgeführte Produktkarten** mit Marke, Preis inkl. MwSt., Verfügbarkeit, Lieferzeit, Pfand/Altteil.
- **Vertrauen:** Zahlarten (Logos), Gratisversand-Schwelle, Käuferbewertungen (z. B. Trusted Shops),
  Service-Hotline, Rückgabe-/Widerrufshinweis, Garantie.
- **Ratgeber/Magazin** (HSN/TSN finden, Einbauanleitungen) für SEO und Beratung.

Quellen: [kfzteile24 FAQ](https://www.kfzteile24.de/faq), [kfzteile24 HSN/TSN](https://www.kfzteile24.de/magazin/ratgeber/hsn-tsn-finden), [autoteile24](https://www.autoteile24.de/), [AUTODOC HSN/TSN](https://www.autodoc.de/info/erlauterungen-der-hsn-tsn-und-kba-nummern), [daparto](https://www.daparto.de/), [HUK HSN/TSN](https://www.huk.de/fahrzeuge/ratgeber/hsn-tsn.html).

## Was TEILEKLAR schon hat
| Baustein | Stand im Repo |
|---|---|
| Fahrzeug-/Passungslogik | `FitmentChecklist.tsx`: HSN, TSN, Hersteller, Modell, Motor, Baujahr; Status „passt / prüfen" |
| Warenkorb + Kasse | `CartView`, 5-Schritt-`Checkout` (Adresse, Versand, Zahlung), Revolut gehostet |
| Versand & Zahlung | eigene Seite, „inkl. MwSt., zzgl. Versandkosten", Revolut-Weiterleitungstext |
| Werkstattbereich | `WorkshopFinder`, `WorkshopDetail`, `WorkshopMap`, Partner-Journey |
| Werkzeuge | Reifenrechner (`TyreCalculator`), Batterie-Berater, Fitment-Checker |
| Vertrauen | `TrustBar`: sichere Zahlung, Werkstattsuche, Widerruf, Kontakt |
| Recht | `TeileklarLegal.tsx`, eigener Rechtsbereich je Markt |

## Lücken gegenüber dem deutschen Standard (zu schließen)
1. **Fahrzeugauswahl ist nicht der Einstieg.** Die Landing beginnt mit „Teile und Zubehör finden"; die Passung
   steckt erst im Produktfluss. Deutscher Standard: Fahrzeugwahl oben rechts, dauerhaft, filtert alles.
2. **Kein befülltes Sortiment.** Katalogtext ist „Unser Sortiment wird gerade aufgebaut." Es gibt keine echten
   Produktkarten mit Preis. (Hängt an der offenen Entscheidung E-SORTIMENT: BigBuy liefert nur Zubehör, kein Ersatzteil-Lieferant.)
3. **Keine Startseiten-Kategoriekacheln** mit Bild und Direkteinstieg.
4. **Teilesuche nicht prominent** auf der Landing; keine OE-Nummern-Suche sichtbar.
5. **Vertrauen dünner:** keine Gratisversand-Schwelle, keine echten Käuferbewertungen (dürfen laut AGENTS nicht
   erfunden werden), keine Zahlart-Logos, keine sichtbare Service-Hotline.
6. **Kein Ratgeber/Magazin** als Einstieg (HSN/TSN-Hilfe, Einbauanleitungen) — fehlt auch für SEO (GTM-02).
7. **Bildwelt:** aktuell dieselben Figurenbilder wie die Agenturseiten (Messung: Oracle-Bild 109× über alle Seiten).
   TEILEKLAR braucht eine eigene, produktnahe Bildwelt (Teilefotos, `hero-fitment.png`), kein Agentur-Figurenmotiv.

## Empfohlene Reihenfolge
1. Fahrzeugauswahl als dauerhaften Kopf der TEILEKLAR-Fläche (Dropdown + HSN/TSN), Katalog danach gefiltert.
2. Startseite: Kategoriekacheln + prominente Teilesuche, dann Vertrauensleiste mit echten, belegbaren Angaben.
3. Sortimentquelle klären (E-SORTIMENT, Owner Pascal): Ersatzteil-Lieferant mit TecDoc-Lizenz oder BigBuy-Zubehör
   als Interim, sauber als Zubehör gekennzeichnet.
4. Eigene TEILEKLAR-Bildwelt statt Agenturfiguren; Bildeinmaligkeit (ein Bild, ein Ort) durchsetzen.
5. Ratgeber/Magazin für HSN/TSN und Einbau als SEO- und Beratungseinstieg.
