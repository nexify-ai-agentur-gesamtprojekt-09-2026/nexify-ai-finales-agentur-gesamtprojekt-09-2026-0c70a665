# Library-Erweiterungsplan · Gerüst

**Stand 14.11.2026 · geplante Roadmap.** Dieses Gerüst ordnet, welche Skills und
Blaupausen als Nächstes entstehen, warum und für welchen Zielkunden — unter der
harten Grenze, dass das sichtbare Design eingefroren bleibt
(`docs/01-konzept/markenzeichen-2026-11-14.md`). Rein additiv. `AGENTS.md` und
`CLAUDE.md` gelten unverändert.

Die Zielkunden-Inhalte liefert eine **Schwestersitzung (Zielkunden-Recherche)**.
Hier stehen dafür nur Platzhalter mit Verweis — **keine erfundenen
Kundensegmente**.

## Prinzipien der Erweiterung

1. **Design-Sperre zuerst.** Keine Erweiterung ändert Handschrift, Tokens oder
   Komponenten. Neues erweitert Struktur, Ton, Dokumentation und Prüfungen.
2. **Verweisen statt duplizieren.** Skills und Blaupausen zeigen auf die
   bestehende Wahrheit (`config/design-tokens.json`, `nexify-klon-fabrik`,
   Gleichmacher), sie kopieren sie nicht.
3. **Bestehendes erweitern, nicht parallel neu bauen.** Erst prüfen, ob ein
   vorhandener Skill/eine Blaupause den Bedarf trägt.
4. **Zielkundengetrieben.** Reihenfolge folgt dem belegten Nutzen für einen
   konkreten Zielkunden (Quelle: Schwestersitzung), nicht der Technik.
5. **Gate-neutral und belegt.** Jede Erweiterung lässt die Gates grün und nennt
   ihren Nachweis.

## Priorisierte Roadmap (Gerüst)

Priorität P1 = als Nächstes. Zielkunde = `<ZK-…>`-Platzhalter, zu füllen aus der
Zielkunden-Recherche.

| Prio | Vorhaben | Art | Warum | Zielkunde | Status |
|---|---|---|---|---|---|
| P1 | Blaupausen je Branchen-Seitentyp verfeinern | Blaupause | konkrete Folgeseiten schneller, markenkonform | `<ZK-PLATZHALTER-1>` (Recherche) | geplant |
| P1 | Checkliste „Markenkonforme Seite" als Skill-Anhang | Doku/Skill | Abnahme vereinheitlichen, Gleichmacher-Befunde vermeiden | alle | geplant |
| P2 | Tonvorlagen je Zielgruppe (B2B-Register) | Tonvorlage | Ansprache treffsicher, vier Sprachen | `<ZK-PLATZHALTER-2>` | geplant |
| P2 | Blaupause „Leistungs-/Angebotsseite" mit Belegpflicht | Blaupause | Umsatzwege, ohne erfundene Zahlen (D-017) | `<ZK-PLATZHALTER-3>` | geplant |
| P3 | Kundenmarken-Leitfaden (Grenze zur NeXify-Optik) | Doku | saubere Trennung, Beispiel Studienkolleg Aachen | Kundenprojekte | geplant |
| P3 | Normstand-Manifest regelmäßig gegenprüfen | Prüfung | Design-Drift früh sehen | intern | geplant |

Die Tabelle ist ein Gerüst: Zeilen, Prioritäten und Zielkunden werden mit den
Ergebnissen der Zielkunden-Recherche belegt gefüllt. Ungefüllte `<ZK-…>` bleiben
ausdrücklich offen.

## Abhängigkeiten und Owner (offen)

- **Zielkunden-Segmente, -Bedarfe, -Sprachen:** Schwestersitzung
  Zielkunden-Recherche. Ohne sie bleiben die Zielkunden-Spalten Platzhalter.
- **Freigabe je Erweiterung:** Inhaber, soweit sie über Struktur/Ton hinausgeht.
- **Design-Werte:** unverändert; keine Erweiterung fasst sie an.

## Nächster Schritt

Sobald die Zielkunden-Recherche vorliegt: P1-Zeilen mit konkretem Zielkunden,
Nutzen und Akzeptanzkriterium füllen; je Vorhaben eine Blaupause oder einen
Skill-Anhang additiv anlegen und gegen die Gates prüfen. Bis dahin bleibt dieses
Gerüst der verbindliche Rahmen, und die Platzhalter werden nicht geraten.
