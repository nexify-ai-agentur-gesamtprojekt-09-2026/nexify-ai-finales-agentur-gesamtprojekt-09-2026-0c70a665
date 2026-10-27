# Unabhängiger Resizebefund und begrenzte Korrektur

Der separate Reviewer fand am Zwischencommit e581b03 einen Nachweisfehler:
`html {font-size:200%}` ließ gerenderte Body-/Headline-Texte wegen expliziter
Schriftgrößen unverändert. Der Zwischenstand wurde nicht als Library-Version3
hochgeladen oder final freigegeben. Die Aussage wurde korrigiert, nicht umetikettiert.

Der neue Test liest zuerst die computed Schriftgrößen aller HTMLElements, setzt
jede tatsächlich auf das Doppelte und assertiert die resultierende Messung. Er
prüft zusätzlich konkrete Textcontainer, nicht nur die Dokumentbreite. Dadurch
wurden Überläufe auf allen36 Routen sichtbar; der Vorherbefund ist in
text-resize-before.json erhalten. Header, lange Wörter und Links konnten die
vorhandenen Spalten überschreiten. Die Korrektur erlaubt Umbruch im gemeinsamen
Shell-/Kopfbereich, hält Markenmaße stabil und passt die Sprachauswahl sowie das
dekorative N-Symbol schriftrelativ an. Keine Farben, Claims oder Logoformen neu.

Unabhängige Gegenprobe: Select normal68×44px bei13px Schrift, verdoppelt136×58px
bei26px; N-Symbol normal34×34px/18px, verdoppelt68×68px/36px. DE und N sichtbar,
kein Viewportüberlauf. Zusätzliche CSS-/Hilfsquellen im kritischen Browserbeleg
werden jetzt ebenfalls durch den bestehenden Bindingprüfer erzwungen. Eine
CSS-Drift-Negativregression verhindert Wiederverwendung des alten Browserpasses.
ARCH024 verhindert Root-Override-Behauptungen ohne gemessene Textverdopplung und
verdeckte lokale Inhaltsüberläufe. Der frische Gesamtbrowserlauf wird separat
in text-spacing.json und critical-browser-fresh.json belegt.

Dies bleibt eine geometrische Teilprüfung. Screenreader, sämtliche visuellen
Überlagerungen sowie Bild-/Gradientkontraste sind nicht vollständig qualifiziert
abgenommen; MASTER09 bleibt offen. Der endgültige unabhängige Bericht ist an den
finalen Paketcommit gebunden, nicht allein an diesen Zwischenbericht.
