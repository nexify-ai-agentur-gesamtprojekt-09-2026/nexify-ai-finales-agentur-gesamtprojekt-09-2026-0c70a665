# C4 Ebene 3 · Komponenten im Gateway und Worker (Kerne)

**Stand 28.09.2026 · Zielgruppe:** Entwickler · **Quelle:** lib/*, tools/abhaengigkeiten.js

Nur die Kerne mit Abhängigkeiten; alle ohne Ein- und Ausgaben (CI-geprüft).

```mermaid
C4Component
  title Kerne im Gateway und Worker
  Container_Boundary(k, "lib/ (reine Funktionen)") {
    Component(pipe, "Anfrage-Pipeline", "JS", "verbindet alle Schritte einer Modellanfrage")
    Component(regel, "Regelwerk", "JS", "R-00 bis R-21, fail-closed")
    Component(modi, "Arbeitsweisen", "JS", "Modus → S3-Baustein")
    Component(ged, "Gedächtnis", "JS", "Mandant, Konflikte, Vergessen")
    Component(rag, "RAG", "JS", "Routing, zweistufig, Güte")
    Component(km, "KI-Muster", "JS", "RRF, Belege, Eingabeschutz")
    Component(pc, "Prompt-Cache", "JS", "S1–S6, Breakpoints")
    Component(ent, "Entscheidungen", "JS", "Karten, genau einmal ausführen")
    Component(nl, "Nachtlauf", "JS", "tägliche Pflichten")
  }
  Rel(pipe, regel, "prüft vor und nach dem Modell mit")
  Rel(pipe, modi, "wählt Arbeitsweise mit")
  Rel(pipe, ged, "ruft Erinnerungen ab aus")
  Rel(pipe, rag, "routet und filtert mit")
  Rel(pipe, km, "verschmilzt und belegt mit")
  Rel(pipe, pc, "baut den Prompt mit")
  Rel(ent, regel, "prüft Einzelfreigaben mit")
  Rel(nl, ent, "lässt Karten ablaufen in")
  Rel(nl, ged, "löscht nach Frist in")
```
