# Library-Erweiterungsplan

**Stand 15.11.2026 · geplante Roadmap.** Dieses Dokument ordnet, welche Skills
und Blaupausen als Nächstes entstehen, warum und für welchen Zielkunden — unter
der harten Grenze, dass das sichtbare Design eingefroren bleibt
(`docs/01-konzept/markenzeichen-2026-11-14.md`). Rein additiv. `AGENTS.md` und
`CLAUDE.md` gelten unverändert.

Die Zielkunden-Grundlage liefert die Schwestersitzung (Zielkunden-Recherche):
`docs/05-marketing/zielkunden-recherche-2026-11-14.md` (Zweig
`claude/zielkunden-recherche`, Stand 14.11.2026, Abschnitt 3 ist die Zuarbeit).
Die Bausteine sind dort über stabile IDs referenzierbar: `LIB-NX-01…09`,
`LIB-TK-01…07`; Segmente `NX-A/B/C` (NeXify) und `TK-1/2/3` (TEILEKLAR). Unten
werden nur Zuordnungen geführt, die **beide** Dokumente hergeben. Bis dieser
Zweig gemergt ist, ist der genannte Pfad die Quelle der IDs.

## Prinzipien der Erweiterung

1. **Design-Sperre zuerst.** Keine Erweiterung ändert Handschrift, Tokens oder
   Komponenten. Neues erweitert Struktur, Ton, Dokumentation und Prüfungen.
2. **Verweisen statt duplizieren.** Skills und Blaupausen zeigen auf die
   bestehende Wahrheit (`config/design-tokens.json`, `nexify-klon-fabrik`,
   Gleichmacher) und auf den vorhandenen Stack (`config/loesungsregister.json`),
   statt ihn zu duplizieren.
3. **Bestehendes erweitern, nicht parallel neu bauen.**
4. **Zielkundengetrieben.** Reihenfolge folgt dem in der Recherche belegten
   Nutzen (Wirkung ÷ Aufwand), nicht der Technik.
5. **Gate-neutral und belegt.** Jede Erweiterung lässt die Gates grün und nennt
   ihren Nachweis.

## NeXify — priorisierte Roadmap (verbunden mit der Recherche)

Priorität P1 = als Nächstes. „Baustein (Recherche)" nennt die ID aus
`zielkunden-recherche-2026-11-14.md` Abschnitt 3.1.

| Prio | Vorhaben (Library) | Baustein (Recherche) | Segment | Akzeptanzkriterium |
|---|---|---|---|---|
| P1 | Branchen-/Stadt-Zielseiten-Blaupause (SEO/GEO) | LIB-NX-03 | NX-A, NX-B | Seitentyp nur aus bestehenden Bausteinen der Klon-Fabrik; Gleichmacher 0 Abweichungen; zitierfähige Faktenblöcke mit Quelle; vier Sprachen, gleicher Schlüsselsatz; keine erfundenen Zahlen. |
| P1 | Leistungs-/Angebotsseite mit Belegpflicht | LIB-NX-01, LIB-NX-04 | NX-A, NX-B | Seitentyp-Blaupause + Fallkarten-Muster („drei Zahlen", anonymisiert); keine Preisangabe ohne Freigabe (O-1), keine Referenz ohne Freigabe (O-2); jede Aussage mit Beleg. |
| P1 | Checkliste „markenkonforme Seite" (Skill-Anhang) | — (intern, stützt LIB-NX-03/04) | alle NX | Abnahmeliste verweist auf Markenzeichen-Dokument, Tokens und `check-markenzeichen`; führt keine neuen Werte ein. |
| P2 | Tonvorlagen je Zielgruppe (B2B-Register) | LIB-NX-08 + Botschaften (Recherche Abschnitt 4.1) | NX-A, NX-B, NX-C | Tonvorlage je Segment im NeXify-Ton (siezt, sachlich, keine Superlative/Garantien/Antwortzeit-Zusagen); vier Sprachen; keine Rechts-/Preistexte. |
| P2 | Portal-/App-Muster „ein Ort statt Postfach" | LIB-NX-05 | NX-B | Blaupause aus bestehenden Portal-Bausteinen; Mandantentrennung beachtet; kein neues Design. |
| P2 | API-/BYOK-Schnellstart + Skills/MCP-Katalog-Muster | LIB-NX-06 | NX-C | Nutzt Composio + BYOK-Policy (`config/llm-policy.json`); kein stilles Modell-Fallback; Tarife bleiben offen bis Freigabe (O-1). |
| P2 | NeXify-Care-Betriebsmuster (Monitoring/Tagesbericht) | LIB-NX-07 | NX-A, NX-B | Definierter Umfang; nutzt vorhandenes Monitoring; Preis offen (O-1). |
| P3 | Wissenshub-Inhaltsmuster („Was kostet…", „Wann lohnt sich…") | LIB-NX-08 | NX-A, NX-B | Fragenformate ohne erfundene Werte; speist den LinkedIn-Rhythmus. |
| P3 | Mehrsprach-Paket NL/FR für Marktseiten | LIB-NX-09 | NX-A, NX-B | Gleicher Schlüsselsatz; muttersprachliche Prüfung offen (O-12) ausdrücklich markiert. |

## TEILEKLAR — priorisierte Roadmap (eigene Marke)

TEILEKLAR ist eine eigenständige Shop-Marke (`docs/01-konzept/markenzeichen-2026-11-14.md`,
Abschnitt 6). Diese Blaupausen sind **strukturell/tonal** und übernehmen **nicht**
die NeXify-Tokens; gemessen wird innerhalb der Marke gegen `/teileklar`. IDs aus
`zielkunden-recherche-2026-11-14.md` Abschnitt 3.2.

| Prio | Vorhaben (Library) | Baustein (Recherche) | Segment | Akzeptanzkriterium |
|---|---|---|---|---|
| P1 | Teilenummer-/Such-Zielseiten-Muster (3-sprachig) | LIB-TK-02 | TK-1, TK-3 | Innerhalb der TEILEKLAR-Marke; keine „geprüfte Passung" behaupten; Preise inkl. MwSt., Versand vor Abschluss sichtbar. |
| P1 | Werkstatt-Partner-Onboarding-Muster | LIB-TK-03 | TK-2 | Sie-Form (B2B); nutzt bestehendes Werkstattverzeichnis; keine Kostenaussage ohne Freigabe (O-9). |
| P2 | Fahrzeug-Passungs-Assistent (ehrliche Checkliste) | LIB-TK-01 | TK-1 | „Ein Foto belegt keine Passung"; **keine** automatische Katalogprüfung behaupten (O-9). |
| P2 | Vertrauens-/Markenware-Content-Muster | LIB-TK-06 | TK-1, TK-3 | Herstellerlogos nur mit Nutzungsnachweis; Markenware statt No-Name. |
| P3 | Saison-/Zubehör-Kampagnenvorlagen | LIB-TK-07 | TK-3 | Nutzt Postiz; saisonale Auslöser; keine erfundenen Aussagen. |

Nicht aufgenommen, weil sie keine reine Library-/Blaupausen-Arbeit sind, sondern
an Verträgen/Betrieb hängen (Recherche nennt sie als Bausteine, aber mit Sperre):
Katalog-/Bestands-/Preis-Anbindung (LIB-TK-05, Lieferantenvertrag) und lokale
Werkstatt-/Umkreissuche mit Terminbuchung (LIB-TK-04, O-9). Als abhängige
Vorhaben geführt, nicht als nächste Library-Bausteine.

## Abhängigkeiten, Sperren und Owner

- **Design-Werte:** unverändert; keine Erweiterung fasst sie an. `make check`
  führt jetzt `check-markenzeichen` (Normstand-Sperre) als Wächter mit.
- **Freigaben (Inhaber), die die Reihenfolge, nicht die Vorbereitung, begrenzen:**
  Preisfreigabe (O-1) für NX-Angebotskommunikation; Referenzfreigabe (O-2) für
  LIB-NX-04-Inhalte; Shop-Betrieb und Lieferantenvertrag für LIB-TK-01/05;
  Terminbuchung (O-9) für LIB-TK-04; muttersprachliche Prüfung (O-12) für
  LIB-NX-09.
- **Quelle der Zielkunden-IDs:** die Recherche der Schwestersitzung (Pfad oben).
  Ändert sie sich oder wird sie gemergt, diese Zuordnung dagegen gegenprüfen.

## Nächster Schritt

Die drei von der Recherche empfohlenen Startpunkte (Abschnitt 3.3) in Blaupausen
überführen, sobald der Inhaber sie im Meeting bestätigt:
**LIB-NX-01 + LIB-NX-04** (Angebots-/Audit-Einstieg + belegte Arbeitsproben),
**LIB-NX-03** (Branchen-/Stadt-Zielseiten) und **LIB-TK-01 + LIB-TK-03**
(Passungs-Assistent + Werkstatt-Partner). Je Vorhaben eine Blaupause oder einen
Skill-Anhang additiv anlegen, gegen die Gates und den Gleichmacher prüfen und die
oben genannten Akzeptanzkriterien erfüllen. Offene Freigaben bleiben
Inhaber-Entscheidungen und sind keine Bau-Blocker für die Vorbereitung.
